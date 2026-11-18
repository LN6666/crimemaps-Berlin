import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
const web=fileURLToPath(new URL('../',import.meta.url));
for(const [slug,name,dataName] of [['fbc','infillFrankfurtFbc','FBC_DATA'],['skyper','infillFrankfurtSkyper','SKYPER_DATA'],['spin','infillFrankfurtSpin','SPIN_DATA'],['nextower','infillFrankfurtNextower','NEXTOWER_DATA'],['deutsche-bank','infillFrankfurtDeutscheBank','DB_DATA'],['trianon','infillFrankfurtTrianon','TRIANON_DATA']]){
const b=await build({stdin:{contents:`export * from './src/painted/infill/safety/infill-frankfurt-${slug}';export {get${dataName} as getData,infillDataRefs as sourceRefs} from './src/painted/infill/safety/infill-frankfurt-${slug}-data';export {nativePaintSignature} from './src/painted/infill/safety/progressive-native-signature';export {createFrozenDataScope} from './src/safety/frozen-data-scope';export {createResourceBudget} from './src/safety/render-runtime/resource-budget';`,resolveDir:web,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022'});
const api=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const text=fs.readFileSync(web+`src/painted/infill/safety/infill-frankfurt-${slug}.ts`,'utf8');
const pairs=JSON.parse(text.match(/const infillPreparationPairs=(\[.*?\]) as const;/s)[1]);
const identities=pairs.map(([id,part])=>[id.replace('osm/way/',''),part.split('/component/')[1]]);
const reconstruct=api[name+'Reconstruction'],prepare=api.prepareInfillData,materials=api[name+'BaseMaterials'];
function fixture(){
 const sources=identities.map(([id,part])=>({city:'frankfurt',objectId:'osm/way/'+id,partId:`osm/way/${id}/component/${part}`,origin:[8.6,50.1],componentGeometry:{type:'Polygon',coordinates:[]},sourceFeature:{type:'Feature',properties:{}},displayEstimates:{},batches:[{positions:[-0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.1,.2,.3]}]}));
 const data={models:sources.map(source=>({identity:{objectId:source.objectId,partId:source.partId,signature:api.nativePaintSignature(source)},source,display:[{...structuredClone(source.batches[0]),paint:Array(12).fill(.25),frames:Array(15).fill(.5)}]}))};
 let prepared=false,disposed=false,borrows=0;
 const scope={stats:{get disposed(){return disposed;}},memo(){throw Error('No whole-scope memo reservation permitted for source access');},async prepare(refs,signal){signal.throwIfAborted();assert.deepEqual(refs,api.sourceRefs);prepared=true;},borrow(ref,read){assert(!disposed,'released');assert(prepared,'unprepared');assert.deepEqual(ref,api.sourceRefs[0]);borrows++;return read(data);}};
 return{sources,data,scope,release(){disposed=true;},get borrows(){return borrows;}};
}
test(slug+' borrows original models without a facade memo and keeps copied display geometry/materials exact',async()=>{
 const f=fixture();await prepare(f.sources,new AbortController().signal,f.scope);
 assert.equal(api.getData(f.scope),f.data);
 const before=structuredClone(f.data),result=reconstruct(f.sources,f.scope);
 assert.equal(result.stats.objects,identities.length);assert.equal(result.stats.triangles,identities.length);
 result.components.forEach((c,i)=>{assert.deepEqual(c.batches,f.data.models[i].display);assert.notEqual(c.batches[0].positions,f.data.models[i].display[0].positions);assert(Object.is(c.batches[0].positions[0],-0));});
 const paint=new Float32Array(identities.length*12),frames=new Float32Array(identities.length*15),stats=materials(result.components,paint,frames,f.scope);assert.equal(stats.objects,identities.length);assert(paint.every(v=>v===.25));assert(frames.every(v=>v===.5));assert.deepEqual(f.data,before);
 f.release();assert.throws(()=>api.getData(f.scope),/released/);assert.throws(()=>reconstruct(f.sources,f.scope),/released/);
});
test(slug+' still withholds incomplete, changed and duplicate source groups',async()=>{
 const f=fixture();await prepare(f.sources,new AbortController().signal,f.scope);
 for(const rows of [f.sources.slice(1),[...f.sources,f.sources[0]],f.sources.map((c,i)=>i?c:{...c,origin:[9,50]})]){
  const result=reconstruct(rows,f.scope);assert.equal(result.stats.objects,0);result.components.forEach((c,i)=>assert.equal(c,rows[i]));
 }
});
test(slug+' direct source access survives the captured 1 GB memo admission pressure and releases its lease',async()=>{
 const f=fixture(),budget=api.createResourceBudget({limitBytes:1_000_000_000}),held=budget.reserve({category:'metadata',bytes:702893062,precision:'estimate'});let released=0;
 const scope=api.createFrozenDataScope({resources:{budget},async acquire(ref,signal){signal.throwIfAborted();assert.deepEqual(ref,api.sourceRefs[0]);return{logicalBytes:149084384,borrow:read=>read(f.data),release(){released++;}};}});
 try{
  await prepare(f.sources,new AbortController().signal,scope);
  assert.throws(()=>scope.memo({},()=>({})),error=>error.name==='ResourceBudgetExceededError');
  assert.equal(budget.stats.lastPressure.additionalBytes,298172864);assert.equal(budget.stats.lastPressure.shortfallBytes,1065926);
  const result=reconstruct(f.sources,scope);assert.equal(result.stats.objects,identities.length);assert.equal(budget.stats.bytes,702893062);
 }finally{scope.release();held.release();}
 assert.equal(released,1);assert.equal(budget.stats.bytes,0);assert.equal(scope.stats.disposed,true);
});
test(slug+' direct source access survives the captured 1.5 GB far-view memo admission pressure and releases its lease',async()=>{
 const f=fixture(),budget=api.createResourceBudget({limitBytes:1_500_000_000}),held=budget.reserve({category:'metadata',bytes:1217219532,precision:'estimate'});let released=0;
 const scope=api.createFrozenDataScope({resources:{budget},async acquire(ref,signal){signal.throwIfAborted();assert.deepEqual(ref,api.sourceRefs[0]);return{logicalBytes:160093578,borrow:read=>read(f.data),release(){released++;}};}});
 try{
  await prepare(f.sources,new AbortController().signal,scope);
  assert.throws(()=>scope.memo({},()=>({})),error=>error.name==='ResourceBudgetExceededError');
  assert.equal(budget.stats.lastPressure.additionalBytes,320191252);assert.equal(budget.stats.lastPressure.shortfallBytes,37410784);
  const result=reconstruct(f.sources,scope);assert.equal(result.stats.objects,identities.length);assert.equal(budget.stats.bytes,1217219532);
 }finally{scope.release();held.release();}
 assert.equal(released,1);assert.equal(budget.stats.bytes,0);assert.equal(scope.stats.disposed,true);
});
test(slug+' cold guard performs no source read; matched source needs preparation',()=>{
 const f=fixture(),rows=[{...f.sources[0],objectId:'unrelated',partId:'unrelated'}];assert.equal(reconstruct(rows,f.scope).components,rows);assert.equal(f.borrows,0);assert.throws(()=>reconstruct(f.sources,f.scope),/unprepared/);
});

}

for(const [slug,name] of [['eurotower','infillEurotower'],['opernturm','infillOpernturm']]){
 const built=await build({entryPoints:[web+`src/painted/infill/safety/infill-frankfurt-${slug}.ts`],bundle:true,write:false,format:'esm',platform:'node',target:'es2022'});
 const module=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 test(slug+' incomplete SOURCE and cold path avoid memo and DISPLAY acquisition',async()=>{
  const scope={stats:{disposed:false},memo(){throw Error('Unexpected facade memo');},prepare(){throw Error('DISPLAY must not be acquired');},borrow(){throw Error('DISPLAY must not be borrowed');}};
  const source=fs.readFileSync(web+`src/painted/infill/safety/infill-frankfurt-${slug}.ts`,'utf8'),objectId=source.match(/"objectId":"([^"]+)"/)[1],partId=source.match(/"partId":"([^"]+)"/)[1];
  const row={city:'frankfurt',objectId,partId,origin:[0,0],componentGeometry:{type:'Polygon',coordinates:[]},sourceFeature:{},displayEstimates:{},batches:[]};
  for(const rows of [[{...row,city:'berlin'}],[row]]){
   await module.prepareInfillData(rows,new AbortController().signal,scope);
   const result=module[name+'Reconstruction'](rows,scope);assert.equal(result.stats.objects,0);assert.equal(result.components,rows);
  }
 });
}
