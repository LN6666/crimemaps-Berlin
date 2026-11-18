import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createExpression} from '@maplibre/maplibre-gl-style-spec';

const built=await build({entryPoints:[new URL('../src/safety/osm-click-inspection.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {installOsmClickInspection}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function fixture(){
 const layers=new Map(),sources=new Map();
 const map={addSource(id,initial){sources.set(id,{data:initial.data,setData(data){this.data=data;}});},getSource:id=>sources.get(id),removeSource:id=>sources.delete(id),
  addLayer:layer=>layers.set(layer.id,layer),getLayer:id=>layers.get(id),removeLayer:id=>layers.delete(id)};
 const inspection=installOsmClickInspection(map,'en',()=>{});
 return{inspection,layers,sources,get feature(){return sources.get('osm-click-inspection').data.features[0];}};
}
function value(expression,feature){
 if(!Array.isArray(expression))return expression;
 const compiled=createExpression(expression,'layers[0].paint');
 assert.equal(compiled.result,'success',JSON.stringify(compiled.value));
 return compiled.value.evaluate({zoom:18},{type:feature.geometry.type==='Point'?1:3,properties:feature.properties});
}
const feature=geometry=>({type:'Feature',geometry,properties:{id:'osm/node/42',color:'#ef59b7',center_color:'#ef59b7'}});

test('selected POI point keeps the category underneath two hollow contrasting rings',()=>{
 const f=fixture(),point=feature({type:'Point',coordinates:[13,52]}),before=JSON.stringify(point);
 f.inspection.highlight(point,{preserveCategoryColor:true});
 assert.deepEqual(f.feature.geometry,point.geometry);assert.equal(JSON.stringify(point),before);
 const rings=[...f.layers.values()].filter(layer=>layer.type==='circle');
 assert.equal(rings.length,2);
 for(const ring of rings){
  assert.equal(value(ring.filter,f.feature),true);
  assert.equal(value(ring.paint['circle-opacity'],f.feature),0,'selection cannot repaint the category centre');
  assert(value(ring.paint['circle-stroke-width'],f.feature)>0);
 }
 assert.notEqual(value(rings[0].paint['circle-stroke-color'],f.feature),value(rings[1].paint['circle-stroke-color'],f.feature));
 assert(value(rings[0].paint['circle-radius'],f.feature)>value(rings[1].paint['circle-radius'],f.feature));
 f.inspection.destroy();assert.equal(f.layers.size,0);assert.equal(f.sources.size,0);
});

test('selected POI footprint retains its original geometry and transparent selection fill',()=>{
 const f=fixture(),polygon=feature({type:'Polygon',coordinates:[[[13,52],[13.1,52],[13.1,52.1],[13,52]]]});
 const before=JSON.stringify(polygon);
 f.inspection.highlight(polygon,{preserveCategoryColor:true});
 assert.equal(value(f.layers.get('osm-click-inspection-fill').paint['fill-opacity'],f.feature),0);
 assert.deepEqual(f.feature.geometry,polygon.geometry);
 for(const layer of f.layers.values())if(layer.type==='line')assert.equal(value(layer.filter,f.feature),true);
 assert.equal(JSON.stringify(polygon),before);
 f.inspection.destroy();
});

test('generic inspection retains gold styling and switching selection never accumulates layers or features',()=>{
 const f=fixture(),point=feature({type:'Point',coordinates:[13,52]});
 for(let i=0;i<100;i++)f.inspection.highlight(point,{preserveCategoryColor:i%2===0});
 assert.equal(f.layers.size,5);assert.equal(f.sources.get('osm-click-inspection').data.features.length,1);
 assert.deepEqual(f.feature.properties,{});
 const pointLayer=f.layers.get('osm-click-inspection-point');
 assert.equal(value(pointLayer.paint['circle-opacity'],f.feature),1);
 assert.equal(value(pointLayer.paint['circle-color'],f.feature),'#e2bd55');
 assert.equal(value(f.layers.get('osm-click-inspection-point-outline').filter,f.feature),false);
 assert.equal(value(f.layers.get('osm-click-inspection-fill').paint['fill-opacity'],f.feature),.22);
 f.inspection.clear();assert.equal(f.sources.get('osm-click-inspection').data.features.length,0);
 f.inspection.destroy();assert.equal(f.layers.size,0);assert.equal(f.sources.size,0);
});
