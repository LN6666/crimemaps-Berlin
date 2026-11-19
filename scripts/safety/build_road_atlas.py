"""Build deterministic viewport shards for all admitted decorative OSM vehicle roads.

Supply the archived PBF and either the verified candidate mount directory or
the municipal boundary and its old road sample as ordinary JSON files. The
output contains content-addressed runtime assets and a local coverage receipt.
"""

import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import re
import tempfile

import osmium
from pyproj import Transformer
from shapely import prepare
from shapely.geometry import LineString, box, shape
from shapely.ops import transform

import scenery_focus_roads as rules

RULES = Path(rules.__file__).resolve()
PREFIX = '/safety/buildings3d/'
ROLE = 'decorative-schematic'
GRID = (0.03, 0.02)
MAX_INDEX = 64 * 1024
DRIVE_KEYS = {'highway','area','bridge','tunnel','covered','layer','height','min_height','ele','state','oneway',
              *('access','vehicle','motor_vehicle','motorcar'),*('access:conditional','vehicle:conditional','motor_vehicle:conditional','motorcar:conditional'),
              *('construction','proposed','disused','abandoned','razed'),
              *('construction:highway','proposed:highway','disused:highway','abandoned:highway','razed:highway')}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read(path):
    return json.loads(Path(path).read_bytes())


def sha(path):
    with open(path,'rb') as stream:
        return hashlib.file_digest(stream,'sha256').hexdigest()


def media_pin(path):
    return {'path': path.name, 'bytes': path.stat().st_size, 'sha256': sha(path)}


def mounted(candidate,mounts,route):
    row=mounts[route.lstrip('/')]
    root=Path(candidate['locations'][row['root']]).resolve(strict=True)
    file=(root/row['path']).resolve(strict=True)
    require(file.is_relative_to(root) and file.stat().st_size==row['bytes'] and sha(file)==row['sha256'],
            'Unbound source input: '+route)
    return file


def source_input(city, candidate_dir):
    candidate = read(candidate_dir / 'experimental-candidate.json')
    mounts = read(candidate_dir / 'experimental-mounts.json')
    require(candidate['core']['city'] == city, 'City input mismatch')
    index = read(mounted(candidate, mounts, PREFIX + 'scenery-index.json'))
    descriptor = index['data']
    route = descriptor['path']
    digest = descriptor['sha256']
    require(index['schema_version'] == 1 and index['city'] == city and index['role'] == ROLE
            and re.fullmatch(r'[0-9a-f]{64}', digest)
            and route == f'{PREFIX}scenery-{digest}.json',
            'Expected a legacy city road sample index')
    sample = mounted(candidate, mounts, route)
    require(sample.stat().st_size == descriptor['bytes'] and sha(sample) == descriptor['sha256'],
            'Legacy index does not bind its road sample')
    boundary = mounted(candidate, mounts, PREFIX + city + '/city-boundary.json')
    return sample, boundary, candidate['candidate_id']


def read_sample(city, sample_path, boundary):
    sample = read(sample_path)
    require(sample.get('schema_version') == 1 and sample.get('city') == city
            and sample.get('role') == ROLE and sample.get('partial') is True
            and isinstance(sample.get('roads'), list),
            'Expected a legacy decorative road sample for the selected city')
    require(isinstance(sample.get('source_snapshot'), str) and 0 < len(sample['source_snapshot']) <= 128
            and re.fullmatch(r'[0-9a-f]{64}', sample['source_pbf_sha256'])
            and sample['source_url'].startswith('https://'), 'Invalid legacy road source metadata')
    require(sample['city_boundary_sha256'] == sha(boundary), 'City boundary differs from current source')
    return sample


def safe_boundary(city,boundary_path):
    raw=read(boundary_path)
    require(raw['name']==rules.POI_CITY_SPECS[city].name and raw['within_expected_area'] and
            raw['id'].startswith('osm/relation/'),'Archived boundary is not the municipal source relation')
    border=shape(raw['geometry'])
    require(border.is_valid and not border.is_empty,'Invalid archived municipal boundary')
    epsg=rules.POI_CITY_SPECS[city].epsg
    to_m=Transformer.from_crs(4326,epsg,always_xy=True).transform
    from_m=Transformer.from_crs(epsg,4326,always_xy=True).transform
    safe=transform(from_m,transform(to_m,border).buffer(-5))
    require(not safe.is_empty and safe.is_valid,'Empty or invalid vehicle safety interior')
    prepare(border)
    prepare(safe)
    return border,safe,to_m,epsg


