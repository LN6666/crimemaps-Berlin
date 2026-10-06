from copy import deepcopy
import pytest
from crimemapsberlin.year_hex import aggregate_year

def payload(identifier='a',cell='cell1',category='verkehr'):
    feature={'type':'Feature','geometry':{'type':'Polygon','coordinates':[[[0,0],[1,0],[1,1],[0,0]]]},'properties':{'id':cell,'edge_m':1100,'event_ids':[identifier,identifier],'count':2,'categories':{category:2},'outcomes':{'unknown':2},'approximate_count':0}}
    return {'events':[{'id':identifier,'category':category,'outcome':'unknown','location_precision':'point'}],'hex':{m:{'type':'FeatureCollection','features':[deepcopy(feature)]} for m in ['overview','detail']}}

def test_repeated_cell_references_count_one_announcement_and_preserve_geometry():
    source={'2026-01':payload()};before=deepcopy(source);result=aggregate_year('Berlin','g','2026',source)
    assert result['countable_announcement_count']==1
    assert result['hex']['overview']['features'][0]['properties']['count']==1
    assert result['hex']['overview']['features'][0]['geometry']==source['2026-01']['hex']['overview']['features'][0]['geometry']
    assert result['event_categories']=={'a':['verkehr']}
    assert source==before

def test_conflicting_geometry_for_same_cell_rejected():
    source={'2026-01':payload(),'2026-02':payload('b')};source['2026-02']['hex']['overview']['features'][0]['geometry']['coordinates'][0][0]=[2,2]
    with pytest.raises(ValueError,match='geometry changed'):aggregate_year('Berlin','g','2026',source)

def test_same_announcement_in_multiple_current_months_rejected():
    with pytest.raises(ValueError,match='more than one current month'):aggregate_year('Berlin','g','2026',{'2026-01':payload(),'2026-02':payload()})

def test_no_point_year_stays_empty_without_generated_cells():
    source=payload();source['hex']={m:{'type':'FeatureCollection','features':[]} for m in ['overview','detail']}
    result=aggregate_year('Berlin','g','2026',{'2026-10':source})
    assert result['announcement_count']==1 and result['countable_announcement_count']==0
    assert result['hex']=={'overview':{'type':'FeatureCollection','features':[]},'detail':{'type':'FeatureCollection','features':[]}}
