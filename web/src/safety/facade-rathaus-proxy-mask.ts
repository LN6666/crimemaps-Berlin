import {getPageChunkResourceStore} from './render-runtime/chunk-resource-store';
import type {ChunkReadyBorrowRole,ChunkResourceBorrow,ChunkResourceLease,ChunkResourceRole} from './render-runtime/chunk-resource-types';
import type {ResourceBudgetCost,ResourceBudgetReservation} from './render-runtime/resource-budget';
import type {BuildingComponent} from './building-mesh-types';
import {rathausCoincidentWallFragmentMasks,rathausProxyFragmentCovered,type RathausWallFragmentMask} from './facade-rathaus-display-masks';
/** Fragment/pick suppression only for proven coincident original proxy walls.
 * The original source positions, indices and identities are never modified.
 */
export type RathausProxyMaskRecipe={
 readonly words:Float32Array;readonly masks:RathausWallFragmentMask[];readonly origin:[number,number]|undefined;readonly costs:readonly ResourceBudgetCost[];
 /** Slot order follows the packed outline's ring/edge order, not plan.masks. */
 readonly wordMasks:readonly RathausWallFragmentMask[];
 retain():{release():void};release():void;createBinding(visibleIdentities?:readonly {objectId:string;partId:string}[]):RathausProxyMasks;
};
export interface RathausProxyMaskRetention{
 prepare(gl:WebGL2RenderingContext,programs:readonly WebGLProgram[]):{ready:boolean;reason?:string};
 isResident(gl:WebGL2RenderingContext,p:WebGLProgram):boolean;
 withResidentMasks(gl:WebGL2RenderingContext,p:WebGLProgram,draw:()=>void):boolean;
 readonly residentRevision:string;readonly origin:[number,number]|undefined;release():void;
}
export type RathausProxyMaskReadyRetention=Omit<RathausProxyMaskRetention,'prepare'>;
export interface RathausProxyMasks{
 configure(components:BuildingComponent[],paint:Float32Array<ArrayBuffer>,cohortComponents?:readonly BuildingComponent[]):void;
 prepare(gl:WebGL2RenderingContext,programs:readonly WebGLProgram[]):{ready:boolean;reason?:string};
 isResident(gl:WebGL2RenderingContext,p:WebGLProgram):boolean;
 withMasks(gl:WebGL2RenderingContext,p:WebGLProgram,draw:()=>void):void;
 withResidentMasks(gl:WebGL2RenderingContext,p:WebGLProgram,draw:()=>void):boolean;
 covered(component:BuildingComponent,x:number,y:number,z:number):boolean;
 retain(role?:ChunkResourceRole):RathausProxyMaskRetention;cpuRecipe():RathausProxyMaskRecipe;
 /** Bind-only pin for a synchronous pass. An absent/unready GPU binding stays
  * unavailable for that pin; this path never prepares or awaits a resource. */
 retainReady(role?:ChunkReadyBorrowRole):RathausProxyMaskReadyRetention;
 detach():void;destroy():void;
 readonly residentBuffer:WebGLBuffer|undefined;readonly residentRevision:string;readonly origin:[number,number]|undefined;readonly costs:readonly ResourceBudgetCost[];
 readonly stats:{maskCount:number;allocatedCPUBytes:number;allocatedGPUBytes:number;sourceParentClaim:boolean;sourceArraysUnchanged:boolean};
}
// All chunk masks on a map use the same linked programs. Only the block's
// layout and the context's binding limit are immutable; buffer bindings are not.
type MaskBlock={index:number;binding:number};
const maskBlocks=new WeakMap<WebGL2RenderingContext,WeakMap<WebGLProgram,MaskBlock>>();
function maskBlock(gl:WebGL2RenderingContext,program:WebGLProgram):MaskBlock{
 let programs=maskBlocks.get(gl);
 if(!programs){programs=new WeakMap();maskBlocks.set(gl,programs);}
 const known=programs.get(program);
 if(known)return known;
 const index=gl.getUniformBlockIndex(program,'NrProxyMaskBlock');
 const binding=index===gl.INVALID_INDEX?-1:gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS)-1;
 const block={index,binding};
 if(!gl.isContextLost())programs.set(program,block);
 return block;
}
export function createRathausProxyMasks(recipe?:RathausProxyMaskRecipe,visibleIdentities?:readonly {objectId:string;partId:string}[]):RathausProxyMasks{
 const store=getPageChunkResourceStore();
 type MaskVersion={data:Float32Array;masks:RathausWallFragmentMask[];wordMasks:readonly RathausWallFragmentMask[];origin:[number,number]|undefined;version:number;users:number;cpu:Pick<ResourceBudgetReservation,'release'>;gpu?:ChunkResourceLease<WebGLBuffer>;gl?:WebGL2RenderingContext};
 let sequence=0,destroyed=false;
 function createVersion():MaskVersion{const cpu=store.budget.reserve({category:'mask',bytes:128*4*4,precision:'exact',label:'Rathaus mask CPU'});try{const data=new Float32Array(128*4);if(!cpu.adjust({category:'mask',bytes:data.byteLength,precision:'exact',identity:data.buffer}))throw Error('Rathaus CPU mask reservation retired');return{data,masks:[],wordMasks:[],origin:undefined,version:++sequence,users:1,cpu};}catch(error){cpu.release();throw error;}}
 function fromRecipe(source:RathausProxyMaskRecipe,selectedIdentities?:readonly {objectId:string;partId:string}[]):MaskVersion{
  const parent=source.retain();let next:MaskVersion|undefined;
  try{
   const visible=selectedIdentities&&new Set(selectedIdentities.map(row=>JSON.stringify([row.objectId,row.partId])));
   const active=(mask:RathausWallFragmentMask)=>!visible||visible.has(JSON.stringify([mask.preferred.objectId,mask.preferred.partId]));
   if(source.masks.every(active))return{data:source.words,masks:source.masks,wordMasks:source.wordMasks,origin:source.origin,version:++sequence,users:1,cpu:parent};
   next=createVersion();next.data.set(source.words);next.masks=source.masks.filter(active);next.wordMasks=source.wordMasks;next.origin=source.origin;
   // Reversed finite bounds can never cover a fragment. Keep each original
   // first/count slot intact so immutable paint and geometry remain reusable.
   source.wordMasks.forEach((mask,index)=>{if(!active(mask))next!.data.set([1,0,1,0],index*4);});
   const cpu=next.cpu;next.cpu={release(){try{cpu.release();}finally{parent.release();}}};return next;
  }catch(error){try{if(next)releaseVersion(next);}finally{parent.release();}throw error;}
 }
 let current:MaskVersion=recipe?fromRecipe(recipe,visibleIdentities):createVersion();
 function releaseVersion(value:MaskVersion){if(--value.users)return;value.gpu?.release();value.gpu=undefined;value.gl=undefined;value.cpu.release();value.data=new Float32Array();value.masks=[];value.wordMasks=[];value.origin=undefined;}
 function revision(value:MaskVersion,gpu:ChunkResourceBorrow<WebGLBuffer>|null|undefined=value.gpu){return value.version+':'+Number(gpu?.state==='ready');}
 function configure(components:BuildingComponent[],paint:Float32Array<ArrayBuffer>,cohortComponents:readonly BuildingComponent[]=components){
  if(destroyed)throw Error('Rathaus masks destroyed');
  const next=createVersion(),previous=current;
  try{const {data}=next,plan=rathausCoincidentWallFragmentMasks(cohortComponents);next.masks=plan.masks;next.origin=plan.origin;const wordMasks:RathausWallFragmentMask[]=[];next.wordMasks=wordMasks;const {masks,origin}=next;let paintAt=0,row=0;
  for(const c of components){const count=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
   if(c.objectId==='osm/relation/147095'&&origin){const roofCount=c.batches[0].positions.length/3,wall=c.batches[1];let edgeBase=0;
    c.componentGeometry.coordinates.forEach((ring,ri)=>{for(let edge=0;edge<ring.length-1;edge++){
     const globalEdge=edgeBase+edge,j=globalEdge*12,first=row,selected=masks.filter(m=>m.outline.ring===ri&&m.outline.edge===edge),a=paintAt+(roofCount+globalEdge*4)*5,b=a+5;
     const nx=wall.normals[j],nz=wall.normals[j+2],qa=-nz*wall.positions[j]+nx*wall.positions[j+2],qb=-nz*wall.positions[j+3]+nx*wall.positions[j+5],ua=paint[a],ub=paint[b];
     for(const m of selected){if(row>=128)throw Error('Rathaus proxy mask budget exceeded');const map=(u:number)=>ua+(u-qa)*(ub-ua)/(qb-qa),x0=map(m.u[0]),x1=map(m.u[1]);data.set([Math.min(x0,x1),Math.max(x0,x1),m.y[0],m.y[1]],row*4);wordMasks.push(m);row++;}
     const count=row-first;if(count>=32)throw Error('Rathaus wall mask count exceeds packed budget');for(let k=0;k<4;k++){const at=paintAt+(roofCount+globalEdge*4+k)*5;const semantic=paint[at+4];if((semantic>=120&&semantic<=139)||semantic===171)paint[at+4]=semantic*10000+first*32+count;}
    }edgeBase+=ring.length-1;});
   }paintAt+=count*5;
  }current=next;releaseVersion(previous);
  }catch(error){releaseVersion(next);throw error;}
 }
 /** Resource preparation is separate from capture binding. The complete plan's
  * programs are checked, including reused colour programs; a zero-mask UBO is
  * still required when the shader exposes the block. */
 function prepareVersion(value:MaskVersion,gl:WebGL2RenderingContext,programs:readonly WebGLProgram[]):{ready:boolean;reason?:string}{
  if(gl.isContextLost())return{ready:false,reason:'context-lost'};
  try{
   const required=programs.some(p=>maskBlock(gl,p).index!==gl.INVALID_INDEX);
   // Querying a block may lose the context; an INVALID_INDEX read then is not proof
   // that the block is inactive (HEAD re-check, restored).
   if(gl.isContextLost())return{ready:false,reason:'context-lost'};
   if(!required)return{ready:true};
   if(value.gl===gl&&value.gpu?.state==='ready')return{ready:true};
   value.gpu?.release();value.gpu=undefined;
   // Exact immutable mask words name the allocation; equal zero-mask versions
   // share one UBO across physical groups and publication generations.
   const contentKey=JSON.stringify(['rathaus-proxy-mask-v1',Array.from(new Uint32Array(value.data.buffer))]);
   value.gpu=store.acquireGpu({contentKey,context:gl,epoch:store.contextEpoch(gl),role:'main',estimate:{category:'mask',bytes:value.data.byteLength,precision:'exact'},allowRecent:false,
    create(){const oldGeneric=gl.getParameter(gl.UNIFORM_BUFFER_BINDING),next=gl.createBuffer();if(!next)throw Error('Missing Rathaus mask buffer');try{gl.bindBuffer(gl.UNIFORM_BUFFER,next);gl.bufferData(gl.UNIFORM_BUFFER,value.data,gl.STATIC_DRAW);if(gl.isContextLost()||gl.getBufferParameter(gl.UNIFORM_BUFFER,gl.BUFFER_SIZE)!==value.data.byteLength)throw Error('Incomplete Rathaus mask storage');return next;}catch(error){if(!gl.isContextLost())gl.deleteBuffer(next);throw error;}finally{if(!gl.isContextLost())gl.bindBuffer(gl.UNIFORM_BUFFER,oldGeneric);}},
    dispose(buffer){if(!gl.isContextLost())gl.deleteBuffer(buffer);}});
   value.gl=gl;return{ready:true};
  }catch(error){return{ready:false,reason:('mask-prepare:'+String(error)).slice(0,384)};}
 }
 function prepare(gl:WebGL2RenderingContext,programs:readonly WebGLProgram[]){return destroyed?{ready:false,reason:'mask-destroyed'}:prepareVersion(current,gl,programs);}
 function versionResident(value:MaskVersion,gl:WebGL2RenderingContext,p:WebGLProgram,gpu:ChunkResourceBorrow<WebGLBuffer>|null|undefined=value.gpu){
  if(gl.isContextLost())return false;const {index}=maskBlock(gl,p);return !gl.isContextLost()&&(index===gl.INVALID_INDEX||(value.gl===gl&&gpu?.state==='ready'&&!!gpu.value));
 }
 function isResident(gl:WebGL2RenderingContext,p:WebGLProgram){return versionResident(current,gl,p);}
 function bindVersion(value:MaskVersion,gl:WebGL2RenderingContext,p:WebGLProgram,draw:()=>void,gpu:ChunkResourceBorrow<WebGLBuffer>|null|undefined=value.gpu){
  if(!versionResident(value,gl,p,gpu))return false;
  const {index,binding}=maskBlock(gl,p);if(index===gl.INVALID_INDEX){draw();return true;}
  const oldIndexed=gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING,binding),oldGeneric=gl.getParameter(gl.UNIFORM_BUFFER_BINDING);
  try{gl.uniformBlockBinding(p,index,binding);gl.bindBufferBase(gl.UNIFORM_BUFFER,binding,gpu!.value!);draw();return true;}
  finally{if(!gl.isContextLost()){gl.bindBufferBase(gl.UNIFORM_BUFFER,binding,oldIndexed);gl.bindBuffer(gl.UNIFORM_BUFFER,oldGeneric);}}
 }

 /** Compatibility for the ordinary main pass. Captures use explicit prepare
  * followed by bind-only withResidentMasks and cannot upload while drawing. */
 function withMasks(gl:WebGL2RenderingContext,p:WebGLProgram,draw:()=>void){
  const result=prepare(gl,[p]);if(!result.ready)throw Error(result.reason??'Mask preparation failed');
  if(!withResidentMasks(gl,p,draw))throw Error('Mask resource changed after preparation');
 }
 function withResidentMasks(gl:WebGL2RenderingContext,p:WebGLProgram,draw:()=>void){return bindVersion(current,gl,p,draw);}
 function covered(c:BuildingComponent,x:number,y:number,z:number){return c.objectId==='osm/relation/147095'&&current.masks.some(m=>rathausProxyFragmentCovered(m,x,y,z));}
 /** Pin this exact version for a complete capture; binding never uploads. */
 function retain(role:ChunkResourceRole='reflection'){
  if(destroyed)throw Error('Rathaus masks destroyed');
  const value=current;let gpu=value.gpu?.retain(role);value.users++;let live=true;
  return{prepare(gl:WebGL2RenderingContext,programs:readonly WebGLProgram[]){if(!live)return{ready:false,reason:'mask-lease-released'};if(programs.every(program=>versionResident(value,gl,program,gpu)))return{ready:true};const result=prepareVersion(value,gl,programs);if(result.ready&&value.gpu){gpu?.release();gpu=value.gpu.retain(role);}return result;},get residentRevision(){return revision(value,gpu);},get origin(){return value.origin;},isResident(gl:WebGL2RenderingContext,p:WebGLProgram){return live&&versionResident(value,gl,p,gpu);},withResidentMasks(gl:WebGL2RenderingContext,p:WebGLProgram,draw:()=>void){return live&&bindVersion(value,gl,p,draw,gpu);},release(){if(!live)return;live=false;gpu?.release();releaseVersion(value);}};
 }
 function retainReady(role:ChunkReadyBorrowRole='main'):RathausProxyMaskReadyRetention{
  if(destroyed)throw Error('Rathaus masks destroyed');
  const value=current;let gpu=value.gpu?.state==='ready'?value.gpu.borrowReady(role):null;value.users++;let live=true;
  return{get residentRevision(){return revision(value,gpu);},get origin(){return value.origin;},isResident(gl,p){return live&&versionResident(value,gl,p,gpu);},withResidentMasks(gl,p,draw){return live&&bindVersion(value,gl,p,draw,gpu);},release(){if(!live)return;live=false;const held=gpu;gpu=null;try{held?.release();}finally{releaseVersion(value);}}};
 }
 /** Only this immutable CPU recipe belongs in a packed-content cache. Each
  * renderer binding below owns its own context/epoch and pass leases. */
 function cpuRecipe():RathausProxyMaskRecipe{
  if(destroyed)throw Error('Rathaus masks destroyed');const value=current;value.users++;let live=true;
  const result:RathausProxyMaskRecipe={get words(){return value.data;},get masks(){return value.masks;},get wordMasks(){return value.wordMasks;},get origin(){return value.origin;},get costs(){return[{category:'mask' as const,bytes:value.data.byteLength,precision:'exact' as const,identity:value.data.buffer}];},retain(){if(!live)throw Error('Rathaus CPU recipe released');value.users++;let held=true;return{release(){if(!held)return;held=false;releaseVersion(value);}};},release(){if(!live)return;live=false;releaseVersion(value);},createBinding(visibleIdentities){if(!live)throw Error('Rathaus CPU recipe released');return createRathausProxyMasks(result,visibleIdentities);}};return result;
 }
 function detach(){current.gpu?.release();current.gpu=undefined;}
 function destroy(){if(destroyed)return;destroyed=true;const previous=current;current={data:new Float32Array(),masks:[],wordMasks:[],origin:undefined,version:++sequence,users:0,cpu:{release(){}}};releaseVersion(previous);}
 return {cpuRecipe,get residentBuffer(){return current.gpu?.value;},get costs():readonly ResourceBudgetCost[]{return[{category:'mask',bytes:current.data.byteLength,precision:'exact',identity:current.data.buffer}];},configure,prepare,isResident,withMasks,withResidentMasks,retain,retainReady,destroy,get residentRevision(){return revision(current);},covered,detach,get origin(){return current.origin;},get stats(){return{maskCount:current.masks.length,allocatedCPUBytes:destroyed?0:current.data.byteLength,allocatedGPUBytes:current.gpu?.value?current.data.byteLength:0,sourceParentClaim:false,sourceArraysUnchanged:true};}};
}
export const RATHAUS_PROXY_MASK_GLSL=`
layout(std140) uniform NrProxyMaskBlock {vec4 u_nr_proxy_rects[128];};
bool nrCoveredProxyFragment(vec2 uv,float packed){
 float semantic=floor(packed/10000.),bits=packed-semantic*10000.;int first=int(floor(bits/32.)),count=int(mod(bits,32.));
 for(int i=0;i<32;i++){if(i>=count)break;vec4 r=u_nr_proxy_rects[first+i];if(uv.x>=r.x&&uv.x<=r.y&&uv.y>=r.z&&uv.y<=r.w)return true;}return false;
}
`;
