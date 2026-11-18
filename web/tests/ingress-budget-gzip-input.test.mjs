import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const built=await build({entryPoints:[path.join(safety,'bounded-3d-gzip.ts')],bundle:true,write:false,format:'esm',platform:'node',target:'es2022'});
const {inflateBounded3DGzip,decodeBounded3DAssetJSON}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

// Observe the exact chunk the inflater hands to its source stream. The default
// stream class stays the platform implementation; only start() is wrapped.
async function observeEnqueued(run){
  const Original=globalThis.ReadableStream,seen=[];
  globalThis.ReadableStream=class extends Original{
    constructor(source,strategy){
      super(source?.start?{...source,start(controller){return source.start({enqueue(chunk){seen.push(chunk);controller.enqueue(chunk);},close(){controller.close();},error(error){controller.error(error);},get desiredSize(){return controller.desiredSize;}});}}:source,strategy);
    }
  };
  try{return{result:await run(),seen};}finally{globalThis.ReadableStream=Original;}
}

test('the verified compressed view is enqueued by reference, not copied, and stays intact',async()=>{
  const raw=new TextEncoder().encode(JSON.stringify({rows:Array.from({length:200},(_,i)=>({i,v:'x'.repeat(i%17)}))}));
  const packed=gzipSync(raw),backing=new Uint8Array(packed.length+96),compressed=backing.subarray(40,40+packed.length);compressed.set(packed);
  const before=hash(compressed);
  const {result,seen}=await observeEnqueued(()=>inflateBounded3DGzip(compressed,raw.length,new AbortController().signal,hash(raw),4*1024*1024));
  assert.equal(seen.length,1);
  assert.equal(seen[0],compressed,'the caller view itself is the stream chunk: no second compressed allocation');
  assert.equal(seen[0].buffer,backing.buffer);
  assert.equal(compressed.byteLength,packed.length,'the caller buffer is not transferred or detached');
  assert.equal(hash(compressed),before,'the caller bytes are not modified');
  assert.equal(result.byteLength,raw.length);assert.equal(hash(result),hash(raw));
  assert.notEqual(result.buffer,backing.buffer,'the inflated output is its own exact allocation');
  assert.equal(result.buffer.byteLength,raw.length);
});

test('the same input view can be inflated again and decoded JSON is unchanged',async()=>{
  const value={ok:true,n:-0,p:0.1234567890123456},raw=new TextEncoder().encode(JSON.stringify(value)),compressed=new Uint8Array(gzipSync(raw));
  const descriptor={compression:'gzip',uncompressed_bytes:raw.length,uncompressed_sha256:hash(raw)};
  const first=await decodeBounded3DAssetJSON(compressed,descriptor,new AbortController().signal);
  const second=await decodeBounded3DAssetJSON(compressed,descriptor,new AbortController().signal);
  assert.deepEqual(first,JSON.parse(JSON.stringify(value)));assert.deepEqual(second,first);
});

test('shared memory is refused explicitly instead of being silently copied',{skip:typeof SharedArrayBuffer==='undefined'},async()=>{
  const raw=new TextEncoder().encode('{"shared":true}'),packed=gzipSync(raw),shared=new Uint8Array(new SharedArrayBuffer(packed.length));shared.set(packed);
  await assert.rejects(inflateBounded3DGzip(shared,raw.length,new AbortController().signal,hash(raw)),error=>error instanceof TypeError&&/shared memory/.test(error.message));
});

test('declared-size and hash checks still fail closed on the uncopied input',async()=>{
  const raw=new TextEncoder().encode('{"size":"exact"}'),compressed=new Uint8Array(gzipSync(raw));
  await assert.rejects(inflateBounded3DGzip(compressed,raw.length-1,new AbortController().signal),/exceeds declared size/);
  await assert.rejects(inflateBounded3DGzip(compressed,raw.length+1,new AbortController().signal),/length mismatch/);
  await assert.rejects(inflateBounded3DGzip(compressed,raw.length,new AbortController().signal,'0'.repeat(64)),/hash mismatch/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(inflateBounded3DGzip(compressed,raw.length,controller.signal),{name:'AbortError'});
});
