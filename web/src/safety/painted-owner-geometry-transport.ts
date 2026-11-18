import transports from './painted-owner-geometry-transports.json';
import type {NativeSourceDescriptor} from './shared-native-source';

type PublishedGeometry={sourceBytes:number;publicSHA256:string;publicBytes:number};
const bySource:Readonly<Record<string,PublishedGeometry|undefined>>=transports;

/** Owner profiles keep the signed source identity used by focus, paint and
 * geometry proofs. A registry routing that exact revision to its published
 * bytes selects a different integrity descriptor for reading and caching. */
export function paintedOwnerGeometryTransport(source:NativeSourceDescriptor,route:string):NativeSourceDescriptor{
 const entry=Object.hasOwn(bySource,source.sha256)?bySource[source.sha256]:undefined;
 if(!entry)return source;
 const sha=entry.publicSHA256;
 if(route!=='/safety/buildings3d/painted-assets/'+sha.slice(0,2)+'/'+sha+'.json')return source;
 if(source.bytes!==entry.sourceBytes||source.compression!==undefined||
    source.uncompressed_bytes!==undefined||source.uncompressed_sha256!==undefined){
  throw Error('Published owner geometry does not match its declared source descriptor');
 }
 return{path:route,sha256:sha,bytes:entry.publicBytes};
}
