/** Reveal existing interactive information only from a deliberate selection callback. */
export function revealSelectedInformation(target:HTMLElement):boolean {
 if(!target.isConnected||target.hidden||!target.childNodes.length)return false;
 const viewport=window.visualViewport,top=viewport?.offsetTop??0,bottom=top+(viewport?.height??innerHeight);
 const header=document.querySelector<HTMLElement>('#app > header');
 let inset=12;
 if(header){const style=getComputedStyle(header),r=header.getBoundingClientRect();if(['sticky','fixed'].includes(style.position)&&r.top<=top+1&&r.bottom>top)inset=Math.max(inset,r.bottom-top+12);}
 const r=target.getBoundingClientRect();let visible=r.top>=top+inset&&r.top+Math.min(r.height,40)<=bottom-12;
 // Sidebars may scroll independently even when the page itself has no scroll.
 for(let parent=target.parentElement;parent&&visible;parent=parent.parentElement){
  const style=getComputedStyle(parent);
  if(/auto|scroll|hidden|clip/.test(style.overflowY)){const bounds=parent.getBoundingClientRect();if(r.top<bounds.top||r.top+Math.min(r.height,40)>bounds.bottom)visible=false;}
 }
 if(!visible){target.style.scrollMarginTop=inset+'px';target.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});}
 if(!target.hasAttribute('tabindex'))target.tabIndex=-1;
 target.focus({preventScroll:true});return true;
}
