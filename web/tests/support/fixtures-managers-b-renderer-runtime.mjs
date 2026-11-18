// Renderer white-box fixtures evaluate a provider's building-mesh-renderer.ts
// with an explicit dependency map of tiny doubles. The renderers now publish
// chunked meshes: authoritative source groups (renderer-chunk-input), CPU
// packing and GPU residency (chunk-mesh-packing / chunk-mesh-residency), the
// page resource store, and the shader source/assembly budgets. Those are pure
// runtime modules, so a fixture takes them from the same production module
// graph as its program owner and geometry owner (one store/context registry),
// never from a hand-written stand-in.
import path from 'node:path';
import {createSourceModules,sourceModuleId,webSource} from './fixtures-managers-b-source-modules.mjs';

// The ownership helper is production code. These imports are unused by that
// helper; the fixture still supplies its own capture runtime/GL boundary.
const captureOwnershipModule=createSourceModules({
 overrides:{'safety/resident-planar-reflection':{},'safety/scene-solar-shadow':{}},
 allow:id=>['safety/render-runtime/resident-capture','safety/render-runtime/resident-index-convention'].includes(id),
}).load('safety/render-runtime/resident-capture');
export const {createResidentCaptureOwnership}=captureOwnershipModule;

export const RENDERER_RUNTIME_MODULES=Object.freeze([
 'safety/current-paint-program-groups',
 'safety/paint-program-idle-retirement',
 'safety/render-runtime/chunk-admission',
 'safety/render-runtime/resident-draw-range',
 'safety/partition-program-groups',
 'safety/render-runtime/resident-normal-packing',
 'safety/render-runtime/resident-index-convention',
 'safety/render-runtime/resource-budget',
 'safety/render-runtime/chunk-resource-store',
 'safety/render-runtime/shader-source-budget',
 'safety/render-runtime/shader-assembly-budget',
 'safety/renderer-chunk-input',
 'safety/resource-content-key',
 'painted/bremen/safety/bremen-display-derivations',
 'painted/infill/safety/infill-display-derivations',
 'safety/reconstruction-resource-parents',
 'safety/reconstruction-numeric-resource',
 'painted/root500/safety/chunk-mesh-packing',
 'painted/root500/safety/chunk-mesh-residency',
 'safety/facade-rathaus-display-masks',
 'painted/root500/safety/facade-rathaus-display-masks',
 'painted/infill/safety/facade-rathaus-display-masks',
]);
/** Production modules these runtime modules themselves reach. */
export const RENDERER_RUNTIME_DEPENDENCIES=Object.freeze(['safety/building-focus-window','safety/render-runtime/pressure-availability','safety/render-runtime/diagnostic-snapshot','safety/resident-planar-reflection','safety/render-runtime/program-preparation','safety/render-runtime/preparation-scheduler','safety/render-runtime/submitted-program-completion',...['bremen-demand-metadata','oldtown70-data','kunsthalle70-data','f260-accepted-restore-data','market-cap-data','organisten-data','glocke-kuester-data'].map(name=>'painted/bremen/safety/'+name),...['f278-source-bindings','f278-original-profiles','infill-f288-coplanar-roof','infill-f288-coplanar-roof-data','f288-original-signature'].map(name=>'painted/infill/safety/'+name)]);

/** A dependency resolver for one renderer: a specifier that resolves to a
 * renderer runtime module returns the loader's real module; anything else
 * returns undefined so the fixture's own double map stays authoritative. */
export function rendererRuntime(loader,provider){
 const importer=path.join(webSource,`painted/${provider}/safety/building-mesh-renderer.ts`),runtime=new Set(RENDERER_RUNTIME_MODULES);
 return specifier=>{
  if(typeof specifier!=='string'||!specifier.startsWith('.'))return undefined;
  const id=sourceModuleId(path.resolve(path.dirname(importer),specifier));
  return runtime.has(id)?loader.load(id):undefined;
 };
}

