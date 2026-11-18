import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

// Actual recipes, verified frozen reads, scopes, page ledger/store and scheduled
// packing. Only the unrelated progressive shader preparation/table-count module
// is replaced; admission data still travels through the real verified reader.
const web=fileURLToPath(new URL('../',import.meta.url));
const built=await build({stdin:{contents:`
 export * as f257 from './src/painted/root500/safety/owner-f257-reconstruction';
 export * as f081 from './src/painted/infill/safety/owner-f081-completion';
 export * as f126 from './src/painted/root500/safety/owner-f126-completion';
 export * as f259 from './src/painted/root500/safety/owner-f259-reconstruction';
 export {createReconstructionNumericResource} from './src/safety/reconstruction-numeric-resource';
 export {BREMEN_DEMAND_METADATA} from './src/painted/bremen/safety/bremen-demand-metadata';
 export {INFILL_ADMISSIONS_RESOURCE} from './src/painted/infill/safety/progressive-paint-admissions';
 export {nativePaintSignature} from './src/painted/root500/safety/progressive-native-signature';
 export {createFrozenDataScope} from './src/safety/frozen-data-scope';
 export {createFrozenDataLeaseStore} from './src/safety/frozen-data-lease-store';
 export {createChunkResourceStore} from './src/safety/render-runtime/chunk-resource-store';
 export {createResourceBudget} from './src/safety/render-runtime/resource-budget';
 export {retainReconstructionResourceParents,retainReconstructionPreparedInputs,registerReconstructionResourceArrays} from './src/safety/reconstruction-resource-parents';
 export {acquirePackedMeshChunk} from './src/painted/root500/safety/chunk-mesh-packing';
`,resolveDir:web,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent',plugins:[{name:'no-shader-initialization',setup(builder){
 builder.onResolve({filter:/^\.\/progressive-paint$/},args=>args.importer.endsWith('/infill/safety/owner-f081-completion.ts')?{path:'progressive-preparation',namespace:'tiny-boundary'}:undefined);
 builder.onResolve({filter:/\/frozen-paint-tables$/},args=>args.importer.endsWith('/safety/progressive-paint-admissions.ts')?{path:'table-counts',namespace:'tiny-boundary'}:undefined);
 builder.onLoad({filter:/.*/,namespace:'tiny-boundary'},args=>({loader:'js',resolveDir:web,contents:args.path==='table-counts'?'export const frozenPaintTableRowCounts=()=>({});':`
  import {INFILL_ADMISSIONS_RESOURCE} from './src/painted/infill/safety/progressive-paint-admissions';
  export const prepareInfillProgressiveData=(rows,city,signal,scope)=>scope.prepareSelection(INFILL_ADMISSIONS_RESOURCE,rows.map(row=>row.city+'|'+row.objectId),signal);
 `}));
}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const requestSignal=()=>new AbortController().signal;
const rowKey=row=>row.objectId+'|'+row.partId;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const privateEntry=row=>row.label?.startsWith('["reconstruction-numeric-v1"');
const triangle=offset=>({positions:[offset,0,0,offset+1,0,0,offset,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.25,.5,.75],paint:Array(12).fill(.25),frames:Array.from({length:15},(_,i)=>i/4)});
const component=(identity,city,index)=>({city,objectId:identity.objectId,partId:identity.partId,origin:city==='bremen'?[8.8,53.1]:[11.57,48.13],componentGeometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[0,1],[0,0]]]},sourceFeature:{type:'Feature',properties:{name:'tiny-'+index},geometry:{type:'Polygon',coordinates:[]}},batches:[triangle(index)],displayEstimates:{}});

