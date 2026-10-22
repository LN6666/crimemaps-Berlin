import type {BuildingComponent,MeshBatch} from './building-mesh-renderer';

const TOWER_WAY='osm/way/1293381718';
const TOWER_RELATION='osm/relation/17731590';
const BODY_TOP=52;
const EARTH=40075016.686;
const ROOF_COLOR:[number,number,number]=[.25,.08,.055];
const FINIAL_COLOR:[number,number,number]=[.78,.59,.24];
type Point=[number,number];
type Vertex=[number,number,number];

function localPoint(c:BuildingComponent,p:Point):Point{
 const lat=c.origin[1]*Math.PI/180;
 const x=(p[0]-c.origin[0])*EARTH*Math.cos(lat)/360;
 // Mesh positions use ground metres from the tile origin (not Mercator metres).
 const z=(p[1]-c.origin[1])*Math.PI/180*EARTH/(2*Math.PI);
 return [x,z];
}
function polygonCenter(ring:Point[]):Point{
 let twiceArea=0,x=0,z=0;
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],cross=a[0]*b[1]-b[0]*a[1];
  twiceArea+=cross;x+=(a[0]+b[0])*cross;z+=(a[1]+b[1])*cross;
 }
 if(Math.abs(twiceArea)<1e-6)throw Error('Sankt Theresia footprint has no area');
 return [x/(3*twiceArea),z/(3*twiceArea)];
}
function addTriangle(batch:{positions:number[];normals:number[];indices:number[]},a:Vertex,b:Vertex,c:Vertex,expected:Vertex):void{
 const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
 let n:[number,number,number]=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
 const length=Math.hypot(...n);if(length<1e-7)return;n=n.map(v=>v/length) as [number,number,number];
 if(n[0]*expected[0]+n[1]*expected[1]+n[2]*expected[2]<0)n=n.map(v=>-v) as [number,number,number];
 const at=batch.positions.length/3;for(const p of [a,b,c]){batch.positions.push(...p);batch.normals.push(...n);}batch.indices.push(at,at+1,at+2);
}
function emptyBatch():{positions:number[];normals:number[];indices:number[]}{return {positions:[],normals:[],indices:[]};}

