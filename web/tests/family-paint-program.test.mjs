import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
// root500/infill/bremen per-family programs: every rule may only remove code that cannot run
// for the given family set; main and every kept function keep their original bytes.
// Seven original guard/chain tests derive from the 7936695 draft test SHA256
// 0254c0bbecf0774669f1a868f10d5eb18d941f81cc4e712248f616dec03a791a.
// No renderer, encoded-family inference, GPU or historical full-candidate enumeration is run.
const web=fileURLToPath(new URL('../',import.meta.url));
const built=await build({entryPoints:[path.join(web,'src/safety/family-paint-program.ts')],bundle:true,write:false,format:'esm',platform:'node'});
const F=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=family-paint-program.test-module.mjs').toString('base64'));
const workspaceBuilt=await build({entryPoints:[path.join(web,'src/safety/prepared-source.ts')],bundle:true,write:false,format:'esm',platform:'node'});
const {createPreparedSourceWorkspace}=await import('data:text/javascript;base64,'+Buffer.from(workspaceBuilt.outputFiles[0].text+'\n//# sourceURL=prepared-source.test-module.mjs').toString('base64'));
const head='#version 300 es\nprecision highp float;out vec4 color;flat in float v_f;in vec4 v_frame;\n';
const main='\nvoid main(){if(v_frame.w<0.)discard;color=vec4(paintedFacade(vec3(1.),vec3(0.),vec3(0.,1.,0.),v_frame,v_f),1.);}';
const chain=head+`vec3 leafA(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family!=1001.)return base;return base*.5;}
vec3 leafB(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family!=1002.)return base;if(frame.x>0.)discard;return base*.25;}
vec3 cityForwarder77(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1001.)return leafA(base,p,normal,frame,family);if(family==1002.)return leafB(base,p,normal,frame,family);return base;}
vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1500.)return base*2.;return cityForwarder77(base,p,normal,frame,family);}
vec3 paintedFacade(vec3 base, vec3 p, vec3 normal, vec4 frame, float family){if(abs(family-6236.)<.25&&frame.w>7.5)return base*3.;if(family>=1000.0)return progressiveFeatureDispatchCity(base,p,normal,frame,floor(family+0.5));return base;}`+main;
test('a discovered forwarder chain keeps only the selected leaf; main is byte-identical',()=>{
 const a=F.specializeFamilyPaintFragment(chain,[1001]);
 assert(a.includes('vec3 leafA(')&&!a.includes('vec3 leafB(')&&!a.includes('base*2.')&&!a.includes('base*3.'));
 assert.equal(a.slice(a.indexOf('void main()')),chain.slice(chain.indexOf('void main()')));
 assert(a.includes('vec3 leafA(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base*.5;}'),'a narrowed leaf drops only its false leading clause');
});
test('three-valued guards: false&&unknown is false, unknown stays, user calls and division are unknown',()=>{
 assert(!F.specializeFamilyPaintFragment(chain,[1001]).includes('base*3.'));
 assert(F.specializeFamilyPaintFragment(chain,[6236]).includes('base*3.'),'the frame.w clause is kept for its own family');
 const div=chain.replace('if(family>=1000.0)','if(family/2.>=500.)');
 const d=F.specializeFamilyPaintFragment(div,[1001]);assert(d.includes('family/2.>=500.')&&!d.includes('vec3 leafB('),'a division guard is kept verbatim; the read-only forwarders below it still narrow');
});
test('depth effects follow the family closure; a set keeps every member',()=>{
 assert.equal(F.familyPaintDepthEffects(chain,[1001]),false);assert.equal(F.familyPaintDepthEffects(chain,[1002]),true);assert.equal(F.familyPaintDepthEffects(chain,[1001,1002]),true);
 const both=F.specializeFamilyPaintFragment(chain,[1001,1002]);assert(both.includes('vec3 leafA(')&&both.includes('vec3 leafB('));
});
test('texture-dependent coverage keeps its selected source bytes and remains a depth effect',()=>{
 const sampled='vec3 sampledFacade(vec3 base,vec4 frame){vec4 texel=texture(paintAtlas,frame.xy);if(texel.a<.5)discard;return base*texel.rgb;}';
 const opaque='vec3 opaqueFacade(vec3 base){return base*.5;}';
 const source=head+'uniform sampler2D paintAtlas;\n'+sampled+opaque+`vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1001.)return opaqueFacade(base);if(family==1002.)return sampledFacade(base,frame);return base;}`+main;
 const texture=F.specializeFamilyPaintProgram(source,[1002]);
 assert(texture.fragment.includes(sampled));assert(!texture.fragment.includes(opaque));assert.equal(texture.depthEffects,true);
 assert.equal(texture.fragment.slice(texture.fragment.indexOf('void main()')),source.slice(source.indexOf('void main()')));
 const plain=F.specializeFamilyPaintProgram(source,[1001]);
 assert(plain.fragment.includes(opaque));assert(!plain.fragment.includes(sampled));assert.equal(plain.depthEffects,false);
 const guarded=source.replace('family==1001.','texture(paintAtlas,frame.xy).r>0.&&family==1001.');
 assert(F.specializeFamilyPaintFragment(guarded,[1002]).includes('if(texture(paintAtlas,frame.xy).r>0.&&family==1001.)'),'texture-dependent guards are not certified pure family guards');
});
test('one program specialization derives colour and depth demand from the same explicit family set',()=>{
 const plain=F.specializeFamilyPaintProgram(chain,[1001]);
 assert.equal(plain.depthEffects,false);assert(plain.fragment.includes('vec3 leafA('));assert(!plain.fragment.includes('vec3 leafB('));
 assert.equal(plain.fragment.slice(plain.fragment.indexOf('void main()')),chain.slice(chain.indexOf('void main()')));
 const both=F.specializeFamilyPaintProgram(chain,[1001,1002]);
 assert.equal(both.depthEffects,true);assert(both.fragment.includes('vec3 leafA(')&&both.fragment.includes('vec3 leafB('));
 const repaired=F.specializeFamilyPaintProgram(chain.replace('base*.5','base*.75'),[1001]);
 assert(repaired.fragment.includes('base*.75'));assert(!repaired.fragment.includes('base*.5'));
});
test('one opaque source analysis keeps family results independent and preserves conservative writers',()=>{
 const prepared=F.prepareFamilyPaintSource(chain);
 assert(Object.isFrozen(prepared));assert.deepEqual(Object.keys(prepared),[],'source and parse state are opaque');
 const first=F.specializePreparedFamilyPaintSource(prepared,[1001]),second=F.specializePreparedFamilyPaintSource(prepared,[1002]),again=F.specializePreparedFamilyPaintSource(prepared,[1001]);
 assert(first.fragment.includes('vec3 leafA(')&&!first.fragment.includes('vec3 leafB('));assert.equal(first.depthEffects,false);
 assert(second.fragment.includes('vec3 leafB(')&&!second.fragment.includes('vec3 leafA('));assert.equal(second.depthEffects,true);
 assert.deepEqual(again,first);assert.notStrictEqual(again,first,'the base analysis does not retain family-specific output objects');
 for(const families of [[],[NaN],[Infinity],[.1],[Math.fround(1e-44)]])assert.throws(()=>F.specializePreparedFamilyPaintSource(prepared,families),/Explicit normal float32/);
 const source=chain.replace('if(family==1001.)return leafA','bump((family));if(family==1001.)return leafA').replace('vec3 cityForwarder77(','void bump(inout float x){x=1002.;}\nvec3 cityForwarder77(');
 const written=F.specializePreparedFamilyPaintSource(F.prepareFamilyPaintSource(source),[1001]);
 assert(written.fragment.includes('vec3 leafA(')&&written.fragment.includes('vec3 leafB('));assert.equal(written.depthEffects,true);
});
test('prepared source owns one recipe analysis, replaces changed inputs and clears deferred references',()=>{
 let current=true,builds=0,assemblies=0,cleanup=0;
 const owner=createPreparedSourceWorkspace({current:()=>current,build:()=>{builds++;return chain;},clear:()=>cleanup++});
 const token={},recipe={sourceKey:'base',inputs:[token,'helper-v1',0],assemble:source=>{assemblies++;return source;}};
 const a=owner.prepareSource(recipe,[1001]),b=owner.prepareSource({...recipe,assemble:()=>{throw Error('equivalent recipe must reuse its original source');}},[1002]),again=owner.prepareSource(recipe,[1001]);
 assert(a.fragment.includes('vec3 leafA(')&&!a.fragment.includes('vec3 leafB('));assert.equal(a.depthEffects,false);assert.equal(b.depthEffects,true);assert.deepEqual(again,a);assert.notStrictEqual(again,a);
 assert.equal(builds,1);assert.equal(assemblies,1);// The current prepared-source contract also reports its ledger view; an unmetered workspace
 // (no page ResourceBudget) states each estimate as unknown (null) and charges nothing.
 assert.deepEqual(owner.preparedSourceStats,{builds:1,analyses:1,hits:2,replacements:0,clears:0,sourceCharacters:chain.length,released:false,
  budget:{accounting:'unmetered',policy:null,sourceBytesEstimate:null,analysisBytesEstimate:null,scratchBytesEstimate:null,entryMetadataBytesEstimate:null,ownedBytesEstimate:null,retiringBytesEstimate:0,authorityTrace:[],authorityTraceTruncated:false,physicalMemory:'unmeasured'}});
 owner.prepareSource({...recipe,inputs:[token,'helper-v1',-0]},[1001]);assert.equal(owner.preparedSourceStats.builds,2,'Object.is distinguishes signed-zero recipe inputs');
 const changed=owner.prepareSource({...recipe,inputs:[token,'helper-v2',0],assemble:source=>source.replace('base*.5','base*.75')},[1001]);
 assert(changed.fragment.includes('base*.75'));assert(!changed.fragment.includes('base*.5'));assert.equal(owner.preparedSourceStats.analyses,3);assert.equal(owner.preparedSourceStats.replacements,2);
 owner.clearPreparedSource();assert.equal(owner.preparedSourceStats.sourceCharacters,0);assert.equal(owner.preparedSourceStats.released,false);assert(cleanup>0);
 const before=builds;current=false;assert.throws(()=>owner.prepareSource(recipe,[1001]),{name:'AbortError'});assert.equal(builds,before);
 owner.release();owner.release();assert.equal(owner.preparedSourceStats.released,true);assert.equal(owner.preparedSourceStats.sourceCharacters,0);assert.throws(()=>owner.prepareSource(recipe,[1001]),{name:'AbortError'});assert.equal(builds,before);
});
test('specialization errors clear both cold and reused working sets without replacing the original error',()=>{
 for(const warm of [false,true]){
  const failure=Error('controlled family specialization failure');let cleanupThrows=false;
  const owner=createPreparedSourceWorkspace({current:()=>true,build:()=>chain,clear:()=>{if(cleanupThrows)throw Error('secondary cleanup failure');}});
  const recipe={sourceKey:'base',inputs:['same-source'],assemble:value=>value};
  if(warm)owner.prepareSource(recipe,[1001]);
  const families=new Proxy([1001],{get(target,key,receiver){if(key==='length'){cleanupThrows=true;throw failure;}return Reflect.get(target,key,receiver);}});
  assert.throws(()=>owner.prepareSource(recipe,families),error=>error===failure);
  assert.equal(owner.preparedSourceStats.sourceCharacters,0);assert.equal(owner.preparedSourceStats.released,false);
  const failed=owner.preparedSourceStats;assert.equal(failed.builds,1);assert.equal(failed.analyses,1);assert.equal(failed.hits,warm?1:0);
  cleanupThrows=false;const result=owner.prepareSource(recipe,[1001]);assert(result.fragment.includes('vec3 leafA('));assert.equal(owner.preparedSourceStats.builds,failed.builds+1);assert.equal(owner.preparedSourceStats.analyses,failed.analyses+1);owner.release();
 }
});
test('a failing outer specialization cannot clear a newer reentrant source recipe',()=>{
 const failure=Error('outer family failure'),changed=chain.replace('base*.5','base*.75');
 const owner=createPreparedSourceWorkspace({current:()=>true,build:recipe=>recipe.sourceKey==='new'?changed:chain});
 const oldRecipe={sourceKey:'old',inputs:['v1'],assemble:value=>value},newRecipe={sourceKey:'new',inputs:['v2'],assemble:value=>value};
 let entered=false;
 const families=new Proxy([1001],{get(target,key,receiver){if(key==='length'&&!entered){entered=true;owner.prepareSource(newRecipe,[1001]);throw failure;}return Reflect.get(target,key,receiver);}});
 assert.throws(()=>owner.prepareSource(oldRecipe,families),error=>error===failure);
 const surviving=owner.preparedSourceStats;assert.equal(surviving.released,false);assert.equal(surviving.sourceCharacters,changed.length);assert.equal(surviving.builds,2);assert.equal(surviving.analyses,2);
 const reused=owner.prepareSource(newRecipe,[1001]);assert(reused.fragment.includes('base*.75'));assert(!reused.fragment.includes('base*.5'));assert.equal(owner.preparedSourceStats.builds,surviving.builds);assert.equal(owner.preparedSourceStats.analyses,surviving.analyses);assert.equal(owner.preparedSourceStats.hits,surviving.hits+1);owner.release();assert.equal(owner.preparedSourceStats.sourceCharacters,0);
});
test('a forwarder that can change its parameter is never trusted',()=>{
 for(const write of ['family+=1.;','family++;','float family=2.;','bump(family);']){
  const src=chain.replace('vec3 cityForwarder77(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){','void bump(inout float x){x+=1.;}\nvec3 cityForwarder77(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){'+write);
  const s=F.specializeFamilyPaintFragment(src,[1001]);assert(s.includes('vec3 leafA(')&&s.includes('vec3 leafB('),write);
 }
});
test('constant-folded arguments and the union of remaining calls (F045 shape)',()=>{
 const d=head+`vec3 rr(vec3 b,float layoutId){return b*2.;}vec3 fm(vec3 b,float layoutId){return b*3.;}vec3 gen(vec3 b){return b*4.;}
vec3 fpLayoutFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float layoutId){if(layoutId>=200.&&layoutId<=211.)return rr(base,layoutId);if((layoutId>=120.&&layoutId<=139.)||layoutId==171.)return fm(base,layoutId);return gen(base);}
vec3 wallF045(vec3 base,vec3 p,vec3 normal,vec4 q,float family){return fpLayoutFacade(base,p,normal,q,family<6471.5?109.:108.);}
vec3 paintedFacade(vec3 base, vec3 p, vec3 normal, vec4 frame, float family){if(abs(family-6472.)<.25)return wallF045(base,p,normal,frame,family);if(family>=100.0&&frame.z>0.)return fpLayoutFacade(base,p,normal,frame,family);return base;}`+main;
 const a=F.specializeFamilyPaintFragment(d,[6472]);assert(a.includes('vec3 gen(')&&!a.includes('vec3 rr(')&&!a.includes('vec3 fm('));
 const b=F.specializeFamilyPaintFragment(d,[200]);assert(b.includes('vec3 rr(')&&!b.includes('vec3 fm(')&&!b.includes('wallF045'));
});
test('top scope removes later false clauses and the unreachable tail only in read-only bodies',()=>{
 const t=head+`vec3 big(vec3 b){return b*9.;}vec3 small(vec3 b){return b*.1;}
vec3 paintedFacade(vec3 base, vec3 p, vec3 normal, vec4 frame, float family){if(abs(normal.y)>.35){return base;}float d=frame.x;if(family>=100.0)return big(base);if(family<0.0)return small(base)*d;return base;}`+main;
 const a=F.specializeFamilyPaintFragment(t,[-9]);assert(!a.includes('vec3 big(')&&a.includes('vec3 small(')&&a.includes('float d=frame.x;'));
 const w=t.replace('float d=frame.x;','float d=frame.x;family*=1.;');assert(F.specializeFamilyPaintFragment(w,[-9]).includes('vec3 big('),'a writer keeps the delegated500 leading rule');
});
test('overloads are one unit; paintedFacade must have one call, in main',()=>{
 const o=head+`float ln(float y,float c,float w){return abs(y-c)-w;}float ln(float d,float w){return ln(d,0.,w);}
vec3 paintedFacade(vec3 base, vec3 p, vec3 normal, vec4 frame, float family){if(family==3.)return base*ln(frame.x,.2);return base;}`+main;
 assert(F.specializeFamilyPaintFragment(o,[3]).includes('float ln(float y,float c,float w)'));assert(!F.specializeFamilyPaintFragment(o,[4]).includes('float ln('));
 const twice=o.replace('float ln(float d,float w){return ln(d,0.,w);}','float ln(float d,float w){return ln(d,0.,w);}vec3 other(vec3 b){return paintedFacade(b,b,b,vec4(0.),1.);}');
 assert.throws(()=>F.specializeFamilyPaintFragment(twice,[3]),/called once, from main/);
});

