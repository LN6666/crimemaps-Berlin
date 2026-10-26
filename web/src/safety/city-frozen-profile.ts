export type FrozenDescriptor={path:string;sha256:string;bytes:number;transport?:{path:string;sha256:string;bytes:number;encoding:'gzip'}};
type Dependencies={providers:Record<string,string[]>;initializers:Record<string,Record<string,Record<string,number>>>};
export type CityFrozenProfile={schemaVersion:1;city:string;selectorVersion:string;routes:Array<{file:string;canonicalSHA256:string;canonicalBytes:number;occurrence:number;selector:string;descriptor:FrozenDescriptor;canonicalCount:number;retainedCount:number;orderedSelectionSHA256:string;exception?:string}>};
type Selection={tables:readonly string[];initializers?:Record<string,Record<string,number>>};
const validSHA=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
/** The profile changes resource identity before verification, never the meaning
 * of a descriptor SHA. Canonical provenance and physical/raw integrity stay separate. */
export function createCityFrozenProfile(manifest:readonly FrozenDescriptor[],dependencies:Dependencies,profile:CityFrozenProfile|null,city:string){
 const canonical=new Map(manifest.map(d=>[d.sha256,d])),descriptors=new Map(canonical),routes=new Map<string,CityFrozenProfile['routes'][number]>();
 const key=(file:string,sha:string,occurrence:number)=>file+'|'+sha+'|'+occurrence;
 if(profile){
  if(profile.schemaVersion!==1||profile.city!==city||profile.selectorVersion!=='city-data-v1'||!Array.isArray(profile.routes)||profile.routes.length!==12)throw Error('Invalid city data profile');
  for(const r of profile.routes){
   const original=canonical.get(r.canonicalSHA256),known=Object.values(dependencies.initializers).some(refs=>(refs[r.canonicalSHA256]?.[r.file]??0)>r.occurrence);
   if(!original||original.bytes!==r.canonicalBytes||!known||r.occurrence!==0||!/^painted\/(city|root500|delegated500|tier300)\/safety\/progressive-(?:paint-admissions|feature-cities|berlin-programs|hamburg-programs)\.ts$/.test(r.file)||!validSHA(r.descriptor?.sha256)||!validSHA(r.orderedSelectionSHA256)||!Number.isSafeInteger(r.canonicalCount)||!Number.isSafeInteger(r.retainedCount)||r.retainedCount<0||r.retainedCount>r.canonicalCount||routes.has(key(r.file,r.canonicalSHA256,r.occurrence)))throw Error('Invalid city data route');
   routes.set(key(r.file,r.canonicalSHA256,r.occurrence),r);
   const prior=descriptors.get(r.descriptor.sha256);if(prior&&JSON.stringify(prior)!==JSON.stringify(r.descriptor))throw Error('Conflicting selected table descriptor');descriptors.set(r.descriptor.sha256,r.descriptor);
  }
  const expected=new Set(['city','root500','delegated500','tier300'].flatMap(p=>['paint-admissions','feature-cities'].map(n=>`painted/${p}/safety/progressive-${n}.ts`)).concat(['root500','delegated500'].flatMap(p=>['berlin','hamburg'].map(c=>`painted/${p}/safety/progressive-${c}-programs.ts`))));
  for(const r of routes.values())expected.delete(r.file);if(expected.size)throw Error('Incomplete city data profile');
 }
 function resolve(sha:string,file:string,occurrence=0){
  const selected=routes.get(key(file,sha,occurrence));if(selected)return selected.descriptor.sha256;
  if(profile&&[...routes.values()].some(r=>r.file===file))throw Error('City data initializer binding mismatch');
  return sha;
 }
 function selection(input:Selection):Selection{
  const refs:Record<string,Record<string,number>>={};
  for(const sha of input.tables){const initializers=input.initializers?.[sha];if(!initializers)throw Error('Missing frozen initializer binding');for(const [file,n]of Object.entries(initializers))for(let i=0;i<n;i++){const selected=resolve(sha,file,i),row=refs[selected]??={};row[file]=(row[file]??0)+1;}}
  return{tables:Object.keys(refs).sort(),initializers:refs};
 }
 function rowCounts(sha:string,file:string,fallback:number){const r=routes.get(key(file,sha,0));return r?{global:r.canonicalCount,retained:r.retainedCount,city}:{global:fallback,retained:fallback,city:undefined};}
 const stats=()=>({enabled:Boolean(profile),city:profile?.city,selectorVersion:profile?.selectorVersion,admissions:Object.fromEntries([...routes.values()].filter(r=>r.selector==='city-rows').map(r=>[r.file,{global:r.canonicalCount,retained:r.retainedCount,canonicalSHA256:r.canonicalSHA256,selectedSHA256:r.descriptor.sha256}]))});
 // Only this deployed city's active provider allowlist becomes a store registry.
 // Canonical identity metadata is separate; no all-city projection accumulation.
 let effectiveDescriptors=[...descriptors.values()];
 if(profile){const active=['city','root500','delegated500','tier300','church',...(['frankfurt','stuttgart','essen'].includes(city)?['infill']:[]),...(city==='bremen'?['bremen']:[])],needed=new Set<string>();for(const provider of active)for(const [sha,refs]of Object.entries(dependencies.initializers[provider]??{}))for(const [file,n]of Object.entries(refs))for(let i=0;i<n;i++)needed.add(resolve(sha,file,i));effectiveDescriptors=[...needed].map(sha=>{const d=descriptors.get(sha);if(!d)throw Error('Missing selected city descriptor');return d;});}
 const effective=new Set(effectiveDescriptors.map(d=>d.sha256));
 const resolveLegacy=(sha:string)=>{if(effective.has(sha))return sha;const selected=new Set([...routes.values()].filter(r=>r.canonicalSHA256===sha).map(r=>r.descriptor.sha256));if(selected.size===1)return [...selected][0];throw Error('Ambiguous legacy city table binding');};
 return{descriptors:effectiveDescriptors,resolve,resolveLegacy,selection,rowCounts,stats};
}
