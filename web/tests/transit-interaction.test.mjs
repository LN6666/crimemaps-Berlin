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
function fixture(t, locale, initial=[full,thin],extra={}) {
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
    removeLayer:id=>layers.delete(id),setFilter(){},on:(key,fn)=>mapEvents.set(key,fn),off:key=>mapEvents.delete(key),
    queryRenderedFeatures(box){hitBox=box;return hits;}};
  const inspector=installTransitInteraction({map,host:new Element('host'),locale,loaded:()=>loaded,manifest:()=>manifest,...extra});
  t.after(()=>{inspector.destroy(); for(const [key,descriptor] of previous) {
    if(descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key];
  }});
  return {inspector,sources,layers,events,visualEvents,mapEvents,visualViewport,
    panel:document.body.children[0],setHits(value){hits=value;},setLoaded(value){loaded=value;},get hitBox(){return hitBox;}};
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

const stopBuilt=await build({entryPoints:[new URL('../src/safety/transit-route-stops.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {createTransitStopLoader,parseStopRoster,parseStopIndex,stopDescriptor,STOP_BYTE_LIMIT}=await import('data:text/javascript;base64,'+Buffer.from(stopBuilt.outputFiles[0].text).toString('base64'));
const {createHash}=await import('node:crypto');
const stopSource={name:'Fixture source',url:'https://example.org/route',sha256:'a'.repeat(64)};
function roster(routeId=full.properties.route_id,count=42){return {schema_version:1,city:'fixture',mode:'bus',route_id:routeId,variants:[{variant_id:'forward',direction:'Alpha → Beta',complete:true,source:stopSource,reference_date:'2026-10-03',start_stop_id:'stop/1',end_stop_id:'stop/'+count,stops:Array.from({length:count},(_,i)=>({stop_id:'stop/'+(i+1),sequence:i+1,name:'Stop '+(i+1),coordinates:[13.3+i/1000,52.5],city_scope:i===count-1?'out_of_city':'in_city',source_url:'https://example.org/stop/'+(i+1)}))}]};}
function stopFixture(...data){
 const blobs=new Map(),calls=[];const descriptor=(path,value)=>{const bytes=new TextEncoder().encode(JSON.stringify(value));blobs.set(path,bytes);return {path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
 const refs=data.map((r,i)=>({route_id:r.route_id,...descriptor('/safety/transit/stops/roster-'+i+'.json',r)}));
 const index=descriptor('/safety/transit/stops/bus-index.json',{schema_version:1,city:'fixture',mode:'bus',routes:refs});
 return {index,blobs,calls,fetchBytes:async(path,signal,maxBytes)=>{calls.push({path,signal,maxBytes});assert(maxBytes<=STOP_BYTE_LIMIT);return blobs.get(path);}};
}
async function until(predicate){const end=Date.now()+2000;while(!predicate()){if(Date.now()>end)assert.fail('Expected async stop state did not settle');await new Promise(r=>setTimeout(r,2));}}

test('stop parser keeps source occurrence order, repeated visits and original coordinate references',()=>{
 const r=roster();r.variants[0].stops[2].stop_id='stop/1';const parsed=parseStopRoster(r,'fixture','bus',r.route_id);assert.equal(parsed,r);assert.equal(parsed.variants[0].stops.length,42);assert.equal(parsed.variants[0].stops[2].stop_id,'stop/1');assert.equal(parsed.variants[0].stops[0].coordinates,r.variants[0].stops[0].coordinates);
 for(const mutate of [x=>x.city='other',x=>x.mode='metro',x=>x.route_id='other',x=>x.variants[0].end_stop_id='orphan',x=>x.variants[0].stops[1].sequence=1,x=>x.variants[0].stops[0].coordinates=[181,52],x=>x.variants[0].source.url='javascript:alert(1)']){const bad=structuredClone(r);mutate(bad);assert.throws(()=>parseStopRoster(bad,'fixture','bus',r.route_id));}
});
test('selected route uses exactly a verified index and its roster; bytes, hashes and city identity fail closed',async()=>{
 const r=roster(),f=stopFixture(r,roster('unused')),loader=createTransitStopLoader(f.fetchBytes),signal=new AbortController().signal;
 await loader.load('fixture','bus',r.route_id,f.index,signal);assert.equal(f.calls.length,2);assert.equal(f.calls[1].path,'/safety/transit/stops/roster-0.json');assert(!f.calls.some(x=>x.path.endsWith('roster-1.json')));
 await assert.rejects(loader.load('fixture','bus',r.route_id,{...f.index,bytes:f.index.bytes+1},signal),/size/);
 await assert.rejects(loader.load('fixture','bus',r.route_id,{...f.index,sha256:'b'.repeat(64)},signal),/hash/);
 await assert.rejects(loader.load('wrong-city','bus',r.route_id,f.index,signal),/identity/);
 assert(!stopDescriptor({...f.index,path:'/safety/transit/../private.json'}));assert(!stopDescriptor({...f.index,bytes:STOP_BYTE_LIMIT+1}));
 const duplicate={schema_version:1,city:'fixture',mode:'bus',routes:[{route_id:'same',...f.index},{route_id:'same',...f.index}]};assert.throws(()=>parseStopIndex(duplicate,'fixture','bus'));
});
test('stop cache remains bounded and missing roster is not invented from line endpoints',async()=>{
 const data=Array.from({length:5},(_,i)=>roster('route/'+i,2)),f=stopFixture(...data),loader=createTransitStopLoader(f.fetchBytes),signal=new AbortController().signal;
 for(const r of data)await loader.load('fixture','bus',r.route_id,f.index,signal);
 assert.equal(loader.stats().rosters,2);assert.equal(loader.stats().indexes,1);assert.equal(loader.stats().maxBytes,4*STOP_BYTE_LIMIT);
 assert.equal(await loader.load('fixture','bus','not-listed',f.index,signal),undefined);
 loader.clear();assert.equal(loader.stats().rosters,0);
});
test('aborted roster completion cannot populate the loader cache',async()=>{
 const r=roster(),f=stopFixture(r),abort=new AbortController();let release;const loader=createTransitStopLoader(async(path,signal,limit)=>{if(path.endsWith('roster-0.json'))return new Promise(resolve=>release=()=>resolve(f.blobs.get(path)));return f.fetchBytes(path,signal,limit);});
 const pending=loader.load('fixture','bus',r.route_id,f.index,abort.signal);await until(()=>!!release);abort.abort();release();await assert.rejects(pending,{name:'AbortError'});assert.equal(loader.stats().rosters,0);
});
for(const [locale,outside,selectedLabel]of [['zh','市外','所选站点'],['en','Outside the city','Selected stop'],['de','Außerhalb der Stadt','Ausgewählte Haltestelle']]){
 test(locale+': stop roster is lazy, collapsed and fully pageable, with direct station pointer binding',async t=>{
  const r=roster(),data=stopFixture(r),m={...manifest,modes:{bus:{...manifest.modes.bus,source:stopSource,stop_lists_index:data.index}}};const f=fixture(t,locale,[full],{city:'fixture',fetchBytes:data.fetchBytes,manifest:()=>m});assert.equal(data.calls.length,0);assert(f.inspector.inspect({x:100,y:200}));await until(()=>f.sources.has('public-transit-selected-stops'));
  const source=f.sources.get('public-transit-selected-stops');assert.equal(source.data.features.length,42);assert.deepEqual(source.data.features[0].geometry.coordinates,r.variants[0].stops[0].coordinates);assert.equal(f.sources.get('public-transit-selected-route').data.features[0],full);
  let list=descendants(f.panel).find(e=>e.className==='transit-route-stop-list');assert.equal(list.open,false);assert(f.panel.textContent.includes('Stop 42'));assert(f.panel.textContent.includes(outside));
  list.open=true;list.ontoggle();const next={zh:'下一页',en:'Next',de:'Weiter'}[locale];for(let i=0;i<2;i++){list=descendants(f.panel).find(e=>e.className==='transit-route-stop-list');const button=descendants(list).find(e=>e.tag==='button'&&e.textContent===next);assert(button&&!button.disabled);button.onclick();}
  const last=descendants(f.panel).find(e=>e.tag==='button'&&e.className.includes('transit-route-stop-choice')&&e.textContent.startsWith('42.'));assert(last);last.onclick();assert(f.panel.textContent.includes(selectedLabel));assert.equal(descendants(f.panel).find(e=>e.className==='transit-route-stop-list').open,true);
  f.setHits([{properties:{route_id:r.route_id,variant_id:'forward',stop_id:'stop/2',sequence:2}}]);assert(f.inspector.inspect({x:100,y:200}));assert.equal(descendants(f.panel).find(e=>e.className==='transit-route-stop-detail').children[0].textContent,selectedLabel+': Stop 2');assert.equal(f.inspector.selection.routeId,r.route_id);assert.equal(f.sources.get('public-transit-selected-route').data.features[0],full);
  f.setLoaded([]);f.inspector.update();assert(f.panel.hidden);assert.equal(source.data.features.length,0);
 });
}
test('partial roster and missing coordinates retain source-specific endpoint gaps',async t=>{
 const r=roster();r.variants[0].complete=false;r.variants[0].start_stop_id=null;r.variants[0].end_stop_id=null;r.variants[0].stops[0].coordinates=null;r.variants[0].stops[0].name=null;const data=stopFixture(r),m={...manifest,modes:{bus:{...manifest.modes.bus,source:stopSource,stop_lists_index:data.index}}};const f=fixture(t,'en',[full],{fetchBytes:data.fetchBytes,manifest:()=>m});assert(f.inspector.inspect({x:0,y:0}));await until(()=>f.sources.has('public-transit-selected-stops'));assert(f.panel.textContent.includes('Start stop not confirmed'));assert(f.panel.textContent.includes('End stop not confirmed'));assert(f.panel.textContent.includes('Only part'));assert.equal(f.sources.get('public-transit-selected-stops').data.features.length,41);const b=descendants(f.panel).find(e=>e.className==='transit-route-choice transit-route-stop-choice'&&e.textContent.startsWith('1.'));b.onclick();assert(f.panel.textContent.includes('Source coordinates are missing'));
});
test('route cancellation drops late stop results and removes all stop layers on destroy',async t=>{
 const r=roster(),data=stopFixture(r);let release;const m={...manifest,modes:{bus:{...manifest.modes.bus,source:stopSource,stop_lists_index:data.index}}};const f=fixture(t,'en',[full],{manifest:()=>m,fetchBytes:async(path,signal,limit)=>{if(path.endsWith('roster-0.json'))return new Promise(resolve=>release=()=>resolve(data.blobs.get(path)));return data.fetchBytes(path,signal,limit);}});assert(f.inspector.inspect({x:0,y:0}));await until(()=>!!release);f.inspector.clear();release();await new Promise(r=>setTimeout(r,10));assert(f.panel.hidden);assert(!f.sources.has('public-transit-selected-stops'));f.inspector.destroy();assert(![...f.layers.keys()].some(x=>x.startsWith('public-transit-selected-stop')));
});
test('explicit variants keep station order and source shape geometry separate',async t=>{
 const r=roster(full.properties.route_id,2);r.variants[0].shape_ids=['forward'];r.variants.push({...structuredClone(r.variants[0]),variant_id:'reverse',direction:'Beta → Alpha',shape_ids:['reverse'],start_stop_id:'stop/2',end_stop_id:'stop/1',stops:[{...r.variants[0].stops[1],sequence:1},{...r.variants[0].stops[0],sequence:2}]});const forward=feature(r.route_id,{shape_id:'forward'}),reverse=feature(r.route_id,{shape_id:'reverse'}),data=stopFixture(r),m={...manifest,modes:{bus:{...manifest.modes.bus,source:stopSource,stop_lists_index:data.index}}};const f=fixture(t,'en',[forward,reverse],{fetchBytes:data.fetchBytes,manifest:()=>m});assert(f.inspector.inspect({x:0,y:0}));await until(()=>f.sources.has('public-transit-selected-stops'));assert.equal(f.sources.get('public-transit-selected-route').data.features[0],forward);const b=descendants(f.panel).find(e=>e.tag==='button'&&e.textContent==='Beta → Alpha');b.onclick();assert.equal(f.sources.get('public-transit-selected-route').data.features.length,1);assert.equal(f.sources.get('public-transit-selected-route').data.features[0],reverse);assert.equal(f.sources.get('public-transit-selected-stops').data.features[0].properties.stop_id,'stop/2');
});
test('selected station identity guards reject orphan route, variant and order hits',async t=>{
 const r=roster(),data=stopFixture(r),m={...manifest,modes:{bus:{...manifest.modes.bus,source:stopSource,stop_lists_index:data.index}}};const f=fixture(t,'en',[full],{fetchBytes:data.fetchBytes,manifest:()=>m});assert(f.inspector.inspect({x:0,y:0}));await until(()=>f.sources.has('public-transit-selected-stops'));
 for(const bad of [{route_id:'other',variant_id:'forward',stop_id:'stop/1',sequence:1},{route_id:r.route_id,variant_id:'other',stop_id:'stop/1',sequence:1},{route_id:r.route_id,variant_id:'forward',stop_id:'stop/1',sequence:2}]){f.setHits([{properties:bad}]);assert.equal(f.inspector.inspectStop({x:0,y:0}),false);assert.equal(f.inspector.selection.routeId,r.route_id);}
 assert.equal(f.inspector.inspectStop({x:NaN,y:0}),false);
});
test('changed line-source hash clears points and cannot reuse an old source roster',async t=>{
 const r=roster(),data=stopFixture(r);let m={...manifest,modes:{bus:{...manifest.modes.bus,source:stopSource,stop_lists_index:data.index}}};const f=fixture(t,'en',[full],{fetchBytes:data.fetchBytes,manifest:()=>m});assert(f.inspector.inspect({x:0,y:0}));await until(()=>f.sources.has('public-transit-selected-stops'));const source=f.sources.get('public-transit-selected-stops');m={...m,modes:{bus:{...m.modes.bus,source:{...stopSource,sha256:'b'.repeat(64)}}}};f.inspector.update();assert.equal(source.data.features.length,0);await until(()=>f.panel.textContent.includes('Stop information could not be loaded'));assert.equal(source.data.features.length,0);
});
test('central click hook preserves true report points and adds no second click listener',async()=>{
 const main=await readFile(new URL('../src/safety/main.ts',import.meta.url),'utf8');const incident=main.indexOf('const transitIncidentLayers=');const stop=main.indexOf('publicTransitOverlay?.inspectStopAt(e.point)');const ordinary=main.indexOf('const transitPriorityLayers=');assert(incident>=0&&incident<stop&&stop<ordinary);assert.match(main,/if\(!transitIncidentHit&&publicTransitOverlay\?\.inspectStopAt\(e\.point\)\)/);assert.equal((main.match(/map\.on\("click"/g)||[]).length,1);
});
for(const [locale,sourceLabel]of [['zh','来源与路线资料'],['en','Sources and route details'],['de','Quellen und Linienangaben']]){
 test(locale+': route identity, endpoints and selected stop/list precede collapsed source metadata',async t=>{
  const r=roster(),data=stopFixture(r),m={...manifest,modes:{bus:{...manifest.modes.bus,source:stopSource,stop_lists_index:data.index}}};const f=fixture(t,locale,[full],{fetchBytes:data.fetchBytes,manifest:()=>m});assert(f.inspector.inspect({x:0,y:0}));await until(()=>f.sources.has('public-transit-selected-stops'));
  const body=f.panel.children[1],identity=body.children.find(e=>e.className==='transit-route-fields transit-route-identity'),stops=body.children.find(e=>e.className==='transit-route-stops'),sources=body.children.find(e=>e.className==='transit-route-source-details');
  assert(identity&&stops&&sources);assert.equal(identity.children.length,4);assert(body.children.indexOf(identity)<body.children.indexOf(stops));assert(body.children.indexOf(stops)<body.children.indexOf(sources));assert.equal(sources.open,false);assert(sources.children[0].textContent.startsWith(sourceLabel));assert(sources.children[0].textContent.includes('2026-10-03'));assert(sources.textContent.includes(full.properties.operator));assert(sources.textContent.includes(full.properties.source_snapshot));
  const sourceFields=descendants(sources).filter(e=>e.tag==='dt').map(e=>e.textContent);assert(!sourceFields.includes({zh:'起点',en:'From',de:'Von'}[locale]));assert(!sourceFields.includes({zh:'终点',en:'To',de:'Nach'}[locale]));
  const endpoints=descendants(stops).find(e=>e.className==='transit-route-fields transit-route-endpoints');assert.equal(endpoints.children.length,4);assert(endpoints.textContent.includes('Stop 1'));assert(endpoints.textContent.includes('Stop 42'));assert(!stops.textContent.includes('PTv2'));assert(!stops.textContent.includes('stop_area'));
  const list=descendants(stops).find(e=>e.className==='transit-route-stop-list');assert.equal(list.open,false);assert(list.children[0].textContent.includes('Stop 1 / Stop 2'));assert(descendants(stops).indexOf(list)<descendants(stops).findIndex(e=>e.className==='transit-route-coverage'));
  sources.open=true;sources.ontoggle();f.setHits([{properties:{route_id:r.route_id,variant_id:'forward',stop_id:'stop/7',sequence:7}}]);assert(f.inspector.inspectStop({x:0,y:0}));const detail=descendants(f.panel).find(e=>e.className==='transit-route-stop-detail');assert(detail.children[0].textContent.endsWith('Stop 7'));assert.equal(descendants(f.panel).find(e=>e.className==='transit-route-source-details').open,true);
 });
}
test('partial source-specific reasons stay plain while original metadata stays untouched',async t=>{
 const r=roster();r.variants[0].complete=false;r.variants[0].start_stop_id=null;r.variants[0].end_stop_id=null;r.variants[0].unmatched_platform_members=[{ref:123,type:'n'}];r.variants[0].coverage_note={zh:'stop_area PTv2 技术说明',en:'stop_area PTv2 technical method',de:'stop_area PTv2 technische Methode'};const snapshot=structuredClone(r),data=stopFixture(r),m={...manifest,modes:{bus:{...manifest.modes.bus,source:stopSource,stop_lists_index:data.index}}};const f=fixture(t,'en',[full],{fetchBytes:data.fetchBytes,manifest:()=>m});assert(f.inspector.inspect({x:0,y:0}));await until(()=>f.sources.has('public-transit-selected-stops'));assert(f.panel.textContent.includes('Only part'));assert(f.panel.textContent.includes('Some platforms could not be matched confidently'));assert(f.panel.textContent.includes('Start stop not confirmed'));assert(f.panel.textContent.includes('End stop not confirmed'));const mainStops=descendants(f.panel).find(e=>e.className==='transit-route-stops');assert(!mainStops.textContent.includes('stop_area'));assert(!mainStops.textContent.includes('PTv2'));assert.deepEqual(r,snapshot);
});
const overlayBuilt=await build({entryPoints:[new URL('../src/safety/public-transit-overlay.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {installPublicTransitOverlay,routeGeometryIntersectsBounds}=await import('data:text/javascript;base64,'+Buffer.from(overlayBuilt.outputFiles[0].text).toString('base64'));
function overlayFixture(t,{timeout=10000}={}){
 const cleanup=[];const standalone=fixture({after:fn=>cleanup.push(fn)},'en');standalone.inspector.destroy();
 document.createTextNode=text=>{const node=new Element('#text');node.textContent=text;return node;};
 Element.prototype.removeEventListener=function(key){this.events.delete(key);};
 const data=stopFixture(roster());const blobs=data.blobs;const encode=(path,value)=>{const b=new TextEncoder().encode(JSON.stringify(value));blobs.set(path,b);return{path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
 const a={type:'Feature',geometry:{type:'LineString',coordinates:[[13.3,52.5],[13.39,52.59]]},properties:full.properties};
 const b={type:'Feature',geometry:{type:'LineString',coordinates:[[13.39,52.59],[13.4,52.6]]},properties:full.properties};
 const tile=(name,feature,bbox)=>({id:name,bbox,...encode('/safety/transit/'+name+'.json',{type:'FeatureCollection',city:'fixture',mode:'bus',geometry_source:'verified_osm_route_relations',features:[feature]})});
 const m={schema_version:1,city:'fixture',modes:{bus:{status:'available',source:{...stopSource,license_url:'https://example.org/license'},reference_date:'2026-10-03',routeCoverage:'Synthetic checked source coverage',geometry_status:'verified_osm_route_relations',stop_lists_index:data.index,tiles:[tile('west',a,[13.2,52.4,13.39,52.7]),tile('east',b,[13.39,52.4,13.5,52.7])]}}};encode('/safety/transit/index.json',m);
 const sources=new Map(),layers=new Map(),events=new Map();let box=[13.25,52.4,13.35,52.7],pending=false,release,reject,delaySignal;
 const map={getSource:id=>sources.get(id),addSource(id,x){sources.set(id,{...x,setData(data){this.data=data;}})},removeSource:id=>sources.delete(id),getLayer:id=>layers.get(id),addLayer:x=>layers.set(x.id,x),removeLayer:id=>layers.delete(id),setFilter(){},on:(k,f)=>events.set(k,f),off:k=>events.delete(k),queryRenderedFeatures:()=>[{properties:full.properties}],getBounds:()=>({getWest:()=>box[0],getSouth:()=>box[1],getEast:()=>box[2],getNorth:()=>box[3]}),resize(){events.get('resize')?.();events.get('moveend')?.();}};
 const overlay=installPublicTransitOverlay({map,host:new Element('host'),city:'fixture',locale:'en',getBounds:()=>box,refreshTimeoutMs:timeout,fetchBytes:async(path,signal,limit)=>{assert(limit<=8*1024*1024);if(pending&&path==='/safety/transit/east.json'){delaySignal=signal;return new Promise((resolve,no)=>{release=()=>resolve(blobs.get(path));reject=()=>no(Error('Synthetic failure'));});}return blobs.get(path);}});
 t.after(()=>{overlay.destroy();for(const fn of cleanup)fn();});const panel=document.body.children[0];return{overlay,map,sources,panel,manifest:m,blobs,setBounds(value){box=value;},hold(){pending=true;},release(){release();},fail(){reject();},get waiting(){return!!release;},get delaySignal(){return delaySignal;},async ready(){await overlay.load();overlay.setSelected(new Set(['bus']));await until(()=>sources.get('public-transit-bus')?.data.features.length);assert(overlay.inspectAt({x:0,y:0}));await until(()=>sources.has('public-transit-selected-stops'));}};
}
test('same-camera MapLibre-style resize preserves selected popup and expanded station DOM',async t=>{
 const f=overlayFixture(t);await f.ready();const list=descendants(f.panel).find(e=>e.className==='transit-route-stop-list');list.open=true;list.ontoggle();const body=f.panel.children[1];f.map.resize();assert.equal(f.panel.hidden,false);assert.equal(f.panel.children[1],body);await until(()=>f.sources.get('public-transit-bus').data.features.length>0);await new Promise(r=>setTimeout(r,5));assert.equal(f.panel.hidden,false);assert.equal(descendants(f.panel).find(e=>e.className==='transit-route-stop-list'),list);assert.equal(list.open,true);
});
test('temporary replacement tile loading keeps only verified same-source selection until settlement',async t=>{
 const f=overlayFixture(t);await f.ready();f.hold();f.setBounds([13.395,52.4,13.45,52.7]);f.overlay.refresh();await until(()=>f.waiting);assert.equal(f.panel.hidden,false);assert.equal(f.sources.get('public-transit-bus').data.features.length,1);f.release();await until(()=>f.sources.get('public-transit-bus').data.features[0]?.geometry.coordinates[0][0]===13.39);assert.equal(f.panel.hidden,false);
});
test('settled viewport without any source route segment clears popup and stations',async t=>{
 const f=overlayFixture(t);await f.ready();f.setBounds([14,52.4,14.1,52.7]);f.overlay.refresh();await until(()=>f.panel.hidden);assert.equal(f.sources.get('public-transit-selected-stops').data.features.length,0);
});
test('mode-off during pending replacement clears immediately and late tile cannot restore popup',async t=>{
 const f=overlayFixture(t);await f.ready();f.hold();f.setBounds([13.395,52.4,13.45,52.7]);f.overlay.refresh();await until(()=>f.waiting);f.overlay.setSelected(new Set());assert(f.panel.hidden);assert(f.delaySignal.aborted);f.release();await new Promise(r=>setTimeout(r,10));assert(f.panel.hidden);assert.equal(f.sources.get('public-transit-selected-stops').data.features.length,0);
});
test('new manifest/source context does not retain prior selection while loading',async t=>{
 const f=overlayFixture(t);await f.ready();const m=structuredClone(f.manifest);m.modes.bus.source.sha256='c'.repeat(64);f.blobs.set('/safety/transit/index.json',new TextEncoder().encode(JSON.stringify(m)));await f.overlay.load();assert(f.panel.hidden);assert.equal(f.sources.get('public-transit-selected-stops').data.features.length,0);
});
test('failed replacement drops old selection rather than preserving it indefinitely',async t=>{
 const f=overlayFixture(t);await f.ready();f.hold();f.setBounds([13.395,52.4,13.45,52.7]);f.overlay.refresh();await until(()=>f.waiting);f.fail();await until(()=>f.panel.hidden);assert.equal(f.sources.get('public-transit-selected-stops').data.features.length,0);
});
test('bounded pending deadline aborts and prevents late-data popup resurrection',async t=>{
 const f=overlayFixture(t,{timeout:30});await f.ready();f.hold();f.setBounds([13.395,52.4,13.45,52.7]);f.overlay.refresh();await until(()=>f.waiting);await until(()=>f.panel.hidden);assert(f.delaySignal.aborted);f.release();await new Promise(r=>setTimeout(r,10));assert(f.panel.hidden);
});
test('viewport source-segment predicate rejects enclosing-bbox-only false positives without changing coordinates',()=>{
 const geometry={type:'LineString',coordinates:[[0,0],[0,10],[10,10]]},f={type:'Feature',properties:{},geometry};const before=structuredClone(f);assert.equal(routeGeometryIntersectsBounds([f],[4,4,6,6]),false);assert.equal(routeGeometryIntersectsBounds([f],[-1,4,1,6]),true);assert.deepEqual(f,before);
});
for(const locale of ['zh','en','de']){
 test(locale+': selected source limitation is safely disclosed without mixing variants, dates or languages',async t=>{
  const r=roster(full.properties.route_id,2);r.variants[0].coverage_note={zh:'官方名称于2026-10-09核验；原坐标快照2026-09-27。',en:'Official names checked 2026-10-09; original coordinates snapshot 2026-09-27.',de:'Amtliche Namen am2026-10-09 geprüft; ursprünglicher Koordinatenstand2026-09-27.'};r.variants[0].coverage_note[locale]+=' <img src=x onerror=alert(1)>';
  r.variants.push({...structuredClone(r.variants[0]),variant_id:'other',direction:'Other source direction',coverage_note:{zh:'另一个方向的独立来源说明',en:'Separate note for another source direction',de:'Separate Angabe einer anderen Quellenrichtung'}});const data=stopFixture(r),m={...manifest,modes:{bus:{...manifest.modes.bus,source:stopSource,stop_lists_index:data.index}}};const f=fixture(t,locale,[full],{fetchBytes:data.fetchBytes,manifest:()=>m});assert(f.inspector.inspect({x:0,y:0}));await until(()=>f.sources.has('public-transit-selected-stops'));
  let sources=descendants(f.panel).find(e=>e.className==='transit-route-source-details');assert.equal(sources.open,false);let note=descendants(sources).find(e=>e.className==='transit-route-specific-coverage');assert.equal(note.textContent,r.variants[0].coverage_note[locale]);assert.equal(note.children.length,0);assert(!descendants(sources).some(e=>e.tag==='img'));assert(sources.textContent.includes(r.variants[0].reference_date));assert(!sources.textContent.includes(r.variants[1].coverage_note[locale]));
  const other=descendants(f.panel).find(e=>e.tag==='button'&&e.textContent==='Other source direction');other.onclick();sources=descendants(f.panel).find(e=>e.className==='transit-route-source-details');note=descendants(sources).find(e=>e.className==='transit-route-specific-coverage');assert.equal(note.textContent,r.variants[1].coverage_note[locale]);assert(!sources.textContent.includes(r.variants[0].coverage_note[locale]));
 });
}
test('default ten-second retention deadline is not extended by repeated resize refreshes',async t=>{
 const f=overlayFixture(t);await f.ready();t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});f.hold();f.setBounds([13.395,52.4,13.45,52.7]);f.overlay.refresh();assert(f.waiting);t.mock.timers.tick(9000);assert.equal(f.panel.hidden,false);f.map.resize();assert.equal(f.panel.hidden,false);t.mock.timers.tick(999);assert.equal(f.panel.hidden,false);t.mock.timers.tick(1);assert.equal(f.panel.hidden,true);assert(f.delaySignal.aborted);t.mock.timers.reset();
});
