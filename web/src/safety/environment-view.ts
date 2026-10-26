export type EnvironmentView={eye:readonly[number,number,number];direction:readonly[number,number,number];perspective:boolean};
const FALLBACK:EnvironmentView={eye:[0,100000,0],direction:[0,1,0],perspective:false};
/** Recover the view from the actual local-to-clip matrix supplied to this layer.
 * No private MapLibre camera API, guessed camera location or independent camera. */
export function environmentViewFromMatrix(matrix:ArrayLike<number>):EnvironmentView {
 if(matrix.length!==16||!Array.from(matrix).every(Number.isFinite))return FALLBACK;
 const rows=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?matrix[c*4+r]:Number(c-4===r)));
 for(let c=0;c<4;c++){let pivot=c;for(let r=c+1;r<4;r++)if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c]))pivot=r;if(Math.abs(rows[pivot][c])<1e-20)return FALLBACK;[rows[c],rows[pivot]]=[rows[pivot],rows[c]];const divisor=rows[c][c];for(let k=0;k<8;k++)rows[c][k]/=divisor;for(let r=0;r<4;r++)if(r!==c){const factor=rows[r][c];for(let k=0;k<8;k++)rows[r][k]-=factor*rows[c][k];}}
 const inv=Array.from({length:16},(_,i)=>rows[i%4][4+Math.floor(i/4)]);
 const point=(z:number):[number,number,number]|undefined=>{const w=inv[11]*z+inv[15];if(Math.abs(w)<1e-15)return;const p:[number,number,number]=[(inv[8]*z+inv[12])/w,(inv[9]*z+inv[13])/w,(inv[10]*z+inv[14])/w];return p.every(Number.isFinite)?p:undefined;};
 const near=point(-1),far=point(1),eyeW=inv[11];let eye:[number,number,number]|undefined;
 if(Math.abs(eyeW)>1e-15){const value:[number,number,number]=[inv[8]/eyeW,inv[9]/eyeW,inv[10]/eyeW];if(value.every(Number.isFinite)&&Math.hypot(...value)<1e9)eye=value;}
 const delta=eye&&near?eye.map((n,i)=>n-near[i]):near&&far?near.map((n,i)=>n-far[i]):undefined;
 if(!delta||!delta.every(Number.isFinite)||Math.hypot(...delta)<1e-10)return FALLBACK;
 const length=Math.hypot(...delta),direction:[number,number,number]=[delta[0]/length,delta[1]/length,delta[2]/length];
 return{eye:eye??FALLBACK.eye,direction,perspective:!!eye};
}
/** Reuse the inverse/view result while the actual supplied camera matrix is unchanged. */
export function createEnvironmentViewCache(){const previous=new Float64Array(16);let value:EnvironmentView|undefined,updates=0;return{read(matrix:ArrayLike<number>){let same=!!value&&matrix.length===16;for(let i=0;same&&i<16;i++)same=previous[i]===matrix[i];if(same)return value!;value=environmentViewFromMatrix(matrix);if(matrix.length===16)previous.set(Array.from(matrix));updates++;return value;},get updates(){return updates;}};}
