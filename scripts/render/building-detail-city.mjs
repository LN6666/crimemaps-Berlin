#!/usr/bin/env node
/** Resumable, serial production over the approved city inputs. Model payloads
 * exist in one bounded child at a time. This entry does not build a site. */
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, rename, rm, readdir, stat, lstat, realpath, open} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BOUNDARY_DETAIL_POLICY, MESHOPT_VERSION, detailJSON, limitsFor, levelsFor,
  readBoundFile, createBuildingDetailInputMount, prepareBuildingDetailCityInput, buildingDetailOutputSpace} from './building-detail-variants.mjs';

export const BUILDING_DETAIL_CITY_SCHEMA = 'crimemaps-building-detail-city-v1';
export const BUILDING_DETAIL_CITY_PLAN_SCHEMA = 'crimemaps-building-detail-city-plan-v1';
const CITIES = ['berlin','bremen','cologne','dortmund','dresden','dusseldorf','essen','frankfurt','hamburg','hannover','leipzig','munich','nuremberg','stuttgart'];
const INDEX_LIMIT = 1024 ** 2, CATALOG_LIMIT = 100000, METADATA_LIMIT = 8 * 1024 ** 2;
const CITY_MANIFEST_LIMIT = 20000000;
const RESERVE = 32 * 1024 ** 3, MAX_FILES = 200000;
const SHA = /^[a-f0-9]{64}$/;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (value, message) => {if (!value) throw Error(message);};
const binding = bytes => ({sha256: hash(bytes), bytes: bytes.length});
const jsonBytes = value => Buffer.from(detailJSON(value) + '\n');
const identity = (index, leaf) => [index.sha256, leaf.sha256, leaf.id];
const entryKey = entry => hash(JSON.stringify([entry.canonicalIndexSHA256, entry.canonicalLeafSHA256, entry.leafId]));
function integer(value, fallback, maximum, label) {
  const n = value ?? fallback; check(Number.isSafeInteger(n) && n > 0 && n <= maximum, `Invalid ${label}`); return n;
}
function safeRelative(value) {
  check(typeof value === 'string' && value.length && !path.isAbsolute(value) && !value.includes('\\') &&
    value.split('/').every(p => p && p !== '.' && p !== '..'), 'Unsafe production relative path'); return value;
}
async function ordinary(root, name) {
  const filename = path.join(root, safeRelative(name)), info = await lstat(filename), resolved = await realpath(filename);
  check(info.isFile() && !info.isSymbolicLink() && resolved.startsWith(root + path.sep), 'Production file must be an ordinary contained file'); return filename;
}
async function outputSize(root) {
  let bytes = 0, files = 0;
  async function walk(directory) {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const p = path.join(directory, entry.name); check(!entry.isSymbolicLink(), 'Production output contains a symlink');
      if (entry.isDirectory()) await walk(p);
      else {check(entry.isFile() && ++files <= MAX_FILES, 'Production file count/type bound exceeded'); bytes += (await stat(p)).size;}
    }
  }
  await walk(root); return bytes;
}

/** Page-sized metadata is visited serially. No model leaf is read here. */
export async function* enumerateBuildingDetailLeaves(mount, descriptor, city, chain = [], seen = new Set()) {
  check(descriptor.bytes <= INDEX_LIMIT && (descriptor.uncompressed_bytes ?? descriptor.bytes) <= INDEX_LIMIT && chain.length <= 4,
    'Canonical index metadata/depth exceeds original bound');
  const token = descriptor.sha256 + ':' + descriptor.path;
  check(!seen.has(token), 'Cyclic or duplicated canonical partition'); seen.add(token);
  const value = await mount.json(descriptor);
  check(value.schema_version === 1 && (value.city === undefined || value.city === city), 'Canonical index city/schema mismatch');
  if (Array.isArray(value.shards)) {
    const ids = new Set();
    for (const leaf of value.shards) {
      check(leaf && typeof leaf.id === 'string' && !ids.has(leaf.id) && SHA.test(leaf.sha256) && Number.isSafeInteger(leaf.bytes) && leaf.bytes > 0,
        'Invalid/duplicate canonical leaf descriptor'); ids.add(leaf.id);
      yield {leaf, indexChain: chain};
    }
  } else {
    check(value.index_type === 'partitioned-city3d-v1' && Array.isArray(value.partitions) && value.partitions.length, 'Canonical index has no admitted leaves/partitions');
    for (const partition of value.partitions) yield* enumerateBuildingDetailLeaves(mount, partition, city, [...chain, partition], seen);
  }
  seen.delete(token);
}

