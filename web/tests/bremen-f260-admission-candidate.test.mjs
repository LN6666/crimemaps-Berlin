import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const web=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(path.join(web,'package.json')),ts=require('typescript');
const base=path.join(web,'src/painted/bremen/safety');
const [runtimeSource,progressiveSource,dataSource,scopeSource]=await Promise.all([
  readFile(path.join(base,'f260-accepted-restore-runtime.ts'),'utf8'),
  readFile(path.join(base,'progressive-paint.ts'),'utf8'),
  readFile(path.join(base,'f260-accepted-restore-data.ts'),'utf8'),
  readFile(path.join(web,'src/safety/frozen-data-scope.ts'),'utf8'),
]);
function load(source,deps={}){
  const module={exports:{}};
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  Function('require','module','exports',js)(name=>{assert(name in deps,'unexpected import '+name);return deps[name];},module,module.exports);
  return module.exports;
}
const scopeRequire=(await import('./support/fixtures-managers-a-runtime.mjs')).createRuntimeLoader().scopeRequire();
const {createFrozenDataScope}=load(scopeSource,{'./render-runtime/resource-budget':scopeRequire('./render-runtime/resource-budget'),'./reconstruction-resource-parents':scopeRequire('./reconstruction-resource-parents')}),dataModule=load(dataSource);
// The actual demand metadata modules (24c2bda) that progressive paint now selects recipes by.
const bremenMetadata=(await import('./support/fixtures3-bremen-metadata.mjs')).bremenMetadataModules();
const DATA=dataModule.F260_ACCEPTED_RESTORE_DATA_RESOURCE;
const ADMISSIONS={canonicalSHA256:'a'.repeat(64),file:'tiny/admissions.ts',occurrence:0,codec:'json'};
const signal=()=>new AbortController().signal;
const id={objectId:'osm/way/1',partId:'osm/way/1/component/known'};
const unknown={objectId:'osm/way/999',partId:'osm/way/999/component/unknown'};
const candidate=(module,c)=>{
  assert.equal(module,'f260-accepted-restore-runtime');
  return c.objectId+'|'+c.partId===id.objectId+'|'+id.partId;
};

function fixture(){
  const calls={acquire:[],f260Reads:0,admissionsReads:0,release:0};
  const model={
    profile:{...id,geometrySignature:'geometry-fixture',sha256:'f'.repeat(64),vertices:1,triangles:0},
    sourceCarrier:{objectId:'osm/way/2',partId:'native-parent',signature:'source-fixture',leafSHA256:'l'.repeat(64)},
    asset:{origin:[8.8,53.07],componentGeometry:{type:'Polygon',coordinates:[]},sourceFeature:{type:'Feature',properties:{fixture:true}},batches:[{
      positions:[0,0,0],normals:[0,1,0],indices:[],color:[.1,.2,.3],
    }]},
    legacyMaterialRole:15,
  };
  const component={...id,city:'bremen',signature:'geometry-fixture',...structuredClone(model.asset),displayEstimates:{
    acceptedF260Restore:{patchSHA256:dataModule.F260_ACCEPTED_RESTORE_SHA,sourceCarrier:structuredClone(model.sourceCarrier)},
  }};
  component.batches[0].paint=new Float32Array([.58,.59,.52,2]);
  component.batches[0].frames=new Float32Array([0,0,27.6,15,1635]);
  const value={models:[model]},client={async acquire(ref){calls.acquire.push(ref);let live=true;return{
    borrow(read){assert(live);return read(ref.canonicalSHA256===DATA.canonicalSHA256?value:[]);},
    release(){if(live){live=false;calls.release++;}},
  };}};
  const originalData={...dataModule,getF260_ACCEPTED_RESTORE_DATA(scope){calls.f260Reads++;return dataModule.getF260_ACCEPTED_RESTORE_DATA(scope);}};
  const metadata={bremenIdentityMatches:(name,c)=>candidate('f260-accepted-restore-runtime',c),bremenIdentityCandidate:candidate};
  const runtime=load(runtimeSource,{
    './bremen-identity-metadata':metadata,'./bremen-recipe-demand':bremenMetadata['./bremen-recipe-demand'],'./f260-accepted-restore-data':originalData,
    './progressive-native-signature':{nativePaintSignature:c=>c.signature},
    './f260-caps710':{applyF260CapsPaint710(){throw Error('Unrelated material applicator');}},
    './f260-figures715':{applyF260FiguresPaint715(){throw Error('Unrelated material applicator');}},
  });
  const progressive=load(progressiveSource,{
    './bremen-identity-metadata':metadata,'./bremen-recipe-demand':bremenMetadata['./bremen-recipe-demand'],'./progressive-paint-admissions':{
      PROGRESSIVE_ADMISSIONS_RESOURCE:ADMISSIONS,PROGRESSIVE_INPUT_SHA:'a'.repeat(64),
      getPROGRESSIVE_ADMISSIONS(scope){calls.admissionsReads++;return scope.borrow(ADMISSIONS,x=>x);},
    },
    './f260-accepted-restore-runtime':runtime,'./f260-accepted-restore-data':originalData,
    './progressive-merged-tower-family':{validProgressiveNativeFamily(){return true;}},
    './progressive-paint-validation':{progressivePaintValidation(){}},
    './progressive-native-signature':{nativePaintSignature:c=>c.signature},
    './frozen-paint-ids':{FROZEN_PAINT_IDS:new Set()},
    './progressive-feature-glsl':{PROGRESSIVE_FEATURE_SHA:'b'.repeat(64)},
  });
  return{runtime,progressive,component,model,value,calls,scope:()=>createFrozenDataScope(client)};
}

