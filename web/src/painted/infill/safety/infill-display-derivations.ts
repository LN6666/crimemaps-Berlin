import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {ChunkResourceLease} from '../../../safety/render-runtime/chunk-resource-types';
import {rendererChunkFrame,type RendererChunkDerivation} from '../../../safety/renderer-chunk-input';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {BREMEN_DEMAND_METADATA} from '../../bremen/safety/bremen-demand-metadata';
import {BINDINGS as F278_SOURCE} from './f278-source-bindings';
import {OWNER_SHAPE_PATCH_PROFILES as F278_DISPLAY} from './f278-original-profiles';
import {INFILL_F288_COPLANAR_ROOF_AUTHORITY,INFILL_F288_COPLANAR_PLATFORM_PINS,INFILL_F288_COPLANAR_SOURCE_PINS} from './infill-f288-coplanar-roof';

type Identity={objectId:string;partId:string};
type Receipt=Identity&{sourcePartId?:string;patchSHA256?:string;admissionWitness?:Identity;admissionKind?:string};
const key=(row:Identity)=>row.objectId+'|'+row.partId;
const marker=(row:BuildingComponent,name:string)=>row.displayEstimates?.[name] as Record<string,unknown>|undefined;
// Identity/resource projections of the existing producers. Keeping this module
// free of their data builders preserves lazy preparation for unrelated cities.
export const INFILL_DISPLAY_DERIVATION_REFS={
 f288:[{canonicalSHA256:'6d01a7c7db79b5b82f89e1a7dba969e06958429c15f513c16da694d6ce677203',file:'painted/infill/safety/infill-f288-original.ts',occurrence:0,codec:'json'},{canonicalSHA256:'b09a14f93af08c85f57e1897b06b277a63bde2d86ac9b7f6d975bc6a9c59ad06',file:'painted/infill/safety/infill-f288-original.ts',occurrence:0,codec:'json'}],
 column:[{canonicalSHA256:'7602ab59658d63598a40f41e4c808f6393b7552d581add63ac20f521add0aba3',file:'painted/infill/safety/infill-stuttgart-jubilaeumssaeule.ts',occurrence:0,codec:'json'}],
 nave:[{canonicalSHA256:'e71eb51d1b047dae0f69defd40dc86cbb4d77cf6b0dfacb165f27553221b1e45',file:'painted/infill/safety/infill-essen-reconstruction.ts',occurrence:0,codec:'json'}],
} as const satisfies Record<string,readonly FrozenDataRef[]>;
const F278_PATCH='54141b8bae1865d0bf3e8e34d7cc78614934af932cf23a60d20e632033898abb',F288_PATCH='6c64dab596398fdd7315311b43467cae8fe8083f9ee1a8ab12707607f735702f',COLUMN_PATCH='34cba41129ede7299b20018fab91b2b58f91fcf571b6f3f761d589f95a7b9747';
const COLUMN_ANCHOR={objectId:'osm/way/9414673',partId:'osm/way/9414673/component/88392e74fa5b3e45c6cd'};
const NAVE_TOWER={objectId:'osm/way/303835932',partId:'osm/way/303835932/component/2832660d4be51576c190'};
const NAVE_DISPLAY={objectId:'osm/way/114669129',partId:'osm/way/114669129/surface'};

/** Consumes the existing producers' receipts after their exact-source gates.
 * No marker alone admits an identity: every row also needs its producer receipt,
 * complete native dependencies, and the exact frozen/code resource identity. */
