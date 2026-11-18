import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/painted/bremen/safety');
const compile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function evaluate(text,require){const module={exports:{}};Function('require','module','exports',compile(text))(require,module,module.exports);return module.exports;}
const pure=new Set(['bremen-recipe-demand','bremen-demand-metadata','bremen-identity-metadata','bremen-identity-projections','bremen-ag70-identities','bremen-ag70-metadata']);
function metadataLoader(){const cache=new Map();function load(name){if(cache.has(name))return cache.get(name);assert(pure.has(name),'Only scalar metadata may load: '+name);const api=evaluate(fs.readFileSync(path.join(safety,name+'.ts'),'utf8'),id=>load(id.slice(2)));cache.set(name,api);return api;}return load;}
const unknown={city:'bremen',objectId:'__unknown__',partId:'__unknown__/part'};

test('one synchronous batch shares its demand index, while mutation, nesting and errors cannot leave a stale batch',()=>{
 const load=metadataLoader(),demand=load('bremen-recipe-demand'),catalog=load('bremen-identity-projections').BREMEN_IDENTITY_PROJECTIONS;
 const identity=catalog.lloydFrontIdentity.rows[0];let reads=0;
 const rows=[{...identity,get city(){reads++;return'bremen';}}];
 demand.withBremenRecipeDemand(rows,()=>{
  for(let i=0;i<20;i++)assert.equal(demand.bremenRecipeDemand('lloyd-front-runtime','lloydFrontFinalBaseMaterials',rows),true);
  demand.withBremenRecipeDemand([unknown],()=>assert.equal(demand.bremenRecipeDemand('lloyd-front-runtime','lloydFrontFinalBaseMaterials',[unknown]),false));
  assert.equal(demand.bremenRecipeDemand('lloyd-front-runtime','lloydFrontFinalReconstruction',rows),true);
 });
 assert.equal(reads,1,'One input-city pass serves all consumers in the batch');
 rows[0]=unknown;assert.equal(demand.bremenRecipeDemand('lloyd-front-runtime','lloydFrontFinalBaseMaterials',rows),false);
 assert.throws(()=>demand.withBremenRecipeDemand(rows,()=>{throw Error('controlled');}),/controlled/);
 rows[0]={...identity,city:'bremen'};assert.equal(demand.bremenRecipeDemand('lloyd-front-runtime','lloydFrontFinalBaseMaterials',rows),true);
});

test('indexed demand retains collision, city, coercion and context-sensitive source-free generation contracts',()=>{
 const load=metadataLoader(),d=load('bremen-recipe-demand'),p=load('bremen-identity-projections').BREMEN_IDENTITY_PROJECTIONS,m=load('bremen-demand-metadata').BREMEN_DEMAND_METADATA;
 const c={...p.ownerF081CompletionIdentity.rows[0],city:'munich',partId:'wrong-part'};
 const rows=[c];d.withBremenRecipeDemand(rows,()=>{assert.equal(d.bremenRecipeDemand('owner-f081-completion','ownerF081CompletionReconstruction',rows),true);assert.equal(d.bremenRecipeDemand('owner-f081-completion','ownerF081CompletionMaterials',rows),false);});
 const l={...p.lloydFrontIdentity.rows[0],city:'bremen'};l.objectId=new String(l.objectId);assert.equal(d.bremenRecipeDemand('lloyd-front-runtime','lloydFrontFinalReconstruction',[l]),true);
 const galerie={...p.infillGalerieIdentity.rows[0]};assert.equal(d.bremenRecipeDemand('infill-essen-rathaus-galerie','infillGalerieReconstruction',[galerie]),true);
 const input=[unknown],name='infillBremenOldtown70Reconstruction';d.withBremenRecipeDemand(input,()=>{assert.equal(d.bremenRecipeDemand('bremen-oldtown70-runtime',name,input,[input,undefined,'wrong']),false);assert.equal(d.bremenRecipeDemand('bremen-oldtown70-runtime',name,input,[input,undefined,m.oldtown.sourceAuthoritySHA256]),true);assert.equal(d.bremenRecipeDemand('bremen-oldtown70-runtime',name,input,[input,[],m.oldtown.sourceAuthoritySHA256]),false);});
 assert.equal(d.bremenRecipeDemand('bremen-oldtown70-runtime',name,[],[[],undefined,m.oldtown.sourceAuthoritySHA256]),true);
 const foreign={city:'berlin',objectId:Symbol('foreign'),partId:Symbol('unused')};assert.equal(d.bremenRecipeDemand('lloyd-front-runtime','lloydFrontFinalReconstruction',[foreign]),false,'Irrelevant cities never coerce identity keys');
});

