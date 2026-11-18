import {resourceContentKey} from './support/resource-content-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {build} from 'esbuild';

// Only the page ledger/store, immutable packing and dynamic state modules are
// bundled. City catalogues, material models and GL shader compilation stay out
// of this focused source-group/visible-consumer regression.
const web=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({stdin:{contents:[
 "export * from './src/safety/render-runtime/resource-budget';",
 "export * from './src/safety/render-runtime/chunk-resource-store';",
 "export * from './src/safety/renderer-chunk-input';",
 "export * from './src/painted/root500/safety/chunk-mesh-packing';",
 "export * from './src/painted/root500/safety/chunk-mesh-residency';"
].join('\n'),resolveDir:web},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const R=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const key=row=>row.objectId+'|'+row.partId;
const component=(n,city='berlin')=>({city,objectId:'osm/way/'+n,partId:'part/'+n,origin:[13.4,52.5],componentGeometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[0,1],[0,0]]]},sourceFeature:{type:'Feature',properties:{}},batches:[{positions:new Float32Array([n,0,0,n+1,2,0,n,0,1]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),color:[.2,.3,.4],indices:new Uint32Array([0,1,2]),faceRole:'wall'}]});
function declarations(provider,names){
 const text=fs.readFileSync(new URL(`../src/painted/${provider}/safety/building-mesh-renderer.ts`,import.meta.url),'utf8'),ast=ts.createSourceFile(provider,text,ts.ScriptTarget.Latest,true),found=new Map();
 function visit(node){if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))found.set(node.name.text,node);ts.forEachChild(node,visit);}visit(ast);
 return names.map(name=>{const node=found.get(name);assert(node,provider+' '+name);let source=node.getText(ast);
  if(name==='buildBatches'){
   // The existing City admission/model stage has separate scientific tests.
   // Preserve the production tail verbatim, including complete physical rows,
   // real source/material keys, estimates and production scheduling.
   const body=node.body.statements,start=body.findIndex(n=>/^const input=residentChunkInput,scope=currentDataScope\(\);/.test(n.getText(ast)));assert(start>0);
   source=source.slice(0,source.indexOf('{')+1)+`const nextSourceLoaded=new Map(components.map(c=>[key(c),c])),s434Entries=[];const batchIncluded=(c,bi)=>sourceRoleBatchIncluded(c,bi);`+body.slice(start).map(n=>n.getText(ast)).join('\n')+'}';
   const parsed=ts.createSourceFile('city-tail.ts',source,ts.ScriptTarget.Latest,true),productions=[];function find(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='produceMaterial')productions.push(n);ts.forEachChild(n,find);}find(parsed);assert.equal(productions.length,1);
   const production=productions[0];source=source.slice(0,production.getStart(parsed))+'function produceMaterial(rows,signal){signal.throwIfAborted();return fixtureMaterial(rows);}'+source.slice(production.end);
  }
  return source;
 }).join('\n');
}
const noMask=()=>({wordMasks:[],masks:[],createBinding(){return{destroy(){},detach(){}};},costs:[],release(){}});
function metadata(){return new Proxy({},{get:(_target,name)=>String(name).endsWith('Surfaces')?new Map():String(name).endsWith('Display')?{enabled:false}:[]});}
function material(rows){const vertices=rows.reduce((n,row)=>n+row.batches.reduce((v,b)=>v+b.positions.length/3,0),0);return{paint:new Float32Array(vertices*5),progressive:new Float32Array(vertices*4),geometry:new Map(),auxiliary:{maskRecipe:noMask(),s528ProjectionStats:[]},maskRecipe:noMask(),metadata:metadata(),costs:[],retainedBytes:0,sidecars:{}};}
function fixture(provider,{rowCount=3,sourceKey='one-admitted-source-group'}={}){
 const city=provider==='city'?'dresden':'berlin',rows=Array.from({length:rowCount},(_,i)=>component(i+1,city)),gl={isContextLost:()=>false},budget=R.createResourceBudget({limitBytes:4*1024*1024}),store=R.createChunkResourceStore({budget,recentMaxEntries:8,recentMaxIdleMs:60000});R.bindChunkResourceContext(gl,store);
 const input={store,groups:[{contentKey:sourceKey,components:rows,parents:[],frame:R.rendererChunkFrame(rows[0].origin,'canonical-frame'),cohortKeys:[],materialAuthority:'fixture-material',recipeAuthority:'fixture-recipe',selectedLOD:1}],cohorts:[]};
 const title=provider==='city'?'City':'Tier',names=[provider==='city'?'buildBatches':'packBatches',`install${title}ChunkScene`,'localComponent','sceneIndexCount',`bind${title}ChunkMasks`,`release${title}Chunks`,...(provider==='city'?['cityChunkMaterialState','cityMaterialSourceCosts']:['measureSourcePreparation','recordSourcePreparation'])];
 let maskBindings=0,productions=0;
 const S={sourcePreparationStages:{},resourceContentKey,...R,key,gl,city,destroyed:false,generation:0,viewRevision:0,vertexCap:100000,sceneChunks:[],sceneSpans:[],loaded:new Map(),sourceLoaded:new Map(),familyRuns:[],sceneSunInstant:'2026-11-03T12:00:00Z',materialAnchor:undefined,
  packingData:{chunkInput:input},residentChunkInput:input,residentData:{chunkInput:input},scope:{stats:{disposed:false},retain:()=>()=>{}},currentDataScope(){return this.scope;},dataScope(){return this.scope;},map:{triggerRepaint(){}},program:{},cityBuiltSourceFeatures:new Set(),CITY_DRESDEN_SOURCE_FEATURES:[],CITY_DATA_COHORTS:{},C313_SOURCE_PINS:[],C318_FIXTURE:{native:[]},c437HasMaterialBinding:()=>false,c438HasMaterialBinding:()=>false,c439HasMaterialBinding:()=>false,c442HasMaterialBinding:()=>false,c472HasMaterialBinding:()=>false,c473HasMaterialBinding:()=>false,c476HasMaterialBinding:()=>false,
  c311Context:undefined,c312Context:undefined,c313Context:undefined,s434DisplayProfile:null,s166MaterialReady70:false,tier300RepairProgramReady:false,orangerieProgramReady:false,OWNER_SHAPE_PATCH_PROFILES:[],
  s166MaterialAffects70:()=>false,beMarkischesMuseumMaterialAffects1:()=>false,beZeughausCourtMaterialAffects1:()=>false,hnOrangerieBackMaterialAffects1:()=>false,validate(){},s166Display70:()=>true,beMarkischesMuseumDisplay1:()=>true,beZeughausCourtDisplay1:()=>true,exactNativePartDisplay:components=>({held:[],drawable:components}),acceptPaintComponent:()=>true,sourceRoleBatchIncluded:()=>true,s434AggregateBatchIncluded:()=>true,s528ProjectionCandidate:()=>false,rathausCoincidentWallFragmentMasks:()=>({masks:[]}),
  chunkStyles:()=>({wall:24,roof:56,landmark:false,sourceGlassRoof:false}),paintProgramRuns:indices=>[{key:'base',firstIndex:0,indexCount:indices.length}],currentPaintProgramKey:()=> 'base',isProgressivelyPainted:()=>false,cityData_isProgressivelyPainted:()=>false,
  fixtureMaterial:material,packTierChunkMaterials:material,cityChunkMaterialCosts:()=>[],disposeCityChunkMaterial(){},cityStateOwner:'city-state',tierStateOwner:'tier-state',repaintMap(){},admitShadow(){},updateSolarShadowIndices(){},progressiveRenderView:()=>[],cityData_progressiveRenderView:()=>[],sceneSolarLight:()=>({}),createIndexedPickBlocks70:()=>({}),isFacadeLandmark:()=>false,isSourceOnlyGlassRoof:()=>false,
  acquirePackedMeshChunk(...args){const original=args[2],options={...original,materials(...params){productions++;const value=original.materials(...params);const recipe=value.auxiliary?.maskRecipe;if(recipe){const create=recipe.createBinding;recipe.createBinding=(...input)=>{maskBindings++;return create(...input);};}return value;}};return R.acquirePackedMeshChunk(args[0],args[1],options,args[3],args[4]);}
 };
 // Named declarations execute against renderer state, as the existing renderer
 // closure fixtures do. Unexpected free-name reads fail rather than becoming
 // copied replacement implementation logic.
 const scope=new Proxy(S,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,v)=>(o[k]=v,true)});
 const js=ts.transpileModule(declarations(provider,names),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 Object.assign(S,Function('scope',`with(scope){${js}\nreturn {${names.join(',')}};}`)(scope));
 S.currentDataScope=()=>S.scope;S.dataScope=()=>S.scope;
 const prepare=async visible=>{
  const previous=S.sceneChunks,packing=S[provider==='city'?'buildBatches':'packBatches'](visible,++S.generation);
  for(let turn=0;turn<30;turn++){await Promise.all(packing.chunks.flatMap(chunk=>[chunk.material?.ready,chunk.cpu?.ready,chunk.state?.ready].filter(Boolean)));if(packing.finish())break;assert(turn<29,'bounded source production finishes');}
  const current=S.sceneChunks;S[`release${title}Chunks`](previous);return current[0];
 };
 return{S,rows,store,budget,prepare,addUnrelated(){const extra=component(4,city);input.groups.push({...input.groups[0],contentKey:'unrelated-admitted-source-group',components:[extra]});return extra;},get productions(){return productions;},get maskBindings(){return maskBindings;},destroy(){const old=S.sceneChunks;S.sceneChunks=[];S[`release${title}Chunks`](old);store.evictRecent();store.destroy();}};
}

