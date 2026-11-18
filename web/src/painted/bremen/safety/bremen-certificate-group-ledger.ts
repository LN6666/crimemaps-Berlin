import type {Identity} from "../../../safety/building-mesh-types";
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import {BREMEN_DEMAND_METADATA,BREMEN_DEMAND_METADATA_STATUS} from './bremen-demand-metadata';
import {bremenCertificateIdentityCandidate} from './bremen-identity-metadata';

export type CertificatePair=Pick<Identity,'objectId'|'partId'>;
export type CertificateRecord={identity:CertificatePair;parent?:CertificatePair;leafSHA256?:string;parentSourceAbsent:boolean;groupKey:string};
export type CertificateSnapshotSlot={identity:CertificatePair;alias:string;rowIndex:number;priority:number;sourceLeafSHA256?:string};
export type BremenCertificateGroup={key:string;alias:string;index:string|number;modelIndex?:number;name:string;moduleKeys:readonly string[];kind:'core'|'delegate'|'availability';candidates:readonly CertificatePair[];held:readonly CertificateRecord[];parents:readonly CertificateRecord[];snapshotSlots:readonly CertificateSnapshotSlot[];resourceAliases:readonly string[];resources:readonly FrozenDataRef[];dependencies:readonly string[]};
export type BremenCertificateLedger={schemaVersion:1;proof:{productionEligible:boolean;sourceReceiptSHA256:string;held:number;parents:number;graphSHA256:string};groups:readonly BremenCertificateGroup[];held:readonly CertificateRecord[];parents:readonly CertificateRecord[];marketAuthoritySHA256?:string};
export type BremenCertificatePlan={ledger:BremenCertificateLedger;groups:readonly BremenCertificateGroup[];resources:readonly FrozenDataRef[]};
const key=(x:CertificatePair)=>x.objectId+'|'+x.partId;
let verified:BremenCertificateLedger|undefined;
function missing():never{throw Error('Bremen certificate group ledger is incomplete; verified parent/snapshot metadata is required');}

export function getBremenCertificateLedger():BremenCertificateLedger{
 if(verified)return verified;
 if(!BREMEN_DEMAND_METADATA_STATUS.complete)return missing();
 const ledger=BREMEN_DEMAND_METADATA.certificateLedger as BremenCertificateLedger|undefined;
 if(!ledger||ledger.schemaVersion!==1||!ledger.proof?.productionEligible||ledger.proof.held!==132||ledger.proof.parents!==19||ledger.held.length!==132||ledger.parents.length!==19)return missing();
 if(ledger.proof.sourceReceiptSHA256!==BREMEN_DEMAND_METADATA_STATUS.sourceReceiptSHA256||!/^[a-f0-9]{64}$/.test(ledger.proof.graphSHA256))throw Error('Bremen certificate ledger source proof mismatch');
 if(new Set(ledger.held.map(r=>key(r.identity))).size!==132||new Set(ledger.parents.map(r=>key(r.identity))).size!==19)throw Error('Bremen certificate ledger identity count mismatch');
 const groups=new Map(ledger.groups.map(group=>[group.key,group]));
 if(groups.size!==ledger.groups.length)throw Error('Duplicate Bremen certificate group');
 for(const group of ledger.groups){
  if(!group.key||!group.resources.length||group.dependencies.some(dependency=>!groups.has(dependency)))throw Error('Invalid Bremen certificate group dependencies');
  for(const ref of group.resources)if(!/^[a-f0-9]{64}$/.test(ref.canonicalSHA256)||!ref.file||!Number.isSafeInteger(ref.occurrence)||ref.occurrence<0||ref.codec!=='json')throw Error('Invalid Bremen certificate group resource binding');
 }
 for(const record of [...ledger.held,...ledger.parents])if(!groups.has(record.groupKey))throw Error('Unowned Bremen certificate ledger record');
 const held:CertificateRecord[]=[],parents:CertificateRecord[]=[];
 for(const group of ledger.groups)for(const[kind,rows]of [['held',group.held],['parents',group.parents]]as const){const target=kind==='held'?held:parents;for(const row of rows){if(row.groupKey!==group.key)throw Error('Bremen certificate group row ownership mismatch');const previous=target.findIndex(item=>key(item.identity)===key(row.identity));if(group.alias==='coverage'&&previous>=0)target[previous]=row;else target.push(row);}}
 const encoded=(rows:readonly CertificateRecord[])=>JSON.stringify(rows.map(row=>[key(row.identity),row.parent?key(row.parent):null,row.leafSHA256??null,row.parentSourceAbsent===true,row.groupKey]));
 if(encoded(held)!==encoded(ledger.held)||encoded(parents)!==encoded(ledger.parents))throw Error('Bremen certificate full group ledger proof mismatch');
 verified=ledger;return ledger;
}

function closure(ledger:BremenCertificateLedger,keys:Iterable<string>):string[]{
 const wanted=new Set(keys),groups=new Map(ledger.groups.map(group=>[group.key,group]));
 for(const name of wanted){const group=groups.get(name);if(!group)throw Error('Unknown Bremen certificate group: '+name);for(const dependency of group.dependencies)wanted.add(dependency);}
 return ledger.groups.filter(group=>wanted.has(group.key)).map(group=>group.key);
}
export function certificateGroupKeysForIdentity(c:CertificatePair):readonly string[]{
 if(!bremenCertificateIdentityCandidate(c))return[];
 const ledger=getBremenCertificateLedger();return closure(ledger,ledger.groups.filter(group=>group.candidates.some(row=>key(row)===key(c))).map(group=>group.key));
}
export function certificateGroupKeysForModule(moduleKey:string,components?:readonly CertificatePair[]):readonly string[]{
 if(components&&!components.some(bremenCertificateIdentityCandidate))return[];
 const ledger=getBremenCertificateLedger();return closure(ledger,ledger.groups.filter(group=>group.moduleKeys.includes(moduleKey)&&(!components||components.some(c=>group.candidates.some(row=>key(row)===key(c))))).map(group=>group.key));
}
export function planBremenCertificateGroups(components:readonly (CertificatePair&{city?:string})[]):BremenCertificatePlan|undefined{
 const candidates=components.filter(c=>c.city==='bremen'&&bremenCertificateIdentityCandidate(c));if(!candidates.length)return;
 const ledger=getBremenCertificateLedger(),keys=new Set(closure(ledger,candidates.flatMap(c=>certificateGroupKeysForIdentity(c))));
 const groups=ledger.groups.filter(group=>keys.has(group.key));if(!groups.length)return;
 const refs=new Map<string,FrozenDataRef>();for(const group of groups)for(const ref of group.resources)refs.set(JSON.stringify([ref.canonicalSHA256,ref.file,ref.occurrence,ref.codec]),ref);
 return{ledger,groups,resources:[...refs.values()]};
}
