import type {BuildingComponent,MeshBatch} from './building-mesh-renderer';

type Point=[number,number];
type Vertex=[number,number,number];
type AxisFrame={cx:number;cz:number;ux:number;uz:number;vx:number;vz:number;u0:number;u1:number;v0:number;v1:number};
type Target={objectId:string;partId:string;id:string;roofRise:number;tower:'end'|'ridge'|'none'|'cone-roof'|'round-crossing'|'onion-bell';gableRole:'wall'|'roof';gableMaterialName?:string;towerHeightM?:number;lanternHeightM?:number;capHeightM?:number;towerUOffsetM?:number;towerVRatio?:number;towerWidthM?:number};
type SaddleRoofTarget={objectId:string;partId:string;id:string;orientationObjectId:string;orientationPartId:string;roofRise:number};
type SquareTowerTarget={objectId:string;partId:string;id:string;orientationObjectId:string;orientationPartId:string;shaftHeight:number;capRise:number};

const EARTH=40075016.686;
const TARGETS:readonly Target[]=[
  // Row 13: the exact church photo shows a broad green conical roof over the
  // rounded hall. A separately mapped bell-tower way shares exact outline
  // vertices with this church; its source polygon is overlaid below.
  {objectId:'osm/way/110682504',partId:'osm/way/110682504/component/98be7777d8ce4eaeaf7b',id:'munich-st-joachim-conical-hall-roof',roofRise:7.0,tower:'cone-roof',gableRole:'roof'},
  // Row 33: the exact target-specific photo and OSM tags support an ochre
  // church with a red gabled nave roof and a square bell tower.
  {objectId:'osm/way/150393341',partId:'osm/way/150393341/component/defa7885432898608fe8',id:'munich-wallfahrtskirche-st-anna-gable-and-bell-tower',roofRise:4.2,tower:'end',gableRole:'wall'},
  // Row 53: the exact component/photo support a steep gable and a small
  // ridge-top bell turret with dark louvered openings. The native source body
  // remains in the mesh.
  {objectId:'osm/way/25474858',partId:'osm/way/25474858/component/08579b3fc87e67c3d42d',id:'munich-st-heinrich-gable-and-bell-turret',roofRise:3.7,tower:'ridge',gableRole:'wall',gableMaterialName:'church-display-brick-gable'},
  // Row 38: the exact church hall is a flat native slab, but the source record
  // gives a 6 m gabled roof. The documented white bell tower is a separate
  // OSM way and is decorated by its own exact object ID below.
  {objectId:'osm/way/172199964',partId:'osm/way/172199964/component/8bb18f498b83796345bc',id:'munich-namen-jesu-gabled-roof',roofRise:6,tower:'none',gableRole:'wall'},
  // Row 64: the parish and city-history sources describe a round crossing
  // tower with a conical roof and a 46 m overall height. The target photo
  // shows its patinated lantern stage and dark pointed cap.
  {objectId:'osm/way/30419789',partId:'osm/way/30419789/component/fdf3d6b264fdb7f09300',id:'munich-st-rupert-central-crossing-tower',roofRise:4.0,tower:'round-crossing',gableRole:'roof',towerHeightM:46,lanternHeightM:9,capHeightM:14},
  // Row 108: the exact Commons photo shows the green polygonal bell stage,
  // clock and onion cap behind the north gable. The source footprint's north
  // gable spans local v≈2.6–13.9 m, so vRatio .66 centers the tower on it.
  // Attach the supplement to this exact church component, 8 m behind the gable.
  {objectId:'osm/way/84303369',partId:'osm/way/84303369/component/f3998890720600541bce',id:'munich-maria-heimsuchung-ridge-bell-tower',roofRise:0,tower:'onion-bell',gableRole:'wall',towerUOffsetM:8,towerVRatio:.66,towerWidthM:4.8},
];
const SQUARE_TOWER_TARGETS:readonly SquareTowerTarget[]=[
  // Row 22: the exact St. Gertrud photo shows a side tower reaching 40 m; this
  // separate OSM component is explicitly mapped to that church and sits at
  // the nave edge. Extend that component to the documented silhouette.
  {objectId:'osm/way/116783687',partId:'osm/way/116783687/component/7764bbfe6cc071ddd9ec',id:'munich-st-gertrud-side-tower',orientationObjectId:'osm/way/116783686',orientationPartId:'osm/way/116783686/component/58f2a281833d13b414c4',shaftHeight:20,capRise:7.5},
  // Row 82: the separate component assigned to St. Leonhard matches the
  // square tower visible beside the white gabled church in its exact photo.
  {objectId:'osm/way/219543999',partId:'osm/way/219543999/component/c72ca761632a2a855fe8',id:'munich-st-leonhard-bell-tower',orientationObjectId:'osm/way/40951695',orientationPartId:'osm/way/40951695/component/297de4746dd28a933c04',shaftHeight:17.5,capRise:5},
];
const SADDLE_ROOF_TARGETS:readonly SaddleRoofTarget[]=[
  // Row 114: this separately rendered 4.9 m square component lies within the
  // exact St. Martin church footprint; the matching exterior photo shows its
  // square bell tower, alternating red/ochre corner bands and steep saddle
  // roof. Align the ridge to the nave and keep all trim on this exact tower.
  {objectId:'osm/way/1033635375',partId:'osm/way/1033635375/component/7ac4e61a3e929da74dc7',id:'munich-st-martin-tower-saddle-roof',orientationObjectId:'osm/way/96955006',orientationPartId:'osm/way/96955006/component/7d93cb7a83f0d3b75848',roofRise:3.5},
];

function localPoint(c:BuildingComponent,p:Point):Point{
  const lat=c.origin[1]*Math.PI/180;
  const x=(p[0]-c.origin[0])*EARTH*Math.cos(lat)/360;
  const y=p[1]*Math.PI/180,y0=lat;
  // Native mesh X/Z coordinates use local ground metres. Convert Web Mercator
  // northing back to the same ground scale before placing display supplements.
  const z=(Math.log(Math.tan(Math.PI/4+y/2))-Math.log(Math.tan(Math.PI/4+y0/2)))*EARTH*Math.cos(lat)/(2*Math.PI);
  return [x,z];
}

function axisFrame(c:BuildingComponent,minLength=8,minWidth=5):AxisFrame|undefined{
  const ring=c.componentGeometry.coordinates[0]?.slice(0,-1).map(p=>localPoint(c,[p[0],p[1]]));
  if(!ring||ring.length<4)return undefined;
  const cx=ring.reduce((sum,p)=>sum+p[0],0)/ring.length,cz=ring.reduce((sum,p)=>sum+p[1],0)/ring.length;
  let xx=0,zz=0,xz=0;
  for(const p of ring){const x=p[0]-cx,z=p[1]-cz;xx+=x*x;zz+=z*z;xz+=x*z;}
  const angle=.5*Math.atan2(2*xz,xx-zz),ux=Math.cos(angle),uz=Math.sin(angle),vx=-uz,vz=ux;
  const uv=ring.map(p=>[(p[0]-cx)*ux+(p[1]-cz)*uz,(p[0]-cx)*vx+(p[1]-cz)*vz] as Point);
  const u0=Math.min(...uv.map(p=>p[0])),u1=Math.max(...uv.map(p=>p[0])),v0=Math.min(...uv.map(p=>p[1])),v1=Math.max(...uv.map(p=>p[1]));
  if(u1-u0<minLength||v1-v0<minWidth)return undefined;
  return {cx,cz,ux,uz,vx,vz,u0,u1,v0,v1};
}

function projectComponent(c:BuildingComponent,orientation:AxisFrame):AxisFrame|undefined{
  const ring=c.componentGeometry.coordinates[0]?.slice(0,-1).map(p=>localPoint(c,[p[0],p[1]]));
  if(!ring||ring.length<3)return undefined;
  const cx=ring.reduce((sum,p)=>sum+p[0],0)/ring.length,cz=ring.reduce((sum,p)=>sum+p[1],0)/ring.length;
  const uv=ring.map(p=>[(p[0]-cx)*orientation.ux+(p[1]-cz)*orientation.uz,(p[0]-cx)*orientation.vx+(p[1]-cz)*orientation.vz] as Point);
  const u0=Math.min(...uv.map(p=>p[0])),u1=Math.max(...uv.map(p=>p[0])),v0=Math.min(...uv.map(p=>p[1])),v1=Math.max(...uv.map(p=>p[1]));
  if(u1-u0<1||v1-v0<1)return undefined;
  return {cx,cz,ux:orientation.ux,uz:orientation.uz,vx:orientation.vx,vz:orientation.vz,u0,u1,v0,v1};
}

function projectComponentInHost(host:BuildingComponent,component:BuildingComponent,orientation:AxisFrame):AxisFrame|undefined{
  const ring=component.componentGeometry.coordinates[0]?.slice(0,-1).map(p=>localPoint(host,[p[0],p[1]]));
  if(!ring||ring.length<3)return undefined;
  const uv=ring.map(p=>[(p[0]-orientation.cx)*orientation.ux+(p[1]-orientation.cz)*orientation.uz,(p[0]-orientation.cx)*orientation.vx+(p[1]-orientation.cz)*orientation.vz] as Point);
  const u0=Math.min(...uv.map(p=>p[0])),u1=Math.max(...uv.map(p=>p[0])),v0=Math.min(...uv.map(p=>p[1])),v1=Math.max(...uv.map(p=>p[1]));
  if(u1-u0<.25||v1-v0<.25)return undefined;
  return {...orientation,u0,u1,v0,v1};
}

function verticalLevels(c:BuildingComponent):{base:number;eave:number;top:number}|undefined{
  let base=Infinity,top=-Infinity,eave=-Infinity;
  for(const b of c.batches){
    for(let i=1;i<b.positions.length;i+=3){
      const y=b.positions[i];base=Math.min(base,y);top=Math.max(top,y);
      const ny=b.normals[i];
      if(Number.isFinite(ny)&&Math.abs(ny)<.25)eave=Math.max(eave,y);
    }
  }
  if(!Number.isFinite(base)||!Number.isFinite(top)||top<=base)return undefined;
  if(!Number.isFinite(eave)||eave<=base)eave=base+(top-base)*.72;
  return {base,eave,top};
}

