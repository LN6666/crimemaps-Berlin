import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const safety=path.join(root,'src/painted/bremen/safety');
const scopePath=path.join(root,'src/safety/frozen-data-scope.ts');
const scopeRequire=(await import('./support/fixtures-managers-a-runtime.mjs')).createRuntimeLoader().scopeRequire('recipe fixture scope');
const signaturePath=path.join(root,'src/painted/root500/safety/progressive-native-signature.ts');
const source=n=>fs.readFileSync(path.join(safety,n+'.ts'),'utf8');
const key=r=>JSON.stringify([r.canonicalSHA256,r.file,r.occurrence,r.codec]);

// Only these tiny code modules are evaluated. Data getters borrow the injected
// values below; neither the table reader nor a real table/file is reachable.
function modules(overrides={}){
 const cache=new Map(),evaluated=[];
 const allowed=new Set(['bremen-demand-metadata','bremen-recipe-demand','bremen-identity-metadata','bremen-identity-projections','bremen-ag70-identities','bremen-ag70-metadata','lloyd-front-runtime','lloyd-front-data','bremen-teerhof-detail-runtime','bremen-teerhof-detail-data','progressive-paint','progressive-paint-admissions','f260-accepted-restore-data','bremen-finite-derived-display','oldtown70-data','s020-relation-outline-display','owner-f116-completion','owner-f122-completion','owner-f126-completion','owner-f128-completion','owner-f131-completion']);
 const restore={f260AcceptedRestoreAdmission:()=>undefined,F260_ACCEPTED_RESTORE_SCOPE_RESOURCES:[],f260AcceptedRestoreIdentity:()=>false,f260AcceptedRestoreDisplayCertificate:()=>null};
 const kunst={KUNSTHALLE70_SCOPE_RESOURCES:[],bremenKunsthalle70DerivedIdentity:()=>false,serializeBremenKunsthalle70DerivedReadback:()=>null};
 function load(file){
  file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
  const record={exports:{}};cache.set(file,record);evaluated.push(file);
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const req=id=>{
   if(Object.hasOwn(overrides,id))return overrides[id];
   if(id==='./progressive-native-signature')return load(signaturePath);
   if(id==='./f260-accepted-restore-runtime')return restore;
   if(id==='./kunsthalle70-runtime')return kunst;
   if(id==='./progressive-native-signature'||id.endsWith('/progressive-native-signature'))return load(signaturePath);
   if(id==='./progressive-merged-tower-family')return{validProgressiveNativeFamily:()=>true};
   if(id==='./progressive-paint-validation')return{progressivePaintValidation:c=>c.testReject?'tiny rejected native carrier':undefined};
   if(file===scopePath)return scopeRequire(id);
   if(id==='./frozen-paint-ids')return{FROZEN_PAINT_IDS:new Set()};
   if(id==='./progressive-feature-glsl')return{PROGRESSIVE_FEATURE_SHA:'d'.repeat(64)};
   const target=path.resolve(path.dirname(file),id+'.ts');
   if(target===scopePath||target===signaturePath||path.dirname(target)===safety&&allowed.has(path.basename(target,'.ts')))return load(target);
   throw Error('Unexpected recipe fixture dependency: '+id);
  };
  new Function('require','module','exports',js)(req,record,record.exports);
  return record.exports;
 }
 return{load:n=>load(path.join(safety,n+'.ts')),scope:()=>load(scopePath),signature:()=>load(signaturePath),evaluated};
}

