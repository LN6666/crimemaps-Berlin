/** Conservative homogeneous clip test; retain uncertain/intersecting boxes. */
export function paintBoxOutsideClip(box:readonly number[],matrix:ArrayLike<number>):boolean{
 if(box.length!==6||matrix.length!==16)return false;
 for(let i=0;i<6;i++)if(!Number.isFinite(box[i]))return false;
 for(let i=0;i<16;i++)if(!Number.isFinite(matrix[i]))return false;
 let common=63;
 // Birth animation scales height from zero to one. Include its entire swept box.
 for(let xi=0;xi<2;xi++)for(let yi=0;yi<2;yi++)for(let zi=0;zi<2;zi++){
  const x=box[xi*3],y=yi?Math.max(0,box[4]):Math.min(0,box[1]),z=box[2+zi*3];
  // Preserve the four original multiply/add steps without per-corner arrays.
  const a=((0+matrix[0]*x)+matrix[4]*y)+matrix[8]*z+matrix[12],b=((0+matrix[1]*x)+matrix[5]*y)+matrix[9]*z+matrix[13],c=((0+matrix[2]*x)+matrix[6]*y)+matrix[10]*z+matrix[14],w=((0+matrix[3]*x)+matrix[7]*y)+matrix[11]*z+matrix[15];
  const e=1e-5*Math.max(1,Math.abs(a),Math.abs(b),Math.abs(c),Math.abs(w));let outside=0;
  if(a< -w-e)outside|=1;if(a>w+e)outside|=2;if(b< -w-e)outside|=4;if(b>w+e)outside|=8;if(c< -w-e)outside|=16;if(c>w+e)outside|=32;
  common&=outside;if(!common)return false;
 }
 return common!==0;
}
export function paintRunIntersectsVisible(first:number,count:number,ranges:readonly(readonly[number,number])[]):boolean{
 let lo=0,hi=ranges.length;while(lo<hi){const mid=(lo+hi)>>>1;if(ranges[mid][1]<=first)lo=mid+1;else hi=mid;}return lo<ranges.length&&ranges[lo][0]<first+count;
}

type VisibilityComponent={box:readonly number[];start:number;end:number};
type VisibilityRun={firstIndex:number;indexCount:number};
type VisibilityState={publication:object;generation:number;viewRevision:number;incarnation:number;context:object|undefined;active:boolean;retainNearPlane?:boolean};
type VisibleRows<C extends VisibilityComponent,R extends VisibilityRun>={components:C[];runs:R[]};
type VisibilitySnapshot=VisibilityState&{size:number;sourceRuns:readonly VisibilityRun[];runCount:number;projection:Float64Array|undefined;rows:VisibleRows<VisibilityComponent,VisibilityRun>};
// One last projection per accepted component map. The key is weak and the
// value owns no resource lease or callback. Candidate maps cannot replace a
// resident map's result, and retiring a map also retires its cached arrays.
const visibilitySnapshots=new WeakMap<object,VisibilitySnapshot>();
/** A renderer can remain reachable after destroying its cleared component map. */
export function forgetPaintVisibility(source:object){visibilitySnapshots.delete(source);}
/** Pure geometric selection only; program/mask/texture readiness stays live.
 * Callers install new maps/publications when boxes or index ranges change.
 * Within a publication those rows and runs are immutable; selection/growth
 * update separate state arrays (the clip test includes the whole birth box).
 * Returned arrays are borrowed read-only by the renderer. */
export function readPaintVisibility<C extends VisibilityComponent,R extends VisibilityRun>(source:ReadonlyMap<string,C>,runs:readonly R[],clip:ArrayLike<number>|undefined,state:VisibilityState):VisibleRows<C,R>{
 const cached=visibilitySnapshots.get(source);
 if(cached&&cached.publication===state.publication&&cached.generation===state.generation&&cached.viewRevision===state.viewRevision&&cached.incarnation===state.incarnation&&cached.context===state.context&&cached.active===state.active&&cached.retainNearPlane===state.retainNearPlane&&cached.size===source.size&&cached.sourceRuns===runs&&cached.runCount===runs.length){
  let same=cached.projection===undefined?clip===undefined:clip!==undefined&&cached.projection.length===clip.length;
  if(same&&clip&&cached.projection)for(let i=0;i<clip.length;i++)if(!Object.is(cached.projection[i],clip[i])){same=false;break;}
  if(same)return cached.rows as VisibleRows<C,R>;
 }
 const components:C[]=[];
 if(state.active)for(const component of source.values()){
  const box=component.box;let near=false;
  // Root500/Infill have always kept eye/near-plane uncertainty even when all
  // corners share a clip plane. Other providers keep their original clip rule.
  if(clip&&state.retainNearPlane){
   corner:for(let xi=0;xi<2;xi++)for(let yi=0;yi<2;yi++)for(let zi=0;zi<2;zi++){
    const x=box[xi*3],y=yi?Math.max(0,box[4]):Math.min(0,box[1]),z=box[2+zi*3];
    if(clip[3]*x+clip[7]*y+clip[11]*z+clip[15]<=1e-5){near=true;break corner;}
   }
  }
  if(!clip||near||!paintBoxOutsideClip(box,clip))components.push(component);
 }
 components.sort((a,b)=>a.start-b.start);
 const ranges=components.map(component=>[component.start,component.end]as const),rows={components,runs:runs.filter(run=>paintRunIntersectsVisible(run.firstIndex,run.indexCount,ranges))};
 visibilitySnapshots.set(source,{...state,size:source.size,sourceRuns:runs,runCount:runs.length,projection:clip?Float64Array.from(clip):undefined,rows});
 return rows;
}