function pitchedRoofLevels(c:BuildingComponent):{eave:number;ridge:number}|undefined{
  let eave=Infinity,ridge=-Infinity;
  for(const b of c.batches){
    for(let tri=0;tri<b.indices.length;tri+=3){
      const ids=[b.indices[tri],b.indices[tri+1],b.indices[tri+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
      const ux=b.positions[j]-b.positions[a],uy=b.positions[j+1]-b.positions[a+1],uz=b.positions[j+2]-b.positions[a+2];
      const vx=b.positions[k]-b.positions[a],vy=b.positions[k+1]-b.positions[a+1],vz=b.positions[k+2]-b.positions[a+2];
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,length=Math.hypot(nx,ny,nz);
      if(length<1e-7||Math.abs(ny)/length<.2||Math.hypot(nx,nz)/length<.2)continue;
      for(const id of ids){const y=b.positions[id*3+1];eave=Math.min(eave,y);ridge=Math.max(ridge,y);}
    }
  }
  return Number.isFinite(eave)&&Number.isFinite(ridge)&&ridge>eave?{eave,ridge}:undefined;
}

function stJoachimBellTower(c:BuildingComponent,base:number):MeshBatch[]{
  // Exact outline of OSM way/549330493 (man_made=tower, tower:type=bell_tower,
  // height=30, roof:height=16, roof:shape=pyramidal). Every unique vertex is
  // shared with way/110682504, so the footprint does not rely on photo offsets.
  const sourceRing:Point[]=[
    [11.520854,48.0927301],
    [11.5208426,48.0927753],
    [11.5208389,48.0927899],
    [11.5209285,48.0928],
    [11.5209357,48.0927716],
    [11.5209436,48.0927401],
  ];
  const ring=sourceRing.map(p=>localPoint(c,p));
  if(ring.length<3)return [];
  let twiceArea=0,cx=0,cz=0;
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length];
    twiceArea+=a[0]*b[1]-b[0]*a[1];cx+=a[0];cz+=a[1];
  }
  if(Math.abs(twiceArea)<.01)return [];
  const winding=twiceArea>0?1:-1;
  cx/=ring.length;cz/=ring.length;
  const shaftTop=base+14,roofTop=base+30,wall=empty(),roof=empty();
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],edge=Math.hypot(dx,dz);
    if(edge<.05)continue;
    const outward:[number,number,number]=[winding*dz/edge,0,-winding*dx/edge];
    quad(wall,[a[0],base,a[1]],[b[0],base,b[1]],[b[0],shaftTop,b[1]],[a[0],shaftTop,a[1]],outward);
    const mx=(a[0]+b[0])/2-cx,mz=(a[1]+b[1])/2-cz;
    addTriangle(roof,[a[0],shaftTop,a[1]],[b[0],shaftTop,b[1]],[cx,roofTop,cz],[mx,Math.max(.1,roofTop-shaftTop),mz]);
  }
  return [finish(wall,'wall','church-display-wall'),finish(roof,'roof','church-display-roof')];
}

function empty(){return {positions:[] as number[],normals:[] as number[],indices:[] as number[]};}
function addTriangle(batch:{positions:number[];normals:number[];indices:number[]},a:Vertex,b:Vertex,c:Vertex,expected:Vertex):void{
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  let n:[number,number,number]=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
  const length=Math.hypot(...n);if(length<1e-7)return;n=n.map(v=>v/length) as [number,number,number];
  if(n[0]*expected[0]+n[1]*expected[1]+n[2]*expected[2]<0)n=n.map(v=>-v) as [number,number,number];
  const at=batch.positions.length/3;for(const p of [a,b,c]){batch.positions.push(...p);batch.normals.push(...n);}batch.indices.push(at,at+1,at+2);
}
function quad(batch:{positions:number[];normals:number[];indices:number[]},a:Vertex,b:Vertex,c:Vertex,d:Vertex,expected:Vertex):void{
  addTriangle(batch,a,b,c,expected);addTriangle(batch,a,c,d,expected);
}
function finish(batch:{positions:number[];normals:number[];indices:number[]},faceRole:'wall'|'roof',materialName:string):MeshBatch{
  return {positions:new Float32Array(batch.positions),normals:new Float32Array(batch.normals),indices:new Uint32Array(batch.indices),color:[1,1,1],faceRole,materialName};
}

function xyz(f:AxisFrame,u:number,v:number,y:number):Vertex{
  return [f.cx+u*f.ux+v*f.vx,y,f.cz+u*f.uz+v*f.vz];
}

function gabledNave(f:AxisFrame,u0:number,u1:number,eave:number,rise:number,faceRole:'wall'|'roof',gableStart=true,gableEnd=true,gableMaterialName='church-display-gable'):{batches:MeshBatch[];ridge:number}{
  const v0=f.v0,v1=f.v1,vc=(v0+v1)/2,ridge=eave+rise,roof=empty(),gable=empty();
  // Source-bound wall gables sit over the native shell's end walls. Offset
  // those triangles slightly outward so their supported color stays visible
  // instead of depth-fighting with the white native facade.
  const wallOffset=faceRole==='wall'?.08:0;
  quad(roof,xyz(f,u0,vc,ridge),xyz(f,u1,vc,ridge),xyz(f,u1,v0,eave),xyz(f,u0,v0,eave),[0,1,0]);
  quad(roof,xyz(f,u0,v1,eave),xyz(f,u1,v1,eave),xyz(f,u1,vc,ridge),xyz(f,u0,vc,ridge),[0,1,0]);
  if(gableStart)addTriangle(gable,xyz(f,u0-wallOffset,v0,eave),xyz(f,u0-wallOffset,v1,eave),xyz(f,u0-wallOffset,vc,ridge),[-f.ux,0,-f.uz]);
  if(gableEnd)addTriangle(gable,xyz(f,u1+wallOffset,v1,eave),xyz(f,u1+wallOffset,v0,eave),xyz(f,u1+wallOffset,vc,ridge),[f.ux,0,f.uz]);
  return {ridge,batches:[finish(roof,'roof','church-display-roof'),finish(gable,faceRole,gableMaterialName)]};
}

function squareTower(f:AxisFrame,u0:number,u1:number,vc:number,vWidth:number,y0:number,y1:number,capRise:number,capMaterial='church-display-cap'):MeshBatch[]{
  const uWidth=u1-u0,vu0=vc-vWidth/2,vu1=vc+vWidth/2,wall=empty(),cap=empty();
  quad(wall,xyz(f,u0,vu0,y0),xyz(f,u1,vu0,y0),xyz(f,u1,vu0,y1),xyz(f,u0,vu0,y1),[-f.vx,0,-f.vz]);
  quad(wall,xyz(f,u1,vu1,y0),xyz(f,u0,vu1,y0),xyz(f,u0,vu1,y1),xyz(f,u1,vu1,y1),[f.vx,0,f.vz]);
  quad(wall,xyz(f,u0,vu1,y0),xyz(f,u0,vu0,y0),xyz(f,u0,vu0,y1),xyz(f,u0,vu1,y1),[-f.ux,0,-f.uz]);
  quad(wall,xyz(f,u1,vu0,y0),xyz(f,u1,vu1,y0),xyz(f,u1,vu1,y1),xyz(f,u1,vu0,y1),[f.ux,0,f.uz]);
  const apex=xyz(f,(u0+u1)/2,vc,y1+capRise);
  addTriangle(cap,xyz(f,u0,vu0,y1),xyz(f,u1,vu0,y1),apex,[-f.vx,capRise/Math.max(.1,uWidth/2),-f.vz]);
  addTriangle(cap,xyz(f,u1,vu1,y1),xyz(f,u0,vu1,y1),apex,[f.vx,capRise/Math.max(.1,uWidth/2),f.vz]);
  addTriangle(cap,xyz(f,u0,vu1,y1),xyz(f,u0,vu0,y1),apex,[-f.ux,capRise/Math.max(.1,uWidth/2),-f.uz]);
  addTriangle(cap,xyz(f,u1,vu0,y1),xyz(f,u1,vu1,y1),apex,[f.ux,capRise/Math.max(.1,uWidth/2),f.uz]);
  return [finish(wall,'wall','church-display-wall'),finish(cap,'roof',capMaterial)];
}

function stLeonhardTowerDetails(f:AxisFrame,base:number,shaftHeight:number,capRise:number,width:number):MeshBatch[]{
  const face=empty(),rim=empty(),hands=empty(),cross=empty(),uc=(f.u0+f.u1)/2,vc=(f.v0+f.v1)/2;
  const radius=Math.min(.82,width*.18),clockY=base+shaftHeight*.82,offset=.075,segments=32;
  const sides:Array<{normal:Vertex;point:(t:number,y:number)=>Vertex}>=[
    {normal:[-f.vx,0,-f.vz],point:(t,y)=>xyz(f,uc+t,f.v0-offset,y)},
    {normal:[f.vx,0,f.vz],point:(t,y)=>xyz(f,uc+t,f.v1+offset,y)},
    {normal:[-f.ux,0,-f.uz],point:(t,y)=>xyz(f,f.u0-offset,vc+t,y)},
    {normal:[f.ux,0,f.uz],point:(t,y)=>xyz(f,f.u1+offset,vc+t,y)},
  ];
  for(const side of sides){
    const point=(r:number,a:number):Vertex=>side.point(Math.cos(a)*r,clockY+Math.sin(a)*r);
    for(let i=0;i<segments;i++){
      const a=2*Math.PI*i/segments,b=2*Math.PI*(i+1)/segments;
      addTriangle(face,side.point(0,clockY),point(radius,a),point(radius,b),side.normal);
      const outer=radius+.075,inner=radius+.015;
      quad(rim,point(outer,a),point(outer,b),point(inner,b),point(inner,a),side.normal);
    }
    const handWidth=.045;
    quad(hands,side.point(-handWidth/2,clockY),side.point(handWidth/2,clockY),side.point(handWidth/2,clockY+radius*.62),side.point(-handWidth/2,clockY+radius*.62),side.normal);
    const dx=radius*.48,dy=radius*.22,length=Math.hypot(dx,dy),px=-dy/length*handWidth/2,py=dx/length*handWidth/2;
    quad(hands,side.point(-px,clockY-py),side.point(px,clockY+py),side.point(dx+px,clockY+dy+py),side.point(dx-px,clockY+dy-py),side.normal);
  }
  const apex=base+shaftHeight+capRise;
  cuboid(cross,f,uc-.045,uc+.045,vc-.045,vc+.045,apex,apex+.9);
  cuboid(cross,f,uc-.04,uc+.04,vc-.34,vc+.34,apex+.58,apex+.67);
  return [finish(face,'wall','church-display-window'),finish(rim,'wall','church-display-clock'),finish(hands,'wall','church-display-clock'),finish(cross,'wall','church-display-finial')];
}

