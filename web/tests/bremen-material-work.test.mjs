import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';

const modules=createSourceModules(),load=name=>modules.load('painted/bremen/safety/'+name),kunst=load('kunsthalle70-runtime'),data=load('kunsthalle70-data'),metadata=load('bremen-demand-metadata').BREMEN_DEMAND_METADATA.kunsthalle;
const {nativePaintSignature}=load('progressive-native-signature'),{createFrozenDataScope}=modules.load('safety/frozen-data-scope'),{createResourceBudget}=modules.load('safety/render-runtime/resource-budget'),{createChunkResourceStore}=modules.load('safety/render-runtime/chunk-resource-store');
const identity=row=>({objectId:row.objectId,partId:row.partId}),key=row=>row.objectId+'|'+row.partId;
const batch=vertices=>({positions:Array.from({length:vertices*3},(_,i)=>Math.fround(i*.125)),normals:Array.from({length:vertices*3},(_,i)=>Number(i%3===1)),indices:Array.from({length:vertices},(_,i)=>i),paint:Array.from({length:vertices*4},(_,i)=>Math.fround(i*.03125)),frames:Array.from({length:vertices*5},(_,i)=>Math.fround(i*.0625)),color:[.77,.735,.65]});
const component=id=>({city:'bremen',...identity(id),origin:[8.8,53.07],componentGeometry:{type:'Polygon',coordinates:[[[8.8,53.07],[8.801,53.07],[8.8,53.071],[8.8,53.07]]]},sourceFeature:{id:id.objectId,type:'Feature',geometry:null,properties:{}},batches:[batch(3)]});

async function kunsthalleFixture(vertices=9){
 const rows=metadata.requiredNativeGroup.map(component),reference=component(metadata.derivedIdentity),native=rows[0],signature=nativePaintSignature(native),patch={...identity(native),signature,patches:[{batchIndex:0,firstVertex:0,vertexCount:1,paint:[.1,.2,.3,.4],frames:[.5,.6,.7,.8,.9]}]};
 const value={...metadata,origin:reference.origin,referenceFootprint:reference.componentGeometry,batch:batch(vertices),requiredNativeGroup:rows.map(row=>({...identity(row),signature:nativePaintSignature(row),leafSHA256:key(row),origin:row.origin,sourceFeature:row.sourceFeature})),metadataPatches:[{...patch,signature:'different'},patch]};
 const budget=createResourceBudget({limitBytes:16*1024**2,recentLimitBytes:0}),store=createChunkResourceStore({budget});let borrows=0;
 const scope=createFrozenDataScope({resources:store,async acquire(ref,signal){signal.throwIfAborted();assert.equal(ref.canonicalSHA256,data.KUNSTHALLE70_SHA);const cost=[{category:'decoded',bytes:JSON.stringify(value).length*2,precision:'estimate'}],pin=store.acquire({contentKey:ref.canonicalSHA256,role:'source',estimate:cost,produce:()=>value,costs:()=>cost,dispose(){}});await pin.ready;return{borrow:read=>{borrows++;const hold=pin.retain('dependency');try{return read(pin.value);}finally{hold.release();}},retainResource:role=>pin.retain(role),release:()=>pin.release()};}});
 await scope.prepare([data.KUNSTHALLE70_DATA_RESOURCE],new AbortController().signal);
 const produced=kunst.bremenKunsthalle70Reconstruction(rows,key,scope);assert.equal(produced.stats.objects,1,'actual producer accepted the complete verified native group');const derived=produced.components.at(-1);
 const materials=(components=produced.components)=>{const n=components.reduce((total,row)=>total+row.batches.reduce((sum,b)=>sum+b.positions.length/3,0),0),paint=new Float32Array(n*4),frames=new Float32Array(n*5);borrows=0;const stats=kunst.bremenKunsthalle70BaseMaterials(components,paint,frames,scope);return{stats,paint,frames,borrows};};
 return{rows,value,derived,produced,scope,store,budget,materials,close(){scope.release();store.evictRecent();store.collectRetired();assert.equal(store.stats.resources,0);assert.equal(budget.stats.bytes,0);}};
}

test('Kunsthalle material guards borrow one scoped table independently of numerical array length',async()=>{
 for(const count of [9,3009]){
  const f=await kunsthalleFixture(count);try{
   const result=f.materials(),offset=f.rows.length*3;
   assert.equal(result.borrows,1);assert.equal(result.stats.objects,2);assert.equal(result.stats.vertices,count+1);
   const expectedPaint=new Float32Array(result.paint.length),expectedFrames=new Float32Array(result.frames.length);expectedPaint.set(f.value.metadataPatches[1].patches[0].paint);expectedFrames.set(f.value.metadataPatches[1].patches[0].frames);expectedPaint.set(f.value.batch.paint,offset*4);expectedFrames.set(f.value.batch.frames,offset*5);
   assert.deepEqual(result.paint,expectedPaint);assert.deepEqual(result.frames,expectedFrames);
   assert.equal(kunst.serializeBremenKunsthalle70DerivedReadback(f.derived,true,f.scope).patchSHA256,data.KUNSTHALLE70_SHA);
   assert.equal(f.materials(f.rows).borrows,0,'native-only material groups do not read the derived table');
  }finally{f.close();}
 }
});

