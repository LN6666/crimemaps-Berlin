// Shared runtime of the suites that reuse the resident planar-reflection
// fixture setup (solar depth/shadow, Tier300 specialization, program
// preparation): the setup section of resident-planar-reflection.test.mjs is
// evaluated once per suite as a data: module, exactly as each suite did inline.
//
// The setup bundles one production module graph (RUNTIME_MODULES) and installs
// a whitelist of actual renderer imports (RENDERER_IMPORTS). Newer renderer
// closures reach a few more pure production modules/imports; a suite names
// them here, and they are appended to the same lists, so they come from the
// same single bundle as the chunk store, budget, preparation owner and shader
// source budget (one module state, as on one page). Nothing here stubs a
// renderer function; the only change to the setup's fixture code is one
// forwarded owner method (see acquireReadyProgram below).
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const web=fileURLToPath(new URL('../../',import.meta.url));
const setupFile=new URL('../resident-planar-reflection.test.mjs',import.meta.url);
// The shared chunk scene, through the F3 wrapper (empty City sidecar records).
const chunkScene=new URL('./f3-chunk-scene.mjs',import.meta.url).href;

function replaceOnce(text,from,to,label){
 const at=text.indexOf(from);
 if(at<0||text.indexOf(from,at+from.length)>=0)throw Error('f3-reflection-bridge: shared setup anchor changed: '+label);
 return text.slice(0,at)+to+text.slice(at+from.length);
}

/** Pure production modules that current renderer closures reach. */
export const F3_RUNTIME_MODULES=Object.freeze([
 'src/safety/planar-reflection-group.ts',
 'src/safety/render-runtime/shader-assembly-budget.ts',
]);
/** The dedicated Reichstag mesh (with its facade layout/description tables);
 * only the suites that exercise it add it to their runtime. */
export const F3_REICHSTAG_RUNTIME_MODULES=Object.freeze([...F3_RUNTIME_MODULES,'src/safety/dedicated-reichstag-mesh.ts']);
/** Pure renderer imports (source-part, bounds and state-range helpers). */
export const F3_RENDERER_IMPORTS=Object.freeze([
 'shaderSourceText','shaderSourceParts','emitShaderSource','shaderSourceBounds','joinShaderSourceParts','deferredShaderSourcePart','shaderSourceBoundPart','describeShaderAssemblyBounds','mergeRendererStateRange',
 'captureMainDrawBindings','sameMainDrawBindings','createChunkAdmission','createResidentTriangleDrawBatch','residentSpansInRange','chunkUniforms','drawResidentTriangles','residentTriangleGeometryKey','partitionProgramFamilies','residentDrawRange',
]);

/**
 * Evaluates the shared setup with the given exports.
 * `patch` may apply a suite's own exact, checked insertions to the setup text
 * (it receives replaceOnce, which throws when an anchor is missing or repeated).
 * @param {{exports:readonly string[],sourceURL:string,runtimeModules?:readonly string[],rendererImports?:readonly string[],patch?:(setup:string,replace:typeof replaceOnce)=>string}} options
 */
