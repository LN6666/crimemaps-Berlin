import assert from 'node:assert/strict';
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {transform} from 'esbuild';
import {loadConfigFromFile} from 'vite';

test('the packaged Google ownership file belongs only to the Berlin site', async () => {
  const web = fileURLToPath(new URL('../', import.meta.url));
  const root = mkdtempSync(join(tmpdir(), 'crimemaps-site-ownership-'));
  const name = 'google73948d3ce3a710e9.html';
  const verified = 'google-site-verification: ' + name;
  try {
    const source = join(root, 'web');
    const dist = join(root, 'dist');
    mkdirSync(source);
    mkdirSync(dist);
    copyFileSync(join(web, 'vite.config.ts'), join(source, 'vite.config.ts'));
    for (const item of ['src', 'node_modules', 'package.json', 'frozen-initializer-chunks.json']) {
      symlinkSync(join(web, item), join(source, item));
    }
    async function plugin(city) {
      const repository = 'crimemaps-' + city[0].toUpperCase() + city.slice(1);
      writeFileSync(join(root, 'city-config.json'), JSON.stringify({city, repository, base_path: '/' + repository + '/'}));
      const loaded = await loadConfigFromFile({command:'serve', mode:'test'}, join(source, 'vite.config.ts'));
      const ownership = loaded.config.plugins.find(candidate => candidate.name === 'city-ownership-response');
      ownership.configResolved({root, build:{outDir:'dist'}});
      return ownership;
    }
    const other = await plugin('hannover');
    const file = join(dist, name);
    other.writeBundle();
    writeFileSync(file, verified);
    other.writeBundle();
    assert.equal(existsSync(file), false);
    const berlin = await plugin('berlin');
    assert.throws(() => berlin.writeBundle(), {code:'ENOENT'});
    writeFileSync(file, 'unexpected ownership data');
    assert.throws(() => berlin.writeBundle(), /Unexpected ownership/);
    writeFileSync(file, verified);
    berlin.writeBundle();
    assert.equal(readFileSync(file, 'utf8'), verified);
  } finally {
    rmSync(root, {recursive:true, force:true});
  }
});

const source = readFileSync(new URL('../src/safety/deployment.ts', import.meta.url), 'utf8');
const {code} = await transform(source, {loader: 'ts', format: 'esm', target: 'es2022'});
const {cityIds, cityDestination, portalDestination, assetPath, requestedMonth} =
  await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('all 14 production city destinations use independent pages and preserve language/month', () => {
  const paths = new Set();
  for (const city of cityIds) {
    const url = new URL(cityDestination(city, '?lang=zh&month=2026-05&city=wrong&private=discard'));
    assert.equal(url.origin, 'https://ln6666.github.io');
    assert.equal(url.pathname, `/crimemaps-${city[0].toUpperCase()}${city.slice(1)}/${city === 'berlin' ? 'map/' : ''}`);
    assert.equal(url.search, '?lang=zh&month=2026-05');
    paths.add(url.pathname);
  }
  assert.equal(paths.size, 14);
});

test('portal return preserves each language without forwarding map or private state', () => {
  for (const lang of ['de', 'en', 'zh']) {
    assert.equal(portalDestination(`?lang=${lang}&month=2026-01&city=essen&private=discard`),
      `https://ln6666.github.io/crimemaps-Berlin/?lang=${lang}`);
  }
});

test('local preview navigation uses its own origin and keeps repository data paths', () => {
  const targets = {origin: 'http://127.0.0.1:8814', portalPath: '/', berlinMapPath: '/crimemaps-Berlin/'};
  assert.equal(portalDestination('?lang=en', targets), 'http://127.0.0.1:8814/?lang=en');
  assert.equal(cityDestination('berlin', '?lang=de', '2026-09', targets),
    'http://127.0.0.1:8814/crimemaps-Berlin/?lang=de&month=2026-09');
  assert.equal(cityDestination('frankfurt', '?lang=zh', '2026-09', targets),
    'http://127.0.0.1:8814/crimemaps-Frankfurt/?lang=zh&month=2026-09');
  assert.equal(assetPath('/safety/manifest.json', '/crimemaps-Berlin/'), '/crimemaps-Berlin/safety/manifest.json');
});

test('available-month fallback stays within the destination city', () => {
  assert.equal(requestedMonth('?month=2026-05', ['2026-06', '2026-09'], '2026-09'), '2026-09');
  assert.equal(requestedMonth('?month=2026-06', ['2026-06', '2026-09'], '2026-09'), '2026-06');
  assert.equal(new URL(cityDestination('essen', '?lang=en&month=2026-01', '2026-09')).search,
    '?lang=en&month=2026-09');
  assert.equal(new URL(cityDestination('essen', '?month=2026-13')).search, '');
  assert.equal(new URL(cityDestination('hamburg', '?lang=en&month=2026-05', 'undefined-undefined')).search,
    '?lang=en&month=2026-05');
});

test('Chinese language alias becomes the actual supported page locale', () => {
  assert.equal(new URL(cityDestination('berlin', '?lang=zh-CN')).search, '?lang=zh');
  assert.equal(new URL(portalDestination('?lang=zh-CN')).search, '?lang=zh');
  assert.equal(new URL(portalDestination('?lang=unknown')).search, '');
});

test('navigation rejects a foreign path, protocol, credentials, and unknown city', () => {
  for (const portalPath of ['//evil.example/', '/../private/', '/encoded%2Fpath/', '/map/?next=evil']) {
    assert.throws(() => portalDestination('', {origin: 'https://ln6666.github.io', portalPath, berlinMapPath: '/map/'}));
  }
  for (const origin of ['javascript:alert(1)', 'https://user:password@example.org', 'https://example.org/path/', 'https://example.org/?next=evil']) {
    assert.throws(() => portalDestination('', {origin, portalPath: '/', berlinMapPath: '/map/'}));
  }
  assert.throws(() => cityDestination('../private', '?lang=en'));
});
