import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:[new URL('../src/safety/viewport-render-data.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {viewportRenderData}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const point=(id,x,y)=>({type:'Feature',id,geometry:{type:'Point',coordinates:[x,y]},properties:{id,source:'unchanged'}});
const collection=features=>({type:'FeatureCollection',features});
test('full annual inputs stay intact; screen transfers reuse exact source objects',()=>{
 const a=point('a',13.4,52.5),b=point('b',13.7,52.6),source=collection([a,b]),original=JSON.stringify(source);
 const first=viewportRenderData(source,[13.39,52.49,13.41,52.51]);
 assert.deepEqual(first.features,[a]);assert.equal(first.features[0],a);assert.equal(JSON.stringify(source),original);
 const panned=viewportRenderData(source,[13.69,52.59,13.71,52.61]);assert.deepEqual(panned.features,[b]);
 assert.equal(viewportRenderData(source,[13,52,14,53]),source);
});
test('crossing lines and polygons survive without any vertex inside the view',()=>{
 const line={type:'Feature',geometry:{type:'LineString',coordinates:[[0,5],[10,5]]},properties:{}},
 polygon={type:'Feature',geometry:{type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]]]},properties:{}};
 assert.deepEqual(viewportRenderData(collection([line,polygon,point('outside',30,30)]),[4,4,6,6]).features,[line,polygon]);
});
test('margin, multipart geometry and conservative fallback prevent edge losses',()=>{
 const edge=point('edge',6.4,5),multi={type:'Feature',geometry:{type:'MultiPolygon',coordinates:[[[[0,0],[1,0],[1,1],[0,0]]],[[[5,5],[6,5],[6,6],[5,5]]]]},properties:{}},unknown={type:'Feature',geometry:{type:'GeometryCollection',geometries:[]},properties:{}};
 const source=collection([edge,multi,unknown,point('far',40,40)]);
 assert.deepEqual(viewportRenderData(source,[4,4,6,6]).features,[edge,multi,unknown]);
 assert.equal(viewportRenderData(source,[170,0,-170,10]),source);
});
