import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

async function moduleFor(name) {
  const result = await build({entryPoints:[new URL('../src/safety/'+name,import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const {installSceneControls} = await moduleFor('scene-controls.ts');
const {createDisplayFrameClock} = await moduleFor('display-frame-clock.ts');
const {sceneSolarLight} = await moduleFor('scene-solar-light.ts');

class Element {
  constructor(tagName) { this.tagName=tagName;this.children=[];this.dataset={};this.attributes={};this.value='';this.checked=false;this.textContent='';this.className='';this.classList={add: name=>{this.className+=' '+name;}}; }
  append(...children) { for(const child of children){child.parentElement=this;this.children.push(child);} }
  setAttribute(name,value) { this.attributes[name]=String(value); }
  getAttribute(name) { return this.attributes[name]??null; }
  remove() { if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=undefined;} }
}
const walk = node => [node,...node.children.flatMap(walk)];
function fixture(t,{locale='en',instant='2026-10-25T00:59:30.000Z'}={}) {
  const savedDocument=globalThis.document,doc={hidden:false,createElement:tag=>new Element(tag),createTextNode:text=>Object.assign(new Element('#text'),{textContent:text})};
  globalThis.document=doc;
  let mono=0,wall=Date.parse(instant),nextId=0,repaints=0;
  const timers=new Map(),published=[],initial={instantISO:'2026-07-15T10:00:00.000Z',sunlight:true,shadows:true,motion:true,quality:'balanced'};
  t.mock.method(Date,'now',()=>wall);
  const clock=createDisplayFrameClock({requestRepaint:()=>repaints++,clock:()=>mono,setTimer:(fn,delay)=>{const id=++nextId;timers.set(id,{fn,at:mono+delay});return id;},clearTimer:id=>timers.delete(id)});
  const host=new Element('div'),controls=installSceneControls({host,locale,initial,frameClock:clock,onChange:state=>published.push(state)});
  const nodes=walk(host),get=predicate=>{const node=nodes.find(predicate);assert(node,'expected control exists');return node;};
  const follow=()=>get(node=>node.value==='follow-current-time');
  function advance(ms){const end=mono+ms;let calls=0;while(timers.size){const [id,entry]=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(entry.at>end)break;assert(++calls<1000,'display clock remains bounded');wall+=entry.at-mono;mono=entry.at;timers.delete(id);entry.fn();}wall+=end-mono;mono=end;}
  function toggle(value=true){const input=follow();input.checked=value;input.onchange();}
  t.after(()=>{controls.destroy();clock.destroy();if(savedDocument===undefined)delete globalThis.document;else globalThis.document=savedDocument;});
  return {controls,clock,host,doc,published,initial,get,follow,toggle,advance,timers,get wall(){return wall;},get repaints(){return repaints;},nextDelay:()=>Math.min(...[...timers.values()].map(timer=>timer.at-mono))};
}

for(const [locale,label] of [['de','Aktueller Zeit folgen'],['en','Follow current time'],['zh','跟随当前时间']]){
  test(`real-time follow is opt-in and has an accessible ${locale} label`,t=>{
    const f=fixture(t,{locale});f.controls.setMode('3d');
    assert.equal(f.follow().getAttribute('aria-label'),label);
    assert.equal(f.follow().checked,false);assert.equal(f.controls.state.instantISO,f.initial.instantISO);
    assert.equal(f.published.length,0);assert.equal(f.timers.size,0);
  });
}

test('following publishes the real instant immediately, then once a minute across German DST',t=>{
  const f=fixture(t);f.controls.setMode('3d');f.toggle();
  assert.equal(f.published.length,1);assert.equal(f.controls.state.instantISO,'2026-10-25T00:59:30.000Z');
  const output=f.get(node=>node.tagName==='output');assert.equal(output.textContent,'02:59 · UTC+2');
  const before=sceneSolarLight(13.3762,52.5186,f.controls.state.instantISO);
  f.advance(0);assert.equal(f.published.length,1);assert.equal(f.nextDelay(),60000);
  f.advance(59999);assert.equal(f.published.length,1);
  f.advance(1);assert.equal(f.published.length,2);assert.equal(f.controls.state.instantISO,'2026-10-25T01:00:30.000Z');
  assert.equal(output.textContent,'02:00 · UTC+1');assert.equal(f.nextDelay(),60000);
  const after=sceneSolarLight(13.3762,52.5186,f.controls.state.instantISO);
  assert.notEqual(before.azimuthDegrees,after.azimuthDegrees);
  assert.equal(after.method,'NOAA-fractional-year-display');assert.equal(f.repaints,1);
});

test('2D, hidden pages and explicit recovery pause stop scheduling; visible 3D catches up immediately',t=>{
  const f=fixture(t);f.controls.setMode('3d');f.toggle();f.advance(0);
  f.controls.setMode('2d');assert.equal(f.timers.size,0);f.advance(3600000);assert.equal(f.published.length,1);
  f.controls.setMode('3d');assert.equal(f.published.length,2);assert.equal(Date.parse(f.controls.state.instantISO),f.wall);
  f.controls.setMode('3d');assert.equal(f.published.length,2);
  f.doc.hidden=true;f.controls.setPageHidden(true);f.clock.setPageHidden(true);
  assert.equal(f.timers.size,0);f.advance(3600000);assert.equal(f.published.length,2);
  f.doc.hidden=false;f.clock.setPageHidden(false);f.controls.setPageHidden(false);
  assert.equal(f.published.length,3);assert.equal(Date.parse(f.controls.state.instantISO),f.wall);
  f.advance(0);assert.equal(f.published.length,3);
  // GPU recovery may pause this layer even while document.hidden stays false.
  f.controls.setPageHidden(true);assert.equal(f.timers.size,0);f.advance(600000);
  assert.equal(f.published.length,3);f.controls.setPageHidden(false);
  assert.equal(f.published.length,4);assert.equal(Date.parse(f.controls.state.instantISO),f.wall);
});

test('manual date or clock edits cancel following, including an invalid DST-gap time',t=>{
  const f=fixture(t);f.controls.setMode('3d');f.toggle();
  const date=f.get(node=>node.type==='date'),time=f.get(node=>node.type==='range');
  date.value='2026-07-15';time.value='720';date.onchange();
  assert.equal(f.follow().checked,false);assert.equal(f.controls.state.instantISO,'2026-07-15T10:00:00.000Z');assert.equal(f.timers.size,0);
  f.toggle();time.value='780';time.oninput();
  assert.equal(f.follow().checked,false);assert.equal(f.controls.state.instantISO,'2026-10-25T12:00:00.000Z');assert.equal(f.timers.size,0);
  f.toggle();const previous=f.controls.state.instantISO,count=f.published.length;
  date.value='2026-03-29';time.value='150';date.onchange();
  assert.equal(f.follow().checked,false);assert.equal(f.controls.state.instantISO,previous);assert.equal(f.published.length,count);
  assert.match(f.get(node=>node.getAttribute('role')==='status').textContent,/does not exist/);assert.equal(f.timers.size,0);
});

test('day playback and real-time follow are mutually exclusive without changing the existing playback rate',t=>{
  const f=fixture(t);f.controls.setMode('3d');f.toggle();
  const play=f.get(node=>node.className==='scene-play'),start=Date.parse(f.controls.state.instantISO);
  play.onclick();assert.equal(f.follow().checked,false);assert.equal(f.controls.playback.playing,true);
  f.advance(0);assert.equal(f.nextDelay(),125);f.advance(125);
  assert.equal(Date.parse(f.controls.state.instantISO)-start,93750,'25-hour DST day still plays in two minutes');
  f.toggle();assert.equal(f.controls.playback.playing,false);assert.equal(Date.parse(f.controls.state.instantISO),f.wall);
  f.advance(0);assert.equal(f.nextDelay(),60000);f.toggle(false);assert.equal(f.timers.size,0);
});

test('reduced-motion keeps a minute-scale clock update and destruction releases both subscriptions',t=>{
  const f=fixture(t);f.controls.setMode('3d');f.controls.setReducedMotion(true);f.toggle();f.advance(0);
  assert.equal(f.get(node=>node.className==='scene-play').disabled,true);assert.equal(f.nextDelay(),60000);
  const follow=f.follow();assert.equal(f.clock.stats.subscriptions,2);
  f.controls.destroy();f.controls.destroy();assert.equal(f.clock.stats.subscriptions,0);assert.equal(f.timers.size,0);
  assert.equal(follow.onchange,null);assert.equal(f.host.children.length,0);
  const count=f.published.length;f.advance(600000);assert.equal(f.published.length,count);
});
