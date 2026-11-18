import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const filename=new URL('../src/painted/bremen/safety/three-dimensional-map.ts',import.meta.url);
const source=await readFile(filename,'utf8');
const ast=ts.createSourceFile(filename.pathname,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const install=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='installThreeDimensionalMap');
assert(install?.body);
const statements=install.body.statements;
const declared=(node,name)=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>ts.isIdentifier(item.name)&&item.name.text===name);
const ownedNames=['queue','fetchLifetime','fetchBounded'];
const queueCode=statements.filter(node=>ownedNames.some(name=>declared(node,name))||ts.isFunctionDeclaration(node)&&['pump','scheduled'].includes(node.name?.text)).map(node=>node.getText(ast)).join('\n');
const returned=statements.find(node=>ts.isReturnStatement(node)&&node.expression&&ts.isObjectLiteralExpression(node.expression));
assert(returned?.expression);
const method=name=>returned.expression.properties.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(ast)===name);
const readAsset=method('readAsset'),destroy=method('destroy');
assert(readAsset?.body&&destroy?.body);
function mentions(node,name){let found=false;function visit(item){if(ts.isIdentifier(item)&&item.text===name)found=true;ts.forEachChild(item,visit);}visit(node);return found;}
// Run the real fetch queue, public readAsset method and destroy's fetch-lifetime
// wiring. Unrelated renderer/cache teardown is omitted; no provider imports or
// frozen data enter this tiny fixture.
const destroyCode=destroy.body.statements.filter(node=>mentions(node,'destroyed')||mentions(node,'fetchLifetime')||ts.isExpressionStatement(node)&&node.expression.getText(ast)==='request.abort()').map(node=>node.getText(ast)).join('\n');
const compiled=ts.transpileModule(`
let destroyed=false,active=0,peak=0;
const request=new AbortController();
const pathValid=()=>true,assetValid=()=>true;
const decoded=(bytes:Uint8Array)=>{options.onDecode?.();return JSON.parse(new TextDecoder().decode(bytes));};
const checked=async(bytes:Uint8Array)=>decoded(bytes);
${queueCode}
return {${readAsset.getText(ast)},destroy(){${destroyCode}},stats:()=>({active,peak,queued:queue.length})};
`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const createHarness=options=>new Function('options',compiled)(options);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const bytes=()=>new TextEncoder().encode('{"tiny":true}');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function tracked(promise){const result={state:'pending'};result.done=promise.then(value=>{result.state='fulfilled';result.value=value;},error=>{result.state='rejected';result.error=error;});return result;}
function controlled(){const calls=[];let decodes=0;const manager=createHarness({onDecode:()=>decodes++,fetchBytes:(path,signal)=>{const operation=deferred();calls.push({path,signal,...operation});return operation.promise;}});return{manager,calls,get decodes(){return decodes;},async drain(){manager.destroy();for(const call of calls)call.resolve(bytes());await tick();await tick();}};}
const read=(manager,name,controller=new AbortController())=>({controller,result:tracked(manager.readAsset('/safety/buildings3d/'+name+'.json',controller.signal,1024))});
const aborted=result=>{assert.equal(result.state,'rejected');assert.equal(result.error.name,'AbortError');};

test('destroy rejects queued public readAsset calls and active waiters without decoding or borrowing their slots',async()=>{
 const f=controlled(),reads=[read(f.manager,'one'),read(f.manager,'two'),read(f.manager,'queued')];
 try{
  await tick();assert.equal(f.calls.length,2);assert.deepEqual(f.manager.stats(),{active:2,peak:2,queued:1});
  f.manager.destroy();await tick();
  aborted(reads[2].result);
  for(const item of reads){aborted(item.result);assert.equal(item.controller.signal.aborted,false,'manager disposal must not abort caller-owned controllers');}
  assert.equal(f.manager.stats().queued,0);assert.equal(f.manager.stats().active,2,'active work keeps its slot until the underlying operation settles');
  assert(f.calls.every(call=>call.signal.aborted));assert.equal(f.calls.length,2);assert.equal(f.decodes,0);
  for(const call of f.calls)call.resolve(bytes());await tick();await tick();
  assert.equal(f.manager.stats().active,0);assert.equal(f.calls.length,2);assert.equal(f.decodes,0);
 }finally{for(const item of reads)item.controller.abort();await f.drain();}
});

test('caller cancellation removes queued work without starting it',async()=>{
 const f=controlled(),reads=[read(f.manager,'one'),read(f.manager,'two'),read(f.manager,'cancelled')];
 try{
  await tick();reads[2].controller.abort();await tick();aborted(reads[2].result);
  assert.equal(f.manager.stats().queued,0);assert.equal(f.calls.length,2);
  f.calls[0].resolve(bytes());f.calls[1].resolve(bytes());await tick();await tick();
  assert.deepEqual(reads.slice(0,2).map(item=>item.result.value),[{tiny:true},{tiny:true}]);assert.equal(f.decodes,2);assert.equal(f.manager.stats().active,0);
 }finally{for(const item of reads)item.controller.abort();await f.drain();}
});

test('caller cancellation of active work rejects promptly but drains before starting the next queued request',async()=>{
 const f=controlled(),reads=[read(f.manager,'one'),read(f.manager,'two'),read(f.manager,'next')];
 try{
  await tick();reads[0].controller.abort();await tick();aborted(reads[0].result);
  assert(f.calls[0].signal.aborted);assert.equal(f.calls.length,2);assert.deepEqual(f.manager.stats(),{active:2,peak:2,queued:1});
  f.calls[0].resolve(bytes());await tick();await tick();
  assert.equal(f.calls.length,3);assert.equal(f.calls[2].path,'/safety/buildings3d/next.json');assert.equal(f.manager.stats().peak,2);
  f.calls[1].resolve(bytes());f.calls[2].resolve(bytes());await tick();await tick();
  assert.equal(f.decodes,2);assert.equal(reads[1].result.state,'fulfilled');assert.equal(reads[2].result.state,'fulfilled');
 }finally{for(const item of reads)item.controller.abort();await f.drain();}
});

test('a TypeError retries once and succeeds; other failures and a second TypeError release the slot',async()=>{
 const attempts=new Map();let decodes=0;
 const manager=createHarness({onDecode:()=>decodes++,async fetchBytes(path){const count=(attempts.get(path)??0)+1;attempts.set(path,count);if(path.includes('once')&&count===1||path.includes('twice'))throw new TypeError('tiny transport failure');if(path.includes('other'))throw Error('tiny permanent failure');return bytes();}});
 try{
  assert.deepEqual(await manager.readAsset('/once',new AbortController().signal,1024),{tiny:true});
  await assert.rejects(manager.readAsset('/twice',new AbortController().signal,1024),/3D asset \/twice: TypeError: tiny transport failure/);
  await assert.rejects(manager.readAsset('/other',new AbortController().signal,1024),/tiny permanent failure/);
  assert.deepEqual(await manager.readAsset('/success',new AbortController().signal,1024),{tiny:true});await tick();
  assert.deepEqual([...attempts.values()],[2,2,1,1]);assert.equal(decodes,2);assert.equal(manager.stats().active,0);
 }finally{manager.destroy();}
});

test('destroy during a transport failure prevents retry and later queued starts',async()=>{
 const f=controlled(),reads=[read(f.manager,'one'),read(f.manager,'two'),read(f.manager,'queued')];
 try{
  await tick();f.manager.destroy();f.calls[0].reject(new TypeError('late transport failure'));f.calls[1].resolve(bytes());await tick();await tick();
  for(const item of reads)aborted(item.result);
  assert.equal(f.calls.length,2);assert.equal(f.decodes,0);assert.equal(f.manager.stats().active,0);assert.equal(f.manager.stats().queued,0);
 }finally{for(const item of reads)item.controller.abort();await f.drain();}
});

test('already aborted callers and calls after destroy never enqueue work; repeated destroy is harmless',async()=>{
 const f=controlled(),controller=new AbortController();controller.abort();
 try{
  await assert.rejects(f.manager.readAsset('/before',controller.signal,1024),{name:'AbortError'});
  f.manager.destroy();f.manager.destroy();await assert.rejects(f.manager.readAsset('/after',new AbortController().signal,1024),{name:'AbortError'});
  await tick();assert.equal(f.calls.length,0);assert.deepEqual(f.manager.stats(),{active:0,peak:0,queued:0});
 }finally{await f.drain();}
});
