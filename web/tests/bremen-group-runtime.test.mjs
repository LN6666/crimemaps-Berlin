import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(web,'package.json')),ts=require('typescript');
const source=await readFile(path.join(web,'src/painted/bremen/safety/bremen-owner-runtime.ts'),'utf8'),scopeSource=await readFile(path.join(web,'src/safety/frozen-data-scope.ts'),'utf8'),metadataSource=await readFile(path.join(web,'src/painted/bremen/safety/bremen-ag70-metadata.ts'),'utf8');
function load(text,deps={}){const js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,m={exports:{}};Function('require','module','exports',js)(name=>{assert(name in deps,'unexpected runtime dependency '+name);return deps[name];},m,m.exports);return m.exports;}
const scopeRequire=(await import('./support/fixtures-managers-a-runtime.mjs')).createRuntimeLoader().scopeRequire();
const scopeModule=load(scopeSource,{'./render-runtime/resource-budget':scopeRequire('./render-runtime/resource-budget'),'./reconstruction-resource-parents':scopeRequire('./reconstruction-resource-parents')}),metadata=load(metadataSource),AG=metadata.EDGE70_RESOURCE,EXTRA={canonicalSHA256:'e'.repeat(64),file:'test/certificate-fixture.ts',occurrence:0,codec:'json'};
// The actual demand/identity metadata modules (24c2bda), sharing this file's AG70 metadata instance.
const bremenMetadata=(await import('./support/fixtures3-bremen-metadata.mjs')).bremenMetadataModules(metadata);
// rows[0] is the first actual AG70 identity: since 24c2bda ruleView builds its isolated immutable view over
// EDGE70_IDENTITIES, so a held AG70 rule is only visible for an identity that the real projection lists.
const AG70_IDENTITY=bremenMetadata['./bremen-ag70-identities'].EDGE70_IDENTITIES[0];
const rows=[{city:'bremen',objectId:AG70_IDENTITY.objectId,partId:AG70_IDENTITY.partId,batches:[]},{city:'bremen',objectId:'derived',partId:'derived/part',batches:[],displayEstimates:{fixtureDerived:true}}];
// Candidate metadata is deliberately limited to this fixture's two known rows.
const bremenCertificateIdentityCandidate=c=>rows.some(row=>row.objectId===c.objectId&&row.partId===c.partId);
const bremenCertificateCandidate=components=>components.some(c=>c.city==='bremen'&&bremenCertificateIdentityCandidate(c));
const signal=()=>new AbortController().signal,tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve};}
function fixture({gate}={}){
 const cells=new Map(),events=[],calls={acquire:[],reconstruct:[],held:[],readback:[],whole:[],prepare:[],recipes:0,certificates:0,closed:0,physical:0,disposals:0};let disposed=false;
 const certificateStates=new WeakMap(),certificateHandleKey={};
 const hasUnion=scope=>!!certificateStates.get(scope)?.complete&&!scope.stats.disposed;
 const hasGroup=(scope,groupKey)=>hasUnion(scope)&&certificateStates.get(scope).ready.has(groupKey);
 const markLegacy=scope=>{const state=certificateStates.get(scope);assert.equal(state.force,true);state.complete=true;state.ready.add('legacy:complete');};
 const key=ref=>JSON.stringify([ref.canonicalSHA256,ref.file,ref.occurrence,ref.codec]);
 const drop=cell=>{if(!cell.pending&&!cell.leases)cells.delete(cell.key);};
 const client={async acquire(ref,requestSignal){requestSignal.throwIfAborted();assert(!disposed);calls.acquire.push({...ref});const k=key(ref);let cell=cells.get(k);if(!cell){cell={key:k,pending:0,leases:0,value:{resource:ref.file,instance:++calls.physical}};cells.set(k,cell);}cell.pending++;
   // Deliberately ignore abort after admission: scopes must release late leases.
   if(gate&&ref.canonicalSHA256===AG.canonicalSHA256)await gate.promise;
   cell.pending--;cell.leases++;events.push('acquire:'+ref.file);let live=true;
   return{borrow(read){assert(live,'borrow after release');return read(cell.value);},release(){if(!live)return;live=false;cell.leases--;events.push('release:'+ref.file);drop(cell);}};
  },dispose(){assert.equal([...cells.values()].reduce((n,c)=>n+c.pending+c.leases,0),0,'manager must drain scopes before disposing its client');disposed=true;calls.disposals++;events.push('client-dispose');}};
 // Production AG70 rule sources are certificate source snapshots whose _nativeArraysBase64 batches are
 // restored to Float32Array/Uint32Array (bremen-held-source-certificates sourceSnapshots/restore), so the
 // owned AG70 snapshot keeps a typed-array source exactly as the original fixture pinned (061399e).
 const agSnapshot={patchSHA256:metadata.EDGE70_SHA,certificateKind:'complete-owned-fixture',identity:{objectId:AG70_IDENTITY.objectId,partId:AG70_IDENTITY.partId},nested:{source:{positions:new Float32Array([1,2,3]),tags:{kept:true}},display:{positions:[4,5,6]},witnesses:[{sourceRetained:true}]}},otherSnapshot={patchSHA256:'other-patch',nested:{kept:'by reference'}};
 const identity=x=>x.objectId==='native',materials=()=>({original:'material arguments stay untouched'});
 const recipeModule={edgeAg70Identity:identity,edgeAg70BaseMaterials:materials,createEdgeAg70Recipe(data){calls.recipes++;return{edgeAg70Reconstruction(...args){calls.reconstruct.push(args);return{components:args[0],selected:args[1],leaf:args[2],borrowed:data};}};}};
 // Explicit tiny certificate unit, not a replacement for the real group planner.
 // The separate directed group cases exercise actual production group selection.
 const certificateModule={hasPreparedBremenCertificateUnion:hasUnion,hasPreparedBremenCertificateGroup:hasGroup,async prepareBremenHeldSourceCertificates(scope,components,requestSignal,force=false){calls.prepare.push({scope,components,signal:requestSignal,force});requestSignal.throwIfAborted();if(!force&&!bremenCertificateCandidate(components))return;certificateStates.set(scope,{force,complete:false,ready:new Set()});await scope.prepare([AG,EXTRA],requestSignal);requestSignal.throwIfAborted();if(!force)certificateModule.createBremenHeldSourceCertificates(undefined,scope);},createBremenHeldSourceCertificates(data,scope){assert(scope,'certificate factory receives its batch scope');const original=data??scope.borrow(AG,value=>value);assert.equal(original.resource,AG.file,'positive fixture still requires the prepared AG input');const handle=scope.memo(certificateHandleKey,()=>{calls.certificates++;let closed=false;const live=()=>assert(!closed,'closed compatibility handle');return{
   bremenHeldSourceRule(...args){live();calls.held.push(args);return args[0].other?otherSnapshot:args[0].objectId===agSnapshot.identity.objectId&&args[0].partId===agSnapshot.identity.partId?agSnapshot:undefined;},
   serializeBremenHeldSourceReadback(...args){live();calls.readback.push(args);return agSnapshot;},
   serializeBremenWholeDisplayCertificate(...args){live();calls.whole.push(args);return agSnapshot;},
   dispose(){if(closed)return;closed=true;calls.closed++;},
  };});const state=certificateStates.get(scope);if(state?.force)markLegacy(scope);else if(state){state.complete=true;state.ready.add('fixture:native-derived');}return handle;}};
 const {createBremenOwnerRuntime}=load(source,{'../../../safety/frozen-data-scope':scopeModule,'./bremen-ag70-metadata':metadata,'./bremen-ag70-identities':bremenMetadata['./bremen-ag70-identities'],'./bremen-ag70-runtime':recipeModule,'./bremen-held-source-certificates':certificateModule,'./bremen-identity-metadata':{bremenCertificateCandidate,bremenCertificateIdentityCandidate}});
 return{runtime:createBremenOwnerRuntime(client),client,cells,calls,events,agSnapshot,otherSnapshot,identity,materials,key};
}

