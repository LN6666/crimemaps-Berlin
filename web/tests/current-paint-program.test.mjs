import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const built=await build({entryPoints:[path.join(web,'src/painted/delegated500/safety/current-paint-program.ts')],bundle:true,write:false,format:'esm',platform:'node'});
const {specializeCurrentPaintFragment:split,currentPaintProgramKey:key,currentPaintProgramFamily:family,trimInactivePaintPrograms:trim}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const leaf='vec3 leaf(vec3 base,float family){return base+vec3(family*.001);}';
const shader=`#version 300 es
precision highp float;
uniform float u_family;out vec4 colour;
${leaf}
vec3 dead(vec3 base){for(int i=0;i<100;i++)base*=.9;return base;}
vec3 progressiveFeatureDispatchCity(vec3 base,float family){if(family>=1000.&&family<=1002.)return leaf(base,family);return base;}
vec3 paintedFacade(vec3 base,float family){if(abs(family-2001.)<.25)return leaf(base,family);if(family>=1000.)return progressiveFeatureDispatchCity(base,floor(family+.5));if(abs(family)<.5)return base;return leaf(base,family);}
void main(){colour=vec4(paintedFacade(vec3(.5),u_family),1.);}`;
test('neutral program keeps the original main, removes unreachable facade work and never changes material bodies',()=>{
 const neutral=split(shader,0),painted=split(shader,1001);assert.equal(neutral.slice(neutral.indexOf('void main')),shader.slice(shader.indexOf('void main')));assert(!neutral.includes('vec3 leaf('));assert(!neutral.includes('vec3 dead('));assert(painted.includes(leaf));assert(!painted.includes('vec3 dead('));assert.match(painted,/return leaf\(base,family\);/);assert.match(painted,/floor\(family\+\.5\)/);
});
test('supplement guards and unknown categories preserve the current dispatcher fallback',()=>{
 assert(!split(shader,2001).includes('vec3 progressiveFeatureDispatchCity('));assert(split(shader,2001).includes(leaf));assert(!split(shader,9999).includes('vec3 leaf('));for(const value of [-98,0,.2,4.15,1679,44195])assert.equal(family(key(value)),value);assert.throws(()=>split(shader,NaN));assert.throws(()=>split(shader,Infinity));
});
test('unknown runtime guards and if/else retain original control flow, and overloads stay available',()=>{
 const withRuntime=shader.replace('if(abs(family-2001.)<.25)','if(u_family>0.)');assert(split(withRuntime,0).includes('if(u_family>0.)return leaf(base,family);'));
 const withElse=shader.replace('if(abs(family-2001.)<.25)return leaf(base,family);','if(abs(family-2001.)<.25)return leaf(base,family);else return base;');assert(split(withElse,0).includes('if(abs(family-2001.)<.25)return leaf(base,family);else return base;'));
 const overloaded=shader.replace(leaf,leaf+'\nfloat leaf(float value){return value;}');assert(split(overloaded,1001).includes('float leaf(float value){return value;}'));
});
test('shader-analysis cache follows the current source and cannot reuse a previous repair body',()=>{
 const changed=shader.replace('family*.001','family*.002');assert(split(shader,1001).includes('family*.001'));assert(split(changed,1001).includes('family*.002'));assert(!split(changed,1001).includes('family*.001'));
});
test('inactive LRU entries are released once while every visible program is protected',()=>{
 const programs=new Map(Array.from({length:80},(_,i)=>['p'+i,i])),deleted=[];assert.equal(trim(programs,new Set(['p0']),p=>deleted.push(p)),16);assert.equal(programs.size,64);assert(programs.has('p0'));assert.deepEqual(deleted,Array.from({length:16},(_,i)=>i+1));assert.equal(trim(programs,new Set(),p=>deleted.push(p)),0);
});
test('a viewport with more than 64 programs keeps its paint and trims after leaving that viewport',()=>{
 const programs=new Map(Array.from({length:70},(_,i)=>['p'+i,i])),deleted=[];assert.equal(trim(programs,new Set(programs.keys()),p=>deleted.push(p)),0);assert.equal(programs.size,70);assert.equal(trim(programs,new Set(['p69']),p=>deleted.push(p)),6);assert.equal(programs.size,64);assert(programs.has('p69'));
});

