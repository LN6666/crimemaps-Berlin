/** Fixed owner/provider tuples only. Existing strings are compared directly;
 * never serialize, clone, hash, truncate or walk source/publication key contents. */
export type SceneSettlementValue=string|number|boolean|null|undefined|readonly SceneSettlementValue[];
export type SceneSettlementTuple=readonly SceneSettlementValue[];
function equal(a:SceneSettlementValue,b:SceneSettlementValue):boolean{
  if(Object.is(a,b))return true;
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
  for(let i=0;i<a.length;i++)if(!equal(a[i],b[i]))return false;
  return true;
}
/** No timers/repaints. Callers supply fresh readonly fixed-size tuple containers.
 * Routine samples are bounded; a new settlement receives a final-event exception. */
export function createSceneProofGate(intervalMs=250){
  let lastAt=-Infinity,lastSettlement:SceneSettlementTuple|undefined;
  return {publish(now:number,settled:boolean,readSettlement:()=>SceneSettlementTuple,publish:()=>boolean){
    if(!settled&&now-lastAt<intervalMs)return false;
    const key=readSettlement();
    if(settled&&equal(key,lastSettlement))return false;
    // No camera/no actual write is retryable, just like an exception.
    if(publish()!==true)return false;
    lastAt=now;lastSettlement=key;return true;
  }};
}
