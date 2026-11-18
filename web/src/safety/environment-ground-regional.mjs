/** Metadata-only front end for environment-ground-regional-manifest-v1.
 * No geometry reader, decoder, publication, resource cache or scheduling loop.
 * The injected reader must use the existing admitted/verified metadata reader.
 * Its identity is the ACTUAL wire/raw identity, never an echo of the request.
 * The caller owns metadata/read claims (including on cancellation); retained
 * result metadata must remain charged until discarded. No old publication is
 * touched by this helper. A failed plan always has canReplacePublication=false.
 */
export const REGIONAL_GROUND_LIMITS = Object.freeze({
  vertices:20000, indices:60000, leaves:32, rawBytes:4*1024**2,
  metadataBytes:2*1024**2, metadataAssetBytes:1024**2, pages:16,
});
const SHA=/^[a-f0-9]{64}$/, ID=/^[A-Za-z0-9:._-]{1,256}$/;
const SOURCE_ID=/^osm\/(node|way|relation)\/[1-9]\d*$/;
const validatedRoots=new WeakSet();
const assetFields=['path','sha256','bytes','compression','uncompressed_bytes','uncompressed_sha256'];
function invalid(message){throw Error('Invalid regional green metadata: '+message);}
function record(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
function integer(v,min=0,max=Number.MAX_SAFE_INTEGER){return Number.isSafeInteger(v)&&v>=min&&v<=max;}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function checkpoint(signal){signal?.throwIfAborted();}
function hash(v){return typeof v==='string'&&SHA.test(v);}
function bbox(v){return Array.isArray(v)&&v.length===4&&v.every(Number.isFinite)&&v[0]>=-180&&v[2]<=180&&v[1]>=-85&&v[3]<=85&&v[0]<=v[2]&&v[1]<=v[3];}
function copyBox(v){if(!bbox(v))invalid('bbox');return Object.freeze([...v]);}
function intersects(a,b){return a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];}
function union(boxes){return [Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))];}
function rawBytes(asset){return asset.uncompressed_bytes??asset.bytes;}
function asset(v,city){
  if(!record(v)||typeof v.path!=='string'||!v.path.startsWith('/safety/environment/'+city+'/')||
     /[\\%?#\0]/.test(v.path)||v.path.split('/').some((p,i)=>i>0&&(!p||p==='.'||p==='..'))||
     !hash(v.sha256)||!integer(v.bytes,1,REGIONAL_GROUND_LIMITS.metadataAssetBytes))invalid('asset identity/path/size');
  if(v.compression!==undefined&&v.compression!=='gzip')invalid('asset compression');
  if(v.compression==='gzip'){
    if(!integer(v.uncompressed_bytes,1,REGIONAL_GROUND_LIMITS.metadataAssetBytes)||!hash(v.uncompressed_sha256))invalid('gzip raw identity');
  }else if(v.uncompressed_bytes!==undefined||v.uncompressed_sha256!==undefined){
    if(v.uncompressed_bytes!==v.bytes||v.uncompressed_sha256!==v.sha256)invalid('uncompressed asset identity');
  }
  return Object.freeze(Object.fromEntries(assetFields.filter(k=>v[k]!==undefined).map(k=>[k,v[k]])));
}
function sameAsset(a,b){return assetFields.every(k=>a[k]===b[k]);}
function source(v,expected,schema){
  if(!record(v)||v.schema!==schema||v.schema_version!==1||v.city!==expected.city||
     v.source_pbf_sha256!==expected.source_pbf_sha256||v.source_snapshot!==expected.source_snapshot||
     v.source_boundary_sha256!==expected.source_boundary_sha256)invalid('city/source/boundary/snapshot binding');
}
function sourceBinding(v){
  if(!record(v)||typeof v.city!=='string'||!/^[a-z][a-z0-9-]*$/.test(v.city)||
     !hash(v.source_pbf_sha256)||!hash(v.source_boundary_sha256)||typeof v.source_snapshot!=='string'||
     !v.source_snapshot||v.source_snapshot.length>128)invalid('expected source binding');
  return Object.freeze({city:v.city,source_pbf_sha256:v.source_pbf_sha256,
    source_snapshot:v.source_snapshot,source_boundary_sha256:v.source_boundary_sha256});
}

/** The expected root identities come from the current city/discovery binding.
 * Root bytes/SHA must already have been checked before parsing this object.
 * This makes immutable bounded projections, not a second copy of geometry.
 */
export function inspectRegionalGroundManifest(value,expected,{signal}={}){
  checkpoint(signal);
  const binding=sourceBinding(expected);
  source(value,binding,'environment-ground-regional-manifest-v1');
  const boundary=asset(value.city_boundary,binding.city),expectedBoundary=asset(expected.city_boundary,binding.city);
  const index=asset(value.source_index,binding.city),expectedIndex=asset(expected.source_index,binding.city);
  if(boundary.sha256!==binding.source_boundary_sha256||!sameAsset(boundary,expectedBoundary)||!sameAsset(index,expectedIndex)||
     index.path!==`/safety/environment/${binding.city}/index.json`||!record(value.discovery)||!record(expected.discovery)||
     !hash(value.discovery.stateSHA256)||!hash(value.discovery.coverageSHA256)||
     value.discovery.stateSHA256!==expected.discovery.stateSHA256||value.discovery.coverageSHA256!==expected.discovery.coverageSHA256)invalid('canonical source/discovery closure');
  const c=value.counts,keys=['inputDescriptors','processedDescriptors','uniqueGreen','acceptedGreen','heldGreen','pendingGreen','heldDescriptors','cohorts'];
  if(!record(c)||keys.some(k=>!integer(c[k]))||c.processedDescriptors>c.inputDescriptors||
     c.uniqueGreen!==c.acceptedGreen+c.heldGreen+c.pendingGreen||
     !['partial','complete'].includes(value.status)||
     ['discovery_complete','cohort_catalog_complete','source_coverage_complete'].some(k=>typeof value[k]!=='boolean'))invalid('coverage accounting');
  const complete=value.status==='complete';
  if(complete&&(!value.discovery_complete||!value.cohort_catalog_complete||!value.source_coverage_complete||
     c.processedDescriptors!==c.inputDescriptors||c.heldGreen||c.pendingGreen||c.heldDescriptors))invalid('false complete claim');
  if(!complete&&value.source_coverage_complete)invalid('partial source coverage claim');
  const represented=c.representedGreen??c.acceptedGreen;
  if(!integer(represented,c.acceptedGreen,c.acceptedGreen+c.heldGreen))invalid('represented source accounting');
  if(value.catalog_closed!==undefined&&typeof value.catalog_closed!=='boolean')invalid('catalog closure declaration');
  if(value.catalog_closed===true&&(!value.discovery_complete||!value.cohort_catalog_complete||
     c.processedDescriptors!==c.inputDescriptors||c.pendingGreen||c.heldDescriptors))invalid('false catalog closure');
  if(!Array.isArray(value.pages)||value.pages.length>5000||(c.cohorts>0)!==(value.pages.length>0)||
     (c.cohorts>0)!==(represented>0))invalid('page catalog');
  const ids=new Set(),paths=new Set();
  const pages=value.pages.map(p=>{
    checkpoint(signal);
    if(!record(p)||typeof p.id!=='string'||!ID.test(p.id)||ids.has(p.id))invalid('duplicate/invalid page id');
    const a=asset(p.asset,binding.city);if(paths.has(a.path))invalid('duplicate page asset');ids.add(p.id);paths.add(a.path);
    return Object.freeze({id:p.id,bbox:copyBox(p.bbox),asset:a});
  });
  if(value.held_pages!==undefined&&(!Array.isArray(value.held_pages)||value.held_pages.length>5000))invalid('held page catalog');
  const heldPages=(value.held_pages??[]).map(p=>{
    checkpoint(signal);
    if(!record(p)||typeof p.id!=='string'||!ID.test(p.id)||ids.has(p.id))invalid('duplicate/invalid held page id');
    const a=asset(p.asset,binding.city);if(paths.has(a.path))invalid('duplicate held page asset');ids.add(p.id);paths.add(a.path);
    return Object.freeze({id:p.id,bbox:copyBox(p.bbox),asset:a});
  });
  const result=Object.freeze({binding,source_index:index,city_boundary:boundary,
    discovery:Object.freeze({...value.discovery}),status:value.status,sourceCoverageComplete:complete,
    discoveryComplete:value.discovery_complete,cohortCatalogComplete:value.cohort_catalog_complete,
    catalogClosed:value.catalog_closed===true,heldPages:Object.freeze(heldPages),
    representedCountDeclared:integer(c.representedGreen),
    counts:Object.freeze({...Object.fromEntries(keys.map(k=>[k,c[k]])),representedGreen:represented}),pages:Object.freeze(pages)});
  validatedRoots.add(result);checkpoint(signal);return result;
}

function header(value,city){
  if(!record(value)||typeof value.id!=='string'||!ID.test(value.id)||!integer(value.feature_count,1,10000)||
     !integer(value.vertices,3,REGIONAL_GROUND_LIMITS.vertices)||!integer(value.index_count,3,REGIONAL_GROUND_LIMITS.indices)||value.index_count%3||
     !integer(value.raw_bytes,1,REGIONAL_GROUND_LIMITS.rawBytes)||!integer(value.leaves,1,REGIONAL_GROUND_LIMITS.leaves))invalid('cohort header/counts');
  return Object.freeze({id:value.id,bbox:copyBox(value.bbox),feature_count:value.feature_count,vertices:value.vertices,
    index_count:value.index_count,raw_bytes:value.raw_bytes,leaves:value.leaves,metadata:asset(value.metadata,city)});
}
function page(value,descriptor,root,signal){
  source(value,root.binding,'environment-ground-regional-page-v1');
  if(!Array.isArray(value.cohorts)||!value.cohorts.length||value.cohorts.length>10000)invalid('page cohorts');
  const ids=new Set(),paths=new Set();
  const result=value.cohorts.map(v=>{
    checkpoint(signal);const h=header(v,root.binding.city);
    if(ids.has(h.id)||paths.has(h.metadata.path))invalid('duplicate cohort id/metadata');ids.add(h.id);paths.add(h.metadata.path);return h;
  });
  if(!same(union(result.map(h=>h.bbox)),descriptor.bbox))invalid('page bbox does not cover its exact cohort union');
  return result;
}
function cohort(value,h,root){
  source(value,root.binding,'environment-ground-regional-cohort-v1');
  const c=value.counts;
  if(value.id!==h.id||!bbox(value.bbox)||!same(value.bbox,h.bbox)||!record(c)||c.features!==h.feature_count||
     c.vertices!==h.vertices||c.indices!==h.index_count||c.rawBytes!==h.raw_bytes||c.leaves!==h.leaves||
     !Array.isArray(value.source_feature_ids)||value.source_feature_ids.length!==h.feature_count||
     value.source_feature_ids.some(id=>typeof id!=='string'||!SOURCE_ID.test(id))||
     new Set(value.source_feature_ids).size!==value.source_feature_ids.length)invalid('cohort source IDs/counts/header');
  const ids=Object.freeze([...value.source_feature_ids]);
  if(!Array.isArray(value.canonical_ground_tiles)||!value.canonical_ground_tiles.length||value.canonical_ground_tiles.length>32)invalid('canonical cohort closure');
  const paths=new Set();let features=0;
  const canonical=value.canonical_ground_tiles.map(v=>{
    const a=asset(v,root.binding.city);
    if(paths.has(a.path)||typeof v.id!=='string'||!v.id||typeof v.tile_key!=='string'||!v.tile_key||!bbox(v.bbox)||
       !integer(v.feature_count,1,h.feature_count)||!record(v.kinds)||v.kinds.green!==v.feature_count||
       Object.keys(v.kinds).some(k=>k!=='green'&&v.kinds[k]!==0))invalid('canonical green tile identity');
    paths.add(a.path);features+=v.feature_count;
    return Object.freeze({...a,id:v.id,tile_key:v.tile_key,bbox:copyBox(v.bbox),feature_count:v.feature_count,kinds:Object.freeze({green:v.feature_count})});
  });
  const packed=value.ground_far_mesh===undefined?undefined:asset(value.ground_far_mesh,root.binding.city);
  if(packed&&paths.has(packed.path))invalid('canonical/packed asset collision');
  const assets=packed?[...canonical,packed]:canonical;
  if(features!==h.feature_count||assets.length!==h.leaves||assets.reduce((n,a)=>n+rawBytes(a),0)!==h.raw_bytes)invalid('canonical/packed cost closure');
  if(!same(union(canonical.map(a=>a.bbox)),h.bbox))invalid('canonical tile bbox union differs from actual cohort bbox');
  const provenance=asset(value.provenance,root.binding.city);
  if(value.source_feature_bindings_sha256!==provenance.sha256||paths.has(provenance.path)||packed?.path===provenance.path)invalid('source occurrence provenance binding');
  return Object.freeze({...h,source_feature_ids:ids,canonical_ground_tiles:Object.freeze(canonical),
    ...(packed?{ground_far_mesh:packed}:{}),provenance,source_feature_bindings_sha256:provenance.sha256});
}
function totals(headers){return Object.freeze(headers.reduce((c,h)=>({vertices:c.vertices+h.vertices,indices:c.indices+h.index_count,
  rawBytes:c.rawBytes+h.raw_bytes,leaves:c.leaves+h.leaves,features:c.features+h.feature_count}),{vertices:0,indices:0,rawBytes:0,leaves:0,features:0}));}
function failures(c){return Object.entries(REGIONAL_GROUND_LIMITS).filter(([k,max])=>k in c&&c[k]>max).map(([k])=>k);}
function plan(status,reason,headers=[],extra={}){const replace=status==='complete'||status==='partial-source-held';return Object.freeze({status,reason,canReplacePublication:replace,
  keepPreviousPublication:!replace,requiredCohortIds:Object.freeze(headers.map(h=>h.id)),
  cohorts:Object.freeze([]),totals:totals(headers),...extra});}

/** Read just ALL intersecting page/cohort metadata, or refuse before exceeding
 * the original metadata and output caps. Never sort by priority or truncate.
 * readMetadata(asset, signal) => null (unavailable) OR {value, identity:Asset}.
 * identity must come from existing actual wire+raw verification. No native leaf
 * or mesh is read here. Provenance stays pinned, not independently re-audited.
 */
export async function selectRegionalGroundCohorts(root,viewport,options={}){
  return selectValidated(root,viewport,options,false);
}

/** Explicit accepted-cohort display plan for a CLOSED catalog with source-held
 * features. It does not reclassify held features as excluded or rendered. The
 * default option preserves the strict selector's partial-root refusal. Held
 * counts/pointers are from the pinned root; this does not read held geometry or
 * prove which held features intersect this viewport.
 */
export async function planRegionalGroundCohorts(root,viewport,{allowCatalogClosedSourceHeld=false,...options}={}){
  if(typeof allowCatalogClosedSourceHeld!=='boolean')invalid('explicit source-held planning option');
  const result=await selectValidated(root,viewport,options,allowCatalogClosedSourceHeld);
  return result.status==='complete'?Object.freeze({...result,coverageComplete:true,sourceHeldGreen:0}):result;
}

async function selectValidated(root,viewport,{readMetadata,signal}={},allowSourceHeld){
  if(!validatedRoots.has(root))invalid('root was not inspected by this helper');
  if(!bbox(viewport)||typeof readMetadata!=='function')invalid('viewport/verified metadata reader');
  let selected=[],metadataBytes=0,reads=0;
  try{
    checkpoint(signal);
    const sourceHeld=allowSourceHeld&&!root.sourceCoverageComplete&&root.catalogClosed&&root.discoveryComplete&&
      root.cohortCatalogComplete&&root.counts.processedDescriptors===root.counts.inputDescriptors&&
      root.counts.pendingGreen===0&&root.counts.heldDescriptors===0&&root.counts.heldGreen>0&&root.representedCountDeclared;
    if(!root.sourceCoverageComplete&&!sourceHeld)return plan('missing','source-coverage-incomplete');
    if(sourceHeld&&!root.heldPages.length)return plan('missing','source-held-page-catalog-unavailable');
    const selectedPages=root.pages.filter(p=>intersects(p.bbox,viewport));
    const pageBytes=selectedPages.reduce((n,p)=>n+rawBytes(p.asset),0);
    if(selectedPages.length>REGIONAL_GROUND_LIMITS.pages||pageBytes>REGIONAL_GROUND_LIMITS.metadataBytes)
      return plan('unfit','complete-intersecting-pages-exceed-metadata-budget',[],{requiredPageIds:Object.freeze(selectedPages.map(p=>p.id)),metadataBytes:pageBytes});
    async function read(a){
      checkpoint(signal);const result=await readMetadata(a,signal);checkpoint(signal);reads++;
      if(result===null||result===undefined)return undefined;
      if(!record(result)||!sameAsset(asset(result.identity,root.binding.city),a))invalid('actual metadata identity mismatch');
      metadataBytes+=rawBytes(a);return result.value;
    }
    const allHeaders=[],ids=new Set(),paths=new Set();
    for(const p of selectedPages){
      const value=await read(p.asset);if(value===undefined)return plan('missing','intersecting-page-unavailable',[],{metadataReads:reads,metadataBytes});
      for(const h of page(value,p,root,signal)){
        if(ids.has(h.id)||paths.has(h.metadata.path))invalid('cohort duplicated across selected pages');ids.add(h.id);paths.add(h.metadata.path);allHeaders.push(h);
      }
    }
    if(allHeaders.length>root.counts.cohorts||allHeaders.reduce((n,h)=>n+h.feature_count,0)>root.counts.representedGreen)invalid('page/root represented counts');
    if(selectedPages.length===root.pages.length&&(allHeaders.length!==root.counts.cohorts||allHeaders.reduce((n,h)=>n+h.feature_count,0)!==root.counts.representedGreen))invalid('complete catalog count closure');
    selected=allHeaders.filter(h=>intersects(h.bbox,viewport));
    const counts=totals(selected),over=failures(counts),cohortMetadataBytes=selected.reduce((n,h)=>n+rawBytes(h.metadata),0);
    if(over.length)return plan('unfit','complete-intersecting-cohorts-exceed-output-budget',selected,{exceeded:Object.freeze(over),metadataReads:reads,metadataBytes});
    if(metadataBytes+cohortMetadataBytes>REGIONAL_GROUND_LIMITS.metadataBytes)
      return plan('unfit','complete-cohort-metadata-exceeds-budget',selected,{metadataReads:reads,metadataBytes:metadataBytes+cohortMetadataBytes});
    const result=[],featureIds=new Set(),assetPaths=new Set();
    for(const h of selected){
      const value=await read(h.metadata);if(value===undefined)return plan('missing','intersecting-cohort-unavailable',selected,{metadataReads:reads,metadataBytes});
      const checked=cohort(value,h,root);
      for(const id of checked.source_feature_ids){if(featureIds.has(id))invalid('source feature repeated across intersecting cohorts');featureIds.add(id);}
      for(const a of [...checked.canonical_ground_tiles,...(checked.ground_far_mesh?[checked.ground_far_mesh]:[])]){
        if(assetPaths.has(a.path))invalid('canonical/packed asset repeated across cohorts');assetPaths.add(a.path);
      }
      result.push(checked);checkpoint(signal);
    }
    checkpoint(signal);
    if(sourceHeld)return plan('partial-source-held','all-accepted-intersecting-cohorts-fit-with-explicit-source-held',selected,
      {cohorts:Object.freeze(result),metadataReads:reads,metadataBytes,coverageComplete:false,sourceCoverageComplete:false,
       sourceHeldGreen:root.counts.heldGreen,heldCountScope:'global-pinned-catalog; viewport-held-membership-not-read',
       representedSourceGreen:root.counts.representedGreen,acceptedWholeSourceGreen:root.counts.acceptedGreen,
       heldPageCandidates:Object.freeze(root.heldPages.filter(p=>intersects(p.bbox,viewport))),
       geometryDecoded:false,fullCityOverviewRenderingAccepted:false});
    return plan('complete','all-intersecting-cohorts-fit',selected,{cohorts:Object.freeze(result),metadataReads:reads,metadataBytes,
      sourceCoverageComplete:true,geometryDecoded:false,fullCityOverviewRenderingAccepted:false});
  }catch(error){
    if(signal?.aborted||error?.name==='AbortError')return plan('cancelled','request-cancelled',selected,{metadataReads:reads,metadataBytes});
    throw error;
  }
}
