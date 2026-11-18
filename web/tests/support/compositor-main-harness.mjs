// The compositor-main harness: the real painted-map compositor and the real
// lazy adapter with the real page ledger, chunk store, byte transport,
// program-preparation module and planar reflection group. Fixtures: the
// city data (a null profile, optionally a detail catalog), the painted provider
// modules (inert managers that keep the options they are handed and record
// every requestMode call with all of its arguments), a controllable Frozen
// initializer session and the network bytes.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const web=fileURLToPath(new URL('../../',import.meta.url));
export const source=path.join(web,'src/safety');
const substitutes={'painted-map.ts':process.env.COMPOSITOR_MAIN_PAINTED_MAP,'three-dimensional-lazy.ts':process.env.COMPOSITOR_MAIN_LAZY};
export const MiB=1024**2;
export const settle=()=>new Promise(resolve=>setImmediate(resolve));
export async function until(predicate,label){for(let i=0;i<200;i++){if(predicate())return;await settle();}assert.fail(label);}
export const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return{promise,resolve};};
export const providers=['root500','delegated500','tier300','church','city'];
export const controller=()=>new AbortController();

function session(gate){
  let active=true,ended;const waiters=new Set();
  const end=error=>{if(!active)return;active=false;ended=error;endSession(error);for(const waiter of [...waiters]){waiters.delete(waiter);waiter.reject(error);}};
  // Like the actual session: wait races the operation with this session's end.
  let endSession;const ending=new Promise((_resolve,reject)=>{endSession=reject;});void ending.catch(()=>{});
  return{get active(){return active;},wait:operation=>Promise.race([gate?gate.promise.then(()=>operation):operation,ending]),
    settled(signal){
      if(!active)return Promise.reject(ended);
      return new Promise((resolve,reject)=>{const waiter={resolve,reject:error=>{signal.removeEventListener('abort',abort);reject(error);}};const abort=()=>{waiters.delete(waiter);reject(signal.reason);};waiters.add(waiter);signal.addEventListener('abort',abort,{once:true});waiter.resolve=()=>{signal.removeEventListener('abort',abort);resolve();};});
    },
    close(){end(new DOMException('Session closed','AbortError'));},fail:end};
}

