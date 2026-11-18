import {createChunkAdmission} from '../../../safety/render-runtime/chunk-admission';
import {drawResidentTriangles} from '../../../safety/render-runtime/resident-index-convention';
import {createPaintProgramIdleRetirement} from '../../../safety/paint-program-idle-retirement';
import {currentPaintProgramGroups} from '../../../safety/current-paint-program-groups';
import {createPreparedSourceWorkspace} from '../../../safety/prepared-source';
import type {ResourceBudgetReservation} from '../../../safety/render-runtime/resource-budget';
import {describeShaderAssemblyBounds,shaderSourceBoundPart} from '../../../safety/render-runtime/shader-assembly-budget';
import type {PreparedSourceRecipe} from '../../../safety/prepared-source-contract';
import {shaderSourceParts,emitShaderSource,shaderSourceText,shaderSourceBounds,type ShaderSourcePart} from '../../../safety/render-runtime/shader-source-budget';
import {rathausCoincidentWallFragmentMasks} from '../../../safety/facade-rathaus-display-masks';
import {copyBuildingComponentMetadata,copyBuildingComponentReadback} from '../../../safety/component-readback';
import type {PlanarReflectionPreparationResult} from '../../../safety/planar-building-reflection';
import type {CaptureDemandChange} from '../../../safety/capture-resource-demand';
import {createResidentGeometryOwner,type ResidentGeometryLease} from '../../../safety/render-runtime/resident-geometry';
import {appendContiguousRendererSpan,coalesceRendererChunkGroups,rendererChunkPublicationCohorts,type RendererChunkInput,type RendererSourceGroup} from '../../../safety/renderer-chunk-input';
import type {ChunkResourceLease,ChunkResourceStore} from '../../../safety/render-runtime/chunk-resource-types';
import {acquirePackedChunk,adoptPackedChunkRoles,packChunkGeometry,packedChunkContentKey,retainChunkBindings,selectedChunkGroups,splitChunkRuns,validateChunkCohorts,type PackedBuildingChunk,type PreparedChunkBindings} from '../../delegated500/safety/renderer-packed-chunks';
import {utf8ByteLength} from '../../../safety/utf8-byte-length';
import {adjacentViewportPublicationSignal} from '../../../safety/viewport-request';
import {createProgramGrantHandoff} from '../../../safety/render-runtime/program-grant-handoff';
import {createProgramPreparationOwner,createProgramSourceAuthority,isProgramPreparationPending,ProgramPreparationPending} from '../../../safety/render-runtime/program-preparation';
import {captureMainDrawBindings,sameMainDrawBindings,type MainDrawBindings} from '../../../safety/render-runtime/main-draw-bindings';
import {createResidentCaptureRuntime,createResidentCaptureOwnership,type ResidentCaptureAdapter} from '../../../safety/render-runtime/resident-capture';
import {createSolarShadowPreparationBudget,solarShadowPreparation,prepareSolarShadowResources,type SolarShadowPreparationBudget,type SolarShadowPreparationResult} from '../../../safety/solar-shadow-preparation';
import {withSceneSolarShadowReceiver} from '../../../safety/scene-solar-shadow';
import {guardCustomLayerRender} from '../../../safety/custom-layer-render-error';
import {isSharedBerlinChurchFamily,createBerlinChurchProgramComparison,berlinChurchProgramKey,BERLIN_CHURCH_SHARED_FAMILIES} from './berlin-church-program-sharing';
import {createProjectedShadowMask} from '../../../safety/projected-shadow-mask';
import {specializeCurrentPaintFragment,currentPaintProgramKey,currentPaintProgramFamily,trimInactivePaintPrograms} from '../../delegated500/safety/current-paint-program';
import {paintProgramRuns,type PaintProgramRun} from '../../delegated500/safety/paint-program-runs';
import {paintBoxOutsideClip,paintRunIntersectsVisible,readPaintVisibility,forgetPaintVisibility} from '../../delegated500/safety/paint-run-visibility';
import {residentSolarShadowCoverage,withResidentReflectionClip,residentReflectionClipPlane,createResidentReflectionUniforms,planResidentReflectionChunks,createResidentReflectionObjects,type ResidentPlanarReflectionPass,type ResidentPlanarReflectionResult} from '../../../safety/resident-planar-reflection';
import {createResidentGPULifecycle} from '../../../safety/resident-gpu-lifecycle';
import type {ResidentDrawReadiness} from '../../../safety/resident-draw-readiness';
import {sceneSolarLight,SCENE_SHADOW_MIN_ALTITUDE_DEGREES} from '../../../safety/scene-solar-light';
import {SCENE_SURFACE_LIGHT_GLSL,createSceneLightUniforms} from '../../../safety/scene-surface-light';
import {defaultSceneEnvironment,checkedSceneEnvironment,type SceneEnvironmentState} from '../../../safety/scene-environment-state';
import {prepareSolarShadowBoundary,residentSolarShadowRanges,type PreparedSolarBoundary,type SolarShadowBoundary} from '../../../safety/solar-shadow-admission';
import {acceptPaintComponent} from '../../../safety/paint-ownership';
import {createRathausProxyMasks,RATHAUS_PROXY_MASK_GLSL} from './facade-rathaus-proxy-mask';
import {DESCRIPTION_BINDINGS} from './facade-description-bindings';
import {FACADE_OPENING_GLSL} from './facade-opening-primitives';
import {FACADE_LAYOUT_GLSL,uploadFacadeLayouts} from './facade-layouts';
import {facadePaintData} from './facade-paint-frame';
import {getFacadePaintFragmentGLSL,describeFacadePaintSourceBounds} from './facade-paint-fragment';
import {MUNICH_QUEUE_FRAGMENT_GLSL} from './facade-munich-queue-fragment';
import {paintMode,paintOverride} from './facade-paint-controls';
import {isSourceOnlyGlassRoof} from './source-glass-roof-style';
import type {NativeGroupDisplayPlan} from './native-part-display';
import {exactNativePartDisplay} from './source-part-display';
import {isFacadeLandmark} from './facade-landmark-registry';
import type {createOpenFacadeDiffuse} from './open-facade-diffuse';
import type {createOpenFacadeWindowTexture} from './open-facade-window-texture';
import {SOURCE_SHADOW_VERTEX_GLSL,SOURCE_SHADOW_FRAGMENT_GLSL,SOURCE_SHADOW_VECTOR,sourceShadowOpacity} from './source-shadow';
/** Source-owned roof/wall meshes on the existing MapLibre WebGL2 context. No second map engine. */
export type ShadowBatchAdmission={verifiedBoundarySHA256:string;profile:{schema_version:1;city:string;source_boundary_sha256:string;fixed_vector:readonly number[];swept_bbox_actual_city_covered:true;includes_growth_zero_to_one:true;status:'display-schematic'};components:readonly{objectId:string;partId:string;triangleCount:number}[]};
export type Identity={objectId:string;partId:string};
export type Polygon={type:'Polygon';coordinates:number[][][]};
export type SourceFeature={type:'Feature';geometry:unknown;properties:Record<string,unknown>|null;id?:unknown};
export type MeshBatch={positions:number[]|Float32Array;normals:number[]|Float32Array;indices:number[]|Uint32Array;color:number[]|Float32Array;faceRole?:'wall'|'roof'|'mixed';materialName?:string};
export type BuildingComponent=Identity&{city:string;origin:[number,number];componentGeometry:Polygon;sourceFeature:SourceFeature;batches:MeshBatch[];displayEstimates?:Record<string,unknown>;displaySupplement?:{id:string;sourceObjectId:string;addedVertices:number;addedTriangles:number}};
export type PreparedChurchBatches={readonly input:readonly BuildingComponent[];readonly signal:AbortSignal;readonly chunkInput?:RendererChunkInput<BuildingComponent>;releaseChunkDependencies():void;release():void};
type ChurchLoadedComponent=BuildingComponent&{generation:number;box:number[];start:number;end:number;firstVertex:number;lastVertex:number};
type ChurchPackedChunk={contentKey:string;source:RendererSourceGroup<BuildingComponent>;cpu:ChunkResourceLease<PackedBuildingChunk>;dynamic:ChunkResourceLease<Float32Array>;stateData:Float32Array;loaded:Map<string,ChurchLoadedComponent>;masks:ReturnType<typeof createRathausProxyMasks>;maskVisibilityKey:string;runs:PaintProgramRun[];anchor:[number,number];unit:number;firstIndex:number;firstVertex:number;geometry?:ResidentGeometryLease;shadow?:ResidentGeometryLease;shadowIndexCount?:number;shadowCPU?:ChunkResourceLease<Uint32Array>;stateDirty?:boolean;shadowIndices:Uint32Array};
export type SurfaceHit=Identity&{generation:number;viewRevision:number;hitLngLat:[number,number];hitAltitudeM:number;surface:'roof'|'wall';distance:number;opacityContext:'normal'|'route-selection';surfaceOpacity:number;occludesGround:boolean};
export type MapSurface={getCanvas():HTMLCanvasElement;on(type:string,fn:()=>void):void;off(type:string,fn:()=>void):void;triggerRepaint():void};
const C=2*Math.PI*6378137,EPS=1e-9;
const merc=(q:[number,number]):[number,number]=>[(q[0]+180)/360,(1-Math.log(Math.tan(Math.PI/4+q[1]*Math.PI/360))/Math.PI)/2];
const geo=(x:number,y:number):[number,number]=>[x*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI];
const unit=(lat:number)=>C*Math.cos(lat*Math.PI/180);
const key=(i:Identity)=>i.objectId+'|'+i.partId;
function multiply(a:ArrayLike<number>,b:ArrayLike<number>){const out=new Float64Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function inverse(m:ArrayLike<number>){const rows=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?m[c*4+r]:Number(c-4===r)));for(let c=0;c<4;c++){let p=c;for(let r=c+1;r<4;r++)if(Math.abs(rows[r][c])>Math.abs(rows[p][c]))p=r;if(Math.abs(rows[p][c])<1e-20)return;[rows[c],rows[p]]=[rows[p],rows[c]];const div=rows[c][c];for(let k=0;k<8;k++)rows[c][k]/=div;for(let r=0;r<4;r++)if(r!==c){const factor=rows[r][c];for(let k=0;k<8;k++)rows[r][k]-=factor*rows[c][k];}}return new Float64Array(Array.from({length:16},(_,i)=>rows[i%4][4+Math.floor(i/4)]));}
function project(m:ArrayLike<number>,x:number,y:number,z:number){const q=[x,y,z,1],o=[0,0,0,0];for(let r=0;r<4;r++)for(let c=0;c<4;c++)o[r]+=m[c*4+r]*q[c];return o.slice(0,3).map(n=>n/o[3]);}
const sub=(a:number[],b:number[])=>a.map((n,i)=>n-b[i]);const dot=(a:number[],b:number[])=>a.reduce((n,v,i)=>n+v*b[i],0);const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function triangle(origin:number[],direction:number[],a:number[],b:number[],c:number[]){const e1=sub(b,a),e2=sub(c,a),p=cross(direction,e2),det=dot(e1,p);if(Math.abs(det)<EPS)return;const inv=1/det,t=sub(origin,a),u=dot(t,p)*inv;if(u<0||u>1)return;const q=cross(t,e1),v=dot(direction,q)*inv;if(v<0||u+v>1)return;const distance=dot(e2,q)*inv;return distance>=0?{distance,normal:cross(e1,e2)}:undefined;}
function boxHit(origin:number[],direction:number[],box:number[]){let near=-Infinity,far=Infinity;for(let i=0;i<3;i++){if(Math.abs(direction[i])<EPS){if(origin[i]<box[i]||origin[i]>box[i+3])return false;continue;}let a=(box[i]-origin[i])/direction[i],b=(box[i+3]-origin[i])/direction[i];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return false;}return far>=0;}
function validate(c:BuildingComponent,city:string){if(c.city!==city||!/^osm\/(?:node|way|relation)\/[1-9]\d*$/.test(c.objectId)||!c.partId||c.partId.length>256||c.sourceFeature?.type!=='Feature'||c.componentGeometry?.type!=='Polygon'||!c.componentGeometry.coordinates.length||!c.origin.every(Number.isFinite)||Math.abs(c.origin[0])>180||Math.abs(c.origin[1])>85)throw Error('Invalid source component');let positions=0;for(const ring of c.componentGeometry.coordinates){if(ring.length<4||ring[0][0]!==ring.at(-1)![0]||ring[0][1]!==ring.at(-1)![1])throw Error('Invalid source ring');for(const p of ring)if(++positions>20000||p.length<2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90)throw Error('Invalid source footprint');}for(const m of c.batches){if(!m.positions.length||m.positions.length%3||m.normals.length!==m.positions.length||m.indices.length%3||m.color.length!==3||!m.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1)||!m.positions.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e6)||!m.normals.every(Number.isFinite)||!m.indices.every(v=>Number.isSafeInteger(v)&&v>=0&&v<m.positions.length/3))throw Error('Invalid source mesh');for(let i=1;i<m.positions.length;i+=3)if(m.positions[i]<-0.001)throw Error('Below-ground mesh needs separate source review');}}
const VERTEX=`#version 300 es
in vec4 a_paint_frame;in float a_paint_family;out vec4 v_paint_frame;flat out float v_paint_family;flat out vec3 v_munich_palette;uniform float u_paint_mode;in vec3 a_position;in vec3 a_normal;in vec3 a_color;in float a_selected;uniform mat4 u_matrix;uniform float u_style_scale;uniform vec2 u_style_offset;out vec3 v_color;out vec3 v_normal;out vec3 v_local_position;out float v_growth;flat out float v_style;flat out float v_selected;void main(){float growth=mod(a_selected,2.);float selected=step(2.,mod(a_selected,4.));v_style=floor(a_selected/4.);v_paint_frame=a_paint_frame;v_munich_palette=a_paint_frame.xzw;v_paint_frame.y*=growth;v_paint_family=a_paint_family;v_growth=growth;v_selected=selected;v_normal=normalize(vec3(a_normal.x,a_normal.y/max(growth,.005),a_normal.z));float light=.63+.37*max(0.,dot(v_normal,normalize(vec3(-.35,.8,.4))));float neutral=step(16.,mod(v_style,32.));vec3 neutralBase=mix(vec3(.94,.95,.97),vec3(1.,.99,.97),smoothstep(.25,.85,max(0.,v_normal.y)));v_color=(u_paint_mode<.5?neutralBase:u_paint_mode<1.5||abs(a_paint_family)<.5?mix(a_color,neutralBase,neutral):a_color)*light;v_local_position=vec3(a_position.x*u_style_scale+u_style_offset.x,a_position.y,a_position.z*u_style_scale+u_style_offset.y);gl_Position=u_matrix*vec4(a_position.x,a_position.y*growth,a_position.z,1.);}`;
const fragmentParts=(helper:string,paintFragment:string|ShaderSourcePart)=>shaderSourceParts`#version 300 es
precision highp float;in vec4 v_paint_frame;flat in float v_paint_family;flat in vec3 v_munich_palette;uniform float u_paint_mode;uniform float u_paint_override;in vec3 v_color;in vec3 v_normal;in vec3 v_local_position;in float v_growth;flat in float v_style;flat in float v_selected;uniform float u_opacity;out vec4 color;
${helper}
${SCENE_SURFACE_LIGHT_GLSL}
${RATHAUS_PROXY_MASK_GLSL}
${paintFragment}
${FACADE_OPENING_GLSL}
${FACADE_LAYOUT_GLSL}
void main(){if(v_growth<.005)discard;float semanticFamily=v_paint_family>=1000000.?floor(v_paint_family/10000.):v_paint_family;if(u_paint_mode>1.5&&v_paint_family>=1000000.&&nrCoveredProxyFragment(vec2(v_paint_frame.x,v_paint_frame.y/max(v_growth,.005)),v_paint_family))discard;vec3 styled=v_color;if(u_paint_mode>1.5){float lightDot=max(0.,dot(normalize(v_normal),normalize(vec3(-.35,.8,.4))));float paintLight=.63+.37*lightDot;if(v_paint_family>=365.&&v_paint_family<=377.)paintLight=.78+.22*lightDot;styled=paintedFacade(v_color/max(paintLight,.01),v_local_position,(((semanticFamily>=120.&&semanticFamily<=123.)||semanticFamily==129.||semanticFamily==171.||semanticFamily==234.||semanticFamily==235.||semanticFamily==236.||(semanticFamily>=300.&&semanticFamily<301.)||(semanticFamily>=180.&&semanticFamily<=211.)||(semanticFamily>=220.&&semanticFamily<=233.)||(semanticFamily>=140.&&semanticFamily<=149.)||(semanticFamily>=150.&&semanticFamily<170.)||(semanticFamily>=134.&&semanticFamily<=139.))?normalize(v_normal):(v_style>=32.||(v_paint_family!=107.||v_local_position.y>=70.)&&abs(cross(dFdx(v_local_position),dFdy(v_local_position)).y)>.001*max(length(cross(dFdx(v_local_position),dFdy(v_local_position))),.00001))?vec3(0.,1.,0.):normalize(v_normal)),v_paint_frame,abs(u_paint_override)>.01?u_paint_override:semanticFamily)*paintLight;}else if(u_paint_mode>.5&&step(16.,mod(v_style,32.))<.5&&!(v_style>=32.&&mod(v_style,8.)>6.5))styled=sourceFacade(v_color,v_local_position,normalize(v_normal),mod(v_style,8.),1.-step(8.,mod(v_style,16.)));float previousSceneLight=.63+.37*max(0.,dot(normalize(v_normal),normalize(vec3(-.35,.8,.4))));styled=sceneSurfaceLight(styled/max(previousSceneLight,.01),normalize(v_normal),v_local_position.y*v_growth);color=vec4(mix(styled,vec3(.98,.78,.3),v_selected*.65),u_opacity);}`;
const fragment=(helper:string,queueOnly=false,paintFragment?:string)=>queueOnly?MUNICH_QUEUE_FRAGMENT_GLSL:emitShaderSource(fragmentParts(helper,paintFragment??getFacadePaintFragmentGLSL()));
// The equality gate and GPU compiler use the same final submitted fragment.
const familyFragmentSource=(helper:string,family:number)=>withResidentReflectionClip(specializeCurrentPaintFragment(fragment(helper,false),family,true));
const churchColourSourceAuthority=createProgramSourceAuthority({inputs:['church-colour-assembly-v1','attributes:position-normal-color-selected-frame-family','material:static-v1'],builders:[fragment,familyFragmentSource,specializeCurrentPaintFragment,withResidentReflectionClip]});
/** Components must already be admitted against the exact municipal polygon by the source compiler. */
let churchChunkInstanceSequence=0;
export function createBuildingMeshRenderer(map:MapSurface,city:string,{mobile=false,id='source-building-meshes',reducedMotion=false,clock=()=>performance.now(),surfaceStyle, surfaceFragment,baseSurfaceFragment,windowTexture,diffuseFragment,diffuseTexture}:{mobile?:boolean;id?:string;reducedMotion?:boolean;clock?:()=>number;surfaceStyle?:(p:Record<string,unknown>|null)=>{styleId:number};surfaceFragment?:string;baseSurfaceFragment?:string;windowTexture?:ReturnType<typeof createOpenFacadeWindowTexture>;diffuseFragment?:string;diffuseTexture?:ReturnType<typeof createOpenFacadeDiffuse>}={}){
 const chunkStateOwner=++churchChunkInstanceSequence;
 let solarCaptureToken:string|undefined,reflectionCaptureToken:string|undefined,reflectionDemandPlanned=false,surfaceContentRevision=0;
 let reflectionDemandKeys=new Set<string>(),heldCaptureDemandKeys=new Set<string>();const reflectionProgramFailures=new Map<string,string>();
 let programPublicationRevision=0,packedPlanSequence=0,publishedPlanId:number|null=null;
 let berlinProgramComparison:ReturnType<typeof createBerlinChurchProgramComparison>|undefined,berlinComparisonFamily:number|undefined,berlinComparisonResult:boolean|undefined,berlinComparisonStep=0;
 let berlinComparisonCharacters=0,berlinComparisonUTF8Bytes=0;let berlinComparisonSourceReservation:ResourceBudgetReservation|undefined;
 function clearBerlinProgramComparison(){berlinProgramComparison?.clear();berlinComparisonSourceReservation?.release();berlinComparisonSourceReservation=undefined;berlinProgramComparison=undefined;berlinComparisonFamily=undefined;berlinComparisonResult=undefined;berlinComparisonStep=0;berlinComparisonCharacters=0;berlinComparisonUTF8Bytes=0;}
 function publishBerlinFamilySharing(){
  const canonical=currentPaintProgramKey(BERLIN_CHURCH_SHARED_FAMILIES[0]),redundant=new Set<WebGLProgram>();let shared=familyPrograms.get(canonical),changed=false;
  for(const family of BERLIN_CHURCH_SHARED_FAMILIES){const key=currentPaintProgramKey(family),value=familyPrograms.get(key);if(!value)continue;if(!shared)shared=value;if(value!==shared)redundant.add(value);if(key!==canonical){familyPrograms.delete(key);changed=true;}familyFailures.delete(key);}
  if(shared&&familyPrograms.get(canonical)!==shared){familyPrograms.set(canonical,shared);changed=true;}
  for(const value of redundant)programPreparation.releaseProgram(gl!,value);
  if(changed){captureRuntime.invalidate();reflectionResidentRevision++;}
 }
 function prepareBerlinFamilyComparison(priority:'visible'|'capture'='visible'){if(berlinSharedFamilyPrograms!==undefined)return true;if(!gl||destroyed||pageHidden||!enabled)return false;const probe=berlinProgramComparison??=(createBerlinChurchProgramComparison());berlinComparisonFamily??=probe.nextFamily;if(berlinComparisonFamily===undefined)return false;const family=berlinComparisonFamily,step=berlinComparisonStep,epoch=gpuGeneration;
  const ready=programPreparation.work(gl,{resource:'berlin-family-equivalence:'+step,revision:epoch,phase:'source-build',priority,current:()=>probe===berlinProgramComparison&&epoch===gpuGeneration&&!destroyed&&!pageHidden&&enabled&&(mainPaintDemand().runs.some(run=>isSharedBerlinChurchFamily(overrideProgramKey()??run.key))||[...reflectionCaptureKeys()].some(isSharedBerlinChurchFamily)),work(){const recipe=churchSourceRecipe(familySurfaceHelper,false),identity={},budget=geometryOwner.store.budget,output=budget.reserve({category:'program-source',bytes:recipe.sourceBounds!.sourceCharactersUpperBound*2,precision:'estimate',identity,label:'Church program equivalence output'});try{const submitted=withResidentReflectionClip(sourceWorkspace.prepareSource(recipe,[family]).fragment);if(probe!==berlinProgramComparison||epoch!==gpuGeneration)return;const cost={category:'program-source' as const,bytes:submitted.length*2,precision:'exact' as const,identity};output.adjust(cost);if(step===0){berlinComparisonSourceReservation=budget.reserve(cost);berlinComparisonCharacters=submitted.length;berlinComparisonUTF8Bytes=utf8ByteLength(submitted);}const result=probe.accept(submitted);if(result!==undefined){berlinComparisonResult=result;berlinComparisonCharacters=0;berlinComparisonUTF8Bytes=0;berlinComparisonSourceReservation?.release();berlinComparisonSourceReservation=undefined;}}finally{output.release();}}});
  if(!ready)return false;berlinComparisonFamily=undefined;berlinComparisonStep++;if(berlinComparisonResult!==undefined){berlinSharedFamilyPrograms=berlinComparisonResult;if(berlinSharedFamilyPrograms)publishBerlinFamilySharing();clearBerlinProgramComparison();return true;}map.triggerRepaint();return false;
 }

 const programPreparation=createProgramPreparationOwner('church '+city,()=>{if(!destroyed)map.triggerRepaint();});
 const programGrantHandoff=createProgramGrantHandoff<WebGL2RenderingContext,WebGLProgram>((context,value)=>programPreparation.releaseProgram(context,value));
 let grantHandoffGeneration:number|undefined;
 function clearProgramGrantHandoff(expectedGeneration?:number){if(expectedGeneration!==undefined&&grantHandoffGeneration!==expectedGeneration)return;grantHandoffGeneration=undefined;programGrantHandoff.clear();}
 let reflectionResidentRevision=0;const reflectionClipUniforms=createResidentReflectionUniforms(),reflectionObjectID=createResidentReflectionObjects();

 let sceneEnvironment=defaultSceneEnvironment(mobile),ownerReducedMotion=reducedMotion;let sceneSunInstant=sceneEnvironment.instantISO,sceneSunOrigin:[number,number]=[0,0],sceneSun=sceneSolarLight(0,0,sceneSunInstant);const uploadSceneLight=createSceneLightUniforms();
 let solarBoundary:PreparedSolarBoundary|undefined,shadowSourceBoundarySHA='',fixedShadowIndexBytes=0,fixedShadowRanges:{start:number;end:number;box:number[]}[]=[],solarShadowAdmitted=0,solarShadowWithheld=0,solarShadowMode='awaiting-boundary',solarShadowSignature='';let solarShadowAdmittedKeys=new Set<string>();
 let rathausProxyMasks=createRathausProxyMasks();
 // Local review pages with only material profiles use the compact equivalent
 // shader. An unsupported resident component restores the full program only
 // after its projected bounds enter the screen.
 let queueOnlyProgram=city==='munich'&&location.hostname==='127.0.0.1'&&/^munich-non500-row-/.test(new URLSearchParams(location.search).get('sample')??'');
 const queueFamilies=new Set([0,-99,286,287,290,293,295,296,297,298,363,364,365,366,369,370,372,373,374,375,376]);
 const unsupportedQueueComponents=new Set<string>();let fullProgramUpgradePending=false,fullProgramUpgradeFailure:string|undefined;
 const familySurfaceHelper=baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}';
 let berlinSharedFamilyPrograms:boolean|undefined;
 let gpuGeneration=0;let lastCompileAttempt:{requestedFamily:number;canonicalFamily:number;generation:number;gpuGeneration:number;stage:string;characters:number;sourceHash:string;contextLost:boolean;status:string;infoLog:string}|undefined;
 const familyPrograms=new Map<string,WebGLProgram>(),familyFailures=new Map<string,string>();let familyRuns:PaintProgramRun[]=[],familyPending=false,visibleFamilyCount=0,familyEvictions=0,lastFragmentCharacters=0;
 const programIdleRetirement=createPaintProgramIdleRetirement({
  programs:familyPrograms,
  required:()=>(!mainWorldMatrix) && !destroyed && !pageHidden && enabled
   ? new Set(familyPrograms.keys()) : new Set([...mainPaintProgramKeys(), ...captureProgramKeys()]),
  release:value=>{if(gl)programPreparation.releaseProgram(gl, value);familyEvictions++;reflectionResidentRevision++;}
 });

 const fullColourProgramKey='full-colour';
 const overrideProgramKey=()=>{const value=Math.fround(paintOverride());return Math.abs(value)>Math.fround(.01)?currentPaintProgramKey(value):undefined;};
 const linkedPaint=currentPaintProgramGroups('church',city);
 const mainFamilyProgramKey=(key:string)=>city==='berlin'?berlinChurchProgramKey(key,berlinSharedFamilyPrograms===true):linkedPaint.key(key);
 function mainPaintDemandFor(components:typeof loaded,runs:PaintProgramRun[],queue:boolean,clip:Float64Array|undefined,publication:object=sceneSpans){
  const visible=readPaintVisibility(components,runs,clip,{publication,generation,viewRevision,incarnation:mainGPUIncarnation,context:gl,active:!destroyed&&!pageHidden&&enabled});
  return{runs:!queue&&paintMode()>1.5?visible.runs:[],override:overrideProgramKey()};
 }
 function mainPaintDemand(){const scale=1/anchorUnit,clip=mainWorldMatrix?multiply(mainWorldMatrix,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,anchor[0],anchor[1],0,1]):matrix;return mainPaintDemandFor(loaded,familyRuns,queueOnlyProgram,clip);}
 /** Canonical program keys of the demanded runs. The non-enumerable requested
  * map keeps, per canonical key, the first key a run (or override) asked for:
  * compilation uses the canonical family, compile diagnostics the request. */
 function mainPaintProgramKeys(demand=mainPaintDemand()){const keys=new Set<string>(),requested=new Map<string,string>();for(const run of demand.runs){const asked=demand.override??run.key,key=mainFamilyProgramKey(asked);keys.add(key);if(!requested.has(key))requested.set(key,asked);}return Object.defineProperty(keys,'requested',{value:requested}) as Set<string>&{readonly requested:ReadonlyMap<string,string>};}
 function pruneProgramPreparation(){
  trimCapturePrograms();
  if(berlinProgramComparison&&!mainPaintDemand().runs.some(run=>isSharedBerlinChurchFamily(overrideProgramKey()??run.key))&&![...reflectionCaptureKeys()].some(isSharedBerlinChurchFamily))clearBerlinProgramComparison();
  if(fullProgramUpgradePending&&!hasVisibleUnsupportedQueueComponent()){if(pendingGeometry?.queueMode===false)discardPendingGeometry();else fullProgramUpgradePending=false;}
  programPreparation.prune();if(!programPreparation.hasPending&&!berlinProgramComparison)sourceWorkspace.clearPreparedSource();
 }
 let generation=0,viewRevision=0,enabled=false,opacity=1,opacityContext:'normal'|'route-selection'='normal',destroyed=false,gl:WebGL2RenderingContext|undefined,program:WebGLProgram|undefined,mainProgramFailure:string|undefined,texturedProgram:WebGLProgram|undefined,diffuseProgram:WebGLProgram|undefined,diffuseShaderFailure:string|undefined,diffuseShaderAttempted=false,textureShaderFailure:string|undefined,textureShaderAttempted=false,vao:WebGLVertexArrayObject|undefined,vertexBuffer:WebGLBuffer|undefined,indexBuffer:WebGLBuffer|undefined,stateBuffer:WebGLBuffer|undefined,paintBuffer:WebGLBuffer|undefined;
 let mainWorldMatrix:Float64Array|undefined,mainFrame=0,residentTextureStyles:number[]=[];
 type MainFrameWitness={incarnation:number;generation:number;geometryRevision:number;viewRevision:number;projection:Float64Array;bindings:MainDrawBindings;programs:Map<string,WebGLProgram>;empty:boolean};
 let mainGPUIncarnation=0,residentMainMasksReady=false,mainFrameWitness:MainFrameWitness|undefined,pendingMainFrame:MainFrameWitness|undefined;
 function invalidateMainFrame(){mainFrameWitness=undefined;pendingMainFrame=undefined;}
 function takeCompletedMainFrame():MainFrameWitness|undefined{const value=pendingMainFrame;pendingMainFrame=undefined;return value;}
 function mainBindingStamp(){const window=windowTexture?.stats,diffuse=diffuseTexture?.stats;return captureMainDrawBindings([paintMode(),paintOverride(),opacity,opacityContext,sceneSun.instantISO,Number(sceneEnvironment.sunlight),Number(facadeAttached),window?.residentRevision,window?.ready,window?.textureObjects,diffuse?.plaster.residentRevision,diffuse?.plaster.ready,diffuse?.brick.residentRevision,diffuse?.brick.ready,diffuse?.totalTextureObjects],sceneChunks);}
 function mainRolePrograms(){
  if(!program)return undefined;const roles=new Map<string,WebGLProgram>([['base',program]]);
  for(const key of mainPaintProgramKeys()){const value=key==='base'||key===currentPaintProgramKey(0)?program:familyPrograms.get(key);if(!value)return undefined;roles.set(key,value);}
  if(paintMode()===1&&landmarkVisible&&facadeAttached&&windowTexture?.stats.textureObjects){if(surfaceFragment){if(texturedProgram)roles.set('material:window',texturedProgram);else if(!textureShaderFailure)return undefined;}if(diffuseTexture?.stats.totalTextureObjects===2&&diffuseFragment){if(diffuseProgram)roles.set('material:diffuse',diffuseProgram);else if(!diffuseShaderFailure)return undefined;}}
  return roles;
 }
 function hasRequiredMainFailure(){if(geometryUploadFailure!==undefined||mainProgramFailure!==undefined||mainDrawFailure!==undefined||(queueOnlyProgram&&hasVisibleUnsupportedQueueComponent()&&fullProgramUpgradeFailure!==undefined))return true;for(const key of mainPaintProgramKeys())if(familyFailures.has(key))return true;return false;}
 function mainWitnessCurrent(value:MainFrameWitness|undefined){
  if(!value||destroyed||pageHidden||!enabled||!gl||gl.isContextLost()||!mainWorldMatrix||value.incarnation!==mainGPUIncarnation||value.generation!==generation||value.geometryRevision!==geometryPublishedRevision||value.viewRevision!==viewRevision||!sameMainDrawBindings(value.bindings,mainBindingStamp())||hasRequiredMainFailure())return false;
  for(let i=0;i<16;i++)if(!Number.isFinite(mainWorldMatrix[i])||value.projection[i]!==mainWorldMatrix[i])return false;
  if(value.empty)return !!residentGPU?.isEmptyReady();if(!gpuReady()||!matrix||!residentMainMasksReady)return false;const programs=mainRolePrograms();if(!programs||programs.size!==value.programs.size)return false;for(const [key,p]of programs)if(value.programs.get(key)!==p)return false;return true;
 }
 function mainFrameCurrent(){return mainWitnessCurrent(mainFrameWitness);}
 function captureMainFrameWitness(empty=false):MainFrameWitness|undefined{
  if(!mainWorldMatrix||!gl||gl.isContextLost()||destroyed||pageHidden||!enabled)return undefined;for(let i=0;i<16;i++)if(!Number.isFinite(mainWorldMatrix[i]))return undefined;const programs=empty?new Map<string,WebGLProgram>():mainRolePrograms();if(!programs)return undefined;return{incarnation:mainGPUIncarnation,generation,geometryRevision:geometryPublishedRevision,viewRevision,projection:new Float64Array(mainWorldMatrix),bindings:mainBindingStamp(),programs,empty};
 }
 function recordCompleteMainFrame(empty=false,expected?:MainFrameWitness){
  if(!mainWorldMatrix||!gl||gl.isContextLost()||destroyed||pageHidden||!enabled||hasRequiredMainFailure())return;for(let i=0;i<16;i++)if(!Number.isFinite(mainWorldMatrix[i]))return;
  if(empty){if(sceneIndexCount()||pendingGeometry||!residentGPU?.isEmptyReady())return;}else if(pendingGeometry||geometryUploadPending||!gpuReady()||!matrix||!residentMainMasksReady)return;
  const value=expected??captureMainFrameWitness(empty);if(!value||!mainWitnessCurrent(value))return;mainFrameWitness=value;

 }

 let matrix:Float64Array|undefined,anchor:[number,number]=[0,0],anchorUnit=1,sourceLoaded=new Map<string,BuildingComponent>(),nativeGroupPlan:NativeGroupDisplayPlan|undefined,loaded=new Map<string,BuildingComponent&{generation:number;box:number[];start:number;end:number;firstVertex:number;lastVertex:number}>();const vertexCap=mobile?100000:200000;let selectedIdentity:Identity|undefined,selectionActive=true;const birth=new Map<string,number>(),seenBirth=new Set<string>(),BIRTH_LIMIT=20000;let materialAnchor:[number,number]|undefined,materialUnit=1,needsBirth=true,pageHidden=false;
 // A refused mask admission is woken once by the page ledger and repaints this
 // map; a wait no longer wanted (shadows off, hidden, disabled, pass skipped)
 // is withdrawn; optional calls keep it a no-op where no such mask is bound.
 const shadowMask=createProjectedShadowMask({requestRepaint:()=>map.triggerRepaint()});
 let shadowGeometryRevision=0,shadowPreparationSignature='',shadowUploadedIndexCount=0;
 let shadowProgram:WebGLProgram|undefined,shadowVao:WebGLVertexArrayObject|undefined,shadowIndexBuffer:WebGLBuffer|undefined,shadowAdmittedComponents=0,shadowFailure=false,shadowDraws=0;
 const repaintPaint=()=>{invalidateMainFrame();mainDrawFailure=undefined;pruneProgramPreparation();map.triggerRepaint();};const paintCamera=(event:Event)=>{const p=(event as CustomEvent<{bearing?:number;pitch?:number;zoom?:number;center?:[number,number]}>).detail;const cameraMap=map as MapSurface&{easeTo?:(p:{pitch:number;bearing:number;zoom:number;duration:number;center?:[number,number]})=>void};cameraMap.easeTo?.({pitch:p?.pitch??60,bearing:p?.bearing??230,zoom:p?.zoom??17.2,duration:250,...(p?.center?{center:p.center}:{})});};document.addEventListener('facade-paint-camera',paintCamera);document.addEventListener('facade-paint-change',repaintPaint);const move=()=>{viewRevision++;matrix=undefined;mainWorldMatrix=undefined;invalidateMainFrame();pruneProgramPreparation();};map.on('move',move);map.on('resize',move);

