import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
// Reuse the existing fixture setup only: its original reflection assertions still run separately.
const web=fileURLToPath(new URL('../',import.meta.url));
const previous=await readFile(new URL('./resident-planar-reflection.test.mjs',import.meta.url),'utf8');
const setup=previous.slice(0,previous.indexOf('for(const provider of providers)test(')).replace("process.env.CRIMEMAPS_REFLECTION_WEB_ROOT??fileURLToPath(new URL('../',import.meta.url))",JSON.stringify(web));
const {fixture,helpers,providers,evaluate,method,binding,productionHelpers}=await import('data:text/javascript;base64,'+Buffer.from(setup+'\nexport {fixture,helpers,providers,evaluate,method,binding,productionHelpers};').toString('base64'));
for(const provider of providers)test(`${provider}: actual resident solar capture keeps all mask/material draws, disables water clip and restores state`,async()=>{
 const f=await fixture(provider),wrapper=[];f.values.withSceneSolarShadowReceiver=(gl,matrix,draw,disabled)=>{wrapper.push({matrix,disabled});return draw();};
 // Outside the main-camera identity box: solar coverage must include all resident casters.
 f.first.box=[20,2,30,24,12,36];f.second.box=[-12,1,-8,-4,5,-2];f.values.anchor=[.53,.34];f.values.anchorUnit=1000;
 const actual=f.values.solarCoverage();assert(actual.complete);assert.equal(actual.triangles,4);assert.equal(actual.draws,2);
 [.518,.304,0,.554,.348,.012].forEach((expected,i)=>assert(Math.abs(actual.bounds[i]-expected)<1e-12));
 const before=JSON.stringify([...f.values.loaded.values()]);const seen=[];const draw=f.m.gl.drawElements;f.m.gl.drawElements=(...args)=>{seen.push({depth:f.m.state.mask,blend:f.m.state.blend,clip:f.m.clip.at(-1)});draw(...args);};
 const r=f.render({...f.pass,purpose:'solar-depth',maxTriangles:actual.triangles,maxDraws:actual.draws});
 assert.deepEqual(r,{triangles:4,draws:2,complete:true});assert.equal(f.masks,2);assert(seen.every(s=>s.depth&&!s.blend&&s.clip===0));assert(wrapper[0].disabled);assert.equal(wrapper[0].matrix,f.pass.mainMatrix);assert.deepEqual(f.m.state,f.m.original);assert.equal(JSON.stringify([...f.values.loaded.values()]),before);assert.equal(f.m.creates,0);assert.equal(f.m.uploads,0);
 f.m.draws.length=0;f.values.anchor=[0,0];f.values.anchorUnit=1;const reflection=f.render({...f.pass,maxTriangles:2,maxDraws:1});assert.equal(reflection.draws,0,'ordinary reflection still culls the off-camera boxes');assert.equal(wrapper.at(-1).disabled,false);
 f.first.box=f.second.box=[-.1,0,-.1,.1,.1,.1];f.values.anchor=[0,0];f.values.anchorUnit=1;
 assert.deepEqual(f.render({...f.pass,maxTriangles:2,maxDraws:1}),{triangles:2,draws:1,complete:false});assert(f.m.clip.includes(1),'ordinary reflection still enables water clipping');
});
test('every actual provider rejects unfinished growth/first-frame work and translucent casters without losing ordinary reflection',async()=>{
 for(const provider of providers){const f=await fixture(provider),solar=()=>f.render({...f.pass,purpose:'solar-depth'});
  f.values.needsBirth=true;assert.equal(f.values.solarCoverage().complete,false);assert.equal(solar().complete,false);assert.equal(f.m.draws.length,0);
  f.values.needsBirth=false;f.values.birth.set('growing',0);assert.equal(f.values.solarCoverage().complete,false);assert.equal(solar().complete,false);f.values.birth.clear();assert(f.values.solarCoverage().complete);
  f.values.opacity=.5;assert.equal(f.values.solarCoverage(),undefined);assert.deepEqual(solar(),{triangles:0,draws:0,complete:true});assert.equal(f.render(f.pass).draws,2);
  f.values.opacity=1;f.values.opacityContext='route-selection';assert.equal(f.values.solarCoverage(),undefined);f.values.opacityContext='normal';f.values.enabled=false;assert.equal(f.values.solarCoverage(),undefined);
 }
});
test('solar revision excludes pure camera updates but tracks source, mask, growth and resident readiness',async()=>{
 for(const provider of providers){const f=await fixture(provider),revision=await evaluate(method(f.text,'getSolarShadowRevision'),f.values),initial=revision();f.values.viewRevision+=1;assert.equal(revision(),initial);
  for(const change of [()=>f.values.generation++,()=>f.values.reflectionResidentRevision++,()=>f.values.rathausProxyMasks.residentRevision='next-mask',()=>f.values.needsBirth=true,()=>f.values.birth.set('new',0),()=>f.values.program={kind:'replacement'}]){const before=revision();change();assert.notEqual(revision(),before);}
 }
});
test('missing resident family or mask cannot publish an apparently complete solar target',async()=>{
 for(const provider of ['city','root500','delegated500','tier300','church','infill','bremen']){const f=await fixture(provider);f.values.rathausProxyMasks.withResidentMasks=()=>false;assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,false);assert.equal(f.m.draws.length,0);}
 const f=await fixture('city');f.values.materialProgramsCurrent=()=>false;assert.equal(f.values.solarCoverage().complete,false);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,false);
});
test('invalid bounds and units are never labelled complete and source bounds remain immutable',()=>{
 const rows=[{start:0,end:3,box:[1,2,3,4,5,6]}],before=JSON.stringify(rows);assert.equal(helpers.residentSolarShadowCoverage(rows,[.5,.4],0,1,1,true).complete,false);assert.equal(helpers.residentSolarShadowCoverage([{...rows[0],box:[4,2,3,1,5,6]}],[.5,.4],100,1,1,true).complete,false);assert.equal(helpers.residentSolarShadowCoverage(rows,[.5,.4],100,1,1,false).complete,false);assert.equal(JSON.stringify(rows),before);
});

