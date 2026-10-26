import {inflateBounded3DGzip} from './bounded-3d-gzip';

export type FrozenInitializerDescriptor={path:string;sha256:string;bytes:number;transport?:{path:string;sha256:string;bytes:number;encoding:'gzip'}};
export type FrozenInitializerSelection={tables:readonly string[];initializers?:Record<string,Record<string,number>>};
type Reader=(path:string,signal:AbortSignal,max:number)=>Promise<Uint8Array>;
type Job={key:string;sha:string;file:string;occurrence:number;queued:boolean;promise:Promise<any>;resolve:(value:any)=>void};
type Session={id:number;read:Reader;controller:AbortController;allowed:Map<string,Map<string,number>>;failure:Promise<never>;reject:(error:unknown)=>void;closed:boolean;removeAbort:()=>void;onFailure?:(error:unknown)=>void};
const LIMIT=64*1024**2,ABORT=()=>new DOMException('Aborted','AbortError');
function validateUTF8(bytes:Uint8Array){const decoder=new TextDecoder('utf-8',{fatal:true});for(let at=0;at<bytes.length;at+=65536)decoder.decode(bytes.subarray(at,at+65536),{stream:true});decoder.decode();}
const hash=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>))].map(v=>v.toString(16).padStart(2,'0')).join('');
function abortable<T>(read:()=>Promise<T>,signal:AbortSignal):Promise<T>{
 signal.throwIfAborted();return new Promise((resolve,reject)=>{let settled=false;const finish=(error:unknown,value?:T)=>{if(settled)return;settled=true;signal.removeEventListener('abort',cancel);error===undefined?resolve(value!):reject(error);};const cancel=()=>finish(signal.reason??ABORT());signal.addEventListener('abort',cancel,{once:true});Promise.resolve().then(read).then(value=>finish(undefined,value),error=>finish(error));if(signal.aborted)cancel();});
}

/** Jobs await only verified input bytes, never another module or import promise.
 * A transient cancellation/failure parks the TLA job rather than rejecting its
 * module evaluation: native ESM caches rejected evaluations permanently.
 * The owning request gets the error immediately through session.wait(); an
 * explicit new session resumes the same pending initializer exactly once.
 */
