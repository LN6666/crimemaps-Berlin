import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(web,'package.json')),ts=require('typescript');
const base=path.join(web,'src/painted/bremen/safety');
const [certSource,runtimeSource,followupSource,scopeSource]=await Promise.all([
  readFile(path.join(base,'bremen-held-source-certificates.ts'),'utf8'),
  readFile(path.join(base,'bremen-owner-runtime.ts'),'utf8'),
  readFile(path.join(base,'bremen-followup012-certificates.ts'),'utf8'),
  readFile(path.join(web,'src/safety/frozen-data-scope.ts'),'utf8'),
]);
// Actual pure demand/identity metadata modules (24c2bda) that Bremen data and certificate modules import;
// they are bound by default, and any explicit binding of the same specifier still wins.
const scopeRequire=(await import('./support/fixtures-managers-a-runtime.mjs')).createRuntimeLoader().scopeRequire();
const BREMEN_METADATA={...(await import('./support/fixtures3-bremen-metadata.mjs')).bremenMetadataModules(),
 './render-runtime/resource-budget':scopeRequire('./render-runtime/resource-budget'),
 './reconstruction-resource-parents':scopeRequire('./reconstruction-resource-parents')};
function load(source,explicit={},globals={}){
  const module={exports:{}},deps={...BREMEN_METADATA,...explicit};
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  Function('require','module','exports',...Object.keys(globals),js)(name=>{assert(name in deps,'Unexpected certificate fixture import '+name);return deps[name];},module,module.exports,...Object.values(globals));
  return module.exports;
}
const ast=ts.createSourceFile('certificate.ts',certSource,ts.ScriptTarget.Latest,true);
function evaluate(name,bindings={},source=certSource){
  const tree=source===certSource?ast:ts.createSourceFile('followup.ts',source,ts.ScriptTarget.Latest,true);let target;
  (function visit(node){if((ts.isFunctionDeclaration(node)||ts.isVariableDeclaration(node))&&node.name?.getText(tree)===name)target=node;ts.forEachChild(node,visit);})(tree);
  assert(target,'Actual certificate declaration '+name);
  const expression=ts.isVariableDeclaration(target)?target.initializer.getText(tree):target.getText(tree);
  const js=ts.transpileModule('const value=('+expression+');return value;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  return Function(...Object.keys(bindings),js)(...Object.values(bindings));
}
const wrapperNames=[...new Set(ast.statements.filter(ts.isImportDeclaration).filter(node=>!node.importClause?.isTypeOnly&&node.importClause?.namedBindings?.elements?.some(item=>(item.propertyName??item.name).text.endsWith('_RESOURCE'))).map(node=>node.moduleSpecifier.text))];
const wrappers=Object.fromEntries(await Promise.all(wrapperNames.map(async name=>[name,load(await readFile(path.join(base,name+'.ts'),'utf8'))])));
const {createFrozenDataScope}=load(scopeSource),AG=wrappers['./bremen-ag70-metadata'].EDGE70_RESOURCE,AG_SHA=wrappers['./bremen-ag70-metadata'].EDGE70_SHA;
const SNAP=wrappers['./bremen-extra-held-source-snapshots'].BREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS_RESOURCE;
const resourceKey=ref=>JSON.stringify([ref.canonicalSHA256,ref.file,ref.occurrence,ref.codec]);
const key=c=>c.objectId+'|'+c.partId,pair=c=>({objectId:c.objectId,partId:c.partId});
const signal=()=>new AbortController().signal,tick=()=>new Promise(resolve=>setImmediate(resolve));
const unrequested=()=>{throw Error('Unselected certificate delegate');};
const nativePaintSignature=c=>c.fixtureSignature??'native';
function deferred(){let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve};}
function encoded(values,uint=false){const bytes=Buffer.alloc(values.length*4);for(let i=0;i<values.length;i++)uint?bytes.writeUInt32LE(values[i],i*4):bytes.writeFloatLE(values[i],i*4);return bytes.toString('base64');}
function identityMetadata(identities){
  const keys=new Set(identities.map(key));
  return{bremenCertificateIdentityCandidate:c=>keys.has(key(c)),bremenCertificateCandidate:components=>components.some(c=>c.city==='bremen'&&keys.has(key(c)))};
}
function plannerForPlan(plan,metadata){
  const groupKey=plan.groups[0].key;
  return{certificateGroupKeysForIdentity:c=>metadata.bremenCertificateIdentityCandidate(c)?[groupKey]:[],certificateGroupKeysForModule:module=>module==='bremen-ag70-runtime'?[groupKey]:[],planBremenCertificateGroups:components=>metadata.bremenCertificateCandidate(components)?plan:undefined};
}
function syntheticClient(tables,calls,gate){
  return{async acquire(ref){assert(tables.has(resourceKey(ref)));calls.acquired.push(ref);if(gate)await gate.promise;calls.active++;let live=true;return{borrow(read){assert(live,'borrow after release');return read(tables.get(resourceKey(ref)));},release(){if(live){live=false;calls.active--;calls.released++;}}};},dispose(){assert.equal(calls.active,0);}};
}
function trackedDecoder(calls,onDecode){return value=>{calls.decodes++;onDecode?.(calls.decodes);return globalThis.atob(value);};}
function sourceRow(index){
  const geometry={type:'Polygon',coordinates:[[[8,53],[8.1,53],[8,53.1],[8,53]]]};
  return{objectId:'tiny-ag70',partId:'tiny-ag70/'+index,city:'bremen',origin:[8,53],componentGeometry:geometry,sourceFeature:{type:'Feature',geometry,properties:{complete:{fixture:index}}},batches:[{positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array([0,1,0,0,1,0,0,1,0]),indices:new Uint32Array([0,1,2]),color:[.3,.4,.5],unknownBatchMetadata:{keep:['complete',index]}}],unknownSourceMetadata:{keep:[index]}};
}
function fixture({gate,onDecode}={}){
  const rows=[sourceRow(0),sourceRow(1)],leaf=c=>'leaf-'+c.partId;
  const stored=structuredClone(rows);
  for(const row of stored)for(const batch of row.batches){batch._nativeArraysBase64={positions:encoded(batch.positions),normals:encoded(batch.normals),indices:encoded(batch.indices,true)};delete batch.positions;delete batch.normals;delete batch.indices;}
  const carrier={...pair(rows[0]),origin:[8,53],batches:[{positions:[0,0,0,2,0,0,0,2,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.7,.8,.9],unknownDisplayMetadata:{all:['preserved']}}],unknownParentMetadata:{full:{keep:true}}};
  const data={models:[{targetId:'tiny-AG70-complete-group',requiredNativeGroup:rows.map(row=>({...pair(row),signature:'native',sourceLeafSHA256:leaf(row),unknownIdentity:{keep:true}})),displays:[carrier]}]};
  const groupKey='AG70:0',held={identity:pair(rows[1]),parent:pair(rows[0]),leafSHA256:leaf(rows[1]),parentSourceAbsent:false,groupKey},parent={identity:pair(rows[0]),parentSourceAbsent:false,groupKey};
  // Explicit tiny planner input; no production132/19 proof is fabricated.
  const group={key:groupKey,alias:'AG70',index:0,modelIndex:0,name:data.models[0].targetId,moduleKeys:['bremen-ag70-runtime'],kind:'core',candidates:rows.map(pair),held:[held],parents:[parent],snapshotSlots:rows.map((row,rowIndex)=>({identity:pair(row),alias:'extraSnapshots',rowIndex,priority:3})),resourceAliases:['AG70','extraSnapshots'],resources:[AG,SNAP],dependencies:[]};
  const plan={ledger:{groups:[group],held:[held],parents:[parent]},groups:[group],resources:[AG,SNAP]};
  const metadata=identityMetadata(rows),planner=plannerForPlan(plan,metadata);
  const calls={decodes:0,acquired:[],released:0,active:0},tables=new Map([[resourceKey(AG),data],[resourceKey(SNAP),stored]]);
  const client=syntheticClient(tables,calls,gate);
  const api=load(certSource,{...wrappers,'./bremen-identity-metadata':metadata,'./bremen-certificate-group-ledger':planner,'./progressive-native-signature':{nativePaintSignature},
    './lloyd-front-runtime':{lloydFrontHeldSourceRule:unrequested,lloydFrontWholeDisplayCertificate:unrequested,LLOYD_FRONT_SCOPE_RESOURCES:[]},
    './market-cap-runtime':{marketCapWholeDisplayCertificate:unrequested,MARKET_CAP_SCOPE_RESOURCES:[]},
    './organisten-runtime':{organistenHeldSourceRule:unrequested,organistenWholeDisplayCertificate:unrequested,ORGANISTEN_SCOPE_RESOURCES:[]},
    './glocke-kuester-runtime':{glockeKuesterWholeDisplayCertificate:unrequested,GLOCKE_KUESTER_SCOPE_RESOURCES:[]},
    './bremen-finite-derived-display':{serializeBremenFiniteDerivedReadback:unrequested,BREMEN_FINITE_DERIVED_DISPLAY_SCOPE_RESOURCES:[]},
  },{atob:trackedDecoder(calls,onDecode)});
  const runtime=load(runtimeSource,{'../../../safety/frozen-data-scope':{createFrozenDataScope},'./bremen-ag70-metadata':wrappers['./bremen-ag70-metadata'],'./bremen-held-source-certificates':api,'./bremen-identity-metadata':metadata,
    // The runtime keys its per-scope AG70 rule views by the AG70 identity list; here
    // that list is this fixture's tiny AG70 group (the planner's explicit input).
    './bremen-ag70-identities':{...BREMEN_METADATA['./bremen-ag70-identities'],EDGE70_IDENTITIES:Object.freeze(rows.map(pair))},'./bremen-ag70-runtime':{edgeAg70Identity:metadata.bremenCertificateIdentityCandidate,edgeAg70BaseMaterials:unrequested,createEdgeAg70Recipe:unrequested}}).createBremenOwnerRuntime(client);
  const display=generation=>({...rows[0],generation,batches:carrier.batches.map(batch=>({...batch,positions:new Float32Array(batch.positions),normals:new Float32Array(batch.normals),indices:new Uint32Array(batch.indices)})),displayEstimates:{edgeAg70:{patchSHA256:AG_SHA}}});
  return{runtime,api,rows,stored,data,carrier,leaf,display,calls,tables,groupKey};
}
function countCopies(work){
  const originalClone=globalThis.structuredClone,originalFrom=Array.from,clones=[],from=[];
  globalThis.structuredClone=value=>{clones.push(value);return originalClone(value);};
  Array.from=function(value,...args){from.push(value);return originalFrom.call(this,value,...args);};
  try{return{value:work(),clones,from};}finally{globalThis.structuredClone=originalClone;Array.from=originalFrom;}
}

