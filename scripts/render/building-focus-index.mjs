import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const shaPattern=/^[a-f0-9]{64}$/;
const fail=message=>{throw Error(message);};
const identity=leaf=>JSON.stringify([leaf.id,leaf.sha256]);
const partitionPattern=/^[A-Za-z0-9_.:\/-]{1,256}$/;
/** Geometry LOD of a canonical descriptor exactly as the runtime normalizes it:
 * explicit `lod`, or the partition-page alias form (supported 1-3, actual 1). */
function canonicalLod(leaf){
 const lod=leaf.lod??(JSON.stringify(leaf.supported_lods)==='[1,2,3]'&&leaf.actual_geometry_lod===1?1:undefined);
 if(![1,2,3].includes(lod))fail('Invalid canonical focus leaf LOD');
 return lod;
}
/** Build download-free object/leaf closure from the existing, verified demand
 * documents. The caller supplies the COMPLETE canonical manifest leaf set
 * (enumerateBuildingDetailLeaves rows, including their partition chain); a
 * variant-only catalogue must not be mistaken for whole-city metadata.
 * A leaf's partition is the id of the index partition that lists it (null for
 * a flat manifest), so a consumer can read exactly that one validated page to
 * obtain the real descriptor of an out-of-view dependency member.
 * Objects are joined only within one geometry LOD: the same OSM object in a
 * coarser/finer shard is an alternative, never a missing part.
 * This proves source-object closure, not derived/native-owner cohort closure.
 * Runtime owner dependencies must still be added before sparse admission. */
export function buildBuildingFocusIndex({city,canonicalIndexSHA256,expectedLeaves,documents}){
 if(!/^[a-z][a-z-]+$/.test(city)||!shaPattern.test(canonicalIndexSHA256)||!Array.isArray(expectedLeaves)||!expectedLeaves.length)fail('Invalid focus source context');
 const expected=new Map();
 for(const row of expectedLeaves){
  const leaf=row?.leaf??row,chain=row?.indexChain??[];
  if(typeof leaf.id!=='string'||!leaf.id||leaf.id.length>512||!shaPattern.test(leaf.sha256)||expected.has(leaf.id))fail('Invalid or duplicate canonical focus leaf');
  if(!Array.isArray(chain)||chain.length>1)fail('Unsupported canonical focus partition depth');
  const partition=chain.length?chain[0]?.id:null;
  if(partition!==null&&(typeof partition!=='string'||!partitionPattern.test(partition)))fail('Invalid canonical focus partition id');
  expected.set(leaf.id,{id:leaf.id,sha256:leaf.sha256,lod:canonicalLod(leaf),partition});
 }
 const leaves=[],objects=new Map(),seen=new Set();
 for(const {asset,bytes} of documents){
  if(!asset||typeof asset.path!=='string'||!/^\/safety\/buildings3d\/[A-Za-z0-9_.\/-]+\.json$/.test(asset.path)||asset.path.split('/').some(part=>part==='..'||part==='.')||!(bytes instanceof Uint8Array)||bytes.byteLength>500000||asset.bytes!==bytes.byteLength||!shaPattern.test(asset.sha256)||createHash('sha256').update(bytes).digest('hex')!==asset.sha256)fail('Focus demand bytes/hash mismatch');
  const d=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(d.schema!=='crimemaps-building-detail-demand-v1'||d.schemaVersion!==1||d.city!==city||d.canonicalIndex?.sha256!==canonicalIndexSHA256)fail('Focus demand source context mismatch');
  const leaf=d.canonicalLeaf,wanted=expected.get(leaf?.id);
  if(!wanted||wanted.sha256!==leaf.sha256||seen.has(leaf.id))fail('Focus demand missing, stale or duplicate leaf');
  seen.add(leaf.id);
  if(!Array.isArray(d.components)||!d.components.length||d.components.length>20000)fail('Invalid focus components');
  const parts=new Set(),key=identity(leaf),components=[];
  for(const component of d.components){
   const {objectId,partId,origin,box}=component;
   if(!/^osm\/(node|way|relation)\/[1-9]\d*$/.test(objectId)||typeof partId!=='string'||!partId||parts.has(JSON.stringify([objectId,partId])))fail('Invalid or duplicate focus component');
   if(!Array.isArray(origin)||origin.length!==2||!origin.every(Number.isFinite)||Math.abs(origin[0])>180||Math.abs(origin[1])>=90||!Array.isArray(box)||box.length!==6||!box.every(Number.isFinite)||box.slice(0,3).some((n,i)=>n>box[i+3]))fail('Invalid focus component bounds');
   parts.add(JSON.stringify([objectId,partId]));components.push({objectId,partId,origin:[...origin],box:[...box]});
   const group=JSON.stringify([wanted.lod,objectId]),members=objects.get(group)??{objectId,keys:new Set()};members.keys.add(key);objects.set(group,members);
  }
  leaves.push({key,id:leaf.id,sha256:leaf.sha256,partition:wanted.partition,demandIndex:{path:asset.path,bytes:asset.bytes,sha256:asset.sha256},components});
 }
 if(seen.size!==expected.size)fail(`Incomplete focus metadata: ${seen.size}/${expected.size} leaves`);
 leaves.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
 // One object id can legitimately recur in separate LOD families; each family
 // is a separate dependency row with the same objectId.
 const dependencies=[...objects.values()].filter(row=>row.keys.size>1).map(row=>({objectId:row.objectId,leafKeys:[...row.keys].sort()})).sort((a,b)=>a.objectId<b.objectId?-1:a.objectId>b.objectId?1:a.leafKeys[0]<b.leafKeys[0]?-1:1);
 return{schema:'crimemaps-building-focus-source-index-v2',schemaVersion:2,city,canonicalIndexSHA256,leafCount:leaves.length,leaves,dependencies,scope:'complete-canonical-source-object-membership-per-lod',requiresRuntimeOwnerCohorts:true};
}

