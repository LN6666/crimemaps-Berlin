import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const built=await build({entryPoints:[new URL('../src/safety/report-list-pager.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {appendReportListPager}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
class Element{
  constructor(tag,document){this.tag=tag;this.ownerDocument=document;this.children=[];this.attributes={};this.textContent='';this._disabled=false;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(name,value){this.attributes[name]=value;}
  get disabled(){return this._disabled;}
  set disabled(value){this._disabled=value;if(value&&this.ownerDocument.activeElement===this)this.ownerDocument.activeElement=this.ownerDocument.body;}
  focus(options){if(this.disabled)return;if(!['button','input'].includes(this.tag)&&this.tabIndex===undefined)return;this.ownerDocument.activeElement=this;this.focusOptions=options;}
  click(){if(!this.disabled)this.onclick?.();}
}
function setup(ids){
  const document={createElement:tag=>new Element(tag,document)};document.body=document.createElement('body');document.activeElement=document.body;
  const parent=document.createElement('section'),renders=[],events=[];
  appendReportListPager(parent,ids,{previous:'Previous',next:'Next',navigationLabel:'Announcements',pageLabel:(page,pages)=>`Page ${page} of ${pages}`,
    beforePage:()=>events.push('before'),renderPage:(host,pageIds)=>{events.push('render');renders.push(pageIds);for(const id of pageIds){const card=document.createElement('article');card.textContent=id;host.append(card);}}});
  const [list,navigation]=parent.children,[previous,status,next]=navigation.children;
  return{document,parent,list,navigation,previous,status,next,renders,events};
}

test('twenty-ID pages preserve inputs and stable navigation while rendering only the current list',()=>{
  const ids=Object.freeze(Array.from({length:45},(_,i)=>`report-${i}`)),f=setup(ids);
  const nodes=[f.list,f.navigation,f.previous,f.status,f.next];
  assert.deepEqual(f.renders,[ids.slice(0,20)]);assert.equal(f.list.children.length,20);assert.equal(f.status.textContent,'Page 1 of 3');
  assert.equal(f.previous.disabled,true);assert.equal(f.next.disabled,false);assert.equal(f.list.tabIndex,undefined);
  f.next.focus();f.next.click();
  assert.deepEqual(f.renders[1],ids.slice(20,40));assert.equal(f.list.children.length,20);assert.equal(f.status.textContent,'Page 2 of 3');
  assert(f.document.activeElement===f.next,'usable next button keeps keyboard focus');
  f.next.click();
  assert.deepEqual(f.renders[2],ids.slice(40));assert.equal(f.list.children.length,5);assert.equal(f.status.textContent,'Page 3 of 3');
  assert(f.document.activeElement===f.previous,'last page moves focus before disabling next');assert.deepEqual(f.previous.focusOptions,{preventScroll:true});
  assert.equal(f.next.disabled,true);assert.equal(f.previous.disabled,false);
  f.previous.click();f.previous.click();
  assert(f.document.activeElement===f.next,'first page moves focus before disabling previous');assert.deepEqual(f.next.focusOptions,{preventScroll:true});
  assert.equal(f.status.textContent,'Page 1 of 3');assert.deepEqual(f.list.children.map(card=>card.textContent),ids.slice(0,20));
  assert.deepEqual([f.parent.children[0],f.parent.children[1],...f.navigation.children],nodes);
  assert.deepEqual(ids,Array.from({length:45},(_,i)=>`report-${i}`));
  assert.deepEqual(f.events,Array.from({length:5},()=>['before','render']).flat());
});

test('page changes preserve external focus and expose localized native navigation with atomic page status',()=>{
  const f=setup(Array.from({length:21},(_,i)=>String(i))),outside=f.document.createElement('input');outside.focus();
  f.next.click();assert(f.document.activeElement===outside,'page change does not steal external focus');
  assert.equal(f.navigation.tag,'nav');assert.equal(f.navigation.attributes['aria-label'],'Announcements');
  assert.equal(f.previous.type,'button');assert.equal(f.previous.textContent,'Previous');assert.equal(f.next.type,'button');assert.equal(f.next.textContent,'Next');
  assert.deepEqual(f.status.attributes,{role:'status','aria-live':'polite','aria-atomic':'true'});
  assert.equal(f.list.tabIndex,undefined);
});

test('empty and exactly twenty-ID lists remain one page with both controls disabled',()=>{
  for(const count of [0,20]){
    const ids=Array.from({length:count},(_,i)=>String(i)),f=setup(ids);
    assert.equal(f.previous.disabled,true);assert.equal(f.next.disabled,true);assert.equal(f.status.textContent,'Page 1 of 1');
    f.previous.click();f.next.click();assert.equal(f.renders.length,1);assert.deepEqual(f.renders[0],ids);assert.equal(f.list.children.length,count);
  }
});
