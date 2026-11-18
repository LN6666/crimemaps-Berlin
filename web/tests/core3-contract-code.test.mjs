// shared-core-3 (3): contract TypeErrors of the ledger, the chunk store and the
// page byte transport carry code 'RESOURCE_CONTRACT_VIOLATION'; their type and
// message are unchanged (S2 managers CDR[4]). Network and transient failures,
// and RangeErrors, carry no such code.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ledger,stores,transport,MiB} from './support/core3-runtime.mjs';

const CODE='RESOURCE_CONTRACT_VIOLATION';
const {RESOURCE_CONTRACT_VIOLATION,isResourceContractViolation,createResourceBudget}=ledger;
const contract=message=>error=>error instanceof TypeError&&error.code===CODE&&error.message===message&&isResourceContractViolation(error);

test('the ledger exports the stable code and its predicate',()=>{
 assert.equal(RESOURCE_CONTRACT_VIOLATION,CODE);
 assert.equal(isResourceContractViolation(new TypeError('Failed to fetch')),false,'a network TypeError has no code');
 const bounded=new Error('x');bounded.name='TypeError';bounded.code=CODE;assert.equal(isResourceContractViolation(bounded),true,'a bounded copy that kept the code');
 assert.equal(isResourceContractViolation(Object.assign(new RangeError('x'),{code:CODE})),false,'only TypeErrors');
});

test('every contract TypeError of the ledger carries the code; message and type are unchanged',()=>{
 const budget=createResourceBudget({limitBytes:MiB});
 assert.throws(()=>budget.reserve({category:'nope',bytes:1,precision:'exact'}),contract('Invalid resource budget cost'));
 assert.throws(()=>budget.reserve({category:'read',bytes:1,precision:'exact',identity:null}),contract('Resource allocation identity must be an object or string'));
 assert.throws(()=>budget.reserve({category:'read',bytes:1,precision:'exact',label:3}),contract('Resource cost label must be a string'));
 assert.throws(()=>budget.reserve({category:'unmeasured-driver',bytes:0,precision:'estimate'}),contract('An unmeasured resource can only carry an explicit positive estimate; unknown size is not zero'));
 assert.throws(()=>budget.reserve([],{label:4}),contract('Resource reservation label must be a string'));
 assert.throws(()=>budget.reserve([],{recent:'yes'}),contract('Recent reservation flag must be boolean'));
 const reservation=budget.reserve([]);
 assert.throws(()=>reservation.setRecent('yes'),contract('Recent reservation flag must be boolean'));
 assert.throws(()=>reservation.setRetiring('yes'),contract('Retiring reservation flag must be boolean'));
 assert.throws(()=>budget.onPressure(1),contract('Resource eviction callback must be a function'));
 assert.throws(()=>budget.onAvailable(1),contract('Resource availability callback must be a function'));
 assert.throws(()=>budget.onAvailable(()=>{},{}),contract('Resource availability signal must be an AbortSignal'));
 assert.throws(()=>createResourceBudget({profile:'tablet'}),contract('Unknown resource budget profile'));
 assert.throws(()=>ledger.getPageResourceBudget(undefined,1),contract('Page resource budget owner must be an object'));
 // RangeErrors are size errors, not marked.
 assert.throws(()=>budget.reserve({category:'read',bytes:-1,precision:'exact'}),error=>error instanceof RangeError&&error.code===undefined);
 reservation.release();
});

