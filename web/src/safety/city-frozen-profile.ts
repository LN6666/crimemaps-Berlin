import type {FrozenDataDescriptor,FrozenDataPartition} from './frozen-data-lease-store';
import sourceAliases from './frozen-paint-source-aliases.json';
export type FrozenDescriptor=FrozenDataDescriptor;
type Dependencies={providers:Record<string,string[]>;initializers:Record<string,Record<string,Record<string,number>>>};
export type CityFrozenProfile={schemaVersion:1;city:string;selectorVersion:string;routes:Array<{file:string;canonicalSHA256:string;canonicalBytes:number;occurrence:number;selector:string;descriptor:FrozenDescriptor;canonicalCount:number;retainedCount:number;orderedSelectionSHA256:string;exception?:string;partition?:FrozenDataPartition}>};
type Selection={tables:readonly string[];initializers?:Record<string,Record<string,number>>};
const validSHA=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const coreProviders=['city','root500','delegated500','tier300'] as const;
const infillCities=new Set(['frankfurt','stuttgart','essen']);
const activeProviders=(city:string)=>[...coreProviders,'church',...(infillCities.has(city)?['infill']:[]),...(city==='bremen'?['bremen']:[])];

/** Bind every projected initializer, including the deployed city's optional
 * providers. Version one remains readable with its original twelve bindings;
 * version two requires the complete active-provider projection. */
function expectedBindings(dependencies:Dependencies,city:string,version:string){
 if(version!=='city-data-v1'&&version!=='city-data-v2'&&version!=='city-data-v3')throw Error('Invalid city data selector version');
 const providers:string[]=[...coreProviders];
 if(version!=='city-data-v1'){
  if(infillCities.has(city))providers.push('infill');
  if(city==='bremen')providers.push('bremen');
 }
 const expected=new Map<string,{canonicalSHA256:string;occurrence:number;selector:string}>();
 function addBinding(provider:string,file:string,selector:string){
  const bindings=Object.entries(dependencies.initializers[provider]??{}).filter(([,refs])=>Object.hasOwn(refs,file));
  if(bindings.length!==1||bindings[0][1][file]!==1)throw Error('Missing or ambiguous city data initializer binding');
  expected.set(file,{canonicalSHA256:bindings[0][0],occurrence:0,selector});
 }
 for(const provider of providers){
  const files=[['paint-admissions','city-rows'],['feature-cities','city-key']];
  if(provider==='root500'||provider==='delegated500')files.push(['berlin-programs','berlin-catalog'],['hamburg-programs','hamburg-catalog']);
  for(const [name,selector]of files){
   const file=`painted/${provider}/safety/progressive-${name}.ts`;
   addBinding(provider,file,selector);
  }
 }
 if(version!=='city-data-v1'&&city==='bremen')addBinding('bremen','painted/bremen/safety/repairs-data.ts','model-targets');
 if(version==='city-data-v3'&&city==='frankfurt')addBinding('infill','painted/infill/safety/infill-frankfurt-low-office-bulk70-data.ts','group-targets');
 return expected;
}
/** The profile changes resource identity before verification, never the meaning
 * of a descriptor SHA. Canonical provenance and physical/raw integrity stay separate. */
