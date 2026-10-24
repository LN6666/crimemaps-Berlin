import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {fra144WallOverlap079Reconstruction} from './fra144-wall-overlap079';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {FRA144_RESIDUAL_DATA086} from './fra144-residual-materials086-data';
type View={city:string;objectId:string;partId:string;origin:unknown;componentGeometry:unknown;sourceFeature:unknown;displayEstimates:unknown;batches:unknown};
type Pin={objectId:string;partId:string;source:View;currentOutputFingerprint:string;currentVertices:number;currentTriangles:number;independent107:boolean};
const pins=FRA144_RESIDUAL_DATA086 as unknown as readonly Pin[],by=new Map(pins.map(p=>[p.objectId+'|'+p.partId,p]));
const key=(c:Identity)=>c.objectId+'|'+c.partId;
// The runtime codec emits optional properties such as position_cm:undefined;
// JSON SOURCE pins omit those same properties. Only absence/undefined is
// canonicalized. Every defined value, signed zero and buffer value stays exact.
function canonical(value:unknown):unknown{if(!value||typeof value!=='object'||ArrayBuffer.isView(value))return value;if(Array.isArray(value))return value.map(canonical);return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,canonical(v)]));}
const view=(c:BuildingComponent):View=>canonical({city:c.city,objectId:c.objectId,partId:c.partId,origin:c.origin,componentGeometry:c.componentGeometry,sourceFeature:c.sourceFeature,displayEstimates:c.displayEstimates,batches:c.batches}) as View;
function equal(a:unknown,b:unknown):boolean{
 if(typeof a==='number'||typeof b==='number')return typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b)&&Object.is(a,b);
 if(a===b)return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;
 const aa=Array.isArray(a)||ArrayBuffer.isView(a),bb=Array.isArray(b)||ArrayBuffer.isView(b);
 if(aa||bb){if(!aa||!bb)return false;const x=a as unknown as ArrayLike<unknown>,y=b as unknown as ArrayLike<unknown>;if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(!equal(x[i],y[i]))return false;return true;}
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ka=Object.keys(x).sort(),kb=Object.keys(y).sort();if(ka.length!==kb.length)return false;for(let i=0;i<ka.length;i++)if(ka[i]!==kb[i]||!equal(x[ka[i]],y[kb[i]]))return false;return true;
}
const exactSource=(c:BuildingComponent,p:Pin)=>equal(view(c),p.source);
type Owned={source:BuildingComponent;sourceSnapshot:View;displaySnapshot:View;pin:Pin};const owned=new WeakMap<BuildingComponent,Owned>();
function exactOwned(c:BuildingComponent,p:Owned){return equal(view(c),p.displaySnapshot)&&equal(view(p.source),p.sourceSnapshot)&&exactSource(p.source,p.pin);}
export const fra144ResidualMaterials086Identity=(c:Identity&{city?:string})=>c.city==='frankfurt'&&by.has(key(c));
/** Replace only the old079 late slot. Its authentic073/079 reconstruction runs
 * once, unchanged; this wrapper only records private material ownership. */
export function fra144ResidualMaterials086Reconstruction(components:BuildingComponent[]){
 const source=new Map<string,BuildingComponent>(),counts=new Map<string,number>(),blocked=new Set<string>();
 for(const c of components){const p=by.get(key(c));if(!p)continue;const k=key(c);counts.set(k,(counts.get(k)??0)+1);const previous=owned.get(c);if(previous){if(exactOwned(c,previous))source.set(k,previous.source);else blocked.add(k);}else if(exactSource(c,p))source.set(k,c);}
 const result=fra144WallOverlap079Reconstruction(components);
 for(const c of result.components){const p=by.get(key(c)),s=source.get(key(c));if(!p||!s||blocked.has(key(c))||counts.get(key(c))!==1||!exactSource(s,p))continue;
  // Native variants are valid independent SOURCE carriers. The three clipped
  // variants can arise only from the unchanged079 private reconstruction above.
  const native=exactSource(c,p);if(!native){try{if(ownerDisplayFingerprint(c).fingerprint!==p.currentOutputFingerprint)continue;}catch{continue;}}
  owned.set(c,{source:s,sourceSnapshot:structuredClone(view(s)),displaySnapshot:structuredClone(view(c)),pin:p});
 }
 return result;
}
/** Related concrete/stone base on undocumented walls and registered grey service
 * roof colour; no new opening, roof, height or geometry claim. Existing073 key. */
export function fra144ResidualMaterials086MaterialFrames(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 let vertices=0;for(const c of components){if(!c||!Array.isArray(c.batches))return{objects:0,vertices:0};for(const b of c.batches){if(!b||!b.positions||!Number.isSafeInteger(b.positions.length/3))return{objects:0,vertices:0};vertices+=b.positions.length/3;}}if(paint.length!==vertices*4||frames.length!==vertices*5)return{objects:0,vertices:0};
 const counts=new Map<string,number>();for(const c of components)if(by.has(key(c)))counts.set(key(c),(counts.get(key(c))??0)+1);
 const common:[number,number]=[8.6810828,50.1158923],unit=40075016.686*Math.cos(common[1]*Math.PI/180),merc=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));let offset=0,objects=0,written=0;
 for(const c of components){const n=c.batches.reduce((m,b)=>m+b.positions.length/3,0),record=owned.get(c);if(!record||counts.get(key(c))!==1||!exactOwned(c,record)){offset+=n;continue;}
  let clean=true;for(let i=0;i<n*4;i++)if(!Object.is(paint[offset*4+i],0)){clean=false;break;}if(clean)for(let i=0;i<n*5;i++)if(!Object.is(frames[offset*5+i],0)){clean=false;break;}if(!clean){offset+=n;continue;}
  const ratio=unit/(40075016.686*Math.cos(c.origin[1]*Math.PI/180)),east=(c.origin[0]-common[0])*unit/360,north=(merc(c.origin[1])-merc(common[1]))*unit/(2*Math.PI);let at=offset;
  for(const b of c.batches){for(let i=0;i<b.positions.length/3;i++,at++){const ny=b.normals[i*3+1],roof=Math.abs(ny)>.9,family=roof?45353:45352,color=roof?[.51,.52,.49]:[.77,.77,.72];paint.set([...color,2],at*4);frames[at*5]=east+b.positions[i*3]*ratio;frames[at*5+1]=roof?north+b.positions[i*3+2]*ratio:b.positions[i*3+1];frames[at*5+2]=0;frames[at*5+3]=0;frames[at*5+4]=family;}}
  objects++;written+=n;offset+=n;
 }
 return{objects,vertices:written};
}
