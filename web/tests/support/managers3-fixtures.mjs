// managers-3 fixtures: tiny synthetic native shards on the managers' fixture
// leaf box, a controllable network for the real shared native source pool on
// the harness page store, and bounded waits. No product data, browser or GPU.
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {harness,createVisiblePreparationGate,tick,webRoot} from './managers3-harness.mjs';

import {managerEvent} from './manager-admission-waits.mjs';
export {waitForResourceState as until} from './wait-for-resource-state.mjs';
export {tick};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
/** A plain city3D shard of `count` one-triangle components inside the harness
 * view box, and its manifest leaf (vertices and box as the manager checks them).
 * `fixture`: the first component carries the harness's fixture identity, which
 * its frozen-data stand-in requires in every prepared demand. */
export function shard(name,{city='berlin',count=3,fixture=false}={}){
 const geometry={type:'Polygon',coordinates:[[[13.4,52.4],[13.6,52.4],[13.5,52.6],[13.4,52.4]]]};
 const components=Array.from({length:count},(_,i)=>{const id=fixture&&i===0?'osm/way/1':'osm/way/'+name+'-'+(i+1);return{city,objectId:id,partId:id+(fixture&&i===0?'/component/fixture':'/component/managers3'),origin:[13.5,52.5],componentGeometry:geometry,sourceFeature:{type:'Feature',id,geometry,properties:{name}},batches:[{positions:[0,10,0,1,10,0,0,10,1],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.4,.5,.6]}]};});
 const bytes=new TextEncoder().encode(JSON.stringify({schema_version:1,city,components}));
 const file='/safety/buildings3d/managers3-'+name+'.json';
 return{bytes,leaf:{id:'managers3-'+name,tile_key:'managers3-'+name,path:file,sha256:hash(bytes),bytes:bytes.length,vertices:count*3,bbox:[13,52,14,53],lod:1}};
}
/** Reads that stay pending until the test delivers them; abort rejects like fetch. */
export function network(){
 const reads=[];
 let responder;
 const read=(target,signal,max)=>new Promise((resolve,reject)=>{
  const row={target,signal,max,resolve,reject,done:false};
  reads.push(row);
  signal.addEventListener('abort',()=>{if(!row.done){row.done=true;reject(signal.reason);}},{once:true});
  responder?.(row);
 });
 function deliver(row,bytes){row.done=true;row.resolve(bytes.slice());}
 return{reads,read,
  pending:target=>reads.filter(row=>!row.done&&!row.signal.aborted&&(target===undefined||row.target===target)),
  deliver(target,bytes){const row=reads.find(r=>r.target===target&&!r.done&&!r.signal.aborted);assert(row,'no pending read of '+target);deliver(row,bytes);},
  // The manager may ask for the next shard only after validating an earlier
  // one. Keep answering its actual requests through completion of this operation.
  async respondUntil(sources,completion,label){
   assert.equal(responder,undefined,'overlapping network fixtures');
   const bodies=new Map(sources.map(source=>[source.leaf.path,source.bytes]));
   responder=row=>{
    if(row.done||row.signal.aborted)return;
    const bytes=bodies.get(row.target);
    if(bytes===undefined){row.done=true;row.reject(Error('Unexpected fixture request: '+row.target));return;}
    deliver(row,bytes);
   };
   try{
    for(const row of reads)responder(row);
    return await managerEvent(completion,label);
   }finally{responder=undefined;}
  },
  fail(target,error){const row=reads.find(r=>r.target===target&&!r.done&&!r.signal.aborted);assert(row,'no pending read of '+target);row.done=true;row.reject(error);}};
}
export async function outcome(promise,turns=20){let result='pending';promise.then(()=>{result='fulfilled';},error=>{result='rejected:'+(error?.name??String(error));});for(let i=0;i<turns;i++)await tick();return result;}
/** A real manager of `provider` whose native source client is the real shared
 * native source pool (legacy reads through `net`) on the harness page store,
 * with the page's visible preparation gate and the given leaves as its catalog. */
export function cohortManager(provider,leaves,{net=network(),gate=createVisiblePreparationGate(),withoutCohort=false}={}){
 let pool;
 const h=harness(provider,{runVisiblePreparation:(signal,work)=>gate.run(provider,signal,work)},{nativeSources({runtime,page,component}){
  const {createSharedNativeSourcePool}=runtime.load(path.join(webRoot,'src/safety/shared-native-source.ts'));
  pool=createSharedNativeSourcePool({read:net.read,resourceStore:page.store});
  const client=pool.client(component.city);
  // Control: the same client without the cohort registry (the manager then
  // reads its cohort as before IA-R1).
  return withoutCohort?{...client,cohort:undefined}:client;
 }});
 h.fixture.manifest={...h.fixture.manifest,shards:leaves.map(row=>row.leaf)};
 return{...h,pool,net,gate,budget:h.page.budget};
}
