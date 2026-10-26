import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,transform} from 'esbuild';
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
test('five-lobe geometry is shared, finite, bounded by the source-point guard and keeps actual height',async()=>{
 const a=data.lowPolyTreeMesh(),b=data.lowPolyTreeMesh();assert.equal(a,b);assert.equal(a.positions,b.positions);assert.equal(a.triangles,112);assert.ok(a.vertices<500);assert.ok(a.horizontalRadiusMetres+.08<5);
 let top=0;const lobes=new Set();for(let i=0;i<a.positions.length;i+=7){assert.ok(Array.from(a.positions.subarray(i,i+7)).every(Number.isFinite));assert.ok(a.positions[i+1]>=0&&a.positions[i+1]<=1);top=Math.max(top,a.positions[i+1]);assert.ok(Math.abs(Math.hypot(...a.positions.subarray(i+3,i+6))-1)<1e-6);if(a.positions[i+6]>.5)lobes.add(a.positions[i+6]);}
 assert.equal(top,1);assert.equal(lobes.size,5);assert.ok(a.indices.every(i=>i<a.vertices));
 assert.equal(data.TREE_DISPLAY_HORIZONTAL_SCALE_METRES,3);
 const shaders=await bundle('environment-scene-shaders.ts'),scale=Number(shaders.ENVIRONMENT_SCENE_VERTEX_GLSL.match(/vec2 size=.*?\*([0-9.]+);/)?.[1]);
 assert.equal(scale,data.TREE_DISPLAY_HORIZONTAL_SCALE_METRES,'actual GLSL and CPU admission use the same display scale');
 let packedRadius=0;for(let i=0;i<a.positions.length;i+=7)packedRadius=Math.max(packedRadius,Math.hypot(a.positions[i],a.positions[i+2]));
 assert.ok(Math.abs(a.horizontalRadiusMetres-packedRadius*scale*1.08)<1e-6);
 assert.ok(a.horizontalRadiusMetres*2>=5&&a.horizontalRadiusMetres*2<=6,'canopy diameter stays within the accepted display envelope');
 assert.ok(a.horizontalRadiusMetres+.08<5,'maximum variant plus wind stays inside the preverified source-point guard');
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
 for(const key of ['DRAW_FRAMEBUFFER_BINDING','DRAW_FRAMEBUFFER','FRAMEBUFFER_COMPLETE','MAX_TEXTURE_SIZE','SAMPLER_BINDING','DEPTH_RANGE','STENCIL_WRITEMASK','STENCIL_BACK_WRITEMASK','STENCIL_TEST','SCISSOR_TEST','COLOR_WRITEMASK','FRONT','BACK','R8','RED','RGBA8','RGBA','UNSIGNED_BYTE','COLOR','MAX','TEXTURE_MIN_FILTER','TEXTURE_MAG_FILTER','TEXTURE_WRAP_S','TEXTURE_WRAP_T','NEAREST','CLAMP_TO_EDGE','COLOR_ATTACHMENT0','ACTIVE_TEXTURE','TEXTURE0','TEXTURE_BINDING_2D','TEXTURE_2D','VIEWPORT','VERTEX_ARRAY_BINDING','ARRAY_BUFFER_BINDING','CURRENT_PROGRAM','DEPTH_TEST','BLEND','CULL_FACE','DEPTH_WRITEMASK','DEPTH_FUNC','LINE_WIDTH','BLEND_SRC_RGB','BLEND_DST_RGB','BLEND_SRC_ALPHA','BLEND_DST_ALPHA','BLEND_EQUATION_RGB','BLEND_EQUATION_ALPHA','FUNC_ADD','FUNC_SUBTRACT','FUNC_REVERSE_SUBTRACT','MIN','ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','STATIC_DRAW','DYNAMIC_DRAW','VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','FLOAT','LEQUAL','LESS','TRIANGLES','LINES','UNSIGNED_INT','UNSIGNED_SHORT','SRC_ALPHA','ONE_MINUS_SRC_ALPHA','ONE'])g[key]=n++;
 // Real WebGL defaults use FUNC_ADD for both equations; returning a depth enum
 // here would correctly be rejected by the product's lost-context snapshot guard.
 const equations=[g.FUNC_ADD,g.FUNC_ADD];
 Object.assign(g,{activeTexture(){},bindTexture:(_t,v)=>texture=v,bindSampler(){},createTexture:()=>({id:n++}),deleteTexture(){},createFramebuffer:()=>({id:n++}),deleteFramebuffer(){},bindFramebuffer:(_t,v)=>framebuffer=v,texImage2D(){},texParameteri(){},framebufferTexture2D(){},checkFramebufferStatus:()=>g.FRAMEBUFFER_COMPLETE,clearBufferfv(){},viewport(){},colorMask(){},stencilMaskSeparate(){},buffers,writes,draws,attributes,uniforms,blend,createVertexArray:()=>({id:n++}),createBuffer:()=>{const b={id:n++};buffers.push(b);return b;},createProgram:()=>({id:n++}),createShader:()=>({id:n++}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,attachShader(){},bindAttribLocation(){},linkProgram(){},getProgramParameter:()=>true,deleteShader(){},deleteBuffer(){},deleteVertexArray(){},deleteProgram(){},bindVertexArray:v=>vao=v,bindBuffer:(target,b)=>{if(target===g.ARRAY_BUFFER)boundArray=b;},bufferData:(target,data)=>writes.push({target,buffer:boundArray,bytes:data.byteLength}),getAttribLocation:(_p,name)=>({a_position:0,a_normal:1,a_role:2,a_tree:3}[name]??-1),enableVertexAttribArray(){},vertexAttribPointer:(at)=>{if(vao){const key=vao.id+':'+at;attributes.set(key,boundArray);}},vertexAttribDivisor(){},getUniformLocation:(_p,name)=>name,uniform1f:(k,v)=>uniforms.set(k,v),uniform1i:(k,v)=>uniforms.set(k,v),uniform2f:(k,...v)=>uniforms.set(k,v),uniform2fv:(k,v)=>uniforms.set(k,v),uniform3fv:(k,v)=>uniforms.set(k,v),uniform4fv:(k,v)=>uniforms.set(k,v),uniform3f:(k,...v)=>uniforms.set(k,v),uniformMatrix4fv:(k,_t,v)=>uniforms.set(k,Array.from(v)),useProgram:p=>program=p,enable:key=>enabled.add(key),disable:key=>enabled.delete(key),isEnabled:key=>enabled.has(key),depthFunc(){},depthMask(){},lineWidth(){},isContextLost:()=>false,blendEquationSeparate:(rgb,alpha)=>equations.splice(0,2,rgb,alpha),blendFuncSeparate:(...v)=>blend.splice(0,4,...v),drawArrays:(mode,_first,count)=>draws.push({mode,count,composite:true}),drawElementsInstanced:(mode,count,type,offset,instances)=>draws.push({mode,count,type,offset,instances,vao,program,shadow:uniforms.get('u_environment_shadow_pass'),tree:uniforms.get('u_tree')}),getParameter:key=>key===g.BLEND_EQUATION_RGB?equations[0]:key===g.BLEND_EQUATION_ALPHA?equations[1]:key===g.MAX_TEXTURE_SIZE?8192:key===g.DRAW_FRAMEBUFFER_BINDING?framebuffer:key===g.SAMPLER_BINDING?null:key===g.COLOR_WRITEMASK?[true,true,true,true]:key===g.DEPTH_RANGE?[0,1]:key===g.STENCIL_WRITEMASK||key===g.STENCIL_BACK_WRITEMASK?255:key===g.VIEWPORT?[0,0,1280,800]:key===g.ACTIVE_TEXTURE?g.TEXTURE0:key===g.TEXTURE_BINDING_2D?texture:key===g.VERTEX_ARRAY_BINDING?vao:key===g.ARRAY_BUFFER_BINDING?boundArray:key===g.CURRENT_PROGRAM?program:key===g.DEPTH_WRITEMASK?true:key===g.LINE_WIDTH?1:key===g.BLEND_SRC_RGB?blend[0]:key===g.BLEND_DST_RGB?blend[1]:key===g.BLEND_SRC_ALPHA?blend[2]:key===g.BLEND_DST_ALPHA?blend[3]:g.LEQUAL});return g;}
async function rendererFixture(options={}){
 // The bundled renderer has its own source-boundary module instance. Prepare through its public dependency in the same bundle.
 const entry=`export {createEnvironmentSceneRenderer} from ${JSON.stringify(path.join(safety,'environment-scene-renderer.ts'))};export {prepareSolarShadowBoundary} from ${JSON.stringify(path.join(safety,'solar-shadow-admission.ts'))};export {createProjectedShadowMask} from ${JSON.stringify(path.join(safety,'projected-shadow-mask.ts'))};`;
 const result=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',preserveSymlinks:true}),m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 const sha='d'.repeat(64);m.prepareSolarShadowBoundary({boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[square(13.3,52.4,13.5,52.6)]}});
 const props={source_boundary_sha256:sha,source_pbf_sha256:'e'.repeat(64),source_snapshot:'fixture',displayClip:false,osmTags:{height:'12'},tree_crown_display_5m_guard:true};
 const point={type:'Feature',id:'osm/node/1',geometry:{type:'Point',coordinates:[13.4,52.5]},properties:{...props,kind:'tree'}},water={type:'Feature',id:'osm/way/2',geometry:{type:'Polygon',coordinates:[square(13.4001,52.5001,13.4005,52.5005),square(13.4002,52.5002,13.4003,52.5003)]},properties:{...props,kind:'water'}};
 const r=m.createEnvironmentSceneRenderer({triggerRepaint(){}},{origin:[13.4,52.5],...options}),gl=fakeGL();r.layer.onAdd({},gl);r.setSceneEnvironment({instantISO:'2026-06-21T12:00:00+02:00',sunlight:true,shadows:true,motion:true,quality:'balanced'});r.setFeatures([point,water],[13.3,52.4,13.5,52.6],new Set([water]));r.setEnabled(true);return{r,gl,point,water,createProjectedShadowMask:m.createProjectedShadowMask};
}
test('actual renderer reuses one tree mesh/one extra instanced shadow pass and unchanged water/source coordinates',async()=>{
 const {r,gl,point,water}=await rendererFixture(),before=JSON.stringify([point,water]);r.layer.render(gl,sceneProjection);const shadow=gl.draws.find(d=>d.shadow===1);assert.ok(shadow);assert.equal(shadow.instances,1);assert.equal(shadow.count,112*3);assert.equal(gl.draws.filter(d=>d.shadow===1).length,1);assert.equal(r.stats.drawBatchesMax,5);assert.equal(gl.draws.filter(d=>d.composite).length,1);assert.equal(r.stats.shadowMask.textures,1);assert.equal(gl.uniforms.get('u_environment_shadow_opacity'),.18);
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
  r.layer.onRemove();assert.equal(r.stats.shadowMask.bytes,0);assert.equal(other.stats.bytes,sharedBytes);assert.deepEqual(new Set(deleted.buffers),new Set(gl.buffers));assert.equal(deleted.buffers.length,gl.buffers.length);assert.equal(deleted.vaos.length,3);assert.equal(deleted.programs.length,2);assert.equal(deleted.textures.length,0);assert.equal(deleted.framebuffers.length,0);
  const counts=Object.fromEntries(Object.entries(deleted).map(([k,v])=>[k,v.length]));r.destroy();r.destroy();assert.deepEqual(Object.fromEntries(Object.entries(deleted).map(([k,v])=>[k,v.length])),counts);assert.equal(r.stats.waterVertices,0);assert.equal(r.stats.trees,0);
  assert.equal(other.draw(gl,topDown,.03,()=>{}),true);assert.equal(other.stats.bytes,sharedBytes);other.release();assert.equal(deleted.textures.length,1);assert.equal(deleted.framebuffers.length,1);
 }finally{r.destroy();other.release();}
});


test('green ground and row illustrations share existing GPU buffers, keep water evidence exact, and release on viewport replacement',async()=>{
 const {r,gl,point,water}=await rendererFixture(),waterBefore=r.waterAdmissionEvidence,bufferCount=gl.buffers.length;
 const green={type:'Feature',id:'osm/way/12',geometry:{type:'Polygon',coordinates:[square(13.399,52.499,13.401,52.501),square(13.3992,52.4992,13.3994,52.4994)]},properties:{...point.properties,kind:'green',osmTags:{leisure:'park'}}};
 const row={type:'Feature',id:'osm/way/13',geometry:{type:'LineString',coordinates:[[13.399,52.5],[13.401,52.5]]},properties:{...point.properties,kind:'tree_row'}};const before=JSON.stringify([point,water,green,row]);
 r.setFeatures([point,water,green,row],[13.3,52.4,13.5,52.6],new Set([water]));assert.deepEqual(r.waterAdmissionEvidence,waterBefore);assert.equal(r.stats.greenGround.admitted,1);assert.ok(r.stats.treeRows.instances>0);assert.equal(r.stats.drawBatchesMax,6);assert.equal(r.stats.greenGround.alpha,.6);assert.equal(gl.buffers.length,bufferCount);
 assert.ok(r.treeDisplayEvidence.some(e=>e.role==='source-line-display-schematic-not-source-tree-point'));gl.draws.length=0;r.layer.render(gl,sceneProjection);assert.ok(gl.draws.some(d=>!d.tree&&!d.shadow&&d.offset===r.stats.waterTriangles*3*4&&d.count===r.stats.greenGround.triangles*3));assert.equal(JSON.stringify([point,water,green,row]),before);
 const restored=fakeGL();r.layer.onRemove();r.layer.onAdd({},restored);r.layer.render(restored,sceneProjection);assert.equal(r.stats.greenGround.admitted,1);assert.equal(restored.buffers.length,bufferCount);
 r.setFeatures([], [13.3,52.4,13.5,52.6]);assert.equal(r.stats.greenGround.vertices,0);assert.equal(r.stats.treeRows.instances,0);assert.equal(r.stats.waterVertices,0);assert.equal(r.treeDisplayEvidence.length,0);r.destroy();assert.equal(r.stats.greenGround.triangles,0);
});


test('dedicated green program shares the water VAO and exact matrix but uses the real viewport/depth range',async()=>{
 const {r,gl,point,water}=await rendererFixture(),green={type:'Feature',id:'osm/way/51',geometry:{type:'Polygon',coordinates:[square(13.399,52.499,13.401,52.501)]},properties:{...point.properties,kind:'green'}};
 r.setFeatures([point,water,green],[13.3,52.4,13.5,52.6],new Set([water]));r.setSceneEnvironment({instantISO:'2026-06-21T12:00:00+02:00',sunlight:true,shadows:false,motion:true,quality:'balanced'});const get=gl.getParameter;
 gl.getParameter=k=>k===gl.VIEWPORT?[19,31,1920,1200]:k===gl.DEPTH_RANGE?[.17,.93]:get(k);
 const uses=[],depth=[];const use=gl.useProgram;gl.useProgram=p=>{uses.push(p);use(p);};gl.depthFunc=v=>depth.push(v);
 r.layer.render(gl,sceneProjection);const waterDraw=gl.draws.find(d=>d.offset===0&&!d.shadow),greenDraw=gl.draws.find(d=>d.offset===r.stats.waterTriangles*3*4&&!d.shadow&&d.count===r.stats.greenGround.triangles*3);
 assert.ok(waterDraw&&greenDraw);assert.notEqual(greenDraw.program,waterDraw.program);assert.equal(greenDraw.vao,waterDraw.vao);
 assert.equal(r.stats.greenGround.depthMode,'analytic-plane');assert.deepEqual(Array.from(gl.uniforms.get('u_green_viewport')),[19,31,1920,1200]);assert.deepEqual(Array.from(gl.uniforms.get('u_green_depth_range')),Array.from(new Float32Array([.17,.93])));assert.ok(depth.includes(gl.LESS));
 const ground=requireGreenPlane(await bundle('environment-green-ground.ts'),new Float32Array(gl.uniforms.get('u_matrix')),[19,31,1920,1200],[.17,.93]);assert.deepEqual(gl.uniforms.get('u_green_depth_plane'),ground.plane);
 assert.ok(uses.lastIndexOf(waterDraw.program)>uses.indexOf(greenDraw.program),'main program restored for trees');
 gl.draws.length=0;r.layer.render(gl,new Float32Array(16));assert.equal(r.stats.greenGround.depthMode,'raster-fallback');assert.ok(gl.draws.some(d=>d.offset===r.stats.waterTriangles*3*4&&d.program===waterDraw.program),'degenerate view keeps source green draw');r.destroy();
});
function requireGreenPlane(module,matrix,viewport,range){const p=module.greenGroundDepthParameters(matrix,viewport,range);assert.ok(p);return p;}

test('both environment programs are deleted once, rebuilt after context restore, and cleaned on green link failure',()=>{
 const r=rendererModule.createEnvironmentSceneRenderer({triggerRepaint(){}},{origin:[13.4,52.5]}),gl=fakeGL(),created=[],deleted=[],bindings=[];let serial=0;gl.bindAttribLocation=(program,at,name)=>bindings.push({program,at,name});
 gl.createProgram=()=>{const p={id:++serial};created.push(p);return p;};gl.deleteProgram=p=>deleted.push(p);r.layer.onAdd({},gl);assert.equal(created.length,2);assert.deepEqual(bindings,[{program:created[1],at:0,name:'a_position'},{program:created[1],at:1,name:'a_normal'},{program:created[1],at:2,name:'a_role'}]);
 r.layer.onRemove();assert.deepEqual(deleted,created);r.layer.onAdd({},gl);assert.equal(created.length,4);r.destroy();r.destroy();assert.deepEqual(deleted,created);
 const failed=rendererModule.createEnvironmentSceneRenderer({triggerRepaint(){}},{origin:[13.4,52.5]}),f=fakeGL(),programs=[],gone=[],shaders=[];f.createProgram=()=>{const p={id:programs.length};programs.push(p);return p;};f.getProgramParameter=p=>p!==programs[1];f.getProgramInfoLog=()=>'green fixture link';f.deleteProgram=p=>gone.push(p);f.deleteShader=s=>shaders.push(s);
 assert.throws(()=>failed.layer.onAdd({},f),/Green ground program link failed: green fixture link/);assert.deepEqual(gone,programs);assert.equal(shaders.length,4);assert.equal(f.buffers.length,0);failed.destroy();assert.equal(gone.length,2);
});


test('caller stops immediately when reflection capture loses its context internally',async()=>{
 const {r,gl}=await rendererFixture();let lost=false,revisionCalls=0;const afterLoss=[];
 gl.isContextLost=()=>lost;
 for(const name of ['getParameter','activeTexture','useProgram','bindTexture','bindVertexArray','depthFunc','depthMask','drawElementsInstanced']){const original=gl[name];gl[name]=(...args)=>{if(lost)afterLoss.push(name);return original(...args);};}
 r.setReflectionSource({getPlanarReflectionRevision(){revisionCalls++;lost=true;return 'fixture-resident';},renderPlanarReflection(){throw Error('should not enter provider draw after loss');}});
 assert.doesNotThrow(()=>r.layer.render(gl,sceneProjection));assert.equal(revisionCalls,1);assert.equal(r.stats.buildingReflection.mode,'context-lost');assert.deepEqual(afterLoss,[]);assert.equal(gl.draws.length,0);
 lost=false;r.destroy();
});

test('caller skips remaining passes and finally restoration after a draw loses context',async()=>{
 const {r,gl}=await rendererFixture();let lost=false;const afterLoss=[];gl.isContextLost=()=>lost;
 for(const name of ['getParameter','activeTexture','useProgram','bindTexture','bindVertexArray','depthFunc','depthMask','enable','disable','blendFuncSeparate','blendEquationSeparate','lineWidth','uniform1i','uniform1f','uniform2f']){const original=gl[name];gl[name]=(...args)=>{if(lost)afterLoss.push(name);return original(...args);};}
 const draw=gl.drawElementsInstanced;gl.drawElementsInstanced=(...args)=>{if(lost)afterLoss.push('drawElementsInstanced');draw(...args);lost=true;};
 assert.doesNotThrow(()=>r.layer.render(gl,sceneProjection));assert.equal(gl.draws.length,1);assert.deepEqual(afterLoss,[]);
 lost=false;r.destroy();
});


test('managed environment reads only real viewport/depth inputs before submitting draws',async()=>{
 const {r,gl,point,water}=await rendererFixture(),green={...water,id:'osm/way/99',properties:{...water.properties,kind:'green'}};
 r.setSceneEnvironment({instantISO:'2026-06-21T12:00:00+02:00',sunlight:true,shadows:false,motion:true,quality:'balanced'});r.setFeatures([point,water,green],[13.3,52.4,13.5,52.6],new Set([water]));
 const calls=[],get=gl.getParameter,draw=gl.drawElementsInstanced;gl.getParameter=k=>{calls.push(['get',k]);return get(k);};gl.isEnabled=()=>{throw Error('outer layer must not snapshot capabilities');};gl.drawElementsInstanced=(...args)=>{calls.push(['draw']);draw(...args);};
 r.layer.render(gl,sceneProjection);assert.deepEqual(calls.filter(c=>c[0]==='get'),[['get',gl.VIEWPORT],['get',gl.DEPTH_RANGE]]);assert(calls.findIndex(c=>c[0]==='draw')>calls.findIndex(c=>c[1]===gl.DEPTH_RANGE));assert.equal(r.stats.renderFailure,undefined);assert(gl.draws.length>0);r.destroy();
});

test('a render error is reported once, stops motion and returns through the actual MapLibre reset boundary',async(t)=>{
 const reports=[],{r,gl}=await rendererFixture({onRenderError:error=>reports.push(error)});r.setSceneEnvironment({instantISO:'2026-06-21T12:00:00+02:00',sunlight:true,shadows:false,motion:true,quality:'balanced'});
 const error=Error('controlled environment draw failure');gl.drawElementsInstanced=()=>{throw error;};const logs=t.mock.method(console,'error',()=>{}),events=[];
 const sdk=await fs.readFile(path.join(safety,'../../node_modules/maplibre-gl/src/webgl/draw/draw_custom.ts'),'utf8'),functionText=sdk.slice(sdk.indexOf('export function drawCustom')).replace(/^export /,'');
 const compiled=await transform('('+functionText+')',{loader:'ts',target:'es2022'});const drawCustom=Function('DepthMode','StencilMode','OverscaledTileID','return '+compiled.code)({ReadOnly:0},{disabled:{}},class{});
 const context={gl,setColorMode(){},setStencilMode(){},setDepthMode(){},setDirty(){events.push('dirty');},bindFramebuffer:{set(value){events.push(['framebuffer',value]);}}};
 const painter={context,style:{projection:{shaderVariantName:'mercator',shaderPreludeCode:{vertexSource:''},shaderDefine:''}},transform:{getProjectionDataForCustomLayer:()=>({mainMatrix:sceneProjection})},setCustomLayerDefaults(){gl.bindVertexArray(null);gl.activeTexture(gl.TEXTURE0);},colorModeForRenderPass:()=>({}),getDepthModeFor3D:()=>({}),setBaseState(){events.push('base-reset');}};
 assert.doesNotThrow(()=>drawCustom(painter,{}, {implementation:r.layer},{currentPass:'translucent',isRenderingGlobe:false}));assert.deepEqual(reports,[error]);assert.equal(logs.mock.callCount(),1);assert.equal(logs.mock.calls[0].arguments[1],error);assert.deepEqual(events,['dirty','base-reset',['framebuffer',null]]);assert.match(r.stats.renderFailure,/controlled environment/);assert.equal(r.stats.animationActive,false);assert.deepEqual(r.animationFrame(1000),{active:false,changed:false});r.layer.render(gl,sceneProjection);assert.equal(logs.mock.callCount(),1);r.destroy();
});

test('manager render-error callback aborts pending publication and preserves its existing error state',async()=>{
 const source=await fs.readFile(path.join(safety,'environment-scene-manager.ts'),'utf8'),start=source.indexOf('function renderFailed('),end=source.indexOf('\n function stop()',start),code=(await transform('('+source.slice(start,end)+')',{loader:'ts'})).code;
 let disabled=false;const values={request:new AbortController(),revision:3,renderer:{setEnabled:v=>{disabled=!v;}},state:'ready',lastError:undefined};
 const env=new Proxy(values,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,v)=>(o[k]=v,true)}),fail=Function('env','with(env){return '+code+'}')(env);fail(Error('actual draw failed'));
 assert.equal(values.request.signal.aborted,true);assert.equal(values.revision,4);assert.equal(disabled,true);assert.equal(values.state,'error');assert.equal(values.lastError,'actual draw failed');assert(source.includes('onRenderError:renderFailed'));
});


