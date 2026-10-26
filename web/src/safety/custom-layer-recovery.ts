/** MapLibre custom layers are omitted from the style restored after context loss.
 * Owners retain source CPU/cache/selection identity and decide which layers exist.
 * This module never reads renderer internals, resets depth, or changes map data. */
export type RecoveryMap={
 on(type:string,fn:()=>void):void;off(type:string,fn:()=>void):void;
 isStyleLoaded():boolean;getLayer(id:string):unknown;
 addLayer(layer:{id:string},beforeId?:string):unknown;removeLayer(id:string):unknown;triggerRepaint():void;
};
export type RecoverableCustomLayer={layer:{id:string};beforeId?:()=>string|undefined};
export function installCustomLayerRecovery(options:{
 map:RecoveryMap;
 /** Registration order: building first, then cars with beforeId=building.id. */
 layers:()=>readonly RecoverableCustomLayer[];
 /** Cancel pending picks/fetches and stop animations; retain committed selection/cache. */
 onLost:()=>void;
 /** Resume enabled renderers/loaders after registration. Honor cancellation before writes. */
 onLayersRestored:(signal:AbortSignal)=>void|Promise<void>;
 /** Active layers must have rendered the current matrix. Inactive scenes may return true. */
 isReady:()=>boolean;
 onReady?:()=>void;
 /** Visible waiting budget, including a context that never emits restored. */
 timeoutMs?:number;pageHidden?:boolean;onTimeout?:()=>void;
 schedule?:(fn:()=>void,ms:number)=>unknown;cancel?:(handle:unknown)=>void;now?:()=>number;
 onError?:(error:unknown)=>void;
}){
 const {map}=options;let destroyed=false,restored=false,busy=false,registered=false;
 let state:'idle'|'lost'|'waiting-style'|'registering'|'waiting-frame'|'ready'|'error'|'timed-out'|'destroyed'='idle';
 let revision=0,request=new AbortController();
 const budget=options.timeoutMs??12000;if(!Number.isFinite(budget)||budget<=0)throw Error('Invalid map recovery timeout');
 const schedule=options.schedule??((fn:()=>void,ms:number)=>setTimeout(fn,ms)),cancel=options.cancel??(handle=>clearTimeout(handle as ReturnType<typeof setTimeout>)),now=options.now??Date.now;
 let hidden=options.pageHidden??false,timer:unknown,remaining=budget,started=0,watching=false;
 const notifyLost=()=>{try{options.onLost();}catch(error){options.onError?.(error);}};
 function stopTimer(){if(timer!==undefined){cancel(timer);timer=undefined;remaining=Math.max(0,remaining-(now()-started));}}
 function clearWait(){stopTimer();watching=false;}
 function wait(){if(!watching||hidden||timer!==undefined||destroyed)return;started=now();timer=schedule(()=>{timer=undefined;if(destroyed||hidden||!watching)return;watching=false;request.abort();revision++;registered=false;busy=false;state='timed-out';notifyLost();options.onTimeout?.();},Math.max(0,remaining));}
 function beginWait(){clearWait();remaining=budget;watching=true;wait();}
 const fail=(error:unknown)=>{clearWait();request.abort();revision++;registered=false;busy=false;state='error';notifyLost();options.onError?.(error);};
 const current=(signal:AbortSignal,ticket:number)=>!destroyed&&!signal.aborted&&ticket===revision&&restored;
 function lost(){if(destroyed||!restored&&(state==='lost'||state==='timed-out'))return;request.abort();revision++;restored=false;registered=false;busy=false;state='lost';notifyLost();beginWait();}
 async function restore(){
  if(destroyed||hidden||!restored||busy||registered||state==='error'||state==='timed-out')return;
  if(!map.isStyleLoaded()){state='waiting-style';return;}
  busy=true;state='registering';const ticket=revision,signal=request.signal;
  try{
   for(const entry of options.layers()){
    if(!current(signal,ticket))return;
    if(!entry.layer.id)throw Error('Custom recovery layer requires an ID');
    if(!map.getLayer(entry.layer.id)){
     const before=entry.beforeId?.();try{map.addLayer(entry.layer,before&&map.getLayer(before)?before:undefined);}catch(error){if(map.getLayer(entry.layer.id))map.removeLayer(entry.layer.id);throw error;}
    }
   }
   if(!current(signal,ticket))return;
   await options.onLayersRestored(signal);
   if(!current(signal,ticket))return;
   registered=true;state='waiting-frame';map.triggerRepaint();
  }catch(error){if(current(signal,ticket))fail(error);}
  finally{if(ticket===revision)busy=false;}
 }
 const styleChanged=()=>{void restore();};
 function frame(){
  if(destroyed||hidden||!restored)return;
  if(!registered){void restore();return;}
  if(state!=='waiting-frame')return;
  try{if(options.isReady()){clearWait();state='ready';options.onReady?.();}}
  catch(error){fail(error);}
 }
 function contextRestored(){if(destroyed||restored)return;request.abort();request=new AbortController();revision++;restored=true;registered=false;busy=false;const timedOut=state==='timed-out';state='waiting-style';if(timedOut||!watching)beginWait();void restore();}
 map.on('webglcontextlost',lost);map.on('webglcontextrestored',contextRestored);
 map.on('style.load',styleChanged);map.on('styledata',styleChanged);map.on('render',frame);
 return {
  /** Explicit bounded retry after owner reports a recoverable registration failure. */
  retry(){if(destroyed||!restored||state!=='error'&&state!=='timed-out')return;request.abort();request=new AbortController();revision++;registered=false;busy=false;state='waiting-style';beginWait();void restore();},
  setPageHidden(value:boolean){if(destroyed||hidden===value)return;hidden=value;if(value)stopTimer();else{wait();void restore();}},
  get state(){return state;},get revision(){return revision;},
  destroy(){if(destroyed)return;destroyed=true;clearWait();request.abort();revision++;state='destroyed';map.off('webglcontextlost',lost);map.off('webglcontextrestored',contextRestored);map.off('style.load',styleChanged);map.off('styledata',styleChanged);map.off('render',frame);}
 };
}
