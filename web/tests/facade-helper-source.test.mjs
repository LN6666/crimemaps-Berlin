import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// The shared surface/diffuse helper lease: exact descriptor bounds, admission
// before emission, waiting/cancellation, sharing, and the seven manager ensure
// and destroy paths executed from their actual source text.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),src=(...parts)=>path.join(web,'src',...parts);
const families=['root500','infill','bremen','city','tier300','church','delegated500'];
const sha=text=>createHash('sha256').update(text,'utf8').digest('hex');
// Pinned outputs of the implementation that existed before this lease (2026-11-01).
const PINNED={base:[1693,'e8ed73e820a66e9c9f08d219c7172ac8c8c21c17cbf44bc54bf8ad9a5730cad5'],surface:[2562,'986d596ee2e6dfef1745951c59f9794d2d1ca051475df349cb93b0c3b3c184ad'],diffuse:[3743,'9694b48677aabc7be7c160c129b969d16042eba88c520ae125dfe0de874e36ad']};
// Verbatim copies of the two replaced generator bodies (type annotation removed).
function legacySurfaceFragment(existing){
 if(!existing.includes('vec3 sourceFacade('))throw Error('Expected source material facade function');
 return `uniform sampler2D u_source_window_texture;
uniform float u_source_window_ready;
`+existing.replace('vec3 sourceFacade(','vec3 sourceFacadeFallback(')+`
vec3 sourceFacade(vec3 base,vec3 p,vec3 normal,float material,float hasWindows){
 vec3 wallBase=sourceFacadeFallback(base,p,normal,material,u_source_window_ready>.5?0.:hasWindows);
 if(u_source_window_ready<.5)return wallBase;
 float wall=1.-smoothstep(.18,.42,abs(normal.y));
 vec2 metres=vec2(abs(normal.x)>abs(normal.z)?p.z:p.x,p.y);
 float detail=1.-smoothstep(.35,.8,max(length(fwidth(metres)),.0001));
 // Official style repeat is2.5m. Arrangement is schematic, never source floors/tenants.
 vec2 uv=(metres-vec2(0.,.65))/2.5;
 vec4 windows=texture(u_source_window_texture,uv);
 float coverage=windows.a*wall*hasWindows*detail*step(.8,p.y);
 float light=.63+.37*max(0.,dot(normalize(normal),normalize(vec3(-.35,.8,.4))));
 return mix(wallBase,windows.rgb*light,coverage);
}
`;
}
function legacyDiffuseFragment(existing){if(!existing.includes('vec3 sourceFacade('))throw Error('Expectedsource facade helper');return `uniform sampler2D u_source_plaster_diffuse;uniform sampler2D u_source_brick_diffuse;
uniform float u_source_plaster_ready;uniform float u_source_brick_ready;
`+existing.replace('vec3 sourceFacade(','vec3 sourceFacadeWithoutDiffuse(')+`
vec3 sourceFacade(vec3 base,vec3 p,vec3 normal,float material,float hasWindows){
 float wall=1.-smoothstep(.18,.42,abs(normal.y));
 vec2 metres=vec2(abs(normal.x)>abs(normal.z)?p.z:p.x,p.y);
 float detail=1.-smoothstep(.35,.8,max(length(fwidth(metres)),.0001));
 float roof=step(32.,v_style);float ready=0.;vec3 albedo=vec3(1.);
 if(material>.5&&material<1.5){ready=u_source_brick_ready;albedo=texture(u_source_brick_diffuse,metres/1.4).rgb;}
 else if(material<.5||(material>2.5&&material<4.5)){ready=u_source_plaster_ready;albedo=texture(u_source_plaster_diffuse,metres/2.5).rgb;}
 // Actualpixel luminance controls grain/mortar; incomingnativecolour hue is not overwritten.
 ready*=1.-roof;
 float luminance=dot(albedo,vec3(.2126,.7152,.0722));
 float reference=(material>.5&&material<1.5)?.50:.78;
 vec3 diffuse=base*clamp(luminance/reference,.65,1.30);
 vec3 beforeWindows=mix(base,diffuse,ready*wall*detail);
 return sourceFacadeWithoutDiffuse(beforeWindows,p,normal,ready>.5?0.:material,hasWindows);
}
`;}

