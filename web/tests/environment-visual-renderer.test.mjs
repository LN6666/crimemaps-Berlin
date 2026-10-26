import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
async function bundle(name){const r=await build({entryPoints:[path.join(safety,name)],bundle:true,write:false,platform:'node',format:'esm',target:'es2022',preserveSymlinks:true});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));}
const data=await bundle('environment-scene-data.ts'),view=await bundle('environment-view.ts'),tree=await bundle('environment-tree-shadows.ts'),rendererModule=await bundle('environment-scene-renderer.ts');
const solarResult=await build({entryPoints:[path.join(safety,'solar-shadow-admission.ts')],bundle:true,write:false,platform:'node',format:'esm'});
const solarEntry=await build({entryPoints:[path.join(safety,'scene-solar-light.ts')],bundle:true,write:false,platform:'node',format:'esm'});
const solarModule=await import('data:text/javascript;base64,'+Buffer.from(solarEntry.outputFiles[0].text).toString('base64'));
const boundaryModule=await import('data:text/javascript;base64,'+Buffer.from(solarResult.outputFiles[0].text).toString('base64'));
function multiply(a,b){return Array.from({length:16},(_,i)=>{const r=i%4,c=Math.floor(i/4);let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];return v;});}
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const sceneProjection=(()=>{const lat=52.5*Math.PI/180,unit=40075016.68557849*Math.cos(lat),ax=13.4/360+.5,ay=(1-Math.log(Math.tan(Math.PI/4+lat/2))/Math.PI)/2,unmodel=[unit,0,0,0,0,0,-unit,0,0,unit,0,0,-ax*unit,0,ay*unit,1],angle=.73,c=Math.cos(angle),s=Math.sin(angle),view=[1,0,0,0,0,c,s,0,0,-s,c,0,0,-8,-100,1],near=.1,far=400,f=1.7,p=[f,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];return multiply(multiply(p,view),unmodel);})();
const light=vector=>({shadowVector:vector});
const square=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
test('five-lobe geometry is shared, finite, bounded by the source-point guard and keeps actual height',()=>{
 const a=data.lowPolyTreeMesh(),b=data.lowPolyTreeMesh();assert.equal(a,b);assert.equal(a.positions,b.positions);assert.equal(a.triangles,112);assert.ok(a.vertices<500);assert.ok(a.horizontalRadiusMetres+.08<5);
 let top=0;const lobes=new Set();for(let i=0;i<a.positions.length;i+=7){assert.ok(Array.from(a.positions.subarray(i,i+7)).every(Number.isFinite));assert.ok(a.positions[i+1]>=0&&a.positions[i+1]<=1);top=Math.max(top,a.positions[i+1]);assert.ok(Math.abs(Math.hypot(...a.positions.subarray(i+3,i+6))-1)<1e-6);if(a.positions[i+6]>.5)lobes.add(a.positions[i+6]);}
 assert.equal(top,1);assert.equal(lobes.size,5);assert.ok(a.indices.every(i=>i<a.vertices));
});
test('view vector and eye are recovered from actual perspective and orthographic matrices, with cache reuse',()=>{
 const near=.1,far=100,f=1.7,p=[f,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0],v=identity.slice();v[13]=-3;v[14]=-7;
 const m=multiply(p,v),got=view.environmentViewFromMatrix(m);assert.equal(got.perspective,true);assert.ok(got.eye.every((n,i)=>Math.abs(n-[0,3,7][i])<1e-10));assert.ok(got.direction.every((n,i)=>Math.abs(n-[0,0,1][i])<1e-10));
 assert.equal(view.environmentViewFromMatrix(identity).perspective,false);assert.deepEqual(view.environmentViewFromMatrix(new Float64Array(16)).direction,[0,1,0]);
 const cache=view.createEnvironmentViewCache();assert.equal(cache.read(m),cache.read(m.slice()));assert.equal(cache.updates,1);const changed=m.slice();changed[12]+=.1;cache.read(changed);assert.equal(cache.updates,2);
});
test('tree shadow envelopes include actual height and follow angular direction without moving source instances',()=>{
 const state=tree.createEnvironmentTreeShadows(2);state.setOrigin([13.4,52.5]);const input=new Float32Array([0,0,20,10,3,4]),before=new Float32Array(input),boxes=[];
 const boundary={boundarySHA256:'a'.repeat(64),vertices:4,covers:b=>{boxes.push(Array.from(b));return boxes.length>1;}};
 assert.equal(state.update(input,2,1,light([-2,1]),boundary,2.2,true),true);assert.equal(state.stats.count,2);assert.deepEqual(input,before);assert.deepEqual(state.instances,input);
 const expected=boundaryModule.solarShadowBoxForPackedBounds([13.4,52.5],[-2.2,0,-2.2,2.2,20,2.2],light([-2,1]));assert.ok(boxes[1].every((n,i)=>Math.abs(n-expected[i])<1e-12));
 const ref=state.instances;assert.equal(state.update(input,2,1,light([2,-1]),boundary,2.2,true),false);assert.equal(state.instances,ref);assert.deepEqual(state.instances,input);assert.equal(state.stats.scratchBytes,2*46+64);
});
test('a 5m tree crown guard is not accepted as a solar city proof; swept projection rejects a remote hole',()=>{
 const rad=Math.PI/180,R=6378137*Math.cos(52.5*rad),lon=x=>13.4+x/R/rad,lat=z=>(2*Math.atan(Math.exp(Math.log(Math.tan(Math.PI/4+52.5*rad/2))+z/R))-Math.PI/2)/rad;
 const geometry={type:'Polygon',coordinates:[square(lon(-100),lat(-100),lon(100),lat(100)),square(lon(-24),lat(5),lon(-16),lat(15))]},boundary=boundaryModule.prepareSolarShadowBoundary({boundarySHA256:'b'.repeat(64),geometry});
 const state=tree.createEnvironmentTreeShadows(1);state.setOrigin([13.4,52.5]);const points=new Float32Array([0,0,20]);
 state.update(points,1,1,light([-2,1]),boundary,2.2,true);assert.equal(state.stats.count,0);assert.equal(state.stats.withheld,1);
 state.update(points,1,1,light([2,-1]),boundary,2.2,true);assert.equal(state.stats.count,1);
});
test('shadow scratch and membership buffer change only for a real membership/source change; night/off are explicit',()=>{
 const state=tree.createEnvironmentTreeShadows(1),points=new Float32Array([0,0,12]),boundary={boundarySHA256:'c'.repeat(64),vertices:4,covers:()=>true};state.setOrigin([13.4,52.5]);
 state.update(points,1,1,light([-1,0]),boundary,2,true);const ref=state.instances;assert.equal(state.update(points,1,1,light([-.9,.1]),boundary,2,true),false);assert.equal(state.instances,ref);
 assert.equal(state.update(points,1,1,light(undefined),boundary,2,true),true);assert.equal(state.stats.count,0);assert.equal(state.stats.mode,'sun-below-shadow-altitude');assert.equal(state.update(points,1,1,light(undefined),boundary,2,true),false);
 state.update(points,1,1,light([-1,0]),boundary,2,true);assert.equal(state.update(points,1,1,light([-1,0]),boundary,2,false),true);assert.equal(state.stats.mode,'disabled');
 state.update(points,1,2,light([-1,0]),undefined,2,true);assert.equal(state.stats.count,0);assert.match(state.stats.mode,/verified/);state.destroy();assert.equal(state.stats.mode,'destroyed');
});
function fakeGL(){let n=1,boundArray,vao,program,texture=null,framebuffer=null;const enabled=new Set(),uniforms=new Map(),buffers=[],writes=[],draws=[],attributes=new Map(),blend=[1,0,1,0];const g={};
 for(const key of ['DRAW_FRAMEBUFFER_BINDING','DRAW_FRAMEBUFFER','FRAMEBUFFER_COMPLETE','MAX_TEXTURE_SIZE','SAMPLER_BINDING','DEPTH_RANGE','STENCIL_WRITEMASK','STENCIL_BACK_WRITEMASK','STENCIL_TEST','SCISSOR_TEST','COLOR_WRITEMASK','FRONT','BACK','R8','RED','UNSIGNED_BYTE','COLOR','MAX','TEXTURE_MIN_FILTER','TEXTURE_MAG_FILTER','TEXTURE_WRAP_S','TEXTURE_WRAP_T','NEAREST','CLAMP_TO_EDGE','COLOR_ATTACHMENT0','ACTIVE_TEXTURE','TEXTURE0','TEXTURE_BINDING_2D','TEXTURE_2D','VIEWPORT','VERTEX_ARRAY_BINDING','ARRAY_BUFFER_BINDING','CURRENT_PROGRAM','DEPTH_TEST','BLEND','CULL_FACE','DEPTH_WRITEMASK','DEPTH_FUNC','LINE_WIDTH','BLEND_SRC_RGB','BLEND_DST_RGB','BLEND_SRC_ALPHA','BLEND_DST_ALPHA','BLEND_EQUATION_RGB','BLEND_EQUATION_ALPHA','FUNC_ADD','ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','STATIC_DRAW','DYNAMIC_DRAW','VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','FLOAT','LEQUAL','TRIANGLES','LINES','UNSIGNED_INT','UNSIGNED_SHORT','SRC_ALPHA','ONE_MINUS_SRC_ALPHA','ONE'])g[key]=n++;
 Object.assign(g,{activeTexture(){},bindTexture:(_t,v)=>texture=v,bindSampler(){},createTexture:()=>({id:n++}),deleteTexture(){},createFramebuffer:()=>({id:n++}),deleteFramebuffer(){},bindFramebuffer:(_t,v)=>framebuffer=v,texImage2D(){},texParameteri(){},framebufferTexture2D(){},checkFramebufferStatus:()=>g.FRAMEBUFFER_COMPLETE,clearBufferfv(){},viewport(){},colorMask(){},stencilMaskSeparate(){},buffers,writes,draws,attributes,uniforms,blend,createVertexArray:()=>({id:n++}),createBuffer:()=>{const b={id:n++};buffers.push(b);return b;},createProgram:()=>({id:n++}),createShader:()=>({id:n++}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,attachShader(){},linkProgram(){},getProgramParameter:()=>true,deleteShader(){},deleteBuffer(){},deleteVertexArray(){},deleteProgram(){},bindVertexArray:v=>vao=v,bindBuffer:(target,b)=>{if(target===g.ARRAY_BUFFER)boundArray=b;},bufferData:(target,data)=>writes.push({target,buffer:boundArray,bytes:data.byteLength}),getAttribLocation:(_p,name)=>({a_position:0,a_normal:1,a_role:2,a_tree:3}[name]??-1),enableVertexAttribArray(){},vertexAttribPointer:(at)=>{if(vao){const key=vao.id+':'+at;attributes.set(key,boundArray);}},vertexAttribDivisor(){},getUniformLocation:(_p,name)=>name,uniform1f:(k,v)=>uniforms.set(k,v),uniform1i:(k,v)=>uniforms.set(k,v),uniform2f:(k,...v)=>uniforms.set(k,v),uniform2fv:(k,v)=>uniforms.set(k,v),uniform3fv:(k,v)=>uniforms.set(k,v),uniform3f:(k,...v)=>uniforms.set(k,v),uniformMatrix4fv:(k,_t,v)=>uniforms.set(k,Array.from(v)),useProgram:p=>program=p,enable:key=>enabled.add(key),disable:key=>enabled.delete(key),isEnabled:key=>enabled.has(key),depthFunc(){},depthMask(){},lineWidth(){},isContextLost:()=>false,blendEquationSeparate(){},blendFuncSeparate:(...v)=>blend.splice(0,4,...v),drawArrays:(mode,_first,count)=>draws.push({mode,count,composite:true}),drawElementsInstanced:(mode,count,type,offset,instances)=>draws.push({mode,count,type,offset,instances,vao,shadow:uniforms.get('u_environment_shadow_pass'),tree:uniforms.get('u_tree')}),getParameter:key=>key===g.MAX_TEXTURE_SIZE?8192:key===g.DRAW_FRAMEBUFFER_BINDING?framebuffer:key===g.SAMPLER_BINDING?null:key===g.COLOR_WRITEMASK?[true,true,true,true]:key===g.DEPTH_RANGE?[0,1]:key===g.STENCIL_WRITEMASK||key===g.STENCIL_BACK_WRITEMASK?255:key===g.VIEWPORT?[0,0,1280,800]:key===g.ACTIVE_TEXTURE?g.TEXTURE0:key===g.TEXTURE_BINDING_2D?texture:key===g.VERTEX_ARRAY_BINDING?vao:key===g.ARRAY_BUFFER_BINDING?boundArray:key===g.CURRENT_PROGRAM?program:key===g.DEPTH_WRITEMASK?true:key===g.LINE_WIDTH?1:key===g.BLEND_SRC_RGB?blend[0]:key===g.BLEND_DST_RGB?blend[1]:key===g.BLEND_SRC_ALPHA?blend[2]:key===g.BLEND_DST_ALPHA?blend[3]:g.LEQUAL});return g;}
async function rendererFixture(){
 // The bundled renderer has its own source-boundary module instance. Prepare through its public dependency in the same bundle.
 const entry=`export {createEnvironmentSceneRenderer} from ${JSON.stringify(path.join(safety,'environment-scene-renderer.ts'))};export {prepareSolarShadowBoundary} from ${JSON.stringify(path.join(safety,'solar-shadow-admission.ts'))};export {createProjectedShadowMask} from ${JSON.stringify(path.join(safety,'projected-shadow-mask.ts'))};`;
 const result=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',preserveSymlinks:true}),m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 const sha='d'.repeat(64);m.prepareSolarShadowBoundary({boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[square(13.3,52.4,13.5,52.6)]}});
 const props={source_boundary_sha256:sha,source_pbf_sha256:'e'.repeat(64),source_snapshot:'fixture',displayClip:false,osmTags:{height:'12'},tree_crown_display_5m_guard:true};
 const point={type:'Feature',id:'osm/node/1',geometry:{type:'Point',coordinates:[13.4,52.5]},properties:{...props,kind:'tree'}},water={type:'Feature',id:'osm/way/2',geometry:{type:'Polygon',coordinates:[square(13.4001,52.5001,13.4005,52.5005),square(13.4002,52.5002,13.4003,52.5003)]},properties:{...props,kind:'water'}};
 const r=m.createEnvironmentSceneRenderer({triggerRepaint(){}},{origin:[13.4,52.5]}),gl=fakeGL();r.layer.onAdd({},gl);r.setSceneEnvironment({instantISO:'2026-06-21T12:00:00+02:00',sunlight:true,shadows:true,motion:true,quality:'balanced'});r.setFeatures([point,water],[13.3,52.4,13.5,52.6],new Set([water]));r.setEnabled(true);return{r,gl,point,water,createProjectedShadowMask:m.createProjectedShadowMask};
}
test('actual renderer reuses one tree mesh/one extra instanced shadow pass and unchanged water/source coordinates',async()=>{
 const {r,gl,point,water}=await rendererFixture(),before=JSON.stringify([point,water]);r.layer.render(gl,sceneProjection);const shadow=gl.draws.find(d=>d.shadow===1);assert.ok(shadow);assert.equal(shadow.instances,1);assert.equal(shadow.count,112*3);assert.equal(gl.draws.filter(d=>d.shadow===1).length,1);assert.equal(r.stats.drawBatchesMax,5);assert.equal(gl.draws.filter(d=>d.composite).length,1);assert.equal(r.stats.shadowMask.textures,1);
 const shadowBuffer=gl.attributes.get(shadow.vao.id+':3'),count=gl.writes.filter(w=>w.buffer===shadowBuffer).length,waterBefore=r.waterAdmissionEvidence;
 r.setSceneEnvironment({instantISO:'2026-06-21T12:01:00+02:00',sunlight:false,shadows:true,motion:true,quality:'balanced'});assert.equal(gl.writes.filter(w=>w.buffer===shadowBuffer).length,count);r.layer.render(gl,sceneProjection);assert.equal(gl.uniforms.get('u_scene_light_enabled'),0);assert.equal(gl.draws.filter(d=>!d.composite).at(-2).shadow,1);
 r.animationFrame(0);r.animationFrame(100);assert.deepEqual(r.waterAdmissionEvidence.positions,waterBefore.positions);assert.deepEqual(r.waterAdmissionEvidence.indices,waterBefore.indices);assert.equal(JSON.stringify([point,water]),before);assert.ok(r.stats.treeShadows.count===1);
 r.destroy();assert.equal(r.stats.treeShadows.mode,'destroyed');
});
test('actual tree shadow pass stops at night, shadow-off, 2D owner disable, hidden and destroy',async()=>{
 const {r,gl}=await rendererFixture(),render=()=>r.layer.render(gl,sceneProjection),settings={sunlight:true,shadows:true,motion:true,quality:'balanced'};
 r.setSceneEnvironment({...settings,instantISO:'2026-06-21T00:00:00+02:00'});render();assert.equal(gl.draws.filter(d=>d.shadow===1).length,0);
 r.setSceneEnvironment({...settings,instantISO:'2026-06-21T12:00:00+02:00',shadows:false});render();assert.equal(gl.draws.filter(d=>d.shadow===1).length,0);
 r.setVisible(false);const n=gl.draws.length;render();assert.equal(gl.draws.length,n);r.setVisible(true);r.setOffscreen(true);render();assert.equal(gl.draws.length,n);r.setOffscreen(false);r.setEnabled(false);render();assert.equal(gl.draws.length,n);r.destroy();render();assert.equal(gl.draws.length,n);
});
test('new water uses advected multiscale normals and actual view/sun lighting, without pretending building reflection',async()=>{
 const s=await fs.readFile(path.join(safety,'environment-scene-shaders.ts'),'utf8');assert.ok(s.includes('waterNoiseGradient(q0)'));assert.ok(s.includes('waterNoiseGradient(q1)'));assert.ok(s.includes('waterNoiseGradient(q2)'));assert.ok(s.includes('dFdx(q)'));assert.ok(s.includes('u_environment_eye-v_position'));assert.ok(s.includes('pow(1.-nv,5.)'));assert.ok(s.includes('dot(normal,halfway)'));assert.ok(!s.includes('float broad=sin('));assert.ok(s.includes('not a reflection of resident buildings'));assert.ok(s.includes('u_environment_shadow_pass==1'));
 const dedicated=await fs.readFile(path.join(safety,'dedicated-reichstag-mesh.ts'),'utf8');assert.ok(dedicated.includes('a_position.x+u_shadow_vector.x*h,.03,a_position.z+u_shadow_vector.y*h'));
});


test('real same-day morning/noon/evening sun moves each tree shadow and changes length; night clears it',()=>{
 const state=tree.createEnvironmentTreeShadows(1),points=new Float32Array([0,0,12]),boundary={boundarySHA256:'a'.repeat(64),vertices:4,covers:()=>true};state.setOrigin([13.4,52.5]);
 const lengths=[],vectors=[];for(const hour of ['06','09','12','15','18']){const sun=solarModule.sceneSolarLight(13.4,52.5,`2026-06-21T${hour}:00:00+02:00`);assert.ok(sun.shadowVector);state.update(points,1,1,sun,boundary,2,true);assert.equal(state.stats.count,1);vectors.push(sun.shadowVector);lengths.push(12*Math.hypot(...sun.shadowVector));}
 assert.ok(vectors[0][0]<0&&vectors.at(-1)[0]>0);assert.ok(lengths[0]>lengths[2]&&lengths.at(-1)>lengths[2]);assert.equal(new Set(vectors.map(v=>v.join(','))).size,5);
 state.update(points,1,1,solarModule.sceneSolarLight(13.4,52.5,'2026-06-21T00:00:00+02:00'),boundary,2,true);assert.equal(state.stats.count,0);assert.deepEqual(points,new Float32Array([0,0,12]));
});
test('interior union proof is one boundary call and repeated source refreshes do not dirty fixed instance storage',()=>{
 const state=tree.createEnvironmentTreeShadows(2),points=new Float32Array([0,0,12,4,5,7]);let calls=0;const boundary={boundarySHA256:'b'.repeat(64),vertices:4,covers:()=>{calls++;return true;}};state.setOrigin([13.4,52.5]);
 assert.equal(state.update(points,2,1,light([-1,0]),boundary,2,true),true);assert.equal(calls,1);const ref=state.instances;assert.equal(state.update(points.slice(),2,2,light([-.95,.1]),boundary,2,true),false);assert.equal(calls,2);assert.equal(state.instances,ref);
 const changed=points.slice();changed[3]+=.25;assert.equal(state.update(changed,2,3,light([-.9,.2]),boundary,2,true),true);assert.equal(state.instances,ref);assert.deepEqual(state.instances,changed);
});
test('context restore reuses CPU mesh, restores one shadow buffer, and reduced/hidden motion freezes the static water phase',async()=>{
 const {r,gl,point,water}=await rendererFixture();r.animationFrame(0);r.animationFrame(100);r.layer.render(gl,sceneProjection);const phase=gl.uniforms.get('u_environment_time');assert.ok(phase>0);const stats=r.stats;
 r.setReducedMotion(true);r.animationFrame(10000);r.layer.render(gl,sceneProjection);assert.equal(gl.uniforms.get('u_environment_time'),phase);assert.equal(r.stats.animationActive,false);r.setReducedMotion(false);r.setVisible(false);r.animationFrame(20000);r.setVisible(true);r.animationFrame(20100);r.layer.render(gl,sceneProjection);assert.equal(gl.uniforms.get('u_environment_time'),phase);
 const mesh=data.lowPolyTreeMesh(),restored=fakeGL();r.layer.onRemove();r.layer.onAdd({},restored);r.layer.render(restored,identity);assert.equal(r.stats.treeShadows.count,1);assert.equal(restored.draws.filter(d=>d.shadow===1).length,1);assert.equal(data.lowPolyTreeMesh(),mesh);assert.equal(r.stats.noNewTimer,true);assert.equal(r.stats.allocatedGPUBufferBytes,stats.allocatedGPUBufferBytes);
 const shadow=restored.draws.find(d=>d.shadow===1),buffer=restored.attributes.get(shadow.vao.id+':3'),before=restored.writes.filter(w=>w.buffer===buffer).length;r.setFeatures([point,water],[13.3,52.4,13.5,52.6],new Set([water]));assert.equal(restored.writes.filter(w=>w.buffer===buffer).length,before);r.destroy();
});

function shaderUniformContracts(source,stage){
 const clean=source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');const defaults={float:stage==='vertex'?'highp':undefined,int:stage==='vertex'?'highp':'mediump',sampler2D:'lowp'};
 for(const m of clean.matchAll(/\bprecision\s+(lowp|mediump|highp)\s+(float|int|sampler2D)\s*;/g))defaults[m[2]]=m[1];
 const rows=new Map();for(const m of clean.matchAll(/\buniform\s+(?:(lowp|mediump|highp)\s+)?(\w+)\s+(\w+)\s*;/g)){const category=/^(?:int|uint|[iu]vec)/.test(m[2])?'int':m[2].startsWith('sampler')?m[2]:'float';rows.set(m[3],{type:m[2],precision:m[1]??defaults[category]});}return rows;
}
test('environment shared uniforms have the same effective type and precision across both shader stages',async()=>{
 const shaders=await bundle('environment-scene-shaders.ts'),vertex=shaderUniformContracts(shaders.ENVIRONMENT_SCENE_VERTEX_GLSL,'vertex'),fragment=shaderUniformContracts(shaders.ENVIRONMENT_SCENE_FRAGMENT_GLSL,'fragment');let shared=0;for(const[name,contract]of vertex)if(fragment.has(name)){assert.deepEqual(contract,fragment.get(name),name);shared++;}assert.ok(shared>=2);assert.deepEqual(vertex.get('u_environment_shadow_pass'),{type:'int',precision:'highp'});
});
test('environment initialization retains driver diagnostics and releases failed shader/program allocations',()=>{
 for(const stage of ['vertex','link']){const renderer=rendererModule.createEnvironmentSceneRenderer({triggerRepaint(){}},{origin:[13.4,52.5]}),gl=fakeGL(),deletedShaders=[],deletedPrograms=[];gl.deleteShader=s=>deletedShaders.push(s);gl.deleteProgram=p=>deletedPrograms.push(p);gl.getShaderParameter=()=>stage!=='vertex';gl.getProgramParameter=()=>stage!=='link';gl.getShaderInfoLog=()=>'fixture shader failure';gl.getProgramInfoLog=()=>'fixture uniform precision mismatch';assert.throws(()=>renderer.layer.onAdd({},gl),stage==='vertex'?/Environment vertex shader failed: fixture shader failure/:/Environment program link failed: fixture uniform precision mismatch/);assert.equal(deletedShaders.length,stage==='vertex'?1:2);assert.equal(deletedPrograms.length,stage==='link'?1:0);renderer.destroy();assert.equal(deletedPrograms.length,stage==='link'?1:0);}
});

test('environment manager exposes the current failure message and clears it when retry loading starts',async()=>{
 const module=await bundle('environment-scene-manager.ts'),failure="Precisions of uniform 'u_environment_shadow_pass' differ between VERTEX and FRAGMENT shaders.",reads=[];const map={getZoom:()=>16,on(){},off(){},triggerRepaint(){}};
 const manager=module.installEnvironmentScene({map,city:'berlin',beforeLayer:()=>undefined,read:()=>new Promise((resolve,reject)=>reads.push({resolve,reject}))});manager.setMode(true);assert.equal(manager.stats.state,'loading');reads[0].reject(Error(failure));await new Promise(resolve=>setImmediate(resolve));assert.equal(manager.stats.state,'error');assert.equal(manager.stats.lastError,failure);manager.setMode(false);manager.setMode(true);assert.equal(manager.stats.state,'loading');assert.equal(manager.stats.lastError,undefined);manager.destroy();reads[1].reject(Error('stale aborted request'));await new Promise(resolve=>setImmediate(resolve));assert.equal(manager.stats.state,'idle');assert.equal(manager.stats.lastError,undefined);
});


test('environment onRemove then destroy releases its GPU handles once and preserves another shared-mask owner',async()=>{
 const {r,gl,createProjectedShadowMask}=await rendererFixture(),deleted={buffers:[],textures:[],framebuffers:[],vaos:[],programs:[]};
 gl.deleteBuffer=b=>deleted.buffers.push(b);gl.deleteTexture=t=>deleted.textures.push(t);gl.deleteFramebuffer=f=>deleted.framebuffers.push(f);gl.deleteVertexArray=v=>deleted.vaos.push(v);gl.deleteProgram=p=>deleted.programs.push(p);
 const other=createProjectedShadowMask(),topDown=[1,0,0,0,0,0,-1,0,0,1,0,0,0,0,0,1];
 try{
  r.layer.render(gl,sceneProjection);assert.ok(r.stats.shadowMask.bytes>0);other.draw(gl,topDown,.03,()=>{});const sharedBytes=other.stats.bytes;
  r.layer.onRemove();assert.equal(r.stats.shadowMask.bytes,0);assert.equal(other.stats.bytes,sharedBytes);assert.deepEqual(new Set(deleted.buffers),new Set(gl.buffers));assert.equal(deleted.buffers.length,gl.buffers.length);assert.equal(deleted.vaos.length,3);assert.equal(deleted.programs.length,1);assert.equal(deleted.textures.length,0);assert.equal(deleted.framebuffers.length,0);
  const counts=Object.fromEntries(Object.entries(deleted).map(([k,v])=>[k,v.length]));r.destroy();r.destroy();assert.deepEqual(Object.fromEntries(Object.entries(deleted).map(([k,v])=>[k,v.length])),counts);assert.equal(r.stats.waterVertices,0);assert.equal(r.stats.trees,0);
  assert.equal(other.draw(gl,topDown,.03,()=>{}),true);assert.equal(other.stats.bytes,sharedBytes);other.release();assert.equal(deleted.textures.length,1);assert.equal(deleted.framebuffers.length,1);
 }finally{r.destroy();other.release();}
});
