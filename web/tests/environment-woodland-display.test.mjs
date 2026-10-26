import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const entry=['environment-woodland-display.ts','environment-scene-data.ts','solar-shadow-admission.ts'].map(f=>'export * from '+JSON.stringify(path.join(safety,f))+';').join('');
const built=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {woodlandDisplayInstances:sample,isWoodlandDisplaySource,WOODLAND_DISPLAY_LIMITS:limits,lowPolyTreeMesh,prepareSolarShadowBoundary,currentSolarShadowBoundary}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const origin=[13.4,52.5],rad=Math.PI/180,scale=6378137*Math.cos(origin[1]*rad),baseY=Math.log(Math.tan(Math.PI/4+origin[1]*rad/2)),sha='a'.repeat(64),radius=lowPolyTreeMesh().horizontalRadiusMetres+.08;
const geo=(x,z)=>[origin[0]+x/scale/rad,(2*Math.atan(Math.exp(baseY+z/scale))-Math.PI/2)/rad];
const local=(lon,lat)=>[(lon-origin[0])*rad*scale,(Math.log(Math.tan(Math.PI/4+lat*rad/2))-baseY)*scale];
const ring=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]].map(p=>geo(...p));
const box=(x0,z0,x1,z1)=>[...geo(x0,z0),...geo(x1,z1)];
const feature=(id,tags,coordinates=[ring(-100,-100,100,100)],kind='green')=>({type:'Feature',id,geometry:{type:'Polygon',coordinates},properties:{kind,osmTags:tags,source_boundary_sha256:sha,source_pbf_sha256:'b'.repeat(64),source_snapshot:'fixture',displayClip:false}});
const forest=(id='osm/way/1',coordinates)=>feature(id,{landuse:'forest'},coordinates);
const boundary={boundarySHA256:sha,vertices:4,covers:()=>true},view=box(-100,-100,100,100);
const intersects=(p,b)=>p.x+radius>=b[0]&&p.x-radius<=b[2]&&p.z+radius>=b[1]&&p.z-radius<=b[3];

test('only explicit woodland tags qualify, while park/garden/grass and paved forest surfaces do not',()=>{
 for(const tags of [{natural:'wood'},{landuse:'forest'},{landuse:'orchard'},{landcover:'trees'}]){const f=feature('osm/way/1',tags);assert.equal(isWoodlandDisplaySource(f),true);assert.ok(sample([f],origin,view,boundary,32,radius).instances.length>0);}
 for(const tags of [{leisure:'park'},{leisure:'garden'},{landuse:'grass'},{landuse:'meadow'},{landuse:'village_green'},{natural:'grassland'},{landuse:'forest',surface:'asphalt'},{natural:'wood',surface:'grass'}]){const f=feature('osm/way/1',tags);assert.equal(isWoodlandDisplaySource(f),false);assert.equal(sample([f],origin,view,boundary,32,radius).instances.length,0);}
});

test('full packed crown and wind remain within source rings, source holes and the verified municipality',()=>{
 const f=forest('osm/way/1',[ring(-100,-100,100,100),ring(-30,-30,30,30)]),original=JSON.stringify(f),b=prepareSolarShadowBoundary({boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[ring(-120,-120,80,120),ring(40,-20,60,20)]}});
 const result=sample([f],origin,view,b,2048,radius);assert.ok(result.instances.length>100);
 for(const p of result.instances){assert.ok(p.x-radius>-100&&p.x+radius<80&&p.z-radius>-100&&p.z+radius<100);assert.equal(intersects(p,[-30,-30,30,30]),false);assert.equal(intersects(p,[40,-20,60,20]),false);assert.equal(p.height,7);assert.equal(p.heightStatus,'display-default');assert.equal(p.sourceId,f.id);assert.equal(p.kind,'wood');assert.ok(p.id.startsWith('woodland:')&&!p.id.startsWith('osm/'));assert.equal(p.role,'source-woodland-display-schematic-not-source-tree-point');const xy=local(p.lon,p.lat);assert.ok(Math.abs(xy[0]-p.x)<1e-6&&Math.abs(xy[1]-p.z)<1e-6);}
 assert.equal(JSON.stringify(f),original);
});

test('known water, explicit grass and pavement subareas exclude the entire crown without erasing water islands',()=>{
 const f=forest(),water=feature('osm/way/2',{},[ring(-90,-90,-30,90)],'water'),grass=feature('osm/way/3',{landuse:'grass'},[ring(0,-90,30,90)]),paved=feature('osm/way/4',{surface:'paving_stones'},[ring(50,-90,70,90)]);
 const input=[f,water,grass,paved],before=JSON.stringify(input),result=sample(input,origin,view,boundary,2048,radius);assert.ok(result.instances.length>40);
 for(const p of result.instances)for(const b of [[-90,-90,-30,90],[0,-90,30,90],[50,-90,70,90]])assert.equal(intersects(p,b),false);
 const lake=feature('osm/way/5',{},[ring(-120,-120,120,120),ring(-40,-40,40,40)],'water'),island=sample([f,lake],origin,view,boundary,2048,radius);assert.ok(island.instances.length>10);assert.ok(island.instances.every(p=>Math.abs(p.x)+radius<40&&Math.abs(p.z)+radius<40));assert.equal(JSON.stringify(input),before);
});

test('native points and supplied row displays win, including native points excluded from model budgets',()=>{
 const f=forest(),first=sample([f],origin,view,boundary,32,radius).instances;assert.ok(first.length>2);
 const native={...f,id:'osm/node/2',geometry:{type:'Point',coordinates:[first[0].lon,first[0].lat]},properties:{...f.properties,kind:'tree'}},rows=[{x:first[1].x,z:first[1].z}],before=JSON.stringify([f,native,rows]);
 const after=sample([native,f],origin,view,boundary,2048,radius,rows);assert.ok(after.duplicate>=2);for(const p of after.instances)for(const q of first.slice(0,2))assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>=7-1e-5);assert.equal(JSON.stringify([f,native,rows]),before);
});

