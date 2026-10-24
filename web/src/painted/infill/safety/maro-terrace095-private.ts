/** Only the two existing Maro private programmes; preserve shared/base source bytes. */
const MARO_TERRACE095=[{"key":"infill-frankfurt-maro74","find":"  float path=fraM74Line(p.x*.86+p.z*.51,8.0,.45);\n  return mix(vec3(.61,.59,.46),vec3(.77,.77,.70),path*.55);","replace":"  // Registered DOP supports the olive terrace; no evidence supports uniform diagonal paths.\n  return vec3(.61,.59,.46);"},{"key":"infill-frankfurt-maro80","find":"  float path=fraM80Line(p.x*.86+p.z*.51,8.0,.45);\n  return mix(vec3(.61,.59,.46),vec3(.77,.77,.70),path*.55);","replace":"  // Registered DOP supports the olive terrace; no evidence supports uniform diagonal paths.\n  return vec3(.61,.59,.46);"}] as const;
export function maroTerrace095PrivatePartition(source:string,key:string,city:string):string{
 if(city!=="frankfurt")return source;
 const row=MARO_TERRACE095.find(x=>x.key===key);if(!row)return source;
 if(source.split(row.find).length!==2)throw Error("Maro terrace095 private branch certificate mismatch "+key);
 return source.replace(row.find,row.replace);
}
