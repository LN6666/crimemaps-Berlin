import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

// describeShaderAssemblyBounds counts a raw paint's assembly envelope once:
// the renderer's tagged shell around shaderSourceBoundPart(raw) already holds
// it, a trace-preserving wrapper adds the paint text and the wrapped shell's
// output that its stages may keep alive, and an opaque shell keeps the
// previous addition. Every family's real fragment template, prune and clip run
// here on real paint; the bound must still cover the generated length and the
// texts alive together, and City's hook stages without the clip term.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.join(web,'package.json')),ts=require('typescript'),{build}=require('esbuild');
const {nullCityDataProfilePlugin}=await import('./city-profile-test-plugin.mjs');
const ASSEMBLY_FAMILIES=['city','delegated500','root500','tier300','church','infill','bremen'];
const FAMILIES=ASSEMBLY_FAMILIES.filter(family=>family!=='delegated500');

/** The renderer's own module-level fragmentParts (and its prune when imported),
 * re-exported from a generated module beside it, so its real GLSL constants
 * and the one shared shader-source module instance are used. */
function rendererFragmentModule(family){
 const file=path.join(web,'src/painted',family,'safety/building-mesh-renderer.ts'),text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),imports=new Map();
 for(const node of ast.statements)if(ts.isImportDeclaration(node)&&!node.importClause?.isTypeOnly){const bindings=node.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings))for(const element of bindings.elements)if(!element.isTypeOnly)imports.set(element.name.text,[node.moduleSpecifier.text,(element.propertyName??element.name).text]);}
 // One declaration anywhere in the file; its interpolations must all be imports.
 const found=[];(function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='fragmentParts'&&node.initializer)found.push(node.initializer.getText(ast));ts.forEachChild(node,visit);})(ast);
 assert.equal(found.length,1,family+' renderer declares one fragmentParts');const initializer=found[0];
 const used=[...new Set([...initializer.matchAll(/\b[A-Za-z_$][\w$]*\b/g)].map(match=>match[0]))].filter(name=>imports.has(name));
 assert(used.includes('shaderSourceParts'),family+' fragmentParts is the tagged shader-source template');
 const prune=[...imports].find(([,value])=>value[1]==='pruneOwner6307Fragment');
 const lines=used.map(name=>{const [specifier,imported]=imports.get(name);return 'import {'+imported+' as '+name+'} from '+JSON.stringify(specifier)+';';});
 const values=used.filter(name=>/^[A-Z0-9_]+$/.test(name));
 if(prune&&!used.includes(prune[0]))lines.push('import {pruneOwner6307Fragment as '+prune[0]+'} from '+JSON.stringify(prune[1][0])+';');
 lines.push('for(const [name,value] of Object.entries({'+values.join(',')+'}))if(typeof value!=="string"||!value)throw Error("'+family+' fragment constant "+name+" is unavailable");');
 lines.push('export const fragmentParts='+initializer+';');
 lines.push('export const prune='+(prune?prune[0]:'undefined')+';');
 return{contents:lines.join('\n'),resolveDir:path.dirname(file)};
}
const rendererFragmentPlugin={name:'core-renderer-fragments',setup(builder){
 builder.onResolve({filter:/^core-fragment:/},args=>({path:args.path.slice('core-fragment:'.length),namespace:'core-fragment'}));
 builder.onLoad({filter:/.*/,namespace:'core-fragment'},args=>{const value=rendererFragmentModule(args.path);return{contents:value.contents,loader:'ts',resolveDir:value.resolveDir};});
}};
// City display modules re-export model fixtures that no shader reads (the
// existing City budget test stubs the same set).
const kept=new Set(['c311-display','c312-display','c313-display','c318-display']);
const fixtureStubs={name:'core-city-fixture-stubs',setup(builder){
 builder.onResolve({filter:/^\.\/c\d{3}-(?:fixture|display)$/},args=>{const name=args.path.slice(2);return kept.has(name)?undefined:{path:name,namespace:'core-city-stub'};});
 builder.onLoad({filter:/.*/,namespace:'core-city-stub'},()=>({contents:'module.exports={};',loader:'js'}));
}};
const city='./src/painted/city/safety';
const entry=[...FAMILIES.map(family=>`export {fragmentParts as fragmentParts_${family},prune as prune_${family}} from 'core-fragment:${family}';`),
 "export * as S from './src/safety/render-runtime/shader-source-budget.ts';",
 "export * as A from './src/safety/render-runtime/shader-assembly-budget.ts';",
 "export {withResidentReflectionClip,RESIDENT_REFLECTION_CLIP_DECLARATIONS,RESIDENT_REFLECTION_CLIP_BODY} from './src/safety/resident-planar-reflection.ts';",
 `export * as CB from '${city}/city-shader-budget.ts';`,
 `export {getFacadePaintFragmentGLSL as cityFacade} from '${city}/facade-paint-fragment.ts';`,
 `export {c018FragmentShader} from '${city}/c018-native-partial-display.ts';`,`export {cbtFragmentShader} from '${city}/cbt-native-partial-display.ts';`,`export {c298FragmentShader} from '${city}/c298-native-partial-display.ts';`,
 `export {c311FragmentShader} from '${city}/c311-display.ts';`,`export {c312FragmentShader} from '${city}/munich-display-additions.ts';`,`export {c313FragmentShader} from '${city}/native-correction-display.ts';`,
 "export {getFacadePaintFragmentGLSL as churchFacade,describeFacadePaintSourceBounds as churchBounds} from './src/painted/church/safety/facade-paint-fragment.ts';",
 "export {MUNICH_QUEUE_FRAGMENT_GLSL} from './src/painted/church/safety/facade-munich-queue-fragment.ts';",
].join('\n');
const bundle=await build({stdin:{contents:entry,resolveDir:web,loader:'ts',sourcefile:'core-budget-assembly-entry.ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'error',plugins:[nullCityDataProfilePlugin,fixtureStubs,rendererFragmentPlugin]});
const M=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const {S,A,CB,withResidentReflectionClip}=M;
const CLIP_TEXT=M.RESIDENT_REFLECTION_CLIP_DECLARATIONS.length+M.RESIDENT_REFLECTION_CLIP_BODY.length;
const helper='vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}';
const textBounds=(source,label)=>S.shaderSourceBounds(S.shaderSourceText(source,[label]));
const MARKER='raw-paint-descriptor#';
/** The previous formula, which added raw.assembly next to a shell envelope that
 * already contained it. Kept only as the reference for the exact reduction. */
function previousAssembly(raw,shell,options){const size=shell.charactersUpperBound,finalSize=options.reflectionClip?size+CLIP_TEXT:size;return raw.assemblyCharactersUpperBound+(shell.emissionCharactersUpperBound??size)+(options.prune?7*size:0)+(options.reflectionClip?3*finalSize:0);}
const rows=[];
/** The expected envelope: the shell's own envelope once (joined), or for a
 * wrapper also the paint text and the wrapped shell output its driver keeps,
 * which the wrapper envelope minus raw.assembly bounds; then prune/clip. */
function expectedAssembly(raw,shell,options,containment){
 const emission=shell.emissionCharactersUpperBound,steps=previousAssembly(raw,shell,options)-raw.assemblyCharactersUpperBound-emission;
 return(containment==='wrapped'?emission+raw.sourceCharactersUpperBound+(emission-raw.assemblyCharactersUpperBound):emission)+steps;
}
/** One real recipe: actual paint, the real assembly chain and its bounds. */
function check(label,{raw,shell,options,paint,assemble,containment}){
 const bounds=A.describeShaderAssemblyBounds(raw,shell,options),previous=previousAssembly(raw,shell,options),removed=previous-bounds.assemblyCharactersUpperBound;
 assert.equal(bounds.assemblyCharactersUpperBound,expectedAssembly(raw,shell,options,containment),label+': the raw envelope is counted '+(containment==='wrapped'?'once plus the held paint text and shell output':'once'));
 assert(bounds.authorityTrace.includes(containment==='wrapped'?'wrapped-shell-envelope-plus-raw-text-and-held-shell-output':'shell-envelope-counts-raw-assembly-once'),label+' records how the shell holds the raw envelope');
 assert(!bounds.authorityTrace.some(value=>value.startsWith(MARKER)),label+' keeps descriptor markers out of the published trace');
 // Real assembly. Each step's input stays alive while it produces its output;
 // the caller still holds the paint text while the shell and hooks emit.
 const steps=assemble(paint),final=steps.at(-1);
 assert(raw.sourceCharactersUpperBound>=paint.length,label+' raw bound covers the real paint');
 assert(bounds.paintSourceCharactersUpperBound>=paint.length);
 assert(bounds.sourceCharactersUpperBound>=final.length,label+': '+final.length+' generated characters within '+bounds.sourceCharactersUpperBound);
 const live=paint.length+steps.reduce((sum,text)=>sum+text.length,0);
 assert(bounds.assemblyCharactersUpperBound>=live,label+': simultaneous text '+live+' within '+bounds.assemblyCharactersUpperBound);
 S.validateShaderSourceSyntax(final,bounds.syntaxUpperBound);
 rows.push({label,paint:paint.length,generated:final.length,live,previous,current:bounds.assemblyCharactersUpperBound,savedMB:+(2*removed/1e6).toFixed(2)});
 return bounds;
}
// The renderers' own fragment(helper,paint) wrapper around their template.
const fragmentOf=family=>(helperText,paint)=>S.emitShaderSource(M['fragmentParts_'+family](helperText,paint));

test('containment: joined shells count raw once, trace-only wrappers add the paint text, opaque shells keep the old sum',()=>{
 const raw=textBounds('vec3 paintedFacade(vec3 base){return base;}\n'.repeat(4),'unit/raw'),descriptor=A.shaderSourceBoundPart(raw,{});
 const joined=S.shaderSourceParts`#version 300 es\n${descriptor}\nvoid main(){}`,nested=S.joinShaderSourceParts([S.shaderSourceParts`// a\n${joined}`,'// b']);
 for(const [label,shell] of [['joined',joined],['nested join',nested],['descriptor itself',descriptor]]){
  const bounds=A.describeShaderAssemblyBounds(raw,shell,{reflectionClip:true});
  assert.equal(bounds.assemblyCharactersUpperBound,previousAssembly(raw,shell,{reflectionClip:true})-raw.assemblyCharactersUpperBound,label);
 }
 // A deferred wrapper that keeps the inner trace and covers the inner envelope.
 const wrapper=S.deferredShaderSourcePart({charactersUpperBound:joined.charactersUpperBound+8,emissionCharactersUpperBound:joined.emissionCharactersUpperBound+3*(joined.charactersUpperBound+8),authority:{},authorityTrace:[...joined.authorityTrace,'unit/hook'],build(){throw Error('descriptor');}});
 const wrapped=A.describeShaderAssemblyBounds(raw,wrapper,{});
 assert.equal(wrapped.assemblyCharactersUpperBound,wrapper.emissionCharactersUpperBound+raw.sourceCharactersUpperBound+(wrapper.emissionCharactersUpperBound-raw.assemblyCharactersUpperBound));
 // The held-output term bounds the wrapped shell output on its own: the inner
 // joined envelope is its result plus raw.assembly and the wrapper covers it.
 assert(wrapper.emissionCharactersUpperBound-raw.assemblyCharactersUpperBound>=joined.charactersUpperBound);
 // A shell of real text never interpolating the descriptor stays additive,
 // as does a trace-carrying wrapper whose envelope cannot contain raw's.
 const opaque=S.shaderSourceText('#version 300 es\n'+'x'.repeat(200));
 assert.equal(A.describeShaderAssemblyBounds(raw,opaque,{}).assemblyCharactersUpperBound,previousAssembly(raw,opaque,{}));
 const small=S.deferredShaderSourcePart({charactersUpperBound:4,emissionCharactersUpperBound:4,authority:{},authorityTrace:[...joined.authorityTrace],build(){return 'void';}});
 assert.equal(A.describeShaderAssemblyBounds(raw,small,{}).assemblyCharactersUpperBound,previousAssembly(raw,small,{}));
 // An equal but distinct raw object is not the interpolated descriptor.
 const twin=S.normalizeShaderSourceBounds(raw);assert.equal(A.describeShaderAssemblyBounds(twin,joined,{}).assemblyCharactersUpperBound,previousAssembly(twin,joined,{}));
});

test('City: Munich C311>C312>C318 and C311>C312 with every hook (wrapped), Dresden without hooks (joined) and the white descriptor',t=>{
 const fullBase=M.cityFacade(),cityBase=fullBase.replace('vec3 progressiveFeatureDispatch(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){','vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){');
 assert.notEqual(cityBase,fullBase);assert(fullBase.length>1_000_000,'the real facade is used');
 const hooks=Object.freeze({c018:M.c018FragmentShader,cbt:M.cbtFragmentShader,c298:M.c298FragmentShader,c311:M.c311FragmentShader,c313:M.c313FragmentShader,c312:M.c312FragmentShader});
 const fragment=fragmentOf('city'),fragmentParts=M.fragmentParts_city,authority={};
 for(const [cityName,key,base,flags,containment] of [['munich','c311>c312>c318',fullBase,{c311:true,c313:true,c312:true},'wrapped'],['munich','c311>c312',fullBase,{c311:true,c313:true,c312:true},'wrapped'],['dresden','',cityBase,{c311:false,c313:false,c312:false},'joined']]){
  const builder=CB.createCityMaterialBuilder(cityName,key?key.split('>'):[],()=>CB.cityDresdenMaterial(base,cityName)),materialBounds=CB.describeCityMaterialBounds(builder,textBounds(base,'core/actual-city-facade'));
  const variant=[Number(flags.c311),Number(flags.c312),Number(flags.c313)].join(':')+'|true';
  const recipe=CB.cityColourSourceRecipe({helper,city:cityName,variant,vertexInput:'vertex',material:builder,materialBounds,hooks,flags:Object.freeze(flags),authority,fragmentParts,fragment});
  const descriptor=A.shaderSourceBoundPart(materialBounds,authority),template=fragmentParts(helper,descriptor),shell=CB.describeCityShaderHooks(template,cityName,hooks,Object.freeze(flags),authority);
  // describeCityShaderHooks returns the template itself when no hook applies.
  assert.equal(shell===template?'joined':'wrapped',containment,cityName+' hook shell shape');
  const paint=builder(),bounds=check('city '+cityName+(key?' '+key:''),{raw:materialBounds,shell,options:{reflectionClip:true},paint,containment,assemble:paint=>{const original=fragment(helper,paint),hooked=recipe.assemble(paint);assert(original.includes(paint),'the template interpolates the real paint');return original===hooked?[original,withResidentReflectionClip(hooked)]:[original,hooked,withResidentReflectionClip(hooked)];}});
  assert.deepEqual(bounds,recipe.sourceBounds,'the production City recipe publishes these bounds');
  if(containment!=='wrapped')continue;
  // Each hook stage on the real text, by the repository's replace model: the
  // caller's paint, the template output F0 that applyCityShaderHooks keeps as
  // its source parameter from the second stage on, and the stage's input,
  // split pieces, replacement and result. No reflection clip term is counted.
  const noClip=A.describeShaderAssemblyBounds(materialBounds,shell,{}).assemblyCharactersUpperBound,F0=fragment(helper,paint);
  let value=F0,applied=0,worst=0;
  for(const stage of CB.cityShaderHookStages(flags)){
   const next=hooks[stage](value,cityName);if(next===value)continue;applied++;
   const live=paint.length+(applied>1?F0.length:0)+3*value.length+2*(next.length-value.length)+'void main(){'.length;
   assert(noClip>=live,'city '+cityName+' '+key+' hook '+stage+': '+live+' live characters within '+noClip+' without the clip term');
   worst=Math.max(worst,live);value=next;
  }
  assert(applied>=2,'the wrapped recipe runs at least two hook stages');assert.equal(value,recipe.assemble(paint),'the stages are the production hook chain');
  t.diagnostic(JSON.stringify({recipe:'city '+cityName+' '+key,hookStages:applied,worstStageLive:worst,noClipBound:noClip,withoutHeldOutput:noClip-(shell.emissionCharactersUpperBound-materialBounds.assemblyCharactersUpperBound),heldOutputTerm:shell.emissionCharactersUpperBound-materialBounds.assemblyCharactersUpperBound,templateOutput:F0.length}));
 }
 const white='#version 300 es\nprecision highp float;out vec4 colour;void main(){colour=vec4(1.);}';
 const whiteRecipe=CB.cityWhiteSourceRecipe({helper,city:'hamburg',variant:'white',vertexInput:'vertex',fragment:white,authority});
 const whiteRaw=textBounds(white,'city/hamburg-white-fragment'),whiteBounds=check('city white',{raw:whiteRaw,shell:A.shaderSourceBoundPart(whiteRaw,authority),options:{reflectionClip:true},paint:white,containment:'joined',assemble:paint=>[withResidentReflectionClip(whiteRecipe.assemble(paint))]});
 assert.equal(whiteBounds.assemblyCharactersUpperBound,whiteRecipe.sourceBounds.assemblyCharactersUpperBound);
});

test('church, tier300, root500, infill and bremen: real templates, prune and clip around real paint text',()=>{
 const authority={};
 // Church: its own facade bound producer and paint.
 const churchRaw=M.churchBounds(),churchPaint=M.churchFacade(),churchFragment=fragmentOf('church');
 check('church paint',{raw:churchRaw,shell:M.fragmentParts_church(helper,A.shaderSourceBoundPart(churchRaw,authority)),options:{reflectionClip:true},paint:churchPaint,containment:'joined',assemble:paint=>{const original=churchFragment(helper,paint);assert(original.includes(paint));return[original,withResidentReflectionClip(original)];}});
 const queueRaw=textBounds(M.MUNICH_QUEUE_FRAGMENT_GLSL,'church/munich-queue');
 check('church queue',{raw:queueRaw,shell:A.shaderSourceBoundPart(queueRaw,authority),options:{reflectionClip:true},paint:M.MUNICH_QUEUE_FRAGMENT_GLSL,containment:'joined',assemble:paint=>[withResidentReflectionClip(paint)]});
 // The frozen-data paint producers have their own family tests; the real
 // shell/prune/clip composition is checked here around the real facade text.
 const paint=M.cityFacade();
 for(const family of ['tier300','root500','infill','bremen'])for(const prune of family==='tier300'?[false]:[false,true]){
  const raw=textBounds(paint,'core/'+family+'-paint'),fragment=fragmentOf(family),pruner=M['prune_'+family];
  if(prune)assert.equal(typeof pruner,'function',family+' imports its owner pruner');
  check(family+(prune?' pruned':''),{raw,shell:M['fragmentParts_'+family](helper,A.shaderSourceBoundPart(raw,authority)),options:{prune,reflectionClip:true},paint,containment:'joined',assemble:value=>{const original=fragment(helper,value),pruned=prune?pruner(original):original;assert(original.includes(value));return prune?[original,pruned,withResidentReflectionClip(pruned)]:[original,withResidentReflectionClip(original)];}});
 }
});

test('reduction table',t=>{
 assert(rows.length>=11);for(const row of rows)assert(row.current<row.previous,row.label+' bound shrank');
 t.diagnostic(JSON.stringify(rows));
});
