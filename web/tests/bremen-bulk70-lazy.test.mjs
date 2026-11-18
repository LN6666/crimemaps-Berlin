import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build,transform} from 'esbuild';
import ts from 'typescript';
import {createRuntimeLoader,createFixtureNativeSources} from './support/fixtures-managers-a-runtime.mjs';

const web=fileURLToPath(new URL('../',import.meta.url)),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
let serial=0;
const scopeRuntime=createRuntimeLoader().load(path.join(web,'src/safety/frozen-data-scope.ts'));

// The real lazy route, original reconstruction algorithm, material writer and
// signature guard run against tiny synthetic models. The frozen data initializer
// is intercepted before source/data read; no original geometry table is decoded.
async function fixture({creditDelta=false}={}){
 const key='__bulk70Fixture'+(++serial),state={dataLoads:0,table:undefined};globalThis[key]=state;
 const result=await build({stdin:{contents:`import * as bremen from './src/painted/bremen/safety/infill-frankfurt-low-office-bulk70';import * as budget from './src/painted/bremen/safety/infill-bulk-budget-credit';export {bremen,budget};export {infillLow073RemoveDuplicateNativeParts} from './src/painted/bremen/safety/infill-low073-duplicate-native-parts';export * from './src/painted/infill/safety/infill-frankfurt-low-office-bulk70-identities';export {LOW_OFFICE_SHA} from './src/painted/infill/safety/infill-frankfurt-low-office-bulk70-metadata';export {BULK70_BUDGET_INPUT,BULK70_BUDGET_GROUP_INDICES} from './src/painted/infill/safety/infill-frankfurt-low-office-bulk70-budget-metadata';export {nativePaintSignature} from './src/painted/root500/safety/progressive-native-signature';export const loadOriginal=()=>Promise.all([import('./src/painted/infill/safety/infill-frankfurt-low-office-bulk70'),import('./src/painted/infill/safety/infill-bulk-budget-credit')]).then(([builder,budget])=>({...builder,...budget}));`,resolveDir:web,sourcefile:'bulk70-fixture.ts',loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022',plugins:[{name:'tiny-bulk70-table',setup(builder){
  builder.onResolve({filter:/infill-frankfurt-low-office-bulk70-data$/},args=>{assert(['/infill/safety/infill-frankfurt-low-office-bulk70.ts','/infill/safety/infill-bulk-budget-credit.ts'].some(suffix=>args.importer.endsWith(suffix)));return{path:'tiny',namespace:'bulk70-data'};});
  builder.onLoad({filter:/.*/,namespace:'bulk70-data'},()=>({loader:'js',resolveDir:path.join(web,'src/painted/infill/safety'),contents:`globalThis[${JSON.stringify(key)}].dataLoads++;export {LOW_OFFICE_SHA} from './infill-frankfurt-low-office-bulk70-metadata';const table=()=>globalThis[${JSON.stringify(key)}].table;export const infillDataRefs=[];export const infillDataMemoKeys=[];export function getInfillData(_scope){return{get LOW_OFFICE_DATA(){return table();}};}export function getLOW_OFFICE_DATA(_scope){return table();}export const infillDataFunctionArities={getLOW_OFFICE_DATA:0};export const infillDataDependencies=()=>[];export async function prepareInfillDataPayload(signal,_scope){signal.throwIfAborted();}`}));
  builder.onResolve({filter:/frozen-paint-tables/},()=>{throw Error('Real frozen-table reader must not enter a tiny Bulk70 fixture');});
 }}]});
 const module=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text+'\n//# sourceURL=bulk70-fixture-'+serial+'.mjs').toString('base64'));
 const group=module.BULK70_IDENTITY_GROUPS.find(group=>group.identities.length>=2);assert(group);
 const rows=group.identities.slice(0,2).map((identity,index)=>({city:'frankfurt',...identity,origin:[8.6,50.1],componentGeometry:{type:'Polygon',coordinates:[[[8.6,50.1],[8.601,50.1],[8.601,50.101],[8.6,50.1]]]},sourceFeature:{type:'Feature',properties:{building:'yes',fixture:index}},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.5,.5,.5]}]}));
 state.table={groups:[{queueId:group.queueId,geometryReadyForPreview:true,materialsComplete:true,requiredNativeGroup:rows.map(row=>row.partId),models:rows.map(row=>({identity:{objectId:row.objectId,partId:row.partId,signature:module.nativePaintSignature(row)},source:structuredClone(row),display:row.batches.map(batch=>({...structuredClone(batch),paint:Array(12).fill(.3),frames:Array(15).fill(.4)}))}))}]};
 // Complete the synthetic catalogue using count-only dormant models. No large
 // geometry is allocated: the original catalogue reads only these lengths, and
 // missing native cohort members prevent dormant rows from reconstructing.
 if(creditDelta){const display=state.table.groups[0].models[0].display[0];display.positions.push(0,2,0);display.normals.push(0,1,0);display.indices.push(0,2,3);display.paint.push(.3,.3,.3,.3);display.frames.push(.4,.4,.4,.4,.4);}
 const selected=new Set(rows.map(row=>row.objectId+'|'+row.partId)),dormant=module.BULK70_IDENTITY_GROUPS.flatMap(group=>group.identities).filter(identity=>!selected.has(identity.objectId+'|'+identity.partId));
 const catalogue=module.budget.INFILL_BULK_BUDGET_CATALOGUE;
 state.table.groups.push({queueId:'fixture-dormant-budget',geometryReadyForPreview:true,requiredNativeGroup:['not-present'],models:dormant.map((identity,index)=>({identity,source:{batches:[]},display:index===0?[{positions:{length:(catalogue.vertices-(creditDelta?1:0))*3},indices:{length:catalogue.indices-(creditDelta?3:0)}}]:[]}))});
 assert.equal(rows.length+dormant.length,catalogue.models);
 // The batch FrozenDataScope (DECISIONS 2026-11-02 01:35, fix one): the original
 // builder and budget read their (tiny, intercepted) table through the scope the
 // renderer batch passes; no frozen resource is acquired, so its client refuses.
 const scope=scopeRuntime.createFrozenDataScope({acquire(){throw Error('the tiny Bulk70 table is intercepted; no frozen resource is acquired');},dispose(){}});
 return{...module,state,rows,group,scope,close(){scope.release();delete globalThis[key];}};
}

