import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import ts from 'typescript';

// Only the pure recipe, static identity/resource metadata and signature helper
// enter this fixture. All model/source/display values below are tiny synthetic data.
const web=fileURLToPath(new URL('../',import.meta.url));
const built=await build({stdin:{contents:`export * from './src/painted/bremen/safety/bremen-ag70-runtime';export * from './src/painted/bremen/safety/bremen-ag70-data';export * from './src/painted/bremen/safety/bremen-ag70-identities';export {nativePaintSignature} from './src/painted/bremen/safety/progressive-native-signature';`,resolveDir:web,sourcefile:'ag70-recipe-fixture.ts',loader:'ts'},bundle:true,write:false,metafile:true,platform:'node',format:'esm',target:'es2022',plugins:[{name:'no-frozen-table-input',setup(builder){builder.onResolve({filter:/frozen-paint-tables|painted-tables|\.json(?:\.gz)?$/},()=>{throw Error('Original table/store must not enter a tiny AG70 recipe fixture');});}}]});
const module=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const {createEdgeAg70Recipe,edgeAg70Identity,edgeAg70BaseMaterials,EDGE70_SHA,EDGE70_RESOURCE,EDGE70_IDENTITIES,EDGE70_IDENTITY_INPUT,nativePaintSignature}=module;
const emptyStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
const arrayKeys=['positions','normals','indices','paint','frames','color'];
const hash=value=>createHash('sha256').update(value).digest('hex');

function fixture({base64=false,inScope=true,extras={},paintValue=.25}={}){
 const rows=EDGE70_IDENTITIES.map((identity,index)=>({city:'bremen',...identity,origin:[8.8,53.07],componentGeometry:{type:'Polygon',coordinates:[[[8.8,53.07],[8.801,53.07],[8.8,53.071],[8.8,53.07]]]},sourceFeature:{type:'Feature',properties:{fixture:index}},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.5,.5,.5]}],displayEstimates:{fixture:true}}));
 const sources=structuredClone(rows);
 const leaf=row=>'fixture-leaf-'+row.partId;
 if(base64)for(const source of sources)for(const batch of source.batches){
  batch._nativeArraysBase64={};
  for(const key of ['positions','normals','indices','color']){const bytes=Buffer.alloc(batch[key].length*4),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);batch[key].forEach((v,index)=>key==='indices'?view.setUint32(index*4,v,true):view.setFloat32(index*4,v,true));batch._nativeArraysBase64[key]=bytes.toString('base64');}
 }
 const display={objectId:rows[0].objectId,partId:rows[0].partId,origin:[8.81,53.08],inScope,officialLoD2Shape:true,outsideBankGeometryRetained:true,batches:[{...extras,positions:[-0,0,0,2,0,0,0,2,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.7,.7,.7],paint:Array(12).fill(paintValue),frames:Array(15).fill(.5)}]};
 const data={models:[{targetId:'tiny-ag70',requiredNativeGroup:rows.map(row=>({objectId:row.objectId,partId:row.partId,signature:nativePaintSignature(row),sourceLeafSHA256:leaf(row)})),nativeSourceComponents:sources,displays:[display]}]};
 return{rows,sources,leaf,data,display,recipe:createEdgeAg70Recipe(data)};
}

test('resource and complete city-agnostic identity metadata import without any table/store/TLA',async()=>{
 assert.equal(EDGE70_SHA,'509f10033214fa501344fa5ce0eebb8e7ab8b3014b09759abae537fe5ab2ec69');
 assert.deepEqual(EDGE70_RESOURCE,{canonicalSHA256:EDGE70_SHA,file:'painted/bremen/safety/bremen-ag70-data.ts',occurrence:0,codec:'json'});
 assert(!('EDGE70_DATA' in module));
 assert.equal(EDGE70_IDENTITY_INPUT.rawSHA256,EDGE70_SHA);assert.equal(EDGE70_IDENTITY_INPUT.rawBytes,431595);assert.equal(EDGE70_IDENTITY_INPUT.transportBytes,71514);assert.equal(EDGE70_IDENTITY_INPUT.transportSHA256,'fae9ded5c8d7a7bb0c66deaf4f04450efc9709344106ad9f076ef1a58f711646');
 assert.equal(EDGE70_IDENTITY_INPUT.models,1);assert.equal(EDGE70_IDENTITY_INPUT.requiredNativeGroupRows,3);assert.equal(EDGE70_IDENTITIES.length,3);assert.equal(EDGE70_IDENTITY_INPUT.uniqueIdentities,3);
 const ordered=EDGE70_IDENTITIES.map(row=>[row.objectId,row.partId]);assert.equal(new Set(ordered.map(row=>JSON.stringify(row))).size,3);assert.equal(hash(JSON.stringify(ordered)),'ad532b5cb351305170a524267d86b439d1a6ca40206f94d96a568884d040f1df');assert.equal(EDGE70_IDENTITY_INPUT.orderedIdentitySHA256,hash(JSON.stringify(ordered)));assert.equal(EDGE70_IDENTITY_INPUT.orderedRequiredNativeGroupSHA256,hash(JSON.stringify(ordered)));
 for(const row of EDGE70_IDENTITIES)for(const city of ['bremen','berlin','frankfurt']){assert(edgeAg70Identity({city,...row}));assert(!edgeAg70Identity({city,...row,partId:row.partId+'-wrong'}));}
 assert(Object.isFrozen(EDGE70_IDENTITIES));assert(EDGE70_IDENTITIES.every(Object.isFrozen));
 for(const name of ['bremen-ag70-data.ts','bremen-ag70-metadata.ts','bremen-ag70-identities.ts','bremen-ag70-runtime.ts']){
  const text=await readFile(path.join(web,'src/painted/bremen/safety',name),'utf8'),source=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);
  assert(!text.includes('readFrozenTableAsync'));assert(!text.includes('EDGE70_DATA'));assert.equal(source.parseDiagnostics.length,0);
  function visit(node,inFunction=false){const nested=inFunction||ts.isFunctionLike(node);if(ts.isAwaitExpression(node))assert(nested,'No top-level await in '+name);ts.forEachChild(node,child=>visit(child,nested));}visit(source);
 }
 assert(Object.keys(built.metafile.inputs).every(file=>!file.includes('frozen-paint')&&!file.endsWith('.json')));
});

