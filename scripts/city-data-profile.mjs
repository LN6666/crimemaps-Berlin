import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
import {CITY_TABLE_PART_BYTES,encodeCityTable,jsonArrayRows,partitionCityTable} from './city-data-shards.mjs';
export {jsonArrayRows,partitionCityTable} from './city-data-shards.mjs';
export const CITY_IDS=['berlin','hamburg','munich','cologne','frankfurt','dusseldorf','stuttgart','leipzig','dortmund','bremen','essen','dresden','hannover','nuremberg'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJSON=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const checkedPath=p=>{if(!/^\/safety\/buildings3d\/painted-tables\/[a-f0-9]{2}\/[a-f0-9]{64}\.json(?:\.gz)?$/.test(p))throw Error('Unsafe city asset path');return p.slice(1);};
const envelopeSelector=s=>s==='model-targets'||s==='group-targets';
const envelopeKind=s=>s==='group-targets'?'group-envelope':'model-envelope';
const envelopeRows=s=>s==='group-targets'?'groups':'models';
const envelopeIdentity=s=>s==='group-targets'?'queueId':'targetId';
const activeCityProviders=city=>['city','root500','delegated500','tier300','church',...(['frankfurt','stuttgart','essen'].includes(city)?['infill']:[]),...(city==='bremen'?['bremen']:[])];
function recipeRules(city,selectorVersion){
 if(!CITY_IDS.includes(city)||!['city-data-v1','city-data-v2','city-data-v3'].includes(selectorVersion))throw Error('Unknown city data selector version/city');
 const providers=['city','root500','delegated500','tier300'];
 const rules=providers.flatMap(provider=>[['paint-admissions','city-rows'],['feature-cities','city-key']].map(([name,selector])=>({provider,file:`painted/${provider}/safety/progressive-${name}.ts`,selector})));
 for(const provider of ['root500','delegated500'])for(const name of ['berlin','hamburg'])rules.push({provider,file:`painted/${provider}/safety/progressive-${name}-programs.ts`,selector:`${name}-catalog`});
 if(selectorVersion!=='city-data-v1')for(const provider of activeCityProviders(city).filter(p=>p==='infill'||p==='bremen'))for(const [name,selector]of [['paint-admissions','city-rows'],['feature-cities','city-key']])rules.push({provider,file:`painted/${provider}/safety/progressive-${name}.ts`,selector});
 if(selectorVersion!=='city-data-v1'&&city==='bremen')rules.push({provider:'bremen',file:'painted/bremen/safety/repairs-data.ts',selector:'model-targets'});
 if(selectorVersion==='city-data-v3'&&city==='frankfurt')rules.push({provider:'infill',file:'painted/infill/safety/infill-frankfurt-low-office-bulk70-data.ts',selector:'group-targets'});
 return rules;
}
/** Exact code-owned initializer bindings, including the active city's extra provider. */
export function expectedCityDataRecipes(dependencies,city,selectorVersion){
 return recipeRules(city,selectorVersion).map(({provider,file,selector})=>{
  const matches=Object.entries(dependencies.initializers?.[provider]??{}).filter(([_sha,refs])=>Object.hasOwn(refs,file));
  if(matches.length!==1||matches[0][1][file]!==1||!(/^[a-f0-9]{64}$/).test(matches[0][0]))throw Error('Ambiguous or missing city initializer binding: '+file);
  return{file,canonicalSHA256:matches[0][0],occurrence:0,selector};
 });
}
export function validateCityDataProfile(profile,dependencies,manifest){
 if(profile.schemaVersion!==1||!Array.isArray(profile.routes))throw Error('Invalid source city data profile');
 const expected=new Map(expectedCityDataRecipes(dependencies,profile.city,profile.selectorVersion).map(r=>[r.file,r])),canonical=new Map(manifest.map(d=>[d.sha256,d])),seen=new Set();
 for(const route of profile.routes){
  const binding=expected.get(route.file),original=canonical.get(route.canonicalSHA256);
  if(!binding||seen.has(route.file)||!original||original.bytes!==route.canonicalBytes||['file','canonicalSHA256','occurrence','selector'].some(k=>route[k]!==binding[k]))throw Error('City data route binding mismatch');
  if(envelopeSelector(route.selector)&&(route.descriptor.sha256!==route.canonicalSHA256||route.retainedCount!==route.canonicalCount||route.partition?.kind!==envelopeKind(route.selector)||route.partition.schemaVersion!==1||!Array.isArray(route.partition.parts)))throw Error('Model target route requires a complete canonical partition');
  seen.add(route.file);
 }
 if(seen.size!==expected.size)throw Error('Incomplete city data route closure');
 return [...expected.values()];
}
function writeAsset(output,assets,descriptor,packed){
 const p=descriptor.transport??descriptor,relative=checkedPath(p.path),destination=path.join(output,'assets',relative);
 if(!assets.has(p.path)){fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,packed);assets.set(p.path,{path:p.path,sha256:p.sha256,bytes:p.bytes,source:path.posix.join('assets',relative)});}
}
function partitionRoute(route,raw,{targetBytes,descriptors,physical,emit}){
 const kind=route.selector==='city-rows'?'object-rows':envelopeSelector(route.selector)?envelopeKind(route.selector):['berlin-catalog','hamburg-catalog'].includes(route.selector)?'record-keys':undefined;
 if(!kind)return;
 const {partition,assets}=partitionCityTable(raw,{kind,targetBytes});
 for(let i=0;i<assets.length;i++){
  const asset=assets[i],known=descriptors.get(asset.descriptor.sha256);
  // A small partition may equal an existing whole table. Retain its descriptor
  // and transport identity instead of creating two encodings for the same SHA.
  const descriptor=known??asset.descriptor,packed=known?physical(known):asset.packed;
  partition.parts[i].descriptor=descriptor;descriptors.set(descriptor.sha256,descriptor);emit(descriptor,packed);
 }
 route.partition=partition;
}
export function cityRouteAssets(route){
 return [...(envelopeSelector(route.selector)?[]:[route.descriptor]),...(route.partition?.parts??[]).map(part=>part.descriptor)];
}
function profileRemovals(profile,dependencies,descriptors,assets){
 const removals=new Map(),needed=new Set(),routes=new Map(profile.routes.map(route=>[route.file+'|'+route.canonicalSHA256+'|'+route.occurrence,route]));
 for(const provider of activeCityProviders(profile.city))for(const [sha,refs]of Object.entries(dependencies.initializers[provider]??{}))for(const [file,n]of Object.entries(refs))for(let occurrence=0;occurrence<n;occurrence++){
  const route=routes.get(file+'|'+sha+'|'+occurrence);
  if(route)for(const descriptor of cityRouteAssets(route))needed.add(descriptor.sha256);else needed.add(sha);
 }
 for(const route of profile.routes){if(needed.has(route.canonicalSHA256))continue;const d=descriptors.get(route.canonicalSHA256),p=d.transport??d;if(!assets.has(p.path))removals.set(p.path,{path:p.path,sha256:p.sha256,bytes:p.bytes});}
 return removals;
}
export function encodeCityDataProfile(profile){
 const raw=Buffer.from(JSON.stringify(profile)+'\n');
 if(raw.length>100_000)throw Error('City data profile exceeds 100000-byte publication limit');
 return raw;
}
function finishProfile(profile,dependencies,manifest,output,assets,removals){
 validateCityDataProfile(profile,dependencies,manifest);
 const profileBytes=encodeCityDataProfile(profile);
 const runtimeBytes=Buffer.from(JSON.stringify(effectiveCityTableManifest(profile,dependencies,manifest),null,2)+'\n');
 if(runtimeBytes.length>500_000)throw Error('City runtime table manifest exceeds 500000-byte publication limit');
 fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'runtime-table-manifest.json'),runtimeBytes);
 fs.writeFileSync(path.join(output,'profile.json'),profileBytes);const profileSHA256=hash(profileBytes);
 const overlay={schemaVersion:1,city:profile.city,profileSHA256,runtimeTableManifestSHA256:hash(fs.readFileSync(path.join(output,'runtime-table-manifest.json'))),assets:[...assets.values()].sort((a,b)=>a.path.localeCompare(b.path)),removeCanonical:[...removals.values()].sort((a,b)=>a.path.localeCompare(b.path)),activeProviders:activeCityProviders(profile.city)};writeJSON(path.join(output,'asset-manifest.json'),overlay);return{profile,overlay};
}
export function effectiveCityTableManifest(profile,dependencies,manifest){
 const routes=new Map(profile.routes.map(r=>[r.file+'|'+r.canonicalSHA256+'|'+r.occurrence,r.descriptor.sha256])),descriptors=new Map(manifest.map(d=>[d.sha256,d]));
 for(const route of profile.routes){descriptors.set(route.descriptor.sha256,route.descriptor);for(const part of route.partition?.parts??[])descriptors.set(part.descriptor.sha256,part.descriptor);}
 const active=activeCityProviders(profile.city),needed=new Set();
 for(const provider of active)for(const [sha,refs]of Object.entries(dependencies.initializers[provider]??{}))for(const [file,n]of Object.entries(refs))for(let occurrence=0;occurrence<n;occurrence++)needed.add(routes.get(file+'|'+sha+'|'+occurrence)??sha);
 for(const route of profile.routes)if(needed.has(route.descriptor.sha256))for(const part of route.partition?.parts??[])needed.add(part.descriptor.sha256);
 return [...needed].map(sha=>{const d=descriptors.get(sha);if(!d)throw Error('Missing effective city table');return d;});
}
export function createCityDataCompiler({webRoot,assetRoots,recipesPath=path.join(path.dirname(webRoot),'scripts/city-data-recipes.json'),partition=true,shardTargetBytes=CITY_TABLE_PART_BYTES,selectorVersion='city-data-v2'}){
 const manifest=json(path.join(webRoot,'src/safety/frozen-paint-table-manifest.json')),dependencies=json(path.join(webRoot,'src/safety/frozen-paint-table-dependencies.json')),recipes=json(recipesPath).recipes;
 const descriptors=new Map(manifest.map(d=>[d.sha256,d])),inputs=new Map(),validators=new Map();
 const knownRules=new Map([...recipeRules('bremen','city-data-v2'),...recipeRules('frankfurt','city-data-v3')].map(r=>[r.file,r])),configured=new Map();
 for(const recipe of recipes){const rule=knownRules.get(recipe.file);if(!rule||configured.has(recipe.file)||recipe.selector!==rule.selector||recipe.occurrence!==0)throw Error('Invalid or duplicate configured city recipe');configured.set(recipe.file,recipe);}
 function selectedRecipes(city){return expectedCityDataRecipes(dependencies,city,selectorVersion).map(expected=>{const recipe=configured.get(expected.file);if(!recipe||['file','canonicalSHA256','occurrence','selector'].some(k=>recipe[k]!==expected[k]))throw Error('Configured city recipe binding mismatch: '+expected.file);return expected;});}
 function physical(d){const p=d.transport??d,relative=checkedPath(p.path),file=assetRoots.map(root=>path.join(root,relative)).find(p=>fs.existsSync(p));if(!file)throw Error('Missing canonical asset: '+p.path);const bytes=fs.readFileSync(file);if(bytes.length!==p.bytes||hash(bytes)!==p.sha256)throw Error('Canonical transport hash mismatch');return bytes;}
 function input(sha){if(inputs.has(sha))return inputs.get(sha);inputs.clear();const d=descriptors.get(sha);if(!d)throw Error('Missing canonical descriptor');const packed=physical(d),raw=d.transport?zlib.gunzipSync(packed,{maxOutputLength:d.bytes}):packed;if(raw.length!==d.bytes||hash(raw)!==d.sha256)throw Error('Canonical raw hash mismatch');const entry={descriptor:d,value:JSON.parse(raw),raw,packed};inputs.set(sha,entry);return entry;}
 function admissionValidation(file,rows){
  let validator=validators.get(file);
  if(!validator){
   const directory=path.join(webRoot,'src',path.dirname(file)),source=fs.readFileSync(path.join(directory,'progressive-paint.ts'),'utf8'),require=createRequire(path.join(webRoot,'package.json')),ts=require('typescript');
   const syntax=ts.createSourceFile('progressive-paint.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),declaration=syntax.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='validateProgressiveAdmissionRows'&&s.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword));
   if(!declaration?.body)throw Error('Missing pure progressive admission validator');
   // Compile the exported pure function with its actual validation constants.
   // Importing its full renderer-facing module would also resolve large GLSL,
   // virtual city-profile and loader modules, even when the function is pure.
   const block=declaration.getText(syntax),ids=fs.readFileSync(path.join(directory,'frozen-paint-ids.ts'),'utf8'),repair=block.includes('isExplicitStLorenzRepair104')?fs.readFileSync(path.join(directory,'st-lorenz-user-repair104.ts'),'utf8'):'';
   const contents="import {FROZEN_PAINT_IDS} from './frozen-paint-ids';\n"+(repair?"import {isExplicitStLorenzRepair104} from './st-lorenz-user-repair104';\n":'')+block+'\nexport const validate=(rows:any[])=>validateProgressiveAdmissionRows(rows).size;';
   const {buildSync}=require('esbuild'),built=buildSync({stdin:{contents,loader:'ts',resolveDir:directory},bundle:true,platform:'node',format:'cjs',target:'es2022',write:false}),module={exports:{}};new Function('module','exports',built.outputFiles[0].text)(module,module.exports);validator={validate:module.exports.validate,sourceSHA256:hash(block+'\n'+ids+'\n'+repair)};validators.set(file,validator);
  }
  const count=validator.validate(rows);if(count!==rows.length)throw Error('Global admission count mismatch');return{sourceSHA256:validator.sourceSHA256,fullMapSize:count};
 }
 function project(recipe,city){
   if(!selectedRecipes(city).some(r=>r.file===recipe.file&&r.canonicalSHA256===recipe.canonicalSHA256&&r.occurrence===recipe.occurrence&&r.selector===recipe.selector))throw Error('City projection is outside configured recipe closure');
   try{
   const original=input(recipe.canonicalSHA256),value=original.value;let selected,exception,canonicalValidation;
   if(recipe.selector==='city-rows'){
    if(!Array.isArray(value)||value.some(row=>!row||!CITY_IDS.includes(row.city)))throw Error('Invalid admission city contract');canonicalValidation=admissionValidation(recipe.file,value);selected=value.filter(row=>row.city===city);
   }else if(recipe.selector==='city-key'){
    if(!value||Array.isArray(value)||typeof value[city]!=='string')throw Error('Missing city program contract');selected={[city]:value[city]};
   }else if(recipe.selector==='berlin-catalog'){selected=city==='berlin'?value:{};}
   else if(recipe.selector==='hamburg-catalog'){selected=city==='berlin'?{}:value;if(city!=='berlin'&&city!=='hamburg')exception='Existing non-Berlin program fallback uses this shared catalog; retained verbatim.';}
   else if(envelopeSelector(recipe.selector)){
    if(!value||Array.isArray(value)||!Array.isArray(value[envelopeRows(recipe.selector)])||value[envelopeRows(recipe.selector)].some(model=>!model||typeof model[envelopeIdentity(recipe.selector)]!=='string'||!model[envelopeIdentity(recipe.selector)])||new Set(value[envelopeRows(recipe.selector)].map(model=>model[envelopeIdentity(recipe.selector)])).size!==value[envelopeRows(recipe.selector)].length)throw Error('Invalid model target envelope');selected=value;
   }
   else throw Error('Unknown city selector');
   const raw=recipe.selector==='city-rows'?Buffer.from('['+jsonArrayRows(original.raw).filter((_row,index)=>value[index].city===city).join(',')+']'):selected===value?original.raw:Buffer.from(JSON.stringify(selected)),sha256=hash(raw);let descriptor=descriptors.get(sha256),packed;
   if(descriptor)packed=descriptor.sha256===original.descriptor.sha256?original.packed:physical(descriptor);else({descriptor,packed}=encodeCityTable(raw));
   const selectedKeys=envelopeSelector(recipe.selector)?selected[envelopeRows(recipe.selector)].map(model=>model[envelopeIdentity(recipe.selector)]):Array.isArray(selected)?selected.map(row=>[row.city,row.objectId,row.partId]):Object.keys(selected);
   const route={...recipe,canonicalBytes:original.descriptor.bytes,descriptor,canonicalCount:envelopeSelector(recipe.selector)?value[envelopeRows(recipe.selector)].length:Array.isArray(value)?value.length:Object.keys(value).length,retainedCount:selectedKeys.length,orderedSelectionSHA256:hash(JSON.stringify(selectedKeys)),...(exception?{exception}:{}),...(canonicalValidation?{canonicalValidation}:{})};
   return{route,raw,packed};
   }finally{inputs.delete(recipe.canonicalSHA256);}
 }
 function generate(city,output){
  const selected=selectedRecipes(city),profile={schemaVersion:1,city,selectorVersion,routes:[]},assets=new Map();
  for(const recipe of selected){
   const {route,raw,packed}=project(recipe,city),descriptor=route.descriptor;
   if(!envelopeSelector(route.selector))writeAsset(output,assets,descriptor,packed);
   if(partition||envelopeSelector(route.selector))partitionRoute(route,raw,{targetBytes:shardTargetBytes,descriptors:new Map([...descriptors,[descriptor.sha256,descriptor]]),physical:d=>d.sha256===descriptor.sha256?packed:physical(d),emit:(d,p)=>writeAsset(output,assets,d,p)});
   profile.routes.push(route);
  }
  return finishProfile(profile,dependencies,manifest,output,assets,profileRemovals(profile,dependencies,descriptors,assets));
 }
 return{generate,input,project};
}

/** Reuse verified city selections and add their physical demand partitions.
 * An explicit v1 -> v2 upgrade reads canonical inputs only for the newly active
 * provider's missing routes. Existing full-source validation receipts survive;
 * newly selected admissions pass the same full canonical pure validation.
 */
export function shardCityDataProfile({profilePath,webRoot,assetRoots=[],output,targetBytes=CITY_TABLE_PART_BYTES,selectorVersion,recipesPath,verifiedProfileSHA256}){
 if(path.resolve(profilePath)===path.resolve(output,'profile.json'))throw Error('Partition output must not overwrite its input profile');
 const sourceBytes=fs.readFileSync(profilePath),source=JSON.parse(sourceBytes),manifest=json(path.join(webRoot,'src/safety/frozen-paint-table-manifest.json')),dependencies=json(path.join(webRoot,'src/safety/frozen-paint-table-dependencies.json'));
 if(verifiedProfileSHA256!==undefined&&(!/^[a-f0-9]{64}$/.test(verifiedProfileSHA256)||hash(sourceBytes)!==verifiedProfileSHA256||targetBytes!==CITY_TABLE_PART_BYTES))throw Error('Verified source profile hash/partition target mismatch');
 validateCityDataProfile(source,dependencies,manifest);
 const targetVersion=selectorVersion??source.selectorVersion;
 if(Number(source.selectorVersion.slice(-1))>Number(targetVersion.slice(-1)))throw Error('City profile coverage cannot be downgraded');
 const expected=expectedCityDataRecipes(dependencies,source.city,targetVersion),previous=new Map(source.routes.map(r=>[r.file,r]));
 const descriptors=new Map(manifest.map(d=>[d.sha256,d])),sourceDirectory=path.dirname(profilePath),roots=[...assetRoots,path.join(sourceDirectory,'assets'),sourceDirectory],assets=new Map();
 for(const route of source.routes){const original=descriptors.get(route.canonicalSHA256);if(!original||original.bytes!==route.canonicalBytes)throw Error('Source city canonical binding mismatch');for(const descriptor of [route.descriptor,...cityRouteAssets(route)])descriptors.set(descriptor.sha256,descriptor);}
 function physical(descriptor){
  const d=descriptor.transport??descriptor,relative=checkedPath(d.path),file=roots.map(root=>path.join(root,relative)).find(p=>fs.existsSync(p));
  if(!file)throw Error('Missing selected city asset: '+d.path);
  const packed=fs.readFileSync(file);if(packed.length!==d.bytes||hash(packed)!==d.sha256)throw Error('Selected city transport hash mismatch');return packed;
 }
 const profile={...source,selectorVersion:targetVersion,routes:[]};let compiler;
 for(const recipe of expected){
  const originalRoute=previous.get(recipe.file);let route,raw,packed;
  if(originalRoute&&verifiedProfileSHA256){
   for(const descriptor of cityRouteAssets(originalRoute))if(!assets.has((descriptor.transport??descriptor).path))writeAsset(output,assets,descriptor,physical(descriptor));
   profile.routes.push(originalRoute);continue;
  }
  if(originalRoute){
   const {partition:_previousPartition,...retained}=originalRoute;route=retained;const descriptor=route.descriptor;packed=physical(descriptor);
   raw=descriptor.transport?zlib.gunzipSync(packed,{maxOutputLength:descriptor.bytes}):packed;
   if(raw.length!==descriptor.bytes||hash(raw)!==descriptor.sha256)throw Error('Selected city raw hash mismatch');
   const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)),keys=envelopeSelector(route.selector)?value[envelopeRows(route.selector)].map(model=>model[envelopeIdentity(route.selector)]):Array.isArray(value)?value.map(row=>[row.city,row.objectId,row.partId]):Object.keys(value);
   if(keys.length!==route.retainedCount||hash(JSON.stringify(keys))!==route.orderedSelectionSHA256)throw Error('Selected city order/count receipt mismatch');
   if(route.selector==='city-rows'&&(!Array.isArray(value)||value.some(row=>row.city!==source.city)))throw Error('Foreign city admission row');
  }else{
   compiler??=createCityDataCompiler({webRoot,assetRoots:roots,selectorVersion:targetVersion,...(recipesPath?{recipesPath}:{})});
   ({route,raw,packed}=compiler.project(recipe,source.city));
  }
  const descriptor=route.descriptor;descriptors.set(descriptor.sha256,descriptor);
  if(!envelopeSelector(route.selector))writeAsset(output,assets,descriptor,packed);
  partitionRoute(route,raw,{targetBytes,descriptors:new Map(descriptors),physical:d=>d.sha256===descriptor.sha256?packed:physical(d),emit:(d,p)=>writeAsset(output,assets,d,p)});
  profile.routes.push(route);
 }
 return finishProfile(profile,dependencies,manifest,output,assets,profileRemovals(profile,dependencies,descriptors,assets));
}

