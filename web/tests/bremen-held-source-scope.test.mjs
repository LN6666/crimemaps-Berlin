import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';

const filename=new URL('../src/painted/bremen/safety/bremen-held-source-certificates.ts',import.meta.url);
const source=await readFile(filename,'utf8');
const ast=ts.createSourceFile(filename.pathname,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
// Re-exports (`export {...} from`) publish another module's bindings; they are not part of this module's body.
const body=ast.statements.filter(node=>!ts.isImportDeclaration(node)&&!(ts.isExportDeclaration(node)&&node.moduleSpecifier)).map(node=>node.getText(ast).replace(/^export\s+/,'' )).join('\n');
// The module body runs with its import bindings injected. Since the certificate
// data moved behind scoped getters (getBOUNDARY70_DATA(scope) and the other
// *_DATA_RESOURCE wrappers), each data getter borrows its tiny table through the
// actual FrozenDataScope, exactly like the migrated wrappers; the AG70 input is
// still passed explicitly. The graph is memoized in that scope (released with it),
// and a handle only gates access to it.
const executable=ts.transpileModule(body+'\nreturn{createBremenHeldSourceCertificates,prepareBremenHeldSourceCertificates,hasPreparedBremenCertificateUnion};',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const {createFrozenDataScope}=createRuntimeLoader().load(path.join(fileURLToPath(new URL('../src/safety/',import.meta.url)),'frozen-data-scope.ts'));
const key=row=>row.objectId+'|'+row.partId;
const tinyBatch=()=>({positions:[0,0,0],normals:[0,1,0],indices:[0,0,0],color:[.3,.4,.5]});
const signal=()=>new AbortController().signal;
const importedNames=ast.statements.filter(node=>ts.isImportDeclaration(node)&&!node.importClause?.isTypeOnly).flatMap(node=>{const clause=node.importClause,named=clause?.namedBindings;return[...(clause?.name?[clause.name.text]:[]),...(named&&ts.isNamedImports(named)?named.elements.filter(element=>!element.isTypeOnly).map(element=>element.name.text):[])];});
const tinyRef=name=>({canonicalSHA256:createHash('sha256').update(name).digest('hex'),file:'tiny/'+name+'.ts',occurrence:0,codec:'json'});
const SHAS={BOUNDARY70_SHA:'boundary',EDGE_COVERAGE_SHA:'cover',GLOCKE_DETAIL_SHA:'glocke',EDGEFILL70_SHA:'edge',AG_SHA:'ag',KARSTADT70_SHA:'kar',BREMEN_OLDTOWN70_SHA:'market',WASSERTURM70_SHA:'water',BREMEN_OLDTOWN_REPAIRS_SHA:'repairs',BREMEN_OLDTOWN_CHURCHES_SHA:'church',WS70_SHA:'ws',FLEMINGS70_SHA:'flemings',RADSTATION70_SHA:'radstation'};
const refusing=name=>()=>{throw Error('The legacy force graph must not reach '+name);};
// Module-level factories: a stub closure created inside fixture() would share its
// context (the synthetic tables), and a retained handle reaches its module's
// import bindings, so the stub itself would pin the fixture graph.
function legacyProbe(calls,replies,name){return(...args)=>{calls.push(name);return replies[name]??null;};}
function moduleBindings(calls,replies){
 const legacy={lloydFrontHeldSourceRule:'lloyd-rule',organistenHeldSourceRule:'organisten-rule',lloydFrontWholeDisplayCertificate:'lloyd',marketCapWholeDisplayCertificate:'market',organistenWholeDisplayCertificate:'organisten',glockeKuesterWholeDisplayCertificate:'glocke'};
 const fixed={nativePaintSignature:()=>'native',serializeBremenFiniteDerivedReadback:()=>null,
  // Explicit synthetic candidates for the graph/dispatch algorithm (no real metadata gate).
  bremenCertificateIdentityCandidate:()=>true,bremenCertificateCandidate:rows=>rows.length>0,
  BREMEN_DEMAND_METADATA:{repairs:{models:[]}},bremenRepairsResourceTargets:refusing('bremenRepairsResourceTargets'),
  // Forced (legacy complete) preparation: every repair target, i.e. the repair table itself.
  prepareBremenRepairsTargets:async(_targets,inputSignal,scope)=>scope.prepare([tinyRef('BREMEN_OLDTOWN_REPAIRS_DATA')],inputSignal),
  planBremenCertificateGroups:refusing('planBremenCertificateGroups'),certificateGroupKeysForIdentity:refusing('certificateGroupKeysForIdentity')};
 return Object.fromEntries(importedNames.map(name=>{
  if(name in legacy)return[name,legacyProbe(calls,replies,legacy[name])];
  if(name in fixed)return[name,fixed[name]];
  if(name in SHAS)return[name,SHAS[name]];
  if(name.endsWith('_SCOPE_RESOURCES'))return[name,[]];
  if(name==='EDGE70_RESOURCE')return[name,tinyRef('EDGE70')];
  if(name.endsWith('_RESOURCE'))return[name,tinyRef(name.slice(0,-'_RESOURCE'.length))];
  if(name.startsWith('get')){const ref=tinyRef(name.slice(3));return[name,scope=>scope.borrow(ref,value=>value)];}
  throw Error('Unbound certificate module import '+name);
 }));
}
function syntheticClient(values){
 return{async acquire(ref,inputSignal){inputSignal.throwIfAborted();const id=ref.file;assert(values.has(id),'unexpected resource '+id);let value=values.get(id);return{borrow(read){assert(value!==undefined,'released lease');return read(value);},release(){value=undefined;}};},dispose(){}};
}

function fixture(){
 // Count-complete identities use one tiny synthetic batch each. Every data table
 // is a synthetic lease value; no frozen reader, real table or geometry loads.
 const snapshots=[],groups=[];let heldCount=0;
 for(let group=0;group<19;group++){
  const childCount=group===18?6:7,identities=[];
  for(let member=0;member<=childCount;member++){
   const identity={objectId:'osm/way/'+(1000+group),partId:'tiny/'+group+'/'+member,signature:'native',sourceLeafSHA256:'leaf'};
   const geometry={type:'Polygon',coordinates:[[[8,53],[8.001,53],[8,53.001],[8,53]]]};
   snapshots.push({...identity,city:'bremen',origin:[8,53],componentGeometry:geometry,sourceFeature:{type:'Feature',geometry,properties:{tiny:group}},batches:[tinyBatch()]});
   identities.push(identity);
  }
  heldCount+=childCount;
  const carrier={...identities[0],origin:[8,53],batches:[tinyBatch()],ownerExtra:{complete:['parent',group],notAnIdentityProjection:true}};
  groups.push({targetId:'tiny-group-'+group,requiredNativeGroup:identities,displays:[carrier]});
 }
 assert.equal(heldCount,132);
 const sourceOf=identity=>snapshots.find(row=>key(row)===key(identity));
 const coverGroup=groups[0],coverParent={identity:{...coverGroup.requiredNativeGroup[0],leafSHA256:'leaf'},source:sourceOf(coverGroup.requiredNativeGroup[0]),display:coverGroup.displays[0].batches};
 const coverChild={identity:{...coverGroup.requiredNativeGroup[1],leafSHA256:'leaf'},source:sourceOf(coverGroup.requiredNativeGroup[1]),display:[],sourceCarrier:coverParent.identity};
 const lone=tag=>{const identity={objectId:tag,partId:tag};return{models:[{identity}],sourceCarrier:identity};};
 const data={models:groups},calls=[],replies={};
 const tables={BOUNDARY70_DATA:{models:[]},EDGE_COVERAGE_DATA:{groups:[{key:'cover-priority',models:[coverParent,coverChild]}]},GLOCKE_DETAIL_DATA:lone('glocke'),EDGEFILL70_DATA:{groups:[]},KARSTADT70_DATA:{models:[]},
  BREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS:snapshots,BREMEN_OLDTOWN70_DATA:{models:[],sourceAuthoritySHA256:'authority'},BREMEN_MARKET_HELD_SOURCE_SNAPSHOTS:[],WASSERTURM70_DATA:lone('water'),BREMEN_OLDTOWN_REPAIRS_DATA:{models:[]},
  BREMEN_REPAIR_SOURCE_SNAPSHOTS:[],BREMEN_ADDITIONAL_HELD_SOURCE_SNAPSHOTS:[],BREMEN_OLDTOWN_CHURCHES_DATA:{models:[]},WS70_DATA:{groups:[]},FLEMINGS70_DATA:lone('flemings'),RADSTATION70_DATA:lone('radstation'),EDGE70:data};
 const values=new Map(Object.entries(tables).map(([name,value])=>[tinyRef(name).file,value]));
 const api=new Function(...importedNames,executable)(...Object.values(moduleBindings(calls,replies)));
 const client=syntheticClient(values);
 // One batch scope per certificate unit: the forced (legacy complete) preparation
 // of the scope, then the factory with the explicit AG70 input.
 async function create(agData){
  const scope=createFrozenDataScope(client);
  try{await api.prepareBremenHeldSourceCertificates(scope,[snapshots[0]],signal(),true);const handle=api.createBremenHeldSourceCertificates(agData,scope);return{handle,scope,release(){handle.dispose();scope.release();}};}
  catch(error){scope.release();throw error;}
 }
 return{api,create,data,groups,snapshots,sourceOf,calls,replies,values};
}

test('module exports an explicit factory without AG data import or top-level scope construction',()=>{
 const imports=ast.statements.filter(ts.isImportDeclaration).map(node=>node.moduleSpecifier.text);
 assert(!imports.includes('./bremen-ag70-data'));assert(imports.includes('./bremen-ag70-metadata'));
 // The batch-scope entry points sit beside the factory; the one exported value is
 // the forced complete unit's resource list.
 const exports=ast.statements.filter(node=>node.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword));
 assert.deepEqual(exports.map(node=>ts.isVariableStatement(node)?node.declarationList.declarations.map(item=>item.name.getText(ast)).join(','):node.name?.text),['BREMEN_HELD_SOURCE_CERTIFICATES_SCOPE_RESOURCES','hasPreparedBremenCertificateUnion','hasPreparedBremenCertificateGroup','prepareBremenHeldSourceCertificates','createBremenHeldSourceCertificates']);
 for(const node of ast.statements){
  if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations){assert(!['held','parents'].includes(declaration.name.getText(ast)));const initializer=declaration.initializer?.getText(ast)??'';assert(!initializer.includes('createBremenHeldSourceCertificates('));assert(!initializer.includes('createFrozenDataScope('),'no top-level scope construction');}
 }
 assert(!imports.includes('../../../safety/frozen-data-scope')||ast.statements.filter(ts.isImportDeclaration).filter(node=>node.moduleSpecifier.text==='../../../safety/frozen-data-scope').every(node=>node.importClause?.isTypeOnly),'the module only types FrozenDataScope');
 assert.equal(ast.parseDiagnostics.length,0);
});

