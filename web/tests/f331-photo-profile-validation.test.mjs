import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/painted/delegated500/safety/f331-photo344.ts',import.meta.url),'utf8');
const m={exports:{}};
Function('exports',ts.transpileModule(source+'\nexport {PROFILES,NATIVE,LEAVES,FEATURE_BODY};',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(m.exports);
const {f331PhotoPlan344:plan,PROFILES,NATIVE,LEAVES,FEATURE_BODY}=m.exports;
const origin=[13.870427450000001,51.008769349999994];
function fixture(){
 const rows=[...NATIVE,...PROFILES].map(p=>({...p,origin:[...origin],batches:[]}));
 const profiles=new Map(PROFILES.map(p=>[p.path,structuredClone(p)]));let reads=0;
 const options={enabled:true,programSource:FEATURE_BODY,legacyRemainderComplete:true,profileOf:path=>{reads++;return profiles.get(path);},signatureOf:c=>c.geometrySignature,nativeLeaf:c=>LEAVES.find(p=>p.partId===c.partId)?.sha256};
 return {rows,profiles,options,get reads(){return reads;}};
}
// Original planner's validation order, kept as an independent behavioral oracle.
function original(rows,o){
 const exact=(c,p)=>c.city==='dresden'&&c.objectId===p.objectId&&c.partId===p.partId&&o.signatureOf(c)===p.geometrySignature;
 const candidates=rows.filter(c=>PROFILES.some(p=>c.objectId===p.objectId&&c.partId===p.partId));
 const source=NATIVE.map(p=>rows.find(c=>exact(c,p)));
 const replacements=PROFILES.map(p=>rows.find(c=>{const r=o.profileOf(p.path);return r&&Object.keys(p).every(k=>JSON.stringify(r[k])===JSON.stringify(p[k]))&&exact(c,p)&&JSON.stringify(c.origin)===JSON.stringify(origin);}));
 const leavesOK=LEAVES.every(p=>{const c=source.find(c=>c?.partId===p.partId);return c&&o.nativeLeaf(c)===p.sha256;});
 const complete=!!o.enabled&&!!o.programSource?.includes(FEATURE_BODY)&&o.legacyRemainderComplete&&source.every(Boolean)&&replacements.every(Boolean)&&leavesOK;
 return {complete,held:complete?source.filter(c=>PROFILES.some(p=>p.sourcePartId===c?.partId)):[],suppressed:complete?[]:candidates,replacements:complete?replacements:[],sourceArraysRetained:true};
}
function compare(f){const expected=original(f.rows,f.options),actual=plan(f.rows,f.options);assert.deepEqual(actual,expected);for(const key of ['held','suppressed','replacements'])for(let i=0;i<actual[key].length;i++)assert.strictEqual(actual[key][i],expected[key][i]);return actual;}
test('complete Dresden plan preserves exact rows and first-match order',()=>{
 const f=fixture();const duplicate={...f.rows.at(-1)};f.rows.push(duplicate);const result=compare(f);assert.equal(result.complete,true);assert.equal(result.held.length,3);assert.equal(result.replacements.length,3);assert.ok(!result.replacements.includes(duplicate));
});
test('all source and completion gates preserve incomplete suppression',()=>{
 const changes=[f=>f.profiles.delete(PROFILES[0].path),f=>f.profiles.get(PROFILES[0].path).sha256='wrong',f=>f.rows.splice(0,1),f=>f.options.nativeLeaf=()=>undefined,f=>f.rows[0].geometrySignature='wrong',f=>f.rows.at(-1).geometrySignature='wrong',f=>f.rows.at(-1).origin=[0,0],f=>f.options.enabled=false,f=>f.options.programSource='',f=>f.options.legacyRemainderComplete=false];
 for(const change of changes){const f=fixture();change(f);const result=compare(f);assert.equal(result.complete,false);assert.equal(result.suppressed.length,3);}
});
test('descriptor authentication happens once per profile per call, never per unrelated row or across calls',()=>{
 const f=fixture();f.rows=Array.from({length:2000},(_,i)=>({city:'bremen',objectId:'unknown/'+i,partId:'part',batches:[]}));assert.equal(plan(f.rows,f.options).complete,false);assert.equal(f.reads,3);
 const full=fixture();assert.equal(plan(full.rows,full.options).complete,true);assert.equal(full.reads,3);full.profiles.get(PROFILES[0].path).bytes++;assert.equal(plan(full.rows,full.options).complete,false);assert.equal(full.reads,6);
 const empty=fixture();assert.deepEqual(plan([],empty.options),original([],empty.options));assert.equal(empty.reads,0);
});
test('foreign-city candidate identities remain suppressed and profile fields retain JSON equality',()=>{
 const f=fixture();f.rows.forEach(r=>r.city='bremen');assert.equal(compare(f).suppressed.length,3);
 for(const field of Object.keys(PROFILES[0])){const g=fixture();g.profiles.get(PROFILES[0].path)[field]=null;assert.equal(compare(g).complete,false,field);}
});
