import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {frankfurtHbf075Reconstruction as __infillFunctionDependency0,frankfurtHbf075BaseMaterials as __infillFunctionDependency1} from './infill-frankfurt-hbf075';
import {HBF_LOWWING082_DATA as D} from './infill-frankfurt-hbf-lowwing082-data';

type Snapshot={header:string;batches:{positions:number[];normals:number[];indices:number[];color:number[]}[]};
type Record082={source:BuildingComponent;snapshot:Snapshot};

const selected=new WeakMap<BuildingComponent,{vertex:number;s:number;h:number}[]>();
const target=(c:BuildingComponent)=>c.city==='frankfurt'&&c.objectId===D.objectId&&c.partId===D.partId;
const header=(c:BuildingComponent)=>JSON.stringify([c.city,c.objectId,c.partId,c.origin,c.componentGeometry,c.sourceFeature]);
function snapshot(c:BuildingComponent):Snapshot{return{header:header(c),batches:c.batches.map(b=>({positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices),color:Array.from(b.color)}))};}
function unchanged(c:BuildingComponent,s:Snapshot){try{return header(c)===s.header&&c.batches.length===s.batches.length&&c.batches.every((b,i)=>(['positions','normals','indices','color'] as const).every(k=>b[k].length===s.batches[i][k].length&&s.batches[i][k].every((n,j)=>Object.is(n,b[k][j]))));}catch{return false;}}
const count=(c:BuildingComponent)=>c.batches.reduce((n,b)=>n+b.positions.length/3,0);

/** Thin delegation only: call the unchanged075 reconstruction exactly once.
 * Record the one genuine SOURCE behind its genuine private DISPLAY. No geometry,
 * own attributes, receipt, fingerprint, statistics or SOURCE data are changed.
 */

function find(c:BuildingComponent){
 const cached=selected.get(c);if(cached)return cached;
 const hits:{vertex:number;s:number;h:number}[]=[],found=new Set<number>();let offset=0;
 for(const b of c.batches){
  for(let k=0;k<b.indices.length;k+=3){
   const ids=[b.indices[k],b.indices[k+1],b.indices[k+2]];
   const match=D.triangles.findIndex((t,i)=>!found.has(i)&&ids.every((v,j)=>[0,1,2].every(a=>b.positions[v*3+a]===t.positions[j*3+a]&&b.normals[v*3+a]===t.normals[j*3+a])));
   if(match<0)continue;found.add(match);const t=D.triangles[match];
   for(let j=0;j<3;j++){const v=ids[j];if((b as unknown as {frames:number[]}).frames[v*5+4]!==45422)return false;hits.push({vertex:offset+v,s:t.detailSH[j*2],h:t.detailSH[j*2+1]});}
  }
  offset+=b.positions.length/3;
 }
 if(found.size!==4||hits.length!==12||new Set(hits.map(h=>h.vertex)).size!==12)return false;
 // No selected vertex may be shared with an additional unselected triangle.
 const chosen=new Set(hits.map(h=>h.vertex));let uses=0;offset=0;
 for(const b of c.batches){for(const v of b.indices)if(chosen.has(offset+v))uses++;offset+=b.positions.length/3;}
 if(uses!==12)return false;selected.set(c,hits);return hits;
}
/** Final packed frames only. Entire paint, SOURCE, component-owned frames and
 * geometry remain unchanged. Insert after all ordinary materials, before the
 * existing final Junghof roof packed writer. No new family/key/finite credit.
 */


import * as __infillResourceDependency0 from './infill-frankfurt-hbf075';
import * as __infillResourceDependency1 from './infill-frankfurt-hbf075';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-hbf-lowwing082.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const frankfurtHbf075Reconstruction=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],scope);
const frankfurtHbf075BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency1>)=>__infillFunctionDependency1(args[0],args[1],args[2],scope);


