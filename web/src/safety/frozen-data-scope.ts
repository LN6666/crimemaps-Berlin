import type {DataLease,FrozenDataClient,FrozenDataIdentity,FrozenDataRef} from './frozen-data-lease-store';
import {ResourceBudgetExceededError,type ResourceBudgetCost,type ResourceBudgetReservation} from './render-runtime/resource-budget';
import type {ChunkResourceCosts,ChunkResourceLease,ChunkResourceRole,ChunkResourceStore} from './render-runtime/chunk-resource-types';
import {registerReconstructionResourceObject,type ReconstructionResource} from './reconstruction-resource-parents';

export type FrozenResourceMemoRequest<T>={contentKey:string;estimate:ChunkResourceCosts;parents?:readonly ChunkResourceLease<unknown>[];produce:()=>T;costs?:(value:T)=>ChunkResourceCosts};

/** One staged CPU preparation and the consumers of its published result.
 * This aggregates existing leases; it does not introduce another loader/cache.
 * Callers release their preparation ownership in finally. Resident/cached
 * results retain a pin while they can reference any borrowed recipe arrays.
 * A pinned consumer may prepare additional resources after preparation ownership
 * is released. The final pin disposes the scope and aborts pending acquisition.
 */
export interface FrozenDataScope {
 prepare(refs:readonly FrozenDataRef[],signal:AbortSignal):Promise<void>;
 /** Fix the demand for one resource before its synchronous consumers run.
  * Complete object cohorts must be included; later calls may reuse a subset. */
 prepareSelection(ref:FrozenDataRef,keys:readonly string[],signal:AbortSignal):Promise<void>;
 /** Prove a synchronous consumer was included in the declared demand, even
  * when that object legitimately has no row in the partition manifest. */
 assertSelection(ref:FrozenDataRef,keys:readonly string[]):void;
 borrow<T,R>(ref:FrozenDataRef,read:(value:T)=>R):R;
 memo<T>(key:object,create:()=>T,estimateBytes?:number):T;
 /** A synchronous pure CPU value owned only by the shared resource store. */
 resourceMemo<T>(key:unknown,request:FrozenResourceMemoRequest<T>):T;
 retainMemoResource(key:unknown,role:ChunkResourceRole):ChunkResourceLease<unknown>;
 /** End construction-only ownership after its final consumer has handed off
  * the resident representation. Callers name every memo retaining these inputs;
  * material/capture resources and the scope's consumer pins remain valid. */
 retirePrepared(refs:readonly FrozenDataRef[],memoKeys:readonly unknown[]):void;
 /** A consumer of construction arrays names precisely what it retains. A
  * general material/scope pin does not keep retired construction alive. */
 retainPrepared(refs:readonly FrozenDataRef[],memoKeys?:readonly unknown[]):()=>void;
 /** An independent single-reference parent for a derived resident resource;
  * neither the scope nor other prepared tables are captured by this token. */
 retainResource(ref:FrozenDataRef,role:ChunkResourceRole):ChunkResourceLease<unknown>;
 /** Verified table identity independent of its current partition selection. */
 preparedResourceIdentity(ref:FrozenDataRef):FrozenDataIdentity;
 retain():()=>void;
 release():void;
 readonly stats:{resources:number;pending:number;pins:number;ownerReleased:boolean;disposed:boolean};
}

const aborted=()=>new DOMException('Frozen data scope was released','AbortError');
const resourceKey=(ref:FrozenDataRef)=>JSON.stringify([ref.canonicalSHA256,ref.file,ref.occurrence,ref.codec]);

/** Top-level adapter: a retained pure entry never captures a FrozenDataScope.
 * Producer/cost callbacks are consumed and cleared in this synchronous call. */
