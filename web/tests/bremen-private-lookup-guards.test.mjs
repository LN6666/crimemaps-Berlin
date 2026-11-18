import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// Real private helpers + real static projection metadata. The only source
// adaptation exposes their existing lexical bindings for observation; function
// bodies stay untouched. Data facade probes carry tiny synthetic values and
// cannot open a frozen table or reader.
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/painted/bremen/safety');
const probes={
 'owner-f018-completion':{own:undefined},'infill-f288-original':{sourceById:undefined},'infill-stuttgart-jubilaeumssaeule':{anchorMatch:false},'bremen-finite-derived-display':{oldModel:undefined},
 'bremen-boundary70-runtime':{exact:false},'bremen-db70-runtime':{exact:false},'bremen-karstadt70-runtime':{exact:false},'bremen-teerhof-detail-runtime':{identity:false,exactBase:false},
 'edge-coverage-runtime':{group:undefined,model:undefined},'edgefill70-runtime':{group:undefined,model:undefined},'euro-gable-runtime':{group:undefined,model:undefined},
 'flemings70-runtime':{model:undefined},'glocke-detail-runtime':{model:undefined},'glocke-kuester-runtime':{model:undefined},'hbf-court-runtime':{model:undefined},
 'lloyd-front-runtime':{model:undefined},'market-cap-runtime':{model:undefined},'office7a70-materials':{exactBase:false},'official-openings-runtime':{group:undefined,model:undefined},
 'organisten-runtime':{model:undefined},'quartier670-runtime':{model:undefined},'radstation70-runtime':{model:undefined},'stephani-row-runtime':{group:undefined,model:undefined},
 'utility-official-materials':{exact:false},'wasserturm70-runtime':{model:undefined},'ws-back-detail-runtime':{model:undefined},
};
const plainMetadata=new Set(['bremen-identity-metadata','bremen-identity-projections','bremen-ag70-identities','bremen-ag70-metadata']);
const SHA='0'.repeat(64),unknown={city:'bremen',objectId:'__unknown_object__',partId:'__unknown_part__'};
function evaluate(text,require){const module={exports:{}};const js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','module','exports',js)(require,module,module.exports);return module.exports;}
function harness(){
 const cache=new Map();
 function dependency(id){return new Proxy({}, {get(_target,name){
  name=String(name);if(name==='__esModule')return false;
  if(name.endsWith('_RESOURCE'))return{canonicalSHA256:SHA,file:id,occurrence:0,codec:'json'};
  if(name.endsWith('_SCOPE_RESOURCES'))return[];
  if(name.endsWith('_SHA')||name.endsWith('_SHA256'))return SHA;
  if(name.startsWith('get'))return scope=>scope.borrow({file:id},value=>value);
  if(name==='nativePaintSignature')return()=> 'native';
  if(name.endsWith('Identity'))return()=>false;
  return()=>{throw Error('Unspecified private-helper dependency: '+id+':'+name);};
 }});}
 function load(name){
  if(cache.has(name))return cache.get(name);
  let text=fs.readFileSync(path.join(safety,name+'.ts'),'utf8');
  if(probes[name]){
   const ast=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true),factory=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createRecipe'),returned=factory?.body.statements.find(ts.isReturnStatement);
   assert(returned&&ts.isObjectLiteralExpression(returned.expression),'Actual recipe return must remain explicit: '+name);
   const at=returned.expression.getStart(ast)+1;text=text.slice(0,at)+'__private:{'+Object.keys(probes[name]).join(',')+'},'+text.slice(at)+'\nexport const __probeRecipe=createRecipe;\n';
  }else assert(plainMetadata.has(name),'Only the listed recipes and scalar metadata may load');
  const api=evaluate(text,id=>id.startsWith('./')&&plainMetadata.has(id.slice(2))?load(id.slice(2)):dependency(id));cache.set(name,api);return api;
 }
 return{load};
}
function probeScope(value){const memo=new Map(),calls={memo:0,borrow:0},failure=Error('Original positive model access');return{calls,failure,scope:{memo(key,create){calls.memo++;if(!memo.has(key))memo.set(key,create());return memo.get(key);},borrow(_ref,read){calls.borrow++;if(value===undefined)throw failure;return read(value);}}};}
function component(identity){return{city:'bremen',objectId:identity.objectId,partId:identity.partId,origin:[8,53],componentGeometry:{tiny:'geometry'},sourceFeature:{tiny:'feature'},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.5,.5,.5],paint:Array(12).fill(.25),frames:Array(15).fill(.5)}]};}

