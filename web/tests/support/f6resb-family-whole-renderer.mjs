// Whole-renderer facade for family-renderer-preparation (root500, infill, bremen).
//
// After the chunk-residency migration those renderers no longer upload one
// renderer-wide vertex/index/state array from extracted closures: every upload,
// cancellation, failure and readback runs through published page-store chunks.
// This module evaluates the actual renderer module through the existing
// whole-module fixtures (painted-residency-harness for root500/infill,
// bremen-renderer-construction-harness for Bremen) and adds only observation and
// injection on the shared fake WebGL context:
//
// - attribute layouts per VAO (vertexAttribPointer, read back with the VAO that
//   was bound at each draw);
// - shader ownership (attach/detach/delete marks and frees, as a driver does);
// - a controlled link failure and a controlled upload failure (bufferData throws
//   before allocating);
// - the renderer's own capture adapter (resident-capture's runtime factory is
//   replaced by a recorder; the adapter itself is the renderer's);
// - the exact S402 shadow sources (that module's two constant strings);
// - deleted buffers, VAOs and programs, and map repaint requests (the fixture
//   map's triggerRepaint is wrapped by counting once the renderer hands the map
//   to the actual guardCustomLayerRender).
//
// Dependency doubles (not renderer functions), disclosed in full:
// - '../../../safety/scene-solar-light' sceneSolarLight: a sun vector switched
//   by control.sun (no real solar ephemeris);
// - Bremen only: '../../../safety/solar-shadow-admission' is the shared
//   solarShadowAdmissionDouble the residency fixture already uses.
// Bremen's './bremen-paint-gpu-diagnostic' and './source-shadow' are the actual
// production modules bundled with esbuild (the construction fixture otherwise
// stubs them). No function of the renderer module itself is substituted.
import assert from 'node:assert/strict';
import {residencyFixture,component as residencyComponent} from '../fixtures/painted-residency-harness.mjs';
import {constructionHarness,component as bremenComponent} from '../fixtures/bremen-renderer-construction-harness.mjs';
import {solarShadowAdmissionDouble} from './fixtures-managers-b-renderer-runtime.mjs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const web=fileURLToPath(new URL('../../',import.meta.url)),require=createRequire(web+'package.json'),{build}=require('esbuild');
async function production(file){const r=await build({entryPoints:[web+file],bundle:true,write:false,platform:'node',format:'esm',target:'es2022',logLevel:'error'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text+'\n//# sourceURL=f6resb-'+file.replace(/\W/g,'-')+'.mjs').toString('base64'));}
// The Bremen construction fixture has no paint readback module: the renderer's own production diagnostic
// module is bundled here, so Bremen readback reads the fake GPU allocations through the actual helper.
const bremenDiagnostic=await production('src/painted/bremen/safety/bremen-paint-gpu-diagnostic.ts');
// Bremen's source-shadow re-exports root500's frozen module; the actual module is supplied as well.
const bremenSourceShadow=await production('src/painted/bremen/safety/source-shadow.ts');

export const S402_SOURCES=Object.freeze({vertex:'exact S402 vertex',fragment:'exact S402 fragment'});
const realSetImmediate=globalThis.setImmediate;
const nextTask=()=>new Promise(resolve=>realSetImmediate(resolve));

