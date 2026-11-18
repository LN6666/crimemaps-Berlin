import {createGreenCoverageTarget} from './environment-green-coverage-target';
import {createHardSurfaceDisplayTarget} from './environment-hard-surface-target';
import type {createHardSurfaceDisplayController} from './hard-surface-display-controller';
import {createGroundChunkTurnstile} from './ground-chunk-turnstile';
export interface EnvironmentRegionalController {
 step(frame:Readonly<{matrix:Float32Array;viewport:readonly[number,number,number,number];origin:readonly[number,number]}>,time?:number):void;
 notifyTargetChange():void;cancel():void;destroy():void;
 originForGeneration(generation:string|undefined):readonly[number,number]|undefined;
 readonly stats:Readonly<{active:boolean;needsFrame?:boolean;[key:string]:unknown}>;
}
import {createProjectedShadowMask} from './projected-shadow-mask';
import {createPlanarBuildingReflection,type PlanarReflectionSource} from './planar-building-reflection';
import {createEnvironmentViewCache} from './environment-view';
import {createEnvironmentTreeShadows} from './environment-tree-shadows';
import {currentSolarShadowBoundary,type PreparedSolarBoundary} from './solar-shadow-admission';
import {greenGroundGeometry,treeRowDisplayCandidates} from './environment-greenery-geometry';
import {hardSurfaceDisplayGeometry} from './environment-hard-surface-display';
import {woodlandDisplayCandidates} from './environment-woodland-display';
import {createEnvironmentTreeLOD} from './environment-tree-lod';
import {selectEnvironmentTrees} from './environment-tree-selection';
type DisplayTreeCandidate={id:string;sourceId?:string;kind:'native'|'row'|'wood';lon:number;lat:number;x:number;z:number;height:number;heightStatus:string;sourceHeight?:string;role:string;rowSample?:number};
import {GREEN_GROUND_VERTEX_GLSL,GREEN_GROUND_FRAGMENT_GLSL,greenGroundDepthParameters} from './environment-green-ground';
import {ENVIRONMENT_SCENE_VERTEX_GLSL,ENVIRONMENT_SCENE_FRAGMENT_GLSL,TREE_CONTACT_DISPLAY_RADIUS_METRES,TREE_CONTACT_GROUND_HEIGHT_METRES,TREE_CONTACT_MAX_OPACITY} from './environment-scene-shaders';
import {createEnvironmentMotion} from './environment-motion';
import {sceneSolarLight,SCENE_REFERENCE_INSTANT} from './scene-solar-light';
import {createSceneLightUniforms} from './scene-surface-light';
import {withSceneSolarShadowReceiver} from './scene-solar-shadow';
import {SCENE_QUALITY_PROFILES,type SceneQuality} from './scene-environment-quality';
import {defaultSceneEnvironment,checkedSceneEnvironment,type SceneEnvironmentState} from './scene-environment-state';
import {viewportQueryBounds,type ComponentViewportCamera} from './three-dimensional-viewport';
import earcut,{deviation} from 'earcut';
import {ENVIRONMENT_LIMITS,lowPolyTreeMesh,farLowPolyTreeMesh,sourceTreeHeight,type EnvironmentFeature,type EnvironmentBox} from './environment-scene-data';
import type {ChunkResourceStore} from './render-runtime/chunk-resource-types';
import type {ResourceBudgetCost,ResourceBudgetReservation} from './render-runtime/resource-budget';
import {createEnvironmentGpuLedger,environmentAdmissionError,environmentProgramAllowanceCosts,environmentResourceStore,gpuBufferCost,reserveEnvironmentCosts,waitForEnvironmentBudget,EnvironmentResourcePendingError,ENVIRONMENT_CONSTRUCTION_MODEL} from './environment-resource-budget';
import {environmentPublicationBound,environmentRendererFixedCosts,type EnvironmentPublicationBound} from './environment-resource-publication';
import {environmentGroundMeshPublicationBound,decodeEnvironmentGroundMesh,validateGroundMeshBoundary,type ValidatedEnvironmentGroundMesh} from './environment-ground-mesh';
type SceneMap={triggerRepaint():void};
const C=2*Math.PI*6378137,merc=(p:number[])=>[(p[0]+180)/360,(1-Math.log(Math.tan(Math.PI/4+p[1]*Math.PI/360))/Math.PI)/2];
const multiply=(a:ArrayLike<number>,b:number[])=>{const r=new Float64Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return new Float32Array(r);};
const mesh=lowPolyTreeMesh(),farMesh=farLowPolyTreeMesh();
// Append one shared quad to the existing mesh buffers; reuse the selected-tree
// instance buffer. Ordinary trees and solar shadows keep their original ranges.
const contactPositions=new Float32Array([-1,0,-1,0,1,0,-1,1,0,-1,0,1,0,-1,1,0,1,0,1,0,-1,-1,0,1,0,1,0,-1]);
const contactIndices=new Uint16Array([0,1,2,0,2,3].map(i=>mesh.vertices+i));
const contactBytes=contactPositions.byteLength+contactIndices.byteLength;
const farIndices=new Uint16Array(farMesh.indices.map(i=>i+mesh.vertices+4));
const farIndexOffset=mesh.indices.byteLength+contactIndices.byteLength;
/** The constant program allowance of one renderer: the water/tree program, the
 * green-ground program and the four VAOs (DECISIONS 2026-11-02 03:25 policy
 * estimate, about 128 KiB; driver-side unmeasured). */
const environmentProgramCosts=()=>environmentProgramAllowanceCosts([{vertex:ENVIRONMENT_SCENE_VERTEX_GLSL,fragment:ENVIRONMENT_SCENE_FRAGMENT_GLSL,attributes:['a_position','a_normal','a_role','a_tree']},{vertex:GREEN_GROUND_VERTEX_GLSL,fragment:GREEN_GROUND_FRAGMENT_GLSL,attributes:['a_position','a_normal','a_role']}],{count:4,attributes:4},'environment');
/** Source trees, explicit source-line tree-row illustrations, and exact green/water polygons.
 * One shared WebGL2 context; no police association, scatter or owned animation timer. */
