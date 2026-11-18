import type {BuildingComponent} from "../../../safety/building-mesh-types";
import type {FrozenDataClient} from '../../../safety/frozen-data-lease-store';
import {createFrozenDataScope,type FrozenDataScope} from '../../../safety/frozen-data-scope';
import {EDGE70_RESOURCE,EDGE70_SHA} from './bremen-ag70-metadata';
import {EDGE70_IDENTITIES} from './bremen-ag70-identities';
import {createEdgeAg70Recipe,edgeAg70Identity,edgeAg70BaseMaterials} from './bremen-ag70-runtime';
import {createBremenHeldSourceCertificates,prepareBremenHeldSourceCertificates,hasPreparedBremenCertificateUnion,hasPreparedBremenCertificateGroup} from './bremen-held-source-certificates';
import {bremenCertificateCandidate,bremenCertificateIdentityCandidate} from './bremen-identity-metadata';

type Wait=<T>(operation:Promise<T>)=>Promise<T>;
type Recipe=ReturnType<typeof createEdgeAg70Recipe>;
type Certificates=ReturnType<typeof createBremenHeldSourceCertificates>;
const aborted=()=>new DOMException('Aborted','AbortError');
const identityWait:Wait=operation=>operation;
const AG70_RECIPE_SCOPE_KEY={},AG70_CERTIFICATES_SCOPE_KEY={},AG70_RULE_VIEWS_SCOPE_KEY={};
const ownedAG70Snapshot=<T>(value:T,alreadyOwned=false):T=>!alreadyOwned&&value&&typeof value==='object'&&(value as {patchSHA256?:unknown}).patchSHA256===EDGE70_SHA?structuredClone(value):value;
// Typed-array leaves (restore() yields Float32Array/Uint32Array AG70 sources)
// cannot be frozen; they stay private copies made by the structuredClone in ruleView.
function freezeRuleSnapshot(value:unknown):void{
 if(!value||typeof value!=='object'||ArrayBuffer.isView(value)||Object.isFrozen(value))return;
 for(const child of Object.values(value))freezeRuleSnapshot(child);
 Object.freeze(value);
}
function abortable<T>(operation:()=>Promise<T>,signal:AbortSignal):Promise<T>{
 signal.throwIfAborted();return new Promise((resolve,reject)=>{
  let done=false;const finish=(ok:boolean,value:unknown)=>{if(done)return;done=true;signal.removeEventListener('abort',cancel);if(ok)resolve(value as T);else reject(value);};
  const cancel=()=>finish(false,signal.reason??aborted());signal.addEventListener('abort',cancel,{once:true});
  Promise.resolve().then(operation).then(value=>finish(true,value),error=>finish(false,error));if(signal.aborted)cancel();
 });
}

/** Batch scopes own the real map path. The optional legacy preparation below
 * owns one compatibility scope, never a registry/cache of published batches. */
