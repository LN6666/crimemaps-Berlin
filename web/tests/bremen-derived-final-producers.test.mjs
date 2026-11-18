import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import {createSourceModules,webSource} from './support/fixtures-managers-b-source-modules.mjs';

// Real numerical producers and real owner aggregation, over small prepared
// payloads at their existing resource boundary. Unrelated city recipes are the
// explicit isolation boundary; no producer receipt is constructed by this test.
const modules=createSourceModules(),load=name=>modules.load('painted/bremen/safety/'+name),metadata=load('bremen-demand-metadata').BREMEN_DEMAND_METADATA;
const old=load('bremen-oldtown70-runtime'),glocke=load('glocke-detail-runtime'),organisten=load('organisten-runtime'),kuester=load('glocke-kuester-runtime'),market=load('market-cap-runtime'),demand=load('bremen-recipe-demand');
const data={old:load('oldtown70-data'),glocke:load('glocke-detail-data'),organisten:load('organisten-data'),kuester:load('glocke-kuester-data'),market:load('market-cap-data')};
const {nativePaintSignature}=load('progressive-native-signature'),{bremenDisplayDerivations}=load('bremen-display-derivations'),chunks=modules.load('safety/renderer-chunk-input');
const {createFrozenDataScope}=modules.load('safety/frozen-data-scope'),{createResourceBudget}=modules.load('safety/render-runtime/resource-budget'),{createChunkResourceStore}=modules.load('safety/render-runtime/chunk-resource-store');
const key=row=>row.objectId+'|'+row.partId,identity=row=>({objectId:row.objectId,partId:row.partId}),leaf=row=>'native-leaf:'+key(row);
const read=name=>fs.readFileSync(path.join(webSource,'painted/bremen/safety',name+'.ts'),'utf8');
const batch=(scale=1)=>({positions:[0,0,0,scale,0,0,0,scale,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.5,.5,.5],paint:Array(12).fill(.25),frames:Array(15).fill(.5)});
const component=id=>({city:'bremen',...identity(id),origin:[8.8,53.07],componentGeometry:{type:'Polygon',coordinates:[[[8.8,53.07],[8.801,53.07],[8.8,53.071],[8.8,53.07]]]},sourceFeature:{type:'Feature',id:id.objectId,geometry:null,properties:{}},batches:[batch()]});
const zero=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
const unchanged=components=>({components,stats:zero()});
function nodes(ast,predicate){const result=[];(function visit(node){if(predicate(node))result.push(node);ts.forEachChild(node,visit);})(ast);return result;}
const ownerAst=ts.createSourceFile('owner.ts',read('owner-reconstruction'),ts.ScriptTarget.Latest,true);
function aggregate(implementations){
 const values={...demand,...implementations,bremenScopedCall:(fn,args,scope)=>fn(...args,scope),frozenOwnerReconstructionComponents:unchanged};
 const boundary=new Proxy(values,{has:()=>true,get:(object,name)=>{
  if(name===Symbol.unscopables)return undefined;if(name in object)return object[name];if(name in globalThis)return globalThis[name];
  if(/Identity$/.test(name))return()=>false;
  if(/RemoveDuplicateNativeParts$/.test(name))return rows=>rows;
  if(/Reconstruction$|Reframe$|Repaint$|^silberturmFullReconstruction/.test(name))return unchanged;
  throw Error('Unbound owner fixture stage: '+String(name));
 }});
 const names=['captureBremenReplacements','applyBremenReplacements','bremenOwnerStages','ownerReconstructionComponents'],source=names.map(name=>{const found=nodes(ownerAst,node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.equal(found.length,1,name);return found[0].getText(ownerAst).replace(/^export\s+/,'');}).join('\n');
 return Function('env','with(env){'+ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'\nreturn ownerReconstructionComponents;}')(boundary);
}
// Execute the renderer's actual overlay statements: it keeps the prepared
// held rows when its drawable collection has already filtered them out.
const rendererAst=ts.createSourceFile('renderer.ts',read('building-mesh-renderer'),ts.ScriptTarget.Latest,true),pack=nodes(rendererAst,node=>ts.isFunctionDeclaration(node)&&node.name?.text==='packCandidate')[0];
const producedNode=nodes(pack,node=>ts.isVariableDeclaration(node)&&node.name.getText(rendererAst)==='produced')[0],overlayNode=nodes(pack,node=>ts.isForOfStatement(node)&&node.statement.getText(rendererAst)==='produced.set(key(row),row);')[0];
assert.ok(producedNode&&overlayNode,'actual final pack keeps full produced collection');
const finalProduced=Function('prepared','components','key',ts.transpileModule('const '+producedNode.getText(rendererAst)+';'+overlayNode.getText(rendererAst)+';return [...produced.values()];',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);

async function fixture(kind){
 const targets=kind==='organisten'?['BR-OT-B04B']:kind==='kuester'?['BR-OT-B06B']:['BR-OT-B03C','BR-OT-B03D'],oldModels=metadata.oldtown.models.filter(model=>targets.includes(model.targetId));
 const ids=[...oldModels.flatMap(model=>model.requiredNativeGroup),...(kind==='kuester'?metadata.kuester.models.map(model=>model.identity):[])],source=[...new Map(ids.map(id=>[key(id),component(id)])).values()];
 const records=new Map(),budget=createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:0}),store=createChunkResourceStore({budget,recentMaxEntries:0,recentMaxIdleMs:0}),sourcePins=[];
 const acquire=(contentKey,value,role='source')=>store.acquire({contentKey,role,allowRecent:false,estimate:{category:'metadata',bytes:65536,precision:'estimate'},produce:()=>value,costs:result=>({category:'metadata',bytes:Math.max(64,JSON.stringify(result).length*2),precision:'estimate',identity:result})});
 const scope=createFrozenDataScope({resources:store,async acquire(ref,signal){signal.throwIfAborted();assert.ok(records.has(ref.canonicalSHA256),'prepared recipe '+ref.file);const pin=acquire(ref.canonicalSHA256,records.get(ref.canonicalSHA256));await pin.ready;return{borrow:read=>{assert.ok(!pin.released);return read(pin.value);},retainResource:role=>pin.retain(role),release:()=>pin.release()};}});
 const install=async(ref,value)=>{records.set(ref.canonicalSHA256,value);await scope.prepare([ref],new AbortController().signal);};
 const oldValue={sourceAuthoritySHA256:metadata.oldtown.sourceAuthoritySHA256,frozenExcluded:[],models:oldModels.map(model=>{const reference=component(model.displays[0]);return{...structuredClone(model),requiredNativeGroup:model.requiredNativeGroup.map(id=>({...id,signature:nativePaintSignature(source.find(row=>key(row)===key(id)))})),sourceBinding:{...structuredClone(model.sourceBinding),sourceRecordSHA256:'a'.repeat(64)},componentGeometry:reference.componentGeometry,sourceFeature:reference.sourceFeature,displays:model.displays.map(id=>({...identity(id),origin:[8.8,53.07],batches:[batch(2)]}))};})};
 await install(data.old.BREMEN_OLDTOWN70_DATA_RESOURCE,oldValue);
 const predecessors=old.infillBremenOldtown70Reconstruction(source,undefined,metadata.oldtown.sourceAuthoritySHA256,scope);
 assert.equal(predecessors.stats.objects,oldModels.reduce((n,model)=>n+model.displays.length,0),'real Oldtown producer ran');
 const expected=new Map(predecessors.components.map(row=>[key(row),row])),implementations={...old};
 let finalRef,finalSHA,tag,finalIdentities;
 if(kind==='kuester'){
  const glockeValue={sourceCarrier:metadata.glocke.sourceCarrier,officialIds:['tiny-official'],layout:{groundDatumM:0},models:metadata.glocke.models.map(model=>{const native=source.find(row=>key(row)===key(model.identity)),carrier=key(native)===key(metadata.glocke.sourceCarrier);return{identity:{...identity(native),signature:nativePaintSignature(native),leafSHA256:leaf(native)},source:structuredClone(native),display:carrier?[batch(2)]:[],role:carrier?'carrier':'held'};})};
  await install(data.glocke.GLOCKE_DETAIL_DATA_RESOURCE,glockeValue);const result=glocke.bremenGlockeDetailReconstruction(source,leaf,scope);assert.equal(result.stats.objects,12,'real pre-captured Glocke producer ran');for(const row of result.components)if(row.displayEstimates?.bremenGlockeDetail)expected.set(key(row),row);Object.assign(implementations,glocke,kuester);
 }
 if(kind!=='market'){
  const light=metadata[kind==='kuester'?'kuester':'organisten'],value={expectedOldtownSHA256:data.old.BREMEN_OLDTOWN70_SHA,sourceCarrier:light.sourceCarrier,models:light.models.map(model=>{const native=source.find(row=>key(row)===key(model.identity)),prior=expected.get(key(native)),markerName=['bremenGlockeDetail','infillBremenOldtown70','infillBremenOldtown70Suppressed'].find(name=>prior.displayEstimates?.[name]);assert.ok(markerName);return{identity:{...identity(native),signature:nativePaintSignature(native),leafSHA256:leaf(native)},source:structuredClone(native),expected:structuredClone(prior.batches),expectedMarker:{name:markerName,sha:prior.displayEstimates[markerName].patchSHA256},display:model.display.length?[batch(3)]:[],role:model.display.length?'carrier':'held'};})};
  if(kind==='organisten'){finalRef=data.organisten.ORGANISTEN_DATA_RESOURCE;finalSHA=data.organisten.ORGANISTEN_SHA;tag='organistenFinal';Object.assign(implementations,organisten);}else{finalRef=data.kuester.GLOCKE_KUESTER_DATA_RESOURCE;finalSHA=data.kuester.GLOCKE_KUESTER_SHA;tag='glockeKuesterOwnership';}
  finalIdentities=light.models.map(model=>model.identity);await install(finalRef,value);
 }else{
  const value={expectedOldtownSHA:data.old.BREMEN_OLDTOWN70_SHA,sourceAuthoritySHA256:metadata.oldtown.sourceAuthoritySHA256,models:oldValue.models.map(model=>{const prior=expected.get(key(model.displays[0])),native=source.find(row=>key(row)===key(prior));return{identity:identity(prior),targetId:model.targetId,origin:prior.origin,componentGeometry:prior.componentGeometry,sourceFeature:prior.sourceFeature,sourceNativeAbsent:model.sourceBinding.nativeParentAbsent,sourceBinding:model.sourceBinding,nativeSource:native?[{...structuredClone(native),nativeSignature:nativePaintSignature(native),sourceLeafSHA256:leaf(native)}]:[],display:structuredClone(prior.batches),selectedVertices:[0],selectedTriangles:[0],newPaint:[.75,.5,.25,2]};})};
  finalRef=data.market.MARKET_CAP_DATA_RESOURCE;finalSHA=data.market.MARKET_CAP_SHA;tag='marketCapStone';finalIdentities=metadata.market.models.map(model=>model.identity);await install(finalRef,value);Object.assign(implementations,market);
 }
 const reconstruct=aggregate(implementations),result=reconstruct(source,leaf,undefined,scope),finalRows=result.components.filter(row=>row.displayEstimates?.[tag]);
 assert.equal(finalRows.length,finalIdentities.length,'actual final producer output survives actual owner aggregation');
 for(const id of finalIdentities){const receipts=result.stats.components.filter(row=>key(row)===key(id));assert.equal(receipts.length,1,'owner aggregation replaced predecessor receipt');assert.equal(receipts[0].patchSHA256,finalSHA);}
 const groups=source.map(row=>{const pin=acquire('native:'+key(row),row);sourcePins.push(pin);return{contentKey:pin.contentKey,components:[row],parents:[pin],frame:chunks.rendererChunkFrame(row.origin,'source:'+key(row)),cohortKeys:[],materialAuthority:'native-material',recipeAuthority:'native-recipe',selectedLOD:'native'};});await Promise.all(sourcePins.map(pin=>pin.ready));
 return{kind,source,scope,store,records,predecessors,result,finalRows,finalRef,finalSHA,tag,finalIdentities,input:{store,groups,cohorts:[]},release(){scope.release();for(const pin of sourcePins)pin.release();}};
}

