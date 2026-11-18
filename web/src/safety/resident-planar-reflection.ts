import type {SolarShadowCoverage} from './planar-building-reflection';
export type ResidentPlanarReflectionPass={purpose?:'solar-depth';gl:WebGL2RenderingContext;mainMatrix:Float64Array;clipPlaneWorldZ:number;maxTriangles:number;maxDraws?:number};
export type ResidentPlanarReflectionResult={triangles:number;draws:number;complete:boolean;reason?:string;pending?:boolean};
export const RESIDENT_REFLECTION_CLIP_DECLARATIONS='\nuniform bool u_resident_reflection_clip;\nuniform highp vec4 u_resident_reflection_plane;\nuniform highp vec4 u_resident_reflection_viewport;\n';
export const RESIDENT_REFLECTION_CLIP_BODY='if(u_resident_reflection_clip){highp vec3 q=vec3((gl_FragCoord.xy-u_resident_reflection_viewport.xy)/u_resident_reflection_viewport.zw*2.0-1.0,gl_FragCoord.z*2.0-1.0);if(dot(u_resident_reflection_plane,vec4(q,1.0))<0.0)discard;}';
export function withResidentReflectionClip(fragment:string){
 const main=/void\s+main\s*\(\s*(?:void\s*)?\)\s*\{/g;if([...fragment.matchAll(main)].length!==1)throw Error('Expected one surface fragment main');
 return fragment.replace(main,match=>RESIDENT_REFLECTION_CLIP_DECLARATIONS+match+RESIDENT_REFLECTION_CLIP_BODY);
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
export type ResidentReflectionComponent={start:number;end:number;box:readonly number[];/** Original publication draw order when components are grouped into chunks. */order?:number};
export type ResidentReflectionRun<Program>={firstIndex:number;indexCount:number;program:Program|undefined};
export type ResidentReflectionChunk<Program>={components:Iterable<ResidentReflectionComponent>;runs:readonly ResidentReflectionRun<Program>[];matrix:ArrayLike<number>;indexCount:number;cull?:boolean};
/** Whole components a plan skipped only because the pass budget could not hold
 * them (draws = the run rows each would have needed). Culled, invalid and
 * missing-program components are not budget omissions. Diagnostic only. */
export type ResidentReflectionBudgetOmission={components:number;triangles:number;draws:number};
/** Global-registry key of the diagnostic omission tally. A planar reflection
 * group installs a tally around each provider's synchronous capture and reads
 * it back; plans made meanwhile add their budget omissions. The registry keeps
 * this module free of runtime imports. Selection never reads the tally. */
export const RESIDENT_REFLECTION_BUDGET_TALLY=Symbol.for('crimemaps.resident-reflection.budget-omission-tally');
function tallyBudgetOmission(value:ResidentReflectionBudgetOmission){
 const tally=(globalThis as unknown as Record<symbol,ResidentReflectionBudgetOmission|undefined>)[RESIDENT_REFLECTION_BUDGET_TALLY];
 if(!tally)return;tally.components+=value.components;tally.triangles+=value.triangles;tally.draws+=value.draws;
}
/** Whole accepted resident components only; no new index buffer, triangle prefixes, or material substitutions. */
export function planResidentReflection<Program>(components:Iterable<ResidentReflectionComponent>,runs:readonly ResidentReflectionRun<Program>[],matrix:ArrayLike<number>,maxTriangles:number,maxDraws:number,indexCount:number,cull=true){
 const selected=planResidentReflectionChunks<Program,ResidentReflectionChunk<Program>>([{components,runs,matrix,indexCount,cull}],maxTriangles,maxDraws);
 return{...selected,plan:selected.plan.map(({program,firstIndex,indexCount})=>({program,firstIndex,indexCount})),components:selected.components.map(row=>row.component)};
}
/** The budget belongs to the complete pass, including missing-program rows.
 * A chunk contains only its own local components/runs, never the whole view. */
export function planResidentReflectionChunks<Program,Chunk extends ResidentReflectionChunk<Program>>(chunks:readonly Chunk[],maxTriangles:number,maxDraws:number){
 let complete=true,pending=false,triangles=0,draws=0,reservedTriangles=0,reservedDraws=0,reason:string|undefined;
 const selected:{chunk:Chunk;component:ResidentReflectionComponent}[]=[],plan:{program:Program;firstIndex:number;indexCount:number;chunk:Chunk;order?:number;chunkOrder:number}[]=[],budgetOmitted:ResidentReflectionBudgetOmission={components:0,triangles:0,draws:0};
 maxTriangles=Number.isFinite(maxTriangles)?Math.max(0,Math.floor(maxTriangles)):0;maxDraws=Number.isFinite(maxDraws)?Math.max(0,Math.floor(maxDraws)):0;
 const candidates=chunks.flatMap((chunk,chunkOrder)=>{const ordered=[...chunk.runs].sort((a,b)=>a.firstIndex-b.firstIndex);return[...chunk.components].map(component=>({chunk,chunkOrder,ordered,component}));});
 candidates.sort((a,b)=>a.component.order!==undefined&&b.component.order!==undefined?a.component.order-b.component.order:0);
 for(const {chunk,chunkOrder,ordered,component:c} of candidates){if(chunk.cull!==false&&residentReflectionBoxOutside(c.box,chunk.matrix))continue;if(!Number.isSafeInteger(c.start)||!Number.isSafeInteger(c.end)||c.start<0||c.end>chunk.indexCount||c.end<=c.start||c.start%3||c.end%3){complete=false;reason??='invalid-component-range';continue;}
  let lo=0,hi=ordered.length;while(lo<hi){const mid=(lo+hi)>>>1;if(ordered[mid].firstIndex+ordered[mid].indexCount<=c.start)lo=mid+1;else hi=mid;}
  let cursor=c.start,coverage=true,missing=false;const rows:{program:Program|undefined;firstIndex:number;indexCount:number}[]=[];
  for(let i=lo;i<ordered.length&&ordered[i].firstIndex<c.end;i++){const run=ordered[i],a=Math.max(c.start,run.firstIndex),b=Math.min(c.end,run.firstIndex+run.indexCount);if(b<=a)continue;if(a!==cursor||!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a%3||b%3){coverage=false;break;}cursor=b;missing||=!run.program;rows.push({program:run.program,firstIndex:a,indexCount:b-a});}
  if(!coverage||cursor!==c.end){complete=false;reason??='run-coverage';continue;}
  const count=(c.end-c.start)/3;
  if(reservedTriangles+count>maxTriangles||reservedDraws+rows.length>maxDraws){complete=false;reason??='capture-budget';budgetOmitted.components++;budgetOmitted.triangles+=count;budgetOmitted.draws+=rows.length;continue;}
  // Select by geometry and cost before readiness, exactly as preparation does.
  // A missing selected program cannot admit a different component instead.
  reservedTriangles+=count;reservedDraws+=rows.length;
  if(missing){complete=false;pending=true;reason??='missing-program';continue;}
  selected.push({chunk,component:c});for(const row of rows)plan.push({...row,program:row.program!,chunk,order:c.order,chunkOrder});triangles+=count;draws+=rows.length;
 }
 plan.sort((a,b)=>a.order!==undefined&&b.order!==undefined&&a.order!==b.order?a.order-b.order:a.chunkOrder-b.chunkOrder||a.firstIndex-b.firstIndex);
 if(budgetOmitted.components)tallyBudgetOmission(budgetOmitted);
 return{plan,components:selected,triangles,draws,complete,budgetOmitted,...(reason?{reason}:{}),...(pending?{pending:true}:{})};
}
export function createResidentReflectionObjects(){let next=0;const ids=new WeakMap<object,number>();return(value:object|null|undefined)=>{if(!value)return 0;let id=ids.get(value);if(!id){id=++next;ids.set(value,id);}return id;};}

/** Packed bounds are conservative: material discards may remove fragments, never add geometry.
 * Callers must mark shader-displaced bounds or unfinished growth/programs incomplete. */
export function residentSolarShadowCoverage(components:Iterable<ResidentReflectionComponent>,anchor:readonly number[],unit:number,triangles:number,draws:number,complete:boolean,reason?:string):SolarShadowCoverage {
 const bounds:[number,number,number,number,number,number]=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
 let valid=anchor.length===2&&anchor.every(Number.isFinite)&&Number.isFinite(unit)&&unit>0;
 for(const c of components){const b=c.box;if(b.length!==6||!b.every(Number.isFinite)||b[0]>b[3]||b[1]>b[4]||b[2]>b[5]){valid=false;continue;}
  bounds[0]=Math.min(bounds[0],anchor[0]+b[0]/unit);bounds[3]=Math.max(bounds[3],anchor[0]+b[3]/unit);
  bounds[1]=Math.min(bounds[1],anchor[1]-b[5]/unit);bounds[4]=Math.max(bounds[4],anchor[1]-b[2]/unit);
  bounds[2]=Math.min(bounds[2],Math.min(0,b[1])/unit);bounds[5]=Math.max(bounds[5],Math.max(0,b[4])/unit);
 }
 valid=valid&&bounds.every(Number.isFinite)&&Number.isSafeInteger(triangles)&&triangles>=0&&Number.isSafeInteger(draws)&&draws>=0;
 return {bounds:bounds.every(Number.isFinite)?bounds:[0,0,0,0,0,0],triangles,draws,complete:complete&&valid,...(!valid?{reason:'invalid-bounds-or-cost'}:!complete?{reason:reason??'source-incomplete'}:{})};
}

/** Each chunk converts its stable local bounds to the same world frame once. */
export function residentSolarShadowChunkCoverage(chunks:Iterable<{components:Iterable<ResidentReflectionComponent>;anchor:readonly number[];unit:number}>,triangles:number,draws:number,complete:boolean,reason?:string):SolarShadowCoverage{
 const bounds:[number,number,number,number,number,number]=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];let valid=true,any=false;
 for(const chunk of chunks){const components=[...chunk.components];if(!components.length)continue;any=true;const coverage=residentSolarShadowCoverage(components,chunk.anchor,chunk.unit,0,0,true);valid&&=coverage.complete;for(let axis=0;axis<3;axis++){bounds[axis]=Math.min(bounds[axis],coverage.bounds[axis]);bounds[axis+3]=Math.max(bounds[axis+3],coverage.bounds[axis+3]);}}
 valid=valid&&any&&bounds.every(Number.isFinite)&&Number.isSafeInteger(triangles)&&triangles>=0&&Number.isSafeInteger(draws)&&draws>=0;
 return{bounds:valid?bounds:[0,0,0,0,0,0],triangles,draws,complete:complete&&valid,...(!valid?{reason:'invalid-bounds-or-cost'}:!complete?{reason:reason??'source-incomplete'}:{})};
}
