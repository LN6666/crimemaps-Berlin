import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
for(const provider of ['delegated500','tier300']){
 const file=new URL(`../src/painted/${provider}/safety/three-dimensional-map.ts`,import.meta.url),text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file.pathname,text,ts.ScriptTarget.Latest,true);
 let moved;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='moved')moved=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert(moved);
 test(`${provider} records current viewport failure before publication, ignores abandoned failures`,async()=>{
  for(const stale of ['current','superseded','aborted','destroyed']){
   const calls=[];let reject;
   const scope={destroyed:false,suspended:false,pageHidden:false,cameraMotionTicket:undefined,revision:4,mode:'3d',wantedMode:'3d',request:new AbortController(),modeRequests:{settleViewport:()=>false},lastError:'previous',visible:()=>new Promise((_,no)=>{reject=no;}),announce:status=>calls.push([status,scope.lastError])};
   const proxy=new Proxy(scope,{has:()=>true,get:(s,k)=>k===Symbol.unscopables?undefined:k in s?s[k]:globalThis[k],set:(s,k,v)=>(s[k]=v,true)});
   Function('scope','with(scope){return '+ts.transpileModule(moved,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'}')(proxy)();
   if(stale==='superseded')scope.revision++;if(stale==='aborted')scope.request.abort();if(stale==='destroyed')scope.destroyed=true;
   reject(new Error('actual viewport preparation failed'));await Promise.resolve();await Promise.resolve();
   assert.deepEqual(calls,stale==='current'?[['error','Error: actual viewport preparation failed']]:[]);
   assert.equal(scope.lastError,stale==='current'?'Error: actual viewport preparation failed':'previous');
  }
 });
}
