import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const webRoot=path.dirname(path.dirname(fileURLToPath(import.meta.url))),projectRoot=path.dirname(webRoot);
async function bundle(name){const result=await build({entryPoints:[path.join(webRoot,'src/safety',name)],bundle:true,write:false,platform:'node',format:'esm',target:'es2022'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const solar=await bundle('scene-solar-light.ts');
const {createEnvironmentMotion}=await bundle('environment-motion.ts');
const {sceneDrawingPixelRatio,SCENE_QUALITY_PROFILES}=await bundle('scene-environment-quality.ts');
const {prepareSolarShadowBoundary,currentSolarShadowBoundary,solarShadowBoxForPackedBounds,residentSolarShadowRanges}=await bundle('solar-shadow-admission.ts');
const {sceneBerlinNoonInstant,checkedSceneEnvironment,defaultSceneEnvironment}=await bundle('scene-environment-state.ts');

test('solar light follows east-to-west sun motion and dark winter night', () => {
  const morning = solar.sceneSolarLight(0, 51.5, '2026-06-21T08:00:00Z');
  const afternoon = solar.sceneSolarLight(0, 51.5, '2026-06-21T16:00:00Z');
  const noon = solar.sceneSolarLight(0, 51.5, '2026-06-21T12:00:00Z');
  const night = solar.sceneSolarLight(13.4, 52.5, '2026-12-21T00:00:00Z');
  assert.ok(morning.direction[0] > 0); assert.ok(afternoon.direction[0] < 0);
  assert.ok(noon.altitudeDegrees > 60 && noon.altitudeDegrees < 63);
  assert.ok(noon.altitudeDegrees > morning.altitudeDegrees);
  assert.equal(night.daylight, 0); assert.equal(night.shadowVector, undefined);
  assert.ok(morning.shadowVector[0] < 0); assert.ok(afternoon.shadowVector[0] > 0);
  for (const light of [morning, afternoon, noon, night]) assert.ok(Math.abs(Math.hypot(...light.direction) - 1) < 1e-12);
});
test('sunlight uses explicit instants, offsets and leap days', () => {
  const a = solar.sceneSolarLight(13.4, 52.5, '2026-06-21T15:00:00+02:00');
  const b = solar.sceneSolarLight(13.4, 52.5, '2026-06-21T13:00:00Z');
  assert.deepEqual(a, b);
  assert.ok(Number.isFinite(solar.sceneSolarLight(13.4, 52.5, '2028-02-29T12:00:00Z').altitudeDegrees));
  assert.throws(() => solar.sceneSolarLight(13.4, 52.5, '2026-06-21T13:00:00'));
  assert.throws(() => solar.sceneSolarLight(0, 90));
});
test('one fixed Berlin calendar date updates 06/09/12/15/18/night solar bearing and shadow length', async () => {
  const rows = [0,6,9,12,15,18,21,23].map(hour => {
    const berlinLocal = `2026-06-21T${String(hour).padStart(2,'0')}:00:00+02:00`;
    const light = solar.sceneSolarLight(13.4,52.5,berlinLocal);
    const bearing = light.shadowVector ? (Math.atan2(...light.shadowVector) * 180 / Math.PI + 360) % 360 : null;
    return {berlinLocal,instantISO:light.instantISO,azimuthDegrees:light.azimuthDegrees,altitudeDegrees:light.altitudeDegrees,
      shadowBearingDegrees:bearing,shadowMetresPerMetre:light.shadowVector ? Math.hypot(...light.shadowVector) : null,
      shadowFor40mBuildingMetres:light.shadowVector ? 40*Math.hypot(...light.shadowVector) : null,shadowVector:light.shadowVector??null};
  });
  const at = hour => rows.find(row=>Number(row.berlinLocal.slice(11,13))===hour);
  for(const hour of [6,9,12,15,18,21]) {
    const row=at(hour),expectedBearing=(row.azimuthDegrees+180)%360;
    assert.ok(row.shadowMetresPerMetre>0,`${hour}:00 has a daylight shadow`);
    assert.ok(Math.abs(row.shadowBearingDegrees-expectedBearing)<1e-10);
    assert.ok(Math.abs(row.shadowMetresPerMetre-1/Math.tan(row.altitudeDegrees*Math.PI/180))<1e-10);
  }
  assert.ok(at(6).altitudeDegrees<12); // The previous 12-degree cutoff lost this actual low-sun projection.
  assert.ok(at(6).shadowVector[0]<0 && at(18).shadowVector[0]>0);
  assert.ok(at(6).shadowMetresPerMetre>at(9).shadowMetresPerMetre);
  assert.ok(at(9).shadowMetresPerMetre>at(12).shadowMetresPerMetre);
  assert.ok(at(18).shadowMetresPerMetre>at(15).shadowMetresPerMetre);
  for(const hour of [0,23])assert.equal(at(hour).shadowVector,null);
});
test('all 1440 minutes of one Berlin day project above 0.5 degrees and never clamp to a fixed length', () => {
  let day=0,night=0,low=0,previous;
  for(let minute=0;minute<1440;minute++) {
    const light=solar.sceneSolarLight(13.4,52.5,`2026-06-21T${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}:00+02:00`);
    if(light.altitudeDegrees>solar.SCENE_SHADOW_MIN_ALTITUDE_DEGREES) {
      day++;if(light.altitudeDegrees<12)low++;
      assert.ok(light.shadowVector);
      const [east,north]=light.shadowVector;
      assert.ok(Math.abs(east*light.direction[1]+light.direction[0])<1e-12);
      assert.ok(Math.abs(north*light.direction[1]+light.direction[2])<1e-12);
      assert.ok(Math.hypot(east,north)<1/Math.tan(.5*Math.PI/180));
      if(previous)assert.notDeepEqual(light.shadowVector,previous);
      previous=light.shadowVector;
    }else{night++;assert.equal(light.shadowVector,undefined);previous=undefined;}
  }
  assert.ok(day>900 && night>400 && low>100);
});
test('solar swept rectangle contains all ground and full-height projections without editing mesh', () => {
  const light = solar.sceneSolarLight(13.4, 52.5), positions = new Float32Array([-20, 0, -30, 20, 40, 30]);
  const original = new Float32Array(positions);
  const bbox = solar.solarShadowSweptBBox([13.4, 52.5], [{positions}], light);
  assert.ok(bbox[0] < 13.4 && bbox[2] > 13.4 && bbox[1] < 52.5 && bbox[3] > 52.5);
  assert.deepEqual(positions, original);
  assert.throws(() => solar.solarShadowSweptBBox([13.4, 52.5], [{positions: [0, -1, 0]}], light));
});
test('environment phase freezes when hidden, offscreen or reduced and resumes without time jump', () => {
  const motion = createEnvironmentMotion(); motion.setEnabled(true);
  assert.equal(motion.frame(0, 24).active, true); motion.frame(100, 24);
  assert.equal(motion.stats.elapsedSeconds, .1);
  motion.setVisible(false); assert.equal(motion.frame(100000, 24).active, false);
  motion.setVisible(true); assert.equal(motion.frame(100100, 24).seconds, .1);
  motion.setReducedMotion(true); assert.equal(motion.frame(100200, 24).changed, false);
  motion.setReducedMotion(false); motion.setOffscreen(true); assert.equal(motion.frame(100300, 24).active, false);
  motion.setOffscreen(false); motion.frame(100400, 24); motion.frame(100450, 24);
  assert.ok(Math.abs(motion.stats.elapsedSeconds - .15) < 1e-12);
  assert.equal(motion.stats.timers, 0); motion.destroy(); assert.equal(motion.frame(100500, 24).active, false);
});
test('active environment time follows elapsed time at low or irregular frame cadence', () => {
  for (const times of [[0,50,100,250,1000,2500], [0,500,1000,1500,2000,2500], [0,2500]]) {
    const motion=createEnvironmentMotion(); motion.setEnabled(true);
    for (const now of times) motion.frame(now,24);
    assert.equal(motion.stats.elapsedSeconds,2.5);
    assert.equal(motion.stats.timers,0); assert.equal(motion.stats.animationFrames,0);
  }
});
test('all inactive modes discard paused time, and unchanged state does not reset active time', () => {
  for (const [method,paused,resumed] of [['setEnabled',false,true],['setVisible',false,true],['setReducedMotion',true,false],['setOffscreen',true,false]]) {
    const motion=createEnvironmentMotion(); motion.setEnabled(true); motion.frame(0,24); motion.frame(500,24);
    motion[method](paused); assert.equal(motion.frame(60000,24).active,false);
    motion[method](resumed); assert.equal(motion.frame(120000,24).seconds,.5);
    motion[method](resumed); assert.equal(motion.frame(120500,24).seconds,1);
    assert.equal(motion.frame(120501,24).changed,false);
  }
});
test('quality caps physical pixels without enlarging CSS dimensions', () => {
  const width = 1920, height = 1080, ratio = sceneDrawingPixelRatio(width, height, 3, 'balanced');
  assert.ok(ratio <= 1.5); assert.ok(width * height * ratio * ratio <= 6000000.001);
  assert.equal(sceneDrawingPixelRatio(400, 800, 3, 'detail'), 2);
  assert.equal(sceneDrawingPixelRatio(400, 800, 1, 'detail'), 1);
  assert.deepEqual(['economy','balanced','detail'].map(q=>SCENE_QUALITY_PROFILES[q].maxDrawingPixels),[3000000,6000000,12000000]);
  for(const quality of ['economy','balanced','detail']) {
    const actual=sceneDrawingPixelRatio(3840,2160,3,quality);
    assert.ok(3840*2160*actual*actual<=SCENE_QUALITY_PROFILES[quality].maxDrawingPixels+.001);
  }
});
test('Berlin noon uses the correct side of both DST transitions', () => {
  assert.equal(sceneBerlinNoonInstant(new Date('2026-03-28T12:00:00Z')), '2026-03-28T12:00:00+01:00');
  assert.equal(sceneBerlinNoonInstant(new Date('2026-03-29T12:00:00Z')), '2026-03-29T12:00:00+02:00');
  assert.equal(sceneBerlinNoonInstant(new Date('2026-10-24T12:00:00Z')), '2026-10-24T12:00:00+02:00');
  assert.equal(sceneBerlinNoonInstant(new Date('2026-10-25T12:00:00Z')), '2026-10-25T12:00:00+01:00');
  assert.throws(()=>checkedSceneEnvironment({...defaultSceneEnvironment(),quality:'unknown'}));
});
test('solar city coverage rejects holes, concavities and island gaps even when corners look inside', () => {
  const square=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
  const geometry={type:'Polygon',coordinates:[square(0,0,10,10),square(4,4,6,6)]};
  const original=JSON.stringify(geometry);
  const admitted=prepareSolarShadowBoundary({boundarySHA256:'a'.repeat(64),geometry});
  assert.equal(admitted.covers([1,1,2,2]),true);
  assert.equal(admitted.covers([3,3,7,7]),false); // Entire hole lies between the four corners.
  assert.equal(admitted.covers([4.2,4.2,5.8,5.8]),false);
  assert.equal(admitted.covers([0,1,2,2]),false); // Boundary-touching is deliberately conservative.
  assert.equal(JSON.stringify(geometry),original);
  const islands=prepareSolarShadowBoundary({boundarySHA256:'b'.repeat(64),geometry:{type:'MultiPolygon',coordinates:[[square(0,0,4,10)],[square(6,0,10,10)]]}});
  assert.equal(islands.covers([1,1,9,9]),false);
  assert.equal(islands.covers([6.2,1,9,9]),true);
});
test('packed box solar proof is conservative over source vertices and clips below-ground height at ground', () => {
  const light=solar.sceneSolarLight(13.4,52.5);
  const proof=solarShadowBoxForPackedBounds([13.4,52.5],[-20,0,-30,20,40,30],light);
  const mesh=solar.solarShadowSweptBBox([13.4,52.5],[{positions:[-20,0,-30,20,40,30]}],light);
  assert.ok(proof[0]<=mesh[0]&&proof[1]<=mesh[1]&&proof[2]>=mesh[2]&&proof[3]>=mesh[3]);
  assert.deepEqual(solarShadowBoxForPackedBounds([13.4,52.5],[-20,-1,-30,20,40,30],light),proof);
  assert.equal(solarShadowBoxForPackedBounds([13.4,52.5],[-20,-10,-30,20,-1,30],light),undefined);
});
test('low solar angle retains the physical long projection and requires whole city coverage', () => {
  const light=solar.sceneSolarLight(13.4,52.5,'2026-06-21T05:00:00+02:00');
  assert.ok(light.altitudeDegrees>.5 && light.altitudeDegrees<2);
  assert.ok(Math.hypot(...light.shadowVector)*40>1900);
  const box=solarShadowBoxForPackedBounds([13.4,52.5],[-20,0,-30,20,40,30],light);
  const boundary=(offset,sha)=>prepareSolarShadowBoundary({boundarySHA256:sha.repeat(64),geometry:{type:'Polygon',coordinates:[[
    [13.4-offset,52.5-offset],[13.4+offset,52.5-offset],[13.4+offset,52.5+offset],[13.4-offset,52.5+offset],[13.4-offset,52.5-offset]]]}});
  assert.equal(boundary(.1,'c').covers(box),true);
  assert.equal(boundary(.001,'d').covers(box),false);
});
test('all renderer candidates use time-dependent solar uniforms without a fixed shadow fallback', async () => {
  const receipt={files:[{"path": "web/src/safety/building-mesh-renderer.ts"}, {"path": "web/src/painted/bremen/safety/building-mesh-renderer.ts"}, {"path": "web/src/painted/tier300/safety/building-mesh-renderer.ts"}, {"path": "web/src/painted/church/safety/building-mesh-renderer.ts"}, {"path": "web/src/painted/root500/safety/building-mesh-renderer.ts"}, {"path": "web/src/painted/delegated500/safety/building-mesh-renderer.ts"}, {"path": "web/src/painted/infill/safety/building-mesh-renderer.ts"}, {"path": "web/src/painted/city/safety/building-mesh-renderer.ts"}, {"path": "web/src/painted/bremen/safety/three-dimensional-map.ts"}, {"path": "web/src/painted/tier300/safety/three-dimensional-map.ts"}, {"path": "web/src/painted/church/safety/three-dimensional-map.ts"}, {"path": "web/src/painted/root500/safety/three-dimensional-map.ts"}, {"path": "web/src/painted/delegated500/safety/three-dimensional-map.ts"}, {"path": "web/src/painted/infill/safety/three-dimensional-map.ts"}, {"path": "web/src/painted/city/safety/three-dimensional-map.ts"}]};
  const rendererFiles=receipt.files.filter(row=>row.path.endsWith('/building-mesh-renderer.ts'));
  assert.equal(rendererFiles.length,8);
  for(const row of rendererFiles) {
    const text=await fs.readFile(path.join(projectRoot,row.path),'utf8');
    assert.ok(text.includes('const solarVector=sceneSun.shadowVector;'),row.path);
    assert.ok(text.includes('residentSolarShadowRanges(sceneSunOrigin,loaded.values(),sceneSun,solarBoundary,generation,indices.length)'),row.path);
    assert.ok(text.includes("geometryRole:'accepted-resident-display-mesh'"),row.path);
    assert.ok(text.includes('minimumShadowSolarAltitudeDegrees:SCENE_SHADOW_MIN_ALTITUDE_DEGREES'),row.path);
    assert.ok(text.includes('if(signature===solarShadowSignature)return false;'),row.path);
    assert.ok(text.includes('if(updateSolarShadowIndices())uploadShadow();map.triggerRepaint();'),row.path);
    assert.ok(text.includes('if(nextReduced!==reducedMotion){reducedMotion=nextReduced;needsBirth=true;'),row.path);
    assert.ok(!text.includes("solarShadowMode='fixed-display-schematic'"),row.path);
    assert.ok(!text.includes('sceneEnvironment.sunlight?sceneSun.shadowVector:SOURCE_SHADOW_VECTOR'),row.path);
    assert.ok(text.includes('fixedShadowIndices=new Uint32Array();fixedShadowRanges=[];solarShadowAdmittedKeys.clear();solarBoundary=undefined;'),row.path);
  }
  const managerFiles=receipt.files.filter(row=>row.path.endsWith('/three-dimensional-map.ts'));
  assert.equal(managerFiles.length,7);
  for(const row of managerFiles) {
    const text=await fs.readFile(path.join(projectRoot,row.path),'utf8');
    assert.ok(text.includes('manifest=value;renderer!.setSolarShadowBoundary({geometry:boundary,boundarySHA256:value.city_boundary.sha256});'),row.path);
  }
  const dedicated=await fs.readFile(path.join(webRoot,'src/safety/dedicated-reichstag-mesh.ts'),'utf8');
  assert.ok(dedicated.includes('currentSolarShadowBoundary(mesh.boundarySHA)'));
  assert.ok(dedicated.includes('solarShadowBoxForPackedBounds(mesh.origin,solarBounds,sun)'));
  assert.ok(dedicated.includes("geometryRole:'accepted-dedicated-procedural-display',sourceCommit:mesh.sourceCommit"));
  assert.ok(dedicated.includes("gl.uniform2f(gl.getUniformLocation(solarProgram,'u_shadow_vector'),sun.shadowVector[0],sun.shadowVector[1])"));
  const environmentManager=await fs.readFile(path.join(webRoot,'src/safety/environment-scene-manager.ts'),'utf8');
  assert.ok(environmentManager.includes('if(changedQuality)syncFrameClock();else options.frameClock?.wake();'));
});
test('resident owner/derived/native meshes receive independent solar proof without legacy metadata', () => {
  const square=[[13.3,52.4],[13.5,52.4],[13.5,52.6],[13.3,52.6],[13.3,52.4]];
  const boundary=prepareSolarShadowBoundary({boundarySHA256:'e'.repeat(64),geometry:{type:'Polygon',coordinates:[square]}});
  assert.equal(currentSolarShadowBoundary('e'.repeat(64)),boundary);
  const sourceFeature={properties:{role:'owner-painted-display',source_sha256:'f'.repeat(64)}};
  const owner={id:'owner-display',generation:7,start:0,end:3,box:[-20,0,-30,20,40,30],sourceFeature};
  const derived={...owner,id:'derived-display',start:3,end:6};
  const native={...owner,id:'native',start:6,end:9};
  const original=JSON.stringify([owner,derived,native]);
  const daytime=solar.sceneSolarLight(13.4,52.5,'2026-06-21T06:00:00+02:00');
  assert.deepEqual(residentSolarShadowRanges([13.4,52.5],[owner,derived,native],daytime,boundary,7,9),[owner,derived,native]);
  assert.deepEqual(residentSolarShadowRanges([13.4,52.5],[owner],daytime,boundary,8,9),[]);
  assert.deepEqual(residentSolarShadowRanges([13.4,52.5],[{...owner,end:99}],daytime,boundary,7,9),[]);
  assert.deepEqual(residentSolarShadowRanges([13.4,52.5],[owner],solar.sceneSolarLight(13.4,52.5,'2026-06-21T23:00:00+02:00'),boundary,7,9),[]);
  assert.equal(JSON.stringify([owner,derived,native]),original);
  assert.equal(owner.sourceFeature,sourceFeature);
});
