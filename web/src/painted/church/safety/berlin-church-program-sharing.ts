/** Exact-source sharing for the ten Berlin families observed together in the live renderer. */
export const BERLIN_CHURCH_SHARED_FAMILIES=[200,201,202,203,204,205,208,209,210,211] as const;
const SHARED_KEY='current-family:200';
export function isSharedBerlinChurchFamily(key:string){return BERLIN_CHURCH_SHARED_FAMILIES.some(family=>key==='current-family:'+family);}
/** Both vertex source and bindings are common in this renderer. Compare the complete
 * submitted fragment (outer masks, lighting and reflection clipping included).
 * Retain only the boolean result in the renderer, never one string per family. */
export function berlinChurchProgramsEqual(submittedFragment:(family:number)=>string):boolean {
 const first=submittedFragment(BERLIN_CHURCH_SHARED_FAMILIES[0]);
 if(!first)return false;
 for(const family of BERLIN_CHURCH_SHARED_FAMILIES.slice(1))if(submittedFragment(family)!==first)return false;
 return true;
}
export function berlinChurchProgramKey(key:string,verifiedEqual:boolean){return verifiedEqual&&isSharedBerlinChurchFamily(key)?SHARED_KEY:key;}
