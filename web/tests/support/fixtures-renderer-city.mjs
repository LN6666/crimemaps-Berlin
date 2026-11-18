// City renderer fixtures over the flattened production factory.
//
// The actual City closures (material admission, program source plan/budget,
// shared program owner, main preparation, chunk scene draw, capture) run on an
// observable scope. A fixture supplies only: the driver (a fake GL), synthetic
// material text, a tiny frozen-data store for the prepared data receipt, and
// the resident chunk (CPU packing output plus its actual geometry lease).
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {flattenRenderer,browserGlobals,fixtureMap,preparationTurns} from './fixtures-renderer-harness.mjs';

/** Production imports the City preparation, compile, upload and draw paths call. */
export const CITY_IMPORTS=Object.freeze(['createChunkAdmission','createResidentTriangleDrawBatch','residentSpansInRange','chunkUniforms','drawResidentTriangles','currentPaintProgramGroups','appendContiguousRendererSpan','createPaintProgramIdleRetirement','HAMBURG_WHITE_FRAGMENT','HAMBURG_WHITE_VERTEX','ProgramPreparationPending','S402_SHADOW_FRAGMENT_GLSL','S402_SHADOW_VERTEX_GLSL','adjacentViewportPublicationSignal','admitCityMaterialPreflight','allocateChunkMeshView','applyCityShaderHooks','checkedCityProgramBudget','resourceContentKey','cityColourSourceRecipe','cityDresdenMaterial','cityDresdenSourceFeatures','cityWhiteSourceRecipe','createCityMaterialBuilder','createCityProgramSourceOwner','createFrozenDataScope','createIndexedPickBlocks70','createRathausProxyMasks','currentPaintProgramFamily','currentPaintProgramKey','describeCityMaterialBounds','describeCityShaderHooks','isCityShaderBoundViolation','isCityShaderBudgetUnfit','isFacadeLandmark','isProgramPreparationPending','isSourceOnlyGlassRoof','mergeRendererStateRange','paintBoxOutsideClip','paintMode','paintOverride','paintRunIntersectsVisible','prepareCityData','rendererChunkPublicationCohorts','retainRendererChunkInput','sceneSolarLight','shaderSourceText','sourceRoleBatchIncluded','specializeCurrentPaintFragment','trimInactivePaintPrograms','withResidentReflectionClip','writeRendererSelection','uploadRendererStateRange','paintProgramRuns','acquirePackedMeshChunk','acquireChunkMeshState','bindChunkResourceContext','coalesceRendererChunkGroups','rendererChunkGroups','indexedResourceKey','rendererChunkRowOrigins','CITY_DATA_COHORTS','cityCohortIdentity','CITY_DRESDEN_SOURCE_FEATURES','rathausCoincidentWallFragmentMasks','acceptPaintComponent','emitShaderSource','shaderSourceParts','planResidentReflection','planResidentReflectionChunks','createResidentReflectionUniforms','createResidentReflectionObjects','residentReflectionClipPlane','createResidentCaptureOwnership','createResidentCaptureRuntime','sourceShadowOpacity','createSolarShadowPreparationBudget','solarShadowPreparation','withSceneSolarShadowReceiver','residentSolarShadowCoverage','residentSolarShadowRanges','prepareSolarShadowBoundary','worldRayInMeshChunk','copyBuildingComponentMetadata','copyBuildingComponentReadback','createProgramGrantHandoff','createProgramSourceAuthority','createProgramPreparationOwner','FACADE_LAYOUT_GLSL','FACADE_OPENING_GLSL','PARTIAL_GATE_MASK_GLSL','RATHAUS_PROXY_MASK_GLSL','S036_ROOF009_MASK_GLSL','S402_CONNECTOR_MASK_GLSL','SCENE_SURFACE_LIGHT_GLSL','DESCRIPTION_BINDINGS']);