/** Publish small hash-addressed metadata leaves and bounded lookup pages. No
 * root/page contains the city's full component list; dependency closure travels
 * only with the affected leaf, together with the partition locator of every
 * dependency member. Leaf documents are physical gzip files (deterministic,
 * level 9, mtime 0) bound by both wire and uncompressed SHA-256; the small root
 * and lookup pages stay plain JSON. Returned buffers are offline artifacts. */
export function paginateBuildingFocusIndex(index){
 if(index?.schema!=='crimemaps-building-focus-source-index-v2'||index.schemaVersion!==2||!shaPattern.test(index.canonicalIndexSHA256)||!/^[a-z][a-z-]+$/.test(index.city)||index.leafCount!==index.leaves?.length)fail('Invalid focus source index');
 const base=`/safety/buildings3d/focus/${index.city}/${index.canonicalIndexSHA256}`,assets=[],buckets=new Map(),links=new Map(),byKey=new Map(index.leaves.map(leaf=>[leaf.key,leaf]));
 if(byKey.size!==index.leafCount)fail('Duplicate focus pagination leaf');
 for(const group of index.dependencies){
  if(!group.leafKeys?.length||group.leafKeys.some(key=>!byKey.has(key)))fail('Incomplete focus source dependency');
  for(const key of group.leafKeys){const rows=links.get(key)??[];rows.push(group);links.set(key,rows);}
 }
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 const emit=(value,limit,gzip=false)=>{
  const raw=Buffer.from(JSON.stringify(value)+'\n');if(raw.length>limit)fail('Focus metadata page exceeds byte bound');
  if(!gzip){const sha256=sha(raw),asset={path:`${base}/${sha256}.json`,sha256,bytes:raw.length};assets.push({asset,bytes:raw});return asset;}
  const wire=gzipSync(raw,{level:9}),sha256=sha(wire);
  const asset={path:`${base}/${sha256}.json.gz`,sha256,bytes:wire.length,compression:'gzip',uncompressed_bytes:raw.length,uncompressed_sha256:sha(raw)};
  assets.push({asset,bytes:wire});return asset;
 };
 for(const leaf of index.leaves){
  const groups=links.get(leaf.key)??[],members=[...new Set(groups.flatMap(group=>group.leafKeys))].sort();
  const asset=emit({schema:'crimemaps-building-focus-leaf-v2',schemaVersion:2,city:index.city,canonicalIndexSHA256:index.canonicalIndexSHA256,
   leaf:{key:leaf.key,id:leaf.id,sha256:leaf.sha256,partition:leaf.partition},components:leaf.components,sourceObjectDependencies:groups,
   dependencyLocators:members.map(key=>({key,partition:byKey.get(key).partition})),requiresRuntimeOwnerCohorts:true},500000,true);
  const prefix=createHash('sha256').update(JSON.stringify([index.canonicalIndexSHA256,leaf.sha256,leaf.id])).digest('hex').slice(0,2);
  const rows=buckets.get(prefix)??[];rows.push({id:leaf.id,sha256:leaf.sha256,asset});buckets.set(prefix,rows);
 }
 const pages=[...buckets].sort(([a],[b])=>a<b?-1:1).map(([prefix,entries])=>({prefix,asset:emit({schema:'crimemaps-building-focus-page-v2',schemaVersion:2,city:index.city,canonicalIndexSHA256:index.canonicalIndexSHA256,entries},100000)}));
 const root=emit({schema:'crimemaps-building-focus-catalog-v2',schemaVersion:2,city:index.city,canonicalIndexSHA256:index.canonicalIndexSHA256,leafCount:index.leafCount,pages,requiresRuntimeOwnerCohorts:true},100000);
 return{root,assets};
}
