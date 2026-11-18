import type {BuildingComponent} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import * as metadata from './bremen-infill-owner-metadata';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {InfillDataModule} from './infill-data-contract';
import {prepareInfillOwnerModule} from './infill-owner-preparation';

type OwnerInitializationWait=<T>(operation:Promise<T>)=>Promise<T>;
const identityWait:OwnerInitializationWait=operation=>operation;

/** Preserve module-specific public signatures and keep original data imports behind preparation. */
function createModuleRoute<Module extends object>(label:string,cities:readonly string[],load:()=>Promise<Module>){
 let ready:Module|undefined,pending:Promise<Module>|undefined;
 async function prepareModule(signal:AbortSignal,wait:OwnerInitializationWait=identityWait){
  signal.throwIfAborted();let value=ready;
  if(!value){
   if(!pending){const next=Promise.resolve().then(load);pending=next;void next.catch(()=>{if(pending===next)pending=undefined;});}
   const operation=wait(pending);
   value=await new Promise<Module>((resolve,reject)=>{
    let done=false;const cleanup=()=>{if(done)return false;done=true;signal.removeEventListener('abort',cancel);return true;};
    const cancel=()=>{if(cleanup())reject(signal.reason??new DOMException('Aborted','AbortError'));};
    signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
    operation.then(value=>{if(cleanup())resolve(value);},error=>{if(cleanup())reject(error);});
   });
   signal.throwIfAborted();ready=value;
  }
  return value;
 }
 async function prepare(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,wait:OwnerInitializationWait=identityWait){
  const value=await prepareModule(signal,wait);
  // Immutable module code can be shared; every batch prepares its own scope.
  await prepareInfillOwnerModule(value as unknown as InfillDataModule,components,signal,scope);
  signal.throwIfAborted();
 }
 function forComponents(components:readonly {city?:string}[]){
  if(ready){const candidate=(ready as unknown as InfillDataModule).mayMatchInfillData;return candidate?.(components as readonly BuildingComponent[])===false?undefined:ready;}
  if(components.some(component=>component.city!==undefined&&cities.includes(component.city)))throw Error(label+' owner route was not prepared for this city');
 }
 return{cities,prepare,prepareModule,forComponents,get:()=>ready};
}
function noMatchReconstruction(components:BuildingComponent[],copy:boolean){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 return{components:copy?components.map(component=>component):components,stats};
}

const route0=createModuleRoute("infill-silberturm-full051-reconstruction.ts",["frankfurt"],()=>import('./infill-silberturm-full051-reconstruction'));
export const infillSilberturmIdentity=metadata.infillSilberturmFull051ReconstructionMetadata.infillSilberturmIdentity as typeof import('./infill-silberturm-full051-reconstruction')['infillSilberturmIdentity'];
export const silberturmFullReconstruction051:typeof import('./infill-silberturm-full051-reconstruction')['silberturmFullReconstruction051']=(...args)=>{const module=route0.forComponents(args[0]);return module?module.silberturmFullReconstruction051(...args):noMatchReconstruction(args[0],false);};

const route1=createModuleRoute("infill-silberturm-full051-materials.ts",["frankfurt"],()=>import('./infill-silberturm-full051-materials'));
export const silberturmSpecificMaterials050:typeof import('./infill-silberturm-full051-materials')['silberturmSpecificMaterials050']=(...args)=>{const module=route1.forComponents(args[0]);return module?module.silberturmSpecificMaterials050(...args):{objects:0,vertices:0,reason:'complete exact crown-repaired group required',actualVisualAccepted:false};};

