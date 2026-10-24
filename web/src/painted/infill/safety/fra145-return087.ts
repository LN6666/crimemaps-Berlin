import type {BuildingComponent} from './building-mesh-renderer';
import {frankfurtGroups144146Official073Reconstruction,frankfurtGroups144146Official073BaseMaterials} from './frankfurt-groups144146-official073';
import {FRA145_RETURN087_DATA as D} from './fra145-return087-data';

type Snapshot={header:unknown;batches:{positions:number[];normals:number[];indices:number[];color:number[];faceRole:unknown}[]};
type Record087={source:BuildingComponent;snapshot:Snapshot};
const owned=new WeakMap<BuildingComponent,Record087>();
const selected=new WeakMap<BuildingComponent,{vertex:number;u:number;h:number;marker:87|88}[]>();
const target=(c:BuildingComponent)=>c.city==='frankfurt'&&c.objectId===D.objectId&&c.partId===D.partId;
function copy(x:unknown):unknown{if(Array.isArray(x)||ArrayBuffer.isView(x)){if(x instanceof DataView)return null;return Array.from(x as ArrayLike<unknown>,copy);}if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,copy(v)]));return x;}
function equal(a:unknown,b:unknown):boolean{if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&Object.is(a,b);if(b===null||typeof b!=='object')return Object.is(a,b);if(Array.isArray(b)){if(!(Array.isArray(a)||ArrayBuffer.isView(a))||a instanceof DataView)return false;const q=a as ArrayLike<unknown>;return q.length===b.length&&b.every((v,i)=>equal(q[i],v));}if(!a||typeof a!=='object'||Array.isArray(a)||ArrayBuffer.isView(a))return false;const x=a as Record<string,unknown>,y=b as Record<string,unknown>,ak=Object.keys(x).sort(),bk=Object.keys(y).sort();return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&equal(x[k],y[k]));}
const header=(c:BuildingComponent)=>[c.city,c.objectId,c.partId,c.origin,c.componentGeometry,c.sourceFeature];
function snapshot(c:BuildingComponent):Snapshot{return{header:copy(header(c)),batches:c.batches.map(b=>({positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices),color:Array.from(b.color),faceRole:b.faceRole??null}))};}
function unchanged(c:BuildingComponent,s:Snapshot){try{return equal(header(c),s.header)&&c.batches.length===s.batches.length&&c.batches.every((b,i)=>(b.faceRole??null)===s.batches[i].faceRole&&(['positions','normals','indices','color'] as const).every(k=>equal(b[k],s.batches[i][k])));}catch{return false;}}
const count=(c:BuildingComponent)=>c.batches.reduce((n,b)=>n+b.positions.length/3,0);
function authorized(c:BuildingComponent){
 if(!target(c)||(c.displayEstimates?.frankfurtGroups144146Official073 as {patchSHA?:string}|undefined)?.patchSHA!==D.expected073PatchSHA)return false;
 const n=count(c);if(n!==D.displayFingerprint.vertices)return false;
 const paint=new Float32Array(n*4),frames=new Float32Array(n*5);
 // Original073 verifies its private WeakMap and retained exact native SOURCE.
 // Public identity, serialized receipts and matching fingerprints grant no right.
 try{const r=frankfurtGroups144146Official073BaseMaterials([c],paint,frames);if(r.objects!==1||r.vertices!==n)return false;
  let at=0;for(const batch of c.batches){const b=batch as typeof batch&{paint?:ArrayLike<number>;frames?:ArrayLike<number>},v=b.positions.length/3;if(!b.paint||!b.frames||b.paint.length!==v*4||b.frames.length!==v*5)return false;for(let j=0;j<v*4;j++)if(!Object.is(b.paint[j],paint[at*4+j]))return false;for(let j=0;j<v*5;j++)if(!Object.is(b.frames[j],frames[at*5+j]))return false;at+=v;}
  return{paint,frames};
 }catch{return false;}
}
/** Delegate original073 once, preserving its exact output objects, statistics,
 * geometry, own attributes and receipts. Only this one raw SOURCE is recorded. */
export function fra145Return087Reconstruction(components:BuildingComponent[]){
 const result=frankfurtGroups144146Official073Reconstruction(components);
 const inputs=components.filter(target),outputs=result.components.filter(target);
 if(inputs.length!==1||outputs.length!==1)return result;
 const input=inputs[0],output=outputs[0],prior=owned.get(input);
 if(prior&&!unchanged(prior.source,prior.snapshot))return result;
 if(!prior&&input.displayEstimates?.frankfurtGroups144146Official073)return result;
 if(!authorized(output))return result;
 owned.set(output,prior??{source:input,snapshot:snapshot(input)});
 return result;
}
function find(c:BuildingComponent){
 const cached=selected.get(c);if(cached)return cached;
 const hits:{vertex:number;u:number;h:number;marker:87|88}[]=[],found=new Set<number>();let offset=0;
 for(const b of c.batches){for(let k=0;k<b.indices.length;k+=3){const ids=[b.indices[k],b.indices[k+1],b.indices[k+2]],match=D.triangles.findIndex((t,i)=>!found.has(i)&&ids.every((v,j)=>[0,1,2].every(a=>b.positions[v*3+a]===t.positions[j*3+a]&&b.normals[v*3+a]===t.normals[j*3+a])));if(match<0)continue;found.add(match);const t=D.triangles[match];for(let j=0;j<3;j++){const v=ids[j];if((b as unknown as {frames:number[]}).frames[v*5+4]!==45357)return false;hits.push({vertex:offset+v,u:t.uv[j*2],h:t.uv[j*2+1],marker:t.marker});}}offset+=b.positions.length/3;}
 if(found.size!==23||hits.length!==69||new Set(hits.map(h=>h.vertex)).size!==69)return false;
 const chosen=new Set(hits.map(h=>h.vertex));let uses=0;offset=0;for(const b of c.batches){for(const v of b.indices)if(chosen.has(offset+v))uses++;offset+=b.positions.length/3;}if(uses!==69)return false;
 selected.set(c,hits);return hits;
}
/** Final packed frames only: family45357 + marker87/88, two genuine wall strips.
 * Leave the entire paint buffer and all SOURCE/component-owned arrays untouched. */
export function fra145Return087MaterialFrames(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+count(c),0),candidates=components.filter(target);
 if(candidates.length!==1||paint.length!==total*4||frames.length!==total*5)return{objects:0,vertices:0};
 const c=candidates[0],record=owned.get(c);if(!record||!unchanged(record.source,record.snapshot))return{objects:0,vertices:0};
 const actual=authorized(c),hits=actual&&find(c);if(!actual||!hits)return{objects:0,vertices:0};
 let offset=0;for(const q of components){if(q===c)break;offset+=count(q);}
 // Atomic preflight; never partly write after a later selected-vertex mismatch.
 for(const h of hits){const at=offset+h.vertex,j=h.vertex;for(let k=0;k<4;k++)if(!Object.is(paint[at*4+k],actual.paint[j*4+k]))return{objects:0,vertices:0};const already=frames[at*5+3]===h.marker&&frames[at*5]===Math.fround(h.u)&&frames[at*5+1]===Math.fround(h.h);for(let k=0;k<5;k++)if(!(already&&(k===0||k===1||k===3))&&!Object.is(frames[at*5+k],actual.frames[j*5+k]))return{objects:0,vertices:0};}
 for(const h of hits){const at=(offset+h.vertex)*5;frames[at]=h.u;frames[at+1]=h.h;frames[at+3]=h.marker;}
 return{objects:1,vertices:69};
}
