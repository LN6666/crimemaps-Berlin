import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

// Bundle the real mutually dependent runtime modules once so store/context
// registries and budget error identities remain shared, as in the application.
const bundled=await build({stdin:{contents:"export {createResourceBudget,ResourceBudgetExceededError} from './resource-budget';export {createChunkResourceStore} from './chunk-resource-store';export {getRenderResourceContextId} from './program-preparation';export {createResidentGeometryOwner} from './resident-geometry';export {createResidentTriangleDrawBatch,drawResidentTriangles,rotateResidentTriangleIndices,residentTriangleGeometryKey} from './resident-index-convention';export {acquireChunkMeshState,allocateChunkMeshView,chunkMeshViewKey} from '../../painted/root500/safety/chunk-mesh-residency';",resolveDir:fileURLToPath(new URL('../src/safety/render-runtime/',import.meta.url))},bundle:true,write:false,format:'esm',platform:'node',target:'es2022'});
const {createResourceBudget,ResourceBudgetExceededError,createChunkResourceStore,getRenderResourceContextId,createResidentGeometryOwner,createResidentTriangleDrawBatch,drawResidentTriangles,rotateResidentTriangleIndices,residentTriangleGeometryKey,acquireChunkMeshState,allocateChunkMeshView,chunkMeshViewKey}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const scopes={contextIdScope:'last-upload-context',lifetimeScope:'geometry-owner-lifetime-across-contexts'};
function logical(stats){const{revision,ownedBufferBytes,ownedBuffers,borrowedBuffers}=stats;return{revision,ownedBufferBytes,ownedBuffers,borrowedBuffers};}
function objects(stats){const{contextId,contextIdScope,lifetimeScope,createdBuffers,deleteBufferRequests,createdVertexArrays,deleteVertexArrayRequests}=stats;return{contextId,contextIdScope,lifetimeScope,createdBuffers,deleteBufferRequests,createdVertexArrays,deleteVertexArrayRequests};}
const lifecycleText = await readFile(new URL('../src/safety/resident-gpu-lifecycle.ts', import.meta.url), 'utf8');
const lifecycleModule = {exports: {}};
Function('module', 'exports', ts.transpileModule(lifecycleText, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText)(lifecycleModule, lifecycleModule.exports);
const {createResidentGPULifecycle} = lifecycleModule.exports;

function context() {
  let sequence = 0, error = 0, uploads = 0, bufferAttempts = 0;
  const control = {lost: false, failUpload: 0, loseUpload: 0, missing: '', onUpload: undefined, nullVertexArray: false, nullBufferAttempt: 0, fenceComplete:true};
  const state = {vao: {external: 'vao'}, array: {external: 'array'}};
  const deleted = [], data = [], attributes = [],elementBindings=[],deletedFences=[];
  const gl = {
    NO_ERROR: 0, OUT_OF_MEMORY: 1285, ARRAY_BUFFER: 1, ELEMENT_ARRAY_BUFFER: 2,
    VERTEX_ARRAY_BINDING: 3, ARRAY_BUFFER_BINDING: 4, STATIC_DRAW: 5, DYNAMIC_DRAW: 6, FLOAT: 7, SHORT: 5122,
    SYNC_GPU_COMMANDS_COMPLETE:8,ALREADY_SIGNALED:9,TIMEOUT_EXPIRED:10,CONDITION_SATISFIED:11,WAIT_FAILED:12,
    isContextLost: () => control.lost,
    getError() {const result = error; error = 0; return result;},
    getParameter: key => key === 3 ? state.vao : state.array,
    createVertexArray: () => control.nullVertexArray ? null : ({vao: ++sequence}), createBuffer: () => ++bufferAttempts === control.nullBufferAttempt ? null : ({buffer: ++sequence}),
    bindVertexArray(value) {state.vao = value;},
    bindBuffer(target, value) {if (target === 1) state.array = value;else if(target===2)elementBindings.push(value);},
    bufferData(target, value, usage) {
      uploads++; data.push({target, value, usage});
      if (uploads === control.failUpload) error = 1285;
      if (uploads === control.loseUpload) control.lost = true;
      control.onUpload?.();
    },
    getAttribLocation: (_program, name) => name === control.missing ? -1 : name.length,
    enableVertexAttribArray() {},
    vertexAttribPointer(...args) {attributes.push(args);},
    deleteVertexArray(value) {deleted.push(value);}, deleteBuffer(value) {deleted.push(value);},
    fenceSync:()=>({sync:++sequence}),flush(){},clientWaitSync:()=>control.fenceComplete?gl.ALREADY_SIGNALED:gl.TIMEOUT_EXPIRED,deleteSync:value=>deletedFences.push(value),
  };
  return {gl, state, control, deleted, data, attributes,elementBindings,deletedFences, setError(value) {error = value;}, get uploads() {return uploads;}, get bufferAttempts() {return bufferAttempts;}};
}

function isolatedStore(){return createChunkResourceStore({budget:createResourceBudget({limitBytes:4096,recentLimitBytes:0}),recentMaxEntries:0,recentMaxIdleMs:0});}
const categoryBytes=(budget,category)=>budget.stats.categories[category]?.bytes??0;
const geometryCharge=(key,bytes=180)=>bytes+2*key.length;

function plan(revision) {
  return {revision, indices: new Uint32Array([0, 1, 2]), buffers: [
    {key: 'vertices', data: new Float32Array(27), attributes: [{name: 'a_position', size: 3, stride: 36}, {name: 'a_normal', size: 3, stride: 36, offset: 12}]},
    {key: 'state', data: new Float32Array(3), dynamic: true, attributes: [{name: 'a_selected', size: 1}]},
    {key: 'city-extra', data: new Float32Array(12), attributes: [{name: 'a_cbt_display', size: 4, required: false}]},
  ]};
}

function meshSource({key='mesh-source',stateOnlyCapacity=false,sliceFailure=false}={}){
  const value={vertices:new Float32Array(27),indices:new Uint32Array([0,1,2]),paint:new Float32Array(15),progressive:new Float32Array(12),baseState:new Float32Array([7,8,9])};
  const costs=Object.values(value).map(data=>({category:'packed',bytes:data.byteLength,precision:'exact',identity:data.buffer}));
  costs.push({category:'metadata',bytes:key.length*2,precision:'estimate',identity:{}});
  const sourceBytes=costs.reduce((sum,cost)=>sum+cost.bytes,0),limitBytes=stateOnlyCapacity?sourceBytes+value.baseState.byteLength:1024*1024;
  const budget=createResourceBudget({limitBytes,recentLimitBytes:stateOnlyCapacity?0:512*1024}),store=createChunkResourceStore({budget});
  let slices=0,retired;const sourceRetired=new Promise(resolve=>{retired=resolve;});
  Object.defineProperty(value.baseState,'slice',{value(...args){slices++;assert(categoryBytes(budget,'metadata')>2*key.length,'state identity is admitted before its array copy');if(sliceFailure)throw Error('state copy failed');return Float32Array.prototype.slice.apply(this,args);}});
  const source=store.acquire({contentKey:key,role:'source',estimate:costs,produce:()=>value,dispose(){retired();}});
  return{value,source,sourceBytes,sourceRetired,budget,store,get slices(){return slices;}};
}

test('one geometry owner uploads adapter layouts without copying CPU arrays and retires the previous GPU generation', () => {
  const c = context(), owner = createResidentGeometryOwner(), firstPlan = plan(1), previous = {...c.state};
  assert.deepEqual(logical(owner.stats), {revision: null, ownedBufferBytes: 0, ownedBuffers: 0, borrowedBuffers: 0});
  assert.deepEqual(objects(owner.stats),{...scopes,contextId:null,createdBuffers:0,deleteBufferRequests:0,createdVertexArrays:0,deleteVertexArrayRequests:0});
  c.control.missing = 'a_cbt_display';
  const first = owner.upload(c.gl, {}, firstPlan);
  assert.deepEqual(c.state, previous);
  assert.equal(c.data[0].value, firstPlan.indices);
  firstPlan.buffers.forEach((spec, i) => assert.equal(c.data[i + 1].value, spec.data));
  assert.equal(c.data[2].usage, c.gl.DYNAMIC_DRAW);
  assert.equal(c.attributes.length, 3);
  assert.equal(first.buffers.size, 3);
  assert.deepEqual(logical(owner.stats), {revision: 1, ownedBufferBytes: 180, ownedBuffers: 4, borrowedBuffers: 0},
    'logical requested bytes include indices and the three owned attribute buffers');
  const contextId=getRenderResourceContextId(c.gl);assert.equal(typeof contextId,'number');assert(contextId>0);assert.deepEqual(objects(owner.stats),{...scopes,contextId,createdBuffers:4,deleteBufferRequests:0,createdVertexArrays:1,deleteVertexArrayRequests:0});
  assert.equal('plan' in first, false);
  assert.equal('data' in first, false);
  const second = owner.upload(c.gl, {}, plan(2));
  assert.equal(owner.current, second);
  assert.deepEqual(logical(owner.stats), {revision: 2, ownedBufferBytes: 180, ownedBuffers: 4, borrowedBuffers: 0});
  assert.deepEqual(objects(owner.stats),{...scopes,contextId,createdBuffers:8,deleteBufferRequests:4,createdVertexArrays:2,deleteVertexArrayRequests:1});
  assert.deepEqual(new Set(c.deleted), new Set([first.vao, first.indexBuffer, ...first.buffers.values()]));
  owner.release(); owner.release();
  assert.equal(owner.current, undefined);
  assert.deepEqual(logical(owner.stats), {revision: null, ownedBufferBytes: 0, ownedBuffers: 0, borrowedBuffers: 0});
  assert.equal(c.deleted.length, 10);
  assert.deepEqual(objects(owner.stats),{...scopes,contextId,createdBuffers:8,deleteBufferRequests:8,createdVertexArrays:2,deleteVertexArrayRequests:2},'deletion requests are cumulative calls, not physical-free observations');
});

test('real GL error flags and missing required bindings discard only the candidate and preserve the published generation', () => {
  for (const failure of ['pre-existing', 'upload', 'attribute', 'null-buffer', 'null-vao']) {
    const c = context(), owner = createResidentGeometryOwner(), first = owner.upload(c.gl, {}, plan(1));
    const publishedStats = owner.stats;
    const live = new Set([first.vao, first.indexBuffer, ...first.buffers.values()]);
    if (failure === 'pre-existing') c.setError(c.gl.OUT_OF_MEMORY);
    if (failure === 'upload') c.control.failUpload = c.uploads + 2;
    if (failure === 'attribute') c.control.missing = 'a_position';
    if (failure === 'null-buffer') c.control.nullBufferAttempt=c.bufferAttempts+2;
    if (failure === 'null-vao') c.control.nullVertexArray=true;
    assert.throws(() => owner.upload(c.gl, {}, plan(2)), /pre-existing|WebGL error|Missing geometry attribute|allocation failed/);
    assert.equal(owner.current, first);
    assert.deepEqual(logical(owner.stats), logical(publishedStats), 'failed candidates cannot replace published logical resource accounting');
    assert(c.deleted.every(value => !live.has(value)));
    if (failure === 'pre-existing'||failure==='null-vao') assert.equal(c.deleted.length, 0);
    else assert(c.deleted.length > 0);
    const created=failure==='upload'?4:failure==='attribute'?2:failure==='null-buffer'?1:0,vao=failure==='pre-existing'||failure==='null-vao'?0:1;
    assert.deepEqual(objects(owner.stats),{...scopes,contextId:getRenderResourceContextId(c.gl),createdBuffers:4+created,deleteBufferRequests:created,createdVertexArrays:1+vao,deleteVertexArrayRequests:vao},'only nonnull creations and issued candidate deletion calls advance the owner lifetime');
  }
});

test('context loss never publishes a partially uploaded generation or deletes old-context objects during restoration', () => {
  const old = context(), owner = createResidentGeometryOwner();
  owner.upload(old.gl, {}, plan(1));
  const oldContextId=getRenderResourceContextId(old.gl);
  old.control.loseUpload = old.uploads + 2;
  assert.throws(() => owner.upload(old.gl, {}, plan(2)), /context lost/);
  assert.equal(old.deleted.length, 0);
  assert.deepEqual(objects(owner.stats),{...scopes,contextId:oldContextId,createdBuffers:6,deleteBufferRequests:0,createdVertexArrays:2,deleteVertexArrayRequests:0},'loss stops after the index and first attribute upload, before unnecessary state/sidecar allocations');
  owner.contextLost();
  assert.equal(owner.current, undefined);
  assert.deepEqual(logical(owner.stats), {revision: null, ownedBufferBytes: 0, ownedBuffers: 0, borrowedBuffers: 0});
  const restored = context(), current = owner.upload(restored.gl, {}, plan(3));
  assert.equal(owner.current, current);
  assert.deepEqual(logical(owner.stats), {revision: 3, ownedBufferBytes: 180, ownedBuffers: 4, borrowedBuffers: 0});
  const restoredContextId=getRenderResourceContextId(restored.gl);assert.notEqual(restoredContextId,oldContextId);assert.deepEqual(objects(owner.stats),{...scopes,contextId:restoredContextId,createdBuffers:10,deleteBufferRequests:0,createdVertexArrays:3,deleteVertexArrayRequests:0});
  owner.release();
  assert.deepEqual(logical(owner.stats), {revision: null, ownedBufferBytes: 0, ownedBuffers: 0, borrowedBuffers: 0});
  assert.equal(restored.deleted.length, 5);
  assert.equal(old.deleted.length, 0);
  assert.deepEqual(objects(owner.stats),{...scopes,contextId:restoredContextId,createdBuffers:10,deleteBufferRequests:4,createdVertexArrays:3,deleteVertexArrayRequests:1},'owner lifetime spans both contexts while loss issues no deletes for invalid old-context objects');
});

test('a shadow view borrows main GPU buffers and owns only its index storage and VAO', () => {
  const c = context(), main = createResidentGeometryOwner(), shadow = createResidentGeometryOwner();
  const geometry = main.upload(c.gl, {}, plan(1)), uploads = c.uploads;
  const view = shadow.upload(c.gl, {}, {revision: 1,parents:[main.currentLease], indices: new Uint32Array([0, 1, 2]), buffers: [
    {key: 'vertices', buffer: geometry.buffers.get('vertices'), attributes: [{name: 'a_position', size: 3, stride: 36}]},
    {key: 'state', buffer: geometry.buffers.get('state'), attributes: [{name: 'a_selected', size: 1}]},
  ]});
  assert.equal(c.uploads, uploads + 1, 'only shadow indices are uploaded');
  assert.equal(view.buffers.get('vertices'), geometry.buffers.get('vertices'));
  assert.deepEqual(logical(main.stats), {revision: 1, ownedBufferBytes: 180, ownedBuffers: 4, borrowedBuffers: 0});
  assert.deepEqual(logical(shadow.stats), {revision: 1, ownedBufferBytes: 12, ownedBuffers: 1, borrowedBuffers: 2});
  const contextId=getRenderResourceContextId(c.gl);assert.deepEqual(objects(main.stats),{...scopes,contextId,createdBuffers:4,deleteBufferRequests:0,createdVertexArrays:1,deleteVertexArrayRequests:0});assert.deepEqual(objects(shadow.stats),{...scopes,contextId,createdBuffers:1,deleteBufferRequests:0,createdVertexArrays:1,deleteVertexArrayRequests:0},'borrowed main buffers create no second shadow-owned buffer objects');
  assert.equal(main.stats.ownedBufferBytes + shadow.stats.ownedBufferBytes, 192,
    'shadow views count their index upload, without billing borrowed main attributes twice');
  shadow.release();
  assert.deepEqual(logical(shadow.stats), {revision: null, ownedBufferBytes: 0, ownedBuffers: 0, borrowedBuffers: 0});
  assert.equal(main.stats.ownedBufferBytes, 180, 'releasing the borrowed view leaves main ownership unchanged');
  assert.deepEqual(new Set(c.deleted), new Set([view.vao, view.indexBuffer]));
  assert.equal(main.current, geometry);
  assert.deepEqual(objects(shadow.stats),{...scopes,contextId,createdBuffers:1,deleteBufferRequests:1,createdVertexArrays:1,deleteVertexArrayRequests:1});assert.deepEqual(objects(main.stats),{...scopes,contextId,createdBuffers:4,deleteBufferRequests:0,createdVertexArrays:1,deleteVertexArrayRequests:0});
  shadow.store.collectRetired();
  main.release();
  assert.equal(new Set(c.deleted).size, 7);
  assert.deepEqual(objects(main.stats),{...scopes,contextId,createdBuffers:4,deleteBufferRequests:4,createdVertexArrays:1,deleteVertexArrayRequests:1});
});

test('a superseded candidate is rejected before allocation or before publication without releasing the resident', () => {
  const c = context(), owner = createResidentGeometryOwner(), first = owner.upload(c.gl, {}, plan(1));
  const publishedStats = owner.stats;
  let live = false;
  const candidate = {...plan(2), current: () => live};
  assert.throws(() => owner.upload(c.gl, {}, candidate), {name: 'AbortError'});
  assert.equal(c.deleted.length, 0);
  const afterRejection = owner.stats;
  assert(afterRejection.resourceStore.idleCache.observedAt >= publishedStats.resourceStore.idleCache.observedAt);
  // Each snapshot has its own observation time. The resource state must match.
  afterRejection.resourceStore.idleCache.observedAt = publishedStats.resourceStore.idleCache.observedAt;
  assert.deepEqual(afterRejection, publishedStats);
  live = true; c.control.onUpload = () => {live = false;};
  assert.throws(() => owner.upload(c.gl, {}, candidate), {name: 'AbortError'});
  assert.equal(owner.current, first);
  assert.deepEqual(logical(owner.stats),logical(publishedStats));
  assert.deepEqual(objects(owner.stats),{...scopes,contextId:getRenderResourceContextId(c.gl),createdBuffers:5,deleteBufferRequests:1,createdVertexArrays:2,deleteVertexArrayRequests:1},'a cancelled index upload does not proceed to allocate or upload attributes');
  const previous = new Set([first.vao, first.indexBuffer, ...first.buffers.values()]);
  assert.equal(c.deleted.length, 2);
  assert(c.deleted.every(value => !previous.has(value)));
});

test('chunk geometry allocation reuses exact content without bufferData and publishes through one scene transaction',()=>{
  const c=context(),store=isolatedStore(),owner=createResidentGeometryOwner({store,owner:'reuse'}),input={...plan(1),contentKey:'geometry:canonical:lod0:layout1'};
  let first,reused,snapshot;
  try{
    first=owner.allocate(c.gl,{},input);const value=first.value,uploads=c.uploads;
    assert(value);assert.equal(owner.current,undefined,'allocation alone cannot replace a published scene');
    assert.equal(owner.publish([first],{generation:1}),true);first.release();
    reused=owner.allocate(c.gl,{}, {...input,revision:2});assert.equal(reused.value,value);assert.equal(c.uploads,uploads,'an intersection lease does not upload the same content again');assert.equal(store.stats.gpuAllocations,1);
    const transaction=owner.reconcile({generation:2,wanted:[input.contentKey],context:c.gl,epoch:store.contextEpoch(c.gl)});
    assert.equal(transaction.get(input.contentKey).value,value);assert.equal(transaction.publish(),true);assert.equal(owner.current,value);assert.equal(owner.scene.generation,2);assert.equal(value.revision,1,'allocation identity survives a newer publication generation');reused.release();
    snapshot=owner.capture('reflection');c.control.fenceComplete=false;owner.release();assert.equal(owner.current,undefined);assert.equal(c.deleted.length,0,'the captured published version still owns its GPU allocation');assert.equal(snapshot.leases[0].value,value);
    snapshot.release();assert.equal(c.deleted.length,5);assert.equal(categoryBytes(store.budget,'gpu-buffer'),180);assert.equal(categoryBytes(store.budget,'metadata'),2*input.contentKey.length);assert.equal(store.budget.stats.bytes,geometryCharge(input.contentKey));assert.equal(store.budget.stats.retiringBytes,geometryCharge(input.contentKey),'delete requests retain both buffer and identity charges until completion');assert.equal(store.budget.stats.physicalMemory,'unmeasured');
    c.control.fenceComplete=true;store.collectRetired();assert.equal(store.budget.stats.bytes,0);assert.equal(store.stats.retiring,0);
  }finally{snapshot?.release();reused?.release();first?.release();owner.release();c.control.fenceComplete=true;store.collectRetired();store.destroy();store.collectRetired();}
});

test('chunk geometry borrows its parent index and attributes while uploading only independent dynamic state',()=>{
  const c=context(),store=isolatedStore(),main=createResidentGeometryOwner({store,owner:'static'}),dynamic=createResidentGeometryOwner({store,owner:'dynamic'}),input=plan(1),staticPlan={...input,contentKey:'static:canonical:lod0',buffers:input.buffers.filter(spec=>spec.key!=='state')};
  let parent,view;
  try{
    parent=main.allocate(c.gl,{},staticPlan);const geometry=parent.value;assert(geometry);assert.equal(main.publish([parent],{generation:1}),true);parent.release();
    const state=new Float32Array([1,2,3]),borrowed={revision:1,contentKey:'dynamic:canonical:selection0',indexBuffer:geometry.indexBuffer,indices:input.indices,parents:[main.currentLease],buffers:[
      {key:'vertices',buffer:geometry.buffers.get('vertices'),attributes:[{name:'a_position',size:3,stride:36}]},
      {key:'state',data:state,dynamic:true,attributes:[{name:'a_selected',size:1}]},
      {key:'city-extra',buffer:geometry.buffers.get('city-extra'),attributes:[{name:'a_cbt_display',size:4}]},
    ]},uploads=c.uploads;
    assert.throws(()=>dynamic.allocate(c.gl,{}, {...borrowed,parents:[]}),/index buffer requires a live parent/);assert.equal(c.uploads,uploads);
    view=dynamic.allocate(c.gl,{},borrowed);const allocation=view.value;assert(allocation);assert.equal(allocation.indexBuffer,geometry.indexBuffer);assert.equal(c.elementBindings.at(-1),geometry.indexBuffer);assert.equal(c.uploads,uploads+1);assert.equal(c.data.at(-1).value,state,'neither the static attributes nor CPU indices are uploaded again');assert.equal(dynamic.publish([view],{generation:1}),true);view.release();
    const total=geometryCharge(staticPlan.contentKey,168)+geometryCharge(borrowed.contentKey,12);
    assert.deepEqual(logical(main.stats),{revision:1,ownedBufferBytes:168,ownedBuffers:3,borrowedBuffers:0});assert.deepEqual(logical(dynamic.stats),{revision:1,ownedBufferBytes:12,ownedBuffers:1,borrowedBuffers:3});assert.equal(categoryBytes(store.budget,'gpu-buffer'),180,'the parent owns its static index exactly once');assert.equal(store.budget.stats.bytes,total,'each distinct derived identity is also owned once');
    main.release();assert.equal(c.deleted.length,0,'the child dependency remains after the parent scene exits');assert.equal(dynamic.current,allocation);
    c.control.fenceComplete=false;dynamic.release();assert.deepEqual(new Set(c.deleted),new Set([allocation.vao,allocation.buffers.get('state')]));assert(!c.deleted.includes(geometry.indexBuffer));assert.equal(store.budget.stats.bytes,total);assert.equal(store.budget.stats.retiringBytes,geometryCharge(borrowed.contentKey,12));
    c.control.fenceComplete=true;store.collectRetired();assert(c.deleted.includes(geometry.indexBuffer),'the parent may retire only after the child fence releases its dependency');store.collectRetired();assert.equal(store.budget.stats.bytes,0);for(const value of c.deleted)assert.equal(c.deleted.filter(item=>item===value).length,1);
  }finally{view?.release();parent?.release();dynamic.release();main.release();c.control.fenceComplete=true;store.evictRecent();store.collectRetired();store.collectRetired();store.destroy();store.collectRetired();}
});

test('chunk geometry failed allocation and incomplete cohort keep the whole published scene and its budget ownership',()=>{
  const c=context(),store=isolatedStore(),owner=createResidentGeometryOwner({store,owner:'atomic'});let first,next;
  try{
    first=owner.allocate(c.gl,{}, {...plan(1),contentKey:'published'});const value=first.value;assert.equal(owner.publish([first],{generation:1}),true);first.release();const version=owner.scene.version,old=new Set([value.vao,value.indexBuffer,...value.buffers.values()]);
    c.control.fenceComplete=false;c.control.failUpload=c.uploads+2;assert.throws(()=>owner.allocate(c.gl,{}, {...plan(2),contentKey:'failed'}),/WebGL error/);
    assert.equal(owner.current,value);assert.equal(owner.scene.version,version);assert(c.deleted.every(item=>!old.has(item)));assert.equal(categoryBytes(store.budget,'gpu-buffer'),360);assert.equal(store.budget.stats.bytes,geometryCharge('published')+geometryCharge('failed'));assert.equal(store.budget.stats.retiringBytes,geometryCharge('failed'),'a failed submitted candidate keeps its buffer and identity charges while its cleanup fence waits');
    c.control.failUpload=0;c.control.fenceComplete=true;store.collectRetired();assert.equal(store.budget.stats.bytes,geometryCharge('published'));
    next=owner.allocate(c.gl,{}, {...plan(3),contentKey:'cohort-one'});assert.equal(owner.publish([next],{generation:2,cohorts:[{key:'complete-pair',members:['cohort-one','cohort-two']}]}),false);assert.equal(owner.current,value);assert.equal(owner.scene.version,version);next.release();store.collectRetired();assert.equal(store.budget.stats.bytes,geometryCharge('published'));
    owner.release();store.collectRetired();assert.equal(store.budget.stats.bytes,0);
  }finally{next?.release();first?.release();owner.release();c.control.fenceComplete=true;store.evictRecent();store.collectRetired();store.destroy();store.collectRetired();}
});

test('chunk geometry old-epoch loss cannot invalidate a restored shared allocation or reupload its intersection',()=>{
  const c=context(),store=isolatedStore(),owner=createResidentGeometryOwner({store,owner:'old view'}),peer=createResidentGeometryOwner({store,owner:'restored view'}),input={...plan(1),contentKey:'same-canonical-geometry'};let old,fresh,reused;
  try{
    old=owner.allocate(c.gl,{},input);assert.equal(owner.publish([old],{generation:1}),true);old.release();const epoch=store.contextEpoch(c.gl);
    c.control.lost=true;owner.contextLost(c.gl,epoch);assert.equal(owner.current,undefined);assert.equal(c.deleted.length,0);assert.equal(store.budget.stats.bytes,0);
    c.control.lost=false;fresh=peer.allocate(c.gl,{}, {...input,revision:2,epoch:epoch+1});const value=fresh.value;assert(value);assert.equal(peer.publish([fresh],{generation:2}),true);fresh.release();const uploads=c.uploads;
    owner.contextLost(c.gl,epoch);assert.equal(peer.current,value);assert.equal(store.contextEpoch(c.gl),epoch+1);assert.equal(c.deleted.length,0,'an old incarnation issues no delete against either epoch');assert.throws(()=>owner.allocate(c.gl,{}, {...input,epoch}),{name:'AbortError'});assert.equal(c.uploads,uploads);
    reused=owner.allocate(c.gl,{}, {...input,revision:3,epoch:epoch+1});assert.equal(reused.value,value);assert.equal(c.uploads,uploads);assert.equal(owner.publish([reused],{generation:3}),true);reused.release();peer.release();assert.equal(owner.current,value);assert.equal(c.deleted.length,0);
    owner.release();store.collectRetired();assert.equal(c.deleted.length,5);assert.equal(store.budget.stats.bytes,0);assert.equal(store.stats.gpuAllocations,2);
  }finally{reused?.release();fresh?.release();old?.release();owner.release();peer.release();c.control.fenceComplete=true;store.evictRecent();store.collectRetired();store.destroy();store.collectRetired();}
});

test('chunk mesh derived identities preserve long escaped authority and reuse content across publications while separating owner, ABI and context',async()=>{
  const key=JSON.stringify(['verified-source','"\\'.repeat(4096),'城市🙂']),f=meshSource({key}),c=context(),other=context();
  const owner=createResidentGeometryOwner({store:f.store}),staticOwner=createResidentGeometryOwner({store:f.store}),otherGeometry=createResidentGeometryOwner({store:f.store}),staticKeys=[];
  // Record actual plans passed into the real allocator; admission and ownership
  // continue through the production store and geometry owner.
  const staticGeometry={allocate(...args){staticKeys.push(args[2].contentKey);return staticOwner.allocate(...args);}};
  let state,stateHit,otherState,first,second,alternate,otherView,otherContext;
  try{
    state=acquireChunkMeshState(f.store,c.gl,'owner:"\\',f.source,undefined,()=>{});
    const sourceMetadata=2*key.length,stateMetadata=2*state.contentKey.length;
    assert.equal(categoryBytes(f.budget,'metadata'),sourceMetadata+stateMetadata,'state key is reserved before scheduled production');
    await state.ready;assert.equal(f.slices,1);assert.deepEqual(state.value,new Float32Array([7,8,9]));assert.notEqual(state.value.buffer,f.value.baseState.buffer);
    assert.equal(categoryBytes(f.budget,'metadata'),sourceMetadata+stateMetadata,'settling the array preserves the same key allocation');
    const options={context:c.gl,program:{},owner:'owner:"\\',source:f.source,state,staticGeometry,geometry:owner,current:()=>true};
    first=allocateChunkMeshView(options);const firstValue=first.value,firstKey=first.contentKey,staticKey=staticKeys[0];
    for(const derived of [state.contentKey,staticKey,firstKey]){
      assert(derived.includes(key),'the complete parent authority survives verbatim');
      assert.equal(derived.indexOf(key),derived.lastIndexOf(key),'one derived identity holds its parent once');
      assert(derived.length<key.length+256,'quotes and backslashes do not grow on derivation');
    }
    assert.equal(firstKey,chunkMeshViewKey(options.owner,key));
    assert.notEqual(chunkMeshViewKey('ab','c'),chunkMeshViewKey('a','bc'),'field boundaries cannot collide');
    assert.notEqual(chunkMeshViewKey('1:',':2'),chunkMeshViewKey('1',':2:'),'length delimiters remain unambiguous inside fields');
    assert.equal(categoryBytes(f.budget,'metadata'),sourceMetadata+stateMetadata+2*(staticKey.length+firstKey.length));
    assert.equal(owner.publish([first],{generation:1,context:c.gl}),true);first.release();
    const initialBytes=f.budget.stats.bytes,initialUploads=c.uploads;
    stateHit=acquireChunkMeshState(f.store,c.gl,options.owner,f.source,undefined,()=>{});await stateHit.ready;assert.equal(stateHit.value,state.value);stateHit.release();
    second=allocateChunkMeshView(options);assert.equal(second.value,firstValue);assert.equal(owner.publish([second],{generation:2,context:c.gl}),true);second.release();
    assert.equal(c.uploads,initialUploads);assert.equal(f.slices,1);assert.equal(f.budget.stats.bytes,initialBytes,'a later view generation adds neither identity nor buffers');
    otherState=acquireChunkMeshState(f.store,c.gl,'other-owner',f.source,undefined,()=>{});await otherState.ready;
    otherView=allocateChunkMeshView({...options,owner:'other-owner',state:otherState});alternate=allocateChunkMeshView({...options,viewABI:'alternate:ABI'});
    assert.equal(new Set([firstKey,otherView.contentKey,alternate.contentKey]).size,3);
    assert.equal(otherView.value.indexBuffer,firstValue.indexBuffer);assert.equal(alternate.value.indexBuffer,firstValue.indexBuffer);assert.equal(c.uploads,initialUploads+2,'owner/ABI views reuse static buffers and upload only their state');
    assert(staticKeys.every(value=>value===staticKey));
    otherContext=allocateChunkMeshView({...options,context:other.gl,geometry:otherGeometry});
    assert.equal(otherContext.contentKey,firstKey,'context identity remains in the store GPU namespace');assert.notEqual(otherContext.value.vao,firstValue.vao);assert.notEqual(otherContext.value.indexBuffer,firstValue.indexBuffer);
    const expectedMetadata=sourceMetadata+stateMetadata+2*otherState.contentKey.length+2*(2*staticKey.length+2*firstKey.length+otherView.contentKey.length+alternate.contentKey.length);
    assert.equal(categoryBytes(f.budget,'metadata'),expectedMetadata);
    otherContext.release();otherView.release();alternate.release();owner.release();state.release();otherState.release();f.source.release();
    assert(f.budget.stats.recentBytes>0);assert.equal(categoryBytes(f.budget,'metadata'),expectedMetadata,'recent parent envelopes do not charge a key twice');
    c.control.fenceComplete=false;other.control.fenceComplete=false;f.store.evictRecent();f.store.collectRetired();
    assert.equal(categoryBytes(f.budget,'metadata'),expectedMetadata,'GPU retirement holds identity and parents until the same fence completes');
    c.control.fenceComplete=true;other.control.fenceComplete=true;
    // The dependency graph has two GPU levels. Each completed child can make
    // its static parent newly recent; drain those actual release waves too.
    for(let wave=0;wave<3;wave++){f.store.evictRecent();f.store.collectRetired();}
    await f.sourceRetired;assert.equal(f.budget.stats.bytes,0);assert.equal(f.store.stats.retiring,0);
  }finally{
    for(const lease of [otherContext,otherView,alternate,second,first,stateHit,state,otherState])lease?.release();owner.release();otherGeometry.release();staticOwner.release();f.source.release();
    c.control.fenceComplete=true;other.control.fenceComplete=true;f.store.destroy();f.store.collectRetired();f.store.collectRetired();
  }
});

test('chunk state identity capacity is refused before the source array is copied',()=>{
  const f=meshSource({key:'"\\'.repeat(128),stateOnlyCapacity:true}),c=context(),before=f.budget.stats.bytes;
  try{
    assert.throws(()=>acquireChunkMeshState(f.store,c.gl,'owner',f.source,undefined,()=>{}),ResourceBudgetExceededError);
    assert.equal(f.slices,0);assert.equal(f.store.stats.productions,1);assert.equal(f.budget.stats.bytes,before,'refusal leaves only the original source');
  }finally{f.source.release();f.store.destroy();assert.equal(f.budget.stats.bytes,0);}
});

for(const mode of ['cancel','failure'])test('chunk state '+mode+' releases its identity reservation and actual source parent',async()=>{
  const f=meshSource({sliceFailure:mode==='failure'}),c=context(),controller=new AbortController();let state;
  try{
    state=acquireChunkMeshState(f.store,c.gl,'owner',f.source,controller.signal,()=>{});f.source.release();
    assert(categoryBytes(f.budget,'metadata')>2*f.source.contentKey.length);
    if(mode==='cancel')controller.abort();
    await assert.rejects(state.ready,error=>mode==='cancel'?error.name==='AbortError':/state copy failed/.test(error.message));
    // Consumer rejection may precede the asynchronous producer's finally.
    // The real parent disposer witnesses its complete ownership unwind.
    await f.sourceRetired;assert.equal(f.slices,mode==='cancel'?0:1);assert.equal(state.value,undefined);assert.equal(f.budget.stats.bytes,0);
  }finally{state?.release();f.source.release();f.store.destroy();}
});

test('resident geometry identity capacity is refused before creating a VAO or buffer',()=>{
  const c=context(),budget=createResourceBudget({limitBytes:180,recentLimitBytes:0}),store=createChunkResourceStore({budget}),owner=createResidentGeometryOwner({store});
  try{
    assert.throws(()=>owner.allocate(c.gl,{}, {...plan(1),contentKey:'"\\'.repeat(128)}),ResourceBudgetExceededError);
    assert.equal(c.bufferAttempts,0);assert.equal(owner.stats.createdVertexArrays,0);assert.equal(c.uploads,0);assert.equal(budget.stats.bytes,0);
  }finally{owner.release();store.destroy();}
});

test('asynchronous geometry publication updates the existing GPU lifecycle once and rejects lost-context publication', () => {
  let ready = false, lost = false, initializations = 0;
  const lifecycle = createResidentGPULifecycle({bind() {}, initialize() {initializations++;}, release() {}, ready: () => ready, lost: () => lost, hasResident: () => true, needsPreflight: () => false, clearTransient() {}, revision: () => 1});
  lifecycle.attach({});
  assert.equal(initializations, 1);
  assert.equal(lifecycle.stats.initialized, false);
  ready = true;
  assert.equal(lifecycle.published(), true);
  assert.equal(lifecycle.published(), true);
  assert.equal(lifecycle.beforeUpload(), true);
  assert.equal(initializations, 1);
  assert.equal(lifecycle.stats.initializations, 1);
  assert.equal(lifecycle.stats.initialized, true);
  lifecycle.released(); lost = true;
  assert.equal(lifecycle.published(), false);
  assert.equal(lifecycle.stats.initializations, 1);
  assert.equal(lifecycle.stats.releases, 1);
});


test('normal compression preserves positions, colours, indices and inherited shadow layouts',()=>{
 const f=context(),store=isolatedStore(),owner=createResidentGeometryOwner({store,compressNormals:true});
 const input=plan(1);input.contentKey='normal-compressed';
 for(let i=0;i<27;i+=9)input.buffers[0].data.set([123.456,-0,3,.123456,-.654321,.5,.2,.3,.4],i);
 const before=new Uint8Array(input.buffers[0].data.buffer).slice();
 const lease=owner.allocate(f.gl,{},input),value=lease.value;
 assert(value);const upload=f.data.find(row=>row.value instanceof Uint8Array);
 assert.equal(upload.value.byteLength,96);assert.deepEqual(new Uint8Array(input.buffers[0].data.buffer),before);
 const view=new DataView(upload.value.buffer);
 for(let n=0;n<3;n++){
  assert.deepEqual(upload.value.slice(n*32,n*32+12),before.slice(n*36,n*36+12));
  assert.deepEqual(upload.value.slice(n*32+20,n*32+32),before.slice(n*36+24,n*36+36));
  for(let j=0;j<3;j++)assert(Math.abs(view.getInt16(n*32+12+j*2,true)/32767-input.buffers[0].data[n*9+3+j])<=1/65534+1e-7);
 }
 assert.deepEqual(f.data[0].value,input.indices);
 assert(f.attributes.some(a=>a[2]===f.gl.SHORT&&a[3]===true&&a[4]===32&&a[5]===12));
 assert.equal(categoryBytes(store.budget,'construction'),0);
 const shadow=createResidentGeometryOwner({store,compressNormals:true});const at=f.attributes.length;
 const borrowed=shadow.allocate(f.gl,{}, {revision:1,contentKey:'packed-shadow',parents:[lease],indices:input.indices,indexBuffer:value.indexBuffer,buffers:[{key:'positions',buffer:value.buffers.get('vertices'),attributes:[{name:'a_position',size:3,stride:36,offset:0}]}]});
 assert.equal(f.attributes[at][4],32);assert.equal(f.attributes[at][5],0);
 borrowed.release();lease.release();shadow.release();owner.release();store.evictRecent();store.collectRetired();store.collectRetired();assert.equal(store.budget.stats.bytes,0);
});


test('cyclic GPU indices preserve winding and the original flat vertex, without changing CPU indices',()=>{
 const input=new Uint32Array([3,8,5,11,7,2]),copy=input.slice(),output=rotateResidentTriangleIndices(input);
 assert.deepEqual(input,copy);assert.deepEqual(output,new Uint32Array([5,3,8,2,11,7]));
 for(let i=0;i<input.length;i+=3){assert.equal(output[i],input[i+2]);assert.equal(output[i+1],input[i]);assert.equal(output[i+2],input[i+1]);}
 assert.throws(()=>rotateResidentTriangleIndices(new Uint32Array([1,2])),/complete triangles/);
});

test('opted resident upload and borrowed index view use FIRST only inside their draw and restore on errors',()=>{
 const f=context(),store=isolatedStore(),owner=createResidentGeometryOwner({store,firstVertexTriangles:true});
 const ext={FIRST_VERTEX_CONVENTION_WEBGL:36429,LAST_VERTEX_CONVENTION_WEBGL:36430,PROVOKING_VERTEX_WEBGL:36431,provokingVertexWEBGL(value){mode=value;}};
 let mode=ext.LAST_VERTEX_CONVENTION_WEBGL,fail=false;const calls=[],get=f.gl.getParameter;
 f.gl.getExtension=name=>name==='WEBGL_provoking_vertex'?ext:null;
 f.gl.getParameter=key=>key===ext.PROVOKING_VERTEX_WEBGL?mode:get(key);
 f.gl.TRIANGLES=4;f.gl.UNSIGNED_INT=5125;f.gl.drawElements=(...args)=>{calls.push({args,mode});if(fail)throw Error('draw failed');};
 const source=plan(1),cpu=source.indices.slice(),lease=owner.allocate(f.gl,{},source),gpu=lease.value;
 assert.deepEqual(source.indices,cpu);assert.deepEqual(f.data.find(x=>x.target===f.gl.ELEMENT_ARRAY_BUFFER).value,new Uint32Array([2,0,1]));
 assert.equal(categoryBytes(store.budget,'construction'),0);
 drawResidentTriangles(f.gl,gpu.vao,3,0);assert.equal(calls.at(-1).mode,ext.FIRST_VERTEX_CONVENTION_WEBGL);assert.equal(mode,ext.LAST_VERTEX_CONVENTION_WEBGL);
 fail=true;assert.throws(()=>drawResidentTriangles(f.gl,gpu.vao,3,0),/draw failed/);assert.equal(mode,ext.LAST_VERTEX_CONVENTION_WEBGL);fail=false;
 const view=owner.allocate(f.gl,{}, {revision:2,indices:source.indices,indexBuffer:gpu.indexBuffer,parents:[lease],buffers:[]});
 drawResidentTriangles(f.gl,view.value.vao,3,0);assert.equal(calls.at(-1).mode,ext.FIRST_VERTEX_CONVENTION_WEBGL);assert.equal(mode,ext.LAST_VERTEX_CONVENTION_WEBGL);
 assert.throws(()=>drawResidentTriangles(f.gl,gpu.vao,3,4),/align/);
 drawResidentTriangles(f.gl,{},3,0);assert.equal(calls.at(-1).mode,ext.LAST_VERTEX_CONVENTION_WEBGL);
 view.release();lease.release();owner.release();
});

test('first-vertex opt-in keeps the original upload when the extension is unavailable',()=>{
 const f=context(),owner=createResidentGeometryOwner({store:isolatedStore(),firstVertexTriangles:true});f.gl.getExtension=()=>null;
 const source=plan(1),lease=owner.allocate(f.gl,{},source);assert.equal(f.data.find(x=>x.target===f.gl.ELEMENT_ARRAY_BUFFER).value,source.indices);
 lease.release();owner.release();
});


test('cyclic shared chunk publication resolves the same view identity and reuses the published geometry',async()=>{
 const f=context(),fixture=meshSource(),{store,source}=fixture;await source.ready;
 f.gl.getExtension=()=>({FIRST_VERTEX_CONVENTION_WEBGL:36429,LAST_VERTEX_CONVENTION_WEBGL:36430,PROVOKING_VERTEX_WEBGL:36431,provokingVertexWEBGL(){}});
 const staticGeometry=createResidentGeometryOwner({store,firstVertexTriangles:true}),geometry=createResidentGeometryOwner({store,firstVertexTriangles:true});
 const state=acquireChunkMeshState(store,f.gl,'infill:frankfurt:test',source);await state.ready;
 const options={context:f.gl,program:{},owner:'infill:frankfurt:test',source,state,staticGeometry,geometry};
 const view=allocateChunkMeshView(options),key=residentTriangleGeometryKey(f.gl,chunkMeshViewKey(options.owner,source.contentKey));
 assert.equal(view.contentKey,key);assert(geometry.publish([view],{generation:1,context:f.gl}));
 const found=geometry.currentLeases.find(lease=>lease.contentKey===key);assert(found?.value,'the renderer must find its published chunk after the format identity changes');
 const uploads=f.uploads,again=allocateChunkMeshView(options);assert.equal(again.value,found.value);assert.equal(f.uploads,uploads);
 again.release();view.release();state.release();geometry.release();staticGeometry.release();source.release();store.evictRecent();store.collectRetired();store.destroy();store.collectRetired();
});

test('City triangle batch reads the input state once and restores it across mixed geometry and failures', () => {
 const fixture = context(), gl = fixture.gl;
 const owner = createResidentGeometryOwner({store: isolatedStore(), firstVertexTriangles: true});
 let mode = 2, reads = 0, fail = false;
 const writes = [], draws = [];
 const ext = {FIRST_VERTEX_CONVENTION_WEBGL: 1, LAST_VERTEX_CONVENTION_WEBGL: 2, PROVOKING_VERTEX_WEBGL: 99,
  provokingVertexWEBGL(value) { writes.push(value); mode = value; }};
 const get = gl.getParameter;
 gl.getExtension = name => name === 'WEBGL_provoking_vertex' ? ext : null;
 gl.getParameter = key => {
  if (key !== ext.PROVOKING_VERTEX_WEBGL) return get(key);
  reads++;
  return fixture.control.lost ? null : mode;
 };
 gl.drawElements = () => { draws.push(mode); if (fail) throw Error('draw failed'); };
 const lease = owner.allocate(gl, {}, plan(1)), vao = lease.value.vao;
 const batch = createResidentTriangleDrawBatch(gl);
 batch.draw({}, 3, 0);
 assert.throws(() => batch.draw(vao, 3, 4), /align/);
 assert.equal(reads, 0);
 for (let i = 0; i < 128; i++) batch.draw(vao, 3, 0);
 batch.draw({}, 3, 0);
 fail = true;
 assert.throws(() => { try { batch.draw(vao, 3, 0); } finally { batch.restore(); } }, /draw failed/);
 assert.equal(reads, 1);
 assert.deepEqual(writes, [1, 2, 1, 2]);
 assert.deepEqual(draws, [2, ...Array(128).fill(1), 2, 1]);
 fail = false;
 mode = 1;
 const alreadyFirst = createResidentTriangleDrawBatch(gl);
 alreadyFirst.draw(vao, 3, 0);
 alreadyFirst.restore();
 assert.equal(reads, 2);
 assert.equal(writes.length, 4);
 mode = 2;
 const lost = createResidentTriangleDrawBatch(gl);
 lost.draw(vao, 3, 0);
 fixture.control.lost = true;
 lost.restore();
 assert.equal(writes.length, 5);
 const countBefore = draws.length;
 createResidentTriangleDrawBatch(gl).draw(vao, 3, 0);
 assert.equal(draws.length, countBefore);
 const foreign = context().gl;
 foreign.getParameter = () => { throw Error('unexpected query'); };
 let foreignDraws = 0;
 foreign.drawElements = () => { foreignDraws++; };
 const other = createResidentTriangleDrawBatch(foreign);
 other.draw(vao, 3, 0);
 other.restore();
 assert.equal(foreignDraws, 1);
 fixture.control.lost = false;
 lease.release(); owner.release();
});

test('published span search visits intersecting rows and uniform locations follow linked programs',async()=>{
 const source=await readFile(new URL('../src/safety/render-runtime/resident-draw-range.ts',import.meta.url),'utf8');
 const module={exports:{}};
 Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module.exports);
 const {residentSpansInRange,chunkUniforms}=module.exports;
 const spans=Array.from({length:4096},(_,i)=>({firstIndex:6*i,indexCount:3}));
 let visits=0;
 const tracked=new Proxy(spans,{get(rows,key){if(typeof key==='string'&&/^\d+$/.test(key))visits++;return rows[key];}});
 assert.deepEqual([...residentSpansInRange(tracked,24559,24567)],[spans[4093],spans[4094]]);
 assert.ok(visits<25);
 for(const first of [0,1,3,6,24574,24580]){
  const end=first+4;
  assert.deepEqual([...residentSpansInRange(spans,first,end)],spans.filter(s=>s.firstIndex+s.indexCount>first&&s.firstIndex<end));
 }
 let reads=0,lost=false;
 const gl={isContextLost:()=>lost,getUniformLocation:()=>{reads++;return null;}},program={};
 for(let i=0;i<100;i++)chunkUniforms(gl,program);
 assert.equal(reads,4);
 const restored={};lost=true;chunkUniforms(gl,restored);lost=false;chunkUniforms(gl,restored);
 assert.equal(reads,12);
});