for(const provider of ['city','tier300'])test(provider+' A subset → overlapping B in another order → A reuses the complete source payload with visible local spans',async()=>{
 const f=fixture(provider);
 try{
  const A=[f.rows[0],f.rows[1]],B=[f.rows[2],f.rows[1]],first=await f.prepare(A),payload=first.cpu.value,paint=payload.paint,vertices=payload.vertices,masks=first.masks;
  assert.deepEqual(payload.rows.map(row=>key(row.component)),f.rows.map(key),'the first subset prepares the complete admitted group');
  assert.deepEqual([...first.loaded.keys()],A.map(key));assert.deepEqual(f.S.sceneSpans.map(span=>span.localFirstIndex),[0,3]);assert.equal(f.S.sceneIndexCount(),6);
  const second=await f.prepare(B);assert.strictEqual(second.masks,masks,'unchanged active mask slots reuse their binding');assert.strictEqual(second.cpu.value,payload);assert.strictEqual(second.cpu.value.paint,paint);assert.strictEqual(second.cpu.value.vertices,vertices);
  assert.deepEqual([...second.loaded.keys()],f.rows.slice(1).map(key),'the local lookup excludes the selected row that left the viewport');assert.deepEqual([...f.S.loaded.keys()],B.map(key),'scene order stays with the visible admission');assert.deepEqual(f.S.sceneSpans.map(span=>span.localFirstIndex),[6,3]);assert.equal(f.S.sceneIndexCount(),6);
  const third=await f.prepare(A);assert.strictEqual(third.cpu.value,payload);assert.deepEqual(f.S.sceneSpans.map(span=>span.localFirstIndex),[0,3]);assert.equal(f.productions,1,'pure viewport changes never rerun physical material/packing');
  const extra=f.addUnrelated();f.S.CITY_DRESDEN_SOURCE_FEATURES.push('unrelated-dresden-material');f.S.cityBuiltSourceFeatures.add('unrelated-dresden-material');f.S.s166MaterialReady70=true;f.S.tier300RepairProgramReady=true;f.S.orangerieProgramReady=true;
  const fourth=await f.prepare([...B,extra]);assert.strictEqual(fourth.cpu.value,payload,'unrelated admitted source and unrelated material readiness leave the common physical block intact');assert.equal(f.productions,2,'only the new source group is produced');
 }finally{f.destroy();}
});

