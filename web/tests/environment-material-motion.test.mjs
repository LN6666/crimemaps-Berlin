import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const shader=await fs.readFile(new URL('../src/safety/environment-scene-shaders.ts',import.meta.url),'utf8');
function bodyAfter(marker){
  const start=shader.indexOf(marker);assert.ok(start>=0,marker);
  const open=shader.indexOf('{',start);let depth=1,end=open+1;
  for(;end<shader.length&&depth;end++){if(shader[end]==='{')depth++;else if(shader[end]==='}')depth--;}
  assert.equal(depth,0);return shader.slice(open+1,end-1);
}

test('actual far-water corner expression evolves smoothly and independently within 0.5–2 seconds',()=>{
  // Execute the scalar GLSL expression itself. This checks phase behaviour,
  // not final GPU pixels or resemblance to the reference browser.
  const source=bodyAfter('float waterEvolvingCorner(').trim();
  assert.match(source,/^return [\w\s.+*();-]+;$/);
  const corner=new Function('seed','time',source.replace(/\bsin\(/g,'Math.sin('));
  const seeds=[.03,.17,.29,.43,.61,.79,.91],deltas=[];
  for(const seed of seeds){
    const first=corner(seed,0),later=corner(seed,.591);deltas.push(later-first);
    for(const time of [0,.01,.5,.591,1,2,100,1000]){
      const value=corner(seed,time);assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
      assert.ok(Math.abs(corner(seed,time+.01)-value)<.01,'no discontinuous flash over 10ms');
    }
    assert.notEqual(corner(seed,2),first);
  }
  assert.ok(deltas.reduce((sum,n)=>sum+Math.abs(n),0)/deltas.length>.08);
  assert.ok(Math.min(...deltas)<0&&Math.max(...deltas)>0,'local brightening and fading coexist');
  assert.ok(new Set(deltas.map(n=>n.toFixed(3))).size>4,'corners do not share one temporal phase');
});

test('far material keeps existing noise footprint and water lighting/reflection controls',()=>{
  const original=bodyAfter('vec3 waterNoiseGradient('),evolving=bodyAfter('vec3 waterEvolvingNoiseGradient(');
  assert.equal((original.match(/waterHash\(/g)||[]).length,4);
  assert.equal((evolving.match(/waterHash\(/g)||[]).length,4);
  assert.ok(shader.includes('waterTime=u_environment_time*2.0,t=waterTime*2.5'));
  assert.ok(shader.includes('float farTime=u_environment_time*.125;'));
  assert.ok(shader.includes('waterEvolvingNoiseGradient(qFar,farTime)'));
  for(const name of ['q0','q1','q2'])assert.ok(shader.includes(`waterNoiseGradient(${name})`));
  assert.ok(shader.includes('u_scene_light_enabled*u_scene_daylight*step(0.,light.y)'));
  assert.ok(shader.includes('u_environment_reflection_enabled==1&&v_reflection_clip.w>0.'));
  assert.equal((shader.match(/uniform sampler2D/g)||[]).length,1,'reuse the existing building reflection texture');
});

test('green role shares the separate static material with analytic and fallback programs',async()=>{
  const green=bodyAfter('if(v_role>=2.5)'),material=await fs.readFile(new URL('../src/safety/environment-green-ground.ts',import.meta.url),'utf8');
  assert.ok(shader.indexOf('if(v_role>=2.5)')<shader.indexOf('else if(v_role>1.5)'));
  assert.match(green,/color=greenGroundColor\(v_position,v_normal\)/);
  assert.match(material,/sceneSurfaceLight\(base,normalize\(normal\),position.y\),\.60/);
  assert.ok(material.includes('smoothstep(.55,2.5,max(length(dFdx(ground)),length(dFdy(ground))))'),'subpixel grain fades');
  assert.ok(!/u_environment_time|texture\(|v_reflection_clip/.test(material));
  assert.ok(!shader.includes('gl_FragDepth'),'water and trees keep ordinary fragment depth');
});
