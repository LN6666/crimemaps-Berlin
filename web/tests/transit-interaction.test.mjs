import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

// Bundle the real module and floating-position dependency, not a test reimplementation.
const built = await build({
  entryPoints: [new URL('../src/safety/transit-interaction.ts', import.meta.url).pathname],
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const {transitChoices, installTransitInteraction, safeTransitURL, publicTransitRecordId,
  transitPanelViewport} = await import('data:text/javascript;base64,' +
  Buffer.from(built.outputFiles[0].text).toString('base64'));
const geometry = Object.freeze({type:'LineString', coordinates:[[13.3,52.5],[13.4,52.6]]});
const feature = (id, properties = {}) => Object.freeze({type:'Feature', geometry,
  properties:Object.freeze({mode:'bus', route_id:id, ...properties})});
const full = feature('osm/relation/123', {ref:'N2', name:'Bus N2: Alpha => Beta',
  operator:'Example operator', from:'Alpha', to:'Beta', relation_id:123,
  source_url:'https://www.openstreetmap.org/relation/123', source_snapshot:'2026-10-03'});
const thin = feature('derived/145', {ref:'145', provenance_sidecar:'/private/provenance.json'});
const manifest = {schema_version:1, city:'fixture', modes:{bus:{status:'available',
  source:{name:'Example source', url:'https://example.org/source'}, reference_date:'2026-10-03'}}};

test('route IDs deduplicate tiled hits without discarding the 1001st rendered record', () => {
  const many = Array.from({length:41}, (_, i) => feature('route/'+i, {ref:String(i)}));
  const choices = transitChoices([...many, many[0]], [...Array(1001).fill(many[0]), ...many], manifest);
  assert.equal(choices.length, 41);
  assert.equal(choices.find(x=>x.routeId==='route/0').features.length, 2);
  assert.equal(choices.find(x=>x.routeId==='route/40').features[0], many[40]);
  assert.equal(transitChoices(many, [feature('not-loaded')], manifest).length, 0);
});

test('missing route names are not manufactured and links reject executable or credential URLs', () => {
  const choices = transitChoices([full,thin], [full,thin], manifest);
  const sparse = choices.find(x=>x.routeId===thin.properties.route_id);
  assert.equal(sparse.values.name, undefined);
  assert.equal(sparse.values.from, undefined);
  assert.equal(sparse.values.operator, undefined);
  assert.equal(sparse.sourceURL, 'https://example.org/source');
  assert.equal(sparse.metadataReference, true);
  assert.equal(choices.find(x=>x.routeId===full.properties.route_id).values.name, full.properties.name);
  assert.equal(safeTransitURL('javascript:alert(1)'), undefined);
  assert.equal(safeTransitURL('https://user:secret@example.org'), undefined);
  assert.equal(safeTransitURL('http://example.org'), undefined);
  assert.equal(publicTransitRecordId('a'.repeat(64)), undefined);
  const evil = feature('evil', {name:'<img src=x onerror=alert(1)>', source_url:'javascript:alert(1)'});
  assert.equal(transitChoices([evil], [evil])[0].values.name, evil.properties.name);
  assert.equal(transitChoices([evil], [evil])[0].sourceURL, undefined);
});

// This narrow DOM double tests event/state contracts. Real layout and browser rendering
// remain covered by the separate browser checks; no downloaded city data is needed.
class Element {
  constructor(tag) {this.tag=tag; this.children=[]; this.style={}; this.attrs={}; this.events=new Map(); this._text='';}
  get textContent() {return this._text + this.children.map(x=>x.textContent).join('');}
  set textContent(text) {this._text=text; this.children=[];}
  append(...nodes) {for(const node of nodes) {this.children.push(node); node.parent=this;}}
  replaceChildren(...nodes) {this.children=[]; this._text=''; this.append(...nodes);}
  setAttribute(key,value) {this.attrs[key]=value;}
  addEventListener(key,value) {this.events.set(key,value);}
  remove() {if(this.parent) this.parent.children.splice(this.parent.children.indexOf(this),1);}
  closest() {return this.tag==='button'?this:null;}
  setPointerCapture(id) {this.capturedPointer=id;}
  get offsetWidth() {return parseFloat(this.style.width)||280;}
  get offsetHeight() {return Math.min(300,parseFloat(this.style.maxHeight)||300);}
  getBoundingClientRect() {
    if(this.tag==='host') return {left:0,top:80,right:320,bottom:720};
    const left=parseFloat(this.style.left)||0, top=parseFloat(this.style.top)||0;
    return {left,top,right:left+this.offsetWidth,bottom:top+this.offsetHeight};
  }
}
const descendants = element => [element,...element.children.flatMap(descendants)];
function fixture(t, locale, initial=[full,thin]) {
  const previous = new Map(['document','window','innerWidth','innerHeight'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  const events=new Map(), visualEvents=new Map(), mapEvents=new Map();
  const visualViewport={offsetLeft:0,offsetTop:0,width:320,height:720,
    addEventListener:(k,f)=>visualEvents.set(k,f),removeEventListener:k=>visualEvents.delete(k)};
  Object.assign(globalThis,{document:{body:new Element('body'),createElement:tag=>new Element(tag)},
    window:{visualViewport,addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k)},innerWidth:320,innerHeight:720});
  let loaded=initial, hits=[...Array(1001).fill(initial[0]),...initial], hitBox;
  const sources=new Map(), layers=new Map([['public-transit-bus-lines',{}]]);
  const map={getSource:id=>sources.get(id),addSource(id,source){sources.set(id,{...source,setData(data){this.data=data;}})},
    removeSource:id=>sources.delete(id),getLayer:id=>layers.get(id),addLayer:layer=>layers.set(layer.id,layer),
    removeLayer:id=>layers.delete(id),on:(key,fn)=>mapEvents.set(key,fn),off:key=>mapEvents.delete(key),
    queryRenderedFeatures(box){hitBox=box;return hits;}};
  const inspector=installTransitInteraction({map,host:new Element('host'),locale,loaded:()=>loaded,manifest:()=>manifest});
  t.after(()=>{inspector.destroy(); for(const [key,descriptor] of previous) {
    if(descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key];
  }});
  return {inspector,sources,layers,events,visualEvents,mapEvents,visualViewport,
    panel:document.body.children[0],setLoaded(value){loaded=value;},get hitBox(){return hitBox;}};
}

for(const [locale,next] of [['zh','下一页'],['en','Next'],['de','Weiter']]) {
  test(locale+': all 41 overlap choices remain reachable across three pages', t => {
    const many=Array.from({length:41},(_,i)=>feature('many/'+(i+1), {ref:String(i+1).padStart(2,'0'),name:'Line '+(i+1)}));
    const f=fixture(t,locale,many);
    assert.equal(f.inspector.inspect({x:100,y:200}),true);
    assert.deepEqual(f.hitBox,[[94,194],[106,206]]);
    assert.equal(f.inspector.choiceCount,41);
    const header=f.panel.children[0];
    for(let i=0;i<2;i++) {
      const button=descendants(f.panel).find(e=>e.tag==='button'&&e.textContent===next);
      assert(button&&!button.disabled); button.onclick();
      assert.equal(f.panel.children[0],header);
    }
    const last=descendants(f.panel).find(e=>e.tag==='button'&&e.textContent.startsWith('41 ·'));
    assert(last);last.onclick();
    assert.equal(f.inspector.selection.routeId,'many/41');
    assert.equal(f.sources.get('public-transit-selected-route').data.features[0],many[40]);
    assert.equal(f.sources.get('public-transit-selected-route').data.features[0].geometry,geometry);
  });
}

for(const [locale,missing] of [['zh','当前地图未提供'],['en','Not provided in this map data'],['de','In diesen Kartendaten nicht angegeben']]) {
  test(locale+': source text stays literal and sparse fields remain visibly missing', t => {
    const f=fixture(t,locale);assert(f.inspector.inspect({x:100,y:200}));
    const fullButton=descendants(f.panel).find(e=>e.tag==='button'&&e.textContent.startsWith('N2 ·'));
    assert(fullButton);fullButton.onclick();assert(f.panel.textContent.includes(full.properties.name));
    assert(f.panel.textContent.includes(full.properties.operator));assert(f.panel.textContent.includes('2026-10-03'));
    assert(descendants(f.panel).some(e=>e.tag==='a'&&e.href===full.properties.source_url&&e.rel==='noopener noreferrer'));
    const sparseButton=descendants(f.panel).find(e=>e.tag==='button'&&e.textContent==='145');
    assert(sparseButton);sparseButton.onclick();assert(f.panel.textContent.includes(missing));
    assert.equal(f.inspector.selection.values.name,undefined);
    assert.equal(f.sources.get('public-transit-selected-route').data.features[0],thin);
    assert(descendants(f.panel).some(e=>e.tag==='a'&&e.href==='https://example.org/source'));
  });
}

test('mode removal, other-click clear, escape, close and destroy remove selection safely', t => {
  const f=fixture(t,'en');
  assert(f.inspector.inspect({x:100,y:200}));
  const source=f.sources.get('public-transit-selected-route');
  const staleChoice=descendants(f.panel).find(e=>e.tag==='button'&&e.textContent==='145');
  f.setLoaded([]);f.inspector.update();staleChoice.onclick();assert.equal(f.inspector.selection,undefined);assert(f.panel.hidden);
  assert.equal(source.data.features.length,0);
  f.setLoaded([full,thin]);assert(f.inspector.inspect({x:100,y:200}));
  f.inspector.clear();assert(f.panel.hidden);assert.equal(source.data.features.length,0);
  assert(f.inspector.inspect({x:100,y:200}));f.panel.onkeydown({key:'Escape'});assert(f.panel.hidden);
  assert(f.inspector.inspect({x:100,y:200}));f.panel.children[0].children[1].onclick();assert(f.panel.hidden);
  f.inspector.destroy();assert.equal(document.body.children.length,0);
  assert.equal(f.events.size,0);assert.equal(f.visualEvents.size,0);assert.equal(f.mapEvents.size,0);
  assert(!f.sources.has('public-transit-selected-route'));assert(!f.layers.has('public-transit-selected-line'));
  assert.equal(f.inspector.inspect({x:100,y:200}),false);
});

test('the shared compact card supports pointer, keyboard and visible-viewport clamp', t => {
  const f=fixture(t,'zh');assert(f.inspector.inspect({x:100,y:200}));
  assert.equal(f.panel.className,'geography-panel transit-route-inspector');
  assert.equal(f.panel.style.background,undefined);assert.equal(f.panel.style.width,'280px');
  const header=f.panel.children[0];assert(header.className.includes('geography-drag'));
  header.onpointerdown({target:header,clientX:20,clientY:100,pointerId:1});assert.equal(header.capturedPointer,1);
  header.onpointermove({clientX:-900,clientY:-900});assert.equal(f.panel.style.left,'12px');assert.equal(f.panel.style.top,'92px');
  header.onpointermove({clientX:900,clientY:900});assert.equal(f.panel.style.left,'28px');assert.equal(f.panel.style.top,'408px');
  header.onpointerup();header.onkeydown({key:'ArrowLeft',preventDefault(){}});assert.equal(f.panel.style.left,'18px');
  f.visualViewport.width=250;f.visualEvents.get('resize')();assert.equal(f.panel.style.width,'226px');assert.equal(f.panel.style.left,'12px');
  assert.deepEqual(transitPanelViewport({left:10,top:100,right:500,bottom:800},{left:0,top:0,width:320,height:720}),{left:10,top:100,width:310,height:620});
  assert.deepEqual(transitPanelViewport({left:0,top:0,right:1000,bottom:600},{left:20,top:50,width:700,height:400}),{left:20,top:50,width:700,height:400});
});

test('shared card styling keeps closed panels hidden, themes inherited and touch targets accessible', async () => {
  const css=await readFile(new URL('../src/safety/transit-interaction.css',import.meta.url),'utf8');
  assert.match(css,/transit-route-inspector\[hidden\]\s*\{display:none;/);
  assert.match(css,/var\(--glass-line/);assert.match(css,/:root\[data-theme="light"\]/);
  assert.match(css,/min-height:44px/);assert.match(css,/font-size:18px/);
  assert.doesNotMatch(css,/background:\s*#fff(?:\s|;|\})/);
});
