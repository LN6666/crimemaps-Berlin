import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const C=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),S=process.env.OWNER_CITY_TEST_BASE??C;
const ts=createRequire(S+'/web/package.json')('typescript'),AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const dir='web/src/painted/root500/safety/',files=['owner-f215-reconstruction.ts','owner-f082-derived-pack.ts','owner-f082-derived-display.ts'];
const cities=['berlin','hamburg','munich','cologne','frankfurt','dusseldorf','stuttgart','leipzig','dortmund','bremen','essen','dresden','hannover','nuremberg'];
const hashes={f215:'46c25f2ebc0e368cde0106a3bca753a3f501d70828b4e1286dc5b88bbeda43ab',f082:'91d0186a3537a5a37652b2131dd9d4967128f38f2f208b3a86a9aa45f196bf34'};
const header={displayOnlyId:'derived/f082/schloss-lustheim/original-way-23152070',patchSHA256:'781ebaeb245e97318dfa35c06dcceb15c9c0545c45093d3e3a8ffec0e84144b9'};
const batch={positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.4,.5,.6],frames:Array(15).fill(.25),kind:0};
function fixture(sha){
 if(process.env.OWNER_CITY_TEST_ASSETS){const all=JSON.parse(fs.readFileSync(S+'/web/src/safety/frozen-paint-table-manifest.json','utf8')),d=all.find(d=>d.sha256===sha);assert(d);const physical=fs.readFileSync(path.join(process.env.OWNER_CITY_TEST_ASSETS,d.transport.path));assert.equal(crypto.createHash('sha256').update(physical).digest('hex'),d.transport.sha256);const raw=zlib.gunzipSync(physical);assert.equal(raw.length,d.bytes);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),sha);return JSON.parse(raw);}
 if(sha===hashes.f215)return [structuredClone(batch)];
 assert.equal(sha,hashes.f082);const n=26406;return {...header,city:'munich',family:5082,origin:[11.5758,48.2487],referenceFootprint:{type:'Polygon',coordinates:[[[11.5757,48.2484],[11.5761,48.2484],[11.5761,48.2489],[11.5757,48.2484]]]},referenceOriginalWay:'osm/way/23152070',sourceNativeGetterCount:0,sourceNativeGetters:[],nativeSurfaceClaim:false,sourceArraysModified:false,geometryRole:'fixture',originalSource:{preserved:true},displayEstimates:{preserved:true},batches:[{...batch,positions:Array(n*3).fill(0),normals:Array(n*3).fill(0),indices:Array(n).fill(0),frames:Array(n*5).fill(.25),paint:Array(n*4).fill(.5),writeMask:Array(n).fill(true),role:2,geometryRole:'fixture',sourceEvidence:'exact test fixture'}]};
}
async function load(city,{original=false,read=fixture}={}){let reads=[];const modules={};for(const file of files){let text=fs.readFileSync(path.join(original?S:C,dir,file),'utf8');if(file===files[0])text+='\nexports.__E=E;';const compiled=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};await new AsyncFunction('require','exports',compiled)(name=>{if(name==='../../../safety/deployment')return{repositoryCity:city};if(name==='../../../safety/frozen-paint-tables')return{readFrozenTableAsync:async sha=>{reads.push(sha);return read(sha);}};if(name==='./progressive-native-signature')return{nativePaintSignature:c=>c.geometrySignature};if(name==='./owner-f082-derived-pack')return modules[files[1]];throw Error('Unexpected import '+name);},exports);modules[file]=exports;}return{modules,reads};}
const f082Admission={sourcePbfSHA256:'e20b47b7be53dea2a670f03e35019af1897aedeced31e0b78b7877e7d757a866',bounds:[11.5756,48.2483,11.5762,48.2490],zoom:18};
const plain={city:'berlin',objectId:'osm/way/1',partId:'unrelated',batches:[],origin:[0,0]};

test('all14 deployment cities parse only their own F215/F082 model; foreign identities remain queryable',async()=>{
 for(const city of cities){const {modules:m,reads}=await load(city);assert.deepEqual(reads,city==='leipzig'?[hashes.f215]:city==='munich'?[hashes.f082]:[],city);assert.deepEqual(m[files[2]].F082_DERIVED_ID,{objectId:header.displayOnlyId,partId:header.displayOnlyId+'/surface'});assert.equal(m[files[2]].isF082DerivedDisplayIdentity(m[files[2]].F082_DERIVED_ID),true);if(city!=='munich'){assert.equal(m[files[1]].F082_DERIVED_PACK,null);assert.equal(m[files[1]].getF082DerivedDisplayRequest('munich'),null);}assert.equal(m[files[0]].ownerF215Reconstruction([plain]).components[0],plain);}
});

