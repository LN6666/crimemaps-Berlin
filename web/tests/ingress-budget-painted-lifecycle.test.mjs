import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// The real painted-map compositor with the real frozen facade, initializer
// store, byte transport, page store and ledger. Only the null-profile
// development inputs (virtual city data, deployment, table manifest and
// dependencies) and the seven painted provider modules are fixtures: the
// providers are inert managers, so every table read below is an initializer
// input started through painted-map's own ingress session.
const web=fileURLToPath(new URL('../',import.meta.url)),source=path.join(web,'src/safety');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function table(value){
  const raw=new TextEncoder().encode(JSON.stringify(value)),sha256=hash(raw),physical=new Uint8Array(gzipSync(raw)),t=hash(physical);
  return{raw,physical,d:{path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:raw.length,
    transport:{path:`/safety/buildings3d/painted-tables/${t.slice(0,2)}/${t}.json.gz`,sha256:t,bytes:physical.length,encoding:'gzip'}}};
}
const digest=n=>createHash('sha256').update(String(n)).digest('hex');
const resumed=table({rows:Array.from({length:160},(_,i)=>({i,v:digest('resumed-'+i)}))}),late=table({rows:Array.from({length:90},(_,i)=>({i,v:digest('late-'+i)}))});
const resumedFile='painted/root500/safety/ingress-lifecycle-resumed.ts',lateFile='painted/root500/safety/ingress-lifecycle-late.ts';
const providers=['root500','delegated500','tier300','church','city'];
const manifest=[resumed.d,late.d];
const dependencies={schema_version:1,providers:Object.fromEntries(providers.map(p=>[p,p==='root500'?[resumed.d.sha256,late.d.sha256]:[]])),
  initializers:Object.fromEntries(providers.map(p=>[p,p==='root500'?{[resumed.d.sha256]:{[resumedFile]:1},[late.d.sha256]:{[lateFile]:1}}:{}]))};
