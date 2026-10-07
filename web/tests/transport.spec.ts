import {test,expect} from '@playwright/test';
import {LRU,DataClient,tileKeys} from '../src/safety/data';
import {renderPois,radiusPixelsAtZoomZero,poiCenters,styledPois} from '../src/safety/model';
const manifest:any={schema_version:2,generation:'0123456789abcdef-20261003T000000',tile_index:{pois:['bar/335_2100','bar/336_2100'],roads:[]},tile_size:[0.04,0.025],months:{'2026-09':{count:1}},categories:['gewalt']};
test('weighted cache prevents oversized records and respects recency',()=>{const c=new LRU<number>(80,10);c.set('a',1,4);c.set('b',2,4);c.get('a');c.set('c',3,4);expect(c.get('b')).toBeUndefined();c.set('oversize',4,11);expect(c.get('oversize')).toBeUndefined();expect(c.weight).toBeLessThanOrEqual(10);});
test('display circles require reviewed unchanged anchors; native geometry is untouched',()=>{const f:any={type:'Feature',properties:{id:'osm/node/1',geometry_mode:'50m_circle',boundary_clipped:false,center:[13.4,52.5],display_radius_m:50,compact_geometry_version:1},geometry:{type:'Point',coordinates:[13.4,52.5]}};const fc:any={type:'FeatureCollection',features:[f]};expect(renderPois(fc).features[0].properties.radius_px_z0).toBeCloseTo(radiusPixelsAtZoomZero(52.5,30));expect(renderPois(fc).features[0].properties.display_radius_m).toBe(30);expect(f.properties.display_radius_m).toBe(50);expect(()=>renderPois({type:'FeatureCollection',features:[{...f,properties:{...f.properties,boundary_clipped:true}}]})).toThrow();const native:any={...f,properties:{id:'native'},geometry:{type:'LineString',coordinates:[[13.4,52.5],[13.5,52.6]]}};expect(renderPois({type:'FeatureCollection',features:[native]}).features[0]).toBe(native);});
test('tile client deduplicates stable IDs and aborted calls never populate cache',async()=>{const original=globalThis.fetch;const f:any={type:'Feature',properties:{id:'osm/node/1'},geometry:{type:'Point',coordinates:[13.4,52.5]}};globalThis.fetch=async()=>new Response(JSON.stringify({type:'FeatureCollection',features:[f]}));try{const client=new DataClient(manifest);const signal=new AbortController().signal;const fc=await client.viewport('pois',[13.4,52.5,13.45,52.51],signal,['bar']);expect(fc.features).toHaveLength(1);const aborted=new AbortController();aborted.abort();await expect(client.viewport('pois',[13.4,52.5,13.45,52.51],aborted.signal,['bar'])).rejects.toThrow();expect(client.cacheStats.tiles).toBe(2);}finally{globalThis.fetch=original;}});
test('tile grid rejects invalid sizes and world view never enumerates',()=>{expect(()=>tileKeys([13,52,14,53],[0,0.025],new Set())).toThrow();expect(tileKeys([-180,-80,180,80],[0.04,0.025],new Set())).toEqual([]);});

test('cached months still respect cancellation and tiny tile sizes cannot loop',async()=>{
 const saved=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({events:[],links:[]}));
 try{const c=new DataClient(manifest);await c.month('2026-09',new AbortController().signal);const a=new AbortController();a.abort();await expect(c.month('2026-09',a.signal)).rejects.toThrow();expect(()=>tileKeys([13,52,14,53],[1e-300,0.025],new Set())).toThrow();}finally{globalThis.fetch=saved;}
});