test('the chunk store marks its own contract TypeErrors and keeps the code when a contract failure crosses it',async()=>{
 const budget=createResourceBudget({limitBytes:MiB}),store=stores.createChunkResourceStore({budget});
 try{
  assert.throws(()=>store.onRetirementPending(1),contract('Retirement frame request must be a function'));
  assert.throws(()=>store.onRetirementPending(()=>{},{}),contract('Retirement frame signal must be an AbortSignal'));
  // A producer that breaks the ledger contract: the bounded copy keeps name, message and code.
  const broken=store.acquire({contentKey:'broken',role:'source',estimate:[],produce:context=>{context.adjust({category:'nope',bytes:1,precision:'exact'});return 1;}});
  await assert.rejects(broken.ready,error=>error.name==='TypeError'&&!(error instanceof TypeError)&&error.message==='Invalid resource budget cost'&&error.code===CODE&&isResourceContractViolation(error));
  // A transient TypeError crossing the store stays unmarked.
  const network=store.acquire({contentKey:'network',role:'source',estimate:[],produce:()=>Promise.reject(new TypeError('Failed to fetch'))});
  await assert.rejects(network.ready,error=>error.name==='TypeError'&&error.message==='Failed to fetch'&&error.code===undefined&&!isResourceContractViolation(error));
  broken.release();network.release();
 }finally{store.destroy();}
});

test('the byte transport marks its caller-admission contract TypeErrors',async()=>{
 const budget=createResourceBudget({limitBytes:MiB}),store=stores.createChunkResourceStore({budget});
 const reader=transport.createResourceByteTransport({namespace:'core3',resourceStore:store,read:async()=>new Uint8Array(4)});
 const signal=new AbortController().signal,envelope=()=>transport.resourceByteAdmittedEnvelope('/a',8);
 try{
  await assert.rejects(reader.acquireBytes('/a',signal,8,null),contract('A caller-admitted read takes {admitted, envelope, keep?}'));
  await assert.rejects(reader.acquireBytes('/a',signal,8,{admitted:{},envelope:envelope()}),contract('A caller-admitted read needs the claim that lists its read envelope'));
  const claim=budget.reserve(envelope());
  await assert.rejects(reader.acquireBytes('/a',signal,8,{admitted:claim,envelope:transport.resourceByteReadEnvelope('/a',8)}),contract('A caller-admitted read needs an envelope minted by resourceByteAdmittedEnvelope'));
  await assert.rejects(reader.acquireBytes('/a',signal,8,{admitted:claim,envelope:envelope(),keep:{}}),contract('Caller-admitted keep costs must be an array'));
  await assert.rejects(reader.acquireBytes('/a',signal,8,{admitted:claim,envelope:envelope(),keep:[{category:'nope',bytes:1,precision:'exact'}]}),contract('Invalid resource budget cost'));
  const other=createResourceBudget({limitBytes:MiB}).reserve([]);
  await assert.rejects(reader.acquireBytes('/a',signal,8,{admitted:Object.assign(Object.create(null),{adjust:()=>true,budget:other}),envelope:envelope()}),contract('The caller-admitted claim belongs to another page ledger'));
  // A claim that does not list the envelope fails inside the store production: the code survives the crossing.
  const minted=envelope(),unlisted=budget.reserve({category:'read',bytes:16,precision:'estimate'});
  await assert.rejects(reader.acquireBytes('/a',signal,8,{admitted:unlisted,envelope:minted}),error=>error.name==='TypeError'&&error.code===CODE&&/does not list this read envelope/.test(error.message));
  // A RangeError (size contract) stays unmarked.
  await assert.rejects(reader.acquireBytes('/a',signal,0,{admitted:claim,envelope:envelope()}),error=>error instanceof RangeError&&error.code===undefined);
  claim.release();unlisted.release();other.release();
 }finally{reader.destroy?.();store.destroy();}
});

test('every literal contract TypeError of the three files is marked at its throw site, so the scanned messages keep their code',()=>{
 const safety=new URL('../src/safety/',import.meta.url);
 for(const file of ['resource-byte-transport.ts','render-runtime/resource-budget.ts','render-runtime/chunk-resource-store.ts']){
  const text=readFileSync(fileURLToPath(new URL(file,safety)),'utf8'),all=[...text.matchAll(/new TypeError\(/g)].length,marked=[...text.matchAll(/(?:contractViolation|resourceContractViolation)\(new TypeError\(/g)].length;
  assert(all>0,file);assert.equal(marked,all,file+': every TypeError construction is marked');
 }
});
