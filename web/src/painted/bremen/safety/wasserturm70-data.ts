import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const WASSERTURM70_SHA="76c4a594a5b19df140c3ea21a57d86522ca2029275d324b332dda7b919fe730e";
export const WASSERTURM70_DATA_RESOURCE={"canonicalSHA256":"76c4a594a5b19df140c3ea21a57d86522ca2029275d324b332dda7b919fe730e","file":"painted/bremen/safety/wasserturm70-data.ts","occurrence":0,"codec":"json"} as const;
export function getWASSERTURM70_DATA(scope?:FrozenDataScope){if(!scope)throw Error('Frozen data scope required for WASSERTURM70_DATA');return (scope.borrow<any,any>(WASSERTURM70_DATA_RESOURCE,value=>value));}
