export const OWNER_F196_PAINT_GLSL=`
// Candidate bounded facade field; frame=(source-tangent metres,height,width,face).
// NW grid confirmed by architect rear photo; SW repeats the opposite NE frame system as an explicit symmetry inference.
float kms142Stroke(float d,float w){return 1.-smoothstep(w,w+max(fwidth(d),.006),abs(d));}
float kms142Repeat(float x,float pitch,float w){return kms142Stroke(mod(x+pitch*.5,pitch)-pitch*.5,w);}
float kms145Glyph(float code,vec2 q){
 if(q.x<0.||q.x>=5.||q.y<0.||q.y>=7.)return 0.;float row=floor(q.y),bits=0.;
 if(abs(code-75.)<.25){if(abs(row-0.)<.25)bits=17.;if(abs(row-1.)<.25)bits=18.;if(abs(row-2.)<.25)bits=20.;if(abs(row-3.)<.25)bits=24.;if(abs(row-4.)<.25)bits=20.;if(abs(row-5.)<.25)bits=18.;if(abs(row-6.)<.25)bits=17.;}
 if(abs(code-117.)<.25){if(abs(row-0.)<.25)bits=0.;if(abs(row-1.)<.25)bits=0.;if(abs(row-2.)<.25)bits=17.;if(abs(row-3.)<.25)bits=17.;if(abs(row-4.)<.25)bits=17.;if(abs(row-5.)<.25)bits=19.;if(abs(row-6.)<.25)bits=13.;}
 if(abs(code-110.)<.25){if(abs(row-0.)<.25)bits=0.;if(abs(row-1.)<.25)bits=0.;if(abs(row-2.)<.25)bits=30.;if(abs(row-3.)<.25)bits=17.;if(abs(row-4.)<.25)bits=17.;if(abs(row-5.)<.25)bits=17.;if(abs(row-6.)<.25)bits=17.;}
 if(abs(code-115.)<.25){if(abs(row-0.)<.25)bits=0.;if(abs(row-1.)<.25)bits=0.;if(abs(row-2.)<.25)bits=15.;if(abs(row-3.)<.25)bits=16.;if(abs(row-4.)<.25)bits=14.;if(abs(row-5.)<.25)bits=1.;if(abs(row-6.)<.25)bits=30.;}
 if(abs(code-116.)<.25){if(abs(row-0.)<.25)bits=8.;if(abs(row-1.)<.25)bits=8.;if(abs(row-2.)<.25)bits=30.;if(abs(row-3.)<.25)bits=8.;if(abs(row-4.)<.25)bits=8.;if(abs(row-5.)<.25)bits=9.;if(abs(row-6.)<.25)bits=6.;}
 if(abs(code-109.)<.25){if(abs(row-0.)<.25)bits=0.;if(abs(row-1.)<.25)bits=0.;if(abs(row-2.)<.25)bits=26.;if(abs(row-3.)<.25)bits=21.;if(abs(row-4.)<.25)bits=21.;if(abs(row-5.)<.25)bits=21.;if(abs(row-6.)<.25)bits=21.;}
 if(abs(code-101.)<.25){if(abs(row-0.)<.25)bits=0.;if(abs(row-1.)<.25)bits=0.;if(abs(row-2.)<.25)bits=14.;if(abs(row-3.)<.25)bits=17.;if(abs(row-4.)<.25)bits=31.;if(abs(row-5.)<.25)bits=16.;if(abs(row-6.)<.25)bits=14.;}
 float ink=mod(floor(bits/exp2(4.-floor(q.x))),2.);vec2 f=fract(q);return ink*step(.07,f.x)*step(.07,f.y);
}
float kms145Sign(vec4 frame){
 if(abs(frame.w-1.)>.25)return 0.;vec2 q=vec2((20.-frame.x)/.20,(22.-frame.y)/.20);float ink=0.;
 ink=max(ink,kms145Glyph(75.,q-vec2(0.,0.)));
 ink=max(ink,kms145Glyph(117.,q-vec2(6.,0.)));
 ink=max(ink,kms145Glyph(110.,q-vec2(12.,0.)));
 ink=max(ink,kms145Glyph(115.,q-vec2(18.,0.)));
 ink=max(ink,kms145Glyph(116.,q-vec2(24.,0.)));
 ink=max(ink,kms145Glyph(109.,q-vec2(30.,0.)));
 ink=max(ink,kms145Glyph(117.,q-vec2(36.,0.)));
 ink=max(ink,kms145Glyph(115.,q-vec2(42.,0.)));
 ink=max(ink,kms145Glyph(101.,q-vec2(48.,0.)));
 ink=max(ink,kms145Glyph(117.,q-vec2(54.,0.)));
 ink=max(ink,kms145Glyph(109.,q-vec2(60.,0.)));
return ink;
}
vec3 kunstmuseum142(vec4 frame){
 float u=frame.x,y=frame.y,W=frame.z,face=frame.w;
 vec3 c=mix(vec3(.25,.41,.46),vec3(.52,.67,.69),smoothstep(0.,26.,y));
 // Exact entrance-level part, independently registered to common cube coordinates.
 if(face>9.5){
  vec3 stone=vec3(.69,.64,.51);if(abs(face-11.)>.25&&abs(face-12.)>.25)return stone;
  float aperture=smoothstep(.12,.25,y)*(1.-smoothstep(5.45,5.72,y))*smoothstep(1.0,1.2,u)*(1.-smoothstep(W-1.2,W-1.0,u));
  vec3 hall=mix(vec3(.16,.28,.29),vec3(.36,.48,.46),smoothstep(0.,6.,y));
  float posts=0.;
  if(abs(face-12.)<.25){
   posts=max(kms142Stroke(u-W*.12,.30),max(kms142Stroke(u-W*.48,.30),kms142Stroke(u-W*.83,.30)));
   float doors=max(kms142Stroke(u-W*.48+1.1,.035),kms142Stroke(u-W*.48-1.1,.035));hall=mix(hall,vec3(.12,.16,.16),doors*.8);
  }else posts=kms142Stroke(u-(W-1.1),.30);
  return mix(stone,hall,aperture*(1.-posts));
 }
 bool bounded=face>=0.&&face<=3.;
 if(!bounded)return c;
 // The inner stone cube is visible through clear glazing; no photographed reflections are baked.
 float stone=(1.-smoothstep(19.8,20.3,y))*smoothstep(3.5,4.2,y)*smoothstep(.7,1.1,u)*(1.-smoothstep(W-1.1,W-.7,u));
 c=mix(c,vec3(.69,.64,.51),stone*.66);
 float frit=kms142Repeat(y,.24,.014)*smoothstep(4.,5.,y)*(1.-smoothstep(20.,21.,y));
 c=mix(c,vec3(.70,.77,.76),frit*.58);
 float mullion=max(kms142Repeat(u,W/7.,.023),kms142Repeat(y-3.6,(26.-3.6)/8.,.022));
 c=mix(c,vec3(.20,.27,.28),mullion*.82);
 c=mix(c,vec3(.11,.17,.18),kms142Stroke(y-3.6,.12)*.8);
 c=mix(c,vec3(.085,.085,.075),kms145Sign(frame)*.96);
 return c;
}

`;
