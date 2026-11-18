import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const safety=new URL('../src/safety/',import.meta.url).pathname;
const compiled=await build({stdin:{contents:"export {greenGroundGeometry} from './environment-greenery-geometry';export {prepareSolarShadowBoundary} from './solar-shadow-admission';",resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {greenGroundGeometry,prepareSolarShadowBoundary}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const origin=[13.4,52.5],rad=Math.PI/180,scale=6378137*Math.cos(origin[1]*rad),baseY=Math.log(Math.tan(Math.PI/4+origin[1]*rad/2));
const geo=(x,z)=>[origin[0]+x/scale/rad,(2*Math.atan(Math.exp(baseY+z/scale))-Math.PI/2)/rad];
const ring=points=>[...points,points[0]].map(p=>geo(...p));
const rectangle=(x0,z0,x1,z1)=>ring([[x0,z0],[x1,z0],[x1,z1],[x0,z1]]);
const doubled=source=>source.slice(0,-1).flatMap(p=>[[...p],[...p]]).concat([[...source[0]]]);
const sha='a'.repeat(64),viewport=[...geo(-150,-150),...geo(150,150)];
const feature=(id,coordinates,osmTags={landuse:'grass'},boundarySHA256=sha)=>({type:'Feature',id,properties:{kind:'green',osmTags,source_boundary_sha256:boundarySHA256,source_pbf_sha256:'b'.repeat(64),source_snapshot:'synthetic-coverage',displayClip:false},geometry:{type:'Polygon',coordinates}});
const municipality=(coordinates,boundarySHA256=sha)=>prepareSolarShadowBoundary({boundarySHA256,geometry:{type:'Polygon',coordinates}});
const wide=municipality([rectangle(-200,-200,200,200)]);
const points=mesh=>Array.from({length:mesh.positions.length/7},(_,i)=>[mesh.positions[i*7],mesh.positions[i*7+2]]);
function triangles(mesh){const p=points(mesh);return Array.from({length:mesh.indices.length/3},(_,i)=>mesh.indices.slice(i*3,i*3+3).map(index=>p[index]));}
const cross=([a,b,c])=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const area=mesh=>triangles(mesh).reduce((sum,t)=>sum+Math.abs(cross(t))/2,0);
function assertPacked(mesh,vertices,indices){
  assert.equal(mesh.positions.length/7,vertices);assert.equal(mesh.indices.length,indices);
  assert.equal(new Set(mesh.indices).size,vertices,'every retained vertex is referenced');
  assert(mesh.indices.every(i=>Number.isInteger(i)&&i>=0&&i<vertices));
  const winding=triangles(mesh).map(t=>Math.sign(cross(t)));
  assert(winding.every(sign=>sign!==0&&sign===winding[0]),'triangles keep consistent non-degenerate winding');
}

test('exact packed budget retains complete grass, park, garden and forest polygons with source holes and either ring winding',()=>{
  const plain=greenGroundGeometry([feature('osm/way/1',[doubled(rectangle(10,10,40,40))])],origin,viewport,wide,4,6);
  assertPacked(plain,4,6);assert.equal(plain.admitted,1);assert(Math.abs(area(plain)-900)<.1);
  for(const [tags,role] of [[{landuse:'grass'},4],[{leisure:'park'},3],[{leisure:'garden'},3],[{landuse:'forest'},5]])for(const reverse of [false,true]){
    const rings=[doubled(rectangle(-50,-50,50,50)),doubled(rectangle(-10,-10,10,10))];
    if(reverse)for(const r of rings)r.reverse();
    const f=feature('osm/way/1',rings,tags),before=JSON.stringify(f);
    const mesh=greenGroundGeometry([f],origin,viewport,wide,10,24);
    assert.equal(mesh.admitted,1);assert.equal(mesh.omitted,0);assert.equal(mesh.held,0);
    assert(mesh.positions.length/7<=10,'both ring windings fit the same 10-vertex budget');
    assertPacked(mesh,mesh.positions.length/7,24);
    assert(Math.abs(area(mesh)-9600)<.1,'all 10,000 m² outer cover minus the 400 m² source hole remains');
    for(const t of triangles(mesh)){
      const centre=[t.reduce((sum,p)=>sum+p[0],0)/3,t.reduce((sum,p)=>sum+p[1],0)/3];
      assert(Math.abs(centre[0])>=10||Math.abs(centre[1])>=10,'source hole remains unfilled');
    }
    for(let i=0;i<mesh.positions.length;i+=7){assert.equal(mesh.positions[i+6],role);assert.deepEqual(mesh.positions.slice(i+3,i+6),[0,1,0]);}
    assert.equal(JSON.stringify(f),before,'triangulation scratch reuse never mutates source rings or tags');
  }
});

test('municipality rejection consumes only accepted triangles and leaves room for the next complete polygon',()=>{
  const boundary=municipality([rectangle(0,-100,100,100)],'c'.repeat(64));
  const edge=feature('osm/way/1',[ring([[-40,0],[-20,-20],[20,-20],[40,0],[20,20],[-20,20]])],{landuse:'grass'},boundary.boundarySHA256);
  const next=feature('osm/way/2',[rectangle(60,60,80,80)],{landuse:'grass'},boundary.boundarySHA256),before=JSON.stringify([edge,next]);
  const tight=greenGroundGeometry([edge],origin,viewport,boundary,3,3);
  assert.equal(tight.admitted,1);assert.equal(tight.held,3);assert.equal(tight.omitted,0);assertPacked(tight,3,3);
  assert(Math.abs(area(tight)-400)<.1,'the existing conservative municipal guard admits this 400 m² triangle');
  const both=greenGroundGeometry([edge,next],origin,viewport,boundary,7,9);
  assert.equal(both.admitted,2);assert.equal(both.omitted,0);assertPacked(both,7,9);
  assert(Math.abs(area(both)-800)<.1,'both eligible 400 m² source covers fit without raising either budget');
  for(const t of triangles(both)){
    const x=t.map(p=>p[0]),z=t.map(p=>p[1]);
    assert(boundary.covers([...geo(Math.min(...x),Math.min(...z)),...geo(Math.max(...x),Math.max(...z))]),'every Float32 triangle envelope still passes the original municipality proof');
  }
  assert.equal(JSON.stringify([edge,next]),before);
});

test('a complete hole-bearing polygon is still omitted when its actual referenced vertices or indices do not fit',()=>{
  const f=feature('osm/way/1',[doubled(rectangle(-50,-50,50,50)),doubled(rectangle(-10,-10,10,10))]);
  for(const [vertices,indices] of [[9,24],[10,23],[0,0]]){
    const mesh=greenGroundGeometry([f],origin,viewport,wide,vertices,indices);
    assert.equal(mesh.admitted,0);assert.equal(mesh.omitted,1);assert.equal(area(mesh),0);
    assert.equal(mesh.positions.length,0);assert.equal(mesh.indices.length,0,'budget admission never fills a hole or keeps an arbitrary triangle prefix');
  }
});