// CommonJS transpile with resolution relative to each importing file. The
// diffuse texture runtime is unrelated to the fragment text and stays inert.
function loader(stubs={}){
 const cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const result=ts.transpileModule(fs.readFileSync(file,'utf8'),{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
  assert.deepEqual(result.diagnostics,[],file);
  const module={exports:{}};cache.set(file,module);
  new Function('exports','require','module',result.outputText)(module.exports,specifier=>{
   const target=path.resolve(path.dirname(file),specifier);
   if(Object.hasOwn(stubs,target))return stubs[target];
   for(const candidate of [target+'.ts',path.join(target,'index.ts')])if(fs.existsSync(candidate))return load(candidate);
   throw Error('Unresolved fixture module '+specifier+' from '+file);
  },module);
  return module.exports;
 }
 return load;
}
const load=loader({[src('safety','source-diffuse-texture')]:{createSourceDiffuseTexture(){throw Error('Texture runtime is outside the fragment contract');}}});
const helper=load(src('safety','facade-helper-source.ts'));
const {createResourceBudget}=load(src('safety','render-runtime','resource-budget.ts'));
const base=load(src('safety','building-surface-style.ts')).BUILDING_SURFACE_FRAGMENT_GLSL;
const LEGACY_SURFACE=legacySurfaceFragment(base),LEGACY_DIFFUSE=legacyDiffuseFragment(LEGACY_SURFACE);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const emissions=()=>helper.facadeHelperSourceStats().emissions;
const category=(budget,name)=>budget.stats.categories[name]?.bytes??0;
const settled=async promise=>{let state='pending';promise.then(()=>{state='fulfilled';},()=>{state='rejected';});await tick();return state;};
// Independent arithmetic from the actual legacy intermediate strings.
const RENAMED_SURFACE=base.replace('vec3 sourceFacade(','vec3 sourceFacadeFallback(').length,RENAMED_DIFFUSE=LEGACY_SURFACE.replace('vec3 sourceFacade(','vec3 sourceFacadeWithoutDiffuse(').length;
const RESIDENT_BYTES=2*(LEGACY_SURFACE.length+LEGACY_DIFFUSE.length);
const CONSTRUCTION_BYTES=2*(RENAMED_SURFACE+LEGACY_SURFACE.indexOf(base.slice(0,40))+RENAMED_SURFACE+RENAMED_DIFFUSE+LEGACY_DIFFUSE.indexOf(LEGACY_SURFACE.slice(0,40))+RENAMED_DIFFUSE);

test('pinned legacy outputs still hold for the actual base helper',()=>{
 assert.deepEqual([base.length,sha(base)],PINNED.base);assert.deepEqual([LEGACY_SURFACE.length,sha(LEGACY_SURFACE)],PINNED.surface);assert.deepEqual([LEGACY_DIFFUSE.length,sha(LEGACY_DIFFUSE)],PINNED.diffuse);
});

test('every family generator is the one shared emitter and stays byte-identical to the replaced implementation',()=>{
 const shared=load(src('safety','open-facade-surface-fragment.ts')).openFacadeSurfaceFragment,sharedDiffuse=load(src('safety','open-facade-diffuse.ts')).openFacadeDiffuseFragment;
 for(const family of families){
  const dir=src('painted',family,'safety'),familyBase=load(path.join(dir,'building-surface-style.ts')).BUILDING_SURFACE_FRAGMENT_GLSL;
  const {openFacadeSurfaceFragment}=load(path.join(dir,'open-facade-surface-fragment.ts')),{openFacadeDiffuseFragment}=load(path.join(dir,'open-facade-diffuse.ts'));
  assert.equal(openFacadeSurfaceFragment,shared,family+' surface helper must re-export the shared implementation');assert.equal(openFacadeDiffuseFragment,sharedDiffuse,family);
  const surface=openFacadeSurfaceFragment(familyBase),diffuse=openFacadeDiffuseFragment(surface);
  assert.equal(surface,legacySurfaceFragment(familyBase),family);assert.equal(diffuse,legacyDiffuseFragment(legacySurfaceFragment(familyBase)),family);
  assert.deepEqual([surface.length,sha(surface)],PINNED.surface,family);assert.deepEqual([diffuse.length,sha(diffuse)],PINNED.diffuse,family);
 }
 // Input text is never interpreted as a replacement pattern; only the first definition is renamed.
 for(const input of ['vec3 sourceFacade(a) $& $1 $` $\' vec3 sourceFacade(b)','\nvec3 sourceFacade(\n','x'.repeat(4097)+'vec3 sourceFacade('+'y'.repeat(17)]){
  assert.equal(shared(input),legacySurfaceFragment(input));assert.equal(sharedDiffuse(input),legacyDiffuseFragment(input));assert.equal(sharedDiffuse(shared(input)),legacyDiffuseFragment(legacySurfaceFragment(input)));
 }
 assert.throws(()=>shared('void main(){}'),{message:'Expected source material facade function'});assert.throws(()=>legacySurfaceFragment('void main(){}'),{message:'Expected source material facade function'});
 assert.throws(()=>sharedDiffuse('void main(){}'),{message:'Expectedsource facade helper'});assert.throws(()=>legacyDiffuseFragment('void main(){}'),{message:'Expectedsource facade helper'});
});

test('exact bounds come from the template descriptors without emitting either helper',()=>{
 const before=emissions(),bounds=helper.describeFacadeHelperSource(base);
 assert.deepEqual(emissions(),before,'describing a bound must not emit text');
 assert.equal(bounds.baseCharacters,base.length);assert.equal(bounds.surfaceCharacters,LEGACY_SURFACE.length);assert.equal(bounds.diffuseCharacters,LEGACY_DIFFUSE.length);
 assert.equal(bounds.residentBytes,RESIDENT_BYTES);assert.equal(bounds.constructionBytes,CONSTRUCTION_BYTES);assert.equal(bounds.residentCharacters,LEGACY_SURFACE.length+LEGACY_DIFFUSE.length);
 for(const input of ['vec3 sourceFacade(','a vec3 sourceFacade( b vec3 sourceFacade( c',base+base]){
  assert.equal(helper.facadeHelperCharacters(helper.OPEN_FACADE_SURFACE_HELPER,input.length),legacySurfaceFragment(input).length);
  assert.equal(helper.facadeHelperCharacters(helper.OPEN_FACADE_DIFFUSE_HELPER,input.length),legacyDiffuseFragment(input).length);
 }
 assert.throws(()=>helper.describeFacadeHelperSource('void main(){}'),{message:'Expected source material facade function'});assert.deepEqual(emissions(),before);
});

test('admission reserves resident text and generation scratch before emitting, then keeps only the resident claim',async()=>{
 const budget=createResourceBudget({limitBytes:1024**2}),calls=[],reserve=budget.tryReserve.bind(budget);
 budget.tryReserve=(costs,options)=>{calls.push({costs,emissions:emissions()});return reserve(costs,options);};
 const before=emissions(),lease=await helper.acquireFacadeHelperSource({budget,baseSurfaceFragment:base,owner:'fixture'});
 assert.equal(calls.length,1);assert.deepEqual(calls[0].emissions,before,'nothing may be emitted before admission');
 const byCategory=Object.fromEntries(calls[0].costs.map(cost=>[cost.category,cost.bytes]));assert.deepEqual(byCategory,{'program-source':RESIDENT_BYTES,construction:CONSTRUCTION_BYTES});
 assert.deepEqual(emissions(),{surface:before.surface+1,diffuse:before.diffuse+1});
 assert.equal(lease.surfaceFragment,LEGACY_SURFACE);assert.equal(lease.diffuseFragment,LEGACY_DIFFUSE);
 assert.equal(category(budget,'program-source'),RESIDENT_BYTES);assert.equal(category(budget,'construction'),0);assert.equal(budget.stats.reservations,1);
 assert.deepEqual(helper.facadeHelperSourceStats(budget).entries.map(row=>[row.state,row.leases,row.owners,row.reservedBytes]),[['ready',1,['fixture'],RESIDENT_BYTES]]);
 lease.release();lease.release();
 assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.reservations,0);assert.deepEqual(helper.facadeHelperSourceStats(budget).entries,[]);
 assert.throws(()=>lease.surfaceFragment,/released/);assert.equal(lease.released,true);
});

