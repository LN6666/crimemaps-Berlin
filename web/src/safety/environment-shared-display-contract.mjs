export const SHARED_DISPLAY_CONTRACT='approved-source-municipal-shared-display-v1';
const SHA=/^[a-f0-9]{64}$/;
const need=(v,m)=>{if(!v)throw Error('Shared display contract: '+m);};
export function validateSharedDisplayDomain(domain,decoded,binding){
 need(domain&&domain.contract===SHARED_DISPLAY_CONTRACT,'explicit version required');
 for(const k of ['inputBundleSHA256','sourceFeatureSHA256','originalSourceGeometrySHA256','approvedDisplayGeometrySHA256','nativeDescriptorSHA256','boundarySHA256'])need(SHA.test(domain[k]),k);
 need(domain.boundarySHA256===binding.boundarySHA256&&decoded.boundarySHA256===domain.boundarySHA256,'boundary identity');
 need(/^osm\/(way|relation)\/[0-9]+$/.test(domain.featureId),'source feature identity');
 need(Number.isSafeInteger(domain.nativeFeatureOrdinal)&&domain.nativeFeatureOrdinal>=0,'native ordinal');
 need(Number.isSafeInteger(domain.manifestOrdinal)&&domain.manifestOrdinal>=0&&domain.manifestOrdinal<19,'fixed complete19 manifest ordinal');
 need(domain.sourceHeldPreserved===true&&domain.upstreamClipRevalidated===false,'no inherited source recovery');
 need(Number.isInteger(domain.role)&&domain.role>=3&&domain.role<=6,'material role');
 need(Number.isSafeInteger(decoded.vertexCount)&&decoded.vertexCount>=3&&decoded.vertexCount<=20000,'explicit vertex cap');
 need(Array.isArray(decoded.origin)&&decoded.origin.length===2&&decoded.origin.every(Number.isFinite)&&Math.abs(decoded.origin[0])<=180&&Math.abs(decoded.origin[1])<=85&&decoded.origin[0]===binding.origin[0]&&decoded.origin[1]===binding.origin[1],'finite exact origin binding');
 need(Array.isArray(decoded.sourceFeatureIds)&&decoded.sourceFeatureIds.length===1&&decoded.sourceFeatureIds[0]===domain.featureId,'exact source feature ID binding');
 need(decoded.indices instanceof Uint32Array&&decoded.indices.length===0&&decoded.indexCount===0,'ring contract must not carry fictitious triangles');
 need(decoded.positions instanceof Float32Array&&decoded.positions.length===decoded.vertexCount*4+3,'actual packed positions');
 need(decoded.positions.at(-3)===0&&decoded.positions.at(-2)===1&&decoded.positions.at(-1)===0,'UP normal tail');
 let end=0,rings=0;
 for(const group of [domain.sourcePolygons,domain.municipalityPolygons]){
  need(Array.isArray(group)&&group.length>0&&group.length<=256,'component bound');
  for(const poly of group){need(Array.isArray(poly)&&poly.length>0&&poly.length<=256,'hole/ring bound');
   for(const ring of poly){need(ring&&Number.isSafeInteger(ring.first)&&ring.first===end&&Number.isSafeInteger(ring.count)&&ring.count>=3,'complete ordered ring spans');end+=ring.count;need(end<=decoded.vertexCount&&++rings<=1024,'ring/vertex bound');}
  }
 }
 need(end===decoded.vertexCount,'unattributed or missing packed vertices');
 for(let i=0;i<decoded.vertexCount;i++){const p=i*4;need(Number.isFinite(decoded.positions[p])&&Number.isFinite(decoded.positions[p+2])&&Object.is(decoded.positions[p+1],Math.fround(.01))&&decoded.positions[p+3]===domain.role,'packed point/role');}
 return true;
}
export function sharedDisplayMetadataBytes(domain){return 2048+32*[...domain.sourcePolygons,...domain.municipalityPolygons].reduce((n,p)=>n+p.length,0);}
