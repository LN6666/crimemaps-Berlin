import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
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

async function scopedC311Fixture(t){
  const root=new URL('../src/',import.meta.url).pathname;
  const output=await build({stdin:{contents:`export * from ${JSON.stringify('./safety/frozen-data-scope.ts')};export * from ${JSON.stringify('./safety/frozen-data-lease-store.ts')};export * from ${JSON.stringify('./painted/city/safety/c311-display.ts')};export * from ${JSON.stringify('./painted/city/safety/c311-fixture.ts')};export {prepareCityData} from ${JSON.stringify('./painted/city/safety/city-prepared-data.ts')};export {CITY_DATA_COHORTS,CITY_DATA_MASKS,cityCompleteDataDemand} from ${JSON.stringify('./painted/city/safety/city-data-metadata.ts')};export {nativePaintSignature} from ${JSON.stringify('./painted/city/safety/progressive-native-signature.ts')};export * as c312 from ${JSON.stringify('./painted/city/safety/c312-display.ts')};export {PROGRESSIVE_ADMISSIONS_RESOURCE as CITY_ADMISSIONS_RESOURCE} from ${JSON.stringify('./painted/city/safety/progressive-paint-admissions.ts')};export {PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE as CITY_EXTRA_RESOURCE} from ${JSON.stringify('./painted/city/safety/progressive-feature-cities.ts')};`,resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent',plugins:[{name:'no-installed-city-profile',setup(b){b.onLoad({filter:/\/safety\/frozen-paint-tables\.ts$/},()=>({contents:'export function frozenPaintTableRowCounts(){return {};}',loader:'js'}));}}]});
  const api=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].contents).toString('base64'));
  const cohort=api.CITY_DATA_COHORTS.c311,mask=api.CITY_DATA_MASKS.c311,[lon,lat]=mask.origin,component=(identity,family)=>({...identity,origin:[lon,lat],componentGeometry:{type:'Polygon',coordinates:[[[lon,lat],[lon+.00001,lat],[lon,lat+.00001],[lon,lat]]]},sourceFeature:{properties:{fixture:'tiny scoped C311'}},proof:{sourceSHA256:'c'.repeat(64)},displayEstimates:{family,geometryProvenance:'addedapprox',native:false,maxHeight:8},batches:[{positions:[0,7.5,0,1,7.5,0,0,7.5,1],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.2,.3,.4]}]});
  const fixture={...mask,sourcePBF:'tiny-c311.pbf',sourceSnapshot:'tiny-c311',native:cohort.native.map((identity,i)=>component(identity,13220+i)),added:cohort.added.map((identity,i)=>component(identity,13230+i))};
  const resource=api.C311_FIXTURE_RESOURCE;
  assert.equal(resource.canonicalSHA256,cohort.canonicalSHA256,'identity projection stays bound to the original logical fixture');
  const admissions=[...fixture.native,...fixture.added].map(row=>({city:row.city,objectId:row.objectId,partId:row.partId,origin:row.origin,descriptionSHA256:'d'.repeat(64),tier:300,mode:'native',family:row.displayEstimates.family,geometrySignature:api.nativePaintSignature(row)}));
  const resources=[{ref:resource,value:fixture},{ref:api.CITY_ADMISSIONS_RESOURCE,value:admissions},{ref:api.CITY_EXTRA_RESOURCE,value:{munich:'vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}'}}].map(row=>{const bytes=new TextEncoder().encode(JSON.stringify(row.value)),sha=createHash('sha256').update(bytes).digest('hex');return{...row,bytes,sha,path:'/safety/buildings3d/painted-tables/'+sha.slice(0,2)+'/'+sha+'.json'};});
  const store=api.createFrozenDataLeaseStore(resources.map(row=>({path:row.path,sha256:row.sha,bytes:row.bytes.length})));
  let reads=0;
  const client=store.client({city:'munich',profileSHA256:null,provider:'city',selection:{tables:resources.map(row=>row.sha),initializers:Object.fromEntries(resources.map(row=>[row.sha,{[row.ref.file]:1}]))},resolve(canonical,file,occurrence){const row=resources.find(row=>row.ref.canonicalSHA256===canonical&&row.ref.file===file&&row.ref.occurrence===occurrence);assert.ok(row,'exact canonical/file/occurrence binding');return row.sha;},async read(actual,signal,max){signal.throwIfAborted();const row=resources.find(row=>row.path===actual);assert.ok(row);assert.equal(max,row.bytes.length);reads++;return row.bytes;}});
  const scope=api.createFrozenDataScope(client);
  t.after(()=>{scope.release();client.dispose();store.destroy();});
  return {api,fixture,cohort,resource,scope,store,get reads(){return reads;}};
}

test('real scoped C311 consumers keep unrelated cities cold and missing preparation unavailable',async t=>{
  const f=await scopedC311Fixture(t),shader='void main(){originalMaterial();}';
  for(const city of ['berlin','hamburg','bremen','dresden']){
    const row={...f.fixture.native[0],city};
    assert.equal(f.api.c311HasMaterialBinding(row,f.scope),false);
    assert.equal(f.api.c311IsAdded(row,f.scope),false);
    assert.equal(f.api.c311AppearanceVertexReservation(city,f.scope),0);
    assert.equal(f.api.c311VertexShader(shader,city,f.scope),shader);
    assert.equal(f.api.c311FragmentShader(shader,city,f.scope),shader);
  }
  assert.equal(f.reads,0,'proven unrelated cities never acquire the Munich fixture');
  assert.equal(f.scope.stats.resources,0);
  const presence={native:2,added:0,expectedNative:2,expectedAdded:20};
  assert.deepEqual(f.api.c311Presence(f.fixture.native),presence,'identity-only presence is available without a model lease');
  assert.deepEqual(f.api.c311Presence(f.fixture.native,f.scope),presence);
  assert.throws(()=>f.api.c311HasMaterialBinding(f.fixture.native[0]),/scope/i);
  assert.throws(()=>f.api.c311HasMaterialBinding(f.fixture.native[0],f.scope),/not prepared/);
  assert.equal(f.reads,0,'synchronous required consumers cannot silently load or fabricate readiness');
});

