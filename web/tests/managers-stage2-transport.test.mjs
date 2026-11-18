import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {families,MiB,flush,until,deferred,outcomeOf,sum,view,pageFixture,manager,sources,declared,
 resourceByteAdmittedEnvelope,ResourceBudgetExceededError,ResourceByteDeliveryRefusedError,environmentJsonReadCosts,
 budgetModule,createResourceBudget,createChunkResourceStore} from './support/managers-stage2-ingress.mjs';

// Stage 2 adoption of the caller-admitted byte transport (core-transport final
// contract {admitted, envelope, keep}) by the seven managers' bootstrap reads and
// readAsset. Everything but the network bytes is the actual source.

// A wave listener that synchronously reserves every byte a wave frees: the
// competition a hand-over gap would lose to.
function greedy(budget){
 const taken=[];let armed=true;
 const stop=budget.onAvailable(()=>{if(!armed)return;const free=budget.stats.availableBytes;if(free>0)taken.push(budget.reserve({category:'mask',bytes:free,precision:'estimate',label:'greedy wave reserver'}));});
 return{taken,stop(){armed=false;stop();for(const reservation of taken.splice(0))reservation.release();}};
}

// Obtain this newer contract failure from the real store API, rather than
// labelling an arbitrary network error with the expected message or code.
async function readyBorrowContractFailure(){
 const budget=createResourceBudget({limitBytes:MiB,recentLimitBytes:0}),store=createChunkResourceStore({budget});
 const lease=store.acquire({contentKey:'fixture-ready-borrow-contract',role:'wanted',estimate:{category:'metadata',bytes:64,precision:'exact'},produce:()=>({})});
 try{
  await lease.ready;let failure;
  assert.throws(()=>lease.borrowReady('wanted'),error=>{failure=error;return error instanceof TypeError&&error.code==='RESOURCE_CONTRACT_VIOLATION';});
  assert.match(failure.message,/Ready resource borrow requires a draw or dependency role/);
  return failure;
 }finally{lease.release();store.destroy();assert.equal(budget.stats.bytes,0,'the real contract failure leaves no fixture resource held');}
}

test('every bootstrap read is caller-admitted: one envelope in the request\'s claim, no transport wait, delivery in place',async()=>{
 for(const family of families){
  const m=manager(family,{transport:true,partitioned:true}),signal=new AbortController().signal;
  await m.ensure(signal);
  assert.deepEqual(m.net.calls.map(call=>[call.name,call.at.listeners]),[['transport',0],['transport',0]],family+' index and boundary: no availability wait while they read');
  assert.equal(m.page.stats.admittedReads,2,family+' both bootstrap reads took the caller-admitted path');
  assert.equal(m.page.stats.admittedDeliveries,2,family);
  const pageCall=m.net.calls.length;
  const {value,claim}=await m.readPage(signal);
  assert.equal(m.page.stats.admittedReads,3,family+' the partition page too');
  assert.equal(m.net.calls[pageCall].at.listeners,0,family);
  assert.ok(value&&Array.isArray(value.shards),family);
  claim.release();m.destroy();m.page.destroy();assert.equal(m.budget.stats.bytes-view(m.budget).shadow,0,family);
 }
});

