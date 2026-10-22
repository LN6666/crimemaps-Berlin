import type {BuildingComponent,MeshBatch} from './building-mesh-renderer';

const TARGET='osm/way/273002008';
type Point=[number,number];
type Vertex=[number,number,number];
const EARTH=40075016.686;

function localPoint(c:BuildingComponent,p:Point):Point{
 const lat=c.origin[1]*Math.PI/180;
 const x=(p[0]-c.origin[0])*EARTH*Math.cos(lat)/360;
 const y=p[1]*Math.PI/180,y0=lat;
 const z=(Math.log(Math.tan(Math.PI/4+y/2))-Math.log(Math.tan(Math.PI/4+y0/2)))*EARTH/(2*Math.PI);
 return [x,z];
}
function topOf(c:BuildingComponent):number{
 let top=0;for(const b of c.batches)for(let i=1;i<b.positions.length;i+=3)top=Math.max(top,b.positions[i]);return top;
}
function triangle(batch:{positions:number[];normals:number[];indices:number[]},a:Vertex,b:Vertex,c:Vertex,expected:Vertex):void{
 const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
 let n:[number,number,number]=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
 const length=Math.hypot(...n);if(length<1e-7)return;n=n.map(v=>v/length) as [number,number,number];
 if(n[0]*expected[0]+n[1]*expected[1]+n[2]*expected[2]<0)n=n.map(v=>-v) as [number,number,number];
 const at=batch.positions.length/3;for(const p of [a,b,c]){batch.positions.push(...p);batch.normals.push(...n);}batch.indices.push(at,at+1,at+2);
}
function quad(batch:{positions:number[];normals:number[];indices:number[]},a:Vertex,b:Vertex,c:Vertex,d:Vertex,expected:Vertex):void{
 triangle(batch,a,b,c,expected);triangle(batch,a,c,d,expected);
}
function finish(batch:{positions:number[];normals:number[];indices:number[]},materialName:string,faceRole:'wall'|'roof'):MeshBatch{
 return {positions:new Float32Array(batch.positions),normals:new Float32Array(batch.normals),indices:new Uint32Array(batch.indices),color:[1,1,1],faceRole,materialName};
}

/** Photo-supported display roof and bell tower for the church's accurately bound flat shell.
 * These additions are renderer-only; the native OSM outline and source mesh are retained.
 */
