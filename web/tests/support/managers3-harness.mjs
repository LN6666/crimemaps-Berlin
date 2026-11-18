// managers-3 harness: the managers-stage2 lifecycle harness (the real manager
// factory of each family with only asset reads, renderer setup and imported
// planners isolated), loaded with one change: a test may hand the manager a
// native source client built on the harness's own page store and runtime, e.g.
// the real shared native source pool, instead of the fixture client.
//
// The original file is read at load time and patched in memory (its owner keeps
// it); a missing anchor fails loudly instead of testing a stale copy. Nothing is
// written to disk.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=new URL('./',import.meta.url),web=new URL('../../',import.meta.url),require=createRequire(import.meta.url);
const original=fs.readFileSync(new URL('managers-stage2-harness.mjs',here),'utf8');
const patches=[
 ["import ts from 'typescript';","import ts from "+JSON.stringify(pathToFileURL(require.resolve('typescript')).href)+";"],
 ["from './fixtures-managers-a-runtime.mjs';","from "+JSON.stringify(new URL('fixtures-managers-a-runtime.mjs',here).href)+";"],
 ["from './resource-content-key.mjs';","from "+JSON.stringify(new URL('resource-content-key.mjs',here).href)+";"],
 ["fileURLToPath(new URL('../../',import.meta.url))",JSON.stringify(fileURLToPath(web))],
 ["nativeSources=createFixtureNativeSources({store:page.store,city:component.city,owner:provider,rows:()=>rows});",
  "nativeSources=fixtureOptions.nativeSources?fixtureOptions.nativeSources({runtime,page,component,provider}):createFixtureNativeSources({store:page.store,city:component.city,owner:provider,rows:()=>rows});"],
 // The page ledger and store the manager uses, for the tests' own accounting.
 ["return {manager,map,view,canvas,counts,states,fixture,renderer,resources,","return {page,runtime,manager,map,view,canvas,counts,states,fixture,renderer,resources,"],
];
let text=original;
for(const [anchor,replacement]of patches){
 const at=text.indexOf(anchor);
 if(at<0||text.indexOf(anchor,at+anchor.length)>=0)throw Error('managers3 harness: anchor not found exactly once in managers-stage2-harness.mjs: '+anchor.slice(0,80));
 text=text.slice(0,at)+replacement+text.slice(at+anchor.length);
}
const module=await import('data:text/javascript;base64,'+Buffer.from(text+'\n//# sourceURL=managers3-patched-stage2-harness.mjs').toString('base64'));
export const {harness,providers,createVisiblePreparationGate,tick,deferred}=module;
export const webRoot=fileURLToPath(web);
