import earcut,{deviation} from 'earcut';
import {PALACE_GARDEN_SOURCE as source} from './facade-palace-garden-data';
import {paintMode} from './facade-paint-controls';

type GardenMap={triggerRepaint():void;getLayer(id:string):unknown;addLayer(layer:any,before?:string):void;removeLayer(id:string):void};
const multiply=(a:ArrayLike<number>,b:number[])=>{const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r;};
const merc=(p:readonly number[])=>[(p[0]+180)/360,(1-Math.log(Math.tan(Math.PI/4+p[1]*Math.PI/360))/Math.PI)/2];
const groundOffset=.04;

/** Local review only. Adds the verified native ground ring; no building vertices are changed.
 * Pools/hedges/fountain/shadows below are source-clipped paint, not mapped internal objects. */
export function installPalaceGarden({map,beforeId}:{map:GardenMap;beforeId:()=>string|undefined}){
 const id='local-residenz-native-garden',anchor=source.mercatorAnchor,unit=source.metresPerWorldUnit;
 const xy:number[]=[],data:number[]=[];
 for(const row of source.boundary.slice(0,-1)){
  const m=merc(row.lonLat),x=(m[0]-anchor[0])*unit,z=-(m[1]-anchor[1])*unit;
  const u=x*source.uAxisXZ[0]+z*source.uAxisXZ[1]-source.metricUVBounds[0];
  const v=x*source.vAxisXZ[0]+z*source.vAxisXZ[1]-source.metricUVBounds[1];
  xy.push(x,z);data.push(x,groundOffset,z,u,v);
 }
 const triangles=earcut(xy,[],2),error=deviation(xy,[],2,triangles);
 if(!triangles.length||error>1e-8)throw Error('Native garden ring triangulation failed');
 const positions=new Float32Array(data),indices=new Uint16Array(triangles);
 let enabled=false,visible=!document.hidden,suspended=false,destroyed=false,draws=0;
 let gl:WebGL2RenderingContext|undefined,program:WebGLProgram|undefined,vao:WebGLVertexArrayObject|undefined,buffer:WebGLBuffer|undefined,index:WebGLBuffer|undefined;
 const vertex=`#version 300 es
 precision highp float;
 in vec3 a_position;in vec2 a_uv;uniform mat4 u_matrix;out vec2 v_uv;
 void main(){v_uv=a_uv;gl_Position=u_matrix*vec4(a_position,1.);}`;
 const fragment=`#version 300 es
 precision highp float;
 in vec2 v_uv;uniform int u_mode;out vec4 colour;
 float box(vec2 q,vec2 h){vec2 d=abs(q)-h;float aa=max(.025,length(fwidth(q)));return 1.-smoothstep(-aa,aa,max(d.x,d.y));}
 float line(float d,float w){float aa=max(.012,fwidth(d));return 1.-smoothstep(w-aa,w+aa,abs(d));}
 float circle(vec2 q,float r){return 1.-smoothstep(r-.035,r+.035,length(q));}
 float seg(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.,1.));}
 vec3 paint(vec2 p){
  // Photographic composition: central walk toward palace, paired low beds and basins.
  // Every interior dimension is a drawing ratio, not a surveyed coordinate.
  vec3 c=vec3(.78,.77,.68);
  float grout=max(line(mod(p.x+.65,1.30)-.65,.016),line(mod(p.y+.45,.90)-.45,.014));
  c=mix(c,vec3(.57,.58,.51),grout*.38);
  float axis=box(p-vec2(21.,12.0),vec2(18.4,1.20));
  c=mix(c,vec3(.87,.86,.77),axis*.88);
  c=mix(c,vec3(.55,.57,.50),max(line(p.y-10.8,.065),line(p.y-13.2,.065))*box(p-vec2(21.,12.),vec2(18.4,2.0))*.75);
  for(int side=0;side<2;side++){
   float v=side==0?5.1:18.9;
   float bed=box(p-vec2(19.,v),vec2(12.2,2.25));
   float inner=box(p-vec2(19.,v),vec2(11.70,1.75));
   c=mix(c,vec3(.23,.36,.18),bed);
   c=mix(c,vec3(.39,.50,.27),inner);
   float hedgeTop=max(line(abs(p.y-v)-1.95,.17)*box(p-vec2(19.,v),vec2(12.1,2.2)),line(abs(p.x-19.)-11.95,.17)*bed);
   c=mix(c,vec3(.36,.46,.23),hedgeTop);
   float hedgeShadow=box(p-vec2(19.35,v+.36),vec2(12.45,2.42))*(1.-bed);
   c=mix(c,vec3(.32,.36,.25),hedgeShadow*.48);
   // Thin shallow water strips retain their own stone edges and reflection strokes.
   float pv=side==0?8.8:15.2;
   float rim=box(p-vec2(19.5,pv),vec2(11.95,.82));
   float water=box(p-vec2(19.5,pv),vec2(11.62,.59));
   c=mix(c,vec3(.91,.89,.77),rim);
   vec3 pool=mix(vec3(.20,.35,.34),vec3(.36,.51,.47),clamp((p.y-pv+.6)/1.2,0.,1.));
   pool=mix(pool,vec3(.62,.72,.65),line(mod(p.x+.50,1.)-.50,.016)*.35);
   c=mix(c,pool,water);
   c=mix(c,vec3(.13,.22,.21),line(p.y-pv+.53,.05)*water*.8);
  }
  // Low circular fountain represented entirely on the horizontal source surface.
  vec2 f=p-vec2(35.4,12.);
  c=mix(c,vec3(.33,.36,.30),circle(f-vec2(.35,.42),2.35)*.53);
  c=mix(c,vec3(.85,.80,.65),circle(f,2.17));
  c=mix(c,vec3(.56,.54,.43),line(length(f)-2.10,.10));
  c=mix(c,vec3(.16,.31,.31),circle(f,1.57));
  c=mix(c,vec3(.53,.65,.59),line(length(f)-.60,.025)*circle(f,1.55)*.55);
  c=mix(c,vec3(.87,.90,.81),circle(f,.17)*.8);
  // Static dappled plane-tree shade: no fabricated planted points or canopy mesh.
  float shade=0.;
  for(int i=0;i<4;i++){
   vec2 q=p-vec2(i<2?8.5:31.5,mod(float(i),2.)<.5?3.0:21.0);
   float canopy=1.-smoothstep(2.0,5.3,length(q));
   float dapple=.55+.45*sin(q.x*4.1+sin(q.y*2.4))*sin(q.y*3.5);
   shade=max(shade,canopy*dapple*.33);
  }
  c*=1.-shade;
  // Shade only the exact two source wall segments; source height is unknown.
  float wall=min(seg(p,vec2(42.36501696,0.),vec2(42.40031258,12.10355714)),seg(p,vec2(42.40031258,12.10355714),vec2(42.45942996,24.04947137)));
  c*=.76+.24*smoothstep(.06,1.05,wall);
  return c;
 }
 void main(){vec3 c=u_mode==0?vec3(.94):u_mode==1?vec3(.68,.72,.58):paint(v_uv);colour=vec4(c,1.);}`;
 const release=()=>{if(gl){if(buffer)gl.deleteBuffer(buffer);if(index)gl.deleteBuffer(index);if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);}buffer=index=undefined;vao=undefined;program=undefined;};
 const layer={id,type:'custom' as const,renderingMode:'3d' as const,
  onAdd(_map:unknown,context:WebGLRenderingContext|WebGL2RenderingContext){
   if(!('createVertexArray'in context))throw Error('Native garden requires shared WebGL2');
   release();gl=context as WebGL2RenderingContext;
   const shaders:WebGLShader[]=[],oldVao=gl.getParameter(gl.VERTEX_ARRAY_BINDING),oldArray=gl.getParameter(gl.ARRAY_BUFFER_BINDING);
   try{
    for(const [i,text]of[vertex,fragment].entries()){const s=gl.createShader(i?gl.FRAGMENT_SHADER:gl.VERTEX_SHADER);if(!s)throw Error('Garden shader allocation');shaders.push(s);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Garden shader: '+gl.getShaderInfoLog(s));}
    program=gl.createProgram()??undefined;if(!program)throw Error('Garden program allocation');for(const s of shaders)gl.attachShader(program,s);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Garden shader link');
    vao=gl.createVertexArray()??undefined;buffer=gl.createBuffer()??undefined;index=gl.createBuffer()??undefined;if(!vao||!buffer||!index)throw Error('Garden GPU allocation');
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,positions,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
    for(const[name,size,offset]of[['a_position',3,0],['a_uv',2,12]]as const){const at=gl.getAttribLocation(program,name);if(at<0)throw Error('Garden attribute missing');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,20,offset);}
   }catch(error){release();throw error;}finally{for(const s of shaders)gl.deleteShader(s);gl.bindVertexArray(oldVao);gl.bindBuffer(gl.ARRAY_BUFFER,oldArray);}
  },
  render(_context:unknown,args:{defaultProjectionData?:{mainMatrix:ArrayLike<number>}}|ArrayLike<number>){
   if(destroyed||!enabled||!visible||suspended||!gl||!program||!vao||gl.isContextLost())return;
   const main='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;if(!main||main.length!==16)return;
   const old={program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),depth:gl.isEnabled(gl.DEPTH_TEST),blend:gl.isEnabled(gl.BLEND),cull:gl.isEnabled(gl.CULL_FACE),mask:gl.getParameter(gl.DEPTH_WRITEMASK),func:gl.getParameter(gl.DEPTH_FUNC)};
   try{gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);const s=1/unit;gl.uniformMatrix4fv(gl.getUniformLocation(program,'u_matrix'),false,multiply(main,[s,0,0,0,0,0,s,0,0,-s,0,0,anchor[0],anchor[1],0,1]));gl.uniform1i(gl.getUniformLocation(program,'u_mode'),paintMode());gl.bindVertexArray(vao);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);draws++;}
   finally{gl.bindVertexArray(old.vao);gl.useProgram(old.program);old.depth?gl.enable(gl.DEPTH_TEST):gl.disable(gl.DEPTH_TEST);old.blend?gl.enable(gl.BLEND):gl.disable(gl.BLEND);old.cull?gl.enable(gl.CULL_FACE):gl.disable(gl.CULL_FACE);gl.depthMask(old.mask);gl.depthFunc(old.func);}
  },onRemove(){release();}
 };
 const repaint=()=>map.triggerRepaint();document.addEventListener('facade-paint-change',repaint);
 map.addLayer(layer,beforeId());
 return{customLayer:layer,setMode(v:boolean){enabled=v;repaint();},setVisible(v:boolean){visible=v;repaint();},suspend(){suspended=true;},resume(){suspended=false;repaint();},
  get stats(){return{sourceObjectId:source.sourceObjectId,sourceWallObjectId:source.wall.sourceObjectId,sourcePbfSHA256:source.sourcePbfSHA256,sourceRingProofSHA256:source.sourceRingProofSHA256,sourceSnapshot:source.sourceSnapshot,sourceBoundaryVertices:11,sourceClosedRingCoordinates:12,sourceWallLineVertices:3,sourceBoundaryUnchanged:true,inferredCoordinates:0,newNativeGroundSurface:true,newNativeGroundGPUVertices:positions.length/5,newNativeGroundGPUTriangles:indices.length/3,triangulationDeviation:error,addedBuildingGeometryVertices:0,addedBuildingGeometryTriangles:0,fabricatedTreePoints:0,newPoolMeshes:0,newFountainMeshes:0,internalFeatures:'illustrative source-clipped UV painting, not mapped source geometry',wallHeight:'unknown; no extrusion',renderingGroundOffsetMetres:groundOffset,mode:paintMode(),enabled,visible,suspended,glReady:Boolean(program),draws,gpuBytes:positions.byteLength+indices.byteLength,noPick:true,noNewTimer:true};},
  destroy(){if(destroyed)return;destroyed=true;document.removeEventListener('facade-paint-change',repaint);if(map.getLayer(id))map.removeLayer(id);release();}
 };
}
