import type {S434CohortDiagnostic} from './s434-cohort-residency';
import {prepareS434AggregateDisplay,s434AggregateEntriesStamp,type GroupComponent,type ResidentEntry,type S434AggregateProfile} from './s434-aggregate-display';
import {S434_AGGREGATE_EXPECTED as E} from './s434-aggregate-display-constants';
import {S434_AGGREGATE_SOURCE_ROWS,S434_AGGREGATE_PARTITION_PROOF} from './s434-aggregate-attestation';
export type S434AggregatePackingState={profile:S434AggregateProfile|null;entries:readonly ResidentEntry[];diagnostic:{active:boolean;pending:boolean;lastFailure:string|null;selection?:S434CohortDiagnostic}};
type Context={city:string;signal:AbortSignal;leafSHA:(c:GroupComponent)=>string|undefined;admission:(c:GroupComponent)=>unknown;onChange:(reason:'ready'|'invalidated')=>void;cohortDiagnostic?:S434CohortDiagnostic};
export function createS434AggregateLifecycle(){
 let profile:S434AggregateProfile|null=null,entries:readonly ResidentEntry[]=[],stamp='',token=0,signal:AbortSignal|undefined,onAbort:(()=>void)|undefined,notify:Context['onChange']|undefined,pending=false,lastFailure:string|null='not-prepared',selection:S434CohortDiagnostic|undefined;
 function clear(){token++;if(signal&&onAbort)signal.removeEventListener('abort',onAbort);profile=null;entries=[];stamp='';signal=undefined;onAbort=undefined;notify=undefined;pending=false;lastFailure='cleared';selection=undefined;}
 function update(components:readonly GroupComponent[],ctx:Context){
  if(ctx.city!=='frankfurt'){clear();return;}selection=ctx.cohortDiagnostic;
  const next:ResidentEntry[]=components.filter(c=>c.city==='frankfurt'&&E.required.some(e=>e.objectId===c.objectId)).map(c=>{const row=S434_AGGREGATE_SOURCE_ROWS.find(r=>r.objectId===c.objectId);return Object.freeze({component:c,sourceLeafSHA256:ctx.leafSHA(c)??'',sourceRow:row?.sourceRow??'',admission:ctx.admission(c)});});
  const nextStamp=s434AggregateEntriesStamp(next),same=signal===ctx.signal&&stamp===nextStamp&&next.length===entries.length&&next.every((r,i)=>r.component===entries[i].component&&r.admission===entries[i].admission);
  notify=ctx.onChange;if(same){entries=Object.freeze(next);return;}
  if(signal&&onAbort)signal.removeEventListener('abort',onAbort);const mine=++token;profile=null;entries=Object.freeze(next);stamp=nextStamp;signal=ctx.signal;pending=false;lastFailure=null;
  onAbort=()=>{if(mine!==token)return;token++;profile=null;pending=false;lastFailure='aborted';notify?.('invalidated');};ctx.signal.addEventListener('abort',onAbort,{once:true});
  if(ctx.signal.aborted){onAbort();return;}
  // This is the full bounded packing snapshot, never an individual leaf callback.
  if(next.length!==7||E.required.some(e=>next.filter(r=>r.component.objectId===e.objectId&&r.component.partId===e.partId).length!==1)){lastFailure='required-members-not-unique-or-missing';return;}for(const e of E.required){const r=next.find(r=>r.component.objectId===e.objectId)!;if(r.sourceLeafSHA256!==e.sourceLeafSHA256){lastFailure='source-leaf-mismatch:'+e.objectId;return;}if(!r.admission){lastFailure='admission-missing:'+e.objectId;return;}}
  pending=true;void prepareS434AggregateDisplay(next,S434_AGGREGATE_PARTITION_PROOF,()=>entries,ctx.signal).then(value=>{if(mine!==token||ctx.signal.aborted)return;pending=false;if(s434AggregateEntriesStamp(entries)!==nextStamp){profile=null;lastFailure='resident-stamp-changed-during-check';return;}profile=value;lastFailure=value?null:'strict-source-array-admission-guard-rejected';if(value)notify?.('ready');}).catch(()=>{if(mine!==token)return;profile=null;pending=false;lastFailure='guard-error-or-abort';});
 }
 return {update,clear,packing:():S434AggregatePackingState|undefined=>entries.length?{profile,entries,diagnostic:{active:!!profile,pending,lastFailure,selection}}:undefined,get pending(){return pending;},get active(){return !!profile;}};
}
