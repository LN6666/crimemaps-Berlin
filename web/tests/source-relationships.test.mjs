import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:[new URL('../src/safety/model.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false});
const {relatedSourceLinks,unplacedStages}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const relationship={source_id:'6363978',source_sha256:'a'.repeat(64),related_source_id:'6357839',related_source_url:'https://www.presseportal.de/blaulicht/pm/13248/6357839',relation:'explicit_source_link_to_previously_reported_case'};
const event={id:'6363978',source_sha256:relationship.source_sha256,public_display_fields:['source_relationships'],source_relationships:[relationship]};
test('related links require explicit display authorization and current source identity',()=>{
 assert.deepEqual(relatedSourceLinks(event),[relationship]);
 for(const changed of [{public_display_fields:[]},{source_sha256:'b'.repeat(64)},{id:'different'}])assert.deepEqual(relatedSourceLinks({...event,...changed}),[]);
});
test('unsafe schemes, unknown relations and repeated URLs do not enter the card',()=>{
 for(const changed of [{related_source_url:'javascript:alert(1)'},{related_source_url:'http://example.com/'},{relation:'guessed_same_case'}])assert.deepEqual(relatedSourceLinks({...event,source_relationships:[{...relationship,...changed}]}),[]);
 assert.equal(relatedSourceLinks({...event,source_relationships:[relationship,relationship]}).length,1);
});
test('unplaced source stages remain visible without duplicating displayed scenes',()=>{
 const located={incident_id:'case:1',formal_location_ids:['place:1']};const unknown={incident_id:'case:2',details:'Unknown investigation place',formal_location_ids:[]};
 assert.deepEqual(unplacedStages({source_incidents:[located,unknown],scene_locations:[{incidents:[located]}]}),[unknown]);
});
