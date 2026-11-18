import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';

const result=await build({entryPoints:[new URL('../src/safety/facade-paint-controls.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false});
const source=result.outputFiles[0].text;

class Element {
  constructor(tagName){this.tagName=tagName;this.children=[];this.style={};this.dataset={};this.attributes={};}
  append(...children){this.children.push(...children);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  querySelectorAll(selector){return this.children.flatMap(child=>[child,...child.querySelectorAll('*')]).filter(node=>selector==='*'||node.tagName==='button'&&(selector==='button'||selector==='button[data-mode]'&&node.dataset.mode!==undefined));}
  click(){this.onclick?.();}
}

function fixture(href){
  const url=new URL(href),location={href:url.href,search:url.search,hostname:url.hostname},events=[],windowEvents=[],historyUpdates=[];
  const document={head:new Element('head'),body:new Element('body'),createElement:tag=>new Element(tag),dispatchEvent:event=>events.push(event.type)};
  const module={exports:{}};
  vm.runInNewContext(source,{module,location,document,URL,URLSearchParams,Event,window:{dispatchEvent:event=>windowEvents.push(event.type)},history:{replaceState:(_state,_title,value)=>historyUpdates.push(String(value))}},{timeout:1000});
  return {api:module.exports,document,events,windowEvents,historyUpdates};
}

test('public pages never install the diagnostic toolbar or map-only side effects',()=>{
  for(const host of ['ln6666.github.io','localhost.example.com','127.0.0.1.example.com']){
    const f=fixture(`https://${host}/crimemaps-Berlin/map/?diagnostics=1&mapOnly=1&sample=berlin-reichstag`);
    f.api.installFacadePaintControls();
    assert.equal(f.api.paintMode(),2,host);
    assert.equal(f.api.paintOverride(),0,host);
    assert.equal(f.document.body.children.length,0,host);
    assert.equal(f.document.head.children.length,0,host);
    assert.equal(f.document.body.dataset.facadeMapOnly,undefined,host);
    assert.deepEqual(f.events,[],host);
    assert.deepEqual(f.windowEvents,[],host);
  }
});

test('local pages require diagnostics=1 explicitly',()=>{
  for(const search of ['', '?diagnostics', '?diagnostics=0', '?diagnostics=true']){
    const f=fixture(`http://127.0.0.1:4282/crimemaps-Berlin/map/${search}`);
    f.api.installFacadePaintControls();
    assert.equal(f.api.paintMode(),2,search);
    assert.equal(f.document.body.children.length,0,search);
    assert.equal(f.document.head.children.length,0,search);
  }
});

test('hiding controls preserves accepted paint defaults, URL modes and invalid-mode fallback',()=>{
  for(const [search,expected] of [['',2],['?paintMode=0',0],['?paintMode=1',1],['?paintMode=2',2],['?paintMode=invalid',2],['?paintMode=9',2]]){
    const f=fixture(`https://ln6666.github.io/crimemaps-Berlin/map/${search}`);
    assert.equal(f.api.paintMode(),expected,`before installation: ${search}`);
    f.api.installFacadePaintControls();
    assert.equal(f.api.paintMode(),expected,`after installation: ${search}`);
    assert.equal(f.api.paintOverride(),0,search);
    assert.equal(f.document.body.children.length,0,search);
  }
});

for(const host of ['127.0.0.1','localhost','[::1]']){
  test(`explicit diagnostics on ${host} retains toolbar modes and repaint events`,()=>{
    const f=fixture(`http://${host}:4282/crimemaps-Berlin/map/?diagnostics=1&facadeTools=1&sample=berlin-reichstag&paintMode=2`);
    f.api.installFacadePaintControls();
    const bar=f.document.body.children.find(node=>node.id==='facade-paint-toolbar');
    assert.ok(bar);
    assert.equal(f.document.head.children.length,1);
    assert.deepEqual(f.events,['facade-paint-change']);
    const modes=bar.querySelectorAll('button[data-mode]');
    assert.equal(modes.length,3);
    assert.equal(modes.find(button=>button.dataset.mode==='2').attributes['aria-pressed'],'true');
    modes.find(button=>button.dataset.mode==='0').click();
    assert.equal(f.api.paintMode(),0);
    assert.equal(modes.find(button=>button.dataset.mode==='0').attributes['aria-pressed'],'true');
    assert.deepEqual(f.events,['facade-paint-change','facade-paint-change']);
    const changed=new URL(f.historyUpdates[0]);
    assert.equal(changed.searchParams.get('paintMode'),'0');
    assert.equal(changed.searchParams.get('sample'),'berlin-reichstag');
    assert.equal(changed.searchParams.get('diagnostics'),'1');
  });
}

test('local diagnostics preserves explicit sample, paintMode and mapOnly parameters',()=>{
  const f=fixture('http://127.0.0.1:4282/crimemaps-Berlin/map/?diagnostics=1&facadeTools=1&sample=berlin-reichstag&paintMode=1&mapOnly=1');
  f.api.installFacadePaintControls();
  const bar=f.document.body.children.find(node=>node.id==='facade-paint-toolbar');
  assert.equal(f.api.paintMode(),1);
  assert.equal(bar.children.find(node=>node.attributes['aria-label']==='示范建筑').value,'berlin-reichstag');
  assert.equal(f.document.body.dataset.facadeMapOnly,'true');
  assert.deepEqual(f.windowEvents,['resize']);
});
