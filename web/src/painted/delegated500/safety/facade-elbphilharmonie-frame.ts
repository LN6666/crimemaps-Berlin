import type {BuildingComponent} from './building-mesh-renderer';
export const ELB_NATIVE_IDS=new Set(['24981342','527238886','525401027']);
const reference:[number,number]=[9.98102925,53.5502834];
const roofEdges=new Float32Array(20);let edgeCount=0;
const commonPoint=(c:BuildingComponent,j:number,b:BuildingComponent['batches'][number])=>{const C=40075016.686*Math.cos(reference[1]*Math.PI/180),ratio=C/(40075016.686*Math.cos(c.origin[1]*Math.PI/180)),my=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/(2*Math.PI);return [(c.origin[0]-reference[0])*C/360+b.positions[j]*ratio,b.positions[j+1],(my(c.origin[1])-my(reference[1]))*C+b.positions[j+2]*ratio];};
const roofUV=(x:number,z:number)=>{const y=(133.210251-.154989127*x+.027276620*z)/.987539547;return [.173326811*x+.984864364*z+985.792507,-.972592508*x+.157371038*y+.171167081*z+422.888429];};
export function configureElbRoofPaint(components:BuildingComponent[]){const c=components.find(c=>c.city==='hamburg'&&c.objectId==='osm/way/527238886');roofEdges.fill(0);edgeCount=0;if(!c)return;const b=c.batches[0];if(!b||b.positions.length/3!==5)return;const points=[];for(let j=0;j<b.positions.length;j+=3){const p=commonPoint(c,j,b);points.push(roofUV(p[0],p[2]));}for(let i=0;i<5;i++)roofEdges.set([...points[i],...points[(i+1)%5]],i*4);edgeCount=5;}
export function uploadElbRoofPaint(gl:WebGL2RenderingContext,program:WebGLProgram){const loc=gl.getUniformLocation(program,'u_fe_roof_edges[0]'),count=gl.getUniformLocation(program,'u_fe_roof_edge_count');if(loc)gl.uniform4fv(loc,roofEdges);if(count)gl.uniform1i(count,edgeCount);}
/** Exact existing source facets; output is metadata only, no geometry writes. */
export function elbphilharmonieNativePaint(c:BuildingComponent):Float32Array<ArrayBuffer>{
 const id=c.objectId.split('/').at(-1)!;
 const out=new Float32Array(c.batches.reduce((n,b)=>n+b.positions.length/3,0)*5);let offset=0;
 const fields=[
  [.065511,-.997852,979.8377,21.0653,65,141],
  [.903501,-.428585,559.5982,124.9694,64.2,143],
  [-.081912,.996640,-1064.7576,83.0880,48.34,142],
  [-.081912,.996640,-1064.7576,83.0880,48.07,142],
  [-.081912,.996640,-1064.7576,83.0880,48.25,142],
  [-.081912,.996640,-1064.7576,83.0880,48.13,142],
  [-.997082,-.076342,-180.0684,107.9350,65,140],
 ];
 for(let bi=0;bi<c.batches.length;bi++){const b=c.batches[bi];for(let j=0;j<b.positions.length;j+=3){
  if(id!=='24981342'){
   const p=commonPoint(c,j,b);
   if(bi===0){const uv=roofUV(p[0],p[2]);out.set([uv[0],uv[1],127.070656,80.410387,id==='527238886'?147:149.1],offset);}
   else {const normals=[[-.997852,-.065511],[-.428585,-.903501],[.996640,.081912],[.996774,.080254],[.996848,.079337],[.996729,.080814],[-.076342,.997082]];let index=0,best=-Infinity;for(let n=0;n<7;n++){const dot=normals[n][0]*b.normals[j]+normals[n][1]*b.normals[j+2];if(dot>best){best=dot;index=n;}}const field=fields[index];out.set([field[0]*p[0]+field[1]*p[2]-field[2],b.positions[j+1],110,field[3],id==='525401027'?144:field[5]],offset);}
  }
  else if(bi===1){out.set([.173326811*b.positions[j]+.984864364*b.positions[j+2]+985.792507,-.972592508*b.positions[j]+.157371038*b.positions[j+1]+.171167081*b.positions[j+2]+422.888429,127.070656,80.410387,148],offset);}
  else if(j/3<42){const f=fields[Math.floor(j/18)];out.set([f[0]*b.positions[j]+f[1]*b.positions[j+2]-f[2],b.positions[j+1]-20,f[4],f[3],f[5]],offset);}
  else out.set([0,0,1,1,149],offset);
  offset+=5;
 }}return out;
}