function stAnnaTowerDetails(f:AxisFrame,u0:number,u1:number,vc:number,width:number,base:number,top:number):MeshBatch[]{
  const trim=empty(),openings=empty(),half=width/2,strip=Math.min(.24,width*.08),offset=.035;
  const v0=vc-half,v1=vc+half;
  const addFaceStrip=(side:'front'|'back'|'left'|'right',along0:number,along1:number,y0:number,y1:number)=>{
    if(side==='front')quad(trim,xyz(f,along0,v0-offset,y0),xyz(f,along1,v0-offset,y0),xyz(f,along1,v0-offset,y1),xyz(f,along0,v0-offset,y1),[-f.vx,0,-f.vz]);
    if(side==='back')quad(trim,xyz(f,along1,v1+offset,y0),xyz(f,along0,v1+offset,y0),xyz(f,along0,v1+offset,y1),xyz(f,along1,v1+offset,y1),[f.vx,0,f.vz]);
    if(side==='left')quad(trim,xyz(f,u0-offset,along1,y0),xyz(f,u0-offset,along0,y0),xyz(f,u0-offset,along0,y1),xyz(f,u0-offset,along1,y1),[-f.ux,0,-f.uz]);
    if(side==='right')quad(trim,xyz(f,u1+offset,along0,y0),xyz(f,u1+offset,along1,y0),xyz(f,u1+offset,along1,y1),xyz(f,u1+offset,along0,y1),[f.ux,0,f.uz]);
  };
  for(const u of [u0,u1-strip]){
    addFaceStrip('front',u,u+strip,base+.12,top-.2);
    addFaceStrip('back',u,u+strip,base+.12,top-.2);
  }
  for(const v of [v0,v1-strip]){
    addFaceStrip('left',v,v+strip,base+.12,top-.2);
    addFaceStrip('right',v,v+strip,base+.12,top-.2);
  }
  const band=(y:number)=>{
    const t=Math.min(.16,(top-base)*.035),o=offset*1.5;
    quad(trim,xyz(f,u0,v0-o,y),xyz(f,u1,v0-o,y),xyz(f,u1,v0-o,y+t),xyz(f,u0,v0-o,y+t),[-f.vx,0,-f.vz]);
    quad(trim,xyz(f,u1,v1+o,y),xyz(f,u0,v1+o,y),xyz(f,u0,v1+o,y+t),xyz(f,u1,v1+o,y+t),[f.vx,0,f.vz]);
    quad(trim,xyz(f,u0-o,v1,y),xyz(f,u0-o,v0,y),xyz(f,u0-o,v0,y+t),xyz(f,u0-o,v1,y+t),[-f.ux,0,-f.uz]);
    quad(trim,xyz(f,u1+o,v0,y),xyz(f,u1+o,v1,y),xyz(f,u1+o,v1,y+t),xyz(f,u1+o,v0,y+t),[f.ux,0,f.uz]);
  };
  band(base+.28);band(top-.42);
  const slotWidth=Math.min(.72,width*.23),slotHeight=Math.min(1.0,(top-base)*.17),slotBase=top-slotHeight-.65;
  for(const v of [v0-offset*1.7,v1+offset*1.7]){
    quad(openings,xyz(f,(u0+u1-slotWidth)/2,v,slotBase),xyz(f,(u0+u1+slotWidth)/2,v,slotBase),xyz(f,(u0+u1+slotWidth)/2,v,slotBase+slotHeight),xyz(f,(u0+u1-slotWidth)/2,v,slotBase+slotHeight),v===v0-offset*1.7?[-f.vx,0,-f.vz]:[f.vx,0,f.vz]);
  }
  return [finish(trim,'wall','church-display-pale-trim'),finish(openings,'wall','church-display-window')];
}

function stAnnaNaveTrim(f:AxisFrame,base:number,eave:number):MeshBatch[]{
  const trim=empty(),offset=.035,width=Math.min(.34,(f.u1-f.u0)*.035),vWidth=Math.min(.34,(f.v1-f.v0)*.035);
  if(eave-base<2)return [];
  const addBand=(y:number)=>{
    const h=Math.min(.16,(eave-base)*.025),o=offset;
    quad(trim,xyz(f,f.u0,f.v0-o,y),xyz(f,f.u1,f.v0-o,y),xyz(f,f.u1,f.v0-o,y+h),xyz(f,f.u0,f.v0-o,y+h),[-f.vx,0,-f.vz]);
    quad(trim,xyz(f,f.u1,f.v1+o,y),xyz(f,f.u0,f.v1+o,y),xyz(f,f.u0,f.v1+o,y+h),xyz(f,f.u1,f.v1+o,y+h),[f.vx,0,f.vz]);
    quad(trim,xyz(f,f.u0-o,f.v1,y),xyz(f,f.u0-o,f.v0,y),xyz(f,f.u0-o,f.v0,y+h),xyz(f,f.u0-o,f.v1,y+h),[-f.ux,0,-f.uz]);
    quad(trim,xyz(f,f.u1+o,f.v0,y),xyz(f,f.u1+o,f.v1,y),xyz(f,f.u1+o,f.v1,y+h),xyz(f,f.u1+o,f.v0,y+h),[f.ux,0,f.uz]);
  };
  const addPilaster=(u:number,v:number,side:'front'|'back'|'left'|'right')=>{
    const y0=base+.16,y1=eave-.18;
    if(side==='front')quad(trim,xyz(f,u-width/2,v-offset,y0),xyz(f,u+width/2,v-offset,y0),xyz(f,u+width/2,v-offset,y1),xyz(f,u-width/2,v-offset,y1),[-f.vx,0,-f.vz]);
    if(side==='back')quad(trim,xyz(f,u+width/2,v+offset,y0),xyz(f,u-width/2,v+offset,y0),xyz(f,u-width/2,v+offset,y1),xyz(f,u+width/2,v+offset,y1),[f.vx,0,f.vz]);
    if(side==='left')quad(trim,xyz(f,u-offset,v+vWidth/2,y0),xyz(f,u-offset,v-vWidth/2,y0),xyz(f,u-offset,v-vWidth/2,y1),xyz(f,u-offset,v+vWidth/2,y1),[-f.ux,0,-f.uz]);
    if(side==='right')quad(trim,xyz(f,u+offset,v-vWidth/2,y0),xyz(f,u+offset,v+vWidth/2,y0),xyz(f,u+offset,v+vWidth/2,y1),xyz(f,u+offset,v-vWidth/2,y1),[f.ux,0,f.uz]);
  };
  addBand(base+.24);addBand(eave-.34);
  for(const u of [f.u0+width/2,f.u1-width/2]){addPilaster(u,f.v0,'front');addPilaster(u,f.v1,'back');}
  for(const v of [f.v0+vWidth/2,f.v1-vWidth/2]){addPilaster(f.u0,v,'left');addPilaster(f.u1,v,'right');}
  return [finish(trim,'wall','church-display-pale-trim')];
}

function stAnnaFacadeDetails(f:AxisFrame,base:number,eave:number):MeshBatch[]{
  const trim=empty(),openings=empty(),offset=.065,v=f.v0-offset,normal:[number,number,number]=[-f.vx,0,-f.vz];
  const length=f.u1-f.u0,height=eave-base;
  if(height<2.6||length<8)return [];
  const doorCenter=f.u0+length*.36,doorWidth=Math.min(1.55,length*.09),doorHeight=Math.min(2.35,height*.52),doorBase=base+.12;
  const doorLeft=doorCenter-doorWidth/2,doorRight=doorCenter+doorWidth/2,frame=.20;
  quad(openings,xyz(f,doorLeft,v,doorBase),xyz(f,doorRight,v,doorBase),xyz(f,doorRight,v,doorBase+doorHeight),xyz(f,doorLeft,v,doorBase+doorHeight),normal);
  // Pale stone surround follows the photographed white portal trim.
  quad(trim,xyz(f,doorLeft-frame,v-.015,doorBase),xyz(f,doorLeft,v-.015,doorBase),xyz(f,doorLeft,v-.015,doorBase+doorHeight+.12),xyz(f,doorLeft-frame,v-.015,doorBase+doorHeight+.12),normal);
  quad(trim,xyz(f,doorRight,v-.015,doorBase),xyz(f,doorRight+frame,v-.015,doorBase),xyz(f,doorRight+frame,v-.015,doorBase+doorHeight+.12),xyz(f,doorRight,v-.015,doorBase+doorHeight+.12),normal);
  quad(trim,xyz(f,doorLeft-frame,v-.015,doorBase+doorHeight),xyz(f,doorRight+frame,v-.015,doorBase+doorHeight),xyz(f,doorRight+frame,v-.015,doorBase+doorHeight+.15),xyz(f,doorLeft-frame,v-.015,doorBase+doorHeight+.15),normal);
  const radius=Math.min(.78,length*.043),centerU=f.u0+length*.70,centerY=base+height*.60,segments=20,inner=radius*.78;
  for(let i=0;i<segments;i++){
    const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;
    const outerA=xyz(f,centerU+Math.cos(a)*radius,v-.02,centerY+Math.sin(a)*radius),outerB=xyz(f,centerU+Math.cos(b)*radius,v-.02,centerY+Math.sin(b)*radius);
    const innerA=xyz(f,centerU+Math.cos(a)*inner,v-.02,centerY+Math.sin(a)*inner),innerB=xyz(f,centerU+Math.cos(b)*inner,v-.02,centerY+Math.sin(b)*inner);
    quad(trim,outerA,outerB,innerB,innerA,normal);
    addTriangle(openings,xyz(f,centerU,v-.01,centerY),xyz(f,centerU+Math.cos(a)*inner,v-.01,centerY+Math.sin(a)*inner),xyz(f,centerU+Math.cos(b)*inner,v-.01,centerY+Math.sin(b)*inner),normal);
  }
  return [finish(trim,'wall','church-display-pale-trim'),finish(openings,'wall','church-display-window')];
}