export function createFrozenInitializerStore(descriptors:readonly FrozenInitializerDescriptor[]){
 const registry=new Map<string,FrozenInitializerDescriptor>(),raw=new Map<string,Uint8Array>();
 const expected=new Map<string,Map<string,number>>(),consumed=new Map<string,number>(),done=new Set<string>();
 const jobs=new Map<string,Job>(),queue:Job[]=[],running=new Set<Job>();
 const physical=new Map<string,{session:Session;promise:Promise<Uint8Array>}>();
 let current:Session|undefined,epoch=0,retainedBytes=0,declaredInFlightRawBytes=0,activePhysicalBytes=0,peakLiveRawInputBytes=0,peakRetainedBytes=0,peakPhysicalBytes=0,peakInitializers=0,peakModules=0,reads=0,parses=0,failures=0;
 let selectedRawByteBudget=0,selectedRawInputBound=0;
 let total=0;for(const d of descriptors){
  if(!/^\/safety\/buildings3d\/painted-tables\/[a-f0-9]{2}\/[a-f0-9]{64}\.json$/.test(d.path)||!d.path.endsWith('/'+d.sha256+'.json')||!Number.isSafeInteger(d.bytes)||d.bytes<1||d.bytes>LIMIT||registry.has(d.sha256))throw Error('Invalid frozen table descriptor');
  const t=d.transport;if(t&&(!/^\/safety\/buildings3d\/painted-tables\/[a-f0-9]{2}\/[a-f0-9]{64}\.json\.gz$/.test(t.path)||!t.path.endsWith('/'+t.sha256+'.json.gz')||!/^[a-f0-9]{64}$/.test(t.sha256)||t.encoding!=='gzip'||!Number.isSafeInteger(t.bytes)||t.bytes<1||t.bytes>LIMIT))throw Error('Invalid frozen table transport');
  registry.set(d.sha256,d);total+=d.bytes;
 }
 if(total>900*1024**2)throw Error('Frozen table budget exceeded');
 const live=()=>{peakRetainedBytes=Math.max(peakRetainedBytes,retainedBytes);peakLiveRawInputBytes=Math.max(peakLiveRawInputBytes,retainedBytes+declaredInFlightRawBytes);peakPhysicalBytes=Math.max(peakPhysicalBytes,activePhysicalBytes);};
 const drop=(sha:string)=>{const bytes=raw.get(sha);if(bytes){retainedBytes-=bytes.byteLength;raw.delete(sha);}};
 const clear=()=>{for(const sha of raw.keys())drop(sha);};
 const remaining=(sha:string,session:Session)=>{let count=0;for(const [file,n]of session.allowed.get(sha)??[])for(let i=0;i<n;i++)if(!done.has(sha+'|'+file+'|'+i))count++;return count;};
 const allowed=(job:Job,session:Session)=>job.occurrence<(session.allowed.get(job.sha)?.get(job.file)??0);
 const enqueue=(job:Job)=>{if(!job.queued&&jobs.has(job.key)){job.queued=true;queue.push(job);}};
 function stop(session:Session,error?:unknown){
  if(session.closed)return;session.closed=true;session.removeAbort();if(current===session)current=undefined;
  session.controller.abort(error??ABORT());clear();
  if(error!==undefined){session.reject(error);session.onFailure?.(error);}
 }
 function failure(session:Session,error:unknown){if(current!==session||session.closed)return;failures++;stop(session,error);}
 async function input(d:FrozenInitializerDescriptor,session:Session):Promise<Uint8Array>{
  session.controller.signal.throwIfAborted();const cached=raw.get(d.sha256);if(cached)return cached;
  const inflight=physical.get(d.sha256);if(inflight?.session===session)return inflight.promise;
  const entry={session,promise:undefined as unknown as Promise<Uint8Array>};
  entry.promise=(async()=>{
   const signal=session.controller.signal,p=d.transport??d;let ownPhysical=0;
   declaredInFlightRawBytes+=d.bytes;live();reads++;
   try{
    const bytes=await abortable(()=>session.read(p.path,signal,p.bytes),signal);signal.throwIfAborted();
    if(bytes.byteLength!==p.bytes)throw Error('Frozen table byte count mismatch');ownPhysical=bytes.byteLength;activePhysicalBytes+=ownPhysical;live();
    if(await hash(bytes)!==p.sha256)throw Error('Frozen table hash mismatch');signal.throwIfAborted();
    const value=d.transport?await inflateBounded3DGzip(bytes,d.bytes,signal,d.sha256,LIMIT):bytes.slice();
    validateUTF8(value);signal.throwIfAborted();if(current!==session||session.closed)throw ABORT();
    declaredInFlightRawBytes-=d.bytes;raw.set(d.sha256,value);retainedBytes+=value.byteLength;live();return value;
   }catch(error){declaredInFlightRawBytes-=d.bytes;throw error;}
   finally{activePhysicalBytes-=ownPhysical;}
  })().finally(()=>{if(physical.get(d.sha256)===entry)physical.delete(d.sha256);});
  physical.set(d.sha256,entry);return entry.promise;
 }
 function pump(){
  const session=current;if(!session||session.closed)return;
  while(running.size<2){
   const at=queue.findIndex(job=>allowed(job,session));if(at<0)return;
   const job=queue.splice(at,1)[0];job.queued=false;running.add(job);peakInitializers=Math.max(peakInitializers,running.size);peakModules=Math.max(peakModules,new Set([...running].map(row=>row.file)).size);
   void(async()=>{
    const bytes=await input(registry.get(job.sha)!,session);session.controller.signal.throwIfAborted();if(current!==session||session.closed)throw ABORT();
    const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));parses++;
    done.add(job.key);jobs.delete(job.key);consumed.set(job.sha,(consumed.get(job.sha)??0)+1);
    if(!remaining(job.sha,session))drop(job.sha);
    job.resolve(value);
   })().catch(error=>{if(current===session&&!session.closed)failure(session,error);}).finally(()=>{running.delete(job);if(jobs.has(job.key))enqueue(job);pump();});
  }
 }
 function read(sha:string,file:string,occurrence=0):Promise<any>{
  if(!registry.has(sha)||!/^painted\/(?:root500|delegated500|tier300|church|city|infill|bremen)\/safety\/[A-Za-z0-9_.-]+\.ts$/.test(file)||!Number.isSafeInteger(occurrence)||occurrence<0)throw Error('Invalid frozen module initializer');
  const key=sha+'|'+file+'|'+occurrence;if(done.has(key))throw Error('Frozen initializer evaluated more than once');
  const existing=jobs.get(key);if(existing)return existing.promise;
  const job:Job={key,sha,file,occurrence,queued:false,promise:undefined as unknown as Promise<any>,resolve:()=>{}};job.promise=new Promise(resolve=>job.resolve=resolve);jobs.set(key,job);enqueue(job);if(current&&!allowed(job,current))failure(current,Error('Frozen initializer is outside the selected provider graph'));pump();return job.promise;
 }
 function begin(read:Reader,signal:AbortSignal,selection:FrozenInitializerSelection,onFailure?:(error:unknown)=>void){
  signal.throwIfAborted();const allow=new Map<string,Map<string,number>>();let selectedTotal=0,shared=0;const sizes:number[]=[];
  for(const sha of selection.tables){const d=registry.get(sha),refs=selection.initializers?.[sha];if(!d||!refs)throw Error('Unknown frozen initializer selection');const rows=new Map<string,number>();let count=0;
   for(const [file,n]of Object.entries(refs)){if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid frozen initializer count');rows.set(file,n);count+=n;}
   allow.set(sha,rows);const all=expected.get(sha)??new Map<string,number>();for(const [file,n]of rows)all.set(file,n);expected.set(sha,all);selectedTotal+=d.bytes;sizes.push(d.bytes);if(count>1)shared+=d.bytes;
  }
  if(current)stop(current,ABORT());sizes.sort((a,b)=>b-a);selectedRawByteBudget=selectedTotal;selectedRawInputBound=(sizes[0]??0)+(sizes[1]??0)+shared;
  let reject!:(error:unknown)=>void;const failed=new Promise<never>((_resolve,no)=>reject=no);void failed.catch(()=>{});
  const session:Session={id:++epoch,read,controller:new AbortController(),allowed:allow,failure:failed,reject,closed:false,removeAbort:()=>{},onFailure};
  const canceled=()=>stop(session,signal.reason??ABORT());signal.addEventListener('abort',canceled,{once:true});session.removeAbort=()=>signal.removeEventListener('abort',canceled);current=session;if(signal.aborted)canceled();pump();
  return{get active(){return current===session&&!session.closed;},wait<T>(operation:Promise<T>):Promise<T>{return Promise.race([operation,session.failure]);},close(){stop(session,ABORT());}};
 }
 return{read,begin,get stats(){return{retainedBytes,retainedTables:raw.size,active:running.size,activeModules:new Set([...running].map(job=>job.file)).size,peakConcurrency:peakInitializers,peakConcurrentModules:peakModules,queued:queue.length,pendingInitializers:jobs.size,completedInitializers:done.size,reads,parses,failures,sessionActive:Boolean(current&&!current.closed),declaredInFlightRawBytes,activePhysicalBytes,peakPhysicalBytes,peakRetainedBytes,peakLiveRawInputBytes,selectedRawByteBudget,selectedRawInputBound,inputRepresentation:'verified-utf8-streamed-initializers',parsedValuesShared:false,ownedTimers:0};}};
}