test('batch scopes stay caller-owned, require preparation, and preserve the original cheap API exports',()=>{
 const f=fixture(),a=f.runtime.createBatchScope(),b=f.runtime.createBatchScope();assert.notEqual(a,b);assert.equal(f.calls.acquire.length,0);
 assert.equal(f.runtime.edgeAg70Identity,f.identity);assert.equal(f.runtime.edgeAg70BaseMaterials,f.materials);
 assert.throws(()=>f.runtime.edgeAg70Reconstruction(rows,undefined,undefined,a),/was not prepared/);assert.throws(()=>f.runtime.bremenHeldSourceRule(rows[0],a),/was not prepared/);
 assert.equal(f.runtime.stats.prepared,false);assert.equal(f.runtime.stats.leases,0);f.runtime.clearResident();assert.equal(a.stats.disposed,false);assert.equal(b.stats.disposed,false,'no runtime registry owns batch scopes');
 a.release();b.release();f.runtime.dispose();f.runtime.dispose();assert.equal(f.calls.disposals,1);assert.throws(()=>f.runtime.createBatchScope(),/disposed/);
});

test('the same complete batch scope supplies AG70 and certificates without legacy leases, preserving every argument and full owned snapshots',async()=>{
 const f=fixture(),scope=f.runtime.createBatchScope(),requestSignal=signal(),leaf=()=> 'native-leaf',selected=['target'];await scope.prepare([AG],requestSignal);await f.runtime.prepareBatchCertificates(scope,rows,requestSignal);
 assert.equal(f.calls.prepare.length,1);assert.equal(f.calls.prepare[0].scope,scope);assert.equal(f.calls.prepare[0].components,rows);assert.equal(f.calls.prepare[0].signal,requestSignal);assert.deepEqual(f.calls.acquire,[AG,EXTRA]);
 assert.equal(f.calls.prepare[0].force,false);
 assert.equal(f.runtime.hasPreparedCertificateGroup(scope,'fixture:native-derived'),true);assert.equal(f.runtime.hasPreparedCertificateGroup(scope,'unrequested'),false);
 assert.equal(f.calls.certificates,1,'certificate graph is built during batch preparation');assert.equal(f.calls.recipes,0);assert.deepEqual(f.calls.held,[],'preparation does not invent a public certificate lookup');assert.deepEqual(f.calls.readback,[]);assert.deepEqual(f.calls.whole,[]);
 const result=f.runtime.edgeAg70Reconstruction(rows,selected,leaf,scope);assert.equal(result.components,rows);assert.equal(result.selected,selected);assert.equal(result.leaf,leaf);assert.equal(result.borrowed,f.cells.get(f.key(AG)).value);
 f.runtime.edgeAg70Reconstruction(rows,undefined,undefined,scope);assert.deepEqual(f.calls.reconstruct[1],[rows,undefined,undefined],'scope must not occupy an omitted selected/leaf argument');
 const held=f.runtime.bremenHeldSourceRule(rows[0],scope),readback=f.runtime.serializeBremenHeldSourceReadback(rows[0],leaf,7,scope),whole=f.runtime.serializeBremenWholeDisplayCertificate(rows[0],7,rows[1],leaf,scope);
 for(const value of [held,readback,whole]){assert.deepEqual(value,f.agSnapshot);assert.notEqual(value,f.agSnapshot);assert.notEqual(value.nested.source.positions,f.agSnapshot.nested.source.positions);assert.notEqual(value.nested.display,f.agSnapshot.nested.display);}
 assert.deepEqual(f.calls.readback[0],[rows[0],leaf,7]);assert.deepEqual(f.calls.whole[0],[rows[0],7,rows[1],leaf]);assert.equal(f.runtime.bremenHeldSourceRule({...rows[0],other:true},scope),f.otherSnapshot,'non-AG snapshot semantics stay unchanged');
 assert.equal(f.calls.recipes,1);assert.equal(f.calls.certificates,1);assert.equal(f.runtime.stats.prepared,false);assert.equal(f.runtime.stats.leases,0,'batch path cannot create a second compatibility owner');
 const unpin=scope.retain();scope.release();f.runtime.clearResident();assert.equal(f.runtime.edgeAg70Reconstruction(rows,undefined,leaf,scope).components,rows);assert.equal(f.cells.size,2);
 unpin();unpin();assert.equal(f.cells.size,0);assert.throws(()=>f.runtime.bremenHeldSourceRule(rows[0],scope),{name:'AbortError'});f.agSnapshot.nested.display.positions[0]=99;assert.equal(whole.nested.display.positions[0],4,'owned certificate remains complete after source lifetime ends');f.runtime.dispose();assert.equal(f.events.at(-1),'client-dispose');
});

