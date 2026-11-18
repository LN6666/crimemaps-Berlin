import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {partitionCityTable} from '../../scripts/city-data-shards.mjs';

test('group envelopes preserve exact source lexemes and keep native cohorts atomic',()=>{
 const raw=Buffer.from('{ "groups" : [ {"queueId":"a","models":[{"x":-0},{"x":1e2}],"requiredNativeGroup":["one","two"]},\n {"queueId":"b","models":[{"x":2}]} ], "SOURCEImmutable":true,"selectedCount":2 }');
 const {partition,assets}=partitionCityTable(raw,{kind:'group-envelope',targetBytes:100});
 assert.equal(partition.parts.length,2);assert.deepEqual(partition.parts.map(p=>p.keys),[['a'],['b']]);
 assert.equal(partition.parts[0].oversizedAtomic,true);
 const values=assets.map(a=>JSON.parse(gunzipSync(a.packed).toString()));
 assert.deepEqual(values[0].groups[0].requiredNativeGroup,['one','two']);
 assert.equal(values[0].groups[0].models.length,2);
 for(const value of values){assert.equal(value.SOURCEImmutable,true);assert.equal(value.selectedCount,2);}
 const texts=assets.map(a=>gunzipSync(a.packed).toString());
 const {prefix,suffix,separators}=partition.sourceLayout;
 const rows=texts.map(s=>s.slice(prefix.length,s.length-suffix.length));
 assert.equal(prefix+rows.map((s,i)=>(i?separators[i-1]:'')+s).join('')+suffix,raw.toString());
});

test('group envelope rejects missing and duplicate queue identities',()=>{
 for(const groups of [[{models:[]}],[{queueId:'same'},{queueId:'same'}]]){
  assert.throws(()=>partitionCityTable(Buffer.from(JSON.stringify({groups})),{kind:'group-envelope'}),/identity/);
 }
});