test('light routing metadata is the complete ordered SHA-bound 80-group / 101-model identity set',async()=>{
 const f=await fixture();try{
  const ordered=f.BULK70_IDENTITY_GROUPS.flatMap(group=>group.identities.map(identity=>[group.queueId,identity.objectId,identity.partId]));assert.equal(f.BULK70_IDENTITY_GROUPS.length,80);assert.equal(ordered.length,101);assert.equal(new Set(ordered.map(row=>JSON.stringify(row.slice(1)))).size,101);
  assert.equal(hash(JSON.stringify(ordered)),'974d9d426c80bb4e9e379fba4b8792a1f919c7b220aa80038679d2353650231a');assert.equal(f.BULK70_IDENTITY_INPUT.orderedIdentitySHA256,hash(JSON.stringify(ordered)));assert.equal(f.BULK70_IDENTITY_INPUT.bytes,48529632);
  const aliases=JSON.parse(await readFile(path.join(web,'src/safety/frozen-paint-source-aliases.json'),'utf8'));
  const binding=aliases[f.BULK70_IDENTITY_INPUT.sha256];
  assert.equal(binding.sourceBytes,f.BULK70_IDENTITY_INPUT.bytes);
  const manifest=JSON.parse(await readFile(path.join(web,'src/safety/frozen-paint-table-manifest.json'),'utf8'));
  const descriptor=manifest.find(row=>row.sha256===binding.sha256);
  assert.ok(descriptor.bytes>0&&descriptor.bytes<binding.sourceBytes);
  assert.ok(!manifest.some(row=>row.sha256===f.BULK70_IDENTITY_INPUT.sha256));
  const dataSource=await readFile(path.join(web,'src/painted/infill/safety/infill-frankfurt-low-office-bulk70-data.ts'),'utf8');assert(dataSource.includes("export {LOW_OFFICE_SHA} from './infill-frankfurt-low-office-bulk70-metadata'"));assert(dataSource.includes('{canonicalSHA256:"'+f.BULK70_IDENTITY_INPUT.sha256+'",file:"painted/infill/safety/infill-frankfurt-low-office-bulk70-data.ts",occurrence:0,codec:\'json\'}'),'the scoped data module binds exactly the SHA-bound frozen table');assert.equal(f.LOW_OFFICE_SHA,'579c18a51df9cc16083ff4de6ca02e456692fefb5ce869bdee36b3a0fa63d66e');
  const original=await readFile(path.join(web,'src/painted/infill/safety/infill-frankfurt-low-office-bulk70.ts'),'utf8'),ast=ts.createSourceFile('bulk70.ts',original,ts.ScriptTarget.Latest,true);let predicate;
  (function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='infillFrankfurtLowOfficeBulk70Identity')predicate=node.initializer.getText(ast);ts.forEachChild(node,visit);})(ast);
  const expression=(await transform('('+predicate+')',{loader:'ts',target:'es2022'})).code;// The original predicate now reads its groups through the scoped accessor
  // (__infillRead_GROUPS()); both names bind the same complete ordered groups.
  const originalGroups=f.BULK70_IDENTITY_GROUPS.map(group=>({models:group.identities.map(identity=>({identity}))})),oldIdentity=Function('GROUPS','__infillRead_GROUPS','return '+expression)(originalGroups,()=>originalGroups);
  for(const [,objectId,partId]of ordered)for(const city of ['bremen','frankfurt','berlin']){const identity={city,objectId,partId};assert.equal(f.bremen.infillFrankfurtLowOfficeBulk70Identity(identity),oldIdentity(identity));assert(f.bremen.infillFrankfurtLowOfficeBulk70Identity(identity),'identity remains city-agnostic');assert.equal(f.bremen.infillFrankfurtLowOfficeBulk70Identity({...identity,partId:partId+'-wrong'}),oldIdentity({...identity,partId:partId+'-wrong'}));}
  assert.equal(f.state.dataLoads,0);
 }finally{f.close();}
});

