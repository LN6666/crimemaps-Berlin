import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {loadProductionModule} from './support/core3-runtime.mjs';

const source=new URL('../src/',import.meta.url);
const visibility=loadProductionModule(new URL('painted/delegated500/safety/paint-run-visibility.ts',source));
const rootVisibility=loadProductionModule(new URL('painted/root500/safety/paint-run-visibility.ts',source));
const programs=loadProductionModule(new URL('painted/delegated500/safety/current-paint-program.ts',source));
const distant=loadProductionModule(new URL('painted/delegated500/safety/berlin-distant-paint.ts',source));
const detail=loadProductionModule(new URL('safety/projected-detail-policy.ts',source));
const familyPaint=loadProductionModule(new URL('safety/family-paint-program.ts',source));
const projection=()=>Float64Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function geometry(){
 let reads=0;
 const row=(id,start,box)=>({objectId:id,partId:'part',start,end:start+3,get box(){reads++;return box;}});
 const first=row('first',0,[-.1,0,-.1,.1,.1,.1]),outside=row('outside',3,[4,0,4,5,.1,5]),last=row('last',6,[.2,0,.2,.3,.1,.3]);
 const loaded=new Map([['last',last],['outside',outside],['first',first]]);
 const runs=[{key:programs.currentPaintProgramKey(12),firstIndex:6,indexCount:3},{key:programs.currentPaintProgramKey(11),firstIndex:3,indexCount:3},{key:programs.currentPaintProgramKey(10),firstIndex:0,indexCount:3}];
 return{loaded,runs,first,outside,last,get reads(){return reads;}};
}
const state=()=>({publication:[],generation:1,viewRevision:1,incarnation:0,context:{},active:true});

test('one unchanged published view solves geometry once and preserves source draw order',()=>{
 const g=geometry(),s=state(),matrix=projection(),first=visibility.readPaintVisibility(g.loaded,g.runs,matrix,s),reads=g.reads;
 assert.deepEqual(first.components,[g.first,g.last]);assert.deepEqual(first.runs,[g.runs[0],g.runs[2]]);assert.ok(reads>0);
 for(let i=0;i<20;i++)assert.strictEqual(visibility.readPaintVisibility(g.loaded,g.runs,matrix.slice(),{...s}),first);
 assert.equal(g.reads,reads,'repeated demand, witness and draw reads do not cull the component boxes again');
 const other=geometry();assert.notStrictEqual(visibility.readPaintVisibility(other.loaded,other.runs,matrix,s),first);
 assert.strictEqual(visibility.readPaintVisibility(g.loaded,g.runs,matrix,s),first,'another candidate map cannot evict this publication');
 visibility.forgetPaintVisibility(g.loaded);
 assert.notStrictEqual(visibility.readPaintVisibility(g.loaded,g.runs,matrix,s),first,'destroy can forget a still-reachable component map');
 assert.ok(g.reads>reads);
});

test('matrix edits and publication, state, context and run changes invalidate only geometric selection',()=>{
 const g=geometry(),s=state(),matrix=projection();let value=visibility.readPaintVisibility(g.loaded,g.runs,matrix,s);
 matrix[12]=-4;matrix[14]=-4;
 value=visibility.readPaintVisibility(g.loaded,g.runs,matrix,s);assert.deepEqual(value.components,[g.outside]);assert.deepEqual(value.runs,[g.runs[1]]);
 const all=visibility.readPaintVisibility(g.loaded,g.runs,undefined,s);assert.deepEqual(all.components,[g.first,g.outside,g.last]);
 const invalid=projection();invalid[0]=NaN;assert.deepEqual(visibility.readPaintVisibility(g.loaded,g.runs,invalid,s).runs,g.runs,'uncertain projection remains conservative');
 matrix.set(projection());value=visibility.readPaintVisibility(g.loaded,g.runs,matrix,s);
 for(const change of [{viewRevision:2},{generation:2},{incarnation:1},{context:{}},{publication:[]}]){
  const before=g.reads,next={...s,...change};assert.notStrictEqual(visibility.readPaintVisibility(g.loaded,g.runs,matrix,next),value);assert.ok(g.reads>before);Object.assign(s,next);value=visibility.readPaintVisibility(g.loaded,g.runs,matrix,s);
 }
 assert.deepEqual(visibility.readPaintVisibility(g.loaded,g.runs,matrix,{...s,active:false}).components,[]);
 assert.deepEqual(visibility.readPaintVisibility(g.loaded,g.runs,matrix,s).components,[g.first,g.last]);
 // Publication replaces same-size accepted content; size is never its identity.
 g.loaded.set('first',{...g.first,box:[7,0,7,8,.1,8]});s.publication=[];
 assert.deepEqual(visibility.readPaintVisibility(g.loaded,g.runs,matrix,s).components,[g.last]);
 const reordered=[g.runs[2],g.runs[0]];assert.deepEqual(visibility.readPaintVisibility(g.loaded,reordered,undefined,s).runs,reordered);
});

