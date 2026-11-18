import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const built=await build({entryPoints:[path.join(web,'src/painted/delegated500/safety/current-paint-program.ts')],bundle:true,write:false,format:'esm',platform:'node'});
const {specializeRoundedPaintProgram:rounded,exactCurrentPaintProgramKeys:exactKeys,specializeCurrentPaintFragment:split,specializeCurrentPaintProgram:program,currentPaintProgramKey:key,currentPaintProgramFamily:family,trimInactivePaintPrograms:trim,paintedFacadeDepthEffects:depthEffects}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
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
test('shader analysis uses the current source and cannot reuse a previous repair body',()=>{
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

// Other cities assemble the progressive dispatch without Legacy159, without Legacy500,
// or with Dortmund's Before681 hop. Only the leaf of the requested family may remain.
const leaves='vec3 cityLeaf(vec3 base,float family){return base*.1;}\nvec3 middleLeaf(vec3 base,float family){return base*.2;}\nvec3 kept(vec3 base,float family){return base*.3;}\nvec3 cut(vec3 base,float family){if(base.r<0.)discard;return base*.4;}';
const dispatch=(chain,forward='family')=>{const [first,...rest]=chain,next=rest.length?rest[0]:'progressiveFeatureDispatch';return `vec3 ${first}(vec3 base,float family){if(family==1001.)return cityLeaf(base,family);return ${next}(base,${forward});}\n`+rest.map((name,i)=>`vec3 ${name}(vec3 base,float family){if(family==1002.)return middleLeaf(base,family);return ${rest[i+1]??'progressiveFeatureDispatch'}(base,${forward});}`).join('\n');};
const chainShader=(chain,forward)=>`#version 300 es
precision highp float;
uniform float u_family;out vec4 colour;
${leaves}
vec3 progressiveFeatureDispatch(vec3 base,float family){if(family==1003.)return kept(base,family);if(family==1004.)return cut(base,family);return base;}
${dispatch(chain,forward).split('\n').reverse().join('\n')}
vec3 paintedFacade(vec3 base,float family){if(family>=1000.)return progressiveFeatureDispatchCity(base,floor(family+.5));return base;}
void main(){colour=vec4(paintedFacade(vec3(.5),u_family),1.);if(colour.a<0.)discard;}`;
const shapes={withoutLegacy159:['progressiveFeatureDispatchCity','progressiveFeatureDispatchCityLegacy500'],withoutLegacy500:['progressiveFeatureDispatchCity','progressiveFeatureDispatchCityLegacy159Baseline'],before681:['progressiveFeatureDispatchCity','progressiveFeatureDispatchCityBefore681','progressiveFeatureDispatchCityLegacy159Baseline']};
test('city forwarding chains narrow to one material only when enabled, keeping material bytes and main',()=>{
 for(const[shape,chain]of Object.entries(shapes)){const source=chainShader(chain),narrow=split(source,1003,false,true),plain=split(source,1003);
  assert(narrow.includes('vec3 kept(vec3 base,float family){return base*.3;}'),shape);for(const leaf of ['vec3 cityLeaf(','vec3 middleLeaf(','vec3 cut('])assert(!narrow.includes(leaf),shape+' '+leaf);
  assert.equal(narrow.slice(narrow.indexOf('void main')),source.slice(source.indexOf('void main')),shape);
  // Disabled by default: the unchanged specializer keeps the final dispatcher it cannot verify.
  assert(plain.includes('vec3 cut('),shape);assert(plain.length>narrow.length,shape);
 }
});
test('city forwarding chains stay conservative for mixed callers, rewritten arguments and other signatures',()=>{
 const mixed=chainShader(shapes.withoutLegacy159).replace('void main(){colour=vec4(paintedFacade(vec3(.5),u_family),1.);','void main(){colour=vec4(paintedFacade(vec3(.5),u_family)+progressiveFeatureDispatch(vec3(.1),u_family),1.);');assert(split(mixed,1003,false,true).includes('vec3 cut('));
 const rewritten=chainShader(shapes.withoutLegacy500,'family+1.');assert(split(rewritten,1003,false,true).includes('vec3 cut('));
 const signature=chainShader(shapes.before681).replace('vec3 progressiveFeatureDispatchCityBefore681(vec3 base,float family)','vec3 progressiveFeatureDispatchCityBefore681(vec3 base,float family,float spare)').replace('progressiveFeatureDispatchCityBefore681(base,family)','progressiveFeatureDispatchCityBefore681(base,family,0.)');assert(split(signature,1003,false,true).includes('vec3 middleLeaf('));
});
test('depth effects follow the specialized paintedFacade closure, not main',()=>{
 const source=chainShader(shapes.before681);assert.equal(depthEffects(source,1004,true),true);assert.equal(depthEffects(source,1003,true),false);assert.equal(depthEffects(source,0,true),false);
 // Unverified forwarding keeps every dispatcher reachable, so the discard stays visible.
 assert.equal(depthEffects(source,1003,false),true);
});
test('one current program specialization keeps colour and depth on the same city and church dispatch',()=>{
 const source=chainShader(shapes.before681),plain=program(source,1003,false,true),cut=program(source,1004,false,true);
 assert.equal(plain.depthEffects,false);assert(plain.fragment.includes('vec3 kept('));assert(!plain.fragment.includes('vec3 cut('));
 assert.equal(cut.depthEffects,true);assert(cut.fragment.includes('vec3 cut('));assert(!cut.fragment.includes('vec3 kept('));
 assert.equal(cut.fragment.slice(cut.fragment.indexOf('void main')),source.slice(source.indexOf('void main')));
 const church=program(churchShader.replace('return base*(.7+.3*abs(normal.y));','if(normal.y<0.)discard;return base*(.7+.3*abs(normal.y));'),291,true);
 assert(church.fragment.includes('if(normal.y<0.)discard;'));assert.equal(church.depthEffects,true);assert(!church.fragment.includes('vec3 unrelated('));
});


test('exact family sharing compares full specialized sources and retains dynamic family material behavior',()=>{
 const families=Array.from({length:26},(_,i)=>1603+i);
 const source=shader.replace('family>=1000.&&family<=1002.','family>=1603.&&family<=1628.');
 const aliases=exactKeys(source,families,false,true);
 assert.equal(aliases.size,26);for(const value of families){assert.equal(aliases.get(key(value)),key(1603));assert.equal(split(source,value,false,true),split(source,1603,false,true));}
 assert(split(source,1603,false,true).includes(leaf),'the family-dependent material body is unchanged');
 const changed=source.replace('if(family>=1603.', 'if(family==1615.)return vec3(.123);if(family>=1603.');
 assert.equal(exactKeys(changed,families,false,true).size,0,'one changed family rejects the entire finite cohort');
 assert.equal(exactKeys(source,[],false,true).size,0);assert.throws(()=>exactKeys(source,[1603,NaN],false,true));
 assert.equal(exactKeys(source,families,false,true).size,26,'an intervening source cannot poison equality');
});

test('rounded partitions retain fractional guards but narrow only proved rounded forwarding',()=>{
 const result=rounded(shader,2001).fragment;
 assert(result.includes('if(abs(family-2001.)<.25)return leaf(base,family);'),'the centre and edge of one partition can choose different materials');
 assert(result.includes(leaf));
 const far=rounded(shader,1001).fragment;
 assert(!far.includes('if(abs(family-2001.)<.25)'));
 assert(far.includes('return progressiveFeatureDispatchCity(base,floor(family+.5));'));
 assert(far.includes(leaf));
 const unknown=shader.replace('abs(family-2001.)<.25','sin(family)>0.');
 assert(rounded(unknown,1001).fragment.includes('if(sin(family)>0.)'));
 const boundary=shader.replace('abs(family-2001.)<.25','family<1001.');
 assert(rounded(boundary,1001).fragment.includes('if(family<1001.)'));
 const unrounded=shader.replace('floor(family+.5)','family');
 assert(rounded(unrounded,1001).fragment.includes('if(family>=1000.&&family<=1002.)'),'unknown forwarding is not treated as an exact integer');
 assert.throws(()=>rounded(shader,1001.2));
});

test('rounded material dispatch agrees across fractional samples and guard boundaries',()=>{
 const guards=['abs(family-3289.)<.25','abs(family-3289.)<=.25','family<3289.','family>=3289.','family==3289.','family!=3289.','abs(family-1100.)<.25||abs(family-3289.)<.25','family>=1000.&&family<4000.','abs(family-1100.)<.25','(family<3289.||family>3289.)&&family>=1000.'];
 const body=source=>source.match(/float paintedFacade\(float family\)\{([^{}]*)\}/)[1];
 const evaluate=text=>new Function('family',text.replace(/\babs\(/g,'Math.abs('));
 for(const guard of guards){
  const input=`float paintedFacade(float family){if(${guard})return 1.;return 2.;}\nvoid main(){float value=paintedFacade(v_family);}`;
  const actual=evaluate(body(rounded(input,3289).fragment)),expected=evaluate(body(input));
  for(const delta of [-.5,-.499755859375,-.250244140625,-.25,-.249755859375,0,.249755859375,.25,.250244140625,.49951171875]){
   const value=Math.fround(3289+delta);
   assert.equal(actual(value),expected(value),guard+' at '+value);
  }
 }
});

test('rounded pruning preserves unknown guard evaluation even beside a constant-false term',()=>{
 const input=shader.replace('abs(family-2001.)<.25','runtimeFlag&&family<0.');
 assert(rounded(input,3289).fragment.includes('if(runtimeFlag&&family<0.)'));
});
