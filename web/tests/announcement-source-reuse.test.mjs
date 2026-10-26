import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Execute the actual public refresh/loadViewport/setSource functions. Only DOM,
// network, MapLibre, and the independently tested geometry builders are fixtures.
const mainPath=process.env.ANNOUNCEMENT_SOURCE_MAIN??new URL('../src/safety/main.ts',import.meta.url).pathname;
const main=fs.readFileSync(mainPath,'utf8');
const ast=ts.createSourceFile(mainPath,main,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const declaration=name=>{
 const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
 assert.ok(node,`actual production function ${name}`);return node.getText(ast);
};
const state=ast.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>[
 'viewportSources','viewportSourceData','viewportRenderInputs','deferredSourceData',
 'submittedViewportSources','announcementSourceInputs',
].includes(d.name.getText(ast)))).map(n=>n.getText(ast)).join('\n');
const helpers=['forgetViewportSubmission','clearViewportSubmissions'].filter(name=>ast.statements.some(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name));
const source=ts.transpileModule(`${state}\n${[...helpers,'monthKey','events','setSource','refresh','loadViewport'].map(declaration).join('\n')}`,{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
}).outputText;
// Use the installed SDK's actual catch/fire/finally method, not a fixture
// assumption that Promise rejection is the worker-error contract.
const sdkPath=new URL('../node_modules/maplibre-gl/src/source/geojson_source.ts',import.meta.url).pathname;
const sdkText=fs.readFileSync(sdkPath,'utf8'),sdkAst=ts.createSourceFile(sdkPath,sdkText,ts.ScriptTarget.Latest,true);
const sdkClass=sdkAst.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='GeoJSONSource');
const sdkMethod=sdkClass.members.find(n=>n.name?.getText(sdkAst)==='_dispatchWorkerUpdate');
assert.ok(sdkMethod,'installed MapLibre dispatch method');
const sdkDispatch=new Function('MapSourceDataEvent','MessageType','ensureError','ErrorEvent',
 ts.transpileModule(`class ActualSDKDispatch{${sdkMethod.getText(sdkAst)}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';return ActualSDKDispatch.prototype._dispatchWorkerUpdate;'
)(class{constructor(type,extra){Object.assign(this,{type},extra);}}, {loadData:'loadData'},value=>value,
 class{constructor(error){this.type='error';this.error=error;}});
const point=(id,x=0)=>({type:'Feature',id,geometry:{type:'Point',coordinates:[x,0]},properties:{id,role_group:'incident'}});
const fc=features=>({type:'FeatureCollection',features});
const empty=()=>fc([]);

function harness(){
 const nodes=new Map();
 const el=id=>{if(!nodes.has(id))nodes.set(id,{value:id==='year'?'2026':id==='month'?'all':id==='category'?'all':'',checked:true,hidden:false,textContent:'',replaceChildren(){}});return nodes.get(id);};
 const a={id:'a',month:'2026-01',category:'one',geometry:point('a',0).geometry,scene_locations:[]};
 const b={id:'b',month:'2026-02',category:'two',geometry:point('b',20).geometry,scene_locations:[]};
 const annual={year:'2026',countable_event_ids:['a','b'],event_categories:{a:['one'],b:['two']},hex:{detail:fc([point('a',0),point('b',20)]),overview:fc([point('a',0),point('b',20)])}};
 const month={links:[],source_poi_reference_features:fc([point('a',0),point('b',20)])};
 const data={events:[a,b],months:{'2026-all':month},metadata:{zoom_threshold:13},pois:fc([point('poi',0)])};
 const calls=new Map(),builds={hex:0,roads:0,scenes:0,references:0,pois:0},errors=[];
 const sources=new Map();let bounds=[-1,-1,1,1],zoom=16,network,failSource,eventFailSource;const sdkErrors=[];
 const makeSource=id=>{const listeners=new Map();return {
  on(type,fn){const set=listeners.get(type)??new Set();set.add(fn);listeners.set(type,set);},
  off(type,fn){listeners.get(type)?.delete(fn);},
  fire(event){for(const fn of [...listeners.get(event.type)??[]])fn(event);if(event.type==='error')sdkErrors.push(event);},
  listeners:()=>[...listeners.values()].reduce((sum,set)=>sum+set.size,0),
  _removed:false,_hasPendingWorkerUpdate:()=>false,
  setData(value){calls.set(id,[...(calls.get(id)??[]),value]);
   if(failSource===id){failSource=undefined;return Promise.reject(Error('fixture source rejection'));}
   if(eventFailSource===id){eventFailSource=undefined;this.actorPromise=Promise.resolve({sendAsync:async()=>{throw Error('actual SDK worker rejection');}});return sdkDispatch.call(this,Promise.resolve({data:value}));}
   return Promise.resolve();},
 };};
 const map={getBounds(){return {getWest:()=>bounds[0],getSouth:()=>bounds[1],getEast:()=>bounds[2],getNorth:()=>bounds[3]};},getZoom:()=>zoom,getSource(id){if(!sources.has(id))sources.set(id,makeSource(id));return sources.get(id);},setLayoutProperty(){}};
 const derive=rows=>fc(rows.map(e=>({type:'Feature',geometry:e.geometry,properties:{id:e.id,role_group:'incident'}})));
 const client={async viewport(kind){if(network)return network(kind);return kind==='pois'?fc([point('new-poi')]):empty();},async json(){return empty();}};
 const env={map,data,annual,el,client,console:{error:error=>errors.push(error)},empty,
  viewportRenderData:(collection,view)=>fc(collection.features.filter(f=>f.geometry.coordinates[0]>=view[0]&&f.geometry.coordinates[0]<=view[2])),
  monthEvents:(d,key,category)=>d.events.filter(e=>(key.endsWith('-all')?e.month.startsWith(key.slice(0,4)):e.month===key)&&(category==='all'||e.category===category)),
  countableEventIds:rows=>new Set(rows.map(e=>e.id)),
  filteredHex:(collection,ids)=>{builds.hex++;return fc(collection.features.filter(f=>ids.has(f.id)).map(f=>({...f,properties:{...f.properties}})));},
  candidateRoads:rows=>{builds.roads++;return derive(rows);},sceneFeatures:rows=>{builds.scenes++;return derive(rows);},
  sourcePoiReferences:(rows,refs)=>{builds.references++;const ids=new Set(rows.map(e=>e.id));return fc((refs?.features??[]).filter(f=>ids.has(f.id)).map(f=>({...f,properties:{...f.properties}})));},
  styledPois:d=>{builds.pois++;return d.pois;},renderPois:value=>value,poiCenters:value=>value,
  kinds:()=>new Set(['park']),t:key=>key,number:String,periodLabel:()=>el('month').value,
  setRoadVisibility(){},paintOverlays(){},text:()=>({}),locationCoverage:()=>({withoutCountPointIds:[],countableAnnouncements:0,withoutCountPointWithDisplayGeometry:0}),
  openDialog(){},listReports(){},methodsPanel:{update(){}},uncertaintyPanel:{update(){}},dynamicText:{displayRows:rows=>rows},
  savedPublicationMonths:()=>[],manifest:{months:{'2026-01':{},'2026-02':{}},generation:'fixture'},currentCity:'berlin',showSelection(){},baseShopLabels:{updateExistingPois(){}},
 };
 const api=new Function('env',`const {${Object.keys(env).filter(k=>k!=='annual').join(',')}}=env;
 let annual=env.annual,loaded=true,expired=false,mapGPUUnavailable=false,monthLoading=false,annualLoadingKey='',currentMode='',pendingRecoverySelection=null,selected=null;
 let activeHex=empty(),activeRoads=empty(),activeScenes=empty(),activeSourcePois=empty(),activePois=empty(),viewportRequest=new AbortController();
 ${source}
 return {refresh,loadViewport,setSource,full:()=>({activeHex,activeRoads,activeScenes,activeSourcePois}),remembered:()=>viewportSourceData,
 unavailable:value=>{mapGPUUnavailable=value;},replaceAnnual:value=>{annual=value;},
 flushDeferred(){for(const [id,value]of deferredSourceData)setSource(id,value);},
 clearSubmissions(){clearViewportSubmissions();},
 };`)(env);
 return {...api,calls,builds,errors,sdkErrors,data,annual,month,el,source:id=>map.getSource(id),
  bounds:value=>{bounds=value;},zoom:value=>{zoom=value;},network:value=>{network=value;},
  replaceSource:id=>sources.set(id,makeSource(id)),failSource:id=>{failSource=id;},eventFailSource:id=>{eventFailSource=id;},
 };
}
const announcementIds=['hex','candidate-roads','scenes','source-poi-references'];
const counts=h=>announcementIds.map(id=>h.calls.get(id)?.length??0);
const geometryBuilds=h=>['hex','roads','scenes','references'].map(id=>h.builds[id]);

test('POI-only completion keeps all annual content and reuses actual refresh sources',async()=>{
 const h=harness();h.refresh();const originals=h.full(),before=JSON.stringify(h.data.events);
 await h.loadViewport();await h.loadViewport();
 assert.deepEqual(counts(h),[1,1,1,1]);assert.deepEqual(geometryBuilds(h),[1,1,1,1]);
 for(const [key,value]of Object.entries(originals))assert.equal(h.full()[key],value);
 assert.equal(h.builds.pois,3);assert.equal(h.data.pois.features[0].id,'new-poi');
 assert.equal(h.full().activeScenes.features.length,2);assert.equal(JSON.stringify(h.data.events),before);
 assert.equal(h.calls.get('scenes')[0].features.length,1,'only transfer, not annual source, is narrowed');
});

test('period/category/source/annual replacement and hex-mode invalidate the real derived path',()=>{
 const h=harness();h.refresh();
 for(const change of [
  ()=>{h.el('category').value='two';},
  ()=>{h.el('month').value='02';h.data.months['2026-02']=h.month;},
  ()=>{h.data.events=h.data.events.map(e=>e.id==='b'?{...e,geometry:point('b',21).geometry}:e);},
  ()=>{h.data.months['2026-02']={...h.month,source_poi_reference_features:fc([point('b',21)])};},
  ()=>h.replaceAnnual({...h.annual,event_categories:{a:['two'],b:['two']}}),
  ()=>h.zoom(10),
 ]){const before=geometryBuilds(h);change();h.refresh();assert.deepEqual(geometryBuilds(h),before.map(n=>n+1));}
 assert.deepEqual(h.full().activeScenes.features.map(f=>f.properties.id),['b']);
 assert.deepEqual(h.full().activeScenes.features[0].geometry.coordinates,[21,0]);
 assert.deepEqual(counts(h),[7,7,7,7]);
});

test('real viewport path updates before POI failure, preserves full sources and later return',async()=>{
 const h=harness();h.refresh();const originals=h.full();h.bounds([19,-1,22,1]);
 h.network(async()=>{throw Error('fixture POI/network failure');});await h.loadViewport();
 assert.deepEqual(counts(h),[2,2,2,2]);assert.equal(h.calls.get('scenes').at(-1).features[0].properties.id,'b');
 assert.equal(h.full().activeScenes,originals.activeScenes);assert.equal(h.errors.length,1);
 h.bounds([-1,-1,1,1]);h.network(undefined);await h.loadViewport();
 assert.deepEqual(counts(h),[3,3,3,3]);assert.equal(h.calls.get('scenes').at(-1).features[0].properties.id,'a');
 assert.deepEqual(geometryBuilds(h),[1,1,1,1]);
});

test('GPU unavailable defers without writes; restoration and replacement source re-submit',()=>{
 const h=harness();h.refresh();h.unavailable(true);h.refresh();assert.deepEqual(counts(h),[1,1,1,1]);
 h.unavailable(false);h.flushDeferred();h.refresh();assert.deepEqual(counts(h),[2,2,2,2]);
 h.replaceSource('scenes');h.refresh();assert.deepEqual(counts(h),[2,2,3,2]);
 assert.deepEqual(geometryBuilds(h),[1,1,1,1]);
});

test('failed asynchronous setData is retried rather than remembered as successful',async()=>{
 const h=harness();h.failSource('scenes');h.refresh();await Promise.resolve();h.refresh();
 assert.deepEqual(counts(h),[1,1,2,1]);assert.equal(h.errors.length,1);
});


test('actual MapLibre worker error fires error but resolves: unchanged source is retried',async()=>{
 const h=harness();h.eventFailSource('scenes');h.refresh();
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.equal(h.sdkErrors.length,1);assert.equal(h.errors.length,0,'SDK swallowed worker rejection; Promise catch was not called');
 assert.equal(h.source('scenes').listeners(),0,'failed submission removes its listener');
 h.refresh();assert.deepEqual(counts(h),[1,1,2,1]);assert.equal(h.source('scenes').listeners(),1);
 h.refresh();assert.deepEqual(counts(h),[1,1,2,1],'successful retry can be reused');
});

test('source replacement, GPU suspension and teardown remove bounded owned listeners',()=>{
 const h=harness();h.refresh();
 for(const id of announcementIds)assert.equal(h.source(id).listeners(),1);
 const old=h.source('scenes');h.replaceSource('scenes');h.refresh();
 assert.equal(old.listeners(),0);assert.equal(h.source('scenes').listeners(),1);
 old.fire({type:'error',error:Error('obsolete source')});h.refresh();assert.deepEqual(counts(h),[1,1,2,1]);
 h.unavailable(true);h.refresh();for(const id of announcementIds)assert.equal(h.source(id).listeners(),0);
 h.unavailable(false);h.flushDeferred();h.refresh();for(const id of announcementIds)assert.equal(h.source(id).listeners(),1);
 h.clearSubmissions();h.clearSubmissions();for(const id of announcementIds)assert.equal(h.source(id).listeners(),0);
});
