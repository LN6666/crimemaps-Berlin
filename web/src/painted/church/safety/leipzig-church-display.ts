import type {BuildingComponent,MeshBatch} from './building-mesh-renderer';

type Point=[number,number];
type Vertex=[number,number,number];
type RawBatch={positions:number[];normals:number[];indices:number[]};
type Layout={ux:number;uz:number;vx:number;vz:number;u0:number;u1:number;v0:number;v1:number;centerV:number;length:number;width:number;xyz:(u:number,v:number,y:number)=>Vertex};

const EARTH=40075016.686;
const TARGETS:Readonly<Record<string,'holzhausen'|'gustav-adolf'|'esg'>>={
 'osm/way/37815753|osm/way/37815753/component/ff3a34247aba900f6101':'holzhausen',
 'osm/way/398046914|osm/way/398046914/component/3f38dd8ae9f009fe1db7':'gustav-adolf',
 'osm/way/40330846|osm/way/40330846/component/521e8436cdb56fc8d6e8':'esg',
};

function localPoint(c:BuildingComponent,p:Point):Point{
 const lat=c.origin[1]*Math.PI/180;
 const x=(p[0]-c.origin[0])*EARTH*Math.cos(lat)/360;
 const y=p[1]*Math.PI/180;
 const z=(Math.log(Math.tan(Math.PI/4+y/2))-Math.log(Math.tan(Math.PI/4+lat/2)))*EARTH/(2*Math.PI);
 return [x,z];
}

function layoutOf(c:BuildingComponent):Layout|undefined{
 const ring=c.componentGeometry.coordinates[0]?.slice(0,-1);
 if(!ring||ring.length<4)return;
 const raw=ring.map(p=>localPoint(c,[p[0],p[1]]));
 let mx=0,mz=0,xx=0,zz=0,xz=0;
 for(const p of raw){mx+=p[0];mz+=p[1];}mx/=raw.length;mz/=raw.length;
 for(const p of raw){const x=p[0]-mx,z=p[1]-mz;xx+=x*x;zz+=z*z;xz+=x*z;}
 const angle=.5*Math.atan2(2*xz,xx-zz);
 let ux=Math.cos(angle),uz=Math.sin(angle);
 // Keep the main axis eastward (or northward for a near north/south footprint)
 // so the chosen nave end is deterministic. Preview must still confirm it.
 if(ux<-.001||(Math.abs(ux)<=.001&&uz<0)){ux=-ux;uz=-uz;}
 const vx=-uz,vz=ux,uv=raw.map(p=>[p[0]*ux+p[1]*uz,p[0]*vx+p[1]*vz] as Point);
 const u0=Math.min(...uv.map(p=>p[0])),u1=Math.max(...uv.map(p=>p[0]));
 const v0=Math.min(...uv.map(p=>p[1])),v1=Math.max(...uv.map(p=>p[1]));
 const length=u1-u0,width=v1-v0;
 if(length<8||width<5||length>100||width>70)return;
 return {ux,uz,vx,vz,u0,u1,v0,v1,centerV:(v0+v1)/2,length,width,xyz:(u,v,y)=>[u*ux+v*vx,y,u*uz+v*vz]};
}

function topOf(c:BuildingComponent):number{
 let top=0;for(const b of c.batches)for(let i=1;i<b.positions.length;i+=3)top=Math.max(top,b.positions[i]);return top;
}

function triangle(batch:RawBatch,a:Vertex,b:Vertex,c:Vertex,expected:Vertex):void{
 const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
 let n:[number,number,number]=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
 const length=Math.hypot(...n);if(length<1e-7)return;n=n.map(v=>v/length) as [number,number,number];
 if(n[0]*expected[0]+n[1]*expected[1]+n[2]*expected[2]<0)n=n.map(v=>-v) as [number,number,number];
 const at=batch.positions.length/3;for(const p of [a,b,c]){batch.positions.push(...p);batch.normals.push(...n);}batch.indices.push(at,at+1,at+2);
}

