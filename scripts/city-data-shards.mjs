import crypto from 'node:crypto';
import zlib from 'node:zlib';

export const CITY_TABLE_PART_BYTES = 256 * 1024;
export const CITY_BATCH_FRAGMENT_BYTES = 6 * 1024 * 1024;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

/** Preserve each original JSON row lexeme, including -0 and numeric spelling. */
export function jsonArrayRows(raw) {
  const text = new TextDecoder('utf-8', {fatal: true}).decode(raw), rows = [];
  let depth = 0, string = false, escaped = false, start = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (string) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') string = false;
      continue;
    }
    if (c === '"') { string = true; continue; }
    if (c === '[' || c === '{') {
      depth++;
      if (depth === 1) {
        if (c !== '[' || start !== -1) throw Error('Expected JSON row array');
        start = i + 1;
      }
    } else if (c === ']' || c === '}') {
      if (depth === 1) {
        const row = text.slice(start, i).trim();
        if (row) rows.push(row);
        if (text.slice(i + 1).trim()) throw Error('Trailing JSON input');
        return rows;
      }
      depth--;
    } else if (c === ',' && depth === 1) {
      rows.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  throw Error('Incomplete JSON row array');
}

/** JSON token spans retain spelling while allowing bounded container projection. */
function containerEntries(raw, opener) {
  const text = typeof raw === 'string' ? raw : new TextDecoder('utf-8', {fatal: true}).decode(raw);
  const first = text.search(/\S/), closer = opener === '[' ? ']' : '}';
  if (first < 0 || text[first] !== opener) throw Error('Unexpected JSON container');
  let start = first + 1, depth = 1, string = false, escaped = false;
  const entries = [];
  function add(end) {
    let begin = start;
    while (begin < end && /\s/.test(text[begin])) begin++;
    while (end > begin && /\s/.test(text[end - 1])) end--;
    if (begin < end) entries.push({start: begin, end, text: text.slice(begin, end)});
  }
  for (let i = first + 1; i < text.length; i++) {
    const c = text[i];
    if (string) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') string = false;
    } else if (c === '"') string = true;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') {
      if (--depth === 0) {
        if (c !== closer || text.slice(i + 1).trim()) throw Error('Invalid JSON container ending');
        add(i);
        return {text, entries, first, last: i};
      }
    } else if (c === ',' && depth === 1) { add(i); start = i + 1; }
  }
  throw Error('Incomplete JSON container');
}

export function jsonObjectMembers(raw) {
  const {entries} = containerEntries(raw, '{'), seen = new Set();
  return entries.map(entry => {
    let end = 1, escaped = false;
    if (entry.text[0] !== '"') throw Error('Invalid JSON object member');
    for (; end < entry.text.length; end++) {
      const c = entry.text[end];
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') break;
    }
    const key = JSON.parse(entry.text.slice(0, end + 1));
    if (seen.has(key)) throw Error('Duplicate JSON object member');
    seen.add(key);
    let valueOffset = end + 1;
    while (/\s/.test(entry.text[valueOffset] ?? '')) valueOffset++;
    if (entry.text[valueOffset++] !== ':') throw Error('Invalid JSON object member separator');
    while (/\s/.test(entry.text[valueOffset] ?? '')) valueOffset++;
    return {...entry, key, valueText: entry.text.slice(valueOffset), valueStart: entry.start + valueOffset};
  });
}

export function encodeCityTable(raw) {
  const sha256 = hash(raw), packed = zlib.gzipSync(raw, {level: 9, mtime: 0}), physicalSHA = hash(packed);
  const descriptor = {
    path: `/safety/buildings3d/painted-tables/${sha256.slice(0, 2)}/${sha256}.json`,
    sha256, bytes: raw.length,
    transport: {
      path: `/safety/buildings3d/painted-tables/${physicalSHA.slice(0, 2)}/${physicalSHA}.json.gz`,
      sha256: physicalSHA, bytes: packed.length, encoding: 'gzip',
    },
  };
  return {descriptor, raw, packed};
}

/** Carrier selection is atomic. Oversized batches may span several physical
 * resources, each holding untouched, contiguous fields of that same batch. */