export function applyCityDataProfile({profilePath,buildDirectory,siteDirectory,apply=false,webRoot=fileURLToPath(new URL('../web/',import.meta.url))}){
 const profile=json(profilePath),profileSHA256=hash(fs.readFileSync(profilePath)),overlay=json(path.join(path.dirname(profilePath),'asset-manifest.json')),build=json(path.join(buildDirectory,'city-data-build-receipt.json')),runtimeManifestPath=path.join(path.dirname(profilePath),'runtime-table-manifest.json'),runtimeTableManifestSHA256=hash(fs.readFileSync(runtimeManifestPath));
 if(fs.statSync(profilePath).size>100_000||fs.statSync(runtimeManifestPath).size>500_000)throw Error('City profile metadata exceeds publication limit');
 const dependencies=json(path.join(webRoot,'src/safety/frozen-paint-table-dependencies.json')),canonical=json(path.join(webRoot,'src/safety/frozen-paint-table-manifest.json'));
 validateCityDataProfile(profile,dependencies,canonical);
 if(profile.schemaVersion!==1||!CITY_IDS.includes(profile.city)||overlay.city!==profile.city||overlay.profileSHA256!==profileSHA256||overlay.runtimeTableManifestSHA256!==runtimeTableManifestSHA256||build.schemaVersion!==1||build.purpose!=='publication'||build.city!==profile.city||build.profileSHA256!==profileSHA256||build.profileEnabled!==true)throw Error('Production city profile activation mismatch');
 const expectedRuntime=effectiveCityTableManifest(profile,dependencies,canonical),runtime=json(runtimeManifestPath);
 if(!Array.isArray(runtime)||runtime.length!==expectedRuntime.length||!isDeepStrictEqual(new Map(runtime.map(d=>[d.sha256,d])),new Map(expectedRuntime.map(d=>[d.sha256,d]))))throw Error('City runtime active initializer closure mismatch');
 const required=new Map();for(const route of profile.routes)for(const descriptor of cityRouteAssets(route)){const p=descriptor.transport??descriptor;required.set(p.path,p);}
 if(!Array.isArray(overlay.assets)||overlay.assets.length!==required.size||new Set(overlay.assets.map(a=>a.path)).size!==required.size||overlay.assets.some(a=>!required.has(a.path)||['sha256','bytes'].some(k=>a[k]!==required.get(a.path)[k])||a.source!==path.posix.join('assets',checkedPath(a.path))))throw Error('City asset dependency closure mismatch');
 const expectedRemovals=profileRemovals(profile,dependencies,new Map(canonical.map(d=>[d.sha256,d])),required);
 if(!Array.isArray(overlay.removeCanonical)||overlay.removeCanonical.length!==expectedRemovals.size||!isDeepStrictEqual(new Map(overlay.removeCanonical.map(d=>[d.path,d])),expectedRemovals))throw Error('City canonical removal dependency closure mismatch');
 for(const a of overlay.assets){const relative=checkedPath(a.path),source=path.join(path.dirname(profilePath),a.source),bytes=fs.readFileSync(source);if(hash(bytes)!==a.sha256||bytes.length!==a.bytes)throw Error('Projected asset hash mismatch');const target=path.join(siteDirectory,relative);if(apply){fs.mkdirSync(path.dirname(target),{recursive:true});if(fs.existsSync(target)&&hash(fs.readFileSync(target))!==a.sha256)throw Error('Existing projected asset conflict');fs.copyFileSync(source,target);}if(!fs.existsSync(target)||hash(fs.readFileSync(target))!==a.sha256)throw Error('Projected city asset missing from publication');}
 for(const a of overlay.removeCanonical){const target=path.join(siteDirectory,checkedPath(a.path));if(fs.existsSync(target)){if(!apply)throw Error('Foreign canonical input remains in publication');const bytes=fs.readFileSync(target);if(hash(bytes)!==a.sha256||bytes.length!==a.bytes)throw Error('Canonical removal binding mismatch');fs.unlinkSync(target);}}
 const receipt={schemaVersion:1,city:profile.city,profileSHA256,runtimeTableManifestSHA256,profileEnabled:true,selectedAssets:overlay.assets.map(({source,...a})=>a),excludedCanonicalInputs:overlay.removeCanonical};if(apply){fs.copyFileSync(runtimeManifestPath,path.join(siteDirectory,'city-data-tables.json'));writeJSON(path.join(siteDirectory,'city-data-profile-receipt.json'),receipt);fs.copyFileSync(profilePath,path.join(siteDirectory,'city-data-profile.json'));fs.copyFileSync(path.join(buildDirectory,'city-data-build-receipt.json'),path.join(siteDirectory,'city-data-build-receipt.json'));}return receipt;
}
function cli(){const args=process.argv.slice(2),mode=args.shift(),options={assetRoots:[]};for(let i=0;i<args.length;i++){const key=args[i];if(key==='--all'||key==='--apply'){options[key.slice(2)]=true;continue;}if(!args[i+1])throw Error('Missing CLI argument');const v=args[++i];if(key==='--asset-root')options.assetRoots.push(path.resolve(v));else options[key.slice(2)]=v;}
 if(mode==='generate'){const webRoot=path.resolve(options['web-root']??'web'),output=path.resolve(options.output??'.runtime/city-data'),compiler=createCityDataCompiler({webRoot,assetRoots:options.assetRoots,...(options['selector-version']?{selectorVersion:options['selector-version']}:{})});const cities=options.all?CITY_IDS:[options.city??json(path.join(webRoot,'../city-config.json')).city];for(const city of cities){const {overlay}=compiler.generate(city,path.join(output,city));console.log(JSON.stringify({city,profile:path.join(output,city,'profile.json'),selectedTransportBytes:overlay.assets.reduce((n,a)=>n+a.bytes,0),profileSHA256:overlay.profileSHA256}));}}
 else if(mode==='shard'){const output=path.resolve(options.output??'.runtime/city-data-shards'),{profile,overlay}=shardCityDataProfile({profilePath:path.resolve(options.profile),webRoot:path.resolve(options['web-root']??'web'),assetRoots:options.assetRoots,output,...(options['target-bytes']?{targetBytes:Number(options['target-bytes'])}:{}),...(options['selector-version']?{selectorVersion:options['selector-version']}:{}),...(options['verified-profile-sha256']?{verifiedProfileSHA256:options['verified-profile-sha256']}:{})});console.log(JSON.stringify({city:profile.city,profile:path.join(output,'profile.json'),partitionedRoutes:profile.routes.filter(r=>r.partition).length,parts:profile.routes.reduce((n,r)=>n+(r.partition?.parts.length??0),0),selectedTransportBytes:overlay.assets.reduce((n,a)=>n+a.bytes,0),profileSHA256:overlay.profileSHA256}));}
 else if(mode==='assemble'){const receipt=applyCityDataProfile({profilePath:path.resolve(options.profile),buildDirectory:path.resolve(options.build),siteDirectory:path.resolve(options.site),apply:Boolean(options.apply),...(options['web-root']?{webRoot:path.resolve(options['web-root'])}:{})});console.log(JSON.stringify({city:receipt.city,profileSHA256:receipt.profileSHA256,verified:true}));}
 else throw Error('Use generate, shard or assemble');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)cli();
