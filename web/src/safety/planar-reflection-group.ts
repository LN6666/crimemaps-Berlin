import type {PlanarReflectionPass,PlanarReflectionResult,PlanarReflectionSource} from './planar-building-reflection';

/** Ordered sources share one capture budget. An accepted dedicated replacement
 * comes first, so the original hidden source cannot consume its draw allowance. */
export function planarReflectionGroup(sources:()=>readonly (PlanarReflectionSource|undefined)[]):PlanarReflectionSource {
 return {
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
