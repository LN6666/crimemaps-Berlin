import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';

const source=await readFile(new URL('../src/safety/three-dimensional-controls.ts',import.meta.url),'utf8');
const compiled=await transform(source,{loader:'ts',format:'esm'});
const {installThreeDimensionalControls}=await import('data:text/javascript;base64,'+Buffer.from(compiled.code).toString('base64'));

// Observe focus at the disabling write itself. Native touch/VoiceOver remains
// separate acceptance; this small DOM models focus loss on disabled controls.
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.dataset={};this.focusCalls=[];this.disabledWrites=[];}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  remove(){if(!this.parentElement)return;const parent=this.parentElement;parent.children.splice(parent.children.indexOf(this),1);this.parentElement=undefined;}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  setAttribute(name,value){this.attributes[name]=String(value);}
  get disabled(){return this._disabled??false;}
  set disabled(value){this.disabledWrites.push({value,focused:document.activeElement});this._disabled=value;if(value&&document.activeElement===this)document.activeElement=document.body;}
  focus(options){this.focusCalls.push(options);if(this.disabled||!document.body.contains(this))return;for(let node=this;node;node=node.parentElement)if(node.hidden||node.inert)return;document.activeElement=this;}
}
const walk=node=>[node,...node.children.flatMap(walk)];
function fixture(t,requested=true){
  const saved=new Map(['document','matchMedia'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const body=new Element('body');
  globalThis.document={body,activeElement:body,createElement:tag=>new Element(tag),createTextNode:text=>Object.assign(new Element('#text'),{textContent:text})};
  globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  const host=new Element('div'),other=new Element('button'),changes=[],requests=[];body.append(host,other);
  const controls=installThreeDimensionalControls({host,locale:'en',vehiclesInitiallyRequested:requested,onVehiclesChange:value=>changes.push(value),requestMode:async mode=>{requests.push(mode);return{mode,status:'ready'};}});
  const flat=controls.element.children[0].children[0],vehicle=walk(body).find(node=>node.type==='checkbox');
  t.after(()=>{controls.destroy();for(const [key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  return{controls,flat,vehicle,other,changes,requests};
}

test('reduced motion moves focused moving-car control to usable 2D before disabling it',t=>{
  const f=fixture(t,false);f.vehicle.focus();f.controls.setVehicleReducedMotion(true);
  assert.equal(f.vehicle.disabled,true);assert.equal(f.vehicle.disabledWrites.at(-1).focused,f.flat,'focus moves before the disabling write');
  assert.equal(document.activeElement,f.flat);assert.deepEqual(f.flat.focusCalls,[{preventScroll:true}]);
  assert.equal(f.controls.vehiclesRequested,false);assert.deepEqual(f.changes,[]);assert.deepEqual(f.requests,[],'focus does not request another map mode');
});

test('external focus and motion restoration do not refocus or change the vehicle request',t=>{
  const f=fixture(t);f.other.focus();f.controls.setVehicleReducedMotion(true);
  assert.equal(f.vehicle.disabled,true);assert.equal(document.activeElement,f.other);assert.deepEqual(f.flat.focusCalls,[]);
  f.controls.setVehicleReducedMotion(false);
  assert.equal(f.vehicle.disabled,false);assert.equal(document.activeElement,f.other);assert.deepEqual(f.flat.focusCalls,[]);
  assert.equal(f.controls.vehiclesRequested,true);assert.deepEqual(f.changes,[]);assert.deepEqual(f.requests,[]);
});

test('reduced motion never focuses a disabled mode while the map is unavailable',t=>{
  const f=fixture(t);f.controls.setMapAvailable(false);f.vehicle.focus();f.controls.setVehicleReducedMotion(true);
  assert.equal(f.vehicle.disabled,true);assert.equal(f.flat.disabled,true);assert.deepEqual(f.flat.focusCalls,[]);
  assert.equal(document.activeElement,document.body,'there is no usable mode destination under the existing unavailable-map policy');
  f.other.focus();f.controls.setMapAvailable(true);f.controls.setVehicleReducedMotion(false);
  assert.equal(document.activeElement,f.other);assert.deepEqual(f.flat.focusCalls,[]);assert.equal(f.controls.vehiclesRequested,true);
  assert.deepEqual(f.changes,[]);assert.deepEqual(f.requests,[]);
});
