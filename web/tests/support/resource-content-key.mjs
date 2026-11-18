import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source=fs.readFileSync(new URL('../../src/safety/resource-content-key.ts',import.meta.url),'utf8'),module={exports:{}};
Function('exports',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(module.exports);
export const resourceContentKeys=module.exports;
export const {resourceContentKey}=resourceContentKeys;

/** Test-only inverse: assertions inspect every encoded authority and row, not
 * merely a hash or a substring. Product ingress JSON protocols stay unchanged. */
export function decodeResourceContentKey(key){
 const prefix='resource-content-key:v1:';assert(key.startsWith(prefix));let offset=prefix.length;
 function read(){
  const tag=key[offset++],colon=key.indexOf(':',offset);assert(colon>=offset);const count=Number(key.slice(offset,colon));assert(Number.isSafeInteger(count)&&count>=0);offset=colon+1;
  if(tag==='a')return Array.from({length:count},read);
  assert(tag==='s'||tag==='j');assert(offset+count<=key.length);const text=key.slice(offset,offset+count);offset+=count;return tag==='s'?text:JSON.parse(text);
 }
 const result=read();assert.equal(offset,key.length);return result;
}
