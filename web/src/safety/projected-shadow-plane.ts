// Pure arithmetic with no imports. Pure-math users (the green ground depth plane
// and the shader test graph) take it from here, so they never load the page
// resource store that projected-shadow-mask needs; that module re-exports it.

/** Homogeneous image of the actual local y=height plane. Solving M^T p=n
 * gives z_ndc=-dot(p.xyw,vec3(x_ndc,y_ndc,1))/p.z, including perspective. */
export function projectedShadowDepthPlane(matrix:ArrayLike<number>,height=.03):[number,number,number]{
 if(matrix.length!==16||!Array.from(matrix).every(Number.isFinite)||!Number.isFinite(height))throw Error('Invalid projected shadow matrix');
 const local=[0,1,0,-height],rows=Array.from({length:4},(_,r)=>[...Array.from({length:4},(_,c)=>matrix[r*4+c]),local[r]]);
 for(let c=0;c<4;c++){let pivot=c;for(let r=c+1;r<4;r++)if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c]))pivot=r;if(Math.abs(rows[pivot][c])<1e-25)throw Error('Singular projected shadow matrix');[rows[c],rows[pivot]]=[rows[pivot],rows[c]];const d=rows[c][c];for(let k=c;k<5;k++)rows[c][k]/=d;for(let r=0;r<4;r++)if(r!==c){const f=rows[r][c];for(let k=c;k<5;k++)rows[r][k]-=f*rows[c][k];}}
 const p=rows.map(row=>row[4]);if(Math.abs(p[2])<1e-14*Math.hypot(...p))throw Error('Edge-on projected shadow plane');
 const plane:[number,number,number]=[-p[0]/p[2],-p[1]/p[2],-p[3]/p[2]];if(!plane.every(Number.isFinite))throw Error('Invalid projected shadow depth');return plane;
}
