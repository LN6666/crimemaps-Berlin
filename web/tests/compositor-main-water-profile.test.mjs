import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {build} from 'esbuild';

// The actual main.ts environment installer (syncEnvironmentMode), run against the
// actual environment admission helpers, page ledger, chunk store and byte
// transport. Stand-ins: the 3D owner (its readiness gate and the City manager's
// caller-admitted readAsset, which acquires through the actual transport with
// the forwarded admission and decodes), the scene manager (it performs the
// manager's own identity take-over of the decoded profile) and DOM/map handles.
const web=fileURLToPath(new URL('../',import.meta.url)),safety=path.join(web,'src/safety');
// Optional negative control: substitute main.ts text.
const mainFile=process.env.COMPOSITOR_MAIN_MAIN_TS??path.join(safety,'main.ts');
const MiB=1024**2;
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function turns(n=4){for(let i=0;i<n;i++)await settle();}
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};

const helpersBuild=await build({stdin:{contents:"export * from './environment-resource-budget';export {createResourceBudget} from './render-runtime/resource-budget';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export * as transport from './resource-byte-transport';",resolveDir:safety,sourcefile:'water-profile-helpers.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent'});
const helpers=await import('data:text/javascript;base64,'+Buffer.from(helpersBuild.outputFiles[0].text).toString('base64'));
const bytesModule=helpers.transport;

const mainText=await readFile(mainFile,'utf8'),mainAst=ts.createSourceFile('main.ts',mainText,ts.ScriptTarget.Latest,true);
function collect(ast,predicate){const out=[];(function visit(node){if(predicate(node))out.push(node);ts.forEachChild(node,visit);})(ast);return out;}
const declaration=collect(mainAst,node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>row.name.getText(mainAst)==='syncEnvironmentMode'));
assert.equal(declaration.length,1,'the actual main.ts environment installer');
const installer=ts.transpileModule(declaration[0].getText(mainAst),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/\bimport\(/g,'__import(');

const LABEL='environment water admission profile';
const profileValue={boundarySHA256:'b'.repeat(64),origin:[13.4,52.5],sourcePbfSHA256:'c'.repeat(64),physicalTileSHA256:['d'.repeat(64),'e'.repeat(64)]};
const profileBytes=new TextEncoder().encode(JSON.stringify(profileValue));
const admission={path:'/safety/environment/berlin/water-admission-test.json',sha256:'f'.repeat(64),bytes:profileBytes.length};
const costBytes=costs=>costs.reduce((sum,cost)=>sum+cost.bytes,0);
const keepBytes=costBytes(helpers.environmentJsonReadCosts(admission,'water admission profile'));
const pressure=label=>({capacity:1,required:2,current:1,recentCapacity:0,recentRequired:0,recentCurrent:0,shortfallBytes:1,recentShortfallBytes:0,additionalBytes:1,constraint:'total',label});

function environment({limitBytes=64*MiB,ensureGate,readGate,refusals=[],budgets=helpers}={}){
  const budget=helpers.createResourceBudget({limitBytes,recentLimitBytes:0}),store=helpers.createChunkResourceStore({budget});
  const events=[],installed=[],reads=[];
  // The page transport of the 3D owner on the same store; its network body is gated.
  const transport=bytesModule.createResourceByteTransport({namespace:'water-profile-test',resourceStore:store,read:async(target,signal,max)=>{
    reads.push({target,max,bytes:budget.stats.bytes,listeners:budget.stats.availabilityListeners});
    if(readGate)await readGate.promise;signal.throwIfAborted();return profileBytes.slice();
  }});
  const threeDimensional={mode:'3d',renderer:undefined,resourceStore:store,
    async ensureReady(signal){
      events.push(['ensureReady',budget.stats.bytes,budget.stats.availabilityListeners]);
      if(ensureGate)await new Promise((resolve,reject)=>{const abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});ensureGate.promise.then(()=>{signal.removeEventListener('abort',abort);resolve();});});
      events.push(['ready',budget.stats.bytes]);
    },
    // The City manager's caller-admitted readAsset: the admission goes to the
    // page transport unchanged, the value is decoded, the lease is returned.
    async readAsset(asset,signal,max,options){
      events.push(['read',asset,max,options,budget.stats.bytes,options?.admitted?.bytes]);
      const refusal=refusals.shift();if(refusal)throw refusal(options);
      const lease=await transport.acquireBytes(asset.path,signal,Math.min(max,asset.bytes),options);
      try{events.push(['delivered',budget.stats.bytes,options.admitted.bytes,lease.cost?.bytes]);return JSON.parse(new TextDecoder().decode(lease.bytes));}
      finally{lease.release();}
    },
  };
  const manager={setReflectionSource(){},setSceneEnvironment(){},setVisible(){},setOffscreen(){},setReducedMotion(){},setMode(value){events.push(['mode',value]);}};
  const modules={
    // The scene manager's own take-over (environment-scene-manager :60-62): it
    // reserves environmentWaterProfileCost(profile) of the same module main.ts
    // imports, under the profile's own identity; a refused take-over leaves the
    // profile uncharged until its first refresh (environmentAdmissionError).
    './environment-scene-manager':{installEnvironmentScene(options){
      const before=budget.stats.bytes,profile=options.waterAdmission;let claim;
      if(profile!==null&&typeof profile==='object')try{claim=budgets.reserveEnvironmentCosts(options.resourceStore.budget,[budgets.environmentWaterProfileCost(profile)],LABEL);}catch(error){if(!budgets.environmentAdmissionError(error,LABEL))throw error;}
      installed.push({options,before,after:budget.stats.bytes,claim});return manager;}},
    './environment-city-admission':{environmentWaterAdmission:city=>city==='berlin'?admission:undefined},
    './environment-resource-budget':budgets,
    './resource-byte-transport':bytesModule,
  };
  const context=vm.createContext({AbortController,DOMException,Promise,console,
    __import:specifier=>Promise.resolve(modules[specifier]??assert.fail('unexpected import '+specifier)),
    environmentWanted:false,environmentDestroyed:false,environmentSuspended:false,environmentLoad:undefined,environmentRequest:new AbortController(),environmentStatus:'idle',environmentScene:undefined,
    document:{hidden:false},currentCity:'berlin',map:{},matchMedia:()=>({matches:false}),sceneFrameClock:undefined,planarReflectionGroup:()=>({}),dedicatedAppearance:undefined,
    sceneEnvironment:{},sceneViewportVisible:true,threeDimensionalMotion:{matches:false},threeDimensional});
  vm.runInContext(installer,context);
  return{budget,store,transport,events,installed,reads,context,threeDimensional,
    start(){vm.runInContext('syncEnvironmentMode(true);',context);return context.environmentLoad;},
    supersede(){vm.runInContext('environmentWanted=false;environmentRequest.abort();',context);},
    find(kind){return events.filter(row=>row[0]===kind);}};
}
const retainedBytes=value=>helpers.environmentRetainedEstimate(value);

