/** Public control values only. Fixed selectors prevent a stored snapshot from
 * addressing arbitrary page elements. Restore each owner after its catalogue is
 * ready, via the same change handlers used by visitors. */
const GROUPS={
 geography:'.geography-toolbar > select',
 election:'.electoral-controls > label > input, .electoral-controls > label > select, .electoral-overlays input',
 transit:'.public-transit-controls input[type="checkbox"]',
 shops:'.base-shop-label-controls input',
 scene:'.scene-controls select, .scene-controls input',
} as const;
export type RecoveryControlGroup=keyof typeof GROUPS;
type Value={type:'select'|'checkbox'|'date'|'range';value:string;checked?:boolean};
export type RecoveryControlState=Partial<Record<RecoveryControlGroup,Value[]>>;
export function validRecoveryControls(value:unknown):value is RecoveryControlState {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 return Object.entries(value).every(([key,rows])=>key in GROUPS&&Array.isArray(rows)&&rows.length<=100&&rows.every(v=>v&&typeof v==='object'&&['select','checkbox','date','range'].includes(v.type)&&typeof v.value==='string'&&v.value.length<=200&&(v.type==='checkbox'?typeof v.checked==='boolean':v.checked===undefined)));
}
export function captureRecoveryControls(root:ParentNode):RecoveryControlState {
 const result:RecoveryControlState={};
 for(const [key,selector]of Object.entries(GROUPS))result[key as RecoveryControlGroup]=Array.from(root.querySelectorAll<HTMLInputElement|HTMLSelectElement>(selector)).map(input=>({type:input.tagName==='SELECT'?'select':input.type as Value['type'],value:input.value,...(input.type==='checkbox'?{checked:(input as HTMLInputElement).checked}:{})}));
 return result;
}
export function restoreRecoveryControls(root:ParentNode,state:RecoveryControlState|undefined,group:RecoveryControlGroup):void {
 if(!state||!validRecoveryControls(state))return;
 const rows=state[group]??[];
 for(let i=0;i<rows.length;i++){
  // Type changes can rebuild dependent option/overlay elements. Read them again.
  const inputs=Array.from(root.querySelectorAll<HTMLInputElement|HTMLSelectElement>(GROUPS[group])),saved=rows[i];
  const at=inputs[i],input=saved.type==='checkbox'&&!(at?.type==='checkbox'&&at.value===saved.value)?inputs.find(v=>v.type==='checkbox'&&v.value===saved.value):at;
  if(!input||input.disabled)continue;
  if(saved.type==='select'){
   if(input.tagName!=='SELECT'||!Array.from((input as HTMLSelectElement).options).some(option=>option.value===saved.value)||input.value===saved.value)continue;
   input.value=saved.value;
  }else if(saved.type==='checkbox'){
   if(input.type!=='checkbox'||(input as HTMLInputElement).checked===saved.checked)continue;
   (input as HTMLInputElement).checked=saved.checked!;
  }else{
   if(input.type!==saved.type||input.value===saved.value)continue;
   if(saved.type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(saved.value))continue;
   if(saved.type==='range'){const n=Number(saved.value),min=Number((input as HTMLInputElement).min),max=Number((input as HTMLInputElement).max);if(!Number.isFinite(n)||n<min||n>max)continue;}
   input.value=saved.value;if(saved.type==='range')input.dispatchEvent(new Event('input',{bubbles:true}));
  }
  input.dispatchEvent(new Event('change',{bubbles:true}));
 }
}
