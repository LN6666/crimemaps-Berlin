import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build,transform} from 'esbuild';
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),d=path.join(web,'src/painted/church/safety');
const bundle=await build({entryPoints:[path.join(d,'berlin-church-program-sharing.ts')],bundle:true,write:false,format:'esm',platform:'node'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('all ten observed families share only after complete submitted fragments match',()=>{
 const visited=[];assert(api.berlinChurchProgramsEqual(family=>{visited.push(family);return 'complete vertex-interface + masks + material + light + reflection';}));
 assert.deepEqual(visited,[200,201,202,203,204,205,208,209,210,211]);
 for(const family of visited){const key='current-family:'+family;assert.equal(api.berlinChurchProgramKey(key,true),'current-family:200');assert.equal(api.berlinChurchProgramKey(key,false),key);}
 assert(!api.berlinChurchProgramsEqual(family=>'common body'+(family===209?'changed outer discard':'')));
 assert(!api.berlinChurchProgramsEqual(()=>''));
});
test('unreviewed families and malformed keys always retain independent programs',()=>{
 for(const key of ['current-family:0','current-family:199','current-family:206','current-family:207','current-family:212','current-family:200.1','current-family:0200','current-family:NaN','base']){
  assert(!api.isSharedBerlinChurchFamily(key));assert.equal(api.berlinChurchProgramKey(key,true),key);
 }
});
test('canonical ownership stores one program and deletion occurs once without altering draw families',()=>{
 const draws=[208,203,205,201,200,202,204,211,210,209],programs=new Map(),compiled=[],drawn=[];
 for(const family of draws){const key=api.berlinChurchProgramKey('current-family:'+family,true);if(!programs.has(key)){programs.set(key,{key});compiled.push(key);}drawn.push({family,program:programs.get(key)});}
 assert.deepEqual(compiled,['current-family:200']);assert.deepEqual(drawn.map(row=>row.family),draws);assert(drawn.every(row=>row.program===drawn[0].program));
 const deleted=[];for(const p of programs.values())deleted.push(p);programs.clear();assert.equal(deleted.length,1);
});
test('renderer compiles the checked fragment and uses canonical ownership for visible, main and reflection paths',async()=>{
 const source=fs.readFileSync(path.join(d,'building-mesh-renderer.ts'),'utf8');await transform(source,{loader:'ts',format:'esm'});
 assert(source.includes('family=>familyFragmentSource(familySurfaceHelper,family)'));
 assert(source.includes('withResidentReflectionClip(fragment(helper,true)):familyFragmentSource(helper,family)'));
 assert(source.includes('visible=new Set(runs.map(r=>canonicalFamilyProgramKey(override??r.key)))'));
 assert(source.includes('for(const run of runs){if(gl!.isContextLost())return;const key=canonicalFamilyProgramKey(override??run.key);'));
 assert(source.includes('familyRuns.map(run=>{const key=canonicalFamilyProgramKey(override??run.key);return{'));
 assert(source.includes('for(const p of familyPrograms.values())gl.deleteProgram(p)'));
});
// A locally supplied actual Berlin assembly module enables the source-data-bound
// check without committing generated city payloads or private machine paths.
if(process.env.CRIMEMAPS_CHURCH_ASSEMBLED_REVIEW_MODULE)test('actual Berlin submitted fragments remain byte-identical to the previous material pipeline',async()=>{
 const {assembledReview}=await import(pathToFileURL(process.env.CRIMEMAPS_CHURCH_ASSEMBLED_REVIEW_MODULE));
 const fragments=new Map();for(const family of api.BERLIN_CHURCH_SHARED_FAMILIES){const row=assembledReview(family);assert.equal(row.fragment,row.candidateFragment);assert.equal(row.fragment.length,71292);fragments.set(family,row.fragment);}
 assert(api.berlinChurchProgramsEqual(family=>fragments.get(family)));
});