function namenJesuTowerDetails(f:AxisFrame,base:number,eave:number):MeshBatch[]{
  const width=Math.min(f.u1-f.u0,f.v1-f.v0),height=eave-base;
  if(width<2.4||height<8)return [];
  const windows=empty(),faces=empty(),rims=empty(),hands=empty(),offset=.055;
  const sides=[
    {point:(t:number,y:number)=>xyz(f,(f.u0+f.u1)/2+t,f.v0-offset,y),normal:[-f.vx,0,-f.vz] as Vertex,span:f.u1-f.u0},
    {point:(t:number,y:number)=>xyz(f,(f.u0+f.u1)/2+t,f.v1+offset,y),normal:[f.vx,0,f.vz] as Vertex,span:f.u1-f.u0},
    {point:(t:number,y:number)=>xyz(f,f.u0-offset,(f.v0+f.v1)/2+t,y),normal:[-f.ux,0,-f.uz] as Vertex,span:f.v1-f.v0},
    {point:(t:number,y:number)=>xyz(f,f.u1+offset,(f.v0+f.v1)/2+t,y),normal:[f.ux,0,f.uz] as Vertex,span:f.v1-f.v0},
  ];
  for(const side of sides){
    const windowWidth=Math.min(.42,side.span*.12),windowHeight=Math.min(1.15,height*.065);
    for(const fraction of [.34,.52]){
      const y0=base+height*fraction-windowHeight/2,y1=y0+windowHeight;
      quad(windows,side.point(-windowWidth/2,y0),side.point(windowWidth/2,y0),side.point(windowWidth/2,y1),side.point(-windowWidth/2,y1),side.normal);
    }
    const clockY=base+height*.78,radius=Math.min(.72,side.span*.17),segments=24,handThickness=.055;
    const clockPoint=(r:number,a:number)=>side.point(Math.cos(a)*r,clockY+Math.sin(a)*r);
    for(let i=0;i<segments;i++){
      const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
      addTriangle(faces,side.point(0,clockY),clockPoint(radius,a),clockPoint(radius,b),side.normal);
      const outer=radius+.075,inner=radius+.025;
      quad(rims,clockPoint(outer,a),clockPoint(outer,b),clockPoint(inner,b),clockPoint(inner,a),side.normal);
    }
    const hand=(t0:number,y0:number,t1:number,y1:number)=>quad(hands,side.point(t0,y0-handThickness/2),side.point(t1,y1-handThickness/2),side.point(t1,y1+handThickness/2),side.point(t0,y0+handThickness/2),side.normal);
    hand(0,clockY,0,clockY+radius*.54);hand(0,clockY,radius*.42,clockY+radius*.2);
  }
  return [finish(windows,'wall','church-display-window'),finish(faces,'wall','church-display-pale-trim'),finish(rims,'wall','church-display-clock'),finish(hands,'wall','church-display-clock')];
}

function namenJesuFacadeDetails(f:AxisFrame,base:number,eave:number):MeshBatch[]{
  const glass=empty(),mullions=empty(),door=empty(),trim=empty(),height=eave-base;
  if(height<3||f.u1-f.u0<12)return [];
  const offset=.09,bandBottom=base+height*.52,bandTop=base+height*.72;
  // The northwest reference photo verifies this clerestory only on the long
  // north facade; do not mirror its windows onto the unseen south wall.
  const sideV=f.v1+offset,normal:[number,number,number]=[f.vx,0,f.vz];
  quad(glass,xyz(f,f.u0+1.2,sideV,bandBottom),xyz(f,f.u1-1.2,sideV,bandBottom),xyz(f,f.u1-1.2,sideV,bandTop),xyz(f,f.u0+1.2,sideV,bandTop),normal);
  const gap=Math.max(1.25,Math.min(1.8,(f.u1-f.u0)/20));
  for(let u=f.u0+2;u<f.u1-1;u+=gap){
    const v=sideV+.025,x0=Math.max(f.u0+1.2,u-.035),x1=Math.min(f.u1-1.2,u+.035);
    if(x1>x0)quad(mullions,xyz(f,x0,v,bandBottom),xyz(f,x1,v,bandBottom),xyz(f,x1,v,bandTop),xyz(f,x0,v,bandTop),normal);
  }
  const centerU=f.u0+(f.u1-f.u0)*.53,halfDoor=Math.min(1.55,(f.u1-f.u0)*.055),doorBottom=base+.05,doorTop=base+Math.min(3.25,height*.6);
  const point=(u:number,y:number,extra=0)=>xyz(f,u,sideV+extra,y);
  quad(door,point(centerU-halfDoor,doorBottom),point(centerU+halfDoor,doorBottom),point(centerU+halfDoor,doorTop),point(centerU-halfDoor,doorTop),normal);
  const frame=.14;
  quad(trim,point(centerU-halfDoor-frame,doorBottom,.025),point(centerU-halfDoor,doorBottom,.025),point(centerU-halfDoor,doorTop,.025),point(centerU-halfDoor-frame,doorTop,.025),normal);
  quad(trim,point(centerU+halfDoor,doorBottom,.025),point(centerU+halfDoor+frame,doorBottom,.025),point(centerU+halfDoor+frame,doorTop,.025),point(centerU+halfDoor,doorTop,.025),normal);
  quad(trim,point(centerU-halfDoor-frame,doorTop,.025),point(centerU+halfDoor+frame,doorTop,.025),point(centerU+halfDoor+frame,doorTop+frame,.025),point(centerU-halfDoor-frame,doorTop+frame,.025),normal);
  return [finish(glass,'wall','church-display-window'),finish(mullions,'wall','church-display-pale-trim'),finish(door,'wall','church-display-door'),finish(trim,'wall','church-display-pale-trim')];
}

function stHeinrichGableDetails(host:BuildingComponent,f:AxisFrame,base:number,eave:number,ridge:number,canopy?:BuildingComponent):MeshBatch[]{
  const target=canopy?projectComponentInHost(host,canopy,f):undefined;
  if(!target)return [];
  const windows=empty(),cross=empty(),rose=empty(),roseTrim=empty(),width=f.v1-f.v0,vc=(f.v0+f.v1)/2,offset=.14;
  const end=Math.abs((target.u0+target.u1)/2-f.u0)<Math.abs((target.u0+target.u1)/2-f.u1)?f.u0:f.u1;
  const sign=end===f.u0?-1:1,normal:[number,number,number]=[sign*f.ux,0,sign*f.uz],faceU=end+sign*offset;
  const point=(v:number,y:number):Vertex=>xyz(f,faceU,v,y);
  const barW=Math.min(.22,width*.022),crossBottom=eave+.22,crossTop=eave+(ridge-eave)*.88,armY=eave+(ridge-eave)*.53,armHalf=Math.min(5.8,width*.29);
  quad(cross,point(-barW/2,crossBottom),point(barW/2,crossBottom),point(barW/2,crossTop),point(-barW/2,crossTop),normal);
  quad(cross,point(-armHalf,armY-barW/2),point(armHalf,armY-barW/2),point(armHalf,armY+barW/2),point(-armHalf,armY+barW/2),normal);

  // The photographed rose is set in the white wall just below the brick gable,
  // not high in the brick triangle. Keep its tracery on this exact entrance end.
  const roseRadius=Math.min(.68,width*.058),roseY=Math.max(base+2.2,eave-Math.min(1.05,(eave-base)*.16));
  const rosePoint=(v:number,y:number)=>xyz(f,faceU+sign*.025,v,y);
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12,b=(i+1)*Math.PI/12,inner=roseRadius*.78;
    addTriangle(rose,point(vc,roseY),point(vc+Math.cos(a)*roseRadius,roseY+Math.sin(a)*roseRadius),point(vc+Math.cos(b)*roseRadius,roseY+Math.sin(b)*roseRadius),normal);
    quad(roseTrim,rosePoint(vc+Math.cos(a)*roseRadius,roseY+Math.sin(a)*roseRadius),rosePoint(vc+Math.cos(b)*roseRadius,roseY+Math.sin(b)*roseRadius),rosePoint(vc+Math.cos(b)*inner,roseY+Math.sin(b)*inner),rosePoint(vc+Math.cos(a)*inner,roseY+Math.sin(a)*inner),normal);
  }
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,dx=Math.cos(a),dy=Math.sin(a),px=-dy,py=dx,r0=roseRadius*.13,r1=roseRadius*.77,half=roseRadius*.045;
    quad(roseTrim,rosePoint(vc+px*half+dx*r0,roseY+py*half+dy*r0),rosePoint(vc-px*half+dx*r0,roseY-py*half+dy*r0),rosePoint(vc-px*half+dx*r1,roseY-py*half+dy*r1),rosePoint(vc+px*half+dx*r1,roseY+py*half+dy*r1),normal);
  }
  const winW=Math.min(.9,width*.052),winH=Math.min(.82,(ridge-eave)*.18),winY=eave+(ridge-eave)*.2;
  for(const center of [vc-Math.min(2.0,width*.2),vc,vc+Math.min(2.0,width*.2)]){
    quad(windows,point(center-winW/2,winY),point(center+winW/2,winY),point(center+winW/2,winY+winH),point(center-winW/2,winY+winH),normal);
  }
  return [finish(cross,'wall','church-display-pale-trim'),finish(rose,'wall','church-display-window'),finish(roseTrim,'wall','church-display-pale-trim'),finish(windows,'wall','church-display-window')];
}

