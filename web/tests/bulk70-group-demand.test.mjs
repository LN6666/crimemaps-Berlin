import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const web=fileURLToPath(new URL('../',import.meta.url));
const built=await build({stdin:{contents:`export * from './src/painted/infill/safety/infill-frankfurt-low-office-bulk70-data';export {BULK70_IDENTITY_GROUPS} from './src/painted/infill/safety/infill-frankfurt-low-office-bulk70-identities';export {createFrozenDataScope} from './src/safety/frozen-data-scope';`,resolveDir:web,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function fixture(){
 const calls=[],value={SOURCEImmutable:true,groups:api.BULK70_IDENTITY_GROUPS.map(g=>({queueId:g.queueId,models:g.identities.map(row=>({...row}))}))};let releases=0;
 const scope=api.createFrozenDataScope({async acquire(ref,signal,keys){signal.throwIfAborted();calls.push({ref,keys});return{borrow:read=>read(value),release(){releases++;}};}});
 return{scope,calls,get releases(){return releases;}};
}
test('bulk70 declares the complete matching group before reading and preserves all its members',async()=>{
 const f=fixture(),group=api.BULK70_IDENTITY_GROUPS.find(g=>g.identities.length>1),row={city:'frankfurt',...group.identities[0]},signal=new AbortController().signal;
 await api.prepareInfillData([row],signal,f.scope);
 assert.deepEqual(f.calls[0].keys,[group.queueId]);
 const data=api.getLOW_OFFICE_DATA(f.scope);assert.equal(data.groups.length,1);assert.equal(data.groups[0].queueId,group.queueId);assert.deepEqual(data.groups[0].models,group.identities);
 await api.prepareInfillData([row],signal,f.scope);assert.equal(f.calls.length,1);
 const other=api.BULK70_IDENTITY_GROUPS.find(g=>g.queueId!==group.queueId);
 await assert.rejects(api.prepareInfillData([{city:'frankfurt',...other.identities[0]}],signal,f.scope),/cannot widen/);
 f.scope.release();assert.equal(f.releases,1);
});
test('foreign or unknown identities do not expose bulk70 groups',async()=>{
 const f=fixture(),known=api.BULK70_IDENTITY_GROUPS[0].identities[0];
 await api.prepareInfillData([{city:'berlin',...known},{city:'frankfurt',objectId:'unknown',partId:'unknown'}],new AbortController().signal,f.scope);
 assert.deepEqual(f.calls[0].keys,[]);assert.deepEqual(api.getLOW_OFFICE_DATA(f.scope).groups,[]);f.scope.release();
});
