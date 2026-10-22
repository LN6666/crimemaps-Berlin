import type {BuildingComponent} from './building-mesh-renderer';
// Only explicit Frauenkirche group2181619 source IDs. No Rathaus proximity candidates admitted.
export const FRAUEN_NATIVE_IDS=new Set(['225698612','108429818','209452724','222512591','222512593','222512594','222512595','222512597']);
type Plane={nx:number;ny:number;nz:number;d:number;ux:number;uz:number;vx:number;vy:number;vz:number;u0:number;u1:number;v0:number;v1:number;roof:boolean;style:number};
/** Attach metadata to original native vertices; no coordinates/indices/geometry are changed. */
export function frauenNativePaint(c:BuildingComponent):Float32Array<ArrayBuffer>{
 const count=c.batches.reduce((n,b)=>n+b.positions.length/3,0),out=new Float32Array(count*5),id=c.objectId.split('/').at(-1)!;
 const tower=['222512591','222512594','222512595'].includes(id),nave=['222512593','222512597'].includes(id),portal=id==='209452724',annex=id==='108429818';
 let at=0;
 for(const b of c.batches){
  const planes:Plane[]=[],assigned=Array<Plane|undefined>(b.positions.length/3),ambiguous=new Set<number>();
  const copper=b.color[1]>b.color[0]*1.12&&b.color[1]>b.color[2]*1.02;
  for(let t=0;t<b.indices.length;t+=3){
   const ids=[b.indices[t],b.indices[t+1],b.indices[t+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
   const ax=b.positions[j]-b.positions[a],ay=b.positions[j+1]-b.positions[a+1],az=b.positions[j+2]-b.positions[a+2],bx=b.positions[k]-b.positions[a],by=b.positions[k+1]-b.positions[a+1],bz=b.positions[k+2]-b.positions[a+2];
   let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,len=Math.hypot(nx,ny,nz);if(len<1e-7)continue;nx/=len;ny/=len;nz/=len;
   if(nx*b.normals[a]+ny*b.normals[a+1]+nz*b.normals[a+2]<0){nx=-nx;ny=-ny;nz=-nz;}
   const roof=b.faceRole==='roof'||Math.abs(ny)>.08;
   // Copper dome batches can include near-vertical triangles; original roof role/material wins.
   const isRoof=roof||(tower&&copper);if(!isRoof&&Math.abs(ny)>.001)continue;
   let dl=Math.hypot(nx,nz),ux=dl>.02?-nz/dl:1.,uz=dl>.02?nx/dl:0.,vx=dl>.02?-ny*nx/dl:0.,vy=dl>.02?dl:0.,vz=dl>.02?-ny*nz/dl:1.;
   const d=nx*b.positions[a]+ny*b.positions[a+1]+nz*b.positions[a+2];
   let g=planes.find(g=>g.roof===isRoof&&Math.hypot(g.nx-nx,g.ny-ny,g.nz-nz)<.008&&ids.every(i=>Math.abs(g.nx*b.positions[i*3]+g.ny*b.positions[i*3+1]+g.nz*b.positions[i*3+2]-g.d)<.25));
   if(!g){g={nx,ny,nz,d,ux,uz,vx,vy,vz,u0:Infinity,u1:-Infinity,v0:Infinity,v1:-Infinity,roof:isRoof,style:isRoof?(tower&&copper?128:portal?132:127):tower?(id==='222512591'?126:125):portal?131:annex?130:124};planes.push(g);}
   for(const v of ids){const p=v*3,u=g.ux*b.positions[p]+g.uz*b.positions[p+2],y=g.roof?g.vx*b.positions[p]+g.vy*b.positions[p+1]+g.vz*b.positions[p+2]:b.positions[p+1];g.u0=Math.min(g.u0,u);g.u1=Math.max(g.u1,u);g.v0=Math.min(g.v0,y);g.v1=Math.max(g.v1,y);if(assigned[v]&&assigned[v]!==g)ambiguous.add(v);else assigned[v]=g;}
  }
  for(let j=0;j<b.positions.length;j+=3){const v=j/3,g=assigned[v];
   if(!g||ambiguous.has(v)){at+=5;continue;}
   const W=g.u1-g.u0,H=g.roof?g.v1-g.v0:(nave?Math.min(30,g.v1):g.v1);
   if(W<.35||H<.1){at+=5;continue;}
   const u=g.ux*b.positions[j]+g.uz*b.positions[j+2]-g.u0,y=g.roof?g.vx*b.positions[j]+g.vy*b.positions[j+1]+g.vz*b.positions[j+2]-g.v0:b.positions[j+1];
   // Nave gables above native30m eaves stay solid brick, not stretched lancet fields.
   const style=g.style;
   out.set([u,y,H,W,style],at);at+=5;
  }
 }
 return out;
}

/** Rathaus parts are visually associated for paint only; original ownership is not asserted.
 * Evidence: workers/munich-rathaus-display-association-20261011.json.
 */
export const RATHAUS_NATIVE_IDS=new Set(["147095", "219431689", "222518028", "222518027", "222518030", "223907239", "223907241", "223907242", "223907278", "223907281", "223907284", "224138001", "224138002", "224138003", "224138004", "224138007", "224138008", "224138009", "224138010", "224138012", "224253363", "224253364", "224253365", "224253366", "224253368", "224253371", "224253373", "224253377", "224253378", "224253380", "224253381", "224253385", "224253386", "224253387", "497647021"]);
const RATHAUS_WING_IDS=new Set(["223907239", "223907241", "223907242", "223907278", "223907281", "223907284", "497647021"]);
export function rathausNativePaint(c:BuildingComponent):Float32Array<ArrayBuffer>{
 const id=c.objectId.split('/').at(-1)!,main=id==='147095',crown=id==='222518030',ornament=id.startsWith('224'),wing=RATHAUS_WING_IDS.has(id),count=c.batches.reduce((n,b)=>n+b.positions.length/3,0),out=new Float32Array(count*5);
 let at=0;
 if(id==='497647021'){const paint=frauenNativePaint(c);for(let i=0;i<paint.length;i+=5){if(paint[i+4]===124){paint[i+4]=134;paint[i+2]=Math.min(paint[i+2],21);}else if(paint[i+4]===127)paint[i+4]=129;}return paint;}
 const ringEdgeCounts=c.componentGeometry.coordinates.map(r=>r.length-1);
 for(const b of c.batches){
  if(ornament){
   // Confirmed decorative components inherit masonry/cap materials only; no guessed glazing.
   const copper=b.color[1]>b.color[0]*1.12&&b.color[1]>b.color[2]*1.02,dark=Math.max(...b.color)<.35;
   let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity,y1=0;
   for(let j=0;j<b.positions.length;j+=3){x0=Math.min(x0,b.positions[j]);x1=Math.max(x1,b.positions[j]);z0=Math.min(z0,b.positions[j+2]);z1=Math.max(z1,b.positions[j+2]);y1=Math.max(y1,b.positions[j+1]);}
   for(let j=0;j<b.positions.length;j+=3){const nx=b.normals[j],nz=b.normals[j+2],u=-nz*(b.positions[j]-x0)+nx*(b.positions[j+2]-z0),width=Math.max(.25,Math.abs(nz)*(x1-x0)+Math.abs(nx)*(z1-z0));out.set([u,b.positions[j+1],Math.max(.1,y1),width,copper?138:dark?129:137],at);at+=5;}
   continue;
  }
  const groups:(Plane&{ring:number;mx:number;mz:number;edges:number;library:boolean})[]=[],assigned=Array<Plane|undefined>(b.positions.length/3);
  if(crown){
   const faces=new Map<string,{nx:number;nz:number;u0:number;u1:number;y0:number;y1:number}>();
   for(let j=0;j<b.positions.length;j+=3){const dl=Math.hypot(b.normals[j],b.normals[j+2]),nx=b.normals[j]/Math.max(dl,.001),nz=b.normals[j+2]/Math.max(dl,.001),key=nx.toFixed(3)+','+nz.toFixed(3),u=-nz*b.positions[j]+nx*b.positions[j+2];let g=faces.get(key);if(!g){g={nx,nz,u0:Infinity,u1:-Infinity,y0:Infinity,y1:-Infinity};faces.set(key,g);}g.u0=Math.min(g.u0,u);g.u1=Math.max(g.u1,u);g.y0=Math.min(g.y0,b.positions[j+1]);g.y1=Math.max(g.y1,b.positions[j+1]);}
   for(let j=0;j<b.positions.length;j+=3){const dl=Math.hypot(b.normals[j],b.normals[j+2]),nx=b.normals[j]/Math.max(dl,.001),nz=b.normals[j+2]/Math.max(dl,.001),g=faces.get(nx.toFixed(3)+','+nz.toFixed(3))!;out.set([-g.nz*b.positions[j]+g.nx*b.positions[j+2]-g.u0,b.positions[j+1]-g.y0,Math.max(.1,g.y1-g.y0),Math.max(.1,g.u1-g.u0),133],at);at+=5;}continue;
  }
  const horizontal=b.normals.length>0&&Math.abs(b.normals[1])>.90;
  if(horizontal||crown){let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(let j=0;j<b.positions.length;j+=3){x0=Math.min(x0,b.positions[j]);x1=Math.max(x1,b.positions[j]);z0=Math.min(z0,b.positions[j+2]);z1=Math.max(z1,b.positions[j+2]);}
   for(let j=0;j<b.positions.length;j+=3){out.set([b.positions[j]-x0,b.positions[j+2]-z0,Math.max(.1,z1-z0),Math.max(.1,x1-x0),main?139:129],at);at+=5;}continue;
  }
  let edgeOffset=0;
  for(let ring=0;ring<ringEdgeCounts.length;ring++){
   const edges=ringEdgeCounts[ring];
   for(let edge=0;edge<edges;edge++){
    // Native flat codec stores four original wall vertices per original ring edge.
    const a=(edgeOffset+edge)*12;if(a+11>=b.positions.length)continue;
    const nx=b.normals[a],nz=b.normals[a+2],d=nx*b.positions[a]+nz*b.positions[a+2],mx=(b.positions[a]+b.positions[a+3])*.5,mz=(b.positions[a+2]+b.positions[a+5])*.5;
    const isLibrary=main&&ring===3&&edge===11,isLoggia=main&&ring===0&&edge===49,candidateStyle=main?(isLibrary?121:isLoggia?171:ring>0?134:120):wing?134:id==='219431689'?122:123;
    let g=groups.find(g=>g.ring===ring&&g.library===isLibrary&&g.style===candidateStyle&&Math.hypot(nx-g.nx,nz-g.nz)<.008&&Math.abs(d-g.d)<.25);
    if(!g){g={nx,ny:0,nz,d,ux:-nz,uz:nx,vx:0,vy:1,vz:0,u0:Infinity,u1:-Infinity,v0:Infinity,v1:-Infinity,roof:false,style:candidateStyle,ring,mx,mz,edges:0,library:isLibrary};groups.push(g);}
    g.mx=(g.mx*g.edges+mx)/(g.edges+1);g.mz=(g.mz*g.edges+mz)/(g.edges+1);g.edges++;
    for(let k=0;k<4;k++){const j=a+k*3,v=j/3,u=g.ux*b.positions[j]+g.uz*b.positions[j+2];g.u0=Math.min(g.u0,u);g.u1=Math.max(g.u1,u);g.v0=Math.min(g.v0,b.positions[j+1]);g.v1=Math.max(g.v1,b.positions[j+1]);assigned[v]=g;}
   }edgeOffset+=edges;
  }
  for(let j=0;j<b.positions.length;j+=3){const g=assigned[j/3] as (typeof groups)[number]|undefined;if(!g){at+=5;continue;}
   const W=g.u1-g.u0,H=g.v1;if(W<.3){at+=5;continue;}
   let style=g.style;
   if(main&&g.ring===3&&!g.library&&g.mx<-34&&W<5.5)style=136;
   else if(main&&W<3.)style=135;
   out.set([g.ux*b.positions[j]+g.uz*b.positions[j+2]-g.u0,b.positions[j+1],H,W,style],at);at+=5;
  }
 }
 return out;
}

type RathausReference={origin:[number,number];planes:{nx:number;nz:number;d:number;u0:number;W:number;H:number;style:number}[]};
/** Coincident source-part walls use the same painted field as the unchanged outline.
 * This avoids divergent window rhythms on already-overlapping native meshes.
 */
export function rathausPaintReference(parent:BuildingComponent|undefined):RathausReference|undefined{
 if(!parent)return;const paint=rathausNativePaint(parent),planes:RathausReference['planes']=[],seen=new Set<string>();let at=0;
 for(const b of parent.batches)for(let j=0;j<b.positions.length;j+=3){const style=paint[at+4],nx=b.normals[j],nz=b.normals[j+2],H=paint[at+2],W=paint[at+3];
  if(Math.abs(b.normals[j+1])<.001&&H>0&&W>0&&style!==129){const d=nx*b.positions[j]+nz*b.positions[j+2],u0=-nz*b.positions[j]+nx*b.positions[j+2]-paint[at],key=[nx.toFixed(4),nz.toFixed(4),d.toFixed(2),u0.toFixed(2),W.toFixed(2),style].join('|');if(!seen.has(key)){seen.add(key);planes.push({nx,nz,d,u0,W,H,style});}}
  at+=5;
 }
 return {origin:parent.origin,planes};
}
export function alignRathausWingPaint(c:BuildingComponent,paint:Float32Array<ArrayBuffer>,reference:RathausReference|undefined){
 const id=c.objectId.split('/').at(-1)!;if(!reference||!RATHAUS_WING_IDS.has(id))return paint;
 const C=40075016.686*Math.cos(reference.origin[1]*Math.PI/180),ownC=40075016.686*Math.cos(c.origin[1]*Math.PI/180),ratio=C/ownC;
 const my=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/(2*Math.PI),dx=(c.origin[0]-reference.origin[0])*C/360,dz=(my(c.origin[1])-my(reference.origin[1]))*C;let at=0;
 for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3){
  if(paint[at+4]===134&&Math.abs(b.normals[j+1])<.001){const x=dx+b.positions[j]*ratio,z=dz+b.positions[j+2]*ratio,nx=b.normals[j],nz=b.normals[j+2];const g=reference.planes.find(g=>Math.hypot(g.nx-nx,g.nz-nz)<.008&&Math.abs(g.nx*x+g.nz*z-g.d)<.25&&(-g.nz*x+g.nx*z-g.u0)>=-.25&&(-g.nz*x+g.nx*z-g.u0)<=g.W+.25);
   if(g){paint[at]=-g.nz*x+g.nx*z-g.u0;paint[at+2]=g.H;paint[at+3]=g.W;paint[at+4]=g.style;}
  }at+=5;
 }
 return paint;
}
