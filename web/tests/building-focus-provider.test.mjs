import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({stdin:{contents:`export * from './src/safety/building-focus-provider';export * from './src/safety/building-focus-window';export {viewportComponents} from './src/painted/root500/safety/three-dimensional-viewport';`,resolveDir:new URL('../',import.meta.url).pathname,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {applyBuildingFocus,createBuildingFocusState,buildingFocusViewShare,buildingFocusLeafOffScreen,viewportComponents,ownerFocusReplacements,BUILDING_FOCUS_METADATA_IDLE_MS,buildingFocusGroundPerCssPixel,buildingFocusCoverageRatio,buildingFocusAnchorGroundPerCssPixel,buildingFocusPitchFootprintFactor,topDownGroundPerCssPixel,BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_ZOOM,BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_PITCH,BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_TOLERANCE,createBuildingFocusWindow,BUILDING_FOCUS_EXIT_IDLE_MS}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);};
function multiply(a,b){const r=new Float64Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+row]*b[c*4+k];r[c*4+row]=s;}return r;}
const LNG=13.4,LAT=52.52,mercator=([lng,lat])=>[(lng+180)/360,(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2];
// MapLibre's camera: 512 CSS-px tiles, centre distance 0.5/tan(fov/2)*height.
function frameAt({zoom=16,pitch=0,bearing=0,width=4000,height=2400,reference={width:1000,height:600},fov:fovDeg=36.87}={}){
 const worldSize=512*2**zoom,fov=fovDeg*Math.PI/180,distance=0.5/Math.tan(fov/2)*height/worldSize,[tx,ty]=mercator([LNG,LAT]);
 const t=pitch*Math.PI/180,b=bearing*Math.PI/180,eye=[tx-distance*Math.sin(t)*Math.sin(b),ty+distance*Math.sin(t)*Math.cos(b),distance*Math.cos(t)];
 const z=norm(sub(eye,[tx,ty,0])),x=norm(cross([Math.sin(b),-Math.cos(b),0],z)),y=cross(z,x);
 const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
 const g=1/Math.tan(fov/2),n=distance/100,f=distance*100,projection=[g*height/width,0,0,0,0,g,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0];
 const window=createBuildingFocusWindow();window.measure(reference);
 return{revision:1,cameraKey:'focus-'+zoom+'-'+pitch+'-'+bearing+'-'+width,mercator:true,mainMatrix:multiply(projection,view),viewport:{cssWidth:width,cssHeight:height,drawingBufferWidth:width,drawingBufferHeight:height},buildingFocus:window.measure({width,height}),worldSize};
}
const FOV=36.87;
const ratioOf=(options,snap=true)=>{const frame=frameAt(options),ground=buildingFocusGroundPerCssPixel(frame,[0,0,0,0]);assert(ground.exact,'core corners meet the ground');const anchor=buildingFocusAnchorGroundPerCssPixel(ground.latitude,FOV);return snap?buildingFocusCoverageRatio(ground.value,anchor):ground.value/anchor;};
const coverage=options=>ratioOf(options);
// Screens whose core is the whole screen (at most the reference area) and larger ones.
const SCREENS=[{width:1280,height:720},{width:844,height:390},{width:390,height:844},{width:1440,height:600},{width:1920,height:1080},{width:3840,height:2160},{width:2560,height:1080},{width:4000,height:2400}].map(size=>({...size,reference:{width:Math.min(size.width,1280),height:Math.min(size.height,720)}}));

test('the geographic scale is anchored at the default 3D view: MapLibre zoom 15 at pitch 45',()=>{
 assert.equal(BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_ZOOM,15);assert.equal(BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_PITCH,45);
 assert(Math.abs(topDownGroundPerCssPixel(15,0)-(2*Math.PI*6378137/(512*2**15))**2)<1e-9);
 for(const screen of SCREENS)for(const bearing of [0,45,200]){
  const raw=ratioOf({zoom:15,pitch:45,bearing,...screen},false);
  assert(raw<1+1e-3,'the default view on '+screen.width+'x'+screen.height+' needs no more ground per pixel than the anchor: '+raw);
  assert.equal(coverage({zoom:15,pitch:45,bearing,...screen})<=1,true,'and keeps the full allowance');
 }
 const fullHeight=ratioOf({zoom:15,pitch:45,width:1280,height:720,reference:{width:1280,height:720}},false);
 assert(Math.abs(fullHeight-1)<1e-3,'a screen whose core is the whole screen is the anchor itself: '+fullHeight);
 assert(BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_TOLERANCE>1e-3&&BUILDING_FOCUS_GEOGRAPHIC_ANCHOR_TOLERANCE<=.01);
 assert.equal(buildingFocusCoverageRatio(1.005,1),1,'within the tolerance the view counts as the anchor');assert.equal(buildingFocusCoverageRatio(1.02,1),1.02);assert.equal(buildingFocusCoverageRatio(.5,1),.5);
 const screen={width:1280,height:720,reference:{width:1280,height:720}};
 assert(coverage({zoom:15,pitch:0,...screen})<.6,'top-down at zoom 15 shows far less ground per pixel than the default view');
 assert(Math.abs(coverage({zoom:14.5,pitch:45,...screen})-2)<4e-3,'zoom 14.5 at the same pitch halves the allowance');
 assert(Math.abs(coverage({zoom:16,pitch:45,...screen})-.25)<1e-3,'closer views never enlarge it (scale capped at 1 by the planner)');
 const steep=coverage({zoom:15,pitch:60,...screen});assert(steep>2.4&&steep<2.6,'pitch 60 lowers it only as much as the core footprint grows: '+steep);
 assert(Math.abs(coverage({zoom:15,pitch:45,bearing:45,...screen})-coverage({zoom:15,pitch:45,...screen}))<1e-6,'rotation never changes geography');
 // Screen size never changes the allowance: every screen, of any shape and
 // whatever size its window was first measured at, gets the same allowance at
 // the same zoom, pitch and field of view.
 const resized=[{width:1920,height:1080,reference:{width:390,height:844}},{width:2560,height:1080,reference:{width:800,height:800}},{width:3840,height:2160,reference:{width:1024,height:768}}];
 for(const zoom of [14.5,15,15.5])for(const pitch of [0,30,45,55,60]){
  const screens=[...SCREENS,...resized],ratios=screens.map(s=>ratioOf({zoom,pitch,...s},false)),base=ratios[0];
  ratios.forEach((r,i)=>assert(Math.abs(r/base-1)<1e-6,`z${zoom} p${pitch} ${screens[i].width}x${screens[i].height}: ${r} vs ${base}`));
 }
 // An unusable or horizon-reaching field of view uses MapLibre's default camera.
 const standard=buildingFocusAnchorGroundPerCssPixel(52.52,2*Math.atan(1/3)*180/Math.PI);
 assert.equal(buildingFocusAnchorGroundPerCssPixel(52.52,150),standard);assert.equal(buildingFocusAnchorGroundPerCssPixel(52.52,NaN),standard);
 const horizon=frameAt({zoom:16,pitch:85}),fallback=buildingFocusGroundPerCssPixel(horizon,[13.3,52.4,13.5,52.7]);
 assert.equal(fallback.exact,false,'a core corner above the horizon uses the conservative bounds box');assert(fallback.value>0);
});
test('the camera model behind the anchor reproduces the footprint of a MapLibre-equivalent matrix',()=>{
 let state=11;const random=()=>(state=(state*1103515245+12345)%2147483648)/2147483648;
 for(let i=0;i<60;i++){
  const width=Math.round(320+random()*3500),height=Math.round(320+random()*2000),pitch=random()*60,bearing=random()*360,zoom=14.5+random()*3;
  const frame=frameAt({zoom,pitch,bearing,width,height,reference:{width:Math.min(width,1280),height:Math.min(height,720)}}),ground=buildingFocusGroundPerCssPixel(frame,[0,0,0,0]);
  const model=buildingFocusPitchFootprintFactor({width,height},{left:0,top:0,right:width,bottom:height},FOV,pitch),measured=ground.value/topDownGroundPerCssPixel(zoom,ground.latitude);
  assert(Math.abs(model/measured-1)<1e-3,JSON.stringify({width,height,pitch,bearing,zoom,model,measured}));
 }
 // Only the vertical extent of a rectangle matters; pitch 0 is the top-down view; the horizon is refused.
 const view={width:1600,height:900};
 assert(Math.abs(buildingFocusPitchFootprintFactor(view,{left:0,top:100,right:1600,bottom:800},FOV,45)/buildingFocusPitchFootprintFactor(view,{left:700,top:100,right:900,bottom:800},FOV,45)-1)<1e-12);
 assert(Math.abs(buildingFocusPitchFootprintFactor(view,{left:0,top:0,right:1600,bottom:900},FOV,0)-1)<1e-12);
 assert.equal(buildingFocusPitchFootprintFactor(view,{left:0,top:0,right:1600,bottom:900},FOV,80),undefined);
 assert.equal(buildingFocusPitchFootprintFactor(view,{left:10,top:0,right:10,bottom:900},FOV,45),undefined);
});

// MapLibre 6.11.2's own camera: its MercatorTransform, bundled from the
// TypeScript sources in node_modules, hands the custom layer the main matrix.
const maplibre=await import('data:text/javascript;base64,'+Buffer.from((await build({stdin:{contents:`export {MercatorTransform} from './node_modules/maplibre-gl/src/geo/projection/mercator_transform.ts';export {LngLat} from './node_modules/maplibre-gl/src/geo/lng_lat.ts';`,resolveDir:new URL('../',import.meta.url).pathname,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'error'})).outputFiles[0].text).toString('base64'));
function maplibreFrame({lng=13.4,lat=52.52,zoom,pitch,bearing=0,width,height,reference}){
 const t=new maplibre.MercatorTransform({minZoom:0,maxZoom:22,minPitch:0,maxPitch:85,renderWorldCopies:true});
 t.resize(width,height);t.setZoom(zoom);t.setCenter(new maplibre.LngLat(lng,lat));t.setBearing(bearing);t.setPitch(pitch);
 assert(Math.abs(t.pitch-pitch)<1e-9&&Math.abs(t.zoom-zoom)<1e-12,'the transform kept the camera');
 const window=createBuildingFocusWindow();window.measure(reference??{width,height});
 return{frame:{revision:1,cameraKey:'maplibre',mercator:true,mainMatrix:t.getProjectionDataForCustomLayer(true).mainMatrix,viewport:{cssWidth:width,cssHeight:height,drawingBufferWidth:width,drawingBufferHeight:height},buildingFocus:window.measure({width,height})},fov:t.fov};
}
test('with MapLibre’s own camera the default 3D view keeps the full allowance on every screen, and every screen gets the same',()=>{
 for(const screen of SCREENS)for(const bearing of [0,90,233])for(const lat of [47.4,50.1,53.6]){
  const {frame,fov}=maplibreFrame({zoom:15,pitch:45,bearing,lat,...screen}),ground=buildingFocusGroundPerCssPixel(frame,[0,0,0,0]),anchor=buildingFocusAnchorGroundPerCssPixel(ground.latitude,fov);
  assert(ground.exact);assert(ground.value/anchor<1+1e-3,JSON.stringify({screen,bearing,lat,raw:ground.value/anchor}));assert(buildingFocusCoverageRatio(ground.value,anchor)<=1,'full allowance');
  const model=buildingFocusPitchFootprintFactor({width:screen.width,height:screen.height},{left:0,top:0,right:screen.width,bottom:screen.height},fov,45),measured=ground.value/topDownGroundPerCssPixel(15,ground.latitude);
  assert(Math.abs(model/measured-1)<1e-3,'the camera model is MapLibre’s: '+model+' vs '+measured);
 }
 for(const [zoom,pitch] of [[15,60],[14.5,45],[14.5,30],[15.5,60]]){
  const ratios=SCREENS.map(screen=>{const {frame,fov}=maplibreFrame({zoom,pitch,...screen}),ground=buildingFocusGroundPerCssPixel(frame,[0,0,0,0]);return buildingFocusCoverageRatio(ground.value,buildingFocusAnchorGroundPerCssPixel(ground.latitude,fov));});
  ratios.forEach((r,i)=>assert(Math.abs(r/ratios[0]-1)<1e-6,`z${zoom} p${pitch} ${SCREENS[i].width}x${SCREENS[i].height}: ${r} vs ${ratios[0]}`));
  if(zoom===15&&pitch===60)assert(Math.abs(1/ratios[0]-.398)<.005,'pitch 60 at zoom 15 keeps about 40 %: '+1/ratios[0]);
  if(zoom===14.5&&pitch===45)assert(Math.abs(1/ratios[0]-.5)<.005,'zoom 14.5 at the default pitch halves it');
 }
});

function fixture(){
 const docs=new Map(),indices=new Map(),pins=[],retention=[],metadata={reads:0,releases:0,retained:0,failNext:undefined,gate:undefined};
 const worldSize=512*2**16;
 const place=(id,px,variant=true,others=[])=>{
  const lngAt=x=>LNG+(x-2000)/worldSize*360,leaf={id,sha256:/^[a-f]/i.test(id)?id[0].toLowerCase().repeat(64):id.charCodeAt(0).toString(16).padStart(2,'0').repeat(32),bytes:1000,vertices:100,tile_key:id};
  docs.set(id,{leaf:{key:JSON.stringify([leaf.id,leaf.sha256]),id,sha256:leaf.sha256,partition:null},components:[px,...others].map((x,i)=>({objectId:'osm/way/'+(id.charCodeAt(0)*100+i),partId:id+(i?'/'+i:''),origin:[lngAt(x),LAT],box:[-5,0,-5,5,10,5]})),sourceObjectDependencies:[],dependencyLocators:[]});
  if(variant&&!indices.has(id))indices.set(id,{canonicalLeaf:{id},id});
  return leaf;
 };
 const resolver={async acquireLeaf(leaf,signal,settings){signal.throwIfAborted();if(metadata.gate)await metadata.gate;metadata.reads++;if(settings?.retain)metadata.retained++;const value=docs.get(leaf.id);assert(value,'metadata for '+leaf.id);let released=false;return{value,release(){if(released)return;released=true;metadata.releases++;}};}};
 const resource=(id,level)=>({key:id+'/'+level,level,descriptor:{bytes:level==='near'?1000:200},vertices:level==='near'?100:20});
 // `levels.gone` models a live demand (a pick, a selection) taking a level away.
 const levels={gone:undefined},runtime={focusRepresentations(index){const id=index.id;return{detail:resource(id,'near'),peripheral:resource(id,'coarse'),level:level=>['near','coarse'].includes(level)&&level!==levels.gone?resource(id,level):undefined};},pinFocusLevels(rows){pins.push(rows.map(row=>[row.index.id,row.level]));},
  staleFocusDemand(preparedKey,currentKey){return Object.assign(new Error('stale focus demand'),{name:'StaleBuildingDetailDemandError',preparedKey,currentKey});}};
 const store={setIdleRetention(keys,tiers,settings){retention.push({keys:[...keys],tiers:{...tiers},settings});}};
 const bindings=new Map(),refreshes=[];
 const state=createBuildingFocusState({refresh:()=>refreshes.push(Date.now()),detailRuntime:runtime});
 const resourceKey=(leaf,binding)=>JSON.stringify([leaf.id,binding?.resource.key??'canonical']);
 const camera={pitch:0,verticalFieldOfView:36.87,aspectRatio:4000/2400};
 const run=(chosen,now,overrides={})=>applyBuildingFocus({provider:'Fixture',state,resolver,frame:frameAt(),bounds:[13.3,52.4,13.5,52.7],camera,chosen,canonical:chosen,ownerCohorts:[],budget:{maxVisible:128,maxBytes:8*1024**2,maxVertices:200000},resourceStore:store,signal:new AbortController().signal,
  detail:{runtime,bindings,previousLevel:()=>undefined,async resolve(leaf){if(metadata.failNext){const error=metadata.failNext;metadata.failNext=undefined;if(typeof error==='function'){error();}else throw error;}return indices.get(leaf.id);}},resourceKey,now,...overrides});
 return{place,run,state,pins,retention,bindings,refreshes,metadata,resourceKey,runtime,levels};
}
test('one integration binds and pins the admitted representation, holds a visible exit and releases the remainder',async()=>{
 const f=fixture();
 // A and C at the centre (C canonical-only), B just outside the core edge.
 let A=f.place('A',2000),B=f.place('B',560),C=f.place('C',2010,false);
 const first=await f.run([A,B,C],1000);
 assert.deepEqual(new Set(first.chosen.map(leaf=>leaf.id)),new Set(['A','B','C']));
 assert.equal(f.resourceKey(A,f.bindings.get(A)),JSON.stringify(['A','A/near']),'core keeps ordinary detail');
 assert.equal(f.bindings.get(B).resource.level,'coarse','the periphery acquires the real produced coarse variant');
 assert.deepEqual(f.pins.at(-1),[['B','coarse']],'only the non-ordinary level is pinned for validation');
 assert.equal(f.resourceKey(C,f.bindings.get(C)),JSON.stringify(['C','canonical']),'canonical-only stays the complete canonical leaf');
 assert.equal(f.metadata.reads,3);assert.equal(f.metadata.retained,3,'leaf metadata is leased beyond the request');
 assert.equal(f.metadata.releases,0,'the manager keeps the current view\u2019s metadata until its next plan');assert.equal(f.state.stats.metadataHeld,true);
 // Pan: A leaves the core (still on screen), B arrives at the centre.
 A=f.place('A',560);B=f.place('B',2000);
 const second=await f.run([A,B,C],2000);
 assert.equal(f.metadata.reads,6);assert.equal(f.metadata.releases,3,'the previous plan\u2019s metadata is given back only after the new plan holds its own');
 const heldA=second.selection.plan.admitted.find(row=>row.key===JSON.stringify(['A','a'.repeat(64)]));
 assert.deepEqual(heldA.grace,{since:2000,until:10000},'a still-visible building stays on screen for the confirmed grace');
 assert.equal(heldA.cost.resourceKey,JSON.stringify(['A','A/near']),'with its exact displayed representation');
 assert.equal(f.bindings.get(B).resource.level,'near','B is core detail again');assert.deepEqual(f.pins.at(-1),[],'nothing differs from ordinary demand now');
 assert.equal(f.state.stats.nextGraceDeadline,10000);assert.equal(f.state.stats.held,1);
 assert.equal(f.retention.length,0,'a peripheral exit keeps the ordinary policy; the held A is still live');
 // Grace ends while A is still peripheral: it retires with only the remainder.
 const third=await f.run([A,B,C],10000);
 assert(!third.chosen.includes(A)||f.bindings.get(A).resource.level==='coarse','after the hold A is either released or re-sampled as coarse, never kept as detail');
 const exit=f.retention.find(row=>row.keys.includes(JSON.stringify(['A','A/near'])));
 assert(exit,'the held core detail gets an exit grace');assert.deepEqual(exit.tiers,{refetch:0,redecode:3000,reupload:6000,rebuild:8000});assert.equal(exit.settings.exclusiveDependents,true);
 // Movement start: current core sources keep the confirmed full exit tiers.
 f.retention.length=0;f.state.moveStarted({setIdleRetention:(keys,tiers,settings)=>f.retention.push({keys:[...keys],tiers:{...tiers},settings})},11000);
 assert.deepEqual(f.retention[0].tiers,{...BUILDING_FOCUS_EXIT_IDLE_MS});
 assert(f.retention[0].keys.includes(JSON.stringify(['B','B/near'])));
 f.state.reset();assert.deepEqual(f.pins.at(-1),[],'clearing the display drops every pin');assert.equal(f.state.admissions.length,0);
 assert.equal(f.metadata.releases,f.metadata.reads,'clearing the display gives back all metadata');assert.equal(f.state.stats.metadataHeld,false);
});
test('a failed plan releases its own metadata and keeps the previous plan\u2019s',async()=>{
 const f=fixture(),A=f.place('A',2000),B=f.place('B',2010,false);
 await f.run([A,B],1000);assert.equal(f.metadata.releases,0);
 f.bindings.clear();f.metadata.failNext=new Error('detail index unavailable');
 await assert.rejects(f.run([A,B],2000),/detail index unavailable/);
 assert.equal(f.metadata.reads,4);assert.equal(f.metadata.releases,2,'only the failed plan\u2019s leases were released');assert.equal(f.state.stats.metadataHeld,true);
 f.state.destroy();assert.equal(f.metadata.releases,4);
});
test('metadata never outlives a cleared display or a quiet period',async t=>{
 const f=fixture(),A=f.place('A',2000,false);
 // The display is cleared (overview, 2D) while a plan is still reading.
 let open;f.metadata.gate=new Promise(resolve=>open=resolve);
 const pending=f.run([A],1000);await new Promise(resolve=>setImmediate(resolve));f.state.reset();open();f.metadata.gate=undefined;await pending;
 assert.equal(f.metadata.reads,1);assert.equal(f.metadata.releases,1,'a plan that began before the reset leaves nothing held');assert.equal(f.state.stats.metadataHeld,false);
 // Without another plan the metadata is given back after the quiet period.
 t.mock.timers.enable({apis:['setTimeout']});
 await f.run([A],2000);assert.equal(f.state.stats.metadataHeld,true);
 t.mock.timers.tick(BUILDING_FOCUS_METADATA_IDLE_MS-1);assert.equal(f.state.stats.metadataHeld,true);
 t.mock.timers.tick(1);assert.equal(f.state.stats.metadataHeld,false);assert.equal(f.metadata.releases,f.metadata.reads);
 // A later plan after destroy would be released at once.
 f.state.destroy();let released=0;f.state.retainMetadata(()=>released++,f.state.epoch);assert.equal(released,1);
});
test('the in-view share repeats the providers’ display admission test exactly',()=>{
 const bounds=[13.39,52.51,13.41,52.53],rad=Math.PI/180;
 let state=7;const random=()=>(state=(state*1103515245+12345)%2147483648)/2147483648;
 for(const camera of [undefined,{pitch:0,verticalFieldOfView:36.87,aspectRatio:16/9},{pitch:45,verticalFieldOfView:36.87,aspectRatio:16/9},{pitch:52,verticalFieldOfView:36.87,aspectRatio:.46},{pitch:60,verticalFieldOfView:36.87,aspectRatio:16/9}]){
  let inside=0,total=0;
  for(let i=0;i<400;i++){
   // Around every edge of the bounds, with footprints and heights that reach across it.
   const origin=[13.385+random()*.03,52.505+random()*.03],half=1+random()*120,height=random()<.2?0:random()*250,box=[-half,0,-half*random(),half*random(),height,half];
   const component={origin,batches:[{positions:new Float32Array([box[0],box[1],box[2],box[3],box[4],box[5]])}]};
   const exact=[component.batches[0].positions[0],0,component.batches[0].positions[2],component.batches[0].positions[3],component.batches[0].positions[4],component.batches[0].positions[5]];
   const expected=viewportComponents([component],bounds,camera).length;
   // Without a camera the providers test the plain bounds: a top-down zero-height query is the same test.
   const share=buildingFocusViewShare([{origin,box:exact}],bounds,camera??{pitch:0,verticalFieldOfView:36.87,aspectRatio:1});
   if(camera)assert.equal(share,expected,JSON.stringify({camera,origin,box:exact}));
   inside+=share;total++;
  }
  if(camera?.pitch===60)assert.equal(inside,total,'a view cone that reaches the horizon counts every component');
  else assert(inside>20&&inside<total-20,'the sample straddles the bounds: '+inside+'/'+total);
 }
 const row=(lng)=>({origin:[lng,52.52],box:[-5,0,-5,5,10,5]});
 assert.equal(buildingFocusViewShare([row(13.4),row(13.4),row(13.2),row(13.6)],bounds,{pitch:0,verticalFieldOfView:36.87,aspectRatio:1}),.5);
 assert.equal(buildingFocusViewShare([],bounds,{pitch:0,verticalFieldOfView:36.87,aspectRatio:1}),1);
 assert.equal(buildingFocusViewShare([row(13.2)],bounds,{pitch:NaN,verticalFieldOfView:36.87,aspectRatio:1}),1,'an unusable camera charges the whole leaf');
 void rad;
});
test('a leaf is charged the vertices its in-view components can show, never the whole leaf',async()=>{
 const view=[13.39,52.4,13.41,52.7];
 // A: one component at the centre and three far outside the map bounds (px 300..340 is west of 13.39).
 const scene=()=>{const f=fixture();return{f,leaves:[f.place('A',2000,false,[300,320,340]),f.place('B',2010,false),f.place('C',1990,false)]};};
 const first=scene(),plan=await first.f.run(first.leaves,1000,{bounds:view});
 const cost=id=>plan.selection.plan.admitted.find(row=>JSON.parse(row.key)[0]===id).cost;
 assert.equal(cost('A').vertices,25,'one of four components is in view');assert.equal(cost('B').vertices,100);assert.equal(cost('A').bytes,1000,'the leaf is still loaded whole');
 // 225 in-view vertices fit an allowance that 300 whole-leaf vertices would not.
 const second=scene(),tight=await second.f.run(second.leaves,1000,{bounds:view,budget:{maxVisible:128,maxBytes:8*1024**2,maxVertices:230}});
 assert.equal(tight.chosen.length,3);assert.equal(tight.partial,false);
 const third=scene(),whole=await third.f.run(third.leaves,1000,{budget:{maxVisible:128,maxBytes:8*1024**2,maxVertices:230}});
 assert.equal(whole.chosen.length,2,'with every component in view the same leaves cost 300');assert.equal(whole.partial,true);assert.equal(whole.selection.deferredCore,1);
});
test('partial means the view is missing something: not the thinned periphery, not off-screen leaves',async()=>{
 const f=fixture(),core=['A','B','C'].map((id,i)=>f.place(id,1990+10*i,false));
 // Eight leaves at the left screen edge: the periphery takes at most six, sampled far below that.
 const edge=['K','L','M','N','P','Q','R','S'].map((id,i)=>f.place(id,20+10*i,false)),off=f.place('Z',-3000,false);
 const full=await f.run([...core,...edge,off],1000);
 assert(full.chosen.length<core.length+edge.length,'some edge leaves are left out');assert(core.every(leaf=>full.chosen.includes(leaf)));assert(!full.chosen.includes(off));
 assert.equal(full.selection.deferredCore,0);assert.equal(full.partial,false,'nothing that belongs to the view is missing');
 const g=fixture(),same=['A','B','C'].map((id,i)=>g.place(id,1990+10*i,false));
 const tight=await g.run(same,1000,{budget:{maxVisible:2,maxBytes:8*1024**2,maxVertices:200000}});
 assert.equal(tight.chosen.length,2);assert.equal(tight.selection.deferredCore,1);assert.equal(tight.partial,true,'a core leaf left out for lack of allowance is');
});
test('a level taken away by a live demand is a stale plan, not a failure',async()=>{
 const f=fixture(),A=f.place('A',2000),B=f.place('B',560);
 // B is peripheral: its coarse level is planned, then a pick removes it before the plan is applied.
 const describe=f.runtime.focusRepresentations;let calls=0;
 f.runtime.focusRepresentations=index=>{if(index.id==='B'&&++calls===2)f.levels.gone='coarse';return describe(index);};
 await assert.rejects(f.run([A,B],1000),error=>error.name==='StaleBuildingDetailDemandError'&&error.preparedKey===JSON.stringify(['B','B/coarse'])&&error.currentKey===undefined);
 assert.equal(f.state.admissions.length,0,'nothing was committed');assert.equal(f.pins.length,0,'and nothing pinned');
 // The provider plans again at once; the demand is settled by then.
 f.levels.gone=undefined;f.runtime.focusRepresentations=describe;
 const again=await f.run([A,B],1001);assert.equal(again.chosen.length,2);assert.deepEqual(f.pins.at(-1),[['B','coarse']]);
 // A runtime without that hook still fails loudly.
 const g=fixture(),C=g.place('C',2000),D=g.place('D',560);delete g.runtime.staleFocusDemand;
 const plain=g.runtime.focusRepresentations;let seen=0;
 g.runtime.focusRepresentations=index=>{if(index.id==='D'&&++seen===2)g.levels.gone='coarse';return plain(index);};
 await assert.rejects(g.run([C,D],1000),/Fixture focus representation is no longer available/);
});
test('a candidate whose index extent is wholly off screen costs no metadata read; a visible building still brings it in',async()=>{
 // The fixture view is top-down at zoom 16, 4000x2400 CSS px around 13.4/52.52: about +-0.021 deg of longitude.
 const frame=frameAt(),extent=(west,height=20)=>({bbox:[west,52.5195,west+.001,52.5205],max_height_m:height});
 assert.equal(buildingFocusLeafOffScreen(frame,extent(13.3995)),false);
 assert.equal(buildingFocusLeafOffScreen(frame,extent(13.45)),true);
 assert.equal(buildingFocusLeafOffScreen(frame,extent(13.4213)),false,'an extent crossing the screen edge stays');
 assert.equal(buildingFocusLeafOffScreen(frame,{}),false,'no extent: never skipped');
 assert.equal(buildingFocusLeafOffScreen(frame,{bbox:[13.45,52.5195,13.451,52.5205]}),false,'no height: never skipped');
 assert.equal(buildingFocusLeafOffScreen(frame,{bbox:[13.451,52.5195,13.45,52.5205],max_height_m:20}),false,'an invalid extent is never skipped');
 assert.equal(buildingFocusLeafOffScreen({...frame,buildingFocus:undefined},extent(13.45)),false);
 // Pitched 60 degrees looking north: a block 2 km behind the view centre crosses the near plane, yet nothing of it is on screen.
 const pitched=frameAt({zoom:16,pitch:60,width:2560,height:1440,reference:{width:1280,height:720}}),south=1/111320;
 assert.equal(buildingFocusLeafOffScreen(pitched,{bbox:[13.3995,52.52-2100*south,13.4005,52.52-1400*south],max_height_m:30}),true);
 assert.equal(buildingFocusLeafOffScreen(pitched,{bbox:[13.3995,52.52-2100*south,13.4005,52.52-400*south],max_height_m:30}),false,'one end reaches into the view');
 const worldSize=512*2**16,east=2000+.0505/360*worldSize;
 const scene=()=>{const f=fixture();return{f,A:{...f.place('A',2000,false),...extent(13.3995)},B:{...f.place('B',east,false),...extent(13.45)}};};
 const one=scene(),plain=await one.f.run([one.A,one.B],1000);
 assert.deepEqual(plain.chosen.map(leaf=>leaf.id),['A']);assert.equal(plain.offScreen,1);assert.equal(one.f.metadata.reads,1,'the off-screen leaf was not read');assert.equal(plain.partial,false);
 // The same leaf as a member of a protected cohort of the visible one: read and admitted with it.
 const two=scene(),tied=await two.f.run([two.A,two.B],1000,{ownerCohorts:[[two.A,two.B]]});
 assert.deepEqual(tied.chosen.map(leaf=>leaf.id).sort(),['A','B']);assert.equal(tied.offScreen,1);assert.equal(two.f.metadata.reads,2);
 // Without an extent the candidate is read as before and classified by its components.
 const three=scene(),bare=await three.f.run([three.A,{...three.B,bbox:undefined}],1000);
 assert.deepEqual(bare.chosen.map(leaf=>leaf.id),['A']);assert.equal(bare.offScreen,0);assert.equal(three.f.metadata.reads,2);
});
test('the order handed to the provider does not change between two plans of one unchanged view',async()=>{
 const f=fixture();let A=f.place('A',2000);const C=f.place('C',2010,false);
 await f.run([A,C],1000);
 // A leaves the core but stays on screen (a hold); B is a new peripheral sample.
 A=f.place('A',560);const B=f.place('B',570);
 const second=await f.run([A,B,C],2000),third=await f.run([A,B,C],3000);
 const ids=plan=>plan.chosen.map(leaf=>leaf.id),admitted=plan=>plan.selection.plan.admitted.map(row=>JSON.parse(row.key)[0]);
 assert.deepEqual(admitted(second),['C','A','B'],'a new sample is admitted after the hold');
 assert.deepEqual(admitted(third),['C','B','A'],'and before it once it is resident');
 assert.deepEqual(ids(second),['C','A','B']);assert.deepEqual(ids(third),ids(second),'the provider still loads and trims in the same order');
});
test('applyBuildingFocus applies the anchor: the default 3D view admits the whole allowance, wider views less',async()=>{
 const plan=async(frameOptions,fov=36.87)=>{
  const f=fixture(),leaves=Array.from({length:12},(_,i)=>f.place(String.fromCharCode(65+i),1994+i,false));
  const frame=frameAt({width:1280,height:720,reference:{width:1280,height:720},fov,...frameOptions});
  const result=await f.run(leaves,1000,{frame,camera:{pitch:frameOptions.pitch,verticalFieldOfView:fov,aspectRatio:1280/720},budget:{maxVisible:8,maxBytes:8*1024**2,maxVertices:200000}});
  return result.chosen.length;
 };
 assert.equal(await plan({zoom:15,pitch:45}),8,'the default 3D view: the whole unit allowance');
 assert.equal(await plan({zoom:15,pitch:0}),8,'top-down at zoom 15 as well');
 assert.equal(await plan({zoom:14.5,pitch:45}),4,'zoom 14.5 at the same pitch: half');
 assert.equal(await plan({zoom:15,pitch:60}),3,'pitch 60 at zoom 15: about 40 %');
 assert.equal(await plan({zoom:15,pitch:45},60),8,'the camera’s own field of view is the anchor’s: a 60° lens keeps the default view full');
});
test('the grace re-plan fires once at the deadline and never after destroy',async()=>{
 const refreshes=[],state=createBuildingFocusState({refresh:()=>refreshes.push(1)});
 state.commit({admitted:[],deferred:[],retired:[],held:[],nextGraceDeadline:5},0);
 await new Promise(resolve=>setTimeout(resolve,40));assert.equal(refreshes.length,1);assert.equal(state.stats.timerFires,1);
 state.commit({admitted:[],deferred:[],retired:[],held:[],nextGraceDeadline:5},0);state.destroy();
 await new Promise(resolve=>setTimeout(resolve,40));assert.equal(refreshes.length,1,'destroy cancels the pending re-plan');
});
test('asynchronous focus preparation does not restart the remaining display grace',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let clock=1000;t.mock.method(performance,'now',()=>clock);
 const f=fixture();t.after(()=>f.state.destroy());
 let A=f.place('A',2000),B=f.place('B',560),C=f.place('C',2010,false);
 await f.run([A,B,C],undefined);
 A=f.place('A',560);B=f.place('B',2000);clock=2000;
 f.metadata.gate={then(resolve){clock=5000;resolve();}};
 await f.run([A,B,C],undefined);
 assert.equal(f.state.stats.nextGraceDeadline,10000);
 t.mock.timers.tick(5000);assert.equal(f.refreshes.length,0);
 t.mock.timers.tick(1);assert.equal(f.refreshes.length,1,'the three seconds spent preparing do not extend the absolute grace deadline');
});
test('owner replacements name the displaced native part and bound native rows only',()=>{
 assert.deepEqual(ownerFocusReplacements({objectId:'osm/way/1',sourcePartId:'osm/way/1/component/a'}),[{objectId:'osm/way/1',partId:'osm/way/1/component/a'}]);
 assert.deepEqual(ownerFocusReplacements({objectId:'osm/way/1',sourcePartId:'p',replacesNative:[{objectId:'osm/way/2',partId:'q',nativeLeafSHA256:'b'.repeat(64)}]}),[{objectId:'osm/way/1',partId:'p'},{objectId:'osm/way/2',partId:'q',nativeLeafSHA256:'b'.repeat(64)}]);
 const strict={objectId:'osm/way/1',replacesNative:[{objectId:'osm/way/2',partId:'q',nativeLeafSHA256:'b'.repeat(64)}],requiredNative:[{objectId:'osm/way/3',partId:'r',nativeLeafSHA256:'c'.repeat(64)},{objectId:'osm/way/2',partId:'q',nativeLeafSHA256:'b'.repeat(64)}]};
 assert.deepEqual(ownerFocusReplacements(strict),[{objectId:'osm/way/2',partId:'q',nativeLeafSHA256:'b'.repeat(64)},{objectId:'osm/way/3',partId:'r',nativeLeafSHA256:'c'.repeat(64)}],'strict reconstructions also require their requiredNative leaves, once each');
});

test('display profiles of this city and canonical index become atomic leaf cohorts',async()=>{
 const {buildingFocusDisplayLeafSets,buildingFocusDisplayCohorts}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 const sha=d=>d.repeat(64),profiles=[{city:'cologne',indexSHA:sha('1'),outline:{leafSHA:sha('a')},compiledParts:[{leafSHA:sha('b')},{leafSHA:sha('b')}]},{city:'cologne',indexSHA:sha('2'),outline:{leafSHA:sha('c')},parts:[{leafSHA:sha('d')}]},{city:'munich',indexSHA:sha('1'),outline:{leafSHA:sha('e')},compiledParts:[{leafSHA:sha('f')}]},{city:'cologne',indexSHA:sha('1'),outline:{leafSHA:sha('a')},compiledParts:[]}];
 const sets=buildingFocusDisplayLeafSets(profiles,'cologne',sha('1'));assert.deepEqual(sets,[[sha('a'),sha('b')]],'only this city and canonical index; a single-leaf profile ties nothing');
 assert.equal(buildingFocusDisplayLeafSets(profiles,'cologne',sha('1')),sets,'cached by profile list identity');
 const leaf=d=>({id:d,sha256:sha(d)}),canonical=['a','b','x'].map(leaf);
 assert.deepEqual(buildingFocusDisplayCohorts(sets,[canonical[0]],canonical).map(group=>group.map(row=>row.id)),[['a','b']],'touching the outline leaf ties its part leaf');
 assert.deepEqual(buildingFocusDisplayCohorts(sets,[canonical[2]],canonical),[],'an untouched profile adds nothing');
 assert.deepEqual(buildingFocusDisplayCohorts(sets,[canonical[0]],[canonical[0]]),[],'a member outside the window is not on screen and is not invented');
});