def inside_overlap(a,b):
    return a[0]<=b[2] and a[2]>=b[0] and a[1]<=b[3] and a[3]>=b[1]


def geometry_lines(geometry):
    if geometry.geom_type=='LineString':
        return (geometry,) if not geometry.is_empty else ()
    return tuple(line for part in getattr(geometry,'geoms',()) for line in geometry_lines(part))


def admitted_rows(pbf, expected, border, safe):
    require(pbf.is_file() and sha(pbf)==expected['source_pbf_sha256'],'OSM PBF differs from published source SHA')
    with osmium.io.Reader(str(pbf)) as reader:
        stamp=reader.header().get('osmosis_replication_timestamp')
    require(stamp==expected['source_snapshot'],'OSM PBF replication timestamp differs')
    extent=safe.bounds

    class Ways(osmium.SimpleHandler):
        def __init__(self):
            super().__init__()
            self.rows=[]
            self.held=Counter()
            self.classes=Counter()
            self.seen=set()
        def way(self,w):
            highway=w.tags.get('highway')
            if highway is None:
                return
            tags=dict(w.tags)
            if not rules.eligible(tags):
                self.held['ineligible_osm_highway_ways_in_extract']+=1
                return
            nodes=w.nodes
            if len(nodes)<2 or not all(node.location.valid() for node in nodes):
                self.held['eligible_tags_missing_node_positions_in_extract']+=1
                return
            points=[(node.lon,node.lat) for node in nodes]
            bounds=(min(n[0] for n in points),min(n[1] for n in points),
                    max(n[0] for n in points),max(n[1] for n in points))
            if not inside_overlap(bounds,extent):
                return
            line=LineString(points)
            if line.is_simple and safe.covers(line):
                candidates=(line,)
            else:
                candidates=geometry_lines(line.intersection(safe))
            ordinal=0
            source_tags={key:tags[key] for key in sorted(DRIVE_KEYS & tags.keys())}
            for line in candidates:
                if line.length<0.00015:
                    self.held['interior_segments_below_legacy_minimum_length']+=1
                    continue
                require(border.covers(line),'Clipped road left the municipal boundary')
                identification=f'osm/way/{w.id}/clip/{ordinal}'
                require(identification not in self.seen,'Duplicate eligible road identity: '+identification)
                self.seen.add(identification)
                self.rows.append({'id':identification,'source_way_id':w.id,
                    'coordinates':[list(c) for c in line.coords],'direction':-1 if tags.get('oneway')=='-1' else 1,
                    'source_tags':source_tags,'source_url':f'https://www.openstreetmap.org/way/{w.id}'})
                self.classes[highway]+=1
                ordinal+=1
    handler=Ways()
    handler.apply_file(str(pbf),locations=True,idx='flex_mem')
    handler.rows.sort(key=lambda row:(row['source_way_id'],int(row['id'].rsplit('/',1)[1])))
    require(bool(handler.rows),'No admitted roads')
    return handler.rows,handler.held,handler.classes


def bbox_for(cell):
    x,y=cell
    return [round(x*GRID[0],8),round(y*GRID[1],8),round((x+1)*GRID[0],8),round((y+1)*GRID[1],8)]


def route_value(data,name,directory):
    digest=hashlib.sha256(data).hexdigest()
    path=directory/f'{name}-{digest}.json'
    if path.exists():
        require(path.read_bytes()==data,'Unexpected content-address collision')
    else:
        path.write_bytes(data)
    return {'path':PREFIX+path.name,'bytes':len(data),'sha256':digest}