test('seven leases share one emission; only the last release drops the text and returns the budget',async()=>{
 const budget=createResourceBudget({limitBytes:1024**2}),before=emissions();
 const leases=await Promise.all(families.map(owner=>helper.acquireFacadeHelperSource({budget,baseSurfaceFragment:base,owner})));
 assert.deepEqual(emissions(),{surface:before.surface+1,diffuse:before.diffuse+1},'S(B) once and D reuses it');
 for(const lease of leases){assert.equal(lease.surfaceFragment,LEGACY_SURFACE);assert.equal(lease.diffuseFragment,LEGACY_DIFFUSE);}
 assert.equal(category(budget,'program-source'),RESIDENT_BYTES);
 leases[0].release();leases[0].release();for(const lease of leases.slice(1,-1))lease.release();
 assert.equal(category(budget,'program-source'),RESIDENT_BYTES,'a repeated release cannot drop text other managers hold');
 assert.deepEqual(helper.facadeHelperSourceStats(budget).entries.map(row=>[row.leases,row.owners]),[[1,['delegated500']]]);
 leases.at(-1).release();assert.equal(budget.stats.bytes,0);assert.deepEqual(helper.facadeHelperSourceStats(budget).entries,[]);
 const again=await helper.acquireFacadeHelperSource({budget,baseSurfaceFragment:base});assert.deepEqual(emissions(),{surface:before.surface+2,diffuse:before.diffuse+2},'dropped text is regenerated, never cached outside the budget');again.release();
});

