import {HAMBURG_PROGRAM_FAMILIES} from './progressive-hamburg-programs';
// Shared, recovery and supplement keys require their original multi-family code.
const singleFamilies=new Map<string,number>(),shared=new Set<string>();
for(const [family,key] of Object.entries(HAMBURG_PROGRAM_FAMILIES)){
 if(singleFamilies.has(key)){shared.add(key);continue;}
 singleFamilies.set(key,Number(family));
}
for(const key of shared)singleFamilies.delete(key);
export function hamburgPartitionFamily(sourceKey:string):number|undefined{
 return sourceKey.startsWith('partition:')?singleFamilies.get(sourceKey.slice(10)):undefined;
}
