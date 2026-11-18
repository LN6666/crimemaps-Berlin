/** Component-local far-detail candidates. No files, data admission or runtime
 * installation are owned here. Attribute branches and source metadata survive. */
const FIELDS=new Set(['positions','normals','indices','color','materialName','faceRole']);
const DEFAULTS={maxVertices:200000,maxTriangles:400000,maxErrorSamples:1200000,maxMilliseconds:120000};
const check=(condition,message)=>{if(!condition)throw Error(message);};
const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const point=(array,index)=>Array.from(array.subarray(index*3,index*3+3));
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const exactDot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0n);
const exactSub=(a,b)=>a.map((v,i)=>v-b[i]);
const exactCross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sameBits=(before,after)=>before.length===after.length&&new Uint8Array(before.buffer,before.byteOffset,before.byteLength).every((v,i)=>v===new Uint8Array(after.buffer,after.byteOffset,after.byteLength)[i]);
function boundaryLoops(edges){
  const next=new Map(),incoming=new Map();
  for(const [a,b] of edges){if(next.has(a)||incoming.has(b))return;next.set(a,b);incoming.set(b,a);}
  if([...next.keys()].some(v=>!incoming.has(v)))return;
  const remaining=new Set(next.keys()),loops=[];
  while(remaining.size){const first=remaining.values().next().value,loop=[];let at=first;
    do{if(!remaining.delete(at))return;loop.push(at);at=next.get(at);}while(at!==first);
    if(loop.length<3)return;loops.push(loop);
  }
  return loops;
}
function topology(triangles){
  const edges=new Map(),used=new Set(),parent=new Map();
  const root=v=>{while(parent.get(v)!==v){parent.set(v,parent.get(parent.get(v)));v=parent.get(v);}return v;};
  const join=(a,b)=>{a=root(a);b=root(b);if(a!==b)parent.set(b,a);};
  for(const triangle of triangles){const ids=triangle.geo??triangle;
    if(new Set(ids).size!==3)return;
    for(const v of ids){used.add(v);if(!parent.has(v))parent.set(v,v);}
    for(let i=0;i<3;i++){const a=ids[i],b=ids[(i+1)%3],key=edgeKey(a,b),rows=edges.get(key)??[];rows.push({a,b,triangle});edges.set(key,rows);join(a,b);}
  }
  if([...edges.values()].some(rows=>rows.length>2||rows.length===2&&rows[0].a===rows[1].a))return;
  const loops=boundaryLoops([...edges.values()].filter(rows=>rows.length===1).map(rows=>[rows[0].a,rows[0].b]));
  if(!loops)return;
  return {edges,loops,components:new Set([...used].map(root)).size,euler:used.size-edges.size+triangles.length};
}
/** Source batches may wind one surface opposite to its neighbours, e.g. walls
 * extruded from a clockwise footprint ring under a counter-clockwise roof. The
 * analysis needs one coherent orientation; emitted triangles keep their own
 * original winding. Returns the triangles whose analysis winding is reversed
 * (the smaller class of each connected surface), or undefined when no coherent
 * orientation exists: degenerate triangles, edges with more than two faces, or
 * contradictory/non-orientable adjacency. Nothing is welded or reordered. */
function coherentOrientation(triangles){
  const edges=new Map();
  for(const triangle of triangles){const ids=triangle.geo??triangle;
    if(new Set(ids).size!==3)return;
    for(let i=0;i<3;i++){const a=ids[i],b=ids[(i+1)%3],key=edgeKey(a,b),rows=edges.get(key)??[];rows.push({triangle,a});if(rows.length>2)return;edges.set(key,rows);}
  }
  const adjacent=new Map(triangles.map(triangle=>[triangle,[]]));
  for(const rows of edges.values())if(rows.length===2){const [x,y]=rows,same=x.a===y.a;adjacent.get(x.triangle).push([y.triangle,same]);adjacent.get(y.triangle).push([x.triangle,same]);}
  const state=new Map(),reversed=new Set();
  for(const seed of triangles){
    if(state.has(seed))continue;
    const members=[seed];state.set(seed,0);
    for(let at=0;at<members.length;at++){const triangle=members[at],value=state.get(triangle);
      for(const [other,same] of adjacent.get(triangle)){const want=same?1-value:value;
        if(!state.has(other)){state.set(other,want);members.push(other);}else if(state.get(other)!==want)return;}
    }
    const ones=members.filter(triangle=>state.get(triangle)===1).length,flip=ones*2>members.length?0:1;
    for(const triangle of members)if(state.get(triangle)===flip)reversed.add(triangle);
  }
  return reversed;
}
const reverse=ids=>[ids[0],ids[2],ids[1]];
const emittedIndices=triangle=>triangle.reversed?reverse(triangle.indices):triangle.indices;
const orientedKey=([batchIndex,ids])=>{const at=ids.indexOf(Math.min(...ids));return `${batchIndex}|${ids[at]},${ids[(at+1)%3]},${ids[(at+2)%3]}`;};
/** Orientation-sensitive multiset equality of [batchIndex, [a,b,c]] rows over
 * welded vertex ids. A cyclic rotation is the same oriented triangle; a
 * reversed triangle, another batch or a different multiplicity is not. */