/** One authoritative source group per prepared batch, as a manager's
 * sourceChunkInput supplies it: the page store, a canonical frame at the rows'
 * source origin and no cross-leaf cohort. Content keys are unique per call so
 * each preparation is its own verified source authority. */
let sequence=0;
export function fixtureChunkInput(chunkInputModule,store,rows,{origin=rows[0]?.origin??[8,53],authority='fixture-frame'}={}){
 return{store,groups:rows.length?[{contentKey:'fixture-source:'+(++sequence)+':'+rows.map(row=>row.objectId+'|'+row.partId).join(','),components:rows,parents:[],frame:chunkInputModule.rendererChunkFrame(origin,authority),cohortKeys:[],materialAuthority:'fixture-material',recipeAuthority:'fixture-recipe',selectedLOD:0}]:[],cohorts:[]};
}

/** A tiny Rathaus proxy-mask owner with the current RathausProxyMasks shape:
 * these fixtures carry no Rathaus wall, so the CPU recipe has no mask words
 * and covers nothing. prepare() makes the requested programs resident on a
 * live context (counted in control.maskPreparations); residency ends on
 * context loss (unless lossKeepsResidency, as one suite's former double did),
 * reconfiguration, detach or destroy; control.failRestoreMasks makes prepare
 * report a mask failure. A retention shares its owner's residency; a binding
 * created from a CPU recipe has its own. */
export function tinyRathausProxyMasks(control={},{lossKeepsResidency=false}={}){
 const resident=new Set(),stats={maskCount:0,allocatedCPUBytes:0,allocatedGPUBytes:0,sourceParentClaim:false,sourceArraysUnchanged:true};
 const prepare=(_context,programs)=>{if(control.failRestoreMasks)return{ready:false,reason:'tiny restore mask failure'};control.maskPreparations=(control.maskPreparations??0)+1;for(const program of programs)resident.add(program);return{ready:true};};
 const isResident=(context,program)=>(lossKeepsResidency||!context.isContextLost())&&resident.has(program);
 const withResidentMasks=(context,program,draw)=>{if(context.isContextLost()||!resident.has(program))return false;draw();return true;};
 const recipe={words:new Float32Array(0),masks:[],wordMasks:[],origin:undefined,costs:[],retain:()=>({release(){}}),release(){},createBinding:()=>tinyRathausProxyMasks(control,{lossKeepsResidency})};
 return{configure(){resident.clear();},prepare,isResident,withMasks(_context,_program,draw){return draw();},withResidentMasks,covered:()=>false,
  retain:()=>({prepare,isResident,withResidentMasks,residentRevision:'tiny',origin:undefined,release(){}}),
  // Ready main-frame pins cannot prepare or await. This empty-mask double
  // shares the owner's residency, just like its asynchronous retain above.
  retainReady(){let live=true;return{isResident:(context,program)=>live&&isResident(context,program),withResidentMasks:(context,program,draw)=>live&&withResidentMasks(context,program,draw),residentRevision:'tiny',origin:undefined,release(){live=false;}};},cpuRecipe:()=>recipe,
  detach(){resident.clear();},destroy(){resident.clear();},residentBuffer:undefined,residentRevision:'tiny',origin:undefined,costs:[],stats};
}

/** The renderers' solar-shadow-admission double. Its "prepared" boundary is the
 * input itself (no index is built), so like the real module it carries no
 * charged index: solarShadowBoundaryCosts returns no cost, admission resolves
 * to the same value after the signal check, and no boundary is cached. */
export function solarShadowAdmissionDouble(){
 return{
  prepareSolarShadowBoundary:value=>value,
  residentSolarShadowRanges:(_origin,rows)=>[...rows],
  admitSolarShadowBoundary:async(value,options)=>{options?.signal?.throwIfAborted();return value;},
  tryAdmitSolarShadowBoundary:value=>value,
  solarShadowBoundaryCosts:()=>[],
  currentSolarShadowBoundary:()=>undefined,
 };
}