export function createBremenOwnerRuntime(client:FrozenDataClient){
 let generation=0,disposed=false,releaseRequested=false,recipe:Recipe|undefined,certificates:Certificates|undefined;
 let legacyScope:FrozenDataScope|undefined;
 let preparations=0,publications=0,clears=0;
 const pending=new Set<AbortController>(),pins=new Map<object,()=>void>();
 const preparedCertificateScopes=new WeakSet<FrozenDataScope>(),constructedAG70Scopes=new WeakSet<FrozenDataScope>();
 function releaseCells(){
  certificates?.dispose();certificates=undefined;recipe=undefined;
  const scope=legacyScope;legacyScope=undefined;scope?.release();clears++;
 }
 function check(){if(disposed)throw Error('Bremen owner runtime was disposed');}
 function scopedRecipe(scope:FrozenDataScope){check();const result=scope.memo(AG70_RECIPE_SCOPE_KEY,()=>scope.borrow<any,Recipe>(EDGE70_RESOURCE,createEdgeAg70Recipe));constructedAG70Scopes.add(scope);return result;}
 function scopedCertificates(scope:FrozenDataScope){check();return scope.memo(AG70_CERTIFICATES_SCOPE_KEY,()=>createBremenHeldSourceCertificates(undefined,scope));}
 function ruleView(identity:Parameters<Certificates['bremenHeldSourceRule']>[0],scope?:FrozenDataScope){
  check();if(!bremenCertificateIdentityCandidate(identity))return undefined;
  const value=scope?{certificates:scopedCertificates(scope),scope}:requireCertificates();
  const result=value.certificates.bremenHeldSourceRule(identity);
  if(!result||(result as {patchSHA256?:unknown}).patchSHA256!==EDGE70_SHA)return result;
  const views=value.scope.memo(AG70_RULE_VIEWS_SCOPE_KEY,()=>{
   // Clone the group once so common parent/display references stay shared inside
   // the isolated immutable view, rather than cloning each held rule per read.
   const rows=structuredClone(EDGE70_IDENTITIES.map(id=>value.certificates.bremenHeldSourceRule(id)).filter(Boolean));
   freezeRuleSnapshot(rows);
   return new Map(rows.map(row=>[row.identity.objectId+'|'+row.identity.partId,row] as const));
  });
  return views.get(identity.objectId+'|'+identity.partId);
 }
 function requireRecipe(){check();if(!recipe||!legacyScope)throw Error('Bremen AG70 owner recipe was not prepared');return{recipe,scope:legacyScope};}
 function requireCertificates(){check();if(!certificates||!legacyScope)throw Error('Bremen owner certificates were not prepared');return{certificates,scope:legacyScope};}
 async function prepareBatchCertificates(scope:FrozenDataScope,components:readonly BuildingComponent[],signal:AbortSignal,force=false){
  check();signal.throwIfAborted();if(!force&&!bremenCertificateCandidate(components))return;
  await prepareBremenHeldSourceCertificates(scope,components,signal,force);signal.throwIfAborted();check();if(!force&&!hasPreparedBremenCertificateUnion(scope))return;scopedCertificates(scope);signal.throwIfAborted();check();preparedCertificateScopes.add(scope);
 }
 async function prepare(components:readonly BuildingComponent[],signal:AbortSignal,wait:Wait=identityWait){
  signal.throwIfAborted();check();if(!components.some(c=>c.city==='bremen'))return;
  releaseRequested=false;if(recipe&&certificates)return;
  const ticket=generation,own=new AbortController(),cancel=()=>own.abort(signal.reason??aborted());
  signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();pending.add(own);preparations++;
  const scope=createFrozenDataScope(client);let nextCertificates:Certificates|undefined,published=false;
  const current=()=>{signal.throwIfAborted();own.signal.throwIfAborted();check();if(ticket!==generation)throw aborted();};
  const operation=Promise.resolve().then(async()=>{await scope.prepare([EDGE70_RESOURCE],own.signal);current();await prepareBatchCertificates(scope,components,own.signal,true);current();return scope;});
  void operation.catch(()=>{});
  try{
   const prepared=await abortable(()=>wait(operation),own.signal);current();if(prepared!==scope)throw Error('Bremen owner preparation adapter changed the resource');
   if(recipe&&certificates)return;
   const nextRecipe=scopedRecipe(scope);nextCertificates=scopedCertificates(scope);current();
   recipe=nextRecipe;certificates=nextCertificates;legacyScope=scope;
   nextCertificates=undefined;published=true;publications++;
  }finally{
   signal.removeEventListener('abort',cancel);pending.delete(own);
   if(!published){own.abort();nextCertificates?.dispose();scope.release();}
  }
 }
 return{
  createBatchScope(){check();return createFrozenDataScope(client);},
  prepareBatchCertificates,
  /** DISPLAY/material hand-off and certificates must precede retirement.
   * Certificate graph references and all external consumer pins stay live. */
  retireBatchConstruction(scope:FrozenDataScope){
   check();if(!constructedAG70Scopes.has(scope))return;
   if(!preparedCertificateScopes.has(scope))throw Error('Bremen batch certificates must precede construction retirement');
   scope.retirePrepared([EDGE70_RESOURCE],[AG70_RECIPE_SCOPE_KEY]);constructedAG70Scopes.delete(scope);
  },
  hasPreparedBatchCertificates(scope:FrozenDataScope){return preparedCertificateScopes.has(scope)&&!scope.stats.disposed;},
  hasPreparedCertificateGroup(scope:FrozenDataScope,groupKey:string){return hasPreparedBremenCertificateGroup(scope,groupKey);},
  prepare,
  edgeAg70Identity,
  edgeAg70BaseMaterials,
  edgeAg70Reconstruction(components:Parameters<Recipe['edgeAg70Reconstruction']>[0],selectedTargetIds?:Parameters<Recipe['edgeAg70Reconstruction']>[1],leaf?:Parameters<Recipe['edgeAg70Reconstruction']>[2],scope?:FrozenDataScope){const value=scope?{recipe:scopedRecipe(scope),scope}:requireRecipe();return value.scope.borrow(EDGE70_RESOURCE,()=>value.recipe.edgeAg70Reconstruction(components,selectedTargetIds,leaf));},
  /** Internal read-only access; AG70 is isolated/frozen once per group. */
  bremenHeldSourceRuleView(identity:Parameters<Certificates['bremenHeldSourceRule']>[0],scope?:FrozenDataScope){return ruleView(identity,scope);},
  bremenHeldSourceRule(identity:Parameters<Certificates['bremenHeldSourceRule']>[0],scope?:FrozenDataScope){return ownedAG70Snapshot(ruleView(identity,scope));},
  serializeBremenHeldSourceReadback(component:Parameters<Certificates['serializeBremenHeldSourceReadback']>[0],leaf:Parameters<Certificates['serializeBremenHeldSourceReadback']>[1],generation:Parameters<Certificates['serializeBremenHeldSourceReadback']>[2],scope?:FrozenDataScope){if(!component)return null;check();if(!bremenCertificateIdentityCandidate(component))return null;const value=scope?{certificates:scopedCertificates(scope),scope}:requireCertificates();const result=value.certificates.serializeBremenHeldSourceReadback(component,leaf,generation);return ownedAG70Snapshot(result,value.certificates.ownsSnapshot?.(result)===true);},
  serializeBremenWholeDisplayCertificate(component:Parameters<Certificates['serializeBremenWholeDisplayCertificate']>[0],generation:Parameters<Certificates['serializeBremenWholeDisplayCertificate']>[1],originalSource:Parameters<Certificates['serializeBremenWholeDisplayCertificate']>[2],leaf:Parameters<Certificates['serializeBremenWholeDisplayCertificate']>[3],scope?:FrozenDataScope){if(!component)return null;check();if(!bremenCertificateIdentityCandidate(component))return null;const value=scope?{certificates:scopedCertificates(scope),scope}:requireCertificates();const result=value.certificates.serializeBremenWholeDisplayCertificate(component,generation,originalSource,leaf);return ownedAG70Snapshot(result,value.certificates.ownsSnapshot?.(result)===true);},
  /** Async capture/recovery consumers can keep the scope until their own drain.
   * The returned function captures only a token, never a recipe/model value. */
  pin(){check();if(!recipe||!legacyScope||releaseRequested)throw Error('Bremen owner runtime was not prepared');const token={},unpin=legacyScope.retain();pins.set(token,unpin);let released=false;return()=>{if(released)return;released=true;pins.delete(token);unpin();if(releaseRequested&&!pins.size&&!disposed)releaseCells();};},
  clearResident(){if(disposed)return;generation++;releaseRequested=true;for(const own of pending)own.abort();if(!pins.size)releaseCells();},
  dispose(){if(disposed)return;disposed=true;generation++;for(const own of pending)own.abort();for(const unpin of pins.values())unpin();pins.clear();releaseCells();client.dispose();},
  get stats(){return{generation,prepared:Boolean(recipe&&certificates),preparing:pending.size,pins:pins.size,leases:legacyScope?.stats.resources??0,releaseRequested,disposed,preparations,publications,clears,measurement:'owner-runtime-cells-not-retained-heap' as const};}
 };
}
export type BremenOwnerRuntime=ReturnType<typeof createBremenOwnerRuntime>;
