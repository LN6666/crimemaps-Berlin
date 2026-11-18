import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const built=await build({entryPoints:[new URL('../src/safety/place-search.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {installPlaceSearch}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
class Element extends EventTarget{
  constructor(tag,ownerDocument){super();this.tag=tag;this.ownerDocument=ownerDocument;this.children=[];this.attributes={};this.value='';this.textContent='';}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(name,value){this.attributes[name]=value;}
  click(){this.onclick?.();}
}
function setup(ctx,loadIndex){
  const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
  let timerId=0;const timers=new Map();
  globalThis.setTimeout=fn=>{const id=++timerId;timers.set(id,fn);return id;};
  globalThis.clearTimeout=id=>timers.delete(id);
  ctx.after(()=>{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;});
  const document={createElement:tag=>new Element(tag,document)};
  const input=document.createElement('input'),results=document.createElement('div'),chosen=[];
  const control=installPlaceSearch(input,results,{loadIndex,label:place=>`${place.name} · ${place.kind}`,onSelect:place=>chosen.push(place),noResults:'none',failed:'failed'});
  const change=value=>{input.value=value;input.dispatchEvent(new Event('input'));};
  const tick=()=>{const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn());};
  return{input,results,chosen,control,change,tick,timers,texts:()=>results.children.map(child=>child.textContent)};
}

test('a failed current request renders only failure, then a later input retries',async ctx=>{
  const first=deferred();let calls=0;
  const f=setup(ctx,()=>++calls===1?first.promise:Promise.resolve([{name:'Alpha',kind:'park'}]));
  f.change('alpha');f.tick();first.reject(Error('offline'));await settle();
  assert.deepEqual(f.texts(),['failed']);assert.equal(f.results.attributes['aria-busy'],'false');
  f.change('alpha');f.tick();await settle();
  assert.equal(calls,2);assert.deepEqual(f.texts(),['Alpha · park']);
});

test('a stale rejection cannot repopulate cleared or short queries',async ctx=>{
  const request=deferred(),f=setup(ctx,()=>request.promise);
  f.change('alpha');f.tick();f.change('a');
  request.reject(Error('offline'));await settle();
  assert.deepEqual(f.texts(),[]);assert.equal(f.results.attributes['aria-busy'],'false');
});

test('queries sharing a pending request publish only the latest result once',async ctx=>{
  const request=deferred();let calls=0;const f=setup(ctx,()=>{calls++;return request.promise;});
  f.change('alpha');f.tick();f.change(' BETA ');f.tick();
  request.resolve([{name:'Alpha',kind:'park'},{name:'Beta',kind:'station'}]);await settle();
  assert.equal(calls,1);assert.deepEqual(f.texts(),['Beta · station']);
  assert.equal(f.results.attributes['aria-live'],'polite');assert.equal(f.results.attributes['aria-busy'],'false');
});

test('changing a query away and back invalidates the first generation',async ctx=>{
  const request=deferred(),f=setup(ctx,()=>request.promise);
  f.change('alpha');f.tick();f.change('beta');f.change('alpha');f.tick();
  request.resolve([{name:'Alpha',kind:'park'}]);await settle();
  assert.deepEqual(f.texts(),['Alpha · park']);
});

test('successful index is cached, capped at eight native buttons and passed intact on selection',async ctx=>{
  const rows=Array.from({length:10},(_,id)=>({id,name:`Alpha ${id}`,kind:'park',source:'preserved'}));let calls=0;
  const f=setup(ctx,()=>{calls++;return Promise.resolve(rows);});
  f.change(' ALPHA ');f.tick();await settle();
  assert.equal(f.results.children.length,8);assert(f.results.children.every(button=>button.type==='button'));
  f.results.children[0].click();assert.equal(f.chosen[0],rows[0]);assert.deepEqual(f.texts(),[]);
  f.change('alpha 9');f.tick();await settle();
  assert.equal(calls,1);assert.deepEqual(f.texts(),['Alpha 9 · park']);
  f.change('missing');f.tick();await settle();assert.deepEqual(f.texts(),['none']);
});

test('destroy cancels debounce, removes the listener, and blocks detached buttons',async ctx=>{
  let calls=0;const f=setup(ctx,()=>{calls++;return Promise.resolve([{name:'Alpha',kind:'park'}]);});
  f.change('alpha');f.tick();await settle();const button=f.results.children[0];
  f.change('beta');assert.equal(f.timers.size,1);f.control.destroy();f.control.destroy();
  assert.equal(f.timers.size,0);f.change('alpha');f.tick();button.click();await settle();
  assert.equal(calls,1);assert.deepEqual(f.chosen,[]);assert.deepEqual(f.texts(),[]);
});

for(const reject of [false,true])test(`destroy ignores pending ${reject?'rejection':'success'} without publishing`,async ctx=>{
  const request=deferred(),f=setup(ctx,()=>request.promise);
  f.change('alpha');f.tick();f.control.destroy();
  if(reject)request.reject(Error('aborted'));else request.resolve([{name:'Alpha',kind:'park'}]);
  await settle();assert.deepEqual(f.texts(),[]);assert.equal(f.results.attributes['aria-busy'],'false');
});
