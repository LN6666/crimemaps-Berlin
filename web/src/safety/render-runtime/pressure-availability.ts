import {AVAILABILITY_STATE_LIMITS,ResourceAvailabilityStateError,ResourceBudgetExceededError,type ResourceBudget,type ResourceBudgetReservation} from './resource-budget';

export type PressureAvailabilityValue=string|number|boolean|null|readonly PressureAvailabilityValue[];
export type PressureSnapshotWriter=Readonly<{open():void;close():void;value(value:string|number|boolean|null):void;reserveTemp(bytes:number):()=>void}>;
/** A participant writes one array directly; it must not retain the writer. */
export type PressureAvailabilitySnapshot=(writer:PressureSnapshotWriter)=>void;
export type PressureAvailabilityRegistration=Readonly<{notify():void;release():void}>;
export type PressureAdmissionResult=Readonly<{status:'ready'|'pending'|'stale'}>|Readonly<{status:'unfit';error:ResourceBudgetExceededError}>;
/** A fixed-fee probe never calls the source builder. rollback withdraws only
 * a registration created by this probe if the capability changed during it. */
export type PressureAdmissionProbe=Readonly<{safe:boolean;budget:ResourceBudget;probe():PressureAdmissionResult;rollback():void}>;
export class PressureAvailabilityBudgetError extends ResourceBudgetExceededError{
 readonly code='PRESSURE_AVAILABILITY_BUDGET_PENDING';
 constructor(error:ResourceBudgetExceededError,readonly admission:PressureAdmissionProbe){super(error.details);}
}
/** Each reservation includes the same registry identity (map, provider and
 * bookkeeping) plus its own descriptor/callback/handle slot. The page ledger
 * deduplicates the common identity. These are logical JS estimates, not heap
 * measurements; the tracker separately pays for snapshots and histories. */
export const PRESSURE_AVAILABILITY_LIMITS=Object.freeze({participants:512,nodes:8192,depth:16,kindChars:64,registryBytes:4096,participantBytes:1024,maxParticipantBytes:65536,transientBytes:1024*1024,transientBaseBytes:160*1024,transientReservations:64});
type Participant={kind:string;snapshot:PressureAvailabilitySnapshot;claim:ResourceBudgetReservation};
type Registry={budget:ResourceBudget;baseIdentity:object;unregister?:(()=>void);rows:Map<number,Participant>;pending:Set<number>};
const registries=new WeakMap<ResourceBudget,Registry>();
const overflow=(message:string)=>new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_OVERFLOW',message);
const ambiguous=(message:string)=>new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_AMBIGUOUS',message);

function encodedRows(registry:Registry):string{
 // Capture precharges this provider's 1 MiB transient allowance from the
 // tracker's existing scratch. One fixed 128 KiB buffer holds the JSON UTF-16LE
 // units; participants write scalars directly, so no trees or per-row strings
 // accumulate. Existing source strings are read in place, and no truncation or
 // digest is used. The single output string belongs to the tracker string cap.
 const limits=PRESSURE_AVAILABILITY_LIMITS,buffer=new Uint8Array(AVAILABILITY_STATE_LIMITS.chars*2),stack:number[]=[];
 let used=0,nodes=0,root=false,floor=0,expectArray=false,tempBytes=0,tempReservations=0;
 const unit=(code:number)=>{if(used>=AVAILABILITY_STATE_LIMITS.chars)throw overflow('Pressure availability text bound exceeded');buffer[used*2]=code&255;buffer[used*2+1]=code>>>8;used++;};
 const ascii=(text:string)=>{for(let i=0;i<text.length;i++)unit(text.charCodeAt(i));};
 const prefix=()=>{
  if(++nodes>limits.nodes)throw overflow('Pressure availability node bound exceeded');
  if(!stack.length){if(root)throw ambiguous('Pressure availability has multiple roots');root=true;return;}
  const top=stack.length-1;if(stack[top]++)unit(44);
 };
 const hex='0123456789abcdef';
 const quoted=(text:string)=>{
  unit(34);
  for(let i=0;i<text.length;i++){
   const code=text.charCodeAt(i);
   if(code===34||code===92){unit(92);unit(code);continue;}
   if(code<32){
    const short=code===8?98:code===9?116:code===10?110:code===12?102:code===13?114:0;
    unit(92);if(short){unit(short);continue;}
    unit(117);unit(48);unit(48);unit(hex.charCodeAt(code>>>4));unit(hex.charCodeAt(code&15));continue;
   }
   if(code>=0xd800&&code<=0xdfff){
    const next=i+1<text.length?text.charCodeAt(i+1):0;
    if(code<=0xdbff&&next>=0xdc00&&next<=0xdfff){unit(code);unit(next);i++;continue;}
    unit(92);unit(117);unit(hex.charCodeAt(code>>>12));unit(hex.charCodeAt(code>>>8&15));unit(hex.charCodeAt(code>>>4&15));unit(hex.charCodeAt(code&15));continue;
   }
   unit(code);
  }
  unit(34);
 };
 const writer:PressureSnapshotWriter=Object.freeze({
  open(){if(stack.length>=limits.depth)throw overflow('Pressure availability depth bound exceeded');if(expectArray&&stack.length===floor)expectArray=false;prefix();unit(91);stack.push(0);},
  close(){if(stack.length<=floor)throw ambiguous('Pressure availability array scope invalid');stack.pop();unit(93);},
  value(value){
   if(expectArray&&stack.length===floor)throw ambiguous('Pressure availability participant must write an array');
   if(value!==null&&typeof value!=='string'&&typeof value!=='boolean'&&typeof value!=='number')throw ambiguous('Pressure availability requires primitives');
   if(typeof value==='number'&&(!Number.isFinite(value)||Object.is(value,-0)))throw ambiguous('Invalid pressure availability number');
   prefix();if(typeof value==='string')quoted(value);else if(value===null)ascii('null');else if(typeof value==='boolean')ascii(value?'true':'false');else ascii(String(value));
  },
  reserveTemp(bytes){
   if(!Number.isSafeInteger(bytes)||bytes<0||bytes>limits.transientBytes-limits.transientBaseBytes-tempBytes||tempReservations>=limits.transientReservations)throw overflow('Pressure availability temporary construction bound exceeded');
   tempBytes+=bytes;tempReservations++;let active=true;return()=>{if(!active)return;active=false;tempBytes-=bytes;tempReservations--;};
  },
 });
 writer.open();
 // Slot order is canonical, never insertion/wake-event order. An active slot is
 // stable for the participant lifetime and is reusable only after its release.
 for(let slot=1;slot<=limits.participants;slot++){
  const participant=registry.rows.get(slot);if(!participant)continue;
  writer.open();writer.value(slot);writer.value(participant.kind);
  floor=stack.length;const before=stack[floor-1];expectArray=true;const result=participant.snapshot(writer);
  if(result!==undefined||expectArray||stack.length!==floor||stack[floor-1]!==before+1||tempReservations)throw ambiguous('Pressure availability participant must write one array and release temporary reservations');
  floor=0;writer.close();
 }
 writer.close();if(stack.length||!root)throw ambiguous('Pressure availability root incomplete');
 return new TextDecoder('utf-16le',{fatal:true,ignoreBOM:true}).decode(buffer.subarray(0,used*2));
}
/** Register before installing a pressure callback. One same-page reservation
 * carries both this descriptor and the common registry identity: the ledger
 * deduplicates the latter across all participants. A single real pressure pass
 * may reclaim existing page caches; refusal leaves no descriptor or callback. */
