import {progressiveAdmission,applyProgressiveFrames,isRejectedProgressivePaint} from './progressive-paint';
import {REICHSTAG_NATIVE_IDS,reichstagNativePaint} from './facade-reichstag-frame';
import {RESIDENZ_NATIVE_IDS,residenzNativePaint} from './facade-residenz-frame';
import {ELB_NATIVE_IDS,elbphilharmonieNativePaint,configureElbRoofPaint} from './facade-elbphilharmonie-frame';
import {MICHEL_NATIVE_IDS,michelNativePaint,configureMichelPaint} from './facade-michel-frame';
import {PETRI_NATIVE_IDS,petriNativePaint,configurePetriPaint} from './facade-petri-frame';
import {configureRathausRoofPaint} from './facade-rathaus-roof-paint';
import {FRAUEN_NATIVE_IDS,frauenNativePaint,RATHAUS_NATIVE_IDS,rathausNativePaint,rathausPaintReference,alignRathausWingPaint} from './facade-munich-frame';
import {isDescribedBuilding} from './facade-description-bindings';
import type {BuildingComponent} from './building-mesh-renderer';

/** Display templates. These choices do not change raw source architecture or measured geometry. */
const rathausHamburg = new Set(['142944431','255885434','255885435','284404494','284404495','255659998','284404483','284404484','284404485','284404486','284404487','284404488','284404490','284404492','284404493','284404496','284404497','284404498','284404499','284404500']);
export {PAINT_FAMILIES} from './facade-paint-families';
export function paintFamily(c:BuildingComponent):number {
 const progressive=progressiveAdmission(c);if(progressive)return progressive.preserveUnboundNeutral?0:-98;if(isRejectedProgressivePaint(c))return 0;
 if(!isDescribedBuilding(c))return 0;
 const p=c.sourceFeature.properties??{}, id=c.objectId.split('/').at(-1)!;
 if(c.city==='berlin'&&REICHSTAG_NATIVE_IDS.has(id))return 200;
 if(c.city==='munich'&&RESIDENZ_NATIVE_IDS.has(id))return 180;
 if(c.city==='munich'&&RATHAUS_NATIVE_IDS.has(id))return 120;
 if(c.city==='munich'&&FRAUEN_NATIVE_IDS.has(id))return 124;
 if(c.city==='hamburg'&&MICHEL_NATIVE_IDS.has(id))return 160;
 if(c.city==='hamburg'&&rathausHamburg.has(id))return 100;
 if(c.city==='hamburg'&&PETRI_NATIVE_IDS.has(id))return 150;
 if(c.city==='hamburg'&&c.objectId==='osm/relation/19883203')return 108;
 if(c.city==='hamburg'&&ELB_NATIVE_IDS.has(id))return 140;
 if(c.city==='munich'&&c.objectId==='osm/relation/147095')return -3;
 const architecture=String(p['building:architecture']??p['architectural_style']??p['architecture']??'').toLowerCase();
 const material=String(p['building:material']??'').toLowerCase(),kind=String(p.building??'');
 if(['roof','shed','carport','garage','garages'].includes(kind))return 0;
 if(/gothic|gotik/.test(architecture))return -3;
 if(/baroque|barock|rococo|rokoko/.test(architecture))return -4;
 if(/renaissance|classical|klassiz|roman|antique/.test(architecture))return -2;
 if(/timber|wood|fachwerk/.test(architecture+' '+material))return -5;
 if(material==='glass'||p['facade:material']==='glass')return 7;
 if(['industrial','warehouse','factory'].includes(kind))return -6;
 if(material==='brick')return -1;
 if(/stone|sandstone|limestone|granite/.test(material))return -2;
 if(kind==='church'||kind==='cathedral')return -3;
 return -9;
}

