import type {Identity} from '../../../safety/building-mesh-types';
export const F017_IDS=[{"city":"berlin","objectId":"osm/way/18578139","partId":"osm/way/18578139/component/34042660390634af5ee3","signature":"34ce6e8e"},{"city":"berlin","objectId":"osm/way/133885752","partId":"osm/way/133885752/component/1bb9437084dca85fcbc3","signature":"eab8d315"}];
export const ownerF017Identity=(c:Identity)=>F017_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
