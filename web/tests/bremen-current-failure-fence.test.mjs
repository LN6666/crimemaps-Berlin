import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const path=new URL('../src/painted/bremen/safety/three-dimensional-map.ts',import.meta.url);
const source=ts.createSourceFile(path.pathname,fs.readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);
let declaration;
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='drawn')declaration=node;ts.forEachChild(node,visit);}
visit(source);
assert(declaration,'The production manager must define its draw-readiness boundary');
const code=ts.transpileModule('export '+declaration.getText(source),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;

function fixture(state,generation=1){
 let options,reads=0,generationReads=0;
 const renderer={getDrawReadiness(){reads++;return state;},getRevision(){generationReads++;return{generation};}};
 const exports={};
 new Function('exports','map','renderer','current','waitForResidentDraw','let drawReadiness;\n'+code)(exports,{},renderer,()=>{},value=>{options=value;return Promise.resolve();});
 return{
  async inspect(target){await exports.drawn(new AbortController().signal,1,target);return options.renderer().getDrawReadiness();},
  get reads(){return reads;},get generationReads(){return generationReads;},
 };
}

test('unregistered or superseded requests do not expose an old renderer failure',async()=>{
 for(const target of [{registered:false,current:()=>true,generation:2},{registered:true,current:()=>false,generation:2}]){
  const f=fixture({ready:false,preparing:false,failure:'old request failure'});
  assert.deepEqual(await f.inspect(target),{ready:false,preparing:true});
  assert.equal(f.reads,0);assert.equal(f.generationReads,0);
 }
});

test('a current registered candidate failure survives an unpublished generation',async()=>{
 const state={ready:false,preparing:false,failure:'c121 original paint requires a prepared FrozenDataScope'},f=fixture(state,0);
 assert.strictEqual(await f.inspect({registered:true,current:()=>true,generation:1}),state);
 assert.equal(f.reads,1);assert.equal(f.generationReads,0,'the failure must be returned before inspecting generation');
});

test('without failure only the target generation can report ready',async()=>{
 const state={ready:true,preparing:false};
 const pending=fixture(state,1);
 assert.deepEqual(await pending.inspect({registered:true,current:()=>true,generation:2}),{ready:false,preparing:true});
 assert.equal(pending.reads,1);
 const published=fixture(state,2);
 assert.strictEqual(await published.inspect({registered:true,current:()=>true,generation:2}),state);
});