test('a descriptor\'s working set stays in its claim through delivery: a greedy wave cannot take it, nothing retries',async()=>{
 for(const family of families){
  const m=manager(family,{transport:true,partitioned:true}),signal=new AbortController().signal;
  await m.ensure(signal);
  const retriesBefore=m.modules.admission.managerBootstrapStats().waits.admissionRetries;
  const wave=greedy(m.budget);
  try{
   const reading=m.readPage(signal);
   assert.equal(await outcomeOf(reading),'fulfilled',family+' the page parses with the working set it was admitted with');
   assert.ok(wave.taken.length>0,family+' the delivery shrink ran a wave the greedy reserver used');
   assert.equal(m.modules.admission.managerBootstrapStats().waits.admissionRetries,retriesBefore,family+' no ManagerAdmissionRetry after delivery');
   (await reading).claim.release();
  }finally{wave.stop();}
  // The boundary beside the held manifest estimate: armed once its read is in
  // flight, the greedy reserver cannot stop its SHA copy (the solar index, which
  // needs new bytes by design, is admitted only after it is released).
  const boundaryPath='/safety/buildings3d/berlin/city-boundary.json',n=manager(family,{transport:true,hold:new Set([boundaryPath])});
  const ensuring=n.ensure(new AbortController().signal);await until(()=>n.net.calls.length===2);
  const b=greedy(n.budget);
  try{
   n.net.calls[1].gate.resolve();
   // A working set admitted only after delivery would be refused here and wait
   // holding nothing; the boundary's SHA copy (the second digest, after the
   // index's) would then never start while the greedy reserver holds the bytes.
   await until(()=>n.events.filter(([kind])=>kind==='digest').length===2);
   assert.ok(b.taken.length>0,family+' the boundary delivery shrink ran a wave the greedy reserver used');
   assert.equal(n.net.calls.length,2,family+' the boundary was parsed from its one read');
  }finally{n.net.hold.clear();b.stop();}
  assert.equal(await outcomeOf(ensuring),'fulfilled',family+' boundary');
  m.destroy();m.page.destroy();n.destroy();n.page.destroy();
 }
});

test('readAsset with an admission hands the caller\'s claim to the transport and takes no fetch slot',async()=>{
 for(const family of families){
  const m=manager(family,{transport:true});await m.ensure(m.scope.request.signal);
  const {profileAsset,profile,profileRaw}=m.docs,limit=profileAsset.bytes;
  const keep=environmentJsonReadCosts(profileAsset,'caller parse working set'),envelope=resourceByteAdmittedEnvelope(profileAsset.path,limit);
  const claim=m.budget.reserve([...keep,...envelope],{label:'caller pre-admission'});
  const admittedBefore=m.page.stats.admittedReads;
  const reading=m.readAsset(profileAsset,new AbortController().signal,MiB,{admitted:claim,envelope,keep});
  assert.equal(m.stats().active,0,family+' no fetch slot');
  assert.deepEqual(await reading,JSON.parse(new TextDecoder().decode(profileRaw)),family);
  assert.equal(m.page.stats.admittedReads,admittedBefore+1,family);
  assert.equal(claim.bytes,sum(keep)+profile.byteLength,family+' the claim was replaced in place by [...keep, delivered buffer]');
  assert.equal(m.budget.stats.availabilityListeners,0,family);
  claim.release();m.destroy();m.page.destroy();
 }
});

test('readAsset with an admission completes while both fetch slots hold compatibility reads waiting for the ledger',async()=>{
 for(const family of ['city','bremen']){
  const m=manager(family,{transport:true});await m.ensure(m.scope.request.signal);
  const {profileAsset,profileRaw}=m.docs,plain='/safety/environment/berlin/index.json';m.docs.files.set(plain,new TextEncoder().encode('{"schema_version":1}'));m.page.clear();
  const keep=environmentJsonReadCosts(profileAsset,'caller'),envelope=resourceByteAdmittedEnvelope(profileAsset.path,profileAsset.bytes),claim=m.budget.reserve([...keep,...envelope]);
  // Fill the ledger: the two compatibility reads' own 2 MiB envelopes cannot be admitted.
  const s=m.budget.stats,blocker=m.budget.reserve({category:'mask',bytes:s.limitBytes-s.bytes-MiB,precision:'estimate',label:'other holders'});
  const legacy=[0,1].map(()=>m.readAsset(plain,new AbortController().signal,MiB));
  await until(()=>m.stats().active===2&&m.budget.stats.availabilityListeners>=1);
  assert.deepEqual([m.stats().active,m.stats().queued],[2,0],family+' both slots wait inside the transport\'s own admission');
  const admitted=m.readAsset(profileAsset,new AbortController().signal,MiB,{admitted:claim,envelope,keep});
  assert.equal(await outcomeOf(admitted),'fulfilled',family+' the caller-admitted read needs no slot and no capacity');
  assert.deepEqual(await admitted,JSON.parse(new TextDecoder().decode(profileRaw)),family);
  assert.deepEqual(await Promise.all(legacy.map(read=>outcomeOf(read,20))),['pending','pending'],family);
  blocker.release();assert.deepEqual(await Promise.all(legacy.map(read=>outcomeOf(read))),['fulfilled','fulfilled'],family);
  claim.release();m.destroy();m.page.destroy();
 }
});