export function familyHarness(provider){
 const adapters=[],shaderStates=new Map(),attachments=new Map(),attrs=[],drawVaos=[],links=[],deleted={buffers:[],vaos:[],programs:[]},control={failLink:false,failUpload:0,sun:false};let uploadFailures=0,boundVao,linkedPrograms=0;
 const overrides={
  '../../../safety/render-runtime/resident-capture':{createResidentCaptureRuntime:adapter=>{adapters.push(adapter);return{invalidate(){},render(){return adapter.snapshot(false);}};}},
  './s402-connector-shadow':{S402_SHADOW_VERTEX_GLSL:S402_SOURCES.vertex,S402_SHADOW_FRAGMENT_GLSL:S402_SOURCES.fragment},
  '../../../safety/scene-solar-light':{sceneSolarLight:()=>({shadowVector:control.sun?[1,1]:undefined})},
  // Bremen's construction fixture has no paint readback, source-shadow or solar admission module: the actual
  // readback helper and source-shadow module, and the shared solar admission double (as the residency fixture
  // uses), are supplied.
  ...(provider==='bremen'?{'./bremen-paint-gpu-diagnostic':{readBremenPaintGPUDiagnostic:bremenDiagnostic.readBremenPaintGPUDiagnostic},'../../../safety/solar-shadow-admission':solarShadowAdmissionDouble(),'./source-shadow':{SOURCE_SHADOW_VECTOR:bremenSourceShadow.SOURCE_SHADOW_VECTOR,sourceShadowOpacity:bremenSourceShadow.sourceShadowOpacity}}:{}),
 };
 const h=provider==='bremen'?constructionHarness(undefined,{dependencyOverrides:overrides}):residencyFixture(provider,{dependencyOverrides:overrides});
 if(provider==='bremen')for(const[id,exports]of Object.entries(overrides))h.overrideDependency(id,exports);
 // Count the actual family run planning (familyPaintRuns) without replacing it.
 let plans=0;{const id='../../../safety/family-paint-program',real=h.dependency(id).familyPaintRuns;assert.equal(typeof real,'function','actual familyPaintRuns');h.overrideDependency(id,{familyPaintRuns(...args){plans++;return real(...args);}});}
 // Count map repaint requests without replacing the renderer's map: the renderer passes its map to the actual
 // guardCustomLayerRender at construction; the fixture map's (no-op) triggerRepaint is wrapped by a counter there.
 let repaints=0;{const id='../../../safety/custom-layer-render-error',real=h.dependency(id).guardCustomLayerRender;assert.equal(typeof real,'function','actual guardCustomLayerRender');h.overrideDependency(id,{guardCustomLayerRender(map,...args){const repaint=map.triggerRepaint;if(typeof repaint==='function'&&!repaint.f6resbCounted){const counted=function(...rest){repaints++;return repaint.apply(this,rest);};counted.f6resbCounted=true;map.triggerRepaint=counted;}return real(map,...args);}});}
 const gl=h.gl,original={};
 for(const name of ['createShader','attachShader','detachShader','deleteShader','deleteProgram','createProgram','linkProgram','getProgramParameter','bufferData','vertexAttribPointer','bindVertexArray','drawElements','deleteBuffer','deleteVertexArray'])original[name]=gl[name].bind(gl);
 const collect=shader=>{const state=shaderStates.get(shader);if(state&&state.deleteMarked&&!state.programs.size)state.freed=true;};
 Object.assign(gl,{
  createShader(type){const shader=original.createShader(type);shaderStates.set(shader,{programs:new Set(),deleteMarked:false,freed:false,deleteCalls:0});return shader;},
  createProgram(){const program=original.createProgram();attachments.set(program,new Set());return program;},
  attachShader(program,shader){const state=shaderStates.get(shader);assert(state&&!state.freed,'attach requires a live shader');attachments.get(program)?.add(shader);state.programs.add(program);return original.attachShader(program,shader);},
  detachShader(program,shader){assert(attachments.get(program)?.delete(shader),'detach requires an actual program attachment');shaderStates.get(shader).programs.delete(program);collect(shader);return original.detachShader(program,shader);},
  deleteShader(shader){const state=shaderStates.get(shader);state.deleteCalls++;state.deleteMarked=true;collect(shader);return original.deleteShader(shader);},
  deleteBuffer(buffer){deleted.buffers.push(buffer);return original.deleteBuffer(buffer);},
  deleteVertexArray(vao){deleted.vaos.push(vao);return original.deleteVertexArray(vao);},
  deleteProgram(program){deleted.programs.push(program);for(const shader of attachments.get(program)??[]){shaderStates.get(shader).programs.delete(program);collect(shader);}attachments.delete(program);return original.deleteProgram(program);},
  linkProgram(program){links.push(program);linkedPrograms++;program.fixtureLinkFailed=control.failLink;return original.linkProgram(program);},
  getProgramParameter(program,parameter){if(program?.fixtureLinkFailed)return false;return original.getProgramParameter(program,parameter);},
  bufferData(target,data,usage){if(control.failUpload&&!--control.failUpload){uploadFailures++;throw Error('controlled upload failure');}return original.bufferData(target,data,usage);},
  vertexAttribPointer(index,size,type,normalized,stride,offset){attrs.push({vao:boundVao,index,size,stride,offset});return original.vertexAttribPointer(index,size,type,normalized,stride,offset);},
  bindVertexArray(value){boundVao=value;return original.bindVertexArray(value);},
  drawElements(mode,count,type,offset){drawVaos.push({vao:boundVao,count,offset});return original.drawElements?.(mode,count,type,offset);},
 });
 const component=id=>provider==='bremen'?bremenComponent(id):residencyComponent(id);
 // root500/infill paint readback records only the diagnostic source identity of the residency fixture.
 const diagnosticComponent=()=>provider==='bremen'?bremenComponent(1):residencyComponent(1,true);
 // A visible map frame with births complete (reduced motion), as the residency suites draw and pick.
 const visible=r=>{r.setReducedMotion(true);if(provider==='bremen')h.render(r);else h.renderVisible(r);};
 async function prepare(r,rows,signal=new AbortController().signal){if(provider==='bremen')return r.prepareBatches(rows,signal);return h.prepareBatch(r,rows,signal);}
 const release=b=>provider==='bremen'?b.release?.():b.scope.release();
 const attach=r=>{r.setEnabled(true);r.layer.onAdd({},gl);};
 // One map frame with a finite main view, then one queued timer task, then its microtasks.
 async function step(r){if(provider==='bremen')h.render(r);else h.frame(r,true);const next=h.timers.entries().next().value;if(next){h.timers.delete(next[0]);next[1]();}await nextTask();}
 // One map frame only (no timer task): work it admits stays queued until a timer runs.
 const frameOnly=r=>{if(provider==='bremen')h.render(r);else h.frame(r,true);};
 // One map frame whose main matrix is invalid (empty), then one timer task and its microtasks.
 async function invalidStep(r){r.layer.render(gl,[]);const next=h.timers.entries().next().value;if(next){h.timers.delete(next[0]);next[1]();}await nextTask();}
 // Timer tasks and microtasks only (no map frame), as while the page is hidden.
 async function idle(steps=40){for(let i=0;i<steps;i++){const next=h.timers.entries().next().value;if(next){h.timers.delete(next[0]);next[1]();}await nextTask();}}
 async function settle(r,ready){
  if(provider==='bremen')return h.settle(r,ready);
  return h.settle(r,ready??(()=>{const state=r.stats.geometryPreparation;if(state.candidateFailure)throw Error('Candidate did not publish: '+state.candidateFailure);return !state.pending&&!state.candidatePending;}));
 }
 // A lost context frees every object it created: the fake driver forgets the pre-loss buffers.
 // The published resident is uploaded and drawable again (context restoration re-uploads it without a candidate).
 const residentUploaded=r=>{const state=r.stats.geometryPreparation;return provider==='bremen'?!state.pending&&r.getDrawReadiness().ready:state.uploaded===true&&!state.pending&&!state.candidatePending;};
 function lose(){const before=[...h.buffers.keys()];h.control.lost=true;h.handlers.get('webglcontextlost')();for(const buffer of before)h.buffers.delete(buffer);}
 function restore(){h.control.lost=false;h.handlers.get('webglcontextrestored')();}
 function layoutAt(vao){const rows=new Map();for(const row of attrs)if(row.vao===vao)rows.set(row.index,{index:row.index,size:row.size,stride:row.stride,offset:row.offset});return[...rows.values()].sort((a,b)=>a.index-b.index);}
 function shaderOwnership(){const states=[...shaderStates.values()];return{created:states.length,deleteMarked:states.filter(state=>state.deleteMarked).length,freed:states.filter(state=>state.freed).length,attachments:states.reduce((count,state)=>count+state.programs.size,0),deleteCalls:states.reduce((count,state)=>count+state.deleteCalls,0)};}
 const sources=()=>h.sources.map(row=>typeof row==='string'?row:row.text);
 // Evict the page store's unpinned recent entries and collect retired GPU resources. The residency fixture's page
 // store keeps no recent cache (released resources are retired at once); Bremen's construction fixture uses the
 // page's bounded recent cache, so a released (unleased) resource is deleted only by this eviction.
 function evictUnpinned(){if(provider==='bremen'){h.page.store.evictRecent();h.page.store.collectRetired();}}
 return{frameOnly,invalidStep,deleted,evictUnpinned,get repaints(){return repaints;},get plans(){return plans;},residentUploaded,provider,h,gl,control,adapters,attrs,drawVaos,links,component,diagnosticComponent,visible,prepare,release,attach,step,idle,settle,lose,restore,layoutAt,shaderOwnership,sources,
  commit:(r,b,generation,shadow)=>provider==='bremen'?h.commit(r,b,generation):h.commit(r,b,generation,shadow),
  environment:run=>h.environment(run),create:()=>h.create(),
  get uploads(){return h.uploads;},get subUploads(){return h.subUploads??[];},get buffers(){return h.buffers;},get timers(){return h.timers;},
  get uploadFailures(){return uploadFailures;},get linkedPrograms(){return linkedPrograms;},
  get boundVao(){return boundVao;},
 };
}
