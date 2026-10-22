/** Real official roof slopes receive seams only; no virtual ridge/hip or hall silhouettes are drawn. */
export const F045_EXCHANGE_ROOF_GLSL=`
vec3 ownerF045ExchangeWall(vec3 base,vec3 p,vec3 normal,vec4 q,float family){return fpLayoutFacade(base,p,normal,q,family<6471.5?109.:108.);}
vec3 ownerF045ExchangeRoof(vec3 base,vec4 q){
 vec2 uv=q.xy;float lateral=abs(mod(uv.x+.36,.72)-.36),crossJoint=abs(mod(uv.y+1.6,3.2)-1.6);
 float seam=1.-smoothstep(.009,.026,lateral),lip=1.-smoothstep(.008,.023,abs(lateral-.033));
 float joint=1.-smoothstep(.007,.018,crossJoint);vec3 c=base;
 if(q.z<1.5){c*=1.-.13*seam-.035*joint;c=mix(c,min(vec3(1.),base*1.14),.36*lip);}
 else{float broad=1.-smoothstep(.009,.022,abs(mod(uv.x+.7,1.4)-.7));c*=1.-.055*broad;}
 return c;
}
`;