test('exact complete native group reconstructs while preserving SOURCE and suppression semantics',()=>{
 const f=fixture(),before=structuredClone(f.rows),dataBefore=structuredClone(f.data),unrelated={city:'bremen',objectId:'unknown',partId:'unknown',batches:[]},input=[unrelated,...f.rows];
 const output=f.recipe.edgeAg70Reconstruction(input,undefined,f.leaf);
 assert.equal(f.recipe.edgeAg70Identity,edgeAg70Identity);assert.equal(f.recipe.edgeAg70BaseMaterials,edgeAg70BaseMaterials);assert.notEqual(output.components,input);assert.equal(output.components[0],unrelated);
 const shown=output.components[1];assert.notEqual(shown,f.rows[0]);assert.equal(shown.componentGeometry,f.rows[0].componentGeometry);assert.equal(shown.sourceFeature,f.rows[0].sourceFeature);assert.deepEqual(shown.origin,f.display.origin);assert.notEqual(shown.origin,f.display.origin);assert(Object.is(shown.batches[0].positions[0],-0));
 for(const key of arrayKeys){assert.deepEqual(shown.batches[0][key],f.display.batches[0][key]);assert.notEqual(shown.batches[0][key],f.display.batches[0][key]);}
 assert.deepEqual(shown.displayEstimates.edgeAg70,{patchSHA256:EDGE70_SHA,sourceRetained:true,inScope:true,officialLoD2Shape:true,detailTarget:.7,actualVisualAccepted:false,outsideBankGeometryRetained:true});assert.equal(shown.displayEstimates.fixture,true);
 for(let index=2;index<output.components.length;index++){const hidden=output.components[index];assert.notEqual(hidden,input[index]);assert.deepEqual(hidden.batches,[]);assert.equal(hidden.componentGeometry,input[index].componentGeometry);assert.equal(hidden.origin,input[index].origin);assert.deepEqual(hidden.displayEstimates.edgeAg70Suppressed,{patchSHA256:EDGE70_SHA,sourceRetained:true,reason:'Exact guarded native component covered by official whole-group DISPLAY'});assert.equal(hidden.displayEstimates.fixture,true);}
 assert.deepEqual(output.stats,{...emptyStats,objects:1,vertices:3,triangles:1,originalVertices:3,components:[{objectId:f.rows[0].objectId,partId:f.rows[0].partId,sourcePartId:f.rows[0].partId,patchSHA256:EDGE70_SHA,vertices:3,triangles:1,geometryRole:'official-whole-group-with-photo-specific-detail'}]});assert.deepEqual(f.rows,before);assert.deepEqual(f.data,dataBefore);
});

test('missing, duplicate, changed, wrong-city, wrong-leaf and excluded groups preserve no-match copies',()=>{
 const f=fixture(),changed=structuredClone(f.rows);changed[0].batches[0].positions[0]=99;
 const changedFields=['origin','componentGeometry','sourceFeature'].map(key=>{const rows=structuredClone(f.rows);rows[0][key]=key==='origin'?[0,0]:{changed:true};return rows;});
 const cases=[{rows:[]},{rows:f.rows.slice(1)},{rows:[...f.rows,f.rows[0]]},{rows:changed},...changedFields.map(rows=>({rows})),{rows:f.rows.map(row=>({...row,city:'berlin'}))},{rows:f.rows,leaf:()=> 'wrong'},{rows:f.rows,leaf:null},{rows:f.rows,selected:[]},{rows:f.rows,selected:['not-the-target']}];
 for(const {rows,leaf=f.leaf,selected}of cases){const output=f.recipe.edgeAg70Reconstruction(rows,selected,leaf??undefined);assert.notEqual(output.components,rows);assert.deepEqual(output.components,rows);output.components.forEach((row,index)=>assert.equal(row,rows[index]));assert.deepEqual(output.stats,emptyStats);}
 const selected=f.recipe.edgeAg70Reconstruction(f.rows,['tiny-ag70'],f.leaf);assert.equal(selected.stats.objects,1);
});

