import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createTsModuleLoader,codeStatements} from './support/fixtures-solar-texture-env-ts-modules.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ts=createRequire(root+'/package.json')('typescript');
const windowSha='7e2f09469e1b4a683bed7e41306d9e7800da1a9aecfd5688e22b77fb4a2d0386';
const digests={13651:windowSha,64:'00'.repeat(32),95359:'5dbf2c4b731a721bb73ee1a53c397e3feb23ad2a9cc24213ede4dac3ec507ea2',117467:'da249cffc10c296e44fd64921039a3b8f1e306a51218cd6e7f9fb43a3c3d68d4'};
// The runtime now lives in source-material-texture and the page resource store
// (render-runtime/*); every relative import resolves against its own importer.
// Synthetic PNG headers exercise readiness/lifecycle, not the already pinned asset contents.
const syntheticCrypto={subtle:{digest:async(_algorithm,bytes)=>Uint8Array.from(digests[bytes.byteLength].match(/../g),n=>parseInt(n,16)).buffer}};
const loader=createTsModuleLoader({typescript:ts,allow:file=>file.startsWith(path.join(root,'src')+path.sep),globals:()=>({crypto:syntheticCrypto})});
const load=name=>loader.load(path.join(root,'src/safety',name+'.ts'));
const {createOpenFacadeWindowTexture}=load('open-facade-window-texture');
const {createSourceDiffuseTexture}=load('source-diffuse-texture');
const {createOpenFacadeDiffuse}=load('open-facade-diffuse');
const {createChunkResourceStore}=load('render-runtime/chunk-resource-store');
const {createResourceBudget}=load('render-runtime/resource-budget');
assert.deepEqual(loader.diagnostics,[]);
function png(asset){const bytes=new Uint8Array(asset.bytes),view=new DataView(bytes.buffer),size=asset.bytes===13651?1024:256;view.setUint32(0,0x89504e47);view.setUint32(4,0x0d0a1a0a);view.setUint32(12,0x49484452);view.setUint32(16,size);view.setUint32(20,size);bytes[24]=8;return bytes;}
function resource(kind){
 let reads=0,decodes=0;
 // Bitmaps and GPU textures are content-addressed in a page store; a private
 // store per fixture keeps one test's recent entries from satisfying another.
 const store=createChunkResourceStore({budget:createResourceBudget()});
 const options={resourceStore:store,readBytes:async asset=>{reads++;return png(asset);},requestRepaint(){},decodeBitmap:async(_blob,options)=>{decodes++;return{width:options.resizeWidth,height:options.resizeHeight,close(){}};}};
 const runtime=kind==='window'?createOpenFacadeWindowTexture(options):kind==='diffuse'?createSourceDiffuseTexture({...options,asset:{path:'/synthetic.png',bytes:64,sha256:digests[64]},textureUnit:4,samplerName:'u_diffuse',readyName:'u_ready'}):createOpenFacadeDiffuse(options);
 return{runtime,store,get reads(){return reads;},get decodes(){return decodes;}};
}
function mockGL(){
 const constants=['ACTIVE_TEXTURE','TEXTURE_BINDING_2D','TEXTURE_2D','UNPACK_FLIP_Y_WEBGL','UNPACK_PREMULTIPLY_ALPHA_WEBGL','UNPACK_COLORSPACE_CONVERSION_WEBGL','UNPACK_ALIGNMENT','UNPACK_ROW_LENGTH','UNPACK_IMAGE_HEIGHT','UNPACK_SKIP_PIXELS','UNPACK_SKIP_ROWS','UNPACK_SKIP_IMAGES','NONE','RGBA','UNSIGNED_BYTE','TEXTURE_WRAP_S','TEXTURE_WRAP_T','REPEAT','TEXTURE_MAG_FILTER','TEXTURE_MIN_FILTER','LINEAR','LINEAR_MIPMAP_LINEAR'];
 const g={TEXTURE0:1000,active:1000,bindings:new Map(),stores:new Map(),textures:new Set(),calls:[],lost:false,hook:undefined,failCreateAt:0,creates:0,readyUniforms:[]};
 constants.forEach((name,i)=>g[name]=i+1);
 function call(name,...args){g.calls.push({name,args,lost:g.lost});g.hook?.(name,args);}
 Object.assign(g,{
  isContextLost(){return g.lost;},
  isTexture(texture){call('isTexture',texture);return !g.lost&&g.textures.has(texture);},
  createTexture(){call('createTexture');if(++g.creates===g.failCreateAt)return null;const texture={id:g.creates};g.textures.add(texture);return texture;},
  deleteTexture(texture){call('deleteTexture',texture);g.textures.delete(texture);},
  activeTexture(unit){call('activeTexture',unit);g.active=unit;},
  bindTexture(_target,texture){call('bindTexture',texture);g.bindings.set(g.active,texture);},
  getParameter(p){call('getParameter',p);return p===g.ACTIVE_TEXTURE?g.active:p===g.TEXTURE_BINDING_2D?(g.bindings.get(g.active)??null):(g.stores.get(p)??0);},
  pixelStorei(p,value){call('pixelStorei',p,value);g.stores.set(p,value);},
  texImage2D(...args){call('texImage2D',...args);},texParameteri(...args){call('texParameteri',...args);},generateMipmap(...args){call('generateMipmap',...args);},
  getUniformLocation(program,name){call('getUniformLocation',program,name);return{name};},
  uniform1i(...args){call('uniform1i',...args);},uniform1f(loc,value){call('uniform1f',loc,value);g.readyUniforms.push(value);},
  lose(){g.lost=true;g.textures.clear();},restore(){g.lost=false;},
 });
 return g;
}
const count=(g,name)=>g.calls.filter(c=>c.name===name).length;
const allocations=g=>['createTexture','deleteTexture','texImage2D','texParameteri','generateMipmap','pixelStorei'].map(name=>count(g,name));
const writes=new Set(['activeTexture','bindTexture','createTexture','deleteTexture','texImage2D','texParameteri','generateMipmap','pixelStorei','uniform1i','uniform1f']);

