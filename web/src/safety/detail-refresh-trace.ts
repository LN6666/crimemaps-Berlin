/** Bounded diagnostic history. Requests are not proof that a rebuild ran. */
export type DetailRefreshReason='reflection-state'|'reflection-plane'|'scene-environment'|'solar-coordinator'|'broadcast-dispatch';
export function createDetailRefreshTrace(){
 const counts:Record<DetailRefreshReason,number>={'reflection-state':0,'reflection-plane':0,'scene-environment':0,'solar-coordinator':0,'broadcast-dispatch':0};
 const events:{sequence:number;atMs:number;reason:DetailRefreshReason;provider?:string}[]=[];
 let sequence=0;
 return{
  record(reason:DetailRefreshReason,atMs:number,provider?:string){
   counts[reason]++;events.push({sequence:++sequence,atMs,reason,...(provider?{provider}:{})});
   if(events.length>32)events.shift();
  },
  snapshot(){return{scope:'compositor-refresh-requests-only; excludes provider-local focus timers; not completed rebuilds',total:sequence,counts:{...counts},dropped:sequence-events.length,events:events.map(event=>({...event}))};},
 };
}
