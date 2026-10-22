/** Exact constant-family4054 specialization; no material/layout detail removed. Local F044 caller only. */
const ORIGINAL_LENGTH=20680,ORIGINAL_FNV=183645108;
const SLICE="vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float d=abs(frame.x-frame.w*.5)/max(frame.w*.5,1.);return base*(.93+.10*(1.-smoothstep(.0,1.,d)));}";
export function f4054Reachable672(source:string,key:string):string|undefined{if(key!=='f4054'||source.length!==ORIGINAL_LENGTH)return;let h=2166136261;for(let i=0;i<source.length;i++)h=Math.imul(h^source.charCodeAt(i),16777619)>>>0;if(h!==ORIGINAL_FNV)return;return SLICE;}