const forwardedShader=`#version 300 es
precision highp float;uniform float u_family;out vec4 colour;
vec3 hn(vec3 base){return base*.9;}
${leaf}
vec3 progressiveFeatureDispatchCity(vec3 base,float family){if(family==1679.)return leaf(base,family);return base;}
vec3 paintedFacade(vec3 base,float family){if(abs(family-18301.)<.25)return hn(base);if(family>=1000.)return progressiveFeatureDispatchCity(base,floor(family+.5));return base;}
void main(){colour=vec4(paintedFacade(vec3(.5),u_family),1.);}`;
test('raw top-level family and forwarded rounded family use different verified contexts',()=>{
 assert(!split(forwardedShader,18301.375).includes('vec3 hn('));assert(split(forwardedShader,18301.125).includes('vec3 hn('));for(const v of[1678.75,1679.375])assert(split(forwardedShader,v).includes(leaf));assert(!split(forwardedShader,1678.25).includes(leaf));
});
test('unknown forwarding retains its runtime dispatcher and float constants follow Float32',()=>{
 const unknown=forwardedShader.replace('floor(family+.5)','family+u_family');assert(split(unknown,1678.75).includes('if(family==1679.)return leaf(base,family);'));
 const decimal=forwardedShader.replace('abs(family-18301.)<.25','family==.1');assert(split(decimal,Math.fround(.1)).includes('vec3 hn('));
});

const churchLeaf='vec3 selectedMaterial(vec3 base,vec3 normal){return base*(.7+.3*abs(normal.y));}';
const churchShader=`#version 300 es
precision highp float;uniform float u_family;uniform float u_dynamic;out vec4 colour;
${churchLeaf}
vec3 unrelated(vec3 base){for(int i=0;i<128;i++)base*=.99;return base;}
vec3 fpLayoutFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float layoutId){if(layoutId==291.)return selectedMaterial(base,normal);if(layoutId==300.)return unrelated(base);return base;}
vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(abs(family)<.5)return base;if(family==289.){if(frame.z<0.)return base;return fpLayoutFacade(base,p,normal,frame,family);}if(family==291.){vec3 color=base*.9;return fpLayoutFacade(base,p,normal,frame,family)*color;}if(family==300.)return fpLayoutFacade(base,p,normal,frame,family);return base;}
void main(){colour=vec4(paintedFacade(vec3(.5),vec3(1.),vec3(0.,1.,0.),vec4(1.),u_family),1.);}`;
test('church narrowing skips false material blocks and retains a selected block, layout and material bytes',()=>{
 const result=split(churchShader,291,true);assert(result.includes('vec3 color=base*.9;return fpLayoutFacade(base,p,normal,frame,family)*color;'));assert(result.includes(churchLeaf));assert(!result.includes('vec3 unrelated('));assert.equal(result.slice(result.indexOf('void main')),churchShader.slice(churchShader.indexOf('void main')));assert(split(churchShader,291).includes('if(family==289.)'));
});
test('church narrowing retains conditional fallthrough and runtime branches',()=>{
 const conditional=churchShader.replace('if(frame.z<0.)return base;return fpLayoutFacade(base,p,normal,frame,family);','if(frame.z<0.)return base;');const result=split(conditional,289,true);assert(result.includes('if(family==289.){if(frame.z<0.)return base;}if(family==291.)'));const runtime=churchShader.replace('if(family==289.)','if(u_dynamic>0.)');assert(split(runtime,291,true).includes('if(u_dynamic>0.)'));
});
test('church layout narrowing retains a changed family forwarding contract at runtime',()=>{
 const result=split(churchShader.replaceAll('fpLayoutFacade(base,p,normal,frame,family)','fpLayoutFacade(base,p,normal,frame,family+1.)'),291,true);assert(result.includes('if(layoutId==291.)'));assert(result.includes('if(layoutId==300.)'));assert(result.includes('vec3 unrelated('));
});
