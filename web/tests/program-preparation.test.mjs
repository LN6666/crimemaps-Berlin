import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {transform} from 'esbuild';
import ts from 'typescript';
const productionModules=new Map();
function loadProductionModule(file){
 const filename=file instanceof URL?fileURLToPath(file):file,previous=productionModules.get(filename);if(previous)return previous.exports;
 // Register before execution: store -> preparation -> store is a real
 // function-definition cycle, not a reason to substitute a fixture store.
 const module={exports:{}};productionModules.set(filename,module);
 try{const code=ts.transpileModule(readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  Function('module','exports','require',code+'\n//# sourceURL='+filename)(module,module.exports,name=>{assert(name.startsWith('.'),'only real local production dependencies');const target=path.resolve(path.dirname(filename),name);return loadProductionModule(path.extname(target)?target:target+'.ts');});return module.exports;
 }catch(error){productionModules.delete(filename);throw error;}
}
const productionCore=loadProductionModule(new URL('../src/safety/render-runtime/program-preparation.ts',import.meta.url));
const {readRenderProgramLifecycle,createProgramPreparationOwner,createProgramSourceAuthority,isProgramPreparationPending,ProgramPreparationFailure,scheduleRenderResourceWork,scheduleRenderResourceSteps}=productionCore;
const {createResourceBudget}=loadProductionModule(new URL('../src/safety/render-runtime/resource-budget.ts',import.meta.url));
const {createChunkResourceStore,bindChunkResourceContext,getChunkResourceStoreForContext}=loadProductionModule(new URL('../src/safety/render-runtime/chunk-resource-store.ts',import.meta.url));

function driver({parallel=false,linked=true,compiled=true}={}){
 let id=0;const calls=[],created=[],deleted=[],released=[],completion=new Map(),fences=[],deletedSyncs=[];
 let lost=false;const invalidateResources=()=>{for(const value of created)value.invalidated=true;};
 const gl={get lost(){return lost;},set lost(value){if(value&&!lost)invalidateResources();lost=value;},complete:true,fenceComplete:true,linked,compiled,VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,COMPILE_STATUS:4,SYNC_GPU_COMMANDS_COMPLETE:6,ALREADY_SIGNALED:7,CONDITION_SATISFIED:8,TIMEOUT_EXPIRED:9,WAIT_FAILED:10,isContextLost(){return this.lost;}};
 const call=(name,fn)=>(...args)=>{assert(!gl.lost,`${name} after context loss`);calls.push({name,args});return fn?.(...args);};
 const releaseShader=shader=>{if(shader.deleteRequested&&!shader.attachments.size&&!shader.released){shader.released=true;released.push(shader);}};
 const detach=(program,shader)=>{assert(!program.invalidated&&!shader.invalidated,'GL operation on invalidated resource');assert(program.shaders.delete(shader),'detaching a shader that was not attached');assert(shader.attachments.delete(program));releaseShader(shader);};
 Object.assign(gl,{
  createShader:call('createShader',type=>{const value={type,id:++id,attachments:new Set(),deleteRequested:false,released:false};created.push(value);return value;}),shaderSource:call('shaderSource'),compileShader:call('compileShader'),
  createProgram:call('createProgram',()=>{const value={program:true,id:++id,shaders:new Set(),deleted:false,linked:false};created.push(value);return value;}),
  attachShader:call('attachShader',(program,shader)=>{assert(!program.deleted&&!shader.released&&!program.invalidated&&!shader.invalidated);assert(!program.shaders.has(shader));program.shaders.add(shader);shader.attachments.add(program);}),
  detachShader:call('detachShader',detach),getAttachedShaders:call('getAttachedShaders',program=>[...program.shaders]),
  bindAttribLocation:call('bindAttribLocation'),linkProgram:call('linkProgram',program=>program.linked=gl.linked),
  getExtension:call('getExtension',()=>parallel?{COMPLETION_STATUS_KHR:5}:null),getProgramParameter:call('getProgramParameter',(program,parameter)=>parameter===5?(completion.get(program)??gl.complete):gl.linked),
  getProgramInfoLog:call('getProgramInfoLog',()=>''),getShaderParameter:call('getShaderParameter',(shader,parameter)=>parameter===5?(completion.get(shader)??gl.complete):gl.compiled),getShaderInfoLog:call('getShaderInfoLog',()=>''),
  deleteShader:call('deleteShader',shader=>{assert(!shader.invalidated);deleted.push(shader);shader.deleteRequested=true;releaseShader(shader);}),
  deleteProgram:call('deleteProgram',program=>{assert(!program.invalidated);deleted.push(program);if(program.deleted)return;program.deleted=true;for(const shader of [...program.shaders])detach(program,shader);}),
  useProgram:call('useProgram',program=>assert(program.linked&&!program.deleted&&!program.invalidated,'linked executable must remain usable after shader release')),
  fenceSync:call('fenceSync',()=>{const fence={sync:fences.length+1};fences.push(fence);return fence;}),flush:call('flush'),clientWaitSync:call('clientWaitSync',()=>gl.fenceComplete?gl.ALREADY_SIGNALED:gl.TIMEOUT_EXPIRED),deleteSync:call('deleteSync',fence=>deletedSyncs.push(fence)),
 });return{gl,calls,created,deleted,released,fences,deletedSyncs,invalidateResources,setCompletion(resource,value=true){assert(created.includes(resource));completion.set(resource,value);},retainedShaders:()=>created.filter(value=>!value.program&&!value.released&&!value.invalidated)};
}
// Explicit 4 ms source/submission costs below force a full production slice;
// sub-slice latency is covered separately by the bounded-chain regression.
function turns(){
 const queue=[],previous=globalThis.setTimeout,performanceDescriptor=Object.getOwnPropertyDescriptor(globalThis,'performance'),timeOrigin=performance.timeOrigin;let now=0,turn=0;
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{timeOrigin,now:()=>now}});
 globalThis.setTimeout=fn=>(queue.push(fn),queue.length);
 const one=()=>{assert(queue.length,'pending preparation must retain a scheduled turn');turn++;queue.shift()();};
 return{one,advance(ms){assert(ms>=0);now+=ms;},get turn(){return turn;},until(ready,limit=160){let n=0;while(!ready()){assert(++n<=limit,'bounded fixture turns did not reach the requested GL milestone');one();}},all(){let n=0;while(queue.length){assert(++n<1000,'unbounded preparation turns');one();}},restore(){globalThis.setTimeout=previous;if(performanceDescriptor)Object.defineProperty(globalThis,'performance',performanceDescriptor);else delete globalThis.performance;},queue};
}
const recipe=(resource='colour',priority='visible',build=()=>({vertex:'original vertex',fragment:'original fragment',attributes:['a_position','a_paint_family']}))=>({resource,priority,inputs:['material revision'],build});
function pending(fn,status='pending'){assert.throws(fn,error=>isProgramPreparationPending(error)&&error.status===status);}

test('fake shader deletion is only a mark until its last program attachment is removed',()=>{
 const f=driver(),shader=f.gl.createShader(f.gl.VERTEX_SHADER),first=f.gl.createProgram(),second=f.gl.createProgram();
 f.gl.attachShader(first,shader);f.gl.attachShader(second,shader);f.gl.deleteShader(shader);
 assert.equal(f.deleted.filter(value=>value===shader).length,1);assert.equal(shader.deleteRequested,true);assert.equal(shader.released,false);assert.deepEqual(f.retainedShaders(),[shader]);
 f.gl.detachShader(first,shader);assert.equal(shader.released,false);assert.equal(shader.attachments.size,1);
 f.gl.deleteProgram(second);assert.equal(shader.released,true);assert.equal(shader.attachments.size,0);assert.deepEqual(f.retainedShaders(),[]);assert.deepEqual(f.released,[shader]);
});

test('successful shared owner keeps the linked program usable while releasing both shader attachments',()=>{
 const t=turns();try{const f=driver(),owner=createProgramPreparationOwner('shader-lifetime',()=>{}),r=recipe();pending(()=>owner.compile(f.gl,r));t.all();
  const program=f.created.find(value=>value.program),shaders=f.created.filter(value=>!value.program);assert.equal(owner.stats.ready,1);assert.equal(shaders.length,2);assert.equal(f.deleted.filter(value=>!value.program).length,2);
  assert.equal(f.retainedShaders().length,0,'deleteShader marks attached objects; successful link must detach them before transfer');assert.deepEqual(f.gl.getAttachedShaders(program),[]);assert.equal(f.released.length,2);
  assert.equal(owner.compile(f.gl,r),program);f.gl.useProgram(program);owner.cancel();assert.equal(program.deleted,false);assert.equal(f.deleted.filter(value=>value.program).length,0);
  assert.equal(f.calls.filter(call=>call.name==='detachShader').length,2);for(const shader of shaders)assert.equal(f.deleted.filter(value=>value===shader).length,1);
 }finally{t.restore();}
});

test('partial attachment failures release every live shader and the partial program exactly once',()=>{
 for(const failAt of [1,2]){const t=turns();try{const f=driver(),owner=createProgramPreparationOwner('partial-attach',()=>{}),r=recipe(),attach=f.gl.attachShader;let attached=0;
  f.gl.attachShader=(...args)=>{attach(...args);if(++attached===failAt)throw Error('controlled partial attach failure');};
  pending(()=>owner.compile(f.gl,r));t.all();assert.throws(()=>owner.compile(f.gl,r),error=>error instanceof ProgramPreparationFailure&&error.diagnostic.phase==='link-submit');
  assert.equal(owner.stats.ready,0);assert.equal(f.retainedShaders().length,0);assert.equal(f.released.length,2);assert.equal(f.calls.filter(call=>call.name==='detachShader').length,0,'failed submissions use program disposal without successful-link detachment');
  for(const resource of f.created)assert.equal(f.deleted.filter(value=>value===resource).length,1);assert(f.created.find(value=>value.program).deleted);
 }finally{t.restore();}}
});

test('cancellation inside detach cannot publish the program or delete any live resource twice',()=>{
 for(const throwCallbacks of [false,true]){const t=turns();try{const f=driver();let settlements=0;const owner=createProgramPreparationOwner('detach-cancel',()=>{settlements++;if(throwCallbacks)throw Error('controlled settlement callback failure');}),r=recipe(),detach=f.gl.detachShader,deleteShader=f.gl.deleteShader;let cancelled=false,deleteFailure=false;
  f.gl.deleteShader=shader=>{deleteShader(shader);if(throwCallbacks&&!deleteFailure){deleteFailure=true;throw Error('controlled disposal callback failure');}};
  f.gl.detachShader=(...args)=>{detach(...args);if(!cancelled){cancelled=true;owner.cancel();}};
  pending(()=>owner.compile(f.gl,r));assert.doesNotThrow(()=>t.all());assert(cancelled,'the real shared owner must reach mandatory detachment');assert.equal(owner.stats.ready,0);assert.equal(owner.stats.last.status,'cancelled');assert.equal(owner.stats.context.pending,0);assert.equal(owner.stats.context.submitted,0);assert.equal(f.calls.filter(call=>call.name==='detachShader').length,1);
  assert.equal(f.retainedShaders().length,0);assert.equal(f.released.length,2);for(const resource of f.created)assert.equal(f.deleted.filter(value=>value===resource).length,1);assert.equal(settlements,1,'disposal or settlement exceptions do not repeat either terminal callback');
  const calls=f.calls.length;owner.cancel();t.all();assert.equal(f.calls.length,calls);assert.equal(settlements,1);
 }finally{t.restore();}}
});

for(const loss of ['physical context','shared epoch'])test(`${loss} loss inside detach stops old-context GL work and prevents program publication`,()=>{
 const t=turns();try{const f=driver(),owner=createProgramPreparationOwner('detach-loss',()=>{}),other=createProgramPreparationOwner('other',()=>{}),r=recipe(),detach=f.gl.detachShader;let cutoff;
  f.gl.detachShader=(...args)=>{detach(...args);if(cutoff===undefined){if(loss==='physical context')f.gl.lost=true;else{other.contextLost();f.invalidateResources();}cutoff=f.calls.length;}};
  pending(()=>owner.compile(f.gl,r));if(loss==='shared epoch')other.work(f.gl,{resource:'queued-upload',revision:1,current:()=>true,work(){assert.fail('invalidated upload must not execute');}});
  t.all();assert.notEqual(cutoff,undefined,'the real shared owner must reach mandatory detachment');assert.equal(f.calls.length,cutoff,'no second detach/delete after loss or epoch invalidation');assert.equal(owner.stats.ready,0);assert.equal(owner.stats.last.status,'lost');assert.equal(owner.stats.context.pending,0);assert.equal(f.deleted.length,0);
  const oldPrograms=f.created.filter(value=>value.program);owner.contextLost();other.contextLost();t.all();assert.equal(f.calls.length,cutoff);f.gl.lost=false;
  pending(()=>owner.compile(f.gl,r));t.all();const program=owner.compile(f.gl,r);assert(!oldPrograms.includes(program));f.gl.useProgram(program);assert.equal(f.gl.getAttachedShaders(program).length,0);assert.equal(f.retainedShaders().length,0);assert.equal(owner.stats.last.status,'ready');assert.equal(owner.stats.last.epoch,1);
 }finally{t.restore();}
});

test('cooperative turn advances short source, shader submission, link and validation in order; transfer happens once',()=>{
 const t=turns();try{const f=driver();let built=0,repaints=0;const owner=createProgramPreparationOwner('base berlin',()=>repaints++),r=recipe('colour','visible',()=>{built++;return{vertex:'original vertex',fragment:'original fragment',attributes:['a_position']};});
  pending(()=>owner.compile(f.gl,r));assert.equal(built,0);assert.equal(f.calls.length,0);
  t.one();assert.equal(built,1);assert.equal(owner.stats.ready,1,'short phases do not pay one timer per shader phase');assert.equal(t.queue.length,0);
  assert.deepEqual(f.calls.filter(c=>c.name==='compileShader'||c.name==='linkProgram').map(c=>c.name),['compileShader','compileShader','linkProgram']);
  const linkAt=f.calls.findIndex(c=>c.name==='linkProgram'),validationAt=f.calls.findIndex(c=>c.name==='getProgramParameter'&&c.args[1]===f.gl.LINK_STATUS);assert(validationAt>linkAt,'real link validation still follows submission');
  const dispatch=owner.stats.context.dispatch;assert.equal(dispatch.turns,1);assert(dispatch.steps>=4&&dispatch.steps<=16);assert.equal(dispatch.sliceBudgetMs,4);assert.equal(dispatch.maxStepsPerTurn,16);assert.equal(repaints,1);
  const p=owner.compile(f.gl,r);assert(p.program);assert.equal(owner.stats.ready,0);owner.cancel();assert(!f.deleted.includes(p));assert.equal(f.deleted.length,2);
  assert.deepEqual(f.calls.filter(c=>c.name==='shaderSource').map(c=>c.args[1]),['original vertex','original fragment']);assert.equal(owner.stats.last.status,'ready');assert(!JSON.stringify(owner.stats).includes('original fragment'));
 }finally{t.restore();}
});

test('cooperative turn polls each KHR waiter at most once and permits pure work between unfinished submissions',()=>{
 const t=turns(),f=driver({parallel:true}),owners=[createProgramPreparationOwner('slice a',()=>{}),createProgramPreparationOwner('slice b',()=>{})],queries=[],parameter=f.gl.getProgramParameter;
 f.gl.complete=false;f.gl.getProgramParameter=(program,pname)=>{queries.push({program,pname,turn:t.turn});return parameter(program,pname);};
 const recipes=owners.map((_,index)=>recipe('slice:'+index));
 try{
  for(const [index,owner]of owners.entries())pending(()=>owner.compile(f.gl,recipes[index]));
  assert.equal(t.queue.length,1);t.one();assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,2);assert.equal(queries.length,0,'a newly linked KHR waiter is not polled again in its submission turn');
  let uploaded=0;assert.equal(owners[0].work(f.gl,{resource:'slice-upload',revision:1,retainReady:false,current:()=>true,work(){uploaded++;}}),false);
  t.one();assert.equal(uploaded,1,'pure work remains runnable while both program slots wait');assert.equal(owners[0].stats.context.submitted,2);assert.equal(owners[0].stats.ready,0);assert.equal(owners[1].stats.ready,0);
  t.one();const polled=new Map();for(const query of queries){assert.equal(query.pname,5,'unfinished KHR never permits LINK_STATUS validation');const key=query.program.id+':'+query.turn;polled.set(key,(polled.get(key)??0)+1);}assert(polled.size>=4);for(const count of polled.values())assert.equal(count,1,'one completion query per program per turn');
  f.gl.complete=true;t.all();
  for(const [index,owner]of owners.entries()){
   const program=owner.compile(f.gl,recipes[index]),completion=queries.filter(query=>query.program===program&&query.pname===5).at(-1),validation=queries.find(query=>query.program===program&&query.pname===f.gl.LINK_STATUS);
   assert.equal(validation.turn,completion.turn,'a successful completion query may proceed to real validation in the same turn');f.gl.useProgram(program);owner.releaseProgram(f.gl,program);
  }
  assert.equal(owners[0].stats.context.submitted,0);assert(owners[0].stats.context.dispatch.maxSteps<=16);
 }finally{f.gl.complete=true;for(const owner of owners)owner.dispose();t.all();t.restore();}
});

test('cooperative turn yields at the phase or time budget without interrupting an executing callback',()=>{
 const t=turns(),f=driver(),owner=createProgramPreparationOwner('slice work',()=>{}),completed=[];
 try{
  for(let index=0;index<24;index++)owner.work(f.gl,{resource:'short:'+index,revision:1,retainReady:false,current:()=>true,work(){completed.push(index);}});
  assert.equal(t.queue.length,1);t.one();assert.equal(completed.length,16);assert.equal(owner.stats.pending,8);assert.equal(t.queue.length,1,'the remaining work shares one continuation timer');
  let dispatch=owner.stats.context.dispatch;assert.equal(dispatch.lastSteps,16);assert.equal(dispatch.maxStepsPerTurn,16);assert(dispatch.yieldReasons['step-limit']>=1);t.all();assert.deepEqual(completed,Array.from({length:24},(_,index)=>index));
  const callbacks=[];for(let index=0;index<3;index++)owner.work(f.gl,{resource:'timed:'+index,revision:1,retainReady:false,current:()=>true,work(){callbacks.push('start:'+index);t.advance(2.5);callbacks.push('end:'+index);}});
  t.one();assert.deepEqual(callbacks,['start:0','end:0','start:1','end:1']);assert.equal(owner.stats.pending,1);
  dispatch=owner.stats.context.dispatch;assert.equal(dispatch.sliceBudgetMs,4);assert.equal(dispatch.lastSteps,2);assert.equal(dispatch.lastElapsedMs,5,'the time slice yields after a complete synchronous callback');assert(dispatch.yieldReasons['slice-budget']>=1);assert(dispatch.maxSteps<=16);t.all();assert.deepEqual(callbacks,['start:0','end:0','start:1','end:1','start:2','end:2']);assert.equal(owner.stats.pending,0);assert.equal(f.calls.length,0);
 }finally{owner.dispose();t.restore();}
});

test('KHR completion never substitutes for link success; empty driver log retains source/resource/phase',()=>{
 const t=turns();try{const f=driver({parallel:true,linked:false}),owner=createProgramPreparationOwner('church berlin',()=>{}),r=recipe('depth:full','capture');pending(()=>owner.compile(f.gl,r));
  f.gl.complete=false;t.until(()=>f.calls.some(c=>c.name==='linkProgram'));t.one();assert.equal(owner.stats.ready,0);assert(!f.calls.some(c=>c.name==='getProgramParameter'&&c.args[1]===f.gl.LINK_STATUS));
  f.gl.complete=true;t.all();assert.throws(()=>owner.compile(f.gl,r),error=>error instanceof ProgramPreparationFailure&&error.diagnostic.source==='church berlin'&&error.diagnostic.resource==='depth:full'&&error.diagnostic.phase==='link-status'&&error.diagnostic.reason.includes('empty driver log'));
  assert.equal(owner.stats.failed,1);assert.equal(owner.stats.last.vertex.characters,15);assert.equal(owner.stats.last.fragment.characters,17);assert.equal(f.deleted.length,f.created.length);
  assert.equal(f.retainedShaders().length,0);assert.equal(f.released.length,2);assert.equal(f.calls.filter(call=>call.name==='detachShader').length,0,'failed link must not use successful-link detachment');for(const resource of f.created)assert.equal(f.deleted.filter(value=>value===resource).length,1);
 }finally{t.restore();}
});

test('actual shader failure retains its stage and source hash after asynchronous link validation',()=>{
 const t=turns();try{const f=driver({linked:false,compiled:false}),owner=createProgramPreparationOwner('fixture',()=>{}),r=recipe();pending(()=>owner.compile(f.gl,r));t.all();assert.throws(()=>owner.compile(f.gl,r),error=>error.diagnostic?.phase==='vertex-status'&&/^[0-9a-f]{8}$/.test(error.diagnostic.vertex.hash));assert.equal(owner.stats.last.status,'failed');}finally{t.restore();}
});

test('a capture-only failure gets one first-visible retry with the same program identity and original sources',()=>{
 const t=turns();try{const f=driver({linked:false}),owner=createProgramPreparationOwner('delegated500',()=>{}),capture=recipe('colour:1004','capture'),visible={...capture,priority:'visible'};
  pending(()=>owner.compile(f.gl,capture));t.all();let failed;
  assert.throws(()=>owner.compile(f.gl,capture),error=>(failed=error,error instanceof ProgramPreparationFailure));
  for(let i=0;i<5;i++)assert.throws(()=>owner.compile(f.gl,capture),error=>error===failed);
  assert.equal(f.calls.filter(c=>c.name==='linkProgram').length,1);assert.equal(t.queue.length,0);
  f.gl.linked=true;pending(()=>owner.compile(f.gl,visible));assert.equal(owner.stats.failed,0);assert.equal(owner.stats.pending,1);
  for(let i=0;i<5;i++){pending(()=>owner.compile(f.gl,capture));pending(()=>owner.compile(f.gl,visible));}t.all();
  const program=owner.compile(f.gl,capture);assert(program.program,'capture consumes the exact same visible replacement');assert.equal(owner.stats.ready,0);
  assert.equal(f.calls.filter(c=>c.name==='linkProgram').length,2);assert.deepEqual(f.calls.filter(c=>c.name==='shaderSource').map(c=>c.args[1]),['original vertex','original fragment','original vertex','original fragment']);
 }finally{t.restore();}
});

test('a failed first-visible upgrade stays latched through alternating capture/visible polling',()=>{
 const t=turns();try{const f=driver({linked:false}),owner=createProgramPreparationOwner('delegated500',()=>{}),capture=recipe('colour:1004','capture'),visible={...capture,priority:'visible'};
  pending(()=>owner.compile(f.gl,capture));t.all();assert.throws(()=>owner.compile(f.gl,capture),ProgramPreparationFailure);
  pending(()=>owner.compile(f.gl,visible));pending(()=>owner.compile(f.gl,capture));t.all();let failed;
  assert.throws(()=>owner.compile(f.gl,capture),error=>(failed=error,error instanceof ProgramPreparationFailure));
  f.gl.linked=true;for(let i=0;i<20;i++){assert.throws(()=>owner.compile(f.gl,visible),error=>error===failed);assert.throws(()=>owner.compile(f.gl,capture),error=>error===failed);}
  assert.equal(f.calls.filter(c=>c.name==='linkProgram').length,2);assert.equal(t.queue.length,0);assert.equal(owner.stats.failed,1);
 }finally{t.restore();}
});