test('dedicated Reichstag uses the same opaque resident mesh for solar capture and preserves reflection semantics',async()=>{
 const fixtureText=await readFile(new URL('./planar-building-reflection.test.mjs',import.meta.url),'utf8'),fakeGL=await evaluate(binding(fixtureText,'fakeGL'),{}),dedicatedGL=await evaluate(binding(fixtureText,'dedicatedGL'),{fakeGL});
 const oldLocation=globalThis.location;globalThis.location={search:''};let createDedicatedReichstagLayer;try{({createDedicatedReichstagLayer}=await productionHelpers('src/safety/dedicated-reichstag-mesh.ts'));}finally{if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;}
 const vertex=new ArrayBuffer(72),v=new DataView(vertex);for(let i=0;i<3;i++){v.setFloat32(i*24,i,true);v.setFloat32(i*24+4,i?10:0,true);v.setFloat32(i*24+8,i===2?1:0,true);v.setInt16(i*24+14,32767,true);for(let j=18;j<22;j++)v.setUint8(i*24+j,255);}
 const mesh={origin:[13.3761,52.5186],vertex,index:new Uint16Array([0,1,2]),vertices:3,triangles:1,identity:{objectId:'osm/relation/8990774',partId:'osm/relation/8990774/component/35b9af608ec3d7abc1c1'},sourceCommit:'cca429f4e72a1b1b962de4d944ec83fed96869e8',boundarySHA:'a'.repeat(64)},f=dedicatedGL(),r=createDedicatedReichstagLayer({triggerRepaint(){}},mesh),matrix=Float64Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),pass={gl:f.gl,mainMatrix:matrix,clipPlaneWorldZ:0,maxTriangles:1,maxDraws:1,purpose:'solar-depth'};
 r.setEnabled(true);r.layer.onAdd({},f.gl);r.setGrowth(.5);assert.equal(r.getSolarShadowCoverage().complete,false);assert.equal(r.renderPlanarReflection(pass).complete,false);assert.equal(f.gl.surfaceDraws.length,0);r.setGrowth(1);
 const coverage=r.getSolarShadowCoverage();assert.equal(coverage.complete,true);assert.equal(coverage.triangles,1);assert.equal(coverage.draws,1);assert(coverage.bounds[5]>0);const before=f.gl.snapshot(),compiled=f.compiled,uploads=f.uploads;
 assert.deepEqual(r.renderPlanarReflection(pass),{triangles:1,draws:1,complete:true});assert.equal(f.gl.surfaceDraws.at(-1).clip,0);assert.equal(f.gl.snapshot(),before);assert.equal(f.compiled,compiled);assert.equal(f.uploads,uploads);
 r.setOpacity(.5);assert.equal(r.getSolarShadowCoverage(),undefined);assert.equal(r.renderPlanarReflection(pass).draws,0);assert.equal(r.renderPlanarReflection({...pass,purpose:undefined}).draws,1);assert.equal(f.gl.surfaceDraws.at(-1).clip,1);r.destroy();assert.equal(r.getSolarShadowCoverage(),undefined);
});

