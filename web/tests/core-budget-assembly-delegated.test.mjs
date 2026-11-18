import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {nullCityDataProfilePlugin} from './city-profile-test-plugin.mjs';

// delegated500's colour recipe: the real 22-wrapper material chain over the
// real facade source, held as existing text or described with its chain, in the
// renderer's own fragment template with the resident clip. The raw envelope is
// counted once; the bound still covers the generated text and the texts alive
// together. Berlin's material preflight phase (assembly + custom specializer)
// is compared with the previous formulas against the page budget profiles.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.join(web,'package.json')),ts=require('typescript'),{build}=require('esbuild');
const MiB=1024*1024;
function rendererFragmentModule(family){
 const file=path.join(web,'src/painted',family,'safety/building-mesh-renderer.ts'),text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),imports=new Map();
 for(const node of ast.statements)if(ts.isImportDeclaration(node)&&!node.importClause?.isTypeOnly){const bindings=node.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings))for(const element of bindings.elements)if(!element.isTypeOnly)imports.set(element.name.text,[node.moduleSpecifier.text,(element.propertyName??element.name).text]);}
 // One declaration anywhere in the file; its interpolations must all be imports.
 const found=[];(function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='fragmentParts'&&node.initializer)found.push(node.initializer.getText(ast));ts.forEachChild(node,visit);})(ast);
 assert.equal(found.length,1,family+' renderer declares one fragmentParts');const initializer=found[0];
 const used=[...new Set([...initializer.matchAll(/\b[A-Za-z_$][\w$]*\b/g)].map(match=>match[0]))].filter(name=>imports.has(name)),values=used.filter(name=>/^[A-Z0-9_]+$/.test(name));
 const lines=used.map(name=>{const [specifier,imported]=imports.get(name);return 'import {'+imported+' as '+name+'} from '+JSON.stringify(specifier)+';';});
 lines.push('for(const [name,value] of Object.entries({'+values.join(',')+'}))if(typeof value!=="string"||!value)throw Error("'+family+' fragment constant "+name+" is unavailable");');
 lines.push('export const fragmentParts='+initializer+';');
 return{contents:lines.join('\n'),resolveDir:path.dirname(file)};
}
const fragmentPlugin={name:'core-renderer-fragments',setup(builder){
 builder.onResolve({filter:/^core-fragment:/},args=>({path:args.path.slice('core-fragment:'.length),namespace:'core-fragment'}));
 builder.onLoad({filter:/.*/,namespace:'core-fragment'},args=>{const value=rendererFragmentModule(args.path);return{contents:value.contents,loader:'ts',resolveDir:value.resolveDir};});
}};
const delegated='./src/painted/delegated500/safety';
const entry=["export {fragmentParts} from 'core-fragment:delegated500';",
 "export * as S from './src/safety/render-runtime/shader-source-budget.ts';",
 "export * as A from './src/safety/render-runtime/shader-assembly-budget.ts';",
 "export {withResidentReflectionClip,RESIDENT_REFLECTION_CLIP_DECLARATIONS,RESIDENT_REFLECTION_CLIP_BODY} from './src/safety/resident-planar-reflection.ts';",
 `export * as B from '${delegated}/delegated-shader-budget.ts';`,
 `export {facadePaintFragmentForCity,describeFacadePaintSourceBounds} from '${delegated}/facade-paint-fragment.ts';`,
 `export {PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE} from '${delegated}/progressive-feature-cities.ts';`,
 `export {HAMBURG_PROGRAM_GLSL_RESOURCE} from '${delegated}/progressive-hamburg-programs.ts';`,
 `export {BERLIN_PROGRAM_GLSL_RESOURCE} from '${delegated}/progressive-berlin-programs.ts';`,
 `export {PROGRESSIVE_FEATURE_GLSL} from '${delegated}/progressive-feature-glsl.ts';`,
].join('\n');
const bundle=await build({stdin:{contents:entry,resolveDir:web,loader:'ts',sourcefile:'core-budget-assembly-delegated-entry.ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'error',plugins:[nullCityDataProfilePlugin,fragmentPlugin]});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const {S,A,B}=m,CLIP_TEXT=m.RESIDENT_REFLECTION_CLIP_DECLARATIONS.length+m.RESIDENT_REFLECTION_CLIP_BODY.length;
const helper='vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}',MARKER='raw-paint-descriptor#';
// The delegated budget test's fixture frozen scope: one extra Cologne family
// and every Berlin partition key reading the full feature source.
const COLOGNE_EXTRA=['vec3 delegatedBudgetKeep1003(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base*.8;}',
 'vec3 delegatedBudgetCut1004(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(frame.x<0.)discard;return base*.6;}',
 'vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1003.)return delegatedBudgetKeep1003(base,p,normal,frame,family);if(family==1004.)return delegatedBudgetCut1004(base,p,normal,frame,family);return progressiveFeatureDispatch(base,p,normal,frame,family);}'].join('\n');
const BERLIN_PROGRAMS=new Proxy({},{get:()=>m.PROGRESSIVE_FEATURE_GLSL});
function frozenScope({extra={},hamburg={},berlin={}}={}){
 const values=new Map([[m.PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE.file,extra],[m.HAMBURG_PROGRAM_GLSL_RESOURCE.file,hamburg],[m.BERLIN_PROGRAM_GLSL_RESOURCE.file,berlin]]);
 return{borrow(ref,read){assert(values.has(ref.file),'fixture scope holds '+ref.file);return read(values.get(ref.file));},assertSelection(){},retain(){return()=>{};},get stats(){return{resources:values.size,pending:0,pins:0,ownerReleased:false,disposed:false};}};
}
const previousAssembly=(raw,shell,clip)=>{const size=shell.charactersUpperBound;return raw.assemblyCharactersUpperBound+(shell.emissionCharactersUpperBound??size)+(clip?3*(size+CLIP_TEXT):0);};
const rows=[];

test('delegated500 colour recipes: existing material text and its described chain, real template and clip',()=>{
 const scope=frozenScope({extra:{cologne:COLOGNE_EXTRA},berlin:BERLIN_PROGRAMS}),authority={};
 for(const city of ['cologne','hannover','berlin']){
  const material=B.describeDelegatedWrappedPaintBounds(m.describeFacadePaintSourceBounds(city,undefined,scope),city,B.DELEGATED_MATERIAL_SOURCE_WRAPPERS);
  const paint=B.applyDelegatedPaintWrappers(m.facadePaintFragmentForCity(city,scope),city,B.DELEGATED_MATERIAL_SOURCE_WRAPPERS);
  for(const [kind,raw] of [['existing',B.existingShaderTextBounds(material)],['material chain',material]]){
   const label='delegated500 '+city+' '+kind,shell=m.fragmentParts(helper,A.shaderSourceBoundPart(raw,authority)),bounds=A.describeShaderAssemblyBounds(raw,shell,{reflectionClip:true});
   assert.equal(bounds.assemblyCharactersUpperBound,previousAssembly(raw,shell,true)-raw.assemblyCharactersUpperBound,label+' counts the raw envelope once');
   assert(bounds.authorityTrace.includes('shell-envelope-counts-raw-assembly-once'));assert(!bounds.authorityTrace.some(value=>value.startsWith(MARKER)));
   const original=S.emitShaderSource(m.fragmentParts(helper,paint)),clipped=m.withResidentReflectionClip(original);assert(original.includes(paint));
   assert(raw.sourceCharactersUpperBound>=paint.length,label+' raw covers the real wrapped paint');
   assert(bounds.sourceCharactersUpperBound>=clipped.length,label+': '+clipped.length+' generated characters within '+bounds.sourceCharactersUpperBound);
   const live=paint.length+original.length+clipped.length;assert(bounds.assemblyCharactersUpperBound>=live,label+': simultaneous text '+live+' within '+bounds.assemblyCharactersUpperBound);
   S.validateShaderSourceSyntax(clipped,bounds.syntaxUpperBound);
   rows.push({label,paint:paint.length,generated:clipped.length,live,previous:previousAssembly(raw,shell,true),current:bounds.assemblyCharactersUpperBound,savedMB:+(2*raw.assemblyCharactersUpperBound/1e6).toFixed(2)});
  }
 }
});

/** The previous custom specializer allowance: the generic parser envelope plus
 * its scratch plus the generic specializer scratch, summed. Reference only. */
function previousCustomScratch(bounds,L){
 const s=bounds.syntaxUpperBound,p=bounds.policy,F=s.functionRanges,C=s.callSites,T=s.statementNodes,G=s.guardTuples,N=1;
 const object=(fields,n=1)=>(p.objectHeaderBytes+fields*p.propertySlotBytes)*n,array=(h,slots)=>h*p.arrayHeaderBytes+slots*p.arrayElementBytes,map=(h,e)=>h*p.mapHeaderBytes+e*p.mapEntryBytes,set=(h,e)=>h*p.setHeaderBytes+e*p.setEntryBytes;
 const containers=object(2)+object(9)+object(5,F)+object(6,T)+array(2+F+F+F+G,F+F+C+T+F+2*G)+map(5,5*F)+set(1,F);
 const generic=2*(L+s.parameterCharacters+3*s.identifierCharacters)+containers;
 const temporary=map(2,F+F+C)+set(1,C)+array(4+F+C+C,4*F+8*C+T)+3*C*p.propertySlotBytes,analysis=2*bounds.analysisTemporaryCharactersUpperBound+temporary;
 const familySlots=N*(F+C+1),specialization=2*(5*L+s.parameterCharacters+s.identifierCharacters)+map(4,4*F+C)+set(4,3*F+C)+array(8+F+C+T,2*familySlots+2*C+4*F+3*T+1)+object(3);
 const assemblyExtra=2*Math.max(0,bounds.assemblyCharactersUpperBound-L)+(bounds.assemblyMetadataBytesUpperBound??0);
 return Math.max(assemblyExtra,generic+analysis+specialization);
}

test('Berlin rich-sharing preflight phase and one colour program: previous and current envelopes against the page profiles',t=>{
 const scope=frozenScope({berlin:BERLIN_PROGRAMS}),authority={};
 const material=B.describeDelegatedWrappedPaintBounds(m.describeFacadePaintSourceBounds('berlin',undefined,scope),'berlin',B.DELEGATED_MATERIAL_SOURCE_WRAPPERS);
 // materialSourceEstimate's Berlin phase: the no-helper-free template over the
 // held text, its two copies and the custom specializer for one family.
 const assembled=m.fragmentParts(helper,B.existingShaderTextBoundPart(material,authority)),bounds=S.shaderSourceBounds(assembled),L=bounds.sourceCharactersUpperBound;
 const text=2*((assembled.emissionCharactersUpperBound??assembled.charactersUpperBound)+2*assembled.charactersUpperBound);
 const current=S.estimateShaderSourceWorkspace(bounds,undefined,{analysis:'custom',familyValues:1}),previous=previousCustomScratch(bounds,L);
 assert.equal(current.customPhases.peak,Math.max(current.customPhases.functions,current.customPhases.calls,current.customPhases.dispatch,current.customPhases.narrow,current.customPhases.fragment,current.customPhases.depth));
 assert(current.scratchBytesEstimate<previous,'the phase maximum is below the previous sum');
 // One colour program ticket over the same assembled source (vertex and
 // attributes are negligible here): generated source, workspace text and scratch.
 const ticket=scratch=>2*L+2*L+current.entryMetadataBytesEstimate+scratch;
 const table={assembledCharacters:L,berlinPhaseMB:{previous:+((text+previous)/MiB).toFixed(1),current:+((text+current.scratchBytesEstimate)/MiB).toFixed(1)},colourProgramMB:{previous:+(ticket(previous)/MiB).toFixed(1),current:+(ticket(current.scratchBytesEstimate)/MiB).toFixed(1)},customPhasesMB:Object.fromEntries(Object.entries(current.customPhases).filter(([key])=>key!=='model').map(([key,value])=>[key,+(value/MiB).toFixed(1)])),mobileMiB:256,desktopMiB:1_000_000_000/MiB};
 t.diagnostic(JSON.stringify(table));
 for(const value of [text+current.scratchBytesEstimate,ticket(current.scratchBytesEstimate)])assert(value<256*MiB,'fits the mobile page budget on its own');
});

test('reduction table',t=>{assert.equal(rows.length,6);for(const row of rows)assert(row.current<row.previous,row.label);t.diagnostic(JSON.stringify(rows));});
