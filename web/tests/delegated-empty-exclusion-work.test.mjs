import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../src/painted/delegated500/safety/building-mesh-renderer.ts',import.meta.url),'utf8');
const ast=ts.createSourceFile('renderer.ts',source,ts.ScriptTarget.Latest,true);
let packing,filter;
(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='packResidentBatchesSteps')packing=node;if(ts.isFunctionDeclaration(node)&&node.name?.text==='filterConstructionComponents')filter=node;ts.forEachChild(node,visit);})(ast);
const compile=code=>ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const arrayRules=['f269640.suppressed','f285634.suppressed','f235631.suppressed','f244627.suppressed','f244622.suppressed','f244619.suppressed','f358604.suppressed','f303Deferred582','f355559.suppressed','f248551.held','underground683'];
const keyedRules=['f238595','f363518','f302576','f302554'];
const rules=[...arrayRules.map(name=>({name,kind:'array'})),...keyedRules.map(name=>({name,kind:'keys'})),{name:'nativeHeld',kind:'set'}];
function fixture(rule,removed){
 const token=rule.kind==='array'?`${rule.name}.includes(c)`:rule.kind==='keys'?`${rule.name}.held.has(key(c))`:'nativeHeld.has(c)';
 const statements=packing.body.statements.filter(node=>node.getText(ast).includes('yield*filterConstructionComponents(components,c=>!'+token));
 assert.equal(statements.length,1,rule.name+' actual exclusion statement');
 const root=rule.name.split('.')[0],property=rule.name.split('.')[1];
 const value=rule.kind==='keys'?{held:new Set(removed.slice(0,1).map(row=>row.id)),suppressed:new Set(removed.slice(1).map(row=>row.id))}:rule.kind==='set'?new Set(removed):property?{[property]:removed}:removed;
 const code=compile(filter.getText(ast)+'\nfunction* run(components){'+statements[0].getText(ast)+';return components;}');
 return Function(root,'key',code+';return run;')(value,row=>row.id);
}
function drain(iterator){let yields=0;for(;;){const next=iterator.next();if(next.done)return{rows:next.value,yields};yields++;}}
const rows=Array.from({length:4096},(_,id)=>Object.freeze({id}));
for(const rule of rules){
 test(rule.name+': empty exclusions do not traverse or schedule the whole unchanged cohort',()=>{
  const result=drain(fixture(rule,[])(rows));
  assert.deepEqual(result.rows,rows);assert.equal(result.yields,0,'no scheduler quanta for an empty exclusion pass');
 });
 test(rule.name+': real exclusions preserve identity/order and bounded continuations',()=>{
  const removed=[rows[3],rows[4094]],result=drain(fixture(rule,removed)(rows));
  assert.deepEqual(result.rows,rows.filter(row=>!removed.includes(row)));
  assert(result.yields>=rows.length/16,'nonempty pass keeps the existing cooperative work bound');
 });
}
