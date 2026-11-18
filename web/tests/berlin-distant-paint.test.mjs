import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build,transform} from 'esbuild';
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),d=path.join(web,'src/painted/delegated500/safety');
const bundle=await build({entryPoints:[path.join(d,'berlin-distant-paint.ts')],bundle:true,write:false,format:'esm',platform:'node'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const originalText=fs.readFileSync(path.join(d,'be-paul-lobe-glsl.ts'),'utf8'),original=JSON.parse(originalText.match(/export const BE_PAUL_LOBE_GLSL\s*=\s*("(?:[^"\\]|\\.)*")/)[1]);
const route='return bePaulLobe1(base,p,normal,frame,family);',dispatcher='vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family>=19401.&&family<=19415.)'+route+'return base;}';
const fixture=original+'\n'+dispatcher,main='void main(){vec3 color=paintedFacade(vec3(.5),vec3(1.),vec3(0.,1.,0.),vec4(1.),u_family);}';
const F=api.BERLIN_DISTANT_PAUL_LOBE_KEY,R='current-family:19401';
test('only the reviewed 15 families are admitted; changed structural or route contracts fail closed',()=>{
 for(let f=19401;f<=19415;f++)assert.equal(api.berlinDistantFamily('current-family:'+f),f);
 for(const key of ['current-family:20801','current-family:19401.5','current-family:19400','current-family:19416','base',F])assert.equal(api.berlinDistantFamily(key),undefined);
 assert(api.berlinDistantContractAvailable(fixture));assert(!api.berlinDistantContractAvailable(fixture.replace(route,'return base;')));assert(!api.berlinDistantContractAvailable(fixture.replace('vec3(.72,.73,.70)','vec3(.9)')));assert.equal(api.berlinDistantPaintFragment('unknown'),undefined);
});
test('distant material keeps original detail bytes and principal surfaces while omitting only named fine layers',()=>{
 const far=api.berlinDistantPaintFragment(fixture);assert(far.includes(original));
 const start=far.indexOf('vec3 bePaulLobeDistant1('),body=far.slice(start,far.indexOf('vec3 paintedFacade(',start));
 for(const token of ['concrete=vec3(.72,.73,.70),glass=vec3(.29,.38,.41)','solar=step(.5,mod(floor((x+2.1)/4.2)+floor((z+1.7)/3.4),2.))','mix(vec3(.39,.48,.49),vec3(.22,.32,.37),solar*.68)','return mix(panel,concrete,beam);','if(role==7.)return concrete;','if(role==3.)return concrete;','vec3 c=mix(concrete,vec3(.59,.62,.60),frame);c=mix(c,glass,pane);','if(n.x<-.75&&x> -88.2&&x< -87.0&&y<3.2)','return mix(c,concrete,bePLHLine1(y-.28,.12));'])assert(body.includes(token),token);
 for(const token of ['float gasket=','float cells=','float pull=','float capLight=','float casting='])assert(!body.includes(token),token);
 assert(!/\bdiscard\b/.test(original));assert(!/\bdiscard\b/.test(body));
});
test('full-fragment equality, not an unchecked family alias, controls shared rich keys',()=>{
 assert(api.berlinPaulLobeProgramsEqual(fixture+'\n'+main));
 const changed=fixture.replace(dispatcher,dispatcher.replace('{','{if(family==19415.)return vec3(.123);'))+'\n'+main;assert(!api.berlinPaulLobeProgramsEqual(changed));
 for(let f=19401;f<=19415;f++){const key='current-family:'+f;assert.equal(api.berlinPaulLobeRichKey(key,true),R);assert.equal(api.berlinPaulLobeRichKey(key,false),key);}
 assert.equal(api.berlinPaulLobeRichKey('current-family:20801',true),'current-family:20801');
});
test('quality retirement waits for replacement and protects mixed near/far and resident reflection fallback',()=>{
 const deleted=[],programs=new Map([[R,'rich'],['current-family:20801','other']]);const release=p=>deleted.push(p),resident=new Set([R]);
 assert.equal(api.retireBerlinDistantAlternates(programs,new Set([F]),release,resident),0);
 programs.set(F,'far');assert.equal(api.retireBerlinDistantAlternates(programs,new Set([R,F]),release,resident),0);
 assert.equal(api.retireBerlinDistantAlternates(programs,new Set([F]),release,resident),1);assert.deepEqual(deleted,['rich']);assert(programs.has('current-family:20801'));
 assert.equal(api.retireBerlinDistantAlternates(programs,new Set([R]),release,resident),0);assert(programs.has(F));
 assert.equal(api.retireBerlinDistantAlternates(programs,new Set(),release,resident),0);assert(programs.has(F));
 programs.set(R,'new-rich');assert.equal(api.retireBerlinDistantAlternates(programs,new Set([R]),release,resident),1);assert.deepEqual(deleted,['rich','far']);
});
test('renderer remains syntactically valid and uses the same quality key for main/reflection without changing geometry uploads',async()=>{
 const renderer=fs.readFileSync(path.join(d,'building-mesh-renderer.ts'),'utf8');await transform(renderer,{loader:'ts',format:'esm'});
 // Reflection capture runs (solarDepth false) take the same distant quality key as main draw.
 assert(renderer.includes('runs=partitionRuns.map(run=>{const baseKey=overrideKey??run.key,key=solarDepth&&legacySolarPartitions?baseKey:distantPaintProgramKey(baseKey);'));
 assert(renderer.includes('const baseKey=overrideKey??run.key,key=distantPaintProgramKey(baseKey);let selected='));
 // Projected detail classifies each run against the main draw matrix.
 assert(renderer.includes('classifyProjectedDetail(c.box,clip,viewport,'));assert(renderer.includes('const next=paintDetailQuality(components,runs,overrideKey,distantMaterialAvailable,matrix,distantQuality);'));assert(renderer.includes('residentRichKeys'));
});
// Optional private actual-build check: the caller supplies a locally SHA-verified
// assembled fragment module. No source payload or private path enters the repo.
if(process.env.CRIMEMAPS_ASSEMBLED_REVIEW_MODULE)test('actual Berlin assembled fragment preserves the complete near shader and outer masks/light/selection in distant mode',async()=>{
 const {assembledReview,specializeCurrentPaintFragment:split}=await import(pathToFileURL(process.env.CRIMEMAPS_ASSEMBLED_REVIEW_MODULE));
 const {source,paint}=assembledReview(),farPaint=api.berlinDistantPaintFragment(paint);assert(farPaint,'actual assembled source passes narrow contract');assert.equal(source.split(paint).length,2);
 const farSource=source.replace(paint,farPaint),near=split(source,19401),far=split(farSource,19401),sha=s=>createHash('sha256').update(s).digest('hex');
 assert(api.berlinPaulLobeProgramsEqual(source));assert(api.berlinPaulLobeProgramsEqual(farSource));assert.equal(sha(near),'3d8882f19899e6f64549d0ac4969a44b5188a8e42efc2602168dcb33bfc5b491');
 assert.equal(far.slice(far.indexOf('void main()')),near.slice(near.indexOf('void main()')));
 assert(near.includes(original));assert(!far.includes('vec3 bePaulLobe1('));assert(far.includes('vec3 bePaulLobeDistant1('));
 const receipt={nearCharacters:near.length,nearSHA256:sha(near),distantCharacters:far.length,distantSHA256:sha(far),outerMainIdentical:true,sharedNearPrograms:1,sharedDistantPrograms:1,geometryChanged:false,supportedFamilies:[19401,19415],uncoveredFamily20801:'original detail'};
 if(process.env.CRIMEMAPS_LOD_RECEIPT)fs.writeFileSync(process.env.CRIMEMAPS_LOD_RECEIPT,JSON.stringify(receipt,null,2)+'\n');
});

import {createRequire} from 'node:module';
import {createDelegatedFixture,DEFAULT_HELPER} from './support/fixtures-delegated-renderer.mjs';
// Exact complete-source reuse keeps finite cohorts in the existing program owner.
// The renderer's own main-program preparation, layer render/draw closure, colour
// program recipes and release path run against the production program owner and
// context scheduler (support/fixtures-delegated-renderer.mjs). Main preparation
// submits every visible group at once; the context scheduler paces the builds in
// its own turns (not one per frame), and a program reaches the draw only after it
// is published on a later frame. Convergence stays bounded: settle(needed) checks
// that at most one frame per still-needed program asks for another. The layer render
// here is the raw object method, without the production guardCustomLayerRender /
// withSceneSolarShadowReceiver / main-frame completion wrappers.
{
const ownWeb=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),web=process.env.CRIMEMAPS_REUSE_SOURCE_ROOT?path.join(process.env.CRIMEMAPS_REUSE_SOURCE_ROOT,'web'):ownWeb,require=createRequire(ownWeb+'/package.json'),{build}=require('esbuild'),d=web+'/src/painted/delegated500/safety';
async function load(name){const b=await build({entryPoints:[d+'/'+name+'.ts'],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));}
const api=await load('berlin-distant-paint'),policy=await load('current-paint-program'),text=fs.readFileSync(d+'/building-mesh-renderer.ts','utf8');
const families=[1561,1562,1564,1565,1567,1568,1569,1570,1571,1572],key=f=>'current-family:'+f;
const material='vec3 rich(vec3 base,vec3 p,vec3 n,vec4 frame,float family){if(family==1567.)return base*.8;return base+vec3(frame.x*.01);}vec3 roof(vec3 base,vec3 p,vec3 n,vec4 frame,float family){return base*.6+vec3(p.x*.01);}';
const dispatch='vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family>=1561.&&family<=1570.)return rich(base,p,normal,frame,family);if(family==1571.||family==1572.)return roof(base,p,normal,frame,family);return base;}';
const main='void main(){vec3 value=paintedFacade(vec3(.5),vec3(1.),vec3(0.,1.,0.),vec4(1.),abs(u_override)>.01?u_override:v_family);if(value.r<0.)discard;}',source=material+dispatch+main;
const changed=material+dispatch.replace('{','{if(family==1570.)return base;')+main;
// The renderer's own fragment shell supplies main(); its city paint is the material and dispatch.
const paint=material+dispatch,changedPaint=material+dispatch.replace('{','{if(family==1570.)return base;');
// Projected-detail boxes: a large one stays detail, a tiny one classifies distant.
const LARGE=[-.5,0,-.5,.5,.5,.5],TINY=[0,0,0,.01,.01,.01],identity=()=>new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
async function fixture(assembled=paint,override=0,runFamilies=families){
 const f=await createDelegatedFixture({city:'berlin',paint:assembled,root:web}),S=f.S,component={objectId:'all',partId:'all',start:0,end:runFamilies.length*3,firstVertex:0,lastVertex:runFamilies.length*3,box:[0,0,0,1,1,1]};
 f.setScene([component],runFamilies.map((family,i)=>({key:key(family),firstIndex:i*3,indexCount:3})));
 // Frames that asked for another frame since the fixture, the last settle or the last
 // rebase (a new GPU generation): the convergence window settle() bounds.
 let lastRepaint,requested=0;
 // The resident base program, compiled by the renderer itself before any frame.
 const rebase=()=>{const previous=S.phase;S.phase='rebase';try{S.program=f.until(()=>S.compileGeometryProgram(DEFAULT_HELPER));}finally{S.phase=previous;}requested=0;return S.program;};
 const base=rebase();S.paintOverrideValue=override;
 // One MapLibre frame of the building layer, then one context scheduler turn.
 const frame=()=>{const before=f.events.length;S.repaint=false;S.phase='render';S.render(f.gl,{defaultProjectionData:{mainMatrix:identity()}});S.phase='preparation';f.advancePreparation(true);S.phase='idle';lastRepaint=S.repaint;if(lastRepaint)requested++;return f.events.length-before;};
 // Bounded convergence however the scheduler paces builds: the view asks for at most
 // one more frame per program it still needs, then stops once each is published or failed.
 const settle=(needed,limit=40)=>{const built=[];for(let i=0;i<limit;i++){built.push(frame());if(!S.partitionPending&&!f.turns.queue.length&&!lastRepaint){assert(requested<=needed,requested+' frames requested another frame for '+needed+' needed programs: '+JSON.stringify(built));requested=0;return built;}}assert.fail('main programs did not settle: '+JSON.stringify(built));};
 return{v:S,S,f,frame,settle,rebase,base,component,draws:f.driver.draws,uniforms:f.driver.uniforms,deleted:f.driver.deleted,gl:f.gl,
  // Programs the frames' own visible compiles linked (bootstrap/rebase excluded).
  created:()=>f.driver.linked.filter(p=>p.origin?.phase==='render'&&!p.failed),group:family=>f.driver.linked.filter(p=>p.origin?.phase==='render'&&!p.failed&&p.metadata?.[2]===family),
  // Every source build the frames requested ran in a context scheduler turn.
  scheduled:()=>f.events.filter(e=>e.phase==='render').every(e=>e.builtIn==='preparation'),
  lastDraws:()=>f.driver.draws.slice(-S.partitionRuns.length),get lastRepaint(){return lastRepaint;}};
}
test('exact complete fragment gate keeps original material bodies and falls back for a changed dispatch',()=>{
 assert.equal(typeof api.berlinExactRichProgramKeys,'function');
 const keys=api.berlinExactRichProgramKeys(source);for(const f of families)assert.equal(keys.get(key(f)),f<1571?key(1561):key(1571));
 for(const f of [0,1563,1566,19001,19401,20801])assert(!keys.has(key(f)));
 const altered=api.berlinExactRichProgramKeys(changed);for(const f of families.filter(f=>f<1571))assert(!altered.has(key(f)));assert.equal(altered.get(key(1572)),key(1571));
 const split=policy.specializeCurrentPaintFragment(source,1561);assert(split.includes(material.slice(0,material.indexOf('vec3 roof'))));assert(split.endsWith(main));
 // A future forwarding change that selects a different material is re-evaluated,
 // rather than trusting a cached family certificate from the previous assembly.
 assert.equal(api.berlinExactRichProgramKeys(changed).has(key(1570)),false);
});
test('actual renderer creates one program per equal group across frames and preserves all run offsets/uniforms',async()=>{
 const f=await fixture(),originalRuns=structuredClone(f.v.partitionRuns);
 // The material build derives the exact groups from the real assembled shell.
 for(const family of families)assert.equal(f.v.exactRichProgramKeys.get(key(family)),family<1571?key(1561):key(1571));
 f.frame();assert(f.v.partitionPending);assert(f.lastRepaint,'a pending group requests the next frame');
 // Until its group program is published, every run draws completely with the resident base program.
 assert.equal(f.draws.length,10);assert(f.draws.every(r=>r.program===f.base));
 f.settle(2);assert.equal(f.v.partitionPending,false);assert.equal(f.frame(),0,'a settled view builds nothing');assert(f.scheduled(),'every group program builds in a context scheduler turn');
 const created=f.created();assert.equal(created.length,2,'one program per equal group');const [rich]=f.group(1561),[roof]=f.group(1571);assert(rich&&roof);
 assert.deepEqual(f.v.partitionRuns,originalRuns);assert.deepEqual(f.draws.slice(-10).map(r=>[r.offset,r.count]),families.map((_f,i)=>[i*12,3]));
 assert(f.draws.slice(-10,-2).every(r=>r.program===rich));assert(f.draws.slice(-2).every(r=>r.program===roof));
 assert(f.uniforms.filter(u=>u.name==='u_paint_override').every(u=>u.value===0));assert.equal(f.lastRepaint,false,'no repaint once every group is published');
});
test('different complete fragments stay independent and effective override keeps its original value',async()=>{
 const changedFixture=await fixture(changedPaint);changedFixture.settle(9);assert.equal(changedFixture.created().length,9);assert.equal(changedFixture.v.partitionPrograms.size,9);assert.equal(changedFixture.frame(),0);assert(changedFixture.scheduled());
 assert.equal(new Set(changedFixture.lastDraws().map(r=>r.program)).size,9,'nine independent programs draw the ten runs');
 const f=await fixture(paint,1572);f.settle(1);const created=f.created();assert.equal(created.length,1);assert.equal(created[0].metadata[2],1571);
 assert(f.lastDraws().every(r=>r.program===created[0]));assert(f.uniforms.filter(u=>u.name==='u_paint_override').every(u=>u.value===1572));
});
test('single-owner keys preserve visible protection and release once on eviction/context reset',async()=>{
 const f=await fixture();f.frame();f.frame();f.settle(2);const owners=[...f.v.partitionPrograms.values()];assert.equal(owners.length,2);assert.equal(new Set(owners).size,2);
 // The renderer's own release path: the program owner deletes a released grant.
 const release=p=>f.v.programPreparation.releaseProgram(f.gl,p),before=f.deleted.length;
 const active=new Set(f.v.partitionRuns.map(r=>f.v.distantPaintProgramKey(r.key)));assert.equal(policy.trimInactivePaintPrograms(f.v.partitionPrograms,active,release,1),0);
 assert.equal(policy.trimInactivePaintPrograms(f.v.partitionPrograms,new Set(),release,1),1);assert.equal(f.deleted.length-before,1);
 f.v.releaseGPU();assert.equal(f.v.partitionPrograms.size,0);for(const p of owners)assert.equal(f.deleted.filter(x=>x===p).length,1);
 f.rebase();f.settle(2);assert.equal(f.frame(),0);assert.equal(f.v.partitionPrograms.size,2);assert.equal(f.created().length,4,'the new GPU generation built each group once');f.v.releaseGPU();for(const p of f.created())assert.equal(f.deleted.filter(x=>x===p).length,1);
});
test('a failed family compile draws with the base program, is not retried every frame, and may retry after GPU release',async()=>{
 const logged=[],error=console.error;console.error=(...a)=>logged.push(a.map(String).join(' '));try{
 const f=await fixture();let attempts=0;f.f.driver.onBuild=origin=>{if(origin.family===1571)attempts++;};f.f.driver.fail=p=>p.metadata?.[2]===1571;
 assert.doesNotThrow(()=>{f.frame();f.frame();});f.settle(2);assert.equal(attempts,1);assert(f.v.partitionFailures.has(key(1571)));
 f.draws.length=0;f.frame();assert.equal(attempts,1,'the failed key is not recompiled every frame');assert.equal(f.draws.length,10);
 const [rich]=f.group(1561);assert(f.draws.slice(0,8).every(r=>r.program===rich));assert(f.draws.slice(-2).every(r=>r.program===f.base),'the failed group draws with the base program');
 f.v.releaseGPU();assert.equal(f.v.partitionFailures.size,0);f.rebase();f.settle(2);assert.equal(attempts,2,'a new GPU generation may retry');
 }finally{console.error=error;}
 assert.equal(logged.filter(m=>m.includes('[delegated500 family shader compile failed]')).length,2,'one log per failed key and GPU generation');
});
test('main/reflection/protection share the canonical route; shader/vertex uniforms remain original',async()=>{
 assert(text.includes('residentRichKeys=new Set(partitionRuns.map(run=>richPaintProgramKey(overrideKey??run.key)))'));
 assert(text.includes('runs=partitionRuns.map(run=>{const baseKey=overrideKey??run.key,key=solarDepth&&legacySolarPartitions?baseKey:distantPaintProgramKey(baseKey);'));
 // Visible keys are the main paint demand's distant-quality keys.
 assert(text.includes('function mainPaintProgramKeys(demand=mainPaintDemand()){return new Set(demand.runs.map(run=>distantPaintProgramKey(demand.override??run.key)));}'));assert(text.includes('const visibleProgramKeys=mainPaintProgramKeys(demand)'));
 assert(text.includes("gl!.uniform1f(gl!.getUniformLocation(p,'u_paint_override'),paintOverride())"));
 // The admitted workspace assembles the colour source, then specializes it per family.
 assert(text.includes('assemble(paintSource){const value=fragment(helper,paintSource);'));assert(text.includes('specializeCurrentPaintProgram(source,families[0],false,!berlinCurrent)'));
 // Behaviour: a distant Paul-Loebe view draws and captures its reflection with one shared program.
 const f=await fixture(original+'\n'+dispatcher,0,[19401,19402,19403]);assert.equal(f.v.sharedPaulLobeRichProgram,true);assert.equal(f.v.distantMaterialAvailable,true);
 f.component.box=TINY;f.frame();f.settle(1);const far=f.v.partitionPrograms.get(F);assert(far,'the distant program is published');
 assert(f.lastDraws().every(r=>r.program===far));assert.deepEqual(f.v.residentCaptureState(1,false).runs.map(run=>run.program),[far,far,far],'reflection runs use the main quality key');
});
test('a failed Paul-Loebe quality program keeps its resident alternate, from the failure frame on, without aliasing it',async()=>{
 for(const failing of ['distant','rich']){
  const f=await fixture(original+'\n'+dispatcher,0,[19401,19402,19403]),attempts=[];
  // The material build itself certifies the shared rich program and the distant contract.
  assert.equal(f.v.sharedPaulLobeRichProgram,true);assert.equal(f.v.distantMaterialAvailable,true);
  f.f.driver.onBuild=(_origin,_recipe,sources)=>{attempts.push(sources.fragment.includes('bePaulLobeDistant1(')?'distant':'rich');};
  f.f.driver.fail=p=>p.fragment.includes('bePaulLobeDistant1(')===(failing==='distant');
  const quality=q=>{f.component.box=q==='distant'?TINY:LARGE;};
  quality(failing==='distant'?undefined:'distant');f.settle(1);assert.equal(f.created().length,1);const alternate=f.created()[0];
  quality(failing==='distant'?'distant':undefined);f.draws.length=0;f.frame();f.frame();
  assert.equal(f.draws.length,6);assert(f.draws.every(r=>r.program===alternate),failing+': the failed quality draws its resident alternate, including the failure frame');
  f.settle(1);assert(f.lastDraws().every(r=>r.program===alternate));
  assert.equal(attempts.filter(a=>a===failing).length,1,'the failed key is not recompiled');assert(!f.deleted.includes(alternate),'the alternate is not retired');
  assert(f.deleted.every(p=>p.failed),'only the failed link is deleted; no published program is retired');
  const failedKey=failing==='distant'?F:R;assert(f.v.partitionFailures.has(failedKey));assert(!f.v.partitionPrograms.has(failedKey),'the failed key never aliases the alternate');
 }
});
if(process.env.CRIMEMAPS_EXACT_REVIEW_MODULE)test('actual current Berlin assembled shaders admit only exact complete-source groups',async()=>{
 const {assembledReview,specializeCurrentPaintFragment:split,withResidentReflectionClip}=await import(pathToFileURL(process.env.CRIMEMAPS_EXACT_REVIEW_MODULE));const {source:actual}=assembledReview(),keys=api.berlinExactRichProgramKeys(actual);
 assert.equal(keys.size,10);for(const f of families){const canonical=Number(keys.get(key(f)).slice(15));assert.equal(withResidentReflectionClip(split(actual,f)),withResidentReflectionClip(split(actual,canonical)));}
 for(const f of [19001,19401,20801,19101])assert(!keys.has(key(f)));
});

}