test('a short budget waits on availability without timers; cancelling one waiter keeps the shared wait',async()=>{
 const budget=createResourceBudget({limitBytes:64*1024}),blocker=budget.reserve({category:'packed',bytes:64*1024-1024,precision:'exact'});
 const timers={count:0},original={setTimeout:globalThis.setTimeout,setInterval:globalThis.setInterval};
 globalThis.setTimeout=(...args)=>{timers.count++;return original.setTimeout(...args);};globalThis.setInterval=(...args)=>{timers.count++;return original.setInterval(...args);};
 try{
  const before=emissions(),first=new AbortController(),second=new AbortController();
  const a=helper.acquireFacadeHelperSource({budget,baseSurfaceFragment:base,signal:first.signal,owner:'a'}),b=helper.acquireFacadeHelperSource({budget,baseSurfaceFragment:base,signal:second.signal,owner:'b'});
  const rejectedA=assert.rejects(a,{name:'AbortError'});
  assert.equal(await settled(b),'pending');assert.deepEqual(emissions(),before);assert.equal(budget.stats.availabilityListeners,1);
  let row=helper.facadeHelperSourceStats(budget).entries[0];assert.deepEqual([row.state,row.waiters,row.waitingOwners,row.waitingForBudget,row.reservedBytes],['waiting',2,['a','b'],true,0]);assert(row.lastPressure&&row.lastPressure.capacity===64*1024);
  first.abort();await rejectedA;row=helper.facadeHelperSourceStats(budget).entries[0];assert.deepEqual([row.state,row.waiters],['waiting',1]);assert.equal(budget.stats.availabilityListeners,1);
  blocker.release();const lease=await b;
  assert.equal(timers.count,0,'waiting must not create a polling timer');assert.equal(budget.stats.availabilityListeners,0);
  assert.deepEqual(emissions(),{surface:before.surface+1,diffuse:before.diffuse+1});assert.equal(lease.diffuseFragment,LEGACY_DIFFUSE);
  lease.release();assert.equal(budget.stats.bytes,0);
 }finally{globalThis.setTimeout=original.setTimeout;globalThis.setInterval=original.setInterval;}
});