const mutationSource=write=>head+`void bump(inout float x){x=1002.;}
vec3 leafA(vec3 b){return b*.5;}vec3 leafB(vec3 b){discard;return b*.25;}
vec3 paintedFacade(vec3 base,vec3 p,vec3 n,vec4 q,float family){${write}if(family==1001.)return leafA(base);return leafB(base);}`+main;
const paintBody=s=>s.slice(s.indexOf('vec3 paintedFacade('),s.indexOf('\nvoid main()'));
test('regression: parenthesized inout changes family; preserve the actual leafB path',()=>{
 const source=mutationSource('bump((family));'),result=F.specializeFamilyPaintFragment(source,[1001]);
 assert(result.includes('vec3 leafA(')&&result.includes('vec3 leafB('));
 assert.equal(paintBody(result),paintBody(source));
 assert.equal(F.familyPaintDepthEffects(source,[1001]),true,'the writer can reach discarding family 1002');
});
test('parenthesized assignments and increments retain the complete possibly-written body',()=>{
 for(const write of ['(family)=1002.;','((family))+=1.;','((family))++;','++((family));']){
  const source=mutationSource(write),result=F.specializeFamilyPaintFragment(source,[1001]);
  assert.equal(paintBody(result),paintBody(source),write);
 }
});
test('unknown or prototype-only calls mentioning the parameter are not certified read-only',()=>{
 for(const prefix of ['', 'void uncertain(inout float x);\n']){
  const source=mutationSource('uncertain((family));').replace('void bump',prefix+'void bump');
  assert.equal(paintBody(F.specializeFamilyPaintFragment(source,[1001])),paintBody(source));
 }
});
test('a writer does not even lose an earlier false guard',()=>{
 const source=mutationSource('if(family==900.)return leafA(base);bump(family);');
 assert.equal(paintBody(F.specializeFamilyPaintFragment(source,[1001])),paintBody(source));
});
test('inexact literals and multi-operation arithmetic stay unknown instead of assuming GPU rounding',()=>{
 for(const guard of ['family<0.1','family+0.1==1001.1','family+.5-.5==1001.',
                    'family*1000000.>10.','family<4294967295u']){
  const source=mutationSource('').replace('family==1001.',guard);
  assert.equal(paintBody(F.specializeFamilyPaintFragment(source,[1001])),paintBody(source),guard);
 }
});
test('explicit family sets must already be finite normal float32 values',()=>{
 for(const families of [[],[NaN],[Infinity],[.1],[Math.fround(1e-44)]])
  assert.throws(()=>F.specializeFamilyPaintFragment(chain,families),/Explicit normal float32/);
 assert(F.specializeFamilyPaintFragment(chain,[Math.fround(1001.25)]).includes('void main()'));
});
test('independent exact range and OR atoms remove the unrelated Bremen base branches',()=>{
 const selected='vec3 rathaus(vec3 base){for(int j=0;j<3;j++){base*=.99;}return base;}';
 const unrelated='vec3 unrelated(vec3 base){return base*.5;}';
 const source=head+selected+unrelated+`vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if((family>=1703.-.25&&family<=1703.+.25))return unrelated(base);
 if((family>=11210.-.25&&family<=11216.+.25)||(abs(family-26021.)<.25||abs(family-26022.)<.25))return unrelated(base);
 if(abs(family-6277.)<.25)return rathaus(base);return base;}`+main;
 const result=F.specializeFamilyPaintFragment(source,[6277]);
 assert(!result.includes('vec3 unrelated('));assert(result.includes(selected),'selected loop and material bytes remain unchanged');
 assert.equal(result.slice(result.indexOf('void main()')),main.slice(main.indexOf('void main()')));
 assert.match(result,/paintedFacade\([^{}]+\)\{return rathaus\(base\);\}/);
 const union=F.specializeFamilyPaintFragment(source,[6277,1703]);assert(union.includes(selected)&&union.includes(unrelated),'a mixed family set keeps both reachable materials');
 for(const family of [1702.75,1703,1703.25]){const atBoundary=F.specializeFamilyPaintFragment(source,[family]);assert(atBoundary.includes(unrelated)&&!atBoundary.includes(selected),'exact inclusive quarter boundary '+family);}
});
test('logical atom budgets still reject unsafe guards and do not relax numeric forwarding',()=>{
 for(const guard of ['family<0.&&(family+.5-.5==1001.)','(family<0.&&uncertainGuard(family))||abs(family-1703.)<.25','family<0.&&(family/2.==500.)','family<0.&&(family==1.?true:false)','abs(family-.1)<.25||abs(family-1703.)<.25','(family+.5)==(1001.-.5)']){
  const source=mutationSource('').replace('family==1001.',guard).replace('vec3 paintedFacade(','float uncertainGuard(float x){return x;}\nvec3 paintedFacade(');
  assert.equal(paintBody(F.specializeFamilyPaintFragment(source,[1001])),paintBody(source),guard);
 }
 const source=head+`vec3 zero(vec3 b){return b*.25;}vec3 one(vec3 b){return b*.5;}
 vec3 forwarded(vec3 b,float n){if(n==0.)return zero(b);return one(b);}
 vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return forwarded(base,float((family-6277.)==0.&&(family-1703.)>0.));}`+main;
 const result=F.specializeFamilyPaintFragment(source,[6277]);assert(result.includes('vec3 zero(')&&result.includes('vec3 one('),'numeric arguments retain the original whole-expression arithmetic budget');
});
test('unsupported preprocessing and reduced default precision fail before deleting any text',()=>{
 for(const source of [chain.replace('precision highp float;','precision mediump float;'),
                     chain.replace('precision highp float;',''),
                     chain.replace('precision highp float;','#define WRITE(x) x++\nprecision highp float;')])
  assert.throws(()=>F.specializeFamilyPaintFragment(source,[1001]),/preprocessing\/precision/);
});
test('precision-qualified function ranges do not leave orphan precision tokens',()=>{
 const source=chain.replace('vec3 leafA(', 'highp vec3 leafA(').replace('vec3 leafB(', 'highp vec3 leafB(');
 const result=F.specializeFamilyPaintFragment(source,[1001]);
 assert(result.includes('highp vec3 leafA('));assert(!result.includes('highp vec3 leafB('));
 assert.equal((result.match(/\bhighp\b/g)??[]).length,2);
});
test('direct recursion fails closed even when a source branch appears removable',()=>{
 const source=chain.replace('return base*.5;', 'return leafA(base,p,normal,frame,family);');
 assert.throws(()=>F.specializeFamilyPaintFragment(source,[1001]),/Recursive family/);
});
test('rejected raw decoder misses an admissible neighbour; no raw decoder is exported',()=>{
 // This is the old draft's own 2.5-ULP model, not an observed GPU result.
 const raw=Math.fround(100000008),quotient=raw/10000;
 const ulp=2**(Math.floor(Math.log2(quotient))-23),permitted=9999.9990234375;
 const oldFamily=Math.floor(Math.fround(quotient));
 const oldSet=raw>=1000000&&raw%10000===0?[oldFamily-1,oldFamily]:[oldFamily];
 assert(Math.abs(permitted-quotient)<=2.5*ulp);
 assert(!oldSet.includes(Math.floor(permitted)));
 assert.equal('familyRunKey' in F,false);assert.equal('familyRunParts' in F,false);
 const source=chain.replaceAll('1001.','10000.').replaceAll('1002.','9999.');
 const result=F.specializeFamilyPaintFragment(source,[9999,10000]);
 assert(result.includes('vec3 leafA(')&&result.includes('vec3 leafB('),'an explicit conservative set keeps both leaves');
});

