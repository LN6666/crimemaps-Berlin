import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

// Execute the production certificate algorithm and FrozenDataScope. Imported
// legacy delegates are explicit probes, and data-only getters are the real
// migrated wrappers. Every lease carries tiny synthetic rows; no real table,
// frozen reader or geometry initializer is loaded.
const directory=new URL('../src/painted/bremen/safety/',import.meta.url);
const filename=new URL('bremen-held-source-certificates.ts',directory);
const source=await readFile(filename,'utf8');
const ast=ts.createSourceFile(filename.pathname,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
assert.equal(ast.parseDiagnostics.length,0);
// Actual pure demand/identity metadata modules (24c2bda) that Bremen data and certificate modules import;
// they are bound by default, and any explicit binding of the same specifier still wins.
const BREMEN_METADATA=(await import('./support/fixtures3-bremen-metadata.mjs')).bremenMetadataModules();
function executable(text,label){
 const js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 return explicit=>{const bindings={...BREMEN_METADATA,...explicit},exports={};new Function('exports','require',js)(exports,name=>{assert(name in bindings,`${label}: unexpected runtime import ${name}`);return bindings[name];});return exports;};
}
const scopeSource=await readFile(new URL('../src/safety/frozen-data-scope.ts',import.meta.url),'utf8');
const scopeRequire=(await import('./support/fixtures-managers-a-runtime.mjs')).createRuntimeLoader().scopeRequire();
const {createFrozenDataScope}=executable(scopeSource,'scope')({'./render-runtime/resource-budget':scopeRequire('./render-runtime/resource-budget'),'./reconstruction-resource-parents':scopeRequire('./reconstruction-resource-parents')});
const wrapperNames=[...new Set(ast.statements.filter(ts.isImportDeclaration).filter(node=>!node.importClause?.isTypeOnly&&node.importClause?.namedBindings?.elements?.some(item=>(item.propertyName??item.name).text.endsWith('_RESOURCE'))).map(node=>node.moduleSpecifier.text))];
const wrappers=Object.fromEntries(await Promise.all(wrapperNames.map(async name=>[name,executable(await readFile(new URL(name+'.ts',directory),'utf8'),name)({})])));
const resourceKey=ref=>JSON.stringify([ref.canonicalSHA256,ref.file,ref.occurrence,ref.codec]);
const signal=()=>new AbortController().signal;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const key=row=>row.objectId+'|'+row.partId;
const batch=()=>({positions:[0,0,0],normals:[0,1,0],indices:[0,0,0],color:[.3,.4,.5],unrecognized:{keep:true}});
const encoded=(values,uint=false)=>{const bytes=Buffer.alloc(values.length*4);values.forEach((value,index)=>uint?bytes.writeUInt32LE(value,index*4):bytes.writeFloatLE(value,index*4));return bytes.toString('base64');};
function rows(){
 const snapshots=[],groups=[];
 for(let group=0;group<19;group++){
  const childCount=group===18?6:7,identities=[];
  for(let member=0;member<=childCount;member++){
   const identity={objectId:'tiny/'+group,partId:'tiny/'+group+'/'+member,signature:'native',sourceLeafSHA256:'leaf',identityExtra:{group,member}};
   const geometry={type:'Polygon',coordinates:[[[8,53],[8.001,53],[8,53.001],[8,53]]]};
   snapshots.push({...identity,city:'bremen',origin:[8,53],componentGeometry:geometry,sourceFeature:{type:'Feature',geometry,properties:{tiny:group}},batches:[batch()],snapshotExtra:['keep',group]});
   identities.push(identity);
  }
  const carrier={...identities[0],origin:[8,53],batches:[batch()],ownerExtra:{complete:['parent',group],notAnIdentityProjection:true}};
  groups.push({targetId:'tiny-group-'+group,requiredNativeGroup:identities,displays:[carrier]});
 }
 const sourceOf=identity=>snapshots.find(row=>key(row)===key(identity));
 const first=groups[0],parent={identity:{...first.requiredNativeGroup[0],leafSHA256:'leaf'},source:sourceOf(first.requiredNativeGroup[0]),display:first.displays[0].batches,modelExtra:{coverage:'parent'}};
 const child={identity:{...first.requiredNativeGroup[1],leafSHA256:'leaf'},source:sourceOf(first.requiredNativeGroup[1]),display:[],sourceCarrier:parent.identity,modelExtra:{coverage:'child'}};
 const lone=tag=>{const identity={objectId:tag,partId:tag};return{models:[{identity}],sourceCarrier:identity};};
 // SOURCE repair snapshots exercise the original base64 decoding path, while
 // unknown batch/snapshot fields and all original raw objects remain intact.
 const stored=structuredClone(snapshots);
 for(const row of stored)for(const b of row.batches){b._nativeArraysBase64={positions:encoded(b.positions),normals:encoded(b.normals),indices:encoded(b.indices,true)};delete b.positions;delete b.normals;delete b.indices;}
 return{data:{models:groups},groups,snapshots,stored,sourceOf,values:{
  BOUNDARY70_DATA:{models:[]},EDGE_COVERAGE_DATA:{groups:[{key:'cover-priority',models:[parent,child]}]},GLOCKE_DETAIL_DATA:lone('glocke'),EDGEFILL70_DATA:{groups:[]},KARSTADT70_DATA:{models:[]},
  BREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS:stored,BREMEN_OLDTOWN70_DATA:{models:[],sourceAuthoritySHA256:'authority'},BREMEN_MARKET_HELD_SOURCE_SNAPSHOTS:[],WASSERTURM70_DATA:lone('water'),BREMEN_OLDTOWN_REPAIRS_DATA:{models:[]},BREMEN_REPAIR_SOURCE_SNAPSHOTS:[],BREMEN_ADDITIONAL_HELD_SOURCE_SNAPSHOTS:[],BREMEN_OLDTOWN_CHURCHES_DATA:{models:[]},WS70_DATA:{groups:[]},FLEMINGS70_DATA:lone('flemings'),RADSTATION70_DATA:lone('radstation'),
 }};
}
function syntheticClient(values,acquired,released){
 return {async acquire(ref,inputSignal){inputSignal.throwIfAborted();const id=resourceKey(ref);assert(values.has(id),'unexpected resource '+id);acquired.push(ref);let value=values.get(id);return{borrow(callback){assert(value!==undefined,'released lease');return callback(value);},release(){if(value===undefined)return;value=undefined;released.push(id);}};}};
}
const nativePaintSignature=c=>c.fixtureSignature??'native';
function legacyProbe(calls,replies,name){return(...args)=>{calls.push({name,args});return replies[name]??null;};}
function syntheticCandidateMetadata(identities){
 // Separate closure: retained certificate handles must keep only scalar keys,
 // never the fixture's snapshots/model arrays through a candidate predicate.
 const candidateKeys=new Set(identities.map(key));
 const bremenCertificateIdentityCandidate=c=>candidateKeys.has(key(c));
 const bremenCertificateCandidate=components=>components.some(c=>c.city==='bremen'&&bremenCertificateIdentityCandidate(c));
 return{bremenCertificateCandidate,bremenCertificateIdentityCandidate};
}
// Module-level, like syntheticCandidateMetadata: a stub created inside fixture()
// would share fixture()'s closure context (which holds the synthetic tables), and
// a retained certificate handle reaches its module's import bindings, so the stub
// itself would pin the fixture data. The actual ledger is a module singleton.
const refusingGroupLedger=Object.fromEntries(['planBremenCertificateGroups','certificateGroupKeysForIdentity','certificateGroupKeysForModule','getBremenCertificateLedger'].map(name=>[name,()=>{throw Error('Legacy force graph fixture must not execute the real group planner: '+name);}]));
function fixture(){
 const f=rows(),calls=[],replies={},acquired=[],released=[],values=new Map();
 // These are explicit synthetic candidates for the graph/dispatch algorithm.
 // Real metadata's negative/cold guards are covered by the new directed cases.
 const legacyQuery={city:'bremen',objectId:'tiny/legacy-query',partId:'tiny/legacy-query/part',batches:[]};
 const candidateMetadata=syntheticCandidateMetadata([...f.snapshots,legacyQuery]);
 for(const module of Object.values(wrappers))for(const [name,ref]of Object.entries(module))if(name.endsWith('_RESOURCE'))values.set(resourceKey(ref),name==='EDGE70_RESOURCE'?f.data:f.values[name.slice(0,-'_RESOURCE'.length)]);
 const delegatedRefs={};
 for(const name of ['LLOYD_FRONT','MARKET_CAP','ORGANISTEN','GLOCKE_KUESTER','BREMEN_FINITE_DERIVED_DISPLAY']){
  const ref={canonicalSHA256:name,file:'synthetic/'+name,occurrence:0,codec:'json'};delegatedRefs[name+'_SCOPE_RESOURCES']=[ref];values.set(resourceKey(ref),{});
 }
 const delegate=name=>legacyProbe(calls,replies,name);
 const bindings={...wrappers,
  './bremen-identity-metadata':candidateMetadata,
  './bremen-certificate-group-ledger':refusingGroupLedger,
  './lloyd-front-runtime':{LLOYD_FRONT_SCOPE_RESOURCES:delegatedRefs.LLOYD_FRONT_SCOPE_RESOURCES,lloydFrontHeldSourceRule:delegate('lloyd-rule'),lloydFrontWholeDisplayCertificate:delegate('lloyd')},
  './market-cap-runtime':{MARKET_CAP_SCOPE_RESOURCES:delegatedRefs.MARKET_CAP_SCOPE_RESOURCES,marketCapWholeDisplayCertificate:delegate('market')},
  './organisten-runtime':{ORGANISTEN_SCOPE_RESOURCES:delegatedRefs.ORGANISTEN_SCOPE_RESOURCES,organistenHeldSourceRule:delegate('organisten-rule'),organistenWholeDisplayCertificate:delegate('organisten')},
  './glocke-kuester-runtime':{GLOCKE_KUESTER_SCOPE_RESOURCES:delegatedRefs.GLOCKE_KUESTER_SCOPE_RESOURCES,glockeKuesterWholeDisplayCertificate:delegate('glocke')},
  './bremen-finite-derived-display':{BREMEN_FINITE_DERIVED_DISPLAY_SCOPE_RESOURCES:delegatedRefs.BREMEN_FINITE_DERIVED_DISPLAY_SCOPE_RESOURCES,serializeBremenFiniteDerivedReadback:delegate('derived')},
  './progressive-native-signature':{nativePaintSignature},
 };
 const api=executable(source,'certificates')(bindings);
 const client=syntheticClient(values,acquired,released);
 const scope=createFrozenDataScope(client);
 // This graph is synthetic132/19: force preserves the original full algorithm.
 // Actual grouped planning/readiness is tested separately, never mocked as valid here.
 async function prepare(){await api.prepareBremenHeldSourceCertificates(scope,[f.snapshots[0]],signal(),true);return api.createBremenHeldSourceCertificates(f.data,scope);}
 return{...f,api,scope,calls,replies,acquired,released,values,prepare,legacyQuery};
}

test('certificate public entry imports only scoped data getters and keeps all graph/decode roots inside factories',()=>{
 assert(!source.includes('readFrozenTable'));
 for(const node of ast.statements.filter(ts.isImportDeclaration))if(!node.importClause?.isTypeOnly)for(const item of node.importClause?.namedBindings?.elements??[]){const imported=(item.propertyName??item.name).text;assert(!( !imported.startsWith('get')&&/(?:_DATA|_SNAPSHOTS)$/.test(imported)),`module raw data import ${imported}`);}
 for(const node of ast.statements.filter(ts.isVariableStatement))for(const item of node.declarationList.declarations)assert(!['snapshots','held','parents','agData'].includes(item.name.getText(ast)));
 assert.match(source,/held\.length!==132\|\|parents\.length!==19/);
});

test('preparation uses original exact resource refs through explicit force, skips unknown/foreign/empty demand, and aborts before acquisition',async()=>{
 const f=fixture();await f.api.prepareBremenHeldSourceCertificates(f.scope,[],signal());await f.api.prepareBremenHeldSourceCertificates(f.scope,[{...f.snapshots[0],city:'berlin'}],signal());await f.api.prepareBremenHeldSourceCertificates(f.scope,[{city:'bremen',objectId:'unknown',partId:'unknown/part'}],signal());assert.equal(f.acquired.length,0);
 const cancelled=new AbortController();cancelled.abort();await assert.rejects(f.api.prepareBremenHeldSourceCertificates(f.scope,[f.snapshots[0]],cancelled.signal),{name:'AbortError'});assert.equal(f.acquired.length,0);
 const handle=await f.prepare();assert.equal(f.acquired.length,new Set(f.api.BREMEN_HELD_SOURCE_CERTIFICATES_SCOPE_RESOURCES.map(resourceKey)).size);
 for(const module of Object.values(wrappers))for(const [name,ref]of Object.entries(module))if(name.endsWith('_RESOURCE'))assert(f.acquired.some(actual=>resourceKey(actual)===resourceKey(ref)),name);
 const before=f.acquired.length;await f.prepare();assert.equal(f.acquired.length,before);handle.dispose();f.scope.release();assert.equal(f.released.length,before);
});

test('count-complete graph retains 132 held, 19 parents, exact source guards, decoded snapshots and COVER replacement',async()=>{
 const f=fixture(),handle=await f.prepare();let held=0,parents=0;
 for(const [index,group]of f.groups.entries()){
  for(const identity of group.requiredNativeGroup.slice(1)){assert(handle.bremenHeldSourceRule(identity));held++;}
  const original=f.sourceOf(group.requiredNativeGroup[0]),patch=index===0?wrappers['./edge-coverage-data'].EDGE_COVERAGE_SHA:wrappers['./bremen-ag70-metadata'].EDGE70_SHA,marker=index===0?'edgeCoverage':'edgeAg70';
  const current={...original,generation:7,origin:group.displays[0].origin,batches:group.displays[0].batches,displayEstimates:{[marker]:{patchSHA256:patch}}};
  const certificate=handle.serializeBremenWholeDisplayCertificate(current,7,original,()=>'leaf');assert.equal(certificate.certificateKind,'bremen-whole-owner-display-v1');assert.equal(certificate.patchSHA256,patch);parents++;
 }
 assert.equal(held,132);assert.equal(parents,19);
 const child=f.sourceOf(f.groups[1].requiredNativeGroup[1]),rule=handle.bremenHeldSourceRule(child),again=f.api.createBremenHeldSourceCertificates(f.data,f.scope);
 assert.equal(again.bremenHeldSourceRule(child),rule,'same scope reuses the graph and decoded snapshot');assert.deepEqual(Array.from(rule.source.batches[0].positions),[0,0,0]);assert.deepEqual(rule.source.snapshotExtra,['keep',1]);assert.deepEqual(rule.source.batches[0].unrecognized,{keep:true});assert.equal(f.stored[8].batches[0].positions,undefined,'original encoded table is unchanged');
 const readback=handle.serializeBremenHeldSourceReadback(child,()=>'leaf',4),carrier=f.groups[1].displays[0];assert.deepEqual(readback.requiredWholeDisplayParent,carrier);assert.notEqual(readback.requiredWholeDisplayParent.ownerExtra,carrier.ownerExtra);assert.deepEqual(readback.sourceFeature,child.sourceFeature);assert.notStrictEqual(readback.sourceFeature,child.sourceFeature);assert.deepEqual(readback.componentGeometry,child.componentGeometry);assert.notStrictEqual(readback.componentGeometry,child.componentGeometry);assert.notEqual(readback.batches[0].positions,child.batches[0].positions);
 readback.requiredWholeDisplayParent.ownerExtra.complete.push('owned');assert.deepEqual(carrier.ownerExtra.complete,['parent',1]);
 for(const changed of [{...child,fixtureSignature:'changed'},{...child,origin:[9,53]},{...child,batches:[{...child.batches[0],positions:[1,0,0]}]}])assert.throws(()=>handle.serializeBremenHeldSourceReadback(changed,()=>'leaf',4),/SOURCE certificate mismatch/);
 assert.throws(()=>handle.serializeBremenHeldSourceReadback(child,()=>'wrong',4),/SOURCE certificate mismatch/);assert.throws(()=>handle.serializeBremenHeldSourceReadback(child,()=>'leaf',NaN),/SOURCE certificate mismatch/);
 assert.equal(handle.bremenHeldSourceRule(f.groups[0].requiredNativeGroup[1]).modelExtra.coverage,'child');handle.dispose();again.dispose();f.scope.release();
});

test('legacy dispatch order, authority argument, exact result alias and final shared scope are preserved',async()=>{
 const f=fixture(),handle=await f.prepare(),query={...f.legacyQuery,generation:1};f.replies['lloyd-rule']={legacy:'first'};assert.equal(handle.bremenHeldSourceRule(query),f.replies['lloyd-rule']);assert.deepEqual(f.calls.map(c=>c.name),['lloyd-rule']);assert.equal(f.calls[0].args.at(-1),f.scope);
 f.calls.length=0;handle.serializeBremenWholeDisplayCertificate(query,1,undefined,undefined);assert.deepEqual(f.calls.map(c=>c.name),['lloyd','market','organisten','glocke']);for(const c of f.calls)assert.equal(c.args.at(-1),f.scope);assert.equal(f.calls[1].args.at(-2),'authority');
 f.calls.length=0;f.replies.market={legacy:'market'};assert.equal(handle.serializeBremenWholeDisplayCertificate(query,1,undefined,undefined),f.replies.market);assert.deepEqual(f.calls.map(c=>c.name),['lloyd','market']);handle.dispose();f.scope.release();
});

test('native-absent whole-parent branch preserves complete carrier and strict derived certificate admission',async()=>{
 const f=fixture(),group=f.groups[1],children=group.requiredNativeGroup.slice(1),carrier=group.displays[0];
 f.data.models.splice(1,1);
 const market=f.values.get(resourceKey(wrappers['./oldtown70-data'].BREMEN_OLDTOWN70_DATA_RESOURCE));
 market.models.push({targetId:group.targetId,requiredNativeGroup:children,displays:[carrier],sourceBinding:{nativeParentAbsent:true,exactNativeComponents:children},componentGeometry:{retained:'geometry'},sourceFeature:{retained:'feature'}});
 const handle=await f.prepare(),source=f.sourceOf(children[0]),held=handle.serializeBremenHeldSourceReadback(source,()=>'leaf',3),current={...source,...carrier,generation:3};
 assert.deepEqual(held.requiredWholeDisplayParent,carrier);assert.equal(held.wholeDisplayParentSourceAbsent,true);
 f.replies.derived={generation:3,patchSHA256:wrappers['./oldtown70-data'].BREMEN_OLDTOWN70_SHA,nested:{kept:true}};
 const whole=handle.serializeBremenWholeDisplayCertificate(current,3,undefined,undefined);assert.equal(whole.certificateKind,'bremen-whole-derived-display-v1');assert.equal(whole.derivedCertificate,f.replies.derived);assert.equal(f.calls.at(-1).args.at(-1),f.scope);assert.equal(f.calls.at(-1).args[1],true);
 assert.throws(()=>handle.serializeBremenWholeDisplayCertificate(current,3,source,()=>'leaf'),/acquired native SOURCE/);f.replies.derived={generation:2,patchSHA256:wrappers['./oldtown70-data'].BREMEN_OLDTOWN70_SHA};assert.throws(()=>handle.serializeBremenWholeDisplayCertificate(current,3,undefined,undefined),/derived whole parent certificate mismatch/);handle.dispose();f.scope.release();
});

test('scope pins keep certificates valid until final release; handle disposal and other scopes are independent',async()=>{
 const first=fixture(),second=fixture(),old=await first.prepare(),other=await second.prepare(),same=first.api.createBremenHeldSourceCertificates(first.data,first.scope),identity=first.groups[1].requiredNativeGroup[1],unpin=first.scope.retain();
 old.dispose();assert.throws(()=>old.bremenHeldSourceRule(identity),/scope disposed/);assert(same.bremenHeldSourceRule(identity));first.scope.release();assert.equal(first.scope.stats.disposed,false);assert(same.bremenHeldSourceRule(identity));assert.equal(first.released.length,0);
 unpin();unpin();assert.equal(first.scope.stats.disposed,true);assert.equal(first.released.length,first.acquired.length);assert.throws(()=>same.bremenHeldSourceRule(identity),{name:'AbortError'});assert(other.bremenHeldSourceRule(identity));other.dispose();second.scope.release();
});

test('missing scope, unprepared scopes and incomplete 132/19 source groups fail closed without fallback loads',async()=>{
 const f=fixture();assert.throws(()=>f.api.createBremenHeldSourceCertificates(f.data),/prepared frozen data scope/);assert.throws(()=>f.api.createBremenHeldSourceCertificates(f.data,f.scope),/not prepared/);assert.equal(f.acquired.length,0);
 await f.api.prepareBremenHeldSourceCertificates(f.scope,[f.snapshots[0]],signal(),true);const incomplete=structuredClone(f.data);incomplete.models[18].requiredNativeGroup.pop();assert.throws(()=>f.api.createBremenHeldSourceCertificates(incomplete,f.scope),/scope132\/parents19 mismatch/);
 const valid=f.api.createBremenHeldSourceCertificates(f.data,f.scope);assert(valid.bremenHeldSourceRule(f.groups[1].requiredNativeGroup[1]));valid.dispose();f.scope.release();
});

test('released scope and retained disposed handles do not pin decoded SOURCE or original AG subgraphs',{skip:typeof global.gc!=='function'},async()=>{
 async function retained(){
  const f=fixture(),handle=await f.prepare(),identity=f.groups[1].requiredNativeGroup[1],rule=handle.bremenHeldSourceRule(identity),model=f.groups[1],snapshot=handle.serializeBremenHeldSourceReadback(f.sourceOf(identity),()=>'leaf',9);
  const refs=Object.fromEntries(Object.entries({root:f.data,models:f.data.models,model,carrier:model.displays[0],positions:model.displays[0].batches[0].positions,extras:model.displays[0].ownerExtra,decoded:rule.source,decodedPositions:rule.source.batches[0].positions}).map(([name,value])=>[name,new WeakRef(value)]));
  f.values.clear();f.calls.length=0;handle.dispose();f.scope.release();return{handle,scope:f.scope,snapshot,refs};
 }
 const kept=await retained();for(let round=0;round<10;round++){await tick();global.gc();}
 for(const [name,ref]of Object.entries(kept.refs))assert.equal(ref.deref()===undefined,true,'released scope retained '+name);assert.equal(kept.scope.stats.disposed,true);assert.deepEqual(kept.snapshot.requiredWholeDisplayParent.ownerExtra.complete,['parent',1]);assert.throws(()=>kept.handle.bremenHeldSourceRule({objectId:'missing',partId:'missing'}),/scope disposed/);
});
