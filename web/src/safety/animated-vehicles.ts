import type {DisplayFrameClock} from './display-frame-clock';
import {createEnvironmentMotion} from './environment-motion';
import {reportCustomLayerRenderError} from './custom-layer-render-error';
import {withQaCustomLayerRenderTiming} from './qa-custom-layer-render-timing';
import {parseVehicleScenery,type VehicleScenery,type SceneryRoad} from './vehicle-scenery-data';
import {allocateVehicleSlots,stableVehicleSeed,VEHICLE_POLICY,type VehicleSlot} from './vehicle-density-policy';
import {planVehicleFrameWork,type VehicleFrameLoad} from './vehicle-frame-budget';
import type {ChunkResourceStore} from './render-runtime/chunk-resource-types';
import type {ResourceBudgetCost,ResourceBudgetReservation} from './render-runtime/resource-budget';
import {createEnvironmentGpuLedger,environmentAdmissionError,environmentProgramAllowanceCosts,environmentResourceStore,gpuBufferCost,reserveEnvironmentClaims,reserveEnvironmentCosts,waitForEnvironmentBudget,EnvironmentResourcePendingError} from './environment-resource-budget';
import {vehicleFixedCosts,vehicleViewportBound,vehicleViewportRetainedBytes} from './environment-resource-vehicles';
type MapSurface={triggerRepaint():void;fire?:(type:'error',event:{error:Error;layerId:string})=>unknown};
type RoadPath={key?:string;visibleLength?:number;offset?:number;points:[number,number][];lengths:number[];length:number};
const C=2*Math.PI*6378137;
const merc=(p:[number,number]):[number,number]=>[(p[0]+180)/360,(1-Math.log(Math.tan(Math.PI/4+p[1]*Math.PI/360))/Math.PI)/2];
function matrix(a:ArrayLike<number>,b:Float64Array,r:Float32Array){r.fill(0);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r;}
export function roadPosition(path:RoadPath,distance:number){if(!path.length)return;const d=((distance%path.length)+path.length)%path.length;let lo=1,hi=path.lengths.length-1;while(lo<hi){const m=(lo+hi)>>>1;if(path.lengths[m]<d)lo=m+1;else hi=m;}const a=path.points[lo-1],b=path.points[lo],segment=path.lengths[lo]-path.lengths[lo-1];if(segment<=0)return;const t=(d-path.lengths[lo-1])/segment;return{x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,angle:Math.atan2(b[1]-a[1],b[0]-a[0])};}

export function clipRoadPath(path:RoadPath,b:[number,number,number,number],minLength=5):RoadPath[]{
 const out:RoadPath[]=[];let points:[number,number][]=[],startDistance=0;
 const flush=()=>{if(points.length>1){const lengths=[0];for(let j=1;j<points.length;j++)lengths.push(lengths[j-1]+Math.hypot(points[j][0]-points[j-1][0],points[j][1]-points[j-1][1]));if(lengths.at(-1)!>minLength)out.push({key:path.key,offset:startDistance,points,lengths,length:lengths.at(-1)!});}points=[];};
 for(let i=1;i<path.points.length;i++){const a=path.points[i-1],z=path.points[i],dx=z[0]-a[0],dz=z[1]-a[1];let lo=0,hi=1,ok=true;for(const [p,q]of [[-dx,a[0]-b[0]],[dx,b[2]-a[0]],[-dz,a[1]-b[1]],[dz,b[3]-a[1]]]){if(Math.abs(p)<1e-12){if(q<0){ok=false;break;}}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi){ok=false;break;}}}if(!ok){flush();continue;}const x:[number,number]=[a[0]+dx*lo,a[1]+dz*lo],y:[number,number]=[a[0]+dx*hi,a[1]+dz*hi];if(points.length&&Math.hypot(points.at(-1)![0]-x[0],points.at(-1)![1]-x[1])>1e-6)flush();if(!points.length){points.push(x);startDistance=path.lengths[i-1]+lo*(path.lengths[i]-path.lengths[i-1]);}points.push(y);if(hi<1)flush();}flush();return out;
}

