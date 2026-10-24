import type {BuildingComponent} from './building-mesh-renderer';
import {gardenAggregate086Identity,gardenAggregate086Reconstruction} from './garden-aggregate086';
import {GARDEN_UPPER_PHOTO087_FRAMES as DATA,GARDEN_UPPER_PHOTO087_SHA} from './garden-upper-photo087-data';
export {GARDEN_UPPER_PHOTO087_SHA} from './garden-upper-photo087-data';
/** Final width-slot marker only, exact24 vertices of six original SW quads.
 * Complete private086 reentry is the unforgeable ownership credential; public
 * markers/fingerprint-identical serialized DISPLAY cannot grant detail binding.
 * Geometry, original frames.xyz/family, all RGB/alpha and all other frames stay exact. */
export function gardenUpperPhoto087BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Garden087 exact packed lengths required');
 const group=components.filter(gardenAggregate086Identity),result={objects:0,vertices:0,sourceRetained:true,geometryChanged:false,actualVisualAccepted:false};if(group.length!==5)return result;
 const probe=gardenAggregate086Reconstruction(group);if(!probe.completeExactCohort||probe.components!==group||probe.stats.objects!==0)return result;
 const writes:{at:number;marker:number}[]=[];let at=0;
 for(const c of components){const n=c.batches.reduce((m,b)=>m+b.positions.length/3,0);for(const row of DATA){if(c.objectId!==row.objectId||c.partId!==row.partId)continue;if(!Number.isSafeInteger(row.componentVertex)||row.componentVertex<0||row.componentVertex>=n)return result;const p=(at+row.componentVertex)*5;
  if(row.frame.some((v,k)=>k===3?!(Object.is(frames[p+k],v)||Object.is(frames[p+k],row.marker)):!Object.is(frames[p+k],v)))return result;writes.push({at:p+3,marker:row.marker});}at+=n;}
 if(writes.length!==24)return result;for(const w of writes)frames[w.at]=w.marker;return{...result,objects:2,vertices:24,materialSHA256:GARDEN_UPPER_PHOTO087_SHA};
}
