import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
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
 const geo=await readFile(new URL('../src/safety/geography-base.ts',import.meta.url),'utf8');assert(geo.includes('if(selected)revealSelectedInformation(bar)'));const helper=b.outputFiles[0].text;assert(!/fitBounds|flyTo|replaceChildren|cloneNode/.test(helper));
});