for(const first of ['visible','capture'])test(`${first} first: visible demand before failure is retained independently of capture scheduling priority`,()=>{
 const t=turns();try{const f=driver({linked:false}),owner=createProgramPreparationOwner('delegated500',()=>{}),capture=recipe('colour:1004','capture'),visible={...capture,priority:'visible'};
  pending(()=>owner.compile(f.gl,first==='visible'?visible:capture));pending(()=>owner.compile(f.gl,visible));pending(()=>owner.compile(f.gl,capture));t.all();
  f.gl.linked=true;for(let i=0;i<10;i++){assert.throws(()=>owner.compile(f.gl,visible),ProgramPreparationFailure);assert.throws(()=>owner.compile(f.gl,capture),ProgramPreparationFailure);}
  assert.equal(f.calls.filter(c=>c.name==='linkProgram').length,1);assert.equal(t.queue.length,0);
 }finally{t.restore();}
});

test('admission window: one KHR-waiting program does not block a second submission and a third waits for completion',()=>{
 const t=turns(),f=driver({parallel:true}),owners=Array.from({length:3},(_,i)=>createProgramPreparationOwner('window '+i,()=>{}));f.gl.complete=false;
 const builds=[],recipes=owners.map((_,i)=>recipe('window:'+i,'visible',()=>{builds.push(i);t.advance(4);return{vertex:'vertex '+i,fragment:'fragment '+i,attributes:[]};}));
 try{
  for(let i=0;i<owners.length;i++)pending(()=>owners[i].compile(f.gl,recipes[i]));
  t.until(()=>builds.length===1);assert.equal(owners[0].stats.sourceRetainedCharacters,'vertex 0'.length+'fragment 0'.length);assert.equal(owners[0].stats.sourceRetainedBytesEstimate,owners[0].stats.sourceRetainedCharacters*2,'UTF16 estimate is logical source retention, not native memory');
  t.until(()=>f.calls.filter(c=>c.name==='linkProgram').length===2);
  const [first,second]=f.created.filter(value=>value.program);assert(first&&second);assert.deepEqual(builds,[0,1],'third source construction stays behind the two submitted programs');
  for(let i=0;i<8;i++)t.one();assert.equal(f.created.filter(value=>value.program).length,2);assert.equal(owners[0].stats.ready,0);assert.equal(owners[1].stats.ready,0);
  const stalled=owners[0].stats.context;assert.equal(stalled.submitted,2);assert.equal(stalled.inFlight,2);assert.equal(stalled.maxInFlight,2);assert.equal(stalled.waiting,2);assert.equal(stalled.queued,1);assert.equal(stalled.active,0);assert.equal(stalled.retiring,0);
  assert.equal(owners[0].stats.sourceRetainedCharacters,0);assert.equal(owners[1].stats.sourceRetainedCharacters,0,'shader source strings are discarded after shaderSource/link submission');
  const pureWork=[];for(const resource of ['pure-source','pure-upload']){const work={resource,revision:1,phase:resource==='pure-source'?'source-build':'upload',current:()=>true,work(){pureWork.push(resource);}};assert.equal(owners[2].work(f.gl,work),false);t.until(()=>pureWork.includes(resource));assert.equal(owners[2].work(f.gl,work),true);assert.equal(owners[2].stats.context.submitted,2);}
  assert.deepEqual(pureWork,['pure-source','pure-upload']);assert.deepEqual(builds,[0,1],'pure work can pass two waiters without constructing the third program source');assert.equal(f.created.filter(value=>value.program).length,2);
  f.setCompletion(second);t.until(()=>f.calls.filter(c=>c.name==='linkProgram').length===3);
  assert.deepEqual(builds,[0,1,2]);assert.equal(owners[1].compile(f.gl,recipes[1]),second,'second program can finish while the first still waits');pending(()=>owners[0].compile(f.gl,recipes[0]));
  f.gl.complete=true;t.all();assert.equal(owners[0].compile(f.gl,recipes[0]),first);assert(owners[2].compile(f.gl,recipes[2]).program);
 }finally{for(const owner of owners)owner.dispose();t.restore();}
});

test('admission window: cancelled submitted work keeps its debt until completion and cannot publish the old view',()=>{
 const t=turns(),f=driver({parallel:true}),a=createProgramPreparationOwner('abandoned view',()=>{}),b=createProgramPreparationOwner('other in-flight',()=>{}),c=createProgramPreparationOwner('queued replacement',()=>{});f.gl.complete=false;let current=true;
 const builds=[],ra={...recipe('old','visible',()=>{builds.push('old');return{vertex:'old vertex',fragment:'old fragment',attributes:[]};}),current:()=>current},rb=recipe('other','visible',()=>{builds.push('other');return{vertex:'other vertex',fragment:'other fragment',attributes:[]};}),rc=recipe('replacement','visible',()=>{builds.push('replacement');return{vertex:'next vertex',fragment:'next fragment',attributes:[]};});
 try{
  pending(()=>a.compile(f.gl,ra));pending(()=>b.compile(f.gl,rb));pending(()=>c.compile(f.gl,rc));t.until(()=>f.calls.filter(call=>call.name==='linkProgram').length===2);
  const old=f.created.find(value=>value.program);current=false;a.cancel();for(let i=0;i<8;i++)t.one();
  assert.deepEqual(builds,['old','other'],'logical cancellation cannot admit replacement while both driver submissions are unfinished');assert.equal(f.deleted.filter(value=>value===old).length,0,'unfinished submission is retained as debt rather than declared deleted');assert.equal(a.stats.ready,0);assert.equal(a.stats.submitted,1);assert.equal(a.stats.retiring,1);assert.equal(a.stats.resumable,0,'whole private cancel removes the recipe lookup even while driver debt remains');assert.equal(a.stats.sourceRetainedCharacters,0);assert.equal(a.stats.context.submitted,2);assert.equal(a.stats.context.inFlight,2);assert.equal(a.stats.context.retiring,1);assert.equal(a.stats.context.queued,1);
  f.setCompletion(old);t.until(()=>f.calls.filter(call=>call.name==='linkProgram').length===3);assert.equal(f.deleted.filter(value=>value===old).length,1);assert.equal(a.stats.ready,0,'late completion never publishes the cancelled view');
  f.gl.complete=true;t.all();assert(b.compile(f.gl,rb).program);assert(c.compile(f.gl,rc).program);a.cancel();t.all();assert.equal(f.deleted.filter(value=>value===old).length,1,'terminal cleanup issues one deletion request');
 }finally{a.dispose();b.dispose();c.dispose();t.restore();}
});

test('admission window: whole private cancellation queues the same recipe afresh without losing its new demand',()=>{
 const t=turns(),f=driver({parallel:true}),a=createProgramPreparationOwner('private replacement',()=>{}),b=createProgramPreparationOwner('private peer',()=>{});f.gl.complete=false;let builds=0;
 const r=recipe('same-private','visible',()=>{builds++;return{vertex:'same private vertex',fragment:'same private fragment',attributes:[]};}),peer=recipe('private-peer');
 try{
  pending(()=>a.compile(f.gl,r));pending(()=>b.compile(f.gl,peer));t.until(()=>f.calls.filter(call=>call.name==='linkProgram').length===2);const [old,other]=f.created.filter(value=>value.program);a.cancel();
  assert.equal(a.stats.submitted,1);assert.equal(a.stats.retiring,1);assert.equal(a.stats.resumable,0,'whole cancel cannot resume an entry removed from the private recipe map');assert.equal(a.stats.context.submitted,2);
  pending(()=>a.compile(f.gl,r));for(let i=0;i<8;i++)t.one();assert.equal(builds,1,'identical new demand waits behind the old uncompleted debt');assert.equal(a.stats.pending,2,'the owner retains both abandoned driver debt and the queued new recipe');assert.equal(a.stats.resumable,0);assert.equal(a.stats.context.queued,1);assert.equal(a.stats.context.submitted,2);assert.equal(a.stats.context.retiring,1);assert.equal(f.deleted.filter(value=>value===old).length,0);
  f.setCompletion(old);t.until(()=>f.calls.filter(call=>call.name==='linkProgram').length===3);const fresh=f.calls.filter(call=>call.name==='linkProgram').at(-1).args[0];assert.notEqual(fresh,old);assert.equal(builds,2,'completion releases the old slot and actually constructs the retained new demand');assert.equal(a.stats.ready,0,'the late old result cannot satisfy the new recipe');assert.equal(f.deleted.filter(value=>value===old).length,1);assert.equal(a.stats.context.retiring,0);
  f.setCompletion(fresh);f.setCompletion(other);t.all();assert.equal(a.compile(f.gl,r),fresh);assert.equal(b.compile(f.gl,peer),other);a.releaseProgram(f.gl,fresh);b.releaseProgram(f.gl,other);a.cancel();t.all();for(const program of [old,fresh,other])assert.equal(f.deleted.filter(value=>value===program).length,1,'each terminal executable issues one cleanup request');assert.equal(a.stats.context.submitted,0);assert.equal(a.stats.context.queued,0);
 }finally{a.dispose();b.dispose();t.restore();}
});

test('admission window: an exact provenance subscriber can reclaim a linked abandoned execution before cleanup',()=>{
 const t=turns(),f=driver({parallel:true}),a=createProgramPreparationOwner('old scope',()=>{}),b=createProgramPreparationOwner('new scope',()=>{});f.gl.complete=false;let live=true,builds=0;
 const build=()=>{builds++;return{vertex:'immutable vertex',fragment:'immutable fragment',attributes:['a_position']};},authority=createProgramSourceAuthority({inputs:['exact assembly v1'],builders:[build]}),shared={...recipe('same','visible',build),sharedKey:'abandoned-exact',provenance:[authority]},old={...shared,current:()=>live},next={...shared,current:()=>true};
 try{
  pending(()=>a.compile(f.gl,old));t.until(()=>f.calls.some(call=>call.name==='linkProgram'));const program=f.created.find(value=>value.program);live=false;a.cancel();assert.equal(a.stats.context.submitted,1);assert.equal(a.stats.context.retiring,1);assert.equal(a.stats.submitted,0,'shared owner without a subscriber no longer owns the retiring record; context retains its debt');
  const submissions=f.calls.filter(call=>call.name==='compileShader'||call.name==='linkProgram').length;assert.equal(b.acquireReadyProgram(f.gl,next),undefined);assert.equal(b.stats.pending,0,'ready-only acquisition creates no subscriber demand');assert.equal(f.calls.filter(call=>call.name==='compileShader'||call.name==='linkProgram').length,submissions,'ready-only lookup cannot submit shader work');
  pending(()=>b.compile(f.gl,next));for(let i=0;i<8;i++)t.one();assert.equal(builds,1);assert.equal(f.created.filter(value=>value.program).length,1);assert.equal(program.deleted,false);assert.equal(b.stats.submitted,1);assert.equal(b.stats.sourceRetainedCharacters,0);assert.equal(b.stats.context.retiring,0,'exact linked resubscription resumes the pending execution');assert.equal(b.stats.context.submitted,1);
  f.setCompletion(program);t.all();assert.equal(b.compile(f.gl,next),program);assert.equal(a.stats.ready,0);assert.equal(b.stats.shared.heldReferences,1);b.releaseProgram(f.gl,program);assert.equal(f.deleted.filter(value=>value===program).length,1,'last real grant releases the executable; no permanent ready cache');
 }finally{a.dispose();b.dispose();t.restore();}
});

test('admission window: different provenance cannot borrow abandoned work and context loss invalidates all outstanding debt',()=>{
 const t=turns(),f=driver({parallel:true}),a=createProgramPreparationOwner('old authority',()=>{}),b=createProgramPreparationOwner('peer authority',()=>{}),c=createProgramPreparationOwner('new authority',()=>{});f.gl.complete=false;
 const builds=[],build=()=>{builds.push('original');return{vertex:'same bytes',fragment:'same bytes',attributes:[]};},otherBuild=()=>{builds.push('different');return{vertex:'same bytes',fragment:'same bytes',attributes:[]};},authority=createProgramSourceAuthority({inputs:['assembly'],builders:[build]}),different=createProgramSourceAuthority({inputs:['assembly'],builders:[build]}),shared={...recipe('same','visible',build),sharedKey:'provenance-debt',provenance:[authority]},other={...shared,provenance:[different],build:otherBuild};
 try{
  pending(()=>a.compile(f.gl,shared));pending(()=>b.compile(f.gl,recipe('peer')));t.until(()=>f.calls.filter(call=>call.name==='linkProgram').length===2);const stale=f.created.filter(value=>value.program);a.cancel();pending(()=>c.compile(f.gl,other));
  for(let i=0;i<8;i++)t.one();assert.deepEqual(builds,['original']);assert.equal(f.created.filter(value=>value.program).length,2,'same GLSL bytes do not bypass exact provenance or the debt limit');assert.equal(c.acquireReadyProgram(f.gl,other),undefined);
  const cutoff=f.calls.length;f.gl.lost=true;a.contextLost();b.contextLost();c.contextLost();t.all();assert.equal(f.calls.length,cutoff,'lost resources receive no further completion query or delete request');assert.equal(c.stats.ready,0);assert.equal(c.stats.context.pending,0);assert.equal(c.stats.context.submitted,0);assert.equal(c.stats.context.retiring,0);assert.equal(c.stats.sourceRetainedCharacters,0);
  f.gl.lost=false;f.gl.complete=true;pending(()=>c.compile(f.gl,other));t.all();const fresh=c.compile(f.gl,other);assert(!stale.includes(fresh));assert.deepEqual(builds,['original','different']);c.releaseProgram(f.gl,fresh);
 }finally{a.dispose();b.dispose();c.dispose();t.restore();}
});

test('admission window: an abandoned partial shader drains before the same exact recipe builds fresh source',()=>{
 const t=turns(),f=driver({parallel:true}),a=createProgramPreparationOwner('partial old',()=>{}),b=createProgramPreparationOwner('partial peer',()=>{}),c=createProgramPreparationOwner('partial successor',()=>{});f.gl.complete=false;
 const compile=f.gl.compileShader;let firstSubmission=true;f.gl.compileShader=(...args)=>{compile(...args);if(firstSubmission){firstSubmission=false;t.advance(4);}};
 const builds=[],build=()=>{builds.push('same');return{vertex:'partial vertex',fragment:'partial fragment',attributes:[]};},authority=createProgramSourceAuthority({inputs:['partial assembly'],builders:[build]}),r={...recipe('partial','visible',build),sharedKey:'partial-exact',provenance:[authority]},peer=recipe('peer','visible',()=>{builds.push('peer');return{vertex:'peer vertex',fragment:'peer fragment',attributes:[]};});
 try{
  pending(()=>a.compile(f.gl,r));pending(()=>b.compile(f.gl,peer));t.until(()=>f.calls.some(call=>call.name==='compileShader'));const shader=f.calls.find(call=>call.name==='compileShader').args[0];a.cancel();
  t.until(()=>f.calls.some(call=>call.name==='linkProgram'));assert.deepEqual(builds,['same','peer']);pending(()=>c.compile(f.gl,r));for(let i=0;i<8;i++)t.one();
  assert.equal(c.stats.context.submitted,2);assert.equal(c.stats.context.retiring,1);assert.equal(c.stats.resumable,0,'a partial submission with discarded source is not a reusable linked executable');assert.equal(c.stats.sourceRetainedCharacters,0);assert.deepEqual(builds,['same','peer']);assert.equal(f.deleted.filter(value=>value===shader).length,0);
  f.setCompletion(shader);t.until(()=>c.stats.context.retiring===0);assert.equal(f.deleted.filter(value=>value===shader).length,1);pending(()=>c.compile(f.gl,r));f.gl.complete=true;t.all();const program=c.compile(f.gl,r);assert(program.program);assert.deepEqual(builds,['same','peer','same']);assert.equal(a.stats.ready,0);c.releaseProgram(f.gl,program);b.releaseProgram(f.gl,b.compile(f.gl,peer));
 }finally{a.dispose();b.dispose();c.dispose();t.restore();}
});

test('admission window: no-KHR cancellation settles synchronously submitted debt without inventing KHR completion',()=>{
 const t=turns(),f=driver(),a=createProgramPreparationOwner('no KHR old',()=>{}),b=createProgramPreparationOwner('no KHR current',()=>{}),c=createProgramPreparationOwner('no KHR next',()=>{});
 const compile=f.gl.compileShader;let firstSubmission=true;f.gl.compileShader=(...args)=>{compile(...args);if(firstSubmission){firstSubmission=false;t.advance(4);}};
 try{
  pending(()=>a.compile(f.gl,recipe('no-KHR-old')));pending(()=>b.compile(f.gl,recipe('no-KHR-current')));pending(()=>c.compile(f.gl,recipe('no-KHR-next')));
  t.until(()=>f.calls.some(call=>call.name==='compileShader'));a.cancel();t.all();assert.equal(a.stats.ready,0);assert(b.compile(f.gl,recipe('no-KHR-current')).program);assert(c.compile(f.gl,recipe('no-KHR-next')).program);
  assert.equal(f.calls.filter(call=>(call.name==='getProgramParameter'||call.name==='getShaderParameter')&&call.args[1]===5).length,0,'no extension means no fabricated KHR polling');
 }finally{a.dispose();b.dispose();c.dispose();t.restore();}
});

test('context admission serializes CPU steps, gives visible priority, and bounds capture starvation',()=>{
 const t=turns();try{const f=driver(),order=[];const owners=Array.from({length:6},(_,i)=>createProgramPreparationOwner('provider '+i,()=>{}));
  for(const [i,owner]of owners.entries())pending(()=>owner.compile(f.gl,recipe(String(i),i===0?'capture':'visible',()=>{order.push(i);return{vertex:'v'+i,fragment:'f'+i,attributes:[]};})));
  assert.equal(owners[0].stats.context.maxInFlight,2);assert.equal(owners[0].stats.context.pending,6);t.all();assert.deepEqual(order.filter(value=>value!==0),[1,2,3,4,5]);assert(order.indexOf(0)>=3&&order.indexOf(0)<5,'capture gets bounded admission after main starts, while main demand still remains');assert.equal(owners[0].stats.context.pending,0);assert.equal(owners[0].stats.context.admitted,0);
  for(let i=0;i<owners.length;i++)owners[i].cancel();assert.equal(f.created.length,f.deleted.length);
 }finally{t.restore();}
});

test('owner cancellation releases partial/ready work, preserves other owners, and cannot publish stale resources',()=>{
 const t=turns();try{const f=driver(),a=createProgramPreparationOwner('a',()=>{}),b=createProgramPreparationOwner('b',()=>{}),r=recipe(),compile=f.gl.compileShader;let cancelled=false;f.gl.compileShader=(...args)=>{compile(...args);if(!cancelled){cancelled=true;a.cancel();}};pending(()=>a.compile(f.gl,r));pending(()=>b.compile(f.gl,r));t.all();assert.equal(a.stats.last.status,'cancelled');assert.equal(b.stats.last.status,'ready');const p=b.compile(f.gl,r);assert(!f.deleted.includes(p));pending(()=>a.compile(f.gl,r));t.all();a.cancel();assert(f.deleted.some(value=>value.program&&value!==p));}finally{t.restore();}
});

test('context loss invalidates every owner epoch and stops GPU calls; restoration builds fresh programs',()=>{
 const t=turns();try{const f=driver(),a=createProgramPreparationOwner('a',()=>{}),b=createProgramPreparationOwner('b',()=>{}),r=recipe(),compile=f.gl.compileShader;let before;f.gl.compileShader=(...args)=>{compile(...args);if(before===undefined){before=f.calls.length;f.gl.lost=true;}};pending(()=>a.compile(f.gl,r));pending(()=>b.compile(f.gl,r));t.all();assert.equal(f.calls.length,before);assert.equal(a.stats.last.status,'lost');assert.equal(b.stats.last.status,'lost');assert.equal(a.stats.context.epoch,1);assert.equal(a.stats.context.dispatch.turns,1,'loss ends the active turn before another queued source can start');a.contextLost();b.contextLost();assert.equal(a.stats.context.epoch,1);f.gl.lost=false;pending(()=>b.compile(f.gl,r));t.all();assert.equal(b.stats.last.status,'ready');assert.equal(b.stats.last.epoch,1);assert(b.compile(f.gl,r).program);}finally{t.restore();}
});

test('queued upload shares the context limit, rejects superseded revisions, and obeys cancellation',()=>{
 const t=turns();try{const f=driver(),owner=createProgramPreparationOwner('base',()=>{}),other=createProgramPreparationOwner('church',()=>{});let revision=1,uploaded=0;
  pending(()=>other.compile(f.gl,recipe()));assert.equal(owner.work(f.gl,{resource:'geometry-upload',revision:1,current:()=>revision===1,work(){uploaded=1;}}),false);
  revision=2;t.all();assert.equal(uploaded,0);assert.equal(owner.stats.last.status,'cancelled');
  const next={resource:'geometry-upload',revision:2,current:()=>revision===2,work(){uploaded=2;}};assert.equal(owner.work(f.gl,next),false);t.all();assert.equal(uploaded,2);assert.equal(owner.work(f.gl,next),true);
  owner.work(f.gl,{...next,revision:3,work(){uploaded=3;}});owner.cancel();t.all();assert.equal(uploaded,2);
 }finally{t.restore();}
});

test('material revision drift cancels source construction before any shader reaches the GPU',()=>{
 const t=turns();try{const f=driver(),owner=createProgramPreparationOwner('city',()=>{});let material=1,built=0;
  const r={...recipe(),current:()=>material===1,build(){built++;return{vertex:'v',fragment:'f',attributes:[]};}};
  pending(()=>owner.compile(f.gl,r));material=2;t.all();assert.equal(built,0);assert.equal(f.calls.length,0);assert.equal(owner.stats.last.status,'cancelled');
 }finally{t.restore();}
});

test('terminal publication work releases its ready record without another poll',()=>{
 const t=turns();try{const f=driver(),owner=createProgramPreparationOwner('published-geometry',()=>{});let current=true,published=0;
  assert.equal(owner.work(f.gl,{resource:'candidate-upload',revision:1,retainReady:false,current:()=>current,work(){published++;current=false;}}),false);
  t.all();assert.equal(published,1);assert.equal(owner.stats.pending,0);assert.equal(owner.stats.ready,0,'published candidates have no later caller to consume this record');assert.equal(owner.stats.last.status,'ready');assert.equal(owner.stats.context.pending,0);
  owner.cancel();t.all();assert.equal(published,1);
 }finally{t.restore();}
});

test('terminal publication work retains a failed result for its waiting caller',()=>{
 const t=turns();try{const f=driver(),owner=createProgramPreparationOwner('failed-geometry',()=>{}),work={resource:'candidate-upload',revision:1,retainReady:false,current:()=>true,work(){throw Error('candidate upload rejected');}};
  owner.work(f.gl,work);t.all();assert.equal(owner.stats.failed,1);assert.equal(owner.stats.ready,0);assert.throws(()=>owner.work(f.gl,work),error=>error instanceof ProgramPreparationFailure&&error.diagnostic.reason==='Error: candidate upload rejected');
  owner.cancel();assert.equal(owner.stats.failed,0);
 }finally{t.restore();}
});

