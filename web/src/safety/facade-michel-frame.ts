import type {BuildingComponent} from './building-mesh-renderer';
/** Michel-only semantic metadata on unchanged native triangles.
 * Face programs subdivide actual stage heights in fragments; never mix layout
 * identifiers between vertices of one source triangle. Detail admission waits
 * for exact source-plane evidence; no proximity-based cohort membership.
 */
const lantern=new Set(['361423188','361423794','361423795','361423796','361423797','361423798','361423799','361423800']);
const roofBodies=new Set(['361423181','697355085','697355086','697355087','697355088']);
export const MICHEL_NATIVE_IDS=new Set(['22731336','314906417','361423186','361774959','361774960','361774961','362225607','362567699','314911907','361423189',...lantern,...roofBodies]);
type Field={nx:number;ny:number;nz:number;d:number;ux:number;uz:number;vx:number;vy:number;vz:number;u0:number;u1:number;v0:number;v1:number;kind:number};
let projection:{origin:[number,number];nx:number;nz:number;d:number;u0:number;W:number}|undefined;
export function configureMichelPaint(components:BuildingComponent[]){
 projection=undefined;const c=components.find(c=>c.city==='hamburg'&&c.objectId==='osm/way/697355085');if(!c)return;
 const b=c.batches[0];if(!b)return;let nx=0,nz=0,d=0,u0=Infinity,u1=-Infinity;
 for(let t=0;t<b.indices.length;t+=3){const ids=[b.indices[t],b.indices[t+1],b.indices[t+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
  const ax=b.positions[j]-b.positions[a],ay=b.positions[j+1]-b.positions[a+1],az=b.positions[j+2]-b.positions[a+2],bx=b.positions[k]-b.positions[a],by=b.positions[k+1]-b.positions[a+1],bz=b.positions[k+2]-b.positions[a+2];let x=ay*bz-az*by,y=az*bx-ax*bz,z=ax*by-ay*bx,len=Math.hypot(x,y,z);if(len<1e-7)continue;x/=len;y/=len;z/=len;if(x*b.normals[a]+y*b.normals[a+1]+z*b.normals[a+2]<0){x=-x;y=-y;z=-z;}if(Math.abs(y)>.001||z>-.98||Math.abs(x)>.08)continue;
  if(!nx&&!nz){nx=x;nz=z;d=nx*b.positions[a]+nz*b.positions[a+2];}
  if(Math.abs(nx*b.positions[a]+nz*b.positions[a+2]-d)>.025)continue;
  for(const v of ids){const u=-nz*b.positions[v*3]+nx*b.positions[v*3+2];u0=Math.min(u0,u);u1=Math.max(u1,u);}
 }
 if(u1-u0>10.)projection={origin:c.origin,nx,nz,d,u0,W:u1-u0};
}
export function michelNativePaint(c:BuildingComponent):Float32Array<ArrayBuffer>{
 const id=c.objectId.split('/').at(-1)!,out=new Float32Array(c.batches.reduce((n,b)=>n+b.positions.length/3,0)*5);let offset=0;
 for(let bi=0;bi<c.batches.length;bi++){
  const b=c.batches[bi],fields:Field[]=[],assigned=Array<Field|undefined>(b.positions.length/3),ambiguous=new Set<number>();
  for(let t=0;t<b.indices.length;t+=3){
   const ids=[b.indices[t],b.indices[t+1],b.indices[t+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
   const ax=b.positions[j]-b.positions[a],ay=b.positions[j+1]-b.positions[a+1],az=b.positions[j+2]-b.positions[a+2],bx=b.positions[k]-b.positions[a],by=b.positions[k+1]-b.positions[a+1],bz=b.positions[k+2]-b.positions[a+2];
   let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,len=Math.hypot(nx,ny,nz);if(len<1e-7)continue;nx/=len;ny/=len;nz/=len;
   if(nx*b.normals[a]+ny*b.normals[a+1]+nz*b.normals[a+2]<0){nx=-nx;ny=-ny;nz=-nz;}
   const roof=Math.abs(ny)>.12,cap=id==='361774961'||id==='361423186'||id==='361774960';
   let kind=cap?167:lantern.has(id)?166:['361774959','362225607'].includes(id)?164:id==='314906417'?163:id==='362567699'?164:roof?168:161;
   if(id==='314911907')kind=bi===0?169.1:bi===1?164:bi===2||bi===3?167:bi===4?167:bi===5?161:168;
   if(id==='361423189')kind=bi===0||bi===1?167:bi===2?164:bi===3?167:169.1;
   if(id==='22731336'&&bi===1){const edge=Math.floor(t/6);if([0,2,3,5].includes(edge))kind=162;if(edge>=110&&edge<=125)kind=160;}
   if(!roof&&id==='697355085'&&nz<-.98&&Math.abs(nx)<.08)kind=160;
   const dl=Math.hypot(nx,nz),ux=dl>.02?-nz/dl:1,uz=dl>.02?nx/dl:0,vx=dl>.02?-ny*nx/dl:0,vy=dl>.02?dl:0,vz=dl>.02?-ny*nz/dl:1,d=nx*b.positions[a]+ny*b.positions[a+1]+nz*b.positions[a+2];
   let g=fields.find(g=>g.kind===kind&&Math.hypot(g.nx-nx,g.ny-ny,g.nz-nz)<.008&&Math.abs(g.d-d)<.025);
   if(!g){g={nx,ny,nz,d,ux,uz,vx,vy,vz,u0:Infinity,u1:-Infinity,v0:Infinity,v1:-Infinity,kind};fields.push(g);}
   for(const v of ids){const p=v*3,u=ux*b.positions[p]+uz*b.positions[p+2],y=roof?vx*b.positions[p]+vy*b.positions[p+1]+vz*b.positions[p+2]:b.positions[p+1];g.u0=Math.min(g.u0,u);g.u1=Math.max(g.u1,u);g.v0=Math.min(g.v0,y);g.v1=Math.max(g.v1,y);if(assigned[v]&&assigned[v]!==g)ambiguous.add(v);else assigned[v]=g;}
  }
  const roofAccent=id==='361423181'&&bi===1?fields.filter(g=>g.kind===168&&g.nz>.30).sort((a,b)=>(b.u1-b.u0)*(b.v1-b.v0)-(a.u1-a.u0)*(a.v1-a.v0))[0]:undefined;
  for(let j=0;j<b.positions.length;j+=3){const g=assigned[j/3];if(!g||ambiguous.has(j/3)){offset+=5;continue;}const slope=Math.abs(g.ny)>.12,W=g.u1-g.u0,H=slope?g.v1-g.v0:g.v1-g.v0;if(W<.1||H<.02){offset+=5;continue;}const u=g.ux*b.positions[j]+g.uz*b.positions[j+2]-g.u0,v=slope?g.vx*b.positions[j]+g.vy*b.positions[j+1]+g.vz*b.positions[j+2]-g.v0:b.positions[j+1];
   let U=u,width=W,kind=g===roofAccent?168.1:g.kind,top=g.v1;
   if(!slope&&g.nx<-.98&&(['314906417','314911907','361423189'].includes(id)&&[163,164].includes(kind)||id==='314911907'&&bi===5&&kind===161))kind=162;
   if(projection&&kind===161&&id==='22731336'&&!slope){
    const C=40075016.686*Math.cos(projection.origin[1]*Math.PI/180),ownC=40075016.686*Math.cos(c.origin[1]*Math.PI/180),ratio=C/ownC,my=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/(2*Math.PI),dx=(c.origin[0]-projection.origin[0])*C/360,dz=(my(c.origin[1])-my(projection.origin[1]))*C;
    const mid=(g.u0+g.u1)*.5,midX=dx+(-g.nz*mid+g.nx*g.d)*ratio,midZ=dz+(g.nx*mid+g.nz*g.d)*ratio,midU=-projection.nz*midX+projection.nx*midZ-projection.u0;
    if(Math.hypot(g.nx-projection.nx,g.nz-projection.nz)<.008&&Math.abs(projection.nx*midX+projection.nz*midZ-projection.d)<.25&&W<=projection.W+1.&&midU>=0.&&midU<=projection.W){
      kind=160;U=-projection.nz*(dx+b.positions[j]*ratio)+projection.nx*(dz+b.positions[j+2]*ratio)-projection.u0;width=projection.W;top=Math.max(24.2,g.v1);
    }
   }
   if(id==='22731336'&&kind===160){U=.9981573061*b.positions[j]+.05994330877*b.positions[j+2]+3.728169037;width=14.85042178;top=24.2;}
   if(kind===162){
     // Exact original parent aliases share the rich west portal phase; no repeated doors.
     const refOrigin:[number,number]=[9.98102925,53.5502834],C=40075016.686*Math.cos(refOrigin[1]*Math.PI/180),ownC=40075016.686*Math.cos(c.origin[1]*Math.PI/180),ratio=C/ownC,my=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/(2*Math.PI),x=(c.origin[0]-refOrigin[0])*C/360+b.positions[j]*ratio,z=(my(c.origin[1])-my(refOrigin[1]))*C+b.positions[j+2]*ratio;
     U=.04361152*x-.99904857*z-196.21626604;width=14.90417975;top=Math.max(32.,g.v1);
   }
   // Current grammar expects local support/cap V; stage fields remain actualY.
   out.set([U,[166,167,168].includes(Math.floor(kind))?v-(slope?0:g.v0):v,[166,167,168].includes(Math.floor(kind))?H:top,width,kind],offset);offset+=5;
  }
 }
 return out;
}
