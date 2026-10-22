import type {BuildingComponent,MeshBatch} from './building-mesh-renderer';

const CHURCH='osm/way/29553428';
const TOWER='osm/way/1155040012';
const WALL:[number,number,number]=[.95,.94,.89];
const ROOF:[number,number,number]=[.76,.30,.16];
const FINIAL:[number,number,number]=[.13,.15,.16];
const EARTH=40075016.686;

type Point=[number,number];
type Vertex=[number,number,number];
function localPoint(c:BuildingComponent,p:Point):[number,number]{
 const lat=c.origin[1]*Math.PI/180;
 const x=(p[0]-c.origin[0])*EARTH*Math.cos(lat)/360;
 const y=p[1]*Math.PI/180, y0=lat;
 // Match the native mesh's local ground-metre scale on both horizontal axes.
 const z=(Math.log(Math.tan(Math.PI/4+y/2))-Math.log(Math.tan(Math.PI/4+y0/2)))*EARTH*Math.cos(lat)/(2*Math.PI);
 return [x,z];
}
function topOf(c:BuildingComponent){let top=0;for(const b of c.batches)for(let i=1;i<b.positions.length;i+=3)top=Math.max(top,b.positions[i]);return top;}
function paintedOriginal(c:BuildingComponent,scaleY=1):MeshBatch[]{
 return c.batches.map((b,i)=>{
  const positions=new Float32Array(b.positions);
  if(scaleY!==1)for(let j=1;j<positions.length;j+=3)positions[j]*=scaleY;
  const roof=i===0&&b.normals.length>=3&&b.normals[1]>.9;
  return {...b,positions,color:roof?ROOF:WALL,faceRole:roof?'roof':'wall'};
 });
}
function addTriangle(batch:{positions:number[];normals:number[];indices:number[]},a:Vertex,b:Vertex,c:Vertex,expected?:Vertex):void{
 const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
 let n:[number,number,number]=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
 let length=Math.hypot(...n);if(length<1e-7)return;n=n.map(v=>v/length) as [number,number,number];
 if(expected&&n[0]*expected[0]+n[1]*expected[1]+n[2]*expected[2]<0)n=n.map(v=>-v) as [number,number,number];
 const at=batch.positions.length/3;for(const p of [a,b,c]){batch.positions.push(...p);batch.normals.push(...n);}batch.indices.push(at,at+1,at+2);
}
function quad(batch:{positions:number[];normals:number[];indices:number[]},a:Vertex,b:Vertex,c:Vertex,d:Vertex,expected:Vertex):void{
 addTriangle(batch,a,b,c,expected);addTriangle(batch,a,c,d,expected);
}
function finish(batch:{positions:number[];normals:number[];indices:number[]},color:[number,number,number],faceRole:'wall'|'roof'):MeshBatch{
 return {positions:new Float32Array(batch.positions),normals:new Float32Array(batch.normals),indices:new Uint32Array(batch.indices),color,faceRole};
}
function cleanRing(points:Point[]):Point[]{const out:Point[]=[];for(const p of points)if(!out.length||Math.hypot(p[0]-out.at(-1)![0],p[1]-out.at(-1)![1])>.001)out.push(p);if(out.length>1&&Math.hypot(out[0][0]-out.at(-1)![0],out[0][1]-out.at(-1)![1])<.001)out.pop();return out;}
function clipRoofHalf(ring:Point[],ridgeZ:number,keepNorth:boolean):Point[]{
 const inside=(p:Point)=>keepNorth?p[1]>=ridgeZ-1e-6:p[1]<=ridgeZ+1e-6,out:Point[]=[];
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],ia=inside(a),ib=inside(b);
  if(ia&&ib)out.push(b);
  else if(ia&&!ib)out.push([a[0]+(b[0]-a[0])*(ridgeZ-a[1])/(b[1]-a[1]),ridgeZ]);
  else if(!ia&&ib)out.push([a[0]+(b[0]-a[0])*(ridgeZ-a[1])/(b[1]-a[1]),ridgeZ],b);
 }
 return cleanRing(out);
}
function triangulate(ring:Point[]):number[]{
 const area=ring.reduce((s,p,i)=>s+p[0]*ring[(i+1)%ring.length][1]-ring[(i+1)%ring.length][0]*p[1],0),orientation=area>=0?1:-1,remaining=ring.map((_,i)=>i),out:number[]=[];
 const cross=(a:Point,b:Point,c:Point)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const inside=(p:Point,a:Point,b:Point,c:Point)=>{const x=cross(a,b,p)*orientation,y=cross(b,c,p)*orientation,z=cross(c,a,p)*orientation;return x>=-1e-7&&y>=-1e-7&&z>=-1e-7;};
 let guard=ring.length*ring.length;
 while(remaining.length>3&&guard-->0){let found=false;for(let i=0;i<remaining.length;i++){
  const ia=remaining[(i+remaining.length-1)%remaining.length],ib=remaining[i],ic=remaining[(i+1)%remaining.length],a=ring[ia],b=ring[ib],c=ring[ic];
  if(cross(a,b,c)*orientation<=1e-8)continue;let contains=false;for(const id of remaining)if(id!==ia&&id!==ib&&id!==ic&&inside(ring[id],a,b,c)){contains=true;break;}
  if(contains)continue;out.push(ia,ib,ic);remaining.splice(i,1);found=true;break;
 }
 if(!found){const i=remaining.findIndex((id,j)=>Math.abs(cross(ring[remaining[(j+remaining.length-1)%remaining.length]],ring[id],ring[remaining[(j+1)%remaining.length]]))<1e-7);if(i<0)break;remaining.splice(i,1);}
 }
 if(remaining.length===3)out.push(...remaining);return out;
}
function churchRoof(c:BuildingComponent):MeshBatch[]{
 const ring=c.componentGeometry.coordinates[0].slice(0,-1).map(p=>localPoint(c,[p[0],p[1]]));
 let xx=0,zz=0,xz=0;for(const p of ring){xx+=p[0]*p[0];zz+=p[1]*p[1];xz+=p[0]*p[1];}
 const angle=.5*Math.atan2(2*xz,xx-zz),ux=Math.cos(angle),uz=Math.sin(angle),vx=-uz,vz=ux;
 const axial=ring.map(p=>[p[0]*ux+p[1]*uz,p[0]*vx+p[1]*vz] as Point),ridgeV=axial.reduce((s,p)=>s+p[1],0)/axial.length;
 const roof={positions:[] as number[],normals:[] as number[],indices:[] as number[]};
 const base=topOf(c),peak=base+5.8;
 for(const half of [clipRoofHalf(axial,ridgeV,true),clipRoofHalf(axial,ridgeV,false)]){
  if(half.length<3)continue;const triangles=triangulate(half);
  for(let i=0;i+2<triangles.length;i+=3){const points=[half[triangles[i]],half[triangles[i+1]],half[triangles[i+2]]];
   const vertex=(p:Point):Vertex=>[p[0]*ux+p[1]*vx,Math.abs(p[1]-ridgeV)<.002?peak:base,p[0]*uz+p[1]*vz];
   addTriangle(roof,vertex(points[0]),vertex(points[1]),vertex(points[2]),[0,1,0]);
  }
 }
 return roof.indices.length?[finish(roof,ROOF,'roof')]:[];
}
function towerRoof(c:BuildingComponent):MeshBatch[]{
 const ring=c.componentGeometry.coordinates[0].slice(0,-1).map(p=>localPoint(c,[p[0],p[1]]));
 const mx=ring.reduce((s,p)=>s+p[0],0)/ring.length,mz=ring.reduce((s,p)=>s+p[1],0)/ring.length;
 let xx=0,zz=0,xz=0;for(const p of ring){const x=p[0]-mx,z=p[1]-mz;xx+=x*x;zz+=z*z;xz+=x*z;}
 const angle=.5*Math.atan2(2*xz,xx-zz),ux=Math.cos(angle),uz=Math.sin(angle),vx=-uz,vz=ux;
 const uv=ring.map(p=>[(p[0]-mx)*ux+(p[1]-mz)*uz,(p[0]-mx)*vx+(p[1]-mz)*vz] as Point);
 const u0=Math.min(...uv.map(p=>p[0]))-.16,u1=Math.max(...uv.map(p=>p[0]))+.16,v0=Math.min(...uv.map(p=>p[1]))-.16,v1=Math.max(...uv.map(p=>p[1]))+.16,vc=(v0+v1)/2;
 const half=(v1-v0)/2,us=u0+half*.92,ue=u1-half*.92,base=22,apex=25;
 const xyz=(u:number,v:number,y:number):Vertex=>[mx+u*ux+v*vx,y,mz+u*uz+v*vz];
 const roof={positions:[] as number[],normals:[] as number[],indices:[] as number[]};
 quad(roof,xyz(u0,v0,base),xyz(u1,v0,base),xyz(ue,vc,apex),xyz(us,vc,apex),[vx,half/apex,vz]);
 quad(roof,xyz(u0,v1,base),xyz(u1,v1,base),xyz(ue,vc,apex),xyz(us,vc,apex),[-vx,half/apex,-vz]);
 addTriangle(roof,xyz(u0,v0,base),xyz(u0,v1,base),xyz(us,vc,apex),[-ux,0,-uz]);
 addTriangle(roof,xyz(u1,v1,base),xyz(u1,v0,base),xyz(ue,vc,apex),[ux,0,uz]);
 const finial={positions:[] as number[],normals:[] as number[],indices:[] as number[]},cu=(us+ue)/2,cv=vc,w=.055,y0=25,y1=25.72;
 const corners=[xyz(cu-w,cv-w,y0),xyz(cu+w,cv-w,y0),xyz(cu+w,cv+w,y0),xyz(cu-w,cv+w,y0)],tops=[xyz(cu-w*.28,cv-w*.28,y1),xyz(cu+w*.28,cv-w*.28,y1),xyz(cu+w*.28,cv+w*.28,y1),xyz(cu-w*.28,cv+w*.28,y1)];
 for(let i=0;i<4;i++){const j=(i+1)%4;quad(finial,corners[i],corners[j],tops[j],tops[i],[0,0,1]);}quad(finial,tops[0],tops[1],tops[2],tops[3],[0,1,0]);
 return [finish(roof,ROOF,'roof'),finish(finial,FINIAL,'wall')];
}

/** Display-only roof and tower details; native OSM identities and source footprints remain intact. */
export function supplementStQuirinDisplay(components:BuildingComponent[]):BuildingComponent[]{
 return components.map(c=>{
  if(c.city!=='munich'||(c.objectId!==CHURCH&&c.objectId!==TOWER))return c;
  const tower=c.objectId===TOWER,appended=tower?towerRoof(c):churchRoof(c);
  const originals=paintedOriginal(c,tower?22/25:1);
  const addedVertices=appended.reduce((n,b)=>n+b.positions.length/3,0),addedTriangles=appended.reduce((n,b)=>n+b.indices.length/3,0);
  return {...c,batches:[...originals,...appended],displaySupplement:{id:'munich-st-quirin-roof-and-tower',sourceObjectId:c.objectId,addedVertices,addedTriangles}};
 });
}