function partitionBatchFragments(raw,targetBytes){
 const text=new TextDecoder('utf-8',{fatal:true}).decode(raw),members=jsonObjectMembers(text),parts=[],assets=[];
 JSON.parse(text);
 if(!members.length||text!=='{'+members.map(member=>member.text).join(',')+'}')throw Error('Expected compact city batch record members');
 for(const member of members){
  const key=JSON.stringify(member.key),batches=jsonArrayRows(Buffer.from(member.valueText));
  if(!member.key||member.text!==key+':['+batches.join(',')+']')throw Error('Expected compact city batch array');
  const content=batches=>Buffer.from('{'+key+':['+batches.join(',')+']}');
  function emit(rows,indices){
   const part=content(rows);
   if(part.length>CITY_BATCH_FRAGMENT_BYTES)throw Error('City batch fragment exceeds physical admission bound');
   const asset=encodeCityTable(part);
   parts.push({descriptor:asset.descriptor,keys:[member.key],rowIndices:indices,
    ...(part.length>targetBytes?{oversizedAtomic:true}:{})});
   assets.push(asset);
  }
  const base=content([]).length;
  let rows=[],indices=[],size=base;
  function flush(){
   if(!rows.length)return;
   emit(rows,indices);rows=[];indices=[];size=base;
  }
  function append(fragment,index){
   const bytes=Buffer.byteLength(fragment);
   if(rows.length&&size+1+bytes>CITY_BATCH_FRAGMENT_BYTES)flush();
   size+=bytes+(rows.length?1:0);rows.push(fragment);indices.push(index);
  }
  for(const [index,batch] of batches.entries()){
   const fields=jsonObjectMembers(batch);
   if(!fields.length||batch!=='{'+fields.map(field=>field.text).join(',')+'}')throw Error('Expected compact city batch fields');
   if(base+Buffer.byteLength(batch)<=CITY_BATCH_FRAGMENT_BYTES){append(batch,index);continue;}
   let pending=[],bytes=base+2;
   for(const field of fields){
    const fieldBytes=Buffer.byteLength(field.text);
    if(bytes+(pending.length?1:0)+fieldBytes>CITY_BATCH_FRAGMENT_BYTES){
     if(!pending.length)throw Error('City batch field exceeds physical admission bound');
     append('{'+pending.join(',')+'}',index);pending=[];bytes=base+2;
    }
    bytes+=fieldBytes+(pending.length?1:0);pending.push(field.text);
   }
   if(pending.length)append('{'+pending.join(',')+'}',index);
  }
  if(batches.length)flush();else emit([],[]);
 }
 return{partition:{schemaVersion:1,kind:'batch-fragments',parts},assets};
}

/**
 * Partition verified selected data, never geometry or material expressions.
 * All rows for one city/object stay together. rowIndices restore the original
 * table order even when an object's parts were interleaved in the source.
 * A catalog value is an indivisible source program; keys may share families.
 * A compact batch record keeps a complete geometry/material group per part.
 */