function stHeinrichEntrance(host:BuildingComponent,f:AxisFrame,base:number,eave:number,canopy?:BuildingComponent):MeshBatch[]{
  const target=canopy?projectComponentInHost(host,canopy,f):undefined;
  if(!target)return [];
  const door=empty(),trim=empty(),porchCenterV=(target.v0+target.v1)/2;
  const end=Math.abs((target.u0+target.u1)/2-f.u0)<Math.abs((target.u0+target.u1)/2-f.u1)?f.u0:f.u1,sign=end===f.u0?-1:1;
  const face=end+sign*.3,width=Math.min(1.8,(target.v1-target.v0)*.42),height=Math.min(2.55,(eave-base)*.38),bottom=base+.08;
  const point=(v:number,y:number,offset=0)=>xyz(f,face+sign*offset,v,y),normal:[number,number,number]=[sign*f.ux,0,sign*f.uz];
  quad(door,point(porchCenterV-width/2,bottom),point(porchCenterV+width/2,bottom),point(porchCenterV+width/2,bottom+height),point(porchCenterV-width/2,bottom+height),normal);
  const edge=.14,top=bottom+height;
  quad(trim,point(porchCenterV-width/2-edge,bottom,.025),point(porchCenterV-width/2,bottom,.025),point(porchCenterV-width/2,top+.08,.025),point(porchCenterV-width/2-edge,top+.08,.025),normal);
  quad(trim,point(porchCenterV+width/2,bottom,.025),point(porchCenterV+width/2+edge,bottom,.025),point(porchCenterV+width/2+edge,top+.08,.025),point(porchCenterV+width/2,top+.08,.025),normal);
  quad(trim,point(porchCenterV-width/2-edge,top,.025),point(porchCenterV+width/2+edge,top,.025),point(porchCenterV+width/2+edge,top+.14,.025),point(porchCenterV-width/2-edge,top+.14,.025),normal);
  const seam=.035;
  quad(trim,point(porchCenterV-seam/2,bottom+.22,.05),point(porchCenterV+seam/2,bottom+.22,.05),point(porchCenterV+seam/2,top-.08,.05),point(porchCenterV-seam/2,top-.08,.05),normal);
  return [finish(door,'wall','church-display-door'),finish(trim,'wall','church-display-pale-trim')];
}

function stHeinrichCanopy(host:BuildingComponent,orientation:AxisFrame,canopy:BuildingComponent,base:number):MeshBatch[]{
  const porch=projectComponentInHost(host,canopy,orientation);
  if(!porch)return [];
  const roof=empty(),wood=empty(),origin=localPoint(host,canopy.origin),eave=base+2.7,ridge=eave+.72,vc=(porch.v0+porch.v1)/2;
  const point=(u:number,v:number,y:number):Vertex=>{const p=xyz(orientation,u,v,y);return [p[0]-origin[0],p[1],p[2]-origin[1]];};
  const normalA:[number,number,number]=[-orientation.vx*.52,.85,-orientation.vz*.52],normalB:[number,number,number]=[orientation.vx*.52,.85,orientation.vz*.52];
  const u0=porch.u0+.12,u1=porch.u1-.12,v0=porch.v0+.1,v1=porch.v1-.1;
  quad(roof,point(u0,vc,ridge),point(u1,vc,ridge),point(u1,v0,eave),point(u0,v0,eave),normalA);
  quad(roof,point(u0,v1,eave),point(u1,v1,eave),point(u1,vc,ridge),point(u0,vc,ridge),normalB);
  // Dark fascia and the two slender outer posts match the small timber porch.
  const fascia=.16,attachedEnd=Math.abs((porch.u0+porch.u1)/2-orientation.u0)<Math.abs((porch.u0+porch.u1)/2-orientation.u1)?orientation.u0:orientation.u1;
  const outwardSign=attachedEnd===orientation.u0?-1:1,front=outwardSign>0?u1:u0;
  const frontNormal:Vertex=[outwardSign*orientation.ux,0,outwardSign*orientation.uz];
  quad(wood,point(front,v0,eave-fascia),point(front,v1,eave-fascia),point(front,v1,eave),point(front,v0,eave),frontNormal);
  const postU=front,postWidth=.3,postDepth=.28,baseY=base+.08,postTop=eave-.05;
  // A broad front lintel and two side rafters keep the open timber frame
  // legible below the dark roof when viewed from the entrance.
  const beam=.2,back=attachedEnd+(attachedEnd===orientation.u0?1:-1)*.18;
  quad(wood,point(front,v0,eave-beam),point(front,v1,eave-beam),point(front,v1,eave),point(front,v0,eave),frontNormal);
  for(const v of [v0+beam/2,v1-beam/2]){
    const sideNormal:[number,number,number]=[(v<(v0+v1)/2?-orientation.vx:orientation.vx),0,(v<(v0+v1)/2?-orientation.vz:orientation.vz)];
    quad(wood,point(back,v,eave-beam),point(front,v,eave-beam),point(front,v,eave),point(back,v,eave),sideNormal);
  }
  for(const v of [v0+postDepth/2,v1-postDepth/2]){
    const u0=postU-postWidth/2,u1=postU+postWidth/2,v0p=v-postDepth/2,v1p=v+postDepth/2;
    quad(wood,point(u0,v0p,baseY),point(u1,v0p,baseY),point(u1,v0p,postTop),point(u0,v0p,postTop),[-orientation.vx,0,-orientation.vz]);
    quad(wood,point(u1,v1p,baseY),point(u0,v1p,baseY),point(u0,v1p,postTop),point(u1,v1p,postTop),[orientation.vx,0,orientation.vz]);
    quad(wood,point(u0,v1p,baseY),point(u0,v0p,baseY),point(u0,v0p,postTop),point(u0,v1p,postTop),[-orientation.ux,0,-orientation.uz]);
    quad(wood,point(u1,v0p,baseY),point(u1,v1p,baseY),point(u1,v1p,postTop),point(u1,v0p,postTop),[orientation.ux,0,orientation.uz]);
  }
  return [finish(roof,'roof','church-display-canopy-roof'),finish(wood,'wall','church-display-canopy-wood')];
}

function stHeinrichIvy(host:BuildingComponent,f:AxisFrame,base:number,eave:number,canopy?:BuildingComponent):MeshBatch[]{
  const dark=empty(),light=empty(),porch=canopy?projectComponentInHost(host,canopy,f):undefined,height=eave-base;
  if(!porch||height<3)return [];
  const porchCenterU=(porch.u0+porch.u1)/2;
  const attachedEnd=Math.abs(porchCenterU-f.u0)<Math.abs(porchCenterU-f.u1)?f.u0:f.u1;
  const outwardSign=attachedEnd===f.u0?-1:1,front=outwardSign>0?porch.u1-.02:porch.u0+.02;
  // The reference shows two dense ivy columns wrapped around the timber
  // canopy's front posts. Anchor them to those exact post positions rather
  // than painting free-standing vines beside the doorway.
  const postV=[porch.v0+.24,porch.v1-.24],postU=front+outwardSign*.22;
  const start=base+.12,top=Math.min(eave-.2,base+2.48),step=.22,levels=Math.max(2,Math.floor((top-start)/step));
  const point=(v:number,y:number,du=0)=>xyz(f,postU+outwardSign*du,v,y);
  const normal:[number,number,number]=[outwardSign*f.ux,0,outwardSign*f.uz];
  for(let post=0;post<postV.length;post++){
    const root=postV[post];
    for(let i=0;i<levels;i++){
      const y=start+i*step,drift=Math.sin(i*1.11+post*.8)*.075,v=root+drift;
      // A dark central stem and overlapping leaf lobes give the plants enough
      // width to read around each narrow post at the review camera distance.
      quad(dark,point(v-.09,y),point(v+.09,y),point(v+.09,y+step),point(v-.09,y+step),normal);
      for(const side of [-1,1] as const){
        const span=.24+(i%3)*.045,tipY=step*(.25+(i%2)*.22),du=(i%2)*.04;
        addTriangle(dark,point(v,y+step*.18,du),point(v+side*span,y+tipY,du),point(v+side*(span+.18),y+tipY+.09,du),normal);
        addTriangle(light,point(v+side*.06,y+step*.48,du+.025),point(v+side*(span+.12),y+tipY+.1,du+.025),point(v+side*(span*.55),y+step*.92,du+.025),normal);
        addTriangle(dark,point(v,y+step*.68,du+.045),point(v-side*span*.7,y+step*.48,du+.045),point(v-side*(span+.12),y+step*.84,du+.045),normal);
      }
    }
  }
  return [finish(dark,'wall','church-display-ivy'),finish(light,'wall','church-display-ivy-light')];
}