/** Self-authored display-only 44-vertex/22-triangle car shell. No texture/model download. */
export function compactCarMesh(){
 const positions:number[]=[],indices:number[]=[];
 const face=(p:number[][],n:number[])=>{const at=positions.length/6,len=Math.hypot(...n);for(const q of p)positions.push(q[0],q[1],q[2],n[0]/len,n[1]/len,n[2]/len);for(let i=1;i<p.length-1;i++)indices.push(at,at+i,at+i+1);};
 for(const [n,p]of [
 [[1,0,0],[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],
 [[-1,0,0],[[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]],
 [[0,1,0],[[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]],
 [[0,-1,0],[[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]],
 [[0,0,1],[[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,1]]],
 [[0,0,-1],[[-1,-1,-1],[-1,1,-1],[1,1,-1],[1,-1,-1]]]
 ] as [number[],number[][]][])face(p.map(q=>[q[0]*2.1,.57+q[1]*.23,q[2]*.85]),n);
 face([[1.15,.8,-.85],[.45,1.4,-.63],[.45,1.4,.63],[1.15,.8,.85]],[.6,.7,0]);
 face([[-1.35,.8,.85],[-.7,1.4,.63],[-.7,1.4,-.63],[-1.35,.8,-.85]],[-.6,.65,0]);
 face([[.45,1.4,-.63],[-.7,1.4,-.63],[-.7,1.4,.63],[.45,1.4,.63]],[0,1,0]);
 for(const side of [-1,1])face([[1.15,.8,side*.85],[.45,1.4,side*.63],[-.7,1.4,side*.63],[-1.35,.8,side*.85]],[0,.22,side*.6]);
 return {vertexData:new Float32Array(positions),indices:new Uint16Array(indices),vertices:positions.length/6,triangles:indices.length/3};
}
export function createVehiclePositionScratch(cap:number,roadCount=0){let size=1;while(size<cap*4)size*=2;return {x:new Int32Array(size),z:new Int32Array(size),stamp:new Uint32Array(size),generation:0,slotIndices:new Uint16Array(cap),roadMarks:new Uint32Array(roadCount),firstVisibleSlotByRoad:new Uint16Array(roadCount),activeRoadFragments:0,culled:0,duplicateRejected:0,processed:0,projectionCulled:0,projectionBound:false,baselineVisible:0,primaryVisible:0,secondaryCounts:new Uint32Array(5)};}
const VEHICLE_CENTRE_Y=Math.fround(.232),CLIP_MARGIN=1-1e-5;
function vehicleCenterInProjection(x:number,z:number,m:ArrayLike<number>){
 const px=Math.fround(x),pz=Math.fround(z),y=VEHICLE_CENTRE_Y;
 const cx=m[0]*px+m[4]*y+m[8]*pz+m[12],cy=m[1]*px+m[5]*y+m[9]*pz+m[13],cz=m[2]*px+m[6]*y+m[10]*pz+m[14];
 const cw=m[3]*px+m[7]*y+m[11]*pz+m[15],limit=cw*CLIP_MARGIN;
 return cw>0&&Number.isFinite(cw)&&Math.abs(cx)<=limit&&Math.abs(cy)<=limit&&Math.abs(cz)<=limit;
}
/** Allocation-free frame writer; coincident 0.1m cells never inflate active count. */
export function writeVehicleInstances(roads:readonly RoadPath[],slots:readonly VehicleSlot[],elapsed:number,out:Float32Array,scratch:ReturnType<typeof createVehiclePositionScratch>,visibleBounds?:readonly[number,number,number,number],projectionMatrix?:ArrayLike<number>,thinEvery=1,baselineCap=out.length/3,secondaryOffset?:number,captureFirstVisible=false){
 scratch.generation=(scratch.generation+1)>>>0;if(!scratch.generation){scratch.stamp.fill(0);scratch.roadMarks.fill(0);scratch.generation=1;}const mask=scratch.stamp.length-1;let count=0;scratch.activeRoadFragments=0;scratch.culled=0;scratch.duplicateRejected=0;scratch.processed=0;scratch.projectionCulled=0;scratch.projectionBound=!!projectionMatrix;scratch.baselineVisible=0;scratch.primaryVisible=0;scratch.secondaryCounts.fill(0);if(captureFirstVisible)scratch.firstVisibleSlotByRoad.fill(0);
 for(let i=0;i<slots.length&&scratch.baselineVisible<baselineCap;i++){scratch.processed++;const slot=slots[i],path=roads[slot.roadIndex],d=((elapsed*slot.speed+path.length*slot.phase)%path.length+path.length)%path.length;let lo=1,hi=path.lengths.length-1;
  while(lo<hi){const m=(lo+hi)>>>1;if(path.lengths[m]<d)lo=m+1;else hi=m;}const a=path.points[lo-1],b=path.points[lo],len=path.lengths[lo]-path.lengths[lo-1];if(len<=0)continue;
  const t=(d-path.lengths[lo-1])/len,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;if(visibleBounds&&(x<visibleBounds[0]||x>visibleBounds[2]||z<visibleBounds[1]||z>visibleBounds[3])){scratch.culled++;continue;}if(projectionMatrix&&!vehicleCenterInProjection(x,z,projectionMatrix)){scratch.projectionCulled++;continue;}
  const qx=Math.round(Math.fround(x)*10),qz=Math.round(Math.fround(z)*10);let h=(Math.imul(qx,73856093)^Math.imul(qz,19349663))&mask,duplicate=false;
  while(scratch.stamp[h]===scratch.generation){if(scratch.x[h]===qx&&scratch.z[h]===qz){duplicate=true;break;}h=(h+1)&mask;}if(duplicate){scratch.duplicateRejected++;continue;}
  scratch.stamp[h]=scratch.generation;scratch.x[h]=qx;scratch.z[h]=qz;scratch.baselineVisible++;if(captureFirstVisible&&!scratch.firstVisibleSlotByRoad[slot.roadIndex])scratch.firstVisibleSlotByRoad[slot.roadIndex]=i+1;if(i%thinEvery!==thinEvery-1)continue;scratch.primaryVisible++;if(secondaryOffset!==undefined&&scratch.primaryVisible>Math.ceil(baselineCap/3))continue;const subgroup=Math.floor(i/3)%5;scratch.secondaryCounts[subgroup]++;if(secondaryOffset!==undefined&&(subgroup-secondaryOffset+5)%5>=3)continue;if(count>=out.length/3)continue;scratch.slotIndices[count]=i;if(scratch.roadMarks[slot.roadIndex]!==scratch.generation){scratch.roadMarks[slot.roadIndex]=scratch.generation;scratch.activeRoadFragments++;}const p=count++*3;out[p]=x;out[p+1]=z;out[p+2]=Math.atan2(b[1]-a[1],b[0]-a[0]);
 }return count;
}
/** Once per source/view commit: swap existing candidate identities, never coordinates or extra cars.
 * The submitted cohort count stays fixed; each eligible currently unrepresented road can
 * replace one selected slot from a road with more than one car. Identity then stays stable. */
export function balanceVisibleVehicleCohort(slots:VehicleSlot[],scratch:ReturnType<typeof createVehiclePositionScratch>,drawCount:number){
 const counts=scratch.roadMarks;counts.fill(0);for(let i=0;i<drawCount;i++)counts[slots[scratch.slotIndices[i]].roadIndex]++;
 let donor=0,swaps=0;for(let road=0;road<counts.length;road++){if(counts[road]||!scratch.firstVisibleSlotByRoad[road])continue;while(donor<drawCount&&counts[slots[scratch.slotIndices[donor]].roadIndex]<=1)donor++;if(donor>=drawCount)break;const selected=scratch.slotIndices[donor++],incoming=scratch.firstVisibleSlotByRoad[road]-1,oldRoad=slots[selected].roadIndex;[slots[selected],slots[incoming]]=[slots[incoming],slots[selected]];counts[oldRoad]--;counts[road]++;swaps++;}return swaps;
}
type VehicleBounds=readonly [number,number,number,number];
type SparseRoadSpan={roadIndex:number;from:number;to:number;seed:number;speed:number};
/** Clip in homogeneous space and optionally to the settled map bounds. */
export function frustumRoadLength(path:RoadPath,m:ArrayLike<number>,bounds?:VehicleBounds,visit?:(from:number,to:number)=>void){
 if(path.points.length<2)return 0;
 const clip=(p:readonly number[])=>{
  const x=Math.fround(p[0]),z=Math.fround(p[1]),y=VEHICLE_CENTRE_Y;
  return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],m[3]*x+m[7]*y+m[11]*z+m[15]];
 };
 let total=0,c=clip(path.points[0]);
 for(let i=1;i<path.points.length;i++){
  const a=path.points[i-1],b=path.points[i],d=clip(b);
  let lo=0,hi=1;
  for(let k=0;k<(bounds?10:6);k++){
   let fa:number,fb:number;
   if(k<6){
    const axis=k>>1,sign=k%2?1:-1;
    fa=c[3]*CLIP_MARGIN+sign*c[axis];fb=d[3]*CLIP_MARGIN+sign*d[axis];
   }else{
    const axis=(k-6)%2,sign=k<8?1:-1,bound=bounds![k-6];
    fa=sign*(a[axis]-bound);fb=sign*(b[axis]-bound);
   }
   if(fa<0&&fb<0){hi=-1;break;}
   if(fa<0)lo=Math.max(lo,fa/(fa-fb));else if(fb<0)hi=Math.min(hi,fa/(fa-fb));
  }
  c=d;
  const distance=path.lengths[i-1],length=path.lengths[i]-distance;
  if(hi>lo&&length>0){total+=length*(hi-lo);visit?.(distance+lo*length,distance+hi*length);}
 }
 return total;
}
function findSparseRoadSpan(roads:readonly RoadPath[],projection:ArrayLike<number>,bounds?:VehicleBounds){
 let best:SparseRoadSpan|undefined;
 for(let roadIndex=0;roadIndex<roads.length;roadIndex++){
  const road=roads[roadIndex];
  let from=0,to=0;
  const consider=()=>{
   if(to-from<=(best?best.to-best.from:0))return;
   const key=road.key??String(roadIndex),seed=stableVehicleSeed(key);
   best={roadIndex,from,to,seed:stableVehicleSeed(key+'/visible'),speed:(38+seed%28)*.09375};
  };
  frustumRoadLength(road,projection,bounds,(start,end)=>{
   if(start>to+1e-6){consider();from=start;}
   to=end;
  });
  consider();
 }
 return best;
}
/** Fast dense schematic motion, never observed traffic or source speed data. */
export function createAnimatedVehicles(map:MapSurface,city:string,{mobile=false,reducedMotion=false,clock=()=>performance.now(),id='decorative-source-road-vehicles',vehicleModel='lowpixel-white',onRenderError,onGpuStateChange,frameClock,resourceStore}:{mobile?:boolean;reducedMotion?:boolean;clock?:()=>number;id?:string;vehicleModel?:string;onRenderError?:(error:Error)=>void;/** Deferred GPU storage started (true) or ended (false). */onGpuStateChange?:(deferred:boolean)=>void;frameClock?:DisplayFrameClock;resourceStore?:ChunkResourceStore}={}){
 const cap=mobile?VEHICLE_POLICY.mobileCap:VEHICLE_POLICY.desktopCap,displayCap=Math.ceil(Math.ceil(cap/3)*.6),reservoir=mobile?VEHICLE_POLICY.mobileReservoir:VEHICLE_POLICY.desktopReservoir;
 const vertex=`#version 300 es
precision highp float;in vec3 a_position;in vec3 a_normal;in vec3 a_instance;uniform mat4 u_matrix;out float v_light;void main(){float c=cos(a_instance.z),s=sin(a_instance.z);vec3 p=vec3((a_position.x*c-a_position.z*s)*.4+a_instance.x,(a_position.y-.34)*.4+.02,(a_position.x*s+a_position.z*c)*.4+a_instance.y);vec3 n=vec3(a_normal.x*c-a_normal.z*s,a_normal.y,a_normal.x*s+a_normal.z*c);v_light=.65+.35*max(0.,dot(normalize(n),normalize(vec3(-.4,.85,.3))));gl_Position=u_matrix*vec4(p,1.);}`;
 const fragment=`#version 300 es
precision mediump float;in float v_light;out vec4 color;void main(){color=vec4(vec3(.96*v_light),1.);}`;
 /** The constant program allowance: one program and its VAO (DECISIONS
  * 2026-11-02 03:25 policy estimate, about 20 KiB; driver-side unmeasured). */
 const programCosts=():ResourceBudgetCost[]=>environmentProgramAllowanceCosts([{vertex,fragment,attributes:['a_position','a_normal','a_instance']}],{count:1,attributes:3},'vehicle');
 // Fixed staging/scratch, the shell mesh and the constant program allowance
 // are admitted on the ONE page ledger, as one decision, before they exist; a
 // Pending refusal leaves nothing for the caller to undo, and a construction
 // that fails after admission returns the claims it took. The program claim is
 // returned when the program is deleted (removal, failure, context loss,
 // destroy) and admitted again before a later compile.
 const resources=environmentResourceStore(mobile,resourceStore),[fixedCPU,constructionProgram]=reserveEnvironmentClaims(resources.budget,[['vehicle fixed CPU storage',vehicleFixedCosts(cap,displayCap)],['vehicle shader program',programCosts()]]);
 try{
 const gpuLedger=createEnvironmentGpuLedger('decorative-vehicles');
 let roadClaim:ResourceBudgetReservation|undefined,programClaim:ResourceBudgetReservation|undefined=constructionProgram,programEpoch:number|undefined,programDeferred=false,gpuDeferred=false,gpuWait:AbortController|undefined,gpuPending:{label:string;requiredBytes:number}|undefined;
 function setGpuDeferred(value:boolean,pending?:{label:string;requiredBytes:number}){gpuPending=value?pending:undefined;if(gpuDeferred===value)return;gpuDeferred=value;try{onGpuStateChange?.(value);}catch{}}
 const checkViewport=(viewport:[number,number,number,number]|undefined)=>{if(viewport&&(viewport.length!==4||!viewport.every(Number.isFinite)||viewport[0]>viewport[2]||viewport[1]>viewport[3]||viewport[0]<-180||viewport[2]>180||viewport[1]<-85||viewport[3]>85))throw Error('Invalid vehicle viewport');};
 const mesh=compactCarMesh(),instances=new Float32Array(displayCap*3),scratch=createVehiclePositionScratch(cap),modelMatrix=new Float64Array(16),combinedMatrix=new Float32Array(16);
 const motion=createEnvironmentMotion();motion.setReducedMotion(reducedMotion);motion.setOffscreen(true);
 let workPlan=planVehicleFrameWork(mobile),fps=workPlan.fps,enabled=false,destroyed=false,visible=true,reduce=reducedMotion,timer:ReturnType<typeof setTimeout>|undefined,roads:RoadPath[]=[],sourceRoads:readonly SceneryRoad[]=[],slots:VehicleSlot[]=[],count=0,drawCount=0,representedFragments=0,representedSources=0,fullPathLength=0,visiblePathLength=0,boundingPathLength=0,anchor:[number,number]=[0,0],unit=1,lastUpdate=-Infinity,zoom=18,visibleBox:VehicleBounds|undefined;
 let secondaryPending=true,secondaryOffset=0,secondaryCalibrations=0,cohortFairnessSwaps=0;let densityPending=true,densityScans=0,frustumLength=0;let projectionBound=false;const previousMatrix=new Float32Array(16);let gl:WebGL2RenderingContext|undefined,program:WebGLProgram|undefined,vao:WebGLVertexArrayObject|undefined,shapeBuffer:WebGLBuffer|undefined,instanceBuffer:WebGLBuffer|undefined,indexBuffer:WebGLBuffer|undefined,matrixUniform:WebGLUniformLocation|null=null,draws=0,updates=0;
 let sparseSpan:SparseRoadSpan|undefined,sparseScanNeeded=true,sparseFallbackActive=false;
 let unsubscribeClock:(()=>void)|undefined;
 function stop(){if(timer!==undefined)clearTimeout(timer);timer=undefined;unsubscribeClock?.();unsubscribeClock=undefined;}
 function schedule(){if(frameClock){if(!unsubscribeClock)unsubscribeClock=frameClock.subscribe({fps,active:()=>!destroyed&&!renderFailure&&!gpuDeferred&&enabled&&visible&&!reduce&&(count>0||!!sparseSpan)&&!!gl&&!gl.isContextLost(),frame:()=>true});frameClock.wake();return;}if(timer!==undefined||destroyed||renderFailure||gpuDeferred||!enabled||!visible||reduce||(!count&&!sparseSpan)||!gl||gl.isContextLost())return;timer=setTimeout(()=>{timer=undefined;if(destroyed||!enabled||!visible||reduce)return;map.triggerRepaint();schedule();},1000/fps);}
 function allocate(){sparseSpan=undefined;sparseScanNeeded=true;sparseFallbackActive=false;secondaryPending=true;secondaryOffset=0;cohortFairnessSwaps=0;fullPathLength=roads.reduce((n,p)=>n+p.length,0);visiblePathLength=roads.reduce((n,p)=>n+(p.visibleLength??p.length),0);if(scratch.roadMarks.length!==roads.length){scratch.roadMarks=new Uint32Array(roads.length);scratch.firstVisibleSlotByRoad=new Uint16Array(roads.length);}slots=allocateVehicleSlots(roads,mobile?VEHICLE_POLICY.mobileReservoir:VEHICLE_POLICY.desktopReservoir,cap);count=Math.min(cap,slots.length);drawCount=0;representedFragments=new Set(slots.map(s=>s.roadIndex)).size;representedSources=new Set(slots.map(s=>roads[s.roadIndex].key)).size;lastUpdate=-Infinity;projectionBound=false;}
 function update(viewChanged:boolean){const now=clock();if(now-lastUpdate<1000/fps||(!count&&!sparseSpan&&!viewChanged))return false;lastUpdate=now;if(viewChanged)sparseScanNeeded=true;const elapsed=motion.frame(now,fps).seconds;drawCount=writeVehicleInstances(roads,slots,elapsed,instances,scratch,visibleBox,combinedMatrix,3,cap,secondaryOffset,secondaryPending);if(secondaryPending){const target=Math.min(scratch.primaryVisible,Math.ceil(cap/3))*.6;let best=secondaryOffset,error=Infinity;for(let offset=0;offset<5;offset++){let kept=0;for(let g=0;g<5;g++)if((g-offset+5)%5<3)kept+=scratch.secondaryCounts[g];const e=Math.abs(Math.min(displayCap,kept)-target);if(e<error){error=e;best=offset;}}if(best!==secondaryOffset){secondaryOffset=best;drawCount=writeVehicleInstances(roads,slots,elapsed,instances,scratch,visibleBox,combinedMatrix,3,cap,secondaryOffset,true);}cohortFairnessSwaps=balanceVisibleVehicleCohort(slots,scratch,drawCount);if(cohortFairnessSwaps)drawCount=writeVehicleInstances(roads,slots,elapsed,instances,scratch,visibleBox,combinedMatrix,3,cap,secondaryOffset);secondaryPending=false;secondaryCalibrations++;}
 // Preserve the normal cohort and its limits on every nonempty frame.
 // A stable camera reuses the longest connected visible part of a legal road.
 const wasSparse=!!sparseSpan;
 sparseFallbackActive=false;
 if(!drawCount){
  if(sparseScanNeeded){sparseSpan=findSparseRoadSpan(roads,combinedMatrix,visibleBox);sparseScanNeeded=false;}
  if(sparseSpan){
   const {roadIndex,from,to,seed,speed}=sparseSpan;
   const inset=Math.min(.001,(to-from)/4),length=to-from-2*inset;
   const distance=from+inset+(elapsed*speed+length*seed/4294967296)%length;
   const path=roads[roadIndex],position=roadPosition(path,distance);
   if(position&&vehicleCenterInProjection(position.x,position.z,combinedMatrix)){
    instances[0]=position.x;instances[1]=position.z;instances[2]=position.angle;
    drawCount=scratch.activeRoadFragments=1;sparseFallbackActive=true;
   }
  }
 }
 if(wasSparse!==!!sparseSpan&&!count)schedule();
 updates++;return true;}
 let renderFailure:string|undefined;
 // Admitted road paths/slots replace their predecessor's claim only after the
 // new commit exists; a failed or invalid commit releases its own admission.
 function admitRoads(source:readonly SceneryRoad[]){const bound=vehicleViewportBound(source,reservoir),tokens={construction:{},retained:{}};return{tokens,claim:reserveEnvironmentCosts(resources.budget,[{category:'construction',bytes:bound.constructionBytes,precision:'estimate',identity:tokens.construction,label:'vehicle viewport road construction'},{category:'construction',bytes:bound.retainedBytes,precision:'estimate',identity:tokens.retained,label:'vehicle viewport road paths and density slots'}],'vehicle viewport roads')};}
 function commitRoads(admission:ReturnType<typeof admitRoads>){admission.claim.adjust([{category:'construction',bytes:vehicleViewportRetainedBytes(roads,reservoir),precision:'estimate',identity:admission.tokens.retained,label:'vehicle viewport road paths and density slots'}]);const previous=roadClaim;roadClaim=admission.claim;if(previous!==roadClaim)previous?.release();}
 function awaitGpuBudget(){if(gpuWait||destroyed)return;const wait=gpuWait=new AbortController();void waitForEnvironmentBudget(resources.budget,wait.signal).then(()=>{if(gpuWait!==wait||destroyed)return;gpuWait=undefined;map.triggerRepaint();},()=>{});}
 /** Buffer storage is admitted before any VAO/buffer exists. Under page
  * pressure the program stays, nothing draws or animates, and one ledger
  * wake-up repaints through MapLibre; no timer or retry loop. */
 function allocateVehicleGPU():boolean{
  if(!gl||!program)return false;if(vao)return true;const g=gl,p=program;
  try{gpuLedger.replace(resources,g,'vehicle',[gpuBufferCost(mesh.vertexData.byteLength,{},'vehicle shell vertex buffer'),gpuBufferCost(mesh.indices.byteLength,{},'vehicle shell index buffer'),gpuBufferCost(instances.byteLength,{},'vehicle instance buffer')]);}
  catch(error){const refusal=environmentAdmissionError(error,'vehicle GPU buffers');if(!(refusal instanceof EnvironmentResourcePendingError))throw refusal??error;setGpuDeferred(true,{label:refusal.label,requiredBytes:refusal.requiredBytes});awaitGpuBudget();return false;}
  setGpuDeferred(false);
  const oldVao=g.getParameter(g.VERTEX_ARRAY_BINDING),oldArray=g.getParameter(g.ARRAY_BUFFER_BINDING);try{vao=g.createVertexArray()??undefined;shapeBuffer=g.createBuffer()??undefined;indexBuffer=g.createBuffer()??undefined;instanceBuffer=g.createBuffer()??undefined;if(!vao||!shapeBuffer||!indexBuffer||!instanceBuffer)throw Error('Vehicle buffer allocation failed');g.bindVertexArray(vao);g.bindBuffer(g.ARRAY_BUFFER,shapeBuffer);g.bufferData(g.ARRAY_BUFFER,mesh.vertexData,g.STATIC_DRAW);for(const[name,offset]of [['a_position',0],['a_normal',12]] as const){const at=g.getAttribLocation(p,name);g.enableVertexAttribArray(at);g.vertexAttribPointer(at,3,g.FLOAT,false,24,offset);}g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,indexBuffer);g.bufferData(g.ELEMENT_ARRAY_BUFFER,mesh.indices,g.STATIC_DRAW);g.bindBuffer(g.ARRAY_BUFFER,instanceBuffer);g.bufferData(g.ARRAY_BUFFER,instances.byteLength,g.DYNAMIC_DRAW);const at=g.getAttribLocation(p,'a_instance');g.enableVertexAttribArray(at);g.vertexAttribPointer(at,3,g.FLOAT,false,12,0);g.vertexAttribDivisor(at,1);}catch(error){release();throw error;}finally{g.bindVertexArray(oldVao);g.bindBuffer(g.ARRAY_BUFFER,oldArray);}
  return true;
 }
 /** The constant program allowance before any shader exists: kept from
  * construction, or admitted again after a release. A Pending refusal holds
  * nothing and defers the compile to the first frame after one ledger wake-up
  * (reported as gpu-budget-deferred); an allowance above the whole ledger
  * throws unfit. */
 function admitVehicleProgram():boolean{
  if(programClaim?.active){programDeferred=false;return true;}
  try{programClaim=reserveEnvironmentCosts(resources.budget,programCosts(),'vehicle shader program');programDeferred=false;return true;}
  catch(error){const refusal=environmentAdmissionError(error,'vehicle shader program');if(!(refusal instanceof EnvironmentResourcePendingError))throw refusal??error;programDeferred=true;setGpuDeferred(true,{label:refusal.label,requiredBytes:refusal.requiredBytes});awaitGpuBudget();return false;}
 }
 function compileVehicleProgram(){
  const g=gl!,shaders:WebGLShader[]=[];
  try{for(const [i,text]of [vertex,fragment].entries()){const shader=g.createShader(i?g.FRAGMENT_SHADER:g.VERTEX_SHADER);if(!shader)throw Error('Vehicle shader allocation failed');shaders.push(shader);g.shaderSource(shader,text);g.compileShader(shader);if(!g.getShaderParameter(shader,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(shader)??'Vehicle shader failed');}program=g.createProgram()??undefined;if(!program)throw Error('Vehicle program allocation failed');for(const shader of shaders)g.attachShader(program,shader);g.linkProgram(program);if(!g.getProgramParameter(program,g.LINK_STATUS))throw Error('Vehicle program failed');for(const shader of shaders)g.detachShader(program,shader);programEpoch=resources.contextEpoch(g);}catch(error){gpuInitFailed=true;release();throw error;}finally{for(const shader of shaders)g.deleteShader(shader);}matrixUniform=g.getUniformLocation(program!,'u_matrix');
 }
 /** A compile deferred by a refused allowance, once per ledger wake-up. */
 function compileDeferredVehicleProgram(){
  try{if(!admitVehicleProgram())return false;compileVehicleProgram();if(!allocateVehicleGPU())return false;schedule();return true;}
  catch(error){gpuInitFailed=true;renderFailure=String(error).slice(0,512);reportCustomLayerRenderError(map,id,error,onRenderError,()=>!destroyed&&enabled&&visible&&!reduce&&!!renderFailure);motion.setOffscreen(true);stop();return false;}
 }
 function allocateDeferredVehicleGPU(){
  try{if(!allocateVehicleGPU())return false;schedule();return true;}
  catch(error){renderFailure=String(error).slice(0,512);reportCustomLayerRenderError(map,id,error,onRenderError,()=>!destroyed&&enabled&&visible&&!reduce&&!!renderFailure);motion.setOffscreen(true);stop();return false;}
 }
 // Same exit for remove, failure, context loss and destroy: live storage
 // retires behind the page fence, lost storage is released immediately.
 /** The program allowance follows the buffers' exit: a linked program on a
  * live context of the same epoch retires behind the page fence (commands in
  * flight may still use it); a claim with no program (never added, compile
  * deferred or failed before linking), a lost context or a newer epoch is
  * released at once. */
 function retireProgramClaim(claim:ResourceBudgetReservation|undefined,epoch:number|undefined){
  if(!claim?.active)return;
  const context=gl;let live=false;
  if(context&&program&&epoch!==undefined){try{live=!context.isContextLost()&&!resources.destroyed&&resources.contextEpoch(context)===epoch;}catch{live=false;}}
  if(!live||!context||epoch===undefined){claim.release();return;}
  try{resources.retireGpu({context,epoch,reservation:claim,dispose(){},label:'decorative-vehicles vehicle shader program'});}catch{claim.release();}
 }
 function release(){gpuLedger.release();setGpuDeferred(false);gpuWait?.abort();gpuWait=undefined;const claim=programClaim,epoch=programEpoch;programClaim=undefined;programEpoch=undefined;programDeferred=false;retireProgramClaim(claim,epoch);if(!gl)return;if(vao)gl.deleteVertexArray(vao);for(const b of [shapeBuffer,instanceBuffer,indexBuffer])if(b)gl.deleteBuffer(b);if(program)gl.deleteProgram(program);vao=shapeBuffer=instanceBuffer=indexBuffer=program=undefined as never;matrixUniform=null;}
 // Diagnostic-only state; only inactiveReason reads it.
 let sourceRoadsLoaded=false,gpuInitFailed=false;
 /** Diagnostic only, read by stats: the first condition, in data-to-display
  * order, that leaves no decorative vehicle active; null while cars are drawn.
  * Data: 'awaiting-source-roads' (setRoads not called yet), 'no-source-roads'
  * (the loaded source has no road), 'no-source-roads-in-view' (every loaded
  * road lies outside the viewport box), 'no-candidate-slots-in-view' (roads
  * cross the box, but the first-frame six-plane density scan found none of
  * their length inside the camera frustum, e.g. the box corners of a tilted
  * view). Both in-view results are correct zero-car results, not capacity limits.
  * Display: 'disabled', 'hidden', 'reduced-motion'. GPU: 'awaiting-gpu' (no
  * context attached yet, or buffers being created), 'context-lost',
  * 'gpu-init-failed' (shader, program or buffer creation threw in onAdd),
  * 'gpu-budget-deferred' (page ledger pressure). Frame: 'awaiting-first-frame',
  * 'no-visible-candidates' (the last CPU cull kept no candidate in view). */
 function inactiveReason(){
  if(destroyed)return 'destroyed';if(renderFailure)return 'render-failure';
  if(!sourceRoadsLoaded)return 'awaiting-source-roads';if(!sourceRoads.length)return 'no-source-roads';if(!roads.length)return 'no-source-roads-in-view';if(!count&&!densityPending&&!sparseSpan)return 'no-candidate-slots-in-view';
  if(!enabled)return 'disabled';if(!visible)return 'hidden';if(reduce)return 'reduced-motion';
  if(!gl)return 'awaiting-gpu';if(gl.isContextLost?.())return 'context-lost';if(gpuInitFailed)return 'gpu-init-failed';if(gpuDeferred)return 'gpu-budget-deferred';if(!program||!vao)return 'awaiting-gpu';
  if(!Number.isFinite(lastUpdate))return 'awaiting-first-frame';if(!drawCount)return 'no-visible-candidates';
  return null;
 }
 const layer={id,type:'custom' as const,renderingMode:'3d' as const,onAdd(_map:unknown,context:WebGLRenderingContext|WebGL2RenderingContext){if(destroyed)throw Error('Vehicle renderer destroyed');if(!('createVertexArray'in context))throw Error('Vehicle scenery requires WebGL2');gl=context as WebGL2RenderingContext;renderFailure=undefined;gpuInitFailed=false;
 // The program compiles on its admitted allowance; refused, nothing compiles
 // and nothing draws or animates until one ledger wake-up.
 try{if(!admitVehicleProgram()){motion.setOffscreen(false);schedule();return;}}catch(error){gpuInitFailed=true;throw error;}
 compileVehicleProgram();try{allocateVehicleGPU();}catch(error){gpuInitFailed=true;throw error;}motion.setOffscreen(false);schedule();},render(_context:unknown,args:{defaultProjectionData?:{mainMatrix:ArrayLike<number>}}|ArrayLike<number>){if(destroyed||renderFailure||!enabled||!visible||reduce||!roads.length||!gl)return;// A deferred program and deferred GPU storage retry once per ledger wake-up, never per frame.
 if(!program&&(!programDeferred||gpuWait||!compileDeferredVehicleProgram()))return;if(!vao&&(!gpuDeferred||gpuWait||!allocateDeferredVehicleGPU()))return;if(!vao||!program)return;const main='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;if(!main||main.length!==16)return;for(let i=0;i<16;i++)if(!Number.isFinite(main[i]))return;const scale=1/unit;modelMatrix.fill(0);modelMatrix[0]=scale;modelMatrix[6]=scale;modelMatrix[9]=-scale;modelMatrix[12]=anchor[0];modelMatrix[13]=anchor[1];modelMatrix[15]=1;matrix(main,modelMatrix,combinedMatrix);if(densityPending){frustumLength=0;for(const p of roads){if(p.visibleLength)p.visibleLength=frustumRoadLength(p,combinedMatrix);frustumLength+=p.visibleLength??0;}allocate();densityPending=false;densityScans++;}let viewChanged=!projectionBound;for(let i=0;i<16;i++)if(combinedMatrix[i]!==previousMatrix[i]){viewChanged=true;break;}if(gl.isContextLost()){motion.setOffscreen(true);stop();projectionBound=false;lastUpdate=-Infinity;drawCount=0;return;}// MapLibre dirties/restores tracked state after this public custom-layer callback.
 try{if(update(viewChanged)){previousMatrix.set(combinedMatrix);projectionBound=true;if(drawCount){gl.bindBuffer(gl.ARRAY_BUFFER,instanceBuffer!);gl.bufferSubData(gl.ARRAY_BUFFER,0,instances,0,drawCount*3);}}if(!drawCount)return;gl.useProgram(program);gl.bindVertexArray(vao);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.uniformMatrix4fv(matrixUniform,false,combinedMatrix);gl.drawElementsInstanced(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0,drawCount);draws++;}catch(error){renderFailure=String(error).slice(0,512);const failedProgram=program;reportCustomLayerRenderError(map,id,error,onRenderError,()=>!destroyed&&enabled&&visible&&!reduce&&program===failedProgram&&!!renderFailure);motion.setOffscreen(true);stop();projectionBound=false;drawCount=0;}finally{gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,null);}},onRemove(){motion.setOffscreen(true);stop();projectionBound=false;release();gl=undefined;lastUpdate=-Infinity;drawCount=0;}};
 layer.render=withQaCustomLayerRenderTiming(1,layer.render);
 // An invalid viewport is refused before any state changes, like a refused
 // admission: the previous roads, slots and claim stay together.
 function buildViewport(viewport:[number,number,number,number]|undefined,admission:ReturnType<typeof admitRoads>){checkViewport(viewport);stop();roads=[];boundingPathLength=0;let box:[number,number,number,number]|undefined;if(viewport){const lo=merc([viewport[0],viewport[1]]),hi=merc([viewport[2],viewport[3]]);box=[(lo[0]-anchor[0])*unit,-(lo[1]-anchor[1])*unit,(hi[0]-anchor[0])*unit,-(hi[1]-anchor[1])*unit];}for(const road of sourceRoads){if(viewport){let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;for(const p of road.coordinates){west=Math.min(west,p[0]);east=Math.max(east,p[0]);south=Math.min(south,p[1]);north=Math.max(north,p[1]);}if(east<viewport[0]||west>viewport[2]||north<viewport[1]||south>viewport[3])continue;}const coords=road.direction===-1?[...road.coordinates].reverse():road.coordinates,points=coords.map(p=>{const q=merc(p);return[(q[0]-anchor[0])*unit,-(q[1]-anchor[1])*unit] as [number,number];}),lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));const path={key:road.id,points,lengths,length:lengths.at(-1)!,visibleLength:0};if(path.length<=0)continue;
 const fragments=box?clipRoadPath(path,box,0):[path];
 for(const fragment of fragments){
  boundingPathLength+=fragment.length;
  if(path.length>5&&fragment.length>5)path.visibleLength+=fragment.length;
 }
 if(fragments.length)roads.push(path);}visibleBox=box;densityPending=true;frustumLength=0;allocate();commitRoads(admission);schedule();map.triggerRepaint();}
 function setValidatedRoads(input:readonly SceneryRoad[],viewport?:[number,number,number,number]){checkViewport(viewport);const admission=admitRoads(input);try{stop();sourceRoads=input;sourceRoadsLoaded=true;roads=[];slots=[];count=drawCount=representedFragments=representedSources=0;lastUpdate=-Infinity;projectionBound=false;densityPending=true;sparseSpan=undefined;sparseScanNeeded=true;sparseFallbackActive=false;frustumLength=fullPathLength=visiblePathLength=boundingPathLength=0;const first=input[0]?.coordinates[0];if(!first){commitRoads(admission);return;}anchor=merc(first);unit=C*Math.cos(first[1]*Math.PI/180);buildViewport(viewport,admission);}catch(error){if(admission.claim!==roadClaim)admission.claim.release();throw error;}}
 return {layer,setValidatedRoads,setRoads(value:VehicleScenery,viewport?:[number,number,number,number]){setValidatedRoads(parseVehicleScenery(value,city).roads,viewport);},setViewport(viewport?:[number,number,number,number]){checkViewport(viewport);const admission=admitRoads(sourceRoads);try{buildViewport(viewport,admission);}catch(error){if(admission.claim!==roadClaim)admission.claim.release();throw error;}},setEnabled(value:boolean){if(enabled!==value){enabled=value;motion.setEnabled(value);lastUpdate=-Infinity;}value?schedule():stop();map.triggerRepaint();},setVisible(value:boolean){if(visible!==value){visible=value;motion.setVisible(value);lastUpdate=-Infinity;}value?schedule():stop();},setReducedMotion(value:boolean){if(reduce!==value){reduce=value;motion.setReducedMotion(value);lastUpdate=-Infinity;}value?stop():schedule();map.triggerRepaint();},setZoom(value:number){if(!Number.isFinite(value))throw Error('Invalid vehicle zoom');zoom=value;},setFrameLoad(value:VehicleFrameLoad){const next=planVehicleFrameWork(mobile,value),changed=fps!==next.fps;workPlan=next;fps=next.fps;if(changed){stop();lastUpdate=-Infinity;schedule();map.triggerRepaint();}},get positionSamples(){if(!enabled||!visible||reduce||!Number.isFinite(lastUpdate)||!draws)return [];const sampleCount=Math.min(64,drawCount),out=[];for(let sample=0;sample<sampleCount;sample++){const i=Math.floor(sample*drawCount/sampleCount),slot=sparseFallbackActive&&sparseSpan?{roadIndex:sparseSpan.roadIndex,ordinal:-1,seed:sparseSpan.seed}:slots[scratch.slotIndices[i]],road=roads[slot.roadIndex],x=anchor[0]+instances[i*3]/unit,y=anchor[1]-instances[i*3+1]/unit;out.push({sourceRoadId:road.key,sourceCandidateOrdinal:slot.ordinal,phaseSeed:slot.seed,instance:i,lngLat:[x*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI],headingRadians:instances[i*3+2],role:'decorative-schematic',lastUpdateMs:lastUpdate});}return out;},getProofSettlementKey(){return [renderFailure,gpuDeferred,densityPending,secondaryPending,projectionBound] as const;},get stats(){return {renderFailure,allocatedVehicles:Math.max(Number(sparseFallbackActive),Math.min(displayCap,Math.ceil(Math.ceil(count/3)*.6))),baselineAllocatedVehicles:count,activeVehicles:enabled&&visible&&!reduce?drawCount:0,distinctPositionVehicles:drawCount,cap:displayCap,baselineCap:cap,thinningFactor:5,primaryCohort:'preserved slotIndex%3==2',secondaryCohort:'fixed consecutive3of5 floor(slotIndex/3)%5 groups; once-view calibration',secondaryOffset,secondaryPending,secondaryCalibrations,cohortFairnessSwaps,cohortFairness:'once-view candidate identity swap from multi-car roads to eligible zero-car roads; fixed afterwards, same count budget',previousPrimaryVisibleVehicles:Math.min(scratch.primaryVisible,Math.ceil(cap/3)),secondaryCounts:Array.from(scratch.secondaryCounts),thinningCohort:'fixed reservoir slotIndex %3 ==2 per source/view commit; not visible rank',baselineVisibleVehicles:scratch.baselineVisible,fleetMinimum:1,fleetMinimumScope:'enabled with a legal visible span and ready GPU resources',sparseFallbackActive,sourceCapacityLimited:Number.isFinite(lastUpdate)?false:count===0,sourceCapacityLimitedMeaning:'legacy name, not a fleet or source capacity limit: true only while candidateSlots is 0 and no vehicle update (CPU cull and instance write) has run since the update clock was last reset (creation, source/view commit, enabled/visible/reduced-motion/frame-rate change, context loss, layer removal); it reads false once an update has run, including after the first-frame frustum density scan leaves zero slots; use inactiveReason, candidateSlots and viewportRoads',viewportRoads:roads.length,inactiveReason:inactiveReason(),motionPathScope:'complete loaded legal source paths; a single-car fallback uses a visible legal span',reservoirCap:mobile?VEHICLE_POLICY.mobileReservoir:VEHICLE_POLICY.desktopReservoir,fullSourcePathLengthM:fullPathLength,visibleSourcePathLengthM:boundingPathLength,densityWeightedPathLengthM:visiblePathLength,visibleFleetLimited:Number.isFinite(lastUpdate)&&false,processedReservoirCandidates:scratch.processed,projectionCulledCandidates:scratch.projectionCulled,projectionBound:projectionBound&&scratch.projectionBound,projectionSource:'public custom-layer matrix at last CPU cull; shader renders retained world positions with current camera matrix',projectionPredicate:'Float32 instance centre [x,.232,z] transformed to clip xyz within +/-(1-1e-5)*w and w>0',projectionScope:'centre admission; mesh edges may extend outside viewport, depth/occlusion/pixel visibility not certified',densityPending,densityScans,frustumRoadLengthM:frustumLength,densityWeightScope:'six-plane source-segment length at first valid matrix after source/view commit; not per-render scanning',projectionDiagnostic:projectionBound?{matrix:Array.from(previousMatrix),lastCullTimeMs:lastUpdate,cullAgeMs:Math.max(0,clock()-lastUpdate),currentCameraMatchesLastCull:combinedMatrix.every((v,i)=>v===previousMatrix[i]),anchorMercator:[anchor[0],anchor[1]],metresPerWorldUnit:unit,centreUpM:.232,lastUpdateMs:lastUpdate}:null,offviewCandidatesCulled:scratch.culled,coincidentCandidatesRejected:scratch.duplicateRejected,candidateSlots:slots.length,coincidentSuppressed:Number.isFinite(lastUpdate)?scratch.duplicateRejected:0,maxAnimationFPS:fps,cameraCPUCullThrottled:true,roads:roads.length,noPick:true,role:'decorative-schematic',drawBatchesPerFrame:drawCount?1:0,allocatedInstanceBytes:instances.byteLength,sourceDims:{length:4.2,height:1.06,width:1.7},displayDims:{length:1.68,height:.424,width:.68},meshTrianglesPerVehicle:22,meshVertices:44,sharedStaticMeshBytes:mesh.vertexData.byteLength+mesh.indices.byteLength,meshMaterials:1,vehicleStyle:'self-authored white lowpixel body/cabin shell',vehicleModel:'lowpixel-white',requestedLegacyModel:vehicleModel,vehicleLicense:'self-authored',modelScale:.4,linearDimensionsMultiplier:.4,neutralBody:true,bodyColour:'white; neutral geometric light only',nearVehicles:0,farVehicles:drawCount,farTrianglesPerVehicle:22,submittedTriangles:drawCount*22,plannedTriangleMaximum:Math.max(count,Number(sparseFallbackActive))*22,plannedRepresentedSourceRoads:representedSources,loadedSourceRoads:sourceRoads.length,plannedRepresentedRoadFragments:representedFragments,submittedVertices:drawCount*44,submittedIndexReferences:drawCount*66,vertexWorkClassification:'44 unique referenced shape vertices times instances; shader invocations driver-dependent, <=66 index references per instance',plannedReferencedVertexMaximum:Math.max(count,Number(sparseFallbackActive))*44,uniqueVehicleBufferVertices:44,instanceTransforms:drawCount,actualRepresentedRoadFragments:scratch.activeRoadFragments,coveragePartial:Number.isFinite(lastUpdate)?scratch.activeRoadFragments<roads.length:representedFragments<roads.length||count<roads.length,baselineCandidateSpacingMetres:VEHICLE_POLICY.spacingMetres,baselineMinimumCandidateSpacingMetres:VEHICLE_POLICY.minSpacingMetres,spacingMeaning:'unchanged baseline candidate spacing; submitted cars thinned every third visible unique candidate',speedRangeMetresPerSecond:[3.5625,6.09375],speedMeaning:'decorative display speed; not traffic measurement or legal speed',frameWorkPlan:workPlan,frameWorkPlanScope:'baseline reservoir/pressure bounds; actual displayed work is thinned drawCount',baselineReservoirPreserved:true,cpuScratchStillBaselineCap:true,displayCap,knownCombinedSubmittedTriangles:workPlan.binding==='load-provided'?workPlan.otherSubmittedTriangles+drawCount*22:null,positionSampleLimit:64,diagnosticStatsRoadScan:false,logicalGPUBufferBytes:mesh.vertexData.byteLength+mesh.indices.byteLength+instances.byteLength,cpuPositionScratchBytes:instances.byteLength+scratch.x.byteLength+scratch.z.byteLength+scratch.stamp.byteLength+scratch.slotIndices.byteLength+scratch.roadMarks.byteLength+scratch.firstVisibleSlotByRoad.byteLength+scratch.secondaryCounts.byteLength+modelMatrix.byteLength+combinedMatrix.byteLength+previousMatrix.byteLength,viewportZoom:zoom,draws,updates,resources:{ledger:'page-resource-budget',fixedCPUBytes:fixedCPU.bytes,programAllowanceBytes:programClaim?.active?programClaim.bytes:0,roadBytes:roadClaim?.bytes??0,gpu:gpuLedger.stats,gpuBytes:gpuLedger.bytes,gpuDeferred,gpuPending:gpuPending&&{...gpuPending},physicalMemory:'unmeasured'}};},destroy(){if(destroyed)return;destroyed=true;enabled=false;motion.destroy();stop();projectionBound=false;roads=[];sourceRoads=[];slots=[];count=drawCount=representedFragments=representedSources=0;release();roadClaim?.release();roadClaim=undefined;fixedCPU.release();}};
 }catch(error){fixedCPU.release();constructionProgram.release();throw error;}
}
