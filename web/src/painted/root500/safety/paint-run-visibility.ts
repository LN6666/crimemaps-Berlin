/** Conservative homogeneous clip test; retain uncertain/intersecting boxes. */
export function paintBoxOutsideClip(box:readonly number[],matrix:ArrayLike<number>):boolean{
 if(box.length!==6||matrix.length!==16||![...box,...Array.from(matrix)].every(Number.isFinite))return false;
 let common=63;
 // Birth animation scales height from zero to one. Include its entire swept box.
 for(const x of [box[0],box[3]])for(const y of [Math.min(0,box[1]),Math.max(0,box[4])])for(const z of [box[2],box[5]]){
  const p=[x,y,z,1],q=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)q[r]+=matrix[k*4+r]*p[k];
  const [a,b,c,w]=q,e=1e-5*Math.max(1,...q.map(Math.abs));let outside=0;
  if(a< -w-e)outside|=1;if(a>w+e)outside|=2;if(b< -w-e)outside|=4;if(b>w+e)outside|=8;if(c< -w-e)outside|=16;if(c>w+e)outside|=32;
  common&=outside;if(!common)return false;
 }
 return common!==0;
}
export function paintRunIntersectsVisible(first:number,count:number,ranges:readonly(readonly[number,number])[]):boolean{
 let lo=0,hi=ranges.length;while(lo<hi){const mid=(lo+hi)>>>1;if(ranges[mid][1]<=first)lo=mid+1;else hi=mid;}return lo<ranges.length&&ranges[lo][0]<first+count;
}
