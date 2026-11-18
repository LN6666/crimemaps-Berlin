import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

function load(source,dependencies={}){
  const module={exports:{}};
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  Function('require','module','exports',compiled)(name=>{assert(name in dependencies,name);return dependencies[name];},module,module.exports);
  return module.exports;
}
const focus=load(await readFile(new URL('../src/safety/building-focus-window.ts',import.meta.url),'utf8'));
const policy=load(await readFile(new URL('../src/safety/projected-detail-policy.ts',import.meta.url),'utf8'));
const {createModelViewProjection,projectNativeModelBox,modelProjectionAtOrigin}=load(await readFile(new URL('../src/safety/model-view-projection.ts',import.meta.url),'utf8'),{'./projected-detail-policy':policy,'./building-focus-window':focus});
const viewport={cssWidth:800,cssHeight:600,drawingBufferWidth:1600,drawingBufferHeight:900};
const identity=()=>new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const mercator=([lng,lat])=>[(lng+180)/360,(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2];
const unit=lat=>2*Math.PI*6378137*Math.cos(lat*Math.PI/180);
function viewFor(origin){const [x,y]=mercator(origin),s=unit(origin[1])/100,matrix=identity();matrix[0]=matrix[5]=s;matrix[9]=s*.7;matrix[10]=unit(origin[1])/1000;matrix[12]=-s*x;matrix[13]=-s*y;return matrix;}

// Independent renderer route: first pack metres relative to a DIFFERENT anchor
// using its source-origin ratio, then apply the renderer's anchor/model matrix.
function rendererExtent(origin,box,anchorOrigin,main){
  const anchor=mercator(anchorOrigin),q=mercator(origin),anchorUnit=unit(anchorOrigin[1]),ratio=anchorUnit/unit(origin[1]);
  const dx=(q[0]-anchor[0])*anchorUnit,dz=-(q[1]-anchor[1])*anchorUnit,points=[];
  for(const x of [box[0],box[3]])for(const y of [Math.min(0,box[1]),Math.max(0,box[4])])for(const z of [box[2],box[5]]){
    const packed=[dx+x*ratio,y*ratio,dz+z*ratio];
    const world=[anchor[0]+packed[0]/anchorUnit,anchor[1]-packed[2]/anchorUnit,packed[1]/anchorUnit,1];
    const clip=[0,1,2,3].map(row=>world.reduce((sum,value,col)=>sum+main[col*4+row]*value,0));
    points.push([clip[0]/clip[3],clip[1]/clip[3]]);
  }
  const extent=axis=>(Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis])))/2;
  const xs=points.map(p=>(p[0]+1)*viewport.cssWidth/2),ys=points.map(p=>(1-p[1])*viewport.cssHeight/2);
  return{css:Math.max(extent(0)*viewport.cssWidth,extent(1)*viewport.cssHeight),buffer:Math.max(extent(0)*viewport.drawingBufferWidth,extent(1)*viewport.drawingBufferHeight),bounds:{left:Math.min(...xs),top:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)}};
}

test('one owned snapshot copies input, reuses unchanged revisions and rejects stale/invalid reads',()=>{
  const owner=createModelViewProjection(),matrix=identity(),dimensions={...viewport};
  const first=owner.publish(matrix,dimensions,'camera-1',true);
  assert.equal(owner.read('camera-1'),first);assert.equal(owner.read('camera-2'),undefined);
  assert.equal(owner.publish(identity(),{...viewport},'camera-1',true),first);
  matrix[0]=2;dimensions.cssWidth=1;assert.equal(first.mainMatrix[0],1);assert.equal(first.viewport.cssWidth,800);
  const changed=owner.publish(matrix,dimensions,'camera-1',true);assert(changed.revision>first.revision);
  matrix[1]=NaN;assert.equal(owner.publish(matrix,dimensions,'camera-1',true),undefined);assert.equal(owner.read('camera-1'),undefined);
  const restored=owner.publish(identity(),viewport,'camera-1',true);assert(restored.revision>changed.revision);
  owner.invalidate();assert.equal(owner.read('camera-1'),undefined);
  assert(owner.publish(identity(),viewport,'camera-1',true).revision>restored.revision);
});

