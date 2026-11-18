// The actual per-building delegated500 paint fragment functions that the
// delegated wrapper table (delegated-shader-budget.ts) applies, for suites
// that run the delegated renderer's Berlin colour chain (program-preparation's
// actual renderer block).
//
// support/f5prog-delegated-colour.mjs binds these names to functions that
// throw ("fixture does not load delegated paint fragment ..."), because their
// modules sit beside data modules that reach the frozen paint tables. The
// fragment functions themselves are pure source transforms; this loader
// bundles exactly the fragment modules the wrapper table imports (named from
// delegated-shader-budget.ts's own import list) with esbuild, so every wrapper
// probe and every built source uses the production fragment code.
//
// Only frozen-paint-tables.ts is replaced, the same way the Tier300
// specialization suite bundles its scoped data modules: row counts are empty
// and any table read throws, so a path that would need frozen paint data fails
// visibly instead of reading a substitute.
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const web=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(path.join(web,'package.json')),{build}=require('esbuild');
const BUDGET_FILE='src/painted/delegated500/safety/delegated-shader-budget.ts';
const FROZEN_TABLES_STUB=[
 'export function frozenPaintTableRowCounts(){return {};}',
 'const unloaded=name=>()=>{throw Error("fixture does not load frozen paint tables: "+name);};',
 'export const readFrozenTable=unloaded("readFrozenTable"),readFrozenTableAsync=unloaded("readFrozenTableAsync");',
].join('\n');

let loaded;

/** The fragment functions (lower-case value imports of the budget module's
 * sibling fragment modules), keyed by their local import names. */
export async function loadDelegatedPaintFragments(){
 if(loaded)return loaded;
 const text=await readFile(path.join(web,BUDGET_FILE),'utf8'),entries=[];
 for(const match of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\/([^']+)'/g)){
  if(match[2]==='berlin-distant-paint')continue;
  const names=match[1].split(',').map(name=>name.trim()).filter(name=>/^[a-z][A-Za-z0-9]*$/.test(name));
  if(names.length)entries.push({module:match[2],names});
 }
 if(!entries.length)throw Error('f6prog-delegated-fragments: the wrapper table imports no fragment modules');
 const contents=entries.map(entry=>'export {'+entry.names.join(',')+'} from '+JSON.stringify('./'+path.join(path.dirname(BUDGET_FILE),entry.module+'.ts'))+';').join('\n');
 const output=await build({stdin:{contents,resolveDir:web,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent',
  plugins:[{name:'f6prog-no-frozen-paint-tables',setup(b){b.onResolve({filter:/frozen-paint-tables$/},args=>({path:args.path,namespace:'f6prog-frozen-tables'}));b.onLoad({filter:/.*/,namespace:'f6prog-frozen-tables'},()=>({contents:FROZEN_TABLES_STUB,loader:'js'}));}}]});
 const module=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].contents).toString('base64'));
 const fragments={};
 for(const {names}of entries)for(const name of names){if(typeof module[name]!=='function')throw Error('f6prog-delegated-fragments: '+name+' is not a fragment function');fragments[name]=module[name];}
 loaded=Object.freeze(fragments);
 return loaded;
}
