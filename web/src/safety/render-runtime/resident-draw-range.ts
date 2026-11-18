type ResidentSpan = Readonly<{
 firstIndex:number;
 indexCount:number;
 chunk:{
  cpu:{readonly value?:unknown};
  geometry?:{readonly value?:unknown};
  masks?:{isResident(gl:WebGL2RenderingContext,program:WebGLProgram):boolean};
 };
}>;

/** Published spans are ordered, non-overlapping index ranges. */
export function* residentSpansInRange<T extends {firstIndex:number; indexCount:number}>(
 spans:readonly T[], first:number, end:number,
):Generator<T> {
 let low=0, high=spans.length;
 while(low<high){
  const middle=low+Math.floor((high-low)/2), span=spans[middle];
  if(span.firstIndex+span.indexCount<=first)low=middle+1;
  else high=middle;
 }
 for(let i=low;i<spans.length&&spans[i].firstIndex<end;i++)yield spans[i];
}

/** A partially prepared frame can draw a run only when its entire index range
 * is covered by the published chunks and their masks for this exact program. */
export function residentDrawRange(spans:readonly ResidentSpan[], first:number, count:number,
 gl:WebGL2RenderingContext, program:WebGLProgram):boolean {
 const end=first+count;
 let covered=first;
 for(const span of residentSpansInRange(spans,first,end)){
  const start=Math.max(first,span.firstIndex);
  const stop=Math.min(end,span.firstIndex+span.indexCount);
  if(stop<=start)continue;
  if(start!==covered||!span.chunk.cpu.value||!span.chunk.geometry?.value||
    !span.chunk.masks?.isResident(gl,program))return false;
  covered=stop;
 }
 return count>0&&covered===end;
}

type ChunkLocations=Readonly<Record<'matrix'|'style_scale'|'style_height_scale'|'style_offset',WebGLUniformLocation|null>>;
const locationsByProgram=new WeakMap<WebGLProgram,ChunkLocations>();

/** Each linked renderer program has its own immutable locations. Restored
 * contexts create new program objects; null means the uniform is inactive. */
export function chunkUniforms(gl:WebGL2RenderingContext,program:WebGLProgram):ChunkLocations {
 let locations=locationsByProgram.get(program);
 if(!locations){
  locations={
   matrix:gl.getUniformLocation(program,'u_matrix'),
   style_scale:gl.getUniformLocation(program,'u_style_scale'),
   style_height_scale:gl.getUniformLocation(program,'u_style_height_scale'),
   style_offset:gl.getUniformLocation(program,'u_style_offset'),
  };
  if(!gl.isContextLost())locationsByProgram.set(program,locations);
 }
 return locations;
}

type SurfaceLocations=Readonly<Record<'opacity'|'paintMode'|'features'|'maskDiagnostic'|'paintOverride',WebGLUniformLocation|null>>;
const surfaceByProgram=new WeakMap<WebGLProgram,SurfaceLocations>();

export function surfaceUniforms(gl:WebGL2RenderingContext,program:WebGLProgram):SurfaceLocations {
 let locations=surfaceByProgram.get(program);
 if(!locations){
  locations={
   opacity:gl.getUniformLocation(program,'u_opacity'),
   paintMode:gl.getUniformLocation(program,'u_paint_mode'),
   features:gl.getUniformLocation(program,'u_progressive_features'),
   maskDiagnostic:gl.getUniformLocation(program,'u_s182_mask_diagnostic'),
   paintOverride:gl.getUniformLocation(program,'u_paint_override'),
  };
  if(!gl.isContextLost())surfaceByProgram.set(program,locations);
 }
 return locations;
}