function quad(batch:RawBatch,a:Vertex,b:Vertex,c:Vertex,d:Vertex,expected:Vertex):void{
 triangle(batch,a,b,c,expected);triangle(batch,a,c,d,expected);
}

function finish(batch:RawBatch,materialName:string,faceRole:'wall'|'roof'):MeshBatch{
 return {positions:new Float32Array(batch.positions),normals:new Float32Array(batch.normals),indices:new Uint32Array(batch.indices),color:[1,1,1],faceRole,materialName};
}

function empty():RawBatch{return {positions:[],normals:[],indices:[]};}

function boxWalls(batch:RawBatch,l:Layout,u0:number,u1:number,v0:number,v1:number,y0:number,y1:number):void{
 const p=l.xyz,ux=l.ux,uz=l.uz,vx=l.vx,vz=l.vz;
 quad(batch,p(u0,v0,y0),p(u1,v0,y0),p(u1,v0,y1),p(u0,v0,y1),[-vx,0,-vz]);
 quad(batch,p(u1,v1,y0),p(u0,v1,y0),p(u0,v1,y1),p(u1,v1,y1),[vx,0,vz]);
 quad(batch,p(u0,v1,y0),p(u0,v0,y0),p(u0,v0,y1),p(u0,v1,y1),[-ux,0,-uz]);
 quad(batch,p(u1,v0,y0),p(u1,v1,y0),p(u1,v1,y1),p(u1,v0,y1),[ux,0,uz]);
}

function gableRoof(l:Layout,roof:RawBatch,gables:RawBatch,u0:number,u1:number,v0:number,v1:number,eave:number,ridge:number):void{
 const p=l.xyz,vc=(v0+v1)/2;
 for(const side of [-1,1]){
  const edge=side<0?v0:v1;
  quad(roof,p(u0,vc,ridge),p(u1,vc,ridge),p(u1,edge,eave),p(u0,edge,eave),[0,1,0]);
 }
 triangle(gables,p(u0,v0,eave),p(u0,v1,eave),p(u0,vc,ridge),[-l.ux,0,-l.uz]);
 triangle(gables,p(u1,v1,eave),p(u1,v0,eave),p(u1,vc,ridge),[l.ux,0,l.uz]);
}

function addOctagonalCone(batch:RawBatch,l:Layout,u:number,v:number,y0:number,y1:number,radius:number,topRadius=0):void{
 const p=l.xyz,steps=10;
 const topU=u,topV=v,topR=topRadius;
 for(let i=0;i<steps;i++){
  const a0=2*Math.PI*i/steps,a1=2*Math.PI*(i+1)/steps;
  const b0=p(u+Math.cos(a0)*radius,v+Math.sin(a0)*radius,y0);
  const b1=p(u+Math.cos(a1)*radius,v+Math.sin(a1)*radius,y0);
  const t0=p(topU+Math.cos(a0)*topR,topV+Math.sin(a0)*topR,y1);
  const t1=p(topU+Math.cos(a1)*topR,topV+Math.sin(a1)*topR,y1);
  const mid=(a0+a1)/2;
  quad(batch,b0,b1,t1,t0,[Math.cos(mid)*l.ux+Math.sin(mid)*l.vx,Math.max(.1,radius/Math.max(.1,y1-y0)),Math.cos(mid)*l.uz+Math.sin(mid)*l.vz]);
 }
}