test('a refused delivery retries once with the delivered buffer\'s envelope beside keep, then reports not-fit',async()=>{
 for(const family of families){
  const shared=pageFixture({transport:true,partitioned:true}),pagePath=shared.docs.pageAsset.path,calls=[];
  const acquireBytes=(path,signal,max,admission)=>{
   if(path!==pagePath)return shared.page.acquireBytes(path,signal,max,admission);
   calls.push({max,envelope:admission.envelope,envelopeBytes:sum(admission.envelope),claimBytes:admission.admitted.bytes,keepBytes:sum(admission.keep)});
   const delivered=2*max+4096,details={capacity:shared.budget.stats.limitBytes,required:0,current:0,recentCapacity:0,recentRequired:0,recentCurrent:0,shortfallBytes:0,recentShortfallBytes:0,additionalBytes:0,constraint:'total'};
   return Promise.reject(new ResourceByteDeliveryRefusedError(details,{keepBytes:sum(admission.keep),deliveredBytes:delivered,max,limitBytes:shared.budget.stats.limitBytes}));
  };
  const m=manager(family,{shared,acquireBytes});await m.ensure(new AbortController().signal);
  const outcome=await outcomeOf(m.readPage(new AbortController().signal));
  assert.equal(outcome,'ResourceBudgetExceededError',family+' the second refusal does not fit: no loop');
  assert.equal(calls.length,2,family);
  assert.equal(calls[0].envelopeBytes,2*MiB,family+' first: the standard envelope');
  assert.ok(calls[1].envelopeBytes>=2*MiB+4096,family+' the retry mints the delivered buffer\'s envelope');
  assert.equal(calls[1].claimBytes,calls[1].keepBytes+calls[1].envelopeBytes,family+' the retry admits keep beside that envelope at once');
  assert.notEqual(calls[0].envelope,calls[1].envelope,family+' one envelope per read');
  assert.deepEqual([m.budget.stats.availabilityListeners,view(m.budget).construction,view(m.budget).inflate,view(m.budget).decoded],[0,0,0,0],family+' nothing is held after not-fit');
  m.destroy();shared.page.destroy();
 }
});

test('a transient failure that crossed the page store (an Error named TypeError) is read once more with a fresh envelope',async()=>{
 for(const family of families){
  const shared=pageFixture({transport:true,partitioned:true}),pagePath=shared.docs.pageAsset.path,envelopes=[];let failed=false;
  const acquireBytes=(path,signal,max,admission)=>{
   if(path===pagePath){envelopes.push(admission.envelope);if(!failed){failed=true;const error=new Error('Failed to fetch');error.name='TypeError';return Promise.reject(error);}}
   return shared.page.acquireBytes(path,signal,max,admission);
  };
  const m=manager(family,{shared,acquireBytes});await m.ensure(new AbortController().signal);
  const {claim}=await m.readPage(new AbortController().signal);
  assert.equal(envelopes.length,2,family+' retried once');assert.notEqual(envelopes[0],envelopes[1],family);
  claim.release();m.destroy();shared.page.destroy();
 }
});