/** Resource descriptors of the prepared City tables, plus fixture-only helpers. */
export const CITY_EXTRA_EXPORTS=Object.freeze([
 "export {C311_FIXTURE_RESOURCE as __cityC311} from './c311-fixture';",
 "export {C312_FIXTURE_RESOURCE as __cityC312} from './c312-fixture';",
 "export {C320_FIXTURE_RESOURCE as __cityC320} from './c320-fixture';",
 "export {C322_FIXTURE_RESOURCE as __cityC322} from './c322-fixture';",
 "export {PROGRESSIVE_ADMISSIONS_RESOURCE as __cityAdmissions} from './progressive-paint-admissions';",
 "export {PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE as __cityExtraGLSL} from './progressive-feature-cities';",
 "export {shaderSourceBounds as __shaderSourceBounds,shaderSourceText as __shaderSourceText} from '../../../safety/render-runtime/shader-source-budget';",
]);

/** Fixture shader hook stages: each marks the source it transforms for the
 * cities whose hook it is, so attribute/hook selection stays observable while
 * the material-data hook modules stay isolated. */
export function fixtureCityHooks(stage){
 const owners={c018:['stuttgart'],cbt:['cologne'],c298:['frankfurt'],c311:['munich'],c312:['munich'],c313:['munich','leipzig']};
 return Object.freeze(Object.fromEntries(Object.entries(owners).map(([name,cities])=>[name,(source,city)=>source+(cities.includes(city)?'|'+name+stage:'')])));
}

/** Flatten the City factory for one city with the standard page stand-ins. */
export async function flattenCity({city='berlin',imports=[],rewrite={},options={},env={}}={}){
 const map=fixtureMap(),globals=browserGlobals();
 const flat=await flattenRenderer('city',{params:[map,city,options],env:{...globals,...env},imports:[...CITY_IMPORTS,...imports],extra:CITY_EXTRA_EXPORTS,rewrite});
 assert.deepEqual(flat.failures.map(row=>row.name+': '+String(row.error?.message??row.error)),[],'the City factory flattens without failed initializers');
 Object.assign(flat.values,{enabled:true,pageHidden:false,destroyed:false,cityVertexHooks:fixtureCityHooks('VertexShader'),cityFragmentHooks:fixtureCityHooks('FragmentShader')});
 return{...flat,map};
}

/** A tiny frozen-data store whose only tables are the declared City resources. */
export function tinyFrozenData(runtime,provider,city,resources,payloads,partition){
 const physical=new Map(),descriptors=new Map(),bindings=new Map(),initializers={};
 resources.forEach((ref,index)=>{const bytes=Buffer.from(JSON.stringify(payloads[index])),sha256=createHash('sha256').update(bytes).digest('hex'),descriptor={path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:bytes.length};descriptors.set(sha256,descriptor);physical.set(descriptor.path,bytes);bindings.set(ref.file+'|'+ref.canonicalSHA256,descriptor);(initializers[sha256]??={})[ref.file]=1;});
 const store=runtime.leases.createFrozenDataLeaseStore([...descriptors.values()]),client=store.client({city,profileSHA256:null,provider,selection:{tables:[...descriptors.keys()],initializers},resolve(sha,file,occurrence){assert.equal(occurrence,0);const descriptor=bindings.get(file+'|'+sha);assert(descriptor,'only declared tiny resources');return descriptor.sha256;},partition,read:async asset=>{assert(physical.has(asset),'fixture cannot read original model assets');return new Uint8Array(physical.get(asset));}});
 return{store,client};
}

/**
 * The actual City prepareBatches receipt over the tiny store. The synthetic
 * material describe/bounds/clear callbacks replace model assets only; the
 * receipt, its scope pins and handoff remain production code.
 */
