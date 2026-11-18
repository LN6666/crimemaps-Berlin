import {BREMEN_IDENTITY_CANDIDATES} from './bremen-identity-projections';
import {bremenIdentityIsPure,bremenIdentityMatches} from './bremen-identity-metadata';
import {BREMEN_DEMAND_METADATA as metadata} from './bremen-demand-metadata';

export type BremenDemandComponent={objectId?:string;partId?:string;city?:string};
const moduleCity=(module:string)=>module==='owner-f018-completion'?'berlin':/^owner-f0(?:77|81|88)-completion$/.test(module)?'munich':/^owner-f(?:116|122|126|128|131)-completion$/.test(module)?'cologne':module==='infill-essen-rathaus-galerie'||module==='infill-f288-original'?'essen':module==='infill-stuttgart-jubilaeumssaeule'?'stuttgart':module==='infill-frankfurt-eurotower'?'frankfurt':'bremen';
const key=(c:BremenDemandComponent)=>c.objectId+'|'+c.partId;
type Bucket={rows:readonly BremenDemandComponent[];pairs?:Set<string>;objects?:Set<string|undefined>};
type DemandBatch={components:readonly BremenDemandComponent[];cities?:Map<string|undefined,BremenDemandComponent[]>;buckets:Map<string,Bucket>;decisions:Map<string,boolean>};
let activeBatch:DemandBatch|undefined;
/** A synchronous consumer group owns this index. Never retain a mutable batch
 * across an await or a reconstruction which replaces its identities. */
export function withBremenRecipeDemand<T>(components:readonly BremenDemandComponent[],consume:()=>T):T{
 if(activeBatch?.components===components)return consume();
 const previous=activeBatch;activeBatch={components,buckets:new Map(),decisions:new Map()};
 try{return consume();}finally{activeBatch=previous;}
}
function bucket(batch:DemandBatch,module:string,name:string):Bucket{
 const all=name.endsWith('HeldSourceRule'),allowsUndefined=(module==='infill-essen-rathaus-galerie'||module==='infill-stuttgart-jubilaeumssaeule')&&name.includes('Reconstruction');
 const city=moduleCity(module),id=all?'all':city+(allowsUndefined?'|undefined':'');
 const previous=batch.buckets.get(id);if(previous)return previous;
 let rows:readonly BremenDemandComponent[];
 if(all)rows=batch.components;
 else{
  if(!batch.cities){batch.cities=new Map();for(const c of batch.components){const city=c.city;let group=batch.cities.get(city);if(!group)batch.cities.set(city,group=[]);group.push(c);}}
  const matching=batch.cities.get(city)??[];
  rows=allowsUndefined?[...matching,...(batch.cities.get(undefined)??[])]:matching;
 }
 const result={rows};batch.buckets.set(id,result);return result;
}
const intersects=(rows:readonly BremenDemandComponent[],input:Bucket,objectOnly=false)=>{
 if(objectOnly){const objects=input.objects??=new Set(input.rows.map(c=>c.objectId));return rows.some(row=>objects.has(row.objectId));}
 const pairs=input.pairs??=new Set(input.rows.map(key));return rows.some(row=>pairs.has(key(row)));
};
const projectedPairs=new WeakMap<object,BremenDemandComponent[]>();
const pairRows=(value:unknown):BremenDemandComponent[]=>{
 if(value&&typeof value==='object'){const previous=projectedPairs.get(value);if(previous)return previous;}
 const result:BremenDemandComponent[]=[];
 function visit(value:unknown){if(!value||typeof value!=='object')return;const row=value as Record<string,unknown>;if(typeof row.objectId==='string'&&typeof row.partId==='string')result.push({objectId:row.objectId,partId:row.partId});for(const child of Object.values(row))visit(child);}
 visit(value);if(value&&typeof value==='object')projectedPairs.set(value,result);return result;
};
export function bremenDemandSourceAuthority(alias:'oldtown'|'extra4'):string|undefined{
 const value=metadata[alias]?.sourceAuthoritySHA256;
 return typeof value==='string'?value:undefined;
}
export function bremenExtra4OwnerTargets():string[]{return metadata.extra4.models.filter((model:any)=>model.targetId!=='BR-OT-B06C').map((model:any)=>model.targetId);}

/** Model demand is a conservative prerequisite, never a positive validation.
 * A selected canonical JSON resource remains an indivisible complete input.
 */
