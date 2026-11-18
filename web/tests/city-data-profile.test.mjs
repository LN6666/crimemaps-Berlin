import {spawnSync} from 'node:child_process';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import zlib from 'node:zlib';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {CITY_IDS,createCityDataCompiler,jsonArrayRows,applyCityDataProfile,partitionCityTable,shardCityDataProfile,encodeCityDataProfile} from '../../scripts/city-data-profile.mjs';
import {encodeCityTable,jsonObjectMembers} from '../../scripts/city-data-shards.mjs';
const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(new URL('../package.json',import.meta.url)),{build}=require('esbuild');
async function moduleAt(name){const b=await build({entryPoints:[path.join(web,'src/safety',name)],bundle:true,platform:'node',format:'esm',target:'es2022',write:false});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));}
const {createCityFrozenProfile}=await moduleAt('city-frozen-profile.ts'),{createFrozenInitializerStore}=await moduleAt('frozen-paint-initializer-store.ts'),{createFrozenDataLeaseStore}=await moduleAt('frozen-data-lease-store.ts'),{createFrozenDataScope}=await moduleAt('frozen-data-scope.ts');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'crimemaps-city-data-')),assetRoot=path.join(temp,'inputs'),fakeWeb=path.join(temp,'web'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const manifest=[],dependencies={providers:{},initializers:{}},recipes=[],inputs=new Map();
for(const provider of ['city','root500','delegated500','tier300','church','bremen','infill']){dependencies.providers[provider]=[];dependencies.initializers[provider]={};}
for(const provider of ['city','root500','delegated500','tier300','bremen','infill'])for(const [name,selector]of [['paint-admissions','city-rows'],['feature-cities','city-key'],...(['root500','delegated500'].includes(provider)?[['berlin-programs','berlin-catalog'],['hamburg-programs','hamburg-catalog']]:[])]){
 const file=`painted/${provider}/safety/progressive-${name}.ts`,value=selector==='city-rows'?CITY_IDS.flatMap(city=>[0,1].map(n=>({city,objectId:'osm/way/'+(100+(['bremen','infill'].includes(provider)?0:n)),partId:provider+'/'+n,descriptionSHA256:'a'.repeat(64),n:'NEGATIVE_ZERO',origin:[0.1234567890123456,n],proof:'line\\n\" 引用'}))):selector==='city-key'?Object.fromEntries(CITY_IDS.map(city=>[city,`${provider} ${city} void main(){ /* unchanged */ }`])):{base:`${provider} ${name} base`,f1000:'surface'};
 const raw=Buffer.from(JSON.stringify(value).replaceAll('"NEGATIVE_ZERO"','-0')),sha256=hash(raw),packed=zlib.gzipSync(raw),physical=hash(packed),d={path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:raw.length,transport:{path:`/safety/buildings3d/painted-tables/${physical.slice(0,2)}/${physical}.json.gz`,sha256:physical,bytes:packed.length,encoding:'gzip'}};manifest.push(d);dependencies.providers[provider].push(sha256);dependencies.initializers[provider][sha256]={[file]:1};recipes.push({file,canonicalSHA256:sha256,occurrence:0,selector});inputs.set(sha256,{raw,value:JSON.parse(raw)});const target=path.join(assetRoot,d.transport.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,packed);
}
const repairsFile='painted/bremen/safety/repairs-data.ts';
const repairModel=(targetId,count,start)=>{const requiredNativeGroup=Array.from({length:count},(_,i)=>({objectId:'osm/way/'+(start+i),partId:'synthetic-part-'+i,sourceLeafSHA256:'b'.repeat(64)}));return{targetId,requiredNativeGroup,sourceBinding:requiredNativeGroup[0],metadata:{authored:targetId},geometry:{positions:['NEGATIVE_ZERO',0,0,1,0,0,0,0.1234567890123456,1],indices:[0,1,2]}};};
const repairRaw=Buffer.from(JSON.stringify({schemaVersion:1,city:'bremen',sourceReceiptSHA256:'c'.repeat(64),models:[repairModel('BR-OT-B07',7,700),repairModel('BR-OT-B09',1,900)],origin:[8.123456789012345,53.5],license:'synthetic quoted \"引用\"'},null,2).replaceAll('"NEGATIVE_ZERO"','-0')),repairAsset=encodeCityTable(repairRaw);
manifest.push(repairAsset.descriptor);dependencies.providers.bremen.push(repairAsset.descriptor.sha256);dependencies.initializers.bremen[repairAsset.descriptor.sha256]={[repairsFile]:1};recipes.push({file:repairsFile,canonicalSHA256:repairAsset.descriptor.sha256,occurrence:0,selector:'model-targets'});inputs.set(repairAsset.descriptor.sha256,{raw:repairRaw,value:JSON.parse(repairRaw)});const repairPath=path.join(assetRoot,repairAsset.descriptor.transport.path);fs.mkdirSync(path.dirname(repairPath),{recursive:true});fs.writeFileSync(repairPath,repairAsset.packed);
const bulkFile='painted/infill/safety/infill-frankfurt-low-office-bulk70-data.ts';
const bulkRaw=Buffer.from('{"SOURCEImmutable":true,"groups":[{"queueId":"group-a","models":[{"objectId":"a","partId":"a","x":-0},{"objectId":"b","partId":"b","x":1e2}]},{"queueId":"group-b","models":[{"objectId":"c","partId":"c"}]}]}'),bulkAsset=encodeCityTable(bulkRaw);
manifest.push(bulkAsset.descriptor);dependencies.providers.infill.push(bulkAsset.descriptor.sha256);dependencies.initializers.infill[bulkAsset.descriptor.sha256]={[bulkFile]:1};recipes.push({file:bulkFile,canonicalSHA256:bulkAsset.descriptor.sha256,occurrence:0,selector:'group-targets'});inputs.set(bulkAsset.descriptor.sha256,{raw:bulkRaw,value:JSON.parse(bulkRaw)});const bulkPath=path.join(assetRoot,bulkAsset.descriptor.transport.path);fs.mkdirSync(path.dirname(bulkPath),{recursive:true});fs.writeFileSync(bulkPath,bulkAsset.packed);
for(const provider of ['city','root500','delegated500','tier300','bremen','infill']){const directory=path.join(fakeWeb,'src/painted',provider,'safety');fs.mkdirSync(directory,{recursive:true});fs.copyFileSync(path.join(web,'src/painted',(['bremen','infill'].includes(provider)?provider:'city'),'safety/progressive-paint.ts'),path.join(directory,'progressive-paint.ts'));fs.writeFileSync(path.join(directory,'frozen-paint-ids.ts'),'export const FROZEN_PAINT_IDS=new Set<string>([]);');}fs.copyFileSync(path.join(web,'package.json'),path.join(fakeWeb,'package.json'));fs.symlinkSync(path.join(web,'node_modules'),path.join(fakeWeb,'node_modules'),'dir');
write(path.join(fakeWeb,'src/safety/frozen-paint-table-manifest.json'),manifest);write(path.join(fakeWeb,'src/safety/frozen-paint-table-dependencies.json'),dependencies);write(path.join(temp,'scripts/city-data-recipes.json'),{schemaVersion:1,recipes});
const compiler=createCityDataCompiler({webRoot:fakeWeb,assetRoots:[assetRoot],shardTargetBytes:256}),products=new Map();
const selection=p=>({tables:dependencies.providers[p],initializers:dependencies.initializers[p]});const tick=()=>new Promise(r=>setImmediate(r));
const readProjected=(output,d)=>new Uint8Array(fs.readFileSync(path.join(output,'assets',d.transport?.path??d.path)));
test.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
function selectedRaw(product,route){
 if(route.selector!=='model-targets'){const bytes=readProjected(product.output,route.descriptor);return route.descriptor.transport?zlib.gunzipSync(bytes):bytes;}
 const partition=route.partition,rows=Array(route.retainedCount).fill(undefined);
 for(const part of partition.parts){const bytes=readProjected(product.output,part.descriptor),raw=part.descriptor.transport?zlib.gunzipSync(bytes):bytes,value=JSON.parse(raw),{models,...envelope}=value;assert.equal(hash(raw),part.descriptor.sha256);assert.deepEqual(envelope,partition.envelope);const lexemes=jsonArrayRows(Buffer.from(jsonObjectMembers(raw).find(member=>member.key==='models').valueText));assert.equal(models.length,part.rowIndices.length);part.rowIndices.forEach((index,i)=>rows[index]=lexemes[i]);}
 assert(rows.every(row=>typeof row==='string'));const layout=partition.sourceLayout;return Buffer.from(layout.prefix+rows.map((row,i)=>row+(layout.separators[i]??'')).join('')+layout.suffix);
}


test('all fourteen compiled profiles conserve exact row lexemes, values, order and city program strings',()=>{
 for(const city of CITY_IDS){
  const output=path.join(temp,'products',city),product=compiler.generate(city,output);products.set(city,{...product,output});const bySHA=(a,b)=>a.sha256.localeCompare(b.sha256);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,'runtime-table-manifest.json'))).toSorted(bySHA),createCityFrozenProfile(manifest,dependencies,product.profile,city).descriptors.toSorted(bySHA));
  for(const route of product.profile.routes){
   const original=inputs.get(route.canonicalSHA256),raw=selectedRaw({...product,output},route),value=JSON.parse(raw);assert.equal(hash(raw),route.descriptor.sha256);
   if(route.selector==='city-rows'){const expected=original.value.filter(row=>row.city===city);assert.deepEqual(value,expected);assert(Object.is(value[0].n,-0));assert.deepEqual(jsonArrayRows(raw),jsonArrayRows(original.raw).filter((_row,i)=>original.value[i].city===city));assert.equal(route.canonicalCount,28);assert.equal(route.retainedCount,2);}
   else if(route.selector==='city-key')assert.deepEqual(value,{[city]:original.value[city]});
   else if(route.selector==='model-targets'){assert.equal(route.descriptor.sha256,route.canonicalSHA256);assert.equal(raw.toString(),original.raw.toString());assert.deepEqual(value,original.value);assert.equal(route.canonicalCount,2);assert.equal(route.retainedCount,2);assert.equal(route.partition.kind,'model-envelope');assert(!product.overlay.assets.some(asset=>asset.path===(route.descriptor.transport??route.descriptor).path),'the complete model table is a logical identity, not a mounted payload');}
   else if(route.selector==='berlin-catalog')assert.deepEqual(value,city==='berlin'?original.value:{});
   else{assert.deepEqual(value,city==='berlin'?{}:original.value);if(!['berlin','hamburg'].includes(city))assert.match(route.exception,/fallback/);}
  }
 }
});

