import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import ts from 'typescript';
const web=resolve(dirname(fileURLToPath(import.meta.url)),'..'),baseline=process.env.REICHSTAG_FILTER_BASELINE_WEB??web;
const file=rel=>existsSync(resolve(web,rel))?resolve(web,rel):resolve(baseline,rel);
const source=rel=>readFileSync(file(rel),'utf8');
const fallback={name:'private-source-dependencies',setup(b){b.onResolve({filter:/^\./},args=>{const target=resolve(args.resolveDir,args.path);if(target.startsWith(web)&&!existsSync(target)&&!existsSync(target+'.ts')){const other=resolve(baseline,relative(web,target));if(existsSync(other+'.ts'))return{path:other+'.ts'};}});}};
const helperPath=file('src/safety/reichstag-repeat-filter.ts');
const helperBuild=await build({entryPoints:[helperPath],bundle:true,format:'esm',platform:'node',write:false,plugins:[fallback,{name:'private-constants-only',setup(b){b.onLoad({filter:/\/reichstag-repeat-filter\.ts$/},()=>({contents:readFileSync(helperPath,'utf8')+'\nexport {PREPARE,FILTER_GLSL,REPEATS,ORIGINAL_MAIN};',loader:'ts',resolveDir:dirname(helperPath)}));}}]});
const {filterDedicatedReichstagRepeats:filter,PREPARE,FILTER_GLSL,REPEATS,ORIGINAL_MAIN}=await import('data:text/javascript;base64,'+Buffer.from(helperBuild.outputFiles[0].text).toString('base64'));
function ast(text){return ts.createSourceFile('file.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);}
function nodes(root,predicate){const out=[];function walk(n){if(predicate(n))out.push(n);ts.forEachChild(n,walk);}walk(root);return out;}
const renderer=source('src/safety/dedicated-reichstag-mesh.ts'),tree=ast(renderer),declaration=nodes(tree,n=>ts.isVariableDeclaration(n)&&n.name.getText(tree)==='FS')[0];
const shaderEntry=`import {SCENE_SURFACE_LIGHT_GLSL} from ${JSON.stringify(file('src/safety/scene-surface-light.ts'))};
import {FACADE_PAINT_PRIMITIVE_GLSL} from ${JSON.stringify(file('src/safety/facade-paint-primitives.ts'))};
import {FACADE_OPENING_GLSL} from ${JSON.stringify(file('src/safety/facade-opening-primitives.ts'))};
import {REICHSTAG_FACADE_GLSL} from ${JSON.stringify(file('src/safety/facade-reichstag-layouts.ts'))};
const FS=${declaration.initializer.getText(tree)};export {FS,FACADE_PAINT_PRIMITIVE_GLSL,FACADE_OPENING_GLSL,REICHSTAG_FACADE_GLSL};`;
const built=await build({stdin:{contents:shaderEntry,loader:'ts',resolveDir:web},bundle:true,format:'esm',platform:'node',write:false});
const {FS, FACADE_PAINT_PRIMITIVE_GLSL:primitive,FACADE_OPENING_GLSL:opening,REICHSTAG_FACADE_GLSL:layout}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const changed=filter(FS);
function body(text,name){const start=text.indexOf('float '+name+'(');assert(start>=0,name);const open=text.indexOf('{',start);let n=1,at=open+1;while(n)n+=(text[at]==='{')-(text[at++]==='}');return text.slice(open+1,at-1);}
const smoothstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const mod=(x,p)=>x-p*Math.floor(x/p),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const numeric=new Function('value','period','halfWidth','footprint','u_selected','max','abs','mod','smoothstep','clamp','step','mix',body(FILTER_GLSL,'rrRepeatFiltered').replace(/\bfloat\s+/g,'let '));
const repeat=(v,p,h,f,selected=0)=>numeric(v,p,h,f,selected,Math.max,Math.abs,mod,smoothstep,clamp,(edge,x)=>x<edge?0:1,(a,b,t)=>a+(b-a)*t);
const stroke=new Function('signedDistance','halfWidth','aaValue','max','abs','smoothstep','function fpAa(){return aaValue;}'+body(primitive,'fpStroke').replace(/\bfloat\s+/g,'let '));
const old=(v,p,h,f)=>stroke(Math.abs(mod(v+.5*Math.max(p,.05),Math.max(p,.05))-.5*Math.max(p,.05)),h,Math.max(f,.0001),Math.max,Math.abs,smoothstep);

test('real dedicated FS changes only 18 repeat sites and unconditional preparation; geometry, openings and palette remain exact',()=>{
 assert.notEqual(changed,FS);assert.equal(REPEATS.length,18);
 let filteredLayout=layout;for(const [a,b]of REPEATS){assert.equal(filteredLayout.split(a).length,2);filteredLayout=filteredLayout.replace(a,b);}
 assert(!filteredLayout.includes('fpRepeatStroke('));
 assert(changed.includes(primitive));assert(changed.includes(opening));
 const restored=changed.replace(FILTER_GLSL+filteredLayout,layout).replace(ORIGINAL_MAIN.replace('void main(){','void main(){'+PREPARE),ORIGINAL_MAIN);
 assert.equal(restored,FS,'all non-filter shader bytes remain unchanged');
 const addedFunctionNames=[...FILTER_GLSL.matchAll(/float\s+(rr\w+)\(/g)].map(m=>m[1]);
 assert.deepEqual(addedFunctionNames,['rrFilterWidth','rrRepeatFiltered']);
 for(const name of addedFunctionNames)assert(!/\b(?:dFdx|dFdy|fwidth|fpStroke|fpAa)\s*\(/.test(body(FILTER_GLSL,name)),name+' cannot return to legacy derivative helpers');
});
test('new derivative preparation executes before original reflection discard or material branches',()=>{
 const main=changed.slice(changed.lastIndexOf('void main(){'));
 assert(main.startsWith('void main(){'+PREPARE));
 assert(!/\b(?:if|discard)\b/.test(PREPARE));
 assert(main.indexOf('if(u_reflection_clip_enabled')>main.lastIndexOf('fwidth('));
 assert.equal(main.slice(('void main(){'+PREPARE).length),ORIGINAL_MAIN.slice('void main(){'.length));
});
test('actual coverage kernel is finite, periodic and bounded for negative values, seams and small/large footprints',()=>{
 for(const p of [.01,.05,.58,2.2])for(const h of [0,.0001,.02,p])for(const f of [0,1e-10,.001,p*.25,p*.5,1000,1e8])for(const selected of [0,1]){
  const period=Math.max(p,.05);
  for(const value of [-10*period,-period/2,-1e-10,0,1e-10,period/2,10*period]){
   const x=repeat(value,p,h,f,selected);assert(Number.isFinite(x)&&x>=0&&x<=1);
   assert(Math.abs(x-repeat(value+period,p,h,f,selected))<1e-9);
  }
  assert(Math.abs(repeat(-period/2+1e-10,p,h,f,selected)-repeat(period/2-1e-10,p,h,f,selected))<1e-6);
 }
});
test('resolved/selected coverage uses explicit footprint, while far colours retain analytical period occupancy',()=>{
 for(const p of [.05,.58,2.2])for(const h of [.001,.02])for(const phase of [.01,.12,.4]){
  for(const f of [0,.001,p*.25])assert.equal(repeat(phase*p,p,h,f),old(phase*p,p,h,f));
  for(const f of [p*.35,p,p*5])assert.equal(repeat(phase*p,p,h,f,1),old(phase*p,p,h,f));
 }
 const mean=.16,original=[];
 for(let i=0;i<101;i++){const v=i/100-.5;assert(Math.abs(repeat(v,1,.08,1)-mean)<1e-12);original.push(old(v,1,.08,1));}
 assert(Math.max(...original)-Math.min(...original)>.1,'unfiltered kernel fails unresolved phase stability');
 for(const [base,line]of [[[.73,.70,.61],[.43,.42,.36]],[[.25,.44,.50],[.79,.80,.70]]]){
  const expected=base.map((x,i)=>x+(line[i]-x)*mean);
  for(let i=0;i<3;i++)assert(Math.abs(base[i]+(line[i]-base[i])*repeat(.2,1,.08,1)-expected[i])<1e-12);
 }
 for(const f of [.25,.5])assert(Math.abs(repeat(.02,1,.08,f-1e-8)-repeat(.02,1,.08,f+1e-8))<1e-6);
});
test('production dome normalization and signed ramp gradients preserve scale and cancellation',()=>{
 const expression=PREPARE.match(/float rrDomeY=([^;]+);/)[1];
 const normalize=new Function('frame','max','clamp','return '+expression.replace(/v_frame\.y/g,'frame[1]').replace(/v_frame\.z/g,'frame[2]'));
 const y=f=>normalize(f,Math.max,clamp),center=[.2,8.5,17],dx=[.202,8.534,17],dy=[.197,8.551,17];
 const dome=[y(dx)-y(center),y(dy)-y(center)],u=[dx[0]-center[0],dy[0]-center[0]];
 assert(Math.abs(dome[0]-.002)<1e-12);assert(Math.abs(dome[1]-.003)<1e-12);
 const width=new Function('gradient','abs','return '+body(FILTER_GLSL,'rrFilterWidth').trim().replace(/^return\s+/,'').replace(/;$/,'').replace(/gradient\.x/g,'gradient[0]').replace(/gradient\.y/g,'gradient[1]'));
 for(const [before,after]of REPEATS.filter(([b])=>b.includes('y-uv.x*.5')||b.includes('y+uv.x*.5'))){
  const formula=after.match(/rrFilterWidth\(([^)]+)\)/)[1],combine=new Function('rrFilterDomeY','rrFilterU','return '+formula);
  const actual=width(dome.map((v,i)=>combine(v,u[i])),Math.abs),expected=before.includes('y-')?.0055:.0045;
  assert(Math.abs(actual-expected)<1e-12);
  if(before.includes('y-'))assert.equal(width([combine(.01,.02),combine(-.02,-.04)],Math.abs),0,'signed cancellation occurs before absolute value');
 }
 assert.equal(y([.2,-2,17]),0);assert.equal(y([.2,20,17]),1);assert(Number.isFinite(y([.2,0,0])));
 assert(Math.abs((y([.202,8.534,34])-y([.2,8.5,34]))-.001)<1e-12);
});
test('staggered stone gradient uses its real wrapped coordinate, not generic world width',()=>{
 const expression=PREPARE.match(/rrFilterStoneX=fwidth\(([^;]+)\);/)[1];
 const execute=new Function('frame','mod','floor','return '+expression.replace(/v_frame\.x/g,'frame[0]').replace(/v_frame\.y/g,'frame[1]'));
 const a=[.2,.579],b=[.201,.581],delta=Math.abs(execute(b,mod,Math.floor)-execute(a,mod,Math.floor));
 assert(Math.abs(delta-1.101)<1e-12);assert(delta>100*Math.abs(b[0]-a[0]));
 assert(REPEATS.some(([before,after])=>before.includes('mod(floor(uv.y/.58)')&&after.endsWith(',rrFilterStoneX)')));
});
test('unknown, altered and already-filtered source remains untouched; actual renderer compiles this function only for FS',()=>{
 for(const other of [FS+'\n',FS.replace('uniform float u_selected;','uniform float u_selected_other;'),FS.replace('vec3(.73,.70,.61)','vec3(.74,.70,.61)'),FS.replace('u_reflection_min_height','other_height'),primitive,changed])assert.equal(filter(other),other);
 const call=nodes(tree,n=>ts.isCallExpression(n)&&n.expression.getText(tree)==='filterDedicatedReichstagRepeats');assert.equal(call.length,1);assert.equal(call[0].arguments[0].getText(tree),'FS');
 const parent=call[0].parent;assert(ts.isArrayLiteralExpression(parent));assert.equal(parent.elements[0].getText(tree),'gl.FRAGMENT_SHADER');
 assert(renderer.includes('gl.useProgram(program);'),'reflection reuses the compiled program');
});
