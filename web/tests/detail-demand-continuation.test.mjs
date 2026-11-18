import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {createViewportRequestContinuation}=await import('data:text/javascript;base64,'+Buffer.from(compile(fs.readFileSync(new URL('../src/safety/viewport-request.ts',import.meta.url),'utf8'))).toString('base64'));
class StaleBuildingDetailDemandError extends Error{};class ChunkResourceContextLostError extends Error{};
for(const city of ['delegated500','root500','church','infill','bremen','city','tier300']){
 const raw=fs.readFileSync(new URL(`../src/painted/${city}/safety/three-dimensional-map.ts`,import.meta.url),'utf8'),ast=ts.createSourceFile('manager.ts',raw,ts.ScriptTarget.Latest,true);let visible;
 function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='visible')visible=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert(visible);
 function fixture(){let attempts=0,moves=0;const scope={StaleBuildingDetailDemandError,ChunkResourceContextLostError,request:new AbortController(),revision:0,destroyed:false,visibleLoadsPending:0,detailRefreshPending:false,detailDemand:{},options:{nativeSources:{}},sourceClient:{},recoveryResident:{invalidate(){}},current(signal){signal.throwIfAborted();},flushDetailRefresh(){},clearFailedHandoff(){},map:{isMoving:()=>false,triggerRepaint(){}},modeRequests:createViewportRequestContinuation(()=>false),visibleNow:async()=>{attempts++;if(attempts===1)throw new StaleBuildingDetailDemandError();return 'ready';},moved(){moves++;}};
 const proxy=new Proxy(scope,{has:()=>true,get:(s,k)=>k===Symbol.unscopables?undefined:k in s?s[k]:globalThis[k],set:(s,k,v)=>(s[k]=v,true)});
 const api=Function('scope','with(scope){'+compile(visible)+';return visible;}')(proxy);
 return {scope,api,counts:()=>({attempts,moves})};}
 test(city+': actual mode continuation retries stale demand and reaches readiness',async()=>{const f=fixture();const result=await f.scope.modeRequests.run(new AbortController().signal,true,own=>{f.scope.request=own;return f.api(own.signal,++f.scope.revision);});assert.equal(result,'ready');assert.deepEqual(f.counts(),{attempts:2,moves:0});assert.equal(f.scope.visibleLoadsPending,0);});
 test(city+': idle viewport refresh schedules successor after stale demand',async()=>{const f=fixture();f.scope.revision=1;await assert.rejects(f.api(f.scope.request.signal,1),e=>e===f.scope.request.signal.reason);await Promise.resolve();assert.deepEqual(f.counts(),{attempts:1,moves:1});});
}
