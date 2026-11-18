import {createCurvatureProof} from './green-proof-curvature.mjs';
import {createDisplayFloat64CurvatureProof} from './green-proof-display-float64-curvature.mjs';
import {withGroundProofWorkBudget} from './ground-proof-work-budget';
import {certifiedGroundProjection,certifiedGroundProjectionConstants} from './ground-projection';
import {analyzeIntervalSubdivision} from './green-proof-interval.mjs';
import type {SceneSolarLight} from './scene-solar-light';
import {getPageResourceBudget,ResourceBudgetExceededError,type ResourceBudget,type ResourceBudgetCost,type ResourceBudgetReservation} from './render-runtime/resource-budget';
export type SolarBoundaryGeometry = {type:'Polygon'|'MultiPolygon';coordinates:number[][][]|number[][][][]};
export type SolarShadowBoundary = {boundarySHA256:string;geometry:SolarBoundaryGeometry};
type Box = readonly [number,number,number,number];
export type PreparedSolarBoundary = {boundarySHA256:string;covers:(box:Box)=>boolean;vertices:number};
const preparedProofBudgets=new WeakMap<PreparedSolarBoundary,ResourceBudget>();
type BoundaryEdges=(box:readonly number[],visit:(ax:number,ay:number,bx:number,by:number)=>boolean)=>boolean;
const preparedProofEdges=new WeakMap<PreparedSolarBoundary,BoundaryEdges>();
export class GroundProofBudgetBindingError extends Error {
 readonly retryable=true;readonly code='GROUND_PROOF_BUDGET_BINDING_UNAVAILABLE';
 constructor(){super('Deep ground proof requires its actual prepared boundary budget');this.name='GroundProofBudgetBindingError';}
}
/** Prove a projected triangle by a bounded subdivision of conservative boxes.
 * Only the proof is subdivided: source vertices, rendered Float32 triangles and
 * municipality geometry are never changed. Every leaf must be covered; contact,
 * crossing or exhausted work remains refused. Used only after the fast box test.
 * Longest-edge bisection partitions the triangle exactly in projected space. */
function baselineCoversProjectedGroundTriangle(boundary:PreparedSolarBoundary, geographicBox:(box:readonly number[])=>Box,
  ax:number,ay:number,bx:number,by:number,cx:number,cy:number):boolean {
  // More proof work only: retain depth 12, the same outward padding and
  // the exact geographic boundary predicate. Exhaustion still refuses.
  let remaining=511;
  const visit=(ax:number,ay:number,bx:number,by:number,cx:number,cy:number,depth:number):boolean=>{
    if(--remaining<0)return false;
    // Outward padding covers midpoint roundoff over the bounded recursion.
    const pad=32*Number.EPSILON*Math.max(1,Math.abs(ax),Math.abs(ay),Math.abs(bx),Math.abs(by),Math.abs(cx),Math.abs(cy));
    if(boundary.covers(geographicBox([Math.min(ax,bx,cx)-pad,Math.min(ay,by,cy)-pad,Math.max(ax,bx,cx)+pad,Math.max(ay,by,cy)+pad])))return true;
    if(depth===0)return false;
    const ab=(ax-bx)**2+(ay-by)**2,bc=(bx-cx)**2+(by-cy)**2,ca=(cx-ax)**2+(cy-ay)**2;
    if(ab>=bc&&ab>=ca){const x=(ax+bx)/2,y=(ay+by)/2;return visit(ax,ay,x,y,cx,cy,depth-1)&&visit(x,y,bx,by,cx,cy,depth-1);}
    if(bc>=ca){const x=(bx+cx)/2,y=(by+cy)/2;return visit(ax,ay,bx,by,x,y,depth-1)&&visit(ax,ay,x,y,cx,cy,depth-1);}
    const x=(cx+ax)/2,y=(cy+ay)/2;return visit(ax,ay,bx,by,x,y,depth-1)&&visit(x,y,bx,by,cx,cy,depth-1);
  };
  return [ax,ay,bx,by,cx,cy].every(Number.isFinite)&&visit(ax,ay,bx,by,cx,cy,12);
}

/** Preserve original511 PASS; only the internally bound original projection
 * may use the deterministic additional4095/depth18 geographic interval proof. */