test('Bremen, unknown Frankfurt identities and excluded queues avoid loading and preserve no-match array copies',async()=>{
 const f=await fixture();try{
  const rows=f.rows.map(row=>({...row,city:'bremen'}));for(const input of [rows,[{...f.rows[0],partId:'unknown'}]]){
   await f.bremen.prepareInfillFrankfurtLowOfficeBulk70Reconstruction(input,new AbortController().signal);const result=f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(input);assert.notEqual(result.components,input);assert.deepEqual(result.components,input);assert.equal(result.components[0],input[0]);assert.deepEqual(result.stats,{objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
  }
  for(const selected of [[],['unrelated-queue']]){const result=f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows,selected);assert.notEqual(result.components,f.rows);assert.deepEqual(result.components,f.rows);assert.equal(result.stats.objects,0);}
  await tick();assert.equal(f.state.dataLoads,0);
 }finally{f.close();}
});

test('original material writing is independent of the frozen table, including marked noncatalog components and offsets',async()=>{
 const f=await fixture();try{
  const plain={city:'bremen',batches:[{positions:[0,0,0]}]},marked={city:'frankfurt',objectId:'not-a-catalog-id',partId:'unknown',displayEstimates:{infillFrankfurtLowOfficeBulk70:true},batches:[{positions:[0,0,0,1,0,0],paint:[1,2,3,4,5,6,7,8],frames:[9,10,11,12,13,14,15,16,17,18]}]},paint=new Float32Array(12),frames=new Float32Array(15);
  const result=f.bremen.infillFrankfurtLowOfficeBulk70BaseMaterials([plain,marked],paint,frames);assert.deepEqual(result,{objects:1,vertices:2,actualVisualAccepted:false});assert.deepEqual([...paint],[0,0,0,0,1,2,3,4,5,6,7,8]);assert.deepEqual([...frames],[0,0,0,0,0,9,10,11,12,13,14,15,16,17,18]);assert.equal(f.state.dataLoads,0);
 }finally{f.close();}
});

test('no-marker budget retains the exact original nonzero finite catalogue without loading geometry',async()=>{
 const f=await fixture();try{
  const catalogue={patchSHA256:f.LOW_OFFICE_SHA,models:101,vertices:246916,indices:241476};assert.equal(f.BULK70_BUDGET_INPUT.rawSHA256,f.BULK70_IDENTITY_INPUT.sha256);assert.equal(f.BULK70_BUDGET_INPUT.rawBytes,48529632);assert.equal(f.BULK70_BUDGET_INPUT.orderedIdentitySHA256,f.BULK70_IDENTITY_INPUT.orderedIdentitySHA256);assert.deepEqual(f.BULK70_BUDGET_GROUP_INDICES,Array.from({length:80},(_,index)=>index));assert.deepEqual(f.budget.INFILL_BULK_BUDGET_CATALOGUE,catalogue);assert(Object.isFrozen(f.budget.INFILL_BULK_BUDGET_CATALOGUE));
  for(const rows of [[],f.rows,f.rows.map(row=>({...row,city:'bremen'}))])assert.deepEqual(f.budget.infillBulkBudgetCredit(rows),{vertices:0,indices:0,rows:0,catalogueVertices:246916,catalogueIndices:241476,patchSHA256:f.LOW_OFFICE_SHA});
  assert.equal(f.state.dataLoads,0);
 }finally{f.close();}
});

test('matching budget demand awaits the shared original validator and retains exact positive credits and error ordering',async()=>{
 const f=await fixture({creditDelta:true});try{
  const provisional=f.rows.map(row=>({...row,displayEstimates:{infillFrankfurtLowOfficeBulk70:{patchSHA:f.LOW_OFFICE_SHA}}}));assert.throws(()=>f.budget.infillBulkBudgetCredit(provisional),/budget was not prepared/);assert.equal(f.state.dataLoads,0);
  const gate=deferred(),preparing=f.bremen.prepareInfillFrankfurtLowOfficeBulk70Reconstruction(f.rows,new AbortController().signal,async operation=>{const value=await operation;await gate.promise;return value;},f.scope);await tick();assert.equal(f.state.dataLoads,1);assert.throws(()=>f.budget.infillBulkBudgetCredit(provisional,f.scope),/budget was not prepared/);gate.resolve();await preparing;
  const displayed=f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows,undefined,f.scope).components,credit=f.budget.infillBulkBudgetCredit(displayed,f.scope),original=await f.loadOriginal();assert.deepEqual(credit,{vertices:1,indices:3,rows:2,catalogueVertices:246916,catalogueIndices:241476,patchSHA256:f.LOW_OFFICE_SHA});assert.deepEqual(credit,original.infillBulkBudgetCredit(displayed,f.scope));assert.deepEqual(original.INFILL_BULK_BUDGET_CATALOGUE,f.budget.INFILL_BULK_BUDGET_CATALOGUE);
  const changed=structuredClone(displayed[0]);changed.batches[0].paint[0]+=1;const wrongCity={...displayed[1],city:'bremen'};
  for(const [rows,error]of [[[...displayed,displayed[0]],'Unattested bulk display budget credit'],[[{...displayed[0],displayEstimates:{infillFrankfurtLowOfficeBulk70:{patchSHA:'wrong'}}}],'Unattested bulk display budget credit'],[[{...displayed[0],partId:'unknown'}],'Unattested bulk display budget credit'],[[changed,wrongCity],'Changed bulk display budget credit geometry'],[[wrongCity,changed],'Unattested bulk display budget credit']]){
   assert.throws(()=>f.budget.infillBulkBudgetCredit(rows,f.scope),failure=>failure.message===error);assert.throws(()=>original.infillBulkBudgetCredit(rows,f.scope),failure=>failure.message===error);
  }
  assert.equal(f.state.dataLoads,1,'reconstruction and budget share one data evaluation');
 }finally{f.close();}
});