import {DynamicTranslations,textHash} from '../src/safety/dynamic-translations';
import {unplacedStages} from '../src/safety/model';
test('translations bind field address and original hash without changing geometry or time',async()=>{
 const event:any={id:'berlin:1',source_sha256:'a'.repeat(64),title:'Original',location_label:'Same',scene_locations:[{label:'Same',details:'Detail',geometry:{type:'Point',coordinates:[13,52]},event_time:{display:'Yesterday',date:'2026-09-01',precision:'date',evidence_quote:'Original quote'},incidents:[]}]};
 const pack:any={schema_version:1,locale:'en',source_generation:manifest.generation,texts:{[await textHash('Original')]:'Translated title',[await textHash('Detail')]:'Public detail',[await textHash('Yesterday')]:'Time display'},fields:[{city:'berlin',source_id:'1',source_sha256:'a'.repeat(64),field:'/scene_locations/0/label',text_sha256:await textHash('Same'),translated_text:'Addressed scene'}]};
 const m:any={...manifest,city:'Berlin',metadata:{},translations:{en:{'2026-09':'translations/en/2026-09.json'}}};const d=new DynamicTranslations();const client:any={base:'/safety/'+manifest.generation,json:async()=>pack};await d.load([event],m,client,'2026-09','en',new AbortController().signal);const display=d.displayRows([event])[0];expect(display.title).toBe('Translated title');expect(display.location_label).toBe('Same');expect(display.scene_locations![0].label).toBe('Addressed scene');expect(display.scene_locations![0].geometry).toBe(event.scene_locations[0].geometry);expect(display.scene_locations![0].event_time?.date).toBe('2026-09-01');expect(event.scene_locations[0].label).toBe('Same');expect(d.missingFor(event)).toBe(1);
 pack.fields[0].text_sha256='b'.repeat(64);await d.load([event],m,client,'2026-09','en',new AbortController().signal);expect(d.displayRows([event])[0].scene_locations![0].label).toBe('Same');pack.native_text_hashes=[await textHash('Same')];await d.load([event],m,client,'2026-09','en',new AbortController().signal);expect(d.missingFor(event)).toBe(0);delete pack.source_generation;await expect(d.load([event],m,client,'2026-09','en',new AbortController().signal)).rejects.toThrow('Stale');pack.source_generation='0'.repeat(16)+'-20261003T000000';await expect(d.load([event],m,client,'2026-09','en',new AbortController().signal)).rejects.toThrow('Stale');
});
test('unplaced source stages remain visible and cannot become count locations',()=>{
 const a:any={incident_id:'1',details:'No place',formal_location_ids:[]};const b:any={incident_id:'2',formal_location_ids:['known']};const e:any={id:'nuremberg:1',coordinates:null,incidents:[a,b],scene_locations:[{coordinates:null,primary_for_count:false,incidents:[b]}]};expect(unplacedStages(e)).toEqual([a]);expect(e.coordinates).toBeNull();expect(e.scene_locations[0].primary_for_count).toBe(false);
});

test('display groups split a native alias without changing IDs, kind, geometry or links',async()=>{
 const before=globalThis.fetch;const geometry:any={type:'Point',coordinates:[13.4,52.5]};const features:any[]=['bar','restaurant'].map((group,i)=>({type:'Feature',properties:{id:`native/${i}`,kind:'gastronomy',scope_category:group},geometry}));
 globalThis.fetch=async()=>new Response(JSON.stringify({type:'FeatureCollection',features}));
 try{const m:any={...manifest,tile_index:{pois:['gastronomy/335_2100'],roads:[]},poi_scope_groups:{bar:{label_key:'poi.bar',kinds:['gastronomy']},restaurant:{label_key:'poi.restaurant',kinds:['gastronomy']}}};const client=new DataClient(m);const result=await client.viewport('pois',[13.4,52.5,13.41,52.51],new AbortController().signal,['bar']);expect(result.features.map(f=>f.properties.id)).toEqual(['native/0']);expect(result.features[0].properties.kind).toBe('gastronomy');expect(result.features[0].geometry).toEqual(geometry);const other=await client.viewport('pois',[13.4,52.5,13.41,52.51],new AbortController().signal,['restaurant']);expect(other.features.map(f=>f.properties.id)).toEqual(['native/1']);expect(client.cacheStats.tiles).toBe(1);}finally{globalThis.fetch=before;}
});
import {sourcePoiReferences,countableEventIds} from '../src/safety/model';
test('source POI references retain exact native geometry and cannot add count points',()=>{
 const event:any={id:'cologne:1',source_id:'1',coordinates:null,scene_locations:[]};const geometry:any={type:'Polygon',coordinates:[[[6.9,50.9],[6.91,50.9],[6.91,50.91],[6.9,50.9]]]};const reference:any={type:'Feature',id:'reference-1',geometry,properties:{source_id:'1',native_object_id:'osm/way/3',context_only:true,counts_as_crime_point:false,event_count_point:false,association_radius_m:0}};const result=sourcePoiReferences([event],{type:'FeatureCollection',features:[reference]});expect(result.features[0].geometry).toBe(geometry);expect(result.features[0].id).toBe('reference-1');expect(result.features[0].properties.id).toBe('cologne:1');expect(reference.properties.id).toBeUndefined();expect(countableEventIds([event]).size).toBe(0);expect(sourcePoiReferences([],{type:'FeatureCollection',features:[reference]}).features).toHaveLength(0);expect(()=>sourcePoiReferences([event],{type:'FeatureCollection',features:[{...reference,properties:{...reference.properties,association_radius_m:50}}]})).toThrow();
});

