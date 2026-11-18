import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({stdin:{contents:`export * from './src/safety/building-focus-window';export * from './src/safety/building-focus-admission';export {projectNativeModelBox} from './src/safety/model-view-projection';`,resolveDir:new URL('../',import.meta.url).pathname,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {createBuildingFocusWindow,buildingFocusRegion,projectNativeModelBox,projectBuildingFocusCohort,bindBuildingFocusDependencies,planBuildingFocusAdmission:plan,remainingBuildingFocusGrace,BUILDING_FOCUS_EXIT_IDLE_MS,BUILDING_FOCUS_DISPLAY_GRACE_MS}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const p=createBuildingFocusWindow();p.measure({width:1000,height:600});const window=p.measure({width:4000,height:2400});
const box=x=>({left:x,top:1150,right:x+10,bottom:1160});
const unit=(key,x=2000)=>({key,bounds:box(x),detail:{resourceKey:key+'/near',bytes:100,vertices:100,painted:true},coarse:{resourceKey:key+'/coarse',bytes:10,vertices:10,painted:false}});
const core={bytes:1000,vertices:1000,units:10,paintedUnits:10},peripheral={bytes:20,vertices:20,units:2,paintedUnits:1};
const run=(units,extra={})=>plan({window,units,core,peripheral,coverageRatio:1,edgeDensity:1,...extra});
test('peripheral admissions are stable, bounded and never fall back to fine geometry',()=>{
 const rows=Array.from({length:100},(_,i)=>unit('building/'+i,100));const before=structuredClone(rows);
 const a=run(rows),b=run([...rows].reverse());
 assert.deepEqual(a.admitted,b.admitted);assert.equal(a.admitted.length,2);
 assert(a.admitted.every(row=>row.cost.resourceKey.endsWith('/coarse')));assert.deepEqual(rows,before);
 const without=unit('no-coarse',100);delete without.coarse;assert.equal(run([without]).admitted.length,0);
});
test('pan retires old fine resources and promotes newly centered cohorts',()=>{
 const a=run([unit('old'),unit('new',100)]);
 const b=run([unit('old',100),unit('new')],{previous:a.admitted});
 assert(b.retired.some(row=>row.cost.resourceKey==='old/near'));
 assert(b.retired.some(row=>row.cost.resourceKey==='new/coarse'));
 assert(b.admitted.some(row=>row.cost.resourceKey==='new/near'));
 assert(!b.admitted.some(row=>row.cost.resourceKey==='old/near'));
});
test('larger geographic coverage aggressively lowers admissions without splitting cohorts',()=>{
 const rows=Array.from({length:10},(_,i)=>unit('core/'+i,1900+i));
 assert.equal(run(rows).admitted.length,10);
 assert.equal(run(rows,{coverageRatio:5}).admitted.length,2);
 assert.equal(run(rows,{coverageRatio:10}).admitted.length,1);
 const tooLarge=unit('atomic');tooLarge.detail.bytes=1001;
 assert.equal(run([tooLarge]).admitted.length,0);
});
test('bytes, vertices, painted count and group count each constrain actual requested representations',()=>{
 const rows=[unit('a'),unit('b')];
 for(const limit of [{bytes:100},{vertices:100},{units:1},{paintedUnits:1}])assert.equal(run(rows,{core:{...core,...limit}}).admitted.length,1);
 const wall=p.measure({width:64000,height:38400});
 const rowsOnWall=rows.map(row=>({...row,bounds:{left:31995,top:19195,right:32005,bottom:19205}}));
 assert.equal(run(rowsOnWall,{window:wall,core:{...core,units:1}}).admitted.length,1);
});
test('invalid projection preserves existing demand but consumes its budget before new admissions',()=>{
 const first=run([unit('held')]);const unknown=unit('held');unknown.bounds.left=NaN;
 const next=run([unknown,unit('new')],{previous:first.admitted,core:{...core,bytes:100}});
 assert.equal(next.retired.length,0);assert.equal(next.admitted.length,1);assert.equal(next.admitted[0].key,'held');
 assert(next.deferred.includes('held'));assert(next.deferred.includes('new'));
 assert.throws(()=>run([unit('same'),unit('same')]),/Duplicate/);
 assert.throws(()=>run([],{coverageRatio:0}),/coverage/);
});

test('preload cohort bounds include all members and reject partial or ambiguous projection',()=>{
 const unit=2*Math.PI*6378137,matrix=new Float64Array([unit/100,0,0,0,0,unit/100,0,0,0,unit/200,unit/1000,0,-unit/200,-unit/200,0,1]);
 const snapshot={revision:1,cameraKey:'test',mercator:true,mainMatrix:matrix,viewport:{cssWidth:1000,cssHeight:600,drawingBufferWidth:500,drawingBufferHeight:300}};
 const low={origin:[0,0],box:[-10,0,-10,10,0,10]},tower={origin:[0,0],box:[40,0,-10,60,100,10]};
 const a=projectBuildingFocusCohort(snapshot,[low]),b=projectBuildingFocusCohort(snapshot,[tower]),whole=projectBuildingFocusCohort(snapshot,[low,tower]);
 assert(a&&b&&whole);assert(b.top<a.top,'height changes screen admission under pitch');
 assert.deepEqual(whole,{left:Math.min(a.left,b.left),top:Math.min(a.top,b.top),right:Math.max(a.right,b.right),bottom:Math.max(a.bottom,b.bottom)});
 assert.deepEqual(projectBuildingFocusCohort({...snapshot,viewport:{...snapshot.viewport,drawingBufferWidth:2000,drawingBufferHeight:1200}},[low,tower]),whole,'render resolution cannot move the CSS core boundary');
 assert.equal(projectBuildingFocusCohort(snapshot,[low,{...tower,box:[NaN,0,0,1,1,1]}]),undefined);
 assert.equal(projectBuildingFocusCohort(undefined,[low]),undefined);
 assert.equal(projectBuildingFocusCohort(snapshot,[]),undefined);
 // Near plane at ground level: the flat member is not in front of it, the tower
 // is, above 1 cm. The cohort is the tower's part inside the view, never unknown.
 const near={...snapshot,mainMatrix:new Float64Array(matrix)};near.mainMatrix[14]=-1;
 const clipped=projectBuildingFocusCohort(near,[low,tower]);
 assert(clipped&&Math.abs(clipped.left-b.left)<1e-6&&Math.abs(clipped.right-b.right)<1e-6&&Math.abs(clipped.top-b.top)<1e-6,'the visible part of the tower keeps its own screen extent');
 assert(clipped.bottom<=b.bottom+1e-6&&clipped.left>=0&&clipped.right<=1000&&clipped.top>=0&&clipped.bottom<=600);
});

test('cross-leaf dependencies stay atomic across core and peripheral boundaries',()=>{
 const rows=[unit('roof'),unit('walls',100),unit('base',-100)];
 const dependencies=[['roof','walls'],['walls','base']];
 const all=run(rows,{dependencies});assert.equal(all.admitted.length,3);
 assert(all.admitted.every(row=>row.region==='core'&&row.cost.resourceKey.endsWith('/near')));
 for(const limit of [{units:2},{bytes:299},{vertices:299},{paintedUnits:2}]){
  const result=run(rows,{dependencies,core:{...core,...limit}});
  assert.equal(result.admitted.length,0,'never publish an isolated roof or omit required base');
  assert.deepEqual(new Set(result.deferred),new Set(['roof','walls','base']));
 }
 assert.deepEqual(run([...rows].reverse(),{dependencies:[['base','walls'],['walls','roof']]}).admitted,all.admitted);
 assert.throws(()=>run(rows,{dependencies:[['roof','missing']]}),/Missing focus dependency/);
});

test('a linked peripheral cohort needs every coarse representation and counts every painted member',()=>{
 const rows=[unit('roof',100),unit('walls',110)];const dependencies=[['roof','walls']];
 const complete=run(rows,{dependencies});assert.equal(complete.admitted.length,2);
 rows[0].coarse.painted=rows[1].coarse.painted=true;
 assert.equal(run(rows,{dependencies}).admitted.length,0);
 rows[0].coarse.painted=rows[1].coarse.painted=false;delete rows[1].coarse;
 assert.equal(run(rows,{dependencies}).admitted.length,0);
});

test('dependency binding rejects stale source revisions before planning or acquisition',()=>{
 const roof={key:'city/current/roof',id:'roof-001',sha256:'a'.repeat(64)},walls={key:'city/current/walls',id:'flat-002',sha256:'b'.repeat(64)};
 const dependencies=bindBuildingFocusDependencies([roof,walls],[[roof,walls,roof]]);
 assert.deepEqual(dependencies,[[roof.key,walls.key]]);
 const rows=[unit(roof.key),unit(walls.key,100)];
 assert.equal(run(rows,{dependencies,core:{...core,units:1}}).admitted.length,0);
 assert.throws(()=>bindBuildingFocusDependencies([roof,walls],[[{...roof,sha256:'c'.repeat(64)}]]),/source mismatch/);
 assert.throws(()=>bindBuildingFocusDependencies([roof],[[roof,walls]]),/source mismatch/);
 assert.throws(()=>bindBuildingFocusDependencies([roof,{...walls,id:roof.id}],[]),/ambiguous/);
 assert.throws(()=>bindBuildingFocusDependencies([roof,{...walls,key:roof.key}],[]),/ambiguous/);
});
test('peripheral work shares the existing ceiling and cannot take resources from central detail',()=>{
 const center=[unit('center-a'),unit('center-b',2010)],edge=[unit('edge-a',100),unit('edge-b',110)];
 const total={bytes:200,vertices:200,units:10,paintedUnits:10};
 const full=run([...edge,...center],{total});assert.deepEqual(full.admitted.map(row=>row.key).sort(),['center-a','center-b']);
 const spare=run([...edge,center[0]],{total});assert.equal(spare.admitted.length,3);assert(spare.admitted.reduce((n,row)=>n+row.cost.bytes,0)<=total.bytes);
});

const zero={bytes:0,vertices:0,units:0,paintedUnits:0};
test('the display grace is the first confirmed exit tier and the cache keeps only the remainder',()=>{
 assert.equal(BUILDING_FOCUS_DISPLAY_GRACE_MS,8000);assert.deepEqual({...BUILDING_FOCUS_EXIT_IDLE_MS},{refetch:8000,redecode:11000,reupload:14000,rebuild:16000});
 assert.deepEqual({...remainingBuildingFocusGrace(BUILDING_FOCUS_EXIT_IDLE_MS,{},5)},{...BUILDING_FOCUS_EXIT_IDLE_MS},'a direct core exit keeps the full confirmed tiers');
 assert.deepEqual({...remainingBuildingFocusGrace(BUILDING_FOCUS_EXIT_IDLE_MS,{grace:{since:1000,until:9000}},9000)},{refetch:0,redecode:3000,reupload:6000,rebuild:8000},'time already spent on screen is not restarted');
 assert.deepEqual({...remainingBuildingFocusGrace(BUILDING_FOCUS_EXIT_IDLE_MS,{grace:{since:0,until:8000}},30000)},{refetch:0,redecode:0,reupload:0,rebuild:0});
});
test('a displayed cohort leaving the core stays on screen for the grace, then retires',()=>{
 const opts={holdMs:8000,peripheral:zero,total:core};
 const first=run([unit('tower')],{...opts,now:1000});assert.equal(first.admitted[0].cost.resourceKey,'tower/near');assert.equal(first.nextGraceDeadline,undefined);
 const moved=run([unit('tower',100)],{...opts,previous:first.admitted,now:3000});
 assert.deepEqual(moved.admitted.map(row=>[row.key,row.cost.resourceKey,row.region]),[['tower','tower/near','core']],'still visible: the same representation, no reload, no swap');
 assert.deepEqual(moved.admitted[0].grace,{since:3000,until:11000});assert.deepEqual(moved.held,['tower']);assert.equal(moved.nextGraceDeadline,11000);assert.equal(moved.retired.length,0);
 const still=run([unit('tower',100)],{...opts,previous:moved.admitted,now:10999});assert.deepEqual(still.admitted[0].grace,{since:3000,until:11000},'a re-plan never extends the grace');
 const expired=run([unit('tower',100)],{...opts,previous:still.admitted,now:11000});
 assert.equal(expired.admitted.length,0);assert.deepEqual(expired.retired.map(row=>row.key),['tower']);
 assert.deepEqual({...remainingBuildingFocusGrace(BUILDING_FOCUS_EXIT_IDLE_MS,expired.retired[0],11000)},{refetch:0,redecode:3000,reupload:6000,rebuild:8000});
 const offscreen=run([unit('tower',-5000)],{...opts,previous:first.admitted,now:3000});
 assert.equal(offscreen.admitted.length,0,'an offscreen cohort is not held: nothing to see');assert.equal(offscreen.retired[0].grace,undefined);
 const back=run([unit('tower')],{...opts,previous:moved.admitted,now:5000});assert.equal(back.admitted[0].grace,undefined,'returning to the core ends the hold on merit');
});
test('grace holds never take the core allowance and still obey the shared ceiling',()=>{
 const total={bytes:200,vertices:1000,units:10,paintedUnits:10},opts={total,holdMs:8000,peripheral:zero};
 const a=run([unit('old')],{...opts,now:0});
 const full=run([unit('old',100),unit('c1'),unit('c2',2010)],{...opts,previous:a.admitted,now:1000});
 assert.deepEqual(full.admitted.map(row=>row.key).sort(),['c1','c2'],'new core detail first; the hold yields');assert(full.retired.some(row=>row.key==='old'));
 const room=run([unit('old',100),unit('c1')],{...opts,previous:a.admitted,now:1000});
 assert(room.admitted.find(row=>row.key==='old').grace,'what core left may hold a still-visible building');
 assert(room.admitted.reduce((n,row)=>n+row.cost.bytes,0)<=total.bytes);
});
test('a resident peripheral sample keeps its representation without a grace countdown',()=>{
 const a=run([unit('edge',100)],{now:0,holdMs:8000});assert.equal(a.admitted[0].cost.resourceKey,'edge/coarse');
 const b=run([unit('edge',100)],{previous:a.admitted,now:5000,holdMs:8000});
 assert.equal(b.admitted[0].cost.resourceKey,'edge/coarse');assert.equal(b.admitted[0].grace,undefined);assert.equal(b.nextGraceDeadline,undefined);assert.equal(b.retired.length,0);
});
test('a cohort with an unavailable member is deferred whole and cannot be held',()=>{
 const a=run([unit('roof'),unit('base')],{dependencies:[['roof','base']],now:0,holdMs:8000});assert.equal(a.admitted.length,2);
 const b=run([unit('roof'),{...unit('base'),unavailable:true}],{dependencies:[['roof','base']],previous:a.admitted,now:100,holdMs:8000});
 assert.equal(b.admitted.length,0);assert.deepEqual(new Set(b.deferred),new Set(['roof','base']));assert.equal(b.retired.length,2);
});
test('unknown-projection holds keep their grace and expire on time',()=>{
 const opts={holdMs:8000,peripheral:zero,total:core};
 const first=run([unit('held')],{...opts,now:0});
 const moved=run([unit('held',100)],{...opts,previous:first.admitted,now:1000});
 const unknown=unit('held');unknown.bounds={left:NaN,top:NaN,right:NaN,bottom:NaN};
 const during=run([unknown],{...opts,previous:moved.admitted,now:5000});assert.equal(during.admitted.length,1);assert.equal(during.nextGraceDeadline,9000);
 const after=run([unknown],{...opts,previous:during.admitted,now:9000});assert.equal(after.admitted.length,0);assert.deepEqual(after.retired.map(row=>row.key),['held']);
 assert.throws(()=>run([unit('x')],{holdMs:20001}),/grace/);assert.throws(()=>run([unit('x')],{now:NaN}),/grace/);
});

// MapLibre's camera: 512 CSS-px tiles, centre distance 0.5/tan(fov/2)*height, looking north.
const pitched=(()=>{
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);};
 const multiply=(a,b)=>{const r=new Float64Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++){let n=0;for(let k=0;k<4;k++)n+=a[k*4+row]*b[c*4+k];r[c*4+row]=n;}return r;};
 const LNG=13.4,LAT=52.52,width=2560,height=1440,zoom=16,pitch=60;
 const worldSize=512*2**zoom,fov=36.87*Math.PI/180,distance=0.5/Math.tan(fov/2)*height/worldSize,tx=(LNG+180)/360,ty=(1-Math.log(Math.tan(Math.PI/4+LAT*Math.PI/360))/Math.PI)/2;
 const t=pitch*Math.PI/180,eye=[tx,ty+distance*Math.sin(t),distance*Math.cos(t)];
 const z=norm(sub(eye,[tx,ty,0])),x=norm(cross([0,-1,0],z)),y=cross(z,x);
 const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
 const g=1/Math.tan(fov/2),n=distance/100,f=distance*100,projection=[g*height/width,0,0,0,0,g,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0];
 const focus=createBuildingFocusWindow();focus.measure({width:1280,height:720});
 const frame={revision:1,cameraKey:'pitched',mercator:true,mainMatrix:multiply(projection,view),viewport:{cssWidth:width,cssHeight:height,drawingBufferWidth:width,drawingBufferHeight:height},buildingFocus:focus.measure({width,height})};
 /** A 20 m wide, 10 m high block from `near` to `far` metres south of the view centre (towards and past the camera). */
 const south=(near,far,height=10,west=-10,east=10)=>({origin:[LNG,LAT],box:[west,0,-far,east,height,-near]});
 return{frame,south,width,height,window:frame.buildingFocus};
})();
test('a pitched view: what crosses the near plane behind the lower screen edge is outside, not the centre of view',()=>{
 const {frame,south,width,height,window}=pitched,region=component=>buildingFocusRegion(window,projectBuildingFocusCohort(frame,[component]));
 // The near plane meets the ground between 1.4 and 1.7 km behind the view centre here.
 assert.equal(projectNativeModelBox(frame,[13.4,52.52],south(1400,1401).box).reason,'projected');
 assert.equal(projectNativeModelBox(frame,[13.4,52.52],south(1700,1701).box).reason,'near-plane');
 const crossing=south(1400,2100);
 assert.equal(projectNativeModelBox(frame,crossing.origin,crossing.box).reason,'near-plane','the block crosses the near plane');
 assert.equal(region(crossing),'outside','it is behind the lower screen edge: nothing of it is on screen');
 assert.equal(region(south(1900,2100)),'outside','wholly behind the camera');
 assert.equal(region(south(1900,2100,10,3000,3200)),'outside','behind and beside the camera');
 assert.equal(region(south(-50,50)),'core');
 // One end reaches into the view: exactly the on-screen part counts.
 const long=projectBuildingFocusCohort(frame,[south(500,2100)]);
 assert(long.left>=0&&long.right<=width&&long.top>=0&&Math.abs(long.bottom-height)<1e-6,'clipped to the lower screen edge, inside the viewport');
 const end=projectNativeModelBox(frame,[13.4,52.52],south(500,501).box).cssBounds;
 assert(Math.abs(long.top-end.top)<1&&Math.abs(long.left-end.left)<3&&Math.abs(long.right-end.right)<3,'its far end is where that end really projects');
 assert.equal(buildingFocusRegion(window,long),'core');
 assert.equal(region(south(640,2100)),'peripheral','only the strip between core and screen edge is on screen');
 // A leaf with members on both sides: the on-screen member decides, the crossing one adds nothing.
 const mixed=projectBuildingFocusCohort(frame,[south(-50,50),crossing]);
 assert.deepEqual(mixed,projectBuildingFocusCohort(frame,[south(-50,50)]));
 // The plan: a leaf behind the camera can no longer take the allowance from the one on screen.
 const cost=key=>({resourceKey:key+'/near',bytes:100,vertices:100,painted:true});
 const units=[{key:'behind',bounds:projectBuildingFocusCohort(frame,[crossing]),detail:cost('behind')},{key:'centre',bounds:projectBuildingFocusCohort(frame,[south(-50,50)]),detail:cost('centre')}];
 const result=plan({window,units,core:{...core,units:1},peripheral,coverageRatio:1});
 assert.deepEqual(result.admitted.map(row=>row.key),['centre']);assert.deepEqual(result.deferred,['behind']);
});
test('a member wholly behind the camera adds nothing; only an invalid projection is unknown',()=>{
 const unit=2*Math.PI*6378137,matrix=new Float64Array([unit/100,0,0,0,0,unit/100,0,0,0,unit/200,unit/1000,0,-unit/200,-unit/200,0,1]);
 const base={revision:1,cameraKey:'near-plane',mercator:true,mainMatrix:matrix,viewport:{cssWidth:4000,cssHeight:2400,drawingBufferWidth:4000,drawingBufferHeight:2400},buildingFocus:window};
 const low={origin:[0,0],box:[-10,0,-10,10,0,10]},tower={origin:[0,0],box:[40,0,-10,60,100,10]};
 const behind={...base,mainMatrix:new Float64Array(matrix)};behind.mainMatrix[15]=-1;
 const hidden=projectBuildingFocusCohort(behind,[low,tower]);
 assert.equal(plan({window,units:[{key:'hidden',bounds:hidden,detail:{resourceKey:'hidden/near',bytes:1,vertices:1,painted:true}}],core,peripheral,coverageRatio:1}).admitted.length,0,'wholly behind the camera: nothing to show');
 const invalid={...base,mainMatrix:new Float64Array(matrix)};invalid.mainMatrix[0]=NaN;
 assert.equal(projectBuildingFocusCohort(invalid,[low]),undefined,'only an invalid projection stays unknown');
});

