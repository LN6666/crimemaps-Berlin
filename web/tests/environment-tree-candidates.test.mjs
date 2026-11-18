import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const safety=new URL('../src/safety/',import.meta.url).pathname;
const built=await build({stdin:{contents:`export {treeRowDisplayCandidates} from './environment-greenery-geometry';export {createEnvironmentSceneRenderer} from './environment-scene-renderer';export {prepareSolarShadowBoundary} from './solar-shadow-admission';`,resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',preserveSymlinks:true});
const {treeRowDisplayCandidates,createEnvironmentSceneRenderer,prepareSolarShadowBoundary}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const origin=[13.4,52.5],rad=Math.PI/180,scale=6378137*Math.cos(origin[1]*rad),baseY=Math.log(Math.tan(Math.PI/4+origin[1]*rad/2));
const geo=(x,z)=>[origin[0]+x/scale/rad,(2*Math.atan(Math.exp(baseY+z/scale))-Math.PI/2)/rad];
const box=(a,b,c,d)=>[...geo(a,b),...geo(c,d)];
const ring=(a,b,c,d)=>[geo(a,b),geo(c,b),geo(c,d),geo(a,d),geo(a,b)];
const sha='a'.repeat(64),properties={source_boundary_sha256:sha,source_pbf_sha256:'b'.repeat(64),source_snapshot:'fixture',displayClip:false};
const row=(id,x0,z0,x1,z1)=>({id,type:'Feature',geometry:{type:'LineString',coordinates:[geo(x0,z0),geo(x1,z1)]},properties:{...properties,kind:'tree_row',osmTags:{}}});
const boundary=prepareSolarShadowBoundary({boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[ring(-200000,-200000,200000,200000)]}});

test('renderer selects from the complete bounded row stream, including later source cells beyond treeCap',()=>{
  const features=Array.from({length:64},(_,i)=>row(`osm/way/${String(i).padStart(3,'0')}`,10,10+i*10,990,10+i*10)),before=JSON.stringify(features);
  const renderer=createEnvironmentSceneRenderer({triggerRepaint(){}},{origin,mobile:true,verifiedBoundary:boundary});
  renderer.setFeatures(features,box(0,0,1000,1000));
  const stats=renderer.stats,evidence=renderer.treeDisplayEvidence;
  assert.equal(stats.trees,512);assert(stats.treeRows.generatedInstances>512);assert.equal(stats.treeSelection.eligibleByKind.row,stats.treeRows.generatedInstances);
  assert(stats.treeRows.scannedSlots<=8192);assert(stats.treeSelection.peakRetainedCandidates<=1536);
  assert(evidence.some(tree=>Number(tree.id.split('/').at(-1))<16));assert(evidence.some(tree=>Number(tree.id.split('/').at(-1))>=48),'later rows must reach the shared spatial selector');
  renderer.setFeatures([...features].reverse(),box(0,0,1000,1000));
  assert.deepEqual(renderer.treeDisplayEvidence.map(tree=>tree.displayId),evidence.map(tree=>tree.displayId));
  assert.equal(JSON.stringify(features),before);assert.equal(stats.treeTrianglesPerInstance,112);renderer.destroy();
});

test('row work limit takes turns across sources and stable world-distance slots rather than a long-source prefix',()=>{
  const features=[row('osm/way/a',-100000,0,100000,0),row('osm/way/z',-40,40,40,40)],view=box(-100001,-100,100001,100);
  const stream=treeRowDisplayCandidates(features,origin,view,boundary,2.3),items=[...stream.instances];
  assert.equal(stream.stats.scannedSlots,8192);assert.equal(stream.stats.truncated,true);assert(items.some(tree=>tree.id==='osm/way/z'));
  assert(items.some(tree=>tree.x<-50000)&&items.some(tree=>tree.x>50000));
  const panned=treeRowDisplayCandidates(features,origin,box(-90000,-100,110000,100),boundary,2.3),positions=new Map(items.map(tree=>[`${tree.id}:${tree.rowSample}`,`${tree.x}:${tree.z}`]));
  let common=0;for(const tree of panned.instances){const position=positions.get(`${tree.id}:${tree.rowSample}`);if(position!==undefined){common++;assert.equal(`${tree.x}:${tree.z}`,position);}}
  assert(common>100,'overlapping views retain world-slot identities and positions');
});

test('renderer woodland candidates continue beyond the model budget into the same bounded selector',()=>{
  const forest={id:'osm/way/forest',type:'Feature',geometry:{type:'Polygon',coordinates:[ring(-500,-500,500,500),ring(-80,-80,80,80)]},properties:{...properties,kind:'green',osmTags:{landuse:'forest'}}};
  const renderer=createEnvironmentSceneRenderer({triggerRepaint(){}},{origin,mobile:true,verifiedBoundary:boundary});
  renderer.setFeatures([forest],box(-500,-500,500,500));const stats=renderer.stats;
  assert.equal(stats.trees,512);assert(stats.woodland.generatedInstances>512);assert.equal(stats.treeSelection.eligibleByKind.wood,stats.woodland.generatedInstances);
  assert(stats.woodland.candidates<=8192);assert(stats.woodland.edgeChecks<=1000000);assert(stats.treeSelection.peakRetainedCandidates<=1536);
  assert(renderer.treeDisplayEvidence.every(tree=>tree.role==='source-woodland-display-schematic-not-source-tree-point'));renderer.destroy();
});