test('another owner invalidating the shared epoch rejects ready unconsumed programs and uploads without deleting old GL objects',()=>{
 const t=turns();try{const f=driver(),a=createProgramPreparationOwner('a',()=>{}),b=createProgramPreparationOwner('b',()=>{}),r=recipe();
  pending(()=>a.compile(f.gl,r));pending(()=>b.compile(f.gl,r));const work={resource:'upload',revision:1,current:()=>true,work(){}};a.work(f.gl,work);t.all();assert.equal(a.stats.ready,2);
  const oldPrograms=f.created.filter(value=>value.program),deleted=f.deleted.length;b.contextLost();assert.equal(a.stats.context.epoch,1);assert.equal(f.deleted.length,deleted,'old-epoch ready programs must not be deleted');
  pending(()=>a.compile(f.gl,r),'lost');assert.equal(a.stats.last.status,'lost');assert.equal(a.work(f.gl,work),false);assert.equal(a.stats.last.status,'lost');assert.equal(f.deleted.length,deleted);
  pending(()=>a.compile(f.gl,r));t.all();assert(!oldPrograms.includes(a.compile(f.gl,r)));assert.equal(a.stats.last.epoch,1);
 }finally{t.restore();}
});

test('ready program and work recheck current identity at consumption and release only same-epoch obsolete programs',()=>{
 const t=turns();try{const f=driver(),owner=createProgramPreparationOwner('owner',()=>{});let current=true;const r={...recipe(),current:()=>current},work={resource:'upload',revision:1,current:()=>current,work(){}};
  pending(()=>owner.compile(f.gl,r));owner.work(f.gl,work);t.all();const p=f.created.find(value=>value.program);current=false;
  pending(()=>owner.compile(f.gl,r),'cancelled');assert(f.deleted.includes(p));assert.equal(owner.work(f.gl,work),false);assert.equal(owner.stats.last.status,'cancelled');assert.equal(owner.stats.ready,0);
 }finally{t.restore();}
});

test('a full unconsumed visible queue cannot deny required capture admission',()=>{
 const t=turns();try{const f=driver(),owner=createProgramPreparationOwner('owner',()=>{}),order=[];
  for(let i=0;i<64;i++)pending(()=>owner.compile(f.gl,recipe('visible:'+i)));
  const capture=recipe('required','capture',()=>{order.push('required');return{vertex:'v',fragment:'f',attributes:[]};});pending(()=>owner.compile(f.gl,capture));t.all();assert.deepEqual(order,['required']);assert(owner.compile(f.gl,capture).program);
 }finally{t.restore();}
});

for(const priority of [undefined,'visible','capture'])test(`recipe priority ${priority??'omitted'} applies to both program and work admission`,()=>{
 const t=turns();try{
  const f=driver(),owner=createProgramPreparationOwner('priority fixture',()=>{}),program={...recipe(),priority},work={resource:'upload',revision:1,priority,current:()=>true,work(){}};
  pending(()=>owner.compile(f.gl,program));assert.equal(owner.work(f.gl,work),false);
  assert.deepEqual(owner.stats.pendingResources.map(value=>value.priority),[priority??'visible',priority??'visible']);
  assert.equal(f.calls.length,0);t.all();assert.equal(owner.work(f.gl,work),true);owner.cancel();
 }finally{t.restore();}
});

test('work capture-to-visible promotion admits a required first-screen upload before capture-only work',()=>{
 const t=turns();try{
  const f=driver(),other=createProgramPreparationOwner('other capture',()=>{}),owner=createProgramPreparationOwner('visible upload',()=>{}),order=[];
  const background={resource:'capture-only',revision:1,priority:'capture',current:()=>true,work(){order.push('capture');}},upload={resource:'same-upload',revision:1,priority:'capture',current:()=>true,work(){order.push('visible');}};
  assert.equal(other.work(f.gl,background),false);assert.equal(owner.work(f.gl,upload),false);assert.equal(owner.work(f.gl,{...upload,priority:'visible'}),false);
  assert.equal(owner.stats.pendingResources[0].priority,'visible');t.all();assert.deepEqual(order,['visible','capture']);
  assert.equal(owner.work(f.gl,upload),true);assert.equal(other.work(f.gl,background),true);owner.dispose();other.dispose();
 }finally{t.restore();}
});

test('prune retires invalid queued private program and work once while valid owners and fresh demand continue',()=>{
 const t=turns();try{
  const f=driver();let current=true,builds=0,uploads=0,settled=0;
  const owner=createProgramPreparationOwner('stale queued',()=>settled++),peer=createProgramPreparationOwner('valid queued',()=>{}),r={...recipe('stale','visible',()=>{builds++;return{vertex:'v',fragment:'f',attributes:[]};}),current:()=>current};
  pending(()=>owner.compile(f.gl,r));owner.work(f.gl,{resource:'stale-upload',revision:1,current:()=>current,work(){uploads++;}});pending(()=>peer.compile(f.gl,recipe('peer')));
  current=false;owner.prune();assert.equal(owner.stats.pending,0);assert.equal(peer.stats.pending,1);assert.equal(settled,2);assert.equal(f.calls.length,0);
  owner.prune();assert.equal(settled,2);t.all();assert.equal(builds,0);assert.equal(uploads,0);assert.equal(peer.stats.last.status,'ready');
  current=true;pending(()=>owner.compile(f.gl,r));t.all();const fresh=owner.compile(f.gl,r);assert.equal(builds,1);f.gl.useProgram(fresh);owner.releaseProgram(f.gl,fresh);peer.cancel();
 }finally{t.restore();}
});

test('prune releases invalid linked-ready unconsumed program and work once, preserving renderer-held programs',()=>{
 const t=turns();try{
  const f=driver();let current=true,uploads=0,settled=0;const owner=createProgramPreparationOwner('unconsumed',()=>settled++),r={...recipe(),current:()=>current};
  pending(()=>owner.compile(f.gl,r));owner.work(f.gl,{resource:'unconsumed-upload',revision:1,current:()=>current,work(){uploads++;}});t.all();
  const unconsumed=f.created.find(value=>value.program);assert.equal(owner.stats.ready,2);assert.equal(settled,2);current=false;owner.prune();
  assert.equal(owner.stats.ready,0);assert.equal(owner.stats.pending,0);assert.equal(uploads,1);assert.equal(settled,4);assert.equal(f.deleted.filter(value=>value===unconsumed).length,1);
  owner.prune();assert.equal(settled,4);assert.equal(f.deleted.filter(value=>value===unconsumed).length,1);
  current=true;pending(()=>owner.compile(f.gl,r));t.all();const held=owner.compile(f.gl,r);assert.notEqual(held,unconsumed);current=false;owner.prune();assert.equal(held.deleted,false);f.gl.useProgram(held);owner.releaseProgram(f.gl,held);assert.equal(f.deleted.filter(value=>value===held).length,1);
 }finally{t.restore();}
});

test('prune removes one invalid shared subscriber before build without cancelling the valid subscriber',()=>{
 const t=turns();try{
  const f=driver(),a=createProgramPreparationOwner('stale shared',()=>{}),b=createProgramPreparationOwner('valid shared',()=>{});let current=true,aBuilds=0,bBuilds=0;
  const shared={...recipe(),sharedKey:'prune-shared-queued'},ra={...shared,current:()=>current,build(){aBuilds++;throw Error('invalid subscriber cannot build');}},rb={...shared,current:()=>true,build(){bBuilds++;return{vertex:'v',fragment:'f',attributes:[]};}};
  pending(()=>a.compile(f.gl,ra));pending(()=>b.compile(f.gl,rb));current=false;a.prune();a.prune();assert.equal(a.stats.pending,0);assert.equal(b.stats.pending,1);assert.equal(b.stats.context.pending,1);
  t.all();assert.equal(aBuilds,0);assert.equal(bBuilds,1);const program=b.compile(f.gl,rb);b.releaseProgram(f.gl,program);assert.equal(f.deleted.filter(value=>value===program).length,1);a.dispose();b.dispose();
 }finally{t.restore();}
});

test('prune retains shared ready guards until consumption and preserves valid subscribers and held grants',()=>{
 const t=turns();try{
  const f=driver(),a=createProgramPreparationOwner('ready stale',()=>{}),b=createProgramPreparationOwner('ready valid',()=>{});let aCurrent=true,bCurrent=true;
  const shared={...recipe(),sharedKey:'prune-shared-ready'},ra={...shared,current:()=>aCurrent},rb={...shared,current:()=>bCurrent};
  pending(()=>a.compile(f.gl,ra));pending(()=>b.compile(f.gl,rb));t.all();const linked=f.created.find(value=>value.program);assert.equal(a.stats.ready,1);assert.equal(b.stats.ready,1);
  aCurrent=false;a.prune();b.prune();assert.equal(a.stats.ready,0);assert.equal(b.stats.ready,1);assert.equal(linked.deleted,false);
  const held=b.compile(f.gl,rb);assert.equal(held,linked);bCurrent=false;b.prune();assert.equal(b.stats.shared.heldReferences,1);f.gl.useProgram(held);b.releaseProgram(f.gl,held);assert.equal(f.deleted.filter(value=>value===linked).length,1,'invalid unconsumed subscriber must not pin the released program');
  aCurrent=true;pending(()=>a.compile(f.gl,ra));t.all();const fresh=a.compile(f.gl,ra);assert.notEqual(fresh,linked);a.releaseProgram(f.gl,fresh);a.dispose();b.dispose();
 }finally{t.restore();}
});

for(const shared of [false,true])test(`prune drops old-epoch ${shared?'shared':'private'} ready work without deleting stale GL objects and permits fresh demand`,()=>{
 const t=turns();try{
  const f=driver(),owner=createProgramPreparationOwner('epoch owner',()=>{}),invalidator=createProgramPreparationOwner('epoch invalidator',()=>{}),r={...recipe(),current:()=>true,...(shared?{sharedKey:'epoch-shared'}:{})};
  pending(()=>owner.compile(f.gl,r));t.all();const old=f.created.find(value=>value.program);assert.equal(old.deleted,false);
  invalidator.work(f.gl,{resource:'bind-context',revision:1,current:()=>true,work(){assert.fail('lost epoch upload');}});invalidator.contextLost();f.invalidateResources();const before=f.calls.length;
  owner.prune();owner.prune();assert.equal(owner.stats.ready,0);assert.equal(owner.stats.pending,0);assert.equal(f.calls.length,before);assert.equal(old.deleted,false);
  pending(()=>owner.compile(f.gl,r));t.all();const fresh=owner.compile(f.gl,r);assert.notEqual(fresh,old);f.gl.useProgram(fresh);owner.releaseProgram(f.gl,fresh);owner.dispose();invalidator.dispose();
 }finally{t.restore();}
});

// Reuse the existing reflection fixture's domain seams and current selectors.
// Only this renderer block changes; the core owner/scheduler cases stay intact.
// The shared reflection setup (support/f3-reflection-bridge.mjs), with the two
// production modules this block also reads and the pure renderer imports the
// current closures need joining the same page-like bundle; city colour
// recipes additionally take their actual material/hook builders.
const {loadReflectionBridge,F3_RUNTIME_MODULES,F3_RENDERER_IMPORTS}=await import(new URL('./support/f3-reflection-bridge.mjs',import.meta.url).href);
// The renderer block runs the actual chunk upload path (Tier300 chunk mesh
// views, church/delegated packed chunks): those pure chunk helpers join the same
// bundle, and the block allocates on the shared scene's own page store through
// the bundle's geometry runtime (sceneRuntime), so borrowed-buffer parents are
// that store's live leases (support/f6prog-upload-chunks.mjs).
const rendererBindings=await loadReflectionBridge({exports:['fixture','productionHelpers','installFixtureGrantHandoff','sceneRuntime','evaluate','binding'],sourceURL:'program-preparation-renderer-fixture.mjs',
 runtimeModules:[...F3_RUNTIME_MODULES,'src/safety/facade-rathaus-proxy-mask.ts','src/safety/scene-solar-light.ts'],
 rendererImports:[...F3_RENDERER_IMPORTS,'resourceContentKey','resolveDelegatedSourceContext','isSourceOnlyGlassRoof','cityDresdenMaterial','createCityMaterialBuilder','applyCityShaderHooks','createCityProgramSourceOwner','acquirePackedMeshChunk','worldRayInMeshChunk','acquireChunkMeshState','allocateChunkMeshView','chunkMeshViewKey','rendererChunkGroups','coalesceRendererChunkGroups','rendererChunkPublicationCohorts','acquirePackedChunk','adoptPackedChunkRoles','packChunkGeometry','packedChunkContentKey','retainChunkBindings','selectedChunkGroups','validateChunkCohorts','writeRendererSelection','admitCityMaterialPreflight','checkedCityProgramBudget','cityColourSourceRecipe','cityWhiteSourceRecipe','describeCityMaterialBounds','describeCityShaderHooks','isCityShaderBoundViolation','isCityShaderBudgetUnfit','CITY_DRESDEN_SOURCE_FEATURES','cityDresdenSourceFeatures','isFacadeLandmark','createIndexedPickBlocks70'],
 patch:(setup,replace)=>replace(setup,'async function preparedDelegatedDataPlan(text,values){','async function preparedDelegatedDataPlan(text,values){\n values.invalidateMainFrame=await evaluate(binding(text,\'invalidateMainFrame\'),values);','delegated main-frame invalidation')});
