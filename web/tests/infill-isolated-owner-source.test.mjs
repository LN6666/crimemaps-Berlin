import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
const file=new URL('../src/painted/infill/safety/facade-paint-fragment.ts',import.meta.url).pathname;
// Keep the real template and all imported GLSL. Only frozen city availability
// is controlled: shared owner generation does not read the city's payload.
const result=await build({entryPoints:[file],bundle:true,write:false,platform:'node',format:'esm',plugins:[{
 name:'isolated-owner-oracle',setup(build){build.onLoad({filter:/facade-paint-fragment\.ts$/},args=>{
  if(args.path!==file)return;
  const contents=fs.readFileSync(file,'utf8').replaceAll('Object.prototype.hasOwnProperty.call(getPROGRESSIVE_CITY_EXTRA_GLSL(scope),city)','Object.prototype.hasOwnProperty.call(__testCities,city)')+`
let __testCities:Record<string,string>={};
const legacyTemplate=(progressive:string,dispatch:string,city?:string)=>specializeOwnerCity(emitShaderSource(facadePaintTemplate(progressive,dispatch)),city);
export function compareIsolatedShared(city:string,available:boolean){
 __testCities=available?{[city]:''}:{};
 const full=legacyTemplate('','progressiveFeatureDispatchCity',city);
 let before=full;for(const block of OWNER_CITY_BLOCKS)before=before.replace(block.source,'');
 const after=isolatedOwnerSharedFragment(city);
 return {before,after,fullCharacters:full.length,rawCharacters:facadePaintTemplate('','progressiveFeatureDispatchCity').charactersUpperBound};
}
export function compareCityTemplate(city:string|undefined,available:boolean){
 __testCities=available&&city?{[city]:''}:{};
 const progressive='vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}';
 return {before:legacyTemplate(progressive,'progressiveFeatureDispatchCity',city),after:makeFacadePaintFragment(progressive,'progressiveFeatureDispatchCity',city)};
}
`;
  return{contents,loader:'ts'};
 });}
}]});
const {compareIsolatedShared,compareCityTemplate}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
for(const available of [true,false])test(`real owner template stays byte-identical, city availability ${available}`,t=>{
 const value=compareIsolatedShared('frankfurt',available);
 assert.equal(value.after,value.before);
 assert(value.rawCharacters>value.after.length*2,'fixture exercises removal of substantial real owner sources');
 t.diagnostic(JSON.stringify({rawCharacters:value.rawCharacters,cityCharacters:value.fullCharacters,isolatedSharedCharacters:value.after.length}));
});
for(const city of ['berlin','bremen','cologne','dortmund','dresden','dusseldorf','essen','frankfurt','hamburg','hannover','leipzig','munich','nuremberg','stuttgart',undefined,'unknown']){
 for(const available of [true,false])test(`city template remains byte-identical: ${city}, available ${available}`,()=>{
  const {before,after}=compareCityTemplate(city,available);
  assert.equal(after,before);
 });
}
