import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';
import {resourceContentKey} from './support/resource-content-key.mjs';

const runtime=createRuntimeLoader();

function actual(relative,name,scope){
 const file=new URL('../src/'+relative,import.meta.url),source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file.pathname,source,ts.ScriptTarget.Latest,true);let found;
 assert.equal(ast.parseDiagnostics.length,0,relative+' parses');
 function visit(node){if((ts.isFunctionDeclaration(node)||ts.isMethodDeclaration(node))&&node.name?.getText(ast)===name)found=node;else if((ts.isVariableDeclaration(node)||ts.isPropertyAssignment(node))&&node.name.getText(ast)===name)found=node.initializer;ts.forEachChild(node,visit);}visit(ast);assert(found,name+' exists in actual manager');
 const expression=ts.isFunctionDeclaration(found)?'('+found.getText(ast)+')':ts.isMethodDeclaration(found)?'({'+found.getText(ast)+'})['+JSON.stringify(name)+']':found.getText(ast),code=ts.transpileModule('return '+expression,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const values=new Proxy(scope,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,v)=>(o[k]=v,true)});
 return Function('scope','with(scope){'+code+'}')(values);
}
const manager=provider=>'painted/'+provider+'/safety/three-dimensional-map.ts';
for(const provider of ['root500','infill','bremen'])test(provider+': source groups retain per-leaf authority and reject unbound viewport-derived rows',()=>{
 const a={objectId:'a',partId:'a/part',origin:[13,52],sourceFeature:{},batches:[]},b={objectId:'b',partId:'b/part',origin:[14,53],sourceFeature:{},batches:[]};
 const parent=(component,key)=>({value:{resourceKey:key,contentKey:key,components:[component],selectedLOD:'near',materialAuthority:'material-'+key,recipeAuthority:'recipe-'+key}}),pa=parent(a,'leaf-a'),pb=parent(b,'leaf-b');
 const {ownerShapePatchDisplayRows}=runtime.load(fileURLToPath(new URL('../src/painted/'+provider+'/safety/owner-shape-patch-display.ts',import.meta.url)));
 const bind=actual(manager(provider),'sourceChunkInput',{resources:{},resourceContentKey,ownerShapePatchDisplayRows,ownerProfileByComponent:new WeakMap(),sourceLeafByFeature:new WeakMap(),sourceResourceByFeature:new WeakMap(),sourceAbsentDisplay:()=>false,manifestSHA:'manifest',manifest:{compiler_sha256:'compiler'}});
 const first=bind([a,b],[pa,pb],{bounds:[0,0,1,1],zoom:15}),next=bind([a],[pa,pb],{bounds:[1,1,2,2],zoom:18});
 assert.equal(first.groups.length,2);assert.equal(next.groups.length,1);assert.equal(first.groups[0].contentKey,next.groups[0].contentKey,'camera and neighbour demand do not alter static content');assert.deepEqual(next.groups[0].parents,[pa]);assert.deepEqual(next.groups[0].frame.origin,a.origin);
 assert.throws(()=>bind([{...a,partId:'unknown',sourceFeature:{}}],[pa,pb]),/Unbound source-derived component authority/);
 assert.throws(()=>bind([{...a,origin:[13.5,52]}],[pa]),/explicit renderer ancestry/);
});

for(const provider of ['root500','infill','bremen','city','tier300','church','delegated500'])test(provider+': movement immediately retires source demand while leaving the current renderer enabled',()=>{
 const request=new AbortController(),events=[],scope={destroyed:false,suspended:false,pageHidden:false,ownCameraStartingTicket:undefined,revision:4,mode:'3d',preparingTicket:undefined,request,
  modeRequests:{refreshBlocked:false,invalidateViewport(value){value.abort();events.push('abort');}},recoveryResident:{invalidate(){}},wantedSources:{reconcile(value){assert.deepEqual(value,[]);events.push('release-source');}},s434Aggregate:{clear(){}},clearPreparedBatches(){assert(request.signal.aborted);},releaseAggregatePrepared(){assert(request.signal.aborted);},announce(status){assert.equal(status,'loading');},renderer:{setEnabled(){throw Error('published main scene must remain enabled');}}};
 actual(manager(provider),'moveStarted',scope)();assert.deepEqual(events,['abort','release-source']);assert.equal(scope.revision,5);
});

