// Offline maintenance helpers only. Importing this module performs no I/O and
// retains no table, parsed value, manifest, resource cache or runtime loader.
import {open} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzip as gunzipCallback} from 'node:zlib';
import {promisify} from 'node:util';

const gunzip=promisify(gunzipCallback);
const shaPattern=/^[a-f0-9]{64}$/;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const own=(value,key)=>value!==null&&typeof value==='object'&&Object.hasOwn(value,key);
const positiveInteger=value=>Number.isSafeInteger(value)&&value>0;
const fail=message=>{throw Error('Identity projection input: '+message);};

/** Validate a caller's exact ref before any asset access.
 * manifest = {tables: frozen-paint-table-manifest.json,
 *             initializers: frozen-paint-table-dependencies.json.initializers.bremen}
 * The authoritative selected-provider SHA -> {file: occurrenceCount} bindings
 * are mandatory. A bare descriptor array or caller-authored ref substitute is
 * insufficient. Shared canonical tables still require the exact file/ordinal.
 * This metadata-only result can also be used by the projection cost manifest.
 */
export function verifiedProjectionInputSpec(ref,{manifest,maxRawBytes}={}){
 if(!ref||!shaPattern.test(ref.canonicalSHA256)||ref.codec!=='json'||typeof ref.file!=='string'||!ref.file||ref.file.length>256||ref.file.startsWith('/')||ref.file.includes('\\')||ref.file.includes('\0')||ref.file.split('/').some(part=>!part||part==='.'||part==='..')||!Number.isSafeInteger(ref.occurrence)||ref.occurrence<0)fail('invalid canonical SHA/file/occurrence/codec reference');
 if(!positiveInteger(maxRawBytes))fail('maxRawBytes must be an explicit positive safe integer');
 if(!manifest||!Array.isArray(manifest.tables)||!manifest.initializers||Array.isArray(manifest.initializers)||typeof manifest.initializers!=='object')fail('tables and authoritative selected-provider initializer bindings are required');
 const initializers=own(manifest.initializers,ref.canonicalSHA256)?manifest.initializers[ref.canonicalSHA256]:undefined;
 const count=own(initializers,ref.file)?initializers[ref.file]:undefined;
 if(!positiveInteger(count)||ref.occurrence>=count)fail('ref file/occurrence is outside the selected provider initializer bindings');
 const matches=manifest.tables.filter(row=>row?.sha256===ref.canonicalSHA256);
 if(matches.length!==1)fail('canonical SHA must resolve to exactly one raw manifest descriptor');
 const descriptor=matches[0];
 const expectedPath=(sha,gzip=false)=>'/safety/buildings3d/painted-tables/'+sha.slice(0,2)+'/'+sha+'.json'+(gzip?'.gz':'');
 if(!positiveInteger(descriptor.bytes)||descriptor.bytes>maxRawBytes||descriptor.path!==expectedPath(ref.canonicalSHA256))fail('invalid raw descriptor or raw byte budget exceeded');
 const raw=Object.freeze({path:descriptor.path,sha256:descriptor.sha256,bytes:descriptor.bytes});
 let physical=raw;
 if(descriptor.transport!==undefined){
  const transport=descriptor.transport;
  if(!transport||!shaPattern.test(transport.sha256)||transport.encoding!=='gzip'||!positiveInteger(transport.bytes)||transport.path!==expectedPath(transport.sha256,true))fail('invalid gzip transport descriptor');
  physical=Object.freeze({path:transport.path,sha256:transport.sha256,bytes:transport.bytes,encoding:'gzip'});
 }
 return Object.freeze({ref:Object.freeze({canonicalSHA256:ref.canonicalSHA256,file:ref.file,occurrence:ref.occurrence,codec:ref.codec}),raw,physical});
}

async function readExactAsset(assetRoot,descriptor){
 if(typeof assetRoot!=='string'||!path.isAbsolute(assetRoot))fail('assetRoot must be an absolute directory');
 const file=path.join(assetRoot,descriptor.path.slice(1));
 const handle=await open(file,'r');
 try{
  const stat=await handle.stat();
  if(!stat.isFile()||stat.size!==descriptor.bytes)fail('physical byte count mismatch: '+descriptor.path);
  const bytes=Buffer.allocUnsafe(descriptor.bytes);
  let offset=0;
  while(offset<bytes.length){
   const {bytesRead}=await handle.read(bytes,offset,bytes.length-offset,offset);
   if(!bytesRead)fail('physical byte count changed during read: '+descriptor.path);
   offset+=bytesRead;
  }
  const probe=Buffer.allocUnsafe(1);
  if((await handle.read(probe,0,1,offset)).bytesRead)fail('physical byte count changed during read: '+descriptor.path);
  return bytes;
 }finally{await handle.close();}
}

/** Read exactly one caller-selected input; never preload adjacent resources.
 * Prefer the manifest's gzip transport when present. A missing or corrupt
 * selected transport fails closed; it does not trigger a second/raw-file read.
 * Verify physical length/SHA, then bounded inflated length/canonical SHA, then
 * strict UTF-8 and JSON. Return only the parsed value for the caller to extract
 * and release; no closure or module state retains it.
 */
export async function readVerifiedProjectionInput(ref,{assetRoot,manifest,maxRawBytes}={}){
 const {raw,physical}=verifiedProjectionInputSpec(ref,{manifest,maxRawBytes});
 const bytes=await readExactAsset(assetRoot,physical);
 const physicalSHA=digest(bytes);
 if(physicalSHA!==physical.sha256)fail('physical SHA-256 mismatch: '+physical.path);
 const decoded=physical.encoding==='gzip'?await gunzip(bytes,{maxOutputLength:raw.bytes}):bytes;
 if(decoded.byteLength!==raw.bytes)fail('raw byte count mismatch: '+raw.path);
 const rawSHA=physical.encoding==='gzip'?digest(decoded):physicalSHA;
 if(rawSHA!==raw.sha256)fail('raw canonical SHA-256 mismatch: '+raw.path);
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decoded));
}

/** Select exact identity rows by an explicit property/index path.
 * Examples: ['*'] for a root array; ['models','*','requiredNativeGroup','*'];
 * ['groups','*','models','*','identity'] for nested model identities.
 * '*' expands arrays only. Preserve input order and duplicate rows; reject a
 * missing/malformed selection rather than guessing, deduplicating, accepting
 * object-only matches or adding city/signature semantics. Each output object
 * contains copied scalar strings only, with no original row/model reference.
 */
export function projectPairRows(value,pathspec){
 if(!Array.isArray(pathspec)||pathspec.some(step=>!(typeof step==='string'&&step.length>0||Number.isSafeInteger(step)&&step>=0)))throw Error('Identity projection path must contain explicit property names, indices or array wildcards');
 const rows=[];
 function visit(current,index){
  if(index===pathspec.length){
   if(!own(current,'objectId')||!own(current,'partId')||typeof current.objectId!=='string'||!current.objectId||typeof current.partId!=='string'||!current.partId)throw Error('Identity projection row must contain exact string objectId and partId');
   rows.push({objectId:current.objectId,partId:current.partId});return;
  }
  const step=pathspec[index];
  if(step==='*'){
   if(!Array.isArray(current))throw Error('Identity projection wildcard requires an array');
   for(const member of current)visit(member,index+1);
  }else{
   if(!own(current,step))throw Error('Identity projection path is missing '+String(step));
   visit(current[step],index+1);
  }
 }
 visit(value,0);return rows;
}