for(const kind of ['window','diffuse']){
 test(`${kind}: missing/foreign context/program uses unavailable without allocation or reads`,()=>{
  const h=resource(kind),r=h.runtime,g=mockGL(),foreign=mockGL(),program={};let draws=0,fallbacks=0;
  const draw=()=>++draws,unavailable=()=>++fallbacks;
  assert.equal(r.isResident(g),false);r.withResidentTexture(g,program,draw,unavailable);
  assert.equal(g.calls.length,0);assert.equal(h.reads,0);
  r.attach(g);const before=allocations(g),revision=r.stats.residentRevision;
  assert.equal(r.isResident(g),true);assert.equal(r.stats.ready,false,'a placeholder is bindable but not real pixels');
  assert.equal(r.isResident(foreign),false);r.withResidentTexture(foreign,program,draw,unavailable);r.withResidentTexture(g,undefined,draw,unavailable);
  assert.equal(foreign.calls.length,0);assert.deepEqual(allocations(g),before);assert.equal(r.stats.residentRevision,revision);assert.equal(draws,0);assert.equal(fallbacks,3);assert.equal(h.reads,0);
  r.destroy();
 });
 test(`${kind}: cached bind restores owned unit and active unit, including draw throw`,()=>{
  const {runtime:r}=resource(kind),g=mockGL(),program={},unit=kind==='window'?3:4;
  r.attach(g);const previous={previous:true};g.bindings.set(g.TEXTURE0+unit,previous);g.active=g.TEXTURE0+8;
  const before=allocations(g),revision=r.stats.residentRevision;
  const draw=()=>{assert.notEqual(g.bindings.get(g.TEXTURE0+unit),previous);g.activeTexture(g.TEXTURE0+9);return 'drawn';};
  assert.equal(r.withResidentTexture(g,program,draw,()=>assert.fail('resident unavailable')),'drawn');
  assert.equal(g.active,g.TEXTURE0+8);assert.equal(g.bindings.get(g.TEXTURE0+unit),previous);assert.equal(count(g,'getUniformLocation'),2);
  r.withResidentTexture(g,program,draw,()=>assert.fail('cached unavailable'));assert.equal(count(g,'getUniformLocation'),2);
  const failure=Error('draw failed');assert.throws(()=>r.withResidentTexture(g,program,()=>{g.activeTexture(g.TEXTURE0+10);throw failure;},()=>assert.fail('throw fallback')),error=>error===failure);
  assert.equal(g.active,g.TEXTURE0+8);assert.equal(g.bindings.get(g.TEXTURE0+unit),previous);assert.deepEqual(allocations(g),before);assert.equal(r.stats.residentRevision,revision);assert.deepEqual(g.readyUniforms,[0,0,0]);r.destroy();
 });
 test(`${kind}: real pixels retain independent ready state and replace resident revision`,async t=>{
  const h=resource(kind),r=h.runtime,g=mockGL();r.attach(g);const placeholder=r.stats.residentRevision;
  assert.equal(r.stats.ready,false);r.setEnabled(true);assert.equal(await r.load(),true);
  assert.equal(r.isResident(g),true);assert.equal(r.stats.ready,true);assert.equal(r.stats.uploadWidth,128);assert.equal(r.stats.residentRevision,placeholder+1);assert.equal(h.reads,1);assert.equal(h.decodes,1);
  const before=allocations(g);r.withResidentTexture(g,{},()=>{},()=>assert.fail('ready resource unavailable'));assert.deepEqual(allocations(g),before);assert.equal(g.readyUniforms.at(-1),1);
  const revision=r.stats.residentRevision;r.detach();assert.equal(r.isResident(g),false);assert.equal(r.stats.ready,false);assert.equal(r.stats.residentRevision,revision+1);r.detach();assert.equal(r.stats.residentRevision,revision+1);
  // Ordered steps on one runtime. The contract (as in HEAD) is that the explicit
  // re-attach is ready synchronously, so its very next draw samples the real
  // pixels (u_ready=1) instead of the placeholder. The shared runtime releases its
  // pixel lease on detach and becomes ready only after an asynchronous store hit,
  // so that step fails on its own. Keep it synchronous until the runtime adopts a
  // ready store hit during attach, or the supervisor accepts asynchronous
  // readiness with full-scene evidence of no visible placeholder frame; do not
  // relax it to an awaited load. The reuse and destroy steps still report.
  const reused=allocations(g);
  await t.test('explicit re-attach is ready synchronously and its first draw samples the real pixels',()=>{
   r.attach(g);assert.equal(r.isResident(g),true);assert.equal(h.reads,1);
   const uniforms=g.readyUniforms.length;r.withResidentTexture(g,{},()=>{},()=>assert.fail('re-attached resource unavailable'));
   assert.deepEqual({ready:r.stats.ready,firstDrawReadyUniforms:g.readyUniforms.slice(uniforms)},{ready:true,firstDrawReadyUniforms:[1]},'re-attach must not wait for a load before the real pixels are bound');
  });
  // detach hands the bitmap and the textures to the page store as recent
  // entries; the explicit attach rebinds them from the store without a second
  // read, decode, texture allocation or upload.
  await t.test('re-attach reuses the stored bitmap and textures without a second read, decode or allocation',async()=>{
   assert.equal(await r.load(),true);
   assert.equal(r.stats.ready,true);assert.equal(r.isResident(g),true);assert.equal(h.reads,1);assert.equal(h.decodes,1);assert.deepEqual(allocations(g),reused,'store hits reuse the recent bitmap and texture');
  });
  await t.test('destroy retires the attached revision exactly once',()=>{
   const attached=r.stats.residentRevision;r.destroy();assert.equal(r.stats.residentRevision,attached+1);r.destroy();assert.equal(r.stats.residentRevision,attached+1);assert.equal(r.isResident(g),false);
  });
 });
 test(`${kind}: context loss and same-object restore reject stale handles until explicit attach`,async t=>{
  // One contract, two variants. Without any external signal (the HEAD fixture)
  // the runtime alone must reject the lost handle and allocate again on the
  // explicit attach. The shared runtime reuses the stale store entry there, so
  // that variant fails until it validates the stored handle or reports its own
  // epoch, or the supervisor explicitly accepts the dependency (then assert the
  // dependency instead). The second variant tests the store protocol: in the
  // page only other owners send this signal - resident-geometry contextLost with
  // its observed epoch, and program-preparation where a program budget claim
  // exists on that context - so it is not a page-wide invariant.
  for(const invalidate of [false,true])await t.test(invalidate?'after another owner invalidates the store incarnation':'runtime alone, without an external store invalidation',()=>{
   const h=resource(kind),r=h.runtime,g=mockGL();r.attach(g);const revision=r.stats.residentRevision;g.lose();const start=g.calls.length;
   if(invalidate)h.store.invalidateContext(g);
   let draws=0,fallbacks=0;assert.equal(r.isResident(g),false);r.withResidentTexture(g,{},()=>draws++,()=>fallbacks++);assert.equal(g.calls.length,start);
   g.restore();const before=allocations(g);assert.equal(r.isResident(g),false);r.withResidentTexture(g,{},()=>draws++,()=>fallbacks++);assert.deepEqual(allocations(g),before);assert.equal(r.stats.residentRevision,revision);assert.equal(draws,0);assert.equal(fallbacks,2);
   r.attach(g);assert.equal(r.isResident(g),true,'the explicit attach after a same-object restore must make the runtime resident again');assert.ok(r.stats.residentRevision>revision);
   assert.equal(count(g,'createTexture'),2,'the explicit attach allocates in the new incarnation instead of reusing the lost handle');r.destroy();
  });
 });
 test(`${kind}: loss during binding never draws or writes restoration into lost context`,async t=>{
  for(const operation of ['isTexture','activeTexture','bindTexture','getUniformLocation','uniform1i','uniform1f'])await t.test(operation,()=>{
   const {runtime:r}=resource(kind),g=mockGL();r.attach(g);const start=g.calls.length,before=allocations(g);let draws=0,fallbacks=0;
   g.hook=name=>{if(name===operation){g.hook=undefined;g.lose();}};
   r.withResidentTexture(g,{},()=>draws++,()=>fallbacks++);
   assert.equal(draws,0,operation);assert.equal(fallbacks,1,operation);assert.deepEqual(allocations(g),before,operation);assert.deepEqual(g.calls.slice(start).filter(c=>c.lost&&writes.has(c.name)),[],operation);
  });
 });
 test(`${kind}: draw-triggered loss skips restore and does not invoke fallback after a draw`,()=>{
  const {runtime:r}=resource(kind),g=mockGL();r.attach(g);const start=g.calls.length;
  assert.equal(r.withResidentTexture(g,{},()=>{g.lose();return 'drawn';},()=>assert.fail('must not draw twice')),'drawn');
  assert.deepEqual(g.calls.slice(start).filter(c=>c.lost&&writes.has(c.name)),[]);
 });
 test(`${kind}: existing main drawing still attaches a placeholder on demand`,()=>{
  const h=resource(kind),r=h.runtime,g=mockGL();assert.equal(r.withTexture(g,{},()=>42,()=>0),42);assert.equal(count(g,'createTexture'),1);assert.equal(count(g,'texImage2D'),1);assert.equal(r.isResident(g),true);assert.equal(r.stats.ready,false);assert.equal(h.reads,0);r.destroy();
 });
}

