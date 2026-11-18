/** Paint or solar-caster programs whose compile failed while the context stayed alive. The
 * renderers keep drawing (base colour fallback, or no scene shadow), so a review capture taken
 * in this state is not a reliable image of its target. */
type FailureList=ReadonlyArray<readonly [string,string]>|undefined;
type ProviderStats={paintProgramPartitions?:{failures?:FailureList};familyPrograms?:{failures?:FailureList};solarDepth?:{casters?:{failures?:FailureList};failures?:FailureList;legacyFailures?:FailureList;failure?:string}};
export function paintProgramFailureKeys(stats:{renderer?:{paintProviders?:Record<string,ProviderStats|undefined>}}|undefined):string[]{
 return Object.entries(stats?.renderer?.paintProviders??{}).flatMap(([provider,s])=>{
  const depth=s?.solarDepth;
  const keys=[...(s?.paintProgramPartitions?.failures??[]),...(s?.familyPrograms?.failures??[]),...(depth?.casters?.failures??[]),...(depth?.failures??[]),...(depth?.legacyFailures??[])].map(([key])=>provider+':'+key);
  if(depth?.failure?.trim())keys.push(provider+':solar-depth');
  return keys;
 });
}