/** Optional explicit leaf selection for one bounded serial batch. Every selected
 * leaf must exist in the pinned index (checked before any production). An
 * unselected leaf is never produced in this batch; one already completed or
 * failed under this exact binding is still reported from its receipt, so the
 * city manifest stays cumulative across batches. Nothing is ever reused across
 * bindings: the job key contains the producer and source-context hashes. */
export function buildingDetailLeafSelection(value, cities) {
  if (value === undefined) return;
  check(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0 &&
    Object.keys(value).every(city => cities.includes(city)), 'Leaf selection must name planned cities');
  const selection = new Map();
  for (const [city, ids] of Object.entries(value)) {
    check(Array.isArray(ids) && ids.length > 0 && ids.length <= 256 && new Set(ids).size === ids.length &&
      ids.every(id => typeof id === 'string' && id.length > 0 && id.length <= 256), 'Invalid leaf selection');
    selection.set(city, new Set(ids));
  }
  return selection;
}

/** Selected ids absent from the pinned index; reads index metadata only. */
export async function missingBuildingDetailLeafSelection(mount, descriptor, city, ids) {
  const missing = new Set(ids);
  for await (const {leaf} of enumerateBuildingDetailLeaves(mount, descriptor, city)) missing.delete(leaf.id);
  return [...missing].sort();
}

/** Per-leaf decision, in order: a receipt that no longer re-validates is a
 * failure; a leaf completed (or failed, unless retried) under this binding is
 * reported from its receipt; an unselected leaf is never produced; an
 * exhausted batch budget leaves the leaf pending; otherwise it is produced. */
export function buildingDetailLeafDisposition({previous, revalidationFailed = false, selected, retryFailed = false, budgetExhausted = false}) {
  if (revalidationFailed) return 'failed-revalidation';
  if (previous?.status === 'complete') return 'reuse';
  if (previous?.status === 'failed' && !retryFailed) return 'failed';
  if (selected === false) return 'not-selected';
  if (budgetExhausted) return 'pending';
  return 'produce';
}

async function sourceTools(repo, simplifier) {
  const files = ['scripts/render/building-detail-city.mjs','scripts/render/building-detail-variants.mjs',
    'scripts/render/building-detail-boundary.mjs','scripts/render/building-detail-groups.mjs','scripts/render/building-detail-meshopt.mjs'];
  const rows = [], libraries = [];
  for (const file of files) {const bytes = await readFile(await ordinary(repo, file)); check(bytes.length <= METADATA_LIMIT, 'Producer source bound exceeded'); rows.push({path:file,...binding(bytes)});}
  const directory = path.dirname(simplifier), pkg = JSON.parse(await readFile(path.join(directory,'package.json'),'utf8'));
  check(pkg.name === 'meshoptimizer' && pkg.version === MESHOPT_VERSION && path.basename(simplifier) === 'meshopt_simplifier.js', 'Exact installed meshoptimizer 1.3.0 is required');
  for (const file of ['meshopt_simplifier.js','meshopt_encoder.js','meshopt_decoder.mjs']) {
    const bytes = await readFile(path.join(directory,file)); check(bytes.length <= METADATA_LIMIT, 'Codec implementation bound exceeded');
    libraries.push({package:'meshoptimizer',version:MESHOPT_VERSION,path:file,...binding(bytes)});
  }
  return {files: rows, libraries, sha256: hash(detailJSON({files:rows,libraries}))};
}

