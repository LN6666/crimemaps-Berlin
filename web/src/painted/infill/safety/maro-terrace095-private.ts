/** Only the two existing Maro private programmes; preserve shared/base source bytes. */
import {deferredShaderSourcePart,emitShaderSource,joinShaderSourceParts,type ShaderSourcePart} from '../../../safety/render-runtime/shader-source-budget';
const MARO_TERRACE095=[{"key":"infill-frankfurt-maro74","find":"  float path=fraM74Line(p.x*.86+p.z*.51,8.0,.45);\n  return mix(vec3(.61,.59,.46),vec3(.77,.77,.70),path*.55);","replace":"  // Registered DOP supports the olive terrace; no evidence supports uniform diagonal paths.\n  return vec3(.61,.59,.46);"},{"key":"infill-frankfurt-maro80","find":"  float path=fraM80Line(p.x*.86+p.z*.51,8.0,.45);\n  return mix(vec3(.61,.59,.46),vec3(.77,.77,.70),path*.55);","replace":"  // Registered DOP supports the olive terrace; no evidence supports uniform diagonal paths.\n  return vec3(.61,.59,.46);"}] as const;
export function maroTerrace095PrivatePartition(source:string,key:string,city:string):string{
 if(city!=="frankfurt")return source;
 const row=MARO_TERRACE095.find(x=>x.key===key);if(!row)return source;
 if(source.split(row.find).length!==2)throw Error("Maro terrace095 private branch certificate mismatch "+key);
 return source.replace(row.find,row.replace);
}

const MARO_TERRACE095_SOURCE_AUTHORITY=Object.freeze({});
export function maroTerrace095SourcePart(source:ShaderSourcePart,key:string,city:string):ShaderSourcePart{
 if(city!=='frankfurt')return source;const row=MARO_TERRACE095.find(value=>value.key===key);if(!row)return source;
 const size=source.charactersUpperBound+Math.max(0,row.replace.length-row.find.length),tokens=joinShaderSourceParts([source,row.replace]),inputEmission=source.emissionCharactersUpperBound;
 return deferredShaderSourcePart({charactersUpperBound:size,syntaxUpperBound:tokens.syntaxUpperBound,emissionCharactersUpperBound:inputEmission===undefined?undefined:Math.max(inputEmission,source.charactersUpperBound+source.charactersUpperBound,source.charactersUpperBound+size),authority:MARO_TERRACE095_SOURCE_AUTHORITY,authorityTrace:[...source.authorityTrace,'maro-terrace095:one-certified-row-replacement',key],build:()=>maroTerrace095PrivatePartition(emitShaderSource(source),key,city)});
}
