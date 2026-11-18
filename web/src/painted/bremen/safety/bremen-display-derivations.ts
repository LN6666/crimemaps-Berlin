import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {ChunkResourceLease} from '../../../safety/render-runtime/chunk-resource-types';
import {rendererChunkFrame,type RendererChunkDerivation} from '../../../safety/renderer-chunk-input';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {BREMEN_DEMAND_METADATA} from './bremen-demand-metadata';
import {getBREMEN_OLDTOWN70_DATA,BREMEN_OLDTOWN70_DATA_RESOURCE,BREMEN_OLDTOWN70_SHA} from './oldtown70-data';
import {getKUNSTHALLE70_DATA,KUNSTHALLE70_DATA_RESOURCE,KUNSTHALLE70_SHA} from './kunsthalle70-data';
import {F260_ACCEPTED_RESTORE_DATA_RESOURCE,F260_ACCEPTED_RESTORE_SHA} from './f260-accepted-restore-data';
import {MARKET_CAP_DATA_RESOURCE,MARKET_CAP_SHA} from './market-cap-data';
import {ORGANISTEN_DATA_RESOURCE,ORGANISTEN_SHA} from './organisten-data';
import {GLOCKE_KUESTER_DATA_RESOURCE,GLOCKE_KUESTER_SHA} from './glocke-kuester-data';

type Identity={objectId:string;partId:string};
type Receipt=Identity&{sourcePartId?:string;patchSHA256?:string;originalAcceptedAssetSHA256?:string;sourceCarrier?:Identity;geometryRole?:string};
const key=(row:Identity)=>row.objectId+'|'+row.partId;
const marker=(row:BuildingComponent,name:string)=>row.displayEstimates?.[name] as Record<string,unknown>|undefined;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);

/** Consumes producer receipts after their existing exact geometry/material
 * guards. This adapter only joins identities and owns resources; it does not
 * repeat payload validation or change a SOURCE-only partial preparation. */
