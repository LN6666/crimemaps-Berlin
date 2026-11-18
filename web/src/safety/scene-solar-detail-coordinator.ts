import {createSceneSolarCoverageEpoch,type SceneSolarEpochBounds,type SceneSolarEpochProvider,type SceneSolarEpochPublishedCapture} from './scene-solar-coverage-epoch';
import type {SolarShadowCoverage} from './planar-building-reflection';

/** Scalar evidence from the manager that actually completed the visible request.
 * An absent canonical receipt is unknown, including a generation mismatch. */
export type SolarDetailSettlement=Readonly<{
 requestRevision:number;readyRequestRevision:number|undefined;
 generation:number|undefined;readyGeneration:number|undefined;pending:boolean;
 canonical?:SceneSolarEpochProvider['canonical'];
}>;
type ProviderState=Readonly<{ready:boolean;settlement:SolarDetailSettlement|undefined}>;
const integer=(n:unknown):n is number=>Number.isSafeInteger(n)&&(n as number)>=0;
function settled(row:ProviderState):row is ProviderState&{settlement:SolarDetailSettlement&{generation:number;readyGeneration:number;readyRequestRevision:number;canonical:SceneSolarEpochProvider['canonical']}}{
 const s=row.settlement,c=s?.canonical;
 return row.ready&&!!s&&!s.pending&&integer(s.requestRevision)&&s.requestRevision===s.readyRequestRevision&&
  integer(s.generation)&&s.generation===s.readyGeneration&&!!c&&c.generation===s.generation&&
  (c.kind==='empty'||c.kind==='bounds'&&c.bounds.length===6&&c.bounds.every(Number.isFinite)&&[0,1,2].every(i=>c.bounds[i]<=c.bounds[i+3]));
}

/** The frame-end adapter between real manager settlement and the scalar epoch.
 * Refresh requests are edges, not acknowledgements. A later successful manager
 * request must advance its actual revision, even if it reuses the same mesh.
 * No timer, model reference, source lease or GL allocation is retained here. */
