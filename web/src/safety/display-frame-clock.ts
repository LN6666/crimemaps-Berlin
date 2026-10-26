type Subscription={fps:number;active:()=>boolean;frame:(now:number)=>boolean};
type Options={requestRepaint:()=>void;clock?:()=>number;setTimer?:(fn:()=>void,delay:number)=>ReturnType<typeof setTimeout>;clearTimer?:(id:ReturnType<typeof setTimeout>)=>void};
/** One bounded display timer per map. No timer survives hidden or idle scenes.
 * Frame callbacks update display state only; all changed subscriptions share
 * one repaint request. Re-activation starts from the current monotonic time.
 */
export function createDisplayFrameClock(options:Options){
 const now=options.clock??(()=>performance.now()),set=options.setTimer??setTimeout,clear=options.clearTimer??clearTimeout;
 const entries=new Set<{subscription:Subscription;due:number;wasActive:boolean}>();
 let timer:ReturnType<typeof setTimeout>|undefined,hidden=false,destroyed=false,frames=0,repaints=0;
 const stop=()=>{if(timer!==undefined)clear(timer);timer=undefined;};
 function wake(){
  stop();if(destroyed||hidden)return;
  const current=now();let due=Infinity;
  for(const row of entries){const active=row.subscription.active();if(active&&!row.wasActive)row.due=current;row.wasActive=active;if(active)due=Math.min(due,row.due);}
  if(Number.isFinite(due))timer=set(tick,Math.max(0,due-current));
 }
 function tick(){
  timer=undefined;if(destroyed||hidden)return;
  const current=now();let changed=false;
  for(const row of entries){const active=row.subscription.active();if(!active){row.wasActive=false;continue;}if(!row.wasActive)row.due=current;row.wasActive=true;if(current+0.001<row.due)continue;row.due=current+1000/row.subscription.fps;frames++;changed=row.subscription.frame(current)||changed;}
  if(changed&&!destroyed&&!hidden){repaints++;options.requestRepaint();}wake();
 }
 return{
  subscribe(subscription:Subscription){if(destroyed)throw Error('Display clock destroyed');if(!Number.isFinite(subscription.fps)||subscription.fps<=0||subscription.fps>60)throw Error('Invalid display frame rate');const row={subscription,due:now(),wasActive:false};entries.add(row);wake();let removed=false;return()=>{if(removed)return;removed=true;entries.delete(row);wake();};},
  wake,
  setPageHidden(value:boolean){if(hidden===value)return;hidden=value;if(value){for(const row of entries)row.wasActive=false;stop();}else wake();},
  get stats(){return{subscriptions:entries.size,timerPending:timer!==undefined,hidden,destroyed,frames,repaints};},
  destroy(){if(destroyed)return;destroyed=true;stop();entries.clear();},
 };
}
export type DisplayFrameClock=ReturnType<typeof createDisplayFrameClock>;
