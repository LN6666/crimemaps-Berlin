/** On-demand local diagnostics only. Reads existing GPU storage; never mutates geometry, material or buffer contents. */
export type PaintDiagnosticIdentity={objectId:string;partId:string};
type DiagnosticComponent=PaintDiagnosticIdentity&{firstVertex:number;lastVertex:number;start?:number;end?:number;batches:readonly{positions:ArrayLike<number>}[]};
export type PaintGPUReadbackContext={gl:WebGL2RenderingContext|undefined;vao?:WebGLVertexArrayObject;program?:WebGLProgram;progressiveBuffer:WebGLBuffer|undefined;paintBuffer:WebGLBuffer|undefined;vertexBuffer?:WebGLBuffer;indexBuffer?:WebGLBuffer;packedVertices?:Float32Array;packedIndices?:Uint32Array;getComponent:(id:PaintDiagnosticIdentity)=>DiagnosticComponent|undefined};
const exactRanges=[
 {objectId:'osm/way/501234037',partId:'osm/way/501234037/component/10176db0efa7181ed301',batchIndex:0,firstVertex:0,vertexCount:48,role:'F358579 exact tower vertical source48'},
 {objectId:'osm/way/501351791',partId:'osm/way/501351791/component/d014e41d8f56b770cad6',batchIndex:0,firstVertex:0,vertexCount:30,role:'F355568 original tower batch0'},
 {objectId:'osm/way/501351791',partId:'osm/way/501351791/component/d014e41d8f56b770cad6',batchIndex:1,firstVertex:0,vertexCount:12,role:'F355568 original tower batch1'},
 {objectId:'osm/way/501351791',partId:'osm/way/501351791/component/d014e41d8f56b770cad6/owner-photoapprox559-tower-hip',batchIndex:0,firstVertex:0,vertexCount:18,role:'F355568 derived hip18'},
 {objectId:'osm/relation/7471820',partId:'osm/relation/7471820/component/4e8aef7d8eb02196ac80',batchIndex:1,firstVertex:28,vertexCount:4,role:'F364328 exact southstreet quad28'},
 {objectId:'osm/relation/7471820',partId:'osm/relation/7471820/component/4e8aef7d8eb02196ac80',batchIndex:1,firstVertex:32,vertexCount:4,role:'F364328 exact southstreet quad32'},
 {objectId:'osm/way/1488666794',partId:'osm/way/1488666794/component/31ea4a8c6705dd1cf325',batchIndex:0,firstVertex:0,vertexCount:10,role:'F003291 exact capture1156 batch0'},
 {objectId:'osm/way/1488666794',partId:'osm/way/1488666794/component/31ea4a8c6705dd1cf325',batchIndex:1,firstVertex:0,vertexCount:40,role:'F003291 exact capture1156 batch1'},
 {objectId:'osm/way/1488666794',partId:'osm/way/1488666794/component/31ea4a8c6705dd1cf325/owner-source-recovery287-dome',batchIndex:0,firstVertex:0,vertexCount:1680,role:'F003291 exact capture1156 batch0'},
 {objectId:'osm/way/1488666794',partId:'osm/way/1488666794/component/31ea4a8c6705dd1cf325/owner-source-recovery287-dome',batchIndex:1,firstVertex:0,vertexCount:240,role:'F003291 exact capture1156 batch1'},
 {objectId:'osm/way/1488666794',partId:'osm/way/1488666794/component/31ea4a8c6705dd1cf325/owner-source-recovery287-dome',batchIndex:2,firstVertex:0,vertexCount:552,role:'F003291 exact capture1156 batch2'},
 {objectId:'osm/way/362831072',partId:'osm/way/362831072/component/6d760e2eacfee77e24c2',batchIndex:0,firstVertex:0,vertexCount:438,role:'F56 actual shared tower carrier batch0'},
 {objectId:'osm/way/362831072',partId:'osm/way/362831072/component/6d760e2eacfee77e24c2',batchIndex:1,firstVertex:0,vertexCount:219,role:'F56 actual shared tower carrier batch1'},
 {objectId:'osm/way/226096975',partId:'osm/way/226096975/component/dc4a7fcf8fe4d49e21c3',batchIndex:0,firstVertex:0,vertexCount:138,role:'Paulinum actual source material batch0'},
 {objectId:'osm/way/226096975',partId:'osm/way/226096975/component/dc4a7fcf8fe4d49e21c3',batchIndex:1,firstVertex:0,vertexCount:126,role:'Paulinum actual source material batch1'},
 {objectId:'osm/way/35006256',partId:'osm/way/35006256/component/ed86cbdde34b15aafca0',batchIndex:1,firstVertex:56,vertexCount:4,role:'actual white-pick wall56'},
 {objectId:'osm/way/35006256',partId:'osm/way/35006256/component/ed86cbdde34b15aafca0',batchIndex:1,firstVertex:60,vertexCount:4,role:'actual white-pick wall60'},
 {objectId:'osm/way/1207797957',partId:'osm/way/1207797957/component/b56e09c7e8b907ba01ed',batchIndex:0,firstVertex:0,vertexCount:57,role:'partial parent original roof57'},
] as const;
export function readPaintGPUDiagnostic(context:PaintGPUReadbackContext,diagnosticIdentities:readonly PaintDiagnosticIdentity[]|undefined){
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
 if(context.program)for(const name of ['u_paint_mode','u_paint_override','u_progressive_features','u_opacity','u_style_scale','u_style_offset']){const location=gl.getUniformLocation(context.program,name);uniforms[name]=location===null?null:gl.getUniform(context.program,location);}
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
    const gpu=read(context.vertexBuffer,10),expected=Array.from(context.packedVertices.subarray(globalFirstVertex*10,(globalFirstVertex+range.vertexCount)*10));
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
 const linkedShaderProof=context.program?(gl.getAttachedShaders(context.program)??[]).map(shader=>{const source=gl.getShaderSource(shader)??'';const at=source.indexOf('vec3 f364Front318(');const dispatch=source.indexOf('if(family==1686.)');const uMode=source.indexOf('uniform float u_paint_mode'),entry=source.indexOf('void main()'),branch=source.indexOf('if(u_paint_mode>1.5)',entry);let sourceHash=2166136261;for(const byte of new TextEncoder().encode(source))sourceHash=Math.imul(sourceHash^byte,16777619)>>>0;return{type:gl.getShaderParameter(shader,gl.SHADER_TYPE),sourceLength:source.length,sourceHash:{encoding:'fnv1a32-utf8-linked-shader',hex:sourceHash.toString(16).padStart(8,'0')},uPaintModeDeclaration:uMode<0?null:source.slice(uMode,uMode+110),uPaintModeMainBranch:branch<0?null:source.slice(branch,branch+190),f355ClipBranch:(()=>{const p=source.indexOf('if(semanticFamily==4091.');return p<0?null:{offset:p,fragment:source.slice(p,p+180),preceding:source.slice(Math.max(0,p-240),p),firstPaintStyleBranch:branch,clipBeforePaintStyleBranch:branch<0?null:p<branch};})(),f358Normal579:(()=>{const p=source.indexOf('(semanticFamily==428.&&v_paint_frame.z==579.)');return p<0?null:{offset:p,fragment:source.slice(p,p+160),frameRestore:source.includes('vec4(v_paint_frame.xy,14.,v_paint_frame.w)')};})(),hasF364Function:at>=0,functionFragment:at<0?null:source.slice(at,at+280),has1686Dispatch:dispatch>=0,dispatchFragment:dispatch<0?null:source.slice(dispatch,dispatch+140),hasFamily1000Gate:source.includes('family>=1000.0'),hasF364Sentinel:source.includes('u_f364_diagnostic')};}):[];
 return{requested:true,available:true,readback:'existing actual GPU buffers via getBufferSubData',sourceArraysModified:false,attributeReadbackAvailable:!!(context.vao&&context.program),uniforms,linkedShaderProof,attributes,records};
}
