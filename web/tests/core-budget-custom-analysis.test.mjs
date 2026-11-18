import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

// The custom specializer allowance is the largest phase live set of one
// current-paint-program call, not the sum of the generic parser, its scratch
// and the generic specializer. The phase order it relies on is pinned to the
// specializer's source; the four workspace specializers and delegated500's
// Berlin rich-sharing estimate (the one direct 'custom' estimate, with the
// berlin-distant-paint analyses it covers) are pinned; and a real call's total
// V8 allocation (an upper bound of its live peak) is measured on the real
// facade and on a variant whose every derived text stays two-byte.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.join(web,'package.json')),ts=require('typescript'),{build}=require('esbuild');
const {nullCityDataProfilePlugin}=await import('./city-profile-test-plugin.mjs');
const read=file=>fs.readFileSync(path.join(web,file),'utf8');
const specializerPath='src/painted/delegated500/safety/current-paint-program.ts',specializer=read(specializerPath),ast=ts.createSourceFile(specializerPath,specializer,ts.ScriptTarget.Latest,true);
const functions=new Map();for(const node of ast.statements)if(ts.isFunctionDeclaration(node)&&node.name)functions.set(node.name.text,node.getText(ast));
const body=name=>{assert(functions.has(name),'current-paint-program defines '+name);return functions.get(name);};
const order=(text,parts,label)=>{let at=-1;for(const part of parts){const next=text.indexOf(part,at+1);assert(next>at,label+': '+part+' follows in order');at=next;}};

