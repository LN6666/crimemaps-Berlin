import type {Identity} from '../../../safety/building-mesh-types';
export const F016_IDS=[{"city":"berlin","objectId":"osm/way/175464203","partId":"osm/way/175464203/component/9a504052436e63921943","signature":"f6b4995b"},{"city":"berlin","objectId":"osm/way/237687067","partId":"osm/way/237687067/component/cd7ae4300ae2d553152c","signature":"19587c60"},{"city":"berlin","objectId":"osm/way/237687068","partId":"osm/way/237687068/component/4f1f9115b0ba6cae0f7f","signature":"71d8ffbf"}];
export const ownerF016Identity=(c:Identity)=>F016_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
