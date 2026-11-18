import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';

// Execute the actual build reader without invoking Vite or loading city models.
const configURL = new URL('../vite.config.ts', import.meta.url);
const compiled = await build({
  stdin: {contents: await readFile(configURL, 'utf8') + '\nexport {readBuildingDetailCatalog,readBuildingFocusRegistry};',
    resolveDir: new URL('../', import.meta.url).pathname, loader: 'ts'},
  bundle: true, platform: 'node', format: 'esm', write: false,
  define: {'import.meta.url': JSON.stringify(configURL.href)},
  plugins: [{name: 'config-only-vite', setup(b) {
    b.onResolve({filter: /^vite$/}, () => ({path: 'vite', namespace: 'config-only'}));
    b.onLoad({filter: /.*/, namespace: 'config-only'}, () => ({contents:
      'export const defineConfig = value => value; export const loadEnv = () => { throw Error("No Vite invocation expected"); };'}));
  }}],
});
const {readBuildingDetailCatalog,readBuildingFocusRegistry} = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const sha = 'a'.repeat(64), rawSHA = 'b'.repeat(64);
const plain = {path: `/safety/buildings3d/detail-variants/bremen/groups-${sha}.json`, sha256: sha, bytes: 128};
const gzip = {...plain, path: plain.path + '.gz', compression: 'gzip', uncompressed_bytes: 256, uncompressed_sha256: rawSHA};
const catalog = groupMetadata => ({schema: 'crimemaps-building-detail-catalog-v1', schemaVersion: 1, city: 'bremen', entries: [{
  canonicalIndexSHA256: sha, canonicalLeafSHA256: rawSHA, leafId: 'roof-fixture',
  demandIndex: {path: `/safety/buildings3d/detail-variants/bremen/demand-${sha}.json`, sha256: sha, bytes: 100},
  ...(groupMetadata === undefined ? {} : {groupMetadata}),
}]});
async function withFile(t, value) {
  const dir = await mkdtemp(join(tmpdir(), 'crimemaps-build-catalog-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  const file = join(dir, 'catalog.json');
  await writeFile(file, JSON.stringify(value));
  return file;
}

test('build reader preserves optional plain/gzip packing metadata emitted by the candidate producer', async t => {
  for (const metadata of [undefined, plain, gzip]) {
    const expected = catalog(metadata), file = await withFile(t, expected);
    assert.deepEqual(readBuildingDetailCatalog(file, 'bremen').value, expected);
  }
});

test('build reader rejects unsafe, malformed and over-budget packing metadata before publication', async t => {
  for (const metadata of [null, {...plain, path: '/safety/buildings3d/../escape.json'},
    {...plain, sha256: 'invalid'}, {...plain, bytes: 0}, {...plain, bytes: 100_000_000},
    {...gzip, compression: 'brotli'}, {...gzip, uncompressed_bytes: 100_000_000},
    {...gzip, uncompressed_sha256: 'invalid'}, {...plain, unexpected: true}]) {
    const file = await withFile(t, catalog(metadata));
    assert.throws(() => readBuildingDetailCatalog(file, 'bremen'));
  }
  const unknown = catalog(plain); unknown.entries[0].unexpected = true;
  const file = await withFile(t, unknown);
  assert.throws(() => readBuildingDetailCatalog(file, 'bremen'), /Invalid building detail catalog entry/);
});

const focusRegistry=()=>({schema:'crimemaps-building-focus-registry-v2',schemaVersion:2,city:'bremen',indices:[{canonicalIndexSHA256:rawSHA,root:{path:`/safety/buildings3d/focus/bremen/${rawSHA}/${sha}.json`,sha256:sha,bytes:100}}]});
test('build binds the exact city focus registry and rejects mismatched or unsafe sources',async t=>{
 const valid=focusRegistry();assert.deepEqual(readBuildingFocusRegistry(await withFile(t,valid),'bremen').value,valid);
 // v1 metadata has no dependency locators; it must fail at build, not in a browser.
 for(const change of [v=>{v.schema='crimemaps-building-focus-registry-v1';v.schemaVersion=1;},v=>v.city='berlin',v=>v.indices.push(v.indices[0]),v=>v.indices[0].root.path='/safety/buildings3d/focus/../escape.json',v=>v.indices[0].root.bytes=100001,v=>v.indices[0].root.extra=true,v=>v.indices[0].canonicalIndexSHA256='invalid',v=>v.indices=[]]){
  const value=focusRegistry();change(value);const file=await withFile(t,value);assert.throws(()=>readBuildingFocusRegistry(file,'bremen'),/focus/);
 }
 assert.equal(readBuildingFocusRegistry(undefined,'bremen'),undefined);
});