function belfry(f:AxisFrame,uCenter:number,vc:number,ridge:number):MeshBatch[]{
  const size=Math.min(f.v1-f.v0,3.1),half=size/2,shaftTop=ridge+Math.min(2.35,Math.max(1.45,size*.72));
  const shaft=squareTower(f,uCenter-half/2,uCenter+half/2,vc,half,ridge-.15,shaftTop,Math.min(1.15,half*.75),'church-display-roof');
  const openings=empty(),louvers=empty(),windowHalf=half*.22,base=ridge+.32,spring=shaftTop-.52,offset=.025;
  const addOpening=(point:(side:number,y:number)=>Vertex,normal:Vertex)=>{
    quad(openings,point(-windowHalf,base),point(windowHalf,base),point(windowHalf,spring),point(-windowHalf,spring),normal);
    const arch:Array<Vertex>=[];
    for(let i=0;i<=8;i++){
      const a=Math.PI-i*Math.PI/8;
      arch.push(point(Math.cos(a)*windowHalf,spring+Math.sin(a)*windowHalf));
    }
    const center=point(0,spring);
    for(let i=0;i<arch.length-1;i++)addTriangle(openings,center,arch[i],arch[i+1],normal);
    for(const y of [base+(spring-base)*.3,base+(spring-base)*.62,base+(spring-base)*.88]){
      const thickness=.035,span=windowHalf*.78,louverOffset=.02;
      const louverPoint=(side:number,level:number):Vertex=>{
        const p=point(side,level);
        return [p[0]+normal[0]*louverOffset,p[1]+normal[1]*louverOffset,p[2]+normal[2]*louverOffset];
      };
      // Keep the slats just in front of the dark aperture surface to avoid z-fighting.
      quad(louvers,louverPoint(-span,y),louverPoint(span,y),louverPoint(span,y+thickness),louverPoint(-span,y+thickness),normal);
    }
  };
  const u0=uCenter-half/2,u1=uCenter+half/2,v0=vc-half/2,v1=vc+half/2;
  addOpening((s,y)=>xyz(f,uCenter+s,v0-offset,y),[-f.vx,0,-f.vz]);
  addOpening((s,y)=>xyz(f,uCenter+s,v1+offset,y),[f.vx,0,f.vz]);
  addOpening((s,y)=>xyz(f,u0-offset,vc+s,y),[-f.ux,0,-f.uz]);
  addOpening((s,y)=>xyz(f,u1+offset,vc+s,y),[f.ux,0,f.uz]);
  return [...shaft,finish(openings,'wall','church-display-window'),finish(louvers,'wall','church-display-louver')];
}

function coneRoof(f:AxisFrame,base:number,radius:number,rise:number,materialName='church-display-roof'):MeshBatch{
  return coneRoofAt(f,0,0,base,radius,rise,materialName);
}

function coneRoofAt(f:AxisFrame,uCenter:number,vCenter:number,base:number,radius:number,rise:number,materialName='church-display-roof'):MeshBatch{
  const sides=16,cap=empty();
  for(let i=0;i<sides;i++){
    const a=2*Math.PI*i/sides,b=2*Math.PI*(i+1)/sides;
    const p0:Point=[Math.cos(a)*radius,Math.sin(a)*radius],p1:Point=[Math.cos(b)*radius,Math.sin(b)*radius],mid=(a+b)/2;
    const radial:[number,number,number]=[Math.cos(mid)*f.ux+Math.sin(mid)*f.vx,rise/Math.max(.1,radius),Math.cos(mid)*f.uz+Math.sin(mid)*f.vz];
    addTriangle(cap,xyz(f,uCenter+p0[0],vCenter+p0[1],base),xyz(f,uCenter+p1[0],vCenter+p1[1],base),xyz(f,uCenter,vCenter,base+rise),radial);
  }
  return finish(cap,'roof',materialName);
}

function stRupertFourConicalRoofs(f:AxisFrame,base:number):MeshBatch[]{
  // The protected-building record and the 2017 roof-renewal account both
  // identify four tiled cones around the crossing. Place one on each lobe of
  // the exact church footprint; preserve the central tower as its own form.
  const length=f.u1-f.u0,width=f.v1-f.v0,uc=(f.u0+f.u1)/2,vc=(f.v0+f.v1)/2;
  const along=Math.min(length*.32,19.5),across=Math.min(width*.31,16.2),radius=Math.min(length*.075,width*.082,4.25),rise=Math.min(7.2,width*.14);
  const centers:[[number,number],[number,number],[number,number],[number,number]]=[
    [uc-along,vc],[uc+along,vc],[uc,vc-across],[uc,vc+across],
  ];
  return centers.map(([u,v])=>coneRoofAt(f,u,v,base,radius,rise,'church-display-rupert-tiles'));
}

function stMartinTowerBands(f:AxisFrame,base:number,top:number):MeshBatch[]{
  const ochre=empty(),red=empty(),belt=empty(),w=f.u1-f.u0,h=f.v1-f.v0;
  if(top<=base||w<1||h<1)return [];
  const bandDepth=Math.min(.42,w*.12,h*.12),offset=.025,step=Math.max(.52,Math.min(.78,(top-base)/14));
  const addCorner=(batch:{positions:number[];normals:number[];indices:number[]},y0:number,y1:number)=>{
    const u0=f.u0,u1=f.u1,v0=f.v0,v1=f.v1,d=bandDepth;
    quad(batch,xyz(f,u0-offset,v0,y0),xyz(f,u0-offset,v0+d,y0),xyz(f,u0-offset,v0+d,y1),xyz(f,u0-offset,v0,y1),[-f.ux,0,-f.uz]);
    quad(batch,xyz(f,u0-offset,v1-d,y0),xyz(f,u0-offset,v1,y0),xyz(f,u0-offset,v1,y1),xyz(f,u0-offset,v1-d,y1),[-f.ux,0,-f.uz]);
    quad(batch,xyz(f,u1+offset,v1,y0),xyz(f,u1+offset,v1-d,y0),xyz(f,u1+offset,v1-d,y1),xyz(f,u1+offset,v1,y1),[f.ux,0,f.uz]);
    quad(batch,xyz(f,u1+offset,v0+d,y0),xyz(f,u1+offset,v0,y0),xyz(f,u1+offset,v0,y1),xyz(f,u1+offset,v0+d,y1),[f.ux,0,f.uz]);
    quad(batch,xyz(f,u0,v0-offset,y0),xyz(f,u0+d,v0-offset,y0),xyz(f,u0+d,v0-offset,y1),xyz(f,u0,v0-offset,y1),[-f.vx,0,-f.vz]);
    quad(batch,xyz(f,u1-d,v0-offset,y0),xyz(f,u1,v0-offset,y0),xyz(f,u1,v0-offset,y1),xyz(f,u1-d,v0-offset,y1),[-f.vx,0,-f.vz]);
    quad(batch,xyz(f,u1,v1+offset,y0),xyz(f,u1-d,v1+offset,y0),xyz(f,u1-d,v1+offset,y1),xyz(f,u1,v1+offset,y1),[f.vx,0,f.vz]);
    quad(batch,xyz(f,u0+d,v1+offset,y0),xyz(f,u0,v1+offset,y0),xyz(f,u0,v1+offset,y1),xyz(f,u0+d,v1+offset,y1),[f.vx,0,f.vz]);
  };
  let index=0;
  for(let y=base+.12;y<top-.08;y+=step){
    const y1=Math.min(top-.04,y+Math.min(.48,step*.78));
    addCorner(index%2===0?red:ochre,y,y1);index++;
  }
  // The target photo also shows two continuous ochre belt courses between
  // the corner blocks. Keep them on the exact square tower component.
  for(const y of [base+(top-base)*.43,base+(top-base)*.87]){
    const thickness=Math.min(.16,(top-base)*.025),u0=f.u0-offset,u1=f.u1+offset,v0=f.v0-offset,v1=f.v1+offset;
    quad(belt,xyz(f,u0,v0,y),xyz(f,u1,v0,y),xyz(f,u1,v0,y+thickness),xyz(f,u0,v0,y+thickness),[-f.vx,0,-f.vz]);
    quad(belt,xyz(f,u1,v1,y),xyz(f,u0,v1,y),xyz(f,u0,v1,y+thickness),xyz(f,u1,v1,y+thickness),[f.vx,0,f.vz]);
    quad(belt,xyz(f,u0,v1,y),xyz(f,u0,v0,y),xyz(f,u0,v0,y+thickness),xyz(f,u0,v1,y+thickness),[-f.ux,0,-f.uz]);
    quad(belt,xyz(f,u1,v0,y),xyz(f,u1,v1,y),xyz(f,u1,v1,y+thickness),xyz(f,u1,v0,y+thickness),[f.ux,0,f.uz]);
  }
  return [finish(red,'wall','church-display-martin-red-band'),finish(ochre,'wall','church-display-martin-ochre-band'),finish(belt,'wall','church-display-martin-ochre-band')].filter(b=>b.indices.length>0);
}