// Evaluate the production closures, not a copied visibility implementation.
// Only appearance controls and accepted geometry are fixture inputs.
function renderer(provider){
 const text=readFileSync(new URL(`painted/${provider}/safety/building-mesh-renderer.ts`,source),'utf8'),ast=ts.createSourceFile('renderer.ts',text,ts.ScriptTarget.Latest,true),bindings=new Map();
 (function visit(node){if(ts.isFunctionDeclaration(node)&&node.name)bindings.set(node.name.text,node.getText(ast));if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer){const value=node.initializer.getText(ast);if(node.name.text!=='key'||value.startsWith('(i:Identity)=>'))bindings.set(node.name.text,value);}ts.forEachChild(node,visit);})(ast);
 const g=geometry(),s={...visibility,...programs,...distant,...detail,loaded:g.loaded,partitionRuns:g.runs,familyRuns:g.runs,sceneSpans:[],generation:1,viewRevision:1,mainGPUIncarnation:0,gl:{drawingBufferWidth:512,drawingBufferHeight:512},mainWorldMatrix:projection(),candidateMainProjection:projection(),mainWorldProjection:projection(),mainWorldProjectionRevision:0,matrix:undefined,window:{devicePixelRatio:1},anchor:[0,0],anchorUnit:1,destroyed:false,pageHidden:false,enabled:true,partitionEnabled:true,currentFamilyPrograms:true,queueOnlyProgram:false,city:'bremen',mode:2,override:0,paintMode:()=>s.mode,paintOverride:()=>s.override,selectionActive:true,selectedIdentity:undefined,map:{getCanvas:()=>({width:512,height:512,clientWidth:512,clientHeight:512}),triggerRepaint(){}}};
 const scope=new Proxy(s,{has:()=>true,get:(object,key)=>key===Symbol.unscopables?undefined:key in object?object[key]:globalThis[key]});
 const bind=name=>{assert.ok(bindings.has(name),provider+': actual '+name);const code=ts.transpileModule('('+bindings.get(name)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'');s[name]=Function('scope','with(scope){return '+code+'}')(scope);};
 const helpers=provider==='root500'||provider==='infill'?['mainPaintRuns','mainMaskChunks','sceneIndexCount']:provider==='tier300'?['updateMainViewport','mainFamilyRuns']:provider==='city'?['multiply','mainVisibilityCache','updateMainViewport','mainFamilyRuns','recordMainProjection','invalidateMainProjection']:provider==='bremen'?['multiply','mainVisibilityCache','mainPaintRuns','invalidateMatrix']:['multiply','key',...(provider==='delegated500'?['programKey','programOverrideKey','paintDetailQuality']:['overrideProgramKey','mainPaintDemandFor','candidateMatrix']),'mainPaintDemand','candidatePaintDemand'];
 for(const name of helpers)bind(name);
 const packed={loaded:g.loaded,partitionRuns:g.runs,familyRuns:g.runs,sceneSpans:s.sceneSpans,generation:1,anchor:s.anchor,anchorUnit:1,material:{currentFamilyPrograms:true,partitionEnabled:true,distantMaterialAvailable:false,exactRichProgramKeys:new Map(),sharedPaulLobeRichProgram:false}};
 return{g,s,packed,bind,candidate:provider==='delegated500'?{state:packed,quality:new Map()}:{packed}};
}