test('foreign deployment preserves exact Leipzig carrier and leaves material buffers untouched',async()=>{
 const {modules:m,reads}=await load('berlin'),mod=m[files[0]],input=[structuredClone(mod.__E)],before=structuredClone(input),result=mod.ownerF215Reconstruction(input);assert.deepEqual(reads,[]);assert.equal(result.components,input);assert.deepEqual(result.components,before);assert.equal(result.stats.objects,0);assert.equal(result.stats.vertices,0);assert.equal(result.stats.error,undefined);
 const marked=structuredClone(input);marked[0].displayEstimates.F215Exterior={sourceRetained:true};const n=marked[0].batches.reduce((n,b)=>n+b.positions.length/3,0),paint=new Float32Array(n*4).fill(.125),frames=new Float32Array(n*5).fill(.25),oldPaint=paint.slice(),oldFrames=frames.slice();assert.deepEqual(mod.ownerF215BaseMaterials(marked,paint,frames),{objects:0,vertices:0,actualVisualAccepted:false});assert.deepEqual(paint,oldPaint);assert.deepEqual(frames,oldFrames);
});

test('Leipzig keeps exact F215 fixture geometry, private clones and material output',async()=>{
 const {modules:m}=await load('leipzig'),mod=m[files[0]],input=structuredClone(mod.__E),expected=fixture(hashes.f215),result=mod.ownerF215Reconstruction([input]);assert.equal(result.stats.error,undefined);assert.equal(result.stats.objects,1);assert.deepEqual(result.components[0].batches,expected);const second=mod.ownerF215Reconstruction([structuredClone(input)]);assert.notEqual(result.components[0].batches[0].positions,second.components[0].batches[0].positions);
 const n=result.components[0].batches.reduce((n,b)=>n+b.positions.length/3,0),paint=new Float32Array(n*4),frames=new Float32Array(n*5);mod.ownerF215BaseMaterials(result.components,paint,frames);assert(frames.some(v=>v!==0));
 if(S!==C){const old=(await load('leipzig',{original:true})).modules[files[0]],before=old.ownerF215Reconstruction([structuredClone(input)]),p=new Float32Array(n*4),f=new Float32Array(n*5);old.ownerF215BaseMaterials(before.components,p,f);assert.deepEqual(result,before);assert.deepEqual(paint,p);assert.deepEqual(frames,f);}
});

test('Munich keeps complete F082 fixture, independent requests, derived semantics and exact materials/readback',async()=>{
 const {modules:m}=await load('munich'),pack=m[files[1]],display=m[files[2]],expected=fixture(hashes.f082);assert.deepEqual(pack.F082_DERIVED_PACK,expected);const a=pack.getF082DerivedDisplayRequest('munich'),b=pack.getF082DerivedDisplayRequest('munich');assert.deepEqual(a,b);assert.notEqual(a.batches[0].positions,b.batches[0].positions);
 const rows=display.appendF082DerivedDisplay([],'munich',f082Admission);assert.equal(rows.length,1);assert.equal(rows[0].batches.reduce((n,b)=>n+b.positions.length/3,0),26406);assert.equal(rows[0].batches.reduce((n,b)=>n+b.indices.length/3,0),8802);const paint=new Float32Array(26406*4),frames=new Float32Array(26406*5);display.applyF082DerivedDisplayMaterials(rows,paint,frames);const proof=display.serializeF082DerivedReadback(rows[0],true);assert.equal(proof.patchSHA256,expected.patchSHA256);assert.equal(proof.nativeGetterCount,0);
 if(S!==C){const old=(await load('munich',{original:true})).modules[files[2]],before=old.appendF082DerivedDisplay([],'munich',f082Admission),p=new Float32Array(paint.length),f=new Float32Array(frames.length);old.applyF082DerivedDisplayMaterials(before,p,f);assert.deepEqual(rows,before);assert.deepEqual(paint,p);assert.deepEqual(frames,f);assert.deepEqual(proof,old.serializeF082DerivedReadback(before[0],true));}
});

test('foreign deployment never calls the initializer; native-city failures still propagate and header drift rejects',async()=>{
 const fail=()=>{throw Error('initializer failed');};await load('berlin',{read:fail});await assert.rejects(load('leipzig',{read:fail}),/initializer failed/);await assert.rejects(load('munich',{read:fail}),/initializer failed/);await assert.rejects(load('munich',{read:sha=>({...fixture(sha),patchSHA256:'wrong'})}),/identity header mismatch/);
});