test('when every waiter leaves, unadmitted work is cancelled and never emitted later',async()=>{
 const budget=createResourceBudget({limitBytes:64*1024}),blocker=budget.reserve({category:'packed',bytes:64*1024-1024,precision:'exact'}),before=emissions(),controller=new AbortController();
 const pending=helper.acquireFacadeHelperSource({budget,baseSurfaceFragment:base,signal:controller.signal}),rejected=assert.rejects(pending,{name:'AbortError'});
 await tick();controller.abort();await rejected;
 assert.deepEqual(helper.facadeHelperSourceStats(budget).entries,[]);assert.equal(budget.stats.availabilityListeners,0);
 blocker.release();await tick();await tick();assert.deepEqual(emissions(),before);assert.equal(budget.stats.bytes,0);
});

test('a helper above the total page capacity is reported unfit instead of waiting forever',async()=>{
 for(const limitBytes of [RESIDENT_BYTES-1,RESIDENT_BYTES+CONSTRUCTION_BYTES-1]){
  const budget=createResourceBudget({limitBytes,recentLimitBytes:0}),before=emissions();
  await assert.rejects(helper.acquireFacadeHelperSource({budget,baseSurfaceFragment:base}),error=>error.name==='FacadeHelperSourceUnfitError'&&error.code==='FACADE_HELPER_SOURCE_UNFIT'&&error.requiredBytes===RESIDENT_BYTES+CONSTRUCTION_BYTES&&error.capacityBytes===limitBytes);
  assert.equal(budget.stats.availabilityListeners,0);assert.equal(budget.stats.reservations,0);assert.deepEqual(helper.facadeHelperSourceStats(budget).entries,[]);assert.deepEqual(emissions(),before);
 }
 const exact=createResourceBudget({limitBytes:RESIDENT_BYTES+CONSTRUCTION_BYTES,recentLimitBytes:0}),lease=await helper.acquireFacadeHelperSource({budget:exact,baseSurfaceFragment:base});assert.equal(category(exact,'program-source'),RESIDENT_BYTES);lease.release();assert.equal(exact.stats.bytes,0);
});

test('an invalid base, a missing budget or an aborted signal never reserves or emits',async()=>{
 const budget=createResourceBudget({limitBytes:1024**2}),before=emissions(),controller=new AbortController();controller.abort();
 await assert.rejects(helper.acquireFacadeHelperSource({budget,baseSurfaceFragment:'void main(){}'}),{message:'Expected source material facade function'});
 await assert.rejects(helper.acquireFacadeHelperSource({budget,baseSurfaceFragment:base,signal:controller.signal}),{name:'AbortError'});
 await assert.rejects(helper.acquireFacadeHelperSource({budget:undefined,baseSurfaceFragment:base}),TypeError);
 assert.equal(budget.stats.reservations,0);assert.equal(budget.stats.pressureEvents,0);assert.deepEqual(emissions(),before);
});

