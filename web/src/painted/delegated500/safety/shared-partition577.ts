/** Exact source cohorts only; no shader math, geometry, or target scope changes. */
export function sharedPartition577(programs:Record<string,string>,family:number):{key:string;source:string}|undefined{
 const cohorts:[number[],string][]=[[[4980,4981,4982,4983,4984],'chilehausSiteFacadesFull500'],[[4920,4921,4922],'internationalesMaritimesMuseumFull500']];
 for(const [members,fn] of cohorts){
  if(!members.includes(family))continue;
  let common:string|undefined;
  for(const member of members){
   const source=programs['f'+member];if(typeof source!=='string')return;
   const suffix='return '+fn+'(base,p,normal,frame,'+member+'.);';
   if(source.split(suffix).length!==2)return;
   const normalized=source.replace(suffix,'return '+fn+'(base,p,normal,frame,family);');
   if(common!==undefined&&common!==normalized)return;
   common=normalized;
  }
  return {key:'shared577-'+members[0],source:common!};
 }
}