test('version one keeps twelve bindings while version two projects only the active optional provider',()=>{
 const legacyCompiler=createCityDataCompiler({webRoot:fakeWeb,assetRoots:[assetRoot],selectorVersion:'city-data-v1'});
 for(const [city,provider,inactive]of [['bremen','bremen','infill'],['frankfurt','infill','bremen']]){
  const legacy=legacyCompiler.generate(city,path.join(temp,'legacy-version',city)).profile,current=products.get(city).profile;
  assert.equal(legacy.selectorVersion,'city-data-v1');assert.equal(legacy.routes.length,12);assert.equal(current.selectorVersion,'city-data-v2');assert.equal(current.routes.length,city==='bremen'?15:14);
  const optional=current.routes.filter(route=>route.file.startsWith('painted/'+provider+'/'));assert.deepEqual(optional.map(route=>route.selector).sort(),city==='bremen'?['city-key','city-rows','model-targets']:['city-key','city-rows']);assert(!current.routes.some(route=>route.file.startsWith('painted/'+inactive+'/')));
  const legacyAdapter=createCityFrozenProfile(manifest,dependencies,legacy,city),adapter=createCityFrozenProfile(manifest,dependencies,current,city);
  for(const route of optional){assert.equal(adapter.resolve(route.canonicalSHA256,route.file,0),route.descriptor.sha256);assert(legacyAdapter.descriptors.some(d=>d.sha256===route.canonicalSHA256),'v1 retains the unprojected active-provider binding');assert.equal(adapter.descriptors.some(d=>d.sha256===route.canonicalSHA256),route.selector==='model-targets','only the complete model logical descriptor retains canonical identity');}
  for(const sha of dependencies.providers[inactive])assert(!adapter.descriptors.some(d=>d.sha256===sha),'inactive providers do not enter the per-city registry');
 }
 assert.equal(products.get('berlin').profile.routes.length,12);
});

