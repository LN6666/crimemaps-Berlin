#!/usr/bin/env node
/** Static maintenance producer. It parses three authorized TS files; it never
 * imports their modules, evaluates a shader builder, or opens a data asset.
 * Drafts are reviewed and integrated by each facade's exclusive writer. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(resolve(root,'web/package.json'));
const ts=require('typescript');
const inputs=['root500','infill','bremen'].map(provider=>({provider,file:`web/src/painted/${provider}/safety/facade-paint-fragment.ts`}));
const MAX_INPUT_BYTES=1536*1024,MAX_DRAFT_BYTES=32*1024,MAX_RECEIPT_BYTES=12*1024;
const NEWLINE=String.fromCharCode(10);
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--out-dir')throw Error('Usage: node scripts/render/build-facade-source-bounds.mjs --out-dir <directory inside this worktree>');
const outDir=resolve(root,args[1]);
if(relative(root,outDir).startsWith('..')||outDir===root)throw Error('Draft directory must be inside this worktree');
const digest=text=>createHash('sha256').update(text).digest('hex');
const spelling=(node,source)=>node.getText(source);
const unwrap=node=>ts.isParenthesizedExpression(node)?unwrap(node.expression):node;
function flattenAdd(node){node=unwrap(node);return ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken?[...flattenAdd(node.left),...flattenAdd(node.right)]:[node];}
function visit(node,callback){callback(node);ts.forEachChild(node,child=>visit(child,callback));}
function isSharedSlice(node,source){
 node=unwrap(node);
 if(!ts.isCallExpression(node)||!ts.isPropertyAccessExpression(node.expression)||node.expression.name.text!=='slice'||!ts.isIdentifier(node.expression.expression)||node.expression.expression.text!=='shared')return;
 return node.arguments.map(value=>spelling(value,source).replace(/\s+/g,'')).join(',');
}
function isPureRoute(node){
 let allowed=true;
 visit(node,value=>{
  if(ts.isCallExpression(value)){
   if(!ts.isPropertyAccessExpression(value.expression)||value.expression.name.text!=='includes'||!ts.isArrayLiteralExpression(unwrap(value.expression.expression)))allowed=false;
  }else if(ts.isIdentifier(value)&&!['key','city','TV_BASE_REPAIR_PROGRAM_KEY','includes','undefined','true','false'].includes(value.text))allowed=false;
 });
 return allowed;
}
function isSourceAtom(node){
 node=unwrap(node);
 if(ts.isIdentifier(node)||ts.isStringLiteralLike(node)||ts.isNumericLiteral(node))return true;
 if(ts.isPropertyAccessExpression(node))return isSourceAtom(node.expression);
 return false;
}
function convertSource(node,source,definitions,needed){
 node=unwrap(node);
 if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken)return `joinShaderSourceParts([${flattenAdd(node).map(value=>convertSource(value,source,definitions,needed)).join(',')}])`;
 if(ts.isConditionalExpression(node)){
  if(!isPureRoute(node.condition))throw Error('Source conditional is not a pure city/key choice');
  return `(${spelling(node.condition,source)}?${convertSource(node.whenTrue,source,definitions,needed)}:${convertSource(node.whenFalse,source,definitions,needed)})`;
 }
 if(ts.isTemplateExpression(node)){
  for(const span of node.templateSpans)if(!isSourceAtom(span.expression)||ts.isIdentifier(span.expression)&&definitions.has(span.expression.text))throw Error('Template contains an unclassified/local producer');
  return 'shaderSourceParts'+spelling(node,source);
 }
 if(!isSourceAtom(node))throw Error('Unclassified source expression: '+ts.SyntaxKind[node.kind]);
 if(ts.isIdentifier(node)&&definitions.has(node.text)){
  if(needed.has(node.text))throw Error('Recursive local source definition');
  needed.add(node.text);const result=convertSource(definitions.get(node.text),source,definitions,needed);needed.delete(node.text);return result;
 }
 return spelling(node,source);
}
function branchDefinitions(block){
 const definitions=new Map();
 for(const statement of block.statements??[]){
  if(!ts.isVariableStatement(statement))continue;
  for(const declaration of statement.declarationList.declarations)if(ts.isIdentifier(declaration.name)&&declaration.initializer)definitions.set(declaration.name.text,declaration.initializer);
 }
 return definitions;
}
function returnPaths(block,source,path=[]){
 const returns=[];
 for(const statement of block.statements??[]){
  if(ts.isReturnStatement(statement)&&statement.expression)returns.push({node:statement.expression,path});
  else if(ts.isIfStatement(statement)&&isPureRoute(statement.expression)){
   const yes=ts.isBlock(statement.thenStatement)?statement.thenStatement:{statements:[statement.thenStatement]};
   returns.push(...returnPaths(yes,source,[...path,spelling(statement.expression,source)]));
   if(statement.elseStatement){const no=ts.isBlock(statement.elseStatement)?statement.elseStatement:{statements:[statement.elseStatement]};returns.push(...returnPaths(no,source,[...path,`!(${spelling(statement.expression,source)})`]));}
  }
 }
 return returns;
}
function provesSharedOrder(block,source,definitions){
 const start=definitions.get('start'),brace=definitions.get('brace'),text=spelling(block,source).replace(/\s+/g,'');
 if(!start||!brace||spelling(start,source).replace(/\s+/g,'')!=="shared.indexOf('vec3paintedFacade(')"||spelling(brace,source).replace(/\s+/g,'')!=="shared.indexOf('{',start)")return false;
 // Only the existing successful balanced-body walk proves end>brace>=start.
 // A differently written scan is kept as an explicit conservative slice sum.
 return text.includes('for(leti=brace;i<shared.length;i++)')&&text.includes('end=i+1;break;')&&text.includes("shared[i]==='}'&&--depth===0")&&text.includes('if(end<0)throw');
}
function projectReturn(expression,source,definitions,ordered){
 const terms=flattenAdd(expression),slices=terms.map(value=>isSharedSlice(value,source)).filter(value=>value!==undefined);
 if(!slices.length)throw Error('Not an isolated shared-facade splice');
 const sorted=[...slices].sort();
 const disjoint=ordered&&(JSON.stringify(sorted)===JSON.stringify(['0,start','end'].sort())||JSON.stringify(sorted)===JSON.stringify(['0,start','start,brace+1','end-1'].sort()));
 // Unproved slices are never silently treated as a single shared prefix.
 // The parent adds the empty facade part `sharedCopies` times in this case.
 const sharedCopies=disjoint?1:slices.length;
 const addition=terms.filter(value=>isSharedSlice(value,source)===undefined).map(value=>convertSource(value,source,definitions,new Set()));
 if(!addition.length)throw Error('Shared splice has no added source');
 return {part:`joinShaderSourceParts([${addition.join(',')}])`,sharedCopies,concatenationSteps:terms.length-1,proof:disjoint?'ordered-disjoint-shared-slices':'conservative-sum-of-original-slice-inputs'};
}
function findProducer(source){
 const matches=[];visit(source,node=>{if(ts.isFunctionDeclaration(node)&&node.name&&['paintProgramFragmentUncached','paintProgramFragmentUnscoped','paintProgramFragment'].includes(node.name.text)&&node.body)matches.push(node);});
 const preferred=matches.find(node=>node.name.text==='paintProgramFragmentUncached')??matches.find(node=>node.name.text==='paintProgramFragmentUnscoped')??matches.find(node=>node.body.statements.some(statement=>ts.isIfStatement(statement)&&spelling(statement.expression,source).includes('owner')));
 if(!preferred)throw Error('Actual partition producer was not found');return preferred;
}
const drafts=[],receipt=[];let inputBytes=0;
for(const input of inputs){
 const text=await readFile(resolve(root,input.file),'utf8');inputBytes+=Buffer.byteLength(text);if(inputBytes>MAX_INPUT_BYTES)throw Error('Authorized facade input bound exceeded');
 const source=ts.createSourceFile(input.file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 if(source.parseDiagnostics.length)throw Error(input.file+': TypeScript syntax is not parseable');
 const producer=findProducer(source),selected=[],skipped=[];
 for(const statement of producer.body.statements){
  if(!ts.isIfStatement(statement))continue;
  const condition=spelling(statement.expression,source),line=source.getLineAndCharacterOfPosition(statement.getStart(source)).line+1;
  if(!isPureRoute(statement.expression)){skipped.push({line,reason:'non-pure or non-finite route; owner integrates its existing catalogue/certified path'});continue;}
  if(!ts.isBlock(statement.thenStatement)){skipped.push({line,reason:'non-block route'});continue;}
  const block=statement.thenStatement,definitions=branchDefinitions(block),paths=returnPaths(block,source);let count=0;
  for(const returned of paths){
   try{
    const result=projectReturn(returned.node,source,definitions,provesSharedOrder(block,source,definitions));
    selected.push({line,condition:[condition,...returned.path].map(value=>`(${value})`).join('&&'),...result,returnSHA256:digest(spelling(returned.node,source))});count++;
   }catch(error){if(spelling(returned.node,source).includes('shared.slice('))throw Error(`${input.file}:${line}: ${error.message}`);}
  }
  if(!count)skipped.push({line,reason:'base/catalogue/registry path; no isolated shared splice'});
 }
 const lines=[`// Static draft from ${input.file}; source SHA256 ${digest(text)}.`,`// No facade output was built. Review skipped paths in the receipt.`,`function describeSelectedOwnerSourcePart(city:string,key:string):{part:ShaderSourcePart;sharedCopies:number;concatenationSteps:number;proof:string}|undefined{`,` const select=(part:ShaderSourcePart,sharedCopies:number,concatenationSteps:number,disjoint:boolean)=>({part,sharedCopies,concatenationSteps,proof:disjoint?'ordered-disjoint-shared-slices':'conservative-sum-of-original-slice-inputs'});`];
 for(const branch of selected)lines.push(` if(${branch.condition})return select(${branch.part},${branch.sharedCopies},${branch.concatenationSteps},${branch.proof==='ordered-disjoint-shared-slices'});`);
 lines.push('}','');
 const draft=lines.join(NEWLINE);if(Buffer.byteLength(draft)>MAX_DRAFT_BYTES)throw Error(input.provider+': draft '+Buffer.byteLength(draft)+' bytes exceeds reviewed '+MAX_DRAFT_BYTES+' byte growth cap');
 drafts.push({file:input.provider+'-owner-source-bounds.inc.ts',text:draft});
 receipt.push({provider:input.provider,input:input.file,inputBytes:Buffer.byteLength(text),inputSHA256:digest(text),producer:producer.name.text,selected:selected.length,sharedCopies:[...new Set(selected.map(value=>value.sharedCopies))],selectedLines:selected.map(value=>value.line),projectionSHA256:digest(JSON.stringify(selected)),draftBytes:Buffer.byteLength(draft),draftSHA256:digest(draft),skipped});
}
const report=JSON.stringify({schemaVersion:1,mode:'static-source-projection-no-product-imports',inputBytes,maxDraftBytesPerProvider:MAX_DRAFT_BYTES,outputs:receipt},null,2)+NEWLINE;
if(Buffer.byteLength(report)>MAX_RECEIPT_BYTES)throw Error('Receipt exceeds reviewed growth cap');
await mkdir(outDir,{recursive:true});
for(const draft of drafts)await writeFile(resolve(outDir,draft.file),draft.text,{flag:'wx'});
await writeFile(resolve(outDir,'receipt.json'),report,{flag:'wx'});
process.stdout.write(JSON.stringify({outDir:relative(root,outDir),inputBytes,outputs:receipt.map(({provider,selected,draftBytes,skipped})=>({provider,selected,draftBytes,skipped:skipped.length}))})+NEWLINE);
