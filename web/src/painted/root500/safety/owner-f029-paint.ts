export const F029_GLSL=`
float a029Line(float x,float period,float width){float aa=max(fwidth(x),.004);return 1.-smoothstep(width,width+aa,abs(mod(x+period*.5,period)-period*.5));}
vec3 alteNationalgalerieCompletion029(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6394.)>.25)return base;float role=frame.z-1000.;vec2 q=frame.xy;
 if(abs(role-1.)<.25&&normal.y>.2&&q.y>=14.95&&frame.w>64.9&&frame.w<79.){float seam=a029Line(q.x,1.2,.016);return mix(vec3(.706,.788,.702),vec3(.55,.66,.57),seam*.35);}
 if(abs(role-2.)<.25)return vec3(.40,.22,.19);
 if(abs(role-3.)<.25){float flute=a029Line(q.x,6.28318530718*frame.w/24.,.013);return mix(base,vec3(.59,.53,.44),flute*.40);}
 if(abs(role-4.)<.25)return base;
 if(abs(role-5.)<.25){vec3 c=vec3(.30,.31,.29);float aa=max(fwidth(q.x),.004),edge=1.-smoothstep(.055,.055+aa,min(.64-abs(q.x),frame.w-abs(q.y)));c=mix(c,vec3(.79,.71,.60),edge);float bars=max(1.-smoothstep(.025,.025+aa,abs(q.x)),a029Line(q.y,frame.w*.55,.022));return mix(c,vec3(.67,.62,.53),bars);}
 if(abs(role-6.)<.25){float seams=max(a029Line(frame.x,1.5,.025),a029Line(frame.w,5.5,.025));return mix(base,vec3(.68,.72,.68),seams*.6);}
 if(abs(role-7.)<.25)return base;
 if(abs(role-8.)<.25){
 const int chars[29]=int[29](27502,31143,27565,0,27502,31143,23407,29842,31183,31015,23533,31143,24573,0,23469,23407,24573,31183,29842,0,24557,27502,31015,31015,31015,18727,23213,23213,29847);
 float xx=(q.x+float(29)*.64*.5)/.64,yy=(14.62-q.y)/.30*5.;int index=int(floor(xx)),col=int(floor(fract(xx)*4.)),row=int(floor(yy));float ink=0.;if(index>=0&&index<29&&col>=0&&col<3&&row>=0&&row<5){float bit=mod(floor(float(chars[index])/exp2(float((4-row)*3+2-col))),2.);vec2 local=abs(fract(vec2(xx*4.,yy))-.5),aa=max(fwidth(vec2(xx*4.,yy)),vec2(.01));ink=bit*(1.-smoothstep(.40,.5+max(aa.x,aa.y),max(local.x,local.y)));}return mix(vec3(.768,.6816,.5664),vec3(.72,.62,.35),ink);}
 float joints=a029Line(q.y,.48,.009);return mix(base,vec3(.59,.53,.44),joints*.20);
}`;