test('actual delegated main and resident candidate share geometry while override and quality remain current',()=>{
 const {g,s,packed,candidate}=renderer('delegated500'),first=s.mainPaintDemand(),reads=g.reads;
 assert.deepEqual(first.components,[g.first,g.last]);assert.deepEqual([...s.candidatePaintDemand(candidate).keys],first.runs.map(run=>run.key));assert.equal(g.reads,reads);
 s.override=31;assert.equal(s.mainPaintDemand().override,programs.currentPaintProgramKey(31));assert.deepEqual([...s.candidatePaintDemand(candidate).keys],[programs.currentPaintProgramKey(31)]);assert.equal(g.reads,reads);
 s.mode=1;assert.deepEqual(s.mainPaintDemand().runs,[]);assert.equal(s.candidatePaintDemand(candidate).keys.size,0);assert.equal(g.reads,reads);
 s.mode=2;s.override=0;const row={objectId:'small',partId:'part',box:[-.001,0,-.001,.001,.001,.001],start:0,end:3},runs=[{key:programs.currentPaintProgramKey(19401),firstIndex:0,indexCount:3}];
 Object.assign(packed,{loaded:new Map([['small',row]]),partitionRuns:runs,sceneSpans:[]});packed.material.distantMaterialAvailable=true;
 assert.deepEqual([...s.candidatePaintDemand(candidate).keys],[distant.BERLIN_DISTANT_PAUL_LOBE_KEY]);
 s.selectedIdentity=row;assert.deepEqual([...s.candidatePaintDemand(candidate).keys],[runs[0].key],'selection still promotes detailed material without a geometry-cache miss');
 assert.deepEqual(s.mainPaintDemand().components,[g.first,g.last]);
 s.pageHidden=true;assert.deepEqual(s.mainPaintDemand().runs,[]);s.pageHidden=false;assert.deepEqual(s.mainPaintDemand().runs,first.runs);
 s.mainWorldMatrix[12]=-4;s.mainWorldMatrix[13]=4;assert.deepEqual(s.mainPaintDemand().components,[g.outside]);
});

test('actual church main and candidate keep queue, override, publication and unknown-projection behavior',()=>{
 const {g,s,packed,candidate}=renderer('church'),first=s.mainPaintDemand(),reads=g.reads;
 assert.deepEqual(first.runs,[g.runs[0],g.runs[2]]);assert.strictEqual(s.candidatePaintDemand(candidate).runs,first.runs);assert.equal(g.reads,reads);
 s.queueOnlyProgram=true;assert.deepEqual(s.mainPaintDemand().runs,[]);assert.deepEqual(s.candidatePaintDemand(candidate).runs,[]);assert.equal(g.reads,reads);
 s.queueOnlyProgram=false;s.override=13;assert.equal(s.mainPaintDemand().override,programs.currentPaintProgramKey(13));assert.equal(g.reads,reads);
 packed.loaded=new Map([['outside',g.outside]]);packed.sceneSpans=[];assert.deepEqual(s.candidatePaintDemand(candidate).runs,[]);assert.strictEqual(s.mainPaintDemand().runs,first.runs);
 s.mainWorldMatrix=undefined;s.matrix=undefined;assert.deepEqual(s.mainPaintDemand().runs,g.runs,'unknown projection keeps every accepted run');
 s.enabled=false;assert.deepEqual(s.mainPaintDemand().runs,[]);s.enabled=true;
 s.mainWorldMatrix=projection();s.mainGPUIncarnation++;assert.deepEqual(s.mainPaintDemand().runs,first.runs);
});

test('actual Root500/Infill demand and Tier viewport reuse one unchanged solve and invalidate on published geometry or in-place pan',()=>{
 for(const provider of ['root500','infill','tier300']){
  const {g,s}=renderer(provider);s.matrix=projection();
  const read=()=>{if(provider==='tier300'){s.updateMainViewport(s.matrix);return s.mainFamilyRuns();}return s.mainPaintRuns();};
  const first=read(),reads=g.reads;assert.deepEqual(first,[g.runs[0],g.runs[2]],provider);
  for(let i=0;i<20;i++){s.matrix=s.matrix.slice();assert.strictEqual(read(),first,provider+' repeated render/preparation/demand uses the published result');}
  assert.equal(g.reads,reads,provider+' unchanged input does not revisit the boxes');
  // Actual packed installation replaces the map and spans, even for the same
  // component count; a candidate must not disturb the restored resident.
  const resident=s.loaded,spans=s.sceneSpans,other=geometry();s.loaded=other.loaded;s.sceneSpans=[];
  assert.notStrictEqual(read(),first);s.loaded=resident;s.sceneSpans=spans;assert.strictEqual(read(),first);
  s.matrix[12]=-4;s.matrix[14]=-4;assert.deepEqual(read(),[g.runs[1]],provider+' pan invalidates the exact matrix');
  s.matrix.set(projection());assert.deepEqual(read(),first);
  const oldReads=g.reads;s.mainGPUIncarnation++;assert.deepEqual(read(),first);assert.ok(g.reads>oldReads,provider+' restored context invalidates geometry demand');
  if(provider!=='tier300'){
   s.matrix[15]=-1;assert.deepEqual(read(),g.runs,provider+' keeps its original eye/near-plane uncertainty');
   s.matrix=undefined;assert.strictEqual(read(),g.runs,provider+' unknown projection is conservative');
  }
 }
});

