import type {BuildingComponent,MeshBatch} from './building-mesh-renderer';

const TARGET='osm/way/31344062';
type Point=[number,number];
type Vertex=[number,number,number];
const EARTH=40075016.686;

function localPoint(c:BuildingComponent,p:Point):Point{
 const lat=c.origin[1]*Math.PI/180,x=(p[0]-c.origin[0])*EARTH*Math.cos(lat)/360,y=p[1]*Math.PI/180;
 return [x,(Math.log(Math.tan(Math.PI/4+y/2))-Math.log(Math.tan(Math.PI/4+lat/2)))*EARTH*Math.cos(lat)/(2*Math.PI)];
}
function topOf(c:BuildingComponent):number{
 let top=0;for(const b of c.batches)for(let i=1;i<b.positions.length;i+=3)top=Math.max(top,b.positions[i]);return top;
}
function triangle(batch:{positions:number[];normals:number[];indices:number[]},a:Vertex,b:Vertex,c:Vertex,expected:Vertex):void{
 const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
 let n:[number,number,number]=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];const length=Math.hypot(...n);if(length<1e-7)return;n=n.map(v=>v/length) as [number,number,number];
 if(n[0]*expected[0]+n[1]*expected[1]+n[2]*expected[2]<0)n=n.map(v=>-v) as [number,number,number];
 const at=batch.positions.length/3;for(const p of [a,b,c]){batch.positions.push(...p);batch.normals.push(...n);}batch.indices.push(at,at+1,at+2);
}
function quad(batch:{positions:number[];normals:number[];indices:number[]},a:Vertex,b:Vertex,c:Vertex,d:Vertex,expected:Vertex):void{
 triangle(batch,a,b,c,expected);triangle(batch,a,c,d,expected);
}
function finish(batch:{positions:number[];normals:number[];indices:number[]},materialName:string,faceRole:'wall'|'roof'):MeshBatch{
 return {positions:new Float32Array(batch.positions),normals:new Float32Array(batch.normals),indices:new Uint32Array(batch.indices),color:[1,1,1],faceRole,materialName};
}
function empty(){return {positions:[] as number[],normals:[] as number[],indices:[] as number[]};}

/** Display-only reconstruction of the paired tower front, basilica roofs and apses.
 * It is tied to the exact, source-verified church component; original OSM geometry remains intact.
 */
