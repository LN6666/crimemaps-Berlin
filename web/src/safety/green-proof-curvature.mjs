/** PRIVATE proof candidate: unchanged F32 projected triangle, exact-Q192 hull.
 * Original box predicate/geometry remain unchanged; no production adoption. */
import {Q,fromDouble,add,sub,scaleInt,mul,div,expPositive,atanSmall,piInterval,fixedToDoubleDown,fixedToDoubleUp} from './green-proof-geographic-interval.mjs';
export const LIMITS=Object.freeze({visits:4095,depth:18,coverageQueries:4095,seriesIterations:1441664,boundaryVertices:200000,reservationBytes:262144});
const orient=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function convexHull(points){const p=[...points].sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:a[1]<b[1]?-1:a[1]>b[1]?1:0),unique=p.filter((x,i)=>!i||x[0]!==p[i-1][0]||x[1]!==p[i-1][1]);if(unique.length<3)return [];const build=xs=>{const h=[];for(const x of xs){while(h.length>1&&orient(h.at(-2),h.at(-1),x)<=0n)h.pop();h.push(x);}return h;};const a=build(unique),b=build([...unique].reverse());return a.slice(0,-1).concat(b.slice(0,-1));}
const onSegment=(a,b,p)=>orient(a,b,p)===0n&&p[0]>=(a[0]<b[0]?a[0]:b[0])&&p[0]<=(a[0]>b[0]?a[0]:b[0])&&p[1]>=(a[1]<b[1]?a[1]:b[1])&&p[1]<=(a[1]>b[1]?a[1]:b[1]);
function segmentsMeet(a,b,c,d){const x=orient(a,b,c),y=orient(a,b,d),z=orient(c,d,a),w=orient(c,d,b);return(x===0n&&onSegment(a,b,c))||(y===0n&&onSegment(a,b,d))||(z===0n&&onSegment(c,d,a))||(w===0n&&onSegment(c,d,b))||x!==0n&&y!==0n&&z!==0n&&w!==0n&&(x>0n)!==(y>0n)&&(z>0n)!==(w>0n);}
const insideConvex=(p,h)=>h.every((a,i)=>orient(a,h[(i+1)%h.length],p)>=0n);
const exact=x=>{const a=fromDouble(x);if(a[0]!==a[1])throw Error('Boundary coordinate is not exact Q192');return a[0];};
const ceilDiv=(n,d)=>-((-n)/d)+(n%d>0n?1n:0n); // used only for nonnegative n and positive d
function edgeFor(v){const sq=(a,b)=>{const x=a.x-b.x,y=a.y-b.y;return x*x+y*y;},ab=sq(v[0],v[1]),bc=sq(v[1],v[2]),ca=sq(v[2],v[0]);return ab>=bc&&ab>=ca?0:bc>=ca?1:2;}
export function createCurvatureProof({boundaryEdges,boundary,constants,budget}){
 if(typeof boundaryEdges!=='function'||!Number.isInteger(boundary.vertices)||boundary.vertices>LIMITS.boundaryVertices)throw Error('Internal boundary index binding required');
 const {origin,scale,baseY,RAD,PI_DOUBLE}=constants;if(!origin||origin.length!==2||![...origin,scale,baseY,RAD,PI_DOUBLE].every(Number.isFinite)||Math.abs(origin[0])>180||Math.abs(origin[1])>85||scale<1||scale>1e8||baseY<.7||baseY>2||RAD!==Math.PI/180||PI_DOUBLE!==Math.PI)throw Error('Frozen projection domain');
 return function prove(points){
  if(!Array.isArray(points)||points.length!==6||!points.every(v=>Number.isFinite(v)&&Math.fround(v)===v))return{accepted:false,reason:'not-exact-source-float32',visits:0};
  const claim=budget.reserve({category:'construction',bytes:LIMITS.reservationBytes,precision:'estimate',identity:{},label:'ground proof Q192 construction scratch estimate'},{label:'ground proof Q192 construction scratch estimate',evict:false});
  let visits=0,coverageQueries=0,seriesIterations=224,maxDepth=0,edgeCandidates=0,reason='covered-curvature-hull';
  try{
   const lon=fromDouble(origin[0]),s=fromDouble(scale),rad=fromDouble(RAD),base=fromDouble(baseY),half=fromDouble(PI_DOUBLE).map(x=>x/2n),pi=piInterval(),one=[Q,Q];
   function vertex(x,y){if(coverageQueries>=LIMITS.coverageQueries||seriesIterations+176>LIMITS.seriesIterations){reason='work-exhaustion';return null;}coverageQueries++;seriesIterations+=176;const yy=add(base,div([y,y],s));if(yy[0]<7n*Q/10n||yy[1]>2n*Q){reason='inverse-domain-refusal';return null;}const xx=add(lon,div(div([x,x],s),rad)),lat=div(sub(sub(pi,scaleInt(atanSmall(div(one,expPositive(yy))),2n)),half),rad),geo=[xx[0],lat[0],xx[1],lat[1]],box=[fixedToDoubleDown(geo[0]),fixedToDoubleDown(geo[1]),fixedToDoubleUp(geo[2]),fixedToDoubleUp(geo[3])];return{x,y,geo,inside:boundary.covers(box)};}
   function hullCovered(v){
    // |d² latitude / dy²| <= 1/(scale² RAD). Jensen remainder <= M range²/8.
    // y>=0.7 implies concavity, but symmetric +/- remainder is used conservatively.
    const ys=v.map(p=>p.y),lo=ys.reduce((a,b)=>a<b?a:b),hi=ys.reduce((a,b)=>a>b?a:b),range=hi-lo;
    const inv=div(one,mul(mul(s,s),rad)),gap=ceilDiv(range*range*inv[1],8n*Q*Q); // Q192 output
    const pts=[];for(const {geo:g} of v)pts.push([g[0],g[1]-gap],[g[2],g[1]-gap],[g[2],g[3]+gap],[g[0],g[3]+gap]);const h=convexHull(pts);if(h.length<3){reason='degenerate-hull';return false;}
    const xs=h.map(p=>p[0]),yy=h.map(p=>p[1]),bbox=[fixedToDoubleDown(xs.reduce((a,b)=>a<b?a:b)),fixedToDoubleDown(yy.reduce((a,b)=>a<b?a:b)),fixedToDoubleUp(xs.reduce((a,b)=>a>b?a:b)),fixedToDoubleUp(yy.reduce((a,b)=>a>b?a:b))];
    const disjoint=boundaryEdges(bbox,(ax,ay,bx,by)=>{
     edgeCandidates++;const aa=[exact(ax),exact(ay)],bb=[exact(bx),exact(by)];return !(insideConvex(aa,h)||insideConvex(bb,h)||h.some((c,j)=>segmentsMeet(aa,bb,c,h[(j+1)%h.length])));
    });if(!disjoint)return false;
    // Connected enclosing hull contains a certified strict-inside vertex box.
    // No original outer/hole boundary touches or crosses it: entire hull inside.
    return true;
   }
   function visit(v,depth){if(++visits>LIMITS.visits){visits--;reason='work-exhaustion';return false;}maxDepth=Math.max(maxDepth,LIMITS.depth-depth);if(v.some(p=>!p.inside)){reason='vertex-box-not-strictly-inside';return false;}if(hullCovered(v))return true;if(depth===0){reason='depth-refusal/uncertain-boundary';return false;}const edge=edgeFor(v),[a,b,c]=v,u=edge===0?a:edge===1?b:c,w=edge===0?b:edge===1?c:a;if((u.x+w.x)%2n||(u.y+w.y)%2n){reason='nonexact-Q192-midpoint';return false;}const m=vertex((u.x+w.x)/2n,(u.y+w.y)/2n);if(!m)return false;const children=edge===0?[[a,m,c],[m,b,c]]:edge===1?[[a,b,m],[a,m,c]]:[[a,b,m],[m,b,c]];return visit(children[0],depth-1)&&visit(children[1],depth-1);}
   const root=[0,2,4].map(i=>vertex(exact(points[i]),exact(points[i+1])));const accepted=root.every(Boolean)&&visit(root,LIMITS.depth);return{accepted,reason,visits,maxDepth,coverageQueries,seriesIterations,edgeCandidates,sourceCoordinatesUnchanged:true,sourceGeometryChanged:false,ROOTAdoptionAuthorized:false};
  }finally{claim.release();}
 };
}
