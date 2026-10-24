import type {BuildingComponent} from './building-mesh-renderer';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {isFacadeLandmark} from './facade-landmark-registry';
import {FRANKFURT_LOWOFFICE_STOP100} from './frankfurt-lowoffice-stop100-data';

const selected=new Map(FRANKFURT_LOWOFFICE_STOP100.map(row=>[row.objectId+'|'+row.partId,row]));
function carriesPatch(c:BuildingComponent,patch:string){return Object.values(c.displayEstimates??{}).some(v=>v===patch||!!v&&typeof v==='object'&&('patchSHA'in v&&v.patchSHA===patch||'patchSHA256'in v&&v.patchSHA256===patch));}
/** Read existing immutable geometry plus the actual final packed attributes.
 * Only tiny batch headers and typed-array views are allocated, no mesh copies. */
function packedFingerprint(c:BuildingComponent,paint:Float32Array,frames:Float32Array,start:number){let at=start;const batches=c.batches.map(b=>{const n=b.positions.length/3,out={...b,paint:paint.subarray(at*4,(at+n)*4),frames:frames.subarray(at*5,(at+n)*5)};at+=n;return out;});return ownerDisplayFingerprint({...c,batches}).fingerprint;}

/** Explicitly cancelled generic low-office colour only. Reconstruction,
 * SOURCE, batch RGB, caches, owner receipts and finite credit stay unchanged. */
export function frankfurtLowOfficeStop100BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((v,b)=>v+b.positions.length/3,0),0);
 if(paint.length!==total*4||frames.length!==total*5)throw Error('Lowoffice100 exact packed lengths required');
 const plans:{at:number;row:typeof FRANKFURT_LOWOFFICE_STOP100[number]}[]=[],seen=new Set<string>();let at=0,objects=0,vertices=0,alreadyNeutral=0,materialValuesChanged=0,familyValuesChanged=0;
 for(const c of components){const n=c.batches.reduce((v,b)=>v+b.positions.length/3,0),key=c.objectId+'|'+c.partId,row=c.city==='frankfurt'?selected.get(key):undefined;
  if(row&&carriesPatch(c,row.expectedOwnerPatchSHA256)){
   if(seen.has(key)||isFacadeLandmark(c))throw Error('Lowoffice100 duplicate or protected landmark target');seen.add(key);
   if(n!==row.vertices)throw Error('Lowoffice100 selected DISPLAY count changed');const actual=packedFingerprint(c,paint,frames,at);
   if(actual===row.stoppedPackedFingerprint)alreadyNeutral++;
   else if(actual!==row.originalPackedFingerprint)throw Error('Lowoffice100 selected DISPLAY or final packed material changed: '+key);
   else plans.push({at,row});objects++;vertices+=row.stoppedVertices;
  }
  at+=n;
 }
 // Preflight every present authenticated target before changing any attribute.
 for(const{at,row}of plans)for(const[first,count]of row.ranges)for(let j=first;j<first+count;j++)if(!Number.isSafeInteger(paint[(at+j)*4+3])||paint[(at+j)*4+3]<0)throw Error('Lowoffice100 invalid packed material/mask encoding');
 for(const{at,row}of plans)for(const[first,count]of row.ranges)for(let j=first;j<first+count;j++){
  const p=(at+j)*4+3,f=(at+j)*5+4,alpha=paint[p];
  const maskOnly=Math.floor(alpha/4)*4;if(!Object.is(alpha,maskOnly))materialValuesChanged++;if(frames[f]!==0)familyValuesChanged++;
  paint[p]=maskOnly;frames[f]=0;
 }
 return{objects,vertices,alreadyNeutral,materialValuesChanged,familyValuesChanged,sourceRetained:true,geometryUnchanged:true,displayMasksRetained:true,actualVisualAccepted:false};
}
