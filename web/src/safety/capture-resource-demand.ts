export type CaptureDemandChange={kind:'solar'|'reflection';token:string;active:boolean};
type Source={setCaptureDemand?(change:CaptureDemandChange):void};

/** A capture holds resources only while preparing or drawing. Acquire the next
 * token before retiring the old one so unchanged programs keep their owner. */
export function createCaptureResourceDemand(kind:CaptureDemandChange['kind']){
 let active:{source:Source;token:string}|undefined;
 return{
  activate(source:Source,token:string){
   const previous=active;
   active={source,token};
   try{source.setCaptureDemand?.({kind,token,active:true});}
   finally{if(previous&&(previous.source!==source||previous.token!==token))previous.source.setCaptureDemand?.({kind,token:previous.token,active:false});}
  },
  clear(){const previous=active;active=undefined;if(previous)previous.source.setCaptureDemand?.({kind,token:previous.token,active:false});},
 };
}
