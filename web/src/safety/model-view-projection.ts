import {classifyProjectedDetail,type ProjectedDetailViewport} from './projected-detail-policy';
import {createBuildingFocusWindow,type BuildingFocusWindow} from './building-focus-window';

export type ModelViewProjectionSnapshot = Readonly<{
  revision:number;
  cameraKey:string;
  /** Owned copy of the public custom-layer defaultProjectionData.mainMatrix. */
  mainMatrix:Readonly<ArrayLike<number>>;
  viewport:Readonly<ProjectedDetailViewport>;
  mercator:boolean;
  /** Building admission only. Environment layers must not use this window. */
  buildingFocus?:BuildingFocusWindow;
}>;

const viewportFields=['cssWidth','cssHeight','drawingBufferWidth','drawingBufferHeight'] as const;
function validMatrix(matrix:ArrayLike<number>|undefined):matrix is ArrayLike<number>{
  if(!matrix||matrix.length!==16)return false;
  for(let i=0;i<16;i++)if(!Number.isFinite(matrix[i]))return false;
  return true;
}
function validViewport(viewport:ProjectedDetailViewport|undefined):viewport is ProjectedDetailViewport{
  return !!viewport&&viewportFields.every(key=>Number.isFinite(viewport[key])&&viewport[key]>0);
}

/** The compositor publishes from one existing custom-layer callback. No map
 * observer, scheduling, GL access or camera approximation lives here. A caller
 * must read with its current camera key again after asynchronous preparation. */
export function createModelViewProjection(){
  let snapshot:ModelViewProjectionSnapshot|undefined,revision=0;
  const focus=createBuildingFocusWindow();
  return {
    publish(matrix:ArrayLike<number>|undefined,viewport:ProjectedDetailViewport|undefined,cameraKey:string,mercator:boolean):ModelViewProjectionSnapshot|undefined{
      if(!validMatrix(matrix)||!validViewport(viewport)||typeof cameraKey!=='string'||!cameraKey||typeof mercator!=='boolean'){
        snapshot=undefined;return;
      }
      if(snapshot&&snapshot.cameraKey===cameraKey&&snapshot.mercator===mercator&&
          viewportFields.every(key=>snapshot!.viewport[key]===viewport[key])){
        let same=true;for(let i=0;i<16;i++)if(snapshot.mainMatrix[i]!==matrix[i]){same=false;break;}
        if(same)return snapshot;
      }
      const buildingFocus=focus.measure({width:viewport.cssWidth,height:viewport.cssHeight});
      snapshot=Object.freeze({revision:++revision,cameraKey,mainMatrix:new Float64Array(matrix),buildingFocus,
        viewport:Object.freeze({cssWidth:viewport.cssWidth,cssHeight:viewport.cssHeight,
          drawingBufferWidth:viewport.drawingBufferWidth,drawingBufferHeight:viewport.drawingBufferHeight}),mercator});
      return snapshot;
    },
    read(cameraKey:string):ModelViewProjectionSnapshot|undefined{return snapshot?.cameraKey===cameraKey?snapshot:undefined;},
    invalidate(){snapshot=undefined;},
  };
}

/** Sea-level ground area (square metres) covered by a CSS-pixel rectangle under
 * the exact main matrix: each corner ray is intersected with the ground plane in
 * front of the camera. Rotation-invariant; it grows with pitch only as much as
 * the real footprint does. Undefined when a corner does not meet the ground in
 * front of the camera (above the horizon) or the frame is not a valid mercator
 * frame; callers then keep a conservative fallback. Terrain is not modelled. */
