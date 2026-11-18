type ReportListPagerOptions={
  previous:string;
  next:string;
  navigationLabel:string;
  pageLabel:(page:number,pages:number)=>string;
  renderPage:(host:HTMLElement,pageIds:string[])=>void;
  beforePage?:()=>void;
};

/** Keep navigation in place while replacing at most twenty report cards per page. */
export function appendReportListPager(parent:HTMLElement,ids:readonly string[],options:ReportListPagerOptions){
  const document=parent.ownerDocument,rows=[...ids],pages=Math.max(1,Math.ceil(rows.length/20));
  const list=document.createElement('div'),navigation=document.createElement('nav');
  const previous=document.createElement('button'),next=document.createElement('button'),status=document.createElement('span');
  previous.type=next.type='button';previous.textContent=options.previous;next.textContent=options.next;
  navigation.setAttribute('aria-label',options.navigationLabel);
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  navigation.append(previous,status,next);parent.append(list,navigation);
  let page=0;
  const render=()=>{
    options.beforePage?.();
    list.replaceChildren();
    options.renderPage(list,rows.slice(page*20,(page+1)*20));
    status.textContent=options.pageLabel(page+1,pages);
    const previousDisabled=page===0,nextDisabled=page===pages-1,active=document.activeElement;
    // Enable a newly available target before moving off the button about to disable.
    if(!previousDisabled)previous.disabled=false;
    if(!nextDisabled)next.disabled=false;
    if((active===previous&&previousDisabled)||(active===next&&nextDisabled)){
      const target=!previousDisabled?previous:!nextDisabled?next:list;
      if(target===list)list.tabIndex=-1;
      target.focus({preventScroll:true});
    }
    previous.disabled=previousDisabled;next.disabled=nextDisabled;
  };
  previous.onclick=()=>{if(!previous.disabled){page--;render();}};
  next.onclick=()=>{if(!next.disabled){page++;render();}};
  render();
}
