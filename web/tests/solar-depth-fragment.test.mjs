import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const entry=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety/solar-depth-fragment.ts');
const built=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node'});
const {createSolarDepthFragment}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
// A finite executable GLSL subset tests control flow of the actual transformed
// program. This deliberately includes output reads after assignment, nested
// material discard, early return and depth writes; it is not GPU acceptance.
function execute(source,input){
 const functions=source.slice(source.indexOf('vec4 material'))
  .replace(/\bvoid\s+(\w+)\s*\(\s*(?:void)?\s*\)/g,'function $1()')
  .replace(/\bvec4\s+(\w+)\s*\(\s*\)/g,'function $1()')
  .replace(/\b(?:float|vec4)\s+(\w+)\s*=/g,'let $1=')
  .replace(/\bdiscard\s*;/g,"throw 'discard';");
 return new Function('mode','hole','vec4',`let color,colour,gl_FragDepth=.5;try{${functions};main();return {discard:false,depth:gl_FragDepth,color:${source.includes('out vec4 colour;')?'colour':'color'}};}catch(e){if(e==='discard')return{discard:true};throw e;}`)(input.mode,input.hole,(...v)=>v.length===1?[v[0],v[0],v[0],v[0]]:v);
}
function original(output='color'){
 return `#version 300 es
precision highp float;uniform float mode;uniform float hole;out vec4 ${output};
vec4 material(){if(hole>.5){gl_FragDepth=.12;discard;}return vec4(.2,.3,.4,1.);}
void main(){gl_FragDepth=.45;if(mode<.5){${output}=vec4(.1);gl_FragDepth=.31;return;}${output}=material();if(mode>1.5){if(${output}[0]<.25)discard;}gl_FragDepth=${output}[1];${output}=vec4(.6,.7,.8,1.);}
`;
}

test('wrapper preserves nested discard, early-return and depth semantics while replacing only final color',()=>{
 for(const output of ['color','colour']){
  const before=original(output),after=createSolarDepthFragment(before,output);
  assert.equal(after.replace('cmSolarOriginalMain','main').slice(0,before.length),before,'original source body and material functions are byte-identical');
  for(const mode of [0,1,2])for(const hole of [0,1]){
   const a=execute(before,{mode,hole}),b=execute(after,{mode,hole});
   assert.equal(b.discard,a.discard,`mode ${mode}, hole ${hole}`);
   if(!a.discard){assert.equal(b.depth,a.depth);assert.deepEqual(b.color,[1,1,1,1]);assert.notDeepEqual(a.color,b.color);}
  }
 }
});

test('unknown output interfaces, macro entrypoints and ambiguous/malformed main are refused',()=>{
 const valid=original();
 for(const source of [valid.replace('out vec4 color;','out vec4 other;'),valid.replace('out vec4 color;','out vec4 color;out vec4 extra;'),valid+'\nvoid main(){}',valid+'\nvoid unknown(){main();}',valid.replace('void main()', 'void otherMain()'),valid+'\n}',valid.replace('void main()', 'void cmSolarOriginalMain()'),valid.replace('precision highp float;','#define main anotherMain\nprecision highp float;'),valid.replace('precision highp float;','#define color fragColor\nprecision highp float;'),valid.replace('#version 300 es','#version 100')])assert.throws(()=>createSolarDepthFragment(source));
 assert.throws(()=>createSolarDepthFragment(valid,'unknown'));
});

test('comments do not create fake interfaces and output local dataflow is kept before final override',()=>{
 const source=original().replace('void main()', '/* void main() { out vec4 color; } */\nvoid\nmain (void)');
 const out=createSolarDepthFragment(source);assert.ok(out.includes('void\ncmSolarOriginalMain (void)'));assert.deepEqual(execute(out,{mode:1,hole:0}),{discard:false,depth:.3,color:[1,1,1,1]});
 assert.deepEqual(execute(out,{mode:2,hole:0}),{discard:true},'output-variable dependent discard is not replaced by constant color early');
});