export function createCityFrozenProfile(manifest:readonly FrozenDescriptor[],dependencies:Dependencies,profile:CityFrozenProfile|null,city:string){
 const canonical=new Map(manifest.map(d=>[d.sha256,d])),descriptors=new Map(canonical),routes=new Map<string,CityFrozenProfile['routes'][number]>();
 const aliases:Readonly<Record<string,{sha256:string;sourceBytes:number}>>=sourceAliases;
 // A code-owned ref can identify the original evidence. Only the verified
 // public descriptor can enter the active resource store or select a URL.
 function publicSource(sha:string){
  const replacement=Object.hasOwn(aliases,sha)?aliases[sha].sha256:undefined;
  return replacement&&canonical.has(replacement)?replacement:sha;
 }
 const key=(file:string,sha:string,occurrence:number)=>file+'|'+sha+'|'+occurrence;
 function addDescriptor(descriptor:FrozenDescriptor){const prior=descriptors.get(descriptor.sha256);if(prior&&JSON.stringify(prior)!==JSON.stringify(descriptor))throw Error('Conflicting selected table descriptor');descriptors.set(descriptor.sha256,descriptor);}
 if(profile){
  if(profile.schemaVersion!==1||profile.city!==city||!Array.isArray(profile.routes))throw Error('Invalid city data profile');
  const expected=expectedBindings(dependencies,city,profile.selectorVersion);
  if(profile.routes.length!==expected.size)throw Error('Incomplete city data profile');
  for(const r of profile.routes){
   const original=canonical.get(r.canonicalSHA256),binding=expected.get(r.file);
   if(!original||original.bytes!==r.canonicalBytes||!binding||binding.canonicalSHA256!==r.canonicalSHA256||binding.occurrence!==r.occurrence||binding.selector!==r.selector||!validSHA(r.descriptor?.sha256)||!validSHA(r.orderedSelectionSHA256)||!Number.isSafeInteger(r.canonicalCount)||!Number.isSafeInteger(r.retainedCount)||r.retainedCount<0||r.retainedCount>r.canonicalCount||routes.has(key(r.file,r.canonicalSHA256,r.occurrence)))throw Error('Invalid city data route');
   expected.delete(r.file);
   if(['model-targets','group-targets'].includes(r.selector)&&(!r.partition||r.descriptor.sha256!==r.canonicalSHA256||r.retainedCount!==r.canonicalCount))throw Error('Invalid complete model partition binding');
   routes.set(key(r.file,r.canonicalSHA256,r.occurrence),r);
   addDescriptor(r.descriptor);
   if(r.partition){
    const p=r.partition,kind=r.selector==='city-rows'?'object-rows':r.selector==='model-targets'?'model-envelope':r.selector==='group-targets'?'group-envelope':['berlin-catalog','hamburg-catalog'].includes(r.selector)?'record-keys':undefined;
    if(p.schemaVersion!==1||p.kind!==kind||!Array.isArray(p.parts))throw Error('Invalid city data partition');
    if(p.kind==='model-envelope'||p.kind==='group-envelope'){
     const rowField=p.kind==='group-envelope'?'groups':'models';
     if(!p.envelope||typeof p.envelope!=='object'||Array.isArray(p.envelope)||Object.hasOwn(p.envelope,rowField)||!p.sourceLayout||typeof p.sourceLayout.prefix!=='string'||typeof p.sourceLayout.suffix!=='string'||!Array.isArray(p.sourceLayout.separators)||p.sourceLayout.separators.length!==Math.max(0,r.retainedCount-1)||p.sourceLayout.separators.some(separator=>typeof separator!=='string'||!/^\s*,\s*$/.test(separator)))throw Error('Invalid model envelope metadata');
    }
    const keys=new Set<string>(),indices=new Set<number>();
    for(const part of p.parts){
     if(!validSHA(part.descriptor?.sha256)||!Array.isArray(part.keys)||!part.keys.length)throw Error('Invalid city data partition part');
     for(const member of part.keys){if(typeof member!=='string'||!member||keys.has(member)||p.kind==='object-rows'&&!member.startsWith(city+'|'))throw Error('Invalid city data partition key');keys.add(member);}
     if(p.kind==='object-rows'||p.kind==='model-envelope'||p.kind==='group-envelope'){
      if(!Array.isArray(part.rowIndices)||!part.rowIndices.length)throw Error('Missing city data partition row order');
      if((p.kind==='model-envelope'||p.kind==='group-envelope')&&part.rowIndices.length!==part.keys.length)throw Error('Invalid model partition target order');
      for(const index of part.rowIndices){if(!Number.isSafeInteger(index)||index<0||index>=r.retainedCount||indices.has(index))throw Error('Invalid city data partition row order');indices.add(index);}
     }else if(part.rowIndices!==undefined)throw Error('Unexpected city data partition row order');
     addDescriptor(part.descriptor);
    }
    if((p.kind==='record-keys'?keys.size:indices.size)!==r.retainedCount||(p.kind==='model-envelope'||p.kind==='group-envelope')&&keys.size!==r.retainedCount)throw Error('Incomplete city data partition');
   }
  }
  if(expected.size)throw Error('Incomplete city data profile');
 }
 function resolve(sha:string,file:string,occurrence=0){
  sha=publicSource(sha);
  const selected=routes.get(key(file,sha,occurrence));if(selected)return selected.descriptor.sha256;
  if(profile&&[...routes.values()].some(r=>r.file===file))throw Error('City data initializer binding mismatch');
  return sha;
 }
 function selection(input:Selection):Selection{
  const refs:Record<string,Record<string,number>>={};
  for(const sha of input.tables){const initializers=input.initializers?.[sha];if(!initializers)throw Error('Missing frozen initializer binding');for(const [file,n]of Object.entries(initializers))for(let i=0;i<n;i++){const selected=resolve(sha,file,i),row=refs[selected]??={};row[file]=(row[file]??0)+1;}}
  return{tables:Object.keys(refs).sort(),initializers:refs};
 }
 const partition=(sha:string,file:string,occurrence=0)=>routes.get(key(file,publicSource(sha),occurrence))?.partition;
 function rowCounts(sha:string,file:string,fallback:number){const r=routes.get(key(file,publicSource(sha),0));return r?{global:r.canonicalCount,retained:r.retainedCount,city}:{global:fallback,retained:fallback,city:undefined};}
 const stats=()=>({enabled:Boolean(profile),city:profile?.city,selectorVersion:profile?.selectorVersion,admissions:Object.fromEntries([...routes.values()].filter(r=>r.selector==='city-rows').map(r=>[r.file,{global:r.canonicalCount,retained:r.retainedCount,canonicalSHA256:r.canonicalSHA256,selectedSHA256:r.descriptor.sha256}]))});
 // Only this deployed city's active provider allowlist becomes a store registry.
 // Canonical identity metadata is separate; no all-city projection accumulation.
 let effectiveDescriptors=[...descriptors.values()];
 if(profile){const needed=new Set<string>();for(const provider of activeProviders(city))for(const [sha,refs]of Object.entries(dependencies.initializers[provider]??{}))for(const [file,n]of Object.entries(refs))for(let i=0;i<n;i++){needed.add(resolve(sha,file,i));for(const part of partition(sha,file,i)?.parts??[])needed.add(part.descriptor.sha256);}effectiveDescriptors=[...needed].map(sha=>{const d=descriptors.get(sha);if(!d)throw Error('Missing selected city descriptor');return d;});}
 const effective=new Set(effectiveDescriptors.map(d=>d.sha256));
 const resolveLegacy=(sha:string)=>{sha=publicSource(sha);if(effective.has(sha))return sha;const selected=new Set([...routes.values()].filter(r=>r.canonicalSHA256===sha).map(r=>r.descriptor.sha256));if(selected.size===1)return [...selected][0];throw Error('Ambiguous legacy city table binding');};
 return{descriptors:effectiveDescriptors,resolve,resolveLegacy,selection,partition,rowCounts,stats};
}