def compact(value):
    return json.dumps(value,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()


def build_tiles(rows,source,output):
    limits=rules.RUNTIME_LIMITS
    grouped=defaultdict(list)
    longest=0
    for row in rows:
        path=LineString(row['coordinates'])
        west,south,east,north=path.bounds
        longest=max(longest,len(row['coordinates']))
        for x in range(math.floor(west/GRID[0]),math.floor(east/GRID[0])+1):
            for y in range(math.floor(south/GRID[1]),math.floor(north/GRID[1])+1):
                cell=(x,y)
                if path.intersects(box(*bbox_for(cell))):
                    grouped[cell].append((compact(row), len(row['coordinates'])))
    old_header={k:source[k] for k in ('schema_version','city','source_snapshot','source_pbf_sha256','source_url',
                                      'city_boundary_sha256','role','partial')}
    opening=compact(old_header)[:-1]+b',"roads":['
    closing=b']}'
    entries=[]
    stats=Counter()
    for cell,batch in sorted(grouped.items()):
        pending=[]
        used=len(opening)+len(closing)
        positions=0
        def emit():
            raw=opening+b','.join(row for row,_ in pending)+closing
            require(len(raw)==used and len(raw)<=limits.bytes and len(pending)<=limits.roads and positions<=limits.positions,
                    'Leaf violates the existing v1 runtime limits')
            entries.append((cell,{'bbox':bbox_for(cell),'data':route_value(raw,'scenery-road',output)}))
            stats['leafBytes']+=used
            stats['roadMemberships']+=len(pending)
            stats['coordinateMemberships']+=positions
            stats['maxLeafRoads']=max(stats['maxLeafRoads'],len(pending))
            stats['maxLeafBytes']=max(stats['maxLeafBytes'],used)
            stats['maxLeafCoordinates']=max(stats['maxLeafCoordinates'],positions)
        for raw,points in batch:
            require(len(opening)+len(closing)+len(raw)<=limits.bytes and points<=limits.positions,'Individual route exceeds v1 bounds')
            if len(pending)==limits.roads or used+bool(pending)+len(raw)>limits.bytes or positions+points>limits.positions:
                emit()
                pending=[]
                used=len(opening)+len(closing)
                positions=0
            used+=len(raw)+bool(pending)
            positions+=points
            pending.append((raw,points))
        if pending:
            emit()
    stats['nonemptyGridCells']=len(grouped)
    stats['longestRoadCoordinateCount']=longest
    return entries,stats


def bounds_union(bboxes):
    return [min(a[0] for a in bboxes),min(a[1] for a in bboxes),
            max(a[2] for a in bboxes),max(a[3] for a in bboxes)]


def build_index(entries,source,assets):
    header={key:source[key] for key in ('city','role','source_pbf_sha256','city_boundary_sha256')}
    header={'schema_version':2,**header,'snapshot':source['source_snapshot']}
    full=[entry for _,entry in entries]
    if len(compact({**header,'tiles':full}))<=MAX_INDEX:
        return compact({**header,'tiles':full}),1
    groups=defaultdict(list)
    for (x,y),entry in entries:
        groups[(x//8,y//8)].append(entry)
    partitions=[]
    for _,group in sorted(groups.items()):
        raw=compact({**header,'tiles':group})
        require(len(raw)<=MAX_INDEX,'Viewport tile index page exceeds 64 KiB')
        partitions.append({'bbox':bounds_union([t['bbox'] for t in group]),'data':route_value(raw,'scenery-page',assets)})
    raw=compact({**header,'partitions':partitions})
    require(len(raw)<=MAX_INDEX,'Root viewport tile index exceeds 64 KiB')
    return raw,2


def sample_comparison(sample_roads,atlas_roads):
    by_way=defaultdict(list)
    watched={road['source_way_id'] for road in sample_roads}
    for road in atlas_roads:
        if road['source_way_id'] in watched:
            by_way[road['source_way_id']].append(road)
    missing_ways=sorted(watched-by_way.keys())
    require(not missing_ways,'Previously displayed source ways missing from full atlas: '+repr(missing_ways))
    matching=[]
    changed=[]
    for prior in sample_roads:
        road_id=prior['source_way_id']
        same=any(road['direction']==prior['direction'] and road['coordinates']==prior['coordinates']
                 for road in by_way[road_id])
        (matching if same else changed).append(prior['id'])
    return {'sourceWaysRetained':len(by_way),'exactDisplayPathAndDirectionCount':len(matching),
            'differentDisplayPathOrDirectionCount':len(changed),'differentDisplayPathOrDirectionIds':sorted(changed),
            'missingSourceWays':missing_ways}


def run(city, pbf, output, base, boundary, *, candidate_id=None, pbf_provenance=None):
    require(not output.exists(),'Output directory already exists')
    require(rules.library_versions()==rules.LIBRARY_PINS,'GIS library versions differ from the frozen road rules')
    sample = read_sample(city, base, boundary)
    parent=sample
    if pbf_provenance:
        variant=read(pbf_provenance)
        require(variant['region']==city and variant['sha256']==read(boundary)['source_pbf_sha256'] and
                variant['size_bytes']==pbf.stat().st_size and variant['license']=='ODbL-1.0' and
                variant['url'].startswith('https://download.geofabrik.de/'),
                'Archived PBF variant must exactly match native municipal geography source provenance')
        parent={**sample,'source_pbf_sha256':variant['sha256'],'source_snapshot':variant['pbf_timestamp'],
                'source_url':variant['url']}
    border,safe,to_m,epsg=safe_boundary(city,boundary)
    rows,held,classes=admitted_rows(pbf,parent,border,safe)
    way_ids={row['source_way_id'] for row in rows}
    comparison=sample_comparison(sample['roads'],rows)
    with tempfile.TemporaryDirectory(prefix=f'.{city}-roads-',dir=output.parent) as holder:
        result=Path(holder)/city
        assets=result/PREFIX.lstrip('/')
        assets.mkdir(parents=True)
        entries, stats=build_tiles(rows,parent,assets)
        index,levels=build_index(entries,parent,assets)
        (assets/'scenery-index.json').write_bytes(index)
        unique_coverage=verify_atlas(result,parent,rows,entries)
        proof={
          'status':'FULL_ARCHIVED_ELIGIBLE_MUNICIPAL_ROAD_ATLAS_VERIFIED','city':city,
          'source':{'pbf':media_pin(pbf),'snapshot':parent['source_snapshot'],'upstreamURL':parent['source_url'],
                    'license':'ODbL-1.0','attribution':'© OpenStreetMap contributors / Geofabrik',
                    'municipalBoundary':media_pin(boundary),'usedReleaseBaseline':candidate_id,'oldSample':media_pin(base),
                    'existingEligibilityRules':{**media_pin(RULES),'path':'scripts/safety/scenery_focus_roads.py'},'gisVersions':rules.library_versions()},
          'sampleComparison':{'snapshot':sample['source_snapshot'],'sourcePBFSHA256':sample['source_pbf_sha256'],**comparison},
          'scope':{'allEligibleSourceRows':True,'completeTrafficCoverage':False,'spatialPlacement':'within verified municipality with 5 m inward buffer',
                   'eligibleGroundLevelMotorRoads':sorted(rules.allowed),'legacyMinimumAngularLength':0.00015,
                   'epsgForBoundaryBufferAndLength':epsg,'drivingTagsOnly':True,'roadInSeveralLeavesRetainsWholePath':True,
                   'gridDegrees':list(GRID),'rejectionCounts':dict(held)},
          'counts':{'roads':len(rows),'sourceWays':len(way_ids),'coordinates':sum(len(row['coordinates']) for row in rows),
                    'eligibleLengthMetres':round(sum(transform(to_m,LineString(row['coordinates'])).length for row in rows),1),
                    'byHighway':dict(sorted(classes.items())),'oldSampleRoads':len(sample['roads']),
                    'oldSampleSourceWaysRetained':comparison['sourceWaysRetained'],'leafCount':len(entries),
                    'rootIndexBytes':len(index),'indexLevels':levels,**stats,**unique_coverage},
          'index':{'path':PREFIX+'scenery-index.json','bytes':len(index),'sha256':hashlib.sha256(index).hexdigest()},
          'published':False,
        }
        if pbf_provenance:
            proof['source']['archivedNativeSourceProvenance']=media_pin(pbf_provenance)
        (result/'coverage.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
        result.rename(output)
    return proof


def verify_atlas(stage,source,expected,entries):
    assets=stage/PREFIX.lstrip('/')
    index=read(assets/'scenery-index.json')
    seen={}
    required={row['id']:compact(row) for row in expected}
    limits=rules.RUNTIME_LIMITS
    tiles=list(index.get('tiles',()))
    require(index['schema_version']==2 and ('tiles' in index)!=('partitions' in index),'Invalid atlas root index')
    for key in ('city','role','source_pbf_sha256','city_boundary_sha256'):
        require(index[key]==source[key],'Atlas index source identity differs')
    require(index['snapshot']==source['source_snapshot'],'Atlas index timestamp differs')
    pages=0
    def inspect(binding, limit):
        path=assets/binding['path'].split('/')[-1]
        require(path.stat().st_size==binding['bytes']<=limit and sha(path)==binding['sha256'],'Atlas descriptor does not match actual file')
        return read(path)
    for page in index.get('partitions',()):
        proof=inspect(page['data'],MAX_INDEX)
        require(proof['schema_version']==2 and isinstance(proof.get('tiles'),list) and 'partitions' not in proof and
                page['bbox']==bounds_union([item['bbox'] for item in proof['tiles']]),'Atlas index page does not bind its tiles')
        for key in ('city','role','snapshot','source_pbf_sha256','city_boundary_sha256'):
            require(proof[key]==index[key],'Atlas index page source identity differs')
        tiles.extend(proof['tiles'])
        pages+=1
    require(Counter(map(compact,tiles))==Counter(compact(entry) for _,entry in entries),'Atlas index discarded or duplicated leaf descriptors')
    for entry in tiles:
        leaf=inspect(entry['data'],limits.bytes)
        require(all(leaf[key]==source[key] for key in ('schema_version','city','role','source_snapshot','source_pbf_sha256',
                'source_url','city_boundary_sha256','partial')) and len(leaf['roads'])<=limits.roads and
                sum(len(row['coordinates']) for row in leaf['roads'])<=limits.positions,'Invalid v1 data leaf')
        seen_cell=set()
        for row in leaf['roads']:
            data=compact(row)
            require(row['id'] not in seen_cell and data==required.get(row['id']) and
                    LineString(row['coordinates']).intersects(box(*entry['bbox'])),
                    'A leaf changes the source road or assigns an unrelated bbox')
            seen_cell.add(row['id'])
            seen[row['id']]=data
    require(seen==required,'The atlas discarded or changed an eligible source row')
    actual_bytes=sum(file.stat().st_size for file in assets.glob('*.json'))
    return {'indexPages':pages,'verifiedUniqueRoadRows':len(seen),'physicalBytes':actual_bytes}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('city', choices=sorted(rules.POI_CITY_SPECS))
    parser.add_argument('pbf', type=Path, help='local archived .osm.pbf file')
    parser.add_argument('output', type=Path, help='new atlas directory with an existing parent')
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument('--city-input', type=Path, help='directory with the verified candidate and mount manifests')
    inputs.add_argument('--old-sample', type=Path, help='legacy v1 schematic road sample JSON')
    parser.add_argument('--boundary', type=Path, help='archived municipal boundary JSON, required with --old-sample')
    parser.add_argument('--pbf-provenance', type=Path,
                        help='archived native PBF variant metadata if it differs from the legacy extract')
    args = parser.parse_args()
    if bool(args.boundary) != bool(args.old_sample):
        parser.error('--boundary is required with --old-sample and cannot be used with --city-input')
    if args.city_input:
        sample, boundary, candidate_id = source_input(args.city, args.city_input.resolve(strict=True))
    else:
        sample, boundary, candidate_id = args.old_sample.resolve(strict=True), args.boundary.resolve(strict=True), None
    proof = run(args.city, args.pbf.resolve(strict=True), args.output.resolve(), sample, boundary,
                candidate_id=candidate_id,
                pbf_provenance=args.pbf_provenance.resolve(strict=True) if args.pbf_provenance else None)
    print(json.dumps({'city': args.city, 'status': proof['status'], 'counts': proof['counts'], 'index': proof['index']}))


if __name__ == '__main__':
    main()
