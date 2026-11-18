/** Categories mask/shadow include retained CPU recipes and boundary indices.
 * Their GPU leases are covered by store.gpu/retiring; private display targets
 * also hold texture charges. Do not wait for those mixed categories to be zero. */
export function contextReclamationResourcesIdle(stats:Readonly<Record<string,unknown>>,categories:Readonly<Partial<Record<string,{bytes:number}>>>){
 if(['gpu','preparing','retiring','recent'].some(key=>stats[key]!==0))return false;
 return ['program','program-submitted','program-retiring','gpu-buffer','gpu-vertex-array','texture'].every(key=>!(categories[key]?.bytes));
}

/** Release backend context caches after a 3D allocation attempt and the normal
 * resource-retirement grace. Never changes the resource budget or evicts owners.
 * A bounded copy of the last 2D frame covers the existing recovery sequence. */
export function installIdleContextReclamation(options:{
 map:{on(type:string,fn:()=>void):unknown;off(type:string,fn:()=>void):unknown;triggerRepaint():void;getCanvas():HTMLCanvasElement;getCanvasContainer():HTMLElement};
 eligible:()=>boolean;
 reservePreview:(bytes:number)=>{release():void}|undefined;
 idleMs:number;
 hidden?:boolean;
 schedule?:(fn:()=>void,ms:number)=>unknown;cancel?:(handle:unknown)=>void;
}){
 if(!Number.isFinite(options.idleMs)||options.idleMs<0)throw Error('Invalid context reclamation grace');
 const {map}=options,schedule=options.schedule??((fn,ms)=>setTimeout(fn,ms)),cancel=options.cancel??(handle=>clearTimeout(handle as ReturnType<typeof setTimeout>));
 let destroyed=false,hidden=!!options.hidden,dirty=false,in2D=false,reclaiming=false,waitingFrame=false;
 let timer:unknown,restoreTimer:unknown,preview:HTMLCanvasElement|undefined,claim:{release():void}|undefined;
 let attempts=0,completed=0,lastResult='unused',lastAttemptAtMs:number|null=null,lastRestoreRequestAtMs:number|null=null,lastReadyAtMs:number|null=null;
 function clearTimer(){if(timer!==undefined){cancel(timer);timer=undefined;}}
 function clearFrame(){if(waitingFrame){map.off('render',afterFrame);waitingFrame=false;}}
 function clearPreview(){preview?.remove();if(preview){preview.width=0;preview.height=0;}preview=undefined;claim?.release();claim=undefined;}
 function scheduleAttempt(ms=options.idleMs){clearTimer();if(!destroyed&&!hidden&&dirty&&in2D&&!reclaiming)timer=schedule(attempt,ms);}
 function attempt(){timer=undefined;if(destroyed||hidden||!dirty||!in2D||reclaiming)return;
  if(!options.eligible()){scheduleAttempt(1000);return;}
  waitingFrame=true;map.on('render',afterFrame);map.triggerRepaint();
 }
 function afterFrame(){
  clearFrame();if(destroyed||hidden||!dirty||!in2D||reclaiming)return;
  if(!options.eligible()){scheduleAttempt();return;}
  const canvas=map.getCanvas(),gl=canvas.getContext('webgl2'),extension=gl?.getExtension('WEBGL_lose_context');
  if(!gl||gl.isContextLost()||!extension){dirty=false;lastResult='unsupported';return;}
  if(!canvas.width||!canvas.height){scheduleAttempt();return;}
  // At most 1 megapixel / 8 MiB estimated browser backing storage; no readback
  // array, encoded image, screenshot history, or full-screen-sized allocation.
  const scale=Math.min(1,Math.sqrt(1048576/(canvas.width*canvas.height)),1048576/canvas.width,1048576/canvas.height),width=Math.max(1,Math.floor(canvas.width*scale)),height=Math.max(1,Math.floor(canvas.height*scale));
  claim=options.reservePreview(width*height*8);
  if(!claim){dirty=false;lastResult='preview-budget-unavailable';return;}
  try{
   preview=canvas.ownerDocument.createElement('canvas');preview.width=width;preview.height=height;preview.setAttribute('aria-hidden','true');preview.setAttribute('data-context-reclamation-preview','');
   preview.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
   const context=preview.getContext('2d');if(!context)throw Error('2D preview unavailable');context.drawImage(canvas,0,0,width,height);map.getCanvasContainer().append(preview);
   dirty=false;reclaiming=true;attempts++;lastResult='recovering';lastAttemptAtMs=performance.now();lastRestoreRequestAtMs=null;lastReadyAtMs=null;
   extension.loseContext();
   restoreTimer=schedule(()=>{restoreTimer=undefined;if(destroyed)return;try{if(gl.isContextLost()){lastRestoreRequestAtMs=performance.now();extension.restoreContext();}}catch{fail();}},1000);
  }catch{fail();}
 }
 // An owner's recovery error must not strand the context we deliberately lost.
 // Keep the already scheduled restore attempt; only destruction cancels it.
 function fail(){reclaiming=false;lastResult='failed';clearPreview();}
 function activity(){if(!reclaiming){clearFrame();scheduleAttempt();}}
 map.on('movestart',activity);map.on('moveend',activity);map.on('resize',activity);
 return{
  // Partial or failed 3D preparation also allocates backend resources. Do not
  // depend on a full-ready publication to remember that cleanup is needed.
  on3DRequested(){dirty=true;in2D=false;clearTimer();clearFrame();},
  on3DReady(){dirty=true;in2D=false;clearTimer();clearFrame();},
  on2DReady(){in2D=true;scheduleAttempt();},
  onLost(){if(!reclaiming){dirty=false;clearTimer();clearFrame();}},
  onReady(){if(reclaiming){reclaiming=false;completed++;lastResult='ready';lastReadyAtMs=performance.now();if(restoreTimer!==undefined){cancel(restoreTimer);restoreTimer=undefined;}clearPreview();}},
  onError(){if(reclaiming)fail();},
  setHidden(value:boolean){hidden=value;if(value){clearTimer();clearFrame();}else scheduleAttempt();},
  get stats(){return{dirty,in2D,reclaiming,waitingFrame,scheduled:timer!==undefined,attempts,completed,lastResult,lastAttemptAtMs,lastRestoreRequestAtMs,lastReadyAtMs,idleMs:options.idleMs,previewActive:!!preview,previewMaxPixels:1048576};},
  destroy(){if(destroyed)return;destroyed=true;clearTimer();clearFrame();if(restoreTimer!==undefined){cancel(restoreTimer);restoreTimer=undefined;}clearPreview();map.off('movestart',activity);map.off('moveend',activity);map.off('resize',activity);},
 };
}
