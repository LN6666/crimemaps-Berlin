import type {BuildingComponent} from './building-mesh-renderer';
/** Original roof boundary coordinates drive painted facets; no mesh vertices are created. */
const edges=new Float32Array(64*4);let edgeCount=0,revision=0,key='';
const uploaded=new WeakMap<WebGLProgram,number>();
export function configureRathausRoofPaint(c:BuildingComponent|undefined){
 const rows:{edge:number[];length:number;ring:number}[]=[],chosen:{edge:number[];length:number;ring:number}[]=[];
 if(c){const counts=c.componentGeometry.coordinates.map(r=>r.length-1),n=counts.reduce((s,a)=>s+a,0),b=c.batches.find(b=>b.positions.length>=n*3&&b.normals[1]>.99);
  if(b){let x0=Infinity,z0=Infinity;for(let i=0;i<n;i++){x0=Math.min(x0,b.positions[i*3]);z0=Math.min(z0,b.positions[i*3+2]);}let at=0;
   counts.forEach((count,ring)=>{const pts=Array.from({length:count},(_,i)=>[b.positions[(at+i)*3]-x0,b.positions[(at+i)*3+2]-z0]);at+=count;
    // Collapse almost-collinear boundary points for a bounded painting parameter set only.
    const clean=pts.filter((p,i)=>{const a=pts[(i+count-1)%count],z=pts[(i+1)%count],ux=p[0]-a[0],uy=p[1]-a[1],vx=z[0]-p[0],vy=z[1]-p[1];return Math.abs(ux*vy-uy*vx)>.035*Math.hypot(ux,uy)*Math.hypot(vx,vy)||ux*vx+uy*vy<=0;});
    const poly=clean.length>=3?clean:pts,area=poly.reduce((s,p,i)=>s+p[0]*poly[(i+1)%poly.length][1]-poly[(i+1)%poly.length][0]*p[1],0),reverse=(ring===0?area<0:area>0);
    for(let i=0;i<poly.length;i++){let a=poly[i],z=poly[(i+1)%poly.length];const length=Math.hypot(z[0]-a[0],z[1]-a[1]);if(length<1.3)continue;if(reverse)[a,z]=[z,a];rows.push({edge:[...a,...z],length,ring});}
   });
   for(let ring=0;ring<counts.length;ring++)chosen.push(...rows.filter(r=>r.ring===ring).sort((a,b)=>b.length-a.length).slice(0,4));
   for(const row of rows.sort((a,b)=>b.length-a.length)){if(chosen.length>=64)break;if(!chosen.includes(row))chosen.push(row);}
  }
 }
 const next=JSON.stringify(chosen.map(r=>r.edge));if(next===key)return;key=next;edges.fill(0);edgeCount=Math.min(64,chosen.length);chosen.slice(0,64).forEach((r,i)=>edges.set(r.edge,i*4));revision++;
}
export function uploadRathausRoofPaint(gl:WebGL2RenderingContext,p:WebGLProgram){
 if(uploaded.get(p)===revision)return;const count=gl.getUniformLocation(p,'u_nr_roof_edge_count'),array=gl.getUniformLocation(p,'u_nr_roof_edges[0]');if(count)gl.uniform1i(count,edgeCount);if(array)gl.uniform4fv(array,edges);uploaded.set(p,revision);
}
export const RATHAUS_ROOF_PAINT_GLSL=`
uniform int u_nr_roof_edge_count;uniform vec4 u_nr_roof_edges[64];
float nrEdgeDistance(vec2 p,vec4 e){vec2 d=e.zw-e.xy;float lengthD=max(length(d),.001),t=dot(p-e.xy,d)/max(dot(d,d),.001),signedDistance=dot(p-e.xy,vec2(-d.y,d.x)/lengthD);if(t<-.035||t>1.035||signedDistance<-.025)return 1e5;return max(0.,signedDistance);}
vec3 nrPaintedRoof(vec3 base,vec2 uv){
 float first=1e5,second=1e5,along=0.,edgeLength=0.;vec2 inward=vec2(0.,1.),other=vec2(0.,-1.);vec4 firstEdge=vec4(0.);
 for(int i=0;i<64;i++){if(i>=u_nr_roof_edge_count)break;vec4 e=u_nr_roof_edges[i];vec2 d=e.zw-e.xy;float dist=nrEdgeDistance(uv,e);if(dist<first){first=dist;firstEdge=e;edgeLength=length(d);vec2 tangent=d/max(edgeLength,.001);inward=vec2(-tangent.y,tangent.x);along=dot(uv-e.xy,tangent);}}
 for(int i=0;i<64;i++){if(i>=u_nr_roof_edge_count)break;vec4 e=u_nr_roof_edges[i];vec2 d=normalize(e.zw-e.xy),n=vec2(-d.y,d.x);float alignment=dot(n,inward);if(alignment>.45)continue;if(alignment<-.97&&abs(dot(e.xy-firstEdge.xy,inward))<.35)continue;float dist=nrEdgeDistance(uv,e);if(dist<second){second=dist;other=n;}}
 if(u_nr_roof_edge_count==0||first>1e4)return mix(base,vec3(.30,.33,.38),.85);
 // Virtual slope values and medial ridge/hip lines are paint on the original flat surface.
 float shade=dot(-inward,normalize(vec2(-.48,.65))),slope=clamp(first/max(first+second,.01),0.,.5);
 vec3 roof=vec3(.29,.32,.37)*(1.+shade*.30+slope*.13);
 float joints=max(fpRepeatStroke(first,.36,.012),fpRepeatStroke(along,.72,.009));roof=fpLayer(roof,joints,vec3(.16,.20,.25),.28);
 float ridge=fpStroke(second-first,.11),ridgeShadow=fpStroke(second-first-.17,.075);
 roof=fpLayer(roof,ridgeShadow,vec3(.13,.17,.22),.78);roof=fpLayer(roof,ridge,vec3(.56,.59,.63),.94);
 float eave=1.-smoothstep(.12,.30,first);roof=fpLayer(roof,eave,vec3(.44,.48,.53),.82);
 // Sparse small slate dormer mouths on long source-bound runs, never a facade-window grid.
 if(edgeLength>24.&&first>2.3&&first<3.7&&second-first>1.5){vec2 q=vec2(mod(along+8.,18.)-9.,first-3.);float mouth=foRect(q,vec2(.38,.24)),hood=foTriangle(q-vec2(0.,.22),.55,.38);roof=fpLayer(roof,hood,vec3(.47,.49,.52),.80);roof=fpLayer(roof,mouth,vec3(.12,.16,.20),.95);}
 return roof;
}
`;
