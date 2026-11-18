import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import path from 'node:path';import crypto from 'node:crypto';import {createRequire} from 'node:module';
const P=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),req=createRequire(P+'/web/package.json'),ts=req('typescript'),{build}=req('esbuild');
const file=P+'/web/src/painted/infill/safety/building-mesh-renderer.ts',text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
const names=new Set(['VERTEX','fragmentParts','fragment','COLOUR_PROGRAM_ATTRIBUTES']);const deps=new Set(['shaderSourceParts','emitShaderSource','SCENE_SURFACE_LIGHT_GLSL','RATHAUS_PROXY_MASK_GLSL','PARTIAL_GATE_MASK_GLSL','S402_CONNECTOR_MASK_GLSL','S036_ROOF009_MASK_GLSL','FACADE_OPENING_GLSL','FACADE_LAYOUT_GLSL','withResidentReflectionClip','pruneOwner6307Fragment']);
let source='';for(const n of ast.statements){if(ts.isImportDeclaration(n)){const specs=n.importClause?.namedBindings?.elements?.filter(e=>deps.has(e.name.text));if(specs?.length)source+='import {'+specs.map(e=>e.getText(ast)).join(',')+'} from '+n.moduleSpecifier.getText(ast)+';\n';}if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)if(names.has(d.name.getText(ast)))source+='const '+d.getText(ast)+';\n';}
source+=`import {paintProgramFragment} from './facade-paint-fragment';import {prepareFamilyPaintSource,specializePreparedFamilyPaintSource} from '../../../safety/family-paint-program';
import {BUILDING_SURFACE_FRAGMENT_GLSL} from './building-surface-style';
import {INFILL_EQUIVALENT_PROGRAM_GROUPS,sharedInfillEquivalentProgramFamilies} from './infill-equivalent-program-families';
export {INFILL_EQUIVALENT_PROGRAM_GROUPS,sharedInfillEquivalentProgramFamilies,BUILDING_SURFACE_FRAGMENT_GLSL};
export function census(sourceKey,families){const full=withResidentReflectionClip(pruneOwner6307Fragment(fragment(BUILDING_SURFACE_FRAGMENT_GLSL,paintProgramFragment(sourceKey,'frankfurt'))));const parsed=prepareFamilyPaintSource(full);return {rows:families.map(family=>specializePreparedFamilyPaintSource(parsed,[family])),union:specializePreparedFamilyPaintSource(parsed,families)};}`;
const bundle=await build({stdin:{contents:source,resolveDir:path.dirname(file),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'unused-city-profile',setup(b){b.onResolve({filter:/^virtual:crimemaps-city-data$/},()=>({path:'profile',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export default null;',loader:'js'}));}}]});const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('all admitted Infill base equivalence groups preserve the complete production fragment byte for byte',()=>{
 const seen=new Set();assert.equal(api.INFILL_EQUIVALENT_PROGRAM_GROUPS.length,26);
 for(const group of api.INFILL_EQUIVALENT_PROGRAM_GROUPS){
  const d=api.census(group.sourceKey,group.families);assert(d.union.fragment.length>39000);
  for(let i=0;i<group.families.length;i++){
   const key=group.sourceKey+':'+group.families[i];assert(!seen.has(key),'ambiguous group '+key);seen.add(key);
   assert.equal(d.rows[i].fragment,d.union.fragment,key+' complete fragment');
   assert.deepEqual(d.rows[i].depthEffects,d.union.depthEffects,key+' depth effects');
   assert.deepEqual(api.sharedInfillEquivalentProgramFamilies('frankfurt',group.sourceKey,[group.families[i]],api.BUILDING_SURFACE_FRAGMENT_GLSL),group.families);
  }
 }
});
test('unknown sources, other cities, unverified helpers and cross-group selections keep their original program recipes',()=>{
 const select=api.sharedInfillEquivalentProgramFamilies,base=api.BUILDING_SURFACE_FRAGMENT_GLSL;
 for(const [city,key,families,helper] of [
  ['essen','infill-skyper',[30000],base],['frankfurt','base',[30000],base],
  ['frankfurt','infill-skyper',[30000],base+'\n'],['frankfurt','infill-skyper',[30000,99999],base],
  ['frankfurt','infill-skyper',[],base],['frankfurt','infill-skyper',[30000.5],base],
  ['frankfurt','infill-frankfurt-low-office-bulk70',[34156,34184],base],
  ['frankfurt','infill-frankfurt-katharinen-east149-official070',[45341,45342],base],
 ])assert.equal(select(city,key,families,helper),families);
});
