/** Count readiness deadlines only while visible. This pauses waiting, not request ownership or cancellation. */
export type VisibilitySource={readonly hidden:boolean;addEventListener(type:'visibilitychange',listener:()=>void):void;removeEventListener(type:'visibilitychange',listener:()=>void):void};
export const pageIsHidden=()=>typeof document!=='undefined'&&document.hidden;
export function visibleReadinessDeadline(milliseconds:number,onTimeout:()=>void,onResume:()=>void,source:VisibilitySource|undefined=typeof document==='undefined'?undefined:document,clock=()=>performance.now()){
 let remaining=milliseconds,started=clock(),disposed=false,timer:ReturnType<typeof setTimeout>|undefined;
 const pause=()=>{if(timer===undefined)return;clearTimeout(timer);timer=undefined;remaining=Math.max(0,remaining-(clock()-started));};
 const arm=()=>{if(disposed||source?.hidden||timer!==undefined)return;started=clock();timer=setTimeout(()=>{timer=undefined;if(disposed)return;if(source?.hidden){remaining=Math.max(0,remaining-(clock()-started));return;}disposed=true;source?.removeEventListener('visibilitychange',changed);onTimeout();},Math.max(0,remaining));};
 const changed=()=>{if(disposed)return;if(source?.hidden)pause();else{arm();onResume();}};
 source?.addEventListener('visibilitychange',changed);arm();
 return ()=>{if(disposed)return;disposed=true;pause();source?.removeEventListener('visibilitychange',changed);};
}
