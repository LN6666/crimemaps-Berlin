import type{BuildingComponent}from'./building-mesh-renderer';
import{nativePaintSignature}from'./progressive-native-signature';
import{progressiveAdmission}from'./progressive-paint';
import{OWNER_SHAPE_PATCH_PROFILES}from'./owner-shape-patch-profiles';
type Leaf330=(c:BuildingComponent)=>string|undefined;
const MODELS330=[{"number":"F243-Plinth330","objectId":"osm/way/25012741","partId":"osm/way/25012741/component/1397a7c0be3efbf07872/owner-source-recovery330-plinth","origin":[7.48262105,51.41989085],"signature":"b792ea71","patchSHA":"0339e22b227e3e4d8de67da48d65b9b3541b63269b45c0dabaad7dd63a27ca7e","sourcePartId":"osm/way/25012741/component/1397a7c0be3efbf07872","sourceOrigin":[7.48262105,51.41989085],"sourceSignature":"8f330962","sourceSHA":"5431a9c3b52015a4069b318958ca972713e1f4cca9bb81d48212f4d7b876d331","roles":[2,1]},{"number":"F243-TowerUpper330","objectId":"osm/way/136126074","partId":"osm/way/136126074/component/5022df16fdefa88b5f0b/owner-source-recovery330-upper","origin":[7.48262105,51.41989085],"signature":"225486cf","patchSHA":"d29c6f8342f62c914027aee44b7988e3a1901a06bbc906cd81c5e0540c2c0ff1","sourcePartId":"osm/way/136126074/component/5022df16fdefa88b5f0b","sourceOrigin":[7.48258475,51.41994185],"sourceSignature":"b2daedfa","sourceSHA":"5431a9c3b52015a4069b318958ca972713e1f4cca9bb81d48212f4d7b876d331","roles":[1,3,1,1,1,1]}] as const;

export function f243Plan330(rows:readonly BuildingComponent[],nativeLeaf:Leaf330|undefined,ownerPatchLeaf:Leaf330|undefined){
 const off=(reason:string)=>({enabled:false,reason,held:[]as BuildingComponent[],derived:[]as BuildingComponent[],family:null as number|null});
 if(!nativeLeaf||!ownerPatchLeaf)return off('verified leaf callbacks absent');
 const profiles=MODELS330.map(m=>OWNER_SHAPE_PATCH_PROFILES.find(p=>p.partId===m.partId)as unknown as {enabled?:boolean;owner_authorized?:boolean;family?:number|null;sha256:string;geometrySignature?:string}|undefined);
 if(profiles.some(p=>!p||p.enabled!==true||p.owner_authorized!==true))return off('both profiles default disabled');
 const family=profiles[0]!.family;if(!Number.isInteger(family)||family!<1000||family!>=5000||profiles[1]!.family!==family)return off('root family absent');
 const held:BuildingComponent[]=[],derived:BuildingComponent[]=[];
 for(let i=0;i<MODELS330.length;i++){
  const m=MODELS330[i],p=profiles[i]!;if(p.sha256!==m.patchSHA||p.geometrySignature!==m.signature)return off('registry changed');
  const ns=rows.filter(c=>c.city==='dortmund'&&c.objectId===m.objectId&&c.partId===m.sourcePartId),ds=rows.filter(c=>c.city==='dortmund'&&c.objectId===m.objectId&&c.partId===m.partId);
  if(ns.length!==1||ds.length!==1)return off('both natives and both proxies required');
  const n=ns[0],d=ds[0];if(nativeLeaf(n)!==m.sourceSHA||ownerPatchLeaf(d)!==m.patchSHA||nativePaintSignature(n)!==m.sourceSignature||nativePaintSignature(d)!==m.signature||JSON.stringify(n.origin)!==JSON.stringify(m.sourceOrigin)||JSON.stringify(d.origin)!==JSON.stringify(m.origin))return off('native or proxy evidence mismatch');
  const admission=progressiveAdmission(n);if(!admission||!(admission.surfaceFrames??[]).some(f=>f.family===family))return off('native sandstone material program not admitted');
  held.push(n);derived.push(d);
 }
 return {enabled:true,reason:'verified complete pair; original source rows preserved',held,derived,family:family!};
}
export function f243DisplayAllowed330(c:BuildingComponent,rows:readonly BuildingComponent[],nativeLeaf:Leaf330|undefined,ownerPatchLeaf:Leaf330|undefined){
 if(!MODELS330.some(m=>m.partId===c.partId))return true;return f243Plan330(rows,nativeLeaf,ownerPatchLeaf).enabled;
}
export function applyF243Proxy330(draw:BuildingComponent[],colors:Float32Array,frames:Float32Array,sourceRows:readonly BuildingComponent[],nativeLeaf:Leaf330|undefined,ownerPatchLeaf:Leaf330|undefined){
 const plan=f243Plan330(sourceRows,nativeLeaf,ownerPatchLeaf);if(!plan.enabled)return {applied:false,reason:plan.reason};
 if(plan.held.some(c=>draw.some(d=>d.partId===c.partId))||plan.derived.some(c=>!draw.some(d=>d===c)))return {applied:false,reason:'display hold/paired draw mismatch'};
 const N=draw.reduce((n,c)=>n+c.batches.reduce((s,b)=>s+b.positions.length/3,0),0);if(colors.length!==N*4||frames.length!==N*5)return {applied:false,reason:'attribute size mismatch'};
 let at=0,painted=0;
 for(const c of draw){const model=MODELS330.find(m=>m.partId===c.partId);for(const[bi,b]of c.batches.entries())for(let i=0;i<b.positions.length;i+=3,at++)if(model){colors.set([.47,.45,.37,2],at*4);frames.set([b.positions[i],b.positions[i+2],20,model.roles[bi],plan.family!],at*5);painted++;}}
 return {applied:painted>0,paintedVertices:painted,sourceArraysChanged:false};
}
