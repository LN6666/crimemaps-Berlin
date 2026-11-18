export type TreeSurfaceLOD='near'|'far';
export function treeSurfaceLOD(previous:TreeSurfaceLOD|undefined,pixels:number):TreeSurfaceLOD{
 return pixels<=12?'far':pixels>=16?'near':previous??'near';
}
/** Conservative CSS footprint of the accepted crown envelope, including wind.
 * A near-plane crossing keeps full geometry rather than dividing by tiny w. */
export function projectedTreeCrownPixels(m:ArrayLike<number>,x:number,z:number,height:number,radius:number,width:number,heightCSS:number):number{
 if(!(width>0&&heightCSS>0))return Infinity;
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(let corner=0;corner<8;corner++){
  const px=x+(corner&1?radius:-radius),py=height*(corner&2?1:.28),pz=z+(corner&4?radius:-radius);
  const w=m[3]*px+m[7]*py+m[11]*pz+m[15];if(!(w>1e-6))return Infinity;
  const sx=(m[0]*px+m[4]*py+m[8]*pz+m[12])/w,sy=(m[1]*px+m[5]*py+m[9]*pz+m[13])/w;
  if(!Number.isFinite(sx)||!Number.isFinite(sy))return Infinity;
  minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);
 }
 return Math.max((maxX-minX)*width/2,(maxY-minY)*heightCSS/2);
}
/** No per-frame allocation: evaluate only changed camera/CSS/selection inputs.
 * Membership is pruned at publication, not retained as an unbounded city cache. */
export function createEnvironmentTreeLOD(cap:number,radius:number){
 const states=new Map<string,TreeSurfaceLOD>(),matrix=new Float64Array(16),farFlags=new Uint8Array(cap);
 let ids:readonly string[]=[],dirty=true,width=0,height=0,near=0,far=0,evaluations=0;
 return{
  farFlags,
  setSelected(next:readonly string[]){
   if(next.length>cap||new Set(next).size!==next.length)throw Error('Invalid selected tree LOD membership');
   ids=next;const keep=new Set(next);for(const id of states.keys())if(!keep.has(id))states.delete(id);
   dirty=true;near=next.length;far=0;
  },
  update(m:ArrayLike<number>,w:number,h:number,trees:Float32Array){
   let changed=dirty||w!==width||h!==height;for(let i=0;i<16&&!changed;i++)changed=m[i]!==matrix[i];
   if(!changed)return false;
   let repack=dirty;dirty=false;width=w;height=h;for(let i=0;i<16;i++)matrix[i]=m[i];near=far=0;evaluations++;
   for(let i=0;i<ids.length;i++){
    const next=treeSurfaceLOD(states.get(ids[i]),projectedTreeCrownPixels(m,trees[i*3],trees[i*3+1],trees[i*3+2],radius,w,h)),flag=Number(next==='far');
    repack ||= farFlags[i]!==flag;farFlags[i]=flag;states.set(ids[i],next);if(flag)far++;else near++;
   }
   return repack;
  },
  clear(){states.clear();ids=[];near=far=0;dirty=true;farFlags.fill(0);},
  get near(){return near;},get far(){return far;},get stateCount(){return states.size;},get evaluations(){return evaluations;}
 };
}