test('the water profile waits for 3D readiness holding nothing, admits one claim with its minted read envelope, and the manager takes the retained value over for no byte',async()=>{
  const ensureGate=deferred(),f=environment({ensureGate});
  const loading=f.start();await turns();
  assert.deepEqual(f.find('ensureReady'),[['ensureReady',0,0]],'readiness is awaited before any admission');
  assert.equal(f.find('read').length,0);assert.equal(f.budget.stats.bytes,0);assert.equal(f.budget.stats.availabilityListeners,0,'nothing is held or registered while readiness is pending');
  ensureGate.resolve();await loading;
  const [read]=f.find('read'),[, asset,max,options,bytesAtCall,claimBytes]=read;
  assert.equal(asset,admission);assert.equal(max,admission.bytes,'the read ceiling is the descriptor size');
  assert.equal(options.keep.length,helpers.environmentJsonReadCosts(admission,'x').length);assert.equal(costBytes(options.keep),keepBytes,'keep lists the reader copy, decoded text and parsed value');
  assert.equal(costBytes(options.envelope),2*admission.bytes,'a minted two-copy read envelope');
  await assert.rejects(f.transport.acquireBytes(admission.path,new AbortController().signal,admission.bytes,{...options,envelope:[...options.envelope]}),/minted by resourceByteAdmittedEnvelope/,'the envelope main.ts passed was minted (a copy is refused)');
  assert.equal(claimBytes,keepBytes+2*admission.bytes,'one claim lists the working set and the envelope');
  assert.equal(bytesAtCall,claimBytes,'that claim is all the ledger holds when the read starts');
  assert.equal(f.reads.length,1);assert.equal(f.reads[0].bytes,claimBytes,'the transport reads under the claim without reserving another byte');assert.equal(f.reads[0].listeners,0,'and without waiting');
  const [delivered]=f.find('delivered');assert.equal(delivered[2],keepBytes+profileBytes.buffer.byteLength,'delivery shrinks the claim in place to keep plus the delivered buffer');assert.equal(delivered[3],profileBytes.buffer.byteLength);
  assert.equal(f.installed.length,1);const install=f.installed[0];
  assert.deepEqual(install.options.waterAdmission,profileValue);
  assert.equal(install.before,retainedBytes(install.options.waterAdmission),'before install the claim already shrank to the retained value');
  assert.equal(install.after,install.before,'the manager takes that identity over for no byte');
  assert.equal(install.options.resourceStore,f.store,'the manager receives the 3D owner\'s page store');
  assert.equal(f.context.environmentStatus,'installed');
  assert.equal(f.budget.stats.bytes,install.before,'after main.ts releases its claim, only the manager\'s retained value remains');assert.equal(f.budget.stats.availabilityListeners,0);
  // The installer hands the manager readiness and the forwarded four-argument read.
  const forwarded=[];f.threeDimensional.readAsset=(...args)=>{forwarded.push(args);return Promise.resolve('value');};
  const marker={admitted:{},envelope:[],keep:[]},signal=new AbortController().signal;
  assert.equal(await install.options.read(admission,signal,7,marker),'value');assert.equal(forwarded[0][3],marker,'the fourth argument is passed through unchanged');
  await install.options.read(admission,signal,7);assert.equal(forwarded[1].length,4);assert.equal(forwarded[1][3],undefined,'undefined stays undefined');
  const readiness=f.find('ensureReady').length;await install.options.ensureRead(signal);assert.equal(f.find('ensureReady').length,readiness+1,'ensureRead is the 3D owner\'s ensureReady');
  install.claim.release();assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('superseded while waiting for readiness, during the read or before install, the profile returns its claim and installs nothing',async()=>{
  const ensureGate=deferred(),early=environment({ensureGate});const first=early.start();await turns();
  early.supersede();await first;
  assert.equal(early.find('read').length,0);assert.equal(early.budget.stats.bytes,0);assert.equal(early.budget.stats.availabilityListeners,0);assert.notEqual(early.context.environmentStatus,'error');assert.equal(early.installed.length,0);early.store.destroy();

  const readGate=deferred(),reading=environment({readGate});const second=reading.start();await turns();
  assert.equal(reading.reads.length,1);assert.equal(reading.budget.stats.bytes,keepBytes+2*admission.bytes,'held while the read is in flight');
  reading.supersede();await second;
  assert.equal(reading.installed.length,0);
  assert.equal(reading.budget.stats.bytes,2*admission.bytes,'only the abandoned read\'s envelope stays charged, by its own entry, until the read settles');
  readGate.resolve();await turns();assert.equal(reading.budget.stats.bytes,0,'then nothing is left');reading.store.destroy();

  const lateGate=deferred(),late=environment({readGate:lateGate});const third=late.start();await turns();
  late.context.environmentDestroyed=true;lateGate.resolve();await third;
  assert.equal(late.find('delivered').length,1,'the read completed');assert.equal(late.installed.length,0,'a destroyed page installs nothing');
  assert.equal(late.budget.stats.bytes,0,'the early return after the read releases the claim');late.store.destroy();
});

test('the profile claim waits for ledger capacity holding nothing; a claim above the page limit fails at once',async()=>{
  const limitBytes=256*1024,f=environment({limitBytes}),required=keepBytes+2*admission.bytes;assert(required<limitBytes);
  const blocker=f.budget.reserve({category:'construction',bytes:limitBytes-required+1,precision:'estimate'});
  const loading=f.start();await turns();
  assert.equal(f.find('read').length,0,'no read before admission');assert.equal(f.context.environmentStatus,'loading');
  assert.equal(f.budget.stats.availabilityListeners,1);assert.equal(f.budget.stats.bytes,limitBytes-required+1,'only the blocker is charged while the profile waits');
  blocker.release();await loading;
  assert.equal(f.context.environmentStatus,'installed');assert.equal(f.budget.stats.availabilityListeners,0);
  f.installed[0].claim.release();assert.equal(f.budget.stats.bytes,0);f.store.destroy();
  const unfit=environment({limitBytes:required-1});await unfit.start();
  assert.equal(unfit.context.environmentStatus,'error');assert.equal(unfit.find('read').length,0);assert.equal(unfit.budget.stats.availabilityListeners,0);assert.equal(unfit.budget.stats.bytes,0);unfit.store.destroy();
});

test('a refused delivery is retried once with the envelope it names after everything was returned; a second or an unfit refusal fails',async()=>{
  const refuse=(delivered,unfit=false)=>options=>new bytesModule.ResourceByteDeliveryRefusedError(pressure('refused'),{keepBytes:costBytes(options.keep),deliveredBytes:delivered,max:admission.bytes,limitBytes:unfit?1:64*MiB});
  const once=environment({refusals:[refuse(3*admission.bytes)]});await once.start();
  const reads=once.find('read');assert.equal(reads.length,2,'one retry');
  assert.equal(reads[0][5],keepBytes+2*admission.bytes);assert.equal(costBytes(reads[1][3].envelope),3*admission.bytes,'the retry envelope covers the refused delivery');
  assert.equal(reads[1][4],keepBytes+3*admission.bytes,'the first claim was returned before the retry was admitted');assert.equal(reads[1][5],keepBytes+3*admission.bytes);
  assert.equal(once.context.environmentStatus,'installed');once.installed[0].claim.release();assert.equal(once.budget.stats.bytes,0);once.store.destroy();
  const twice=environment({refusals:[refuse(3*admission.bytes),refuse(4*admission.bytes)]});await twice.start();
  assert.equal(twice.find('read').length,2,'no loop');assert.equal(twice.context.environmentStatus,'error');assert.equal(twice.budget.stats.bytes,0);twice.store.destroy();
  const unfit=environment({refusals:[refuse(3*admission.bytes,true)]});await unfit.start();
  assert.equal(unfit.find('read').length,1,'an unfit refusal is not retried');assert.equal(unfit.context.environmentStatus,'error');assert.equal(unfit.budget.stats.bytes,0);unfit.store.destroy();
});

test('the claim shrinks to the environment manager\'s own shared take-over cost; a retained estimate beyond the read\'s upper bound that the full ledger refuses still installs on the manager\'s fallback',async()=>{
  // The shared estimate changes: main.ts and the manager still list one cost, so the take-over adds no byte.
  const shifted={...helpers,environmentWaterProfileCost:profile=>({...helpers.environmentWaterProfileCost(profile),bytes:retainedBytes(profile)+8})};
  const f=environment({budgets:shifted});await f.start();
  assert.equal(f.context.environmentStatus,'installed');const install=f.installed[0];
  assert.equal(install.before,retainedBytes(install.options.waterAdmission)+8,'the claim shrank to environmentWaterProfileCost(profile), not a hand-written copy');
  assert.equal(install.after,install.before,'the manager takes the same cost over for no byte');
  install.claim.release();assert.equal(f.budget.stats.bytes,0);f.store.destroy();
  // A retained estimate above the claim on a ledger that cannot grow: no programming error, the install proceeds uncharged.
  const required=keepBytes+2*admission.bytes,beyond={...helpers,environmentWaterProfileCost:profile=>({...helpers.environmentWaterProfileCost(profile),bytes:required+1})};
  const full=environment({limitBytes:required,budgets:beyond});await full.start();
  assert.equal(full.context.environmentStatus,'installed','a refused growth is not treated as a refused shrink');
  assert.equal(full.installed.length,1);assert.equal(full.installed[0].claim,undefined,'the manager\'s take-over is refused too: its documented fallback');
  assert.equal(full.budget.stats.bytes,0,'main.ts returned its claim');assert.equal(full.budget.stats.availabilityListeners,0);full.store.destroy();
});
