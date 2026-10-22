import {C311_DISPLAY_MANIFEST as M,C311_DISPLAY_MANIFEST_SHA256 as SHA} from './c311-display-manifest';
import {c311HasMaterialBinding,type C311Component} from './c311-display';
type Identity={objectId:string;partId:string};
type CaptureRow={number:number;city:string;object_id:string;part_ids:string[];owner_reconstruction?:boolean;native_targets?:Identity[];display_targets?: (Identity&{geometryProvenance:string})[];display_manifest_sha256?:string};
const key=(x:Identity)=>x.objectId+'|'+x.partId;
function exact(a:readonly Identity[]|undefined,b:readonly Identity[]){return !!a&&a.length===b.length&&new Set(a.map(key)).size===b.length&&b.every(p=>a.some(q=>key(p)===key(q)));}
export const isC311CaptureRow=(r:CaptureRow)=>r.number===311&&r.city==='munich';
export const c311DisplayTargets=(r:CaptureRow):Identity[]=>isC311CaptureRow(r)?r.display_targets??[]:[];
export function c311CaptureDisplayStatus(rows:readonly C311Component[],enabled:boolean,paths?:{color:boolean;shadow:boolean;pick:boolean}){
 const records=M.displayTargets.map(p=>{const cc=rows.filter(c=>key(c)===key(p));const c=cc[0];return{objectId:p.objectId,partId:p.partId,geometryProvenance:'addedapprox' as const,native:false,sourcePresent:false,displayPresent:cc.length===1&&!!c&&c311HasMaterialBinding(c),vertices:p.vertices,family:p.family};});
 const native=M.nativeTargets.map(p=>({objectId:p.objectId,partId:p.partId,vertices:p.vertices,geometryProvenance:'native-unchanged' as const,present:rows.filter(c=>key(c)===key(p)&&c311HasMaterialBinding(c)).length===1}));
 const complete=enabled&&paths?.color===true&&paths?.shadow===true&&paths?.pick===true&&records.every(r=>r.displayPresent)&&native.every(r=>r.present);
 return{displayManifestSHA256:SHA,complete,nativeSourceComponents:native,displayComponents:records,geometryAdded:complete?M.geometryAdded:0,sourceGeometryAdded:0,nativeSourceVertices:native.reduce((n,c)=>n+(c.present?c.vertices:0),0),geometryProvenance:'addedapprox' as const};
}
export function c311CaptureProvenance(row:CaptureRow,renderer:any){
 if(!isC311CaptureRow(row))return undefined;
 const fail=(reason:string)=>({ready:false as const,reason,displayManifestSHA256:SHA,nativeSourceVertices:0,displayTargets:[],ownerReconstruction:{number:'C311',components:[],geometryAdded:0,notNative:true,geometryProvenance:'addedapprox'}});
 if(row.object_id!==M.objectId||row.owner_reconstruction!==true||row.display_manifest_sha256!==SHA)return fail('C311 row owner/manifest mismatch');
 if(!exact(row.native_targets,M.nativeTargets)||!exact(row.display_targets,M.displayTargets)||row.display_targets?.some(t=>t.geometryProvenance!=='addedapprox')||row.part_ids.length!==22||new Set(row.part_ids).size!==22||[...M.nativeTargets,...M.displayTargets].some(t=>!row.part_ids.includes(t.partId)))return fail('C311 exact native2/display20 row mismatch');
 const state=renderer?.stats?.c311;
 if(!state?.enabled||state.complete!==true||state.displayManifestSHA256!==SHA||state.native!==2||state.added!==20||state.geometryAdded!==M.geometryAdded||state.sourceGeometryAdded!==0||state.pathsReady?.color!==true||state.pathsReady?.shadow!==true||state.pathsReady?.pick!==true)return fail('C311 renderer manifest/readiness/count mismatch');
 const native=M.nativeTargets.map(p=>{const source=renderer?.getSourceComponent(p),surface=renderer?.getSurfaceComponent(p);return{objectId:p.objectId,partId:p.partId,vertices:p.vertices,sourcePresent:!!source,surfacePresent:!!surface,geometryProvenance:'native-unchanged',valid:!!source&&!!surface&&c311HasMaterialBinding(source)&&c311HasMaterialBinding(surface)};});
 const display=M.displayTargets.map(p=>{const source=renderer?.getSourceComponent(p),surface=renderer?.getAddedDisplayComponent?.(p)??renderer?.getSurfaceComponent(p);const props=surface?.sourceFeature?.properties;return{objectId:p.objectId,partId:p.partId,vertices:p.vertices,geometryProvenance:'addedapprox',native:false,sourcePresent:!!source,surfacePresent:!!surface,valid:!source&&!!surface&&c311HasMaterialBinding(surface)&&props?.geometryProvenance==='addedapprox'&&props?.owner_shape_patch?.number==='C311'&&props?.owner_shape_patch?.geometryRole==='owner-authorized-reconstruction'};});
 if(native.some(t=>!t.valid)||display.some(t=>!t.valid))return fail('C311 source/display getter provenance mismatch');
 if(!exact(state.displayComponents,M.displayTargets)||state.displayComponents.some((c:any)=>c.geometryProvenance!=='addedapprox'||c.native!==false||c.sourcePresent!==false||c.displayPresent!==true))return fail('C311 renderer display identity list mismatch');
 return{ready:true as const,displayManifestSHA256:SHA,nativeSourceVertices:160,nativeTargets:native,displayTargets:display,ownerReconstruction:{number:'C311',displayManifestSHA256:SHA,geometryRole:'owner-authorized-reconstruction',geometryProvenance:'addedapprox',components:display,geometryAdded:M.geometryAdded,sourceGeometryAdded:0,nativeSourceVertices:160,nativeSourceComponents:native,notNative:true}};
}
export const c311CaptureReady=(row:CaptureRow,renderer:any)=>!isC311CaptureRow(row)||c311CaptureProvenance(row,renderer)?.ready===true;