const rendererCurrentPaint=await rendererBindings.productionHelpers('src/painted/delegated500/safety/current-paint-program.ts');
const rendererMasks=await rendererBindings.productionHelpers('src/safety/facade-rathaus-proxy-mask.ts');
const rendererSolar=await rendererBindings.productionHelpers('src/safety/scene-solar-light.ts');
const rendererCore=productionCore;
const {installUploadableChunks}=await import(new URL('./support/f6prog-upload-chunks.mjs',import.meta.url).href);
const {installChurchColourDependencies}=await import(new URL('./support/f5prog-renderer-deps.mjs',import.meta.url).href);
const {installDelegatedColourDependencies,loadDelegatedShaderBudget}=await import(new URL('./support/f5prog-delegated-colour.mjs',import.meta.url).href);
// The delegated wrapper table applies per-building Berlin paint fragments; the
// actual fragment functions come from their own modules
// (support/f6prog-delegated-fragments.mjs, frozen paint tables not loaded).
const {loadDelegatedPaintFragments}=await import(new URL('./support/f6prog-delegated-fragments.mjs',import.meta.url).href);
const rendererShaderBudget=await rendererBindings.productionHelpers('src/safety/render-runtime/shader-source-budget.ts');
function astNodes(source){const ast=ts.createSourceFile('renderer.ts',source,ts.ScriptTarget.Latest,true),nodes={};function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer&&(ts.isArrowFunction(node.initializer)||ts.isFunctionExpression(node.initializer)||node.name.text==='residentMainPrograms'))nodes[node.name.text]=node.initializer.getText(ast);if(ts.isFunctionDeclaration(node)&&node.name)nodes[node.name.text]=node.getText(ast);ts.forEachChild(node,visit);}visit(ast);return nodes;}
async function evaluate(source,env){assert.equal(typeof source,'string','actual renderer binding exists');const js=await transform('('+source+')',{loader:'ts',target:'es2022'});return Function('env','with(env){return '+js.code+'}')(env);}
async function installActualPreparationClosures(nodes,values,env,roots){
 const controlled=new Set(['fragment','familyFragmentSource','specializeCurrentPaintFragment','withResidentReflectionClip','syncFacadeResources','ensureTexturedProgram','ensureDiffuseProgram','uploadShadow','finishResidentUpload','paintSelection','retireUnloadedBirths','clearFamilyPrograms','releaseGPU','materialSourceBuilder','legacyPartitionFragment','c311VertexShader','c312VertexShader','c313VertexShader','c298VertexShader','cbtVertexShader','c018VertexShader','c311FragmentShader','c312FragmentShader','c313FragmentShader','c298FragmentShader','cbtFragmentShader','c018FragmentShader','c311MaterialFragment','c312MaterialFragment','c313MaterialFragment','c318MaterialFragment']);
 const done=new Set();async function bind(name){
  if(done.has(name)||controlled.has(name)||!nodes[name])return;done.add(name);
  const tree=ts.createSourceFile(name+'.ts','('+nodes[name]+')',ts.ScriptTarget.Latest,true),deps=new Set();
  function visit(node){if(ts.isIdentifier(node)&&nodes[node.text]&&node.text!==name&&!(ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node))deps.add(node.text);ts.forEachChild(node,visit);}visit(tree);
  for(const dependency of deps)await bind(dependency);values[name]=await evaluate(nodes[name],env);
 }
 for(const name of roots)await bind(name);
}
function declarationInitializer(source,name){const tree=ts.createSourceFile('renderer.ts',source,ts.ScriptTarget.Latest,true);let found;(function visit(node){if(!found&&ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name)found=node;else if(!found)ts.forEachChild(node,visit);})(tree);assert(found?.initializer,'actual renderer declaration '+name);return found.initializer.getText(tree);}
// City packs per-component rows (component, local box, index and vertex
// range) and its local family runs into each chunk record; the fixture's rows
// are its loaded components over the fixture's own three vertices, and its
// runs the fixture family runs (support/f6prog-upload-chunks.mjs packedRecord).
// City chunk material metadata carries one record per owner display sidecar;
// the fixture has no owner sidecar, so each missing record is its empty or
// inactive value (Stats arrays, Surfaces maps, inactive diagnostics, disabled
// displays); records the fixture does define keep their value.
const CITY_EMPTY_METADATA=name=>/Surfaces$/.test(name)?new Map():/Stats$/.test(name)?[]:/Diagnostic$/.test(name)?{active:false}:/Display$/.test(name)?{enabled:false}:undefined;
// Its per-chunk shader sidecars (one per owner hook, sized per fixture vertex)
// are the fixture's empty, inactive sidecar data.
function citySidecars(vertexCount){const n=vertexCount;return{c311:new Float32Array(n*3),c312:new Float32Array(n*4),c313:new Float32Array(n*4),cbt:new Float32Array(n*3),c298:new Float32Array(n*3),c018:new Float32Array(n*3)};}
function cityChunkMetadata(chunk,vertexCount){const material=chunk.material?.value;if(material&&!Object.keys(material.sidecars??{}).length)material.sidecars=citySidecars(vertexCount);if(!material?.metadata||material.metadata.f6progCityDefaults)return;const source=material.metadata,cache=new Map();material.metadata=new Proxy(source,{get(target,name){if(name==='f6progCityDefaults')return true;const value=Reflect.get(target,name);if(value!==undefined||typeof name!=='string')return value;if(!cache.has(name))cache.set(name,CITY_EMPTY_METADATA(name));return cache.get(name);}});}
// City chunk materials carry the mask CPU recipe each cloned candidate chunk
// binds (maskRecipe.createBinding()): the production recipe of a configured
// mask owner over the fixture paint, released at cleanup.
function cityMaskRecipe(chunk,values,recipes){const material=chunk.material?.value;if(!material||recipes.has(material))return;const masks=rendererMasks.createRathausProxyMasks();masks.configure([],values.paintData);const recipe=masks.cpuRecipe();masks.destroy();recipes.set(material,recipe);material.maskRecipe=recipe;}
function cityPackedRecord(values,recipes){return chunk=>{
 // Capture-only fixture rows now also pass through the production visible
 // material classifier. They are ordinary synthetic buildings with no tags.
 for(const component of chunk.loaded.values()){component.city??=values.city;component.sourceFeature??={properties:{}};}
 cityChunkMetadata(chunk,values.vertices.length/9);cityMaskRecipe(chunk,values,recipes);
 return{styles:[],rows:[...chunk.loaded.values()].map(component=>({component,box:[...component.box],start:component.start,end:component.end,firstVertex:0,lastVertex:values.vertices.length/9-1,progressivePainted:false})),runs:values.familyRuns.map(run=>({...run}))};
};}
async function rendererFixture(provider){
 const reflected=await rendererBindings.fixture(provider),source=reflected.text,nodes=astNodes(source),f=driver();let buffers=0,releases=0,geometryUploads=0;
 // Keep one viewport surface for the fixture's lifetime: City caches visible
 // runs against the canvas backing dimensions as well as the projection.
 const canvas={width:512,height:512,clientWidth:512,clientHeight:512};
 const allocated=new Set();Object.assign(f.gl,{NO_ERROR:0,ARRAY_BUFFER:31,ELEMENT_ARRAY_BUFFER:32,ARRAY_BUFFER_BINDING:33,VERTEX_ARRAY_BINDING:34,STATIC_DRAW:35,DYNAMIC_DRAW:36,FLOAT:37,
  createVertexArray:()=>({vao:true}),createBuffer:()=>{const buffer={buffer:++buffers};allocated.add(buffer);return buffer;},deleteBuffer:buffer=>allocated.delete(buffer),deleteVertexArray(){},getError:()=>0,getParameter:()=>null,bindVertexArray(){},bindBuffer(){},bufferData(){geometryUploads++;},bufferSubData(){},getAttribLocation:()=>0,enableVertexAttribArray(){},vertexAttribPointer(){},INVALID_INDEX:0xffffffff,getUniformBlockIndex:()=>0xffffffff});
 // Geometry owners of the bundle runtime on the shared scene's page store.
 const geometryRuntime=rendererBindings.sceneRuntime.residentGeometry,owner=role=>geometryRuntime.createResidentGeometryOwner({store:reflected.store,owner:provider+' program-preparation '+role});
 const mainGeometry=owner('main'),staticGeometry=owner('static'),shadowGeometry=owner('shadow'),values=reflected.values;
 // The driver context belongs to that same page store (one store per context,
 // as getChunkResourceStoreForContext resolves it for source budgets).
 (await rendererBindings.productionHelpers('src/safety/render-runtime/chunk-resource-store.ts')).bindChunkResourceContext(f.gl,reflected.store);
 Object.assign(values,{...rendererCurrentPaint,gl:f.gl,program:undefined,vao:undefined,vertexBuffer:undefined,indexBuffer:undefined,stateBuffer:undefined,paintBuffer:undefined,progressiveBuffer:undefined,city:'berlin',generation:8,gpuGeneration:2,
  baseSurfaceFragment:'base helper',surfaceFragment:undefined,cityPaintFragment:'city paint',familySurfaceHelper:'base helper',VERTEX:'original vertex',queueOnlyProgram:false,HAMBURG_WHITE_VERTEX:'white vertex',HAMBURG_WHITE_FRAGMENT:'white fragment',
  c311ShaderActive:false,c312ShaderActive:false,c313ShaderActive:false,c318MaterialActive:false,whiteModeEligible:false,activeWhite:false,geometryPairs:new Map(),paintMode:()=>2,
  programPreparation:createProgramPreparationOwner(provider+' berlin',()=>{}),isProgramPreparationPending,ProgramPreparationPending:rendererCore.ProgramPreparationPending,
  lastFragmentCharacters:0,solarDepthSourceCharacters:0,withResidentReflectionClip:x=>'clip '+x,familyFragmentSource:(_helper,family)=>'family '+family,fragment:()=> 'original fragment',specializeCurrentPaintFragment:x=>x,
  currentFamilyPrograms:provider==='delegated500',berlinCurrent:provider==='delegated500',currentInitialFragmentBytes:0,lastFamilyFragmentCharacters:0,currentLastFragmentBytes:0,diagnostic557:false,
  mainWorldMatrix:new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),mainWorldProjection:new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),mainWorldProjectionRevision:1,mainFrame:1,candidateFailureGeneration:undefined,materialRecipeRevision:1,materialSourceWorkRevision:1,materialSourceSettled:true,materialSourceFailure:undefined,materialSourceBuilder:()=> 'city paint',geometryCompilationCandidate:undefined,pendingGeometryCandidate:undefined,pendingGeometry:undefined,pendingMaterialBatches:undefined,
  geometryOwner:mainGeometry,residentGeometry:mainGeometry,staticGeometryOwner:staticGeometry,shadowGeometryOwner:shadowGeometry,shadowGeometry,geometryUploadRevision:0,geometryPublishedRevision:0,geometryUploadPending:false,geometryResidentUploaded:false,
  shadowGeometryRevision:0,shadowGeometrySource:undefined,shadowUploadRevision:0,shadowUploadPlan:undefined,shadowUploadedIndexCount:0,shadowResidentIndexCount:0,shadowIndices:new Uint32Array(),shadowMask:{release(){}},shadowProgram:undefined,shadowVao:undefined,shadowIndexBuffer:undefined,
  vertices:new Float32Array(27),stateData:new Float32Array(3),paintData:new Float32Array(15),progressiveData:new Float32Array(12),indices:new Uint32Array([0,1,2]),cbtData:new Float32Array(),c018Data:new Float32Array(),c298Data:new Float32Array(),c311Data:new Float32Array(),c312Data:new Float32Array(),c313Data:new Float32Array(),pickBlocks70:{typedBytes:0},
  selectedIdentity:undefined,selectionActive:false,enabled:true,destroyed:false,pageHidden:false,gpuPreflightRequired:false,needsBirth:false,birth:new Map(),landmarkVisible:false,sourceLoaded:new Map((values.preparedDataFixture?.components??[]).map(component=>[component.objectId+'|'+component.partId,component])),progressiveRenderRecords:[],progressiveRenderSnapshot:[],progressiveStatusSnapshot:[],
  familyPrograms:new Map(),familyFailures:new Map(),captureFamilyFailures:new Map(),partitionPrograms:new Map(),partitionFailures:new Map(),familyCompilations:0,programMaterialFragment:1,programHookSignature:undefined,
  unsupportedQueueComponents:new Set(),fullColourProgramKey:'full-colour',fullColourFailure:undefined,fullColourRevision:0,fullColourSourceCharacters:0,fullProgramUpgradePending:false,
  BERLIN_FULL_CURRENT_CAPTURE_KEY:'berlin-full-current',programOwnerIdentity:'fixture-'+provider,solarDepthRevision:0,solarDepthHelper:'base helper',casterFailures:new Map(),casterPreparedSources:new Map(),casterAnalysisPending:new Set(),casterBase:new Map(),casterFamily0:undefined,
  sceneEnvironment:{sunlight:true,shadows:true},sceneSun:{shadowVector:[1,1]},opacityContext:'normal',opacity:1,
  syncFacadeResources(){},ensureTexturedProgram(){},ensureDiffuseProgram(){},uploadShadow(){},finishResidentUpload(){},paintSelection(){},retireUnloadedBirths(){},clearFamilyPrograms(){},map:{getCanvas:()=>canvas,triggerRepaint(){}},
  releaseGPU(){releases++;values.programPreparation.cancel();mainGeometry.release();},c311MaterialFragment:x=>x,c312MaterialFragment:x=>x,c313MaterialFragment:x=>x,c318MaterialFragment:x=>x,gpuInitializationPrepared:false,
  residentGPU:{beforeUpload:()=>true,published(){},isEmptyReady:()=>false},
 });
 if(provider==='city'||provider==='tier300'){
  const instant='2026-06-21T12:00:00Z';Object.assign(values,{sceneSunOrigin:[0,0],sceneSunInstant:instant,sceneSolarLight:rendererSolar.sceneSolarLight,sceneEnvironment:{...values.sceneEnvironment,instantISO:instant},sceneSun:rendererSolar.sceneSolarLight(0,0,instant)});values.dataPublicationRevision??=0;
 }
 if(provider==='city'||provider==='tier300')Object.assign(values,{residentMaterialStyles:[],publishedDiffuseNeeds:{plaster:false,brick:false},publishedLandmark:false});
 // City's chunk rows cover the fixture's two loaded components (indices 0..12)
 // over its three vertices; the index data matches that range.
 if(provider==='city')values.indices=new Uint32Array([0,1,2,0,2,1,0,1,2,0,2,1]);
 if(provider==='tier300')Object.assign(values,{mainGPUIncarnation:0,mainDrawWitness:undefined,mainRenderFrame:0,pendingMainFrame:false,pendingEmptyMainFrame:false,emptyMainDrawWitness:undefined});
 if(provider==='delegated500')Object.assign(values,{mainGPUIncarnation:0,residentMainMasksReady:false,mainFrameWitness:undefined,pendingMainFrame:undefined,residentTextureStyles:[]});
 values.rathausProxyMasks=rendererMasks.createRathausProxyMasks();values.rathausProxyMasks.configure([],values.paintData);
 // Uploadable resident chunks on the shared scene's store (the fixture's own
 // typed arrays; base state is the fixture state data), each with its own
 // configured mask owner like the renderer-level one above.
 const cityRecipes=new Map(),uploads=installUploadableChunks(values,reflected.store,{vertices:values.vertices,paint:values.paintData,progressive:values.progressiveData,baseState:values.stateData},{packedRecord:provider==='city'?cityPackedRecord(values,cityRecipes):undefined,createMasks:()=>{const masks=rendererMasks.createRathausProxyMasks();masks.configure([],values.paintData);return masks;}});
 // Church colour dependencies (its prepared-source workspace over the main
 // owner's store budget, model paint text with its production-measured bound,
 // grant handoff and immutable colour authority), and its per-renderer chunk
 // state owner identity (module counter in the renderer).
 if(provider==='church'){await installChurchColourDependencies({evaluate:rendererBindings.evaluate,binding:rendererBindings.binding,productionHelpers:rendererBindings.productionHelpers},{values,text:reflected.text,provider});values.chunkStateOwner??=1;}
 // Delegated colour-recipe dependencies (support/f5prog-delegated-colour.mjs)
 // and the facade paint bound of the fixture's own city paint text, measured
 // by the production shader-source budget.
 if(provider==='delegated500'){const budget=await loadDelegatedShaderBudget({evaluate:rendererBindings.evaluate,productionHelpers:rendererBindings.productionHelpers},{fragments:await loadDelegatedPaintFragments()});for(const [name,value]of Object.entries(budget))if(values[name]===undefined)values[name]=value;await installDelegatedColourDependencies({evaluate:rendererBindings.evaluate,binding:rendererBindings.binding,productionHelpers:rendererBindings.productionHelpers},{values,text:reflected.text,provider});values.describeFacadePaintSourceBounds=()=>rendererShaderBudget.shaderSourceBounds(rendererShaderBudget.shaderSourceParts`${values.cityPaintFragment}`);}
 if(provider==='base')values.vertices=new Float32Array(30);
 if(provider==='delegated500'||provider==='tier300')values.fragment=()=> '#version 300 es\nprecision highp float;\nout vec4 outColor;\nvec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}\nvoid main(){outColor=vec4(paintedFacade(vec3(1.),vec3(0.),vec3(0.),vec4(0.),0.),1.);}';
 for(const name of ['c312VertexShader','c313VertexShader','c311VertexShader','c298VertexShader','cbtVertexShader','c018VertexShader','c312FragmentShader','c313FragmentShader','c311FragmentShader','c298FragmentShader','cbtFragmentShader','c018FragmentShader'])values[name]=x=>x;
 for(const name of ['c311VertexShader','c312VertexShader','c311FragmentShader','c312FragmentShader'])values['cityData_'+name]=values[name];
 const env=new Proxy(values,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
 // These constructed constants name the actual geometry owner; the shared
 // fixture only initializes functions and plain literals automatically.
 // Length-prefixed chunk keys require the same complete owner string as the
 // renderer, rather than JSON's former silent undefined-to-null conversion.
 const stateOwnerName={city:'cityStateOwner',tier300:'tierStateOwner'}[provider];
 if(stateOwnerName){values[stateOwnerName]=await evaluate(declarationInitializer(source,stateOwnerName),env);assert.equal(typeof values[stateOwnerName],'string','actual renderer state owner is initialized from its geometry scene');}
 for(const name of ['hookSignature','materialProgramsCurrent','familyProgramNeeded','residentFamilyProgramKeys','solarFamilyProgramsNeeded','prepareMaterialSource','compileGeometryRecipe','compileGeometryProgram','capturePackedState','restorePackedState','publishPackedGeometry','snapshotMaterial','restoreMaterial','snapshotPackedResident','restorePackedResident','publishPackedResident','snapshotResident','withGeometryCandidate','queueGeometryCandidate','clearResidentRollback','disposeGeometryCandidate','rollbackResidentUpload','discardPendingGeometry','discardGeometryCandidate','writeSelectionState','updateSelectionData','uploadPreparedGeometry','prepareGeometryUpload','familyProgram','prepareCapturePrograms','prepareSolarPrograms','captureProgramKeys','ensureC311ShadowProgram','clearShadowGeometry','releaseShadowGPU','gpuReady','programReady'])if(nodes[name])values[name]=await evaluate(nodes[name],env);
 await rendererBindings.installFixtureGrantHandoff(provider,source,values);
 // Church now hands program grants to its successor generation as well; its
 // actual handoff owner is constructed like the delegated one above.
 if(provider==='church'){values.grantHandoffGeneration=undefined;values.programGrantHandoff??=await evaluate(declarationInitializer(source,'programGrantHandoff'),env);}
 // Delegated source-budget gates are actual factory constants over one wake
 // signal; build them from the renderer's own initializers.
 // The gate factory is a small pure function of delegated-shader-budget.ts
 // (whose wrapper tables reach frozen city data and are not bundled here).
 if(provider==='delegated500'){const budgetSource=await readFile(new URL('../src/painted/delegated500/safety/delegated-shader-budget.ts',import.meta.url),'utf8');values.createDelegatedSourceBudgetGate=await evaluate(astNodes(budgetSource).createDelegatedSourceBudgetGate.replace(/^export\s+/,''),{});values.sourceBudgetWake=new AbortController();for(const name of ['materialSourceGate','batchSourceGate','casterSourceGate'])values[name]=await evaluate(declarationInitializer(source,name),env);}
 await installActualPreparationClosures(nodes,values,env,['colourProgramRecipe','colourProgramHasConsumer','selectColourProgramConsumer','selectGeometryConsumer','selectGeometryPlan','mainPaintDemandFor','prepareMaterialSource','initializeResidentGPU','upload','prepareGeometryUpload','uploadPreparedGeometry','refreshMaterialPrograms','prepareCapturePrograms','prepareCaptureMaterial','prepareSolarPrograms','clearShadowGeometry','releaseShadowGPU','residentCaptureAdapter','prepareShadowUpload']);
 const authorityName={church:'churchColourSourceAuthority',tier300:'tierProgramSourceAuthority',city:'cityProgramSourceAuthority',delegated500:'delegatedColourSourceAuthority'}[provider];
 if(provider==='delegated500')values.delegated500ScopedFunctionArities=new Map([[values.materialSourceBuilder,0],[values.fragment,0]]);
 const authorityTree=ts.createSourceFile('renderer.ts',source,ts.ScriptTarget.Latest,true),authority=authorityTree.statements.filter(ts.isVariableStatement).flatMap(statement=>[...statement.declarationList.declarations]).find(declaration=>declaration.name.getText(authorityTree)===authorityName);assert(authority?.initializer,'actual immutable module source authority exists');values[authorityName]=await evaluate(authority.initializer.getText(authorityTree),env);
 // City's material source builder is a CityMaterialBuilder (hook stages, key,
 // bounds): its own declared initial builder over the fixture base paint.
 if(provider==='city')values.materialSourceBuilder=await evaluate(declarationInitializer(source,'materialSourceBuilder'),env);
 // City's facade-module base paint (cityData_baseFacadePaintFragmentForCity:
 // the facade module reaches frozen city tables the fixture never loads) is the
 // fixture's model city paint text, and its bound the production-measured
 // bound of that same text, as the shared setup binds root500/infill/Bremen
 // plan bounds; the renderer's own Dresden wrapper and hooks apply on top.
 if(provider==='city'){values.cityData_baseFacadePaintFragmentForCity??=(requested,scope)=>{assert.equal(requested,values.city);assert(scope,'city base paint is read in a data scope');return values.cityPaintFragment;};values.cityData_describeFacadePaintSourceBounds??=(requested,sourceKey,scope)=>{assert.equal(requested,values.city);assert.equal(sourceKey,undefined,'city bounds its base facade paint only');assert(scope);return rendererShaderBudget.shaderSourceBounds(rendererShaderBudget.shaderSourceParts`${values.cityPaintFragment}`);};values.baseFacadePaintFragmentForCity=await evaluate(declarationInitializer(source,'baseFacadePaintFragmentForCity'),env);}
 // City's hook tables (over the fixture's controlled hook shaders) and its
 // per-city colour attribute list, from their own declarations.
 if(provider==='city')for(const name of ['cityVertexHooks','cityFragmentHooks','cityProgramAttributes'])values[name]??=await evaluate(declarationInitializer(source,name),env);
 if(nodes.hookSignature)values.programHookSignature=values.hookSignature();
 if(nodes.upload&&provider!=='base')values.upload=await evaluate(nodes.upload,env);else values.upload=()=>{};
 const initialize=await evaluate(nodes.initializeResidentGPU,env);
 const diagnostic=()=>{const stats=values.programPreparation.stats,short=value=>value==null?null:String(value).slice(0,384),candidate=values.pendingGeometryCandidate??values.pendingGeometry??values.pendingData;return JSON.stringify({provider,generation:values.generation,viewRevision:values.viewRevision,publicationRevision:values.dataPublicationRevision,residentPlanId:values.residentData?.plan?.id??values.residentDataPlan?.id??null,candidatePlanId:candidate?.plan?.id??candidate?.dataPlan?.id??null,candidateGeneration:candidate?.targetGeneration??candidate?.state?.generation??null,program:!!values.program,vao:!!values.vao,geometryPending:values.geometryUploadPending,geometryFailure:short(values.geometryUploadFailure??values.geometryFailure??values.geometryPostPublishFailure),candidateFailure:short(values.candidateFailure),materialSourceSettled:values.materialSourceSettled,materialSourceFailure:short(values.materialSourceFailure),preparation:{pending:stats.pending,ready:stats.ready,failed:stats.failed,submitted:stats.submitted,retiring:stats.retiring,last:{status:stats.last?.status,phase:stats.last?.phase,reason:short(stats.last?.reason)},context:stats.context,pendingResources:stats.pendingResources.slice(0,8).map(row=>({resource:row.resource,phase:row.phase,submitted:row.submitted,retiring:row.retiring})),failures:stats.failures.slice(0,4).map(row=>({resource:row.resource,phase:row.phase,reason:short(row.reason)}))}});};
 // City and delegated500 keep no renderer-level VAO: each resident chunk binds
 // its own geometry lease, and gpuReady() says every published chunk has one
 // on this context. Church/Tier300 still publish their first chunk's VAO.
 const chunkedMesh=provider==='city'||provider==='delegated500',meshReady=()=>chunkedMesh?values.gpuReady():!!values.vao;
 const pump=(work,t,ready)=>{for(let i=0;i<20;i++){work();t.all();if(values.program&&meshReady()&&values.geometryUploadPending)values.prepareGeometryUpload();if(ready())return;}assert.fail('bounded actual renderer preparation did not settle: '+diagnostic());};
 const warm=t=>pump(()=>{if(!values.program||!meshReady())initialize(f.gl,true);else values.prepareGeometryUpload?.();},t,()=>!!values.program&&meshReady()&&!values.geometryUploadPending);
 return{...f,values,uploads,source,nodes,env,initialize,pump,warm,diagnostic,buffers:()=>buffers,geometryUploads:()=>geometryUploads,releases:()=>releases,cleanup(){values.programPreparation.dispose();mainGeometry.release();staticGeometry.release();shadowGeometry.release();uploads.release();for(const recipe of cityRecipes.values())recipe.release();values.preparedDataFixture?.release();}};
}
for(const provider of ['church','tier300','city','delegated500'])test(`${provider} actual initialization resumes queued shader work without allocating/publishing early or clearing the request`,async()=>{
 const f=await rendererFixture(provider),t=turns();try{
  f.initialize(f.gl,true);assert.equal(f.buffers(),0);assert.equal(f.values.program,undefined);assert.equal(f.releases(),0);assert.equal(f.values.programPreparation.stats.pending,1,f.diagnostic());
  f.warm(t);assert(f.values.program.program);assert(f.buffers()>0);assert.equal(f.releases(),0);assert.equal(f.calls.filter(c=>c.name==='linkProgram').length,1);assert(f.source.includes('if(!gpuReady())residentGPU!.attach(gl)'));
 }finally{f.cleanup();t.restore();}
});
for(const provider of ['church','tier300','city','delegated500'])test(`${provider} actual upload path queues the latest revision and capture rejects unfilled buffers`,async()=>{
 const f=await rendererFixture(provider),t=turns();try{
  if(provider==='city'){
   assert.equal(f.values.program,undefined);assert.equal(f.values.vao,undefined);assert.equal(f.values.geometryOwner.current,undefined);assert.equal(f.values.gpuReady(),false);
  }else f.warm(t);
  let uploads=0;const actual=f.values.uploadPreparedGeometry;f.values.uploadPreparedGeometry=(...args)=>{uploads++;return actual(...args);};
  const revision=f.values.geometryUploadRevision,upload=await evaluate(f.nodes.upload,f.env),adapter=f.values.residentCaptureAdapter();
  upload();assert.equal(uploads,0);assert.equal(f.values.geometryUploadPending,true,f.diagnostic());
  assert.deepEqual(adapter.snapshot(true),{status:'blocked',reason:'geometry-upload-pending',pending:true});
  upload();assert.equal(f.values.geometryUploadRevision,revision+2);
  if(provider==='city')f.pump(()=>f.values.prepareGeometryUpload(),t,()=>!f.values.geometryUploadPending);
  else{t.all();f.values.prepareGeometryUpload();}
  assert.equal(uploads,1);assert.equal(f.values.geometryUploadPending,false);
  // City publishes per-chunk geometry leases (content-addressed, revision 0,
  // no renderer-level VAO): the latest upload revision is the published one,
  // and every published chunk binds the owner's current lease on this context.
  if(provider==='city'){assert.equal(f.values.geometryPublishedRevision,revision+2);assert.equal(f.values.vao,undefined);const leases=f.values.geometryOwner.currentLeases;assert.equal(leases.length,f.values.sceneChunks.length);assert(leases.length>0);for(const chunk of f.values.sceneChunks){assert(leases.includes(chunk.geometry));assert(chunk.geometry.value.vao);}assert.equal(f.values.gpuReady(),true);}
 }finally{f.cleanup();t.restore();}
});
for(const provider of ['city','tier300'])test(`${provider} required offscreen capture requests exact colour families through capture priority`,async()=>{
 const f=await rendererFixture(provider),t=turns();try{
  f.warm(t);assert.equal(f.values.gpuReady(),true);f.calls.length=0;const key=f.values.currentPaintProgramKey;Object.assign(f.values,{indices:new Uint32Array([0,1,2,0,2,1]),familyRuns:[208,300].map((family,i)=>({key:key(family),firstIndex:i*3,indexCount:3})),familyPrograms:new Map(),familyFailures:new Map(),loaded:new Map([['visible',{start:0,end:3,box:[-.1,0,-.1,.1,.1,.1]}],['offscreen',{start:3,end:6,box:[3,0,3,4,.1,4]}]])});
  const updateView=view=>{if(provider==='city'){const S=f.values,u=S.anchorUnit,[x,y]=S.anchor;S.recordMainProjection(S.multiply(view,[u,0,0,0,0,0,-u,0,0,u,0,0,-x*u,0,y*u,1]));}f.values.updateMainViewport(view);};
  updateView(new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]));
  assert.deepEqual([...f.values.mainFamilyProgramKeys()],[key(208)]);assert.deepEqual([...f.values.residentFamilyProgramKeys()],[key(208),key(300)],'full solar demand retains the offscreen resident family');const vertices=f.values.vertices,indices=f.values.indices,runs=f.values.familyRuns;
  f.values.setCaptureDemand({kind:'solar',token:provider+'-complete-colour-cohort',active:true});
  const prepare=f.values.prepareCapturePrograms;assert.equal(prepare().status,'pending');assert.equal(f.values.familyFailures.size,0);assert(f.values.programPreparation.stats.pending>0);
  const requested=f.values.programPreparation.stats.pendingResources;
  assert.equal(requested.find(row=>row.resource===provider+':berlin:colour:208')?.priority,'visible','the capture request shares an exact recipe still needed by main');
  const offscreenView=new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,10,0,0,1]);updateView(offscreenView);
  assert.deepEqual([...f.values.mainFamilyProgramKeys()],[],'both resident families are now outside the main viewport');
  f.values.programPreparation.prune();const offscreen=f.values.programPreparation.stats.pendingResources;
  assert.deepEqual(offscreen.map(row=>row.resource),requested.map(row=>row.resource),'the live solar demand keeps the same queued recipes');
  assert(offscreen.length>0&&offscreen.every(row=>row.priority==='capture'),'only genuinely offscreen demand runs at capture priority');
  let result;f.pump(()=>{result=prepare();},t,()=>result.status==='ready');assert.equal(f.values.familyPrograms.size,2);assert.equal(f.calls.filter(c=>c.name==='linkProgram').length,2);assert.equal(f.values.vertices,vertices);assert.equal(f.values.indices,indices);assert.equal(f.values.familyRuns,runs);
 }finally{f.cleanup();t.restore();}
});
test('city default initialization retains family 0 specialization and family keys retain requested specialization',async()=>{
 const f=await rendererFixture('city'),t=turns();try{f.values.familySurfaceHelper='helper';const families=[];f.values.specializeCurrentPaintFragment=(source,family)=>(families.push(family),source+' family '+family);f.values.familyRuns=[{key:f.values.currentPaintProgramKey(208),firstIndex:0,indexCount:3}];
  pending(()=>f.values.compileGeometryProgram('helper'));t.all();f.values.compileGeometryProgram('helper');pending(()=>f.values.compileGeometryProgram('helper',false,208));t.all();f.values.compileGeometryProgram('helper',false,208);
  assert.deepEqual(families,[0,208]);assert.deepEqual(f.calls.filter(c=>c.name==='shaderSource'&&c.args[0].type===f.gl.FRAGMENT_SHADER).map(c=>c.args[1]),['clip original fragment family 0','clip original fragment family 208']);
 }finally{f.cleanup();t.restore();}
});
test('city material-hook replacement keeps its published allocation while pending and swaps only after link',async()=>{
 const f=await rendererFixture('city'),t=turns();try{
  f.warm(t);const old=f.values.program,geometry=f.values.geometryOwner.current;let cleared=0,uploads=0;f.values.clearFamilyPrograms=()=>{cleared++;};const actual=f.values.uploadPreparedGeometry;f.values.uploadPreparedGeometry=(...args)=>{uploads++;return actual(...args);};
  f.values.c311ShaderActive=true;f.values.materialRecipeRevision++;const refresh=await evaluate(f.nodes.refreshMaterialPrograms,f.env);assert.equal(refresh(),false);assert.equal(f.values.program,old);assert.equal(f.values.geometryOwner.current,geometry);assert.equal(cleared,0);assert(!f.deleted.includes(old));
  f.pump(refresh,t,()=>f.values.program!==old&&!f.values.geometryUploadPending);assert(f.values.program.program);assert(f.deleted.includes(old));assert.equal(cleared,1);assert.equal(uploads,1);assert.notEqual(f.values.geometryOwner.current,geometry);
 }finally{f.cleanup();t.restore();}
});
for(const provider of ['city','church','tier300','delegated500'])test(`${provider} actual projected-shadow preparation queues its original source and resumes pending VAO upload`,async()=>{
 const f=await rendererFixture(provider),t=turns();try{
  f.warm(t);f.calls.length=0;const before=f.geometryUploads();let releases=0;
  Object.assign(f.values,{shadowIndices:new Uint32Array([0,1,2]),c311ShadowShaderActive:true,c312ShadowShaderActive:true,c313ShadowShaderActive:true,SOURCE_SHADOW_VERTEX_GLSL:'shadow vertex',SOURCE_SHADOW_FRAGMENT_GLSL:'shadow fragment',S402_SHADOW_VERTEX_GLSL:'shadow vertex',S402_SHADOW_FRAGMENT_GLSL:'shadow fragment',releaseShadowGPU(){releases++;}});
  // Chunked renderers keep projected-shadow indices per resident chunk (the
  // shadow upload reads chunk.shadowIndices of the published scene)
  // (support/f6prog-upload-chunks.mjs: each with a live shadow CPU lease).
  f.uploads.shadow(new Uint32Array([0,1,2]));
  const upload=await evaluate(f.nodes.uploadShadow,f.env);upload();assert.equal(f.values.shadowUploadPending,true);assert.equal(f.values.shadowFailure??false,false,'the renderer boolean shadow failure latch stays clear');assert.equal(f.values.shadowProgram,undefined);assert.equal(f.geometryUploads(),before);assert.equal(releases,0);
  // The render loop resumes the shadow upload only while it is still pending
  // (render: if(shadowUploadPending)uploadShadow()); City/Tier300's queued upload
  // work clears the flag itself when it runs (retainReady:false), so an
  // unconditional re-entry would only start the settled upload again.
  for(let i=0;i<6&&f.values.shadowUploadPending;i++){t.all();if(f.values.shadowUploadPending)upload();}
  assert.equal(f.values.shadowFailure??false,false,'queued shadow upload must publish, not clear pending after a failure: '+JSON.stringify(f.values.programPreparation.stats.failures));
  assert.equal(f.values.shadowUploadPending,false);assert(f.values.shadowProgram.program);assert.equal(f.geometryUploads()-before,1);assert.equal(releases,0);
  assert.deepEqual(f.calls.filter(c=>c.name==='shaderSource').map(c=>c.args[1]),['shadow vertex','shadow fragment']);
  if(provider!=='base')assert(f.values.shadowGeometryOwner.stats.borrowedBuffers>0,'shadow attributes borrow the real main geometry allocation');
  if(provider==='city')for(const chunk of f.values.sceneChunks){const shadow=chunk.shadow?.value,main=chunk.geometry?.value;assert(shadow&&main,'the published chunk owns both main and shadow views');for(const [shadowKey,mainKey]of [['vertices','vertex'],['state','state'],['paint','paint'],['progressive','progressive']])assert.equal(shadow.buffers.get(shadowKey),main.buffers.get(mainKey),'shadow borrows the published main '+mainKey+' buffer');}
 }finally{f.cleanup();t.restore();}
});
test('church actual required-depth adapter treats queued compilation as pending and publishes only linked depth',async()=>{
 const f=await rendererFixture('church'),t=turns();try{
  f.warm(t);f.calls.length=0;f.values.setCaptureDemand({kind:'solar',token:'church-complete-colour-cohort',active:true});const prepare=f.values.prepareSolarPrograms;assert.equal(prepare().status,'pending');assert.equal(f.values.fullColourFailure,undefined);assert.equal(f.values.familyPrograms.has('full-colour'),false);t.all();assert.equal(prepare().status,'ready');assert(f.values.familyPrograms.get('full-colour').program);assert.equal(f.values.fullColourFailure,undefined);
  assert.deepEqual(f.calls.filter(c=>c.name==='shaderSource').map(c=>c.args[1]),['original vertex','clip original fragment']);
 }finally{f.cleanup();t.restore();}
});
for(const legacy of [false,true])test(`delegated500 actual ${legacy?'legacy keyed':'Berlin full'} depth queues pending without latching a failure or spending synchronous compile budget`,async()=>{
 const f=await rendererFixture('delegated500'),t=turns();try{
  f.warm(t);f.calls.length=0;Object.assign(f.values,{currentFamilyPrograms:!legacy,berlinCurrent:!legacy,legacySolarPartitions:legacy,partitionEnabled:true,partitionRuns:(legacy?['legacy-a','legacy-b']:[f.values.currentPaintProgramKey(0)]).map(key=>({key,firstIndex:0,indexCount:3})),legacyPartitionFragment:()=> 'legacy source'});
  f.values.setCaptureDemand({kind:'solar',token:legacy?'delegated-legacy-complete-colour-cohort':'delegated-berlin-complete-colour-cohort',active:true});
  const prepare=f.values.prepareSolarPrograms;assert.equal(prepare().status,'pending');assert.equal(f.values.casterFailures.size,0);assert.equal(f.values.programPreparation.stats.pending,1,'one shared capture budget admits one missing program at a time');let result;f.pump(()=>{result=prepare();},t,()=>result.status==='ready');assert.equal(f.values.casterFailures.size,0);
  if(legacy){assert.equal(f.values.partitionPrograms.size,2);assert(f.values.partitionPrograms.has('legacy-a'));assert(f.values.partitionPrograms.has('legacy-b'));}else assert(f.values.partitionPrograms.get('berlin-full-current').program);
 }finally{f.cleanup();t.restore();}
});