for(const kind of ['organisten','kuester','market'])test(kind+': actual predecessor → final producer → owner receipts bind both recipe authorities',async()=>{
 const f=await fixture(kind);let first,second;
 try{
  const initial=bremenDisplayDerivations(f.result.components,f.source,f.scope,f.result.stats.components);first=chunks.bindRendererChunkDerivations(f.input,initial.proofs);initial.release();
  assert.equal(first.groups.length,1);const authority=first.groups[0].recipeAuthority;assert.ok(authority.includes(data.old.BREMEN_OLDTOWN70_SHA));assert.ok(authority.includes(f.finalSHA));assert.ok(first.groups[0].parents.some(parent=>parent.contentKey===f.finalRef.canonicalSHA256));assert.equal(first.groups[0].parents.length,f.source.length+2);
  const drawable=f.result.components.filter(row=>row.batches.some(batch=>batch.positions.length)),produced=finalProduced({components:f.result.components},drawable,key),final=bremenDisplayDerivations(produced,f.source,f.scope,f.result.stats.components);second=chunks.bindRendererChunkDerivations(first,final.proofs);final.release();
  assert.equal(second.groups[0].contentKey,first.groups[0].contentKey);assert.equal(produced.length,f.result.components.length);
  if(kind!=='market'){
   const held=f.finalRows.filter(row=>!row.batches.length),carrier=f.finalRows.filter(row=>row.batches.length);assert.equal(held.length,kind==='organisten'?3:12);
   const requested=[f.source.find(row=>key(row)===key(held[0]))],visible=chunks.rendererDerivedDisplayKeys(requested,drawable,f.result.stats.components,final.proofs,()=>false,f.source);assert.deepEqual(visible,carrier.map(key),'any verified held SOURCE admits the merged drawable carrier group');
   const packed=chunks.rendererChunkGroups(second,drawable);assert.deepEqual(packed.flatMap(group=>group.components).map(key),carrier.map(key));assert.ok(packed.every(group=>group.components.every(row=>row.batches.length>0)),'held proof rows never become draw spans');
   assert.throws(()=>bremenDisplayDerivations(drawable,f.source,f.scope,f.result.stats.components),/missing or duplicated/,'dropping held members is not a complete proof');
  }
  f.release();first.release();first=undefined;assert.ok(second.groups[0].parents.every(parent=>!parent.released),'final input independently owns every native/recipe parent');second.release();second=undefined;assert.equal(f.store.stats.roles,0);
 }finally{first?.release();second?.release();f.release();}
});

