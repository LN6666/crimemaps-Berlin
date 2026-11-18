import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildBuildingDetailVariants,createBuildingDetailProtection,detailJSON,MESHOPT_VERSION} from './building-detail-variants.mjs';

const sha='a'.repeat(64);
function grid(size=5){
  const positions=[],normals=[],indices=[];
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){positions.push(x*.02,0,z*.02);normals.push(0,1,0);}
  for(let z=0;z<size-1;z++)for(let x=0;x<size-1;x++){const a=z*size+x,b=a+1,c=a+size,d=c+1;indices.push(a,c,b,b,c,d);}
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint32Array(indices),color:[.3,.4,.5],faceRole:'roof',materialName:'fixture'};
}
function soup(batch,splitNormals=false){
  return {...batch,positions:Float32Array.from(Array.from(batch.indices).flatMap(i=>Array.from(batch.positions.subarray(i*3,i*3+3)))),
    normals:Float32Array.from(Array.from(batch.indices).flatMap((i,at)=>splitNormals?[Math.floor(at/3)*1e-7,1,0]:Array.from(batch.normals.subarray(i*3,i*3+3)))),
    indices:Uint32Array.from(batch.indices,(_,i)=>i)};
}
function component(batch,partId='fixture'){
  return {city:'bremen',objectId:'osm/way/1',partId,origin:[8.8,53.1],componentGeometry:{type:'Polygon',coordinates:[[[8.8,53.1],[8.801,53.1],[8.801,53.101],[8.8,53.1]]]},
    sourceFeature:{type:'Feature',properties:{building:'yes',name:'Original SOURCE'},geometry:{type:'Polygon',coordinates:[[[8.8,53.1],[8.801,53.1],[8.801,53.101],[8.8,53.1]]]}},batches:[batch]};
}
function input(components,extra={}){
  return {canonicalShard:{schema_version:1,city:'bremen',components},canonicalLeaf:{path:'/safety/buildings3d/bremen/fixture.json',sha256:sha,bytes:1},
    provenance:{city:'bremen',compilerSHA256:sha,sourcePBFSHA256:sha,boundarySHA256:sha,canonicalIndex:{path:'/safety/buildings3d/bremen/index.json',sha256:sha,bytes:1}},materialBinding:{kind:'synthetic-canonical-material',sha256:sha},
    protection:createBuildingDetailProtection({paintIdentityOwner:()=>undefined,paintFamily:()=>0,progressiveRows:[],coverage:{city:'bremen',completeForCity:true},evidence:[{path:'synthetic-protection',sha256:sha}]}),...extra};
}
function unchangedSimplifier(){let calls=0;return{ready:Promise.resolve(),simplifyWithAttributes(indices){calls++;return[indices,0];},compactMesh(){throw Error('Unexpected compaction');},get calls(){return calls;}};}

test('exact-normal seams and tiny/nonmanifold batches explain zero benefit without loosening locked borders',async()=>{
  const split=soup(grid(3),true),minimum=grid(2);minimum.indices=new Uint32Array([0,2,1]);
  const nonmanifold=grid(2);nonmanifold.indices=new Uint32Array([0,2,1,0,2,1,0,2,1]);
  const rows=[component(split,'seams'),component(minimum,'minimum'),component(nonmanifold,'nonmanifold')],before=detailJSON(rows),simplifier=unchangedSimplifier();
  const result=await buildBuildingDetailVariants(input(rows),{simplifier});
  assert.equal(simplifier.calls,0);assert.equal(result.assets.length,0);assert.equal(result.sidecar.summary.errorSamples,0);
  const diagnostics=result.sidecar.summary.diagnostics;
  assert.equal(diagnostics.inputBatchCount,3);assert.equal(diagnostics.componentLevelAttempts,6);assert.equal(diagnostics.batchLevelAttempts,6);
  assert.equal(diagnostics.preparedBatches,3,'a batch is prepared once for both levels');
  assert(diagnostics.batchTotals.referencedVertices<diagnostics.batchTotals.exactWeldedVertices,'unused vertices are excluded from lock coverage');
  for(const level of ['mid','coarse'])assert.deepEqual(diagnostics.batchOutcomesByLevel[level],{'all-referenced-vertices-boundary-locked':1,'minimum-triangle-count':1,'canonical-topology-nonmanifold':1});
  assert(diagnostics.batchTotals.splitNormalPositionGroups>0);assert.equal(detailJSON(rows),before);
  assert.equal(result.sidecar.schemaVersion,1);assert.equal(result.sidecar.near.referenceOnly,true);assert.equal(result.sidecar.near.reencoded,false);
});

