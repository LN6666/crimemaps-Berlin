import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source=fs.readFileSync(new URL('../src/painted/tier300/safety/building-mesh-renderer.ts',import.meta.url),'utf8');
const start=source.indexOf(" type SourcePreparationStage="),end=source.indexOf(' function prepareMaterialSource(){',start);
assert(start>=0&&end>start);
const code=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
function fixture(){let now=0;const api=Function('performance',code+';return {measureSourcePreparation,sourcePreparationSnapshot};')({now:()=>now});return {...api,advance:ms=>now+=ms};}
test('Tier300 preparation timings preserve return values and measure exceptional work',()=>{
 const h=fixture(),value={};
 assert.equal(h.measureSourcePreparation('chunk-plan',()=>{h.advance(18);return value;}),value);
 const error=new Error('controlled preparation failure');
 assert.throws(()=>h.measureSourcePreparation('chunk-plan',()=>{h.advance(7);throw error;}),e=>e===error);
 assert.deepEqual(h.sourcePreparationSnapshot(),{'chunk-plan':{calls:2,totalMs:25,maxMs:18,lastMs:7}});
});
test('Tier300 preparation snapshots do not expose mutable counters or retain return values',()=>{
 const h=fixture();h.measureSourcePreparation('material-source',()=>{h.advance(2);return {largeSource:'private'};});
 const snapshot=h.sourcePreparationSnapshot();snapshot['material-source'].calls=999;
 assert.deepEqual(h.sourcePreparationSnapshot(),{'material-source':{calls:1,totalMs:2,maxMs:2,lastMs:2}});
 assert(!JSON.stringify(h.sourcePreparationSnapshot()).includes('private'));
});