test('certificate storage: decoding owns one typed buffer and comparisons allocate no Number arrays',()=>{
  const restore=evaluate('restore',{atob:globalThis.atob,nativeLittleEndian:new Uint8Array(new Uint32Array([0x01020304]).buffer)[0]===4});
  const input=[0,-0,1/3,Infinity,-Infinity,NaN],floats=countCopies(()=>restore(encoded(input)));
  assert(floats.value instanceof Float32Array);assert.equal(floats.value.byteLength,input.length*4);assert.equal(floats.from.length,0);
  for(let i=0;i<input.length;i++)assert(Object.is(floats.value[i],Math.fround(input[i])));
  const uint=restore(encoded([0,2147483648,4294967295],true),true);assert(uint instanceof Uint32Array);assert.equal(uint[2],4294967295);
  assert.throws(()=>restore(Buffer.from([1,2,3]).toString('base64')),/source array byte length/);
  const sameArray=evaluate('sameArray'),same=evaluate('same',{sameArray}),followupSame=evaluate('same',{},followupSource);
  for(const compare of [same,followupSame]){
    const result=countCopies(()=>compare(new Float32Array([0,-0,NaN]),[0,-0,NaN]));assert.equal(result.value,true);assert.equal(result.from.length,0);
    assert.equal(compare(new Float32Array([-0]),[0]),false);assert.equal(compare([1],[1,2]),false);
  }
  assert.equal(sameArray(new Float32Array([.1]),[.1],true),true);assert.equal(sameArray(new Float32Array([.1]),[.1],false),false);
});

