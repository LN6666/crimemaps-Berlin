import manifest from './frozen-paint-table-manifest.json';

type Descriptor={path:string;sha256:string;bytes:number};
type Read=(path:string,signal:AbortSignal,max:number)=>Promise<Uint8Array>;
const MAX_TABLE_BYTES=32*1024**2,MAX_TOTAL_BYTES=700*1024**2;

/** Preserve frozen numeric data without asking the JS bundler to concatenate it.
 * Each table is verified before any frozen implementation can observe it.
 * Each original JSON initializer receives its own value, preserving isolation
 * between frozen implementations even when the raw data has the same hash.
 */
export function createFrozenTableStore(descriptors:readonly Descriptor[]){
  const tables=new Map<string,string>();
  let total=0;
  for(const d of descriptors){
    if(!/^\/safety\/buildings3d\/painted-tables\/[a-f0-9]{2}\/[a-f0-9]{64}\.json$/.test(d.path)||!d.path.endsWith('/'+d.sha256+'.json')||!Number.isSafeInteger(d.bytes)||d.bytes<=0||d.bytes>MAX_TABLE_BYTES)throw Error('Invalid frozen table descriptor');
    total+=d.bytes;
  }
  if(total>MAX_TOTAL_BYTES)throw Error('Frozen table budget exceeded');
  async function prepare(read:Read,external:AbortSignal){
    external.throwIfAborted();
    const request=new AbortController(),cancel=()=>request.abort(),signal=request.signal;
    external.addEventListener('abort',cancel,{once:true});
    // The caller's transport owns the shared concurrency limit. Pending values
    // stay local until their hash and UTF-8 decoding have both succeeded.
    try{await Promise.all(descriptors.map(async d=>{
      if(tables.has(d.sha256))return;
      const bytes=await read(d.path,signal,d.bytes);signal.throwIfAborted();
      if(bytes.byteLength!==d.bytes)throw Error('Frozen table byte count mismatch');
      const hash=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer);signal.throwIfAborted();
      const sha=[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
      if(sha!==d.sha256)throw Error('Frozen table hash mismatch');
      const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);signal.throwIfAborted();
      tables.set(d.sha256,text);
    }));}catch(error){request.abort();throw error;}finally{external.removeEventListener('abort',cancel);}
  }
  function read(sha:string):any{
    const text=tables.get(sha);
    if(text===undefined)throw Error('Frozen table has not been verified: '+sha);
    return JSON.parse(text);
  }
  return {prepare,read};
}
const store=createFrozenTableStore(manifest);
export const preloadFrozenPaintTables=store.prepare;
export const readFrozenTable=store.read;