export function sameOrientedTriangleRows(actual,expected){
  const valid=row=>Array.isArray(row)&&Number.isSafeInteger(row[0])&&Array.isArray(row[1])&&row[1].length===3&&row[1].every(Number.isSafeInteger);
  if(!Array.isArray(actual)||!Array.isArray(expected)||actual.length!==expected.length||!actual.every(valid)||!expected.every(valid))return false;
  const counts=new Map();for(const row of expected){const key=orientedKey(row);counts.set(key,(counts.get(key)??0)+1);}
  for(const row of actual){const key=orientedKey(row),n=counts.get(key);if(!n)return false;counts.set(key,n-1);}
  return true;
}
/** Emitted batch triangles as [batchIndex, welded ids], read back from the
 * output arrays themselves so remapping and winding restoration are checked. */
function emittedRows(batches,lookup){
  const rows=[];
  for(const [batchIndex,batch] of batches.entries()){const bits=new Uint32Array(batch.positions.buffer,batch.positions.byteOffset,batch.positions.length);
    for(let at=0;at<batch.indices.length;at+=3)rows.push([batchIndex,Array.from(batch.indices.subarray(at,at+3),id=>lookup.get(Array.from(bits.subarray(id*3,id*3+3)).join(',')))]);}
  return rows;
}

/** Float32 coordinates are dyadic integers on a common scale. BigInt plane
 * tests distinguish exact coplanarity from a user-visible tolerance change. */
function exactPoints(points){
  const bits=new Uint32Array(new Float32Array(points.flat()).buffer),values=[];let minimum=Infinity;
  for(const bits32 of bits){const exponent=bits32>>>23&255,mantissa=bits32&0x7fffff,magnitude=exponent?mantissa+0x800000:mantissa,power=exponent?exponent-150:-149;
    values.push({value:BigInt(magnitude)*(bits32>>>31?-1n:1n),power});if(magnitude)minimum=Math.min(minimum,power);
  }
  if(minimum===Infinity)minimum=0;
  const out=[];for(let i=0;i<values.length;i+=3)out.push(values.slice(i,i+3).map(({value,power})=>value===0n?0n:value<<BigInt(power-minimum)));
  return out;
}
function planeFor(ids,exact){const a=exact[ids[0]],normal=exactCross(exactSub(exact[ids[1]],a),exactSub(exact[ids[2]],a));return normal.some(v=>v!==0n)?{a,normal}:undefined;}
const onPlane=(plane,ids,exact)=>ids.every(id=>exactDot(plane.normal,exactSub(exact[id],plane.a))===0n);

/** Return a distance upper bound using an explicit convex-combination witness
 * in the target triangle. Rounding allowance covers witness arithmetic, not a
 * geometric tolerance. No nearest-distance sample is treated as a certificate. */
function distanceUpper(p,triangle){
  const [a,b,c]=triangle,ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);let weights;
  if(d1<=0&&d2<=0)weights=[1,0,0];
  else{const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);
    if(d3>=0&&d4<=d3)weights=[0,1,0];
    else{const vc=d1*d4-d3*d2;
      if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);weights=[1-v,v,0];}
      else{const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);
        if(d6>=0&&d5<=d6)weights=[0,0,1];
        else{const vb=d5*d2-d1*d6;
          if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);weights=[1-w,0,w];}
          else{const va=d3*d6-d5*d4;
            if(va<=0&&d4-d3>=0&&d5-d6>=0){const w=(d4-d3)/(d4-d3+d5-d6);weights=[0,1-w,w];}
            else{const denominator=va+vb+vc;weights=Number.isFinite(denominator)&&denominator!==0?[va/denominator,vb/denominator,vc/denominator]:[1,0,0];}
          }
        }
      }
    }
  }
  weights=weights.map(v=>Number.isFinite(v)?Math.max(0,v):0);let sum=weights.reduce((s,v)=>s+v,0);if(!sum){weights=[1,0,0];sum=1;}
  const witness=a.map((_,axis)=>(weights[0]*a[axis]+weights[1]*b[axis]+weights[2]*c[axis])/sum);
  const scale=Math.max(1,...p.map(Math.abs),...triangle.flat().map(Math.abs));
  return Math.hypot(...sub(p,witness))*(1+64*Number.EPSILON)+scale*256*Number.EPSILON;
}
async function certify(before,after,maximum,context){
  let bound=0;
  for(const [from,to] of [[before,after],[after,before]])for(const triangle of from){
    const stack=[{triangle,padding:0,depth:0}];
    while(stack.length){
      context.assert();const cell=stack.pop();let best=Infinity;
      for(const target of to){
        if(context.work.errorSamples+3>context.limits.maxErrorSamples)return {reason:'surface-certificate-work-bound'};
        context.work.errorSamples+=3;context.stats.certificateTriangleTests++;
        const upper=Math.max(...cell.triangle.map(p=>distanceUpper(p,target)))+cell.padding;best=Math.min(best,upper);
        if(best<=maximum)break;
        if(context.stats.certificateTriangleTests%256===0)await context.yield();
      }
      context.stats.certificateCells++;
      if(best<=maximum){bound=Math.max(bound,best);continue;}
      if(cell.depth===20)return {reason:'surface-certificate-depth-bound'};
      const [a,b,c]=cell.triangle,mid=(p,q)=>p.map((v,i)=>(v+q[i])*.5),ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);
      const magnitude=Math.max(1,...cell.triangle.flat().map(Math.abs)),padding=cell.padding+magnitude*4*Number.EPSILON,depth=cell.depth+1;
      stack.push(...[[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]].map(triangle=>({triangle,padding,depth})));context.stats.subdivisions++;
      if(context.stats.subdivisions%64===0)await context.yield();
    }
  }
  return {bound};
}

