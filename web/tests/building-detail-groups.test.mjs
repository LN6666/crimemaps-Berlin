import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

// Authored for the centralized validation batch; this file is not executed
// during the resource-streaming implementation phase.
const compiled = await build({entryPoints: [new URL('../src/safety/building-detail-groups.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
const {parseBuildingDetailGroups} = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const sha = 'a'.repeat(64);
function fixture() {
 const binding = {sourcePBFSHA256:sha,boundarySHA256:sha,compilerSHA256:sha,sourceSnapshot:'synthetic',materialSHA256:sha,producerSHA256:sha,protectionSHA256:sha,sourceEquivalenceSHA256:sha};
 const identity = {city:'berlin',objectId:'osm/way/1',partId:'whole',origin:[13,52]};
 const source = {schema_version:1,city:'berlin',components:[{...identity,batches:[{positions:new Float32Array(9),normals:new Float32Array(9),indices:new Uint32Array([0,1,2])}]}]};
 const resource = {city:'berlin',level:'near',canonicalIndexSHA256:sha,canonicalLeafSHA256:sha,geometrySHA256:sha,bindings:binding,componentCount:1,components:[identity],vertices:3,triangles:1};
 const authority = {...binding,canonicalIndexSHA256:sha,canonicalLeafSHA256:sha};
 const span = {componentIndex:0,batchIndex:0,sourceIndexBase:'batch-local',vertexCount:3,indexCount:3,packedVertexOffset:0,packedIndexOffset:0,positionsSHA256:sha,normalsSHA256:sha,indicesSHA256:sha,materialMetadataSHA256:sha};
 const range = {componentIndex:0,objectId:identity.objectId,partId:identity.partId,packedVertexOffset:0,packedIndexOffset:0,vertexCount:3,indexCount:3,batchSpans:[span]};
 const constraint = {key:sha,observedComponentIndices:[0],sourceObject:{city:identity.city,objectId:identity.objectId},completeAcrossLeaves:false,closure:'requires-runtime-cohort',mayPublishIndependently:false,canonicalOnly:true};
 const group = {key:sha,kind:'physical-packing-group',geometryRole:'canonical',unit:'meter',level:'near',componentIndices:[0],publicationConstraintKey:sha,authority:{...authority,selectedGeometrySHA256:sha},anchor:[13,52],componentRanges:[range],vertices:3,indices:3,triangles:1};
 const document = {schema:'crimemaps-building-detail-groups-v1',schemaVersion:1,city:'berlin',key:sha,authority,
  coordinateFrame:{schema:'source-local-mercator-meters-v1',unit:'meter',axes:{x:'east',y:'up',z:'north'},anchorPrecision:'float64',arithmetic:'double-source-origin-minus-stable-anchor-before-float32',earthCircumferenceM:2*Math.PI*6378137},
  canonicalComponents:[{componentIndex:0,...identity}],publicationConstraints:[constraint],levels:[{level:'near',geometrySHA256:sha,sourceEquivalenceSHA256:sha,componentCount:1,vertices:3,triangles:1,indices:3,packingGroups:[group]}]};
 return {document,resource,source,group,constraint,span};
}
test('physical source groups preserve the producer anchor and require runtime cohort closure', () => {
 const f=fixture(), parsed=parseBuildingDetailGroups(f.document,f.resource,f.source);
 assert.deepEqual(parsed.packingGroups[0].anchor,[13,52]);
 assert.equal(parsed.publicationConstraints[0].mayPublishIndependently,false);
 assert.equal(parsed.publicationConstraints[0].closure,'requires-runtime-cohort');
});
test('camera-derived anchors, incomplete ranges and invented cross-leaf closure are rejected', () => {
 for(const mutate of [f=>{f.group.anchor=[13.01,52];},f=>{f.span.indexCount=0;},f=>{f.constraint.completeAcrossLeaves=true;},f=>{f.constraint.mayPublishIndependently=true;},f=>{f.group.componentIndices=[0,0];}]){
  const f=fixture();mutate(f);assert.throws(()=>parseBuildingDetailGroups(f.document,f.resource,f.source),/Invalid detail group/);
 }
});
