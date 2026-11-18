import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// Round 5 (DECISIONS 2026-11-02 23:50, R4 S2-src-misc CDR[0..2]): three modules that
// the cold Infill import graph evaluates no longer decode, parse or read the page
// location at module evaluation. Each check runs the real module source through an
// esbuild bundle; only the codec and JSON.parse are observed, never replaced.
const web=fileURLToPath(new URL('../',import.meta.url));
const read=relative=>fs.readFileSync(path.join(web,relative),'utf8');

// --- Essen tower source: identity from the inline literal, decode per guard call ---
const essenFile='src/painted/infill/safety/infill-essen-reconstruction.ts';
const probeKey=Symbol.for('crimemaps.r5misc.essen-tower-decode');
const probe={calls:[]};globalThis[probeKey]=probe;
const codecFile=path.join(web,'src/painted/root500/safety/building-mesh-codec.ts');
const essenBuild=await build({stdin:{contents:`export * as essen from './${essenFile.slice(0,-3)}';\nexport {decodeBuildingShard as realDecode} from './src/painted/root500/safety/building-mesh-codec';`,resolveDir:web,loader:'ts'},absWorkingDir:web,bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022',logLevel:'silent',plugins:[{name:'r5misc-counting-codec',setup(builder){
 builder.onResolve({filter:/(?:^|\/)building-mesh-codec$/},args=>args.importer===path.join(web,essenFile)?{path:'counting',namespace:'r5misc-codec'}:undefined);
 builder.onLoad({filter:/.*/,namespace:'r5misc-codec'},()=>({loader:'js',resolveDir:path.dirname(codecFile),contents:`import * as real from './building-mesh-codec.ts';export * from './building-mesh-codec.ts';const probe=globalThis[Symbol.for('crimemaps.r5misc.essen-tower-decode')];export function decodeBuildingShard(...args){const value=real.decodeBuildingShard(...args);probe.calls.push({shard:args[0],city:args[1],value});return value;}`}));
 builder.onResolve({filter:/frozen-paint-tables/},()=>({path:'tables',namespace:'r5misc-tables'}));
 builder.onLoad({filter:/.*/,namespace:'r5misc-tables'},()=>({loader:'js',contents:`const fail=()=>{throw Error('the Essen tower guard reads no frozen table');};export const readFrozenTable=fail,readFrozenTableAsync=fail;export function frozenPaintTableRowCounts(){return undefined;}`}));
}}]});
const essenApi=await import('data:text/javascript;base64,'+Buffer.from(essenBuild.outputFiles[0].text).toString('base64'));
const towerLiteral=JSON.parse(/^const TOWER_SOURCE:any=(\{.*\});$/m.exec(read(essenFile))[1]);

