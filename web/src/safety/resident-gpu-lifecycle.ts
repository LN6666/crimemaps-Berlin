/** Resource scheduling only: caller owns all validation, geometry and materials. */
export function createResidentGPULifecycle<Context>(options:{
 bind:(context:Context)=>void;initialize:(context:Context,repackResident:boolean)=>void;release:()=>void;
 ready:()=>boolean;lost:(context:Context)=>boolean;hasResident:()=>boolean;needsPreflight:()=>boolean;
 clearTransient:()=>void;revision:()=>number;
}){
 let context:Context|undefined,initializing=false,owned=false,emptyRevision:number|undefined,initializations=0,releases=0;
 function released(){if(owned)releases++;owned=false;emptyRevision=undefined;}
 function ensure(repackResident=false,force=false){
  if(!context||options.lost(context))return false;if(options.ready()&&!force)return true;if(initializing)return false;
  initializing=true;emptyRevision=undefined;try{options.initialize(context,repackResident);owned=options.ready();if(owned)initializations++;return owned;}finally{initializing=false;}
 }
 return{
  attach(value:Context){if(context&&context!==value)options.release();context=value;options.bind(value);emptyRevision=undefined;if(options.hasResident()||options.needsPreflight())ensure(true);},
  preparePreflight(){return ensure(false);},
  rebuild(){if(options.hasResident()||options.needsPreflight())return ensure(true,true);options.release();return false;},
  beforeUpload(){emptyRevision=undefined;if(!options.hasResident()&&!options.needsPreflight()){options.clearTransient();options.release();return false;}return ensure(false);},
  emptyFrame(matrix:ArrayLike<number>|undefined){if(options.hasResident()||options.needsPreflight())return false;let valid=Boolean(context&&!options.lost(context)&&matrix?.length===16);if(valid)for(let i=0;i<16;i++)if(!Number.isFinite(matrix![i])){valid=false;break;}emptyRevision=valid?options.revision():undefined;return true;},
  isEmptyReady(){return Boolean(context&&!options.lost(context)&&!options.hasResident()&&!options.needsPreflight()&&emptyRevision===options.revision());},
  released,
  detach(){context=undefined;emptyRevision=undefined;},
  get stats(){return{contextBound:context!==undefined,initialized:owned&&options.ready(),initializing,initializations,releases,resident:options.hasResident(),preflightRequired:options.needsPreflight(),emptyFrameReady:emptyRevision===options.revision(),ownedTimers:0};},
 };
}