export function partitionCityTable(raw, {kind, targetBytes = CITY_TABLE_PART_BYTES}) {
  if (!Number.isSafeInteger(targetBytes) || targetBytes < 2 || targetBytes > CITY_TABLE_PART_BYTES) throw Error('Invalid city table part target');
  if (kind === 'batch-fragments') return partitionBatchFragments(raw,targetBytes);
  const value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(raw));
  const groups = [];
  let envelope, sourceLayout, prefix = kind === 'object-rows' ? '[' : '{', suffix = kind === 'object-rows' ? ']' : '}';
  if (kind === 'object-rows') {
    if (!Array.isArray(value)) throw Error('Expected city admission rows');
    const rows = jsonArrayRows(raw), byObject = new Map();
    if (rows.length !== value.length) throw Error('City row lexeme count mismatch');
    value.forEach((row, index) => {
      if (!row || typeof row.city !== 'string' || !row.city || typeof row.objectId !== 'string' || !row.objectId) throw Error('Missing city admission identity');
      const key = `${row.city}|${row.objectId}`;
      let group = byObject.get(key);
      if (!group) { group = {key, entries: []}; byObject.set(key, group); groups.push(group); }
      group.entries.push({index, text: rows[index]});
    });
  } else if (kind === 'record-keys') {
    if (!value || Array.isArray(value) || typeof value !== 'object') throw Error('Expected city program catalog');
    const members = new Map(jsonObjectMembers(raw).map(member => [member.key, member.text]));
    for (const [key, source] of Object.entries(value)) {
      if (typeof source !== 'string') throw Error('City program catalog values must be strings');
      groups.push({key, entries: [{text: members.get(key)}]});
    }
  } else if (kind === 'batch-record') {
    if (!value || Array.isArray(value) || typeof value !== 'object') throw Error('Expected city batch record');
    const members = jsonObjectMembers(raw);
    if (!members.length || members.some(({key}) => !key || !Array.isArray(value[key]) || !value[key].length
        || value[key].some(batch => !batch || Array.isArray(batch) || typeof batch !== 'object'))) {
      throw Error('Invalid city batch record group');
    }
    // The verifier can reconstruct the canonical hash without publishing the
    // whole file or serializing any geometry, even when numbers contain -0.
    if (!raw.equals(Buffer.from('{' + members.map(member => member.text).join(',') + '}'))) {
      throw Error('Expected compact city batch record members');
    }
    for (const {key, text} of members) groups.push({key, entries: [{text}]});
  } else if (kind === 'model-envelope' || kind === 'group-envelope') {
    const rowField = kind === 'group-envelope' ? 'groups' : 'models', identityField = kind === 'group-envelope' ? 'queueId' : 'targetId';
    if (!value || Array.isArray(value) || !Array.isArray(value[rowField])) throw Error('Expected model envelope');
    const text = new TextDecoder('utf-8', {fatal: true}).decode(raw), members = jsonObjectMembers(text);
    const models = members.find(member => member.key === rowField), rows = containerEntries(models.valueText, '[');
    if (rows.entries.length !== value[rowField].length) throw Error('Model envelope lexeme count mismatch');
    const first = rows.entries[0]?.start ?? rows.first + 1, last = rows.entries.at(-1)?.end ?? first;
    prefix = text.slice(0, models.valueStart + first); suffix = text.slice(models.valueStart + last);
    sourceLayout = {prefix, suffix, separators: rows.entries.slice(1).map((entry, i) => rows.text.slice(rows.entries[i].end, entry.start))};
    envelope = Object.fromEntries(Object.entries(value).filter(([key]) => key !== rowField));
    const seen = new Set();
    value[rowField].forEach((model, index) => {
      if (!model || typeof model[identityField] !== 'string' || !model[identityField] || seen.has(model[identityField])) throw Error('Invalid or duplicate model target identity');
      seen.add(model[identityField]);
      groups.push({key: model[identityField], entries: [{index, text: rows.entries[index].text}]});
    });
  } else throw Error('Unknown city table partition kind');

  const parts = [], assets = [];
  const ordered = kind === 'object-rows' || kind === 'model-envelope' || kind === 'group-envelope', baseBytes = Buffer.byteLength(prefix + suffix);
  let pending = [], pendingBytes = baseBytes, pendingEntries = 0;
  function flush() {
    if (!pending.length) return;
    const entries = pending.flatMap(group => group.entries);
    if (ordered) entries.sort((a, b) => a.index - b.index);
    const content = Buffer.from(prefix + entries.map(entry => entry.text).join(',') + suffix);
    const asset = encodeCityTable(content);
    parts.push({
      descriptor: asset.descriptor,
      keys: pending.map(group => group.key),
      ...(ordered ? {rowIndices: entries.map(entry => entry.index)} : {}),
      ...(content.length > targetBytes ? {oversizedAtomic: true} : {}),
    });
    assets.push(asset);
    pending = []; pendingBytes = baseBytes; pendingEntries = 0;
  }
  for (const group of groups) {
    const bytes = group.entries.reduce((sum, entry) => sum + Buffer.byteLength(entry.text), 0) + group.entries.length - 1;
    if (pending.length && (kind === 'batch-record' || pendingBytes + 1 + bytes > targetBytes)) flush();
    pending.push(group);
    pendingBytes += bytes + (pendingEntries ? 1 : 0);
    pendingEntries += group.entries.length;
  }
  flush();
  return {partition: {schemaVersion: 1, kind, ...(['model-envelope', 'group-envelope'].includes(kind) ? {envelope, sourceLayout} : {}), parts}, assets};
}
