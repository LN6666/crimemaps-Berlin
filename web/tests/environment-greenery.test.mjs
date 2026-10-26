import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const entry=`export * from ${JSON.stringify(path.join(safety,'environment-greenery-geometry.ts'))};export * from ${JSON.stringify(path.join(safety,'solar-shadow-admission.ts'))};export * from ${JSON.stringify(path.join(safety,'environment-scene-data.ts'))};`;
const result=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {greenGroundGeometry,treeRowDisplayInstances,prepareSolarShadowBoundary,parseEnvironmentSource,ENVIRONMENT_LIMITS}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const origin=[13.4,52.5],rad=Math.PI/180,scale=6378137*Math.cos(origin[1]*rad),baseY=Math.log(Math.tan(Math.PI/4+origin[1]*rad/2));
const geo=(x,z)=>[origin[0]+x/scale/rad,(2*Math.atan(Math.exp(baseY+z/scale))-Math.PI/2)/rad];
const ring=(x0,z0,x1,z1)=>[geo(x0,z0),geo(x1,z0),geo(x1,z1),geo(x0,z1),geo(x0,z0)];
const bounds=(x0,z0,x1,z1)=>[...geo(x0,z0),...geo(x1,z1)];
const sha='a'.repeat(64),source='b'.repeat(64),props={source_boundary_sha256:sha,source_pbf_sha256:source,source_snapshot:'fixture',displayClip:false,osmTags:{}};
const feature=(id,kind,type,coordinates)=>({type:'Feature',id,properties:{...props,kind},geometry:{type,coordinates}});
const boundary=prepareSolarShadowBoundary({boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[ring(-200,-200,200,200)]}});
const viewport=bounds(-100,-100,100,100);
const green=(id='osm/way/1')=>feature(id,'green','Polygon',[ring(-50,-50,50,50),ring(-10,-10,10,10)]);
const row=(id='osm/way/2',from=-80,to=80)=>feature(id,'tree_row','LineString',[geo(from,0),geo(to,0)]);

