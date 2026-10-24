import {BE_TV_BASE_REPAIR_GLSL,BE_TV_BASE_REPAIR_GLSL_SHA256} from './be-tv-base-repair-glsl';
export const TV_BASE_REPAIR_PROGRAM_KEY='tv-base-repair-213';
export const TV_BASE_REPAIR_ENTRY="vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return beTVBaseRepair1(base,p,normal,frame,family);}";
export const tvBaseRepairProgramFamily=(family:number)=>[21301,21302,21303,21304,21305,21306,21307,21308,21309,21310].includes(Math.round(family));
export const tvBaseRepairProgramReady1=(fragment:string)=>BE_TV_BASE_REPAIR_GLSL_SHA256==="4928f069a999acf3fcfdda7b2e6deb46b39050cd0ea3b5657a8a294cce1664a9"&&fragment.includes(BE_TV_BASE_REPAIR_GLSL)&&fragment.includes(TV_BASE_REPAIR_ENTRY);