test('leading-zero integer tokens are never interpreted as JavaScript decimal',()=>{
 for(const literal of ['010','010u','00','0009']){
  const source=mutationSource('').replace('family==1001.','family=='+literal);
  assert.equal(paintBody(F.specializeFamilyPaintFragment(source,[10])),paintBody(source),literal);
 }
});
test('encoded decode contains both sides of division boundaries, including the rejected old neighbour',()=>{
 for(const raw of [1000000,10000000,100000008,Math.fround(100000016),Math.fround(655350016)]){
  const q=raw/10000,ulp=2**(Math.floor(Math.log2(q))-23),set=F.decodedPaintFamilies(raw);
  for(const offset of [-2.5,-1,0,1,2.5])assert(set.includes(Math.floor(q+offset*ulp)),raw+':'+offset);
 }
 assert.deepEqual(F.decodedPaintFamilies(1001.25),[1001.25]);
 assert(F.decodedPaintFamilies(Math.fround(100000008)).includes(9999));
 for(const raw of [NaN,Infinity,.1,Math.fround(1e-44),Math.fround(2**38)])assert.throws(()=>F.decodedPaintFamilies(raw));
});
test('runs preserve provoking vertex, every index and original source partition ownership',()=>{
 const indices=new Uint32Array([0,1,2,2,0,3,0,1,4]),paint=new Float32Array(25);
 [900,800,1001,1001,1002].forEach((v,i)=>paint[i*5+4]=v);
 const runs=F.familyPaintRuns(indices,paint,raw=>'legacy-'+raw);
 assert.deepEqual(runs.map(r=>[r.firstIndex,r.indexCount]),[[0,6],[6,3]]);
 assert.deepEqual(F.familyPaintRecipe(runs[0].key),{sourceKey:'legacy-1001',families:[1001]});
 assert.equal(runs.reduce((n,r)=>n+r.indexCount,0),indices.length);
 assert.throws(()=>F.familyPaintRuns(new Uint32Array([0,1]),paint,()=>''),/Non-triangle/);
 assert.throws(()=>F.familyPaintRuns(new Uint32Array([0,1,5]),paint,()=>''),/outside/);
});
test('overrides use uniform float32 and preserve semantic alternatives near the threshold',()=>{
 const key=F.familyPaintRecipeKey('owner-A',[9999,10000]);
 assert.deepEqual(F.familyPaintRecipe(F.overriddenFamilyPaintKey(key,1000001.25,()=>'owner-B')),{sourceKey:'owner-B',families:[1000001.25]},'override is not raw-encoded');
 assert.deepEqual(F.familyPaintRecipe(F.overriddenFamilyPaintKey(key,.0100000001,()=>'owner-B')).families,[Math.fround(.0100000001),9999,10000]);
 assert.deepEqual(F.familyPaintRecipe(F.overriddenFamilyPaintKey(key,0,()=>'owner-B')),{sourceKey:'owner-A',families:[9999,10000]});
});

