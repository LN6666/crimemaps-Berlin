import * as localC121 from './infill-c121-original-runtime';
import * as infillRoutes from '../../infill/safety/bremen-infill-owner-routes';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import {bremenIdentityIsPure,bremenIdentityMatches} from './bremen-identity-metadata';
import {bremenRecipeDemand,bremenDemandSourceAuthority,withBremenRecipeDemand,type BremenDemandComponent} from './bremen-recipe-demand';
import * as m0 from './facade-paint-frame';
import * as m1 from './s020-relation-outline-display';
import * as m2 from './source-partial-gate-display';
import * as m3 from './owner-f018-completion';
import * as m4 from './owner-f077-completion';
import * as m5 from './owner-f081-completion';
import * as m6 from './owner-f088-completion';
import * as m7 from './owner-f116-completion';
import * as m8 from './owner-f122-completion';
import * as m9 from './owner-f126-completion';
import * as m10 from './owner-f128-completion';
import * as m11 from './owner-f131-completion';
import * as m12 from './f058-upper-paint312';
import * as m13 from './infill-frankfurt-eurotower';
import * as m14 from './infill-essen-rathaus-galerie';
import * as m15 from './infill-f288-original';
import * as m16 from './infill-stuttgart-jubilaeumssaeule';
import * as m17 from './progressive-paint';
import {PROGRESSIVE_ADMISSIONS_RESOURCE} from './progressive-paint-admissions';
import {BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE,prepareBremenRepairsData} from './repairs-data';
import * as m18 from './facade-paint-fragment';
import * as m19 from './bremen-accepted-cohort-residency';
import * as m20 from './bremen-finite-derived-display';
import * as m21 from './bremen-followup012-certificates';
import * as m22 from './bremen-boundary70-runtime';
import * as m23 from './bremen-churches70-runtime';
import * as m24 from './bremen-db70-runtime';
import * as m25 from './bremen-europahafenkopf70-runtime';
import * as m26 from './bremen-karstadt70-runtime';
import * as m27 from './bremen-oldtown-extra4-runtime';
import * as m28 from './bremen-oldtown-repairs-runtime';
import * as m29 from './bremen-oldtown70-runtime';
import * as m30 from './bremen-school70-runtime';
import * as m31 from './bremen-teerhof-detail-runtime';
import * as m32 from './bremen-utility70-runtime';
import * as m33 from './bremen-ws70-runtime';
import * as m34 from './edge-coverage-runtime';
import * as m35 from './edgefill70-runtime';
import * as m36 from './euro-gable-runtime';
import * as m37 from './f260-accepted-restore-runtime';
import * as m38 from './flemings70-runtime';
import * as m39 from './glocke-detail-runtime';
import * as m40 from './glocke-kuester-runtime';
import * as m41 from './hbf-court-runtime';
import * as m42 from './kunsthalle70-runtime';
import * as m43 from './lloyd-front-runtime';
import * as m44 from './market-cap-runtime';
import * as m45 from './office7a70-materials';
import * as m46 from './official-openings-runtime';
import * as m47 from './organisten-runtime';
import * as m48 from './quartier670-runtime';
import * as m49 from './radstation70-runtime';
import * as m50 from './stephani-row-runtime';
import * as m51 from './utility-official-materials';
import * as m52 from './wasserturm70-runtime';
import * as m53 from './ws-back-detail-runtime';

