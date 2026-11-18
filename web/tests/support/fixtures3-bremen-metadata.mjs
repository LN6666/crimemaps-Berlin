// Real Bremen demand/identity metadata modules for fixtures that evaluate Bremen
// runtime sources against a hand-written require map. Since 24c2bda (Prepare
// Bremen models and certificates by actual component demand) the certificate,
// runtime and data modules import these pure metadata modules; a fixture binds
// the actual ones instead of a stand-in. The caller's own bremen-ag70-metadata
// instance is shared, so EDGE70_RESOURCE stays the same object everywhere.
import {createSourceModules} from './fixtures-managers-b-source-modules.mjs';

const METADATA=['bremen-ag70-identities','bremen-ag70-metadata','bremen-demand-metadata','bremen-identity-metadata','bremen-identity-projections','bremen-recipe-demand'].map(name=>'painted/bremen/safety/'+name);

/** Relative specifier (as a Bremen safety module imports it) -> actual module exports. */
export function bremenMetadataModules(ag70Metadata){
 const modules=createSourceModules({overrides:ag70Metadata?{'painted/bremen/safety/bremen-ag70-metadata':ag70Metadata}:{},allow:id=>METADATA.includes(id)});
 return Object.fromEntries(METADATA.map(id=>['./'+id.split('/').at(-1),modules.load(id)]));
}
