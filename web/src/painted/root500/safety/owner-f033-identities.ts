import type {Identity} from './building-mesh-renderer';
export const F033_IDS=[{"city":"berlin","objectId":"osm/way/1552506881","partId":"osm/way/1552506881/component/4bb351cda7733c563047","signature":"c0f8c0d4"},{"city":"berlin","objectId":"osm/way/43347597","partId":"osm/way/43347597/component/eb2dc6c6c3ed15f14e46","signature":"f5d60d34"},{"city":"berlin","objectId":"osm/way/1552506882","partId":"osm/way/1552506882/component/8375b8e5f9a97c6ab4b1","signature":"d026166c"}];
export const ownerF033Identity=(c:Identity)=>F033_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
