/** On-demand local diagnostics only. Reads existing GPU storage; never mutates geometry, material or buffer contents. */
export type PaintDiagnosticIdentity={objectId:string;partId:string};
type DiagnosticComponent=PaintDiagnosticIdentity&{firstVertex:number;lastVertex:number;start?:number;end?:number;batches:readonly{positions:ArrayLike<number>}[]};
export type PaintGPUReadbackContext={gl:WebGL2RenderingContext|undefined;vao?:WebGLVertexArrayObject;program?:WebGLProgram;progressiveBuffer:WebGLBuffer|undefined;paintBuffer:WebGLBuffer|undefined;vertexBuffer?:WebGLBuffer;indexBuffer?:WebGLBuffer;packedVertices?:Float32Array;packedIndices?:Uint32Array;getComponent:(id:PaintDiagnosticIdentity)=>DiagnosticComponent|undefined};
const exactRanges=[
 {objectId:'osm/way/228534603',partId:'osm/way/228534603/component/19187ba35eb6899d21b9',batchIndex:6,firstVertex:6,vertexCount:6,role:'F081 north clerestory actual DISPLAY metadata'},
 {objectId:'osm/way/228534603',partId:'osm/way/228534603/component/19187ba35eb6899d21b9',batchIndex:6,firstVertex:30,vertexCount:6,role:'F081 south clerestory actual DISPLAY metadata'},
 {objectId:'osm/way/228534603',partId:'osm/way/228534603/component/19187ba35eb6899d21b9',batchIndex:2,firstVertex:0,vertexCount:6,role:'F081 north lower aisle actual DISPLAY metadata'},
 {objectId:'osm/way/226096975',partId:'osm/way/226096975/component/dc4a7fcf8fe4d49e21c3',batchIndex:0,firstVertex:0,vertexCount:138,role:'Paulinum actual source material batch0'},
 {objectId:'osm/way/226096975',partId:'osm/way/226096975/component/dc4a7fcf8fe4d49e21c3',batchIndex:1,firstVertex:0,vertexCount:126,role:'Paulinum actual source material batch1'},
 {objectId:'osm/way/35006256',partId:'osm/way/35006256/component/ed86cbdde34b15aafca0',batchIndex:1,firstVertex:56,vertexCount:4,role:'actual white-pick wall56'},
 {objectId:'osm/way/35006256',partId:'osm/way/35006256/component/ed86cbdde34b15aafca0',batchIndex:1,firstVertex:60,vertexCount:4,role:'actual white-pick wall60'},
 {objectId:'osm/way/1207797957',partId:'osm/way/1207797957/component/b56e09c7e8b907ba01ed',batchIndex:0,firstVertex:0,vertexCount:57,role:'partial parent original roof57'},
] as const;
export function readPaintGPUDiagnostic(context:PaintGPUReadbackContext,diagnosticIdentities:readonly PaintDiagnosticIdentity[]|undefined){
 if(!diagnosticIdentities || diagnosticIdentities.length<=8)return readPaintGPUDiagnosticBatch(context,diagnosticIdentities);
 const chunks=[];for(let i=0;i<diagnosticIdentities.length;i+=8)chunks.push(readPaintGPUDiagnosticBatch(context,diagnosticIdentities.slice(i,i+8)));
 const first=chunks[0];
 return {...first,available:chunks.every(x=>'available' in x&&x.available===true),records:chunks.flatMap(x=>x.records),batchCount:chunks.length,requestedIdentityCount:diagnosticIdentities.length};
}
function readPaintGPUDiagnosticBatch(context:PaintGPUReadbackContext,diagnosticIdentities:readonly PaintDiagnosticIdentity[]|undefined){
 if(!diagnosticIdentities?.length)return{requested:false,records:[]};
 if(diagnosticIdentities.length>8)throw Error('Too many GPU diagnostic identities');
 const {gl,progressiveBuffer,paintBuffer}=context;
 if(!gl||gl.isContextLost()||!progressiveBuffer||!paintBuffer)return{requested:true,available:false,reason:'GPU buffers/context unavailable',records:[]};
 const requested=new Set(diagnosticIdentities.map(x=>x.objectId+'|'+x.partId));
 const ranges=exactRanges.filter(x=>requested.has(x.objectId+'|'+x.partId));
 const previous=gl.getParameter(gl.ARRAY_BUFFER_BINDING) as WebGLBuffer|null;
 const records:Record<string,unknown>[]=[];
 const attributes:Record<string,unknown>[]=[];
 const uniforms:Record<string,unknown>={};
 if(context.program)for(const name of ['u_paint_mode','u_paint_override','u_progressive_features','u_opacity']){const location=gl.getUniformLocation(context.program,name);uniforms[name]=location===null?null:gl.getUniform(context.program,location);}
 const previousVAO=gl.getParameter(gl.VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject|null;
 try{
  if(context.vao&&context.program){
   gl.bindVertexArray(context.vao);
   for(const spec of [
    {name:'a_progressive_color',expectedBuffer:progressiveBuffer,expectedBufferName:'progressiveBuffer',size:4,stride:16,offset:0},
    {name:'a_paint_frame',expectedBuffer:paintBuffer,expectedBufferName:'paintBuffer',size:4,stride:20,offset:0},
    {name:'a_paint_family',expectedBuffer:paintBuffer,expectedBufferName:'paintBuffer',size:1,stride:20,offset:16},
   ]){
    const location=gl.getAttribLocation(context.program,spec.name);
    if(location<0){attributes.push({name:spec.name,location,active:false});continue;}
    const actualBuffer=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING) as WebGLBuffer|null;
    const enabled=Boolean(gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_ENABLED));
    const size=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_SIZE) as number;
    const stride=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_STRIDE) as number;
    const type=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_TYPE) as number;
    const normalized=Boolean(gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_NORMALIZED));
    const integer=Boolean(gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_INTEGER));
    const divisor=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_DIVISOR) as number;
    const offset=gl.getVertexAttribOffset(location,gl.VERTEX_ATTRIB_ARRAY_POINTER);
    attributes.push({name:spec.name,location,active:true,enabled,size,stride,type,typeIsFloat:type===gl.FLOAT,normalized,integer,divisor,offset,expectedBufferName:spec.expectedBufferName,bufferIsExpected:actualBuffer===spec.expectedBuffer,bufferIsProgressive:actualBuffer===progressiveBuffer,bufferIsPaint:actualBuffer===paintBuffer,expected:{enabled:true,size:spec.size,stride:spec.stride,type:gl.FLOAT,normalized:false,integer:false,divisor:0,offset:spec.offset},matchesExpected:enabled&&actualBuffer===spec.expectedBuffer&&size===spec.size&&stride===spec.stride&&type===gl.FLOAT&&!normalized&&!integer&&divisor===0&&offset===spec.offset});
   }
  }
  for(const range of ranges){
   const c=context.getComponent(range);
   if(!c){records.push({...range,available:false,reason:'exact component not resident in renderer'});continue;}
   const batch=c.batches[range.batchIndex],batchPrefixVertices=c.batches.slice(0,range.batchIndex).reduce((sum,b)=>sum+b.positions.length/3,0);
   if(!batch||!Number.isSafeInteger(batchPrefixVertices)||batch.positions.length%3||range.firstVertex+range.vertexCount>batch.positions.length/3){records.push({...range,available:false,reason:'original batch range mismatch'});continue;}
   const globalFirstVertex=c.firstVertex+batchPrefixVertices+range.firstVertex;
   if(!Number.isSafeInteger(globalFirstVertex)||globalFirstVertex<c.firstVertex||globalFirstVertex+range.vertexCount>c.lastVertex)throw Error('GPU diagnostic global range mismatch');
   const read=(buffer:WebGLBuffer,stride:number)=>{
    const offsetBytes=globalFirstVertex*stride*Float32Array.BYTES_PER_ELEMENT,values=new Float32Array(range.vertexCount*stride);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    const allocatedBytes=gl.getBufferParameter(gl.ARRAY_BUFFER,gl.BUFFER_SIZE) as number;
    if(!Number.isSafeInteger(allocatedBytes)||offsetBytes+values.byteLength>allocatedBytes)throw Error('GPU diagnostic byte range exceeds buffer');
    gl.getBufferSubData(gl.ARRAY_BUFFER,offsetBytes,values);
    return{offsetBytes,strideFloats:stride,allocatedBytes,values:Array.from(values)};
   };
   let packedGeometry:Record<string,unknown>|undefined;
   if(context.vertexBuffer&&context.packedVertices){
    const gpu=read(context.vertexBuffer,9),expected=Array.from({length:range.vertexCount*9},(_,i)=>context.packedVertices![(globalFirstVertex+Math.floor(i/9))*10+i%9]);
    packedGeometry={...gpu,expectedCPUValues:expected,allValuesMatchCPU:gpu.values.every((v,i)=>Object.is(v,expected[i]))};
   }
   let packedIndex:Record<string,unknown>|undefined;
   if(context.indexBuffer&&context.packedIndices&&c.start!==undefined&&c.end!==undefined){
    if(!context.vao)throw Error('Index diagnostic requires the existing renderer VAO');
    gl.bindVertexArray(context.vao);const count=c.end-c.start,actual=new Uint32Array(count);gl.getBufferSubData(gl.ELEMENT_ARRAY_BUFFER,c.start*4,actual);const expected=context.packedIndices.subarray(c.start,c.end);
    packedIndex={count,allValuesMatchCPU:actual.every((v,i)=>v===expected[i]),first12:Array.from(actual.slice(0,12))};
   }
   records.push({...range,available:true,componentFirstVertex:c.firstVertex,batchPrefixVertices,globalFirstVertex,progressive:read(progressiveBuffer,4),paint:read(paintBuffer,5),packedGeometry,packedIndex});
  }
 }finally{if(context.vao&&context.program)gl.bindVertexArray(previousVAO);gl.bindBuffer(gl.ARRAY_BUFFER,previous);}
 return{requested:true,available:true,readback:'existing actual GPU buffers via getBufferSubData',sourceArraysModified:false,attributeReadbackAvailable:!!(context.vao&&context.program),uniforms,attributes,records};
}
