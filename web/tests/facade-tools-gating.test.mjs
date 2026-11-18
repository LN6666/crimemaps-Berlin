import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

// Owner decision 2026-11-01 (REPORT F5): the facade toolbar is opened by its own
// switch, never by diagnostics=1 alone; no landmark is preselected without
// sample=; Bremen and infill read the same paint mode state as every other
// painted provider. Default paintMode=2 values must not change.
const web=new URL('..',import.meta.url).pathname;
const providers=['bremen','church','city','delegated500','infill','root500','tier300'];
const shared=(await build({entryPoints:[web+'src/safety/facade-paint-controls.ts'],bundle:true,platform:'node',format:'cjs',write:false})).outputFiles[0].text;
const family=(await build({stdin:{contents:['export * as shared from "./src/safety/facade-paint-controls.ts";',...providers.map(p=>`export * as ${p} from "./src/painted/${p}/safety/facade-paint-controls.ts";`)].join('\n'),resolveDir:web,loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false})).outputFiles[0].text;
// A review303 page as main.ts:2338-2339 runs it: the toolbar first, then the exporter, sharing one paint-controls module.
const reviewPageSource=(await build({stdin:{contents:"export {installFacadePaintControls} from './facade-paint-controls';export {installWhiteReviewExport} from './white-review-export';",resolveDir:web+'src/safety',loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false})).outputFiles[0].text;

class Element {
  constructor(tagName){this.tagName=tagName;this.children=[];this.style={};this.dataset={};this.attributes={};}
  append(...children){this.children.push(...children);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  querySelectorAll(selector){return this.children.flatMap(child=>[child,...child.querySelectorAll('*')]).filter(node=>selector==='*'||node.tagName==='button'&&(selector==='button'||selector==='button[data-mode]'&&node.dataset.mode!==undefined));}
  click(){this.onclick?.();}
}
function fixture(href,source=shared){
  const url=new URL(href),replaced=[],location={href:url.href,search:url.search,hostname:url.hostname,replace:value=>replaced.push(String(value))},events=[],historyUpdates=[];
  const document={head:new Element('head'),body:new Element('body'),createElement:tag=>new Element(tag),dispatchEvent:event=>events.push(event.type)};
  const module={exports:{}};
  vm.runInNewContext(source,{module,location,document,URL,URLSearchParams,Event,CustomEvent:Event,window:{dispatchEvent(){}},history:{replaceState:(_state,_title,value)=>historyUpdates.push(String(value))}},{timeout:1000});
  const bar=()=>document.body.children.find(node=>node.id==='facade-paint-toolbar');
  return {api:module.exports,location,document,events,historyUpdates,replaced,bar,select:()=>bar()?.children.find(node=>node.attributes['aria-label']==='示范建筑')};
}
// The fake map stops each capture row at its first camera move and records the
// mapOnly layout there; the capture canvas size and framing follow that layout.
async function reviewPage(href,{clickStart=false,beforeExporter}={}){
  const url=new URL(href),replaced=[],posts=[],jumps=[];
  const location={href:url.href,search:url.search,hostname:url.hostname,pathname:url.pathname,replace:value=>replaced.push(String(value))};
  const document={head:new Element('head'),body:new Element('body'),hidden:false,createElement:tag=>new Element(tag),dispatchEvent(){},addEventListener(){}};
  const manifest=[{number:66,label:'066',city:'bremen',object_id:'osm/way/1',display_name:'review target',focus:[8.8,53.07],zoom:17,modelAvailable:true,part_ids:['osm/way/1/component/a']}];
  const fetch=path=>{if(path==='/__review303_manifest.json')return Promise.resolve({ok:true,json:async()=>manifest});posts.push(String(path).replace('/__review303_capture/',''));return Promise.resolve({ok:true,json:async()=>({})});};
  const map={jumpTo(){jumps.push(document.body.dataset.facadeMapOnly);throw Error('stop at the first camera move');},getCanvas:()=>({width:0,height:0,clientWidth:0,clientHeight:0}),setMaxPitch(){},getContainer:()=>new Element('div'),resize(){}};
  const scene={cacheStats:()=>({mode:'3d'}),renderer:{getRevision:()=>({generation:1}),stats:{}}};
  const module={exports:{}};
  vm.runInNewContext(reviewPageSource,{module,location,document,fetch,URL,URLSearchParams,Event,CustomEvent:Event,window:{dispatchEvent(){}},history:{replaceState(){}},setTimeout,clearTimeout,console},{timeout:2000});
  module.exports.installFacadePaintControls();
  beforeExporter?.(document);
  module.exports.installWhiteReviewExport(()=>map,()=>scene);
  const [status,start]=document.body.children.find(node=>node.id==='review303-export').children;
  await new Promise(resolve=>setTimeout(resolve,50));
  if(clickStart)start.click();
  await new Promise(resolve=>setTimeout(resolve,50));
  return {replaced,posts,jumps,status:status.textContent,startDisabled:start.disabled};
}
// Lines 3-4 of every pre-change copy (shared, Bremen and infill were identical here).
function legacyState(search){let mode=Number(new URLSearchParams(search).get('paintMode')??2),family=0;if(![0,1,2].includes(mode))mode=2;return{mode,family};}

test('acceptance pages with diagnostics=1 but no facade switch never install the toolbar',()=>{
  // The r5-r7 Bremen QA page shape from REPORT F5 (no sample=, no facadeTools=).
  const qa='http://127.0.0.1:4311/crimemaps-Bremen/map/?lang=zh&month=2026-10&diagnostics=1&qaPerf=1&qa3dFocus=8.807,53.0758&qa3dZoom=18&view=3d';
  for(const href of [qa,qa+'&paintMode=0',qa.replace('127.0.0.1','localhost'),qa.replace('127.0.0.1:4311','[::1]:4311'),qa+'&mapOnly=1']){
    const f=fixture(href);
    f.api.installFacadePaintControls();
    assert.equal(f.document.body.children.length,0,href);
    assert.equal(f.document.head.children.length,0,href);
    assert.equal(f.document.body.dataset.facadeMapOnly,undefined,href);
    assert.deepEqual(f.events,[],href);
    assert.equal(f.api.paintMode(),legacyState(new URL(href).search).mode,href);
    assert.equal(f.api.facadePaintToolsRequested(new URL(href).searchParams,new URL(href).hostname),false,href);
  }
});

test('the separate switch only opens the toolbar on local diagnostics pages',()=>{
  for(const host of ['127.0.0.1:4311','localhost:5173','[::1]:4311']){
    const f=fixture(`http://${host}/crimemaps-Bremen/map/?diagnostics=1&facadeTools=1`);
    f.api.installFacadePaintControls();
    assert.ok(f.bar(),host);
    assert.deepEqual(f.events,['facade-paint-change'],host);
  }
  for(const href of [
    'http://127.0.0.1:4311/crimemaps-Bremen/map/?facadeTools=1',
    'http://127.0.0.1:4311/crimemaps-Bremen/map/?diagnostics=0&facadeTools=1',
    'http://127.0.0.1:4311/crimemaps-Bremen/map/?diagnostics=1&facadeTools=true',
    'http://127.0.0.1:4311/crimemaps-Bremen/map/?diagnostics=1&facadeTools=0&sample=hamburg-rathaus',
    'http://127.0.0.1:4311/crimemaps-Bremen/map/?diagnostics=1&facadeTools=&sample=berlin-reichstag',
    'http://127.0.0.1:4311/crimemaps-Bremen/map/?diagnostics=1&sample=berlin-reichstag',
    'http://127.0.0.1:4311/crimemaps-Bremen/map/?diagnostics=1&sample=progressive-review303-66&mapOnly=1',
    'http://127.0.0.1:4311/crimemaps-Munich/map/?diagnostics=1&sample=munich-non500-row-3',
    'https://ln6666.github.io/crimemaps-Bremen/map/?diagnostics=1&facadeTools=1&sample=hamburg-rathaus',
    'https://localhost.example.com/crimemaps-Bremen/map/?diagnostics=1&facadeTools=1',
  ]){
    const f=fixture(href);
    f.api.installFacadePaintControls();
    assert.equal(f.document.body.children.length,0,href);
    assert.equal(f.document.head.children.length,0,href);
    assert.deepEqual(f.events,[],href);
    assert.equal(f.api.paintMode(),2,href);
  }
});

test('without a listed sample the selector shows a neutral disabled placeholder, not Hamburg',()=>{
  // Review303 links carry facadeTools=1 (CDR-4 option b).
  for(const href of ['http://127.0.0.1:4311/crimemaps-Bremen/map/?diagnostics=1&facadeTools=1','http://127.0.0.1:4311/crimemaps-Bremen/map/?diagnostics=1&facadeTools=1&sample=progressive-review303-66&mapOnly=1']){
    const f=fixture(href);f.api.installFacadePaintControls();
    const select=f.select();
    assert.ok(select,href);
    assert.equal(select.value,'',href);
    const [placeholder,...options]=select.children;
    assert.equal(placeholder.value,'');assert.equal(placeholder.disabled,true);assert.equal(placeholder.textContent,'选择示范建筑');
    assert.equal(options.length,8,'the owner-selected demonstration list itself is unchanged');
    assert.ok(options.every(option=>option.value&&!option.disabled));
    assert.notEqual(select.value,'hamburg-rathaus');
    // A placeholder change event cannot navigate anywhere.
    const before=f.location.href;select.onchange();assert.equal(f.location.href,before);
  }
  const explicit=fixture('http://127.0.0.1:4311/crimemaps-Hamburg/map/?diagnostics=1&facadeTools=1&sample=hamburg-rathaus');
  explicit.api.installFacadePaintControls();
  assert.equal(explicit.select().value,'hamburg-rathaus','an explicit listed sample stays selected');
});

test('existing facade review links keep the toolbar and sample navigation carries the switch',()=>{
  const f=fixture('http://127.0.0.1:4311/crimemaps-Berlin/map/?diagnostics=1&facadeTools=1&sample=berlin-reichstag&paintMode=1&mapOnly=1');
  f.api.installFacadePaintControls();
  assert.ok(f.bar());
  assert.equal(f.document.body.dataset.facadeMapOnly,'true','review303-style mapOnly keeps working through the switched review link');
  const select=f.select();select.value='munich-residenz';select.onchange();
  const next=new URL(f.location.href,'http://127.0.0.1:4311');
  assert.equal(next.pathname,'/crimemaps-Munich/map/');
  for(const [key,value] of [['diagnostics','1'],['facadeTools','1'],['sample','munich-residenz'],['paintMode','1'],['mapOnly','1'],['view','3d']])assert.equal(next.searchParams.get(key),value,key);
});

test('Bremen and infill re-export the shared module byte for byte like the other painted providers',async()=>{
  const canonical=await readFile(web+'src/painted/church/safety/facade-paint-controls.ts','utf8');
  assert.equal(canonical,"// One UI state for all frozen material implementations.\nexport * from '../../../safety/facade-paint-controls';\n");
  for(const provider of providers)assert.equal(await readFile(web+`src/painted/${provider}/safety/facade-paint-controls.ts`,'utf8'),canonical,provider);
});

test('every painted provider reads the pre-change paint mode values in the default state',()=>{
  for(const search of ['','?paintMode=0','?paintMode=1','?paintMode=2','?paintMode=invalid','?paintMode=9','?paintMode=','?paintMode=2.0']){
    for(const host of ['ln6666.github.io','127.0.0.1:4311']){
      const href=`http${host.startsWith('127')?'':'s'}://${host}/crimemaps-Bremen/map/${search}`,f=fixture(href,family),expected=legacyState(search);
      for(const name of ['shared',...providers]){
        assert.equal(f.api[name].paintMode(),expected.mode,`${name} ${href}`);
        assert.equal(f.api[name].paintOverride(),expected.family,`${name} ${href}`);
      }
    }
  }
});

test('toolbar mode buttons now reach Bremen and infill together with every other renderer',()=>{
  const f=fixture('http://127.0.0.1:4311/crimemaps-Bremen/map/?diagnostics=1&facadeTools=1',family);
  f.api.shared.installFacadePaintControls();
  const modes=f.bar().querySelectorAll('button[data-mode]');
  assert.equal(modes.length,3);
  assert.equal(modes.find(button=>button.dataset.mode==='2').attributes['aria-pressed'],'true','default stays 立面绘制');
  for(const value of [0,1,2]){
    modes.find(button=>button.dataset.mode===String(value)).click();
    for(const name of ['shared',...providers]){assert.equal(f.api[name].paintMode(),value,`${name} after mode ${value}`);assert.equal(f.api[name].paintOverride(),0,name);}
    assert.equal(new URL(f.historyUpdates.at(-1)).searchParams.get('paintMode'),String(value));
  }
  assert.deepEqual(f.events,['facade-paint-change','facade-paint-change','facade-paint-change','facade-paint-change'],'each click repaints once through the shared event');
});

// The HEAD url() shape without the switch: the first city of a capture round is opened by hand or from a bookmark.
const preSwitchReview='/crimemaps-Bremen/map/?lang=zh&diagnostics=1&view=3d&qa3dFocus=8.8,53.07&sample=progressive-review303-66&paintMode=0&captureMode=0&mapOnly=1&paintQaClearOverlay=1&review303=66&reviewPrefix=p&reviewAuto=';

test('review303 links typed before the switch reload once with it and keep the HEAD mapOnly capture layout',()=>{
  for(const host of ['127.0.0.1:4311','localhost:5173','[::1]:4311'])for(const auto of ['0','1']){
    const href=`http://${host}${preSwitchReview}${auto}`,f=fixture(href);
    f.api.installFacadePaintControls();
    assert.deepEqual(f.replaced,[href+'&facadeTools=1'],'only the switch is appended; every typed parameter stays as it was');
    assert.equal(f.api.review303FacadeSwitchURL(href),href+'&facadeTools=1');
    assert.equal(f.document.body.children.length,0,href);assert.equal(f.document.head.children.length,0,href);assert.deepEqual(f.events,[],href);
    assert.equal(f.api.paintMode(),0,href);
    const reloaded=fixture(f.replaced[0]);reloaded.api.installFacadePaintControls();
    assert.deepEqual(reloaded.replaced,[],'the reloaded page settles without another reload');
    assert.ok(reloaded.bar(),href);
    assert.equal(reloaded.document.body.dataset.facadeMapOnly,'true','the reloaded page gets the mapOnly capture layout HEAD gave this link');
    assert.equal(reloaded.api.paintMode(),0,href);
  }
  const anchored=`http://127.0.0.1:4311${preSwitchReview}0#note`;
  assert.equal(fixture(anchored).api.review303FacadeSwitchURL(anchored),`http://127.0.0.1:4311${preSwitchReview}0&facadeTools=1#note`);
  const switched=fixture(`http://127.0.0.1:4311${preSwitchReview.replace('diagnostics=1','diagnostics=1&facadeTools=1')}1`);
  switched.api.installFacadePaintControls();
  assert.deepEqual(switched.replaced,[]);assert.equal(switched.document.body.dataset.facadeMapOnly,'true','url() links install directly');
  for(const href of [
    `http://127.0.0.1:4311${preSwitchReview.replace('diagnostics=1','diagnostics=1&facadeTools=0')}1`,
    `http://127.0.0.1:4311${preSwitchReview.replace('diagnostics=1','diagnostics=1&facadeTools=true')}1`,
    `http://127.0.0.1:4311${preSwitchReview.replace('diagnostics=1','diagnostics=1&facadeTools=')}1`,
    `http://127.0.0.1:4311${preSwitchReview.replace('diagnostics=1','diagnostics=1&facadeTools=0&facadeTools=1')}1`,
    `http://127.0.0.1:4311${preSwitchReview.replace('&mapOnly=1','')}1`,
    `http://127.0.0.1:4311${preSwitchReview.replace('mapOnly=1','mapOnly=0')}1`,
    `http://127.0.0.1:4311${preSwitchReview.replace('diagnostics=1&','')}1`,
    `http://127.0.0.1:4311${preSwitchReview.replace('diagnostics=1','diagnostics=0')}1`,
    `http://127.0.0.1:4311${preSwitchReview.replace('&review303=66','')}1`,
    `https://ln6666.github.io${preSwitchReview}1`,
    `https://localhost.example.com${preSwitchReview}1`,
  ]){
    const f=fixture(href);f.api.installFacadePaintControls();
    assert.deepEqual(f.replaced,[],href);
    assert.equal(f.api.review303FacadeSwitchURL(href),undefined,href);
    assert.equal(f.bar(),undefined,href);assert.equal(f.document.body.dataset.facadeMapOnly,undefined,href);
  }
});

test('the review303 exporter refuses a local page whose requested mapOnly layout is missing and captures the rest as before',async()=>{
  const typed=`http://127.0.0.1:4311${preSwitchReview}1`;
  // An explicit non-1 switch is never rewritten; a pre-switch page that has not unloaded after its reload request captures nothing either.
  for(const [href,replaced] of [[typed.replace('diagnostics=1','diagnostics=1&facadeTools=0'),[]],[typed,[typed+'&facadeTools=1']]]){
    const page=await reviewPage(href,{clickStart:true});
    assert.deepEqual(page.replaced,replaced,href);
    assert.deepEqual(page.jumps,[],'no camera move: nothing is captured');
    assert.deepEqual(page.posts,[],'no capture, receipt or diagnostics upload');
    assert.match(page.status,/facadeTools=1/);assert.equal(page.startDisabled,true);
  }
  // Every page HEAD captured is captured as before, in the layout HEAD gave it.
  // The operator's own 显示地图界面 click before the exporter loads stays theirs to make, as in HEAD.
  const showPanels=document=>document.body.children.find(node=>node.id==='facade-paint-toolbar').children.find(node=>node.textContent==='显示地图界面').click();
  for(const [href,layout,beforeExporter] of [
    [typed.replace('diagnostics=1','diagnostics=1&facadeTools=1'),'true'],
    [typed.replace('diagnostics=1','diagnostics=1&facadeTools=1'),'false',showPanels],
    [typed.replace('&mapOnly=1',''),undefined],
    [typed.replace('http://127.0.0.1:4311','https://localhost.example.com'),undefined],
    [typed.replace('diagnostics=1&',''),undefined],
  ]){
    const page=await reviewPage(href,{beforeExporter});
    assert.deepEqual(page.replaced,[],href);
    assert.deepEqual(page.jumps,[layout],href);
    assert.deepEqual(page.posts,['city-captureerror.json','city-bremen.json'],href);
    assert.doesNotMatch(page.status,/facadeTools=1/,href);
  }
});
