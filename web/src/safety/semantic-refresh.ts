import type {LISProjectionGate} from './lis-projection-gate';
/** One native-detail acquisition; completion cannot repaint a closed/reselected/destroyed panel. */
export function createSemanticRefresh(gate:LISProjectionGate){
 let epoch=0,request=new AbortController(),loading:Promise<void>|undefined,destroyed=false;
 const cancel=()=>{epoch++;request.abort();request=new AbortController();loading=undefined;};
 return {cancel,request(isCurrent:()=>boolean,repaint:()=>void){if(destroyed||loading)return;const token=epoch,signal=request.signal;const pending=gate.ensure(signal);loading=pending;void pending.then(()=>{if(!destroyed&&!signal.aborted&&token===epoch&&isCurrent())repaint();}).catch(()=>{}).finally(()=>{if(token===epoch&&loading===pending)loading=undefined;});},destroy(){cancel();destroyed=true;},get loading(){return !!loading;}};
}