test('native box CSS/buffer extent matches anchored renderer packing at equatorial and high latitude',()=>{
  const box=[-10,10,-15,20,90,25];
  for(const latitude of [0,75]){
    const origin=[10,latitude],matrix=viewFor(origin),owner=createModelViewProjection();
    const result=projectNativeModelBox(owner.publish(matrix,viewport,'view',true),origin,box);
    const expected=rendererExtent(origin,box,[9.975,latitude-.04],matrix);
    assert.equal(result.reason,'projected');assert.equal(result.mainClip,'inside-or-intersecting');
    assert(Math.abs(result.cssExtentPx-expected.css)<1e-6);assert(Math.abs(result.drawingBufferExtentPx-expected.buffer)<1e-6);
    for(const key of ['left','top','right','bottom'])assert(Math.abs(result.cssBounds[key]-expected.bounds[key])<1e-6,`full projected ${key} agrees with independent renderer packing`);
    assert.equal('quality' in result,false,'size is not a geometry LOD choice');
    assert.equal(projectNativeModelBox(owner.read('view'),origin,[-10,0,-15,20,90,25]).cssExtentPx,result.cssExtentPx,'include the complete zero-to-full growth sweep');
  }
});

test('origin projection export matches the original metre-to-world clip calculation and rejects invalid frames',()=>{
  assert.equal(typeof modelProjectionAtOrigin,'function');
  const main=new Float64Array([1.7,.2,.03,.001,-.1,1.1,.05,-.002,.4,-.3,.8,.003,-.6,.1,.2,1]);
  const frame={mainMatrix:main,viewport,mercator:true};
  for(const origin of [[10,0],[-73,75]]){
    const result=modelProjectionAtOrigin(frame,origin);assert(result);assert(result.matrix instanceof Float64Array);assert.equal(result.viewport,viewport);
    const [ox,oy]=mercator(origin),scale=unit(origin[1]);
    for(const [x,y,z]of [[0,0,0],[120,38,-17],[-62,-4,83]]){
      // Legacy route: convert source metres to world coordinates first, then
      // apply the original public main matrix, including its perspective row.
      const world=[ox+x/scale,oy-z/scale,y/scale,1],local=[x,y,z,1];
      for(let row=0;row<4;row++){
        const expected=world.reduce((sum,value,col)=>sum+main[col*4+row]*value,0);
        const actual=local.reduce((sum,value,col)=>sum+result.matrix[col*4+row]*value,0);
        assert(Math.abs(actual-expected)<=1e-12*Math.max(1,Math.abs(expected)));
      }
    }
  }
  const invalidMatrix=main.slice();invalidMatrix[6]=NaN;
  for(const [snapshot,origin]of [[undefined,[10,50]],[{...frame,mercator:false},[10,50]],[{...frame,mainMatrix:invalidMatrix},[10,50]],[{...frame,viewport:{...viewport,cssHeight:0}},[10,50]],[frame,[181,50]],[frame,[10,90]],[frame,[NaN,50]]])assert.equal(modelProjectionAtOrigin(snapshot,origin),undefined);
});

test('outside evidence is conservative; near-plane, unsupported or invalid inputs remain unknown',()=>{
  const owner=createModelViewProjection(),origin=[10,50],matrix=viewFor(origin),box=[1000,20,-5,1010,60,5];
  assert.equal(projectNativeModelBox(owner.publish(matrix,viewport,'view',true),origin,box).mainClip,'outside');
  matrix[14]=-1;const near=projectNativeModelBox(owner.publish(matrix,viewport,'near',true),origin,box);
  assert.deepEqual(near,{cssExtentPx:null,drawingBufferExtentPx:null,mainClip:'unknown',reason:'near-plane'});
  assert.equal(projectNativeModelBox(owner.publish(viewFor(origin),viewport,'globe',false),origin,box).reason,'unsupported-projection');
  const valid=owner.publish(viewFor(origin),viewport,'valid',true);
  assert.equal(projectNativeModelBox(valid,[10,90],box).reason,'invalid');
  assert.equal(projectNativeModelBox(valid,origin,[NaN,0,0,1,1,1]).mainClip,'unknown');
  assert.equal(projectNativeModelBox(owner.read('stale'),origin,box).reason,'missing-snapshot');
  assert.equal(owner.publish(identity(),{...viewport,cssHeight:0},'invalid',true),undefined);
});

