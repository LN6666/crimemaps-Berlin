import {nativePaintSignature} from './progressive-native-signature';
import {COMMERZBANK_PARENT_MEMBERS} from './commerzbank-parent-display-data';

type NativeComponent={city:string;objectId:string;partId:string;origin:[number,number];componentGeometry:unknown;sourceFeature:unknown;batches:readonly {positions:Float32Array|number[];normals:Float32Array|number[];indices:Uint32Array|number[];color:Float32Array|readonly number[]}[]};
/** Full original SOURCE feature comparison, including a distinct source geometry and all tags.
 * Deliberately excludes DISPLAY estimates. Invalid/cyclic replacement values fail closed. */
export function commerzbankSourceCanonical(value:unknown,depth=0):string{
 if(depth>40)throw Error('SOURCE feature exceeds canonical depth');
 if(value===null)return 'null';
 if(typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Nonfinite SOURCE value');return Object.is(value,-0)?'-0':String(value);}
 if(Array.isArray(value))return '['+value.map(v=>commerzbankSourceCanonical(v,depth+1)).join(',')+']';
 if(value&&typeof value==='object'&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+commerzbankSourceCanonical((value as Record<string,unknown>)[k],depth+1)).join(',')+'}';
 throw Error('Unsupported SOURCE feature value');
}

const originalArrays=COMMERZBANK_PARENT_MEMBERS.map(member=>member.batches.map(b=>{
 const decode=(s:string)=>{const t=atob(s),bytes=Uint8Array.from(t,c=>c.charCodeAt(0));return new DataView(bytes.buffer);};
 return {positions:decode(b.positionsBase64),normals:decode(b.normalsBase64),indices:decode(b.indicesBase64),color:b.color};
}));
/** Exact original values as well as the established runtime signature; leaf SHA is provenance from
 * the loader's verified native bytes. Optional callers with a leaf binding verify it again. */
export function commerzbankExactOriginalMatches(c:NativeComponent,member:typeof COMMERZBANK_PARENT_MEMBERS[number]){
 if(nativePaintSignature(c as any)!==member.signature||c.origin.length!==member.origin.length||!c.origin.every((v,i)=>Object.is(v,member.origin[i]))||commerzbankSourceCanonical(c.componentGeometry)!==member.componentGeometryCanonical||commerzbankSourceCanonical(c.sourceFeature)!==member.sourceFeatureCanonical||c.batches.length!==member.batches.length)return false;
 const expected=originalArrays[COMMERZBANK_PARENT_MEMBERS.indexOf(member)];if(!expected)return false;
 return c.batches.every((b,i)=>{
  const e=expected[i];if(b.color.length!==e.color.length||!b.color.every((v,j)=>Object.is(v,e.color[j])))return false;
  return (['positions','normals','indices']as const).every(k=>{const a=b[k],view=e[k];if(a.length*4!==view.byteLength)return false;for(let j=0;j<a.length;j++)if(!Object.is(a[j],k==='indices'?view.getUint32(j*4,true):view.getFloat32(j*4,true)))return false;return true;});
 });
}

/** Hold only the redundant 0..259m native envelope when every exact original member is present.
 * SOURCE rows, geometry buffers, identities and tags remain the original objects. No generated
 * geometry, fabricated relation membership, clipping, vertices, changed heights or material paint.
 * Append hiddenOutlines to the existing native display plan; do not replace the SOURCE input rows. */
export function commerzbankParentDisplayPlan<T extends NativeComponent>(components:readonly T[],ctx:{city:string;leafSHA?:(c:T)=>string|undefined}){
 const diagnostic={previewCandidateOnly:true,actualVisualAccepted:false,active:false,reason:'wrong-city',requiredMembers:COMMERZBANK_PARENT_MEMBERS.length,verifiedMembers:0,heldParentIdentity:{objectId:'osm/way/183060777',partId:'osm/way/183060777/component/832d07621aab6676b355'},sourceRetained:true,sourceArraysChanged:false,geometryAdded:false};
 const hiddenOutlines:T[]=[];
 if(ctx.city!=='frankfurt')return {hiddenOutlines,diagnostic};
 const ids=new Map<string,T[]>();for(const c of components){const key=c.objectId+'|'+c.partId;if(!ids.has(key))ids.set(key,[]);ids.get(key)!.push(c);}
 let parent:T|undefined;
 for(const member of COMMERZBANK_PARENT_MEMBERS){
  const rows=ids.get(member.objectId+'|'+member.partId);
  if(!rows||rows.length!==1){diagnostic.reason=rows?'duplicate-member:'+member.objectId:'missing-member:'+member.objectId;return {hiddenOutlines,diagnostic};}
  const c=rows[0];
  try{
   if(c.city!=='frankfurt'||ctx.leafSHA&&ctx.leafSHA(c)!==member.leafSHA){diagnostic.reason='source-binding-mismatch:'+member.objectId;return {hiddenOutlines,diagnostic};}
   if(!commerzbankExactOriginalMatches(c,member)){diagnostic.reason='native-geometry-mismatch:'+member.objectId;return {hiddenOutlines,diagnostic};}
   if(commerzbankSourceCanonical(c.sourceFeature)!==member.sourceFeatureCanonical){diagnostic.reason='source-feature-mismatch:'+member.objectId;return {hiddenOutlines,diagnostic};}
  }catch{diagnostic.reason='invalid-member:'+member.objectId;return {hiddenOutlines,diagnostic};}
  diagnostic.verifiedMembers++;
  if(c.objectId===diagnostic.heldParentIdentity.objectId)parent=c;
 }
 if(!parent){diagnostic.reason='parent-not-verified';return {hiddenOutlines,diagnostic};}
 hiddenOutlines.push(parent);diagnostic.active=true;diagnostic.reason='exact-23-source-compound-envelope';
 return {hiddenOutlines,diagnostic};
}
