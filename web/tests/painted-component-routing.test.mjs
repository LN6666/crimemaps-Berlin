import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';

const sourceURL=new URL('../src/safety/painted-map.ts',import.meta.url),source=fs.readFileSync(sourceURL,'utf8'),ast=ts.createSourceFile('painted-map.ts',source,ts.ScriptTarget.Latest,true);
function runModule(text,require){
 const module={exports:{}},code=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('require','module','exports',code)(require,module,module.exports);return module.exports;
}
function expression(text,bindings){
 const code=ts.transpileModule('const result=('+text+');',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 return new Function(...Object.keys(bindings),code+'\nreturn result;')(...Object.values(bindings));
}
const ownershipURL=new URL('./paint-ownership.ts',sourceURL),ownership=runModule(fs.readFileSync(ownershipURL,'utf8'),id=>{
 if(id.endsWith('.json'))return{default:JSON.parse(fs.readFileSync(new URL(id,ownershipURL),'utf8'))};
 assert.equal(id,'../painted/church/safety/facade-paint-frame');return{paintFamily(){assert.fail('an exactly owned identity must not fall back to a generic family');}};
});
const copies=runModule(fs.readFileSync(new URL('./component-readback.ts',sourceURL),'utf8'),id=>assert.fail('unexpected copy helper import '+id));
let proxyText,bindingText,pickRevisionText,pickCurrentText,preparePickText;
function visit(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='renderer'&&node.initializer&&ts.isNewExpression(node.initializer)&&node.initializer.expression.getText(ast)==='Proxy'){assert.equal(proxyText,undefined);proxyText=node.initializer.getText(ast);}
 if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='getSourceBinding'){assert.equal(bindingText,undefined);bindingText='function '+node.getText(ast);}
 if(ts.isFunctionDeclaration(node)&&node.name?.text==='getPickRevision')pickRevisionText=node.getText(ast);
 if(ts.isFunctionDeclaration(node)&&node.name?.text==='isPickGenerationCurrent')pickCurrentText=node.getText(ast);
 if(ts.isFunctionDeclaration(node)&&node.name?.text==='prepareDetailPick')preparePickText=node.getText(ast);
 ts.forEachChild(node,visit);
}
visit(ast);assert(proxyText);assert(bindingText);assert(pickRevisionText);assert(pickCurrentText);assert(preparePickText);

