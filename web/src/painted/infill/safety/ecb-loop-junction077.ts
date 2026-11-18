import {mayMatchInfillData as infillEcbEntranceCandidate} from './ecb-entrance-aggregate073';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {ecbEntranceAggregate073Reconstruction as __infillFunctionDependency0,ecbEntranceAggregate073BaseMaterials as __infillFunctionDependency1} from './ecb-entrance-aggregate073';
import {ECB_ENTRANCE_AGGREGATE_DATA073 as ORIGINAL_DATA} from './ecb-entrance-aggregate073-data';
import {ECB_LOOP_JUNCTION_SHA077 as SHA,ECB_LOOP_JUNCTION_DATA077 as DATA} from './ecb-loop-junction077-data';
type Owned={source:BuildingComponent;paint:Float32Array;frames:Float32Array};
const key=(c:Identity)=>c.objectId+'|'+c.partId;

export const ecbLoopJunction077Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&c.objectId===DATA.targetObjectId&&c.partId===DATA.targetPartId;
function equal(a:unknown,b:unknown):boolean{if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&Object.is(a,b);if(b===null||typeof b!=='object')return a===b;if(Array.isArray(b)){if(!(Array.isArray(a)||ArrayBuffer.isView(a))||a instanceof DataView)return false;const q=a as ArrayLike<unknown>;return q.length===b.length&&b.every((v,i)=>equal(q[i],v));}if(!a||typeof a!=='object'||Array.isArray(a)||ArrayBuffer.isView(a))return false;const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ak=Object.keys(x).sort(),bk=Object.keys(y).sort();return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&equal(x[k],y[k]));}


/** Calls the unchanged private073 press-footprint cut, then removes only the
 * duplicate0..17.5m part304 wall on the three exact shared SOURCE edges.
 * Original302 is the sole carrier there;304 roof20m and upper2.5m survive.
 * Missing/drifted302 restores full current073304, without undoing its entrance cut.
 */

/** Original304 packed values transfer only from a genuine unmodified private073
 * aggregate. Public clones and metadata cannot authorize materials or clipping. */


import * as __infillResourceDependency0 from './ecb-entrance-aggregate073';
import * as __infillResourceDependency1 from './ecb-entrance-aggregate073';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("ecb-loop-junction077.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const ecbEntranceAggregate073Reconstruction=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],scope);
const ecbEntranceAggregate073BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency1>)=>__infillFunctionDependency1(args[0],args[1],args[2],scope);