test('coverage reports the existing growth, GPU and resident-run blocker without compiling or drawing',async()=>{
 for(const provider of providers){const f=await fixture(provider);f.values.needsBirth=true;assert.equal(f.values.solarCoverage().reason,'needs-birth');f.values.needsBirth=false;f.values.birth.set('a',0);assert.equal(f.values.solarCoverage().reason,'growing');f.values.birth.clear();f.values.gpuReady=()=>false;assert.equal(f.values.solarCoverage().reason,'gpu-unready');assert.equal(f.m.draws.length,0);}
 for(const provider of ['root500','delegated500','tier300','church']){const f=await fixture(provider),key=currentKey(f);if(provider==='root500'||provider==='delegated500'){f.values.partitionEnabled=true;f.values.partitionRuns=[{firstIndex:0,indexCount:12,key}];}else f.values.familyRuns=[{firstIndex:0,indexCount:12,key}];if(provider==='delegated500'||provider==='church')f.values.solarDepthProgram=undefined;const value=f.values.solarCoverage();assert.equal(value.complete,false,provider);assert.equal(value.reason,'missing-program',provider);assert.equal(f.m.draws.length,0);}
 function currentKey(f){return f.values.currentPaintProgramKey(19401);}
 const c=[{start:0,end:6,box:[0,0,0,1,1,1]}];assert.equal(helpers.planResidentReflection(c,[{firstIndex:3,indexCount:3,program:{}}],[],100,100,6,false).reason,'run-coverage');assert.equal(helpers.planResidentReflection([{...c[0],end:0}],[],[],100,100,6,false).reason,'invalid-component-range');
});