async function worker(repo, planFile, simplifier, {signal, milliseconds, heapMiB, batchRemainingMs}) {
  signal.throwIfAborted();
  return new Promise((resolve,reject) => {
    // This is an offline production worker, not a test/build or a runtime pool.
    // A new process gives every completed leaf a definite scratch lifetime.
    const child = spawn(process.execPath,[`--max-old-space-size=${heapMiB}`,path.join(repo,'scripts/render/building-detail-variants.mjs'),
      '--plan',planFile,'--simplifier',simplifier,'--receipt-only'],
    {cwd:repo,stdio:['ignore','pipe','pipe'],timeout:Math.max(1,Math.min(milliseconds+10000,batchRemainingMs)),killSignal:'SIGKILL'});
    let out='',error='',outputError,settled=false;
    const abort = () => child.kill('SIGTERM'); signal.addEventListener('abort',abort,{once:true});
    const finish = (reason,value) => {if(settled)return;settled=true;signal.removeEventListener('abort',abort);reason?reject(reason):resolve(value);};
    child.stdout.on('data',bytes => {
      if(outputError)return;
      out+=bytes.toString();
      if(Buffer.byteLength(out)>METADATA_LIMIT){out='';outputError=Error('Leaf production receipt exceeds bound');child.kill('SIGKILL');}
    });
    child.stderr.on('data',bytes => {error=(error+bytes.toString()).slice(-8192);});
    child.on('error',e=>finish(e));
    child.on('close',(code,killed)=>{
      if(signal.aborted)return finish(signal.reason ?? new DOMException('Aborted','AbortError'));
      if(outputError)return finish(outputError);
      if(code!==0)return finish(Error(`Leaf production failed (${killed ?? code}): ${error.slice(-2048)}`));
      try{finish(null,JSON.parse(out));}catch(e){finish(Error('Invalid leaf production receipt: '+e.message));}
    });
  });
}

/** All files named by a completed checkpoint must still have their exact bytes.
 * A stale/missing output is not a resume hit and is never silently overwritten. */
async function readCompleted(root, checkpoint, expected) {
  let saved;
  for(const name of [`${expected.destination}/production-receipt.json`,checkpoint]) {
    try {
      const file=await ordinary(root,name);check((await stat(file)).size<=METADATA_LIMIT,'Production checkpoint exceeds metadata bound');
      saved=JSON.parse(await readFile(file,'utf8'));break;
    } catch(e) {if(e.code!=='ENOENT')throw e;}
  }
  if(!saved)return;
  if(saved.status!=='complete')return saved;
  check(saved.jobKey===expected.jobKey && saved.sourceContextSHA256===expected.sourceContextSHA256, 'Checkpoint source identity mismatch');
  for(const f of saved.files)await readBoundFile(await ordinary(root,f.source),f,METADATA_LIMIT*2);
  return saved;
}

