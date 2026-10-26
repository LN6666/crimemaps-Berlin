import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const web=fileURLToPath(new URL('../',import.meta.url));
const dependencies=process.env.CRIMEMAPS_TEST_DEPENDENCY_ROOT??path.join(web,'node_modules');
const require=createRequire(path.join(dependencies,'maplibre-gl/package.json'));
const ts=require('typescript');
const library=path.join(dependencies,'maplibre-gl');
const [helperText,mapText,styleText,mainText]=await Promise.all([
  fs.readFile(path.join(web,'src/safety/initial-style-recovery.ts'),'utf8'),
  fs.readFile(path.join(library,'src/ui/map.ts'),'utf8'),
  fs.readFile(path.join(library,'src/style/style.ts'),'utf8'),
  fs.readFile(path.join(web,'src/safety/main.ts'),'utf8'),
]);
const transpile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {installInitialStyleRecovery}=await import('data:text/javascript;base64,'+Buffer.from(transpile(helperText)).toString('base64'));

// Execute the installed library's actual loss/restore, style snapshot and
// deferred loadJSON/serialize method bodies. Only DOM, GL, frame scheduling and
// completed style construction are fixture boundaries; no real GPU is involved.
function method(source,name,bindings={}){
  const ast=ts.createSourceFile('library.ts',source,ts.ScriptTarget.Latest,true);
  let member;
  function walk(node){
    if((ts.isMethodDeclaration(node)||ts.isPropertyDeclaration(node))&&node.name?.getText(ast)===name){assert.equal(member,undefined,'one library method '+name);member=node;}
    ts.forEachChild(node,walk);
  }
  walk(ast);assert.ok(member,'library method exists: '+name);
  const fn=ts.isMethodDeclaration(member)?member:member.initializer;
  assert.ok(fn.body&&fn.parameters);
  const code=transpile(`function extracted(${fn.parameters.map(p=>p.getText(ast)).join(',')})${fn.body.getText(ast)}`);
  return Function(...Object.keys(bindings),code+'; return extracted;')(...Object.values(bindings));
}
class ContextEvent{constructor(type,detail={}){this.type=type;Object.assign(this,detail);}}
const getStyleAndImages=method(mapText,'_getStyleAndImages');
const contextLost=method(mapText,'_contextLost',{MapContextEvent:ContextEvent});
const contextRestored=method(mapText,'_contextRestored',{MapContextEvent:ContextEvent,ErrorEvent:class{constructor(error){this.type='error';this.error=error;}}});
const serialize=method(styleText,'serialize',{
  mapObject:(object,fn)=>Object.fromEntries(Object.entries(object).map(([k,v])=>[k,fn(v)])),
  filterObject:(object,fn)=>Object.fromEntries(Object.entries(object).filter(([,v])=>fn(v))),
});
const initial=()=>({version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#edf1ed'}}]});
function fixture(){
  const handlers=new Map(),frames=[],calls=[],events=[],errors=[];
  let didLoad=false;
  const loadJSON=method(styleText,'loadJSON',{MapStyleDataEvent:ContextEvent,browser:{frameAsync:signal=>new Promise((resolve,reject)=>frames.push(()=>signal.signal.aborted?reject(signal.signal.reason):resolve()))}});
  const map={style:null,_frameRequest:null,_lostContextStyle:{style:null,images:null},calls,events,errors,
    on(type,fn){const set=handlers.get(type)??new Set();set.add(fn);handlers.set(type,set);return this;},
    off(type,fn){handlers.get(type)?.delete(fn);return this;},
    fire(event){events.push(event.type);if(event.type==='error')errors.push(event.error);for(const fn of [...handlers.get(event.type)??[]])fn(event);return this;},
    count(type){return handlers.get(type)?.size??0;},
    painter:{destroy(){}},_setupPainter(){},resize(){},_update(){},_resizeInternal(){},getTerrain(){return null;},
    _getStyleAndImages(){return getStyleAndImages.call(this);},
    setStyle(json,options){calls.push({json,options});this.style=createStyle(json);return this;},
    lose(){contextLost.call(this,{preventDefault(){}});},
    restore(){contextRestored.call(this,{});},
    async flush({load=true}={}){for(const run of frames.splice(0))run();await Promise.resolve();await Promise.resolve();if(load&&!didLoad&&this.style?._loaded){didLoad=true;this.fire(new ContextEvent('load'));}},
  };
  function createStyle(json){
    const style={_loaded:false,_layers:{},_order:[],tileManagers:{},imageManager:{images:{},cloneImages(){return{};}},map,stylesheet:undefined,_frameRequest:null,
      fire(){},_serializeByIds(){return this.stylesheet.layers;},serialize(){return serialize.call(this);},
      _load(value){this._loaded=true;this.stylesheet={...value};map.fire(new ContextEvent('style.load'));},
      destroy(){this._frameRequest?.abort();},
    };
    loadJSON.call(style,json);return style;
  }
  map.style=createStyle(initial());return map;
}
function install(map,source=initial()){return installInitialStyleRecovery(map,source,error=>map.errors.push(error));}
const eventNames=['webglcontextlost','webglcontextrestored','load','remove'];

test('negative control: actual native serialize/loss/restore leaves pre-load style absent',async()=>{
  const map=fixture();assert.equal(map.style.serialize(),undefined);
  map.lose();assert.equal(map._lostContextStyle.style,undefined);map.restore();await map.flush();
  assert.equal(map.style,null);assert.equal(map.calls.length,0);assert.ok(!map.events.includes('load'));
});

test('pre-load loss restores initial backup once, then the ordinary load runs once',async()=>{
  const map=fixture(),backup=initial(),expected=structuredClone(backup);install(map,backup);
  backup.layers[0].paint['background-color']='#000000';let initializations=0;
  map.on('load',()=>initializations++);
  map.lose();map.restore();map.fire(new ContextEvent('webglcontextrestored'));
  assert.equal(map.calls.length,1);assert.deepEqual(map.calls[0],{json:expected,options:{diff:false}});
  await map.flush();await map.flush();
  assert.equal(initializations,1);assert.equal(map.count('webglcontextlost'),0);assert.equal(map.count('webglcontextrestored'),0);assert.equal(map.count('remove'),0);
  assert.equal(map.errors.length,0);
});

test('native restore of an already serializable style is not replaced while its new style is pending',async()=>{
  const map=fixture();install(map);await map.flush({load:false});assert.ok(map.style.serialize());
  map.lose();map.restore();assert.equal(map.calls.length,1,'only native setStyle');
  assert.equal(map.style.serialize(),undefined,'native restoration is pending and must not be overwritten');
  await map.flush();assert.equal(map.calls.length,1);
});

test('an existing replacement style object is never overwritten even before it can serialize',()=>{
  const map=fixture(),replacement={version:8,sources:{},layers:[]};
  map.on('webglcontextrestored',()=>map.setStyle(replacement,{diff:false}));install(map);
  map.lose();map.restore();assert.equal(map.calls.length,1);assert.equal(map.calls[0].json,replacement);assert.equal(map.style.serialize(),undefined);
});

test('after first load the helper retires and does not handle later context events',async()=>{
  const map=fixture();install(map);await map.flush();
  for(const name of eventNames)assert.equal(map.count(name),0);
  map.style=null;map.fire(new ContextEvent('webglcontextlost'));map.fire(new ContextEvent('webglcontextrestored'));assert.equal(map.calls.length,0);
});

test('explicit destroy and map remove clean all listeners and pending fallback work',()=>{
  for(const remove of [false,true]){
    const map=fixture(),handle=install(map);map.lose();
    if(remove)map.fire(new ContextEvent('remove'));else handle.destroy();handle.destroy();
    for(const name of eventNames)assert.equal(map.count(name),0);
    map.restore();assert.equal(map.calls.length,0);
  }
});

test('repeated valid loss cycles before the first load rearm once per cycle, not per restored event',async()=>{
  const map=fixture();install(map);
  map.fire(new ContextEvent('webglcontextrestored'));assert.equal(map.calls.length,0,'no known loss');
  for(let i=0;i<2;i++){
    map.lose();map.restore();map.fire(new ContextEvent('webglcontextrestored'));assert.equal(map.calls.length,i+1);
  }
  await map.flush();assert.equal(map.style._loaded,true);assert.equal(map.errors.length,0);
});

test('a failed setStyle reports once and does not spin on duplicate restored events',()=>{
  const map=fixture();install(map);map.lose();let attempts=0;
  map.setStyle=()=>{attempts++;throw Error('fixture style failure');};
  map.restore();map.fire(new ContextEvent('webglcontextrestored'));
  assert.equal(attempts,1);assert.equal(map.errors.length,1);assert.match(map.errors[0].message,/fixture style failure/);
});

test('main wires the guard immediately after construction, before the sole initial load callback',()=>{
  const create=mainText.indexOf('map = new maplibregl.Map({'),guard=mainText.indexOf('installInitialStyleRecovery(map,initialMapStyle,'),load=mainText.indexOf('map.once("load", async () => {');
  assert.ok(create>=0&&guard>create&&load>guard);assert.equal(mainText.split('map.once("load", async () => {').length-1,1);
  assert.match(mainText.slice(create,guard),/style: initialMapStyle,/);
  assert.ok(!helperText.includes("map.fire('load'"));
});