test('exact attribute welding reports array bytes separately from real geometry LOD and generic no-reduction limits',async()=>{
  const batch=soup(grid()),simplifier=unchangedSimplifier(),result=await buildBuildingDetailVariants(input([component(batch)]),{simplifier});
  const diagnostics=result.sidecar.summary.diagnostics,potential=diagnostics.residentByteAlternative;
  assert.equal(diagnostics.preparedBatches,1);assert.equal(diagnostics.simplifierCalls,2);assert.equal(simplifier.calls,2);
  assert.equal(diagnostics.batchTotals.exactWeldedVertices,25);
  assert.equal(potential.attributeBytesBefore,96*24);assert.equal(potential.attributeBytesAfter,25*24);assert.equal(potential.indexBytesBefore,96*4);assert.equal(potential.indexBytesAfter,96*4);
  assert.equal(potential.attributeBytesSavedPotential,(96-25)*24);assert.equal(potential.indexBytesChanged,0);
  assert.equal(potential.triangleCountChanged,false);assert.equal(potential.geometryLOD,false);assert.equal(potential.emitted,false);
  for(const level of ['mid','coarse'])assert.equal(diagnostics.batchOutcomesByLevel[level]['topology-or-error-limit-prevented-reduction'],1);
  assert.equal(result.sidecar.variants.length,0,'lossless vertex compaction is not registered as detail geometry');
});

test('protected whole objects stay canonical and cancellation settles before any candidate artifacts are returned',async()=>{
  const rows=[component(grid(),'protected'),component(grid(),'sibling')],before=detailJSON(rows),simplifier=unchangedSimplifier();
  const protection=createBuildingDetailProtection({paintIdentityOwner:(_city,_id,part)=>part==='protected'?'root500':undefined,paintFamily:()=>0,progressiveRows:[],coverage:{city:'bremen',completeForCity:true},evidence:[{path:'synthetic-protection',sha256:sha}]});
  const result=await buildBuildingDetailVariants(input(rows,{protection}),{simplifier});
  assert.equal(result.sidecar.summary.protectedComponents,2);assert.equal(result.sidecar.summary.diagnostics.preparedBatches,0);assert.equal(simplifier.calls,0);assert.equal(result.assets.length,0);assert.equal(detailJSON(rows),before);
  const controller=new AbortController(),pending=buildBuildingDetailVariants(input([component(grid())],{signal:controller.signal}),{simplifier});
  setImmediate(()=>controller.abort());await assert.rejects(pending,{name:'AbortError'});assert.equal(simplifier.calls,0);
});

const modulePath=process.env.CRIMEMAPS_MESHOPT_SIMPLIFIER;
test('actual meshoptimizer 1.3 reduces eligible planar interiors while preserving SOURCE, attributes, boundary and bindings',{skip:!modulePath},async()=>{
  assert(path.isAbsolute(modulePath),'explicit absolute simplifier path required');
  const packageInfo=JSON.parse(await readFile(path.join(path.dirname(modulePath),'package.json'),'utf8'));
  assert.equal(packageInfo.name,'meshoptimizer');assert.equal(packageInfo.version,MESHOPT_VERSION);
  const bytes=await readFile(modulePath),binding={version:MESHOPT_VERSION,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
  const {MeshoptSimplifier}=await import(pathToFileURL(modulePath).href),rows=[component(soup(grid()))],before=detailJSON(rows);
  const result=await buildBuildingDetailVariants(input(rows),{simplifier:MeshoptSimplifier,simplifierBinding:binding});
  assert(result.assets.length>0,'a genuine eligible small mesh must reduce with unchanged quality constraints');
  for(const detail of result.sidecar.components[0].details.filter(row=>row.status==='reduced')){
    assert(detail.vertices<96);assert(detail.triangles<32);
    assert.equal(detail.oldAdmissionReusable,false);assert.equal(detail.sourceBindingsRef,'#/provenance');assert.equal(detail.materialBindingRef,'#/materialBinding');
    assert(detail.batchMapping.every(batch=>batch.topology.exactBoundaryPreserved&&batch.topology.topologyPreserved&&batch.vertexMapping==='explicit-original-subset'));
    assert(detail.batchMapping.every(batch=>batch.geometryError.hausdorffBound===false));
  }
  assert.equal(result.sidecar.provenance.canonicalIndex.sha256,sha);assert.equal(result.sidecar.materialBinding.sha256,sha);assert.deepEqual(result.sidecar.producer.libraryBinding,binding);assert.equal(detailJSON(rows),before);
});