test('all guarded private lookups and inherited model paths reject unknown pairs before any scoped data access',()=>{
 const h=harness(),metadata=h.load('bremen-identity-projections');let checked=0;
 for(const [name,methods]of Object.entries(probes)){
  const api=h.load(name),cold=probeScope(),privateAPI=api.__probeRecipe(cold.scope).__private;
  for(const [method,noMatch]of Object.entries(methods)){assert.equal(privateAPI[method](unknown),noMatch,name+':'+method);checked++;}
  assert.deepEqual(cold.calls,{memo:0,borrow:0},name+' must remain cold');
  const known=metadata.BREMEN_IDENTITY_CANDIDATES[name][0];assert(known,'A verified candidate is required: '+name);
  for(const method of Object.keys(methods)){
   const warm=probeScope(),lookup=api.__probeRecipe(warm.scope).__private[method];let error;
   try{lookup(component(known));}catch(caught){error=caught;}
   if(error)assert.equal(error,warm.failure,name+':'+method+' changed the positive path');
   assert(warm.calls.memo+warm.calls.borrow>0,name+':'+method+' must still consult original scoped state on candidates');
  }
 }
 assert.equal(checked,32);
});

test('Lloyd, Organisten and Glocke matching lookups return real model records and still enforce whole DISPLAY/SOURCE checks',()=>{
 const h=harness(),catalog=h.load('bremen-identity-projections').BREMEN_IDENTITY_PROJECTIONS;
 for(const [name,carrierName,wholeName,marker,heldName]of [
  ['lloyd-front-runtime','lloydFrontCarrierIdentity','lloydFrontWholeDisplayCertificate','lloydFrontFinal','lloydFrontHeldSourceRule'],
  ['organisten-runtime','organistenCarrierIdentity','organistenWholeDisplayCertificate','organistenFinal','organistenHeldSourceRule'],
  ['glocke-kuester-runtime','glockeKuesterCarrierIdentity','glockeKuesterWholeDisplayCertificate','glockeKuesterOwnership',undefined],
 ]){
  const api=h.load(name),identity=catalog[carrierName].rows[0];assert(identity,'Actual static carrier identity required');
  const native=component(identity),model={identity:{objectId:identity.objectId,partId:identity.partId,signature:'native',leafSHA256:'leaf'},source:structuredClone(native),expected:structuredClone(native.batches),display:structuredClone(native.batches),changed:true,role:'tiny-real-carrier-id',unknownExtra:{keep:true}},data={models:[model],sourceCarrier:identity},warm=probeScope(data),privateAPI=api.__probeRecipe(warm.scope).__private;
  const actual=privateAPI.model(native);assert(actual&&typeof actual==='object');assert.notEqual(actual,true);assert.equal(actual.unknownExtra,model.unknownExtra);assert.deepEqual(actual.source.batches[0].positions,native.batches[0].positions);assert(warm.calls.borrow>0);
  const cold=probeScope();assert.equal(api.__probeRecipe(cold.scope).__private.model(unknown),undefined);if(heldName)assert.equal(api[heldName](unknown,cold.scope),undefined);assert.equal(cold.calls.borrow,0);
  const shown={...native,batches:structuredClone(model.display),generation:7,displayEstimates:{[marker]:{patchSHA256:SHA}}},certificate=api[wholeName](shown,7,native,()=>'leaf',warm.scope);
  assert.equal(certificate.certificateKind,'bremen-whole-owner-display-v1');assert.equal(certificate.displayVertices,3);
  const changed=structuredClone(shown);changed.batches[0].positions[0]=99;assert.throws(()=>api[wholeName](changed,7,native,()=>'leaf',warm.scope),/mismatch/);assert.throws(()=>api[wholeName](shown,7,native,()=>'wrong-leaf',warm.scope),/mismatch/);
 }
});
