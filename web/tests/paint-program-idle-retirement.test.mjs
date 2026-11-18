import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,transform} from 'esbuild';
import ts from 'typescript';
const built=await build({entryPoints:[new URL('../src/safety/paint-program-idle-retirement.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm'});
const {createPaintProgramIdleRetirement:create}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function fixture(){
 let time=0,sequence=0;const timers=new Map(),programs=new Map(),required=new Set(),released=[];
 const options={programs,required:()=>required,release:p=>released.push(p),now:()=>time,setTimer:(fn,delay)=>{const id=++sequence;timers.set(id,{fn,due:time+delay});return id;},clearTimer:id=>timers.delete(id)};
 const cache=create(options);
 return{cache,options,programs,required,released,timers,advance(ms){time+=ms;let turns=0;for(;;){const entry=[...timers].find(([,t])=>t.due<=time);if(!entry)break;assert(++turns<50);timers.delete(entry[0]);entry[1].fn();}},get time(){return time;}};
}
test('idle references below the capacity cap expire after the existing 16 second rebuild grace',()=>{
 const f=fixture(),p={};f.programs.set('old',p);f.cache.synchronize();assert.equal(f.cache.stats.idleMs,16000);
 f.advance(15999);assert.equal(f.programs.get('old'),p);assert.equal(f.released.length,0);
 f.advance(1);assert.equal(f.programs.size,0);assert.deepEqual(f.released,[p]);assert.equal(f.timers.size,0);
});
test('render-time synchronization does not extend a continuously unused reference',()=>{
 const f=fixture();f.programs.set('old',{});f.cache.synchronize();for(let i=0;i<15;i++){f.advance(1000);f.cache.synchronize();assert.equal(f.timers.size,1);}f.advance(1000);assert.equal(f.released.length,1);
});
test('fresh main or capture demand protects a program even without another synchronization',()=>{
 const f=fixture(),p={};f.programs.set('paint',p);f.cache.synchronize();f.advance(15999);f.required.add('paint');f.advance(1);assert.equal(f.programs.get('paint'),p);assert.equal(f.released.length,0);assert.equal(f.timers.size,0);
 f.required.clear();f.cache.synchronize();f.advance(15999);assert.equal(f.released.length,0);f.advance(1);assert.deepEqual(f.released,[p]);
});
test('reactivation followed by becoming idle starts a new grace interval',()=>{
 const f=fixture();f.programs.set('paint',{});f.cache.synchronize();f.advance(8000);f.required.add('paint');f.cache.synchronize();f.required.clear();f.cache.synchronize();f.advance(8000);assert.equal(f.released.length,0);f.advance(8000);assert.equal(f.released.length,1);
});
test('a replacement under the same key cannot inherit the old deadline',()=>{
 const f=fixture(),old={},fresh={};f.programs.set('paint',old);f.cache.synchronize();f.advance(15999);f.programs.set('paint',fresh);f.advance(1);assert.equal(f.programs.get('paint'),fresh);assert.equal(f.released.length,0);f.advance(16000);assert.deepEqual(f.released,[fresh]);
});
test('capacity eviction is not released twice and shared references are released once per key',()=>{
 const f=fixture(),p={};f.programs.set('a',p);f.programs.set('b',p);f.programs.set('evicted',{});f.cache.synchronize();f.programs.delete('evicted');f.advance(16000);assert.deepEqual(f.released,[p,p]);assert.equal(f.timers.size,0);
});
test('context teardown cancels callbacks and a later context starts fresh',()=>{
 const f=fixture();f.programs.set('old',{});f.cache.synchronize();f.cache.reset();f.programs.clear();f.advance(20000);assert.equal(f.released.length,0);assert.equal(f.timers.size,0);f.programs.set('new',{});f.cache.synchronize();f.advance(16000);assert.equal(f.released.length,1);
});
for(const provider of ['infill','city'])test(provider+' actual renderer wiring protects unknown projection and current capture demands',async()=>{
 const text=await readFile(new URL('../src/painted/'+provider+'/safety/building-mesh-renderer.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('renderer.ts',text,ts.ScriptTarget.Latest,true);let initializer;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='programIdleRetirement')initializer=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert(initializer);
 const f=fixture(),p={},gl={},env={createPaintProgramIdleRetirement:options=>create({...f.options,...options}),partitionPrograms:f.programs,familyPrograms:f.programs,matrix:undefined,mainWorldProjection:undefined,destroyed:false,pageHidden:false,enabled:true,retainedPaintKeys:()=>f.required,mainFamilyProgramKeys:()=>new Set(),activeCaptureProgramKeys:()=>f.required,gl,programPreparation:{releaseProgram:(context,p)=>{assert.equal(context,gl);f.released.push(p);}},familyEvictions:0,reflectionResidentRevision:0};
 const compiled=await transform('('+initializer+')',{loader:'ts'});const cache=Function('env','with(env){return '+compiled.code+'}')(env);
 f.programs.set('paint',p);cache.synchronize();f.advance(20000);assert.equal(f.released.length,0);env.matrix=env.mainWorldProjection={};cache.synchronize();f.required.add('paint');f.advance(16000);assert.equal(f.released.length,0);f.required.clear();cache.synchronize();f.advance(16000);assert.deepEqual(f.released,[p]);
 if(provider==='city'){assert.equal(env.familyEvictions,1);assert.equal(env.reflectionResidentRevision,1);}cache.reset();
});