test('display circle shrink and centre markers preserve native inputs and skip unknown anchors',()=>{
 const circle:any={type:'Feature',properties:{id:'circle',geometry_mode:'50m_circle',center:[13,52]},geometry:{type:'Polygon',coordinates:[[[13.001,52],[13,52.001],[12.999,52],[13.001,52]]]}};
 const native:any={...circle,properties:{...circle.properties,id:'native',geometry_mode:'osm_footprint'}};
 const missing:any={...native,properties:{id:'missing',geometry_mode:'osm_footprint'}};
 const unknown:any={...native,properties:{...native.properties,id:'unknown',geometry_mode:'footprint_missing'}};
 const fc:any={type:'FeatureCollection',features:[circle,native,missing,unknown]};const before=JSON.stringify(fc);
 const displayed=renderPois(fc);expect((displayed.features[0].geometry as any).coordinates[0][0][0]).toBeCloseTo(13.0006);expect(displayed.features[1]).toBe(native);
 const centers=poiCenters(fc);expect(centers.features.map(f=>f.properties.id)).toEqual(['circle','native']);expect((centers.features[0].geometry as any).coordinates).toEqual([13,52]);expect(JSON.stringify(fc)).toBe(before);
});

test('POI fill stays visible and uniform while association metadata retains source links',()=>{
 const feature=(id:string,kind:string)=>({type:'Feature',geometry:{type:'Point',coordinates:[13.4,52.5]},properties:{id,kind}});
 const data:any={pois:{type:'FeatureCollection',features:[feature('linked','bar'),feature('neutral','bar'),feature('hidden','cafe')]},catalog:{poi_types:{bar:{color:'#123456'}}}};
 const link=(id:string)=>({event_id:id,poi_id:'linked',status:'context_named_object',source_url:'https://example.test/source',mention_basis:'source_reviewed_context_only'});
 const ids=new Set(['a','b','c']);const links=['a','b','c'].map(link);const kinds=new Set(['bar']);const before=JSON.stringify(data);
 const normal=styledPois(data,links,ids,kinds,false),highlighted=styledPois(data,links,ids,kinds,true);
 expect(normal.features.map(f=>f.properties.opacity)).toEqual([.25,.25]);expect(highlighted.features.map(f=>f.properties.opacity)).toEqual([.25,.25]);
 expect(highlighted.features.map(f=>f.properties.id)).toEqual(['linked','neutral']);expect(highlighted.features.map(f=>f.properties.center_color)).toEqual(['#0b1f34','#0b1f34']);expect(highlighted.features[1].properties.association_count).toBe(0);
 expect(styledPois(data,links,new Set(),kinds,true).features.map(f=>f.properties.opacity)).toEqual([.25,.25]);expect(JSON.stringify(data)).toBe(before);
});

test('Roman intensity bands deduplicate source links without treating numerals as report counts',()=>{
 const poi:any={type:'Feature',geometry:{type:'Point',coordinates:[13.4,52.5]},properties:{id:'p',kind:'bar',center:[13.4,52.5]}};
 const data:any={pois:{type:'FeatureCollection',features:[poi]},catalog:{poi_types:{bar:{color:'#123456'}}}};
 const link=(id:string,status:string)=>({event_id:id,poi_id:'p',status,source_url:'https://example.test/source',mention_basis:'reviewed'});
 const names=['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
 for(let n=0;n<=20;n++){
  const ids=Array.from({length:n},(_,i)=>'a'+i),links=ids.flatMap(id=>[link(id,'context_named_object'),link(id,'named_place_candidate'),link(id,'matched')]);
  const styled=styledPois(data,links,new Set(ids),new Set(['bar']),true).features[0].properties;
  const expectedLevels=[0,4,6,8,9,10,11,11,12,13,13,14,14,14,15,15,15,15,15,15,15];const expectedLevel=expectedLevels[n];
  expect(styled.association_announcement_count).toBe(n);expect(styled.association_level).toBe(expectedLevel);expect(styled.association_roman).toBe(names[expectedLevel]);
  expect(styled.count).toBe(n);expect(styled.candidate_count).toBe(n);expect(styled.context_count).toBe(n);expect(styled.association_count).toBe(n*3);expect(styled.event_ids).toHaveLength(n);expect(styled.opacity).toBe(.25);
  expect(styledPois(data,links,new Set(ids),new Set(['bar']),false).features[0].properties.association_roman).toBe(styled.association_roman);
 }
 expect(styledPois(data,[link('filtered-out','matched')],new Set(),new Set(['bar']),true).features[0].properties.association_roman).toBe('');
});