test('the actual compositor routes duplicate identities and source bindings to paintOwner before a generic city renderer',()=>{
 const registry=JSON.parse(fs.readFileSync(new URL('./paint-ownership-registry.json',sourceURL),'utf8'));
 const candidate=Object.entries(registry.parts).find(([key,row])=>{const [city,objectId,...part]=key.split('|');return row.provider!=='city'&&ownership.paintIdentityOwner(city,objectId,part.join('|'))===row.provider;});
 assert(candidate,'the authoritative registry must retain a non-city owned identity');
 const [key,entry]=candidate,[city,objectId,...part]=key.split('|'),identity={objectId,partId:part.join('|')},owner=entry.provider;
 const raw=(provider,kind)=>({city,...identity,generation:1,origin:[8,53],componentGeometry:{type:'Polygon',coordinates:[[[8,53],[8.001,53],[8,53.001],[8,53]]]},sourceFeature:{type:'Feature',id:objectId,geometry:{type:'Polygon',coordinates:[]},properties:{provider,kind}},displayEstimates:{provider,kind},batches:[{positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),indices:new Uint32Array([0,1,2]),color:[.2,.3,.4]}]});
 const values=new Map([['city',{source:raw('city','source'),surface:raw('city','surface'),added:raw('city','added')}],[owner,{source:raw(owner,'source'),surface:raw(owner,'surface'),added:raw(owner,'added')}]]),providerOrder=['city',owner],renderers=new Map(),managers=new Map();
 const accepts=id=>id?.objectId===objectId&&id?.partId===identity.partId;
 for(const provider of providerOrder){
  const value=values.get(provider),borrow=kind=>id=>accepts(id)?value[kind]:undefined,publicRead=kind=>id=>{assert.notEqual(provider,'city','the generic duplicate cannot answer an owned public readback');return copies.copyBuildingComponentReadback(borrow(kind)(id));};
  const renderer={borrowSourceComponent:borrow('source'),borrowSurfaceComponent:borrow('surface'),borrowAddedDisplayComponent:borrow('added'),getSourceComponent:publicRead('source'),getSurfaceComponent:publicRead('surface'),getAddedDisplayComponent:publicRead('added'),getComponent(id){assert.notEqual(provider,'city');return copies.copyBuildingComponentMetadata(borrow('surface')(id));}};
  const leaf={provider,sha256:(provider==='city'?'c':'a').repeat(64)},byFeature=new WeakMap([[value.source.sourceFeature,leaf]]);
  renderers.set(provider,renderer);managers.set(provider,{renderer,getSourceBinding(id){const source=renderer.borrowSourceComponent(id);return source&&byFeature.get(source.sourceFeature);}});
 }
 const renderer=expression(proxyText,{providerOrder,renderers,paintOwner:ownership.paintOwner}),getSourceBinding=expression(bindingText,{providerOrder,managers,paintOwner:ownership.paintOwner}),expected=values.get(owner);
 assert.equal(renderer.getComponent(identity).displayEstimates.provider,owner);
 for(const [method,kind]of [['borrowSourceComponent','source'],['borrowSurfaceComponent','surface'],['borrowAddedDisplayComponent','added']])assert.strictEqual(renderer[method](identity),expected[kind],method);
 for(const [method,kind]of [['getSourceComponent','source'],['getSurfaceComponent','surface'],['getAddedDisplayComponent','added']])assert.deepEqual(renderer[method](identity),expected[kind],method);
 assert.deepEqual(getSourceBinding(identity),{provider:owner,sha256:'a'.repeat(64)},'the original borrowed sourceFeature hits the owned manager WeakMap');
 renderers.delete(owner);managers.delete(owner);
 assert.equal(renderer.getComponent(identity),undefined,'an absent owner cannot fall back to the generic duplicate');assert.equal(getSourceBinding(identity),undefined);
});

test('actual compositor pick revision detects lower-generation provider changes across the full vector',()=>{
 const providerOrder=['city','root500'],revisions=new Map([['city',{generation:90,viewRevision:80}],['root500',{generation:3,viewRevision:2}]]);
 const renderers=new Map(providerOrder.map(provider=>[provider,{getRevision:()=>({...revisions.get(provider)})}]));
 const getPickRevision=expression(pickRevisionText,{providerOrder,renderers,pickRevisions:new Map(),pickGeneration:0,pickViewRevision:0});
 const renderer=expression(proxyText,{providerOrder,renderers,getPickRevision});
 const first=renderer.getPickRevision();assert.deepEqual(renderer.getPickRevision(),first);assert.deepEqual(renderer.getRevision(),{generation:90,viewRevision:80});
 revisions.get('root500').generation=4;
 const changed=renderer.getPickRevision();assert.equal(changed.generation,first.generation+1);assert.equal(changed.viewRevision,first.viewRevision);assert.deepEqual(renderer.getRevision(),{generation:90,viewRevision:80},'the lower provider changes while both legacy maxima stay fixed');
 revisions.get('root500').viewRevision=3;
 const moved=renderer.getPickRevision();assert.equal(moved.generation,changed.generation);assert.equal(moved.viewRevision,changed.viewRevision+1);assert.deepEqual(renderer.getPickRevision(),moved);
});

