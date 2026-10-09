import assert from 'node:assert/strict';import test from 'node:test';import {readFileSync} from 'node:fs';import {build} from 'esbuild';
const result=await build({entryPoints:[new URL('../src/safety/area-metrics.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm',target:'es2022'});
const code=result.outputFiles[0].text;
const {areaMetrics,datedMetricValue,observationPeriod}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const l={zh:'人口',en:'Population',de:'Bevölkerung'},d={zh:'常住登记人口',en:'Registered residents',de:'Gemeldete Bevölkerung'};
const m={category:'population',label:l,definition:d,value:12345,unit:'',year:2024,source_name:'Official statistics fixture',source_url:'https://example.test/statistics'};
const input=metrics=>({city:'berlin',level:'plr',areas:[{id:'01',metrics}]});
test('missing year or provenance cannot become a displayed observation',()=>{const bad=[{...m,year:undefined},{...m,source_url:''},{...m,definition:{}},{...m,value:NaN}];assert.deepEqual(areaMetrics(input(bad),'berlin','plr'),{'01':[]});});
test('statistics from another city or level are not transferred',()=>{assert.deepEqual(areaMetrics(input([m]),'hamburg','plr'),{});assert.deepEqual(areaMetrics(input([m]),'berlin','bezirk'),{});});
test('every displayed number carries its own year, with zero preserved',()=>{const got=areaMetrics(input([m,{...m,value:0,year:2023}]),'berlin','plr')['01'];assert.equal(got.length,2);assert.match(datedMetricValue(got[0],'en'),/12,345.*\(2024\)$/);assert.equal(datedMetricValue(got[1],'zh'),'0（2023）');});

test('monthly and dated observations expose valid own-year reference periods',()=>{
 assert.equal(datedMetricValue({...m,year:2026,reference_date:'2026-09'},'zh'),'12,345（2026-09）');
 assert.match(datedMetricValue({...m,year:2026,reference_date:'2026-06-30'},'en'),/\(2026-06-30\)$/);
 for(const reference_date of ['2025-06-30','2026-02-29','2026-13','2026-00','2026-04-31','2026-09-00','Schuljahr 2025/2026','<script>'])assert.equal(observationPeriod({...m,year:2026,reference_date}),'2026');
 assert.equal(observationPeriod({...m,reference_date:'2024-02-29'}),'2024-02-29');
});