export async function loadReflectionBridge({exports,sourceURL,runtimeModules=F3_RUNTIME_MODULES,rendererImports=F3_RENDERER_IMPORTS,patch}){
 const text=await readFile(setupFile,'utf8'),end=text.indexOf('for(const provider of providers)test(');
 if(end<0)throw Error('f3-reflection-bridge: shared setup end marker changed');
 let setup=text.slice(0,end);
 setup=replaceOnce(setup,"process.env.CRIMEMAPS_REFLECTION_WEB_ROOT??fileURLToPath(new URL('../',import.meta.url))",JSON.stringify(web),'web root');
 // A data: module has no hierarchical base URL: use the absolute support URL.
 setup=replaceOnce(setup,"new URL('./support/resident-chunk-scene.mjs',import.meta.url)",JSON.stringify(chunkScene),'chunk scene import');
 if(runtimeModules.length)setup=replaceOnce(setup,'const RUNTIME_MODULES=[','const RUNTIME_MODULES=['+runtimeModules.map(value=>JSON.stringify(value)).join(',')+',','runtime modules');
 // Current renderer compilers first ask the production preparation owner for
 // an already linked exact program (acquireReadyProgram) and only then queue a
 // compile. The shared fixture's owner wrapper forwards every other owner call;
 // forward this one the same way, inside the same fixture turn.
 setup=replaceOnce(setup,'work:(...args)=>turn(()=>owner.work(...args)),','work:(...args)=>turn(()=>owner.work(...args)),acquireReadyProgram:(...args)=>turn(()=>owner.acquireReadyProgram(...args)),','owner wrapper');
 // Prepared program plans (root500/infill/bremen) now bound each selected
 // paint source before building it (describeFacadePaintSourceBounds, the
 // facade module's pre-build bound). The shared setup already substitutes that
 // facade module's builders with the fixture's own paint text
 // (paintProgramFragment / facadePaintFragmentForCity → preparedPaintSource);
 // its bound is the exact bound of that same fixture text, measured by the
 // production shader-source budget, never a stand-in number.
 // (The Tier300 data plan in the same setup already binds its bound this way.)
 setup=replaceOnce(setup,'...preparedSourceHelpers,...utf8Helpers,describeFacadePaintSource:(city,source,kind,scope)=>describeFixturePaintSource(values,city,source,kind,scope),',
  '...preparedSourceHelpers,...utf8Helpers,describeFacadePaintSource:(city,source,kind,scope)=>describeFixturePaintSource(values,city,source,kind,scope),describeFacadePaintSourceBounds:(city,sourceKey,scope)=>{checkScope(scope);return shaderSourceHelpers.shaderSourceBounds(shaderSourceHelpers.shaderSourceParts`${sourceKey===undefined?values.facadePaintFragmentForCity(city,scope):values.paintProgramFragment(sourceKey,city,scope)}`);},','prepared plan paint bounds');
 // Each prepared plan names its facade module's immutable program source
 // authority (ROOT500_/INFILL_/BREMEN_FACADE_PROGRAM_SOURCE_AUTHORITY) as
 // provenance. The setup replaces exactly that module's builders
 // (paintProgramPartitionEnabled, paintProgramFragment,
 // facadePaintFragmentForCity) with the fixture's paint text, so the plan's
 // provenance is the production authority shape over those same fixture
 // builders (createProgramSourceAuthority, one frozen authority per plan
 // scope), not the module's asset digests the fixture never loads.
 setup=replaceOnce(setup,"prepareRoot500ProgramData:async(_keys,_city,signal,scope)=>{",
  "...(()=>{const authority=preparationHelpers.createProgramSourceAuthority({inputs:['fixture-facade-paint-builders',provider],builders:[values.paintProgramPartitionEnabled,values.paintProgramFragment,values.facadePaintFragmentForCity]});return{ROOT500_FACADE_PROGRAM_SOURCE_AUTHORITY:authority,INFILL_FACADE_PROGRAM_SOURCE_AUTHORITY:authority,BREMEN_FACADE_PROGRAM_SOURCE_AUTHORITY:authority};})(),\n  prepareRoot500ProgramData:async(_keys,_city,signal,scope)=>{",'prepared plan facade authority');
 // Prepared program plans preflight every program against the page
 // ResourceBudget (programBudget; "Prepared source program preflight requires
 // the page ResourceBudget"). The renderers pass their chunk store's budget
 // (root500/infill: the geometry owner's store, Bremen: its held chunk store);
 // the fixture plans are created the same way from the fixture's page store,
 // as the setup already does for the Tier300 data plan.
 setup=replaceOnce(setup,"create({identity:'fixture-root500-plan',scope:frozen,city:values.city})","create({identity:'fixture-root500-plan',scope:frozen,city:values.city,budget:values.geometryOwner.store.budget})",'root500 plan budget');
 setup=replaceOnce(setup,"create({id:1,scope:frozen,city:values.city})","create({id:1,scope:frozen,city:values.city,budget:values.geometryOwner.store.budget})",'infill plan budget');
 setup=replaceOnce(setup,"create({scope:frozen,city:values.city,generation:values.generation,","create({budget:values.geometryOwner.store.budget,scope:frozen,city:values.city,generation:values.generation,",'bremen plan budget');
 if(rendererImports.length)setup=replaceOnce(setup,'const RENDERER_IMPORTS=[','const RENDERER_IMPORTS=['+rendererImports.map(value=>JSON.stringify(value)).join(',')+',','renderer imports');
 if(patch)setup=patch(setup,replaceOnce);
 return import('data:text/javascript;base64,'+Buffer.from(setup+'\nexport {'+exports.join(',')+'};\n//# sourceURL='+sourceURL).toString('base64'));
}