function synchronousResource<T>(resources:ChunkResourceStore,request:FrozenResourceMemoRequest<T>):ChunkResourceLease<T>{
 let producer:(()=>T)|undefined=request.produce,measure:((value:T)=>ChunkResourceCosts)|undefined=request.costs;
 let failed=false,failure:unknown,grant:ChunkResourceLease<T>|undefined;
 try{
  grant=resources.acquire<T>({contentKey:request.contentKey,role:'source',allowRecent:false,estimate:request.estimate,parents:request.parents,
   produce(context){
    const run=producer;producer=undefined;
    try{
     if(!run)throw Error('Frozen resource memo producer was already consumed');
     const value=run(),cost=measure;measure=undefined;
     if(cost&&!context.adjust(cost(value))){const pressure=context.budget.stats.lastPressure;if(pressure)throw new ResourceBudgetExceededError(pressure);throw Error('Frozen resource memo exceeds page budget');}
     return value;
    }catch(error){failed=true;failure=error;throw error;}finally{producer=undefined;measure=undefined;}
   },
  });
  if(failed)throw failure;
  if(grant.released||grant.state!=='ready')throw Error('Frozen resource memo requires synchronous ready CPU production');
  const result=grant;grant=undefined;return result;
 }finally{producer=undefined;measure=undefined;failure=undefined;grant?.release();}
}

