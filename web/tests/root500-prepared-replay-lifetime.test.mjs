import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,tick} from './support/managers-stage2-harness.mjs';

function fixture(provider,{hold=false}={}){
 const h=harness(provider),original=h.renderer.prepareBatches.bind(h.renderer),receipts=[];
 let resolve,active=0;const gate=new Promise(done=>resolve=done);
 h.renderer.prepareBatches=async(...args)=>{
  const prepared=await original(...args),release=prepared.scope.retainPrepared([],[]);
  let held=true;active++;
  const releaseInputs=()=>{if(!held)return;held=false;active--;release();};
  if(provider==='root500')prepared.releaseReconstructionInputs=releaseInputs;
  else{const originalRelease=prepared.release.bind(prepared);prepared.release=()=>{try{originalRelease();}finally{releaseInputs();}};}
  receipts.push(prepared);if(hold)await gate;return prepared;
 };
 return {h,receipts,open:()=>resolve(),get active(){return active;}};
}
const settle=async()=>{for(let i=0;i<40;i++)await tick();};
for(const provider of ['root500','infill'])for(const action of ['2d','destroy','viewport'])test(provider+' replay input ownership ends on '+action,async()=>{
 const f=fixture(provider),h=f.h;
 try{
  await h.start();assert.equal(f.active,1,'resident preparation retains replay inputs');
  if(action==='2d')await h.manager.requestMode('2d',new AbortController().signal);
  else if(action==='destroy')h.manager.destroy();
  else h.map.emit('movestart');
  await settle();assert.equal(f.active,0,'retired preparations release replay ownership');
  for(const prepared of f.receipts)assert.equal(prepared.displayComponents.length,0,'retired arrays are removed from reusable result');
 }finally{h.manager.destroy();f.open();await settle();}
});
for(const provider of ['root500','infill'])test(provider+' cancellation while a prepared result is returning releases replay ownership',async()=>{
 const f=fixture(provider,{hold:true}),h=f.h,controller=new AbortController();
 try{
  const request=h.manager.requestMode('3d',controller.signal),rejected=assert.rejects(request,{name:'AbortError'});
  for(let i=0;i<600&&!f.receipts.length;i++)await tick();assert.equal(f.active,1);
  controller.abort();f.open();await rejected;await settle();assert.equal(f.active,0);
 }finally{f.open();controller.abort();h.manager.destroy();await settle();}
});