function fixture(kind,{partitioned=false}={}){
 const budget=api.createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:16*1024**2}),resources=api.createChunkResourceStore({budget}),events=[];
 const reserve=budget.reserve.bind(budget);budget.reserve=(costs,options)=>{const reservation=reserve(costs,options);events.push({label:options?.label,costs:[costs].flat(),reservation});return reservation;};
 const city=kind==='f257'?'bremen':'munich',identities=kind==='f257'?api.f257.F257_IDS:api.BREMEN_DEMAND_METADATA.f081Source;
 const rows=identities.map((id,index)=>component(id,city,index));let restore=()=>{};
 if(kind==='f257'){
  // Keep the actual all-71 identities/cohort guard. This fixture's expected
  // signatures are the real hash of its tiny SOURCE, not a signature stub.
  const signatures=identities.map(row=>row.signature);identities.forEach((row,index)=>row.signature=api.nativePaintSignature(rows[index]));
  restore=()=>identities.forEach((row,index)=>row.signature=signatures[index]);
 }
 const refs=kind==='f257'?api.f257.root500DataRefs:[...api.f081.infillDataRefs,api.INFILL_ADMISSIONS_RESOURCE];
 const source=kind==='f257'?Object.fromEntries(rows.map(row=>[row.partId,row])):rows.map(row=>({...row,geometrySignature:api.nativePaintSignature(row)}));
 const required=['osm/way/228534603','osm/way/225910817','osm/way/35903317'];
 const displays=kind==='f257'||partitioned?rows:rows.filter(row=>required.includes(row.objectId));assert.equal(kind==='f257'||partitioned||displays.length===3,true);
 const display=kind==='f257'?Object.fromEntries(displays.map((row,index)=>[row.partId,[triangle(index+100)]])):displays.map((row,index)=>({...row,batches:[triangle(index+100)]}));
 const values=kind==='f257'?[source,display]:[source,display,[]];
 const tables=values.map((value,index)=>{const raw=Buffer.from(JSON.stringify(value)),sha256=createHash('sha256').update(raw).digest('hex');return{ref:refs[index],raw,descriptor:{path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:raw.length}};});
 const partitions=new Map(),physical=[];
 if(partitioned)for(let index=0;index<2;index++){
  const parts=values[index].map((row,rowIndex)=>{const raw=Buffer.from(JSON.stringify([row])),sha256=createHash('sha256').update(raw).digest('hex'),descriptor={path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:raw.length};physical.push({raw,descriptor});return{descriptor,keys:[row.city+'|'+row.objectId],rowIndices:[rowIndex]};});
  partitions.set(refs[index].canonicalSHA256,{schemaVersion:1,kind:'object-rows',parts});
 }
 const frozen=api.createFrozenDataLeaseStore([...tables,...physical].map(row=>row.descriptor),{resourceStore:resources}),reads=[];
 const client=frozen.client({city,provider:kind==='f257'?'root500':'infill',profileSHA256:null,
  selection:{tables:tables.map(row=>row.descriptor.sha256),initializers:Object.fromEntries(tables.map(row=>[row.descriptor.sha256,{[row.ref.file]:1}]))},
  resolve:canonical=>tables.find(row=>row.ref.canonicalSHA256===canonical)?.descriptor.sha256,
  partition:canonical=>partitions.get(canonical),
  async read(path,signal,max){signal.throwIfAborted();const table=[...tables,...physical].find(row=>row.descriptor.path===path);assert(table);assert.equal(max,table.raw.length);reads.push(path);return table.raw;},
 });
 const scopes=[];
 const createScope=()=>{const scope=api.createFrozenDataScope(client);scopes.push(scope);return scope;};
 const ingress=resources.acquire({contentKey:'tiny-verified-ingress:'+city,role:'source',estimate:{category:'decoded',bytes:rows.length*1024,precision:'estimate'},produce:()=>rows});
 const prepare=async(scope,input=rows)=>{if(kind==='f257')await api.f257.prepareRoot500Data(input,requestSignal(),scope);else await api.f081.prepareInfillData(input,requestSignal(),scope);};
 const reconstruct=(scope,input=rows)=>kind==='f257'?api.f257.ownerF257Reconstruction(input,scope):api.f081.ownerF081CompletionReconstruction(input,scope);
 const retire=scope=>{const retirement=kind==='f257'?api.f257.root500ConstructionRetirement:api.f081.infillDataConstructionRetirement;scope.retirePrepared(retirement.refs,retirement.memoKeys);};
 return{kind,city,rows,displays,display,refs,budget,resources,frozen,events,reads,ingress,createScope,prepare,reconstruct,retire,
  close(){for(const scope of scopes)scope.release();ingress.release();resources.evictRecent();client.dispose();frozen.destroy();resources.destroy();restore();assert.equal(budget.stats.bytes,0);},
 };
}