test('one-way requirements: a requiring unit never stands without its prerequisites',()=>{
 const native=unit('native'),patch=unit('patch',2005);
 const both=run([patch,native],{requires:[['patch',['native']]]});assert.deepEqual(both.admitted.map(row=>row.key).sort(),['native','patch']);
 const tight=run([patch,native],{requires:[['patch',['native']]],core:{...core,units:1}});assert.deepEqual(tight.admitted.map(row=>row.key),['native'],'the prerequisite may stand alone');
 const missing=run([patch,{...native,bounds:{left:-500,top:-500,right:-400,bottom:-400}}],{requires:[['patch',['native']]]});
 assert.equal(missing.admitted.length,0,'an offscreen prerequisite that is not admitted keeps the requiring unit out');
 const chain=run([unit('a'),unit('b',2001),unit('c',2002)],{requires:[['c',['b']],['b',['a']]],core:{...core,units:2}});assert.deepEqual(chain.admitted.map(row=>row.key).sort(),['a','b']);
 assert.throws(()=>run([patch],{requires:[['patch',['ghost']]]}),/Missing focus requirement/);
});
test('owner-protected cohorts are admitted first within the original allowance; ordinary cohorts use what is left',()=>{
 const rows=[unit('nearest',2000),unit('rail-a',2100),unit('rail-b',2150)];
 const scaled=run(rows,{dependencies:[['rail-a','rail-b']],priority:['rail-a','rail-b'],coverageRatio:5,core:{...core,units:3},total:{...core,units:3}});
 assert.deepEqual(scaled.admitted.map(row=>row.key).sort(),['rail-a','rail-b'],'scale 1/5 leaves the ordinary allowance at 0 units, yet the protected cohort keeps its reserve');
 const plain=run(rows,{dependencies:[['rail-a','rail-b']],coverageRatio:5,core:{...core,units:3},total:{...core,units:3}});
 assert.equal(plain.admitted.length,0,'without owner protection the same cohort is scaled away');
 const ordinary=run(rows,{dependencies:[['rail-a','rail-b']],priority:['rail-a','rail-b'],core:{...core,units:3},total:{...core,units:3}});
 assert.deepEqual(ordinary.admitted.map(row=>row.key).sort(),['nearest','rail-a','rail-b']);
 const over=run(rows,{dependencies:[['rail-a','rail-b']],priority:['rail-a','rail-b'],core:{...core,units:1},total:{...core,units:1}});
 assert.deepEqual(over.admitted.map(row=>row.key),['nearest'],'the original unit allowance still bounds a protected cohort');
 const bytes=run(rows,{dependencies:[['rail-a','rail-b']],priority:['rail-a','rail-b'],core:{...core,bytes:150},total:{...core,bytes:150}});
 assert.deepEqual(bytes.admitted.map(row=>row.key),['nearest'],'and so does the original byte allowance');
 // The provider accepted the cohort by its member vertices; whole-leaf (in-view)
 // vertices are charged, yet never refuse it. Ordinary cohorts get what is left: nothing.
 const heavy=run(rows,{dependencies:[['rail-a','rail-b']],priority:['rail-a','rail-b'],core:{...core,vertices:150},total:{...core,vertices:150}});
 assert.deepEqual(heavy.admitted.map(row=>row.key).sort(),['rail-a','rail-b'],'200 vertices against 150: admitted, and the ordinary cohort no longer fits');
 const unprotected=run(rows,{dependencies:[['rail-a','rail-b']],core:{...core,vertices:150},total:{...core,vertices:150}});
 assert.deepEqual(unprotected.admitted.map(row=>row.key),['nearest'],'an ordinary cohort is still refused by vertices');
});
test('an unknown-projection cohort keeps all of its previous demand or none of it',()=>{
 const first=run([unit('a'),unit('b',2001)],{dependencies:[['a','b']]});
 const unknown=key=>{const row=unit(key);row.bounds={left:NaN,top:NaN,right:NaN,bottom:NaN};return row;};
 const kept=run([unknown('a'),unknown('b')],{dependencies:[['a','b']],previous:first.admitted});assert.equal(kept.admitted.length,2);
 const half=run([unknown('a'),unknown('b')],{dependencies:[['a','b']],previous:first.admitted.filter(row=>row.key==='a')});
 assert.equal(half.admitted.length,0,'a cohort that gained a member is not half-preserved');
});
