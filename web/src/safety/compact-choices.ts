/** Small exclusive choices shown directly, retaining the existing select as state. */
export function compactChoices(select:HTMLSelectElement, labels:Record<string,string>={}){
 const group=document.createElement('span');group.className='compact-choices';group.setAttribute('role','group');group.setAttribute('aria-label',select.getAttribute('aria-label')??'');
 select.hidden=true;select.after(group);
 type Choice={option:HTMLOptionElement;button:HTMLButtonElement;value:string};
 let choices:Choice[]=[],destroyed=false;
 const createChoice=(option:HTMLOptionElement):Choice=>{
  const button=document.createElement('button');button.type='button';
  const choice={option,button,value:option.value};
  button.onclick=()=>{
   if(destroyed||!choices.includes(choice)||!Array.from(select.options).includes(option)||select.disabled||option.disabled||button.disabled)return;
   select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));synchronize();
  };
  return choice;
 };
 const synchronize=()=>{
  if(destroyed)return;
  const options=Array.from(select.options),focused=choices.find(({button})=>button===document.activeElement);
  const changed=options.length!==choices.length||options.some((option,index)=>option!==choices[index].option);
  if(changed){
   const previous=new Map(choices.map(choice=>[choice.option,choice]));
   const next=options.map(option=>previous.get(option)??createChoice(option));
   for(const choice of choices)if(!next.includes(choice))choice.button.onclick=null;
   choices=next;group.replaceChildren(...choices.map(({button})=>button));
  }
  group.setAttribute('aria-label',select.getAttribute('aria-label')??'');
  for(const choice of choices){
   const {option,button}=choice;choice.value=option.value;
   button.textContent=labels[option.value]??option.text;button.title=option.text;button.disabled=select.disabled||option.disabled;button.setAttribute('aria-pressed',String(option.value===select.value));
  }
  // Replacing the option list can remove its active button. Other focus stays untouched.
  if(changed&&focused&&(document.activeElement===document.body||document.activeElement===focused.button))choices.find(choice=>choice.value===focused.value&&!choice.button.disabled)?.button.focus({preventScroll:true});
 };
 const observer=new MutationObserver(synchronize);observer.observe(select,{childList:true,subtree:true,attributes:true});
 select.addEventListener('change',synchronize);window.addEventListener('pageshow',synchronize);window.addEventListener('storage',synchronize);synchronize();
 return {synchronize,destroy(){if(destroyed)return;destroyed=true;observer.disconnect();select.removeEventListener('change',synchronize);window.removeEventListener('pageshow',synchronize);window.removeEventListener('storage',synchronize);for(const {button}of choices)button.onclick=null;choices=[];group.remove();select.hidden=false;}};
}
