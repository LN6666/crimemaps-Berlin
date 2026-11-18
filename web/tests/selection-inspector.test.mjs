import test from 'node:test';
import assert from 'node:assert/strict';
import {build,transform} from 'esbuild';
import {readFile} from 'node:fs/promises';
const b=await build({entryPoints:[new URL('../src/safety/selection-inspector.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false,loader:{'.css':'empty'}});
const {installSelectionInspector}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.style={};this._hidden=false;this.attributes={};}
 get childNodes(){return this.children;}get isConnected(){let root=this;while(root.parentElement)root=root.parentElement;return root.tag==='body';}
 contains(node){return this===node||this.children.some(child=>child.contains(node));}
 get hidden(){return this._hidden;}set hidden(value){this._hidden=value;if(value&&this.contains(globalThis.document?.activeElement))document.activeElement=document.body;}
 get tabIndex(){return this._tabIndex??(['button','input','select','textarea'].includes(this.tag)?0:-1);}set tabIndex(value){this._tabIndex=value;}
 append(...items){for(const x of items){x.remove();this.children.push(x);x.parentElement=this;}}
 insertBefore(x,b){x.remove();const i=this.children.indexOf(b);assert(i>=0);this.children.splice(i,0,x);x.parentElement=this;}
 remove(){if(this.parentElement){if(this.contains(globalThis.document?.activeElement))document.activeElement=document.body;const a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null;}}
 replaceChildren(...x){for(const q of [...this.children])q.remove();this.append(...x);}
 setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k]??null;}
 matches(selector){assert.equal(selector,':disabled');return !!this.disabled;}
 closest(selector){for(let node=this;node;node=node.parentElement){if(selector==='button'?node.tag==='button':node.hidden||node.attributes.inert!==undefined||node.attributes['aria-hidden']==='true')return node;}return null;}
 focus(o){let cssHidden=false;for(let node=this;node;node=node.parentElement)cssHidden ||= node.style.display==='none'||node.style.visibility==='hidden';if(this.isConnected&&this.tabIndex>=0&&!this.disabled&&!cssHidden&&!this.closest('[hidden], [inert], [aria-hidden="true"]')){this.focusOptions=o;document.activeElement=this;}}
 click(){this.onclick?.();}setPointerCapture(){}
 get offsetWidth(){return parseFloat(this.style.width)||280;}get offsetHeight(){return Math.min(220,parseFloat(this.style.maxHeight)||220);}
 getBoundingClientRect(){const l=parseFloat(this.style.left)||0,t=parseFloat(this.style.top)||0;return{left:l,top:t,right:l+this.offsetWidth,bottom:t+this.offsetHeight,width:this.offsetWidth,height:this.offsetHeight};}
}
function fixture(t,width,height){const keys=['window','document','innerWidth','innerHeight','HTMLElement'];const old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));const events=new Map(),ve=new Map();const viewport={offsetLeft:0,offsetTop:0,width,height,addEventListener:(k,f)=>ve.set(k,f),removeEventListener:k=>ve.delete(k)};const body=new Element('body'),home=new Element('aside'),target=new Element('div'),button=new Element('button'),host=new Element('map'),canvas=new Element('canvas');canvas.tabIndex=0;host.append(canvas);host.getBoundingClientRect=()=>({left:0,top:150,right:width,bottom:height});body.append(home,host);home.append(target);target.append(button);target.id='selection';let clicks=0,fallbackCalls=0;button.onclick=()=>clicks++;
Object.assign(globalThis,{HTMLElement:Element,window:{visualViewport:viewport,addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k)},document:{documentElement:new Element('html'),body,activeElement:body,createElement:tag=>new Element(tag)},innerWidth:width,innerHeight:height});const inspector=installSelectionInspector(target,host,'en',()=>{fallbackCalls++;return canvas;});t.after(()=>{inspector.destroy();for(const[k,d]of old){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}});return{body,home,target,button,host,canvas,inspector,viewport,ve,events,get clicks(){return clicks;},get fallbackCalls(){return fallbackCalls;}};}
for(const[width,height]of[[375,740],[985,1003],[1280,1000]])test(width+'px: successful selection exposes the original live information node in a compact viewport-bound card',t=>{const f=fixture(t,width,height);assert.equal(f.inspector.visible,false);assert(f.inspector.open());assert(f.inspector.visible);const panel=f.body.children.find(x=>x.className==='geography-panel selection-inspector');assert.equal(panel.children[1].children[0],f.target);assert.equal(f.target.children[0],f.button);f.button.click();assert.equal(f.clicks,1);assert.equal(f.home.children.includes(f.target),false);const r=panel.getBoundingClientRect();assert(r.left>=12&&r.right<=width-12&&r.top>=162&&r.bottom<=height-12);panel.children[0].children[1].click();assert.equal(f.inspector.visible,false);assert.equal(f.target.parentElement,f.home);f.button.click();assert.equal(f.clicks,2);});
test('selected content keeps listeners through refresh, close and reopening without cloning or duplicate IDs',t=>{const f=fixture(t,985,1003);f.inspector.open();const next=new Element('button');let n=0;next.onclick=()=>n++;f.target.replaceChildren(next);assert(f.inspector.visible);next.click();assert.equal(n,1);f.inspector.close();assert.equal(f.target.parentElement,f.home);assert(f.inspector.open());next.click();assert.equal(n,2);const visit=e=>[e,...e.children.flatMap(visit)];assert.equal(visit(f.body).filter(x=>x.id==='selection').length,1);});
test('close/month-source reset restores unique information DOM; ordinary content changes cannot open an inactive inspector',t=>{const f=fixture(t,375,740);f.inspector.open();f.inspector.close();f.target.replaceChildren(new Element('p'));assert.equal(f.inspector.visible,false);f.target.replaceChildren();assert.equal(f.inspector.open(),false);assert.equal(f.target.parentElement,f.home);f.inspector.destroy();assert.equal(f.events.size,0);assert.equal(f.ve.size,0);});
test('drag and visual viewport resize clamp the same selected DOM rather than clearing it',t=>{const f=fixture(t,985,1003);f.inspector.open();const panel=f.body.children.find(x=>x.className==='geography-panel selection-inspector'),handle=panel.children[0];handle.onpointerdown({target:handle,clientX:500,clientY:300,pointerId:1});handle.onpointermove({clientX:5000,clientY:5000});let r=panel.getBoundingClientRect();assert(r.right<=973&&r.bottom<=991);f.viewport.width=320;f.viewport.height=740;f.ve.get('resize')();r=panel.getBoundingClientRect();assert(r.left>=12&&r.right<=308&&r.bottom<=728);assert(f.inspector.visible);assert.equal(panel.children[1].children[0],f.target);});
test('real main caller opens only deliberate POI/scene/hex/OSM selections; month and teardown close and preserve transit priority',async()=>{const main=await readFile(new URL('../src/safety/main.ts',import.meta.url),'utf8');assert(main.includes('showSelection();\n          selectionInspector.open();'));assert(main.includes('replaceChildren(panel);selectionInspector.open();'));const monthMarker='async function loadMonth() {';
 const monthStart=main.indexOf(monthMarker), nextRequest=main.indexOf('abortPendingReportBodyLoads();',monthStart);
 assert(monthStart>=0&&nextRequest>monthStart,'inspect the real month-reset path before it starts or cancels requests');
 const closeEvents=[];
 const reset=new Function('normalizeAvailablePeriod','selectionInspector','osmClickInspection','basicOsmPanel',main.slice(monthStart+monthMarker.length,nextRequest)+';return basicOsmPanel');
 assert.equal(reset(()=>undefined,{close:()=>closeEvents.push('inspector')},{clear:()=>closeEvents.push('osm')},{previous:true}),undefined);
 assert.deepEqual(closeEvents,['inspector','osm']);assert(main.includes('selectionInspector.destroy();'));const start=main.indexOf('map.on("click"');assert(main.indexOf('transitIncidentLayers=',start)<main.indexOf('inspectStopAt',start));assert(main.indexOf('inspectStopAt',start)<main.indexOf('transitPriorityLayers=',start));assert(!b.outputFiles[0].text.includes('cloneNode'));});

