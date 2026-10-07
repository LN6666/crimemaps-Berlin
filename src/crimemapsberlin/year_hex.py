"""Merge checked monthly hexagons, preserving geometry and announcement identity."""
from copy import deepcopy
from collections import defaultdict
import hashlib,json

def stable(value):return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False)

def aggregate_year(city, generation, year, monthly):
    cells={mode:{} for mode in ('overview','detail')}
    assignments={mode:{} for mode in cells}
    events={};event_months={};sources={}
    for month,payload in sorted(monthly.items()):
        if not month.startswith(year+'-'):continue
        sources[month]=hashlib.sha256(stable(payload).encode()).hexdigest()
        for e in payload.get('events',[]):
            identifier=str(e['id'])
            if identifier in events:
                if stable(events[identifier])!=stable(e):raise ValueError('Conflicting current announcement revisions within selected year')
                raise ValueError('An announcement occurs in more than one current month')
            events[identifier]=e;event_months[identifier]=month
        for mode in cells:
            for f in payload['hex'][mode]['features']:
                p=f['properties'];cell_id=str(p['id']);geometry=f['geometry']
                if cell_id in cells[mode] and stable(cells[mode][cell_id]['geometry'])!=stable(geometry):raise ValueError('Monthly hexagon geometry changed for the same cell')
                target=cells[mode].setdefault(cell_id,{'type':'Feature','geometry':deepcopy(geometry),'properties':deepcopy(p),'ids':set()})
                for identifier in p.get('event_ids',[]):
                    identifier=str(identifier)
                    prior=assignments[mode].get(identifier)
                    if prior is not None and prior!=cell_id:raise ValueError('An announcement would be counted in more than one annual hexagon')
                    assignments[mode][identifier]=cell_id;target['ids'].add(identifier)
    if set(assignments['overview'])!=set(assignments['detail']):raise ValueError('Annual resolutions do not contain the same announcements')
    countable=set(assignments['overview'])
    if not countable<=events.keys():raise ValueError('Annual hexagon references an absent announcement')
    hexagons={}
    for mode,collection in cells.items():
        features=[]
        for key,f in sorted(collection.items()):
            ids=sorted(f.pop('ids'));p=f['properties'];p['event_ids']=ids;p['count']=len(ids);p['categories']={};p['outcomes']={};p['approximate_count']=0
            for identifier in ids:
                e=events[identifier];cat=e['category'];outcome=e.get('outcome','unknown');p['categories'][cat]=p['categories'].get(cat,0)+1;p['outcomes'][outcome]=p['outcomes'].get(outcome,0)+1
                if e.get('location_precision')=='approximate':p['approximate_count']+=1
            if ids:features.append(f)
        hexagons[mode]={'type':'FeatureCollection','features':features}
    return {'schema_version':1,'city':city,'source_generation':generation,'year':year,'count_unit':'one_checked_announcement_at_most_once_per_year','year_basis':'existing_saved_announcement_months_not_a_new_incident_date_inference','announcement_count':len(events),'countable_announcement_count':len(countable),'countable_event_ids':sorted(countable),'event_months':{i:event_months[i] for i in sorted(countable)},'event_categories':{i:[events[i]['category']] for i in sorted(countable)},'hex':hexagons,'source_month_payload_sha256':sources,'new_coordinates_or_primary_points_created':False}

def write_year_archives(root,manifest,monthly):
    from pathlib import Path
    root=Path(root);(root/'years').mkdir(exist_ok=True);manifest['years']={}
    for year in sorted({m[:4] for m in monthly}):
        value=aggregate_year(manifest['city'],manifest['generation'],year,monthly);target=root/'years'/f'{year}.json';target.write_text(stable(value)+'\n')
        manifest['years'][year]={'path':f'years/{year}.json','announcement_count':value['announcement_count'],'countable_announcement_count':value['countable_announcement_count'],'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    return manifest
