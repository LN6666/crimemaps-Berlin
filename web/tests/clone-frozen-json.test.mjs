import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:[new URL('../src/safety/clone-frozen-json.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {cloneFrozenJSON}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

test('verified JSON preserves exact scalar values and every mutable container is private',()=>{
 const source=JSON.parse('{"coordinates":[[-0,53.0793],[8.8017,0.000000000000001]],"name":"Straße\\ud800","flags":[true,false,null],"nested":{"items":[{"id":"a"},{"id":"b"}]}}');
 const first=cloneFrozenJSON(source),second=cloneFrozenJSON(source);
 assert.deepEqual(first,structuredClone(source));assert.deepEqual(second,source);
 assert(Object.is(first.coordinates[0][0],-0));
 function privateContainers(a,b){if(a===null||typeof a!=='object')return;assert.notStrictEqual(a,b);for(const key of Object.keys(a))privateContainers(a[key],b[key]);}
 privateContainers(source,first);privateContainers(first,second);
 first.coordinates[0][0]=12;first.nested.items[0].id='changed';first.flags.push('new');
 assert(Object.is(source.coordinates[0][0],-0));assert.equal(second.nested.items[0].id,'a');assert.equal(second.flags.length,3);
});

test('JSON prototype-looking keys stay ordinary own data properties',()=>{
 const source=JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":[1]},"toString":"literal"}');
 const copied=cloneFrozenJSON(source);
 assert.deepEqual(copied,structuredClone(source));assert.equal(Object.getPrototypeOf(copied),Object.prototype);
 assert.equal(Object.hasOwn(copied,'__proto__'),true);assert.equal(copied.polluted,undefined);
 assert.deepEqual(Object.getOwnPropertyDescriptor(copied,'__proto__'),{value:{polluted:true},enumerable:true,configurable:true,writable:true});
 copied.__proto__.polluted=false;assert.equal(source.__proto__.polluted,true);
});

test('non-JSON runtime values and nesting beyond the admitted payload bound are refused',()=>{
 for(const value of [undefined,()=>{},new Date(),new Float32Array([1]),new Map(),Object.create(null),[undefined]])assert.throws(()=>cloneFrozenJSON(value),/parsed JSON/);
 let atLimit=1;for(let i=0;i<40;i++)atLimit=[atLimit];assert.deepEqual(cloneFrozenJSON(atLimit),atLimit);
 assert.throws(()=>cloneFrozenJSON([atLimit]),/nesting exceeds bound/);
 const cyclic={};cyclic.self=cyclic;assert.throws(()=>cloneFrozenJSON(cyclic),/nesting exceeds bound/);
});