test('actual compositor validates a low-generation hit through paintOwner without rewriting SOURCE generation',()=>{
 const registry=JSON.parse(fs.readFileSync(new URL('./paint-ownership-registry.json',sourceURL),'utf8'));
 const candidate=Object.entries(registry.parts).find(([key,row])=>{const [city,objectId,...part]=key.split('|');return row.provider!=='city'&&ownership.paintIdentityOwner(city,objectId,part.join('|'))===row.provider;});assert(candidate);
 const [key,entry]=candidate,[city,objectId,...part]=key.split('|'),identity={objectId,partId:part.join('|')},owner=entry.provider,providerOrder=['city',owner];
 const source=Object.freeze({city,...identity,generation:7,sourceFeature:Object.freeze({type:'Feature',properties:Object.freeze({original:true})})}),duplicate=Object.freeze({...source,generation:90});
 const revisions=new Map([['city',{generation:90,viewRevision:80}],[owner,{generation:7,viewRevision:2}]]),values=new Map([['city',duplicate],[owner,source]]),borrows=[];
 const renderers=new Map(providerOrder.map(provider=>[provider,{getRevision:()=>({...revisions.get(provider)}),borrowSourceComponent(hit){borrows.push(provider);return hit.objectId===objectId&&hit.partId===identity.partId?values.get(provider):undefined;},borrowSurfaceComponent:()=>undefined,borrowAddedDisplayComponent:()=>undefined}]));
 const isPickGenerationCurrent=expression(pickCurrentText,{providerOrder,renderers,paintOwner:ownership.paintOwner}),renderer=expression(proxyText,{providerOrder,renderers,isPickGenerationCurrent});
 assert.equal(renderer.getRevision().generation,90);assert.equal(renderer.isPickGenerationCurrent({...identity,generation:7}),true);assert.deepEqual(borrows,['city',owner]);assert.equal(renderer.isPickGenerationCurrent({...identity,generation:90}),false,'the generic duplicate cannot certify the owned hit');
 revisions.get(owner).generation=8;
 assert.equal(renderer.isPickGenerationCurrent({...identity,generation:7}),false);assert.equal(renderer.isPickGenerationCurrent({...identity,generation:8}),true);assert.equal(source.generation,7);assert.strictEqual(values.get(owner),source);assert.equal(duplicate.generation,90);
});