test('scalar clip kernels keep clipping, birth envelope, epsilon and uncertain-input behavior',()=>{
 for(const api of [visibility,rootVisibility]){
  const matrix=projection();
  assert.equal(api.paintBoxOutsideClip([-.1,0,-.1,.1,.1,.1],matrix),false);
  assert.equal(api.paintBoxOutsideClip([4,0,4,5,.1,5],matrix),true);
  assert.equal(api.paintBoxOutsideClip([0,3,0,.1,4,.1],matrix),false,'birth height includes zero');
  assert.equal(api.paintBoxOutsideClip([1.000001,0,0,1.000002,.1,.1],matrix),false,'epsilon preserves boundary uncertainty');
  assert.equal(api.paintBoxOutsideClip([NaN,0,0,2,2,2],matrix),false);
  assert.equal(api.paintBoxOutsideClip([0,0,0,2,2],matrix),false);
  matrix[0]=Infinity;assert.equal(api.paintBoxOutsideClip([4,0,4,5,.1,5],matrix),false);
 }
});

test('actual main mask selection retains chunk order and exact run overlap after panning',()=>{
 for(const provider of ['root500','infill']){
  const {s}=renderer(provider),a={},b={},unused={};s.matrix=projection();s.sceneChunks=[b,unused,a];
  s.sceneSpans=[{chunk:a,firstIndex:0,indexCount:3},{chunk:b,firstIndex:3,indexCount:3},{chunk:a,firstIndex:6,indexCount:3}];
  assert.deepEqual(s.mainMaskChunks(),[a]);
  s.matrix[12]=-4;s.matrix[14]=-4;assert.deepEqual(s.mainMaskChunks(),[b],'touching interval endpoints are not overlap');
  s.mode=1;assert.deepEqual(s.mainMaskChunks(),[b,a],'nonpartitioned draw retains original scene chunk order');
  s.sceneSpans=[];assert.deepEqual(s.mainMaskChunks(),[],'a chunk with no displayed span does not acquire masks');
 }
});

test('actual City/Tier pending byte diagnostics skip resident buffers when there is no candidate and retain physical buffer deduplication',()=>{
 for(const provider of ['city','tier300']){
  const {s,bind}=renderer(provider);bind('sceneTypedBuffers');bind('pendingChunkCPUBytes');
  s.pendingGeometryCandidate=s.pendingData=s.pendingGeometry=undefined;
  s.sceneChunks=[{get cpu(){assert.fail(provider+' settled diagnostics must not scan resident buffers for an empty difference');}}];
  assert.equal(s.pendingChunkCPUBytes(),0);
  if(provider==='city')s.pendingGeometryCandidate={chunkPacking:{chunks:[]}};
  else s.pendingData={chunkPacking:{chunks:[]}};
  assert.equal(s.pendingChunkCPUBytes(),0);
  const shared=new Float32Array(8),extra=new Float32Array(5),chunk=data=>({cpu:{value:{vertices:data,auxiliary:{maskRecipe:{}}}},material:{value:{maskRecipe:{},sidecars:{},geometry:new Map()}}});
  s.sceneChunks=[chunk(shared)];const pending=[chunk(shared.subarray(2)),chunk(extra),chunk(extra.subarray(1))];
  if(provider==='city')s.pendingGeometryCandidate={chunkPacking:{chunks:pending}};
  else{s.pendingData=undefined;s.pendingGeometry={packed:{sceneChunks:pending}};}
  assert.equal(s.pendingChunkCPUBytes(),extra.buffer.byteLength,'shared published bytes are excluded and candidate aliases counted once');
 }
});


