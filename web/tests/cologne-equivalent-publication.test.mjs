import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/managers-stage2-harness.mjs';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';
import {fileURLToPath} from 'node:url';
const settlement=createRuntimeLoader().load(fileURLToPath(new URL('../src/safety/scene-solar-detail-settlement.ts',import.meta.url)));
async function refresh(h){h.manager.requestDetailRefresh();h.map.triggerRepaint();await h.settle();}
test('Cologne acknowledges repeated unchanged refreshes without preparing or publishing geometry again',async t=>{
 const h=harness('tier300',{}, {city:'cologne',planners:settlement});t.after(()=>h.manager.destroy());await h.start();
 const before={...h.counts},generation=h.manager.getRevision().generation,revision=h.fixture.inspect().revision;
 for(let i=0;i<3;i++)await refresh(h);
 assert.equal(h.counts.prepares,before.prepares);assert.equal(h.counts.packs,before.packs);
 assert.equal(h.manager.getRevision().generation,generation);
 assert(h.fixture.inspect().revision>revision,'refresh acknowledgement still advances');
 const proof=h.manager.getDetailSettlement();
 assert.equal(proof.readyRequestRevision,proof.requestRevision);
 assert.equal(proof.pending,false);
});
for(const [name,change] of [
 ['camera',h=>{h.view.bearing+=5;}],
 ['viewport',h=>{h.view.bounds=[13.1,52,14,53];}],
 ['canvas',h=>{h.canvas.clientWidth+=10;}],
 ['source authority',h=>h.fixture.changeSource()],
 ['resident replacement',h=>h.materialChanged()],
 ['aggregate pending',h=>{h.fixture.s434Pending=true;}],
])test('Cologne rebuilds after '+name+' changes',async t=>{
 const h=harness('tier300',{}, {city:'cologne',planners:settlement});t.after(()=>h.manager.destroy());await h.start();
 const before=h.counts.prepares;change(h);await refresh(h);assert(h.counts.prepares>before);
});
test('Cologne releases the resident scene in 2D and rebuilds on reentry',async t=>{
 const h=harness('tier300',{}, {city:'cologne',planners:settlement});t.after(()=>h.manager.destroy());await h.start();
 await h.manager.requestMode('2d',new AbortController().signal);assert.equal(h.loaded.length,0);
 const before=h.counts.prepares;await h.start();assert(h.counts.prepares>before);
});