/** Exact separation is sufficient, never a floating epsilon intersection guess.
 * An equality contact is allowed only when one exposed simplex consists solely
 * of the original vertices shared by these two triangles. */
function separatedOrSharedContact(a,b,exact){
  const shared=new Set(a.filter(id=>b.includes(id)));if(shared.size===3)return false;
  const pa=a.map(id=>exact[id]),pb=b.map(id=>exact[id]),ea=pa.map((p,i)=>exactSub(pa[(i+1)%3],p)),eb=pb.map((p,i)=>exactSub(pb[(i+1)%3],p)),na=exactCross(ea[0],ea[1]),nb=exactCross(eb[0],eb[1]);
  const axes=[na,nb,...ea.flatMap(x=>eb.map(y=>exactCross(x,y))),...ea.map(edge=>exactCross(na,edge)),...eb.map(edge=>exactCross(nb,edge))];
  for(const axis of axes){if(!axis.some(v=>v!==0n))continue;const aa=pa.map(p=>exactDot(axis,p)),bb=pb.map(p=>exactDot(axis,p)),amin=aa.reduce((v,p)=>p<v?p:v),amax=aa.reduce((v,p)=>p>v?p:v),bmin=bb.reduce((v,p)=>p<v?p:v),bmax=bb.reduce((v,p)=>p>v?p:v);
    if(amax<bmin||bmax<amin)return true;
    const exposed=(values,ids,at)=>ids.filter((_,i)=>values[i]===at).every(id=>shared.has(id));
    if(amax===bmin&&(exposed(aa,a,amax)||exposed(bb,b,bmin)))return true;
    if(bmax===amin&&(exposed(bb,b,bmax)||exposed(aa,a,amin)))return true;
  }
  return false;
}
async function noSelfIntersections(triangles,points,exact,context){
  const rows=triangles.map(triangle=>{const ids=triangle.geo??triangle;return{ids,min:[0,1,2].map(axis=>Math.min(...ids.map(id=>points[id][axis]))),max:[0,1,2].map(axis=>Math.max(...ids.map(id=>points[id][axis])))};});
  for(let i=0;i<rows.length;i++)for(let j=0;j<i;j++){
    context.assert();if(context.work.intersectionTests>=context.limits.maxErrorSamples)return {reason:'intersection-certificate-work-bound'};
    context.work.intersectionTests++;context.stats.intersectionPairTests++;
    const a=rows[i],b=rows[j];
    if(![0,1,2].some(axis=>a.max[axis]<b.min[axis]||b.max[axis]<a.min[axis])&&!separatedOrSharedContact(a.ids,b.ids,exact))return {reason:'unproven-triangle-separation'};
    if(context.stats.intersectionPairTests%256===0)await context.yield();
  }
  return {clear:true};
}
const branchKey=triangle=>`${triangle.batchIndex}|${triangle.normal}`;
function branchTriangles(triangles){const groups=new Map();for(const triangle of triangles){const key=branchKey(triangle),rows=groups.get(key)??[];rows.push(triangle.geo);groups.set(key,rows);}return groups;}
async function certifyBranches(before,after,points,maximum,context){
  const original=branchTriangles(before),candidate=branchTriangles(after);let bound=0;
  if(original.size!==candidate.size)return {reason:'original-attribute-branch-missing'};
  for(const [key,triangles] of original){
    const next=candidate.get(key);if(!next)return {reason:'original-attribute-branch-missing'};
    // Exact same branch triangles need no distance samples or another mesh's
    // surface as a witness. Changed branches are each proved independently.
    if(triangles.length===next.length&&triangles.every((ids,i)=>ids.every((id,k)=>id===next[i][k])))continue;
    const result=await certify(triangles.map(ids=>ids.map(id=>points[id])),next.map(ids=>ids.map(id=>points[id])),maximum,context);
    if(result.reason)return result;bound=Math.max(bound,result.bound);context.stats.branchCertificates++;
  }
  return {bound,branches:original.size};
}

/** Coordinate one geometric collapse across every original attribute branch.
 * A destination missing even one batch+normal tuple cannot be manufactured.
 * A smaller-error level's accepted collapse sequence may seed this level. Each
 * replayed step must pass the same guard (current edge, locks, branch cover,
 * link condition, open-boundary rule) and topology admissibility as the greedy
 * search; per-step surface certificates are not repeated, instead the complete
 * replayed state is certified against the original surface at this level's
 * bound before any further collapse. Any rejected step discards the seed. */