test('first invalid marked input keeps its original unattested error without starting an import',async()=>{
 const f=await fixture();try{
  for(const row of [{...f.rows[0],city:'bremen'},{...f.rows[0],partId:'unknown'},f.rows[0]]){
   const marked={...row,displayEstimates:{infillFrankfurtLowOfficeBulk70:{patchSHA:row===f.rows[0]?'wrong':f.LOW_OFFICE_SHA}}};assert.throws(()=>f.budget.infillBulkBudgetCredit([marked]),failure=>failure.message==='Unattested bulk display budget credit');
  }
  assert.equal(f.state.dataLoads,0);
 }finally{f.close();}
});

test('a mismatched original budget catalogue cannot publish reconstruction or marked-credit readiness',async()=>{
 const f=await fixture();try{
  const original=await f.loadOriginal(),loader=f.bremen.createInfillFrankfurtLowOfficeBulk70Loader(async()=>({...original,INFILL_BULK_BUDGET_CATALOGUE:{...original.INFILL_BULK_BUDGET_CATALOGUE,vertices:original.INFILL_BULK_BUDGET_CATALOGUE.vertices+1}}));
  await assert.rejects(loader.prepare(f.rows,new AbortController().signal),/budget catalogue identity mismatch/);assert.throws(()=>loader.reconstruct(f.rows),/not prepared/);assert.throws(()=>loader.budgetCredit(f.rows.map(row=>({...row,displayEstimates:{infillFrankfurtLowOfficeBulk70:{patchSHA:f.LOW_OFFICE_SHA}}}))),/budget was not prepared/);
 }finally{f.close();}
});

test('LOW073 duplicate guards retain the original SHA witness and source checks without loading Bulk70 data',async()=>{
 const f=await fixture();try{
  const source=await readFile(path.join(web,'src/painted/infill/safety/infill-low073-duplicate-native-parts.ts'),'utf8'),ast=ts.createSourceFile('duplicates.ts',source,ts.ScriptTarget.Latest,true);let duplicates;
  (function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='DUPLICATES')duplicates=JSON.parse(node.initializer.getText(ast));ts.forEachChild(node,visit);})(ast);assert(duplicates.length);
  const parent={city:'frankfurt',objectId:'osm/way/344115977',partId:'osm/way/344115977/component/a8b5af883f9300827a90',displayEstimates:{infillFrankfurtLowOfficeBulk70:{queueId:'FRA-LOW-073',patchSHA:f.LOW_OFFICE_SHA}}},native=duplicates.map(row=>structuredClone(row.source)),rows=[parent,...native];
  assert.deepEqual(f.infillLow073RemoveDuplicateNativeParts(rows),[parent]);assert.equal(rows.length,native.length+1);
  const changed=structuredClone(native[0]);changed.batches[0].positions[0]+=1;assert.deepEqual(f.infillLow073RemoveDuplicateNativeParts([parent,changed]),[parent,changed]);
  const wrongWitness={...parent,displayEstimates:{infillFrankfurtLowOfficeBulk70:{queueId:'FRA-LOW-073',patchSHA:'wrong'}}},unverified=[wrongWitness,...native];assert.equal(f.infillLow073RemoveDuplicateNativeParts(unverified),unverified);
  const otherCity=rows.map(row=>({...row,city:'bremen'}));assert.equal(f.infillLow073RemoveDuplicateNativeParts(otherCity),otherCity);assert.equal(f.state.dataLoads,0);
 }finally{f.close();}
});

