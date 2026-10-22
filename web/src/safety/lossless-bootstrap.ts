import {rawBoundedDataBytes,LocalDataUnavailableError} from './local-data-bytes';
import {fetchRawDataJSON} from './security';
import {setLocalDataTransport} from './local-data-routing';
import {createLosslessPathRegistry,type LosslessPathIndex} from './lossless-path-registry';
import {losslessCityBootstrapAsset} from './lossless-city-bootstrap-assets';
type Bootstrap={city:string;generation:string;manifestRaw:Uint8Array;dataRoot:string;signal:AbortSignal};
async function digest(bytes:Uint8Array,signal:AbortSignal){signal.throwIfAborted();const hash=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer);signal.throwIfAborted();return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');}
/** Original bootstrap bytes stay raw. Registered body representations preserve every original byte. */
export async function prepareLosslessData(options:Bootstrap){
 const {city,generation,manifestRaw,dataRoot,signal}=options,profile=losslessCityBootstrapAsset(city);
 setLocalDataTransport(undefined);signal.throwIfAborted();
 if(!profile||profile.generation!==generation)return undefined;
 if(!dataRoot.endsWith('/safety'))throw Error('Invalid city data mount');
 const mount=dataRoot.slice(0,-'/safety'.length),path=(value:string)=>mount+value;
 // A newer raw publication must never read an older representation snapshot.
 if(await digest(manifestRaw,signal)!==profile.rootManifestSHA256)return undefined;
 let raw:Uint8Array;
 try{raw=await rawBoundedDataBytes(path(profile.indexAsset.path),signal,64*1024,'no-store');}
 catch(error){if(error instanceof LocalDataUnavailableError&&error.status===404)return undefined;throw error;}
 if(raw.byteLength!==profile.indexAsset.bytes||await digest(raw,signal)!==profile.indexAsset.sha256)throw Error('Lossless bootstrap hash mismatch');
 const index=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)) as LosslessPathIndex&{geography_index_sha256:string};
 const geoRaw=await rawBoundedDataBytes(path('/safety/geography/index.json'),signal,1024**2,'no-store');
 const geoSHA=await digest(geoRaw,signal);
 if(index.geography_index_sha256!==profile.geographyIndexSHA256||geoSHA!==profile.geographyIndexSHA256)throw Error('Stale lossless geography binding');
 const transport=createLosslessPathRegistry({index,expected:{city,generation,rootManifestSHA256:profile.rootManifestSHA256},mountPath:mount,readMetadata:rawBoundedDataBytes,legacy:{bytes:rawBoundedDataBytes,json:fetchRawDataJSON}});
 const bypass=new Set([path('/safety/manifest.json'),path('/safety/geography/index.json')]);
 const excluded=['/safety/lossless/','/safety/buildings3d/','/safety/environment/','/assets/3d-materials/'].map(path);
 signal.throwIfAborted();setLocalDataTransport({transport,matches:url=>url.startsWith(mount+'/')&&/\.(?:json|geojson)$/.test(url)&&!bypass.has(url)&&!excluded.some(prefix=>url.startsWith(prefix))});
 return transport;
}
