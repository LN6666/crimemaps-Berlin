import type {BuildingComponent} from './building-mesh-renderer';
import {KO_RAIL_COHORT70 as E} from './ko-rail-connection-budget70';
import {applyKORailConnection70,koRailConnectionReady70} from './ko-rail-connection';
type Pin=(c:BuildingComponent)=>string|undefined;
const key=(c:{city:string;objectId:string;partId:string})=>c.city+'|'+c.objectId+'|'+c.partId;
const ownerKeys=new Set(E.members.filter(m=>m.connectionOwner).map(key));
const nativeKeys=new Set(E.members.filter(m=>!m.owner&&!m.sourceOnly).map(key));
/** A single validated raw snapshot for the synchronous setBatches transaction. */
export function prepareKORailConnectionBatch70(raw:readonly BuildingComponent[],leaf:Pin|undefined,owner:Pin|undefined,programReady:boolean,registry:readonly any[]){
 const snapshot=[...raw],objects=new Set(snapshot);
 const complete=ownerKeys.size===147&&nativeKeys.size===1&&koRailConnectionReady70(snapshot,leaf,owner,programReady,registry);
 return {
  complete,
  display(c:BuildingComponent){const k=key(c);if(ownerKeys.has(k))return complete&&objects.has(c);if(nativeKeys.has(k))return !complete;return true;},
  apply(draw:BuildingComponent[],colors:Float32Array,frames:Float32Array){
   if(!complete)return {written:0};
   // The frozen helper independently rechecks this same snapshot once before packing.
   return applyKORailConnection70(draw,colors,frames,snapshot,leaf,owner,programReady,registry);
  }
 };
}