test('City and Bremen retain actual main demand while GPU preparation invalidates draw state',()=>{
 for(const provider of ['city','bremen']){
  const {g,s,bind}=renderer(provider),read=()=>provider==='city'?s.mainFamilyRuns():s.mainPaintRuns();
  const first=read(),reads=g.reads;assert.deepEqual(first,[g.runs[0],g.runs[2]],provider);
  // These are the real early-return states of an upload/program wait. They
  // must not turn every capture-resident colour recipe into a visible one.
  if(provider==='bremen')s.invalidateMatrix('renderer-state-change');
  else{s.matrix=undefined;s.mainViewportMatrix=undefined;s.mainViewportRuns=undefined;}
  for(let i=0;i<20;i++)assert.strictEqual(read(),first);
  assert.equal(g.reads,reads,provider+' retains one geometric solve across pending frames');
  assert.equal(s.matrix,undefined,provider+' retaining demand is not a successful draw witness');
  assert.equal(s.mainDrawWitness,undefined);

  // Demand uses each scene's current local frame, not the published scene's
  // previous transformed matrix when a candidate is temporarily installed.
  const original=s.loaded;s.loaded=new Map(g.loaded);s.anchor=[-4,4];
  assert.deepEqual(read(),[g.runs[1]],provider+' candidate anchor is transformed separately');
  s.loaded=original;s.anchor=[0,0];assert.strictEqual(read(),first,provider+' restoring the resident retains its cache');

  bind('move');s.reconcileProgramDemand=s.reconcileProgramSources=()=>{};s.programPreparation={prune(){}};
  s.move();assert.deepEqual(read(),[],provider+' move invalidates the old demand until the next real frame');
  bind('prepareMainPrograms');
  // The actual preparation gates reject an unknown projection, even with a
  // stale drawing matrix or an empty apparent main set.
  s.matrix=projection();assert.equal(provider==='city'?s.prepareMainPrograms({},()=>true):s.prepareMainPrograms({},s.gl,()=>true),false);
  const next=projection();next[12]=-4;next[13]=4;
  if(provider==='city'){s.recordMainProjection(next);assert.notStrictEqual(s.mainWorldProjection,next,'world projection owns its copy');const recorded=s.mainWorldProjection;next[12]=0;next[13]=0;s.recordMainProjection(next);assert.notStrictEqual(s.mainWorldProjection,recorded,'in-place edit of an external camera array receives a new immutable copy');assert.deepEqual(read(),first);next[12]=-4;next[13]=4;s.recordMainProjection(next);}else s.candidateMainProjection=next;
  assert.deepEqual(read(),[g.runs[1]],provider+' new camera demand replaces the old visible set');
  const far=projection();far[12]=-100;
  if(provider==='city')s.recordMainProjection(far);else s.candidateMainProjection=far;
  assert.deepEqual(read(),[],provider+' a known empty view remains different from unknown preparation');
  if(provider==='city')assert.ok(s.mainWorldProjection);else assert.ok(s.candidateMainProjection);
 }
});


test('Bremen waits for the next real main projection before trimming existing resident loans after a move',()=>{
 const {g,s,bind}=renderer('bremen'),released=[];
 Object.assign(s,{...familyPaint,partitionPrograms:new Map(Array.from({length:70},(_,i)=>['old-'+i,{i}])),programPreparation:{prune(){}},capturePaintKeys:()=>new Set(),clearSettledProgramSources(){},retireInactiveCaptureRoles(){},releaseInactivePaintProgram:(_gl,p)=>released.push(p)});
 for(const name of ['activeFamilyKey','mainPaintKeys','retainedPaintKeys','reconcileProgramDemand'])bind(name);
 const common={common:true};s.partitionPrograms.set(g.runs[0].key,common);
 s.candidateMainProjection=undefined;s.reconcileProgramDemand();
 assert.equal(released.length,0,'no blind resident eviction between move and the next main frame');
 assert.equal(s.mainPaintKeys().size,0,'retaining existing loans does not advertise visible compilation work');
 s.candidateMainProjection=projection();s.reconcileProgramDemand();
 assert.ok(released.length>0,'the next known frame immediately restores the existing inactive limit');
 assert.equal(s.partitionPrograms.get(g.runs[0].key),common,'the shared visible program is retained');
 s.candidateMainProjection=undefined;s.enabled=false;
 for(let i=0;i<70;i++)s.partitionPrograms.set('disabled-'+i,{i});
 const before=released.length;s.reconcileProgramDemand();assert.ok(released.length>before,'disable is never held by an unknown-view gap');
});
