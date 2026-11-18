import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const web=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(path.join(web,'package.json')),ts=require('typescript');
const base=path.join(web,'src/painted/bremen/safety');
const runtimeSource=await readFile(path.join(base,'bremen-owner-runtime.ts'),'utf8');
const certificateSource=await readFile(path.join(base,'bremen-held-source-certificates.ts'),'utf8');
const scopeSource=await readFile(path.join(web,'src/safety/frozen-data-scope.ts'),'utf8');
const metadataSource=await readFile(path.join(base,'bremen-ag70-metadata.ts'),'utf8');
function load(source,deps={}){
  const module={exports:{}};
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  Function('require','module','exports',js)(name=>{assert(name in deps,'unexpected import '+name);return deps[name];},module,module.exports);
  return module.exports;
}
const scopeRequire=(await import('./support/fixtures-managers-a-runtime.mjs')).createRuntimeLoader().scopeRequire();
const scopeModule=load(scopeSource,{'./render-runtime/resource-budget':scopeRequire('./render-runtime/resource-budget'),'./reconstruction-resource-parents':scopeRequire('./reconstruction-resource-parents')}),metadata=load(metadataSource),AG=metadata.EDGE70_RESOURCE;
// The actual demand/identity metadata modules (24c2bda), sharing this file's AG70 metadata instance.
const bremenMetadata=(await import('./support/fixtures3-bremen-metadata.mjs')).bremenMetadataModules(metadata);
const EXTRA={canonicalSHA256:'e'.repeat(64),file:'tiny/certificate.json',occurrence:0,codec:'json'};
const REPAIRS={canonicalSHA256:'f'.repeat(64),file:'tiny/repairs.json',occurrence:0,codec:'json'};
const ast=ts.createSourceFile('certificates.ts',certificateSource,ts.ScriptTarget.Latest,true);
assert.equal(ast.parseDiagnostics.length,0);
function find(name){
  let found;
  function visit(node){
    if((ts.isFunctionDeclaration(node)||ts.isVariableDeclaration(node))&&node.name?.getText(ast)===name)found=node;
    ts.forEachChild(node,visit);
  }
  visit(ast);assert(found,'actual declaration '+name);return found;
}
function evaluate(name,bindings){
  const node=find(name),declaration=node.getText(ast).replace(/^export\s+/,'');
  const statement=ts.isVariableDeclaration(node)?'const '+declaration:declaration;
  const js=ts.transpileModule(statement+';return '+name+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  return Function(...Object.keys(bindings),js)(...Object.values(bindings));
}
const known={city:'bremen',objectId:'known',partId:'known/part',batches:[]};
const unknown={city:'bremen',objectId:'unknown',partId:'unknown/part',batches:[]};
const identityCandidate=c=>c.objectId===known.objectId&&c.partId===known.partId;
const batchCandidate=rows=>rows.some(c=>c.city==='bremen'&&identityCandidate(c));
const signal=()=>new AbortController().signal;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve};}

