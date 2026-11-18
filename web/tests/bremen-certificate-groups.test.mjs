import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {buildBremenCertificateLedger} from './bremen-certificate-group-ledger-tools.mjs';
const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(web,'package.json')),ts=require('typescript');
const base=path.join(web,'src/painted/bremen/safety');
const [certSource,runtimeSource,ledgerSource,scopeSource]=await Promise.all(['bremen-held-source-certificates.ts','bremen-owner-runtime.ts','bremen-certificate-group-ledger.ts'].map(f=>readFile(path.join(base,f),'utf8')).concat(readFile(path.join(web,'src/safety/frozen-data-scope.ts'),'utf8')));
// Actual pure demand/identity metadata modules (24c2bda) that Bremen data and certificate modules import;
// they are bound by default, and any explicit binding of the same specifier still wins.
const scopeRequire=(await import('./support/fixtures-managers-a-runtime.mjs')).createRuntimeLoader().scopeRequire();
const BREMEN_METADATA={...(await import('./support/fixtures3-bremen-metadata.mjs')).bremenMetadataModules(),
 './render-runtime/resource-budget':scopeRequire('./render-runtime/resource-budget'),
 './reconstruction-resource-parents':scopeRequire('./reconstruction-resource-parents')};
function load(source,explicit={}){const deps={...BREMEN_METADATA,...explicit},m={exports:{}};Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(name=>{assert(name in deps,'Unexpected fixture import '+name);return deps[name];},m,m.exports);return m.exports;}
const ast=ts.createSourceFile('certificates.ts',certSource,ts.ScriptTarget.Latest,true);assert.equal(ast.parseDiagnostics.length,0);
const wrapperNames=[...new Set(ast.statements.filter(ts.isImportDeclaration).filter(n=>n.importClause?.namedBindings?.elements?.some(e=>e.name.text.startsWith('get')||e.name.text==='EDGE70_RESOURCE')).map(n=>n.moduleSpecifier.text))];
const wrappers=Object.fromEntries(await Promise.all(wrapperNames.map(async name=>[name,load(await readFile(path.join(base,name+'.ts'),'utf8'))])));
const scopeAPI=load(scopeSource),key=x=>x.objectId+'|'+x.partId,signal=()=>new AbortController().signal;
const refs={wasserturm:wrappers['./wasserturm70-data'].WASSERTURM70_DATA_RESOURCE,glocke:wrappers['./glocke-detail-data'].GLOCKE_DETAIL_DATA_RESOURCE};
const resourceKey=r=>JSON.stringify([r.canonicalSHA256,r.file,r.occurrence,r.codec]);
const batch=()=>({positions:[0,0,0],normals:[0,1,0],indices:[0,0,0],color:[.2,.3,.4]});
function family(name){
 const source=n=>({objectId:name,partId:name+'/'+n,city:'bremen',origin:[8,53],componentGeometry:{type:'Polygon',coordinates:[]},sourceFeature:{type:'Feature',properties:{tiny:name}},batches:[batch()]});
 const rows=[source(0),source(1)];
 return{rows,data:{sourceCarrier:rows[0],models:rows.map((row,index)=>({identity:{objectId:row.objectId,partId:row.partId,signature:'native',leafSHA256:'leaf'},source:row,display:index?[]:[batch()]}))}};
}
function fixture({budget,logicalBytes}={}){
 const water=family('tiny-water'),glocke=family('tiny-glocke'),known=[...water.rows,...glocke.rows],metadata={bremenCertificateIdentityCandidate:c=>known.some(row=>key(row)===key(c)),bremenCertificateCandidate:rows=>rows.some(c=>c.city==='bremen'&&known.some(row=>key(row)===key(c)))};
 const projection=f=>({sourceCarrier:f.data.sourceCarrier,models:f.data.models.map(m=>({identity:m.identity,hasSource:true}))});
 const lone=name=>({sourceCarrier:{objectId:name,partId:name},models:[{identity:{objectId:name,partId:name,leafSHA256:'leaf'},hasSource:true}]});
 const values={wasserturm:projection(water),glocke:projection(glocke),flemings:lone('unused-flemings'),radstation:lone('unused-radstation'),repairs:{models:[]},churches:{models:[]},ws:{groups:[]},oldtown:{models:[],sourceAuthoritySHA256:'authority'},edgefill:{groups:[]},AG70:{models:[]},karstadt:{models:[]},coverage:{groups:[]},boundary:{models:[]},repairSnapshots:[],churchSnapshots:[],marketSnapshots:[],extraSnapshots:[],lloyd:{models:[]},market:{models:[]},organisten:{models:[]},kuester:{models:[]}};
 const allRefs={...refs};for(const alias of ['lloyd','market','organisten','kuester'])allRefs[alias]={canonicalSHA256:alias.charCodeAt(0).toString(16).padStart(64,'0'),file:'tiny/'+alias,occurrence:0,codec:'json'};
 const ledger=buildBremenCertificateLedger({values,resources:allRefs,sourceReceiptSHA256:'a'.repeat(64),testOnlyExpectedCounts:{held:2,parents:2}});
 const groupKeys=c=>ledger.groups.filter(g=>g.candidates.some(row=>key(row)===key(c))).map(g=>g.key);
 // Test-only planner injection; production's actual ledger validator rejects this index.
 const planner={certificateGroupKeysForIdentity:groupKeys,certificateGroupKeysForModule:module=>ledger.groups.filter(g=>g.moduleKeys.includes(module)).map(g=>g.key),planBremenCertificateGroups(components){const keys=new Set(components.filter(c=>c.city==='bremen').flatMap(groupKeys)),groups=ledger.groups.filter(g=>keys.has(g.key));if(!groups.length)return;return{ledger,groups,resources:[...new Map(groups.flatMap(g=>g.resources).map(ref=>[resourceKey(ref),ref])).values()]};}};
 const acquired=[],released=[],tables=new Map([[resourceKey(refs.wasserturm),water.data],[resourceKey(refs.glocke),glocke.data]]),delegate=()=>{throw Error('Unrequested delegate must not execute');};
 const certificateAPI=load(certSource,{...wrappers,'./bremen-identity-metadata':metadata,'./bremen-certificate-group-ledger':planner,'./progressive-native-signature':{nativePaintSignature:()=> 'native'},
  './lloyd-front-runtime':{lloydFrontHeldSourceRule:delegate,lloydFrontWholeDisplayCertificate:delegate,LLOYD_FRONT_SCOPE_RESOURCES:[allRefs.lloyd]},
  './market-cap-runtime':{marketCapWholeDisplayCertificate:delegate,MARKET_CAP_SCOPE_RESOURCES:[allRefs.market]},
  './organisten-runtime':{organistenHeldSourceRule:delegate,organistenWholeDisplayCertificate:delegate,ORGANISTEN_SCOPE_RESOURCES:[allRefs.organisten]},
  './glocke-kuester-runtime':{glockeKuesterWholeDisplayCertificate:delegate,GLOCKE_KUESTER_SCOPE_RESOURCES:[allRefs.kuester]},
  './bremen-finite-derived-display':{serializeBremenFiniteDerivedReadback:delegate,BREMEN_FINITE_DERIVED_DISPLAY_SCOPE_RESOURCES:[]},
 });
 const client={resources:budget?{budget}:undefined,async acquire(ref){assert(tables.has(resourceKey(ref)),'Unselected ref '+ref.file);acquired.push(ref);let live=true;return{logicalBytes,borrow(read){assert(live);return read(tables.get(resourceKey(ref)));},release(){if(live){live=false;released.push(ref);}}};},dispose(){}};
 const runtime=load(runtimeSource,{'../../../safety/frozen-data-scope':scopeAPI,'./bremen-ag70-metadata':wrappers['./bremen-ag70-metadata'],'./bremen-held-source-certificates':certificateAPI,'./bremen-identity-metadata':metadata,'./bremen-ag70-runtime':{edgeAg70Identity:()=>false,edgeAg70BaseMaterials(){},createEdgeAg70Recipe(){throw Error('AG70 must not load');}}}).createBremenOwnerRuntime(client);
 return{water,glocke,known,ledger,metadata,planner,certificateAPI,runtime,acquired,released};
}
test('two complete synthetic groups prepare only their actual union and expose per-group readiness',async()=>{
 const f=fixture(),scope=f.runtime.createBatchScope();await f.runtime.prepareBatchCertificates(scope,[f.water.rows[1]],signal());
 assert.deepEqual(f.acquired,[refs.wasserturm]);assert.equal(f.runtime.hasPreparedBatchCertificates(scope),true);
 assert.equal(f.runtime.hasPreparedCertificateGroup(scope,'wasserturm:root'),true);assert.equal(f.runtime.hasPreparedCertificateGroup(scope,'glocke:root'),false);assert.equal(f.runtime.hasPreparedCertificateGroup(scope,'not-a-group'),false);
 assert.equal(f.runtime.bremenHeldSourceRule(f.water.rows[1],scope).parent.partId,f.water.rows[0].partId);
 assert.throws(()=>f.runtime.bremenHeldSourceRule(f.glocke.rows[1],scope),/group was not prepared/);
 const held=f.runtime.serializeBremenHeldSourceReadback(f.water.rows[1],()=> 'leaf',3,scope);assert.equal(held.sourceLeafSHA256,'leaf');
 assert.throws(()=>f.runtime.serializeBremenHeldSourceReadback({...f.water.rows[1],origin:[9,53]},()=> 'leaf',3,scope),/SOURCE certificate mismatch/);
 const unpin=scope.retain();scope.release();assert.equal(f.runtime.hasPreparedCertificateGroup(scope,'wasserturm:root'),true);unpin();assert.equal(f.runtime.hasPreparedBatchCertificates(scope),false);assert.equal(f.runtime.hasPreparedCertificateGroup(scope,'wasserturm:root'),false);assert.equal(f.released.length,1);f.runtime.dispose();
});
test('one scope fixes one union and validates both complete groups before publishing readiness',async()=>{
 const f=fixture(),scope=f.runtime.createBatchScope();await f.runtime.prepareBatchCertificates(scope,[...f.water.rows,...f.glocke.rows],signal());assert.equal(f.acquired.length,2);assert.equal(f.runtime.hasPreparedCertificateGroup(scope,'wasserturm:root'),true);assert.equal(f.runtime.hasPreparedCertificateGroup(scope,'glocke:root'),true);
 assert.throws(()=>f.runtime.serializeBremenHeldSourceReadback(f.glocke.rows[1],()=> 'wrong-leaf',1,scope),/SOURCE certificate mismatch/);
 await assert.rejects(f.runtime.prepareBatchCertificates(scope,[f.water.rows[1]],signal()),/union was already fixed/);scope.release();assert.equal(f.released.length,2);f.runtime.dispose();
});
test('the actual production planner rejects incomplete metadata and test-only two-group proof',()=>{
 const f=fixture(),loadPlanner=(complete,index)=>load(ledgerSource,{'./bremen-demand-metadata':{BREMEN_DEMAND_METADATA:{certificateLedger:index},BREMEN_DEMAND_METADATA_STATUS:{complete,sourceReceiptSHA256:'a'.repeat(64)}},'./bremen-identity-metadata':f.metadata});
 for(const planner of [loadPlanner(false,undefined),loadPlanner(true,f.ledger)]){
  assert.deepEqual(planner.certificateGroupKeysForIdentity({objectId:'unknown',partId:'unknown'}),[]);
  assert.throws(()=>planner.certificateGroupKeysForIdentity(f.water.rows[1]),/ledger is incomplete/);
 }
});


