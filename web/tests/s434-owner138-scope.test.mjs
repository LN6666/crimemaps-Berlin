import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';

const web=fileURLToPath(new URL('../',import.meta.url));
const built=await build({
  stdin:{contents:`export * from './src/painted/root500/safety/s434-owner138-compat';
    export * from './src/painted/root500/safety/owner-f138-reconstruction';
    export {createFrozenDataScope} from './src/safety/frozen-data-scope';`,resolveDir:web,loader:'ts'},
  bundle:true,write:false,format:'esm',platform:'node',target:'es2022',
  plugins:[{name:'already-attested-cohort',setup(b){
    // This regression starts after the separate native-cohort attestation.
    // Execute the real compatibility check, F138 reconstruction and scope.
    b.onLoad({filter:/root500\/safety\/s434-aggregate-display\.ts$/},()=>({contents:'export const s434AggregateBatchIncluded=()=>false;',loader:'ts'}));
    if(process.env.S434_BASELINE_COMPAT)b.onLoad({filter:/root500\/safety\/s434-owner138-compat\.ts$/},args=>({contents:fs.readFileSync(process.env.S434_BASELINE_COMPAT,'utf8'),loader:'ts',resolveDir:fileURLToPath(new URL('../src/painted/root500/safety/',import.meta.url))}));
  }}],
});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=s434-owner138-scope-bundle.mjs\n').toString('base64'));
const selected=['osm/way/72449471','osm/way/174487228'];

async function fixture(){
  const displays={};let releases=0;
  const scope=api.createFrozenDataScope({async acquire(ref,signal){
    signal.throwIfAborted();assert.deepEqual(ref,api.root500DataRefs[0]);
    return{borrow:read=>read(displays),release(){releases++;}};
  }});
  await scope.prepare(api.root500DataRefs,new AbortController().signal);
  const canonical=api.getRoot500Data(scope).SOURCE;
  const sources=selected.map(objectId=>{
    const id=api.F138_IDS.find(row=>row.objectId===objectId);
    const source={...structuredClone(canonical[id.partId]),city:'frankfurt',objectId,partId:id.partId};
    displays[id.partId]=source.batches.map(batch=>({...structuredClone(batch),frames:Array(batch.positions.length/3*5).fill(.2),paint:Array(batch.positions.length/3*4).fill(.3),writeMask:Array(batch.positions.length/3).fill(true)}));
    return source;
  });
  const actual=api.ownerF138Reconstruction(sources,scope);
  assert.equal(actual.stats.objects,2);assert.equal(actual.stats.error,undefined);
  for(let i=0;i<5;i++)sources.push({city:'frankfurt',objectId:'fixture/'+i,partId:'part/'+i,batches:[],origin:[8.6,50.1],componentGeometry:{},sourceFeature:{}});
  return{scope,sources,drawable:[...actual.components,...sources.slice(2)],entries:sources.map(component=>({component})),index:new Map(sources.map(c=>[c.objectId+'|'+c.partId,c])),get releases(){return releases;}};
}

test('attested F138 display validation receives its prepared scope and still rejects modified display arrays',async()=>{
  const f=await fixture();
  try{
    const check=rows=>api.checkS434Owner138Replacement({},f.entries,f.index,rows,f.scope);
    assert.equal(check(f.drawable)?.exactOwnerDisplayMembers,2);
    const changed=structuredClone(f.drawable[0]);changed.batches[0].positions[0]+=.25;
    assert.equal(check([changed,...f.drawable.slice(1)]),null);
    assert.equal(check(f.drawable)?.unchangedLegacyDisplayMembers,5);
  }finally{f.scope.release();}
  assert.equal(f.releases,1);
});

test('missing preparation remains an error rather than silently accepting the display',async()=>{
  const f=await fixture();
  try{assert.throws(()=>api.checkS434Owner138Replacement({},f.entries,f.index,f.drawable),/requires a prepared FrozenDataScope/);}
  finally{f.scope.release();}
});
