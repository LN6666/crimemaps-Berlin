import {createSceneSolarShadow} from './scene-solar-shadow';
import type {PlanarReflectionSource} from './planar-building-reflection';
import {checkedSceneEnvironment,type SceneEnvironmentState} from './scene-environment-state';
import type {SceneSolarLight} from './scene-solar-light';

type MapSurface={isStyleLoaded():boolean|void;getLayer(id:string):unknown;addLayer(layer:unknown,before?:string):unknown;removeLayer(id:string):unknown;on(name:string,fn:()=>void):void;off(name:string,fn:()=>void):void;triggerRepaint():void};
/** The only capture owner. MapLibre runs custom prerender offscreen before all
 * main render passes. The layer's render intentionally does nothing. */
export function installSceneSolarShadowLayer(options:{map:MapSurface;source:PlanarReflectionSource;initial:SceneEnvironmentState;solarLight:()=>SceneSolarLight|undefined;mobile?:boolean;pageHidden?:boolean;available:()=>boolean;beforeId?:()=>string|undefined}){
 const {map}=options;let state=checkedSceneEnvironment(options.initial),mode=false,hidden=options.pageHidden??false,suspended=false,destroyed=false,adding=false,faulted=false,lastError:string|undefined;
 let shadow:ReturnType<typeof createSceneSolarShadow>|undefined;
 const reset=()=>{shadow?.resetGPU();};
 const visible=()=>mode&&!hidden&&!suspended&&!destroyed&&options.available();
 const sunlight=()=>{if(!state.sunlight||!state.shadows)return;const sun=options.solarLight();if(!sun||Date.parse(sun.instantISO)!==Date.parse(state.instantISO))return;return sun.altitudeDegrees>.5?sun:undefined;};
 const layer={id:'scene-solar-shadow-capture',type:'custom' as const,renderingMode:'3d' as const,
  onAdd(){/* GPU allocation is deferred to the first eligible prerender. */},
  prerender(gl:WebGLRenderingContext|WebGL2RenderingContext){
   if(!visible()||faulted)return;
   const sun=sunlight();if(!sun){reset();return;}
   if(!('createVertexArray'in gl))return;
   try{if(!shadow){shadow=createSceneSolarShadow({mobile:options.mobile});shadow.setSource(options.source);}shadow.capture(gl as WebGL2RenderingContext,{direction:sun.direction,enabled:true,quality:state.quality});}
   catch(error){lastError=String(error);faulted=true;reset();}
  },
  render(){},
  onRemove(){reset();}
 };
 function ensure(){
  if(adding||!visible()||faulted||!map.isStyleLoaded()||!sunlight()||map.getLayer(layer.id))return;
  adding=true;try{const before=options.beforeId?.();map.addLayer(layer,before&&map.getLayer(before)?before:undefined);}finally{adding=false;}
 }
 const changed=()=>{faulted=false;lastError=undefined;if(visible()){ensure();map.triggerRepaint();}};
 const styleChanged=()=>ensure();map.on('style.load',styleChanged);map.on('styledata',styleChanged);
 return{get customLayer(){return mode&&!destroyed?layer:undefined;},
  setMode(value:boolean){if(mode===value)return;mode=value;if(!value)reset();changed();},
  setSceneEnvironment(value:SceneEnvironmentState){const next=checkedSceneEnvironment(value);state=next;if(!next.sunlight||!next.shadows)reset();changed();},
  setPageHidden(value:boolean){if(hidden===value)return;hidden=value;if(value)reset();else changed();},
  suspend(){if(destroyed||suspended)return;suspended=true;reset();},
  resume(){if(destroyed)return;suspended=false;changed();},
  resetGPU(){reset();},
  get stats(){return{mode:mode?'3d':'2d',hidden,suspended,destroyed,faulted,lastError,onlyPrerenderCapture:true,core:shadow?.stats};},
  destroy(){if(destroyed)return;destroyed=true;map.off('style.load',styleChanged);map.off('styledata',styleChanged);try{if(options.available()&&map.getLayer(layer.id))map.removeLayer(layer.id);}catch(error){lastError=String(error);}finally{shadow?.destroy();shadow=undefined;}}
 };
}
