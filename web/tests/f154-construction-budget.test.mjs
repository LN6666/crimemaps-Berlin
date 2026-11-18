import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';
import {RENDERER_RUNTIME_MODULES,RENDERER_RUNTIME_DEPENDENCIES} from './support/fixtures-managers-b-renderer-runtime.mjs';
import {loadF154Construction,f154Signature} from './support/f154-construction-boundary.mjs';

const runtime=createSourceModules({allow:id=>['safety/frozen-data-scope',...RENDERER_RUNTIME_MODULES,...RENDERER_RUNTIME_DEPENDENCIES].includes(id)});
const {createFrozenDataScope}=runtime.load('safety/frozen-data-scope'),{createChunkResourceStore}=runtime.load('safety/render-runtime/chunk-resource-store'),{createResourceBudget}=runtime.load('safety/render-runtime/resource-budget');
function fixture(limitBytes=2**20){
 const budget=createResourceBudget({limitBytes}),store=createChunkResourceStore({budget});
 const base=createFrozenDataScope({resources:store,async acquire(){throw Error('No frozen data asset is needed for this local F154 boundary');}}),memoValues=[],estimates=[];
 const scope={...base,get stats(){return base.stats;},memo(key,create,estimate){if(estimate!==undefined)estimates.push(estimate);return base.memo(key,()=>{const value=create();if(value&&'batches'in value)memoValues.push(value);return value;},estimate);}};
 const signatures={nativePaintSignature:source=>source.fixtureSignature??f154Signature.nativePaintSignature(source)},owner=loadF154Construction(signatures);
 return{budget,store,scope,owner,memoValues,estimates,close(){scope.release();store.collectRetired();store.destroy();}};
}
function nativeSource(owner,front=false){
 const identity=front?owner.F154_FRONT_PART:owner.F154_NATIVE_PARTS[0];
 return{city:'frankfurt',objectId:identity.objectId,partId:identity.partId,fixtureSignature:identity.signature,origin:[8.67198,50.116035],componentGeometry:{type:'Polygon',coordinates:[[[0,0],[2,0],[2,2],[0,2],[0,0]]]},sourceFeature:{type:'Feature',geometry:{type:'Polygon',coordinates:[]},properties:{}},batches:[{positions:[0,1,0,2,1,0,2,1,2,0,1,2],normals:[0,1,0,0,1,0,0,1,0,0,1,0],indices:[0,1,2,0,2,3],color:[.1,.2,.3],faceRole:'mixed'}]};
}
const numeric=row=>row.batches.reduce((sum,b)=>sum+b.positions.length+b.normals.length+b.indices.length+b.color.length,0);
const originalOwner=fs.readFileSync(new URL('../src/painted/root500/safety/owner-f154-reconstruction.ts',import.meta.url),'utf8');
function originalReconstruction(owner,source,edges,scope){
 // Invoke the preserved numerical producer itself, independently of the new
 // ownership wrapper, so geometry/order checks cannot mirror a reimplementation.
 const ast=ts.createSourceFile('f154.ts',originalOwner,ts.ScriptTarget.Latest,true),names=['batch','tri','quad','ear','capFromRing','reconstructFrontSteps','nativePartPaint','reconstructF154ComponentUnmemoized'];
 const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text));assert.equal(functions.length,names.length);
 const constants=ast.statements.filter(ts.isVariableStatement).filter(n=>n.declarationList.declarations.some(d=>['origin','SX','SZ','AL','A','B','uv','xyz','__root500Identity_F154'].includes(d.name.getText(ast))));
 const code=ts.transpileModule([...constants,...functions].map(n=>n.getText(ast)).join('\n')+'\nreturn reconstructF154ComponentUnmemoized(source,edges,scope);',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return new Function('source','edges','scope','nativePaintSignature','getRoot500Data','F154_NATIVE_PARTS','F154_FRONT_PART','ownerF154Identity',code)(source,edges,scope,c=>c.fixtureSignature??f154Signature.nativePaintSignature(c),owner.getRoot500Data,owner.F154_NATIVE_PARTS,owner.F154_FRONT_PART,owner.ownerF154Identity);
}
for(const branch of ['native','front','main'])test('F154 '+branch+' admits bounded private arrays and preserves numerical producer output',()=>{
 const f=fixture();try{
  const source=branch==='main'?f.owner.getRoot500Data(f.scope).recovered:nativeSource(f.owner,branch==='front'),edges=branch==='main'?[0,45]:[],before=structuredClone(source),baseline=f.budget.stats.bytes;
  const estimate=f.owner.estimateF154ReconstructionConstruction(source,branch,source.fixtureSignature??f154Signature.nativePaintSignature(source),edges),result=f.owner.reconstructF154Component(source,edges,f.scope);
  assert.equal(result.applied,true);assert.strictEqual(result.sourceOriginal,source);assert.deepEqual(source,before);assert.deepEqual(result,originalReconstruction(f.owner,source,edges,f.scope));assert.equal(f.memoValues.length,1);assert.deepEqual(Object.keys(f.memoValues[0]).sort(),['batches','displayEstimates']);assert.equal(f.budget.stats.bytes-baseline<=estimate,true);
  const cloneNumbers=source.batches.reduce((n,b)=>n+b.positions.length+b.normals.length+b.indices.length+(branch==='main'?b.color.length:3),0),maxAdded=branch==='main'?173*21+5*3:branch==='front'?20*21+3:0;
  assert(numeric(result.component)<=cloneNumbers+maxAdded);assert.deepEqual(f.estimates.at(-1),estimate);
  const reused=f.owner.reconstructF154Component(source,edges,f.scope);assert.strictEqual(reused.component.batches,result.component.batches);assert.strictEqual(reused.component.displayEstimates,result.component.displayEstimates);assert.equal(f.memoValues.length,1,'same scope and true input construct once');
  if(branch==='native'){const sameBytesNewSource=f.owner.reconstructF154Component({...source},edges,f.scope);assert.notStrictEqual(sameBytesNewSource.component.batches,result.component.batches,'true SOURCE object identity is separate even for equal bytes');}
  if(branch==='main'){const changed=f.owner.reconstructF154Component(source,[45,0],f.scope);assert.notStrictEqual(changed.component.batches,result.component.batches,'exact retiredEdges sequence belongs to the private memo identity');assert.deepEqual(changed.component.displayEstimates.F154PhotoEstimate.retiredMainWallEdges,[45,0]);}
 }finally{f.close();}
});