type GroundTriangleDiagnostic={accepted:boolean;triangle:readonly number[];branch:string;reason:string;deep?:{visits:number;maxDepth?:number;reason:string;allBoxesCovered:boolean;geographicProjectionCertified?:boolean}};
let triangleDiagnostics:{calls:number;firstRejected:GroundTriangleDiagnostic|null;last:GroundTriangleDiagnostic|null}={calls:0,firstRejected:null,last:null};
let triangleDiagnosticsEnabled=false;
/** Private proof tools opt in by resetting; production callers leave recording off. */
export function resetGroundProofDiagnostics(enabled=true){triangleDiagnosticsEnabled=enabled;triangleDiagnostics={calls:0,firstRejected:null,last:null};}
export function readGroundProofDiagnostics(){return {...triangleDiagnostics};}
function recordGroundProofDiagnostic(value:GroundTriangleDiagnostic){triangleDiagnostics.calls++;triangleDiagnostics.last=value;if(!value.accepted&&!triangleDiagnostics.firstRejected)triangleDiagnostics.firstRejected=value;}
export function coversProjectedGroundTriangle(boundary:PreparedSolarBoundary,geographicBox:(box:readonly number[])=>Box,
 ax:number,ay:number,bx:number,by:number,cx:number,cy:number):boolean {
 if(baselineCoversProjectedGroundTriangle(boundary,geographicBox,ax,ay,bx,by,cx,cy)){if(triangleDiagnosticsEnabled)recordGroundProofDiagnostic({accepted:true,triangle:[ax,ay,bx,by,cx,cy],branch:'baseline',reason:'unchanged-baseline-covered'});return true;}
 const createCertified=certifiedGroundProjection(boundary.boundarySHA256,geographicBox);if(!createCertified){if(triangleDiagnosticsEnabled)recordGroundProofDiagnostic({accepted:false,triangle:[ax,ay,bx,by,cx,cy],branch:'after-baseline',reason:'certified-projection-unavailable'});return false;}
 const budget=preparedProofBudgets.get(boundary);if(!budget)throw new GroundProofBudgetBindingError();
 {
  const constants=certifiedGroundProjectionConstants(boundary.boundarySHA256,geographicBox),boundaryEdges=preparedProofEdges.get(boundary);
  if(!constants||!boundaryEdges)throw new GroundProofBudgetBindingError();
  const triangle=[ax,ay,bx,by,cx,cy];
  const proof=createCurvatureProof({boundaryEdges,boundary,constants,budget})(triangle);
  const accepted=proof.accepted===true;
  if(triangleDiagnosticsEnabled)recordGroundProofDiagnostic({accepted,triangle,branch:'deep',reason:proof.reason,deep:{visits:proof.visits,maxDepth:proof.maxDepth,reason:proof.reason,allBoxesCovered:proof.accepted,geographicProjectionCertified:true}});
  return accepted;
 }
}

/** Explicit DISPLAY-F64 proof, never reached by local-F32 green production. */
export function coversOriginalDisplayFloat64GroundTriangle(boundary:PreparedSolarBoundary,geographicBox:(box:readonly number[])=>Box,
 ax:number,ay:number,bx:number,by:number,cx:number,cy:number):boolean {
 if(baselineCoversProjectedGroundTriangle(boundary,geographicBox,ax,ay,bx,by,cx,cy)){if(triangleDiagnosticsEnabled)recordGroundProofDiagnostic({accepted:true,triangle:[ax,ay,bx,by,cx,cy],branch:'baseline-original-display-f64',reason:'unchanged-baseline-covered'});return true;}
 const createCertified=certifiedGroundProjection(boundary.boundarySHA256,geographicBox);if(!createCertified){if(triangleDiagnosticsEnabled)recordGroundProofDiagnostic({accepted:false,triangle:[ax,ay,bx,by,cx,cy],branch:'original-display-f64',reason:'certified-projection-unavailable'});return false;}
 const budget=preparedProofBudgets.get(boundary);if(!budget)throw new GroundProofBudgetBindingError();
 {
  const constants=certifiedGroundProjectionConstants(boundary.boundarySHA256,geographicBox),boundaryEdges=preparedProofEdges.get(boundary);
  if(!constants||!boundaryEdges)throw new GroundProofBudgetBindingError();
  const triangle=[ax,ay,bx,by,cx,cy];
  const proof=createDisplayFloat64CurvatureProof({boundaryEdges,boundary,constants,budget})(triangle);
  const accepted=proof.accepted===true;
  if(triangleDiagnosticsEnabled)recordGroundProofDiagnostic({accepted,triangle,branch:'deep-original-display-f64',reason:proof.reason,deep:{visits:proof.visits,maxDepth:proof.maxDepth,reason:proof.reason,allBoxesCovered:proof.accepted,geographicProjectionCertified:true}});
  return accepted;
 }
}

/** Retained index of one verified boundary, in ONE ArrayBuffer whose exact size
 * is known before it is allocated: Float64 edges (32 B per edge) and ring boxes
 * (32 B per ring), then Uint32 per-ring 64-bucket offsets (65 x 4 B per ring),
 * bucket edge ids (4 B per bucket membership) and polygon ring starts (4 B per
 * polygon + 4 B). Closures and typed-array views are a small documented estimate.
 * Under the 200000-vertex validation cap the index is at most 288 B per vertex
 * plus 4 B per ring and polygon (about 55.2 MiB), below every page profile limit. */
