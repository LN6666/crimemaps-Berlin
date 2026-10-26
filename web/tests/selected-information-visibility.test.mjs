import test from 'node:test';
import assert from 'node:assert/strict';
import {build,transform} from 'esbuild';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
const b=await build({entryPoints:[new URL('../src/safety/selected-information-visibility.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {revealSelectedInformation}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
function fixture(t,width,height,y,parentBounds){
 const keys=['window','document','innerHeight','getComputedStyle'],prior=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const calls=[];const parent=parentBounds?{parentElement:null,style:{overflowY:'auto'},getBoundingClientRect:()=>parentBounds}:null;
 const target={isConnected:true,hidden:false,childNodes:[{}],parentElement:parent,style:{},getBoundingClientRect:()=>({top:y,bottom:y+200,height:200}),hasAttribute:()=>false,focus:opts=>calls.push(['focus',opts]),scrollIntoView:opts=>{calls.push(['scroll',opts]);y=20;}};
 Object.assign(globalThis,{window:{visualViewport:{width,height,offsetTop:0}},document:{documentElement:{lang:'en'},querySelector:()=>null},innerHeight:height,getComputedStyle:e=>e.style});
 t.after(()=>{for(const[k,v]of prior){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}});return{target,calls};
}
for(const [width,height,y,bounds]of [[375,740,1100,null],[985,1003,1450,null],[1280,1000,1400,{top:160,bottom:930}]])test(width+'px: explicit selection reveals actual existing contents including independently scrolled sidebar',t=>{
 const {target,calls}=fixture(t,width,height,y,bounds);const child=target.childNodes[0];assert(revealSelectedInformation(target));assert.equal(calls[0][0],'scroll');assert.deepEqual(calls[0][1],{block:'start',inline:'nearest',behavior:'instant'});assert.equal(target.childNodes[0],child);assert.deepEqual(calls.at(-1),['focus',{preventScroll:true}]);
});
test('already visible selection is focused without changing scroll',t=>{const{target,calls}=fixture(t,1280,1000,250,{top:160,bottom:930});assert(revealSelectedInformation(target));assert.deepEqual(calls,[['focus',{preventScroll:true}]]);});
test('empty disconnected or hidden content cannot jump the viewport',t=>{const{target,calls}=fixture(t,985,1003,1400,null);target.childNodes=[];assert.equal(revealSelectedInformation(target),false);target.childNodes=[{}];target.isConnected=false;assert.equal(revealSelectedInformation(target),false);target.isConnected=true;target.hidden=true;assert.equal(revealSelectedInformation(target),false);assert.equal(calls.length,0);});
test('reveal hook belongs to deliberate click/OSM selection, never showSelection refresh or camera mutation',async()=>{
 const main=await readFile(new URL('../src/safety/main.ts',import.meta.url),'utf8');const show=main.slice(main.indexOf('function showSelection()'),main.indexOf('function refresh()'));assert(!show.includes('revealSelectedInformation'));assert(main.includes('showSelection();\n          selectionInspector.open();'));assert(main.includes('replaceChildren(panel);selectionInspector.open();'));
 const geo=await readFile(new URL('../src/safety/geography-base.ts',import.meta.url),'utf8');assert(geo.includes('if(selected)revealSelectedInformation(bar,{focus:false})'));const helper=b.outputFiles[0].text;assert(!/fitBounds|flyTo|replaceChildren|cloneNode/.test(helper));
});


// A bounded DOM fixture models activeElement and keyboard bubbling. The production
// reveal helper and actual geography callbacks run unchanged; this is not a real
// browser/MapLibre rendering test and does not claim to verify native drag input.
class FocusElement {
 constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag.toUpperCase();this.children=[];this.style={};this.attributes={};this.hidden=false;this.disabled=false;this.parentElement=null;this.top=200;this.scrollCalls=[];this.listeners=new Map();}
 get childNodes(){return this.children;}get isConnected(){return this.tagName==='BODY'||Boolean(this.parentElement?.isConnected);}
 append(...nodes){for(const node of nodes){if(node.parentElement){const old=node.parentElement.children;old.splice(old.indexOf(node),1);}node.parentElement=this;this.children.push(node);}}
 replaceChildren(...nodes){for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=String(v);}hasAttribute(k){return k in this.attributes;}
 set tabIndex(v){this.setAttribute('tabindex',v);}get tabIndex(){return Number(this.attributes.tabindex??-1);}
 getBoundingClientRect(){return {top:this.top,bottom:this.top+100,height:100};}
 focus(options){if(this.isConnected&&!this.hidden&&!this.disabled){this.ownerDocument.activeElement=this;this.focusOptions=options;}}
 scrollIntoView(options){this.scrollCalls.push(options);this.top=20;}
 addEventListener(type,listener){this.listeners.set(type,[...(this.listeners.get(type)??[]),listener]);}
 dispatchEvent(event){for(const listener of this.listeners.get(event.type)??[])listener(event);this['on'+event.type]?.(event);if(event.bubbles)this.parentElement?.dispatchEvent(event);}
 click(){if(!this.disabled)this.dispatchEvent({type:'click',bubbles:true,target:this});}
}
function focusDOM(t){
 const keys=['window','document','innerHeight','getComputedStyle'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const doc={activeElement:null,querySelector:()=>null,createElement(tag){return new FocusElement(doc,tag);}};
 const body=doc.createElement('body');doc.body=body;doc.activeElement=body;
 const host=doc.createElement('section'),canvasContainer=doc.createElement('div'),canvas=doc.createElement('canvas'),bar=doc.createElement('div'),name=doc.createElement('span'),details=doc.createElement('button'),panel=doc.createElement('section'),handle=doc.createElement('header'),title=doc.createElement('strong'),close=doc.createElement('button'),content=doc.createElement('div');
 canvas.tabIndex=0;handle.tabIndex=0;panel.hidden=true;
 body.append(host,panel);host.append(canvasContainer,bar);canvasContainer.append(canvas);bar.append(name,details);panel.append(handle,content);handle.append(title,close);
 let rightKeys=0;canvasContainer.addEventListener('keydown',e=>{if(e.key==='ArrowRight')rightKeys++;});
 const sendKey=key=>doc.activeElement.dispatchEvent({type:'keydown',key,bubbles:true,preventDefault(){}});
 Object.assign(globalThis,{window:{visualViewport:{width:1280,height:1000,offsetTop:0}},document:doc,innerHeight:1000,getComputedStyle:e=>e.style});
 t.after(()=>{for(const[k,d]of old){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}});
 return {doc,body:content,canvas,canvasContainer,bar,name,details,panel,handle,title,close,sendKey,get rightKeys(){return rightKeys;}};
}
const geographyText=await readFile(new URL('../src/safety/geography-base.ts',import.meta.url),'utf8');
const geographyAST=ts.createSourceFile('geography-base.ts',geographyText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const install=geographyAST.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='installGeographyBase');
assert(install?.body);
const statements=install.body.statements;
const actualFunction=name=>{const n=statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert(n,`Missing actual ${name}`);return n.getText(geographyAST);};
const actualAssignment=(object,property)=>{const n=statements.find(n=>ts.isExpressionStatement(n)&&ts.isBinaryExpression(n.expression)&&ts.isPropertyAccessExpression(n.expression.left)&&n.expression.left.expression.getText(geographyAST)===object&&n.expression.left.name.text===property);assert(n,`Missing actual ${object}.${property}`);return n.getText(geographyAST);};
const actualFlow=(await transform([
 actualFunction('locateAt'),actualFunction('chooseAt'),actualFunction('showDetails'),
 actualAssignment('details','onclick'),actualAssignment('close','onclick'),actualAssignment('panel','onkeydown'),
].join('\n'),{loader:'ts',format:'cjs'})).code;
// Only unrelated source/statistics providers are replaced. All focus decisions,
// selected-area updates, zoom decisions and explicit dialog handlers are actual code.
const createGeographyFlow=new Function('fixture','revealSelectedInformation',`
 const {doc:document,bar,name,details,panel,handle,title,close,body}=fixture;
 const feature={properties:{id:'area-1',name:'Selected area'},geometry:{coordinates:[[[13,52],[14,52],[14,53],[13,52]]]}};
 let selected,lastPoint,zoom=18,suspended=false,metricState='absent',metricAttemptKey='',metricSelection=0,limitRefreshKey='';
 const level={id:'level-1',label:'Area',overview_zoom:13},levels=[level],ref={available:true,metadata:{},boundaries:{features:[feature]}};
 const cameraMoves=[],map={getZoom:()=>zoom,fitBounds:(bounds,options)=>cameraMoves.push({bounds,options})};
 const areaLookup={find:point=>point[0]<0?undefined:feature};
 const cancelSemantic=()=>{},references={cancel(){},append(){}},context={append(){},destroy(){}},metricRequest=new AbortController();
 const city='berlin',locale='en',c={date:'Date',items:[],metrics:'Area statistics',gap:'Unavailable',warning:'Source limits',outside:'Outside',missing:'Missing'};
 const coveragePath=undefined,coverage=undefined,coverageLoading=undefined,officialScopeMetricsPath=undefined,officialMunicipalMetricsPath=undefined,officialRegionalMetricsPath=undefined;
 const metrics={},activeComparisons={},activeLayerCategories=new Set(),semanticProjection={},semanticRefresh={loading:false},remainingLimits={needs:()=>false},metricCategories=[];
 const filterMunichScopeDisplay=(_city,_level,rows)=>rows,containsPosition=()=>true,clampPanel=()=>{};
 const put=(tag,value)=>{const el=document.createElement(tag);el.textContent=String(value);body.append(el);return el;};
 ${actualFlow}
 return {chooseAt,showDetails,cameraMoves,setZoom(value){zoom=value;},setSuspended(value){suspended=value;}};
`);
test('near and overview map clicks update area but retain canvas keyboard focus',t=>{
 const f=focusDOM(t),g=createGeographyFlow(f,revealSelectedInformation);
 for(const zoom of [18,12]){
  g.setZoom(zoom);f.canvas.focus();g.chooseAt([13.5,52.5]);
  assert.equal(f.name.textContent,'Area · Selected area');assert.equal(f.details.disabled,false);
  assert.equal(f.doc.activeElement,f.canvas);assert.equal(f.bar.hasAttribute('tabindex'),false);
  f.sendKey('ArrowRight');
 }
 assert.equal(f.rightKeys,2);assert.equal(g.cameraMoves.length,1,'overview still frames selected boundary');
});
test('offscreen pointer selection reveals existing information without moving focus',t=>{
 const f=focusDOM(t),g=createGeographyFlow(f,revealSelectedInformation);f.bar.top=1500;f.canvas.focus();
 g.chooseAt([13.5,52.5]);assert.equal(f.bar.scrollCalls.length,1);assert.equal(f.doc.activeElement,f.canvas);
 f.sendKey('ArrowRight');assert.equal(f.rightKeys,1);
});
test('explicit Details activation focuses dialog, Escape returns to keyboard-accessible Details',t=>{
 const f=focusDOM(t),g=createGeographyFlow(f,revealSelectedInformation);g.chooseAt([13.5,52.5]);
 f.details.focus();f.details.click();assert.equal(f.panel.hidden,false);assert.equal(f.doc.activeElement,f.handle);
 f.sendKey('Escape');assert.equal(f.panel.hidden,true);assert.equal(f.doc.activeElement,f.details);
 f.details.click();assert.equal(f.doc.activeElement,f.handle);assert.equal(f.title.textContent,'Selected area');
});
test('direct keyboard/programmatic reveal still opts into focus by default',t=>{
 const f=focusDOM(t);f.canvas.focus();assert(revealSelectedInformation(f.bar));
 assert.equal(f.doc.activeElement,f.bar);assert.equal(f.bar.tabIndex,-1);assert.deepEqual(f.bar.focusOptions,{preventScroll:true});
});
test('outside and suspended area clicks cannot move keyboard focus or zoom',t=>{
 const f=focusDOM(t),g=createGeographyFlow(f,revealSelectedInformation);f.canvas.focus();g.chooseAt([-1,0]);
 assert.equal(f.details.disabled,true);assert.equal(f.doc.activeElement,f.canvas);
 g.setZoom(12);g.setSuspended(true);g.chooseAt([13.5,52.5]);assert.equal(f.doc.activeElement,f.canvas);assert.equal(g.cameraMoves.length,0);
});
