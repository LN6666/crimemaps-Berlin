import { defineConfig, loadEnv } from "vite";
import { readFileSync } from "node:fs";
import {createHash} from "node:crypto";
const frozenInitializerChunks=new Set<string>(JSON.parse(readFileSync(new URL('./frozen-initializer-chunks.json',import.meta.url),'utf8')));
const cityNames: Record<string, string> = {
  berlin: "Berlin", hamburg: "Hamburg", munich: "München", cologne: "Köln", frankfurt: "Frankfurt",
  dusseldorf: "Düsseldorf", stuttgart: "Stuttgart", leipzig: "Leipzig", dortmund: "Dortmund",
  bremen: "Bremen", essen: "Essen", dresden: "Dresden", hannover: "Hannover", nuremberg: "Nürnberg",
};
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
  if(profile&&(profile.schemaVersion!==1||profile.city!==config.city||profile.selectorVersion!=='city-data-v1'||profile.routes?.length!==12))throw Error('City data profile does not match this repository');
  const profileSHA256=profileText?createHash('sha256').update(profileText).digest('hex'):undefined;
  const cityDataPlugin={name:'city-data-profile',resolveId(id:string){if(id==='virtual:crimemaps-city-data')return '\0virtual:crimemaps-city-data';},load(id:string){if(id==='\0virtual:crimemaps-city-data')return 'export default '+JSON.stringify(profile)+';';},generateBundle(this:{emitFile:(file:{type:'asset';fileName:string;source:string})=>unknown}){this.emitFile({type:'asset',fileName:'city-data-build-receipt.json',source:JSON.stringify({schemaVersion:1,city:config.city,purpose:buildPurpose,profileEnabled:Boolean(profile),profileSHA256:profileSHA256??null},null,2)+'\n'});}};
  return {
  base: env.VITE_BASE_PATH || (command === "serve" ? "/" : config.base_path),
  define: { "import.meta.env.VITE_CRIMEMAPS_CITY": JSON.stringify(config.city) },
  plugins: [cityDataPlugin,{name:"city-document-title", transformIndexHtml: (html) =>
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
