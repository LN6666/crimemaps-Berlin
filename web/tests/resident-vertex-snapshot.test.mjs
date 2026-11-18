import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const providers=['root500','delegated500','tier300','church','city','infill','bremen'];
const web=new URL('../',import.meta.url);
async function parse(relative){const text=await fs.readFile(new URL(relative,web),'utf8');return ts.createSourceFile(relative,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);}
function collect(ast,predicate){const out=[];function visit(node){if(predicate(node))out.push(node);ts.forEachChild(node,visit);}visit(ast);return out;}
function expression(text,env){const js=ts.transpileModule(`(${text})`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;return Function('env',`with(env){return ${js}}`)(env);}
function statement(text,env){const js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;return Function('env',`with(env){${js}}`)(env);}
// Chunk residency (uncovered[9](2)): each renderer's public residentVertexCount getter reads the
// published chunk scene through its actual sceneVertexCount, and destroy clears the scene with its
// actual sceneChunks=[] assignment. A commit is the publication of new chunk objects.
// Fixture chunks are built from production text, not invented fields:
// - the canonical 9-float vertex rows and the 1-float state rows are the packer's own allocations
//   (delegated500/renderer-packed-chunks packChunkGeometry for delegated500+church; root500
//   chunk-mesh-packing for the five chunk-mesh families);
// - the per-owner state copy is the production state-lease production (packed.initialState.slice()
//   inline for the packChunkGeometry families; acquireChunkMeshState's baseState.slice() otherwise);
// - the chunk carries state in the field its production chunk type declares (stateData+dynamic,
//   or state:ChunkResourceLease<Float32Array>), and stateRows reads exactly that field.
// Coverage gap kept explicit: the row loops that fill vertices/state and the store lease lifecycle
// (release on destroy) are not executed here; resident-gpu/chunk-resource tests own them.
const chunkTypeName={root500:'StreamChunk',delegated500:'DelegatedPackedChunk',tier300:'TierChunk',church:'ChurchPackedChunk',city:'CityChunk',infill:'StreamChunk',bremen:'BremenChunk'};
const declaration=(ast,name,initializer)=>{const nodes=collect(ast,n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)===name&&n.initializer?.getText(ast)===initializer);assert.equal(nodes.length,1,`${ast.fileName}: production ${name}=${initializer}`);return nodes[0].initializer.getText(ast);};
const packers={
 packed:await (async()=>{const ast=await parse('src/painted/delegated500/safety/renderer-packed-chunks.ts');const vertices=declaration(ast,'vertices','new Float32Array(count*9)'),state=declaration(ast,'initialState','new Float32Array(count)');
  return count=>({vertices:expression(vertices,{count}),initialState:expression(state,{count})});})(),
 mesh:await (async()=>{const ast=await parse('src/painted/root500/safety/chunk-mesh-packing.ts');const vertices=declaration(ast,'vertices','new Float32Array(size.vertices*9)'),state=declaration(ast,'baseState','new Float32Array(size.vertices)');
  return count=>({vertices:expression(vertices,{size:{vertices:count}}),baseState:expression(state,{size:{vertices:count}})});})(),
};
const meshStateAst=await parse('src/painted/root500/safety/chunk-mesh-residency.ts');
const meshStateFn=collect(meshStateAst,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='acquireChunkMeshState');assert.equal(meshStateFn.length,1);
const meshStateProduce=collect(meshStateFn[0],n=>ts.isArrowFunction(n)&&n.parameters.length===0&&n.body.getText(meshStateAst).includes('value.baseState.slice()'));assert.equal(meshStateProduce.length,1,'acquireChunkMeshState produces the owner state from the packed baseState');
const meshState=packed=>expression(meshStateProduce[0].getText(meshStateAst),{value:packed,production:{signal:{throwIfAborted(){}}}})();
const models=new Map();
for(const provider of providers){
 const ast=await parse(`src/painted/${provider}/safety/building-mesh-renderer.ts`);
 const getters=collect(ast,n=>ts.isGetAccessorDeclaration(n)&&n.name.getText(ast)==='residentVertexCount');assert.equal(getters.length,1,`${provider}: actual public getter`);
 assert.equal(getters[0].body.getText(ast),'{return sceneVertexCount();}',`${provider}: the getter is a scalar chunk-scene read`);
 const counters=collect(ast,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='sceneVertexCount');assert.equal(counters.length,1,`${provider}: actual chunk vertex count`);
 const destroyAncestor=node=>{for(let n=node.parent;n;n=n.parent)if(ts.isMethodDeclaration(n))return n.name.getText(ast)==='destroy';return false;};
 const cleared=collect(ast,n=>ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.EqualsToken&&n.left.getText(ast)==='sceneChunks'&&n.right.getText(ast)==='[]'&&destroyAncestor(n));assert.equal(cleared.length,1,`${provider}: production destroy clears the chunk scene`);
 const types=collect(ast,n=>(ts.isTypeAliasDeclaration(n)||ts.isInterfaceDeclaration(n))&&n.name.text===chunkTypeName[provider]);assert.equal(types.length,1,`${provider}: production chunk type`);
 const members=new Map(collect(types[0],n=>ts.isPropertySignature(n)).map(n=>[n.name.getText(ast),n.type?.getText(ast)]));
 let pack,stateOf;
 if(members.get('stateData')==='Float32Array'){
  // packChunkGeometry families: an inline store lease copies packed.initialState and the chunk literal carries it as stateData.
  assert.equal(members.get('dynamic'),'ChunkResourceLease<Float32Array>',`${provider}: dynamic state lease`);assert.equal(members.has('state'),false,provider);
  const produce=collect(ast,n=>ts.isPropertyAssignment(n)&&n.name.getText(ast)==='produce'&&n.initializer.getText(ast)==='()=>packed.initialState.slice()');assert.equal(produce.length,1,`${provider}: production state lease copies packed.initialState`);
  assert.equal(collect(ast,n=>ts.isPropertyAssignment(n)&&n.name.getText(ast)==='stateData'&&n.initializer.getText(ast)==='dynamic.value').length,1,`${provider}: the chunk literal carries the lease value as stateData`);
  // Delegated500 counts the published visible row ranges; its immutable CPU
  // allocation can also contain non-visible members of the physical group.
  // This fixture publishes its entire allocation as one visible row.
  assert(members.get('loaded')?.startsWith('Map<string,'),`${provider}: published rows belong to the chunk`);
  pack=count=>{const packed=packers.packed(count),value=expression(produce[0].initializer.getText(ast),{packed})();return{cpu:{value:packed},dynamic:{value},stateData:value,loaded:new Map([['visible',{firstVertex:0,lastVertex:count}]])};};
  stateOf=c=>c.stateData;
 }else{
  // chunk-mesh families: chunk.state is the acquireChunkMeshState lease over the packed baseState.
  assert.equal(members.get('state'),'ChunkResourceLease<Float32Array>',`${provider}: state lease member`);assert.equal(members.has('stateData'),false,provider);
  assert.equal(collect(ast,n=>ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.EqualsToken&&n.left.getText(ast)==='chunk.state'&&ts.isCallExpression(n.right)&&n.right.expression.getText(ast)==='acquireChunkMeshState').length,1,`${provider}: chunk state is produced by acquireChunkMeshState`);
  pack=count=>{const packed=packers.mesh(count);return{cpu:{value:packed},state:{value:meshState(packed)}};};
  stateOf=c=>c.state.value;
 }
 const env={sceneChunks:[]};env.sceneVertexCount=expression(counters[0].getText(ast),env);const api=expression(`{${getters[0].getText(ast)}}`,env);
 Object.defineProperty(api,'stats',{get(){throw Error(`${provider}: scalar reads must not construct diagnostics`);}});
 // Two chunks per nonempty commit, so the count is a sum over the published scene.
 models.set(provider,{api,env,stateOf,pack(count){env.sceneChunks=count?[pack(Math.ceil(count/2)),...(count>1?[pack(Math.floor(count/2))]:[])]:[];},clear(){statement(cleared[0].getText(ast)+';',env);}});
}
const vertexRows=m=>m.env.sceneChunks.reduce((n,c)=>n+c.cpu.value.vertices.length/9,0),stateRows=m=>m.env.sceneChunks.reduce((n,c)=>n+m.stateOf(c).length,0);
const aggregateAst=await parse('src/safety/painted-map.ts');
const proxies=collect(aggregateAst,n=>ts.isVariableDeclaration(n)&&n.name.getText(aggregateAst)==='renderer'&&n.initializer&&ts.isNewExpression(n.initializer)&&n.initializer.expression.getText(aggregateAst)==='Proxy');assert.equal(proxies.length,1);
const handler=proxies[0].initializer.arguments[1];
function aggregate(renderers,providerOrder){return new Proxy({},expression(handler.getText(aggregateAst),{renderers,providerOrder}));}
const mainAst=await parse('src/safety/main.ts');
const snapshots=collect(mainAst,n=>ts.isPropertyAssignment(n)&&n.name.getText(mainAst)==='snapshot'&&ts.isArrowFunction(n.initializer)&&n.initializer.getText(mainAst).includes('nativeVertices:'));assert.equal(snapshots.length,1);
const managerAst=await parse('src/safety/dedicated-reichstag-manager.ts');
const managerFn=name=>{const nodes=collect(managerAst,n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(nodes.length,1);return nodes[0].getText(managerAst);};

test('all providers expose current packed vertices through replace, empty commit and destruction',()=>{
 // Execute production packing/clear assignments at their state boundary, not
 // the full renderer or geometry-validation pipeline.
 for(const [provider,m]of models){
  assert.equal(m.api.residentVertexCount,0,provider);m.pack(3);assert.equal(m.api.residentVertexCount,3);
  const old=m.env.sceneChunks;m.pack(12);assert.notEqual(m.env.sceneChunks,old);assert.equal(m.api.residentVertexCount,vertexRows(m));assert.equal(stateRows(m),m.api.residentVertexCount);
  for(const c of m.env.sceneChunks){const base=c.cpu.value.initialState??c.cpu.value.baseState;assert.notEqual(m.stateOf(c).buffer,base.buffer,`${provider}: owner state is a copy of the packed base`);m.stateOf(c).fill(2.5);assert.equal(base.every(v=>v===0),true,`${provider}: selection/growth writes never mutate the packed base`);}assert.equal(m.api.residentVertexCount,12,'selection/growth values do not change vertex accounting');
  m.pack(0);assert.equal(m.api.residentVertexCount,0);assert.equal(stateRows(m),0);m.pack(2);assert.equal(stateRows(m),2);m.clear();assert.equal(m.api.residentVertexCount,0);assert.deepEqual(m.env.sceneChunks,[]);assert.equal(stateRows(m),0);
 }
});

test('aggregate resident count updates immediately without full diagnostics',()=>{
 const renderers=new Map(providers.map(p=>[p,models.get(p).api])),renderer=aggregate(renderers,providers);
 assert.equal(renderer.residentVertexCount,0);
 for(let i=0;i<providers.length;i++)models.get(providers[i]).pack(i+1);
 assert.equal(renderer.residentVertexCount,28);models.get('city').pack(50);assert.equal(renderer.residentVertexCount,73);
 models.get('delegated500').pack(0);assert.equal(renderer.residentVertexCount,71);
 renderers.delete('bremen');assert.equal(renderer.residentVertexCount,64);
 for(const m of models.values())m.clear();assert.equal(renderer.residentVertexCount,0);
});

test('dedicated snapshot avoids stats and preserves exact vertex budget and eligibility',()=>{
 const combined=aggregate(new Map(providers.map(p=>[p,models.get(p).api])),providers);
 let mobile=true,display={visible:true,growth:1,selected:false,opacity:1};
 const identity={objectId:'fixture-object',partId:'fixture-part'},binding={city:'berlin',...identity,sourcePBF:'source',boundarySHA:'boundary',nativeLeafSHA:'leaf'};
 const renderer={get residentVertexCount(){return combined.residentVertexCount;},get stats(){throw Error('snapshot must not read aggregate stats');},getRevision:()=>({generation:7,viewRevision:2}),getComponentDisplayState(owner){assert.equal(owner,identity);return display;}};
 const snapshot=expression(snapshots[0].initializer.getText(mainAst),{threeDimensional:{renderer,mode:'3d',getSourceBinding:()=>binding},currentCity:'berlin',module:{REICHSTAG_OWNER:identity},matchMedia:()=>({matches:mobile})});
 const flags={destroyed:false,hidden:false,suspended:false,moving:false};const eligible=expression(managerFn('eligible'),flags),budget=expression(managerFn('budget'),{});
 for(const [isMobile,limit]of [[true,100000],[false,200000]]){
  mobile=isMobile;models.get('root500').pack(limit-29550);
  const atLimit=snapshot();assert.equal(atLimit.nativeVertices,limit-29550);assert.equal(atLimit.vertexLimit,limit);assert.equal(atLimit.generation,7);assert.equal(atLimit.display,display);assert.deepEqual(atLimit.binding,binding);assert.equal(eligible(atLimit),true);assert.equal(budget(atLimit),true);
  models.get('root500').pack(limit-29549);assert.equal(budget(snapshot()),false);
 }
 models.get('root500').pack(0);assert.equal(snapshot().nativeVertices,0);assert.equal(budget(snapshot()),true);
 for(const field of ['destroyed','hidden','suspended','moving']){flags[field]=true;assert.equal(eligible(snapshot()),false);flags[field]=false;}
 display={...display,visible:false};assert.equal(eligible(snapshot()),false);
});

test('aggregate diagnostic reads each provider once and keeps city/fallback selection',()=>{
 const calls=new Map(),values={root500:{marker:'root',components:1,vertices:10},delegated500:{marker:'delegated',components:2,vertices:20},city:{marker:'city',components:3,vertices:30}};
 const renderers=new Map(['delegated500','root500','city'].map(p=>[p,{get stats(){calls.set(p,(calls.get(p)??0)+1);return values[p];}}]));
 const renderer=aggregate(renderers,['root500','delegated500','city']);
 const first=renderer.stats;assert.equal(first.marker,'city');assert.equal(first.components,6);assert.equal(first.vertices,60);assert.deepEqual(Object.keys(first.paintProviders),['delegated500','root500','city']);
 for(const p of renderers.keys()){assert.equal(calls.get(p),1);assert.equal(first.paintProviders[p],values[p]);}
 renderers.delete('city');calls.clear();values.root500.vertices=11;
 const second=renderer.stats;assert.equal(second.marker,'root','provider order remains fallback before city is installed');assert.equal(second.vertices,31,'no cross-frame cache');
 for(const p of renderers.keys())assert.equal(calls.get(p),1);
 assert.deepEqual(aggregate(new Map(),providers).stats,{components:0,vertices:0,paintProviders:{}});
});
