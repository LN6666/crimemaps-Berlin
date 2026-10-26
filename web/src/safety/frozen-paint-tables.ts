import cityDataProfile from 'virtual:crimemaps-city-data';
import {repositoryCity} from './deployment';
import {createCityFrozenProfile} from './city-frozen-profile';
import {createFrozenInitializerStore} from './frozen-paint-initializer-store';
import manifest from './frozen-paint-table-manifest.json';
import {inflateBounded3DGzip} from './bounded-3d-gzip';
import dependencies from './frozen-paint-table-dependencies.json';

type Descriptor={path:string;sha256:string;bytes:number;transport?:{path:string;sha256:string;bytes:number;encoding:'gzip'}};
type Read=(path:string,signal:AbortSignal,max:number)=>Promise<Uint8Array>;
type Selection={tables:readonly string[];initializers?:Record<string,Record<string,number>>};
const MAX_TABLE_BYTES=64*1024**2,MAX_TOTAL_BYTES=900*1024**2;
const abort=()=>new DOMException('Aborted','AbortError');

/** Validate the full byte stream before exposing it, without allocating a
 * second table-sized string that would immediately be discarded. */
function validateFrozenUTF8(bytes:Uint8Array){
  const decoder=new TextDecoder('utf-8',{fatal:true}),chunkBytes=64*1024;
  for(let at=0;at<bytes.length;at+=chunkBytes)decoder.decode(bytes.subarray(at,at+chunkBytes),{stream:true});
  decoder.decode();
}

/** Frozen initializers still receive independent, exact native JSON values.
 * Only verified UTF-8 inputs are retained while module evaluation needs them.
 * The generated import graph selects active providers and proves one read per
 * module initializer; consumed input is released without sharing parsed values.
 */
