import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/safety/painted-map.ts',import.meta.url),'utf8');
const ast=ts.createSourceFile('painted-map.ts',source,ts.ScriptTarget.Latest,true);
function declaration(name){const found=[];function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)found.push('const '+node.getText(ast)+';');if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found.push(node.getText(ast));ts.forEachChild(node,visit);}visit(ast);assert.equal(found.length,1,name);return found[0];}
const helpers=['objectOf','scalar','scalars','PRESSURE_FIELDS','LEDGER_FIELDS','recordTransitionFailure'].map(declaration).join('\n');
const factory=Function('localDiagnostics','resourceStore',ts.transpileModule('let transitionFailure;'+helpers+'\nreturn {record:recordTransitionFailure,read:()=>transitionFailure};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);
function fixture(local=true){const ledger={bytes:100,limitBytes:1000,retiringBytes:20,recentBytes:10,lastPressure:{required:9999,label:'later refusal',requestedCosts:[{category:'read',bytes:9000}]},categories:{metadata:{bytes:60,exactBytes:10,estimatedBytes:50}}};return{ledger,api:factory(local,{budget:{stats:ledger}})};}
test('actual fallback diagnostic preserves thrown pressure separately from later ledger pressure',()=>{
 const {ledger,api}=fixture();const error=Object.assign(new Error('original refusal'),{name:'ResourceBudgetExceededError',details:{required:1001,capacity:1000,requestedCostCount:1,requestedCosts:[{category:'metadata',bytes:31,precision:'estimate',label:'identity'}]}});
 api.record('tier300',error);const row=api.read();assert.equal(row.provider,'tier300');assert.equal(row.errorPressure.required,1001);assert.equal(row.ledger.lastPressure.required,9999);assert.equal(row.errorPressure.requestedCosts[0].bytes,31);
 error.details.required=2000;error.details.requestedCosts[0].bytes=60;ledger.categories.metadata.bytes=900;assert.equal(row.errorPressure.required,1001);assert.equal(row.errorPressure.requestedCosts[0].bytes,31);assert.equal(row.ledger.categories.metadata.bytes,60);assert(Object.isFrozen(row));assert(Object.isFrozen(row.errorPressure.requestedCosts));
});
test('actual fallback diagnostic is bounded and does not manufacture error pressure',()=>{
 const {api}=fixture();api.record('church',new Error('x'.repeat(1000)));assert.equal(api.read().message.length,256);assert.equal(api.read().errorPressure,undefined);
 const error=Object.assign(new Error('budget'),{name:'ResourceBudgetExceededError',details:{label:'x'.repeat(1000),requestedCosts:Array.from({length:20},()=>({label:'y'.repeat(1000),bytes:5}))}});api.record('church',error);assert.equal(api.read().errorPressure.label.length,256);assert.equal(api.read().errorPressure.requestedCosts.length,4);assert.equal(api.read().errorPressure.requestedCosts[0].label.length,256);
});
test('diagnostics are local only and diagnostic failure cannot alter fallback',()=>{
 const {api}=fixture(false);api.record('church',new Error('fail'));assert.equal(api.read(),undefined);
 const broken=factory(true,{budget:{get stats(){throw Error('diagnostic unavailable');}}});assert.doesNotThrow(()=>broken.record('church',new Error('product failure')));assert.equal(broken.read(),undefined);
 const request=declaration('requestMode');assert(request.indexOf('recordTransitionFailure(stage,error)')<request.indexOf('own.abort();clearBytes();const rollback='));
});

test('local scene proof reads retained failure in 2D and respects disposal without preparing providers',()=>{
 const main=fs.readFileSync(new URL('../src/safety/main.ts',import.meta.url),'utf8'),tree=ts.createSourceFile('main.ts',main,ts.ScriptTarget.Latest,true);let getter;
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(tree)==='Object.defineProperty'&&node.arguments[1]?.getText(tree)==="'transitionFailure'")getter=node.arguments[2].getText(tree);ts.forEachChild(node,visit);}visit(tree);assert(getter);
 const make=Function('sceneProofDisposed','threeDimensional','return '+getter),snapshot={provider:'tier300'},reads=[];
 const owner={getResourceDiagnostics(rows){reads.push(rows);return{transitionFailure:snapshot};}};
 assert.strictEqual(make(false,owner).get(),snapshot);assert.deepEqual(reads,[[]]);assert.equal(make(true,owner).get(),undefined);assert.equal(reads.length,1);assert.equal(make(false,undefined).get(),undefined);
});