function fixture({buildHook,gate}={}){
  const calls={acquire:0,release:0,prepare:0,memo:0,borrow:0,build:0,held:[],readback:[],whole:[],forces:[],scopes:[]};
  const preparations=new WeakMap(),certificatesKey={},fixtureHandleKey={};
  const client={async acquire(ref){calls.acquire++;if(gate)await gate.promise;let live=true;return{
    borrow(read){assert(live);return read({synthetic:true,resource:ref.file});},
    release(){if(live){live=false;calls.release++;}},
  };},dispose(){}};
  function createFrozenDataScope(owner){
    const raw=scopeModule.createFrozenDataScope(owner);
    const scope=new Proxy(raw,{get(target,key){
      if(['prepare','memo','borrow'].includes(key))return(...args)=>{calls[key]++;return target[key](...args);};
      return Reflect.get(target,key);
    }});calls.scopes.push(scope);return scope;
  }
  const prepareActual=evaluate('prepareBremenHeldSourceCertificates',{
    bremenCertificateCandidate:batchCandidate,BREMEN_HELD_SOURCE_CERTIFICATES_SCOPE_RESOURCES:[AG,EXTRA],
    preparations,certificatesKey,
    // This gate-only plan has no snapshot slots; run the actual memo helpers.
    sourceSnapshots:evaluate('sourceSnapshots',{snapshotsKey:{},getBREMEN_REPAIR_SOURCE_SNAPSHOTS(){throw Error('No snapshots selected');},getBREMEN_ADDITIONAL_HELD_SOURCE_SNAPSHOTS(){throw Error('No snapshots selected');},getBREMEN_MARKET_HELD_SOURCE_SNAPSHOTS(){throw Error('No snapshots selected');},getBREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS(){throw Error('No snapshots selected');}}),
    ownedSnapshots:evaluate('ownedSnapshots',{ownedSnapshotsKey:{}}),
    // The old-town repair table is prepared per target outside scope.prepare. This
    // fixture's plan and complete unit never select it (a distinct, unused ref).
    BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE:REPAIRS,BREMEN_DEMAND_METADATA:{repairs:{models:[]}},
    bremenRepairsResourceTargets:()=>{throw Error('no repair row is selected in this fixture');},prepareBremenRepairsTargets:async()=>{throw Error('no repair row is selected in this fixture');},
    planBremenCertificateGroups:()=>({groups:[{key:'fixture:complete',snapshotSlots:[]}],resources:[AG,EXTRA]}),
    buildCertificates:(_data,scope)=>certificateModule.createBremenHeldSourceCertificates(scope.borrow(AG,value=>value),scope),
  });
  // An AG70 held rule names its identity: the runtime keys its immutable per-scope
  // AG70 views by it, over this fixture's AG70 identity list (known only).
  const snapshot={patchSHA256:metadata.EDGE70_SHA,identity:{objectId:known.objectId,partId:known.partId},complete:{source:[1,2],display:[3,4]}};
  const certificateModule={
    async prepareBremenHeldSourceCertificates(...args){calls.forces.push(args[3]);return prepareActual(...args);},
    hasPreparedBremenCertificateUnion(scope){return!!preparations.get(scope)?.complete&&!scope.stats.disposed;},
    hasPreparedBremenCertificateGroup(scope,key){const state=preparations.get(scope);return!!state?.complete&&state.ready.has(key)&&!scope.stats.disposed;},
    createBremenHeldSourceCertificates(data,scope){const handle=scope.memo(fixtureHandleKey,()=>{calls.build++;buildHook?.({data,scope});return{
      bremenHeldSourceRule(...args){calls.held.push(args);return identityCandidate(args[0])?snapshot:undefined;},
      serializeBremenHeldSourceReadback(...args){calls.readback.push(args);return snapshot;},
      serializeBremenWholeDisplayCertificate(...args){calls.whole.push(args);return snapshot;},
      dispose(){},
    };});const state=preparations.get(scope);if(state?.force){state.complete=true;for(const key of state.keys)state.ready.add(key);}return handle;},
  };
  const recipeModule={edgeAg70Identity:identityCandidate,edgeAg70BaseMaterials(){},createEdgeAg70Recipe(){return{edgeAg70Reconstruction(){}};}};
  const {createBremenOwnerRuntime}=load(runtimeSource,{
    '../../../safety/frozen-data-scope':{createFrozenDataScope},'./bremen-ag70-metadata':metadata,'./bremen-ag70-identities':{...bremenMetadata['./bremen-ag70-identities'],EDGE70_IDENTITIES:Object.freeze([{objectId:known.objectId,partId:known.partId}])},
    './bremen-ag70-runtime':recipeModule,'./bremen-held-source-certificates':certificateModule,
    './bremen-identity-metadata':{bremenCertificateCandidate:batchCandidate,bremenCertificateIdentityCandidate:identityCandidate},
  });
  return{runtime:createBremenOwnerRuntime(client),calls,snapshot};
}

