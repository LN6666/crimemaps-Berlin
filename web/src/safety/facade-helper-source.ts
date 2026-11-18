import type {ResourceBudget,ResourceBudgetCost,ResourceBudgetPressure,ResourceBudgetReservation,ResourceBudgetTryReserveResult} from './render-runtime/resource-budget';

/** One rename-and-wrap helper: prefix + the input with its first `search`
 * replaced by the literal `replacement` + suffix. The same frozen descriptor
 * emits the text and, without emitting it, gives its exact character count. */
export type FacadeHelperTemplate=Readonly<{authority:string;search:string;replacement:string;missingInput:string;prefix:string;suffix:string}>;
function helperTemplate(value:FacadeHelperTemplate):FacadeHelperTemplate{
 // A '$' would let String.prototype.replace expand a substitution pattern and
 // make the output length depend on the input. Every replacement is literal.
 if(!value.search||value.replacement.includes('$'))throw new TypeError('Facade helper replacement must be a literal rename');
 return Object.freeze({...value});
}
/** Existing wall/roof/source colours stay intact; official CC0 windows are a display overlay only. */
export const OPEN_FACADE_SURFACE_HELPER=helperTemplate({authority:'open-facade-window-overlay-v1',search:'vec3 sourceFacade(',replacement:'vec3 sourceFacadeFallback(',missingInput:'Expected source material facade function',prefix:`uniform sampler2D u_source_window_texture;
uniform float u_source_window_ready;
`,suffix:`
vec3 sourceFacade(vec3 base,vec3 p,vec3 normal,float material,float hasWindows){
 vec3 wallBase=sourceFacadeFallback(base,p,normal,material,u_source_window_ready>.5?0.:hasWindows);
 if(u_source_window_ready<.5)return wallBase;
 float wall=1.-smoothstep(.18,.42,abs(normal.y));
 vec2 metres=vec2(abs(normal.x)>abs(normal.z)?p.z:p.x,p.y);
 float detail=1.-smoothstep(.35,.8,max(length(fwidth(metres)),.0001));
 // Official style repeat is2.5m. Arrangement is schematic, never source floors/tenants.
 vec2 uv=(metres-vec2(0.,.65))/2.5;
 vec4 windows=texture(u_source_window_texture,uv);
 float coverage=windows.a*wall*hasWindows*detail*step(.8,p.y);
 float light=.63+.37*max(0.,dot(normalize(normal),normalize(vec3(-.35,.8,.4))));
 return mix(wallBase,windows.rgb*light,coverage);
}
`});
/** Compose before the existing officialwindow helper; roof/source colours and allsource facts stay separate. */
export const OPEN_FACADE_DIFFUSE_HELPER=helperTemplate({authority:'open-facade-diffuse-composite-v1',search:'vec3 sourceFacade(',replacement:'vec3 sourceFacadeWithoutDiffuse(',missingInput:'Expectedsource facade helper',prefix:`uniform sampler2D u_source_plaster_diffuse;uniform sampler2D u_source_brick_diffuse;
uniform float u_source_plaster_ready;uniform float u_source_brick_ready;
`,suffix:`
vec3 sourceFacade(vec3 base,vec3 p,vec3 normal,float material,float hasWindows){
 float wall=1.-smoothstep(.18,.42,abs(normal.y));
 vec2 metres=vec2(abs(normal.x)>abs(normal.z)?p.z:p.x,p.y);
 float detail=1.-smoothstep(.35,.8,max(length(fwidth(metres)),.0001));
 float roof=step(32.,v_style);float ready=0.;vec3 albedo=vec3(1.);
 if(material>.5&&material<1.5){ready=u_source_brick_ready;albedo=texture(u_source_brick_diffuse,metres/1.4).rgb;}
 else if(material<.5||(material>2.5&&material<4.5)){ready=u_source_plaster_ready;albedo=texture(u_source_plaster_diffuse,metres/2.5).rgb;}
 // Actualpixel luminance controls grain/mortar; incomingnativecolour hue is not overwritten.
 ready*=1.-roof;
 float luminance=dot(albedo,vec3(.2126,.7152,.0722));
 float reference=(material>.5&&material<1.5)?.50:.78;
 vec3 diffuse=base*clamp(luminance/reference,.65,1.30);
 vec3 beforeWindows=mix(base,diffuse,ready*wall*detail);
 return sourceFacadeWithoutDiffuse(beforeWindows,p,normal,ready>.5?0.:material,hasWindows);
}
`});
// The diffuse helper renames the window helper's own wrapper, so it can reuse
// that one surface string and can never reject it.
if(!OPEN_FACADE_SURFACE_HELPER.suffix.includes(OPEN_FACADE_DIFFUSE_HELPER.search))throw Error('Facade diffuse helper must wrap the window helper');

