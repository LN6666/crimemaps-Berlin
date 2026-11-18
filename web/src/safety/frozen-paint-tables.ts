import cityDataProfile from 'virtual:crimemaps-city-data';
import {repositoryCity} from './deployment';
import {createCityFrozenProfile} from './city-frozen-profile';
import {createFrozenInitializerStore,type FrozenInitializerSession} from './frozen-paint-initializer-store';
import {createFrozenDataLeaseStore,type FrozenDataReader} from './frozen-data-lease-store';
import {estimateRetainedBuildingPayload} from './building-payload-cost';
import type {ChunkResourceStore} from './render-runtime/chunk-resource-types';
import type {ResourceBudget,ResourceBudgetCost,ResourceBudgetReservation} from './render-runtime/resource-budget';
import {resourceByteAdmittedEnvelope,resourceByteDeliveredCost,type ResourceByteDeliveryRefusedError,type ResourceByteEnvelope,type ResourceBytesAcquire,type ResourceBytesLease} from './resource-byte-transport';
export type {DataLease,FrozenDataClient,FrozenDataIdentity,FrozenDataLeaseStats,FrozenDataRef} from './frozen-data-lease-store';
export type {FrozenInitializerSession} from './frozen-paint-initializer-store';
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

/** Page-ledger ingress for module initializers. The initializer store keeps its
 * own read -> verify -> inflate/copy -> parse order. Before the physical read
 * this adapter admits the table's whole working set in one reservation, the
 * claim: the input bytes it is about to hold plus a read envelope minted for
 * this one read (resourceByteAdmittedEnvelope). It hands that claim to the byte
 * transport's caller-admitted read (acquireBytes' 4th argument), whose page-store
 * entry reserves the same envelope identities for no additional byte: the
 * transport never waits for capacity, nothing is returned to the ledger before
 * the read and a synchronous availability listener has nothing to take. At
 * delivery the transport shrinks the claim in place to [input, response]. A
 * working set above the page limit is reported as not fitting instead of
 * waiting forever; one that does not fit now waits holding nothing. A delivery
 * the claim could not take (a response buffer larger than the envelope) is
 * retried once with an envelope that covers it, then reported as not fitting.
 * The response stays leased under its exact buffer identity (never a released
 * compat read) until the initializer store keeps its own verified copy (the
 * inflated output or its slice). The claim then stops listing the response and
 * the store adopts it as that table's retention charge, which it keeps until the
 * table's last selected initializer has parsed it, page pressure reclaims it
 * idle, or the session ends; the claim also ends with the session. `budget` must
 * be the byte transport's own page ledger and acquireBytes must forward its 4th
 * argument to that transport. */
export type FrozenTableIngress={
  acquireBytes:ResourceBytesAcquire;
  budget:ResourceBudget;
};
type TableClaim={sha256:string;reservation:ResourceBudgetReservation;inputBytes:number;response:ResourceBytesLease|undefined;released:boolean;release:()=>void;adopt:()=>ResourceBudgetReservation|undefined};
type PendingInput={sha256:string;phase:'frozen-table-input'|'frozen-table-transport';requiredBytes:number;availableBytes:number;sinceMs:number};
const physicalTables=new Map(cityProfile.descriptors.map(d=>[(d.transport??d).path,d] as const));
const tableClaims=new Map<string,TableClaim>();
// handoffRefusals stays 0: a caller-admitted read has no hand-off to refuse.
let inputAdmissions=0,inputWaits=0,inputUnfit=0,inputExits=0,inputAdoptions=0,inputHandoffRefusals=0,inputDeliveryRefusals=0,inputUnadmittedDeliveries=0,lastInputUnfit:string|undefined,lastHandoffRefusal:string|undefined;
// Observable queue reason: which table waits, in which phase, for how many bytes.
// 'frozen-table-input': nothing is held yet, the whole working set waits.
// 'frozen-table-transport': the claim is admitted and carries the transport read
// (its envelope listed by the claim and the transport entry, counted once); the
// network read is queued or in flight.
const pendingInputs=new Map<string,PendingInput>();
/** A refused caller-admitted delivery, by its stable code and fields. */
function deliveryRefusal(error:unknown):ResourceByteDeliveryRefusedError|undefined{
  const refused=error as Partial<ResourceByteDeliveryRefusedError>|null;
  return refused?.code==='RESOURCE_BYTE_DELIVERY_REFUSED'&&Number.isSafeInteger(refused.envelopeBytes)&&typeof refused.unfit==='boolean'?refused as ResourceByteDeliveryRefusedError:undefined;
}
/** Exact retained input copy (inflated output or the store's verified slice)
 * plus one working copy bound (WebCrypto digest copy, decompression chunks or
 * the decoded UTF-16 text, at most two bytes per input byte). The compressed or
 * plain transport response keeps its own exact charge in the byte transport. */
