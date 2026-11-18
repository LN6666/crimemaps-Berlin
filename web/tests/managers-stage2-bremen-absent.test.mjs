import {resourceContentKey} from './support/resource-content-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {src,load,createResourceBudget,createChunkResourceStore} from './support/managers-stage2-ingress.mjs';

// Exercise the actual manager function, adapter, flat source graph and page
// resource store. Numerical producer guards are covered by their existing tests.
const file=src('painted','bremen','safety','three-dimensional-map.ts'),text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
const js=code=>ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
function find(predicate){let found;(function visit(node){if(!found&&predicate(node))found=node;ts.forEachChild(node,visit);})(ast);assert(found);return found;}
const metadata=load(src('painted','bremen','safety','bremen-demand-metadata.ts')),oldtown=load(src('painted','bremen','safety','oldtown70-data.ts'));
const chunks=load(src('safety','renderer-chunk-input.ts')),adapter=load(src('painted','bremen','safety','bremen-display-derivations.ts'));
const functions=['sourceAbsentDisplay','bindDerivedChunkInput'].map(name=>find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name).getText(ast)).join('\n');
const models=metadata.BREMEN_DEMAND_METADATA.oldtown.models,b03d=models.find(model=>model.targetId==='BR-OT-B03D'),b03a=models.find(model=>model.targetId==='BR-OT-B03A'),sourceAuthoritySHA256=metadata.BREMEN_DEMAND_METADATA.oldtown.sourceAuthoritySHA256;
const row=(identity,estimates)=>({city:'bremen',objectId:identity.objectId,partId:identity.partId,origin:[8.807,53.076],sourceFeature:{properties:{}},componentGeometry:{type:'Polygon',coordinates:[]},batches:[],displayEstimates:estimates});
const markers=(model,patch=oldtown.BREMEN_OLDTOWN70_SHA)=>({sourceNativeMeshAbsent:true,sourceRecordSHA256:'a'.repeat(64),sourceAuthoritySHA256,infillBremenOldtown70:{targetId:model.targetId,patchSHA256:patch,sourceAuthoritySHA256}});
const receipts=rows=>rows.filter(row=>row.displayEstimates?.infillBremenOldtown70).map(row=>({objectId:row.objectId,partId:row.partId,sourcePartId:row.partId,patchSHA256:oldtown.BREMEN_OLDTOWN70_SHA}));
function fixture(){
 const store=createChunkResourceStore({budget:createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:0})}),retained=[],resources=[],data={sourceAuthoritySHA256,models:models.map(model=>({...model,sourceBinding:{...model.sourceBinding,sourceRecordSHA256:'a'.repeat(64)}}))};
 const scope={borrow(ref,read){assert.equal(ref.canonicalSHA256,oldtown.BREMEN_OLDTOWN70_SHA);return read(data);},retainResource(ref,role){retained.push([ref,role]);const lease=store.acquire({contentKey:JSON.stringify(['fixture-model-resource',ref]),role,allowRecent:false,estimate:{category:'metadata',bytes:64,precision:'estimate'},produce:()=>({ref}),costs:value=>({category:'metadata',bytes:64,precision:'estimate',identity:value})});resources.push(lease);return lease;}};
 const env={resourceContentKey,sourceAbsentPatches:[],...chunks,...adapter,resources:store,manifest:{compiler_sha256:'c'.repeat(64),source_pbf_sha256:'p'.repeat(64),city_boundary:{sha256:'b'.repeat(64)},source_snapshot:'fixture'},manifestSHA:'i'.repeat(64)};
 const api=Function('env','with(env){'+js(functions)+'\nreturn {bindDerivedChunkInput};}')(new Proxy(env,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:k in globalThis?globalThis[k]:(()=>{throw new ReferenceError('fixture binding '+String(k));})()}));
 const input=source=>({store,groups:source.map((native,index)=>({contentKey:'native-'+index,components:[native],parents:[],frame:chunks.rendererChunkFrame(native.origin,'native-frame'),cohortKeys:[],materialAuthority:'m',recipeAuthority:'r',selectedLOD:'native'})),cohorts:[]});
 const prepared=(source,display)=>{let released=0;const batch={scope,source,stats:{components:receipts(display)},chunkInput:input(source),releaseChunkDependencies(){released++;batch.chunkInput=undefined;},get released(){return released;}};return batch;};
 return{store,scope,retained,resources,api,prepared};
}