const emissions=new Map<FacadeHelperTemplate,number>();
/** The only emitter of both helpers; openFacade*Fragment delegate here. */
export function emitFacadeHelper(helper:FacadeHelperTemplate,existing:string):string{
 if(!existing.includes(helper.search))throw Error(helper.missingInput);
 emissions.set(helper,(emissions.get(helper)??0)+1);
 return helper.prefix+existing.replace(helper.search,helper.replacement)+helper.suffix;
}
function characters(value:number,label:string){if(!Number.isSafeInteger(value)||value<0)throw new RangeError('Invalid facade helper '+label);return value;}
/** Exact length of emitFacadeHelper(helper,input) for an input containing helper.search. */
export function facadeHelperCharacters(helper:FacadeHelperTemplate,inputCharacters:number):number{
 if(characters(inputCharacters,'input characters')<helper.search.length)throw new RangeError('Facade helper input cannot contain its renamed function');
 return characters(helper.prefix.length+inputCharacters-helper.search.length+helper.replacement.length+helper.suffix.length,'output characters');
}

export type FacadeHelperSourceBounds=Readonly<{
 baseCharacters:number;surfaceCharacters:number;diffuseCharacters:number;
 /** Both helper results, alive for the complete lease. */
 residentCharacters:number;
 /** Generation only: each rename result and its prefix concatenation, counted
  * as simultaneously live flat text until generation returns. */
 constructionCharacters:number;
 /** Logical UTF-16 bytes, not engine heap; one-byte strings may be smaller. */
 residentBytes:number;constructionBytes:number;
 authorityTrace:readonly string[];
}>;
/** Describes the shared surface helper S(base) and diffuse helper D(S) without emitting either. */
export function describeFacadeHelperSource(baseSurfaceFragment:string):FacadeHelperSourceBounds{
 if(typeof baseSurfaceFragment!=='string')throw new TypeError('Facade helper base must be a string');
 const surface=OPEN_FACADE_SURFACE_HELPER,diffuse=OPEN_FACADE_DIFFUSE_HELPER;
 // The emitter's own precondition, checked before any reservation.
 if(!baseSurfaceFragment.includes(surface.search))throw Error(surface.missingInput);
 const base=baseSurfaceFragment.length,surfaceCharacters=facadeHelperCharacters(surface,base),diffuseCharacters=facadeHelperCharacters(diffuse,surfaceCharacters);
 const renamed=(helper:FacadeHelperTemplate,input:number)=>input-helper.search.length+helper.replacement.length;
 const constructionCharacters=characters(renamed(surface,base)+surface.prefix.length+renamed(surface,base)+renamed(diffuse,surfaceCharacters)+diffuse.prefix.length+renamed(diffuse,surfaceCharacters),'construction characters');
 const residentCharacters=characters(surfaceCharacters+diffuseCharacters,'resident characters');
 return Object.freeze({baseCharacters:base,surfaceCharacters,diffuseCharacters,residentCharacters,constructionCharacters,residentBytes:characters(2*residentCharacters,'resident bytes'),constructionBytes:characters(2*constructionCharacters,'construction bytes'),authorityTrace:Object.freeze([surface.authority,diffuse.authority,'diffuse-wraps-the-single-surface-emission','logical-utf16-two-bytes-per-character'])});
}

