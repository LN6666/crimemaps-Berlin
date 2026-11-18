import type {BuildingDetailAsset} from './building-detail-demand';
import type {ChunkResourceStore} from './render-runtime/chunk-resource-types';
import type {ResourceBytesLease} from './resource-byte-transport';
import {createBuildingFocusIndexResolver} from './building-focus-catalog';
/** v2: every leaf document carries the partition locator of each dependency
 * member. v1 registries (no locators) are rejected at build and at runtime. */
export type BuildingFocusRegistry=Readonly<{
 schema:'crimemaps-building-focus-registry-v2';schemaVersion:2;city:string;
 indices:readonly Readonly<{canonicalIndexSHA256:string;root:BuildingDetailAsset}>[];
}>;
/** Shared build/runtime validation: only content-addressed descriptors enter the
 * bundle. The complete city metadata remains paged and owned by the page store. */
export function validateBuildingFocusRegistry(value:unknown,city:string):BuildingFocusRegistry{
 const v=value as BuildingFocusRegistry,sha=/^[a-f0-9]{64}$/;
 if(!v||v.schema!=='crimemaps-building-focus-registry-v2'||v.schemaVersion!==2||v.city!==city||!/^[a-z][a-z-]+$/.test(city)||Object.keys(v).some(k=>!['schema','schemaVersion','city','indices'].includes(k))||!Array.isArray(v.indices)||v.indices.length<1||v.indices.length>16)throw Error('Invalid building focus registry');
 const seen=new Set<string>();
 for(const row of v.indices){
  const a=row?.root;
  if(!row||Object.keys(row).some(k=>!['canonicalIndexSHA256','root'].includes(k))||!sha.test(row.canonicalIndexSHA256)||seen.has(row.canonicalIndexSHA256)||!a||Object.keys(a).some(k=>!['path','bytes','sha256'].includes(k))||!sha.test(a.sha256)||a.path!==`/safety/buildings3d/focus/${city}/${row.canonicalIndexSHA256}/${a.sha256}.json`||!Number.isSafeInteger(a.bytes)||a.bytes<1||a.bytes>100000)throw Error('Invalid building focus registry source binding');
  seen.add(row.canonicalIndexSHA256);
 }
 return v;
}
export function createBuildingFocusRegistry(options:{city:string;registry:BuildingFocusRegistry|undefined;resourceStore:ChunkResourceStore;acquireBytes(path:string,signal:AbortSignal,max:number):Promise<ResourceBytesLease>;
 /** Drops one path's idle cached raw bytes (the byte transport's discardIdle). */
 discardBytes?(path:string):void}){
 const registry=options.registry&&validateBuildingFocusRegistry(options.registry,options.city);
 const resolvers=new Map<string,ReturnType<typeof createBuildingFocusIndexResolver>>();
 for(const entry of registry?.indices??[])resolvers.set(entry.canonicalIndexSHA256,createBuildingFocusIndexResolver({...options,canonicalIndexSHA256:entry.canonicalIndexSHA256,root:entry.root}));
 return{
  enabled:!!registry,
  forIndex(canonicalIndexSHA256:string){
   if(!registry)return undefined;
   const resolver=resolvers.get(canonicalIndexSHA256);
   if(!resolver)throw Error('Missing building focus registry binding for current canonical index');
   return resolver;
  },
 };
}
export type BuildingFocusRuntime=ReturnType<typeof createBuildingFocusRegistry>;
