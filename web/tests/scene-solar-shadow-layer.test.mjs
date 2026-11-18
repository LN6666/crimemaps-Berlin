import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,transform} from 'esbuild';
import {createRequire} from 'node:module';
import {balancedBlock,orderedFragments} from './support/fixtures-solar-texture-env-ts-modules.mjs';
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const ts=createRequire(path.resolve(safety,'../../package.json'))('typescript');
// balancedBlock scans text: it takes the first occurrence of its marker and does
// not recognise regular-expression literals, so a brace inside one would shift
// the block. parsedBlock also requires the marker to occur exactly once and the
// scanned block to be the very block the TypeScript parser sees there, so a
// duplicated marker or such a brace fails here instead of silently slicing
// another body.
function parsedBlock(tree,marker){
 assert.equal(tree.text.split(marker).length-1,1,`source marker occurs exactly once: ${marker}`);
 const block=balancedBlock(tree.text,marker);let node=tree;
 while(!(ts.isBlock(node)&&node.getStart(tree)===block.open)){
  node=ts.forEachChild(node,child=>child.pos<=block.open&&block.open<child.end?child:undefined);
  assert.ok(node,`a parsed block starts at the brace after ${marker}`);
 }
 assert.equal(node.end,block.end,`the parsed block after ${marker} ends where the text scan ends`);
 return{...block,node};
}
// The observed core mirrors the current core surface, including needsFrame:
// a pending capture asks for a follow-up frame only while the core needs one.
const bundle=await build({entryPoints:[path.join(safety,'scene-solar-shadow-layer.ts')],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'core-observer',setup(b){b.onResolve({filter:/^\.\/scene-solar-shadow$/},()=>({path:'core',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export function createSceneSolarShadow(options){const log=globalThis.__solarLayerFixture;log.created.push(options);let source;return{setSource(value){source=value;log.sources.push(value);},capture(gl,settings){log.captures.push({gl,settings,revision:source.getPlanarReflectionRevision()});if(log.fail)throw Error('fixture capture');return log.result;},resetGPU(){log.resets++;},destroy(){log.destroyed++;},get needsFrame(){return log.needsFrame;},get stats(){return{fixture:true};}}}` }));}}]});
const {installSceneSolarShadowLayer}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const solarBundle=await build({entryPoints:[path.join(safety,'scene-solar-light.ts')],bundle:true,write:false,platform:'node',format:'esm'});
const {sceneSolarLight}=await import('data:text/javascript;base64,'+Buffer.from(solarBundle.outputFiles[0].text).toString('base64'));
const initial={instantISO:'2026-06-21T12:00:00+02:00',sunlight:true,shadows:true,motion:true,quality:'balanced'};
function fixture(){
 const log={created:[],sources:[],captures:[],resets:0,destroyed:0,fail:false,needsFrame:true};globalThis.__solarLayerFixture=log;
 const events=new Map(),layers=new Map();let loaded=true,available=true,adds=0,repaints=0,revision='native1',light=sceneSolarLight(13.4,52.5,initial.instantISO);
 const emit=name=>{for(const fn of [...events.get(name)??[]])fn();};
 const map={getCenter:()=>({lng:13.4,lat:52.5}),isStyleLoaded:()=>loaded,getLayer:id=>layers.get(id),addLayer(layer){adds++;emit('styledata');layers.set(layer.id,layer);layer.onAdd?.();},removeLayer(id){const layer=layers.get(id);layers.delete(id);layer?.onRemove?.();emit('styledata');},on(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},off(name,fn){events.get(name)?.delete(fn);},triggerRepaint(){repaints++;}};
 const source={getPlanarReflectionRevision:()=>revision,renderPlanarReflection:()=>({triangles:0,draws:0,complete:true})};
 const owner=installSceneSolarShadowLayer({map,source,initial,solarLight:()=>light,mobile:true,available:()=>available}),gl={createVertexArray(){}};
 return{owner,map,source,log,gl,events,layers,emit,get adds(){return adds;},get repaints(){return repaints;},setLoaded:v=>loaded=v,setAvailable:v=>available=v,setRevision:v=>revision=v,setLight:v=>light=v,frame(){owner.customLayer?.prerender(gl);}};
}
test('only eligible prerender captures; initial2D and render never allocate GPU/core, source remains live',()=>{
 const f=fixture();try{assert.equal(f.owner.customLayer,undefined);assert.equal(f.adds,0);assert.equal(f.log.created.length,0);f.owner.setMode(true);assert.equal(f.adds,1);assert.equal(f.log.created.length,0);f.owner.customLayer.render();assert.equal(f.log.captures.length,0);f.frame();assert.equal(f.log.created.length,1);assert.equal(f.log.sources[0],f.source);assert.equal(f.log.captures.length,1);assert.equal(f.log.captures[0].settings.enabled,true);assert.equal(f.log.captures[0].settings.quality,'economy');assert.ok(f.log.captures[0].settings.direction[1]>Math.sin(.5*Math.PI/180));f.setRevision('dedicated2+native3');f.frame();assert.equal(f.log.captures[1].revision,'dedicated2+native3');assert.equal(f.log.sources.length,1);assert.equal(f.owner.customLayer.renderingMode,'3d');}finally{f.owner.destroy();}
});
test('hidden, unavailable, suspended,2D, night, sunlight-off and shadow-off forbid capture and reset publication',()=>{
 const f=fixture();try{f.owner.setMode(true);f.frame();const count=()=>f.log.captures.length;let n=count();
  f.owner.setPageHidden(true);f.frame();assert.equal(count(),n);f.emit('styledata');assert.equal(f.adds,1);f.owner.setPageHidden(false);f.frame();n=count();
  f.setAvailable(false);f.frame();assert.equal(count(),n);f.setAvailable(true);f.owner.suspend();f.frame();assert.equal(count(),n);f.owner.resume();f.frame();n=count();
  for(const state of [{...initial,sunlight:false},{...initial,shadows:false},{...initial,instantISO:'2026-06-21T00:00:00+02:00'}]){const resets=f.log.resets;f.owner.setSceneEnvironment(state);f.frame();assert.equal(count(),n);assert.ok(f.log.resets>resets);}
  f.owner.setSceneEnvironment({...initial,quality:'economy'});f.frame();assert.equal(f.log.captures.at(-1).settings.quality,'economy');n=count();f.owner.setMode(false);f.frame();assert.equal(count(),n);assert.equal(f.owner.customLayer,undefined);
 }finally{f.owner.destroy();}
});
test('ordinary style reload readds only its layer, is reentrant, and central context registration stays idempotent',()=>{
 const f=fixture();try{f.owner.setMode(true);f.frame();const creates=f.log.created.length,resets=f.log.resets,layer=f.owner.customLayer;f.setLoaded(false);f.map.removeLayer(layer.id);assert.ok(f.log.resets>resets);f.emit('styledata');assert.equal(f.adds,1);f.setLoaded(true);f.emit('style.load');assert.equal(f.adds,2);assert.equal(f.log.created.length,creates);f.frame();assert.equal(f.log.captures.length,2);
  f.setAvailable(false);f.owner.suspend();f.map.removeLayer(layer.id);f.emit('style.load');assert.equal(f.adds,2);f.setAvailable(true);f.map.addLayer(f.owner.customLayer);assert.equal(f.adds,3);f.owner.resume();f.emit('styledata');assert.equal(f.adds,3);f.frame();assert.equal(f.log.captures.length,3);
 }finally{f.owner.destroy();}
});
test('BFcache suspend/resume keeps the owner; permanent destroy removes listeners and destroys core once',()=>{
 const f=fixture();f.owner.setMode(true);f.frame();const layer=f.owner.customLayer;f.owner.suspend();assert.equal(f.log.destroyed,0);layer.prerender(f.gl);assert.equal(f.log.captures.length,1);f.owner.resume();f.frame();assert.equal(f.log.captures.length,2);assert.equal(f.log.created.length,1);f.owner.destroy();f.owner.destroy();assert.equal(f.log.destroyed,1);assert.equal(f.layers.size,0);assert.ok([...f.events.values()].every(set=>set.size===0));f.emit('style.load');layer.prerender(f.gl);assert.equal(f.log.captures.length,2);assert.equal(f.owner.stats.destroyed,true);
});
test('unexpected capture exceptions latch without retrying every frame; explicit resume can retry',()=>{
 const f=fixture();try{f.owner.setMode(true);f.log.fail=true;f.frame();f.frame();assert.equal(f.log.captures.length,1);assert.equal(f.owner.stats.faulted,true);f.log.fail=false;f.owner.resume();f.frame();assert.equal(f.log.captures.length,2);}finally{f.owner.destroy();}
});
test('pending capture requests only the existing next repaint and hidden/suspended/removed/destroyed owners stop work',()=>{
 const f=fixture();f.owner.setMode(true);f.log.result='pending';const before=f.repaints;f.frame();assert.equal(f.repaints,before+1);
 // A budget wait without an own retirement needs no frame: it sleeps on the
 // ledger's availability hint, which reaches the map through the core's
 // requestRepaint option instead of a per-frame repaint loop.
 f.log.needsFrame=false;f.frame();assert.equal(f.repaints,before+1,'a pending wait that needs no frame does not repaint');
 assert.equal(f.log.created.length,1);f.log.created[0].requestRepaint();assert.equal(f.repaints,before+2,'the availability hint requests exactly the next repaint');f.log.needsFrame=true;
 f.log.result='ready';f.frame();assert.equal(f.repaints,before+2);f.log.result='failed';f.frame();assert.equal(f.repaints,before+2);
 f.log.result='pending';const layer=f.owner.customLayer;f.owner.setPageHidden(true);let n=f.repaints,c=f.log.captures.length;layer.prerender(f.gl);assert.equal(f.repaints,n);assert.equal(f.log.captures.length,c);
 f.owner.setPageHidden(false);f.owner.suspend();n=f.repaints;c=f.log.captures.length;layer.prerender(f.gl);assert.equal(f.repaints,n);assert.equal(f.log.captures.length,c);
 f.owner.resume();f.owner.destroy();n=f.repaints;c=f.log.captures.length;layer.prerender(f.gl);assert.equal(f.repaints,n);assert.equal(f.log.captures.length,c);
});
test('main wires every owner transition and keeps the single stable dedicated+aggregate source',async()=>{
 const main=await fs.readFile(path.join(safety,'main.ts'),'utf8');assert.equal((main.match(/buildingSolarShadow=installSceneSolarShadowLayer\(/g)??[]).length,1);assert.match(main,/source:planarReflectionGroup\(\(\)=>\[dedicatedAppearance,threeDimensional\?\.renderer\],\{labels:\['dedicated','painted'\]\}\)/);assert.match(main,/buildingSolarShadow\?\.setMode\(state.mode==='3d'\)/);assert.match(main,/mapGPUUnavailable=true;buildingSolarShadow\?\.suspend\(\)/);
 // Page, GPU and viewport visibility now reach the owner through one
 // syncSceneVisibility. Execute that production body for every input
 // combination; optional-chain receivers become recorders.
 const tree=ts.createSourceFile('main.ts',main,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const visibility=parsedBlock(tree,'const syncSceneVisibility=()=>'),code=(await transform(visibility.body,{loader:'ts'})).code;
 const receivers=[...new Set([...code.matchAll(/\b([A-Za-z_$][\w$]*)\?\./g)].map(match=>match[1]))];assert.ok(receivers.includes('buildingSolarShadow'));
 const run=new Function('document','mapGPUUnavailable','sceneViewportVisible',...receivers,code);
 for(const hidden of [false,true])for(const unavailable of [false,true])for(const viewport of [false,true]){
  const calls=[],recorder=name=>new Proxy({},{get:(_target,method)=>(...args)=>{calls.push([name,method,...args]);}});
  run({hidden},unavailable,viewport,...receivers.map(recorder));
  assert.deepEqual(calls.filter(call=>call[0]==='buildingSolarShadow'),[['buildingSolarShadow','setPageHidden',hidden||unavailable||!viewport]],JSON.stringify({hidden,unavailable,viewport}));
 }
 assert.match(main,/pageHidden:document\.hidden\|\|mapGPUUnavailable\|\|!sceneViewportVisible,available:\(\)=>!mapGPUUnavailable/,'the owner starts hidden under the same predicate');
 // Both resume paths re-sync that visibility, after the GPU becomes available, before the owner resumes;
 // nothing in between hides, suspends or destroys the owner again or marks the GPU unavailable again.
 const ownerPause=/\bbuildingSolarShadow\s*(?:\?\.|!?\.)\s*(?:setPageHidden|suspend|destroy)\s*\(/;
 for(const [marker,fragments] of [
  ['onLayersRestored:signal=>',['mapGPUUnavailable=false;','syncSceneVisibility();','threeDimensional?.resume({contextRecovery:true});buildingSolarShadow?.resume();']],
  ['window.addEventListener("pageshow",(event)=>',['if(mapGPUUnavailable){refresh();return;}','syncSceneVisibility();','threeDimensional?.resume();buildingSolarShadow?.resume();']],
 ]){
  const body=parsedBlock(tree,marker).body,[available,sync,resume]=orderedFragments(body,fragments);
  assert.doesNotMatch(body.slice(sync+fragments[1].length,resume),ownerPause,`${marker}: the solar owner is paused again between the visibility sync and its resume`);
  assert.doesNotMatch(body.slice(available+fragments[0].length,resume),/\bmapGPUUnavailable\s*=\s*true\b/,`${marker}: the GPU is marked unavailable again before the owner resumes`);
 }
 assert.match(main,/buildingSolarShadow\?\.suspend\(\);statisticsRequest.abort/);assert.match(main,/buildingSolarShadow\?\.destroy\(\)/);assert.match(main,/solarShadow:buildingSolarShadow\?\.stats/);
 // Whole-file inventory on the parse tree, where comments and strings never
 // count. The owner is never aliased or handed on, so every interaction with it
 // is a direct member access in this file. Each pausing call, and each write of
 // the GPU and viewport visibility inputs, is a top-level statement of its one
 // known transition and occurs nowhere else: a pause or an unavailable mark
 // added anywhere else - also inside a helper that a resume path runs between
 // its visibility sync and the owner's resume - fails here.
 const lost=parsedBlock(tree,'onLost:event=>'),restored=parsedBlock(tree,'onLayersRestored:signal=>'),pageshow=parsedBlock(tree,'window.addEventListener("pageshow",(event)=>'),pagehide=parsedBlock(tree,'window.addEventListener("pagehide", (event) =>'),viewport=parsedBlock(tree,'const syncSceneViewportVisibility=(visible:boolean)=>');
 const persisted=pagehide.node.statements.filter(statement=>ts.isIfStatement(statement)&&statement.expression.getText(tree)==='event.persisted'&&!statement.elseStatement&&ts.isBlock(statement.thenStatement)&&ts.isReturnStatement(statement.thenStatement.statements.at(-1)));
 assert.equal(persisted.length,1,'pagehide returns early for a persisted (BFcache) page before its teardown');
 const blocks=[['syncSceneVisibility',visibility],['syncSceneViewportVisibility',viewport],['onLost',lost],['onLayersRestored',restored],['pageshow',pageshow],['pagehide',pagehide]];
 const site=node=>{
  const [name,block]=blocks.find(([,candidate])=>candidate.open<=node.getStart(tree)&&node.end<=candidate.end)??['elsewhere'];
  if(!block)return name;
  if(!(ts.isExpressionStatement(node.parent)&&node.parent.parent===block.node))return name+':nested';
  return name!=='pagehide'?name:node.end<=persisted[0].getStart(tree)?'pagehide:every':'pagehide:teardown';
 };
 const pausing=new Set(['setPageHidden','suspend','destroy']),calls=new Set([...pausing,'resume','setMode','setSceneEnvironment','getProofSettlementKey']),reads=new Set(['customLayer','stats']);
 const assignment=node=>{
  const p=node.parent;
  if(ts.isBinaryExpression(p)&&p.left===node&&p.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&p.operatorToken.kind<=ts.SyntaxKind.LastAssignment)return p;
  if((ts.isPrefixUnaryExpression(p)||ts.isPostfixUnaryExpression(p))&&(p.operator===ts.SyntaxKind.PlusPlusToken||p.operator===ts.SyntaxKind.MinusMinusToken))return p;
 };
 const forms=[],pauses=[],writes=[];
 (function visit(node){
  if(ts.isIdentifier(node)&&node.text==='buildingSolarShadow'){
   let at=node;while(ts.isNonNullExpression(at.parent)||ts.isParenthesizedExpression(at.parent))at=at.parent;
   const p=node.parent,access=ts.isPropertyAccessExpression(at.parent)&&at.parent.expression===at?at.parent:undefined,call=access&&ts.isCallExpression(access.parent)&&access.parent.expression===access?access.parent:undefined;
   if(ts.isVariableDeclaration(p)&&p.name===node)forms.push('declaration');
   else if(assignment(node))forms.push(ts.isBinaryExpression(p)&&p.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isExpressionStatement(p.parent)&&ts.isCallExpression(p.right)&&p.right.expression.getText(tree)==='installSceneSolarShadowLayer'?'install':'assignment: '+p.getText(tree).slice(0,80));
   else if(call&&calls.has(access.name.text)){forms.push(`.${access.name.text}()`);if(pausing.has(access.name.text))pauses.push(`${access.name.text}@${site(call)}`);}
   else if(access&&!call&&reads.has(access.name.text))forms.push(`.${access.name.text}`);
   else forms.push('unexpected: '+at.parent.getText(tree).slice(0,80));
  }else if(ts.isIdentifier(node)&&(node.text==='sceneViewportVisible'||node.text==='mapGPUUnavailable')){const write=assignment(node);if(write)writes.push(`${write.getText(tree)}@${site(write)}`);}
  ts.forEachChild(node,visit);
 })(tree);
 assert.deepEqual(forms.filter(form=>!/^\.\w+(?:\(\))?$/.test(form)),['declaration','install'],'the solar owner is declared and installed once, then used only through its known members - never reassigned, aliased or handed on');
 assert.deepEqual(pauses,['setPageHidden@syncSceneVisibility','suspend@onLost','suspend@pagehide:every','destroy@pagehide:teardown'],'each pausing owner call is a top-level statement of its one known transition');
 assert.deepEqual(writes,['sceneViewportVisible=visible@syncSceneViewportVisibility','mapGPUUnavailable=true@onLost','mapGPUUnavailable=false@onLayersRestored'],'the viewport and GPU visibility inputs are written only at their transitions');
});

test('resident sunlight is stable across pan and missing or stale-instant light forbids capture',()=>{const f=fixture();try{f.owner.setMode(true);f.frame();const before=f.log.captures[0].settings.direction;f.map.getCenter=()=>{throw Error('camera must not choose solar origin');};f.frame();assert.deepEqual(f.log.captures.at(-1).settings.direction,before);f.setLight(undefined);f.frame();assert.equal(f.log.captures.length,2);f.setLight(sceneSolarLight(13.4,52.5,'2026-06-20T12:00:00+02:00'));f.frame();assert.equal(f.log.captures.length,2);}finally{f.owner.destroy();}});