const factory='__ingressLifecycleFactory'+Math.random().toString(16).slice(2);
const contents=await readFile(path.join(source,'painted-map.ts'),'utf8')+[
  "\nexport {readFrozenTableAsync,frozenPaintTableStats} from './frozen-paint-tables';",
  "export {createChunkResourceStore} from './render-runtime/chunk-resource-store';",
  "export {createResourceBudget} from './render-runtime/resource-budget';",
].join('\n');
const built=await build({stdin:{contents,resolveDir:source,sourcefile:'painted-map.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,plugins:[{name:'painted-lifecycle-inputs',setup(builder){
  builder.onResolve({filter:/^(?:virtual:crimemaps-city-data|\.\/deployment|\.\/frozen-paint-table-(?:manifest|dependencies)\.json)$/},args=>({path:args.path,namespace:'lifecycle-fixture'}));
  builder.onLoad({filter:/.*/,namespace:'lifecycle-fixture'},args=>({loader:'js',contents:args.path==='virtual:crimemaps-city-data'?'export const profileSHA256=null;export const buildingFocusRegistry=undefined;export const buildingDetailCatalog=undefined;export default null;':args.path==='./deployment'?"export const repositoryCity='berlin';":'export default '+JSON.stringify(args.path.includes('manifest')?manifest:dependencies)+';'}));
  builder.onResolve({filter:/painted\/[^/]+\/safety\/(?:three-dimensional-map|building-mesh-renderer)$/},args=>({path:args.path,namespace:'lifecycle-provider'}));
  builder.onLoad({filter:/.*/,namespace:'lifecycle-provider'},args=>({loader:'js',contents:args.path.endsWith('building-mesh-renderer')?'export const inertRenderer=true;':
    `export const installThreeDimensionalMap=options=>globalThis[${JSON.stringify(factory)}](${JSON.stringify(args.path.split('painted/')[1].split('/')[0])},options);`}));
}}]});
const text=built.outputFiles[0].text;
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate,label){for(let i=0;i<80;i++){if(predicate())return;await settle();}assert.fail(label);}
const body=f=>{const bytes=new Uint8Array(f.physical.length);bytes.set(f.physical);return bytes;};
const claim=f=>3*f.d.bytes+2*f.d.transport.bytes;
let instance=0;
// Each case is a fresh page: module-level initializer completion is one-shot.
async function page(t){
  const saved={document:globalThis.document,location:globalThis.location};
  globalThis.document={hidden:false};globalThis.location={hostname:'test.invalid'};
  t.after(()=>{globalThis.document=saved.document;globalThis.location=saved.location;delete globalThis[factory];});
  const created=[];
  globalThis[factory]=(provider,options)=>{
    let mode='2d';created.push(provider);
    const renderer={layer:{id:'lifecycle-'+provider},stats:{vertices:0,components:0},selected:undefined,getRevision:()=>({generation:1,viewRevision:1}),setPageHidden(){},setReducedMotion(){},setOpacityContext(){},diagnosticScreenSamples:()=>[],isPickReady:()=>true,getDrawReadiness:()=>undefined};
    return{async requestMode(next,signal){signal.throwIfAborted();mode=next;options.onRenderer?.(renderer);return{mode,status:'ready'};},get mode(){return mode;},get wantedMode(){return mode;},
      async readAsset(_asset,signal){signal.throwIfAborted();return 'asset';},
      setPageHidden(){},setReducedMotion(){},setOpacityContext(){},cacheStats:()=>({}),suspend(){},resume(){},destroy(){}};
  };
  const api=await import('data:text/javascript;base64,'+Buffer.from(text+'\n// painted lifecycle '+(++instance)).toString('base64'));
  const budget=api.createResourceBudget({limitBytes:64*1024*1024,recentLimitBytes:1024}),resourceStore=api.createChunkResourceStore({budget}),reads=[];
  // A network read rejects when its production is cancelled, like fetch.
  const fetchBytes=(target,signal,max)=>new Promise((resolve,reject)=>{const row={path:target,signal,max,resolve,reject};reads.push(row);signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});
  const map={on(){},off(){},triggerRepaint(){}};
  const baseline=budget.stats.bytes;
  const ledger=()=>api.frozenPaintTableStats().inputLedger;
  // IA-R2 (stage 2 ingress-adopt CDR[2]): parsed table values stay on the page ledger as page-lifetime
  // 'metadata' estimates; the baseline of every quiet/in-flight check includes them.
  // The offset is itself pinned (review F4): no parsed value was refused or parsed without the ledger.
  const parsedRetention=()=>{const r=api.frozenPaintTableStats().parsedRetention;assert.equal(r.unheldParsed,0,'every parsed table value was charged to the page ledger');assert.equal(r.unledgeredParsed,0,'every parsed table value ran with a page ledger');return r.retainedParsedEstimateBytes;};
  const install=()=>{
    const manager=api.installThreeDimensionalMap({map,city:'berlin',mobile:false,resourceStore,fetchBytes});
    const transport=()=>manager.cacheStats().sharedTransport;
    const quiet=async(label,{sessionClosed=true}={})=>{
      await settle();await settle();resourceStore.evictRecent();
      assert.equal(ledger().claims,0,label+': no table input claim remains');assert.deepEqual(ledger().pending,[],label+': no table waits or reads');
      assert.equal(transport().consumers,0,label+': no transport consumer remains');assert.equal(budget.stats.bytes,baseline+parsedRetention(),label+': the page ledger is back at its baseline');
      assert.equal(budget.stats.availabilityListeners,0,label+': no availability wake-up subscription remains');
      // The session is closed (its initializer parked), never failed by a torn-down transport.
      assert.equal(api.frozenPaintTableStats().sessionActive,!sessionClosed,label+': the initializer session state');assert.equal(api.frozenPaintTableStats().failures,0,label+': no initializer read failed');
    };
    const inFlight=(f,count,label)=>{
      assert.equal(reads.length,count,label+': one physical table read');assert.equal(reads.at(-1).path,f.d.transport.path);
      assert.equal(ledger().claims,1);assert.equal(transport().consumers,1);assert.equal(budget.stats.bytes,baseline+parsedRetention()+claim(f),label+': the input and its transport envelope are on the page ledger');
    };
    return{manager,quiet,inFlight};
  };
  return{api,budget,resourceStore,reads,baseline,ledger,created,install};
}