test('readAsset with an admission returns any failure to its caller unchanged, a transient TypeError included: one read per caller envelope',async()=>{
 for(const family of families){
  const shared=pageFixture({transport:true});let calls=0,failure;
  const acquireBytes=(path,signal,max,admission)=>{
   if(admission&&path===shared.docs.profileAsset.path){calls++;if(!failure){failure=new Error('Failed to fetch');failure.name='TypeError';return Promise.reject(failure);}}
   return shared.page.acquireBytes(path,signal,max,admission);
  };
  const m=manager(family,{shared,acquireBytes});await m.ensure(m.scope.request.signal);
  const {profileAsset,profileRaw}=m.docs,limit=profileAsset.bytes;
  const keep=environmentJsonReadCosts(profileAsset,'caller parse working set'),envelope=resourceByteAdmittedEnvelope(profileAsset.path,limit);
  const claim=m.budget.reserve([...keep,...envelope],{label:'caller pre-admission'}),claimBytes=claim.bytes;
  let thrown;try{await m.readAsset(profileAsset,new AbortController().signal,MiB,{admitted:claim,envelope,keep});}catch(error){thrown=error;}
  assert.equal(thrown,failure,family+' the transport failure reaches the caller as it was, not wrapped');
  assert.equal(calls,1,family+' the caller\'s claim and envelope carried one read: no second read with them');
  assert.deepEqual([claim.active,claim.bytes],[true,claimBytes],family+' the claim stays as it was for its caller');
  claim.release();
  // The caller reads again with a newly minted envelope under its own admission.
  const nextEnvelope=resourceByteAdmittedEnvelope(profileAsset.path,limit),next=m.budget.reserve([...keep,...nextEnvelope]);
  assert.deepEqual(await m.readAsset(profileAsset,new AbortController().signal,MiB,{admitted:next,envelope:nextEnvelope,keep}),JSON.parse(new TextDecoder().decode(profileRaw)),family);
  assert.equal(calls,2,family);
  next.release();m.destroy();shared.page.destroy();
 }
});

test('a page-transport or ledger contract TypeError is never read again as a network failure',async()=>{
 const failures=[new TypeError('This read envelope already covers another read; mint one per read'),await readyBorrowContractFailure()];
 for(const failure of failures)for(const family of families){
  const shared=pageFixture({transport:true,partitioned:true}),pagePath=shared.docs.pageAsset.path;let pageCalls=0;
  const acquireBytes=(path,signal,max,admission)=>{
   if(path===pagePath){pageCalls++;return Promise.reject(failure);}
   return shared.page.acquireBytes(path,signal,max,admission);
  };
  const m=manager(family,{shared,acquireBytes});await m.ensure(new AbortController().signal);
  let thrown;try{await m.readPage(new AbortController().signal);}catch(error){thrown=error;}
  assert.ok(thrown,family+' the read fails');
  assert.ok(String(thrown?.message).includes(failure.message),family+' the actual contract message is kept');
  assert.equal(pageCalls,1,family+' read once: a contract check is not a transient failure');
  assert.deepEqual([m.budget.stats.availabilityListeners,view(m.budget).construction],[0,0],family+' nothing is held after the failure');
  m.destroy();shared.page.destroy();
 }
});