test('shared program: exact context recipe builds and links once with independently released owner references',()=>{
 const t=turns();try{const f=driver(),a=createProgramPreparationOwner('shared a',()=>{}),b=createProgramPreparationOwner('shared b',()=>{});let builds=0;const r={...recipe('shared-colour','visible',()=>{builds++;return{vertex:'shared vertex',fragment:'shared fragment',attributes:['a_position']};}),sharedKey:'native-exact-abi-v1'};
  pending(()=>a.compile(f.gl,r));pending(()=>b.compile(f.gl,r));assert.equal(a.stats.context.pending,1);t.all();assert.equal(builds,1);assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,1);
  const pa=a.compile(f.gl,r),pb=b.compile(f.gl,r);assert.equal(pa,pb);assert.equal(a.stats.shared.heldReferences,1);assert.equal(b.stats.shared.heldReferences,1);a.cancel();assert.equal(pa.deleted,false,'cancelling readiness must keep a published resident reference');a.releaseProgram(f.gl,pa);a.releaseProgram(f.gl,pa);assert.equal(pa.deleted,false);f.gl.useProgram(pb);b.releaseProgram(f.gl,pb);assert.equal(pa.deleted,true);assert.equal(f.deleted.filter(value=>value===pa).length,1);
  pending(()=>b.compile(f.gl,r));t.all();const restored=b.compile(f.gl,r);assert.notEqual(restored,pa);assert.equal(builds,2,'last release evicts both executable and source identity');b.dispose();assert.equal(restored.deleted,true);
 }finally{t.restore();}
});

test('shared program: first visible demand upgrades an already queued capture recipe without a second program',()=>{
 const t=turns();try{
  const f=driver(),capture=createProgramPreparationOwner('solar capture',()=>{}),visible=createProgramPreparationOwner('main screen',()=>{}),other=createProgramPreparationOwner('other capture',()=>{}),order=[];
  const background=recipe('other-capture','capture',()=>{order.push('other-capture');return{vertex:'other vertex',fragment:'other fragment',attributes:[]};});
  const shared={...recipe('solar-recipe','capture',()=>{order.push('shared-main-and-capture');return{vertex:'same vertex',fragment:'same fragment',attributes:['a_position']};}),sharedKey:'same-native-main-and-solar-recipe'};
  const main={...shared,priority:'visible'};
  pending(()=>other.compile(f.gl,background));pending(()=>capture.compile(f.gl,shared));pending(()=>visible.compile(f.gl,main));pending(()=>capture.compile(f.gl,shared));
  assert.equal(capture.stats.context.pending,2,'main and capture subscribe to one admitted recipe');assert.equal(f.calls.length,0);t.all();
  assert.deepEqual(order,['shared-main-and-capture','other-capture'],'first-screen demand precedes queued capture-only work');
  assert.equal(f.calls.filter(call=>call.name==='createProgram').length,2);assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,2);
  const solarProgram=capture.compile(f.gl,shared),mainProgram=visible.compile(f.gl,main);assert.equal(solarProgram,mainProgram);assert.equal(visible.compile(f.gl,main),mainProgram,'a third logical grant shares the same linked program');
  const objects=capture.stats.resourceObjects;assert(Number.isSafeInteger(objects.contextId)&&objects.contextId>0);assert.equal(objects.createdPrograms,2);assert.equal(objects.deleteProgramRequests,0);assert.equal(objects.scope,'tracked-program-owners/context-lifetime-issued-calls');const byContext=new Map([capture,visible,other].map(owner=>{assert.deepEqual(owner.stats.resourceObjects,objects,'all owners see one cumulative context counter');return[owner.stats.resourceObjects.contextId,owner.stats.resourceObjects];}));assert.equal(byContext.size,1,'contextId deduplicates owner projections of the same issued calls');assert.equal([...byContext.values()][0].createdPrograms,2);assert.equal(capture.stats.shared.grantedReferences,1);assert.equal(visible.stats.shared.grantedReferences,2);
  capture.releaseProgram(f.gl,solarProgram);assert.equal(capture.stats.shared.releasedReferences,1);assert.equal(mainProgram.deleted,false);visible.releaseProgram(f.gl,mainProgram);assert.equal(visible.stats.shared.heldReferences,1);assert.equal(visible.stats.shared.releasedReferences,1);assert.equal(capture.stats.resourceObjects.deleteProgramRequests,0,'logical release does not issue a delete while another grant survives');f.gl.useProgram(mainProgram);visible.releaseProgram(f.gl,mainProgram);assert.equal(visible.stats.shared.releasedReferences,2);assert.equal(f.deleted.filter(value=>value===mainProgram).length,1);assert.equal(capture.stats.resourceObjects.deleteProgramRequests,1);other.cancel();assert.equal(other.stats.resourceObjects.deleteProgramRequests,2,'the independent private program has its own final delete request');
 }finally{t.restore();}
});

test('shared program: cancelling the first queued subscriber selects a live builder and preserves the other owner',()=>{
 const t=turns();try{const f=driver(),a=createProgramPreparationOwner('first',()=>{}),b=createProgramPreparationOwner('second',()=>{});let builtA=0,builtB=0;const r={...recipe(),sharedKey:'abi-v1'},ra={...r,build(){builtA++;throw Error('cancelled builder must not run');}},rb={...r,build(){builtB++;return{vertex:'v',fragment:'f',attributes:[]};}};
  pending(()=>a.compile(f.gl,ra));pending(()=>b.compile(f.gl,rb));a.cancel();t.all();assert.equal(builtA,0);assert.equal(builtB,1);assert.equal(b.stats.last.status,'ready');const program=b.compile(f.gl,rb);assert.equal(program.deleted,false);assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,1);b.dispose();assert.equal(program.deleted,true);
 }finally{t.restore();}
});

test('shared source consumption does not reread builders during reentrant polls, later polls or late subscriptions',()=>{
 const t=turns(),f=driver({parallel:true}),a=createProgramPreparationOwner('source-first',()=>{}),b=createProgramPreparationOwner('source-late',()=>{});f.gl.complete=false;
 let reads=0,builds=0,sourceStarted=false;
 const identity={resource:'consumed-source',sharedKey:'consumed-source-v1',inputs:['immutable source and bindings']};
 const r={...identity,get build(){reads++;assert.equal(sourceStarted,false,'a consumed source must not capture another builder closure');return()=>{builds++;sourceStarted=true;pending(()=>a.compile(f.gl,r));t.advance(4);return{vertex:'original vertex',fragment:'original fragment',attributes:['a_position']};};}};
 try{
  pending(()=>a.compile(f.gl,r));assert.equal(reads,1);assert.equal(builds,0);
  t.one();assert.equal(builds,1);assert.equal(f.calls.length,0,'the real source phase yields before shader submission');
  pending(()=>a.compile(f.gl,r));pending(()=>b.compile(f.gl,r));assert.equal(reads,1);
  t.until(()=>f.calls.some(call=>call.name==='linkProgram'));pending(()=>a.compile(f.gl,r));pending(()=>b.compile(f.gl,r));
  assert.equal(reads,1);assert.equal(a.stats.sourceRetainedCharacters,0,'both source strings were submitted, independently of builder ownership');
  a.cancel();assert.equal(b.stats.pending,1,'late live demand keeps its original execution');
  f.gl.complete=true;t.all();const program=b.compile(f.gl,r);assert.equal(builds,1);assert.equal(reads,1);assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,1);
  assert.deepEqual(f.calls.filter(call=>call.name==='shaderSource').map(call=>call.args[1]),['original vertex','original fragment']);f.gl.useProgram(program);
 }finally{f.gl.complete=true;a.dispose();b.dispose();t.all();t.restore();}
});

test('shared first-visible retry reacquires a builder after source or link failure, and only for that retry',()=>{
 for(const failure of ['source','link']){
  const t=turns(),f=driver({linked:failure!=='link'}),owner=createProgramPreparationOwner('source-retry-'+failure,()=>{});let reads=0,builds=0,allowRead=true;
  const identity={resource:'retry-source',sharedKey:'retry-source-v1',inputs:['immutable retry source']};
  const make=priority=>({...identity,priority,get build(){reads++;assert(allowRead,'terminal or consumed work must not reacquire its builder');return()=>{builds++;allowRead=false;if(failure==='source'&&builds===1)throw Error('controlled source assembly failure');return{vertex:'retry vertex',fragment:'retry fragment',attributes:[]};};}});
  const capture=make('capture'),visible=make('visible');
  try{
   pending(()=>owner.compile(f.gl,capture));t.all();assert.equal(builds,1);assert.equal(reads,1);
   assert.throws(()=>owner.compile(f.gl,capture),ProgramPreparationFailure);assert.equal(reads,1);
   allowRead=true;f.gl.linked=true;pending(()=>owner.compile(f.gl,visible));assert.equal(reads,2);t.all();
   const program=owner.compile(f.gl,visible);assert.equal(builds,2);assert.equal(reads,2);f.gl.useProgram(program);
   assert.deepEqual(f.calls.filter(call=>call.name==='shaderSource').map(call=>call.args[1]),failure==='source'?['retry vertex','retry fragment']:['retry vertex','retry fragment','retry vertex','retry fragment']);
  }finally{owner.dispose();t.all();t.restore();}
 }
});

test('shared partial submission reacquires its builder only after the abandoned shader has drained',()=>{
 const t=turns(),f=driver({parallel:true}),first=createProgramPreparationOwner('partial-builder-old',()=>{}),next=createProgramPreparationOwner('partial-builder-next',()=>{});f.gl.complete=false;
 let reads=0,builds=0,allowRead=true,firstSubmission=true;const compile=f.gl.compileShader;
 f.gl.compileShader=(...args)=>{compile(...args);if(firstSubmission){firstSubmission=false;t.advance(4);}};
 const r={resource:'partial-builder',sharedKey:'partial-builder-v1',inputs:['canonical partial source'],get build(){reads++;assert(allowRead,'waiting for a partial driver submission must not retain another builder');return()=>{builds++;allowRead=false;return{vertex:'partial vertex',fragment:'partial fragment',attributes:[]};};}};
 try{
  pending(()=>first.compile(f.gl,r));t.until(()=>f.calls.some(call=>call.name==='compileShader'));first.cancel();
  pending(()=>next.compile(f.gl,r));t.one();assert.equal(reads,1);assert.equal(builds,1);assert.equal(next.stats.context.retiring,1);assert.equal(next.stats.resumable,0);
  f.gl.complete=true;t.all();assert.equal(next.stats.context.retiring,0);allowRead=true;
  pending(()=>next.compile(f.gl,r));assert.equal(reads,2,'completed partial drain requires a fresh source producer');t.all();const program=next.compile(f.gl,r);
  assert.equal(builds,2);assert.equal(reads,2);assert.deepEqual(f.calls.filter(call=>call.name==='shaderSource').map(call=>call.args[1]),['partial vertex','partial vertex','partial fragment']);f.gl.useProgram(program);
 }finally{f.gl.complete=true;first.dispose();next.dispose();t.all();t.restore();}
});

test('shared linked resubscription needs no builder, while context restoration rebuilds the same authoritative recipe',()=>{
 const t=turns(),f=driver({parallel:true}),first=createProgramPreparationOwner('source-old-view',()=>{}),next=createProgramPreparationOwner('source-new-view',()=>{});f.gl.complete=false;
 let reads=0,builds=0,allowRead=true;
 const build=()=>{builds++;allowRead=false;return{vertex:'canonical vertex',fragment:'canonical fragment',attributes:['a_position']};};
 const authority=createProgramSourceAuthority({inputs:['canonical-source-v1'],builders:[build]}),r={resource:'canonical-colour',sharedKey:'canonical-colour-v1',inputs:['helper:canonical','family:7','bindings:position'],provenance:[authority],get build(){reads++;assert(allowRead,'driver resumption must not capture replacement source work');return build;}};
 try{
  pending(()=>first.compile(f.gl,r));t.until(()=>f.calls.some(call=>call.name==='linkProgram'));const old=f.created.find(value=>value.program);first.cancel();
  pending(()=>next.compile(f.gl,r));assert.equal(reads,1);assert.equal(builds,1);assert.equal(next.stats.context.retiring,0);
  f.gl.complete=true;t.all();assert.equal(next.compile(f.gl,r),old);assert.equal(reads,1);f.gl.useProgram(old);
  f.gl.lost=true;next.contextLost();f.gl.lost=false;allowRead=true;
  pending(()=>next.compile(f.gl,r));assert.equal(reads,2);t.all();const restored=next.compile(f.gl,r);
  assert.notEqual(restored,old);assert.equal(builds,2);assert.equal(reads,2);assert.equal(f.deleted.filter(value=>value===old).length,0);f.gl.useProgram(restored);
  assert.deepEqual(f.calls.filter(call=>call.name==='shaderSource').map(call=>call.args[1]),['canonical vertex','canonical fragment','canonical vertex','canonical fragment']);
 }finally{f.gl.lost=false;f.gl.complete=true;first.dispose();next.dispose();t.all();t.restore();}
});

test('shared runtime priority follows current subscriber roles, while a remaining visible subscriber preserves main demand',()=>{
 const t=turns(),f=driver(),a=createProgramPreparationOwner('main a',()=>{}),b=createProgramPreparationOwner('main b',()=>{}),capture=createProgramPreparationOwner('capture',()=>{}),peer=createProgramPreparationOwner('required peer',()=>{}),order=[];
 const shared={...recipe('shared-role','capture',()=>{order.push('shared');return{vertex:'v',fragment:'f',attributes:[]};}),sharedKey:'roles-v1'},main={...shared,priority:'visible'};
 const priority=()=>capture.stats.pendingResources.find(value=>value.resource==='shared-role')?.priority;
 try{
  pending(()=>capture.compile(f.gl,shared));pending(()=>a.compile(f.gl,main));pending(()=>b.compile(f.gl,main));
  pending(()=>a.compile(f.gl,shared));assert.equal(priority(),'visible','another live main subscriber still owns the visible role');
  b.cancel();assert.equal(priority(),'capture','leaving the last main subscriber lowers the queued execution');
  pending(()=>a.compile(f.gl,main));assert.equal(priority(),'visible','the same pending subscriber can promote again');
  pending(()=>a.compile(f.gl,shared));assert.equal(priority(),'capture','same-owner role changes do not inherit ever-visible scheduling');
  pending(()=>peer.compile(f.gl,recipe('peer','visible',()=>{order.push('peer');return{vertex:'v2',fragment:'f2',attributes:[]};})));
  t.all();assert.deepEqual(order,['peer','shared'],'a real main start precedes the now capture-only execution');assert.equal(capture.stats.ready,1);assert.equal(a.stats.ready,1);
  a.cancel();assert.equal(capture.stats.ready,1,'a ready but unconsumed executable remains for its other subscriber');
  const program=capture.compile(f.gl,shared);assert.equal(f.calls.filter(value=>value.name==='linkProgram').length,2);f.gl.useProgram(program);capture.releaseProgram(f.gl,program);assert.equal(f.deleted.filter(value=>value===program).length,1);
 }finally{a.dispose();b.dispose();capture.dispose();peer.dispose();t.all();t.restore();}
});

test('pruning an expired main subscriber demotes the shared submitted continuation without releasing driver debt',()=>{
 const t=turns(),f=driver({parallel:true}),main=createProgramPreparationOwner('main',()=>{}),capture=createProgramPreparationOwner('capture',()=>{});let current=true;
 const r={...recipe('live-role','capture'),sharedKey:'live-role-v1'};f.gl.complete=false;
 try{
  pending(()=>capture.compile(f.gl,r));pending(()=>main.compile(f.gl,{...r,priority:'visible',current:()=>current}));
  t.until(()=>f.calls.some(value=>value.name==='linkProgram'));const program=f.calls.find(value=>value.name==='linkProgram').args[0];
  current=false;main.prune();assert.equal(capture.stats.pendingResources[0].priority,'capture');assert.equal(capture.stats.context.admitted,1);assert.equal(capture.stats.context.submitted,1);assert.equal(f.deleted.length,0);
  capture.cancel();assert.equal(capture.stats.context.retiring,1);assert.equal(capture.stats.context.admitted,1,'removing the last live role still waits for the actual submitted link');
  f.gl.complete=true;t.all();assert.equal(capture.stats.context.admitted,0);assert.equal(f.deleted.filter(value=>value===program).length,1);
  f.gl.lost=true;main.contextLost();f.gl.lost=false;pending(()=>main.compile(f.gl,{...r,priority:'visible'}));t.all();const restored=main.compile(f.gl,{...r,priority:'visible'});assert.notEqual(restored,program);f.gl.useProgram(restored);
 }finally{f.gl.complete=true;main.dispose();capture.dispose();t.all();t.restore();}
});

test('a main subscriber expiring inside the execution guard cannot admit capture ahead of a waiting main',()=>{
 const t=turns(),f=driver(),main=createProgramPreparationOwner('old main',()=>{}),capture=createProgramPreparationOwner('capture',()=>{}),peer=createProgramPreparationOwner('new main',()=>{}),order=[];let current=true;
 const r={...recipe('shared-guard-role','capture',()=>{order.push('capture');return{vertex:'v',fragment:'f',attributes:[]};}),sharedKey:'guard-role-v1'};
 try{
  pending(()=>capture.compile(f.gl,r));pending(()=>main.compile(f.gl,{...r,priority:'visible',current:()=>current}));
  pending(()=>peer.compile(f.gl,recipe('main','visible',()=>{order.push('main');return{vertex:'v2',fragment:'f2',attributes:[]};})));current=false;
  t.all();assert.deepEqual(order,['main','capture']);assert.equal(main.stats.shared.pending,0);assert.equal(capture.stats.ready,1);assert.equal(f.calls.filter(value=>value.name==='linkProgram').length,2);
 }finally{main.dispose();capture.dispose();peer.dispose();t.all();t.restore();}
});