const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,Owned>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,BuildingComponent>());
const __infillRead_expected=scopedInfillValue(()=>new Map(ORIGINAL_DATA.map(d=>[key(d),{paint:new Float32Array(d.batches.flatMap(b=>[...b.paint])),frames:new Float32Array(d.batches.flatMap(b=>[...b.frames]))}])));
function privateOriginal(c:BuildingComponent){try{const p=DATA.pins.find(p=>p.objectId===c.objectId&&p.partId===c.partId);if(!p||c.city!=='frankfurt'||!equal(c.origin,p.origin)||!equal(c.componentGeometry,p.componentGeometry)||!equal(c.sourceFeature,p.sourceFeature))return;const f=ownerDisplayFingerprint(c);if(f.vertices!==p.vertices||f.indices!==p.indices||f.fingerprint!==p.fingerprint)return;const paint=new Float32Array(f.vertices*4),frames=new Float32Array(f.vertices*5),proof=ecbEntranceAggregate073BaseMaterials([c],paint,frames,scope),original=__infillRead_expected().get(key(c));if(proof.objects!==1||proof.vertices!==f.vertices||!original||!equal(paint,Array.from(original.paint))||!equal(frames,Array.from(original.frames)))return;return{paint,frames};}catch{return;}}
function exactOwned(c:BuildingComponent,r:Owned){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&ecbLoopJunction077Identity(c)&&c.sourceFeature===r.source.sourceFeature&&c.componentGeometry===r.source.componentGeometry&&equal(c.origin,r.source.origin)&&f.vertices===DATA.output.vertices&&f.indices===DATA.output.indices&&f.fingerprint===DATA.output.fingerprint&&!!privateOriginal(r.source)&&(c.displayEstimates?.ecbLoopJunction077 as{patchSHA?:string}|undefined)?.patchSHA===SHA;}catch{return false;}}
function ecbLoopJunction077Reconstruction(components:BuildingComponent[]){
 const invalid=new Set<BuildingComponent>();let privateError=false;
 const input=components.map(c=>{const r=__infillRead_owned().get(c);if(!r)return c;if(!exactOwned(c,r)){privateError=true;invalid.add(r.source);}return r.source;});
 const original=ecbEntranceAggregate073Reconstruction(input,scope),stats:OwnerReconstructionStats={...original.stats,components:[...original.stats.components]};if(privateError)stats.error='ECB junction077 changed private DISPLAY restored original073 aggregate';
 const originals=DATA.pins.map(p=>original.components.filter(c=>c.objectId===p.objectId&&c.partId===p.partId));if(originals.some(cs=>cs.length!==1))return{components:original.components,stats};
 const proofs=originals.map(cs=>privateOriginal(cs[0]));if(proofs.some(p=>!p))return{components:original.components,stats};
 const source=originals.find(cs=>ecbLoopJunction077Identity(cs[0]))![0];if(invalid.has(source))return{components:original.components,stats};let out=__infillRead_cache().get(source);
 if(out&&!exactOwned(out,__infillRead_owned().get(out)!)){stats.error='ECB junction077 cached private DISPLAY changed';return{components:original.components,stats};}
 if(!out){
  const batches=source.batches.map((b,bi)=>DATA.edits.some(e=>e.batch===bi)?{...b,positions:Float32Array.from(b.positions)}:b);
  for(const e of DATA.edits){if(batches[e.batch].positions[e.vertex*3+1]!==e.oldHeight)throw Error('ECB junction077 original intersection vertex changed');batches[e.batch].positions[e.vertex*3+1]=e.newHeight;}
  out={...source,batches,displayEstimates:{...source.displayEstimates,ecbLoopJunction077:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,original073PatchSHA:DATA.original073PatchSHA256,geometryRole:DATA.geometryRole,onlySharedEdges:[2,3,4],removedDuplicateWallY:[0,17.5],preservedUpperWallY:[17.5,20],preservedRoofHeightM:20,original302PackedMaterialsUnchanged:true,loopPressAndEntranceCutUnchanged:true,actualVisualAccepted:false,quality500Accepted:false}}};const p=proofs[originals.findIndex(cs=>cs[0]===source)]!;__infillRead_owned().set(out,{source,paint:p.paint,frames:p.frames});__infillRead_cache().set(source,out);
 }
 const receipt={objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:DATA.output.vertices,triangles:DATA.output.indices/3,geometryRole:DATA.geometryRole},at=stats.components.findIndex(c=>c.objectId===source.objectId&&c.partId===source.partId);if(at>=0)stats.components[at]=receipt;else{stats.objects++;stats.vertices+=DATA.output.vertices;stats.triangles+=DATA.output.indices/3;stats.originalVertices+=DATA.pins.find(p=>p.partId===source.partId)!.sourceVertices;stats.components.push(receipt);}
 return{components:original.components.map(c=>c===source?out!:c),stats};
}
function ecbLoopJunction077BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){if(components.some(c=>__infillRead_owned().has(c))){const carrier=components.filter(c=>c.objectId===DATA.pins[0].objectId&&c.partId===DATA.pins[0].partId);if(carrier.length!==1||!privateOriginal(carrier[0]))throw Error('ECB junction077 exact private302 carrier required before materials');}const total=components.reduce((n,c)=>n+c.batches.reduce((n,b)=>n+b.positions.length/3,0),0);if(paint.length!==total*4||frames.length!==total*5)throw Error('ECB junction077 exact packed lengths required');let at=0,objects=0,vertices=0;for(const c of components){const r=__infillRead_owned().get(c),n=c.batches.reduce((s,b)=>s+b.positions.length/3,0);if(r){if(!exactOwned(c,r))throw Error('ECB junction077 changed private DISPLAY before materials');paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,actualVisualAccepted:false};}

return {get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},get expected(){return __infillRead_expected();},ecbLoopJunction077Reconstruction,ecbLoopJunction077BaseMaterials};
});}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
function getexpected(scope:FrozenDataScope|undefined){return getInfillData(scope).expected;}
export function ecbLoopJunction077Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['ecbLoopJunction077Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return ecbLoopJunction077ReconstructionCold(args[0],scope);return getInfillData(scope).ecbLoopJunction077Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['ecbLoopJunction077Reconstruction']>);}
export function ecbLoopJunction077BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['ecbLoopJunction077BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return ecbLoopJunction077BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).ecbLoopJunction077BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['ecbLoopJunction077BaseMaterials']>);}
export const infillDataFunctionArities={"ecbLoopJunction077Reconstruction":1,"ecbLoopJunction077BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,__infillResourceDependency1];

function ecbLoopJunction077ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const original=__infillFunctionDependency0(components.map(component=>component),scope),stats:OwnerReconstructionStats={...original.stats,components:[...original.stats.components]};return{components:original.components,stats};}

function ecbLoopJunction077BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){
return {objects:0,vertices:0,actualVisualAccepted:false};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return infillEcbEntranceCandidate(components)||components.some(c=>(c.city===undefined||c.city==='frankfurt')&&(c.objectId===DATA.targetObjectId||c.partId===DATA.targetPartId||DATA.pins.some(pin=>pin.objectId===c.objectId||pin.partId===c.partId)||c.displayEstimates?.ecbLoopJunction077));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=["ecbLoopJunction077Identity"] as const;