function roundCrossingTower(f:AxisFrame,base:number,radius:number,totalHeight:number,lanternHeight:number,capHeight:number):MeshBatch[]{
  const sides=12,shaftTop=totalHeight-capHeight,lanternBase=shaftTop-lanternHeight,bandBase=lanternBase-Math.min(2.4,Math.max(1.5,lanternHeight*.25)),wall=empty(),stone=empty(),lantern=empty(),cap=empty(),windows=empty(),clockFaces=empty(),clockRims=empty(),clockHands=empty();
  if(shaftTop<=base||lanternBase<=base)return [];
  const ring:Point[] = Array.from({length:sides},(_,i)=>{
    const a=2*Math.PI*i/sides;
    return [Math.cos(a)*radius,Math.sin(a)*radius] as Point;
  });
  for(let i=0;i<sides;i++){
    const a=ring[i],b=ring[(i+1)%sides],mid=(i+.5)*2*Math.PI/sides;
    const radial:[number,number,number]=[Math.cos(mid)*f.ux+Math.sin(mid)*f.vx,0,Math.cos(mid)*f.uz+Math.sin(mid)*f.vz];
    const segmentLength=Math.hypot(b[0]-a[0],b[1]-a[1]),tu=(b[0]-a[0])/segmentLength,tv=(b[1]-a[1])/segmentLength;
    const cu=(a[0]+b[0])/2,cv=(a[1]+b[1])/2;
    const facePoint=(t:number,y:number):Vertex=>xyz(f,cu+tu*t+radial[0]*.045,cv+tv*t+radial[2]*.045,y);
    quad(wall,xyz(f,a[0],a[1],base),xyz(f,b[0],b[1],base),xyz(f,b[0],b[1],bandBase),xyz(f,a[0],a[1],bandBase),radial);
    quad(stone,xyz(f,a[0],a[1],bandBase),xyz(f,b[0],b[1],bandBase),xyz(f,b[0],b[1],lanternBase),xyz(f,a[0],a[1],lanternBase),radial);
    if(i%3===0){
      const clockY=bandBase+(lanternBase-bandBase)*.52,clockRadius=Math.min(1.35,segmentLength*.5),segments=24;
      const clock=(r:number,t:number)=>facePoint(Math.cos(t)*r,clockY+Math.sin(t)*r);
      for(let j=0;j<segments;j++){
        const a0=j*2*Math.PI/segments,a1=(j+1)*2*Math.PI/segments;
        addTriangle(clockFaces,facePoint(0,clockY),clock(clockRadius,a0),clock(clockRadius,a1),radial);
        const outer=clockRadius+.15,inner=clockRadius+.05;
        quad(clockRims,clock(outer,a0),clock(outer,a1),clock(inner,a1),clock(inner,a0),radial);
      }
      const handWidth=.075;
      quad(clockHands,facePoint(-handWidth/2,clockY),facePoint(handWidth/2,clockY),facePoint(handWidth/2,clockY+clockRadius*.56),facePoint(-handWidth/2,clockY+clockRadius*.56),radial);
      const dx=clockRadius*.4,dy=clockRadius*.2,inv=1/Math.hypot(dx,dy),px=-dy*inv*handWidth/2,py=dx*inv*handWidth/2;
      quad(clockHands,facePoint(-px,clockY-py),facePoint(px,clockY+py),facePoint(dx+px,clockY+dy+py),facePoint(dx-px,clockY+dy-py),radial);
    }
    quad(lantern,xyz(f,a[0],a[1],lanternBase),xyz(f,b[0],b[1],lanternBase),xyz(f,b[0],b[1],shaftTop),xyz(f,a[0],a[1],shaftTop),radial);
    addTriangle(cap,xyz(f,a[0],a[1],shaftTop),xyz(f,b[0],b[1],shaftTop),xyz(f,0,0,totalHeight),[radial[0],capHeight/Math.max(.1,radius),radial[2]]);
    // The target photo shows dark belfry openings in the upper lantern.
    if(i%3===0){
      const r=radius*1.003,w=radius*.17,center=Math.atan2((a[1]+b[1])/2,(a[0]+b[0])/2),cy=(lanternBase+shaftTop)/2,h=lanternHeight*.28;
      const point=(side:number,y:number):Vertex=>xyz(f,r*Math.cos(center)+side*(-Math.sin(center)),r*Math.sin(center)+side*Math.cos(center),y);
      quad(windows,point(-w,cy-h),point(w,cy-h),point(w,cy+h),point(-w,cy+h),radial);
    }
  }
  return [finish(wall,'wall','church-display-wall'),finish(stone,'wall','church-display-stone'),finish(lantern,'wall','church-display-copper-cap'),finish(cap,'roof','church-display-cap'),finish(windows,'wall','church-display-window'),finish(clockFaces,'wall','church-display-clock'),finish(clockRims,'wall','church-display-clock'),finish(clockHands,'wall','church-display-clock')].filter(b=>b.indices.length>0);
}

function cuboid(batch:{positions:number[];normals:number[];indices:number[]},f:AxisFrame,u0:number,u1:number,v0:number,v1:number,y0:number,y1:number):void{
  quad(batch,xyz(f,u0,v0,y0),xyz(f,u1,v0,y0),xyz(f,u1,v0,y1),xyz(f,u0,v0,y1),[-f.vx,0,-f.vz]);
  quad(batch,xyz(f,u1,v1,y0),xyz(f,u0,v1,y0),xyz(f,u0,v1,y1),xyz(f,u1,v1,y1),[f.vx,0,f.vz]);
  quad(batch,xyz(f,u0,v1,y0),xyz(f,u0,v0,y0),xyz(f,u0,v0,y1),xyz(f,u0,v1,y1),[-f.ux,0,-f.uz]);
  quad(batch,xyz(f,u1,v0,y0),xyz(f,u1,v1,y0),xyz(f,u1,v1,y1),xyz(f,u1,v0,y1),[f.ux,0,f.uz]);
  quad(batch,xyz(f,u0,v0,y1),xyz(f,u1,v0,y1),xyz(f,u1,v1,y1),xyz(f,u0,v1,y1),[0,1,0]);
  quad(batch,xyz(f,u0,v1,y0),xyz(f,u1,v1,y0),xyz(f,u1,v0,y0),xyz(f,u0,v0,y0),[0,-1,0]);
}

function polygonalOnionBellTower(f:AxisFrame,uCenter:number,vCenter:number,base:number,width:number):MeshBatch[]{
  const sides=8,step=2*Math.PI/sides,start=7*Math.PI/8,radius=width/2,shaftHeight=5.2,domeHeight=4.0,wall=empty(),copper=empty(),windows=empty(),clockFace=empty(),clockRim=empty(),clockHands=empty(),finial=empty();
  const angleAt=(i:number)=>start+i*step;
  const point=(i:number,r:number,y:number):Vertex=>{const a=angleAt(i);return xyz(f,uCenter+r*Math.cos(a),vCenter+r*Math.sin(a),y);};
  const ringSide=(batch:{positions:number[];normals:number[];indices:number[]},y0:number,r0:number,y1:number,r1:number)=>{
    for(let i=0;i<sides;i++){
      const a=angleAt(i+.5),normal:[number,number,number]=[Math.cos(a)*f.ux+Math.sin(a)*f.vx,0,Math.cos(a)*f.uz+Math.sin(a)*f.vz];
      quad(batch,point(i,r0,y0),point(i+1,r0,y0),point(i+1,r1,y1),point(i,r1,y1),normal);
    }
  };
  const shaftTop=base+shaftHeight,lowerTop=base+.45;
  ringSide(wall,base,radius,lowerTop,radius*.98);
  ringSide(copper,lowerTop,radius*.98,shaftTop,radius*.9);
  const faceApothem=radius*.9*Math.cos(Math.PI/sides);
  for(let i=0;i<sides;i+=2){
    const a=angleAt(i+.5),tu=-Math.sin(a),tv=Math.cos(a),cu=uCenter+Math.cos(a)*(faceApothem+.035),cv=vCenter+Math.sin(a)*(faceApothem+.035),half=.28,low=base+shaftHeight*.45,spring=base+shaftHeight*.76,archSegments=8;
    const normal:[number,number,number]=[Math.cos(a)*f.ux+Math.sin(a)*f.vx,0,Math.cos(a)*f.uz+Math.sin(a)*f.vz];
    const openingPoint=(t:number,y:number):Vertex=>xyz(f,cu+tu*t,cv+tv*t,y);
    quad(windows,openingPoint(-half,low),openingPoint(half,low),openingPoint(half,spring),openingPoint(-half,spring),normal);
    const archCenter=openingPoint(0,spring),arch:Array<Vertex>=[];
    for(let j=0;j<=archSegments;j++){
      const theta=Math.PI-j*Math.PI/archSegments;
      arch.push(openingPoint(half*Math.cos(theta),spring+half*Math.sin(theta)));
    }
    for(let j=0;j<arch.length-1;j++)addTriangle(windows,archCenter,arch[j],arch[j+1],normal);
  }
  // Dark clock face and a narrow brass rim on the north-facing octagonal side.
  const faceU=uCenter-radius*.9*Math.cos(Math.PI/sides)-.045,clockY=base+shaftHeight*.67,clockR=.37,segments=24;
  const clockPoint=(r:number,a:number):Vertex=>xyz(f,faceU,vCenter+Math.cos(a)*r,clockY+Math.sin(a)*r);
  for(let i=0;i<segments;i++){
    const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
    addTriangle(clockFace,xyz(f,faceU,vCenter,clockY),clockPoint(clockR,a),clockPoint(clockR,b),[-f.ux,0,-f.uz]);
    const outer=clockR+.065,inner=clockR+.015;
    quad(clockRim,clockPoint(outer,a),clockPoint(outer,b),clockPoint(inner,b),clockPoint(inner,a),[-f.ux,0,-f.uz]);
  }
  const hand=(v0:number,y0:number,v1:number,y1:number,thickness:number)=>quad(clockHands,xyz(f,faceU,v0, y0-thickness/2),xyz(f,faceU,v1,y1-thickness/2),xyz(f,faceU,v1,y1+thickness/2),xyz(f,faceU,v0,y0+thickness/2),[-f.ux,0,-f.uz]);
  hand(vCenter,clockY,vCenter,clockY+.21,.045);hand(vCenter,clockY,vCenter+.17,clockY+.10,.04);
  // A shallow onion profile keeps the copper cap distinct from the open bell stage.
  const domeBase=shaftTop,domeScale=domeHeight/3.15,domeProfile:[[number,number],[number,number]]|number[][]=[[0,radius*.66],[.42,radius*.9],[.95,radius*1.02],[1.45,radius*.92],[1.95,radius*.70],[2.42,radius*.47],[2.78,radius*.25],[3.05,radius*.09]];
  for(let i=0;i<domeProfile.length-1;i++){
    const [h0,r0]=domeProfile[i],[h1,r1]=domeProfile[i+1];ringSide(copper,domeBase+h0*domeScale,r0,domeBase+h1*domeScale,r1);
  }
  const domeTip=domeBase+domeHeight;
  for(let i=0;i<sides;i++){
    const a=angleAt(i+.5),normal:[number,number,number]=[Math.cos(a)*f.ux+.3*f.vx,.45,Math.cos(a)*f.uz+.3*f.vz];
    addTriangle(copper,point(i,domeProfile.at(-1)![1],domeTip-.1),point(i+1,domeProfile.at(-1)![1],domeTip-.1),xyz(f,uCenter,vCenter,domeTip),normal);
  }
  const finialBase=domeTip,rodTop=finialBase+.78;
  cuboid(finial,f,uCenter-.055,uCenter+.055,vCenter-.055,vCenter+.055,finialBase,rodTop);
  cuboid(finial,f,uCenter-.055,uCenter+.055,vCenter-.34,vCenter+.34,finialBase+.48,finialBase+.57);
  return [finish(wall,'wall','church-display-wall'),finish(copper,'wall','church-display-copper-cap'),finish(windows,'wall','church-display-window'),finish(clockFace,'wall','church-display-window'),finish(clockRim,'wall','church-display-clock'),finish(clockHands,'wall','church-display-clock'),finish(finial,'wall','church-display-finial')].filter(b=>b.indices.length>0);
}

/**
 * Add only source-supported roof/tower forms to exact, user-approved
 * Munich church components. This is display geometry; native OSM batches,
 * object IDs, part IDs, and footprints are retained unchanged.
 */