test('selected certificates settle snapshot construction before reserving the graph beside a populated page',async()=>{
 const {createResourceBudget}=BREMEN_METADATA['./render-runtime/resource-budget'];
 const budget=createResourceBudget({limitBytes:738197504,recentLimitBytes:33554432});
 const background=budget.reserve({category:'metadata',bytes:537557718,precision:'estimate'});
 const f=fixture({budget,logicalBytes:58694919}),scope=f.runtime.createBatchScope();
 try{
  await f.runtime.prepareBatchCertificates(scope,[f.water.rows[1]],signal());
  assert.equal(f.runtime.hasPreparedCertificateGroup(scope,'wasserturm:root'),true);
  assert.equal(f.runtime.bremenHeldSourceRule(f.water.rows[1],scope).parent.partId,f.water.rows[0].partId);
  const readback=f.runtime.serializeBremenHeldSourceReadback(f.water.rows[1],()=> 'leaf',3,scope);
  assert.deepEqual(readback.batches[0].positions,f.water.rows[1].batches[0].positions);
  assert.equal(budget.stats.pressureEvents,0,'independent temporary envelopes must not overlap');
 }finally{scope.release();f.runtime.dispose();}
 assert.equal(budget.stats.bytes,537557718,'all certificate construction costs release with the scope');
 assert.equal(f.released.length,1);background.release();assert.equal(budget.stats.bytes,0);
});

test('certificate staging still rejects a genuinely unfit single construction and never publishes readiness',async()=>{
 const {createResourceBudget,ResourceBudgetExceededError}=BREMEN_METADATA['./render-runtime/resource-budget'];
 const budget=createResourceBudget({limitBytes:738197504,recentLimitBytes:33554432});
 const background=budget.reserve({category:'metadata',bytes:650000000,precision:'estimate'});
 const f=fixture({budget,logicalBytes:58694919}),scope=f.runtime.createBatchScope();
 try{
  await assert.rejects(f.runtime.prepareBatchCertificates(scope,[f.water.rows[1]],signal()),ResourceBudgetExceededError);
  assert.equal(f.runtime.hasPreparedBatchCertificates(scope),false);
 }finally{scope.release();f.runtime.dispose();}
 assert.equal(budget.stats.bytes,650000000);background.release();assert.equal(budget.stats.bytes,0);
});