const geometryOwner=createResidentGeometryOwner({firstVertexTriangles:true}),shadowGeometryOwner=createResidentGeometryOwner({firstVertexTriangles:true});
 const colourAttributes=['a_position','a_normal','a_color','a_selected','a_paint_frame','a_paint_family'];
 const sourceWorkspace=createPreparedSourceWorkspace({metadataHintSafe:true,budget:geometryOwner.store.budget,current:()=>!destroyed&&!pageHidden&&enabled&&!!gl&&!gl.isContextLost(),build:recipe=>recipe.sourceKey==='queue'?MUNICH_QUEUE_FRAGMENT_GLSL:getFacadePaintFragmentGLSL(),specialize(source,families){return{fragment:families.length?specializeCurrentPaintFragment(source,families.length===1?families[0]:families,true):source,depthEffects:false};}});
 function churchSourceRecipe(helper:string,queue:boolean):PreparedSourceRecipe{
  const raw=queue?shaderSourceBounds(shaderSourceText(MUNICH_QUEUE_FRAGMENT_GLSL,['church/munich-queue'])):describeFacadePaintSourceBounds(),paint=shaderSourceBoundPart(raw,churchColourSourceAuthority),shell=queue?paint:fragmentParts(helper,paint);
  return{sourceKey:queue?'queue':'paint',inputs:[helper,queue,fragmentParts,specializeCurrentPaintFragment,withResidentReflectionClip],sourceBounds:describeShaderAssemblyBounds(raw,shell,{reflectionClip:true}),assemble:paint=>queue?paint:fragment(helper,false,paint)};
 }

 type ChurchSceneSpan={chunk:ChurchPackedChunk;firstIndex:number;indexCount:number;localFirstIndex:number};
 let sceneSpans:ChurchSceneSpan[]=[];
 let sceneChunks:ChurchPackedChunk[]=[],sceneChunkBindings:PreparedChunkBindings<BuildingComponent>|undefined;
 let packingChunkInput:RendererChunkInput<BuildingComponent>|undefined,chunkStore:ChunkResourceStore|undefined;
 let legacyChunkSequence=0,chunkPreparationSequence=0;
 type ChurchCPUPreparation={token:number;signal:AbortSignal;release():void;receipt?:PreparedChurchBatches};
 let activeChunkPreparation:ChurchCPUPreparation|undefined;

 function capturePackedState(){return {sceneSpans,sceneChunks,sceneChunkBindings,heldSourceOutlines,sourceLoaded,nativeGroupPlan,generation,needsBirth,viewRevision,matrix,sceneSunOrigin,sceneSun,anchor,anchorUnit,materialAnchor,materialUnit,loaded,landmarkVisible,rathausProxyMasks,familyRuns,fixedShadowIndexBytes,fixedShadowRanges,shadowSourceBoundarySHA,solarShadowSignature,solarShadowAdmitted,solarShadowWithheld,shadowAdmittedComponents,shadowFailure,solarShadowAdmittedKeys,solarShadowMode};}
 function restorePackedState(value:ReturnType<typeof capturePackedState>){({sceneSpans,sceneChunks,sceneChunkBindings,heldSourceOutlines,sourceLoaded,nativeGroupPlan,generation,needsBirth,viewRevision,matrix,sceneSunOrigin,sceneSun,anchor,anchorUnit,materialAnchor,materialUnit,loaded,landmarkVisible,rathausProxyMasks,familyRuns,fixedShadowIndexBytes,fixedShadowRanges,shadowSourceBoundarySHA,solarShadowSignature,solarShadowAdmitted,solarShadowWithheld,shadowAdmittedComponents,shadowFailure,solarShadowAdmittedKeys,solarShadowMode}=value);}
 /** One main-program preparation attempt's pending account. heldOnly is true
  * only when the attempt returned false and every pending demand in it was a
  * page-ledger wait whose onAvailable wake the program owner holds
  * (programPreparation.needsFrameAfter was false right after that compile):
  * the wake repaints, so the caller asks no frame of its own. held names the
  * paint-family keys answered so. Any other pending, a failed family, a
  * cancellation or a pending texture leaves heldOnly false. */
 type MainProgramWait={heldOnly:boolean;held?:Set<string>};
 type GeometryCandidate={resident?:boolean;gpuIncarnation?:number;id:number;packed:ReturnType<typeof capturePackedState>;after?:ReturnType<typeof packBatches>;program?:WebGLProgram;queueMode?:false;signal?:AbortSignal;abortCleanup?:()=>void;families:Map<string,WebGLProgram>;captureKeys:Set<string>;mainKeys:Set<string>;materialKeys:Set<string>;mainDemandKnown:boolean;textured?:WebGLProgram;diffuse?:WebGLProgram;textureFailure?:string;diffuseFailure?:string;familyCompileFrame:number;maskReady:boolean};
 let pendingGeometry:GeometryCandidate|undefined,candidateFailureGeneration:number|undefined,mainDrawFailure:string|undefined;
 function candidateCurrent(value:GeometryCandidate){if(value.resident)return value.gpuIncarnation===mainGPUIncarnation&&value.packed.generation===generation&&value.packed.sceneChunks===sceneChunks&&!destroyed;return pendingGeometry===value&&!value.signal?.aborted&&!destroyed;}
 function candidateMatrix(value:GeometryCandidate){if(!mainWorldMatrix)return undefined;const {anchor,anchorUnit}=value.packed,scale=1/anchorUnit;return multiply(mainWorldMatrix,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,anchor[0],anchor[1],0,1]);}
 function candidatePaintDemand(value:GeometryCandidate){return mainPaintDemandFor(value.packed.loaded,value.packed.familyRuns,value.queueMode??queueOnlyProgram,candidateMatrix(value),value.packed.sceneSpans);}
 function candidatePaintKeys(value:GeometryCandidate){return mainPaintProgramKeys(candidatePaintDemand(value));}
 function createGeometryCandidate(packed:ReturnType<typeof capturePackedState>,after?:ReturnType<typeof packBatches>,signal?:AbortSignal):GeometryCandidate{
  const value:GeometryCandidate={id:++packedPlanSequence,packed,after,signal,families:new Map(),captureKeys:new Set(),mainKeys:new Set(),materialKeys:new Set(),mainDemandKnown:false,familyCompileFrame:-1,maskReady:false};
  if(signal){const aborted=()=>{if(pendingGeometry===value){const successor=adjacentViewportPublicationSignal(signal);if(successor)discardPendingGeometry(undefined,successor);else cancelCandidate(value.packed.generation);map.triggerRepaint();}};signal.addEventListener('abort',aborted,{once:true});value.abortCleanup=()=>signal.removeEventListener('abort',aborted);}
  return value;
 }
 function pendingGeometryBytes(){const value=pendingGeometry?.packed;if(!value)return 0;const residentKeys=new Set(sceneChunks.map(c=>c.contentKey));return value.sceneChunks.reduce((n,c)=>n+(residentKeys.has(c.contentKey)?0:sceneTypedBytes([c])),0);}
 function clearCandidateGPU(value:GeometryCandidate){if(gl?.isContextLost())clearProgramGrantHandoff();if(gl&&!gl.isContextLost()){if(value.program)programPreparation.releaseProgram(gl,value.program);if(value.textured)programPreparation.releaseProgram(gl,value.textured);if(value.diffuse)programPreparation.releaseProgram(gl,value.diffuse);for(const p of value.families.values())programPreparation.releaseProgram(gl,p);}value.program=undefined;value.textured=undefined;value.diffuse=undefined;value.textureFailure=undefined;value.diffuseFailure=undefined;value.families.clear();value.maskReady=false;for(const chunk of value.packed.sceneChunks)chunk.masks.detach();}
 function discardPendingGeometry(successorGeneration?:number,successorSignal?:AbortSignal){
  const value=pendingGeometry;pendingGeometry=undefined;value?.abortCleanup?.();if(value)value.abortCleanup=undefined;fullProgramUpgradePending=false;geometryUploadRevision++;geometryUploadPending=false;
  const grants=value?[value.program,...value.families.values(),value.textured,value.diffuse]:[];
  if(value){value.program=undefined;value.textured=undefined;value.diffuse=undefined;value.families.clear();value.mainKeys.clear();value.materialKeys.clear();value.captureKeys.clear();value.mainDemandKnown=false;}
  if(successorGeneration!==undefined||successorSignal!==undefined){grantHandoffGeneration=successorGeneration;if(value||!programGrantHandoff.matches(successorSignal))programGrantHandoff.replace(gl,grants,successorSignal);}else{clearProgramGrantHandoff();if(gl)for(const p of grants)if(p)programPreparation.releaseProgram(gl,p);}
  if(value&&value.packed.sceneChunks!==sceneChunks)releasePackedChunks(value.packed.sceneChunks,value.packed.sceneChunkBindings,new Set(sceneChunks.map(c=>c.masks)));programPreparation.prune();syncFacadeResources();
 }
 function cancelCandidate(expectedGeneration:number){clearProgramGrantHandoff(expectedGeneration);if(pendingGeometry?.packed.generation===expectedGeneration)discardPendingGeometry();if(candidateFailureGeneration===expectedGeneration){candidateFailureGeneration=undefined;geometryUploadFailure=undefined;fullProgramUpgradeFailure=undefined;}map.triggerRepaint();}
 function publishPackedGeometry(value:NonNullable<typeof pendingGeometry>){
  if(!candidateCurrent(value)||sceneIndexCount(value.packed.sceneChunks)&&!candidateMainReady(value))return;
  const contentChanged=generation!==value.packed.generation||sceneChunks!==value.packed.sceneChunks||queueOnlyProgram!==(value.queueMode??queueOnlyProgram);
  const previousChunks=sceneChunks,previousBindings=sceneChunkBindings,previousMasks=rathausProxyMasks,revision=viewRevision,oldProgram=program,oldTextured=texturedProgram,oldDiffuse=diffuseProgram,oldFamilies=[...familyPrograms.values()];
  adoptPackedChunkRoles(value.packed.sceneChunks);restorePackedState(value.packed);invalidateMainFrame();residentMainMasksReady=value.maskReady;if(contentChanged)surfaceContentRevision++;publishedPlanId=value.id;program=value.program;value.program=undefined;queueOnlyProgram=value.queueMode??queueOnlyProgram;programPublicationRevision++;viewRevision=Math.max(viewRevision,revision)+1;matrix=undefined;pendingGeometry=undefined;value.abortCleanup?.();value.abortCleanup=undefined;residentTextureStyles=value.after?.styles??residentTextureStyles;
  familyPrograms.clear();for(const [key,p]of value.families)familyPrograms.set(key,p);value.families.clear();familyFailures.clear();texturedProgram=value.textured;diffuseProgram=value.diffuse;value.textured=undefined;value.diffuse=undefined;textureShaderAttempted=!!texturedProgram||!!value.textureFailure;diffuseShaderAttempted=!!diffuseProgram||!!value.diffuseFailure;textureShaderFailure=value.textureFailure;diffuseShaderFailure=value.diffuseFailure;familyPending=false;visibleFamilyCount=0;fullProgramUpgradePending=false;fullProgramUpgradeFailure=undefined;candidateFailureGeneration=undefined;fullColourFailure=undefined;fullColourSourceCharacters=0;fullColourRevision++;clearBerlinProgramComparison();captureRuntime.invalidate();programPreparation.prune();
  if(gl){if(oldProgram)programPreparation.releaseProgram(gl,oldProgram);if(oldTextured)programPreparation.releaseProgram(gl,oldTextured);if(oldDiffuse)programPreparation.releaseProgram(gl,oldDiffuse);for(const p of oldFamilies)programPreparation.releaseProgram(gl,p);}
  if(previousChunks!==sceneChunks)releasePackedChunks(previousChunks,previousBindings,new Set(sceneChunks.map(c=>c.masks)));
  // A replaced scene-level mask that no chunk owns (the initial or empty-scene
  // scratch) has no other retirement path: destroy it and return its reservation.
  if(previousMasks!==rathausProxyMasks&&!sceneChunks.some(c=>c.masks===previousMasks)&&!previousChunks.some(c=>c.masks===previousMasks))previousMasks.destroy();
  try{if(value.after){retireUnloadedBirths();unsupportedQueueComponents.clear();if(queueOnlyProgram)for(const chunk of sceneChunks)for(const [id,c]of chunk.loaded)for(let vertex=c.firstVertex;vertex<c.lastVertex;vertex++)if(!queueFamilies.has(chunk.cpu.value!.paint[vertex*5+4])){unsupportedQueueComponents.add(id);break;}}syncFacadeResources();geometryPostPublishFailure=undefined;}catch(error){geometryPostPublishFailure=String(error).slice(0,512);map.triggerRepaint();}
 }
 function legacyChunkInput(components:BuildingComponent[]):RendererChunkInput<BuildingComponent>{
  const origin=components[0]?.origin??[0,0],contentKey=id+':legacy-unshared:'+ ++legacyChunkSequence;
  return{store:geometryOwner.store,groups:components.length?[{contentKey,components,parents:[],frame:{origin:[origin[0],origin[1]],unit:unit(origin[1]),authority:contentKey},cohortKeys:[],materialAuthority:contentKey,recipeAuthority:contentKey,selectedLOD:'canonical'}]:[],cohorts:[]};
 }
 function churchPackingInput(input:RendererChunkInput<BuildingComponent>,components:BuildingComponent[]):RendererChunkInput<BuildingComponent>{validateChunkCohorts(input);const rows=new Map(components.map(c=>[key(c),c])),dependencies=rathausCoincidentWallFragmentMasks(components).masks.map(mask=>{const outline=rows.get(key(mask.outline)),preferred=rows.get(key(mask.preferred));if(!outline||!preferred)throw Error('Verified proxy mask has no accepted source member');return{members:[outline,preferred],authority:'rathaus-proxy-fragment-mask-v1'};});return{...input,groups:coalesceRendererChunkGroups(input.groups,dependencies)};}
 function churchDrawableComponents(components:BuildingComponent[],nativeDisplay?:NativeGroupDisplayPlan){const sources=new Map(components.map(c=>[key(c),c])),held=new Set(nativeDisplay?.hiddenOutlines??[]);if([...held].some(c=>sources.get(key(c))!==c))throw Error('Unbound native display outline');return exactNativePartDisplay(components.filter(c=>!held.has(c))).drawable.filter(c=>acceptPaintComponent('church',c));}
 function buildChurchPackedGroup(group:{source:RendererSourceGroup<BuildingComponent>;components:BuildingComponent[]},cohortComponents:BuildingComponent[]=group.components):PackedBuildingChunk{
  const paint=facadePaintData(group.components),masks=createRathausProxyMasks();try{masks.configure(group.components,paint,cohortComponents);const geometry=packChunkGeometry(group.components,group.source.frame,paint,new Float32Array(),{merc:p=>merc([p[0],p[1]]),unit,included:()=>true,progressivePainted:()=>false,landmark:c=>isFacadeLandmark(c)&&!isSourceOnlyGlassRoof(c),style(c,b,j){const raw=c.sourceFeature.properties??{},landmark=isFacadeLandmark(c),glass=isSourceOnlyGlassRoof(c),wall=landmark?(surfaceStyle?.(raw).styleId??0)%16:24,roof=(landmark?(surfaceStyle?.({...raw,building:'roof','building:material':raw['roof:material']}).styleId??8)%16:24)+32;return glass||b.faceRole==='roof'||b.faceRole!=='wall'&&Math.abs(b.normals[j+1])>.2?roof:wall;}});return{...geometry,maskRecipe:masks.cpuRecipe()};}finally{masks.destroy();}
 }
 async function prepareBatches(components:BuildingComponent[],signal:AbortSignal,chunkInput?:RendererChunkInput<BuildingComponent>,preparation?:{nativeDisplay?:NativeGroupDisplayPlan}):Promise<PreparedChurchBatches>{
  signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');invalidateMainFrame();const previous=activeChunkPreparation,marker:ChurchCPUPreparation={token:++chunkPreparationSequence,signal,release(){}};activeChunkPreparation=marker;previous?.release();
  let bindings:PreparedChunkBindings<BuildingComponent>|undefined,rows:readonly BuildingComponent[]=components;const leases:ChunkResourceLease<PackedBuildingChunk>[]=[];let released=false;
  const release=()=>{if(released)return;released=true;if(activeChunkPreparation===marker)activeChunkPreparation=undefined;signal.removeEventListener('abort',release);for(const lease of leases)lease.release();leases.length=0;bindings?.release();bindings=undefined;rows=[];};
  marker.release=release;signal.addEventListener('abort',release,{once:true});
  try{bindings=chunkInput?retainChunkBindings(chunkInput):undefined;if(bindings)chunkStore=bindings.store;
   if(signal.aborted){release();signal.throwIfAborted();}
   if(bindings){const drawable=churchDrawableComponents(components,preparation?.nativeDisplay),physical=bindings.groups.flatMap(group=>[...group.components]).filter(component=>acceptPaintComponent('church',component));
    const source=bindings,advanceAdmission=createChunkAdmission(selectedChunkGroups(drawable,churchPackingInput(bindings,physical),physical),group=>{
     signal.throwIfAborted();if(released||destroyed)throw new DOMException('Church preparation superseded','AbortError');
     const contentKey=packedChunkContentKey('church:'+city,group.source,'position9-paint5-state1-v1'),estimate=group.components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3*60+b.indices.length*4,0),0);const lease=acquirePackedChunk(source.store,contentKey,estimate,()=>buildChurchPackedGroup(group,physical),signal,gl,undefined,group.components.length,group.source.parents);leases.push(lease);void lease.ready.catch(()=>{});
    });
    while(!advanceAdmission())await new Promise<void>(resolve=>setTimeout(resolve,0));
    await Promise.all(leases.map(lease=>lease.ready));
   }
   signal.throwIfAborted();if(destroyed||released||activeChunkPreparation!==marker)throw new DOMException('Aborted','AbortError');
   const prepared:PreparedChurchBatches={get input(){return rows;},signal,get chunkInput(){return bindings;},releaseChunkDependencies:release,release};marker.receipt=prepared;return prepared;
  }catch(error){release();throw error;}
 }
 function releasePackedChunks(chunks:readonly ChurchPackedChunk[],bindings?:PreparedChunkBindings<BuildingComponent>,keepMasks:ReadonlySet<ReturnType<typeof createRathausProxyMasks>>=new Set()){
  for(const chunk of chunks){chunk.cpu.release();chunk.dynamic.release();chunk.shadowCPU?.release();if(!keepMasks.has(chunk.masks))chunk.masks.destroy();}bindings?.release();
 }
 function sceneTypedBytes(chunks=sceneChunks){return chunks.reduce((n,c)=>{const p=c.cpu.value;return n+c.stateData.byteLength+(p&&c.shadowIndices===p.indices?0:c.shadowIndices.byteLength)+(p?p.vertices.byteLength+p.indices.byteLength+p.paint.byteLength+p.progressive.byteLength+p.initialState.byteLength:0);},0);}
 function sceneArrayBytes(field:'vertices'|'indices'|'paint'|'shadow'){const buffers=new Set<ArrayBufferLike>();let bytes=0;for(const chunk of sceneChunks){const data=field==='shadow'?chunk.shadowIndices:chunk.cpu.value?.[field];if(data&&!buffers.has(data.buffer)){buffers.add(data.buffer);bytes+=data.buffer.byteLength;}}return bytes;}
 function sceneShadowIndexCount(){return sceneChunks.reduce((sum,chunk)=>sum+chunk.shadowIndices.length,0);}
 function sceneIndexCount(chunks=sceneChunks){let count=0;for(const chunk of chunks)for(const row of chunk.loaded.values())count+=row.end-row.start;return count;}
 function sceneProgramRuns(chunks=sceneChunks,spans=sceneSpans){const result:PaintProgramRun[]=[];for(const span of spans){const data=span.chunk.cpu.value;if(!data)continue;for(const run of paintProgramRuns(data.indices,data.paint,currentPaintProgramKey,false)){const first=Math.max(span.localFirstIndex,run.firstIndex),end=Math.min(span.localFirstIndex+span.indexCount,run.firstIndex+run.indexCount);if(end>first){const firstIndex=span.firstIndex+first-span.localFirstIndex,previous=result.at(-1);if(previous?.key===run.key&&previous.firstIndex+previous.indexCount===firstIndex)previous.indexCount+=end-first;else result.push({key:run.key,firstIndex,indexCount:end-first});}}}return result;}
 function sceneVertexCount(chunks=sceneChunks){return chunks.reduce((n,c)=>n+(c.cpu.value?.vertices.length??0)/9,0);}
 function chunkForComponent(component:Identity,chunks=sceneChunks){const k=key(component);return chunks.find(chunk=>chunk.loaded.has(k));}
 function componentGrowth(component:Identity){const local=localComponent(component);return local?local.chunk.stateData[local.row.firstVertex]%2:1;}
 function prepareChunkMasks(chunks:readonly ChurchPackedChunk[],context:WebGL2RenderingContext,programs:readonly WebGLProgram[]){for(const chunk of chunks){const result=chunk.masks.prepare(context,programs);if(!result.ready)return result;}return{ready:true};}
 function localComponent(component:Identity,chunks=sceneChunks){const chunk=chunkForComponent(component,chunks);return chunk?{chunk,row:chunk.loaded.get(key(component))!}:undefined;}
 function packBatches(components:BuildingComponent[],nextGeneration:number,shadowAdmission?:ShadowBatchAdmission,nativeDisplay?:NativeGroupDisplayPlan){
  if(destroyed||!Number.isSafeInteger(nextGeneration)||nextGeneration<generation)throw Error('Invalid generation');
  const seen=new Set<string>();for(const c of components){validate(c,city);if(seen.has(key(c)))throw Error('Duplicate component identity');seen.add(key(c));}
  const nextSourceLoaded=new Map(components.map(c=>[key(c),c])),nativeHeld=new Set(nativeDisplay?.hiddenOutlines??[]);
  if([...nativeHeld].some(c=>nextSourceLoaded.get(key(c))!==c))throw Error('Unbound native display outline');
  const partPlan=exactNativePartDisplay(components.filter(c=>!nativeHeld.has(c)));heldSourceOutlines=partPlan.held;
  components=partPlan.drawable.filter(c=>acceptPaintComponent('church',c));
  const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0),ic=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.indices.length,0),0);
  if(count>vertexCap||ic>vertexCap*6)throw Error('Visible mesh budget exceeded');
  const input=packingChunkInput??legacyChunkInput(components),bindings=retainChunkBindings(input),previous=sceneChunks,next:ChurchPackedChunk[]=[];
  try{
   chunkStore=input.store;const physical=packingChunkInput?bindings.groups.flatMap(group=>[...group.components]).filter(component=>acceptPaintComponent('church',component)):components,groupedInput=churchPackingInput(bindings,physical),visibleKeys=new Set(components.map(key)),visibleStyles=new Set<number>();let firstIndex=0,firstVertex=0;
   for(const group of selectedChunkGroups(components,groupedInput,physical)){
    const contentKey=packedChunkContentKey('church:'+city,group.source,'position9-paint5-state1-v1');
    // The store keeps its bounded failure on the rejected ready promise only;
    // a synchronous producer failure is rethrown as the producer's own error
    // (same name and message), never as a generic not-ready error.
    let productionFailed=false,productionFailure:unknown;
    const cpu=acquirePackedChunk(input.store,contentKey,group.components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3*60+b.indices.length*4,0),0),()=>{try{return buildChurchPackedGroup(group,physical);}catch(error){productionFailed=true;productionFailure=error;throw error;}},undefined,undefined,undefined,group.components.length,group.source.parents);
    let dynamic:ChunkResourceLease<Float32Array>|undefined,masks:ReturnType<typeof createRathausProxyMasks>|undefined,ownsMask=false,registered=false;
    try{const packed=cpu.value;if(!packed){const failed=cpu.state==='failed'&&productionFailed;cpu.release();if(failed)throw productionFailure;throw Error('Church packed chunk is not synchronously ready');}
    const old=previous.find(c=>c.contentKey===contentKey),local=new Map<string,ChurchLoadedComponent>(),sources=new Map(group.components.map(c=>[key(c),c]));
    for(const row of packed.rows){const c=sources.get(key(row));if(!c)throw Error('Packed chunk source row is absent');if(!visibleKeys.has(key(row)))continue;local.set(key(c),{...c,generation:nextGeneration,box:[...row.box],start:row.start,end:row.end,firstVertex:row.firstVertex,lastVertex:row.lastVertex});}
    if(!packed.maskRecipe){cpu.release();throw Error('Church CPU chunk has no mask recipe');}const maskVisibilityKey=packed.maskRecipe.wordMasks.map((mask,index)=>visibleKeys.has(key(mask.preferred))?index:-1).filter(index=>index>=0).join(',');const reusedMasks=old?.maskVisibilityKey===maskVisibilityKey?old.masks:undefined;masks=reusedMasks??packed.maskRecipe.createBinding(components);ownsMask=!reusedMasks;
    dynamic=input.store.acquire<Float32Array>({contentKey:contentKey+':state:'+chunkStateOwner,role:'candidate',parents:[cpu],estimate:{category:'packed',bytes:packed.initialState.byteLength,precision:'exact'},produce:()=>packed.initialState.slice(),costs:value=>({category:'packed',bytes:value.byteLength,precision:'exact',identity:value.buffer})});if(!dynamic.value){dynamic.release();cpu.release();throw Error('Church chunk state is unavailable');}
    const chunk:ChurchPackedChunk={contentKey,source:group.source,cpu,dynamic,stateData:dynamic.value,loaded:local,masks,maskVisibilityKey,runs:queueOnlyProgram?[]:paintProgramRuns(packed.indices,packed.paint,currentPaintProgramKey,false),anchor:merc([group.source.frame.origin[0],group.source.frame.origin[1]]),unit:group.source.frame.unit,firstIndex,firstVertex,shadowIndices:new Uint32Array(),shadowIndexCount:0};
    next.push(chunk);registered=true;firstIndex+=packed.indices.length;firstVertex+=packed.vertices.length/9;for(const row of local.values())if(isFacadeLandmark(row)&&!isSourceOnlyGlassRoof(row))for(let vertex=row.firstVertex;vertex<row.lastVertex;vertex++)visibleStyles.add(Math.floor(packed.initialState[vertex]/4));
    }finally{if(!registered){cpu.release();dynamic?.release();if(ownsMask)masks?.destroy();}}
   }
   sceneChunks=next;sceneChunkBindings=bindings;sourceLoaded=nextSourceLoaded;nativeGroupPlan=nativeDisplay;generation=nextGeneration;needsBirth=true;viewRevision++;matrix=undefined;loaded=new Map();familyRuns=[];
   if(next.length){anchor=[...next[0].anchor];anchorUnit=next[0].unit;sceneSunOrigin=[...next[0].source.frame.origin];sceneSun=sceneSolarLight(sceneSunOrigin[0],sceneSunOrigin[1],sceneSunInstant);if(!materialAnchor){materialAnchor=[...anchor];materialUnit=anchorUnit;}}
   sceneSpans=[];let sceneAt=0,sceneVertex=0;
   for(const component of components){const chunk=next.find(c=>c.loaded.has(key(component)));if(!chunk)continue;const c=chunk.loaded.get(key(component))!,ratio=anchorUnit/chunk.unit,dx=(chunk.anchor[0]-anchor[0])*anchorUnit,dz=-(chunk.anchor[1]-anchor[1])*anchorUnit,box=c.box.map((v,i)=>v*ratio+(i%3===0?dx:i%3===2?dz:0)),indexCount=c.end-c.start;
    loaded.set(key(c),{...c,box,start:sceneAt,end:sceneAt+indexCount,firstVertex:sceneVertex,lastVertex:sceneVertex+c.lastVertex-c.firstVertex});
    appendContiguousRendererSpan(sceneSpans,{chunk,firstIndex:sceneAt,indexCount,localFirstIndex:c.start});
    for(const run of chunk.runs){const first=Math.max(c.start,run.firstIndex),end=Math.min(c.end,run.firstIndex+run.indexCount);if(end>first){const prior=familyRuns.at(-1),firstIndex=sceneAt+first-c.start;if(prior?.key===run.key&&prior.firstIndex+prior.indexCount===firstIndex)prior.indexCount+=end-first;else familyRuns.push({key:run.key,firstIndex,indexCount:end-first});}}
    sceneAt+=indexCount;sceneVertex+=c.lastVertex-c.firstVertex;
   }
   const first=next[0],packed=first?.cpu.value;if(!next.some(c=>c.masks===rathausProxyMasks)&&rathausProxyMasks!==previous[0]?.masks)rathausProxyMasks.destroy();rathausProxyMasks=first?.masks??createRathausProxyMasks();landmarkVisible=components.some(c=>isFacadeLandmark(c)&&!isSourceOnlyGlassRoof(c));
   admitShadow(shadowAdmission);updateSolarShadowIndices();return{components,styles:[...visibleStyles],shadowAdmission};
  }catch(error){releasePackedChunks(next,bindings,new Set(previous.map(c=>c.masks)));throw error;}
 }
 function setBatches(components:BuildingComponent[],nextGeneration:number,shadowAdmission?:ShadowBatchAdmission,nativeDisplay?:NativeGroupDisplayPlan,signal?:AbortSignal,prepared?:PreparedChurchBatches){
  signal=prepared?.signal??signal;signal?.throwIfAborted();if(prepared){if(activeChunkPreparation?.signal!==prepared.signal||activeChunkPreparation.receipt?.input!==prepared.input||prepared.input.length!==components.length||!prepared.input.every((c,i)=>c===components[i]))throw new DOMException('Superseded church chunk preparation','AbortError');}else activeChunkPreparation?.release();
  fullProgramUpgradeFailure=undefined;
  if(destroyed||!Number.isSafeInteger(nextGeneration)||nextGeneration<Math.max(generation,pendingGeometry?.packed.generation??generation))throw Error('Invalid generation');
  invalidateMainFrame();const published=capturePackedState(),publishedId=publishedPlanId,discardRevision=geometryUploadRevision;discardPendingGeometry(nextGeneration,signal);if(destroyed||signal?.aborted||pendingGeometry||publishedPlanId!==publishedId||geometryUploadRevision!==discardRevision+1){clearProgramGrantHandoff(nextGeneration);throw new DOMException('Superseded church publication','AbortError');}
  try{loaded=new Map();solarShadowAdmittedKeys=new Set();rathausProxyMasks=createRathausProxyMasks();packingChunkInput=prepared?.chunkInput;const after=packBatches(components,nextGeneration,shadowAdmission,nativeDisplay);signal?.throwIfAborted();pendingGeometry=createGeometryCandidate(capturePackedState(),after,signal);}
  catch(error){clearProgramGrantHandoff(nextGeneration);if(sceneChunks!==published.sceneChunks)releasePackedChunks(sceneChunks,sceneChunkBindings,new Set(published.sceneChunks.map(c=>c.masks)));if(rathausProxyMasks!==published.rathausProxyMasks&&!sceneChunks.some(c=>c.masks===rathausProxyMasks))rathausProxyMasks.destroy();throw error;}
  finally{packingChunkInput=undefined;restorePackedState(published);prepared?.release();}
  mainProgramFailure=undefined;mainDrawFailure=undefined;geometryUploadFailure=undefined;candidateFailureGeneration=undefined;
  if(!sceneIndexCount(pendingGeometry.packed.sceneChunks)){const value=pendingGeometry;releaseShadowGPU();geometryOwner.release();vao=undefined;vertexBuffer=undefined;indexBuffer=undefined;stateBuffer=undefined;paintBuffer=undefined;publishPackedGeometry(value);captureRuntime.invalidate();residentGPU?.beforeUpload();paintSelection();return;}
  upload();
 }
 function releaseShadowGPU(){for(const chunk of sceneChunks){chunk.shadow=undefined;chunk.shadowIndexCount=0;}shadowMask.release();shadowGeometryRevision++;shadowPreparationSignature='';shadowUploadedIndexCount=0;shadowGeometryOwner.release();if(gl&&shadowProgram)programPreparation.releaseProgram(gl,shadowProgram);shadowVao=undefined;shadowIndexBuffer=undefined;shadowProgram=undefined;}
 function admitShadow(value?:ShadowBatchAdmission){
  fixedShadowIndexBytes=0;fixedShadowRanges=[];shadowSourceBoundarySHA='';solarShadowSignature='';solarShadowAdmitted=solarShadowWithheld=0;shadowAdmittedComponents=0;shadowFailure=false;
  const p=value?.profile;
  if(!value||!p||p.schema_version!==1||p.city!==city||!/^([a-f0-9]{64})$/.test(value.verifiedBoundarySHA256)||p.source_boundary_sha256!==value.verifiedBoundarySHA256||p.status!=='display-schematic'||p.includes_growth_zero_to_one!==true||p.swept_bbox_actual_city_covered!==true||!Array.isArray(p.fixed_vector)||p.fixed_vector.length!==2||!p.fixed_vector.every((v,i)=>v===SOURCE_SHADOW_VECTOR[i])||!Array.isArray(value.components)||value.components.length>sourceLoaded.size)return;
  const admitted=new Map<string,number>();for(const e of value.components){if(!e||typeof e.objectId!=='string'||typeof e.partId!=='string'||!Number.isSafeInteger(e.triangleCount)||e.triangleCount<=0||admitted.has(key(e)))return;admitted.set(key(e),e.triangleCount);}
  const ranges=[];let count=0;for(const [id,c]of loaded){if(admitted.get(id)===(c.end-c.start)/3){ranges.push(c);count+=c.end-c.start;}}
  if(count>sceneIndexCount())return;setChunkShadowRanges(ranges);shadowAdmittedComponents=ranges.length;fixedShadowIndexBytes=count*4;fixedShadowIndexBytes=count*4;fixedShadowRanges=ranges;shadowSourceBoundarySHA=value.verifiedBoundarySHA256;
 }
 function updateSolarShadowIndices(){
  const clear=(mode:string)=>{solarShadowAdmittedKeys.clear();solarShadowAdmitted=0;solarShadowWithheld=loaded.size;solarShadowMode=mode;solarShadowSignature='none';const changed=sceneChunks.some(c=>c.shadowIndices.length>0);if(changed)setChunkShadowRanges([]);return changed;};
  if(!sceneSun.shadowVector)return clear('sun-below-shadow-altitude');
  if(!solarBoundary)return clear('awaiting-matching-verified-boundary');
  // loaded contains the actual accepted native/owner/derived display triangles after
  // all existing source, owner-shape, group and material validation. This new proof
  // does not label those display meshes native or rewrite their source admissions.
  const ranges=residentSolarShadowRanges(sceneSunOrigin,loaded.values(),sceneSun,solarBoundary,generation,sceneIndexCount());
  const publishAdmission=()=>{solarShadowAdmittedKeys.clear();for(const c of ranges)solarShadowAdmittedKeys.add(key(c));solarShadowAdmitted=ranges.length;solarShadowWithheld=loaded.size-ranges.length;solarShadowMode=solarShadowWithheld?'solar-projected-partial':'solar-projected';};
  const signature=String(generation)+'|'+ranges.map(c=>key(c)+':'+c.start+':'+c.end).join('|');if(signature===solarShadowSignature){publishAdmission();return false;}
  setChunkShadowRanges(ranges);solarShadowSignature=signature;publishAdmission();return true;
 }
 function setChunkShadowRanges(ranges:readonly Identity[]){
  const wanted=new Set(ranges.map(key)),nextSubsets:{chunk:ChurchPackedChunk;indices:Uint32Array;lease?:ChunkResourceLease<Uint32Array>}[]=[];
  try{for(const chunk of sceneChunks){
   const data=chunk.cpu.value;if(!data)throw Error('Church shadow CPU parent is unavailable');const rows=[...chunk.loaded.values()].filter(c=>wanted.has(key(c))),count=rows.reduce((n,c)=>n+c.end-c.start,0);
   if(!count||count===data.indices.length){nextSubsets.push({chunk,indices:count?data.indices:new Uint32Array()});continue;}
   const contentKey=chunk.contentKey+':shadow-indices:'+rows.map(c=>c.start+':'+c.end).join(','),store=sceneChunkBindings?.store;if(!store)throw Error('Scene chunk source binding is absent');
   const next=store.acquire<Uint32Array>({contentKey,role:'dependency',parents:[chunk.cpu],estimate:{category:'shadow',bytes:count*4,precision:'exact'},produce(){const out=new Uint32Array(count);let at=0;for(const c of rows){out.set(data.indices.subarray(c.start,c.end),at);at+=c.end-c.start;}return out;},costs:value=>({category:'shadow',bytes:value.byteLength,precision:'exact',identity:value.buffer})});
   if(!next.value){next.release();throw Error('Church shadow indices are unavailable');}nextSubsets.push({chunk,indices:next.value,lease:next});
  }}catch(error){for(const next of nextSubsets)next.lease?.release();throw error;}
  for(const next of nextSubsets){next.chunk.shadowCPU?.release();next.chunk.shadowCPU=next.lease;next.chunk.shadowIndices=next.indices;}
 }

 function uploadShadow(){
  shadowUploadPending=true;if(!gl||!sceneChunks.some(c=>c.shadowIndices.length)){shadowUploadPending=false;releaseShadowGPU();return;}
  try{
   if(!shadowProgram)shadowProgram=programPreparation.compile(gl,{resource:'projected-shadow',sharedKey:'projected-shadow-v1',inputs:[SOURCE_SHADOW_VERTEX_GLSL,SOURCE_SHADOW_FRAGMENT_GLSL],budget:{sourceBytesUpperBound:2*(SOURCE_SHADOW_VERTEX_GLSL.length+SOURCE_SHADOW_FRAGMENT_GLSL.length)},current:()=>!destroyed&&!pageHidden&&enabled,build(){return{vertex:SOURCE_SHADOW_VERTEX_GLSL,fragment:SOURCE_SHADOW_FRAGMENT_GLSL,attributes:[]};}});
   const signature=solarShadowSignature+'|'+geometryOwner.scene.version;if(shadowPreparationSignature!==signature){shadowPreparationSignature=signature;shadowGeometryRevision++;}
   const revision=shadowGeometryRevision,chunks=sceneChunks,current=()=>revision===shadowGeometryRevision&&chunks===sceneChunks&&!destroyed&&!pageHidden&&enabled;
   const ready=programPreparation.work(gl,{resource:'shadow-geometry-upload',revision,current,work(){const leases:ResidentGeometryLease[]=[];try{for(const chunk of chunks){if(!chunk.shadowIndices.length)continue;const parent=chunk.geometry,main=parent?.value;if(!parent||!main)throw Error('Shadow chunk has no live main parent');const lease=shadowGeometryOwner.allocate(gl!,shadowProgram!,{revision,contentKey:chunk.contentKey+':shadow:'+chunkStateOwner+':'+solarShadowSignature,current,parents:[parent,...(chunk.shadowCPU?[chunk.shadowCPU]:[])],indices:chunk.shadowIndices,buffers:[{key:'static',buffer:main.buffers.get('static')!,attributes:[{name:'a_position',size:3,stride:36,offset:0}]},{key:'state',buffer:main.buffers.get('state')!,attributes:[{name:'a_selected',size:1,stride:4,offset:0}]}]});leases.push(lease);}if(!shadowGeometryOwner.publish(leases,{generation:revision,context:gl,current}))throw new DOMException('Shadow chunk publication superseded','AbortError');const published=new Map(shadowGeometryOwner.currentLeases.map(lease=>[lease.contentKey,lease]));let shadowIndex=0;for(const chunk of chunks){chunk.shadow=chunk.shadowIndices.length?published.get(leases[shadowIndex++].contentKey):undefined;chunk.shadowIndexCount=chunk.shadow?chunk.shadowIndices.length:0;}const first=shadowGeometryOwner.currentGeometries[0];shadowVao=first?.vao;shadowIndexBuffer=first?.indexBuffer;shadowUploadedIndexCount=chunks.reduce((n,c)=>n+(c.shadowIndexCount??0),0);}finally{for(const lease of leases)lease.release();}}});if(ready)shadowUploadPending=false;
  }catch(error){if(isProgramPreparationPending(error))return;shadowUploadPending=false;shadowFailure=true;if(!shadowUploadedIndexCount||gl.isContextLost())releaseShadowGPU();}
 }
 function uploadState(contentChanged=true){if(!sceneChunks.some(chunk=>chunk.stateDirty))return;if(contentChanged)surfaceContentRevision++;if(!gl||gl.isContextLost())return;reflectionResidentRevision++;const old=gl.getParameter(gl.ARRAY_BUFFER_BINDING);try{for(const chunk of sceneChunks){const buffer=chunk.geometry?.value?.buffers.get('state');if(chunk.stateDirty&&buffer){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,chunk.stateData);if(!gl.isContextLost())chunk.stateDirty=false;}}}finally{if(!gl.isContextLost())gl.bindBuffer(gl.ARRAY_BUFFER,old);}}
 let geometryUploadRevision=0,geometryPublishedRevision=-1,geometryUploadPending=false,geometryUploadFailure:string|undefined,geometryPostPublishFailure:string|undefined,shadowUploadPending=false;
 function candidateTexturePending(value:GeometryCandidate){
  if(paintMode()!==1||!value.packed.landmarkVisible)return false;
  const window=windowTexture?.stats,diffuse=diffuseTexture?.stats,styles=value.after?.styles??residentTextureStyles;
  // Failed optional pixels keep the original fallback; an in-flight download
  // keeps the previous resident until its selected material is settled.
  if(window&&!window.ready&&!window.error)return true;
  if(diffuse&&styles.some(style=>style<32&&[0,3,4].includes(style%8))&&!diffuse.plaster.ready&&!diffuse.plaster.error)return true;
  if(diffuse&&styles.some(style=>style<32&&style%8===1)&&!diffuse.brick.ready&&!diffuse.brick.error)return true;
  return false;
 }
 function candidateMainReady(value:GeometryCandidate){
  if(!mainWorldMatrix||!candidateCurrent(value)||!value.program||!value.maskReady||candidateTexturePending(value))return false;
  for(const key of candidatePaintKeys(value))if(key!==currentPaintProgramKey(0)&&!value.families.has(key))return false;
  if(paintMode()===1&&value.packed.landmarkVisible){const window=windowTexture?.stats,diffuse=diffuseTexture?.stats;if(window?.textureObjects&&surfaceFragment&&!value.textured&&!value.textureFailure)return false;if(window?.textureObjects&&diffuse?.totalTextureObjects===2&&diffuseFragment&&!value.diffuse&&!value.diffuseFailure)return false;}
  return true;
 }
 function refreshCandidateCapture(value:GeometryCandidate){
  if(value.resident){value.captureKeys=captureProgramKeys();return;}
  if(!gl||!mainWorldMatrix||!candidateCurrent(value))return;
  const possible=new Set(value.packed.familyRuns.map(run=>mainFamilyProgramKey(overrideProgramKey()??run.key)));
  if(!(value.queueMode??queueOnlyProgram)&&paintMode()>1.5)possible.add(fullColourProgramKey);
  if(value.packed.landmarkVisible){possible.add('material:window');possible.add('material:diffuse');}
  const active=captureProgramKeys();value.captureKeys=new Set([...active].filter(key=>possible.has(key)));
  const main=candidatePaintKeys(value);
  for(const [key,p]of value.families)if(!main.has(key)&&!value.captureKeys.has(key)){value.families.delete(key);programPreparation.releaseProgram(gl,p);}
  for(const key of value.captureKeys){
   if(key===currentPaintProgramKey(0)||value.families.has(key)||key==='material:window'&&value.textured||key==='material:diffuse'&&value.diffuse)continue;
   const material=key==='material:window'||key==='material:diffuse',helper=key==='material:window'?surfaceFragment:key==='material:diffuse'?diffuseFragment:familySurfaceHelper;if(!helper)continue;
   const next=programPreparation.acquireReadyProgram(gl,colourProgramRecipe(helper,material||key===fullColourProgramKey?0:currentPaintProgramFamily(key),key===fullColourProgramKey,value.queueMode??queueOnlyProgram,material?key:undefined,value,true));
   if(!next)continue;if(!candidateCurrent(value)){programPreparation.releaseProgram(gl,next);return;}if(key==='material:window')value.textured=next;else if(key==='material:diffuse')value.diffuse=next;else value.families.set(key,next);
  }
 }
 function createResidentMainPlan():GeometryCandidate{
  return{resident:true,gpuIncarnation:mainGPUIncarnation,id:publishedPlanId??0,packed:capturePackedState(),families:familyPrograms,captureKeys:new Set(),mainKeys:new Set(),materialKeys:new Set(),mainDemandKnown:false,familyCompileFrame:-1,
   get program(){return program;},set program(value){program=value;},get textured(){return texturedProgram;},set textured(value){texturedProgram=value;textureShaderAttempted=!!value;},get diffuse(){return diffuseProgram;},set diffuse(value){diffuseProgram=value;diffuseShaderAttempted=!!value;},
   get textureFailure(){return textureShaderFailure;},set textureFailure(value){textureShaderFailure=value;textureShaderAttempted=!!value;},get diffuseFailure(){return diffuseShaderFailure;},set diffuseFailure(value){diffuseShaderFailure=value;diffuseShaderAttempted=!!value;},get maskReady(){return residentMainMasksReady;},set maskReady(value){residentMainMasksReady=value;}};
 }
 function prepareResidentMain(wait?:MainProgramWait){
  if(wait){wait.heldOnly=false;wait.held?.clear();}if(!sceneIndexCount())return false;
  try{return prepareMainPrograms(createResidentMainPlan(),wait);}catch(error){if(wait)wait.heldOnly=false;if(isProgramPreparationPending(error))return false;if(!gl?.isContextLost())mainProgramFailure=String(error).slice(0,512);invalidateMainFrame();return false;}
 }
 function candidateMaterialKeys(value:GeometryCandidate){
  const keys=new Set<string>();if(paintMode()!==1||!value.packed.landmarkVisible)return keys;
  const window=windowTexture?.stats,diffuse=diffuseTexture?.stats;
  if(window?.textureObjects&&surfaceFragment&&(value.textured||value.textureFailure===undefined))keys.add('material:window');
  if(window?.textureObjects&&diffuse?.totalTextureObjects===2&&diffuseFragment&&(value.diffuse||value.diffuseFailure===undefined))keys.add('material:diffuse');
  return keys;
 }
 function candidateTextureRecipesKnown(value:GeometryCandidate){
  if(paintMode()!==1||!value.packed.landmarkVisible)return true;const window=windowTexture?.stats,diffuse=diffuseTexture?.stats;
  if(window&&!window.textureObjects&&!window.error)return false;
  return !(window?.textureObjects&&diffuse&&diffuse.totalTextureObjects!==2&&!diffuse.plaster.error&&!diffuse.brick.error);
 }
 function prepareMainPrograms(value:GeometryCandidate,wait?:MainProgramWait){
  if(wait){wait.heldOnly=false;wait.held?.clear();}if(!gl||!enabled||pageHidden||gl.isContextLost()||!mainWorldMatrix||!candidateCurrent(value))return false;
  const clip=candidateMatrix(value);
  if(!value.resident&&queueOnlyProgram&&value.queueMode!==false){let unsupported=false;for(const c of value.packed.loaded.values()){if(clip&&paintBoxOutsideClip(c.box,clip))continue;const local=localComponent(c,value.packed.sceneChunks);if(local)for(let vertex=local.row.firstVertex;vertex<local.row.lastVertex;vertex++)if(!queueFamilies.has(local.chunk.cpu.value!.paint[vertex*5+4])){unsupported=true;break;}if(unsupported)break;}if(unsupported){value.queueMode=false;value.packed.familyRuns=sceneProgramRuns(value.packed.sceneChunks,value.packed.sceneSpans);if(value.program)programPreparation.releaseProgram(gl,value.program);value.program=undefined;value.maskReady=false;}}
  syncFacadeResources();if(value.resident&&city==='berlin'&&berlinSharedFamilyPrograms===undefined&&mainPaintDemand().runs.some(run=>isSharedBerlinChurchFamily(overrideProgramKey()??run.key)))prepareBerlinFamilyComparison();const paintKeys=candidatePaintKeys(value);value.mainKeys=paintKeys;value.materialKeys=candidateMaterialKeys(value);value.mainDemandKnown=true;
  refreshCandidateCapture(value);const keys=value.mainKeys;
  for(const [key,p]of value.families)if(!keys.has(key)&&!value.captureKeys.has(key)){value.families.delete(key);programPreparation.releaseProgram(gl,p);value.maskReady=false;}
  if(value.textured&&!value.materialKeys.has('material:window')&&!value.captureKeys.has('material:window')){const p=value.textured;value.textured=undefined;programPreparation.releaseProgram(gl,p);value.maskReady=false;}
  if(value.diffuse&&!value.materialKeys.has('material:diffuse')&&!value.captureKeys.has('material:diffuse')){const p=value.diffuse;value.diffuse=undefined;programPreparation.releaseProgram(gl,p);value.maskReady=false;}
  // framePending: some pending demand is not a held page-ledger wait.
  programPreparation.prune();let pending=false,framePending=false;
  if(!value.program){const budgetWaits=programPreparation.budgetWaits;try{const next=compileGeometryProgram(familySurfaceHelper,0,0,false,value.queueMode??queueOnlyProgram,undefined,value);if(!candidateCurrent(value)){programPreparation.releaseProgram(gl,next);return false;}value.program=next;value.maskReady=false;}catch(error){if(!isProgramPreparationPending(error))throw error;pending=true;if(programPreparation.needsFrameAfter?.(budgetWaits)!==false)framePending=true;if(!candidateCurrent(value)||gl.isContextLost())return false;}}
  for(const key of keys){if(key===currentPaintProgramKey(0)||value.families.has(key))continue;if(value.resident&&familyFailures.has(key)){pending=true;framePending=true;continue;}value.familyCompileFrame=mainFrame;const budgetWaits=programPreparation.budgetWaits;try{const next=compileGeometryProgram(familySurfaceHelper,currentPaintProgramFamily(key),currentPaintProgramFamily(paintKeys.requested?.get(key)??key),false,value.queueMode??queueOnlyProgram,undefined,value);if(!candidateCurrent(value)){programPreparation.releaseProgram(gl,next);return false;}value.families.set(key,next);familyFailures.delete(key);value.maskReady=false;}catch(error){if(!isProgramPreparationPending(error)){if(!value.resident)throw error;if(!gl.isContextLost())familyFailures.set(key,String(error).slice(0,256));pending=true;framePending=true;continue;}pending=true;if(programPreparation.needsFrameAfter?.(budgetWaits)!==false)framePending=true;else wait?.held?.add(key);if(!candidateCurrent(value)||gl.isContextLost())return false;}}
  for(const kind of ['window','diffuse']as const){const key=kind==='window'?'material:window':'material:diffuse',helper=kind==='window'?surfaceFragment:diffuseFragment;if(!value.materialKeys.has(key)||(kind==='window'?value.textured:value.diffuse))continue;const budgetWaits=programPreparation.budgetWaits;try{const next=compileGeometryProgram(helper!,0,0,false,value.queueMode??queueOnlyProgram,key,value);if(!candidateCurrent(value)){programPreparation.releaseProgram(gl,next);return false;}if(kind==='window')value.textured=next;else value.diffuse=next;value.maskReady=false;}catch(error){if(isProgramPreparationPending(error)){pending=true;if(programPreparation.needsFrameAfter?.(budgetWaits)!==false)framePending=true;if(!candidateCurrent(value)||gl.isContextLost())return false;continue;}if(gl.isContextLost())return false;if(kind==='window')value.textureFailure=String(error);else value.diffuseFailure=String(error);value.materialKeys.delete(key);}}
  programPreparation.prune();if(candidateTextureRecipesKnown(value))clearProgramGrantHandoff(value.packed.generation);
  if(pending||!value.program||candidateTexturePending(value)){if(wait)wait.heldOnly=pending&&!framePending&&!candidateTexturePending(value);return false;}
  const masks=prepareChunkMasks(value.packed.sceneChunks,gl,[value.program,...[...value.families].filter(([key])=>keys.has(key)).map(([,p])=>p),...(value.textured&&value.materialKeys.has('material:window')?[value.textured]:[]),...(value.diffuse&&value.materialKeys.has('material:diffuse')?[value.diffuse]:[])]);if(!masks.ready){if(gl.isContextLost()){clearCandidateGPU(value);return false;}throw Error(masks.reason??'Candidate mask preparation failed');}value.maskReady=true;
  return candidateMainReady(value);
 }
 function prepareGeometryUpload(){
  if(!gl||!geometryUploadPending)return;const value=pendingGeometry;if(!value)return;
  try{
   // Held page-ledger waits only: the program owner's onAvailable wake repaints.
   const ledgerWait:MainProgramWait={heldOnly:false};if(!prepareMainPrograms(value,ledgerWait)){if(!ledgerWait.heldOnly)map.triggerRepaint();return;}
   const revision=geometryUploadRevision,activeProgram=value.program;
   const ready=programPreparation.work(gl,{resource:'geometry-upload',revision,retainReady:false,current:()=>revision===geometryUploadRevision&&candidateMainReady(value)&&!pageHidden&&enabled&&!gl?.isContextLost(),work:uploadPreparedGeometry});
   if(ready&&geometryPublishedRevision===revision&&program===activeProgram&&pendingGeometry===undefined)geometryUploadPending=false;
  }catch(error){if(gl.isContextLost()){if(pendingGeometry===value)clearCandidateGPU(value);return;}if(isProgramPreparationPending(error))return;if(pendingGeometry===value){candidateFailureGeneration=value.packed.generation;geometryUploadFailure=String(error).slice(0,512);if(value.queueMode===false)fullProgramUpgradeFailure=geometryUploadFailure;discardPendingGeometry();}map.triggerRepaint();}
 }
 function upload(){invalidateMainFrame();geometryUploadFailure=undefined;captureRuntime.invalidate();if(!pendingGeometry)pendingGeometry=createGeometryCandidate(capturePackedState());geometryUploadRevision++;geometryUploadPending=true;map.triggerRepaint();if(!residentGPU?.beforeUpload()&&!program)return;prepareGeometryUpload();}
 function uploadPreparedGeometry(){
  if(!gl)return;const value=pendingGeometry;if(!value||!candidateMainReady(value))return;refreshCandidateCapture(value);if(!candidateMainReady(value))return;
  const packed=value.packed,revision=geometryUploadRevision,targetProgram=value.program!,context=gl,current=()=>revision===geometryUploadRevision&&candidateMainReady(value)&&!pageHidden&&enabled,leases:ResidentGeometryLease[]=[];
  writeChunkSelection(packed.sceneChunks);
  try{
   for(const chunk of packed.sceneChunks){const data=chunk.cpu.value;if(!data)throw Error('Packed chunk retired before upload');
    const staticLease=geometryOwner.allocate(context,targetProgram,{revision,contentKey:chunk.contentKey+':gpu-static-v2',current,parents:[chunk.cpu],indices:data.indices,buffers:[{key:'static',data:data.vertices,attributes:[{name:'a_position',size:3,stride:36,offset:0},{name:'a_normal',size:3,stride:36,offset:12},{name:'a_color',size:3,stride:36,offset:24}]},{key:'paint',data:data.paint,attributes:[{name:'a_paint_frame',size:4,stride:20,offset:0,required:false},{name:'a_paint_family',size:1,stride:20,offset:16,required:false}]}]});
    try{const staticGeometry=staticLease.value;if(!staticGeometry)throw Error('Static chunk geometry is unavailable');leases.push(geometryOwner.allocate(context,targetProgram,{revision,contentKey:chunk.contentKey+':gpu-binding-v2:'+chunkStateOwner,current,parents:[staticLease,chunk.dynamic,...chunk.source.parents],indices:data.indices,indexBuffer:staticGeometry.indexBuffer,buffers:[{key:'static',buffer:staticGeometry.buffers.get('static')!,attributes:[{name:'a_position',size:3,stride:36,offset:0},{name:'a_normal',size:3,stride:36,offset:12},{name:'a_color',size:3,stride:36,offset:24}]},{key:'state',data:chunk.stateData,dynamic:true,attributes:[{name:'a_selected',size:1,stride:4,offset:0}]},{key:'paint',buffer:staticGeometry.buffers.get('paint')!,attributes:[{name:'a_paint_frame',size:4,stride:20,offset:0,required:false},{name:'a_paint_family',size:1,stride:20,offset:16,required:false}]}]}));}finally{staticLease.release();}
   }
   if(!geometryOwner.publish(leases,{generation:packed.generation,context,current,cohorts:packed.sceneChunkBindings?rendererChunkPublicationCohorts(packed.sceneChunkBindings,packed.sceneChunks.map((chunk,i)=>({source:chunk.source,contentKey:leases[i].contentKey}))):[]}))throw new DOMException('Church chunk publication superseded','AbortError');
   const published=new Map(geometryOwner.currentLeases.map(lease=>[lease.contentKey,lease]));
   for(let i=0;i<packed.sceneChunks.length;i++)packed.sceneChunks[i].geometry=published.get(leases[i].contentKey);
   const first=geometryOwner.currentGeometries[0];vao=first?.vao;indexBuffer=first?.indexBuffer;vertexBuffer=first?.buffers.get('static');stateBuffer=first?.buffers.get('state');paintBuffer=first?.buffers.get('paint');
   geometryPublishedRevision=revision;publishPackedGeometry(value);if(revision!==geometryUploadRevision||pendingGeometry!==undefined||program!==targetProgram||publishedPlanId!==value.id)return;
   geometryUploadPending=false;geometryUploadFailure=undefined;residentGPU?.published();reflectionResidentRevision++;
   try{releaseShadowGPU();uploadShadow();paintSelection();}catch(error){geometryPostPublishFailure=String(error).slice(0,512);map.triggerRepaint();}
  }finally{for(const lease of leases)lease.release();}
 }
 function rememberFinishedBirth(k:string){if(seenBirth.has(k))seenBirth.delete(k);seenBirth.add(k);}
 function reserveBirthSlot(){while(seenBirth.size+birth.size>=BIRTH_LIMIT){let evicted=false;const selected=selectedIdentity?key(selectedIdentity):undefined;for(const old of seenBirth){if(!loaded.has(old)&&old!==selected){seenBirth.delete(old);evicted=true;break;}}if(!evicted)return false;}return true;}
 function retireUnloadedBirths(){for(const k of birth.keys())if(!loaded.has(k)){birth.delete(k);rememberFinishedBirth(k);}}
 function grow(){if(!needsBirth&&!birth.size)return;const now=clock(),finished=new Set<string>();let changed=false,growing=false;for(const[k,time]of birth)if(now-time>=300){birth.delete(k);finished.add(k);rememberFinishedBirth(k);}for(const c of loaded.values()){const k=key(c);if(!needsBirth&&!birth.has(k)&&!finished.has(k))continue;if(reducedMotion&&!seenBirth.has(k)){if(reserveBirthSlot())rememberFinishedBirth(k);}else if(seenBirth.has(k)){seenBirth.delete(k);seenBirth.add(k);}if(!reducedMotion&&!seenBirth.has(k)&&!birth.has(k)&&reserveBirthSlot())birth.set(k,now);const time=birth.get(k),t=reducedMotion||time===undefined?1:Math.max(0,Math.min(1,(now-time)/300)),growth=t*t*(3-2*t);growing ||= growth<1;const local=localComponent(c);if(!local)continue;const data=local.chunk.stateData,row=local.row;if(Math.abs((data[row.firstVertex]%2)-growth)<=1e-6)continue;for(let i=row.firstVertex;i<row.lastVertex;i++){const state=data[i],style=Math.floor(state/4),select=Math.floor((state%4)/2);data[i]=style*4+select*2+growth;}local.chunk.stateDirty=true;changed=true;}needsBirth=false;if(changed){viewRevision++;uploadState();}
 // Solar prerender precedes this update: capture the ready mesh on one final
 // frame, including reduced motion with unchanged full-height vertices.
 if(!pageHidden&&(growing||birth.size===0))map.triggerRepaint();}
 function gpuReady(){return !!(gl&&program&&sceneChunks.length&&!gl.isContextLost()&&sceneChunks.every(c=>c.geometry&&!c.geometry.released&&c.geometry.context===gl&&c.geometry.epoch===geometryOwner.store.contextEpoch(gl!)&&!!c.geometry.value));}
 function contextLost(){geometryOwner.contextLost();shadowGeometryOwner.contextLost();programPreparation.contextLost();releaseGPU(true);}
 function contextRestored(){if(destroyed||!gl||gl.isContextLost())return;releaseGPU(true);move();map.triggerRepaint();}
 map.on('webglcontextlost',contextLost);map.on('webglcontextrestored',contextRestored);
 let heldSourceOutlines:ReturnType<typeof exactNativePartDisplay>['held']=[];let landmarkVisible=false,facadeAttached=false;
 function syncFacadeResources(){const candidate=pendingGeometry&&candidateCurrent(pendingGeometry)?pendingGeometry:undefined,want=enabled&&(landmarkVisible||!!candidate?.packed.landmarkVisible)&&!pageHidden&&paintMode()===1;diffuseTexture?.setNeededMaterials([...residentTextureStyles,...(candidate?.after?.styles??[])].map(style=>({material:style%8,roof:style>=32})));windowTexture?.setUploadSize(128);diffuseTexture?.setUploadSize(128);windowTexture?.setEnabled(want);diffuseTexture?.setEnabled(want);if(want&&gl&&!gl.isContextLost()&&!facadeAttached){windowTexture?.attach(gl);diffuseTexture?.attach(gl);facadeAttached=true;}else if(!want&&facadeAttached){windowTexture?.detach();diffuseTexture?.detach();facadeAttached=false;if(gl){if(texturedProgram)programPreparation.releaseProgram(gl,texturedProgram);if(diffuseProgram)programPreparation.releaseProgram(gl,diffuseProgram);}texturedProgram=undefined;diffuseProgram=undefined;textureShaderAttempted=false;diffuseShaderAttempted=false;}}
 let fullColourFailure:string|undefined,fullColourRevision=0,fullColourSourceCharacters=0;
 function solarCaptureKeys(){if(solarCaptureToken===undefined||destroyed||pageHidden||!enabled||!sceneIndexCount())return new Set<string>();return new Set(paintMode()===1?[reflectionMaterialKey()]:!queueOnlyProgram&&paintMode()>1.5?[fullColourProgramKey]:[]);}
 function reflectionMaterialKey(){if(paintMode()===1&&facadeAttached&&windowTexture?.stats.textureObjects&&surfaceFragment)return diffuseTexture?.stats.totalTextureObjects===2&&diffuseFragment?'material:diffuse':'material:window';return 'base';}
 function reflectionRunKeys(){if(!queueOnlyProgram&&paintMode()>1.5){const override=overrideProgramKey();return familyRuns.map(run=>({firstIndex:run.firstIndex,indexCount:run.indexCount,program:mainFamilyProgramKey(override??run.key)}));}return[{firstIndex:0,indexCount:sceneIndexCount(),program:reflectionMaterialKey()}];}
 function reflectionCaptureKeys(){return reflectionCaptureToken!==undefined&&!destroyed&&!pageHidden&&enabled?(reflectionDemandPlanned?reflectionDemandKeys:new Set(reflectionRunKeys().map(run=>run.program))):new Set<string>();}
 function captureProgramKeys(){return new Set([...solarCaptureKeys(),...reflectionCaptureKeys()]);}
 function reflectionKeyProgram(key:string){return key==='base'||key===currentPaintProgramKey(0)?program:key==='material:window'?texturedProgram:key==='material:diffuse'?diffuseProgram:familyPrograms.get(key);}
 function trimCapturePrograms(previous=heldCaptureDemandKeys){
  const capture=captureProgramKeys(),required=new Set([...mainPaintProgramKeys(),...capture]),retired=new Set([...heldCaptureDemandKeys,...previous]);heldCaptureDemandKeys=capture;let changed=false;
  for(const key of retired){if(required.has(key))continue;const value=familyPrograms.get(key);if(value){familyPrograms.delete(key);if(gl)programPreparation.releaseProgram(gl,value);changed=true;}}
  if(changed){fullColourRevision++;reflectionResidentRevision++;captureRuntime.invalidate();}
 }
 function retireCapturePrograms(previous:Set<string>){trimCapturePrograms(previous);captureRuntime.invalidate();pruneProgramPreparation();}
 function resetCaptureDemands(){solarCaptureToken=undefined;reflectionCaptureToken=undefined;reflectionDemandPlanned=false;reflectionDemandKeys.clear();heldCaptureDemandKeys.clear();reflectionProgramFailures.clear();}
 function setCaptureDemand(change:CaptureDemandChange){const previous=captureProgramKeys(),current=change.kind==='solar'?solarCaptureToken:reflectionCaptureToken;if(!change.active&&current!==change.token)return;if(change.kind==='solar')solarCaptureToken=change.active?change.token:undefined;else if(!change.active||current!==change.token){reflectionCaptureToken=change.active?change.token:undefined;reflectionDemandPlanned=false;reflectionDemandKeys=new Set();reflectionProgramFailures.clear();}retireCapturePrograms(previous);}
 function prepareSolarPrograms(budget=createSolarShadowPreparationBudget()):SolarShadowPreparationResult{
  if(solarCaptureToken===undefined||queueOnlyProgram||paintMode()<=1.5||destroyed||pageHidden||!enabled||!sceneIndexCount()||opacityContext==='route-selection'||opacity<.99||needsBirth||birth.size||!gl||gl.isContextLost()||!gpuReady()||!sceneEnvironment.sunlight||!sceneEnvironment.shadows||!sceneSun.shadowVector)return solarShadowPreparation();
  if(fullColourFailure)return solarShadowPreparation(0,0,1);
  if(familyPrograms.has(fullColourProgramKey))return solarShadowPreparation(1);
  // A pending answered by a held page-ledger wait is counted as budgetWaiting:
  // the owner's onAvailable wake repaints it, so it needs no caller frame.
  const budgetWaits=programPreparation.budgetWaits;
  try{
   // The complete colour recipe retains off-camera dispatch. It is distinct
   // from every pruned family recipe and is owned only by the ordinary cache.
   const result=budget.compile(fullColourProgramKey,String(gpuGeneration),()=>compileGeometryProgram(familySurfaceHelper,0,0,true,false));
   if(result.status==='pending'||gl.isContextLost())return solarShadowPreparation(0,1);
   if(!result.value)throw Error('Full colour capture program unavailable');
   familyPrograms.set(fullColourProgramKey,result.value);fullColourRevision++;reflectionResidentRevision++;
   return solarShadowPreparation(1);
  }catch(error){if(isProgramPreparationPending(error)||gl.isContextLost())return solarShadowPreparation(0,1,0,Number(isProgramPreparationPending(error)&&programPreparation.needsFrameAfter?.(budgetWaits)===false));fullColourFailure=String(error).slice(0,256);fullColourRevision++;return solarShadowPreparation(0,0,1);}
 }
 function releaseGPU(preserveCandidate=false){programIdleRetirement.reset();sourceWorkspace.clearPreparedSource();invalidateMainFrame();residentMainMasksReady=false;mainGPUIncarnation++;clearProgramGrantHandoff();resetCaptureDemands();clearBerlinProgramComparison();if(preserveCandidate&&pendingGeometry){clearCandidateGPU(pendingGeometry);geometryUploadRevision++;geometryUploadPending=true;}else discardPendingGeometry();geometryOwner.release();shadowUploadPending=false;gpuInitializationPrepared=false;mainProgramFailure=undefined;mainDrawFailure=undefined;geometryUploadFailure=undefined;programPreparation.cancel();captureRuntime.invalidate();fullColourFailure=undefined;fullColourSourceCharacters=0;fullColourRevision++;residentGPU?.released();fullProgramUpgradePending=false;fullProgramUpgradeFailure=undefined;for(const chunk of sceneChunks)chunk.masks.detach();rathausProxyMasks.detach();facadeAttached=false;diffuseTexture?.detach();windowTexture?.detach();matrix=undefined;mainWorldMatrix=undefined;viewRevision++;releaseShadowGPU();if(gl){if(program)programPreparation.releaseProgram(gl,program);for(const p of familyPrograms.values())programPreparation.releaseProgram(gl,p);if(texturedProgram)programPreparation.releaseProgram(gl,texturedProgram);if(diffuseProgram)programPreparation.releaseProgram(gl,diffuseProgram);}familyPrograms.clear();familyFailures.clear();familyPending=false;visibleFamilyCount=0;vao=undefined;vertexBuffer=undefined;indexBuffer=undefined;stateBuffer=undefined;paintBuffer=undefined;program=undefined;texturedProgram=undefined;textureShaderAttempted=false;diffuseProgram=undefined;diffuseShaderAttempted=false;}
 function colourProgramHasConsumer(helper:string,family:number,fullColour:boolean,queue:boolean,mainOnly=false){
  if(destroyed||pageHidden||!enabled)return false;
  const consumes=(keys:ReadonlySet<string>,materials:ReadonlySet<string>,capture:ReadonlySet<string>,needsBase:boolean,queueMode:boolean)=>{
   if(fullColour)return helper===familySurfaceHelper&&capture.has(fullColourProgramKey);
   if(queue!==queueMode)return false;
   if(family===0){if(needsBase&&helper===familySurfaceHelper)return true;if(helper===surfaceFragment&&(materials.has('material:window')||capture.has('material:window')))return true;if(helper===diffuseFragment&&(materials.has('material:diffuse')||capture.has('material:diffuse')))return true;return false;}
   return helper===familySurfaceHelper&&(keys.has(currentPaintProgramKey(family))||capture.has(currentPaintProgramKey(family)));
  };
  const value=pendingGeometry,activeCapture=mainOnly?new Set<string>():captureProgramKeys();
  if(value&&candidateCurrent(value)&&value.mainDemandKnown&&consumes(value.mainKeys,value.materialKeys,new Set([...value.captureKeys].filter(key=>activeCapture.has(key))),true,value.queueMode??queueOnlyProgram))return true;
  if(!sceneIndexCount())return false;const materials=new Set<string>(),window=windowTexture?.stats,diffuse=diffuseTexture?.stats;
  if(paintMode()===1&&landmarkVisible&&facadeAttached&&window?.textureObjects){if(surfaceFragment&&!textureShaderFailure)materials.add('material:window');if(diffuse?.totalTextureObjects===2&&diffuseFragment&&!diffuseShaderFailure)materials.add('material:diffuse');}
  return consumes(mainPaintProgramKeys(),materials,activeCapture,true,queueOnlyProgram);
 }
 function colourProgramRecipe(helper:string,family:number,fullColour:boolean,queueMode:boolean,demandKey:'material:window'|'material:diffuse'|undefined,candidate:GeometryCandidate|undefined,requiredCapture:boolean,sourceRecipe=churchSourceRecipe(helper,fullColour?false:queueMode)){
  const resource=fullColour?'colour:full':'colour:'+family,queue=fullColour?false:queueMode,epoch=gpuGeneration;
  return{budget:sourceWorkspace.programBudget(sourceRecipe,VERTEX,colourAttributes,fullColour||queue?[]:linkedPaint.families(family)),sharedKey:'church-colour',resource,inputs:[VERTEX,helper,String(queue),String(family),String(fullColour),fullColour||queue?'':linkedPaint.families(family).join(','),'church-static-material-v1','attributes:position-normal-color-selected-frame-family','override:uniform-reset','mask:rathaus-per-draw','texture:helper-bindings','reflection-clip:per-draw','depth-bias:original-source'],provenance:[churchColourSourceAuthority],current:()=>epoch===gpuGeneration&&colourProgramHasConsumer(helper,family,fullColour,queue),priority:fullColour||requiredCapture&&!colourProgramHasConsumer(helper,family,fullColour,queue,true)?'capture' as const:'visible' as const,currentPriority:()=>!fullColour&&colourProgramHasConsumer(helper,family,fullColour,queue,true)?'visible' as const:'capture' as const};
 }
 const compileGeometryProgram=(helper:string,family=0,requestedFamily=family,fullColour=false,queueMode=queueOnlyProgram,demandKey?:'material:window'|'material:diffuse',candidate?:NonNullable<typeof pendingGeometry>,requiredCapture=false):WebGLProgram=>{
  const queue=fullColour?false:queueMode,sourceRecipe=churchSourceRecipe(helper,queue);
  try{
   const result=programPreparation.compile(gl!,{...colourProgramRecipe(helper,family,fullColour,queueMode,demandKey,candidate,requiredCapture,sourceRecipe),build(){
    const raw=sourceWorkspace.prepareSource(sourceRecipe,fullColour||queue?[]:linkedPaint.families(family)).fragment,submitted=withResidentReflectionClip(raw);
    if(fullColour)fullColourSourceCharacters=submitted.length;else lastFragmentCharacters=submitted.length;
    let hash=2166136261;for(let i=0;i<submitted.length;i++)hash=Math.imul(hash^submitted.charCodeAt(i),16777619);
    lastCompileAttempt={requestedFamily,canonicalFamily:family,generation,gpuGeneration,stage:'submitted',characters:submitted.length,sourceHash:(hash>>>0).toString(16).padStart(8,'0'),contextLost:false,status:'pending',infoLog:''};
    return{vertex:VERTEX,fragment:submitted,attributes:colourAttributes};
   }});
   if(lastCompileAttempt){lastCompileAttempt.status='ready';lastCompileAttempt.stage='link';}return result;
  }catch(error){if(isProgramPreparationPending(error))throw error;
   // The prepared-source workspace's currency guard refuses the program budget
   // preflight with an AbortError before the program owner sees the demand
   // (context lost, page hidden, disabled or destroyed). That is not a shader
   // failure: answer it as the owner's own guard would, 'lost' on a lost
   // context and 'cancelled' otherwise, and leave the last submitted attempt's
   // record as it was (this demand submitted nothing).
   if(error instanceof DOMException&&error.name==='AbortError')throw new ProgramPreparationPending(gl?.isContextLost()?'lost':'cancelled');
   if(lastCompileAttempt){lastCompileAttempt.status='failed';lastCompileAttempt.infoLog=String(error).slice(0,2048);}throw error;}
 };

 let residentGPU:ReturnType<typeof createResidentGPULifecycle<WebGL2RenderingContext>>|undefined;
 let gpuPreflightRequired=false,gpuInitializationPrepared=false;
 function initializeResidentGPU(context:WebGLRenderingContext|WebGL2RenderingContext,repackResident:boolean){
  if(!('createVertexArray'in context))throw Error('WebGL2 required');if(gl&&gl!==context)releaseGPU();gl=context as WebGL2RenderingContext;
  if(!gpuInitializationPrepared){gpuGeneration++;gpuInitializationPrepared=true;}
  if(pendingGeometry){prepareGeometryUpload();return;}
  if(sceneIndexCount()&&(repackResident||!gpuReady()||geometryUploadPending)){if(!geometryUploadPending)upload();else prepareGeometryUpload();return;}
  prepareResidentMain();
 }
 function residentCaptureState(surfaceOpacity:number,solarDepth=false){const windowState=windowTexture?.stats,diffuseState=diffuseTexture?.stats;let materialProgram=program,textureKind=0;if(paintMode()===1&&facadeAttached&&windowTexture&&texturedProgram&&windowState?.textureObjects){materialProgram=texturedProgram;textureKind=1;if(diffuseTexture&&diffuseProgram&&diffuseState?.plaster.textureObjects&&diffuseState.brick.textureObjects){materialProgram=diffuseProgram;textureKind=2;}}const override=overrideProgramKey();const runs=solarDepth&&!queueOnlyProgram&&paintMode()>1.5?[{firstIndex:0,indexCount:sceneIndexCount(),program:familyPrograms.get(fullColourProgramKey)}]:!queueOnlyProgram&&paintMode()>1.5?familyRuns.map(run=>{const key=mainFamilyProgramKey(override??run.key);return{firstIndex:run.firstIndex,indexCount:run.indexCount,program:key===currentPaintProgramKey(0)?program:familyPrograms.get(key)};}):[{firstIndex:0,indexCount:sceneIndexCount(),program:materialProgram}];
 return {materialProgram,textureKind,runs};
 }
 function solarCaptureRevision(){const w=windowTexture?.stats,d=diffuseTexture?.stats;return[fullColourRevision,Number(enabled),Number(pageHidden),Number(destroyed),Number(gl?.isContextLost()??false),generation,Number(needsBirth),birth.size,reflectionResidentRevision,reflectionObjectID(program),reflectionObjectID(vao),reflectionObjectID(texturedProgram),reflectionObjectID(diffuseProgram),paintMode(),paintOverride(),opacity,opacityContext,sceneSun.instantISO,Number(sceneEnvironment.sunlight),sceneEnvironment.quality,'',Number(facadeAttached),rathausProxyMasks.residentRevision,w?.ready,w?.textureObjects,d?.plaster.ready,d?.brick.ready,d?.totalTextureObjects,[...familyPrograms].map(([key,p])=>key+':'+reflectionObjectID(p)).join(',')].join('|');}
 function residentCaptureAdapter():ResidentCaptureAdapter{return{revision:solarCaptureRevision,publicationVersion:()=>geometryOwner.scene.version,snapshot(solarDepth){
  if(geometryUploadPending)return{status:'blocked',reason:'geometry-upload-pending',pending:true};
  const surfaceOpacity=opacityContext==='route-selection'?Math.min(opacity,.2):opacity;
  if(destroyed||pageHidden||!enabled||solarDepth&&(surfaceOpacity<.99||!sceneEnvironment.shadows||!sceneEnvironment.sunlight))return{status:'inactive'};
  if(!sceneIndexCount())return loaded.size?{status:'blocked',reason:'missing-packed-geometry',pending:false}:{status:'inactive'};
  if(solarDepth&&(needsBirth||birth.size))return{status:'blocked',reason:needsBirth?'needs-birth':'growing',pending:true};
  if(!gl||gl.isContextLost()||!gpuReady()||!program)return{status:'blocked',reason:'gpu-unready',pending:!geometryUploadFailure&&!mainProgramFailure};
  const context=gl,window=windowTexture,diffuse=diffuseTexture,windowProgram=texturedProgram,wallProgram=diffuseProgram,capture=residentCaptureState(surfaceOpacity,solarDepth),textureKind=capture.textureKind,light=sceneSun,sunlight=sceneEnvironment.sunlight,mode=paintMode(),override=paintOverride(),order=new Map([...loaded.keys()].map((k,i)=>[k,i])),ownership=createResidentCaptureOwnership(()=>geometryOwner.capture(solarDepth?'solar':'reflection')),hold=ownership.geometry,publicationVersion=hold.version;
  try{
   for(const p of new Set(capture.runs.flatMap(run=>run.program?[run.program]:[])))ownership.addRelease(programPreparation.retainProgram(context,p));
   const chunks=sceneChunks.map(chunk=>{
    const data=chunk.cpu.value,geometry=chunk.geometry?.value;if(!data||!geometry||!chunk.geometry)throw Error('Capture chunk has no live geometry');
    const anchor=[...chunk.anchor]as[number,number],anchorUnit=chunk.unit,styleAnchor=materialAnchor?[...materialAnchor]as[number,number]:anchor,styleUnit=materialUnit,mask=chunk.masks.retain(solarDepth?'solar':'reflection');ownership.addRelease(()=>mask.release());
    const runs=splitChunkRuns<WebGLProgram,ChurchPackedChunk>(sceneSpans,chunk,capture.runs);
    return{contentKey:chunk.contentKey,vao:geometry.vao,components:[...chunk.loaded.values()].map(c=>({...c,order:order.get(key(c))})),runs,indexCount:data.indices.length,anchor,unit:anchorUnit,opacity:surfaceOpacity,cull:true,skipMasks:false,masks:mask,planFailureReason:fullColourFailure?'solar-depth-compile-failed':undefined,
     bindingRevision:()=>[window?.stats.residentRevision,window?.stats.ready,window?.stats.textureObjects,diffuse?.stats.plaster.residentRevision,diffuse?.stats.brick.residentRevision,diffuse?.stats.totalTextureObjects,mask.residentRevision].join('|'),
     bindingsReady:()=>textureKind===0||!!(window?.isResident(context)&&window.stats.ready&&(textureKind!==2||diffuse?.isResident(context)&&(!diffuse.stats.neededMaterials.plaster||diffuse.stats.plaster.ready)&&(!diffuse.stats.neededMaterials.brick||diffuse.stats.brick.ready))),
     matrix(main:Float64Array){const scale=1/anchorUnit;return multiply(main,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,anchor[0],anchor[1],0,1]);},
     uniforms(p:WebGLProgram,matrix:Float64Array,plane:Float32Array|undefined,viewport:Int32Array){context.useProgram(p);reflectionClipUniforms(context,p,plane,viewport);uploadSceneLight(context,p,light,sunlight);uploadFacadeLayouts(context,p);context.uniformMatrix4fv(context.getUniformLocation(p,'u_matrix'),false,new Float32Array(matrix));context.uniform1f(context.getUniformLocation(p,'u_opacity'),surfaceOpacity);context.uniform1f(context.getUniformLocation(p,'u_paint_mode'),mode);context.uniform1f(context.getUniformLocation(p,'u_paint_override'),override);context.uniform1f(context.getUniformLocation(p,'u_style_scale'),styleUnit/anchorUnit);context.uniform2f(context.getUniformLocation(p,'u_style_offset'),(anchor[0]-styleAnchor[0])*styleUnit,-(anchor[1]-styleAnchor[1])*styleUnit);},
     resetClip(p:WebGLProgram){reflectionClipUniforms(context,p);},bind(p:WebGLProgram,draw:()=>void,unavailable:()=>void){if(textureKind===2&&p===wallProgram)window!.withResidentTexture(context,p,()=>diffuse!.withResidentTextures(context,p,draw,unavailable),unavailable);else if(textureKind===1&&p===windowProgram)window!.withResidentTexture(context,p,draw,unavailable);else draw();}
    };
   });
   return{status:'active',gl:context,publicationVersion,chunks,leases:hold.leases,retain:ownership.retain,release:ownership.release};
  }catch(error){ownership.release();throw error;}
 }};}
 const captureRuntime=createResidentCaptureRuntime(residentCaptureAdapter());

 function captureContentRevision(){const w=windowTexture?.stats,d=diffuseTexture?.stats;return[Number(enabled),Number(pageHidden),Number(destroyed),Number(gl?.isContextLost()??false),generation,surfaceContentRevision,Number(needsBirth),birth.size,paintMode(),paintOverride(),opacity,opacityContext,sceneSun.instantISO,Number(sceneEnvironment.sunlight),Number(sceneEnvironment.shadows),sceneEnvironment.quality,Number(queueOnlyProgram),w?.ready,d?.plaster.ready,d?.brick.ready].join('|');}
 function selectPhysicalReflection(pass:ResidentPlanarReflectionPass){const order=new Map([...loaded.keys()].map((key,index)=>[key,index])),runs=reflectionRunKeys(),physical=sceneChunks.map(chunk=>{const scale=1/chunk.unit;return{chunk,components:[...chunk.loaded.values()].map(component=>({...component,order:order.get(key(component))})),runs:splitChunkRuns<string,ChurchPackedChunk>(sceneSpans,chunk,runs),matrix:multiply(pass.mainMatrix,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,chunk.anchor[0],chunk.anchor[1],0,1]),indexCount:chunk.cpu.value?.indices.length??0,cull:true};});return planResidentReflectionChunks<string,(typeof physical)[number]>(physical,pass.maxTriangles,pass.maxDraws??64);}
 function endCaptureDemands(){const previous=new Set([...heldCaptureDemandKeys,...captureProgramKeys()]);resetCaptureDemands();retireCapturePrograms(previous);}
 function preparePlanarReflection(pass:ResidentPlanarReflectionPass,budget=createSolarShadowPreparationBudget()):PlanarReflectionPreparationResult{
  if(destroyed||pageHidden||!enabled||!sceneIndexCount())return{...solarShadowPreparation(),plannedTriangles:0,plannedDraws:0};
  const select=()=>selectPhysicalReflection(pass);
  let selected=select();
  const finish=(ready=0,pending=0,failed=0,budgetWaiting=0):PlanarReflectionPreparationResult=>({...solarShadowPreparation(ready,pending,failed,budgetWaiting),plannedTriangles:selected.triangles,plannedDraws:selected.draws});
  const setPlan=()=>{const previous=captureProgramKeys();reflectionDemandKeys=new Set(selected.plan.map(row=>row.program));reflectionDemandPlanned=true;retireCapturePrograms(previous);};
  if(reflectionCaptureToken===undefined)return finish(0,1);setPlan();
  if(!gl||pass.gl!==gl||gl.isContextLost()||geometryUploadPending||!gpuReady())return finish(0,1);
  if(city==='berlin'&&berlinSharedFamilyPrograms===undefined&&[...reflectionDemandKeys].some(isSharedBerlinChurchFamily)){
   try{const comparison=budget.compile('church-reflection-equivalence',String(gpuGeneration),()=>prepareBerlinFamilyComparison('capture'));if(comparison.status==='pending'||!comparison.value)return finish(0,1);selected=select();setPlan();}
   catch(error){if(isProgramPreparationPending(error))return finish(0,1);return finish(0,0,1);}
  }
  // budgetWaiting counts pendings answered by a held page-ledger wait (the
  // owner's onAvailable wake repaints); only other pendings request a frame.
  let ready=0,pending=0,failed=0,budgetWaiting=0;
  for(const key of reflectionDemandKeys){
   if(reflectionKeyProgram(key)){reflectionProgramFailures.delete(key);ready++;continue;}
   if(reflectionProgramFailures.has(key)){failed++;continue;}
   const budgetWaits=programPreparation.budgetWaits;
   try{
    const prepared=budget.compile('church-reflection:'+key,String(gpuGeneration),()=>{
     if(key==='material:window')return compileGeometryProgram(surfaceFragment!,0,0,false,queueOnlyProgram,key,undefined,true);
     if(key==='material:diffuse')return compileGeometryProgram(diffuseFragment!,0,0,false,queueOnlyProgram,key,undefined,true);
     return compileGeometryProgram(familySurfaceHelper,currentPaintProgramFamily(key),currentPaintProgramFamily(key),false,queueOnlyProgram,undefined,undefined,true);
    });
    if(prepared.status==='pending'){pending++;continue;}
    if(key==='material:window'){texturedProgram=prepared.value;textureShaderFailure=undefined;textureShaderAttempted=true;}
    else if(key==='material:diffuse'){diffuseProgram=prepared.value;diffuseShaderFailure=undefined;diffuseShaderAttempted=true;}
    else familyPrograms.set(key,prepared.value);
    reflectionResidentRevision++;ready++;
   }catch(error){if(isProgramPreparationPending(error)||gl.isContextLost()){pending++;if(isProgramPreparationPending(error)&&programPreparation.needsFrameAfter?.(budgetWaits)===false)budgetWaiting++;continue;}reflectionProgramFailures.set(key,String(error).slice(0,512));failed++;}
  }
  if(pending||failed){if(pending>budgetWaiting)map.triggerRepaint();return finish(ready,pending,failed,budgetWaiting);}
  const programs=new Set<WebGLProgram>();for(const row of selected.plan){const value=reflectionKeyProgram(row.program);if(value)programs.add(value);}
  try{const masks=prepareChunkMasks(sceneChunks,gl,[...programs]);if(!masks.ready)return finish(ready,0,1);}catch{return finish(ready,0,1);}
  const snapshot=residentCaptureAdapter().snapshot(false);if(snapshot.status==='blocked'&&snapshot.pending===false)return finish(ready,0,1);if(snapshot.status!=='active')return finish(ready,1);
  try{if('chunks'in snapshot?!snapshot.chunks.every(chunk=>chunk.bindingsReady()):!snapshot.bindingsReady())return finish(ready,1);return finish(ready);}finally{snapshot.release?.();}
 }
 function prepareCaptureMaterial(budget:SolarShadowPreparationBudget):SolarShadowPreparationResult{
  if(solarCaptureToken===undefined||paintMode()!==1||destroyed||pageHidden||!enabled||!gl||gl.isContextLost()||!gpuReady()||needsBirth||birth.size)return solarShadowPreparation();
  const key=reflectionMaterialKey();if(key==='base'||reflectionKeyProgram(key))return solarShadowPreparation();if(reflectionProgramFailures.has(key))return solarShadowPreparation(0,0,1);
  const budgetWaits=programPreparation.budgetWaits;
  try{const prepared=budget.compile('church-solar-material:'+key,String(gpuGeneration),()=>{
   return compileGeometryProgram(key==='material:window'?surfaceFragment!:diffuseFragment!,0,0,false,queueOnlyProgram,key,undefined,true);
  });if(prepared.status==='pending')return solarShadowPreparation(0,1);if(key==='material:window'){texturedProgram=prepared.value;textureShaderFailure=undefined;textureShaderAttempted=true;}else{diffuseProgram=prepared.value;diffuseShaderFailure=undefined;diffuseShaderAttempted=true;}reflectionResidentRevision++;return solarShadowPreparation(1);}
  catch(error){if(isProgramPreparationPending(error)||gl.isContextLost())return solarShadowPreparation(0,1,0,Number(isProgramPreparationPending(error)&&programPreparation.needsFrameAfter?.(budgetWaits)===false));reflectionProgramFailures.set(key,String(error).slice(0,512));return solarShadowPreparation(0,0,1);}
 }
 function prepareSolarShadow(budget=createSolarShadowPreparationBudget()):SolarShadowPreparationResult{
  if(solarCaptureToken===undefined)return solarShadowPreparation();
  pruneProgramPreparation();
  const material=prepareCaptureMaterial(budget),programs=prepareSolarPrograms(budget);
  const preparation=solarShadowPreparation(material.ready+programs.ready,material.pending+programs.pending,material.failed+programs.failed,(material.budgetWaiting??0)+(programs.budgetWaiting??0));
  return prepareSolarShadowResources(preparation,captureRuntime);
 }
 function solarCoverage(){return captureRuntime.coverage();}

 let activeMainFrame:ReturnType<typeof retainMainFrame>|undefined;
 function retainMainFrame(){
  let hold:ReturnType<typeof geometryOwner.captureReady>|undefined,shadowHold:ReturnType<typeof shadowGeometryOwner.captureReady>|undefined;
  const masks=new Map<ChurchPackedChunk,ReturnType<ReturnType<typeof createRathausProxyMasks>['retainReady']>>(),programs:(()=>void)[]=[];let live=true;
  const release=()=>{if(!live)return;live=false;let failure:unknown;for(const drop of [...programs,...[...masks.values()].map(mask=>()=>mask.release()),()=>hold?.release(),()=>shadowHold?.release()])try{drop();}catch(error){failure??=error;}if(failure!==undefined)throw failure;};
  try{hold=geometryOwner.captureReady('main');if(shadowUploadedIndexCount>0)shadowHold=shadowGeometryOwner.captureReady('main');for(const chunk of sceneChunks)if(chunk.masks)masks.set(chunk,chunk.masks.retainReady('main'));for(const value of new Set([program,texturedProgram,diffuseProgram,shadowProgram,...familyPrograms.values()].filter((value):value is WebGLProgram=>!!value)))programs.push(programPreparation.retainProgram(gl!,value));return{version:hold.version,shadowVersion:shadowHold?.version,masks,sun:sceneSun,sunlight:sceneEnvironment.sunlight,release};}catch(error){release();throw error;}
 }
 function drawProjectedShadows(shadowAlpha:number){
  if(!gl||!shadowProgram||!mainWorldMatrix||!matrix)return;const context=gl,selected=shadowProgram,main=mainWorldMatrix,version=geometryOwner.scene.version,shadowVersion=shadowGeometryOwner.scene.version,casters=sceneChunks.filter(chunk=>(chunk.shadowIndexCount??0)>0);
  if(casters.length+1>48)throw Error('Projected shadow pass exceeds the existing 48 draw limit');
  if(casters.some(chunk=>!chunk.shadow?.value))throw Error('Projected shadow chunk is not resident');
  context.useProgram(selected);context.enable(context.DEPTH_TEST);context.depthFunc(context.LEQUAL);context.depthMask(false);context.disable(context.CULL_FACE);context.enable(context.BLEND);context.blendFuncSeparate(context.SRC_ALPHA,context.ONE_MINUS_SRC_ALPHA,context.ONE,context.ONE_MINUS_SRC_ALPHA);context.uniform1f(context.getUniformLocation(selected,'u_shadow_opacity'),shadowAlpha);const vector=sceneSun.shadowVector;context.uniform2f(context.getUniformLocation(selected,'u_shadow_vector'),vector?.[0]??0,vector?.[1]??0);
  // A single MAX coverage target collects every chunk before its one blend.
  if(shadowMask.draw(context,matrix,.03,()=>{for(const chunk of casters){
   if(version!==geometryOwner.scene.version||shadowVersion!==shadowGeometryOwner.scene.version)throw Error('Projected shadow publication changed');
   const chunkUnit=chunk.unit,q=chunk.anchor,scale=1/chunkUnit,clip=multiply(main,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,q[0],q[1],.03/anchorUnit-.03/chunkUnit,1]);
   context.bindVertexArray(chunk.shadow!.value!.vao);context.uniformMatrix4fv(context.getUniformLocation(selected,'u_matrix'),false,new Float32Array(clip));drawResidentTriangles(context,chunk.shadow!.value!.vao,chunk.shadowIndexCount!,0);
  }}))shadowDraws++;
 }