test('Kunsthalle still rejects wrong markers, changed arrays, incomplete sources and out-of-range metadata',async()=>{
 const f=await kunsthalleFixture();try{
  const wrong={...f.derived,displayEstimates:{bremenKunsthalle70:{patchSHA256:'wrong'}}};assert.equal(f.materials([...f.rows,wrong]).borrows,0);assert.throws(()=>kunst.serializeBremenKunsthalle70DerivedReadback(wrong,true,f.scope),/finite derived certificate mismatch/);
  for(const field of ['positions','normals','indices']){const copy=structuredClone(f.derived);copy.batches[0][field][0]+=1;assert.equal(f.materials([...f.rows,copy]).stats.objects,0);assert.throws(()=>kunst.serializeBremenKunsthalle70DerivedReadback(copy,true,f.scope),/finite derived certificate mismatch/);}
  assert.equal(kunst.bremenKunsthalle70Reconstruction(f.rows.slice(1),key,f.scope).stats.objects,0);assert.equal(kunst.bremenKunsthalle70Reconstruction([...f.rows,f.rows[0]],key,f.scope).stats.objects,0);
  assert.throws(()=>kunst.bremenKunsthalle70Reconstruction(f.produced.components,key,f.scope),/Duplicate finite/);assert.throws(()=>kunst.serializeBremenKunsthalle70DerivedReadback(f.derived,false,f.scope),/native SOURCE registry/);
  // The prepared-resource boundary is the deliberate test fault injection.
  f.value.metadataPatches[1].patches[0].vertexCount=4;assert.throws(()=>f.materials(),/native metadata range exceeded/);
 }finally{f.close();}
});

function materialBoundary(bindings){
 const source=fs.readFileSync(new URL('../src/painted/bremen/safety/building-mesh-renderer.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('bremen',source,ts.ScriptTarget.Latest,true);let material,release;
 (function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='packBremenChunkMaterials')material=node.getText(ast);if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='releaseAuxiliary')release='const '+node.getText(ast)+';';ts.forEachChild(node,visit);})(ast);
 assert.ok(material&&release);return Function(...Object.keys(bindings),ts.transpileModule(material+'\n'+release+'\nreturn packBremenChunkMaterials;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)(...Object.values(bindings));
}

function materialFixture({abortAfter,failDiagnostics=false}={}){
 const controller=new AbortController(),resident={},scope={},events=[],names=['applyPartialGateMask','applyS402ConnectorMask','applyS036NorthCoface','applyF018S036Compatibility','applyS240BaseCoface','applyF151CrownMask','ownerReconstructionBaseMaterials','applyF068DerivedDisplayMaterials','applyF075DerivedDisplayMaterials','applyF107DerivedDisplayMaterials','applyF082DerivedDisplayMaterials','applyF058Upper312','applyF061RecoveryPaint279','applyF061Main6370','applyF063RecoveryPaint272','applyF071Full6374','applyF071NorthCourt6438','applyF260RecoveryPaint264','applyF260CanopyPaint267','f260AcceptedRestoreBaseMaterials'];let current=resident,pins=0,maskReleases=0,maskDestroy=0;
 const inScope=fn=>(...args)=>{assert.equal(current,scope);return fn(...args);};
 const bindings={key,nativeLeafSHA:()=>undefined,ownerCommitStep:(_name,run)=>run(),enterBremenDataScope(next){const previous=current;current=next;return previous;},exitBremenDataScope(previous){current=previous;},retainF154ReconstructionConstruction:inScope(()=>{pins++;return()=>{pins--;};}),progressivePaintData:inScope(()=>new Float32Array(4)),facadePaintData:inScope(()=>new Float32Array(5)),createRathausProxyMasks:inScope(()=>({configure:inScope(()=>{}),cpuRecipe:()=>({costs:[],release(){maskReleases++;}}),destroy(){maskDestroy++;}})),getProgressivePaintDiagnosticsView:inScope(()=>{if(failDiagnostics)throw Error('diagnostic failure');return undefined;}),bremenChunkDiagnosticCosts:inScope(()=>({metadata:0})),...Object.fromEntries(names.map(name=>[name,inScope(()=>{events.push(name);return{};})]))};
 const invoke=async(fn,label)=>{assert.equal(current,resident,'scope restored before suspension');await Promise.resolve();controller.signal.throwIfAborted();const result=fn();assert.equal(current,resident,'scope restored before the scheduler yields');if(label===abortAfter)controller.abort();return result;};
 const work={signal:controller.signal,run:invoke,async steps(step,label){while(!await invoke(step,label)){};}};
 return{material:materialBoundary(bindings),scope,work,events,inspect:()=>({current,resident,pins,maskReleases,maskDestroy})};
}

test('Bremen asynchronous materials restore the resident scope at every yield and transfer auxiliary ownership',async()=>{
 const f=materialFixture(),result=await f.material([],f.scope,[],[],{},f.work);assert.equal(f.inspect().pins,1);assert.equal(f.inspect().maskDestroy,1);assert.equal(f.inspect().maskReleases,0);assert.deepEqual(f.events.slice(0,6),['applyPartialGateMask','applyS402ConnectorMask','applyS036NorthCoface','applyF018S036Compatibility','applyS240BaseCoface','applyF151CrownMask']);assert.ok(f.events.indexOf('ownerReconstructionBaseMaterials')<f.events.indexOf('applyF068DerivedDisplayMaterials'));assert.equal(f.events.at(-1),'f260AcceptedRestoreBaseMaterials');result.release();assert.equal(f.inspect().pins,0);assert.equal(f.inspect().maskReleases,1);
});

test('Bremen material cancellation and post-mask failure release acquired F154 and mask resources',async()=>{
 for(const options of [{abortAfter:'materials:retain'},{abortAfter:'materials:rathaus'},{failDiagnostics:true}]){
  const f=materialFixture(options);await assert.rejects(f.material([],f.scope,[],[],{},f.work),options.failDiagnostics?/diagnostic failure/:{name:'AbortError'});const state=f.inspect();assert.equal(state.current,state.resident);assert.equal(state.pins,0);assert.equal(state.maskReleases,state.maskDestroy);
 }
});