function addDome(batch:RawBatch,l:Layout,u:number,v:number,y:number,rx:number,rz:number):number{
 const profiles:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[
  [0,.72],[.35,.98],[.9,.82],[1.5,.58],[2.05,.28],[2.35,.045]
 ];
 const steps=12,p=l.xyz;
 for(let row=0;row<profiles.length-1;row++)for(let i=0;i<steps;i++){
  const [dy0,s0]=profiles[row],[dy1,s1]=profiles[row+1],a0=2*Math.PI*i/steps,a1=2*Math.PI*(i+1)/steps;
  const point=(a:number,s:number,h:number):Vertex=>p(u+Math.cos(a)*rx*s,v+Math.sin(a)*rz*s,y+h);
  const a=point(a0,s0,dy0),b=point(a1,s0,dy0),c=point(a1,s1,dy1),d=point(a0,s1,dy1),m=(a0+a1)/2;
  quad(batch,a,b,c,d,[Math.cos(m)*l.ux+Math.sin(m)*l.vx,.25,Math.cos(m)*l.uz+Math.sin(m)*l.vz]);
 }
 return y+2.35;
}

function addWindows(batch:RawBatch,l:Layout,u0:number,u1:number,v0:number,v1:number,y0:number,y1:number):void{
 const p=l.xyz,uc=(u0+u1)/2,vc=(v0+v1)/2,hw=Math.max(.24,(u1-u0)*.075),off=.045;
 quad(batch,p(uc-hw,v0-off,y0),p(uc+hw,v0-off,y0),p(uc+hw,v0-off,y1),p(uc-hw,v0-off,y1),[-l.vx,0,-l.vz]);
 quad(batch,p(uc+hw,v1+off,y0),p(uc-hw,v1+off,y0),p(uc-hw,v1+off,y1),p(uc+hw,v1+off,y1),[l.vx,0,l.vz]);
 quad(batch,p(u0-off,vc+hw,y0),p(u0-off,vc-hw,y0),p(u0-off,vc-hw,y1),p(u0-off,vc+hw,y1),[-l.ux,0,-l.uz]);
 quad(batch,p(u1+off,vc-hw,y0),p(u1+off,vc+hw,y0),p(u1+off,vc+hw,y1),p(u1+off,vc-hw,y1),[l.ux,0,l.uz]);
}

function addFinialCross(batch:RawBatch,l:Layout,u:number,v:number,y:number,scale:number):void{
 const r=.035*scale;
 boxWalls(batch,l,u-r,u+r,v-r,v+r,y,y+1.1*scale);
 // A short cross at the top, visible on the exterior reference of Holzhausen.
 boxWalls(batch,l,u-.28*scale,u+.28*scale,v-r,v+r,y+.77*scale,y+.84*scale);
 boxWalls(batch,l,u-r,u+r,v-r,v+r,y+.56*scale,y+.63*scale);
 const ball={positions:[] as number[],normals:[] as number[],indices:[] as number[]};
 addOctagonalCone(ball,l,u,v,y+1.05*scale,y+1.25*scale,.10*scale,.01*scale);
 batch.positions.push(...ball.positions);batch.normals.push(...ball.normals);batch.indices.push(...ball.indices.map(i=>i+batch.positions.length/3-ball.positions.length/3));
}

function supplementHolzhausen(c:BuildingComponent,l:Layout):MeshBatch[]{
 const base=topOf(c),towerDepth=Math.min(5.2,l.length*.24),towerWidth=Math.min(l.width*.62,l.length*.25);
 const tu0=l.u0-.015,tu1=l.u0+towerDepth,tv0=l.centerV-towerWidth/2,tv1=l.centerV+towerWidth/2;
 const shaftTop=base+5.2,roof={...empty()},gables=empty(),tower=empty(),windows=empty(),cap=empty(),spire=empty(),finial=empty();
 // The source church outline already includes a short west-end projection; fit the tower to that end.
 boxWalls(tower,l,tu0,tu1,tv0,tv1,0,shaftTop);
 addWindows(windows,l,tu0,tu1,tv0,tv1,shaftTop-2.25,shaftTop-.55);
 const naveStart=tu1-.18;
 gableRoof(l,roof,gables,naveStart,l.u1,l.v0,l.v1,base,base+3.6);
 const domeTop=addDome(cap,l,(tu0+tu1)/2,l.centerV,shaftTop,towerWidth*.52,towerDepth*.52);
 addOctagonalCone(spire,l,(tu0+tu1)/2,l.centerV,domeTop-.02,domeTop+5.3,towerWidth*.17,.025);
 addFinialCross(finial,l,(tu0+tu1)/2,l.centerV,domeTop+5.0,.48);
 return [finish(tower,'church-display-wall','wall'),finish(gables,'church-display-wall','wall'),finish(windows,'church-display-window','wall'),finish(roof,'church-display-roof','roof'),finish(cap,'church-display-cap','roof'),finish(spire,'church-display-cap','roof'),finish(finial,'church-display-finial','wall')].filter(b=>b.indices.length>0);
}

