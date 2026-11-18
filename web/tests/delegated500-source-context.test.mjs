import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';

const web=fileURLToPath(new URL('../',import.meta.url)),root=path.join(web,'src/painted/delegated500/safety'),runtime=createRuntimeLoader(web),context=runtime.load(path.join(root,'renderer-source-context.ts'));
const identity=row=>JSON.stringify([row.city,row.objectId,row.partId]);
const sha=value=>createHash('sha256').update(value).digest('hex');
function originalIdentities(file){
 const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);let literal;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='SPEC')literal=node.initializer;ts.forEachChild(node,visit);}visit(ast);assert(literal,'the original recipe still declares its SPEC');
 while(ts.isAsExpression(literal)||ts.isSatisfiesExpression(literal)||ts.isParenthesizedExpression(literal))literal=literal.expression;
 const spec=JSON.parse(literal.getText(ast)),rows=new Map();
 function collect(value,city){if(Array.isArray(value)){for(const item of value)collect(item,city);}else if(value&&typeof value==='object'){city=value.city??city;if(typeof city==='string'&&typeof value.objectId==='string'&&typeof value.partId==='string'){const row={city,objectId:value.objectId,partId:value.partId};rows.set(identity(row),row);}for(const item of Object.values(value))collect(item,city);}}
 collect(spec);return [...rows.values()];
}
test('delegated physical source cohorts retain the exact scalar projection and authority of every declared original SPEC',()=>{
 const groups=context.DELEGATED_SOURCE_CONTEXT_GROUPS;assert.equal(groups.length,63);assert.equal(new Set(groups.map(group=>group.module)).size,groups.length);
 for(const group of groups){const file=path.join(root,group.module+'.ts');assert.equal(sha(fs.readFileSync(file)),group.sourceSHA256,group.module+' source authority');assert.deepEqual(group.identities,originalIdentities(file),group.module+' exact source identity projection');}
 assert.equal(context.DELEGATED_DATA_DEMAND_SHA256,sha(fs.readFileSync(path.join(root,'delegated500-data-demand.ts'))));
});
test('delegated source context closes a static material cohort and borrows only its actually resident rows',()=>{
 const cohort=context.DELEGATED_SOURCE_CONTEXT_GROUPS.find(group=>group.module==='hh-strafjustiz');assert(cohort&&cohort.identities.length>1);
 const first={...cohort.identities[0]},second={...cohort.identities[1]},unrelated={city:first.city,objectId:'osm/way/990099001',partId:'unrelated'};
 const closure=context.delegatedSourceContext([first]),closed=new Set(closure.identities.map(identity));for(const row of cohort.identities)assert(closed.has(identity(row)));assert.equal(closed.has(identity(unrelated)),false);
 const a={contentKey:'source-a',components:[first,unrelated]},b={contentKey:'source-b',components:[second]},c={contentKey:'unrelated-source',components:[unrelated]},selected=context.resolveDelegatedSourceContext([first],[c,b,a]);
 assert.deepEqual(selected.contributors,[a,b]);assert.deepEqual(selected.components,[first,second]);assert.equal(selected.components.length,2,'declared but absent source members do not appear or trigger reads');assert(selected.authority[2].some(([module,sourceSHA])=>module===cohort.module&&sourceSHA===cohort.sourceSHA256));
});
test('delegated ordinary source contexts remain stable when an unrelated already-resident group arrives',()=>{
 const row={city:'cologne',objectId:'osm/way/990099010',partId:'ordinary'},other={city:'cologne',objectId:'osm/way/990099011',partId:'other'},a={contentKey:'source-a',components:[row]},b={contentKey:'source-b',components:[other]};
 assert.deepEqual(context.resolveDelegatedSourceContext([row],[a,b]),context.resolveDelegatedSourceContext([row],[a]));
});
