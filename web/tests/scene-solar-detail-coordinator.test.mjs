import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const output=await build({entryPoints:[new URL('../src/safety/scene-solar-detail-coordinator.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm'});
const {createSceneSolarDetailCoordinator}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
function fixture(){
 let revision='geometry-1',coverage={bounds:[0,0,0,2,2,2],triangles:12,draws:2,complete:true},repaints=0,coverageReads=0;
 const providers=['city','root500'],calls=[];
 const states=new Map(providers.map(provider=>[provider,{ready:true,settlement:{requestRevision:1,readyRequestRevision:1,generation:1,readyGeneration:1,pending:false,canonical:{kind:'empty',generation:1}}}]));
 const core=createSceneSolarDetailCoordinator({providers,readProvider:provider=>states.get(provider),requestRefresh:provider=>{
  calls.push(provider);states.get(provider).settlement.pending=true;
 },readSourceRevision:()=>revision,readUnforcedCoverage:()=>{coverageReads++;return coverage;},requestRepaint:()=>repaints++});
 core.setContext('context-1');
 const settle=(provider,{advance=true,generation=false}={})=>{const s=states.get(provider).settlement;
  if(advance)s.requestRevision++;if(generation)s.generation++;
  s.readyRequestRevision=s.requestRevision;s.readyGeneration=s.generation;s.canonical={...s.canonical,generation:s.generation};s.pending=false;
 };
 const settleAll=()=>providers.forEach(provider=>settle(provider));
 const proof=()=>{const plan=core.capturePlan();assert(plan);return {kind:'published-capture',contextKey:'context-1',revision:plan.revision,bounds:plan.bounds,complete:true};};
 return {core,states,calls,settle,settleAll,proof,setRevision:value=>revision=value,setCoverage:value=>coverage=value,get repaints(){return repaints;},get coverageReads(){return coverageReads;}};
}

test('requested refresh is not an ACK; same mesh needs a genuinely completed newer request',()=>{
 const f=fixture();f.core.update();assert.deepEqual(f.calls,['city','root500']);assert.equal(f.core.capturePending,true);
 f.core.update();assert.equal(f.calls.length,2,'no refresh polling loop');
 f.settle('city',{advance:false});f.settle('root500',{advance:false});f.core.update();
 assert.equal(f.core.capturePlan(),undefined,'consumed pending flag and old ready generation do not acknowledge');
 f.settleAll();f.core.update();const witness=f.core.capturePlan();assert.equal(witness.kind,'witness');
 f.core.publication(f.proof());assert.equal(f.core.state.epochId,undefined,'publication is consumed only at frame end');
 f.core.update();assert.equal(f.core.state.epochId,1);assert.equal(f.core.capturePending,true);assert.equal(f.calls.length,4);
 f.settleAll();f.core.update();assert.equal(f.core.capturePlan().kind,'epoch');
 f.core.publication(f.proof());f.core.update();assert.equal(f.core.state.receiverReady,true);
 const count=f.calls.length;f.core.update();assert.equal(f.calls.length,count);
});

test('unknown canonical coverage, stale generation, and failed readiness cannot become complete-empty ACKs',()=>{
 for(const fault of ['unknown','generation','failed']){
  const f=fixture();f.core.update();f.settleAll();
  const row=f.states.get('city');
  if(fault==='unknown')row.settlement.canonical=undefined;
  if(fault==='generation')row.settlement.canonical.generation=0;
  if(fault==='failed')row.ready=false;
  f.core.update();assert.equal(f.core.capturePending,true,fault);assert.equal(f.core.capturePlan(),undefined,fault);
 }
});

test('source and manager changes invalidate an issued plan before another frame-end observation',()=>{
 const f=fixture();f.core.update();f.settleAll();f.core.update();assert(f.core.capturePlan());
 f.setRevision('geometry-2');assert.equal(f.core.capturePending,true);assert.equal(f.core.capturePlan(),undefined);
 f.core.update();assert(f.core.capturePlan());
 f.states.get('city').settlement.pending=true;assert.equal(f.core.capturePending,true);assert.equal(f.core.capturePlan(),undefined);
});

test('publication revocation discards queued proof and revokes a live receiver without erasing the epoch',()=>{
 const f=fixture();f.core.update();f.settleAll();f.core.update();f.core.publication(f.proof());
 f.core.publication(undefined);f.core.update();assert.equal(f.core.state.epochId,undefined);
 f.core.publication(f.proof());f.core.update();f.settleAll();f.core.update();f.core.publication(f.proof());f.core.update();
 assert.equal(f.core.state.receiverReady,true);f.core.publication(undefined);
 assert.equal(f.core.state.receiverReady,false);assert.equal(f.core.state.epochId,1);
});

test('a verified empty painted cohort permits dedicated-only capture and newly appearing geometry revalidates',()=>{
 const f=fixture();f.setCoverage(undefined);f.core.update();assert.equal(f.core.state.empty,true);
 assert.equal(f.core.capturePending,false);assert.equal(f.core.capturePlan(),undefined);assert.equal(f.calls.length,0);
 f.setCoverage({bounds:[1,1,1,2,2,2],triangles:2,draws:1,complete:true});f.setRevision('geometry-2');f.core.update();
 assert.equal(f.core.capturePending,true);assert.equal(f.calls.length,2);
 f.settleAll();f.core.update();assert.equal(f.core.capturePlan().kind,'witness');
});

test('context reset rejects prior proof and requires a fresh successful refresh cycle',()=>{
 const f=fixture();f.core.update();f.settleAll();f.core.update();const old=f.proof();
 f.core.reset();f.core.setContext('context-2');f.core.publication(old);f.core.update();
 assert.equal(f.core.state.epochId,undefined);assert.equal(f.core.capturePending,true);assert.equal(f.calls.length,4);
 f.core.setContext(undefined);assert.equal(f.core.capturePending,false);assert.equal(f.core.projectionFor([0,0,0,1,1,1]),undefined);
});

test('completed capture keeps scalar coverage evidence when temporary capture programs retire before frame end',()=>{
 const f=fixture();f.core.update();f.settleAll();f.core.update();
 f.core.publication(f.proof());f.core.update();f.settleAll();f.core.update();
 const plan=f.core.capturePlan();assert.equal(plan.kind,'epoch');
 f.core.publication(f.proof());
 // A successful GPU capture releases its capture-only program leases in finally.
 // Geometry, source revision and manager settlement remain exactly the same.
 f.setCoverage({bounds:[0,0,0,2,2,2],triangles:12,draws:2,complete:false,reason:'capture-program-unavailable'});
 f.core.update();assert.equal(f.core.state.receiverReady,true);
 assert.equal(f.core.capturePlan().revision,plan.revision);
 const calls=f.calls.length;f.core.update();assert.equal(f.calls.length,calls);
 assert.equal(f.core.state.receiverReady,true);
});

test('captured scalar coverage cannot outlive changed source or manager settlement before frame end',()=>{
 for(const change of ['source','manager','canonical','generation']){
  const f=fixture();f.core.update();f.settleAll();f.core.update();
  f.core.publication(f.proof());f.core.update();f.settleAll();f.core.update();
  f.core.publication(f.proof());
  f.setCoverage({bounds:[0,0,0,2,2,2],triangles:12,draws:2,complete:false});
  if(change==='source')f.setRevision('geometry-changed');
  else if(change==='manager')f.states.get('city').settlement.pending=true;
  else if(change==='canonical')f.states.get('city').settlement.canonical={kind:'bounds',generation:f.states.get('city').settlement.generation,bounds:[0,0,0,3,3,3]};
  else f.states.get('city').settlement.generation++;
  f.core.update();assert.equal(f.core.state.receiverReady,false,change);
  assert.equal(f.core.capturePlan(),undefined,change);
 }
});

test('initial pending frames wait for real provider readiness before querying resident shadow coverage',()=>{
 const f=fixture();
 f.states.get('city').settlement.pending=true;
 for(let i=0;i<60;i++)f.core.update();
 assert.equal(f.coverageReads,0);
 assert.equal(f.core.capturePlan(),undefined);
 f.settle('city');f.core.update();
 assert.equal(f.coverageReads,1);
 assert.deepEqual(f.calls,['city','root500']);
});