test('count-complete tiny scope preserves all 132 held identities, 19 whole parents and COVER override priority',async()=>{
 const f=fixture(),unit=await f.create(f.data),scope=unit.handle;let held=0,parents=0;
 try{
  assert.equal(f.api.hasPreparedBremenCertificateUnion(unit.scope),true,'the forced complete unit is published for its scope');
  for(const [index,group]of f.groups.entries()){
   for(const identity of group.requiredNativeGroup.slice(1)){assert(scope.bremenHeldSourceRule(identity));held++;}
   const identity=group.requiredNativeGroup[0],original=f.sourceOf(identity),patch=index===0?'cover':'ag',marker=index===0?'edgeCoverage':'edgeAg70';
   const displayed={...original,generation:7,origin:group.displays[0].origin,batches:group.displays[0].batches,displayEstimates:{[marker]:{patchSHA256:patch}}};
   const certificate=scope.serializeBremenWholeDisplayCertificate(displayed,7,original,()=>'leaf');
   assert.equal(certificate.certificateKind,'bremen-whole-owner-display-v1');assert.equal(certificate.patchSHA256,patch);parents++;
  }
  assert.equal(held,132);assert.equal(parents,19);
  assert.equal(scope.bremenHeldSourceRule(f.groups[0].requiredNativeGroup[1]).patchSHA256,'cover');
 }finally{unit.release();}
});

