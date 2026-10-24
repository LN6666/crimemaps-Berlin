export const infillFrankfurtJunghof088OwnerPaintGLSL=/*glsl*/`
float fraJ088Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtJunghof088Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family<34347.5||family>34351.5)return base;
 p.xz=frame.xz;
 if(normal.y<-.5)return base;
 if(normal.y>.5){
  float edge=max(0.,frame.w-2.),aa=max(fwidth(edge),.025),coping=1.-smoothstep(.12-aa,.36+aa,edge);
  if(base.b>base.r*1.10&&base.r<.39){float cell=1.-(1.-fraJ088Line(p.x*.84+p.z*.54,1.4,.025))*(1.-fraJ088Line(p.x*.54-p.z*.84,2.1,.025));return mix(mix(base,base*1.16,cell*.55),vec3(.73,.74,.69),coping*.8);}
  bool planted=(base.g>base.b*1.12&&base.b<.48&&base.r<.67);
  float joint=planted?0.:fraJ088Line(p.x*.86+p.z*.51,2.8,.018);
  return mix(mix(base,base*.88,joint*.50),vec3(.77,.78,.72),coping*.78);
 }
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001)));
 float pier=fraJ088Line(u,2.05,frame.w>.5?.07:.26),floorBand=fraJ088Line(p.y-1.05,3.40,frame.w>.5?.10:.21);
 vec3 glass=vec3(.27,.36,.39);
 float opaque=1.-(1.-pier)*(1.-floorBand);
 vec3 col=mix(glass,base,opaque);
 // Nested inner frame/reveal sits inside the existing representative window opening.
 float reveal=fraJ088Line(u+.055,2.05,frame.w>.5?.025:.305)*(1.-pier);
 float innerPost=fraJ088Line(u+1.025,2.05,.025)*(1.-pier);
 float transom=fraJ088Line(p.y-.50,3.40,.025)*(1.-opaque);
 col=mix(col,glass*.72,reveal*.45*(1.-opaque));
 col=mix(col,vec3(.57,.63,.62),max(innerPost,transom)*.58);
 // Sill undershadow is bounded to the opening, not a solid black stripe across stone piers.
 float sill=fraJ088Line(p.y-.79,3.40,.045)*(1.-pier),sillHighlight=fraJ088Line(p.y-.84,3.40,.018)*(1.-pier);
 col=mix(col,base*.72,sill*.48);col=mix(col,base*1.05,sillHighlight*.52);
 float course=fraJ088Line(p.y,.68,.008),stoneJoint=fraJ088Line(u+floor(p.y/.68)*.71,1.42,.008);
 col=mix(col,base*.89,max(course,stoneJoint)*opaque*.30);
 if(p.y<.28)col=base*.78;
 return col;
}
`;