test('compositor selection transfers its source pin after the same identity publishes new source content',()=>{
 const identity={objectId:'a',partId:'a/part'},events=[],old={contentKey:'old',release(){events.push('old-release');}},next={contentKey:'new',release(){events.push('new-release');}},scope={selectedSource:{provider:'city',identity,pin:old},selectionSuspended:false,wanted:'3d',destroyed:false,renderers:new Map([['city',{selected:identity}]]),managers:new Map([['city',{retainSelectedSource(){events.push('acquire');return next;}}]])};
 const sync=actual('safety/painted-map.ts','syncSelectedSource',scope);sync('city');assert.equal(scope.selectedSource.pin,next);assert.deepEqual(events,['acquire','old-release']);sync('city');assert.deepEqual(events,['acquire','old-release','acquire','new-release']);
});

test('compositor readiness does not pass on fallback or a loading manager with an older drawable frame',()=>{
 const engine={getDrawReadiness:()=>({ready:true,preparing:false}),getRevision:()=>({generation:1,viewRevision:1})},scope={destroyed:false,wanted:'2d',lastFallback:{reason:'error'},lastError:'allocation rejected',providerOrder:['city'],managers:new Map([['city',{mode:'2d',wantedMode:'2d',detailDemandPending:false}]]),renderers:new Map([['city',engine]]),states:new Map()};
 const readiness=actual('safety/painted-map.ts','mainDrawReadiness',scope);assert.equal(readiness().ready,false);assert.match(readiness().failure,/allocation rejected/);
 scope.lastFallback=undefined;scope.lastError=undefined;assert.equal(readiness().ready,true,'deliberate 2D remains a valid inactive scene');scope.wanted='3d';Object.assign(scope.managers.get('city'),{mode:'3d',wantedMode:'3d'});scope.states.set('city',{status:'loading'});assert.equal(readiness().ready,false);assert.equal(readiness().preparing,true);assert.equal(readiness(true).providers[0].ready,false);scope.states.set('city',{status:'ready'});assert.equal(readiness().ready,true);
});

class ChunkResourceContextLostError extends Error{}
for(const provider of ['root500','infill','bremen','city','tier300','church','delegated500'])test(provider+': unfinished CPU context loss aborts only this attempt and does not clear the published handoff',async()=>{
 const request=new AbortController(),loss=new ChunkResourceContextLostError('context lost'),scope={request,revision:1,visibleLoadsPending:0,detailRefreshPending:false,ChunkResourceContextLostError,recoveryResident:{invalidate(){}},current(){request.signal.throwIfAborted();},options:{},async visibleNow(){throw loss;},clearFailedHandoff(){throw Error('published scene must survive interrupted source work');},flushDetailRefresh(){},map:{triggerRepaint(){}}};
 const visible=actual(manager(provider),'visible',scope);await assert.rejects(visible(request.signal,1),error=>error===loss);assert.equal(request.signal.aborted,true);assert.equal(scope.visibleLoadsPending,0);
});

test('compositor preserves 3D intent for the existing recovery owner after typed CPU context loss',async()=>{
 const transitions=[],loss=new ChunkResourceContextLostError('context lost'),scope={ChunkResourceContextLostError,destroyed:false,wanted:'2d',request:new AbortController(),transition:0,preparing:0,lastError:undefined,lastFallback:undefined,recoveryFrozenStamp:undefined,providerOrder:['city'],managers:new Map([['city',{async requestMode(next){transitions.push(next);throw loss;}}]]),options:{},abort:()=>new DOMException('aborted','AbortError'),startFrozenInitialization(){},async ensure(){}};
 const requestMode=actual('safety/painted-map.ts','requestMode',scope);await assert.rejects(requestMode('3d',new AbortController().signal),error=>error.name==='AbortError');assert.equal(scope.wanted,'3d');assert.equal(scope.lastError,undefined);assert.equal(scope.lastFallback,undefined);assert.equal(scope.preparing,0);assert.deepEqual(transitions,['3d'],'context restoration, rather than a 2D rollback, owns the next attempt');
});

test('lazy public readiness exposes initialization failure before any renderer exists',()=>{
 const scope={actual:undefined,lastError:undefined,wanted:'2d',unloadedFallback:undefined,recoveryFallback:undefined},read=actual('safety/three-dimensional-lazy.ts','getDrawReadinessSnapshot',scope);
 assert.equal(read().ready,true);scope.wanted='3d';assert.equal(read().ready,false);assert.equal(read().preparing,true);
 scope.wanted='2d';scope.lastError='initialization budget rejected';assert.equal(read().ready,false);assert.equal(read().preparing,false);assert.equal(read().failure,scope.lastError);
 const snapshot={ready:false,preparing:true,providers:[{provider:'city'}]};scope.actual={getDrawReadinessSnapshot:()=>snapshot};assert.equal(read(),snapshot,'once installed, the compositor owns the live scene snapshot');
});
