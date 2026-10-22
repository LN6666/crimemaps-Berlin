/** Bounded source-only dead-function pruning. Any unsupported input retains the original. */
export function pruneOwner6307Fragment(source:string):string {
 try {
  // Keep source offsets: comments are blanked only for parsing, never rewritten.
  if(/^\s*#\s*(?!version\b|extension\b|line\b)/m.test(source)||source.includes('/*')&&!source.includes('*/'))return source;
  const clean=source.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' ')).replace(/\/\/[^\n]*/g,m=>' '.repeat(m.length));
  if(clean.includes('/*')||clean.includes('*/'))return source;
  const definitions:{name:string;start:number;end:number;calls:string[]}[]=[];
  const re=/\b(?:void|float|int|uint|bool|[biu]?vec[234]|mat[234](?:x[234])?|[A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{/g;
  let match:RegExpExecArray|null;
  while((match=re.exec(clean))){let depth=1,end=re.lastIndex;const bodyStart=end;while(end<clean.length&&depth){if(clean[end]==='{')depth++;else if(clean[end]==='}')depth--;end++;}if(depth)return source;definitions.push({name:match[1],start:match.index,end,calls:Array.from(clean.slice(bodyStart,end-1).matchAll(/\b([A-Za-z_]\w*)\s*\(/g),m=>m[1])});re.lastIndex=end;}
  if(!definitions.some(d=>d.name==='main'))return source;
  // Parse forward declarations explicitly: declarations are not runtime calls.
  let outside='',last=0;for(const d of definitions){outside+=clean.slice(last,d.start);last=d.end;}outside+=clean.slice(last);
  if(/\)\s*\{/.test(outside))return source;
  const prototypes:{name:string;start:number;end:number}[]=[];
  const declaration=/\b(?:void|float|int|uint|bool|[biu]?vec[234]|mat[234](?:x[234])?|[A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*;/g;
  for(const m of clean.matchAll(declaration)){const start=m.index!;if(!definitions.some(d=>start>=d.start&&start<d.end))prototypes.push({name:m[1],start,end:start+m[0].length});}
  // Blank both parsed definitions and prototypes to preserve original coordinates for global references.
  const chars=clean.split('');for(const r of [...definitions,...prototypes])for(let i=r.start;i<r.end;i++)if(chars[i]!=='\n')chars[i]=' ';outside=chars.join('');
  if(/\b[A-Za-z_]\w*\s+[A-Za-z_]\w*\s*\([^;{}]*\)\s*;/.test(outside))return source;
  const names=new Set(definitions.map(d=>d.name)),reachable=new Set<string>(),queue=['main',...Array.from(outside.matchAll(/\b([A-Za-z_]\w*)\s*\(/g),m=>m[1])];
  while(queue.length){const name=queue.pop()!;if(reachable.has(name)||!names.has(name))continue;reachable.add(name);for(const d of definitions)if(d.name===name)queue.push(...d.calls);}
  const ranges=[...definitions,...prototypes].sort((a,b)=>a.start-b.start);
  let result='';last=0;for(const d of ranges){result+=source.slice(last,d.start);if(reachable.has(d.name))result+=source.slice(d.start,d.end);last=d.end;}return result+source.slice(last);
 } catch { return source; }
}