for(const shared of [false,true])test(`${shared?'shared':'private'} live role changes without another compile and invalid guards stop role callbacks`,()=>{
 const t=turns(),f=driver(),owner=createProgramPreparationOwner('old main',()=>{}),peer=createProgramPreparationOwner('new main',()=>{}),order=[];let role='visible',valid=true,reads=0;
 const r={...recipe('changing-role','visible',()=>{order.push('capture');return{vertex:'v',fragment:'f',attributes:[]};}),...(shared?{sharedKey:'changing-role-v1'}:{}),current:()=>valid,currentPriority(){assert(valid,'a role callback must follow a successful current guard');reads++;return role;}};
 try{
  pending(()=>owner.compile(f.gl,r));pending(()=>peer.compile(f.gl,recipe('peer','visible',()=>{order.push('main');return{vertex:'v2',fragment:'f2',attributes:[]};})));role='capture';
  t.all();assert.deepEqual(order,['main','capture'],'the live union demand is demoted without another compile call');assert.equal(owner.stats.last.priority,'capture');owner.cancel();
  role='visible';pending(()=>owner.compile(f.gl,r));const before=reads;valid=false;owner.prune();t.all();assert.equal(reads,before,'expired/cancelled demand leaves no role callback to run');assert.equal(owner.stats.pending,0);
 }finally{valid=false;owner.dispose();peer.dispose();t.all();t.restore();}
});

test('shared failure upgrade history remains latched after its running role is downgraded',()=>{
 const t=turns(),f=driver(),owner=createProgramPreparationOwner('history',()=>{});let builds=0,role='capture';
 const r={...recipe('failed-role','capture',()=>{builds++;throw Error('source fails');}),sharedKey:'failed-role-v1',currentPriority:()=>role};
 try{
  pending(()=>owner.compile(f.gl,r));t.all();assert.throws(()=>owner.compile(f.gl,r),ProgramPreparationFailure);
  role='visible';owner.prune();pending(()=>owner.compile(f.gl,r));role='capture';owner.prune();assert.equal(owner.stats.pendingResources[0].priority,'capture');t.all();
  for(const priority of ['capture','visible','capture','visible']){role=priority;assert.throws(()=>owner.compile(f.gl,r),ProgramPreparationFailure);}
  assert.equal(builds,2,'only the first visible upgrade retries a capture-only failure');
 }finally{owner.dispose();t.all();t.restore();}
});

test('shared program: active subscriber guards are OR demand and an expired first source does not construct',()=>{
 const t=turns();try{const f=driver(),a=createProgramPreparationOwner('stale',()=>{}),b=createProgramPreparationOwner('current',()=>{});let live=true,aBuild=0,bBuild=0;const r={...recipe(),sharedKey:'abi-v1'};
  pending(()=>a.compile(f.gl,{...r,current:()=>live,build(){aBuild++;throw Error('stale source');}}));pending(()=>b.compile(f.gl,{...r,current:()=>true,build(){bBuild++;return{vertex:'v',fragment:'f',attributes:[]};}}));live=false;t.all();assert.equal(aBuild,0);assert.equal(bBuild,1);assert.equal(a.stats.last.status,'cancelled');const program=b.compile(f.gl,{...r,current:()=>true});f.gl.useProgram(program);b.releaseProgram(f.gl,program);assert.equal(program.deleted,true);
 }finally{t.restore();}
});

test('shared program: same owner repeated grants dispose every reference and private transfers exactly once',()=>{
 const t=turns();try{const f=driver(),owner=createProgramPreparationOwner('owner',()=>{}),r={...recipe('shared'),sharedKey:'abi-v1'};pending(()=>owner.compile(f.gl,r));t.all();const first=owner.compile(f.gl,r),second=owner.compile(f.gl,r);assert.equal(first,second);assert.equal(owner.stats.shared.heldReferences,2);assert.equal(owner.stats.shared.grantedReferences,2);assert.equal(owner.stats.shared.releasedReferences,0);assert.equal(owner.stats.resourceObjects.createdPrograms,1);
  pending(()=>owner.compile(f.gl,recipe('private')));t.all();const unique=owner.compile(f.gl,recipe('private'));owner.dispose();assert.equal(first.deleted,true);assert.equal(unique.deleted,true);assert.equal(owner.stats.shared.heldReferences,0);assert.equal(f.deleted.filter(value=>value===first).length,1);assert.equal(f.deleted.filter(value=>value===unique).length,1);assert.equal(owner.stats.shared.releasedReferences,2);assert.equal(owner.stats.resourceObjects.createdPrograms,2);assert.equal(owner.stats.resourceObjects.deleteProgramRequests,2);owner.dispose();owner.releaseProgram(f.gl,first);owner.releaseProgram(f.gl,unique);assert.equal(f.deleted.filter(value=>value===first).length,1);assert.equal(f.deleted.filter(value=>value===unique).length,1);
 }finally{t.restore();}
});

test('shared program: context epoch loss drops every stale demand and reference without deleting invalid GL objects',()=>{
 const t=turns();try{const f=driver(),a=createProgramPreparationOwner('a',()=>{}),b=createProgramPreparationOwner('b',()=>{}),r={...recipe(),sharedKey:'abi-v1'};pending(()=>a.compile(f.gl,r));pending(()=>b.compile(f.gl,r));t.all();const old=a.compile(f.gl,r);assert.equal(b.compile(f.gl,r),old);const contextId=a.stats.resourceObjects.contextId;assert.deepEqual(a.stats.resourceObjects,b.stats.resourceObjects);assert.equal(a.stats.resourceObjects.createdPrograms,1);assert.equal(a.stats.resourceObjects.deleteProgramRequests,0);const before=f.deleted.length;f.gl.lost=true;a.contextLost();b.releaseProgram(f.gl,old);a.releaseProgram(f.gl,old);assert.equal(f.deleted.length,before);assert.equal(a.stats.shared.heldReferences,0);assert.equal(b.stats.shared.heldReferences,0);for(const owner of [a,b]){assert.equal(owner.stats.shared.grantedReferences,1);assert.equal(owner.stats.shared.releasedReferences,1,'epoch loss retires logical grants');assert.equal(owner.stats.resourceObjects.contextId,contextId);assert.equal(owner.stats.resourceObjects.deleteProgramRequests,0,'loss issues no GL deletion for invalid objects');}f.gl.lost=false;pending(()=>b.compile(f.gl,r));t.all();const fresh=b.compile(f.gl,r);assert.notEqual(fresh,old);f.gl.useProgram(fresh);b.dispose();assert.equal(fresh.deleted,true);assert.equal(f.deleted.filter(value=>value===old).length,0);assert.equal(b.stats.resourceObjects.contextId,contextId);assert.equal(b.stats.resourceObjects.createdPrograms,2);assert.equal(b.stats.resourceObjects.deleteProgramRequests,1);assert.equal(b.stats.shared.grantedReferences,2);assert.equal(b.stats.shared.releasedReferences,2);
 }finally{t.restore();}
});

test('shared program: cancelled queued closures never build and source failure has a fresh retry after release',()=>{
 const t=turns();try{const f=driver(),a=createProgramPreparationOwner('a',()=>{}),b=createProgramPreparationOwner('b',()=>{});let cancelledBuilds=0,attempts=0;const cancelled={...recipe('cancelled','visible',()=>{cancelledBuilds++;throw Error('cancelled');}),sharedKey:'abi-v1'};pending(()=>a.compile(f.gl,cancelled));a.cancel();t.all();assert.equal(cancelledBuilds,0);assert.equal(f.created.length,0);
  const r={...recipe('retry','visible',()=>{attempts++;if(attempts===1)throw Error('controlled source failure');return{vertex:'v',fragment:'f',attributes:[]};}),sharedKey:'abi-v1'};pending(()=>b.compile(f.gl,r));t.all();assert.throws(()=>b.compile(f.gl,r),ProgramPreparationFailure);assert.equal(f.created.length,0);b.cancel();pending(()=>b.compile(f.gl,r));t.all();const program=b.compile(f.gl,r);assert.equal(attempts,2);assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,1);b.dispose();assert.equal(program.deleted,true);
 }finally{t.restore();}
});

test('shared program: source build, specialization and upload use the existing cross-owner context queue',()=>{
 const t=turns();try{
  const f=driver(),a=createProgramPreparationOwner('shader',()=>{}),b=createProgramPreparationOwner('upload',()=>{}),events=[],r={...recipe('colour','visible',()=>{events.push('source/specialize');t.advance(4);return{vertex:'v',fragment:'f',attributes:[]};}),sharedKey:'abi-v1'};
  pending(()=>a.compile(f.gl,r));const work={resource:'geometry-upload',revision:1,current:()=>true,work(){assert.equal(b.stats.context.active,1,'pure work executes as the sole CPU step');assert.equal(b.stats.context.submitted,0,'upload can run after source construction, before the shader submits');assert.equal(b.stats.context.admitted,1,'the yielded shader still owns its source-chain admission');events.push('upload');}};
  assert.equal(b.work(f.gl,work),false);assert.equal(a.stats.context.maxInFlight,2);assert.equal(a.stats.context.pending,2);assert.equal(a.stats.context.queued,2);assert.equal(a.stats.context.submitted,0);assert.equal(a.stats.context.inFlight,0);
  t.one();assert.deepEqual(events,['source/specialize']);assert.equal(f.calls.length,0);assert.equal(a.stats.context.active,0);assert.equal(a.stats.context.queued,2);assert.equal(a.stats.context.admitted,1);assert.equal(a.stats.context.submitted,0,'source construction owns admission but is not a driver submission');
  t.all();assert.deepEqual(events,['source/specialize','upload']);assert.equal(b.work(f.gl,work),true);assert.equal(a.stats.context.active,0);assert.equal(a.stats.context.pending,0);assert.equal(a.stats.context.submitted,0);assert.equal(a.stats.context.inFlight,0);const program=a.compile(f.gl,r);a.dispose();assert.equal(program.deleted,true);
 }finally{t.restore();}
});

test('a later provider CPU preflight and upload advance between steps of an earlier 23-program shared-owner batch',()=>{
 const t=turns(),f=driver(),bremen=createProgramPreparationOwner('bremen bremen',()=>{}),tier=createProgramPreparationOwner('tier300 bremen',()=>{}),events=[];
 try{
  for(let i=0;i<23;i++)pending(()=>bremen.compile(f.gl,{...recipe('colour:'+i,'visible',()=>{events.push('source:'+i);t.advance(4);return{vertex:'v'+i,fragment:'f'+i,attributes:[]};}),sharedKey:'family:'+i}));
  t.one();assert.deepEqual(events,['source:0']);assert.equal(bremen.stats.context.admitted,1);assert.equal(f.calls.length,0);
  const preflight={resource:'material-source-preflight:0',revision:1,phase:'source-build',current:()=>true,work(){events.push('preflight');t.advance(4);}},upload={resource:'geometry-upload',revision:1,phase:'upload',current:()=>true,work(){events.push('upload');assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,0,'CPU readiness work does not wait for the earlier shader chain to link');t.advance(4);}};
  assert.equal(tier.work(f.gl,preflight),false);assert.equal(tier.work(f.gl,upload),false);
  t.one();assert.deepEqual(events,['source:0','preflight']);assert.equal(f.calls.length,0,'the later owner runs even before the first vertex submission');
  t.until(()=>events.includes('upload'));assert.deepEqual(events,['source:0','preflight','upload'],'new shared execution records of the same provider cannot create new fairness groups');
  assert.equal(tier.work(f.gl,preflight),true);assert.equal(tier.work(f.gl,upload),true);assert.equal(bremen.stats.context.maxInFlight,2);
  t.all();assert.deepEqual(events.filter(value=>value.startsWith('source:')),Array.from({length:23},(_,i)=>'source:'+i),'first starts remain FIFO within one provider');assert.equal(bremen.stats.context.admitted,0);
 }finally{bremen.dispose();tier.dispose();f.gl.complete=true;t.all();t.restore();}
});

test('same-provider shader continuations do not buy fresh capture admission from an empty second slot',()=>{
 const t=turns(),f=driver(),main=createProgramPreparationOwner('bremen bremen',()=>{}),capture=createProgramPreparationOwner('reflection bremen',()=>{}),starts=[];
 const compile=f.gl.compileShader;f.gl.compileShader=(...args)=>{compile(...args);t.advance(4);};
 const make=(name,priority)=>({...recipe(name,priority,()=>{starts.push(name);t.advance(4);return{vertex:'v '+name,fragment:'f '+name,attributes:[]};}),sharedKey:'same-provider-v1'});
 try{
  pending(()=>capture.compile(f.gl,make('capture','capture')));for(let i=0;i<6;i++)pending(()=>main.compile(f.gl,make('main:'+i,'visible')));
  t.one();t.one();t.one();assert.deepEqual(starts,['main:0'],'source, vertex and fragment are one main admission, not three');assert.equal(main.stats.context.admitted,1,'the spare admission remains available to main work');
  t.all();assert.deepEqual(starts.filter(value=>value.startsWith('main:')),Array.from({length:6},(_,i)=>'main:'+i));const at=starts.indexOf('capture');assert(at>=3&&at<6,'capture progresses after bounded main admissions, before the finite main batch is exhausted');assert.equal(main.stats.context.admitted,0);assert.equal(f.calls.filter(value=>value.name==='linkProgram').length,7);
 }finally{main.dispose();capture.dispose();t.all();t.restore();}
});

test('a submitted slow capture keeps its debt, the next free admission starts main, and CPU preflight still advances',()=>{
 const t=turns(),f=driver({parallel:true}),oldCapture=createProgramPreparationOwner('old reflection',()=>{}),main=createProgramPreparationOwner('bremen bremen',()=>{}),capture=createProgramPreparationOwner('new reflection',()=>{}),cpu=createProgramPreparationOwner('tier300 bremen',()=>{}),starts=[];f.gl.complete=false;
 const make=(name,priority)=>({...recipe(name,priority,()=>{starts.push(name);t.advance(4);return{vertex:'v '+name,fragment:'f '+name,attributes:[]};}),sharedKey:'slow-admission-v1'});
 const turn=()=>{t.one();assert(main.stats.context.admitted<=2);assert(main.stats.context.submitted<=2);};
 const until=predicate=>{let turns=0;while(!predicate()){assert(++turns<120,'bounded continuation did not reach its milestone');turn();}};
 try{
  pending(()=>oldCapture.compile(f.gl,make('old-capture','capture')));t.until(()=>f.calls.some(value=>value.name==='linkProgram'));const oldProgram=f.calls.find(value=>value.name==='linkProgram').args[0];
  pending(()=>capture.compile(f.gl,make('new-capture','capture')));for(let i=0;i<6;i++)pending(()=>main.compile(f.gl,make('main:'+i,'visible')));
  let preflight=false;cpu.work(f.gl,{resource:'material-source-preflight',revision:1,current:()=>true,phase:'source-build',work(){preflight=true;t.advance(4);}});
  until(()=>preflight&&f.calls.filter(value=>value.name==='linkProgram').length===2);assert.deepEqual(starts,['old-capture','main:0']);assert.equal(main.stats.context.admitted,2);assert.equal(main.stats.context.waiting,2);
  oldCapture.cancel();turn();assert.equal(main.stats.context.admitted,2);assert.equal(main.stats.context.retiring,1);assert(!oldProgram.deleted,'cancel cannot pretend slow driver work has finished');
  f.setCompletion(oldProgram);until(()=>starts.includes('main:1'));assert(!starts.includes('new-capture'),'a released capture slot goes to the waiting main batch');assert.equal(f.deleted.filter(value=>value===oldProgram).length,1);
  f.gl.complete=true;while(t.queue.length)turn();const at=starts.indexOf('new-capture');assert(at>=4&&at<7,'the queued capture eventually shares service after main admission credit');assert.equal(main.stats.context.admitted,0);assert.equal(main.stats.context.retiring,0);
 }finally{f.gl.complete=true;oldCapture.dispose();main.dispose();capture.dispose();cpu.dispose();t.all();t.restore();}
});

test('yielded source chains hold both admissions before driver submission while CPU work and unsubmitted cancellation still progress',()=>{
 const t=turns(),f=driver({parallel:true}),owners=['bremen bremen','root500 bremen','tier300 bremen'].map(source=>createProgramPreparationOwner(source,()=>{})),builds=[];f.gl.complete=false;
 const recipes=owners.map((_,i)=>recipe('source-chain:'+i,'visible',()=>{builds.push(i);t.advance(4);return{vertex:'v'+i,fragment:'f'+i,attributes:[]};}));
 try{
  for(let i=0;i<owners.length;i++)pending(()=>owners[i].compile(f.gl,recipes[i]));
  t.one();t.one();assert.deepEqual(builds,[0,1]);assert.equal(f.calls.length,0);assert.equal(owners[0].stats.context.admitted,2);assert.equal(owners[0].stats.context.inFlight,0,'source admission is not a fabricated driver submission');
  let preflight=false;const work={resource:'preflight',revision:1,phase:'source-build',current:()=>true,work(){preflight=true;t.advance(4);}};
  owners[2].work(f.gl,work);t.one();assert.equal(preflight,true);assert.deepEqual(builds,[0,1]);assert.equal(f.calls.length,0,'pure CPU work bypasses two occupied source admissions');
  owners[0].cancel();assert.equal(owners[0].stats.context.admitted,1);assert.equal(owners[0].stats.sourceRetainedCharacters,0);assert.equal(f.created.length,0,'cancelling the yielded source creates no driver debt');
  t.until(()=>builds.length===3);assert.deepEqual(builds,[0,1,2]);assert.equal(owners[0].stats.context.admitted,2);assert(owners[0].stats.context.inFlight<=2);
  t.until(()=>f.calls.filter(call=>call.name==='linkProgram').length===2);owners[1].cancel();assert.equal(owners[0].stats.context.admitted,2,'submitted cancellation keeps its chain admission until completion');assert.equal(owners[0].stats.context.retiring,1);
  f.gl.lost=true;owners[2].contextLost();assert.equal(owners[0].stats.context.admitted,0);assert.equal(owners[0].stats.context.inFlight,0);t.all();
 }finally{f.gl.complete=true;for(const owner of owners)owner.dispose();t.all();t.restore();}
});

test('restored ownership: lost and replaced contexts drop legacy strong refs while late releases cannot delete current or borrowed programs',()=>{
 const t=turns();try{
  const first=driver(),next=driver(),owner=createProgramPreparationOwner('restored owner',()=>{}),other=createProgramPreparationOwner('other old-context owner',()=>{}),legacy=recipe('legacy'),shared={...recipe('shared'),sharedKey:'native-abi-v1'};
  pending(()=>owner.compile(first.gl,legacy));t.all();const lost=owner.compile(first.gl,legacy);assert.equal(owner.stats.ownedLegacyPrograms,1);const beforeLoss=first.deleted.length;first.gl.lost=true;owner.contextLost();assert.equal(owner.stats.ownedLegacyPrograms,0);assert.equal(first.deleted.length,beforeLoss);
  first.gl.lost=false;pending(()=>owner.compile(first.gl,legacy));t.all();const restored=owner.compile(first.gl,legacy);assert.notEqual(restored,lost);assert.equal(owner.stats.ownedLegacyPrograms,1);const restoredDeletes=first.deleted.length;owner.releaseProgram(first.gl,lost);assert.equal(first.deleted.length,restoredDeletes);first.gl.useProgram(restored);
  pending(()=>owner.compile(first.gl,shared));pending(()=>other.compile(first.gl,shared));t.all();const borrowed=owner.compile(first.gl,shared);assert.equal(other.compile(first.gl,shared),borrowed);assert.equal(owner.stats.shared.heldReferences,1);assert.equal(other.stats.shared.heldReferences,1);
  pending(()=>owner.compile(next.gl,legacy));assert.equal(owner.stats.ownedLegacyPrograms,0);assert.equal(owner.stats.shared.heldReferences,0);assert.equal(first.deleted.filter(value=>value===restored).length,1,'healthy context replacement releases this owner legacy program');assert.equal(borrowed.deleted,false,'the other owner still owns the old context shared program');assert.equal(other.stats.context.epoch,1,'switching one owner must not invalidate the healthy old context');t.all();const current=owner.compile(next.gl,legacy);assert.equal(owner.stats.ownedLegacyPrograms,1);assert.notEqual(owner.stats.resourceObjects.contextId,other.stats.resourceObjects.contextId,'a replacement GL context has a distinct diagnostic identity');assert.equal(owner.stats.resourceObjects.createdPrograms,1);assert.equal(owner.stats.resourceObjects.deleteProgramRequests,0);assert.equal(other.stats.resourceObjects.createdPrograms,3);assert.equal(other.stats.resourceObjects.deleteProgramRequests,1,'old context counts retain only the healthy legacy release issued so far');
  const deletes=next.deleted.length,oldDeletes=first.deleted.length;owner.releaseProgram(first.gl,lost);owner.releaseProgram(first.gl,restored);owner.releaseProgram(first.gl,borrowed);assert.equal(first.deleted.length,oldDeletes);assert.equal(next.deleted.length,deletes);next.gl.useProgram(current);first.gl.useProgram(borrowed);other.dispose();assert.equal(first.deleted.filter(value=>value===borrowed).length,1);
  const newer=driver();next.gl.lost=true;const lostContextDeletes=next.deleted.length;pending(()=>owner.compile(newer.gl,legacy));assert.equal(owner.stats.ownedLegacyPrograms,0);assert.equal(next.deleted.length,lostContextDeletes);t.all();const newest=owner.compile(newer.gl,legacy);next.gl.lost=false;owner.releaseProgram(next.gl,current);assert.equal(next.deleted.length,lostContextDeletes);newer.gl.useProgram(newest);owner.dispose();assert.equal(owner.stats.ownedLegacyPrograms,0);assert.equal(newer.deleted.filter(value=>value===newest).length,1);
  const healthy=driver(),sharedOnly=driver(),switching=createProgramPreparationOwner('switching',()=>{}),peer=createProgramPreparationOwner('healthy peer',()=>{});pending(()=>switching.compile(healthy.gl,legacy));pending(()=>peer.compile(healthy.gl,legacy));t.all();switching.compile(healthy.gl,legacy);const peerProgram=peer.compile(healthy.gl,legacy);pending(()=>switching.compile(sharedOnly.gl,shared));t.all();switching.compile(sharedOnly.gl,shared);sharedOnly.gl.lost=true;switching.contextLost();assert.equal(peer.stats.context.epoch,0,'shared-only replacement must not leave local contextLost targeting the previous healthy context');healthy.gl.useProgram(peerProgram);assert.equal(switching.stats.ownedLegacyPrograms,0);switching.dispose();peer.dispose();
 }finally{t.restore();}
});