test('diffuse composite preflights both residents and never repairs a missing second texture',async t=>{
 // Plaster and brick placeholders share one content-addressed store texture, so
 // a failed allocation can no longer strike brick alone. Both orders are covered:
 // the first (plaster) texture missing, and the second (brick) handle missing
 // while plaster is resident, where the preflight must evaluate brick itself.
 await t.test('first (plaster) placeholder allocation failed',()=>{
  const h=resource('composite'),r=h.runtime,g=mockGL(),foreign=mockGL();let draws=0,fallbacks=0;
  r.withResidentTextures(g,{},()=>draws++,()=>fallbacks++);assert.equal(g.calls.length,0);
  // Failing the first allocation leaves plaster missing while brick allocates
  // the shared placeholder on its own attach and stays resident.
  g.failCreateAt=1;r.attach(g);const before=allocations(g),start=g.calls.length;
  assert.deepEqual([r.stats.plaster.textureObjects,r.stats.brick.textureObjects],[0,1]);
  assert.equal(r.isResident(g),false);r.withResidentTextures(g,{},()=>draws++,()=>fallbacks++);r.withResidentTextures(foreign,{},()=>draws++,()=>fallbacks++);
  assert.deepEqual(allocations(g),before);assert.equal(g.calls.slice(start).filter(c=>writes.has(c.name)).length,0);assert.equal(foreign.calls.length,0);assert.equal(draws,0);assert.equal(fallbacks,3);assert.equal(h.reads,0);r.destroy();
 });
 await t.test('second (brick) handle missing while plaster holds its own real texture',async()=>{
  const h=resource('composite'),r=h.runtime,g=mockGL(),foreign=mockGL();let draws=0,fallbacks=0;
  r.withResidentTextures(g,{},()=>draws++,()=>fallbacks++);assert.equal(g.calls.length,0);
  r.attach(g);r.setNeededMaterials([{material:3,roof:false}]);r.setEnabled(true);
  for(let i=0;i<8&&!r.stats.plaster.ready;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(r.stats.plaster.ready,true);assert.equal(r.stats.brick.ready,false);assert.equal(h.reads,1);
  // Plaster now samples its own pixels (texture 2); the shared placeholder
  // (texture 1) backs brick alone. Invalidating that handle makes only the
  // second texture missing.
  const placeholder=[...g.textures].find(texture=>texture.id===1);assert.ok(placeholder,'brick still holds the shared placeholder');assert.ok([...g.textures].some(texture=>texture.id===2),'plaster holds its own real texture');
  assert.deepEqual([r.stats.plaster.textureObjects,r.stats.brick.textureObjects],[1,1]);
  g.textures.delete(placeholder);
  const before=allocations(g),start=g.calls.length;
  assert.equal(r.isResident(g),false);
  assert.ok(g.calls.slice(start).some(c=>c.name==='isTexture'&&c.args[0]===placeholder),'the preflight evaluates the second texture instead of stopping at the first');
  r.withResidentTextures(g,{},()=>draws++,()=>fallbacks++);r.withResidentTextures(foreign,{},()=>draws++,()=>fallbacks++);
  assert.deepEqual(allocations(g),before,'the missing second texture is never repaired');assert.equal(g.calls.slice(start).filter(c=>writes.has(c.name)).length,0,'the resident first texture is never bound alone');
  assert.equal(foreign.calls.length,0);assert.equal(draws,0);assert.equal(fallbacks,3);assert.equal(h.reads,1);r.destroy();
 });
});
test('diffuse composite nested cached binds restore both units on success and throw',()=>{
 const {runtime:r}=resource('composite'),g=mockGL(),program={};r.attach(g);const p={plaster:true},b={brick:true};g.bindings.set(g.TEXTURE0+4,p);g.bindings.set(g.TEXTURE0+5,b);g.active=g.TEXTURE0+8;
 const before=allocations(g),revision=r.stats.residentRevision;
 assert.equal(r.isResident(g),true);assert.equal(r.withResidentTextures(g,program,()=>{g.activeTexture(g.TEXTURE0+9);return 42;},()=>0),42);
 assert.equal(g.active,g.TEXTURE0+8);assert.equal(g.bindings.get(g.TEXTURE0+4),p);assert.equal(g.bindings.get(g.TEXTURE0+5),b);assert.equal(count(g,'getUniformLocation'),4);
 assert.throws(()=>r.withResidentTextures(g,program,()=>{g.activeTexture(g.TEXTURE0+10);throw Error('nested draw');},()=>assert.fail('fallback')),/nested draw/);
 assert.equal(g.active,g.TEXTURE0+8);assert.equal(g.bindings.get(g.TEXTURE0+4),p);assert.equal(g.bindings.get(g.TEXTURE0+5),b);assert.equal(count(g,'getUniformLocation'),4);assert.deepEqual(allocations(g),before);assert.equal(r.stats.residentRevision,revision);r.destroy();
});
test('diffuse actual selected dependency is explicit; unused material keeps its original placeholder policy',async()=>{
 const h=resource('composite'),r=h.runtime,g=mockGL();r.attach(g);const initial=r.stats.residentRevision;
 r.setNeededMaterials([{material:3,roof:false},{material:1,roof:true}]);assert.deepEqual(r.stats.neededMaterials,{plaster:true,brick:false});r.setEnabled(true);
 for(let i=0;i<4&&!r.stats.plaster.ready;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(r.stats.plaster.enabled,true);assert.equal(r.stats.plaster.ready,true);assert.equal(r.stats.brick.enabled,false);assert.equal(r.stats.brick.ready,false);assert.equal(r.isResident(g),true);assert.notEqual(r.stats.residentRevision,initial);assert.equal(h.reads,1);assert.equal(h.decodes,1);
 const before=allocations(g);r.withResidentTextures(g,{},()=>{},()=>assert.fail('unused placeholder remains legal'));assert.deepEqual(g.readyUniforms,[1,0]);assert.deepEqual(allocations(g),before);r.destroy();
});
test('diffuse composite draw-triggered loss skips both restores without fallback or new resources',()=>{
 const {runtime:r}=resource('composite'),g=mockGL();r.attach(g);const start=g.calls.length,before=allocations(g);
 assert.equal(r.withResidentTextures(g,{},()=>{g.lose();return 42;},()=>assert.fail('double draw')),42);assert.deepEqual(allocations(g),before);assert.deepEqual(g.calls.slice(start).filter(c=>c.lost&&writes.has(c.name)),[]);
});
test('all active providers re-export the one shared resource implementation',()=>{
 // Every provider now re-exports the one shared runtime; byte-identical
 // provider copies no longer exist. Evaluate each provider entry and require
 // the very same exported bindings as the shared module, not lookalike copies.
 for(const name of ['open-facade-window-texture','source-diffuse-texture','open-facade-diffuse']){
  const shared=load(name),keys=Object.keys(shared).sort();assert.ok(keys.length>0,name);
  for(const provider of ['root500','delegated500','tier300','church','city','bremen','infill']){
   const file=path.join(root,'src/painted',provider,'safety',name+'.ts');
   assert.deepEqual(codeStatements(fs.readFileSync(file,'utf8')),[`export * from '../../../safety/${name}';`],`${provider}/${name}`);
   const exported=loader.load(file);assert.deepEqual(Object.keys(exported).sort(),keys,`${provider}/${name}`);
   for(const key of keys)assert.equal(exported[key],shared[key],`${provider}/${name}:${key}`);
  }
 }
});