async function coordinatedCollapse(component,triangles,points,exact,beforeTopology,patches,level,context,seed){
  const holeLocks=new Set(),holeEdges=new Set();
  for(const patch of patches){const info=topology(patch.triangles);if(!info?.loops.length)continue;
    let axis=0;for(let k=1;k<3;k++)if((patch.plane.normal[k]<0n?-patch.plane.normal[k]:patch.plane.normal[k])>(patch.plane.normal[axis]<0n?-patch.plane.normal[axis]:patch.plane.normal[axis]))axis=k;
    const axes=[0,1,2].filter(k=>k!==axis),area=loop=>loop.reduce((sum,id,i)=>{const a=exact[id],b=exact[loop[(i+1)%loop.length]];return sum+a[axes[0]]*b[axes[1]]-a[axes[1]]*b[axes[0]];},0n);
    const loops=info.loops.map(ids=>({ids,area:area(ids)})).sort((a,b)=>{const aa=a.area<0n?-a.area:a.area,bb=b.area<0n?-b.area:b.area;return aa>bb?-1:aa<bb?1:0;});
    if(loops.some(loop=>loop.area===0n)||loops.slice(1).some(loop=>(loop.area>0n)===(loops[0].area>0n)))return {reason:'unproven-component-hole-classification'};
    for(const loop of loops.slice(1))for(const [at,id] of loop.ids.entries()){holeLocks.add(id);holeEdges.add(edgeKey(id,loop.ids[(at+1)%loop.ids.length]));}
  }
  if(component.componentGeometry.coordinates?.length>1&&!holeLocks.size)return {reason:'unmapped-component-hole-boundaries'};
  // An open-bottom courtyard wall has a lower hole rim that is a component
  // boundary, not an inner loop of any one planar wall patch. Without a proved
  // global loop nesting classification, lock every open rim of a holed source.
  // The closed upper exterior contour can still be simplified within its bound.
  if(component.componentGeometry.coordinates?.length>1)for(const loop of beforeTopology.loops)for(const [at,id] of loop.entries()){
    holeLocks.add(id);holeEdges.add(edgeKey(id,loop[(at+1)%loop.length]));
  }
  const branches=new Map();
  for(const triangle of triangles)for(let i=0;i<3;i++){const key=`${triangle.batchIndex}|${triangle.normal}`,at=branches.get(triangle.geo[i])??new Map();at.set(key,triangle.indices[i]);branches.set(triangle.geo[i],at);}
  const seamDegree=new Map();
  for(const rows of beforeTopology.edges.values()){
    const seam=rows.length===1||rows[0].triangle.batchIndex!==rows[1].triangle.batchIndex||rows[0].triangle.normal!==rows[1].triangle.normal;
    if(seam)for(const id of [rows[0].a,rows[0].b])seamDegree.set(id,(seamDegree.get(id)??0)+1);
  }
  const locked=new Set([...holeLocks,...[...seamDegree].filter(([,degree])=>degree!==2).map(([id])=>id)]);
  const originalBranches=new Set(triangles.map(triangle=>`${triangle.batchIndex}|${triangle.normal}`));
  const collapse=(current,from,to)=>{
    const destination=branches.get(to),candidate=[];
    for(const triangle of current){
      if(!triangle.geo.includes(from)){candidate.push(triangle);continue;}
      const geo=triangle.geo.map(id=>id===from?to:id);if(new Set(geo).size!==3)continue;
      const plane=planeFor(geo,exact);if(!plane||exactDot(triangle.plane.normal,plane.normal)<=0n)return;
      const key=`${triangle.batchIndex}|${triangle.normal}`,indices=triangle.indices.map((id,i)=>triangle.geo[i]===from?destination.get(key):id);
      candidate.push({...triangle,geo,indices});
    }
    return candidate;
  };
  // Returns the candidate's topology when it is admissible, otherwise false.
  const admissible=candidate=>{
    const after=candidate&&topology(candidate);if(!after)return false;
    const retainedBranches=new Set(candidate.map(triangle=>`${triangle.batchIndex}|${triangle.normal}`));
    return retainedBranches.size===originalBranches.size&&after.components===beforeTopology.components&&after.euler===beforeTopology.euler&&after.loops.length===beforeTopology.loops.length&&
      ![...holeLocks].some(id=>!candidate.some(t=>t.geo.includes(id)))&&![...holeEdges].some(key=>after.edges.get(key)?.length!==beforeTopology.edges.get(key).length)&&after;
  };
  // One collapse rule for the greedy search and for a replayed seed.
  const guard=(current,info,from,to)=>{
    const edge=info.edges.get(edgeKey(from,to));if(!edge||locked.has(from)||holeLocks.has(to))return false;
    const source=branches.get(from),destination=branches.get(to);if(!source||!destination)return false;
    if([...source.keys()].some(key=>!destination.has(key))){context.stats.missingDestinationBranches++;return false;}
    if(!current.some(triangle=>triangle.geo.includes(from)))return false;
    const neighbours=id=>new Set(current.filter(t=>t.geo.includes(id)).flatMap(t=>t.geo.filter(v=>v!==id))),linkA=neighbours(from),linkB=neighbours(to),edgeLink=new Set(current.filter(t=>t.geo.includes(from)&&t.geo.includes(to)).flatMap(t=>t.geo.filter(v=>v!==from&&v!==to)));
    if([...linkA].filter(id=>linkB.has(id)).some(id=>!edgeLink.has(id)))return false;
    // An open-boundary vertex may only move along an open-boundary edge.
    return !([...info.edges.values()].some(rows=>rows.length===1&&(rows[0].a===from||rows[0].b===from))&&edge.length!==1);
  };
  let current=triangles,errorBoundM=0,attempts=0;const sequence=[];
  if(seed?.length){
    let replay=triangles,info=beforeTopology;
    for(const [from,to] of seed){
      await context.yield();
      const candidate=guard(replay,info,from,to)?collapse(replay,from,to):undefined,after=admissible(candidate);
      if(!after){replay=triangles;break;}
      replay=candidate;info=after;
    }
    if(replay!==triangles){
      const separated=await noSelfIntersections(replay,points,exact,context);
      const certificate=separated.reason?separated:await certifyBranches(triangles,replay,points,level.maxErrorM,context);
      if(certificate.reason==='surface-certificate-work-bound'||certificate.reason==='intersection-certificate-work-bound')return {reason:certificate.reason};
      if(!certificate.reason){current=replay;errorBoundM=certificate.bound;sequence.push(...seed);context.stats.seededCollapses+=seed.length;}
    }
  }
  const target=Math.max(1,Math.floor(triangles.length*level.ratio));
  while(current.length>target&&attempts<128){
    context.assert();const info=topology(current);if(!info)break;
    const edges=[...info.edges.values()].map(rows=>[rows[0].a,rows[0].b]).sort((a,b)=>Math.hypot(...sub(points[a[0]],points[a[1]]))-Math.hypot(...sub(points[b[0]],points[b[1]]))||a[0]-b[0]||a[1]-b[1]);let accepted=false;
    for(const [a,b] of edges){
      if(++context.stats.collapseEdgeScans%256===0)await context.yield();
      for(const [from,to] of [[a,b],[b,a]]){
        if(!guard(current,info,from,to))continue;
        if(++attempts>128)break;context.stats.collapseAttempts++;
        const candidate=collapse(current,from,to);
        if(!admissible(candidate))continue;
        const separated=await noSelfIntersections(candidate,points,exact,context);
        if(separated.reason==='intersection-certificate-work-bound')return current!==triangles?{triangles:current,errorBoundM,sequence}:{reason:separated.reason};
        if(separated.reason)continue;
        const certificate=await certifyBranches(triangles,candidate,points,level.maxErrorM,context);
        if(certificate.reason==='surface-certificate-work-bound')return current!==triangles?{triangles:current,errorBoundM,sequence}:{reason:certificate.reason};
        if(certificate.reason)continue;
        current=candidate;errorBoundM=certificate.bound;accepted=true;sequence.push([from,to]);context.stats.coordinatedCollapses++;await context.yield();break;
      }
      if(accepted||attempts>=128)break;
    }
    if(!accepted)break;
  }
  return current!==triangles?{triangles:current,errorBoundM,sequence}:{reason:'no-safe-coordinated-collapse'};
}