function tableInputCosts(d:Descriptor):ResourceBudgetCost[]{
  return[
    {category:d.transport?'inflate':'read',bytes:d.bytes,precision:'exact',label:'frozen table verified input '+d.sha256.slice(0,16)},
    {category:'normalize',bytes:d.bytes*2,precision:'estimate',label:'frozen table digest, inflate and decoded-text working copy'},
  ];
}
/** One table read's complete working set: the input claim this adapter keeps
 * plus the read envelope minted for that same read, which the claim lists. */
const tableWorkingSet=(d:Descriptor,envelope:ResourceByteEnvelope):ResourceBudgetCost[]=>[...tableInputCosts(d),...envelope];
const costBytes=(costs:readonly ResourceBudgetCost[])=>costs.reduce((bytes,cost)=>bytes+cost.bytes,0);
function budgetAvailable(budget:ResourceBudget,signal:AbortSignal){
  return new Promise<void>((resolve,reject)=>{
    let done=false,off:(()=>void)|undefined;
    const finish=(error?:unknown)=>{if(done)return;done=true;signal.removeEventListener('abort',cancel);const stop=off;off=undefined;stop?.();if(error===undefined)resolve();else reject(error);};
    const cancel=()=>finish(signal.reason??abort());
    signal.addEventListener('abort',cancel,{once:true});
    if(signal.aborted){cancel();return;}
    // A wake-up hint from the page ledger only; admission is retried below.
    off=budget.onAvailable(()=>finish(),signal);
  });
}
async function admitTableWorkingSet(budget:ResourceBudget,d:Descriptor,envelope:ResourceByteEnvelope,signal:AbortSignal):Promise<ResourceBudgetReservation>{
  const costs=tableWorkingSet(d,envelope),required=costBytes(costs),label='frozen table input '+d.sha256;
  for(;;){
    signal.throwIfAborted();
    const result=budget.tryReserve(costs,{label});
    if(result.ok){inputAdmissions++;return result.reservation;}
    // A working set above the whole page limit can never be admitted by waiting.
    if(required>budget.stats.limitBytes){inputUnfit++;lastInputUnfit=result.error.message.slice(0,512);throw result.error;}
    // Nothing is held while waiting: neither this input nor its read envelope.
    inputWaits++;const waiting:PendingInput={sha256:d.sha256,phase:'frozen-table-input',requiredBytes:required,availableBytes:budget.stats.availableBytes,sinceMs:performance.now()};pendingInputs.set(d.sha256,waiting);
    try{await budgetAvailable(budget,signal);}finally{if(pendingInputs.get(d.sha256)===waiting)pendingInputs.delete(d.sha256);}
  }
}
function ledgeredTableReader(ingress:FrozenTableIngress):Read{
  return async(path,signal,max)=>{
    signal.throwIfAborted();
    const d=physicalTables.get(path),physical=d&&(d.transport??d);
    if(!d||!physical||physical.bytes!==max)throw Error('Frozen table input is outside the selected city descriptors');
    const budget=ingress.budget,keep=()=>tableInputCosts(d);
    // After a refused delivery: the envelope the next read mints (its envelopeBytes).
    let retryEnvelopeBytes=0;
    for(;;){
      // A fresh envelope per read: one envelope covers one acquireBytes call.
      const envelope=resourceByteAdmittedEnvelope(path,max,retryEnvelopeBytes),envelopeBytes=costBytes(envelope);
      const reservation=await admitTableWorkingSet(budget,d,envelope,signal);
      if(signal.aborted){reservation.release();signal.throwIfAborted();}
      const attempt=new AbortController();
      const claim:TableClaim={sha256:d.sha256,reservation,inputBytes:costBytes(keep()),response:undefined,released:false,release(){
        if(claim.released)return;claim.released=true;signal.removeEventListener('abort',claim.release);
        if(tableClaims.get(claim.sha256)===claim)tableClaims.delete(claim.sha256);
        // Leaving a caller-admitted read is only by abort: the transport settles
        // the call inside that abort, and only then is the claim released. An
        // abandoned read stays charged by its transport entry until it settles.
        attempt.abort(abort());
        const response=claim.response;claim.response=undefined;response?.release();reservation.release();inputExits++;
      },adopt(){
        // The store keeps its own verified copy now and takes over the claim
        // (same reservation, no new admission) as its retention charge. The
        // claim first stops listing the delivered response (a shrink, never
        // refused), so the retention never carries the response a second time;
        // the response has no further use and returns to the transport.
        if(claim.released)return;claim.released=true;signal.removeEventListener('abort',claim.release);
        if(tableClaims.get(claim.sha256)===claim)tableClaims.delete(claim.sha256);
        reservation.adjust(keep());
        const response=claim.response;claim.response=undefined;response?.release();inputExits++;inputAdoptions++;
        return reservation;
      }};
      // One session reads a table once; an older session's claim already exited
      // when that session's signal aborted.
      tableClaims.get(d.sha256)?.release();tableClaims.set(d.sha256,claim);
      signal.addEventListener('abort',claim.release,{once:true});
      const handedOff:PendingInput={sha256:d.sha256,phase:'frozen-table-transport',requiredBytes:envelopeBytes,availableBytes:budget.stats.availableBytes,sinceMs:performance.now()};
      pendingInputs.set(d.sha256,handedOff);
      // The envelope a retry needs after a refused delivery; 0 when delivered.
      let refusedEnvelopeBytes=0,refusal:unknown;
      try{
        signal.throwIfAborted();
        // The claim lists [input, ...envelope]; until the promise settles it is
        // neither adjusted nor released here, and only abort leaves the read.
        const response=await ingress.acquireBytes(path,attempt.signal,max,{admitted:reservation,envelope,keep:keep()});
        if(claim.released||signal.aborted){response.release();signal.throwIfAborted();throw abort();}
        if(response.cost===undefined){
          // A transport that ignored the caller's admission (no 4th argument)
          // left the envelope on the claim: list the response in its place.
          inputUnadmittedDeliveries++;
          const delivered=resourceByteDeliveredCost(response.bytes,path);
          if(!reservation.adjust([...keep(),delivered])){response.release();refusedEnvelopeBytes=Math.max(envelopeBytes,delivered.bytes);refusal=Error('Frozen table response is larger than its admitted read envelope: '+d.sha256);}
        }
        if(!refusedEnvelopeBytes){claim.response=response;return response.bytes;}
      }catch(error){
        const refused=deliveryRefusal(error);
        if(!refused||signal.aborted){claim.release();throw error;}
        refusedEnvelopeBytes=refused.unfit?Infinity:refused.envelopeBytes;refusal=refused;
      }
      finally{if(pendingInputs.get(d.sha256)===handedOff)pendingInputs.delete(d.sha256);}
      // The response buffer exceeded the envelope. Holding nothing, admit the
      // input once more with an envelope that covers it; a second refusal of
      // the same table, or one above the page limit, does not fit.
      claim.release();inputDeliveryRefusals++;
      if(retryEnvelopeBytes>0||!Number.isSafeInteger(refusedEnvelopeBytes)){inputUnfit++;lastInputUnfit=String((refusal as Error)?.message).slice(0,512);throw refusal;}
      retryEnvelopeBytes=refusedEnvelopeBytes;
    }
  };
}
// A table's read claim ends when the initializer store keeps its verified input
// (the store adopts it, see FrozenTableIngress) or when the session ends.
export const readFrozenTableAsync=(sha:string,file:string,occurrence=0)=>initializerStore.read(cityProfile.resolve(sha,file,occurrence),file,occurrence);
export const frozenPaintTableRowCounts=cityProfile.rowCounts;
/** A FrozenTableIngress puts the session's table inputs on the page ledger,
 * including what the store retains for a table's remaining initializers.
 * A bare reader remains the legacy path for owners without a page store.
 * The returned session's settled(signal) resolves once no initializer it
 * selects is pending (see FrozenInitializerSession). */
