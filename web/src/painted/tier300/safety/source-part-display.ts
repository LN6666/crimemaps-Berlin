import type {BuildingComponent} from './building-mesh-renderer';
/** A native building:part with the exactly identical footprint already covers this outline.
 * Hold only the redundant 3D outline draw; retain its original object, metadata and mesh.
 * This deliberately does not infer partial containment, unions or source relationships.
 */
export function exactNativePartDisplay(components:BuildingComponent[]){
 const parts=new Map<string,BuildingComponent[]>();
 const part=(c:BuildingComponent)=>{const value=c.sourceFeature.properties?.['building:part'];return typeof value==='string'&&value!==''&&value!=='no';};
 const fingerprint=(c:BuildingComponent)=>c.city+'|'+c.partId.split('/component/')[1];
 for(const c of components)if(part(c)){const k=fingerprint(c),list=parts.get(k)??[];list.push(c);parts.set(k,list);}
 const held:{outline:BuildingComponent;body:BuildingComponent}[]=[],drawable:BuildingComponent[]=[];
 for(const c of components){const raw=c.sourceFeature.properties,building=raw?.building;
  const body=typeof building==='string'&&building!==''&&building!=='no'&&!part(c)?parts.get(fingerprint(c))?.find(p=>p.objectId!==c.objectId&&JSON.stringify(p.componentGeometry)===JSON.stringify(c.componentGeometry)):undefined;
  if(body)held.push({outline:c,body});else drawable.push(c);
 }
 return{drawable,held};
}
