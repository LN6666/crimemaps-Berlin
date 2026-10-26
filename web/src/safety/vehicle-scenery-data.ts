export type SceneryRoad={id:string;source_way_id:number;coordinates:[number,number][];direction:1|-1;source_tags:Record<string,string>;source_url:string};
export type VehicleScenery={schema_version:1;city:string;source_snapshot:string;source_pbf_sha256:string;source_url:string;city_boundary_sha256:string;role:'decorative-schematic';roads:SceneryRoad[];partial:true};
const CAR_HIGHWAYS=new Set(['motorway','trunk','primary','secondary','tertiary','unclassified','residential','living_street','motorway_link','trunk_link','primary_link','secondary_link','tertiary_link']);
const OPEN_ACCESS=new Set(['','yes','permissive','designated']);
const inactive=new Set(['construction','proposed','disused','abandoned','razed']);
export function carRoadEligible(tags:Record<string,unknown>):boolean{
 if(!CAR_HIGHWAYS.has(String(tags.highway))||tags.area==='yes')return false;
 for(const flag of ['bridge','tunnel','covered'])if(tags[flag]!==undefined&&!['no','false','0',''].includes(String(tags[flag])))return false;
 if(tags.layer!==undefined&&!['0',''].includes(String(tags.layer)))return false;
 if(tags.height!==undefined||tags.min_height!==undefined||tags.ele!==undefined)return false;
 for(const tag of ['access','vehicle','motor_vehicle','motorcar']){if(tags[tag]!==undefined&&!OPEN_ACCESS.has(String(tags[tag]).trim().toLowerCase()))return false;if(tags[tag+':conditional']!==undefined)return false;}
 if(tags.oneway!==undefined&&!['yes','no','1','-1','true','false','0',''].includes(String(tags.oneway)))return false;
 for(const state of inactive)if(tags[state]!==undefined&&!['no','false','0',''].includes(String(tags[state]))||tags[state+':highway']!==undefined&&!['no','false','0',''].includes(String(tags[state+':highway'])))return false;
 return !inactive.has(String(tags.state));
}
export function parseVehicleScenery(value:unknown,city:string):VehicleScenery{
 const v=value as VehicleScenery;if(!v||v.schema_version!==1||v.city!==city||v.role!=='decorative-schematic'||v.partial!==true||typeof v.source_snapshot!=='string'||v.source_snapshot.length>128||!/^[a-f0-9]{64}$/.test(v.source_pbf_sha256)||!/^[a-f0-9]{64}$/.test(v.city_boundary_sha256)||typeof v.source_url!=='string'||!v.source_url.startsWith('https://')||!Array.isArray(v.roads)||v.roads.length>4096)throw Error('Invalid vehicle scenery');let points=0;const seen=new Set<string>();
 for(const road of v.roads){if(!road||!/^osm\/way\/[1-9]\d*\/clip\/[0-9]+$/.test(road.id)||road.id.split('/')[2]!==String(road.source_way_id)||seen.has(road.id)||!Number.isSafeInteger(road.source_way_id)||road.source_way_id<1||![1,-1].includes(road.direction)||road.source_url!=='https://www.openstreetmap.org/way/'+road.source_way_id||!road.source_tags||!carRoadEligible(road.source_tags)||!Array.isArray(road.coordinates)||road.coordinates.length<2)throw Error('Invalid drivable source road');seen.add(road.id);for(const p of road.coordinates)if(++points>100000||!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>85)throw Error('Invalid scenery source position');if(['yes','1','true'].includes(road.source_tags.oneway)&&road.direction!==1||road.source_tags.oneway==='-1'&&road.direction!==-1)throw Error('Vehicle direction differs from source oneway');}
 return v;
}
export const vehicleSceneryLimits={desktop:48,mobile:12,desktopFPS:10,mobileFPS:6,maxRoads:4096,maxPositions:100000,maxBytes:1024*1024} as const;
