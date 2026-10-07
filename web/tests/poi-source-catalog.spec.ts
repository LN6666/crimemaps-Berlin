import {expect, test} from './fixture';

test('general source entries do not interrupt POI provenance and linked reports', async ({page}) => {
  const empty = {type:'FeatureCollection',features:[]};
  const errors:string[]=[];
  page.on('pageerror', error => errors.push(error.message));
  const poi={type:'Feature',geometry:{type:'Point',coordinates:[13.41,52.51]},properties:{
    id:'osm/node/1',kind:'bar',name:'Test Bar',geometry_mode:'50m_circle',
    source_url:'https://www.openstreetmap.org/node/1'}};
  await page.route('http://127.0.0.1:4173/safety/**', route => {
    const url=route.request().url();
    if(url.endsWith('manifest.json'))return route.fulfill({json:{
      schema_version:2,city:'Berlin',generation:'0123456789abcdef-20260927T120000',
      retrieved_at:'2026-09-27T12:00:00Z',coverage:{discovered:1,fetched:1,pending:0,failed:0},
      months:{'2026-09':{count:1}},categories:['raub'],tile_index:{pois:['bar/335_2100'],roads:[]},
      tile_size:[0.04,0.025],poi_encoding:'point-radius-v1',
      catalog:{poi_types:{bar:{color:'#d97706',label:'酒吧'}},sources:[
        {publisher:'General source',url:'https://www.berlin.de/polizei/'},
        {publisher:'String is not a type list',poi_types:'bar',url:'https://www.berlin.de/polizei/'},
        {publisher:'Police source',poi_types:['bar'],country:'DE',place:'Berlin',evidence_type:'official_announcement',url:'https://www.berlin.de/polizei/'}
      ],coverage:[],exhaustive:false},zones:{places:[],features:[],geometry_status:'pending'},metadata:{zoom_threshold:13}
    }});
    if(url.endsWith('/search.json'))return route.fulfill({json:[{id:'osm/node/1',kind:'bar',name:'Test Bar',center:[13.41,52.51]}]});
    if(url.includes('/pois/'))return route.fulfill({json:{type:'FeatureCollection',features:[poi]}});
    if(url.includes('/months/'))return route.fulfill({json:{event_ids:['1'],events:[{
      id:'1',title:'Linked announcement',category:'raub',month:'2026-09',coordinates:null,
      location_precision:'unknown',location_label:'Unknown location',poi_mentions:['bar'],source_url:'https://www.berlin.de/polizei/',outcome:'unknown'
    }],hex:{overview:empty,detail:empty},links:[{event_id:'1',poi_id:'osm/node/1',status:'context_near_geometry'}]}});
    return route.fulfill({json:empty});
  });
  await page.goto('/?lang=zh&month=2026-09');
  await expect(page.locator('#map-status')).toContainText('2026-09');
  await page.locator('#search').fill('Test Bar');
  await page.getByRole('button',{name:'Test Bar · 酒吧／酒馆',exact:true}).click();
  await expect(page.locator('#selection h2')).toHaveText('Test Bar');
  await expect(page.locator('#selection summary').filter({hasText:'1项警方来源'})).toContainText('1项警方来源');
  await expect(page.locator('#selection .report')).toContainText('Linked announcement');
  await page.locator('#selection summary').filter({hasText:'1项警方来源'}).click();
  await expect(page.locator('#selection')).toContainText('Police source');
  await expect(page.locator('#selection')).not.toContainText('General source');
  await expect(page.locator('#selection')).not.toContainText('String is not a type list');
  expect(errors).toEqual([]);
});
