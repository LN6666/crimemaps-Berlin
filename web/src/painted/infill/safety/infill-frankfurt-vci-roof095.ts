import type {BuildingComponent} from './building-mesh-renderer';
import {LOW_OFFICE_DATA,LOW_OFFICE_SHA} from './infill-frankfurt-vci051-data';
import {infillFrankfurtVCI051Reconstruction} from './infill-frankfurt-vci051';
import {nativePaintSignature} from './progressive-native-signature';
import {VCI_ROOF095_DATA as D} from './infill-frankfurt-vci-roof095-data';

const model=LOW_OFFICE_DATA.groups[0].models[0];
type Record095={source:BuildingComponent;snapshot:any;outputHeader:any};
const owned=new WeakMap<BuildingComponent,Record095>();
const target=(c:BuildingComponent)=>c.city==='frankfurt'&&c.objectId===D.objectId&&c.partId===D.partId;
const count=(c:BuildingComponent)=>c.batches.reduce((n,b)=>n+b.positions.length/3,0);
// Pinned current real-codec SOURCE, rather than offline provenance annotations
// or an older codec's precision-metadata schema. Every actual SOURCE field is
// compared and the genuine retained object is separately snapshotted in full.
const runtimeSource:any=D.expectedRuntimeSource;
const sourceKeys=Object.keys(runtimeSource);
const array=(x:any):boolean=>Array.isArray(x)||ArrayBuffer.isView(x);
function exact(a:any,b:any):boolean{
 if(Object.is(a,b))return true;
 if(array(a)||array(b))return array(a)&&array(b)&&a.length===b.length&&Array.from(a as ArrayLike<any>).every((v,i)=>exact(v,b[i]));
 if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
 const aa=Object.keys(a).sort(),bb=Object.keys(b).sort();
 return aa.length===bb.length&&aa.every((k,i)=>k===bb[i]&&exact(a[k],b[k]));
}
function copy(v:any):any{
 if(array(v))return Array.from(v as ArrayLike<any>,copy);
 if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).map(k=>[k,copy(v[k])]));
 return v;
}
function sourceExpected(c:BuildingComponent){
 if(!target(c)||LOW_OFFICE_SHA!==D.expectedPatchSHA)return false;
 if(nativePaintSignature(c)!==D.expectedSourceSignature)return false;
 const keys=sourceKeys;
 // The current actual SOURCE has the original serialized fields plus generation.
 // No SOURCE geometry/feature/attributes are rounded to Float32 for admission.
 return keys.every(k=>exact((c as any)[k],runtimeSource[k]))&&Object.keys(c).every(k=>keys.includes(k)||k==='generation');
}
const outputHeader=(c:BuildingComponent)=>Object.fromEntries(Object.keys(c).filter(k=>k!=='batches').map(k=>[k,(c as any)[k]]));
function outputExpected(c:BuildingComponent){
 if(!target(c)||LOW_OFFICE_SHA!==D.expectedPatchSHA)return false;
 if((c.displayEstimates?.infillFrankfurtVCI051 as {patchSHA?:string}|undefined)?.patchSHA!==D.expectedPatchSHA)return false;
 if(!sourceKeys.filter(k=>k!=='batches'&&k!=='displayEstimates').every(k=>exact((c as any)[k],runtimeSource[k])))return false;
 return exact(c.batches,model.display);
}
/** Delegate the unchanged accepted reconstruction once. Keep its exact result,
 * SOURCE, statistics, component attributes, geometry, and receipt unchanged.
 * Only genuine outputs of this delegation receive private material authority.
 */
export function infillFrankfurtVCIRoof095Reconstruction(components:BuildingComponent[],selectedQueueIds?:string[]){
 const result=infillFrankfurtVCI051Reconstruction(components,selectedQueueIds);
 const inputs=components.filter(target),outputs=result.components.filter(target);
 if(inputs.length!==1||outputs.length!==1)return result;
 const input=inputs[0],output=outputs[0],prior=owned.get(input);
 if(prior){
  if(exact(prior.source,prior.snapshot)&&outputExpected(output)&&exact(outputHeader(input),prior.outputHeader))owned.set(output,prior);
 }else if(sourceExpected(input)&&output!==input&&outputExpected(output)){
  owned.set(output,{source:input,snapshot:copy(input),outputHeader:copy(outputHeader(output))});
 }
 return result;
}

function selectedVertices(){
 const vertices:number[]=[],seen=new Set<number>();let offset=0,triangles=0;
 for(const b of model.display){
  for(let k=0;k<b.indices.length;k+=3){
   const ids=b.indices.slice(k,k+3);
   if(!ids.every((v:number)=>b.positions[v*3+1]===D.topHeight&&b.normals[v*3+1]>.999999&&b.frames[v*5+4]===D.family))continue;
   triangles++;for(const v of ids){const at=offset+v;if(seen.has(at))return false;seen.add(at);vertices.push(at);}
  }
  offset+=b.positions.length/3;
 }
 return triangles===D.triangles&&vertices.length===D.vertices?vertices:false;
}
const hits=selectedVertices();

/** Final packed frame.w only. The new shader ignores old per-triangle RGB only
 * on the privately authorized highest roof; all CPU RGB/paint buffers stay exact.
 * Call after ordinary BaseMaterials and before the final Junghof packed writer.
 */
export function infillFrankfurtVCIRoof095MaterialFrames(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const no={objects:0,vertices:0},candidates=components.filter(target),total=components.reduce((n,c)=>n+count(c),0);
 if(!hits||candidates.length!==1||paint.length!==total*4||frames.length!==total*5)return no;
 const c=candidates[0],record=owned.get(c);
 if(!record||!exact(record.source,record.snapshot)||!outputExpected(c)||!exact(outputHeader(c),record.outputHeader))return no;
 let offset=0;for(const q of components){if(q===c)break;offset+=count(q);}
 const expectedPaint:number[]=[],expectedFrames:number[]=[];
 for(const b of model.display){expectedPaint.push(...b.paint);expectedFrames.push(...b.frames);}
 // Validate every proposed packed write before making the first mutation.
 for(const vertex of hits){
  const at=offset+vertex;
  for(let k=0;k<4;k++)if(!Object.is(paint[at*4+k],Math.fround(expectedPaint[vertex*4+k])))return no;
  for(let k=0;k<5;k++){
   const value=frames[at*5+k],expected=Math.fround(expectedFrames[vertex*5+k]);
   if(k===3&&value===D.marker)continue;
   if(!Object.is(value,expected))return no;
  }
 }
 for(const vertex of hits)frames[(offset+vertex)*5+3]=D.marker;
 return{objects:1,vertices:hits.length};
}
