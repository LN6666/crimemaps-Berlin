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
 assert(renderer.includes('runs=partitionRuns.map(run=>{const baseKey=overrideKey??run.key,key=distantPaintProgramKey(baseKey);'));
 assert(renderer.includes('const baseKey=overrideKey??run.key,key=distantPaintProgramKey(baseKey);let selected='));
 assert(renderer.includes('classifyProjectedDetail(c.box,matrix,viewport,'));assert(renderer.includes('residentRichKeys'));
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
// Exact complete-source reuse keeps finite cohorts in the existing program owner.
{
const ownWeb=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),web=process.env.CRIMEMAPS_REUSE_SOURCE_ROOT?path.join(process.env.CRIMEMAPS_REUSE_SOURCE_ROOT,'web'):ownWeb,require=createRequire(ownWeb+'/package.json'),{build,transform}=require('esbuild'),ts=require('typescript'),d=web+'/src/painted/delegated500/safety';
async function load(name){const b=await build({entryPoints:[d+'/'+name+'.ts'],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));}
const api=await load('berlin-distant-paint'),policy=await load('current-paint-program'),text=fs.readFileSync(d+'/building-mesh-renderer.ts','utf8'),ast=ts.createSourceFile('renderer.ts',text,ts.ScriptTarget.Latest,true),nodes=new Map();
function visit(n){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer&&ts.isArrowFunction(n.initializer)&&!nodes.has(n.name.text))nodes.set(n.name.text,n.initializer.getText(ast));if(ts.isFunctionDeclaration(n)&&n.name)nodes.set(n.name.text,n.getText(ast));ts.forEachChild(n,visit);}visit(ast);
const names=['draw','uniforms','programOverrideKey','richPaintProgramKey','distantPaintProgramKey','releaseGPU'];
const js=Object.fromEntries(await Promise.all(names.map(async name=>{assert(nodes.has(name),name);return[name,(await transform('('+nodes.get(name)+')',{loader:'ts',target:'es2022'})).code];})));
const families=[1561,1562,1564,1565,1567,1568,1569,1570,1571,1572],key=f=>'current-family:'+f;
const material='vec3 rich(vec3 base,vec3 p,vec3 n,vec4 frame,float family){if(family==1567.)return base*.8;return base+vec3(frame.x*.01);}vec3 roof(vec3 base,vec3 p,vec3 n,vec4 frame,float family){return base*.6+vec3(p.x*.01);}';
const dispatch='vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family>=1561.&&family<=1570.)return rich(base,p,normal,frame,family);if(family==1571.||family==1572.)return roof(base,p,normal,frame,family);return base;}';
const main='void main(){vec3 value=paintedFacade(vec3(.5),vec3(1.),vec3(0.,1.,0.),vec4(1.),abs(u_override)>.01?u_override:v_family);if(value.r<0.)discard;}',source=material+dispatch+main;
const changed=material+dispatch.replace('{','{if(family==1570.)return base;')+main;
function fixture(assembled=source,override=0){
 let current,n=0,repaints=0;const draws=[],created=[],deleted=[],uniforms=[];
 const g={TRIANGLES:4,UNSIGNED_INT:5125,useProgram:p=>{current=p;},getUniformLocation:(_p,name)=>name,uniform1f:(name,value)=>uniforms.push({program:current,name,value}),uniform2f(){},uniformMatrix4fv(){},drawElements:(_mode,count,_type,offset)=>draws.push({program:current,count,offset}),deleteProgram:p=>deleted.push(p),deleteShader(){},deleteBuffer(){},deleteVertexArray(){}};
 const base={id:0},v={...api,...policy,gl:g,program:base,partitionEnabled:true,currentFamilyPrograms:true,partitionPrograms:new Map(),distantQuality:new Map(),distantMaterialAvailable:false,sharedPaulLobeRichProgram:false,exactRichProgramKeys:api.berlinExactRichProgramKeys?.(assembled)??new Map(),paintMode:()=>2,paintOverride:()=>override,programKey:policy.currentPaintProgramKey,partitionRuns:families.map((family,i)=>({key:key(family),firstIndex:i*3,indexCount:3})),loaded:new Map([['all',{box:[0,0,0,1,1,1],start:0,end:30}]]),matrix:new Float32Array(16),paintBoxOutsideClip:()=>false,paintRunIntersectsVisible:()=>true,updateDistantPaintQuality(){},baseSurfaceFragment:'helper',surfaceFragment:undefined,cityPaintFragment:assembled,currentVisibleProgramCount:0,currentProgramEvictions:0,partitionPending:false,offscreenPaintRunsSkipped:0,diagnostic557:false,finitePaintCompileTrace:false,city:'berlin',progressiveDiagnostic:null,opacity:1,surfaceOpacity:1,anchor:[0,0],materialAnchor:[0,0],materialUnit:1,anchorUnit:1,sceneSun:{},sceneEnvironment:{sunlight:true},reflectionClipUniforms(){},uploadSceneLight(){},uploadFacadeLayouts(){},rathausProxyMasks:{withMasks:(_gl,_program,draw)=>draw(),detach(){}},map:{triggerRepaint(){repaints++;}},residentGPU:{released(){}},reusableVertex673:undefined,viewRevision:0,releaseShadowGPU(){},windowTexture:undefined,diffuseTexture:undefined,facadeAttached:false,vertexBuffer:undefined,indexBuffer:undefined,stateBuffer:undefined,paintBuffer:undefined,progressiveBuffer:undefined,vao:undefined,texturedProgram:undefined,diffuseProgram:undefined,compileGeometryProgram:(_helper,paint,family)=>{const p={id:++n,family,fragment:policy.specializeCurrentPaintFragment(paint,family)};created.push(p);return p;}};
 const env=new Proxy(v,{has:()=>true,get:(target,k)=>k===Symbol.unscopables?undefined:k in target?target[k]:globalThis[k],set:(target,k,value)=>(target[k]=value,true)});
 for(const name of names)v[name]=Function('env','with(env){return '+js[name]+'}')(env);
 const frame=()=>{v.partitionPending=false;const before=created.length;v.draw();return created.length-before;};
 return {v,frame,draws,created,deleted,uniforms,base,repaints:()=>repaints};
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
test('actual renderer creates one program per equal group across frames and preserves all run offsets/uniforms',()=>{
 const f=fixture(),originalRuns=structuredClone(f.v.partitionRuns);assert.equal(f.frame(),1);assert(f.v.partitionPending);assert.equal(f.created.length,1);
 assert(f.draws.slice(0,8).every(r=>r.program===f.created[0]));assert.equal(f.frame(),1);assert.equal(f.v.partitionPending,false);assert.equal(f.created.length,2);assert.equal(f.frame(),0);
 assert.deepEqual(f.v.partitionRuns,originalRuns);assert.deepEqual(f.draws.slice(-10).map(r=>[r.offset,r.count]),families.map((_f,i)=>[i*12,3]));
 assert(f.draws.slice(-10,-2).every(r=>r.program===f.created[0]));assert(f.draws.slice(-2).every(r=>r.program===f.created[1]));
 assert(f.uniforms.filter(u=>u.name==='u_paint_override').every(u=>u.value===0));assert.equal(f.repaints(),1);
});
test('different complete fragments stay independent and effective override keeps its original value',()=>{
 const changedFixture=fixture(changed);for(let i=0;i<9;i++)assert.equal(changedFixture.frame(),1);assert.equal(changedFixture.created.length,9);assert.equal(changedFixture.v.partitionPrograms.size,9);
 const f=fixture(source,1572);assert.equal(f.frame(),1);assert.equal(f.created.length,1);assert.equal(f.created[0].family,1571);assert(f.draws.every(r=>r.program===f.created[0]));assert(f.uniforms.filter(u=>u.name==='u_paint_override').every(u=>u.value===1572));
});
test('single-owner keys preserve visible protection and release once on eviction/context reset',()=>{
 const f=fixture();f.frame();f.frame();const owners=[...f.v.partitionPrograms.values()];assert.equal(owners.length,2);assert.equal(new Set(owners).size,2);
 const active=new Set(f.v.partitionRuns.map(r=>f.v.distantPaintProgramKey(r.key)));assert.equal(policy.trimInactivePaintPrograms(f.v.partitionPrograms,active,p=>f.v.gl.deleteProgram(p),1),0);
 assert.equal(policy.trimInactivePaintPrograms(f.v.partitionPrograms,new Set(),p=>f.v.gl.deleteProgram(p),1),1);assert.equal(f.deleted.length,1);
 f.v.releaseGPU();assert.equal(f.v.partitionPrograms.size,0);for(const p of owners)assert.equal(f.deleted.filter(x=>x===p).length,1);
 f.v.program={id:'new-base'};assert.equal(f.frame(),1);assert.equal(f.frame(),1);assert.equal(f.frame(),0);assert.equal(f.v.partitionPrograms.size,2);f.v.releaseGPU();for(const p of f.created)assert.equal(f.deleted.filter(x=>x===p).length,1);
});
test('main/reflection/protection share the canonical route; shader/vertex uniforms remain original',()=>{
 assert(text.includes('residentRichKeys=new Set(partitionRuns.map(run=>richPaintProgramKey(overrideKey??run.key)))'));
 assert(text.includes('runs=partitionRuns.map(run=>{const baseKey=overrideKey??run.key,key=distantPaintProgramKey(baseKey);'));
 assert(text.includes('visibleProgramKeys=new Set(visibleRuns.map(run=>distantPaintProgramKey(overrideKey??run.key)))'));
 assert(text.includes("gl!.uniform1f(gl!.getUniformLocation(p,'u_paint_override'),paintOverride())"));
 assert(text.includes('specializeCurrentPaintFragment(fragment(helper,paintFragment),currentFamily)'));
});
if(process.env.CRIMEMAPS_EXACT_REVIEW_MODULE)test('actual current Berlin assembled shaders admit only exact complete-source groups',async()=>{
 const {assembledReview,specializeCurrentPaintFragment:split,withResidentReflectionClip}=await import(pathToFileURL(process.env.CRIMEMAPS_EXACT_REVIEW_MODULE));const {source:actual}=assembledReview(),keys=api.berlinExactRichProgramKeys(actual);
 assert.equal(keys.size,10);for(const f of families){const canonical=Number(keys.get(key(f)).slice(15));assert.equal(withResidentReflectionClip(split(actual,f)),withResidentReflectionClip(split(actual,canonical)));}
 for(const f of [19001,19401,20801,19101])assert(!keys.has(key(f)));
});

}
