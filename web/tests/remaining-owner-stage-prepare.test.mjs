import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=new URL('../src/painted/root500/safety/',import.meta.url),read=name=>readFile(new URL(name,source),'utf8');
const compile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
function evaluate(text,require){const exports={};new Function('require','exports',compile(text))(require,exports);return exports;}
async function evaluateOriginal(text){const exports={};await new AsyncFunction('require','exports',compile(text))((name)=>{
 if(name==='../../../safety/frozen-paint-tables')return{readFrozenTableAsync:async()=>({})};
 if(name==='./progressive-native-signature')return{nativePaintSignature:()=>{throw Error('No-hit test must not inspect model geometry');}};
 throw Error('Unexpected original dependency '+name);
},exports);return exports;}
const helper=evaluate(await read('lazy-owner-route.ts'),name=>{throw Error(name);});
const stems=['owner-f141-completion','owner-f165','owner-f140','owner-f169-completion','owner-f108-completion','owner-f089','owner-f231','owner-f105','owner-f124-completion','owner-f216-annex','owner-f189','owner-f192','owner-f065-platform','owner-f209'];
const definitions=[];
for(const stem of stems){
 const text=await read(stem+'-lazy.ts'),original=await read(stem+'-reconstruction.ts'),identity=text.match(/export \{(\w+)\}/)[1],reconstruct=text.match(/export const (\w+)=route\.reconstruct/)[1],materials=text.match(/export function (\w+BaseMaterials)\(/)[1],prepare=text.match(/export function (prepare\w+)\(/)[1];
 const expose='\nexports.__needed=needed;exports.__materialNeeded=materialNeeded;';
 const constants=Object.fromEntries([...text.matchAll(/const (\w+IDS)=(\[.*?\]);/g)].map(m=>[m[1],JSON.parse(m[2])]));
 const ids=Object.values(constants).flat(),extra=stem==='owner-f089'?[{city:'munich',objectId:'osm/way/362467272',partId:'osm/way/362467272/component/ff2b80e77db8b1ee0125'}]:[];
 definitions.push({stem,text,original,expose,identity,reconstruct,materials,prepare,ids,extra});
}
const plain={city:'berlin',objectId:'osm/way/1',partId:'unrelated',origin:[0,0],batches:[]};
const empty=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};}
function load(row,gate){let imports=0,reconstructionInput,materialArgs;const result={components:[],stats:{...empty(),error:'unchanged partial owner result'},retainedExtra:{same:true}};
 const stub={
  [row.reconstruct]:input=>{reconstructionInput=input;return result;},
  [row.materials]:(...args)=>{materialArgs=args;args[1][0]=.375;args[2][0]=.625;return row.stem==='owner-f105'?undefined:{objects:3,vertices:7,buildingCount:1,actualVisualAccepted:false};}
 };
 const module=evaluate(row.text+row.expose,name=>{if(name==='./lazy-owner-route')return helper;assert.equal(name,'./'+row.stem+'-reconstruction');imports++;return gate?.promise??stub;});
 return{module,stub,result,get imports(){return imports;},get reconstructionInput(){return reconstructionInput;},get materialArgs(){return materialArgs;}};
}
function materialRows(row){
 const base={...plain,...row.ids[0]},marker=row.stem==='owner-f105'?'F105Completion':row.text.match(/displayEstimates\?\.([A-Za-z0-9]+)/)?.[1];assert(marker,row.stem);
 const value=row.stem==='owner-f105'?{patchSHA256:row.text.match(/const F105_SHA=("[^"]+");/)[1].slice(1,-1)}:/owner-f(?:189|192)$/.test(row.stem)?{sourceSignature:row.ids[0].signature}:true;
 return{base,marked:{...base,displayEstimates:{[marker]:value}}};
}

test('14 cold facades preserve the actual original identity, no-hit container/statistics and material return contract',async()=>{
 for(const row of definitions){
  const f=load(row),m=f.module,original=await evaluateOriginal(row.original),input=[plain],a=m[row.reconstruct](input),b=original[row.reconstruct](input);
  assert.deepEqual(a,b,row.stem);assert.equal(a.components===input,b.components===input,row.stem+' no-hit container');
  const paint=new Float32Array([.25]),frames=new Float32Array([.5]);assert.deepEqual(m[row.materials](input,paint,frames),original[row.materials](input,paint,frames));assert.deepEqual([...paint],[.25]);assert.deepEqual([...frames],[.5]);
  assert.equal(m[row.prepare](input,new AbortController().signal),undefined);assert.equal(f.imports,0);
  for(const id of [...row.ids,...row.extra])for(const candidate of [id,{...id,city:'berlin'},{...id,partId:id.partId+'/wrong'}])assert.equal(m[row.identity](candidate),original[row.identity](candidate),row.stem+' exact identity');
  const {base,marked}=materialRows(row);assert.equal(m.__materialNeeded(base),false);assert.deepEqual(m[row.materials]([base],paint,frames),row.stem==='owner-f105'?undefined:row.stem==='owner-f231'?{objects:0,vertices:0,buildingCount:1,actualVisualAccepted:false}:{objects:0,vertices:0,actualVisualAccepted:false});assert.equal(f.imports,0);
  assert.equal(m.__materialNeeded(marked),true);assert.throws(()=>m[row.reconstruct]([base]),/not prepared/);assert.throws(()=>m[row.materials]([marked],paint,frames),/not prepared/);
  const controller=new AbortController();controller.abort();assert.throws(()=>m[row.prepare]([],controller.signal),{name:'AbortError'});
 }
});

test('14 facades pass original input/output references and exact material buffers through once prepared',async()=>{
 for(const row of definitions){const f=load(row),m=f.module,{base,marked}=materialRows(row);let waits=0;
  await m[row.prepare]([base],new AbortController().signal,operation=>{waits++;return operation;});assert.equal(waits,1);assert.equal(f.imports,1);
  const input=[base,plain];assert.equal(m[row.reconstruct](input),f.result);assert.equal(f.reconstructionInput,input);
  const materials=[marked,plain],paint=new Float32Array([0]),frames=new Float32Array([0]);assert.deepEqual(m[row.materials](materials,paint,frames),row.stem==='owner-f105'?undefined:{objects:3,vertices:7,buildingCount:1,actualVisualAccepted:false});assert.equal(f.materialArgs[0],materials);assert.equal(f.materialArgs[1],paint);assert.equal(f.materialArgs[2],frames);assert.equal(paint[0],.375);assert.equal(frames[0],.625);
  await m[row.prepare]([base],new AbortController().signal);assert.equal(f.imports,1);
 }
});

test('completion marker-only input preserves its original broad material guard and count',async()=>{
 for(const row of definitions.filter(r=>/-completion$/.test(r.stem))){const original=await evaluateOriginal(row.original);let imports=0;
  const m=evaluate(row.text+row.expose,name=>{if(name==='./lazy-owner-route')return helper;imports++;return original;});
  const {marked}=materialRows(row),input=[{...marked,objectId:'unregistered',partId:'unregistered'}],paint=new Float32Array(),frames=new Float32Array();assert.equal(m[row.identity](input[0]),false);assert.equal(m.__materialNeeded(input[0]),true);
  await m[row.prepare](input,new AbortController().signal);assert.equal(imports,1);assert.deepEqual(m[row.reconstruct](input),original[row.reconstruct](input));assert.deepEqual(m[row.materials](input,paint,frames),original[row.materials](input,paint,frames));
 }
});

test('all original material identity/marker/signature branches retain their exact counts and return values',async()=>{
 for(const row of definitions){const original=await evaluateOriginal(row.original),m=evaluate(row.text,name=>name==='./lazy-owner-route'?helper:original);
  for(const id of [...row.ids,...row.extra]){
   let {marked}=materialRows(row);marked={...marked,...id};
   if(row.stem==='owner-f140'&&id!==row.ids[0]&&!row.text.match(/const F140_IDS=(\[.*?\]);/)[1].includes(id.partId))marked.displayEstimates={F140Courtyard:true};
   if(/owner-f(?:189|192)$/.test(row.stem))marked.displayEstimates={[row.stem==='owner-f189'?'F189PhotoEstimate':'F192PhotoEstimate']:{sourceSignature:id.signature}};
   for(const value of [marked,{...marked,city:'berlin'},{...marked,displayEstimates:{}},{...marked,partId:marked.partId+'/unregistered'}]){
    const input=[value],paint=new Float32Array(),frames=new Float32Array();await m[row.prepare](input,new AbortController().signal);
    assert.deepEqual(m[row.materials](input,paint,frames),original[row.materials](input,paint,frames),row.stem+' '+value.partId);
   }
  }
 }
});

test('14 imports keep cancellation and failed-session retry without exposing a late result',async()=>{
 for(const row of definitions){const gate=deferred(),f=load(row,gate),m=f.module,{base}=materialRows(row),own=new AbortController();
  const pending=m[row.prepare]([base],own.signal);own.abort();await assert.rejects(pending,{name:'AbortError'});assert.throws(()=>m[row.reconstruct]([base]),/not prepared/);
  gate.resolve(f.stub);await assert.rejects(m[row.prepare]([base],new AbortController().signal,()=>Promise.reject(Error('session failed'))),/session failed/);assert.throws(()=>m[row.reconstruct]([base]),/not prepared/);
  await m[row.prepare]([base],new AbortController().signal,operation=>operation);assert.equal(f.imports,1);assert.equal(m[row.reconstruct]([base]),f.result);
 }
});

test('the production chain waits at each real new stage, preserves prefix/order and stops an aborted continuation',async()=>{
 const aggregate=await read('owner-reconstruction.ts'),declarations=new Map([...aggregate.matchAll(/(?:const |,)(\w+)=(owner\w+Reconstruction)\(/g)].map(m=>[m[1],m[2]])),previous=new Map();
 for(const row of definitions){const hit=aggregate.match(new RegExp('yield \\{components:(\\w+)\\.components,prepare:'+row.prepare+'\\}'));assert(hit,row.stem);previous.set(declarations.get(hit[1]),row);}
 const calls=[],loads=[],gates=new Map(),routes=new Map(),targets=new Map(definitions.map(row=>[row,{...plain,...row.ids[0]}]));let firstRow;
 for(const row of definitions){const gate=deferred();gates.set(row,gate);const original={
  [row.reconstruct]:components=>{calls.push(row.reconstruct);return{components,stats:{...empty(),error:row.stem+' partial'}};},
  [row.materials]:()=>({objects:0,vertices:0,actualVisualAccepted:false})
 };
 const route=evaluate(row.text,name=>{if(name==='./lazy-owner-route')return helper;loads.push(row);firstRow??=row;return gate.promise.then(()=>original);});routes.set(row,route);
 }
 function get(name){for(const route of routes.values())if(route[name])return route[name];if(name.startsWith('prepareOwner'))return()=>undefined;if(name.endsWith('Identity'))return()=>false;if(name==='ownerF154RecoveredSources')return rows=>rows;
  return components=>{calls.push(name);const next=previous.get(name);return{components:next?[...components,targets.get(next)]:components,stats:empty(),cofaceStats:{fixture:true}};};}
 const chain=evaluate(aggregate,name=>{const lines=aggregate.split('\n').filter(l=>l.endsWith("from '"+name+"';"));assert(lines.length,name);return Object.fromEntries(lines.flatMap(line=>line.match(/\{([^}]+)\}/)[1].split(',')).map(n=>n.trim()).filter(n=>!n.startsWith('type ')).map(n=>[n,get(n)]));});
 const own=new AbortController(),pending=chain.prepareOwnerReconstructionComponents([plain],own.signal);await tick();assert.equal(loads.length,1);assert(firstRow);const prefix=[...calls];own.abort();await assert.rejects(pending,{name:'AbortError'});gates.get(firstRow).resolve();await tick();assert.deepEqual(calls,prefix);assert(!calls.includes(firstRow.reconstruct));
 for(const gate of gates.values())gate.resolve();calls.length=0;const asyncResult=await chain.prepareOwnerReconstructionComponents([plain],new AbortController().signal);const asyncCalls=[...calls];assert.equal(loads.length,14);assert.equal(new Set(loads).size,14);
 calls.length=0;const syncResult=chain.ownerReconstructionComponents([plain]);assert.deepEqual(syncResult,asyncResult);assert.deepEqual(calls,asyncCalls);for(const row of definitions)assert.equal(calls.filter(n=>n===row.reconstruct).length,1);
});