test('versioned profiles reject missing, extra, inactive and rebound initializer routes',()=>{
 const profile=products.get('bremen').profile,expectRejected=(alter,reason=/profile|route|binding/i)=>{const invalid=structuredClone(profile);alter(invalid);assert.throws(()=>createCityFrozenProfile(manifest,dependencies,invalid,'bremen'),reason);};
 expectRejected(value=>value.routes.pop());expectRejected(value=>value.routes.push({...value.routes[0]}));
 expectRejected(value=>value.selectorVersion='city-data-unknown',/selector version/);expectRejected(value=>value.selectorVersion='city-data-v1');
 expectRejected(value=>value.routes.at(-1).file='painted/infill/safety/progressive-feature-cities.ts');
 expectRejected(value=>value.routes[0].canonicalSHA256=value.routes[1].canonicalSHA256);
 expectRejected(value=>value.routes[0].occurrence=1);expectRejected(value=>value.routes[0].selector='city-key');
 const model=value=>value.routes.find(route=>route.selector==='model-targets');
 expectRejected(value=>delete model(value).partition);expectRejected(value=>model(value).retainedCount--);
 expectRejected(value=>model(value).partition.parts[1].rowIndices[0]=0,/partition/);expectRejected(value=>model(value).partition.parts[0].rowIndices[0]=2,/partition/);
 expectRejected(value=>model(value).partition.envelope.models=[],/model envelope metadata/);expectRejected(value=>model(value).partition.sourceLayout.separators[0]='not a comma',/model envelope metadata/);
 const ambiguous=structuredClone(dependencies),route=profile.routes[0];ambiguous.initializers.city[route.canonicalSHA256][route.file]=2;assert.throws(()=>createCityFrozenProfile(manifest,ambiguous,profile,'bremen'),/binding/i);
});

test('compiler preserves full canonical rejection and the original global Map count contract',()=>{
 const recipe=recipes.find(route=>route.selector==='city-rows'),original=inputs.get(recipe.canonicalSHA256).value,duplicate=[...original,{...original[0]}],badColour=structuredClone(original);badColour[0].wallColor=[2,0,0];
 assert.throws(()=>partitionFixture('invalid-duplicate-admission',[[recipe.file,Buffer.from(JSON.stringify(duplicate))]],256),/Invalid progressive paint admission/);
 assert.throws(()=>partitionFixture('invalid-colour-admission',[[recipe.file,Buffer.from(JSON.stringify(badColour))]],256),/Invalid progressive paint colour/);
 for(const {profile}of products.values())for(const route of profile.routes.filter(route=>route.selector==='city-rows'))assert.equal(route.canonicalValidation.fullMapSize,route.canonicalCount);
});

test('profile resolves actual selected identities and rejects city, canonical or missing-route binding errors',()=>{
 const {profile}=products.get('berlin'),adapter=createCityFrozenProfile(manifest,dependencies,profile,'berlin');for(const r of profile.routes){assert.equal(adapter.resolve(r.canonicalSHA256,r.file),r.descriptor.sha256);assert.equal(adapter.rowCounts(r.canonicalSHA256,r.file,999).global,r.canonicalCount);assert.equal(adapter.rowCounts(r.canonicalSHA256,r.file,999).retained,r.retainedCount);}
 assert.throws(()=>createCityFrozenProfile(manifest,dependencies,profile,'hamburg'),/profile/);assert.throws(()=>createCityFrozenProfile(manifest,dependencies,{...profile,routes:profile.routes.slice(1)},'berlin'),/profile/);assert.throws(()=>adapter.resolve('0'.repeat(64),profile.routes[0].file),/binding/);assert.throws(()=>createCityFrozenProfile(manifest,dependencies,{...profile,routes:profile.routes.map((r,i)=>i? r:{...r,canonicalBytes:r.canonicalBytes+1})},'berlin'),/route/);
 assert.equal(new Set(adapter.descriptors.map(d=>d.sha256)).size,adapter.descriptors.length);assert(adapter.descriptors.reduce((n,d)=>n+d.bytes,0)<manifest.reduce((n,d)=>n+d.bytes,0));assert(!adapter.descriptors.some(d=>d.sha256===profile.routes[0].canonicalSHA256));
});

test('ordinary profile construction reads nothing; existing initializer session fetches only selected payloads',async()=>{
 const {profile,output}=products.get('berlin'),adapter=createCityFrozenProfile(manifest,dependencies,profile,'berlin'),store=createFrozenInitializerStore(adapter.descriptors),r=profile.routes.find(r=>r.selector==='city-rows'),calls=[];assert.equal(store.stats.reads,0);
 const session=store.begin(async p=>{calls.push(p);return new Uint8Array(fs.readFileSync(path.join(output,'assets',p)));},new AbortController().signal,adapter.selection(selection(r.file.split('/')[1])));
 const value=await session.wait(store.read(adapter.resolve(r.canonicalSHA256,r.file),r.file));assert.equal(value.length,2);assert(value.every(row=>row.city==='berlin'));assert.deepEqual(calls,[r.descriptor.transport.path]);assert.equal(store.stats.retainedBytes,0);session.close();
});

