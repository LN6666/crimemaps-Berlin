import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {nativePaintSignature} from './progressive-native-signature';
export type SourceEdgeMember=Identity&{leafSHA:string;geometryFingerprint:string;nativePaintSignature:string};
export type SourceEdgeAssemblyProfile={city:string;groupIdentity:string;name:string;indexSHA:string;sourcePBF:string;boundarySHA:string;sourceSnapshot:string;outline:SourceEdgeMember;parts:readonly SourceEdgeMember[];sourceRowsSHA:string;edgeProofSHA:string;parentEdges:readonly{nodes:readonly[number,number];matchedBy:readonly string[]}[];sameBuildingVerified:true;formalRelationMembership:false;completenessClaim:false};
export type SourceEdgeAssemblyBinding={city:string;indexSHA:string;sourcePBF:string;boundarySHA:string;sourceSnapshot:string;leafSHA:(c:BuildingComponent)=>string|undefined;materialReady:(c:BuildingComponent)=>boolean};
export type SourceEdgeAssemblyDisplayPlan={hiddenOutlines:BuildingComponent[];groups:{groupIdentity:string;name:string;outline:BuildingComponent;parts:BuildingComponent[];complete:false}[];errors:string[]};
const key=(c:Identity)=>c.objectId+'|'+c.partId;
const sha=(s:string)=>/^[a-f0-9]{64}$/.test(s);
const way=(s:string)=>/^osm\/way\/[1-9]\d*$/.test(s);
/** Reviewed exact-source-node way assemblies only. No formal relation inference, fetching,
 * clipping, vertex edits, height changes, or cache removal. Missing member fails closed. */
export function sourceEdgeAssemblyDisplayPlan(components:readonly BuildingComponent[],profiles:readonly SourceEdgeAssemblyProfile[],binding:SourceEdgeAssemblyBinding):SourceEdgeAssemblyDisplayPlan{
 const plan:SourceEdgeAssemblyDisplayPlan={hiddenOutlines:[],groups:[],errors:[]};
 if(profiles.length>16)throw Error('Source edge assembly profile limit');
 const loaded=new Map<string,BuildingComponent>(),duplicates=new Set<string>();
 for(const c of components){const k=key(c);if(loaded.has(k))duplicates.add(k);else loaded.set(k,c);}
 const seenGroups=new Set<string>(),groupCounts=new Map<string,number>();
 for(const p of profiles)if(p.city===binding.city)groupCounts.set(p.groupIdentity,(groupCounts.get(p.groupIdentity)??0)+1);
 for(const p of profiles){
  if(p.city!==binding.city)continue;
  const outline=loaded.get(key(p.outline));if(!outline)continue;
  const fail=(reason:string)=>plan.errors.push('Source edge assembly '+p.groupIdentity+': '+reason);
  const validMember=(m:SourceEdgeMember)=>way(m.objectId)&&m.partId===m.objectId+'/component/'+m.geometryFingerprint&&/^[a-f0-9]{20}$/.test(m.geometryFingerprint)&&sha(m.leafSHA)&&/^[a-f0-9]{8}$/.test(m.nativePaintSignature);
  const partIds=new Set(p.parts.map(m=>m.objectId)),memberKeys=new Set([key(p.outline),...p.parts.map(key)]);
  const edges=new Set<string>();let edgeProofValid=p.parentEdges.length>=3&&p.parentEdges.length<=2048;
  for(const e of p.parentEdges){const[a,b]=e.nodes,k=a<b?a+'|'+b:b+'|'+a;
   if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<=0||b<=0||a===b||edges.has(k)||e.matchedBy.length<1||e.matchedBy.some(id=>!partIds.has(id)))edgeProofValid=false;edges.add(k);}
  if(groupCounts.get(p.groupIdentity)!==1||seenGroups.has(p.groupIdentity)||!way(p.groupIdentity)||p.groupIdentity!==p.outline.objectId||!p.sameBuildingVerified||p.formalRelationMembership!==false||p.completenessClaim!==false||p.parts.length<1||p.parts.length>64||partIds.size!==p.parts.length||memberKeys.size!==p.parts.length+1||!validMember(p.outline)||!p.parts.every(validMember)||!edgeProofValid||![p.indexSHA,p.sourcePBF,p.boundarySHA,p.sourceRowsSHA,p.edgeProofSHA].every(sha)||p.indexSHA!==binding.indexSHA||p.sourcePBF!==binding.sourcePBF||p.boundarySHA!==binding.boundarySHA||p.sourceSnapshot!==binding.sourceSnapshot){fail('profile/source binding failed');continue;}
  seenGroups.add(p.groupIdentity);
  const exact=(c:BuildingComponent,m:SourceEdgeMember)=>c.city===p.city&&!duplicates.has(key(m))&&binding.leafSHA(c)===m.leafSHA&&nativePaintSignature(c)===m.nativePaintSignature;
  if(!exact(outline,p.outline)){fail('outline hash/native signature failed');continue;}
  const parts:BuildingComponent[]=[];let failed=false;
  for(const m of p.parts){const c=loaded.get(key(m));if(!c||!exact(c,m)||!binding.materialReady(c)){failed=true;break;}parts.push(c);}
  if(failed||parts.length!==p.parts.length){fail('all original parts must be resident, exact and material-ready');continue;}
  plan.hiddenOutlines.push(outline);plan.groups.push({groupIdentity:p.groupIdentity,name:p.name,outline,parts,complete:false});
 }
 return plan;
}
