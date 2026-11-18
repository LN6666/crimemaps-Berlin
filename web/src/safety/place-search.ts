type PlaceSearchOptions<T>={
  loadIndex:()=>Promise<readonly T[]>;
  label:(place:T)=>string;
  onSelect:(place:T)=>void;
  noResults:string;
  failed:string;
  delayMs?:number;
};

/** One lazy index request; only the current query may publish results or errors. */
export function installPlaceSearch<T extends {name:string}>(
  input:HTMLInputElement,
  results:HTMLElement,
  options:PlaceSearchOptions<T>,
){
  let index:readonly T[]|undefined,loading:Promise<readonly T[]>|undefined;
  let timer:ReturnType<typeof setTimeout>|undefined,generation=0,destroyed=false;
  const query=()=>input.value.trim().toLocaleLowerCase();
  const current=(ticket:number,value:string)=>!destroyed&&generation===ticket&&query()===value;
  const busy=(value:boolean)=>results.setAttribute('aria-busy',String(value));
  results.setAttribute('aria-live','polite');
  busy(false);
  const message=(value:string)=>{
    const paragraph=results.ownerDocument.createElement('p');
    paragraph.textContent=value;
    results.replaceChildren(paragraph);
  };
  const load=()=>{
    if(index!==undefined)return Promise.resolve(index);
    loading??=options.loadIndex().then(rows=>{if(!destroyed)index=rows;return rows;})
      .finally(()=>{loading=undefined;});
    return loading;
  };
  const search=async(ticket:number,value:string)=>{
    try{
      const rows=await load();
      if(!current(ticket,value))return;
      const matches=rows.filter(place=>place.name.toLocaleLowerCase().includes(value)).slice(0,8);
      if(!matches.length)message(options.noResults);
      for(const place of matches){
        const button=results.ownerDocument.createElement('button');
        button.type='button';
        button.textContent=options.label(place);
        button.onclick=()=>{
          if(!current(ticket,value))return;
          options.onSelect(place);
          results.replaceChildren();
        };
        results.append(button);
      }
    }catch{
      if(current(ticket,value))message(options.failed);
    }finally{
      if(current(ticket,value))busy(false);
    }
  };
  const onInput=()=>{
    const ticket=++generation,value=query();
    clearTimeout(timer);
    results.replaceChildren();
    busy(value.length>=2);
    if(value.length<2)return;
    timer=setTimeout(()=>{timer=undefined;void search(ticket,value);},options.delayMs??160);
  };
  input.addEventListener('input',onInput);
  return{destroy(){
    if(destroyed)return;
    destroyed=true;++generation;
    clearTimeout(timer);
    index=undefined;
    input.removeEventListener('input',onInput);
    results.replaceChildren();
    busy(false);
  }};
}