test('selected hash failure and cancellation preserve parked TLA retry; shared raw descriptors keep independent parsed values',async()=>{
 const {profile,output}=products.get('berlin'),adapter=createCityFrozenProfile(manifest,dependencies,profile,'berlin'),r=profile.routes.find(r=>r.selector==='city-rows'),store=createFrozenInitializerStore(adapter.descriptors),selected=adapter.selection(selection(r.file.split('/')[1]));let started=false;
 const controller=new AbortController(),first=store.begin(async(_p,s)=>{started=true;await new Promise((_,reject)=>s.addEventListener('abort',()=>reject(s.reason),{once:true}));},controller.signal,selected),pending=store.read(adapter.resolve(r.canonicalSHA256,r.file),r.file),waiting=assert.rejects(first.wait(pending),/abort/i);await tick();assert(started);controller.abort();await waiting;await tick();
 const bad=store.begin(async()=>new Uint8Array(r.descriptor.transport.bytes),new AbortController().signal,selected);await assert.rejects(bad.wait(pending),/hash mismatch/);await tick();
 const good=store.begin(async()=>readProjected(output,r.descriptor),new AbortController().signal,selected);assert.equal((await good.wait(pending)).length,2);good.close();
 const empty=profile.routes.filter(r=>r.selector==='hamburg-catalog'),other=createFrozenInitializerStore(adapter.descriptors),refs={tables:[empty[0].descriptor.sha256],initializers:{[empty[0].descriptor.sha256]:Object.fromEntries(empty.map(r=>[r.file,1]))}},lease=other.begin(async()=>readProjected(output,empty[0].descriptor),new AbortController().signal,refs);const [one,two]=await lease.wait(Promise.all(empty.map(r=>other.read(r.descriptor.sha256,r.file))));one.mutated=true;assert.equal(two.mutated,undefined);assert.equal(other.stats.parses,2);assert.equal(other.stats.reads,1);lease.close();
});

test('production assembler requires matching build activation and verifies selected payloads before publishing',()=>{
 const {profile,overlay,output}=products.get('berlin'),build=path.join(temp,'built'),site=path.join(temp,'site');fs.mkdirSync(site,{recursive:true});const options={profilePath:path.join(output,'profile.json'),buildDirectory:build,siteDirectory:site,apply:true,webRoot:fakeWeb};assert.throws(()=>applyCityDataProfile(options));write(path.join(build,'city-data-build-receipt.json'),{city:'hamburg',profileEnabled:true,profileSHA256:overlay.profileSHA256});assert.throws(()=>applyCityDataProfile(options),/activation/);write(path.join(build,'city-data-build-receipt.json'),{schemaVersion:1,purpose:'code-check',city:profile.city,profileEnabled:true,profileSHA256:overlay.profileSHA256});assert.throws(()=>applyCityDataProfile(options),/activation/);write(path.join(build,'city-data-build-receipt.json'),{schemaVersion:1,purpose:'publication',city:profile.city,profileEnabled:true,profileSHA256:overlay.profileSHA256});const receipt=applyCityDataProfile(options);assert.equal(receipt.profileEnabled,true);assert.equal(applyCityDataProfile({...options,apply:false}).profileSHA256,overlay.profileSHA256);
 const gate=()=>spawnSync('python3',[path.join(web,'../scripts/migration/verify_city_data_profile.py'),'--site',site,'--city','berlin','--source-web',fakeWeb],{encoding:'utf8'});const accepted=gate();assert.equal(accepted.status,0,accepted.stderr);const buildReceipt=path.join(site,'city-data-build-receipt.json'),savedBuild=fs.readFileSync(buildReceipt);write(buildReceipt,{schemaVersion:1,purpose:'code-check',city:profile.city,profileEnabled:true,profileSHA256:overlay.profileSHA256});assert.notEqual(gate().status,0);fs.writeFileSync(buildReceipt,savedBuild);const tableManifest=path.join(site,'city-data-tables.json'),savedManifest=fs.readFileSync(tableManifest);fs.writeFileSync(tableManifest,'[]\n');assert.notEqual(gate().status,0);fs.writeFileSync(tableManifest,savedManifest);
 const a=overlay.assets[0],source=path.join(output,a.source),saved=fs.readFileSync(source);fs.writeFileSync(source,Buffer.alloc(saved.length));assert.throws(()=>applyCityDataProfile(options),/hash mismatch/);fs.writeFileSync(source,saved);
});

