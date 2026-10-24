import type {BuildingComponent} from './building-mesh-renderer';
import type {ProgressiveAdmission} from './c032-original-provider';
/** Reject paint metadata only, before any renderer buffer/state replacement. Never repairs source geometry. */
export function progressivePaintValidation(c:BuildingComponent,row:ProgressiveAdmission):string|undefined{
 for(const [i,f] of (row.surfaceFrames??[]).entries()){
  const b=c.batches[f.batchIndex];
  if(!Number.isSafeInteger(f.batchIndex)||f.batchIndex<0||!b)return `surfaceFrames[${i}]: absent batch ${f.batchIndex}`;
  if(!Number.isSafeInteger(f.firstVertex)||!Number.isSafeInteger(f.vertexCount)||f.firstVertex<0||f.vertexCount<1||f.firstVertex+f.vertexCount>b.positions.length/3)return `surfaceFrames[${i}]: vertices ${f.firstVertex}+${f.vertexCount} exceed batch ${f.batchIndex} size ${b.positions.length/3}`;
  if(f.uAxis.length!==3||f.vAxis.length!==3)return `surfaceFrames[${i}]: axes must each contain exactly3 coordinates`;
  if(!Number.isInteger(f.family)||f.family<1000||(f.family>=5000&&f.family<10000||f.family>=1000000)||f.width<=0||f.height<=0||![...f.uAxis,...f.vAxis,f.uOrigin,f.vOrigin,f.width,f.height].every(Number.isFinite))return `surfaceFrames[${i}]: invalid family/coordinates`;
 }
 for(const [i,r] of (row.vertexRanges??[]).entries()){
  const b=c.batches[r.batchIndex];
  if(!Number.isSafeInteger(r.batchIndex)||r.batchIndex<0||!b||!Number.isSafeInteger(r.firstVertex)||!Number.isSafeInteger(r.vertexCount)||r.firstVertex<0||r.vertexCount<1||r.firstVertex+r.vertexCount>b.positions.length/3||r.color.length!==3||!r.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1))return `vertexRanges[${i}]: invalid batch/range/color`;
 }
 for(const k of Object.keys(row.batchColors??{}))if(!/^\d+$/.test(k)||!c.batches[Number(k)])return `batchColors[${k}]: absent source batch`;
 return undefined;
}