test('certificate storage: same-scope preparation and handles reuse selected decoded buffers and graph',async()=>{
  const f=fixture(),scope=f.runtime.createBatchScope();
  await Promise.all([f.runtime.prepareBatchCertificates(scope,f.rows,signal()),f.runtime.prepareBatchCertificates(scope,f.rows,signal())]);
  const a=f.api.createBremenHeldSourceCertificates(undefined,scope),b=f.api.createBremenHeldSourceCertificates(undefined,scope),rule=a.bremenHeldSourceRule(f.rows[1]);
  assert.equal(f.calls.decodes,6);assert.deepEqual(f.calls.acquired,[AG,SNAP]);
  assert(rule.source.batches[0].positions instanceof Float32Array);assert(rule.source.batches[0].indices instanceof Uint32Array);
  assert.equal(a.bremenHeldSourceRule(f.rows[1]),b.bremenHeldSourceRule(f.rows[1]));
  assert.equal(a.bremenHeldSourceRule(f.rows[1]).source.batches[0].positions.buffer,rule.source.batches[0].positions.buffer);
  assert.deepEqual(rule.source.unknownSourceMetadata,{keep:[1]});assert.deepEqual(rule.source.batches[0].unknownBatchMetadata,{keep:['complete',1]});
  assert.equal(f.stored[1].batches[0].positions,undefined,'encoded original data remains unchanged');
  await f.runtime.prepareBatchCertificates(scope,f.rows,signal());assert.equal(f.calls.decodes,6);assert.equal(f.calls.acquired.length,2);
  a.dispose();assert(b.bremenHeldSourceRule(f.rows[1]));b.dispose();scope.release();f.tables.clear();assert.equal(f.calls.active,0);f.runtime.dispose();
});