function supplementGustavAdolf(c:BuildingComponent,l:Layout):MeshBatch[]{
 const base=topOf(c),towerWidth=Math.min(l.width*.2,l.length*.21,4.8),towerDepth=Math.min(l.width*.2,l.length*.21,4.8);
 const tu0=l.u0+.65,tu1=tu0+towerDepth,tv0=l.centerV-towerWidth/2,tv1=l.centerV+towerWidth/2;
 const shaftTop=base+4.6,roof=empty(),gables=empty(),tower=empty(),windows=empty(),spire=empty(),finial=empty();
 // A compact nave roof and a single tall end tower follow the photographed silhouette.
 boxWalls(tower,l,tu0,tu1,tv0,tv1,0,shaftTop);
 addWindows(windows,l,tu0,tu1,tv0,tv1,shaftTop-2.1,shaftTop-.55);
 const naveHalfWidth=Math.min(l.width*.31,5.6);
 gableRoof(l,roof,gables,tu1-.1,l.u1,l.centerV-naveHalfWidth,l.centerV+naveHalfWidth,base,base+3.1);
 addOctagonalCone(spire,l,(tu0+tu1)/2,l.centerV,shaftTop,shaftTop+7.4,towerWidth*.72,.025);
 addFinialCross(finial,l,(tu0+tu1)/2,l.centerV,shaftTop+7.1,.42);
 return [finish(tower,'church-display-wall','wall'),finish(gables,'church-display-wall','wall'),finish(windows,'church-display-window','wall'),finish(roof,'church-display-roof','roof'),finish(spire,'church-display-cap','roof'),finish(finial,'church-display-finial','wall')].filter(b=>b.indices.length>0);
}

