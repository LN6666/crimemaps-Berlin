import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:[new URL('../src/safety/idle-context-reclamation.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm'});
const {installIdleContextReclamation,contextReclamationResourcesIdle}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
function fixture(){
 let now=0,id=0,eligible=true,lost=false,allowPreview=true,controller;
 const timers=new Map(),listeners=new Map(),events=[],previews=[];
 const gl={isContextLost:()=>lost,getExtension:()=>({loseContext(){lost=true;events.push('lose');controller.onLost();},restoreContext(){lost=false;events.push('restore');}})};
 const canvas={width:2400,height:1600,getContext:()=>gl,ownerDocument:{createElement(){const p={width:0,height:0,style:{},setAttribute(){},getContext:()=>({drawImage(){events.push('copy');}}),remove(){events.push('remove');}};previews.push(p);return p;}}};
 let held=0,maxHeld=0;
 const map={on(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},off(type,fn){listeners.get(type)?.delete(fn);},triggerRepaint(){events.push('repaint');},getCanvas:()=>canvas,getCanvasContainer:()=>({append(){events.push('append');}})};
 controller=installIdleContextReclamation({map,idleMs:20000,eligible:()=>eligible,reservePreview(bytes){if(!allowPreview)return;held+=bytes;maxHeld=Math.max(maxHeld,held);let active=true;return{release(){if(active){held-=bytes;active=false;}}};},schedule(fn,ms){const token=++id;timers.set(token,{fn,at:now+ms});return token;},cancel(token){timers.delete(token);}});
 return{controller,events,previews,canvas,gl,emit(type){for(const fn of [...(listeners.get(type)??[])])fn();},advance(ms){const end=now+ms;for(let n=0;n<1000;n++){const next=[...timers].filter(([,r])=>r.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;},eligible(value){eligible=value;},allowPreview(value){allowPreview=value;},get held(){return held;},get maxHeld(){return maxHeld;},get timers(){return timers.size;},get listeners(){return [...listeners.values()].reduce((n,v)=>n+v.size,0);}};
}
test('never recycles an initial 2D page; waits for normal release and a fresh frame',()=>{
 const f=fixture();f.controller.on2DReady();f.advance(30000);assert.deepEqual(f.events,[]);
 f.controller.on3DReady();f.controller.on2DReady();f.eligible(false);f.advance(20000);assert.deepEqual(f.events,[]);
 f.eligible(true);f.advance(1000);assert.deepEqual(f.events,['repaint']);assert.equal(f.controller.stats.attempts,0);
 f.emit('render');assert.deepEqual(f.events,['repaint','copy','append','lose']);assert(f.held>0&&f.held<=8*1024*1024);
 f.advance(999);assert(!f.events.includes('restore'));f.advance(1);assert(f.events.includes('restore'));assert(f.held>0);
 f.controller.onReady();assert.equal(f.held,0);assert.equal(f.previews[0].width,0);assert.equal(f.controller.stats.completed,1);
 f.controller.on2DReady();f.advance(30000);assert.equal(f.controller.stats.attempts,1);
});
test('a new 3D intent cancels both pending delay and queued frame',()=>{
 for(const queued of [false,true]){const f=fixture();f.controller.on3DReady();f.controller.on2DReady();if(queued)f.advance(20000);f.controller.on3DRequested();f.advance(30000);f.emit('render');assert(!f.events.includes('lose'));assert.equal(f.held,0);}
});
test('movement restarts the quiet grace and eligibility is rechecked at the frame',()=>{
 const f=fixture();f.controller.on3DReady();f.controller.on2DReady();f.advance(19000);f.emit('movestart');f.advance(19000);assert.deepEqual(f.events,[]);f.advance(1000);f.eligible(false);f.emit('render');assert(!f.events.includes('lose'));f.eligible(true);f.advance(20000);f.emit('render');assert(f.events.includes('lose'));
});
test('hidden pages cancel pending work and resume with a fresh full grace',()=>{
 const f=fixture();f.controller.on3DReady();f.controller.on2DReady();f.advance(20000);f.controller.setHidden(true);f.emit('render');f.advance(30000);assert(!f.events.includes('lose'));f.controller.setHidden(false);f.advance(19999);f.emit('render');assert(!f.events.includes('lose'));f.advance(1);f.emit('render');assert(f.events.includes('lose'));
});
test('external context loss cancels redundant reclamation',()=>{
 const f=fixture();f.controller.on3DReady();f.controller.on2DReady();f.controller.onLost();f.advance(30000);f.emit('render');assert(!f.events.includes('lose'));assert.equal(f.timers,0);
});
test('preview refusal does not evict resources or blank the map',()=>{
 const f=fixture();f.allowPreview(false);f.controller.on3DReady();f.controller.on2DReady();f.advance(20000);f.emit('render');assert(!f.events.includes('lose'));assert.equal(f.held,0);assert.equal(f.controller.stats.lastResult,'preview-budget-unavailable');
});
test('extreme aspect ratios cannot exceed the preview pixel or reservation cap',()=>{
 for(const [width,height] of [[4294967295,1],[1,4294967295]]){
  const f=fixture();f.canvas.width=width;f.canvas.height=height;f.controller.on3DReady();f.controller.on2DReady();f.advance(20000);f.emit('render');
  assert(f.previews[0].width*f.previews[0].height<=1048576);assert(f.maxHeld<=8*1024*1024);f.controller.destroy();
 }
});
test('an owner recovery error releases the cover but does not strand a lost context',()=>{
 const f=fixture();f.controller.on3DReady();f.controller.on2DReady();f.advance(20000);f.emit('render');f.controller.onError();assert.equal(f.held,0);assert.equal(f.controller.stats.lastResult,'failed');f.advance(2000);assert(f.events.includes('restore'));
});
test('destroy cancels pending restoration and frees the bounded frame and listeners',()=>{
 const f=fixture();f.controller.on3DReady();f.controller.on2DReady();f.advance(20000);f.emit('render');f.controller.destroy();f.controller.destroy();f.advance(5000);assert(!f.events.includes('restore'));assert.equal(f.held,0);assert.equal(f.listeners,0);assert.equal(f.timers,0);
});

test('partially loaded 3D without a ready publication is reclaimed after normal 2D release',()=>{
 const f=fixture();f.controller.on3DRequested();f.advance(60000);f.emit('render');assert(!f.events.includes('lose'));
 // No on3DReady: the actual scene controller can remain partial while providers allocate.
 f.controller.on2DReady();f.eligible(false);f.advance(30000);f.emit('render');assert(!f.events.includes('lose'));
 f.eligible(true);f.advance(1000);f.emit('render');assert(f.events.includes('lose'));assert.equal(f.controller.stats.attempts,1);
});

test('native 2D retained CPU mask and solar index do not block backend reclamation',()=>{
 const idle={gpu:0,preparing:0,retiring:0,recent:0};
 const retained={mask:{bytes:10240},shadow:{bytes:110476},metadata:{bytes:35089636},decoded:{bytes:7596924},'program-source':{bytes:12610}};
 assert.equal(contextReclamationResourcesIdle(idle,retained),true);
 for(const key of Object.keys(idle))for(const value of [1,undefined,null,-1,'0'])assert.equal(contextReclamationResourcesIdle({...idle,[key]:value},retained),false,key);
 for(const key of ['program','program-submitted','program-retiring','gpu-buffer','gpu-vertex-array','texture'])assert.equal(contextReclamationResourcesIdle(idle,{...retained,[key]:{bytes:1}}),false,key);
 const f=fixture();f.controller.on3DRequested();f.controller.on2DReady();f.eligible(contextReclamationResourcesIdle(idle,retained));f.advance(20000);f.emit('render');assert(f.events.includes('lose'));
});