test('matching input waits for the session and then runs the original cohort/source/material implementation',async()=>{
 const f=await fixture();try{
  const gate=deferred();let ready=false,waits=0;const rowsJSON=JSON.stringify(f.rows);
  assert.throws(()=>f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows),/not prepared/);
  const pending=f.bremen.prepareInfillFrankfurtLowOfficeBulk70Reconstruction(f.rows,new AbortController().signal,async operation=>{waits++;const value=await operation;await gate.promise;return value;},f.scope).then(()=>ready=true);
  await tick();assert.equal(f.state.dataLoads,1);assert.equal(waits,1);assert.equal(ready,false);assert.throws(()=>f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows),/not prepared/);gate.resolve();await pending;
  const selected=[f.group.queueId],output=f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows,selected,f.scope);assert.equal(output.stats.objects,2);assert.equal(output.stats.vertices,6);assert.equal(output.stats.triangles,2);assert.equal(output.stats.originalVertices,6);assert.equal(JSON.stringify(f.rows),rowsJSON);
  for(const [index,row]of output.components.entries()){assert.notEqual(row,f.rows[index]);assert.equal(row.sourceFeature,f.rows[index].sourceFeature);assert.equal(row.componentGeometry,f.rows[index].componentGeometry);assert.deepEqual(row.batches[0].positions,f.state.table.groups[0].models[index].display[0].positions);assert.notEqual(row.batches[0].positions,f.state.table.groups[0].models[index].display[0].positions);}
  const paint=new Float32Array(24),frames=new Float32Array(30);assert.deepEqual(f.bremen.infillFrankfurtLowOfficeBulk70BaseMaterials(output.components,paint,frames),{objects:2,vertices:6,actualVisualAccepted:false});assert(paint.every(value=>Math.abs(value-.3)<1e-6));assert(frames.every(value=>Math.abs(value-.4)<1e-6));
  const original=await f.loadOriginal();assert.equal(f.bremen.infillFrankfurtLowOfficeBulk70BaseMaterials,original.infillFrankfurtLowOfficeBulk70BaseMaterials);assert.deepEqual(output,original.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows,selected,f.scope));assert.equal(f.state.dataLoads,1);
 }finally{f.close();}
});

test('original reconstruction still withholds incomplete, changed, duplicated and unselected cohorts',async()=>{
 const f=await fixture();try{
  await f.bremen.prepareInfillFrankfurtLowOfficeBulk70Reconstruction(f.rows,new AbortController().signal,undefined,f.scope);
  const changed=structuredClone(f.rows);changed[0].batches[0].positions[0]=99;
  for(const [rows,selected]of [[[f.rows[0]],undefined],[changed,undefined],[[...f.rows,f.rows[0]],undefined],[f.rows,[]],[f.rows,['unknown']]]){const output=f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(rows,selected,f.scope);assert.equal(output.stats.objects,0);assert.notEqual(output.components,rows);for(let i=0;i<rows.length;i++)assert.equal(output.components[i],rows[i]);}
  assert.equal(f.state.dataLoads,1);
 }finally{f.close();}
});

test('one cancelled waiter cannot publish late or cancel another waiter sharing the original builder',async()=>{
 const f=await fixture();try{
  const gate=deferred(),controller=new AbortController(),wait=async operation=>{const value=await operation;await gate.promise;return value;};
  const cancelled=f.bremen.prepareInfillFrankfurtLowOfficeBulk70Reconstruction(f.rows,controller.signal,wait,f.scope),active=f.bremen.prepareInfillFrankfurtLowOfficeBulk70Reconstruction(f.rows,new AbortController().signal,wait,f.scope);
  await tick();controller.abort();await assert.rejects(cancelled,{name:'AbortError'});assert.throws(()=>f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows),/not prepared/);assert.throws(()=>f.budget.infillBulkBudgetCredit(f.rows.map(row=>({...row,displayEstimates:{infillFrankfurtLowOfficeBulk70:{patchSHA:f.LOW_OFFICE_SHA}}})),f.scope),/budget was not prepared/);gate.resolve();await active;assert.equal(f.state.dataLoads,1);const displayed=f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows,undefined,f.scope);assert.equal(displayed.stats.objects,2);assert.equal(f.budget.infillBulkBudgetCredit(displayed.components,f.scope).rows,2);
 }finally{f.close();}
});

