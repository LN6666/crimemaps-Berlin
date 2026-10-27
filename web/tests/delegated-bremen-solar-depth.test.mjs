import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const web=process.env.CRIMEMAPS_SOLAR_ADAPTER_WEB_ROOT??fileURLToPath(new URL('../',import.meta.url));
const previous=await readFile(new URL('./resident-planar-reflection.test.mjs',import.meta.url),'utf8');
const setup=previous.slice(0,previous.indexOf('for(const provider of providers)test(')).replace("process.env.CRIMEMAPS_REFLECTION_WEB_ROOT??fileURLToPath(new URL('../',import.meta.url))",JSON.stringify(web));
const {fixture,evaluate,method,binding,productionHelpers}=await import('data:text/javascript;base64,'+Buffer.from(setup+'\nexport {fixture,evaluate,method,binding,productionHelpers};').toString('base64'));
const cases=[['delegated500','hamburg'],['delegated500','hannover'],['bremen','bremen']];
async function depthFixture(provider,city){
 const f=await fixture(provider),calls=[],deleted=[];Object.assign(f.values,{city,currentFamilyPrograms:provider==='delegated500'&&city==='berlin',partitionEnabled:true,legacySolarPartitions:provider==='delegated500'&&['hamburg','hannover'].includes(city),solarLegacyPrograms:new Map(),solarLegacyFailures:new Map(),solarLegacyCharacters:new Map(),sceneEnvironment:{sunlight:true,shadows:true},sceneSun:{shadowVector:[1,1]},baseSurfaceFragment:'source helper',surfaceFragment:undefined,cityPaintFragment:'complete base including all city hooks',solarDepthHelper:undefined,solarDepthLastSourceCharacters:0,solarDepthSourceCharacters:0,solarDepthProgram:undefined,paintProgramKey:n=>'owner'+n,paintProgramFragment:(key,city)=>'exact '+city+' '+key,legacyPartitionFragment:key=>'hooked exact '+city+' '+key,compileGeometryProgram(...args){calls.push(args);f.values.solarDepthLastSourceCharacters=4321;f.values.solarDepthSourceCharacters=7654;return {depth:calls.length};}});
 f.values.partitionRuns=[{firstIndex:0,indexCount:6,key:'base'},{firstIndex:6,indexCount:6,key:'owner-a'}];f.m.gl.deleteProgram=p=>deleted.push(p);
 for(const name of ['releaseLegacySolarDepth','solarLegacyResidentKeys','trimLegacySolarDepth','releaseSolarDepth','solarResidentKeys','trimSolarDepthPrograms','prepareSolarShadow'])if(f.text.includes('function '+name+'('))f.values[name]=await evaluate(binding(f.text,name),f.values);
 const programs=provider==='bremen'?f.values.solarDepthPrograms:f.values.solarLegacyPrograms,failures=provider==='bremen'?f.values.solarDepthFailures:f.values.solarLegacyFailures;
 return Object.assign(f,{calls,deleted,programs,failures,trim:()=>f.values[provider==='bremen'?'trimSolarDepthPrograms':'trimLegacySolarDepth']()});
}
async function actualMasks(f){
 const text=await readFile(path.join(web,`src/painted/${f.provider==='bremen'?'root500':f.provider}/safety/facade-rathaus-proxy-mask.ts`),'utf8');let generic={before:'generic'},indexed={before:'indexed'},uploads=0,removed=0;
 const before={generic,indexed},g=f.m.gl,get=g.getParameter.bind(g);g.getParameter=k=>k===g.UNIFORM_BUFFER_BINDING?generic:get(k);g.getIndexedParameter=()=>indexed;g.bindBuffer=(_t,p)=>{generic=p;};g.bindBufferBase=(_t,_i,p)=>{indexed=p;};g.bufferData=(_t,rows)=>{assert.equal(rows.byteLength,2048);uploads++;};g.deleteBuffer=()=>removed++;
 const create=await evaluate(method(text,'createRathausProxyMasks'),{rathausCoincidentWallFragmentMasks:()=>({masks:[],origin:undefined})}),masks=create();f.values.rathausProxyMasks=masks;
 return{masks,before,get generic(){return generic;},get indexed(){return indexed;},get uploads(){return uploads;},get removed(){return removed;}};
}
for(const [provider,city] of cases){
 test(`${city} ${provider}: offscreen exact resident partitions capture without camera colour admission`,async()=>{
  const f=await depthFixture(provider,city),m=await actualMasks(f),before=JSON.stringify([...f.values.loaded.values()]);f.first.box=[10,0,10,11,1,11];f.second.box=[20,0,20,21,1,21];
  assert.equal(f.values.solarCoverage().complete,false);assert.equal(f.calls.length,0);f.values.prepareSolarShadow();assert.equal(f.values.solarCoverage().complete,true);assert.equal(f.calls.length,2);assert.equal(f.values.partitionPrograms.size,0);
  const expected=provider==='bremen'?[['exact bremen base',false],['exact bremen owner-a',false]]:[['complete base including all city hooks',0],[`hooked exact ${city} owner-a`,0]];assert.deepEqual(f.calls.map(a=>a.slice(1,3)),expected);assert(f.calls.every(a=>a[3]===true));assert.equal(m.uploads,1);assert.equal(m.generic,m.before.generic);assert.equal(m.indexed,m.before.indexed);
  assert.equal(f.m.draws.length,0,'prepare never draws');assert.deepEqual(f.render({...f.pass,purpose:'solar-depth',maxTriangles:4,maxDraws:2}),{triangles:4,draws:2,complete:true});assert(f.m.draws.every(d=>d.program.depth));assert.equal(f.values.matrix,f.mainMatrix);assert.deepEqual(f.m.state,f.m.original);
  f.first.box=f.second.box=[-.1,0,-.1,.1,.1,.1];assert.equal(f.render(f.pass).complete,false,'normal reflection still requires original exact colour cache');assert.equal(f.values.partitionPrograms.size,0);
  f.values.paintMode=()=>0;assert.equal(f.values.solarCoverage().complete,true);f.m.draws.length=0;assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);assert(f.m.draws.every(d=>d.program===f.values.program),'white mode retains original program');
  assert.equal(JSON.parse(before)[0].start,f.first.start);assert.equal(f.values.indices.length,12);
 });
 test(`${city} ${provider}: mask versions, resident retirement and actual GPU teardown own all depth resources`,async()=>{
  const f=await depthFixture(provider,city),m=await actualMasks(f);f.values.prepareSolarShadow();const initial=f.calls.length;f.values.viewRevision++;f.values.prepareSolarShadow();assert.equal(f.calls.length,initial);assert.equal(m.uploads,1);
  m.masks.configure([],new Float32Array());assert.equal(m.masks.withResidentMasks(f.m.gl,{},()=>{}),false);f.values.prepareSolarShadow();assert.equal(m.uploads,2);assert.equal(f.calls.length,initial);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);assert.equal(m.generic,m.before.generic);assert.equal(m.indexed,m.before.indexed);
  f.values.partitionRuns=[{firstIndex:0,indexCount:12,key:'owner-a'}];f.trim();assert.deepEqual([...f.programs.keys()],['owner-a']);assert.equal(f.deleted.length,1);
  f.values.paintOverride=()=>1678.75;f.values.prepareSolarShadow();assert.deepEqual([...f.programs.keys()],['owner1679']);assert.equal(f.calls.length,initial+1);assert.equal(f.values.solarCoverage().complete,true);assert.equal(f.values.partitionPrograms.size,0);
  // Execute production upload prefix: new packed runs must retire old keys even before new GPU buffers are uploaded.
  Object.assign(f.values,{residentGPU:{beforeUpload:()=>true,released(){}},paintData:new Float32Array(),paintProgramRuns:()=>[],gl:undefined});const upload=await evaluate(binding(f.text,'upload'),f.values);upload();assert.equal(f.programs.size,0);f.values.gl=f.m.gl;f.values.partitionRuns=[{firstIndex:0,indexCount:12,key:'owner-a'}];f.values.paintOverride=()=>0;f.values.prepareSolarShadow();
  Object.assign(f.values,{reusableVertex673:undefined,diffuseTexture:undefined,windowTexture:undefined,vertexBuffer:undefined,indexBuffer:undefined,stateBuffer:undefined,paintBuffer:undefined,progressiveBuffer:undefined,releaseShadowGPU(){},texturedProgram:undefined,diffuseProgram:undefined,invalidateMatrix(){}});f.m.gl.deleteVertexArray=()=>{};
  const release=await evaluate(binding(f.text,'releaseGPU'),f.values);release();assert.equal(f.programs.size,0);assert.equal(f.failures.size,0);assert.equal(m.masks.stats.allocatedGPUBytes,0);assert.equal(f.values.program,undefined);assert.equal(f.values.vao,undefined);
 });
 test(`${city} ${provider}: compile/mask failure is bounded; source and GL generations can retry`,async()=>{
  const f=await depthFixture(provider,city),m=await actualMasks(f);f.values.partitionRuns=[{firstIndex:0,indexCount:12,key:'owner-a'}];f.values.needsBirth=true;f.values.prepareSolarShadow();assert.equal(f.calls.length,0);f.values.needsBirth=false;f.values.sceneEnvironment.shadows=false;f.values.prepareSolarShadow();assert.equal(f.calls.length,0);f.values.sceneEnvironment.shadows=true;
  f.m.gl.createBuffer=()=>null;f.values.prepareSolarShadow();f.values.prepareSolarShadow();assert.equal(f.calls.length,1);assert.equal(f.deleted.length,1);assert.equal(f.failures.size,1);assert.match(f.values.solarCoverage().reason,/solar-depth-compile-failed/);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,false);assert.equal(f.m.draws.length,0);assert.equal(m.generic,m.before.generic);assert.equal(m.indexed,m.before.indexed);
  f.values.paintMode=()=>0;assert.equal(f.values.solarCoverage().complete,true,'old rich-mode failure cannot block existing white path');f.values.paintMode=()=>2;
  f.m.gl.createBuffer=()=>({});f.values.baseSurfaceFragment='next material generation';f.values.prepareSolarShadow();assert.equal(f.calls.length,2);assert.equal(f.failures.size,0);assert.equal(f.values.solarCoverage().complete,true);
  let lost=true;f.m.gl.isContextLost=()=>lost;const count=f.calls.length;f.values.prepareSolarShadow();assert.equal(f.calls.length,count);f.values.releaseSolarDepth();assert.equal(f.programs.size,0);lost=false;f.values.prepareSolarShadow();assert.equal(f.calls.length,count+1);assert.equal(f.values.solarCoverage().complete,true);
  f.values.releaseSolarDepth();let attempts=0;f.values.compileGeometryProgram=()=>{attempts++;throw Error('fixture compiler failure');};f.values.prepareSolarShadow();f.values.prepareSolarShadow();assert.equal(attempts,1);assert.equal(f.failures.size,1);f.values.partitionRuns=[];f.trim();assert.equal(f.failures.size,0,'retired keys do not leave an unbounded failure history');
 });
}
test('delegated Berlin keeps its previously accepted single full depth program and colour branch',async()=>{
 const f=await depthFixture('delegated500','berlin');await actualMasks(f);f.values.prepareSolarShadow();assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].slice(1),['complete base including all city hooks',0,true]);assert(f.values.solarDepthProgram);assert.equal(f.programs.size,0);assert.equal(f.values.solarCoverage().complete,true);
});
test('delegated legacy source is exactly its original colour hook expression and keeps the full base exception',async()=>{
 const f=await depthFixture('delegated500','hannover'),hookNames=['f025FigureFragment663','f020StoneFragment660','f020TurretFragment659','f020AnnexFragment658','f020NaveFragment657','f020ApseFragment656','f020ButtressFragment655','f020ChapelFragment654','f020Fragment652','f004Fragment645'];
 // Exercise the actual colour entry and depth-source selector's shared production helper.
 const values={city:'hannover',paintProgramFragment:(key,city)=>`original:${city}:${key}`};for(const name of hookNames)values[name]=(text,city)=>`${name}(${text},${city})`;
 const current=await evaluate(binding(f.text,'legacyPartitionFragment'),values);const colour=await evaluate('(key)=>'+binding(f.text,'partitionSource'),{...values,currentFamilyPrograms:false,legacyPartitionFragment:current});assert.equal(current('f340'),colour('f340'));
 assert.equal(current('f340'),hookNames.reduceRight((text,name)=>`${name}(${text},hannover)`,'original:hannover:f340'));
});
test('actual depth compilers preserve supplied structural code, original vertex and attribute slots',async()=>{
 const {createSolarDepthFragment}=await productionHelpers('src/safety/solar-depth-fragment.ts'),full='#version 300 es\nprecision highp float;out vec4 color;uniform bool hole;void cut(){if(hole)discard;}void main(){cut();gl_FragDepth=gl_FragCoord.z;color=vec4(.25);}';
 for(const [provider,city]of [cases[0],cases[2]]){const f=await depthFixture(provider,city),submitted=[],attrs=[],gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,createShader:type=>({type}),shaderSource:(_s,t)=>submitted.push(t),compileShader(){},getShaderParameter:()=>true,createProgram:()=>({}),attachShader(){},bindAttribLocation:(_p,i,n)=>attrs.push([i,n]),linkProgram(){},getProgramParameter:()=>true,deleteShader(){},deleteProgram(){},isContextLost:()=>false};
  Object.assign(f.values,{gl,VERTEX:'original vertex and growth',fragment:(_helper,paint)=>{assert.equal(paint,'full material source');return full;},createSolarDepthFragment,initialPaintFragment:'wrong initialization stub',diagnostic557:false,reusableVertex673:undefined,specializeCurrentPaintFragment(){throw Error('solar must not family-specialize');},pruneOwner6307Fragment(){throw Error('solar must not owner-prune');}});const compile=await evaluate(binding(f.text,'compileGeometryProgram'),f.values);compile('helper','full material source',provider==='bremen'?false:0,true);assert.equal(submitted[0],'original vertex and growth');assert(submitted[1].includes('void cut(){if(hole)discard;}'));assert(submitted[1].includes('gl_FragDepth=gl_FragCoord.z;color=vec4(.25);'));assert(submitted[1].includes('cmSolarOriginalMain();color=vec4(1.);'));assert.deepEqual(attrs.map(r=>r[1]),['a_position','a_normal','a_color','a_selected','a_paint_frame','a_paint_family','a_progressive_color']);
 }
});