function compactBatches(component,triangles){
  return component.batches.map((batch,batchIndex)=>{
    const ids=triangles.filter(triangle=>triangle.batchIndex===batchIndex).flatMap(triangle=>emittedIndices(triangle));
    if(ids.length===batch.indices.length&&ids.every((id,i)=>id===batch.indices[i]))return batch;
    const original=[...new Set(ids)],remap=new Map(original.map((id,i)=>[id,i])),positions=new Float32Array(original.length*3),normals=new Float32Array(original.length*3);
    original.forEach((id,i)=>{positions.set(batch.positions.subarray(id*3,id*3+3),i*3);normals.set(batch.normals.subarray(id*3,id*3+3),i*3);});
    return {...batch,positions,normals,indices:Uint32Array.from(ids,id=>remap.get(id))};
  });
}

function certificateProof(maximum,extra={}){return {status:'far-display-candidate-only',metric:'per-original-batch-normal-branch-bidirectional-adaptive-subtriangle-convex-target-upper-bound',hausdorffBound:true,hausdorffUpperBound:true,maximumAllowedM:maximum,originalVertexSubset:true,exactAttributeBranches:true,materialGroupsSeparate:true,holesPreserved:true,attributeBranchesPreserved:true,topologyPreserved:true,selfIntersectionsExcluded:true,intersectionPredicate:'exact-dyadic-separation-or-shared-original-simplex-contact',nearCanonicalUnchanged:true,...extra};}
async function ready(simplifier,context,signal,deadline){
  let timer,onAbort;
  const stop=new Promise((_,reject)=>{onAbort=()=>reject(new DOMException('Building boundary generation aborted','AbortError'));signal?.addEventListener('abort',onAbort,{once:true});timer=setTimeout(()=>reject(Error('Building boundary generation time bound exceeded')),Math.max(1,deadline-Date.now()));});
  try{await Promise.race([Promise.resolve(simplifier.ready),stop]);}finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);}
  context.assert();
}

/** Coordinate geometry collapses without crossing original attribute branches;
 * the fallback simplifies exact coplanar patches with locked semantic seams.
 * Context.protected is supplied by the producer's complete ownership inspection. */
