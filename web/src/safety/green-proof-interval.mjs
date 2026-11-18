/** PRIVATE CANDIDATE ONLY. ROOT review/adoption remains separate. */
import {hasCertifiedGeographicBox} from './green-proof-geographic-interval.mjs';
export const DEEP_LIMITS=Object.freeze({baselineVisits:511,baselineDepth:12,extraVisits:4095,extraDepth:18,maxTotalCovers:4606,maxLiveSubdivisionLevels:19,paddingEPSILONMultiplier:32,maxExtraSeriesIterations:1441664});
import {nextDown,nextUp} from './green-proof-float64-outward.mjs';
export {nextDown,nextUp} from './green-proof-float64-outward.mjs';
function interval(lo,hi){return Number.isFinite(lo)&&Number.isFinite(hi)&&lo<=hi?[lo,hi]:undefined;}
/** RN addition and halving, each separately rounded outwards. This encloses the
 * exact real average of any values in the input intervals, including subnormals.
 * An overflow/NaN has no certificate and refuses rather than narrowing. */
export function midpointInterval(a,b){const loSum=nextDown(a[0]+b[0]),hiSum=nextUp(a[1]+b[1]);if(!Number.isFinite(loSum)||!Number.isFinite(hiSum))return undefined;return interval(nextDown(loSum/2),nextUp(hiSum/2));}
function midpointPoint(a,b){const x=midpointInterval(a.x,b.x),y=midpointInterval(a.y,b.y);return x&&y?{x,y}:undefined;}
/** The mathematical children share the SAME exact average. Stored intervals
 * are enclosures of that one abstract vertex; they are not rendered vertices. */
export function bisectTriangle(triangle,edge){const [a,b,c]=triangle;if(edge===0){const m=midpointPoint(a,b);return m?[[a,m,c],[m,b,c]]:undefined;}if(edge===1){const m=midpointPoint(b,c);return m?[[a,b,m],[a,m,c]]:undefined;}const m=midpointPoint(c,a);return m?[[a,b,m],[m,b,c]]:undefined;}
export function paddedProjectedBox(triangle){
 const coords=triangle.flatMap(p=>[...p.x,...p.y]);if(!coords.every(Number.isFinite))return undefined;
 const pad=32*Number.EPSILON*Math.max(1,...coords.map(Math.abs));
 const box=[nextDown(Math.min(...triangle.map(p=>p.x[0]))-pad),nextDown(Math.min(...triangle.map(p=>p.y[0]))-pad),nextUp(Math.max(...triangle.map(p=>p.x[1]))+pad),nextUp(Math.max(...triangle.map(p=>p.y[1]))+pad)];
 return box.every(Number.isFinite)?box:undefined;
}
const center=p=>[p.x[0]/2+p.x[1]/2,p.y[0]/2+p.y[1]/2];
function edgeFor(triangle){const [a,b,c]=triangle.map(center),ab=(a[0]-b[0])**2+(a[1]-b[1])**2,bc=(b[0]-c[0])**2+(b[1]-c[1])**2,ca=(c[0]-a[0])**2+(c[1]-a[1])**2;return ab>=bc&&ab>=ca?0:bc>=ca?1:2;}
/** Arbitrary callbacks remain diagnostic-only. The private certified factory
 * supplies a proved inverse-Mercator enclosure; only that branded callback can
 * establish a new geographic certificate for ROOT review. */
export function analyzeIntervalSubdivision(boundary,geographicBox,points){
 const started=performance.now();
 if(!Array.isArray(points)||points.length!==6||!points.every(v=>Number.isFinite(v)&&Math.fround(v)===v))return{allBoxesCovered:false,visits:0,reason:'not-exact-source-float32'};
 const root=[0,2,4].map(i=>({x:[points[i],points[i]],y:[points[i+1],points[i+1]]}));let remaining=4095,visits=0,maxDepth=0,reason=hasCertifiedGeographicBox(geographicBox)?'covered-certified-geographic-enclosure':'covered-numeric-callback-only';
 function visit(triangle,depth){maxDepth=Math.max(maxDepth,18-depth);if(--remaining<0){reason='work-exhaustion';return false;}const box=paddedProjectedBox(triangle);if(!box){reason='interval-overflow';return false;}visits++;const geo=geographicBox(box);if(!geo||geo.length!==4||!geo.every(Number.isFinite)){reason='invalid-geographic-callback';return false;}if(boundary.covers(geo))return true;if(depth===0){reason='depth-refusal/uncertain-boundary';return false;}const children=bisectTriangle(triangle,edgeFor(triangle));if(!children){reason='interval-overflow';return false;}return visit(children[0],depth-1)&&visit(children[1],depth-1);}
 const allBoxesCovered=visit(root,18);return{allBoxesCovered,visits,maxDepth,reason,projectedIntervalEnclosure:true,geographicProjectionCertified:hasCertifiedGeographicBox(geographicBox),ROOTAdoptionAuthorized:false,elapsedMs:performance.now()-started};
}
/** Original511/depth12 PASS is retained exactly with its original callback.
 * New acceptance requires the private certified-geography factory, not a caller
 * boolean assertion. Even a completed private proof is not ROOT adoption. */
export function analyzePrivateFallback({baselineProof,boundary,geographicBox,certifiedGeographicBox,points}){
 let baselineVisits=0;const observed={...boundary,covers:box=>{baselineVisits++;if(baselineVisits>511)throw Error('Baseline proof exceeded frozen budget');return boundary.covers(box);}};
 const accepted=baselineProof(observed,geographicBox,...points);if(accepted)return{accepted:true,branch:'unchanged-baseline',baselineVisits,totalCovers:baselineVisits,extraVisits:0};
 const deep=analyzeIntervalSubdivision(boundary,certifiedGeographicBox??geographicBox,points),candidateProven=deep.allBoxesCovered&&deep.geographicProjectionCertified;
 return{accepted:candidateProven,branch:'private-deep-proof-candidate',baselineVisits,extraVisits:deep.visits,totalCovers:baselineVisits+deep.visits,deep,ROOTAdoptionAuthorized:false,reason:deep.allBoxesCovered&&!deep.geographicProjectionCertified?'geographic-projection-contract-unproven':deep.reason};
}
