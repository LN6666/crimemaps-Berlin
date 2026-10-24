import{f260AcceptedRestoreIdentity,f260AcceptedRestoreDisplayCertificate}from'./f260-accepted-restore-runtime';
import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {bremenKunsthalle70DerivedIdentity,serializeBremenKunsthalle70DerivedReadback} from './kunsthalle70-runtime';
import {BREMEN_OLDTOWN70_DATA as OLD,BREMEN_OLDTOWN70_SHA} from './oldtown70-data';
const absent:any[]=OLD.models.filter((m:any)=>m.sourceBinding.nativeParentAbsent);
const key=(x:Identity)=>x.objectId+'|'+x.partId;
const oldModel=(x:Identity)=>absent.find(m=>m.displays.some((d:any)=>key(d)===key(x)));
export const bremenFiniteDerivedIdentity=(x:Identity)=>f260AcceptedRestoreIdentity(x)||bremenKunsthalle70DerivedIdentity(x)||!!oldModel(x);
const same=(a:ArrayLike<number>,b:ArrayLike<number>)=>a.length===b.length&&Array.from(a).every((v,i)=>Object.is(v,b[i]));
/** Three finite additive Bremen DISPLAY identities only. They are never native SOURCE. */
export function serializeBremenFiniteDerivedReadback(c:(BuildingComponent&{generation?:number})|undefined,sourceAbsent:boolean){
 if(!c||c.city!=='bremen')return null;
 if(f260AcceptedRestoreIdentity(c)){if(!sourceAbsent)throw Error('F260 accepted DISPLAY entered native SOURCE registry');const cert=f260AcceptedRestoreDisplayCertificate(c);if(!cert)throw Error('F260 finite DISPLAY certificate unavailable');return{displayOnlyId:c.objectId,partId:c.partId,patchSHA256:cert.patchSHA256,sourceAbsent:true,nativeGetterCount:0,generation:c.generation??null,originalAcceptedAssetSHA256:cert.originalAcceptedAssetSHA256,sourceCarrier:cert.sourceCarrier,origin:c.origin,referenceFootprint:c.componentGeometry,batches:c.batches.map(b=>({positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices),color:Array.from(b.color),paint:Array.from((b as any).paint as ArrayLike<number>),frames:Array.from((b as any).frames as ArrayLike<number>)})),restoredHistoricalGeometry:true,newArtwork:false,actualVisualAccepted:false};}

 if(bremenKunsthalle70DerivedIdentity(c))return serializeBremenKunsthalle70DerivedReadback(c,sourceAbsent);
 const m=oldModel(c);if(!m)return null;if(!sourceAbsent)throw Error('Bremen oldtown finite DISPLAY entered native SOURCE registry');
 const d=m.displays.find((d:any)=>key(d)===key(c)),est=c.displayEstimates as any;
 const finite=est?.sourceNativeMeshAbsent===true&&est?.sourceRecordSHA256===m.sourceBinding.sourceRecordSHA256&&est?.sourceAuthoritySHA256===OLD.sourceAuthoritySHA256&&est?.infillBremenOldtown70?.patchSHA256===BREMEN_OLDTOWN70_SHA&&same(c.origin,d.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(m.componentGeometry)&&JSON.stringify(c.sourceFeature)===JSON.stringify(m.sourceFeature)&&c.batches.length===d.batches.length&&c.batches.every((b,i)=>(['positions','normals','indices'] as const).every(k=>same(b[k],d.batches[i][k])));
 if(!finite)throw Error('Bremen oldtown finite derived certificate mismatch');
 return{displayOnlyId:c.objectId,partId:c.partId,patchSHA256:BREMEN_OLDTOWN70_SHA,sourceAbsent:true,nativeGetterCount:0,referenceSourceId:m.sourceBinding.objectId,referenceSourcePartId:m.sourceBinding.partId,referenceSourceSHA256:m.sourceBinding.sourceRecordSHA256,sourceAuthoritySHA256:OLD.sourceAuthoritySHA256,generation:c.generation??null,origin:c.origin,referenceFootprint:c.componentGeometry,batches:c.batches.map(b=>({positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices)})),actualVisualAccepted:false};
}
