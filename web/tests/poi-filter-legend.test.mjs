import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
const result=await build({stdin:{contents:`export {styledPois} from './model'; export {poiName,t} from './i18n'; export {createPoiFilterLegend} from './poi-filter-legend';`,resolveDir:new URL('../src/safety/',import.meta.url).pathname},bundle:true,platform:'node',format:'esm',write:false});
const {styledPois,poiName,t,createPoiFilterLegend}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const main=await readFile(new URL('../src/safety/main.ts',import.meta.url),'utf8');
const start=main.indexOf('const filters=manifest.poi_scope_groups');
const end=main.indexOf('    if(mapRetry)',start);
assert(start>=0&&end>start,'extract the real main filter rendering block');
const renderMain=new Function('document','manifest','data','t','poiName','el','refresh','loadViewport','createPoiFilterLegend',main.slice(start,end));
class Element {
 constructor(tag,text=''){this.tag=tag;this.children=[];this.style={};this.dataset={};this.attributes={};this.ownText=text;}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(key,value){this.attributes[key]=value;}
 get textContent(){return this.ownText+this.children.map(node=>node.textContent).join('');}
 set textContent(value){this.ownText=value;this.children=[];}
}
const walk=node=>[node,...node.children.flatMap(walk)];
const byClass=(node,name)=>walk(node).filter(child=>child.className===name);
function dom(testContext){const previous=Object.getOwnPropertyDescriptor(globalThis,'document');const document={createElement:tag=>new Element(tag),createTextNode:text=>new Element('#text',text)};globalThis.document=document;testContext.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;});return document;}
// Exact kind/group and palette entries from the delivered Berlin manifest.
// In particular, raw "context" has no catalog entry; source_linked_context is a filter scope.
const palette={airport:'#475569',attraction:'#be123c',bar:'#d97706',cafe:'#a16207',fast_food:'#db2777',hotel:'#0d9488',marketplace:'#4f46e5',nightclub:'#9333ea',park:'#15803d',parking:'#64748b',restaurant:'#ea580c',shop:'#0891b2',source_linked_context:'#475569',station:'#2563eb'};
const catalog=Object.fromEntries(Object.entries(palette).map(([key,color])=>[key,{label:key,color}]));
const groups=Object.fromEntries(Object.keys(catalog).map(kind=>[kind,{label_key:`poi.${kind==='source_linked_context'?'context':kind}`,kinds:kind==='source_linked_context'?['context','station']:[kind]}]));
const feature=(id,kind,scope)=>({type:'Feature',geometry:{type:'Point',coordinates:[13.3762,52.5186]},properties:{id,kind,...(scope?{scope_category:scope}:{})}});
const bundle=features=>({catalog:{poi_types:catalog},pois:{type:'FeatureCollection',features}});
function render(document,manifest={poi_scope_groups:groups},data=bundle([])){
 const host=new Element('div');let refreshes=0,loads=0;
 renderMain(document,manifest,data,t,poiName,id=>{assert.equal(id,'poi-filters');return host;},()=>refreshes++,async()=>loads++,createPoiFilterLegend);
 return {host,get refreshes(){return refreshes;},get loads(){return loads;}};
}
function modelColors(data,kind,scope=kind){const rows=styledPois({...data,pois:{type:'FeatureCollection',features:[feature('example',kind,scope)]}},[],new Set(),new Set([scope]),false).features;assert.equal(rows.length,1);return rows[0].properties;}
function assertSwatch(entry,colors){assert.equal(byClass(entry,'poi-filter-area')[0].style.background,colors.color);assert.equal(byClass(entry,'poi-filter-center')[0].style.background,colors.center_color);assert.equal(byClass(entry,'poi-filter-swatch')[0].attributes['aria-hidden'],'true');}

test('real main renders both context and station swatches for the actual mixed scope, matching real styledPois',ctx=>{
 const document=dom(ctx),{host}=render(document);
 const label=host.children.find(row=>row.children[0].value==='source_linked_context');
 const entries=byClass(label,'poi-filter-kind');
 // The old main block creates just one flat swatch from kinds[0].
 assert.equal(walk(label).filter(node=>node.tag==='i'||node.className==='poi-filter-swatch').length,2);
 assert.deepEqual(entries.map(entry=>entry.dataset.kind),['context','station']);
 for(const entry of entries)assertSwatch(entry,modelColors(bundle([]),entry.dataset.kind,'source_linked_context'));
 assert.equal(byClass(entries[0],'poi-filter-area')[0].style.background,'#64748b');
 assert.equal(byClass(entries[1],'poi-filter-area')[0].style.background,'#2563eb');
 assert.equal(entries[0].textContent,poiName('context','context'));
 assert.equal(entries[1].textContent,poiName('station','station'));
 assert.equal(label.textContent,entries.map(entry=>entry.textContent).join(''),'actual translated context heading appears once, while both kind labels remain');
 assert.equal(label.children[0].attributes['aria-label'],poiName('source_linked_context','source_linked_context'));
});

