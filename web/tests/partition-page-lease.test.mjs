import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// Partition read contract (painted/*/safety/three-dimensional-partitions.ts): read()
// returns the parsed page with the page-ledger claim holding its working set. The
// partition owner shrinks that claim to the rows' retained estimate (identity: the
// rows array) once the rows exist, and returns it when the page leaves its cache,
// on clear(), or at once for a rejected, aborted or superseded page. The actual
// partition owner of every family runs against the actual page ledger.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),src=(...parts)=>path.join(web,'src',...parts);
const families=['root500','infill','bremen','city','tier300','church','delegated500'],copies=['root500','city','tier300','church','delegated500'];
const MiB=1024**2;
const sha=value=>createHash('sha256').update(value).digest('hex');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function loader(){
 const cache=new Map();
 return function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  new Function('require','module','exports',compiled.outputText)(request=>{
   assert.ok(request.startsWith('.'),'runtime dependency must be local: '+request);
   const base=path.resolve(path.dirname(file),request);
   for(const candidate of [base+'.ts',path.join(base,'index.ts')])if(fs.existsSync(candidate))return load(candidate);
   throw Error('Unresolved '+request+' from '+file);
  },module,module.exports);
  return module.exports;
 };
}
const load=loader();
const {createResourceBudget}=load(src('safety','render-runtime','resource-budget.ts'));
const owners=Object.fromEntries(families.map(family=>[family,load(src('painted',family,'safety','three-dimensional-partitions.ts'))]));
const {estimateRetainedBuildingPayload}=load(src('painted','root500','safety','building-payload-cost.ts'));
const view=budget=>{const s=budget.stats,c=name=>s.categories[name]?.bytes??0;return{bytes:s.bytes,metadata:c('metadata'),construction:c('construction'),decoded:c('decoded'),reservations:s.reservations};};

const CITY='berlin',SOURCE=sha('fixture source'),BOUNDARY=sha('fixture boundary');
const leaf=(id,bbox)=>({id,tile_key:id,path:'/safety/buildings3d/berlin/'+id+'.json',sha256:sha(id),bytes:100,vertices:3,bbox,lod:1});
function pages(count){
 return Array.from({length:count},(_,i)=>{const w=13+i*0.1,bbox=[w,52,w+0.1,52.1],rows=[leaf('leaf-'+i+'-a',[w,52,w+0.05,52.05]),leaf('leaf-'+i+'-b',[w+0.05,52.05,w+0.1,52.1])];
  return{part:{id:'partition-'+i,bbox,path:'/safety/buildings3d/berlin/partition-'+i+'.json',sha256:sha('partition '+i),bytes:512},value:{schema_version:1,city:CITY,source_pbf_sha256:SOURCE,city_boundary_sha256:BOUNDARY,bbox_kind:'compiled-mesh-ground-envelope',shards:rows}};});
}
// The read side as the managers hand it over: the page's parse working set is
// admitted before the value exists and passes, as a claim, to the owner.
function reader(budget,docs,{hold,events=[]}={}){
 const byId=new Map(docs.map(doc=>[doc.part.id,doc])),claims=[];
 const read=async(asset,signal)=>{
  const doc=byId.get(asset.id),claim=budget.reserve([{category:'construction',bytes:4096,precision:'estimate',label:'fixture page text'},{category:'decoded',bytes:8192,precision:'estimate',label:'fixture page graph'}],{label:'fixture page working set'});claims.push(claim);events.push(['read',asset.id]);
  try{if(hold){await hold.promise;}signal.throwIfAborted();return{value:structuredClone(doc.value),claim};}catch(error){claim.release();throw error;}
 };
 return{read,claims,events};
}
const install=(family,budget,docs,settings={})=>{const side=reader(budget,docs,settings);return{side,owner:owners[family].installThreeDimensionalPartitions({city:CITY,sourceHash:SOURCE,boundaryHash:BOUNDARY,partitions:docs.map(doc=>doc.part),mobile:settings.mobile??false,read:side.read,validateLeaf:value=>Boolean(value.id&&value.tile_key)})};};
const rowsEstimate=doc=>estimateRetainedBuildingPayload(doc.value.shards.map(row=>({...row,lod:row.lod}))).retainedPayloadEstimateBytes;
const box=(docs,from,to)=>[docs[from].part.bbox[0]+0.01,52.01,docs[to].part.bbox[2]-0.01,52.09];

test('five partition owner copies are one implementation and two families re-export it',()=>{
 const text=family=>fs.readFileSync(src('painted',family,'safety','three-dimensional-partitions.ts'),'utf8'),reference=text('root500');
 for(const family of copies)assert.equal(text(family),reference,family+' copy');
 for(const family of ['infill','bremen'])assert.equal(text(family).replace(/^\/\/.*\n/mg,'').trim(),"export * from '../../root500/safety/three-dimensional-partitions';",family+' re-export');
 assert(/read:\(asset:ThreeDIndexAsset,signal:AbortSignal\)=>Promise<ThreeDPartitionPageRead>/.test(reference),'read() returns the page with its claim');
});

