// The page ledger module for the core-stats tests, compiled from its source.
// resource-budget.ts imports nothing, so any require is a test failure.
// CORE_STATS_BUDGET_SOURCE (absolute path) swaps the source for a negative
// control or a mutant; the default is the worktree's own module.
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const budgetFile=()=>process.env.CORE_STATS_BUDGET_SOURCE?path.resolve(process.env.CORE_STATS_BUDGET_SOURCE):path.join(web,'src/safety/render-runtime/resource-budget.ts');
export const budgetSource=()=>readFileSync(budgetFile(),'utf8');
export function loadBudgetModule(){
 const module={exports:{}},code=ts.transpileModule(budgetSource(),{fileName:budgetFile(),compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 Function('module','exports','require',code)(module,module.exports,id=>{throw new Error('Unexpected resource budget dependency '+id);});
 return module.exports;
}