export function supplementMunichApprovedChurchDisplay(components:BuildingComponent[]):BuildingComponent[]{
  const sourceComponents=components.map(c=>{
    if(c.city!=='munich'||c.objectId!=='osm/way/362745315')return c;
    const host=components.find(part=>part.city==='munich'&&part.objectId==='osm/way/25474858'&&part.partId==='osm/way/25474858/component/08579b3fc87e67c3d42d');
    const frame=host?axisFrame(host):undefined,levels=host?verticalLevels(host):undefined;
    if(!host||!frame||!levels)return c;
    // OSM maps this exact entrance awning only as building=roof, without a
    // height. OSM2World's 7.5 m default turns it into a tall dark block; retain
    // its exact footprint and replace that display mesh with the photographed
    // low timber canopy and two slim supports.
    const batches=stHeinrichCanopy(host,frame,c,levels.base),addedVertices=batches.reduce((n,b)=>n+b.positions.length/3,0),addedTriangles=batches.reduce((n,b)=>n+b.indices.length/3,0);
    if(!batches.length)return c;
    return {...c,batches,displaySupplement:{id:'munich-st-heinrich-low-timber-entry-canopy',sourceObjectId:c.objectId,addedVertices,addedTriangles}};
  });
  const roofs=sourceComponents.map(c=>{
    if(c.city!=='munich')return c;
    const target=TARGETS.find(t=>t.objectId===c.objectId&&t.partId===c.partId);
    if(!target)return c;
    const frame=axisFrame(c),levels=verticalLevels(c);if(!frame||!levels)return c;
    const length=frame.u1-frame.u0,width=frame.v1-frame.v0,rise=Math.min(target.roofRise,width*.3);
    let additions:MeshBatch[]=[];
    if(target.tower==='cone-roof'){
      const radius=Math.min(length,width)*.38;
      additions.push(coneRoof(frame,levels.eave,radius,target.roofRise));
      if(target.objectId==='osm/way/110682504'&&target.partId==='osm/way/110682504/component/98be7777d8ce4eaeaf7b'){
        additions.push(...stJoachimBellTower(c,levels.base));
      }
    }else if(target.tower==='round-crossing'){
      const radius=Math.min(length,width)*.16;
      const shaftHeight=Math.min(8.0,Math.max(5.5,(levels.top-levels.base)*.6));
      const lanternHeight=target.lanternHeightM??0,capHeight=target.capHeightM??target.roofRise;
      const totalHeight=target.towerHeightM??levels.eave+shaftHeight+capHeight;
      // The native body has a higher, coarse roof shell that hid the four
      // documented tile cones when they were based at the wall eave. Raise
      // their bases to the native roof top while preserving the exact plan.
      additions.push(...stRupertFourConicalRoofs(frame,Math.max(levels.eave,levels.top-.25)),...roundCrossingTower(frame,levels.eave,radius,totalHeight,lanternHeight,capHeight));
    }else if(target.tower==='onion-bell'){
      const uCenter=frame.u0+(target.towerUOffsetM??8),vCenter=frame.v0+(frame.v1-frame.v0)*(target.towerVRatio??.66);
      additions.push(...polygonalOnionBellTower(frame,uCenter,vCenter,levels.top-.4,Math.min(target.towerWidthM??4.8,width*.22)));
    }else if(target.tower==='end'){
      const towerWidth=Math.min(width*.30,5.2),towerDepth=Math.min(length*.28,5.2),towerBase=frame.u0+.08;
      const roof=gabledNave(frame,towerBase+towerDepth-.08,frame.u1,levels.eave,rise,target.gableRole,false,true);
      const towerTop=roof.ridge+Math.min(6.2,Math.max(4.2,width*.28));
      additions.push(...roof.batches);
      // The tower uses the exact church footprint's principal axis and its
      // own OSM component binding; no neighboring tower or way is merged.
      const towerCenter=(frame.v0+frame.v1)/2;
      if(target.objectId==='osm/way/150393341')additions.push(...stAnnaNaveTrim(frame,levels.base,levels.eave),...stAnnaFacadeDetails(frame,levels.base,levels.eave));
      additions.push(...squareTower(frame,towerBase,towerBase+towerDepth,towerCenter,towerWidth,levels.eave,towerTop,Math.min(2.8,towerWidth*.52),'church-display-roof'));
      if(target.objectId==='osm/way/150393341')additions.push(...stAnnaTowerDetails(frame,towerBase,towerBase+towerDepth,towerCenter,towerWidth,levels.eave,towerTop));
    }else if(target.tower==='ridge'){
      const nativeRoof=target.objectId==='osm/way/25474858'?pitchedRoofLevels(c):undefined;
      const eave=nativeRoof?.eave??levels.eave,roofRise=nativeRoof?nativeRoof.ridge-nativeRoof.eave:rise;
      const roof=gabledNave(frame,frame.u0,frame.u1,eave,roofRise,target.gableRole,true,true,target.gableMaterialName);
      additions.push(...roof.batches);
      if(target.objectId==='osm/way/25474858'){
        const canopy=components.find(part=>part.city==='munich'&&part.objectId==='osm/way/362745315');
        additions.push(...stHeinrichGableDetails(c,frame,levels.base,eave,roof.ridge,canopy),...stHeinrichEntrance(c,frame,levels.base,eave,canopy),...stHeinrichIvy(c,frame,levels.base,eave,canopy));
      }
      additions.push(...belfry(frame,(frame.u0+frame.u1)/2,(frame.v0+frame.v1)/2,roof.ridge));
    }else{
      // Namen Jesu's native model is a flat roof slab. Place the supported
      // gable above that slab so the added pitched roof is actually visible.
      const roofEave=target.objectId==='osm/way/172199964'?Math.max(levels.eave,levels.top):levels.eave;
      const roof=gabledNave(frame,frame.u0,frame.u1,roofEave,rise,target.gableRole);
      additions.push(...roof.batches);
      if(target.objectId==='osm/way/172199964'){
        additions.push(...namenJesuFacadeDetails(frame,levels.base,levels.eave));
      }
    }
    const addedVertices=additions.reduce((n,b)=>n+b.positions.length/3,0),addedTriangles=additions.reduce((n,b)=>n+b.indices.length/3,0);
    return {...c,batches:[...c.batches,...additions],displaySupplement:{id:target.id,sourceObjectId:c.objectId,addedVertices,addedTriangles}};
  });
  const towerDetails=roofs.map(c=>{
    if(c.city!=='munich'||c.objectId!=='osm/way/319152770'||c.partId!=='osm/way/319152770/component/72531a43a1a3e9ac4624')return c;
    const frame=axisFrame(c,2.4,2.4),levels=verticalLevels(c);
    if(!frame||!levels)return c;
    const additions=namenJesuTowerDetails(frame,levels.base,levels.eave),addedVertices=additions.reduce((n,b)=>n+b.positions.length/3,0),addedTriangles=additions.reduce((n,b)=>n+b.indices.length/3,0);
    return {...c,batches:[...c.batches,...additions],displaySupplement:{id:'munich-namen-jesu-bell-tower-clock-and-windows',sourceObjectId:c.objectId,addedVertices,addedTriangles}};
  });
  const towers=towerDetails.map(c=>{
    if(c.city!=='munich')return c;
    const target=SQUARE_TOWER_TARGETS.find(t=>t.objectId===c.objectId&&t.partId===c.partId);
    if(!target)return c;
    const orientationComponent=components.find(part=>part.objectId===target.orientationObjectId&&part.partId===target.orientationPartId);
    if(!orientationComponent)return c;
    const orientation=axisFrame(orientationComponent),frame=orientation?projectComponent(c,orientation):undefined,levels=verticalLevels(c);
    if(!frame||!levels)return c;
    const width=Math.min(frame.u1-frame.u0,frame.v1-frame.v0),uc=(frame.u0+frame.u1)/2,vc=(frame.v0+frame.v1)/2;
    const tower=squareTower(frame,uc-width/2,uc+width/2,vc,width,levels.top,levels.top+target.shaftHeight,target.capRise,'church-display-roof');
    // The target St. Leonhard photo shows a clock face on the green-spired
    // square bell tower, topped by a metal cross. Add those details only to
    // the exact bound tower component; its colors use existing display swatches.
    const details=c.objectId==='osm/way/219543999'?stLeonhardTowerDetails(frame,levels.top,target.shaftHeight,target.capRise,width):[];
    const additions=[...tower,...details],addedVertices=additions.reduce((n,b)=>n+b.positions.length/3,0),addedTriangles=additions.reduce((n,b)=>n+b.indices.length/3,0);
    return {...c,batches:[...c.batches,...additions],displaySupplement:{id:target.id,sourceObjectId:c.objectId,addedVertices,addedTriangles}};
  });
  return towers.map(c=>{
    if(c.city!=='munich')return c;
    const target=SADDLE_ROOF_TARGETS.find(t=>t.objectId===c.objectId&&t.partId===c.partId);
    if(!target)return c;
    const orientationComponent=components.find(part=>part.objectId===target.orientationObjectId&&part.partId===target.orientationPartId);
    if(!orientationComponent)return c;
    const orientation=axisFrame(orientationComponent),frame=orientation?projectComponent(c,orientation):undefined,levels=verticalLevels(c);
    if(!frame||!levels)return c;
    const roofRise=Math.min(target.roofRise,(frame.v1-frame.v0)*.85);
    const roof=gabledNave(frame,frame.u0,frame.u1,levels.top,roofRise,'roof',false,false).batches[0];
    const batch={...roof,materialName:'church-display-terracotta-cap'},bands=stMartinTowerBands(frame,levels.base,levels.top);
    const additions=[batch,...bands],addedVertices=additions.reduce((n,b)=>n+b.positions.length/3,0),addedTriangles=additions.reduce((n,b)=>n+b.indices.length/3,0);
    return {...c,batches:[...c.batches,...additions],displaySupplement:{id:target.id,sourceObjectId:c.objectId,addedVertices,addedTriangles}};
  });
}
