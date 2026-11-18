import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import {build} from 'esbuild';

const web=fileURLToPath(new URL('../',import.meta.url)),base=path.join(web,'src/painted/root500/safety');
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
// Captured from the original AST nodes before extraction, including all field
// values and the original material function text. No geometry table is read.
const definitions=[
 ['f030','f533d9a82e726390907632c1d76f460efb7d5d2822619cec0e85135f6a7b473d','60623370aa6a57a5c240dea647907ccc678673c181267209c7049d007e405d86'],
 ['f008','157861e028200459345d3dade73b70f659917436d22cc82ee8a2338edae0dafe','8c99d2fd239d447bc3dd4488c9130925b41915e83b39687bebd20b61a8e282c2'],
 ['f007','a1790f23b0ebd3197a4d6438883ba74ecd0857aa11d271f6db46de5c4afb101f','c37315560084f49e59d0733703c731e7aea097f5ae15888e5ab71f6a81449616'],
 ['f006','a2f01a12cfd96bec305b5d99e9c39a2f1d0fb6edb68514314abd9853387fb9ea','318d57bb0d79b5d6c30d10b1e0295316b5a89d97024968ff51e95bb28f6a6be1'],
 ['extra6304','d8108d087ded91d12ae2b08e2f08e4dc891d034e7f58773983d26f6b435d25d9','6b813b07610cee959140d92b122916f6aa8fb134123150812b359d5d1c7957fd'],
 ['extra6306','c6b68c6bc4ddd88bc22fd8a7ff19ad3c4d60fee7efa09a6b20b98e371c2b6e55','4f97221a56f0bcd2cec8b94edac9ed38d194b602712b69977b3b1e9f0cd1332e'],
 ['f009','916606fbd6abad35385392cc3878b012a8b2b2227d44973ffefd94241c62d5be','e2fc2d4f4f66515f38eb7ee1d04b2e63a4cbfcef234b72f75bb55e315157a5a1'],
 ['f011','6be03af053a7169438de96f7512fc19b14b43a7d6cff8c234bb15ef9d201168f','8bd60c280d3e68b15c945b65925a690794d58197eda52dfd7639bc49a7b983a6'],
 ['f015','59fdca24bda9a56f90217b9270005a274ccb643ac3ef88fd1addac803220decb','4d166a8d95ca10da0f2bc11e770294bde040d0ff497f086eb23b028762f4b2bd'],
 ['f016','1c3559d9eeeda6c5c1c4e16919f4506dc85a3fce516979ed830e74a12fe68ce7','6ea27dc15796928ce208d93c92e062eb124083b74b91ab17898c6d0aced3af49'],
 ['f017','ed536132888d7596e8b5dab5e564ef8d5b0bd46002b88a13e3cda9b7136ef650','3a335b85cb28107ff652c5b285883620f110fe68198afdfbb30fc73d2df0917a'],
 ['f037','04cb78b02f8749584bc9354882ee566e88f00ebdea3c093a9ac191f24e74456b','b230ee7943a401d05f9430e0a28d35fd368092c2bfbeef7261039e92b3ac58e6'],
 ['f034','6f78b8dc0457d1ee30992047f21de4cebb028d3964043a15bd3a5c09417d885b','427f6d2cfafeadb2066ccbd4447eb3227742824e4db3bdf9205cdc41b81e989f'],
 ['f027','6c131b86b3b4a9a35fdd8ed6aab0742dbbc56bfe6deab944617d5b3ca6965f87','fa27650650eea0291ec12c2a535180f6cb2356c79400416ab39757ff1d03a58d'],
].map(([id,materialHash,identityHash])=>{const prefix=id.startsWith('extra')?'E'+id.slice(5):'F'+id.slice(1);return{id,stem:'owner-'+id,prefix,materialHash,identityHash,identity:'owner'+prefix+'Identity',materials:'owner'+prefix+'BaseMaterials',reconstruct:'owner'+prefix+'Reconstruction',prepare:'prepareOwner'+prefix+'Reconstruction',marker:prefix+'Exterior'};});
const read=name=>readFile(path.join(base,name),'utf8');
const ast=(name,text)=>ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const variable=(a,name)=>a.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations]).find(d=>d.name.getText(a)===name);