export function projectedGroundArea(snapshot:Pick<ModelViewProjectionSnapshot,'mainMatrix'|'viewport'|'mercator'>|undefined,rect:Readonly<{left:number;top:number;right:number;bottom:number}>):number|undefined{
  return projectedGroundFootprint(snapshot,rect)?.area;
}
/** The same ground footprint with the latitude (degrees) of its centroid. */
export function projectedGroundFootprint(snapshot:Pick<ModelViewProjectionSnapshot,'mainMatrix'|'viewport'|'mercator'>|undefined,rect:Readonly<{left:number;top:number;right:number;bottom:number}>):{area:number;latitude:number}|undefined{
  if(!snapshot?.mercator||!validMatrix(snapshot.mainMatrix)||!validViewport(snapshot.viewport)||![rect.left,rect.top,rect.right,rect.bottom].every(Number.isFinite)||rect.right<=rect.left||rect.bottom<=rect.top)return;
  const m=snapshot.mainMatrix,{cssWidth,cssHeight}=snapshot.viewport,points:[number,number][]=[];
  for(const [sx,sy] of [[rect.left,rect.top],[rect.right,rect.top],[rect.right,rect.bottom],[rect.left,rect.bottom]]){
    const nx=sx/cssWidth*2-1,ny=1-sy/cssHeight*2;
    // M*(x,y,0,1) with clip.x/clip.w=nx and clip.y/clip.w=ny: two linear equations in x,y.
    const a1=m[0]-nx*m[3],b1=m[4]-nx*m[7],c1=nx*m[15]-m[12],a2=m[1]-ny*m[3],b2=m[5]-ny*m[7],c2=ny*m[15]-m[13];
    const det=a1*b2-a2*b1;if(!Number.isFinite(det)||det===0)return;
    const x=(c1*b2-c2*b1)/det,y=(a1*c2-a2*c1)/det,w=m[3]*x+m[7]*y+m[15];
    if(![x,y,w].every(Number.isFinite)||w<=1e-12)return;
    points.push([x,y]);
  }
  // Relative to the first corner: absolute mercator coordinates (about 0.5)
  // would cancel away the area's precision at high zoom.
  const [ox,oy]=points[0];let twice=0;for(let i=0;i<4;i++){const x0=points[i][0]-ox,y0=points[i][1]-oy,x1=points[(i+1)%4][0]-ox,y1=points[(i+1)%4][1]-oy;twice+=x0*y1-x1*y0;}
  const cy=(points[0][1]+points[1][1]+points[2][1]+points[3][1])/4,latitude=Math.atan(Math.sinh(Math.PI*(1-2*cy)));
  const metres=2*Math.PI*6378137*Math.cos(latitude),area=Math.abs(twice)/2*metres*metres;
  return Number.isFinite(area)&&area>0&&Number.isFinite(latitude)?{area,latitude:latitude*180/Math.PI}:undefined;
}

export type NativeModelProjection = {
  cssExtentPx:number|null;
  drawingBufferExtentPx:number|null;
  /** Unclipped CSS bounds of the full height sweep, for pre-load admission. */
  cssBounds?:Readonly<{left:number;top:number;right:number;bottom:number}>;
  mainClip:'outside'|'inside-or-intersecting'|'unknown';
  reason:'projected'|'missing-snapshot'|'unsupported-projection'|'invalid'|'near-plane';
};
const unknown=(reason:NativeModelProjection['reason']):NativeModelProjection=>
  ({cssExtentPx:null,drawingBufferExtentPx:null,mainClip:'unknown',reason});

/** The same native metre-to-world transform used by viewport admission. Detail
 * selection may supply a real main, shadow or reflection projection frame. */
export function modelProjectionAtOrigin(
 frame:Pick<ModelViewProjectionSnapshot,'mainMatrix'|'viewport'|'mercator'>|undefined,
 origin:readonly [number,number],
):{matrix:Float64Array;viewport:Readonly<ProjectedDetailViewport>}|undefined{
 if(!frame?.mercator||!validMatrix(frame.mainMatrix)||!validViewport(frame.viewport)||origin.length!==2||!origin.every(Number.isFinite)||Math.abs(origin[0])>180||Math.abs(origin[1])>=90)return;
 const matrix=nativeModelMatrix(frame.mainMatrix,origin);
 return matrix?{matrix,viewport:frame.viewport}:undefined;
}

