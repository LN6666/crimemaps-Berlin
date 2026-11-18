import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Only the actual local QA button installer is evaluated. No renderer or data
// imports, GPU, real timer, log or business-readiness condition is involved.
const file=new URL('../src/safety/main.ts',import.meta.url),raw=fs.readFileSync(file,'utf8');
const ast=ts.createSourceFile(file.pathname,raw,ts.ScriptTarget.Latest,true);
assert.equal(ast.parseDiagnostics.length,0,'main parses');
let block;
function visit(node){
  if(ts.isIfStatement(node)&&node.expression.getText(ast)==="location.hostname==='127.0.0.1'"&&node.thenStatement.getText(ast).includes("check.id='qa-context-recovery'"))block=node.thenStatement;
  if(!block)ts.forEachChild(node,visit);
}
visit(ast);assert(block,'actual local QA button installer');
const body=block.getText(ast).slice(1,-1);
const code=ts.transpileModule(body+'\nreturn check;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;

function fixture(){
  let now=10;
  const timers=[],calls=[],terminal={revision:7,status:'ready'},button={};
  const extension={loseContext(){calls.push(['lose',now]);},restoreContext(){calls.push(['restore',now]);}};
  const scope={document:{createElement:()=>button},map:{getCanvas:()=>({getContext:()=>({getExtension:()=>extension})})},app:{querySelector:()=>({append(){}})},threeDimensionalRecovery:{lastTerminal:terminal},performance:{timeOrigin:123456789,now:()=>now},setTimeout(fn,ms){assert.equal(ms,1000,'original delay');timers.push(fn);}};
  const values=new Proxy(scope,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k]});
  const installed=Function('scope','with(scope){'+code+'}')(values);
  return {button:installed,timers,calls,terminal,setNow(value){now=value;}};
}

test('local recovery action records actual request times and exposes a read-only snapshot beside the unchanged terminal',()=>{
  const f=fixture();assert.equal(f.button.recoveryAction,undefined);assert.equal(f.button.recoveryTerminal,f.terminal);
  f.button.onclick();assert.deepEqual(f.calls,[['lose',10]]);
  assert.deepEqual(f.button.recoveryAction,{sequence:1,timeOrigin:123456789,lossRequestedAtMs:10,restoreRequestedAtMs:null});
  const snapshot=f.button.recoveryAction;snapshot.restoreRequestedAtMs=-1;
  assert.equal(f.button.recoveryAction.restoreRequestedAtMs,null,'the returned object cannot edit the recorded action');
  assert.equal(Object.getOwnPropertyDescriptor(f.button,'recoveryAction').set,undefined);
  f.setNow(1873);f.timers[0]();
  assert.equal(f.button.recoveryAction.restoreRequestedAtMs,1873,'record the delayed callback, never loss + 1000');
  assert.deepEqual(f.calls,[['lose',10],['restore',1873]]);assert.equal(f.button.recoveryTerminal,f.terminal);
});

test('an older restore callback cannot overwrite the action from a later click',()=>{
  const f=fixture();f.button.onclick();f.setNow(40);f.button.onclick();
  assert.equal(f.button.recoveryAction.sequence,2);assert.equal(f.button.recoveryAction.lossRequestedAtMs,40);
  f.setNow(1600);f.timers[0]();
  assert.equal(f.button.recoveryAction.sequence,2);assert.equal(f.button.recoveryAction.restoreRequestedAtMs,null);
  f.setNow(1700);f.timers[1]();
  assert.equal(f.button.recoveryAction.restoreRequestedAtMs,1700);assert.equal(f.timers.length,2,'one existing timeout per click');
});