export async function runBuildingDetailCityPlan(plan,{simplifier,signal=new AbortController().signal,retryFailed=false}={}) {
  check(plan?.schema===BUILDING_DETAIL_CITY_PLAN_SCHEMA && plan.schemaVersion===1,'Invalid city detail production plan');
  for(const name of ['repoRoot','outputRoot'])check(typeof plan[name]==='string'&&path.isAbsolute(plan[name]),'Explicit absolute production roots required');
  check(plan.catalog && path.isAbsolute(plan.catalog.path) && path.isAbsolute(simplifier),'Pinned catalog and explicit installed simplifier required');
  const repo=await realpath(plan.repoRoot),out=path.resolve(plan.outputRoot),parent=await realpath(path.dirname(out));
  check(parent===path.dirname(out) && out!==repo && !out.startsWith(repo+path.sep),'Output must be outside source checkout');
  const loadedRepo=await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));
  check(loadedRepo===repo,'Producer implementation must belong to the explicit repo');
  const limits=limitsFor(plan.limits),levels=levelsFor(plan.levels),budget=plan.budget??{};
  const maxLeaves=integer(budget.maxBatchLeaves,8,256,'batch leaf count'),maxMilliseconds=integer(budget.maxMilliseconds,20*60000,24*60*60000,'batch duration');
  const maxBytes=integer(budget.maxOutputBytes,512*1024**2,2*1024**3,'total output bytes');
  const maxGrowth=integer(budget.maxGrowthBytes,128*1024**2,2*1024**3,'batch output growth');
  const reserve=integer(budget.minFreeBytes,RESERVE,Number.MAX_SAFE_INTEGER,'disk reserve');check(reserve>=RESERVE,'32 GiB disk reserve cannot be lowered');
  const heapMiB=integer(budget.workerHeapMiB,384,512,'offline leaf heap'),metadataHeadroom=24*1024**2;
  const catalogBytes=await readBoundFile(plan.catalog.path,plan.catalog,METADATA_LIMIT),catalog=JSON.parse(catalogBytes.toString('utf8'));
  check(catalog.kind==='city-assembly-input-catalog'&&catalog.schema_version===1,'Only the frozen approved city catalog is accepted');
  const cities=plan.cities??CITIES;
  check(Array.isArray(cities)&&cities.length&&new Set(cities).size===cities.length&&cities.every(c=>CITIES.includes(c)&&catalog.cities[c]),'Invalid independent city selection');
  const selection=buildingDetailLeafSelection(plan.leafSelection,cities);
  for(const city of cities){const source=await realpath(catalog.cities[city].data.root);check(out!==source&&!out.startsWith(source+path.sep),'Output cannot overwrite canonical inputs');}
  await buildingDetailOutputSpace(parent,metadataHeadroom,reserve);
  await mkdir(out,{recursive:false}).catch(e=>{if(e.code!=='EEXIST')throw e;});
  check((await lstat(out)).isDirectory()&&await realpath(out)===out,'Unsafe existing production output');
  const lockPath=path.join(out,'.producer-lock.json');let lock;
  try{lock=await open(lockPath,'wx');}catch(e){
    if(e.code!=='EEXIST')throw e;
    const old=JSON.parse(await readFile(await ordinary(out,'.producer-lock.json'),'utf8'));
    check(old.schema==='building-detail-producer-lock-v1'&&Number.isSafeInteger(old.pid),'Unrecognized production lock');
    let alive=true;try{process.kill(old.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}
    check(!alive,'Another production process still owns this output');await rm(lockPath);lock=await open(lockPath,'wx');
  }
  let used,tools;
  try {
    await lock.writeFile(jsonBytes({schema:'building-detail-producer-lock-v1',pid:process.pid,catalogSHA256:plan.catalog.sha256}));
    used=await outputSize(out);tools=await sourceTools(repo,simplifier);
  } catch(error) {await lock.close();await rm(lockPath,{force:true});throw error;}
  const startBytes=used,started=Date.now(),reports=[];
  let processed=0,reused=0,stopReason,filesWritten=0,notSelectedTotal=0;
  async function save(name,value,cap=METADATA_LIMIT) {
    const raw=jsonBytes(value);check(raw.length<=cap,'Production metadata resource bound exceeded');
    const target=path.join(out,safeRelative(name));await mkdir(path.dirname(target),{recursive:true});
    let old=0;try{const info=await lstat(target);check(info.isFile()&&!info.isSymbolicLink(),'Existing production metadata is not an ordinary file');old=info.size;}catch(e){if(e.code!=='ENOENT')throw e;}
    check(used+raw.length<=maxBytes && used-startBytes+raw.length<=maxGrowth,'Production metadata/output budget exhausted');
    await buildingDetailOutputSpace(out,raw.length,reserve);
    const temp=target+'.tmp-'+process.pid;
    try {await writeFile(temp,raw,{flag:'wx'});await rename(temp,target);}
    catch(error){await rm(temp,{force:true});throw error;}
    used+=raw.length-old;filesWritten++;
    return {...binding(raw),source:name};
  }
  async function immutable(name,value,cap=CATALOG_LIMIT) {
    const raw=jsonBytes(value);check(raw.length<=cap,'Catalog page/root exceeds original 100000-byte bound');
    const file=path.join(out,safeRelative(name));
    try{const old=await readFile(await ordinary(out,name));check(hash(old)===hash(raw),'Content-addressed metadata collision');return {...binding(raw),source:name};}
    catch(e){if(e.code!=='ENOENT')throw e;}
    return save(name,value,cap);
  }
  try {
    // A selection naming a leaf outside its pinned index fails before any city is produced.
    if(selection)for(const [city,ids] of selection) {
      signal.throwIfAborted();
      const row=catalog.cities[city],indexPin=row.three_d_indexes['safety/buildings3d/index.json'];
      check(indexPin && !indexPin.missing,'Approved canonical city index is missing');
      const mount=await createBuildingDetailInputMount({city,siteRoot:row.data.root,profile:row.profile,resourceOverlay:row.resource_overlay},limits);
      const missing=await missingBuildingDetailLeafSelection(mount,{path:'/safety/buildings3d/index.json',sha256:indexPin.sha256,bytes:indexPin.bytes},city,ids);
      check(!missing.length,`Selected leaf is not admitted by the pinned canonical index: ${city}/${missing.slice(0,8).join(',')}`);
    }
    for(const city of cities) {
      signal.throwIfAborted();
      const row=catalog.cities[city],indexPin=row.three_d_indexes['safety/buildings3d/index.json'];
      check(indexPin && !indexPin.missing,'Approved canonical city index is missing');
      const index={path:'/safety/buildings3d/index.json',sha256:indexPin.sha256,bytes:indexPin.bytes};
      await readBoundFile(indexPin.path,indexPin,INDEX_LIMIT);
      const input={city,repoRoot:repo,siteRoot:row.data.root,profile:row.profile,resourceOverlay:row.resource_overlay,limits};
      const context=await prepareBuildingDetailCityInput(input),entries=[],resources=[],failures=[],pending=[];
      const cityBase=`${city}`,assetBase=`/safety/buildings3d/detail-variants/${city}`;
      let discovered=0,completed=0,failed=0,variantLeaves=0,protectedCanonical=0,notSelected=0,insufficientBenefitLevels=0;
      const leafIdentities=new Set(),selected=selection?(selection.get(city)??new Set()):undefined,selectedFound=new Set();
      for await (const task of enumerateBuildingDetailLeaves(context.mount,index,city)) {
        discovered++;signal.throwIfAborted();
        const {leaf,indexChain}=task,jobKey=hash(detailJSON({city,canonical:identity(index,leaf),indexChain,producer:tools.sha256,
          sourceContextSHA256:context.fingerprint,levels,limits}));
        const leafIdentity=JSON.stringify(identity(index,leaf));check(!leafIdentities.has(leafIdentity),'Canonical leaf repeats across partitions');leafIdentities.add(leafIdentity);
        const destination=`${cityBase}/leaves/${jobKey}`;
        const checkpoint=`${cityBase}/checkpoints/${jobKey}.json`,expected={jobKey,sourceContextSHA256:context.fingerprint,destination};
        // Found before re-validation: a selected leaf whose old receipt fails is a
        // recorded failure, not a missing selection.
        if(selected?.has(leaf.id))selectedFound.add(leaf.id);
        let previous,revalidationError,revalidationFailed=false;
        try {previous=await readCompleted(out,checkpoint,expected);}catch(error) {revalidationFailed=true;revalidationError=error;}
        const budgetExhausted=Boolean(stopReason) || processed>=maxLeaves || Date.now()-started>=maxMilliseconds ||
          used+limits.maxOutputBytes+metadataHeadroom>maxBytes || used-startBytes+limits.maxOutputBytes+metadataHeadroom>maxGrowth;
        const disposition=buildingDetailLeafDisposition({previous,revalidationFailed,
          selected:selected?selected.has(leaf.id):undefined,retryFailed,budgetExhausted});
        if(disposition==='failed-revalidation') {
          failed++;failures.push({status:'failed',...expected,city,canonicalIndex:index,canonicalLeaf:leaf,indexChain,
            reason:'Resume output validation failed: '+String(revalidationError?.message??revalidationError).slice(0,1900),publication:'unavailable-no-half-cohort-publication'});
          continue;
        }
        let result=previous;
        if(disposition==='reuse'){reused++;}
        else if(disposition==='failed'){failed++;failures.push(previous);continue;}
        else if(disposition==='not-selected'){notSelected++;pending.push({leafId:leaf.id,canonicalLeafSHA256:leaf.sha256,reason:'not-selected'});continue;}
        else if(disposition==='pending') {
          stopReason??=processed>=maxLeaves?'batch-leaf-limit':Date.now()-started>=maxMilliseconds?'batch-time-limit':'output-byte-limit';
          pending.push({leafId:leaf.id,canonicalLeafSHA256:leaf.sha256});continue;
        } else {
          const stage=`${cityBase}/staging/${jobKey}-${process.pid}`;
          await mkdir(path.dirname(path.join(out,stage)),{recursive:true});
          await buildingDetailOutputSpace(out,limits.maxOutputBytes+metadataHeadroom,reserve);
          const productionPlan={schemaVersion:1,...input,index,indexChain,leafId:leaf.id,sourceContextSHA256:context.fingerprint,
            geometryPolicy:BOUNDARY_DETAIL_POLICY,levels,outputRoot:path.join(out,stage),
            assetBasePath:`${assetBase}/${jobKey}`,minFreeBytes:reserve};
          const planName=`${cityBase}/plans/${jobKey}.json`;await save(planName,productionPlan,65536);processed++;
          try {
            const receipt=await worker(repo,path.join(out,planName),simplifier,{signal,milliseconds:limits.maxMilliseconds,heapMiB,
              batchRemainingMs:maxMilliseconds-(Date.now()-started)});
            check(receipt.sourceContextSHA256===context.fingerprint&&receipt.demandIndex&&receipt.groupMetadata,'Worker omitted current complete grouping/demand authority');
            await mkdir(path.dirname(path.join(out,destination)),{recursive:true});
            try{await lstat(path.join(out,destination));throw Error('Existing unregistered leaf output is retained; choose recovery explicitly');}catch(e){if(e.code!=='ENOENT')throw e;}
            const assets=receipt.files.map(f=>({path:f.path,source:`${destination}/${safeRelative(f.filename)}`,sha256:f.sha256,bytes:f.bytes}));
            const leafManifest={file:`${destination}/detail-variants.json`,sha256:receipt.manifestSHA256,bytes:(await stat(path.join(out,stage,'detail-variants.json'))).size};
            const manifestFile={source:leafManifest.file,sha256:leafManifest.sha256,bytes:leafManifest.bytes};
            result={status:'complete',...expected,canonicalIndexSHA256:index.sha256,canonicalLeafSHA256:leaf.sha256,leafId:leaf.id,
              canonicalIndex:index,canonicalLeaf:leaf,indexChain,demandIndex:receipt.demandIndex,groupMetadata:receipt.groupMetadata,
              leafManifest,variants:receipt.variants.filter(v=>v.status==='complete-replacement').map(v=>({level:v.level,geometrySHA256:v.geometrySHA256,encoding:v.encoding,decodedBytes:v.decodedBytes})),
              summary:receipt.summary,files:[...assets,manifestFile],resources:assets};
            const receiptBytes=jsonBytes(result);check(receiptBytes.length<=METADATA_LIMIT,'Leaf registration exceeds metadata bound');
            await buildingDetailOutputSpace(out,receiptBytes.length,reserve);
            check(used+receipt.totalOutputBytes+receiptBytes.length+metadataHeadroom<=maxBytes &&
              used-startBytes+receipt.totalOutputBytes+receiptBytes.length+metadataHeadroom<=maxGrowth,'Leaf registration exceeds reserved output headroom');
            await writeFile(path.join(out,stage,'production-receipt.json'),receiptBytes,{flag:'wx'});
            // Receipt and payload become visible together. A later interruption
            // before the optional checkpoint write is recovered from this receipt.
            await rename(path.join(out,stage),path.join(out,destination));
            used+=receipt.totalOutputBytes+receiptBytes.length;
            await save(checkpoint,result);
          } catch(error) {
            // This exact staging directory belongs to this process and contains
            // no unique canonical/user data. Historical completed outputs stay.
            await rm(path.join(out,stage),{recursive:true,force:true});
            if(signal.aborted)throw error;
            if(Date.now()-started>=maxMilliseconds){stopReason='batch-time-limit';pending.push({leafId:leaf.id,canonicalLeafSHA256:leaf.sha256});continue;}
            result={status:'failed',...expected,city,canonicalIndex:index,canonicalLeaf:leaf,indexChain,
              reason:String(error.message??error).slice(0,2048),publication:'unavailable-no-half-cohort-publication'};
            await save(checkpoint,result);
          }
        }
        if(result.status==='failed'){failed++;failures.push(result);continue;}
        completed++;const canonicalOnly=result.variants.length===0;if(!canonicalOnly)variantLeaves++;
        protectedCanonical+=result.summary.protectedComponents??0;insufficientBenefitLevels+=result.summary.insufficientBenefitLevels??0;
        entries.push({canonicalIndexSHA256:index.sha256,canonicalLeafSHA256:leaf.sha256,leafId:leaf.id,
          demandIndex:result.demandIndex,groupMetadata:result.groupMetadata,leafManifest:result.leafManifest,
          variants:result.variants,canonicalOnly});resources.push(...result.resources);
      }
      check(!selected||[...selected].every(id=>selectedFound.has(id)),'Selected leaf is not admitted by the pinned canonical index');
      const buckets=new Map();
      for(const entry of entries){const prefix=entryKey(entry).slice(0,2),bucket=buckets.get(prefix)??[];
        bucket.push({canonicalIndexSHA256:entry.canonicalIndexSHA256,canonicalLeafSHA256:entry.canonicalLeafSHA256,leafId:entry.leafId,demandIndex:entry.demandIndex,groupMetadata:entry.groupMetadata});buckets.set(prefix,bucket);}
      const pages=[];
      for(const [prefix,items]of [...buckets].sort(([a],[b])=>a.localeCompare(b))) {
        const page={schema:'crimemaps-building-detail-catalog-page-v1',schemaVersion:1,city,prefix,entries:items.sort((a,b)=>entryKey(a).localeCompare(entryKey(b)))};
        const name=`catalog-${hash(jsonBytes(page))}.json`,physical=await immutable(`${cityBase}/catalog/${name}`,page);
        const asset={path:`${assetBase}/${name}`,sha256:physical.sha256,bytes:physical.bytes};pages.push({prefix,asset});resources.push({...asset,source:physical.source});
      }
      const catalogRoot={schema:'crimemaps-building-detail-catalog-v2',schemaVersion:2,city,entryCount:entries.length,pages};
      const name=`catalog-${hash(jsonBytes(catalogRoot))}.json`,rootBinding=await immutable(`${cityBase}/catalog/${name}`,catalogRoot);
      const catalogAsset={path:`${assetBase}/${name}`,sha256:rootBinding.sha256,bytes:rootBinding.bytes};resources.push({...catalogAsset,source:rootBinding.source});
      const summary={discoveredLeaves:discovered,completedLeaves:completed,failedLeaves:failed,pendingLeaves:pending.length,
        distinctVariantLeaves:variantLeaves,canonicalOnlyLeaves:completed-variantLeaves,protectedCanonicalComponents:protectedCanonical,insufficientBenefitLevels};
      notSelectedTotal+=notSelected;
      const relativeCityFile=name=>{
        check(name.startsWith(cityBase+'/'),'Published city file is outside its independent city root');
        return safeRelative(name.slice(cityBase.length+1));
      };
      const publishedEntries=entries.map(entry=>({...entry,leafManifest:{...entry.leafManifest,file:relativeCityFile(entry.leafManifest.file)}}));
      const publishedResources=resources.map(resource=>({...resource,source:relativeCityFile(resource.source)}));
      const cityManifest={schema:BUILDING_DETAIL_CITY_SCHEMA,schemaVersion:1,city,status:failed||pending.length?'partial':'complete',
        source:{catalog:plan.catalog,producerSHA256:tools.sha256,producerFiles:tools.files,libraries:tools.libraries,sourceContextSHA256:context.fingerprint,canonicalIndex:index},
        catalog:catalogAsset,entries:publishedEntries,resources:publishedResources,summary,failures,pending,
        ...(selected?{selection:{leafIds:[...selected].sort(),notSelectedPending:notSelected}}:{}),
        validation:{runtimeAdoption:'not-run',nativeVisual:'not-run',physicalMemory:'not-measured'}};
      await save(`${cityBase}/detail-variants.json`,cityManifest,CITY_MANIFEST_LIMIT);
      reports.push({city,status:cityManifest.status,...summary,manifest:`${cityBase}/detail-variants.json`});
    }
    const checkpoint={schema:'crimemaps-building-detail-city-checkpoint-v1',schemaVersion:1,producerSHA256:tools.sha256,
      // A batch narrowed by an explicit selection says so; budget stops take precedence.
      catalog:plan.catalog,cities:reports,processedLeaves:processed,reusedLeaves:reused,stopReason:stopReason??(notSelectedTotal?'leaf-selection':null),
      ...(selection?{leafSelection:Object.fromEntries([...selection].map(([city,ids])=>[city,[...ids].sort()]))}:{}),
      outputBytesBeforeCheckpoint:used,batchGrowthBytesBeforeCheckpoint:used-startBytes,budgets:{maxBytes,maxGrowth,reserve,workerHeapMiB:heapMiB},
      accounting:'logical-file-bytes-and-declared-worker-heap-not-native-process-memory',runtimeAdoption:'not-run'};
    await save('checkpoint.json',checkpoint);
    const lockBytes=(await stat(lockPath)).size;
    return {...checkpoint,outputBytes:used-lockBytes,batchGrowthBytes:used-startBytes,metadataFilesWritten:filesWritten};
  } finally {await lock.close();await rm(lockPath,{force:true});}
}

async function main(args) {
  const parsed={};for(let i=0;i<args.length;i++){
    if(args[i]==='--retry-failed'){parsed.retryFailed=true;continue;}
    check(['--plan','--simplifier'].includes(args[i])&&args[i+1]&&!parsed[args[i]],'Usage: --plan /absolute/plan.json --simplifier /installed/meshopt_simplifier.js [--retry-failed]');parsed[args[i]]=args[++i];
  }
  check(path.isAbsolute(parsed['--plan']??''),'Absolute city production plan required');
  const info=await stat(parsed['--plan']);check(info.size<=65536,'City production plan exceeds 64 KiB');
  const plan=JSON.parse(await readFile(parsed['--plan'],'utf8')),controller=new AbortController();
  process.once('SIGINT',()=>controller.abort());process.once('SIGTERM',()=>controller.abort());
  const result=await runBuildingDetailCityPlan(plan,{simplifier:parsed['--simplifier'],retryFailed:parsed.retryFailed,signal:controller.signal});
  console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{console.error(error.stack??String(error));process.exitCode=1;});