function pack(f,scope,components,{signal,fail=false,context={isContextLost:()=>false}}={}){
 const {parents,authority}=api.retainReconstructionResourceParents(scope,components);
 const group={contentKey:'tiny-verified-ingress-group:'+components.map(rowKey).join(','),components,parents:[f.ingress,...parents],frame:{origin:f.rows[0].origin,unit:1e7,authority:'tiny-authoritative-frame'},cohortKeys:[],materialAuthority:'tiny-original-material',recipeAuthority:JSON.stringify(['tiny-recipe',authority]),selectedLOD:0};
 try{return api.acquirePackedMeshChunk(f.resources,context,{provider:f.kind,group,components,batchIncluded:()=>true,
  materials(rows){if(fail)throw Error('controlled material failure');const count=rows.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0),paint=new Float32Array(count*5),progressive=new Float32Array(count*4);
   if(f.kind==='f257')api.f257.ownerF257BaseMaterials(rows,progressive,paint);else api.f081.ownerF081CompletionMaterials(rows,progressive,paint,scope);
   return{paint,progressive,auxiliary:undefined};
  },styles:()=>({wall:1,roof:2,landmark:false,sourceGlassRoof:false}),runs:indices=>[{key:'base',firstIndex:0,indexCount:indices.length}],sourceCurrent(){assert.equal(scope.stats.disposed,false);},retainSource:()=>scope.retain(),
 },signal,()=>{});}finally{for(const parent of parents)parent.release();}
}
function observeFloatCopies(run){
 const original=globalThis.Float32Array;let copies=0;
 globalThis.Float32Array=new Proxy(original,{construct(target,args,newTarget){copies++;return Reflect.construct(target,args,newTarget);}});
 try{return{value:run(),copies};}finally{globalThis.Float32Array=original;}
}
function referenceKey(scope,ref){const lease=scope.retainResource(ref,'dependency');try{return lease.contentKey;}finally{lease.release();}}

for(const kind of ['f257','f081'])test(kind+' real recipe aliases stay charged through packing, construction retirement, selected, main, recent and eviction',async()=>{
 const f=fixture(kind);let packed,selected,main;
 try{
  const scope=f.createScope();await f.prepare(scope);const result=f.reconstruct(scope);assert.equal(result.stats.error,undefined);
  const displayIds=new Set(f.displays.map(rowKey)),row=result.components.find(row=>displayIds.has(rowKey(row))),sourceKey=referenceKey(scope,f.refs[0]),displayKey=referenceKey(scope,f.refs[1]);
  const sourceCharge=f.events.find(event=>event.label===sourceKey).reservation,displayCharge=f.events.find(event=>event.label===displayKey).reservation;
  const expected=kind==='f257'?f.display[row.partId][0]:f.display.find(value=>value.objectId===row.objectId).batches[0];
  assert.deepEqual(Array.from(row.batches[0].positions),Array.from(new Float32Array(expected.positions)));assert.deepEqual(Array.from(row.batches[0].indices),expected.indices);
  packed=pack(f,scope,[row]);await packed.ready;assert.equal(packed.value.rows[0].component,row);
  assert.deepEqual(Array.from(packed.value.progressive),expected.paint);assert.deepEqual(Array.from(packed.value.paint),expected.frames);
  f.retire(scope);scope.release();assert.equal(scope.stats.disposed,true);assert.equal(sourceCharge.active,false,'construction SOURCE is no longer a resident dependency');
  assert.equal(displayCharge.active,true,'packed rows still alias the verified DISPLAY');
  if(kind==='f081')assert.equal(f.events.filter(event=>privateEntry(event)&&event.reservation.active).length,1,'only the packed row retains private reconstructed buffers');
  main=packed.retain('main');selected=packed.retain('selected');packed.release();main.release();assert.equal(displayCharge.active,true,'selection independently owns the same CPU parents');
  selected.release();assert.equal(f.resources.stats.recent,1);assert(f.budget.stats.recentBytes>0);assert.equal(displayCharge.active,true,'recent cache charges its full retained ancestry');
  f.resources.evictRecent();assert.equal(displayCharge.active,false);assert.equal(f.events.filter(event=>privateEntry(event)&&event.reservation.active).length,0);
  f.ingress.release();assert.equal(f.budget.stats.bytes,0);
 }finally{selected?.release();main?.release();packed?.release();f.close();}
});