test('final producer contracts reject missing/duplicate exact receipts, markers, native members and held members',async()=>{
 for(const kind of ['organisten','kuester']){
  const f=await fixture(kind);try{
   const rows=f.result.components,receipts=f.result.stats.components,selected=receipts.find(receipt=>receipt.patchSHA256===f.finalSHA);
   assert.throws(()=>bremenDisplayDerivations(rows,f.source,f.scope,receipts.filter(receipt=>receipt!==selected)),error=>error.message.includes('expectedPatch='+f.finalSHA)&&error.message.includes('matchingReceipts=0'));
   assert.throws(()=>bremenDisplayDerivations(rows,f.source,f.scope,[...receipts,selected]),/matchingReceipts=2/);
   const historical=f.predecessors.stats.components.find(receipt=>receipt.patchSHA256!==f.finalSHA);const withHistory=bremenDisplayDerivations(rows,f.source,f.scope,[...receipts,historical]);withHistory.release();
   assert.throws(()=>bremenDisplayDerivations(rows,f.source.slice(1),f.scope,receipts),/complete native dependency/);
   assert.throws(()=>bremenDisplayDerivations(rows,[...f.source,f.source[0]],f.scope,receipts),/complete native dependency/);
   const row=f.finalRows[0],wrong={...row,displayEstimates:{...row.displayEstimates,[f.tag]:{...row.displayEstimates[f.tag],patchSHA256:'wrong'}}};assert.throws(()=>bremenDisplayDerivations(rows.map(value=>value===row?wrong:value),f.source,f.scope,receipts),/producer marker mismatch/);
   const foreign={...row,objectId:'unknown-final-object',partId:'unknown-final-part'};assert.throws(()=>bremenDisplayDerivations([...rows,foreign],f.source,f.scope,receipts),/producer group mismatch/);
  }finally{f.release();assert.equal(f.store.stats.roles,0);}
 }
});
