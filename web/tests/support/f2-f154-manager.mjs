import {resourceContentKey} from './resource-content-key.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createSourceModules} from './fixtures-managers-b-source-modules.mjs';
const bremenAdapter=createSourceModules().load('painted/bremen/safety/bremen-display-derivations');

// The production manager's F154 parent binding (bindDerivedChunkInput and its
// sourceAbsentDisplay predicate) evaluated verbatim from a provider's
// three-dimensional-map.ts. Only its free bindings are supplied: the caller's
// real F154 module instance (so scope memo keys are shared with the renderer),
// the caller's real page chunk store and renderer-chunk-input module, and a tiny
// manifest. No source-absent derived patch descriptor is bound: these fixtures
// carry no source-absent display rows, and any such row would fail closed.
const compile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText.trim().replace(/;$/,'');
function managerFunctions(provider,names){
 const file=new URL(`../../src/painted/${provider}/safety/three-dimensional-map.ts`,import.meta.url),text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(String(file),text,ts.ScriptTarget.Latest,true),out=new Map();
 (function visit(node){if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))out.set(node.name.text,node.getText(ast));ts.forEachChild(node,visit);})(ast);
 for(const name of names)assert(out.has(name),provider+' manager declares '+name);
 return out;
}
// Every free identifier must be supplied by env or be a real global: an extraction
// mismatch (a new free binding in the production function) fails at its lookup.
function evaluate(text,env){const scope=new Proxy(env,{has:()=>true,get:(o,k)=>{if(typeof k==='symbol')return k===Symbol.unscopables?undefined:o[k];if(k in o)return o[k];if(k in globalThis)return globalThis[k];throw new ReferenceError('unbound free identifier in extracted manager function: '+k);},set:(o,k,v)=>(o[k]=v,true)});return Function('scope','with(scope){return ('+compile(text)+')}')(scope);}

export function f154ManifestFor(record,{compiler='tiny-compiler'}={}){return{source_pbf_sha256:record.source_pbf_sha256,city_boundary:{sha256:record.source_boundary_sha256},source_snapshot:record.source_snapshot,compiler_sha256:compiler};}

export function managerF154Binding({provider='infill',f154,nativePaintSignature,store,chunkInputs,manifest,manifestSHA='tiny-manifest'}){
 assert(f154?.getRoot500Data&&f154.retainF154RecoveredSourceResource&&f154.F154_RECONSTRUCTION_SHA,'the caller supplies its real F154 module instance');
 assert(store?.budget&&chunkInputs?.retainRendererChunkInput,'the caller supplies its real page store and renderer chunk input module');
 // The real adapter observes no Bremen derived markers in this F154 fixture.
 const env={resourceContentKey,sourceAbsentPatches:[],...bremenAdapter,bindRendererChunkDerivations:chunkInputs.bindRendererChunkDerivations,getF154RecoveredSourceData:f154.getRoot500Data,retainF154RecoveredSourceResource:f154.retainF154RecoveredSourceResource,F154_RECONSTRUCTION_SHA:f154.F154_RECONSTRUCTION_SHA,nativePaintSignature,manifest,manifestSHA,resources:store,retainRendererChunkInput:chunkInputs.retainRendererChunkInput};
 const functions=managerFunctions(provider,['sourceAbsentDisplay','bindDerivedChunkInput']);
 env.sourceAbsentDisplay=evaluate(functions.get('sourceAbsentDisplay'),env);
 return evaluate(functions.get('bindDerivedChunkInput'),env);
}
