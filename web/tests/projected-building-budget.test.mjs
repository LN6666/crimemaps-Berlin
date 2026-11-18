import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {build} from 'esbuild';

// Actual pure viewport/MVP helpers plus three extracted city-manager declarations.
// No model, renderer, source table or GPU is loaded, and no alternative
// projection or admission implementation lives here.
const web=fileURLToPath(new URL('../',import.meta.url));
const built=await build({stdin:{contents:"export * from './src/painted/root500/safety/three-dimensional-viewport';export {projectNativeModelBox} from './src/safety/model-view-projection';export {estimateRetainedBuildingPayload} from './src/painted/root500/safety/building-payload-cost';export {normalizeBuildingShard} from './src/painted/city/safety/building-mesh-codec';",resolveDir:web,sourcefile:'projected-building-viewport-fixture.ts',loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022'});
const viewport=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const component=batches=>({origin:[13.4,52.5],batches});

test('actual component viewport record captures its complete local 3D box including negative coordinates and roof height',()=>{
 const first=[-7,-5,-11,5,18,17,2,-1,3],second=new Float32Array([-4,7,9]),before=[...first],typedBefore=second.slice(),c=component([{positions:first},{positions:second}]);
 const record=viewport.componentViewportRecord(c);assert.deepEqual(record.localBox,[-7,-5,-11,5,18,17]);assert.equal(record.vertices,4);assert.equal(record.maxHeightMetres,18*1.01+.1);assert(record.bbox.every(Number.isFinite));assert(record.bbox[0]<c.origin[0]);assert(record.bbox[1]<c.origin[1]);assert(record.bbox[2]>c.origin[0]);assert(record.bbox[3]>c.origin[1]);assert.deepEqual(first,before);assert.deepEqual(second,typedBefore);
});

test('invalid empty components fail before a local box can be published or cached',()=>{
 assert.throws(()=>viewport.componentViewportRecord(component([])),/Invalid native component display envelope/);
 let pointReads=0;const positions=[],empty=new Proxy(positions,{get(target,property){if(typeof property==='string'&&/^\d+$/.test(property))pointReads++;return Reflect.get(target,property);}}),c=component([{positions:empty}]);assert.throws(()=>viewport.componentViewportRecord(c),/Invalid native component display envelope/);assert.equal(pointReads,0);
 positions.push(-2,-3,-4);const valid=viewport.componentViewportRecord(c);assert.deepEqual(valid.localBox,[-2,-3,-4,-2,-3,-4]);assert.equal(valid.vertices,1);
});

test('the existing component WeakMap shares one record without a second positions traversal',()=>{
 let reads=0;const positions=[-2,-1,-3,4,12,7],batch={get positions(){reads++;return positions;}},c=component([batch]),record=viewport.componentViewportRecord(c),initial=reads;assert(initial>0);assert.deepEqual(record.localBox,[-2,-1,-3,4,12,7]);
 assert.equal(viewport.componentViewportRecord(c),record);assert.equal(reads,initial);const bounds=[13.3,52.4,13.5,52.6];assert.deepEqual(viewport.viewportComponents([c],bounds),[c]);assert(Number.isFinite(viewport.viewportComponentDistance(c,bounds)));assert.equal(reads,initial);assert.equal(viewport.componentViewportRecord(c),record);
});

// Synthetic public main matrices, not a competing projection implementation.
// At origin [0,0], x maps to x/200, screen y to heightFactor*y-z/200,
// and homogeneous w to 1-wSlope*x. Changing heightFactor models a pitched
// camera whose tall roof has a greater visible extent than a nearer low roof.
const earth=2*Math.PI*6378137;
function snapshot(heightFactor=.01,wSlope=0){return{revision:1,cameraKey:'tiny-camera',mercator:true,viewport:{cssWidth:1000,cssHeight:800,drawingBufferWidth:2000,drawingBufferHeight:1600},mainMatrix:new Float64Array([earth/200,0,0,-earth*wSlope,0,earth/200,0,0,0,earth*heightFactor,0,0,-earth/400,-earth/400,0,1+earth*wSlope/2])};}
function building(id,x,height=2,{width=2,depth=2,vertices=8}={}){const points=[];for(let corner=0;corner<8;corner++)points.push(x+(corner&1?width/2:-width/2),corner&2?height:0,corner&4?depth/2:-depth/2);while(points.length/3<vertices)points.push(...points.slice(0,3));return{city:'berlin',objectId:'osm/way/'+id,partId:'osm/way/'+id+'/component/tiny',origin:[0,0],componentGeometry:{type:'Polygon',coordinates:[[[0,0],[.001,0],[0,.001],[0,0]]]},sourceFeature:{type:'Feature',properties:{building:'yes'}},batches:[{positions:points,normals:Array(vertices*3).fill(0),indices:[0,1,2],color:[.2,.3,.4]}]};}
const filename=new URL('../src/painted/city/safety/three-dimensional-map.ts',import.meta.url),citySource=await readFile(filename,'utf8'),cityAST=ts.createSourceFile(filename.pathname,citySource,ts.ScriptTarget.Latest,true),declarations=new Map();
(function visit(node){if(ts.isVariableDeclaration(node)&&['subset','budgetRows','admit'].includes(node.name.getText(cityAST)))declarations.set(node.name.getText(cityAST),'const '+node.getText(cityAST)+';');ts.forEachChild(node,visit);})(cityAST);
assert.equal(declarations.size,3,'Use the three actual city manager declarations');
const compile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const evaluate=(text,ctx)=>new Function('env','with(env){'+compile(text)+'}')(new Proxy(ctx,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)}));
function harness({view=snapshot(),rows=[]}={}){
 let reads=0;const projected=[],s528Calls=[],forced=new Set(),controller=new AbortController(),ctx={
  city:'berlin',bounds:[-.01,-.01,.01,.01],camera:{pitch:45,verticalFieldOfView:45,aspectRatio:1.25},options:{getModelViewProjection(){reads++;return view;}},renderer:{selected:undefined},ownerProfileByComponent:new WeakMap(),sourceLeafByFeature:new WeakMap(),retainedComponentCost:new WeakMap(),retainedShardCost:new WeakMap(),shadowByShard:new WeakMap(),NATIVE_PART_DISPLAY_PROFILES:[],SOURCE_EDGE_ASSEMBLY_DISPLAY_PROFILES:[],S020_RELATION_OUTLINE_PROFILES:[],paintIdentityOwner:()=>undefined,paintOwner:()=> 'city',
  componentViewportRecord:viewport.componentViewportRecord,viewportComponentDistance:viewport.viewportComponentDistance,viewportComponents:viewport.viewportComponents,estimateRetainedBuildingPayload:viewport.estimateRetainedBuildingPayload,
  projectNativeModelBox(...args){const result=viewport.projectNativeModelBox(...args);projected.push({row:rows.find(row=>row.origin===args[1]),result});return result;},
  s528Formal:{componentPriority:()=>0,viewportRows(original,base,leaf){s528Calls.push({original,base,leaf});return base;},reserveAfter:()=>({vertices:0,bytes:0})},
  s434CohortSelection:{priority:()=>0,viewportRows(original,base){return [...new Set([...base,...original.filter(c=>forced.has(c))])];},reserveAfter:()=>({vertices:0,bytes:0}),note(){}},
  partial:false,current(signal){signal.throwIfAborted();},signal:controller.signal,ticket:1,chosen:[],results:[],nativeAdmissionVertexLimit:100000,decodedCap:1000000,stagingRetainedEstimateBytes:0,
 };
 const actual=evaluate([...declarations.values()].join('\n')+'\nreturn {subset,budgetRows,admit};',ctx);return{...actual,ctx,forced,projected,s528Calls,get reads(){return reads;}};
}
const identity=c=>({objectId:c.objectId,partId:c.partId});
function protect(h,c,kind){switch(kind){
 case 'selected':h.ctx.renderer.selected=identity(c);break;
 case 'profile':h.ctx.ownerProfileByComponent.set(c,{});break;
 case 'marker':c.displayEstimates={};break;
 case 'other-provider':h.ctx.paintIdentityOwner=(_city,objectId)=>objectId===c.objectId?'root500':undefined;break;
 case 'auxiliary':h.ctx.paintOwner=row=>row===c?'auxiliary':'city';break;
 case 'S434':h.forced.add(c);break;
 case 'native-S528':h.ctx.NATIVE_PART_DISPLAY_PROFILES=[{city:c.city,outline:identity(c),compiledParts:[],declaredPartIds:[],missingPartIds:[],unknownPartIds:[],ownershipUnverifiedPartIds:[]}];break;
 case 'unknown-native-member':h.ctx.NATIVE_PART_DISPLAY_PROFILES=[{city:c.city,outline:{objectId:'other',partId:'other'},compiledParts:[],declaredPartIds:[],missingPartIds:[],unknownPartIds:[c.objectId],ownershipUnverifiedPartIds:[]}];break;
 case 'edge-group':h.ctx.SOURCE_EDGE_ASSEMBLY_DISPLAY_PROFILES=[{city:c.city,groupIdentity:c.objectId,outline:identity(c),parts:[]}];break;
 case 'S020-group':h.ctx.S020_RELATION_OUTLINE_PROFILES=[{city:c.city,groupIdentity:c.objectId,outline:identity(c),parts:[]}];break;
 default:throw Error('Unknown tiny protection');
}}

test('projection budget: actual MVP uses pitch and native height, reports CSS/buffer units and keeps uncertain/outside classifications',()=>{
 const near=building('11',0,2,{width:10,depth:10}),tall=building('22',30,50),nearBox=viewport.componentViewportRecord(near).localBox,tallBox=viewport.componentViewportRecord(tall).localBox,top=snapshot(0),pitched=snapshot(.01);
 const n0=viewport.projectNativeModelBox(top,near.origin,nearBox),t0=viewport.projectNativeModelBox(top,tall.origin,tallBox),n1=viewport.projectNativeModelBox(pitched,near.origin,nearBox),t1=viewport.projectNativeModelBox(pitched,tall.origin,tallBox);assert(n0.cssExtentPx>t0.cssExtentPx);assert(t1.cssExtentPx>n1.cssExtentPx);assert.equal(t1.reason,'projected');assert.equal(t1.mainClip,'inside-or-intersecting');assert.equal(t1.drawingBufferExtentPx,t1.cssExtentPx*2);
 const outside=building('33',500),uncertain=building('44',100);assert.equal(viewport.projectNativeModelBox(pitched,outside.origin,viewport.componentViewportRecord(outside).localBox).mainClip,'outside');assert.equal(viewport.projectNativeModelBox(snapshot(.01,.01),uncertain.origin,viewport.componentViewportRecord(uncertain).localBox).reason,'near-plane');assert.equal(viewport.projectNativeModelBox(undefined,near.origin,nearBox).mainClip,'unknown');
});

test('projection budget: actual city ranking changes only under real pressure; all-fit keeps legacy order without reading a projection',()=>{
 const near=building('11',0,2,{width:10,depth:10}),tall=building('22',30,50),rows=[tall,near],before=structuredClone(rows),bounds=[-.01,-.01,.01,.01];assert(viewport.viewportComponentDistance(near,bounds)<viewport.viewportComponentDistance(tall,bounds));
 for(const [view,expected]of [[snapshot(0),near],[snapshot(.01),tall]]){const h=harness({view,rows}),result=h.budgetRows(rows,8,1000000);assert.deepEqual(result.rows,[expected]);assert.equal(result.rows[0],expected);assert.equal(result.vertices,8);assert(result.cost<=1000000);assert.equal(h.reads,1);assert.equal(h.projected.length,2);assert.equal(h.s528Calls.length,0,'Budgeting must not repeat formal validation');}
 for(const view of [snapshot(0),snapshot(.01),undefined]){const h=harness({view,rows});h.ctx.options.getModelViewProjection=()=>{throw Error('All-fit must not read a new frame snapshot');};const result=h.budgetRows(rows,16,1000000);assert.deepEqual(result.rows,[near,tall]);assert.equal(result.rows[0],near);assert.equal(result.rows[1],tall);assert.equal(h.projected.length,0);assert.equal(h.ctx.partial,false);}
 assert.deepEqual(rows,before);
});

test('projection budget: protected and uncertain rows retain both legacy selected and unselected membership by whole-leaf fallback',()=>{
 const kinds=['selected','profile','marker','other-provider','auxiliary','S434','native-S528','unknown-native-member','edge-group','S020-group','outside','unknown'];
 for(const kind of kinds)for(const retained of [true,false]){
  const near=building('11',0,2,{width:10,depth:10,vertices:retained?8:16}),tall=building('22',30,50,{vertices:retained?16:8}),guarded=building('33',kind==='outside'?500:100),rows=[guarded,tall,near],view=kind==='unknown'?snapshot(.01,.01):snapshot(.01),h=harness({view,rows});if(!['outside','unknown'].includes(kind))protect(h,guarded,kind);
  const result=h.budgetRows(rows,16,1000000),expected=retained?[near,guarded]:[near];assert.deepEqual(result.rows,expected,kind+' legacy membership '+retained);assert.equal(result.rows.includes(guarded),retained);assert(result.vertices<=16);assert(result.cost<=1000000);if(!['outside','unknown'].includes(kind))assert.equal(h.projected.some(item=>item.row===guarded),false,kind+' must not be projected as ordinary');assert.equal(h.s528Calls.length,0);
 }
});

test('projection budget: actual packed codec meshPrecision-only rows and OSM owner tags stay ordinary while unknown estimates remain protected',()=>{
 const encode16=(values,signed)=>{const bytes=new Uint8Array(values.length*2),view=new DataView(bytes.buffer);values.forEach((value,index)=>signed?view.setInt16(index*2,value,true):view.setUint16(index*2,value,true));return Buffer.from(bytes).toString('base64');};
 const footprint=new Uint8Array(32),footprintView=new DataView(footprint.buffer);[0,0,10,0,0,10,0,0].forEach((value,index)=>footprintView.setInt32(index*4,value,true));
 const plain=[building('11',0,2,{width:10,depth:10}),building('22',30,50)],packed={schema_version:1,city:'berlin',encoding:'packed-json-v1',position_precision_m:.01,components:plain.map(c=>({city:c.city,objectId:c.objectId,partId:c.partId,origin:c.origin,rings:[4],footprint:Buffer.from(footprint).toString('base64'),properties:{building:'yes',owner:'municipality'},batches:c.batches.map(b=>({p_type:'i16',p:encode16(b.positions.map(value=>Math.round(value*100)),true),n:Buffer.from(new Int8Array(b.normals.map(value=>Math.round(value*127)))).toString('base64'),i_type:'u16',i:encode16(b.indices,false),color:b.color}))}))};
 const normalized=viewport.normalizeBuildingShard(packed,'berlin',64,64),rows=normalized.components;assert.equal(rows.length,2);for(const c of rows){assert(c.batches[0].positions instanceof Float32Array);assert.equal(c.sourceFeature.properties.owner,'municipality');assert.deepEqual(Object.keys(c.displayEstimates),['meshPrecision']);assert.deepEqual(Object.keys(c.displayEstimates.meshPrecision).sort(),['status','source_geometry_lossless','position_cm','metric_rounding_m','float32_render_attributes','normals_quantized_1_over_127'].sort());assert.equal(c.displayEstimates.meshPrecision.status,'display-precision');assert.equal(c.displayEstimates.meshPrecision.position_cm,1);assert.equal(c.displayEstimates.meshPrecision.metric_rounding_m,undefined);assert.equal(c.displayEstimates.meshPrecision.normals_quantized_1_over_127,true);}
 const before=structuredClone(rows),h=harness({rows}),selected=h.budgetRows(rows,8,1000000);assert.deepEqual(selected.rows,[rows[1]],'Actual packed ordinary rows must participate in height/pitch ranking');assert.equal(h.projected.length,2);assert.deepEqual(rows,before);
 rows[1].displayEstimates={...rows[1].displayEstimates,unknownEstimate:{status:'unverified'}};const guarded=harness({rows}),kept=guarded.budgetRows(rows,8,1000000);assert.deepEqual(kept.rows,[rows[0]]);assert.equal(guarded.projected.some(item=>item.row===rows[1]),false);assert.equal(kept.vertices,8);assert(kept.cost<=1000000);
});

test('projection budget: S434 protection errors propagate instead of silently returning a legacy budget',()=>{
 const rows=[building('11',0,2),building('22',30,50)],h=harness({rows}),failure=new Error('tiny actual S434 protection failure');h.ctx.s434CohortSelection.viewportRows=()=>{throw failure;};assert.throws(()=>h.budgetRows(rows,8,1000000),error=>error===failure);assert.equal(h.reads,1);assert.equal(h.projected.length,0);
});

test('projection budget: existing S528 and S434 priorities stay ahead of ordinary projected extent',()=>{
 for(const priority of ['S528','S434']){const near=building('11',0,2),tall=building('22',30,50),rows=[tall,near],h=harness({rows}),rank=c=>c===near?0:1;if(priority==='S528')h.ctx.s528Formal.componentPriority=(a,b)=>rank(a)-rank(b);else h.ctx.s434CohortSelection.priority=(a,b)=>rank(a)-rank(b);assert.deepEqual(h.budgetRows(rows,8,1000000).rows,[near]);}
});

test('projection budget: ordinary shadow-bound replacement retains the exact new source/shadow subset and full retained cost',()=>{
 const near=building('11',0,2,{width:10,depth:10}),tall=building('22',30,50),rows=[near,tall],h=harness({rows}),a={...identity(near),indices:[0,1,2],tag:'near'},b={...identity(tall),indices:[0,1,2],tag:'tall'},profile={verified:'tiny-boundary'},shadow={profile,components:[a,b],sourceBoundary:'exact-tiny-binding',provenance:'all fields retained'};h.ctx.shadowByShard.set(rows,shadow);
 const result=h.budgetRows(rows,8,1000000);assert.deepEqual(result.rows,[tall]);const selected=h.ctx.shadowByShard.get(result.rows);assert.notEqual(selected,shadow);assert.equal(selected.profile,profile);assert.deepEqual(selected.components,[b]);assert.equal(selected.components[0],b);assert.equal(selected.sourceBoundary,shadow.sourceBoundary);assert.equal(selected.provenance,shadow.provenance);assert.deepEqual(shadow.components,[a,b]);const estimate=viewport.estimateRetainedBuildingPayload;assert.equal(result.cost,32+estimate(tall).retainedPayloadEstimateBytes+8+estimate(selected).retainedPayloadEstimateBytes+8);assert.equal(result.cost,h.ctx.retainedShardCost.get(result.rows)+result.rows.length*8);assert(result.cost<=1000000);
});

test('projection budget: original +256 first pass, complete subset tail and each leaf reserve keep their byte/vertex limits',()=>{
 const one=building('11',0),estimate=viewport.estimateRetainedBuildingPayload,k=estimate(one).retainedPayloadEstimateBytes,firstLimit=32+k+8+256;
 for(const [limit,count]of [[firstLimit-1,0],[firstLimit,1]]){const h=harness({view:undefined,rows:[one]});h.ctx.options.getModelViewProjection=()=>undefined;const result=h.budgetRows([one],8,limit);assert.equal(result.rows.length,count);assert(result.cost<=limit);}
 const h=harness({view:undefined,rows:[one]}),entry={...identity(one),triangles:[0,1,2]},profile={tiny:true},shadow={profile,components:[entry],provenance:'x'.repeat(1024)},rows=[one];h.ctx.options.getModelViewProjection=()=>undefined;h.ctx.shadowByShard.set(rows,shadow);const tailLimit=32+estimate(profile).retainedPayloadEstimateBytes+k+8+estimate(entry).retainedPayloadEstimateBytes+256,result=h.budgetRows(rows,8,tailLimit);assert.equal(result.rows.length,0,'The complete shadow binding exceeds the old first-pass allowance and must be trimmed by the original tail');assert(result.cost<=tailLimit);
 for(const pressure of ['vertices','bytes']){
  const a=building('11',0,2),b=building('22',30,50),c=building('33',60,25),first=[a,b,c],last=building('44',90,3),second=[last],all=[...first,last],f=harness({rows:all}),rowCost=estimate(a).retainedPayloadEstimateBytes,reserveBytes=rowCost+64;f.ctx.chosen=[{id:'first',sha256:'first-leaf'},{id:'last',sha256:'last-leaf'}];f.ctx.nativeAdmissionVertexLimit=pressure==='vertices'?32:100;f.ctx.decodedCap=pressure==='bytes'?32+2*reserveBytes+32+2*(rowCost+8)+256:1000000;
  const reserve=(_chosen,index)=>index===0?{vertices:pressure==='vertices'?8:0,bytes:pressure==='bytes'?reserveBytes:0}:{vertices:0,bytes:0};f.ctx.s434CohortSelection.reserveAfter=reserve;f.ctx.s528Formal.reserveAfter=reserve;f.admit(0,first);assert.equal(f.ctx.results[0].length,2,pressure+' must honor both future reserves');f.admit(1,second);assert.equal(f.s528Calls.length,2,'Only the original per-leaf admit validates S528');assert.equal(f.s528Calls[0].original,first);assert.equal(f.s528Calls[1].original,second);assert.equal(f.s528Calls[0].leaf,'first-leaf');assert.equal(f.s528Calls[1].leaf,'last-leaf');const selected=f.ctx.results.flat();assert(selected.reduce((n,c)=>n+viewport.componentViewportRecord(c).vertices,0)<=f.ctx.nativeAdmissionVertexLimit);assert(f.ctx.stagingRetainedEstimateBytes<=f.ctx.decodedCap);for(const selectedRows of f.ctx.results)assert(f.ctx.retainedShardCost.has(selectedRows));
 }
});
