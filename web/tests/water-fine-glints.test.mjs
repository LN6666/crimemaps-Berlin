import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';import{fileURLToPath}from'node:url';import{createRequire}from'node:module';
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(web+'/package.json')('typescript'),safety=web+'/src/safety',hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function evaluate(file){const exports={};new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(name=>{assert.equal(name,'./scene-surface-light');return evaluate(safety+'/scene-surface-light.ts');},exports);return exports;}
const shaders=evaluate(safety+'/environment-scene-shaders.ts'),fragment=shaders.ENVIRONMENT_SCENE_FRAGMENT_GLSL;
// Execute the shader's scalar coverage function, supplying its screen derivative.
// This checks actual subpixel coverage math; it is not a visual/GPU acceptance test.
const body=fragment.match(/float waterFineCoverage\(float value,float level,float halfWidth\)\{([\s\S]*?)\n\}/)?.[1];assert(body);
const coverage=new Function('value','level','halfWidth','footprint','min','max','clamp',body.replace(/\bfloat\b/g,'let').replace('fwidth(value)','footprint'));
const sample=(v,level,width,footprint)=>coverage(v,level,width,footprint,Math.min,Math.max,(x,a,b)=>Math.min(b,Math.max(a,x)));
test('fine-water contour coverage is finite and bounded, with conserved thin-highlight coverage under pixel widening',()=>{
 for(const width of [.045,.065,.085])for(const footprint of [0,.0001,.01,.1,.5,2,8]){
  const level=.51,halfPixel=Math.max(footprint*.5,.001),left=level-width-halfPixel,right=level+width+halfPixel,steps=10000,step=(right-left)/steps;let area=0;
  for(let i=0;i<steps;i++){const value=sample(left+(i+.5)*step,level,width,footprint);assert(Number.isFinite(value)&&value>=0&&value<=1);area+=value*step;}
  assert(Math.abs(area-2*width)<.00001,`${width}/${footprint} preserves coverage`);assert.equal(sample(left-.1,level,width,footprint),0);assert.equal(sample(right+.1,level,width,footprint),0);
 }
 assert.equal(sample(.51,.51,.085,0),1);assert(sample(.51,.51,.085,2)<.1,'subpixel lines fade in peak brightness rather than flash fully on');
});
test('water-only shader change preserves masks, vertex/foliage geometry, reflection resource budget and bounded octave count',()=>{
 assert.equal(hash(shaders.ENVIRONMENT_SCENE_VERTEX_GLSL),'15cc0a6c80c16b6d8c77164d57baa5bf40d5f6835c4f45029b353a16511fd07e');
 assert.equal(hash(fragment.slice(fragment.indexOf(' }else{'))),'1d71596d67c206909a9357fc6cdce0abab3e661bbfd9058e22287a73f6df55b6');
 assert(fragment.includes('if(u_environment_shadow_pass==1){color=vec4(u_environment_shadow_opacity,0.,0.,1.);return;}'));
 for(const source of [shaders.ENVIRONMENT_SCENE_VERTEX_GLSL,fragment])assert(source.includes('uniform highp int u_environment_shadow_pass;'));
 const water=fragment.slice(fragment.indexOf('if(v_role>1.5){'),fragment.indexOf(' }else{')).replace(/\/\/[^\n]*/g,'');assert.equal((water.match(/waterNoiseGradient\(/g)??[]).length,4);assert(water.includes('if(detail>1.5)'));assert.equal((water.match(/\btexture\(/g)??[]).length,1);assert.equal((fragment.match(/uniform sampler2D/g)??[]).length,1);
 assert(!/\b(?:sin|cos|for|while)\s*\(/.test(water));assert(!/base\s*[*+\-\/]=/.test(water),'no advected base-luminance pattern');assert(water.includes('u_environment_eye-v_position'));assert(water.includes('dot(normal,halfway)'));assert(water.includes('u_scene_daylight'));assert(water.includes('waterBandVisibility(q0)')&&water.includes('waterBandVisibility(q1)')&&water.includes('waterBandVisibility(q2)'));
});

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const visibility=f=>1-smooth(.55,2.5,f);
const fract=x=>x-Math.floor(x);
function noise(q){
 const cell=q.map(Math.floor),f=q.map(fract),u=f.map(x=>x*x*(3-2*x)),du=f.map(x=>6*x*(1-x));
 const random=(x,y)=>{let p=[fract(x*.1031),fract(y*.1031),fract(x*.1031)];const d=p[0]*(p[1]+33.33)+p[1]*(p[2]+33.33)+p[2]*(p[0]+33.33);p=p.map(x=>x+d);return fract((p[0]+p[1])*p[2]);};
 const a=random(...cell),b=random(cell[0]+1,cell[1]),c=random(cell[0],cell[1]+1),d=random(cell[0]+1,cell[1]+1),k=a-b-c+d;
 return[a+(b-a)*u[0]+(c-a)*u[1]+k*u[0]*u[1],du[0]*((b-a)+k*u[1]),du[1]*((c-a)+k*u[0])];
}
function coarseProbe(p,time,metresPerFragment){
 const t=time*2.5,q=[p[0]*.055-t*.017,p[1]*.22+t*.043],n=noise(q);
 const fx=.055*metresPerFragment,fy=.22*metresPerFragment;
 const derivative=Math.abs(noise([q[0]+fx,q[1]])[0]-n[0])+Math.abs(noise([q[0],q[1]+fy])[0]-n[0]);
 const aa=visibility(3.6*metresPerFragment),ab=visibility(Math.hypot(2.1*.3420201,8*.9396926)*metresPerFragment),weight=1-Math.max(aa,ab);
 const flecks=sample(n[0],.53,.065,derivative)*smooth(.08,.35,Math.abs(n[1]))*smooth(.08,.35,Math.abs(n[2]))*visibility(.22*metresPerFragment);
 return{weight,glint:.70*flecks*weight,aa,ab};
}
test('fixed distant band fills the known spatial-filter gap without derivative feedback or changing near coverage',()=>{
 assert(fragment.includes('vec2 qFar=p*vec2(.055,.22)-t*vec2(.017,-.043);'));
 assert(fragment.includes('farWeight=1.-max(aa,ab)'));assert(fragment.includes('waterFineCoverage(farNoise.x,.53,.065)'));
 assert(!fragment.match(/qFar\s*=.*(?:fwidth|dFdx|dFdy|farWeight|Visibility)/));
 for(const p of [[0,0],[25.4,46.3],[-72.1,120.7]])for(const time of [0,3,300])assert.equal(coarseProbe(p,time,.05).glint,0,'near contribution stays exactly zero');
 for(const metres of [.75,1,2,4]){
  let sum=0,change=0,peak=0;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
   const p=[x*3.1-43.2,y*1.7-20.3],a=coarseProbe(p,0,metres),b=coarseProbe(p,2,metres);
   assert.equal(a.aa,0);assert.equal(a.ab,0);assert(Number.isFinite(a.glint)&&a.glint>=0&&a.glint<=1);sum+=a.glint;peak=Math.max(peak,a.glint);change+=Math.abs(a.glint-b.glint);
  }
  assert(sum/1024>.001,'nonzero resolved distant coverage');assert(peak>.03,'finite small highlights remain');assert(change/1024>.001,'clock changes distant highlight pattern');
 }
});
test('stopped clock is deterministic and distant glints use the existing daylight gate',()=>{
 for(const p of [[20,30],[-84,15],[115,-52]])assert.deepEqual(coarseProbe(p,7,1),coarseProbe(p,7,1));
 assert(fragment.includes('float solar=u_scene_light_enabled*u_scene_daylight*step(0.,light.y);'));
 assert(fragment.includes('float skyGlint=solar*'));assert(fragment.includes('))*solar;'));
 for(const daylight of [0,.2,1])for(const enabled of [0,1])for(const aboveHorizon of [0,1]){const solar=enabled*daylight*aboveHorizon,glint=coarseProbe([20,30],7,1).glint*solar*.46;assert(Number.isFinite(glint)&&glint>=0);if(!daylight||!enabled||!aboveHorizon)assert.equal(glint,0);}
});
