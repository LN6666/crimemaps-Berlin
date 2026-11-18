import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import ts from 'typescript';

const web=fileURLToPath(new URL('../',import.meta.url)),root=path.join(web,'src/painted/root500/safety'),owners=['033','035','026','031','036','005'],hash=value=>createHash('sha256').update(value).digest('hex');
const ast=(name,text)=>ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
function bindings(container,source=container){const rows=new Map();for(const node of container.statements){if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations)rows.set(declaration.name.getText(source),declaration.initializer);else if(ts.isFunctionDeclaration(node))rows.set(node.name?.text,node);}return rows;}

// These source-node hashes pin the accepted algorithms and literal/initializer
// boundaries during this stateless extraction. No table value is parsed here.
const accepted={
 '033':{ids:'a459f9ae306c20fb32beab170b152e1546d6f2f44b634988e8a258020cd18b03',source:'d4b863faf9b7c8ad3c05544f39876710bf1898b23cab99f16cceba56b003fec1',display:'d4567ba98d28e1b8adca077802852ba7e5456048b4421123a5c24d4aa621570c',reconstruct:'57623fdcff96521b98b6717566825e22170666c6d2c03c749f48e2640aec88f4',material:'2d46141de5d5e8cb48b06b7694cbaeda7cca123a393a509cce0c614f193a0df6',paint:'452e102457835ad3bafbc3eec63f3c46c2fd13f8ceb763a47f84acb91d348394'},
 '035':{ids:'d8129f5203781380d6f3d71e4b7634022af2b4d44695e3c5e8fe71f92855bc52',source:'7dab6b8b4be7c83fc3d34742a94f3abdef02c224efe2bb0a24e4f3c209ea664b',display:'7a20a1fa77e46d6f419dfd73e7b5e5da30e0438c6bf17a562a803df48930c378',reconstruct:'b36247e12a9717202422485955d08ffb80aead50dde4f3477a5c555cdee34188',material:'2b54cb7aa606c62f963dd7947f4dd76c2b6aece1dff71eced4c31a46204fd4e1',paint:'19180baf92452a99e03e35edbdef667147ae649ab98ade80722742b9881e4b71'},
 '026':{ids:'0cdd69279e147b8aec295ff498e5ecb9d2c0a8483d0907c5d6a55f371f0c7e8c',source:'c9056fecd6e7d50cd88cf6b0366ceda266cff753f7782ce1097adafcb86ccc60',display:'b9388b8858d3ac1936fa91e3b6378e1be5f7b826c5275ac18d58c7b99c963be7',reconstruct:'59bc0911979775d77cc8a5555eb0c83f82d0c270b19e98d95861359eb42194f2',material:'3523916fa95e356c4894ef000728b8cb7b4853b49cb21abc120932c0951feab8',paint:'1a6604973611ff87f61b82260ec563cc0945d2028b52088396d4d7488a92180e'},
 '031':{ids:'a5fc30dc7e1d3ef55e51d1a8610e2a5605335f7d024e1f9337debdcfeffb2430',source:'c5b4a4d71fde21e242706de34bc5147ba819ef81c481294c939650be7f40f50f',display:'fce0ae3d4a3b86163a83c802cd38fe18b1baed866f78942c05c4810182bd1105',reconstruct:'479b5f2d17400c256517943c1f78a3d8a07c0dd58dc0450b2ff66203f3dd191f',material:'3bd9682a3a3fa585c3a88cadcc85c4e57b26df987612ca7f8d46d9a6923dc7e1',paint:'66f8cb29d27fc264ad1c852710b2e9e4f4df9c40a439bc2db8017dfa4d2e228e'},
 '036':{ids:'b72b9f6023dd0167945e264208776cd37f8e838dcf007838b52ee3b0ff3b26c2',source:'7bd4265fd9939ab56b9ec2ac61ea6e290221f4f084139f502ea6f25a6927413d',display:'6a2c37050b377d2e3729ddb9fcd5af065750699aee00b59fe02c216b24a710bd',reconstruct:'a108e096d0f17773c44c4005559161171b64744f8bc59dd0d30b24155a270380',material:'4398891392d604905957bb589c52436fb6461da1c28d95c43c521ad425550683',paint:'c02d6fe638b16da7c9cc7ac8bf422943a335dce56e37af6d5b5c3d2b756bcb07'},
 '005':{ids:'9011f584014bdfb31b1e5cbf92a007fe53e995dab7aa1a95e80ce85a7ea140ef',source:'6415b87dac1f4740dbd3d85ac44195e4e1f0e2e517b3ada57611856f9bf8757a',display:'29b023653a5fd26cf28f1896f6454a06381341e4226ddaabb335a13fba4f8447',reconstruct:'8096fded9347165d537fa5884c2581960fd17b95a0ff20c7b232a9e0e425d910',material:'a8003248a7fefb958daa0f16476e07327483585dcf30dc60d3e37516b56b1f14',paint:'c2069f967001f608e419889bcc4d67ee83971f463bce76a64bb583387515f977'},
};
// Derived independently from the reviewed commit 2257c636c3993ddc860216dd0001e61d96080029.
// Its public representation changes only the local prefixes of the evidence locators.
const publicSourceDigests={
 '026':'8f6be97222dde89ef0f39477f9969e2c83e3a4d56c1fee6528340722e1485ddb',
 '031':'2cde4ecb8767f808a4db01ddce8d7e2b884692abb02f29a5c67deb62d15f557a',
 '036':'761a76167c3d26583cbd63a9066697708c0dffdb35cbc6cc19f25d8e7a48a515',
 '005':'59aedb4ead31ff05fe60c38d8a2834421ee871eb842e5034e061cd11c63ab0e8',
};
function memo(source){
 const getter=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='getRoot500Data');assert(getter,'Explicit scope getter must exist');
 const returned=getter.body.statements.find(ts.isReturnStatement),call=returned?.expression;assert(call&&ts.isCallExpression(call)&&ts.isPropertyAccessExpression(call.expression)&&call.expression.expression.getText(source)==='scope'&&call.expression.name.text==='memo');
 const factory=call.arguments[1];assert(factory&&ts.isArrowFunction(factory)&&ts.isBlock(factory.body));
 const data=bindings(factory.body,source);return{getter,factory,data};
}
function ownRefs(source){
 const declaration=source.statements.flatMap(node=>ts.isVariableStatement(node)?[...node.declarationList.declarations]:[]).find(node=>node.name.getText(source)==='__root500OwnRefs');assert(declaration&&ts.isArrayLiteralExpression(declaration.initializer));
 return declaration.initializer.elements.map(node=>{assert(ts.isObjectLiteralExpression(node));const row={};for(const field of node.properties){assert(ts.isPropertyAssignment(field));assert(ts.isStringLiteral(field.initializer)||ts.isNumericLiteral(field.initializer));row[field.name.text]=ts.isNumericLiteral(field.initializer)?Number(field.initializer.text):field.initializer.text;}assert.deepEqual(Object.keys(row).sort(),['canonicalSHA256','codec','file','occurrence']);assert.equal(row.codec,'json');return row;});
}
// Reverse only the accepted transport/lifetime rewrite. Every byte outside the
// one original read expression (including all types/numbers) remains hash-pinned.
function originalReadInitializer(node,source,{clone=false,literalAllowed=false}={}){
 const reads=[];(function visit(n){if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.expression.getText(source)==='scope'&&n.expression.name.text==='borrow')reads.push(n);ts.forEachChild(n,visit);})(node);if(literalAllowed&&!reads.length){assert(ts.isObjectLiteralExpression(node),'Only the original inline SOURCE object may avoid a lease read');return node.getText(source);}assert.equal(reads.length,1,'One exact leased initializer');
 const read=reads[0];assert.equal(read.typeArguments?.map(arg=>arg.getText(source)).join(','),'any,any');assert.equal(read.arguments.length,2);assert.equal(read.arguments[1].getText(source),'value=>value');
 const index=read.arguments[0];assert(ts.isElementAccessExpression(index)&&index.expression.getText(source)==='__root500OwnRefs'&&ts.isNumericLiteral(index.argumentExpression));const ref=ownRefs(source)[Number(index.argumentExpression.text)];assert(ref);
 const parent=read.parent,isClone=ts.isCallExpression(parent)&&parent.expression.getText(source)==='structuredClone';assert.equal(isClone,clone,'Only a mutated borrowed display is cloned');if(isClone)assert.equal(parent.arguments.length,1);
 const target=clone?parent:read,start=node.getStart(source),text=node.getText(source);return text.slice(0,target.getStart(source)-start)+`await readFrozenTableAsync(${JSON.stringify(ref.canonicalSHA256)},${JSON.stringify(ref.file)},${ref.occurrence})`+text.slice(target.end-start);
}
function originalAlgorithm(node,source,id){
 assert(ts.isFunctionDeclaration(node));const params=node.parameters;assert.equal(params.length,2);assert.equal(params[1].getText(source),'$scope?:FrozenDataScope');
 const statements=node.body.statements,[cold,cell,accessor,stats]=statements;assert(ts.isIfStatement(cold)&&cold.expression.getText(source)==='!mayMatchRoot500Data(components)');assert(ts.isBlock(cold.thenStatement)&&cold.thenStatement.statements.length===2);assert(ts.isVariableStatement(stats));
 const alias=id==='035'?'components.map(component=>component)':'components';
 assert.equal(cold.thenStatement.getText(source),'{'+stats.getText(source)+'return{components:'+alias+',stats:stats};}','The added cold guard retains the original zero stats and array alias');
 assert.equal(cell.getText(source),'let __root500DataCell:ReturnType<typeof getRoot500Data>|undefined;');
 assert.equal(accessor.getText(source),'const __root500Data=()=>__root500DataCell??=(getRoot500Data($scope));');
 const start=node.getStart(source),text=node.getText(source),edits=[{start:params[0].end-start,end:params[1].end-start},{start:cold.getStart(source)-start,end:accessor.end-start}].sort((a,b)=>b.start-a.start);let original=text;for(const edit of edits)original=original.slice(0,edit.start)+original.slice(edit.end);
 // These six algorithms only acquired SOURCE/DISPLAY through the scope. No
 // arithmetic, guard, copy field, signature, typed array or material is removed.
 original=original.replaceAll('__root500Data().SOURCE','SOURCE').replaceAll('__root500Data().DISPLAY','DISPLAY');assert(!original.includes('__root500')&&!original.includes('$scope'));return original;
}
function noEagerData(source,label){
 function visit(node,inFunction=false){const nested=inFunction||ts.isFunctionLike(node);if(ts.isAwaitExpression(node))assert(nested,label+' has top-level await');if(!nested&&ts.isCallExpression(node)){const name=node.expression.getText(source);assert(!/^readFrozenTable(?:Async)?$|^JSON\.parse$/.test(name),label+' eagerly reads/parses model data');}ts.forEachChild(node,child=>visit(child,nested));}visit(source);
}
async function fixture(){
 const imports=owners.map(id=>`import * as static${id} from './src/painted/root500/safety/owner-f${id}-stateless';`).join('');
 const result=await build({stdin:{contents:imports+`export const stateless={${owners.map(id=>`'${id}':static${id}`).join(',')}};`,resolveDir:web,sourcefile:'six-berlin-stateless-boundary.ts',loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022',plugins:[{name:'stateless-only',setup(builder){builder.onResolve({filter:/owner-f\d+-reconstruction|frozen-paint-tables|completion-geometry|painted-tables|\.json(?:\.gz)?$/},()=>{throw Error('A stateless public API must not import a builder or model input');});}}]});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text+'\n//# sourceURL=six-berlin-stateless-boundary.mjs').toString('base64'));
}

test('six scoped recipes retain the exact original source, display initializer, reconstruction algorithm, IDs, materials and shaders',async()=>{
 for(const id of owners){
  const builderText=await readFile(path.join(root,`owner-f${id}-reconstruction.ts`),'utf8'),builderAST=ast(id,builderText),scope=memo(builderAST),data=scope.data,outer=bindings(builderAST),statelessText=await readFile(path.join(root,`owner-f${id}-stateless.ts`),'utf8'),statelessAST=ast(id+'-stateless',statelessText),pure=bindings(statelessAST),identityAST=id==='033'?ast('identities',await readFile(path.join(root,'owner-f033-identities.ts'),'utf8')):statelessAST,identity=bindings(identityAST);
  assert(!outer.has('SOURCE')&&!outer.has('DISPLAY'),'Model roots only live in scope.memo');noEagerData(builderAST,id);
  const sourceInitializer=originalReadInitializer(data.get('SOURCE'),builderAST,{literalAllowed:true});
  const expectedSourceDigest=sourceInitializer.includes('source-evidence/')?publicSourceDigests[id]:accepted[id].source;
  assert.equal(hash(sourceInitializer),expectedSourceDigest,id+' SOURCE initializer');
  assert.equal(hash(originalReadInitializer(data.get('DISPLAY'),builderAST,{clone:id==='005'})),accepted[id].display,id+' original DISPLAY initializer');assert.equal(hash(originalAlgorithm(outer.get(`ownerF${id}Reconstruction`),builderAST,id)),accepted[id].reconstruct,id+' complete original reconstruction');
  assert.equal(hash(identity.get(`F${id}_IDS`).getText(identityAST)),accepted[id].ids);assert.equal(hash(pure.get(`ownerF${id}BaseMaterials`).getText(statelessAST)),accepted[id].material);assert.equal(hash(await readFile(path.join(root,`owner-f${id}-paint.ts`))),accepted[id].paint);
  assert(builderAST.statements.some(node=>ts.isExportDeclaration(node)&&node.moduleSpecifier?.text===`./owner-f${id}-stateless`),'Original named stateless APIs remain re-exported');
 }
 const f026=ast('F026',await readFile(path.join(root,'owner-f026-stateless.ts'),'utf8'));assert.equal(hash(bindings(f026).get('F026_ASSEMBLY').getText(f026)),'ae7679027b5764ac1c9a3ceb0cd5c9301798e493acbdcc8082859d9578111dbe');
});

test('F005 completion geometry, paint and the one scoped display append preserve their exact original values',async()=>{
 // Original F005_COMPLETION_BATCH AST initializer from reviewed commit 2257c636c3993ddc860216dd0001e61d96080029.
 const geometryAST=ast('F005-geometry',await readFile(path.join(root,'owner-f005-completion-geometry.ts'),'utf8')),scope=memo(geometryAST);
 assert(!bindings(geometryAST).has('F005_COMPLETION_BATCH'));noEagerData(geometryAST,'F005 completion');
 assert.equal(hash(originalReadInitializer(scope.data.get('F005_COMPLETION_BATCH'),geometryAST)),'bdf3f9c0bc2bca2f2f7a9497ae7dd19257c232efa9739387ca54f3d38c419498');
 assert.equal(hash(await readFile(path.join(root,'owner-f005-completion-paint.ts'))),'0b6e9b9a95436ce885f288b9535b6ce41bb2ce5e21a78c09903c65840c26eaf4');
 const builderAST=ast('F005',await readFile(path.join(root,'owner-f005-reconstruction.ts'),'utf8')),factory=memo(builderAST).factory,appends=[];(function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='push'&&ts.isElementAccessExpression(node.expression.expression)&&node.expression.expression.expression.getText(builderAST)==='DISPLAY')appends.push(node);ts.forEachChild(node,visit);})(builderAST);
 assert.equal(appends.length,1);assert(appends[0].getStart(builderAST)>factory.body.getStart(builderAST)&&appends[0].end<factory.body.end);assert.equal(appends[0].getText(builderAST),"DISPLAY['osm/way/15968753/component/df262f9aa259b5dd8f1b'].push(F005_COMPLETION_BATCH)");
});

test('eager AST closure of six stateless and paint entry points excludes every scoped recipe and table',async t=>{
 const pending=owners.flatMap(id=>['stateless','paint'].map(kind=>path.join(root,`owner-f${id}-${kind}.ts`))).concat(path.join(root,'owner-f005-completion-paint.ts')),seen=new Set();
 while(pending.length){
  const file=pending.pop();if(seen.has(file))continue;seen.add(file);assert(seen.size<=32);const source=ast(file,await readFile(file,'utf8'));assert.equal(source.parseDiagnostics.length,0);assert(!/owner-f\d+-reconstruction\.ts$|completion-geometry|frozen-paint|\.json$/.test(file),'Eager data dependency: '+path.basename(file));noEagerData(source,path.basename(file));
  for(const node of source.statements){if(!ts.isImportDeclaration(node)&&!ts.isExportDeclaration(node))continue;if(!node.moduleSpecifier?.text?.startsWith('.'))continue;if(node.isTypeOnly||node.importClause?.isTypeOnly)continue;const list=node.importClause?.namedBindings??node.exportClause;if(list&&list.elements?.length&&list.elements.every(row=>row.isTypeOnly)&&!node.importClause?.name)continue;const target=path.resolve(path.dirname(file),node.moduleSpecifier.text)+'.ts';assert((await stat(target)).isFile());pending.push(target);}
 }
 t.diagnostic('Six-owner stateless/paint eager boundary: '+seen.size+' small source modules.');
});

test('complete city-agnostic identities and exact writeMask material arrays remain independent of all scoped recipes',async()=>{
 const f=await fixture();
 for(const id of owners){const pure=f.stateless[id],identity=pure[`ownerF${id}Identity`],material=pure[`ownerF${id}BaseMaterials`],ids=pure[`F${id}_IDS`];assert(ids.length);for(const row of ids)for(const city of ['berlin','bremen','unknown']){assert(identity({...row,city}));assert(!identity({...row,city,partId:row.partId+'-wrong'}));}
  const batch={positions:new Float32Array(9),paint:Float32Array.from({length:12},(_,i)=>i+.25),frames:Float32Array.from({length:15},(_,i)=>i+.5),writeMask:[true,false,true]},plain={city:'berlin',objectId:'unknown',partId:'unknown',batches:[{positions:[0,0,0]}]},marked={...ids[0],batches:[batch],displayEstimates:{[`F${id}Exterior`]:true}},foreign={...marked,city:'bremen'},unmarked={...marked,displayEstimates:{}},paint=new Float32Array(40).fill(-1),frames=new Float32Array(50).fill(-1);
  assert.deepEqual(material([plain,marked,foreign,unmarked],paint,frames),{objects:1,vertices:2,actualVisualAccepted:false});
  const expectedPaint=new Float32Array(40).fill(-1),expectedFrames=new Float32Array(50).fill(-1);expectedPaint.set(batch.paint.slice(0,4),4);expectedPaint.set(batch.paint.slice(8,12),12);expectedFrames.set(batch.frames.slice(0,5),5);expectedFrames.set(batch.frames.slice(10,15),15);assert.deepEqual(paint,expectedPaint);assert.deepEqual(frames,expectedFrames);
 }
});
// Actual cold/prepare/cancel/alias behavior is covered by the canonical scoped
// recipes in root500-owner-data-scope.test.mjs and root500-owner-staged-scope.test.mjs.
// This file neither implements nor retains a second preparation/loader path.
