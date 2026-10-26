import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';import{createRequire}from'node:module';
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(web+'/package.json')('typescript'),safety=web+'/src/safety';
function evaluate(file){const exports={};new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(name=>{const dependencies={'./environment-scene-data':'environment-scene-data.ts','./scene-surface-light':'scene-surface-light.ts','./environment-green-ground':'environment-green-ground.ts','./projected-shadow-mask':'projected-shadow-mask.ts'};assert.ok(Object.hasOwn(dependencies,name),'Unexpected shader test dependency: '+name);return evaluate(safety+'/'+dependencies[name]);},exports);return exports;}
const shaders=evaluate(safety+'/environment-scene-shaders.ts'),fragment=shaders.ENVIRONMENT_SCENE_FRAGMENT_GLSL;
function block(source,marker){const start=source.indexOf(marker);assert(start>=0,marker);const open=source.indexOf('{',start);let end=open+1,depth=1;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}assert.equal(depth,0);return{start,end,body:source.slice(open+1,end-1)};}
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
test('water contracts survive authorized green/tree material changes without moving water or enlarging reflection resources',()=>{
 // Pin the water contract rather than unrelated foliage colours or shared light.
 const vertex=shaders.ENVIRONMENT_SCENE_VERTEX_GLSL,main=block(vertex,'void main()').body,tree=block(main,'if(u_tree==1)');
 const nonTree=main.slice(0,tree.start)+main.slice(tree.end);
 assert(nonTree.includes('vec3 p=a_position,n=a_normal;'));
 assert(!/u_environment_time|u_environment_wind/.test(nonTree),'water and green vertices have no animated displacement');
 assert(nonTree.includes('v_position=p;')&&nonTree.includes('gl_Position=u_matrix*vec4(p,1.);'));
 const renderer=fs.readFileSync(safety+'/environment-scene-renderer.ts','utf8');
 assert(renderer.includes("kind==='water'&&waterAdmitted?.has(f)===true&&['Polygon','MultiPolygon'].includes(f.geometry.type)"));
 assert(renderer.includes("kind==='water_line'&&waterAdmitted?.has(f)===true&&['LineString','MultiLineString'].includes(f.geometry.type)"));
 assert(renderer.includes('if(j)holes.push(offset)')&&renderer.includes('earcut(xy,holes,2)')&&renderer.includes('deviation(xy,holes,2,triangle)>1e-8'));
 assert(renderer.includes('wp.push(xy[j],.02,xy[j+1],0,1,0,2)')&&renderer.includes('wp.push(q[0],.025,q[1],0,1,0,2)'));
 assert(renderer.includes('ENVIRONMENT_LIMITS.waterVertices')&&renderer.includes('ENVIRONMENT_LIMITS.waterIndices'));
 assert(fragment.includes('if(u_environment_shadow_pass==1){color=vec4(u_environment_shadow_opacity,0.,0.,1.);return;}'));
 for(const source of [shaders.ENVIRONMENT_SCENE_VERTEX_GLSL,fragment])assert(source.includes('uniform highp int u_environment_shadow_pass;'));
 const water=block(fragment,'if(v_role>1.5)').body.replace(/\/\/[^\n]*/g,'');assert.equal((water.match(/waterNoiseGradient\(/g)??[]).length,3);assert.equal((water.match(/waterEvolvingNoiseGradient\(/g)??[]).length,1);assert(water.includes('if(detail>1.5)'));assert.equal((water.match(/\btexture\(/g)??[]).length,1);assert.equal((fragment.match(/uniform sampler2D/g)??[]).length,1);
 for(const marker of ['vec3 waterNoiseGradient(','vec3 waterEvolvingNoiseGradient(']){const noiseBody=block(fragment,marker).body;assert.equal((noiseBody.match(/waterHash\(/g)??[]).length,4);assert(!/\b(?:for|while)\s*\(/.test(noiseBody));}
 assert(!/\b(?:sin|cos|for|while)\s*\(/.test(water));assert(!/base\s*[*+\-\/]=/.test(water),'no advected base-luminance pattern');assert(water.includes('u_environment_eye-v_position'));assert(water.includes('dot(normal,halfway)'));assert(water.includes('u_scene_daylight'));assert(water.includes('waterBandVisibility(q0)')&&water.includes('waterBandVisibility(q1)')&&water.includes('waterBandVisibility(q2)'));
 const reflection=evaluate(safety+'/planar-building-reflection.ts');
 for(const mobile of [false,true])for(const quality of ['economy','balanced','detail']){const b=reflection.planarReflectionBudget(quality,mobile),size=reflection.planarReflectionSize(7680,4320,b.pixels,b.maxDimension);assert(b.pixels<=(mobile?32768:131072));assert(b.maxDimension<=(mobile?256:512));assert(b.maxTriangles<=(mobile?30000:60000));assert(b.maxDraws<=(mobile?24:64));assert(b.fps<=8);assert(size[0]*size[1]<=b.pixels&&Math.max(...size)<=b.maxDimension);}
});

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const visibility=f=>1-smooth(.55,2.5,f);
const fract=x=>x-Math.floor(x);
const cornerBody=block(fragment,'float waterEvolvingCorner(').body;
const evolvingCorner=new Function('seed','time',cornerBody.replace(/\bsin\(/g,'Math.sin('));
function noise(q,time){
 const cell=q.map(Math.floor),f=q.map(fract),u=f.map(x=>x*x*(3-2*x)),du=f.map(x=>6*x*(1-x));
 const random=(x,y)=>{let p=[fract(x*.1031),fract(y*.1031),fract(x*.1031)];const d=p[0]*(p[1]+33.33)+p[1]*(p[2]+33.33)+p[2]*(p[0]+33.33);p=p.map(x=>x+d);return fract((p[0]+p[1])*p[2]);};
 const at=(x,y)=>evolvingCorner(random(x,y),time);
 const a=at(...cell),b=at(cell[0]+1,cell[1]),c=at(cell[0],cell[1]+1),d=at(cell[0]+1,cell[1]+1),k=a-b-c+d;
 return[a+(b-a)*u[0]+(c-a)*u[1]+k*u[0]*u[1],du[0]*((b-a)+k*u[1]),du[1]*((c-a)+k*u[0])];
}
function coarseProbe(p,time,metresPerFragment){
 const farTime=time*.125,t=farTime*2.5,q=[p[0]*.055-t*.017,p[1]*.22+t*.043],n=noise(q,farTime);
 const fx=.055*metresPerFragment,fy=.22*metresPerFragment;
 const derivative=Math.abs(noise([q[0]+fx,q[1]],farTime)[0]-n[0])+Math.abs(noise([q[0],q[1]+fy],farTime)[0]-n[0]);
 const aa=visibility(3.6*metresPerFragment),ab=visibility(Math.hypot(2.1*.3420201,8*.9396926)*metresPerFragment),weight=1-Math.max(aa,ab);
 const flecks=sample(n[0],.53,.065,derivative)*smooth(.08,.35,Math.abs(n[1]))*smooth(.08,.35,Math.abs(n[2]))*visibility(.22*metresPerFragment);
 return{weight,glint:.70*flecks*weight,aa,ab};
}
test('spatially fixed distant band fills the filter gap without derivative feedback or changing near coverage',()=>{
 assert(fragment.includes('float farTime=u_environment_time*.125;'));
 assert(fragment.includes('vec2 qFar=p*vec2(.055,.22)-(farTime*2.5)*vec2(.017,-.043);'));
 assert(fragment.includes('waterTime=u_environment_time*2.0,t=waterTime*2.5'));
 assert(fragment.includes('waterEvolvingNoiseGradient(qFar,farTime)'));
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