test('actual manager binds B03D with its model resource and independently retained renderer input',()=>{
 const f=fixture(),display=row(b03d.displays[0],markers(b03d)),p=f.prepared([],[display]);
 assert.throws(()=>chunks.rendererChunkGroups(p.chunkInput,[display]),/no authoritative chunk ancestry/);
 f.api.bindDerivedChunkInput(p,[display]);assert.equal(p.released,1);assert.ok(p.chunkInput,'binding survives prior batch release clearing its input');
 const group=p.chunkInput.groups[0];assert.deepEqual(group.components,[display]);assert.equal(group.selectedLOD,'explicit-verified-display');assert.equal(group.parents.length,1);assert.ok(group.recipeAuthority.includes(oldtown.BREMEN_OLDTOWN70_SHA));assert.ok(group.recipeAuthority.includes('BR-OT-B03D'));
 assert.deepEqual(f.retained,[[oldtown.BREMEN_OLDTOWN70_DATA_RESOURCE,'dependency']]);assert.equal(f.resources[0].released,true);assert.deepEqual([f.store.stats.resources,f.store.stats.roles],[1,1]);
 const packing=chunks.rendererChunkGroups(p.chunkInput,[display]);assert.equal(chunks.rendererChunkPublicationCohorts(p.chunkInput,[{source:packing[0],contentKey:'packed'}]).length,1);
 p.releaseChunkDependencies();assert.equal(f.store.stats.roles,0);
});

test('actual manager binds B03A all five native members and preserves original visibility order',()=>{
 const f=fixture(),source=b03a.requiredNativeGroup.map(identity=>row(identity)),display=row(b03a.displays[0],markers(b03a)),p=f.prepared(source,[display]);f.api.bindDerivedChunkInput(p,[...source,display]);
 assert.equal(p.chunkInput.groups.length,1);assert.equal(p.chunkInput.groups[0].components.length,6);assert.equal(p.chunkInput.groups[0].sourceKeys.filter(value=>value.startsWith('native-')).length,5);assert.deepEqual(chunks.rendererChunkGroups(p.chunkInput,[display])[0].components,[display]);p.releaseChunkDependencies();
 const absent=f.prepared(source.slice(1),[display]);assert.throws(()=>f.api.bindDerivedChunkInput(absent,[display]),/complete native dependency/);const duplicate=f.prepared([...source,source[0]],[display]);assert.throws(()=>f.api.bindDerivedChunkInput(duplicate,[display]),/complete native dependency/);
});

test('actual manager rejects bad markers, missing receipts, duplicate displays and unproven source-absent rows',()=>{
 const f=fixture(),display=row(b03d.displays[0],markers(b03d)),invalid=row(b03d.displays[0],markers(b03d,'wrong'));
 assert.throws(()=>f.api.bindDerivedChunkInput(f.prepared([],[invalid]),[invalid]),/marker mismatch/);const noReceipt=f.prepared([],[display]);noReceipt.stats.components=[];assert.throws(()=>f.api.bindDerivedChunkInput(noReceipt,[display]),/unique verified producer receipt/);assert.throws(()=>f.api.bindDerivedChunkInput(f.prepared([],[display]),[display,display]),/missing or duplicated/);
 const unknown=row({objectId:'unknown',partId:'unknown/surface'});unknown.sourceFeature.properties.__not_native_source=true;assert.throws(()=>f.api.bindDerivedChunkInput(f.prepared([],[unknown]),[unknown]),/no explicit verified patch descriptor/);assert.equal(f.store.stats.roles,0);
});