const realSourceFixtureDir=process.env.FAMILY_PAINT_REAL_SOURCE_FIXTURE_DIR;
test('optional frozen Bremen6277 source keeps verified final bytes with one reusable analysis',{skip:!realSourceFixtureDir},async()=>{
 const summary=JSON.parse(fs.readFileSync(path.join(realSourceFixtureDir,'summary.json'),'utf8'));
 assert.equal(summary.recipe,'bremen-program-plan:1:colour:base:6277');assert.deepEqual(summary.families,[6277]);assert.equal(summary.solarDepth,false);assert.equal(summary.pruneOwner6307,true);
 const original=fs.readFileSync(path.join(realSourceFixtureDir,'original-pruned.glsl')),expected=fs.readFileSync(path.join(realSourceFixtureDir,'after-submitted.glsl'));
 const sha=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(original.length,summary.original.utf8Bytes);assert.equal(expected.length,summary.after.utf8Bytes);assert.equal(sha(original),summary.original.sha256);assert.equal(sha(expected),summary.after.sha256);
 const reflectionBuilt=await build({entryPoints:[path.join(web,'src/safety/resident-planar-reflection.ts')],bundle:true,write:false,format:'esm',platform:'node'});
 const {withResidentReflectionClip}=await import('data:text/javascript;base64,'+Buffer.from(reflectionBuilt.outputFiles[0].text+'\n//# sourceURL=real-source-reflection.test-module.mjs').toString('base64'));
 let builds=0,clears=0;
 const owner=createPreparedSourceWorkspace({current:()=>true,build:()=>{builds++;return original.toString('utf8');},clear:()=>clears++});
 // The saved input precedes reflection assembly; the submitted byte oracle includes it.
 const recipe={sourceKey:'base',inputs:[summary.helper,summary.pruneOwner6307,summary.original.sha256,withResidentReflectionClip],assemble:withResidentReflectionClip};
 const first=owner.prepareSource(recipe,summary.families),second=owner.prepareSource(recipe,summary.families);
 const actual=Buffer.from(first.fragment,'utf8'),equal=actual.equals(expected);let firstDifference=null;
 if(!equal){firstDifference=0;while(firstDifference<Math.min(actual.length,expected.length)&&actual[firstDifference]===expected[firstDifference])firstDifference++;}
 assert(equal,`exact final bytes differ: actualBytes=${actual.length}, expectedBytes=${expected.length}, actualSHA256=${sha(actual)}, expectedSHA256=${sha(expected)}, firstDifference=${firstDifference}`);
 assert.equal(second.fragment,first.fragment);assert.notStrictEqual(second,first);assert.equal(builds,1);assert.equal(owner.preparedSourceStats.builds,1);assert.equal(owner.preparedSourceStats.analyses,1);assert.equal(owner.preparedSourceStats.hits,1);
 owner.clearPreparedSource();assert.equal(owner.preparedSourceStats.sourceCharacters,0);assert.equal(owner.preparedSourceStats.clears,1);assert(clears>0);
 owner.release();assert.equal(owner.preparedSourceStats.released,true);assert.equal(owner.preparedSourceStats.sourceCharacters,0);
});


