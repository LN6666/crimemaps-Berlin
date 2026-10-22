import type{BuildingComponent}from'./building-mesh-renderer';
import{nativePaintSignature}from'./progressive-native-signature';
import{OWNER_SHAPE_PATCH_PROFILES}from'./owner-shape-patch-profiles';
type Leaf368=(c:BuildingComponent)=>string|undefined;
const PINS368=[{"city":"dortmund","objectId":"osm/way/53555074","partId":"osm/way/53555074/component/fa8e1431622b91ebb20f","origin":[7.3338418,51.51789345],"geometrySignature":"5de367d5","geometryProof":{"leafPath":"/Users/liangjuanning/Documents/ChatGPT/CrimeMaps/.runtime/review/public-launch-20261003/migration/geography-base-20261008-0001/non-data-engineering/three-dimensional/browser-root/crimemaps-Dortmund/safety/buildings3d/dortmund/flat-00014.json.gz","leafSHA256":"af8c32fa1a0cc4d2e1780ac32b4f16086913f4af296cb5cf29998378ab64a25e"},"commonFrame":{"uAxis":[0.8554127760182428,0,-0.5179360163970302],"vAxis":[0.5179360163970302,0,0.8554127760182428],"uOrigin":-24.020314397477392,"vOrigin":24.91299421266391},"nativeVertices":70,"wallRole":44,"roofPartId":"osm/way/53555074/component/fa8e1431622b91ebb20f/owner-source-roof368"},{"city":"dortmund","objectId":"osm/way/83179305","partId":"osm/way/83179305/component/0b2a1f65e768699557b0","origin":[7.333337800000001,51.51822395000001],"geometrySignature":"f3f6c1df","geometryProof":{"leafPath":"/Users/liangjuanning/Documents/ChatGPT/CrimeMaps/.runtime/review/public-launch-20261003/migration/geography-base-20261008-0001/non-data-engineering/three-dimensional/browser-root/crimemaps-Dortmund/safety/buildings3d/dortmund/flat-00014.json.gz","leafSHA256":"af8c32fa1a0cc4d2e1780ac32b4f16086913f4af296cb5cf29998378ab64a25e"},"commonFrame":{"uAxis":[0.8554189833067208,0,-0.5179397747910559],"vAxis":[0.5179397747910559,0,0.8554189833067208],"uOrigin":24.899809270726415,"vOrigin":11.523679933106202},"nativeVertices":35,"wallRole":45,"roofPartId":"osm/way/83179305/component/0b2a1f65e768699557b0/owner-source-roof368"}] as const;
const PROFILES368=[{"number":"F248-Sidewing368-Schwarzkaue","city":"dortmund","objectId":"osm/way/53555074","partId":"osm/way/53555074/component/fa8e1431622b91ebb20f/owner-source-roof368","sourcePartId":"osm/way/53555074/component/fa8e1431622b91ebb20f","id":"owner-shape-F248-Sidewing368-Schwarzkaue","tile_key":"owner-shape-F248-Sidewing368-Schwarzkaue","path":"/safety/buildings3d/owner-shape-patches/F248-Sidewing368-Schwarzkaue.json","bytes":14693,"sha256":"bbbbe8128353c6fcfede684e94dd86e03a4ff7369a59082630783c371fe325c5","bbox":[7.3334282,51.5176198,7.3342554,51.5181671],"vertices":126,"triangles":42,"max_height_m":10.5,"geometryRole":"owner-authorized-reconstruction","owner_authorized":true,"enabled":false,"family":null,"additiveOnly":true,"geometrySignature":"25cfef88"},{"number":"F248-Sidewing368-Magazin","city":"dortmund","objectId":"osm/way/83179305","partId":"osm/way/83179305/component/0b2a1f65e768699557b0/owner-source-roof368","sourcePartId":"osm/way/83179305/component/0b2a1f65e768699557b0","id":"owner-shape-F248-Sidewing368-Magazin","tile_key":"owner-shape-F248-Sidewing368-Magazin","path":"/safety/buildings3d/owner-shape-patches/F248-Sidewing368-Magazin.json","bytes":9247,"sha256":"0eb0ab22a88d0b3a69660c0f13eabf0369e408c807b960bb6dd51b91e809ad6f","bbox":[7.333001,51.5180434,7.3336746,51.5184045],"vertices":75,"triangles":25,"max_height_m":10.5,"geometryRole":"owner-authorized-reconstruction","owner_authorized":true,"enabled":false,"family":null,"additiveOnly":true,"geometrySignature":"a57ca560"}] as const;

