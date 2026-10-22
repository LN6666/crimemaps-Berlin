const labels={zh:{expand:'展开说明',collapse:'收起说明'},en:{expand:'Expand explanation',collapse:'Collapse explanation'},de:{expand:'Erklärung aufklappen',collapse:'Erklärung einklappen'}};
const candidates='p,[data-long-copy],div.hint,span.hint';
const excluded='h1,h2,h3,h4,h5,h6,table,dl,label,button,input,select,textarea,[aria-live],[role="status"],[role="alert"],[data-no-disclosure],.eyebrow,.big,.metric-value,.metric-source,.source-field,[data-source-field],[data-metric-field],.uncertainty-metadata,.uncertainty-location,.date,time,#stats,#freshness,#resolution';
let sequence=0;
export function longCopyEligible(p:HTMLElement){
 if(!p.matches(candidates)||p.closest(excluded))return false;
 if(p.querySelector('button,input,select,textarea,table,dl,time,svg,img,figure,pre,code,[aria-live],[role="status"],[role="alert"],h1,h2,h3,h4,h5,h6,[data-metric-field],[data-source-field],.metric-value,.metric-source,p,div,section,article'))return false;
 const text=(p.textContent??'').trim();if(!text||!/\p{L}/u.test(text))return false;
 const links=Array.from(p.querySelectorAll('a')).map(a=>a.textContent??'').join('');return links.length<=text.length*.8;
}
/** Observe the two sidebars only; preserve original text nodes and links. */
export function installLongCopyDisclosure(root:HTMLElement,locale:'zh'|'en'|'de'){
 const panels=['#map-filters','#map-details'].map(id=>root.querySelector<HTMLElement>(id)).filter((p):p is HTMLElement=>!!p);
 type State={button:HTMLButtonElement;open:boolean;long:boolean;assignedId:boolean};
 const listWrappers=new Map<HTMLElement,HTMLSpanElement>();
 const states=new Map<HTMLElement,State>(),pending=new Set<HTMLElement>(),scanRoots=new Set<Element>();
 const scans:{root:Element;walker:TreeWalker}[]=[];let frame=0,disposed=false;const copy=labels[locale];
 const paint=(p:HTMLElement,s:State)=>{p.classList.toggle('long-copy-preview',s.long&&!s.open);s.button.hidden=!s.long;s.button.setAttribute('aria-expanded',String(s.open));s.button.setAttribute('aria-label',s.open?copy.collapse:copy.expand);s.button.title=s.open?copy.collapse:copy.expand;};
 const remove=(p:HTMLElement,s:State)=>{p.classList.remove('long-copy-preview');s.button.remove();if(s.assignedId)p.removeAttribute('id');states.delete(p);};
 const measure=(p:HTMLElement)=>{
  let s=states.get(p);if(!p.isConnected||!panels.some(panel=>panel.contains(p))||!longCopyEligible(p)){if(s)remove(p,s);return;}
  if(!p.getClientRects().length||p.clientWidth<1)return;
  p.classList.remove('long-copy-preview');const style=getComputedStyle(p),line=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.4;
  const padding=(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0),long=p.scrollHeight-padding>line*4+.5;
  if(!s&&!long)return;
  if(p.tagName==='LI'){if(!long||listWrappers.has(p))return;const span=document.createElement('span');span.className='long-copy-text';span.setAttribute('data-long-copy','');span.append(...p.childNodes);p.append(span);listWrappers.set(p,span);queue(span);return;}
  if(!s){const assignedId=!p.id;if(assignedId)p.id=`long-copy-${++sequence}`;
   const button=document.createElement('button');button.type='button';button.className='long-copy-toggle';button.setAttribute('aria-controls',p.id);
   const arrow=document.createElement('span');arrow.className='long-copy-chevron';arrow.setAttribute('aria-hidden','true');button.append(arrow);
   s={button,open:false,long,assignedId};states.set(p,s);p.after(button);const saved=s;button.onclick=()=>{saved.open=!saved.open;paint(p,saved);};}
  s.long=long;paint(p,s);
 };
 const schedule=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(flush);};
 const queue=(p:HTMLElement)=>{pending.add(p);schedule();};
 const scan=(node:Element)=>{if(scanRoots.has(node))return;scanRoots.add(node);if(node instanceof HTMLElement&&node.matches(candidates))queue(node);scans.push({root:node,walker:document.createTreeWalker(node,NodeFilter.SHOW_ELEMENT)});schedule();};
 function flush(){frame=0;if(disposed)return;
  let visits=256;while(scans.length&&visits-->0){const node=scans[0].walker.nextNode();if(!node){scanRoots.delete(scans.shift()!.root);continue;}if(node instanceof HTMLElement&&node.matches(candidates))pending.add(node);}
  let measurements=64;for(const p of pending){pending.delete(p);measure(p);if(--measurements===0)break;}if(scans.length||pending.size)schedule();
 }
 const observer=new MutationObserver(records=>{for(const record of records){const host=record.target instanceof Element?record.target:record.target.parentElement;if(host?.closest('.long-copy-toggle'))continue;
  const p=host?.closest<HTMLElement>(candidates);if(p)queue(p);if(record.type==='attributes'&&host)scan(host);
  for(const node of [...record.addedNodes,...record.removedNodes])if(node instanceof Element&&!node.matches('.long-copy-toggle'))scan(node);
 }});
 for(const panel of panels){observer.observe(panel,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});scan(panel);}
 const resize=()=>{for(const panel of panels)scan(panel);};let widths=panels.map(p=>p.clientWidth);
 const ro=new ResizeObserver(()=>{const next=panels.map(p=>p.clientWidth);if(next.some((w,i)=>w!==widths[i])){widths=next;resize();}});for(const panel of panels)ro.observe(panel);
 window.addEventListener('resize',resize);window.addEventListener('orientationchange',resize);
 const focus=(event:FocusEvent)=>{const node=event.target;if(!(node instanceof Element))return;const p=node.closest<HTMLElement>(candidates),s=p&&states.get(p);if(p&&s?.long&&!s.open){s.open=true;paint(p,s);}};for(const panel of panels)panel.addEventListener('focusin',focus);
 return{refresh:resize,destroy(){disposed=true;observer.disconnect();ro.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',resize);window.removeEventListener('orientationchange',resize);for(const panel of panels)panel.removeEventListener('focusin',focus);for(const [p,s]of states)remove(p,s);for(const [li,span]of listWrappers)if(span.parentElement===li)span.replaceWith(...span.childNodes);listWrappers.clear();pending.clear();scans.length=0;scanRoots.clear();}};
}
