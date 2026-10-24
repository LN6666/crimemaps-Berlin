import {INFILL_C032_OFFICIAL_GLSL} from './infill-c032-official-features';
import {HANDELSHOF_BALCONIES103_GLSL} from './handelshof-balconies103-features';

/** The existing nonpartitioned Essen programme already owns the original C032 definitions. */
export const HANDELSHOF_BALCONIES104_CITY_GLSL=HANDELSHOF_BALCONIES103_GLSL.slice(INFILL_C032_OFFICIAL_GLSL.length);
const GUARD='\n if(abs(family-45530.)<.25)return handelshofBalconies103Paint(base,p,normal,frame,family);\n';
const HEADER=/vec3\s+paintedFacade\s*\(\s*vec3\s+base\s*,\s*vec3\s+p\s*,\s*vec3\s+normal\s*,\s*vec4\s+frame\s*,\s*float\s+family\s*\)\s*\{/g;

/** Wrap only facadePaintFragmentForCity's actual Essen return. No renderer/partition/pruner changes. */
export function handelshofBalconies104CityFragment(source:string,city:string){
 if(city!=='essen')return source;
 if(!HANDELSHOF_BALCONIES103_GLSL.startsWith(INFILL_C032_OFFICIAL_GLSL)||!HANDELSHOF_BALCONIES104_CITY_GLSL.includes('vec3 handelshofBalconies103Paint('))throw Error('Handelshof104 frozen helper prefix mismatch');
 const helperCount=source.split(HANDELSHOF_BALCONIES104_CITY_GLSL).length-1,guardCount=source.split(GUARD).length-1;
 if(helperCount||guardCount){if(helperCount===1&&guardCount===1)return source;throw Error('Handelshof104 partial/duplicate city injection');}
 if(source.split(INFILL_C032_OFFICIAL_GLSL).length!==2)throw Error('Handelshof104 original Essen C032 source certificate mismatch');
 const matches=[...source.matchAll(HEADER)];if(matches.length!==1)throw Error('Handelshof104 paintedFacade header certificate mismatch');
 const m=matches[0],at=m.index!;
 return source.slice(0,at)+HANDELSHOF_BALCONIES104_CITY_GLSL+'\n'+m[0]+GUARD+source.slice(at+m[0].length);
}