function nativeModelMatrix(main:ArrayLike<number>,origin:readonly [number,number]):Float64Array|undefined{
 const latitude=origin[1]*Math.PI/180,unit=2*Math.PI*6378137*Math.cos(latitude);
 const ox=(origin[0]+180)/360,oy=(1-Math.log(Math.tan(Math.PI/4+latitude/2))/Math.PI)/2;
 if(!Number.isFinite(unit)||unit<=0||!Number.isFinite(oy))return;
 const matrix=new Float64Array(16);
 for(let row=0;row<4;row++){
  matrix[row]=main[row]/unit;
  matrix[4+row]=main[8+row]/unit;
  matrix[8+row]=-main[4+row]/unit;
  matrix[12+row]=main[row]*ox+main[4+row]*oy+main[12+row];
 }
 return matrix;
}

/** Projects a native metre box (east, up, north) at its original component
 * origin. This is the same transform as renderer anchor packing, before any
 * owner reconstruction. An unverified bound on derived geometry stays unknown
 * at the caller. This function neither chooses geometry LOD nor removes rows;
 * selected, landmark, validation-cohort and capture demand remain caller-owned. */
export function projectNativeModelBox(snapshot:ModelViewProjectionSnapshot|undefined,origin:readonly [number,number],localBox:ArrayLike<number>):NativeModelProjection{
  if(!snapshot)return unknown('missing-snapshot');
  if(!snapshot.mercator)return unknown('unsupported-projection');
  if(origin.length!==2||!origin.every(Number.isFinite)||Math.abs(origin[0])>180||Math.abs(origin[1])>=90||!validMatrix(snapshot.mainMatrix))return unknown('invalid');
  const matrix=nativeModelMatrix(snapshot.mainMatrix,origin);
  if(!matrix)return unknown('invalid');
  // world = (ox + x/unit, oy - z/unit, y/unit), then the exact main matrix.
  const size=classifyProjectedDetail(localBox,matrix,snapshot.viewport);
  // Its 32/48px quality recommendation is deliberately not a geometry policy.
  if(size.cssExtentPx===null)return unknown(size.reason==='near-plane'?'near-plane':'invalid');
  let common=63,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(let corner=0;corner<8;corner++){
    const x=localBox[corner&1?3:0],y=corner&2?Math.max(0,localBox[4]):Math.min(0,localBox[1]),z=localBox[corner&4?5:2];
    const a=matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],b=matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13];
    const c=matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14],w=matrix[3]*x+matrix[7]*y+matrix[11]*z+matrix[15];
    const epsilon=1e-5*Math.max(1,Math.abs(a),Math.abs(b),Math.abs(c),Math.abs(w));let outside=0;
    if(a< -w-epsilon)outside|=1;if(a>w+epsilon)outside|=2;
    if(b< -w-epsilon)outside|=4;if(b>w+epsilon)outside|=8;
    if(c< -w-epsilon)outside|=16;if(c>w+epsilon)outside|=32;
    common&=outside;
    const screenX=(a/w+1)*snapshot.viewport.cssWidth/2,screenY=(1-b/w)*snapshot.viewport.cssHeight/2;
    minX=Math.min(minX,screenX);maxX=Math.max(maxX,screenX);
    minY=Math.min(minY,screenY);maxY=Math.max(maxY,screenY);
  }
  if(![minX,minY,maxX,maxY].every(Number.isFinite))return unknown('invalid');
  return{cssExtentPx:size.cssExtentPx,drawingBufferExtentPx:size.drawingBufferExtentPx,
    cssBounds:Object.freeze({left:minX,top:minY,right:maxX,bottom:maxY}),
    mainClip:common?'outside':'inside-or-intersecting',reason:'projected'};
}