test('certificate storage: actual AG serializers own complete output once and raw rule snapshots still detach',async()=>{
  const f=fixture(),scope=f.runtime.createBatchScope();await f.runtime.prepareBatchCertificates(scope,f.rows,signal());
  const handle=f.api.createBremenHeldSourceCertificates(undefined,scope),held=countCopies(()=>f.runtime.serializeBremenHeldSourceReadback(f.rows[1],f.leaf,7,scope));
  assert.equal(held.clones.length,2,'one complete parent plus one shared metadata graph, with no second full-output clone');
  assert.equal(held.from.length,5,'only public origin/positions/normals/indices/color materialize Number arrays');
  assert(handle.ownsSnapshot(held.value));assert(!handle.ownsSnapshot({...held.value}));
  assert(Reflect.ownKeys(held.value).every(key=>typeof key==='string'));assert(Array.isArray(held.value.batches[0].positions));
  assert.equal(held.value.sourceFeature.geometry,held.value.componentGeometry,'metadata aliasing is preserved inside the owned snapshot');
  held.value.sourceFeature.properties.complete.fixture=99;held.value.componentGeometry.coordinates[0][0][0]=99;
  held.value.requiredWholeDisplayParent.unknownParentMetadata.full.keep=false;held.value.batches[0].positions[0]=99;
  assert.equal(f.rows[1].sourceFeature.properties.complete.fixture,1);assert.equal(f.rows[1].componentGeometry.coordinates[0][0][0],8);
  assert.equal(f.carrier.unknownParentMetadata.full.keep,true);assert.equal(f.rows[1].batches[0].positions[0],0);
  const whole=countCopies(()=>f.runtime.serializeBremenWholeDisplayCertificate(f.display(7),7,f.rows[0],f.leaf,scope));
  assert.equal(whole.clones.length,0);assert.equal(whole.from.length,4);assert(handle.ownsSnapshot(whole.value));assert(Array.isArray(whole.value.batches[0].indices));
  // The runtime isolates and freezes the AG70 group once per scope (one clone of the
  // whole group); every public rule read is then one complete ownership copy of it.
  const view=countCopies(()=>f.runtime.bremenHeldSourceRuleView(f.rows[1],scope));assert.equal(view.clones.length,1,'the frozen per-scope AG70 view clones its group once');assert(Object.isFrozen(view.value)&&Object.isFrozen(view.value.source));
  assert.equal(countCopies(()=>f.runtime.bremenHeldSourceRuleView(f.rows[1],scope)).clones.length,0,'the view is reused within its scope');
  const rule=countCopies(()=>f.runtime.bremenHeldSourceRule(f.rows[1],scope));assert.equal(rule.clones.length,1,'borrowed graph still receives its complete AG ownership copy');assert.notEqual(rule.value,view.value);
  assert(!handle.ownsSnapshot(rule.value));rule.value.source.batches[0].positions[0]=90;assert.equal(handle.bremenHeldSourceRule(f.rows[1]).source.batches[0].positions[0],0);
  const retained=structuredClone(whole.value);handle.dispose();scope.release();f.tables.clear();f.runtime.dispose();assert.deepEqual(whole.value,retained);
});