function owner(createFrozenDataScope,values,{pending=false}={}){
 const calls=[],released=[];let resolve;
 const client={async acquire(ref,signal){calls.push({...ref});if(pending)await new Promise(r=>{resolve=r;});signal.throwIfAborted();assert.ok(values.has(key(ref)),'unregistered tiny resource '+ref.file);let live=true;return{borrow(read){assert.ok(live);return read(values.get(key(ref)));},release(){if(live){live=false;released.push(key(ref));}}};}};
 return{scope:createFrozenDataScope(client),calls,released,finish:()=>resolve?.()};
}
const signal=()=>new AbortController().signal;
function triangle(seed=0){return{positions:[seed,0,0,seed+1,0,0,seed,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.4,.5,.6],paint:Array(12).fill(.25+seed),frames:Array.from({length:15},(_,i)=>i+seed)};}
function component(id,city='bremen',seed=0){return{city,objectId:'osm/way/'+id,partId:'osm/way/'+id+'/part',origin:[8,53],componentGeometry:{type:'Polygon',coordinates:[[[8,53],[8.1,53],[8,53.1],[8,53]]]},sourceFeature:{type:'Feature',id:'osm/way/'+id,properties:{name:'tiny'},geometry:{type:'Polygon',coordinates:[]}},batches:[triangle(seed)]};}
function typed(c){return{...c,batches:c.batches.map(b=>({...b,positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),paint:new Float32Array(b.paint),frames:new Float32Array(b.frames)}))};}
function pack(a,uint=false){const b=Buffer.alloc(a.length*4);a.forEach((v,i)=>uint?b.writeUInt32LE(v,i*4):b.writeFloatLE(v,i*4));return b.toString('base64');}
function lloydFixture(nativePaintSignature,projections){
 const pair=c=>c.objectId+'|'+c.partId,carrier=projections.lloydFrontCarrierIdentity.rows[0],other=projections.lloydFrontIdentity.rows.filter(row=>!projections.lloydFrontCarrierIdentity.rows.some(parent=>pair(parent)===pair(row)));
 assert.ok(carrier&&other.length>=2,'Real projected Lloyd carrier and two noncarrier identities are required');
 const selected=[carrier,...other.slice(0,2)],native=selected.map((row,index)=>({...component(index+1),objectId:row.objectId,partId:row.partId})),models=native.map((c,i)=>{
  const src=structuredClone(c),expected=i===1?[]:structuredClone(c.batches),display=i===0?[triangle(2)]:i===2?structuredClone(c.batches):[];
  for(const b of src.batches){b._nativeArraysBase64={positions:pack(b.positions),normals:pack(b.normals),indices:pack(b.indices,true)};delete b.positions;delete b.normals;delete b.indices;}
  return{identity:{objectId:c.objectId,partId:c.partId,signature:nativePaintSignature(c),leafSHA256:'leaf'+i},source:src,expected,display,changed:i===0,role:'tiny-'+i};
 });
 const input=native.map((c,i)=>({...typed(c),batches:i===1?[]:typed(c).batches,displayEstimates:{edgeCoverage:{patchSHA256:'expected',group:'lloyd'}}}));
 return{native:native.map(typed),models,input,data:{models,expectedCoverageSHA256:'expected',sourceCarrier:{objectId:native[0].objectId,partId:native[0].partId}},leaf:c=>'leaf'+native.findIndex(s=>s.partId===c.partId)};
}

// A cross-city cold short circuit must not require a scope or eagerly initialize
// decoded SOURCE/model maps. Matching data-dependent calls still fail closed.
test('cold metadata and original no-match guards never acquire data',()=>{
 const m=modules(),r=m.load('lloyd-front-runtime'),t=m.load('bremen-teerhof-detail-runtime');
 assert.equal(r.lloydFrontIdentity({...component(8),city:'berlin'}),false);
 const input=[component(8,'berlin')];
 assert.strictEqual(r.lloydFrontFinalReconstruction(input,[],undefined).components,input);
 assert.strictEqual(t.teerhofDetailReconstruction(input).components,input);
 assert.equal(r.lloydFrontDisplayCertificate(undefined),null);
 const known=m.load('bremen-identity-projections').BREMEN_IDENTITY_PROJECTIONS.lloydFrontIdentity.rows[0],cold={borrow(){throw Error('Pure identity must not borrow');},memo(){throw Error('Pure identity must not memoize');}};
 assert.equal(r.lloydFrontIdentity(component(1)),false);assert.equal(r.lloydFrontIdentity({...component(1),objectId:known.objectId,partId:known.partId},cold),true);
 assert.equal(r.lloydFrontHeldSourceRule(component(1)),undefined);
 assert.deepEqual(r.MODULE_SCOPE_CITIES,['bremen']);
 assert.equal(r.MODULE_SCOPE_ARITY.lloydFrontFinalReconstruction,3);
 assert.equal(r.MODULE_SCOPE_ARITY.lloydFrontWholeDisplayCertificate,4);
 assert.deepEqual(r.MODULE_SCOPE_RESOURCES,[r.LLOYD_FRONT_SCOPE_RESOURCES[0]]);
 assert.deepEqual(r.MODULE_SCOPE_RESOURCES[0],{canonicalSHA256:'4a733773715c075aeaa92a6ce9de1e486577be95770bb4a40f147f03bd1a3699',file:'painted/bremen/safety/lloyd-front-data.ts',occurrence:0,codec:'json'});
 assert.ok(m.evaluated.every(p=>!p.includes('painted-tables')));
});

