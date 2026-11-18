import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {C311_FIXTURE_RESOURCE} from './c311-fixture';
import {C312_FIXTURE_RESOURCE} from './c312-fixture';
import {C320_FIXTURE_RESOURCE} from './c320-fixture';
import {C322_FIXTURE_RESOURCE} from './c322-fixture';
import {PROGRESSIVE_ADMISSIONS_RESOURCE} from './progressive-paint-admissions';
import {PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE} from './progressive-feature-cities';
import {cityCohortIdentity,cityCompleteDataDemand,type CityDataIdentity} from './city-data-metadata';
import type {CityMaterialWait} from './lazy-city-material';
export type CityDataComponent=CityDataIdentity;
/** The existing table groups are atomic: source validation checks every native
 * member before the complete added group can be emitted. Selection is only a
 * conservative demand gate; it never substitutes for those original checks. */
export async function prepareCityData(components:readonly CityDataComponent[],city:string,signal:AbortSignal,scope:FrozenDataScope,wait?:CityMaterialWait):Promise<void>{
 signal.throwIfAborted();if(!components.length)return;
 const demand=cityCompleteDataDemand(components,city),refs=[];
 if(demand.some(c=>cityCohortIdentity('c311',c)))refs.push(C311_FIXTURE_RESOURCE);
 if(demand.some(c=>cityCohortIdentity('c312',c)))refs.push(C312_FIXTURE_RESOURCE);
 if(demand.some(c=>cityCohortIdentity('c320',c)))refs.push(C320_FIXTURE_RESOURCE);
 if(demand.some(c=>cityCohortIdentity('c322',c)))refs.push(C322_FIXTURE_RESOURCE);
 refs.push(PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE);
 const operation=(async()=>{await scope.prepare(refs,signal);signal.throwIfAborted();await scope.prepareSelection(PROGRESSIVE_ADMISSIONS_RESOURCE,[...new Set(demand.map(c=>(c.city??city)+'|'+c.objectId))],signal);signal.throwIfAborted();})();
 await(wait?wait(operation):operation);signal.throwIfAborted();
}
