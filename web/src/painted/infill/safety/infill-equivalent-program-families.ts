import {BUILDING_SURFACE_FRAGMENT_GLSL} from './building-surface-style';

// Full assembled production base shaders are byte-identical for each listed
// family and its union. Keep consumer/draw identities separate from link identity.
// The non-identical Katharinen east union is deliberately excluded.
export const INFILL_EQUIVALENT_PROGRAM_GROUPS:readonly Readonly<{sourceKey:string;families:readonly number[]}>[]=Object.freeze([
 Object.freeze({sourceKey:"infill-frankfurt-low-office-bulk70",families:Object.freeze([34212, 34213, 34214, 34288, 34289, 34290, 34376, 34377, 34378])}),
 Object.freeze({sourceKey:"infill-kaiser1820-official064",families:Object.freeze([45220, 45221, 45222, 45223, 45224, 45225])}),
 Object.freeze({sourceKey:"infill-skyper",families:Object.freeze([30000, 30001, 30002, 30003])}),
 Object.freeze({sourceKey:"infill-detail70-frankfurt-deutsche-bank",families:Object.freeze([29000, 29001, 29002])}),
 Object.freeze({sourceKey:"infill-frankfurt-bockenheimer084",families:Object.freeze([34332, 34333, 34334])}),
 Object.freeze({sourceKey:"infill-commerzbank-podium-official060",families:Object.freeze([45200, 45201, 45202])}),
 Object.freeze({sourceKey:"infill-detail70-frankfurt-japan-center",families:Object.freeze([30302, 30303, 30304])}),
 Object.freeze({sourceKey:"infill-frankfurt-low-office-k26",families:Object.freeze([34356, 34357, 34358])}),
 Object.freeze({sourceKey:"infill-frankfurt-maro80",families:Object.freeze([34312, 34313, 34314])}),
 Object.freeze({sourceKey:"infill-frankfurt-maro74",families:Object.freeze([34304, 34305, 34306])}),
 Object.freeze({sourceKey:"infill-frankfurt-low-office-bulk70",families:Object.freeze([34184, 34185, 34186])}),
 Object.freeze({sourceKey:"infill-frankfurt-low-office-bulk70",families:Object.freeze([34156, 34157, 34158])}),
 Object.freeze({sourceKey:"infill-fbc",families:Object.freeze([28700, 28701, 28702])}),
 Object.freeze({sourceKey:"infill-frankfurt-low-office-batch2",families:Object.freeze([34196, 34197, 34198])}),
 Object.freeze({sourceKey:"infill-frankfurt-hausdom-official070",families:Object.freeze([45331, 45335])}),
 Object.freeze({sourceKey:"infill-frankfurt-domturm-ticket148-material070",families:Object.freeze([45336, 45337])}),
 Object.freeze({sourceKey:"infill-frankfurt-groups144146-official073",families:Object.freeze([45353, 45358])}),
 Object.freeze({sourceKey:"infill-frankfurt-junghof088",families:Object.freeze([34348, 34349])}),
 Object.freeze({sourceKey:"infill-detail70-frankfurt-hauptwache",families:Object.freeze([28401, 28402])}),
 Object.freeze({sourceKey:"infill-globaltower-official071",families:Object.freeze([45262, 45265])}),
 Object.freeze({sourceKey:"infill-frankfurt-office-principals069",families:Object.freeze([45248, 45249])}),
 Object.freeze({sourceKey:"infill-f7",families:Object.freeze([29401, 29403])}),
 Object.freeze({sourceKey:"infill-detail70-frankfurt-jw-marriott",families:Object.freeze([30500, 30501])}),
 Object.freeze({sourceKey:"infill-frankfurt-groups144146-official073",families:Object.freeze([45350, 45351])}),
 Object.freeze({sourceKey:"infill-detail70-frankfurt-myzeil",families:Object.freeze([29101, 29102])}),
 Object.freeze({sourceKey:"infill-frankfurt-vci051",families:Object.freeze([34200, 34202])}),
]);
export function sharedInfillEquivalentProgramFamilies(city:string,sourceKey:string,families:readonly number[],helper:string):readonly number[]{
 // Window/diffuse/custom helpers are not covered by this equivalence proof.
 if(city!=='frankfurt'||helper!==BUILDING_SURFACE_FRAGMENT_GLSL||!families.length)return families;
 return INFILL_EQUIVALENT_PROGRAM_GROUPS.find(group=>group.sourceKey===sourceKey&&families.every(family=>group.families.includes(family)))?.families??families;
}