test('a page claim becomes the rows\' retained estimate once rows exist, and a cache hit adds nothing',async()=>{
 for(const family of families){
  const budget=createResourceBudget({limitBytes:64*MiB}),docs=pages(2),{owner,side}=install(family,budget,docs);
  const result=await owner.resolve(box(docs,0,1),new AbortController().signal);
  assert.equal(result.shards.length,4,family);
  const expected=rowsEstimate(docs[0])+rowsEstimate(docs[1]);
  assert.deepEqual(view(budget),{bytes:expected,metadata:expected,construction:0,decoded:0,reservations:2},family+' each claim now holds only its rows\' estimate');
  assert.equal(owner.stats.retainedPayloadEstimateBytes,expected,family+' the owner\'s own estimate and the ledger agree');
  await owner.resolve(box(docs,0,1),new AbortController().signal);
  assert.deepEqual([side.events.length,view(budget).bytes,view(budget).reservations],[2,expected,2],family+' cached pages are neither read nor charged again');
  owner.clear();assert.deepEqual(view(budget),{bytes:0,metadata:0,construction:0,decoded:0,reservations:0},family+' clear() returns every page claim');
 }
});

test('an evicted page returns its claim; the cache never holds a claim for a page it dropped',async()=>{
 for(const family of families){
  const budget=createResourceBudget({limitBytes:64*MiB}),docs=pages(8),{owner}=install(family,budget,docs,{mobile:true});
  await owner.resolve(box(docs,0,5),new AbortController().signal);assert.equal(owner.stats.pages,6,family+' mobile cap');
  await owner.resolve(box(docs,6,7),new AbortController().signal);
  assert.equal(owner.stats.pages,6,family+' two oldest pages evicted');
  const kept=docs.slice(2).reduce((n,doc)=>n+rowsEstimate(doc),0);
  assert.deepEqual([view(budget).metadata,view(budget).reservations],[kept,6],family+' evicted pages\' claims are returned');
  owner.clear();assert.equal(budget.stats.bytes,0,family);
 }
});

test('a rejected, aborted or superseded page returns its claim at once and is not cached',async()=>{
 for(const family of families){
  const budget=createResourceBudget({limitBytes:64*MiB}),docs=pages(1);
  for(const corrupt of [value=>{value.city='hamburg';},value=>{value.shards[0].bbox=[0,0,1,1];},value=>{value.city_boundary_sha256=sha('other');}]){
   const bad=structuredClone(docs);corrupt(bad[0].value);const {owner}=install(family,budget,bad);
   await assert.rejects(owner.resolve(box(bad,0,0),new AbortController().signal),/Invalid3D partition/,family);
   assert.deepEqual([budget.stats.bytes,owner.stats.pages],[0,0],family+' a rejected page leaves no claim');
  }
  const hold=deferred(),controller=new AbortController(),{owner,side}=install(family,budget,docs,{hold});
  const reading=owner.resolve(box(docs,0,0),controller.signal);await tick();assert.equal(side.claims.length,1);
  controller.abort();hold.resolve();await assert.rejects(reading,{name:'AbortError'});assert.deepEqual([budget.stats.bytes,owner.stats.pages],[0,0],family+' an aborted page returns its claim');
  const later=deferred(),current=install(family,budget,docs,{hold:later}),pending=current.owner.resolve(box(docs,0,0),new AbortController().signal);await tick();
  current.owner.clear();later.resolve();const result=await pending;
  assert.equal(result.shards.length,2,family+' the caller still receives its rows');
  assert.deepEqual([budget.stats.bytes,current.owner.stats.pages],[0,0],family+' a page read across clear() is neither cached nor charged');
 }
});

test('concurrent reads of one page keep one cached claim',async()=>{
 for(const family of families){
  const budget=createResourceBudget({limitBytes:64*MiB}),docs=pages(1),hold=deferred(),{owner,side}=install(family,budget,docs,{hold});
  const both=[owner.resolve(box(docs,0,0),new AbortController().signal),owner.resolve(box(docs,0,0),new AbortController().signal)];await tick();
  assert.equal(side.claims.length,2);hold.resolve();await Promise.all(both);
  assert.deepEqual([owner.stats.pages,view(budget).metadata,view(budget).reservations],[1,rowsEstimate(docs[0]),1],family+' the replaced entry returned its claim');
  owner.clear();assert.equal(budget.stats.bytes,0,family);
 }
});

test('the seven managers hand the parse claim to the partition owner instead of returning it inside read()',()=>{
 for(const family of families){
  const text=fs.readFileSync(src('painted',family,'safety','three-dimensional-map.ts'),'utf8');
  assert(!/page\.claim\.release\(\)/.test(text),family);
  assert(/read:\(asset,signal\)=>retryManagerAdmission\(resources?(?:Store)?\.budget,signal,\(\)=>parseBootstrap\(asset\.path,asset,signal,1024\*\*2,'3D partition page',bytes=>checked\(bytes,asset,signal\)\)\)/.test(text),family+' read returns parseBootstrap\'s {value, claim}');
 }
});
