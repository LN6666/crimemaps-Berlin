import type {BuildingComponent,Identity} from './building-mesh-renderer';
export type NativeMember=Identity&{leafSHA:string;geometryFingerprint:string};
export type NativePartDisplayProfile={city:string;relationId?:number;sourceOutlineGroupId?:string;name:string;indexSHA:string;sourcePBF:string;boundarySHA:string;sourceSnapshot:string;outline:NativeMember;declaredPartIds:readonly string[];compiledParts:readonly NativeMember[];missingPartIds:readonly string[];unknownPartIds:readonly string[];ownershipUnverifiedPartIds:readonly string[];completenessClaim:false;requireAllPartsResident?:true};
export type NativeDisplayBinding={city:string;indexSHA:string;sourcePBF:string;boundarySHA:string;sourceSnapshot:string;leafSHA:(c:BuildingComponent)=>string|undefined};
export type NativeGroupDisplayState={relationId?:number;sourceOutlineGroupId?:string;name:string;outline:BuildingComponent;declaredPartCount:number;compiledPartCount:number;residentPartCount:number;missingPartIds:readonly string[];unknownPartIds:readonly string[];ownershipUnverifiedPartIds:readonly string[];viewportMissingPartIds:string[];complete:false};
/** A synchronous display plan over already bounded, SHA-verified decoded leaves. Never fetches,
 * unions, clips, edits height/tags, or reassigns converter primitive ownership. */