for(const branch of ['native','front','main'])test('F154 '+branch+' budget refusal precedes every Array.from/tri and publishes no partial private memo',()=>{
 const f=fixture(),source=branch==='main'?f.owner.getRoot500Data(f.scope).recovered:nativeSource(f.owner,branch==='front'),edges=branch==='main'?[0,45]:[],baseline=f.budget.stats.bytes,estimate=f.owner.estimateF154ReconstructionConstruction(source,branch,source.fixtureSignature??f154Signature.nativePaintSignature(source),edges),remaining=2**20-baseline-estimate+1;
 assert(remaining>0);const hold=f.budget.reserve({category:'construction',bytes:remaining,precision:'exact'}),original=Array.from;let copied=0;
 try{Array.from=(...args)=>{copied++;return original(...args);};assert.throws(()=>f.owner.reconstructF154Component(source,edges,f.scope),{name:'ResourceBudgetExceededError'});assert.equal(copied,0);assert.equal(f.memoValues.length,0);assert.equal(f.budget.stats.bytes,baseline+remaining);}finally{Array.from=original;hold.release();f.close();}
});

test('F154 retired output remains charged through packed CPU auxiliary ownership and releases on final dispose/cancel',()=>{
 const f=fixture();try{
  const source=nativeSource(f.owner),result=f.owner.reconstructF154Component(source,[],f.scope),charged=f.budget.stats.bytes;
  const release=f.owner.retainF154ReconstructionConstruction(f.scope,[{...result.component,batches:result.component.batches.map(batch=>({...batch}))}]);
  f.owner.retireF154ReconstructionConstruction(f.scope);assert.equal(f.budget.stats.bytes,charged,'a CPU row using private numeric arrays keeps their memo claim');f.scope.release();assert.equal(f.scope.stats.disposed,false);
  release();release();assert.equal(f.scope.stats.disposed,true);assert.equal(f.budget.stats.bytes,0,'last auxiliary owner returns its private construction claim');
 }finally{f.close();}
 const cancelled=fixture();try{cancelled.owner.reconstructF154Component(nativeSource(cancelled.owner),[],cancelled.scope);assert(cancelled.budget.stats.bytes>0);cancelled.scope.release();assert.equal(cancelled.budget.stats.bytes,0,'an abandoned preparation with no packed consumer drains its memo');}finally{cancelled.close();}
});

function materialBoundary(provider,bindings){
 const text=fs.readFileSync(new URL(`../src/painted/${provider}/safety/building-mesh-renderer.ts`,import.meta.url),'utf8'),ast=ts.createSourceFile(provider,text,ts.ScriptTarget.Latest,true),name=provider==='bremen'?'packBremenChunkMaterials':'packChunkMaterials';let material,release;
 const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text===name)material=node.getText(ast);if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='releaseAuxiliary')release='const '+node.getText(ast)+';';ts.forEachChild(node,visit);};visit(ast);assert(material&&release);
 const js=ts.transpileModule(material+'\n'+release+`\nreturn {material:${name},release:releaseAuxiliary};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;return new Function(...Object.keys(bindings),js)(...Object.values(bindings));
}
for(const provider of ['root500','infill','bremen'])test(provider+' F154 material failure and final auxiliary disposal return the actual private memo pin',async()=>{
 const f=fixture();try{
  const component=f.owner.reconstructF154Component(nativeSource(f.owner),[],f.scope).component,fail=()=>{throw Error('controlled material production failure');},boundary=materialBoundary(provider,{committingScope:undefined,retainF154ReconstructionConstruction:f.owner.retainF154ReconstructionConstruction,ownerCommitStep:(_name,run)=>run(),progressivePaintData:fail,enterBremenDataScope:()=>({}),exitBremenDataScope(){}});
  if(provider==='bremen'){const signal=new AbortController().signal,work={signal,run:async consume=>consume()};await assert.rejects(boundary.material([component],f.scope,[],[],{},work),/controlled material production failure/);}else assert.throws(()=>boundary.material([component],{scope:f.scope}),/controlled material production failure/);assert.equal(f.scope.stats.pins,0,'the producer failure finally releases its acquired F154 pin');
  const release=f.owner.retainF154ReconstructionConstruction(f.scope,[component]),dispose=boundary.release({masks:{release(){throw Error('controlled mask disposal failure');}},releaseF154:release}),charged=f.budget.stats.bytes;
  f.owner.retireF154ReconstructionConstruction(f.scope);f.scope.release();assert.equal(f.budget.stats.bytes,charged);assert.equal(f.scope.stats.disposed,false);
  assert.throws(dispose,/controlled mask disposal failure/);assert.equal(f.scope.stats.disposed,true);assert.equal(f.budget.stats.bytes,0,'even a different auxiliary disposer failure cannot strand the private-array pin');
 }finally{f.close();}
});
