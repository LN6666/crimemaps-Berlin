import {expect,test} from '@playwright/test';
import {DynamicTranslations,publicTextFields,textHash} from '../src/safety/dynamic-translations';
import {unplacedStages} from '../src/safety/model';
import type {PoliceEvent} from '../src/safety/model';
const sourceSHA='a'.repeat(64),generation='0123456789abcdef-20260927T120000';
const event=(unplaced=false)=>({id:'1',source_sha256:sourceSHA,title:'Visible title',location_label:'',category:'raub',month:'2026-09',coordinates:null,location_precision:'unknown',source_url:'https://www.berlin.de/polizei/',
 source_incidents:[{incident_id:'A',details:'Stored canonical wording A',event_time:{display:'Stored canonical time A',precision:'unknown'},formal_location_ids:['place-A']},...(unplaced?[{incident_id:'B',details:'Unplaced stage details B',event_time:{display:'Unplaced stage time B',precision:'unknown'},formal_location_ids:[]}]:[])],
 scene_locations:[{scene_id:'place-A',label:'Visible scene label',role:'incident',location_precision:'unknown',geocode_method:'none',primary_for_count:false,incident_ids:['A'],incidents:[{incident_id:'A',details:'Visible scene details A',event_time:{display:'Visible scene time A',precision:'unknown'}}]}]
} as unknown as PoliceEvent);
const get=(value:any,p:string)=>p.slice(1).split('/').reduce((v,k)=>v[k],value);
async function packFor(e:PoliceEvent,extra=false){
 const paths=['/title','/scene_locations/0/label','/scene_locations/0/incidents/0/details','/scene_locations/0/incidents/0/event_time/display'];
 if(extra)paths.push('/source_incidents/1/details','/source_incidents/1/event_time/display');
 return {schema_version:1,locale:'zh',city:'berlin',month:'2026-09',source_generation:generation,texts:{},fields:await Promise.all(paths.map(async field=>({city:'berlin',source_id:'1',source_sha256:sourceSHA,field,text_sha256:await textHash(get(e,field)),translated_text:'已译：'+get(e,field)})))};
}
async function load(e:PoliceEvent,pack:any){const dyn=new DynamicTranslations();await dyn.load([e],{city:'Berlin',generation,translations:{zh:{'2026-09':'translations/zh/2026-09.json'}},metadata:{}} as any,{base:'private',json:async()=>structuredClone(pack)} as any,'2026-09','zh',new AbortController().signal,'berlin');return dyn;}
test('stored duplicate root stages do not create a translation gap when the visible scene is translated',async()=>{
 const e=event(),before=JSON.stringify(e),pack=await packFor(e),dyn=await load(e,pack);
 expect(publicTextFields([e])).not.toContain('Stored canonical wording A');
 expect(publicTextFields([e])).not.toContain('Stored canonical time A');
 expect(dyn.missing).toBe(0);expect(dyn.matched).toBe(4);
 const display=dyn.displayRows([e])[0];expect(unplacedStages(display)).toEqual([]);
 expect(display.scene_locations![0].incidents![0].details).toBe('已译：Visible scene details A');
 expect(display.source_incidents![0].details).toBe('Stored canonical wording A');
 expect(JSON.stringify(e)).toBe(before);
});
test('unplaced source stages remain visible, counted, translated and protected by their source hash',async()=>{
 const e=event(true),before=JSON.stringify(e),base=await packFor(e),partial=await load(e,base);
 expect(publicTextFields([e])).toContain('Unplaced stage details B');
 expect(partial.missing).toBe(2);expect(unplacedStages(partial.displayRows([e])[0])[0].details).toBe('Unplaced stage details B');
 const complete=await packFor(e,true),valid=await load(e,complete);
 expect(valid.missing).toBe(0);expect(unplacedStages(valid.displayRows([e])[0])[0].details).toBe('已译：Unplaced stage details B');
 const bad=structuredClone(complete);for(const field of bad.fields)if(field.field.startsWith('/source_incidents/1/')){field.source_sha256='b'.repeat(64);field.translated_text='INVALID SOURCE';}
 const reject=await load(e,bad);expect(reject.missing).toBe(2);expect(unplacedStages(reject.displayRows([e])[0])[0].details).toBe('Unplaced stage details B');
 expect(JSON.stringify(e)).toBe(before);
});
