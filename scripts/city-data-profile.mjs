import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
export const CITY_IDS=['berlin','hamburg','munich','cologne','frankfurt','dusseldorf','stuttgart','leipzig','dortmund','bremen','essen','dresden','hannover','nuremberg'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJSON=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const checkedPath=p=>{if(!/^\/safety\/buildings3d\/painted-tables\/[a-f0-9]{2}\/[a-f0-9]{64}\.json(?:\.gz)?$/.test(p))throw Error('Unsafe city asset path');return p.slice(1);};
/** Preserve each original JSON row lexeme, including -0 and numeric spelling. */
export function jsonArrayRows(raw){
 const text=new TextDecoder('utf-8',{fatal:true}).decode(raw),rows=[];let depth=0,string=false,escaped=false,start=-1;
 for(let i=0;i<text.length;i++){const c=text[i];if(string){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')string=false;continue;}if(c==='"'){string=true;continue;}if(c==='['||c==='{'){depth++;if(depth===1){if(c!=='['||start!==-1)throw Error('Expected JSON row array');start=i+1;}}else if(c===']'||c==='}'){if(depth===1){const row=text.slice(start,i).trim();if(row)rows.push(row);if(text.slice(i+1).trim())throw Error('Trailing JSON input');return rows;}depth--;}else if(c===','&&depth===1){rows.push(text.slice(start,i).trim());start=i+1;}}
 throw Error('Incomplete JSON row array');
}
export function effectiveCityTableManifest(profile,dependencies,manifest){
 const routes=new Map(profile.routes.map(r=>[r.file+'|'+r.canonicalSHA256+'|'+r.occurrence,r.descriptor.sha256])),descriptors=new Map(manifest.map(d=>[d.sha256,d]));
 for(const route of profile.routes)descriptors.set(route.descriptor.sha256,route.descriptor);
 const city=profile.city,active=['city','root500','delegated500','tier300','church',...(['frankfurt','stuttgart','essen'].includes(city)?['infill']:[]),...(city==='bremen'?['bremen']:[])],needed=new Set();
 for(const provider of active)for(const [sha,refs]of Object.entries(dependencies.initializers[provider]??{}))for(const [file,n]of Object.entries(refs))for(let occurrence=0;occurrence<n;occurrence++)needed.add(routes.get(file+'|'+sha+'|'+occurrence)??sha);
 return [...needed].map(sha=>{const d=descriptors.get(sha);if(!d)throw Error('Missing effective city table');return d;});
}
export function createCityDataCompiler({webRoot,assetRoots,recipesPath=path.join(path.dirname(webRoot),'scripts/city-data-recipes.json')}){
 const manifest=json(path.join(webRoot,'src/safety/frozen-paint-table-manifest.json')),dependencies=json(path.join(webRoot,'src/safety/frozen-paint-table-dependencies.json')),recipes=json(recipesPath).recipes;
 const descriptors=new Map(manifest.map(d=>[d.sha256,d])),inputs=new Map(),validators=new Map();
 function physical(d){const p=d.transport??d,relative=checkedPath(p.path),file=assetRoots.map(root=>path.join(root,relative)).find(p=>fs.existsSync(p));if(!file)throw Error('Missing canonical asset: '+p.path);const bytes=fs.readFileSync(file);if(bytes.length!==p.bytes||hash(bytes)!==p.sha256)throw Error('Canonical transport hash mismatch');return bytes;}
 function input(sha){if(inputs.has(sha))return inputs.get(sha);const d=descriptors.get(sha);if(!d)throw Error('Missing canonical descriptor');const packed=physical(d),raw=d.transport?zlib.gunzipSync(packed):packed;if(raw.length!==d.bytes||hash(raw)!==d.sha256)throw Error('Canonical raw hash mismatch');const entry={descriptor:d,value:JSON.parse(raw),raw};inputs.set(sha,entry);return entry;}
 function admissionValidation(file,rows){
  let validator=validators.get(file);
  if(!validator){const directory=path.join(webRoot,'src',path.dirname(file)),source=fs.readFileSync(path.join(directory,'progressive-paint.ts'),'utf8'),start=source.indexOf('const admissions=new Map'),end=source.indexOf('const rejectedPaintComponents',start);if(start<0||end<0)throw Error('Unknown admission initializer contract');const block=source.slice(start,end),ids=fs.readFileSync(path.join(directory,'frozen-paint-ids.ts'),'utf8'),repair=block.includes('isExplicitStLorenzRepair104')?fs.readFileSync(path.join(directory,'st-lorenz-user-repair104.ts'),'utf8'):'';
   const contents="import {FROZEN_PAINT_IDS} from './frozen-paint-ids';\n"+(repair?"import {isExplicitStLorenzRepair104} from './st-lorenz-user-repair104';\n":'')+'export function validate(PROGRESSIVE_ADMISSIONS:any[]){'+block+'return admissions.size;}';
   const require=createRequire(path.join(webRoot,'package.json')),{buildSync}=require('esbuild'),built=buildSync({stdin:{contents,loader:'ts',resolveDir:directory},bundle:true,platform:'node',format:'cjs',target:'es2022',write:false}),module={exports:{}};new Function('module','exports',built.outputFiles[0].text)(module,module.exports);validator={validate:module.exports.validate,sourceSHA256:hash(block+'\n'+ids+'\n'+repair)};validators.set(file,validator);
  }
  const count=validator.validate(rows);if(count!==rows.length)throw Error('Global admission count mismatch');return{sourceSHA256:validator.sourceSHA256,fullMapSize:count};
 }
 function generate(city,output){
  if(!CITY_IDS.includes(city))throw Error('Unknown profile city');
  const profile={schemaVersion:1,city,selectorVersion:'city-data-v1',routes:[]},assets=new Map(),removals=new Map();
  for(const recipe of recipes){
   const original=input(recipe.canonicalSHA256),value=original.value;let selected,exception,canonicalValidation;
   if(recipe.selector==='city-rows'){
    if(!Array.isArray(value)||value.some(row=>!row||!CITY_IDS.includes(row.city)))throw Error('Invalid admission city contract');canonicalValidation=admissionValidation(recipe.file,value);selected=value.filter(row=>row.city===city);
   }else if(recipe.selector==='city-key'){
    if(!value||Array.isArray(value)||typeof value[city]!=='string')throw Error('Missing city program contract');selected={[city]:value[city]};
   }else if(recipe.selector==='berlin-catalog'){selected=city==='berlin'?value:{};}
   else if(recipe.selector==='hamburg-catalog'){selected=city==='berlin'?{}:value;if(city!=='berlin'&&city!=='hamburg')exception='Existing non-Berlin program fallback uses this shared catalog; retained verbatim.';}
   else throw Error('Unknown city selector');
   const raw=recipe.selector==='city-rows'?Buffer.from('['+jsonArrayRows(original.raw).filter((_row,index)=>value[index].city===city).join(',')+']'):selected===value?original.raw:Buffer.from(JSON.stringify(selected)),sha256=hash(raw);let descriptor=descriptors.get(sha256),packed;
   if(descriptor)packed=physical(descriptor);else{packed=zlib.gzipSync(raw,{level:9,mtime:0});const physicalSHA=hash(packed);descriptor={path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:raw.length,transport:{path:`/safety/buildings3d/painted-tables/${physicalSHA.slice(0,2)}/${physicalSHA}.json.gz`,sha256:physicalSHA,bytes:packed.length,encoding:'gzip'}};}
   const p=descriptor.transport??descriptor,relative=checkedPath(p.path),destination=path.join(output,'assets',relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,packed);assets.set(p.path,{path:p.path,sha256:p.sha256,bytes:p.bytes,source:path.posix.join('assets',relative)});
   const selectedKeys=Array.isArray(selected)?selected.map(row=>[row.city,row.objectId,row.partId]):Object.keys(selected);
   profile.routes.push({...recipe,canonicalBytes:original.descriptor.bytes,descriptor,canonicalCount:Array.isArray(value)?value.length:Object.keys(value).length,retainedCount:Array.isArray(selected)?selected.length:Object.keys(selected).length,orderedSelectionSHA256:hash(JSON.stringify(selectedKeys)),...(exception?{exception}:{}),...(canonicalValidation?{canonicalValidation}:{})});
  }
  const activeProviders=['city','root500','delegated500','tier300','church',...(['frankfurt','stuttgart','essen'].includes(city)?['infill']:[]),...(city==='bremen'?['bremen']:[])];
  for(const route of profile.routes){if(route.descriptor.sha256===route.canonicalSHA256)continue;const hasUnprojected=activeProviders.some(provider=>Object.keys(dependencies.initializers[provider]?.[route.canonicalSHA256]??{}).some(file=>!profile.routes.some(r=>r.file===file&&r.canonicalSHA256===route.canonicalSHA256)));if(!hasUnprojected){const d=descriptors.get(route.canonicalSHA256),p=d.transport??d;if(!assets.has(p.path))removals.set(p.path,{path:p.path,sha256:p.sha256,bytes:p.bytes});}}
  writeJSON(path.join(output,'runtime-table-manifest.json'),effectiveCityTableManifest(profile,dependencies,manifest));
  writeJSON(path.join(output,'profile.json'),profile);const profileSHA256=hash(fs.readFileSync(path.join(output,'profile.json')));
  const overlay={schemaVersion:1,city,profileSHA256,runtimeTableManifestSHA256:hash(fs.readFileSync(path.join(output,'runtime-table-manifest.json'))),assets:[...assets.values()].sort((a,b)=>a.path.localeCompare(b.path)),removeCanonical:[...removals.values()].sort((a,b)=>a.path.localeCompare(b.path)),activeProviders};writeJSON(path.join(output,'asset-manifest.json'),overlay);return{profile,overlay};
 }
 return{generate,input};
}
export function applyCityDataProfile({profilePath,buildDirectory,siteDirectory,apply=false}){
 const profile=json(profilePath),profileSHA256=hash(fs.readFileSync(profilePath)),overlay=json(path.join(path.dirname(profilePath),'asset-manifest.json')),build=json(path.join(buildDirectory,'city-data-build-receipt.json')),runtimeManifestPath=path.join(path.dirname(profilePath),'runtime-table-manifest.json'),runtimeTableManifestSHA256=hash(fs.readFileSync(runtimeManifestPath));
 if(profile.schemaVersion!==1||!CITY_IDS.includes(profile.city)||overlay.city!==profile.city||overlay.profileSHA256!==profileSHA256||overlay.runtimeTableManifestSHA256!==runtimeTableManifestSHA256||build.schemaVersion!==1||build.purpose!=='publication'||build.city!==profile.city||build.profileSHA256!==profileSHA256||build.profileEnabled!==true)throw Error('Production city profile activation mismatch');
 for(const a of overlay.assets){const relative=checkedPath(a.path),source=path.join(path.dirname(profilePath),a.source),bytes=fs.readFileSync(source);if(hash(bytes)!==a.sha256||bytes.length!==a.bytes)throw Error('Projected asset hash mismatch');const target=path.join(siteDirectory,relative);if(apply){fs.mkdirSync(path.dirname(target),{recursive:true});if(fs.existsSync(target)&&hash(fs.readFileSync(target))!==a.sha256)throw Error('Existing projected asset conflict');fs.copyFileSync(source,target);}if(!fs.existsSync(target)||hash(fs.readFileSync(target))!==a.sha256)throw Error('Projected city asset missing from publication');}
 for(const a of overlay.removeCanonical){const target=path.join(siteDirectory,checkedPath(a.path));if(fs.existsSync(target)){if(!apply)throw Error('Foreign canonical input remains in publication');const bytes=fs.readFileSync(target);if(hash(bytes)!==a.sha256||bytes.length!==a.bytes)throw Error('Canonical removal binding mismatch');fs.unlinkSync(target);}}
 const receipt={schemaVersion:1,city:profile.city,profileSHA256,runtimeTableManifestSHA256,profileEnabled:true,selectedAssets:overlay.assets.map(({source,...a})=>a),excludedCanonicalInputs:overlay.removeCanonical};if(apply){fs.copyFileSync(runtimeManifestPath,path.join(siteDirectory,'city-data-tables.json'));writeJSON(path.join(siteDirectory,'city-data-profile-receipt.json'),receipt);fs.copyFileSync(profilePath,path.join(siteDirectory,'city-data-profile.json'));fs.copyFileSync(path.join(buildDirectory,'city-data-build-receipt.json'),path.join(siteDirectory,'city-data-build-receipt.json'));}return receipt;
}
function cli(){const args=process.argv.slice(2),mode=args.shift(),options={assetRoots:[]};for(let i=0;i<args.length;i++){const key=args[i];if(key==='--all'||key==='--apply'){options[key.slice(2)]=true;continue;}if(!args[i+1])throw Error('Missing CLI argument');const v=args[++i];if(key==='--asset-root')options.assetRoots.push(path.resolve(v));else options[key.slice(2)]=v;}
 if(mode==='generate'){const webRoot=path.resolve(options['web-root']??'web'),output=path.resolve(options.output??'.runtime/city-data'),compiler=createCityDataCompiler({webRoot,assetRoots:options.assetRoots});const cities=options.all?CITY_IDS:[options.city??json(path.join(webRoot,'../city-config.json')).city];for(const city of cities){const {overlay}=compiler.generate(city,path.join(output,city));console.log(JSON.stringify({city,profile:path.join(output,city,'profile.json'),selectedTransportBytes:overlay.assets.reduce((n,a)=>n+a.bytes,0),profileSHA256:overlay.profileSHA256}));}}
 else if(mode==='assemble'){const receipt=applyCityDataProfile({profilePath:path.resolve(options.profile),buildDirectory:path.resolve(options.build),siteDirectory:path.resolve(options.site),apply:Boolean(options.apply)});console.log(JSON.stringify({city:receipt.city,profileSHA256:receipt.profileSHA256,verified:true}));}
 else throw Error('Use generate or assemble');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)cli();
