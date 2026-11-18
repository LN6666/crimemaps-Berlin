import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';
import {fileURLToPath} from 'node:url';
import {resourceContentKey} from './support/resource-content-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Exercise the actual scalar content-key function. No model source, renderer,
// GL context, data production or build process is needed for this contract.
function contentKey(provider,manifest){
 const text=fs.readFileSync(new URL('../src/painted/'+provider+'/safety/three-dimensional-map.ts',import.meta.url),'utf8');
 const ast=ts.createSourceFile(provider+'-manager.ts',text,ts.ScriptTarget.Latest,true);let declaration;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='sourceContentKey')declaration=node;ts.forEachChild(node,visit);}visit(ast);
 assert(declaration,'the actual manager declares its source/detail content identity');
 const code=ts.transpileModule(declaration.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return Function('resourceContentKey','city','manifestSHA','manifest',code+'\nreturn sourceContentKey;')(resourceContentKey,'bremen','a'.repeat(64),manifest);
}

for(const provider of ['city','tier300','church','delegated500'])test(provider+': source/detail content identity survives request changes and separates real geometry authority',()=>{
 const manifest={source_pbf_sha256:'b'.repeat(64),city_boundary:{sha256:'c'.repeat(64)},compiler_sha256:'d'.repeat(64),source_snapshot:'approved-snapshot'};
 const leaf={id:'leaf',tile_key:'stable-tile',lod:1,sha256:'e'.repeat(64),bytes:128,path:'/safety/buildings3d/leaf.json'};
 const key=contentKey(provider,manifest),baseline=key(leaf);
 assert.equal(key({...leaf,requestId:2,viewRevision:3,generation:4,contextEpoch:5}),baseline,'view/request/GPU incarnation do not change verified CPU content identity');
 assert.equal(key({...leaf,path:'/safety/buildings3d/same-hash-alias.json'}),baseline,'a transport alias is not a new verified payload');
 assert.notEqual(key({...leaf,sha256:'f'.repeat(64)}),baseline);
 assert.notEqual(key({...leaf,lod:2}),baseline,'different actual geometry LOD is distinct');
 const aliased=contentKey(provider,{...manifest,actual_geometry_lod:1});
 assert.equal(aliased({...leaf,lod:2}),aliased(leaf),'a declared geometry alias does not invent a second real LOD');
 const resource={key:'request-label',level:'mid',geometrySHA256:'1'.repeat(64),descriptor:{sha256:'2'.repeat(64),bytes:96,compression:'gzip',uncompressed_sha256:'3'.repeat(64),uncompressed_bytes:512},bindings:{materialSHA256:'4'.repeat(64),producerSHA256:'5'.repeat(64),protectionSHA256:'6'.repeat(64),sourceEquivalenceSHA256:'7'.repeat(64)}};
 const selected=key(leaf,{resource});
 assert.equal(key(leaf,{resource:{...resource,key:'another-consumer-label'}}),selected);
 for(const field of ['materialSHA256','producerSHA256','protectionSHA256','sourceEquivalenceSHA256'])assert.notEqual(key(leaf,{resource:{...resource,bindings:{...resource.bindings,[field]:'8'.repeat(64)}}}),selected,field+' is part of selected source authority');
 assert.notEqual(key(leaf,{resource:{...resource,geometrySHA256:'9'.repeat(64)}}),selected);
 assert.notEqual(key(leaf,{resource:{...resource,maxErrorM:.125}}),selected,'quality error authority changes derived resource metadata without becoming a view ID');
 assert.notEqual(key(leaf,{resource:{...resource,groupMetadata:{sha256:'9'.repeat(64),bytes:512}}}),selected,'verified group metadata is part of derived source authority');
 assert.notEqual(contentKey(provider,{...manifest,compiler_sha256:'0'.repeat(64)})(leaf),baseline);
});

