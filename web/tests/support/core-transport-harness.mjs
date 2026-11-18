// Shared harness for the caller-admitted byte transport tests. One esbuild
// bundle carries the transport, the page store and the ledger, so they share
// module state as on the page. Payloads are small synthetic buffers; no product
// asset is read and nothing touches a GPU.
//
// CORE_TRANSPORT_SOURCE (absolute path) swaps the transport source for a
// negative control, e.g. a copy taken before the caller-admitted path existed.
// A swapped source without resourceByteAdmittedEnvelope gets an identity-tagged
// stand-in, so the same scenarios run against it (it ignores the envelope).
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../src/safety');
export const KiB=1024,MiB=1024*KiB;

export async function loadCoreTransport(){
  const api=await loadBundle();
  if(typeof api.resourceByteAdmittedEnvelope==='function')return api;
  return{...api,resourceByteAdmittedEnvelope:(target,max,minimumBytes=0)=>{
    const costs=api.resourceByteReadEnvelope(target,max).map(cost=>({...cost,identity:{}})),beyond=Math.max(0,minimumBytes-2*max);
    if(beyond)costs.push({category:'read',bytes:beyond,precision:'estimate',identity:{},label:'delivered buffer beyond the read envelope'});
    return Object.freeze(costs);
  }};
}

async function loadBundle(){
  const override=process.env.CORE_TRANSPORT_SOURCE?path.resolve(process.env.CORE_TRANSPORT_SOURCE):undefined;
  const plugins=override?[{name:'core-transport-source',setup(builder){
    // Only the entry imports the transport in this bundle.
    builder.onResolve({filter:/^\.\/resource-byte-transport$/},()=>({path:override}));
    // The swapped copy keeps resolving its runtime imports inside web/src/safety.
    builder.onResolve({filter:/^\.\/render-runtime\//},args=>args.importer===override?{path:path.join(safety,args.path+'.ts')}:undefined);
  }}]:[];
  const built=await build({stdin:{contents:[
    "export * from './resource-byte-transport';",
    "export {createChunkResourceStore} from './render-runtime/chunk-resource-store';",
    "export {createResourceBudget,ResourceBudgetExceededError} from './render-runtime/resource-budget';",
  ].join('\n'),resolveDir:safety,sourcefile:'core-transport-entry.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',plugins});
  return import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=core-transport-under-test.mjs').toString('base64'));
}

/** Forwards to a real ledger and samples its total after every mutation made
 * through it (reservations made by the store, the caller and other owners). The
 * total only changes at mutations, so the peak sample is the peak occupancy. */
export function sampledBudget(real){
  const peak={bytes:real.stats.bytes,mutations:0};
  const sample=()=>{peak.mutations++;const bytes=real.stats.bytes;if(bytes>peak.bytes)peak.bytes=bytes;};
  const wrap=reservation=>({
    adjust(cost,options){const ok=reservation.adjust(cost,options);sample();return ok;},
    release(){reservation.release();sample();},
    setRecent(value,options){const ok=reservation.setRecent(value,options);sample();return ok;},
    markRetiring(){reservation.markRetiring();sample();},
    setRetiring(value){reservation.setRetiring(value);sample();},
    get active(){return reservation.active;},get bytes(){return reservation.bytes;},get recent(){return reservation.recent;},
  });
  const budget=Object.assign(Object.create(real),{
    reserve(cost,options){const reservation=real.reserve(cost,options);sample();return wrap(reservation);},
    tryReserve(cost,options){const result=real.tryReserve(cost,options);sample();return result.ok?{ok:true,reservation:wrap(result.reservation)}:result;},
  });
  return{budget,peak,reset(){peak.bytes=real.stats.bytes;peak.mutations=0;}};
}

/** A page store and transport over one sampled ledger. Every network read
 * waits for the test to resolve or reject it. */
export function transportHarness(api,{limitBytes=4*MiB,recentLimitBytes=MiB}={}){
  const real=api.createResourceBudget({limitBytes,recentLimitBytes}),probe=sampledBudget(real),budget=probe.budget;
  const store=api.createChunkResourceStore({budget}),reads=[];
  const transport=api.createResourceByteTransport({namespace:'core-transport-test',resourceStore:store,
    read:(target,signal,max)=>new Promise((resolve,reject)=>{reads.push({path:target,signal,max,resolve,reject});})});
  const harness={api,real,probe,budget,store,transport,reads,
    /** One claim admitted at once, as a caller does before calling acquireBytes. */
    admit(costs,label='caller claim'){const result=budget.tryReserve(costs,{label});if(!result.ok)throw result.error;return result.reservation;},
    /** A read's envelope minted for this read, and one claim admitted at once as [...keep, ...envelope]. */
    admitRead(target,max,keep=[],label='caller claim'){const envelope=api.resourceByteAdmittedEnvelope(target,max);return{claim:harness.admit([...keep,...envelope],label),envelope,keep};},
    /** acquireBytes with an admitRead result as its fourth argument. */
    acquire(target,signal,max,{claim,envelope,keep}){return transport.acquireBytes(target,signal,max,{admitted:claim,envelope,keep});},
    /** Other owners take `bytes` of the ledger. */
    fill(bytes,label='other owner'){const result=budget.tryReserve({category:'decoded',bytes,precision:'exact',label});if(!result.ok)throw result.error;return result.reservation;},
    category(name){return{...(real.stats.categories[name]??{bytes:0,exactBytes:0,estimatedBytes:0})};},
  };
  return harness;
}

export const cost=(category,bytes,label,precision='estimate')=>({category,bytes,precision,label});
export const settle=()=>new Promise(resolve=>setImmediate(resolve));
export async function until(predicate,label){for(let i=0;i<50;i++){if(predicate())return;await settle();}throw new Error('Timed out waiting: '+label);}
/** A synchronous reserver in every availability wave: it takes whatever is free. */
export function greedyReserver(h){
  const taken=[];let calls=0;
  const stop=h.real.onAvailable(()=>{
    calls++;const free=h.real.stats.availableBytes;if(free<=0)return;
    const result=h.budget.tryReserve({category:'decoded',bytes:free,precision:'exact',label:'greedy wave reserver'});
    if(result.ok)taken.push(result.reservation);
  });
  return{get calls(){return calls;},get bytes(){return taken.reduce((total,reservation)=>total+reservation.bytes,0);},
    stop(){stop();for(const reservation of taken.splice(0))reservation.release();}};
}