test('F081 private buffers have stable verified identity and a cache hit creates no second numeric copy',async()=>{
 const f=fixture('f081');let first,second;
 try{
  const a=f.createScope(),b=f.createScope();await f.prepare(a);await f.prepare(b);
  const initial=observeFloatCopies(()=>f.reconstruct(a));assert(initial.copies>0);const publications=f.resources.stats.productions,roles=f.resources.stats.roles;
  const repeated=observeFloatCopies(()=>f.reconstruct(b,f.rows.map(row=>({...row,generation:73}))));assert.equal(repeated.copies,0);assert.equal(f.resources.stats.productions,publications);
  const id=f.displays[0],one=initial.value.components.find(row=>rowKey(row)===rowKey(id)),two=repeated.value.components.find(row=>rowKey(row)===rowKey(id));
  assert.equal(two.generation,73);assert.equal(one.batches[0].positions,two.batches[0].positions,'publication metadata never enters shared numeric identity');assert(f.resources.stats.roles>roles);
  first=pack(f,a,[one]);await first.ready;const afterPacking=f.resources.stats.productions;
  second=pack(f,b,[two]);await second.ready;assert.equal(second.value,first.value);assert.equal(f.resources.stats.productions,afterPacking,'packed cache hit also avoids production');
  f.retire(a);f.retire(b);a.release();b.release();first.release();second.release();f.resources.evictRecent();f.ingress.release();assert.equal(f.budget.stats.bytes,0);
 }finally{first?.release();second?.release();f.close();}
});

test('F081 refuses private reconstruction before typed-array production and returns temporary parent leases',async()=>{
 const f=fixture('f081');let blocker;
 try{
  const scope=f.createScope();await f.prepare(scope);const before=f.resources.stats.roles,productions=f.resources.stats.productions;
  blocker=f.budget.reserve({category:'construction',bytes:f.budget.stats.availableBytes,precision:'exact'});const full=f.budget.stats.bytes;
  const observed=observeFloatCopies(()=>assert.throws(()=>f.reconstruct(scope),{name:'ResourceBudgetExceededError'}));
  assert.equal(observed.copies,0);assert.equal(f.resources.stats.productions,productions);assert.equal(f.resources.stats.roles,before);assert.equal(f.budget.stats.bytes,full);
  blocker.release();blocker=undefined;const result=f.reconstruct(scope);assert.equal(result.stats.error,undefined,'refusal leaves a clean retry');
  f.retire(scope);scope.release();f.ingress.release();assert.equal(f.budget.stats.bytes,0);
 }finally{blocker?.release();f.close();}
});

