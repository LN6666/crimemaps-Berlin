import {cityCohortIdentity} from './city-data-metadata';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {getC322_FIXTURE} from './c322-fixture';
import type {C318Component as C,C318Context as X} from './c318-display';
const RECIPE_KEY={};
function createRecipe(scope?:FrozenDataScope){
let FValue:ReturnType<typeof getC322_FIXTURE>|undefined;const F=new Proxy({} as ReturnType<typeof getC322_FIXTURE>,{get(_target,key){if(!scope)throw Error('City model validation requires a prepared frozen data scope');return Reflect.get(FValue??=getC322_FIXTURE(scope),key);}});


const eq=(a:ArrayLike<number>,b:ArrayLike<number>)=>a.length===b.length&&Array.from(b).every((v,i)=>a[i]===v);
function matches(c:C,p:typeof F.native[number]){return c.city===p.city&&c.objectId===p.objectId&&c.partId===p.partId&&eq(c.origin,p.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(p.componentGeometry)&&JSON.stringify(c.sourceFeature?.properties)===JSON.stringify(p.sourceFeature?.properties)&&c.batches.length===p.batches.length&&c.batches.every((b,i)=>eq(b.positions,p.batches[i].positions)&&eq(b.normals,p.batches[i].normals)&&eq(b.indices,p.batches[i].indices)&&eq(b.color,p.batches[i].color));}
const c322HasMaterialBinding=(c:C)=>c.city!==undefined&&c.city!=='munich'?false:F.native.some(p=>matches(c,p));
function applyC322MaterialFrames(rows:readonly C[],color:Float32Array,paint:Float32Array,x:X){const gate=!x.signal?.aborted&&x.city==='munich'&&x.indexSHA===F.indexSHA&&x.sourcePBF===F.sourcePBF&&x.boundarySHA===F.boundarySHA&&x.sourceSnapshot===F.sourceSnapshot&&x.pathsReady.color;let at=0,painted=0;for(const c of rows){const p=F.native.find(p=>matches(c,p));const enabled=gate&&p&&x.leafSHA(c)===p.proof.sourceSHA256&&x.materialReady(c);for(const b of c.batches)for(let i=0;i<b.positions.length;i+=3){if(enabled){const mx=111319.49079327358*Math.cos(c.origin[1]*Math.PI/180),X=(c.origin[0]-11.5865524)*mx+b.positions[i],Z=(c.origin[1]-48.1352038)*111319.49079327358+b.positions[i+2],u=X*.542+Z*.840,offset=X*.840-Z*.542;const east=b.normals[i]*.840-b.normals[i+2]*.542>.6;const photoFace=east&&Math.abs(offset)<4.2&&u>0&&u<64;const north=b.normals[i]*.15+b.normals[i+2]*.99>.7;const west=b.normals[i]<-.7;const nx=(c.origin[0]-11.5866421)*mx+b.positions[i],nz=(c.origin[1]-48.1357757)*111319.49079327358+b.positions[i+2];const nu=nx*.994-nz*.108,nd=nx*.108+nz*.994;const wx=(c.origin[0]-11.5862685)*mx+b.positions[i],wz=(c.origin[1]-48.1357929)*111319.49079327358+b.positions[i+2],wd=-.990*wx+.142*wz;const wu=(c.origin[1]-48.1357929)*111319.49079327358+b.positions[i+2];const roof=b.normals[i+1]>.05;let family=13337,A=u,B=offset,H=12.5;if(roof)family=13331;else if(photoFace)family=13330;else if(north&&Math.abs(nd)<3.5){family=13335;A=nu;H=12.5;}else if(west&&Math.abs(wd)<3.5){family=13336;A=wu;H=12.5;}color.set([...(family===13337?Array.from(b.color):[.76,.72,.60]),2],at*4);paint.set([A,b.positions[i+1],B,H,family],at*5);painted++;}at++;}}return{painted,geometryAdded:0};}
return{c322HasMaterialBinding,applyC322MaterialFrames};
}
export function getC322DisplayRecipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function c322HasMaterialBinding(c:C,scope:FrozenDataScope){if(!cityCohortIdentity('c322',c))return false;return getC322DisplayRecipe(scope).c322HasMaterialBinding(c);}
export function applyC322MaterialFrames(rows:readonly C[],color:Float32Array,paint:Float32Array,x:X,scope:FrozenDataScope){if(x.city!=='munich'||!rows.some(c=>cityCohortIdentity('c322',c)))return{painted:0,geometryAdded:0};return getC322DisplayRecipe(scope).applyC322MaterialFrames(rows,color,paint,x);}
export const MODULE_SCOPE_ARITY={"c322HasMaterialBinding":1,"applyC322MaterialFrames":4} as const;