// Reuse the tiny twelve-route corpus, replacing only explicitly named inputs.
// The real producer, profile adapter and resource client remain in the path.
function partitionFixture(label,overrides,targetBytes){
 const directory=path.join(temp,'partitions',label),fixtureWeb=path.join(directory,'web'),assets=path.join(directory,'inputs'),nextManifest=[],nextDependencies=structuredClone(dependencies),nextRecipes=structuredClone(recipes),byFile=new Map(overrides.map(([file,raw])=>[file,encodeCityTable(raw)])),replaced=new Map();
 for(const recipe of nextRecipes){const replacement=byFile.get(recipe.file);if(!replacement)continue;const provider=recipe.file.split('/')[1],prior=recipe.canonicalSHA256,next=replacement.descriptor.sha256;replaced.set(prior,replacement.descriptor);recipe.canonicalSHA256=next;nextDependencies.providers[provider]=nextDependencies.providers[provider].map(sha=>sha===prior?next:sha);nextDependencies.initializers[provider][next]={[recipe.file]:1};delete nextDependencies.initializers[provider][prior];}
 for(const original of manifest){const descriptor=replaced.get(original.sha256)??original;if(!nextManifest.some(d=>d.sha256===descriptor.sha256))nextManifest.push(descriptor);}
 for(const {descriptor,packed}of byFile.values()){const destination=path.join(assets,descriptor.transport.path);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,packed);}
 write(path.join(fixtureWeb,'src/safety/frozen-paint-table-manifest.json'),nextManifest);write(path.join(fixtureWeb,'src/safety/frozen-paint-table-dependencies.json'),nextDependencies);write(path.join(directory,'recipes.json'),{schemaVersion:1,recipes:nextRecipes});
 fs.symlinkSync(path.join(fakeWeb,'src/painted'),path.join(fixtureWeb,'src/painted'),'dir');fs.copyFileSync(path.join(fakeWeb,'package.json'),path.join(fixtureWeb,'package.json'));fs.symlinkSync(path.join(web,'node_modules'),path.join(fixtureWeb,'node_modules'),'dir');
 const output=path.join(directory,'product'),product=createCityDataCompiler({webRoot:fixtureWeb,assetRoots:[assets,assetRoot],recipesPath:path.join(directory,'recipes.json'),shardTargetBytes:targetBytes}).generate('berlin',output);
 return{directory,web:fixtureWeb,assets,output,...product,manifest:nextManifest,dependencies:nextDependencies};
}
const admissionFile='painted/city/safety/progressive-paint-admissions.ts';
function interleavedAdmissionInput(){
 const row=(objectId,partId,city='berlin')=>({city,objectId:'osm/way/'+objectId,partId,descriptionSHA256:'a'.repeat(64),origin:[0.1234567890123456,1],n:'NEGATIVE_ZERO',proof:'original\\n" 引用'}),rows=[row(501,'a'),row(901,'foreign','hamburg'),row(502,'a'),row(501,'b'),row(502,'b')],lexemes=rows.map(value=>JSON.stringify(value).replace('"NEGATIVE_ZERO"','-0')),selected=lexemes.filter((_row,i)=>rows[i].city==='berlin');
 const targetBytes=Math.max(Buffer.byteLength('['+[selected[0],selected[2]].join(',')+']'),Buffer.byteLength('['+[selected[1],selected[3]].join(',')+']'));
 return{raw:Buffer.from('[\n'+lexemes.join(',\n')+'\n]'),selected,targetBytes};
}
function profileClient(f,provider='city'){
 const city=f.profile.city,adapter=createCityFrozenProfile(f.manifest,f.dependencies,f.profile,city),store=createFrozenDataLeaseStore(adapter.descriptors),calls=[],client=store.client({city,profileSHA256:f.overlay.profileSHA256,provider,selection:adapter.selection({tables:f.dependencies.providers[provider],initializers:f.dependencies.initializers[provider]}),resolve:adapter.resolve,partition:adapter.partition,read:async asset=>{calls.push(asset);return new Uint8Array(fs.readFileSync(path.join(f.output,'assets',asset)));}});
 return{adapter,store,calls,client};
}
test('active-provider selections retain complete original cohorts and exact city source strings through a real scope',async()=>{
 for(const [city,provider]of [['bremen','bremen'],['frankfurt','infill']]){
  const product={...products.get(city),manifest,dependencies},rows=product.profile.routes.find(route=>route.file===`painted/${provider}/safety/progressive-paint-admissions.ts`),source=product.profile.routes.find(route=>route.file===`painted/${provider}/safety/progressive-feature-cities.ts`),{client,store,calls}=profileClient(product,provider),reference=route=>({canonicalSHA256:route.canonicalSHA256,file:route.file,occurrence:0,codec:'json'}),empty=createFrozenDataScope(client),scope=createFrozenDataScope(client),signal=new AbortController().signal;
  try{
   await empty.prepareSelection(reference(rows),[],signal);assert.deepEqual(empty.borrow(reference(rows),value=>value),[]);assert.equal(calls.length,0);empty.release();
   await scope.prepareSelection(reference(rows),[city+'|osm/way/100'],signal);await scope.prepare([reference(source)],signal);
   const expected=inputs.get(rows.canonicalSHA256).value.filter(row=>row.city===city);assert.equal(expected.length,2);assert.deepEqual(scope.borrow(reference(rows),value=>value),expected);assert(scope.borrow(reference(rows),value=>value.every(row=>Object.is(row.n,-0))));
   assert.equal(scope.borrow(reference(source),value=>value[city]),inputs.get(source.canonicalSHA256).value[city]);scope.assertSelection(reference(rows),[city+'|osm/way/100']);assert.equal(calls.length,2);
  }finally{empty.release();scope.release();client.dispose();store.destroy();}
  assert.equal(store.stats.entries,0);assert.equal(store.stats.leases,0);
 }
});