test('source order and viewport pan do not move world-anchored points or mutate geometry',()=>{
 const features=[forest('osm/way/2',[ring(-180,-100,0,100)]),forest('osm/way/1',[ring(-20,-100,180,100)])],aView=box(-140,-80,100,80),bView=box(-90,-80,150,80),before=JSON.stringify(features);
 const a=sample(features,origin,aView,boundary,2048,radius),reversed=sample(features.slice().reverse(),origin,aView,boundary,2048,radius),b=sample(features,origin,bView,boundary,2048,radius);
 assert.deepEqual(a,reversed);const aOverlap=a.instances.filter(p=>p.x>=-90&&p.x<=100),bMap=new Map(b.instances.map(p=>[p.id,p]));assert.ok(aOverlap.length>100);for(const p of aOverlap)assert.deepEqual(bMap.get(p.id),p);assert.equal(JSON.stringify(features),before);assert.equal(new Set(a.instances.map(p=>p.id)).size,a.instances.length);
});

test('a small instance cap distributes candidates across separate source areas instead of filling the first polygon',()=>{
 const features=[forest('osm/way/1',[ring(-200,-100,-20,100)]),forest('osm/way/2',[ring(20,-100,200,100)])],result=sample(features,origin,box(-210,-110,210,110),boundary,8,radius);
 assert.equal(result.instances.length,8);assert.deepEqual(new Set(result.instances.map(p=>p.sourceId)),new Set(features.map(f=>f.id)));assert.equal(result.instances.filter(p=>p.sourceId===features[0].id).length,4);assert.ok(result.instances.some(p=>p.z<0)&&result.instances.some(p=>p.z>0));assert.equal(result.truncated,true);assert.equal(result.reason,'instance-budget');
});

test('very large areas have a hard candidate/work bound without allocating an area-sized point array',()=>{
 const f=forest('osm/way/1',[ring(-100000,-100000,100000,100000)]),large=box(-90000,-90000,90000,90000),deny={...boundary,covers:()=>false};
 const result=sample([f],origin,large,deny,2048,radius);assert.equal(result.instances.length,0);assert.equal(result.candidates,limits.candidates);assert.ok(result.edgeChecks<=limits.edgeChecks);assert.equal(result.truncated,true);
 const fill=sample([f],origin,large,boundary,100000,radius);assert.equal(fill.instances.length,limits.instances);assert.ok(fill.candidates<=limits.candidates);assert.ok(fill.instances.some(p=>p.x<-10000)&&fill.instances.some(p=>p.x>10000)&&fill.instances.some(p=>p.z<-10000)&&fill.instances.some(p=>p.z>10000));
});

test('concave source boundaries and small enclosed holes reject crowns even when nearby corners are in forest',()=>{
 const notch=[[-100,-100],[100,-100],[100,100],[15,100],[15,0],[-15,0],[-15,100],[-100,100],[-100,-100]].map(p=>geo(...p)),f=forest('osm/way/1',[notch,ring(-45,-45,-35,-35)]),result=sample([f],origin,view,boundary,2048,radius);assert.ok(result.instances.length>100);
 for(const p of result.instances){assert.equal(intersects(p,[-15,0,15,100]),false);assert.equal(intersects(p,[-45,-45,-35,-35]),false);}
});

test('incomplete exclusions and unverified boundaries fail closed; source preparation never occupies the global city cache',()=>{
 const cityA=prepareSolarShadowBoundary({boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[ring(-1000,-1000,1000,1000)]}}),cityB=prepareSolarShadowBoundary({boundarySHA256:'c'.repeat(64),geometry:{type:'Polygon',coordinates:[ring(-1000,-1000,1000,1000)]}}),f=forest();
 assert.equal(sample([f],origin,view,undefined,32,radius).instances.length,0);assert.equal(sample([f],origin,view,cityB,32,radius).instances.length,0);assert.equal(sample([f],origin,view,cityA,32,5.1).instances.length,0);
 const broken=feature('osm/way/2',{},[[...ring(-20,-20,20,20).slice(0,-1)]],'water'),result=sample([f,broken],origin,view,cityA,32,radius);assert.equal(result.instances.length,0);assert.equal(result.reason,'incomplete-known-exclusions');
 sample([f],origin,view,cityA,32,radius);assert.equal(currentSolarShadowBoundary(sha),cityA);assert.equal(currentSolarShadowBoundary('c'.repeat(64)),cityB);
});

test('hundreds of distant loaded exclusions do not exhaust the local polygon budget or skip a nearby exclusion',()=>{
 const far=Array.from({length:600},(_,i)=>feature('osm/way/'+(100+i),{landuse:'grass'},[ring(1000+i*25,1000,1010+i*25,1010)])),near=feature('osm/way/2',{surface:'concrete'},[ring(-30,-80,30,80)]),f=forest(),result=sample([...far,near,f],origin,view,boundary,2048,radius);
 assert.ok(result.instances.length>100);assert.equal(result.exclusionPolygons,1);assert.equal(result.sourcePolygons,1);assert.equal(result.reason,'ready');for(const p of result.instances)assert.equal(intersects(p,[-30,-80,30,80]),false);
 const crowded=Array.from({length:limits.polygons+1},(_,i)=>feature('osm/way/'+(1000+i),{surface:'asphalt'},[ring(-20,-20,20,20)])),closed=sample([f,...crowded],origin,view,boundary,2048,radius);assert.equal(closed.instances.length,0);assert.equal(closed.reason,'incomplete-known-exclusions');
});
