import type {BuildingComponent} from './building-mesh-renderer';
import {LOW_OFFICE_DATA as B084_DATA,LOW_OFFICE_SHA as B084_SHA} from './infill-frankfurt-bockenheimer084-data';
import {LOW_OFFICE_DATA as J088_DATA,LOW_OFFICE_SHA as J088_SHA} from './infill-frankfurt-junghof088-data';
import {JW_MARRIOTT_DATA,JW_MARRIOTT_SHA} from './infill-frankfurt-jw-marriott-data';
import {INFILL_JAPAN_CENTER_BUDGET_MODELS,INFILL_JAPAN_CENTER_SHA} from './infill-frankfurt-japan-center';
/** Separate finite credit for the exact previously prepared owners newly connected in 055. Native and legacy-owner caps are unchanged. */
const count=(batches:any[],key:'vertices'|'indices')=>batches.reduce((n,b)=>n+(key==='vertices'?b.positions.length/3:b.indices.length),0);
const delta=(m:any,key:'vertices'|'indices')=>Math.max(0,count(m.display,key)-count(m.source.batches,key));
const bulkModels=(data:any)=>data.groups.filter((g:any)=>g.geometryReadyForPreview).flatMap((g:any)=>g.models);
const catalogues:Array<{name:string;marker:string;patchSHA256:string;models:ReadonlyArray<any>}>= [
 {name:'Bockenheimer084',marker:'infillFrankfurtBockenheimer084',patchSHA256:B084_SHA,models:bulkModels(B084_DATA)},
 {name:'Junghof088',marker:'infillFrankfurtJunghof088',patchSHA256:J088_SHA,models:bulkModels(J088_DATA)},
 {name:'JW Marriott',marker:'infillFrankfurtJwMarriottExterior',patchSHA256:JW_MARRIOTT_SHA,models:JW_MARRIOTT_DATA.models},
 {name:'Japan Center',marker:'infillJapanCenterExterior',patchSHA256:INFILL_JAPAN_CENTER_SHA,models:INFILL_JAPAN_CENTER_BUDGET_MODELS}
];
export const INFILL_OWNER055_BUDGET_CATALOGUE=Object.freeze(catalogues.map(g=>Object.freeze({name:g.name,patchSHA256:g.patchSHA256,models:g.models.length,vertices:g.models.reduce((n,m)=>n+delta(m,'vertices'),0),indices:g.models.reduce((n,m)=>n+delta(m,'indices'),0)})));
export function infillOwner055BudgetCredit(components:BuildingComponent[]){
 const seen=new Set<string>(),byOwner=INFILL_OWNER055_BUDGET_CATALOGUE.map(g=>({...g,vertices:0,indices:0,rows:0}));let vertices=0,indices=0,rows=0;
 for(const c of components)for(const[gi,g]of catalogues.entries()){
  const marker=c.displayEstimates?.[g.marker] as {patchSHA?:string}|undefined;if(!marker)continue;
  const m=g.models.find((m:any)=>m.identity.objectId===c.objectId&&m.identity.partId===c.partId),key=c.objectId+'|'+c.partId;
  if(c.city!=='frankfurt'||!m||marker.patchSHA!==g.patchSHA256||seen.has(key))throw new Error('Unattested owner055 display budget credit');seen.add(key);
  if(!['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(m.source[k]))||c.batches.length!==m.display.length||!c.batches.every((b,bi)=>['positions','normals','indices','color','paint','frames'].every(k=>{const a=(b as any)[k],e=m.display[bi][k];return a&&e&&a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));})))throw new Error('Changed owner055 display budget credit geometry');
  const v=delta(m,'vertices'),i=delta(m,'indices');vertices+=v;indices+=i;rows++;byOwner[gi].vertices+=v;byOwner[gi].indices+=i;byOwner[gi].rows++;
 }
 for(const [i,g]of byOwner.entries())if(g.vertices>INFILL_OWNER055_BUDGET_CATALOGUE[i].vertices||g.indices>INFILL_OWNER055_BUDGET_CATALOGUE[i].indices)throw new Error('Owner055 display reserve exceeded');
 return{vertices,indices,rows,catalogueVertices:INFILL_OWNER055_BUDGET_CATALOGUE.reduce((n,g)=>n+g.vertices,0),catalogueIndices:INFILL_OWNER055_BUDGET_CATALOGUE.reduce((n,g)=>n+g.indices,0),byOwner};
}
