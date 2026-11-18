import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const bundled=await build({entryPoints:[new URL('../src/safety/display-frame-clock.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {createDisplayFrameClock}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));

for(const fps of [24,30])test(`${fps} Hz avoids early empty callbacks with integer browser delays and nested timer clamping`,()=>{
 let now=0,sequence=0,nesting=0,callbacks=0,repaints=0,active=true;
 const timers=new Map(),frames=[];
 const clock=createDisplayFrameClock({clock:()=>now,requestRepaint:()=>repaints++,setTimer:(fn,delay)=>{
  // Browser timers convert their delay to integer milliseconds. A timer queued
  // inside a sufficiently nested timer also has a four-millisecond minimum.
  const id=++sequence;timers.set(id,{fn,at:now+Math.max(Math.trunc(delay),nesting>5?4:0),nesting:nesting+1});return id;
 },clearTimer:id=>timers.delete(id)});
 const off=clock.subscribe({fps,active:()=>active,frame:t=>{frames.push(t);return true;}});
 for(let i=0;i<60;i++){
  assert.equal(timers.size,1);
  const [id,entry]=timers.entries().next().value;timers.delete(id);
  now=entry.at;nesting=entry.nesting;callbacks++;entry.fn();
 }
 assert.equal(frames.length,callbacks,'every scheduled callback reaches its animation deadline');
 assert.equal(repaints,frames.length);
 const gaps=frames.slice(1).map((value,i)=>value-frames[i]);
 assert(gaps.every(gap=>gap>=1000/fps&&gap<=Math.ceil(1000/fps)),'cadence has no extra four-millisecond catch-up timer');
 active=false;clock.wake();assert.equal(timers.size,0);
 active=true;clock.wake();clock.setPageHidden(true);assert.equal(timers.size,0);
 clock.setPageHidden(false);assert.equal(timers.size,1);off();assert.equal(timers.size,0);
 clock.destroy();assert.equal(timers.size,0);
});


test('repeated wake preserves the same timer but reschedules changed activation deadlines',()=>{
 let now=0,sequence=0,clears=0,active=true,secondActive=false;
 const timers=new Map();
 const clock=createDisplayFrameClock({clock:()=>now,requestRepaint:()=>{},setTimer:(fn,delay)=>{const id=++sequence;timers.set(id,{fn,at:now+delay});return id;},clearTimer:id=>{clears++;timers.delete(id);}});
 const off=clock.subscribe({fps:30,active:()=>active,frame:()=>true});
 const initial=timers.entries().next().value;timers.delete(initial[0]);initial[1].fn();
 const pending=timers.entries().next().value;
 const scheduled=sequence;
 for(let i=0;i<100;i++){now+=0.1;clock.wake();}
 assert.equal(sequence,scheduled,'same deadline must not recreate a browser timer');
 assert.equal(clears,0);
 assert.equal(timers.get(pending[0]),pending[1]);
 const offSecond=clock.subscribe({fps:24,active:()=>secondActive,frame:()=>true});
 assert.equal(sequence,scheduled,'inactive subscription leaves timer intact');
 secondActive=true;clock.wake();
 assert.equal(sequence,scheduled+1,'newly active subscription needs an earlier frame');
 assert.equal(clears,1);assert.equal(timers.size,1);
 secondActive=false;clock.wake();
 assert.equal(sequence,scheduled+2,'removing earliest deadline reschedules remaining frame');
 active=false;clock.wake();assert.equal(timers.size,0);
 active=true;clock.wake();assert.equal(timers.size,1);
 clock.setPageHidden(true);assert.equal(timers.size,0);
 clock.wake();assert.equal(timers.size,0);
 clock.setPageHidden(false);assert.equal(timers.size,1);
 off();offSecond();assert.equal(timers.size,0);clock.destroy();
});
