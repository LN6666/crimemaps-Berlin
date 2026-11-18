/** One adjacent candidate's existing grants, never an idle program cache.
 * Repeated handles are separate role references and must be released separately.
 * The renderer ends this handoff at its successor's first complete registration,
 * or at any cancellation/lifecycle boundary, under the original attempt budget. */
export function createProgramGrantHandoff<Context,Program>(release:(context:Context,program:Program)=>void){
 let held:{context:Context;programs:Program[]}|undefined;
 let successor:AbortSignal|undefined,unbind:(()=>void)|undefined;
 function releaseHeld(value:typeof held){if(value)for(const program of value.programs)release(value.context,program);}
 function clear(){const previous=held,cleanup=unbind;held=undefined;successor=undefined;unbind=undefined;cleanup?.();releaseHeld(previous);}
 return{
  replace(context:Context|undefined,programs:readonly (Program|undefined)[],signal?:AbortSignal){
   const previous=held,cleanup=unbind,values=programs.filter((program):program is Program=>program!==undefined);
   held=context!==undefined&&values.length?{context,programs:values}:undefined;
   successor=held?signal:undefined;unbind=undefined;cleanup?.();
   if(held&&signal){const aborted=()=>{if(successor===signal)clear();};signal.addEventListener('abort',aborted,{once:true});unbind=()=>signal.removeEventListener('abort',aborted);if(signal.aborted)aborted();}
   releaseHeld(previous);
  },
  matches(signal:AbortSignal|undefined){return !!held&&signal!==undefined&&successor===signal&&!signal.aborted;},
  clear,
 };
}
