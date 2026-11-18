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