test('unknown, empty and foreign batches prepare no graph; unknown lookups and state queries touch no data',async()=>{
  const {runtime,calls}=fixture(),scope=runtime.createBatchScope();
  for(const rows of [[],[unknown],[{...known,city:'essen'}]])await runtime.prepareBatchCertificates(scope,rows,signal());
  assert.equal(runtime.hasPreparedBatchCertificates(scope),false);
  assert.equal(runtime.bremenHeldSourceRule(unknown,scope),undefined);
  assert.equal(runtime.serializeBremenHeldSourceReadback(unknown,undefined,1,scope),null);
  assert.equal(runtime.serializeBremenWholeDisplayCertificate(unknown,1,undefined,undefined,scope),null);
  assert.deepEqual([calls.acquire,calls.prepare,calls.memo,calls.borrow,calls.build],[0,0,0,0,0]);
  scope.release();assert.equal(runtime.hasPreparedBatchCertificates(scope),false);runtime.dispose();
});

test('successful complete graph preparation marks only its scope and pins preserve its lifetime',async()=>{
  const {runtime,calls,snapshot}=fixture(),scope=runtime.createBatchScope(),other=runtime.createBatchScope();
  await runtime.prepareBatchCertificates(scope,[known],signal());
  assert.equal(calls.build,1);assert.equal(calls.acquire,2);assert.equal(runtime.hasPreparedBatchCertificates(scope),true);
  assert.equal(runtime.hasPreparedBatchCertificates(other),false);
  const counts=[calls.prepare,calls.memo,calls.borrow];
  for(let i=0;i<3;i++)assert.equal(runtime.hasPreparedBatchCertificates(scope),true);
  assert.deepEqual([calls.prepare,calls.memo,calls.borrow],counts,'readiness query is side-effect free');
  const leaf=()=> 'leaf',held=runtime.bremenHeldSourceRule(known,scope);
  assert.deepEqual(held,snapshot);assert.notEqual(held,snapshot,'complete AG70 snapshot remains owned');
  runtime.serializeBremenHeldSourceReadback(known,leaf,7,scope);
  runtime.serializeBremenWholeDisplayCertificate(known,7,known,leaf,scope);
  assert.deepEqual(calls.readback,[[known,leaf,7]]);assert.deepEqual(calls.whole,[[known,7,known,leaf]]);
  const unpin=scope.retain();scope.release();assert.equal(runtime.hasPreparedBatchCertificates(scope),true);
  unpin();assert.equal(runtime.hasPreparedBatchCertificates(scope),false);assert.equal(calls.release,2);
  other.release();runtime.dispose();
});

test('factory failure and reentrant cancellation never publish prepared readiness',async()=>{
  const failed=fixture({buildHook(){throw Error('original graph invariant rejected');}}),a=failed.runtime.createBatchScope();
  await assert.rejects(failed.runtime.prepareBatchCertificates(a,[known],signal()),/graph invariant rejected/);
  assert.equal(failed.runtime.hasPreparedBatchCertificates(a),false);a.release();assert.equal(failed.calls.release,2);failed.runtime.dispose();
  const controller=new AbortController(),cancelled=fixture({buildHook(){controller.abort();}}),b=cancelled.runtime.createBatchScope();
  await assert.rejects(cancelled.runtime.prepareBatchCertificates(b,[known],controller.signal),{name:'AbortError'});
  assert.equal(cancelled.runtime.hasPreparedBatchCertificates(b),false);b.release();assert.equal(cancelled.calls.release,2);cancelled.runtime.dispose();
});

test('aborted acquisition drains late leases without building or marking the graph',async()=>{
  const gate=deferred(),{runtime,calls}=fixture({gate}),scope=runtime.createBatchScope(),controller=new AbortController();
  const operation=runtime.prepareBatchCertificates(scope,[known],controller.signal);await tick();controller.abort();
  await assert.rejects(operation,{name:'AbortError'});scope.release();gate.resolve();await tick();
  assert.equal(calls.build,0);assert.equal(runtime.hasPreparedBatchCertificates(scope),false);
  assert.equal(calls.release,calls.acquire);runtime.dispose();
});

test('legacy prepare explicitly forces its original complete compatibility unit for unknown Bremen rows',async()=>{
  const {runtime,calls}=fixture();await runtime.prepare([unknown],signal());
  assert.equal(runtime.stats.prepared,true);assert.equal(calls.build,1);assert.deepEqual(calls.forces,[true]);
  assert.equal(runtime.hasPreparedBatchCertificates(calls.scopes[0]),true);
  runtime.clearResident();assert.equal(runtime.hasPreparedBatchCertificates(calls.scopes[0]),false);
  assert.equal(calls.release,calls.acquire);runtime.dispose();
});