/** detailCatalog: the city data's buildingDetailCatalog (undefined: none). */
export async function createCompositorHarness({detailCatalog,focusRegistry}={}){
  const slot='__compositorMainHarness'+Math.random().toString(16).slice(2);
  const fixtureModules={
    'virtual:crimemaps-city-data':`export const profileSHA256=null;export const buildingFocusRegistry=${focusRegistry===undefined?'undefined':JSON.stringify(focusRegistry)};export const buildingDetailCatalog=${detailCatalog===undefined?'undefined':JSON.stringify(detailCatalog)};export default null;`,
    'frozen-paint-tables':`export const beginFrozenPaintTableInitialization=(...args)=>globalThis[${JSON.stringify(slot)}].begin(...args);export const frozenPaintTableStats=()=>({});export const createFrozenDataResourceOwner=()=>({client:provider=>({provider,dispose(){}}),stats:{active:0,queued:0,waiters:0},destroy(){}});`,
  };
  const entry=[
    "export {installThreeDimensionalMap as installCompositor} from './painted-map';",
    "export {installThreeDimensionalMap as installLazy} from './three-dimensional-lazy';",
    "export {createChunkResourceStore} from './render-runtime/chunk-resource-store';",
    "export {createResourceBudget} from './render-runtime/resource-budget';",
    "export {solarShadowPreparationNeedsFrame,solarShadowPreparationHeldWait} from './solar-shadow-preparation';",
  ].join('\n');
  const text=(await build({stdin:{contents:entry,resolveDir:source,sourcefile:'compositor-main-harness-entry.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,logLevel:'silent',plugins:[{name:'compositor-main-harness',setup(builder){
    builder.onResolve({filter:/^virtual:crimemaps-city-data$/},()=>({path:'virtual:crimemaps-city-data',namespace:'compositor-main-harness'}));
    builder.onResolve({filter:/^\.\/frozen-paint-tables$/},args=>args.importer.endsWith('painted-map.ts')?{path:'frozen-paint-tables',namespace:'compositor-main-harness'}:undefined);
    builder.onLoad({filter:/.*/,namespace:'compositor-main-harness'},args=>({loader:'js',contents:fixtureModules[args.path],resolveDir:source}));
    builder.onResolve({filter:/painted\/[^/]+\/safety\/(?:three-dimensional-map|building-mesh-renderer)$/},args=>({path:args.path,namespace:'compositor-main-harness-provider'}));
    builder.onLoad({filter:/.*/,namespace:'compositor-main-harness-provider'},args=>({loader:'js',contents:args.path.endsWith('building-mesh-renderer')?'export const inertRenderer=true;':
      `export const installThreeDimensionalMap=options=>globalThis[${JSON.stringify(slot)}].provider(${JSON.stringify(args.path.split('painted/')[1].split('/')[0])},options);`}));
    builder.onLoad({filter:/[\\/]safety[\\/](?:painted-map|three-dimensional-lazy)\.ts$/},async args=>{const file=substitutes[path.basename(args.path)];return file?{contents:await readFile(file,'utf8'),loader:'ts',resolveDir:path.dirname(args.path)}:undefined;});
  }}]})).outputFiles[0].text;
  let instance=0;
  return async function load(t,{location={hostname:'test.invalid'}}={}){
    const saved={document:globalThis.document,location:globalThis.location};
    globalThis.document={hidden:false};globalThis.location=location;
    const fixture={captured:new Map(),sessions:[],modeCalls:[],assetReads:[],repaints:0,failMode:undefined};
    globalThis[slot]={
      begin(_ingress,signal){fixture.sessions.at(-1)?.fail(new DOMException('Session replaced','AbortError'));const value=session();signal.addEventListener('abort',()=>value.fail(new DOMException('Session aborted','AbortError')),{once:true});fixture.sessions.push(value);return value;},
      provider(provider,options){
        let mode='2d';
        const renderer={layer:{id:'compositor-main-harness-'+provider,onAdd(){}},stats:{vertices:0,components:0},selected:undefined,
          getRevision:()=>({generation:1,viewRevision:1}),setPageHidden(){},setReducedMotion(){},setOpacityContext(){},setSceneEnvironment(){},clearSelection(){},
          diagnosticScreenSamples:()=>[],isPickReady:()=>true,getDrawReadiness:()=>({ready:true,preparing:false}),getPlanarReflectionRevision:()=>'r',
          prepareSolarShadow:()=>({status:'ready',ready:1,pending:0,failed:0}),preparePlanarReflection:()=>({status:'ready',ready:1,pending:0,failed:0,plannedTriangles:0,plannedDraws:0}),
          renderPlanarReflection:()=>({triangles:0,draws:0,complete:true}),getProgramPreparationStats:()=>[]};
        const manager={
          async requestMode(...args){const [next,signal]=args;fixture.modeCalls.push({provider,args});
            if(fixture.hold?.provider===provider&&next===fixture.hold.next){const hold=fixture.hold;fixture.hold=undefined;await hold.gate.promise;return{mode:next,status:'ready'};}
            signal.throwIfAborted();if(next==='3d'&&fixture.failMode?.provider===provider)throw Error(fixture.failMode.message);mode=next;if(next==='3d')options.onRenderer?.(renderer);return{mode,status:'ready'};},
          get mode(){return mode;},get wantedMode(){return mode;},
          async readAsset(...args){fixture.assetReads.push({provider,args});return 'asset';},
          setPageHidden(){},setReducedMotion(){},setOpacityContext(){},cacheStats:()=>({}),suspend(){},resume(){},destroy(){}};
        fixture.captured.set(provider,{options,renderer,manager});
        return manager;
      }};
    t.after(()=>{globalThis.document=saved.document;globalThis.location=saved.location;delete globalThis[slot];});
    const api=await import('data:text/javascript;base64,'+Buffer.from(text+'\n// compositor main harness '+(++instance)).toString('base64'));
    return{api,fixture};
  };
}

export function page(api){
  const budget=api.createResourceBudget({limitBytes:64*MiB,recentLimitBytes:1024}),resourceStore=api.createChunkResourceStore({budget});
  const read=(target,signal)=>signal.aborted?Promise.reject(signal.reason):Promise.reject(TypeError('Fixture network has no '+target));
  return{budget,resourceStore,read};
}

export function mapStub(fixture){
  const listeners=new Set();
  return{listeners,on(_type,fn){listeners.add(fn);},off(_type,fn){listeners.delete(fn);},triggerRepaint(){fixture.repaints++;},stop(){},easeTo(){},
    getCenter:()=>({lng:13.4,lat:52.5}),getPadding:()=>({top:0,right:0,bottom:0,left:0}),getCanvas:()=>({clientWidth:100,clientHeight:100,width:200,height:200}),
    getZoom:()=>16,getBearing:()=>0,getPitch:()=>45,getRoll:()=>0,getVerticalFieldOfView:()=>36.87,getCenterElevation:()=>0,getProjection:()=>({type:'mercator'})};
}
