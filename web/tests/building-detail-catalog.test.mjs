import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, webcrypto} from 'node:crypto';
import {build} from 'esbuild';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const compiled = await build({stdin: {contents: `export {createBuildingDetailIndexResolver} from './building-detail-catalog.ts'; export {createChunkResourceStore} from './render-runtime/chunk-resource-store.ts'; export {createResourceBudget} from './render-runtime/resource-budget.ts';`, resolveDir: new URL('../src/safety/', import.meta.url).pathname}, bundle: true, platform: 'node', format: 'esm', write: false});
const {createBuildingDetailIndexResolver, createChunkResourceStore, createResourceBudget} = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const resolver = options => createBuildingDetailIndexResolver({...options, resourceStore: createChunkResourceStore({budget: createResourceBudget()})});
const sha = value => createHash('sha256').update(value).digest('hex');
const indexSHA = sha('canonical index'), leafSHA = sha('canonical leaf');
const leaf = {id: 'original-leaf', sha256: leafSHA};
function fixture() {
  const value = {schema: 'synthetic-demand', source: 'original ä / 中文', variants: []};
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const asset = {path: `/safety/buildings3d/detail-variants/fixture/demand-${sha(bytes)}.json`, sha256: sha(bytes), bytes: bytes.byteLength};
  const catalog = {schema: 'crimemaps-building-detail-catalog-v1', schemaVersion: 1, city: 'bremen', entries: [{canonicalIndexSHA256: indexSHA, canonicalLeafSHA256: leafSHA, leafId: leaf.id, demandIndex: asset}]};
  return {value, bytes, asset, catalog};
}

test('building detail catalog misses every unmatched canonical binding without reading a payload', async () => {
  const f = fixture();
  let reads = 0;
  const readBytes = async () => { reads++; throw Error('A catalog miss must not fetch'); };
  const resolve = resolver({city: 'bremen', catalog: f.catalog, readBytes});
  const signal = new AbortController().signal;
  assert.equal(await resolve(sha('other index'), leaf, signal), undefined);
  assert.equal(await resolve(indexSHA, {...leaf, sha256: sha('other leaf')}, signal), undefined);
  assert.equal(await resolve(indexSHA, {...leaf, id: 'other-id'}, signal), undefined);
  for (const catalog of [undefined, {...f.catalog, city: 'hamburg'}]) {
    assert.equal(await resolver({city: 'bremen', catalog, readBytes})(indexSHA, leaf, signal), undefined);
  }
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(resolve(indexSHA, leaf, aborted.signal), {name: 'AbortError'});
  assert.equal(reads, 0);
});

test('building detail catalog verifies bounded bytes and SHA before reusing one page-owned parsed resource', async () => {
  const f = fixture(), reads = [];
  const resolve = resolver({city: 'bremen', catalog: f.catalog, readBytes: async (...args) => { reads.push(args); return f.bytes; }});
  const signal = new AbortController().signal;
  const first = await resolve(indexSHA, leaf, signal);
  assert.deepEqual(first, f.value);
  assert.equal(await resolve(indexSHA, leaf, signal), first, 'the same bounded cache bytes reuse their parsed object');
  assert.equal(reads.length, 1, 'in-flight and ready content share the same producer');
  assert.equal(reads[0][0], f.asset.path); assert.equal(reads[0][2], f.asset.bytes);
  assert.notEqual(reads[0][1], signal, 'producer cancellation belongs to the shared store');
  const bad = {...f.catalog, entries: [{...f.catalog.entries[0], demandIndex: {...f.asset, sha256: sha('wrong bytes')}}]};
  await assert.rejects(resolver({city: 'bremen', catalog: bad, readBytes: async () => f.bytes})(indexSHA, leaf, signal), /SHA256 mismatch/);
  await assert.rejects(resolver({city: 'bremen', catalog: f.catalog, readBytes: async () => f.bytes.subarray(1)})(indexSHA, leaf, signal), /size mismatch/);
  for (const asset of [{...f.asset, bytes: 500001}, {...f.asset, bytes: 0}, {...f.asset, compression: 'gzip'}]) {
    assert.throws(() => resolver({city: 'bremen', catalog: {...f.catalog, entries: [{...f.catalog.entries[0], demandIndex: asset}]}, readBytes: async () => { throw Error('Invalid descriptors must not read'); }}), /Invalid building detail metadata descriptor/);
  }
});

test('building detail catalog subscriber cancellation leaves shared parsed bytes available to a successful subscriber', async t => {
  const f = fixture();
  let unblock, entered, digestCalls = 0;
  const gate = new Promise(resolve => { unblock = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  const realDigest = crypto.subtle.digest.bind(crypto.subtle);
  t.mock.method(crypto.subtle, 'digest', async (...args) => {
    digestCalls++;
    const digest = await realDigest(...args);
    entered(); await gate;
    return digest;
  });
  const resolve = resolver({city: 'bremen', catalog: f.catalog, readBytes: async () => f.bytes});
  const canceled = new AbortController(), surviving = new AbortController();
  const first = resolve(indexSHA, leaf, canceled.signal);
  const rejected = assert.rejects(first, {name: 'AbortError'});
  await started;
  const second = resolve(indexSHA, leaf, surviving.signal);
  canceled.abort(); unblock();
  await rejected;
  const value = await second;
  assert.deepEqual(value, f.value);
  assert.equal(await resolve(indexSHA, leaf, surviving.signal), value);
  assert.equal(digestCalls, 1, 'cancellation does not poison or duplicate the shared digest/parse');
});


test('v2 catalog reads only the hashed page and retains explicit metadata leases independently', async () => {
 const f=fixture(), prefix=sha(JSON.stringify([indexSHA,leafSHA,leaf.id])).slice(0,2);
 const pageValue={schema:'crimemaps-building-detail-catalog-page-v1',schemaVersion:1,city:'bremen',prefix,entries:f.catalog.entries};
 const pageBytes=new TextEncoder().encode(JSON.stringify(pageValue));
 const pageAsset={path:'/safety/buildings3d/detail/catalog-'+sha(pageBytes)+'.json',sha256:sha(pageBytes),bytes:pageBytes.byteLength};
 const catalog={schema:'crimemaps-building-detail-catalog-v2',schemaVersion:2,city:'bremen',entryCount:1,pages:[{prefix,asset:pageAsset}]};
 const reads=[], controller=new AbortController();
 const resolve=resolver({city:'bremen',catalog,readBytes:async path=>{reads.push(path);if(path===pageAsset.path)return pageBytes;if(path===f.asset.path)return f.bytes;throw Error('Unexpected page');}});
 const lease=await resolve.acquire(indexSHA,leaf,controller.signal);
 assert.deepEqual(lease.value,f.value);controller.abort();
 assert.deepEqual(lease.value,f.value,'acquired lease lives beyond request cancellation');
 assert.deepEqual(reads,[pageAsset.path,f.asset.path]);
 lease.release();assert.throws(()=>lease.value,/released/);
});
