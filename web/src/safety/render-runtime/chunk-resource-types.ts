import type {ResourceBudget,ResourceBudgetCost,ResourceBudgetReservation} from './resource-budget';

/** A content key describes source/LOD/cohort, packing ABI, frame and material
 * authority. Request generations and GPU incarnations are deliberately absent. */
export type ChunkContentKey=string;
/** Reload cost, not a visual quality setting. Idle cache deadlines are capped at 20s. */
export type ChunkCacheRetention='refetch'|'redecode'|'reupload'|'rebuild';
/** Cache/recent roles are revocable under page pressure/expiry. Functional
 * consumers retain source/main/pass/picking roles before adopting their value. */
export type ChunkResourceRole='source'|'main'|'solar'|'reflection'|'picking'|'selected'|'candidate'|'dependency'|'cache'|'recent';
export type ChunkReadyBorrowRole='main'|'solar'|'reflection'|'picking'|'selected'|'dependency';
export type ChunkResourceState='preparing'|'ready'|'recent'|'retiring'|'failed'|'lost'|'released';
export type ChunkResourceCosts=ResourceBudgetCost|readonly ResourceBudgetCost[];
export type ChunkProductionScheduleOptions={phase?:'source-build'|'upload';priority?:'visible'|'capture';label?:string};

/** A synchronous pass holds an already-ready resource without creating an
 * asynchronous completion. Release still participates in the store's roles. */
export interface ChunkResourceBorrow<T=unknown>{
 readonly contentKey:ChunkContentKey;
 readonly role:ChunkResourceRole;
 readonly state:ChunkResourceState;
 readonly value:T|undefined;
 readonly released:boolean;
 readonly context:WebGL2RenderingContext|undefined;
 readonly epoch:number|undefined;
 release():void;
}

export interface ChunkResourceLease<T=unknown> extends ChunkResourceBorrow<T>{
 /** Completion carries no payload: a cached fulfilled promise must not pin T
  * after the final lease, recent entry and retirement have released it. */
 readonly ready:Promise<void>;
 retain(role:ChunkResourceRole):ChunkResourceLease<T>;
 /** Ready-only synchronous draw/data pin. This cannot await or start production. */
 borrowReady(role:ChunkReadyBorrowRole):ChunkResourceBorrow<T>;
}

export interface ChunkProductionContext{
 readonly signal:AbortSignal;
 readonly budget:ResourceBudget;
 /** Convert a pre-expansion reservation to actual shared/owned costs. A false
  * return preserves the previous reservation; the producer must stop expanding. */
 adjust(cost:ChunkResourceCosts):boolean;
 /** Async source discovery attaches a ready CPU parent to the same production
  * graph before handing its value downstream. The store owns this extra role. */
 retainParent(parent:ChunkResourceLease<unknown>):void;
 /** Pure packing uses the existing context admission scheduler. Its current
  * guard belongs to this shared production, never one view consumer. */
 schedule<T>(context:WebGL2RenderingContext,work:()=>T,options?:ChunkProductionScheduleOptions):Promise<T>;
 /** Continue bounded synchronous steps in one admitted job. A true result
  * completes it; false yields at the scheduler's existing turn boundary. */
 scheduleSteps(context:WebGL2RenderingContext,step:()=>boolean,options?:ChunkProductionScheduleOptions):Promise<void>;
}

export interface ChunkResourceRequest<T>{
 contentKey:ChunkContentKey;
 role:ChunkResourceRole;
 estimate:ChunkResourceCosts;
 produce(context:ChunkProductionContext):T|Promise<T>;
 /** Final observation may reduce a reservation. Reserve any growth with the
  * production context before expanding, never after allocating the result. */
 costs?(value:T):ChunkResourceCosts;
 dispose?(value:T):void;
 /** Ready CPU/source parents are retained by the store, including their cache
  * cost ancestry. GPU incarnation dependencies belong on acquireGpu instead. */
 parents?:readonly ChunkResourceLease<unknown>[];
 allowRecent?:boolean;
 /** Cheap reloads leave the application cache sooner; live leases remain protected. */
 cacheRetention?:ChunkCacheRetention;
 signal?:AbortSignal;
 onChange?:()=>void;
}

export interface ChunkGpuResourceRequest<T>{
 contentKey:ChunkContentKey;
 context:WebGL2RenderingContext;
 epoch:number;
 role:ChunkResourceRole;
 estimate:ChunkResourceCosts;
 create(context:ChunkProductionContext):T;
 costs?(value:T):ChunkResourceCosts;
 dispose(value:T):void;
 /** The allocation owns independent dependency leases until retirement ends. */
 parents?:readonly ChunkResourceLease<unknown>[];
 allowRecent?:boolean;
 /** Cheap reloads leave the application cache sooner; live leases remain protected. */
 cacheRetention?:ChunkCacheRetention;
 onChange?:()=>void;
}

export interface ChunkGpuRetirement{
 context:WebGL2RenderingContext;
 epoch:number;
 /** Transfers the existing claim; it must come from this page's budget. */
 reservation:ResourceBudgetReservation;
 dispose():void;
 label?:string;
}

