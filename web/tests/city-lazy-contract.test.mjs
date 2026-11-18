import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Execute the complete City adapter. Only the dynamically loaded manager is
// substituted: no renderer, city data table or shader catalogue is imported.
const source=fs.readFileSync(new URL('../src/painted/city/safety/three-dimensional-lazy.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};
Function('exports','require','matchMedia',js)(exports,name=>{
 assert.equal(name,'./reichstag-appearance-budget');
 return{reichstagAppearanceVertexReservation:()=>0};
},()=>({matches:true}));
const install=exports.installThreeDimensionalMap;
const signal=()=>new AbortController().signal;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function fixture(load){
 const calls={modes:[],reads:[],suspends:[],resumes:[],installs:0,loads:0};let mode='2d';
 const actual={
  requestMode(next,own,transition){calls.modes.push({next,signal:own,transition});mode=next;return Promise.resolve({mode,status:'ready'});},
  readAsset(...args){calls.reads.push(args);return Promise.resolve('asset');},
  suspend(settings){calls.suspends.push(settings);return settings?.contextRecovery===true;},
  resume(settings){calls.resumes.push(settings);},
  setPageHidden(){},setReducedMotion(){},setOpacityContext(){},destroy(){},
  get mode(){return mode;},get wantedMode(){return mode;}
 };
 const module={installThreeDimensionalMap(){calls.installs++;return actual;}};
 const lazy=install({city:'berlin',mobile:false,map:{stop(){},easeTo(){}}},()=>{calls.loads++;return load?load(module):Promise.resolve(module);});
 return{lazy,calls};
}

test('City lazy forwards admission and mode-transition identity without changing explicit 2D defaults',async()=>{
 const {lazy,calls}=fixture();
 try{
  await lazy.requestMode('3d',signal());
  const admission={admitted:{},envelope:{},keep:[]},asset={path:'/safety/buildings3d/fixture.json'},own=signal();
  assert.equal(await lazy.readAsset(asset,own,100,admission),'asset');
  assert.deepEqual(calls.reads[0].slice(0,3),[asset,own,100]);assert.strictEqual(calls.reads[0][3],admission);
  await lazy.readAsset(asset,own,100);assert.equal(calls.reads[1][3],undefined);
  const transition={skipCamera:true,retainPrograms:true};
  await lazy.requestMode('2d',signal(),transition);assert.strictEqual(calls.modes.at(-1).transition,transition);
  await lazy.requestMode('3d',signal(),true);assert.equal(calls.modes.at(-1).transition,true);
  await lazy.requestMode('2d',signal());assert.equal(calls.modes.at(-1).transition,undefined);
 }finally{lazy.destroy();}
});

test('City lazy preserves a quiet recovery signal only when the manager accepts reuse',async()=>{
 const {lazy,calls}=fixture();
 try{
  await lazy.requestMode('3d',signal());const ownerSignal=calls.modes[0].signal,settings={contextRecovery:true};
  assert.equal(lazy.suspend(settings),true);assert.strictEqual(calls.suspends[0],settings);assert.equal(ownerSignal.aborted,false);
  lazy.resume(settings);assert.strictEqual(calls.resumes[0],settings);assert.equal(ownerSignal.aborted,false);assert.equal(calls.modes.length,1);
  assert.equal(lazy.suspend(),false);assert.equal(ownerSignal.aborted,true);assert.equal(calls.suspends[1],undefined);
  lazy.resume();assert.equal(calls.resumes[1],undefined);
 }finally{lazy.destroy();}
});

test('City lazy shares a delayed module across cancelled 3D, 2D and a fresh 3D request',async()=>{
 const gate=deferred();let module;const {lazy,calls}=fixture(value=>{module=value;return gate.promise;});
 try{
  const old=new AbortController(),first=lazy.requestMode('3d',old.signal),cancelled=assert.rejects(first,{name:'AbortError'});
  await lazy.requestMode('2d',signal());const current=lazy.requestMode('3d',signal());
  gate.resolve(module);await cancelled;assert.deepEqual(await current,{mode:'3d',status:'ready'});
  assert.equal(calls.loads,1);assert.equal(calls.installs,1);assert.equal(calls.modes.length,1);assert.equal(calls.modes[0].next,'3d');
  old.abort();assert.equal(calls.modes[0].signal.aborted,false,'late cancellation of the first caller cannot reach the new request');
 }finally{lazy.destroy();}
});