test('Bremen v2 requests only the B09 model part and empty demand keeps the original envelope without I/O',async()=>{
 const product={...products.get('bremen'),manifest,dependencies},route=product.profile.routes.find(row=>row.selector==='model-targets'),original=inputs.get(route.canonicalSHA256).value,{models,...envelope}=original,{client,store,calls}=profileClient(product,'bremen'),ref={canonicalSHA256:route.canonicalSHA256,file:route.file,occurrence:0,codec:'json'},empty=createFrozenDataScope(client),scope=createFrozenDataScope(client),signal=new AbortController().signal;
 try{
  assert.deepEqual(models.map(model=>[model.targetId,model.requiredNativeGroup.length]),[['BR-OT-B07',7],['BR-OT-B09',1]]);assert.equal(route.partition.parts.length,2);
  await empty.prepareSelection(ref,[],signal);assert.deepEqual(empty.borrow(ref,value=>value),{...envelope,models:[]});assert.equal(calls.length,0);empty.release();
  await scope.prepareSelection(ref,['BR-OT-B09'],signal);assert.equal(calls.length,1);const part=route.partition.parts.find(part=>part.keys.includes('BR-OT-B09'));assert.deepEqual(calls,[(part.descriptor.transport??part.descriptor).path]);
  const b09=scope.borrow(ref,value=>value);assert.deepEqual(b09,{...envelope,models:[models[1]]});assert(Object.is(b09.models[0].geometry.positions[0],-0));assert.equal(b09.models[0].geometry.positions[7],0.1234567890123456);assert.equal(b09.models[0].requiredNativeGroup.length,1);
  const all=await client.acquire(ref,signal);try{assert.deepEqual(all.borrow(value=>value),original);assert.equal(all.borrow(value=>value.models[1]),b09.models[0],'overlapping target demands preserve the existing parsed model alias');assert.equal(calls.length,2);}finally{all.release();}
  assert(!calls.includes((route.descriptor.transport??route.descriptor).path));
 }finally{empty.release();scope.release();client.dispose();store.destroy();}
 assert.equal(store.stats.entries,0);assert.equal(store.stats.leases,0);
 const checkerSource=`import gzip, hashlib, importlib.util, json, sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('model_profile_check',sys.argv[1])
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
root,web=Path(sys.argv[2]),Path(sys.argv[3])
profile=json.load(sys.stdin)
dependencies=json.loads((web/'src/safety/frozen-paint-table-dependencies.json').read_text())
canonical=json.loads((web/'src/safety/frozen-paint-table-manifest.json').read_text())
contract=module.profile_resource_contract(profile,dependencies,canonical,'bremen')
runtime=json.loads((root/'runtime-table-manifest.json').read_text())
assert {row['sha256']:row for row in runtime}==contract['runtime']
overlay=json.loads((root/'asset-manifest.json').read_text())
assert {row['path']:row for row in overlay['removeCanonical']}==contract['removeCanonical']
expected={}
for route in profile['routes']:
 for descriptor in module.city_route_assets(route):
  physical=descriptor.get('transport',descriptor)
  expected[physical['path']]={key:physical[key] for key in ('path','sha256','bytes')}
assert {row['path']:{key:row[key] for key in ('path','sha256','bytes')} for row in overlay['assets']}==expected
def payload(descriptor):
 physical=descriptor.get('transport',descriptor)
 packed=(root/'assets'/physical['path'].lstrip('/')).read_bytes()
 assert len(packed)==physical['bytes'] and hashlib.sha256(packed).hexdigest()==physical['sha256']
 raw=gzip.decompress(packed) if 'transport' in descriptor else packed
 assert len(raw)==descriptor['bytes'] and hashlib.sha256(raw).hexdigest()==descriptor['sha256']
 return module.strict_json(raw),raw
module.verify_model_envelope(next(route for route in profile['routes'] if route['selector']=='model-targets'),payload)
`;
 const gate=profile=>spawnSync('python3',['-c',checkerSource,path.join(web,'../scripts/migration/verify_city_data_profile.py'),product.output,fakeWeb],{input:JSON.stringify(profile),encoding:'utf8'}),accepted=gate(product.profile);assert.equal(accepted.status,0,accepted.stderr);
 for(const change of [partition=>partition.envelope.origin[0]=9,partition=>partition.parts[0].keys[0]='BR-OT-undeclared',partition=>{partition.parts[0].rowIndices[0]=1;partition.parts[1].rowIndices[0]=0;}]){
  const invalid=structuredClone(product.profile);change(invalid.routes.find(row=>row.selector==='model-targets').partition);const rejected=gate(invalid);assert.notEqual(rejected.status,0,'a valid static binding cannot conceal model envelope, target or original-order mismatch');assert.match(rejected.stderr,/model|envelope|canonical|order|partition/i);
 }
});

