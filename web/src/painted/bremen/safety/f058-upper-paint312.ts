import type{FrozenDataScope}from'../../../safety/frozen-data-scope';

import type{BuildingComponent}from"../../../safety/building-mesh-types";
import{nativePaintSignature}from'./progressive-native-signature';
import{ownerShapePatchProfile}from'./owner-shape-patch-display';
const PIN={"number":"F058-Upper311","enabled":true,"family":1681,"id":"owner-shape-F058-Upper-311","city":"hamburg","objectId":"osm/way/37785744","partId":"osm/way/37785744/component/2128d951c12116d7ea0d/owner-source-recovery311-upper","sourcePartId":"osm/way/37785744/component/2128d951c12116d7ea0d","path":"/safety/buildings3d/owner-shape-patches/F058-Upper-suffix364.json","bytes":250007,"sha256":"f61b926980f68e6827d58db2ec09bc9a11220919d3f5939f27feaa1ab35a8e07","geometrySignature":"c0e4cb41","sourceNativeGeometrySignature":"c30412a0","sourceNativeSHA256":"1cc6474e7a83182fabc375a839bbc57fa883caf19ed3386fad90e2be21889908","retainNative":true,"notNative":true,"owner_authorized":true,"vertices":2127,"triangles":709,"max_height_m":82,"bbox":[9.9529517,53.5596008,9.9538057,53.5598632],"replacesDerivedVariants":["F058-Upper-303","F058-LowerRoof-309"],"tile_key":"owner-shape-F058-Upper-311"} as const;
export const FRAMES_RESOURCE={canonicalSHA256:"a86a8b6e6e2e555523035abd950bda826992a0bc1486ea424afad7de0a45a65b",file:"painted/bremen/safety/f058-upper-paint312.ts",occurrence:0,codec:'json'} as const;
/** Full original recipe resources; city demand is deliberately coarse. */
export const F058_UPPER_PAINT312_SCOPE_RESOURCES=[FRAMES_RESOURCE] as const;
export const F058_UPPER_PAINT312_SCOPE_CITIES=["hamburg"] as const;
export const MODULE_SCOPE_RESOURCES=F058_UPPER_PAINT312_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=F058_UPPER_PAINT312_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"applyF058Upper312":3} as const;
const RECIPE_KEY={};
const f058_upper_paint312_FRAMES_KEY={};
function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('f058-upper-paint312 requires a prepared frozen data scope');return scope;}
function _scope_FRAMES(){return scopeValue().memo(f058_upper_paint312_FRAMES_KEY,()=>(scopeValue().borrow<any,any>(FRAMES_RESOURCE,value=>value) as Array<{"batchIndex":number;"evidence"?:string;"family":number;"firstVertex":number;"height":number;"partRole":string;"semanticRole"?:number;"uAxis":[number,number,number];"uOrigin":number;"vAxis":[number,number,number];"vOrigin":number;"vertexCount":number;"width":number;}>));}
function applyF058Upper312(rows:BuildingComponent[],colors:Float32Array,frames:Float32Array){
 const profile=ownerShapePatchProfile(PIN.path),valid=profile&&Object.entries(PIN).every(([k,v])=>JSON.stringify((profile as any)[k])===JSON.stringify(v));
 const source=rows.find(c=>c.city==='hamburg'&&c.objectId===PIN.objectId&&c.partId===PIN.sourcePartId&&nativePaintSignature(c)==='c30412a0');
 const derived=source&&valid?rows.find(c=>c.city==='hamburg'&&c.partId===PIN.partId&&nativePaintSignature(c)===PIN.geometrySignature):undefined;
 let at=0,painted=0;for(const c of rows)for(const[bi,b]of c.batches.entries())for(let j=0;j<b.positions.length;j+=3,at++)if(c===derived){
  const f=_scope_FRAMES()[bi],x=b.positions[j],y=b.positions[j+1],z=b.positions[j+2];colors.set([...b.color,2],at*4);frames.set([f.uAxis[0]*x+f.uAxis[1]*y+f.uAxis[2]*z-f.uOrigin,f.vAxis[0]*x+f.vAxis[1]*y+f.vAxis[2]*z-f.vOrigin,f.height,1,1681],at*5);painted++;
 }return{paintedVertices:painted,nativeRetained:!!source};
}
return{applyF058Upper312,_scope_FRAMES};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function applyF058Upper312(rows:BuildingComponent[],colors:Float32Array,frames:Float32Array,scope?:FrozenDataScope){return recipe(scope).applyF058Upper312(rows,colors,frames);}
