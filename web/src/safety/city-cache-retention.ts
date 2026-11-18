import type {ChunkCacheRetention} from './render-runtime/chunk-resource-types';

// Native evidence: Cologne formal s166 final 2D remained 2.459 GB after
// 70.312 s; Frankfurt recovered-native supplemental peak +60 s was 2.873 GB.
// This shortens unused cache retention, not live ownership or GPU fences.
const accelerated=Object.freeze({refetch:7_000,redecode:9_000,reupload:12_000,rebuild:14_000});
export function cityCacheIdleTiers(city:string):Readonly<Record<ChunkCacheRetention,number>>|undefined{
 return city==='cologne'||city==='frankfurt'?accelerated:undefined;
}