test('provenance authority copies immutable metadata and rejects mutable or scope-like inputs before admission',()=>{
 const builder=function paintSource(){},sameName=function paintSource(){},inputs=['canonical:one'],builders=[builder];
 const authority=createProgramSourceAuthority({inputs,builders});inputs[0]='mutated';builders[0]=sameName;
 assert(Object.isFrozen(authority));assert(Object.isFrozen(authority.inputs));assert(Object.isFrozen(authority.builders));assert.deepEqual(authority.inputs,['canonical:one']);assert.equal(authority.builders[0],builder);
 assert.notEqual(createProgramSourceAuthority({inputs:authority.inputs,builders:authority.builders}),authority,'new equal metadata is a distinct authority, not an interned hash');
 assert.notEqual(builder,sameName);assert.equal(builder.name,sameName.name);
 assert.throws(()=>createProgramSourceAuthority({inputs:[undefined],builders:[builder]}),TypeError);assert.throws(()=>createProgramSourceAuthority({inputs:['x'],builders:['paintSource']}),TypeError);
 const t=turns();try{
  const f=driver(),owner=createProgramPreparationOwner('provenance validation',()=>{}),base={...recipe(),sharedKey:'provenance-abi'};
  const invalid=[{kind:'immutable-program-source',inputs:Object.freeze(['x']),builders:Object.freeze([builder])},Object.freeze({kind:'immutable-program-source',inputs:['x'],builders:Object.freeze([builder])}),Object.freeze({kind:'immutable-program-source',inputs:Object.freeze(['x']),builders:[builder]}),Object.freeze({kind:'immutable-program-source',inputs:Object.freeze(['x']),builders:Object.freeze(['paintSource'])}),Object.freeze({kind:'immutable-program-source',get inputs(){return Object.freeze(['x']);},builders:Object.freeze([builder])}),Object.freeze({disposed:false,borrow(){}})];
  for(const value of invalid){assert.throws(()=>owner.compile(f.gl,{...base,provenance:[value]}),TypeError);assert.throws(()=>owner.acquireReadyProgram(f.gl,{...base,provenance:[value]}),TypeError);}
  assert.equal(t.queue.length,0);assert.equal(f.calls.length,0);assert.equal(owner.stats.shared.heldReferences,0);owner.dispose();
 }finally{t.restore();}
});

test('provenance ready acquisition transfers one executable across scope generations before the old grant releases',()=>{
 const t=turns();try{
  const f=driver(),owner=createProgramPreparationOwner('provenance generations',()=>{}),authority=createProgramSourceAuthority({inputs:['canonical:facade','assembly:v1'],builders:[function assemble(){},function specialize(){}]});
  let currentScope={revision:1},builds=0;const oldScope=currentScope,build=()=>{builds++;return{vertex:'exact vertex',fragment:'exact fragment',attributes:['a_position','a_family']};};
  const identity={sharedKey:'exact-abi',resource:'city:base:family:7',inputs:['vertex:v1','helper:v1','prune:true','attributes:position,family'],provenance:[authority]};
  assert.equal(owner.acquireReadyProgram(f.gl,{...identity,current:()=>currentScope===oldScope}),undefined);assert.equal(t.queue.length,0);
  pending(()=>owner.compile(f.gl,{...identity,current:()=>currentScope===oldScope,build}));t.all();
  const old=owner.acquireReadyProgram(f.gl,{...identity,current:()=>currentScope===oldScope});assert(old?.program);assert.equal(owner.stats.shared.ready,0,'ready-only transfer consumes the existing pending subscription');
  currentScope={revision:2};const nextScope=currentScope;owner.prune();const next=owner.acquireReadyProgram(f.gl,{...identity,current:()=>currentScope===nextScope});assert.equal(next,old);assert.equal(owner.stats.shared.grantedReferences,2);assert.equal(owner.stats.shared.heldReferences,2);
  assert.equal(builds,1);assert.equal(f.calls.filter(call=>call.name==='createProgram').length,1);assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,1);
  owner.releaseProgram(f.gl,old);assert.equal(next.deleted,false);f.gl.useProgram(next);owner.releaseProgram(f.gl,next);assert.equal(next.deleted,true);assert.equal(f.deleted.filter(value=>value===next).length,1);
  assert.equal(owner.acquireReadyProgram(f.gl,{...identity,current:()=>true}),undefined,'the final release leaves no idle executable cache');assert.equal(t.queue.length,0);assert.equal(builds,1);owner.dispose();
 }finally{t.restore();}
});

test('provenance and complete source attribute identities reject false ready hits and compile separate executables',()=>{
 const t=turns();try{
  const f=driver(),owner=createProgramPreparationOwner('provenance separation',()=>{}),builder=function sourceBuilder(){},otherBuilder=function sourceBuilder(){},authority=createProgramSourceAuthority({inputs:['canonical:one'],builders:[builder]});let builds=0;
  const base={sharedKey:'source-abi-v1',resource:'base:family:7',inputs:['helper:one','prune:false','attributes:position,family'],provenance:[authority],build(){builds++;return{vertex:'vertex',fragment:'fragment',attributes:['a_position','a_family']};}};
  pending(()=>owner.compile(f.gl,base));t.all();const original=owner.compile(f.gl,base);
  const variants=[{label:'fresh authority',provenance:[createProgramSourceAuthority({inputs:authority.inputs,builders:authority.builders})]},{label:'same-name builder',provenance:[createProgramSourceAuthority({inputs:authority.inputs,builders:[otherBuilder]})]},{label:'helper',inputs:['helper:two',...base.inputs.slice(1)]},{label:'effective prune',inputs:[base.inputs[0],'prune:true',base.inputs[2]]},{label:'attribute bindings',inputs:[...base.inputs.slice(0,2),'attributes:family,position']},{label:'source key',resource:'other-source:family:7'},{label:'family',resource:'base:family:8'}];
  for(const variant of variants){const changed={...base,...variant,build(){builds++;return{vertex:'vertex',fragment:'fragment '+variant.label,attributes:variant.label==='attribute bindings'?['a_family','a_position']:['a_position','a_family']};}};assert.equal(owner.acquireReadyProgram(f.gl,changed),undefined,variant.label);assert.equal(t.queue.length,0,variant.label+' miss must not create a job');pending(()=>owner.compile(f.gl,changed));t.all();const program=owner.acquireReadyProgram(f.gl,changed);assert(program?.program);assert.notEqual(program,original,variant.label);owner.releaseProgram(f.gl,program);assert.equal(program.deleted,true);assert.equal(original.deleted,false);}
  assert.equal(builds,variants.length+1);assert.equal(f.calls.filter(call=>call.name==='createProgram').length,variants.length+1);owner.releaseProgram(f.gl,original);owner.dispose();assert.equal(f.deleted.filter(value=>value.program).length,variants.length+1);
 }finally{t.restore();}
});

test('provenance snapshots its exact ordered authority sequence without retaining the caller array',()=>{
 const t=turns();try{
  const f=driver(),owner=createProgramPreparationOwner('provenance snapshot',()=>{}),a=createProgramSourceAuthority({inputs:['a'],builders:[function a(){}]}),b=createProgramSourceAuthority({inputs:['b'],builders:[function b(){}]}),provenance=[a,b],r={...recipe('snapshot'),sharedKey:'snapshot-abi',provenance};
  pending(()=>owner.compile(f.gl,r));provenance.reverse();t.all();
  assert.equal(owner.acquireReadyProgram(f.gl,r),undefined);assert.equal(owner.acquireReadyProgram(f.gl,{...r,provenance:[a]}),undefined);assert.equal(owner.acquireReadyProgram(f.gl,{...r,provenance:undefined}),undefined);
  const program=owner.acquireReadyProgram(f.gl,{...r,provenance:[a,b]});assert(program?.program);assert.equal(owner.stats.shared.ready,0);assert.equal(f.calls.filter(call=>call.name==='createProgram').length,1);owner.releaseProgram(f.gl,program);owner.dispose();
 }finally{t.restore();}
});

test('provenance cancellation preserves old holders and context loss forbids stale ready acquisition',()=>{
 const t=turns();try{
  const f=driver(),owner=createProgramPreparationOwner('provenance lifecycle',()=>{}),authority=createProgramSourceAuthority({inputs:['canonical:one'],builders:[function source(){}]});let builds=0,live=true;
  const r={...recipe('base','visible',()=>{builds++;return{vertex:'v',fragment:'f',attributes:[]};}),sharedKey:'lifecycle-abi',provenance:[authority]};
  pending(()=>owner.compile(f.gl,r));t.all();const old=owner.compile(f.gl,r);let candidateBuilds=0;
  const candidate={...r,resource:'new-candidate',current:()=>live,build(){candidateBuilds++;throw Error('cancelled candidate built');}};pending(()=>owner.compile(f.gl,candidate));live=false;owner.cancel();t.all();assert.equal(candidateBuilds,0);assert.equal(old.deleted,false);f.gl.useProgram(old);
  pending(()=>owner.acquireReadyProgram(f.gl,{...r,current:()=>false}),'cancelled');assert.equal(owner.stats.shared.heldReferences,1);
  const before=f.deleted.length;f.gl.lost=true;pending(()=>owner.acquireReadyProgram(f.gl,r),'lost');assert.equal(owner.stats.shared.heldReferences,0);owner.releaseProgram(f.gl,old);assert.equal(f.deleted.length,before);
  f.gl.lost=false;assert.equal(owner.acquireReadyProgram(f.gl,r),undefined);assert.equal(t.queue.length,0);pending(()=>owner.compile(f.gl,r));t.all();const restored=owner.acquireReadyProgram(f.gl,r);assert(restored?.program);assert.notEqual(restored,old);assert.equal(builds,2);owner.releaseProgram(f.gl,restored);assert.equal(f.deleted.filter(value=>value===restored).length,1);assert.equal(f.deleted.filter(value=>value===old).length,0);
  assert.equal(owner.acquireReadyProgram(f.gl,{...r,sharedKey:undefined}),undefined,'legacy recipes do not acquire shared programs');owner.dispose();pending(()=>owner.acquireReadyProgram(f.gl,r),'cancelled');
 }finally{t.restore();}
});


test('provenance pending subscribers keep separate scope guards and only the admitted live builder constructs',()=>{
 const t=turns();try{
  const f=driver(),first=createProgramPreparationOwner('provenance stale scope',()=>{}),next=createProgramPreparationOwner('provenance current scope',()=>{}),authority=createProgramSourceAuthority({inputs:['canonical:shared'],builders:[function rawFacade(){},function assembly(){}]});
  let firstLive=true,staleBuilds=0,liveBuilds=0;const identity={sharedKey:'live-source-abi',resource:'city:source:family:11',inputs:['helper:one','prune:true','attributes:position'],provenance:[authority]};
  pending(()=>first.compile(f.gl,{...identity,current:()=>firstLive,build(){staleBuilds++;throw Error('stale scope source must not construct');}}));
  pending(()=>next.compile(f.gl,{...identity,current:()=>true,build(){liveBuilds++;return{vertex:'live vertex',fragment:'live fragment',attributes:['a_position']};}}));
  firstLive=false;assert.equal(next.stats.context.pending,1);t.all();assert.equal(staleBuilds,0);assert.equal(liveBuilds,1);assert.equal(f.calls.filter(call=>call.name==='createProgram').length,1);
  const program=next.acquireReadyProgram(f.gl,{...identity,current:()=>true});assert(program?.program);assert.equal(first.stats.shared.heldReferences,0);first.cancel();assert.equal(program.deleted,false);f.gl.useProgram(program);next.releaseProgram(f.gl,program);assert.equal(f.deleted.filter(value=>value===program).length,1);first.dispose();next.dispose();
 }finally{t.restore();}
});

function programBudgetFixture(f,limitBytes=640){
 const budget=createResourceBudget({limitBytes,recentLimitBytes:0}),store=createChunkResourceStore({budget});bindChunkResourceContext(f.gl,store);assert.equal(getChunkResourceStoreForContext(f.gl),store,'production owner and fixture bind the same page ledger');return{budget,store};
}
function finishBudgetFixture(t,f,store,owners){
 f.gl.complete=true;f.gl.fenceComplete=true;for(const owner of owners)owner.dispose();t.all();store.collectRetired();store.destroy();store.collectRetired();assert.equal(store.budget.stats.bytes,0);
}
const withProgramBudget=r=>({...r,budget:{sourceBytesUpperBound:512,submittedAllowanceBytes:128}});

test('shared budget waiting does not consume the builder before admission, and queued polls select the current source owner',()=>{
 const t=turns(),f=driver(),{budget,store}=programBudgetFixture(f),owner=createProgramPreparationOwner('source-builder-budget',()=>{}),busy=budget.reserve({category:'construction',bytes:640,precision:'exact'});
 let reads=0,builds=0,build=()=>assert.fail('replaced queued source owner must not build');
 const r={resource:'budgeted-source',sharedKey:'budgeted-source-v1',inputs:['immutable budgeted source'],budget:{sourceBytesUpperBound:512,submittedAllowanceBytes:128},get build(){reads++;return build;}};
 try{
  pending(()=>owner.compile(f.gl,r));pending(()=>owner.compile(f.gl,r));assert.equal(reads,0);assert.equal(builds,0);assert.equal(t.queue.length,0);assert.equal(f.calls.length,0);
  busy.release();pending(()=>owner.compile(f.gl,r));assert.equal(reads,1);assert.equal(builds,0);assert.equal(budget.stats.bytes,640,'the complete source and driver envelope is reserved before construction');
  build=()=>{builds++;return{vertex:'budgeted vertex',fragment:'budgeted fragment',attributes:[]};};pending(()=>owner.compile(f.gl,r));assert.equal(reads,2);assert.equal(f.calls.length,0);
  t.all();const program=owner.compile(f.gl,r);assert.equal(builds,1);assert.equal(reads,2);assert.equal(budget.stats.categories.program.bytes,128);
  assert.deepEqual(f.calls.filter(call=>call.name==='shaderSource').map(call=>call.args[1]),['budgeted vertex','budgeted fragment']);owner.releaseProgram(f.gl,program);store.collectRetired();assert.equal(budget.stats.bytes,0);
 }finally{busy.release();finishBudgetFixture(t,f,store,[owner]);t.restore();}
});

test('program budget admission waits without source construction or driver work and wakes through the real page ledger',()=>{
 const t=turns(),f=driver(),{budget,store}=programBudgetFixture(f),owner=createProgramPreparationOwner('budget-blocked',()=>{});let builds=0;
 const busy=budget.reserve({category:'construction',bytes:640,precision:'exact'}),r=withProgramBudget(recipe('budget-gate','visible',()=>{builds++;return{vertex:'original vertex',fragment:'original fragment',attributes:[]};}));
 try{
  pending(()=>owner.compile(f.gl,r));assert.equal(builds,0);assert.equal(f.calls.length,0);assert.equal(t.queue.length,0);assert.equal(budget.stats.reservations,1);assert.equal(owner.stats.budget.waitingForAvailability,true);assert.equal(owner.stats.pending,1);assert.equal(owner.stats.pendingResources[0].phase,'budget-admission');
  busy.release();assert.equal(owner.stats.budget.waitingForAvailability,false);pending(()=>owner.compile(f.gl,r));assert.equal(builds,0);assert.equal(budget.stats.reservations,1);t.all();
  const program=owner.compile(f.gl,r);assert.equal(builds,1);assert.equal(owner.stats.budget.budgetedRecipes,1);assert.equal(owner.stats.budget.driverAllowanceRecipes,1);assert.equal(budget.stats.categories.program.bytes,128);f.gl.useProgram(program);
  owner.releaseProgram(f.gl,program);assert.equal(program.deleted,true);assert.equal(budget.stats.bytes,128,'delete request alone does not return the linked allowance');store.collectRetired();assert.equal(budget.stats.bytes,0);assert.equal(f.deletedSyncs.length,1);
 }finally{busy.release();finishBudgetFixture(t,f,store,[owner]);t.restore();}
});

test('two exact shared program consumers use one admitted ticket and build; cancelling one preserves the other production',()=>{
 const t=turns(),f=driver(),{budget,store}=programBudgetFixture(f),a=createProgramPreparationOwner('budget-shared-a',()=>{}),b=createProgramPreparationOwner('budget-shared-b',()=>{});let builds=0;
 const build=()=>{builds++;return{vertex:'shared vertex',fragment:'shared fragment',attributes:['a_position']};},authority=createProgramSourceAuthority({inputs:['budget ABI'],builders:[build]}),r={...withProgramBudget(recipe('budget-shared','visible',build)),sharedKey:'budget-shared-abi',provenance:[authority]};
 try{
  pending(()=>a.compile(f.gl,r));pending(()=>b.compile(f.gl,r));assert.equal(budget.stats.reservations,1);assert.equal(budget.stats.bytes,640,'shared subscribers cannot each reserve the complete source bound');a.cancel();assert.equal(builds,0);assert.equal(b.stats.budget.waitingForAvailability,false);
  t.all();const program=b.compile(f.gl,r);assert.equal(builds,1);assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,1);assert.equal(a.stats.shared.heldReferences,0);assert.equal(b.stats.shared.heldReferences,1);assert.equal(b.stats.budget.budgetedRecipes,1);assert.equal(budget.stats.reservations,1);assert.equal(budget.stats.bytes,128);
  b.releaseProgram(f.gl,program);assert.equal(budget.stats.bytes,128);store.collectRetired();assert.equal(budget.stats.bytes,0);
 }finally{finishBudgetFixture(t,f,store,[a,b]);t.restore();}
});

test('abandoned submitted program allowance remains charged through KHR drain, delete and the real retirement fence',()=>{
 const t=turns(),f=driver({parallel:true}),{budget,store}=programBudgetFixture(f),owner=createProgramPreparationOwner('budget-abandoned',()=>{}),r=withProgramBudget(recipe('budget-drain'));f.gl.complete=false;f.gl.fenceComplete=false;
 try{
  pending(()=>owner.compile(f.gl,r));t.until(()=>f.calls.some(call=>call.name==='linkProgram'));const program=f.created.find(value=>value.program);owner.cancel();
  assert.equal(owner.stats.context.retiring,1);assert.equal(owner.stats.sourceRetainedCharacters,0);assert.equal(budget.stats.bytes,128);assert.equal(budget.stats.retiringBytes,128);assert.equal(budget.stats.categories['program-retiring'].bytes,128);assert.equal(program.deleted,false);
  t.one();assert.equal(program.deleted,false);assert.equal(budget.stats.bytes,128);f.setCompletion(program);t.all();assert.equal(program.deleted,true);assert.equal(owner.stats.context.submitted,0);assert.equal(budget.stats.bytes,128);assert.equal(f.fences.length,1);assert.equal(f.deletedSyncs.length,0);
  store.collectRetired();assert.equal(budget.stats.bytes,128);f.gl.fenceComplete=true;store.collectRetired();assert.equal(budget.stats.bytes,0);assert.equal(f.deletedSyncs.length,1);assert.equal(f.deleted.filter(value=>value===program).length,1);
 }finally{finishBudgetFixture(t,f,store,[owner]);t.restore();}
});

test('an exact linked resubscription resumes its original budget ticket without rebuilding or readmitting the source bound',()=>{
 const t=turns(),f=driver({parallel:true}),{budget,store}=programBudgetFixture(f),a=createProgramPreparationOwner('budget-old',()=>{}),b=createProgramPreparationOwner('budget-new',()=>{});f.gl.complete=false;let live=true,builds=0;
 const build=()=>{builds++;return{vertex:'immutable vertex',fragment:'immutable fragment',attributes:[]};},authority=createProgramSourceAuthority({inputs:['resume budget ABI'],builders:[build]}),shared={...withProgramBudget(recipe('budget-resume','visible',build)),sharedKey:'budget-resume-abi',provenance:[authority]},old={...shared,current:()=>live},next={...shared,current:()=>true};
 try{
  pending(()=>a.compile(f.gl,old));t.until(()=>f.calls.some(call=>call.name==='linkProgram'));const program=f.created.find(value=>value.program);live=false;a.prune();assert.equal(budget.stats.retiringBytes,128);assert.equal(budget.stats.reservations,1);
  // Only 512 bytes remain free: a second 640-byte source ticket cannot fit.
  pending(()=>b.compile(f.gl,next));assert.equal(b.stats.budget.waitingForAvailability,false);assert.equal(budget.stats.reservations,1);assert.equal(budget.stats.bytes,128);assert.equal(budget.stats.retiringBytes,0);assert.equal(builds,1);assert.equal(b.stats.context.retiring,0);
  f.setCompletion(program);t.all();assert.equal(b.compile(f.gl,next),program);assert.equal(builds,1);assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,1);assert.equal(budget.stats.bytes,128);b.releaseProgram(f.gl,program);store.collectRetired();assert.equal(budget.stats.bytes,0);
 }finally{finishBudgetFixture(t,f,store,[a,b]);t.restore();}
});

test('shared resource pack work follows its production signal and survives renderer owner cancellation',async()=>{
 const t=turns(),f=driver(),{budget,store}=programBudgetFixture(f),owner=createProgramPreparationOwner('view-only',()=>{}),source=new AbortController(),cancelled=new AbortController();let packs=0;
 try{
  const value={packed:new Float32Array([1,2,3])},work=scheduleRenderResourceWork(f.gl,{resource:'shared-pack',signal:source.signal,phase:'source-build',work(){packs++;return value;}});
  owner.work(f.gl,{resource:'view-work',revision:1,retainReady:false,current:()=>true,work(){assert.fail('renderer-owned work was cancelled');}});owner.cancel();t.all();assert.equal(await work,value);assert.equal(packs,1);assert.equal(f.calls.length,0);assert.equal(budget.stats.bytes,0);
  const stopped=scheduleRenderResourceWork(f.gl,{resource:'cancelled-pack',signal:cancelled.signal,work(){assert.fail('aborted shared production must not pack');}}),rejection=assert.rejects(stopped,error=>error.name==='AbortError');cancelled.abort();t.all();await rejection;assert.equal(packs,1);assert.equal(owner.stats.context.pending,0);assert.equal(t.queue.length,0);
  const stale=scheduleRenderResourceWork(f.gl,{resource:'queued-old-epoch-pack',signal:source.signal,work(){assert.fail('a queued old-epoch pack must not execute');}}),lost=assert.rejects(stale,error=>isProgramPreparationPending(error)&&error.status==='lost');owner.contextLost();t.all();await lost;assert.equal(packs,1);assert.equal(owner.stats.context.pending,0);
 }finally{source.abort();cancelled.abort();finishBudgetFixture(t,f,store,[owner]);t.restore();}
});

test('a pack result returned during cancellation or epoch loss reaches the actual store for disposal or live CPU publication',async()=>{
 for(const action of ['abort','epoch-and-abort','epoch-only']){
  const t=turns(),f=driver(),{budget,store}=programBudgetFixture(f),view=createProgramPreparationOwner('late-pack-view',()=>{}),controller=new AbortController();let source,consumer,produced,payload,packs=0,disposed=0,parentsDisposed=0;
  try{
   source=store.acquire({contentKey:'late-pack-source',role:'source',estimate:{category:'decoded',bytes:16,precision:'exact'},produce:()=>({canonical:true}),dispose(){parentsDisposed++;}});await source.ready;
   // Bind a renderer owner to this exact shared scheduler before reentrant loss.
   view.work(f.gl,{resource:'late-pack-view-bind',revision:1,retainReady:false,current:()=>true,work(){}});
   consumer=store.acquire({contentKey:'late-packed-result',role:'candidate',signal:controller.signal,estimate:{category:'packed',bytes:64,precision:'estimate'},
    produce(context){produced=scheduleRenderResourceWork(f.gl,{resource:'late-packed-result',signal:context.signal,work(){packs++;payload={packed:new Float32Array([1,2,3]),parent:source.retain('dependency')};source.release();if(action!=='abort')view.contextLost();if(action!=='epoch-only')controller.abort();return payload;}});return produced;},
    costs:value=>({category:'packed',bytes:value.packed.byteLength,precision:'exact',identity:value.packed.buffer}),dispose(value){assert.equal(value,payload);disposed++;value.parent.release();}});
   const ready=consumer.ready.then(()=>({status:'ready'}),error=>({status:'error',error}));await Promise.resolve();assert(produced,'actual store producer must reach the existing context scheduler');t.all();
   const terminal=await ready;assert.equal(await produced,payload,'a returned value is handed back to its production owner even after scheduler termination');for(let turn=0;turn<8;turn++)await Promise.resolve();assert.equal(packs,1);assert.equal(f.calls.length,0);
   if(action==='epoch-only'){assert.equal(terminal.status,'ready');assert.equal(consumer.value,payload,'GPU epoch loss does not invalidate a live canonical CPU result');assert.equal(disposed,0);assert.equal(parentsDisposed,0);assert.equal(budget.stats.bytes,16+payload.packed.byteLength);consumer.release();}
   else{assert.equal(terminal.status,'error');assert.equal(terminal.error.name,'AbortError');assert.equal(consumer.released,true);assert.equal(consumer.value,undefined,'an aborted consumer never receives a ready payload');}
   assert.equal(disposed,1);assert.equal(parentsDisposed,1);assert.equal(budget.stats.bytes,0,'late completion releases both packed and parent ownership');
  }finally{controller.abort();consumer?.release();source?.release();payload?.parent.release();finishBudgetFixture(t,f,store,[view]);t.restore();}
 }
});

