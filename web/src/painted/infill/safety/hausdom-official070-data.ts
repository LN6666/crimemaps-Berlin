import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const HAUSDOM_OFFICIAL_SHA070="97cf135a5409422ed549882b8ef805c5bf6b3162377401e9b218b7c3d8e29c09";

export const HAUSDOM_OFFICIAL_NATIVE070={"objectId":"osm/way/147571481","partId":"osm/way/147571481/component/66d946488d017687d085","signature":"0bd0642f","origin":[8.684538799999999,50.11094775],"geometryJSON":"{\"type\":\"Polygon\",\"coordinates\":[[[8.6846079,50.1110887],[8.6846225,50.1110417],[8.6846428,50.1109824],[8.6846796,50.1108355],[8.6846876,50.1108364],[8.6846912,50.1108207],[8.684563,50.1108086],[8.6845605,50.1108138],[8.6844844,50.1108068],[8.6844601,50.1109068],[8.6844304,50.1109042],[8.684402,50.1110047],[8.6843873,50.111055],[8.6843864,50.1110595],[8.6846079,50.1110887]]]}","sourceFeatureJSON":"{\"id\":\"osm/way/147571481\",\"type\":\"Feature\",\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[8.6846079,50.1110887],[8.6846225,50.1110417],[8.6846428,50.1109824],[8.6846796,50.1108355],[8.6846876,50.1108364],[8.6846912,50.1108207],[8.684563,50.1108086],[8.6845605,50.1108138],[8.6844844,50.1108068],[8.6844601,50.1109068],[8.6844304,50.1109042],[8.684402,50.1110047],[8.6843873,50.111055],[8.6843864,50.1110595],[8.6846079,50.1110887]]]},\"properties\":{\"addr:city\":\"Frankfurt am Main\",\"addr:housenumber\":\"3\",\"addr:postcode\":\"60311\",\"addr:street\":\"Domplatz\",\"amenity\":\"community_centre\",\"building\":\"house\",\"check_date\":\"2026-01-31\",\"name\":\"Haus am Dom\",\"operator\":\"Bistum Limburg\",\"phone\":\"+49 69 80087180\",\"toilets:wheelchair\":\"yes\",\"wheelchair\":\"yes\",\"wikidata\":\"Q1590716\",\"wikimedia_commons\":\"Category:Haus am Dom\",\"wikipedia\":\"de:Haus am Dom\"}}","batchRoles":[null,null],"fingerprint":"c0f3c3185597771e","vertices":70,"indices":120} as const;

const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"97cf135a5409422ed549882b8ef805c5bf6b3162377401e9b218b7c3d8e29c09",file:"painted/infill/safety/hausdom-official070-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("hausdom-official070-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_HAUSDOM_OFFICIAL_DATA070=scopedInfillValue(()=>scope.borrow<{"batches":Array<{"color":[number,number,number];"faceRole":"wall"|"roof"|"mixed";"frames":Array<number>;"geometryRole":"SOURCE-boundary-cut-closure-on-original-official-volume-wall"|"original-official-GML-clipped-to-exact-SOURCE-roof"|"original-official-GML-clipped-to-exact-SOURCE-wall";"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;}>;},{"batches":Array<{"color":[number,number,number];"faceRole":"wall"|"roof"|"mixed";"frames":Array<number>;"geometryRole":"SOURCE-boundary-cut-closure-on-original-official-volume-wall"|"original-official-GML-clipped-to-exact-SOURCE-roof"|"original-official-GML-clipped-to-exact-SOURCE-wall";"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;}>;}>(infillOwnDataRefs[0],value=>value));

return {get HAUSDOM_OFFICIAL_DATA070(){return __infillRead_HAUSDOM_OFFICIAL_DATA070();}};
});}
export function getHAUSDOM_OFFICIAL_DATA070(scope:FrozenDataScope|undefined){return getInfillData(scope).HAUSDOM_OFFICIAL_DATA070;}
export const infillDataFunctionArities={"getHAUSDOM_OFFICIAL_DATA070":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
