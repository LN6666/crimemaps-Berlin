// Synthetic building detail packing-group metadata for the ingress-adopt review
// cases: a group document the real parser accepts for a two-component detail
// resource (display variant or near canonical), its plain asset descriptor, and
// a near canonical leaf of the same components. Nothing here is product data.
import {createHash} from 'node:crypto';
import {detailVariant} from './ingress-adopt-fixtures.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const sha=digit=>digit.repeat(64);
const frame={schema:'source-local-mercator-meters-v1',unit:'meter',axes:{x:'east',y:'up',z:'north'},anchorPrecision:'float64',arithmetic:'double-source-origin-minus-stable-anchor-before-float32',earthCircumferenceM:2*Math.PI*6378137};

/** The group document bytes for `resource` (each component one 3-vertex batch). */
export function groupDocument(resource){
 const role=resource.level==='near'?'canonical':'display-variant';
 const authority={...resource.bindings,canonicalIndexSHA256:resource.canonicalIndexSHA256,canonicalLeafSHA256:resource.canonicalLeafSHA256};
 const constraints=resource.components.map((c,i)=>({key:hash('constraint-'+resource.key+'-'+i),observedComponentIndices:[i],sourceObject:{city:resource.city,objectId:c.objectId},completeAcrossLeaves:false,closure:'requires-runtime-cohort',mayPublishIndependently:false,canonicalOnly:role==='canonical'}));
 const groups=resource.components.map((c,i)=>({key:hash('packing-'+resource.key+'-'+i),kind:'physical-packing-group',geometryRole:role,unit:'meter',level:resource.level,componentIndices:[i],publicationConstraintKey:constraints[i].key,
  authority:{...authority,selectedGeometrySHA256:resource.geometrySHA256},anchor:[...c.origin],vertices:3,indices:3,triangles:1,
  componentRanges:[{componentIndex:i,objectId:c.objectId,partId:c.partId,packedVertexOffset:0,packedIndexOffset:0,vertexCount:3,indexCount:3,
   batchSpans:[{componentIndex:i,batchIndex:0,sourceIndexBase:'batch-local',vertexCount:3,indexCount:3,packedVertexOffset:0,packedIndexOffset:0,positionsSHA256:hash('p'+i),normalsSHA256:hash('n'+i),indicesSHA256:hash('i'+i),materialMetadataSHA256:hash('m'+i)}]}]}));
 const document={schema:'crimemaps-building-detail-groups-v1',schemaVersion:1,city:resource.city,key:hash('groups-'+resource.key),authority,coordinateFrame:frame,
  canonicalComponents:resource.components.map((c,i)=>({componentIndex:i,city:resource.city,objectId:c.objectId,partId:c.partId,origin:c.origin})),publicationConstraints:constraints,
  levels:[{level:resource.level,geometrySHA256:resource.geometrySHA256,sourceEquivalenceSHA256:resource.bindings.sourceEquivalenceSHA256,componentCount:resource.componentCount,vertices:resource.vertices,triangles:resource.triangles,indices:resource.triangles*3,packingGroups:groups}]};
 return new TextEncoder().encode(JSON.stringify(document));
}
/** A display-variant resource that carries group metadata, its variant bytes and group bytes. */
export function groupedVariant(key){
 const v=detailVariant(key),groups=groupDocument(v.resource);
 const groupMetadata={path:`/safety/buildings3d/detail/${key}-groups.json`,bytes:groups.byteLength,sha256:hash(groups)};
 return{physical:v.physical,groups,resource:{...v.resource,groupMetadata}};
}
function canonicalComponent(id){
 const geometry={type:'Polygon',coordinates:[[[13,52],[13.001,52],[13,52.001],[13,52]]]};
 return{city:'berlin',objectId:`osm/way/${id}`,partId:`component/${id}`,origin:[13,52],componentGeometry:geometry,
  sourceFeature:{type:'Feature',id:`osm/way/${id}`,geometry,properties:{name:'Synthetic source',height:'8'}},
  batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.5,.6,.7]}]};
}
/** A near resource read through the native pool: its canonical leaf bytes and group bytes. */
export function groupedNear(key){
 const v=detailVariant(key);
 const canonical=new TextEncoder().encode(JSON.stringify({schema_version:1,city:'berlin',components:[canonicalComponent(1),canonicalComponent(2)],shadow_profile:{canonical:true}}));
 const descriptor={path:`/safety/buildings3d/${key}-canonical.json`,bytes:canonical.byteLength,sha256:hash(canonical)};
 const resource={...v.resource,key:key+'-'+descriptor.sha256,level:'near',descriptor,canonicalLeafSHA256:descriptor.sha256,geometrySHA256:sha('a')};
 const groups=groupDocument(resource);
 resource.groupMetadata={path:`/safety/buildings3d/detail/${key}-groups.json`,bytes:groups.byteLength,sha256:hash(groups)};
 return{canonical,groups,resource};
}
/** `bytes` copied into the front of a buffer `factor` times larger: a response view
 * whose whole buffer exceeds the read envelope minted for its descriptor size. */
export function oversizedView(bytes,factor){const buffer=new Uint8Array(bytes.byteLength*factor);buffer.set(bytes);return buffer.subarray(0,bytes.byteLength);}