test('certificate storage: full SOURCE/parent/array/leaf/generation checks remain on the positive path',async()=>{
  const f=fixture(),scope=f.runtime.createBatchScope();await f.runtime.prepareBatchCertificates(scope,f.rows,signal());
  for(const field of ['positions','normals','indices','color']){const changed=structuredClone(f.rows[1]);changed.batches[0][field][0]+=1;assert.throws(()=>f.runtime.serializeBremenHeldSourceReadback(changed,f.leaf,7,scope),/SOURCE certificate mismatch/);}
  assert.throws(()=>f.runtime.serializeBremenHeldSourceReadback({...f.rows[1],fixtureSignature:'wrong'},f.leaf,7,scope),/SOURCE certificate mismatch/);
  assert.throws(()=>f.runtime.serializeBremenHeldSourceReadback(f.rows[1],()=> 'wrong-leaf',7,scope),/SOURCE certificate mismatch/);
  assert.throws(()=>f.runtime.serializeBremenHeldSourceReadback(f.rows[1],f.leaf,NaN,scope),/SOURCE certificate mismatch/);
  for(const field of ['positions','normals','indices']){const changed=f.display(7);changed.batches[0][field][0]+=1;assert.throws(()=>f.runtime.serializeBremenWholeDisplayCertificate(changed,7,f.rows[0],f.leaf,scope),/DISPLAY certificate mismatch/);}
  assert.equal(f.runtime.serializeBremenWholeDisplayCertificate(f.display(8),7,f.rows[0],f.leaf,scope),null);
  assert.throws(()=>f.runtime.serializeBremenWholeDisplayCertificate(f.display(7),7,{...f.rows[0],origin:[9,53]},f.leaf,scope),/SOURCE certificate mismatch/);
  const badMarker=f.display(7);badMarker.displayEstimates.edgeAg70.patchSHA256='wrong';assert.throws(()=>f.runtime.serializeBremenWholeDisplayCertificate(badMarker,7,f.rows[0],f.leaf,scope),/DISPLAY certificate mismatch/);
  scope.release();f.tables.clear();f.runtime.dispose();
});

