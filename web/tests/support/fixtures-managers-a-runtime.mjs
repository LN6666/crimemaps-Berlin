// Actual page resource runtime for the fixtures-managers-a manager fixtures
// (recovery-resident-reuse, three-dimensional-fallback, root500-manager-data-scope,
// bremen-identity-consumers and the Bremen renderer construction harness).
//
// Since the resource-budget migration the Frozen lease store, its data scopes and
// the managers no longer run without a page ledger: the lease store keeps every
// decoded cell in a ChunkResourceStore, a scope raises the ledger's own
// ResourceBudgetExceededError, and each manager receives the page store from the
// compositor (painted-map passes `resourceStore` to every provider). These
// fixtures therefore load the actual TypeScript sources of that runtime; nothing
// here re-implements or relaxes admission. One loader instance is one page: every
// module it loads shares the same resource-budget module, so error classes and
// instanceof checks agree across the lease store, the scope and the chunk store.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const defaultWeb=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const transpile=text=>ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;

/** CommonJS view of the actual product TypeScript below `web/src`. A local import
 * resolves inside the same tree; any other specifier is refused. A cycle sees the
 * partially initialised exports, which serves the call-time uses of the runtime
 * (chunk-resource-store <-> program-preparation) exactly like ESM live bindings. */
export function createRuntimeLoader(web=defaultWeb){
 const root=path.join(web,'src'),cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  if(!file.startsWith(root+path.sep))throw Error('Runtime fixture source leaves web/src: '+file);
  // A local JSON module: transpiled default imports read `.default` (no interop helper).
  if(file.endsWith('.json')){const value=JSON.parse(fs.readFileSync(file,'utf8')),module={exports:{...(value&&typeof value==='object'&&!Array.isArray(value)?value:{}),default:value}};cache.set(file,module);return module.exports;}
  const module={exports:{}};cache.set(file,module);
  // A module whose evaluation fails is not left half-initialised in the cache.
  try{new Function('require','module','exports',transpile(fs.readFileSync(file,'utf8')))(request=>{
   if(!request.startsWith('.'))throw Error('Runtime dependency must be local: '+request+' from '+path.relative(web,file));
   const base=path.resolve(path.dirname(file),request);
   for(const candidate of [...(/\.(?:json|mjs|js)$/.test(base)?[base]:[]),base+'.ts',path.join(base,'index.ts')])if(fs.existsSync(candidate))return load(candidate);
   throw Error('Unresolved runtime dependency '+request+' from '+path.relative(web,file));
  },module,module.exports);}catch(error){cache.delete(file);throw error;}
  return module.exports;
 }
 const safety=relative=>load(path.join(root,'safety',relative));
 return{
  load,web,
  get resourceBudget(){return safety('render-runtime/resource-budget.ts');},
  get chunkResourceStore(){return safety('render-runtime/chunk-resource-store.ts');},
  get buildingPayloadCost(){return safety('building-payload-cost.ts');},
  /** Runtime bindings of frozen-data-lease-store.ts for fixtures that evaluate its
   * declarations without import statements (gzip and network stay isolated). */
  leaseStoreBindings(){
   const {getPageChunkResourceStore}=this.chunkResourceStore,{ResourceBudgetExceededError,ResourceBudgetHintUnsupportedError,checkedAvailabilitySequence}=this.resourceBudget,{estimateRetainedBuildingPayload}=this.buildingPayloadCost;
   return{getPageChunkResourceStore,ResourceBudgetExceededError,ResourceBudgetHintUnsupportedError,checkedAvailabilitySequence,estimateRetainedBuildingPayload,...safety('render-runtime/pressure-availability.ts'),cloneFrozenJSON:safety('clone-frozen-json.ts').cloneFrozenJSON,resourceByteAdmittedEnvelope:safety('resource-byte-transport.ts').resourceByteAdmittedEnvelope};
  },
  /** Error classes the managers test with instanceof. A fixture stub here (an
   * arrow function) would turn every such catch into a TypeError, so the actual
   * classes of the same page runtime are bound instead. */
  managerErrorClasses(){
   return{ResourceBudgetExceededError:this.resourceBudget.ResourceBudgetExceededError,ChunkResourceContextLostError:this.chunkResourceStore.ChunkResourceContextLostError,StaleBuildingDetailDemandError:safety('building-detail-runtime.ts').StaleBuildingDetailDemandError};
  },
  /** The scope uses the actual page error class and pure weak ownership registry. */
  scopeRequire(label='frozen-data-scope'){
   const budget=this.resourceBudget,parents=safety('reconstruction-resource-parents.ts');
   return specifier=>{if(specifier==='./render-runtime/resource-budget')return budget;if(specifier==='./reconstruction-resource-parents')return parents;throw Error('Unexpected '+label+' runtime import '+specifier);};
  },
  /** One page ledger and its chunk store, as painted-map hands them to providers. */
  createPageResources({limitBytes=64*1024**2,recentLimitBytes=0}={}){
   const budget=this.resourceBudget.createResourceBudget({limitBytes,recentLimitBytes});
   return{budget,store:this.chunkResourceStore.createChunkResourceStore({budget})};
  },
  /** The actual renderer-side retention of a manager's chunk input (the real
   * renderers retain it in prepareBatches and release it with the batch). */
  get retainRendererChunkInput(){return safety('renderer-chunk-input.ts').retainRendererChunkInput;},
  /** Actual value bindings of a source file's local imports, for fixtures that
   * evaluate one extracted factory of that file. Modules named in `skip` are the
   * fixture's own isolation boundary and are neither loaded nor bound. */
  importBindings(relative,{skip=[]}={}){
   const file=path.join(root,relative),ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true),bindings={};
   for(const node of ast.statements){
    if(!ts.isImportDeclaration(node)||node.importClause?.isTypeOnly)continue;
    const specifier=node.moduleSpecifier.text;if(!specifier.startsWith('.')||skip.includes(specifier))continue;
    const named=node.importClause?.namedBindings,values=[];
    if(node.importClause?.name)values.push([node.importClause.name.text,'default']);
    if(named&&ts.isNamedImports(named))for(const element of named.elements)if(!element.isTypeOnly)values.push([element.name.text,(element.propertyName??element.name).text]);
    if(!values.length)continue;
    const base=path.resolve(path.dirname(file),specifier),target=[...(/\.(?:json|mjs|js)$/.test(base)?[base]:[]),base+'.ts',path.join(base,'index.ts')].find(candidate=>fs.existsSync(candidate));
    if(!target)throw Error('Unresolved import '+specifier+' of '+relative);
    const exports=load(target);
    for(const [local,name]of values){const value=exports[name];if(value===undefined)throw Error('Missing export '+name+' of '+specifier);bindings[local]=value;}
   }
   return bindings;
  },
 };
}