export async function preparedCityData(flat,{components,material='fixture original city materials'}={}){
 const values=flat.values,module=flat.graph.module,city=values.city;
 const resources={c311:module.__cityC311,c312:module.__cityC312,c320:module.__cityC320,c322:module.__cityC322,admissions:module.__cityAdmissions,extra:module.__cityExtraGLSL},refs=Object.values(resources);
 const payloads=refs.map(ref=>ref===resources.admissions?[]:ref===resources.extra?{city}:{native:[],fixture:ref.file});
 const {client,store}=tinyFrozenData(flat.runtime,'city',city,refs,payloads,(sha,file)=>sha===resources.admissions.canonicalSHA256&&file===resources.admissions.file?{schemaVersion:1,kind:'object-rows',parts:[]}:undefined);
 values.frozenData=client;
 values.fixtureMaterial??=material;
 const bounds=source=>module.__shaderSourceBounds(module.__shaderSourceText(source,['fixture/city-material']));
 values.cityData_describeFacadePaintSourceBounds=(_city,_specialization,scope)=>{assert(scope&&!scope.stats.disposed,'material bounds read the prepared scope');return bounds(values.fixtureMaterial);};
 // The material and progressive callbacks keep their actual facade-paint /
 // progressive-paint interfaces: each reads the prepared table of the scope it
 // is given (a borrow, which also proves that table was prepared for exactly
 // that scope) and answers from it. Only the model assets are replaced.
 const liveScope=(scope,reader)=>{assert(scope&&!scope.stats.disposed,reader+' reads a live prepared data scope');return scope;};
 const cityTable=(scope,reader,read)=>liveScope(scope,reader).borrow(resources.extra,record=>{assert.equal(record.city,city,reader+' reads the prepared city table');return read(record);});
 const admissionTable=(scope,reader,read)=>liveScope(scope,reader).borrow(resources.admissions,rows=>{assert(Array.isArray(rows),reader+' reads the prepared admission table');return read(rows);});
 values.cityData_describeFacadePaintSource=(requested,source,kind,scope)=>{assert.equal(requested,city);assert.equal(typeof source,'string');return cityTable(scope,'material description',()=>{const bytes=flat.runtime.utf8.utf8ByteLength(source);return{city,specialized:null,sourceKind:kind,fragmentBytes:bytes,fullFragmentBytes:kind==='full'?bytes:null};});};
 values.clearCityPreparedProgramSources=scope=>{assert.equal(scope.stats.disposed,false);};
 // facadePaintFragmentForCity(city,scope) through the production scoped
 // binding (currentDataScope()), as the factory installs the original import.
 values.baseFacadePaintFragmentForCity=values.scopedCityData((requested,scope)=>{assert.equal(requested,city);return cityTable(scope,'the base material',()=>values.fixtureMaterial);},1);
 // isProgressivelyPainted(component,scope) answers from the admitted rows;
 // progressiveRenderView(scope) is the scope-memoized frozen view of them.
 values.cityData_isProgressivelyPainted=(component,scope)=>admissionTable(scope,'a progressive query',rows=>rows.some(row=>row.city===component.city&&row.objectId===component.objectId&&row.partId===component.partId));
 const renderViewKey={};values.cityData_progressiveRenderView=scope=>liveScope(scope,'the progressive render view').memo(renderViewKey,()=>admissionTable(scope,'the progressive render view',rows=>Object.freeze(rows.map(row=>Object.freeze({...row})))));
 const rows=components??[{city,objectId:'osm/way/1',partId:'fixture-part'}],controller=new AbortController();
 try{
  const prepared=await values.prepareBatches(rows,controller.signal),releaseScope=prepared.scope.retain();prepared.release();
  Object.assign(values,{residentDataPlan:prepared,publishedDataPlan:prepared,residentDataRelease:releaseScope,programDataIdentity:prepared.identity,preparedScope:prepared.scope});
  return{prepared,scope:prepared.scope,client,store,components:rows,resources,release(){releaseScope();client.dispose();store.destroy();}};
 }catch(error){client.dispose();store.destroy();throw error;}
}

