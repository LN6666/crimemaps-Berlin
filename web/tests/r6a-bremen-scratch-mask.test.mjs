// S6a round 6 (review R2): runtime count for the Bremen scene scratch Rathaus
// mask. Bremen's publication path already destroys a replaced unowned scratch;
// the empty-reset path (clearResidentCPU) used to create a new scratch without
// destroying the previous one, so consecutive empty resets accumulated mask
// reservations. This runs the whole production Bremen renderer through the
// shared construction harness and counts only the masks the renderer creates
// through its own './facade-rathaus-proxy-mask' import (real masks, wrapped).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {constructionHarness,component} from './fixtures/bremen-renderer-construction-harness.mjs';

const web=fileURLToPath(new URL('../',import.meta.url));
// R6A_BREMEN_SOURCE may point at an earlier renderer copy (probe only).
const source=process.env.R6A_BREMEN_SOURCE?fs.readFileSync(process.env.R6A_BREMEN_SOURCE,'utf8'):undefined;

function countingHarness(){
 // The harness copies dependency overrides when it is built, so the wrapper
 // delegates lazily to the actual mask module of that harness's own runtime.
 const live=new Set();let created=0,h;
 const real=()=>h.runtime.load(path.join(web,'src','painted/bremen/safety/facade-rathaus-proxy-mask.ts')).createRathausProxyMasks;
 h=constructionHarness(source,{dependencyOverrides:{'./facade-rathaus-proxy-mask':{createRathausProxyMasks(...args){const masks=real()(...args),destroy=masks.destroy.bind(masks);created++;live.add(masks);masks.destroy=(...rest)=>{live.delete(masks);return destroy(...rest);};return masks;}}}});
 assert.equal(typeof real(),'function');
 return{h,live,get created(){return created;}};
}

test('Bremen: consecutive empty resets replace, not accumulate, the scene scratch mask; destroy leaves none',async()=>{
 const c=countingHarness(),{h,live}=c;await h.environment(async()=>{
  const r=h.create();assert.equal(live.size,1,'the initial scene scratch');const initial=[...live][0];
  r.setBatches([],1);assert.equal(live.size,1,'one empty reset holds one scratch');assert(!live.has(initial),'the replaced scratch is destroyed');
  const first=[...live][0];r.setBatches([],2);assert.equal(live.size,1,'a second empty reset still holds one scratch');assert(!live.has(first));
  r.destroy();assert.equal(live.size,0,'destroy leaves no renderer-created mask');assert.equal(c.created,3);
 });
});

test('Bremen: after a published chunk scene, two empty resets hold one scratch and destroy leaves no renderer-created mask',async()=>{
 const c=countingHarness(),{h,live}=c;await h.environment(async()=>{
  const r=h.create(),rows=[component()],batch=await r.prepareBatches(rows,new AbortController().signal);h.commit(r,batch,1);r.setEnabled(true);r.layer.onAdd({},h.gl);await h.flush(r);
  assert.equal(r.getRevision().generation,1);const published=live.size;
  r.setBatches([],2);assert.equal(live.size,1,'the empty scene holds exactly one scratch (published ownership released)');
  r.setBatches([],3);assert.equal(live.size,1,'a second empty reset does not accumulate');
  r.destroy();assert.equal(live.size,0,'destroy leaves no renderer-created mask');assert(c.created>=3);
  assert(published<=1,'publication leaves at most the scene scratch alive (got '+published+')');
 });
});
