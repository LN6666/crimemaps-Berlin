import {BE_PAUL_LOBE_GLSL} from './be-paul-lobe-glsl';
import {specializeCurrentPaintFragment} from './current-paint-program';

/** One source-bound material cohort, not a generic fallback for painted buildings.
 * The 15 Paul-Löbe families share this same material; family is unused in its body.
 * Native/owner geometry and every outer clipping/light/selection pass stay intact. */
export const BERLIN_DISTANT_PAUL_LOBE_KEY='berlin-distant:paul-lobe-v1';
export const BERLIN_DISTANT_PAUL_LOBE_FAMILY=19401;
export function berlinDistantFamily(key:string):number|undefined{
 if(!key.startsWith('current-family:'))return undefined;
 const family=Number(key.slice(15));
 return Number.isInteger(family)&&family>=19401&&family<=19415?family:undefined;
}
/** Exact equality of the fully assembled fragment, including the current outer
 * main/masks and helper. Check this finite cohort once, retain only the boolean.
 * A future repair changing one family automatically falls back to separate keys. */
export function berlinPaulLobeProgramsEqual(assembled:string){
 const reference=specializeCurrentPaintFragment(assembled,19401);
 for(let family=19402;family<=19415;family++)if(specializeCurrentPaintFragment(assembled,family)!==reference)return false;
 return true;
}
export function berlinPaulLobeRichKey(baseKey:string,shared:boolean){return shared&&berlinDistantFamily(baseKey)!==undefined?'current-family:19401':baseKey;}
const route='return bePaulLobe1(base,p,normal,frame,family);';
const signature='vec3 paintedFacade(';
const edits:readonly(readonly[string,string])[]=[
 ['vec3 bePaulLobe1(', 'vec3 bePaulLobeDistant1('],
 ['if(role==7.){float joint=bePLHRepeat1(y,3.25,.025);float casting=bePLHRepeat1(y-1.60,3.25,.012);return mix(concrete*(1.-.035*joint),concrete*.83,casting*.15);}', 'if(role==7.)return concrete;'],
 ['if(role==3.){float joint=max(bePLHRepeat1(x,4.2,.018),bePLHRepeat1(z,4.2,.018));return mix(concrete,vec3(.59,.61,.58),joint*.38);}', 'if(role==3.)return concrete;'],
 ['float glazingBar=max(bePLHRepeat1(x,1.4,.028),bePLHRepeat1(z,1.7,.028));panel=mix(panel,vec3(.52,.57,.55),glazingBar*.6);float gasket=max(bePLHRepeat1(x-.065,1.4,.012),bePLHRepeat1(z-.065,1.7,.012));panel=mix(panel,vec3(.21,.29,.31),gasket*.38);float cells=bePLHRepeat1(x,.35,.007)*bePLHRepeat1(z,.425,.007);panel=mix(panel,vec3(.40,.48,.48),cells*solar*.17);vec3 roof=mix(panel,concrete,beam);float contact=max(bePLHRepeat1(x-.20,4.2,.023),bePLHRepeat1(z-.19,3.4,.023));return mix(roof,concrete*.68,contact*.32);', 'return mix(panel,concrete,beam);'],
 ['float rail=max(bePLHLine1(y-7.8,.045),bePLHLine1(y-15.3,.045));vec3 c=mix(glass,concrete,max(posts,bands));c=mix(c,vec3(.56,.62,.60),rail*.7);float cap=bePLHRepeat1(x-.18,3.1,.022);c=mix(c,vec3(.43,.49,.48),cap*.60);float inset=max(bePLHLine1(y-7.24,.040),max(bePLHLine1(y-14.74,.040),bePLHLine1(y-22.32,.040)));return mix(c,concrete*.62,inset*.48);', 'return mix(glass,concrete,max(posts,bands));'],
 ['float sill=bePLHRepeat1(y-.48,3.2,.055);c=mix(c,concrete*.76,sill*frame*.55);float reveal=max(0.,bePLHBox1(q,vec2(.61,1.12))-pane);c=mix(c,vec3(.40,.46,.44),reveal*.62);c=mix(c,vec3(.80,.81,.75),pane*bePLHLine1(q.x,.025));return c;', 'return c;'],
 ['float rail=bePLHRepeat1(y-.90,3.25,.035),fine=bePLHRepeat1(u,.875,.023);c=mix(c,vec3(.46,.53,.52),max(rail,fine*.45)*.32);float gasket=bePLHRepeat1(u-.07,1.75,.014);c=mix(c,vec3(.16,.25,.28),gasket*.42);float capLight=bePLHRepeat1(u+.055,1.75,.012);c=mix(c,vec3(.77,.80,.75),capLight*.36);float head=bePLHRepeat1(y+.15,3.25,.028);c=mix(c,vec3(.20,.28,.30),head*.32);', ''],
 ['float stile=max(bePLHLine1(q.x,.025),bePLHLine1(q.y+.35,.023));c=mix(c,vec3(.63,.69,.65),pane*stile);float pull=bePLHBox1(vec2(abs(q.x)-.18,q.y+.08),vec2(.020,.22));c=mix(c,vec3(.77,.79,.73),pane*pull);', ''],
];
function distantMaterial(){
 const start=BE_PAUL_LOBE_GLSL.indexOf('vec3 bePaulLobe1(');if(start<0)return undefined;
 let body=BE_PAUL_LOBE_GLSL.slice(start);
 // A new structural or family-dependent operation needs explicit review.
 const materialBody=body.slice(body.indexOf('{')+1).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g,'');
 if(/\b(?:discard|family|gl_FragDepth)\b/.test(materialBody))return undefined;
 for(const [before,after]of edits){if(body.split(before).length!==2)return undefined;body=body.replace(before,after);}
 return body;
}
const distant=distantMaterial();
export function berlinDistantContractAvailable(source:string){
 return distant!==undefined&&source.split(BE_PAUL_LOBE_GLSL).length===2&&source.split(route).length===2&&source.split(signature).length===2;
}
/** Call only for the admitted shared distant key. Keep the fully assembled
 * dispatcher and all repair hooks; the existing specializer removes dead leaves.
 * No second full shader string is retained in a module or renderer cache. */
export function berlinDistantPaintFragment(source:string):string|undefined{
 if(!berlinDistantContractAvailable(source))return undefined;
 return source.replace(route,'return bePaulLobeDistant1(base,p,normal,frame,family);').replace(signature,distant+'\n'+signature);
}
/** Retire only a replaced quality in this finite cohort, after its replacement
 * exists. Other city/family programs keep the renderer's existing LRU policy. */
export function retireBerlinDistantAlternates<T>(programs:Map<string,T>,visible:ReadonlySet<string>,release:(program:T)=>void,resident:ReadonlySet<string>=visible){
 let removed=0;const farReady=programs.has(BERLIN_DISTANT_PAUL_LOBE_KEY);
 if(farReady&&visible.has(BERLIN_DISTANT_PAUL_LOBE_KEY))for(const [key,program]of programs){if(berlinDistantFamily(key)!==undefined&&!visible.has(key)){programs.delete(key);release(program);removed++;}}
 if(farReady&&!visible.has(BERLIN_DISTANT_PAUL_LOBE_KEY)&&[...resident].filter(key=>berlinDistantFamily(key)!==undefined).every(key=>programs.has(key))){const program=programs.get(BERLIN_DISTANT_PAUL_LOBE_KEY)!;programs.delete(BERLIN_DISTANT_PAUL_LOBE_KEY);release(program);removed++;}
 return removed;
}