export function supplementNurembergStLudwigDisplay(components:BuildingComponent[]):BuildingComponent[]{
 return components.map(c=>{
  if(c.city!=='nuremberg'||c.objectId!==TARGET)return c;
  const source=c.componentGeometry.coordinates[0].slice(0,-1).map(p=>localPoint(c,[p[0],p[1]]));if(source.length<4)return c;
  let mx=0,mz=0;for(const p of source){mx+=p[0];mz+=p[1];}mx/=source.length;mz/=source.length;
  let xx=0,zz=0,xz=0;for(const p of source){const x=p[0]-mx,z=p[1]-mz;xx+=x*x;zz+=z*z;xz+=x*z;}
  const angle=.5*Math.atan2(2*xz,xx-zz),ux=Math.cos(angle),uz=Math.sin(angle),vx=-uz,vz=ux;
  const uv=source.map(p=>[(p[0]-mx)*ux+(p[1]-mz)*uz,(p[0]-mx)*vx+(p[1]-mz)*vz] as Point);
  const u0=Math.min(...uv.map(p=>p[0])),u1=Math.max(...uv.map(p=>p[0])),v0=Math.min(...uv.map(p=>p[1])),v1=Math.max(...uv.map(p=>p[1]));
  const length=u1-u0,width=v1-v0;if(length<60||width<18)return c;
  const base=topOf(c),vc=(v0+v1)/2,xyz=(u:number,v:number,y:number):Vertex=>[mx+u*ux+v*vx,y,mz+u*uz+v*vz];
  const walls=empty(),roof=empty(),towerHelms=empty(),dark=empty(),clock=empty(),stone=empty(),apse=empty();
  const roofEnd=u1-12,roofStart=u0+5,eave=base+7.8;
  const gabledBand=(vStart:number,vEnd:number,ridgeY:number):void=>{
   const centre=(vStart+vEnd)/2;
   for(const side of [-1,1]){
    const edge=side<0?vStart:vEnd;
    quad(roof,xyz(roofStart,centre,ridgeY),xyz(roofEnd,centre,ridgeY),xyz(roofEnd,edge,eave),xyz(roofStart,edge,eave),[0,1,0]);
   }
   triangle(walls,xyz(roofEnd,vStart,eave),xyz(roofEnd,vEnd,eave),xyz(roofEnd,centre,ridgeY),[ux,0,uz]);
   triangle(walls,xyz(roofStart,vEnd,eave),xyz(roofStart,vStart,eave),xyz(roofStart,centre,ridgeY),[-ux,0,-uz]);
  };
  // A high central nave roof with lower side-aisle roofs follows the basilica plan.
  const centralHalf=Math.min(width*.27,11.5),outerHalf=width*.46,aisleHalf=(outerHalf-centralHalf)/2;
  gabledBand(vc-centralHalf,vc+centralHalf,base+16.0);
  gabledBand(vc-outerHalf,vc-centralHalf,base+11.8);
  gabledBand(vc+centralHalf,vc+outerHalf,base+11.8);

  // The paired towers flank the documented west-front facade.
  const towerDepth=8.5,towerWidth=Math.min(7.2,width*.2),towerBottom=u1-towerDepth-.1,towerTop=base+31.0;
  const towerCenters=[vc-towerWidth*1.15,vc+towerWidth*1.15];
  const box=(uA:number,uB:number,vA:number,vB:number,y0:number,y1:number):void=>{
   quad(walls,xyz(uA,vA,y0),xyz(uB,vA,y0),xyz(uB,vA,y1),xyz(uA,vA,y1),[-vx,0,-vz]);
   quad(walls,xyz(uB,vB,y0),xyz(uA,vB,y0),xyz(uA,vB,y1),xyz(uB,vB,y1),[vx,0,vz]);
   quad(walls,xyz(uA,vB,y0),xyz(uA,vA,y0),xyz(uA,vA,y1),xyz(uA,vB,y1),[-ux,0,-uz]);
   quad(walls,xyz(uB,vA,y0),xyz(uB,vB,y0),xyz(uB,vB,y1),xyz(uB,vA,y1),[ux,0,uz]);
  };
  for(const centreV of towerCenters){
   const a=centreV-towerWidth/2,b=centreV+towerWidth/2,ua=towerBottom,ub=u1;
   box(ua,ub,a,b,base,towerTop);
   // Narrow belfry lancets on each visible face.
   const openingY0=towerTop-5.8,openingY1=towerTop-1.8,hw=.48,midU=(ua+ub)/2;
   quad(dark,xyz(midU-hw,a-.05,openingY0),xyz(midU+hw,a-.05,openingY0),xyz(midU+hw,a-.05,openingY1),xyz(midU-hw,a-.05,openingY1),[-vx,0,-vz]);
   quad(dark,xyz(midU+hw,b+.05,openingY0),xyz(midU-hw,b+.05,openingY0),xyz(midU-hw,b+.05,openingY1),xyz(midU+hw,b+.05,openingY1),[vx,0,vz]);
   quad(dark,xyz(ub+.05,centreV-hw,openingY0),xyz(ub+.05,centreV+hw,openingY0),xyz(ub+.05,centreV+hw,openingY1),xyz(ub+.05,centreV-hw,openingY1),[ux,0,uz]);
   // The museum facade image shows a clock only on the viewer-right tower.
   if(centreV===towerCenters[0]){
    const faceU=ub+.08,clockU=ub+.11,handU=ub+.14,cy=towerTop-8.1,outerR=1.18,innerR=1.04,parts=24;
    for(let i=0;i<parts;i++){
     const q0=2*Math.PI*i/parts,q1=2*Math.PI*(i+1)/parts;
     triangle(stone,xyz(faceU,centreV,cy),xyz(faceU,centreV+Math.cos(q0)*outerR,cy+Math.sin(q0)*outerR),xyz(faceU,centreV+Math.cos(q1)*outerR,cy+Math.sin(q1)*outerR),[ux,0,uz]);
     triangle(clock,xyz(clockU,centreV+Math.cos(q0)*outerR,cy+Math.sin(q0)*outerR),xyz(clockU,centreV+Math.cos(q1)*outerR,cy+Math.sin(q1)*outerR),xyz(clockU,centreV+Math.cos(q1)*innerR,cy+Math.sin(q1)*innerR),[ux,0,uz]);
     triangle(clock,xyz(clockU,centreV+Math.cos(q0)*outerR,cy+Math.sin(q0)*outerR),xyz(clockU,centreV+Math.cos(q1)*innerR,cy+Math.sin(q1)*innerR),xyz(clockU,centreV+Math.cos(q0)*innerR,cy+Math.sin(q0)*innerR),[ux,0,uz]);
    }
    const hand=(dv:number,dy:number,halfWidth:number):void=>{
     const length=Math.hypot(dv,dy),pv=-dy/length*halfWidth,py=dv/length*halfWidth;
     quad(dark,xyz(handU,centreV+pv,cy+py),xyz(handU,centreV+dv+pv,cy+dy+py),xyz(handU,centreV+dv-pv,cy+dy-py),xyz(handU,centreV-pv,cy-py),[ux,0,uz]);
    };
    hand(0,.72,.045);
    hand(-.48,.43,.065);
    const hubR=.11;
    for(let i=0;i<parts;i++){
     const q0=2*Math.PI*i/parts,q1=2*Math.PI*(i+1)/parts;
     triangle(dark,xyz(handU+.01,centreV,cy),xyz(handU+.01,centreV+Math.cos(q0)*hubR,cy+Math.sin(q0)*hubR),xyz(handU+.01,centreV+Math.cos(q1)*hubR,cy+Math.sin(q1)*hubR),[ux,0,uz]);
    }
   }
   // Low four-pitch slate cap with a small flat crown, matching the official facade view.
   const insetU=2.0,insetV=Math.min(1.55,towerWidth*.3),capRise=1.8,topY=towerTop+capRise;
   const uTop0=ua+insetU,uTop1=ub-insetU,vTop0=a+insetV,vTop1=b-insetV;
   quad(towerHelms,xyz(ua,a,towerTop),xyz(ub,a,towerTop),xyz(uTop1,vTop0,topY),xyz(uTop0,vTop0,topY),[0,1,0]);
   quad(towerHelms,xyz(ub,b,towerTop),xyz(ua,b,towerTop),xyz(uTop0,vTop1,topY),xyz(uTop1,vTop1,topY),[0,1,0]);
   quad(towerHelms,xyz(ua,b,towerTop),xyz(ua,a,towerTop),xyz(uTop0,vTop0,topY),xyz(uTop0,vTop1,topY),[0,1,0]);
   quad(towerHelms,xyz(ub,a,towerTop),xyz(ub,b,towerTop),xyz(uTop1,vTop1,topY),xyz(uTop1,vTop0,topY),[0,1,0]);
   quad(towerHelms,xyz(uTop0,vTop0,topY),xyz(uTop1,vTop0,topY),xyz(uTop1,vTop1,topY),xyz(uTop0,vTop1,topY),[0,1,0]);
  }
  // Continuous brick gable fills the documented space between the tower fronts.
  const facadeU=u1+.02,facadeV0=towerCenters[0]+towerWidth/2,facadeV1=towerCenters[1]-towerWidth/2,facadeEave=eave,facadeRidge=base+16.0;
  quad(walls,xyz(facadeU,facadeV0,0),xyz(facadeU,facadeV1,0),xyz(facadeU,facadeV1,facadeEave),xyz(facadeU,facadeV0,facadeEave),[ux,0,uz]);
  triangle(walls,xyz(facadeU,facadeV0,facadeEave),xyz(facadeU,facadeV1,facadeEave),xyz(facadeU,vc,facadeRidge),[ux,0,uz]);

  // The west-front arched doorway and circular cross relief are surface details.
  const portalU=u1+.05,portalHalf=1.8,portalBase=0,portalTop=portalBase+7.5;
  const portal:[number,number][]=[[-portalHalf,portalBase],[portalHalf,portalBase],[portalHalf,portalTop-1],[portalHalf*.78,portalTop],[0,portalTop+1.5],[-portalHalf*.78,portalTop],[-portalHalf,portalTop-1]];
  for(let i=1;i<portal.length-1;i++)triangle(dark,xyz(portalU,vc+portal[0][0],portal[0][1]),xyz(portalU,vc+portal[i][0],portal[i][1]),xyz(portalU,vc+portal[i+1][0],portal[i+1][1]),[ux,0,uz]);
  const reliefU=portalU+.03,reliefY=base+9.5,reliefR=3.1,reliefParts=24,reliefCentre=xyz(reliefU,vc,reliefY),reliefRing:Vertex[]=[];
  for(let i=0;i<=reliefParts;i++){const q=2*Math.PI*i/reliefParts;reliefRing.push(xyz(reliefU,vc+Math.cos(q)*reliefR,reliefY+Math.sin(q)*reliefR));}
  for(let i=0;i<reliefParts;i++)triangle(stone,reliefCentre,reliefRing[i],reliefRing[i+1],[ux,0,uz]);
  const innerR=2.35,inner:Vertex[]=[];for(let i=0;i<=reliefParts;i++){const q=2*Math.PI*i/reliefParts;inner.push(xyz(reliefU+.03,vc+Math.cos(q)*innerR,reliefY+Math.sin(q)*innerR));}
  for(let i=0;i<reliefParts;i++)triangle(walls,xyz(reliefU+.03,vc,reliefY),inner[i],inner[i+1],[ux,0,uz]);
  const crossU=reliefU+.06,crossHalfW=.30,crossHalfH=1.55,armHalfW=1.15,armHalfH=.30;
  quad(stone,xyz(crossU,vc-crossHalfW,reliefY-crossHalfH),xyz(crossU,vc+crossHalfW,reliefY-crossHalfH),xyz(crossU,vc+crossHalfW,reliefY+crossHalfH),xyz(crossU,vc-crossHalfW,reliefY+crossHalfH),[ux,0,uz]);
  quad(stone,xyz(crossU,vc-armHalfW,reliefY-armHalfH),xyz(crossU,vc+armHalfW,reliefY-armHalfH),xyz(crossU,vc+armHalfW,reliefY+armHalfH),xyz(crossU,vc-armHalfW,reliefY+armHalfH),[ux,0,uz]);

  // Repeated round-headed nave windows; they sit on the brick side walls and read as openings.
  const windowStart=roofStart+8,windowEnd=roofEnd-10,count=7;
  for(const side of [-1,1])for(let i=0;i<count;i++){
   const u=windowStart+(windowEnd-windowStart)*i/(count-1),v=vc+side*(centralHalf+aisleHalf*1.7),halfW=.82,y0=base+1.8,y1=base+6.7,offset=side*.06;
   const lower0=xyz(u-halfW,v+offset,y0),lower1=xyz(u+halfW,v+offset,y0),upper1=xyz(u+halfW,v+offset,y1),upper0=xyz(u-halfW,v+offset,y1);
   const nx=side*vx,nz=side*vz;quad(dark,lower0,lower1,upper1,upper0,[nx,0,nz]);
   triangle(dark,xyz(u+halfW,v+offset,y1),xyz(u-halfW,v+offset,y1),xyz(u,v+offset,y1+1.25),[nx,0,nz]);
  }
  // Three restrained curved apses at the opposite end, matching the documented basilica plan.
  const apseCenters=[vc-7.2,vc,vc+7.2],apseR=3.5,apseFront=u0+4.0,apseHeight=base+9.2,arcSegments=10;
  for(let a=0;a<apseCenters.length;a++){
   const r=a===1?apseR:apseR*.78,centerV=apseCenters[a];
   for(let i=0;i<arcSegments;i++){
    const t0=-Math.PI/2+Math.PI*i/arcSegments,t1=-Math.PI/2+Math.PI*(i+1)/arcSegments;
    const p=(t:number,y:number):Vertex=>xyz(apseFront-r*Math.cos(t),centerV+r*Math.sin(t),y);
    quad(apse,p(t0,base),p(t1,base),p(t1,apseHeight),p(t0,apseHeight),[-Math.cos((t0+t1)/2)*ux+Math.sin((t0+t1)/2)*vx,0,-Math.cos((t0+t1)/2)*uz+Math.sin((t0+t1)/2)*vz]);
   }
  }

  const additions=[finish(walls,'church-display-wall','wall'),finish(apse,'church-display-wall','wall'),finish(roof,'church-display-roof','roof'),finish(towerHelms,'church-display-roof','roof'),finish(dark,'church-display-window','wall'),finish(clock,'church-display-clock','wall'),finish(stone,'church-display-stone','wall')].filter(b=>b.indices.length>0);
  const addedVertices=additions.reduce((n,b)=>n+b.positions.length/3,0),addedTriangles=additions.reduce((n,b)=>n+b.indices.length/3,0);
  return {...c,batches:[...c.batches,...additions],displaySupplement:{id:'nuremberg-st-ludwig-paired-towers-basilica-roofs-apses',sourceObjectId:c.objectId,addedVertices,addedTriangles}};
 });
}
