import type {SceneSolarLight} from './scene-solar-light';
import type {PreparedSolarBoundary} from './solar-shadow-admission';
/** Fixed typed storage. Source x/north/height values are copied unchanged only
 * when membership or actual source instance values change. A full union-box
 * city proof admits all trees at once; otherwise every tree is checked alone. */
export function createEnvironmentTreeShadows(capacity:number){
 if(!Number.isSafeInteger(capacity)||capacity<1||capacity>10000)throw Error('Invalid tree shadow capacity');
 const instances=new Float32Array(capacity*3),mask=new Uint8Array(capacity),nextMask=new Uint8Array(capacity),bounds=new Float64Array(capacity*4),union=new Float64Array(4),box=new Float64Array(4);
 let count=0,withheld=0,revision=-1,mode='awaiting-verified-city-boundary',boundarySHA256:string|undefined;
 let origin:[number,number]=[0,0],scale=6378137,originY=0;
 const clear=(nextMode:string,sourceCount:number,nextRevision:number)=>{const changed=count!==0;count=0;withheld=sourceCount;mode=nextMode;revision=nextRevision;mask.fill(0);nextMask.fill(0);return changed;};
 const geographic=(local:ArrayLike<number>,at=0)=>{const rad=Math.PI/180;box[0]=origin[0]+local[at]/scale/rad;box[2]=origin[0]+local[at+2]/scale/rad;box[1]=(2*Math.atan(Math.exp(originY+local[at+1]/scale))-Math.PI/2)/rad;box[3]=(2*Math.atan(Math.exp(originY+local[at+3]/scale))-Math.PI/2)/rad;return box as unknown as readonly[number,number,number,number];};
 return{instances,mask,setOrigin(value:readonly[number,number]){if(value.length!==2||!value.every(Number.isFinite)||Math.abs(value[0])>180||Math.abs(value[1])>85)throw Error('Invalid tree shadow origin');origin=[value[0],value[1]];const rad=Math.PI/180;scale=6378137*Math.cos(origin[1]*rad);originY=Math.log(Math.tan(Math.PI/4+origin[1]*rad/2));},
 update(source:Float32Array,sourceCount:number,sourceRevision:number,light:SceneSolarLight,boundary:PreparedSolarBoundary|undefined,radiusMetres:number,enabled=true){
  if(!Number.isSafeInteger(sourceCount)||sourceCount<0||sourceCount>capacity||source.length<sourceCount*3||!Number.isFinite(radiusMetres)||radiusMetres<0||radiusMetres>5)throw Error('Invalid tree shadow input');
  boundarySHA256=boundary?.boundarySHA256;
  if(!enabled)return clear('disabled',sourceCount,sourceRevision);
  if(!light.shadowVector)return clear('sun-below-shadow-altitude',sourceCount,sourceRevision);
  if(!boundary)return clear('awaiting-verified-city-boundary',sourceCount,sourceRevision);
  let nextCount=0,changed=false;const vector=light.shadowVector;nextMask.fill(0);union[0]=union[1]=Infinity;union[2]=union[3]=-Infinity;
  for(let i=0;i<sourceCount;i++){const at=i*3,b=i*4,x=source[at],z=source[at+1],height=source[at+2];if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(height)||height<0)throw Error('Invalid source tree shadow coordinates');const sx=vector[0]*height,sz=vector[1]*height;bounds[b]=x-radiusMetres+Math.min(0,sx);bounds[b+1]=z-radiusMetres+Math.min(0,sz);bounds[b+2]=x+radiusMetres+Math.max(0,sx);bounds[b+3]=z+radiusMetres+Math.max(0,sz);union[0]=Math.min(union[0],bounds[b]);union[1]=Math.min(union[1],bounds[b+1]);union[2]=Math.max(union[2],bounds[b+2]);union[3]=Math.max(union[3],bounds[b+3]);}
  const allCovered=sourceCount>0&&boundary.covers(geographic(union));
  for(let i=0;i<sourceCount;i++){const admitted=allCovered||boundary.covers(geographic(bounds,i*4));nextMask[i]=Number(admitted);if(admitted)nextCount++;if(nextMask[i]!==mask[i])changed=true;}
  if(nextCount!==count)changed=true;
  if(!changed&&revision!==sourceRevision){let at=0;for(let i=0;i<sourceCount;i++)if(nextMask[i])for(let a=0;a<3;a++)if(instances[at++]!==source[i*3+a])changed=true;}
  if(changed){let at=0;for(let i=0;i<sourceCount;i++)if(nextMask[i]){instances[at++]=source[i*3];instances[at++]=source[i*3+1];instances[at++]=source[i*3+2];}mask.set(nextMask);}
  revision=sourceRevision;count=nextCount;withheld=sourceCount-nextCount;mode=withheld?'solar-projected-partial':'solar-projected';return changed;
 },get stats(){return{count,withheld,mode,boundarySHA256,scratchBytes:instances.byteLength+mask.byteLength+nextMask.byteLength+bounds.byteLength+union.byteLength+box.byteLength,receiverHeightMetres:.03,role:'source-tree-display-schematic-solar-shadow'};},destroy(){count=withheld=0;mode='destroyed';mask.fill(0);nextMask.fill(0);instances.fill(0);}};
}
