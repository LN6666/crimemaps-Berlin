/** Only a completed, unchanged CPU batch may survive a context-only pause.
 * No source arrays, promises, callbacks or GPU objects are retained here. */
export type ContextRecoveryOptions={contextRecovery?:boolean};
export type RecoveryResidentSnapshot={view:readonly number[];source:readonly string[];generation:number;rendererGeneration:number};
type RecoveryView={getZoom():number;getBearing():number;getPitch():number;getVerticalFieldOfView():number;getCenter():{lng:number;lat:number};getBounds():{getWest():number;getSouth():number;getEast():number;getNorth():number};getCanvas():{clientWidth:number;clientHeight:number;width:number;height:number};getPadding?():{top?:number;bottom?:number;left?:number;right?:number};getRoll?():number;isMoving?():boolean};
export function recoveryResidentView(map:RecoveryView):number[]|undefined{
 try{if(map.isMoving?.())return;const b=map.getBounds(),c=map.getCenter(),canvas=map.getCanvas(),p=map.getPadding?.();
  const view=[map.getZoom(),map.getBearing(),map.getPitch(),map.getVerticalFieldOfView(),c.lng,c.lat,b.getWest(),b.getSouth(),b.getEast(),b.getNorth(),canvas.clientWidth,canvas.clientHeight,canvas.width,canvas.height,p?.top??0,p?.bottom??0,p?.left??0,p?.right??0,map.getRoll?.()??0];
  return view.every(Number.isFinite)&&view.slice(10,14).every(n=>n>0)?view:undefined;
 }catch{return;}
}
export function createRecoveryResidentReuse(snapshot:()=>RecoveryResidentSnapshot|undefined){
 let completed:string|undefined,paused:string|undefined;
 function stamp(){const s=snapshot();return s&&s.view.length>0&&s.view.every(Number.isFinite)&&s.source.length>0&&s.source.every(v=>typeof v==='string'&&v.length>0)&&Number.isSafeInteger(s.generation)&&s.generation>=0&&s.rendererGeneration===s.generation?JSON.stringify(s):undefined;}
 function invalidate(){completed=paused=undefined;}
 return{invalidate,complete(){completed=stamp();paused=undefined;},
  suspend(allowed:boolean){const current=allowed?stamp():undefined;paused=current!==undefined&&current===completed?current:undefined;if(paused===undefined)completed=undefined;return paused!==undefined;},
  reuse(allowed:boolean){const current=allowed?stamp():undefined,keep=paused!==undefined&&current===paused;paused=undefined;if(!keep)completed=undefined;return keep;}
 };
}
