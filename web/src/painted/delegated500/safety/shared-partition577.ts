/** Exact source cohorts only; no shader math, geometry, or target scope changes. */
import {deferredShaderSourcePart,joinShaderSourceParts,type ShaderSourcePart} from '../../../safety/render-runtime/shader-source-budget';
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

const SHARED_PARTITION_SOURCE_AUTHORITY=Object.freeze({});
/** The same normalized cohort, counted before any normalization output exists. */
export function sharedPartition577SourcePart(programs:Record<string,string>,family:number):ShaderSourcePart|undefined{
 const cohorts:[number[],string][]=[[[4980,4981,4982,4983,4984],'chilehausSiteFacadesFull500'],[[4920,4921,4922],'internationalesMaritimesMuseumFull500']];
 for(const [members,fn]of cohorts){
  if(!members.includes(family))continue;
  const sources=members.map(member=>programs['f'+member]);if(sources.some(source=>typeof source!=='string'))return;
  const replacement='return '+fn+'(base,p,normal,frame,family);';
  const suffixes=members.map(member=>'return '+fn+'(base,p,normal,frame,'+member+'.);');
  const first=sources[0],size=first.length-suffixes[0].length+replacement.length;
  const tokens=joinShaderSourceParts([first,replacement]);
  // split() spelling plus each actual normalized output; summing those real
  // outputs also covers the previous common string during the next comparison.
  const emission=sources.reduce((sum,source,index)=>sum+source.length+Math.max(0,source.length-suffixes[index].length+replacement.length),0);
  return deferredShaderSourcePart({charactersUpperBound:Math.max(0,size),syntaxUpperBound:tokens.syntaxUpperBound,emissionCharactersUpperBound:Math.max(size,emission),authority:SHARED_PARTITION_SOURCE_AUTHORITY,authorityTrace:['shared-partition577:exact-cohort-replacement',String(family)],build(){const selected=sharedPartition577(programs,family);if(!selected)throw Error('Shared paint cohort was not certified');return selected.source;}});
 }
}