export async function simplifyBuildingDetailComponent(component,level,{simplifier,signal,deadline=Date.now()+DEFAULTS.maxMilliseconds,limits={},work={errorSamples:0},protected:protectedObject=false,seed}={}){
  const stats={inputTriangles:0,patches:0,eligiblePatches:0,simplifierCalls:0,changedPatches:0,certificateTriangleTests:0,certificateCells:0,subdivisions:0,collapseAttempts:0,collapseEdgeScans:0,coordinatedCollapses:0,seededCollapses:0,missingDestinationBranches:0,intersectionPairTests:0,branchCertificates:0,reorientedTriangles:0};
  check(seed===undefined||Array.isArray(seed)&&seed.length<=4096&&seed.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(id=>Number.isSafeInteger(id)&&id>=0)),'Invalid previous-level collapse seed');
  const hold=(reason,extra={})=>({component,changed:false,errorBoundM:0,reason,proof:{status:'canonical-unchanged',...extra},stats});
  const context={stats,work,limits:Object.fromEntries(Object.entries(DEFAULTS).map(([k,v])=>[k,Math.min(v,limits[k]??v)])),assert(){if(signal?.aborted)throw new DOMException('Building boundary generation aborted','AbortError');check(Date.now()<=deadline,'Building boundary generation time bound exceeded');},async yield(){await new Promise(resolve=>setImmediate(resolve));this.assert();}};
  check(Number.isSafeInteger(work.errorSamples)&&work.errorSamples>=0,'Invalid shared certificate work counter');
  work.intersectionTests??=0;check(Number.isSafeInteger(work.intersectionTests)&&work.intersectionTests>=0,'Invalid shared intersection work counter');
  check(Object.values(context.limits).every(v=>Number.isSafeInteger(v)&&v>0),'Invalid building boundary limits');
  context.assert();check(level&&level.ratio>0&&level.ratio<1&&Number.isFinite(level.maxErrorM)&&level.maxErrorM>0&&level.maxErrorM<=.25,'Invalid building detail target');
  if(protectedObject)return hold('protected-canonical-object');
  if(!component||!Array.isArray(component.batches)||!component.batches.length)return hold('invalid-component');
  if(component.componentGeometry?.type!=='Polygon')return hold('unproven-component-geometry');
  if(['church','cathedral','chapel'].includes(component.sourceFeature?.properties?.building)||component.sourceFeature?.properties?.amenity==='place_of_worship')return hold('protected-source-worship');
  if(!simplifier||typeof simplifier.simplifyWithAttributes!=='function')return hold('attribute-simplifier-required');
  await context.yield();await ready(simplifier,context,signal,deadline);
  const points=[],lookup=new Map(),batchGeometry=[],triangles=[];let vertices=0;
  for(const [batchIndex,batch] of component.batches.entries()){
    if(Object.keys(batch).some(key=>!FIELDS.has(key)))return hold('unknown-uv-frame-or-material-attributes');
    if(!(batch.positions instanceof Float32Array)||!(batch.normals instanceof Float32Array)||!(batch.indices instanceof Uint32Array)||batch.positions.length%3||batch.normals.length!==batch.positions.length||!batch.positions.every(Number.isFinite)||!batch.normals.every(Number.isFinite)||!batch.indices.length||batch.indices.length%3||!batch.indices.every(i=>i<batch.positions.length/3))return hold('invalid-batch-attributes');
    if(batch.positions.length/3>(limits.maxBatchVertices??100000)||batch.indices.length/3>(limits.maxBatchTriangles??200000))return hold('batch-work-bound');
    vertices+=batch.positions.length/3;stats.inputTriangles+=batch.indices.length/3;
    if(vertices>context.limits.maxVertices||stats.inputTriangles>context.limits.maxTriangles)return hold('component-work-bound');
    const pbits=new Uint32Array(batch.positions.buffer,batch.positions.byteOffset,batch.positions.length),nbits=new Uint32Array(batch.normals.buffer,batch.normals.byteOffset,batch.normals.length),ids=[];
    for(let i=0;i<batch.positions.length;i+=3){const key=Array.from(pbits.subarray(i,i+3)).join(',');let id=lookup.get(key);if(id===undefined){id=points.length;lookup.set(key,id);points.push(Array.from(batch.positions.subarray(i,i+3)));}ids.push(id);}
    batchGeometry.push(ids);
    for(let at=0;at<batch.indices.length;at+=3){const indices=Array.from(batch.indices.subarray(at,at+3)),normals=indices.map(i=>Array.from(nbits.subarray(i*3,i*3+3)).join(','));
      if(new Set(normals).size!==1)return hold('nonconstant-triangle-normal-branch');
      triangles.push({geo:indices.map(i=>ids[i]),indices,batchIndex,normal:normals[0],at});
    }
    await context.yield();
  }
  // Analyse one coherent orientation; emittedIndices restores each original winding.
  const reoriented=coherentOrientation(triangles);if(!reoriented)return hold('component-nonmanifold-or-open-boundary-branch');
  for(const triangle of reoriented){triangle.geo=reverse(triangle.geo);triangle.indices=reverse(triangle.indices);triangle.reversed=true;}
  stats.reorientedTriangles=reoriented.size;
  const exact=exactPoints(points),beforeTopology=topology(triangles);if(!beforeTopology)return hold('component-nonmanifold-or-open-boundary-branch');
  for(const triangle of triangles){triangle.plane=planeFor(triangle.geo,exact);if(!triangle.plane)return hold('geometric-degenerate-triangle');}
  const separatedSource=await noSelfIntersections(triangles,points,exact,context);if(separatedSource.reason)return hold(separatedSource.reason==='intersection-certificate-work-bound'?separatedSource.reason:'unproven-source-triangle-separation');
  const remaining=new Set(triangles),patches=[];
  while(remaining.size){const first=remaining.values().next().value,patch={triangles:[],plane:first.plane,batchIndex:first.batchIndex,normal:first.normal},stack=[first];remaining.delete(first);
    while(stack.length){const triangle=stack.pop();triangle.patch=patch;patch.triangles.push(triangle);
      for(let i=0;i<3;i++)for(const {triangle:other} of beforeTopology.edges.get(edgeKey(triangle.geo[i],triangle.geo[(i+1)%3]))){
        if(remaining.has(other)&&other.batchIndex===patch.batchIndex&&other.normal===patch.normal&&onPlane(patch.plane,other.geo,exact)&&exactDot(patch.plane.normal,other.plane.normal)>0n){remaining.delete(other);stack.push(other);}
      }
    }
    patches.push(patch);await context.yield();
  }
  stats.patches=patches.length;
  const globalHoleRimVertices=new Set(component.componentGeometry.coordinates?.length>1?beforeTopology.loops.flat():[]);
  const globalHoleRimEdges=new Set(component.componentGeometry.coordinates?.length>1?[...beforeTopology.edges].filter(([,rows])=>rows.length===1).map(([key])=>key):[]);
  const coordinated=await coordinatedCollapse(component,triangles,points,exact,beforeTopology,patches,level,context,seed);
  if(coordinated.triangles){
    const batches=compactBatches(component,coordinated.triangles);
    // The emitted arrays must be exactly the certified analysis state with each
    // recorded original-winding reversal restored, triangle by triangle.
    if(!sameOrientedTriangleRows(emittedRows(batches,lookup),coordinated.triangles.map(triangle=>[triangle.batchIndex,triangle.reversed?reverse(triangle.geo):triangle.geo])))return hold('component-topology-validation-failed');
    return {component:{...component,batches},changed:true,errorBoundM:coordinated.errorBoundM,normalDeviationRad:0,reason:'certified-coordinated-component-collapse',proof:certificateProof(level.maxErrorM,{holeBoundariesLocked:true,sharedChainJunctionsLocked:true,originalNormalBranchDestinationRequired:true,originalWindingPreserved:true,previousLevelSeedReplayed:stats.seededCollapses>0}),collapseSequence:coordinated.sequence,stats};
  }
  if(coordinated.reason==='surface-certificate-work-bound'||coordinated.reason==='intersection-certificate-work-bound'||coordinated.reason.startsWith('unproven-')||coordinated.reason.startsWith('unmapped-'))return hold(coordinated.reason);
  const outcomes={},replacements=new Map();let errorBoundM=0;
  for(const patch of patches){
    context.assert();const localTopology=topology(patch.triangles);if(!localTopology||localTopology.components!==1||!localTopology.loops.length){outcomes['unproven-patch-boundary']=(outcomes['unproven-patch-boundary']??0)+1;continue;}
    let axis=0;for(let k=1;k<3;k++)if((patch.plane.normal[k]<0n?-patch.plane.normal[k]:patch.plane.normal[k])>(patch.plane.normal[axis]<0n?-patch.plane.normal[axis]:patch.plane.normal[axis]))axis=k;
    const axes=[0,1,2].filter(k=>k!==axis),area=loop=>loop.reduce((sum,id,i)=>{const a=exact[id],b=exact[loop[(i+1)%loop.length]];return sum+a[axes[0]]*b[axes[1]]-a[axes[1]]*b[axes[0]];},0n),ordered=localTopology.loops.map(ids=>({ids,area:area(ids)})).sort((a,b)=>{const aa=a.area<0n?-a.area:a.area,bb=b.area<0n?-b.area:b.area;return aa>bb?-1:aa<bb?1:0;});
    if(ordered.some(loop=>loop.area===0n)||ordered.slice(1).some(loop=>(loop.area>0n)===(ordered[0].area>0n))){outcomes['unproven-patch-hole-classification']=(outcomes['unproven-patch-hole-classification']??0)+1;continue;}
    const locked=new Set(ordered.slice(1).flatMap(loop=>loop.ids));
    for(const triangle of patch.triangles)for(const id of triangle.geo)if(globalHoleRimVertices.has(id))locked.add(id);
    for(const rows of localTopology.edges.values())if(rows.length===1){const row=rows[0],global=beforeTopology.edges.get(edgeKey(row.a,row.b));if(global.length===2){locked.add(row.a);locked.add(row.b);}}
    const sourceVertex=new Map();for(const triangle of patch.triangles)triangle.geo.forEach((id,i)=>{if(!sourceVertex.has(id))sourceVertex.set(id,triangle.indices[i]);});
    if(sourceVertex.size===locked.size){outcomes['semantic-seams-and-holes-locked']=(outcomes['semantic-seams-and-holes-locked']??0)+1;continue;}
    if(patch.triangles.length<2){outcomes['minimum-patch-triangle-count']=(outcomes['minimum-patch-triangle-count']??0)+1;continue;}
    // A new patch triangulation can inherit one original winding only.
    if(patch.triangles.some(triangle=>Boolean(triangle.reversed)!==Boolean(patch.triangles[0].reversed))){outcomes['mixed-source-winding-patch']=(outcomes['mixed-source-winding-patch']??0)+1;continue;}
    stats.eligiblePatches++;
    const batch=component.batches[patch.batchIndex],geoIds=[...sourceVertex.keys()],toLocal=new Map(geoIds.map((id,i)=>[id,i])),positions=new Float32Array(geoIds.length*3),normals=new Float32Array(geoIds.length*3);
    geoIds.forEach((id,i)=>{positions.set(batch.positions.subarray(sourceVertex.get(id)*3,sourceVertex.get(id)*3+3),i*3);normals.set(batch.normals.subarray(sourceVertex.get(id)*3,sourceVertex.get(id)*3+3),i*3);});
    const input=Uint32Array.from(patch.triangles.flatMap(triangle=>triangle.geo.map(id=>toLocal.get(id)))),locks=Uint8Array.from(geoIds,id=>Number(locked.has(id))),originalPositions=positions.slice(),originalNormals=normals.slice();
    stats.simplifierCalls++;const [indices,estimated]=simplifier.simplifyWithAttributes(input.slice(),positions,3,normals,3,[1,1,1],locks,Math.max(3,Math.floor(patch.triangles.length*level.ratio)*3),level.maxErrorM,['ErrorAbsolute']);
    context.assert();check(sameBits(originalPositions,positions)&&sameBits(originalNormals,normals),'Simplifier mutated original attributes');
    check(indices instanceof Uint32Array&&indices.length>0&&indices.length%3===0&&indices.every(i=>i<geoIds.length)&&Number.isFinite(estimated)&&estimated>=0,'Invalid boundary simplifier result');
    let reason;
    if(indices.length>=input.length)reason='no-triangle-reduction';else if(estimated>level.maxErrorM)reason='simplifier-error-limit';
    const candidate=[];for(let at=0;at<indices.length;at+=3)candidate.push(Array.from(indices.subarray(at,at+3),i=>geoIds[i]));
    const after=topology(candidate);
    if(!reason&&(!after||after.euler!==localTopology.euler||after.components!==localTopology.components||after.loops.length!==localTopology.loops.length||candidate.some(ids=>{const plane=planeFor(ids,exact);return !plane||exactDot(patch.plane.normal,plane.normal)<=0n;})||[...locked].some(id=>!candidate.some(ids=>ids.includes(id)))||[...localTopology.edges.keys()].some(key=>globalHoleRimEdges.has(key)&&!after.edges.has(key))||ordered.slice(1).some(loop=>loop.ids.some((id,i)=>!after.edges.has(edgeKey(id,loop.ids[(i+1)%loop.ids.length]))))))reason='patch-topology-hole-orientation-failed';
    if(!reason){const certificate=await certify(patch.triangles.map(triangle=>triangle.geo.map(id=>points[id])),candidate.map(ids=>ids.map(id=>points[id])),level.maxErrorM,context);reason=certificate.reason;if(!reason){errorBoundM=Math.max(errorBoundM,certificate.bound);
      // analysis: welded ids in the coherent analysis frame (as certified above);
      // emitted: batch-local ids with the patch's single original winding restored.
      replacements.set(patch,{analysis:candidate,emitted:candidate.map(ids=>{const out=ids.map(id=>sourceVertex.get(id));return patch.triangles[0].reversed?reverse(out):out;})});stats.changedPatches++;}}
    if(reason)outcomes[reason]=(outcomes[reason]??0)+1;
    await context.yield();
  }
  if(!replacements.size)return hold('no-certified-boundary-reduction',{patchOutcomes:outcomes});
  const batches=component.batches.map((batch,batchIndex)=>{
    const next=[],emitted=new Set();for(const triangle of triangles.filter(row=>row.batchIndex===batchIndex)){const replacement=replacements.get(triangle.patch);if(!replacement)next.push(...emittedIndices(triangle));else if(!emitted.has(triangle.patch)){emitted.add(triangle.patch);for(const ids of replacement.emitted)next.push(...ids);}}
    if(!emitted.size)return batch;
    const original=[...new Set(next)],remap=new Map(original.map((id,i)=>[id,i])),positions=new Float32Array(original.length*3),normals=new Float32Array(original.length*3);
    original.forEach((id,i)=>{positions.set(batch.positions.subarray(id*3,id*3+3),i*3);normals.set(batch.normals.subarray(id*3,id*3+3),i*3);});
    return {...batch,positions,normals,indices:Uint32Array.from(next,id=>remap.get(id))};
  });
  // Strict re-check in the analysis frame: unchanged triangles keep their
  // coherent analysis winding and each replaced patch contributes the
  // simplifier's analysis-frame candidate, before any winding restoration.
  // Orientation is never re-derived from the output: the emitted batches must
  // equal exactly that output with the recorded original-winding reversals.
  const analysis=[],expected=[];
  for(const triangle of triangles)if(!replacements.has(triangle.patch)){analysis.push(triangle.geo);expected.push([triangle.batchIndex,triangle.reversed?reverse(triangle.geo):triangle.geo]);}
  for(const [patch,replacement] of replacements)for(const ids of replacement.analysis){analysis.push(ids);expected.push([patch.batchIndex,patch.triangles[0].reversed?reverse(ids):ids]);}
  const outputRows=emittedRows(batches,lookup),afterTopology=topology(analysis);
  if(!afterTopology||afterTopology.components!==beforeTopology.components||afterTopology.euler!==beforeTopology.euler||afterTopology.loops.length!==beforeTopology.loops.length||[...globalHoleRimEdges].some(key=>afterTopology.edges.get(key)?.length!==beforeTopology.edges.get(key).length)||!sameOrientedTriangleRows(outputRows,expected))return hold('component-topology-validation-failed');
  const separatedOutput=await noSelfIntersections(outputRows.map(([,ids])=>ids),points,exact,context);if(separatedOutput.reason)return hold(separatedOutput.reason);
  context.assert();return {component:{...component,batches},changed:true,errorBoundM,normalDeviationRad:0,reason:'certified-component-boundary-reduction',proof:certificateProof(level.maxErrorM,{exactCoplanarPatches:true,holeBoundariesLocked:true,semanticSeamsLocked:true,componentTopologyPreserved:true,patchOutcomes:outcomes}),stats};
}