test('mixed scope keeps a distinct heading above all translated kind labels',ctx=>{
 dom(ctx);
 const legend=createPoiFilterLegend(catalog,['context','station'],'Mixed source-linked facilities',poiName);
 const entries=byClass(legend,'poi-filter-kind');
 assert.deepEqual(entries.map(entry=>entry.dataset.kind),['context','station']);
 assert.equal(legend.children[0].textContent,'Mixed source-linked facilities');
 assert.equal(legend.textContent,'Mixed source-linked facilities'+entries.map(entry=>entry.textContent).join(''));
 assert.equal(byClass(legend,'poi-filter-kinds').length,1);
});

test('every delivered scope kind has the same outer and deliberately dark center colors as the real rendering model',ctx=>{
 const document=dom(ctx),{host}=render(document);
 assert.equal(host.children.length,14);
 for(const label of host.children){const scope=label.children[0].value;const entries=byClass(label,'poi-filter-kind');assert.deepEqual(entries.map(entry=>entry.dataset.kind),groups[scope].kinds);for(const entry of entries)assertSwatch(entry,modelColors(bundle([]),entry.dataset.kind,scope));}
 assert.equal(modelColors(bundle([]),'context','source_linked_context').center_color,'#3c4653');
 assert.equal(modelColors(bundle([]),'station').center_color,'#163b8d');
});

test('the one-checkbox-per-scope filter, defaults, refresh and source identity remain unchanged',ctx=>{
 const document=dom(ctx),f=render(document),inputs=f.host.children.map(label=>label.children[0]);
 assert.deepEqual(inputs.filter(input=>input.checked).map(input=>input.value),['bar','nightclub','shop','station']);
 assert(inputs.every(input=>input.type==='checkbox'));
 const raw=bundle([feature('source-other','context','source_linked_context'),feature('source-stop','station','source_linked_context'),feature('ordinary-stop','station','station')]);
 const before=JSON.stringify(raw);
 const selected=()=>new Set(inputs.filter(input=>input.checked).map(input=>input.value));
 assert.deepEqual(styledPois(raw,[],new Set(),selected(),false).features.map(row=>row.properties.id),['ordinary-stop']);
 const context=inputs.find(input=>input.value==='source_linked_context');context.checked=true;context.onchange();
 const shown=styledPois(raw,[],new Set(),selected(),false).features;
 assert.deepEqual(shown.map(row=>row.properties.id),['source-other','source-stop','ordinary-stop']);
 assert.equal(shown[1].properties.color,shown[2].properties.color);
 assert.equal(f.refreshes,1);assert.equal(f.loads,1);assert.equal(JSON.stringify(raw),before);
});

test('legacy ungrouped catalog keeps each single-kind label and original actual-kind filter semantics',ctx=>{
 const document=dom(ctx),{host}=render(document,{});
 assert.equal(host.children.length,Object.keys(catalog).length);
 for(const label of host.children){const kind=label.children[0].value;const entries=byClass(label,'poi-filter-kind');assert.equal(entries.length,1);assert.equal(entries[0].textContent,poiName(kind,catalog[kind].label));assertSwatch(entries[0],modelColors(bundle([]),kind));}
 const data=bundle([{...feature('legacy','station'),properties:{id:'legacy',kind:'station',context_kinds:['context','station']}}]);
 assert.equal(styledPois(data,[],new Set(),new Set(['context']),false).features[0].properties.color,'#64748b');
});

test('missing and non-hex catalog colors retain model fallback; labels are text and duplicate kinds do not add swatches',ctx=>{
 dom(ctx);
 const data={catalog:{poi_types:{test:{label:'<unsafe>',color:'rgb(1, 2, 3)'}}},pois:{type:'FeatureCollection',features:[]}};
 for(const kind of ['test','unknown']){const legend=createPoiFilterLegend(data.catalog.poi_types,[kind,kind],'<display label>',(_kind,fallback)=>fallback);const entries=byClass(legend,'poi-filter-kind');assert.equal(entries.length,1);assert.equal(entries[0].textContent,'<display label>');assertSwatch(entries[0],modelColors(data,kind));}
});
