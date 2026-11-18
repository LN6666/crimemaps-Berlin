import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const raw=fs.readFileSync(new URL('../src/painted/church/safety/three-dimensional-map.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('manager.ts',raw,ts.ScriptTarget.Latest,true);
const nodes={};function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='visible')nodes.visible=n.getText(ast);if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='stage')nodes.stage='const stage='+n.initializer.getText(ast)+';';ts.forEachChild(n,visit);}visit(ast);assert(nodes.visible&&nodes.stage);
class StaleBuildingDetailDemandError extends Error{};class ChunkResourceContextLostError extends Error{};
function fixture(error,{moving=false,aborted=false,staleTicket=false}={}){
 const request=new AbortController();if(aborted)request.abort();const calls=[];
 const scope={StaleBuildingDetailDemandError,ChunkResourceContextLostError,request,signal:request.signal,ticket:1,revision:staleTicket?2:1,destroyed:false,visibleLoadsPending:0,recoveryResident:{invalidate(){}},current(){},flushDetailRefresh(){},options:{},visibleNow:async()=>{throw error;},map:{isMoving:()=>moving},modeRequests:{invalidateViewport(own){calls.push('invalidate');own.abort();},settleViewport(){calls.push('settle');return true;}},finished:false,activate:false,location:{search:''},publication:{isCurrent:()=>true,stage(_commit,fail){fail(error);}},commit(){},lastError:undefined,announce(v){calls.push(v);}};
 const proxy=new Proxy(scope,{has:()=>true,get:(s,k)=>k===Symbol.unscopables?undefined:k in s?s[k]:globalThis[k],set:(s,k,v)=>(s[k]=v,true)});
 const code=ts.transpileModule(nodes.visible+'\n'+nodes.stage+'\nreturn {visible,stage};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return{scope,calls,api:Function('scope','with(scope){'+code+'}')(proxy)};
}
for(const route of ['visible','stage'])test(`${route}: changed detail demand invalidates old work and retries the settled viewport`,async()=>{
 for(const moving of [false,true]){const error=new StaleBuildingDetailDemandError(),f=fixture(error,{moving});if(route==='visible')await assert.rejects(f.api.visible(f.scope.signal,1),e=>e===f.scope.signal.reason);else f.api.stage();assert.deepEqual(f.calls,moving?['invalidate']:['invalidate','settle']);assert.equal(f.scope.lastError,undefined);assert.equal(f.scope.visibleLoadsPending,0);}
});
test('visible genuine failures and abandoned requests do not trigger retry',async()=>{
 for(const [error,opts] of [[new Error('decode failure'),{}],[new StaleBuildingDetailDemandError(),{aborted:true}],[new StaleBuildingDetailDemandError(),{staleTicket:true}]]){const f=fixture(error,opts);await assert.rejects(f.api.visible(f.scope.signal,1),e=>e===error);assert.deepEqual(f.calls,[]);}
 const f=fixture(new Error('decode failure'));f.api.stage();assert.deepEqual(f.calls,['error']);assert.equal(f.scope.lastError,'Error: decode failure');
});