export const SOLAR_BOUNDARY_INDEX_MODEL=Object.freeze({edgeBytes:32,ringBoxBytes:32,ringBucketOffsetBytes:65*4,bucketEntryBytes:4,polygonRingStartBytes:4,wrapperEstimateBytes:2048});
/** Even an index larger than the whole page ledger cannot be admitted by waiting. */
export class SolarShadowBoundaryUnfitError extends Error{
  readonly code='SOLAR_BOUNDARY_UNFIT';
  readonly retryable=false;
  constructor(readonly boundarySHA256:string,readonly requiredBytes:number,readonly limitBytes:number){
    super(('Verified solar boundary index requires '+requiredBytes+' logical bytes, above the page budget limit '+limitBytes).slice(0,1024));
    this.name='SolarShadowBoundaryUnfitError';
  }
}
/** Why a hand-off claim (admitSolarShadowBoundary / tryAdmitSolarShadowBoundary
 * `claim`) was not taken as the index's admission:
 * - 'inactive': the claim was already released;
 * - 'bytes': it does not hold exactly solarShadowBoundaryIndexBytes(value) +
 *   SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
 * - 'shared': taking the index identities needed new capacity: its identities
 *   are also charged by another claim, so the re-identified claim grew the
 *   ledger, or its growth ran the pressure callbacks (even when an eviction
 *   then made the total come out unchanged);
 * - 'ledger': it is not a reservation of the admitting ledger (options.budget).
 * 'inactive' and 'bytes' leave everything as it was. A claim is re-identified
 * in place before 'shared' or 'ledger' can be known, so those two are detected,
 * not prevented: 'shared' may already have grown the ledger or run its pressure
 * callbacks (which may have evicted recent entries of other owners), and the
 * claim's own ledger saw the same re-identification. Membership is tested with
 * a zero-byte probe, so 'ledger' reserves, evicts and wakes nothing on the
 * admitting ledger. These are caller programming errors: give the hand-off a
 * reservation of the admitting ledger that charges its identities alone, made
 * in the documented order, rather than relying on 'shared' to catch a wrong
 * order. */
export type SolarBoundaryClaimRefusal='inactive'|'bytes'|'shared'|'ledger';
/** A hand-off claim the module cannot take. Nothing was allocated, cached or
 * kept by the module; the claim is still the caller's to release ('shared' and
 * 'ledger' may have left it holding the index identities, plus one zero-byte
 * probe identity, at the same claim bytes; see SolarBoundaryClaimRefusal). */
export class SolarShadowBoundaryClaimError extends Error{
  readonly code='SOLAR_BOUNDARY_CLAIM_MISMATCH';
  readonly retryable=false;
  constructor(readonly boundarySHA256:string,readonly reason:SolarBoundaryClaimRefusal,readonly requiredBytes:number,readonly claimBytes:number){
    super(('Solar boundary index hand-off claim refused ('+reason+'): '+(reason==='inactive'?'the claim is no longer active':reason==='bytes'?'it holds '+claimBytes+' logical bytes, the index needs exactly '+requiredBytes+' (index bytes plus the wrapper estimate)':reason==='shared'?'its allocation identities are also charged by another claim, so taking it would add '+requiredBytes+' bytes instead of keeping them':'it is not a reservation of the admitting ledger')).slice(0,1024));
    this.name='SolarShadowBoundaryClaimError';
  }
}
/** What a refused synchronous preparation does.
 * - 'throw' (strict): nothing is allocated or cached and the ledger's
 *   ResourceBudgetExceededError propagates. admitSolarShadowBoundary waits instead;
 *   tryAdmitSolarShadowBoundary is this policy for production callers.
 * - 'charge-later' (the default): for the existing synchronous callers, which
 *   cannot wait and whose 3D/environment state machines must not fail after they
 *   commit their manifest. The index is still built, reported as over budget in
 *   solarShadowBoundaryCacheStats, and charged at the first ledger wake-up whose
 *   free plus reclaimable bytes can hold it. Callers that await
 *   admitSolarShadowBoundary first only ever hit the admitted cache entry here. */
export type SolarBoundaryRefusal='throw'|'charge-later';
type CacheEntry = {prepared:PreparedSolarBoundary;claim:ResourceBudgetReservation|undefined;costs:readonly ResourceBudgetCost[];budget:ResourceBudget;required:number;label:string;charge:AbortController|undefined};
const cache = new Map<string,CacheEntry>();
const preparedCosts = new WeakMap<PreparedSolarBoundary,readonly ResourceBudgetCost[]>();
let overBudgetPreparations=0,lateCharges=0,deferredWakeups=0,lastOverBudget:string|undefined;
// strictRefusals: every refused strict admission attempt, i.e. each refused
// tryAdmitSolarShadowBoundary and each refused attempt of a waiting
// admitSolarShadowBoundary (one per wake-up retry); tryAdmitRefusals: the
// refusals thrown to tryAdmitSolarShadowBoundary callers alone.
let strictRefusals=0,tryAdmitRefusals=0,handOvers=0,handOverRefusals=0,cachedWakeups=0;
/** Reuse only a polygon already admitted by the source loader in this module. */
export const currentSolarShadowBoundary = (boundarySHA256:string) => cache.get(boundarySHA256)?.prepared;
type CachedListener={notify:(()=>void)|undefined};
const cachedListeners=new Map<string,Set<CachedListener>>();
function callCached(listener:CachedListener){const notify=listener.notify;if(!notify)return;cachedWakeups++;try{notify();}catch{/* one listener cannot stop the others */}}
/** A hash entering the cache is reported to its subscribers once the inserting
 * call has returned (a microtask), never by a timer or a ledger wave. */
function wakeCached(sha:string){
  if(!cachedListeners.get(sha)?.size)return;
  queueMicrotask(()=>{for(const listener of [...(cachedListeners.get(sha)??[])])callCached(listener);});
}
/** Subscribes `notify` to `boundarySHA256` entering the module cache: it is
 * called in a microtask after each insertion returns (tryAdmit, a hand-off, an
 * admitted or a legacy synchronous preparation), and once if the hash is already
 * cached when subscribing, so a check-then-subscribe order cannot lose it. An
 * insertion runs no ledger availability wave (a hand-off moves no byte, an
 * admission adds bytes), so a waiter whose wait ends once that hash is cached
 * (e.g. a manager's `satisfied`) subscribes here beside its ledger wait. No
 * timer, no polling; the notification is a hint, so re-check
 * currentSolarShadowBoundary when it arrives. Returns the unsubscribe; an
 * aborted signal unsubscribes too. Every subscription must end (unsubscribe or
 * abort) once its wait ends. */
