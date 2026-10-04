import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
const built=await build({entryPoints:[new URL('../src/safety/model.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const data='data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64');
const line={type:'LineString',coordinates:[[13.4,51],[13.41,51.01]]};
for(const lang of ['de','en','zh']){
 globalThis.location={search:'?lang='+lang};
 const {transitGeometryLabel}=await import(data+'#'+lang);
 const labels=JSON.parse(await readFile(new URL('../src/safety/locales/'+lang+'.json',import.meta.url),'utf8'));
 test(lang+': identified tram with unresolved geometry does not claim a full line is displayed',()=>{const scene={transit_route:{mode:'tram',line:'13',extent:'full_line'},geometry:null};const before=structuredClone(scene);assert.equal(transitGeometryLabel(scene),labels['transit.unresolved']);assert.deepEqual(scene,before);});
 test(lang+': invalid and point-only geometry do not establish a displayed route',()=>{for(const geometry of [{type:'LineString',coordinates:[[181,51],[13,51]]},{type:'Point',coordinates:[13,51]}])assert.equal(transitGeometryLabel({transit_route:{mode:'tram',line:'13',extent:'full_line'},geometry}),labels['transit.unresolved']);});
 test(lang+': resolved full line and bounded section retain their display labels',()=>{for(const [extent,key] of [['full_line','transit.fullLine'],['source_segment','transit.sourceSection']])assert.equal(transitGeometryLabel({transit_route:{mode:'tram',line:'13',extent},geometry:line}),labels[key]);});
 test(lang+': native road and carrier references retain their specific uncertainty',()=>{for(const [geometry_usage,key] of [['source_road_reference_only','transit.unknownRoad'],['carrier_line_reference_only','transit.carrierLine']])assert.equal(transitGeometryLabel({transit_route:{mode:'tram',line:'13',extent:'full_line'},geometry:line,geometry_usage}),labels[key]);});
}
delete globalThis.location;
