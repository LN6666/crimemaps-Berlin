import type {BuildingComponent,Identity} from './building-mesh-renderer';
export type NativeMember=Identity&{leafSHA:string;geometryFingerprint:string};
export type NativePartDisplayProfile={city:string;relationId:number;name:string;indexSHA:string;sourcePBF:string;boundarySHA:string;sourceSnapshot:string;outline:NativeMember;declaredPartIds:readonly string[];compiledParts:readonly NativeMember[];missingPartIds:readonly string[];unknownPartIds:readonly string[];ownershipUnverifiedPartIds:readonly string[];completenessClaim:false};
export type NativeDisplayBinding={city:string;indexSHA:string;sourcePBF:string;boundarySHA:string;sourceSnapshot:string;leafSHA:(c:BuildingComponent)=>string|undefined};
export type NativeGroupDisplayState={relationId:number;name:string;outline:BuildingComponent;declaredPartCount:number;compiledPartCount:number;residentPartCount:number;missingPartIds:readonly string[];unknownPartIds:readonly string[];ownershipUnverifiedPartIds:readonly string[];viewportMissingPartIds:string[];complete:false};
/** A synchronous display plan over already bounded, SHA-verified decoded leaves. Never fetches,
 * unions, clips, edits height/tags, or reassigns converter primitive ownership. */
export type NativeGroupDisplayPlan={hiddenOutlines:BuildingComponent[];groups:NativeGroupDisplayState[];errors:string[]};
const key=(c:Identity)=>c.objectId+'|'+c.partId;
const hash=(s:string)=>/^[a-f0-9]{64}$/.test(s);
const object=(s:string)=>/^osm\/(?:way|relation)\/[1-9]\d*$/.test(s);
export function nativePartDisplayPlan(components:readonly BuildingComponent[],profiles:readonly NativePartDisplayProfile[],binding:NativeDisplayBinding):NativeGroupDisplayPlan{
 const hiddenOutlines:BuildingComponent[]=[],groups:NativeGroupDisplayState[]=[],errors:string[]=[];
 if(profiles.length>32)throw Error('Native display profile limit');
 const loaded=new Map(components.map(c=>[key(c),c]));
 const matches=(c:BuildingComponent,m:NativeMember)=>c.city===binding.city&&key(c)===key(m)&&binding.leafSHA(c)===m.leafSHA&&c.partId.endsWith('/component/'+m.geometryFingerprint);
 for(const p of profiles){if(p.city!==binding.city)continue;
  const outline=loaded.get(key(p.outline));if(!outline)continue;
  const validMember=(m:NativeMember)=>object(m.objectId)&&m.partId.startsWith(m.objectId+'/component/')&&/^[a-f0-9]{20}$/.test(m.geometryFingerprint)&&hash(m.leafSHA);
  const declared=new Set(p.declaredPartIds),compiled=new Set(p.compiledParts.map(c=>c.objectId)),missing=new Set(p.missingPartIds);
  const valid=Number.isSafeInteger(p.relationId)&&p.relationId>0&&p.completenessClaim===false&&p.indexSHA===binding.indexSHA&&p.sourcePBF===binding.sourcePBF&&p.boundarySHA===binding.boundarySHA&&p.sourceSnapshot===binding.sourceSnapshot&&[p.indexSHA,p.sourcePBF,p.boundarySHA].every(hash)&&validMember(p.outline)&&p.compiledParts.length<=256&&p.declaredPartIds.length<=256&&declared.size===p.declaredPartIds.length&&p.declaredPartIds.every(object)&&p.compiledParts.every(c=>validMember(c)&&declared.has(c.objectId)&&c.objectId!==p.outline.objectId)&&p.missingPartIds.every(id=>declared.has(id)&&!compiled.has(id))&&p.unknownPartIds.every(id=>missing.has(id))&&p.ownershipUnverifiedPartIds.every(id=>declared.has(id))&&[...declared].every(id=>compiled.has(id)||missing.has(id))&&matches(outline,p.outline);
  if(!valid){errors.push('Native display binding failed: '+p.relationId);continue;}
  const resident=p.compiledParts.filter(m=>loaded.has(key(m)));
  if(resident.some(m=>!matches(loaded.get(key(m))!,m))){errors.push('Native member binding failed: '+p.relationId);continue;}
  hiddenOutlines.push(outline);
  groups.push({relationId:p.relationId,name:p.name,outline,declaredPartCount:declared.size,compiledPartCount:compiled.size,residentPartCount:new Set(resident.map(m=>m.objectId)).size,missingPartIds:p.missingPartIds,unknownPartIds:p.unknownPartIds,ownershipUnverifiedPartIds:p.ownershipUnverifiedPartIds,viewportMissingPartIds:[...compiled].filter(id=>!resident.some(m=>m.objectId===id)),complete:false});
 }
 return {hiddenOutlines,groups,errors};
}
/** Ground information remains the original parent identity/geometry/properties; no surface hit. */
export function nativeOutlineGroundFeatures(plan:NativeGroupDisplayPlan){return {type:'FeatureCollection' as const,features:plan.groups.map(g=>({type:'Feature' as const,id:g.outline.partId,geometry:g.outline.componentGeometry,properties:{objectId:g.outline.objectId,partId:g.outline.partId,relationId:g.relationId,name:g.name,displayRole:'native-outline-ground',complete:false}}))};}
/** Explicit membership only; no neighbour, height or footprint inference. */
export function nativeGroupForIdentity(plan:NativeGroupDisplayPlan|undefined,profiles:readonly NativePartDisplayProfile[],identity:Identity){return plan?.groups.find(g=>{const p=profiles.find(p=>p.city===g.outline.city&&p.relationId===g.relationId);return key(g.outline)===key(identity)||p?.compiledParts.some(m=>key(m)===key(identity));});}
