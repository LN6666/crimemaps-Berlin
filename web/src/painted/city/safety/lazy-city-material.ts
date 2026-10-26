export type CityMaterialWait=<T>(operation:Promise<T>)=>Promise<T>;
const identityWait:CityMaterialWait=operation=>operation;
/** Native imports may outlive one observer; publish readiness only after its active wait. */
export function createLazyCityMaterial<T>(name:string,load:()=>Promise<T>){
 let ready:T|undefined,pending:Promise<T>|undefined;
 async function prepare(signal:AbortSignal,wait:CityMaterialWait=identityWait){
  signal.throwIfAborted();if(ready)return;
  if(!pending){const next=Promise.resolve().then(load);pending=next;void next.catch(()=>{if(pending===next)pending=undefined;});}
  const operation=wait(pending);
  const value=await new Promise<T>((resolve,reject)=>{
   let done=false;const cleanup=()=>{if(done)return false;done=true;signal.removeEventListener('abort',cancel);return true;};
   const cancel=()=>{if(cleanup())reject(signal.reason??new DOMException('Aborted','AbortError'));};
   signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
   operation.then(value=>{if(cleanup())resolve(value);},error=>{if(cleanup())reject(error);});
  });signal.throwIfAborted();ready=value;
 }
 return{prepare,value:()=>ready,required:()=>{if(!ready)throw Error(name+' material was not prepared for this city');return ready;}};
}
