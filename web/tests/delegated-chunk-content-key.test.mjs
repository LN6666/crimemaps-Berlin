import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {resourceContentKey,decodeResourceContentKey} from './support/resource-content-key.mjs';

const root='painted/delegated500/safety/';
function expression(file,name,predicate=()=>true){
 const text=fs.readFileSync(new URL('../src/'+root+file,import.meta.url),'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),matches=[];
 function visit(node){
  if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name&&node.initializer&&predicate(node.initializer.getText(ast)))matches.push(node.initializer.getText(ast));
  if(ts.isFunctionDeclaration(node)&&node.name?.text===name)matches.push(node.getText(ast).replace(/^export\s+/,''));
  ts.forEachChild(node,visit);
 }visit(ast);assert.equal(matches.length,1,name+' actual production declaration');
 return bindings=>Function(...Object.keys(bindings),'return '+ts.transpileModule('('+matches[0]+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)(...Object.values(bindings));
}
const delegatedContributorAuthority=expression('building-mesh-renderer.ts','delegatedContributorAuthority')({});
const recipe=expression('building-mesh-renderer.ts','recipeAuthority',s=>s.includes('delegated500-complete-source-candidates'));
const group=expression('building-mesh-renderer.ts','group',s=>s.includes('contextComponents')&&s.includes('sourceKeys:'));
const packed=expression('renderer-packed-chunks.ts','packedChunkContentKey')({resourceContentKey});
const packedCall=expression('building-mesh-renderer.ts','contentKey',s=>s.startsWith("packedChunkContentKey('delegated500:'"));
const layout='position9-paint5-progressive4-state1-source-flags-v1';
function fixture(size=32){
 const parentA={name:'parent-a'},parentB={name:'parent-b'},quoted=JSON.stringify(['source',('"\\:|☀').repeat(size)]);
 const source={contentKey:quoted,recipeAuthority:JSON.stringify(['recipe',quoted]),materialAuthority:'material',frame:{authority:'frame',origin:[7.0,51.0],unit:25000000},parents:[parentA],components:[]};
 const components=[{objectId:'osm/way/1',partId:'part',displayEstimates:{F231:true}}];source.components=components;
 const contributors=[source,{...source,contentKey:quoted+'other',parents:[parentB]}];
 return{resourceContentKey,delegatedContributorAuthority,selectedGroup:{source,components},sourceContext:{authority:['source-context','revision']},contributors,contextComponents:components,flags:[true,false],omittedBatches:[['osm/way/1|part',[2,4]]],activeMasks:['mask-v1']};
}
function run(input){const recipeAuthority=recipe(input),built=group({...input,recipeAuthority}),packingSource={...input.selectedGroup.source,recipeAuthority};return{recipeAuthority,built,packingSource,key:packedCall({...input,recipeAuthority,group:built,city:'cologne',packedChunkContentKey:packed})};}
function legacy(input){const {selectedGroup,sourceContext,contributors,flags,omittedBatches,activeMasks}=input;
 const authority=JSON.stringify([selectedGroup.source.recipeAuthority,'delegated500-complete-source-candidates-v1',sourceContext.authority,contributors.map(s=>[s.contentKey,s.recipeAuthority,s.materialAuthority]),flags,omittedBatches,activeMasks,selectedGroup.components.some(c=>!!c.displayEstimates?.F231)?'F231-verified-display':'source-geometry']);
 const s={...selectedGroup.source,contentKey:JSON.stringify([selectedGroup.source.contentKey,authority]),recipeAuthority:authority};
 return JSON.stringify(['delegated500:cologne','packed-v2',s.contentKey,s.recipeAuthority,s.materialAuthority,s.frame.authority,s.frame.origin,s.frame.unit,'layout-v1']);
}
test('actual delegated construction retains full recipe inputs, source ordering, frames and parent grants',()=>{
 const input=fixture(),out=run(input),s=input.selectedGroup.source;
 assert.deepEqual(decodeResourceContentKey(out.recipeAuthority),['delegated500-recipe-v3',s.recipeAuthority,'delegated500-complete-source-candidates-v1',input.sourceContext.authority,delegatedContributorAuthority(input.contributors),input.flags,input.omittedBatches,input.activeMasks,'F231-verified-display']);
 assert.strictEqual(out.built.components,input.selectedGroup.components);assert.strictEqual(out.built.contextComponents,input.contextComponents);assert.strictEqual(out.built.source.frame,s.frame);
 assert.deepEqual(out.built.source.sourceKeys,[s.contentKey]);assert.strictEqual(out.built.source.parents[0],s.parents[0]);assert.strictEqual(out.built.source.parents[1],input.contributors[1].parents[0]);
 assert.deepEqual(decodeResourceContentKey(out.built.source.contentKey),['delegated500-source-group-v2',s.contentKey,out.recipeAuthority]);
 assert.deepEqual(decodeResourceContentKey(out.key),['packed-chunk-v3','delegated500:cologne',s.contentKey,out.recipeAuthority,s.materialAuthority,s.frame.authority,s.frame.origin,s.frame.unit,layout]);
 const keys=input.contributors.map(c=>c.contentKey);run(input);assert.deepEqual(input.contributors.map(c=>c.contentKey),keys);assert.equal(run(input).key,out.key);
});
test('actual delegated recipe and packed keys distinguish every rendering authority',()=>{
 const baseline=run(fixture()).key;
 for(const mutate of [x=>x.selectedGroup.source.contentKey+='!',x=>x.selectedGroup.source.recipeAuthority+='!',x=>x.sourceContext.authority.push('revision2'),x=>x.contributors.reverse(),x=>x.contributors[1].materialAuthority+='!',x=>x.contributors[1].recipeAuthority+='!',x=>x.contributors[1].contentKey+='!',x=>x.flags[0]=false,x=>x.omittedBatches[0][1].push(3),x=>x.activeMasks.push('mask2'),x=>delete x.selectedGroup.components[0].displayEstimates.F231,x=>x.selectedGroup.source.frame.origin[0]+=.1,x=>x.selectedGroup.source.frame.unit+=1,x=>x.selectedGroup.source.frame.authority+='!',x=>x.selectedGroup.source.materialAuthority+='!']){
  const input=fixture();mutate(input);assert.notEqual(run(input).key,baseline);
 }
 const {packingSource,key}=run(fixture());assert.equal(packed('delegated500:cologne',packingSource,layout),key);assert.notEqual(packed('church:cologne',packingSource,layout),key);assert.notEqual(packed('delegated500:dortmund',packingSource,layout),key);assert.notEqual(packed('delegated500:cologne',packingSource,layout+':next'),key);
});
test('actual delegated nested key growth avoids repeated escaping of opaque quoted parents',()=>{
 const small=run(fixture(1000)).key,large=run(fixture(2000)).key;
 assert(large.length<small.length*2);assert(large.length<legacy(fixture(2000)).length/2);
 assert.deepEqual(decodeResourceContentKey(large)[0],'packed-chunk-v3');
});

test('actual delegated call encodes the complete context recipe once and reconstructs the derived group identity',()=>{
 const input=fixture(2000),out=run(input),decoded=decodeResourceContentKey(out.key);
 assert.equal(out.key.split(out.recipeAuthority).length-1,1);
 assert.equal(resourceContentKey('delegated500-source-group-v2',decoded[2],decoded[3]),out.built.source.contentKey);
 const duplicated=packed('delegated500:cologne',out.built.source,layout);
 assert(duplicated.length-out.key.length>=out.recipeAuthority.length,'the actual packed key removes at least one complete recipe, even when that recipe is compressed');
});

test('shortened packed identity preserves actual publication cohort membership',()=>{
 const input=fixture(),out=run(input);
 const cohorts=expression('../../../safety/renderer-chunk-input.ts','rendererChunkPublicationCohorts')({});
 const source=input.selectedGroup.source;
 const bindings={groups:[source],cohorts:[{key:'joined-source',authority:'reviewed-source',members:[source.contentKey]}]};
 const allocationKey=out.key+':gpu-binding-v2:owner';
 assert.deepEqual(cohorts(bindings,[{source:out.built.source,contentKey:allocationKey}]),[{key:'joined-source',members:[allocationKey]}]);
 assert.throws(()=>cohorts({...bindings,cohorts:[{key:'missing',authority:'reviewed-source',members:['unknown-source']}]},[{source:out.built.source,contentKey:allocationKey}]),/Incomplete renderer publication source cohort/);
});

const shadowKey=expression('building-mesh-renderer.ts','delegatedShadowKey')({resourceContentKey});
function shadowParents(key){
 const [namespace,base,...parents]=decodeResourceContentKey(key);assert.equal(namespace,'delegated-shadow-v4');
 return parents.map(([tag,value])=>tag==='suffix'?base+value:value);
}
test('shadow identity reconstructs both complete parents without duplicating the packed identity',()=>{
 const base=run(fixture(2000)).key;
 for(const indices of [undefined,base+':shadow-indices:0:6,12:24']){
  const chunk={contentKey:base,geometry:{contentKey:base+':gpu-binding-v2:owner'},shadowCPU:indices===undefined?undefined:{contentKey:indices}};
  const key=shadowKey(chunk),parents=[chunk.geometry.contentKey,indices??base+':indices-full'];
  assert.deepEqual(shadowParents(key),parents);
  assert.equal(key.split(base).length-1,1);
  assert(key.length<JSON.stringify(['delegated-shadow-v3',...parents]).length*.55);
  assert.equal(shadowKey(chunk),key);
 }
});
test('shadow identity separates owner, index range, full-index and unrelated-parent authorities',()=>{
 const base=run(fixture()).key;
 const make=(geometry,indices)=>({contentKey:base,geometry:geometry===undefined?undefined:{contentKey:geometry},shadowCPU:indices===undefined?undefined:{contentKey:indices}});
 const cases=[make(base+':gpu-binding-v2:owner'),make(base+':gpu-binding-v2:other'),make(base+':gpu-binding-v2:owner',base+':shadow-indices:0:6'),make(base+':gpu-binding-v2:owner',base+':shadow-indices:6:12'),make('unrelated-geometry','unrelated-indices'),make(undefined),make(''),make(base),make('suffix','full')];
 const keys=cases.map(shadowKey);assert.equal(new Set(keys).size,cases.length);
 for(let i=0;i<cases.length;i++)assert.deepEqual(shadowParents(keys[i]),[cases[i].geometry?.contentKey??null,cases[i].shadowCPU?.contentKey??base+':indices-full']);
 const other={...cases[0],contentKey:base+'changed'};assert.notEqual(shadowKey(other),keys[0]);assert.deepEqual(shadowParents(shadowKey(other)),[cases[0].geometry.contentKey,other.contentKey+':indices-full']);
});

function restoreContributors(encoded){
 assert.equal(encoded[0],'delegated-contributors-prefix-v1');
 const columns=encoded.slice(1).map(column=>{let previous='';return column.map(([prefix,suffix])=>{assert(prefix<=previous.length);return previous=previous.slice(0,prefix)+suffix;});});
 return columns[0].map((_,i)=>columns.map(column=>column[i]));
}
test('contributor prefix coding reconstructs all ordered authorities including UTF16 and empty values',()=>{
 const rows=['','a','a\"\\☀','a\"\\☀ next','😀','😁','\ud800','\ud801','z'].map((value,i)=>({contentKey:value,recipeAuthority:'compiler:'+value,materialAuthority:String(i%3)}));
 const before=structuredClone(rows),encoded=delegatedContributorAuthority(rows);
 assert.deepEqual(restoreContributors(encoded),rows.map(r=>[r.contentKey,r.recipeAuthority,r.materialAuthority]));
 assert.deepEqual(rows,before);assert.deepEqual(restoreContributors(delegatedContributorAuthority([])),[]);
 assert.notDeepEqual(delegatedContributorAuthority(rows.toReversed()),encoded);
});
test('shared contributor prefixes reduce real recipe encoding without dropping revision authority',()=>{
 const input=fixture(),shared='verified-source:'+('abcdef0123456789'.repeat(50));
 input.contributors=Array.from({length:80},(_,i)=>({...input.selectedGroup.source,contentKey:shared+':leaf:'+i,recipeAuthority:'compiler:'+shared+':recipe:'+i,materialAuthority:'material:'+i}));
 const encoded=delegatedContributorAuthority(input.contributors);
 assert.deepEqual(restoreContributors(encoded),input.contributors.map(r=>[r.contentKey,r.recipeAuthority,r.materialAuthority]));
 assert(resourceContentKey('contributors',encoded).length<resourceContentKey('contributors',input.contributors.map(r=>[r.contentKey,r.recipeAuthority,r.materialAuthority])).length*.15);
 const key=run(input).key;input.contributors[41].recipeAuthority+='revision';assert.notEqual(run(input).key,key);
});
