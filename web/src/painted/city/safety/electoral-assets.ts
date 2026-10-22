import {safeLocalDataPath} from './security';
/** Election publication bytes must match their manifest before parsing or rendering. */
export async function verifiedElectoralJSON(url:string,expectedHash:string,signal:AbortSignal):Promise<unknown>{
 safeLocalDataPath(url);if(!/^[a-f0-9]{64}$/.test(expectedHash))throw Error('Invalid election hash');
 const response=await fetch(url,{signal,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('Election asset unavailable');
 const limit=32*1024*1024,declared=response.headers.get('content-length');if(declared&&(!/^\d+$/.test(declared)||Number(declared)>limit)){await response.body?.cancel();throw Error('Election asset exceeds bound');}
 const reader=response.body?.getReader();if(!reader)throw Error('Missing election asset');const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>limit)throw Error('Election asset exceeds bound');chunks.push(part.value);}if(signal.aborted)throw new DOMException('Aborted','AbortError');
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const digest=await crypto.subtle.digest('SHA-256',bytes);const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==expectedHash)throw Error('Election publication hash mismatch');
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 }catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
}