export function createEnvironmentSceneRenderer(map:SceneMap,{mobile=false,id='native-environment-scenes',origin,reducedMotion=false,quality='economy',verifiedBoundary,onRenderError,onFrameNeeded,onRegionalCoverageInvalidated,resourceStore}:{mobile?:boolean;id?:string;origin?:[number,number];reducedMotion?:boolean;quality?:SceneQuality;verifiedBoundary?:PreparedSolarBoundary;onRenderError?:(error:unknown)=>void;onFrameNeeded?:()=>void;onRegionalCoverageInvalidated?:()=>void;resourceStore?:ChunkResourceStore}={}){
 quality='economy';
 // Fixed tree staging/scratch is admitted on the ONE page ledger before it is
 // allocated; a Pending refusal leaves nothing behind for the caller to retry,
 // and a construction that fails after admission returns the claim it took.
 const resources=environmentResourceStore(mobile,resourceStore),fixedCPU=reserveEnvironmentCosts(resources.budget,environmentRendererFixedCosts(mobile?512:2048),'environment renderer fixed CPU storage');
 try{
 const gpuLedger=createEnvironmentGpuLedger('environment-scene');type PublicationAdmission={claim:ResourceBudgetReservation;tokens:{construction:object;packed:object;evidence:object;waterVertices:object;waterIndices:object};gpu:boolean;bound:EnvironmentPublicationBound};
 let publicationClaim:ResourceBudgetReservation|undefined,gpuDeferred=false,gpuWait:AbortController|undefined,gpuPending:{label:string;requiredBytes:number}|undefined,admittedPublications=0,refusedPublications=0;
 let sceneEnvironment=defaultSceneEnvironment(mobile),ownerReducedMotion=reducedMotion;const motion=createEnvironmentMotion(),uploadLight=createSceneLightUniforms();motion.setReducedMotion(reducedMotion);let phase=0,sunInstant=sceneEnvironment.instantISO,sunOrigin:[number,number]=origin??[0,0],sun=sceneSolarLight(sunOrigin[0],sunOrigin[1],sunInstant);
 const shadowMask=createProjectedShadowMask({requestRepaint:()=>{onFrameNeeded?.();map.triggerRepaint();}});const reflection=createPlanarBuildingReflection({mobile,requestRepaint:()=>map.triggerRepaint()});const treeCap=mobile?512:2048;const treeShadows=createEnvironmentTreeShadows(treeCap),viewCache=createEnvironmentViewCache();const treeLOD=createEnvironmentTreeLOD(treeCap,mesh.horizontalRadiusMetres+.08),surfaceTrees=new Float32Array(treeCap*3);let surfaceDirty=true,treeAttribute=-1;let treeShadowSourceRevision=0,treeBoundarySHA='',treeShadowDirty=true;
 let enabled=false,visible=true,offscreen=false,destroyed=false,gl:WebGL2RenderingContext|undefined,program:WebGLProgram|undefined,greenProgram:WebGLProgram|undefined,treeVao:WebGLVertexArrayObject|undefined,treeSurfaceVao:WebGLVertexArrayObject|undefined,waterVao:WebGLVertexArrayObject|undefined,treeShadowVao:WebGLVertexArrayObject|undefined;
 let treeBuffer:WebGLBuffer|undefined,treeIndex:WebGLBuffer|undefined,instancesBuffer:WebGLBuffer|undefined,surfaceInstancesBuffer:WebGLBuffer|undefined,waterBuffer:WebGLBuffer|undefined,waterIndex:WebGLBuffer|undefined,shadowInstancesBuffer:WebGLBuffer|undefined;
 let anchor=[0,0],unit=1,trees=new Float32Array(treeCap*3),treeCount=0,water=new Float32Array(),waterIndices=new Uint32Array(),triIndices=0,lineIndices=0,greenIndices=0,greenVertices=0,surfaceWaterVertices=0,packedGround=false;
 let hardRanges:{id:string;start:number;count:number}[]=[];
 let hardIndices=0,hardVertices=0,hardStats={admitted:0,heldTriangles:0,heldPolygons:0,omitted:0,conflicting:0,structural:0,sourceMismatch:0};let hardDepthMode='not-rendered',hardCaptureStale=false;
 let greenStats={admitted:0,held:0,omitted:0},rowStats:{instances:number;truncated:boolean;[key:string]:number|boolean}={instances:0,held:0,duplicate:0,candidates:0,truncated:false};
 let woodlandStats:Record<string,unknown>={},treeSelectionStats:Record<string,unknown>={};
 let regionalTarget:ReturnType<typeof createGreenCoverageTarget>|undefined,regionalController:EnvironmentRegionalController|undefined;
 let hardTarget:ReturnType<typeof createHardSurfaceDisplayTarget>|undefined,hardController:ReturnType<typeof createHardSurfaceDisplayController>|undefined;
 let regionalRecoveryNeeded=false,regionalLossUnwatch:(()=>void)|undefined;
 const regionalWake=()=>{regionalController?.notifyTargetChange();hardController?.notifyTargetChange();onFrameNeeded?.();map.triggerRepaint();};
 const chunkTurnstile=createGroundChunkTurnstile(regionalWake,resources.budget,resources);
 function syncRegionalActive(){const active=enabled&&visible&&!offscreen&&!destroyed;regionalTarget?.setActive(active);hardTarget?.setActive(active);if(!active){regionalController?.cancel();hardController?.cancel();}}
 function regionalAnimating(){const s=regionalTarget?.stats;return enabled&&visible&&!offscreen&&!destroyed&&
  ((regionalController?(regionalController.stats.needsFrame??regionalController.stats.active):!!s?.pendingGeneration)||!!s?.currentChunk||!!s?.retiring||!!hardController?.stats.needsFrame||!!hardTarget?.stats.currentChunk||!!hardTarget?.stats.retiring);}
 function regionalMatrix(main:ArrayLike<number>,reference:readonly[number,number]){const p=merc([reference[0],reference[1]]),metres=C*Math.cos(reference[1]*Math.PI/180),scale=1/metres;
  return multiply(main,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,p[0],p[1],0,1]);}
 function releaseRegional(){regionalLossUnwatch?.();regionalLossUnwatch=undefined;
  regionalRecoveryNeeded ||= !!regionalController||!!regionalTarget?.stats.generation||!!hardController||!!hardTarget?.stats.generation;
  regionalController?.destroy();regionalController=undefined;regionalTarget?.destroy();regionalTarget=undefined;hardController?.destroy();hardController=undefined;hardTarget?.destroy();hardTarget=undefined;}
 function regionalLost(){if(!gl?.isContextLost())return;regionalRecoveryNeeded ||= !!regionalController||!!regionalTarget?.stats.generation||!!regionalTarget?.stats.pendingGeneration||!!hardController||!!hardTarget?.stats.generation||!!hardTarget?.stats.pendingGeneration;
  regionalController?.cancel();regionalTarget?.contextLost();hardController?.cancel();hardTarget?.contextLost();}
 let renderFailure:string|undefined;let greenDepthMode:'not-rendered'|'analytic-plane'|'raster-fallback'='not-rendered';
 let waterDiagnosticRevision=0,lastWaterDiagnostic:{revision:number;mainMatrix:number[];uniformMatrix:number[]}|undefined;
 let heldTrees=0,omittedTrees=0,heldWater=0,draws=0;let treeEvidence:{id:string;heightStatus:string;sourceHeight?:string;displayHeightMetres:number;role?:string;rowSample?:number;displayId?:string}[]=[];
 const vertex=ENVIRONMENT_SCENE_VERTEX_GLSL,fragment=ENVIRONMENT_SCENE_FRAGMENT_GLSL;
 // The shared clock does not call animationFrame while there is no drawable
 // water/tree publication. Pause the same motion owner at that boundary so its
 // next first frame cannot count time spent empty, unallocated or context-lost.
 function syncMotionEnabled(){const wasActive=motion.stats.active;motion.setEnabled(enabled&&!destroyed&&!!treeVao&&!!gl&&!gl.isContextLost()&&(treeCount>0||triIndices>0||lineIndices>0));if(!wasActive&&motion.stats.active)onFrameNeeded?.();}
 function release(){releaseRegional();motion.setEnabled(false);shadowMask.release();reflection.resetGPU();lastWaterDiagnostic=undefined;if(gl){for(const b of [treeBuffer,treeIndex,instancesBuffer,surfaceInstancesBuffer,waterBuffer,waterIndex,shadowInstancesBuffer])if(b)gl.deleteBuffer(b);for(const v of [treeVao,treeSurfaceVao,waterVao,treeShadowVao])if(v)gl.deleteVertexArray(v);if(program)gl.deleteProgram(program);if(greenProgram)gl.deleteProgram(greenProgram);}treeBuffer=treeIndex=instancesBuffer=surfaceInstancesBuffer=waterBuffer=waterIndex=shadowInstancesBuffer=undefined;treeVao=treeSurfaceVao=waterVao=treeShadowVao=undefined;treeShadowDirty=true;treeLOD.clear();surfaceDirty=true;treeAttribute=-1;program=greenProgram=undefined;greenDepthMode='not-rendered';
  // Same exit for remove, failure, context loss and destroy: live storage
  // retires behind the page fence, lost storage is released immediately.
  gpuLedger.release();gpuDeferred=false;gpuPending=undefined;gpuWait?.abort();gpuWait=undefined;}
 const fixedGpuCosts=():ResourceBudgetCost[]=>[gpuBufferCost(mesh.positions.byteLength+contactPositions.byteLength+farMesh.positions.byteLength,{},'environment tree mesh vertex buffer'),gpuBufferCost(farIndexOffset+farIndices.byteLength,{},'environment tree mesh index buffer'),gpuBufferCost(trees.byteLength,{},'environment tree instance buffer'),gpuBufferCost(surfaceTrees.byteLength,{},'environment tree surface LOD instance buffer'),gpuBufferCost(treeShadows.instances.byteLength,{},'environment tree solar-shadow instance buffer')];
 const waterGpuCosts=(vertices:object,indices:object):ResourceBudgetCost[]=>[gpuBufferCost(water.byteLength,vertices,'environment water/green vertex buffer'),gpuBufferCost(waterIndices.byteLength,indices,'environment water/green index buffer')];
 function awaitGpuBudget(){
  if(gpuWait||destroyed)return;const wait=gpuWait=new AbortController();
  void waitForEnvironmentBudget(resources.budget,wait.signal).then(()=>{if(gpuWait!==wait||destroyed)return;gpuWait=undefined;map.triggerRepaint();onFrameNeeded?.();},()=>{});
 }
 /** Program, VAO and buffer storage are admitted before any shader, VAO or
  * buffer handle exists, as ONE ledger decision: the constant program
  * allowance (a policy estimate, driver-side unmeasured) beside the fixed and
  * water storage. A refusal reserves and releases nothing, so it cannot wake
  * this renderer or any other waiter; nothing is compiled or allocated, nothing
  * draws, and the ledger's wake-up repaints through the existing frame owner,
  * which retries once; no timer or retry loop. All three keyed claims share
  * the buffers' exit: retirement behind the page fence, or an immediate
  * release once the context is lost. */
 function allocateGPU():boolean{
  if(!gl)return false;if(treeVao)return true;const g=gl;
  try{gpuLedger.replaceAll(resources,g,[['programs',environmentProgramCosts()],['fixed',fixedGpuCosts()],['water',waterGpuCosts({},{})]]);}
  catch(error){
   const refusal=environmentAdmissionError(error,'environment GPU programs and buffers');
   if(!(refusal instanceof EnvironmentResourcePendingError))throw refusal??error;
   gpuDeferred=true;gpuPending={label:refusal.label,requiredBytes:refusal.requiredBytes};awaitGpuBudget();return false;
  }
  gpuDeferred=false;gpuPending=undefined;
  compilePrograms(g);const p=program!;
  treeVao=g.createVertexArray()??undefined;treeSurfaceVao=g.createVertexArray()??undefined;waterVao=g.createVertexArray()??undefined;treeShadowVao=g.createVertexArray()??undefined;treeBuffer=g.createBuffer()??undefined;treeIndex=g.createBuffer()??undefined;instancesBuffer=g.createBuffer()??undefined;surfaceInstancesBuffer=g.createBuffer()??undefined;waterBuffer=g.createBuffer()??undefined;waterIndex=g.createBuffer()??undefined;shadowInstancesBuffer=g.createBuffer()??undefined;if(!treeVao||!treeSurfaceVao||!treeShadowVao||!waterVao||!treeBuffer||!treeIndex||!instancesBuffer||!surfaceInstancesBuffer||!shadowInstancesBuffer||!waterBuffer||!waterIndex)throw Error('Environment GPU allocation failed');treeAttribute=g.getAttribLocation(p,'a_tree');treeLOD.setSelected(treeEvidence.map(tree=>tree.displayId!));upload(true);syncMotionEnabled();
  return true;
 }
 /** A failure here releases everything (gpuDeferred is cleared, so no later
  * frame retries). The owner's next enable after that failure (its next
  * refresh, as an onAdd failure used to rebuild the renderer) re-arms one
  * attempt in the next frame: once per refresh, never per frame. */
 function allocateDeferredGPU(){
  try{return allocateGPU();}
  catch(error){release();renderFailure=String(error).slice(0,2048);enabled=false;motion.setEnabled(false);console.error('Environment rendering failed',error);onRenderError?.(error);return false;}
 }
 /** The whole publication is admitted from its actual input before any
  * renderer state changes; a refusal keeps the previous publication intact. */
 function admitPublicationBound(bound:EnvironmentPublicationBound):PublicationAdmission|undefined{
  const gpu=!!gl&&!!treeVao&&!gl.isContextLost();
  if(!bound.constructionBytes&&!bound.packedBytes&&!bound.evidenceBytes)return;
  const tokens={construction:{},packed:{},evidence:{},waterVertices:{},waterIndices:{}};
  const costs:ResourceBudgetCost[]=[{category:'construction',bytes:bound.constructionBytes,precision:'estimate',identity:tokens.construction,label:'environment publication construction working set'},{category:'packed',bytes:bound.packedBytes,precision:'estimate',identity:tokens.packed,label:'environment packed water/green arrays bound'},{category:'metadata',bytes:bound.evidenceBytes,precision:'estimate',identity:tokens.evidence,label:'environment tree display evidence'}];
  if(gpu)costs.push(gpuBufferCost(bound.vertexBytes,tokens.waterVertices,'environment water/green vertex buffer bound','estimate'),gpuBufferCost(bound.indexBytes,tokens.waterIndices,'environment water/green index buffer bound','estimate'));
  try{const claim=reserveEnvironmentCosts(resources.budget,costs,'environment publication');admittedPublications++;return{claim,tokens,gpu,bound};}
  catch(error){refusedPublications++;throw error;}
 }
 function admitPublication(features:readonly EnvironmentFeature[],waterAdmitted:ReadonlySet<EnvironmentFeature>|undefined,detail:'full'|'ground',hasHardVerification:boolean){
  const base=environmentPublicationBound(features,waterAdmitted,detail,treeCap),ranges=hasHardVerification?Math.min(12,base.counts.greenFeatures)*256:0;
  return admitPublicationBound(ranges?{...base,constructionBytes:base.constructionBytes+ranges,evidenceBytes:base.evidenceBytes+ranges}:base);
 }
 /** Water storage takes its claim from the pre-admitted identities before
  * bufferData; the admission then shrinks to the retained packed arrays. */
 function commitPublication(admission:PublicationAdmission|undefined){
  if(gl&&treeVao&&!gl.isContextLost()){const tokens=admission?.gpu?admission.tokens:{waterVertices:{},waterIndices:{}};gpuLedger.replace(resources,gl,'water',waterGpuCosts(tokens.waterVertices,tokens.waterIndices));}
  upload();
  const previous=publicationClaim;
  if(admission){
   const M=ENVIRONMENT_CONSTRUCTION_MODEL;
   admission.claim.adjust([{category:'packed',bytes:water.byteLength+waterIndices.byteLength,precision:'exact',identity:admission.tokens.packed,label:'environment packed water/green arrays'},{category:'metadata',bytes:treeEvidence.length*(M.evidenceBytes+M.numberSlotBytes)+hardRanges.length*256,precision:'estimate',identity:admission.tokens.evidence,label:'environment tree and hard-member display evidence'}]);
   publicationClaim=admission.claim;
  }else publicationClaim=undefined;
  previous?.release();
  syncMotionEnabled();
 }
 function updateTreeShadows(){treeShadowDirty=treeShadows.update(trees,treeCount,treeShadowSourceRevision,sun,(verifiedBoundary?.boundarySHA256===treeBoundarySHA?verifiedBoundary:currentSolarShadowBoundary(treeBoundarySHA)),mesh.horizontalRadiusMetres+SCENE_QUALITY_PROFILES.economy.windMetres,sceneEnvironment.sunlight&&sceneEnvironment.shadows)||treeShadowDirty;}
 function uploadShadowInstances(){if(!gl||!shadowInstancesBuffer||!treeShadowDirty)return;const old=gl.getParameter(gl.ARRAY_BUFFER_BINDING);gl.bindBuffer(gl.ARRAY_BUFFER,shadowInstancesBuffer);gl.bufferData(gl.ARRAY_BUFFER,treeShadows.instances,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,old);treeShadowDirty=false;}
 function upload(initial=false){if(!gl||!program||!treeVao||!treeSurfaceVao||!treeShadowVao||!waterVao||!treeBuffer||!treeIndex||!instancesBuffer||!surfaceInstancesBuffer||!shadowInstancesBuffer||!waterBuffer||!waterIndex)return;const oldVao=gl.getParameter(gl.VERTEX_ARRAY_BINDING),oldArray=gl.getParameter(gl.ARRAY_BUFFER_BINDING);
 const layout=(v:WebGLVertexArrayObject,b:WebGLBuffer,stride:number,instance:WebGLBuffer)=>{gl!.bindVertexArray(v);gl!.bindBuffer(gl!.ARRAY_BUFFER,b);for(const[name,size,offset]of [['a_position',3,0],['a_normal',3,12],['a_role',1,24]]as const){const at=gl!.getAttribLocation(program!,name);if(at<0)throw Error('Missing environment attribute');gl!.enableVertexAttribArray(at);gl!.vertexAttribPointer(at,size,gl!.FLOAT,false,stride,offset);}gl!.bindBuffer(gl!.ARRAY_BUFFER,instance);const at=gl!.getAttribLocation(program!,'a_tree');if(at<0)throw Error('Missing tree instance attribute');gl!.enableVertexAttribArray(at);gl!.vertexAttribPointer(at,3,gl!.FLOAT,false,12,0);gl!.vertexAttribDivisor(at,1);};
 try{if(initial){layout(treeVao,treeBuffer,28,instancesBuffer);gl.bindBuffer(gl.ARRAY_BUFFER,treeBuffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions.byteLength+contactPositions.byteLength+farMesh.positions.byteLength,gl.STATIC_DRAW);gl.bufferSubData(gl.ARRAY_BUFFER,0,mesh.positions);gl.bufferSubData(gl.ARRAY_BUFFER,mesh.positions.byteLength,contactPositions);gl.bufferSubData(gl.ARRAY_BUFFER,mesh.positions.byteLength+contactPositions.byteLength,farMesh.positions);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,treeIndex);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,farIndexOffset+farIndices.byteLength,gl.STATIC_DRAW);gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER,0,mesh.indices);gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices.byteLength,contactIndices);gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER,farIndexOffset,farIndices);layout(treeSurfaceVao,treeBuffer,28,surfaceInstancesBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,treeIndex);gl.bindBuffer(gl.ARRAY_BUFFER,surfaceInstancesBuffer);gl.bufferData(gl.ARRAY_BUFFER,surfaceTrees.byteLength,gl.DYNAMIC_DRAW);surfaceDirty=true;layout(treeShadowVao,treeBuffer,28,shadowInstancesBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,treeIndex);layout(waterVao,waterBuffer,28,instancesBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,waterIndex);treeShadowDirty=true;}
 gl.bindBuffer(gl.ARRAY_BUFFER,instancesBuffer);gl.bufferData(gl.ARRAY_BUFFER,trees,gl.DYNAMIC_DRAW);gl.bindVertexArray(waterVao);gl.bindBuffer(gl.ARRAY_BUFFER,waterBuffer);gl.bufferData(gl.ARRAY_BUFFER,water,gl.STATIC_DRAW);
 // The packed far-ground publication uses this SAME VAO and vertex buffer.
 // One trailing vec3 is instanced once, rather than repeated for each vertex.
 // Explicit divisors also restore native water/full geometry after a far view.
 for(const[name,size,offset]of (packedGround?[['a_position',3,0],['a_normal',3,water.byteLength-12],['a_role',1,12]]:[['a_position',3,0],['a_normal',3,12],['a_role',1,24]])as [string,number,number][]){const at=gl.getAttribLocation(program,name);if(at<0)throw Error('Missing environment attribute');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,packedGround?(name==='a_normal'?0:16):28,offset);gl.vertexAttribDivisor(at,Number(packedGround&&name==='a_normal'));}
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,waterIndex);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,waterIndices,gl.STATIC_DRAW);uploadShadowInstances();}finally{gl.bindVertexArray(oldVao);gl.bindBuffer(gl.ARRAY_BUFFER,oldArray);}}
 function updateTreeSurfaceLOD(matrix:ArrayLike<number>,viewport:ArrayLike<number>){
  if(!gl||!surfaceInstancesBuffer||!treeCount)return;
  const canvas=gl.canvas as {clientWidth?:number;clientHeight?:number};
  const ratio=typeof devicePixelRatio==='number'&&devicePixelRatio>0?devicePixelRatio:1;
  const width=canvas?.clientWidth&&canvas.clientWidth>0?canvas.clientWidth:viewport[2]/ratio,height=canvas?.clientHeight&&canvas.clientHeight>0?canvas.clientHeight:viewport[3]/ratio;
  const changed=treeLOD.update(matrix,width,height,trees);if(!changed&&!surfaceDirty)return;
  let near=0,far=treeLOD.near;
  for(let i=0;i<treeCount;i++){const at=(treeLOD.farFlags[i]?far++:near++)*3;surfaceTrees[at]=trees[i*3];surfaceTrees[at+1]=trees[i*3+1];surfaceTrees[at+2]=trees[i*3+2];}
  gl.bindBuffer(gl.ARRAY_BUFFER,surfaceInstancesBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,surfaceTrees);surfaceDirty=false;
 }
 function drawTreeSurfaces(){
  if(!gl||!program||!treeSurfaceVao||!surfaceInstancesBuffer||gl.isContextLost())return;
  gl.useProgram(program);uploadLight(gl,program,sun,sceneEnvironment.sunlight);
  gl.uniform1i(gl.getUniformLocation(program,'u_tree'),1);gl.bindVertexArray(treeSurfaceVao);
  gl.bindBuffer(gl.ARRAY_BUFFER,surfaceInstancesBuffer);
  try{
   if(treeLOD.near){gl.drawElementsInstanced(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0,treeLOD.near);draws++;if(gl.isContextLost())return;}
   if(treeLOD.far){gl.vertexAttribPointer(treeAttribute,3,gl.FLOAT,false,12,treeLOD.near*12);gl.drawElementsInstanced(gl.TRIANGLES,farIndices.length,gl.UNSIGNED_SHORT,farIndexOffset,treeLOD.far);draws++;}
  }finally{if(!gl.isContextLost())gl.vertexAttribPointer(treeAttribute,3,gl.FLOAT,false,12,0);}
 }
 /** One source-verified ground-only publication. Reserve its complete decode,
  * packed and GPU bound before decoding; invalid data keeps the old scene. */
 function setGroundMesh(mesh:ValidatedEnvironmentGroundMesh){
  if(destroyed)throw Error('Environment renderer destroyed');
  const admission=admitPublicationBound(environmentGroundMeshPublicationBound(mesh));
  try{
   const decoded=decodeEnvironmentGroundMesh(mesh);
   const boundary=verifiedBoundary?.boundarySHA256===mesh.boundarySHA256?verifiedBoundary:currentSolarShadowBoundary(mesh.boundarySHA256);
   if(!boundary||!validateGroundMeshBoundary(decoded,boundary))throw Error('Far ground mesh lacks complete verified boundary coverage');
   const nextOrigin:[number,number]=[decoded.origin[0],decoded.origin[1]],nextAnchor=merc(nextOrigin),nextUnit=C*Math.cos(nextOrigin[1]*Math.PI/180);
   const nextSun=sceneSolarLight(nextOrigin[0],nextOrigin[1],sunInstant);
   // All validation and admission above precedes changing the current publication.
   waterDiagnosticRevision++;treeShadowSourceRevision++;sunOrigin=nextOrigin;anchor=nextAnchor;unit=nextUnit;sun=nextSun;
   treeBoundarySHA=mesh.boundarySHA256;treeShadows.setOrigin(sunOrigin);treeCount=0;treeEvidence=[];
   heldTrees=omittedTrees=heldWater=0;rowStats={instances:0,held:0,duplicate:0,candidates:0,truncated:false};
   woodlandStats={instances:0,generatedInstances:0};treeSelectionStats={};treeLOD.setSelected([]);surfaceDirty=true;
   water=decoded.positions;waterIndices=decoded.indices;packedGround=true;
   surfaceWaterVertices=triIndices=lineIndices=0;greenVertices=decoded.vertexCount;greenIndices=decoded.indexCount;hardIndices=hardVertices=0;hardRanges=[];hardDepthMode='not-rendered';hardStats={admitted:0,heldTriangles:0,heldPolygons:0,omitted:0,conflicting:0,structural:0,sourceMismatch:0};
   greenStats={admitted:decoded.sourcePolygonCount,held:0,omitted:0};greenDepthMode='not-rendered';
   reflection.resetGPU();updateTreeShadows();commitPublication(admission);map.triggerRepaint();
  }catch(error){if(admission&&admission.claim!==publicationClaim)admission.claim.release();throw error;}
 }
 /** One bounded local closure, using the existing green buffer/program/VAO.
  * Source leases and encoded JSON remain with the manager. Scalar admission
  * precedes the charged ID Set and every decode; no partial source publishes. */
 function setGroundMeshes(meshes:readonly ValidatedEnvironmentGroundMesh[]){
  if(destroyed)throw Error('Environment renderer destroyed');
  if(!Array.isArray(meshes)||!meshes.length||meshes.length>32)throw Error('Invalid regional ground mesh count');
  const first=meshes[0];let vertexCount=0,indexCount=0,features=0,polygons=0,decodeScratch=0;
  for(const mesh of meshes){
   if(!mesh||mesh.city!==first.city||mesh.sourceSHA256!==first.sourceSHA256||mesh.boundarySHA256!==first.boundarySHA256||mesh.snapshot!==first.snapshot||
      !Object.is(mesh.origin[0],first.origin[0])||!Object.is(mesh.origin[1],first.origin[1]))throw Error('Regional ground source identity or origin mismatch');
   if(!Number.isSafeInteger(mesh.vertexCount)||mesh.vertexCount<3||!Number.isSafeInteger(mesh.indexCount)||mesh.indexCount<3||mesh.indexCount%3||
      !Array.isArray(mesh.sourceFeatureIds)||!Number.isSafeInteger(mesh.sourcePolygonCount)||mesh.sourcePolygonCount<1)throw Error('Invalid regional ground mesh bounds');
   vertexCount+=mesh.vertexCount;indexCount+=mesh.indexCount;features+=mesh.sourceFeatureIds.length;polygons+=mesh.sourcePolygonCount;
   if(vertexCount>ENVIRONMENT_LIMITS.greenVertices||indexCount>ENVIRONMENT_LIMITS.greenIndices||!Number.isSafeInteger(features)||!Number.isSafeInteger(polygons))throw Error('Regional ground aggregate exceeds original geometry budget');
   decodeScratch=Math.max(decodeScratch,environmentGroundMeshPublicationBound(mesh).constructionBytes);
  }
  const boundary=verifiedBoundary?.boundarySHA256===first.boundarySHA256?verifiedBoundary:currentSolarShadowBoundary(first.boundarySHA256);
  if(!boundary)throw Error('Regional ground lacks a verified municipal boundary');
  const vertexBytes=vertexCount*16+12,indexBytes=indexCount*4,M=ENVIRONMENT_CONSTRUCTION_MODEL;
  // Only one decoded input is live at a time. The extra aggregate index array
  // is stable-partition scratch; the final ordered array is charged as packed.
  // ID validation Set + its exact output references are transient construction.
  const bound:EnvironmentPublicationBound={vertexBytes,indexBytes,packedBytes:vertexBytes+indexBytes,
   constructionBytes:decodeScratch+indexBytes+features*(M.setEntryBytes+M.numberSlotBytes*M.arrayGrowthPeakFactor)+meshes.length*2*M.objectBytes,evidenceBytes:0,
   counts:{features,waterVertices:0,waterIndices:0,greenVertices:vertexCount,greenIndices:indexCount,largestPolygonVertices:0,
    greenFeatures:features,greenPolygons:polygons,nativeTrees:0,rowFeatures:0,rowVertices:0}};
  const admission=admitPublicationBound(bound);
  try{
   const ids=new Set<string>();for(const mesh of meshes)for(const id of mesh.sourceFeatureIds){if(ids.has(id))throw Error('Duplicate regional ground source feature ID');ids.add(id);}
   const positions=new Float32Array(vertexCount*4+3),indices=new Uint32Array(indexCount);let vertexOffset=0,indexOffset=0;
   for(const mesh of meshes){
    const decoded=decodeEnvironmentGroundMesh(mesh);
    if(!validateGroundMeshBoundary(decoded,boundary))throw Error('Regional ground mesh lacks complete verified boundary coverage');
    positions.set(decoded.positions.subarray(0,mesh.vertexCount*4),vertexOffset*4);
    for(let i=0;i<decoded.indexCount;i++)indices[indexOffset+i]=decoded.indices[i]+vertexOffset;
    vertexOffset+=decoded.vertexCount;indexOffset+=decoded.indexCount;
   }
   positions.set([0,1,0],vertexCount*4);
   // Specific source cover (4/5/6) wins coplanar LESS depth before generic park
   // cover (3). Both partitions retain source/cyclic triangle order and bits.
   const neutral=(at:number)=>positions[indices[at]*4+3]===3&&positions[indices[at+1]*4+3]===3&&positions[indices[at+2]*4+3]===3;
   let neutralCount=0;for(let at=0;at<indexCount;at+=3)if(neutral(at))neutralCount+=3;
   const ordered=new Uint32Array(indexCount);let coverAt=0,neutralAt=indexCount-neutralCount;
   for(let at=0;at<indexCount;at+=3){const generic=neutral(at),to=generic?neutralAt:coverAt;ordered[to]=indices[at];ordered[to+1]=indices[at+1];ordered[to+2]=indices[at+2];if(generic)neutralAt+=3;else coverAt+=3;}
   const decoded={positions,indices:ordered,vertexCount,indexCount,origin:first.origin,sourceFeatureIds:[...ids],sourcePolygonCount:polygons,boundarySHA256:first.boundarySHA256};
   if(!validateGroundMeshBoundary(decoded,boundary))throw Error('Merged regional ground lacks complete verified boundary coverage');
   const nextOrigin:[number,number]=[first.origin[0],first.origin[1]],nextAnchor=merc(nextOrigin),nextUnit=C*Math.cos(nextOrigin[1]*Math.PI/180),nextSun=sceneSolarLight(nextOrigin[0],nextOrigin[1],sunInstant);
   // No renderer state or GPU upload changes until every input and merged
   // Float32 triangle has passed the original municipal-boundary guard.
   waterDiagnosticRevision++;treeShadowSourceRevision++;sunOrigin=nextOrigin;anchor=nextAnchor;unit=nextUnit;sun=nextSun;
   treeBoundarySHA=first.boundarySHA256;treeShadows.setOrigin(sunOrigin);treeCount=0;treeEvidence=[];
   heldTrees=omittedTrees=heldWater=0;rowStats={instances:0,held:0,duplicate:0,candidates:0,truncated:false};woodlandStats={instances:0,generatedInstances:0};treeSelectionStats={};treeLOD.setSelected([]);surfaceDirty=true;
   water=positions;waterIndices=ordered;packedGround=true;surfaceWaterVertices=triIndices=lineIndices=0;greenVertices=vertexCount;greenIndices=indexCount;hardIndices=hardVertices=0;hardRanges=[];hardDepthMode='not-rendered';hardStats={admitted:0,heldTriangles:0,heldPolygons:0,omitted:0,conflicting:0,structural:0,sourceMismatch:0};
   greenStats={admitted:polygons,held:0,omitted:0};greenDepthMode='not-rendered';
   reflection.resetGPU();updateTreeShadows();commitPublication(admission);map.triggerRepaint();
  }catch(error){if(admission&&admission.claim!==publicationClaim)admission.claim.release();throw error;}
 }
 /** Compiles and links both programs on their admitted allowance; a failure
  * throws to the caller, whose release() returns every claim. */
 function compilePrograms(gl:WebGL2RenderingContext){const shaders:WebGLShader[]=[];
 try{for(const[i,text]of [vertex,fragment].entries()){const s=gl.createShader(i?gl.FRAGMENT_SHADER:gl.VERTEX_SHADER);if(!s)throw Error('Environment shader allocation failed');shaders.push(s);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Environment '+(i?'fragment':'vertex')+' shader failed: '+(gl.getShaderInfoLog(s)?.trim()||'No shader info log'));}program=gl.createProgram()??undefined;if(!program)throw Error('Environment program allocation failed');for(const s of shaders)gl.attachShader(program,s);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Environment program link failed: '+(gl.getProgramInfoLog(program)?.trim()||'No program info log'));for(const shader of shaders)gl.detachShader(program,shader);// The green program uses the existing water VAO attribute locations. It alone
 // writes fragment depth; the water/tree program retains its early-depth path.
 const greenShaders:WebGLShader[]=[];
 for(const[i,text]of [GREEN_GROUND_VERTEX_GLSL,GREEN_GROUND_FRAGMENT_GLSL].entries()){const shader=gl.createShader(i?gl.FRAGMENT_SHADER:gl.VERTEX_SHADER);if(!shader)throw Error('Green ground shader allocation failed');shaders.push(shader);greenShaders.push(shader);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Green ground '+(i?'fragment':'vertex')+' shader failed: '+(gl.getShaderInfoLog(shader)?.trim()||'No shader info log'));}
 greenProgram=gl.createProgram()??undefined;if(!greenProgram)throw Error('Green ground program allocation failed');for(const shader of greenShaders)gl.attachShader(greenProgram,shader);for(const name of ['a_position','a_normal','a_role']){const at=gl.getAttribLocation(program,name);if(at<0)throw Error('Missing shared green attribute');gl.bindAttribLocation(greenProgram,at,name);}gl.linkProgram(greenProgram);if(!gl.getProgramParameter(greenProgram,gl.LINK_STATUS))throw Error('Green ground program link failed: '+(gl.getProgramInfoLog(greenProgram)?.trim()||'No program info log'));for(const shader of greenShaders)gl.detachShader(greenProgram,shader);
 }finally{for(const s of shaders)gl.deleteShader(s);}}
 const layer={id,type:'custom' as const,renderingMode:'3d' as const,onAdd(_map:unknown,context:WebGLRenderingContext|WebGL2RenderingContext){if(!('createVertexArray'in context))throw Error('Environment requires shared WebGL2');const recover=regionalRecoveryNeeded||!!regionalController||!!regionalTarget?.stats.generation||!!hardController||!!hardTarget?.stats.generation;release();renderFailure=undefined;gl=context as WebGL2RenderingContext;
 regionalTarget=createGreenCoverageTarget({gl,store:resources,requestFrame:regionalWake});hardTarget=createHardSurfaceDisplayTarget({gl,store:resources,requestFrame:regionalWake});syncRegionalActive();
 const canvas=gl.canvas as unknown as EventTarget|undefined;if(canvas?.addEventListener){canvas.addEventListener('webglcontextlost',regionalLost);regionalLossUnwatch=()=>canvas.removeEventListener('webglcontextlost',regionalLost);}

 // Under page pressure nothing is compiled or allocated here: one ledger
 // wake-up lets a later frame admit, compile and allocate once.
 try{allocateGPU();if(recover&&!gl.isContextLost()){regionalRecoveryNeeded=false;onRegionalCoverageInvalidated?.();}}catch(error){release();throw error;}},
 // A lost context draws no mask: its pending admission is withdrawn on entry
 // and after a loss inside this frame, so a later ledger wave never repaints.
 render(_context:unknown,args:{defaultProjectionData?:{mainMatrix:ArrayLike<number>}}|ArrayLike<number>){if(gl?.isContextLost()){regionalLost();motion.setEnabled(false);shadowMask.cancelPending();return;}
 if(destroyed||!gl)return;if(!enabled||!visible||offscreen){regionalTarget?.step();hardTarget?.step();return;}
 const main='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;if(!main||main.length!==16)return;
 let regionalDrawn=false,hardDrawn=false;hardCaptureStale=false;
 let viewport:Int32Array|undefined;
 try{viewport=gl.getParameter(gl.VIEWPORT);if(gl.isContextLost()||!viewport||viewport.length!==4||viewport[2]<=0||viewport[3]<=0)return;
  // Compute a SAME-origin frame independently of the native publication. The
  // regional-only first frame has never called setFeatures/setGroundMesh, so
  // native anchor=[0,0]/unit=1 must never be paired with the city origin.
  const frame={matrix:regionalMatrix(main,sunOrigin),viewport:[viewport[0],viewport[1],viewport[2],viewport[3]] as const,origin:[sunOrigin[0],sunOrigin[1]] as const};
  if(regionalController)regionalController.step(frame,performance.now());else regionalTarget?.step();
  if(hardController)hardController.step(frame,performance.now());else hardTarget?.step();
  const generation=regionalTarget?.stats.generation,reference=regionalController?.originForGeneration(generation);
  if(regionalTarget&&generation&&reference){regionalDrawn=regionalTarget.draw(regionalMatrix(main,reference),{direction:sun.direction,daylight:sun.daylight,enabled:sceneEnvironment.sunlight});if(regionalDrawn)draws++;}
  const hardGeneration=hardTarget?.stats.generation,hardReference=hardController?.originForGeneration(hardGeneration);if(hardTarget&&hardGeneration&&hardReference){
   const matrix=regionalMatrix(main,hardReference),captureMatches=hardController?.captureMatchesGeneration(hardGeneration,matrix,viewport)===true;hardCaptureStale=!captureMatches;
   // A stale capture cannot suppress native geometry outside its old view.
   // With native ranges available, choose them until a current capture commits;
   // when none are available retain the old far capture as partial evidence.
   if(captureMatches||!hardRanges.length){hardDrawn=hardTarget.draw(matrix,{direction:sun.direction,daylight:sun.daylight,enabled:sceneEnvironment.sunlight});if(hardDrawn)draws++;}
  }
 }catch(error){viewport=undefined;regionalController?.cancel();regionalTarget?.cancel(String(error));hardController?.cancel();hardTarget?.cancel(String(error));console.error('Regional ground display failed',error);onRenderError?.(error);}
 // Native water/trees retain their programs and resident publication. Coverage
 // can still progress while that independent allocation waits on its ledger.
 if(!treeVao&&gpuDeferred&&(gpuWait||!allocateDeferredGPU()))return;if(!program||!treeVao||!waterVao)return;
 // MapLibre 6.11.2 dirties/restores its managed state after this custom layer
  // returns. Keep only real frame inputs and untracked line width, not a full
  // synchronous GL snapshot. Nested reflection/shadow helpers still restore us.
  let previousLineWidth:number|undefined;
  // The regional targets restore the viewport before returning to native draws.
  try{viewport??=gl.getParameter(gl.VIEWPORT);if(gl.isContextLost()||!viewport||viewport.length!==4||viewport[2]<=0||viewport[3]<=0)return;
  const depthRange=greenIndices||hardIndices?gl.getParameter(gl.DEPTH_RANGE):undefined;if(gl.isContextLost())return;
  if(lineIndices){previousLineWidth=gl.getParameter(gl.LINE_WIDTH);if(gl.isContextLost())return;}
  const reflected=reflection.capture(gl,{mainMatrix:main,viewportWidth:viewport[2],viewportHeight:viewport[3],planeWorldZ:.02/unit,quality,appearanceKey:sceneEnvironment.sunlight?sun.instantISO+'|sunlight':'surface-light-disabled',enabled:triIndices>0});if(gl.isContextLost())return;
  // Capture can become pending after the owner checked the idle clock.
  if(reflection.needsFrame)onFrameNeeded?.();
  gl.activeTexture(gl.TEXTURE0);gl.useProgram(program);uploadLight(gl,program,sun,sceneEnvironment.sunlight);gl.uniform1f(gl.getUniformLocation(program,'u_environment_time'),phase);gl.uniform1f(gl.getUniformLocation(program,'u_environment_wind'),SCENE_QUALITY_PROFILES.economy.windMetres);gl.uniform1f(gl.getUniformLocation(program,'u_environment_water_detail'),SCENE_QUALITY_PROFILES.economy.waterDetail);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);const scale=1/unit;const waterUniform=multiply(main,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,anchor[0],anchor[1],0,1]);gl.uniformMatrix4fv(gl.getUniformLocation(program,'u_matrix'),false,waterUniform);gl.uniform1i(gl.getUniformLocation(program,'u_environment_reflection_enabled'),Number(!!reflected));gl.uniform1i(gl.getUniformLocation(program,'u_environment_reflection'),0);gl.uniformMatrix4fv(gl.getUniformLocation(program,'u_environment_reflection_matrix'),false,reflected?multiply(reflected.mainMatrix,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,anchor[0],anchor[1],0,1]):waterUniform);if(reflected){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,reflected.texture);}const view=viewCache.read(waterUniform);gl.uniform3f(gl.getUniformLocation(program,'u_environment_eye'),...view.eye);gl.uniform3f(gl.getUniformLocation(program,'u_environment_view_direction'),...view.direction);gl.uniform1f(gl.getUniformLocation(program,'u_environment_perspective'),Number(view.perspective));if(Array.from(main).every(Number.isFinite)&&Array.from(waterUniform).every(Number.isFinite))lastWaterDiagnostic={revision:waterDiagnosticRevision,mainMatrix:Array.from(main),uniformMatrix:Array.from(waterUniform)};gl.uniform1i(gl.getUniformLocation(program,'u_environment_shadow_pass'),0);gl.uniform1i(gl.getUniformLocation(program,'u_tree'),0);gl.bindVertexArray(waterVao);if(triIndices){gl.drawElementsInstanced(gl.TRIANGLES,triIndices,gl.UNSIGNED_INT,0,1);draws++;if(gl.isContextLost())return;}if(lineIndices){gl.lineWidth(1);gl.drawElementsInstanced(gl.LINES,lineIndices,gl.UNSIGNED_INT,triIndices*4,1);draws++;if(gl.isContextLost())return;}if(hardIndices||greenIndices&&!regionalDrawn){
 const groundDepth=greenGroundDepthParameters(waterUniform,viewport,depthRange),groundMode=greenProgram&&groundDepth?'analytic-plane':'raster-fallback';if(hardIndices)hardDepthMode=groundMode;if(greenIndices&&!regionalDrawn)greenDepthMode=groundMode;
 if(greenProgram&&groundDepth){gl.useProgram(greenProgram);gl.uniformMatrix4fv(gl.getUniformLocation(greenProgram,'u_matrix'),false,waterUniform);uploadLight(gl,greenProgram,sun,sceneEnvironment.sunlight);gl.uniform3fv(gl.getUniformLocation(greenProgram,'u_green_depth_plane'),groundDepth.plane);gl.uniform4fv(gl.getUniformLocation(greenProgram,'u_green_viewport'),groundDepth.viewport);gl.uniform2fv(gl.getUniformLocation(greenProgram,'u_green_depth_range'),groundDepth.depthRange);}
 gl.enable(gl.BLEND);gl.blendEquationSeparate(gl.FUNC_ADD,gl.FUNC_ADD);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);if(hardIndices){gl.depthFunc(gl.LEQUAL);const generation=hardDrawn?hardTarget?.stats.generation:undefined;
  for(const range of hardRanges){const disposition=hardController?.dispositionForGeneration(generation,range.id);
   if(hardDrawn&&(disposition==='displayed'||disposition==='partial-held'))continue;
   gl.drawElementsInstanced(gl.TRIANGLES,range.count,gl.UNSIGNED_INT,(triIndices+lineIndices+greenIndices+range.start)*4,1);draws++;if(gl.isContextLost())return;}}if(greenIndices&&!regionalDrawn){gl.depthFunc(gl.LESS);gl.drawElementsInstanced(gl.TRIANGLES,greenIndices,gl.UNSIGNED_INT,(triIndices+lineIndices)*4,1);draws++;if(gl.isContextLost())return;}gl.depthFunc(gl.LEQUAL);gl.disable(gl.BLEND);gl.useProgram(program);}
  // Neither shadow pass below draws the shared mask this frame: withdraw its
  // pending admission, so a later ledger wake cannot repaint for nothing.
  if(!sceneEnvironment.shadows||!treeCount&&!(treeShadows.stats.count&&sun.shadowVector))shadowMask.cancelPending();
  if(treeCount&&sceneEnvironment.shadows){
   // The foot plane is above green(.01) and below water(.02). Strict LESS also
   // rejects quantized ties with water/building depth instead of painting over it.
   // Reuse the same MAX mask: dense contacts cannot accumulate into a black patch.
   gl.uniform1i(gl.getUniformLocation(program,'u_tree'),1);gl.uniform1i(gl.getUniformLocation(program,'u_environment_shadow_pass'),2);gl.depthFunc(gl.LESS);gl.depthMask(false);gl.bindVertexArray(treeVao);
   if(shadowMask.draw(gl,waterUniform,TREE_CONTACT_GROUND_HEIGHT_METRES,()=>gl!.drawElementsInstanced(gl!.TRIANGLES,contactIndices.length,gl!.UNSIGNED_SHORT,mesh.indices.byteLength,treeCount),[.15,.18,.21]))draws+=2;
   if(gl.isContextLost())return;gl.useProgram(program);gl.uniform1i(gl.getUniformLocation(program,'u_environment_shadow_pass'),0);gl.uniform1i(gl.getUniformLocation(program,'u_tree'),0);gl.bindVertexArray(waterVao);gl.disable(gl.BLEND);gl.depthMask(true);gl.depthFunc(gl.LEQUAL);
  }
  if(treeShadows.stats.count&&sceneEnvironment.shadows&&sun.shadowVector){uploadShadowInstances();gl.uniform1i(gl.getUniformLocation(program,'u_tree'),1);gl.uniform1i(gl.getUniformLocation(program,'u_environment_shadow_pass'),1);gl.uniform2f(gl.getUniformLocation(program,'u_environment_shadow_vector'),sun.shadowVector[0],sun.shadowVector[1]);gl.uniform1f(gl.getUniformLocation(program,'u_environment_shadow_opacity'),.18);gl.enable(gl.BLEND);gl.blendEquationSeparate(gl.FUNC_ADD,gl.FUNC_ADD);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.bindVertexArray(treeShadowVao!);if(shadowMask.draw(gl,waterUniform,.03,()=>gl!.drawElementsInstanced(gl!.TRIANGLES,mesh.indices.length,gl!.UNSIGNED_SHORT,0,treeShadows.stats.count),[.15,.18,.21]))draws+=2;if(gl.isContextLost())return;gl.uniform1i(gl.getUniformLocation(program,'u_environment_shadow_pass'),0);gl.depthMask(true);gl.disable(gl.BLEND);}
  if(treeCount){
   updateTreeSurfaceLOD(waterUniform,viewport);
   // Ground already receives projected building/tree shadows. Scope only the
   // final tree surfaces so neither green ground nor water is shaded twice.
   if(sceneEnvironment.sunlight&&sceneEnvironment.shadows&&sun.shadowVector)withSceneSolarShadowReceiver(gl,main,drawTreeSurfaces);
   else drawTreeSurfaces();
  }
 }catch(error){if(!gl.isContextLost()){renderFailure=String(error).slice(0,2048);enabled=false;motion.setEnabled(false);console.error('Environment rendering failed',error);onRenderError?.(error);}}finally{if(!gl.isContextLost()){gl.bindVertexArray(null);gl.activeTexture(gl.TEXTURE0);if(previousLineWidth!==undefined)gl.lineWidth(previousLineWidth);}else{motion.setEnabled(false);shadowMask.cancelPending();}}},onRemove(){release();}};
 return{layer,setGroundMesh,setGroundMeshes,get groundChunkTurnstile(){return chunkTurnstile;},get regionalCoverageTarget(){return regionalTarget;},get hardSurfaceDisplayTarget(){return hardTarget;},setHardSurfaceDisplayController(value:ReturnType<typeof createHardSurfaceDisplayController>|undefined){if(hardController===value)return;hardController?.destroy();hardController=value;syncRegionalActive();regionalWake();},setRegionalController(value:EnvironmentRegionalController|undefined){if(regionalController===value)return;regionalController?.destroy();regionalController=value;syncRegionalActive();regionalWake();},resetPlanarReflectionGPU(){reflection.resetGPU();},setReflectionSource(source:PlanarReflectionSource|undefined){reflection.setSource(source);map.triggerRepaint();},setFeatures(features:readonly EnvironmentFeature[],bounds:EnvironmentBox,waterAdmitted?:ReadonlySet<EnvironmentFeature>,camera?:ComponentViewportCamera,detail:'full'|'ground'='full',isHardVerified?:(feature:EnvironmentFeature)=>boolean){const admission=admitPublication(features,waterAdmitted,detail,!!isHardVerified);try{waterDiagnosticRevision++;treeShadowSourceRevision++;heldTrees=omittedTrees=heldWater=0;treeEvidence=[];treeCount=0;rowStats={instances:0,held:0,duplicate:0,candidates:0,truncated:false};woodlandStats={instances:0,generatedInstances:0};treeSelectionStats={};const firstPosition=(v:any):number[]=>typeof v?.[0]==='number'?v:Array.isArray(v)&&v.length?firstPosition(v[0]):[0,0];const first=origin??features.find(f=>f.geometry.type==='Point')?.geometry.coordinates??firstPosition(features[0]?.geometry.coordinates);sunOrigin=[first[0],first[1]];sun=sceneSolarLight(sunOrigin[0],sunOrigin[1],sunInstant);anchor=merc(first);unit=C*Math.cos(first[1]*Math.PI/180);treeShadows.setOrigin(sunOrigin);treeBoundarySHA=features[0]?.properties.source_boundary_sha256??'';if(features.some(f=>f.properties.source_boundary_sha256!==treeBoundarySHA))treeBoundarySHA='';const local=(q:number[])=>{const m=merc(q);return[(m[0]-anchor[0])*unit,-(m[1]-anchor[1])*unit];};const wp:number[]=[],wi:number[]=[],li:number[]=[];const boundary=verifiedBoundary?.boundarySHA256===treeBoundarySHA?verifiedBoundary:currentSolarShadowBoundary(treeBoundarySHA),seenTreePoints=new Set<string>();
 // The overview tier owns only exact source-green ground; do not even generate
 // native/row/woodland tree candidates or water geometry until full detail.
 if(detail==='full'){
 for(const f of features){if(f.properties.kind==='water'&&waterAdmitted?.has(f)===true&&['Polygon','MultiPolygon'].includes(f.geometry.type)){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const polygon of polygons){const rings=polygon.map((r:number[][])=>r.slice(0,-1)),xy:number[]=[],holes:number[]=[];let offset=0;for(let j=0;j<rings.length;j++){if(j)holes.push(offset);for(const q of rings[j])xy.push(...local(q));offset+=rings[j].length;}const triangle=earcut(xy,holes,2);if(!triangle.length||deviation(xy,holes,2,triangle)>1e-8||wp.length/7+offset>ENVIRONMENT_LIMITS.waterVertices||wi.length+li.length+triangle.length>ENVIRONMENT_LIMITS.waterIndices){heldWater++;continue;}const base=wp.length/7;for(let j=0;j<xy.length;j+=2)wp.push(xy[j],.02,xy[j+1],0,1,0,2);wi.push(...triangle.map(i=>base+i));}}
 else if(f.properties.kind==='water_line'&&waterAdmitted?.has(f)===true&&['LineString','MultiLineString'].includes(f.geometry.type)){const paths=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;for(const coords of paths){if(wp.length/7+coords.length>ENVIRONMENT_LIMITS.waterVertices||wi.length+li.length+(coords.length-1)*2>ENVIRONMENT_LIMITS.waterIndices){heldWater++;continue;}const base=wp.length/7;for(const p of coords){const q=local(p);wp.push(q[0],.025,q[1],0,1,0,2);}for(let i=1;i<coords.length;i++)li.push(base+i-1,base+i);}}else if(['water','water_line'].includes(f.properties.kind)){heldWater++;}}
 const rowView=camera?viewportQueryBounds(bounds,102.1,camera):bounds;
 const rows=treeRowDisplayCandidates(features,sunOrigin,rowView??bounds,boundary,mesh.horizontalRadiusMetres+.08),rowPositions:{x:number;z:number}[]=[];
 const woodView=camera?viewportQueryBounds(bounds,7.24,camera):bounds;
 const woodland=woodlandDisplayCandidates(features,sunOrigin,woodView??bounds,boundary,mesh.horizontalRadiusMetres+.08,rowPositions);
 const geographic=(x:number,z:number)=>{const wx=anchor[0]+x/unit,wy=anchor[1]-z/unit;return [wx*360-180,(2*Math.atan(Math.exp((.5-wy)*2*Math.PI))-Math.PI/2)*180/Math.PI];};
 function* candidates():Generator<DisplayTreeCandidate>{
  for(const f of features){if(f.properties.kind!=='tree'||seenTreePoints.has(f.id))continue;seenTreePoints.add(f.id);
   const p=f.geometry.coordinates,height=sourceTreeHeight(f.properties.osmTags),treeView=camera?viewportQueryBounds(bounds,height.metres*1.02+.1,camera):bounds;
   if(treeView&&(p[0]<treeView[0]||p[0]>treeView[2]||p[1]<treeView[1]||p[1]>treeView[3]))continue;
   if(f.properties.tree_crown_display_5m_guard!==true){heldTrees++;continue;}
   const xy=local(p);yield {id:f.id,kind:'native',lon:p[0],lat:p[1],x:xy[0],z:xy[1],height:height.metres,heightStatus:height.status,sourceHeight:height.raw,role:'source-point-display-schematic'};
  }
  // The row scan has at most 8192 slots. Preserve only its bounded exclusion
  // positions for woodland; all instance candidates go directly to selection.
  for(const row of rows.instances){rowPositions.push({x:row.x,z:row.z});const [lon,lat]=geographic(row.x,row.z);yield {...row,id:row.id+':row:'+row.rowSample,sourceId:row.id,kind:'row',lon,lat};}
  yield* woodland.instances;
 }
 const {selected,...selectionSummary}=selectEnvironmentTrees(candidates(),bounds,treeCap);treeSelectionStats=selectionSummary;
 let selectedRows=0,selectedWoodland=0;
 for(const tree of selected){trees.set([tree.x,tree.z,tree.height],treeCount*3);treeCount++;selectedRows+=Number(tree.kind==='row');selectedWoodland+=Number(tree.kind==='wood');treeEvidence.push({id:tree.sourceId??tree.id,displayId:tree.id,rowSample:tree.rowSample,heightStatus:tree.heightStatus,sourceHeight:tree.sourceHeight,displayHeightMetres:tree.height,role:tree.role});}
 omittedTrees=selectionSummary.omitted;
 rowStats={instances:selectedRows,generatedInstances:rowPositions.length,...rows.stats};
 woodlandStats={...woodland.stats,generatedInstances:woodland.generatedInstances,instances:selectedWoodland};
 }

 surfaceWaterVertices=wp.length/7;const green=greenGroundGeometry(features,sunOrigin,bounds,boundary,ENVIRONMENT_LIMITS.waterVertices-surfaceWaterVertices,ENVIRONMENT_LIMITS.waterIndices-wi.length-li.length);greenVertices=green.positions.length/7;greenIndices=green.indices.length;greenDepthMode='not-rendered';greenStats={admitted:green.admitted,held:green.held,omitted:green.omitted};for(const value of green.positions)wp.push(value);const gi=green.indices.map(i=>i+surfaceWaterVertices);
 // Each range is one exact verified native member. A published far target can
 // suppress only members its own catalog actually represented; on loss or
 // before publication every verified native range remains available.
 hardVertices=hardIndices=0;hardRanges=[];hardDepthMode='not-rendered';hardStats={admitted:0,heldTriangles:0,heldPolygons:0,omitted:0,conflicting:0,structural:0,sourceMismatch:0};
 const hi:number[]=[],hardSeen=new Set<string>();for(const feature of features){
  if(!isHardVerified?.(feature)||hardSeen.has(feature.id))continue;hardSeen.add(feature.id);
  const hard=hardSurfaceDisplayGeometry([feature],sunOrigin,bounds,boundary,Math.min(ENVIRONMENT_LIMITS.greenVertices-greenVertices-hardVertices,ENVIRONMENT_LIMITS.waterVertices-wp.length/7),Math.min(ENVIRONMENT_LIMITS.greenIndices-greenIndices-hardIndices,ENVIRONMENT_LIMITS.waterIndices-wi.length-li.length-greenIndices-hardIndices));
  const start=hi.length,offset=wp.length/7;for(const value of hard.positions)wp.push(value);for(const index of hard.indices)hi.push(index+offset);
  hardVertices+=hard.positions.length/7;hardIndices+=hard.indices.length;for(const key of ['admitted','heldTriangles','heldPolygons','omitted','conflicting','structural','sourceMismatch'] as const)hardStats[key]+=hard[key];
  if(hard.indices.length)hardRanges.push({id:feature.id,start,count:hard.indices.length});
 }

 treeLOD.setSelected(treeEvidence.map(tree=>tree.displayId!));surfaceDirty=true;
 packedGround=false;water=new Float32Array(wp);triIndices=wi.length;lineIndices=li.length;waterIndices=new Uint32Array([...wi,...li,...gi,...hi]);if(!triIndices)reflection.resetGPU();updateTreeShadows();commitPublication(admission);map.triggerRepaint();}catch(error){if(admission&&admission.claim!==publicationClaim)admission.claim.release();throw error;}},setEnabled(v:boolean){if(enabled===v)return;enabled=v;syncRegionalActive();if(v){if(renderFailure!==undefined&&gl&&!treeVao&&!gpuWait&&!destroyed&&!gl.isContextLost()){gpuDeferred=true;gpuPending=undefined;}renderFailure=undefined;treeLOD.setSelected(treeEvidence.map(tree=>tree.displayId!));surfaceDirty=true;}else{treeLOD.clear();shadowMask.cancelPending();}syncMotionEnabled();map.triggerRepaint();},setVisible(v:boolean){if(visible===v)return;visible=v;syncRegionalActive();if(!v)shadowMask.cancelPending();motion.setVisible(v);map.triggerRepaint();},setReducedMotion(v:boolean){ownerReducedMotion=v;motion.setReducedMotion(v||!sceneEnvironment.motion);map.triggerRepaint();},setOffscreen(v:boolean){offscreen=v;syncRegionalActive();if(v)shadowMask.cancelPending();motion.setOffscreen(v);},setSceneEnvironment(value:SceneEnvironmentState){const next=checkedSceneEnvironment(value),light=sceneSolarLight(sunOrigin[0],sunOrigin[1],next.instantISO);const motionChanged=next.motion!==sceneEnvironment.motion;sceneEnvironment=next;if(!next.shadows)shadowMask.cancelPending();sunInstant=next.instantISO;sun=light;quality=next.quality;updateTreeShadows();uploadShadowInstances();if(motionChanged)motion.setReducedMotion(ownerReducedMotion||!next.motion);map.triggerRepaint();},setQuality(v:SceneQuality){if(!['economy','balanced','detail'].includes(v))throw Error('Invalid scene quality');/* Legacy inputs retain the sole economy configuration. */},setSunlightInstant(instantISO:string){const next=sceneSolarLight(sunOrigin[0],sunOrigin[1],instantISO);sunInstant=instantISO;sun=next;updateTreeShadows();uploadShadowInstances();map.triggerRepaint();},animationFrame(now:number){if(renderFailure)return{active:regionalAnimating(),changed:regionalAnimating()};const result=motion.frame(now,SCENE_QUALITY_PROFILES.economy.environmentFPS);phase=result.seconds;return {active:result.active&&(treeCount>0||triIndices>0||lineIndices>0)||reflection.needsFrame||regionalAnimating(),changed:result.changed&&(treeCount>0||triIndices>0||lineIndices>0)||reflection.frame(now)||regionalAnimating()};},getProofSettlementKey(){const target=regionalTarget?.stats,hard=hardTarget?.stats,gate=chunkTurnstile.stats;return [renderFailure,gpuDeferred,regionalRecoveryNeeded,target?.state,target?.generation,target?.pendingGeneration,target?.coverageComplete,target?.sourceHeldGreen,target?.currentChunk,target?.retiring,hard?.state,hard?.generation,hard?.pendingGeneration,hard?.coverageComplete,hard?.sourceHeldHardSurface,hard?.currentChunk,hard?.retiring,hardController?.stats.active,hardController?.stats.generation,hardCaptureStale,gate.owner,JSON.stringify(gate.waiting),gate.budgetWaiters,reflection.getProofSettlementKey()] as const;},get stats(){return{quality,renderFailure,animationActive:enabled&&!gpuDeferred&&(motion.stats.active&&(treeCount>0||triIndices>0||lineIndices>0)||reflection.needsFrame)||regionalAnimating(),regionalCoverage:{target:regionalTarget?.stats,controller:regionalController?.stats,recoveryNeeded:regionalRecoveryNeeded},animation:motion.stats,sceneSunlight:sun,waterAnimation:'advected-multiscale-display-normals-not-measured-flow',waterLighting:'view-sun-specular-fresnel-and-analytic-sky',buildingReflection:reflection.stats,treeCanopy:mesh.canopy,treeHorizontalDisplayRadiusMetres:mesh.horizontalRadiusMetres,maximumCrownDisplacementMetres:SCENE_QUALITY_PROFILES.economy.windMetres,trees:treeCount,treeCap,treeTrianglesPerInstance:mesh.triangles,treeSurfaceLOD:{near:treeLOD.near,far:treeLOD.far,nearTrianglesPerInstance:mesh.triangles,farTrianglesPerInstance:farMesh.triangles,surfaceTriangles:treeLOD.near*mesh.triangles+treeLOD.far*farMesh.triangles,stateCount:treeLOD.stateCount,evaluations:treeLOD.evaluations,extraInstanceBufferBytes:surfaceTrees.byteLength},heldTrees,omittedTrees,heldWater,waterVertices:surfaceWaterVertices,waterTriangles:triIndices/3,greenGround:{...greenStats,depthMode:greenDepthMode,vertices:greenVertices,triangles:greenIndices/3,vertexStrideBytes:packedGround?16:28,constantNormalBytes:packedGround?12:0,vertexBufferBytes:packedGround?water.byteLength:greenVertices*28,indexBufferBytes:greenIndices*4,role:'source-green-ground-cover-not-uniform-lawn',alpha:.6},hardSurfaceDisplay:{...hardStats,target:hardTarget?.stats,controller:hardController?.stats,chunkTurnstile:chunkTurnstile.stats,vertices:hardVertices,triangles:hardIndices/3,depthMode:hardDepthMode,captureStale:hardCaptureStale,role:'declared-hard-surface-neutral-display',alpha:1,originalGreenHeldPreserved:true},woodland:{...woodlandStats},treeSelection:{...treeSelectionStats},treeRows:{...rowStats,spacingMetres:ENVIRONMENT_LIMITS.treeRowSpacingMetres,role:'source-line-display-schematic-not-source-tree-point'},unknownWidthWaterLineSegments:lineIndices/2,allocatedGPUBufferBytes:mesh.positions.byteLength+mesh.indices.byteLength+contactBytes+farMesh.positions.byteLength+farIndices.byteLength+trees.byteLength+surfaceTrees.byteLength+treeShadows.instances.byteLength+water.byteLength+waterIndices.byteLength,draws,drawBatchesMax:8+Number(greenIndices>0)+hardRanges.length,treeContact:{drawActive:enabled&&visible&&!offscreen&&sceneEnvironment.shadows&&treeCount>0,displayRadiusMetres:TREE_CONTACT_DISPLAY_RADIUS_METRES,receiverHeightMetres:TREE_CONTACT_GROUND_HEIGHT_METRES,maximumOpacity:TREE_CONTACT_MAX_OPACITY,sharedQuadBytes:contactBytes,noAdditionalGPUHandles:true},shadowMask:shadowMask.stats,treeShadows:{...treeShadows.stats,drawActive:enabled&&visible&&!offscreen&&sceneEnvironment.shadows&&treeShadows.stats.count>0},waterViewUpdates:viewCache.updates,noPick:true,noNewTimer:true,sourceWaterGeometryNotExpanded:true,resources:{ledger:'page-resource-budget',fixedCPUBytes:fixedCPU.bytes,publicationBytes:publicationClaim?.bytes??0,gpu:gpuLedger.stats,gpuBytes:gpuLedger.bytes,programAllowanceBytes:gpuLedger.stats.claims.programs??0,gpuDeferred,gpuPending:gpuPending&&{...gpuPending},admittedPublications,refusedPublications,physicalMemory:'unmeasured'}};},get treeDisplayEvidence(){return treeEvidence.slice();},getWaterProbe(lonlat:[number,number]){if(lonlat.length!==2||!lonlat.every(Number.isFinite)||Math.abs(lonlat[0])>180||Math.abs(lonlat[1])>85)return {status:'invalid-probe'};if(!lastWaterDiagnostic||lastWaterDiagnostic.revision!==waterDiagnosticRevision)return {status:'awaiting-valid-render'};const point=merc(lonlat),localPoint:[number,number]=[(point[0]-anchor[0])*unit,-(point[1]-anchor[1])*unit];const nearest:{triangleIndex:number;distanceM:number;centroidDistanceM:number;indices:number[];vertices:number[][]}[]=[];const segmentDistance=(a:number[],b:number[])=>{const dx=b[0]-a[0],dz=b[2]-a[2],length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((localPoint[0]-a[0])*dx+(localPoint[1]-a[2])*dz)/length)):0;return Math.hypot(localPoint[0]-a[0]-t*dx,localPoint[1]-a[2]-t*dz);};for(let i=0;i<triIndices;i+=3){const ids=[waterIndices[i],waterIndices[i+1],waterIndices[i+2]],v=ids.map(id=>[water[id*7],water[id*7+1],water[id*7+2]]);let positive=false,negative=false;for(let k=0;k<3;k++){const a=v[k],b=v[(k+1)%3],cross=(b[0]-a[0])*(localPoint[1]-a[2])-(b[2]-a[2])*(localPoint[0]-a[0]);positive ||= cross>0;negative ||= cross<0;}const distanceM=positive&&negative?Math.min(segmentDistance(v[0],v[1]),segmentDistance(v[1],v[2]),segmentDistance(v[2],v[0])):0,centroidDistanceM=Math.hypot(localPoint[0]-(v[0][0]+v[1][0]+v[2][0])/3,localPoint[1]-(v[0][2]+v[1][2]+v[2][2])/3);if(!Number.isFinite(distanceM)||!Number.isFinite(centroidDistanceM))continue;nearest.push({triangleIndex:i/3,distanceM,centroidDistanceM,indices:ids,vertices:v});nearest.sort((a,b)=>a.distanceM-b.distanceM||a.centroidDistanceM-b.centroidDistanceM||a.triangleIndex-b.triangleIndex);if(nearest.length>6)nearest.pop();}return {status:'ready',probeLonLat:[...lonlat],originWorld:[...anchor],metresPerWorldUnit:unit,localPoint:[...localPoint],waterRevision:waterDiagnosticRevision,mainMatrix:[...lastWaterDiagnostic.mainMatrix],uniformMatrix:[...lastWaterDiagnostic.uniformMatrix],waterTriangleCount:triIndices/3,nearestTriangles:nearest,maximumReturnedTriangles:6,sourceGeometryModified:false};},get waterAdmissionEvidence(){return{originWorld:anchor.slice(),metresPerWorldUnit:unit,positions:water.slice(0,surfaceWaterVertices*7),indices:waterIndices.slice(0,triIndices+lineIndices),triangleIndexCount:triIndices};},destroy(){if(destroyed)return;destroyed=true;enabled=false;motion.destroy();treeShadows.destroy();treeCount=0;treeEvidence=[];woodlandStats={};treeSelectionStats={};hardIndices=hardVertices=0;hardRanges=[];hardStats={admitted:0,heldTriangles:0,heldPolygons:0,omitted:0,conflicting:0,structural:0,sourceMismatch:0};greenIndices=greenVertices=surfaceWaterVertices=triIndices=lineIndices=0;greenStats={admitted:0,held:0,omitted:0};rowStats={instances:0,held:0,duplicate:0,candidates:0,truncated:false};water=new Float32Array();waterIndices=new Uint32Array();release();chunkTurnstile.destroy();reflection.destroy();publicationClaim?.release();publicationClaim=undefined;fixedCPU.release();}};
 }catch(error){fixedCPU.release();throw error;}
}
