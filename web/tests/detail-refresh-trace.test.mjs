import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProductionModule} from './support/core3-runtime.mjs';
const {createDetailRefreshTrace}=loadProductionModule(new URL('../src/safety/detail-refresh-trace.ts',import.meta.url));
test('refresh evidence is bounded, counted by cause, and old snapshots cannot change',()=>{
 const trace=createDetailRefreshTrace();trace.record('reflection-state',12);
 const first=trace.snapshot();
 for(let i=0;i<100;i++)trace.record('solar-coordinator',20+i,'delegated500');
 const last=trace.snapshot();
 assert.equal(last.total,101);assert.equal(last.events.length,32);assert.equal(last.dropped,69);
 assert.equal(last.counts['solar-coordinator'],100);assert.equal(last.counts['reflection-state'],1);
 assert.equal(last.events[0].sequence,70);assert.equal(last.events.at(-1).provider,'delegated500');
 assert.deepEqual(first.events,[{sequence:1,atMs:12,reason:'reflection-state'}]);
 last.events[0].reason='broadcast-dispatch';last.counts['solar-coordinator']=0;
 assert.equal(trace.snapshot().counts['solar-coordinator'],100);
 assert.equal(trace.snapshot().events[0].reason,'solar-coordinator');
 assert.match(last.scope,/not completed rebuilds/);
});