test('producer partitions interleaved objects and real profile client restores original row order and negative zero',async()=>{
 const input=interleavedAdmissionInput(),f=partitionFixture('interleaved',[[admissionFile,input.raw]],input.targetBytes),route=f.profile.routes.find(r=>r.file===admissionFile),{partition}=route;
 assert.equal(route.canonicalCount,5);assert.equal(route.retainedCount,4);assert.equal(partition.kind,'object-rows');assert.deepEqual(partition.parts.map(p=>p.keys),[['berlin|osm/way/501'],['berlin|osm/way/502']]);assert.deepEqual(partition.parts.map(p=>p.rowIndices),[[0,2],[1,3]]);
 const ordered=[];for(const part of partition.parts){const raw=zlib.gunzipSync(readProjected(f.output,part.descriptor));assert.equal(hash(raw),part.descriptor.sha256);assert.equal(part.oversizedAtomic,undefined);jsonArrayRows(raw).forEach((lexeme,i)=>ordered[part.rowIndices[i]]=lexeme);}assert.deepEqual(ordered,input.selected);
 const {client,store,calls}=profileClient(f),signal=new AbortController().signal,ref={canonicalSHA256:route.canonicalSHA256,file:route.file,occurrence:0,codec:'json'};
 try{const [all,one]=await Promise.all([client.acquire(ref,signal),client.acquire(ref,signal,['berlin|osm/way/501'])]);assert.deepEqual(all.borrow(v=>v.map(r=>[r.objectId,r.partId])),[['osm/way/501','a'],['osm/way/502','a'],['osm/way/501','b'],['osm/way/502','b']]);assert(all.borrow(v=>v.every(r=>Object.is(r.n,-0))));assert.deepEqual(one.borrow(v=>v.map(r=>r.partId)),['a','b']);assert.equal(calls.length,2,'overlapping demand shares the same two physical parts');assert.equal(store.stats.reads,2);assert.equal(store.stats.parses,2);assert(!calls.includes(route.descriptor.transport.path),'partition input does not fetch the complete selected table');all.release();one.release();assert.equal(store.stats.valueCells,0);}finally{client.dispose();store.destroy();}
});
test('producer keeps an oversized interleaved object atomic instead of splitting its material rows',()=>{
 const raw=Buffer.from('[{"city":"berlin","objectId":"osm/way/1","partId":"a","n":-0,"source":'+JSON.stringify('x'.repeat(400))+'},{"city":"berlin","objectId":"osm/way/2","partId":"a"},{"city":"berlin","objectId":"osm/way/1","partId":"b"}]'),{partition,assets}=partitionCityTable(raw,{kind:'object-rows',targetBytes:128}),atomic=partition.parts.find(p=>p.keys.includes('berlin|osm/way/1'));
 assert.deepEqual(atomic.keys,['berlin|osm/way/1']);assert.deepEqual(atomic.rowIndices,[0,2]);assert.equal(atomic.oversizedAtomic,true);assert(atomic.descriptor.bytes>128);assert.equal(partition.parts.filter(p=>p.keys.includes('berlin|osm/way/1')).length,1);const body=JSON.parse(assets[partition.parts.indexOf(atomic)].raw);assert.deepEqual(body.map(r=>r.partId),['a','b']);assert(Object.is(body[0].n,-0));assert.equal(partition.parts.length,2);
});
test('producer catalog partitions preserve exact programs and distinct shared-value keys while deduplicating transports',async()=>{
 const program='precision highp float;\nvoid material(){if(hole)discard;gl_FragDepth=.25;}\n// original \\n "引用"',catalog={base:program,f1001:program,f1002:'void main(){colour=vec4(.5);return;}'},raw=Buffer.from(JSON.stringify(catalog)),files=['root500','delegated500'].map(p=>`painted/${p}/safety/progressive-berlin-programs.ts`),f=partitionFixture('catalog',files.map(file=>[file,raw]),2),routes=files.map(file=>f.profile.routes.find(r=>r.file===file));
 assert.equal(routes[0].descriptor.sha256,routes[1].descriptor.sha256);assert.deepEqual(routes[0].partition,routes[1].partition);assert.deepEqual(routes[0].partition.parts.flatMap(p=>p.keys),Object.keys(catalog));assert(routes[0].partition.parts.every(p=>p.oversizedAtomic===true));
 for(const descriptor of [routes[0].descriptor,...routes[0].partition.parts.map(p=>p.descriptor)])assert.equal(f.overlay.assets.filter(a=>a.path===descriptor.transport.path).length,1,'shared source identities emit one physical transport');
 const {client,store}=profileClient(f,'root500'),route=routes[0],ref={canonicalSHA256:route.canonicalSHA256,file:route.file,occurrence:0,codec:'json'},signal=new AbortController().signal;
 try{const all=await client.acquire(ref,signal),subset=await client.acquire(ref,signal,['f1001']);assert.deepEqual(all.borrow(v=>v),catalog);assert.deepEqual(subset.borrow(v=>v),{f1001:program});assert.equal(store.stats.reads,3);all.release();subset.release();}finally{client.dispose();store.destroy();}
 const adapter=createCityFrozenProfile(f.manifest,f.dependencies,f.profile,'berlin'),initializers=createFrozenInitializerStore(adapter.descriptors),physicalCalls=[],refs={tables:[route.descriptor.sha256],initializers:{[route.descriptor.sha256]:Object.fromEntries(files.map(file=>[file,1]))}},session=initializers.begin(async asset=>{physicalCalls.push(asset);return new Uint8Array(fs.readFileSync(path.join(f.output,'assets',asset)));},signal,refs);
 try{const [one,two]=await session.wait(Promise.all(files.map(file=>initializers.read(route.descriptor.sha256,file))));assert.deepEqual(one,catalog);assert.deepEqual(two,catalog);assert.notEqual(one,two,'initializer values remain independent');assert.deepEqual(physicalCalls,[route.descriptor.transport.path]);assert.equal(initializers.stats.reads,1);assert.equal(initializers.stats.parses,2);}finally{session.close();}
});
test('producer profile rejects missing or duplicate row indices and object keys before any client read',()=>{
 const input=interleavedAdmissionInput(),f=partitionFixture('invalid-closure',[[admissionFile,input.raw]],input.targetBytes),mutate=change=>{const profile=structuredClone(f.profile),route=profile.routes.find(r=>r.file===admissionFile);change(route.partition);assert.throws(()=>createCityFrozenProfile(f.manifest,f.dependencies,profile,'berlin'),/partition/);};
 mutate(p=>p.parts.pop());mutate(p=>p.parts[0].rowIndices.pop());mutate(p=>p.parts[1].rowIndices[0]=p.parts[0].rowIndices[0]);mutate(p=>p.parts[1].rowIndices[1]=4);mutate(p=>p.parts[1].keys[0]=p.parts[0].keys[0]);mutate(p=>delete p.parts[0].rowIndices);
});
test('existing profile sharding preserves canonical counts and ordered hashes through publication checker closure',()=>{
 const legacyOutput=path.join(temp,'legacy-profile'),legacy=createCityDataCompiler({webRoot:fakeWeb,assetRoots:[assetRoot],partition:false}).generate('berlin',legacyOutput),profilePath=path.join(legacyOutput,'profile.json'),before=fs.readFileSync(profilePath),output=path.join(temp,'resharded-profile'),sharded=shardCityDataProfile({profilePath,webRoot:fakeWeb,assetRoots:[assetRoot],output,targetBytes:128});
 assert.deepEqual(sharded.profile.routes.map(({partition,...route})=>route),legacy.profile.routes);assert.deepEqual(fs.readFileSync(profilePath),before);assert(sharded.profile.routes.some(r=>r.partition?.parts.length>1));const runtimeTables=JSON.parse(fs.readFileSync(path.join(output,'runtime-table-manifest.json'))),effectiveTables=createCityFrozenProfile(manifest,dependencies,sharded.profile,'berlin').descriptors,bySHA=(a,b)=>a.sha256.localeCompare(b.sha256);assert.deepEqual(runtimeTables.toSorted(bySHA),effectiveTables.toSorted(bySHA));assert(sharded.profile.routes.filter(r=>r.retainedCount===0).every(r=>r.partition?.parts.length===0));
 const buildDirectory=path.join(temp,'sharded-build'),siteDirectory=path.join(temp,'sharded-site');write(path.join(buildDirectory,'city-data-build-receipt.json'),{schemaVersion:1,purpose:'publication',city:'berlin',profileEnabled:true,profileSHA256:sharded.overlay.profileSHA256});applyCityDataProfile({profilePath:path.join(output,'profile.json'),buildDirectory,siteDirectory,apply:true,webRoot:fakeWeb});
 const gate=()=>spawnSync('python3',[path.join(web,'../scripts/migration/verify_city_data_profile.py'),'--site',siteDirectory,'--city','berlin','--source-web',fakeWeb],{encoding:'utf8'});const accepted=gate();assert.equal(accepted.status,0,accepted.stderr);
 const receiptPath=path.join(siteDirectory,'city-data-profile-receipt.json'),buildPath=path.join(siteDirectory,'city-data-build-receipt.json'),publishedPath=path.join(siteDirectory,'city-data-profile.json'),receipt=JSON.parse(fs.readFileSync(receiptPath)),buildReceipt=JSON.parse(fs.readFileSync(buildPath));
 for(const alter of [p=>p.parts[0].rowIndices.pop(),p=>p.parts[1].rowIndices[0]=p.parts[0].rowIndices[0],p=>p.parts[1].keys[0]=p.parts[0].keys[0]]){const invalid=structuredClone(sharded.profile);alter(invalid.routes.find(r=>r.selector==='city-rows').partition);write(publishedPath,invalid);const profileSHA256=hash(fs.readFileSync(publishedPath));write(receiptPath,{...receipt,profileSHA256});write(buildPath,{...buildReceipt,profileSHA256});const rejected=gate();assert.notEqual(rejected.status,0,'matching activation hashes cannot conceal malformed partition closure');assert.match(rejected.stderr,/partition|row order|closure/i);}
 const selected=legacy.profile.routes.find(r=>r.selector==='city-rows').descriptor,source=path.join(legacyOutput,'assets',selected.transport.path),saved=fs.readFileSync(source);try{fs.writeFileSync(source,Buffer.alloc(saved.length));assert.throws(()=>shardCityDataProfile({profilePath,webRoot:fakeWeb,assetRoots:[assetRoot],output:path.join(temp,'invalid-selected-hash')}),/Selected city transport hash mismatch/);}finally{fs.writeFileSync(source,saved);}
});
test('producer refuses a wrong original canonical asset SHA before creating a sharded profile',()=>{
 const recipe=recipes.find(r=>r.selector==='city-rows'),descriptor=manifest.find(d=>d.sha256===recipe.canonicalSHA256),physical=path.join(assetRoot,descriptor.transport.path),saved=fs.readFileSync(physical);
 try{fs.writeFileSync(physical,Buffer.alloc(saved.length));const fresh=createCityDataCompiler({webRoot:fakeWeb,assetRoots:[assetRoot]});assert.throws(()=>fresh.generate('berlin',path.join(temp,'invalid-canonical-shards')),/Canonical transport hash mismatch/);}finally{fs.writeFileSync(physical,saved);}
});


