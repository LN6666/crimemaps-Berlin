import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const text=await readFile(new URL('../src/painted/city/safety/munich-display-additions.ts',import.meta.url),'utf8');
const ast=ts.createSourceFile('munich-display-additions.ts',text,ts.ScriptTarget.Latest,true);
const declarations=new Map();
(function visit(node){if(ts.isFunctionDeclaration(node)&&['sourceOK','same'].includes(node.name?.text))declarations.set(node.name.text,node.getText(ast));if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='eq')declarations.set('eq','const '+node.getText(ast)+';');ts.forEachChild(node,visit);})(ast);
assert.equal(declarations.size,3);
function bind(groups){
 const js=ts.transpileModule([...declarations.values()].join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return new Function('groups','groupKeys','cityCohortIdentity',js+';return sourceOK;')(groups,['c319','c320','c322','c323'],(cohort,row)=>row.cohort===cohort);
}
const component=()=>({cohort:'c319',city:'munich',objectId:'source-owner',partId:'native-part',origin:[11.5,48.1],componentGeometry:{type:'Polygon',coordinates:[]},sourceFeature:{properties:{source:'verified'}},batches:[],proof:{sourceSHA256:'source-sha'}});
const context=rows=>({city:'munich',indexSHA:'index',sourcePBF:'pbf',boundarySHA:'boundary',sourceSnapshot:'snapshot',sourceAdmission:new Set(rows.map(r=>r.objectId+'|'+r.partId)),leafSHA:r=>r.proof.sourceSHA256});
const group=rows=>({native:rows,indexSHA:'index',sourcePBF:'pbf',boundarySHA:'boundary',sourceSnapshot:'snapshot'});

test('unrelated Munich cohorts remain cold even when source admission is present',()=>{
 const row=component(),needed=group([row]);let unrelatedReads=0;
 const cold=new Proxy({}, {get(){unrelatedReads++;throw Error('Frozen data resource was not prepared for this scope');}});
 const groups=[needed,cold,{},{}],sourceOK=bind(groups);
 assert.equal(sourceOK(cold,[row],context([row])),false);
 assert.equal(unrelatedReads,0);
 assert.equal(sourceOK(needed,[row],context([row])),true);
});

test('demanded cohorts still require prepared data and complete source verification',()=>{
 const row=component(),needed=group([row]),sourceOK=bind([needed,{}, {}, {}]);
 assert.equal(sourceOK(needed,[row],context([row])),true);
 assert.equal(sourceOK(needed,[row],{...context([row]),sourceAdmission:new Set()}),false);
 assert.equal(sourceOK(needed,[{...row,origin:[0,0]}],context([row])),false);
 assert.equal(sourceOK(needed,[row],{...context([row]),leafSHA:()=> 'wrong'}),false);
 const cold=new Proxy({}, {get(){throw Error('Frozen data resource was not prepared for this scope');}});
 assert.throws(()=>bind([cold,{}, {}, {}])(cold,[row],context([row])),/not prepared/);
});
