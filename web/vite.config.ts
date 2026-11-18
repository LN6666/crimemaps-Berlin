import { defineConfig, loadEnv } from "vite";
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {createHash} from "node:crypto";
import {validateBuildingFocusRegistry} from './src/safety/building-focus-registry';
import {createCityFrozenProfile} from './src/safety/city-frozen-profile';
import {validateBuildingDetailGroupMetadataAsset} from './src/safety/building-detail-demand';
const frozenInitializerChunks=new Set<string>(JSON.parse(readFileSync(new URL('./frozen-initializer-chunks.json',import.meta.url),'utf8')));
const cityNames: Record<string, string> = {
  berlin: "Berlin", hamburg: "Hamburg", munich: "München", cologne: "Köln", frankfurt: "Frankfurt",
  dusseldorf: "Düsseldorf", stuttgart: "Stuttgart", leipzig: "Leipzig", dortmund: "Dortmund",
  bremen: "Bremen", essen: "Essen", dresden: "Dresden", hannover: "Hannover", nuremberg: "Nürnberg",
};
function readBuildingDetailCatalog(filename: string | undefined, city: string) {
  if (!filename) return undefined;
  const bytes=readFileSync(filename);
  if(bytes.length>100_000)throw Error('Building detail catalog exceeds 100000 bytes');
  const value=JSON.parse(bytes.toString('utf8'));
  if(value?.schema==='crimemaps-building-detail-catalog-v2'){
    if(value.schemaVersion!==2||value.city!==city||Object.keys(value).some(key=>!['schema','schemaVersion','city','entryCount','pages'].includes(key))||
      !Number.isSafeInteger(value.entryCount)||value.entryCount<0||value.entryCount>100_000||!Array.isArray(value.pages)||value.pages.length>256||
      (value.entryCount===0)!==(value.pages.length===0))throw Error('Invalid paged building detail catalog');
    const prefixes=new Set<string>(),paths=new Set<string>();
    for(const page of value.pages){
      const asset=page?.asset;
      if(!page||Object.keys(page).some(key=>!['prefix','asset'].includes(key))||typeof page.prefix!=='string'||!/^[a-f0-9]{2}$/.test(page.prefix)||prefixes.has(page.prefix)||
        !asset||Object.keys(asset).some(key=>!['path','sha256','bytes'].includes(key))||typeof asset.sha256!=='string'||!/^[a-f0-9]{64}$/.test(asset.sha256)||
        !Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>100_000||typeof asset.path!=='string'||
        !/^\/safety\/buildings3d\/detail-variants\/[A-Za-z0-9_./-]+$/.test(asset.path)||asset.path.includes('//')||asset.path.split('/').some((part:string)=>part==='.'||part==='..')||
        !asset.path.endsWith('/catalog-'+asset.sha256+'.json')||paths.has(asset.path))throw Error('Invalid building detail catalog page');
      prefixes.add(page.prefix);paths.add(asset.path);
    }
    return {value,sha256:createHash('sha256').update(bytes).digest('hex')};
  }
  if(!value||value.schema!=='crimemaps-building-detail-catalog-v1'||value.schemaVersion!==1||value.city!==city||
    Object.keys(value).some(key=>!['schema','schemaVersion','city','entries'].includes(key))||!Array.isArray(value.entries))throw Error('Invalid building detail catalog');
  const identities=new Set<string>(),paths=new Set<string>(),sha=/^[a-f0-9]{64}$/;
  const validSHA=(value:unknown)=>typeof value==='string'&&sha.test(value);
  for(const row of value.entries){
    const asset=row?.demandIndex;
    if(!row||Object.keys(row).some(key=>!['canonicalIndexSHA256','canonicalLeafSHA256','leafId','demandIndex','groupMetadata'].includes(key))||
      !validSHA(row.canonicalIndexSHA256)||!validSHA(row.canonicalLeafSHA256)||typeof row.leafId!=='string'||!row.leafId||row.leafId.length>512||
      !asset||Object.keys(asset).some(key=>!['path','sha256','bytes'].includes(key))||!validSHA(asset.sha256)||
      !Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>500_000||typeof asset.path!=='string'||
      !/^\/safety\/buildings3d\/detail-variants\/[A-Za-z0-9_./-]+$/.test(asset.path)||asset.path.includes('//')||asset.path.split('/').some((part:string)=>part==='.'||part==='..')||
      !asset.path.endsWith('/demand-'+asset.sha256+'.json'))throw Error('Invalid building detail catalog entry');
    if(row.groupMetadata!==undefined)validateBuildingDetailGroupMetadataAsset(row.groupMetadata);
    const key=JSON.stringify([row.canonicalIndexSHA256,row.canonicalLeafSHA256,row.leafId]);
    if(identities.has(key)||paths.has(asset.path))throw Error('Duplicate building detail catalog entry');
    identities.add(key);paths.add(asset.path);
  }
  return {value,sha256:createHash('sha256').update(bytes).digest('hex')};
}
function readBuildingFocusRegistry(filename:string|undefined,city:string){
  if(!filename)return undefined;
  const bytes=readFileSync(filename);
  if(bytes.length>100000)throw Error('Building focus registry exceeds 100000 bytes');
  return{value:validateBuildingFocusRegistry(JSON.parse(bytes.toString('utf8')),city),sha256:createHash('sha256').update(bytes).digest('hex')};
}
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const config = JSON.parse(readFileSync(new URL("../city-config.json", import.meta.url), "utf8"));
  if (!Object.hasOwn(cityNames, config.city) || config.repository !== `crimemaps-${config.city[0].toUpperCase()}${config.city.slice(1)}` ||
      config.base_path !== `/${config.repository}/`) throw Error("Invalid single-city configuration");
  const profilePath=process.env.CRIMEMAPS_CITY_PROFILE;
  const buildPurpose=process.env.CRIMEMAPS_BUILD_PURPOSE==='code-check'?'code-check':'publication';
  if(command==='build'&&buildPurpose==='publication'&&!profilePath)throw Error('Production build requires CRIMEMAPS_CITY_PROFILE; run scripts/city-data-profile.mjs generate first');
  const profileText=profilePath?readFileSync(profilePath,'utf8'):undefined;
  const profile=profileText?JSON.parse(profileText):null;
  if(profile){
    if(Buffer.byteLength(profileText!,'utf8')>100_000)throw Error('City data profile exceeds publication limit');
    // Build and browser use the same exact active-provider binding contract.
    // These are descriptor metadata only; no model/table values are loaded.
    const manifest=JSON.parse(readFileSync(new URL('./src/safety/frozen-paint-table-manifest.json',import.meta.url),'utf8'));
    const dependencies=JSON.parse(readFileSync(new URL('./src/safety/frozen-paint-table-dependencies.json',import.meta.url),'utf8'));
    createCityFrozenProfile(manifest,dependencies,profile,config.city);
  }
  const profileSHA256=profileText?createHash('sha256').update(profileText).digest('hex'):undefined;
  const detailCatalog=readBuildingDetailCatalog(process.env.CRIMEMAPS_BUILDING_DETAIL_CATALOG,config.city);
  const focusRegistry=readBuildingFocusRegistry(process.env.CRIMEMAPS_BUILDING_FOCUS_REGISTRY,config.city);
  const cityDataPlugin={name:'city-data-profile',resolveId(id:string){if(id==='virtual:crimemaps-city-data')return '\0virtual:crimemaps-city-data';},load(id:string){if(id==='\0virtual:crimemaps-city-data')return 'export default '+JSON.stringify(profile)+'; export const profileSHA256='+JSON.stringify(profileSHA256??null)+'; export const buildingDetailCatalog='+(detailCatalog?JSON.stringify(detailCatalog.value):'undefined')+'; export const buildingFocusRegistry='+(focusRegistry?JSON.stringify(focusRegistry.value):'undefined')+';';},generateBundle(this:{emitFile:(file:{type:'asset';fileName:string;source:string})=>unknown}){this.emitFile({type:'asset',fileName:'city-data-build-receipt.json',source:JSON.stringify({schemaVersion:1,city:config.city,purpose:buildPurpose,profileEnabled:Boolean(profile),profileSHA256:profileSHA256??null,...(detailCatalog?{buildingDetailCatalogSHA256:detailCatalog.sha256}:{}),...(focusRegistry?{buildingFocusRegistrySHA256:focusRegistry.sha256}:{})},null,2)+'\n'});}};
  // This ownership response is authorized only for Berlin. Vite copies public
  // files outside Rollup's bundle, so filter the actual resolved output directory.
  const ownershipName='google73948d3ce3a710e9.html';
  let ownershipOutput='';
  const cityOwnershipPlugin={
    name:'city-ownership-response', apply:'build' as const,
    configResolved(resolved:{root:string;build:{outDir:string}}){ownershipOutput=resolve(resolved.root,resolved.build.outDir);},
    writeBundle(){
      const filename=resolve(ownershipOutput,ownershipName);
      if(config.city!=='berlin'){
        rmSync(filename,{force:true});
        return;
      }
      const bytes=readFileSync(filename);
      if(bytes.toString('utf8')!==`google-site-verification: ${ownershipName}` || bytes.length!==53)
        throw Error('Unexpected ownership verification response');
    },
  };
  return {
  base: env.VITE_BASE_PATH || (command === "serve" ? "/" : config.base_path),
  define: { "import.meta.env.VITE_CRIMEMAPS_CITY": JSON.stringify(config.city) },
  plugins: [cityDataPlugin,cityOwnershipPlugin,{name:"city-document-title", transformIndexHtml: (html) =>
    html.replace(/<title>.*?<\/title>/, `<title>CrimeMaps · ${cityNames[config.city]} · Polizeimeldungen</title>`)}],
  server: { host: "127.0.0.1", port: 5173 },
  build: {
    rollupOptions: {
      // The frozen engines contain interdependent generated material dispatches.
      // Rollup's recursive argument inclusion becomes exponential across these
      // dispatches. Preserve their code intact; esbuild still performs minification.
      treeshake: false,
      input: { main: new URL("./index.html", import.meta.url).pathname },
      output: {
        // Keep the accepted geometry modules split rather than concatenating
        // hundreds of megabytes into one parse/compile unit.
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if(id.includes('node_modules/maplibre-gl'))return 'maplibre';
          // Preserve the source dependency graph across async initializer gates.
          // Bucketed manual chunks can introduce a false cyclic TLA dependency.
          const sourceAt=id.lastIndexOf('/web/src/'),sourceId=sourceAt<0?'':id.slice(sourceAt+9).split('?')[0];
          if(frozenInitializerChunks.has(sourceId))return 'init-'+sourceId.slice(0,-3).replaceAll('/','--');
          const owner=id.match(/\/painted\/(root500|delegated500|infill|bremen)\/safety\/owner-f(\d{3})/);
          if(owner)return `paint-${owner[1]}-${Number(owner[2])%8}`;
        },
      },
    },
  },
  };
});
