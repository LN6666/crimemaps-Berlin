import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {build} from 'esbuild';

const root = new URL('../src/safety/', import.meta.url);
async function loadModule(file) {
  const result = await build({
    entryPoints: [new URL(file, root).pathname],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    write: false,
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

const {loadReportBody, clearReportBodyCache} = await loadModule('report-body-loader.ts');
const {reportBodyPresentation} = await loadModule('report-body-presentation.ts');

const sha256 = async (text) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
  .map((byte) => byte.toString(16).padStart(2, '0')).join('');
const identity = (overrides = {}) => ({
  city: 'berlin',
  month: '2026-09',
  source_id: '1710168',
  source_url: 'https://www.berlin.de/polizei/polizeimeldungen/2026/pressemitteilung.1710168.php',
  source_sha256: 'a'.repeat(64),
  ...overrides,
});

function fixture(id, bodies, {contentClass = 'full_body', limitation, rowIdentity = id} = {}) {
  const shard = `${id.city}/${id.month}/bodies-0123456789abcdef0123.json`;
  const locales = {};
  const bodyRecords = [];
  for (const [locale, body] of Object.entries(bodies)) {
    const bodySha = createHash('sha256').update(body, 'utf8').digest('hex');
    const provenance = locale === 'de'
      ? {source: 'official_police_article_full_body', source_url: id.source_url}
      : {candidate_source: 'current_association_reviewed'};
    locales[locale] = {body_shard: shard, body_sha256: bodySha, ...provenance};
    bodyRecords.push({
      ...rowIdentity,
      locale,
      body,
      body_sha256: bodySha,
      source_content_class: contentClass,
      ...(limitation ? {source_limitation: limitation} : {}),
      ...provenance,
    });
  }
  const index = {
    schema_version: 2,
    city: id.city,
    month: id.month,
    records: [{
      ...rowIdentity,
      source_content_class: contentClass,
      ...(limitation ? {source_limitation: limitation} : {}),
      locales,
    }],
  };
  const files = new Map([
    [`/report-bodies/${id.city}/${id.month}.json?revision=${id.source_sha256}`, index],
    [`/report-bodies/${shard}?revision=${id.source_sha256}`, {schema_version: 2, city: id.city, month: id.month, records: bodyRecords}],
  ]);
  return {files, index, shard};
}

function useFetch(t, resolve) {
  const oldFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = String(url);
    requests.push({path, init});
    assert.equal(init.credentials, 'omit');
    assert.equal(init.redirect, 'error');
    assert.equal(init.referrerPolicy, 'no-referrer');
    return resolve(path, init);
  };
  t.after(() => { globalThis.fetch = oldFetch; clearReportBodyCache(); });
  return requests;
}

function jsonResponse(value, status = 200) {
  const body = JSON.stringify(value);
  return new Response(body, {status, headers: {'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body))}});
}

test('loads German original and EN/ZH translations only from an exact city/month/id/URL/source revision', async (t) => {
  const id = identity();
  const texts = {de: 'Deutscher Originaltext.', en: 'English report text.', zh: '中文公告正文。'};
  const data = fixture(id, texts);
  const requests = useFetch(t, async (path) => data.files.has(path) ? jsonResponse(data.files.get(path)) : jsonResponse({}, 404));
  for (const locale of ['de', 'en', 'zh']) {
    const result = await loadReportBody(id, locale, new AbortController().signal);
    assert.equal(result.body, texts[locale]);
    assert.equal(result.contentClass, 'full_body');
  }
  assert.equal(requests.length, 2, 'one month index and one bounded body shard are reused');
  assert(requests.some(({path}) => path.startsWith('/report-bodies/berlin/2026-09.json?revision=' + id.source_sha256)));
  assert(requests.some(({path}) => path.includes('/bodies-0123456789abcdef0123.json?revision=' + id.source_sha256)));

  const wrongUrl = {...id, source_url: 'https://www.berlin.de/polizei/another-report'};
  await assert.rejects(loadReportBody(wrongUrl, 'en', new AbortController().signal), /No body matches this exact source revision/);
  assert.equal(requests.length, 2, 'the mismatched identity is rejected using the cached index without fetching a body shard');
});

test('source revision changes produce distinct index and shard requests instead of reusing stale cache', async (t) => {
  const oldId = identity({source_id: 'revision-test', source_sha256: 'b'.repeat(64)});
  const nextId = {...oldId, source_sha256: 'c'.repeat(64)};
  const oldData = fixture(oldId, {en: 'Earlier stored translation.'});
  const nextData = fixture(nextId, {en: 'Translation for the current source revision.'});
  const requests = useFetch(t, async (path) => {
    if (oldData.files.has(path)) return jsonResponse(oldData.files.get(path));
    if (nextData.files.has(path)) return jsonResponse(nextData.files.get(path));
    return jsonResponse({}, 404);
  });
  assert.equal((await loadReportBody(oldId, 'en', new AbortController().signal)).body, 'Earlier stored translation.');
  assert.equal((await loadReportBody(nextId, 'en', new AbortController().signal)).body, 'Translation for the current source revision.');
  assert(requests.some(({path}) => path.endsWith(`?revision=${oldId.source_sha256}`)));
  assert(requests.some(({path}) => path.endsWith(`?revision=${nextId.source_sha256}`)));
});

test('matches provider-prefixed frozen event IDs without stripping the prefix', async (t) => {
  const id = identity({city: 'hannover', month: '2026-10', source_id: 'polizeikarte:137171', source_sha256: '9'.repeat(64)});
  const data = fixture(id, {en: 'Verified Hannover announcement text.'});
  const requests = useFetch(t, async (path) => data.files.has(path) ? jsonResponse(data.files.get(path)) : jsonResponse({}, 404));
  const result = await loadReportBody(id, 'en', new AbortController().signal);
  assert.equal(result.body, 'Verified Hannover announcement text.');
  assert.equal(data.index.records[0].source_id, 'polizeikarte:137171');
  assert.equal(requests.length, 2);
});

test('rejects a body shard whose text SHA does not match the indexed body', async (t) => {
  const id = identity({source_id: 'tamper-test', source_sha256: 'd'.repeat(64)});
  const data = fixture(id, {en: 'Integrity protected text.'});
  const shardPath = [...data.files.keys()].find((path) => path.includes('/bodies-'));
  const shard = data.files.get(shardPath);
  shard.records[0].body = 'Changed after indexing.';
  const requests = useFetch(t, async (path) => data.files.has(path) ? jsonResponse(data.files.get(path)) : jsonResponse({}, 404));
  await assert.rejects(loadReportBody(id, 'en', new AbortController().signal), /failed its integrity check/);
  assert.equal(requests.length, 2);
});

test('partial sources stay marked partial and referral records never load a referred article as their body', async (t) => {
  const partialId = identity({source_id: 'partial-test', source_sha256: 'e'.repeat(64)});
  const limitation = 'Only the saved source excerpt is available.';
  const partial = fixture(partialId, {en: 'Available partial text.'}, {contentClass: 'source_truncated', limitation});
  const referralId = identity({source_id: 'referral-test', source_sha256: 'f'.repeat(64)});
  const referral = fixture(referralId, {}, {contentClass: 'link_only_referral'});
  const requests = useFetch(t, async (path) => {
    if (partial.files.has(path)) return jsonResponse(partial.files.get(path));
    if (referral.files.has(path)) return jsonResponse(referral.files.get(path));
    return jsonResponse({}, 404);
  });
  const partialResult = await loadReportBody(partialId, 'en', new AbortController().signal);
  assert.equal(partialResult.body, 'Available partial text.');
  assert.equal(partialResult.contentClass, 'source_truncated');
  assert.equal(partialResult.sourceLimitation, limitation);
  assert.equal(reportBodyPresentation(partialResult.contentClass, 'en', true).label, 'Partial text');
  assert.match(reportBodyPresentation(partialResult.contentClass, 'zh', true).note, /来源原文不完整/);

  const referralResult = await loadReportBody(referralId, 'de', new AbortController().signal);
  assert.equal(referralResult.body, undefined);
  assert.equal(referralResult.contentClass, 'link_only_referral');
  assert.equal(reportBodyPresentation(referralResult.contentClass, 'de', false).label, 'Quellenverweis');
  assert.match(reportBodyPresentation(referralResult.contentClass, 'zh', false).note, /仅转介/);
  assert.equal(requests.filter(({path}) => path.includes('/bodies-')).length, 1);
});

test('an aborted disclosure load can be retried for the same source identity', async (t) => {
  const id = identity({source_id: 'retry-test', source_sha256: '1'.repeat(64)});
  const data = fixture(id, {zh: '再次加载成功。'});
  let started;
  const began = new Promise((resolve) => { started = resolve; });
  let holdBody = true;
  const requests = useFetch(t, async (path, init) => {
    if (path.includes('/bodies-') && holdBody) {
      started();
      return new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), {once: true});
      });
    }
    return data.files.has(path) ? jsonResponse(data.files.get(path)) : jsonResponse({}, 404);
  });
  const controller = new AbortController();
  const first = loadReportBody(id, 'zh', controller.signal);
  await began;
  controller.abort();
  await assert.rejects(first, {name: 'AbortError'});
  holdBody = false;
  assert.equal((await loadReportBody(id, 'zh', new AbortController().signal)).body, '再次加载成功。');
  assert.equal(requests.filter(({path}) => path.includes('/bodies-')).length, 2);
});

test('report cards keep the original police link and mount the lazy disclosure for each row', async () => {
  const main = await readFile(new URL('../src/safety/main.ts', import.meta.url), 'utf8');
  assert.match(main, /appendLazyReportBody\(card,e\)/);
  assert.match(main, /if\(typeof summary==="string"&&summary\)text\("p",summary,card\)\.className="report-summary"/);
  assert.match(main, /link\(card, t\("report\.source"\), e\.source_url\)/);
  assert.match(main, /abortPendingReportBodyLoads\(\)/);
  assert.match(main, /loadedLocale=language;\s*request=undefined;/, 'a successful disclosure retains its body across close and reopen');
  assert.match(main, /request\.abort\(\);\s*request=undefined;\s*content\.replaceChildren\(\);\s*content\.dataset\.state="idle"/);
});