test('painted-map 2D, suspend and destroy cancel in-flight initializer table reads and return every ledger claim; resume completes the parked initializer',async t=>{
  const {api,resourceStore,reads,ledger,created,install}=await page(t);
  const {manager,quiet,inFlight}=install();

  await manager.requestMode('3d',new AbortController().signal);
  assert.deepEqual(created,providers);assert.equal(manager.mode,'3d');
  const value=api.readFrozenTableAsync(resumed.d.sha256,resumedFile,0);
  await until(()=>reads.length===1,'the initializer input is read through the compositor ingress');
  inFlight(resumed,1,'3D');
  assert.ok(manager.cacheStats().facadeHelperSource,'the compositor exposes facade helper source diagnostics');

  await manager.requestMode('2d',new AbortController().signal);
  assert(reads[0].signal.aborted,'2D cancels the in-flight table read');
  await quiet('2D');
  assert.equal(api.frozenPaintTableStats().parsedRetention.retainedParsedEstimateBytes,0,'a cancelled read parsed and charged no table value');

  await manager.requestMode('3d',new AbortController().signal);
  await until(()=>reads.length===2,'a new 3D session resumes the parked initializer');
  inFlight(resumed,2,'3D again');

  assert.equal(manager.suspend(),false,'a plain suspend keeps nothing');
  assert(reads[1].signal.aborted,'suspend cancels the in-flight table read');
  await quiet('suspend');

  manager.resume();
  await until(()=>reads.length===3,'resume restarts the parked initializer input');
  inFlight(resumed,3,'resume');
  reads[2].resolve(body(resumed));
  const parsed=await value;
  assert.equal(parsed.rows.length,160);assert.equal(parsed.rows[5].v,digest('resumed-5'));
  await quiet('resolved',{sessionClosed:false});assert(api.frozenPaintTableStats().parsedRetention.retainedParsedEstimateBytes>0,'the completed table value is charged as page-lifetime metadata');assert.equal(ledger().exits,3,'every claim exited exactly once');

  const lateValue=api.readFrozenTableAsync(late.d.sha256,lateFile,0);void lateValue.catch(()=>{});
  await until(()=>reads.length===4,'a late initializer input starts');
  inFlight(late,4,'late');
  manager.destroy();
  assert(reads[3].signal.aborted,'destroy cancels the in-flight table read');
  await quiet('destroy');
  resourceStore.destroy();
});

// Sessions opened by requestMode/resume are also bound to the request signal
// those exits abort. An asset read before 3D opens one on the reader's own
// signal instead, so only each exit's explicit session close returns it.
test('an initializer session opened by an asset read before 3D is closed by 2D, suspend and destroy themselves',async t=>{
  const {api,reads,ledger,resourceStore,install}=await page(t);
  let value;
  for(const [index,exit] of ['2d','suspend','destroy'].entries()){
    const {manager,quiet,inFlight}=install();
    assert.equal(await manager.readAsset('/safety/environment/lifecycle-probe.json',new AbortController().signal,1),'asset','the read opens the session on its own, never-aborted signal');
    value??=api.readFrozenTableAsync(resumed.d.sha256,resumedFile,0);
    await until(()=>reads.length===index+1,exit+': the parked initializer input is read in the new session');
    inFlight(resumed,index+1,exit);
    if(exit==='2d')await manager.requestMode('2d',new AbortController().signal);
    else if(exit==='suspend')assert.equal(manager.suspend(),false);
    else manager.destroy();
    assert(reads[index].signal.aborted,exit+' cancels the in-flight table read');
    await quiet(exit);
    if(exit!=='destroy')manager.destroy();
  }
  assert.equal(ledger().exits,3);
  void value.catch(()=>{});resourceStore.destroy();
});