/** The shared program owner of the flattened graph, driven by explicit turns. */
export function programOwner(flat,source){
 const turns=preparationTurns(),owner=flat.runtime.preparation.createProgramPreparationOwner(source,()=>flat.values.map?.triggerRepaint?.());
 const api={compile:(...args)=>turns.turn(()=>owner.compile(...args)),acquireReadyProgram:(...args)=>turns.turn(()=>owner.acquireReadyProgram(...args)),work:(...args)=>turns.turn(()=>owner.work(...args)),prune:()=>turns.turn(()=>owner.prune()),releaseProgram:(...args)=>turns.turn(()=>owner.releaseProgram(...args)),retainProgram:(...args)=>owner.retainProgram(...args),dispose:()=>turns.turn(()=>owner.dispose()),cancel:()=>turns.turn(()=>owner.cancel()),contextLost:()=>turns.turn(()=>owner.contextLost()),get stats(){return owner.stats;}};
 // One-turn advances run exactly one scheduler step: the shared dispatcher's
 // 2 ms slice budget reads a clock that advances past it on every read.
 const advance=(one=false)=>{if(!one)return turns.drain();const now=performance.now;let clock=now.call(performance);performance.now=()=>(clock+=3);try{return turns.drain({one:true});}finally{performance.now=now;}};
 return{owner,api,advance,queue:turns.queue,turn:turns.turn};
}

/** Chunk masks of the resident scene; residency follows prepared programs. */
export function fixtureMasks(){
 const resident=new Map(),masks={detaches:0,prepared:[],residentRevision:'fixture',prepare(context,programs){masks.prepared.push([...programs]);if(context.isContextLost?.())return{ready:false,reason:'context-lost'};let set=resident.get(context);if(!set)resident.set(context,set=new Set());for(const program of programs)set.add(program);return{ready:true};},isResident:(context,program)=>!context.isContextLost?.()&&!!resident.get(context)?.has(program),withResidentMasks:(_gl,_program,draw)=>{draw();return true;},withMasks:(_gl,_program,draw)=>draw(),retain(){return{...masks,release(){}};},detach(){masks.detaches++;resident.clear();},destroy(){}};
 return masks;
}

/**
 * One resident chunk that covers the whole index range: its packed CPU view, its
 * local component rows (the chunk starts at scene index 0) and the actual
 * geometry-owner lease the City draw/readiness/capture paths read.
 */
export function residentChunk(values,{indexCount,program=values.program,frame={unit:1,origin:[0,0]},anchor=[0,0],masks=fixtureMasks(),loaded=values.loaded}){
 const indices=Uint32Array.from({length:indexCount},(_,i)=>i),vertices=new Float32Array(indexCount*9),paint=new Float32Array(indexCount*5),progressive=new Float32Array(indexCount*4);
 values.geometryOwner.upload(values.gl,program,{revision:1,contentKey:'fixture-chunk-'+indexCount,indices,buffers:[{key:'vertices',data:vertices,attributes:[{name:'a_position',size:3,stride:36,offset:0,required:false}]}]});
 const chunk={source:{contentKey:'fixture-source',frame},cpu:{value:{contentKey:'fixture-cpu',frame,anchor,vertices,indices,paint,progressive,styles:[],rows:[]}},state:{value:new Float32Array(indexCount).fill(1)},material:{value:{metadata:{c311Display:{enabled:false},c312Display:{enabled:false},c313Display:{enabled:false},cbtDisplay:{enabled:false},c298Display:{enabled:false},c018Display:{enabled:false}},sidecars:{}}},loaded:new Map([...(loaded??new Map()).values()].map(row=>[row.objectId+'|'+row.partId,{...row}])),geometry:values.geometryOwner.currentLease,shadowIndices:new Uint32Array(),masks};
 values.sceneChunks=[chunk];values.sceneSpans=[{chunk,firstIndex:0,indexCount,localFirstIndex:0}];
 values.sceneComponentIndex=new Map([...chunk.loaded].map(([identity,row])=>[identity,{chunk,row}]));
 return chunk;
}