test('actual function preparation shares selection per module and finite dispatch, preserving scope padding, cancellation and retry',async()=>{
 const load=metadataLoader(),demand=load('bremen-recipe-demand'),catalog=load('bremen-identity-projections').BREMEN_IDENTITY_PROJECTIONS;
 let selections=0,cityReads=0,finiteMatches=0;const selected=[],identity=catalog.lloydFrontIdentity.rows[0];
 const ref=file=>({canonicalSHA256:'0'.repeat(64),file,occurrence:0,codec:'json'}),lloydRef=ref('lloyd'),f260Ref=ref('f260');
 const first=(...args)=>args,second=(...args)=>args,finiteA=()=>{},finiteB=()=>{};
 // The stage module now also routes infill data functions, the local C121 material
 // call and the separately prepared progressive-admission / old-town-repair tables.
 // None of them is selected by these rows: they stay unselected, distinct refs.
 const uninvolved={'../../infill/safety/bremen-infill-owner-routes':{infillDataFunctionArities:{},prepareInfillDataForFunction:async()=>{throw Error('no infill function in this fixture');}},'./progressive-paint-admissions':{PROGRESSIVE_ADMISSIONS_RESOURCE:ref('admissions')},'./repairs-data':{BREMEN_OLDTOWN_REPAIRS_DATA_RESOURCE:ref('repairs'),prepareBremenRepairsData:async()=>{throw Error('no repair row in this fixture');}}};
 const lloyd={first,second,MODULE_SCOPE_ARITY:{first:3,second:3},MODULE_SCOPE_CITIES:['bremen'],MODULE_SCOPE_RESOURCES:[lloydRef],MODULE_SCOPE_DEMAND:(_name,rows)=>demand.bremenRecipeDemand('lloyd-front-runtime','lloydFrontFinalBaseMaterials',rows),MODULE_SCOPE_RESOURCES_FOR_COMPONENTS(){selections++;return[lloydRef];}};
 const finite={finiteA,finiteB,MODULE_SCOPE_ARITY:{finiteA:1,finiteB:1},MODULE_SCOPE_CITIES:['bremen'],MODULE_SCOPE_RESOURCES:[],MODULE_SCOPE_DEMAND:()=>true};
 const stages=evaluate(fs.readFileSync(path.join(safety,'bremen-recipe-stages.ts'),'utf8'),id=>id==='./bremen-recipe-demand'?demand:id==='./bremen-identity-metadata'?{bremenIdentityIsPure:()=>false,bremenIdentityMatches(name,c){finiteMatches++;return load('bremen-identity-metadata').bremenIdentityMatches(name,c);}}:id==='./lloyd-front-runtime'?lloyd:id==='./bremen-finite-derived-display'?finite:id==='./f260-accepted-restore-runtime'?{MODULE_SCOPE_RESOURCES:[f260Ref]}:id in uninvolved?uninvolved[id]:{MODULE_SCOPE_RESOURCES:[]});
 const rows=[{...identity,get city(){cityReads++;return'bremen';}}],scope={async prepare(refs){selected.push(refs);}};
 await stages.prepareBremenFunctions(scope,[first,second,first],rows,new AbortController().signal);assert.equal(selections,1);assert.equal(cityReads,1);assert.deepEqual(selected,[[lloydRef]]);assert.deepEqual(stages.bremenScopedCall(first,[rows],scope),[rows,undefined,undefined,scope]);
 const finiteRow={...catalog.f260AcceptedRestoreIdentity.rows[0],city:'bremen'};await stages.prepareBremenFunctions(scope,[finiteA,finiteB],[finiteRow],new AbortController().signal);assert.equal(finiteMatches,1);assert.deepEqual(selected[1],[f260Ref]);
 const cancelled=new AbortController();cancelled.abort();await assert.rejects(stages.prepareBremenFunctions(scope,[first],rows,cancelled.signal),{name:'AbortError'});assert.equal(selections,1);
 await assert.rejects(stages.prepareBremenFunctions({async prepare(){throw Error('controlled acquire');}},[first],rows,new AbortController().signal),/controlled acquire/);
 await stages.prepareBremenFunctions(scope,[first],rows,new AbortController().signal);assert.equal(selections,3,'Rejected preparation must leave no stale fulfilled-resource shortcut');
});

