import type {BuildingComponent} from './building-mesh-renderer';
import {nativePaintSignature} from './progressive-native-signature';
export const F148_IDENTITY={city:'frankfurt',objectId:'osm/way/23901923',partId:'osm/way/23901923/component/9f7e45e31c96a4a9923f',signature:'a192fdd2'};
// Four source facades plus flat roof, no geometry edits or aliases.
// Caller supplies its existing runtime signature function and an available family.
export function f148Frames(component:BuildingComponent,family:number,signature:(c:BuildingComponent)=>string){
 const id=F148_IDENTITY;
 if(component.city!==id.city||component.objectId!==id.objectId||component.partId!==id.partId)return null;
 if(signature(component)!==id.signature)return null;
 if(!Number.isInteger(family)||family<=0)throw Error('Allocate an unoccupied family before F148 integration');
 const rows:number[][]=[];let count=0;
 for(const b of component.batches){const row:number[]=[];
  for(let v=0;v<b.positions.length/3;v++){
   const i=v*3,x=b.positions[i],y=b.positions[i+1],z=b.positions[i+2],nx=b.normals[i],ny=b.normals[i+1],nz=b.normals[i+2];
   const kind=ny>.9?0:Math.abs(nz)>.9?(nz>0?1:2):(nx<0?3:4);
   row.push(kind===3||kind===4?z:x,kind===0?z:y,kind===3||kind===4?17.72:217.7,kind,family);count++;
  }rows.push(row);
 }return {rows,count,sourceUnchanged:true,geometryChanged:false};
}
export function applyF148Paint(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,family:number,signature:(c:BuildingComponent)=>string){
 let offset=0,objects=0,vertices=0;
 for(const component of components){const data=f148Frames(component,family,signature);if(data)objects++;
  for(const [bi,b]of component.batches.entries()){
   const count=b.positions.length/3;
   if(data){for(let v=0;v<count;v++)paint.set(bi===0?[.48,.49,.46,2]:[.70,.70,.66,2],(offset+v)*4);frames.set(data.rows[bi],offset*5);vertices+=count;}
   offset+=count;
  }
 }return {objects,vertices,geometryChanged:false,actualVisualAccepted:false};
}

export function ownerF148Materials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){return applyF148Paint(components,paint,frames,6202,nativePaintSignature);}
