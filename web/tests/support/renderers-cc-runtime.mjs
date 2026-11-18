// One production module graph for the renderers-cc suites (City and Church,
// third stage): the program owner, the page ResourceBudget and chunk store, the
// solar preparation budget, the prepared-source workspace, the shader source
// descriptors and the City shader budget (with its static material wrappers).
// One graph keeps one class identity for ProgramPreparationPending and the
// ledger errors. Renderer declarations themselves are bound from their source
// text with the shared scope fixture (support/renderers-city-tier-church-scope).
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {nullCityDataProfilePlugin} from '../city-profile-test-plugin.mjs';

const web=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(path.join(web,'package.json'));
const esbuild=require('esbuild');

const entry=[
 "export {createProgramPreparationOwner,createProgramSourceAuthority,isProgramPreparationPending,isProgramPreparationBudgetWait,ProgramPreparationPending} from './render-runtime/program-preparation';",
 "export {createResourceBudget} from './render-runtime/resource-budget';",
 "export {createChunkResourceStore,bindChunkResourceContext} from './render-runtime/chunk-resource-store';",
 "export {solarShadowPreparation,prepareSolarShadowResources,solarShadowPreparationNeedsFrame,createSolarShadowPreparationBudget} from './solar-shadow-preparation';",
 "export {createPreparedSourceWorkspace} from './prepared-source';",
 "export {currentPaintProgramGroups} from './current-paint-program-groups';",
 "export {shaderSourceBounds,shaderSourceText} from './render-runtime/shader-source-budget';",
 "export {admitCityMaterialPreflight,calibrateCityMaterialWrapper,measureCityMaterialWrapper,cityWrapperCalibrationStats,describeCityMaterialBounds,createCityMaterialBuilder,DECLARED_CITY_MATERIAL_CITIES,CITY_DRESDEN_DISPATCHERS} from '../painted/city/safety/city-shader-budget';",
 "export {c311MaterialFragment} from '../painted/city/safety/c311-feature-glsl';",
 "export {c312MaterialFragment} from '../painted/city/safety/c312-feature-glsl';",
 "export {c313MaterialFragment} from '../painted/city/safety/c313-feature-glsl';",
 "export {c318MaterialFragment} from '../painted/city/safety/c318-feature-glsl';",
].join('\n');
const built=await esbuild.build({stdin:{contents:entry,resolveDir:path.join(web,'src/safety'),sourcefile:'renderers-cc-runtime.ts',loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022',logLevel:'silent',plugins:[nullCityDataProfilePlugin]});
export const runtime=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=renderers-cc-runtime.mjs').toString('base64'));

function fakeGL(){
 let id=0;
 return{VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,COMPILE_STATUS:4,SYNC_GPU_COMMANDS_COMPLETE:6,ALREADY_SIGNALED:7,CONDITION_SATISFIED:8,TIMEOUT_EXPIRED:9,WAIT_FAILED:10,lost:false,calls:0,
  isContextLost(){return this.lost;},getExtension:()=>null,createShader(type){this.calls++;return{id:++id,type};},shaderSource(){this.calls++;},compileShader(){this.calls++;},getShaderParameter:()=>true,getShaderInfoLog:()=>'',
  createProgram(){this.calls++;return{id:++id,program:true};},attachShader(){},detachShader(){},deleteShader(){},bindAttribLocation(){},linkProgram(){},getProgramParameter:()=>true,getProgramInfoLog:()=>'',
  deleteProgram(program){program.deleted=true;},fenceSync:()=>({}),flush(){},clientWaitSync:()=>7,deleteSync(){},createVertexArray:()=>({vao:++id}),getParameter:()=>16};
}

/** Logical bytes the ledger charges now. */
export const usedBytes=budget=>({bytes:budget.stats.bytes,reservations:budget.stats.reservations});

/**
 * A real program owner on a real page ledger (1000 logical bytes) and store.
 * `block()` holds 900 B so that any demand above 100 B is refused and its
 * owner waits on the ledger's onAvailable wake. `map.repaints` counts the
 * renderer's own frame requests and every wake's repaint. Scheduler turns are
 * captured, never run on a real timer; dispose runs the remaining ones.
 */
export function ledgerFixture(){
 const queue=[],previous=globalThis.setTimeout;globalThis.setTimeout=fn=>(queue.push(fn),queue.length);
 const budget=runtime.createResourceBudget({limitBytes:1000,recentLimitBytes:0}),store=runtime.createChunkResourceStore({budget}),gl=fakeGL();runtime.bindChunkResourceContext(gl,store);
 const map={repaints:0,triggerRepaint(){map.repaints++;}},owner=runtime.createProgramPreparationOwner('renderers-cc ledger fixture',()=>map.triggerRepaint());
 let blocker;const recipes=new Map();
 const recipe=(name='colour')=>{let value=recipes.get(name);if(!value)recipes.set(name,value={resource:name,priority:'visible',inputs:['fixture:'+name],budget:{sourceBytesUpperBound:512,submittedAllowanceBytes:128},build:()=>({vertex:'vertex',fragment:'fragment '+name,attributes:['a_position']})});return value;};
 return{budget,store,gl,map,owner,queue,
  /** One program owner demand: a held budget wait while blocked. */
  compile:(name='colour')=>owner.compile(gl,recipe(name)),
  block(){blocker=budget.reserve({category:'construction',bytes:900,precision:'exact'});return blocker;},
  unblock(){blocker?.release();blocker=undefined;},
  dispose(){blocker?.release();owner.dispose();try{let n=0;while(queue.length){assert(++n<1000,'bounded fixture turns');queue.shift()();}}finally{globalThis.setTimeout=previous;}store.collectRetired();store.destroy();},
 };
}
