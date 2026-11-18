import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Deferred to the one coordinated verification phase; no browser/GL is needed.
const repo=fileURLToPath(new URL('../..',import.meta.url)),require=createRequire(path.join(repo,'web/package.json'));
const {build}=require('esbuild');
const output=await build({stdin:{contents:"export * from './safety/prospective-solar-projection';",resolveDir:path.join(repo,'web/src'),loader:'ts'},
 bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].contents).toString('base64'));
const component={origin:[8.8,53.1],box:[-50,0,-40,50,20,40]};
const options={components:[component],direction:[.4,.7,.3],quality:'balanced',maximumGeometryErrorM:.25};

test('a verified scene epoch and the leaf use one capture envelope without changing target resolution',()=>{
 const leaf=api.createProspectiveSceneSolarProjection(options).requiredCoverageBounds;
 const scene=[leaf[0]-1e-4,leaf[1]-2e-4,leaf[2],leaf[3]+1e-4,leaf[4]+2e-4,leaf[5]];
 const before=scene.slice(),value=api.createProspectiveSceneSolarProjection({...options,sceneCoverageBounds:scene});
 assert.deepEqual(value.requiredCoverageBounds,scene);assert.deepEqual(scene,before);
 assert.equal(value.targetSizeUpperBound,512);
 const expanded=api.createProspectiveSceneSolarProjection({...options,sceneCoverageBounds:[leaf[0],leaf[1],leaf[2],leaf[0],leaf[1],leaf[2]]});
 assert.deepEqual(expanded.requiredCoverageBounds,leaf,'a new leaf outside the epoch still expands the required capture');
 for(const invalid of [[NaN,0,0,1,1,1],[1,0,0,0,1,1]])assert.equal(api.createProspectiveSceneSolarProjection({...options,sceneCoverageBounds:invalid}),undefined);
 // Compare the exact local projected displacement; no arbitrary screen camera.
 const local=api.createProspectiveSceneSolarProjection(options).project(component.origin).matrix;
 const full=value.project(component.origin).matrix;
 assert(Math.hypot(full[0],full[1])<Math.hypot(local[0],local[1]));
});

test('prospective solar frame uses source-local metre projection and an explicit required envelope',()=>{
 const before=structuredClone(component),value=api.createProspectiveSceneSolarProjection(options);assert(value);
 assert.equal(value.targetSizeUpperBound,512);assert(api.sceneSolarCoverageContains(value.requiredCoverageBounds,value.requiredCoverageBounds));
 const projected=value.project(component.origin);assert(projected);assert.equal(projected.viewport.drawingBufferWidth,512);
 for(let corner=0;corner<8;corner++){
  const p=[component.box[corner&1?3:0],component.box[corner&2?4:1],component.box[corner&4?5:2]],m=projected.matrix;
  for(let row=0;row<3;row++){const value=m[row]*p[0]+m[4+row]*p[1]+m[8+row]*p[2]+m[12+row];assert(Math.abs(value)<=1+1e-6);}
 }
 assert.deepEqual(component,before);
});

test('actual solar coverage must include the prospective envelope and union does not admit completeness',()=>{
 const value=api.createProspectiveSceneSolarProjection(options),b=value.requiredCoverageBounds;
 const smaller=[b[0]+1e-8,b[1],b[2],b[3]-1e-8,b[4],b[5]];
 assert.equal(api.sceneSolarCoverageContains(smaller,b),false);
 const merged=api.mergeSceneSolarCoverageBounds(smaller,b);assert(api.sceneSolarCoverageContains(merged,b));
 assert.equal(merged.complete,undefined);assert.equal(api.mergeSceneSolarCoverageBounds([NaN,0,0,1,1,1],b),undefined);
});

test('invalid/unknown solar geometry stays unavailable and mobile target stays bounded',()=>{
 assert.equal(api.createProspectiveSceneSolarProjection({...options,components:[]}),undefined);
 assert.equal(api.createProspectiveSceneSolarProjection({...options,direction:[1,0,0]}),undefined);
 assert.equal(api.createProspectiveSceneSolarProjection({...options,maximumGeometryErrorM:1}),undefined);
 const value=api.createProspectiveSceneSolarProjection({...options,quality:'detail',mobile:true});assert.equal(value.targetSizeUpperBound,512);
});
