import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export {root500DataRefs,mayMatchRoot500Data,prepareRoot500Data,getRoot500Data} from './owner-f107-derived-pack';
import type {BuildingComponent,Identity} from '../../../safety/building-mesh-types';
import {F107_DERIVED_HEADER,getF107DerivedDisplayRequest,type F107Batch} from './owner-f107-derived-pack';
export type F107DerivedAdmission={sourcePbfSHA256:string;bounds:readonly[number,number,number,number];zoom:number};
export const F107_DERIVED_ID={objectId:F107_DERIVED_HEADER.displayOnlyId,partId:F107_DERIVED_HEADER.displayOnlyId+'/surface'};
export function isF107DerivedDisplayIdentity(c:Identity,scope?:FrozenDataScope){return c.objectId===F107_DERIVED_ID.objectId&&c.partId===F107_DERIVED_ID.partId;}
export function appendF107DerivedDisplay(components:BuildingComponent[],city:string,admission?:F107DerivedAdmission,scope?:FrozenDataScope):BuildingComponent[]{
 if(!mayMatchF107DerivedAdmission(city,admission))return components;
 if(components.some(c=>isF107DerivedDisplayIdentity(c,scope)))throw Error('Duplicate explicit F107 derived-only identity');
 const request=getF107DerivedDisplayRequest(city,scope)!;if(request.sourceNativeGetterCount!==0||request.sourceNativeGetters.length||request.nativeSurfaceClaim)throw Error('F107 derived request attempted native source claim');
 if(request.batches.reduce((s,b)=>s+b.positions.length/3,0)!==9486||request.batches.reduce((s,b)=>s+b.indices.length/3,0)!==3162)throw Error('F107 finite derived mesh budget changed');
 const derived:BuildingComponent={...F107_DERIVED_ID,city,origin:request.origin,componentGeometry:{type:'Polygon',coordinates:request.referenceFootprint.coordinates},sourceFeature:{id:request.displayOnlyId,type:'Feature',geometry:request.referenceFootprint,properties:{name:'Neues Schloss Schleißheim',__derived_display_only:true,__reference_original_relation:request.referenceOriginalRelation,__source_pbf_sha256:admission.sourcePbfSHA256,__not_native_source:true}},batches:request.batches,displayEstimates:{F107DerivedOnly:{nativeGetterCount:0,sourceAbsent:true,patchSHA256:request.patchSHA256,displayOnlyId:request.displayOnlyId,referenceOriginalRelation:request.referenceOriginalRelation,explicitOwnerAuthorized:true,footprintOriginal:true,notSurvey:true}}};
 return [...components,derived];
}
export function applyF107DerivedDisplayMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){let offset=0;for(const c of components){const match=c.city==='munich'&&isF107DerivedDisplayIdentity(c,scope)&&!!c.displayEstimates?.F107DerivedOnly;for(const b of c.batches){const n=b.positions.length/3;if(match){const a=b as F107Batch;for(let j=0;j<n;j++){paint.set(a.paint.slice(j*4,j*4+4),4*(offset+j));frames.set(a.frames.slice(j*5,j*5+5),5*(offset+j));}}offset+=n;}}}
export function serializeF107DerivedReadback(c:(BuildingComponent&{generation?:number})|undefined,sourceAbsent:boolean,scope?:FrozenDataScope){if(!c||!isF107DerivedDisplayIdentity(c,scope)||!c.displayEstimates?.F107DerivedOnly)return null;if(!sourceAbsent)throw Error('F107 derived-only identity entered native source registry');return{displayOnlyId:F107_DERIVED_HEADER.displayOnlyId,patchSHA256:F107_DERIVED_HEADER.patchSHA256,sourceAbsent:true,nativeGetterCount:0,generation:c.generation??null,origin:c.origin,referenceFootprint:c.componentGeometry,batches:c.batches.map(b=>({positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices)}))};}

export const root500DataFunctionArities={"isF107DerivedDisplayIdentity":1,"appendF107DerivedDisplay":3,"applyF107DerivedDisplayMaterials":3,"serializeF107DerivedReadback":2} as const;
export function mayMatchF107DerivedAdmission(city:string,admission?:F107DerivedAdmission):admission is F107DerivedAdmission{if(!admission||city!=='munich'||admission.sourcePbfSHA256!=='e20b47b7be53dea2a670f03e35019af1897aedeced31e0b78b7877e7d757a866')return false;
const b=admission.bounds;
if(b.length!==4||!b.every(Number.isFinite)||!Number.isFinite(admission.zoom)||admission.zoom<16||b[0]>=b[2]||b[1]>=b[3]||b[2]-b[0]>.08||b[3]-b[1]>.06||b[0]>11.5612308||b[2]<11.5607763||b[1]>48.2503306||b[3]<48.2473458)return false;return true;}