const layer={id,type:'custom' as const,renderingMode:'3d' as const,onAdd(_map:unknown,context:WebGLRenderingContext|WebGL2RenderingContext){if(!('createVertexArray'in context))throw Error('WebGL2 required');residentGPU!.attach(context as WebGL2RenderingContext);},render(context:WebGLRenderingContext|WebGL2RenderingContext,args:{defaultProjectionData?:{mainMatrix:ArrayLike<number>}}|ArrayLike<number>){mainFrame++;chunkStore?.collectRetired();const frameMain='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;mainWorldMatrix=frameMain?.length===16?Float64Array.from(frameMain):undefined;invalidateMainFrame();pruneProgramPreparation();if(destroyed||pageHidden||!enabled||!gl||gl.isContextLost()){matrix=undefined;return;}familyPending=false;const emptyMain='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;if(residentGPU!.emptyFrame(emptyMain)){matrix=undefined;familyPending=false;pendingMainFrame=captureMainFrameWitness(true);return;}if(!gpuReady())residentGPU!.attach(gl);if(geometryUploadPending){prepareGeometryUpload();if(geometryUploadPending&&!gpuReady()){matrix=undefined;return;}}if(shadowUploadPending)uploadShadow();if(destroyed||pageHidden||!enabled||!gpuReady()){matrix=undefined;return;}if(!gl||!program||!vao)return;syncFacadeResources();if(gl.isContextLost()){matrix=undefined;return;}const main='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;if(!main||main.length!==16)return;const scale=1/anchorUnit,model=[scale,0,0,0,0,0,scale,0,0,-scale,0,0,anchor[0],anchor[1],0,1];matrix=undefined;grow();matrix=multiply(main,model);pruneProgramPreparation();scheduleFullProgramUpgradeForVisibleUnsupported();if(!sceneIndexCount())return;const residentWait:MainProgramWait={heldOnly:false,held:new Set()},mainPrepared=prepareResidentMain(residentWait);let familyFrame=false;familyPending=[...mainPaintProgramKeys()].some(key=>key!==currentPaintProgramKey(0)&&!familyPrograms.has(key)&&!familyFailures.has(key));const drawWitness=mainPrepared?captureMainFrameWitness():undefined;let mainDrawComplete=mainPrepared,completedMain=false;const requiredRoles=mainRolePrograms();const old={program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),depth:gl.isEnabled(gl.DEPTH_TEST),blend:gl.isEnabled(gl.BLEND),cull:gl.isEnabled(gl.CULL_FACE),mask:gl.getParameter(gl.DEPTH_WRITEMASK),depthFunc:gl.getParameter(gl.DEPTH_FUNC),src:gl.getParameter(gl.BLEND_SRC_RGB),dst:gl.getParameter(gl.BLEND_DST_RGB),srcA:gl.getParameter(gl.BLEND_SRC_ALPHA),dstA:gl.getParameter(gl.BLEND_DST_ALPHA)};if(gl.isContextLost()){matrix=undefined;return;}const frame=retainMainFrame(),previousFrame=activeMainFrame;activeMainFrame=frame;try{
 const surfaceOpacity=opacityContext==='route-selection'?Math.min(opacity,.2):opacity,shadowAlpha=sceneEnvironment.shadows?sourceShadowOpacity(surfaceOpacity,opacityContext):0;
 if(shadowProgram&&shadowUploadedIndexCount>0&&shadowAlpha>0){try{drawProjectedShadows(shadowAlpha);}catch{if(gl.isContextLost())return;shadowFailure=true;releaseShadowGPU();}if(gl.isContextLost())return;}else shadowMask?.cancelPending?.();
 gl.bindVertexArray(vao);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.depthMask(surfaceOpacity>=.99);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 const uniforms=(p:WebGLProgram)=>{gl!.useProgram(p);reflectionClipUniforms(gl!,p);uploadSceneLight(gl!,p,frame.sun,frame.sunlight);uploadFacadeLayouts(gl!,p);gl!.uniformMatrix4fv(gl!.getUniformLocation(p,'u_matrix'),false,new Float32Array(matrix!));gl!.uniform1f(gl!.getUniformLocation(p,'u_opacity'),surfaceOpacity);gl!.uniform1f(gl!.getUniformLocation(p,'u_paint_mode'),paintMode());gl!.uniform1f(gl!.getUniformLocation(p,'u_paint_override'),paintOverride());gl!.uniform1f(gl!.getUniformLocation(p,'u_style_scale'),materialUnit/anchorUnit);gl!.uniform2f(gl!.getUniformLocation(p,'u_style_offset'),(anchor[0]-materialAnchor![0])*materialUnit,-(anchor[1]-materialAnchor![1])*materialUnit);};
 const draw=()=>{if(!drawSceneRange(gl!.getParameter(gl!.CURRENT_PROGRAM),0,sceneIndexCount()))mainDrawComplete=false;};
 const familyDraw=()=>{
  const demand=mainPaintDemand(),runs=demand.runs,override=demand.override,visible=mainPaintProgramKeys(demand);visibleFamilyCount=visible.size;
  const removed=trimInactivePaintPrograms(familyPrograms,new Set([...visible,...captureProgramKeys()]),p=>programPreparation.releaseProgram(gl!,p));familyEvictions+=removed;if(removed)reflectionResidentRevision++;programIdleRetirement.synchronize();
  for(const run of runs){if(gl!.isContextLost()){mainDrawComplete=false;return;}const key=mainFamilyProgramKey(override??run.key);if(familyFailures.has(key)){mainDrawComplete=false;continue;}const selected=key===currentPaintProgramKey(0)?program:familyPrograms.get(key);if(!selected){familyPending=true;if(!residentWait.held?.has(key))familyFrame=true;mainDrawComplete=false;continue;}if(familyPrograms.has(key)){familyPrograms.delete(key);familyPrograms.set(key,selected);}uniforms(selected);if(!drawSceneRange(selected!,run.firstIndex,run.indexCount))mainDrawComplete=false;}
  // A missing family whose compile is a held page-ledger wait is repainted by
  // the program owner's wake; any other missing family keeps this frame.
  if(familyPending&&(familyFrame||!residentWait.heldOnly))map.triggerRepaint();
 },fallbackDraw=()=>{if(!queueOnlyProgram&&paintMode()>1.5)familyDraw();else{uniforms(program!);draw();}};
 const windowDraw=()=>{if(windowTexture&&texturedProgram){uniforms(texturedProgram);windowTexture.withTexture(gl!,texturedProgram,draw,()=>{if(requiredRoles?.has('material:window'))mainDrawComplete=false;fallbackDraw();});}else fallbackDraw();};const normalDraw=()=>{if(windowTexture&&diffuseTexture&&diffuseProgram){uniforms(diffuseProgram);windowTexture.withTexture(gl!,diffuseProgram,()=>diffuseTexture.withTextures(gl!,diffuseProgram,draw,()=>{if(requiredRoles?.has('material:diffuse'))mainDrawComplete=false;windowDraw();}),()=>{if(requiredRoles?.has('material:diffuse'))mainDrawComplete=false;windowDraw();});}else windowDraw();};if(paintMode()===1)normalDraw();else fallbackDraw();mainDrawFailure=undefined;completedMain=mainDrawComplete;}catch(error){matrix=undefined;if(!gl.isContextLost()){if(!isProgramPreparationPending(error))mainDrawFailure=String(error).slice(0,512);throw error;}}finally{try{if(gl.isContextLost()){matrix=undefined;}else{gl.bindVertexArray(old.vao);gl.useProgram(old.program);old.depth?gl.enable(gl.DEPTH_TEST):gl.disable(gl.DEPTH_TEST);old.blend?gl.enable(gl.BLEND):gl.disable(gl.BLEND);old.cull?gl.enable(gl.CULL_FACE):gl.disable(gl.CULL_FACE);gl.depthMask(old.mask);gl.depthFunc(old.depthFunc);gl.blendFuncSeparate(old.src,old.dst,old.srcA,old.dstA);}}finally{activeMainFrame=previousFrame;frame.release();}}if(completedMain&&drawWitness&&frame.version===geometryOwner.scene.version)pendingMainFrame=drawWitness;},onRemove(){releaseGPU();}};
 const renderWithSolarReceiver=layer.render;layer.render=guardCustomLayerRender(map,layer.id,(context,args)=>{pendingMainFrame=undefined;try{const main='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;const result=!main||!('createVertexArray'in context)?renderWithSolarReceiver(context,args):withSceneSolarShadowReceiver(context as WebGL2RenderingContext,main,()=>renderWithSolarReceiver(context,args));const completed=takeCompletedMainFrame();if(completed)recordCompleteMainFrame(completed.empty,completed);return result;}catch(error){invalidateMainFrame();if(!isProgramPreparationPending(error)&&!gl?.isContextLost())mainDrawFailure=String(error).slice(0,512);throw error;}},()=>Boolean(gl?.isContextLost()));

 residentGPU=createResidentGPULifecycle<WebGL2RenderingContext>({bind:context=>{gl=context;},initialize:initializeResidentGPU,release:releaseGPU,ready:gpuReady,lost:context=>context.isContextLost(),hasResident:()=>sceneIndexCount()>0||!!sceneIndexCount(pendingGeometry?.packed.sceneChunks??[]),needsPreflight:()=>gpuPreflightRequired,clearTransient:()=>{},revision:()=>viewRevision});
 const releaseResidentLayer=layer.onRemove;layer.onRemove=()=>{releaseResidentLayer();residentGPU!.detach();};

 function drawSceneRange(p:WebGLProgram,firstIndex:number,indexCount:number){if(!gl||!mainWorldMatrix)return false;const frame=activeMainFrame;if(frame&&frame.version!==geometryOwner.scene.version)return false;const end=firstIndex+indexCount,rows:{chunk:ChurchPackedChunk;first:number;count:number}[]=[];for(const span of sceneSpans){const first=Math.max(firstIndex,span.firstIndex),last=Math.min(end,span.firstIndex+span.indexCount);if(last<=first)continue;const local=span.localFirstIndex+first-span.firstIndex,previous=rows.at(-1);if(previous?.chunk===span.chunk&&previous.first+previous.count===local)previous.count+=last-first;else rows.push({chunk:span.chunk,first:local,count:last-first});}for(const row of rows){if(frame&&frame.version!==geometryOwner.scene.version)return false;const chunk=row.chunk,geometry=chunk.geometry?.value;if(!geometry)return false;const scale=1/chunk.unit,clip=multiply(mainWorldMatrix,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,chunk.anchor[0],chunk.anchor[1],0,1]);gl.bindVertexArray(geometry.vao);gl.uniformMatrix4fv(gl.getUniformLocation(p,'u_matrix'),false,new Float32Array(clip));gl.uniform1f(gl.getUniformLocation(p,'u_style_scale'),materialUnit/chunk.unit);gl.uniform2f(gl.getUniformLocation(p,'u_style_offset'),(chunk.anchor[0]-materialAnchor![0])*materialUnit,-(chunk.anchor[1]-materialAnchor![1])*materialUnit);if(!(frame?.masks.get(chunk)??chunk.masks).withResidentMasks(gl,p,()=>drawResidentTriangles(gl!,geometry.vao,row.count,row.first*4)))return false;}return true;}
 function pickSurface(point:{x:number;y:number},signal?:AbortSignal):SurfaceHit|undefined{
  if(destroyed||pageHidden||!enabled||!gpuReady()||!matrix||!mainWorldMatrix||signal?.aborted||opacity<.01)return;const canvas=map.getCanvas();if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.y<0||point.x>canvas.clientWidth||point.y>canvas.clientHeight)return;
  const inv=inverse(mainWorldMatrix);if(!inv)return;const x=2*point.x/canvas.clientWidth-1,y=1-2*point.y/canvas.clientHeight,worldOrigin=project(inv,x,y,-1),far=project(inv,x,y,1),d=sub(far,worldOrigin),len=Math.hypot(...d);if(!Number.isFinite(len)||!len)return;const worldDirection=d.map(v=>v/len),hold=geometryOwner.capture('picking');
  let hit:{c:ChurchLoadedComponent;distance:number;worldDistance:number;normal:number[]}|undefined;
  try{for(const chunk of sceneChunks){const data=chunk.cpu.value;if(!data)continue;const origin=[(worldOrigin[0]-chunk.anchor[0])*chunk.unit,worldOrigin[2]*chunk.unit,-(worldOrigin[1]-chunk.anchor[1])*chunk.unit],direction=[worldDirection[0],worldDirection[2],-worldDirection[1]],p=(v:number)=>[data.vertices[v*9],data.vertices[v*9+1]*(chunk.stateData[v]%2),data.vertices[v*9+2]];
    for(const c of chunk.loaded.values()){const growth=chunk.stateData[c.firstVertex]%2;if(growth<.005)continue;const box=[...c.box];box[1]*=growth;box[4]*=growth;if(!boxHit(origin,direction,box))continue;
     for(let i=c.start;i<c.end;i+=3){const result=triangle(origin,direction,p(data.indices[i]),p(data.indices[i+1]),p(data.indices[i+2]));if(!result||hit&&result.distance/chunk.unit>=hit.worldDistance)continue;
      if(paintMode()===2&&c.objectId==='osm/relation/147095'&&chunk.masks.origin){const o=chunk.masks.origin,m=merc(o),ratio=chunk.unit/unit(o[1]),dx=(m[0]-chunk.anchor[0])*chunk.unit,dz=-(m[1]-chunk.anchor[1])*chunk.unit,q=origin.map((v,k)=>v+direction[k]*result.distance);if(chunk.masks.covered(c,(q[0]-dx)/ratio,q[1]/ratio/Math.max(growth,.005),(q[2]-dz)/ratio))continue;}
      hit={c,...result,worldDistance:result.distance/chunk.unit};
     }
    }
   }
   if(!hit||signal?.aborted)return;const q=worldOrigin.map((v,i)=>v+worldDirection[i]*hit!.worldDistance),lnglat=geo(q[0],q[1]);return{objectId:hit.c.objectId,partId:hit.c.partId,generation,viewRevision,hitLngLat:lnglat,hitAltitudeM:q[2]*unit(lnglat[1]),surface:isSourceOnlyGlassRoof(hit.c)||Math.abs(hit.normal[1])/Math.hypot(...hit.normal)>.2?'roof':'wall',distance:hit.worldDistance*anchorUnit,opacityContext,surfaceOpacity:opacityContext==='route-selection'?Math.min(opacity,.2):opacity,occludesGround:(opacityContext==='route-selection'?Math.min(opacity,.2):opacity)>=.99};
  }finally{hold.release();}
 }
 function componentIntersectsScreen(c:BuildingComponent&{box:number[];firstVertex:number}){return !matrix||!paintBoxOutsideClip(c.box,matrix);}
 function hasVisibleUnsupportedQueueComponent(){for(const id of unsupportedQueueComponents){const c=loaded.get(id);if(c&&componentIntersectsScreen(c))return true;}return false;}
 function scheduleFullProgramUpgradeForVisibleUnsupported(){if(!queueOnlyProgram||fullProgramUpgradeFailure||pendingGeometry||destroyed||pageHidden||!enabled||!gl||gl.isContextLost()||!hasVisibleUnsupportedQueueComponent())return;fullProgramUpgradePending=true;const budgetWaits=programPreparation.budgetWaits;try{const packed=capturePackedState();packed.familyRuns=sceneProgramRuns(packed.sceneChunks,packed.sceneSpans);const candidate=createGeometryCandidate(packed);candidate.queueMode=false;pendingGeometry=candidate;upload();}catch(error){if(isProgramPreparationPending(error)){if(programPreparation.needsFrameAfter?.(budgetWaits)!==false)map.triggerRepaint();return;}fullProgramUpgradePending=false;fullProgramUpgradeFailure=String(error).slice(0,512);map.triggerRepaint();}}
 function writeSelectionState(stateData:Float32Array,loaded:ReturnType<typeof capturePackedState>['loaded']){const c=selectedIdentity?loaded.get(key(selectedIdentity)):undefined;let changed=false;for(let i=0;i<stateData.length;i++){const next=Math.floor(stateData[i]/4)*4+(stateData[i]%2)+2*Number(enabled&&selectionActive&&!!c&&i>=c.firstVertex&&i<c.lastVertex);if(next!==stateData[i]){stateData[i]=next;changed=true;}}return changed;}
 function writeChunkSelection(chunks=sceneChunks){let changed=false;for(const chunk of chunks){const localChanged=writeSelectionState(chunk.stateData,chunk.loaded);chunk.stateDirty=localChanged||chunk.stateDirty;changed=localChanged||changed;}return changed;}
 function paintSelection(){const changed=writeChunkSelection();uploadState(changed);map.triggerRepaint();}
 function clearSelection(){selectedIdentity=undefined;paintSelection();}
 function diagnosticScreenSamples(identity?:Identity){if(!matrix||!gpuReady())return [];const canvas=map.getCanvas(),w=canvas.clientWidth,h=canvas.clientHeight,out:{objectId:string;partId:string;box:number[];screenBox:number[];growth:number}[]=[];for(const c of loaded.values()){if(identity&&key(c)!==key(identity))continue;const growth=componentGrowth(c),box=c.box,screen=[Infinity,Infinity,-Infinity,-Infinity];let front=false;for(const x of [box[0],box[3]])for(const y of [box[1]*growth,box[4]*growth])for(const z of [box[2],box[5]]){const q=[x,y,z,1],clip=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)clip[r]+=matrix[k*4+r]*q[k];if(clip[3]<=0)continue;front=true;const sx=(clip[0]/clip[3]+1)*w/2,sy=(1-clip[1]/clip[3])*h/2;screen[0]=Math.min(screen[0],sx);screen[1]=Math.min(screen[1],sy);screen[2]=Math.max(screen[2],sx);screen[3]=Math.max(screen[3],sy);}if(front&&screen[0]<=w&&screen[2]>=0&&screen[1]<=h&&screen[3]>=0){out.push({objectId:c.objectId,partId:c.partId,box:[...box],screenBox:screen,growth});if(out.length>=160)break;}}return out;}
 function isPickReady(){return !geometryUploadPending&&!destroyed&&!pageHidden&&enabled&&(residentGPU?.isEmptyReady()||(gpuReady()&&!!matrix))&&!familyPending;}
 function getDrawReadiness():ResidentDrawReadiness{
  if(destroyed||pageHidden||!enabled||gl?.isContextLost())return{ready:false,preparing:false};
  if(activeChunkPreparation)return{ready:false,preparing:true};
  if(pendingGeometry||geometryUploadPending)return{ready:false,preparing:true};
  const hasGeometry=sceneIndexCount()>0,upgradeRequired=queueOnlyProgram&&hasVisibleUnsupportedQueueComponent();
  let failure=geometryUploadFailure??mainProgramFailure??mainDrawFailure??(upgradeRequired?fullProgramUpgradeFailure:undefined);
  let preparing=geometryUploadPending||!!pendingGeometry||fullProgramUpgradePending||upgradeRequired||hasGeometry&&!gpuReady();
  const mode=paintMode();
  if(hasGeometry&&!queueOnlyProgram&&mode>1.5){
   for(const key of mainPaintProgramKeys()){
    failure??=familyFailures.get(key);
    if(key===currentPaintProgramKey(0)?!program:!familyPrograms.has(key))preparing=true;
   }
  }
  if(hasGeometry&&landmarkVisible&&mode===1){
   const window=windowTexture?.stats,diffuse=diffuseTexture?.stats;
   // Texture downloads keep the existing colour fallback; only already eligible
   // material-program preparation belongs to this draw readiness check.
   preparing ||= !!(facadeAttached&&window?.textureObjects&&surfaceFragment&&!texturedProgram&&!textureShaderFailure);
   preparing ||= !!(facadeAttached&&window?.textureObjects&&diffuse?.totalTextureObjects===2&&diffuseFragment&&!diffuseProgram&&!diffuseShaderFailure);
  }
  if(failure!==undefined)return{ready:false,preparing:false,failure:failure||'Required main draw failed'};
  preparing ||= hasGeometry&&!mainFrameCurrent();return{ready:!preparing&&isPickReady(),preparing};
 }
 function borrowSourceComponent(identity:Identity){return loaded.get(key(identity))??(sourceLoaded.has(key(identity))?{...sourceLoaded.get(key(identity))!,generation}:undefined);}
 function borrowSurfaceComponent(identity:Identity){return loaded.get(key(identity));}
 function resourceResidency(programs:typeof programPreparation.stats){
  const main=mainPaintProgramKeys(),capture=captureProgramKeys();
  if(sceneIndexCount()){main.add('base');if(texturedProgram)main.add('material:window');if(diffuseProgram)main.add('material:diffuse');}
  const bounded=(keys:Set<string>)=>{const values:string[]=[];for(const value of keys){if(values.length===12)break;values.push(value);}return values;};
  const residentKeys=new Set(sceneChunks.map(c=>c.contentKey));let pendingGeometryLogicalBytes=0;for(const chunk of pendingGeometry?.packed.sceneChunks??[])if(!residentKeys.has(chunk.contentKey))pendingGeometryLogicalBytes+=sceneTypedBytes([chunk]);
  const mainGeometry=geometryOwner.stats,shadowGeometry=shadowGeometryOwner.stats;
  return{publishedId:publishedPlanId,publishedGeneration:publishedPlanId===null?null:generation,candidateId:pendingGeometry?.id??null,candidateGeneration:pendingGeometry?.packed.generation??null,candidateOwnedProgramReferences:pendingGeometry?Number(!!pendingGeometry.program)+pendingGeometry.families.size+Number(!!pendingGeometry.textured)+Number(!!pendingGeometry.diffuse):0,activeMainCount:main.size,activeMainKeys:bounded(main),activeMainKeysTruncated:main.size>12,activeCaptureCount:capture.size,activeCaptureKeys:bounded(capture),activeCaptureKeysTruncated:capture.size>12,sourceWorkspaceBudget:sourceWorkspace.preparedSourceStats.budget,sourceWorkspaceRecords:Number(!!berlinComparisonCharacters)+Number(!!sourceWorkspace.preparedSourceStats.sourceCharacters),sourceWorkspaceCharacters:berlinComparisonCharacters+sourceWorkspace.preparedSourceStats.sourceCharacters,sourceWorkspaceUTF8Bytes:berlinComparisonUTF8Bytes,currentGeometryLogicalBytes:sceneTypedBytes(),pendingGeometryLogicalBytes,cpuChunks:sceneChunks.length,candidateChunks:pendingGeometry?.packed.sceneChunks.length??0,mainGeometryRevision:mainGeometry.revision,mainOwnedBufferBytes:mainGeometry.ownedBufferBytes,referencedStaticBufferLogicalBytes:sceneChunks.reduce((n,c)=>{const data=c.geometry?.value&&c.cpu.value;return n+(data?data.vertices.byteLength+data.indices.byteLength+data.paint.byteLength+data.progressive.byteLength:0);},0),mainOwnedBuffers:mainGeometry.ownedBuffers,mainBorrowedBuffers:mainGeometry.borrowedBuffers,shadowGeometryRevision:shadowGeometry.revision,shadowOwnedBufferBytes:shadowGeometry.ownedBufferBytes,shadowOwnedBuffers:shadowGeometry.ownedBuffers,shadowBorrowedBuffers:shadowGeometry.borrowedBuffers,programContextId:programs.resourceObjects?.contextId??null,createdPrograms:programs.resourceObjects?.createdPrograms??null,deleteProgramRequests:programs.resourceObjects?.deleteProgramRequests??null,programResourceObjectScope:programs.resourceObjects?.scope,sharedGrantedReferences:programs.shared.grantedReferences,sharedReleasedReferences:programs.shared.releasedReferences,mainGeometryContextId:mainGeometry.contextId,mainCreatedBuffers:mainGeometry.createdBuffers,mainDeleteBufferRequests:mainGeometry.deleteBufferRequests,mainCreatedVertexArrays:mainGeometry.createdVertexArrays,mainDeleteVertexArrayRequests:mainGeometry.deleteVertexArrayRequests,mainGeometryObjectScope:mainGeometry.lifetimeScope,shadowGeometryContextId:shadowGeometry.contextId,shadowCreatedBuffers:shadowGeometry.createdBuffers,shadowDeleteBufferRequests:shadowGeometry.deleteBufferRequests,shadowCreatedVertexArrays:shadowGeometry.createdVertexArrays,shadowDeleteVertexArrayRequests:shadowGeometry.deleteVertexArrayRequests,shadowGeometryObjectScope:shadowGeometry.lifetimeScope};
 }
 function growthSnapshot(){let min=1,max=0;for(const c of loaded.values()){const value=componentGrowth(c);min=Math.min(min,value);max=Math.max(max,value);}return {generation,components:loaded.size,activeBirths:birth.size,minGrowth:loaded.size?min:1,maxGrowth:loaded.size?max:1,enabled,ready:gpuReady(),pageHidden};}
 return {getProgramPreparationStats:()=>{const programs=programPreparation.stats;return[{provider:'church',...programs,resourceResidency:resourceResidency(programs)}];},getReadinessDiagnostic:()=>({programPreparation:programPreparation.stats,geometryResources:{main:geometryOwner.stats,shadow:shadowGeometryOwner.stats},geometryUploadPending,geometryUploadFailure,geometryPostPublishFailure,fullProgramUpgradeFailure}),layer,getGrowthSamplingState:()=>({activeBirths:birth.size,enabled,pageHidden}),growthSnapshot,diagnosticScreenSamples,getComponentDisplayState(identity:Identity){const sample=diagnosticScreenSamples(identity)[0];if(!enabled||pageHidden||!sample||!gpuReady())return undefined;return {visible:true,growth:sample.growth,selected:selectionActive&&!!selectedIdentity&&key(selectedIdentity)===key(identity),opacity:opacityContext==='route-selection'?Math.min(opacity,.2):opacity};},isPickReady,getDrawReadiness,cancelCandidate,getRevision:()=>({generation,viewRevision}),getComponent:(identity:Identity)=>{const readback=copyBuildingComponentMetadata(loaded.get(key(identity)));if(readback)readback.displayEstimates={...readback.displayEstimates,progressivePainted:false};return readback;},getProgressiveRenderStatus:()=>[],getProgressivePaintFingerprints:()=>undefined,borrowSourceComponent,borrowSurfaceComponent,getSourceComponent:(identity:Identity)=>copyBuildingComponentReadback(borrowSourceComponent(identity)),getSurfaceComponent:(identity:Identity)=>copyBuildingComponentReadback(borrowSurfaceComponent(identity)),get nativeGroupDisplay(){return copyBuildingComponentReadback(nativeGroupPlan);},setEnabled(value:boolean){if(!value){activeChunkPreparation?.release();endCaptureDemands();discardPendingGeometry();programPreparation.cancel();shadowMask?.cancelPending?.();clearBerlinProgramComparison();sourceWorkspace.clearPreparedSource();}if(value===enabled)return;invalidateMainFrame();viewRevision++;enabled=value;syncFacadeResources();matrix=undefined;paintSelection();},setOpacity(value:number){if(!Number.isFinite(value)||value<0||value>1)throw Error('Invalid opacity');if(value===opacity)return;opacity=value;programPreparation.prune();viewRevision++;matrix=undefined;map.triggerRepaint();},setOpacityContext(value:'normal'|'route-selection'){if(value!=='normal'&&value!=='route-selection')throw Error('Invalid opacity context');if(value===opacityContext)return;opacityContext=value;programPreparation.prune();viewRevision++;matrix=undefined;map.triggerRepaint();},prepareBatches,setBatches,retainPublishedSelection(identity:Identity){if(!loaded.has(key(identity)))return;const cpu=localComponent(identity)?.chunk.cpu;if(!cpu||cpu.released||cpu.state!=='ready')return;const pin=cpu.retain('selected');return{contentKey:pin.contentKey,release:()=>pin.release()};},setSelection(identity:Identity){const c=sourceLoaded.get(key(identity))??loaded.get(key(identity));if(!c)throw Error('Selection component not loaded');if(selectedIdentity&&key(selectedIdentity)===key(identity)&&selectionActive)return;selectedIdentity={...identity};selectionActive=true;paintSelection();},clearSelection,suspendSelection(){selectionActive=false;paintSelection();},resumeSelection(){selectionActive=true;paintSelection();},get selected(){return selectedIdentity?{...selectedIdentity}:undefined;},pick:pickSurface,getSolarShadowAdmission(identity:Identity){const c=loaded.get(key(identity));return {resident:!!c,admitted:solarShadowAdmittedKeys.has(key(identity)),enabled:sceneEnvironment.shadows,mode:solarShadowMode,boundarySHA256:solarBoundary?.boundarySHA256,legacyBoundarySHA256:shadowSourceBoundarySHA||undefined,geometryRole:'accepted-resident-display-mesh',sourceFeature:c?.sourceFeature,packedBounds:c?.box,instantISO:sceneSun.instantISO};},get sceneSunlight(){return {...sceneSun,quality:sceneEnvironment.quality,activeSunDirection:sceneSun.direction,shadowMode:sceneEnvironment.shadows?solarShadowMode:'disabled',dynamicShadowAdmitted:solarShadowAdmitted,dynamicShadowWithheld:solarShadowWithheld,contactShading:'display-wall-foot'};},setSolarShadowBoundary(value:SolarShadowBoundary){const next=prepareSolarShadowBoundary(value);solarBoundary=next;if(updateSolarShadowIndices())uploadShadow();map.triggerRepaint();},setSceneEnvironment(value:SceneEnvironmentState){const next=checkedSceneEnvironment(value),light=sceneSolarLight(sceneSunOrigin[0],sceneSunOrigin[1],next.instantISO);const qualityChanged=sceneEnvironment.quality!==next.quality;sceneEnvironment=next;if(qualityChanged)syncFacadeResources();if(!next.shadows)shadowMask?.cancelPending?.();sceneSunInstant=next.instantISO;sceneSun=light;programPreparation.prune();const nextReduced=ownerReducedMotion||!next.motion;if(nextReduced!==reducedMotion){reducedMotion=nextReduced;needsBirth=true;if(reducedMotion){for(const k of birth.keys())rememberFinishedBirth(k);birth.clear();}}if(updateSolarShadowIndices())uploadShadow();map.triggerRepaint();},setSunlightInstant(instantISO:string){const next=sceneSolarLight(sceneSunOrigin[0],sceneSunOrigin[1],instantISO);sceneSunInstant=instantISO;sceneSun=next;programPreparation.prune();if(updateSolarShadowIndices())uploadShadow();map.triggerRepaint();},setPageHidden(value:boolean){if(value!==pageHidden||value)invalidateMainFrame();if(value)activeChunkPreparation?.release();if(value)endCaptureDemands();if(value)discardPendingGeometry();if(value){clearBerlinProgramComparison();sourceWorkspace.clearPreparedSource();}if(value===pageHidden)return;if(value){programPreparation.cancel();shadowMask?.cancelPending?.();}pageHidden=value;windowTexture?.setPageHidden(value);diffuseTexture?.setPageHidden(value);syncFacadeResources();viewRevision++;matrix=undefined;if(!value)map.triggerRepaint();},setReducedMotion(value:boolean){ownerReducedMotion=value;const effective=value||!sceneEnvironment.motion;if(effective===reducedMotion)return;reducedMotion=effective;needsBirth=true;if(effective){for(const k of birth.keys())rememberFinishedBirth(k);birth.clear();}viewRevision++;matrix=undefined;map.triggerRepaint();},resetBirthHistory(){invalidateMainFrame();map.triggerRepaint();birth.clear();seenBirth.clear();needsBirth=true;},prepareSolarShadow,getSolarShadowCoverage:solarCoverage,getSolarShadowRevision(){return captureContentRevision();},getPlanarReflectionRevision: captureContentRevision,preparePlanarReflection,setCaptureDemand,renderPlanarReflection(pass:ResidentPlanarReflectionPass):ResidentPlanarReflectionResult {return captureRuntime.render(pass);},get residentVertexCount(){return sceneVertexCount();},get stats(){return {solarDepth:{programs:Number(!!familyPrograms.get(fullColourProgramKey)),keys:familyPrograms.has(fullColourProgramKey)?[fullColourProgramKey]:[],sourceCharacters:fullColourSourceCharacters,failure:fullColourFailure,revision:fullColourRevision},programPreparation:programPreparation.stats,gpuLifecycle:residentGPU?.stats,appearancePolicy:'md-admitted-native-facade-paint',geometryProgramProfile:queueOnlyProgram?'munich-queue-materials':'current-family-facade',familyPrograms:{lastCompileAttempt:lastCompileAttempt?{...lastCompileAttempt}:undefined,failures:[...familyFailures],sharedBerlinPrograms:berlinSharedFamilyPrograms??null,reviewedSharingFamilies:BERLIN_CHURCH_SHARED_FAMILIES,cached:familyPrograms.size,visible:visibleFamilyCount,pending:familyPending,evictions:familyEvictions,lastFragmentCharacters,activeFamilies:[...new Set(familyRuns.map(r=>currentPaintProgramFamily(r.key)))]},rathausProxyFragments:rathausProxyMasks.stats,architecturalDescriptions:DESCRIPTION_BINDINGS.map(d=>({file:d.file,sha256:d.sha256})),facadePaintMode:paintMode(),facadePaintOverride:paintOverride(),facadePaintGPUBytes:paintBuffer?sceneArrayBytes('paint'):0,facadePaintCPUBytes:sceneArrayBytes('paint'),nurembergPaletteProbe:[...loaded.values()].filter(c=>["osm/way/14321884","osm/way/25007576","osm/way/44063118","osm/way/44196926","osm/way/76132302"].includes(c.objectId)).map(c=>({objectId:c.objectId,partId:c.partId,city:c.city,encodedFamily:(()=>{const q=localComponent(c);return q?.chunk.cpu.value?.paint[q.row.firstVertex*5+4];})(),encodedFrame:(()=>{const q=localComponent(c);return q?Array.from(q.chunk.cpu.value!.paint.slice(q.row.firstVertex*5,q.row.firstVertex*5+5)):[];})()})),addedGeometryVertices:[...loaded.values()].reduce((n,c)=>n+(c.displaySupplement?.addedVertices??0),0),addedGeometryTriangles:[...loaded.values()].reduce((n,c)=>n+(c.displaySupplement?.addedTriangles??0),0),heldSourceOutlines:heldSourceOutlines.map(r=>({objectId:r.outline.objectId,partId:r.outline.partId,visibleBody:{objectId:r.body.objectId,partId:r.body.partId},sourceRetained:true,reason:'exact-native-building-part-footprint'})),landmarkVisible,facadeAttached,diffuseShaderFailure,diffuseShaderAttempted,diffuseTexture:diffuseTexture?.stats,textureShaderFailure,textureShaderAttempted,geometryPrograms:(program?1:0)+(texturedProgram?1:0)+(diffuseProgram?1:0)+familyPrograms.size,windowTexture:windowTexture?.stats,pageHidden,needsBirth,growthHistory:seenBirth.size,growthHistoryLimit:BIRTH_LIMIT,activeBirths:birth.size,components:loaded.size,vertices:sceneVertexCount(),triangles:sceneIndexCount()/3,gpuBufferBytes:geometryOwner.stats.ownedBufferBytes+(shadowIndexBuffer?shadowUploadedIndexCount*4:0)+rathausProxyMasks.stats.allocatedGPUBytes,pendingGeometryCPUBytes:pendingGeometryBytes(),cpuTypedArrayBytes:pendingGeometryBytes()+sceneTypedBytes()+rathausProxyMasks.stats.allocatedCPUBytes,shadowAdmittedComponents,shadowHeldComponents:loaded.size-shadowAdmittedComponents,shadowTriangles:sceneShadowIndexCount()/3,shadowIndexBytes:sceneArrayBytes('shadow'),shadowGPUReady:!!(shadowProgram&&shadowVao&&shadowIndexBuffer),shadowFailure,shadowDraws,shadowMask:shadowMask.stats,shadowDrawBatchesPerFrame:shadowProgram&&sourceShadowOpacity(opacity,opacityContext)>0?2:0,shadowRole:'date-time-solar-display',solarAdmissionRole:'accepted-resident-display-mesh; source and owner provenance unchanged',sceneEnvironment:{...sceneEnvironment,activeSunDirection:sceneSun.direction,shadowMode:sceneEnvironment.shadows?solarShadowMode:'disabled',dynamicShadowAdmitted:solarShadowAdmitted,dynamicShadowWithheld:solarShadowWithheld,minimumShadowSolarAltitudeDegrees:SCENE_SHADOW_MIN_ALTITUDE_DEGREES,boundarySHA256:solarBoundary?.boundarySHA256,fixedShadowIndexBytes:fixedShadowIndexBytes,dynamicShadowIndexBytes:sceneArrayBytes('shadow')},sourceObjectsStillRetained:true,sourceComponents:sourceLoaded.size,nativeGroupDisplay:nativeGroupPlan?.groups.map(g=>({relationId:g.relationId,outline:{objectId:g.outline.objectId,partId:g.outline.partId},declaredPartCount:g.declaredPartCount,compiledPartCount:g.compiledPartCount,residentPartCount:g.residentPartCount,missingPartIds:[...g.missingPartIds],unknownPartIds:[...g.unknownPartIds],ownershipUnverifiedPartIds:[...g.ownershipUnverifiedPartIds],viewportMissingPartIds:[...g.viewportMissingPartIds],complete:false})),nativeGroupDisplayErrors:copyBuildingComponentReadback(nativeGroupPlan?.errors),measurement:'allocated typed arrays; not total process/GPU heap' as const};},destroy(){if(destroyed)return;destroyed=true;activeChunkPreparation?.release();publishedPlanId=null;enabled=false;selectedIdentity=undefined;document.removeEventListener('facade-paint-camera',paintCamera);document.removeEventListener('facade-paint-change',repaintPaint);map.off('move',move);map.off('resize',move);map.off('webglcontextlost',contextLost);map.off('webglcontextrestored',contextRestored);unsupportedQueueComponents.clear();fullProgramUpgradePending=false;releasePackedChunks(sceneChunks,sceneChunkBindings);sceneChunks=[];sceneSpans=[];sceneChunkBindings=undefined;forgetPaintVisibility(loaded);loaded.clear();sourceLoaded.clear();familyRuns=[];nativeGroupPlan=undefined;heldSourceOutlines=[];birth.clear();seenBirth.clear();rathausProxyMasks.destroy();fixedShadowIndexBytes=0;fixedShadowRanges=[];solarShadowAdmittedKeys.clear();solarBoundary=undefined;matrix=undefined;releaseGPU();residentGPU?.detach();windowTexture?.destroy();diffuseTexture?.destroy();programPreparation.dispose();sourceWorkspace.release();}};
}