export function createFrozenTableStore(descriptors:readonly Descriptor[]){
  const tables=new Map<string,Uint8Array>(),registry=new Map<string,Descriptor>();
  const consumed=new Map<string,number>(),expected=new Map<string,Map<string,number>>();
  let total=0,retainedBytes=0,leases=0,active=0,peak=0,reads=0;
  type Pending={promise:Promise<void>;controller:AbortController;subscribers:number;settled:boolean;run:()=>void};
  const pending=new Map<string,Pending>(),queue:Pending[]=[];
  for(const d of descriptors){
    if(!/^\/safety\/buildings3d\/painted-tables\/[a-f0-9]{2}\/[a-f0-9]{64}\.json$/.test(d.path)||!d.path.endsWith('/'+d.sha256+'.json')||!Number.isSafeInteger(d.bytes)||d.bytes<=0||d.bytes>MAX_TABLE_BYTES||registry.has(d.sha256))throw Error('Invalid frozen table descriptor');
    if(d.transport&&(!/^\/safety\/buildings3d\/painted-tables\/[a-f0-9]{2}\/[a-f0-9]{64}\.json\.gz$/.test(d.transport.path)||!d.transport.path.endsWith('/'+d.transport.sha256+'.json.gz')||!/^[a-f0-9]{64}$/.test(d.transport.sha256)||d.transport.encoding!=='gzip'||!Number.isSafeInteger(d.transport.bytes)||d.transport.bytes<1||d.transport.bytes>MAX_TABLE_BYTES))throw Error('Invalid frozen table transport');
    registry.set(d.sha256,d);total+=d.bytes;
  }
  if(total>MAX_TOTAL_BYTES)throw Error('Frozen table budget exceeded');
  const needed=(sha:string)=>{const counts=expected.get(sha);return counts?[...counts.values()].reduce((n,c)=>n+c,0):undefined;};
  const drop=(sha:string)=>{const old=tables.get(sha);if(old){retainedBytes-=old.byteLength;tables.delete(sha);}};
  const pump=()=>{while(active<2&&queue.length)queue.shift()!.run();};
  function request(d:Descriptor,read:Read,signal:AbortSignal):Promise<void>{
    signal.throwIfAborted();
    if(tables.has(d.sha256)||(needed(d.sha256)!==undefined&&(consumed.get(d.sha256)??0)>=needed(d.sha256)!))return Promise.resolve();
    let entry=pending.get(d.sha256);if(entry?.controller.signal.aborted)entry=undefined;
    if(!entry){
      const own:Pending={promise:undefined as unknown as Promise<void>,controller:new AbortController(),subscribers:0,settled:false,run:()=>{}};
      own.promise=new Promise<void>((resolve,reject)=>{
        own.run=()=>{
          if(own.controller.signal.aborted){own.settled=true;reject(abort());pump();return;}
          active++;peak=Math.max(peak,active);reads++;
          void (async()=>{
            const physical=d.transport??d;
            const bytes=await read(physical.path,own.controller.signal,physical.bytes);own.controller.signal.throwIfAborted();
            if(bytes.byteLength!==physical.bytes)throw Error('Frozen table byte count mismatch');
            const digest=await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>);own.controller.signal.throwIfAborted();
            const sha=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
            if(sha!==physical.sha256)throw Error('Frozen table hash mismatch');
            const raw=d.transport?await inflateBounded3DGzip(bytes,d.bytes,own.controller.signal,d.sha256,MAX_TABLE_BYTES):bytes;
            // Preserve a verified snapshot even when the shared transport reuses
            // the caller's bytes. Decode only when an initializer consumes it.
            const copy=d.transport?raw:raw.slice();validateFrozenUTF8(copy);
            own.controller.signal.throwIfAborted();drop(d.sha256);tables.set(d.sha256,copy);retainedBytes+=copy.byteLength;
          })().then(()=>{own.settled=true;resolve();},error=>{own.settled=true;reject(error);}).finally(()=>{active--;if(pending.get(d.sha256)===own)pending.delete(d.sha256);pump();});
        };
        queue.push(own);
      });
      entry=own;pending.set(d.sha256,own);
      void own.promise.catch(()=>{});
    }
    const current=entry;current.subscribers++;
    return new Promise<void>((resolve,reject)=>{
      let done=false;
      const finish=()=>{if(done)return false;done=true;signal.removeEventListener('abort',canceled);current.subscribers--;if(!current.subscribers&&!current.settled)current.controller.abort();return true;};
      const canceled=()=>{if(finish()){reject(abort());pump();}};
      signal.addEventListener('abort',canceled,{once:true});
      current.promise.then(()=>{if(finish())resolve();},error=>{if(finish())reject(error);});
      if(signal.aborted)canceled();else pump();
    });
  }
  async function prepare(read:Read,external:AbortSignal,selection?:Selection):Promise<()=>void>{
    external.throwIfAborted();
    const hashes=selection?.tables??descriptors.map(d=>d.sha256);
    for(const sha of hashes){if(!registry.has(sha))throw Error('Unknown frozen table dependency');const refs=selection?.initializers?.[sha];if(refs){const combined=expected.get(sha)??new Map<string,number>();for(const [file,count]of Object.entries(refs)){if(!Number.isSafeInteger(count)||count<1)throw Error('Invalid frozen initializer count');combined.set(file,count);}expected.set(sha,combined);}}
    leases++;let released=false;
    const release=()=>{if(released)return;released=true;if(!--leases){for(const sha of [...tables.keys()])drop(sha);}};
    const own=new AbortController(),cancel=()=>own.abort();external.addEventListener('abort',cancel,{once:true});
    let index=0;
    try{
      const worker=async()=>{try{while(index<hashes.length){own.signal.throwIfAborted();const sha=hashes[index++];await request(registry.get(sha)!,read,own.signal);}}catch(error){own.abort();throw error;}};
      const outcomes=await Promise.allSettled([worker(),worker()]);
      const failure=outcomes.find((r):r is PromiseRejectedResult=>r.status==='rejected');
      if(failure)throw failure.reason;external.throwIfAborted();return release;
    }catch(error){own.abort();release();throw error;}finally{external.removeEventListener('abort',cancel);}
  }
  function read(sha:string):any{
    const bytes=tables.get(sha);
    if(bytes===undefined)throw Error('Frozen table has not been verified: '+sha);
    const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    consumed.set(sha,(consumed.get(sha)??0)+1);
    const count=needed(sha);if(count!==undefined&&consumed.get(sha)!>=count)drop(sha);
    return value;
  }
  return {prepare,read,get stats(){return{retainedBytes,retainedTables:tables.size,active,peakConcurrency:peak,queued:queue.length,reads,leases,inputRepresentation:'verified-utf8',parsedValuesShared:false};}};
}
// JSON imports widen string literals; the store validates every descriptor at runtime.
const cityProfile=createCityFrozenProfile(manifest as readonly Descriptor[],dependencies,cityDataProfile,repositoryCity);
const store=createFrozenTableStore(cityProfile.descriptors);
export function frozenPaintTableSelection(providers:readonly string[]):Selection{
  const tables=new Set<string>(),initializers:Record<string,Record<string,number>>={};
  for(const provider of providers){const list=(dependencies.providers as Record<string,string[]>)[provider],refs=(dependencies.initializers as Record<string,Record<string,Record<string,number>>>)[provider];if(!list||!refs)throw Error('Unknown frozen paint provider');for(const sha of list){tables.add(sha);Object.assign(initializers[sha]??={},refs[sha]);}}
  return cityProfile.selection({tables:[...tables].sort(),initializers});
}
export const preloadFrozenPaintTables=(read:Read,signal:AbortSignal,providers:readonly string[])=>store.prepare(read,signal,frozenPaintTableSelection(providers));
export const readFrozenTable=(sha:string)=>store.read(cityProfile.resolveLegacy(sha));
const initializerStore=createFrozenInitializerStore(cityProfile.descriptors);
export const readFrozenTableAsync=(sha:string,file:string,occurrence=0)=>initializerStore.read(cityProfile.resolve(sha,file,occurrence),file,occurrence);
export const frozenPaintTableRowCounts=cityProfile.rowCounts;
export const beginFrozenPaintTableInitialization=(read:Read,signal:AbortSignal,providers:readonly string[],onFailure?:(error:unknown)=>void)=>initializerStore.begin(read,signal,frozenPaintTableSelection(providers),onFailure);
export const frozenPaintTableStats=()=>({...initializerStore.stats,legacy:store.stats,cityProfile:cityProfile.stats()});