test('live projection snapshots keep one core reference across fullscreen, buffer scaling and reentry',()=>{
 const owner=createModelViewProjection(),initial=owner.publish(identity(),viewport,'small',true);
 assert.equal(initial.buildingFocus.coreAreaRatio,1);
 const largeViewport={...viewport,cssWidth:1600,cssHeight:1200};
 const large=owner.publish(identity(),largeViewport,'full',true);
 assert.equal(large.buildingFocus.coreAreaRatio,2);
 assert.deepEqual(large.buildingFocus.reference,{width:800,height:600});
 const rect=large.buildingFocus.core;
 assert(Math.abs((rect.right-rect.left)*(rect.bottom-rect.top)-960000)<1e-6);
 assert.equal((rect.right+rect.left)/2,800);assert.equal((rect.bottom+rect.top)/2,600);
 const reduced=owner.publish(identity(),{...largeViewport,drawingBufferWidth:400,drawingBufferHeight:300},'full',true);
 assert.deepEqual(reduced.buildingFocus,large.buildingFocus,'GPU resolution cannot change the focus area');
 owner.invalidate();const restored=owner.publish(identity(),viewport,'returned',true);
 assert.deepEqual(restored.buildingFocus,initial.buildingFocus,'2D or hidden invalidation does not inflate the reference');
 assert.equal(owner.read('full'),undefined,'stale camera snapshots are unavailable to admission');
});

const {projectedGroundArea}=load(await readFile(new URL('../src/safety/model-view-projection.ts',import.meta.url),'utf8'),{'./projected-detail-policy':policy,'./building-focus-window':focus});
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);};
function multiply(a,b){const r=new Float64Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+row]*b[c*4+k];r[c*4+row]=s;}return r;}
// A real pinhole camera over mercator world space (y grows southward), like the map's main matrix.
function camera({pitch=0,bearing=0,distance=1e-4,width=1000,height=600,target=[.5,.33]}={}){
 const t=pitch*Math.PI/180,b=bearing*Math.PI/180,eye=[target[0]-distance*Math.sin(t)*Math.sin(b),target[1]+distance*Math.sin(t)*Math.cos(b),distance*Math.cos(t)];
 const z=norm(sub(eye,[...target,0])),x=norm(cross([Math.sin(b),-Math.cos(b),0],z)),y=cross(z,x);
 const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
 const g=1/Math.tan(36.87*Math.PI/360),n=distance/100,f=distance*100,projection=[g*height/width,0,0,0,0,g,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0];
 return{mercator:true,mainMatrix:multiply(projection,view),viewport:{cssWidth:width,cssHeight:height,drawingBufferWidth:width,drawingBufferHeight:height}};
}
const full={left:0,top:0,right:1000,bottom:600};
test('ground area of a screen rectangle is the real footprint: rotation-invariant, pitch-sensitive, undefined above the horizon',()=>{
 const flat=projectedGroundArea(camera(),full),lat=Math.atan(Math.sinh(Math.PI*(1-2*.33))),metres=2*Math.PI*6378137*Math.cos(lat);
 const expected=(2*1e-4*Math.tan(36.87*Math.PI/360))**2*1000/600*metres*metres;
 assert(Math.abs(flat/expected-1)<1e-3,`top-down footprint ${flat} vs ${expected}`);
 for(const bearing of [30,45,90,170])assert(Math.abs(projectedGroundArea(camera({bearing}),full)/flat-1)<1e-6,'rotating the map does not change the covered ground');
 const tilted=projectedGroundArea(camera({pitch:45}),full),steep=projectedGroundArea(camera({pitch:60}),full);
 assert(tilted>flat&&steep>tilted,'pitch shows more ground, monotonically');
 // Pitched footprints extend in different directions; the centroid-latitude
 // mercator scale then differs by well under 0.2 % over a few kilometres.
 assert(Math.abs(projectedGroundArea(camera({pitch:45,bearing:60}),full)/tilted-1)<2e-3);
 const centre={left:250,top:150,right:750,bottom:450};assert(projectedGroundArea(camera({pitch:60}),centre)<steep/2,'the central rectangle covers far less than the horizon-dominated top of the screen');
 assert.equal(projectedGroundArea(camera({pitch:80}),full),undefined,'a corner above the horizon has no ground');
 assert.equal(projectedGroundArea({...camera(),mercator:false},full),undefined);
 assert.equal(projectedGroundArea(camera(),{left:10,top:10,right:10,bottom:20}),undefined);
});