test('replacement capture keeps only original marked replacements and exact stats, preserving last-wins keys and input ownership',()=>{
 const source=fs.readFileSync(path.join(safety,'owner-reconstruction.ts'),'utf8'),ast=ts.createSourceFile('owner',source,99,true);
 const names=['captureBremenReplacements','applyBremenReplacements'],body=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>'export '+n.getText(ast).replace(/^export\s+/,'' )).join('\n');
 const api=evaluate(body,()=>{throw Error('Replacement helpers have no dependencies');});
 const a={...unknown},first={...a,displayEstimates:{mark:true}},last={...first,tag:'last'},unmarked={...a,partId:'other'},components=[first,unmarked,last],stats={objects:2,vertices:6,triangles:2,originalVertices:6,components:[{objectId:'receipt'}]};
 const captured=api.captureBremenReplacements({components,stats},['mark']);assert.equal(captured.stats,stats);assert.equal(captured.replacements.size,1);assert.equal(captured.replacements.get(a.city+'|'+a.objectId+'|'+a.partId),last);assert.equal('components'in captured,false);assert.equal(components.length,3);
 const target={objects:1,vertices:3,triangles:1,originalVertices:3,components:[]},output=api.applyBremenReplacements([a,unmarked],target,captured);assert.deepEqual(output,[last,unmarked]);assert.equal(output[0],last);assert.equal(target.objects,3);assert.equal(target.components[0],stats.components[0]);assert.equal(captured.replacements.size,0,'Consumed transient index drops its component references');
 assert.equal(api.captureBremenReplacements({components,stats:{...stats,objects:0}},['mark']),undefined);
});

test('actual owner sequence replays all original marker groups in order and keeps every material consumer, including metadata-only writers',()=>{
 const load=metadataLoader(),early=new Map(Object.entries({infillBremenOldtownRepairsReconstruction:'infillBremenOldtownRepairs',infillBremenOldtownChurchesReconstruction:'infillBremenOldtownChurches',ws70Reconstruction:'ws70',bremenFlemings70Reconstruction:'bremenFlemings70',bremenRadstation70Reconstruction:'bremenRadstation70',bremenEdgefill70Reconstruction:'bremenEdgefill70',edgeDb70Reconstruction:'edgeDb70',school70Reconstruction:'school70',karstadt70Reconstruction:'karstadt70',bremenGlockeDetailReconstruction:'bremenGlockeDetail',boundary70Reconstruction:'boundary70',utility70Reconstruction:'utility70'}));
 const calls=[],replacements=new Map(),modules=new Map(),zero=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
 function namespace(id){if(modules.has(id))return modules.get(id);const functions=new Map(),api=new Proxy({}, {get(_o,name){if(name==='__esModule')return false;if(!functions.has(name))functions.set(name,(...args)=>{if(/Identity$/.test(String(name)))return false;if(/Materials(?:050)?$/.test(String(name))){calls.push(name);args[1][0]++;return;}const rows=args[0];if(/RemoveDuplicateNativeParts$/.test(String(name)))return rows;if(name==='ownerReconstructionComponents'&&id.includes('root500'))return{components:[...rows,{...unknown,objectId:'derived',partId:'derived/part'}],stats:zero()};if(early.has(name)){const replacement={...rows[0],displayEstimates:{[early.get(name)]:true},stage:name};replacements.set(name,replacement);return{components:[replacement,...rows.slice(1)],stats:{...zero(),objects:1,vertices:3,triangles:1,originalVertices:3,components:[{stage:name}]}};}return{components:rows,stats:zero()};});return functions.get(name);}});modules.set(id,api);return api;}
 const api=evaluate(fs.readFileSync(path.join(safety,'owner-reconstruction.ts'),'utf8'),id=>id==='./bremen-recipe-demand'?load('bremen-recipe-demand'):id==='./bremen-recipe-stages'?{bremenScopedCall:(fn,args,scope)=>fn(...args,scope),prepareBremenFunctions:async()=>{}}:namespace(id));
 const source=[{...unknown}],result=api.ownerReconstructionComponents(source);assert.equal(result.components[0],replacements.get('utility70Reconstruction'));assert.equal(result.components[1].objectId,'derived');assert.equal(result.stats.objects,12);assert.deepEqual(result.stats.components.map(c=>c.stage),[...early.keys()]);assert.equal(source[0].displayEstimates,undefined);
 const paint=new Float32Array(1);api.ownerReconstructionBaseMaterials(source,paint,new Float32Array());assert.equal(calls.length,99);assert.equal(calls[0],'ownerReconstructionBaseMaterials');assert.equal(paint[0],99);assert.equal(calls.at(-1),'lloydFrontFinalBaseMaterials');assert(calls.includes('infillF288OriginalBaseMaterials'),'Metadata-only marker writers must not be dropped by candidate selection');
});

