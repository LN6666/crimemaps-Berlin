import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({stdin:{contents:"export {createSceneProofGate} from './scene-proof-gate';",resolveDir:new URL('../src/safety/',import.meta.url).pathname},bundle:true,platform:'node',format:'esm',write:false});
const {createSceneProofGate}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function fixture(){const gate=createSceneProofGate();let state={camera:1,moving:false,mode:'3d',recovery:0,provider:'ready',environment:'published:1',scenery:'ready',solar:'ready:1'},reads=0;const rows=[];return{state,rows,reads:()=>reads,run(t,settled=false){return gate.publish(t,settled,()=>{reads++;return Object.values(state);},()=>{rows.push({t,state:{...state}});return true;});}};}
test('60Hz dynamic idle does not serialize at idle rate; ordinary renders remain bounded',()=>{
 const f=fixture();for(let i=0;i<600;i++){f.run(i*1000/60);f.run(i*1000/60+.01,true);}
 assert.ok(f.rows.length<=40);assert.ok(f.rows.length>=35);
 for(let i=1;i<f.rows.length;i++)assert.ok(f.rows[i].t-f.rows[i-1].t>=250);
});
test('throttled render does not even read settlement providers',()=>{const f=fixture();f.run(0);const n=f.reads();for(let t=1;t<250;t++)f.run(t);assert.equal(f.reads(),n);});
test('sub250ms final moveend is retained once with no later render',()=>{const f=fixture();f.state.moving=true;f.run(0);f.state.moving=false;f.state.camera=2;assert.equal(f.run(20,true),true);assert.equal(f.run(21,true),false);assert.deepEqual(f.rows.at(-1).state,f.state);});
test('provider readiness after moveend gets its own final witness',()=>{const f=fixture();f.state.provider='preparing:2';f.run(0);f.run(10,true);f.state.provider='ready:2';assert.equal(f.run(30,true),true);assert.equal(f.run(31,true),false);assert.equal(f.rows.at(-1).state.provider,'ready:2');});
test('mode recovery environment scenery and solar terminal transitions remain distinct',()=>{for(const [field,value]of Object.entries({mode:'2d',recovery:1,environment:'partial-source-held:2',scenery:'error',solar:'ready:2'})){const f=fixture();f.run(0);f.state[field]=value;assert.equal(f.run(5,true),true,field);assert.equal(f.run(6,true),false,field);}});
test('render that already witnessed terminal state suppresses duplicate idle',()=>{const f=fixture();f.run(0);f.state.environment='published:2';f.run(250);assert.equal(f.run(251,true),false);});
test('failed full publication does not consume final witness',()=>{const gate=createSceneProofGate();assert.throws(()=>gate.publish(0,true,()=> ['ready'],()=>{throw Error('failure');}));let saved=false;assert.equal(gate.publish(1,true,()=> ['ready'],()=>{saved=true;return true;}),true);assert.equal(saved,true);});

test('final dynamic-clock quiescence remains observable without a later render',()=>{const f=fixture();f.state.clockPending=true;f.run(0);f.state.clockPending=false;assert.equal(f.run(10,true),true);assert.equal(f.run(11,true),false);});

test('false publication does not consume key or cadence; retry can publish',()=>{const gate=createSceneProofGate();let writes=0;assert.equal(gate.publish(10,true,()=>['ready'],()=>false),false);assert.equal(gate.publish(11,false,()=>['ready'],()=>{writes++;return true;}),true);assert.equal(writes,1);assert.equal(gate.publish(12,true,()=>['ready'],()=>{writes++;return true;}),false);});
test('fresh fixed nested tuples compare by value and preserve long existing string keys',()=>{const gate=createSceneProofGate();const key='resource-content-key:'+ 'x'.repeat(65000);let writes=0;const row=()=>['published',[key,1,true]];const publish=()=>{writes++;return true;};assert.equal(gate.publish(0,true,row,publish),true);assert.equal(gate.publish(1,true,row,publish),false);assert.equal(gate.publish(2,true,()=>['published',[key,2,true]],publish),true);assert.equal(writes,2);});