function native368(c:BuildingComponent,leaf:Leaf368|undefined){const p=PINS368.find(p=>c.city===p.city&&c.objectId===p.objectId&&c.partId===p.partId);return p&&leaf&&leaf(c)===p.geometryProof.leafSHA256&&JSON.stringify(c.origin)===JSON.stringify(p.origin)&&nativePaintSignature(c)===p.geometrySignature?p:undefined}
function roof368(c:BuildingComponent,rows:readonly BuildingComponent[],nativeLeaf:Leaf368|undefined,patchLeaf:Leaf368|undefined){
 const p=PROFILES368.find(p=>c.partId===p.partId&&c.objectId===p.objectId&&c.city===p.city);if(!p||!patchLeaf||patchLeaf(c)!==p.sha256||nativePaintSignature(c)!==p.geometrySignature)return undefined;
 const registered=(OWNER_SHAPE_PATCH_PROFILES as readonly any[]).find(x=>x.number===p.number);if(!registered||registered.enabled!==true||registered.owner_authorized!==true||registered.family!==9008||registered.sha256!==p.sha256)return undefined;
 const ns=rows.filter(x=>x.partId===p.sourcePartId&&x.objectId===p.objectId);if(ns.length!==1||!native368(ns[0],nativeLeaf))return undefined;
 const m=c.sourceFeature?.properties?.owner_shape_patch as any;if(m?.number!==p.number||m?.sourcePartId!==p.sourcePartId||m?.sourceParent!=='osm/way/33627795'||m?.formalParentClaim!==false)return undefined;
 return PINS368.find(x=>x.partId===p.sourcePartId);
}
export function f248SidewingDisplay368(c:BuildingComponent,rows:BuildingComponent[],nativeLeaf:Leaf368|undefined,patchLeaf:Leaf368|undefined){return !PROFILES368.some(p=>p.partId===c.partId)||!!roof368(c,rows,nativeLeaf,patchLeaf)}
export function applyF248Sidewing368(draw:BuildingComponent[],colors:Float32Array,frames:Float32Array,nativeLeaf:Leaf368|undefined,patchLeaf:Leaf368|undefined){
 let at=0,paintedNative=0,paintedRoof=0;
 for(const c of draw){const np=native368(c,nativeLeaf),rp=roof368(c,draw,nativeLeaf,patchLeaf),pin=np||rp;for(const [bi,b]of c.batches.entries())for(let j=0;j<b.positions.length;j+=3,at++){
  if(!pin)continue;const f=pin.commonFrame,x=b.positions[j],y=b.positions[j+1],z=b.positions[j+2],u=f.uAxis[0]*x+f.uAxis[2]*z-f.uOrigin,v=f.vAxis[0]*x+f.vAxis[2]*z-f.vOrigin;
  const role=np?(Math.abs(b.normals[j+1])>.5?46:pin.wallRole):(bi===0?42:47);
  frames.set([u,v,role,60,9008],at*5);colors.set(role===42||role===46?[.25,.25,.21,2]:[.52,.22,.13,2],at*4);if(np)paintedNative++;else paintedRoof++;
 }}return{paintedNative,paintedRoof,nativeArraysChanged:false};
}
export const F248_SIDEWING_368_GLSL=`
float f248SBox368(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.015));vec2 q=1.-smoothstep(h-a,h+a,abs(p-c));return q.x*q.y;}
float f248SArch368(vec2 p,float r,float bottom,float spring){float a=max(max(fwidth(p.x),fwidth(p.y)),.015);float stem=f248SBox368(p,vec2(0.,(bottom+spring)*.5),vec2(r,(spring-bottom)*.5));float cap=(1.-smoothstep(r-a,r+a,length(p-vec2(0.,spring))))*step(spring,p.y);return max(stem,cap);}
vec3 f248Sidewing368(vec3 base,vec3 p,vec3 n,vec4 frame){
 vec2 q=frame.xy;float y=p.y;int role=int(floor(frame.z+.5));
 if(role==42||role==46){float h=1.-smoothstep(.012,.035,abs(fract(q.x/.32)-.5));float v=1.-smoothstep(.012,.035,abs(fract(q.y/.25)-.5));return vec3(.25,.25,.21)*(1.-.14*max(h,v));}
 float brickRow=floor(y/.22);float h=1.-smoothstep(.008,.025,abs(mod(y+.11,.22)-.11));float v=1.-smoothstep(.008,.025,abs(mod(q.x+mod(brickRow,2.)*.25+.25,.5)-.25));vec3 c=vec3(.52,.22,.13)*(1.-.12*max(h,v));
 if(role==47)return c; // unobserved upperclosure: brick only, never invent windows
 float normalFront=dot(n.xz,vec2(.5179389338,.8554175944));
 bool positive=role==44;float ss=positive?1.:-1.;float u=q.x*ss;
 bool supported=normalFront>.98&&u>5.3&&u<16.9&&(positive?(q.y> -1.65&&q.y< -.95):(q.y> -.85&&q.y< -.20));
 if(!supported)return c; // all rear/courtyard/unphotographed farfront remain windowfree
 if(y>6.55&&y<7.14){float band=f248SBox368(vec2(q.x,y),vec2(q.x,6.98),vec2(100.,.085));float teeth=f248SBox368(vec2(mod(u,.43),y),vec2(.215,6.76),vec2(.115,.12));c=mix(c,vec3(.72,.66,.53),max(band,teeth));}
 for(int k=0;k<2;k++){float center=8.+float(k)*6.;vec2 w=vec2(u-center,y);float trim=f248SArch368(w,1.28,1.0,4.9),glass=f248SArch368(w,1.08,1.17,4.9);c=mix(c,vec3(.72,.66,.53),trim);c=mix(c,vec3(.10,.17,.14),glass);float mullion=1.-smoothstep(.025,.05,min(abs(w.x),abs(abs(w.x)-.53)));float transom=1.-smoothstep(.025,.05,min(abs(y-2.9),abs(y-4.9)));c=mix(c,vec3(.28,.36,.28),glass*max(mullion,transom));}
 return c;
}
`;
