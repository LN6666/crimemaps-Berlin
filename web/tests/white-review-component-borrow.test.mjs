import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function initializer(ast,name){
 const matches=[];
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name&&node.initializer)matches.push(node.initializer);ts.forEachChild(node,visit);}
 visit(ast);assert.equal(matches.length,1,name+' is an actual unique export serializer binding');return matches[0].getText(ast);
}
function evaluate(expression,bindings){
 const code=ts.transpileModule('const value=('+expression+');',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 return new Function(...Object.keys(bindings),code+'\nreturn value;')(...Object.values(bindings));
}
function component(scale,leaf){
 return{objectId:'osm/way/1',partId:'osm/way/1/component/tiny',origin:[8,53],componentGeometry:{type:'Polygon',coordinates:[[[8,53],[8+.001*scale,53],[8,53+.001*scale],[8,53]]]},sourceFeature:{type:'Feature',id:1,properties:{name:'original'},geometry:{type:'Polygon',coordinates:[]}},sourceLeaf:leaf,source:'native',leafId:leaf+'-id',batches:[{positions:new Float32Array([-0,0,0,scale,0,0,0,scale,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),indices:new Uint32Array([0,1,2]),color:[.2,.3,.4]}]};
}

test('both white-review serializers borrow original full components and preserve the existing payload shape and native signatures',()=>{
 for(const file of ['safety/white-review-export.ts','painted/city/safety/white-review-export.ts']){
  const url=new URL('../src/'+file,import.meta.url),text=fs.readFileSync(url,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),signatureText=fs.readFileSync(new URL('./progressive-native-signature.ts',url),'utf8'),signatureModule={exports:{}};
  const signatureCode=ts.transpileModule(signatureText,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  new Function('module','exports',signatureCode)(signatureModule,signatureModule.exports);
  const surface=component(2,'surface-leaf'),source=component(1,'source-leaf'),before=structuredClone({surface,source}),signed=[],calls=[],identity={objectId:source.objectId,partId:source.partId},missing={objectId:'absent',partId:'absent/part'},known=new Set([surface,source]);
  const serializeNative=evaluate(initializer(ast,'serializeNative'),{nativePaintSignature(value){assert(known.has(value),'native signature must receive the actual borrowed component');signed.push(value);return signatureModule.exports.nativePaintSignature(value);}});
  const renderer={getComponent(){assert.fail('narrow public metadata cannot serialize full geometry');},getSurfaceComponent(){assert.fail('white review must not request a public full clone');},getSourceComponent(){assert.fail('white review must not request a public source clone');},borrowSurfaceComponent(id){calls.push(['surface',id]);return id===identity?surface:undefined;},borrowSourceComponent(id){calls.push(['source',id]);return id===identity?source:undefined;}};
  const actual=evaluate(initializer(ast,'diagnosticNativeReadback'),{row:{diagnosticIdentities:[identity,missing]},ready:{renderer},serializeNative});
  const expected=value=>({objectId:'osm/way/1',partId:'osm/way/1/component/tiny',origin:[8,53],componentGeometry:value===surface?before.surface.componentGeometry:before.source.componentGeometry,geometrySignature:signatureModule.exports.nativePaintSignature(value),sourceMetadata:{sourceLeaf:value.sourceLeaf,source:'native',leafId:value.leafId},componentKeys:Object.keys(value),batches:[{positions:value===surface?[-0,0,0,2,0,0,0,2,0]:[-0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2]}]});
  assert.deepEqual(actual,[{identity,surface:expected(surface),source:expected(source)},{identity:missing,surface:null,source:null}],file);
  assert.deepEqual(signed,[surface,source]);assert.deepEqual(calls,[['surface',identity],['source',identity],['surface',missing],['source',missing]]);assert.deepEqual({surface,source},before);
  assert.ok(Object.is(actual[0].surface.batches[0].positions[0],-0));assert.equal(JSON.stringify(actual),JSON.stringify([{identity,surface:expected(surface),source:expected(source)},{identity:missing,surface:null,source:null}]));
 }
});
