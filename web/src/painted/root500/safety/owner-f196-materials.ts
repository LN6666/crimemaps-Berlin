import type {BuildingComponent} from './building-mesh-renderer';
import {nativePaintSignature} from './progressive-native-signature';
// Source and actual visible building part share the exact origin and footprint X/Z.
// The part starts at absolute height 6m; never renormalize its Y to ground zero.
const origin=[9.1775675,48.778314];
const groups=[{"face":0,"edges":[0,1,2],"axis":[-0.5185384750366211,-0.8550543189048767],"lo":-14.597766665562744,"width":29.230887279353738},{"face":1,"edges":[3],"axis":[-0.8556789755821228,0.517507016658783],"lo":-14.659002900888254,"width":29.319408531495867},{"face":2,"edges":[4,5],"axis":[0.5180007815361023,0.855380117893219],"lo":-14.610617185729723,"width":29.23452932716458},{"face":3,"edges":[6],"axis":[0.855614960193634,-0.5176127552986145],"lo":-14.657195509333405,"width":29.313417607218014}];
export function ownerF196Materials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 let offset=0;
 for(const c of components){
  const exactSource=c.objectId==='osm/way/248949535'&&c.partId==='osm/way/248949535/component/9555da8b4efd106da280';
  const exactBody=c.objectId==='osm/way/9414302'&&c.partId==='osm/way/9414302/component/9555da8b4efd106da280';
  const expected=exactSource?'bab8c27c':exactBody?'cb3c70fc':'';
  const exactBase=c.objectId==='osm/way/248949536'&&c.partId==='osm/way/248949536/component/e297e1680e0c8d3b1308';
  const eligibleBase=c.city==='stuttgart'&&exactBase&&c.origin[0]===9.1775544&&c.origin[1]===48.77832705&&nativePaintSignature(c)==='6439da31';
  const eligible=c.city==='stuttgart'&&!!expected&&c.origin[0]===origin[0]&&c.origin[1]===origin[1]&&nativePaintSignature(c)===expected;
  for(const [bi,b]of c.batches.entries()){
   const count=b.positions.length/3;
   if(eligibleBase){
    if((bi===0&&count!==4)||(bi===1&&count!==16)||bi>1)throw Error('F196 entrance part changed');
    const dx=(c.origin[0]-origin[0])*111319.49079327358*Math.cos(origin[1]*Math.PI/180),dz=(c.origin[1]-origin[1])*111319.49079327358;
    for(let j=0;j<count;j++){
     paint.set(bi===0?[.54,.53,.48,2]:[.69,.64,.51,2],(offset+j)*4);
     if(bi===0){frames.set([0,0,0,0,0],(offset+j)*5);continue;}
     const nx=b.normals[j*3],nz=b.normals[j*3+2];
     const g=groups.reduce((best,g)=>{const score=nx*g.axis[1]-nz*g.axis[0],old=nx*best.axis[1]-nz*best.axis[0];return score>old?g:best;},groups[0]);
     const x=b.positions[j*3]+dx,z=b.positions[j*3+2]+dz,y=b.positions[j*3+1];
     frames.set([x*g.axis[0]+z*g.axis[1]-g.lo,y,g.width,10+g.face,6201],(offset+j)*5);
    }
   }
   if(eligible){
    if((bi===0&&count!==7)||(bi===1&&count!==28)||bi>1)throw Error('F196 carrier buffers changed');
    for(let j=0;j<count;j++){
     paint.set(bi===0?[.42,.48,.48,2]:[.39,.54,.56,2],(offset+j)*4);
     if(bi===0){frames.set([0,0,0,0,0],(offset+j)*5);continue;}
     const edge=Math.floor(j/4),g=groups.find(g=>g.edges.includes(edge));
     if(!g)throw Error('F196 source face missing');
     const x=b.positions[j*3],y=b.positions[j*3+1],z=b.positions[j*3+2];
     frames.set([x*g.axis[0]+z*g.axis[1]-g.lo,y,g.width,g.face,6201],(offset+j)*5);
    }
   }offset+=count;
  }
 }
}
