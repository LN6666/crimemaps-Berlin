import {floatingPosition} from './floating-position';
import './selection-inspector.css';
const COPY={zh:{title:'所选地图信息',close:'关闭',reopen:'查看所选地图信息'},en:{title:'Selected map information',close:'Close',reopen:'Show selected map information'},de:{title:'Informationen zum Kartenobjekt',close:'Schließen',reopen:'Informationen zum Kartenobjekt anzeigen'}};
/** Moves the one existing selection node; source buttons and paging keep their listeners. */
export function installSelectionInspector(target:HTMLElement,host:HTMLElement,locale:'zh'|'en'|'de'){
 const c=COPY[locale],home=target.parentElement!;
 const reopen=document.createElement('button');reopen.type='button';reopen.textContent=c.reopen;reopen.hidden=true;home.insertBefore(reopen,target);
 const panel=document.createElement('section');panel.className='geography-panel selection-inspector';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label',c.title);
 const handle=document.createElement('header');handle.className='geography-drag';handle.tabIndex=0;const title=document.createElement('strong');title.textContent=c.title;const x=document.createElement('button');x.type='button';x.textContent='×';x.setAttribute('aria-label',c.close);handle.append(title,x);
 const body=document.createElement('div');body.className='geography-panel-body';panel.append(handle,body);document.body.append(panel);
 let destroyed=false,positioned=false,drag:{x:number;y:number;left:number;top:number}|undefined;
 const viewport=()=>{const v=window.visualViewport;const left=v?.offsetLeft??0,top=v?.offsetTop??0,width=v?.width??innerWidth,height=v?.height??innerHeight;const r=host.getBoundingClientRect();const l=Math.max(left,r.left),t=Math.max(top,r.top),right=Math.min(left+width,r.right),bottom=Math.min(top+height,r.bottom);return right-l>=48&&bottom-t>=80?{left:l,top:t,width:right-l,height:bottom-t}:{left,top,width,height};};
 const move=(left:number,top:number)=>{const v=viewport();panel.style.width=Math.min(280,Math.max(0,v.width-24))+'px';panel.style.maxWidth=Math.max(0,v.width-24)+'px';panel.style.maxHeight=Math.min(320,Math.max(0,v.height-24),v.width<=760?v.height*.6:Infinity)+'px';const p=floatingPosition(left,top,panel.offsetWidth,panel.offsetHeight,v);panel.style.left=p.left+'px';panel.style.top=p.top+'px';panel.style.right='auto';};
 const clamp=()=>{if(panel.hidden)return;const r=panel.getBoundingClientRect();move(r.left,r.top);};
 const open=()=>{if(destroyed||!target.isConnected||!target.childNodes.length)return false;body.append(target);reopen.hidden=false;panel.hidden=false;body.scrollTop=0;const v=viewport();if(!positioned){move(v.left+v.width-292,v.top+12);positioned=true;}else clamp();handle.focus({preventScroll:true});return true;};
 const close=()=>{if(target.parentElement===body)home.insertBefore(target,reopen);reopen.hidden=true;panel.hidden=true;drag=undefined;};
 reopen.onclick=open;x.onclick=()=>{close();host.focus({preventScroll:true});};panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();x.click();}};
 handle.onpointerdown=e=>{if((e.target as HTMLElement).closest('button'))return;const r=panel.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};handle.setPointerCapture(e.pointerId);};
 handle.onpointermove=e=>{if(drag)move(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);};handle.onpointerup=handle.onpointercancel=()=>{drag=undefined;};
 handle.onkeydown=e=>{const delta:Record<string,number[]>={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};if(delta[e.key]){e.preventDefault();const r=panel.getBoundingClientRect();move(r.left+delta[e.key][0],r.top+delta[e.key][1]);}};
 window.addEventListener('resize',clamp);window.visualViewport?.addEventListener('resize',clamp);window.visualViewport?.addEventListener('scroll',clamp);
 return{open,close,get visible(){return!panel.hidden;},destroy(){if(destroyed)return;close();destroyed=true;window.removeEventListener('resize',clamp);window.visualViewport?.removeEventListener('resize',clamp);window.visualViewport?.removeEventListener('scroll',clamp);panel.remove();reopen.remove();}};
}
