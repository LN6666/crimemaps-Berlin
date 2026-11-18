import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import ts from 'typescript';
// A shader compile failure used to escape a building layer's render and abort
// MapLibre's whole frame, leaving the map paused while recovery retried the same compile.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const built=await build({entryPoints:[path.join(web,'src/safety/custom-layer-render-error.ts')],bundle:true,write:false,format:'esm',platform:'node'});
const {guardCustomLayerRender}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('a throwing layer render is contained and reported once per message',async()=>{
 const fired=[],map={fire:(type,event)=>fired.push([type,event.layerId,event.error.message])};let lost=false,calls=0;
 const render=guardCustomLayerRender(map,'source-building-meshes-root500',(gl,args)=>{calls++;assert.equal(gl,'gl');assert.equal(args,'args');throw Error('3D shader compile failed with empty driver info log');},()=>lost);
 render('gl','args');render('gl','args');await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(calls,2);assert.equal(fired.length,1);assert.equal(fired[0][0],'error');assert.equal(fired[0][1],'source-building-meshes-root500');assert.match(fired[0][2],/empty driver info log/);
 lost=true;render('gl','args');await new Promise(resolve=>setTimeout(resolve,0));assert.equal(fired.length,1,'a lost context is left to the recovery path');
 const ok=guardCustomLayerRender(map,'ok',(...args)=>{assert.deepEqual(args,[1,2]);},()=>false);ok(1,2);
});
test('every building renderer is guarded; root500/infill latch contained partition compile failures via prepareMainPrograms, bremen withholds and retries',()=>{
 for(const provider of ['bremen','church','city','delegated500','infill','root500','tier300']){
  const text=fs.readFileSync(path.join(web,`src/painted/${provider}/safety/building-mesh-renderer.ts`),'utf8');
  assert(text.includes('layer.render=guardCustomLayerRender(map,layer.id,(context,args)=>'),provider);
  assert(text.includes("import {guardCustomLayerRender} from '../../../safety/custom-layer-render-error';"),provider);
 }
 // A missing visible program holds its own resident range. Ready ranges keep
 // drawing, while the incomplete frame cannot satisfy the main-draw witness.
 const functionsNamed=(ast,name)=>{const found=[];(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found.push(node);ts.forEachChild(node,visit);})(ast);return found;};
 for(const provider of ['bremen','infill','root500']){
  const text=fs.readFileSync(path.join(web,`src/painted/${provider}/safety/building-mesh-renderer.ts`),'utf8');
  const ast=ts.createSourceFile(provider+'-renderer.ts',text,ts.ScriptTarget.Latest,true),loops=[];
  (function visit(node){if(ts.isForOfStatement(node)&&node.expression.getText(ast)==='visibleRuns')loops.push(node);ts.forEachChild(node,visit);})(ast);
  assert.equal(loops.length,1,provider+' has one visible partition draw loop');
  const loop=ts.transpileModule(loops[0].getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const render=Function('visibleRuns','partitionPrograms','mainPrepared','residentDrawRange',
   "const gl={},sceneSpans=[],draws=[],activeFamilyKey=key=>key,forgetCaptureRole=()=>{},uniforms=()=>{};"+
   "const drawBremenSceneRange=(program,firstIndex,indexCount)=>{draws.push([program,firstIndex,indexCount]);return true;};"+
   "let group,partitionPending=!mainPrepared;const flushGroup=()=>{if(group)draws.push([group.program,group.firstIndex,group.indexCount]);group=undefined;};"+
   loop+";flushGroup();return {draws,partitionPending};");
  const visible=['a','b','a'].map((key,i)=>({key,firstIndex:3*i,indexCount:3})),all=new Map([['a','A'],['b','B']]);
  const partial={draws:[['A',0,3],['A',6,3]],partitionPending:true};
  assert.deepEqual(render(visible,new Map([['a','A']]),true,()=>true),partial,provider+' only omits the uncompiled range');
  assert.deepEqual(render(visible,all,false,(_spans,first)=>first!==3),partial,provider+' only omits the unprepared range');
  assert.deepEqual(render(visible,all,true,()=>true),{draws:[['A',0,3],['B',3,3],['A',6,3]],partitionPending:false},provider+' resumes complete coverage');
  assert.match(text,/partitionPrograms\.clear\(\);heldCaptureDemandKeys\.clear\(\);for\(const demand of captureDemands\.values\(\)\)demand\.heldKeys\.clear\(\);partitionFailures\.clear\(\);/,provider+' drops failures with the released GPU programs');
  if(provider==='bremen'){
   assert.equal(text.includes('partitionFailures.set('),false,'bremen stores no partition failure: a failed partition is retried, never latched');
   assert.equal(text.includes('failures:partitionFailures'),false,'bremen hands its failure map to no latching preparer');
   continue;
  }
  const prepares=functionsNamed(ast,'prepareMainPrograms');
  assert.equal(prepares.length,1,provider+' has one prepareMainPrograms');
  const prepare=prepares[0];
  const latches=[];
  (function visit(node){if(ts.isCatchClause(node)&&node.getText(ast).includes(`[${provider} family shader compile failed]`))latches.push(node);ts.forEachChild(node,visit);})(ast);
  assert.equal(latches.length,1,provider+' latches a family compile failure in exactly one place');
  let inside=latches[0].parent;while(inside&&inside!==prepare)inside=inside.parent;
  assert.equal(inside,prepare,provider+' latches inside prepareMainPrograms, no longer in the frame catch');
  const latch=latches[0].getText(ast);
  assert(latch.startsWith('catch(error){if(!request.current())return other();'),provider+' leaves a stale or lost context to recovery before latching');
  assert(latch.includes('if(!request.failures)throw error;request.failures.set(key,'),provider+' latches through the request alias and rethrows only when no failure map was given');
  assert(latch.endsWith(`console.error('[${provider} family shader compile failed]',city,key,String(error));pending=true;other();}`),provider+' contains the latched failure (reported, not rethrown)');
  assert.equal(latch.match(/\bthrow\b/g)?.length,1,provider+' has no other throw in the latch');
  assert(prepare.getText(ast).includes('if(request.failures?.has(key)){pending=true;other();continue;}'),provider+' never compiles a latched key again');
  const wired=[];
  (function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='prepareMainPrograms'&&node.arguments[0]&&ts.isObjectLiteralExpression(node.arguments[0])){const failures=node.arguments[0].properties.find(property=>property.name?.getText(ast)==='failures');if(failures)wired.push(node);}ts.forEachChild(node,visit);})(ast);
  assert.equal(wired.length,1,provider+' passes a failure map to exactly one prepareMainPrograms call');
  const properties=Object.fromEntries(wired[0].arguments[0].properties.map(property=>[property.name.getText(ast),property.getText(ast)]));
  assert.equal(properties.failures,'failures:partitionFailures',provider+' latches into partitionFailures through the alias');
  assert(properties.current.includes('!context.isContextLost()'),provider+' latch request is not current after context loss');
 }
 {
  const provider='delegated500',text=fs.readFileSync(path.join(web,`src/painted/${provider}/safety/building-mesh-renderer.ts`),'utf8');
  const ast=ts.createSourceFile(provider+'-renderer.ts',text,ts.ScriptTarget.Latest,true),latches=[];
  (function visit(node){if(ts.isCatchClause(node)&&node.getText(ast).includes('partitionFailures.set(key,'))latches.push(node.getText(ast));ts.forEachChild(node,visit);})(ast);
  assert.equal(latches.length,1,provider+' latches one live-context family compile failure, in candidate preparation');
  assert(latches[0].includes("if(!gl.isContextLost()){partitionFailures.set(key,String(error).slice(0,256));console.error('[delegated500 family shader compile failed]'"),provider+' leaves context loss to recovery');
  assert(latches[0].includes('if(!candidate.resident)throw error;'),provider+' fails only a non-resident candidate; a resident keeps drawing');
  assert(text.includes('if(!selected){mainDrawComplete=false;if(!partitionFailures.has(key))partitionPending=true;selected=berlinDistantFamily(baseKey)!==undefined?(partitionPrograms.get(key===BERLIN_DISTANT_PAUL_LOBE_KEY?richPaintProgramKey(baseKey):BERLIN_DISTANT_PAUL_LOBE_KEY)??program):program;}'),provider+' keeps its existing base fallback for a missing program, and that frame is never a complete main draw');
  assert(text.includes('if(partitionPending&&!(heldMainWaitFrame===mainFrame&&visibleRuns.every(run=>{const key=distantPaintProgramKey(overrideKey??run.key);return key===\'base\'||key===currentPaintProgramKey(0)||partitionPrograms.has(key)||partitionFailures.has(key)||heldMainWaitKeys.has(key);})))map.triggerRepaint();'),provider+' retries a pending (unlatched) program on the next frame');
  assert(text.includes('partitionPrograms.clear();partitionFailures.clear();'),provider+' drops failures with the released GPU programs');
 }
});
test('latched compile failures make a review capture unreliable; pick readiness stays as it was',async()=>{
 const b=await build({entryPoints:[path.join(web,'src/safety/paint-program-failures.ts')],bundle:true,write:false,format:'esm',platform:'node'});
 const {paintProgramFailureKeys}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
 assert.deepEqual(paintProgramFailureKeys(undefined),[]);assert.deepEqual(paintProgramFailureKeys({renderer:{paintProviders:{city:{paintProgramPartitions:{cachedPrograms:3}}}}}),[]);
 assert.deepEqual(paintProgramFailureKeys({renderer:{paintProviders:{root500:{paintProgramPartitions:{failures:[['owner6345','link failed']]}},delegated500:{paintProgramPartitions:{failures:[]},solarDepth:{casters:{failures:[['current-family:21001','x']]}}},tier300:{familyPrograms:{failures:[['current-family:7','y']]}}}}}),['root500:owner6345','delegated500:current-family:21001','tier300:current-family:7']);
 // These are the real, distinct depth statistics emitted by the renderers.
 for(const provider of ['root500','infill','bremen'])assert.deepEqual(paintProgramFailureKeys({renderer:{paintProviders:{[provider]:{solarDepth:{failures:[['owner-a','unresolved facade']]}}}}}),[provider+':owner-a']);
 assert.deepEqual(paintProgramFailureKeys({renderer:{paintProviders:{delegated500:{solarDepth:{failure:'Berlin depth link failure',legacyFailures:[['hamburg-family','legacy link failure']]}}}}}),['delegated500:hamburg-family','delegated500:solar-depth']);
 for(const failure of [undefined,'','   '])assert.deepEqual(paintProgramFailureKeys({renderer:{paintProviders:{delegated500:{solarDepth:{failure,failures:[],legacyFailures:[],casters:{failures:[]}}}}}}),[]);
 const exporter=fs.readFileSync(path.join(web,'src/safety/white-review-export.ts'),'utf8');
 assert(exporter.includes("throw Error('No current drawable3D frame; no reliable image');if(captureMode===2){const failedPrograms=paintProgramFailureKeys(ready.stats);if(failedPrograms.length)throw Error("));
 assert(exporter.includes("if(captureMode===2&&paintProgramFailureKeys(ready.stats).length)throw Error('Paint program compile failed at frame copy; base-colour fallback or missing solar shadow is not a reliable capture');pixelCtx.drawImage(canvas,0,0);"));
});
test('tier300, church and city latch a live-context family compile failure and release it with the GPU',()=>{
 // The family latch still exists, but HEAD already changed its text (tier300/city reconcile their
 // material sources before rethrowing; church latches in candidate preparation and keeps polling a
 // resident) and no longer has the frame-local `if(familyFailures.has(key))continue;` skip or City's
 // prepareFamilyPrograms render try. DECISIONS 2026-11-02 "第三段第二轮结项" (R2 fixtures CDR[8](2)):
 // check the equivalent property — a live-context failure is latched, a latched key is never compiled
 // again in a frame, a latched visible key stops the repaint poll while a pending one keeps it, and
 // the latch is released with the GPU programs and reported.
 const read=provider=>fs.readFileSync(path.join(web,`src/painted/${provider}/safety/building-mesh-renderer.ts`),'utf8');
 const tier300=read('tier300'),church=read('church'),city=read('city');
 assert(tier300.includes('if(!requiredCapture&&!gl!.isContextLost())familyFailures.set(key,String(error).slice(0,256));reconcileMaterialSource();throw error;'),'tier300');
 assert(city.includes('if(!gl!.isContextLost())(requiredCapture?captureFamilyFailures:familyFailures).set(key,String(error).slice(0,256));reconcileProgramSources();throw error;'),'city');
 assert(church.includes('if(!value.resident)throw error;if(!gl.isContextLost())familyFailures.set(key,String(error).slice(0,256));pending=true;framePending=true;continue;'),'church');
 for(const [provider,text]of [['tier300',tier300],['city',city]]){
  assert(text.includes('if(target===residentMainPrograms&&familyFailures.has(key))throw Error(familyFailures.get(key));'),provider+' never recompiles a latched resident family; it reports the latched failure');
  assert(text.includes('if(target===residentMainPrograms&&!isProgramPreparationPending(error)&&!context.isContextLost())familyFailures.set(key,String(error).slice(0,256));throw error;'),provider+' latches a live-context resident failure');
  assert.match(text,/if\(visible\.has\(key\)&&!familyFailures\.has\(key\)\|\|capture\.has\(key\)&&/,provider+' a latched visible key stops the repaint poll; a pending one keeps it');
  assert(text.includes('[...mainFamilyProgramKeys()].some(key=>familyFailures.has(key))'),provider+' a latched visible family fails the main draw readiness instead of drawing a partial frame');
 }
 assert(church.includes('if(value.resident&&familyFailures.has(key)){pending=true;framePending=true;continue;}'),'church never recompiles a latched resident family');
 assert(church.includes('const key=mainFamilyProgramKey(override??run.key);if(familyFailures.has(key)){mainDrawComplete=false;continue;}'),'church skips a latched run and that frame is never a complete main draw');
 assert(church.includes('for(const key of mainPaintProgramKeys())if(familyFailures.has(key))return true;'),'church reports a required main failure');
 for(const [provider,text]of [['tier300',tier300],['church',church],['city',city]]){
  assert(text.includes('familyPrograms.clear();familyFailures.clear();'),provider+' releases the latch with the GPU programs');assert(text.includes('failures:[...familyFailures]'),provider);
 }
});

test('review receipt reads current renderer paint metadata and preserves every target part in order',()=>{
 const filename=path.join(web,'src/safety/white-review-export.ts'),text=fs.readFileSync(filename,'utf8'),ast=ts.createSourceFile(filename,text,ts.ScriptTarget.Latest,true),nodes=[];
 function visit(node){nodes.push(node);ts.forEachChild(node,visit);}visit(ast);
 const declaration=name=>{const matches=nodes.filter(node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name);assert.equal(matches.length,1,name);return matches[0];};
 const helper=name=>{const matches=nodes.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.equal(matches.length,1,name);return matches[0].getText(ast);};
 const receipt=declaration('receipt').initializer;assert(ts.isObjectLiteralExpression(receipt));
 const bindings=receipt.properties.find(node=>ts.isPropertyAssignment(node)&&node.name.getText(ast)==='paintBindings');assert(bindings);
 const code=[helper('nativeTargets'),helper('belongsToTarget'),`const paintRenderRecords=${declaration('paintRenderRecords').initializer.getText(ast)};`,`return {fingerprints:${declaration('progressivePaintFingerprints').initializer.getText(ast)},diagnostic:${declaration('diagnosticPaintBindings').initializer.getText(ast)},bindings:${bindings.initializer.getText(ast)}};`].join('\n');
 const read=new Function('ready','row',ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText);
 const scalar=(relative,name)=>{const file=path.join(web,'src/painted/city/safety',relative),source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);for(const statement of source.statements)if(ts.isVariableStatement(statement))for(const item of statement.declarationList.declarations)if(item.name.getText(source)===name){assert(ts.isStringLiteral(item.initializer));return item.initializer.text;}assert.fail(name);};
 const fingerprints={admissionsSHA256:scalar('progressive-paint-admissions.ts','PROGRESSIVE_INPUT_SHA'),featuresSHA256:scalar('progressive-feature-glsl.ts','PROGRESSIVE_FEATURE_SHA')};
 const geometrySignature=createHash('sha256').update(JSON.stringify([0,0,0,1,0,0,0,1,0])).digest('hex'),record={city:'berlin',objectId:'osm/way/1',partId:'osm/way/1/component/first',coloredVertices:3,sourceVertices:3,featureCarrierVertices:0,geometrySignature,batchColorBindings:{0:[1,0,0]},vertexRangeColors:[],frameBindings:[]};
 const status=[record,{...record,partId:'osm/way/1/component/second'},{...record,city:'hamburg'},{...record,objectId:'osm/way/2'}],original=structuredClone(status),row={city:'berlin',object_id:record.objectId,part_ids:[record.partId],diagnosticIdentities:[{objectId:record.objectId,partId:record.partId}]};
 let statusReads=0,fingerprintReads=0;const renderer={getProgressiveRenderStatus(){statusReads++;return status;},getProgressivePaintFingerprints(){fingerprintReads++;return fingerprints;},get stats(){throw Error('receipt metadata must not pull renderer statistics');}};
 const result=read({renderer},row);assert.equal(result.fingerprints,fingerprints);assert.deepEqual(result.diagnostic,status.slice(0,2));assert.deepEqual(result.bindings,status.slice(0,2));assert.equal(statusReads,1);assert.equal(fingerprintReads,1);assert.deepEqual(status,original);
 const unavailable=Error('current provider data unavailable');assert.throws(()=>read({renderer:{getProgressivePaintFingerprints:()=>fingerprints,getProgressiveRenderStatus(){throw unavailable;}}},row),error=>error===unavailable);
 assert.throws(()=>read({renderer:{getProgressivePaintFingerprints:()=>fingerprints}},row),TypeError,'missing current status cannot become an empty successful receipt');
 assert.throws(()=>read({renderer:{getProgressiveRenderStatus:()=>status}},row),TypeError,'missing fingerprints cannot become an empty successful receipt');
});