function supplementESG(c:BuildingComponent,l:Layout):MeshBatch[]{
 const base=topOf(c),u0=l.u0+.02,u1=l.u1-.02,v0=l.v0,v1=l.v1,vc=l.centerV;
 const eave=base,shoulder=base+2.0,ridge=base+3.7,ridgeV=vc;
 const roof=empty(),endWalls=empty(),dormerWalls=empty(),dormerRoof=empty(),windows=empty();
 const p=l.xyz;
 const sideWidth=l.width*.26;
 for(const side of [-1,1]){
  const edge=side<0?v0:v1,shoulderV=vc+side*sideWidth;
  quad(roof,p(u0,shoulderV,shoulder),p(u1,shoulderV,shoulder),p(u1,edge,eave),p(u0,edge,eave),[0,1,0]);
  quad(roof,p(u0,ridgeV,ridge),p(u1,ridgeV,ridge),p(u1,shoulderV,shoulder),p(u0,shoulderV,shoulder),[0,1,0]);
 }
 triangle(endWalls,p(u0,v0,eave),p(u0,v1,eave),p(u0,vc,ridge),[-l.ux,0,-l.uz]);
 triangle(endWalls,p(u1,v1,eave),p(u1,v0,eave),p(u1,vc,ridge),[l.ux,0,l.uz]);

 const roofHeight=(distance:number)=>distance<=sideWidth?ridge-(ridge-shoulder)*(distance/sideWidth):shoulder-(shoulder-eave)*((distance-sideWidth)/Math.max(.1,l.width/2-sideWidth));
 const addDormer=(uc:number,dormerWidth:number,side:number,wallHeight:number):void=>{
  const center=vc+side*l.width*.33,outer=vc+side*l.width*.43,inner=vc+side*l.width*.20;
  const floor=Math.max(base+.28,roofHeight(Math.abs(center-vc))+.12),top=floor+wallHeight,peak=top+.55;
  const a=uc-dormerWidth/2,b=uc+dormerWidth/2;
  const expected=[l.vx*side,0,l.vz*side] as Vertex;
  // Raised gabled dormer volume. Its source roof remains intact beneath this display-only layer.
  quad(dormerWalls,p(a,outer,floor),p(b,outer,floor),p(b,outer,top),p(a,outer,top),expected);
  triangle(dormerWalls,p(a,outer,top),p(b,outer,top),p(uc,outer,peak),expected);
  const longSide=[l.ux,0,l.uz] as Vertex;
  quad(dormerWalls,p(a,inner,floor),p(a,outer,floor),p(a,outer,top),p(a,inner,top),longSide);
  quad(dormerWalls,p(b,outer,floor),p(b,inner,floor),p(b,inner,top),p(b,outer,top),[-l.ux,0,-l.uz]);
  const backRoofEdge=vc+side*l.width*.22;
  const roofNormal=[0,1,0] as Vertex;
  quad(dormerRoof,p(a,backRoofEdge,top),p(b,backRoofEdge,top),p(b,outer,floor),p(a,outer,floor),roofNormal);
  quad(dormerRoof,p(a,backRoofEdge,top),p(a,outer,floor),p(uc,outer,peak),p(uc,backRoofEdge,peak),roofNormal);
  quad(dormerRoof,p(uc,backRoofEdge,peak),p(uc,outer,peak),p(b,outer,floor),p(b,backRoofEdge,top),roofNormal);
  const winHalf=dormerWidth*.18,winLow=floor+.24,winHigh=top-.12,off=side*.04;
  quad(windows,p(uc-winHalf,outer+off,winLow),p(uc+winHalf,outer+off,winLow),p(uc+winHalf,outer+off,winHigh),p(uc-winHalf,outer+off,winHigh),expected);
 };
 // The saved exterior shows a long mansard roof with three dormers on the photographed street side.
 const side=-1,usable=l.length*.58,start=l.u0+l.length*.23;
 addDormer(start,Math.min(1.35,l.length*.12),side,1.05);
 addDormer(start+usable*.48,Math.min(1.75,l.length*.15),side,1.2);
 addDormer(start+usable,Math.min(1.35,l.length*.12),side,1.05);
 return [finish(roof,'church-display-roof','roof'),finish(endWalls,'church-display-wall','wall'),finish(dormerWalls,'church-display-wall','wall'),finish(dormerRoof,'church-display-roof','roof'),finish(windows,'church-display-window','wall')].filter(b=>b.indices.length>0);
}

/**
 * Renderer-only, photo-guided details for three exact Leipzig church components.
 * Existing source vertices, outlines and component identities remain unchanged.
 * Heights and placement are display estimates; the saved photographs do not fix
 * every elevation or camera-facing side, so the integrated result needs preview.
 */
export function supplementLeipzigChurchDisplay(components:BuildingComponent[]):BuildingComponent[]{
 return components.map(c=>{
  if(c.city!=='leipzig')return c;
  const kind=TARGETS[c.objectId+'|'+c.partId];if(!kind)return c;
  const l=layoutOf(c);if(!l)return c;
  const additions=kind==='holzhausen'?supplementHolzhausen(c,l):kind==='gustav-adolf'?supplementGustavAdolf(c,l):supplementESG(c,l);
  const vertices=additions.reduce((n,b)=>n+b.positions.length/3,0),triangles=additions.reduce((n,b)=>n+b.indices.length/3,0);
  if(!vertices)return c;
  return {...c,batches:[...c.batches,...additions],displaySupplement:{id:`leipzig-church-${kind}-photo-display`,sourceObjectId:c.objectId,addedVertices:vertices,addedTriangles:triangles}};
 });
}