test('green ground preserves the native hole, source immutability and packed role, with duplicate source ids removed',()=>{
 const f=green(),before=JSON.stringify(f),mesh=greenGroundGeometry([f,f],origin,viewport,boundary,60000,180000);
 assert.equal(mesh.admitted,1);assert.equal(mesh.held,0);assert.equal(mesh.positions.length/7,8);assert.equal(mesh.indices.length,24);
 let area=0;for(let i=0;i<mesh.indices.length;i+=3){const [a,b,c]=mesh.indices.slice(i,i+3).map(id=>[mesh.positions[id*7],mesh.positions[id*7+2]]);area+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;const centre=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3];assert.ok(Math.abs(centre[0])>=10||Math.abs(centre[1])>=10);}
 assert.ok(Math.abs(area-9600)<.1);for(let i=0;i<mesh.positions.length;i+=7){assert.equal(mesh.positions[i+6],3);assert.deepEqual(mesh.positions.slice(i+3,i+6),[0,1,0]);assert.equal(mesh.positions[i+1],.01);}assert.equal(JSON.stringify(f),before);
});
test('green ground supports multi-polygons, viewport admission and finite shared-buffer budgets',()=>{
 const f=feature('osm/relation/2','green','MultiPolygon',[[ring(-50,-50,-20,-20)],[ring(20,20,50,50)],[ring(300,300,320,320)]]);
 const mesh=greenGroundGeometry([f],origin,viewport,boundary,60000,180000);assert.equal(mesh.admitted,2);assert.equal(mesh.positions.length/7,8);
 const small=greenGroundGeometry([f],origin,viewport,boundary,4,6);assert.equal(small.admitted,1);assert.equal(small.omitted,1);assert.equal(small.positions.length/7,4);
 assert.equal(greenGroundGeometry([f],origin,viewport,boundary,0,0).positions.length,0);
});
test('green ground requires matching verified municipality and rejects paved source surfaces',()=>{
 const f=green();assert.equal(greenGroundGeometry([f],origin,viewport,undefined,60000,180000).held,1);
 assert.equal(greenGroundGeometry([f],origin,viewport,{...boundary,boundarySHA256:'c'.repeat(64)},60000,180000).held,1);
 const paved={...f,properties:{...f.properties,osmTags:{surface:'asphalt'}}};assert.equal(greenGroundGeometry([paved],origin,viewport,boundary,60000,180000).positions.length,0);
 const sourceData={type:'FeatureCollection',schema_version:1,city:'berlin',features:[feature('osm/way/3','green','LineString',[geo(0,0),geo(1,1)])]};assert.throws(()=>parseEnvironmentSource(sourceData,'berlin',sha,source,'fixture'),/kind mismatch/);
});
test('packed green triangles are withheld if their municipality envelope crosses a hole',()=>{
 const municipalHole=prepareSolarShadowBoundary({boundarySHA256:'d'.repeat(64),geometry:{type:'Polygon',coordinates:[ring(-200,-200,200,200),ring(-15,-15,15,15)]}});
 const f=feature('osm/way/4','green','Polygon',[ring(-10,-10,10,10)]);f.properties.source_boundary_sha256=municipalHole.boundarySHA256;
 const mesh=greenGroundGeometry([f],origin,viewport,municipalHole,60000,180000);assert.equal(mesh.indices.length,0);assert.ok(mesh.held>0);
});
test('source-line tree display is deterministic, explicitly labelled and avoids existing native tree points',()=>{
 const f=row(),point=feature('osm/node/5','tree','Point',geo(0,0)),features=[f,point,f],before=JSON.stringify(features);
 const a=treeRowDisplayInstances(features,origin,viewport,boundary,2048,2.3),b=treeRowDisplayInstances(features.slice().reverse(),origin,viewport,boundary,2048,2.3);
 assert.deepEqual(a,b);assert.ok(a.instances.length>5);assert.equal(a.duplicate,1);assert.ok(a.instances.every(p=>Math.hypot(p.x,p.z)>=7));
 for(const p of a.instances){assert.equal(p.id,f.id);assert.equal(p.role,'source-line-display-schematic-not-source-tree-point');assert.equal(p.heightStatus,'display-default');assert.equal(p.height,7);assert.ok(Math.abs(p.z)<.001);}assert.equal(JSON.stringify(features),before);
});
test('row crowns include maximum wind in the verified municipality proof and reject edge and hole overlap',()=>{
 const small=prepareSolarShadowBoundary({boundarySHA256:'e'.repeat(64),geometry:{type:'Polygon',coordinates:[ring(-50,-50,50,50),ring(-3,-3,3,3)]}}),f=row();f.properties.source_boundary_sha256=small.boundarySHA256;
 const a=treeRowDisplayInstances([f],origin,viewport,small,2048,2.3);assert.ok(a.held>0);assert.ok(a.instances.length>0);assert.ok(a.instances.every(p=>Math.abs(p.x)<=47.7&&Math.abs(p.x)>=5.3));
 assert.equal(treeRowDisplayInstances([f],origin,viewport,undefined,2048,2.3).instances.length,0);
 assert.equal(treeRowDisplayInstances([f],origin,viewport,small,2048,5.01).instances.length,0);
});
test('row sampling respects remaining instance capacity and skips distant portions of long source lines',()=>{
 const a=treeRowDisplayInstances([row()],origin,viewport,boundary,2,2.3);assert.equal(a.instances.length,2);assert.equal(a.truncated,true);
 const far=row('osm/way/7',-1000000,1000000),near=treeRowDisplayInstances([far],origin,bounds(-20,-20,20,20),boundary,2048,2.3);
 assert.ok(near.candidates<=6);assert.ok(near.instances.length>0);assert.equal(near.truncated,false);assert.ok(near.candidates<ENVIRONMENT_LIMITS.treeRowCandidateLimit);
});