test('profile encoder enforces the newline-inclusive 100000-byte UTF-8 boundary',()=>{
 const limit=100000,base=Buffer.byteLength(JSON.stringify({source:''})+'\n'),remaining=limit-base,source='é'.repeat(Math.floor(remaining/2))+'x'.repeat(remaining%2),profile={source},encoded=encodeCityDataProfile(profile);
 assert.equal(encoded.length,limit);assert.equal(encoded.at(-1),10);assert.equal(encoded.subarray(0,-1).length,limit-1);assert.equal(encoded.toString(),JSON.stringify(profile)+'\n');assert(JSON.stringify(profile).length+1<limit,'UTF-8 bytes, not JavaScript character count, exhaust the budget');
 const tooLarge={source:source+'x'};assert.equal(Buffer.byteLength(JSON.stringify(tooLarge)+'\n'),limit+1);assert.throws(()=>encodeCityDataProfile(tooLarge),/100000|profile.*(budget|bytes|size|limit)/i);
});


test('Frankfurt v3 binds complete group partitions and rejects incomplete or forged routes',async()=>{
 const output=path.join(temp,'frankfurt-v3'),product=createCityDataCompiler({webRoot:fakeWeb,assetRoots:[assetRoot],selectorVersion:'city-data-v3',shardTargetBytes:100}).generate('frankfurt',output),route=product.profile.routes.find(r=>r.selector==='group-targets');
 assert.equal(route.partition.kind,'group-envelope');assert.equal(route.partition.parts.length,2);assert.equal(route.retainedCount,2);
 const fixture={...product,output,manifest,dependencies},{client,store,calls}=profileClient(fixture,'infill'),scope=createFrozenDataScope(client),ref={canonicalSHA256:route.canonicalSHA256,file:route.file,occurrence:0,codec:'json'};
 try{
  await scope.prepareSelection(ref,['group-a'],new AbortController().signal);
  const value=scope.borrow(ref,v=>v);assert.equal(value.groups.length,1);assert.equal(value.groups[0].models.length,2);assert(Object.is(value.groups[0].models[0].x,-0));assert.equal(value.groups[0].models[1].x,100);
  assert.equal(calls.length,1);assert(!calls.includes((route.descriptor.transport??route.descriptor).path));
 }finally{scope.release();client.dispose();store.destroy();}
 assert.equal(store.stats.entries,0);
 for(const mutate of [p=>p.routes=p.routes.filter(r=>r.selector!=='group-targets'),p=>p.routes.find(r=>r.selector==='group-targets').partition.kind='model-envelope',p=>p.routes.find(r=>r.selector==='group-targets').partition.parts.pop(),p=>p.routes.find(r=>r.selector==='group-targets').canonicalBytes++]){
  const corrupted=structuredClone(product.profile);mutate(corrupted);assert.throws(()=>createCityFrozenProfile(manifest,dependencies,corrupted,'frankfurt'));
 }
 assert(!product.overlay.assets.some(a=>a.path===(route.descriptor.transport??route.descriptor).path));
});