export function createSceneSolarDetailCoordinator(options:{
 providers:readonly string[];
 readProvider(provider:string):ProviderState;
 requestRefresh(provider:string):void;
 readSourceRevision():string;
 readUnforcedCoverage():SolarShadowCoverage|undefined;
 requestRepaint():void;
}){
 const epoch=createSceneSolarCoverageEpoch(options.providers);
 const targets=new Map<string,{epochId:number;beforeRevision:number}>();
 type QueuedCapture=SceneSolarEpochPublishedCapture&{coverage:SolarShadowCoverage;sourceRevision:string;providerStamp:string};
 let context:string|undefined,refreshEpoch:number|undefined,queuedProof:QueuedCapture|undefined;
 let observedRevision:string|undefined,observedStamp:string|undefined,empty=false;
 const rows=()=>options.providers.map(provider=>({provider,...options.readProvider(provider)}));
 const stamp=(values:ReturnType<typeof rows>)=>JSON.stringify(values.map(({provider,ready,settlement:s})=>
  [provider,ready,s?.requestRevision,s?.readyRequestRevision,s?.generation,s?.readyGeneration,s?.pending,s?.canonical]));
 function clear(){epoch.reset();targets.clear();queuedProof=undefined;observedRevision=observedStamp=undefined;empty=false;refreshEpoch=undefined;}
 function setContext(value:string|undefined){
  if(context===value)return;
  clear();context=value;refreshEpoch=value===undefined?undefined:0;
  if(value!==undefined)options.requestRepaint();
 }
 function issueRefresh(values:ReturnType<typeof rows>,id:number){
  // The caller has a complete, settled cohort. Preserve the pre-request stamps
  // before any refresh callback can synchronously mark its manager pending.
  for(const row of values)targets.set(row.provider,{epochId:id,beforeRevision:row.settlement!.requestRevision});
  refreshEpoch=undefined;observedRevision=observedStamp=undefined;queuedProof=undefined;
  for(const row of values)options.requestRefresh(row.provider);
  options.requestRepaint();
 }
 function update(){
  if(context===undefined)return;
  const values=rows(),allSettled=values.every(settled);
  // Until the first epoch exists, there is no safe prior projection to retain.
  // A pending provider cannot supply a capture witness. Defer inspecting all
  // six meshes until their actual readiness changes; keep the refresh floors.
  if(!allSettled&&epoch.state.epochId===undefined){
   queuedProof=undefined;observedRevision=observedStamp=undefined;
   epoch.withdrawObservation();return;
  }
  const currentStamp=stamp(values),revision=options.readSourceRevision();
  if(refreshEpoch===undefined&&!queuedProof&&allSettled&&observedRevision===revision&&observedStamp===currentStamp&&
     (empty||!epoch.state.capturePending))return;
  // A completed capture releases its temporary programs before this frame-end
  // observation. Preserve its scalar coverage witness, not those GPU leases.
  // Any content or manager change still requires a fresh coverage observation.
  const captured=queuedProof&&allSettled&&queuedProof.sourceRevision===revision&&queuedProof.providerStamp===currentStamp?queuedProof.coverage:undefined;
  const coverage=captured??options.readUnforcedCoverage(),confirmedRevision=options.readSourceRevision();
  if(!coverage){
   // requireAll source coverage returning undefined is complete-empty only
   // when every real manager also supplies a current canonical-empty receipt.
   // It must not prevent an outer dedicated-only source from capturing.
   const completeEmpty=allSettled&&revision===confirmedRevision&&values.every(row=>row.settlement?.canonical?.kind==='empty');
   if(completeEmpty){
    clear();empty=true;observedRevision=revision;observedStamp=currentStamp;
   }else{
    // Missing coverage during a dispatched request is unknown, not a new
    // cohort. Withdraw every usable observation without losing that request's
    // floor; otherwise its successful completion would dispatch epoch zero
    // again. Preserve a prior complete-empty marker so newly appearing real
    // coverage still requests its initial canonical cycle below.
    queuedProof=undefined;observedRevision=observedStamp=undefined;
    epoch.withdrawObservation();
   }
   return;
  }
  if(empty)refreshEpoch=0;
  empty=false;
  if(allSettled&&coverage.complete&&revision===confirmedRevision&&refreshEpoch!==undefined){issueRefresh(values,refreshEpoch);return;}
  const providers:SceneSolarEpochProvider[]=[];
  for(const row of values){
   const s=row.settlement;
   if(!s?.canonical||!integer(s.generation)||!integer(s.readyGeneration)||!integer(s.readyRequestRevision))continue;
   const target=targets.get(row.provider),id=epoch.state.epochId??0;
   const acknowledged=settled(row)&&target?.epochId===id&&s.requestRevision>target.beforeRevision;
   providers.push({provider:row.provider,requestRevision:s.requestRevision,readyRequestRevision:s.readyRequestRevision,
    generation:s.generation,readyGeneration:s.readyGeneration,pending:!row.ready||s.pending,canonical:s.canonical,
    ...(acknowledged?{ack:{contextKey:context,epochId:id,requestRevision:s.requestRevision,generation:s.generation}}:{})});
  }
  const result=epoch.observe({contextKey:context,rawResidentCoverage:{kind:'unforced-resident',revision,confirmedRevision,...coverage},providers,
   ...(queuedProof?{publishedCapture:queuedProof}:{})});
  queuedProof=undefined;
  if(result.needsRefresh){refreshEpoch=result.epochId;issueRefresh(values,result.epochId!);return;}
  if(!result.capturePending){observedRevision=revision;observedStamp=currentStamp;}
  else observedRevision=observedStamp=undefined;
 }
 function current(){
  if(context===undefined||refreshEpoch!==undefined||observedRevision===undefined)return false;
  const values=rows();return values.every(settled)&&stamp(values)===observedStamp&&options.readSourceRevision()===observedRevision;
 }
 return {
  setContext,update,
  get capturePending(){return context!==undefined&&(!current()||!empty&&epoch.state.capturePending);},
  get state(){return {...epoch.state,contextKey:context,empty,refreshEpoch,capturePending:context!==undefined&&(!current()||!empty&&epoch.state.capturePending)};},
  capturePlan(){return current()&&!empty?epoch.capturePlan():undefined;},
  projectionFor(bounds:SceneSolarEpochBounds){return context===undefined?undefined:epoch.projectionFor(bounds);},
  publication(proof:SceneSolarEpochPublishedCapture|undefined){
   if(!proof){queuedProof=undefined;epoch.revokePublication();return;}
   const plan=current()&&!empty?epoch.capturePlan():undefined;
   if(plan&&proof.contextKey===context&&proof.revision===plan.revision){
    const sourceRevision=options.readSourceRevision(),providerStamp=stamp(rows()),coverage=options.readUnforcedCoverage();
    if(!coverage?.complete||!current()||sourceRevision!==options.readSourceRevision()||providerStamp!==stamp(rows()))return;
    queuedProof={...proof,bounds:[...proof.bounds],coverage:{...coverage,bounds:[...coverage.bounds]},sourceRevision,providerStamp};
    options.requestRepaint();
   }
  },
  reset(){clear();context=undefined;},
 };
}