// Actual manager source: the renderer-creation branch of ensure() and the
// returned destroy(). Only modules, map and renderer are fixtures.
const managers=new Map();
for(const family of families){
 const file=src('painted',family,'safety','three-dimensional-map.ts'),ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);assert.equal(ast.parseDiagnostics.length,0,family);
 const nodes=[];(function visit(node){nodes.push(node);ts.forEachChild(node,visit);})(ast);
 const install=nodes.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='installThreeDimensionalMap'),ensure=nodes.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='ensure');
 const returned=install.body.statements.findLast(node=>ts.isReturnStatement(node)&&node.expression&&ts.isObjectLiteralExpression(node.expression));
 const destroy=returned.expression.properties.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(ast)==='destroy');assert(ensure&&destroy,family);
 const branch=ensure.body.statements[0];assert(ts.isIfStatement(branch)&&branch.expression.getText(ast)==='!renderer',family+' renderer creation branch');
 const compile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 managers.set(family,{ensure:compile('return (async()=>{'+branch.getText(ast).replaceAll(/import\('([^']+)'\)/g,(_all,name)=>'loadModule('+JSON.stringify(name)+')')+'})();'),destroy:compile('return ({'+destroy.getText(ast)+'}).destroy;')});
}
const inert=new Proxy(function(){},{get:(_target,key)=>key===Symbol.toPrimitive?()=>0:key==='then'?undefined:inert,apply:()=>inert,construct:()=>inert});
// ensure() names must exist (a wrong budget binding fails loudly); destroy()'s
// unrelated manager cleanup calls are inert.
const scope=(values,strict)=>new Proxy(values,{has:()=>true,get:(target,key)=>{if(key===Symbol.unscopables)return undefined;if(key in target)return target[key];if(key in globalThis)return globalThis[key];if(strict)throw new ReferenceError('Missing manager fixture binding: '+String(key));return inert;},set:(target,key,value)=>(target[key]=value,true)});
// importGate holds every ensure() import; separateRequest gives destroy() its own
// request controller, so only the manager's destroyed flag can stop ensure().
function manager(family,budget,{failCreate=false,acquire=helper.acquireFacadeHelperSource,importGate,separateRequest=false,removeLayerThrows=false,rendererDestroyThrows=false}={}){
 const events=[],controller=new AbortController(),familyStyle=load(src('painted',family,'safety','building-surface-style.ts'));let received;
 const renderer={layer:{id:'fixture-'+family},destroy(){events.push(['renderer.destroy',category(budget,'program-source')]);if(rendererDestroyThrows)throw Error('fixture renderer teardown failed');}};
 const modules={
  './building-mesh-renderer':{createBuildingMeshRenderer(_map,_city,options){events.push(['create',category(budget,'program-source'),category(budget,'construction')]);if(failCreate)throw Error('fixture renderer construction failed');received=options;return renderer;}},
  './building-surface-style':familyStyle,
  './open-facade-window-texture':{createOpenFacadeWindowTexture:()=>({fixture:'window'})},
  '../../../safety/facade-helper-source':{...helper,acquireFacadeHelperSource:acquire},
  './open-facade-diffuse':{neutralSchematicFacadeStyle:(_raw,style)=>style,createOpenFacadeDiffuse:()=>({fixture:'diffuse'})},
 };
 const values={loadModule:async name=>{if(importGate)await importGate;if(!Object.hasOwn(modules,name))throw Error(family+' ensure imports unexpected module '+name);return modules[name];},signal:controller.signal,destroyed:false,renderer:undefined,facadeHelpers:undefined,city:'berlin',mobile:false,matchMedia:()=>({matches:false}),
  options:{},resources:{budget},resourceStore:{budget},readBinaryAsset:async()=>new Uint8Array(),sourceLeafByFeature:new WeakMap(),ownerProfileByComponent:new WeakMap(),ownerRuntime:undefined,manifest:undefined,request:separateRequest?new AbortController():controller,
  map:{getStyle:()=>({layers:[]}),addLayer(layer){events.push(['addLayer',layer.id]);},getLayer:()=>true,removeLayer(id){events.push(['removeLayer',id]);if(removeLayerThrows)throw Error('fixture map already removed');},off(){},triggerRepaint(){}}};
 const {ensure,destroy}=managers.get(family);
 return{events,controller,values,get received(){return received;},ensure:()=>new Function('env','with(env){'+ensure+'}')(scope(values,true)),destroy:()=>new Function('env','with(env){'+destroy+'}')(scope(values,false))()};
}

