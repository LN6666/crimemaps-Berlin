import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function bundle(name){const result=await build({entryPoints:[path.join(web,'src/safety',name)],bundle:true,write:false,platform:'node',format:'esm',target:'es2022'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const {SCENE_SURFACE_LIGHT_GLSL:glsl,createSceneLightUniforms}=await bundle('scene-surface-light.ts');
const {sceneSolarLight}=await bundle('scene-solar-light.ts');
// Execute the actual scalar GLSL helpers on the CPU, as with the existing water
// coverage test. This is a numerical contract check, not GPU/visual acceptance.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),mix=(a,b,t)=>a+(b-a)*t;
function scalar(name){const match=glsl.match(new RegExp('float '+name+'\\(([^)]*)\\)\\{([\\s\\S]*?)\\n\\}'));assert(match,name);return new Function(...match[1].split(',').map(p=>p.trim().split(' ')[1]),'clamp','max','abs','exp','mix',match[2].replace(/\bfloat\b/g,'let'));}
const channel=scalar('sceneSurfaceChannel'),contact=scalar('sceneSurfaceContact');
const palette=[...glsl.matchAll(/sceneSurfaceChannel\(([.\d]+),([.\d]+),n\.y,facing,day\)/g)].map(row=>[+row[1],+row[2]]);
assert.equal(palette.length,3);
const helpers=[clamp,Math.max,Math.abs,Math.exp,mix];
function gain(normal,light,height=10){const length=Math.hypot(...normal),n=normal.map(v=>v/length),facing=Math.max(0,n.reduce((sum,value,i)=>sum+value*light.direction[i],0)),day=clamp(light.daylight,0,1),foot=contact(n[1],height,day,...helpers);return palette.map(([sky,direct])=>channel(sky,direct,n[1],facing,day,...helpers)*foot);}
const nearly=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);

test('daylight keeps bright warm tops, restrained cool shaded faces and bounded RGB gains',()=>{
 const sun={direction:[.5,Math.sqrt(.75),0],daylight:1},top=gain([0,1,0],sun),shade=gain([-1,0,0],sun),lit=gain([1,0,0],sun);
 for(let i=0;i<3;i++){assert(top[i]>.95);assert(top[i]>lit[i]);assert(lit[i]>shade[i]);assert(top[i]-shade[i]>.20);}
 assert(top[0]>top[2],'high-sun top is gently warm, not morning blue');
 assert(shade[2]>shade[0]&&shade[2]-shade[0]<.07,'sky fill is restrained');
 for(const day of [0,.2,.5,1])for(const height of [0,.5,2,20])for(let angle=0;angle<360;angle+=15){
  const a=angle*Math.PI/180;
  for(const n of [[Math.sin(a),0,Math.cos(a)],[Math.sin(a),Math.cos(a),0]])for(const value of gain(n,{...sun,daylight:day},height))assert(Number.isFinite(value)&&value>=0&&value<=1);
 }
});
test('existing solar positions reverse east/west face illumination without a fixed lamp',()=>{
 const morning=sceneSolarLight(13.4,52.5,'2026-06-21T08:00:00+02:00'),afternoon=sceneSolarLight(13.4,52.5,'2026-06-21T18:00:00+02:00');
 for(let i=0;i<3;i++){assert(gain([1,0,0],morning)[i]>gain([-1,0,0],morning)[i]);assert(gain([-1,0,0],afternoon)[i]>gain([1,0,0],afternoon)[i]);}
 assert.match(glsl,/facing=max\(0\.,dot\(n,u_scene_sun_direction\)\)/);
});
test('night retains previous readable fill and contact is local to wall feet',()=>{
 const night=sceneSolarLight(13.4,52.5,'2026-12-21T00:00:00+01:00');assert.equal(night.daylight,0);
 for(const n of [[0,1,0],[1,0,0],[0,-1,0],[Math.SQRT1_2,Math.SQRT1_2,0]])for(const h of [0,1,10]){
  const previous=(.56+.06*clamp(n[1]*.5+.5,0,1))*(1-.14*Math.exp(-Math.max(0,h)/1.15)*(1-Math.abs(n[1])));
  for(const value of gain(n,night,h))nearly(value,previous);
 }
 nearly(contact(1,0,1,...helpers),1);nearly(contact(-1,0,1,...helpers),1);
 assert(contact(0,0,1,...helpers)<contact(0,0,0,...helpers));
 assert(contact(0,4,1,...helpers)>.997,'contact does not darken the whole wall');
});
test('disabled lighting returns source RGB and uniform binding stays cached per program',()=>{
 assert.match(glsl,/if\(u_scene_light_enabled<\.5\)return base;/);
 assert.match(glsl,/return base\*light\*sceneSurfaceContact/);
 const calls=[],locations=[],gl={getUniformLocation(p,name){locations.push([p,name]);return name;},uniform3f(...args){calls.push(args);},uniform1f(...args){calls.push(args);}},program={},other={},bind=createSceneLightUniforms(),light={direction:[.2,.8,-.4],daylight:.3};
 bind(gl,program,light);bind(gl,program,{...light,enabled:false});bind(gl,program,light,false);assert.equal(locations.length,3);
 assert.deepEqual(calls[0],['u_scene_sun_direction',.2,.8,-.4]);assert.deepEqual(calls[1],['u_scene_daylight',.3]);
 assert.deepEqual(calls.filter(row=>row[0]==='u_scene_light_enabled').map(row=>row[1]),[1,0,0]);bind(gl,other,light);assert.equal(locations.length,6);
});
test('all eight native renderers still apply shared lighting after source facade selection',async()=>{
 const paths=['safety',...['bremen','tier300','church','root500','delegated500','infill','city'].map(p=>'painted/'+p+'/safety')];
 for(const dir of paths){const text=await fs.readFile(path.join(web,'src',dir,'building-mesh-renderer.ts'),'utf8');assert(text.includes('${SCENE_SURFACE_LIGHT_GLSL}'),dir);assert.equal((text.match(/sceneSurfaceLight\(/g)||[]).length,1,dir);assert(text.indexOf('sceneSurfaceLight(')>text.indexOf('sourceFacade('),dir);}
});