const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,Record082>());
function authorized(c:BuildingComponent){
 if(!target(c)||(c.displayEstimates?.infillFrankfurtHbf075 as {patchSHA?:string}|undefined)?.patchSHA!==D.expectedCurrent075PatchSHA)return false;
 const n=count(c),paint=new Float32Array(n*4),frames=new Float32Array(n*5);
 // This call checks the actual075 private WeakMap and its retained original SOURCE.
 // A matching public ID/receipt/fingerprint/clone does not authorize this writer.
 try{const r=frankfurtHbf075BaseMaterials([c],paint,frames,scope);return r.objects===1&&r.vertices===n?{paint,frames}:false;}catch{return false;}
}
function frankfurtHbfLowwing082Reconstruction(components:BuildingComponent[]){
 const result=frankfurtHbf075Reconstruction(components,scope);
 if(result.stats.error)return result;
 const inputs=components.filter(target),outputs=result.components.filter(target);
 if(inputs.length!==1||outputs.length!==1)return result;
 const input=inputs[0],output=outputs[0],prior=__infillRead_owned().get(input);
 if(prior&&!unchanged(prior.source,prior.snapshot))return result;
 if(!prior&&(input.displayEstimates?.infillFrankfurtHbf075||input.displayEstimates?.F137Exterior))return result;
 if(!authorized(output))return result;
 // An already-owned input retains its first validated raw SOURCE, never a new baseline.
 __infillRead_owned().set(output,prior??{source:input,snapshot:snapshot(input)});
 return result;
}
function frankfurtHbfLowwing082MaterialFrames(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+count(c),0),candidates=components.filter(target);
 if(candidates.length!==1||paint.length!==total*4||frames.length!==total*5)return{objects:0,vertices:0};
 const c=candidates[0],record=__infillRead_owned().get(c);
 if(!record||!unchanged(record.source,record.snapshot))return{objects:0,vertices:0};
 const actual=authorized(c),hits=actual&&find(c);if(!actual||!hits)return{objects:0,vertices:0};
 let offset=0;for(const q of components){if(q===c)break;offset+=count(q);}
 // Validate every selected packed value before committing any write.
 for(const h of hits){const at=offset+h.vertex,j=h.vertex;
  for(let k=0;k<4;k++)if(!Object.is(paint[at*4+k],actual.paint[j*4+k]))return{objects:0,vertices:0};
  const already=frames[at*5+3]===82&&frames[at*5]===Math.fround(h.s)&&frames[at*5+1]===Math.fround(h.h);
  for(let k=0;k<5;k++)if(!(already&&(k===0||k===1||k===3))&&!Object.is(frames[at*5+k],actual.frames[j*5+k]))return{objects:0,vertices:0};
 }
 for(const h of hits){const at=(offset+h.vertex)*5;frames[at]=h.s;frames[at+1]=h.h;frames[at+3]=82;}
 return{objects:1,vertices:12};
}

return {get owned(){return __infillRead_owned();},frankfurtHbfLowwing082Reconstruction,frankfurtHbfLowwing082MaterialFrames};
});}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
export function frankfurtHbfLowwing082Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['frankfurtHbfLowwing082Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return frankfurtHbfLowwing082ReconstructionCold(args[0],scope);return getInfillData(scope).frankfurtHbfLowwing082Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['frankfurtHbfLowwing082Reconstruction']>);}
export function frankfurtHbfLowwing082MaterialFrames(...args:[...Parameters<ReturnType<typeof getInfillData>['frankfurtHbfLowwing082MaterialFrames']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return frankfurtHbfLowwing082MaterialFramesCold(args[0],args[1],args[2],scope);return getInfillData(scope).frankfurtHbfLowwing082MaterialFrames(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['frankfurtHbfLowwing082MaterialFrames']>);}
export const infillDataFunctionArities={"frankfurtHbfLowwing082Reconstruction":1,"frankfurtHbfLowwing082MaterialFrames":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,__infillResourceDependency1];

function frankfurtHbfLowwing082ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){
return __infillFunctionDependency0(components,scope);}

function frankfurtHbfLowwing082MaterialFramesCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const total=components.reduce((n,c)=>n+count(c),0),candidates=components.filter(target);
if(candidates.length!==1||paint.length!==total*4||frames.length!==total*5)return{objects:0,vertices:0};
return {objects:0,vertices:0};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(infillResourceIdentityCandidate("infill-frankfurt-hbf-lowwing082.ts",c)||c.displayEstimates?.infillFrankfurtHbf075||c.displayEstimates?.F137Exterior));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
