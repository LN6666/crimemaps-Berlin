import type {BuildingComponent} from './building-mesh-renderer';
/** Source surface metadata only. All source vertices/indices remain untouched.
 * Whole helmet batches trump near-vertical normals. Semantic gable/shaft splits
 * occur in the fragment painter, never by different IDs on one triangle.
 */
export const PETRI_NATIVE_IDS=new Set(['34322749','362580561','362580558','362580559','362583713','362583714','362583715','362583716','362583719','1327179546','1327179547']);
export const petriWestPortalField=new Float32Array([0,0,0,0]);
export function uploadPetriPaint(gl:WebGL2RenderingContext,program:WebGLProgram){const loc=gl.getUniformLocation(program,'u_petri_west_portal');if(loc)gl.uniform4fv(loc,petriWestPortalField);}
type Plane={nx:number;ny:number;nz:number;d:number;ux:number;uz:number;vx:number;vy:number;vz:number;u0:number;u1:number;v0:number;v1:number;style:number};
let towerReference:{origin:[number,number];planes:{nx:number;nz:number;d:number;u0:number;W:number}[]}|undefined;
export function configurePetriPaint(components:BuildingComponent[]){
 const c=components.find(c=>c.city==='hamburg'&&['osm/way/362580558','osm/way/362580559'].includes(c.objectId));towerReference=undefined;petriWestPortalField.fill(0);if(!c)return;
 // Exact apex-reaching brick carrier faces, audited in worker native-frame proof.
 // References bind drawing coordinates, not a reconstruction or vertex movement.
 towerReference={origin:c.origin,planes:[
  {nx:-.0454440583,nz:.9989668851,d:45.02287092,u0:-302.86893246,W:14.52501233},
  {nx:.9989790036,nz:.0451768788,d:302.85412450,u0:32.45107648,W:12.65284758},
  {nx:.0454439717,nz:-.9989668891,d:-32.35978363,u0:288.34843730,W:14.52501233},
  {nx:-.9989535914,nz:-.0457353488,d:-288.36684391,u0:-43.60710474,W:9.83030403},
 ]};
}
export function petriNativePaint(c:BuildingComponent):Float32Array<ArrayBuffer>{
 const id=c.objectId.split('/').at(-1)!,count=c.batches.reduce((n,b)=>n+b.positions.length/3,0),out=new Float32Array(count*5);let at=0;
 for(let bi=0;bi<c.batches.length;bi++){
  const b=c.batches[bi],helmet=id==='362580558'&&bi===2||id==='362580559'&&bi===1,roofPart=id==='1327179546'||id==='1327179547',stone=id==='362580558'&&bi===1;
  const planes:Plane[]=[],assigned=Array<Plane|undefined>(b.positions.length/3),ambiguous=new Set<number>();
  for(let t=0;t<b.indices.length;t+=3){
   const ids=[b.indices[t],b.indices[t+1],b.indices[t+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
   const ax=b.positions[j]-b.positions[a],ay=b.positions[j+1]-b.positions[a+1],az=b.positions[j+2]-b.positions[a+2],bx=b.positions[k]-b.positions[a],by=b.positions[k+1]-b.positions[a+1],bz=b.positions[k+2]-b.positions[a+2];
   let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,len=Math.hypot(nx,ny,nz);if(len<1e-7)continue;nx/=len;ny/=len;nz/=len;
   if(nx*b.normals[a]+ny*b.normals[a+1]+nz*b.normals[a+2]<0){nx=-nx;ny=-ny;nz=-nz;}
   const slope=Math.abs(ny)>.12,style=helmet?155:roofPart||slope?157:stone?159.1:['362580561','362580558','362580559'].includes(id)?153:150;
   const dl=Math.hypot(nx,nz),ux=dl>.02?-nz/dl:1,uz=dl>.02?nx/dl:0,vx=dl>.02?-ny*nx/dl:0,vy=dl>.02?dl:0,vz=dl>.02?-ny*nz/dl:1,d=nx*b.positions[a]+ny*b.positions[a+1]+nz*b.positions[a+2];
   let g=planes.find(g=>g.style===style&&Math.hypot(g.nx-nx,g.ny-ny,g.nz-nz)<.008&&Math.abs(g.d-d)<.025);
   if(!g){g={nx,ny,nz,d,ux,uz,vx,vy,vz,u0:Infinity,u1:-Infinity,v0:Infinity,v1:-Infinity,style};planes.push(g);}
   for(const v of ids){const p=v*3,u=ux*b.positions[p]+uz*b.positions[p+2],y=slope||helmet?vx*b.positions[p]+vy*b.positions[p+1]+vz*b.positions[p+2]:b.positions[p+1];g.u0=Math.min(g.u0,u);g.u1=Math.max(g.u1,u);g.v0=Math.min(g.v0,y);g.v1=Math.max(g.v1,y);if(assigned[v]&&assigned[v]!==g)ambiguous.add(v);else assigned[v]=g;}
  }
  for(let j=0;j<b.positions.length;j+=3){const g=assigned[j/3];if(!g||ambiguous.has(j/3)){at+=5;continue;}const slope=Math.abs(g.ny)>.12||helmet,W=g.u1-g.u0,H=slope?g.v1-g.v0:g.v1;if(W<.15||H<.02){at+=5;continue;}const u=g.ux*b.positions[j]+g.uz*b.positions[j+2]-g.u0,v=slope?g.vx*b.positions[j]+g.vy*b.positions[j+1]+g.vz*b.positions[j+2]-g.v0:b.positions[j+1];let style=g.style===153&&H<40?150:g.style,U=u,height=H,width=W;
   if(style===150&&W<2.)style=159;
   if(style===150&&id==='362583716')style=150.4;
   // Exactly one broad NE choir face (716/b0/plane14), graphic memorial placement.
   if(style===150.4&&id==='362583716'&&g.nx>.55&&g.nx<.57&&g.nz>.82&&g.nz<.84&&W>3.)style=150.2;
   if(towerReference&&!slope&&!stone){
    const C=40075016.686*Math.cos(towerReference.origin[1]*Math.PI/180),ownC=40075016.686*Math.cos(c.origin[1]*Math.PI/180),ratio=C/ownC,my=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/(2*Math.PI);
    const x=(c.origin[0]-towerReference.origin[0])*C/360+b.positions[j]*ratio,z=(my(c.origin[1])-my(towerReference.origin[1]))*C+b.positions[j+2]*ratio;
    const midU=(g.u0+g.u1)*.5,midX=-g.nz*midU+g.nx*g.d,midZ=g.nx*midU+g.nz*g.d,worldMidX=(c.origin[0]-towerReference.origin[0])*C/360+midX*ratio,worldMidZ=(my(c.origin[1])-my(towerReference.origin[1]))*C+midZ*ratio;
    const ref=towerReference.planes.find(r=>Math.hypot(r.nx-g.nx,r.nz-g.nz)<.008&&Math.abs(r.nx*worldMidX+r.nz*worldMidZ-r.d)<(id==='362580561'||id==='34322749'?1.05:.025)&&W<=r.W+1.2&&(-r.nz*worldMidX+r.nx*worldMidZ-r.u0)>-1.&&(-r.nz*worldMidX+r.nx*worldMidZ-r.u0)<r.W+1.);
    if(ref){style=153;U=-ref.nz*x+ref.nx*z-ref.u0;width=ref.W;height=Math.max(55,H);}
    if(id==='34322749'&&g.nx<-.995&&Math.abs(g.nz)<.08&&W>10.){
      const r=towerReference.planes[3],targetX=-r.nz*(r.u0+r.W*.5)+r.nx*r.d,targetZ=r.nx*(r.u0+r.W*.5)+r.nz*r.d;
      const localX=(targetX-(c.origin[0]-towerReference.origin[0])*C/360)/ratio,localZ=(targetZ-(my(c.origin[1])-my(towerReference.origin[1]))*C)/ratio;
      const centre=-g.nz*localX+g.nx*localZ-g.u0;
      if(centre>=0&&centre<=W&&Math.abs(r.nx*worldMidX+r.nz*worldMidZ-r.d)<1.05){style=150.3;U=u;width=W;height=H;petriWestPortalField.set([centre,r.W,55,1]);}
    }
   }
   out.set([U,v,height,width,style],at);at+=5;}
 }
 return out;
}