async function depthFixture(provider){const f=await fixture(provider),calls=[],deleted=[];Object.assign(f.values,{partitionEnabled:true,sceneEnvironment:{sunlight:true,shadows:true},sceneSun:{shadowVector:[1,1]},baseSurfaceFragment:'source helper',surfaceFragment:undefined,cityPaintFragment:'complete Berlin source with all hooks',solarDepthHelper:undefined,solarDepthLastSourceCharacters:0,solarDepthSourceCharacters:0,solarDepthProgram:undefined,paintProgramKey:n=>'owner'+n,paintProgramFragment:(key,city)=>'exact '+city+' '+key,compileGeometryProgram(...args){calls.push(args);f.values.solarDepthLastSourceCharacters=4321;f.values.solarDepthSourceCharacters=7654;return {depth:calls.length};}});f.m.gl.deleteProgram=p=>deleted.push(p);f.values.rathausProxyMasks.withMasks=(_gl,_p,draw)=>draw();
 for(const name of [...(provider==='delegated500'?['releaseLegacySolarDepth']:[]),'releaseSolarDepth',...(provider==='root500'?['solarResidentKeys','trimSolarDepthPrograms']:[]),'prepareSolarShadow'])f.values[name]=await evaluate(binding(f.text,name),f.values);
 return Object.assign(f,{calls,deleted});
}
test('actual offscreen root partitions and full Berlin delegated depth prepare without expanding the visible colour cache',async()=>{
 for(const provider of ['root500','delegated500']){const f=await depthFixture(provider);f.values.partitionRuns=[{firstIndex:0,indexCount:6,key:'owner-a'},{firstIndex:6,indexCount:6,key:'owner-b'}];const colourSize=f.values.partitionPrograms.size;
  assert.equal(f.values.solarCoverage().complete,false);assert.equal(f.calls.length,0,'coverage stays read-only');f.values.prepareSolarShadow();assert(f.values.solarCoverage().complete);assert.equal(f.values.partitionPrograms.size,colourSize);assert.equal(f.calls.length,provider==='root500'?2:1);assert(f.calls.every(args=>args[3]===true));
  assert.deepEqual(f.calls.map(args=>args.slice(1,3)),provider==='root500'?[['exact berlin owner-a',false],['exact berlin owner-b',false]]:[['complete Berlin source with all hooks',0]]);
  const n=f.calls.length,revision=f.values.solarDepthRevision;f.values.viewRevision++;f.values.prepareSolarShadow();assert.equal(f.calls.length,n);assert.equal(f.values.solarDepthRevision,revision);assert.equal(f.m.draws.length,0);assert.equal(f.m.creates,0);assert.equal(f.m.uploads,0);
  const result=f.render({...f.pass,purpose:'solar-depth'});assert(result.complete);assert.equal(result.triangles,4);assert.equal(f.masks,2);assert(f.m.draws.every(row=>row.program.depth));
  assert.equal(f.render(f.pass).complete,false,'ordinary reflection still requires its original exact colour programs');
  f.values.baseSurfaceFragment='changed source helper';f.values.prepareSolarShadow();assert.equal(f.calls.length,n*2);assert.equal(f.deleted.length,n);
  f.values.releaseSolarDepth();assert.equal(f.values.solarDepthPrograms.size,0);assert.equal(f.values.solarDepthProgram,undefined);
 }
});
test('depth preparation is gated, failure-deduplicated, retired with root resident keys, and released by the actual GPU teardown',async()=>{
 for(const provider of ['root500','delegated500']){const f=await depthFixture(provider);f.values.partitionRuns=[{firstIndex:0,indexCount:12,key:'owner-a'}];f.values.needsBirth=true;f.values.prepareSolarShadow();assert.equal(f.calls.length,0);f.values.needsBirth=false;f.values.sceneEnvironment.shadows=false;f.values.prepareSolarShadow();assert.equal(f.calls.length,0);f.values.sceneEnvironment.shadows=true;
  let attempts=0;f.values.compileGeometryProgram=()=>{attempts++;throw Error('fixture compile failure');};f.values.prepareSolarShadow();f.values.prepareSolarShadow();assert.equal(attempts,1);assert.match(f.values.solarCoverage().reason,/solar-depth-compile-failed/);
  f.values.releaseSolarDepth();f.values.compileGeometryProgram=()=>({depth:++attempts});f.values.prepareSolarShadow();assert(f.values.solarCoverage().complete);
  if(provider==='root500'){f.values.partitionRuns=[];f.values.trimSolarDepthPrograms();assert.equal(f.values.solarDepthPrograms.size,0);assert.equal(f.values.solarDepthFailures.size,0);assert.equal(f.deleted.length,1);f.values.partitionRuns=[{firstIndex:0,indexCount:12,key:'owner-a'}];f.values.prepareSolarShadow();}
  Object.assign(f.values,{residentGPU:{released(){}},reusableVertex673:undefined,diffuseTexture:undefined,windowTexture:undefined,vertexBuffer:undefined,indexBuffer:undefined,stateBuffer:undefined,paintBuffer:undefined,progressiveBuffer:undefined,releaseShadowGPU(){},texturedProgram:undefined,diffuseProgram:undefined});f.values.rathausProxyMasks.detach=()=>{};f.m.gl.deleteVertexArray=()=>{};
  const release=await evaluate(binding(f.text,'releaseGPU'),f.values);release();assert.equal(f.values.solarDepthProgram,undefined);assert.equal(f.values.solarDepthPrograms.size,0);assert.equal(f.values.solarDepthFailures.size,0);
 }
});
test('actual compilers preserve original vertex, full supplied material/discard and fixed attributes in the depth branch',async()=>{
 const {createSolarDepthFragment}=await productionHelpers('src/safety/solar-depth-fragment.ts');const full='#version 300 es\nprecision highp float;out vec4 color;uniform bool hole;void cut(){if(hole)discard;}void main(){cut();gl_FragDepth=gl_FragCoord.z;color=vec4(.25);}';
 for(const provider of ['root500','delegated500']){const f=await depthFixture(provider),submitted=[],attrs=[],g={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,createShader:type=>({type}),shaderSource:(_s,t)=>submitted.push(t),compileShader(){},getShaderParameter:()=>true,createProgram:()=>({}),attachShader(){},bindAttribLocation:(_p,i,n)=>attrs.push([i,n]),linkProgram(){},getProgramParameter:()=>true,deleteShader(){},deleteProgram(){},isContextLost:()=>false};
  Object.assign(f.values,{gl:g,VERTEX:'original vertex and growth',fragment:(helper,paint)=>{assert.equal(paint,'full material source');return full;},createSolarDepthFragment,initialPaintFragment:'wrong initial stub',diagnostic557:false,reusableVertex673:undefined,specializeCurrentPaintFragment(){throw Error('must not family-specialize solar source');},pruneOwner6307Fragment(){throw Error('must not owner-prune supplied solar source');}});
  const compile=await evaluate(binding(f.text,'compileGeometryProgram'),f.values);compile('helper','full material source',provider==='root500'?false:0,true);assert.equal(submitted[0],'original vertex and growth');assert(submitted[1].includes('void cut(){if(hole)discard;}'));assert(submitted[1].includes('gl_FragDepth=gl_FragCoord.z;color=vec4(.25);'));assert(submitted[1].includes('cmSolarOriginalMain();color=vec4(1.);'));assert.deepEqual(attrs.map(row=>row[1]),['a_position','a_normal','a_color','a_selected','a_paint_frame','a_paint_family','a_progressive_color']);
 }
});

