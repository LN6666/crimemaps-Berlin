// Bremen's Frankfurt Bulk70 route reads its original builder's data through the
// batch FrozenDataScope (DECISIONS 2026-11-02 01:35, fix one; S2 managers F2
// and CDR[6]). The Bremen manager prepares Bulk70 in that scope before the
// renderer's preparation; the owner aggregate's stage generator now hands the
// same scope to the Bulk70 reconstruct call (selected queues stay undefined),
// and every other owner-selected infill stage keeps its one-argument call.
// bremenScopedCall forwards an unregistered function's arguments verbatim, so
// the loader's reconstruct(components,undefined,scope) receives it. The
// production generator and dispatcher are evaluated in a fixture scope; stage
// functions are named inert stubs, so identity selects exactly one stage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceFile,install} from './support/renderers-a-scope.mjs';

const stats=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,components:[]});
function stages(scope,city='frankfurt'){
 const values={
  bremenScopedCall(fn,args){const name=fn?.inertName??'';if(/RemoveDuplicateNativeParts$/.test(name))return args[0];if(/Identity$/.test(name))return false;return{components:args[0],stats:stats()};},
 };
 install(sourceFile('bremen','owner-reconstruction.ts'),values,{functions:['captureBremenReplacements','applyBremenReplacements','bremenOwnerStages']});
 const rows=[{city,objectId:'osm/way/1',partId:'osm/way/1/component/fixture',batches:[]}],calls=[];
 const generator=values.bremenOwnerStages(rows,undefined,undefined,scope);let next=generator.next(),steps=0;
 while(!next.done){
  assert.ok(++steps<2000,'bounded stage sequence');const stage=next.value;let value;
  if(stage.kind==='frozen')value={components:stage.components,stats:stats()};
  else if(stage.kind==='call'){calls.push(stage);value={components:stage.args[0],stats:stats()};}
  next=generator.next(value);
 }
 return{calls,result:next.value};
}

test('Bremen aggregate: the Bulk70 reconstruct stage receives the batch scope, other stages keep one argument',()=>{
 const scope={label:'batch scope'},{calls}=stages(scope);
 const bulk=calls.filter(stage=>stage.fn.inertName==='infillFrankfurtLowOfficeBulk70Reconstruction');
 assert.equal(bulk.length,1,'one Bulk70 stage');
 assert.equal(bulk[0].args.length,3);assert.equal(bulk[0].args[0],bulk[0].components,'the predecessor output');
 assert.equal(bulk[0].args[1],undefined,'no selected queues, as before');assert.equal(bulk[0].args[2],scope,'the batch scope itself');
 const others=calls.filter(stage=>stage!==bulk[0]);
 assert.ok(others.length>50,'the owner-selected infill stages all ran');
 for(const stage of others)assert.deepEqual(stage.args,[stage.components],stage.fn.inertName+' keeps its one-argument call');
});

test('Bremen aggregate: without a scope (synchronous callers) the Bulk70 call is unchanged in effect',()=>{
 const {calls}=stages(undefined),bulk=calls.find(stage=>stage.fn.inertName==='infillFrankfurtLowOfficeBulk70Reconstruction');
 assert.deepEqual(bulk.args.slice(1),[undefined,undefined]);
});

test('bremenScopedCall forwards an unregistered stage function its arguments verbatim',()=>{
 const values={localMaterialCalls:new Map(),infillCalls:new Map(),calls:new Map()};
 install(sourceFile('bremen','bremen-recipe-stages.ts'),values,{functions:['bremenScopedCall']});
 const scope={label:'batch scope'},rows=[{}],seen=[];
 const reconstruct=(...args)=>{seen.push(args);return'result';};
 assert.equal(values.bremenScopedCall(reconstruct,[rows,undefined,scope],scope),'result');
 assert.equal(seen.length,1);assert.equal(seen[0].length,3);assert.equal(seen[0][0],rows);assert.equal(seen[0][1],undefined);assert.equal(seen[0][2],scope);
});
