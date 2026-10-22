export const OWNER_F064_PAINT_GLSL=`
float mb064Rect(vec2 p,vec2 h){vec2 a=1.-smoothstep(h,h+vec2(.035),abs(p));return a.x*a.y;}
float mb064Line(float q,float w){return 1.-smoothstep(w,w+max(fwidth(q),.012),abs(q));}
vec3 mb064Palette(float t,float group){
 float h=mod(t,7.);
 if(group<.5){if(h<1.)return vec3(.73,.60,.32);if(h<2.)return vec3(.78,.48,.24);if(h<3.)return vec3(.68,.62,.45);if(h<4.)return vec3(.82,.70,.42);if(h<5.)return vec3(.67,.45,.36);if(h<6.)return vec3(.79,.65,.52);return vec3(.61,.65,.60);}
 if(group<1.5){if(h<1.)return vec3(.63,.20,.27);if(h<2.)return vec3(.29,.38,.60);if(h<3.)return vec3(.72,.63,.62);if(h<4.)return vec3(.15,.19,.19);if(h<5.)return vec3(.56,.34,.40);if(h<6.)return vec3(.43,.47,.66);return vec3(.69,.48,.32);}
 if(h<1.)return vec3(.82,.72,.68);if(h<2.)return vec3(.75,.78,.75);if(h<3.)return vec3(.87,.80,.53);if(h<4.)return vec3(.78,.61,.55);if(h<5.)return vec3(.68,.72,.78);if(h<6.)return vec3(.87,.82,.72);return vec3(.73,.65,.59);
}
// frame=(longitudinal U, wall height or roof lateral E, lateral E or roof height,kind).
vec3 museumBrandhorstRecovery147(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float u=frame.x,y=frame.y,e=frame.z,k=frame.w;
 if(k<.5){return vec3(.54,.55,.52);}
 bool head=u>28.25||k>3.5;float group=head?2.:(y<7.?1.:0.);float t=(k>1.5&&k<2.5||k>3.5)?e:u;
 float col=floor(t/.10),row=floor(y/1.1),id=mod(col*3.+row*5.,7.);float detail=1.-smoothstep(.05,.25,fwidth(t));
 vec3 avg=group<.5?vec3(.72,.60,.40):group<1.5?vec3(.48,.37,.43):vec3(.79,.73,.65);vec3 c=mix(avg,mb064Palette(id,group),detail*.85);
 float rod=1.-smoothstep(.018,.029,abs(mod(t+.05,.1)-.05));float horizontal=mb064Line(mod(y,1.1),.012);c*=1.-detail*(1.-rod)*.15;c=mix(c,c*.73,horizontal*.25);
 // This museum's continuous narrow ribbon joins the volumes at the7..9.5m stage.
 float ribbon=step(7.,y)*(1.-step(9.45,y));bool longWall=k<1.5||k>2.5&&k<3.5;
 if(longWall&&u<28.3&&ribbon>.5){c=vec3(.17,.23,.23);c=mix(c,vec3(.49,.51,.47),mb064Line(mod(u+.9,1.2)-.6,.025));}
 // Bounded west upper display window, observed in the canonical SW image.
 if(k<1.5&&u>7.&&u<25.&&y>11.5&&y<14.3){c=vec3(.22,.28,.27);c=mix(c,vec3(.47,.48,.44),mb064Line(mod(u,1.1),.025));}
 // NW foyer ribbon wraps the corner; ground entrance is limited to its doorway.
 if(k>4.5&&k<5.5&&(y>6.8&&y<10.1||e>-8.&&e<-3.&&y<6.8)){c=vec3(.15,.21,.21);c=mix(c,vec3(.40,.43,.42),max(mb064Line(mod(t,1.2),.035),mb064Line(y-3.2,.035)));}
 // Official north entrance photo: corner ribbon above ceramic plinth, descending at door.
 if(k>3.5&&k<4.5&&e<-1.&&((y>6.8&&y<10.1)||(e>-6.&&y<6.8)))c=vec3(.19,.26,.26);
 c=mix(c,vec3(.20,.23,.22),1.-smoothstep(.12,.32,y));return c;
}

`;
