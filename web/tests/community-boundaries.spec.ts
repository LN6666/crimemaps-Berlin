import {test,expect} from '@playwright/test';
import {communityReference} from '../src/safety/community-boundaries';
const feature=()=>({type:'Feature',geometry:{type:'Polygon',coordinates:[[[13,52],[14,52],[14,53],[13,53],[13,52]]]},properties:{id:'community-1',name:'Actual area',division_type:'Ortsteil',admin_level:'10',label_point:[13.5,52.5],source_url:'https://example.test/source'}});
const reference=()=>({type:'FeatureCollection',available:true,city:'berlin',division_level:'Ortsteil',source_url:'https://example.test/source',features:[feature()]});
test('community reference retains reviewed polygons and provided label anchors without counts',()=>{
 const input=reference(),before=JSON.stringify(input);const result=communityReference(input,'berlin');expect(result.available).toBe(true);
 expect(result.boundaries.features[0]).toBe(input.features[0]);expect(result.labels.features[0].geometry).toEqual({type:'Point',coordinates:[13.5,52.5]});expect(result.labels.features[0].properties.name).toBe('Actual area');expect(result.labels.features[0].properties.count).toBeUndefined();expect(JSON.stringify(input)).toBe(before);
});
test('missing, unavailable and wrong-city boundaries remain absent rather than invented',()=>{
 for(const value of [null,{}, {...reference(),available:false},{...reference(),city:'essen'},{...reference(),features:[]}]){const result=communityReference(value,'berlin');expect(result.available).toBe(false);expect(result.boundaries.features).toEqual([]);expect(result.labels.features).toEqual([]);}
});
test('unknown geometry, unclosed rings, outside and hole label anchors are rejected',()=>{
 const line:any=reference();line.features[0].geometry={type:'LineString',coordinates:[[13,52],[14,53]]};
 const unclosed=reference();unclosed.features[0].geometry.coordinates[0].pop();const outside=reference();outside.features[0].properties.label_point=[0,0];
 const hole=reference();hole.features[0].geometry.coordinates.push([[13.4,52.4],[13.6,52.4],[13.6,52.6],[13.4,52.6],[13.4,52.4]]);
 for(const value of [line,unclosed,outside,hole])expect(communityReference(value,'berlin').available).toBe(false);
 const multi:any=reference();multi.features[0].geometry={type:'MultiPolygon',coordinates:[multi.features[0].geometry.coordinates]};expect(communityReference(multi,'berlin').available).toBe(true);
});