export function createFrozenDataScope(client:FrozenDataClient):FrozenDataScope {
 const leases=new Map<string,DataLease<unknown>>(),pending=new Map<string,Promise<void>>(),memoized=new Map<object,unknown>();
 const resourceMemos=new Map<unknown,ChunkResourceLease<unknown>>();
 const memoBudgets=new Map<object,ResourceBudgetReservation>(),resourceConsumers=new Map<string,number>(),memoConsumers=new Map<unknown,number>();
 const memoParents=new Map<object,Map<string,DataLease<unknown>>>(),creatingMemos:object[]=[];
 const retiredResources=new Set<string>(),retiredMemos=new Set<unknown>(),sourceObjects=new WeakSet<object>();
 const selections=new Map<string,Set<string>|undefined>();
 const controller=new AbortController();let ownerReleased=false,disposed=false,pins=0,activeConsumers=0;
 const check=()=>{if(disposed)throw aborted();};
 function children(value:object,visit:(value:unknown)=>void){
  if(ArrayBuffer.isView(value)||value instanceof ArrayBuffer)return;
  if(value instanceof Map){for(const [key,item]of value){visit(key);visit(item);}return;}
  if(value instanceof Set){for(const item of value)visit(item);return;}
  // Inspect stored values without executing lazy getters. In staged recipes
  // (F257 SOURCE then DISPLAY), an accessor may require a later preparation.
  // Resources held by accessor closures keep their explicit scope ownership.
  for(const property in value){const descriptor=Object.getOwnPropertyDescriptor(value,property);if(descriptor&&'value'in descriptor)visit(descriptor.value);}
 }
 function rememberSource(value:unknown,owner?:ReconstructionResource){
  if(!value||typeof value!=='object'||sourceObjects.has(value))return;sourceObjects.add(value);
  if(owner&&(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer))registerReconstructionResourceObject(scope,value,owner);
  if(ArrayBuffer.isView(value))sourceObjects.add(value.buffer);children(value,child=>rememberSource(child,owner));
 }
 function memoCosts(value:unknown,key:object):ResourceBudgetCost[]{
  const seen=new WeakSet<object>(),costs:ResourceBudgetCost[]=[];
  const primitive=(item:unknown)=>typeof item==='string'?24+item.length*2:typeof item==='number'?8:typeof item==='boolean'?4:0;
  const visit=(item:unknown):void=>{
   if(!item||typeof item!=='object')return;if(sourceObjects.has(item)||seen.has(item))return;seen.add(item);
   if(ArrayBuffer.isView(item)){costs.push({category:'construction',bytes:64,precision:'estimate',identity:item});visit(item.buffer);return;}
   if(item instanceof ArrayBuffer){costs.push({category:'construction',bytes:item.byteLength,precision:'exact',identity:item});return;}
   let bytes=Array.isArray(item)?32+item.length*8:item instanceof Map?64+item.size*48:item instanceof Set?64+item.size*32:64;
   if(!(item instanceof Map)&&!(item instanceof Set)&&!Array.isArray(item))for(const property of Object.keys(item))bytes+=16+property.length*2;
   children(item,child=>{bytes+=primitive(child);visit(child);});costs.push({category:'construction',bytes,precision:'estimate',identity:item});
  };
  visit(value);if(!value||typeof value!=='object')costs.push({category:'construction',bytes:primitive(value),precision:'estimate',identity:key});return costs;
 }
 // rememberSource excludes a resource memo's value graph from every scope memo's
 // construction costs, so that graph may be released only once no scope memo can
 // still reach it; otherwise those objects would stay live with nobody charging
 // them (review R4S2-3). Decided before any ownership changes. A plain memo named
 // in the same retirement without consumers is dropped in the same flush.
 function assertResourceMemoRetirement(memoKeys:readonly unknown[]){
  const retiring=memoKeys.filter(key=>resourceMemos.has(key));if(!retiring.length)return;
  const owned=new WeakSet<object>(),seen=new WeakSet<object>(),dropping=new Set(memoKeys.filter(key=>!memoConsumers.has(key)));
  const own=(value:unknown):void=>{if(!value||typeof value!=='object'||owned.has(value))return;owned.add(value);if(ArrayBuffer.isView(value))owned.add(value.buffer);children(value,own);};
  for(const key of retiring)own(resourceMemos.get(key)!.value);
  const reaches=(value:unknown):boolean=>{
   if(!value||typeof value!=='object')return false;if(owned.has(value)||ArrayBuffer.isView(value)&&owned.has(value.buffer))return true;
   if(seen.has(value))return false;seen.add(value);let found=false;children(value,item=>{if(!found&&reaches(item))found=true;});return found;
  };
  for(const [key,value]of memoized)if(!dropping.has(key)&&reaches(value))throw Error('Cannot retire a frozen resource memo while a scope memo still references its value');
 }
 function dropMemo(key:unknown){const objectKey=key as object,reservation=memoBudgets.get(objectKey),parents=memoParents.get(objectKey),resource=resourceMemos.get(key);memoized.delete(objectKey);memoBudgets.delete(objectKey);memoParents.delete(objectKey);resourceMemos.delete(key);reservation?.release();for(const lease of parents?.values()??[])lease.release();resource?.release();}
 function holdMemoParent(key:string,lease:DataLease<unknown>){
  for(const memo of creatingMemos){const parents=memoParents.get(memo)!;if(!parents.has(key)&&lease.retain)parents.set(key,lease.retain('dependency'));}
 }
 function flushRetired(){
  for(const key of retiredMemos)if(!memoConsumers.has(key)){retiredMemos.delete(key);dropMemo(key);}
  for(const key of retiredResources)if(!resourceConsumers.has(key)){retiredResources.delete(key);const lease=leases.get(key);leases.delete(key);lease?.release();}
 }
 function increment<K>(map:Map<K,number>,key:K){map.set(key,(map.get(key)??0)+1);}
 function decrement<K>(map:Map<K,number>,key:K){const count=map.get(key)??0;if(count<=1)map.delete(key);else map.set(key,count-1);}
 function disposeIfUnused(){
  if(disposed||!ownerReleased||pins||activeConsumers)return;
  disposed=true;controller.abort();for(const key of memoized.keys())dropMemo(key);for(const key of resourceMemos.keys())dropMemo(key);
  for(const lease of leases.values())lease.release();
  leases.clear();pending.clear();selections.clear();retiredResources.clear();retiredMemos.clear();resourceConsumers.clear();memoConsumers.clear();
 }
 function acquire(ref:FrozenDataRef,keys?:readonly string[]):Promise<void>{
  check();const key=resourceKey(ref),selected=selections.get(key),hadSelection=selections.has(key);
  // A preparation plan owns one stable interpretation for each reference.
  // Never silently widen it after memoized maps or geometry may refer to it.
  if(keys&&selected&&keys.some(member=>!selected.has(member)))throw Error(`Frozen data selection cannot widen within one scope: ${ref.file}#${ref.occurrence}`);
  if(leases.has(key))return Promise.resolve();
  const previous=pending.get(key);if(previous)return previous;
  // Retirement frees values, not the plan's declared interpretation. An
  // explicit re-prepare must not turn a selected resource back into a whole
  // table, or invalidate memoized consumers of the original selection.
  const demand=hadSelection?(selected===undefined?undefined:[...selected]):keys===undefined?undefined:[...new Set(keys)];
  if(!hadSelection)selections.set(key,demand===undefined?undefined:new Set(demand));
  const stableRef={...ref};
  const operation=Promise.resolve().then(()=>{check();return client.acquire(stableRef,controller.signal,demand,'dependency');}).then(lease=>{
   if(disposed){lease.release();throw aborted();}
   try{const owner=client.resources?{ref:stableRef}:undefined;lease.borrow(value=>rememberSource(value,owner));leases.set(key,lease);}catch(error){lease.release();throw error;}
  }).finally(()=>{if(pending.get(key)===operation){pending.delete(key);if(!leases.has(key)&&!hadSelection)selections.delete(key);}});
  pending.set(key,operation);return operation;
 }
 async function wait(work:Promise<unknown>,signal:AbortSignal){
  await new Promise<void>((resolve,reject)=>{
   let done=false;
   const finish=(error?:unknown)=>{if(done)return;done=true;signal.removeEventListener('abort',cancel);if(error!==undefined)reject(error);else resolve();};
   const cancel=()=>finish(signal.reason??aborted());
   signal.addEventListener('abort',cancel,{once:true});
   work.then(()=>finish(),error=>finish(error));
   if(signal.aborted)cancel();
  });
  signal.throwIfAborted();check();
 }
 const scope:FrozenDataScope={
  async prepare(refs,signal){
   signal.throwIfAborted();check();
   await wait(Promise.all(refs.map(ref=>acquire(ref))),signal);
  },
  async prepareSelection(ref,keys,signal){
   signal.throwIfAborted();check();
   await wait(acquire(ref,keys),signal);
  },
  assertSelection(ref,keys){
   check();const key=resourceKey(ref);
   if(!leases.has(key))throw Error(`Frozen data resource was not prepared for this scope: ${ref.file}#${ref.occurrence} (${ref.canonicalSHA256})`);
   const selected=selections.get(key);
   if(selected&&keys.some(member=>!selected.has(member)))throw Error(`Frozen data consumer was not declared in this scope: ${ref.file}#${ref.occurrence}`);
  },
  borrow<T,R>(ref:FrozenDataRef,read:(value:T)=>R):R{
   check();const key=resourceKey(ref),lease=leases.get(key);
   if(!lease)throw Error(`Frozen data resource was not prepared for this scope: ${ref.file}#${ref.occurrence} (${ref.canonicalSHA256})`);
   holdMemoParent(key,lease);
   increment(resourceConsumers,key);activeConsumers++;
   try{return lease.borrow(value=>read(value as T));}finally{decrement(resourceConsumers,key);activeConsumers--;flushRetired();disposeIfUnused();}
  },
  memo<T>(key:object,create:()=>T,estimateBytes?:number):T{
   check();if(memoized.has(key)){for(const [parentKey,parent]of memoParents.get(key)??[])holdMemoParent(parentKey,parent);return memoized.get(key) as T;}
   if(creatingMemos.includes(key))throw Error('Recursive frozen memo construction');
   // Admission precedes caller construction. The estimate is logical private
   // container expansion; shared source objects/buffers are excluded below.
   const estimate=estimateBytes??4096+[...leases.values()].reduce((bytes,lease)=>bytes+(lease.logicalBytes??0)*2,0);
   if(!Number.isSafeInteger(estimate)||estimate<0)throw Error('Invalid frozen construction estimate');
   let reservation=client.resources?.budget.reserve({category:'construction',bytes:estimate,precision:'estimate',label:'frozen scope memo construction'});
   memoParents.set(key,new Map());creatingMemos.push(key);increment(memoConsumers,key);activeConsumers++;let committed=false;
   try{
    const value=create();check();if(reservation&&!reservation.adjust(memoCosts(value,key))){const pressure=client.resources?.budget.stats.lastPressure;if(pressure)throw new ResourceBudgetExceededError(pressure);throw Error('Frozen construction no longer fits page budget');}
    memoized.set(key,value);if(reservation){memoBudgets.set(key,reservation);reservation=undefined;}committed=true;return value;
   }finally{reservation?.release();creatingMemos.pop();if(!committed)dropMemo(key);decrement(memoConsumers,key);activeConsumers--;flushRetired();disposeIfUnused();}
  },
  resourceMemo<T>(key:unknown,request:FrozenResourceMemoRequest<T>):T{
   check();const existing=resourceMemos.get(key);
   if(existing){if(existing.contentKey!==request.contentKey)throw Error('Frozen resource memo identity changed within one scope');if(existing.released||existing.state!=='ready')throw Error('Frozen resource memo has no ready CPU lease');return existing.value as T;}
   if(!client.resources)throw Error('Frozen resource memo requires the client page resource store');
   increment(memoConsumers,key);activeConsumers++;
   let grant:ChunkResourceLease<T>|undefined;
   // The grant's value graph is paid once, by the store lease under its own
   // costs: an enclosing scope.memo returning it (or its arrays) must not charge
   // those objects again under their construction identities (p0-audit R1).
   try{grant=synchronousResource(client.resources,request);check();resourceMemos.set(key,grant);const value=grant.value as T;rememberSource(value,{memoKey:key});grant=undefined;return value;}finally{grant?.release();decrement(memoConsumers,key);activeConsumers--;flushRetired();disposeIfUnused();}
  },
  retainMemoResource(key,role){check();const grant=resourceMemos.get(key);if(!grant||grant.released||grant.state!=='ready')throw Error('Cannot retain unprepared frozen resource memo');return grant.retain(role);},
  retirePrepared(refs,memoKeys){
   check();const keys=new Set(refs.map(resourceKey));
   // Decide before changing any ownership: retirement is a synchronous phase
   // boundary, never cancellation of an unfinished construction operation.
   for(const key of keys)if(pending.has(key))throw Error('Cannot retire pending frozen data preparation');
   assertResourceMemoRetirement(memoKeys);
   for(const key of memoKeys)retiredMemos.add(key);
   for(const key of keys)retiredResources.add(key);
   flushRetired();
  },
  retainPrepared(refs,memoKeys=[]){
   check();let keys=[...new Set(refs.map(resourceKey))],memos=[...new Set(memoKeys)];
   for(const key of keys)if(!leases.has(key))throw Error('Cannot retain unprepared frozen construction');
   for(const key of keys)increment(resourceConsumers,key);for(const key of memos)increment(memoConsumers,key);pins++;let released=false;
   return()=>{if(released)return;released=true;for(const key of keys)decrement(resourceConsumers,key);for(const key of memos)decrement(memoConsumers,key);keys=[];memos=[];pins--;flushRetired();disposeIfUnused();};
  },
  retainResource(ref,role){check();const lease=leases.get(resourceKey(ref));if(!lease)throw Error('Cannot retain unprepared frozen resource');return lease.retainResource(role);},
  preparedResourceIdentity(ref){check();const lease=leases.get(resourceKey(ref));if(!lease)throw Error('Cannot identify unprepared frozen resource');return lease.identity;},
  retain(){
   check();pins++;let released=false;
   return()=>{if(released)return;released=true;pins--;disposeIfUnused();};
  },
  release(){if(ownerReleased)return;ownerReleased=true;disposeIfUnused();},
  get stats(){return{resources:leases.size,pending:pending.size,pins,ownerReleased,disposed};},
 };
 return scope;
}
