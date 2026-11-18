/** Metal's LAST provoking-vertex emulation can allocate an index prefix for
 * every draw. Cyclically rotate owned triangle indices and use FIRST only for
 * those VAOs: the original last vertex still supplies every flat varying.
 * CPU indices, winding, primitive order and vertex data remain unchanged. */
type ConventionExtension={FIRST_VERTEX_CONVENTION_WEBGL:number;LAST_VERTEX_CONVENTION_WEBGL:number;PROVOKING_VERTEX_WEBGL:number;provokingVertexWEBGL(mode:number):void};
type Binding={gl:WebGL2RenderingContext;extension:ConventionExtension};
const buffers=new WeakMap<WebGLBuffer,Binding>();
const arrays=new WeakMap<WebGLVertexArrayObject,Binding>();

export function residentFirstVertexExtension(gl:WebGL2RenderingContext):ConventionExtension|null{
 return gl.getExtension?.('WEBGL_provoking_vertex') as ConventionExtension|null ?? null;
}

/** The publisher must use the same physical-layout identity as allocation. */
export function residentTriangleGeometryKey(gl:WebGL2RenderingContext,contentKey:string){
 return residentFirstVertexExtension(gl)?JSON.stringify([contentKey,'first-cyclic-v1']):contentKey;
}

export function rotateResidentTriangleIndices(indices:Uint32Array):Uint32Array{
 if(indices.length%3)throw new Error('Resident triangle indices must contain complete triangles');
 const rotated=new Uint32Array(indices.length);
 for(let i=0;i<indices.length;i+=3){rotated[i]=indices[i+2];rotated[i+1]=indices[i];rotated[i+2]=indices[i+1];}
 return rotated;
}

export function markResidentFirstVertexBuffer(gl:WebGL2RenderingContext,buffer:WebGLBuffer,extension:ConventionExtension){buffers.set(buffer,{gl,extension});}
export function bindResidentIndexConvention(gl:WebGL2RenderingContext,vao:WebGLVertexArrayObject,buffer:WebGLBuffer){
 const binding=buffers.get(buffer);if(binding?.gl===gl)arrays.set(vao,binding);
}
export function residentIndexConventionKey(gl:WebGL2RenderingContext,buffer:WebGLBuffer){return buffers.get(buffer)?.gl===gl?'first-cyclic-v1':'last';}

/** Caller already bound vao. Never change the surrounding map/capture state. */
export function drawResidentTriangles(gl:WebGL2RenderingContext,vao:WebGLVertexArrayObject,count:number,offset:number){
 const binding=arrays.get(vao);
 if(!binding||binding.gl!==gl){gl.drawElements(gl.TRIANGLES,count,gl.UNSIGNED_INT,offset);return;}
 if(count%3||offset%12)throw new Error('Rotated resident draw must align to complete triangles');
 const ext=binding.extension,previous=gl.getParameter(ext.PROVOKING_VERTEX_WEBGL) as number;
 if(previous!==ext.FIRST_VERTEX_CONVENTION_WEBGL)ext.provokingVertexWEBGL(ext.FIRST_VERTEX_CONVENTION_WEBGL);
 try{gl.drawElements(gl.TRIANGLES,count,gl.UNSIGNED_INT,offset);}
 finally{if(!gl.isContextLost()&&previous!==ext.FIRST_VERTEX_CONVENTION_WEBGL)ext.provokingVertexWEBGL(previous);}
}

/** One synchronous pass owns the convention until restore or an ordinary draw. */
export function createResidentTriangleDrawBatch(gl: WebGL2RenderingContext) {
 let extension: ConventionExtension | undefined;
 let originalMode: number | undefined;
 let changed = false;

 function restore() {
  if (changed && extension && originalMode !== undefined && !gl.isContextLost()) {
   extension.provokingVertexWEBGL(originalMode);
  }
  changed = false;
 }

 function draw(vao: WebGLVertexArrayObject, count: number, offset: number) {
  const binding = arrays.get(vao);
  if (binding?.gl === gl) {
   if (count % 3 || offset % 12) throw new Error('Rotated resident draw must align to complete triangles');
   if (!extension) {
    const mode = gl.getParameter(binding.extension.PROVOKING_VERTEX_WEBGL);
    if (mode == null) return; // The context was lost before the first owned draw.
    originalMode = mode;
    extension = binding.extension;
   }
   if (!changed && originalMode !== extension.FIRST_VERTEX_CONVENTION_WEBGL) {
    extension.provokingVertexWEBGL(extension.FIRST_VERTEX_CONVENTION_WEBGL);
    changed = true;
   }
  } else {
   restore();
  }
  gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, offset);
 }

 return {draw, restore};
}
