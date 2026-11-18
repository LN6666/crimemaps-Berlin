/** PRIVATE certified inverse of the existing exact-double projection constants.
 * No Math transcendental function is used in this module. */
import {nextDown,nextUp} from './green-proof-float64-outward.mjs';
export const GEO_ARITHMETIC_LIMITS=Object.freeze({fractionBits:192,expTerms:64,atanTerms:112,latitudeRangeReduction:'0.7 <= baseY + localY/scale <= 2; exp(-Y)<=0.5; otherwise refuse',seriesIterationsPerGeographicBoxMax:352,piSetupSeriesIterations:224});
export const Q=1n<<192n;
const known=new WeakSet(),view=new DataView(new ArrayBuffer(8));
export function floorDiv(n,d){if(d<=0n)throw Error('Positive divisor required');const q=n/d,r=n%d;return r<0n?q-1n:q;}
export const ceilDiv=(n,d)=>-floorDiv(-n,d);
export function exactDouble(value){if(!Number.isFinite(value))throw Error('Finite Number required');view.setFloat64(0,value,false);const b=view.getBigUint64(0,false),sign=b>>63n?-1n:1n,e=Number(b>>52n&2047n),fraction=b&((1n<<52n)-1n);return{n:sign*(e?fraction+(1n<<52n):fraction),e:e?e-1023-52:-1074};}
export function fromDouble(value){const {n,e}=exactDouble(value),shift=e+192;return shift>=0?[n<<BigInt(shift),n<<BigInt(shift)]:[floorDiv(n,1n<<BigInt(-shift)),ceilDiv(n,1n<<BigInt(-shift))];}
export const rational=(n,d)=>[floorDiv(n*Q,d),ceilDiv(n*Q,d)];
export const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
export const sub=(a,b)=>[a[0]-b[1],a[1]-b[0]];
export const scaleInt=(a,n)=>n>=0n?[a[0]*n,a[1]*n]:[a[1]*n,a[0]*n];
export function mul(a,b){const values=[a[0]*b[0],a[0]*b[1],a[1]*b[0],a[1]*b[1]],lo=values.reduce((x,y)=>x<y?x:y),hi=values.reduce((x,y)=>x>y?x:y);return[floorDiv(lo,Q),ceilDiv(hi,Q)];}
export function div(a,b){if(b[0]<=0n)throw Error('Positive interval denominator required');const pairs=[[a[0],b[0]],[a[0],b[1]],[a[1],b[0]],[a[1],b[1]]],lo=pairs.map(([n,d])=>floorDiv(n*Q,d)).reduce((x,y)=>x<y?x:y),hi=pairs.map(([n,d])=>ceilDiv(n*Q,d)).reduce((x,y)=>x>y?x:y);return[lo,hi];}
const divInt=(a,n)=>[floorDiv(a[0],n),ceilDiv(a[1],n)];
/** For 0<=x<=2, the positive Taylor remainder after term N is at most
 * term_N * x/(N+1-x), because all following ratios <=x/(N+1)<1. */
export function expPositive(x){if(x[0]<0n||x[1]>2n*Q)throw Error('exp domain');let term=[Q,Q],sum=[Q,Q];for(let n=1;n<=64;n++){term=divInt(mul(term,x),BigInt(n));sum=add(sum,term);}const tail=ceilDiv(term[1]*x[1],65n*Q-x[1]);return[sum[0],sum[1]+tail];}
/** For 0<=z<=1/2, alternating terms decrease. The uncomputed next term
 * bounds the absolute remainder. Interval arithmetic encloses each finite
 * term independently; no cancellation or correctly-rounded libm is assumed. */
export function atanSmall(z){if(z[0]<0n||z[1]>Q/2n)throw Error('atan domain');const z2=mul(z,z);let power=z,sum=[0n,0n];for(let k=0;k<112;k++){const term=divInt(power,BigInt(2*k+1));sum=k%2?sub(sum,term):add(sum,term);power=mul(power,z2);}const tail=ceilDiv(power[1],225n);return[sum[0]-tail,sum[1]+tail];}
/** Machin identity: pi=16 atan(1/5)-4 atan(1/239), with each atan tail bounded. */
export function piInterval(){return Object.freeze(sub(scaleInt(atanSmall(rational(1n,5n)),16n),scaleInt(atanSmall(rational(1n,239n)),4n)));}
function compareDoubleToFixed(value,n){const a=exactDouble(value),shift=a.e+192;const difference=shift>=0?(a.n<<BigInt(shift))-n:a.n-(n<<BigInt(-shift));return difference<0n?-1:difference>0n?1:0;}
export function fixedToDoubleDown(n){let value=Number(n)/2**192;if(!Number.isFinite(value))throw Error('Fixed conversion overflow');if(compareDoubleToFixed(value,n)>0)value=nextDown(value);if(compareDoubleToFixed(value,n)>0)throw Error('Downward conversion enclosure failed');return value;}
export function fixedToDoubleUp(n){let value=Number(n)/2**192;if(!Number.isFinite(value))throw Error('Fixed conversion overflow');if(compareDoubleToFixed(value,n)<0)value=nextUp(value);if(compareDoubleToFixed(value,n)<0)throw Error('Upward conversion enclosure failed');return value;}
/** Exact REAL expression being enclosed is the original inverse, with every
 * precomputed Number constant treated as an exact dyadic input:
 * lon=originLon+localX/scale/RAD;
 * lat=(2 atan(exp(baseY+localY/scale))-PI_DOUBLE/2)/RAD.
 * To avoid exp(Y)>1 in atan, use 2atan(exp Y)=pi_true-2atan(exp(-Y)).
 * Keeping PI_DOUBLE distinct from pi_true preserves the original constant;
 * silently replacing its half with true pi/2 would change the semantics. */
export function createCertifiedGeographicBox({origin,scale,baseY,RAD,PI_DOUBLE}){
 if(!origin||origin.length!==2||![...origin,scale,baseY,RAD,PI_DOUBLE].every(Number.isFinite)||Math.abs(origin[0])>180||Math.abs(origin[1])>85||scale<1||scale>1e8||baseY<.7||baseY>2||RAD!==Math.PI/180||PI_DOUBLE!==Math.PI)throw Error('Outside certified frozen projection-constant domain');
 const lon=fromDouble(origin[0]),s=fromDouble(scale),rad=fromDouble(RAD),base=fromDouble(baseY),piHalf=divInt(fromDouble(PI_DOUBLE),2n),one=[Q,Q],fullPi=piInterval();
 const latitude=localY=>{const y=add(base,div(fromDouble(localY),s));if(y[0]<7n*Q/10n||y[1]>2n*Q)throw Error('Latitude reduction outside certified domain');const z=div(one,expPositive(y));if(z[1]>Q/2n)throw Error('atan reduction outside certified domain');return div(sub(sub(fullPi,scaleInt(atanSmall(z),2n)),piHalf),rad);};
 const geographicBox=box=>{if(!box||box.length!==4||!box.every(Number.isFinite)||box[0]>box[2]||box[1]>box[3])return undefined;try{const x0=add(lon,div(div(fromDouble(box[0]),s),rad)),x1=add(lon,div(div(fromDouble(box[2]),s),rad)),y0=latitude(box[1]),y1=latitude(box[3]);return[fixedToDoubleDown(x0[0]),fixedToDoubleDown(y0[0]),fixedToDoubleUp(x1[1]),fixedToDoubleUp(y1[1])];}catch{return undefined;}};
 known.add(geographicBox);return geographicBox;
}
export const hasCertifiedGeographicBox=fn=>known.has(fn);