export type FacadeHelperSourceLease=Readonly<{
 /** Byte-identical to openFacadeSurfaceFragment(base). */
 surfaceFragment:string;
 /** Byte-identical to openFacadeDiffuseFragment(openFacadeSurfaceFragment(base)). */
 diffuseFragment:string;
 released:boolean;
 /** Idempotent. The last lease drops both strings and returns the reservation.
  * Call it only once the consumer holding the text is gone (a renderer: after
  * its destroy returned); a teardown that throws keeps its claim charged. */
 release():void;
}>;
/** The helper alone exceeds the page capacity, so waiting could never admit it. */
export class FacadeHelperSourceUnfitError extends Error{
 readonly code='FACADE_HELPER_SOURCE_UNFIT';
 readonly requiredBytes:number;readonly capacityBytes:number;
 constructor(requiredBytes:number,capacityBytes:number){
  super('Facade helper source needs '+requiredBytes+' logical bytes, more than the page budget capacity '+capacityBytes);
  this.name='FacadeHelperSourceUnfitError';this.requiredBytes=requiredBytes;this.capacityBytes=capacityBytes;
 }
}
type Waiter={resolve:(lease:FacadeHelperSourceLease)=>void;reject:(error:unknown)=>void;owner:string|undefined;signal:AbortSignal|undefined;abort:(()=>void)|undefined};
type Entry={
 budget:ResourceBudget;base:string;bounds:FacadeHelperSourceBounds;identities:Readonly<{text:object;scratch:object}>;
 state:'waiting'|'ready'|'released'|'cancelled'|'failed';surface:string|undefined;diffuse:string|undefined;
 reservation:ResourceBudgetReservation|undefined;leases:number;owners:Map<string,number>;waiters:Set<Waiter>;
 stopAvailable:(()=>void)|undefined;retryQueued:boolean;cancel:AbortController;pressure:ResourceBudgetPressure|undefined;
};
// One entry per page budget and exact base text. Entries hold no text before
// admission and are removed when cancelled, failed or finally released.
const registries=new WeakMap<ResourceBudget,Map<string,Entry>>();
const ownerLabel=(owner:unknown)=>typeof owner==='string'&&owner?owner.slice(0,128):undefined;
const abortReason=(signal:AbortSignal)=>signal.reason??new DOMException('Aborted','AbortError');
function helperCosts(entry:Entry,generating:boolean):readonly ResourceBudgetCost[]{
 const resident:ResourceBudgetCost={category:'program-source',bytes:entry.bounds.residentBytes,precision:'estimate',identity:entry.identities.text,label:'facade surface+diffuse helper text: '+entry.bounds.residentCharacters+' exact characters as logical UTF-16'};
 return generating?[resident,{category:'construction',bytes:entry.bounds.constructionBytes,precision:'estimate',identity:entry.identities.scratch,label:'facade helper rename/concat temporaries: '+entry.bounds.constructionCharacters+' characters as logical UTF-16'}]:[resident];
}
function unregister(entry:Entry){const entries=registries.get(entry.budget);if(entries?.get(entry.base)===entry)entries.delete(entry.base);if(entries&&!entries.size)registries.delete(entry.budget);}
function stopWaiting(entry:Entry){const stop=entry.stopAvailable;entry.stopAvailable=undefined;stop?.();}
function detach(waiter:Waiter){const signal=waiter.signal,abort=waiter.abort;waiter.signal=undefined;waiter.abort=undefined;if(signal&&abort)signal.removeEventListener('abort',abort);}
function cancel(entry:Entry){if(entry.state!=='waiting')return;entry.state='cancelled';stopWaiting(entry);entry.cancel.abort();unregister(entry);}
function fail(entry:Entry,error:unknown){
 entry.state='failed';stopWaiting(entry);entry.cancel.abort();unregister(entry);entry.surface=undefined;entry.diffuse=undefined;
 const waiters=[...entry.waiters];entry.waiters.clear();for(const waiter of waiters){detach(waiter);waiter.reject(error);}
}
function drop(entry:Entry){
 entry.state='released';entry.surface=undefined;entry.diffuse=undefined;unregister(entry);
 const reservation=entry.reservation;entry.reservation=undefined;reservation?.release();
}
function grant(entry:Entry,owner:string|undefined):FacadeHelperSourceLease{
 entry.leases++;if(owner)entry.owners.set(owner,(entry.owners.get(owner)??0)+1);
 let released=false;
 const text=(value:string|undefined)=>{if(released||value===undefined)throw Error('Facade helper source lease was released');return value;};
 return Object.freeze({
  get surfaceFragment(){return text(entry.surface);},
  get diffuseFragment(){return text(entry.diffuse);},
  get released(){return released;},
  release(){
   if(released)return;released=true;
   if(owner){const remaining=(entry.owners.get(owner)??1)-1;if(remaining>0)entry.owners.set(owner,remaining);else entry.owners.delete(owner);}
   if(--entry.leases===0)drop(entry);
  },
 });
}
function waitForCapacity(entry:Entry){
 if(entry.stopAvailable)return;
 // Availability is a wake-up hint: one deferred retry per wave, no timer or loop.
 entry.stopAvailable=entry.budget.onAvailable(()=>{
  if(entry.retryQueued||entry.state!=='waiting')return;entry.retryQueued=true;
  queueMicrotask(()=>{entry.retryQueued=false;attempt(entry);});
 },entry.cancel.signal);
}
function emitShared(entry:Entry){
 const surface=emitFacadeHelper(OPEN_FACADE_SURFACE_HELPER,entry.base),diffuse=emitFacadeHelper(OPEN_FACADE_DIFFUSE_HELPER,surface);
 if(surface.length!==entry.bounds.surfaceCharacters||diffuse.length!==entry.bounds.diffuseCharacters)throw new RangeError('Facade helper source differs from its exact reserved length');
 return{surface,diffuse};
}
function attempt(entry:Entry){
 if(entry.state!=='waiting')return;
 if(!entry.waiters.size){cancel(entry);return;}
 let admitted:ResourceBudgetTryReserveResult;
 try{admitted=entry.budget.tryReserve(helperCosts(entry,true),{label:'facade surface/diffuse helper source'});}catch(error){fail(entry,error);return;}
 if(!admitted.ok){entry.pressure=admitted.error.details;waitForCapacity(entry);return;}
 stopWaiting(entry);
 const reservation=admitted.reservation;let emitted:ReturnType<typeof emitShared>;
 try{emitted=emitShared(entry);}catch(error){reservation.release();fail(entry,error);return;}
 entry.state='ready';entry.surface=emitted.surface;entry.diffuse=emitted.diffuse;entry.reservation=reservation;entry.pressure=undefined;
 const waiters=[...entry.waiters];entry.waiters.clear();
 const leases=waiters.map(waiter=>{detach(waiter);return grant(entry,waiter.owner);});
 // Rename/concat temporaries are now unreachable from this owner. A decrease
 // cannot be refused; were it refused, the larger claim would simply remain.
 reservation.adjust(helperCosts(entry,false));
 waiters.forEach((waiter,i)=>waiter.resolve(leases[i]));
}
function leave(entry:Entry,waiter:Waiter){
 if(!entry.waiters.delete(waiter))return;detach(waiter);
 if(entry.state==='waiting'&&!entry.waiters.size)cancel(entry);
}
/**
 * Leases the surface helper S(base) and diffuse helper D(S) from the page budget.
 * Both resident text and generation temporaries are reserved before either is
 * emitted. Short budget waits on availability and the caller's signal; work
 * nobody waits for any longer is cancelled; a helper above total capacity is
 * rejected as unfit. One emission per budget and base is shared by every lease.
 */