export function infillDisplayDerivations(components:readonly BuildingComponent[],source:readonly BuildingComponent[],scope:FrozenDataScope,receipts:readonly Receipt[]){
 const proofs:RendererChunkDerivation<BuildingComponent>[]=[],pins:ChunkResourceLease<unknown>[]=[];
 const unique=(rows:readonly BuildingComponent[],identity:Identity,city:string)=>{const matches=rows.filter(row=>row.city===city&&key(row)===key(identity));if(matches.length!==1)throw Error('Infill verified DISPLAY dependency is missing or duplicated: '+key(identity));return matches[0];};
 const receipt=(row:BuildingComponent,patch:string)=>{const matches=receipts.filter(value=>key(value)===key(row)&&value.patchSHA256===patch);if(matches.length!==1)throw Error('Infill DISPLAY has no unique verified producer receipt: '+key(row));return matches[0];};
 function add(kind:string,rows:readonly BuildingComponent[],sources:readonly Identity[],witnesses:readonly Identity[],refs:readonly FrozenDataRef[],detail:unknown,visibility?:RendererChunkDerivation<BuildingComponent>['visibility'],explicitVisibility=false){
  const parents=refs.map(ref=>{const pin=scope.retainResource(ref,'dependency');pins.push(pin);return pin;}),authority=JSON.stringify(['infill-verified-display-v1',kind,refs,detail]);
  proofs.push({authority,components:rows,sources,witnesses,parents,frame:rendererChunkFrame(rows[0].origin,authority),visibility,explicitVisibility});
 }
 try{
  const f278=components.filter(row=>row.city==='essen'&&row.displayEstimates?.infillF278Original===true);
  if(f278.length){
   const native=F278_SOURCE.map(expected=>unique(source,expected,'essen'));
   const identities=[...F278_SOURCE,...F278_DISPLAY],rows=identities.map(identity=>unique(components,identity,'essen'));
   if(rows.length!==f278.length||rows.some(row=>row.displayEstimates?.infillF278Original!==true||row.displayEstimates?.restoredExistingAcceptedGeometry!==true))throw Error('F278 verified DISPLAY group mismatch');
   for(const row of rows)receipt(row,F278_PATCH);
   for(const profile of F278_DISPLAY){const row=unique(components,profile,'essen'),mark=marker(row,'F278DerivedOnly');if(mark?.patchSHA256!==F278_PATCH||mark.sourceAbsent!==true||mark.nativeGetterCount!==0||mark.displayOnlyId!==row.objectId||mark.partId!==row.partId||source.some(original=>key(original)===key(row)))throw Error('F278 derived DISPLAY marker mismatch');}
   add('f278-original',rows,native,[],[],[F278_PATCH,F278_SOURCE.map(row=>[row.objectId,row.partId,row.leafSHA256,row.geometrySignature]),F278_DISPLAY.map(row=>[row.objectId,row.partId,row.sourcePartId,row.sha256])],F278_DISPLAY.map(profile=>({identity:profile,sources:[unique(source,{objectId:profile.objectId,partId:profile.sourcePartId},'essen')]})));
  }
  const f288=components.filter(row=>row.city==='essen'&&row.displayEstimates?.infillF288Original===true);
  if(f288.length){
   const refs=INFILL_DISPLAY_DERIVATION_REFS.f288,expected=BREMEN_DEMAND_METADATA.f288Source as Identity[],derived=BREMEN_DEMAND_METADATA.f288Derived as Identity[];
   const native=expected.map(original=>unique(source,original,'essen')),rows=[...expected,...derived].map(identity=>unique(components,identity,'essen'));
   if(rows.length!==f288.length||rows.some(row=>row.displayEstimates?.infillF288Original!==true||row.displayEstimates?.restoredExistingAcceptedGeometry!==true))throw Error('F288 verified DISPLAY group mismatch');
   for(const row of rows)receipt(row,F288_PATCH);
   const visibility=derived.map(original=>{const row=unique(components,original,'essen'),mark=marker(row,'F288DerivedOnly'),record=receipt(row,F288_PATCH);if(mark?.patchSHA256!==F288_PATCH||mark.sourceAbsent!==true||mark.nativeGetterCount!==0||mark.displayOnlyId!==row.objectId||mark.partId!==row.partId||source.some(value=>key(value)===key(row)))throw Error('F288 derived DISPLAY marker mismatch');const parents=native.filter(parent=>parent.partId===record.sourcePartId);if(parents.length!==1)throw Error('F288 DISPLAY carrier receipt is not a verified native member');return{identity:row,sources:parents};});
   add('f288-original',rows,native,[],refs,[F288_PATCH,BREMEN_DEMAND_METADATA.f288Source,BREMEN_DEMAND_METADATA.f288Derived],visibility);
  }
  const roofs=components.filter(row=>row.city==='essen'&&marker(row,'infillF288CoplanarFacilityRoof'));
  for(const row of roofs){
   const mark=marker(row,'infillF288CoplanarFacilityRoof')!,pin=INFILL_F288_COPLANAR_SOURCE_PINS.find(value=>key(value)===key(row)),carrier=mark.sourceCarrier as (Identity&{leafSHA:string;signature:string})|undefined;
   if(!pin||mark.recipeSHA256!==INFILL_F288_COPLANAR_ROOF_AUTHORITY||mark.displayOnly!==true||mark.removedOnlyProvenCanopyIntersections!==true||mark.retainedWallsAndUncoveredRoof!==true||!carrier||key(carrier)!==key(pin)||carrier.leafSHA!==pin.leafSHA||carrier.signature!==pin.signature)throw Error('F288 facility roof verified recipe marker mismatch');
   unique(components,row,'essen');const native=unique(source,pin,'essen'),platforms=INFILL_F288_COPLANAR_PLATFORM_PINS.map(identity=>unique(components,identity,'essen'));
   const visibility=platforms.map(platform=>{if(platform.displayEstimates?.infillF288Original!==true)throw Error('F288 facility roof is missing its verified platform group');const record=receipt(platform,F288_PATCH),parents=source.filter(parent=>parent.city==='essen'&&parent.partId===record.sourcePartId);if(parents.length!==1)throw Error('F288 facility roof platform carrier is not complete');return{identity:platform,sources:parents};});
   add('f288-coplanar-facility-roof',[row,...platforms],[native],[],[],[INFILL_F288_COPLANAR_ROOF_AUTHORITY,pin,INFILL_F288_COPLANAR_PLATFORM_PINS],[{identity:row,sources:[native]},...visibility]);
  }
  const columns=components.filter(row=>row.city==='stuttgart'&&marker(row,'infillJubilaeumssaeule'));
  if(columns.length){
   const refs=INFILL_DISPLAY_DERIVATION_REFS.column,row=unique(components,BREMEN_DEMAND_METADATA.jubilaeumDisplay,'stuttgart'),mark=marker(row,'infillJubilaeumssaeule'),anchor=unique(source,COLUMN_ANCHOR,'stuttgart');
   if(columns.length!==1||mark?.patchSHA!==COLUMN_PATCH||mark.sourceAbsent!==true||mark.nativeGetterCount!==0||source.some(original=>original.city==='stuttgart'&&original.objectId===row.objectId))throw Error('Stuttgart column verified DISPLAY or admission mismatch');
   receipt(row,COLUMN_PATCH);add('stuttgart-column',[row],[],[anchor],refs,[COLUMN_PATCH,COLUMN_ANCHOR],undefined,true);
  }
  const naves=components.filter(row=>row.city==='essen'&&marker(row,'infillEssenExterior'));
  if(naves.length){
   const refs=INFILL_DISPLAY_DERIVATION_REFS.nave,patch=refs[0].canonicalSHA256,row=unique(components,NAVE_DISPLAY,'essen');
   if(naves.length!==1||marker(row,'infillEssenExterior')?.patchSHA!==patch||source.some(original=>original.city==='essen'&&original.objectId===NAVE_DISPLAY.objectId))throw Error('Essen nave verified DISPLAY or absence mismatch');
   const record=receipt(row,patch);if(!record.admissionWitness||!['verified-original-tower','verified-nearby-footprint'].includes(record.admissionKind??''))throw Error('Essen nave verified admission witness is absent');
   const witness=unique(source,record.admissionWitness,'essen'),towers=source.filter(original=>original.city==='essen'&&key(original)===key(NAVE_TOWER));
   if(towers.length>1||record.admissionKind==='verified-original-tower'&&(towers.length!==1||key(witness)!==key(NAVE_TOWER))||record.admissionKind==='verified-nearby-footprint'&&towers.length!==0)throw Error('Essen nave admission witness does not match producer receipt');
   add('essen-nave',[row],[],[witness],refs,[patch,record.admissionKind,record.admissionWitness],undefined,true);
  }
  return{proofs,release(){for(const pin of pins.splice(0))pin.release();}};
 }catch(error){for(const pin of pins)pin.release();throw error;}
}
