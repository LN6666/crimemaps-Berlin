import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// src-r3b: Bremen packCandidate forwards its batch scope to the owner display
// budget (R2 followups CDR[0]); freezeRuleSnapshot leaves typed-array leaves
// unfrozen (R2 fixtures CDR[0]); the owner-lazy aggregates carry no unused
// prepare bindings and a semantic registry name (R2 fixtures CDR[5]).
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(web,'src',relative),'utf8');
const sourceFile=(relative,text=read(relative))=>ts.createSourceFile(relative,text,ts.ScriptTarget.Latest,true);
function find(ast,predicate){const found=[];(function visit(node){if(predicate(node))found.push(node);ts.forEachChild(node,visit);})(ast);return found;}
const fn=(ast,name)=>{const nodes=find(ast,node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.equal(nodes.length,1,name);return nodes[0];};

test('Bremen packCandidate passes its prepared batch scope as the fourth fitOwnerDisplayBudget argument',()=>{
 const ast=sourceFile('painted/bremen/safety/building-mesh-renderer.ts'),pack=fn(ast,'packCandidate');
 const calls=find(pack,node=>ts.isCallExpression(node)&&node.expression.getText(ast)==='fitOwnerDisplayBudget');
 assert.equal(calls.length,1);assert.equal(calls[0].arguments.length,4);assert.equal(calls[0].arguments[3].getText(ast),'prepared?.scope');
 // currentDataScope is the same prepared scope this pack configures its programs with.
 assert.match(pack.getText(ast),/currentDataScope=prepared\?\.scope;/);
});

test('owner display budget forwards that scope to the bulk credit and an unmarked row result is unchanged by it',()=>{
 const text=read('painted/bremen/safety/owner-display-budget.ts'),seen=[];
 const js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};
 Function('require','exports',js)(id=>{assert.equal(id,'./infill-bulk-budget-credit');return{infillBulkBudgetCredit(components,scope){seen.push(scope);for(const c of components)if(c.displayEstimates?.infillFrankfurtLowOfficeBulk70)throw Error('fixture has no marked rows');return{vertices:0,indices:0,rows:0};}};},exports);
 const row=()=>({city:'bremen',objectId:'osm/way/1',partId:'osm/way/1/component/a',batches:[{positions:new Float32Array(9),indices:new Uint32Array([0,1,2])}]});
 const options={vertices:3,indices:3,originalSourceVertices:3,originalSourceIndices:3,ownerDeltaVertices:0,ownerDeltaIndices:0,protected:()=>false,batchIncluded:()=>true};
 const scope={label:'batch scope'},a=[row()],b=[row()];
 const without=exports.fitOwnerDisplayBudget(a,200000,options),withScope=exports.fitOwnerDisplayBudget(b,200000,options,scope);
 assert.deepEqual(seen,[undefined,scope]);
 assert.deepEqual({...withScope,components:undefined},{...without,components:undefined});assert.equal(withScope.components,b);assert.equal(without.components,a);
});

test('freezeRuleSnapshot freezes the cloned rule graph but leaves typed-array leaves as unfrozen private copies',()=>{
 const ast=sourceFile('painted/bremen/safety/bremen-owner-runtime.ts'),code=ts.transpileModule(fn(ast,'freezeRuleSnapshot').getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const freezeRuleSnapshot=Function(code+';return freezeRuleSnapshot;')();
 const shared={positions:new Float32Array([1,2,3]),indices:new Uint32Array([0,1,2]),view:new DataView(new ArrayBuffer(4))};
 const rows=structuredClone([{identity:{objectId:'a',partId:'b'},source:{batches:[shared]},display:{batches:[shared]}}]);
 assert.doesNotThrow(()=>freezeRuleSnapshot(rows));
 assert.ok(Object.isFrozen(rows)&&Object.isFrozen(rows[0])&&Object.isFrozen(rows[0].source.batches[0])&&Object.isFrozen(rows[0].identity));
 const batch=rows[0].source.batches[0];
 assert.equal(rows[0].display.batches[0],batch,'shared references stay shared inside the clone');
 assert.equal(Object.isFrozen(batch.positions),false);assert.deepEqual(Array.from(batch.positions),[1,2,3]);assert.deepEqual(Array.from(batch.indices),[0,1,2]);
 assert.notEqual(batch.positions,shared.positions,'the typed array is a private structuredClone copy');
 freezeRuleSnapshot(rows);assert.doesNotThrow(()=>freezeRuleSnapshot(Object.freeze({leaf:new Float32Array(2)})));
});

test('root500 aggregate imports no unused per-owner prepare binding; infill names its non-Berlin registry semantically',()=>{
 const rootText=read('painted/root500/safety/owner-reconstruction.ts'),rootAst=sourceFile('painted/root500/safety/owner-reconstruction.ts',rootText);
 const imported=find(rootAst,node=>ts.isImportSpecifier(node)).map(node=>node.name.text).filter(name=>/^prepareOwner\w*Reconstruction$/.test(name));
 assert.deepEqual(imported,[],'the aggregate prepares lazy owners only through its module wave');
 for(const name of ['prepareOwnerReconstructionModules','prepareOwnerReconstructionComponents','prepareOwnerReconstructionMaterials'])assert.match(rootText,new RegExp('export async function '+name+'\\('));
 const infillText=read('painted/infill/safety/owner-reconstruction.ts'),infillAst=sourceFile('painted/infill/safety/owner-reconstruction.ts',infillText);
 const registry=find(infillAst,node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='../../root500/safety/owner-nonberlin-lazy'&&!!node.importClause?.namedBindings&&ts.isNamespaceImport(node.importClause.namedBindings));
 assert.equal(registry.length,1);assert.equal(registry[0].importClause.namedBindings.name.text,'infillNonBerlinOwnerRegistry');
 assert.ok(!/\binfillOwnerModule155\b/.test(infillText));
 assert.match(infillText,/export const infillDataDependencies=\(\):readonly InfillDataModule\[\]=>\[[^\]]*\binfillNonBerlinOwnerRegistry\b/);
 assert.ok(infillText.includes('registry=infillNonBerlinOwnerRegistry.startNonBerlinOwnerRouteModules?.(components,signal)'));
});