export function acquireFacadeHelperSource(options:{budget:ResourceBudget;baseSurfaceFragment:string;signal?:AbortSignal;owner?:string}):Promise<FacadeHelperSourceLease>{
 const {budget,baseSurfaceFragment:base,signal}=options,owner=ownerLabel(options.owner);
 if(signal?.aborted)return Promise.reject(abortReason(signal));
 if(!budget||typeof budget.tryReserve!=='function'||typeof budget.onAvailable!=='function')return Promise.reject(new TypeError('Facade helper source requires the page resource budget'));
 let entries=registries.get(budget),entry=entries?.get(base);
 if(entry?.state==='ready')return Promise.resolve(grant(entry,owner));
 let created=false;
 if(!entry){
  let bounds:FacadeHelperSourceBounds;
  try{bounds=describeFacadeHelperSource(base);}catch(error){return Promise.reject(error);}
  const required=bounds.residentBytes+bounds.constructionBytes,capacity=budget.stats.limitBytes;
  if(required>capacity)return Promise.reject(new FacadeHelperSourceUnfitError(required,capacity));
  entry={budget,base,bounds,identities:Object.freeze({text:{},scratch:{}}),state:'waiting',surface:undefined,diffuse:undefined,reservation:undefined,leases:0,owners:new Map(),waiters:new Set(),stopAvailable:undefined,retryQueued:false,cancel:new AbortController(),pressure:undefined};
  if(!entries){entries=new Map();registries.set(budget,entries);}
  entries.set(base,entry);created=true;
 }
 const pending=entry;
 return new Promise<FacadeHelperSourceLease>((resolve,reject)=>{
  const waiter:Waiter={resolve,reject,owner,signal,abort:undefined};
  if(signal){const abort=()=>{leave(pending,waiter);reject(abortReason(signal));};waiter.abort=abort;signal.addEventListener('abort',abort,{once:true});}
  pending.waiters.add(waiter);
  if(created)attempt(pending);
 });
}