export function bremenRecipeDemand(module:string,name:string,components:readonly BremenDemandComponent[],args?:readonly unknown[]):boolean{
 if(bremenIdentityIsPure(name))return false;
 const batch=activeBatch?.components===components?activeBatch:{components,buckets:new Map(),decisions:new Map()};
 const decisionKey=module+'|'+name;
 if(!args&&batch.decisions.has(decisionKey))return batch.decisions.get(decisionKey)!;
 const input=bucket(batch,module,name);
 const result=recipeDemand(module,name,components,input,args);
 if(!args)batch.decisions.set(decisionKey,result);return result;
}
function recipeDemand(module:string,name:string,components:readonly BremenDemandComponent[],input:Bucket,args?:readonly unknown[]):boolean{
 const rows=input.rows;
 // These original algorithms can create DISPLAY from native inputs not present
 // in the public derived-identity projection. Missing dependency metadata must
 // remain conservative until the exact source-bound fields are supplied.
 if(module==='bremen-oldtown70-runtime'&&name==='infillBremenOldtown70Reconstruction'){
  const models=metadata.oldtown.models;
  if(models.some((model:any)=>model.geometryReadyForPreview===undefined||model.targetId===undefined))return components.length>0;
  const selected=Array.isArray(args?.[1])?args[1] as readonly string[]:undefined;
  return models.some((model:any)=>model.geometryReadyForPreview&&(!selected||selected.includes(model.targetId))&&(!args||!model.sourceBinding.nativeParentAbsent||args[2]===metadata.oldtown.sourceAuthoritySHA256)&&(model.requiredNativeGroup.length===0?(args!==undefined||components.length>0):intersects(pairRows(model),input)));
 }
 if(!rows.length)return false;
 if(module==='infill-f288-original'&&name==='infillF288OriginalReconstruction')return rows.some(c=>typeof c.objectId==='string'&&typeof c.partId==='string'&&bremenIdentityMatches('infillF288OriginalIdentity',{objectId:c.objectId,partId:c.partId}));
 if(module==='bremen-oldtown-repairs-runtime'&&name==='infillBremenOldtownRepairsReconstruction'){
  const selected=Array.isArray(args?.[1])?args[1] as readonly string[]:undefined;
  return metadata.repairs.models.some((model:any)=>(!selected||selected.includes(model.targetId))&&intersects(model.requiredNativeGroup,input));
 }
 if(module==='bremen-oldtown-extra4-runtime'&&name==='infillBremenOldtownExtra4Reconstruction'){
  const selected=Array.isArray(args?.[1])?args[1] as readonly string[]:undefined;
  return metadata.extra4.models.some((model:any)=>(!selected||selected.includes(model.targetId))&&intersects(pairRows(model),input));
 }
 if(module==='kunsthalle70-runtime'&&name==='bremenKunsthalle70Reconstruction'){
  const required=metadata.kunsthalle.requiredNativeGroup;
  return !required||required.length===0||intersects(required,input);
 }
 if(module==='f260-accepted-restore-runtime'&&['appendF260AcceptedRestore','f260AcceptedRestoreBaseMaterials','f260AcceptedRestoreGroupCertificate'].includes(name)){
  const models=metadata.f260.models;
  if(models.some((model:any)=>!model.sourceCarrier))return true;
  return intersects(pairRows(models),input);
 }
 if(module==='hbf-court-runtime'||module==='ws-back-detail-runtime'){
  const value=metadata[module==='hbf-court-runtime'?'hbf':'wsBack'];
  if(!value.models)return true;
  return intersects(pairRows(value),input);
 }
 const candidates=BREMEN_IDENTITY_CANDIDATES[module];
 if(!candidates)return true;
 // Same-object/wrong-part originally enters collision/cohort checks in these
 // reconstructions. Do not turn those validation errors into an early no-op.
 const objectOnly=name.includes('Reconstruction')&&(module.startsWith('owner-f')||module==='infill-stuttgart-jubilaeumssaeule');
 return intersects(candidates,input,objectOnly);
}

/** Object admission shards must cover all members of an applicable immutable
 * owner cohort before any scope-local admission map is constructed. This is a
 * metadata closure only: it never loads or validates a geometry model. */
export function bremenProgressiveObjectDemand(components:readonly BremenDemandComponent[]):string[]{
 const objects=new Set(components.flatMap(c=>typeof c.city==='string'&&typeof c.objectId==='string'?[c.city+'|'+c.objectId]:[]));
 if(!components.some(c=>c.city==='bremen'))return [...objects];
 const cohorts:{rows:readonly BremenDemandComponent[];global:boolean}[]=[];
 const add=(value:any,global=false)=>{const rows=pairRows(value);if(rows.length)cohorts.push({rows,global});};
 for(const[alias,value]of Object.entries(metadata)){
  if(alias==='certificateLedger'||!value||typeof value!=='object')continue;
  if(Array.isArray(value.groups)){for(const group of value.groups)add(group);continue;}
  if(Array.isArray(value.models)){
   if(value.sourceCarrier)add(value);
   else for(const model of value.models)add(model,alias==='oldtown'&&Array.isArray(model.requiredNativeGroup)&&model.requiredNativeGroup.length===0&&model.geometryReadyForPreview!==false);
   continue;
  }
  add(value);
 }
 let changed=true;
 while(changed){changed=false;for(const cohort of cohorts){
  if(!cohort.global&&!cohort.rows.some(row=>typeof row.objectId==='string'&&objects.has('bremen|'+row.objectId)))continue;
  for(const row of cohort.rows){if(typeof row.objectId!=='string')continue;const key='bremen|'+row.objectId;if(!objects.has(key)){objects.add(key);changed=true;}}
 }}
 return [...objects];
}
