export type ProgressiveFrameRange={batchIndex:number;firstVertex:number;vertexCount:number};
export type ProgressiveFrame=ProgressiveFrameRange&{
 family:number;uAxis:readonly number[];vAxis:readonly number[];
 uOrigin:number;vOrigin:number;height:number;width:number;
};
export type ProgressiveFrameReadback={
 batchIndex:number;firstVertex:number;vertexCount:number;family:number;
 uRange:number[];vRange:number[];height:number;width:number;normal:number[];
};
type FrameComponent={readonly batches:readonly {readonly positions:ArrayLike<number>;readonly normals:ArrayLike<number>}[]};

/** For frames admitted by progressivePaintValidation: integer batch/ranges,
 * in-bounds vertices and three-coordinate axes. Keep that validation before
 * these diagnostics; this helper neither clamps nor repairs invalid metadata.
 * Each batch is a distinct vertex namespace. Sorting only the new groups
 * leaves the source frame array and its entries untouched.
 */
export function countProgressiveFrameVertices(frames:readonly ProgressiveFrameRange[]|undefined):number{
 if(!frames?.length)return 0;
 const batches=new Map<number,ProgressiveFrameRange[]>();
 for(const frame of frames){
  let group=batches.get(frame.batchIndex);
  if(!group){group=[];batches.set(frame.batchIndex,group);}
  group.push(frame);
 }
 let count=0;
 for(const group of batches.values()){
  group.sort((a,b)=>a.firstVertex-b.firstVertex);
  let end=-Infinity;
  for(const frame of group){
   const next=frame.firstVertex+frame.vertexCount;
   if(next>end){count+=next-Math.max(frame.firstVertex,end);end=next;}
  }
 }
 return count;
}

/** Same readback as the original per-vertex slice/reduce and spread min/max,
 * without retaining temporary position, u or v arrays. The explicit initial
 * zero and left-to-right additions preserve reduce's floating-point order.
 */
export function readProgressiveFrameBindings(component:FrameComponent,frames:readonly ProgressiveFrame[]|undefined):ProgressiveFrameReadback[]{
 if(!frames?.length)return [];
 return frames.map(frame=>{
  const batch=component.batches[frame.batchIndex],positions=batch.positions;
  let uMin=Infinity,uMax=-Infinity,vMin=Infinity,vMax=-Infinity;
  for(let vertex=frame.firstVertex;vertex<frame.firstVertex+frame.vertexCount;vertex++){
   const at=vertex*3,x=positions[at],y=positions[at+1],z=positions[at+2];
   const u=((0+frame.uAxis[0]*x)+frame.uAxis[1]*y)+frame.uAxis[2]*z-frame.uOrigin;
   const v=((0+frame.vAxis[0]*x)+frame.vAxis[1]*y)+frame.vAxis[2]*z-frame.vOrigin;
   uMin=Math.min(uMin,u);uMax=Math.max(uMax,u);
   vMin=Math.min(vMin,v);vMax=Math.max(vMax,v);
  }
  const normal:number[]=[],first=frame.firstVertex*3,last=Math.min(first+3,batch.normals.length);
  for(let at=first;at<last;at++)normal.push(batch.normals[at]);
  return{batchIndex:frame.batchIndex,firstVertex:frame.firstVertex,vertexCount:frame.vertexCount,family:frame.family,uRange:[uMin,uMax],vRange:[vMin,vMax],height:frame.height,width:frame.width,normal};
 });
}
