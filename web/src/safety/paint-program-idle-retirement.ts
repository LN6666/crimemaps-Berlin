import {BUILDING_FOCUS_EXIT_IDLE_MS} from './building-focus-window';

type Options<K,V>={
 programs:Map<K,V>;
 required:()=>ReadonlySet<K>;
 release:(program:V)=>void;
 idleMs?:number;
 now?:()=>number;
 setTimer?:(callback:()=>void,delay:number)=>ReturnType<typeof setTimeout>;
 clearTimer?:(timer:ReturnType<typeof setTimeout>)=>void;
};
/** Bound renderer-local warm programs as well as the shared resource cache.
 * Still-needed main/capture keys are protected at collection time. Releasing a
 * reference uses the existing program owner and GPU retirement safety path.
 */
export function createPaintProgramIdleRetirement<K,V>(options:Options<K,V>){
 const idleMs=options.idleMs??BUILDING_FOCUS_EXIT_IDLE_MS.rebuild;
 if(!Number.isFinite(idleMs)||idleMs<=0)throw new RangeError('Invalid paint program idle interval');
 const now=options.now??(()=>performance.now()),set=options.setTimer??setTimeout,clear=options.clearTimer??clearTimeout;
 const idle=new Map<K,{program:V;deadline:number}>();
 let timer:ReturnType<typeof setTimeout>|undefined,timerDue=Infinity,released=0;
 function stop(){if(timer!==undefined)clear(timer);timer=undefined;timerDue=Infinity;}
 function synchronize(){
  const time=now(),required=options.required();
  for(const [key,row]of idle)if(!options.programs.has(key)||options.programs.get(key)!==row.program||required.has(key))idle.delete(key);
  for(const [key,program]of options.programs)if(!required.has(key)&&!idle.has(key))idle.set(key,{program,deadline:time+idleMs});
  let failure:unknown;
  for(const [key,row]of idle)if(row.deadline<=time){
   idle.delete(key);options.programs.delete(key);
   try{options.release(row.program);released++;}catch(error){failure??=error??new Error('Paint program retirement failed');}
  }
  let due=Infinity;for(const row of idle.values())due=Math.min(due,row.deadline);
  if(due!==timerDue){stop();if(Number.isFinite(due)){timerDue=due;timer=set(()=>{timer=undefined;timerDue=Infinity;synchronize();},Math.max(0,Math.ceil(due-time)));}}
  if(failure!==undefined)throw failure;
 }
 return{synchronize,reset(){stop();idle.clear();},get stats(){return{idlePrograms:idle.size,idleMs,nextDeadline:Number.isFinite(timerDue)?timerDue:null,timerPending:timer!==undefined,releasedReferences:released,measurement:'renderer-local inactive program references; not physical GPU memory'};}};
}
