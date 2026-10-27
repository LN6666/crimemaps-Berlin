import type {PlanarReflectionPass,PlanarReflectionResult,PlanarReflectionSource,SolarShadowCoverage} from './planar-building-reflection';

/** Ordered sources share one capture budget. An accepted dedicated replacement
 * comes first, so the original hidden source cannot consume its draw allowance. */
export function planarReflectionGroup(sources:()=>readonly (PlanarReflectionSource|undefined)[]):PlanarReflectionSource {
 return {
  prepareSolarShadow(){for(const source of sources())source?.prepareSolarShadow?.();},
  getSolarShadowRevision(){return JSON.stringify(sources().map(source=>source?(source.getSolarShadowRevision?.()??source.getPlanarReflectionRevision()):null));},
  getSolarShadowCoverage(){
   const bounds:[number,number,number,number,number,number]=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];let triangles=0,draws=0,complete=true,any=false;const reasons:string[]=[];
   for(const [index,source] of sources().entries()){if(!source)continue;const reason=(value:string)=>{if(reasons.length<8)reasons.push(`source[${index}]:${value.slice(0,512)}`);};if(!source.getSolarShadowCoverage){complete=false;reason('coverage-unavailable');continue;}const value=source.getSolarShadowCoverage();if(!value)continue;any=true;
    if(value.bounds.length!==6||!value.bounds.every(Number.isFinite)||value.bounds.some((n,i)=>i<3&&n>value.bounds[i+3])||!Number.isSafeInteger(value.triangles)||value.triangles<0||!Number.isSafeInteger(value.draws)||value.draws<0){complete=false;reason('invalid-bounds-or-cost');continue;}
    for(let i=0;i<3;i++){bounds[i]=Math.min(bounds[i],value.bounds[i]);bounds[i+3]=Math.max(bounds[i+3],value.bounds[i+3]);}triangles+=value.triangles;draws+=value.draws;complete&&=value.complete;if(!value.complete)reason(value.reason??'source-incomplete');
   }
   if(!any&&complete)return;return {bounds:bounds.every(Number.isFinite)?bounds:[0,0,0,0,0,0],triangles,draws,complete:complete&&Number.isSafeInteger(triangles)&&Number.isSafeInteger(draws),...(reasons.length?{reason:reasons.join(';')}:!Number.isSafeInteger(triangles)||!Number.isSafeInteger(draws)?{reason:'invalid-total-cost'}:{})} as SolarShadowCoverage;
  },
  getPlanarReflectionRevision(){return JSON.stringify(sources().map(source=>source?.getPlanarReflectionRevision()??null));},
  renderPlanarReflection(pass:PlanarReflectionPass):PlanarReflectionResult {
   let triangles=0,draws=0,complete=true;
   for(const source of sources()){
    if(!source)continue;
    const remainingTriangles=Math.max(0,pass.maxTriangles-triangles),remainingDraws=Math.max(0,pass.maxDraws-draws);
    const result=source.renderPlanarReflection({...pass,maxTriangles:remainingTriangles,maxDraws:remainingDraws});
    if(!Number.isSafeInteger(result.triangles)||result.triangles<0||result.triangles>remainingTriangles||!Number.isSafeInteger(result.draws)||result.draws<0||result.draws>remainingDraws)throw Error('Resident reflection exceeded its capture budget');
    triangles+=result.triangles;draws+=result.draws;complete&&=result.complete;
   }
   return{triangles,draws,complete};
  },
 };
}