test('bounded shared resource steps retain one job and use the existing dispatch limits and diagnostic label',async()=>{
 for(const costMs of [.01,.75]){
  const t=turns(),f=driver(),{store}=programBudgetFixture(f),view=createProgramPreparationOwner('step-observer',()=>{}),controller=new AbortController();let count=0;
  try{
   view.work(f.gl,{resource:'bind-observer',revision:1,retainReady:false,current:()=>true,work(){}});t.all();
   const before=view.stats.context.dispatch,work=scheduleRenderResourceSteps(f.gl,{resource:'large-packed-block',signal:controller.signal,label:'pack:vertices',step(){count++;t.advance(costMs);return count===35;}});
   t.one();assert.equal(count,costMs===.75?6:16,'one turn is limited by 4 ms or 16 bounded steps');
   assert.equal(view.stats.context.pending,1);assert.equal(t.queue.length,1,'steps share one continuation timer');
   t.all();assert.equal(await work,undefined);assert.equal(count,35);assert.equal(view.stats.context.pending,0);
   const after=view.stats.context.dispatch;assert.equal(after.visibleStartsTotal-before.visibleStartsTotal,1,'all windows belong to one admitted job');
   assert.equal(after.steps-before.steps,35);assert.equal(after.longestTurn.source,'shared-resource-source-build:pack:vertices');
   assert.equal(after.longestTurn.phase,'source-build');assert.equal(after.longestTurn.resource,'large-packed-block');assert.equal(f.calls.length,0);
  }finally{controller.abort();finishBudgetFixture(t,f,store,[view]);t.restore();}
 }
});

test('shared resource labels remain one fair group and long packs yield to another provider and sibling packs',async()=>{
 const t=turns(),f=driver(),view=createProgramPreparationOwner('tier300 bremen',()=>{}),controller=new AbortController(),steps=Array(12).fill(0),events=[],work=[];
 try{
  for(let i=0;i<steps.length;i++)work.push(scheduleRenderResourceSteps(f.gl,{resource:'packed:'+i,label:'different-diagnostic-label:'+i,signal:controller.signal,step(){events.push('pack:'+i);steps[i]++;t.advance(4);return steps[i]===3;}}));
  t.one();assert.deepEqual(events,['pack:0']);
  const preflight={resource:'material-source-preflight',revision:1,phase:'source-build',current:()=>true,work(){events.push('preflight');t.advance(4);}};view.work(f.gl,preflight);t.one();
  assert.deepEqual(events,['pack:0','preflight'],'changing resource/label never gives shared packing twelve owner turns before the provider');
  for(let i=1;i<steps.length;i++)t.one();assert.deepEqual(steps,Array(12).fill(1),'a large pack also yields to other jobs inside the shared-resource group');
  t.all();await Promise.all(work);assert.deepEqual(steps,Array(12).fill(3));assert.equal(view.work(f.gl,preflight),true);assert.equal(view.stats.context.pending,0);assert.equal(view.stats.context.admitted,0);assert.equal(f.calls.length,0);
 }finally{controller.abort();view.dispose();t.all();await Promise.allSettled(work);t.restore();}
});

test('bounded shared resource work rejects unfinished cancellation, context loss and step exceptions without continuing',async()=>{
 for(const action of ['queued-abort','abort','loss','throw']){
  const t=turns(),f=driver(),{store}=programBudgetFixture(f),view=createProgramPreparationOwner('cancel-step-observer',()=>{}),controller=new AbortController(),error=new Error('packing step failed');let count=0;
  try{
   view.work(f.gl,{resource:'bind-cancel-observer',revision:1,retainReady:false,current:()=>true,work(){}});t.all();
   const work=scheduleRenderResourceSteps(f.gl,{resource:'unfinished-block',signal:controller.signal,step(){count++;if(action==='abort')controller.abort();else if(action==='loss')view.contextLost();else if(action==='throw')throw error;return false;}});
   const rejected=assert.rejects(work,failure=>action==='throw'?failure===error:action==='loss'?isProgramPreparationPending(failure)&&failure.status==='lost':failure.name==='AbortError');
   if(action==='queued-abort')controller.abort();t.all();await rejected;
   assert.equal(count,action==='queued-abort'?0:1);assert.equal(view.stats.context.pending,0);assert.equal(t.queue.length,0);
  }finally{controller.abort();finishBudgetFixture(t,f,store,[view]);t.restore();}
 }
});

test('store scheduled steps retain reservations and parents through yields and dispose a completed late result once',async()=>{
 for(const action of ['ready','abort','epoch-and-abort','epoch-only']){
  const t=turns(),f=driver(),{budget,store}=programBudgetFixture(f),view=createProgramPreparationOwner('late-steps-view',()=>{}),controller=new AbortController();let source,consumer,steps=0,disposed=0,parentsDisposed=0,payload;
  try{
   source=store.acquire({contentKey:'steps-source',role:'source',estimate:{category:'decoded',bytes:16,precision:'exact'},produce:()=>({canonical:true}),dispose(){parentsDisposed++;}});await source.ready;
   view.work(f.gl,{resource:'bind-steps-view',revision:1,retainReady:false,current:()=>true,work(){}});t.all();
   consumer=store.acquire({contentKey:'stepped-pack',role:'candidate',signal:controller.signal,parents:[source],estimate:{category:'packed',bytes:64,precision:'estimate'},
    async produce(context){await context.scheduleSteps(f.gl,()=>{
     steps++;t.advance(5);assert.equal(budget.stats.bytes,80,'the entire admitted claim survives each partial step');assert.equal(parentsDisposed,0);
     if(steps<2)return false;
     payload={packed:new Float32Array([1,2,3])};
     if(action==='epoch-and-abort'||action==='epoch-only')view.contextLost();if(action==='abort'||action==='epoch-and-abort')controller.abort();return true;
    },{label:'pack:finish'});return payload;},
    costs:value=>({category:'packed',bytes:value.packed.byteLength,precision:'exact',identity:value.packed.buffer}),dispose(value){assert.equal(value,payload);disposed++;}});
   source.release();const ready=consumer.ready.then(()=>({status:'ready'}),error=>({status:'error',error}));await Promise.resolve();t.one();
   assert.equal(steps,1);assert.equal(consumer.value,undefined,'partial output is never published');assert.equal(budget.stats.bytes,80);
   t.all();const terminal=await ready;for(let turn=0;turn<8;turn++)await Promise.resolve();assert.equal(steps,2);
   if(action==='ready'||action==='epoch-only'){
    assert.equal(terminal.status,'ready');assert.equal(consumer.value,payload);assert.equal(disposed,0);assert.equal(parentsDisposed,0);assert.equal(budget.stats.bytes,28);consumer.release();
   }else{assert.equal(terminal.status,'error');assert.equal(terminal.error.name,'AbortError');assert.equal(consumer.value,undefined);}
   assert.equal(disposed,1);assert.equal(parentsDisposed,1);assert.equal(budget.stats.bytes,0);
  }finally{controller.abort();consumer?.release();source?.release();finishBudgetFixture(t,f,store,[view]);t.restore();}
 }
});

test('Bremen recipe polling describes source only at a new admitted compile, preserving the full budget',()=>{
 const text=readFileSync(new URL('../src/painted/bremen/safety/building-mesh-renderer.ts',import.meta.url),'utf8');
 const ast=ts.createSourceFile('bremen-renderer.ts',text,ts.ScriptTarget.Latest,true);let initializer;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='geometryProgramRecipe')initializer=node.initializer.getText(ast);ts.forEachChild(node,visit);};visit(ast);assert(initializer);
 const {familyPaintRecipeKey}=loadProductionModule(new URL('../src/safety/family-paint-program.ts',import.meta.url));
 const sb=loadProductionModule(new URL('../src/safety/render-runtime/shader-source-budget.ts',import.meta.url));
 const assembly=loadProductionModule(new URL('../src/safety/render-runtime/shader-assembly-budget.ts',import.meta.url));
 const {createPreparedSourceWorkspace}=loadProductionModule(new URL('../src/safety/prepared-source.ts',import.meta.url));
 const raw='vec3 paintedFacade(vec3 base){return base;}';
 const helper='precision highp float;',vertex='void main(){gl_Position=vec4(0.);}';
 const fragmentParts=(h,p)=>sb.shaderSourceParts`${h}\n${p}\nvoid main(){}`;
 const fragment=(h,p)=>sb.emitShaderSource(fragmentParts(h,p));
 const bounds=sb.shaderSourceBounds(sb.shaderSourceText(raw));
 const t=turns();let store,owner,workspace;
 try{
  const f=driver({parallel:true}),budget=createResourceBudget({limitBytes:16*1024*1024,recentLimitBytes:0});
  store=createChunkResourceStore({budget});bindChunkResourceContext(f.gl,store);
  let descriptions=0,builds=0,valid=true;
  workspace=createPreparedSourceWorkspace({budget,current:()=>valid,build(){builds++;return raw;},specialize:source=>({fragment:source,depthEffects:false})});
  const plan={partitionEnabled:true,programSourceInputs:['same-source'],programSourceProvenance:[],describeSourceBounds(){descriptions++;return bounds;},programBudget:workspace.programBudget,prepareSource:workspace.prepareSource};
  const authority=createProgramSourceAuthority({inputs:['tiny-shell-v1'],builders:[fragment]});
  const bindings={familyPaintRecipeKey,baseSurfaceFragment:helper,surfaceFragment:helper,diffuseFragment:undefined,VERTEX:vertex,COLOUR_ATTRIBUTES:['a_position'],COLOUR_ASSEMBLY_AUTHORITY:authority,city:'bremen',residentProgramPlan:plan,currentDataScope:undefined,legacyPartitionEnabled:true,progressiveShaderSpecialization:undefined,programPlanScope:()=>({}),pruneFamilySource:()=>false,geometryProgramConsumer:()=>valid?plan:undefined,geometryProgramDemand:()=>valid,fragment,fragmentParts,pruneOwner6307Fragment:x=>x,withResidentReflectionClip:x=>x,...assembly};
  const code=ts.transpileModule('const make='+initializer+';return make;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const make=Function(...Object.keys(bindings),code)(...Object.values(bindings));
  owner=createProgramPreparationOwner('Bremen lazy descriptor',()=>{});
  for(let i=0;i<40;i++)assert.equal(owner.acquireReadyProgram(f.gl,make(helper,'base',false,false,[0],plan)),undefined);
  assert.equal(descriptions,0,'ready-only misses must not scan source or populate a descriptor cache');assert.equal(builds,0);assert.equal(budget.stats.bytes,0);assert.equal(t.queue.length,0);
  f.gl.complete=false;
  pending(()=>owner.compile(f.gl,make(helper,'base',false,false,[0],plan)));
  assert.equal(descriptions,1,'first admission still describes the complete source envelope');
  const expected=workspace.programBudget({sourceKey:'base',inputs:[vertex,helper,false,fragment,bindings.pruneOwner6307Fragment,bindings.withResidentReflectionClip],sourceBounds:assembly.describeShaderAssemblyBounds(bounds,fragmentParts(helper,assembly.shaderSourceBoundPart(bounds,plan)),{prune:false,reflectionClip:true}),assemble:p=>fragment(helper,p)},vertex,['a_position'],[0]);
  assert.equal(budget.stats.categories['program-source'].bytes,expected.sourceBytesUpperBound+expected.workspaceCosts.filter(c=>c.category==='program-source').reduce((n,c)=>n+c.bytes,0),'lazy lookup does not reduce admission bytes');
  for(let i=0;i<40;i++)pending(()=>owner.compile(f.gl,make(helper,'base',false,false,[0],plan)));
  assert.equal(descriptions,1,'existing queued demand needs no repeated lexical scan');
  t.until(()=>f.calls.some(c=>c.name==='linkProgram'));
  assert.equal(builds,1);assert.equal(descriptions,2,'the latest pending subscriber describes once when its deferred build actually runs');
  const duringBuild=descriptions;
  for(let i=0;i<20;i++)pending(()=>owner.compile(f.gl,make(helper,'base',false,false,[0],plan)));
  assert.equal(descriptions,duringBuild,'KHR completion polling does not rebuild bounds');
  f.gl.complete=true;t.all();
  const program=owner.acquireReadyProgram(f.gl,make(helper,'base',false,false,[0],plan));assert(program?.program);
  assert.equal(descriptions,duringBuild);assert.equal(builds,1);
  owner.releaseProgram(f.gl,program);owner.dispose();workspace.release();store.collectRetired();t.all();
  assert.equal(budget.stats.bytes,0,'no descriptor/source/workspace allocation survives release');
  valid=false;
 }finally{owner?.dispose();workspace?.release();store?.destroy();t.restore();}
});

test('shared source handoff replaces the old workspace claim before building the live subscriber',()=>{
 const t=turns(),f=driver(),{budget,store}=programBudgetFixture(f,1500),a=createProgramPreparationOwner('workspace-old',()=>{}),b=createProgramPreparationOwner('workspace-new',()=>{});
 const oldSlot={},newSlot={};let oldLive=true,builds=0;
 const source=()=>({vertex:'shared vertex',fragment:'shared fragment',attributes:[]}),authority=createProgramSourceAuthority({inputs:['workspace handoff'],builders:[source]});
 const make=(slot,current)=>({...recipe('workspace-swap','visible',()=>{builds++;const held=budget.reserve({category:'construction',bytes:600,precision:'exact',identity:slot});try{return source();}finally{held.release();}}),sharedKey:'workspace-swap',provenance:[authority],current,budget:{sourceBytesUpperBound:512,submittedAllowanceBytes:128,workspaceCosts:[{category:'construction',bytes:600,precision:'exact',identity:slot}]}});
 try{
  const first=make(oldSlot,()=>oldLive),next=make(newSlot,()=>true);
  pending(()=>a.compile(f.gl,first));pending(()=>b.compile(f.gl,next));oldLive=false;t.all();
  const linked=b.acquireReadyProgram(f.gl,next);assert(linked);assert.equal(builds,1);assert.equal(b.stats.budget.waitingForAvailability,false);assert.equal(budget.stats.pressureEvents,0);assert.equal(budget.stats.bytes,128);
  b.releaseProgram(f.gl,linked);
 }finally{finishBudgetFixture(t,f,store,[a,b]);t.restore();}
});

test('live source resolution checks the replacement budget before constructing and releases failed admission',()=>{
 const t=turns(),f=driver(),{budget,store}=programBudgetFixture(f,1500),owner=createProgramPreparationOwner('resolved-workspace',()=>{});let builds=0,resolutions=0;
 const original={},replacement={};
 const r={...recipe('resolved-workspace','visible',()=>assert.fail('stale builder')),budget:{sourceBytesUpperBound:512,submittedAllowanceBytes:128,workspaceCosts:[{category:'construction',bytes:600,precision:'exact',identity:original}]},resolveSource(){resolutions++;return{budget:{sourceBytesUpperBound:512,submittedAllowanceBytes:128,workspaceCosts:[{category:'construction',bytes:1000,precision:'exact',identity:replacement}]},build(){builds++;return{vertex:'v',fragment:'f',attributes:[]};}};}};
 try{pending(()=>owner.compile(f.gl,r));assert.equal(resolutions,0);t.all();assert.equal(resolutions,1);assert.equal(builds,0);assert.equal(f.calls.length,0);assert.equal(budget.stats.bytes,0);assert(budget.stats.lastPressure.required>1500);}
 finally{finishBudgetFixture(t,f,store,[owner]);t.restore();}
});

test('root500 and infill live-plan coordinators transfer the selected builder budget together',async()=>{
 for(const provider of ['root500','infill']){
  const file=new URL('../src/painted/'+provider+'/safety/building-mesh-renderer.ts',import.meta.url),text=await readFile(file,'utf8'),ast=ts.createSourceFile(String(file),text,ts.ScriptTarget.Latest,true);let declaration;
  (function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='coordinateGeometryRecipe')declaration=node.getText(ast);ts.forEachChild(node,visit);})(ast);assert(declaration);
  const code=ts.transpileModule(declaration+';return coordinateGeometryRecipe;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const t=turns(),f=driver(),{budget,store}=programBudgetFixture(f,1500),owner=createProgramPreparationOwner(provider+' live plan',()=>{});let builds=0;
  const make=slot=>({...recipe('plan-swap','visible',()=>{builds++;const held=budget.reserve({category:'construction',bytes:600,precision:'exact',identity:slot});try{return{vertex:'vertex',fragment:'fragment',attributes:[]};}finally{held.release();}}),current:()=>true,mainCurrent:()=>true,budget:{sourceBytesUpperBound:512,submittedAllowanceBytes:128,workspaceCosts:[{category:'construction',bytes:600,precision:'exact',identity:slot}]}});
  const first=make({}),next=make({});let live=first;
  const coordinate=Function('rememberGeometryRecipe','liveGeometryRecipe','ProgramPreparationPending',code)(()=>{},()=>live,productionCore.ProgramPreparationPending);
  try{const coordinated=coordinate({},first);pending(()=>owner.compile(f.gl,coordinated));live=next;t.all();const program=owner.compile(f.gl,coordinated);assert(program);assert.equal(builds,1);assert.equal(budget.stats.pressureEvents,0);owner.releaseProgram(f.gl,program);}
  finally{finishBudgetFixture(t,f,store,[owner]);t.restore();}
 }
});


test('pending shared lookup is owner- and epoch-specific and never creates a demand',()=>{
 const t=turns();try{
  const f=driver({parallel:true}),a=createProgramPreparationOwner('pending-lookup-a',()=>{}),b=createProgramPreparationOwner('pending-lookup-b',()=>{});
  const build=()=>({vertex:'v',fragment:'f',attributes:[]}),authority=createProgramSourceAuthority({inputs:['pending-test'],builders:[build]}),r={...recipe('colour','visible',build),sharedKey:'pending-lookup',provenance:[authority]};
  assert.equal(a.hasPendingProgram(f.gl,r),false);assert.equal(a.stats.pending,0);
  pending(()=>a.compile(f.gl,r));assert.equal(a.hasPendingProgram(f.gl,r),true);
  assert.equal(b.hasPendingProgram(f.gl,r),false,'another owner has not subscribed');
  assert.equal(a.hasPendingProgram(f.gl,{...r,inputs:['different']}),false,'recipe inputs remain exact');
  f.gl.complete=false;t.until(()=>f.calls.some(x=>x.name==='linkProgram'));
  assert.equal(a.hasPendingProgram(f.gl,r),true,'waiting for driver completion is already pending');
  f.gl.complete=true;t.all();assert.equal(a.hasPendingProgram(f.gl,r),false,'linked work no longer spends a new slot');
  const program=a.compile(f.gl,r);a.releaseProgram(f.gl,program);
  pending(()=>a.compile(f.gl,r));assert.equal(a.hasPendingProgram(f.gl,r),true);a.cancel();assert.equal(a.hasPendingProgram(f.gl,r),false);t.all();
  pending(()=>a.compile(f.gl,r));f.gl.lost=true;a.contextLost();assert.equal(a.hasPendingProgram(f.gl,r),false);f.gl.lost=false;assert.equal(a.hasPendingProgram(f.gl,r),false,'old epoch cannot be counted');
  a.dispose();b.dispose();t.all();
 }finally{t.restore();}
});

test('short shader submissions reach link before paying another delayed callback while KHR still yields',()=>{
 const t=turns(),f=driver({parallel:true}),owner=createProgramPreparationOwner('submission latency',()=>{});
 const compile=f.gl.compileShader,link=f.gl.linkProgram;
 f.gl.compileShader=(...args)=>{t.advance(.75);return compile(...args);};
 f.gl.linkProgram=(...args)=>{t.advance(.25);return link(...args);};
 f.gl.complete=false;
 const r=recipe('bounded-chain','visible',()=>{t.advance(.75);return{vertex:'original vertex',fragment:'original fragment',attributes:['a_position']};});
 try{
  pending(()=>owner.compile(f.gl,r));t.one();
  assert.equal(f.calls.filter(c=>c.name==='linkProgram').length,1,'a 2.5ms submission chain should reach the driver before another callback');
  assert.equal(owner.stats.ready,0,'submission never substitutes for completed and validated linking');
  assert.equal(f.calls.filter(c=>c.name==='getProgramParameter').length,0,'new KHR waiter still yields instead of busy polling');
  assert.equal(owner.stats.context.maxInFlight,2);assert(owner.stats.context.dispatch.lastElapsedMs<=4);
  f.gl.complete=true;t.all();assert(owner.compile(f.gl,r).program);
 }finally{f.gl.complete=true;owner.dispose();t.all();t.restore();}
});

test('program lifecycle diagnostics distinguish repeated compilation and bound retained history without retaining source text',()=>{
 const t=turns();try{
  const f=driver(),owner=createProgramPreparationOwner('lifecycle-owner',()=>{});
  const before=readRenderProgramLifecycle().sequence;
  const r=recipe('same-resource','visible',()=>({vertex:'private vertex body',fragment:'private fragment body',attributes:['a_position']}));
  for(let i=0;i<20;i++){pending(()=>owner.compile(f.gl,r));t.all();const program=owner.compile(f.gl,r);owner.releaseProgram(f.gl,program);owner.cancel();}
  const state=owner.stats.resourceObjects;
  assert.equal(state.createdPrograms,20);assert.equal(state.deleteProgramRequests,20);
  const trace=readRenderProgramLifecycle();assert.equal(trace.sequence,before+40);assert.equal(trace.limit,32);assert.equal(trace.events.length,32);assert.equal(trace.dropped,before+8);
  const events=trace.events;
  assert.equal(events[0].sequence,before+9);assert.equal(events.at(-1).sequence,before+40);
  for(let i=0;i<events.length;i+=2){const created=events[i],deleted=events[i+1];assert.equal(created.event,'create');assert.equal(deleted.event,'delete-issued');assert.equal(created.programId,deleted.programId);assert.equal(created.resource,'same-resource');assert.equal(created.fragment.hash,events[0].fragment.hash);assert(created.atMs<=deleted.atMs);}
  assert.equal(new Set(events.filter(e=>e.event==='create').map(e=>e.programId)).size,16);
  assert(!JSON.stringify(trace).includes('private fragment body'));
  events[0].fragment.hash='caller-mutated';events.length=0;
  const fresh=readRenderProgramLifecycle();assert.equal(fresh.events.length,32);assert.notEqual(fresh.events[0].fragment.hash,'caller-mutated');
  owner.dispose();
 }finally{t.restore();}
});
