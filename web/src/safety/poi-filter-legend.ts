type PoiCatalog=Record<string,{color:string;label:string}>;

/** Scope groups control filtering; colors still describe each feature's actual kind. */
export function createPoiFilterLegend(
  catalog:PoiCatalog,
  kinds:readonly string[],
  groupLabel:string,
  kindName:(kind:string,fallback:string)=>string,
):HTMLSpanElement {
  const content=document.createElement("span");
  content.className="poi-filter-legend";
  const uniqueKinds=[...new Set(kinds)];
  const entries=document.createElement("span");
  if(uniqueKinds.length>1){
    const heading=document.createElement("span");
    heading.textContent=groupLabel;
    content.append(heading);
    entries.className="poi-filter-kinds";
  }
  for(const kind of uniqueKinds){
    const entry=document.createElement("span");
    entry.className="poi-filter-kind";
    entry.dataset.kind=kind;
    const swatch=document.createElement("span");
    swatch.className="poi-filter-swatch";
    swatch.setAttribute("aria-hidden","true");
    // Match styledPois, including unknown kinds and the deliberately darker center.
    const color=catalog[kind]?.color??"#64748b";
    const centerColor=/^#[0-9a-f]{6}$/i.test(color)
      ? "#"+color.slice(1).match(/../g)!.map(channel=>Math.round(parseInt(channel,16)*0.6).toString(16).padStart(2,"0")).join("")
      : "#3c4653";
    const area=document.createElement("span");
    area.className="poi-filter-area";
    area.style.background=color;
    const center=document.createElement("span");
    center.className="poi-filter-center";
    center.style.background=centerColor;
    swatch.append(area,center);
    entry.append(swatch,document.createTextNode(uniqueKinds.length===1
      ? groupLabel : kindName(kind,catalog[kind]?.label??kind)));
    entries.append(entry);
  }
  if(!uniqueKinds.length)entries.textContent=groupLabel;
  content.append(entries);
  return content;
}
