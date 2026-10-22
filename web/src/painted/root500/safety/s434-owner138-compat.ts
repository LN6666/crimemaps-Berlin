import type {BuildingComponent} from './building-mesh-renderer';
import {s434AggregateBatchIncluded,type S434AggregateProfile,type ResidentEntry} from './s434-aggregate-display';
import {ownerF138Reconstruction,F138_RECONSTRUCTION_SHA} from './owner-f138-reconstruction';
const ids=[['osm/way/72449471','osm/way/72449471/component/2137cfaabe8621cde1a7'],['osm/way/174487228','osm/way/174487228/component/d4cf2fb6cf4d3dc18139']] as const;
const key=(c:{objectId:string;partId:string})=>c.objectId+'|'+c.partId;
const expectedDisplays=new WeakMap<BuildingComponent,BuildingComponent>();
function sameArray(a:ArrayLike<unknown>|undefined,b:ArrayLike<unknown>|undefined){if(!a||!b||a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!Object.is(a[i],b[i]))return false;return true;}
function exactDisplay(actual:BuildingComponent,expected:BuildingComponent){
 if(actual.city!==expected.city||key(actual)!==key(expected)||JSON.stringify(actual.origin)!==JSON.stringify(expected.origin)||JSON.stringify(actual.componentGeometry)!==JSON.stringify(expected.componentGeometry)||JSON.stringify(actual.sourceFeature)!==JSON.stringify(expected.sourceFeature)||actual.batches.length!==expected.batches.length)return false;
 const metadata=actual.displayEstimates?.F138Exterior;if(!metadata||typeof metadata!=='object'||(metadata as Record<string,unknown>).patchSHA!==F138_RECONSTRUCTION_SHA)return false;
 return actual.batches.every((b,i)=>['positions','normals','indices','color','paint','frames','writeMask'].every(k=>sameArray((b as unknown as Record<string,ArrayLike<unknown>>)[k],(expected.batches[i] as unknown as Record<string,ArrayLike<unknown>>)[k])));
}
/** An attested native cohort may have a different, exact owner display. Never apply the old batch mask to that new display. Recheck actual loaded objects on each stats/frame observation. */
export function checkS434Owner138Replacement(profile:S434AggregateProfile|null,entries:readonly ResidentEntry[],sources:ReadonlyMap<string,BuildingComponent>,drawable:readonly BuildingComponent[]){
 if(!profile||entries.length!==7)return null;
 const parent=entries.find(e=>e.component.objectId===ids[0][0]&&e.component.partId===ids[0][1])?.component;
 // This requires the genuine WeakMap witness, all seven immutable source identities, source signatures and admissions.
 if(!parent||s434AggregateBatchIncluded(profile,parent,0,entries))return null;
 let replaced=0,retained=0;
 for(const e of entries){
  const source=sources.get(key(e.component));if(!source||source!==e.component)return null;
  const matches=drawable.filter(c=>c.city==='frankfurt'&&key(c)===key(source));if(matches.length!==1)return null;const display=matches[0];
  if(ids.some(([oid,pid])=>oid===source.objectId&&pid===source.partId)){
   if(display===source)return null;let expected=expectedDisplays.get(source);
   if(!expected){const result=ownerF138Reconstruction([source]);if(result.stats.error||result.stats.objects!==1||result.components.length!==1)return null;expected=result.components[0];expectedDisplays.set(source,expected);}
   if(!exactDisplay(display,expected))return null;replaced++;
  }else{if(display.batches!==source.batches||display.origin!==source.origin||display.componentGeometry!==source.componentGeometry||display.sourceFeature!==source.sourceFeature)return null;retained++;}
 }
 if(replaced!==2||retained!==5)return null;
 return {kind:'attested-native-cohort-with-exact-owner-f138-display' as const,nativeAggregateAttested:true as const,nativeSourceMembers:7,exactOwnerDisplayMembers:2,unchangedLegacyDisplayMembers:5,ownerPatchSHA256:F138_RECONSTRUCTION_SHA,legacyParentBatchMaskApplied:false as const,sourceArraysRetained:true as const,currentDrawableMembers:7};
}
