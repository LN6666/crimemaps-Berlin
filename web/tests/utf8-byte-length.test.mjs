import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const built=await build({entryPoints:[new URL('../src/safety/utf8-byte-length.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const {utf8ByteLength}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const encoder=new TextEncoder();
const matchesEncoder=value=>assert.equal(utf8ByteLength(value),encoder.encode(value).byteLength,JSON.stringify(value));

test('UTF-8 byte length matches TextEncoder for ASCII and multibyte text',()=>{
 for(const value of ['', '\0\t\n ASCII shader {}', '\u007f\u0080\u07ff\u0800\uffff', 'Grüße 中文 引用'])matchesEncoder(value);
});

test('UTF-8 byte length counts paired emoji and supplementary boundary characters once',()=>{
 for(const value of ['😀', 'paint😀roof🧱', '\ud800\udc00', '\udbff\udfff', '😀😀'])matchesEncoder(value);
});

test('UTF-8 byte length replaces lone and interleaved surrogates like TextEncoder',()=>{
 for(const value of ['\ud800', '\udfff', '\ud800x', 'x\udc00', '\ud800\ud800\udc00', '\udc00\ud800\udc00', '\udbff\ud800', '中\ud800😀\udfff文'])matchesEncoder(value);
});