type Fn=(...args:any[])=>any;
type Module={MODULE_SCOPE_RESOURCES:readonly FrozenDataRef[];MODULE_SCOPE_CITIES:readonly string[];MODULE_SCOPE_ARITY:Record<string,number>;MODULE_SCOPE_METADATA_FUNCTIONS?:readonly string[];MODULE_SCOPE_DEMAND?:(name:string,components:readonly BremenDemandComponent[],args?:readonly unknown[])=>boolean;MODULE_SCOPE_RESOURCES_FOR_CITIES?:(cities:readonly string[])=>readonly FrozenDataRef[];MODULE_SCOPE_RESOURCES_FOR_COMPONENTS?:(components:readonly BremenDemandComponent[])=>readonly FrozenDataRef[]};
const modules:readonly object[]=[m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44,m45,m46,m47,m48,m49,m50,m51,m52,m53];
const calls=new Map<Fn,{module:Module;arity:number;name:string}>();
for(const original of modules){const module=original as Module;for(const[name,arity]of Object.entries(module.MODULE_SCOPE_ARITY??{})){const fn=(original as Record<string,unknown>)[name];if(typeof fn==='function')calls.set(fn as Fn,{module,arity,name});}}
const infillCalls=new Map<Fn,{name:string;arity:number}>();
for(const[name,arity]of Object.entries(infillRoutes.infillDataFunctionArities)){
 const fn=(infillRoutes as unknown as Record<string,unknown>)[name];if(typeof fn==='function')infillCalls.set(fn as Fn,{name,arity});
}
const localMaterialCalls=new Map<Fn,{arity:number;prepare:typeof localC121.prepareInfillData}>([
 [localC121.infillC121OriginalBaseMaterials,{arity:3,prepare:localC121.prepareInfillData}],
]);
export function bremenScopedCall<F extends Fn>(fn:F,args:any[],scope?:FrozenDataScope):ReturnType<F>{const local=localMaterialCalls.get(fn),infill=infillCalls.get(fn),call=local??infill??calls.get(fn);if(!call)return fn(...args);const next=local||infill?args.slice(0,call.arity):[...args];while(next.length<call.arity)next.push(undefined);return fn(...next,scope);}
export async function prepareBremenFunctions(scope:FrozenDataScope,fns:readonly Fn[],components:readonly BremenDemandComponent[],signal:AbortSignal,args?:readonly unknown[]){
 signal.throwIfAborted();
 for(const fn of fns){const local=localMaterialCalls.get(fn);if(local){await local.prepare(components as readonly import('./building-mesh-renderer').BuildingComponent[],signal,scope);continue;}const call=infillCalls.get(fn);if(call)await infillRoutes.prepareInfillDataForFunction(call.name,components as readonly import('./building-mesh-renderer').BuildingComponent[],signal,scope);}
 const resources=withBremenRecipeDemand(components,()=>selectBremenResources(fns,components,args));
 const admission=resources.some(ref=>ref.canonicalSHA256===PROGRESSIVE_ADMISSIONS_RESOURCE.canonicalSHA256&&ref.file===PROGRESSIVE_ADMISSIONS_RESOURCE.file);
 const repairs=resources.some(ref=>ref.canonicalSHA256===BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE.canonicalSHA256&&ref.file===BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE.file);
 const other=resources.filter(ref=>(ref.canonicalSHA256!==PROGRESSIVE_ADMISSIONS_RESOURCE.canonicalSHA256||ref.file!==PROGRESSIVE_ADMISSIONS_RESOURCE.file)&&(ref.canonicalSHA256!==BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE.canonicalSHA256||ref.file!==BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE.file));
 if(other.length)await scope.prepare(other,signal);
 if(admission)await m17.prepareBremenProgressiveAdmissions(components,signal,scope);
 if(repairs)await prepareBremenRepairsData(components,signal,scope);
 signal.throwIfAborted();
}
function selectBremenResources(fns:readonly Fn[],components:readonly BremenDemandComponent[],args?:readonly unknown[]):FrozenDataRef[]{
 const refs=new Map<string,FrozenDataRef>();
 const add=(resources:readonly FrozenDataRef[])=>{for(const ref of resources)refs.set(JSON.stringify([ref.canonicalSHA256,ref.file,ref.occurrence,ref.codec]),ref);};
 const selectedModules=new Set<Module>();let componentCities:string[]|undefined;
 for(const fn of fns){
  const call=calls.get(fn);if(!call||bremenIdentityIsPure(call.name)||call.module.MODULE_SCOPE_METADATA_FUNCTIONS?.includes(call.name))continue;
  const needed=call.module.MODULE_SCOPE_DEMAND?.(call.name,components,args);
  if(needed===false)continue;
  if(!components.length&&needed!==true)continue;
  const cities=call.module.MODULE_SCOPE_CITIES;
  if(needed===undefined&&cities?.length&&!components.some(c=>c.city!==undefined&&cities.includes(c.city)))continue;
  // The ordered finite dispatch only needs the branch actually reachable from
  // these DISPLAY rows; unrelated branches must not prepare their model tables.
  if(call.module===m20){
   if(selectedModules.has(call.module))continue;selectedModules.add(call.module);
   for(const c of components){if(c.city!=='bremen'||typeof c.objectId!=='string'||typeof c.partId!=='string')continue;
    const identity={objectId:c.objectId,partId:c.partId,city:c.city};
    if(bremenIdentityMatches('f260AcceptedRestoreIdentity',identity))add(m37.MODULE_SCOPE_RESOURCES);
    else if(bremenIdentityMatches('bremenKunsthalle70DerivedIdentity',identity))add(m42.MODULE_SCOPE_RESOURCES);
    else if(bremenIdentityMatches('bremenFiniteDerivedIdentity',identity))add(m29.MODULE_SCOPE_RESOURCES);
   }continue;
  }
  if(call.module===m21){
   if(call.name==='teerhofDetailSourceBoundGroupCertificate'&&bremenRecipeDemand('bremen-teerhof-detail-runtime',call.name,components))add([...m35.MODULE_SCOPE_RESOURCES,...m31.MODULE_SCOPE_RESOURCES]);
   if(call.name==='euroGableSourceBoundGroupCertificates'&&bremenRecipeDemand('euro-gable-runtime',call.name,components))add(m36.MODULE_SCOPE_RESOURCES);
   continue;
  }
  if(call.module===m44&&bremenDemandSourceAuthority('oldtown')===undefined)add(m29.MODULE_SCOPE_RESOURCES);
  if(selectedModules.has(call.module))continue;selectedModules.add(call.module);
  add(call.module.MODULE_SCOPE_RESOURCES_FOR_COMPONENTS?.(components)??call.module.MODULE_SCOPE_RESOURCES_FOR_CITIES?.(componentCities??=components.flatMap(c=>c.city===undefined?[]:[c.city]))??call.module.MODULE_SCOPE_RESOURCES);
 }
 return [...refs.values()];
}
export async function prepareBremenModuleResources(scope:FrozenDataScope,components:readonly BremenDemandComponent[],signal:AbortSignal,consumers:readonly Fn[]){await prepareBremenFunctions(scope,consumers,components,signal);}