test('Essen: importing the module decodes nothing and keeps no decoded tower cache',()=>{
 assert.deepEqual(probe.calls,[],'module evaluation never decodes the tower shard');
 const text=read(essenFile);
 assert(!/TOWER_SOURCE_CACHE|^(?:const|let|var) [^\n(]*=decodeBuildingShard\(/m.test(text),'no module-level decoded value or cache');
 assert.match(text,/^const towerSource=\(\)=>decodeBuildingShard\(TOWER_SOURCE,"essen"\)\.components\[0\];$/m);
 assert.equal(essenApi.essen.infillDataRefs.length,1,'the display data stays a frozen-data reference');
});

test('Essen: the literal ids equal the decoded ids, and each guard call decodes the unchanged literal transiently',()=>{
 const decoded=essenApi.realDecode(towerLiteral,'essen').components;
 assert.deepEqual(towerLiteral.components.map(c=>[c.objectId,c.partId]),decoded.map(c=>[c.objectId,c.partId]));
 const scope={memo:(key,create)=>create(),borrow(){throw Error('the tower guard reads no frozen data');},prepare(){throw Error('unexpected prepare');}};
 const data=essenApi.essen.getInfillData(scope),start=probe.calls.length;
 const changed=[{...decoded[0],origin:[decoded[0].origin[0]+1e-3,decoded[0].origin[1]]}];
 for(let round=1;round<=2;round++){
  assert.equal(data.infillSourceReadyForDisplay(changed),false,'a changed tower fails the exact-source guard');
  assert.equal(probe.calls.length,start+round,'one transient decode per guard call, nothing cached');
  const call=probe.calls.at(-1);assert.equal(call.city,'essen');assert.equal(JSON.stringify(call.shard),JSON.stringify(towerLiteral),'the unchanged inline literal is decoded');
  assert.deepEqual(call.value.components[0],decoded[0],'the transient decode equals an independent decode');
 }
 const before=probe.calls.length;
 assert.equal(data.infillSourceReadyForDisplay(decoded),true,'the unchanged tower passes the guard');
 assert.equal(probe.calls.length,before+1);
 // Rows that are neither the tower nor near the target never decode.
 assert.equal(data.infillSourceReadyForDisplay([{...decoded[0],city:'frankfurt'}]),false);
 assert.equal(probe.calls.length,before+1,'identity alone decodes nothing');
 probe.calls.length=0;
});

// --- F071 north court: the Munich source text is parsed on the first matching call ---
const f071File='src/painted/root500/safety/f071-north-court-paint6438.ts';
const f071Text=read(f071File);
const sourceText=JSON.parse(/^const SOURCE_JSON=(".*");$/m.exec(f071Text)[1]);
const sourceMarker='{"objectId":"osm/relation/4270033"';
const parses=[];const realParse=JSON.parse;
JSON.parse=function(text,...rest){if(typeof text==='string'&&text.startsWith(sourceMarker))parses.push(text.length);return realParse.call(this,text,...rest);};
const f071Build=await build({entryPoints:[path.join(web,f071File)],absWorkingDir:web,bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022',logLevel:'silent'});
const f071=await import('data:text/javascript;base64,'+Buffer.from(f071Build.outputFiles[0].text).toString('base64'));

test('F071: module evaluation never parses the Munich source; a miss never parses; each matching call parses once',()=>{
 try{
  assert.deepEqual(parses,[],'no parse at module evaluation');
  const source=realParse(sourceText),identity=/^const SOURCE_IDENTITY=\{objectId:("[^"]+"),partId:("[^"]+")\} as const;$/m.exec(f071Text);
  assert.deepEqual([realParse(identity[1]),realParse(identity[2])],[source.objectId,source.partId],'the inline identity equals the literal ids');
  assert(!/^(?:const|let|var) [^\n]*=JSON\.parse\(/m.test(f071Text),'no module-level parsed value or cache');
  const paint=new Float32Array(4),frames=new Float32Array(4);
  assert.deepEqual(f071.applyF071NorthCourt6438([],paint,frames,()=>undefined),{painted:0});
  assert.deepEqual(f071.applyF071NorthCourt6438([{...source,city:'berlin'}],paint,frames,()=>undefined),{painted:0});
  assert.deepEqual(parses,[],'an identity miss parses nothing');
  for(let round=1;round<=2;round++){
   assert.deepEqual(f071.applyF071NorthCourt6438([source],paint,frames,()=>undefined),{painted:0});
   assert.equal(parses.length,round,'one transient parse per matching call');
   assert.equal(parses.at(-1),sourceText.length,'the unchanged literal text is parsed');
  }
 }finally{JSON.parse=realParse;}
});

// --- facade-paint-controls: no location at module evaluation keeps the default mode ---
const controls=(await build({entryPoints:[path.join(web,'src/safety/facade-paint-controls.ts')],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'})).outputFiles[0].text;
const evaluate=location=>{const module={exports:{}},context={module,exports:module.exports,URLSearchParams,URL,console};if(location)context.location=location;vm.runInNewContext(controls,context);return module.exports;};

test('facade-paint-controls: Node evaluation without location keeps mode 2; the browser read is unchanged',()=>{
 assert.equal(evaluate().paintMode(),2,'no ReferenceError and the default mode');
 for(const [search,mode] of [['',2],['?paintMode=0',0],['?paintMode=1',1],['?paintMode=2',2],['?paintMode=7',2],['?paintMode=abc',2]])
  assert.equal(evaluate({search,href:'http://127.0.0.1/'+search,hostname:'127.0.0.1'}).paintMode(),mode,search);
});
