import {clearTimeout, setTimeout} from 'node:timers';
import {scheduler} from 'node:timers/promises';

const safetyLimitMs=12_000;

// Fixture deadline for an actual event; a slow SHA/delivery is never reported
// as a pending outcome merely because the event loop advanced a fixed count.
export async function managerEvent(promise,label){
 let timer;
 try{
  const expired=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('No '+label+' within '+safetyLimitMs+' ms')),safetyLimitMs);});
  return await Promise.race([promise,expired]);
 }finally{clearTimeout(timer);}
}

const resultOf=promise=>promise.then(()=>'fulfilled',error=>error?.name??String(error));
export const outcomeOf=promise=>managerEvent(resultOf(promise),'manager settlement');

// Only for negative assertions while the fixture deliberately holds capacity
// or a read gate. Positive assertions always wait for settlement.
export function observedWhileHeld(promise,turns){
 const observation=async()=>{for(let i=0;i<turns;i++)await scheduler.yield();return 'pending';};
 return Promise.race([resultOf(promise),observation()]);
}

// These intermediate state checks watch counters or held reads that cannot
// disappear until the test takes its next action.
export async function until(predicate){
 const deadline=performance.now()+safetyLimitMs;
 while(!predicate()){
  if(performance.now()>=deadline)throw Error('Manager fixture state did not arrive within '+safetyLimitMs+' ms');
  await scheduler.wait(2);
 }
}

// Observe exactly the registration made by the real budget. Keep the listener,
// its abort signal and its unsubscribe callback intact.
export function nextCapacityRegistration(budget){
 const register=budget.onAvailable;
 return new Promise(resolve=>{
  budget.onAvailable=function(...args){
   const unsubscribe=register.apply(this,args);
   budget.onAvailable=register;
   resolve();
   return unsubscribe;
  };
 });
}
