import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

// City shader caller budget: the pre-build recipe bound, the shared prepared
// source workspace and the original City material/hook/specialize/clip output.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(web+'/package.json'),ts=require('typescript'),{build}=require('esbuild');
const {nullCityDataProfilePlugin}=await import('./city-profile-test-plugin.mjs');
const rendererPath=path.join(web,'src/painted/city/safety/building-mesh-renderer.ts'),rendererText=fs.readFileSync(rendererPath,'utf8'),rendererAST=ts.createSourceFile(rendererPath,rendererText,ts.ScriptTarget.Latest,true);
function rendererBinding(name){let found;const visit=node=>{if(!found&&ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name&&node.initializer)found=node.initializer.getText(rendererAST);if(!found&&ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node.getText(rendererAST);ts.forEachChild(node,visit);};visit(rendererAST);assert(found,'renderer binding '+name);return found;}
// The renderer's real tagged fragment template and vertex, bound to the real
// GLSL constants; the renderer module itself is not loaded.
const city='./src/painted/city/safety',safety='./src/safety';
const entry=`
export * as budget from '${city}/city-shader-budget.ts';
export * as sourceBudget from '${safety}/render-runtime/shader-source-budget.ts';
export * as assembly from '${safety}/render-runtime/shader-assembly-budget.ts';
export * as resources from '${safety}/render-runtime/resource-budget.ts';
export * as preparation from '${safety}/render-runtime/program-preparation.ts';
export {withResidentReflectionClip} from '${safety}/resident-planar-reflection.ts';
export {specializeCurrentPaintFragment} from './src/painted/delegated500/safety/current-paint-program.ts';
export {getFacadePaintFragmentGLSL} from '${city}/facade-paint-fragment.ts';
export {HAMBURG_WHITE_VERTEX,HAMBURG_WHITE_FRAGMENT} from '${city}/hamburg-white-shader.ts';
export {S402_SHADOW_VERTEX_GLSL,S402_SHADOW_FRAGMENT_GLSL} from '${city}/s402-connector-shadow.ts';
export {C320_FEATURE_GLSL} from '${city}/c320-feature-glsl.ts';
export {C339_FEATURE_GLSL} from '${city}/c339-feature-glsl.ts';
export {c018VertexShader,c018FragmentShader} from '${city}/c018-native-partial-display.ts';
export {cbtVertexShader,cbtFragmentShader} from '${city}/cbt-native-partial-display.ts';
export {c298VertexShader,c298FragmentShader} from '${city}/c298-native-partial-display.ts';
export {c311VertexShader,c311FragmentShader} from '${city}/c311-display.ts';
export {c312VertexShader,c312FragmentShader} from '${city}/munich-display-additions.ts';
export {c313VertexShader,c313FragmentShader} from '${city}/native-correction-display.ts';
export {c437MaterialFragment} from '${city}/c437-feature-glsl.ts';
export {c438MaterialFragment} from '${city}/c438-feature-glsl.ts';
export {c439MaterialFragment} from '${city}/c439-feature-glsl.ts';
export {c442MaterialFragment} from '${city}/c442-feature-glsl.ts';
export {c440MaterialFragment} from '${city}/c440-feature-glsl.ts';
export {c441MaterialFragment} from '${city}/c441-feature-glsl.ts';
export {c443MaterialFragment} from '${city}/c443-feature-glsl.ts';
export {c444MaterialFragment} from '${city}/c444-feature-glsl.ts';
export {c445MaterialFragment} from '${city}/c445-feature-glsl.ts';
export {c446MaterialFragment} from '${city}/c446-feature-glsl.ts';
export {c447MaterialFragment} from '${city}/c447-feature-glsl.ts';
export {c448MaterialFragment} from '${city}/c448-feature-glsl.ts';
export {c449MaterialFragment} from '${city}/c449-feature-glsl.ts';
export {c450MaterialFragment} from '${city}/c450-feature-glsl.ts';
export {c451MaterialFragment} from '${city}/c451-feature-glsl.ts';
export {c452MaterialFragment} from '${city}/c452-feature-glsl.ts';
export {c453MaterialFragment} from '${city}/c453-feature-glsl.ts';
export {c455MaterialFragment} from '${city}/c455-feature-glsl.ts';
export {c456MaterialFragment} from '${city}/c456-feature-glsl.ts';
export {c457MaterialFragment} from '${city}/c457-feature-glsl.ts';
export {c454MaterialFragment} from '${city}/c454-feature-glsl.ts';
export {c459MaterialFragment} from '${city}/c459-feature-glsl.ts';
export {c460MaterialFragment} from '${city}/c460-feature-glsl.ts';
export {c461MaterialFragment} from '${city}/c461-feature-glsl.ts';
export {c462MaterialFragment} from '${city}/c462-feature-glsl.ts';
export {c463MaterialFragment} from '${city}/c463-feature-glsl.ts';
export {c464MaterialFragment} from '${city}/c464-feature-glsl.ts';
export {c465MaterialFragment} from '${city}/c465-feature-glsl.ts';
export {c466MaterialFragment} from '${city}/c466-feature-glsl.ts';
export {c467MaterialFragment} from '${city}/c467-feature-glsl.ts';
export {c468MaterialFragment} from '${city}/c468-feature-glsl.ts';
export {c471MaterialFragment} from '${city}/c471-feature-glsl.ts';
export {c475MaterialFragment} from '${city}/c475-feature-glsl.ts';
export {c474MaterialFragment} from '${city}/c474-feature-glsl.ts';
export {c470MaterialFragment} from '${city}/c470-feature-glsl.ts';
export {c472MaterialFragment} from '${city}/c472-feature-glsl.ts';
export {c473MaterialFragment} from '${city}/c473-feature-glsl.ts';
export {c476MaterialFragment} from '${city}/c476-feature-glsl.ts';
export {c311MaterialFragment} from '${city}/c311-feature-glsl.ts';
export {c312MaterialFragment} from '${city}/c312-feature-glsl.ts';
export {c313MaterialFragment} from '${city}/c313-feature-glsl.ts';
export {c318MaterialFragment} from '${city}/c318-feature-glsl.ts';
export {c320MaterialFragment} from '${city}/c320-feature-glsl.ts';
export {c339MaterialFragment} from '${city}/c339-feature-glsl.ts';
import {emitShaderSource,shaderSourceParts} from '${safety}/render-runtime/shader-source-budget.ts';
import {SCENE_SURFACE_LIGHT_GLSL} from '${safety}/scene-surface-light.ts';
import {RATHAUS_PROXY_MASK_GLSL} from '${city}/facade-rathaus-proxy-mask.ts';
import {PARTIAL_GATE_MASK_GLSL} from '${city}/source-partial-gate-display.ts';
import {S402_CONNECTOR_MASK_GLSL} from '${city}/s402-connector-display.ts';
import {S036_ROOF009_MASK_GLSL} from '${city}/s036-north-coface-display.ts';
import {FACADE_OPENING_GLSL} from '${city}/facade-opening-primitives.ts';
import {FACADE_LAYOUT_GLSL} from '${city}/facade-layouts.ts';
export const VERTEX=${rendererBinding('VERTEX')};
export const fragmentParts=${rendererBinding('fragmentParts')};
export const fragment=(helper:string,paintFragment:string)=>emitShaderSource(fragmentParts(helper,paintFragment));
`;
// The C313 hook's module also re-exports every C3xx material-frame helper and
// its model fixtures. Neither shader hooks nor material wrappers read them, so
// those modules are replaced by empty CommonJS stubs to keep this suite light.
const kept=new Set(['c311-display','c312-display','c313-display','c318-display']);
const fixtureStubs={name:'city-shader-test-fixture-stubs',setup(build){
 build.onResolve({filter:/^\.\/c\d{3}-(?:fixture|display)$/},args=>{const name=args.path.slice(2);return kept.has(name)?undefined:{path:name,namespace:'city-shader-test-stub'};});
 build.onLoad({filter:/.*/,namespace:'city-shader-test-stub'},()=>({contents:'module.exports={};',loader:'js'}));
}};
const bundle=await build({stdin:{contents:entry,resolveDir:web,loader:'ts',sourcefile:'city-shader-assembly-budget-entry.ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'error',plugins:[nullCityDataProfilePlugin,fixtureStubs]});
const M=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const {budget:B,sourceBudget:S,resources:R,withResidentReflectionClip,specializeCurrentPaintFragment,fragment,fragmentParts,VERTEX,HAMBURG_WHITE_VERTEX,HAMBURG_WHITE_FRAGMENT}=M;
const {c437MaterialFragment,c438MaterialFragment,c439MaterialFragment,c442MaterialFragment,c440MaterialFragment,c441MaterialFragment,c443MaterialFragment,c444MaterialFragment,c445MaterialFragment,c446MaterialFragment,c447MaterialFragment,c448MaterialFragment,c449MaterialFragment,c450MaterialFragment,c451MaterialFragment,c452MaterialFragment,c453MaterialFragment,c455MaterialFragment,c456MaterialFragment,c457MaterialFragment,c454MaterialFragment,c459MaterialFragment,c460MaterialFragment,c461MaterialFragment,c462MaterialFragment,c463MaterialFragment,c464MaterialFragment,c465MaterialFragment,c466MaterialFragment,c467MaterialFragment,c468MaterialFragment,c471MaterialFragment,c475MaterialFragment,c474MaterialFragment,c470MaterialFragment,c472MaterialFragment,c473MaterialFragment,c476MaterialFragment,c311MaterialFragment,c312MaterialFragment,c313MaterialFragment,c318MaterialFragment}=M;
const {c018VertexShader,c018FragmentShader,cbtVertexShader,cbtFragmentShader,c298VertexShader,c298FragmentShader,c311VertexShader,c311FragmentShader,c312VertexShader,c312FragmentShader,c313VertexShader,c313FragmentShader}=M;

// ---- Original implementation, verbatim from the pre-budget renderer ----
// building-mesh-renderer.ts facadePaintFragmentForCity (38 nested dispatchers).
function originalFacade(base,city){const baseFacadePaintFragmentForCity=()=>base;return c476MaterialFragment(c473MaterialFragment(c472MaterialFragment(c470MaterialFragment(c474MaterialFragment(c475MaterialFragment(c471MaterialFragment(c468MaterialFragment(c467MaterialFragment(c466MaterialFragment(c465MaterialFragment(c464MaterialFragment(c463MaterialFragment(c462MaterialFragment(c461MaterialFragment(c460MaterialFragment(c459MaterialFragment(c454MaterialFragment(c457MaterialFragment(c456MaterialFragment(c455MaterialFragment(c453MaterialFragment(c452MaterialFragment(c451MaterialFragment(c450MaterialFragment(c449MaterialFragment(c448MaterialFragment(c447MaterialFragment(c446MaterialFragment(c445MaterialFragment(c444MaterialFragment(c443MaterialFragment(c441MaterialFragment(c440MaterialFragment(c442MaterialFragment(c439MaterialFragment(c438MaterialFragment(c437MaterialFragment(baseFacadePaintFragmentForCity(city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city),city);}
// The original material builders set by the default recipe, initializeHooks
// and the compile fallbacks.
const originalMaterial={
 'c311>c313>c312>c318':(facade,city)=>c318MaterialFragment(c312MaterialFragment(c313MaterialFragment(c311MaterialFragment(facade,city),city),city),city),
 'c311>c312>c318':(facade,city)=>c318MaterialFragment(c312MaterialFragment(c311MaterialFragment(facade,city),city),city),
 'c311>c312':(facade,city)=>c312MaterialFragment(c311MaterialFragment(facade,city),city),
 'c311>c313':(facade,city)=>c313MaterialFragment(c311MaterialFragment(facade,city),city),
 'c311':(facade,city)=>c311MaterialFragment(facade,city),
 '':facade=>facade,
};
// compileGeometryProgram's original [vertex,rawFragment] hook nesting.
// ensureC311ShadowProgram's original [vertex,fragment] nesting.
function originalShadow({c311ShaderActive,c312ShaderActive,c313ShaderActive,c311ShadowShaderActive,c312ShadowShaderActive,c313ShadowShaderActive},city){const {S402_SHADOW_VERTEX_GLSL,S402_SHADOW_FRAGMENT_GLSL}=M;return [(c312ShaderActive&&c312ShadowShaderActive?c312VertexShader((c313ShaderActive&&c313ShadowShaderActive?c313VertexShader((c311ShaderActive&&c311ShadowShaderActive?c311VertexShader(c298VertexShader(cbtVertexShader(c018VertexShader(S402_SHADOW_VERTEX_GLSL,city),city),city),city):c298VertexShader(cbtVertexShader(c018VertexShader(S402_SHADOW_VERTEX_GLSL,city),city),city)),city):(c311ShaderActive&&c311ShadowShaderActive?c311VertexShader(c298VertexShader(cbtVertexShader(c018VertexShader(S402_SHADOW_VERTEX_GLSL,city),city),city),city):c298VertexShader(cbtVertexShader(c018VertexShader(S402_SHADOW_VERTEX_GLSL,city),city),city))),city):(c313ShaderActive&&c313ShadowShaderActive?c313VertexShader((c311ShaderActive&&c311ShadowShaderActive?c311VertexShader(c298VertexShader(cbtVertexShader(c018VertexShader(S402_SHADOW_VERTEX_GLSL,city),city),city),city):c298VertexShader(cbtVertexShader(c018VertexShader(S402_SHADOW_VERTEX_GLSL,city),city),city)),city):(c311ShaderActive&&c311ShadowShaderActive?c311VertexShader(c298VertexShader(cbtVertexShader(c018VertexShader(S402_SHADOW_VERTEX_GLSL,city),city),city),city):c298VertexShader(cbtVertexShader(c018VertexShader(S402_SHADOW_VERTEX_GLSL,city),city),city)))),(c312ShaderActive&&c312ShadowShaderActive?c312FragmentShader((c313ShaderActive&&c313ShadowShaderActive?c313FragmentShader((c311ShaderActive&&c311ShadowShaderActive?c311FragmentShader(c298FragmentShader(cbtFragmentShader(c018FragmentShader(S402_SHADOW_FRAGMENT_GLSL,city),city),city),city):c298FragmentShader(cbtFragmentShader(c018FragmentShader(S402_SHADOW_FRAGMENT_GLSL,city),city),city)),city):(c311ShaderActive&&c311ShadowShaderActive?c311FragmentShader(c298FragmentShader(cbtFragmentShader(c018FragmentShader(S402_SHADOW_FRAGMENT_GLSL,city),city),city),city):c298FragmentShader(cbtFragmentShader(c018FragmentShader(S402_SHADOW_FRAGMENT_GLSL,city),city),city))),city):(c313ShaderActive&&c313ShadowShaderActive?c313FragmentShader((c311ShaderActive&&c311ShadowShaderActive?c311FragmentShader(c298FragmentShader(cbtFragmentShader(c018FragmentShader(S402_SHADOW_FRAGMENT_GLSL,city),city),city),city):c298FragmentShader(cbtFragmentShader(c018FragmentShader(S402_SHADOW_FRAGMENT_GLSL,city),city),city)),city):(c311ShaderActive&&c311ShadowShaderActive?c311FragmentShader(c298FragmentShader(cbtFragmentShader(c018FragmentShader(S402_SHADOW_FRAGMENT_GLSL,city),city),city),city):c298FragmentShader(cbtFragmentShader(c018FragmentShader(S402_SHADOW_FRAGMENT_GLSL,city),city),city))))];}
function originalHooked({c311ShaderActive,c312ShaderActive,c313ShaderActive},city,helper,cityPaintFragment){return [(c312ShaderActive?c312VertexShader((c313ShaderActive?c313VertexShader((c311ShaderActive?c311VertexShader(c298VertexShader(cbtVertexShader(c018VertexShader(VERTEX,city),city),city),city):c298VertexShader(cbtVertexShader(c018VertexShader(VERTEX,city),city),city)),city):(c311ShaderActive?c311VertexShader(c298VertexShader(cbtVertexShader(c018VertexShader(VERTEX,city),city),city),city):c298VertexShader(cbtVertexShader(c018VertexShader(VERTEX,city),city),city))),city):(c313ShaderActive?c313VertexShader((c311ShaderActive?c311VertexShader(c298VertexShader(cbtVertexShader(c018VertexShader(VERTEX,city),city),city),city):c298VertexShader(cbtVertexShader(c018VertexShader(VERTEX,city),city),city)),city):(c311ShaderActive?c311VertexShader(c298VertexShader(cbtVertexShader(c018VertexShader(VERTEX,city),city),city),city):c298VertexShader(cbtVertexShader(c018VertexShader(VERTEX,city),city),city)))),(c312ShaderActive?c312FragmentShader((c313ShaderActive?c313FragmentShader((c311ShaderActive?c311FragmentShader(c298FragmentShader(cbtFragmentShader(c018FragmentShader(fragment(helper,cityPaintFragment),city),city),city),city):c298FragmentShader(cbtFragmentShader(c018FragmentShader(fragment(helper,cityPaintFragment),city),city),city)),city):(c311ShaderActive?c311FragmentShader(c298FragmentShader(cbtFragmentShader(c018FragmentShader(fragment(helper,cityPaintFragment),city),city),city),city):c298FragmentShader(cbtFragmentShader(c018FragmentShader(fragment(helper,cityPaintFragment),city),city),city))),city):(c313ShaderActive?c313FragmentShader((c311ShaderActive?c311FragmentShader(c298FragmentShader(cbtFragmentShader(c018FragmentShader(fragment(helper,cityPaintFragment),city),city),city),city):c298FragmentShader(cbtFragmentShader(c018FragmentShader(fragment(helper,cityPaintFragment),city),city),city)),city):(c311ShaderActive?c311FragmentShader(c298FragmentShader(cbtFragmentShader(c018FragmentShader(fragment(helper,cityPaintFragment),city),city),city),city):c298FragmentShader(cbtFragmentShader(c018FragmentShader(fragment(helper,cityPaintFragment),city),city),city))))];}

const hooks=Object.freeze({c018:c018FragmentShader,cbt:cbtFragmentShader,c298:c298FragmentShader,c311:c311FragmentShader,c313:c313FragmentShader,c312:c312FragmentShader});
const vertexHooks=Object.freeze({c018:c018VertexShader,cbt:cbtVertexShader,c298:c298VertexShader,c311:c311VertexShader,c313:c313VertexShader,c312:c312VertexShader});
const helper='vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}',authority={},attributes=['a_position','a_normal','a_color','a_selected','a_paint_frame','a_paint_family','a_progressive_color'];
const fullBase=M.getFacadePaintFragmentGLSL();
// A City-dispatch variant of the same facade: real wrappers choose that anchor.
const cityBase=fullBase.replace('vec3 progressiveFeatureDispatch(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){','vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){');
assert.notEqual(cityBase,fullBase);
// Small facade sources with the same dispatcher/painter entry points keep the
// combinatorial cases cheap; the real 1.2M-character facade covers real sizes.
const smallBase=['// compact facade paint source','vec3 fpOrdinaryFacade(vec3 base){return base*.9;}','vec3 progressiveFeatureDispatch(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==4912.)return fpOrdinaryFacade(base);return base;}','vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family>=4000.)return progressiveFeatureDispatch(base,p,normal,frame,family);return base;}',''].join('\n');
const smallCityBase=smallBase.replaceAll('progressiveFeatureDispatch(','progressiveFeatureDispatchCity(');
const baseBounds=source=>S.shaderSourceBounds(S.shaderSourceText(source,['test/actual-facade-template']));
// Production order: raw facade -> 38 Dresden dispatchers -> recipe hooks.
const recipeFor=(cityName,hooksList,base)=>B.createCityMaterialBuilder(cityName,hooksList,()=>B.cityDresdenMaterial(base,cityName));
const flagsOf=(c311,c313,c312)=>Object.freeze({c311,c313,c312});
const atLeast=(bound,actual,label)=>assert(bound>=actual,label+': bound '+bound+' < actual '+actual);
function counting(fn,calls){return(source,cityName)=>{calls.push(source.length);return fn(source,cityName);};}
function countedHooks(table,calls){return Object.freeze(Object.fromEntries(Object.entries(table).map(([name,fn])=>[name,counting(fn,calls)])));}

test('38 Dresden dispatchers: the shared list keeps the original order, bytes and a pre-build bound',()=>{
 assert.equal(B.CITY_DRESDEN_DISPATCHERS.length,38);
 for(const base of [fullBase,smallCityBase]){
  const original=originalFacade(base,'dresden'),actual=B.cityDresdenMaterial(base,'dresden');
  assert.equal(actual,original,'dispatcher loop output is byte-identical');assert(actual.length>base.length);
  for(const fn of B.CITY_DRESDEN_DISPATCHERS)assert.equal(fn('vec3 progressiveFeatureDispatch(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){','berlin'),'vec3 progressiveFeatureDispatch(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){');
  assert.equal(B.cityDresdenMaterial(base,'berlin'),base,'other cities receive the same string object');
  let built=0;const builder=B.createCityMaterialBuilder('dresden',[],()=>{built++;return B.cityDresdenMaterial(base,'dresden');}),bounds=B.describeCityMaterialBounds(builder,baseBounds(base));
  assert.equal(built,0,'describing the recipe never runs its builder');
  assert.equal(bounds.sourceCharactersUpperBound,actual.length,'calibrated insertions are exact');atLeast(bounds.paintSourceCharactersUpperBound,actual.length,'paint');
  // Sequential dispatchers keep input, split pieces, replacement and result.
  atLeast(bounds.assemblyCharactersUpperBound,3*actual.length-2*(actual.length-base.length),'replace envelope');
  S.validateShaderSourceSyntax(actual,bounds.syntaxUpperBound);
 }
 // Either dispatcher spelling has one insertion size per wrapper.
 for(const fn of B.CITY_DRESDEN_DISPATCHERS){const a='vec3 progressiveFeatureDispatch(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){',b='vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){';assert.equal(fn(a,'dresden').length-a.length,fn(b,'dresden').length-b.length);}
});

test('C311, C312, C313 and C318->C320...C339 recipes match every original builder and fit their bounds',()=>{
 const cases=[['munich','c311>c313>c312>c318'],['munich','c311>c312>c318'],['munich','c311>c312'],['munich','c311>c313'],['munich','c311'],['munich',''],['leipzig','c311>c313>c312>c318'],['leipzig','c311>c313'],['leipzig','c311'],['dresden','c311>c313>c312>c318'],['berlin','c311>c313>c312>c318']];
 const realistic=[[fullBase,'munich','c311>c312>c318'],[cityBase,'dresden','c311>c313>c312>c318']];
 for(const [base,cityName,key]of [...[smallBase,smallCityBase].flatMap(base=>cases.map(([cityName,key])=>[base,cityName,key])),...realistic]){
  const hooksList=key?key.split('>'):[],builder=recipeFor(cityName,hooksList,base),actual=builder(),original=originalMaterial[key](originalFacade(base,cityName),cityName);
  assert.equal(actual,original,cityName+' '+key+' is byte-identical');assert.equal(builder.key,'city-material-v1:'+cityName+':'+key);
  const bounds=B.describeCityMaterialBounds(builder,baseBounds(base));
  assert.equal(bounds.sourceCharactersUpperBound,actual.length,cityName+' '+key+' exact material bound');S.validateShaderSourceSyntax(actual,bounds.syntaxUpperBound);
  if(cityName==='munich'&&hooksList.includes('c318')){
   assert(actual.includes(M.C320_FEATURE_GLSL)&&actual.includes(M.C339_FEATURE_GLSL),'C318 nests C320 through C339');
   // Twenty-one frames each keep an input while C339 holds pieces and result.
   atLeast(bounds.assemblyCharactersUpperBound,(B.CITY_C318_NESTED_LEVELS.length+2)*actual.length,'C318 nested envelope');
   assert(bounds.authorityTrace.includes('c318-nested-frames:21'));
  }
  if(cityName==='munich'&&hooksList.includes('c311'))assert(actual.includes('c311Staatskanzlei('));
  if(cityName==='munich'&&hooksList.includes('c312'))assert(actual.includes('c312Stadtsparkasse('));
  if(cityName==='leipzig'&&hooksList.includes('c313'))assert(actual.includes('c313LoehrsCarre('));
 }
 assert.throws(()=>B.createCityMaterialBuilder('munich',['c311','c311'],()=>''),/Invalid City material hook recipe/);
 // The nested chain list is the real call structure: each level calls the next.
 const levels=B.CITY_C318_NESTED_LEVELS;assert.equal(levels.length,21);
 for(let i=0;i+1<levels.length;i++)assert(levels[i].toString().includes(levels[i+1].name+'('),levels[i].name+' calls '+levels[i+1].name);
 assert(!/c\d+MaterialFragment\(/.test(levels.at(-1).toString().replace(/^function\s+\w+/,'')),'C339 is the innermost level');
});

test('hook shells and dynamic masks: original nesting, exact hooked bound and no program-size text while describing',()=>{
 const material={munich:'c311>c312>c318',leipzig:'c311>c313'};
 const flagCases={munich:[flagsOf(true,true,true),flagsOf(true,false,true),flagsOf(true,true,false),flagsOf(false,true,true),flagsOf(false,false,false)],leipzig:[flagsOf(true,true,true),flagsOf(true,false,true)],frankfurt:[flagsOf(true,true,true)],cologne:[flagsOf(true,true,true)],stuttgart:[flagsOf(true,true,true)],berlin:[flagsOf(true,true,true)],hamburg:[flagsOf(true,true,true)]};
 for(const [cityName,list]of Object.entries(flagCases))for(const flags of list){
  const base=cityName==='munich'?smallBase:smallCityBase,key=material[cityName]??'c311>c313>c312>c318',builder=recipeFor(cityName,key.split('>'),base),paint=builder(),materialBounds=B.describeCityMaterialBounds(builder,baseBounds(base));
  const calls=[],counted=countedHooks(hooks,calls),variant=[Number(flags.c311),Number(flags.c312),Number(flags.c313)].join(':')+'|true';
  const recipe=B.cityColourSourceRecipe({helper,city:cityName,variant,vertexInput:VERTEX,material:builder,materialBounds,hooks:counted,flags,authority,fragmentParts,fragment});
  assert(calls.every(length=>length<=12),'describing calls hooks only on their bare calibration pattern');calls.length=0;
  const [originalVertex,originalFragment]=originalHooked({c311ShaderActive:flags.c311,c312ShaderActive:flags.c312,c313ShaderActive:flags.c313},cityName,helper,paint);
  const assembled=recipe.assemble(paint);assert.equal(assembled,originalFragment,cityName+' '+variant+' hooked fragment is byte-identical');
  assert.equal(B.applyCityShaderHooks(VERTEX,cityName,vertexHooks,flags),originalVertex,cityName+' '+variant+' hooked vertex is byte-identical');
  const clipped=withResidentReflectionClip(assembled),bounds=recipe.sourceBounds;
  atLeast(bounds.sourceCharactersUpperBound,clipped.length,cityName+' assembled+clip');atLeast(bounds.paintSourceCharactersUpperBound,paint.length,cityName+' paint');
  assert.equal(bounds.sourceCharactersUpperBound,clipped.length,'calibrated hooks and the clip literals are exact');
  atLeast(bounds.assemblyCharactersUpperBound,materialBounds.assemblyCharactersUpperBound+clipped.length,cityName+' simultaneous text');
  S.validateShaderSourceSyntax(clipped,bounds.syntaxUpperBound);
  if(cityName==='munich'&&flags.c311)assert(assembled.includes('bool c311Suppressed(vec2 q,float role)'),'dynamic C311 mask present');
  if(cityName==='munich'&&flags.c312)assert(assembled.includes('bool c312Inside13(vec2 p)'),'dynamic C312 polygon mask present');
  if(cityName==='frankfurt')assert(assembled.includes('c298Suppressed('));if(cityName==='cologne')assert(assembled.includes('cbtSuppressed('));if(cityName==='stuttgart')assert(assembled.includes('c018Suppressed('));
  // The projected-shadow program: shader and shadow switches combine per hook.
  for(const shadowFlags of [flagsOf(true,true,true),flagsOf(false,true,true),flagsOf(true,false,false)]){
   const combined=flagsOf(flags.c311&&shadowFlags.c311,flags.c313&&shadowFlags.c313,flags.c312&&shadowFlags.c312),[shadowVertex,shadowFragment]=originalShadow({c311ShaderActive:flags.c311,c312ShaderActive:flags.c312,c313ShaderActive:flags.c313,c311ShadowShaderActive:shadowFlags.c311,c312ShadowShaderActive:shadowFlags.c312,c313ShadowShaderActive:shadowFlags.c313},cityName);
   assert.equal(B.applyCityShaderHooks(M.S402_SHADOW_VERTEX_GLSL,cityName,vertexHooks,combined),shadowVertex,cityName+' shadow vertex');
   assert.equal(B.applyCityShaderHooks(M.S402_SHADOW_FRAGMENT_GLSL,cityName,hooks,combined),shadowFragment,cityName+' shadow fragment');
   const bound=B.describeCityShaderHooks(S.shaderSourceText(M.S402_SHADOW_FRAGMENT_GLSL),cityName,hooks,combined,authority);
   assert.equal(bound.charactersUpperBound,shadowFragment.length,cityName+' shadow fragment bound is exact');atLeast(bound.emissionCharactersUpperBound,shadowFragment.length,'shadow envelope');S.validateShaderSourceSyntax(shadowFragment,bound.syntaxUpperBound);
  }
 }
});

function admittedTicket(ledger,value){
 // program-preparation reserves the generated-source bound with the same
 // workspace allocation identities before it enqueues the build.
 return ledger.reserve([{category:'program-source',bytes:value.sourceBytesUpperBound,precision:'estimate',identity:{},label:'test program ticket'},...value.workspaceCosts],{label:'test program ticket'});
}
function sourceOwner(ledger,counter,current=()=>true){return B.createCityProgramSourceOwner({budget:ledger,current,whiteFragment:HAMBURG_WHITE_FRAGMENT,buildMaterial:material=>{counter.builds++;return material();},specialize:(source,family)=>specializeCurrentPaintFragment(source,family)});}

test('workspace path: admitted ticket and claim share identities and match original specialize+clip bytes',()=>{
 for(const [cityName,key,flags,base,families]of [['dresden','c311>c313>c312>c318',flagsOf(true,true,true),fullBase,[4912,0]],['munich','c311>c312>c318',flagsOf(true,true,true),fullBase,[4912]],['leipzig','c311>c313',flagsOf(true,true,true),smallCityBase,[4912,21101,0]]]){
  const builder=recipeFor(cityName,key.split('>'),base),materialBounds=B.describeCityMaterialBounds(builder,baseBounds(base)),variant='1:1:1|true';
  const recipe=B.cityColourSourceRecipe({helper,city:cityName,variant,vertexInput:VERTEX,material:builder,materialBounds,hooks,flags,authority,fragmentParts,fragment}),vertex=B.applyCityShaderHooks(VERTEX,cityName,vertexHooks,flags);
  const probe=R.createResourceBudget({limitBytes:4*1024*1024*1024}),counter={builds:0},probeOwner=sourceOwner(probe,counter);
  const first=probeOwner.programBudget(recipe,vertex,attributes,[4912]),item=B.cityProgramBudgetItemBytes(first);probeOwner.release();
  // A ledger with room for exactly one program item plus 1 KiB: a claim with
  // different identities than its admitted ticket could not be reserved.
  const ledger=R.createResourceBudget({limitBytes:item+1024,recentLimitBytes:0}),owner=sourceOwner(ledger,counter);
  const [originalVertex,originalFragment]=originalHooked({c311ShaderActive:flags.c311,c312ShaderActive:flags.c312,c313ShaderActive:flags.c313},cityName,helper,builder());
  assert.equal(vertex,originalVertex);
  for(const family of families){
   const value=B.checkedCityProgramBudget(ledger,owner.programBudget(recipe,vertex,attributes,[family]),'test');const ticket=admittedTicket(ledger,value);
   try{const prepared=owner.prepareSource(recipe,[family]);assert.equal(withResidentReflectionClip(prepared.fragment),withResidentReflectionClip(specializeCurrentPaintFragment(originalFragment,family)),cityName+' family '+family+' submitted bytes');atLeast(value.sourceBytesUpperBound,2*(withResidentReflectionClip(prepared.fragment).length+vertex.length),'program source bound');}
   finally{ticket.release();}
  }
  assert.equal(counter.builds,1,'later families reuse the one admitted base source');assert.equal(owner.stats.analyses,families.length);assert.equal(owner.stats.hits,families.length-1);
  assert(ledger.stats.bytes>0,'the retained workspace entry stays charged');owner.clearPreparedSource();assert.equal(owner.stats.budget.ownedBytesEstimate,0,'clearing the entry returns its workspace claim');owner.release();assert.equal(ledger.stats.bytes,0,'release also returns pressure registry metadata');
  counter.builds=0;
 }
 // White keeps its original constant program source without specialization.
 const ledger=R.createResourceBudget({limitBytes:64*1024*1024}),counter={builds:0},owner=sourceOwner(ledger,counter),recipe=B.cityWhiteSourceRecipe({helper,city:'hamburg',variant:'1:1:1|true',vertexInput:HAMBURG_WHITE_VERTEX,fragment:HAMBURG_WHITE_FRAGMENT,authority});
 const value=owner.programBudget(recipe,HAMBURG_WHITE_VERTEX,attributes,[]),ticket=admittedTicket(ledger,value);
 try{const prepared=owner.prepareSource(recipe,[]);assert.equal(withResidentReflectionClip(prepared.fragment),withResidentReflectionClip(HAMBURG_WHITE_FRAGMENT));assert.equal(counter.builds,0);atLeast(recipe.sourceBounds.sourceCharactersUpperBound,withResidentReflectionClip(HAMBURG_WHITE_FRAGMENT).length,'white');}finally{ticket.release();owner.release();}
 assert.equal(ledger.stats.bytes,0);
});

test('a rejected budget never calls the paint builder; an unfit item is reported instead of waiting',()=>{
 const facade=B.cityDresdenMaterial(fullBase,'munich');let builds=0;const builder=B.createCityMaterialBuilder('munich',['c311','c312','c318'],()=>{builds++;return facade;}),flags=flagsOf(true,true,true);
 const materialBounds=B.describeCityMaterialBounds(builder,baseBounds(facade)),recipe=B.cityColourSourceRecipe({helper,city:'munich',variant:'1:1:1|true',vertexInput:VERTEX,material:builder,materialBounds,hooks,flags,authority,fragmentParts,fragment}),vertex=B.applyCityShaderHooks(VERTEX,'munich',vertexHooks,flags);
 assert.equal(builds,0);
 // Whole item larger than the page ledger: explicit, typed and not queued.
 const tiny=R.createResourceBudget({limitBytes:1024*1024,recentLimitBytes:0}),counter={builds:0},tinyOwner=sourceOwner(tiny,counter);
 assert.throws(()=>B.checkedCityProgramBudget(tiny,tinyOwner.programBudget(recipe,vertex,attributes,[4912]),'city:munich:colour:4912'),error=>B.isCityShaderBudgetUnfit(error)&&error.capacityBytes===1024*1024&&error.requiredBytes>1024*1024);
 assert.throws(()=>tinyOwner.prepareSource(recipe,[4912]),error=>error instanceof R.ResourceBudgetExceededError);
 assert.equal(counter.builds,0,'the workspace rejected its claim before the material builder');tinyOwner.release();
 const preflightUnfit=B.admitCityMaterialPreflight(tiny,materialBounds,'city munich material');assert.equal(preflightUnfit.status,'unfit');
 // Fits alone but not beside current usage: waiting, still no builder call.
 const ample=R.createResourceBudget({limitBytes:2*1024*1024*1024}),probeOwner=sourceOwner(ample,counter),item=B.cityProgramBudgetItemBytes(probeOwner.programBudget(recipe,vertex,attributes,[4912]));probeOwner.release();
 const ledger=R.createResourceBudget({limitBytes:item+1024,recentLimitBytes:0}),blocker=ledger.reserve({category:'construction',bytes:item,precision:'exact',identity:{},label:'other renderer'}),owner=sourceOwner(ledger,counter);
 const value=B.checkedCityProgramBudget(ledger,owner.programBudget(recipe,vertex,attributes,[4912]),'city:munich:colour:4912');
 const attempt=ledger.tryReserve([{category:'program-source',bytes:value.sourceBytesUpperBound,precision:'estimate',identity:{}},...value.workspaceCosts]);
 assert.equal(attempt.ok,false,'the program ticket waits for availability');
 assert.throws(()=>owner.prepareSource(recipe,[4912]),error=>error instanceof R.ResourceBudgetExceededError);
 const preflightWait=B.admitCityMaterialPreflight(ledger,materialBounds,'city munich material');assert.equal(preflightWait.status,'waiting');
 assert.equal(counter.builds,0);assert.equal(builds,0,'no material text was produced while waiting');
 let woke=0;const signal=new AbortController();ledger.onAvailable(()=>{woke++;signal.abort();},signal.signal);blocker.release();assert.equal(woke,1,'release wakes the waiting caller once');
 // A rejected claim rotates the workspace identities; the retry re-describes
 // its preflight exactly as the next compile poll does.
 const retry=B.checkedCityProgramBudget(ledger,owner.programBudget(recipe,vertex,attributes,[4912]),'city:munich:colour:4912'),ticket=admittedTicket(ledger,retry);
 try{const prepared=owner.prepareSource(recipe,[4912]);assert(prepared.fragment.length>0);assert.equal(counter.builds,1);}finally{ticket.release();owner.release();}
 assert.equal(ledger.stats.bytes,0,'release returns every claim');
 const admitted=B.admitCityMaterialPreflight(ledger,materialBounds,'city munich material');assert.equal(admitted.status,'admitted');assert.equal(admitted.reservation.bytes,admitted.bytes);admitted.reservation.release();assert.equal(ledger.stats.bytes,0);
});

test('cancellation, failure and release leave no workspace claim behind',()=>{
 const facade=B.cityDresdenMaterial(smallCityBase,'leipzig'),flags=flagsOf(true,true,true);
 const run=(buildMaterial,current)=>{const ledger=R.createResourceBudget({limitBytes:2*1024*1024*1024}),owner=B.createCityProgramSourceOwner({budget:ledger,current,whiteFragment:HAMBURG_WHITE_FRAGMENT,buildMaterial,specialize:(source,family)=>specializeCurrentPaintFragment(source,family)});return{ledger,owner};};
 const builder=B.createCityMaterialBuilder('leipzig',['c311','c313'],()=>facade),materialBounds=B.describeCityMaterialBounds(builder,baseBounds(facade)),recipe=B.cityColourSourceRecipe({helper,city:'leipzig',variant:'1:1:1|true',vertexInput:VERTEX,material:builder,materialBounds,hooks,flags,authority,fragmentParts,fragment});
 {const {ledger,owner}=run(()=>{throw Error('material failure');},()=>true);assert.throws(()=>owner.prepareSource(recipe,[4912]),/material failure/);assert.equal(owner.stats.budget.ownedBytesEstimate,0,'failed build retired its claim');owner.release();assert.equal(ledger.stats.bytes,0,'release also returns pressure registry metadata');}
 {let live=true;const {ledger,owner}=run(material=>{live=false;return material();},()=>live);assert.throws(()=>owner.prepareSource(recipe,[4912]),error=>error.name==='AbortError');assert.equal(owner.stats.budget.ownedBytesEstimate,0,'superseded build retired its claim');owner.release();assert.equal(ledger.stats.bytes,0,'release also returns pressure registry metadata');}
 {const {ledger,owner}=run(material=>material(),()=>true);owner.prepareSource(recipe,[4912]);assert(ledger.stats.bytes>0);owner.release();assert.equal(ledger.stats.bytes,0,'terminal release');assert.throws(()=>owner.prepareSource(recipe,[4912]),error=>error.name==='AbortError');assert.equal(owner.stats.released,true);}
 assert(B.isCityShaderBoundViolation(new Error('Assembled source exceeded its pre-build bound')));assert(B.isCityShaderBoundViolation(new RangeError('Shader source exceeded its lexical callSites envelope')));assert(!B.isCityShaderBoundViolation(new Error('controlled shader failure')));
});

test('renderer callers are wired through the admitted recipe and workspace',()=>{
 const compile=rendererBinding('compileGeometryProgram'),material=rendererBinding('prepareMaterialSource'),facade=rendererBinding('facadePaintFragmentForCity'),admit=rendererBinding('admitMaterialSource');
 assert(compile.includes('budget:cityProgramBudget(describedPlan,described,families,resource)'),'program preflight uses the described recipe');
 assert(compile.includes('owner=programSourceOwner(dataPlan)')&&compile.includes('owner.prepareSource(source.recipe,families)'),'build only prepares through the plan workspace');
 assert(!compile.includes('materialSourceBuilder()'),'the compile path never calls the material builder directly');
 assert(compile.includes('isCityShaderBudgetUnfit(error)||isCityShaderBoundViolation(error)'),'budget failures do not trigger material fallbacks');
 assert(material.indexOf('admitMaterialSource(admission,revision)')>=0&&material.indexOf('admitMaterialSource(admission,revision)')<material.indexOf('programPreparation.work('),'preflight admission precedes its queued builder');
 assert(admit.includes('admitCityMaterialPreflight(')&&admit.includes('budget.onAvailable('),'waiting uses the ledger wake-up');
 assert.equal(facade,'(city:string)=>cityDresdenMaterial(baseFacadePaintFragmentForCity(city),city)');
 assert(!rendererText.includes('prepareProgramSource('),'the unmetered source owner is gone');
 for(const name of ['releaseProgramSource(oldDataPlan)','releaseMaterialAdmission(candidate)','releaseMaterialAdmissions();textureShaderFailure'])assert(rendererText.includes(name),name);
 const shadow=rendererBinding('ensureC311ShadowProgram'),admitted=shadow.indexOf('budget=cityShadowProgramBudget(flags)');assert(admitted>=0&&admitted<shadow.indexOf('try{')&&shadow.includes("inputs:[hooks,dataIdentity??''],budget,")&&shadow.includes('isCityShaderBudgetUnfit(error)||isCityShaderBoundViolation(error)'),'the projected-shadow program is admitted before its fallback try and budget errors are not fallbacks');
 // Publication retires the replaced resident state's own preflight admission.
 assert(rendererText.includes('releaseMaterialAdmission(candidate);releaseMaterialAdmission(residentMaterialAdmission);'),'publication releases the resident preflight admission');
});

// ---- Renderer-level behaviour: production functions bound to a minimal state ----
// Each test binds the renderer's own function text (no copy) to a small state
// object and drives it with the real ledger and the real preparation scheduler.
const preparation=M.preparation;
function rendererNode(name){let found;const visit=node=>{if(found)return;if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node;else if(ts.isMethodDeclaration(node)&&ts.isObjectLiteralExpression(node.parent)&&node.name.getText(rendererAST)===name)found=node;else if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name&&node.initializer)found=node.initializer;ts.forEachChild(node,visit);};visit(rendererAST);assert(found,'renderer function '+name);return found;}
function compileWith(state,text){const scope=new Proxy(state,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});const js=ts.transpileModule('('+text+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;return Function('scope','with(scope){return '+js+'}')(scope);}
function bindRenderer(state,names){for(const name of names){const node=rendererNode(name);state[name]=compileWith(state,(ts.isMethodDeclaration(node)?'function ':'')+node.getText(rendererAST));}return state;}
// buildBatches' own Dresden feature gate expression, evaluated against a state.
function productionBuiltSourceFeatures(state){const batches=rendererNode('buildBatches');let found;const visit=node=>{if(!found&&ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='builtSourceFeatures')found=node.initializer.getText(rendererAST);ts.forEachChild(node,visit);};visit(batches);assert(found,'buildBatches builtSourceFeatures');return compileWith(state,'()=>'+found);}
// The pre-budget renderer's buildBatches gate, verbatim: it read the retained text.
function originalBuiltSourceFeatures(cityPaintFragment){return new Set(['c437Blockhaus', 'c438Bellevue', 'c439Finance', 'c440Cinemas', 'c441Zeuner', 'c442Schinkel', 'c443Altmarkt', 'c444Anton', 'c445Hilton', 'c446Campus', 'c447Campus', 'c448Simmel', 'c449AltmarktWest', 'c450DeSaxe', 'c451NPone', 'c452Tillich', 'c453Industrial', 'c454Corner', 'c455Wilsdruffer', 'c456Hotels', 'c457Ostra', 'c459Wils1416', 'c460Gewandhaus', 'c461SemperAnnex', 'c462Hof', 'c463Reichsbank', 'c464Kutzbach', 'c465Glass', 'c466Frieseneck', 'c467LandhausHoym', 'c468QuartierIII1', 'c470Station', 'c471Schauspielhaus', 'c472StateMinistries', 'c473Landgericht', 'c474Petri', 'c476Wings'].filter(name=>cityPaintFragment.includes(name)));}
const drain=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setTimeout(resolve,2));};
const MATERIAL_FUNCTIONS=['prepareMaterialSource','admitMaterialSource','finishMaterialAdmission','releaseMaterialAdmission','releaseMaterialAdmissions','materialAdmissionHeld','clearMaterialSource','describeMaterialSource','currentDataScope'];
function preparedPlan(cityName,identity,input=[]){return{identity,city:cityName,input,signal:new AbortController().signal,scope:{stats:{disposed:false},retain(){return()=>{};}}};}
function materialState({cityName='munich',hooksList=['c311','c312','c318'],base=smallBase,limitBytes=2*1024*1024*1024}={}){
 const ledger=R.createResourceBudget({limitBytes,recentLimitBytes:0}),context={lost:false,isContextLost(){return this.lost;}},trace={builds:[],repaints:0,packs:[]},resident=preparedPlan(cityName,'resident-plan');
 const S={city:cityName,gl:context,destroyed:false,pageHidden:false,enabled:true,geometryOwner:{store:{budget:ledger}},map:{triggerRepaint(){trace.repaints++;}},
  programPreparation:preparation.createProgramPreparationOwner('city test '+cityName,()=>{}),ProgramPreparationPending:preparation.ProgramPreparationPending,
  residentMaterialAdmission:{},materialPreflightIdentity:{},materialAdmissions:new Map(),materialSourceBounds:new WeakMap(),
  materialRecipeRevision:0,materialSourceWorkRevision:0,materialSourceSettled:false,materialSourceFailure:undefined,
  cityPaintFragment:'',cityPaintFragmentBytes:0,cityMaterialFeatures:new Set(),cityBuiltSourceFeatures:new Set(),progressiveShaderSpecialization:undefined,
  chunkMaterialScope:undefined,geometryCompilationCandidate:undefined,compilationPublishedState:undefined,pendingGeometryCandidate:undefined,geometryUploadRevision:0,dataPublicationRevision:0,
  residentDataPlan:resident,publishedDataPlan:resident,
  admitCityMaterialPreflight:B.admitCityMaterialPreflight,describeCityMaterialBounds:B.describeCityMaterialBounds,cityDresdenSourceFeatures:B.cityDresdenSourceFeatures,CITY_DRESDEN_SOURCE_FEATURES:B.CITY_DRESDEN_SOURCE_FEATURES,
  cityData_describeFacadePaintSourceBounds:()=>baseBounds(base),cityData_describeFacadePaintSource:(_city,source)=>({fragmentBytes:2*source.length}),
  clearCityPreparedProgramSources(){},clearProgramSource(){},
 };
 S.materialSourceBuilder=B.createCityMaterialBuilder(cityName,hooksList,()=>{trace.builds.push(ledger.stats.bytes);return B.cityDresdenMaterial(base,cityName);});
 bindRenderer(S,MATERIAL_FUNCTIONS);
 const preflightBytes=B.cityMaterialPreflightCosts(B.describeCityMaterialBounds(S.materialSourceBuilder,baseBounds(base)),{})[0].bytes;
 return{S,ledger,context,trace,resident,preflightBytes};
}
// setBatches, the per-state snapshot, the candidate wrapper and packing, all
// production; geometry construction itself is out of scope and recorded only.
function withCandidateFunctions(harness){
 const {S,trace}=harness;
 Object.assign(S,{candidateProgramHandoff:{matches:()=>false},candidateHandoffRevision:0,preparedProgramHandoffs:new WeakMap(),preparedDataHandoffs:new WeakMap(),handoffPendingPrograms:()=>S.candidateHandoffRevision,clearCandidateHandoff(){},
  generation:0,whiteModeEligible:false,paintMode:()=>2,hookSignature:()=>'1:1:1',c318MaterialActive:true,adjacentViewportPublicationSignal:()=>undefined,prepareGeometryUpload(){},retainRendererChunkInput:()=>({release(){}}),
  createRathausProxyMasks:()=>({detach(){},destroy(){}}),rathausProxyMasks:{detach(){},destroy(){}},loaded:new Map(),solarShadowAdmittedKeys:new Set(),sceneChunks:[],sceneSpans:[],residentMaterialStyles:[],
  sceneArrayBytes:()=>0,sceneSidecarBytes:()=>0,pickBlocks70:{typedBytes:0},mainFamilyProgramKeys:()=>new Set(),sceneIndexCount:()=>0,captureContentIdentity:()=>'',
  cityData_progressiveRenderView:()=>[],CityChunkSidecarFallback:class{},disposeGeometryCandidate(){throw Error('unexpected candidate disposal');},
  buildBatches(){trace.packs.push([...features()]);return{chunks:[],finish:()=>true};},
 });
 const features=productionBuiltSourceFeatures(S);
 bindRenderer(S,['setBatches','snapshotResident','rollbackResidentUpload','withGeometryCandidate','packGeometryCandidate']);
 return harness;
}
function setBatchesArgs(components,generation,prepared){const args=new Array(18);args[0]=components;args[1]=generation;args[17]=prepared;return args;}

test('Dresden feature evidence keeps the original list, order and includes() result, in one pass',()=>{
 const all=B.CITY_DRESDEN_SOURCE_FEATURES.join('\n');
 assert.deepEqual([...B.CITY_DRESDEN_SOURCE_FEATURES],[...originalBuiltSourceFeatures(all)],'same 37 names in the original order');
 const dresden=B.cityDresdenMaterial(cityBase,'dresden'),munich=recipeFor('munich',['c311','c312','c318'],fullBase)();
 for(const [label,text]of [['dresden',dresden],['dresden full spelling',B.cityDresdenMaterial(fullBase,'dresden')],['munich',munich],['berlin',fullBase],['small',B.cityDresdenMaterial(smallCityBase,'dresden')],['empty',''],['prefix only','c4c4c4'],['partial','c437Blockhau c446Campu'],['overlap','cc437Blockhausc4c438Bellevuec4'],['tail','vec4 x;c476Wings'],['adjacent','c446Campusc447Campus']])
  assert.deepEqual([...B.cityDresdenSourceFeatures(text)],[...originalBuiltSourceFeatures(text)],label);
 assert.equal(B.cityDresdenSourceFeatures(dresden).size,37,'the real Dresden material builds every landmark material');
 assert.equal(B.cityDresdenSourceFeatures(munich).size,0);
 // buildBatches' production gate over the built evidence equals the original text gate.
 const gate=productionBuiltSourceFeatures({CITY_DRESDEN_SOURCE_FEATURES:B.CITY_DRESDEN_SOURCE_FEATURES,cityBuiltSourceFeatures:B.cityDresdenSourceFeatures(dresden)});
 assert.deepEqual([...gate()],[...originalBuiltSourceFeatures(dresden)]);
});

test('renderer: a Dresden candidate is packed with the original built features, which outlive the discarded text as the original text did',async()=>{
 const harness=withCandidateFunctions(materialState({cityName:'dresden',hooksList:[],base:smallCityBase})),{S,ledger,trace}=harness;
 const components=[{objectId:'way/1',partId:'part'}],next=preparedPlan('dresden','next-plan',components);
 S.setBatches(...setBatchesArgs(components,1,next));
 const candidate=S.pendingGeometryCandidate;assert(candidate&&candidate.dataPlan===next&&!candidate.packed);
 assert.equal(S.withGeometryCandidate(candidate,()=>S.prepareMaterialSource()),false,'admitted and queued');assert.equal(ledger.stats.bytes,harness.preflightBytes);
 await drain();
 const material=S.materialSourceBuilder();trace.builds.pop();
 assert.equal(trace.builds.length,1);assert(trace.builds[0]>=harness.preflightBytes,'built inside the admitted envelope');
 assert.equal(trace.packs.length,1,'the preflight build packed the candidate');
 assert.deepEqual(trace.packs[0],[...originalBuiltSourceFeatures(material)],'packing sees the features the original text gate saw');
 assert.equal(trace.packs[0].length,37);
 const after=S.withGeometryCandidate(candidate,()=>({features:[...S.cityBuiltSourceFeatures],text:S.cityPaintFragment,bytes:S.cityPaintFragmentBytes}));
 assert.deepEqual(after,{features:trace.packs[0],text:'',bytes:0},'only the feature names stay; no text and no byte count for absent text');
 assert.deepEqual([...S.cityBuiltSourceFeatures],[],'the resident state is untouched');
 assert.equal(S.withGeometryCandidate(candidate,()=>S.prepareMaterialSource()),true);assert(candidate.packed);assert.equal(ledger.stats.bytes,0);
 assert.deepEqual(S.withGeometryCandidate(candidate,()=>{S.clearMaterialSource();return[...S.cityBuiltSourceFeatures];}),[],'a material change clears them like the original text');
});

test('renderer: setBatches keeps the resident preflight admission; no material build ever runs without its envelope',async()=>{
 const harness=withCandidateFunctions(materialState()),{S,ledger,trace}=harness;
 assert.equal(S.prepareMaterialSource(),false,'resident preflight admitted and queued');assert.equal(ledger.stats.bytes,harness.preflightBytes);
 const components=[{objectId:'way/2',partId:'part'}],next=preparedPlan('munich','next-plan',components);
 S.setBatches(...setBatchesArgs(components,1,next));
 assert(S.pendingGeometryCandidate,'successor candidate queued');assert.equal(S.materialSourceWorkRevision,0,'the resident revision was restored');
 assert.equal(S.materialAdmissions.get(S.residentMaterialAdmission)?.reservation?.active,true,'the resident admission survives the successor state');
 assert.equal(ledger.stats.bytes,harness.preflightBytes);
 // The successor's own preflight: both builds are pending, but they run as
 // separate synchronous steps, so their shared identity is charged once.
 const candidate=S.pendingGeometryCandidate;assert.equal(S.withGeometryCandidate(candidate,()=>S.prepareMaterialSource()),false);
 assert.equal(S.materialAdmissions.size,2,'resident and successor each hold an admission');assert.equal(ledger.stats.bytes,harness.preflightBytes,'one envelope, not two');
 await drain();
 assert.deepEqual(trace.builds,[harness.preflightBytes,harness.preflightBytes],'the still-live resident build and the successor build each ran inside an envelope');
 assert.equal(trace.packs.length,1,'only the successor build packed its candidate');
 assert.equal(S.prepareMaterialSource(),true);assert.equal(S.withGeometryCandidate(candidate,()=>S.prepareMaterialSource()),true);assert.equal(ledger.stats.bytes,0,'settling returns the envelopes');
});

test('renderer: waiting queues no builder, one availability wake-up retries, an unfit envelope is a locked explicit failure',async()=>{
 const {preflightBytes}=materialState(),{S,ledger,trace}=materialState({limitBytes:preflightBytes+1024});
 const blocker=ledger.reserve({category:'construction',bytes:2048,precision:'exact',identity:{},label:'other renderer'});
 assert.equal(S.prepareMaterialSource(),false);assert.equal(S.prepareMaterialSource(),false,'a later poll keeps waiting');
 assert.equal(ledger.stats.availabilityListeners,1,'one wake-up per wait, no timer');
 await drain();assert.deepEqual(trace.builds,[],'no material text while waiting');assert.equal(trace.repaints,0);
 blocker.release();assert.equal(trace.repaints,1,'the release wakes the renderer once');assert.equal(ledger.stats.availabilityListeners,0);
 assert.equal(S.prepareMaterialSource(),false,'admitted and queued');assert.equal(ledger.stats.bytes,preflightBytes);
 await drain();assert.deepEqual(trace.builds,[preflightBytes],'one build inside the admitted envelope');
 assert.equal(S.prepareMaterialSource(),true);assert.equal(ledger.stats.bytes,0);
 const tiny=materialState({limitBytes:Math.floor(preflightBytes/2)});
 assert.throws(()=>tiny.S.prepareMaterialSource(),error=>B.isCityShaderBudgetUnfit(error)&&error.requiredBytes===preflightBytes&&error.capacityBytes===Math.floor(preflightBytes/2));
 assert.throws(()=>tiny.S.prepareMaterialSource(),error=>B.isCityShaderBudgetUnfit(error),'the explicit failure stays locked instead of waiting');
 await drain();assert.deepEqual(tiny.trace.builds,[]);assert.equal(tiny.ledger.stats.bytes,0);
 // An empty/retired resident scope is not a shader failure. Wait for prepared
 // data without reserving or scheduling text, then recover with the new scope.
 const empty=materialState(),builder=empty.S.materialSourceBuilder;
 empty.S.residentDataPlan=undefined;
 empty.S.materialSourceBuilder=B.createCityMaterialBuilder('munich',[],()=>{throw Error('builder must not run without prepared data');});
 assert.equal(empty.S.prepareMaterialSource(),false);assert.equal(empty.ledger.stats.bytes,0);await drain();
 assert.equal(empty.S.prepareMaterialSource(),false);assert.equal(empty.S.materialSourceFailure,undefined);
 assert.equal(empty.S.materialAdmissions.size,0);
 empty.S.residentDataPlan=empty.resident;empty.S.materialSourceBuilder=builder;
 assert.equal(empty.S.prepareMaterialSource(),false);await drain();
 assert.equal(empty.S.prepareMaterialSource(),true);assert.equal(empty.trace.builds.length,1);
 assert.equal(empty.ledger.stats.bytes,0);
});

test('renderer exits: release, hide, disable and context loss leave no admission and no unadmitted build',async()=>{
 const exits={
  'release (first step of releaseGPU, setEnabled(false) and destroy)':S=>S.releaseMaterialAdmissions(),
  'page hidden':S=>S.setPageHidden(true),
  'disabled':S=>S.setEnabled(false),
  'context loss':(S,context)=>{context.lost=true;S.programPreparation.contextLost();S.releaseMaterialAdmissions();},
 };
 const {preflightBytes:expected}=materialState();
 for(const [label,exit]of Object.entries(exits)){
  const {S,ledger,trace,context}=materialState();
  Object.assign(S,{dataPreparationCancel:undefined,clearCaptureDemands(){},pendingMaterialBatches:undefined,syncFacadeResources(){},paintSelection(){},reconcileProgramSources(){},viewRevision:0,clearCandidateHandoff(){}});
  bindRenderer(S,['setPageHidden','setEnabled','rollbackResidentUpload']);
  assert.equal(S.prepareMaterialSource(),false,label+': queued');assert.equal(ledger.stats.bytes,expected);
  exit(S,context);
  assert.equal(ledger.stats.bytes,0,label+': no admission remains');assert.equal(S.materialAdmissions.size,0,label);
  await drain();assert.deepEqual(trace.builds,[],label+': the queued build never ran without its envelope');
 }
 // Recovery after a plain release admits again from scratch.
 const {S,ledger,trace,preflightBytes}=materialState();
 assert.equal(S.prepareMaterialSource(),false);S.releaseMaterialAdmissions();await drain();
 assert.equal(S.prepareMaterialSource(),false);assert.equal(S.prepareMaterialSource(),false);assert.equal(ledger.stats.bytes,preflightBytes);await drain();
 assert.deepEqual(trace.builds,[preflightBytes]);assert.equal(S.prepareMaterialSource(),true);assert.equal(ledger.stats.bytes,0);
});

test('description and admission errors are reported as they are; only compile failures take the correction fallbacks',()=>{
 const compile=(overrides={})=>{const calls=[];const S={city:'munich',c318MaterialActive:true,c311ShaderActive:true,c312ShaderActive:true,c313ShaderActive:true,c318MaterialBase:'c318-base-recipe',materialRecipeRevision:0,dataPublicationRevision:0,
  prepareMaterialSource:()=>true,hookSignature:()=>'1:1:1',programSourcePlan:()=>({scope:{}}),cityProgramSourceFor:()=>({recipe:{},vertex:'',attributes:[]}),cityProgramBudget:()=>({sourceBytesUpperBound:2}),
  compileGeometryRecipe:()=>{calls.push('compile');return 'program';},setMaterialSourceBuilder:value=>calls.push(['material',value]),materialBuilder:list=>'recipe:'+list.join('>'),
  ProgramPreparationPending:preparation.ProgramPreparationPending,isProgramPreparationPending:preparation.isProgramPreparationPending,isCityShaderBudgetUnfit:B.isCityShaderBudgetUnfit,isCityShaderBoundViolation:B.isCityShaderBoundViolation,
  VERTEX:'',HAMBURG_WHITE_VERTEX:'',HAMBURG_WHITE_FRAGMENT:'',cityProgramSourceAuthority:{},selectGeometryConsumer:()=>'resident',...overrides};bindRenderer(S,['compileGeometryProgram']);return{S,calls};};
 const unchanged=S=>[S.c318MaterialActive,S.c313ShaderActive,S.c312ShaderActive,S.c311ShaderActive];
 for(const [label,override]of [['plan selection',{programSourcePlan:()=>{throw new TypeError('plan defect');}}],['source description',{cityProgramSourceFor:()=>{throw new TypeError('description defect');}}],['program admission',{cityProgramBudget:()=>{throw new RangeError('admission defect');}}],['unfit item',{cityProgramBudget:()=>{throw new B.CityShaderBudgetUnfitError('city test',2,1);}}]]){
  const {S,calls}=compile(override);
  assert.throws(()=>S.compileGeometryProgram('helper'),error=>/defect/.test(String(error))||B.isCityShaderBudgetUnfit(error),label+' propagates');
  assert.deepEqual(unchanged(S),[true,true,true,true],label+' keeps every correction material');assert.deepEqual(calls,[],label+' neither compiles nor changes the material recipe');
 }
 {const {S}=compile({cityProgramSourceFor:()=>{throw new DOMException('scope released','AbortError');}});assert.throws(()=>S.compileGeometryProgram('helper'),error=>preparation.isProgramPreparationPending(error)&&error.status==='cancelled');assert.deepEqual(unchanged(S),[true,true,true,true]);}
 {let failures=1;const {S,calls}=compile({compileGeometryRecipe:()=>{if(failures-->0)throw new Error('controlled shader failure');calls.push('compile');return 'program';}});
  assert.equal(S.compileGeometryProgram('helper'),'program');assert.equal(S.c318MaterialActive,false,'a real compile failure still drops C318 first');assert.deepEqual(calls,[['material','c318-base-recipe'],'compile']);}
 {const {S,calls}=compile({compileGeometryRecipe:()=>{throw new Error('Assembled source exceeded its pre-build bound');}});assert.throws(()=>S.compileGeometryProgram('helper'),/pre-build bound/);assert.deepEqual(unchanged(S),[true,true,true,true]);assert.deepEqual(calls,[]);}
 const shadow=(overrides={})=>{const calls=[];const S={gl:{},shadowProgram:undefined,city:'munich',c311ShaderActive:true,c312ShaderActive:true,c313ShaderActive:true,c311ShadowShaderActive:true,c312ShadowShaderActive:true,c313ShadowShaderActive:true,publishedDataPlan:{identity:'plan'},
  cityShadowProgramBudget:()=>({sourceBytesUpperBound:2}),programPreparation:{compile:()=>{calls.push('compile');return 'shadow';}},releaseShadowGPU:()=>calls.push('release'),applyCityShaderHooks:()=>'',cityVertexHooks:{},cityFragmentHooks:{},S402_SHADOW_VERTEX_GLSL:'',S402_SHADOW_FRAGMENT_GLSL:'',
  isProgramPreparationPending:preparation.isProgramPreparationPending,isCityShaderBudgetUnfit:B.isCityShaderBudgetUnfit,isCityShaderBoundViolation:B.isCityShaderBoundViolation,...overrides};bindRenderer(S,['ensureC311ShadowProgram']);return{S,calls};};
 const shadowFlags=S=>[S.c313ShadowShaderActive,S.c312ShadowShaderActive,S.c311ShadowShaderActive];
 {const {S,calls}=shadow({cityShadowProgramBudget:()=>{throw new TypeError('shadow description defect');}});assert.throws(()=>S.ensureC311ShadowProgram(),/shadow description defect/);assert.deepEqual(shadowFlags(S),[true,true,true],'the shadow description error keeps every correction shadow');assert.deepEqual(calls,[]);}
 {let failures=1;const {S,calls}=shadow({programPreparation:{compile:()=>{if(failures-->0)throw new Error('controlled shadow failure');calls.push('compile');return 'shadow';}}});
  S.ensureC311ShadowProgram();assert.deepEqual(shadowFlags(S),[false,true,true],'a real shadow compile failure still drops C313/C318 first');assert.equal(S.shadowProgram,'shadow');assert.deepEqual(calls,['release','compile']);}
});

test('every shared-core bound violation message is classified as a budget error, not a shader failure',()=>{
 const files=['src/safety/prepared-source.ts','src/safety/render-runtime/shader-source-budget.ts','src/safety/render-runtime/shader-assembly-budget.ts','src/safety/render-runtime/program-preparation.ts'],messages=[];
 const sample=node=>ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)?node.text:ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken?sample(node.left)+sample(node.right):'callSites';
 for(const file of files){const source=ts.createSourceFile(file,fs.readFileSync(path.join(web,file),'utf8'),ts.ScriptTarget.Latest,true);const visit=node=>{if((ts.isNewExpression(node)||ts.isCallExpression(node))&&ts.isIdentifier(node.expression)&&/^(?:Range|Type)?Error$/.test(node.expression.text)&&node.arguments?.length){const text=sample(node.arguments[0]);if(/exceeded/.test(text)&&!/safe integer/.test(text))messages.push(file+': '+text);}ts.forEachChild(node,visit);};visit(source);}
 assert(messages.length>=10,'the known shared bound checks are all found: '+messages.length);
 for(const message of messages)assert(B.isCityShaderBoundViolation(new Error(message.slice(message.indexOf(': ')+2))),'classified: '+message);
 assert(!B.isCityShaderBoundViolation(new R.ResourceBudgetExceededError({capacity:1,required:2,current:0,recentCapacity:0,recentRequired:0,recentCurrent:0,shortfallBytes:1,recentShortfallBytes:0,additionalBytes:2,constraint:'total'})),'capacity pressure is waiting, not a bound violation');
});

test('the built feature evidence ends where the original text ended: a non-reusing program build, reconcile, material change',()=>{
 const features=()=>new Set(['c437Blockhaus']),plan={scope:{}};let captured;
 const owner={reuse:false,stats:{hits:0},prepareSource(){if(this.reuse)this.stats.hits++;return{fragment:'void main(){}',depthEffects:false};}};
 const S={city:'dresden',c318MaterialActive:true,c311ShaderActive:true,c312ShaderActive:true,c313ShaderActive:true,materialRecipeRevision:0,dataPublicationRevision:0,residentDataPlan:plan,cityPaintFragment:'',cityPaintFragmentBytes:0,cityBuiltSourceFeatures:features(),lastFamilyFragmentCharacters:0,
  prepareMaterialSource:()=>true,hookSignature:()=>'1:1:1',programSourcePlan:()=>plan,cityProgramSourceFor:()=>({recipe:{},vertex:'',attributes:[]}),cityProgramBudget:()=>({sourceBytesUpperBound:2}),programSourceOwner:()=>owner,withResidentReflectionClip:source=>source,
  compileGeometryRecipe:recipe=>{captured=recipe;return 'program';},ProgramPreparationPending:preparation.ProgramPreparationPending,isProgramPreparationPending:preparation.isProgramPreparationPending,isCityShaderBudgetUnfit:B.isCityShaderBudgetUnfit,isCityShaderBoundViolation:B.isCityShaderBoundViolation,
  VERTEX:'',HAMBURG_WHITE_VERTEX:'',HAMBURG_WHITE_FRAGMENT:'',cityProgramSourceAuthority:{},selectGeometryConsumer:()=>'resident'};
 bindRenderer(S,['compileGeometryProgram']);assert.equal(S.compileGeometryProgram('helper',false,4912),'program');
 owner.reuse=true;captured.build();assert.deepEqual([...S.cityBuiltSourceFeatures],['c437Blockhaus'],'reusing the retained entry keeps the evidence, as the original kept its text');
 owner.reuse=false;captured.build();assert.deepEqual([...S.cityBuiltSourceFeatures],[],'a program source build ends it, as the original cleared its text');
 for(const needed of [false,true]){
  const R2={publishedDataPlan:plan,pendingGeometryCandidate:undefined,residentDataPlan:plan,cityPaintFragment:'',cityPaintFragmentBytes:0,cityBuiltSourceFeatures:features(),planProgramSourceNeeded:()=>needed,clearProgramSource(){}};
  bindRenderer(R2,['reconcileProgramSources']);R2.reconcileProgramSources();
  assert.deepEqual([...R2.cityBuiltSourceFeatures],needed?['c437Blockhaus']:[],needed?'a still-needed plan keeps it':'reconcile ends it with the source');
 }
});

// Execute the production queue adapter independently of WebGL. A queued recipe
// may have a different live consumer by the time source admission starts.
function cityQueueFixture(){
 const resident={id:'resident'},first={plan:{id:'first'}},second={plan:{id:'second'}},calls=[];
 const state={gl:{},residentDataPlan:resident,dataPublicationRevision:1,geometryCompilationCandidate:undefined,compilationPublishedState:undefined,
  selected:first,selectGeometryConsumer(){return state.selected;},
  withGeometryCandidate(candidate,run){const previous=state.residentDataPlan;state.residentDataPlan=candidate.plan;try{return run();}finally{state.residentDataPlan=previous;}},
  snapshotResident(){const plan=state.residentDataPlan;return{restore(){state.residentDataPlan=plan;},clear(){}};},
  cityProgramSourceFor(plan){calls.push(['describe',plan.id]);return{plan};},
  cityProgramBudget(plan,source){assert.equal(source.plan,plan);calls.push(['budget',plan.id]);return{sourceBytesUpperBound:100,workspaceCosts:[],plan};},
  ProgramPreparationPending:class extends Error{},
  programPreparation:{acquireReadyProgram(){return undefined;},compile(_gl,recipe){state.queued=recipe;return{};}}
 };
 const code=ts.transpileModule(rendererBinding('compileGeometryRecipe'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const compile=Function('state','with(state){'+code+';return compileGeometryRecipe;}')(state);
 compile({resource:'colour:4912',budget:{plan:first.plan},build(){calls.push(['build',state.residentDataPlan.id]);return{fragment:state.residentDataPlan.id};}},'helper',false,4912,'variant');
 return{state,first,second,resident,calls};
}
test('queued city source binds successor budget and builder to the same live plan',()=>{
 const {state,second,resident,calls}=cityQueueFixture();state.selected=second;
 const selected=state.queued.resolveSource();assert.equal(selected.budget.plan,second.plan);assert.equal(state.residentDataPlan,resident);
 assert.equal(selected.current(),true);assert.equal(selected.build().fragment,'second');assert.equal(state.residentDataPlan,resident);
 assert.deepEqual(calls,[['describe','second'],['budget','second'],['build','second']]);
});
test('city source selected before a publication change cannot build afterward',()=>{
 const {state,second,calls}=cityQueueFixture(),selected=state.queued.resolveSource();state.selected=second;state.dataPublicationRevision++;
 assert.equal(selected.current(),false);assert.throws(()=>selected.build(),state.ProgramPreparationPending);
 assert.equal(calls.some(([kind])=>kind==='build'),false);
});
test('city resident selection restores a temporary candidate context after description and build',()=>{
 const {state,first,resident,calls}=cityQueueFixture();state.selected='resident';state.geometryCompilationCandidate=first;state.residentDataPlan=first.plan;
 state.compilationPublishedState={restore(){state.residentDataPlan=resident;}};
 const selected=state.queued.resolveSource();assert.equal(selected.budget.plan,resident);assert.equal(state.residentDataPlan,first.plan);
 assert.equal(selected.build().fragment,'resident');assert.equal(state.residentDataPlan,first.plan);
 assert.deepEqual(calls,[['describe','resident'],['budget','resident'],['build','resident']]);
});
