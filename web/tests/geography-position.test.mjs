import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {transform} from 'esbuild';
const {code}=await transform(readFileSync(new URL('../src/safety/geography-position.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm',target:'es2022'});
const {containsPosition}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const outer=[[0,0],[10,0],[10,10],[0,10],[0,0]],hole=[[2,2],[4,2],[4,4],[2,4],[2,2]];
test('a hole does not assign a location to the surrounding area',()=>{
 const shape={type:'Polygon',coordinates:[outer,hole]};
 assert.equal(containsPosition(shape,[1,1]),true);
 assert.equal(containsPosition(shape,[3,3]),false);
 assert.equal(containsPosition(shape,[11,1]),false);
});
test('outer boundary clicks and disconnected parts remain identifiable',()=>{
 assert.equal(containsPosition({type:'Polygon',coordinates:[outer]},[0,5]),true);
 assert.equal(containsPosition({type:'Polygon',coordinates:[outer]},[0,0]),true);
 const second=outer.map(([x,y])=>[x+20,y]);
 const shape={type:'MultiPolygon',coordinates:[[outer,hole],[second]]};
 assert.equal(containsPosition(shape,[25,5]),true);
 assert.equal(containsPosition(shape,[15,5]),false);
 assert.equal(containsPosition(shape,[3,3]),false);
});
const {createAreaLookup,overviewArea}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('indexed lookup preserves holes, disconnected parts and native shared-edge ordering',()=>{
 const a={id:'native-a',geometry:{type:'Polygon',coordinates:[outer,hole]}};
 const b={id:'native-b',geometry:{type:'MultiPolygon',coordinates:[[outer.map(([x,y])=>[x+10,y])],[outer.map(([x,y])=>[x+30,y])]]}};
 const lookup=createAreaLookup([a,b]);
 assert.equal(lookup.find([3,3]),undefined);assert.equal(lookup.find([10,5]),a);
 assert.equal(lookup.find([15,5]),b);assert.equal(lookup.find([35,5]),b);
 assert.equal(lookup.find([25,5]),undefined);assert.equal(lookup.find([NaN,5]),undefined);
 assert.equal(lookup.find([0,0]),a);
});
test('overview highlighting ends at the threshold without disabling close-range identification',()=>{
 const a={geometry:{type:'Polygon',coordinates:[outer]}};const lookup=createAreaLookup([a]);
 assert.equal(overviewArea(lookup,[1,1],12.99,13),a);
 assert.equal(overviewArea(lookup,[1,1],13,13),undefined);
 assert.equal(overviewArea(lookup,[1,1],14,13),undefined);
 assert.equal(overviewArea(lookup,[1,1],12,13,false),undefined);
 assert.equal(lookup.find([1,1]),a);
});