export function registerPressureAvailability(budget:ResourceBudget,kind:string,snapshot:PressureAvailabilitySnapshot,participantBytes:number=PRESSURE_AVAILABILITY_LIMITS.participantBytes):PressureAvailabilityRegistration{
 if(!budget||typeof budget.tryReserve!=='function'||typeof budget.registerAvailabilityStateProvider!=='function'||typeof budget.notifyAvailabilityStateChange!=='function')throw new TypeError('Pressure availability requires the existing page budget');
 if(typeof kind!=='string'||!kind||kind.length>PRESSURE_AVAILABILITY_LIMITS.kindChars||typeof snapshot!=='function')throw new TypeError('Invalid pressure availability participant');
 if(!Number.isSafeInteger(participantBytes)||participantBytes<PRESSURE_AVAILABILITY_LIMITS.participantBytes||participantBytes>PRESSURE_AVAILABILITY_LIMITS.maxParticipantBytes)throw new RangeError('Invalid pressure participant metadata estimate');
 let registry=registries.get(budget);
 if(!registry){
  // The placeholder is visible before pressure listeners run, so a reentrant
  // participant shares the identical base identity rather than charging two.
  registry={budget,baseIdentity:{},rows:new Map(),pending:new Set()};registries.set(budget,registry);
 }
 let slot=1;while(slot<=PRESSURE_AVAILABILITY_LIMITS.participants&&(registry.rows.has(slot)||registry.pending.has(slot)))slot++;
 if(slot>PRESSURE_AVAILABILITY_LIMITS.participants)throw overflow('Pressure availability participant bound exceeded');
 const activeRegistry=registry;activeRegistry.pending.add(slot);let claim:ResourceBudgetReservation|undefined,published=false;
 const clearEmpty=()=>{
  if(!activeRegistry.rows.size&&activeRegistry.unregister){const off=activeRegistry.unregister;activeRegistry.unregister=undefined;off();}
  if(!activeRegistry.rows.size&&!activeRegistry.pending.size&&registries.get(budget)===activeRegistry)registries.delete(budget);
 };
 try{
  const label='pressure-availability:'+kind+':'+slot;
  const admitted=budget.tryReserve([
   {category:'metadata',bytes:PRESSURE_AVAILABILITY_LIMITS.registryBytes,precision:'estimate',identity:activeRegistry.baseIdentity,label:'pressure availability shared registry'},
   {category:'metadata',bytes:participantBytes,precision:'estimate',identity:{},label},
  ],{label,evict:true});
  if(!admitted.ok)throw admitted.error;claim=admitted.reservation;
  if(!claim.active)throw new DOMException('Pressure participant admission retired','AbortError');
  if(!activeRegistry.unregister)activeRegistry.unregister=budget.registerAvailabilityStateProvider(()=>encodedRows(activeRegistry),'pressure-eligibility-v1',{transientScratchBytes:PRESSURE_AVAILABILITY_LIMITS.transientBytes});
  activeRegistry.rows.set(slot,{kind,snapshot,claim});published=true;activeRegistry.pending.delete(slot);budget.notifyAvailabilityStateChange();
 }catch(error){if(published)activeRegistry.rows.delete(slot);activeRegistry.pending.delete(slot);try{clearEmpty();}finally{claim?.release();}throw error;}
 let active=true;
 return Object.freeze({notify(){if(active)budget.notifyAvailabilityStateChange();},release(){
  if(!active)return;active=false;
  // Withdraw the descriptor and provider before releasing claims: synchronous
  // budget callbacks may register a fresh owner during either release.
  activeRegistry.rows.delete(slot);try{if(activeRegistry.rows.size)budget.notifyAvailabilityStateChange();}finally{try{clearEmpty();}finally{claim!.release();}}
 }});
}