test('verified original base64 native arrays retain exact guard and reject changed bytes',()=>{
 const f=fixture({base64:true});assert.equal(f.recipe.edgeAg70Reconstruction(f.rows,undefined,f.leaf).stats.objects,1);
 const changed=Buffer.from(f.sources[0].batches[0]._nativeArraysBase64.positions,'base64');changed.writeFloatLE(123,0);f.sources[0].batches[0]._nativeArraysBase64.positions=changed.toString('base64');const output=f.recipe.edgeAg70Reconstruction(f.rows,undefined,f.leaf);assert.deepEqual(output.stats,emptyStats);assert(output.components.every((row,index)=>row===f.rows[index]));
});

test('unknown display batch extras are value-preserving owned projections without parsed-data aliases',()=>{
 const f=fixture({extras:{custom:{nested:[{value:7}]},attributes:new Uint8Array([1,2]),registry:new Map([['fixture',{value:8}]]),negativeZero:-0}}),source=f.display.batches[0],expected=structuredClone(source),shown=f.recipe.edgeAg70Reconstruction(f.rows,undefined,f.leaf).components[0].batches[0];
 assert.deepEqual(shown,expected);assert.notEqual(shown.custom,source.custom);assert.notEqual(shown.custom.nested,source.custom.nested);assert.notEqual(shown.custom.nested[0],source.custom.nested[0]);assert.notEqual(shown.attributes,source.attributes);assert.notEqual(shown.attributes.buffer,source.attributes.buffer);assert.notEqual(shown.registry,source.registry);assert.notEqual(shown.registry.get('fixture'),source.registry.get('fixture'));assert(Object.is(shown.negativeZero,-0));
 shown.custom.nested[0].value=70;shown.attributes[0]=10;shown.registry.get('fixture').value=80;for(const key of arrayKeys)shown[key][0]=42;
 assert.deepEqual(source,expected);source.custom.nested.push({value:9});assert.equal(shown.custom.nested.length,1);
});

test('factory instances keep distinct supplied data while identity and materials remain stateless',()=>{
 const first=fixture({paintValue:.25}),second=fixture({paintValue:.75});
 assert.equal(first.recipe.edgeAg70Reconstruction(first.rows,undefined,first.leaf).components[0].batches[0].paint[0],.25);assert.equal(second.recipe.edgeAg70Reconstruction(second.rows,undefined,second.leaf).components[0].batches[0].paint[0],.75);assert.equal(first.recipe.edgeAg70Reconstruction(first.rows,undefined,first.leaf).components[0].batches[0].paint[0],.25);assert.equal(first.recipe.edgeAg70Identity,second.recipe.edgeAg70Identity);assert.equal(first.recipe.edgeAg70BaseMaterials,second.recipe.edgeAg70BaseMaterials);
});

test('outside-scope display stays reconstructed without in-scope credit or material writes',()=>{
 const f=fixture({inScope:false}),output=f.recipe.edgeAg70Reconstruction(f.rows,undefined,f.leaf),shown=output.components[0];assert.deepEqual(output.stats,emptyStats);assert.notEqual(shown,f.rows[0]);assert.deepEqual(shown.origin,f.display.origin);assert.deepEqual(shown.batches[0].positions,f.display.batches[0].positions);assert.equal(shown.displayEstimates.edgeAg70.inScope,false);
 const paint=new Float32Array(12),frames=new Float32Array(15);assert.deepEqual(edgeAg70BaseMaterials(output.components,paint,frames),{objects:0,vertices:0,actualVisualAccepted:false});assert(paint.every(value=>value===0));assert(frames.every(value=>value===0));
});

test('stateless material writes retain strict city/scope admission and vertex offsets',()=>{
 const f=fixture(),shown=f.recipe.edgeAg70Reconstruction(f.rows,undefined,f.leaf).components[0],plain={city:'bremen',batches:[{positions:[0,0,0]}]},otherCity={city:'berlin',displayEstimates:{edgeAg70:{inScope:true}},batches:[{positions:[0,0,0]}]},notStrict={city:'bremen',displayEstimates:{edgeAg70:{inScope:1}},batches:[{positions:[0,0,0]}]},rows=[plain,shown,otherCity,notStrict],paint=new Float32Array(24),frames=new Float32Array(30);
 assert.deepEqual(edgeAg70BaseMaterials(rows,paint,frames),{objects:1,vertices:3,actualVisualAccepted:false});assert.deepEqual([...paint],[...Array(4).fill(0),...f.display.batches[0].paint,...Array(8).fill(0)]);assert.deepEqual([...frames],[...Array(5).fill(0),...f.display.batches[0].frames,...Array(10).fill(0)]);
});