const canonicalProviders=['root500','delegated500','tier300','church','city','infill','bremen'];
// Each manager's prepareCanonicalPicking runs with its own actual private helpers (extracted from the
// same file) and the actual shared detail-demand and model-projection modules; only manager state is a double.
const canonicalHelpers=['pickingNeedsCanonical','currentPickingResources','rememberPublishedDetails','pickingSources'];
// model-view-projection carries the building-focus window (pure screen geometry, no further imports).
const sharedPicking=createSourceModules({allow:id=>['safety/building-detail-demand','safety/model-view-projection','safety/projected-detail-policy','safety/building-focus-window'].includes(id)});
const {buildingDetailMayContainPick}=sharedPicking.load('safety/building-detail-demand'),{modelProjectionAtOrigin}=sharedPicking.load('safety/model-view-projection');
const canonicalHooks=new Map(canonicalProviders.map(provider=>{
 const file=new URL('../src/painted/'+provider+'/safety/three-dimensional-map.ts',import.meta.url),text=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file.pathname,text,ts.ScriptTarget.Latest,true);let hook;const helpers=new Map();
 (function find(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='prepareCanonicalPicking')hook=node.getText(tree);if(ts.isFunctionDeclaration(node)&&canonicalHelpers.includes(node.name?.text)){assert(!helpers.has(node.name.text),provider+' declares '+node.name.text+' once');helpers.set(node.name.text,node.getText(tree));}ts.forEachChild(node,find);})(tree);assert(hook,provider+' actual canonical picking hook');
 for(const name of canonicalHelpers)if(new RegExp('\\b'+name+'\\(').test(hook)||[...helpers.values()].some(body=>new RegExp('\\b'+name+'\\(').test(body)))assert(helpers.has(name),provider+' actual helper '+name);
 assert(/import \{[^}]*\bbuildingDetailMayContainPick\b[^}]*\} from '..\/..\/..\/safety\/building-detail-demand'/.test(text),provider+' imports the shared pick containment');assert(/import \{[^}]*\bmodelProjectionAtOrigin\b[^}]*\} from '..\/..\/..\/safety\/model-view-projection'/.test(text),provider+' imports the shared model projection');
 return[provider,'(()=>{'+[...helpers.values()].join('\n')+'\nreturn ('+hook+');})()'];
}));
// Unknown (non-mercator) projection keeps every published resource a conservative pick candidate.
const canonicalFrame=Object.freeze({revision:1,cameraKey:'fixture-camera',mercator:false,mainMatrix:new Float64Array(16),viewport:{cssWidth:1000,cssHeight:600,drawingBufferWidth:1000,drawingBufferHeight:600}});
const leafResource=level=>({key:'leaf',level,components:[{origin:[13.4,52.5],box:[-5,0,-5,5,10,5]}]});
function canonicalPickFixture({far=true,detailConfigured=true}={}){
 let open;const gate=new Promise(resolve=>open=resolve),hooks=[],requests=[],states=[],managers=new Map(),renderers=new Map(),pickingDemands=new Set(),sourcePins={retained:0,released:0};let releases=0;
 const remove=pickingDemands.delete.bind(pickingDemands);pickingDemands.delete=token=>{releases++;return remove(token);};
 function wait(signal){return new Promise((resolve,reject)=>{const aborted=()=>{signal.removeEventListener('abort',aborted);reject(signal.reason);};signal.addEventListener('abort',aborted,{once:true});if(signal.aborted){aborted();return;}gate.then(()=>{signal.removeEventListener('abort',aborted);signal.aborted?reject(signal.reason):resolve();});});}
 for(const provider of canonicalProviders){
  const state={ready:!far,levels:[far?'coarse':'near'],published:[far?'coarse':'near'],resources:new Map([['leaf',leafResource(far?'coarse':'near')]]),activeTicket:0};states.push(state);
  const renderer={residentVertexCount:3,getRevision:()=>({generation:7,viewRevision:2}),getDrawReadiness:()=>({ready:state.ready,preparing:!state.ready}),pick(){assert.fail('preparation must not cast a ray');}};renderers.set(provider,renderer);
  const finish=async(signal,path,ticket)=>{requests.push({provider,path,signal,skipCamera:path==='requestMode'});state.activeTicket=ticket;await wait(signal);signal.throwIfAborted();state.levels.splice(0,1,'near');state.published.splice(0,1,'near');state.resources.set('leaf',leafResource('near'));state.ready=true;};
  // The published main source lease of the leaf, read through its current selected resource.
  const sourceLease={contentKey:'source:'+provider,value:{selectedResourceKey:'leaf',get selectedResource(){return state.resources.get('leaf');}},retain(role){assert.equal(role,'picking');sourcePins.retained++;let released=false;return{release(){assert.equal(released,false,'a picking pin is released once');released=true;sourcePins.released++;}};}};
  const bindings={mode:'3d',wantedMode:'3d',destroyed:false,suspended:false,pageHidden:false,options:{detailRuntime:{},getModelViewProjection:()=>canonicalFrame},renderer,adoptedDetailResources:state.resources,adoptedDetailLevels:state.levels,publishedDetailLevels:state.published,adoptedDetailGeneration:7,publishedDetailGeneration:7,publishedDetailResources:state.resources,lastRegistered:undefined,publishedManagerState:undefined,lastReadyGeneration:7,lastReadyState:{resources:state.resources},lastHandoffGeneration:undefined,adoptedDetailSignal:new AbortController().signal,request:new AbortController(),revision:0,
   mainSourceLeases:provider==='root500'||provider==='infill'||provider==='bremen'?new Map([['leaf',sourceLease]]):[sourceLease],buildingDetailMayContainPick,modelProjectionAtOrigin,
   requestMode(next,signal,skipCamera){assert.equal(next,'3d');assert.equal(skipCamera,true);return finish(signal,'requestMode',0);},
   modeRequests:{run(signal,visible,run){assert.equal(visible,true);return run({signal,abort(){}});}},
   visible(signal,ticket,activate,notify){assert.equal(activate,false);assert.equal(notify,false);return finish(signal,'visible',ticket);},
   current(signal,ticket){signal.throwIfAborted();assert.equal(ticket,state.activeTicket);},currentDetailBinding:()=>({levels:state.levels.map(level=>({level}))}),
   map:{stop(){assert.fail('canonical picking must not move the camera');},easeTo(){assert.fail('canonical picking must not move the camera');},jumpTo(){assert.fail('canonical picking must not move the camera');}},
  };
  const actual=expression(canonicalHooks.get(provider),bindings);managers.set(provider,{prepareCanonicalPicking(point,signal){hooks.push({provider,point,signal});return actual(point,signal);}});
 }
 // The compositor now waits for the current model view (one frame) before the token exists, and its
 // token is released by the request signal, a camera movement or a changed model-view key.
 const listeners=new Map(),modelViewWaits=[],map={on(name,fn){listeners.set(name,[...(listeners.get(name)??[]),fn]);},off(name,fn){listeners.set(name,(listeners.get(name)??[]).filter(value=>value!==fn));}};
 const prepareDetailPick=expression(preparePickText,{pickingDemands,managers,detailConfigured,destroyed:false,abort:()=>new DOMException('Aborted','AbortError'),options:{map},modelViewKey:()=>'fixture-camera',awaitCurrentModelView:async signal=>{signal.throwIfAborted();modelViewWaits.push(signal);}});
 const listening=()=>[...listeners.values()].reduce((n,list)=>n+list.length,0);
 return{renderer:expression(proxyText,{providerOrder:canonicalProviders,renderers,prepareDetailPick}),hooks,requests,states,pickingDemands,open,modelViewWaits,listening,sourcePins,get releases(){return releases;}};
}

