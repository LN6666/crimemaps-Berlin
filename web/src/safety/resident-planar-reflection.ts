export type ResidentPlanarReflectionPass={gl:WebGL2RenderingContext;mainMatrix:Float64Array;clipPlaneWorldZ:number;maxTriangles:number;maxDraws?:number};
export type ResidentPlanarReflectionResult={triangles:number;draws:number;complete:boolean};
export function withResidentReflectionClip(fragment:string){
 const main=/void\s+main\s*\(\s*(?:void\s*)?\)\s*\{/g;if([...fragment.matchAll(main)].length!==1)throw Error('Expected one surface fragment main');
 const declarations='\nuniform bool u_resident_reflection_clip;\nuniform highp vec4 u_resident_reflection_plane;\nuniform highp vec4 u_resident_reflection_viewport;\n';
 return fragment.replace(main,match=>declarations+match+'if(u_resident_reflection_clip){highp vec3 q=vec3((gl_FragCoord.xy-u_resident_reflection_viewport.xy)/u_resident_reflection_viewport.zw*2.0-1.0,gl_FragCoord.z*2.0-1.0);if(dot(u_resident_reflection_plane,vec4(q,1.0))<0.0)discard;}');
}
/** Transform the original world water plane, rather than a provider's possibly derived local vertex position. */
export function residentReflectionClipPlane(matrix:ArrayLike<number>,waterZ:number){
 if(matrix.length!==16||!Number.isFinite(waterZ)||!Array.from(matrix).every(Number.isFinite))return;
 const rows=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?matrix[c*4+r]:Number(c-4===r)));
 for(let c=0;c<4;c++){let p=c;for(let r=c+1;r<4;r++)if(Math.abs(rows[r][c])>Math.abs(rows[p][c]))p=r;if(Math.abs(rows[p][c])<1e-24)return;[rows[c],rows[p]]=[rows[p],rows[c]];const d=rows[c][c];for(let k=0;k<8;k++)rows[c][k]/=d;for(let r=0;r<4;r++)if(r!==c){const f=rows[r][c];for(let k=0;k<8;k++)rows[r][k]-=f*rows[c][k];}}
 const plane=Array.from({length:4},(_,c)=>rows[2][4+c]-waterZ*rows[3][4+c]),scale=Math.max(...plane.map(Math.abs));if(!Number.isFinite(scale)||scale===0)return;
 return new Float32Array(plane.map(v=>v/scale));
}
export function createResidentReflectionUniforms(){
 const cache=new WeakMap<WebGLProgram,{enabled:WebGLUniformLocation|null;plane:WebGLUniformLocation|null;viewport:WebGLUniformLocation|null}>();
 return(gl:WebGL2RenderingContext,program:WebGLProgram,plane?:Float32Array,viewport?:ArrayLike<number>)=>{let loc=cache.get(program);if(!loc){loc={enabled:gl.getUniformLocation(program,'u_resident_reflection_clip'),plane:gl.getUniformLocation(program,'u_resident_reflection_plane'),viewport:gl.getUniformLocation(program,'u_resident_reflection_viewport')};cache.set(program,loc);}gl.uniform1i(loc.enabled,plane?1:0);if(plane&&viewport){gl.uniform4fv(loc.plane,plane);gl.uniform4f(loc.viewport,viewport[0],viewport[1],viewport[2],viewport[3]);}};
}
export function residentReflectionBoxOutside(box:readonly number[],matrix:ArrayLike<number>){
 if(box.length!==6||!box.every(Number.isFinite))return false;
 const minY=Math.min(0,box[1]),maxY=Math.max(0,box[4]),clips:number[][]=[];
 for(const x of [box[0],box[3]])for(const y of [minY,maxY])for(const z of [box[2],box[5]])clips.push(Array.from({length:4},(_,r)=>matrix[r]*x+matrix[4+r]*y+matrix[8+r]*z+matrix[12+r]));
 return [0,1,2].some(axis=>clips.every(q=>q[axis]<-q[3])||clips.every(q=>q[axis]>q[3]));
}
export type ResidentReflectionComponent={start:number;end:number;box:readonly number[]};
export type ResidentReflectionRun<Program>={firstIndex:number;indexCount:number;program:Program|undefined};
/** Whole accepted resident components only; no new index buffer, triangle prefixes, or material substitutions. */
export function planResidentReflection<Program>(components:Iterable<ResidentReflectionComponent>,runs:readonly ResidentReflectionRun<Program>[],matrix:ArrayLike<number>,maxTriangles:number,maxDraws:number,indexCount:number,cull=true){
 let complete=true,triangles=0,draws=0;const selected:ResidentReflectionComponent[]=[],plan:{program:Program;firstIndex:number;indexCount:number}[]=[];
 maxTriangles=Number.isFinite(maxTriangles)?Math.max(0,Math.floor(maxTriangles)):0;maxDraws=Number.isFinite(maxDraws)?Math.max(0,Math.floor(maxDraws)):0;
 const ordered=[...runs].sort((a,b)=>a.firstIndex-b.firstIndex);
 for(const c of components){if(cull&&residentReflectionBoxOutside(c.box,matrix))continue;if(!Number.isSafeInteger(c.start)||!Number.isSafeInteger(c.end)||c.start<0||c.end>indexCount||c.end<=c.start||c.start%3||c.end%3){complete=false;continue;}
  let lo=0,hi=ordered.length;while(lo<hi){const mid=(lo+hi)>>>1;if(ordered[mid].firstIndex+ordered[mid].indexCount<=c.start)lo=mid+1;else hi=mid;}
  let cursor=c.start,ready=true;const rows:typeof plan=[];
  for(let i=lo;i<ordered.length&&ordered[i].firstIndex<c.end;i++){const run=ordered[i],a=Math.max(c.start,run.firstIndex),b=Math.min(c.end,run.firstIndex+run.indexCount);if(b<=a)continue;if(a!==cursor||!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a%3||b%3||!run.program){ready=false;break;}cursor=b;rows.push({program:run.program,firstIndex:a,indexCount:b-a});}
  const count=(c.end-c.start)/3;if(!ready||cursor!==c.end||triangles+count>maxTriangles||draws+rows.length>maxDraws){complete=false;continue;}selected.push(c);plan.push(...rows);triangles+=count;draws+=rows.length;
 }
 plan.sort((a,b)=>a.firstIndex-b.firstIndex);
 return{plan,components:selected,triangles,draws,complete};
}
export function createResidentReflectionObjects(){let next=0;const ids=new WeakMap<object,number>();return(value:object|null|undefined)=>{if(!value)return 0;let id=ids.get(value);if(!id){id=++next;ids.set(value,id);}return id;};}
