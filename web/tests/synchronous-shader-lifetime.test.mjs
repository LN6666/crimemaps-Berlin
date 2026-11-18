import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createWaitGL} from './support/solar-reflection-wait-gl.mjs';

// Actual synchronous owners and source strings, with the existing allocation-
// only GL fixture. This models shader attachment lifetime, not driver memory.
const safety=fileURLToPath(new URL('../src/safety/',import.meta.url));
const built=await build({stdin:{contents:`
 export {createProjectedShadowMask} from './projected-shadow-mask';
 export {createEnvironmentSceneRenderer} from './environment-scene-renderer';
 export {createAnimatedVehicles} from './animated-vehicles';
 export {installPalaceGarden} from './facade-palace-garden';
 export {createDedicatedReichstagLayer} from './dedicated-reichstag-mesh';
 export {prepareSolarShadowBoundary} from './solar-shadow-admission';
 export {createChunkResourceStore,bindChunkResourceContext} from './render-runtime/chunk-resource-store';
 export {createResourceBudget} from './render-runtime/resource-budget';
`,resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022',preserveSymlinks:true});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],topDown=[1,0,0,0,0,0,-1,0,0,1,0,0,0,0,0,1];
const boundarySHA='a'.repeat(64);
m.prepareSolarShadowBoundary({boundarySHA256:boundarySHA,geometry:{type:'Polygon',coordinates:[[[13.3,52.4],[13.5,52.4],[13.5,52.6],[13.3,52.6],[13.3,52.4]]]}});

function lifetimeGL({failShader=0,failLink=0,loseAtLink=0}={}){
 const gl=createWaitGL(),programs=[],shaders=[],events=[];
 const original={};for(const name of ['createProgram','createShader','shaderSource','linkProgram','deleteProgram','deleteShader','useProgram','setLost','getAttribLocation'])original[name]=gl[name];
 const collect=shader=>{if(shader.deleteRequested&&!shader.attached.size)shader.disposed=true;};
 gl.createProgram=()=>{const program=original.createProgram();Object.assign(program,{ordinal:programs.length+1,attached:new Set(),linked:false,disposed:false});programs.push(program);return program;};
 gl.createShader=type=>{const shader=original.createShader(type);Object.assign(shader,{ordinal:shaders.length+1,attached:new Set(),deleteRequested:false,disposed:false});shaders.push(shader);return shader;};
 gl.shaderSource=(shader,source)=>{shader.source=source;original.shaderSource(shader,source);};
 gl.getShaderParameter=shader=>!gl.isContextLost()&&shader.ordinal!==failShader;
 gl.getShaderInfoLog=()=> 'injected shader failure';
 gl.attachShader=(program,shader)=>{program.attached.add(shader);shader.attached.add(program);events.push(['attach',program,shader]);};
 gl.detachShader=(program,shader)=>{
  assert.ok(program.linked,'detach follows successful link');assert.ok(program.attached.has(shader),'detach belongs to this program');
  assert.equal(shader.deleteRequested,false,'detach precedes deleteShader');
  program.attached.delete(shader);shader.attached.delete(program);events.push(['detach',program,shader]);collect(shader);
 };
 gl.linkProgram=program=>{
  original.linkProgram(program);program.linkedSources=[...program.attached].map(shader=>shader.source);
  if(program.ordinal===loseAtLink)gl.setLost(true);
  program.linked=!gl.isContextLost()&&program.ordinal!==failLink;events.push(['link',program]);
 };
 gl.getProgramParameter=program=>!gl.isContextLost()&&program.linked;
 gl.getProgramInfoLog=()=> 'injected link failure';
 gl.deleteShader=shader=>{original.deleteShader(shader);shader.deleteRequested=true;events.push(['delete-shader',shader]);collect(shader);};
 gl.deleteProgram=program=>{
  original.deleteProgram(program);program.disposed=true;
  for(const shader of program.attached){shader.attached.delete(program);collect(shader);}program.attached.clear();
 };
 gl.useProgram=program=>{if(program){assert.ok(program.linked);assert.equal(program.disposed,false);}original.useProgram(program);};
 gl.setLost=value=>{
  original.setLost(value);if(!value)return;
  for(const program of programs){program.disposed=true;program.attached.clear();}
  for(const shader of shaders){shader.disposed=true;shader.attached.clear();}
 };
 gl.getAttribLocation=(program,name)=>({a_uv:1,a_instance:4}[name]??original.getAttribLocation(program,name));
 return{gl,programs,shaders,events};
}

function fixture(kind,failures){
 const driver=lifetimeGL(failures),{gl}=driver,budget=m.createResourceBudget({limitBytes:64*1024*1024,recentLimitBytes:0}),store=m.createChunkResourceStore({budget});
 m.bindChunkResourceContext(gl,store);
 let owner,start,stop,restoreDocument=()=>{};
 if(kind==='environment'){
  owner=m.createEnvironmentSceneRenderer({triggerRepaint(){}},{origin:[13.4,52.5],resourceStore:store});
  start=()=>owner.layer.onAdd({},gl);stop=()=>owner.layer.onRemove();
 }else if(kind==='vehicles'){
  owner=m.createAnimatedVehicles({triggerRepaint(){}},'berlin',{clock:()=>0,frameClock:{subscribe:()=>()=>{},wake(){}},resourceStore:store});
  start=()=>owner.layer.onAdd({},gl);stop=()=>owner.layer.onRemove();
 }else if(kind==='mask'){
  owner=m.createProjectedShadowMask();start=()=>owner.draw(gl,topDown,.03,()=>{});stop=()=>owner.release();
 }else if(kind==='garden'){
  const previous=globalThis.document,document=new EventTarget();document.hidden=false;globalThis.document=document;
  restoreDocument=()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;};
  let layer;const map={triggerRepaint(){},getLayer:()=>layer,addLayer:value=>{layer=value;},removeLayer(){layer?.onRemove();layer=undefined;}};
  owner=m.installPalaceGarden({map,beforeId:()=>undefined});start=()=>owner.customLayer.onAdd({},gl);stop=()=>owner.customLayer.onRemove();
 }else{
  const vertex=new ArrayBuffer(72),view=new DataView(vertex);
  for(let i=0;i<3;i++){view.setFloat32(i*24,i,true);view.setFloat32(i*24+4,i?10:0,true);view.setFloat32(i*24+8,i===2?1:0,true);view.setInt16(i*24+14,32767,true);for(let k=18;k<22;k++)view.setUint8(i*24+k,255);}
  owner=m.createDedicatedReichstagLayer({triggerRepaint(){}},{origin:[13.3761,52.5186],vertex,index:new Uint16Array([0,1,2]),vertices:3,triangles:1,identity:{objectId:'osm/relation/8990774',partId:'osm/relation/8990774/component/35b9af608ec3d7abc1c1'},sourceCommit:'cca429f4e72a1b1b962de4d944ec83fed96869e8',boundarySHA});
  owner.setEnabled(true);owner.setSceneEnvironment({instantISO:'2026-06-21T12:00:00+02:00',sunlight:true,shadows:true,motion:false,quality:'balanced'});
  start=()=>{owner.layer.onAdd({},gl);if(kind==='reichstag-solar')owner.layer.render(gl,identity);};stop=()=>owner.layer.onRemove();
 }
 return{...driver,budget,store,start,stop,close(){try{if(kind==='mask')owner.release();else owner.destroy();store.collectRetired();store.destroy();}finally{restoreDocument();}}};
}
const cases=[['environment',2],['vehicles',1],['mask',1],['garden',1],['reichstag',1],['reichstag-solar',3]];

test('actual synchronous owners detach and delete every shader while the linked program remains usable',()=>{
 for(const [kind,count]of cases){const f=fixture(kind);try{
  f.start();assert.equal(f.programs.length,count,kind);assert.equal(f.shaders.length,count*2,kind);
  for(const program of f.programs){assert.ok(program.linked,kind);assert.equal(program.disposed,false,kind);assert.equal(program.attached.size,0,kind);f.gl.useProgram(program);}
  assert.ok(f.shaders.every(shader=>shader.deleteRequested&&shader.disposed),kind+': delete-marked shaders have no remaining native attachment');
  assert.equal(f.events.filter(event=>event[0]==='detach').length,count*2,kind);
 }finally{f.close();}assert.ok(f.programs.every(program=>program.disposed),kind+': owner destruction releases programs');}
});

test('actual compile and link failure exits release shaders and programs, including the second environment program',()=>{
 for(const [kind]of cases.filter(([kind])=>kind!=='reichstag-solar'))for(const failure of [{failShader:2},{failLink:1},...(kind==='environment'?[{failShader:4},{failLink:2}]:[])]){
  const f=fixture(kind,failure);try{
   assert.throws(()=>f.start(),/shader|program|link/i,kind);
   assert.ok(f.shaders.every(shader=>shader.disposed),kind+': failure leaves no attached shader');
   assert.ok(f.programs.every(program=>program.disposed),kind+': failure releases each program');
  }finally{f.close();}
 }
});

test('normal layer replacement recompiles the identical sources without retaining prior shader attachments',()=>{
 for(const [kind,count]of cases.filter(([kind])=>kind!=='reichstag-solar')){const f=fixture(kind);try{
  f.start();const sources=f.programs.map(program=>program.linkedSources);f.stop();f.store.collectRetired();
  assert.ok(f.programs.every(program=>program.disposed),kind);f.start();
  assert.equal(f.programs.length,count*2,kind);assert.deepEqual(f.programs.slice(count).map(program=>program.linkedSources),sources,kind+': shader text is unchanged');
  assert.ok(f.shaders.every(shader=>shader.disposed),kind);assert.ok(f.programs.slice(count).every(program=>!program.disposed&&program.attached.size===0),kind);
 }finally{f.close();}}
});

test('loss during link never detaches an unlinked shader or leaves a usable old-context program',()=>{
 for(const [kind]of cases.filter(([kind])=>kind!=='reichstag-solar')){const f=fixture(kind,{loseAtLink:1});try{
  if(kind==='mask')assert.equal(f.start(),false);else assert.throws(()=>f.start(),/link|program/i,kind);
  assert.equal(f.events.filter(event=>event[0]==='detach').length,0,kind);
  assert.ok(f.shaders.every(shader=>shader.disposed),kind);assert.ok(f.programs.every(program=>program.disposed),kind);
 }finally{f.close();}}
});

test('a failed dedicated solar program releases its shaders and preserves the linked main program',()=>{
 for(const failure of [{failShader:4},{failLink:2}]){const f=fixture('reichstag-solar',failure);try{
  f.start();assert.equal(f.programs.length,2,'a failed solar program never reaches mask allocation');
  assert.ok(f.programs[0].linked);assert.equal(f.programs[0].disposed,false);assert.equal(f.programs[0].attached.size,0);
  assert.equal(f.programs[1].disposed,true);assert.ok(f.shaders.every(shader=>shader.disposed));
  assert.ok(f.gl.draws.some(draw=>draw.program===f.programs[0]),'the actual render entry still draws the main mesh');
 }finally{f.close();}}
});