test('certificate storage: cancellation before/after acquisition or during decode cannot publish ready data',async()=>{
  const before=fixture(),a=before.runtime.createBatchScope(),early=new AbortController();early.abort();
  await assert.rejects(before.runtime.prepareBatchCertificates(a,before.rows,early.signal),{name:'AbortError'});assert.equal(before.calls.acquired.length,0);a.release();before.tables.clear();before.runtime.dispose();
  const gate=deferred(),late=fixture({gate}),b=late.runtime.createBatchScope(),cancel=new AbortController(),work=late.runtime.prepareBatchCertificates(b,late.rows,cancel.signal);await tick();cancel.abort();
  await assert.rejects(work,{name:'AbortError'});b.release();gate.resolve();await tick();assert.equal(late.calls.decodes,0);assert.equal(late.calls.active,0);assert.equal(late.runtime.hasPreparedBatchCertificates(b),false);late.tables.clear();late.runtime.dispose();
  const controller=new AbortController(),during=fixture({onDecode(){controller.abort();}}),c=during.runtime.createBatchScope();
  await assert.rejects(during.runtime.prepareBatchCertificates(c,during.rows,controller.signal),{name:'AbortError'});assert.equal(during.runtime.hasPreparedBatchCertificates(c),false);assert.equal(during.runtime.hasPreparedCertificateGroup(c,during.groupKey),false);
  c.release();assert.equal(during.calls.active,0);during.tables.clear();during.runtime.dispose();
});

test('certificate storage: scope pins and independent handles do not weaken ownership after release',async()=>{
  const f=fixture(),scope=f.runtime.createBatchScope();await f.runtime.prepareBatchCertificates(scope,f.rows,signal());
  const a=f.api.createBremenHeldSourceCertificates(undefined,scope),b=f.api.createBremenHeldSourceCertificates(undefined,scope),owned=f.runtime.serializeBremenHeldSourceReadback(f.rows[1],f.leaf,3,scope),unpin=scope.retain();
  a.dispose();assert.throws(()=>a.bremenHeldSourceRule(f.rows[1]),/scope disposed/);scope.release();assert(b.bremenHeldSourceRule(f.rows[1]));assert(b.ownsSnapshot(owned));assert.equal(f.calls.active,2);
  unpin();assert.equal(f.calls.active,0);assert.throws(()=>b.bremenHeldSourceRule(f.rows[1]),{name:'AbortError'});assert.equal(f.runtime.hasPreparedCertificateGroup(scope,f.groupKey),false);
  assert.equal(owned.sourceFeature.properties.complete.fixture,1);assert.deepEqual(owned.requiredWholeDisplayParent.unknownParentMetadata,{full:{keep:true}});b.dispose();f.tables.clear();f.runtime.dispose();
});

test('certificate storage: retained owned outputs and disposed handles do not pin graph or binary buffers',{skip:typeof globalThis.gc!=='function'},async()=>{
  async function release(){
    const f=fixture(),scope=f.runtime.createBatchScope();await f.runtime.prepareBatchCertificates(scope,f.rows,signal());
    const handle=f.api.createBremenHeldSourceCertificates(undefined,scope),rule=handle.bremenHeldSourceRule(f.rows[1]);
    const weak={graphRow:new WeakRef(rule),decoded:new WeakRef(rule.source),positions:new WeakRef(rule.source.batches[0].positions),buffer:new WeakRef(rule.source.batches[0].positions.buffer),parsedAG:new WeakRef(f.data),rawSnapshots:new WeakRef(f.stored)};
    const owned=f.runtime.serializeBremenHeldSourceReadback(f.rows[1],f.leaf,4,scope);handle.dispose();scope.release();f.tables.clear();f.runtime.dispose();return{handle,scope,owned,weak};
  }
  const retained=await release();for(let round=0;round<10;round++){await tick();globalThis.gc();}
  for(const[name,ref]of Object.entries(retained.weak))assert.equal(ref.deref(),undefined,'retained '+name);
  assert.equal(retained.scope.stats.disposed,true);assert.deepEqual(retained.owned.batches[0].positions,[0,0,0,1,0,0,0,1,0]);
});