function chunkInput(provider,store){
 const text=fs.readFileSync(new URL('../src/painted/'+provider+'/safety/three-dimensional-map.ts',import.meta.url),'utf8');
 const ast=ts.createSourceFile(provider+'-manager.ts',text,ts.ScriptTarget.Latest,true);let declaration;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='sourceChunkInput')declaration=node;ts.forEachChild(node,visit);}visit(ast);
 assert(declaration,'actual manager provides its source-authorized renderer input');
 const code=ts.transpileModule(declaration.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return Function('resourceContentKey','resourceStore','manifestSHA','manifest',code+'\nreturn sourceChunkInput;')(resourceContentKey,store,'a'.repeat(64),{compiler_sha256:'b'.repeat(64)});
}

for(const provider of ['city','tier300','church','delegated500'])test(provider+': renderer groups retain source parents and use verified source frames without certifying cross-leaf closure',()=>{
 const store={},bind=chunkInput(provider,store);
 const a={objectId:'object-a',partId:'part-a',origin:[13,52],sourceFeature:{}},b={objectId:'object-b',partId:'part-b',origin:[14,53],sourceFeature:{}};
 const source={components:[a,b],contentKey:'closed-native-source-authority',selectedLOD:'mid',materialAuthority:'material-sha',recipeAuthority:'producer-sha',groups:{key:'group-document-sha',coordinateFrame:{schema:'source-local-mercator-meters-v1'},packingGroups:[{key:'pack-a',geometryRole:'canonical',componentIndices:[0],anchor:[13,52],authority:{canonicalLeafSHA256:'leaf-sha'}},{key:'pack-b',geometryRole:'canonical',componentIndices:[1],anchor:[14,53],authority:{canonicalLeafSHA256:'leaf-sha'}}],publicationConstraints:[{completeAcrossLeaves:false,closure:'requires-runtime-cohort',mayPublishIndependently:false}]}};
 // Only value and identity are read by this pure binding function; readiness,
 // lease acquisition and GPU publication remain production-store concerns.
 const parent={contentKey:'provider-private-owner-1',value:source};
 const result=bind([a,b],[parent]);assert.equal(result.store,store);assert.equal(result.groups.length,2);
 assert.deepEqual(result.groups.map(group=>group.frame.origin),[[13,52],[14,53]]);
 assert.equal(result.groups[0].frame.unit,2*Math.PI*6378137*Math.cos(52*Math.PI/180));
 for(const group of result.groups){assert.deepEqual(group.parents,[parent]);assert.equal(group.selectedLOD,'canonical');assert.equal(group.materialAuthority,'material-sha');assert.match(group.recipeAuthority,/verified-group-recipe-v1/);}
 assert.deepEqual(result.cohorts[0].members,[...result.groups.map(group=>group.contentKey)].sort());
 assert.equal('completeAcrossLeaves' in result.cohorts[0],false,'existing manager publication boundary does not manufacture producer closure proof');
 const oneVisible=bind([a],[{...parent,value:{...source,groups:undefined}}]);assert.deepEqual(oneVisible.groups[0].components,[a,b],'viewport membership never narrows a complete physical full-leaf group');
 assert.equal(oneVisible.groups[0].contentKey,bind([a,b],[{...parent,value:{...source,groups:undefined}}]).groups[0].contentKey,'camera subset cannot change complete physical content identity');
 const anotherOwner={contentKey:'provider-private-owner-2',value:source};
 assert.deepEqual(bind([a,b],[anotherOwner]).groups.map(group=>group.contentKey),result.groups.map(group=>group.contentKey),'private owner namespace cannot become physical content identity');
 const anotherLevel={value:{...source,selectedLOD:'coarse',contentKey:'another-whole-level-descriptor',recipeAuthority:'another-whole-level-producer'}};
 assert.deepEqual(bind([a,b],[anotherLevel]).groups.map(group=>group.contentKey),result.groups.map(group=>group.contentKey),'verified canonical physical groups survive descriptor/whole-level changes');
 const fullLeaf=bind([a,b],[{value:{...source,groups:undefined}}]);assert.equal(fullLeaf.groups.length,1);assert.deepEqual(fullLeaf.groups[0].frame.origin,a.origin,'legacy full leaf frame comes from its source, never a moving camera');
 const approved={...a,displaySupplement:{id:'approved-source-display-v2',sourceObjectId:a.objectId,addedVertices:3,addedTriangles:1}};
 const withSupplement=bind([approved],[{...parent,value:{...source,packingComponents:[approved,b]}}]);assert.equal(withSupplement.groups[0].parents.length,1);assert.notEqual(withSupplement.groups[0].contentKey,result.groups[0].contentKey,'actual source display recipe remains in physical identity');
 const unknown={objectId:'unknown-derived',partId:'supplement',origin:[15,54],sourceFeature:{}};
 assert.throws(()=>bind([a,unknown],[parent]),/Unbound source-derived component authority/,'unknown derived rows cannot borrow arbitrary wanted authority or anchor');
});

