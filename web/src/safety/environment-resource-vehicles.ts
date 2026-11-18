import type {ResourceBudgetCost} from './render-runtime/resource-budget';
import {ENVIRONMENT_CONSTRUCTION_MODEL} from './environment-resource-budget';

/** Decorative vehicle storage on the page ledger. Typed arrays are exact and
 * sized before allocation; JS road/slot containers are estimates scaled by the
 * actual loaded source positions. No physical-memory claim. */

/** Shared 44-vertex/22-triangle shell: 6 floats per vertex, 66 uint16 indices. */
export const VEHICLE_MESH_LAYOUT=Object.freeze({vertices:44,floatsPerVertex:6,indices:66});
export const vehicleMeshBytes=()=>VEHICLE_MESH_LAYOUT.vertices*VEHICLE_MESH_LAYOUT.floatsPerVertex*4+VEHICLE_MESH_LAYOUT.indices*2;
/** Mirrors createVehiclePositionScratch's power-of-two open-address table. */
export function vehicleScratchSlots(cap:number){let size=1;while(size<cap*4)size*=2;return size;}

/** Fixed per-renderer CPU storage, admitted before it is allocated. */
export function vehicleFixedCosts(cap:number,displayCap:number):ResourceBudgetCost[]{
 if(!Number.isSafeInteger(cap)||cap<1||!Number.isSafeInteger(displayCap)||displayCap<1)throw new RangeError('Invalid vehicle capacity');
 const slots=vehicleScratchSlots(cap);
 return[
  {category:'packed',bytes:displayCap*3*4+vehicleMeshBytes(),precision:'exact',identity:{},label:'vehicle instance staging and shared shell mesh'},
  // x/z/stamp hash table, slot indices, secondary counters, three matrices.
  {category:'construction',bytes:slots*4*3+cap*2+5*4+16*8+16*4*2,precision:'exact',identity:{},label:'vehicle position scratch and matrices'},
 ];
}

type SourceRoad={coordinates:readonly unknown[]};
type BuiltRoad={points:readonly unknown[]};
/** Upper bound for one viewport commit over ALL loaded source roads, before
 * clipping is known: projected point pairs, cumulative lengths, clipped
 * copies, reversed copies, density-slot allocation and represented sets. The
 * retained part also keeps the render-time density re-allocation working set,
 * because allocate() may run again on the first valid matrix. */
export function vehicleViewportBound(sourceRoads:readonly SourceRoad[],reservoirCap:number){
 const M=ENVIRONMENT_CONSTRUCTION_MODEL,slot=M.numberSlotBytes;let positions=0;
 for(const road of sourceRoads)positions+=Array.isArray(road.coordinates)?road.coordinates.length:0;
 const roads=sourceRoads.length;
 const retainedBytes=Math.ceil(positions*(M.pointArrayBytes+2*slot)+roads*(M.objectBytes+slot+6)+reservoirCap*(M.slotObjectBytes+slot)+roads*(2*M.setEntryBytes+4*slot)+reservoirCap*2*M.setEntryBytes);
 const constructionBytes=Math.ceil(positions*(slot+M.pointArrayBytes+2*slot)+roads*M.objectBytes);
 return Object.freeze({positions,roads,constructionBytes,retainedBytes});
}
/** Retained estimate after a commit, from the actually kept road paths. Slots
 * stay charged at the reservoir bound because render-time density allocation
 * may refill them without another admission. */
export function vehicleViewportRetainedBytes(roads:readonly BuiltRoad[],reservoirCap:number){
 const M=ENVIRONMENT_CONSTRUCTION_MODEL,slot=M.numberSlotBytes;let points=0;
 for(const road of roads)points+=road.points.length;
 return Math.ceil(points*(M.pointArrayBytes+2*slot)+roads.length*(M.objectBytes+slot+6)+reservoirCap*(M.slotObjectBytes+slot)+roads.length*(2*M.setEntryBytes+4*slot)+reservoirCap*2*M.setEntryBytes);
}