test('held readback preserves every whole-parent field while owning its cloned parent subtree',async()=>{
 const f=fixture(),unit=await f.create(f.data),scope=unit.handle,group=f.groups[1],child=f.sourceOf(group.requiredNativeGroup[1]),parent=group.displays[0];
 try{
  const certificate=scope.serializeBremenHeldSourceReadback(child,()=>'leaf',4);
  assert.deepEqual(certificate.requiredWholeDisplayParent,parent);
  assert.notEqual(certificate.requiredWholeDisplayParent,parent);
  assert.notEqual(certificate.requiredWholeDisplayParent.batches,parent.batches);
  assert.notEqual(certificate.requiredWholeDisplayParent.batches[0].positions,parent.batches[0].positions);
  assert.notEqual(certificate.requiredWholeDisplayParent.ownerExtra,parent.ownerExtra);
  certificate.requiredWholeDisplayParent.batches[0].positions[0]=123;certificate.requiredWholeDisplayParent.ownerExtra.complete.push('owned');
  assert.equal(parent.batches[0].positions[0],0);assert.deepEqual(parent.ownerExtra.complete,['parent',1]);
  assert.throws(()=>scope.serializeBremenHeldSourceReadback(child,()=>'wrong-leaf',4),/SOURCE certificate mismatch/);
 }finally{unit.release();}
});