test('City admits the complete derived copy before cloning and its source cell retains no preparation scope',()=>{
 const payload=fs.readFileSync(new URL('../src/painted/city/safety/building-payload-cost.ts',import.meta.url),'utf8'),payloadJS=ts.transpileModule(payload,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};Function('exports',payloadJS)(exports);
 const renderer=fs.readFileSync(new URL('../src/painted/city/safety/building-mesh-renderer.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('city',renderer,ts.ScriptTarget.Latest,true),costs=ast.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(decl=>decl.name.getText(ast)==='cityDerivedSourceCosts'));assert(costs);
 let clones=0;const clone=value=>{clones++;return structuredClone(value);};
 const js=ts.transpileModule(costs.getText(ast)+'\n'+declarations('city',['acquireCityDerivedSource']),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const acquire=Function('estimateRetainedBuildingPayload','structuredClone',js+'\nreturn acquireCityDerivedSource;')(exports.estimateRetainedBuildingPayload,clone),rows=[component(7)],contributors=[{contentKey:'only-real-source-contributor',parents:[]}];
 const deniedBudget=R.createResourceBudget({limitBytes:1}),denied=R.createChunkResourceStore({budget:deniedBudget});
 try{assert.throws(()=>acquire(denied,'c311','verified-fixture',contributors,rows,undefined),{name:'ResourceBudgetExceededError'});assert.equal(clones,0,'a refused full-copy admission performs no clone');assert.equal(deniedBudget.stats.bytes,0);}finally{denied.destroy();}
 const budget=R.createResourceBudget({limitBytes:1024*1024}),store=R.createChunkResourceStore({budget});
 try{const lease=acquire(store,'c311','verified-fixture',contributors,rows,undefined);assert.equal(clones,1);assert.deepEqual(lease.value,rows);assert.notStrictEqual(lease.value,rows);assert.notStrictEqual(lease.value[0].batches[0].positions,rows[0].batches[0].positions);assert(budget.stats.bytes>=exports.estimateRetainedBuildingPayload(lease.value).retainedPayloadEstimateBytes);lease.release();assert.equal(budget.stats.bytes,0,'no scope/extra source lease survives the last derived consumer');}finally{store.destroy();}
});

for(const provider of ['city','tier300'])test(provider+' material row authority stays linear and reuses packed content under its real budget',async()=>{
 const sourceKey='verified-source:'+ 'x'.repeat(8192),f=fixture(provider,{rowCount:400,sourceKey});
 try{
  const first=await f.prepare(f.rows),packed=first.cpu.value;
  assert(packed.contentKey.length<sourceKey.length*4+f.rows.length*128,'no complete source key repeated for each component');
  assert.equal(packed.rows.length,400);assert.equal(packed.indices.length,1200);
  const second=await f.prepare(f.rows.slice(30,200).reverse());
  assert.strictEqual(second.cpu.value,packed,'visibility and order do not change immutable source content');
  assert.equal(f.productions,1);
 }finally{f.destroy();}
});