/** Read original surfaces to attach paint coordinates; never create, move, remove or retriangulate a vertex. */
export function facadePaintData(components:BuildingComponent[]):Float32Array<ArrayBuffer> {
 const vertices=components.reduce((n,c)=>n+c.batches.reduce((k,b)=>k+b.positions.length/3,0),0),out=new Float32Array(vertices*5);let at=0;
 configureElbRoofPaint(components);configurePetriPaint(components);configureMichelPaint(components);
 const rathausParent=components.find(c=>c.city==='munich'&&c.objectId==='osm/relation/147095');configureRathausRoofPaint(rathausParent);
 const rathausReference=rathausPaintReference(rathausParent);
 for(const c of components){
  const family=paintFamily(c);if(family===-98){for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3){out.set([0,0,0,0,-98],at);at+=5;}continue;}if(family===0){at+=c.batches.reduce((n,b)=>n+b.positions.length/3,0)*5;continue;}
  if(family===200){const paint=reichstagNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  if(family===180){const paint=residenzNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  if(family===140){const paint=elbphilharmonieNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  if(family===160){const paint=michelNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  if(family===150){const paint=petriNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  if(family===120){const paint=alignRathausWingPaint(c,rathausNativePaint(c),rathausReference);out.set(paint,at);at+=paint.length;continue;}
  if(family===124){const paint=frauenNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  const raw=c.sourceFeature.properties??{},clockOwner=c.city==='hamburg'&&c.objectId==='osm/way/255659998',sourceHeight=Number(raw.height),sourceRoofHeight=Number(raw['roof:height']),sourceMinHeight=Number(raw.min_height??0);
  // Native eaves bound the painted wall zone even when a vertical gable face narrows at its peak.
  const wallTop=family===100&&Number.isFinite(sourceHeight)&&Number.isFinite(sourceRoofHeight)&&sourceRoofHeight>0&&sourceHeight-sourceRoofHeight>sourceMinHeight?sourceHeight-sourceRoofHeight:undefined;
  const groups=new Map<string,{nx:number;nz:number;planeNx:number;planeNy:number;planeNz:number;distance:number;u0:number;u1:number;y0:number;y1:number;bottom0:number;bottom1:number;top0:number;top1:number;clockOnly:boolean}>();
  const exactPlanes=new Map<string,string>(),directionBuckets=new Map<string,string[]>(),normalTolerance=.008,planeTolerance=.25;
  const mappings=c.batches.map(b=>Array<string|undefined>(b.positions.length/3)),ambiguous=c.batches.map(()=>new Set<number>()),roofMarks=c.batches.map(b=>new Uint8Array(b.positions.length/3));
  const copperRoofPlanes=new Map<string,{nx:number;ny:number;nz:number;distance:number;ux:number;uz:number;vx:number;vy:number;vz:number;u0:number;u1:number;s0:number;s1:number}>(),copperRoofMappings=c.batches.map(b=>Array<string|undefined>(b.positions.length/3)),copperRoofAmbiguous=c.batches.map(()=>new Set<number>()),copperRoofExact=new Map<string,string>(),copperRoofDirections=new Map<string,string[]>();
  let roofTop=-Infinity,roofU0=Infinity,roofU1=-Infinity,roofV0=Infinity,roofV1=-Infinity,roofUX=.73,roofUZ=-.68,roofVX=-.68,roofVZ=-.73;
  // The Börse source object is a flat extrusion. Use only its original upward top faces for the three roof paint cues.
  if(family===108){
   c.batches.forEach(b=>{for(let i=0;i<b.indices.length;i+=3){const ids=[b.indices[i],b.indices[i+1],b.indices[i+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
    const ux=b.positions[j]-b.positions[a],uy=b.positions[j+1]-b.positions[a+1],uz=b.positions[j+2]-b.positions[a+2],vx=b.positions[k]-b.positions[a],vy=b.positions[k+1]-b.positions[a+1],vz=b.positions[k+2]-b.positions[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz);if(len<1e-7||Math.abs(ny/len)<.995)continue;
    roofTop=Math.max(roofTop,b.positions[a+1],b.positions[j+1],b.positions[k+1]);
   }});
   // Recover the Börse's dominant orthogonal axes from its original outer roof-ring edges.
   // Ignoring sub-3m ornamental steps keeps the painted halls aligned with the main native walls.
   const ringCount=c.componentGeometry.coordinates[0].length-1,roofBatch=c.batches.find(b=>b.positions.length>=ringCount*3&&Math.abs(b.positions[1]-roofTop)<.08&&b.normals[1]>.90);
   if(roofBatch){let cosine=0,sine=0;for(let i=0;i<ringCount;i++){const a=i*3,j=((i+1)%ringCount)*3,dx=roofBatch.positions[j]-roofBatch.positions[a],dz=roofBatch.positions[j+2]-roofBatch.positions[a+2],length=Math.hypot(dx,dz);if(length<3)continue;const angle=Math.atan2(dz,dx);cosine+=length*Math.cos(4*angle);sine+=length*Math.sin(4*angle);}
    if(Math.hypot(cosine,sine)>1e-7){const angle=Math.atan2(sine,cosine)/4;roofUX=Math.sin(angle);roofUZ=-Math.cos(angle);if(roofUX*.73-roofUZ*.68<0){roofUX=-roofUX;roofUZ=-roofUZ;}roofVX=roofUZ;roofVZ=-roofUX;}}
   if(Number.isFinite(roofTop))c.batches.forEach((b,bi)=>{for(let i=0;i<b.indices.length;i+=3){const ids=[b.indices[i],b.indices[i+1],b.indices[i+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
    const ux=b.positions[j]-b.positions[a],uy=b.positions[j+1]-b.positions[a+1],uz=b.positions[j+2]-b.positions[a+2],vx=b.positions[k]-b.positions[a],vy=b.positions[k+1]-b.positions[a+1],vz=b.positions[k+2]-b.positions[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz);if(len<1e-7||Math.abs(ny/len)<.995||ids.some(id=>Math.abs(b.positions[id*3+1]-roofTop)>.08))continue;
    for(const id of ids){roofMarks[bi][id]=1;const p=id*3,u=roofUX*b.positions[p]+roofUZ*b.positions[p+2],v=roofVX*b.positions[p]+roofVZ*b.positions[p+2];roofU0=Math.min(roofU0,u);roofU1=Math.max(roofU1,u);roofV0=Math.min(roofV0,v);roofV1=Math.max(roofV1,v);}
   }});
  }
  // Broad native copper roof planes receive painted dormers in their own slope coordinates.
  // Their mesh positions, triangle indices and roof silhouette remain unchanged.
  if(family===100&&!clockOwner&&raw.man_made!=='tower')c.batches.forEach((b,bi)=>{
   const copper=b.color[1]>b.color[0]*1.12&&b.color[1]>b.color[2]*1.06;
   if(!copper||b.faceRole==='wall')return;
   for(let i=0;i<b.indices.length;i+=3){
    const ids=[b.indices[i],b.indices[i+1],b.indices[i+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
    if(b.faceRole!=='roof'&&ids.some(id=>Math.abs(b.normals[id*3+1])<=.2))continue;
    const ax=b.positions[j]-b.positions[a],ay=b.positions[j+1]-b.positions[a+1],az=b.positions[j+2]-b.positions[a+2],bx0=b.positions[k]-b.positions[a],by=b.positions[k+1]-b.positions[a+1],bz0=b.positions[k+2]-b.positions[a+2];
    let nx=ay*bz0-az*by,ny=az*bx0-ax*bz0,nz=ax*by-ay*bx0;const len=Math.hypot(nx,ny,nz);if(len<1e-7)continue;nx/=len;ny/=len;nz/=len;
    if(nx*b.normals[a]+ny*b.normals[a+1]+nz*b.normals[a+2]<0){nx=-nx;ny=-ny;nz=-nz;}
    if(ny<=.15||ny>=.98)continue;
    const distance=nx*b.positions[a]+ny*b.positions[a+1]+nz*b.positions[a+2],exact=bi+'|'+Math.round(nx*10000)+','+Math.round(ny*10000)+','+Math.round(nz*10000)+','+Math.round(distance*20),bx=Math.round(nx/normalTolerance),bz=Math.round(nz/normalTolerance);
    let key=copperRoofExact.get(exact),g=key?copperRoofPlanes.get(key):undefined;
    if(!g){
     for(let dx=-1;dx<=1&&!g;dx++)for(let dz=-1;dz<=1&&!g;dz++)for(const candidate of copperRoofDirections.get(bi+'|'+(bx+dx)+','+(bz+dz))??[]){
      const plane=copperRoofPlanes.get(candidate)!;
      if(Math.hypot(nx-plane.nx,ny-plane.ny,nz-plane.nz)>normalTolerance||ids.some(id=>{const p=id*3;return Math.abs(plane.nx*b.positions[p]+plane.ny*b.positions[p+1]+plane.nz*b.positions[p+2]-plane.distance)>planeTolerance;}))continue;
      key=candidate;g=plane;break;
     }
     if(!g){key=String(copperRoofPlanes.size);const dl=Math.hypot(nx,nz);g={nx,ny,nz,distance,ux:-nz/dl,uz:nx/dl,vx:-ny*nx/dl,vy:dl,vz:-ny*nz/dl,u0:Infinity,u1:-Infinity,s0:Infinity,s1:-Infinity};copperRoofPlanes.set(key,g);const bucket=bi+'|'+bx+','+bz,list=copperRoofDirections.get(bucket)??[];list.push(key);copperRoofDirections.set(bucket,list);}
     copperRoofExact.set(exact,key!);
    }
    for(const id of ids){const p=id*3,u=g.ux*b.positions[p]+g.uz*b.positions[p+2],s=g.vx*b.positions[p]+g.vy*b.positions[p+1]+g.vz*b.positions[p+2];g.u0=Math.min(g.u0,u);g.u1=Math.max(g.u1,u);g.s0=Math.min(g.s0,s);g.s1=Math.max(g.s1,s);const old=copperRoofMappings[bi][id];if(old&&old!==key)copperRoofAmbiguous[bi].add(id);else copperRoofMappings[bi][id]=key;}
   }
  });
  // Original triangle planes provide stable wall directions despite quantized display normals.
  c.batches.forEach((b,bi)=>{for(let i=0;i<b.indices.length;i+=3){
   const ids=[b.indices[i],b.indices[i+1],b.indices[i+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
   const u=[b.positions[j]-b.positions[a],b.positions[j+1]-b.positions[a+1],b.positions[j+2]-b.positions[a+2]],v=[b.positions[k]-b.positions[a],b.positions[k+1]-b.positions[a+1],b.positions[k+2]-b.positions[a+2]];
   let nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0];const len=Math.hypot(nx,ny,nz);
   // Steep roofs can have near-horizontal normals. Only geometrically vertical faces receive windows.
   const slope=Math.abs(ny/len),stoneClockCandidate=clockOwner&&slope<=.15&&b.color[0]>.6&&b.color[1]>.55&&b.color[2]>.4&&Math.max(...b.color)/Math.max(.01,Math.min(...b.color))<1.45&&Math.max(b.positions[a+1],b.positions[j+1],b.positions[k+1])>48&&Math.min(b.positions[a+1],b.positions[j+1],b.positions[k+1])<70;
   if(len<1e-7||(slope>.001&&!stoneClockCandidate))continue;nx/=len;ny/=len;nz/=len;
   if(nx*b.normals[a]+nz*b.normals[a+2]<0){nx=-nx;ny=-ny;nz=-nz;}
   const distance=nx*b.positions[a]+ny*b.positions[a+1]+nz*b.positions[a+2],exactKey=Math.round(nx*10000)+','+Math.round(ny*10000)+','+Math.round(nz*10000)+','+Math.round(distance*20),bx=Math.round(nx/normalTolerance),bz=Math.round(nz/normalTolerance);
   let key=exactPlanes.get(exactKey),g=key?groups.get(key):undefined;
   if(!g){
    // Group cm-quantized triangles into one paint plane; original mesh arrays are read only.
    for(let dx=-1;dx<=1&&!g;dx++)for(let dz=-1;dz<=1&&!g;dz++)for(const candidate of directionBuckets.get((bx+dx)+','+(bz+dz))??[]){
     const plane=groups.get(candidate)!;
     if(Math.hypot(nx-plane.planeNx,nz-plane.planeNz)>normalTolerance||Math.abs(ny-plane.planeNy)>(stoneClockCandidate ? .008 : .002))continue;
     if(ids.some(id=>{const p=id*3;return Math.abs(plane.planeNx*b.positions[p]+plane.planeNy*b.positions[p+1]+plane.planeNz*b.positions[p+2]-plane.distance)>planeTolerance;}))continue;
     key=candidate;g=plane;break;
    }
    if(!g){key=String(groups.size);const dl=Math.hypot(nx,nz);g={nx:nx/dl,nz:nz/dl,planeNx:nx,planeNy:ny,planeNz:nz,distance,u0:Infinity,u1:-Infinity,y0:Infinity,y1:-Infinity,bottom0:Infinity,bottom1:-Infinity,top0:Infinity,top1:-Infinity,clockOnly:slope>.001};groups.set(key,g);const bucket=bx+','+bz,list=directionBuckets.get(bucket)??[];list.push(key);directionBuckets.set(bucket,list);}
    exactPlanes.set(exactKey,key!);
   }
   g.clockOnly||=slope>.001;
   for(const id of ids){const p=id*3,x=-g.nz*b.positions[p]+g.nx*b.positions[p+2],y=b.positions[p+1];g.u0=Math.min(g.u0,x);g.u1=Math.max(g.u1,x);
    if(y<g.y0-.02){g.y0=y;g.bottom0=x;g.bottom1=x;}else if(Math.abs(y-g.y0)<=.02){g.bottom0=Math.min(g.bottom0,x);g.bottom1=Math.max(g.bottom1,x);}
    if(y>g.y1+.02){g.y1=y;g.top0=x;g.top1=x;}else if(Math.abs(y-g.y1)<=.02){g.top0=Math.min(g.top0,x);g.top1=Math.max(g.top1,x);}
    const old=mappings[bi][id];if(old&&old!==key)ambiguous[bi].add(id);else mappings[bi][id]=key;}
  }});
  c.batches.forEach((b,bi)=>{for(let j=0;j<b.positions.length;j+=3){const id=j/3,key=mappings[bi][id],g=key?groups.get(key):undefined,taper=g&&(g.y1-g.y0)>1.5*(g.u1-g.u0)&&(g.top1-g.top0)<.55*Math.max(.1,g.bottom1-g.bottom0),clockOnly=clockOwner&&g&&g.y0<58&&g.y1>58&&(g.y1-g.y0)>48&&(g.u1-g.u0)>=5&&(g.u1-g.u0)<24&&b.color[0]>.6&&b.color[1]>.55&&b.color[2]>.4&&Math.max(...b.color)/Math.max(.01,Math.min(...b.color))<1.45,wallY1=g?Math.min(g.y1,wallTop??g.y1):0,wallHeight=g?wallY1-g.y0:0,valid=g&&(!taper||clockOnly||wallTop!==undefined)&&!ambiguous[bi].has(id)&&wallHeight>.4&&g.u1-g.u0>.6;
   const rooftop=family===108&&roofMarks[bi][id]===1&&b.normals[j+1]>.90&&roofU1-roofU0>.6&&roofV1-roofV0>.6;
   const copperKey=copperRoofMappings[bi][id],copperPlane=copperKey?copperRoofPlanes.get(copperKey):undefined,copperDirection=copperPlane?(copperPlane.nx*.68+copperPlane.nz*.73)/Math.hypot(copperPlane.nx,copperPlane.nz):0,copperAdmitted=copperPlane&&!copperRoofAmbiguous[bi].has(id)&&copperPlane.u1-copperPlane.u0>=25&&copperPlane.s1-copperPlane.s0>=5&&Math.abs(copperDirection)>.52;
   let profile=family;if(clockOnly)profile=107;else if(valid&&g){const H=wallHeight,W=g.u1-g.u0;if(family===100){if(H>48&&W>=5&&W<24)profile=103;else if(H>=12&&W>=20){const front=g.nx*.68+g.nz*.73;profile=front>.52?100:front<-.52?101:102;}else if(H>=12&&W>=6)profile=102;else profile=-2;}else if(family===104){if(H>1.8*W&&H>30&&W>=5)profile=105;else if(H>=12&&W>=14)profile=104;else profile=-1;}else if(family===108){if(W<4||H<3)profile=-2;else profile=(g.nx*(-.68)+g.nz*(-.73))>.52?108:109;}}
   if(rooftop)out.set([roofUX*b.positions[j]+roofUZ*b.positions[j+2]-roofU0,roofVX*b.positions[j]+roofVZ*b.positions[j+2]-roofV0,roofV1-roofV0,roofU1-roofU0,110],at);
   else if(copperAdmitted&&copperPlane)out.set([copperPlane.ux*b.positions[j]+copperPlane.uz*b.positions[j+2]-copperPlane.u0,copperPlane.vx*b.positions[j]+copperPlane.vy*b.positions[j+1]+copperPlane.vz*b.positions[j+2]-copperPlane.s0,copperPlane.s1-copperPlane.s0,copperPlane.u1-copperPlane.u0,copperDirection>.52?111:112],at);
   else out.set(valid?[-g!.nz*b.positions[j]+g!.nx*b.positions[j+2]-g!.u0,b.positions[j+1]-g!.y0,wallHeight,g!.u1-g!.u0,profile]:[b.positions[j],b.positions[j+1],0,0,Math.abs(b.normals[j+1])>.2?family:(family!==0?-99:0)],at);at+=5;
  }});
 }
 return applyProgressiveFrames(components,out);
}
