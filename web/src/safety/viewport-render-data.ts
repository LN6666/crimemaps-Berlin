import type {FC} from './model';
type Bounds=readonly[number,number,number,number];
const boxes=new WeakMap<object,Bounds|null>();
function geometryBounds(geometry:object):Bounds|null {
  if(boxes.has(geometry))return boxes.get(geometry)!;
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity,valid=true;
  const walk=(value:unknown):void=>{
    if(!Array.isArray(value)){valid=false;return;}
    if(typeof value[0]==='number'){
      const [x,y]=value;
      if(!Number.isFinite(x)||!Number.isFinite(y)){valid=false;return;}
      west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);
    }else for(const child of value)walk(child);
  };
  const g=geometry as {type?:string;coordinates?:unknown};
  // Unknown/unsupported shapes remain admitted; a render optimization must not
  // discard a source merely because it cannot establish its bounds.
  if(g.type==='GeometryCollection'||g.coordinates===undefined)valid=false;else walk(g.coordinates);
  const box:Bounds|null=valid&&Number.isFinite(west)?[west,south,east,north]:null;
  boxes.set(geometry,box);return box;
}
/** Only the transfer to the map renderer is narrowed. The full annual records,
 * counts, source geometry and selection remain in the caller. Entire intersecting
 * features are retained, including lines that cross the view with no vertex in it.
 * A quarter-view margin keeps edge symbols and short pans populated. */
export function viewportRenderData(source:FC,view:Bounds):FC {
  const [west,south,east,north]=view;
  if(!view.every(Number.isFinite)||west>=east||south>=north||source.features.length<2)return source;
  const x=(east-west)*.25,y=(north-south)*.25;
  const visible=source.features.filter(feature=>{
    if(!feature.geometry||typeof feature.geometry!=='object')return true;
    const box=geometryBounds(feature.geometry);
    return !box||box[0]<=east+x&&box[2]>=west-x&&box[1]<=north+y&&box[3]>=south-y;
  });
  return visible.length===source.features.length?source:{...source,features:visible};
}
