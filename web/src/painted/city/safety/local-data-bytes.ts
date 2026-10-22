import {localDataTransportFor,localDataReadBound} from './local-data-routing';
import {safeLocalDataPath} from './security';
export class LocalDataUnavailableError extends Error{constructor(readonly status:number){super('Local data unavailable');}}
/** Small data shards: explicit download cap and cancellation before allocation. */
export async function rawBoundedDataBytes(url:string,signal:AbortSignal,limit=8*1024*1024,cachePolicy:"default"|"no-store"="default"):Promise<Uint8Array>{
 safeLocalDataPath(url);const response=await fetch(url,{signal,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',cache:cachePolicy});if(!response.ok){await response.body?.cancel();throw new LocalDataUnavailableError(response.status);}
 const length=response.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>limit)){await response.body?.cancel();throw Error('Local data exceeds bound');}
 const reader=response.body?.getReader();if(!reader)throw Error('Missing data body');let size=0;const chunks:Uint8Array[]=[];
 try{while(true){if(signal.aborted)throw new DOMException('Aborted','AbortError');const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>limit)throw Error('Local data exceeds bound');chunks.push(part.value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return bytes;
 }catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
}

/** Default 2D routing preserves original rawSHA and per-consumer byte caps; originalbyte reader stays available. */
export async function boundedDataBytes(url:string,signal:AbortSignal,limit=8*1024*1024,cachePolicy:'default'|'no-store'='default'):Promise<Uint8Array>{safeLocalDataPath(url);signal.throwIfAborted();const max=localDataReadBound(url,limit),route=localDataTransportFor(url);const result=await (route?route.bytes(url,signal,max,cachePolicy):rawBoundedDataBytes(url,signal,max,cachePolicy));signal.throwIfAborted();return result;}