export function onSolarShadowBoundaryCached(boundarySHA256:string,notify:()=>void,signal?:AbortSignal):()=>void{
  if(typeof boundarySHA256!=='string'||!/^[a-f0-9]{64}$/.test(boundarySHA256))throw new TypeError('A solar boundary cache subscription needs a verified boundary hash');
  if(typeof notify!=='function')throw new TypeError('Solar boundary cache callback must be a function');
  if(signal&&(typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'||typeof signal.aborted!=='boolean'))throw new TypeError('Solar boundary cache signal must be an AbortSignal');
  if(signal?.aborted)return()=>{};
  const listener:CachedListener={notify};
  let listeners=cachedListeners.get(boundarySHA256);if(!listeners){listeners=new Set();cachedListeners.set(boundarySHA256,listeners);}listeners.add(listener);
  const off=()=>{
    if(!listener.notify)return;listener.notify=undefined;signal?.removeEventListener('abort',off);
    const current=cachedListeners.get(boundarySHA256);if(current){current.delete(listener);if(!current.size)cachedListeners.delete(boundarySHA256);}
  };
  signal?.addEventListener('abort',off,{once:true});
  if(cache.has(boundarySHA256))queueMicrotask(()=>callCached(listener));
  return off;
}
/** The page-ledger costs of one prepared boundary, under identities that belong
 * to that prepared index alone. The module cache holds one claim while the
 * boundary is cached. A holder that keeps the boundary beyond the cache can
 * include these SAME costs in its own claim, so the ledger counts the index once
 * and keeps it charged until its last holder releases. Production holders (the
 * environment manager and the building renderers) do not include them yet; on a
 * single-city page at most two boundary hashes exist (3D and environment), so the
 * two-entry FIFO cache does not evict there. */
export function solarShadowBoundaryCosts(prepared:PreparedSolarBoundary|undefined):readonly ResourceBudgetCost[]{return prepared?preparedCosts.get(prepared)??[]:[];}
export function solarShadowBoundaryCacheStats(){
  let claimedBytes=0,unchargedBytes=0,pendingCharges=0;
  for(const entry of cache.values()){if(entry.claim?.active)claimedBytes+=entry.claim.bytes;else{unchargedBytes+=entry.required;if(entry.charge)pendingCharges++;}}
  let cacheSubscribers=0;for(const listeners of cachedListeners.values())cacheSubscribers+=listeners.size;
  return Object.freeze({entries:cache.size,claimedBytes,unchargedBytes,pendingCharges,overBudgetPreparations,lateCharges,deferredWakeups,lastOverBudget,maxEntries:2,strictRefusals,tryAdmitRefusals,handOvers,handOverRefusals,cachedWakeups,cacheSubscribers,
    measurement:'logical index bytes admitted on the page ResourceBudget before allocation; a refused legacy synchronous preparation is built over budget, counted in unchargedBytes and charged at the first wake-up that fits; source GeoJSON is charged by its reader'});
}
const bucketOf = (y:number,south:number,north:number) => Math.max(0,Math.min(63,Math.floor((y-south)/Math.max(1e-12,north-south)*64)));
type Plan = {source:readonly (readonly (readonly (readonly number[])[])[])[];polygons:number;rings:number;edges:number;entries:number;vertices:number};
function checkVerified(value:SolarShadowBoundary){
  if(!value||!/^[a-f0-9]{64}$/.test(value.boundarySHA256)||!value.geometry||!['Polygon','MultiPolygon'].includes(value.geometry.type))throw Error('Invalid verified solar boundary');
}
/** Validation and exact sizing. It allocates no index storage and throws the
 * same errors, in the same order, as the boundary preparation always has. */
function planIndex(value:SolarShadowBoundary):Plan {
  let vertices=0,rings=0,edges=0,entries=0;
  const source=value.geometry.type==='Polygon'?[value.geometry.coordinates as number[][][]]:value.geometry.coordinates as number[][][][];
  if(!source.length||source.length>10000)throw Error('Invalid solar boundary polygons');
  source.map(polygon=>{
    if(!Array.isArray(polygon)||!polygon.length)throw Error('Invalid solar boundary polygon');
    return polygon.map(points=>{
      if(!Array.isArray(points)||points.length<4)throw Error('Invalid solar boundary ring');
      const first=points[0],last=points[points.length-1];if(first[0]!==last[0]||first[1]!==last[1])throw Error('Open solar boundary ring');
      let south=Infinity,north=-Infinity;
      for(const p of points){if(!Array.isArray(p)||p.length<2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>85||++vertices>200000)throw Error('Solar boundary vertex budget');south=Math.min(south,p[1]);north=Math.max(north,p[1]);}
      for(let i=0;i<points.length-1;i++){const a=points[i][1],b=points[i+1][1];entries+=bucketOf(Math.max(a,b),south,north)-bucketOf(Math.min(a,b),south,north)+1;}
      rings++;edges+=points.length-1;return 0;
    });
  });
  return {source,polygons:source.length,rings,edges,entries,vertices};
}
const layoutOf = (plan:Plan) => {
  const f64=4*plan.edges+4*plan.rings,u32=65*plan.rings+plan.entries+plan.polygons+1;
  return {f64,u32,bytes:8*f64+4*u32};
};
type Layout = ReturnType<typeof layoutOf>;
/** Exact pre-allocation charge of an index that is not prepared yet. */
export function solarShadowBoundaryIndexBytes(value:SolarShadowBoundary):number{return layoutOf(planIndex(value)).bytes;}
function buildIndex(boundarySHA256:string,plan:Plan,layout:Layout):PreparedSolarBoundary {
  const R=plan.rings,P=plan.polygons,boxBase=4*plan.edges,buffer=new ArrayBuffer(layout.bytes);
  const f64=new Float64Array(buffer,0,layout.f64),u32=new Uint32Array(buffer,8*layout.f64,layout.u32);
  const offsets=u32.subarray(0,65*R),ids=u32.subarray(65*R,65*R+plan.entries),polygonRings=u32.subarray(65*R+plan.entries);
  const cursor=new Uint32Array(64);
  let ring=0,edge=0,entry=0,polygon=0;
  for(const rings of plan.source){
    polygonRings[polygon++]=ring;
    for(const points of rings){
      let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
      for(const p of points){west=Math.min(west,p[0]);east=Math.max(east,p[0]);south=Math.min(south,p[1]);north=Math.max(north,p[1]);}
      const box=boxBase+4*ring,o=65*ring,n=points.length-1;f64[box]=west;f64[box+1]=south;f64[box+2]=east;f64[box+3]=north;
      for(let i=0;i<n;i++){const a=points[i][1],b=points[i+1][1],hi=bucketOf(Math.max(a,b),south,north);for(let j=bucketOf(Math.min(a,b),south,north);j<=hi;j++)offsets[o+1+j]++;}
      offsets[o]=entry;for(let j=0;j<64;j++){offsets[o+1+j]+=offsets[o+j];cursor[j]=offsets[o+j];}
      // Bucket members keep ascending edge order, exactly like the former per-ring arrays.
      for(let i=0;i<n;i++){const a=points[i],b=points[i+1],at=4*(edge+i);f64[at]=a[0];f64[at+1]=a[1];f64[at+2]=b[0];f64[at+3]=b[1];const hi=bucketOf(Math.max(a[1],b[1]),south,north);for(let j=bucketOf(Math.min(a[1],b[1]),south,north);j<=hi;j++)ids[cursor[j]++]=edge+i;}
      entry=offsets[o+64];edge+=n;ring++;
    }
  }
  polygonRings[polygon]=ring;
  if(ring!==R||edge!==plan.edges||entry!==plan.entries||polygon!==P)throw Error('Solar boundary index changed during preparation');
  const inRing=(r:number,x:number,y:number)=>{
    const b=boxBase+4*r,south=f64[b+1],north=f64[b+3];
    if(x<=f64[b]||x>=f64[b+2]||y<=south||y>=north)return false;
    const o=65*r+bucketOf(y,south,north);let inside=false;
    for(let k=offsets[o],end=offsets[o+1];k<end;k++){const at=ids[k]*4,ax=f64[at],ay=f64[at+1],bx=f64[at+2],by=f64[at+3];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;}return inside;
  };
  const contains=(x:number,y:number)=>{
    for(let q=0;q<P;q++){const outer=polygonRings[q],end=polygonRings[q+1];if(!inRing(outer,x,y))continue;let hole=false;for(let r=outer+1;r<end&&!hole;r++)hole=inRing(r,x,y);if(!hole)return true;}
    return false;
  };
  const covers=(box:Box)=>{
    if(box.length!==4||!box.every(Number.isFinite)||box[0]>=box[2]||box[1]>=box[3])return false;
    if(!contains(box[0],box[1])||!contains(box[2],box[1])||!contains(box[2],box[3])||!contains(box[0],box[3]))return false;
    for(let r=0;r<R;r++){
      const b=boxBase+4*r,west=f64[b],south=f64[b+1],east=f64[b+2],north=f64[b+3];
      if(!(box[0]<=east&&box[2]>=west&&box[1]<=north&&box[3]>=south))continue;
      const seen=new Set<number>(),o=65*r,hi=bucketOf(box[3],south,north);
      for(let j=bucketOf(box[1],south,north);j<=hi;j++)for(let k=offsets[o+j],end=offsets[o+j+1];k<end;k++){
        const id=ids[k];if(seen.has(id))continue;seen.add(id);const at=id*4,ax=f64[at],ay=f64[at+1],bx=f64[at+2],by=f64[at+3];
        if(Math.min(ax,bx)<=box[2]&&Math.max(ax,bx)>=box[0]&&Math.min(ay,by)<=box[3]&&Math.max(ay,by)>=box[1]){
          // The segment envelope alone is not an intersection. The remaining
          // separating axis is its normal; strictly separated rectangles are
          // safe. Touching and numerically uncertain cases remain refused.
          const dx=bx-ax,dy=by-ay;
          const x0=box[0]-ax,x1=box[2]-ax,y0=box[1]-ay,y1=box[3]-ay;
          const c0=dx*y0-dy*x0,c1=dx*y0-dy*x1,c2=dx*y1-dy*x0,c3=dx*y1-dy*x1;
          const error=16*Number.EPSILON*(Math.abs(dx)*Math.max(Math.abs(y0),Math.abs(y1))+Math.abs(dy)*Math.max(Math.abs(x0),Math.abs(x1)));
          if(Math.min(c0,c1,c2,c3)>error||Math.max(c0,c1,c2,c3)<-error)continue;
          return false;
        }
      }
    }
    return true;
  };
  const prepared={boundarySHA256,covers,vertices:plan.vertices};
  // Borrow only the already-budgeted private immutable index, never caller geometry.
  const proofEdgeCount=plan.edges;
  preparedProofEdges.set(prepared,(box,visit)=>{
    for(let id=0;id<proofEdgeCount;id++){const at=id*4,ax=f64[at],ay=f64[at+1],bx=f64[at+2],by=f64[at+3];
      if(Math.max(ax,bx)<box[0]||Math.min(ax,bx)>box[2]||Math.max(ay,by)<box[1]||Math.min(ay,by)>box[3])continue;
      if(!visit(ax,ay,bx,by))return false;
    }return true;
  });
  return prepared;
}
/** A retry is worth a reserve call only when free bytes plus bytes a pressure
 * eviction could reclaim (recent cache) can hold the request. Otherwise a reserve
 * would run every pressure evictor for nothing. */
function reclaimableFits(budget:ResourceBudget,bytes:number){const stats=budget.stats;return stats.availableBytes+stats.recentBytes>=bytes;}
function insert(entry:CacheEntry){
  preparedCosts.set(entry.prepared,entry.costs);cache.set(entry.prepared.boundarySHA256,entry);
  while(cache.size>2){const oldest=cache.keys().next().value!,old=cache.get(oldest)!;cache.delete(oldest);old.charge?.abort();old.charge=undefined;old.claim?.release();old.claim=undefined;}
  wakeCached(entry.prepared.boundarySHA256);
}
/** One ledger wake-up registration at a time and no timer: an over-budget index
 * is charged once the ledger can hold it, or never if the cache drops it first. */
function chargeWhenAvailable(entry:CacheEntry){
  const controller=new AbortController();entry.charge=controller;
  entry.budget.onAvailable(()=>{
    if(entry.charge!==controller)return;
    if(!reclaimableFits(entry.budget,entry.required)){deferredWakeups++;return;}
    controller.abort();entry.charge=undefined;
    // Reserve outside the ledger's dispatch wave, like every other woken waiter.
    queueMicrotask(()=>chargeNow(entry));
  },controller.signal);
}
function chargeNow(entry:CacheEntry){
  if(entry.claim||entry.charge||cache.get(entry.prepared.boundarySHA256)!==entry)return;
  const result=entry.budget.tryReserve(entry.costs,{label:entry.label+' (charged after over-budget preparation)'});
  if(result.ok){entry.claim=result.reservation;lateCharges++;}else chargeWhenAvailable(entry);
}
/** The atomic hand-off: the caller's claim, holding exactly the index bytes on
 * `budget`, takes the index's own identities in place. That adjust keeps every
 * byte charged (nothing is given back, so no availability wave runs and no other
 * reserver can take the bytes), and the module cache then reserves the same
 * identities beside it, which the ledger counts once and admits without new
 * capacity. The caller keeps its claim either way: releasing it after a hand-off
 * changes no ledger bytes; after a refusal it returns them.
 * The claim takes the index identities plus a zero-byte probe identity first.
 * A zero-byte reservation of that probe on `budget` then shows whether the claim
 * belongs to `budget` (the probe is already charged there, so the allocation
 * count stays) without reserving, evicting or waking anything there. On `budget`
 * the re-identification must have kept both the charged bytes and the pressure
 * count: a growth that the pressure callbacks evicted room for is no hand-off of
 * the same bytes either. Only then is the probe dropped and the module's
 * deduplicated reservation made; neither needs capacity. */
function handOver(budget:ResourceBudget,claim:ResourceBudgetReservation,costs:readonly ResourceBudgetCost[],required:number,sha:string,label:string):{ok:true;reservation:ResourceBudgetReservation}{
  if(!claim||typeof claim!=='object'||typeof claim.adjust!=='function'||typeof claim.release!=='function')throw new TypeError('A solar boundary hand-off claim must be a ResourceBudgetReservation');
  const refuse=(reason:SolarBoundaryClaimRefusal,bytes:number)=>{handOverRefusals++;return new SolarShadowBoundaryClaimError(sha,reason,required,bytes);};
  if(!claim.active)throw refuse('inactive',0);
  const held=claim.bytes;if(held!==required)throw refuse('bytes',held);
  const probe:ResourceBudgetCost=Object.freeze({category:'shadow' as const,bytes:0,precision:'exact' as const,identity:Object.freeze({solarBoundaryHandOverProbe:sha}),label:label+' hand-off membership probe'});
  const start=budget.stats,bytes=start.bytes,pressure=start.pressureEvents;
  // Atomic replacement: a refused adjust (it needed capacity its ledger lacks even
  // after the pressure callbacks) keeps the claim's prior costs.
  if(!claim.adjust([...costs,probe]))throw refuse('shared',held);
  const allocations=budget.stats.allocations,check=budget.tryReserve(probe,{label:probe.label});
  const member=check.ok&&budget.stats.allocations===allocations;
  if(check.ok)check.reservation.release();
  if(!member)throw refuse('ledger',held);
  const after=budget.stats;
  if(after.bytes!==bytes||after.pressureEvents!==pressure)throw refuse('shared',held);
  if(!claim.adjust(costs))throw refuse('shared',held);
  const own=budget.tryReserve(costs,{label:label+' (handed off)'});
  if(own.ok&&budget.stats.bytes===bytes&&budget.stats.pressureEvents===pressure){handOvers++;return own;}
  if(own.ok)own.reservation.release();
  throw refuse('shared',held);
}
function prepareFromPlan(sha:string,plan:Plan,layout:Layout,budget:ResourceBudget,refusal:SolarBoundaryRefusal,handed?:ResourceBudgetReservation):PreparedSolarBoundary {
  const hit=cache.get(sha);if(hit)return hit.prepared;
  const label='verified solar boundary '+sha.slice(0,12);
  const costs:readonly ResourceBudgetCost[]=Object.freeze([
    Object.freeze({category:'shadow' as const,bytes:layout.bytes,precision:'exact' as const,identity:Object.freeze({solarBoundaryIndex:sha}),label:label+' edge and bucket index'}),
    Object.freeze({category:'shadow' as const,bytes:SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes,precision:'estimate' as const,identity:Object.freeze({solarBoundaryWrapper:sha}),label:label+' closures and typed-array views'}),
  ]);
  const required=layout.bytes+SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes,limit=budget.stats.limitBytes;
  if(required>limit)throw new SolarShadowBoundaryUnfitError(sha,required,limit);
  const admitted=handed!==undefined?handOver(budget,handed,costs,required,sha,label):budget.tryReserve(costs,{label});
  if(!admitted.ok&&refusal==='throw'){strictRefusals++;throw admitted.error;}
  const claim=admitted.ok?admitted.reservation:undefined;
  let prepared:PreparedSolarBoundary;
  try{prepared=buildIndex(sha,plan,layout);}catch(error){claim?.release();throw error;}
  preparedProofBudgets.set(prepared,budget);
  const entry:CacheEntry={prepared,claim,costs,budget,required,label,charge:undefined};
  if(!admitted.ok){overBudgetPreparations++;lastOverBudget=(label+': '+required+' logical bytes built over budget by a synchronous caller; shortfall '+admitted.error.shortfallBytes).slice(0,512);}
  insert(entry);
  if(!claim)chargeWhenAvailable(entry);
  return prepared;
}
/** This must receive a boundary AFTER the caller's existing byte/SHA/source checks.
 * The same verified hash shares one bounded edge index across painting providers.
 * Coverage is conservative: even a boundary edge's overlapping bounding rectangle
 * rejects the shadow, including enclaves and holes completely inside the shadow.
 * The index is reserved on the page ResourceBudget (or options.budget) BEFORE it
 * is allocated. A refusal follows options.whenRefused (see SolarBoundaryRefusal):
 * the default keeps the existing synchronous callers working, 'throw' leaves
 * nothing allocated or cached. An index above the whole ledger always throws
 * SolarShadowBoundaryUnfitError.
 */
export function prepareSolarShadowBoundary(value:SolarShadowBoundary,options:{budget?:ResourceBudget;whenRefused?:SolarBoundaryRefusal}={}):PreparedSolarBoundary {
  checkVerified(value);
  const hit=cache.get(value.boundarySHA256);if(hit)return hit.prepared;
  const refusal=options.whenRefused??'charge-later';
  if(refusal!=='throw'&&refusal!=='charge-later')throw new TypeError('Unknown solar boundary refusal policy');
  const plan=planIndex(value);
  return prepareFromPlan(value.boundarySHA256,plan,layoutOf(plan),options.budget??getPageResourceBudget(),refusal);
}
/** Synchronous strict admission for callers that hold other claims and must not
 * wait beside them. A cached hash returns its index without admission. Otherwise
 * the exact index is reserved on options.budget (default: the page ledger) and
 * built: a refusal throws the ledger's ResourceBudgetExceededError with nothing
 * allocated, cached or registered (no wait, no wake-up listener), so the caller
 * returns its own claims and waits holding nothing; an index above the whole
 * ledger throws SolarShadowBoundaryUnfitError. With `claim` it is the atomic
 * hand-off of admitSolarShadowBoundary below, without a promise. Validation
 * errors are the same as prepareSolarShadowBoundary's. Its refusals are counted
 * in solarShadowBoundaryCacheStats().tryAdmitRefusals (and strictRefusals). */
export function tryAdmitSolarShadowBoundary(value:SolarShadowBoundary,options:{budget?:ResourceBudget;claim?:ResourceBudgetReservation}={}):PreparedSolarBoundary {
  checkVerified(value);
  const hit=cache.get(value.boundarySHA256);if(hit)return hit.prepared;
  const plan=planIndex(value);
  try{return prepareFromPlan(value.boundarySHA256,plan,layoutOf(plan),options.budget??getPageResourceBudget(),'throw',options.claim);}
  catch(error){if(error instanceof ResourceBudgetExceededError)tryAdmitRefusals++;throw error;}
}
const abortError = () => new DOMException('Solar boundary admission superseded','AbortError');
/** One ledger wake-up that can hold the request, the same hash entering the
 * cache (a hand-off or tryAdmit by another caller runs no ledger wave), or the
 * caller's abort; no timer and no polling. A wake-up that cannot hold it keeps
 * the same registrations; both end with the wait. */
function waitForBudget(budget:ResourceBudget,signal:AbortSignal,fits:()=>boolean,sha:string):Promise<void>{
  return new Promise<void>((resolve,reject)=>{
    if(signal.aborted){reject(signal.reason??abortError());return;}
    let done=false,off:(()=>void)|undefined,offCached:(()=>void)|undefined;
    const finish=(error?:unknown)=>{if(done)return;done=true;signal.removeEventListener('abort',abort);const stop=off,stopCached=offCached;off=offCached=undefined;stop?.();stopCached?.();if(error===undefined)resolve();else reject(error);};
    const abort=()=>finish(signal.reason??abortError());
    signal.addEventListener('abort',abort,{once:true});
    off=budget.onAvailable(()=>{if(fits())finish();else deferredWakeups++;},signal);
    if(!done)offCached=onSolarShadowBoundaryCached(sha,()=>{if(cache.has(sha))finish();},signal);
  });
}
/** Valid preparation waits for page capacity; an aborted one reserves nothing,
 * and an index larger than the whole ledger rejects with the unfit error. The
 * boundary is validated and sized once, not again at every wake-up. A wait also
 * ends, in a microtask, when another caller caches the same hash (a hand-off or
 * tryAdmit, which run no ledger wave); the retry then returns that index.
 *
 * With `claim` it never waits: the caller hands over a reservation of `budget`
 * that holds exactly solarShadowBoundaryIndexBytes(value) +
 * SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes, and the index is admitted
 * under it in the same synchronous turn, before the first await (see handOver):
 * no byte is given back, so no availability wave runs between the caller's
 * admission and the module's. The caller still owns the claim and releases it
 * once this settles (it then changes no ledger bytes, or after a cache hit or a
 * refusal returns the placeholder). A claim the module cannot take rejects with
 * SolarShadowBoundaryClaimError and allocates, caches and holds nothing (see
 * SolarBoundaryClaimRefusal for what a 'shared' refusal may already have done). */
export async function admitSolarShadowBoundary(value:SolarShadowBoundary,options:{budget?:ResourceBudget;signal:AbortSignal;claim?:ResourceBudgetReservation}):Promise<PreparedSolarBoundary> {
  const budget=options.budget??getPageResourceBudget();
  options.signal.throwIfAborted();
  checkVerified(value);
  const sha=value.boundarySHA256,hit=cache.get(sha);if(hit)return hit.prepared;
  const plan=planIndex(value),layout=layoutOf(plan),required=layout.bytes+SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
  if(options.claim!==undefined)return prepareFromPlan(sha,plan,layout,budget,'throw',options.claim);
  for(;;){
    options.signal.throwIfAborted();
    try{return prepareFromPlan(sha,plan,layout,budget,'throw');}
    catch(error){if(!(error instanceof ResourceBudgetExceededError))throw error;}
    await waitForBudget(budget,options.signal,()=>cache.has(sha)||reclaimableFits(budget,required),sha);
  }
}
/** The resident packed x/y/z bounding box encloses every currently drawable
 * native/display vertex. Shadow masks only discard pixels. Transforming all box
 * corners therefore also encloses every triangle and every growth in [0,1]. */
export function solarShadowBoxForPackedBounds(origin:readonly[number,number],box:readonly number[],light:SceneSolarLight):[number,number,number,number]|undefined {
  if(!light.shadowVector)return;
  if(box.length!==6||!box.every(Number.isFinite)||box[0]>box[3]||box[1]>box[4]||box[2]>box[5]||box[4]<=0)return;
  const rad=Math.PI/180,scale=6378137*Math.cos(origin[1]*rad),originY=Math.log(Math.tan(Math.PI/4+origin[1]*rad/2));
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  // Below-ground vertices contribute only their ground footprint, matching the shader.
  for(const x of[box[0],box[3]])for(const y of[0,Math.max(0,box[1]),box[4]])for(const z of[box[2],box[5]]){
    const lon=origin[0]+(x+light.shadowVector[0]*y)/scale/rad;
    const lat=(2*Math.atan(Math.exp(originY+(z+light.shadowVector[1]*y)/scale))-Math.PI/2)/rad;
    west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat);
  }
  return[west,south,east,north];
}
/** The caller supplies only its already validated, actually drawable packed rows.
 * Native/owner/derived labels remain caller provenance; no legacy fixed-direction
 * metadata is required for this separate, current-time display projection proof. */
export function residentSolarShadowRanges<T extends {generation:number;start:number;end:number;box:readonly number[]}>(origin:readonly[number,number],rows:Iterable<T>,light:SceneSolarLight,boundary:PreparedSolarBoundary,generation:number,indexCount:number):T[] {
  if(!light.shadowVector)return[];
  const result:T[]=[];
  for(const c of rows){
    if(c.generation!==generation||!Number.isSafeInteger(c.start)||!Number.isSafeInteger(c.end)||c.start<0||c.end>indexCount||c.end<=c.start||(c.end-c.start)%3)continue;
    const box=solarShadowBoxForPackedBounds(origin,c.box,light);if(box&&boundary.covers(box))result.push(c);
  }
  return result;
}
