export type LocalDataTransport={bytes:(url:string,signal:AbortSignal,max?:number,policy?:'default'|'no-store')=>Promise<Uint8Array>;json:<T>(url:string,signal?:AbortSignal,onRead?:(weight:number)=>void,policy?:'default'|'no-store')=>Promise<T>};
let active:{transport:LocalDataTransport;matches:(url:string)=>boolean}|undefined;
/** Root installs only a verified city/generation registry. Undefined keeps old publications compatible. */
export function setLocalDataTransport(value:{transport:LocalDataTransport;matches:(url:string)=>boolean}|undefined){active=value;}
export function localDataTransportFor(url:string){return active?.matches(url)?active.transport:undefined;}
/** Existing metric loader1MiB manifest/4MiB area caps must apply BEFORE inflation, not afterwards. */
export function localDataReadBound(url:string,requested:number){const root=/\/safety\/geography\/metric-shards\/[a-z][a-z0-9_-]{0,39}\/[a-f0-9]{64}\//;if(root.test(url)){if(url.endsWith('/manifest.json'))return Math.min(requested,1024**2);if(/\/[a-f0-9]{64}\.json$/.test(url))return Math.min(requested,4*1024**2);}return requested;}