test('three decoded group lookups initialize one first-wins model index per scope without weakening finite validation or release',async()=>{
 // The scope raises the page ledger's own budget error, so it loads with its actual
 // runtime dependencies (resource-budget) rather than in isolation.
 const {createFrozenDataScope}=createRuntimeLoader().load(path.resolve(safety,'../../../safety/frozen-data-scope.ts'));
 for(const [file,prefix,dataName,marker]of [['lloyd-front-runtime','lloydFront','LLOYD_FRONT_DATA','lloydFrontFinal'],['organisten-runtime','organisten','ORGANISTEN_DATA','organistenFinal'],['glocke-kuester-runtime','glockeKuester','GLOCKE_KUESTER_DATA','glockeKuesterOwnership']]){
  let reads=0,modelKeyReads=0,releases=0;const original={get objectId(){modelKeyReads++;return'known';},partId:'known/part'},first={identity:original,changed:true,role:'first',source:{origin:[0,0],componentGeometry:{},sourceFeature:{},batches:[]},display:[]},duplicate={...first,role:'second'},models=[first,duplicate];
  const ref={canonicalSHA256:'0'.repeat(64),file:file+'.ts',occurrence:0,codec:'json'};
  const api=evaluate(fs.readFileSync(path.join(safety,file+'.ts'),'utf8'),id=>{if(id==='./bremen-recipe-demand')return{bremenRecipeDemand:()=>true};if(id==='./bremen-identity-metadata')return{bremenIdentityCandidate:(_m,c)=>c.objectId==='known',bremenIdentityMatches:(_n,c)=>c.objectId==='known'};if(id==='./progressive-native-signature')return{nativePaintSignature:()=>''};return{['get'+dataName](scope){reads++;return scope.borrow(ref,value=>value);},[dataName.replace(/_DATA$/,'_SHA')]:'sha',[dataName+'_RESOURCE']:ref};});
  const scope=createFrozenDataScope({async acquire(){return{borrow:read=>read({models}),release(){releases++;}};}});await scope.prepare([ref],new AbortController().signal);
  const row={...original,city:'bremen',origin:[0,0],componentGeometry:{},sourceFeature:{},batches:[],displayEstimates:{[marker]:{patchSHA256:'sha'}}};
  const cert=api[prefix+'DisplayCertificate'];assert.equal(cert(row,scope).geometryRole,'first');const builtReads=modelKeyReads;for(let i=0;i<20;i++)assert.equal(cert(row,scope).geometryRole,'first');assert.equal(reads,1);assert.equal(modelKeyReads,builtReads,'Repeated per-component lookups never rescan model identities');
  assert.throws(()=>cert({...row,origin:[1,1]},scope),/mismatch/,'Positive candidates retain the original full finite guard');assert.equal(cert({...row,objectId:'unknown'},scope),null);
  scope.release();assert.equal(scope.stats.disposed,true);assert.equal(releases,1);assert.throws(()=>cert(row,scope),{name:'AbortError'});
 }
});

