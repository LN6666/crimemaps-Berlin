import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

async function load(name) {
  const result=await build({entryPoints:[new URL('../src/safety/'+name,import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const {installSceneControls}=await load('scene-controls.ts');
const {installThreeDimensionalControls}=await load('three-dimensional-controls.ts');

// Model focus lost by a DOM move, hidden ancestor or disabled control. Native
// browser and VoiceOver behavior remain separate acceptance checks.
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.dataset={};this.className='';this.value='';this.textContent='';this.appendCount=0;this.focusCount=0;this.classList={add:name=>{this.className+=' '+name;}};}
  append(...nodes){this.appendCount++;for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  remove(){if(!this.parentElement)return;if(this.contains(document.activeElement))document.activeElement=document.body;const parent=this.parentElement;parent.children.splice(parent.children.indexOf(this),1);this.parentElement=undefined;}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  get isConnected(){return document.body.contains(this);}
  get hidden(){return this._hidden??false;}
  set hidden(value){this._hidden=value;if(value&&this.contains(document.activeElement))document.activeElement=document.body;}
  get disabled(){return this._disabled??false;}
  set disabled(value){this._disabled=value;if(value&&document.activeElement===this)document.activeElement=document.body;}
  matches(selector){assert.equal(selector,':disabled');return this.disabled;}
  closest(selector){assert.equal(selector,'[hidden], [inert]');for(let node=this;node;node=node.parentElement)if(node.hidden||node.inert)return node;return null;}
  getClientRects(){return this.isConnected&&!this.closest('[hidden], [inert]')?[{}]:[];}
  focus(options){this.focusCount++;if(!this.disabled&&this.getClientRects().length){document.activeElement=this;this.focusOptions=options;}}
}
const walk=node=>[node,...node.children.flatMap(walk)];
function fixture(t){
  const saved=new Map(['document','matchMedia'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const body=new Element('body'),listeners=new Set(),media={matches:false,addEventListener:(_type,fn)=>listeners.add(fn),removeEventListener:(_type,fn)=>listeners.delete(fn)};
  globalThis.document={body,activeElement:body,hidden:false,createElement:tag=>new Element(tag),createTextNode:text=>Object.assign(new Element('#text'),{textContent:text})};
  globalThis.matchMedia=()=>media;
  const modeHost=new Element('div'),noticeHost=new Element('div'),statusHost=new Element('div'),other=new Element('button');body.append(modeHost,noticeHost,statusHost,other);
  const controls=installThreeDimensionalControls({host:modeHost,noticeHost,statusHost,locale:'en',requestMode:()=>new Promise(()=>{})});
  const group=controls.element.children[0],flat=group.children[0],feedback=walk(body).find(node=>node.className==='three-dimensional-feedback'),retry=feedback.children[1];
  let scene;
  const installScene=()=>{
    const host=new Element('div');noticeHost.append(host);
    const calls=[],published=[],clock={subscribe:()=>()=>{},wake(){}};
    scene=installSceneControls({host,locale:'en',initial:{instantISO:'2026-07-15T10:00:00.000Z',sunlight:true,shadows:true,motion:true,quality:'balanced'},frameClock:clock,onChange:value=>published.push(value),focusWhenHidden:()=>{calls.push({hidden:host.children[0].hidden});controls.focus('2d');}});
    scene.setMode('3d');const root=host.children[0];root.open=true;
    return {scene,root,heading:root.children[0],calls,published,get:predicate=>walk(root).find(predicate)};
  };
  t.after(()=>{scene?.destroy();controls.destroy();for(const [key,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  return {controls,flat,feedback,retry,noticeHost,statusHost,other,installScene,changeMedia(value){media.matches=value;for(const fn of listeners)fn();}};
}

test('breakpoint relocation preserves focused retry and skips a move to the same host',t=>{
  const f=fixture(t);f.controls.setState({mode:'2d',status:'error'});f.retry.focus();
  const before=f.noticeHost.appendCount;
  f.changeMedia(false);assert.equal(f.noticeHost.appendCount,before);assert.equal(document.activeElement,f.retry);
  f.changeMedia(true);assert.equal(f.feedback.parentElement,f.statusHost);assert.equal(document.activeElement,f.retry);assert.deepEqual(f.retry.focusOptions,{preventScroll:true});
  f.other.focus();f.changeMedia(false);assert.equal(document.activeElement,f.other,'an external focus is never restored to feedback');
});

test('relocation does not refocus hidden or disabled retry and unavailable modes are not focused',t=>{
  const f=fixture(t);f.controls.setState({mode:'2d',status:'error'});f.retry.focus();
  const before=f.retry.focusCount;f.statusHost.hidden=true;f.changeMedia(true);
  assert.equal(f.retry.focusCount,before);assert.equal(document.activeElement,document.body);
  f.statusHost.hidden=false;f.retry.focus();f.retry.disabled=true;f.changeMedia(false);
  assert.equal(f.retry.focusCount,before+1);assert.equal(document.activeElement,document.body);
  f.other.focus();f.controls.setMapAvailable(false);const flatFocus=f.flat.focusCount;
  f.controls.focus('2d');f.controls.focus();assert.equal(f.flat.focusCount,flatFocus);assert.equal(document.activeElement,f.other);
});

test('reduced motion transfers only a newly disabled scene control to its visible summary',t=>{
  const f=fixture(t),s=f.installScene();
  const play=s.get(node=>node.className==='scene-play'),motion=s.get(node=>node.type==='checkbox'&&node.parentElement.children.some(child=>child.textContent==='Animate trees and water'));
  for(const target of [play,motion]){
    assert(target);s.scene.setReducedMotion(false);target.focus();s.scene.setReducedMotion(true);
    assert.equal(target.disabled,true);assert.equal(document.activeElement,s.heading);assert.deepEqual(s.heading.focusOptions,{preventScroll:true});
  }
  f.other.focus();s.scene.setReducedMotion(false);s.scene.setReducedMotion(true);
  assert.equal(document.activeElement,f.other);assert.equal(s.published.length,0,'the focus correction does not publish a new environment state');
});

test('2D fallback moves focus before hiding scene controls and leaves unrelated focus alone',t=>{
  const f=fixture(t),s=f.installScene(),date=s.get(node=>node.type==='date');
  date.focus();s.scene.setMode('2d');
  assert.deepEqual(s.calls,[{hidden:false}]);assert.equal(s.root.hidden,true);assert.equal(document.activeElement,f.flat);assert.deepEqual(f.flat.focusOptions,{preventScroll:true});
  s.scene.setMode('3d');f.other.focus();s.scene.setMode('2d');
  assert.equal(s.calls.length,1);assert.equal(document.activeElement,f.other);assert.equal(s.published.length,0);
});