test('aborted batch certificate preparation releases late acquisitions without publishing or retaining a runtime scope',async()=>{
 const gate=deferred(),f=fixture({gate}),scope=f.runtime.createBatchScope(),controller=new AbortController(),preparing=f.runtime.prepareBatchCertificates(scope,rows,controller.signal);await tick();controller.abort();await assert.rejects(preparing,{name:'AbortError'});scope.release();gate.resolve();await tick();
 assert.equal(scope.stats.disposed,true);assert.equal(f.cells.size,0);assert.equal(f.calls.recipes,0);assert.equal(f.calls.certificates,0);assert.equal(f.runtime.stats.prepared,false);assert.equal(f.runtime.stats.leases,0);f.runtime.dispose();
});

test('legacy preparation keeps one compatibility scope, supports pins, and clears only after its final consumer drains',async()=>{
 const f=fixture();assert.equal(f.runtime.serializeBremenHeldSourceReadback(undefined,undefined,1),null);assert.equal(f.runtime.serializeBremenWholeDisplayCertificate(undefined,1,undefined,undefined),null);await f.runtime.prepare([{city:'frankfurt'}],signal());assert.equal(f.calls.acquire.length,0);
 await f.runtime.prepare(rows,signal());assert.deepEqual(f.calls.acquire,[AG,EXTRA]);assert.equal(f.runtime.stats.prepared,true);assert.equal(f.runtime.stats.leases,2);assert.equal(f.calls.prepare.length,1);const scope=f.calls.prepare[0].scope;
 assert.equal(f.calls.prepare[0].force,true,'legacy preparation explicitly retains its complete compatibility unit');
 assert.equal(f.runtime.hasPreparedCertificateGroup(scope,'legacy:complete'),true);assert.equal(f.runtime.hasPreparedCertificateGroup(scope,'unrequested'),false);
 assert.equal(f.runtime.edgeAg70Reconstruction(rows).components,rows);assert.deepEqual(f.calls.reconstruct[0],[rows,undefined,undefined]);assert.deepEqual(f.runtime.serializeBremenWholeDisplayCertificate(rows[0],8,rows[1],undefined),f.agSnapshot);
 const unpin=f.runtime.pin();f.runtime.clearResident();assert.equal(scope.stats.disposed,false);assert.equal(f.runtime.stats.prepared,true);assert(f.runtime.bremenHeldSourceRule(rows[0]));assert.throws(()=>f.runtime.pin(),/not prepared/);unpin();unpin();
 assert.equal(scope.stats.disposed,true);assert.equal(f.runtime.stats.prepared,false);assert.equal(f.runtime.stats.leases,0);assert.equal(f.calls.closed,1);assert.equal(f.cells.size,0);assert.throws(()=>f.runtime.edgeAg70Reconstruction(rows),/not prepared/);f.runtime.dispose();
});