test('the actual renderer shares its fixed tree budget across native points, rows and woodland, then clears all three',async()=>{
 const {r,gl,point,water}=await rendererFixture({mobile:true});
 const points=Array.from({length:800},(_,i)=>({...point,id:'osm/node/'+(1000+i),geometry:{type:'Point',coordinates:[13.396+(i%40)*.00001,52.496+Math.floor(i/40)*.00001]}}));
 const wood={...point,id:'osm/way/9100',geometry:{type:'Polygon',coordinates:[square(13.401,52.501,13.404,52.504)]},properties:{...point.properties,kind:'green',osmTags:{natural:'wood'}}};
 const row={...point,id:'osm/way/9101',geometry:{type:'LineString',coordinates:[[13.405,52.501],[13.405,52.504]]},properties:{...point.properties,kind:'tree_row',osmTags:{natural:'tree_row'}}};
 const features=[...points,wood,row,water],before=JSON.stringify(features),bounds=[13.39,52.49,13.41,52.51];
 r.setFeatures(features,bounds,new Set([water]));const a=r.treeDisplayEvidence;
 assert.equal(r.stats.treeCap,512);assert.ok(r.stats.trees<=512);assert.ok(r.stats.omittedTrees>0);
 assert.ok(a.some(t=>t.role==='source-point-display-schematic'));assert.ok(a.some(t=>t.role==='source-line-display-schematic-not-source-tree-point'));assert.ok(a.some(t=>t.role==='source-woodland-display-schematic-not-source-tree-point'));
 assert.equal(r.stats.woodland.instances,a.filter(t=>t.role==='source-woodland-display-schematic-not-source-tree-point').length);
 assert.equal(r.stats.treeRows.instances,a.filter(t=>t.role==='source-line-display-schematic-not-source-tree-point').length);
 const treeBuffers=gl.buffers.length;r.layer.render(gl,sceneProjection);assert.equal(gl.draws.filter(d=>d.tree===1&&d.shadow===0).at(-1).instances,r.stats.trees);
 r.setFeatures([...features].reverse(),bounds,new Set([water]));assert.deepEqual(r.treeDisplayEvidence,a);assert.equal(gl.buffers.length,treeBuffers);assert.equal(JSON.stringify(features),before);
 assert.ok(a.filter(t=>t.role.includes('woodland')).every(t=>t.id===wood.id&&t.displayId.startsWith('woodland:')));
 r.setFeatures([],bounds,new Set());assert.equal(r.stats.trees,0);assert.equal(r.stats.woodland.instances,0);assert.equal(r.stats.treeRows.instances,0);r.destroy();assert.deepEqual(r.treeDisplayEvidence,[]);
});