test('all seven managers lease the shared helper before renderer creation and release it only after renderer destroy',async()=>{
 const budget=createResourceBudget({limitBytes:1024**2}),before=emissions(),all=families.map(family=>manager(family,budget));
 for(const [i,m] of all.entries()){
  await m.ensure();const family=families[i];
  assert.equal(m.received.surfaceFragment,LEGACY_SURFACE,family);assert.equal(m.received.diffuseFragment,LEGACY_DIFFUSE,family);assert.equal(m.received.baseSurfaceFragment,base,family);
  assert.deepEqual(m.events[0],['create',RESIDENT_BYTES,0],family+' renderer receives text already charged as resident program source');assert.deepEqual(m.events[1],['addLayer','fixture-'+family]);
 }
 assert.deepEqual(emissions(),{surface:before.surface+1,diffuse:before.diffuse+1});assert.equal(category(budget,'program-source'),RESIDENT_BYTES);
 assert.deepEqual(helper.facadeHelperSourceStats(budget).entries[0].owners,families.map(family=>family+':berlin'));
 for(const [i,m] of all.entries()){
  m.destroy();m.destroy();
  assert.deepEqual(m.events.slice(-2),[['removeLayer','fixture-'+families[i]],['renderer.destroy',RESIDENT_BYTES]],'the lease outlives renderer destroy');
  assert.equal(category(budget,'program-source'),i===all.length-1?0:RESIDENT_BYTES,families[i]);
 }
 assert.equal(budget.stats.bytes,0);assert.deepEqual(helper.facadeHelperSourceStats(budget).entries,[]);
});

test('each manager ensure aborted while waiting for budget creates nothing and leaves no claim',async()=>{
 for(const family of families){
  const budget=createResourceBudget({limitBytes:64*1024}),blocker=budget.reserve({category:'packed',bytes:64*1024-1024,precision:'exact'}),before=emissions(),m=manager(family,budget);
  const running=m.ensure(),rejected=assert.rejects(running,{name:'AbortError'});
  assert.equal(await settled(running),'pending',family);assert.equal(budget.stats.availabilityListeners,1,family);
  m.controller.abort();assert.equal(await settled(running),'rejected',family+' abort must end the budget wait');await rejected;blocker.release();await tick();await tick();
  assert.deepEqual(m.events,[],family);assert.equal(m.received,undefined,family);assert.deepEqual(emissions(),before,family);assert.equal(budget.stats.bytes,0,family);assert.equal(budget.stats.availabilityListeners,0,family);
 }
});

test('each manager releases a granted lease when ensure is aborted before creation or renderer creation fails',async()=>{
 for(const family of families){
  const budget=createResourceBudget({limitBytes:1024**2});let late;
  const aborted=manager(family,budget,{acquire:options=>{const pending=helper.acquireFacadeHelperSource(options);late.controller.abort();return pending;}});late=aborted;
  await assert.rejects(aborted.ensure(),{name:'AbortError'});assert.deepEqual(aborted.events,[],family);assert.equal(budget.stats.bytes,0,family);
  const failed=manager(family,budget,{failCreate:true});
  await assert.rejects(failed.ensure(),{message:'fixture renderer construction failed'});assert.deepEqual(failed.events,[['create',RESIDENT_BYTES,0]],family);
  assert.equal(budget.stats.bytes,0,family+' failed construction returns the helper claim');assert.deepEqual(helper.facadeHelperSourceStats(budget).entries,[],family);
  failed.destroy();assert.equal(budget.stats.bytes,0,family);
 }
});

// The paths below never await a promise a regression could leave pending; each
// one checks settlement after a macrotask first, so a broken path fails instead of hanging.
test('each manager destroyed while ensure waits for budget ends the wait, creates nothing and leaves no claim',async()=>{
 for(const family of families){
  const budget=createResourceBudget({limitBytes:64*1024}),blocker=budget.reserve({category:'packed',bytes:64*1024-1024,precision:'exact'}),before=emissions(),m=manager(family,budget);
  const running=m.ensure();
  assert.equal(await settled(running),'pending',family);assert.equal(budget.stats.availabilityListeners,1,family);
  m.destroy();
  assert.equal(await settled(running),'rejected',family+' destroy must end the budget wait');await assert.rejects(running,{name:'AbortError'});
  assert.equal(budget.stats.availabilityListeners,0,family);assert.deepEqual(helper.facadeHelperSourceStats(budget).entries,[],family);
  blocker.release();await tick();await tick();
  assert.deepEqual(m.events,[],family);assert.equal(m.received,undefined,family);assert.deepEqual(emissions(),before,family);assert.equal(budget.stats.bytes,0,family);
 }
});