export function bremenDisplayDerivations(components:readonly BuildingComponent[],source:readonly BuildingComponent[],scope:FrozenDataScope,receipts:readonly Receipt[]){
 const proofs:RendererChunkDerivation<BuildingComponent>[]=[],pins:ChunkResourceLease<unknown>[]=[];
 const receipt=(row:BuildingComponent,patch:string)=>{const sameIdentity=receipts.filter(value=>key(value)===key(row)),matches=sameIdentity.filter(value=>value.patchSHA256===patch);if(matches.length!==1)throw Error('Bremen DISPLAY has no unique verified producer receipt: '+key(row)+'; expectedPatch='+patch+'; matchingReceipts='+matches.length+'; actualPatches='+JSON.stringify(sameIdentity.map(value=>value.patchSHA256??null)));return matches[0];};
 const required=(identities:readonly Identity[])=>identities.map(identity=>{const rows=source.filter(row=>row.city==='bremen'&&key(row)===key(identity));if(rows.length!==1)throw Error('Bremen verified DISPLAY requires one complete native dependency: '+key(identity));return rows[0];});
 const displays=(identities:readonly Identity[])=>identities.map(identity=>{const rows=components.filter(row=>row.city==='bremen'&&key(row)===key(identity));if(rows.length!==1)throw Error('Bremen verified DISPLAY identity is missing or duplicated: '+key(identity));return rows[0];});
 function add(kind:string,rows:readonly BuildingComponent[],sources:readonly Identity[],refs:readonly FrozenDataRef[],detail:unknown,visibility?:RendererChunkDerivation<BuildingComponent>['visibility']){
  required(sources);const parents=refs.map(ref=>{const lease=scope.retainResource(ref,'dependency');pins.push(lease);return lease;}),authority=JSON.stringify(['bremen-verified-display-v1',kind,refs,detail]);
  proofs.push({authority,components:rows,sources,parents,frame:rendererChunkFrame(rows[0].origin,authority),explicitVisibility:!sources.length,visibility});
 }
 try{
  // These owner-reconstruction stages keep their current receipt per identity. Final
  // producers validate their predecessor's complete DISPLAY before replacing
  // it, retain the old marker, and replace (rather than append) its receipt.
  const finalRecipes=[
   {kind:'organisten-final',tag:'organistenFinal',models:BREMEN_DEMAND_METADATA.organisten.models,patch:ORGANISTEN_SHA,ref:ORGANISTEN_DATA_RESOURCE},
   {kind:'glocke-kuester-ownership',tag:'glockeKuesterOwnership',models:BREMEN_DEMAND_METADATA.kuester.models,patch:GLOCKE_KUESTER_SHA,ref:GLOCKE_KUESTER_DATA_RESOURCE},
  ],finalProducer=new Map<string,string>(),finalGroups:{recipe:typeof finalRecipes[number];rows:BuildingComponent[];identities:Identity[];roles:unknown[]}[]=[];
  const oldIdentities=new Set<string>(BREMEN_DEMAND_METADATA.oldtown.models.flatMap((model:any)=>model.displays.map(key)));
  for(const recipe of finalRecipes){
   const active=components.filter(row=>row.city==='bremen'&&marker(row,recipe.tag));if(!active.length)continue;
   const identities:Identity[]=recipe.models.map((model:any)=>model.identity),rows=displays(identities);required(identities);
   if(active.length!==rows.length)throw Error('Bremen final DISPLAY producer group mismatch: '+recipe.kind);
   const roles=rows.map(row=>{const mark=marker(row,recipe.tag),record=receipt(row,recipe.patch);
    if(mark?.patchSHA256!==recipe.patch||mark.sourceRetained!==true||typeof mark.role!=='string'||mark.role!==record.geometryRole||record.sourcePartId!==row.partId||oldIdentities.has(key(row))&&!marker(row,'infillBremenOldtown70'))throw Error('Bremen final DISPLAY producer marker mismatch: '+recipe.kind+' '+key(row));
    if(finalProducer.has(key(row)))throw Error('Bremen DISPLAY has conflicting final producers: '+key(row));finalProducer.set(key(row),recipe.patch);return[key(row),mark.role];
   });
   finalGroups.push({recipe,rows,identities,roles});
  }
  const oldRows=components.filter(row=>row.city==='bremen'&&marker(row,'infillBremenOldtown70'));
  if(oldRows.length){
   const data=getBREMEN_OLDTOWN70_DATA(scope),models=data.models as any[];
   for(const row of oldRows)if(!models.some(model=>model.displays.some((display:Identity)=>key(display)===key(row))))throw Error('Unknown Bremen Oldtown DISPLAY recipe identity');
   for(const model of models){
    const active=oldRows.filter(row=>model.displays.some((display:Identity)=>key(display)===key(row)));if(!active.length)continue;
    const rows=displays(model.displays);required(model.requiredNativeGroup);
    if(!model.geometryReadyForPreview)throw Error('Bremen Oldtown recipe is not ready for DISPLAY');
    for(const row of rows){const mark=marker(row,'infillBremenOldtown70');if(mark?.patchSHA256!==BREMEN_OLDTOWN70_SHA||mark.targetId!==model.targetId||mark.sourceAuthoritySHA256!==data.sourceAuthoritySHA256)throw Error('Bremen Oldtown DISPLAY marker mismatch');receipt(row,finalProducer.get(key(row))??(marker(row,'marketCapStone')?MARKET_CAP_SHA:BREMEN_OLDTOWN70_SHA));
     if(model.sourceBinding.nativeParentAbsent){const estimates=row.displayEstimates as Record<string,unknown>;if(estimates.sourceNativeMeshAbsent!==true||estimates.sourceRecordSHA256!==model.sourceBinding.sourceRecordSHA256||estimates.sourceAuthoritySHA256!==data.sourceAuthoritySHA256||source.some(original=>original.city==='bremen'&&key(original)===key(row)))throw Error('Bremen Oldtown absence authority mismatch');}
    }
    add('oldtown70',rows,model.requiredNativeGroup,[BREMEN_OLDTOWN70_DATA_RESOURCE],[model.targetId,BREMEN_OLDTOWN70_SHA,data.sourceAuthoritySHA256,model.sourceBinding]);
   }
  }
  const kunsthalle=components.filter(row=>row.city==='bremen'&&marker(row,'bremenKunsthalle70'));
  if(kunsthalle.length){
   const data=getKUNSTHALLE70_DATA(scope),rows=displays([BREMEN_DEMAND_METADATA.kunsthalle.derivedIdentity]);required(BREMEN_DEMAND_METADATA.kunsthalle.requiredNativeGroup);
   if(kunsthalle.length!==1||kunsthalle[0]!==rows[0])throw Error('Kunsthalle verified DISPLAY group mismatch');
   const mark=marker(rows[0],'bremenKunsthalle70');if(mark?.patchSHA256!==KUNSTHALLE70_SHA||mark.sourceAbsent!==true||mark.nativeGetterCount!==0||!same(mark.sourceCarrier,data.sourceCarrier))throw Error('Kunsthalle DISPLAY marker mismatch');
   if(source.some(row=>key(row)===key(rows[0])))throw Error('Kunsthalle DISPLAY entered native SOURCE');receipt(rows[0],KUNSTHALLE70_SHA);
   add('kunsthalle70',rows,data.requiredNativeGroup,[KUNSTHALLE70_DATA_RESOURCE],[KUNSTHALLE70_SHA,data.sourceCarrier,data.referenceSourceSHA256]);
  }
  const market=components.filter(row=>row.city==='bremen'&&marker(row,'marketCapStone'));
  if(market.length){
   const identities=BREMEN_DEMAND_METADATA.market.models.map((model:any)=>model.identity),rows=displays(identities),authority=BREMEN_DEMAND_METADATA.oldtown.sourceAuthoritySHA256;
   if(market.length!==rows.length||rows.some(row=>marker(row,'marketCapStone')?.patchSHA256!==MARKET_CAP_SHA))throw Error('Market cap verified DISPLAY group mismatch');for(const row of rows)receipt(row,MARKET_CAP_SHA);
   const sources=BREMEN_DEMAND_METADATA.oldtown.models.filter((model:any)=>model.displays.some((display:Identity)=>identities.some((identity:Identity)=>key(identity)===key(display)))).flatMap((model:any)=>model.requiredNativeGroup);
   add('market-cap',rows,sources,[MARKET_CAP_DATA_RESOURCE],[MARKET_CAP_SHA,BREMEN_OLDTOWN70_SHA,authority],rows.map(row=>({identity:row,sources:BREMEN_DEMAND_METADATA.oldtown.models.find((model:any)=>model.displays.some((display:Identity)=>key(display)===key(row))).requiredNativeGroup})));
  }
  // Preserve predecessor resources, then add the final complete native group
  // and recipe resource. Held rows remain proof members; only the renderer's
  // existing drawable list determines which of them receives a draw span.
  for(const {recipe,rows,identities,roles}of finalGroups)add(recipe.kind,rows,identities,[recipe.ref],[recipe.patch,roles]);
  const restored=components.filter(row=>row.city==='bremen'&&marker(row,'acceptedF260Restore'));
  if(restored.length){
   const models=BREMEN_DEMAND_METADATA.f260.models,rows=displays(models.map((model:any)=>model.profile));
   if(restored.length!==rows.length)throw Error('F260 verified restore group mismatch');required(models.map((model:any)=>model.sourceCarrier));
   const certificates=rows.map((row,index)=>{const mark=marker(row,'acceptedF260Restore'),record=receipt(row,F260_ACCEPTED_RESTORE_SHA),carrier=models[index].sourceCarrier;if(mark?.patchSHA256!==F260_ACCEPTED_RESTORE_SHA||mark.nativeSOURCE!==false||mark.acceptedHistoricalDISPLAY!==true||!mark.sourceCarrier||key(mark.sourceCarrier as Identity)!==key(carrier)||!record.sourceCarrier||key(record.sourceCarrier)!==key(carrier)||mark.originalAssetSHA256!==record.originalAcceptedAssetSHA256)throw Error('F260 verified restore receipt mismatch');return record;});
   add('f260-accepted-restore',rows,models.map((model:any)=>model.sourceCarrier),[F260_ACCEPTED_RESTORE_DATA_RESOURCE],certificates.map(certificate=>[certificate.patchSHA256,certificate.originalAcceptedAssetSHA256,certificate.sourceCarrier]),models.map((model:any)=>({identity:model.profile,sources:[model.sourceCarrier]})));
  }
  return{proofs,release(){for(const pin of pins.splice(0))pin.release();}};
 }catch(error){for(const pin of pins)pin.release();throw error;}
}
