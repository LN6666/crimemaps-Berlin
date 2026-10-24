import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {commerzbankExactOriginalMatches} from './commerzbank-parent-display';
import {COMMERZBANK_PARENT_MEMBERS} from './commerzbank-parent-display-data';
import {commerzbankParent053Reconstruction} from './commerzbank-parent053-reconstruction';
import {COMMERZBANK_FAN_OFFICIAL_SHA066 as SHA,COMMERZBANK_FAN_OFFICIAL_DATA066 as DATA} from './commerzbank-fan-official066-data';

const ID='osm/way/1071608175',PART=ID+'/component/ebe76a7236b273a68192';
const pin=COMMERZBANK_PARENT_MEMBERS.find(p=>p.objectId===ID&&p.partId===PART)!;
type Owned={source:BuildingComponent;fingerprint:string;paint:Float32Array;frames:Float32Array};
const owned=new WeakMap<BuildingComponent,Owned>(),cache=new WeakMap<BuildingComponent,BuildingComponent>();
const stats=():OwnerReconstructionStats=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
export const commerzbankFan066Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&c.objectId===ID&&c.partId===PART;
function exactOwned(c:BuildingComponent){const r=owned.get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint&&commerzbankExactOriginalMatches(r.source,pin);}catch{return false;}}
export const commerzbankFan066OriginalSource=(c:BuildingComponent)=>exactOwned(c)?owned.get(c)?.source:undefined;

/** One matched fan only. Original SOURCE, original23 guard and all other components stay intact.
 * Original HVBG LoD2 is clipped to this SOURCE; only the separately marked small registration
 * margin extends its nearest measured roof plane. This margin is not original survey geometry.
 * Absolute roof heights109.433/114.227 use adjacentKaiser datum98.701, not a uniform height raise.
 * No additional facade details, relatives, displaced outline or sibling211773080 are introduced. */
export function commerzbankFan066Reconstruction(components:BuildingComponent[]){
 const s=stats(),targets=components.filter(c=>commerzbankFan066Identity(c));
 if(!targets.length)return{components,stats:s};
 if(targets.length!==1){s.error='Fan066 duplicate exact identity; original components retained';return{components,stats:s};}
 const c=targets[0],record=owned.get(c);
 if(record){if(!exactOwned(c)){s.error='Fan066 privately owned DISPLAY or original SOURCE changed';return{components,stats:s};}return{components,stats:s};}
 let valid=false;try{valid=c.city==='frankfurt'&&commerzbankExactOriginalMatches(c,pin);}catch{}
 if(!valid){s.error='Fan066 unchanged exact original SOURCE required';return{components,stats:s};}
 let clone=cache.get(c);
 if(clone&&!exactOwned(clone)){s.error='Fan066 cached private DISPLAY changed';return{components,stats:s};}
 if(!clone){
  const batches:MeshBatch[]=DATA.batches.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color] as [number,number,number],materialName:b.geometryRole}));
  clone={...c,batches,displayEstimates:{...c.displayEstimates,commerzbankFanOfficial066:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,officialBuildingIds:DATA.bodies.map(b=>b.officialBuildingId),absoluteDatumM:DATA.datumAbsoluteM,absoluteRoofHeightsM:[109.433,114.227],displayRoofHeightsM:[10.732,15.526],geometrySource:'Original HVBG INSPIRE geometry3DLoD2 clipped only to exact fan1071608175 SOURCE',registrationMargin:'Approximately0.888% root-authorized DISPLAY registration margin extends nearest verified upper roof plane. Separately marked approximation, not original survey; two-plane boundary subdivisions and actual preview remain explicit.',nearGroundUpwardFaceExcluded:'GEOMETRY_130f696c-aaab-4c5f-8601-cfe94b47e7c8 H99.258 is not an upper fan roof.',inheritedDatumBoundary:'Kaiser18/20=98.701m; existing banklong=97.710m and banksmall=98.638m are unchanged independent old datums. No common absolute display plane is asserted.',groundFacesOmitted:true,actualVisualAccepted:false}}};
  const paint=new Float32Array(DATA.batches.flatMap(b=>[...b.paint])),frames=new Float32Array(DATA.batches.flatMap(b=>[...b.frames]));
  owned.set(clone,{source:c,fingerprint:ownerDisplayFingerprint(clone).fingerprint,paint,frames});cache.set(c,clone);
 }
 s.objects=1;s.vertices=clone.batches.reduce((n,b)=>n+b.positions.length/3,0);s.triangles=clone.batches.reduce((n,b)=>n+b.indices.length/3,0);s.originalVertices=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
 s.components.push({objectId:ID,partId:PART,sourcePartId:PART,patchSHA256:SHA,vertices:s.vertices,triangles:s.triangles,geometryRole:'matched-official-two-height-fan-with-separate-registration-margin'});
 return{components:components.map(c=>c===targets[0]?clone!:c),stats:s};
}

/** Replace only the old parent053 stage reference with this composition.
 * Re-entrant input may contain our private fan DISPLAY: validate it first, restore only its
 * original SOURCE, run the UNCHANGED exact23 parent function, then derive the fan after it.
 * A public clone or altered private output cannot authorize SOURCE recovery or bypass that guard. */
export function commerzbankFan066AfterParent053Reconstruction(components:BuildingComponent[]){
 for(const c of components)if(owned.has(c)&&!exactOwned(c)){const s=stats();s.error='Fan066 private DISPLAY changed before original23 parent guard';return{components,stats:s};}
 const recovered=components.map(c=>owned.get(c)?.source??c);
 const parent=commerzbankParent053Reconstruction(recovered),fan=commerzbankFan066Reconstruction(parent.components);
 const s:OwnerReconstructionStats={...parent.stats,components:[...parent.stats.components,...fan.stats.components]};
 for(const key of ['objects','vertices','triangles','originalVertices'] as const)s[key]=(s[key]??0)+(fan.stats[key]??0);
 s.error=parent.stats.error||fan.stats.error;
 return{components:fan.components,stats:s};
}

/** Reuse existing c137 roof11376/wall11378 and its registered metre UVs. No shader changes. */
export function commerzbankFan066BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((k,b)=>k+b.positions.length/3,0),0);
 if(paint.length!==total*4||frames.length!==total*5)throw Error('Fan066 exact packed attribute lengths required');
 for(const c of components)if(owned.has(c)&&!exactOwned(c))throw Error('Fan066 changed private DISPLAY or original SOURCE before materials');
 let at=0,objects=0,vertices=0;
 for(const c of components){const n=c.batches.reduce((k,b)=>k+b.positions.length/3,0),r=owned.get(c);if(r){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}
 return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}
