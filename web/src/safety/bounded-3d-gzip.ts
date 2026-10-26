/** Physical gzip files, independent of HTTP Content-Encoding. Caller must verify physical bytes/SHA first. */
export type ThreeDCompressionDescriptor={compression?:'gzip';uncompressed_bytes?:number;uncompressed_sha256?:string};
export const THREE_D_INFLATED_SHARD_LIMIT=1024*1024;
const HASH=/^[a-f0-9]{64}$/;
export async function inflateBounded3DGzip(compressed:Uint8Array,expectedUncompressed:number,signal:AbortSignal,expectedRawHash?:string,callerByteLimit=THREE_D_INFLATED_SHARD_LIMIT):Promise<Uint8Array>{
 signal.throwIfAborted();
 if(!Number.isSafeInteger(callerByteLimit)||callerByteLimit<1||callerByteLimit>64*1024**2||!Number.isSafeInteger(expectedUncompressed)||expectedUncompressed<1||expectedUncompressed>callerByteLimit||!compressed.byteLength||compressed.byteLength>callerByteLimit||expectedRawHash!==undefined&&!HASH.test(expectedRawHash))throw Error('Invalid bounded city3D gzip descriptor');
 if(typeof DecompressionStream==='undefined')throw Error('Native gzip decompression unavailable');
 const stream=new ReadableStream<BufferSource>({start(controller){controller.enqueue(new Uint8Array(compressed));controller.close();}}).pipeThrough(new DecompressionStream('gzip'));
 const reader=stream.getReader();let stopped=false,used=0;const out=new Uint8Array(expectedUncompressed);
 const abort=()=>{stopped=true;void reader.cancel(signal.reason).catch(()=>{});};
 signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
 try{
  while(true){signal.throwIfAborted();const result=await reader.read();signal.throwIfAborted();if(result.done)break;const chunk=result.value;if(used+chunk.byteLength>expectedUncompressed){stopped=true;await reader.cancel('Inflated city3D gzip exceeds declared size');throw Error('Inflated city3D gzip exceeds declared size');}out.set(chunk,used);used+=chunk.byteLength;}
  if(used!==expectedUncompressed)throw Error('Inflated city3D gzip length mismatch');
  if(expectedRawHash!==undefined){const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',out));signal.throwIfAborted();if([...digest].map(n=>n.toString(16).padStart(2,'0')).join('')!==expectedRawHash)throw Error('Inflated city3D gzip hash mismatch');}
  signal.throwIfAborted();return out;
 }catch(error){if(!stopped){stopped=true;await reader.cancel(error).catch(()=>{});}throw error;
 }finally{signal.removeEventListener('abort',abort);reader.releaseLock();}
}
/** Parse only after the independent physical-file hash check; raw JSON numbers and source fields are untouched. */
export async function decodeBounded3DAssetJSON(bytes:Uint8Array,descriptor:ThreeDCompressionDescriptor,signal:AbortSignal):Promise<unknown>{
 signal.throwIfAborted();let raw=bytes;
 if(descriptor.compression!==undefined&&descriptor.compression!=='gzip')throw Error('Unsupported city3D compression');
 if(descriptor.compression==='gzip')raw=await inflateBounded3DGzip(bytes,descriptor.uncompressed_bytes!,signal,descriptor.uncompressed_sha256);
 else if(descriptor.uncompressed_bytes!==undefined||descriptor.uncompressed_sha256!==undefined)throw Error('Inflated metadata requires city3D gzip compression');
 signal.throwIfAborted();const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));signal.throwIfAborted();return value;
}