test('real Lloyd recipe preserves complete SOURCE guards, six arrays and unrelated material offsets',async()=>{
 const m=modules(),r=m.load('lloyd-front-runtime'),{createFrozenDataScope}=m.scope(),f=lloydFixture(m.signature().nativePaintSignature,m.load('bremen-identity-projections').BREMEN_IDENTITY_PROJECTIONS),ref=r.MODULE_SCOPE_RESOURCES[0];
 const o=owner(createFrozenDataScope,new Map([[key(ref),f.data]]));await o.scope.prepare(r.MODULE_SCOPE_RESOURCES,signal());
 const unrelated=typed(component(9)),input=[unrelated,...f.input],out=r.lloydFrontFinalReconstruction(input,f.native,f.leaf,o.scope);
 assert.equal(out.stats.objects,2);assert.strictEqual(out.components[0],unrelated);assert.strictEqual(out.components[2],input[2]);assert.strictEqual(out.components[3],input[3]);
 const display=out.components[1];for(const field of ['positions','normals','indices','paint','frames','color'])assert.deepEqual(Array.from(display.batches[0][field]),f.models[0].display[0][field]);
 assert.ok(display.batches[0].positions instanceof Float32Array);assert.ok(display.batches[0].indices instanceof Uint32Array);
 assert.deepEqual(Array.from(input[1].batches[0].positions),Array.from(f.native[0].batches[0].positions));
 const paint=new Float32Array(36).fill(-1),frames=new Float32Array(45).fill(-1),mat=r.lloydFrontFinalBaseMaterials(out.components,paint,frames,o.scope);
 assert.equal(mat.objects,1);assert.deepEqual([...paint.slice(0,12)],Array(12).fill(-1));assert.deepEqual([...paint.slice(12,24)],f.models[0].display[0].paint);assert.deepEqual([...frames.slice(15,30)],f.models[0].display[0].frames);assert.deepEqual([...paint.slice(24)],Array(12).fill(-1));
 const cert=r.lloydFrontWholeDisplayCertificate({...display,generation:7},7,f.native[0],f.leaf,o.scope);assert.equal(cert.displayVertices,3);cert.batches[0].positions[0]=999;assert.notEqual(display.batches[0].positions[0],999);
 assert.throws(()=>r.lloydFrontWholeDisplayCertificate({...display,generation:8},7,f.native[0],f.leaf,o.scope),/mismatch/);
 assert.equal(r.lloydFrontHeldSourceRule(f.native[1],o.scope).group,'lloyd-central-front');
 for(const bad of [f.input.slice(1),[...f.input,f.input[0]],f.input.map((c,i)=>i===0?{...c,origin:[9,53]}:c)])assert.strictEqual(r.lloydFrontFinalReconstruction(bad,f.native,f.leaf,o.scope).components,bad);
 assert.strictEqual(r.lloydFrontFinalReconstruction(f.input,f.native,()=> 'wrong-leaf',o.scope).components,f.input);
 o.scope.release();assert.equal(o.released.length,1);
});

test('decoded model memo belongs to each scope and remains live only while pinned',async()=>{
 const m=modules(),r=m.load('lloyd-front-runtime'),{createFrozenDataScope}=m.scope(),f=lloydFixture(m.signature().nativePaintSignature,m.load('bremen-identity-projections').BREMEN_IDENTITY_PROJECTIONS),ref=r.MODULE_SCOPE_RESOURCES[0],values=new Map([[key(ref),f.data]]);
 const a=owner(createFrozenDataScope,values),b=owner(createFrozenDataScope,values);await Promise.all([a.scope.prepare([ref],signal()),b.scope.prepare([ref],signal())]);
 const first=r.lloydFrontHeldSourceRule(f.native[1],a.scope),again=r.lloydFrontHeldSourceRule(f.native[1],a.scope),other=r.lloydFrontHeldSourceRule(f.native[1],b.scope);
 assert.strictEqual(first.source,again.source);assert.notStrictEqual(first.source,other.source);assert.notStrictEqual(first.source,f.models[1].source);assert.equal(first.source.batches[0].positions[3],1);
 const unpin=a.scope.retain();a.scope.release();assert.equal(a.released.length,0);assert.strictEqual(r.lloydFrontHeldSourceRule(f.native[1],a.scope).source,first.source);unpin();unpin();assert.equal(a.released.length,1);assert.throws(()=>r.lloydFrontHeldSourceRule(f.native[1],a.scope),{name:'AbortError'});
 assert.strictEqual(r.lloydFrontHeldSourceRule(f.native[1],b.scope).source,other.source);b.scope.release();assert.equal(b.released.length,1);
});

