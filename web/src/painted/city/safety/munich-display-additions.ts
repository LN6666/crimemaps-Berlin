import {CITY_DATA_COHORTS,cityCohortIdentity,cityAppearanceVertexReservations} from './city-data-metadata';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {C323_FIXTURE} from './c323-fixture';
import {getC322_FIXTURE} from './c322-fixture';
import * as L from './c312-display';
import {C319_FIXTURE} from './c319-fixture';
import {getC320_FIXTURE} from './c320-fixture';
import {getC312DisplayRecipe} from './c312-display';
export type C312Context=L.C312Context&{c319ShadowReady?:boolean;c320ShadowReady?:boolean;c322ShadowReady?:boolean;c323ShadowReady?:boolean};
type C=L.C312Component;
type G={sourcePBF:string;boundarySHA:string;sourceSnapshot:string;indexSHA:string;sourceSHA256?:string;native:(C&{proof?:{sourceSHA256:string}})[];added:(C&{displayEstimates:{family:number}})[]};
const RECIPE_KEY={};
function createRecipe(scope?:FrozenDataScope){
let C320_FIXTUREValue:ReturnType<typeof getC320_FIXTURE>|undefined;const C320_FIXTURE=new Proxy({} as ReturnType<typeof getC320_FIXTURE>,{get(_target,key){if(!scope)throw Error('City model validation requires a prepared frozen data scope');return Reflect.get(C320_FIXTUREValue??=getC320_FIXTURE(scope),key);}});
let C322_FIXTUREValue:ReturnType<typeof getC322_FIXTURE>|undefined;const C322_FIXTURE=new Proxy({} as ReturnType<typeof getC322_FIXTURE>,{get(_target,key){if(!scope)throw Error('City model validation requires a prepared frozen data scope');return Reflect.get(C322_FIXTUREValue??=getC322_FIXTURE(scope),key);}});
const L=getC312DisplayRecipe(scope);


const groups=[C319_FIXTURE,new Proxy({} as G,{get(_target,key){if(key==='native')return[C320_FIXTURE.native];return Reflect.get(C320_FIXTURE,key);}}),C322_FIXTURE,C323_FIXTURE] as unknown as G[];const groupKeys=['c319','c320','c322','c323'] as const;
const eq=(a:ArrayLike<number>,b:ArrayLike<number>)=>a.length===b.length&&Array.from(b).every((v,i)=>a[i]===v);
function same(c:C,p:C){return c.city===p.city&&c.objectId===p.objectId&&c.partId===p.partId&&JSON.stringify(c.sourceFeature?.properties)===JSON.stringify(p.sourceFeature?.properties)&&eq(c.origin,p.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(p.componentGeometry)&&c.batches.length===p.batches.length&&c.batches.every((b,i)=>eq(b.positions,p.batches[i].positions)&&eq(b.normals,p.batches[i].normals)&&eq(b.indices,p.batches[i].indices)&&eq(b.color,p.batches[i].color));}
const belongs=(g:G,c:Pick<C,'objectId'|'partId'>&{city?:string})=>cityCohortIdentity(groupKeys[groups.indexOf(g)],c,true,true);
const added=(c:Pick<C,'objectId'|'partId'>&{city?:string})=>groups.some(g=>belongs(g,c));
function sourceOK(g:G,rows:readonly C[],x:C312Context){if(!rows.some(c=>cityCohortIdentity(groupKeys[groups.indexOf(g)],c)))return false;if(x.sourceAdmission&&!g.native.every(row=>x.sourceAdmission!.has(row.objectId+'|'+row.partId)))return false;return !x.signal?.aborted&&x.city==='munich'&&x.indexSHA===g.indexSHA&&x.sourcePBF===g.sourcePBF&&x.boundarySHA===g.boundarySHA&&x.sourceSnapshot===g.sourceSnapshot&&g.native.every(p=>{const found=rows.filter(c=>c.city===p.city&&c.objectId===p.objectId&&c.partId===p.partId);return found.length===1&&same(found[0],p)&&x.leafSHA(found[0])===(p.proof?.sourceSHA256??g.sourceSHA256);});}
function readyR(g:G,rows:readonly C[],x:C312Context){const shadow=g===groups[0]?x.c319ShadowReady:g===groups[1]?x.c320ShadowReady:g===groups[2]?x.c322ShadowReady:x.c323ShadowReady;return shadow===true&&x.pathsReady.color&&x.pathsReady.shadow&&x.pathsReady.pick&&sourceOK(g,rows,x)&&[...g.native,...g.added].every(p=>{const found=rows.filter(c=>c.city===p.city&&c.objectId===p.objectId&&c.partId===p.partId);return found.length===1&&same(found[0],p)&&x.materialReady(found[0]);});}
const createC312DisplayComponents=(rows:readonly C[],x:C312Context)=>[...L.createC312DisplayComponents(rows,x),...groups.flatMap(g=>sourceOK(g,rows,x)?structuredClone(g.added):[])];
const borrowC312DisplayComponents=(rows:readonly C[],x:C312Context)=>[...L.borrowC312DisplayComponents(rows,x),...groups.flatMap(g=>sourceOK(g,rows,x)?g.added:[])];
function borrowReadyC312DisplayComponents(rows:readonly C[],x:C312Context,included:(c:C,bi:number)=>boolean){
 const extra=borrowC312DisplayComponents(rows,x),all=[...rows,...extra];
 const baseReady=L.c312Ready(all,x)&&all.filter(c=>cityCohortIdentity('c312',c)).every(c=>c.batches.every((_,i)=>included(c,i)));
 const ready=groups.map(g=>readyR(g,all,x)&&all.filter(c=>belongs(g,c)).every(c=>c.batches.every((_,i)=>included(c,i))));
 return extra.filter(c=>L.c312IsAdded(c)?baseReady:groups.some((g,i)=>ready[i]&&belongs(g,c)));
}
const c312IsAdded=(c:Pick<C,'objectId'|'partId'>&{city?:string})=>c.city!==undefined&&c.city!=='munich'?false:L.c312IsAdded(c)||added(c);
const c312HasMaterialBinding=(c:C)=>c.city!==undefined&&c.city!=='munich'?false:L.c312HasMaterialBinding(c)||groups.some(g=>cityCohortIdentity(groupKeys[groups.indexOf(g)],c)&&[...g.native,...g.added].some(p=>same(c,p)));
function c312Ready(rows:readonly C[],x:C312Context){const lr=L.c312Ready(rows,x),rs=groups.map(g=>readyR(g,rows,x));return (lr||rs.some(Boolean))&&(!rows.some(L.c312IsAdded)||lr)&&groups.every((g,i)=>!rows.some(c=>belongs(g,c))||rs[i]);}
function c312Commit(rows:readonly C[],x:C312Context,included:(c:C,bi:number)=>boolean){const rs=groups.map(g=>readyR(g,rows,x)&&rows.filter(c=>belongs(g,c)).every(c=>c.batches.every((_,i)=>included(c,i))));const clean=rows.filter(c=>groups.every((g,i)=>!belongs(g,c)||rs[i]));const result=L.c312Commit(clean,x,included);const rr=rs.some(Boolean);return {...result,ready:result.ready||rr,sourceOnly:!(result.ready||rr),sidecar:{...result.sidecar,enabled:result.sidecar.enabled||rr}};}
const c312Presence=(rows:readonly C[])=>({...L.c312Presence(rows),c319Native:rows.some(c=>cityCohortIdentity('c319',c))?groups[0].native.filter(p=>rows.some(c=>same(c,p))).length:0,c319Added:rows.some(c=>cityCohortIdentity('c319',c))?groups[0].added.filter(p=>rows.some(c=>same(c,p))).length:0,c319ExpectedAdded:CITY_DATA_COHORTS.c319.added.length,c320Native:rows.some(c=>cityCohortIdentity('c320',c))?groups[1].native.filter(p=>rows.some(c=>same(c,p))).length:0,c320Added:rows.some(c=>cityCohortIdentity('c320',c))?groups[1].added.filter(p=>rows.some(c=>same(c,p))).length:0,c320ExpectedAdded:CITY_DATA_COHORTS.c320.added.length,notNativeAdditions:true});
const c312PickDiscard=L.c312PickDiscard;
const c312VertexShader=L.c312VertexShader;
const c312FragmentShader=L.c312FragmentShader;
function applyC312MaterialFrames(rows:readonly C[],progressive:Float32Array,paint:Float32Array,x:C312Context){const result=L.applyC312MaterialFrames(rows,progressive,paint,x);let at=0;const ready=groups.map(g=>readyR(g,rows,x));for(const c of rows){const gi=groups.findIndex(g=>belongs(g,c)),p=gi>=0&&ready[gi]?groups[gi].added.find(p=>same(c,p)):undefined;for(const b of c.batches)for(let i=0;i<b.positions.length;i+=3){if(gi>=0&&ready[gi]&&p){let z=10000+b.positions[i],w=10000+b.positions[i+2];const family=p.displayEstimates.family;if(gi===1&&family===13314){const C=111319.49079327358;z=10000+(c.origin[0]-11.5892)/.0036*1200+b.positions[i]/(C*Math.cos(c.origin[1]*Math.PI/180))/.0036*1200;w=10000+(48.1440-c.origin[1])/.0018*900-b.positions[i+2]/C/.0018*900;}if(gi===2&&family===13332){const C=111319.49079327358;z=10000+(c.origin[0]-11.5860)/.0012*900+b.positions[i]/(C*Math.cos(c.origin[1]*Math.PI/180))/.0012*900;w=10000+(48.13595-c.origin[1])/.00095*900-b.positions[i+2]/C/.00095*900;}progressive.set([...Array.from(p.batches[0].color),2],at*4);paint.set([b.positions[i],b.positions[i+1],z,w,family],at*5);}at++;}}return {...result,ready:result.ready||ready.some(Boolean)};}
const c312AppearanceVertexReservation=(city:string)=>L.c312AppearanceVertexReservation(city)+(city==='munich'?groups.reduce((s,g)=>s+g.added.reduce((n,c)=>n+c.batches.reduce((v,b)=>v+b.positions.length/3,0),0),0):0);
return{createC312DisplayComponents,borrowC312DisplayComponents,borrowReadyC312DisplayComponents,c312IsAdded,c312HasMaterialBinding,c312Ready,c312Commit,c312Presence,c312PickDiscard,c312VertexShader,c312FragmentShader,applyC312MaterialFrames,c312AppearanceVertexReservation};
}
export function getMunichDisplayAdditionsRecipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function createC312DisplayComponents(rows:readonly C[],x:C312Context,scope:FrozenDataScope){if(!rows.length)return [];if(x.city!=='munich')return [];return getMunichDisplayAdditionsRecipe(scope).createC312DisplayComponents(rows,x);}
/** Borrowed immutable rows; the consumer must keep this prepared scope pinned. */
export function borrowC312DisplayComponents(rows:readonly C[],x:C312Context,scope:FrozenDataScope){if(!rows.length)return [];if(x.city!=='munich')return [];return getMunichDisplayAdditionsRecipe(scope).borrowC312DisplayComponents(rows,x);}
export function borrowReadyC312DisplayComponents(rows:readonly C[],x:C312Context,included:(c:C,bi:number)=>boolean,scope:FrozenDataScope){if(!rows.length||x.city!=='munich')return [];return getMunichDisplayAdditionsRecipe(scope).borrowReadyC312DisplayComponents(rows,x,included);}
export function c312IsAdded(c:Pick<C,'objectId'|'partId'>&{city?:string},scope?:FrozenDataScope){return (['c312','c319','c320','c322','c323'] as const).some(key=>cityCohortIdentity(key,c,true,true));}
export function c312HasMaterialBinding(c:C,scope:FrozenDataScope){if(!(['c312','c319','c320','c322','c323'] as const).some(key=>cityCohortIdentity(key,c)))return false;return getMunichDisplayAdditionsRecipe(scope).c312HasMaterialBinding(c);}
export function c312Ready(rows:readonly C[],x:C312Context,scope:FrozenDataScope){if(!rows.length)return false;if(x.city!=='munich')return false;return getMunichDisplayAdditionsRecipe(scope).c312Ready(rows,x);}
export function c312Commit(rows:readonly C[],x:C312Context,included:(c:C,bi:number)=>boolean,scope:FrozenDataScope){if(!rows.length)return{ready:false,rows:[],sidecar:{enabled:false,attributes:new Float32Array(),wholeParentHidden:false as const},sourceOnly:true,wholeParentHidden:false as const};return getMunichDisplayAdditionsRecipe(scope).c312Commit(rows,x,included);}
export function c312Presence(rows:readonly C[],scope:FrozenDataScope){return getMunichDisplayAdditionsRecipe(scope).c312Presence(rows);}
export function c312PickDiscard(data:ArrayLike<number>,ids:readonly number[],bary:readonly number[],scope?:FrozenDataScope){return getMunichDisplayAdditionsRecipe(scope).c312PickDiscard(data,ids,bary);}
export function c312VertexShader(s:string,city:string,scope?:FrozenDataScope){if(city!=='munich')return s;return getMunichDisplayAdditionsRecipe(scope).c312VertexShader(s,city);}
export function c312FragmentShader(s:string,city:string,scope?:FrozenDataScope){if(city!=='munich')return s;return getMunichDisplayAdditionsRecipe(scope).c312FragmentShader(s,city);}
export function applyC312MaterialFrames(rows:readonly C[],progressive:Float32Array,paint:Float32Array,x:C312Context,scope:FrozenDataScope){if(!rows.length)return{ready:false,vertices:0};return getMunichDisplayAdditionsRecipe(scope).applyC312MaterialFrames(rows,progressive,paint,x);}
export function c312AppearanceVertexReservation(city:string,scope?:FrozenDataScope){return cityAppearanceVertexReservations(city).c312;}
export const MODULE_SCOPE_ARITY={"borrowC312DisplayComponents":2,"borrowReadyC312DisplayComponents":3,"createC312DisplayComponents":2,"c312IsAdded":1,"c312HasMaterialBinding":1,"c312Ready":2,"c312Commit":3,"c312Presence":1,"c312PickDiscard":3,"c312VertexShader":2,"c312FragmentShader":2,"applyC312MaterialFrames":4,"c312AppearanceVertexReservation":1} as const;
