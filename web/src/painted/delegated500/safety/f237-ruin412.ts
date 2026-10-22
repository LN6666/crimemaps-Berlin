import{f237ActualRoute435}from'./f237-route435';
import{PROGRESSIVE_FEATURE_GLSL as F237_PROGRAM412}from'./progressive-feature-glsl';
import type{BuildingComponent}from'./building-mesh-renderer';
import{OWNER_SHAPE_PATCH_PROFILES}from'./owner-shape-patch-profiles';
import{nativePaintSignature}from'./progressive-native-signature';
const PROFILES=[{"number":"F237-RuinWall412","city":"dortmund","objectId":"osm/relation/4296785","partId":"osm/relation/4296785/photoapprox412/763233791-west-wall","sourcePartId":"osm/way/763233791/source-outline412","id":"F237-RuinWall412","tile_key":"F237-RuinWall412","path":"/safety/buildings3d/owner-shape-patches/F237-RuinWall412.json","bytes":112239,"sha256":"67c05bbe9b9a5a28bfde69bbf70248bcfd3c81f2d5f6d40cbc4f7c6ad6a925ff","vertices":1212,"triangles":404,"max_height_m":8.5,"bbox":[7.4873029,51.4199638,7.4874393,51.4200439],"geometryRole":"owner-authorized-reconstruction","owner_authorized":true,"enabled":true,"family":1707,"sourceOnly":true,"additiveOnly":true,"holdNative":false,"geometrySignature":"f598a60c"}] as const,ROLES=[{"number":"F237-RuinWall412","batchIndex":0,"role":11},{"number":"F237-RuinWall412","batchIndex":1,"role":12}] as const,U=[0.21984003000651176, -0.9755359353743643] as const,V=[0.9755359353743643, 0.21984003000651176] as const,ORIGIN=[7.4873029, 51.420028] as const;
const PROGRAM412="float f237Joint412(float q,float scale){float d=min(fract(q/scale),1.-fract(q/scale))*scale;return 1.-smoothstep(.012,.028,d);}\nvec3 f237Full412(vec3 base,vec3 p,vec3 n,vec4 frame,float family){\n float row=floor(p.y/.23),u=frame.x+mod(row,2.)*.22;float mortar=max(f237Joint412(u,.48),f237Joint412(p.y,.23));float block=fract(sin(dot(vec2(floor(u/.48),row),vec2(17.13,79.7)))*43873.17);vec3 stone=mix(vec3(.43,.425,.36),vec3(.66,.64,.53),block*.64);stone=mix(stone,vec3(.32,.32,.27),mortar*.52);\n // No painted glass, no inferred storeys: openings are actual clipped voids.\n if(frame.z>11.5)stone*=.78;float damp=(1.-smoothstep(.0,.70,p.y))*.13;return stone*(1.-damp);\n}\n";
type Leaf412=(c:BuildingComponent)=>string|undefined;
function ready412(rows:readonly BuildingComponent[],leaf:Leaf412|undefined){
 if(!leaf||!f237ActualRoute435(PROGRAM412)||!F237_PROGRAM412.includes(PROGRAM412))return false;
 // Original selected source is proven absent from frozen native leaves. Any future native selected row rejects derived rendering, avoiding duplicate ownership.
 if(rows.some(c=>c.objectId==='osm/relation/4296785'&&![...PROFILES,...EXTRA453].some(p=>p.partId===c.partId)))return false;
 for(const p of PROFILES){const r=(OWNER_SHAPE_PATCH_PROFILES as readonly any[]).find(r=>r.number===p.number),cs=rows.filter(c=>c.city===p.city&&c.objectId===p.objectId&&c.partId===p.partId);if(!r||!Object.keys(p).every(k=>JSON.stringify(r[k])===JSON.stringify((p as any)[k]))||cs.length!==1||nativePaintSignature(cs[0])!==p.geometrySignature||leaf(cs[0])!==p.sha256||JSON.stringify(cs[0].origin)!==JSON.stringify(ORIGIN))return false;}
 return true;
}
export function f237Display412(c:BuildingComponent,rows:BuildingComponent[],leaf:Leaf412|undefined){if(EXTRA453.some(p=>p.partId===c.partId))return ready453(rows,leaf);return !PROFILES.some(p=>p.partId===c.partId)||ready412(rows,leaf);}
function applyLegacy412(draw:BuildingComponent[],colors:Float32Array,paint:Float32Array,raw:readonly BuildingComponent[],leaf:Leaf412|undefined){
 if(!ready412(raw,leaf))return 0;let vi=0,writes=0;
 for(const c of draw)for(const[bi,b]of c.batches.entries())for(let j=0;j<b.positions.length;j+=3,vi++){
 const p=PROFILES.find(p=>p.partId===c.partId&&p.objectId===c.objectId);if(!p)continue;const f=ROLES.find(r=>r.number===p.number&&r.batchIndex===bi);if(!f)continue;const x=b.positions[j],z=b.positions[j+2];paint.set([U[0]*x+U[1]*z,V[0]*x+V[1]*z,f.role,100,1707],vi*5);colors.set([b.color[0],b.color[1],b.color[2],2],vi*4);writes++;
 }return writes;
}

