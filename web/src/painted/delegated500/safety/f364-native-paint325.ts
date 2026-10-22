import type{BuildingComponent}from'./building-mesh-renderer';
import{nativePaintSignature}from'./progressive-native-signature';
// Copy beside production safety modules; root supplies exact current signature.
// Candidate family null; no allocation and no derived meshes admitted.
function applyF364Native325(rows:any[], colors:Float32Array, frames:Float32Array, family:number|null, signature:(c:any)=>string, sourceProofVerified:boolean){
 if(!sourceProofVerified||family===null||!Number.isSafeInteger(family))return {applied:false};
 const matched=rows.filter(c=>c.city==='nuremberg'&&c.objectId==='osm/relation/7471820'&&c.partId==='osm/relation/7471820/component/4e8aef7d8eb02196ac80');
 if(matched.length!==1)return {applied:false};const c=matched[0];
 if(JSON.stringify(c.origin)!=='[11.08096505,49.4571088]'||signature(c)!=='5bb06e32')return {applied:false};
 const total=rows.reduce((n,c)=>n+c.batches.reduce((s:number,b:any)=>s+b.positions.length/3,0),0);if(colors.length!==total*4||frames.length!==total*5)return {applied:false};
 const b=c.batches[1];if(!b||b.positions.length/3<36)return {applied:false};
 let offset=0;for(const r of rows){if(r===c)break;offset+=r.batches.reduce((s:number,b:any)=>s+b.positions.length/3,0)}offset+=c.batches[0].positions.length/3;
 for(const first of [28,32])for(let i=first;i<first+4;i++){
  const x=b.positions[i*3],y=b.positions[i*3+1],z=b.positions[i*3+2],v=offset+i;
  colors.set([.60,.31,.23,2],v*4);frames.set([x*.9996810677107656+z*.025253967226232438+8.903065942784798,y,1,17.660633232831785,family],v*5);
 }
 return {applied:true,paintedVertices:8,nativeArraysChanged:false,derivedEnabled:false};
}

export function applyF364Paint325(rows:BuildingComponent[],colors:Float32Array,frames:Float32Array){const sourceVerified=rows.some(c=>c.city==='nuremberg'&&c.objectId==='osm/relation/7471820'&&c.partId==='osm/relation/7471820/component/4e8aef7d8eb02196ac80'&&JSON.stringify(c.origin)==='[11.08096505,49.4571088]'&&nativePaintSignature(c)==='5bb06e32');return applyF364Native325(rows,colors,frames,1686,nativePaintSignature,sourceVerified);}