test('session failure does not publish readiness; a fresh session reuses the one pending original import',async()=>{
 const f=await fixture();try{
  const gate=deferred(),session=deferred(),failure=new Error('controlled table session failure');let imports=0;
  const loader=f.bremen.createInfillFrankfurtLowOfficeBulk70Loader(()=>{imports++;return gate.promise;}),first=loader.prepare(f.rows,new AbortController().signal,operation=>Promise.race([operation,session.promise]),f.scope);session.reject(failure);await assert.rejects(first,error=>error===failure);assert.throws(()=>loader.reconstruct(f.rows,undefined,f.scope),/not prepared/);const retry=loader.prepare(f.rows,new AbortController().signal,undefined,f.scope);gate.resolve(await f.loadOriginal());await retry;assert.equal(imports,1);assert.equal(f.state.dataLoads,1);assert.equal(loader.reconstruct(f.rows,undefined,f.scope).stats.objects,2);
 }finally{f.close();}
});

test('a synchronous session-adapter throw removes the abort listener and never publishes the shared import',async()=>{
 const f=await fixture();try{
  const controller=new AbortController(),signal=controller.signal,failure=new Error('synchronous session failure'),add=signal.addEventListener.bind(signal),remove=signal.removeEventListener.bind(signal);let listeners=0;
  signal.addEventListener=(type,...args)=>{if(type==='abort')listeners++;return add(type,...args);};signal.removeEventListener=(type,...args)=>{if(type==='abort')listeners--;return remove(type,...args);};
  await assert.rejects(f.bremen.prepareInfillFrankfurtLowOfficeBulk70Reconstruction(f.rows,signal,()=>{throw failure;},f.scope),error=>error===failure);assert.equal(listeners,0);assert.throws(()=>f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows,undefined,f.scope),/not prepared/);
  await f.bremen.prepareInfillFrankfurtLowOfficeBulk70Reconstruction(f.rows,new AbortController().signal,undefined,f.scope);assert.equal(f.state.dataLoads,1);assert.equal(f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows,undefined,f.scope).stats.objects,2);controller.abort();assert.equal(listeners,0);
 }finally{f.close();}
});

