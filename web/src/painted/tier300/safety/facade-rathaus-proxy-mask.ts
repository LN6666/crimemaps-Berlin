import type {BuildingComponent} from './building-mesh-renderer';
import {rathausCoincidentWallFragmentMasks,rathausProxyFragmentCovered,type RathausWallFragmentMask} from './facade-rathaus-display-masks';
/** Fragment/pick suppression only for proven coincident original proxy walls.
 * The original source positions, indices and identities are never modified.
 */
export function createRathausProxyMasks(){
 const data=new Float32Array(128*4);let masks:RathausWallFragmentMask[]=[],origin:[number,number]|undefined,version=0,uploaded=-1,buffer:WebGLBuffer|undefined,ownerGL:WebGL2RenderingContext|undefined;
 function configure(components:BuildingComponent[],paint:Float32Array<ArrayBuffer>){
  const plan=rathausCoincidentWallFragmentMasks(components);masks=plan.masks;origin=plan.origin;data.fill(0);let paintAt=0,row=0;
  for(const c of components){const count=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
   if(c.objectId==='osm/relation/147095'&&origin){const roofCount=c.batches[0].positions.length/3,wall=c.batches[1];let edgeBase=0;
    c.componentGeometry.coordinates.forEach((ring,ri)=>{for(let edge=0;edge<ring.length-1;edge++){
     const globalEdge=edgeBase+edge,j=globalEdge*12,first=row,selected=masks.filter(m=>m.outline.ring===ri&&m.outline.edge===edge),a=paintAt+(roofCount+globalEdge*4)*5,b=a+5;
     const nx=wall.normals[j],nz=wall.normals[j+2],qa=-nz*wall.positions[j]+nx*wall.positions[j+2],qb=-nz*wall.positions[j+3]+nx*wall.positions[j+5],ua=paint[a],ub=paint[b];
     for(const m of selected){if(row>=128)throw Error('Rathaus proxy mask budget exceeded');const map=(u:number)=>ua+(u-qa)*(ub-ua)/(qb-qa),x0=map(m.u[0]),x1=map(m.u[1]);data.set([Math.min(x0,x1),Math.max(x0,x1),m.y[0],m.y[1]],row*4);row++;}
     const count=row-first;if(count>=32)throw Error('Rathaus wall mask count exceeds packed budget');for(let k=0;k<4;k++){const at=paintAt+(roofCount+globalEdge*4+k)*5;const semantic=paint[at+4];if((semantic>=120&&semantic<=139)||semantic===171)paint[at+4]=semantic*10000+first*32+count;}
    }edgeBase+=ring.length-1;});
   }paintAt+=count*5;
  }version++;
 }
 function withMasks(gl:WebGL2RenderingContext,p:WebGLProgram,draw:()=>void){
  const index=gl.getUniformBlockIndex(p,'NrProxyMaskBlock');if(index===gl.INVALID_INDEX){draw();return;}
  const binding=gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS)-1,oldIndexed=gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING,binding),oldGeneric=gl.getParameter(gl.UNIFORM_BUFFER_BINDING);
  try{if(ownerGL!==gl){buffer=undefined;uploaded=-1;ownerGL=gl;}if(!buffer)buffer=gl.createBuffer()??undefined;if(!buffer)throw Error('Missing Rathaus mask buffer');
   gl.bindBuffer(gl.UNIFORM_BUFFER,buffer);if(uploaded!==version){gl.bufferData(gl.UNIFORM_BUFFER,data,gl.DYNAMIC_DRAW);uploaded=version;}
   gl.uniformBlockBinding(p,index,binding);gl.bindBufferBase(gl.UNIFORM_BUFFER,binding,buffer);draw();
  }finally{gl.bindBufferBase(gl.UNIFORM_BUFFER,binding,oldIndexed);gl.bindBuffer(gl.UNIFORM_BUFFER,oldGeneric);}
 }

 /** Reflection consumes only a mask version already uploaded by an ordinary scene draw. */
 function withResidentMasks(gl:WebGL2RenderingContext,p:WebGLProgram,draw:()=>void){
  const index=gl.getUniformBlockIndex(p,'NrProxyMaskBlock');if(index===gl.INVALID_INDEX){draw();return true;}if(ownerGL!==gl||!buffer||uploaded!==version)return false;
  const binding=gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS)-1,oldIndexed=gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING,binding),oldGeneric=gl.getParameter(gl.UNIFORM_BUFFER_BINDING);
  try{gl.uniformBlockBinding(p,index,binding);gl.bindBufferBase(gl.UNIFORM_BUFFER,binding,buffer);draw();return true;}finally{gl.bindBufferBase(gl.UNIFORM_BUFFER,binding,oldIndexed);gl.bindBuffer(gl.UNIFORM_BUFFER,oldGeneric);}
 }
 function covered(c:BuildingComponent,x:number,y:number,z:number){return c.objectId==='osm/relation/147095'&&masks.some(m=>rathausProxyFragmentCovered(m,x,y,z));}
 function detach(){if(ownerGL&&buffer)ownerGL.deleteBuffer(buffer);buffer=undefined;uploaded=-1;ownerGL=undefined;}
 return {configure,withMasks,withResidentMasks,get residentRevision(){return version+':'+uploaded+':'+Number(Boolean(buffer));},covered,detach,get origin(){return origin;},get stats(){return{maskCount:masks.length,allocatedCPUBytes:data.byteLength,allocatedGPUBytes:buffer?data.byteLength:0,sourceParentClaim:false,sourceArraysUnchanged:true};}};
}
export const RATHAUS_PROXY_MASK_GLSL=`
layout(std140) uniform NrProxyMaskBlock {vec4 u_nr_proxy_rects[128];};
bool nrCoveredProxyFragment(vec2 uv,float packed){
 float semantic=floor(packed/10000.),bits=packed-semantic*10000.;int first=int(floor(bits/32.)),count=int(mod(bits,32.));
 for(int i=0;i<32;i++){if(i>=count)break;vec4 r=u_nr_proxy_rects[first+i];if(uv.x>=r.x&&uv.x<=r.y&&uv.y>=r.z&&uv.y<=r.w)return true;}return false;
}
`;