test('legacy rule and certificate precedence is retained inside the active scope',async()=>{
 const f=fixture(),unit=await f.create(f.data),scope=unit.handle;
 try{
  f.replies['lloyd-rule']={legacy:'first'};assert.equal(scope.bremenHeldSourceRule({objectId:'unknown',partId:'unknown'}),f.replies['lloyd-rule']);assert.deepEqual(f.calls,['lloyd-rule']);
  // An absent component is now rejected by the identity gate before any delegate;
  // a candidate component still walks the original delegate order.
  f.calls.length=0;assert.equal(scope.serializeBremenWholeDisplayCertificate(undefined,1,undefined,undefined),null);assert.deepEqual(f.calls,[]);
  const candidate={city:'bremen',objectId:'unknown',partId:'unknown',generation:1,batches:[]};
  f.calls.length=0;assert.equal(scope.serializeBremenWholeDisplayCertificate(candidate,1,undefined,undefined),null);assert.deepEqual(f.calls,['lloyd','market','organisten','glocke']);
  f.calls.length=0;f.replies.market={legacy:'market'};assert.equal(scope.serializeBremenWholeDisplayCertificate(candidate,1,undefined,undefined),f.replies.market);assert.deepEqual(f.calls,['lloyd','market']);
 }finally{unit.release();}
});

test('dispose invalidates all old entrypoints and a replacement scope is independent',async()=>{
 const f=fixture(),old=await f.create(f.data),next=await f.create(f.data);old.handle.dispose();old.handle.dispose();old.scope.release();
 try{
  assert.throws(()=>old.handle.bremenHeldSourceRule(f.groups[1].requiredNativeGroup[1]),/scope disposed/);
  assert.throws(()=>old.handle.serializeBremenHeldSourceReadback(undefined,undefined,1),/scope disposed/);
  assert.throws(()=>old.handle.serializeBremenWholeDisplayCertificate(undefined,1,undefined,undefined),/scope disposed/);
  assert.equal(old.scope.stats.disposed,true);assert.equal(f.api.hasPreparedBremenCertificateUnion(old.scope),false);
  assert(next.handle.bremenHeldSourceRule(f.groups[1].requiredNativeGroup[1]));
  // The graph (held/parents and the explicit AG70 input it closes over) lives only
  // in the scope memo: the factory memoizes buildCertificates in the scope, the
  // graph's own dispose empties its arrays, and a handle never names agData.
  const declaration=name=>ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  const graphDispose=declaration('buildCertificates').body.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='dispose').getText(ast);
  assert.match(graphDispose,/held\.length=0/);assert.match(graphDispose,/parents\.length=0/);
  assert.match(declaration('createBremenHeldSourceCertificates').getText(ast),/owner\.memo\(certificatesKey,\(\)=>buildCertificates\(/);
  assert.doesNotMatch(declaration('certificateHandle').getText(ast),/agData/);
 }finally{next.release();}
});

test('the complete 132/19 and held SOURCE admission assertion still rejects incomplete input',async()=>{
 const f=fixture(),missingChild=structuredClone(f.data);missingChild.models[18].requiredNativeGroup.pop();
 await assert.rejects(f.create(missingChild),/scope132\/parents19 mismatch/);
 const missingParent=structuredClone(f.data);missingParent.models.pop();await assert.rejects(f.create(missingParent),/scope132\/parents19 mismatch/);
});

test('disposed real certificate scope and retained owned snapshot do not pin the AG parsed graph',{skip:typeof global.gc!=='function'},async()=>{
 async function retainedConsumers(){
  const f=fixture(),unit=await f.create(f.data),scope=unit.handle;
  // COVER deliberately aliases group 0's display in this fixture. Group 1 has
  // no such external alias, so its original subgraph must be collectible.
  const model=f.groups[1],carrier=model.displays[0],batch=carrier.batches[0];
  const snapshot=scope.serializeBremenHeldSourceReadback(f.sourceOf(model.requiredNativeGroup[1]),()=>'leaf',9);
  const refs={
   root:new WeakRef(f.data),models:new WeakRef(f.data.models),model:new WeakRef(model),
   carrier:new WeakRef(carrier),batch:new WeakRef(batch),positions:new WeakRef(batch.positions),
   extras:new WeakRef(carrier.ownerExtra),extraValues:new WeakRef(carrier.ownerExtra.complete),
  };
  // The synthetic lease source is the fixture's, not the scope's: drop it like a
  // released page cell before checking what the scope and handle still retain.
  f.values.clear();unit.release();
  return{scope,lease:unit.scope,snapshot,refs};
 }
 const retained=await retainedConsumers();
 for(let round=0;round<10;round++){await new Promise(resolve=>setImmediate(resolve));global.gc();}
 for(const [name,ref]of Object.entries(retained.refs))assert.equal(ref.deref(),undefined,'disposed scope / owned snapshot retained original AG '+name);
 assert.equal(retained.lease.stats.disposed,true);
 assert.throws(()=>retained.scope.bremenHeldSourceRule({objectId:'unknown',partId:'unknown'}),/scope disposed/);
 assert.deepEqual(retained.snapshot.requiredWholeDisplayParent.ownerExtra,{complete:['parent',1],notAnIdentityProjection:true});
 assert.deepEqual(retained.snapshot.requiredWholeDisplayParent.batches[0].positions,[0,0,0]);
});