const EXTRA453=[{"number":"F237-KeepOther453","city":"dortmund","objectId":"osm/relation/4296785","partId":"osm/relation/4296785/photoapprox453/F237-KeepOther453","sourcePartId":"osm/way/763233791/source-outline412","id":"F237-KeepOther453","tile_key":"F237-KeepOther453","path":"/safety/buildings3d/owner-shape-patches/F237-KeepOther453.json","bytes":51036,"sha256":"e2f6b73ad09f78c22c8a673dd03490ac861f0ca0aa81891d76a1b60051e4f65d","vertices":558,"triangles":186,"max_height_m":8.6,"bbox":[7.4873029,51.4199638,7.4874393,51.4200439],"geometryRole":"owner-authorized-reconstruction","owner_authorized":true,"enabled":true,"family":1707,"sourceOnly":true,"additiveOnly":true,"holdNative":false,"geometrySignature":"aaf86f84"},{"number":"F237-Palas453","city":"dortmund","objectId":"osm/relation/4296785","partId":"osm/relation/4296785/photoapprox453/F237-Palas453","sourcePartId":"osm/way/763233793/source-outline412","id":"F237-Palas453","tile_key":"F237-Palas453","path":"/safety/buildings3d/owner-shape-patches/F237-Palas453.json","bytes":101783,"sha256":"0584a1e51c7eb5d7f20f6012788cc8385e9726ad8b5ba723580918537ea24dc7","vertices":1074,"triangles":358,"max_height_m":8.6,"bbox":[7.4868577,51.4199688,7.4871646,51.4200758],"geometryRole":"owner-authorized-reconstruction","owner_authorized":true,"enabled":true,"family":1707,"sourceOnly":true,"additiveOnly":true,"holdNative":false,"geometrySignature":"0ccb10e9"}] as const;
const ROLES453=[{"number":"F237-KeepOther453","batchIndex":0,"role":11},{"number":"F237-KeepOther453","batchIndex":1,"role":12},{"number":"F237-Palas453","batchIndex":0,"role":11},{"number":"F237-Palas453","batchIndex":1,"role":12}] as const;

function ready453(rows:readonly BuildingComponent[],leaf:Leaf412|undefined){
 if(!leaf||!ready412(rows,leaf))return false;
 for(const p of EXTRA453){const r=(OWNER_SHAPE_PATCH_PROFILES as readonly any[]).find(r=>r.number===p.number),cs=rows.filter(c=>c.city===p.city&&c.objectId===p.objectId&&c.partId===p.partId);if(!r||!Object.keys(p).every(k=>JSON.stringify(r[k])===JSON.stringify((p as any)[k]))||cs.length!==1||nativePaintSignature(cs[0])!==p.geometrySignature||leaf(cs[0])!==p.sha256||JSON.stringify(cs[0].origin)!==JSON.stringify(ORIGIN))return false;}
 return true;
}
export function applyF237412(draw:BuildingComponent[],colors:Float32Array,paint:Float32Array,raw:readonly BuildingComponent[],leaf:Leaf412|undefined){
 let writes=applyLegacy412(draw,colors,paint,raw,leaf);if(!ready453(raw,leaf))return writes;let vi=0;
 for(const c of draw)for(const[bi,b]of c.batches.entries())for(let j=0;j<b.positions.length;j+=3,vi++){
  const p=EXTRA453.find(p=>p.partId===c.partId&&p.objectId===c.objectId);if(!p)continue;const f=ROLES453.find(r=>r.number===p.number&&r.batchIndex===bi);if(!f)continue;const x=b.positions[j],z=b.positions[j+2];paint.set([U[0]*x+U[1]*z,V[0]*x+V[1]*z,f.role,100,1707],vi*5);colors.set([b.color[0],b.color[1],b.color[2],2],vi*4);writes++;
 }return writes;
}