test('the phase order the envelope relies on is the specializer source itself',()=>{
 assert.deepEqual([...functions.keys()],['maskComments','closeAt','functions','condition','roundedCondition','terminalBlockReturn','commonGuard','narrowBody','currentPaintProgramKey','currentPaintProgramFamily','callsIn','prepare','dispatchContexts','narrowed','specializedFragment','depthEffects','specializeCurrentPaintProgram','specializeRoundedPaintProgram','exactCurrentPaintProgramKeys','specializeCurrentPaintFragment','paintedFacadeDepthEffects','trimInactivePaintPrograms'],'a new phase or helper needs a re-derived envelope');
 order(body('specializeCurrentPaintProgram'),['const analysis=narrowed(source,family,churchLayout,cityChains);','fragment:specializedFragment(source,analysis)','depthEffects:depthEffects(source,analysis)'],'colour program');
 order(body('specializeRoundedPaintProgram'),['narrowed(source,family,false,true,undefined,true)','fragment:specializedFragment(source,analysis)','depthEffects:depthEffects(source,analysis)'],'rounded colour program');
 order(body('commonGuard'),['rounded?roundedCondition:condition','evaluate(text,family[0])','evaluate(text,family[i])'],'sequential family decisions');
 assert.match(body('specializeCurrentPaintFragment'),/return specializedFragment\(source,narrowed\(source,family,churchLayout,cityChains\)\);/);
 order(body('narrowed'),['prepare(source)','dispatchContexts(source,ranges,calls,family,churchLayout,cityChains)',"narrowBody(source,f,value,churchLayout,roundedPartition&&f.name==='paintedFacade')",'bodies.set(f,body)','narrowCalls.set(f,callsIn(body,names))','return {ranges,byName,bodies,reach}'],'narrowed');
 order(body('prepare'),['functions(source)','calls.set(f,callsIn(source.slice(f.open+1,f.end-1),names))'],'prepare');
 // functions() keeps its masked copy local; it returns only the ranges.
 order(body('functions'),['const masked=maskComments(source),ranges','signature.exec(masked)','return ranges;'],'functions');
 assert.match(body('callsIn'),/^function callsIn\(body:string,names:Set<string>\)\{return \[\.\.\.new Set\(\[\.\.\.maskComments\(body\)\.matchAll/);
 order(body('narrowBody'),['const body=source.slice(range.open+1,range.end-1),masked=maskComments(body)','commonGuard(','statement=body.slice(','terminalBlockReturn(statement)','maskComments(statement)'],'narrowBody');
 order(body('specializedFragment'),["const reachable=reach('main');",'const chunks:string[]=[]','chunks.join(\'\')'],'specializedFragment');
});

test('the four custom specializers are current-paint-program calls with at most one analysis each and none for no family',()=>{
 const found=[];
 for(const file of fs.readdirSync(path.join(web,'src'),{recursive:true})){
  if(!String(file).endsWith('.ts'))continue;const text=read(path.join('src',String(file)));
  for(const match of text.matchAll(/specialize(?:\(source,families\)\{|:\(source,family\)=>)/g))found.push(String(file));
 }
 assert.deepEqual(found.sort(),['painted/church/safety/building-mesh-renderer.ts','painted/city/safety/building-mesh-renderer.ts','painted/city/safety/city-shader-budget.ts','painted/delegated500/safety/building-mesh-renderer.ts','painted/tier300/safety/tier300-prepared-data-plan.ts']);
 function workspaceSpecializer(file) {
  const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true);
  const methods=[];
  function visit(node) {
   if(ts.isMethodDeclaration(node) && node.name.getText(tree)==='specialize'
       && node.parameters.map(p=>p.name.getText(tree)).join(',')==='source,families') {
    methods.push(node.body.getText(tree));
   } else {
    ts.forEachChild(node,visit);
   }
  }
  visit(tree);
  assert.equal(methods.length,1,file);
  return methods[0];
 }
 const delegated=workspaceSpecializer('src/painted/delegated500/safety/building-mesh-renderer.ts');
 order(delegated,['if(!families.length)return {fragment:source,depthEffects:false}',"city==='hamburg'&&!currentFamilyPrograms",
  'if(families.length!==1)throw','return specializeRoundedPaintProgram(source,families[0])',
  'return specializeCurrentPaintProgram(source,families.length===1?families[0]:families,false,!berlinCurrent)'],'delegated500');
 const church=workspaceSpecializer('src/painted/church/safety/building-mesh-renderer.ts');
 assert(church.includes('families.length?specializeCurrentPaintFragment(source,families.length===1?families[0]:families,true):source'));
 const city=workspaceSpecializer('src/painted/city/safety/city-shader-budget.ts');
 order(city,['if(families.length>1)','if(!options.specializeGroup)throw','fragment:options.specializeGroup(source,families)',
  'if(!families.length)return{fragment:source,depthEffects:false}','fragment:specialize(source,families[0])'],'city');
 const cityRenderer=read('src/painted/city/safety/building-mesh-renderer.ts');
 assert(cityRenderer.includes('specialize:(source,family)=>specializeCurrentPaintFragment(source,family),specializeGroup:specializeCurrentPaintFragment'));
 const tierFile='src/painted/tier300/safety/tier300-prepared-data-plan.ts';
 assert.equal(workspaceSpecializer(tierFile),'{return specializeCurrentPaintProgram(source,families.length===1?families[0]:families);}');
 order(read(tierFile),['function prepareSource(recipe:PreparedSourceRecipe,families:readonly number[])','if(!families.length)throw','workspace.prepareSource('],'tier300 admission');
 assert.match(body('paintedFacadeDepthEffects'),/return depthEffects\(source,narrowed\(source,family,false,cityChains\)\);/);
});

const entry=["export * as S from './src/safety/render-runtime/shader-source-budget.ts';","export * as P from './src/painted/delegated500/safety/current-paint-program.ts';","export {getFacadePaintFragmentGLSL} from './src/painted/city/safety/facade-paint-fragment.ts';"].join('\n');
const bundled=await build({stdin:{contents:entry,resolveDir:web,loader:'ts',sourcefile:'core-budget-custom-entry.ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'error',plugins:[nullCityDataProfilePlugin]});
const M=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
// The facade with an entry point, as an assembled colour fragment carries one.
const MAIN='\nout vec4 outColor;void main(){outColor=vec4(paintedFacade(vec3(1.),vec3(0.),vec3(0.,0.,1.),vec4(0.),0.),1.);}';
const source=M.getFacadePaintFragmentGLSL()+MAIN,bounds=M.S.shaderSourceBounds(M.S.shaderSourceText(source,['core/real-facade']));

test('the phase maximum, its zero-family case and the previous sum on the real facade',()=>{
 const estimate=M.S.estimateShaderSourceWorkspace(bounds,source.length,{analysis:'custom',familyValues:1,inputValues:9}),phases=estimate.customPhases;
 assert.equal(phases.model,M.S.CURRENT_PAINT_PROGRAM_ANALYSIS_MODEL);
 assert.equal(phases.peak,Math.max(phases.functions,phases.calls,phases.dispatch,phases.narrow,phases.fragment,phases.depth));
 for(const key of ['functions','calls','dispatch','narrow','fragment','depth'])assert(phases[key]>phases.analysis,key+' includes the analysis it keeps');
 assert.equal(estimate.scratchBytesEstimate,Math.max(phases.peak,2*Math.max(0,bounds.assemblyCharactersUpperBound-source.length)));
 assert.equal(estimate.analysisBytesEstimate,0,'the custom analysis is never retained');
 const none=M.S.estimateShaderSourceWorkspace(bounds,source.length,{analysis:'custom',familyValues:0});
 assert.equal(none.customPhases.peak,0,'without a family both callers return the assembled source');
 const groupCount=26;
 const grouped=M.S.estimateShaderSourceWorkspace(bounds,source.length,{analysis:'custom',familyValues:groupCount});
 const arrayBytes=bounds.policy.arrayHeaderBytes+groupCount*bounds.policy.arrayElementBytes;
 assert.equal(grouped.customPhases.functions-phases.functions,arrayBytes,'group parsing holds the normalized family array');
 assert.equal(grouped.customPhases.narrow-phases.narrow,2*arrayBytes,'one forwarding edge may also hold the rounded family array');
 const family=M.S.estimateShaderSourceWorkspace(bounds,source.length,{analysis:'family',familyValues:1}),previousSum=family.analysisBytesEstimate+estimate.scratchBytesEstimate;
 assert(estimate.scratchBytesEstimate<previousSum,'below the generic parser envelope plus any scratch');
 // Linear in the source: twice the source is at most twice the allowance plus containers.
 const doubled=source+source.replaceAll('paintedFacade(','paintedFacadeCopy(').replaceAll('void main(','void mainCopy('),twice=M.S.estimateShaderSourceWorkspace(M.S.shaderSourceBounds(M.S.shaderSourceText(doubled)),doubled.length,{analysis:'custom',familyValues:1});
 assert(twice.customPhases.peak<=2*phases.peak+1024);
});

test('the Berlin and Essen rich-sharing estimate covers their sequential analyses',()=>{
 const found=[];
 for(const file of fs.readdirSync(path.join(web,'src'),{recursive:true})){if(String(file).endsWith('.ts')&&read(path.join('src',String(file))).includes("analysis:'custom'"))found.push(String(file));}
 assert.deepEqual(found,['painted/delegated500/safety/building-mesh-renderer.ts'],'a new direct custom estimate needs its own derivation');
 const renderer=read('src/painted/delegated500/safety/building-mesh-renderer.ts');
 // materialSourceEstimate: the assembled text with its own envelope, the held
 // reference and the current specialization, plus one custom analysis.
 assert.equal(renderer.split("{analysis:'custom'").length,2,'one custom estimate in the renderer');
 assert(renderer.includes("phases.push(2*((assembled.emissionCharactersUpperBound??assembled.charactersUpperBound)+2*assembled.charactersUpperBound)+estimateShaderSourceWorkspace(shaderSourceBounds(assembled),undefined,{analysis:'custom',familyValues:1}).scratchBytesEstimate);"),'materialSourceEstimate keeps assembly, reference and current texts beside one custom analysis');
 // Each eligible city assembles once. Essen reuses the parsed program as it
 // compares family outputs, keeping one reference and the current fragment.
 order(renderer,["if(city==='berlin'||city==='essen'){","const assembled=fragmentParts(",
  "estimateShaderSourceWorkspace(shaderSourceBounds(assembled),undefined,{analysis:'custom',familyValues:1})"],'equality reservation');
 order(renderer,["if(!berlinCurrent&&city!=='essen')return","const assembled=fragment(baseSurfaceFragment",
  "if(city==='essen')return", "exactCurrentPaintProgramKeys(assembled,Array.from({length:26},(_,i)=>1603+i),false,true)",
  'berlinPaulLobeProgramsEqual(assembled)','berlinExactRichProgramKeys(assembled)'],'per-city equality checks');
 order(body('exactCurrentPaintProgramKeys'),['if(!families.length)return keys','const prepared=prepare(source),reference=specializedFragment(',
  'churchLayout,cityChains,prepared)','for(const family of families.slice(1))',
  'specializedFragment(source,narrowed(source,family,churchLayout,cityChains,prepared))!==reference',
  'keys.set(currentPaintProgramKey(family),canonical)'],'Essen exact aliases');
 // berlin-distant-paint: one held reference, then one analysis at a time.
 const distant=read('src/painted/delegated500/safety/berlin-distant-paint.ts');
 assert.match(distant,/export function berlinPaulLobeProgramsEqual\(assembled:string\)\{\n const reference=specializeCurrentPaintFragment\(assembled,19401\);\n for\(let family=19402;family<=19415;family\+\+\)if\(specializeCurrentPaintFragment\(assembled,family\)!==reference\)return false;\n return true;\n\}/);
 assert.match(distant,/for\(const families of \[\[1561,1562,1564,1565,1567,1568,1569,1570\],\[1571,1572\]\]\)\{\n  const reference=specializeCurrentPaintFragment\(assembled,families\[0\]\);\n  if\(families\.some\(family=>specializeCurrentPaintFragment\(assembled,family\)!==reference\)\)continue;/);
 assert.equal((distant.match(/specializeCurrentPaint(?:Program|Fragment)\(/g)??[]).length,4,'no other analysis in berlin-distant-paint');
});

test('a real call allocates less than the phase maximum (V8 total allocation, scavenges suppressed)',async t=>{
 const families=[...new Set([...source.matchAll(/family==(\d+)\./g)].map(match=>Number(match[1])))].slice(0,3);assert.equal(families.length,3);
 // The facade itself holds non-Latin-1 comment text, so V8 keeps the source
 // two-byte, but comment-masked analysis copies may become one-byte. The
 // variant adds one wide character outside every comment: each derived text
 // then stays two-byte, as the UTF16 logical model counts it.
 assert(/[^\u0000-\u00ff]/.test(source),'the real facade source is a two-byte string');
 const WIDE='\n#define CORE_BUDGET_TWO_BYTE \u4e2d\n',wide=source+WIDE;
 const peak=M.S.estimateShaderSourceWorkspace(bounds,source.length,{analysis:'custom',familyValues:1}).customPhases.peak;
 const widePeak=M.S.estimateShaderSourceWorkspace(M.S.shaderSourceBounds(M.S.shaderSourceText(wide)),wide.length,{analysis:'custom',familyValues:1}).customPhases.peak;
 const probeEntry=`import * as P from './src/painted/delegated500/safety/current-paint-program.ts';import {getFacadePaintFragmentGLSL} from './src/painted/city/safety/facade-paint-fragment.ts';
const source=getFacadePaintFragmentGLSL()+${JSON.stringify(MAIN)},wide=source+${JSON.stringify(WIDE)};
const small='vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}\\nvoid main(){}';for(let i=0;i<40;i++)P.specializeCurrentPaintProgram(small,1);
const rows=[];for(const [kind,text] of [['facade',source],['two-byte',wide]])for(const family of ${JSON.stringify([0,...families])})for(const church of [false,true]){globalThis.gc();globalThis.gc();const before=process.memoryUsage().heapUsed;const result=church?P.specializeCurrentPaintFragment(text,family,true):P.specializeCurrentPaintProgram(text,family,false,true);const after=process.memoryUsage().heapUsed;const fragment=typeof result==='string'?result:result.fragment;rows.push({kind,family,church,allocated:after-before,fragment:fragment.length,wide:/[^\\u0000-\\u00ff]/.test(fragment)});}
process.stdout.write(JSON.stringify(rows));`;
 const probe=(await build({stdin:{contents:probeEntry,resolveDir:web,loader:'ts',sourcefile:'core-budget-custom-probe.ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'error',plugins:[nullCityDataProfilePlugin]})).outputFiles[0].text;
 const child=spawnSync(process.execPath,['--expose-gc','--max-semi-space-size=512','--input-type=module'],{input:probe,encoding:'utf8',maxBuffer:1<<20});
 assert.equal(child.status,0,child.stderr.slice(-2000));
 const rows=JSON.parse(child.stdout);assert.equal(rows.length,16);
 for(const row of rows){
  const limit=row.kind==='two-byte'?widePeak:peak,length=row.kind==='two-byte'?wide.length:source.length;
  assert(row.fragment<=length);assert(row.allocated<limit,row.kind+' family '+row.family+(row.church?' church':'')+' allocated '+row.allocated+' >= phase maximum '+limit);
  if(row.kind==='two-byte')assert(row.wide,'the two-byte variant result keeps its wide text');
 }
 t.diagnostic(JSON.stringify({sourceCharacters:source.length,phaseMaximumMB:+(peak/1e6).toFixed(2),twoBytePhaseMaximumMB:+(widePeak/1e6).toFixed(2),facadeAllocatedMB:rows.filter(row=>row.kind==='facade').map(row=>+(row.allocated/1e6).toFixed(2)),twoByteAllocatedMB:rows.filter(row=>row.kind==='two-byte').map(row=>+(row.allocated/1e6).toFixed(2)),note:'allocation total bounds the live peak; the facade source is two-byte, the variant keeps every derived text two-byte'}));
});
