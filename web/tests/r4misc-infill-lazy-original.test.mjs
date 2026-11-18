import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// R3 fixtures-r3 CDR[0] and review R4S2-2: the inline-shard Infill modules never
// decode their SOURCE shard at module evaluation, and never keep a decoded copy
// resident outside the page budget. Identity reads only the inline literal's ids;
// the complete-source guard decodes transiently on every call. The real codec runs
// behind a counting wrapper; decoded values are compared with an independent decode
// of the same literal.
const web=fileURLToPath(new URL('../',import.meta.url)),directory=path.join(web,'src/painted/infill/safety');
const files=fs.readdirSync(directory).filter(name=>name.endsWith('.ts')&&fs.readFileSync(path.join(directory,name),'utf8').includes('decodeBuildingShard(SOURCE_SHARD'));
const lazyFiles=files.filter(name=>/^const original=\(\)=>decodeBuildingShard\(SOURCE_SHARD,"(?:essen|frankfurt)"\)\.components;$/m.test(fs.readFileSync(path.join(directory,name),'utf8')));
const literal=name=>JSON.parse(/^const SOURCE_SHARD:any=(\{.*\});$/m.exec(fs.readFileSync(path.join(directory,name),'utf8'))[1]);

const probeKey=Symbol.for('crimemaps.r4misc.infill-lazy-original');
const probe={calls:[]};globalThis[probeKey]=probe;
const codecFile=path.join(web,'src/painted/root500/safety/building-mesh-codec.ts');
const result=await build({stdin:{contents:files.map((name,index)=>`export * as m${index} from './src/painted/infill/safety/${name.slice(0,-3)}';`).join('\n')+`\nexport {decodeBuildingShard as realDecode} from './src/painted/root500/safety/building-mesh-codec';`,resolveDir:web,loader:'ts'},absWorkingDir:web,bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022',logLevel:'silent',plugins:[{name:'counting-codec',setup(builder){
 builder.onResolve({filter:/(?:^|\/)building-mesh-codec$/},args=>args.importer.startsWith(directory+path.sep)?{path:'counting',namespace:'r4misc-codec'}:undefined);
 builder.onLoad({filter:/.*/,namespace:'r4misc-codec'},()=>({loader:'js',resolveDir:path.dirname(codecFile),contents:`import * as real from './building-mesh-codec.ts';export * from './building-mesh-codec.ts';const probe=globalThis[Symbol.for('crimemaps.r4misc.infill-lazy-original')];export function decodeBuildingShard(...args){const value=real.decodeBuildingShard(...args);probe.calls.push({shard:args[0],city:args[1],value});return value;}`}));
 builder.onResolve({filter:/frozen-paint-tables/},()=>({path:'tables',namespace:'r4misc-tables'}));
 builder.onLoad({filter:/.*/,namespace:'r4misc-tables'},()=>({loader:'js',contents:`const fail=()=>{throw Error('Infill identity checks read no frozen table');};export const readFrozenTable=fail,readFrozenTableAsync=fail;export function frozenPaintTableRowCounts(){return undefined;}`}));
}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const moduleOf=name=>api['m'+files.indexOf(name)];

test('the inline-shard modules are found and none decodes at module evaluation',()=>{
 assert.equal(files.length,16);assert.equal(lazyFiles.length,15,'every module-level ORIGINAL decode is lazy (Japan Center was already scope-lazy)');
 assert.deepEqual(probe.calls,[],'importing all 16 modules decodes nothing');
});

const fakeScope={stats:Object.freeze({disposed:false}),memo:(key,create)=>create(),borrow(){throw Error('the source guard reads no frozen data');},prepare(){throw Error('unexpected prepare');}};
const mutated=components=>components.map((component,index)=>index===0?{...component,origin:[component.origin[0]+1e-3,component.origin[1]]}:component);

for(const name of lazyFiles)test(`${name}: identity never decodes; the source guard decodes the unchanged literal transiently on every call`,()=>{
 const module=moduleOf(name),text=fs.readFileSync(path.join(directory,name),'utf8');
 assert(!/ORIGINAL_CACHE|^(?:let|var) [^\n]*decodeBuildingShard/m.test(text),'no module-level decoded cache');
 const identityName=Object.keys(module).find(key=>/^infill\w+Identity$/.test(key)&&typeof module[key]==='function');assert(identityName,'identity export of '+name);
 const reconstructionName=Object.keys(module).find(key=>/^infill\w+Reconstruction$/.test(key)&&typeof module[key]==='function');assert(reconstructionName,'reconstruction export of '+name);
 const identity=module[identityName],source=literal(name),decoded=api.realDecode(source,source.city).components,start=probe.calls.length,other=source.city==='essen'?'frankfurt':'essen';
 // The literal's ids are exactly the decoded ids, so the raw-id identity is unchanged.
 assert.deepEqual(source.components.map(c=>[c.objectId,c.partId]),decoded.map(c=>[c.objectId,c.partId]));
 assert.equal(identity({city:other,objectId:source.components[0].objectId,partId:source.components[0].partId}),false);
 for(const component of source.components)assert.equal(identity({city:source.city,objectId:component.objectId,partId:component.partId}),true);
 assert.equal(identity({city:source.city,objectId:source.components[0].objectId,partId:'not-a-part'}),false);
 assert.equal(identity({objectId:source.components[0].objectId,partId:source.components[0].partId}),true,'a city-less row still matches');
 for(const component of decoded)assert.equal(identity(component),true,'every decoded native row matches');
 assert.equal(probe.calls.length,start,'identity decodes nothing');
 // A changed native row fails the complete-source guard; each guard call decodes anew (nothing cached).
 const changed=mutated(decoded);
 if(name==='infill-frankfurt-opernturm.ts'){
  assert.throws(()=>module[reconstructionName](changed,{...fakeScope,stats:{disposed:true}}),{name:'AbortError'});
  assert.equal(probe.calls.length,start,'an already released scope never decodes its source');
 }
 for(let round=1;round<=2;round++){
  const result=module[reconstructionName](changed,fakeScope);
  assert.match(String(result.stats.error),/requires (?:complete unchanged real native source group|all\d+ unchanged real native source carriers)/);assert.equal(result.components,changed);
  assert.equal(probe.calls.length,start+round,'one transient decode per guard call');
  const call=probe.calls.at(-1);assert.equal(call.city,source.city);assert.equal(JSON.stringify(call.shard),JSON.stringify(source),'the unchanged inline SOURCE literal is decoded');
  assert.deepEqual(call.value.components,decoded,'the decoded components equal an independent decode');
 }
 if(typeof module.getInfillData==='function'){
  const before=probe.calls.length;
  assert.equal(module.getInfillData(fakeScope).infillDisplaySourceReady(decoded),true,'the unchanged real source group passes the guard');
  assert.equal(module.getInfillData(fakeScope).infillDisplaySourceReady(changed),false);
  assert.equal(probe.calls.length,before+2);
 }
 probe.calls.length=start;
});