export function supplementLeipzigRehbachDisplay(components:BuildingComponent[]):BuildingComponent[]{
 return components.map(c=>{
  if(c.city!=='leipzig'||c.objectId!==TARGET)return c;
  const raw=c.componentGeometry.coordinates[0].slice(0,-1).map(p=>localPoint(c,[p[0],p[1]]));
  if(raw.length<4)return c;
  let xx=0,zz=0,xz=0,mx=0,mz=0;for(const p of raw){mx+=p[0];mz+=p[1];}mx/=raw.length;mz/=raw.length;
  for(const p of raw){const x=p[0]-mx,z=p[1]-mz;xx+=x*x;zz+=z*z;xz+=x*z;}
  const angle=.5*Math.atan2(2*xz,xx-zz),ux=Math.cos(angle),uz=Math.sin(angle),vx=-uz,vz=ux;
  const uv=raw.map(p=>[p[0]*ux+p[1]*uz,p[0]*vx+p[1]*vz] as Point);
  const u0=Math.min(...uv.map(p=>p[0])),u1=Math.max(...uv.map(p=>p[0])),v0=Math.min(...uv.map(p=>p[1])),v1=Math.max(...uv.map(p=>p[1]));
  const length=u1-u0,width=v1-v0;if(length<8||width<4)return c;
  const base=topOf(c),towerDepth=length*.21,towerWidth=width*.68,towerTop=base+10.4,ridge=base+4.1,vc=(v0+v1)/2;
  const xyz=(u:number,v:number,y:number):Vertex=>[u*ux+v*vx,y,u*uz+v*vz];
  const roof={positions:[] as number[],normals:[] as number[],indices:[] as number[]};
  const naveStart=u0+towerDepth,uRoofEnd=u1-.02;
  for(const side of [-1,1]){
   const eaveV=vc+side*width/2,ridgeV=vc;
   quad(roof,xyz(naveStart,ridgeV,ridge),xyz(uRoofEnd,ridgeV,ridge),xyz(uRoofEnd,eaveV,base),xyz(naveStart,eaveV,base),[0,1,0]);
  }
  const gable={positions:[] as number[],normals:[] as number[],indices:[] as number[]};
  triangle(gable,xyz(uRoofEnd,v0,base),xyz(uRoofEnd,v1,base),xyz(uRoofEnd,vc,ridge),[ux,0,uz]);

  const tower={positions:[] as number[],normals:[] as number[],indices:[] as number[]};
  const tu0=u0+.02,tu1=u0+towerDepth,tv0=vc-towerWidth/2,tv1=vc+towerWidth/2;
  quad(tower,xyz(tu0,tv0,base),xyz(tu1,tv0,base),xyz(tu1,tv0,towerTop),xyz(tu0,tv0,towerTop),[vx,0,-ux]);
  quad(tower,xyz(tu1,tv1,base),xyz(tu0,tv1,base),xyz(tu0,tv1,towerTop),xyz(tu1,tv1,towerTop),[-vx,0,ux]);
  quad(tower,xyz(tu0,tv1,base),xyz(tu0,tv0,base),xyz(tu0,tv0,towerTop),xyz(tu0,tv1,towerTop),[-ux,0,-uz]);
  quad(tower,xyz(tu1,tv0,base),xyz(tu1,tv1,base),xyz(tu1,tv1,towerTop),xyz(tu1,tv0,towerTop),[ux,0,uz]);

  // Dark belfry openings on all four sides, placed just outside the tower faces.
  const windows={positions:[] as number[],normals:[] as number[],indices:[] as number[]};
  const y0=towerTop-3.8,y1=towerTop-.8,hw=towerWidth*.07,midU=(tu0+tu1)/2,midV=(tv0+tv1)/2,off=.035;
  quad(windows,xyz(midU-hw,tv0-off,y0),xyz(midU+hw,tv0-off,y0),xyz(midU+hw,tv0-off,y1),xyz(midU-hw,tv0-off,y1),[vx,0,-ux]);
  quad(windows,xyz(midU+hw,tv1+off,y0),xyz(midU-hw,tv1+off,y0),xyz(midU-hw,tv1+off,y1),xyz(midU+hw,tv1+off,y1),[-vx,0,ux]);
  quad(windows,xyz(tu0-off,midV+hw,y0),xyz(tu0-off,midV-hw,y0),xyz(tu0-off,midV-hw,y1),xyz(tu0-off,midV+hw,y1),[-ux,0,-uz]);
  quad(windows,xyz(tu1+off,midV-hw,y0),xyz(tu1+off,midV+hw,y0),xyz(tu1+off,midV+hw,y1),xyz(tu1+off,midV-hw,y1),[ux,0,uz]);

  // Ribbed onion cupola, lantern and a simple metal cross from the reference photo.
  const cap={positions:[] as number[],normals:[] as number[],indices:[] as number[]};
  const profiles:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[
   [0,.75],[.42,.92],[1.0,.78],[1.65,.57],[2.28,.36],[2.78,.16],[3.1,.055]
  ];
  const segments=12,rx=towerWidth*.47,rz=towerDepth*.48;
  for(let r=0;r<profiles.length-1;r++)for(let i=0;i<segments;i++){
   const [dy0,scale0]=profiles[r],[dy1,scale1]=profiles[r+1],a0=2*Math.PI*i/segments,a1=2*Math.PI*(i+1)/segments;
   const point=(a:number,scale:number,y:number):Vertex=>xyz(midU+Math.cos(a)*rx*scale,midV+Math.sin(a)*rz*scale,towerTop+y);
   const p0=point(a0,scale0,dy0),p1=point(a1,scale0,dy0),p2=point(a1,scale1,dy1),p3=point(a0,scale1,dy1);
   const center=[Math.cos((a0+a1)/2),.25,Math.sin((a0+a1)/2)] as Vertex;quad(cap,p0,p1,p2,p3,center);
  }
  const finial={positions:[] as number[],normals:[] as number[],indices:[] as number[]};
  const poleBottom=towerTop+3.08,poleTop=poleBottom+1.2,post=.055;
  quad(finial,xyz(midU-post,midV-post,poleBottom),xyz(midU+post,midV-post,poleBottom),xyz(midU+post,midV-post,poleTop),xyz(midU-post,midV-post,poleTop),[0,0,-1]);
  quad(finial,xyz(midU+post,midV+post,poleBottom),xyz(midU-post,midV+post,poleBottom),xyz(midU-post,midV+post,poleTop),xyz(midU+post,midV+post,poleTop),[0,0,1]);
  const crossY=poleBottom+.62,crossHalf=.33,crossTop=crossY+.075;
  quad(finial,xyz(midU-post,midV-post,crossY),xyz(midU+post,midV-post,crossY),xyz(midU+post,midV-post,crossTop),xyz(midU-post,midV-post,crossTop),[0,0,-1]);
  quad(finial,xyz(midU-crossHalf,midV-post,crossY+.18),xyz(midU+crossHalf,midV-post,crossY+.18),xyz(midU+crossHalf,midV-post,crossY+.25),xyz(midU-crossHalf,midV-post,crossY+.25),[0,0,-1]);

  const additions=[finish(tower,'church-display-wall','wall'),finish(gable,'church-display-wall','wall'),finish(windows,'church-display-window','wall'),finish(roof,'church-display-roof','roof'),finish(cap,'church-display-cap','roof'),finish(finial,'church-display-finial','wall')].filter(b=>b.indices.length>0);
  const addedVertices=additions.reduce((n,b)=>n+b.positions.length/3,0),addedTriangles=additions.reduce((n,b)=>n+b.indices.length/3,0);
  return {...c,batches:[...c.batches,...additions],displaySupplement:{id:'leipzig-rehbach-gable-roof-and-onion-tower',sourceObjectId:c.objectId,addedVertices,addedTriangles}};
 });
}
