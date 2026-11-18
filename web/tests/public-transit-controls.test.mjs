import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const built=await build({entryPoints:[new URL('../src/safety/public-transit-controls.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {publicTransitControls,publicTransitModes}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
class Element extends EventTarget{
  constructor(tag,document){super();this.tag=tag;this.ownerDocument=document;this.children=[];this.style={};this.attributes={};this.disabled=false;this.checked=false;this._hidden=false;this.textContent='';}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
  setAttribute(name,value){this.attributes[name]=value;}
  get hidden(){return this._hidden;}
  set hidden(value){this._hidden=value;if(value&&this.contains(this.ownerDocument.activeElement))this.ownerDocument.activeElement=this.ownerDocument.body;}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  get isConnected(){return this===this.ownerDocument.body||Boolean(this.parentElement?.isConnected);}
  focus(options){if(this.disabled||!this.isConnected||this.hidden)return;if(!['input','button'].includes(this.tag)&&this.tabIndex===undefined)return;this.focusOptions=options;this.ownerDocument.activeElement=this;}
  click(){this.onclick?.();}
  remove(){if(this.contains(this.ownerDocument.activeElement))this.ownerDocument.activeElement=this.ownerDocument.body;if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=undefined;}
}
const walk=node=>[node,...node.children.flatMap(walk)];
function setup(ctx){
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  const document={createElement:tag=>new Element(tag,document),createTextNode:text=>{const node=new Element('#text',document);node.textContent=text;return node;}};
  document.body=document.createElement('body');document.activeElement=document.body;
  globalThis.document=document;
  ctx.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;});
  const host=document.createElement('div');document.body.append(host);
  let retries=0,focusAtRetry;
  const controls=publicTransitControls(host,'en',()=>{},()=>{retries++;focusAtRetry=document.activeElement;});
  const elements=walk(controls.element),inputs=elements.filter(node=>node.tag==='input'),retry=elements.find(node=>node.tag==='button'),heading=elements.find(node=>node.tag==='h3');
  controls.error();
  return{document,controls,inputs,retry,heading,get retries(){return retries;},get focusAtRetry(){return focusAtRetry;}};
}

test('keyboard retry returns focus to a checked enabled mode before invoking retry',ctx=>{
  const f=setup(ctx),selected=f.inputs.find(input=>input.value==='ferry');selected.checked=true;
  f.retry.focus();f.retry.click();
  assert.equal(f.retry.hidden,true);assert.equal(f.retries,1);
  assert(f.document.activeElement===selected,'checked mode receives focus');assert(f.focusAtRetry===selected,'focus is moved before retry callback');
  assert.deepEqual(selected.focusOptions,{preventScroll:true});
});

test('loading returns focus from retry to the first enabled mode when none is checked',ctx=>{
  const f=setup(ctx);f.controls.setAvailable({metro:{status:'absent_by_official_source',source:'Official source',routeCoverage:'Scope'}});
  f.retry.focus();f.controls.loading('Current area');
  const firstEnabled=f.inputs.find(input=>!input.disabled);
  assert.equal(firstEnabled.value,'tram');assert(f.document.activeElement===firstEnabled,'first enabled mode receives focus');
  assert.deepEqual(firstEnabled.focusOptions,{preventScroll:true});assert.equal(f.retry.hidden,true);assert.equal(f.retries,0);
});

test('all officially disabled modes leave an explicitly focusable heading fallback',ctx=>{
  const f=setup(ctx),absent={status:'absent_by_official_source',source:'Official source',routeCoverage:'Scope'};
  f.controls.setAvailable(Object.fromEntries(publicTransitModes.map(mode=>[mode,absent])));
  f.retry.focus();f.controls.loading();
  assert(f.inputs.every(input=>input.disabled));assert.equal(f.heading.tabIndex,-1);
  assert(f.document.activeElement===f.heading,'heading receives focus when all modes are disabled');assert.deepEqual(f.heading.focusOptions,{preventScroll:true});
});

test('hiding retry does not take focus from an external control',ctx=>{
  const f=setup(ctx),outside=f.document.createElement('input');f.document.body.append(outside);outside.focus();
  f.controls.loading();assert(f.document.activeElement===outside,'loading preserves external focus');
  f.controls.error();f.retry.click();assert(f.document.activeElement===outside,'retry preserves external focus');assert.equal(f.retries,1);
});

test('destroy disables the saved retry handler and later state updates',ctx=>{
  const f=setup(ctx),oldClick=f.retry.onclick,oldHidden=f.retry.hidden;
  f.controls.destroy();f.controls.destroy();oldClick();
  f.controls.loading();f.controls.error();f.retry.click();
  assert.equal(f.retries,0);assert.equal(f.retry.onclick,null);assert.equal(f.retry.hidden,oldHidden);
});
