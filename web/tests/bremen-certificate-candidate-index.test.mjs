import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {bremenMetadataModules} from './support/fixtures3-bremen-metadata.mjs';
const source=fs.readFileSync(new URL('../src/painted/bremen/safety/bremen-identity-metadata.ts',import.meta.url),'utf8');
function original(d,c){const candidates=d['./bremen-identity-projections'].BREMEN_IDENTITY_CANDIDATES;return d['./bremen-ag70-identities'].EDGE70_IDENTITIES.some(r=>r.objectId===c.objectId&&r.partId===c.partId)||d['./bremen-demand-metadata'].BREMEN_DEMAND_METADATA.f260.models.some(m=>m.sourceCarrier&&m.sourceCarrier.objectId+'|'+m.sourceCarrier.partId===c.objectId+'|'+c.partId)||Object.keys(candidates).some(m=>(m.startsWith('bremen-')||m.endsWith('-runtime')||m==='office7a70-materials'||m==='utility-official-materials')&&candidates[m].some(r=>r.objectId+'|'+r.partId===c.objectId+'|'+c.partId));}
function load(deps){const m={exports:{}};Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(id=>deps[id],m,m.exports);return m.exports;}
test('index equals original predicate across complete real metadata and misses, preserving city gate',()=>{
 const d=bremenMetadataModules(),api=load(d),rows=[...Object.values(d['./bremen-identity-projections'].BREMEN_IDENTITY_CANDIDATES).flat(),...d['./bremen-ag70-identities'].EDGE70_IDENTITIES,...d['./bremen-demand-metadata'].BREMEN_DEMAND_METADATA.f260.models.flatMap(m=>m.sourceCarrier?[m.sourceCarrier]:[])];assert.ok(rows.length>100);
 for(const r of rows){assert.equal(api.bremenCertificateIdentityCandidate(r),original(d,r));const miss={objectId:r.objectId+'-not-a-source',partId:r.partId};assert.equal(api.bremenCertificateIdentityCandidate(miss),original(d,miss));}
 const hit=rows.find(r=>original(d,r));assert.ok(hit);assert.equal(api.bremenCertificateCandidate([{...hit,city:'berlin'}]),false);assert.equal(api.bremenCertificateCandidate([{...hit,city:'bremen'}]),true);assert.equal(api.bremenCertificateCandidate([hit]),false);
});
test('delimiter collisions, EDGE strict pairs, excluded modules and missing sourceCarrier preserve original answers',()=>{
 const d={'./bremen-identity-projections':{BREMEN_IDENTITY_CANDIDATES:{'bremen-example':[{objectId:'a|b',partId:'c'}],excluded:[{objectId:'excluded',partId:'p'}],'other-runtime':[{objectId:'runtime',partId:'p'}],'office7a70-materials':[{objectId:'office',partId:'p'}],'utility-official-materials':[{objectId:'utility',partId:'p'}]}},'./bremen-ag70-identities':{EDGE70_IDENTITIES:[{objectId:'edge|part',partId:'tail'}]},'./bremen-demand-metadata':{BREMEN_DEMAND_METADATA:{f260:{models:[{},{sourceCarrier:{objectId:'f|260',partId:'tail'}}]}}}};const api=load(d);
 for(const[objectId,partId]of[['a','b|c'],['edge|part','tail'],['edge','part|tail'],['f','260|tail'],['excluded','p'],['runtime','p'],['office','p'],['utility','p'],['unknown','p']])assert.equal(api.bremenCertificateIdentityCandidate({objectId,partId}),original(d,{objectId,partId}));
 assert.equal(api.bremenCertificateIdentityCandidate({objectId:'edge',partId:'part|tail'}),false);assert.equal(api.bremenCertificateIdentityCandidate({objectId:'a',partId:'b|c'}),true);
});