const route2=createModuleRoute("infill-omniturm.ts",["frankfurt"],()=>import('./infill-omniturm'));
export const infillOmniturmIdentity=metadata.infillOmniturmMetadata.infillOmniturmIdentity as typeof import('./infill-omniturm')['infillOmniturmIdentity'];
export const infillOmniturmReconstruction:typeof import('./infill-omniturm')['infillOmniturmReconstruction']=(...args)=>{const module=route2.forComponents(args[0]);return module?module.infillOmniturmReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillOmniturmBaseMaterials=metadata.infillOmniturmMetadata.infillOmniturmBaseMaterials as typeof import('./infill-omniturm')['infillOmniturmBaseMaterials'];

const route3=createModuleRoute("marienturm-specific.ts",["frankfurt"],()=>import('./marienturm-specific'));
export const marienturm050Identity=metadata.marienturmSpecificMetadata.marienturm050Identity as typeof import('./marienturm-specific')['marienturm050Identity'];
export const marienturm050Reconstruction:typeof import('./marienturm-specific')['marienturm050Reconstruction']=(...args)=>{const module=route3.forComponents(args[0]);return module?module.marienturm050Reconstruction(...args):noMatchReconstruction(args[0],false);};
export const marienturm050BaseMaterials=metadata.marienturmSpecificMetadata.marienturm050BaseMaterials as typeof import('./marienturm-specific')['marienturm050BaseMaterials'];

const route4=createModuleRoute("infill-c032-original-runtime.ts",["essen"],()=>import('./infill-c032-original-runtime'));
export const infillC032OriginalIdentity=metadata.infillC032OriginalRuntimeMetadata.infillC032OriginalIdentity as typeof import('./infill-c032-original-runtime')['infillC032OriginalIdentity'];
export const infillC032OriginalBaseMaterials:typeof import('./infill-c032-original-runtime')['infillC032OriginalBaseMaterials']=(...args)=>{const module=route4.forComponents(args[0]);return module?module.infillC032OriginalBaseMaterials(...args):{objects:0,vertices:0,restoredExistingAcceptedStyle:true,actualVisualAccepted:false};};
export const infillC032OriginalStatus:typeof import('./infill-c032-original-runtime')['infillC032OriginalStatus']=(...args)=>{const module=route4.get();return module?module.infillC032OriginalStatus(...args):[];};
export const infillC032OriginalRejections:typeof import('./infill-c032-original-runtime')['infillC032OriginalRejections']=(...args)=>{const module=route4.get();return module?module.infillC032OriginalRejections(...args):[];};

const route5=createModuleRoute("infill-c032-official-runtime.ts",["essen"],()=>import('./infill-c032-official-runtime'));
export const INFILL_C032_OFFICIAL_SHA=metadata.infillC032OfficialRuntimeMetadata.INFILL_C032_OFFICIAL_SHA as typeof import('./infill-c032-official-runtime')['INFILL_C032_OFFICIAL_SHA'];
export const infillC032OfficialIdentity=metadata.infillC032OfficialRuntimeMetadata.infillC032OfficialIdentity as typeof import('./infill-c032-official-runtime')['infillC032OfficialIdentity'];
export const infillC032OfficialReconstruction:typeof import('./infill-c032-official-runtime')['infillC032OfficialReconstruction']=(...args)=>{const module=route5.forComponents(args[0]);return module?module.infillC032OfficialReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillC032OfficialBaseMaterials=metadata.infillC032OfficialRuntimeMetadata.infillC032OfficialBaseMaterials as typeof import('./infill-c032-official-runtime')['infillC032OfficialBaseMaterials'];

const route6=createModuleRoute("infill-frankfurt-bockenheimer084.ts",["frankfurt"],()=>import('./infill-frankfurt-bockenheimer084'));
export const infillFrankfurtBockenheimer084Identity=metadata.infillFrankfurtBockenheimer084Metadata.infillFrankfurtBockenheimer084Identity as typeof import('./infill-frankfurt-bockenheimer084')['infillFrankfurtBockenheimer084Identity'];
export const infillFrankfurtBockenheimer084Reconstruction:typeof import('./infill-frankfurt-bockenheimer084')['infillFrankfurtBockenheimer084Reconstruction']=(...args)=>{const module=route6.forComponents(args[0]);return module?module.infillFrankfurtBockenheimer084Reconstruction(...args):noMatchReconstruction(args[0],true);};
export const infillFrankfurtBockenheimer084BaseMaterials=metadata.infillFrankfurtBockenheimer084Metadata.infillFrankfurtBockenheimer084BaseMaterials as typeof import('./infill-frankfurt-bockenheimer084')['infillFrankfurtBockenheimer084BaseMaterials'];

const route7=createModuleRoute("infill-stuttgart-eberhard-historical.ts",["stuttgart"],()=>import('./infill-stuttgart-eberhard-historical'));
export const infillEberhardHistoricalIdentity=metadata.infillStuttgartEberhardHistoricalMetadata.infillEberhardHistoricalIdentity as typeof import('./infill-stuttgart-eberhard-historical')['infillEberhardHistoricalIdentity'];
export const infillEberhardHistoricalReconstruction:typeof import('./infill-stuttgart-eberhard-historical')['infillEberhardHistoricalReconstruction']=(...args)=>{const module=route7.forComponents(args[0]);return module?module.infillEberhardHistoricalReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillEberhardHistoricalBaseMaterials=metadata.infillStuttgartEberhardHistoricalMetadata.infillEberhardHistoricalBaseMaterials as typeof import('./infill-stuttgart-eberhard-historical')['infillEberhardHistoricalBaseMaterials'];

const route8=createModuleRoute("infill-goethe34.ts",["frankfurt"],()=>import('./infill-goethe34'));
export const infillGoethe34Identity=metadata.infillGoethe34Metadata.infillGoethe34Identity as typeof import('./infill-goethe34')['infillGoethe34Identity'];
export const infillGoethe34Reconstruction:typeof import('./infill-goethe34')['infillGoethe34Reconstruction']=(...args)=>{const module=route8.forComponents(args[0]);return module?module.infillGoethe34Reconstruction(...args):noMatchReconstruction(args[0],true);};
export const infillGoethe34BaseMaterials=metadata.infillGoethe34Metadata.infillGoethe34BaseMaterials as typeof import('./infill-goethe34')['infillGoethe34BaseMaterials'];

const route9=createModuleRoute("infill-frankfurt-kettenhof065.ts",["frankfurt"],()=>import('./infill-frankfurt-kettenhof065'));
export const infillFrankfurtKettenhof065Identity=metadata.infillFrankfurtKettenhof065Metadata.infillFrankfurtKettenhof065Identity as typeof import('./infill-frankfurt-kettenhof065')['infillFrankfurtKettenhof065Identity'];
export const infillFrankfurtKettenhof065Reconstruction:typeof import('./infill-frankfurt-kettenhof065')['infillFrankfurtKettenhof065Reconstruction']=(...args)=>{const module=route9.forComponents(args[0]);return module?module.infillFrankfurtKettenhof065Reconstruction(...args):noMatchReconstruction(args[0],true);};
export const infillFrankfurtKettenhof065BaseMaterials=metadata.infillFrankfurtKettenhof065Metadata.infillFrankfurtKettenhof065BaseMaterials as typeof import('./infill-frankfurt-kettenhof065')['infillFrankfurtKettenhof065BaseMaterials'];

const route10=createModuleRoute("infill-frankfurt-vci051.ts",["frankfurt"],()=>import('./infill-frankfurt-vci051'));
export const infillFrankfurtVCI051Identity=metadata.infillFrankfurtVci051Metadata.infillFrankfurtVCI051Identity as typeof import('./infill-frankfurt-vci051')['infillFrankfurtVCI051Identity'];
export const infillFrankfurtVCI051Reconstruction:typeof import('./infill-frankfurt-vci051')['infillFrankfurtVCI051Reconstruction']=(...args)=>{const module=route10.forComponents(args[0]);return module?module.infillFrankfurtVCI051Reconstruction(...args):noMatchReconstruction(args[0],true);};
export const infillFrankfurtVCI051BaseMaterials=metadata.infillFrankfurtVci051Metadata.infillFrankfurtVCI051BaseMaterials as typeof import('./infill-frankfurt-vci051')['infillFrankfurtVCI051BaseMaterials'];

const route11=createModuleRoute("infill-frankfurt-ml41-signaris.ts",["frankfurt"],()=>import('./infill-frankfurt-ml41-signaris'));
export const infillFrankfurtML41SignarisIdentity=metadata.infillFrankfurtMl41SignarisMetadata.infillFrankfurtML41SignarisIdentity as typeof import('./infill-frankfurt-ml41-signaris')['infillFrankfurtML41SignarisIdentity'];
export const infillFrankfurtML41SignarisReconstruction:typeof import('./infill-frankfurt-ml41-signaris')['infillFrankfurtML41SignarisReconstruction']=(...args)=>{const module=route11.forComponents(args[0]);return module?module.infillFrankfurtML41SignarisReconstruction(...args):noMatchReconstruction(args[0],true);};
export const infillFrankfurtML41SignarisBaseMaterials=metadata.infillFrankfurtMl41SignarisMetadata.infillFrankfurtML41SignarisBaseMaterials as typeof import('./infill-frankfurt-ml41-signaris')['infillFrankfurtML41SignarisBaseMaterials'];

const route12=createModuleRoute("infill-schneider076.ts",["frankfurt"],()=>import('./infill-schneider076'));
export const infillSchneider076Identity=metadata.infillSchneider076Metadata.infillSchneider076Identity as typeof import('./infill-schneider076')['infillSchneider076Identity'];
export const infillSchneider076Reconstruction:typeof import('./infill-schneider076')['infillSchneider076Reconstruction']=(...args)=>{const module=route12.forComponents(args[0]);return module?module.infillSchneider076Reconstruction(...args):noMatchReconstruction(args[0],true);};
export const infillSchneider076BaseMaterials=metadata.infillSchneider076Metadata.infillSchneider076BaseMaterials as typeof import('./infill-schneider076')['infillSchneider076BaseMaterials'];

const route13=createModuleRoute("infill-frankfurt-maro74.ts",["frankfurt"],()=>import('./infill-frankfurt-maro74'));
export const infillFrankfurtMaro74Identity=metadata.infillFrankfurtMaro74Metadata.infillFrankfurtMaro74Identity as typeof import('./infill-frankfurt-maro74')['infillFrankfurtMaro74Identity'];
export const infillFrankfurtMaro74Reconstruction:typeof import('./infill-frankfurt-maro74')['infillFrankfurtMaro74Reconstruction']=(...args)=>{const module=route13.forComponents(args[0]);return module?module.infillFrankfurtMaro74Reconstruction(...args):noMatchReconstruction(args[0],true);};
export const infillFrankfurtMaro74BaseMaterials=metadata.infillFrankfurtMaro74Metadata.infillFrankfurtMaro74BaseMaterials as typeof import('./infill-frankfurt-maro74')['infillFrankfurtMaro74BaseMaterials'];

const route14=createModuleRoute("infill-frankfurt-low-office-k26.ts",["frankfurt"],()=>import('./infill-frankfurt-low-office-k26'));
export const infillFrankfurtLowOfficeK26Identity=metadata.infillFrankfurtLowOfficeK26Metadata.infillFrankfurtLowOfficeK26Identity as typeof import('./infill-frankfurt-low-office-k26')['infillFrankfurtLowOfficeK26Identity'];
export const infillFrankfurtLowOfficeK26Reconstruction:typeof import('./infill-frankfurt-low-office-k26')['infillFrankfurtLowOfficeK26Reconstruction']=(...args)=>{const module=route14.forComponents(args[0]);return module?module.infillFrankfurtLowOfficeK26Reconstruction(...args):noMatchReconstruction(args[0],true);};
export const infillFrankfurtLowOfficeK26BaseMaterials=metadata.infillFrankfurtLowOfficeK26Metadata.infillFrankfurtLowOfficeK26BaseMaterials as typeof import('./infill-frankfurt-low-office-k26')['infillFrankfurtLowOfficeK26BaseMaterials'];

const route15=createModuleRoute("infill-frankfurt-low-office-batch2.ts",["frankfurt"],()=>import('./infill-frankfurt-low-office-batch2'));
export const infillFrankfurtLowOfficeBatch2Identity=metadata.infillFrankfurtLowOfficeBatch2Metadata.infillFrankfurtLowOfficeBatch2Identity as typeof import('./infill-frankfurt-low-office-batch2')['infillFrankfurtLowOfficeBatch2Identity'];
export const infillFrankfurtLowOfficeBatch2Reconstruction:typeof import('./infill-frankfurt-low-office-batch2')['infillFrankfurtLowOfficeBatch2Reconstruction']=(...args)=>{const module=route15.forComponents(args[0]);return module?module.infillFrankfurtLowOfficeBatch2Reconstruction(...args):noMatchReconstruction(args[0],true);};
export const infillFrankfurtLowOfficeBatch2BaseMaterials=metadata.infillFrankfurtLowOfficeBatch2Metadata.infillFrankfurtLowOfficeBatch2BaseMaterials as typeof import('./infill-frankfurt-low-office-batch2')['infillFrankfurtLowOfficeBatch2BaseMaterials'];

const route16=createModuleRoute("infill-frankfurt-low-office.ts",["frankfurt"],()=>import('./infill-frankfurt-low-office'));
export const infillFrankfurtLowOfficeIdentity=metadata.infillFrankfurtLowOfficeMetadata.infillFrankfurtLowOfficeIdentity as typeof import('./infill-frankfurt-low-office')['infillFrankfurtLowOfficeIdentity'];
export const infillFrankfurtLowOfficeReconstruction:typeof import('./infill-frankfurt-low-office')['infillFrankfurtLowOfficeReconstruction']=(...args)=>{const module=route16.forComponents(args[0]);return module?module.infillFrankfurtLowOfficeReconstruction(...args):noMatchReconstruction(args[0],true);};
export const infillFrankfurtLowOfficeBaseMaterials=metadata.infillFrankfurtLowOfficeMetadata.infillFrankfurtLowOfficeBaseMaterials as typeof import('./infill-frankfurt-low-office')['infillFrankfurtLowOfficeBaseMaterials'];

const route17=createModuleRoute("infill-essen-st-johann.ts",["essen"],()=>import('./infill-essen-st-johann'));
export const INFILL_STJOHANN_SHA=metadata.infillEssenStJohannMetadata.INFILL_STJOHANN_SHA as typeof import('./infill-essen-st-johann')['INFILL_STJOHANN_SHA'];
export const infillStJohannIdentity=metadata.infillEssenStJohannMetadata.infillStJohannIdentity as typeof import('./infill-essen-st-johann')['infillStJohannIdentity'];
export const infillStJohannReconstruction:typeof import('./infill-essen-st-johann')['infillStJohannReconstruction']=(...args)=>{const module=route17.forComponents(args[0]);return module?module.infillStJohannReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillStJohannBaseMaterials=metadata.infillEssenStJohannMetadata.infillStJohannBaseMaterials as typeof import('./infill-essen-st-johann')['infillStJohannBaseMaterials'];

const route18=createModuleRoute("infill-essen-rabbinerhaus.ts",["essen"],()=>import('./infill-essen-rabbinerhaus'));
export const INFILL_RABBI_SHA=metadata.infillEssenRabbinerhausMetadata.INFILL_RABBI_SHA as typeof import('./infill-essen-rabbinerhaus')['INFILL_RABBI_SHA'];
export const infillRabbiIdentity=metadata.infillEssenRabbinerhausMetadata.infillRabbiIdentity as typeof import('./infill-essen-rabbinerhaus')['infillRabbiIdentity'];
export const infillRabbiReconstruction:typeof import('./infill-essen-rabbinerhaus')['infillRabbiReconstruction']=(...args)=>{const module=route18.forComponents(args[0]);return module?module.infillRabbiReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillRabbiBaseMaterials=metadata.infillEssenRabbinerhausMetadata.infillRabbiBaseMaterials as typeof import('./infill-essen-rabbinerhaus')['infillRabbiBaseMaterials'];

const route19=createModuleRoute("infill-stuttgart-graf-courtyard-measured.ts",["stuttgart"],()=>import('./infill-stuttgart-graf-courtyard-measured'));
export const infillGrafCourtyardMeasuredIdentity=metadata.infillStuttgartGrafCourtyardMeasuredMetadata.infillGrafCourtyardMeasuredIdentity as typeof import('./infill-stuttgart-graf-courtyard-measured')['infillGrafCourtyardMeasuredIdentity'];
export const infillGrafCourtyardMeasuredReconstruction:typeof import('./infill-stuttgart-graf-courtyard-measured')['infillGrafCourtyardMeasuredReconstruction']=(...args)=>{const module=route19.forComponents(args[0]);return module?module.infillGrafCourtyardMeasuredReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillGrafCourtyardMeasuredBaseMaterials=metadata.infillStuttgartGrafCourtyardMeasuredMetadata.infillGrafCourtyardMeasuredBaseMaterials as typeof import('./infill-stuttgart-graf-courtyard-measured')['infillGrafCourtyardMeasuredBaseMaterials'];

const route20=createModuleRoute("infill-stuttgart-graf-west-measured.ts",["stuttgart"],()=>import('./infill-stuttgart-graf-west-measured'));
export const infillGrafWestMeasuredIdentity=metadata.infillStuttgartGrafWestMeasuredMetadata.infillGrafWestMeasuredIdentity as typeof import('./infill-stuttgart-graf-west-measured')['infillGrafWestMeasuredIdentity'];
export const infillGrafWestMeasuredReconstruction:typeof import('./infill-stuttgart-graf-west-measured')['infillGrafWestMeasuredReconstruction']=(...args)=>{const module=route20.forComponents(args[0]);return module?module.infillGrafWestMeasuredReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillGrafWestMeasuredBaseMaterials=metadata.infillStuttgartGrafWestMeasuredMetadata.infillGrafWestMeasuredBaseMaterials as typeof import('./infill-stuttgart-graf-west-measured')['infillGrafWestMeasuredBaseMaterials'];

const route21=createModuleRoute("infill-frankfurt-skyper.ts",["frankfurt"],()=>import('./infill-frankfurt-skyper'));
export const infillFrankfurtSkyperIdentity=metadata.infillFrankfurtSkyperMetadata.infillFrankfurtSkyperIdentity as typeof import('./infill-frankfurt-skyper')['infillFrankfurtSkyperIdentity'];
export const infillFrankfurtSkyperReconstruction:typeof import('./infill-frankfurt-skyper')['infillFrankfurtSkyperReconstruction']=(...args)=>{const module=route21.forComponents(args[0]);return module?module.infillFrankfurtSkyperReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillFrankfurtSkyperBaseMaterials=metadata.infillFrankfurtSkyperMetadata.infillFrankfurtSkyperBaseMaterials as typeof import('./infill-frankfurt-skyper')['infillFrankfurtSkyperBaseMaterials'];

const route22=createModuleRoute("infill-frankfurt-opernturm.ts",["frankfurt"],()=>import('./infill-frankfurt-opernturm'));
export const INFILL_OPERNTURM_SHA=metadata.infillFrankfurtOpernturmMetadata.INFILL_OPERNTURM_SHA as typeof import('./infill-frankfurt-opernturm')['INFILL_OPERNTURM_SHA'];
export const infillOpernturmIdentity=metadata.infillFrankfurtOpernturmMetadata.infillOpernturmIdentity as typeof import('./infill-frankfurt-opernturm')['infillOpernturmIdentity'];
export const infillOpernturmReconstruction:typeof import('./infill-frankfurt-opernturm')['infillOpernturmReconstruction']=(...args)=>{const module=route22.forComponents(args[0]);return module?module.infillOpernturmReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillOpernturmBaseMaterials=metadata.infillFrankfurtOpernturmMetadata.infillOpernturmBaseMaterials as typeof import('./infill-frankfurt-opernturm')['infillOpernturmBaseMaterials'];

const route23=createModuleRoute("infill-frankfurt-spin.ts",["frankfurt"],()=>import('./infill-frankfurt-spin'));
export const infillFrankfurtSpinIdentity=metadata.infillFrankfurtSpinMetadata.infillFrankfurtSpinIdentity as typeof import('./infill-frankfurt-spin')['infillFrankfurtSpinIdentity'];
export const infillFrankfurtSpinReconstruction:typeof import('./infill-frankfurt-spin')['infillFrankfurtSpinReconstruction']=(...args)=>{const module=route23.forComponents(args[0]);return module?module.infillFrankfurtSpinReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillFrankfurtSpinBaseMaterials=metadata.infillFrankfurtSpinMetadata.infillFrankfurtSpinBaseMaterials as typeof import('./infill-frankfurt-spin')['infillFrankfurtSpinBaseMaterials'];

const route24=createModuleRoute("infill-frankfurt-one.ts",["frankfurt"],()=>import('./infill-frankfurt-one'));
export const INFILL_ONE_SHA=metadata.infillFrankfurtOneMetadata.INFILL_ONE_SHA as typeof import('./infill-frankfurt-one')['INFILL_ONE_SHA'];
export const infillOneIdentity=metadata.infillFrankfurtOneMetadata.infillOneIdentity as typeof import('./infill-frankfurt-one')['infillOneIdentity'];
export const infillOneReconstruction:typeof import('./infill-frankfurt-one')['infillOneReconstruction']=(...args)=>{const module=route24.forComponents(args[0]);return module?module.infillOneReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillOneBaseMaterials=metadata.infillFrankfurtOneMetadata.infillOneBaseMaterials as typeof import('./infill-frankfurt-one')['infillOneBaseMaterials'];

const route25=createModuleRoute("infill-frankfurt-boersenplatz-block.ts",["frankfurt"],()=>import('./infill-frankfurt-boersenplatz-block'));
export const INFILL_BOERSENPLATZ_BLOCK_SHA=metadata.infillFrankfurtBoersenplatzBlockMetadata.INFILL_BOERSENPLATZ_BLOCK_SHA as typeof import('./infill-frankfurt-boersenplatz-block')['INFILL_BOERSENPLATZ_BLOCK_SHA'];
export const infillBoersenplatzBlockIdentity=metadata.infillFrankfurtBoersenplatzBlockMetadata.infillBoersenplatzBlockIdentity as typeof import('./infill-frankfurt-boersenplatz-block')['infillBoersenplatzBlockIdentity'];
export const infillBoersenplatzBlockReconstruction:typeof import('./infill-frankfurt-boersenplatz-block')['infillBoersenplatzBlockReconstruction']=(...args)=>{const module=route25.forComponents(args[0]);return module?module.infillBoersenplatzBlockReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillBoersenplatzBlockBaseMaterials=metadata.infillFrankfurtBoersenplatzBlockMetadata.infillBoersenplatzBlockBaseMaterials as typeof import('./infill-frankfurt-boersenplatz-block')['infillBoersenplatzBlockBaseMaterials'];

const route26=createModuleRoute("infill-frankfurt-westendgate.ts",["frankfurt"],()=>import('./infill-frankfurt-westendgate'));
export const infillFrankfurtWestendgateIdentity=metadata.infillFrankfurtWestendgateMetadata.infillFrankfurtWestendgateIdentity as typeof import('./infill-frankfurt-westendgate')['infillFrankfurtWestendgateIdentity'];
export const infillFrankfurtWestendgateReconstruction:typeof import('./infill-frankfurt-westendgate')['infillFrankfurtWestendgateReconstruction']=(...args)=>{const module=route26.forComponents(args[0]);return module?module.infillFrankfurtWestendgateReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillFrankfurtWestendgateBaseMaterials=metadata.infillFrankfurtWestendgateMetadata.infillFrankfurtWestendgateBaseMaterials as typeof import('./infill-frankfurt-westendgate')['infillFrankfurtWestendgateBaseMaterials'];

const route27=createModuleRoute("infill-frankfurt-myzeil.ts",["frankfurt"],()=>import('./infill-frankfurt-myzeil'));
export const INFILL_MYZEIL_SHA=metadata.infillFrankfurtMyzeilMetadata.INFILL_MYZEIL_SHA as typeof import('./infill-frankfurt-myzeil')['INFILL_MYZEIL_SHA'];
export const infillMyzeilIdentity=metadata.infillFrankfurtMyzeilMetadata.infillMyzeilIdentity as typeof import('./infill-frankfurt-myzeil')['infillMyzeilIdentity'];
export const infillMyzeilReconstruction:typeof import('./infill-frankfurt-myzeil')['infillMyzeilReconstruction']=(...args)=>{const module=route27.forComponents(args[0]);return module?module.infillMyzeilReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillMyzeilBaseMaterials=metadata.infillFrankfurtMyzeilMetadata.infillMyzeilBaseMaterials as typeof import('./infill-frankfurt-myzeil')['infillMyzeilBaseMaterials'];

const route28=createModuleRoute("infill-frankfurt-nextower.ts",["frankfurt"],()=>import('./infill-frankfurt-nextower'));
export const infillFrankfurtNextowerIdentity=metadata.infillFrankfurtNextowerMetadata.infillFrankfurtNextowerIdentity as typeof import('./infill-frankfurt-nextower')['infillFrankfurtNextowerIdentity'];
export const infillFrankfurtNextowerReconstruction:typeof import('./infill-frankfurt-nextower')['infillFrankfurtNextowerReconstruction']=(...args)=>{const module=route28.forComponents(args[0]);return module?module.infillFrankfurtNextowerReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillFrankfurtNextowerBaseMaterials=metadata.infillFrankfurtNextowerMetadata.infillFrankfurtNextowerBaseMaterials as typeof import('./infill-frankfurt-nextower')['infillFrankfurtNextowerBaseMaterials'];

const route29=createModuleRoute("infill-frankfurt-deutsche-bank.ts",["frankfurt"],()=>import('./infill-frankfurt-deutsche-bank'));
export const infillFrankfurtDeutscheBankIdentity=metadata.infillFrankfurtDeutscheBankMetadata.infillFrankfurtDeutscheBankIdentity as typeof import('./infill-frankfurt-deutsche-bank')['infillFrankfurtDeutscheBankIdentity'];
export const infillFrankfurtDeutscheBankReconstruction:typeof import('./infill-frankfurt-deutsche-bank')['infillFrankfurtDeutscheBankReconstruction']=(...args)=>{const module=route29.forComponents(args[0]);return module?module.infillFrankfurtDeutscheBankReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillFrankfurtDeutscheBankBaseMaterials=metadata.infillFrankfurtDeutscheBankMetadata.infillFrankfurtDeutscheBankBaseMaterials as typeof import('./infill-frankfurt-deutsche-bank')['infillFrankfurtDeutscheBankBaseMaterials'];

const route30=createModuleRoute("infill-frankfurt-westend1.ts",["frankfurt"],()=>import('./infill-frankfurt-westend1'));
export const INFILL_WESTEND1_SHA=metadata.infillFrankfurtWestend1Metadata.INFILL_WESTEND1_SHA as typeof import('./infill-frankfurt-westend1')['INFILL_WESTEND1_SHA'];
export const infillWestend1Identity=metadata.infillFrankfurtWestend1Metadata.infillWestend1Identity as typeof import('./infill-frankfurt-westend1')['infillWestend1Identity'];
export const infillWestend1Reconstruction:typeof import('./infill-frankfurt-westend1')['infillWestend1Reconstruction']=(...args)=>{const module=route30.forComponents(args[0]);return module?module.infillWestend1Reconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillWestend1BaseMaterials=metadata.infillFrankfurtWestend1Metadata.infillWestend1BaseMaterials as typeof import('./infill-frankfurt-westend1')['infillWestend1BaseMaterials'];

const route31=createModuleRoute("infill-frankfurt-trianon.ts",["frankfurt"],()=>import('./infill-frankfurt-trianon'));
export const infillFrankfurtTrianonIdentity=metadata.infillFrankfurtTrianonMetadata.infillFrankfurtTrianonIdentity as typeof import('./infill-frankfurt-trianon')['infillFrankfurtTrianonIdentity'];
export const infillFrankfurtTrianonReconstruction:typeof import('./infill-frankfurt-trianon')['infillFrankfurtTrianonReconstruction']=(...args)=>{const module=route31.forComponents(args[0]);return module?module.infillFrankfurtTrianonReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillFrankfurtTrianonBaseMaterials=metadata.infillFrankfurtTrianonMetadata.infillFrankfurtTrianonBaseMaterials as typeof import('./infill-frankfurt-trianon')['infillFrankfurtTrianonBaseMaterials'];

const route32=createModuleRoute("infill-frankfurt-fbc.ts",["frankfurt"],()=>import('./infill-frankfurt-fbc'));
export const infillFrankfurtFbcIdentity=metadata.infillFrankfurtFbcMetadata.infillFrankfurtFbcIdentity as typeof import('./infill-frankfurt-fbc')['infillFrankfurtFbcIdentity'];
export const infillFrankfurtFbcReconstruction:typeof import('./infill-frankfurt-fbc')['infillFrankfurtFbcReconstruction']=(...args)=>{const module=route32.forComponents(args[0]);return module?module.infillFrankfurtFbcReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillFrankfurtFbcBaseMaterials=metadata.infillFrankfurtFbcMetadata.infillFrankfurtFbcBaseMaterials as typeof import('./infill-frankfurt-fbc')['infillFrankfurtFbcBaseMaterials'];

const route33=createModuleRoute("infill-frankfurt-tower185.ts",["frankfurt"],()=>import('./infill-frankfurt-tower185'));
export const INFILL_TOWER185_SHA=metadata.infillFrankfurtTower185Metadata.INFILL_TOWER185_SHA as typeof import('./infill-frankfurt-tower185')['INFILL_TOWER185_SHA'];
export const infillTower185Identity=metadata.infillFrankfurtTower185Metadata.infillTower185Identity as typeof import('./infill-frankfurt-tower185')['infillTower185Identity'];
export const infillTower185Reconstruction:typeof import('./infill-frankfurt-tower185')['infillTower185Reconstruction']=(...args)=>{const module=route33.forComponents(args[0]);return module?module.infillTower185Reconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillTower185BaseMaterials=metadata.infillFrankfurtTower185Metadata.infillTower185BaseMaterials as typeof import('./infill-frankfurt-tower185')['infillTower185BaseMaterials'];

const route34=createModuleRoute("infill-frankfurt-boerse.ts",["frankfurt"],()=>import('./infill-frankfurt-boerse'));
export const INFILL_BOERSE_SHA=metadata.infillFrankfurtBoerseMetadata.INFILL_BOERSE_SHA as typeof import('./infill-frankfurt-boerse')['INFILL_BOERSE_SHA'];
export const infillBoerseIdentity=metadata.infillFrankfurtBoerseMetadata.infillBoerseIdentity as typeof import('./infill-frankfurt-boerse')['infillBoerseIdentity'];
export const infillBoerseReconstruction:typeof import('./infill-frankfurt-boerse')['infillBoerseReconstruction']=(...args)=>{const module=route34.forComponents(args[0]);return module?module.infillBoerseReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillBoerseBaseMaterials=metadata.infillFrankfurtBoerseMetadata.infillBoerseBaseMaterials as typeof import('./infill-frankfurt-boerse')['infillBoerseBaseMaterials'];

const route35=createModuleRoute("infill-stuttgart-graf-geiss.ts",["stuttgart"],()=>import('./infill-stuttgart-graf-geiss'));
export const infillGrafGeissIdentity=metadata.infillStuttgartGrafGeissMetadata.infillGrafGeissIdentity as typeof import('./infill-stuttgart-graf-geiss')['infillGrafGeissIdentity'];
export const infillGrafGeissReconstruction:typeof import('./infill-stuttgart-graf-geiss')['infillGrafGeissReconstruction']=(...args)=>{const module=route35.forComponents(args[0]);return module?module.infillGrafGeissReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillGrafGeissBaseMaterials=metadata.infillStuttgartGrafGeissMetadata.infillGrafGeissBaseMaterials as typeof import('./infill-stuttgart-graf-geiss')['infillGrafGeissBaseMaterials'];

const route36=createModuleRoute("infill-stuttgart-graf-rear.ts",["stuttgart"],()=>import('./infill-stuttgart-graf-rear'));
export const infillGrafRearIdentity=metadata.infillStuttgartGrafRearMetadata.infillGrafRearIdentity as typeof import('./infill-stuttgart-graf-rear')['infillGrafRearIdentity'];
export const infillGrafRearReconstruction:typeof import('./infill-stuttgart-graf-rear')['infillGrafRearReconstruction']=(...args)=>{const module=route36.forComponents(args[0]);return module?module.infillGrafRearReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillGrafRearBaseMaterials=metadata.infillStuttgartGrafRearMetadata.infillGrafRearBaseMaterials as typeof import('./infill-stuttgart-graf-rear')['infillGrafRearBaseMaterials'];

const route37=createModuleRoute("infill-stuttgart-koenigsbau-repair.ts",["stuttgart"],()=>import('./infill-stuttgart-koenigsbau-repair'));
export const infillKoenigsbauRepairIdentity=metadata.infillStuttgartKoenigsbauRepairMetadata.infillKoenigsbauRepairIdentity as typeof import('./infill-stuttgart-koenigsbau-repair')['infillKoenigsbauRepairIdentity'];
export const infillKoenigsbauRepairReconstruction:typeof import('./infill-stuttgart-koenigsbau-repair')['infillKoenigsbauRepairReconstruction']=(...args)=>{const module=route37.forComponents(args[0]);return module?module.infillKoenigsbauRepairReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillKoenigsbauRepairBaseMaterials=metadata.infillStuttgartKoenigsbauRepairMetadata.infillKoenigsbauRepairBaseMaterials as typeof import('./infill-stuttgart-koenigsbau-repair')['infillKoenigsbauRepairBaseMaterials'];

const route38=createModuleRoute("infill-stuttgart-wlb-old.ts",["stuttgart"],()=>import('./infill-stuttgart-wlb-old'));
export const infillWlbOldIdentity=metadata.infillStuttgartWlbOldMetadata.infillWlbOldIdentity as typeof import('./infill-stuttgart-wlb-old')['infillWlbOldIdentity'];
export const infillWlbOldReconstruction:typeof import('./infill-stuttgart-wlb-old')['infillWlbOldReconstruction']=(...args)=>{const module=route38.forComponents(args[0]);return module?module.infillWlbOldReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillWlbOldBaseMaterials=metadata.infillStuttgartWlbOldMetadata.infillWlbOldBaseMaterials as typeof import('./infill-stuttgart-wlb-old')['infillWlbOldBaseMaterials'];

const route39=createModuleRoute("infill-stuttgart-wlb-extension.ts",["stuttgart"],()=>import('./infill-stuttgart-wlb-extension'));
export const infillWlbExtensionIdentity=metadata.infillStuttgartWlbExtensionMetadata.infillWlbExtensionIdentity as typeof import('./infill-stuttgart-wlb-extension')['infillWlbExtensionIdentity'];
export const infillWlbExtensionReconstruction:typeof import('./infill-stuttgart-wlb-extension')['infillWlbExtensionReconstruction']=(...args)=>{const module=route39.forComponents(args[0]);return module?module.infillWlbExtensionReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillWlbExtensionBaseMaterials=metadata.infillStuttgartWlbExtensionMetadata.infillWlbExtensionBaseMaterials as typeof import('./infill-stuttgart-wlb-extension')['infillWlbExtensionBaseMaterials'];

const route40=createModuleRoute("infill-frankfurt-ecb.ts",["frankfurt"],()=>import('./infill-frankfurt-ecb'));
export const INFILL_ECB_SHA=metadata.infillFrankfurtEcbMetadata.INFILL_ECB_SHA as typeof import('./infill-frankfurt-ecb')['INFILL_ECB_SHA'];
export const infillEcbIdentity=metadata.infillFrankfurtEcbMetadata.infillEcbIdentity as typeof import('./infill-frankfurt-ecb')['infillEcbIdentity'];
export const infillEcbReconstruction:typeof import('./infill-frankfurt-ecb')['infillEcbReconstruction']=(...args)=>{const module=route40.forComponents(args[0]);return module?module.infillEcbReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillEcbBaseMaterials=metadata.infillFrankfurtEcbMetadata.infillEcbBaseMaterials as typeof import('./infill-frankfurt-ecb')['infillEcbBaseMaterials'];

const route41=createModuleRoute("infill-frankfurt-towers.ts",["frankfurt"],()=>import('./infill-frankfurt-towers'));
export const infillFrankfurtIdentity=metadata.infillFrankfurtTowersMetadata.infillFrankfurtIdentity as typeof import('./infill-frankfurt-towers')['infillFrankfurtIdentity'];
export const infillFrankfurtReconstruction:typeof import('./infill-frankfurt-towers')['infillFrankfurtReconstruction']=(...args)=>{const module=route41.forComponents(args[0]);return module?module.infillFrankfurtReconstruction(...args):noMatchReconstruction(args[0],true);};
export const infillFrankfurtBaseMaterials=metadata.infillFrankfurtTowersMetadata.infillFrankfurtBaseMaterials as typeof import('./infill-frankfurt-towers')['infillFrankfurtBaseMaterials'];

const route42=createModuleRoute("infill-frankfurt-east.ts",["frankfurt"],()=>import('./infill-frankfurt-east'));
export const infillFrankfurtEastIdentity=metadata.infillFrankfurtEastMetadata.infillFrankfurtEastIdentity as typeof import('./infill-frankfurt-east')['infillFrankfurtEastIdentity'];
export const infillFrankfurtEastReconstruction:typeof import('./infill-frankfurt-east')['infillFrankfurtEastReconstruction']=(...args)=>{const module=route42.forComponents(args[0]);return module?module.infillFrankfurtEastReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillFrankfurtEastBaseMaterials=metadata.infillFrankfurtEastMetadata.infillFrankfurtEastBaseMaterials as typeof import('./infill-frankfurt-east')['infillFrankfurtEastBaseMaterials'];

const route43=createModuleRoute("infill-stuttgart-schauspielhaus.ts",["stuttgart"],()=>import('./infill-stuttgart-schauspielhaus'));
export const INFILL_SCHAUSPIELHAUS_SHA=metadata.infillStuttgartSchauspielhausMetadata.INFILL_SCHAUSPIELHAUS_SHA as typeof import('./infill-stuttgart-schauspielhaus')['INFILL_SCHAUSPIELHAUS_SHA'];
export const INFILL_SCHAUSPIELHAUS_IDS=metadata.infillStuttgartSchauspielhausMetadata.INFILL_SCHAUSPIELHAUS_IDS as typeof import('./infill-stuttgart-schauspielhaus')['INFILL_SCHAUSPIELHAUS_IDS'];
export const infillSchauspielhausIdentity=metadata.infillStuttgartSchauspielhausMetadata.infillSchauspielhausIdentity as typeof import('./infill-stuttgart-schauspielhaus')['infillSchauspielhausIdentity'];
export const infillSchauspielhausDerivedIdentity=metadata.infillStuttgartSchauspielhausMetadata.infillSchauspielhausDerivedIdentity as typeof import('./infill-stuttgart-schauspielhaus')['infillSchauspielhausDerivedIdentity'];
export const serializeInfillSchauspielhausDerivedReadback:typeof import('./infill-stuttgart-schauspielhaus')['serializeInfillSchauspielhausDerivedReadback']=(...args)=>{const component=args[0],module=route43.forComponents(component&&typeof component==='object'?[component as {city?:string}]:[]);return module?module.serializeInfillSchauspielhausDerivedReadback(...args):null;};
export const infillSchauspielhausReconstruction:typeof import('./infill-stuttgart-schauspielhaus')['infillSchauspielhausReconstruction']=(...args)=>{const module=route43.forComponents(args[0]);return module?module.infillSchauspielhausReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillSchauspielhausBaseMaterials=metadata.infillStuttgartSchauspielhausMetadata.infillSchauspielhausBaseMaterials as typeof import('./infill-stuttgart-schauspielhaus')['infillSchauspielhausBaseMaterials'];

const route44=createModuleRoute("infill-stuttgart-koenigsbau-passagen.ts",["stuttgart"],()=>import('./infill-stuttgart-koenigsbau-passagen'));
export const infillKoenigsbauPassagenIdentity=metadata.infillStuttgartKoenigsbauPassagenMetadata.infillKoenigsbauPassagenIdentity as typeof import('./infill-stuttgart-koenigsbau-passagen')['infillKoenigsbauPassagenIdentity'];
export const infillKoenigsbauPassagenReconstruction:typeof import('./infill-stuttgart-koenigsbau-passagen')['infillKoenigsbauPassagenReconstruction']=(...args)=>{const module=route44.forComponents(args[0]);return module?module.infillKoenigsbauPassagenReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillKoenigsbauPassagenBaseMaterials=metadata.infillStuttgartKoenigsbauPassagenMetadata.infillKoenigsbauPassagenBaseMaterials as typeof import('./infill-stuttgart-koenigsbau-passagen')['infillKoenigsbauPassagenBaseMaterials'];

const route45=createModuleRoute("infill-stuttgart-gustav.ts",["stuttgart"],()=>import('./infill-stuttgart-gustav'));
export const infillGustavIdentity=metadata.infillStuttgartGustavMetadata.infillGustavIdentity as typeof import('./infill-stuttgart-gustav')['infillGustavIdentity'];
export const infillGustavReconstruction:typeof import('./infill-stuttgart-gustav')['infillGustavReconstruction']=(...args)=>{const module=route45.forComponents(args[0]);return module?module.infillGustavReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillGustavBaseMaterials=metadata.infillStuttgartGustavMetadata.infillGustavBaseMaterials as typeof import('./infill-stuttgart-gustav')['infillGustavBaseMaterials'];

const route46=createModuleRoute("infill-stuttgart-hmdk.ts",["stuttgart"],()=>import('./infill-stuttgart-hmdk'));
export const infillHmdkIdentity=metadata.infillStuttgartHmdkMetadata.infillHmdkIdentity as typeof import('./infill-stuttgart-hmdk')['infillHmdkIdentity'];
export const infillHmdkReconstruction:typeof import('./infill-stuttgart-hmdk')['infillHmdkReconstruction']=(...args)=>{const module=route46.forComponents(args[0]);return module?module.infillHmdkReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillHmdkBaseMaterials=metadata.infillStuttgartHmdkMetadata.infillHmdkBaseMaterials as typeof import('./infill-stuttgart-hmdk')['infillHmdkBaseMaterials'];

const route47=createModuleRoute("infill-stuttgart-katharina.ts",["stuttgart"],()=>import('./infill-stuttgart-katharina'));
export const infillKatharinaIdentity=metadata.infillStuttgartKatharinaMetadata.infillKatharinaIdentity as typeof import('./infill-stuttgart-katharina')['infillKatharinaIdentity'];
export const infillKatharinaReconstruction:typeof import('./infill-stuttgart-katharina')['infillKatharinaReconstruction']=(...args)=>{const module=route47.forComponents(args[0]);return module?module.infillKatharinaReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillKatharinaBaseMaterials=metadata.infillStuttgartKatharinaMetadata.infillKatharinaBaseMaterials as typeof import('./infill-stuttgart-katharina')['infillKatharinaBaseMaterials'];

const route48=createModuleRoute("infill-philharmonie-reconstruction.ts",["essen"],()=>import('./infill-philharmonie-reconstruction'));
export const INFILL_PHILHARMONIE_SHA=metadata.infillPhilharmonieReconstructionMetadata.INFILL_PHILHARMONIE_SHA as typeof import('./infill-philharmonie-reconstruction')['INFILL_PHILHARMONIE_SHA'];
export const infillPhilharmonieIdentity=metadata.infillPhilharmonieReconstructionMetadata.infillPhilharmonieIdentity as typeof import('./infill-philharmonie-reconstruction')['infillPhilharmonieIdentity'];
export const infillPhilharmonieReconstruction:typeof import('./infill-philharmonie-reconstruction')['infillPhilharmonieReconstruction']=(...args)=>{const module=route48.forComponents(args[0]);return module?module.infillPhilharmonieReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillPhilharmonieBaseMaterials=metadata.infillPhilharmonieReconstructionMetadata.infillPhilharmonieBaseMaterials as typeof import('./infill-philharmonie-reconstruction')['infillPhilharmonieBaseMaterials'];

const route49=createModuleRoute("infill-essen-reconstruction.ts",["essen"],()=>import('./infill-essen-reconstruction'));
export const INFILL_ESSEN_SHA=metadata.infillEssenReconstructionMetadata.INFILL_ESSEN_SHA as typeof import('./infill-essen-reconstruction')['INFILL_ESSEN_SHA'];
export const infillEssenIdentity=metadata.infillEssenReconstructionMetadata.infillEssenIdentity as typeof import('./infill-essen-reconstruction')['infillEssenIdentity'];
export const infillEssenDerivedIdentity=metadata.infillEssenReconstructionMetadata.infillEssenDerivedIdentity as typeof import('./infill-essen-reconstruction')['infillEssenDerivedIdentity'];
export const serializeInfillEssenDerivedReadback:typeof import('./infill-essen-reconstruction')['serializeInfillEssenDerivedReadback']=(...args)=>{const component=args[0],module=route49.forComponents(component?[component]:[]);if(module)return module.serializeInfillEssenDerivedReadback(...args);if(component&&metadata.infillEssenReconstructionMetadata.infillEssenDerivedIdentity(component))throw Error('infill-essen-reconstruction.ts owner route was not prepared for this identity');return null;};
export const infillEssenReconstruction:typeof import('./infill-essen-reconstruction')['infillEssenReconstruction']=(...args)=>{const module=route49.forComponents(args[0]);return module?module.infillEssenReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillEssenBaseMaterials=metadata.infillEssenReconstructionMetadata.infillEssenBaseMaterials as typeof import('./infill-essen-reconstruction')['infillEssenBaseMaterials'];

const route50=createModuleRoute("infill-synagoge-reconstruction.ts",["essen"],()=>import('./infill-synagoge-reconstruction'));
export const INFILL_SYNAGOGE_SHA=metadata.infillSynagogeReconstructionMetadata.INFILL_SYNAGOGE_SHA as typeof import('./infill-synagoge-reconstruction')['INFILL_SYNAGOGE_SHA'];
export const infillSynagogeIdentity=metadata.infillSynagogeReconstructionMetadata.infillSynagogeIdentity as typeof import('./infill-synagoge-reconstruction')['infillSynagogeIdentity'];
export const infillSynagogeReconstruction:typeof import('./infill-synagoge-reconstruction')['infillSynagogeReconstruction']=(...args)=>{const module=route50.forComponents(args[0]);return module?module.infillSynagogeReconstruction(...args):noMatchReconstruction(args[0],false);};
export const infillSynagogeBaseMaterials=metadata.infillSynagogeReconstructionMetadata.infillSynagogeBaseMaterials as typeof import('./infill-synagoge-reconstruction')['infillSynagogeBaseMaterials'];

const route51=createModuleRoute('infill-frankfurt-junghof088.ts',['frankfurt'],()=>import('../../bremen/safety/infill-frankfurt-junghof088-recipe'));
export const infillFrankfurtJunghof088Identity=metadata.infillFrankfurtJunghof088Metadata.infillFrankfurtJunghof088Identity as typeof import('../../bremen/safety/infill-frankfurt-junghof088-recipe')['infillFrankfurtJunghof088Identity'];
export const infillFrankfurtJunghof088BaseMaterials=metadata.infillFrankfurtJunghof088Metadata.infillFrankfurtJunghof088BaseMaterials as typeof import('../../bremen/safety/infill-frankfurt-junghof088-recipe')['infillFrankfurtJunghof088BaseMaterials'];
export const infillFrankfurtJunghof088Reconstruction:typeof import('../../bremen/safety/infill-frankfurt-junghof088-recipe')['infillFrankfurtJunghof088Reconstruction']=(...args)=>{const module=route51.forComponents(args[0]);return module?module.infillFrankfurtJunghof088Reconstruction(...args):noMatchReconstruction(args[0],true);};

const routes=[route0,route1,route2,route3,route4,route5,route6,route7,route8,route9,route10,route11,route12,route13,route14,route15,route16,route17,route18,route19,route20,route21,route22,route23,route24,route25,route26,route27,route28,route29,route30,route31,route32,route33,route34,route35,route36,route37,route38,route39,route40,route41,route42,route43,route44,route45,route46,route47,route48,route49,route50,route51];
/** Shard discovery may warm immutable code without creating a data scope. */
export async function prepareBremenInfillOwnerRouteModules(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){
 signal.throwIfAborted();const cities=new Set(components.map(component=>component.city));
 for(const route of routes)if(route.cities.some(city=>cities.has(city)))await route.prepareModule(signal,wait);
 signal.throwIfAborted();
}
/** Code follows the original city order; each module's own exact hook selects
 * resources from these real rows. No scope or prepared resource is cached here. */
export async function prepareBremenInfillOwnerRoutes(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait,scope?:FrozenDataScope){
 signal.throwIfAborted();const cities=new Set(components.map(component=>component.city));
 for(const route of routes)if(route.cities.some(city=>cities.has(city))){
  if(!scope)throw Error('Bremen infill owner routes require a prepared batch data scope');
  await route.prepare(components,signal,scope,wait);
 }
 signal.throwIfAborted();
}

const functionRoutes:Readonly<Record<string,(typeof routes)[number]>>={
"silberturmFullReconstruction051":route0,
"silberturmSpecificMaterials050":route1,
"infillOmniturmReconstruction":route2,
"marienturm050Reconstruction":route3,
"infillC032OriginalBaseMaterials":route4,
"infillC032OriginalStatus":route4,
"infillC032OriginalRejections":route4,
"infillC032OfficialReconstruction":route5,
"infillFrankfurtBockenheimer084Reconstruction":route6,
"infillEberhardHistoricalReconstruction":route7,
"infillGoethe34Reconstruction":route8,
"infillFrankfurtKettenhof065Reconstruction":route9,
"infillFrankfurtVCI051Reconstruction":route10,
"infillFrankfurtML41SignarisReconstruction":route11,
"infillSchneider076Reconstruction":route12,
"infillFrankfurtMaro74Reconstruction":route13,
"infillFrankfurtLowOfficeK26Reconstruction":route14,
"infillFrankfurtLowOfficeBatch2Reconstruction":route15,
"infillFrankfurtLowOfficeReconstruction":route16,
"infillStJohannReconstruction":route17,
"infillRabbiReconstruction":route18,
"infillGrafCourtyardMeasuredReconstruction":route19,
"infillGrafWestMeasuredReconstruction":route20,
"infillFrankfurtSkyperReconstruction":route21,
"infillOpernturmReconstruction":route22,
"infillFrankfurtSpinReconstruction":route23,
"infillOneReconstruction":route24,
"infillBoersenplatzBlockReconstruction":route25,
"infillFrankfurtWestendgateReconstruction":route26,
"infillMyzeilReconstruction":route27,
"infillFrankfurtNextowerReconstruction":route28,
"infillFrankfurtDeutscheBankReconstruction":route29,
"infillWestend1Reconstruction":route30,
"infillFrankfurtTrianonReconstruction":route31,
"infillFrankfurtFbcReconstruction":route32,
"infillTower185Reconstruction":route33,
"infillBoerseReconstruction":route34,
"infillGrafGeissReconstruction":route35,
"infillGrafRearReconstruction":route36,
"infillKoenigsbauRepairReconstruction":route37,
"infillWlbOldReconstruction":route38,
"infillWlbExtensionReconstruction":route39,
"infillEcbReconstruction":route40,
"infillFrankfurtReconstruction":route41,
"infillFrankfurtEastReconstruction":route42,
"serializeInfillSchauspielhausDerivedReadback":route43,
"infillSchauspielhausReconstruction":route43,
"infillKoenigsbauPassagenReconstruction":route44,
"infillGustavReconstruction":route45,
"infillHmdkReconstruction":route46,
"infillKatharinaReconstruction":route47,
"infillPhilharmonieReconstruction":route48,
"serializeInfillEssenDerivedReadback":route49,
"infillEssenReconstruction":route49,
"infillSynagogeReconstruction":route50,
"infillFrankfurtJunghof088Reconstruction":route51
};
/** The ordered aggregate prepares just the recipe it is about to invoke. */
export async function prepareInfillDataForFunction(name:string,components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope){
 signal.throwIfAborted();if(name==='infillC032OriginalStatus'||name==='infillC032OriginalRejections'||name==='serializeInfillSchauspielhausDerivedReadback')return;
 const route=functionRoutes[name];if(!route)return;
 if(!components.some(component=>route.cities.includes(component.city)))return;
 await route.prepare(components,signal,scope);
 signal.throwIfAborted();
}
export const infillDataFunctionArities={"silberturmFullReconstruction051":1,"silberturmSpecificMaterials050":3,"infillOmniturmReconstruction":1,"marienturm050Reconstruction":1,"infillC032OriginalBaseMaterials":3,"infillC032OriginalStatus":0,"infillC032OriginalRejections":0,"infillC032OfficialReconstruction":1,"infillFrankfurtBockenheimer084Reconstruction":2,"infillEberhardHistoricalReconstruction":1,"infillGoethe34Reconstruction":2,"infillFrankfurtKettenhof065Reconstruction":2,"infillFrankfurtVCI051Reconstruction":2,"infillFrankfurtML41SignarisReconstruction":2,"infillSchneider076Reconstruction":2,"infillFrankfurtMaro74Reconstruction":2,"infillFrankfurtLowOfficeK26Reconstruction":2,"infillFrankfurtLowOfficeBatch2Reconstruction":2,"infillFrankfurtLowOfficeReconstruction":2,"infillStJohannReconstruction":1,"infillRabbiReconstruction":1,"infillGrafCourtyardMeasuredReconstruction":1,"infillGrafWestMeasuredReconstruction":1,"infillFrankfurtSkyperReconstruction":1,"infillOpernturmReconstruction":1,"infillFrankfurtSpinReconstruction":1,"infillOneReconstruction":1,"infillBoersenplatzBlockReconstruction":1,"infillFrankfurtWestendgateReconstruction":1,"infillMyzeilReconstruction":1,"infillFrankfurtNextowerReconstruction":1,"infillFrankfurtDeutscheBankReconstruction":1,"infillWestend1Reconstruction":1,"infillFrankfurtTrianonReconstruction":1,"infillFrankfurtFbcReconstruction":1,"infillTower185Reconstruction":1,"infillBoerseReconstruction":1,"infillGrafGeissReconstruction":1,"infillGrafRearReconstruction":1,"infillKoenigsbauRepairReconstruction":1,"infillWlbOldReconstruction":1,"infillWlbExtensionReconstruction":1,"infillEcbReconstruction":1,"infillFrankfurtReconstruction":1,"infillFrankfurtEastReconstruction":1,"infillSchauspielhausReconstruction":1,"infillKoenigsbauPassagenReconstruction":1,"infillGustavReconstruction":1,"infillHmdkReconstruction":1,"infillKatharinaReconstruction":1,"infillPhilharmonieReconstruction":1,"serializeInfillEssenDerivedReadback":2,"infillEssenReconstruction":1,"infillSynagogeReconstruction":1,"infillFrankfurtJunghof088Reconstruction":2} as const;