test('direct F260 unknown and foreign unknown admission never read or require a model scope',()=>{
  const f=fixture();
  for(const city of ['bremen','essen','berlin',undefined]){
    assert.equal(f.runtime.f260AcceptedRestoreAdmission({...f.component,...unknown,city}),undefined);
  }
  assert.equal(f.calls.f260Reads,0);assert.equal(f.calls.acquire.length,0);
  assert.throws(()=>f.runtime.f260AcceptedRestoreAdmission(f.component),/Frozen data scope required/,
    'a positive metadata candidate still requires actual prepared model data');
});

test('progressive resource hook keeps admissions and includes F260 only for an identity candidate',()=>{
  const f=fixture(),select=f.progressive.MODULE_SCOPE_RESOURCES_FOR_COMPONENTS;
  for(const components of [[],[unknown],[{...unknown,city:'bremen'}],[{...unknown,city:'essen'}]]){
    assert.deepEqual(select(components),[ADMISSIONS]);
  }
  for(const components of [[id],[{...id,city:'bremen'}],[{...id,city:'essen'}],[unknown,id,id]]){
    assert.deepEqual(select(components),[ADMISSIONS,DATA]);
  }
  assert.deepEqual(f.progressive.MODULE_SCOPE_RESOURCES,[ADMISSIONS,DATA]);
  assert.equal(f.calls.f260Reads,0);assert.equal(f.calls.acquire.length,0);
});

test('actual progressive cold unknown paths work with only admissions prepared',async()=>{
  const f=fixture(),scope=f.scope();await scope.prepare([ADMISSIONS],signal());
  for(const city of ['bremen','essen','berlin']){
    assert.equal(f.progressive.progressiveAdmission({...f.component,...unknown,city},scope),undefined);
  }
  assert.equal(f.calls.f260Reads,0);assert.deepEqual(f.calls.acquire,[ADMISSIONS]);
  assert.equal(f.calls.admissionsReads,1,'same scope reuses the unchanged admission map');
  scope.release();assert.equal(f.calls.release,1);
});

test('positive candidate admission still validates original model, arrays, paint, marker and city',async()=>{
  const f=fixture(),scope=f.scope();await scope.prepare(f.progressive.MODULE_SCOPE_RESOURCES_FOR_COMPONENTS([f.component]),signal());
  const row=f.runtime.f260AcceptedRestoreAdmission(f.component,scope);
  assert.equal(row.geometrySignature,f.model.profile.geometrySignature);
  assert.equal(row.originalAcceptedAssetSHA256,f.model.profile.sha256);assert.equal(row.sourceCarrier,f.model.sourceCarrier);
  const progressive=f.progressive.progressiveAdmission(f.component,scope);
  assert.equal(progressive.ownerSelectedMaterialPriority,true);
  assert.equal(progressive.descriptionSHA256,dataModule.F260_ACCEPTED_RESTORE_SHA);
  assert.deepEqual(progressive.batchColors['0'],Array.from(f.component.batches[0].paint).slice(0,3));
  const badPaint=structuredClone(f.component);badPaint.batches[0].paint[0]=.1;
  const badGeometry=structuredClone(f.component);badGeometry.batches[0].positions[0]=1;
  const badMarker=structuredClone(f.component);badMarker.displayEstimates.acceptedF260Restore.patchSHA256='wrong';
  for(const rejected of [badPaint,badGeometry,badMarker,{...f.component,city:'essen'}]){
    assert.equal(f.runtime.f260AcceptedRestoreAdmission(rejected,scope),undefined);
  }
  f.value.models=[];assert.equal(f.runtime.f260AcceptedRestoreAdmission(f.component,scope),undefined,
    'a metadata hit cannot replace the actual model lookup');
  scope.release();assert.equal(f.calls.release,2);
});