export const beginFrozenPaintTableInitialization=(read:Read|FrozenTableIngress,signal:AbortSignal,providers:readonly string[],onFailure?:(error:unknown)=>void):FrozenInitializerSession=>typeof read==='function'
  ?initializerStore.begin(read,signal,frozenPaintTableSelection(providers),onFailure)
  :initializerStore.begin(ledgeredTableReader(read),signal,frozenPaintTableSelection(providers),onFailure,{budget:read.budget,adopt:sha=>tableClaims.get(sha)?.adopt(),estimate:value=>estimateRetainedBuildingPayload(value).retainedPayloadEstimateBytes});
export const frozenPaintTableStats=()=>{
  // claimedBytes: the claims' input part; claimedReadBytes: the read part they
  // also list (the minted envelope in flight, the exact response once delivered).
  let claimedBytes=0,claimedReadBytes=0,leasedResponses=0;for(const claim of tableClaims.values()){claimedBytes+=claim.inputBytes;claimedReadBytes+=Math.max(0,claim.reservation.bytes-claim.inputBytes);if(claim.response)leasedResponses++;}
  const initializers=initializerStore.stats;
  return{...initializers,retainedParsedEstimateBytes:initializers.parsedRetention.retainedParsedEstimateBytes,legacy:store.stats,cityProfile:cityProfile.stats(),inputLedger:{claims:tableClaims.size,claimedBytes,claimedReadBytes,leasedResponses,admissions:inputAdmissions,waits:inputWaits,unfit:inputUnfit,exits:inputExits,adoptions:inputAdoptions,handoffRefusals:inputHandoffRefusals,deliveryRefusals:inputDeliveryRefusals,unadmittedDeliveries:inputUnadmittedDeliveries,pending:[...pendingInputs.values()].map(row=>({...row})),lastUnfit:lastInputUnfit,lastHandoffRefusal,
    measurement:'logical page-ledger claims from physical read until the initializer store keeps the verified input; each table input and a read envelope minted for it are admitted as one claim that the byte transport shrinks in place at delivery; the store then adopts the claim as its retention charge (see retention); parsed module values are charged by the initializer store (see parsedRetention)' as const}};
};

/** Per-map resource owner for migrated recipes. The legacy TLA store remains
 * independent: releasing/reacquiring data never resets module evaluation state.
 * acquireBytes must forward its 4th argument (a caller-admitted read). */
export function createFrozenDataResourceOwner(options:{city:string;profileSHA256:string|null;read:FrozenDataReader;acquireBytes?:ResourceBytesAcquire;resourceStore?:ChunkResourceStore}){
 if(cityDataProfile&&cityDataProfile.city!==options.city)throw Error('Frozen data resource city profile mismatch');
 if(cityDataProfile&&options.profileSHA256===null)throw Error('Frozen data resources require the deployed profile identity');
 const resources=createFrozenDataLeaseStore(cityProfile.descriptors,{resourceStore:options.resourceStore});
 return{
  client(provider:string){return resources.client({city:options.city,profileSHA256:options.profileSHA256,provider,selection:frozenPaintTableSelection([provider]),resolve:cityProfile.resolve,partition:cityProfile.partition,read:options.read,acquireBytes:options.acquireBytes});},
  get stats(){return resources.stats;},
  destroy(){resources.destroy();}
 };
}