test('progressive admissions, rejection/readback state and frame packing use the same scope',async()=>{
 const m=modules(),p=m.load('progressive-paint'),{createFrozenDataScope}=m.scope(),ref=p.MODULE_SCOPE_RESOURCES[0],c=typed(component(10)),n=m.signature().nativePaintSignature(c);
 const row={city:c.city,objectId:c.objectId,partId:c.partId,origin:c.origin,descriptionSHA256:'a'.repeat(64),geometrySignature:n,tier:1,mode:'tiny',family:7,wallColor:[.2,.3,.4],batchColors:{'0':[.2,.3,.4]},surfaceFrames:[{batchIndex:0,firstVertex:0,vertexCount:3,family:7,uAxis:[1,0,0],vAxis:[0,1,0],uOrigin:0,vOrigin:0,height:2,width:3}]};
 const a=owner(createFrozenDataScope,new Map([[key(ref),[row]]])),b=owner(createFrozenDataScope,new Map([[key(ref),[row]]]));await Promise.all([a.scope.prepare([ref],signal()),b.scope.prepare([ref],signal())]);
 assert.equal(p.getProgressivePaintCount(a.scope),undefined);const data=p.progressivePaintData([c],a.scope);assert.equal(p.getProgressivePaintCount(a.scope),1);assert.deepEqual([...data.slice(0,4)],[Math.fround(.2),Math.fround(.3),Math.fround(.4),1]);assert.equal(p.progressiveRenderStatus(a.scope).length,1);assert.deepEqual(p.progressiveRenderStatus(b.scope),[]);
 const frame=p.applyProgressiveFrames([c],new Float32Array(15),a.scope);assert.deepEqual([...frame.slice(0,5)],[0,0,2,3,7]);
 const rejected={...c,testReject:true};assert.equal(p.progressiveAdmission(rejected,a.scope),undefined);assert.equal(p.isRejectedProgressivePaint(rejected,a.scope),true);assert.equal(p.isRejectedProgressivePaint(rejected,b.scope),false);assert.equal(p.progressivePaintRejections(a.scope).length,1);assert.deepEqual(p.progressivePaintRejections(b.scope),[]);
 a.scope.release();b.scope.release();
});

test('finite readback dispatch forwards the exact scope and source-absence argument',async()=>{
 const seen=[],m=modules({'./f260-accepted-restore-runtime':{F260_ACCEPTED_RESTORE_SCOPE_RESOURCES:[],f260AcceptedRestoreIdentity:(_c,s)=>{seen.push(s);return false;},f260AcceptedRestoreDisplayCertificate:()=>null},'./kunsthalle70-runtime':{KUNSTHALLE70_SCOPE_RESOURCES:[],bremenKunsthalle70DerivedIdentity:(_c,s)=>{seen.push(s);return true;},serializeBremenKunsthalle70DerivedReadback:(c,absent,s)=>({c,absent,s})}});
 const r=m.load('bremen-finite-derived-display'),{createFrozenDataScope}=m.scope(),o=owner(createFrozenDataScope,new Map()),c=component(5);
 const out=r.serializeBremenFiniteDerivedReadback(c,false,o.scope);assert.strictEqual(out.c,c);assert.equal(out.absent,false);assert.strictEqual(out.s,o.scope);assert.deepEqual(seen,[o.scope,o.scope]);assert.equal(o.calls.length,0);o.scope.release();
});

