import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {BuildingComponent} from '../../../safety/building-mesh-types';
import {delegated500DemandClosure,type Delegated500DataIdentity} from './delegated500-data-demand';
import {PROGRESSIVE_ADMISSIONS_RESOURCE,getPROGRESSIVE_ADMISSIONS} from './progressive-paint-admissions';
import {PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE} from './progressive-feature-cities';
import {BERLIN_PROGRAM_GLSL_RESOURCE,BERLIN_PROGRAM_FAMILIES} from './progressive-berlin-programs';
import {HAMBURG_PROGRAM_GLSL_RESOURCE,HAMBURG_PROGRAM_FAMILIES} from './progressive-hamburg-programs';
import {HANNOVER_PROGRAMS822_RESOURCE} from './f340-program822';
import {FRAMES_RESOURCE,delegated500FrameIdentity as towerIdentity} from './f021-tower-paint295';
import {F_RESOURCE as f044Resource,delegated500FrameIdentity as f044Identity} from './f044-native463';
import {F_RESOURCE as f322Resource,delegated500FrameIdentity as f322Identity} from './f322-current372';
import {F_RESOURCE as f329Resource,delegated500FrameIdentity as f329Identity} from './f329-current380';
import {F_RESOURCE as f336Resource,delegated500FrameIdentity as f336Identity} from './f336-castle431';
import {SOURCE_RESOURCE,DISPLAY_RESOURCE,F231_IDS,ownerF231Identity,ownerF231SourceMatches} from './owner-f231-frozen215';
import {OWNER_SHAPE_PATCH_PROFILES} from './owner-shape-patch-profiles';
import {delegated500ProgramCatalogKeys,paintProgramPartitionEnabled} from './facade-paint-fragment';
export {delegated500ScopedFunctionArities} from './delegated500-scoped-functions';
export type {Delegated500DataIdentity} from './delegated500-data-demand';
export type PreparedDelegated500Data={input:readonly BuildingComponent[];city:string;scope:FrozenDataScope;signal:AbortSignal};
const objectKey=(row:Pick<Delegated500DataIdentity,'city'|'objectId'>)=>row.city+'|'+row.objectId;
const pair=(a:Delegated500DataIdentity,b:Delegated500DataIdentity)=>a.city===b.city&&a.objectId===b.objectId&&a.partId===b.partId;
const frames:readonly(readonly[FrozenDataRef,Delegated500DataIdentity])[]=[[FRAMES_RESOURCE,towerIdentity],[f044Resource,f044Identity],[f322Resource,f322Identity],[f329Resource,f329Identity],[f336Resource,f336Identity]];

/** First close SOURCE/owner/frames and the full admission object set. No catalogue
 * source is borrowed here, and no row index is memoized before that closure. */
export async function prepareDelegated500Data(components:readonly Delegated500DataIdentity[],city:string,signal:AbortSignal,scope:FrozenDataScope,rawComponents?:readonly BuildingComponent[]):Promise<void>{
 signal.throwIfAborted();if(!components.length)return;
 const closure=delegated500DemandClosure(components);
 await scope.prepareSelection(PROGRESSIVE_ADMISSIONS_RESOURCE,[...new Set(closure.identities.map(objectKey))],signal);
 // Existing facade metadata and source-bound certificates inspect this atomic
 // current-city-extra table; its payload and exact undefined policy are unchanged.
 await scope.prepare([PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE,...frames.filter(([,identity])=>closure.identities.some(row=>pair(row,identity))).map(([ref])=>ref)],signal);
 if(components.some(ownerF231Identity)){
  // Identity is deliberately city-agnostic. SOURCE.every remains the complete
  // original-array cohort guard; DISPLAY is acquired only if that exact guard wins.
  await scope.prepareSelection(SOURCE_RESOURCE,[...new Set(F231_IDS.map(objectKey))],signal);
  const raw=rawComponents??(components.every(row=>'batches'in row)?components as readonly BuildingComponent[]:undefined);if(!raw)throw Error('F231 source preparation requires the actual raw component cohort');
  if(ownerF231SourceMatches(raw,scope))await scope.prepareSelection(DISPLAY_RESOURCE,F231_IDS.map(row=>row.partId),signal);
 }
 signal.throwIfAborted();
}

/** Catalogue selection follows first-phase data but precedes source-dependent
 * owner/cohort certificates. Every possible original fallback in the triggered
 * cohort remains declared; no whole catalogue is loaded merely to ask routing. */
export async function prepareDelegated500Programs(components:readonly Delegated500DataIdentity[],city:string,signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();if(!components.length)return;
 const closure=delegated500DemandClosure(components),families=new Set<number>([0,...closure.families]);
 for(const profile of OWNER_SHAPE_PATCH_PROFILES){const row=profile as {city:string;objectId:string;family?:number|null};if(typeof row.family==='number'&&closure.identities.some(identity=>identity.city===row.city&&identity.objectId===row.objectId))families.add(row.family);}
 scope.assertSelection(PROGRESSIVE_ADMISSIONS_RESOURCE,closure.identities.map(objectKey));
 for(const row of getPROGRESSIVE_ADMISSIONS(scope)){if(row.family!==undefined)families.add(row.family);for(const frame of row.surfaceFrames??[])families.add(frame.family);}
 const selected=new Map<FrozenDataRef,Set<string>>();
 const add=(ref:FrozenDataRef,keys:readonly(string|undefined)[])=>{let values=selected.get(ref);if(!values)selected.set(ref,values=new Set());for(const key of keys)if(key!==undefined)values.add(key);};
 if(paintProgramPartitionEnabled(city))add(city==='berlin'?BERLIN_PROGRAM_GLSL_RESOURCE:city==='hannover'?HANNOVER_PROGRAMS822_RESOURCE:HAMBURG_PROGRAM_GLSL_RESOURCE,delegated500ProgramCatalogKeys([...families],city));
 // Berlin metadata checks F004 before component routing, and the F020 apply
 // arguments check their source before the callee can reject an unrelated row.
 if(city==='berlin')add(BERLIN_PROGRAM_GLSL_RESOURCE,[BERLIN_PROGRAM_FAMILIES['1567'],BERLIN_PROGRAM_FAMILIES['1679']]);
 // These exact owner certificates inspect the named family programs before
 // deciding DISPLAY validity. They are independent of a visible paint draw.
 // F025 route/figure guards read the shared DOM source before writing its own family.
 if(closure.modules.has('f025-dom417')||closure.modules.has('f025-figure663'))add(BERLIN_PROGRAM_GLSL_RESOURCE,[BERLIN_PROGRAM_FAMILIES['1709'],'delegated159-F025-433']);
 if(closure.modules.has('f013-entrance448'))add(BERLIN_PROGRAM_GLSL_RESOURCE,[BERLIN_PROGRAM_FAMILIES['1676'],BERLIN_PROGRAM_FAMILIES['1708'],'delegated159-F013-416']);
 if(closure.modules.has('f022-repair574'))add(BERLIN_PROGRAM_GLSL_RESOURCE,[BERLIN_PROGRAM_FAMILIES['1717'],'delegated159-F022-574']);
 if(closure.modules.has('f044-native447')||closure.modules.has('f044-native463'))add(HAMBURG_PROGRAM_GLSL_RESOURCE,[HAMBURG_PROGRAM_FAMILIES['1711']]);
 await Promise.all([...selected].map(([ref,keys])=>scope.prepareSelection(ref,[...keys],signal)));
 signal.throwIfAborted();
}