test('actual compositor preparePick holds its token until all seven actual manager hooks prepare canonical detail',async()=>{
 const f=canonicalPickFixture(),point={x:123,y:456},controller=new AbortController();let settled=false;
 const pending=f.renderer.preparePick(point,controller.signal).then(value=>{settled=true;return value;});await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(f.modelViewWaits,[controller.signal],'one current model-view wait before the token');assert.equal(f.listening(),2,'movestart and render watch the camera while preparing');
 assert.equal(settled,false);assert.equal(f.pickingDemands.size,1);assert.equal(f.releases,0);assert.deepEqual(f.hooks.map(call=>call.provider),canonicalProviders);// The compositor hands every hook one token-owned copy of the point and one signal it owns,
 // linked to the request signal, camera movement and the model-view key (prepareDetailPick).
 const ownSignal=f.hooks[0].signal,tokenPoint=f.hooks[0].point;assert.deepEqual(tokenPoint,point);assert.notEqual(ownSignal,controller.signal,'hooks observe the compositor-owned token signal');assert.equal(ownSignal.aborted,false);
 assert(f.hooks.every(call=>call.point===tokenPoint&&call.signal===ownSignal));assert.equal(f.requests.length,7);assert(f.requests.every(call=>call.signal===ownSignal));assert.deepEqual(f.requests.filter(call=>call.skipCamera).map(call=>call.provider),['root500','infill','bremen'],'detail-runtime managers re-enter through requestMode without camera work');assert.deepEqual(f.requests.filter(call=>!call.skipCamera).map(call=>call.provider),['delegated500','tier300','church','city'],'source-lease managers run one visible preparation through modeRequests');assert.equal(f.sourcePins.retained,7,'each manager pins its candidate source while preparing');assert.equal(f.sourcePins.released,0);
 f.open();const demand=await pending;assert(f.states.every(state=>state.ready&&state.levels[0]==='near'));assert.equal(f.sourcePins.released,7,'every picking pin is released after preparation');assert.equal(f.pickingDemands.size,1);demand.release();assert.equal(f.releases,1);assert.equal(f.pickingDemands.size,0);assert.equal(f.listening(),0,'release removes the camera listeners');assert.equal(ownSignal.aborted,true,'release aborts the token signal');
});

test('actual compositor canonical preparation aborts without ray or camera work and skips near or absent catalogs',async()=>{
 const f=canonicalPickFixture(),controller=new AbortController(),pending=f.renderer.preparePick({x:5,y:6},controller.signal),rejected=assert.rejects(pending,{name:'AbortError'});await new Promise(resolve=>setImmediate(resolve));assert.equal(f.pickingDemands.size,1);assert.equal(f.sourcePins.retained,7,'every manager pinned its picking source before the abort');controller.abort();await rejected;assert.equal(f.pickingDemands.size,0);assert.equal(f.sourcePins.released,f.sourcePins.retained,'aborted preparation releases every picking pin');assert.equal(f.releases,1);assert.equal(f.listening(),0);assert(f.states.every(state=>!state.ready));
 for(const options of [{far:false},{detailConfigured:false}]){const idle=canonicalPickFixture(options),signal=new AbortController().signal,demand=await idle.renderer.preparePick({x:7,y:8},signal);assert.equal(idle.requests.length,0);assert.equal(idle.hooks.length,options.detailConfigured===false?0:7);assert.equal(idle.pickingDemands.size,1);demand.release();assert.equal(idle.releases,1);assert.equal(idle.pickingDemands.size,0);}
});
