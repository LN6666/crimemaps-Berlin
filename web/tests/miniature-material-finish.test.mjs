import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
const paths=['safety',...['bremen','tier300','church','root500','delegated500','infill','city'].map(name=>'painted/'+name+'/safety')];
const read=path=>readFile(new URL('../src/'+path,import.meta.url),'utf8');
const built=await build({entryPoints:[new URL('../src/safety/environment-scene-data.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {lowPolyTreeMesh}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const normalize=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const mix=(a,b,t)=>a+(b-a)*t,step=(edge,x)=>x>=edge?1:0;

test('existing crown triangles carry finite outward, visibly faceted normals without new geometry or instances',()=>{
 const mesh=lowPolyTreeMesh();assert.equal(mesh,lowPolyTreeMesh());assert.equal(mesh.triangles,112);assert.equal(mesh.vertices,324);assert.equal(mesh.strideBytes,28);
 const alignments=[];
 for(let i=0;i<mesh.indices.length;i+=3){const ids=Array.from(mesh.indices.subarray(i,i+3));if(mesh.positions[ids[0]*7+6]<.5)continue;
  const p=ids.map(id=>Array.from(mesh.positions.subarray(id*7,id*7+3))),face=normalize(cross(sub(p[1],p[0]),sub(p[2],p[0])));
  for(const id of ids){const n=Array.from(mesh.positions.subarray(id*7+3,id*7+6));assert(n.every(Number.isFinite));assert(Math.abs(Math.hypot(...n)-1)<1e-6);alignments.push(dot(n,face));}
 }
 assert.equal(alignments.length,300);assert(Math.min(...alignments)>.94,'mixed normals retain each small cluster face instead of a smooth sphere');
 assert(mesh.horizontalRadiusMetres+.08<5);assert.equal(Math.max(...Array.from(mesh.positions).filter((_,i)=>i%7===1)),1);
});

function assignment(text){const start=text.indexOf('v_color=(u_paint_mode<.5?');assert(start>=0);return text.slice(start+8,text.indexOf(';',start));}
function evaluate(expression,values){return new Function('u_paint_mode','a_paint_family','paintBase','a_color','neutral','progressiveMaterialAlpha','neutralBase','light','mix','step','abs','return '+expression.replaceAll('vec3(1.)','1.'))(...values,mix,step,Math.abs);}
const progressive='(u_paint_mode<.5?vec3(1.):u_paint_mode<1.5||abs(a_paint_family)<.5?mix(paintBase,vec3(1.),neutral*(1.-step(1.5,u_paint_mode)*step(1.5,progressiveMaterialAlpha))):paintBase)*light';
const church='(u_paint_mode<.5?vec3(1.):u_paint_mode<1.5||abs(a_paint_family)<.5?mix(a_color,vec3(1.),neutral):a_color)*light';
test('all eight actual vertex expressions retain their existing white/neutral guards and leave colored materials unchanged',async()=>{
 for(const path of paths){const text=await read(path+'/building-mesh-renderer.ts'),expression=assignment(text),original=path.includes('/church/')?church:progressive;
  assert.equal(expression.replaceAll('neutralBase','vec3(1.)'),original,path);
  assert(text.includes('vec3 neutralBase=mix(vec3(.94,.95,.97),vec3(1.,.99,.97),smoothstep(.25,.85,max(0.,v_normal.y)));'),path);
  let unchanged=0,whiteChanged=0;
  for(const mode of [0,.499,.5,1,1.499,1.5,1.501,2])for(const family of [-107,-1,0,.49,.5,1,1000,1000000])for(const neutral of [0,1])for(const alpha of [0,.5,1,2,3]){
   const values=[mode,family,.23,.31,neutral,alpha,.94,.83],actual=evaluate(expression,values),old=evaluate(original,values);
   const one=evaluate(expression,[...values.slice(0,6),1,.83]),zero=evaluate(expression,[...values.slice(0,6),0,.83]);
   assert(Math.abs(one-old)<1e-12,'substituting the old white returns exactly the previous expression');
   if(Math.abs(one-zero)<1e-12){assert(Math.abs(actual-old)<1e-12);unchanged++;}else{assert(actual<old);whiteChanged++;}
   if(mode>1.5&&Math.abs(family)>=.5)assert.equal(actual,old,'painted-family branch is untouched');
  }
  assert(unchanged>0&&whiteChanged>0);
 }
});

test('white base gives a subtle warm top/cool wall before the unchanged directional light, including the Hamburg-only program',async()=>{
 const text=await read('safety/building-mesh-renderer.ts');const definition=text.match(/vec3 neutralBase=mix\(vec3\(([^)]+)\),vec3\(([^)]+)\),smoothstep\(([^,]+),([^,]+),max\(0\.,v_normal\.y\)\)\);/);assert(definition);
 const wall=definition[1].split(',').map(Number),roof=definition[2].split(',').map(Number),lo=+definition[3],hi=+definition[4];
 const smooth=y=>{const t=Math.min(1,Math.max(0,(Math.max(0,y)-lo)/(hi-lo)));return t*t*(3-2*t);};
 assert(roof[0]>roof[2]);assert(wall[2]>wall[0]);
 for(const y of [-1,0,.1,.25,.4,.6,.85,1])for(let i=0;i<3;i++){const value=mix(wall[i],roof[i],smooth(y));assert(value>=.94&&value<=1);}
 const hamburg=await read('safety/hamburg-white-shader.ts');assert(hamburg.includes('sceneSurfaceLight(mix(vec3(.94,.95,.97),vec3(1.,.99,.97),smoothstep(.25,.85,max(0.,normalize(v_normal).y))),normalize(v_normal),v_height)'));
});

test('leaf and grass detail stays static, bounded and screen-filtered at both rotated scales',async()=>{
 const shader=await read('safety/environment-scene-shaders.ts'),green=await read('safety/environment-green-ground.ts');
 const leaf=shader.slice(shader.indexOf('// Static leaf-cluster'),shader.indexOf('color=vec4(sceneSurfaceLight',shader.indexOf('// Static leaf-cluster')));
 assert(!leaf.includes('u_environment_time'));assert(leaf.includes('waterBandVisibility(crown)')&&leaf.includes('waterBandVisibility(fine)'));
 assert(green.includes('dFdx(ground)')&&green.includes('dFdx(fine)'));assert(!green.includes('u_environment_time'));
 const range=(text,pattern)=>[...text.matchAll(pattern)].map(m=>[+m[1],+m[2]]);
 const leafRanges=range(leaf,/mix\(([.\d]+),([.\d]+),(?:leaf|fineLeaf)\)/g),grassRanges=range(green,/mix\(([.\d]+),([.\d]+),(?:grain|fineGrain)\)/g);
 assert.equal(leafRanges.length,2);assert.equal(grassRanges.length,2);
 assert(leafRanges.reduce((n,r)=>n*r[0],1)>.75&&leafRanges.reduce((n,r)=>n*r[1],1)<1.20);
 assert(grassRanges.reduce((n,r)=>n*r[0],1)>.94&&grassRanges.reduce((n,r)=>n*r[1],1)<1.07);
 for(const text of [leaf,green])assert(text.includes('mat2(.3846154,-.9230769,.9230769,.3846154)'));
 assert(green.includes('position.y),.60)'));assert(shader.includes('waterTime=u_environment_time*2.0,t=waterTime*2.5'));assert(shader.includes('float farTime=u_environment_time*.125;'));
});