test('actual certificate handle rejects unknown identities before memo and preserves candidate argument forwarding',()=>{
  let memos=0;const forwarded=[],graph={
    bremenHeldSourceRule(...args){forwarded.push(args);return 'held';},
    serializeBremenHeldSourceReadback(...args){forwarded.push(args);return 'readback';},
    serializeBremenWholeDisplayCertificate(...args){forwarded.push(args);return 'whole';},
  };
  // The handle also keeps one per-scope owned-snapshot set (the actual
  // ownedSnapshots, under its own memo key); only the certificate graph memo is counted.
  const certificatesKey={},ownedSnapshotsKey={},ownedSnapshots=evaluate('ownedSnapshots',{ownedSnapshotsKey});let ownedMemos=0;
  const handle=evaluate('certificateHandle',{bremenCertificateIdentityCandidate:identityCandidate,certificatesKey,preparations:new WeakMap(),certificateGroupKeysForIdentity:()=>[],ownedSnapshots})({stats:{disposed:false},memo(key,create){if(key===ownedSnapshotsKey){ownedMemos++;return create();}assert.equal(key,certificatesKey);memos++;return graph;}});
  assert.equal(ownedMemos,1,'the owned-snapshot set is created once with the handle');
  assert.equal(handle.bremenHeldSourceRule(unknown),undefined);assert.equal(handle.serializeBremenHeldSourceReadback(unknown,undefined,1),null);
  assert.equal(handle.serializeBremenWholeDisplayCertificate(unknown,1,undefined,undefined),null);assert.equal(memos,0);
  const foreignKnown={...known,city:'essen'},leaf=()=> 'leaf';
  assert.equal(handle.bremenHeldSourceRule(foreignKnown),'held','candidate identity adds no city restriction');
  assert.equal(handle.serializeBremenHeldSourceReadback(known,leaf,2),'readback');
  assert.equal(handle.serializeBremenWholeDisplayCertificate(known,2,known,leaf),'whole');
  assert.deepEqual(forwarded,[[foreignKnown],[known,leaf,2],[known,2,known,leaf]]);assert.equal(memos,3);
  handle.dispose();assert.throws(()=>handle.bremenHeldSourceRule(unknown),/disposed/);
});

test('actual graph dispatch rejects unknowns before model adapters and retains positive mismatch validation',()=>{
  let adapterCalls=0;const held=[{identity:known}],bindings={
    assertActive(){},bremenCertificateIdentityCandidate:identityCandidate,scope:{},delegate:()=>true,
    lloydFrontHeldSourceRule(){adapterCalls++;},organistenHeldSourceRule(){adapterCalls++;},held,
    key:c=>c.objectId+'|'+c.partId,
  };
  const heldRule=evaluate('bremenHeldSourceRule',bindings);
  assert.equal(heldRule(unknown),undefined);assert.equal(adapterCalls,0);
  assert.equal(heldRule(known),held[0]);assert.equal(adapterCalls,2);
  const serialize=evaluate('serializeBremenHeldSourceReadback',{
    assertActive(){},bremenCertificateIdentityCandidate:identityCandidate,bremenHeldSourceRule:heldRule,
    unchanged(){return false;},
  });
  assert.equal(serialize(unknown,undefined,1),null);
  assert.throws(()=>serialize(known,undefined,1),/held SOURCE certificate mismatch/);
  const whole=evaluate('serializeBremenWholeDisplayCertificate',{
    assertActive(){},bremenCertificateIdentityCandidate:identityCandidate,scope:{},delegate:()=>true,
    lloydFrontWholeDisplayCertificate(){adapterCalls++;return 'original-positive-certificate';},
  });
  const previous=adapterCalls;assert.equal(whole(unknown,1,undefined,undefined),null);assert.equal(adapterCalls,previous);
  assert.equal(whole(known,1,undefined,undefined),'original-positive-certificate');
});
