/** Work counters are not unique native-model storage vertices or measured GPU time. */
export type VehicleFrameLoad={nativeUniqueVertices:number;nativeVertexLimit:number;nativeTriangles:number;shadowTriangles:number;otherTriangles?:number;cpuFrameMs?:number;gpuFrameMs?:number};
export type VehicleWorkPlan={cap:number;nearCap:number;fps:number;maxVehicleReferencedVertices:number;maxVehicleTriangles:number;pressure:number;binding:'load-provided'|'unbound-conservative';nativeUniqueVertices:number;nativeVertexLimit:number;otherSubmittedTriangles:number};
export function planVehicleFrameWork(mobile:boolean,load?:VehicleFrameLoad):VehicleWorkPlan{
 if(load){for(const key of ['nativeUniqueVertices','nativeVertexLimit','nativeTriangles','shadowTriangles'] as const)if(!Number.isFinite(load[key]))throw Error('Missing vehicle load counter '+key);for(const [key,value]of Object.entries(load))if(value!==undefined&&(!Number.isFinite(value)||value!<0))throw Error('Invalid vehicle frame load '+key);if(load.nativeVertexLimit<=0)throw Error('Invalid native vertex limit');}
 const occupancy=load?load.nativeUniqueVertices/load.nativeVertexLimit:1,triangles=load?load.nativeTriangles+load.shadowTriangles+(load.otherTriangles??0):0;
 const pressure=load?Math.max(occupancy,triangles/(mobile?400000:800000),(load.cpuFrameMs??0)/(mobile?24:18),(load.gpuFrameMs??0)/(mobile?24:18)):1;
 // Native occupancy informs pressure; it is never subtracted from a heterogeneous vertex-work counter.
 const high=pressure>=.95;
 return {cap:mobile?768:2048,nearCap:0,fps:pressure>=1.5?(mobile?6:10):high?(mobile?8:12):(mobile?12:18),maxVehicleReferencedVertices:mobile?33792:90112,maxVehicleTriangles:mobile?16896:45056,pressure,binding:load?'load-provided':'unbound-conservative',nativeUniqueVertices:load?.nativeUniqueVertices??0,nativeVertexLimit:load?.nativeVertexLimit??(mobile?100000:200000),otherSubmittedTriangles:triangles};
}
/** Uniform 22-triangle shell at every zoom: no zoom-driven enlargement or expensive model. */
export function vehicleNearCount(){return 0;}