function selectedRetainer(provider,leases){
 const text=fs.readFileSync(new URL('../src/painted/'+provider+'/safety/three-dimensional-map.ts',import.meta.url),'utf8'),ast=ts.createSourceFile(provider+'-manager.ts',text,ts.ScriptTarget.Latest,true);let declaration;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='retainSelectedSource')declaration=node;ts.forEachChild(node,visit);}visit(ast);assert(declaration);
 const code=ts.transpileModule(declaration.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 // This test exercises the canonical SOURCE fallback with no published renderer.
 return Function('renderer','mainSourceLeases',code+'\nreturn retainSelectedSource;')(undefined,leases);
}

test('source wanted leases: explicit Retry reacquires a failed same key without automatic retry or retiring a retained main role',async()=>{
 const runtime=createRuntimeLoader();
 const {createResourceBudget}=runtime.resourceBudget,{createChunkResourceStore}=runtime.chunkResourceStore;
 const {createWantedResourceLeases}=runtime.load(fileURLToPath(new URL('../src/safety/viewport-request.ts',import.meta.url)));
 const store=createChunkResourceStore({budget:createResourceBudget({limitBytes:4096,recentLimitBytes:0}),recentMaxEntries:0,recentMaxIdleMs:0});
 const original=new Error('actual controlled source admission failure');let attempts=0,disposed=0;
 const wanted=createWantedResourceLeases({key:descriptor=>descriptor.key,acquire:descriptor=>store.acquire({contentKey:descriptor.key,role:'source',allowRecent:false,estimate:{category:'metadata',bytes:32,precision:'exact'},produce(){attempts++;if(attempts===1)throw original;return {verifiedSource:'same-closed-content',contentKey:'closed-source',components:[{objectId:'canonical-object',partId:'canonical-part'}],selectedResource:{level:'near'}};},dispose(){disposed++;}})});
 try{
  wanted.reconcile([{key:'closed-source'}]);await assert.rejects(wanted.value('closed-source'),error=>error.message===original.message&&error.name===original.name);assert.equal(attempts,1);
  await assert.rejects(wanted.value('closed-source'),error=>error.message===original.message&&error.name===original.name);assert.equal(attempts,1,'reading failure cannot spin production retries');
  wanted.reconcile([{key:'closed-source'}]);const value=await wanted.value('closed-source');assert.equal(attempts,2,'explicit same-key demand retries the terminal lease');assert.equal(value.verifiedSource,'same-closed-content');
  const main=wanted.retain('closed-source','main');wanted.reconcile([]);assert.deepEqual(wanted.keys,[]);assert.equal(main.value,value,'retiring only wanted demand preserves the actual main consumer');assert.equal(disposed,0);
  const selectedPins=[];for(const provider of ['city','tier300','church','delegated500']){const retain=selectedRetainer(provider,[main]);assert.equal(retain({objectId:'missing',partId:'missing'}),undefined);const pin=retain({objectId:'canonical-object',partId:'canonical-part'});assert.equal(pin.contentKey,'closed-source');selectedPins.push(pin);value.selectedResource={level:'mid'};assert.throws(()=>retain({objectId:'canonical-object',partId:'canonical-part'}),/not canonical/);value.selectedResource={level:'near'};}
  main.release();assert.equal(disposed,0,'selected canonical sources outlive the old main view');for(const pin of selectedPins){pin.release();pin.release();}assert.equal(disposed,1);assert.equal(store.stats.resources,0,'last role disposes the successful source exactly once');
 }finally{wanted.destroy();store.destroy();}
});