test('cold matched Munich empty C311/C312 wrappers need no scope or model read',async t=>{
  const f=await scopedC311Fixture(t),x={city:'munich',indexSHA:f.fixture.indexSHA,sourcePBF:f.fixture.sourcePBF,boundarySHA:f.fixture.boundarySHA,sourceSnapshot:f.fixture.sourceSnapshot,pathsReady:{color:true,shadow:true,pick:true},leafSHA:()=>undefined,materialReady:()=>true};
  for(const [api,id]of [[f.api,'311'],[f.api.c312,'312']]){
    assert.deepEqual(api['createC'+id+'DisplayComponents']([],x),[]);
    assert.equal(api['c'+id+'Ready']([],x),false);
    assert.deepEqual(api['applyC'+id+'MaterialFrames']([],new Float32Array(),new Float32Array(),x),{ready:false,vertices:0});
    assert.equal(f.reads,0,'empty input is provable without borrowing the Munich fixture');
  }
});

test('real scoped C311 recipe retains complete part cohorts, exact material values and lease lifetime',async t=>{
  const f=await scopedC311Fixture(t),signal=new AbortController().signal;
  const demand=f.api.cityCompleteDataDemand([f.fixture.native[0]],'munich'),identity=row=>[row.city,row.objectId,row.partId];
  assert.equal(demand[0],f.fixture.native[0]);
  assert.deepEqual(demand.slice(1).map(identity),[...f.cohort.native,...f.cohort.added].map(identity),'one carrier expands to the entire original native/added cohort without raw-ID truncation');
  await f.api.prepareCityData([f.fixture.native[0]],'munich',signal,f.scope);
  assert.equal(f.reads,3);
  const x={city:'munich',indexSHA:f.fixture.indexSHA,sourcePBF:f.fixture.sourcePBF,boundarySHA:f.fixture.boundarySHA,sourceSnapshot:f.fixture.sourceSnapshot,leafSHA:c=>c.proof.sourceSHA256,materialReady:()=>true,pathsReady:{color:true,shadow:true,pick:true}};
  const native=structuredClone(f.fixture.native),before=JSON.stringify(native);
  assert.deepEqual(f.api.createC311DisplayComponents([native[0]],x,f.scope),[],'one native part cannot substitute for the complete source cohort');
  const added=f.api.createC311DisplayComponents(native,x,f.scope);
  assert.deepEqual(added,f.fixture.added);
  assert.equal(f.api.c311HasMaterialBinding({...native[0],partId:'other-native-part'},f.scope),false);
  assert.equal(f.api.c311HasMaterialBinding({...native[0],origin:[native[0].origin[0]+.01,native[0].origin[1]]},f.scope),false);
  const rows=[...native,...added],colors=new Float32Array(rows.length*3*4),frames=new Float32Array(rows.length*3*5),input=JSON.stringify(rows);
  assert.equal(f.api.c311Ready(rows.slice(0,-1),x,f.scope),false,'all exact added parts remain required for readiness');
  assert.equal(f.api.c311Ready(rows,x,f.scope),true);
  assert.deepEqual(f.api.c311Presence(rows,f.scope),{native:2,added:20,expectedNative:2,expectedAdded:20});
  assert.equal(f.api.c311AppearanceVertexReservation('munich',f.scope),f.cohort.addedVertices,'reservation uses the hash-bound canonical metadata rather than the detached fixture geometry');
  assert.deepEqual(f.api.applyC311MaterialFrames(rows,colors,frames,x,f.scope),{ready:true,vertices:66});
  rows.forEach((row,i)=>{
    const family=i===0?13220:i===1?13221:row.displayEstimates.family,color=i===0?[.75,.71,.63]:i===1?[.65,.55,.43]:row.batches[0].color;
    for(let vertex=0;vertex<3;vertex++){
      const [x,y,z]=row.batches[0].positions.slice(vertex*3,vertex*3+3),[a,b]=f.fixture.axis,u=a*x-b*z,v=b*x+a*z;
      assert.deepEqual(frames.slice((i*3+vertex)*5,(i*3+vertex+1)*5),new Float32Array([v,y,10000+u,10000+v,family]));
      assert.deepEqual(colors.slice((i*3+vertex)*4,(i*3+vertex+1)*4),new Float32Array([...color,2]));
    }
  });
  assert.equal(JSON.stringify(native),before);
  assert.equal(JSON.stringify(rows),input,'material application preserves canonical component order and source arrays');
  const unpin=f.scope.retain();
  f.scope.release();
  assert.equal(f.scope.stats.disposed,false);
  assert.equal(f.api.c311Ready(rows,x,f.scope),true,'published consumers retain their real scope lease');
  unpin();
  assert.equal(f.scope.stats.disposed,true);
  assert.equal(f.store.stats.valueCells,0);
  assert.throws(()=>f.api.c311Presence(rows,f.scope),{name:'AbortError'});
});