test('14 original material functions and ordered identity literals move unchanged into data-free modules',async()=>{
 for(const row of definitions){
  const [materialText,identityText,recipe,wrapper]=await Promise.all([read(row.stem+'-materials.ts'),read(row.stem+'-identities.ts'),read(row.stem+'-reconstruction.ts'),read(row.stem+'-lazy.ts')]);
  const m=ast(row.stem,materialText),i=ast(row.stem,identityText),fn=m.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===row.materials);
  assert(fn);assert.equal(hash(fn.getText(m)),row.materialHash,row.stem+' original material body');
  assert.equal(hash(variable(i,row.prefix+'_IDS').initializer.getText(i)),row.identityHash,row.stem+' complete ordered identity metadata');
  for(const a of [m,i]){assert.equal(a.parseDiagnostics.length,0);for(const n of a.statements)if(ts.isImportDeclaration(n)&&!n.importClause?.isTypeOnly)assert.equal(n.moduleSpecifier.text,'./'+row.stem+'-identities');}
  assert(recipe.includes(`export {${row.materials}} from './${row.stem}-materials'`));
  assert(wrapper.includes(`export {${row.materials}} from './${row.stem}-materials'`));
  assert(!materialText.includes('readFrozenTable'));assert(!identityText.includes('readFrozenTable'));
 }
});

test('all 14 cold wrappers write exact marked material buffers without preparing or loading a recipe',async t=>{
 const key='__berlinStatelessMaterialFixture';globalThis[key]={loads:[]};t.after(()=>{delete globalThis[key];});
 const imports=definitions.map((row,index)=>`import * as route${index} from './src/painted/root500/safety/${row.stem}-lazy';import * as metadata${index} from './src/painted/root500/safety/${row.stem}-identities';`).join('\n');
 const result=await build({stdin:{contents:imports+'\nexport const fixtures=['+definitions.map((_,index)=>`{route:route${index},metadata:metadata${index}}`).join(',')+'];',resolveDir:web,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022',plugins:[{name:'tiny-berlin-recipes',setup(builder){
  const recipePattern=new RegExp('^\\./('+definitions.map(row=>row.stem).join('|')+')-reconstruction$');
  builder.onResolve({filter:recipePattern},args=>{assert.equal(args.kind,'dynamic-import','stateless facade must not statically load its full recipe');return{path:args.path.slice(2,-15),namespace:'tiny-berlin-recipe'};});
  builder.onLoad({filter:/.*/,namespace:'tiny-berlin-recipe'},args=>{const row=definitions.find(row=>row.stem===args.path);assert(row);return{loader:'js',contents:`globalThis[${JSON.stringify(key)}].loads.push(${JSON.stringify(row.stem)});export const ${row.reconstruct}=components=>({components,stats:{fixture:true}});export const ${row.materials}=()=>{throw Error('Recipe materials must not be needed by a stateless facade');};`};});
  builder.onResolve({filter:/frozen-paint-tables/},()=>{throw Error('A real frozen data reader entered a stateless material fixture');});
 }}]});
 const module=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 for(const [index,row]of definitions.entries()){
  const {route,metadata}=module.fixtures[index],identity=metadata[row.prefix+'_IDS'][0];
  const plain={city:'berlin',objectId:'unrelated',partId:'unrelated',batches:[{positions:[0,0,0]}]};
  const material={positions:[0,0,0,1,1,1],writeMask:[true,false],paint:[.1,.2,.3,.4,.5,.6,.7,.8],frames:[1,2,3,4,5,6,7,8,9,10]};
  const marked={...identity,batches:[material],displayEstimates:{[row.marker]:true}},paint=new Float32Array(12).fill(-7),frames=new Float32Array(15).fill(-9);
  assert.throws(()=>route[row.reconstruct]([marked]),/not prepared/);
  const expectedPaint=new Float32Array(paint),expectedFrames=new Float32Array(frames),vertices=row.id==='f030'?2:1;
  expectedPaint.set(material.paint.slice(0,vertices*4),4);expectedFrames.set(material.frames.slice(0,vertices*5),5);
  assert.deepEqual(route[row.materials]([plain,marked],paint,frames),{objects:1,vertices,actualVisualAccepted:false},row.stem);
  assert.deepEqual(paint,expectedPaint);assert.deepEqual(frames,expectedFrames);assert.equal(globalThis[key].loads.length,0);
  const noHitPaint=new Float32Array([.25]),noHitFrames=new Float32Array([.5]);
  assert.deepEqual(route[row.materials]([{...marked,city:'bremen'}],noHitPaint,noHitFrames),{objects:0,vertices:0,actualVisualAccepted:false});
  assert.deepEqual([...noHitPaint],[.25]);assert.deepEqual([...noHitFrames],[.5]);
  assert.equal(route[row.prepare]([{...marked,city:'bremen'}],new AbortController().signal),undefined);
 }
 assert.deepEqual(globalThis[key].loads,[]);
 // Preparing one matching route still invokes its original dynamic-loader
 // contract. Its public material writer remains independent after readiness.
 const row=definitions[0],f=module.fixtures[0],target={...f.metadata[row.prefix+'_IDS'][0],batches:[]};
 await f.route[row.prepare]([target],new AbortController().signal);assert.deepEqual(globalThis[key].loads,[row.stem]);
 assert.deepEqual(f.route[row.materials]([],new Float32Array(),new Float32Array()),{objects:0,vertices:0,actualVisualAccepted:false});
});
