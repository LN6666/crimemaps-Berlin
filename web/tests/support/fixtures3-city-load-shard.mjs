// The actual City manager source production (loadShard in
// src/painted/city/safety/three-dimensional-map.ts), extracted and evaluated
// against tiny inputs. Since the chunk-store migration the manager's shard()
// only reads the wanted-source lease; loadShard is the production that runs
// the inline material / paint-initialization wait and the C358 material module
// import (both before any source lease or metadata charge; src-r3b, DECISIONS
// 2026-11-02 "第三段第二轮结项"), the page native source read, the synchronous
// C358 rows binding, owner verification and finally the source metrics plus the returned value that the page store
// publishes ("cache"). Shared by inline-city-materials and c358-lazy-material.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const managerFile=path.join(web,'src/painted/city/safety/three-dimensional-map.ts');

/** Text of the actual loadShard declaration. */
export function cityLoadShardSource(){
 const text=fs.readFileSync(managerFile,'utf8'),ast=ts.createSourceFile(managerFile,text,ts.ScriptTarget.Latest,true);let found;
 (function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='loadShard')found=node;ts.forEachChild(node,visit);})(ast);
 if(!found)throw Error('The actual City manager no longer declares loadShard');
 return found.getText(ast);
}

/** Evaluates the actual loadShard over a scope of tiny bindings. `events` records
 * 'source' (native source acquired), 'verify' (owner rows verified) and 'cache'
 * (source metrics recorded right before the value is returned for publication);
 * the injected inline/C358 hooks record their own events. `acquireAttempts`
 * counts every source acquire call, recorded before the fixture's own abort
 * check, so a test can prove the production stopped by itself before the lease. */
export function cityLoadShard({rows,events,city='munich',ownerProfile,prepareInlineCityMaterials,prepareC358MaterialModule,bindC358MaterialRows,awaitPaintInitialization=operation=>operation}){
 const releases=[],adjusted=[],attempts={count:0},context={retainParent(){},adjust(cost){adjusted.push(cost?.category??'resource');return true;}};
 const values={city,maxVertices:200000,mobile:false,loadCount:0,options:{awaitPaintInitialization},
  sourceClient:{async acquire(leaf,signal,_maxVertices,role){attempts.count++;signal.throwIfAborted();if(role!=='dependency')throw Error('fixture expects a dependency source lease');events.push('source');
   return{raw:{schema_version:1,city,components:rows,decodedPayloadCost:{retainedPayloadEstimateBytes:100}},verified:{fixture:true},physicalBytes:leaf.bytes??5,retainResource:()=>({release(){}}),release(){releases.push(leaf.tile_key);}};}},
  sourceContentKey:leaf=>'fixture-source:'+leaf.tile_key,resourceKey:key=>'fixture-resource:'+key,shadowMetadataReserve:()=>0,
  resourceStore:{budget:{stats:{lastPressure:undefined}}},ResourceBudgetExceededError:Error,
  prepareInlineCityMaterials,prepareC358MaterialModule,bindC358MaterialRows,
  ownerShapePatchProfile:()=>ownerProfile,manifest:{source_pbf_sha256:'pbf',city_boundary:{sha256:'boundary'},compiler_sha256:'compiler',source_snapshot:'snapshot'},manifestSHA:'manifest',
  verifyOwnerShapePatchRows:()=>events.push('verify'),ownerProfileByComponent:new WeakMap(),retainedShardCost:new WeakMap(),
  recordSourceMetrics:()=>events.push('cache'),sourceResourceCosts:()=>[]};
 const scope=new Proxy(values,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
 const js=ts.transpileModule('('+cityLoadShardSource()+')',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const loadShard=Function('scope','with(scope){return '+js+'}')(scope);
 return{loadShard:(leaf,signal)=>loadShard(leaf,signal,undefined,context),releases,adjusted,get acquireAttempts(){return attempts.count;},get loadCount(){return values.loadCount;}};
}