/** Rebuild the visible metal crown at the shared 52 m tower eave. */
function doubleOnion(c:BuildingComponent,ring:Point[]):MeshBatch[]{
 const localRing=ring.slice(0,-1).map(p=>localPoint(c,p));
 const [cx,cz]=polygonCenter(localRing);
 // The lower bulb, smaller upper bulb, and spire fit the source 62 m tower height.
 const profile:Array<[number,number]>=[
  [0,3.15],[.55,3.75],[1.45,4.05],[2.35,3.82],[3.05,3.05],[3.4,2.35],
  [3.68,1.72],[3.95,1.62],[4.28,1.88],[4.62,2.18],[5.02,2.28],
  [5.4,2.02],[5.78,1.44],[6.12,.78],[6.38,.46],[7.12,.25],
  [7.95,.09],[8.2,.035],[8.25,0]
 ];
 const segments=32,dome=emptyBatch();
 const ringVertex=(height:number,radius:number,angle:number):Vertex=>[cx+Math.cos(angle)*radius,BODY_TOP+height,cz+Math.sin(angle)*radius];
 for(let layer=0;layer<profile.length-1;layer++){
  const [y0,r0]=profile[layer],[y1,r1]=profile[layer+1];
  for(let i=0;i<segments;i++){
   const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
   const p0=ringVertex(y0,r0,a),p1=ringVertex(y0,r0,b),p2=ringVertex(y1,r1,b),p3=ringVertex(y1,r1,a);
   const angle=(a+b)/2,expected:[number,number,number]=[Math.cos(angle),.34,Math.sin(angle)];
   addTriangle(dome,p0,p1,p2,expected);addTriangle(dome,p0,p2,p3,expected);
  }
 }
 const finial=emptyBatch();
 // Small gilded orb above the spire.
 const orbProfile:Array<[number,number]>=[[0,.08],[.12,.22],[.3,.25],[.48,.17],[.58,.02],[.6,0]];
 for(let layer=0;layer<orbProfile.length-1;layer++){
  const [y0,r0]=orbProfile[layer],[y1,r1]=orbProfile[layer+1];
  for(let i=0;i<segments;i++){
   const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
   const p0=ringVertex(8.28+y0,r0,a),p1=ringVertex(8.28+y0,r0,b),p2=ringVertex(8.28+y1,r1,b),p3=ringVertex(8.28+y1,r1,a);
   const angle=(a+b)/2,expected:[number,number,number]=[Math.cos(angle),.34,Math.sin(angle)];
   addTriangle(finial,p0,p1,p2,expected);addTriangle(finial,p0,p2,p3,expected);
  }
 }
 const addBox=(centerY:number,halfX:number,halfY:number,halfZ:number)=>{
  const x0=cx-halfX,x1=cx+halfX,y0=centerY-halfY,y1=centerY+halfY,z0=cz-halfZ,z1=cz+halfZ;
  const faces:Array<[Vertex,Vertex,Vertex,Vertex,Vertex]>=[
   [[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0],[1,0,0]],
   [[x0,y0,z1],[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[-1,0,0]],
   [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],[0,1,0]],
   [[x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0],[0,-1,0]],
   [[x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1],[0,0,1]],
   [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[0,0,-1]]
  ];
  for(const [a,b,d,e,n] of faces){addTriangle(finial,a,b,d,n);addTriangle(finial,a,d,e,n);}
 };
 // Gold cross: vertical stem and short transverse arms.
 addBox(BODY_TOP+9.03,.055,.52,.055);
 addBox(BODY_TOP+9.38,.34,.055,.055);
 return [
  {positions:new Float32Array(dome.positions),normals:new Float32Array(dome.normals),indices:new Uint32Array(dome.indices),color:ROOF_COLOR,faceRole:'roof'},
  {positions:new Float32Array(finial.positions),normals:new Float32Array(finial.normals),indices:new Uint32Array(finial.indices),color:FINIAL_COLOR,faceRole:'roof'}
 ];
}

function stopAtEave(batches:MeshBatch[]):MeshBatch[]{
 const kept:MeshBatch[]=[];
 for(const batch of batches){
  let min=Infinity,max=-Infinity;for(let i=1;i<batch.positions.length;i+=3){min=Math.min(min,batch.positions[i]);max=Math.max(max,batch.positions[i]);}
  if(min>=BODY_TOP-.01)continue;
  if(max<=BODY_TOP){kept.push(batch);continue;}
  const positions=new Float32Array(batch.positions);
  for(let i=1;i<positions.length;i+=3)positions[i]=Math.min(positions[i],BODY_TOP);
  kept.push({...batch,positions});
 }
 return kept;
}

/** Keep the exact OSM church/tower parts; replace overlapping old caps with one photo-matched crown. */
export function supplementSanktTheresiaDisplay(components:BuildingComponent[]):BuildingComponent[]{
 const relation=components.find(c=>c.city==='munich'&&c.objectId===TOWER_RELATION);
 const outerRing=relation?.componentGeometry.coordinates[0] as number[][]|undefined;
 if(!outerRing)return components;
 const crown=doubleOnion(components.find(c=>c.city==='munich'&&c.objectId===TOWER_WAY)??relation!,outerRing as Point[]);
 return components.map(c=>{
  if(c.city!=='munich'||(c.objectId!==TOWER_WAY&&c.objectId!==TOWER_RELATION))return c;
  const shaft=stopAtEave(c.batches);
  const batches=c.objectId===TOWER_WAY?[...shaft,...crown]:shaft;
  const addedVertices=c.objectId===TOWER_WAY?crown.reduce((n,b)=>n+b.positions.length/3,0):0;
  const addedTriangles=c.objectId===TOWER_WAY?crown.reduce((n,b)=>n+b.indices.length/3,0):0;
  return {...c,batches,displaySupplement:{id:'munich-sankt-theresia-double-onion-dome-cross',sourceObjectId:c.objectId,addedVertices,addedTriangles}};
 });
}