test('the transient-failure test names every contract TypeError of the page transport, ledger and store, and no network failure',async()=>{
 const {readFileSync}=await import('node:fs'),{fileURLToPath}=await import('node:url');
 const safety=new URL('../src/safety/',import.meta.url),legacyMessages=['Caller-admitted keep costs must be an array','The caller-admitted claim does not list this read envelope; admit [...own costs, ...envelope] in one claim first: /x'],messages=new Set(legacyMessages);
 for(const file of ['resource-byte-transport.ts','render-runtime/resource-budget.ts','render-runtime/chunk-resource-store.ts']){
  const text=readFileSync(fileURLToPath(new URL(file,safety)),'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
  function visit(node){
   if(ts.isNewExpression(node)&&node.expression.getText(ast)==='TypeError'){
    const message=node.arguments?.[0];
    if(message&&ts.isStringLiteral(message)){
     assert.ok(ts.isCallExpression(node.parent)&&['contractViolation','resourceContractViolation'].includes(node.parent.expression.getText(ast)),file+' tags this contract error at its actual throw site');
     messages.add(message.text);
    }
   }
   ts.forEachChild(node,visit);
  }
  visit(ast);
 }
 assert.ok(messages.size>=20,'the scan found the contract messages');
 let reference;
 for(const family of families){
  const {ast}=sources.get(family),literals=[];
  function visit(node){
   if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken&&ts.isParenthesizedExpression(node.operand)){
    const expression=node.operand.expression.getText(ast);
    if(/error instanceof Error/.test(expression)&&/error\.name\s*===\s*['"]TypeError['"]/.test(expression))literals.push(expression);
   }
   ts.forEachChild(node,visit);
  }
  visit(ast);
  assert.equal(literals.length,3,family+' bounded fetch, bootstrap read and compatibility readAsset share one test');
  assert.equal(new Set(literals).size,1,family);reference??=literals[0];assert.equal(literals[0],reference,family+' the same test as root500');
 }
 // Execute the complete production predicate, including its stable-code guard.
 // Message fallback remains required for old untagged transport errors; newer
 // store contracts need not be added to a growing network-message regex.
 const compiled=ts.transpileModule('return ('+reference+');',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,transient=new Function('error',compiled);
 for(const message of messages){
  const failure=budgetModule.resourceContractViolation(new TypeError(message));
  assert.equal(transient(failure),false,'tagged contract TypeError treated as transient: '+message);
  assert.equal(transient(Object.assign(new Error(message),{name:'TypeError',code:failure.code})),false,'the bounded error copy retains its stable contract code');
 }
 const budget=createResourceBudget({limitBytes:1024,recentLimitBytes:0}),provider=()=>({}),notify=()=>{};
 for(const [call,message] of [
  [()=>budget.onAvailabilityStateChange(null),'Availability observer required'],
  [()=>budget.onAvailabilityStateChange(notify,{}),'Availability observer signal must be an AbortSignal'],
  [()=>budget.registerAvailabilityStateProvider(null),'Availability state provider required'],
  [()=>budget.registerAvailabilityStateProvider(provider,''),'Availability semantic provider key must be 1 to 256 UTF-16 characters'],
  [()=>budget.registerAvailabilityStateProvider(provider,'test',[]),'Availability provider options must be an object'],
 ]){
  assert.throws(call,error=>error instanceof TypeError&&error.message===message&&
   error.code===budgetModule.RESOURCE_CONTRACT_VIOLATION&&!transient(error),message);
 }
 assert.equal(transient(await readyBorrowContractFailure()),false,'an actual ready-borrow contract failure is not retried');
 for(const message of [...legacyMessages,'This read envelope already covers another read; mint one per read'])assert.equal(transient(new TypeError(message)),false,'legacy untagged contract error treated as transient: '+message);
 for(const message of ['Failed to fetch','Load failed','NetworkError when attempting to fetch resource.','The network connection was lost.','network error'])assert.equal(transient(new TypeError(message)),true,'network failure treated as a contract check: '+message);
});

test('the seven managers keep one identical ingress and readAsset text; no TypeError instance check crosses the page store',()=>{
 const normalized=family=>{
  const {ast,parts,readAssetText}=sources.get(family);
  return parts.filter(node=>declared(node,['BOOTSTRAP_JSON_EXPANSION','bootstrapParseCosts','bootstrapRetainedCost','bootstrapPressure','unfitBootstrap','admitBootstrap','acquireBounded','parseBootstrap'])).map(node=>node.getText(ast)).join('\n').replaceAll(/\bresources?(?:Store)?\.budget/g,'STORE.budget')+'\n'+readAssetText;
 };
 const reference=normalized('root500');
 for(const family of families){
  assert.equal(normalized(family),reference,family+' differs from root500');
  const {text,ast,install}=sources.get(family);
  assert.ok(!/instanceof TypeError/.test(text),family+' no TypeError instance check remains');
  const acquire=install.body.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='acquireBounded').getText(ast);
  assert.match(acquire,/acquire\(path,signal,max,\{admitted:claim,envelope,keep\}\)/,family+' the transport branch is caller-admitted');
  assert.ok(!/acquire\(path,signal,max\)/.test(acquire),family+' no 3-argument transport read inside acquireBounded');
  assert.match(sources.get(family).readAssetText,/if\(admission\)\{lease=await acquire\(path,signal,limit,admission\);\}/,family+' readAsset forwards the admission unchanged, outside the fetch queue, and reads once with it');
 }
});
