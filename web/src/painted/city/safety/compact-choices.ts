/** Small exclusive choices shown directly, retaining the existing select as state. */
export function compactChoices(select:HTMLSelectElement, labels:Record<string,string>={}){
 const group=document.createElement('span');group.className='compact-choices';group.setAttribute('role','group');group.setAttribute('aria-label',select.getAttribute('aria-label')??'');
 select.hidden=true;select.after(group);
 const synchronize=()=>{
  group.replaceChildren(...Array.from(select.options,option=>{
   const button=document.createElement('button');button.type='button';button.textContent=labels[option.value]??option.text;button.title=option.text;button.disabled=select.disabled||option.disabled;button.setAttribute('aria-pressed',String(option.value===select.value));
   button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));synchronize();};
   return button;
  }));
 };
 const observer=new MutationObserver(synchronize);observer.observe(select,{childList:true,subtree:true,attributes:true});
 select.addEventListener('change',synchronize);window.addEventListener('pageshow',synchronize);window.addEventListener('storage',synchronize);synchronize();
 return {synchronize,destroy(){observer.disconnect();select.removeEventListener('change',synchronize);window.removeEventListener('pageshow',synchronize);window.removeEventListener('storage',synchronize);group.remove();select.hidden=false;}};
}