export type NativeGroupDisplayPlan={hiddenOutlines:BuildingComponent[];groups:NativeGroupDisplayState[];errors:string[]};
const key=(c:Identity)=>c.objectId+'|'+c.partId;
const hash=(s:string)=>/^[a-f0-9]{64}$/.test(s);
const object=(s:string)=>/^osm\/(?:way|relation)\/[1-9]\d*$/.test(s);
const groupKey=(p:{relationId?:number;sourceOutlineGroupId?:string})=>p.sourceOutlineGroupId??('osm/relation/'+p.relationId);
// A named finite display grouping is not an invented OSM building relation.
const BMW_MUSEUM_ORIGINAL_PARTS=new Set(['osm/way/5216004','osm/way/163408029','osm/way/286002864','osm/way/286002866','osm/way/286002868','osm/way/286002869','osm/way/302324251','osm/way/303382182','osm/way/305310591','osm/way/1435773753','osm/way/1435773754','osm/relation/4002450']);
// Exact original office cohort; source-outline aliases are not an OSM relation.
const BMW_HEADQUARTERS_MEMBERS286:Readonly<Record<string,string>>={"osm/way/193654785":"osm/way/193654785/component/760d9f95bb2a4d60d100","osm/way/193654786":"osm/way/193654786/component/034e749f4094d03ee5ff","osm/way/193654787":"osm/way/193654787/component/e2f35cf7a2e90820d8f7","osm/way/193654788":"osm/way/193654788/component/5928034e8c5319b20487","osm/way/193654789":"osm/way/193654789/component/b8986bc75c2ff1e07535","osm/way/193654790":"osm/way/193654790/component/a8ed7bfc3d085d4d2808","osm/way/193654791":"osm/way/193654791/component/7539e99405908f66bc62","osm/way/193654792":"osm/way/193654792/component/765d8c2590927af3ebae","osm/way/193654793":"osm/way/193654793/component/f73fe7788f4719a9f81f","osm/way/193654794":"osm/way/193654794/component/7fb26e97cd79b9acea80","osm/way/193654795":"osm/way/193654795/component/40d2df199b5c13c54a69","osm/way/193654796":"osm/way/193654796/component/e93c977a102adf1a55d4","osm/way/193654797":"osm/way/193654797/component/acd9426abd738d957928","osm/way/193654798":"osm/way/193654798/component/d7c76f4c6ca589f530ab","osm/way/310279165":"osm/way/310279165/component/872b1d46c59dfe77f4c0","osm/way/310296322":"osm/way/310296322/component/7ef6efa66dd536138b8a","osm/relation/2785005":"osm/relation/2785005/component/95d6cf534c9af4ac7807","osm/relation/2785006":"osm/relation/2785006/component/95d6cf534c9af4ac7807"};
function groupIdentityValid(p:NativePartDisplayProfile){
 if(p.sourceOutlineGroupId===undefined)return Number.isSafeInteger(p.relationId)&&(p.relationId??0)>0;
 if(p.sourceOutlineGroupId==='osm/way/146381661')return p.relationId===undefined&&p.outline.objectId==='osm/way/146381661'&&p.outline.partId==='osm/way/146381661/component/95d6cf534c9af4ac7807'&&p.requireAllPartsResident===true&&p.declaredPartIds.length===18&&p.compiledParts.length===18&&p.declaredPartIds.every(id=>Object.hasOwn(BMW_HEADQUARTERS_MEMBERS286,id))&&p.compiledParts.every(m=>BMW_HEADQUARTERS_MEMBERS286[m.objectId]===m.partId&&m.leafSHA==='f2eb22d59cd182adf0e26d6dfeef65e080396069d416d9fa3ded4d780b348a18')&&!p.missingPartIds.length&&!p.unknownPartIds.length&&!p.ownershipUnverifiedPartIds.length;
 return p.relationId===undefined&&p.sourceOutlineGroupId==='osm/way/298266716'&&p.outline.objectId===p.sourceOutlineGroupId&&p.requireAllPartsResident===true&&p.declaredPartIds.length===12&&p.compiledParts.length===12&&p.declaredPartIds.every(id=>BMW_MUSEUM_ORIGINAL_PARTS.has(id))&&p.compiledParts.every(m=>BMW_MUSEUM_ORIGINAL_PARTS.has(m.objectId))&&!p.missingPartIds.length&&!p.unknownPartIds.length&&!p.ownershipUnverifiedPartIds.length;
}
export function nativePartDisplayPlan(components:readonly BuildingComponent[],profiles:readonly NativePartDisplayProfile[],binding:NativeDisplayBinding):NativeGroupDisplayPlan{
 const hiddenOutlines:BuildingComponent[]=[],groups:NativeGroupDisplayState[]=[],errors:string[]=[];
 if(profiles.length>32)throw Error('Native display profile limit');
 const loaded=new Map(components.map(c=>[key(c),c]));
 const matches=(c:BuildingComponent,m:NativeMember)=>c.city===binding.city&&key(c)===key(m)&&binding.leafSHA(c)===m.leafSHA&&c.partId.endsWith('/component/'+m.geometryFingerprint);
 for(const p of profiles){if(p.city!==binding.city)continue;
  const outline=loaded.get(key(p.outline));if(!outline)continue;
  const validMember=(m:NativeMember)=>object(m.objectId)&&m.partId.startsWith(m.objectId+'/component/')&&/^[a-f0-9]{20}$/.test(m.geometryFingerprint)&&hash(m.leafSHA);
  const declared=new Set(p.declaredPartIds),compiled=new Set(p.compiledParts.map(c=>c.objectId)),missing=new Set(p.missingPartIds);
  const valid=groupIdentityValid(p)&&p.completenessClaim===false&&p.indexSHA===binding.indexSHA&&p.sourcePBF===binding.sourcePBF&&p.boundarySHA===binding.boundarySHA&&p.sourceSnapshot===binding.sourceSnapshot&&[p.indexSHA,p.sourcePBF,p.boundarySHA].every(hash)&&validMember(p.outline)&&p.compiledParts.length<=256&&p.declaredPartIds.length<=256&&declared.size===p.declaredPartIds.length&&p.declaredPartIds.every(object)&&p.compiledParts.every(c=>validMember(c)&&declared.has(c.objectId)&&c.objectId!==p.outline.objectId)&&p.missingPartIds.every(id=>declared.has(id)&&!compiled.has(id))&&p.unknownPartIds.every(id=>missing.has(id))&&p.ownershipUnverifiedPartIds.every(id=>declared.has(id))&&[...declared].every(id=>compiled.has(id)||missing.has(id))&&matches(outline,p.outline);
  if(!valid){errors.push('Native display binding failed: '+(p.sourceOutlineGroupId??p.relationId));continue;}
  const resident=p.compiledParts.filter(m=>loaded.has(key(m)));
  if(resident.some(m=>!matches(loaded.get(key(m))!,m))){errors.push('Native member binding failed: '+(p.sourceOutlineGroupId??p.relationId));continue;}
  if(p.requireAllPartsResident&&resident.length!==p.compiledParts.length)continue;
  hiddenOutlines.push(outline);
  groups.push({...(p.sourceOutlineGroupId?{sourceOutlineGroupId:p.sourceOutlineGroupId}:{relationId:p.relationId}),name:p.name,outline,declaredPartCount:declared.size,compiledPartCount:compiled.size,residentPartCount:new Set(resident.map(m=>m.objectId)).size,missingPartIds:p.missingPartIds,unknownPartIds:p.unknownPartIds,ownershipUnverifiedPartIds:p.ownershipUnverifiedPartIds,viewportMissingPartIds:[...compiled].filter(id=>!resident.some(m=>m.objectId===id)),complete:false});
 }
 return {hiddenOutlines,groups,errors};
}
/** Ground information remains the original parent identity/geometry/properties; no surface hit. */
export function nativeOutlineGroundFeatures(plan:NativeGroupDisplayPlan){return {type:'FeatureCollection' as const,features:plan.groups.map(g=>({type:'Feature' as const,id:g.outline.partId,geometry:g.outline.componentGeometry,properties:{objectId:g.outline.objectId,partId:g.outline.partId,...(g.sourceOutlineGroupId?{sourceOutlineGroupId:g.sourceOutlineGroupId,sourceGroupKind:'finite-original-contained-parts'}:{relationId:g.relationId}),name:g.name,displayRole:'native-outline-ground',complete:false}}))};}
/** Explicit membership only; no neighbour, height or footprint inference. */
export function nativeGroupForIdentity(plan:NativeGroupDisplayPlan|undefined,profiles:readonly NativePartDisplayProfile[],identity:Identity){return plan?.groups.find(g=>{const p=profiles.find(p=>p.city===g.outline.city&&groupKey(p)===groupKey(g));return key(g.outline)===key(identity)||p?.compiledParts.some(m=>key(m)===key(identity));});}