test('Bremen shader partition remains a cold pure branch and city data uses the supplied scope',()=>{
 const ast=ts.createSourceFile('facade.ts',source('facade-paint-fragment'),99,true);let fn;
 const visit=n=>{if(ts.isFunctionDeclaration(n)&&n.name?.text==='paintProgramPartitionEnabled'&&n.parameters.length===1)fn=n;ts.forEachChild(n,visit);};visit(ast);assert.ok(fn);
 const js=ts.transpileModule(fn.getText(ast)+'\nreturn paintProgramPartitionEnabled;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 let reads=0;const scope={tiny:true},run=new Function('getPROGRESSIVE_CITY_EXTRA_GLSL','scope','PROGRESSIVE_CITY_SOURCE_FULL_SHA','PROGRESSIVE_FEATURE_SHA','HAMBURG_PROGRAM_SOURCE_SHA','BERLIN_PROGRAM_SOURCE_SHA',js)((s)=>{assert.strictEqual(s,scope);reads++;return{munich:''};},scope,'same','same','same','same');
 assert.equal(run('bremen'),true);assert.equal(run('berlin'),true);assert.equal(reads,0);assert.equal(run('munich'),true);assert.equal(reads,1);
});

test('aborted pending preparation cannot keep a released recipe alive and a new scope can retry',async()=>{
 const m=modules(),r=m.load('lloyd-front-runtime'),{createFrozenDataScope}=m.scope(),f=lloydFixture(m.signature().nativePaintSignature,m.load('bremen-identity-projections').BREMEN_IDENTITY_PROJECTIONS),ref=r.MODULE_SCOPE_RESOURCES[0],values=new Map([[key(ref),f.data]]),a=owner(createFrozenDataScope,values,{pending:true}),controller=new AbortController();
 const pending=a.scope.prepare([ref],controller.signal);await Promise.resolve();controller.abort();await assert.rejects(pending,{name:'AbortError'});a.scope.release();a.finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(a.scope.stats.disposed,true);assert.equal(r.lloydFrontIdentity(f.native[0],a.scope),true);assert.throws(()=>r.lloydFrontHeldSourceRule(f.native[1],a.scope),{name:'AbortError'});
 const b=owner(createFrozenDataScope,values);await b.scope.prepare([ref],signal());assert.equal(r.lloydFrontIdentity(f.native[0],b.scope),true);b.scope.release();
});


test('default admission arguments and callback readers are evaluated in the incoming scope',()=>{
 const ast=ts.createSourceFile('s020.ts',source('s020-relation-outline-display'),99,true);let ids;
 for(const st of ast.statements)if(ts.isVariableStatement(st))for(const d of st.declarationList.declarations)if(d.name.getText(ast)==='allowedFamilies')ids=d.initializer.properties.map(p=>p.name.text);
 assert.equal(ids.length,3);
 const build=id=>{const c=component(77,'berlin');c.objectId=id;c.partId=id+'/component/tiny';return c;};
 const parts=ids.map(build),outline=build('osm/relation/8102166'),readers=[];
 const sig=modules().signature().nativePaintSignature;
 const member=c=>({objectId:c.objectId,partId:c.partId,geometryFingerprint:'tiny',leafSHA:'leaf',nativePaintSignature:sig(c)});
 const profile={city:'berlin',groupIdentity:'osm/relation/8102166',name:'tiny relation',outline:member(outline),parts:parts.map(member),formalRelationMembership:false,completenessClaim:false,entranceSurfaceVerified:true,guardVersion:'s020-exact-three-native-parts-v1',indexSHA:'index',sourcePBF:'pbf',boundarySHA:'boundary',sourceSnapshot:'snapshot'};
 const m=modules({'./progressive-paint':{PROGRESSIVE_PAINT_SCOPE_RESOURCES:[],progressiveAdmission:(c,s)=>{readers.push(s);return{city:c.city,objectId:c.objectId,partId:c.partId,origin:c.origin,geometrySignature:sig(c),batchColors:{'0':[.2,.3,.4]}};}},'./s020-relation-outline-profile':{S020_RELATION_OUTLINE_PROFILES:[profile]}}),r=m.load('s020-relation-outline-display'),{createFrozenDataScope}=m.scope(),o=owner(createFrozenDataScope,new Map());
 assert.equal(r.s020FullOriginalBatchRouteReady(parts[0],undefined,o.scope),true);
 const plan=r.s020RelationOutlineDisplayPlan([outline,...parts],[profile],{...profile,leafSHA:()=> 'leaf',materialReady:()=>true},undefined,o.scope);
 assert.equal(plan.errors.length,0);assert.strictEqual(plan.hiddenOutlines[0],outline);assert.strictEqual(plan.groups[0].parts[0],parts[0]);assert.equal(readers.length,4);assert.ok(readers.every(s=>s===o.scope));assert.equal(o.calls.length,0);
 assert.deepEqual(r.MODULE_SCOPE_CITIES,['berlin']);assert.equal(r.MODULE_SCOPE_ARITY.s020RelationOutlineDisplayPlan,4);
 for(const n of ['owner-f116-completion','owner-f122-completion','owner-f126-completion','owner-f128-completion','owner-f131-completion'])assert.deepEqual(m.load(n).MODULE_SCOPE_CITIES,['cologne']);
 o.scope.release();
});
