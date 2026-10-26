import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const rendererURL=new URL('../src/painted/city/safety/building-mesh-renderer.ts',import.meta.url);
const source=await fs.readFile(rendererURL,'utf8');
const ast=ts.createSourceFile(rendererURL.pathname,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const expressions=[];
function visit(node){
  if(ts.isGetAccessorDeclaration(node)&&node.name.getText(ast)==='stats'){
    for(const statement of node.body?.statements??[]){
      if(!ts.isReturnStatement(statement)||!statement.expression||!ts.isObjectLiteralExpression(statement.expression))continue;
      const property=statement.expression.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(ast)==='c311');
      if(property)expressions.push(property.initializer.getText(ast));
    }
  }
  ts.forEachChild(node,visit);
}
visit(ast);
assert.equal(expressions.length,1,'locate the actual production stats.c311 expression');
const read=new Function('city','loaded','c311Display','c311Presence','c311CaptureDisplayStatus','c311Context','c311Failure',`return (${expressions[0]});`);

test('C311 diagnostics do not scan other cities and retain Munich presence/readiness inputs',()=>{
  for(const city of ['berlin','hamburg','cologne','frankfurt','dusseldorf','stuttgart','leipzig','dortmund','bremen','essen','dresden','hannover','nuremberg']){
    const forbidden=()=>{throw Error(`${city} must not enumerate or validate Munich C311 components`);};
    assert.equal(read(city,{values:forbidden},{enabled:false},forbidden,forbidden,undefined,undefined),undefined);
  }
  // An inactive Munich display must still report its actual native presence;
  // enabled=false is not permission to bypass the original readiness diagnostics.
  const component={objectId:'native-fixture',partId:'part-1'},rows=[component,component];
  for(const enabled of [false,true]){
    const calls=[],pathsReady={color:true,shadow:false,pick:true};
    const loaded={values(){calls.push('values');return rows.values();}};
    const presence=input=>{calls.push('presence');assert.deepEqual(input,rows);return{native:2,added:0,expectedNative:2,expectedAdded:20};};
    const capture=(input,on,paths)=>{calls.push('capture');assert.deepEqual(input,rows);assert.equal(input[0],component);assert.equal(input[1],component);assert.equal(on,enabled);assert.equal(paths,pathsReady);return{complete:false,displayManifestSHA256:'fixture-sha',sourceGeometryAdded:0};};
    assert.deepEqual(read('munich',loaded,{enabled,wholeParentHidden:false},presence,capture,{pathsReady},'original failure'),{enabled,wholeParentHidden:false,native:2,added:0,expectedNative:2,expectedAdded:20,complete:false,displayManifestSHA256:'fixture-sha',sourceGeometryAdded:0,pathsReady,failure:'original failure',geometryProvenance:'addedapprox',nativeArraysModified:false});
    assert.deepEqual(calls,['values','presence','values','capture']);
  }
});
