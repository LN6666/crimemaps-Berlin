import type{BuildingComponent}from'./building-mesh-renderer';
import{OWNER_SHAPE_PATCH_PROFILES}from'./owner-shape-patch-profiles';
import{nativePaintSignature}from'./progressive-native-signature';
import{PROGRESSIVE_FEATURE_SHA}from'./progressive-feature-glsl';
import{PROGRESSIVE_CITY_SOURCE_FULL_SHA,PROGRESSIVE_CITY_EXTRA_GLSL}from'./progressive-feature-cities';
const P={"number":"F236-NorthPortal768","id":"owner-shape-F236-NorthPortal768","tile_key":"owner-shape-F236-NorthPortal768","enabled":true,"family":1713,"city":"dortmund","objectId":"osm/node/2385416809","partId":"osm/way/241450142/owner-photoapprox-north-portal768","sourcePartId":"osm/way/241450142","path":"/safety/buildings3d/owner-shape-patches/F236-NorthPortal770.json","bytes":88773,"sha256":"b6c305bab213901ed780250d3d9e8e864290628a86ccd612d936341926c425ed","origin":[7.4589314,51.5189599],"vertices":1662,"triangles":554,"max_height_m":7.441,"bbox":[7.4588221747060075,51.51895594738381,7.459029036020984,51.51896556123261],"geometryRole":"owner-authorized-reconstruction","retainNative":true,"holdNative":false,"notNative":true,"owner_authorized":true,"additiveOnly":true,"geometrySignature":"8d43c4b3"} as const;
type Patch=(c:BuildingComponent)=>string|undefined;
export function f236NorthReady768(rows:readonly BuildingComponent[],patch:Patch|undefined){
 if(!patch||String(PROGRESSIVE_FEATURE_SHA)!==String(PROGRESSIVE_CITY_SOURCE_FULL_SHA)||!PROGRESSIVE_CITY_EXTRA_GLSL['dortmund']?.includes('if(family==1713.)return f236Full530(base,p,normal,frame,family);'))return false;
 const reg=(OWNER_SHAPE_PATCH_PROFILES as readonly any[]).find(x=>x.number===P.number);if(!reg||!Object.keys(P).every(k=>JSON.stringify(reg[k])===JSON.stringify((P as any)[k])))return false;
 const cs=rows.filter(c=>c.city===P.city&&c.objectId===P.objectId&&c.partId===P.partId);if(cs.length!==1)return false;const c=cs[0],meta=c.sourceFeature?.properties?.owner_shape_patch as any;
 return patch(c)===P.sha256&&nativePaintSignature(c)===P.geometrySignature&&JSON.stringify(c.origin)===JSON.stringify(P.origin)&&c.batches.reduce((n,b)=>n+b.positions.length/3,0)===P.vertices&&meta?.number===P.number&&meta?.sourcePartId===P.sourcePartId&&meta?.sourcePoint===P.objectId&&meta?.sourceCorridor==='osm/way/1092453669'&&meta?.geometryRole==='owner-authorized-reconstruction';
}
export function f236NorthDisplay768(c:BuildingComponent,rows:readonly BuildingComponent[],patch:Patch|undefined){return c.partId!==P.partId||f236NorthReady768(rows,patch);}
export function applyF236North768(draw:BuildingComponent[],colors:Float32Array,frames:Float32Array,source:readonly BuildingComponent[],patch:Patch|undefined){
 if(!f236NorthReady768(source,patch))return 0;const n=draw.reduce((a,c)=>a+c.batches.reduce((a,b)=>a+b.positions.length/3,0),0);if(colors.length!==n*4||frames.length!==n*5)return 0;let at=0,writes=0;
 for(const c of draw)for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3,at++){if(c.city!==P.city||c.objectId!==P.objectId||c.partId!==P.partId)continue;colors.set([...b.color,2],at*4);frames.set([b.positions[j],b.positions[j+1],538,20,1713],at*5);writes++;}return writes;
}
