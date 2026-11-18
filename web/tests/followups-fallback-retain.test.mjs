import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {harness} from './support/managers-stage2-harness.mjs';

// followups (S3 renderers-a CDR[0], DECISIONS 2026-11-02 08:56): the Bremen
// and infill managers' automatic 2D fallbacks pass {retainPrograms:true} to
// renderer.setEnabled(false, ...) as well as to their empty batch, with the call
// order unchanged (setEnabled first). Bremen explicit short visits pass the
// separate main-only reason; infill keeps its existing explicit switch policy. The
// real manager factories under the shared lifecycle harness; the renderer
// methods are observed in call order.
const web=fileURLToPath(new URL('../',import.meta.url));

for(const provider of ['bremen','infill'])test(`${provider}: automatic 2D fallbacks pass {retainPrograms:true} to setEnabled(false) before the empty batch; explicit 2D follows its provider main-program retention policy`,async()=>{
 const h=harness(provider),calls=[],{setBatches,setEnabled}=h.renderer;
 h.renderer.setBatches=(...args)=>{calls.push(['setBatches',...args]);return setBatches(...args);};
 h.renderer.setEnabled=(...args)=>{calls.push(['setEnabled',...args]);return setEnabled(...args);};
 // The last setEnabled(false) and the empty batch that follows it.
 const lastDisable=()=>{const at=calls.findLastIndex(call=>call[0]==='setEnabled'&&call[1]===false);return{at,call:calls[at],batch:calls.slice(at+1).find(call=>call[0]==='setBatches'&&call[1].length===0)};};
 try{
  await h.start();
  calls.length=0;
  await h.manager.requestMode('2d',new AbortController().signal);
  let off=lastDisable();
  assert(off.at>=0,'explicit 2D disables the renderer');const explicit=provider==='bremen'?{retainMainPrograms:true}:undefined;assert.deepEqual(off.call[2],explicit,'explicit 2D carries only the provider main-program retention policy');
  assert.deepEqual(off.batch?.[3],explicit,'the empty batch carries the same reason');
  await h.manager.requestMode('3d',new AbortController().signal);
  calls.length=0;
  await h.manager.requestMode('2d',new AbortController().signal,{retainPrograms:true});
  off=lastDisable();
  assert.deepEqual(off.call[2],{retainPrograms:true},'the page rollback: setEnabled(false) carries the reason');
  assert(off.batch,'the empty batch follows setEnabled');assert.deepEqual(off.batch[3],{retainPrograms:true},'and carries it too');
  calls.length=0;h.fixture.readOverride=async()=>{throw Error('fixture source failure');};
  await assert.rejects(h.manager.requestMode('3d',new AbortController().signal),/fixture source failure/);
  assert.equal(h.manager.mode,'2d');
  off=lastDisable();
  assert(off.at>=0,'the failed request disables the renderer');
  assert.deepEqual(off.call[2],{retainPrograms:true},'the failed request\'s own fallback: setEnabled(false) carries the reason');
  assert(off.batch,'the empty batch follows setEnabled');assert.deepEqual(off.batch[3],{retainPrograms:true},'and carries it too');
 }finally{h.manager.destroy();}
});

// The failed hand-off branch (clearFailedHandoff) is reached only through a
// timed-out or failed hand-off; its call is pinned in the source with the same
// order as the batch.
for(const [provider,fn] of [['bremen','clearFailedHandoff'],['infill','clearFailedHandoff']])test(`${provider}: the failed hand-off fallback disables the renderer with {retainPrograms:true} before its retaining empty batch`,()=>{
 const text=fs.readFileSync(path.join(web,`src/painted/${provider}/safety/three-dimensional-map.ts`),'utf8');
 const start=text.indexOf(' function '+fn+'(');assert(start>=0,fn);
 const body=text.slice(start,text.indexOf('\n function ',start+10));
 const enable=body.indexOf("renderer?.setEnabled(false,{retainPrograms:true});"),batch=body.indexOf("renderer?.setBatches([],++generation,{retainPrograms:true} as never);");
 assert(enable>=0,'setEnabled(false) carries the reason');assert(batch>enable,'before the retaining empty batch');
 assert.equal(body.includes('renderer?.setEnabled(false);'),false,'no unreasoned disable remains in the hand-off fallback');
});

// Review F2: after clearFailedHandoff has fallen back to 2D with the reason,
// the error reaches requestMode's catch with fallback '2d' and the cleared
// ticket. Its setEnabled(false) is then a no-op on the renderer (already
// disabled), but every automatic 2D fallback passes the reason the same way:
// the catch's condition is fallback==='2d' alone, no cleared-ticket exception.
for(const [provider,cleared] of [['bremen','clearedHandoffTicket'],['infill','clearedFailedTicket']])test(`${provider}: requestMode's catch passes {retainPrograms:true} on every 2D fallback, the cleared failed hand-off included`,()=>{
 const text=fs.readFileSync(path.join(web,`src/painted/${provider}/safety/three-dimensional-map.ts`),'utf8');
 const start=text.indexOf('}catch(error){if(signal.aborted||destroyed||ticket!==revision)throw error;lastError=String(error);');assert(start>=0,'the requestMode catch');
 const body=text.slice(start,text.indexOf("announce('error');throw error;}",start));
 assert(body.includes(cleared+"===ticket?'2d'"),'a cleared failed hand-off falls back to 2d');
 const enable=body.indexOf("renderer?.setEnabled(fallback==='3d',fallback==='2d'?{retainPrograms:true}:undefined);");
 assert(enable>=0,'setEnabled carries the reason whenever the fallback is 2d');
 assert.equal(body.includes(`fallback==='2d'&&${cleared}!==ticket?{retainPrograms:true}`),false,'no cleared-ticket exception on the reason');
 assert(body.indexOf(`if(fallback==='2d'&&${cleared}!==ticket){`)>enable,'the (non-cleared) empty batch still follows setEnabled');
});
