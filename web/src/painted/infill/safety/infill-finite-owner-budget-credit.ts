import type {BuildingComponent} from './building-mesh-renderer';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {FINITE_OWNER_BUDGET_DATA,FINITE_OWNER_BUDGET_SHA256} from './infill-finite-owner-budget-data';
const models=FINITE_OWNER_BUDGET_DATA,byIdentity=new Map<string,typeof models>();
for(const model of models){const key=model.objectId+'|'+model.partId;byIdentity.set(key,[...(byIdentity.get(key)??[]),model]);}
export const INFILL_FINITE_OWNER_BUDGET_CATALOGUE=Object.freeze({patchSHA256:FINITE_OWNER_BUDGET_SHA256,models:models.length,vertices:models.reduce((n,m)=>n+m.creditVertices,0),indices:models.reduce((n,m)=>n+m.creditIndices,0),providers:new Set(models.map(m=>m.patchSHA256)).size});
/** Credit only fixed authorized SOURCE/OUTPUT descriptors. Bulk70 and owner055 catalogues are excluded when descriptors are generated. */
export function infillFiniteOwnerBudgetCredit(components:BuildingComponent[]){
 let vertices=0,indices=0,rows=0;const seen=new Set<string>(),byOwner=new Map<string,{patchSHA256:string;rows:number;vertices:number;indices:number}>();
 for(const c of components){const receipts=Object.values(c.displayEstimates??{}).flatMap(value=>typeof value==='string'?[value]:value&&typeof value==='object'?['patchSHA','patchSHA256'].flatMap(key=>typeof(value as Record<string,unknown>)[key]==='string'?[(value as Record<string,string>)[key]]:[]):[]);
  const key=c.objectId+'|'+c.partId,candidates=(byIdentity.get(key)??[]).filter(m=>receipts.includes(m.patchSHA256)||!!m.receiptBooleanKey&&c.displayEstimates?.[m.receiptBooleanKey]===true);if(!candidates.length)continue;if(c.city!=='frankfurt'||seen.has(key))throw new Error('Unattested finite owner display budget credit');
  const actual=ownerDisplayFingerprint(c),model=candidates.find(m=>actual.fingerprint===m.displayFingerprint&&actual.vertices===m.displayVertices&&actual.indices===m.displayIndices);if(!model)throw new Error('Changed finite owner display budget credit geometry or metadata');seen.add(key);vertices+=model.creditVertices;indices+=model.creditIndices;rows++;const g=byOwner.get(model.patchSHA256)??{patchSHA256:model.patchSHA256,rows:0,vertices:0,indices:0};g.rows++;g.vertices+=model.creditVertices;g.indices+=model.creditIndices;byOwner.set(model.patchSHA256,g);
 }
 if(vertices>INFILL_FINITE_OWNER_BUDGET_CATALOGUE.vertices||indices>INFILL_FINITE_OWNER_BUDGET_CATALOGUE.indices)throw new Error('Finite owner display catalogue exceeded');
 return{vertices,indices,rows,catalogueVertices:INFILL_FINITE_OWNER_BUDGET_CATALOGUE.vertices,catalogueIndices:INFILL_FINITE_OWNER_BUDGET_CATALOGUE.indices,patchSHA256:FINITE_OWNER_BUDGET_SHA256,byOwner:[...byOwner.values()].sort((a,b)=>b.vertices-a.vertices)};
}