const managerSource=await readFile(path.join(web,'src/painted/bremen/safety/three-dimensional-map.ts'),'utf8'),managerAST=ts.createSourceFile('manager.ts',managerSource,ts.ScriptTarget.Latest,true);
const managerDeclaration=name=>{let text;(function visit(node){if(!text&&(ts.isFunctionDeclaration(node)&&node.name?.text===name||ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText(managerAST)===name)))text=node.getText(managerAST);ts.forEachChild(node,visit);})(managerAST);assert(text,'actual Bremen manager '+name);return text;};
// The actual source path of the manager: shard waits on its wanted page-store
// source, whose production (loadSourceContent) prepares the Bremen infill owner
// routes, Bulk70 and the non-Berlin routes before it binds and publishes the
// leaf. The page store, wanted leases and source production run unchanged; the
// native source client returns the fixture rows (no bytes are decoded).
const sourcePathJS=ts.transpileModule(['sourceContentKey','sourceResourceKey','bindSourceContent','loadSourceContent','shard','wantedSources'].map(managerDeclaration).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const runtime=createRuntimeLoader(),{createWantedResourceLeases}=runtime.load(path.join(web,'src/safety/viewport-request.ts'));
function managerFixture(f,ownerProfile,gate){
 const writes=[],calls=[],wait=async operation=>{const value=await operation;await gate.promise;return value;},rows=f.rows;
 const {store}=runtime.createPageResources(),nativeSources=createFixtureNativeSources({store,city:'frankfurt',owner:'bremen-bulk70',rows:()=>rows});
 // A published source records its diagnostics exactly once, after its binding.
 const sourceDiagnostics=new Map(),recordDiagnostic=sourceDiagnostics.set.bind(sourceDiagnostics);sourceDiagnostics.set=(key,value)=>{writes.push([key,value]);return recordDiagnostic(key,value);};
 const values={resourceContentKey:runtime.load(path.join(web,'src/safety/resource-content-key.ts')).resourceContentKey,city:'frankfurt',maxVertices:200000,mobile:false,options:{awaitPaintInitialization:wait,nativeSources},resources:store,sourceOwnerKey:nativeSources.ownerKey,manifestSHA:'fixture-index',manifest:{source_pbf_sha256:'fixture-pbf',city_boundary:{sha256:'fixture'},compiler_sha256:'fixture-compiler',source_snapshot:'fixture-snapshot'},createWantedResourceLeases,ResourceBudgetExceededError:runtime.resourceBudget.ResourceBudgetExceededError,sourceDiagnostics,sourceContentByFeature:new WeakMap(),sourceResourceByFeature:new WeakMap(),
  prepareBremenInfillOwnerRouteModules:async(...args)=>{calls.push('infill-routes');assert.equal(args[0],rows);assert.equal(args[2],wait);},
  prepareInfillFrankfurtLowOfficeBulk70Reconstruction:async(...args)=>{calls.push('bulk70');assert.equal(args[0],rows);assert.equal(args[2],wait);return f.bremen.prepareInfillFrankfurtLowOfficeBulk70Reconstruction(...args);},
  prepareNonBerlinOwnerRoutes:async(...args)=>{calls.push('non-berlin');assert.equal(args[0],rows);assert.equal(args[2],wait);},
  ownerShapePatchProfile:()=>ownerProfile?{}:undefined,verifyOwnerShapePatchRows(){calls.push('verify-profile');},ownerProfileByComponent:new WeakMap(),retainedShardCost:new WeakMap(),loadCount:0,shadowAdmissionForDecodedShard:()=>undefined,THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:1024,mobile:1024},estimateRetainedBuildingPayload:()=>({retainedPayloadEstimateBytes:32}),shadowByShard:new WeakMap(),sourceLeafByFeature:new WeakMap(),prepareSourceRoleDisplay:async()=>calls.push('source-role')};
 const scope=new Proxy(values,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
 const source=Function('scope','with(scope){'+sourcePathJS+'\nreturn{shard,wantedSources,sourceResourceKey};}')(scope),descriptor={tile_key:'fixture',path:'/fixture',sha256:'fixture',bytes:1,vertices:6};
 // The manager reconciles its wanted leaves before reading them and releases that
 // demand when a request is superseded (move, hide, 2D); the fixture does the same.
 return{shard:source.shard,want:()=>source.wantedSources.reconcile([{leaf:descriptor,contentKey:source.sourceResourceKey(descriptor)}]),release:()=>source.wantedSources.reconcile([]),writes,calls,rows,descriptor};
}
for(const ownerProfile of [false,true])test(`actual Bremen shard ${ownerProfile?'profile':'ordinary'} path awaits Bulk70 before cache/admission`,async()=>{
 const f=await fixture();let m;try{const gate=deferred();m=managerFixture(f,ownerProfile,gate);m.want();const pending=m.shard(m.descriptor,new AbortController().signal);await tick();assert.deepEqual(m.calls,['infill-routes','bulk70']);assert.equal(m.writes.length,0);assert.equal(f.state.dataLoads,1);assert.throws(()=>f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows),/not prepared/);gate.resolve();assert.equal(await pending,m.rows);assert.deepEqual(m.calls.slice(0,3),['infill-routes','bulk70','non-berlin']);assert.equal(m.writes.length,1);
  // The source path only imports the builder (no scope); the renderer batch then
  // prepares and reads its data in the batch scope without a second import.
  await f.bremen.prepareInfillFrankfurtLowOfficeBulk70Reconstruction(f.rows,new AbortController().signal,undefined,f.scope);assert.equal(f.state.dataLoads,1);assert.equal(f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows,undefined,f.scope).stats.objects,2);}finally{m?.release();f.close();}
});
for(const ownerProfile of [false,true])test(`actual Bremen shard ${ownerProfile?'profile':'ordinary'} path cannot admit cancelled Bulk70 preparation`,async()=>{
 const f=await fixture();let m;try{const gate=deferred(),controller=new AbortController();m=managerFixture(f,ownerProfile,gate);m.want();const pending=m.shard(m.descriptor,controller.signal);await tick();assert.deepEqual(m.calls,['infill-routes','bulk70']);controller.abort();m.release();await assert.rejects(pending,{name:'AbortError'});gate.resolve();await tick();assert.equal(m.writes.length,0);assert.deepEqual(m.calls,['infill-routes','bulk70'],'a released source production stops before later routes');assert.throws(()=>f.bremen.infillFrankfurtLowOfficeBulk70Reconstruction(f.rows),/not prepared/);assert.throws(()=>f.budget.infillBulkBudgetCredit(f.rows.map(row=>({...row,displayEstimates:{infillFrankfurtLowOfficeBulk70:{patchSHA:f.LOW_OFFICE_SHA}}}))),/budget was not prepared/);}finally{f.close();}
});