test('cancelling one legacy observer cannot publish its late scope or cancel another preparation sharing the client cells',async()=>{
 const gate=deferred(),f=fixture({gate}),controller=new AbortController(),first=f.runtime.prepare(rows,controller.signal),second=f.runtime.prepare(rows,signal());await tick();controller.abort();await assert.rejects(first,{name:'AbortError'});gate.resolve();await second;await tick();
 assert.equal(f.runtime.stats.publications,1);assert.equal(f.runtime.stats.preparing,0);assert.equal(f.calls.recipes,1);assert.equal(f.calls.certificates,1);assert.equal(f.calls.physical,2,'AG70 and synthetic certificate are shared physical client cells');assert.equal(f.runtime.edgeAg70Reconstruction(rows).components,rows);f.runtime.clearResident();assert.equal(f.cells.size,0);f.runtime.dispose();
});

test('a failed legacy wait adapter cannot publish, and all original public argument slots remain separate from scope',async()=>{
 const f=fixture();await assert.rejects(f.runtime.prepare(rows,signal(),async operation=>{await operation;return{};}),/adapter changed the resource/);await tick();assert.equal(f.runtime.stats.prepared,false);assert.equal(f.runtime.stats.preparing,0);assert.equal(f.calls.recipes,0);assert.equal(f.cells.size,0);
 await f.runtime.prepare(rows,signal());assert.equal(f.runtime.stats.publications,1);f.runtime.clearResident();assert.equal(f.cells.size,0);f.runtime.dispose();
});
