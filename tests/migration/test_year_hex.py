from copy import deepcopy
from collections.abc import Mapping
import hashlib
import json
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


class LazyMonths(Mapping):
    def __init__(self, keys, read):
        self.keys_in_source_order=keys
        self.read=read
        self.accessed=[]

    def __iter__(self):
        return iter(self.keys_in_source_order)

    def __len__(self):
        return len(self.keys_in_source_order)

    def __getitem__(self, month):
        assert month.startswith('2026-'), 'An unrelated year must not load its payload'
        self.accessed.append(month)
        return self.read(month)

    def items(self):
        raise AssertionError('Annual aggregation must not fetch all monthly payloads')


def test_lazy_months_load_only_selected_year_in_order_and_hash_the_complete_payload():
    source={'2026-10':payload('b'), '2026-01':payload('a')}
    # These fields do not participate in aggregation, but remain part of the
    # complete source payload receipt; a geometry/events projection is invalid.
    source['2026-01'].update(links={'original':['a']}, source_receipt={'revision':7})
    source['2026-10'].update(links={'original':['b']}, source_receipt={'revision':8})
    lazy=LazyMonths(['2027-01','2026-10','2025-12','2026-01'],
                    lambda month:deepcopy(source[month]))
    before=deepcopy(source)
    actual=aggregate_year('Berlin','g','2026',lazy)
    expected=aggregate_year('Berlin','g','2026',{
        '2027-01':None, '2026-10':source['2026-10'],
        '2025-12':None, '2026-01':source['2026-01']})
    assert lazy.accessed==['2026-01','2026-10']
    assert actual==expected
    assert actual['source_month_payload_sha256']=={
        month:hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),
                                      ensure_ascii=False).encode()).hexdigest()
        for month,value in sorted(source.items())}
    assert source==before


@pytest.mark.parametrize('failure,message', [
    ('duplicate','more than one current month'),
    ('revision','Conflicting current announcement revisions'),
    ('geometry','geometry changed'),
])
def test_lazy_months_preserve_duplicate_revision_and_geometry_refusals(failure,message):
    second=payload('a' if failure!='geometry' else 'b')
    if failure=='revision':
        second['events'][0]['category']='gewalt'
    if failure=='geometry':
        second['hex']['overview']['features'][0]['geometry']['coordinates'][0][0]=[2,2]
    source={'2026-01':payload(), '2026-02':second}
    before=deepcopy(source)
    lazy=LazyMonths(['2027-01','2026-02','2026-01'],lambda month:source[month])
    with pytest.raises(ValueError,match=message):
        aggregate_year('Berlin','g','2026',lazy)
    assert lazy.accessed==['2026-01','2026-02']
    assert source==before
