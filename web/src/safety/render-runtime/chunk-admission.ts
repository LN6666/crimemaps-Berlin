/** Advance only while the candidate's own preparation turn is running.
 * Returning false leaves the next group for a later turn. */
export function createChunkAdmission<T>(groups:readonly T[], admit:(group:T)=>void){
 let next=0;
 return ():boolean=>{
  const start=performance.now();
  const limit=Math.min(next+16,groups.length);
  while(next<limit){
   admit(groups[next]);
   next++;
   if(performance.now()-start>=2)break;
  }
  return next===groups.length;
 };
}