export type FacadeHelperSourceEntryStats=Readonly<{
 state:Entry['state'];leases:number;waiters:number;owners:readonly string[];waitingOwners:readonly string[];waitingForBudget:boolean;
 baseCharacters:number;surfaceCharacters:number;diffuseCharacters:number;residentBytes:number;constructionBytes:number;reservedBytes:number;
 lastPressure:ResourceBudgetPressure|undefined;
}>;
/** Logical text accounting for one page budget plus process-wide emission counts. */
export function facadeHelperSourceStats(budget?:ResourceBudget){
 const rows=budget?[...(registries.get(budget)?.values()??[])]:[];
 return Object.freeze({
  entries:Object.freeze(rows.map((entry):FacadeHelperSourceEntryStats=>Object.freeze({state:entry.state,leases:entry.leases,waiters:entry.waiters.size,owners:Object.freeze([...entry.owners.keys()]),waitingOwners:Object.freeze([...entry.waiters].flatMap(waiter=>waiter.owner?[waiter.owner]:[])),waitingForBudget:!!entry.stopAvailable,baseCharacters:entry.bounds.baseCharacters,surfaceCharacters:entry.bounds.surfaceCharacters,diffuseCharacters:entry.bounds.diffuseCharacters,residentBytes:entry.bounds.residentBytes,constructionBytes:entry.bounds.constructionBytes,reservedBytes:entry.reservation?.bytes??0,lastPressure:entry.pressure}))),
  emissions:Object.freeze({surface:emissions.get(OPEN_FACADE_SURFACE_HELPER)??0,diffuse:emissions.get(OPEN_FACADE_DIFFUSE_HELPER)??0}),
  accounting:'logical-utf16-text-not-physical-memory' as const,
 });
}