const nativeAborted=()=>new DOMException('Aborted','AbortError');
/** Fixture NativeSourceClient on the page store: the injected source-read boundary
 * of the managers (painted-map passes the shared native source pool's client).
 * Each acquisition is an actual page-store entry with a ready CPU value, so the
 * manager's own source production, retainParent graph, roles and release run
 * unchanged. `rows(asset)` supplies the fixture's own component objects for the
 * leaf: no bytes are decoded, so the rows keep the identity the tests compare.
 * The fixture's counted, gated reader stays in the manager's shard request. */
export function createFixtureNativeSources({store,city,owner,rows}){
 const ownerKey='fixture-native-source:'+owner;
 const contentKey=asset=>JSON.stringify(['fixture-native-source-v1',city,asset.sha256,asset.bytes,asset.tile_key??asset.path]);
 const stats={acquisitions:0,productions:0,releases:0};
 function result(grant){
  let held=grant;
  const value=()=>{if(!held||held.released||!held.value)throw Error('Fixture native source lease was released');return held.value;};
  const lease={
   get contentKey(){return grant.contentKey;},get role(){return held?.role??grant.role;},
   get raw(){return value().raw;},get verified(){return value().verified;},get physicalBytes(){return value().physicalBytes;},
   get released(){return!held||held.released;},
   borrow(read){return read(value());},
   retain(role='source'){value();return result(held.retain(role));},
   retainResource(role='dependency'){value();return held.retain(role);},
   transfer(role){value();const next=held.retain(role),old=held;held=next;old.release();},
   release(){const old=held;held=undefined;if(old){stats.releases++;old.release();}},
  };
  return lease;
 }
 async function acquire(asset,signal,_vertexCap,role='source'){
  signal.throwIfAborted();stats.acquisitions++;
  const grant=store.acquire({contentKey:contentKey(asset),role,allowRecent:false,
   estimate:{category:'metadata',bytes:512,precision:'estimate',label:'fixture native source descriptor'},
   produce:context=>{context.signal.throwIfAborted();stats.productions++;const components=rows(asset);return{physicalBytes:asset.bytes,verified:{},raw:{schema_version:1,city,components,decodedPayloadCost:{typedBufferBytes:0,estimatedJsContainerBytes:128,retainedPayloadEstimateBytes:128}}};},
   costs:value=>({category:'metadata',bytes:128,precision:'estimate',identity:value,label:'fixture native source value'}),
   dispose(value){value.raw.components=[];},
  });
  try{
   await new Promise((resolve,reject)=>{let done=false;const finish=error=>{if(done)return;done=true;signal.removeEventListener('abort',cancel);error===undefined?resolve():reject(error);},cancel=()=>finish(signal.reason??nativeAborted());signal.addEventListener('abort',cancel,{once:true});grant.ready.then(()=>finish(),finish);if(signal.aborted)cancel();});
   signal.throwIfAborted();if(!grant.value)throw nativeAborted();
  }catch(error){grant.release();throw error;}
  return result(grant);
 }
 return{ownerKey,resources:store,stats,acquireResource:request=>store.acquire(request),contentKey,acquire,read:(asset,signal,vertexCap)=>acquire(asset,signal,vertexCap,'source'),setCached(){},destroy(){}};
}
