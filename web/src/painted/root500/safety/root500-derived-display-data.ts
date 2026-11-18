import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {repositoryCity} from '../../../safety/deployment';
import type {BuildingComponent} from '../../../safety/building-mesh-types';
import {root500DataRefs as f068Refs,prepareRoot500Data as prepareF068,getRoot500Data as getF068} from './owner-f068-derived-pack';
import {root500DataRefs as f075Refs,prepareRoot500Data as prepareF075,getRoot500Data as getF075} from './owner-f075-derived-pack';
import {root500DataRefs as f082Refs,prepareRoot500Data as prepareF082,getRoot500Data as getF082} from './owner-f082-derived-pack';
import {root500DataRefs as f107Refs,prepareRoot500Data as prepareF107,getRoot500Data as getF107} from './owner-f107-derived-pack';
import {mayMatchF068DerivedAdmission,type F068DerivedAdmission} from './owner-f068-derived-display';
import {mayMatchF075DerivedAdmission} from './owner-f075-derived-display';
import {mayMatchF082DerivedAdmission} from './owner-f082-derived-display';
import {mayMatchF107DerivedAdmission} from './owner-f107-derived-display';

export const root500DataRefs=[...f068Refs,...f075Refs,...f082Refs,...f107Refs] as const;
export const root500DataFunctionArities={} as const;
export const mayMatchRoot500Data=(components:readonly BuildingComponent[])=>components.some(c=>c.city==='munich');
export async function prepareRoot500Data(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope){
 signal.throwIfAborted();
 if(!mayMatchRoot500Data(components))return;
 await prepareF068(components,signal,scope);
 await prepareF075(components,signal,scope);
 await prepareF082(components,signal,scope);
 await prepareF107(components,signal,scope);
 signal.throwIfAborted();
}

/** Exact original display-only admission is demand, even with no native rows.
 * These four existing packs remain the authorized resource granularity; no
 * incomplete native identity list is used to reject a derived display.
 */
export async function prepareRoot500DerivedDisplays(components:readonly BuildingComponent[],city:string,admission:F068DerivedAdmission|undefined,signal:AbortSignal,scope:FrozenDataScope){
 signal.throwIfAborted();
 void components;
 if(mayMatchF068DerivedAdmission(city,admission)){await scope.prepare(f068Refs,signal);signal.throwIfAborted();getF068(scope);}
 if(mayMatchF075DerivedAdmission(city,admission)){await scope.prepare(f075Refs,signal);signal.throwIfAborted();getF075(scope);}
 if(repositoryCity==='munich'&&mayMatchF082DerivedAdmission(city,admission)){await scope.prepare(f082Refs,signal);signal.throwIfAborted();getF082(scope);}
 if(mayMatchF107DerivedAdmission(city,admission)){await scope.prepare(f107Refs,signal);signal.throwIfAborted();getF107(scope);}
}