test('the real search click exposes pending selection immediately and keeps the loaded information visible',async t=>{
 // The search result buttons moved to place-search.ts (installPlaceSearch); main.ts now passes the
 // selection as onSelect (DECISIONS 2026-11-02 "第三段第二轮结项", R2 fixtures CDR[8](4)). Run the
 // actual place-search click (current-query guard, onSelect, clearing the results) over the actual
 // main.ts onSelect handler and the actual inspector.
 const main=await readFile(new URL('../src/safety/main.ts',import.meta.url),'utf8');
 const start=main.indexOf('onSelect:f=>{',main.indexOf('placeSearch=installPlaceSearch<SearchPlace>('));
 const end=main.indexOf('\n      },',start);
 assert(start>=0&&end>start,'extract the actual search selection handler');
 const flow=(await transform('const onSelect='+main.slice(start+'onSelect:'.length,end+'\n      }'.length)+';',{loader:'ts',format:'cjs'})).code;
 const searchBuild=await build({entryPoints:[new URL('../src/safety/place-search.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
 const {installPlaceSearch}=await import('data:text/javascript;base64,'+Buffer.from(searchBuild.outputFiles[0].text).toString('base64'));
 const dom=fixture(t,1280,1000),loading=new Element('p'),details=new Element('article');
 loading.textContent='Loading place';details.textContent='Selected cafe';dom.home.scrollTop=900;
 const controls=[{value:'fast_food',disabled:true,checked:false},{value:'bar',disabled:true,checked:true}];
 document.querySelectorAll=selector=>{assert.equal(selector,'#poi-filters input');return controls;};
 // Keep the production handlers and inspector; replace only map/data loading.
 const createFlow=new Function('dom','loading','details',`
  const selectionInspector=dom.inspector,manifest={poi_scope_groups:{}},poiToggle={checked:false};
  let selected=null,pendingSearchPoiId=null,loaded=false;
  const el=id=>{if(id!=='poi-toggle')throw Error('unexpected element '+id);return poiToggle;},moves=[];
  const mapGPUUnavailable=false,map={flyTo(options){moves.push(options);}};
  const refresh=()=>dom.target.replaceChildren(loaded?details:loading);
  ${flow}
  return {onSelect,moves,poiToggle,complete(){loaded=true;refresh();},get state(){return {selected,pendingSearchPoiId};}};
 `);
 const result={id:'osm/node/test',name:'Test Cafe',kind:'fast_food',scope_category:'fast_food',center:[13.4,52.4]};
 const search=createFlow(dom,loading,details),input=new Element('input'),results=new Element('div'),listeners=new Map();
 input.value='';input.addEventListener=(kind,listener)=>listeners.set(kind,listener);input.removeEventListener=kind=>listeners.delete(kind);results.ownerDocument={createElement:tag=>new Element(tag)};
 const placeSearch=installPlaceSearch(input,results,{loadIndex:async()=>[result],label:place=>place.name,onSelect:search.onSelect,noResults:'no results',failed:'failed',delayMs:0});
 t.after(()=>placeSearch.destroy());
 input.value='test cafe';listeners.get('input')();for(let i=0;i<3;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(results.children.length,1);const button=results.children[0];assert.equal(button.tag,'button');assert.equal(button.textContent,'Test Cafe');
 button.click();
 assert.equal(dom.inspector.visible,true,'search must reveal information even when the details rail is scrolled elsewhere');
 const panel=dom.body.children.find(x=>x.className==='geography-panel selection-inspector'),body=panel.children[1];
 assert.equal(dom.target.parentElement,body);assert.equal(dom.target.children[0],loading);assert.equal(body.scrollTop,0);
 assert.equal(dom.home.scrollTop,900,'use the same floating selection as map clicks, without jumping the sidebar');
 assert.deepEqual(panel.children[0].focusOptions,{preventScroll:true});
 assert.equal(search.poiToggle.checked,true);assert(controls.every(input=>!input.disabled&&input.checked));
 assert.deepEqual(search.state,{selected:{type:'poi',id:result.id},pendingSearchPoiId:result.id});assert.equal(results.children.length,0,'the selected search results are cleared once');
 assert.deepEqual(search.moves,[{center:result.center,zoom:16}]);
 search.complete();assert.equal(dom.inspector.visible,true);assert.equal(dom.target.parentElement,body);assert.equal(dom.target.children[0],details);
});

test('Escape restores the original invoker without letting repeated open overwrite it',t=>{
 const f=fixture(t,320,500),invoker=new Element('button');f.home.append(invoker);invoker.focus();
 assert.equal(document.activeElement,invoker);f.inspector.open();
 const panel=f.body.children.find(x=>x.className==='geography-panel selection-inspector'),handle=panel.children[0];
 assert.equal(document.activeElement,handle);f.inspector.open();
 let prevented=false;panel.onkeydown({key:'Escape',preventDefault(){prevented=true;}});
 assert(prevented);assert.equal(f.inspector.visible,false);assert(document.activeElement===invoker,'Escape must restore the connected invoker');
 assert.deepEqual(invoker.focusOptions,{preventScroll:true});assert.equal(f.fallbackCalls,0);
});

test('keyboard-focused close button falls back to the actual map canvas when search removes its invoker',t=>{
 const f=fixture(t,320,500),invoker=new Element('button');f.home.append(invoker);invoker.focus();f.inspector.open();invoker.remove();
 const panel=f.body.children.find(x=>x.className==='geography-panel selection-inspector'),close=panel.children[0].children[1];
 assert.equal(close.type,'button');assert.equal(close.getAttribute('aria-label'),'Close');close.focus();
 assert.equal(document.activeElement,close);close.click();
 assert(document.activeElement===f.canvas,'removed search invoker must fall back to the map canvas');assert.deepEqual(f.canvas.focusOptions,{preventScroll:true});assert.equal(f.fallbackCalls,1);
 assert.equal(f.target.parentElement,f.home);
});

test('programmatic reset does not steal focus and repeated cycles retain only installation listeners',t=>{
 const f=fixture(t,320,500),filter=new Element('button');f.home.append(filter);
 for(let i=0;i<20;i++){f.button.focus();assert(f.inspector.open());filter.focus();f.inspector.close();assert.equal(document.activeElement,filter);}
 assert.equal(f.fallbackCalls,0);assert.equal(f.events.size,1);assert.equal(f.ve.size,2);
 assert(f.inspector.open());const panel=f.body.children.find(x=>x.className==='geography-panel selection-inspector'),close=panel.children[0].children[1];
 f.inspector.destroy();assert.equal(f.events.size,0);assert.equal(f.ve.size,0);assert.equal(f.target.parentElement,f.home);assert.equal(f.inspector.open(),false);
 filter.focus();close.click();assert.equal(document.activeElement,filter);f.inspector.destroy();
});

test('long live content and its scroll offset survive a narrow offset visual viewport clamp',t=>{
 const f=fixture(t,375,740),last=new Element('p');last.textContent='Last paragraph';f.target.append(last);f.inspector.open();
 const panel=f.body.children.find(x=>x.className==='geography-panel selection-inspector'),body=panel.children[1];body.scrollTop=6000;
 Object.assign(f.viewport,{offsetLeft:30,offsetTop:20,width:320,height:300});f.ve.get('resize')();
 const r=panel.getBoundingClientRect();assert(r.left>=42&&r.right<=338&&r.top>=162&&r.bottom<=308);
 assert.equal(body.scrollTop,6000);assert.equal(last.parentElement,f.target);assert.equal(f.target.parentElement,body);
 f.inspector.close();f.inspector.open();assert.equal(body.scrollTop,0);assert.equal(f.target.children.at(-1),last);
});

for(const invalid of ['hidden','disabled','inert'])test('user close skips an invoker made '+invalid+' while the inspector is open',t=>{
 const f=fixture(t,320,500),invoker=new Element('button');f.home.append(invoker);invoker.focus();f.inspector.open();
 if(invalid==='inert')f.home.setAttribute('inert','');else invoker[invalid]=true;
 const panel=f.body.children.find(x=>x.className==='geography-panel selection-inspector');panel.children[0].children[1].click();
 assert(document.activeElement===f.canvas,'invalid invoker must not receive restored focus');assert.equal(f.fallbackCalls,1);
});

test('user close falls back when the browser refuses focus on a CSS-hidden invoker',t=>{
 const f=fixture(t,320,500),invoker=new Element('button');f.home.append(invoker);invoker.focus();f.inspector.open();f.home.style.display='none';
 const panel=f.body.children.find(x=>x.className==='geography-panel selection-inspector');panel.children[0].children[1].click();
 assert(document.activeElement===f.canvas,'a rejected invoker focus must retry the map canvas');assert.equal(f.fallbackCalls,1);
});
