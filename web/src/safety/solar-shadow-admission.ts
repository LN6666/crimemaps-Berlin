import type {SceneSolarLight} from './scene-solar-light';
export type SolarBoundaryGeometry = {type:'Polygon'|'MultiPolygon';coordinates:number[][][]|number[][][][]};
export type SolarShadowBoundary = {boundarySHA256:string;geometry:SolarBoundaryGeometry};
type Box = readonly [number,number,number,number];
type Ring = {box:Box;edges:Float64Array;buckets:readonly number[][]};
type Polygon = readonly Ring[];
export type PreparedSolarBoundary = {boundarySHA256:string;covers:(box:Box)=>boolean;vertices:number};
const cache = new Map<string,PreparedSolarBoundary>();
/** Reuse only a polygon already admitted by the source loader in this module. */
export const currentSolarShadowBoundary = (boundarySHA256:string) => cache.get(boundarySHA256);
const overlap = (a:Box,b:Box) => a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
const bucket = (y:number,box:Box) => Math.max(0,Math.min(63,Math.floor((y-box[1])/Math.max(1e-12,box[3]-box[1])*64)));
/** This must receive a boundary AFTER the caller's existing byte/SHA/source checks.
 * The same verified hash shares one bounded edge index across painting providers.
 * Coverage is conservative: even a boundary edge's overlapping bounding rectangle
 * rejects the shadow, including enclaves and holes completely inside the shadow.
 */
export function prepareSolarShadowBoundary(value:SolarShadowBoundary):PreparedSolarBoundary {
  if(!value||!/^[a-f0-9]{64}$/.test(value.boundarySHA256)||!value.geometry||!['Polygon','MultiPolygon'].includes(value.geometry.type))throw Error('Invalid verified solar boundary');
  const hit=cache.get(value.boundarySHA256);if(hit)return hit;
  let vertices=0;
  const source=value.geometry.type==='Polygon'?[value.geometry.coordinates as number[][][]]:value.geometry.coordinates as number[][][][];
  if(!source.length||source.length>10000)throw Error('Invalid solar boundary polygons');
  const polygons:Polygon[]=source.map(polygon=>{
    if(!Array.isArray(polygon)||!polygon.length)throw Error('Invalid solar boundary polygon');
    return polygon.map(points=>{
      if(!Array.isArray(points)||points.length<4)throw Error('Invalid solar boundary ring');
      const first=points[0],last=points[points.length-1];if(first[0]!==last[0]||first[1]!==last[1])throw Error('Open solar boundary ring');
      let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
      for(const p of points){if(!Array.isArray(p)||p.length<2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>85||++vertices>200000)throw Error('Solar boundary vertex budget');west=Math.min(west,p[0]);east=Math.max(east,p[0]);south=Math.min(south,p[1]);north=Math.max(north,p[1]);}
      const box:Box=[west,south,east,north],edges=new Float64Array((points.length-1)*4),buckets=Array.from({length:64},()=>[] as number[]);
      for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];edges.set([a[0],a[1],b[0],b[1]],i*4);const lo=bucket(Math.min(a[1],b[1]),box),hi=bucket(Math.max(a[1],b[1]),box);for(let j=lo;j<=hi;j++)buckets[j].push(i);}
      return {box,edges,buckets};
    });
  });
  const inRing=(ring:Ring,x:number,y:number)=>{
    if(x<=ring.box[0]||x>=ring.box[2]||y<=ring.box[1]||y>=ring.box[3])return false;
    let inside=false;for(const id of ring.buckets[bucket(y,ring.box)]){const at=id*4,ax=ring.edges[at],ay=ring.edges[at+1],bx=ring.edges[at+2],by=ring.edges[at+3];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;}return inside;
  };
  const contains=(x:number,y:number)=>polygons.some(p=>inRing(p[0],x,y)&&!p.slice(1).some(r=>inRing(r,x,y)));
  const covers=(box:Box)=>{
    if(box.length!==4||!box.every(Number.isFinite)||box[0]>=box[2]||box[1]>=box[3])return false;
    if(!contains(box[0],box[1])||!contains(box[2],box[1])||!contains(box[2],box[3])||!contains(box[0],box[3]))return false;
    for(const polygon of polygons)for(const ring of polygon){
      if(!overlap(box,ring.box))continue;
      const seen=new Set<number>(),lo=bucket(box[1],ring.box),hi=bucket(box[3],ring.box);
      for(let j=lo;j<=hi;j++)for(const id of ring.buckets[j]){
        if(seen.has(id))continue;seen.add(id);const at=id*4,ax=ring.edges[at],ay=ring.edges[at+1],bx=ring.edges[at+2],by=ring.edges[at+3];
        if(Math.min(ax,bx)<=box[2]&&Math.max(ax,bx)>=box[0]&&Math.min(ay,by)<=box[3]&&Math.max(ay,by)>=box[1])return false;
      }
    }
    return true;
  };
  const result={boundarySHA256:value.boundarySHA256,covers,vertices};cache.set(value.boundarySHA256,result);while(cache.size>2)cache.delete(cache.keys().next().value!);return result;
}
/** The resident packed x/y/z bounding box encloses every currently drawable
 * native/display vertex. Shadow masks only discard pixels. Transforming all box
 * corners therefore also encloses every triangle and every growth in [0,1]. */
export function solarShadowBoxForPackedBounds(origin:readonly[number,number],box:readonly number[],light:SceneSolarLight):[number,number,number,number]|undefined {
  if(!light.shadowVector)return;
  if(box.length!==6||!box.every(Number.isFinite)||box[0]>box[3]||box[1]>box[4]||box[2]>box[5]||box[4]<=0)return;
  const rad=Math.PI/180,scale=6378137*Math.cos(origin[1]*rad),originY=Math.log(Math.tan(Math.PI/4+origin[1]*rad/2));
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  // Below-ground vertices contribute only their ground footprint, matching the shader.
  for(const x of[box[0],box[3]])for(const y of[0,Math.max(0,box[1]),box[4]])for(const z of[box[2],box[5]]){
    const lon=origin[0]+(x+light.shadowVector[0]*y)/scale/rad;
    const lat=(2*Math.atan(Math.exp(originY+(z+light.shadowVector[1]*y)/scale))-Math.PI/2)/rad;
    west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat);
  }
  return[west,south,east,north];
}
/** The caller supplies only its already validated, actually drawable packed rows.
 * Native/owner/derived labels remain caller provenance; no legacy fixed-direction
 * metadata is required for this separate, current-time display projection proof. */
export function residentSolarShadowRanges<T extends {generation:number;start:number;end:number;box:readonly number[]}>(origin:readonly[number,number],rows:Iterable<T>,light:SceneSolarLight,boundary:PreparedSolarBoundary,generation:number,indexCount:number):T[] {
  if(!light.shadowVector)return[];
  const result:T[]=[];
  for(const c of rows){
    if(c.generation!==generation||!Number.isSafeInteger(c.start)||!Number.isSafeInteger(c.end)||c.start<0||c.end>indexCount||c.end<=c.start||(c.end-c.start)%3)continue;
    const box=solarShadowBoxForPackedBounds(origin,c.box,light);if(box&&boundary.covers(box))result.push(c);
  }
  return result;
}