test('C121 actual Bremen material caller prepares and forwards one scope for nonmatching nonempty rows',async()=>{
 const infill=path.resolve(safety,'../../infill/safety'),realCache=new Map(),metadata=metadataLoader();
 function real(file){
  file=path.resolve(file);if(realCache.has(file))return realCache.get(file);
  const api=evaluate(fs.readFileSync(file,'utf8'),id=>{
   assert(id.startsWith('.'),'Only the actual local C121 closure may load');
   return real(path.resolve(path.dirname(file),id+'.ts'));
  });realCache.set(file,api);return api;
 }
 const runtime=real(path.join(infill,'infill-c121-original-runtime.ts'));
 const provider=real(path.join(infill,'c121-original-provider.ts'));
 const bridge=real(path.join(safety,'infill-c121-original-runtime.ts'));
 assert.equal(bridge.infillC121OriginalBaseMaterials,runtime.infillC121OriginalBaseMaterials);
 const namespaces=new Map();
 function unrelated(id){
  if(namespaces.has(id))return namespaces.get(id);
  const functions=new Map(),values={__esModule:true,MODULE_SCOPE_ARITY:{},MODULE_SCOPE_RESOURCES:[],MODULE_SCOPE_CITIES:[],infillDataFunctionArities:{}};
  const api=new Proxy(values,{get(target,key){
   if(key in target)return target[key];
   if(!functions.has(key))functions.set(key,(rows)=>({objects:0,vertices:0,components:Array.isArray(rows)?rows:[],stats:{objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]}}));
   return functions.get(key);
  }});namespaces.set(id,api);return api;
 }
 let stages;
 function requireBremen(id){
  if(id==='./infill-c121-original-runtime')return bridge;
  if(id==='./bremen-recipe-stages')return stages;
  if(id.startsWith('./')&&pure.has(id.slice(2)))return metadata(id.slice(2));
  return unrelated(id);
 }
 stages=evaluate(fs.readFileSync(path.join(safety,'bremen-recipe-stages.ts'),'utf8'),requireBremen);
 const owner=evaluate(fs.readFileSync(path.join(safety,'owner-reconstruction.ts'),'utf8'),requireBremen);
 assert(owner.BREMEN_MATERIAL_SCOPE_CONSUMERS.includes(runtime.infillC121OriginalBaseMaterials),'Actual owner loop contains the raw C121 function');
 const {createFrozenDataScope}=real(path.resolve(safety,'../../../safety/frozen-data-scope.ts'));
 const client={acquire(){throw Error('Inline C121 preparation must not fetch');},dispose(){}};
 const scope=createFrozenDataScope(client),signal=new AbortController().signal;
 const rows=[{city:'bremen',objectId:'osm/way/999999999',partId:'osm/way/999999999/component/unknown',origin:[0,0],componentGeometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[0,1],[0,0]]]},sourceFeature:{type:'Feature',geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[0,1],[0,0]]]},properties:{}},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.2,.3,.4],faceRole:'wall'}]}];
 const paint=new Float32Array(12).fill(17),frames=new Float32Array(15).fill(23);
 try{
  await stages.prepareBremenFunctions(scope,owner.BREMEN_MATERIAL_SCOPE_CONSUMERS,rows,signal);
  assert(scope.memo(provider.infillDataMemoKeys[0],()=>null) instanceof Map,'Actual prepare hook initializes the original admission index even with zero matches');
  assert.doesNotThrow(()=>owner.ownerReconstructionBaseMaterials(rows,paint,frames,scope));
  assert.equal(runtime.infillC121OriginalBaseMaterials(rows,paint,frames,scope).objects,0);
  assert.deepEqual(Array.from(paint),Array(12).fill(17));assert.deepEqual(Array.from(frames),Array(15).fill(23));
  assert.throws(()=>owner.ownerReconstructionBaseMaterials(rows,paint,frames),/prepared FrozenDataScope/);
  const cancelled=new AbortController();cancelled.abort();
  await assert.rejects(stages.prepareBremenFunctions(scope,owner.BREMEN_MATERIAL_SCOPE_CONSUMERS,rows,cancelled.signal),{name:'AbortError'});
  const disposed=createFrozenDataScope(client);disposed.release();
  await assert.rejects(stages.prepareBremenFunctions(disposed,owner.BREMEN_MATERIAL_SCOPE_CONSUMERS,rows,signal),{name:'AbortError'});
  assert.throws(()=>owner.ownerReconstructionBaseMaterials(rows,paint,frames,disposed),{name:'AbortError'});
 }finally{scope.release();}
});