test('partial SOURCE/DISPLAY parent acquisition and group parent retention unwind every earlier lease',async()=>{
 const f=fixture('f081');
 try{
  const scope=f.createScope();await f.prepare(scope);let calls=0;const original=scope.retainResource,roles=f.resources.stats.roles,bytes=f.budget.stats.bytes;
  scope.retainResource=(...args)=>{if(++calls===2)throw Error('controlled second frozen parent failure');return original(...args);};
  try{assert.throws(()=>f.reconstruct(scope),/second frozen parent failure/);}finally{scope.retainResource=original;}
  assert.equal(f.resources.stats.roles,roles);assert.equal(f.budget.stats.bytes,bytes);
  const rows=f.reconstruct(scope).components.filter(row=>f.displays.some(display=>rowKey(display)===rowKey(row))),keep=scope.retainMemoResource,before=f.resources.stats.roles;calls=0;
  scope.retainMemoResource=(...args)=>{if(++calls===2)throw Error('controlled second memo parent failure');return keep(...args);};
  try{assert.throws(()=>api.retainReconstructionResourceParents(scope,rows),/second memo parent failure/);}finally{scope.retainMemoResource=keep;}
  assert.equal(f.resources.stats.roles,before);f.retire(scope);scope.release();f.ingress.release();assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
});

for(const mode of ['failed','aborted','refused'])test('packed '+mode+' exit releases reconstruction parents and production scope pins',async()=>{
 const f=fixture('f081');let packed,blocker;
 try{
  const scope=f.createScope();await f.prepare(scope);const rows=f.reconstruct(scope).components.filter(row=>f.displays.some(display=>rowKey(display)===rowKey(row))),roles=f.resources.stats.roles;
  if(mode==='refused'){
   blocker=f.budget.reserve({category:'construction',bytes:f.budget.stats.availableBytes,precision:'exact'});
   assert.throws(()=>pack(f,scope,[rows[0]]),{name:'ResourceBudgetExceededError'});assert.equal(f.resources.stats.roles,roles);assert.equal(scope.stats.pins,0);
   blocker.release();blocker=undefined;
  }else{
   const controller=new AbortController();packed=pack(f,scope,[rows[0]],{signal:controller.signal,fail:mode==='failed'});
   if(mode==='aborted')controller.abort();await assert.rejects(packed.ready,mode==='aborted'?{name:'AbortError'}:/controlled material failure/);
   await tick();packed.release();assert.equal(scope.stats.pins,0);
  }
  f.retire(scope);scope.release();f.resources.evictRecent();f.ingress.release();assert.equal(f.budget.stats.bytes,0);
 }finally{packed?.release();blocker?.release();f.close();}
});

test('ownership discovery follows typed views, ignores unrelated rows and leaves accessor fields cold',()=>{
 const scope={},buffer=new ArrayBuffer(16),memoKey={},held={release(){held.releases++;},releases:0};let reads=0,retains=0;
 scope.retainMemoResource=key=>{assert.equal(key,memoKey);retains++;return held;};
 api.registerReconstructionResourceArrays(scope,[new Float32Array(buffer)],{memoKey});
 const unrelated={origin:[0,0],batches:[{positions:[0,0,0]}]},accessors={get origin(){reads++;throw Error('origin getter must stay cold');},get batches(){reads++;throw Error('batch getter must stay cold');}};assert.deepEqual(api.retainReconstructionResourceParents(scope,[unrelated,accessors]).parents,[]);
 const rows=[{origin:[0,0],batches:[{positions:new Uint8Array(buffer),get normals(){reads++;throw Error('getter must stay cold');}}]}];
 const {parents}=api.retainReconstructionResourceParents(scope,rows);assert.equal(parents.length,1);assert.equal(retains,1);assert.equal(reads,0);parents[0].release();assert.equal(held.releases,1);
});

test('actual partition compositions retain different parents while common-row numeric and packed identities stay stable',async()=>{
 const f=fixture('f081',{partitioned:true});let first,second;
 try{
  const required=new Set(['osm/way/228534603','osm/way/225910817','osm/way/35903317']),rows=f.rows.filter(row=>required.has(row.objectId)),extra=f.rows.find(row=>!required.has(row.objectId));assert(extra);
  const a=f.createScope(),b=f.createScope(),selection=rows.map(row=>row.city+'|'+row.objectId);
  for(const ref of f.refs.slice(0,2)){await a.prepareSelection(ref,selection,requestSignal());await b.prepareSelection(ref,[...selection,extra.city+'|'+extra.objectId],requestSignal());}
  assert.notEqual(referenceKey(a,f.refs[0]),referenceKey(b,f.refs[0]));assert.notEqual(referenceKey(a,f.refs[1]),referenceKey(b,f.refs[1]),'actual DISPLAY parents include different selected partitions');
  assert.deepEqual(a.preparedResourceIdentity(f.refs[0]),b.preparedResourceIdentity(f.refs[0]));
  await f.prepare(a,rows);await f.prepare(b,rows);const one=f.reconstruct(a,rows),productions=f.resources.stats.productions;
  const repeated=observeFloatCopies(()=>f.reconstruct(b,rows));assert.equal(repeated.copies,0);assert.equal(f.resources.stats.productions,productions);
  const row=one.components[0],other=repeated.value.components.find(value=>rowKey(value)===rowKey(row));assert.equal(other.batches[0].positions,row.batches[0].positions);
  first=pack(f,a,[row]);await first.ready;const packedProductions=f.resources.stats.productions;
  second=pack(f,b,[other]);await second.ready;assert.equal(second.value,first.value);assert.equal(f.resources.stats.productions,packedProductions);
  f.retire(a);f.retire(b);a.release();b.release();first.release();second.release();f.resources.evictRecent();f.ingress.release();assert.equal(f.budget.stats.bytes,0);
 }finally{first?.release();second?.release();f.close();}
});

test('automatic ownership keeps borrowed arrays on their original parent and supports non-object memo keys',async()=>{
 const f=fixture('f081');let packed;
 try{
  const scope=f.createScope();await f.prepare(scope);const source=scope.borrow(f.refs[0],rows=>rows[0]),display=scope.borrow(f.refs[1],rows=>rows[0]),memoKey='typed-resource-key';
  const value=scope.resourceMemo(memoKey,{contentKey:'automatic-array-ownership',estimate:{category:'decoded',bytes:12,precision:'exact'},produce:()=>({private:new Float32Array([1,2,3]),borrowed:display.batches[0].color})});
  const row={...source,origin:display.origin,batches:[{...display.batches[0],normals:value.private}]},held=api.retainReconstructionResourceParents(scope,[row]);
  assert.equal(held.parents.length,2,'private numeric memo and original DISPLAY are separate owners');assert(held.parents.some(parent=>parent.contentKey===referenceKey(scope,f.refs[1])));
  for(const parent of held.parents)parent.release();scope.retirePrepared([],['typed-resource-key']);scope.release();f.ingress.release();assert.equal(f.budget.stats.bytes,0);
 }finally{packed?.release();f.close();}
});

test('numeric layouts are distinct and a refused number-copy producer allocates no number arrays',async()=>{
 const f=fixture('f081');let blocker;
 try{
  const scope=f.createScope();await f.prepare(scope);const display=scope.borrow(f.refs[1],rows=>rows[0]),base={recipeSHA256:'verified-layout-test',rowAuthority:[display.city,display.objectId,display.partId],sourceRefs:[f.refs[1]],aliasRefs:[f.refs[1]],batches:display.batches};
  blocker=f.budget.reserve({category:'construction',bytes:f.budget.stats.availableBytes,precision:'exact'});const original=Array.from;let copies=0;
  Array.from=(...args)=>{copies++;return original(...args);};
  try{assert.throws(()=>api.createReconstructionNumericResource(scope,{}, {...base,layout:'number-geometry-materials'}),{name:'ResourceBudgetExceededError'});assert.equal(copies,0);}finally{Array.from=original;}
  blocker.release();blocker=undefined;
  const typed=api.createReconstructionNumericResource(scope,{}, {...base,layout:'typed-geometry'}),numbers=api.createReconstructionNumericResource(scope,{}, {...base,layout:'number-geometry-materials'});
  assert(typed.batches[0].positions instanceof Float32Array);assert(Array.isArray(numbers.batches[0].positions));assert.notEqual(typed,numbers);
  assert.deepEqual(Array.from(typed.batches[0].positions),numbers.batches[0].positions);scope.release();f.ingress.release();assert.equal(f.budget.stats.bytes,0);
 }finally{blocker?.release();f.close();}
});

async function inlineRecipeFixture(kind){
 const module=api[kind],file=`src/painted/root500/safety/owner-${kind}-${kind==='f126'?'completion':'reconstruction'}.ts`,text=await readFile(new URL('../'+file,import.meta.url),'utf8');
 const literal=name=>{const line=text.split('\n').find(line=>line.startsWith('const '+name+'=')||line.startsWith('const '+name+':'));assert(line);return JSON.parse(line.slice(line.indexOf('=')+1).replace(/;$/,''));};
 const source=literal('SOURCE'),rows=structuredClone(Array.isArray(source)?source:Object.values(source)),city=rows[0].city;
 const expected=kind==='f126'?literal('DISPLAY'):Object.fromEntries(rows.map((row,index)=>[row.partId,[{...triangle(index+100),triangleProvenance:[{source:index}]}]])),value=kind==='f126'?literal('ADMISSIONS'):expected;
 const raw=Buffer.from(JSON.stringify(value)),sha256=createHash('sha256').update(raw).digest('hex'),descriptor={path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:raw.length},ref=module.root500DataRefs[0];
 const budget=api.createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:16*1024**2}),resources=api.createChunkResourceStore({budget}),events=[],reserve=budget.reserve.bind(budget);
 budget.reserve=(costs,options)=>{const reservation=reserve(costs,options);events.push({label:options?.label,reservation});return reservation;};
 const frozen=api.createFrozenDataLeaseStore([descriptor],{resourceStore:resources}),client=frozen.client({city,provider:'root500',profileSHA256:null,selection:{tables:[sha256],initializers:{[sha256]:{[ref.file]:1}}},resolve:()=>sha256,async read(path,signal,max){signal.throwIfAborted();assert.equal(path,descriptor.path);assert.equal(max,raw.length);return raw;}}),scope=api.createFrozenDataScope(client);
 const ingress=resources.acquire({contentKey:'inline-recipe-ingress:'+kind,role:'source',estimate:{category:'decoded',bytes:JSON.stringify(rows).length*2,precision:'estimate'},produce:()=>rows});
 await module.prepareRoot500Data(rows,requestSignal(),scope);
 return{kind,module,rows,expected,budget,resources,scope,ingress,events,
  close(){scope.release();ingress.release();resources.evictRecent();client.dispose();frozen.destroy();resources.destroy();assert.equal(budget.stats.bytes,0);},
 };
}