export interface ChunkPublicationCohort{
 key:string;
 members:readonly ChunkContentKey[];
 /** Existing proof/mask/texture authority decides readiness, never the store. */
 ready?:()=>boolean;
}

export interface ChunkSceneRequest{
 generation:number;
 wanted:readonly ChunkContentKey[];
 context?:WebGL2RenderingContext;
 epoch?:number;
 cohorts?:readonly ChunkPublicationCohort[];
 current?:()=>boolean;
}

export interface ChunkSceneSnapshot<T=unknown>{
 readonly version:number;
 readonly generation:number;
 readonly leases:readonly ChunkResourceLease<T>[];
 release():void;
}

export interface ChunkSceneReadySnapshot<T=unknown>{
 readonly version:number;
 readonly generation:number;
 readonly borrows:readonly ChunkResourceBorrow<T>[];
 release():void;
}

export interface ChunkPublication<T=unknown>{
 readonly generation:number;
 readonly pendingKeys:readonly ChunkContentKey[];
 readonly cancelled:boolean;
 get(contentKey:ChunkContentKey):ChunkResourceLease<T>|undefined;
 /** Takes its own candidate role. The caller keeps ownership of its input. */
 add(lease:ChunkResourceLease<T>):void;
 publish():boolean;
 cancel():void;
}

export interface ChunkScene<T=unknown>{
 readonly owner:string;
 readonly version:number;
 readonly generation:number;
 readonly leases:readonly ChunkResourceLease<T>[];
 reconcile(request:ChunkSceneRequest):ChunkPublication<T>;
 /** Pins exactly one published version for the complete pass/execution. */
 capture(role:'solar'|'reflection'|'picking'|'selected'|'main'):ChunkSceneSnapshot<T>;
 /** Pins the published ready version for a synchronous pass, without promises. */
 captureReady(role:ChunkReadyBorrowRole):ChunkSceneReadySnapshot<T>;
 destroy():void;
}

export interface ChunkResourceStore{
 readonly budget:ResourceBudget;
 /** Paid, bounded, exact page-ledger and all-store net-state observer. */
 createAvailabilityTracker():import('./resource-budget').ResourceAvailabilityTracker;
 readonly destroyed:boolean;
 acquire<T>(request:ChunkResourceRequest<T>):ChunkResourceLease<T>;
 acquireGpu<T>(request:ChunkGpuResourceRequest<T>):ChunkResourceLease<T>;
 createScene<T=unknown>(owner:string):ChunkScene<T>;
 contextEpoch(context:WebGL2RenderingContext):number;
 /** Invalidates only this GPU incarnation. CPU content identity survives. */
 invalidateContext(context:WebGL2RenderingContext,epoch?:number):void;
 /** Existing program/texture owners may transfer a retiring allocation without
  * introducing a second cache or a duplicate budget claim. */
 retireGpu(retirement:ChunkGpuRetirement):void;
 /** Called by existing frame/preparation ingress, never by a second timer.
  * This public call is the frame boundary. The first such call of a
  * synchronous task opens one frame, which spends one follow-up frame of every
  * pending retirement and delivers a deferred reclaimable wake; later calls in
  * that task only collect. Acquisitions collect internally without a frame. */
 collectRetired():void;
 /** Bounded follow-up frames for GPU retirements that wait for a completion
  * fence or for the fence-less fallback, and the one frame that delivers a
  * deferred reclaimable wake: request() is called at most once per retirement
  * start, opened frame or deferral, and per retiring entry for at most a fixed
  * number of frames. It should schedule one frame (for example
  * map.triggerRepaint) whose boundary calls collectRetired(). A recent-cache
  * expiry deadline disposes expired idle entries through the same collector;
  * GPU completion still uses these frame boundaries. */
 onRetirementPending?(request:()=>void,signal?:AbortSignal):()=>void;
 /** Omit keys for page-pressure eviction. Exact keys restrict cleanup to the
  * caller's idle/cache resources; an empty list is a no-op. Live functional
  * consumers and GPU retirement fences remain protected. */
 evictRecent(contentKeys?:readonly ChunkContentKey[]):void;
 /** Set the idle grace for exact resources after a demand transition. Live
  * roles remain protected, and retention still obeys the page cache budget.
  * The next functional acquisition/borrow restores the original ordinary policy;
  * cache-only touches do not cancel the transition grace. */
 setIdleRetention(contentKeys:readonly ChunkContentKey[],tiers:Readonly<Record<ChunkCacheRetention,number>>,options?:{
  /** Include only descendants whose every direct parent is inside this selected
   * family. Never walk upward into shared sources or into mixed-owner children. */
  exclusiveDependents?:boolean;
 }):void;
 destroy():void;
 readonly stats:Record<string,unknown>;
}

/** Kept in this module for source owners that transfer temporary reservations
 * into a production without retaining a second decoded cache. */
export type ChunkResourceReservation=ResourceBudgetReservation;
