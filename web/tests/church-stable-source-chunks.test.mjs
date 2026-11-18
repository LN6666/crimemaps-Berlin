import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';

const web=fileURLToPath(new URL('../',import.meta.url)),runtime=createRuntimeLoader(web);
const packed=runtime.load(path.join(web,'src/painted/delegated500/safety/renderer-packed-chunks.ts'));
const chunks=runtime.load(path.join(web,'src/safety/renderer-chunk-input.ts'));
const {exactNativePartDisplay}=runtime.load(path.join(web,'src/painted/church/safety/source-part-display.ts'));
const key=row=>row.objectId+'|'+row.partId;
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function production(names){
 const text=fs.readFileSync(new URL('../src/painted/church/safety/building-mesh-renderer.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('church',text,ts.ScriptTarget.Latest,true),found=new Map();
 function visit(node){if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))found.set(node.name.text,node.getText(ast));ts.forEachChild(node,visit);}visit(ast);
 for(const name of names)assert(found.has(name),name+' exists in current renderer');
 return names.map(name=>found.get(name)).join('\n');
}
function component(id,properties={}){
 return{city:'berlin',objectId:'osm/way/'+id,partId:'osm/way/'+id+'/component/same-footprint',origin:[0,0],sourceFeature:{type:'Feature',properties},componentGeometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[0,1],[0,0]]]},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.2,.3,.4],faceRole:'wall'}]};
}
function fixture(rows){
 const {store,budget}=runtime.createPageResources({limitBytes:1024*1024}),bindings=[],productions=[],draws=[];
 const input={store,groups:[{contentKey:'verified-leaf:stable-full-members',components:rows,parents:[],frame:{origin:[0,0],unit:1,authority:'verified-fixed-frame'},cohortKeys:[],materialAuthority:'original-material',recipeAuthority:'original-recipe',selectedLOD:'canonical'}],cohorts:[]};
 const makeMasks=()=>({configure(){},destroy(){},cpuRecipe(){
  const recipe={costs:[],masks:[{preferred:rows.at(-1)}],wordMasks:[{preferred:rows.at(-1)}],release(){},createBinding(visible){const binding={visible:visible.map(key),destroy(){},withResidentMasks(_gl,_p,draw){draw();return true;}};bindings.push(binding);return binding;}};return recipe;
 }});
 const S={...packed,...chunks,key,city:'berlin',id:'church-stable-fixture',destroyed:false,generation:0,viewRevision:0,vertexCap:200000,
  sceneChunks:[],sceneSpans:[],sceneChunkBindings:undefined,packingChunkInput:input,geometryOwner:{store},chunkStateOwner:'one-renderer',chunkStore:store,
  exactNativePartDisplay,acceptPaintComponent:()=>true,validate(){},rathausCoincidentWallFragmentMasks:()=>({masks:[]}),
  createRathausProxyMasks:makeMasks,rathausProxyMasks:makeMasks(),facadePaintData(components){productions.push(components.map(key));return new Float32Array(components.length*15);},
  isFacadeLandmark:c=>c.objectId===rows.at(-1).objectId,isSourceOnlyGlassRoof:()=>false,surfaceStyle:()=>({styleId:3}),merc:p=>p,unit:()=>1,
  queueOnlyProgram:true,paintProgramRuns:()=>[],sceneSunInstant:'fixture',sceneSolarLight:()=>({}),materialAnchor:undefined,materialUnit:1,
  admitShadow(){},updateSolarShadowIndices(){},loaded:new Map(),sourceLoaded:new Map(),nativeGroupPlan:undefined,heldSourceOutlines:[],landmarkVisible:false,
  mainWorldMatrix:identity,activeMainFrame:undefined,gl:{TRIANGLES:1,UNSIGNED_INT:2,bindVertexArray(){},getUniformLocation(){},uniformMatrix4fv(){},uniform1f(){},uniform2f(){},drawElements(_kind,count,_type,offset){draws.push({count,offset});}},
 };
 const names=['churchPackingInput','churchDrawableComponents','buildChurchPackedGroup','packBatches','releasePackedChunks','sceneIndexCount','drawSceneRange','multiply'];
 const js=ts.transpileModule(production(names)+'\nreturn {'+names.join(',')+'};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const scope=new Proxy(S,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,v)=>(o[k]=v,true)}),api=Function('scope','with(scope){'+js+'}')(scope);
 let generation=0;
 function publish(visible){
  const previous=S.sceneChunks,previousBindings=S.sceneChunkBindings,result=api.packBatches(visible,++generation);
  for(const chunk of S.sceneChunks)chunk.geometry={value:{vao:{}}};
  api.releasePackedChunks(previous,previousBindings,new Set(S.sceneChunks.map(chunk=>chunk.masks)));
  draws.length=0;api.drawSceneRange({},0,api.sceneIndexCount());
  return{result,cpu:S.sceneChunks[0].cpu.value,state:S.sceneChunks[0].stateData,masks:S.sceneChunks[0].masks};
 }
 return{S,api,publish,productions,bindings,draws,budget,destroy(){api.releasePackedChunks(S.sceneChunks,S.sceneChunkBindings);store.destroy();}};
}

test('Church A subset → overlapping B → A reuses a complete physical chunk and draws only current rows',()=>{
 const a=component(1),b=component(2),f=fixture([a,b]);
 try{
  const A=f.publish([a]);assert.deepEqual(f.productions,[[key(a),key(b)]]);assert.equal(A.cpu.indices.length,6);assert.equal(f.api.sceneIndexCount(),3);assert.deepEqual(f.draws,[{count:3,offset:0}]);assert.equal(f.S.landmarkVisible,false);assert.deepEqual(A.result.styles,[]);
  const B=f.publish([b,a]);assert.strictEqual(B.cpu,A.cpu);assert.strictEqual(B.state,A.state);assert.deepEqual(f.draws,[{count:3,offset:12},{count:3,offset:0}]);assert.deepEqual([...f.S.loaded.keys()],[key(b),key(a)]);assert.equal(f.api.sceneIndexCount(),6);assert.equal(f.S.landmarkVisible,true);
  const back=f.publish([a]);assert.strictEqual(back.cpu,A.cpu);assert.strictEqual(back.state,A.state);assert.deepEqual(f.draws,[{count:3,offset:0}]);assert.deepEqual([...f.S.sceneChunks[0].loaded.keys()],[key(a)]);assert.equal(f.productions.length,1,'subset changes create no packed replacement');
  assert.notStrictEqual(B.masks,A.masks,'changed preferred visibility replaces only its binding');const again=f.publish([a]);assert.strictEqual(again.masks,back.masks,'unchanged active preferred set keeps its binding');
 }finally{f.destroy();}
});

test('Church keeps an exact native outline fallback in the immutable pack when its part becomes visible',()=>{
 const outline=component(1,{building:'church'}),part=component(2,{'building:part':'yes'}),f=fixture([outline,part]);
 try{
  const A=f.publish([outline]);assert.deepEqual([...f.S.loaded.keys()],[key(outline)]);
  const B=f.publish([outline,part]);assert.strictEqual(B.cpu,A.cpu);assert.deepEqual([...f.S.loaded.keys()],[key(part)],'original exact-native visible admission still hides the redundant outline');assert.deepEqual(f.draws,[{count:3,offset:12}]);
  const back=f.publish([outline]);assert.strictEqual(back.cpu,A.cpu);assert.deepEqual([...f.S.loaded.keys()],[key(outline)]);assert.deepEqual(f.draws,[{count:3,offset:0}]);assert.equal(f.productions.length,1);
 }finally{f.destroy();}
});

test('Church reserves the complete physical source group before its material builder runs',()=>{
 const rows=Array.from({length:40},(_,i)=>component(i+1)),f=fixture(rows);
 const filler=f.budget.reserve({category:'construction',bytes:1024*1024-3000,precision:'exact'});
 try{assert.throws(()=>f.publish([rows[0]]));assert.equal(f.productions.length,0,'a one-row estimate would admit an unbudgeted full-group build');}
 finally{filler.release();f.destroy();}
});
