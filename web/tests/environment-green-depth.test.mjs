import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const entry=['environment-green-ground.ts','environment-greenery-geometry.ts','solar-shadow-admission.ts','environment-scene-shaders.ts'].map(f=>'export * from '+JSON.stringify(path.join(safety,f))+';').join('');
const result=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const module=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const {greenGroundDepthParameters,greenGroundGeometry,prepareSolarShadowBoundary,GREEN_GROUND_FRAGMENT_GLSL,GREEN_GROUND_MATERIAL_GLSL,ENVIRONMENT_SCENE_FRAGMENT_GLSL}=module;
const topDown=new Float32Array([.01,0,0,0,0,0,-.01,0,0,.01,0,0,0,0,0,1]);
function product(a,b){return Array.from({length:16},(_,i)=>{const r=i%4,c=Math.floor(i/4);let n=0;for(let k=0;k<4;k++)n+=a[k*4+r]*b[c*4+k];return n;});}
function project(m,p){const v=Array.from({length:4},(_,r)=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]);return v.slice(0,3).map(n=>n/v[3]);}
function pixelDepth(params,x,y){const {plane,viewport:v,depthRange:d}=params,nx=(x-v[0])/v[2]*2-1,ny=(y-v[1])/v[3]*2-1,z=plane[0]*nx+plane[1]*ny+plane[2];return d[0]+(d[1]-d[0])*(z*.5+.5);}

test('one plane matches the uploaded Float32 geometry in perspective and ortho, with viewport offset and MapLibre depth range',()=>{
 const a=.73,c=Math.cos(a),s=Math.sin(a),view=[1,0,0,0,0,c,s,0,0,-s,c,0,2,-8,-100,1],near=.1,far=400,f=1.7,p=[f,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
 for(const m of [topDown,new Float32Array(product(p,view))])for(const viewport of [[0,0,640,480],[13,29,1920,1200]])for(const range of [[0,1],[.17,.93],[.9,.1]]){
  const params=greenGroundDepthParameters(m,viewport,range);assert.ok(params);assert.ok(params.plane instanceof Float32Array);assert.deepEqual(Array.from(params.viewport),viewport);
  for(let x=-20;x<=20;x+=8)for(let z=-30;z<=30;z+=12){const q=project(m,[x,Math.fround(.01),z]),px=(q[0]+1)*.5*viewport[2]+viewport[0],py=(q[1]+1)*.5*viewport[3]+viewport[1],expected=params.depthRange[0]+(params.depthRange[1]-params.depthRange[0])*(q[2]*.5+.5);assert.ok(Math.abs(pixelDepth(params,px,py)-expected)<1e-7);}
 }
 for(const [m,v,d]of [[new Float32Array(16),[0,0,100,100],[0,1]],[topDown,[0,0,0,100],[0,1]],[topDown,[0,0,100,100],[NaN,1]],[topDown,null,[0,1]]])assert.equal(greenGroundDepthParameters(m,v,d),undefined);
 const edgeOn=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);assert.equal(greenGroundDepthParameters(edgeOn,[0,0,100,100],[0,1]),undefined);
});

test('partial green overlap retains both source polygons and their holes, but repeated coverage has identical depth',()=>{
 const origin=[13.4,52.5],rad=Math.PI/180,scale=6378137*Math.cos(origin[1]*rad),y=Math.log(Math.tan(Math.PI/4+origin[1]*rad/2)),geo=(x,z)=>[origin[0]+x/scale/rad,(2*Math.atan(Math.exp(y+z/scale))-Math.PI/2)/rad],ring=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d],[a,b]].map(v=>geo(...v));
 const sha='a'.repeat(64),boundary=prepareSolarShadowBoundary({boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[ring(-200,-200,200,200)]}}),feature=(id,coordinates)=>({type:'Feature',id,properties:{kind:'green',source_boundary_sha256:sha,osmTags:{}},geometry:{type:'Polygon',coordinates}});
 const features=[feature('osm/way/1',[ring(-40,-20,10,20),ring(-20,-5,-10,5)]),feature('osm/way/2',[ring(-5,-10,35,15)])],before=JSON.stringify(features),mesh=greenGroundGeometry(features,origin,[...geo(-100,-100),...geo(100,100)],boundary,60000,180000);
 assert.equal(mesh.admitted,2);assert.equal(mesh.positions.length/7,12);assert.equal(JSON.stringify(features),before);const params=greenGroundDepthParameters(topDown,[11,17,800,600],[.12,.91]);
 const coverage=(x,z)=>{let n=0;for(let i=0;i<mesh.indices.length;i+=3){const points=mesh.indices.slice(i,i+3).map(j=>[mesh.positions[j*7],mesh.positions[j*7+2]]),signs=points.map((a,k)=>{const b=points[(k+1)%3];return(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]);});if(signs.every(s=>s>=0)||signs.every(s=>s<=0))n++;}return n;};
 for(const [x,z,wanted]of [[-30,2,1],[1,1,2],[25,2,1],[-15,1,0],[45,1,0]]){const count=coverage(x,z);assert.equal(count,wanted);const ndc=project(topDown,[x,Math.fround(.01),z]),px=(ndc[0]+1)*400+11,py=(ndc[1]+1)*300+17,depths=Array.from({length:count},()=>pixelDepth(params,px,py));assert.ok(depths.every(d=>d===depths[0]));let stored=1,blends=0;for(const d of depths){const packed=Math.round(d*(2**24-1));if(packed<stored*(2**24-1)){stored=packed/(2**24-1);blends++;}}assert.equal(blends,wanted?1:0);}
});

test('only the small dedicated green fragment writes depth and both green paths use identical material',()=>{
 assert.ok(!ENVIRONMENT_SCENE_FRAGMENT_GLSL.includes('gl_FragDepth'));assert.ok(GREEN_GROUND_FRAGMENT_GLSL.includes('gl_FragCoord.xy-u_green_viewport.xy'));assert.ok(GREEN_GROUND_FRAGMENT_GLSL.includes('gl_FragDepth=mix(u_green_depth_range.x,u_green_depth_range.y,z*.5+.5)'));
 assert.ok(ENVIRONMENT_SCENE_FRAGMENT_GLSL.includes(GREEN_GROUND_MATERIAL_GLSL));assert.ok(GREEN_GROUND_FRAGMENT_GLSL.includes(GREEN_GROUND_MATERIAL_GLSL));assert.ok(!/sampler|texture\(/.test(GREEN_GROUND_FRAGMENT_GLSL));assert.ok(GREEN_GROUND_FRAGMENT_GLSL.includes('greenGroundColor(v_position,v_normal,v_role)'));assert.ok(ENVIRONMENT_SCENE_FRAGMENT_GLSL.includes('greenGroundColor(v_position,v_normal,v_role)'));assert.ok(module.GREEN_GROUND_VERTEX_GLSL.includes('v_role=a_role'));assert.ok(GREEN_GROUND_FRAGMENT_GLSL.length<4000);
});
