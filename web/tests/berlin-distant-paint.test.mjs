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