test('each manager ensure stopped during its module imports never reserves or emits',async()=>{
 for(const family of families){
  // An aborted request, then destroy() with an unrelated request so only the destroyed flag can stop it.
  for(const [stop,separateRequest,expected] of [[m=>m.controller.abort(),false,{name:'AbortError'}],[m=>m.destroy(),true,{message:'3D destroyed'}]]){
   let open;const gate=new Promise(resolve=>{open=resolve;});
   const budget=createResourceBudget({limitBytes:1024**2}),before=emissions(),m=manager(family,budget,{importGate:gate,separateRequest});
   const running=m.ensure();assert.equal(await settled(running),'pending',family);
   stop(m);open();
   assert.equal(await settled(running),'rejected',family);await assert.rejects(running,expected,family);
   assert.deepEqual(m.events,[],family);assert.deepEqual(emissions(),before,family);
   assert.equal(budget.stats.reservations,0,family);assert.equal(budget.stats.pressureEvents,0,family);assert.deepEqual(helper.facadeHelperSourceStats(budget).entries,[],family);
  }
 }
});

test('each manager destroyed after admission but before renderer creation returns the claim',async()=>{
 for(const family of families){
  for(const separateRequest of [false,true]){
   const budget=createResourceBudget({limitBytes:1024**2});let m;
   m=manager(family,budget,{separateRequest,acquire:options=>{const pending=helper.acquireFacadeHelperSource(options);m.destroy();return pending;}});
   const running=m.ensure();
   assert.equal(await settled(running),'rejected',family);await assert.rejects(running,separateRequest?{message:'3D destroyed'}:{name:'AbortError'},family);
   assert.deepEqual(m.events,[],family);assert.equal(m.received,undefined,family);assert.equal(m.values.facadeHelpers,undefined,family);
   assert.equal(budget.stats.bytes,0,family);assert.deepEqual(helper.facadeHelperSourceStats(budget).entries,[],family);
  }
 }
});

// A teardown that throws may leave the renderer alive (still a map layer, or
// half destroyed) and holding both helper strings, so the claim is not
// returned optimistically. destroy() is single-shot; the claim stays visible
// under its owner instead of the ledger undercounting live text.
test('a renderer teardown that throws keeps the helper claim charged and visible under its owner',async()=>{
 for(const family of families){
  for(const failure of ['removeLayer','renderer.destroy']){
   const budget=createResourceBudget({limitBytes:1024**2}),before=emissions();
   const failing=manager(family,budget,{removeLayerThrows:failure==='removeLayer',rendererDestroyThrows:failure==='renderer.destroy'}),healthy=manager(family,budget);
   await failing.ensure();await healthy.ensure();
   const lease=failing.values.facadeHelpers;assert(lease&&!lease.released,family);
   assert.throws(()=>failing.destroy(),{message:failure==='removeLayer'?'fixture map already removed':'fixture renderer teardown failed'},family);
   assert.equal(failing.events.some(event=>event[0]==='renderer.destroy'),failure==='renderer.destroy',family+': a removeLayer failure still skips renderer destroy');
   assert.equal(failing.values.facadeHelpers,lease,family);assert.equal(lease.released,false,family);
   healthy.destroy();
   assert.equal(category(budget,'program-source'),RESIDENT_BYTES,family+' '+failure+': text the renderer may hold stays charged');
   assert.deepEqual(helper.facadeHelperSourceStats(budget).entries.map(row=>[row.state,row.leases,row.owners,row.reservedBytes]),[['ready',1,[family+':berlin'],RESIDENT_BYTES]],family);
   failing.destroy();assert.equal(category(budget,'program-source'),RESIDENT_BYTES,family+': destroy is single-shot');
   assert.equal(lease.diffuseFragment,LEGACY_DIFFUSE,family);assert.deepEqual(emissions(),{surface:before.surface+1,diffuse:before.diffuse+1},family);
   lease.release();assert.equal(budget.stats.bytes,0,family);assert.deepEqual(helper.facadeHelperSourceStats(budget).entries,[],family);
  }
 }
});
