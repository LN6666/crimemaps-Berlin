import {BREMEN_DEMAND_METADATA} from './bremen-demand-metadata';
import {bremenRepairsResourceTargets,prepareBremenRepairsTargets} from './repairs-data';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{bremenCertificateCandidate,bremenCertificateIdentityCandidate}from'./bremen-identity-metadata';
import{planBremenCertificateGroups,certificateGroupKeysForIdentity,type BremenCertificatePlan}from'./bremen-certificate-group-ledger';
export{certificateGroupKeysForIdentity,certificateGroupKeysForModule}from'./bremen-certificate-group-ledger';
import{lloydFrontHeldSourceRule,lloydFrontWholeDisplayCertificate,LLOYD_FRONT_SCOPE_RESOURCES}from'./lloyd-front-runtime';
import{marketCapWholeDisplayCertificate,MARKET_CAP_SCOPE_RESOURCES}from'./market-cap-runtime';
import{organistenHeldSourceRule,organistenWholeDisplayCertificate,ORGANISTEN_SCOPE_RESOURCES}from'./organisten-runtime';
import{glockeKuesterWholeDisplayCertificate,GLOCKE_KUESTER_SCOPE_RESOURCES}from'./glocke-kuester-runtime';
import{getBOUNDARY70_DATA,BOUNDARY70_DATA_RESOURCE,BOUNDARY70_SHA}from'./boundary-data';
import{getEDGE_COVERAGE_DATA,EDGE_COVERAGE_DATA_RESOURCE,EDGE_COVERAGE_SHA}from'./edge-coverage-data';
import{getGLOCKE_DETAIL_DATA,GLOCKE_DETAIL_DATA_RESOURCE,GLOCKE_DETAIL_SHA}from'./glocke-detail-data';
import{getEDGEFILL70_DATA,EDGEFILL70_DATA_RESOURCE,EDGEFILL70_SHA}from'./edgefill70-data';
import{EDGE70_SHA as AG_SHA,EDGE70_RESOURCE}from'./bremen-ag70-metadata';
import{getKARSTADT70_DATA,KARSTADT70_DATA_RESOURCE,KARSTADT70_SHA}from'./karstadt-data';
import{getBREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS,BREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS_RESOURCE}from'./bremen-extra-held-source-snapshots';
import type{BuildingComponent,Identity}from"../../../safety/building-mesh-types";
import{nativePaintSignature}from'./progressive-native-signature';
import{getBREMEN_OLDTOWN70_DATA,BREMEN_OLDTOWN70_DATA_RESOURCE,BREMEN_OLDTOWN70_SHA}from'./oldtown70-data';
import{getBREMEN_MARKET_HELD_SOURCE_SNAPSHOTS,BREMEN_MARKET_HELD_SOURCE_SNAPSHOTS_RESOURCE}from'./bremen-market-held-source-snapshots';
import{serializeBremenFiniteDerivedReadback,BREMEN_FINITE_DERIVED_DISPLAY_SCOPE_RESOURCES}from'./bremen-finite-derived-display';
import{getWASSERTURM70_DATA,WASSERTURM70_DATA_RESOURCE,WASSERTURM70_SHA}from'./wasserturm70-data';
import{getBREMEN_OLDTOWN_REPAIRS_DATA,BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE,BREMEN_OLDTOWN_REPAIRS_SHA}from'./repairs-data';
import{getBREMEN_REPAIR_SOURCE_SNAPSHOTS,BREMEN_REPAIR_SOURCE_SNAPSHOTS_RESOURCE}from'./bremen-held-source-snapshots';
import{getBREMEN_ADDITIONAL_HELD_SOURCE_SNAPSHOTS,BREMEN_ADDITIONAL_HELD_SOURCE_SNAPSHOTS_RESOURCE}from'./bremen-additional-held-source-snapshots';
import{getBREMEN_OLDTOWN_CHURCHES_DATA,BREMEN_OLDTOWN_CHURCHES_DATA_RESOURCE,BREMEN_OLDTOWN_CHURCHES_SHA}from'./churches-data';
import{getWS70_DATA,WS70_DATA_RESOURCE,WS70_SHA}from'./ws70-data';
import{getFLEMINGS70_DATA,FLEMINGS70_DATA_RESOURCE,FLEMINGS70_SHA}from'./flemings70-data';
import{getRADSTATION70_DATA,RADSTATION70_DATA_RESOURCE,RADSTATION70_SHA}from'./radstation70-data';
const key=(x:Identity)=>x.objectId+'|'+x.partId;
function sameArray(a:ArrayLike<number>,b:ArrayLike<number>,float32Expected=false):boolean{if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!Object.is(a[i],float32Expected?Math.fround(b[i]):b[i]))return false;return true;}
const same=(a:any,b:any):boolean=>Array.isArray(a)||ArrayBuffer.isView(a)?(Array.isArray(b)||ArrayBuffer.isView(b))&&sameArray(a as ArrayLike<number>,b as ArrayLike<number>):JSON.stringify(a)===JSON.stringify(b);
const nativeLittleEndian=new Uint8Array(new Uint32Array([0x01020304]).buffer)[0]===4;
/** The decoded source owns one binary buffer, with no intermediate Number[]. */
function restore(s:string,uint=false){const raw=atob(s);if(raw.length%4)throw Error('Invalid Bremen certificate source array byte length');const values=uint?new Uint32Array(raw.length/4):new Float32Array(raw.length/4),bytes=new Uint8Array(values.buffer);for(let i=0;i<raw.length;i++)bytes[nativeLittleEndian?i:i^3]=raw.charCodeAt(i);return values;}
// Explicit legacy preparation retains the complete 132 held SOURCE / 19 parent
// unit. Ordinary batches use the verified group ledger and select only their
// dependency union, preserving each initializer file, occurrence and codec.
export const BREMEN_HELD_SOURCE_CERTIFICATES_SCOPE_RESOURCES=[
 BOUNDARY70_DATA_RESOURCE,
 EDGE_COVERAGE_DATA_RESOURCE,
 GLOCKE_DETAIL_DATA_RESOURCE,
 EDGEFILL70_DATA_RESOURCE,
 KARSTADT70_DATA_RESOURCE,
 BREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS_RESOURCE,
 BREMEN_OLDTOWN70_DATA_RESOURCE,
 BREMEN_MARKET_HELD_SOURCE_SNAPSHOTS_RESOURCE,
 WASSERTURM70_DATA_RESOURCE,
 BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE,
 BREMEN_REPAIR_SOURCE_SNAPSHOTS_RESOURCE,
 BREMEN_ADDITIONAL_HELD_SOURCE_SNAPSHOTS_RESOURCE,
 BREMEN_OLDTOWN_CHURCHES_DATA_RESOURCE,
 WS70_DATA_RESOURCE,
 FLEMINGS70_DATA_RESOURCE,
 RADSTATION70_DATA_RESOURCE,
 EDGE70_RESOURCE,...LLOYD_FRONT_SCOPE_RESOURCES,...MARKET_CAP_SCOPE_RESOURCES,
 ...ORGANISTEN_SCOPE_RESOURCES,...GLOCKE_KUESTER_SCOPE_RESOURCES,
 ...BREMEN_FINITE_DERIVED_DISPLAY_SCOPE_RESOURCES,
]as const;
type Preparation={force:boolean;keys:readonly string[];ready:Set<string>;complete:boolean;plan?:BremenCertificatePlan};
const preparations=new WeakMap<FrozenDataScope,Preparation>();
export function hasPreparedBremenCertificateUnion(scope:FrozenDataScope){const state=preparations.get(scope);return!!state?.complete&&!scope.stats.disposed;}
export function hasPreparedBremenCertificateGroup(scope:FrozenDataScope,groupKey:string){const state=preparations.get(scope);return!!state?.complete&&state.ready.has(groupKey)&&!scope.stats.disposed;}
export async function prepareBremenHeldSourceCertificates(scope:FrozenDataScope,components:readonly BuildingComponent[],signal:AbortSignal,force=false){
 signal.throwIfAborted();
 if(!force&&!bremenCertificateCandidate(components))return;
 const plan=force?undefined:planBremenCertificateGroups(components);if(!force&&!plan)return;
 const keys=plan?.groups.map(group=>group.key)??['legacy:complete'];
 const previous=preparations.get(scope);if(previous){if(previous.force!==force||JSON.stringify(previous.keys)!==JSON.stringify(keys))throw Error('Bremen certificate scope union was already fixed');if(previous.complete)return;}
 const state:Preparation=previous??{force,keys,ready:new Set(),complete:false,plan};preparations.set(scope,state);
 const resources=plan?.resources??BREMEN_HELD_SOURCE_CERTIFICATES_SCOPE_RESOURCES;
 const repairs=resources.some(ref=>ref.canonicalSHA256===BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE.canonicalSHA256&&ref.file===BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE.file);
 await scope.prepare(resources.filter(ref=>ref.canonicalSHA256!==BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE.canonicalSHA256||ref.file!==BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE.file),signal);
 if(repairs)await prepareBremenRepairsTargets(force?BREMEN_DEMAND_METADATA.repairs.models.map((model:any)=>model.targetId):bremenRepairsResourceTargets(components),signal,scope);
 signal.throwIfAborted();
 if(plan){
  // Settle independent snapshot/ownership construction before the graph's
  // envelope. A cache hit inside buildCertificates still propagates the memo's
  // source parents; it does not need another whole-scope temporary reservation.
  sourceSnapshots(scope,plan);signal.throwIfAborted();ownedSnapshots(scope);signal.throwIfAborted();
  scope.memo(certificatesKey,()=>buildCertificates(undefined,scope,plan));signal.throwIfAborted();for(const group of plan.groups)state.ready.add(group.key);state.complete=true;
 }
}
const snapshotsKey={},certificatesKey={},ownedSnapshotsKey={};
function ownedSnapshots(scope:FrozenDataScope):WeakSet<object>{return scope.memo(ownedSnapshotsKey,()=>new WeakSet<object>());}
function verifySelectedGraph(plan:BremenCertificatePlan,held:any[],parents:any[]){
 const expectedHeld:any[]=[],expectedParents:any[]=[];
 for(const group of plan.groups){for(const[type,rows]of [['held',group.held],['parents',group.parents]]as const){const target=type==='held'?expectedHeld:expectedParents;for(const row of rows){const previous=target.findIndex(r=>key(r.identity)===key(row.identity));if(group.alias==='coverage'&&previous>=0)target[previous]=row;else target.push(row);}}}
 if(held.length!==expectedHeld.length||parents.length!==expectedParents.length||new Set(held.map(r=>key(r.identity))).size!==held.length||new Set(parents.map(r=>key(r.identity))).size!==parents.length)throw Error('Bremen selected certificate group count mismatch');
 const name=(groupKey:string)=>plan.groups.find(group=>group.key===groupKey)?.name;
 for(const[rowIndex,row]of held.entries()){const expected=expectedHeld[rowIndex];if(!row.source||!row.identity.leafSHA256||key(row.identity)!==key(expected.identity)||key(row.parent)!==key(expected.parent)||row.identity.leafSHA256!==expected.leafSHA256||(row.parentSourceAbsent===true)!==(expected.parentSourceAbsent===true)||row.group!==name(expected.groupKey))throw Error('Bremen selected certificate held binding mismatch');}
 for(const[rowIndex,row]of parents.entries()){const expected=expectedParents[rowIndex];if(key(row.identity)!==key(expected.identity)||(row.parentSourceAbsent===true)!==(expected.parentSourceAbsent===true)||row.group!==name(expected.groupKey))throw Error('Bremen selected certificate parent binding mismatch');}
}
function requireScope(scope:FrozenDataScope|undefined):FrozenDataScope{
 if(!scope)throw Error('Bremen held SOURCE certificates require a prepared frozen data scope');
 return scope;
}
function sourceSnapshots(scope:FrozenDataScope,plan?:BremenCertificatePlan){return scope.memo(snapshotsKey,()=>{
 if(plan){const readers:Record<string,()=>any[]>={repairSnapshots:()=>getBREMEN_REPAIR_SOURCE_SNAPSHOTS(scope),churchSnapshots:()=>getBREMEN_ADDITIONAL_HELD_SOURCE_SNAPSHOTS(scope),marketSnapshots:()=>getBREMEN_MARKET_HELD_SOURCE_SNAPSHOTS(scope),extraSnapshots:()=>getBREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS(scope)};const slots=[...new Map(plan.groups.flatMap(group=>group.snapshotSlots).map(slot=>[slot.alias+':'+slot.rowIndex,slot])).values()].sort((a,b)=>a.priority-b.priority||a.rowIndex-b.rowIndex);return slots.map(slot=>{const s=readers[slot.alias]?.()[slot.rowIndex];if(!s||key(s)!==key(slot.identity))throw Error('Bremen certificate snapshot binding mismatch');return{...s,batches:s.batches.map((b:any)=>({...b,...(b._nativeArraysBase64?{positions:restore(b._nativeArraysBase64.positions),normals:restore(b._nativeArraysBase64.normals),indices:restore(b._nativeArraysBase64.indices,true)}:{})}))};});}
 const REPAIR_SNAP=getBREMEN_REPAIR_SOURCE_SNAPSHOTS(scope),CHURCH_SNAP=getBREMEN_ADDITIONAL_HELD_SOURCE_SNAPSHOTS(scope),MARKET_SNAP=getBREMEN_MARKET_HELD_SOURCE_SNAPSHOTS(scope),EXTRA_SNAP=getBREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS(scope);
 return [...REPAIR_SNAP,...CHURCH_SNAP,...MARKET_SNAP,...EXTRA_SNAP].map(s=>({...s,batches:s.batches.map((b:any)=>({...b,...(b._nativeArraysBase64?{positions:restore(b._nativeArraysBase64.positions),normals:restore(b._nativeArraysBase64.normals),indices:restore(b._nativeArraysBase64.indices,true)}:{})}))}));

});}
function buildCertificates(agData:any,scope:FrozenDataScope,plan?:BremenCertificatePlan){
 const selected=(alias:string,index?:number,parent?:Identity)=>!plan||plan.groups.some(group=>group.kind==='core'&&group.alias===alias&&(index===undefined||group.modelIndex===index)&&(!parent||group.parents.some(p=>key(p.identity)===key(parent))));
 const read=<T>(alias:string,get:()=>T):T|undefined=>!plan||plan.groups.some(group=>group.resourceAliases.includes(alias))?get():undefined;
 const BOUNDARY=read('boundary',()=>getBOUNDARY70_DATA(scope)),COVER=read('coverage',()=>getEDGE_COVERAGE_DATA(scope)),GLOCKE=read('glocke',()=>getGLOCKE_DETAIL_DATA(scope)),EDGE=read('edgefill',()=>getEDGEFILL70_DATA(scope)),KAR=read('karstadt',()=>getKARSTADT70_DATA(scope)),MARKET=read('oldtown',()=>getBREMEN_OLDTOWN70_DATA(scope)),W=read('wasserturm',()=>getWASSERTURM70_DATA(scope)),R=read('repairs',()=>getBREMEN_OLDTOWN_REPAIRS_DATA(scope)),CH=read('churches',()=>getBREMEN_OLDTOWN_CHURCHES_DATA(scope)),WS=read('ws',()=>getWS70_DATA(scope)),FL=read('flemings',()=>getFLEMINGS70_DATA(scope)),RD=read('radstation',()=>getRADSTATION70_DATA(scope)),snapshots=sourceSnapshots(scope,plan);
 if(plan&&selected('AG70'))agData=scope.borrow<any,any>(EDGE70_RESOURCE,value=>value);
const owned=ownedSnapshots(scope),marketAuthority=plan?.ledger.marketAuthoritySHA256??MARKET?.sourceAuthoritySHA256;
const delegate=(alias:string,c:Identity)=>!plan||plan.groups.some(group=>group.kind==='delegate'&&group.alias===alias&&group.candidates.some(row=>key(row)===key(c)));
let disposed=false;
function assertActive(){if(disposed)throw Error('Bremen held SOURCE certificate scope disposed');}
const held:any[]=[],parents:any[]=[];
function addGroup(id:string,models:any[],carrier:Identity,sha:string,marker:string,patchField='patchSHA256',float32Display=false){const p=models.find(m=>key(m.identity)===key(carrier));if(!p)throw Error('Finite Bremen whole-parent model missing');const children=models.filter(m=>key(m.identity)!==key(carrier));if(!children.length)return;const parent={...p,parent:carrier,patchSHA256:sha,marker,patchField,float32Display,group:id};parents.push(parent);for(const m of children)held.push({...m,parent:carrier,patchSHA256:sha,group:id});}
if(W&&selected('wasserturm'))addGroup('bremen-wasserturm70',W.models,W.sourceCarrier,WASSERTURM70_SHA,'bremenWasserturm70','patchSHA256',true);
for(const m of(R?.models??[])){const mi=BREMEN_DEMAND_METADATA.repairs.models.findIndex((model:any)=>model.targetId===m.targetId);if(mi<0)throw Error('Unknown Bremen repairs target');if(!selected('repairs',mi))continue;const models=m.requiredNativeGroup.map((r:any)=>({identity:{...r,leafSHA256:r.sourceLeafSHA256},source:snapshots.find(s=>key(s)===key(r)),display:m.displays.find((d:any)=>key(d)===key(r))?.batches??[],displayOrigin:m.displays.find((d:any)=>key(d)===key(r))?.origin}));addGroup(m.targetId,models,m.displays[0],BREMEN_OLDTOWN_REPAIRS_SHA,'infillBremenOldtownRepairs');}
for(const[mi,m]of(CH?.models??[]).entries()){if(!selected('churches',mi))continue;const models=m.requiredNativeGroup.map((r:any)=>({identity:{...r,leafSHA256:r.sourceLeafSHA256??snapshots.find(s=>key(s)===key(r))?.sourceLeafSHA256},source:snapshots.find(s=>key(s)===key(r)),display:m.displays.find((d:any)=>key(d)===key(r))?.batches??[],displayOrigin:m.displays.find((d:any)=>key(d)===key(r))?.origin}));addGroup(m.targetId,models,m.displays[0],BREMEN_OLDTOWN_CHURCHES_SHA,'infillBremenOldtownChurches');}
for(const[gi,g]of(WS?.groups??[]).entries())if(selected('ws',gi))addGroup(g.id,g.models,g.sourceCarrier,WS70_SHA,'ws70','patchSHA',false);
if(FL&&selected('flemings'))addGroup('bremen-flemings70',FL.models,FL.sourceCarrier,FLEMINGS70_SHA,'bremenFlemings70','patchSHA256',true);
if(RD&&selected('radstation'))addGroup('bremen-radstation70',RD.models,RD.sourceCarrier,RADSTATION70_SHA,'bremenRadstation70','patchSHA256',true);
for(const[mi,m]of(MARKET?.models??[]).entries()){if(!selected('oldtown',mi))continue;const carrier=m.displays[0],children=m.requiredNativeGroup.filter((r:any)=>!m.displays.some((d:any)=>key(d)===key(r)));if(!children.length)continue;const pin=m.sourceBinding.exactNativeComponents;const models=m.requiredNativeGroup.map((r:any)=>({identity:{...r,leafSHA256:pin.find((p:any)=>key(p)===key(r))?.sourceLeafSHA256},source:snapshots.find(s=>key(s)===key(r)),display:m.displays.find((d:any)=>key(d)===key(r))?.batches??[],displayOrigin:m.displays.find((d:any)=>key(d)===key(r))?.origin}));
 if(m.sourceBinding.nativeParentAbsent){const parent={identity:carrier,parent:carrier,parentSourceAbsent:true,display:carrier.batches,displayOrigin:carrier.origin,source:{componentGeometry:m.componentGeometry,sourceFeature:m.sourceFeature},patchSHA256:BREMEN_OLDTOWN70_SHA,marker:'infillBremenOldtown70',patchField:'patchSHA256',group:m.targetId};parents.push(parent);for(const r of models)held.push({...r,parent:carrier,parentSourceAbsent:true,patchSHA256:BREMEN_OLDTOWN70_SHA,group:m.targetId});}
 else addGroup(m.targetId,models,carrier,BREMEN_OLDTOWN70_SHA,'infillBremenOldtown70');}
for(const[gi,g]of(EDGE?.groups??[]).entries()){if(!selected('edgefill',gi))continue;if(!g.models.some((m:any)=>!m.display.length))continue;addGroup(g.key,g.models,g.models.find((m:any)=>m.display.length).identity,EDGEFILL70_SHA,'bremenEdgefill70','patchSHA256',true);}
for(const [data,sha,marker,alias]of [[agData,AG_SHA,'edgeAg70','AG70'],[KAR,KARSTADT70_SHA,'karstadt70','karstadt']]as const)for(const[mi,m]of(data?.models??[]).entries()){if(!selected(alias,mi))continue;const models=m.requiredNativeGroup.map((r:any)=>({identity:{...r,leafSHA256:r.sourceLeafSHA256},source:snapshots.find(s=>key(s)===key(r)),display:m.displays.find((d:any)=>key(d)===key(r))?.batches??[],displayOrigin:m.displays.find((d:any)=>key(d)===key(r))?.origin}));addGroup(m.targetId,models,m.displays[0],sha,marker);}
if(GLOCKE&&selected('glocke'))addGroup('glocke-detail',GLOCKE.models,GLOCKE.sourceCarrier,GLOCKE_DETAIL_SHA,'bremenGlockeDetail','patchSHA256',true);
for(const[gi,g]of(COVER?.groups??[]).entries())for(const m of g.models.filter((m:any)=>!m.display.length&&selected('coverage',gi,m.sourceCarrier))){const p=g.models.find((p:any)=>key(p.identity)===key(m.sourceCarrier));if(!p)throw Error('Coverage held parent missing');const pr={...p,parent:p.identity,patchSHA256:EDGE_COVERAGE_SHA,marker:'edgeCoverage',patchField:'patchSHA256',float32Display:true,group:g.key};const pi=parents.findIndex(r=>key(r.identity)===key(p.identity));if(pi<0)parents.push(pr);else parents[pi]=pr;const child={...m,parent:p.identity,patchSHA256:EDGE_COVERAGE_SHA,group:g.key};const ci=held.findIndex(r=>key(r.identity)===key(m.identity));if(ci<0)held.push(child);else held[ci]=child;}
for(const[mi,m]of(BOUNDARY?.models??[]).entries()){if(!selected('boundary',mi))continue;const models=m.requiredNativeGroup.map((r:any)=>({identity:{...r,leafSHA256:r.sourceLeafSHA256},source:m.nativeSourceComponents.find((c:any)=>key(c)===key(r)),display:m.displays.find((d:any)=>key(d)===key(r))?.batches??[],displayOrigin:m.displays.find((d:any)=>key(d)===key(r))?.origin}));addGroup(m.targetId,models,m.displays[0],BOUNDARY70_SHA,'boundary70');}
if(plan)verifySelectedGraph(plan,held,parents);else if(held.length!==132||parents.length!==19||new Set(held.map(r=>key(r.identity))).size!==132||new Set(parents.map(r=>key(r.identity))).size!==19||held.some(r=>!r.source||!r.identity.leafSHA256))throw Error('Finite Bremen held SOURCE scope132/parents19 mismatch');
const bremenHeldSourceRule=(x:Identity)=>{assertActive();if(!bremenCertificateIdentityCandidate(x))return undefined;return(delegate('lloyd',x)?lloydFrontHeldSourceRule(x,scope):undefined)??(delegate('organisten',x)?organistenHeldSourceRule(x,scope):undefined)??held.find(r=>key(r.identity)===key(x));};
const arrays=(c:BuildingComponent)=>c.batches.map(b=>({positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices),color:Array.from(b.color)}));
function unchanged(c:BuildingComponent|undefined,r:any,leaf:((c:BuildingComponent)=>string|undefined)|undefined){const s=r?.source;return !!c&&c.city==='bremen'&&!!s&&key(c)===key(r.identity)&&!!leaf&&leaf(c)===r.identity.leafSHA256&&nativePaintSignature(c)===r.identity.signature&&['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],s[k]))&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>(['positions','normals','indices','color']as const).every(k=>same(b[k],s.batches[bi][k])));}
/** Finite132 exact held native SOURCE identities; each independent whole parent is proven separately. */
function serializeBremenHeldSourceReadback(c:BuildingComponent|undefined,leaf:((c:BuildingComponent)=>string|undefined)|undefined,generation:number){assertActive();if(!c||c.city!=='bremen'||!bremenCertificateIdentityCandidate(c))return null;const r=bremenHeldSourceRule(c);if(!r)return null;if(!Number.isSafeInteger(generation)||!unchanged(c,r,leaf))throw Error('Finite Bremen held SOURCE certificate mismatch');const result={certificateKind:'bremen-held-native-source-v1',objectId:c.objectId,partId:c.partId,generation,sourceOnly:true,sourceNativeMeshPresent:true,sourceRetained:true,sourceLeafSHA256:r.identity.leafSHA256,sourceSignature:r.identity.signature,requiredWholeDisplayParent:structuredClone(r.parent),wholeDisplayParentSourceAbsent:r.parentSourceAbsent===true,patchSHA256:r.patchSHA256,origin:Array.from(c.origin),sourceFeature:c.sourceFeature,componentGeometry:c.componentGeometry,batches:arrays(c),actualVisualAccepted:false};if(r.patchSHA256===AG_SHA){Object.assign(result,structuredClone({sourceFeature:result.sourceFeature,componentGeometry:result.componentGeometry}));owned.add(result);}return result;}
function serializeBremenWholeDisplayCertificate(c:(BuildingComponent&{generation?:number})|undefined,generation:number,originalSource:BuildingComponent|undefined,leaf:((c:BuildingComponent)=>string|undefined)|undefined){
 assertActive();
 if(!c||!bremenCertificateIdentityCandidate(c))return null;
 const lloyd014=delegate('lloyd',c)?lloydFrontWholeDisplayCertificate(c,generation,originalSource,leaf,scope):undefined;if(lloyd014)return lloyd014;
 const cap013=delegate('market',c)?marketCapWholeDisplayCertificate(c,generation,originalSource,leaf,marketAuthority,scope):undefined;if(cap013)return cap013;
 const org013=delegate('organisten',c)?organistenWholeDisplayCertificate(c,generation,originalSource,leaf,scope):undefined;if(org013)return org013;
 const replacement012=delegate('kuester',c)?glockeKuesterWholeDisplayCertificate(c,generation,originalSource,leaf,scope):undefined;if(replacement012)return replacement012;
 if(!c||c.city!=='bremen'||c.generation!==generation||!Number.isSafeInteger(generation))return null;const r=parents.find(r=>key(r.identity)===key(c));if(!r)return null;if(r.parentSourceAbsent){if(originalSource!==undefined)throw Error('Finite Bremen derived whole parent acquired native SOURCE');const derived=serializeBremenFiniteDerivedReadback(c,true,scope);if(!derived||derived.generation!==generation||derived.patchSHA256!==r.patchSHA256)throw Error('Finite Bremen derived whole parent certificate mismatch');return{certificateKind:'bremen-whole-derived-display-v1',objectId:c.objectId,partId:c.partId,generation,patchSHA256:r.patchSHA256,sourceAbsent:true,nativeGetterCount:0,sourceRetained:true,derivedCertificate:derived,batches:arrays(c),actualVisualAccepted:false};}if(!unchanged(originalSource,r,leaf))throw Error('Finite Bremen whole DISPLAY original SOURCE certificate mismatch');
 const displayOrigin=r.displayOrigin??r.source.origin,marker=c.displayEstimates?.[r.marker] as any;if(marker?.[r.patchField]!==r.patchSHA256||!same(c.origin,displayOrigin)||!same(c.componentGeometry,r.source.componentGeometry)||!same(c.sourceFeature,r.source.sourceFeature)||c.batches.length!==r.display.length||!c.batches.every((b,bi)=>(['positions','normals','indices']as const).every(k=>sameArray(b[k],r.display[bi][k],r.float32Display&&k!=='indices'))))throw Error('Finite Bremen whole owner DISPLAY certificate mismatch');
 const result={certificateKind:'bremen-whole-owner-display-v1',objectId:c.objectId,partId:c.partId,generation,patchSHA256:r.patchSHA256,sourceRetained:true,originalSourceSignature:r.identity.signature,originalSourceLeafSHA256:r.identity.leafSHA256,originalSourceRetained:true,displayVertices:c.batches.reduce((n,b)=>n+b.positions.length/3,0),displayTriangles:c.batches.reduce((n,b)=>n+b.indices.length/3,0),batches:arrays(c),actualVisualAccepted:false};if(r.patchSHA256===AG_SHA)owned.add(result);return result;
}
function dispose(){if(disposed)return;disposed=true;held.length=0;parents.length=0;}
return{bremenHeldSourceRule,serializeBremenHeldSourceReadback,serializeBremenWholeDisplayCertificate,dispose};
}

type Certificates=ReturnType<typeof buildCertificates>;
// Handles retain only the scope, never the memoized graph. A released scope
// therefore drops decoded SOURCE and graph arrays even if a caller keeps a
// disposed handle. A different live handle in the same scope remains valid.
function certificateHandle(scope:FrozenDataScope){
 let disposed=false;
 const owned=ownedSnapshots(scope);
 function assertActive(){if(disposed)throw Error('Bremen held SOURCE certificate scope disposed');if(scope.stats.disposed)throw new DOMException('Frozen data scope was released','AbortError');}
 function current():Certificates{
  assertActive();
  return scope.memo<Certificates>(certificatesKey,()=>{throw Error('Bremen held SOURCE certificates were not prepared');});
 }
 return{
  ownsSnapshot(value:unknown){return!!value&&typeof value==='object'&&owned.has(value);},
  bremenHeldSourceRule(...args:Parameters<Certificates['bremenHeldSourceRule']>){assertActive();if(!bremenCertificateIdentityCandidate(args[0]))return undefined;requireReady(args[0]);return current().bremenHeldSourceRule(...args);},
  serializeBremenHeldSourceReadback(...args:Parameters<Certificates['serializeBremenHeldSourceReadback']>){assertActive();if(!args[0]||!bremenCertificateIdentityCandidate(args[0]))return null;requireReady(args[0]);return current().serializeBremenHeldSourceReadback(...args);},
  serializeBremenWholeDisplayCertificate(...args:Parameters<Certificates['serializeBremenWholeDisplayCertificate']>){assertActive();if(!args[0]||!bremenCertificateIdentityCandidate(args[0]))return null;requireReady(args[0]);return current().serializeBremenWholeDisplayCertificate(...args);},
  dispose(){disposed=true;},
 };
 function requireReady(c:Identity){const state=preparations.get(scope);if(!state?.force&&certificateGroupKeysForIdentity(c).some(group=>!hasPreparedBremenCertificateGroup(scope,group)))throw Error('Bremen certificate identity group was not prepared');}
}
/** AG70 input remains injected; all legacy DATA and decoded SOURCE are batch-local. */
export function createBremenHeldSourceCertificates(agData:any,scope?:FrozenDataScope){
 const owner=requireScope(scope);
 const state=preparations.get(owner);
 if(state&&!state.force){if(!state.complete)throw Error('Bremen certificate groups were not prepared');return certificateHandle(owner);}
 sourceSnapshots(owner);ownedSnapshots(owner);
 owner.memo(certificatesKey,()=>buildCertificates(agData??owner.borrow<any,any>(EDGE70_RESOURCE,value=>value),owner));
 if(state){state.complete=true;for(const name of state.keys)state.ready.add(name);}
 return certificateHandle(owner);
}