// Regression: an off-camera source can have a complete depth program but no UBO
// because no ordinary camera draw has uploaded its masks yet.
async function attachActualMasks(f){
 const text=await readFile(new URL(`../src/painted/${f.provider}/safety/facade-rathaus-proxy-mask.ts`,import.meta.url),'utf8');
 let plan={masks:[],origin:undefined},generic={previous:'generic'},indexed={previous:'indexed'},uploads=[],indexedBinds=0,removed=0;
 const before={generic,indexed},g=f.m.gl,originalGet=g.getParameter.bind(g);
 g.getParameter=k=>k===g.UNIFORM_BUFFER_BINDING?generic:originalGet(k);g.getIndexedParameter=()=>indexed;g.bindBuffer=(_target,p)=>{generic=p;};g.bindBufferBase=(_target,_binding,p)=>{indexed=p;indexedBinds++;};
 g.bufferData=(_target,data)=>uploads.push(new Float32Array(data));g.deleteBuffer=()=>{removed++;};
 const create=await evaluate(method(text,'createRathausProxyMasks'),{rathausCoincidentWallFragmentMasks:()=>plan}),masks=create();f.values.rathausProxyMasks=masks;
 return {masks,uploads,before,get generic(){return generic;},get indexed(){return indexed;},get indexedBinds(){return indexedBinds;},get removed(){return removed;},setNonempty(){
  plan={masks:[{outline:{ring:0,edge:0},u:[.2,.8],y:[1,3]}],origin:[13,52]};
  const ring=[[0,0],[1,0],[1,1],[0,1],[0,0]],positions=[],normals=[];for(let i=0;i<4;i++){for(const [x,z]of [ring[i],ring[i+1],ring[i+1],ring[i]]){positions.push(x,1,z);normals.push(0,0,1);}}
  const paint=new Float32Array(20*5);for(let i=0;i<20;i++)paint[i*5+4]=120;paint[5*5]=1;
  masks.configure([{objectId:'osm/relation/147095',batches:[{positions:new Float32Array(12)},{positions,normals}],componentGeometry:{coordinates:[ring]}}],paint);
 }};
}
test('solar prepare uploads empty and later nonempty active masks before offscreen capture, preserving caller GL bindings',async()=>{
 for(const provider of ['root500','delegated500']){const f=await depthFixture(provider),a=await attachActualMasks(f);f.values.partitionRuns=[{firstIndex:0,indexCount:12,key:'owner-a'}];
  f.values.prepareSolarShadow();assert.equal(a.uploads.length,1,provider+' empty active block must own a valid UBO');assert.equal(a.uploads[0].byteLength,2048);assert(a.uploads[0].every(x=>x===0));assert.equal(f.m.draws.length,0,'prepare must not draw');assert.equal(a.generic,a.before.generic);assert.equal(a.indexed,a.before.indexed);assert.equal(f.values.partitionPrograms.size,0);
  const ready=f.render({...f.pass,purpose:'solar-depth'});assert.deepEqual(ready,{triangles:4,draws:2,complete:true});const programs=f.calls.length;f.m.draws.length=0;f.values.prepareSolarShadow();assert.equal(a.uploads.length,1);assert.equal(f.calls.length,programs);
  a.setNonempty();assert.equal(a.masks.stats.maskCount,1);assert.equal(a.masks.withResidentMasks(f.m.gl,{},()=>{}),false,'new data version stays unready before preparation');f.values.prepareSolarShadow();assert.equal(f.calls.length,programs,'version update does not recompile an unchanged shader');assert.equal(a.uploads.length,2);assert(a.uploads[1].some(x=>x!==0));assert.equal(a.generic,a.before.generic);assert.equal(a.indexed,a.before.indexed);assert.equal(f.m.draws.length,0);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);
  a.masks.detach();assert.equal(a.removed,1);assert.equal(a.masks.stats.allocatedGPUBytes,0);f.values.releaseSolarDepth();f.values.prepareSolarShadow();assert.equal(a.uploads.length,3,'GPU teardown permits fresh mask preparation');assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);
 }
});
test('solar mask preparation failure retires the temporary depth program and cannot publish or retry every frame',async()=>{
 for(const provider of ['root500','delegated500']){const f=await depthFixture(provider),a=await attachActualMasks(f);f.values.partitionRuns=[{firstIndex:0,indexCount:12,key:'owner-a'}];f.m.gl.createBuffer=()=>null;f.values.prepareSolarShadow();f.values.prepareSolarShadow();assert.equal(f.calls.length,1);assert.equal(f.deleted.length,1);assert.equal(f.values.solarCoverage().complete,false);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,false);assert.equal(f.m.draws.length,0);assert.equal(a.generic,a.before.generic);assert.equal(a.indexed,a.before.indexed);
  f.values.releaseSolarDepth();f.m.gl.createBuffer=()=>({});f.values.prepareSolarShadow();assert.equal(f.values.solarCoverage().complete,true);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);
 }
});
