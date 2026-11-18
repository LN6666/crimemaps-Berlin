import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const root=new URL('../src/',import.meta.url).pathname;
const built=await build({stdin:{contents:[
 "export {acquirePackedMeshChunk} from './painted/root500/safety/chunk-mesh-packing';",
 "export {createChunkResourceStore} from './safety/render-runtime/chunk-resource-store';",
 "export {createResourceBudget,ResourceBudgetExceededError} from './safety/render-runtime/resource-budget';",
 "export {familyPaintRuns} from './safety/family-paint-program';",
].join('\n'),resolveDir:root,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const count=12288,origin=[13.4,52.5],unit=2*Math.PI*6378137*Math.cos(origin[1]*Math.PI/180);
const point=(vertex,axis)=>axis===0?vertex%31:axis===1?vertex%7-3:-(vertex%11);
const normal=(vertex,axis)=>axis===1?(vertex%2?1:0):axis===2?1:0;
const rawFamily=vertex=>[0,2,1000000][Math.floor(vertex/2304)%3];
const bytes=(budget,category)=>budget.stats.categories[category]?.bytes??0;

function fixture({asyncMaterials=false,limitBytes=8*1024**2}={}){
 const budget=api.createResourceBudget({limitBytes,recentLimitBytes:limitBytes}),store=api.createChunkResourceStore({budget});
 const events={materials:0,retains:0,releases:0,auxiliary:0,sourceDisposed:0,positionReads:0,indexReads:0,runLengths:[],steps:new Map(),maxPositionReads:0,maxIndexReads:0};
 let inside=false,currentScope,stale=false,onStep,materialFailure=false;
 const values=(length,read)=>new Proxy({length},{get(target,name){if(name==='length')return target.length;if(typeof name==='string'&&/^\d+$/.test(name))return read(Number(name));return Reflect.get(target,name);}});
 const positions=values(count*3,i=>{events.positionReads++;return point(Math.floor(i/3),i%3);});
 const normals=values(count*3,i=>normal(Math.floor(i/3),i%3)),indices=values(count,i=>{events.indexReads++;return i;});
 const component={objectId:'large-building',partId:'one-large-batch',origin,batches:[{positions,normals,indices,color:[.25,.5,.75],faceRole:'mixed'}]};
 let sourceDidRetire;const sourceRetired=new Promise(resolve=>{sourceDidRetire=resolve;});
 const source=store.acquire({contentKey:'steps-source',role:'source',estimate:{category:'decoded',bytes:4096,precision:'exact'},produce:()=>component,dispose(){events.sourceDisposed++;sourceDidRetire();}});
 const group={contentKey:'steps-group',components:[component],parents:[source],frame:{origin,unit,authority:'steps-frame'},cohortKeys:[],materialAuthority:'m',recipeAuthority:'r',selectedLOD:0};
 function scoped(callback){assert.equal(currentScope,undefined);currentScope=component;try{return callback();}finally{currentScope=undefined;}}
 function allocated(){
  assert.equal(inside,true,'material allocation belongs to an admitted scheduler step');
  assert(bytes(budget,'packed')>=count*(9+5+4+1)*4+count*4);
  assert(bytes(budget,'construction')>0,'the bounded run workspace is already reserved');
  const paint=new Float32Array(count*5),progressive=new Float32Array(count*4),auxiliary={scope:'tiny'};
  let released=false;return{paint,progressive,auxiliary,release(){assert.equal(released,false,'auxiliary is released once');released=true;events.auxiliary++;}};
 }
 function fill(material,from,to){assert.equal(inside,true);for(let i=from;i<to;i++){material.paint[i*5+4]=rawFamily(i);material.progressive[i*4]=i%5;}}
 const options={provider:'root500:steps',group,components:group.components,batchIncluded:()=>true,
  materials:asyncMaterials?async(_rows,_signal,work)=>{
   events.materials++;let material,keep=false;
   try{
    material=await work.run(()=>scoped(allocated),'fixture-material-allocate');let at=0;
    await work.steps(()=>scoped(()=>{const end=Math.min(count,at+512);fill(material,at,end);at=end;if(materialFailure)throw Error('material step failed');return at===count;}),'fixture-material-fill');
    keep=true;return material;
   }finally{if(!keep)material?.release();}
  }:()=>{events.materials++;const material=scoped(allocated);scoped(()=>fill(material,0,count));return material;},
  auxiliaryEstimate:[{category:'mask',bytes:256,precision:'exact'}],auxiliaryCosts:auxiliary=>[{category:'mask',bytes:256,precision:'exact',identity:auxiliary}],
  styles:()=>({wall:5,roof:9,landmark:true,sourceGlassRoof:false}),
  runs(local,paint){assert.equal(inside,true);events.runLengths.push(local.length);return api.familyPaintRuns(local,paint,raw=>'source:'+raw);},
  progressivePainted:()=>true,
  sourceCurrent(){assert(events.retains>events.releases,'source pin spans every asynchronous step');if(stale)throw Error('source is stale');},
  retainSource(){events.retains++;return()=>{events.releases++;};},
 };
 const observed=(callback,label)=>()=>{
  assert.equal(currentScope,undefined,'no provider scope crosses a yield');assert.equal(inside,false);
  const positionsBefore=events.positionReads,indicesBefore=events.indexReads;inside=true;
  try{const result=callback(),step=(events.steps.get(label)??0)+1;events.steps.set(label,step);
   events.maxPositionReads=Math.max(events.maxPositionReads,events.positionReads-positionsBefore);events.maxIndexReads=Math.max(events.maxIndexReads,events.indexReads-indicesBefore);
   onStep?.({label,step,done:result===true});return result;
  }finally{inside=false;assert.equal(currentScope,undefined,'the synchronous provider scope ended before the scheduler resumes');}
 };
 // Observe the actual scheduler and actual store. Admission, repeated-step
 // execution, cancellation and parent ownership are never replaced by doubles.
 const observedStore={acquire(request){return store.acquire({...request,produce(production){return request.produce({...production,
  schedule(context,work,settings={}){return production.schedule(context,observed(work,settings.label),settings);},
  scheduleSteps(context,step,settings={}){return production.scheduleSteps(context,observed(step,settings.label),settings);},
 });}});}};
 const context={isContextLost:()=>false};
 return{budget,store,source,sourceRetired,group,component,options,events,
  acquire(signal){return api.acquirePackedMeshChunk(observedStore,context,options,signal,()=>{});},
  set onStep(value){onStep=value;},set stale(value){stale=value;},set materialFailure(value){materialFailure=value;},
  close(){source.release();store.evictRecent();assert.equal(budget.stats.bytes,0);},
 };
}

test('one large building yields within both vertex/index loops and run construction, with unchanged values and joined family runs',async()=>{
 const f=fixture();let lease;
 f.onStep=()=>{assert.equal(lease.state,'preparing');assert.equal(lease.value,undefined,'no partial arrays are published');assert.equal(f.events.sourceDisposed,0);};
 lease=f.acquire();f.source.release();assert.equal(f.events.materials,0,'legacy synchronous materials are still scheduled');
 await lease.ready;f.onStep=undefined;
 const value=lease.value;
 assert(f.events.steps.get('mesh-geometry')>2,'a single component/batch cannot monopolize a step');
 assert(f.events.steps.get('mesh-runs')>2,'run scanning has its own bounded steps');
 assert(f.events.maxPositionReads<count*3/2);assert(f.events.maxIndexReads<count/2);
 assert.equal(f.events.positionReads,count*3);assert.equal(f.events.indexReads,count,'numeric inputs are each packed once');
 assert(f.events.runLengths.every(length=>length<count&&length%3===0));
 assert.equal(f.events.runLengths.reduce((n,length)=>n+length,0),count);
 for(let vertex=0;vertex<count;vertex++){
  for(let axis=0;axis<3;axis++){assert.equal(value.vertices[vertex*9+axis],Math.fround(point(vertex,axis)));assert.equal(value.vertices[vertex*9+3+axis],normal(vertex,axis));assert.equal(value.vertices[vertex*9+6+axis],[.25,.5,.75][axis]);}
  assert.equal(value.baseState[vertex],(vertex%2?9:5)*4+1);assert.equal(value.indices[vertex],vertex);
 }
 assert.deepEqual(value.runs,api.familyPaintRuns(value.indices,value.paint,raw=>'source:'+raw),'window boundaries do not alter draw ordering/recipe identity');
 assert.deepEqual(value.styles,[5,9]);assert.equal(value.rows.length,1);assert.strictEqual(value.rows[0].component,f.component);
 assert.deepEqual(value.rows[0].box,[0,-3,-10,30,3,-0]);assert.equal(value.rows[0].firstVertex,0);assert.equal(value.rows[0].lastVertex,count);assert.equal(value.rows[0].end,count);
 assert.equal(bytes(f.budget,'construction'),0,'temporary run metadata ends at final adjustment');assert.equal(f.events.retains,f.events.releases);
 lease.release();f.store.evictRecent();assert.equal(f.events.auxiliary,1);assert.equal(f.events.sourceDisposed,1);f.close();
});

test('asynchronous material steps keep admission and source ownership until the shared value is complete, then overlap/recent hits reuse it',async()=>{
 const f=fixture({asyncMaterials:true}),first=f.acquire(),second=f.acquire();
 assert.equal(second.state,'preparing');assert.equal(f.events.retains,2);assert.equal(f.events.releases,1,'an in-flight hit releases only its own construction pin');
 await Promise.all([first.ready,second.ready]);assert.strictEqual(first.value,second.value);assert.equal(f.events.materials,1);assert(f.events.steps.get('fixture-material-fill')>1);
 const value=first.value;first.release();second.release();assert.equal(f.events.auxiliary,0);
 const recent=f.acquire();await recent.ready;assert.strictEqual(recent.value,value);assert.equal(f.events.materials,1);assert.equal(f.events.retains,f.events.releases);
 recent.release();f.store.evictRecent();assert.equal(f.events.auxiliary,1);f.close();
});

for(const mode of ['material-failure','material-abort','geometry-abort','runs-abort','source-stale'])test(mode+' releases the complete reservation, actual parent and any material sidecar without publishing partial work',async()=>{
 const f=fixture({asyncMaterials:true}),controller=new AbortController();let lease;
 if(mode==='material-failure')f.materialFailure=true;
 f.onStep=({label,step})=>{
  assert.equal(lease.value,undefined);assert.equal(f.events.sourceDisposed,0);assert(bytes(f.budget,'packed')>0);
  if(step!==1)return;
  if(mode==='material-abort'&&label==='fixture-material-fill'||mode==='geometry-abort'&&label==='mesh-geometry'||mode==='runs-abort'&&label==='mesh-runs')controller.abort();
  if(mode==='source-stale'&&label==='mesh-geometry')f.stale=true;
 };
 lease=f.acquire(controller.signal);f.source.release();await assert.rejects(lease.ready,mode==='material-failure'?/material step failed/:mode==='source-stale'?/source is stale/:error=>error.name==='AbortError');
 // Consumer cancellation rejects its own ready promise immediately. The
 // shared producer still owns the reservation/parent until its async finally
 // completes; observe that real parent disposal instead of a timer or polling.
 await f.sourceRetired;
 assert.equal(lease.value,undefined);assert.equal(f.events.materials,1);assert.equal(f.events.auxiliary,1);assert.equal(f.events.retains,f.events.releases);assert.equal(f.events.sourceDisposed,1);
 assert.equal(f.budget.stats.bytes,0);lease.release();f.close();
});

test('a budget refusal precedes scheduled material allocation and the bounded run workspace',()=>{
 const f=fixture({limitBytes:8192,asyncMaterials:true});
 assert.throws(()=>f.acquire(),error=>error instanceof api.ResourceBudgetExceededError);
 assert.equal(f.events.materials,0);assert.equal(f.events.steps.size,0);assert.equal(f.events.retains,1);assert.equal(f.events.releases,1);assert.equal(f.budget.stats.bytes,4096);f.close();
});
