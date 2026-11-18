import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const filename=new URL('../src/safety/main.ts',import.meta.url),text=fs.readFileSync(filename,'utf8'),ast=ts.createSourceFile(filename.pathname,text,ts.ScriptTarget.Latest,true),nodes=[];
(function visit(node){nodes.push(node);ts.forEachChild(node,visit);})(ast);
const registrations=nodes.filter(node=>ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(ast)==='map'&&node.expression.name.text==='on'&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='render'&&node.arguments[1]?.getText(ast).includes('getGrowthSamplingState'));
assert.equal(registrations.length,1,'use the actual growth diagnostic render listener');
const declarations=['growthFrames','wasGrowing','frameTimes'].map(name=>{
 const matches=nodes.filter(node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name);
 assert.equal(matches.length,1,'actual diagnostic state: '+name);
 return 'let '+matches[0].getText(ast)+';';
});
const compiled=ts.transpileModule([...declarations,registrations[0].getText(ast)+';'].join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const install=new Function('map','threeDimensional','performance',compiled+'\nreturn {get samples(){return growthFrames;},get wasGrowing(){return wasGrowing;}};');

// The production listener and its state declarations execute unchanged.
// Only the renderer observation, render event and clock are controlled.
function fixture(){
 const state={generation:1,components:2,activeBirths:0,minGrowth:1,maxGrowth:1,enabled:true,ready:true,pageHidden:false};
 let render,lightReads=0,fullReads=0,time=0;
 const renderer={getGrowthSamplingState(){lightReads++;return{activeBirths:state.activeBirths,enabled:state.enabled,pageHidden:state.pageHidden};},growthSnapshot(){fullReads++;return{...state};}};
 const observed=install({isMoving:()=>false,on(name,callback){assert.equal(name,'render');render=callback;}},{renderer},{now:()=>++time});
 assert.equal(typeof render,'function');
 return{render(next={}){Object.assign(state,next);render();},get lightReads(){return lightReads;},get fullReads(){return fullReads;},get samples(){return observed.samples;},get wasGrowing(){return observed.wasGrowing;}};
}

test('diagnostic idle renders do not read a complete growth snapshot',()=>{
 const f=fixture();
 for(let i=0;i<20;i++)f.render();
 assert.equal(f.lightReads,20);
 assert.equal(f.fullReads,0,'idle gating must happen before the resident geometry scan');
 assert.equal(f.samples.length,0);
 assert.equal(f.wasGrowing,false);
});

test('diagnostic growth keeps the first active frame and exactly one settled frame',()=>{
 const f=fixture();
 f.render({activeBirths:2,minGrowth:0,maxGrowth:.25});
 f.render({activeBirths:1,minGrowth:.5,maxGrowth:1});
 f.render({activeBirths:0,minGrowth:1,maxGrowth:1});
 f.render();
 assert.equal(f.fullReads,3);
 assert.deepEqual(f.samples.map(row=>row.activeBirths),[2,1,0]);
 assert.deepEqual(f.samples.map(row=>[row.minGrowth,row.maxGrowth]),[[0,.25],[.5,1],[1,1]]);
 assert(f.samples.every(row=>row.evidence==='source-owned growth state after native MapLibre render event'));
 assert.equal(f.wasGrowing,false);
});

test('hidden and not-ready growth does not create successful diagnostic records',()=>{
 for(const blocked of [{pageHidden:true},{ready:false}]){
  const f=fixture();
  f.render({...blocked,activeBirths:1,minGrowth:.25,maxGrowth:.25});
  assert.equal(f.fullReads,1,'active growth remains observable before readiness filtering');
  assert.equal(f.samples.length,0);
  f.render({activeBirths:0,minGrowth:1,maxGrowth:1});
  assert.equal(f.samples.length,0,'a blocked final frame is not reported as a successful draw');
  f.render({pageHidden:false,ready:true,activeBirths:1,minGrowth:.5,maxGrowth:.5});
  f.render({activeBirths:0,minGrowth:1,maxGrowth:1});
  assert.deepEqual(f.samples.map(row=>row.activeBirths),[1,0]);
  assert.equal(f.wasGrowing,false);
 }
});
