import type {BuildingFocusLeafDocument,BuildingFocusPartitionLocator,createBuildingFocusIndexResolver} from './building-focus-catalog';
import type {ChunkResourceLease} from './render-runtime/chunk-resource-types';
type Leaf=Readonly<{id:string;sha256:string}>;
/** A dependency member named by verified focus metadata whose provider
 * descriptor is not in the caller's current catalogue window (for example a
 * leaf listed by an index partition outside the viewport query). */
export type BuildingFocusLocatedLeaf=Readonly<{key:string;id:string;sha256:string;partition:BuildingFocusPartitionLocator}>;
const key=(leaf:Leaf)=>JSON.stringify([leaf.id,leaf.sha256]);
/** Resolve the whole source/owner dependency closure BEFORE any geometry load.
 * Owner cohorts must come from the provider's source-validated native contracts.
 * Metadata members outside the caller's descriptor window are read by their
 * SHA-bound (id, sha256) identity only and returned as `located`: the caller
 * must obtain their real descriptors through its own validated index reader.
 * All metadata stays leased from the page store until the caller finishes its
 * plan; cancellation/failure relinquishes every acquired role. */
export async function acquireBuildingFocusClosure(options:{
 resolver:ReturnType<typeof createBuildingFocusIndexResolver>;
 candidates:readonly Leaf[];
 canonicalLeaves:readonly Leaf[];
 /** Independent owner-authorized sources, validated by the provider contract.
  * They participate in owner groups but must never impersonate catalog leaves. */
 externalLeaves?:readonly Leaf[];
 ownerCohorts:readonly (readonly Leaf[])[];
 maxLeaves:number;
 signal:AbortSignal;
 /** Leaf metadata leases are not bound to `signal`: they stay until `release`,
  * so the caller may keep them beyond this request (see the catalog). */
 retain?:boolean;
}){
 if(!Number.isSafeInteger(options.maxLeaves)||options.maxLeaves<1)throw Error('Invalid focus closure bound');
 const canonical=new Map<string,Leaf>(),ids=new Set<string>();
 for(const leaf of options.canonicalLeaves){
  if(!leaf.id||!/^[a-f0-9]{64}$/.test(leaf.sha256)||ids.has(leaf.id))throw Error('Invalid focus canonical closure');
  ids.add(leaf.id);canonical.set(key(leaf),leaf);
 }
 const external=new Map<string,Leaf>();
 for(const leaf of options.externalLeaves??[]){
  if(!leaf.id||!/^[a-f0-9]{64}$/.test(leaf.sha256)||ids.has(leaf.id))throw Error('Invalid or ambiguous focus external source');
  ids.add(leaf.id);external.set(key(leaf),leaf);
 }
 const known=(id:string)=>canonical.has(id)||external.has(id);
 const owners=new Map<string,readonly Leaf[][]>();
 for(const group of options.ownerCohorts){
  if(!group.length)throw Error('Empty focus owner cohort');
  const members=[...new Map(group.map(leaf=>[key(leaf),leaf])).values()];
  for(const leaf of members){const id=key(leaf);if(!known(id))throw Error('Stale or missing focus owner dependency');owners.set(id,[...(owners.get(id)??[]),members]);}
 }
 const queue:Leaf[]=[],queued=new Set<string>(),leases=new Map<string,ChunkResourceLease<BuildingFocusLeafDocument>>();
 const located=new Map<string,BuildingFocusLocatedLeaf>();
 const groups=new Map<string,readonly string[]>();
 // Metadata reads start as soon as a member is queued, two at a time: over a
 // real network a plan would otherwise pay one round trip after another for
 // every candidate leaf. Two is what the byte transport runs at once, so more
 // would only queue there, while each started read already holds its parse
 // reservation (40x its size) in the page ledger: eight at once needed some
 // 17-20 MiB of free ledger or the plan failed. Documents are still consumed
 // strictly in queue order.
 const PARALLEL_READS=2,reads=new AbortController(),loads=new Map<string,Promise<ChunkResourceLease<BuildingFocusLeafDocument>>>(),waiting:(()=>void)[]=[];let active=0;
 const forward=()=>reads.abort(options.signal.reason);
 const load=(leaf:Leaf)=>{
  const id=key(leaf);let pending=loads.get(id);if(pending)return pending;
  pending=(async()=>{
   if(active>=PARALLEL_READS)await new Promise<void>(resolve=>waiting.push(resolve));
   active++;
   try{return await options.resolver.acquireLeaf(leaf,reads.signal,{retain:options.retain===true});}
   finally{active--;waiting.shift()?.();}
  })();
  loads.set(id,pending);void pending.catch(()=>{});return pending;
 };
 const enqueue=(leaf:Leaf)=>{const id=key(leaf);if(queued.has(id))return;if(queued.size>=options.maxLeaves)throw Error('Focus dependency closure exceeds leaf budget');queued.add(id);queue.push(leaf);if(!external.has(id))void load(leaf);};
 const add=(leaf:Leaf)=>{if(!known(key(leaf)))throw Error('Stale or missing focus source dependency');enqueue(leaf);};
 const addGroup=(members:readonly Leaf[])=>{const keys=[...new Set(members.map(key))].sort();groups.set(JSON.stringify(keys),keys);for(const leaf of members)enqueue(leaf);};
 const release=()=>{for(const lease of leases.values())lease.release();leases.clear();};
 /** Failure or cancellation: stop the reads still running and give back every
  * lease, including one that settles only after this call returns. */
 const abandon=()=>{reads.abort();for(const [id,pending] of loads)if(!leases.has(id))void pending.then(lease=>lease.release(),()=>{});loads.clear();release();};
 options.signal.addEventListener('abort',forward,{once:true});
 try{
  if(options.signal.aborted)forward();
  options.signal.throwIfAborted();for(const leaf of options.candidates)add(leaf);
  for(let at=0;at<queue.length;at++){
   options.signal.throwIfAborted();const leaf=queue[at],id=key(leaf);
   for(const group of owners.get(id)??[])addGroup(group);
   if(external.has(id))continue;
   const lease=await load(leaf);leases.set(id,lease);
   const document=lease.value!,locators=new Map(document.dependencyLocators.map(row=>[row.key,row.partition]));
   const expected=located.get(id);
   // The referencing leaf's locator and the member's own document must agree.
   if(expected&&expected.partition!==document.leaf.partition)throw Error('Inconsistent focus dependency locator');
   for(const group of document.sourceObjectDependencies)addGroup(group.leafKeys.map(binding=>{
    const leaf=canonical.get(binding);if(leaf)return leaf;
    // An owner reconstruction never stands in for a canonical source member.
    if(external.has(binding))throw Error('Stale or missing focus source dependency: external source cannot satisfy it');
    const [memberId,memberSHA]=JSON.parse(binding) as [string,string],partition=locators.get(binding);
    if(partition===undefined)throw Error('Focus dependency locator missing');
    const previous=located.get(binding);if(previous&&previous.partition!==partition)throw Error('Inconsistent focus dependency locator');
    const row:BuildingFocusLocatedLeaf=Object.freeze({key:binding,id:memberId,sha256:memberSHA,partition});located.set(binding,row);
    return row;
   }));
  }
  // The same source object must declare the same complete membership at every
  // participating leaf; a one-sided dependency cannot justify sparse admission.
  for(const lease of leases.values()){
   for(const group of lease.value!.sourceObjectDependencies){
    const expected=JSON.stringify([...group.leafKeys].sort());
    for(const member of group.leafKeys){const document=leases.get(member)?.value,peer=document?.sourceObjectDependencies.find(row=>row.objectId===group.objectId);
     if(!document?.components.some(row=>row.objectId===group.objectId)||!peer||JSON.stringify([...peer.leafKeys].sort())!==expected)throw Error('Inconsistent focus source dependency closure');
    }
   }
   for(const row of lease.value!.dependencyLocators){const peer=leases.get(row.key)?.value;if(!peer||peer.leaf.partition!==row.partition)throw Error('Inconsistent focus dependency locator');}
  }
  options.signal.throwIfAborted();
  return{externalLeaves:Object.freeze(queue.filter(leaf=>external.has(key(leaf)))),
   /** Metadata-only members that still need a provider-validated descriptor. */
   located:Object.freeze([...located.values()]),
   get documents():readonly BuildingFocusLeafDocument[]{return[...leases.values()].map(lease=>{if(!lease.value)throw Error('Focus closure metadata released');return lease.value;});},dependencies:Object.freeze([...groups.values()]),release};
 }catch(error){abandon();throw error;}
 finally{options.signal.removeEventListener('abort',forward);}
}