for(const kind of ['f126','f259'])test(kind+' real verified recipe preserves exact typed/number geometry and outlives construction ownership',async()=>{
 const f=await inlineRecipeFixture(kind);let packed,main,selected;
 try{
  const reconstruct=kind==='f126'?f.module.ownerF126CompletionReconstruction:f.module.ownerF259Reconstruction,materials=kind==='f126'?f.module.ownerF126CompletionMaterials:f.module.ownerF259BaseMaterials;
  const result=reconstruct(f.rows,f.scope);assert.equal(result.stats.error,undefined);assert.equal(result.stats.objects,f.rows.length);const row=result.components[0],expected=kind==='f126'?f.expected.find(value=>rowKey(value)===rowKey(row)):undefined,batches=expected?.batches??f.expected[row.partId];
  for(let i=0;i<batches.length;i++){assert.deepEqual(Array.from(row.batches[i].positions),kind==='f126'?Array.from(new Float32Array(batches[i].positions)):batches[i].positions);assert.deepEqual(Array.from(row.batches[i].indices),batches[i].indices);assert.deepEqual(Array.from(row.batches[i].color),batches[i].color);}
  if(expected){assert.deepEqual(row.origin,expected.origin);assert.notEqual(row.origin,f.module.getRoot500Data(f.scope).DISPLAY[0].origin,'inline DISPLAY origin is now independently owned');}
  const count=row.batches.reduce((n,b)=>n+b.positions.length/3,0),paint=new Float32Array(count*5),progressive=new Float32Array(count*4);materials([row],progressive,paint,f.scope);
  const {parents,authority}=api.retainReconstructionResourceParents(f.scope,[row]);
  try{packed=api.acquirePackedMeshChunk(f.resources,{isContextLost:()=>false},{provider:kind,group:{contentKey:'inline-verified-group:'+kind,components:[row],parents:[f.ingress,...parents],frame:{origin:row.origin,unit:1e7,authority:'inline-verified-frame'},cohortKeys:[],materialAuthority:'exact-inline-material',recipeAuthority:authority,selectedLOD:0},components:[row],batchIncluded:()=>true,materials:()=>({paint,progressive,auxiliary:undefined}),styles:()=>({wall:1,roof:2,landmark:false,sourceGlassRoof:false}),runs:indices=>[{key:'base',firstIndex:0,indexCount:indices.length}],sourceCurrent(){assert.equal(f.scope.stats.disposed,false);},retainSource:()=>f.scope.retain()},undefined,()=>{});}finally{for(const parent of parents)parent.release();}
  await packed.ready;assert.equal(packed.value.rows[0].component,row);f.scope.retirePrepared([],f.module.root500NumericMemoKeys);
  assert(f.module.getRoot500Data(f.scope),'material module memo remains usable after numeric retirement');f.scope.release();
  assert.equal(f.events.filter(event=>privateEntry(event)&&event.reservation.active).length,1);main=packed.retain('main');selected=packed.retain('selected');packed.release();main.release();selected.release();assert.equal(f.resources.stats.recent,1);
  f.resources.evictRecent();assert.equal(f.events.filter(event=>privateEntry(event)&&event.reservation.active).length,0);f.ingress.release();assert.equal(f.budget.stats.bytes,0);
 }finally{selected?.release();main?.release();packed?.release();f.close();}
});


