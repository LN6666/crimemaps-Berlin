import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import ts from 'typescript';

const built=await build({entryPoints:[new URL('../src/safety/place-search.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {installPlaceSearch}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const source=await readFile(new URL('../src/safety/main.ts',import.meta.url),'utf8');
const parsed=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true);
const registrations=[];
function visit(node){
  if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&
    ts.isIdentifier(node.left)&&node.left.text==='placeSearch'&&ts.isCallExpression(node.right)&&
    ts.isIdentifier(node.right.expression)&&node.right.expression.text==='installPlaceSearch')registrations.push(node);
  ts.forEachChild(node,visit);
}
visit(parsed);
assert.equal(registrations.length,1,'execute the single actual main search registration');
const registration=ts.transpileModule(registrations[0].getText(parsed),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const connect=new Function('ctx',`
  const {document,el,client,searchRequest,t,poiName,data,manifest,refresh,selectionInspector,mapGPUUnavailable,map,installPlaceSearch}=ctx;
  let placeSearch,pendingSearchPoiId,selected;
  ${registration}
  return {control:placeSearch,get pending(){return pendingSearchPoiId;},get selection(){return selected;}};
`);
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
class Element extends EventTarget{
  constructor(tag,ownerDocument){super();this.tag=tag;this.ownerDocument=ownerDocument;this.children=[];this.attributes={};this.value='';this.textContent='';}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;if(!nodes.length)this.onClear?.();}
  setAttribute(name,value){this.attributes[name]=value;}
  click(){this.onclick?.();}
}
function setup(ctx,row,gpuUnavailable){
  const previousSet=globalThis.setTimeout,previousClear=globalThis.clearTimeout;
  const timers=new Map();let nextTimer=0;
  globalThis.setTimeout=fn=>{const id=++nextTimer;timers.set(id,fn);return id;};
  globalThis.clearTimeout=id=>timers.delete(id);
  ctx.after(()=>{globalThis.setTimeout=previousSet;globalThis.clearTimeout=previousClear;});
  const events=[],requests=[];
  const document={createElement:tag=>new Element(tag,document),querySelectorAll:selector=>{
    assert.equal(selector,'#poi-filters input');return scopes;
  }};
  const input=document.createElement('input'),results=document.createElement('div'),toggle={checked:false};
  results.onClear=()=>events.push('results-cleared');
  const scopes=['station','source_linked_context','cafe'].map(value=>({value,checked:value==='cafe',disabled:true}));
  const searchRequest=new AbortController();
  const linked=connect({document,el:id=>{
    const element={'search':input,'search-results':results,'poi-toggle':toggle}[id];
    assert(element,`unexpected main element ${id}`);return element;
  },client:{base:'/city/safety',json:(url,signal)=>{requests.push({url,signal});return Promise.resolve([row]);}},searchRequest,
  t:key=>key,poiName:(kind,label)=>`${kind}:${label}`,data:{catalog:{poi_types:{station:{label:'Station'}}}},
  manifest:{poi_scope_groups:{station:{kinds:['station']},source_linked_context:{kinds:['context','station']},cafe:{kinds:['cafe']}}},
  refresh:()=>{events.push('refresh');assert.equal(toggle.checked,true);assert.equal(linked.pending,row.id);assert.deepEqual(linked.selection,{type:'poi',id:row.id});},
  selectionInspector:{open:()=>events.push('inspector.open')},mapGPUUnavailable:gpuUnavailable,
  map:{flyTo:options=>{assert.equal(gpuUnavailable,false,'GPU unavailable must not touch map');assert.equal(options.center,row.center,'use the original saved center');assert.equal(options.zoom,16);events.push('flyTo');}},installPlaceSearch});
  ctx.after(()=>linked.control.destroy());
  const search=async()=>{
    input.value=` ${row.name.toLocaleUpperCase()} `;input.dispatchEvent(new Event('input'));
    const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());await settle();
  };
  return{linked,input,results,toggle,scopes,events,requests,searchRequest,search};
}

test('actual main search selection restores POI scope and information before flying to its original center',async ctx=>{
  const row={id:'saved-stop-1',name:'Saved station',kind:'station',scope_category:'source_linked_context',center:[13.4,52.5]};
  const f=setup(ctx,row,false);await f.search();
  assert.equal(f.requests.length,1);assert.equal(f.requests[0].url,'/city/safety/search.json');assert.equal(f.requests[0].signal,f.searchRequest.signal);
  assert.equal(f.results.children.length,1);const button=f.results.children[0];
  assert.equal(button.type,'button');assert.equal(button.textContent,'Saved station · station:Station');
  f.events.length=0;button.click();
  assert(f.scopes.every(scope=>!scope.disabled));
  assert.deepEqual(f.scopes.filter(scope=>scope.checked).map(scope=>scope.value),['source_linked_context','cafe']);
  assert.deepEqual(f.events,['refresh','inspector.open','flyTo','results-cleared']);
  assert.equal(f.results.children.length,0);
});

test('actual main search opens information with GPU unavailable and preserves unscoped kind-group matching',async ctx=>{
  const row={id:'saved-stop-2',name:'Saved platform',kind:'station',center:[13.41,52.51]};
  const f=setup(ctx,row,true);await f.search();
  f.events.length=0;f.results.children[0].click();
  assert.equal(f.toggle.checked,true);assert(f.scopes.every(scope=>!scope.disabled));
  assert.deepEqual(f.scopes.filter(scope=>scope.checked).map(scope=>scope.value),['station','source_linked_context','cafe']);
  assert.equal(f.linked.pending,row.id);assert.deepEqual(f.linked.selection,{type:'poi',id:row.id});
  assert.deepEqual(f.events,['refresh','inspector.open','results-cleared']);assert.equal(f.results.children.length,0);
});