// Static ESM value-import/re-export closure only; dynamic imports and type-only
// references intentionally remain outside the eager boundary. Preprocess source
// text without building ASTs for embedded model literals; parse only each short
// import declaration. Fail closed on unknown local import syntax or limits.
function valueImports(source,file){
 const edges=[];
 for(const reference of ts.preProcessFile(source,true,true).importedFiles){
  if(!reference.fileName.startsWith('.'))continue;
  const prefix=source.slice(Math.max(0,reference.pos-4096),reference.pos),starts=[...prefix.matchAll(/\b(?:import|export)\b/g)];let identified=false;
  if(/\brequire\s*\(\s*$/.test(prefix)){edges.push(reference.fileName);continue;}
  for(const candidate of starts.reverse()){
   const text=prefix.slice(candidate.index)+JSON.stringify(reference.fileName),dynamic=ts.createSourceFile('edge.ts',text+');',ts.ScriptTarget.Latest,true);
   if(!dynamic.parseDiagnostics.length&&dynamic.statements.length===1&&ts.isExpressionStatement(dynamic.statements[0])&&ts.isCallExpression(dynamic.statements[0].expression)&&dynamic.statements[0].expression.expression.kind===ts.SyntaxKind.ImportKeyword){identified=true;break;}
   const ast=ts.createSourceFile('edge.ts',text+';',ts.ScriptTarget.Latest,true),node=ast.statements[0];
   if(ast.parseDiagnostics.length||ast.statements.length!==1||!node||!node.moduleSpecifier||node.moduleSpecifier.text!==reference.fileName)continue;
   if(ts.isImportDeclaration(node)){const clause=node.importClause;if(!clause?.isTypeOnly&&!(clause&&!clause.name&&ts.isNamedImports(clause.namedBindings)&&clause.namedBindings.elements.length&&clause.namedBindings.elements.every(element=>element.isTypeOnly)))edges.push(reference.fileName);identified=true;break;}
   if(ts.isExportDeclaration(node)){if(!node.isTypeOnly&&!(node.exportClause&&ts.isNamedExports(node.exportClause)&&node.exportClause.elements.length&&node.exportClause.elements.every(element=>element.isTypeOnly)))edges.push(reference.fileName);identified=true;break;}
  }
  assert(identified,'Unclassified local dependency in '+file+': '+reference.fileName);
 }
 return edges;
}
async function staticClosure(entries){
 const pending=entries.map(file=>[file,null]),parents=new Map();let bytes=0;
 while(pending.length){
  const [file,parent]=pending.shift();if(parents.has(file))continue;parents.set(file,parent);assert(parents.size<=2048,'Bremen closure module bound');const info=await stat(file);bytes+=info.size;assert(info.size<=16*1024**2&&bytes<=128*1024**2,'Bremen closure source-byte bound');
  if(!/\.[cm]?[jt]sx?$/.test(file))continue;
  const source=await readFile(file,'utf8');
  for(const specifier of valueImports(source,path.relative(web,file))){
   if(specifier.includes('?'))continue;const base=path.resolve(path.dirname(file),specifier);assert(base.startsWith(path.join(web,'src')+path.sep),'Static dependency leaves product source');let resolved;
   for(const candidate of [base,...['.ts','.tsx','.mts','.js','.mjs','.json','/index.ts','/index.js'].map(extension=>base+extension)]){try{if((await stat(candidate)).isFile()){resolved=candidate;break;}}catch(error){if(error.code!=='ENOENT'&&error.code!=='ENOTDIR')throw error;}}
   assert(resolved,'Unresolved static dependency '+specifier+' in '+file);pending.push([resolved,file]);
  }
 }
 return{parents,bytes};
}
test('both actual Bremen entry points keep Bulk70 and unrelated certified city routes lazy',async t=>{
 const entries=['three-dimensional-map.ts','building-mesh-renderer.ts'].map(name=>path.join(web,'src/painted/bremen/safety',name)),closure=await staticClosure(entries),target=path.join(web,'src/painted/infill/safety/infill-frankfurt-low-office-bulk70-data.ts');
 const route=[];for(let file=target;file;file=closure.parents.get(file))route.push(path.relative(web,file));assert(!closure.parents.has(target),'Eager Bulk70 path: '+route.reverse().join(' → '));assert(closure.parents.has(path.join(web,'src/painted/infill/safety/infill-low073-duplicate-native-parts.ts')));assert(closure.parents.has(path.join(web,'src/painted/infill/safety/infill-frankfurt-low-office-bulk70-metadata.ts')));
  const registry=await readFile(path.join(web,'src/painted/root500/safety/owner-nonberlin-lazy.ts'),'utf8'),modules=new Map([...registry.matchAll(/const (\w+Route)=createLazyOwnerRoute\([^\n]+?=>import\('\.\/([^']+)'\)/g)].map(match=>[match[1],match[2]])),routes=[...registry.matchAll(/\{city:"([a-z]+)",prepare:(\w+Route)\.prepare\}/g)];
  assert.equal(routes.length,85);let unrelated=0;
  for(const [,city,routeName]of routes){if(city==='bremen')continue;unrelated++;const module=modules.get(routeName);assert(module,'Certified route module '+routeName);const file=path.join(web,'src/painted/root500/safety',module+'.ts'),route=[];for(let next=file;next;next=closure.parents.get(next))route.push(path.relative(web,next));assert(!closure.parents.has(file),'Eager unrelated city route: '+route.reverse().join(' → '));}
  assert.equal(unrelated,81);
  const oldAG70Data=path.join(web,'src/painted/bremen/safety/bremen-ag70-data.ts');assert(!closure.parents.has(oldAG70Data),'Migrated AG70 must not retain its old data/TLA entry beside the resource lease');
  assert(closure.parents.has(path.join(web,'src/painted/bremen/safety/bremen-owner-runtime.ts')));assert(closure.parents.has(path.join(web,'src/safety/frozen-data-lease-store.ts')));
  t.diagnostic('Bounded Bremen static closure: '+closure.parents.size+' local modules, '+closure.bytes+' source bytes; Bulk70 data, old AG70 data entry and all '+unrelated+' unrelated certified city builders unreachable');
});
