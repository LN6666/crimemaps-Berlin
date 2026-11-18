import type {Identity} from '../../../safety/building-mesh-types';
export const F011_IDS=[{"city":"berlin","objectId":"osm/way/127184907","partId":"osm/way/127184907/component/ce3688bfda97580847b3","signature":"691a3c70"}];
export const ownerF011Identity=(c:Identity)=>F011_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
