// Exact existing external partial-material recovery. No new artistic detail.
// Default disabled; only settled(growth=1) source geometry is an exact lighting match.
import {nativePaintSignature}from'./progressive-native-signature';
import {PROGRESSIVE_FEATURE_GLSL}from'./progressive-feature-glsl';
type C={city:string;objectId:string;partId:string;origin:number[];batches:{positions:ArrayLike<number>;normals:ArrayLike<number>;color:ArrayLike<number>}[]};
const PINS=[{"objectId": "osm/way/23400472", "partId": "osm/way/23400472/component/ea6eb464b7a7e9d260be", "origin": [13.73424075, 51.03186445], "signature": "93904ad6", "leafSHA": "029e61fb048c6ad1f6d195c348d1cd3e4160c9c8733009e5cf7d3a9d4ed8b318"}, {"objectId": "osm/way/126290463", "partId": "osm/way/126290463/component/cdacc49c7a2267766772", "origin": [13.734365, 51.031833649999996], "signature": "1782b718", "leafSHA": "029e61fb048c6ad1f6d195c348d1cd3e4160c9c8733009e5cf7d3a9d4ed8b318"}, {"objectId": "osm/way/22996092", "partId": "osm/way/22996092/component/f64f8e34f3477f47d33d", "origin": [13.74366575, 51.06558595], "signature": "cdf9f872", "leafSHA": "41f0f7cb5c553aaedb970225059b7056c5207d77327d254735080767aeb5bf0c"}, {"objectId": "osm/way/126290462", "partId": "osm/way/126290462/component/ba1c53f6a41539db616d", "origin": [13.74366575, 51.06558595], "signature": "4af80414", "leafSHA": "41f0f7cb5c553aaedb970225059b7056c5207d77327d254735080767aeb5bf0c"}];
const CRITICAL="vec3 f315ExternalPartial332(vec3 base,vec3 p,vec3 normal,float layoutId){\n // Classify the actual triangle plane; smoothed mesh normals vary across the broad masonry shell\n // and otherwise leave pale triangular flecks on walls that the source photo shows as sandstone.\n vec3 faceNormal=cross(dFdx(p),dFdy(p));\n float upness=abs(faceNormal.y)/max(length(faceNormal),.00001);\n // The matching facade photo shows weathered sandstone walls; leave the nave roof unchanged where its color is not visible.\n if(layoutId==380.){\n  if(upness>.35)return base;\n  return mix(base,vec3(.55,.51,.44),.93);\n }\n // The exact contained 38 m part matches the main square bell tower; its photographed crown is dark protective sheeting.\n if(upness>.35)return mix(base,vec3(.10,.11,.12),.95);\n return mix(base,vec3(.55,.51,.44),.93);\n}\n\n// Exact old material branch plus explicit old/current lighting compatibility.\nvec3 f315AcceptedPartial332(vec3 base,vec3 p,vec3 normal,float legacyLayout){\n float d=max(0.,dot(normalize(normal),normalize(vec3(-.35,.8,.4))));\n float currentLight=.63+.37*d,legacyLight=.90+.10*d;\n vec3 legacyBase=base*currentLight/max(legacyLight,.01);\n return f315ExternalPartial332(legacyBase,p,normal,legacyLayout)*legacyLight/max(currentLight,.01);\n}\n";
const BRANCH='if(frame.w==380.||frame.w==381.)return f315AcceptedPartial332(base,p,normal,frame.w);';
export function applyF315AcceptedPartial332(rows:C[],colors:Float32Array,frames:Float32Array,options:{enabled:boolean;nativeLeaf:(c:C)=>string|undefined}){
 const off=(reason:string)=>({enabled:false,writes:0,reason});
 if(!options.enabled)return off('disabled');
 if(!PROGRESSIVE_FEATURE_GLSL.includes(CRITICAL)||!PROGRESSIVE_FEATURE_GLSL.includes(BRANCH))return off('combined exact legacy program not installed');
 for(const p of PINS){const c=rows.find(c=>c.city==='dresden'&&c.objectId===p.objectId&&c.partId===p.partId);if(!c||!c.origin.every((v,i)=>v===p.origin[i])||nativePaintSignature(c as any)!==p.signature||options.nativeLeaf(c)!==p.leafSHA)return off('exact four-source pins unavailable');}
 const total=rows.reduce((s,c)=>s+c.batches.reduce((n,b)=>n+b.positions.length/3,0),0);if(colors.length!==total*4||frames.length!==total*5)return off('buffer scope');
 let at=0,writes=0;const ll=Math.sqrt(.35*.35+.8*.8+.4*.4);
 for(const c of rows)for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3,at++){
  const layout=c.objectId==='osm/way/22996092'&&c.partId==='osm/way/22996092/component/f64f8e34f3477f47d33d'?380:c.objectId==='osm/way/126290462'&&c.partId==='osm/way/126290462/component/ba1c53f6a41539db616d'?381:0;
  if(!layout)continue;
  const nx=b.normals[j],ny=b.normals[j+1],nz=b.normals[j+2],nl=Math.hypot(nx,ny,nz),d=Math.max(0,(-.35*nx+.8*ny+.4*nz)/(ll*Math.max(nl,.00001))),ratio=(.90+.10*d)/(.63+.37*d);
  // Packed colour is a compatibility override only; source batch colours stay unchanged.
  // This makes current vertex lighting equal original .90+.10 lighting exactly.
  colors.set([b.color[0]*ratio,b.color[1]*ratio,b.color[2]*ratio,2],at*4);
  frames.set([0,0,1,layout,1687],at*5);writes++;
 }
 return {enabled:writes===696,writes,new80Writes:0,sourceArraysChanged:false,legacyAppearanceScope:'original380/381 only',exactWhen:'settled source growth1'};
}