test('replayable prepared rows keep their numeric parents addressable after first construction retirement',async()=>{
 const f=fixture('f081');let first,replayed,releasePrepared;
 try{
  const scope=f.createScope();await f.prepare(scope);const result=f.reconstruct(scope);
  const row=result.components.find(value=>rowKey(value)===rowKey(f.displays[0]));
  releasePrepared=api.retainReconstructionPreparedInputs(scope,[row]);
  first=pack(f,scope,[row]);await first.ready;f.retire(scope);
  const before=f.resources.stats.productions;
  replayed=pack(f,scope,[row],{context:{isContextLost:()=>false}});await replayed.ready;
  assert.equal(replayed.value,first.value,'context restoration reuses the immutable CPU packing');
  assert.equal(f.resources.stats.productions,before,'replay does not reconstruct or duplicate numeric arrays');
  releasePrepared();releasePrepared();
  assert.throws(()=>api.retainReconstructionResourceParents(scope,[row]),/unprepared frozen/,'retiring the replayable result ends scope lookup ownership');
  assert(replayed.value,'already packed output retains its independent parent');
  scope.release();first.release();replayed.release();f.resources.evictRecent();f.ingress.release();
  assert.equal(f.budget.stats.bytes,0,'final consumers return all charges');
 }finally{releasePrepared?.();first?.release();replayed?.release();f.close();}
});

test('without a replayable input pin, reconstruction retirement reproduces the missing memo failure',async()=>{
 const f=fixture('f081');let packed;
 try{
  const scope=f.createScope();await f.prepare(scope);const result=f.reconstruct(scope);
  const row=result.components.find(value=>rowKey(value)===rowKey(f.displays[0]));
  packed=pack(f,scope,[row]);await packed.ready;f.retire(scope);
  const numericOnly={origin:[...row.origin],batches:[{positions:row.batches[0].positions}]};
  assert.throws(()=>api.retainReconstructionResourceParents(scope,[numericOnly]),/Cannot retain unprepared frozen resource memo/);
  assert.throws(()=>api.retainReconstructionPreparedInputs(scope,[numericOnly]),/Cannot retain unprepared frozen resource memo/,'late pins must not disguise premature retirement');
 }finally{packed?.release();f.close();}
});
