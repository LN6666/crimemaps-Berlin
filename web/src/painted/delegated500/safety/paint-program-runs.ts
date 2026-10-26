export type PaintProgramRun={key:string;firstIndex:number;indexCount:number};
/** Preserve index order, including the last/provoking vertex's flat family. */
export function paintProgramRuns(indices:Uint32Array,paint:Float32Array,keyForFamily:(family:number)=>string,roundHighFamily=true):PaintProgramRun[]{
 if(indices.length%3)throw Error('Non-triangle paint index buffer');
 const runs:PaintProgramRun[]=[];
 for(let i=0;i<indices.length;i+=3){
  const at=indices[i+2]*5+4;if(at>=paint.length)throw Error('Paint family index outside metadata');
  const raw=paint[at],semantic=raw>=1000000?Math.floor(Math.fround(raw/10000)):raw;
  const family=roundHighFamily&&semantic>=1000?Math.floor(Math.fround(semantic+.5)):semantic;
  const key=keyForFamily(family),previous=runs.at(-1);
  if(previous?.key===key)previous.indexCount+=3;
  else runs.push({key,firstIndex:i,indexCount:3});
 }
 return runs;
}
