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
const models=new Map();
for(const provider of providers){
 const ast=await parse(`src/painted/${provider}/safety/building-mesh-renderer.ts`);
 const getters=collect(ast,n=>ts.isGetAccessorDeclaration(n)&&n.name.getText(ast)==='residentVertexCount');assert.equal(getters.length,1,`${provider}: actual public getter`);
 const writes=collect(ast,n=>ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.EqualsToken&&n.left.getText(ast)==='vertices');
 const packed=writes.filter(n=>n.right.getText(ast)==='new Float32Array(count*10)');assert.equal(packed.length,1,`${provider}: production packed commit assignment`);
 const cleared=writes.filter(n=>n.right.getText(ast)==='new Float32Array()');assert.equal(cleared.length,1,`${provider}: production destroy assignment`);
 const env={vertices:new Float32Array(),count:0};const api=expression(`{${getters[0].getText(ast)}}`,env);
 Object.defineProperty(api,'stats',{get(){throw Error(`${provider}: scalar reads must not construct diagnostics`);}});
 models.set(provider,{api,env,pack(count){env.count=count;statement(packed[0].getText(ast),env);},clear(){statement(cleared[0].getText(ast),env);}});
}
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
  const old=m.env.vertices;m.pack(12);assert.notEqual(m.env.vertices,old);assert.equal(m.api.residentVertexCount,m.env.vertices.length/10);
  m.pack(0);assert.equal(m.api.residentVertexCount,0);m.pack(2);m.clear();assert.equal(m.api.residentVertexCount,0);
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