const groupedBuild=await build({entryPoints:[path.join(web,'src/painted/bremen/safety/shared-paint-recipe.ts')],bundle:true,write:false,format:'esm',platform:'node'});
const {sharedBremenPaintRecipeKey}=await import('data:text/javascript;base64,'+Buffer.from(groupedBuild.outputFiles[0].text).toString('base64'));
test('repeated Bremen draws do not rebuild the same 64-family expansion',()=>{
 const keys=[47040,47041,47042].map(family=>F.familyPaintRecipeKey('bremen-boundary70',[family]));
 const expected=F.familyPaintRecipeKey('bremen-boundary70',Array.from({length:64},(_,i)=>47040+i));
 assert.equal(sharedBremenPaintRecipeKey(keys[0]),expected);
 const original=Array.from;let expanded=0;
 Array.from=function(value,...args){if(value?.length===64)expanded++;return original.call(this,value,...args);};
 try{for(let frame=0;frame<100;frame++)for(const key of keys)assert.equal(sharedBremenPaintRecipeKey(key),expected);}
 finally{Array.from=original;}
 assert.equal(expanded,0,'a resident family group must reuse its canonical expansion across draws and sibling families');
});
test('Bremen shared recipes preserve source partitions and every actual family with at most 64 conservative values',()=>{
 for(let family=46000;family<48000;family++){
  const key=F.familyPaintRecipeKey('bremen-boundary70',[family]),grouped=sharedBremenPaintRecipeKey(key),recipe=F.familyPaintRecipe(grouped);
  assert.equal(recipe.sourceKey,'bremen-boundary70');assert.equal(recipe.families.length,64);assert(recipe.families.includes(family));
  assert(recipe.families.every(value=>Number.isInteger(value)&&Math.fround(value)===value));
  const expected=Array.from({length:64},(_,index)=>Math.floor(family/64)*64+index);
  assert.equal(grouped,F.familyPaintRecipeKey('bremen-boundary70',expected),'generated keys remain byte-identical to canonical normalization');
  assert.equal(sharedBremenPaintRecipeKey(grouped),grouped);
 }
 const keys=[47040,47041,47042,47043].map(family=>sharedBremenPaintRecipeKey(F.familyPaintRecipeKey('bremen-boundary70',[family])));
 assert.equal(new Set(keys).size,1);
 assert.notEqual(keys[0],sharedBremenPaintRecipeKey(F.familyPaintRecipeKey('bremen-edgefill70',[47041])));
 for(const [source,families]of [['base',[0]],['other-city',[47041]],['bremen-unobserved',[47041]],['bremen-boundary70',[47040,47041]],['bremen-boundary70',[47041.5]],['bremen-boundary70',[45999]],['bremen-boundary70',[48000]]]){
  const key=F.familyPaintRecipeKey(source,families);assert.equal(sharedBremenPaintRecipeKey(key),key);
 }
});
test('a shared Bremen specialization keeps both colour and depth branches with byte-identical main',()=>{
 const source=chain.replaceAll('1001','47041').replaceAll('1002','47042');
 const recipe=F.familyPaintRecipe(sharedBremenPaintRecipeKey(F.familyPaintRecipeKey('bremen-boundary70',[47041])));
 const result=F.specializeFamilyPaintProgram(source,recipe.families);
 assert(result.fragment.includes('vec3 leafA('));assert(result.fragment.includes('vec3 leafB('));
 assert(result.fragment.includes('if(frame.x>0.)discard;'));assert.equal(result.depthEffects,true);
 assert.equal(result.fragment.slice(result.fragment.indexOf('void main()')),source.slice(source.indexOf('void main()')));
});
test('central Bremen material siblings share programs without merging source identities or bucket boundaries',()=>{
 for(const [source,first,last]of [['bremen-karstadt70',46160,46169],['bremen-oldtown-repairs',46300,46399],['bremen-organisten-final',47400,47407]]){
  const groups=new Set();
  for(let family=first;family<=last;family++){
   const grouped=sharedBremenPaintRecipeKey(F.familyPaintRecipeKey(source,[family])),recipe=F.familyPaintRecipe(grouped);
   assert.equal(recipe.sourceKey,source);assert(recipe.families.includes(family));
   assert.equal(recipe.families.length,64);assert.equal(recipe.families[0],Math.floor(family/64)*64);
   assert.equal(sharedBremenPaintRecipeKey(grouped),grouped);groups.add(grouped);
   assert.notEqual(grouped,sharedBremenPaintRecipeKey(F.familyPaintRecipeKey('base',[family])),'base source ownership remains independent');
  }
  assert.equal(groups.size,Math.floor(last/64)-Math.floor(first/64)+1);
  const sourceText=chain.replaceAll('1001',String(first)).replaceAll('1002',String(first+1));
  const result=F.specializeFamilyPaintProgram(sourceText,F.familyPaintRecipe(sharedBremenPaintRecipeKey(F.familyPaintRecipeKey(source,[first]))).families);
  assert(result.fragment.includes('vec3 leafA('));assert(result.fragment.includes('vec3 leafB('));
  assert(result.fragment.includes('if(frame.x>0.)discard;'));assert.equal(result.depthEffects,true);
  assert.equal(result.fragment.slice(result.fragment.indexOf('void main()')),sourceText.slice(sourceText.indexOf('void main()')));
 }
});
test('actual Bremen main and capture paths use the same shared executable without altering draw ranges or overrides',()=>{
 const source=fs.readFileSync(path.join(web,'src/painted/bremen/safety/building-mesh-renderer.ts'),'utf8'),ast=ts.createSourceFile('renderer.ts',source,ts.ScriptTarget.Latest,true);
 function evaluate(name,bindings){let declaration;const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text===name)declaration=node;ts.forEachChild(node,visit);};visit(ast);assert(declaration);const js=ts.transpileModule(declaration.getText(ast)+';return '+name+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;return Function(...Object.keys(bindings),js)(...Object.values(bindings));}
 const key=family=>F.familyPaintRecipeKey('bremen-boundary70',[family]),makeActive=(city,override)=>evaluate('activeFamilyKey',{city,paintOverride:()=>override,sharedBremenPaintRecipeKey,overriddenFamilyPaintKey:F.overriddenFamilyPaintKey,overrideSourceKey:()=> 'override-source'});
 const active=makeActive('bremen',0),runs=[47040,47041,47042,47043].map((family,index)=>({key:key(family),firstIndex:index*3,indexCount:3})),program={shared:true};
 assert.equal(makeActive('berlin',0)(key(47041)),key(47041));
 assert.equal(makeActive('bremen',47045)(key(47041)),F.overriddenFamilyPaintKey(key(47041),47045,()=> 'override-source'));
 const common={activeFamilyKey:active,partitionEnabled:true,paintMode:()=>2};
 const main=evaluate('mainPaintKeys',{...common,destroyed:false,pageHidden:false,enabled:true,mainPaintRuns:()=>runs})();
 const captured=evaluate('residentCaptureState',{...common,windowTexture:undefined,diffuseTexture:undefined,program,texturedProgram:undefined,diffuseProgram:undefined,facadeAttached:false,partitionRuns:runs,partitionPrograms:new Map([[active(key(47041)),program]]),sceneIndexCount:()=>12})(1);
 assert.equal(main.size,1);assert.equal(captured.runs.length,4);
 assert(captured.runs.every(row=>row.program===program));
 assert.deepEqual(captured.runs.map(({firstIndex,indexCount})=>({firstIndex,indexCount})),runs.map(({firstIndex,indexCount})=>({firstIndex,indexCount})));
});
