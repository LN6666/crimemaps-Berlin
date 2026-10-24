export const infillFrankfurtJunghof088OwnerPaintGLSL=/*glsl*/`
float fraJ088Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}

// Junghof062: roof-only material masks registered in shared metric East/North.
// No discard, no sampled triangle RGB and no inferred courtyard/roof geometry.
float fraJ062Cross(vec2 p,vec2 a,vec2 b){
 if((a.y>p.y)==(b.y>p.y))return 0.;
 return p.x<a.x+(p.y-a.y)*(b.x-a.x)/(b.y-a.y)?1.:0.;
}
float fraJ062Plant(vec2 p){float mask=0.;
 mask=max(mask,mod(fraJ062Cross(p,vec2(-40.863896304,14.668418470),vec2(-22.875961089,10.170099182))+fraJ062Cross(p,vec2(-22.875961089,10.170099182),vec2(-26.199818683,-0.195578640))+fraJ062Cross(p,vec2(-26.199818683,-0.195578640),vec2(-29.132634207,-6.649669743))+fraJ062Cross(p,vec2(-29.132634207,-6.649669743),vec2(-31.283365592,-6.454091338))+fraJ062Cross(p,vec2(-31.283365592,-6.454091338),vec2(-32.065449731,-14.472799997))+fraJ062Cross(p,vec2(-32.065449731,-14.472799997),vec2(-33.825139046,-18.971094691))+fraJ062Cross(p,vec2(-33.825139046,-18.971094691),vec2(-38.713164920,-17.406470881))+fraJ062Cross(p,vec2(-38.713164920,-17.406470881),vec2(-42.232543549,-14.081643755))+fraJ062Cross(p,vec2(-42.232543549,-14.081643755),vec2(-44.578795968,-9.387766639))+fraJ062Cross(p,vec2(-44.578795968,-9.387766639),vec2(-46.338485283,-8.409875052))+fraJ062Cross(p,vec2(-46.338485283,-8.409875052),vec2(-44.578795968,1.173471994))+fraJ062Cross(p,vec2(-44.578795968,1.173471994),vec2(-40.863896304,14.668418470)),2.));
 mask=max(mask,mod(fraJ062Cross(p,vec2(1.564168280,2.738101717),vec2(17.987935215,-1.564628921))+fraJ062Cross(p,vec2(17.987935215,-1.564628921),vec2(13.881993481,-17.210892871))+fraJ062Cross(p,vec2(13.881993481,-17.210892871),vec2(-1.759689315,-13.103753029))+fraJ062Cross(p,vec2(-1.759689315,-13.103753029),vec2(1.564168280,2.738101717)),2.));
 mask=max(mask,mod(fraJ062Cross(p,vec2(15.055119691,-22.295918767),vec2(44.187753898,-29.923448515))+fraJ062Cross(p,vec2(44.187753898,-29.923448515),vec2(40.863896304,-40.875779834))+fraJ062Cross(p,vec2(40.863896304,-40.875779834),vec2(10.558135887,-33.052688329))+fraJ062Cross(p,vec2(10.558135887,-33.052688329),vec2(15.055119691,-22.295918767)),2.));
 return mask;
}
float fraJ062Glass(vec2 p){float mask=0.;
 mask=max(mask,mod(fraJ062Cross(p,vec2(-12.122304167,28.163399112),vec2(30.696802487,17.406527722))+fraJ062Cross(p,vec2(30.696802487,17.406527722),vec2(28.937113172,9.778941160))+fraJ062Cross(p,vec2(28.937113172,9.778941160),vec2(-13.881993481,20.535797160))+fraJ062Cross(p,vec2(-13.881993481,20.535797160),vec2(-12.122304167,28.163399112)),2.));
 mask=max(mask,mod(fraJ062Cross(p,vec2(-13.490951411,22.296012027),vec2(-0.782084140,18.971162210))+fraJ062Cross(p,vec2(-0.782084140,18.971162210),vec2(-4.496983804,4.302731903))+fraJ062Cross(p,vec2(-4.496983804,4.302731903),vec2(-17.205851075,7.823151493))+fraJ062Cross(p,vec2(-17.205851075,7.823151493),vec2(-13.490951411,22.296012027)),2.));
 mask=max(mask,mod(fraJ062Cross(p,vec2(-24.440129369,9.387783173),vec2(-1.173126210,3.324837981))+fraJ062Cross(p,vec2(-1.173126210,3.324837981),vec2(-3.910420699,-8.409875052))+fraJ062Cross(p,vec2(-3.910420699,-8.409875052),vec2(-27.177423858,-2.738100311))+fraJ062Cross(p,vec2(-27.177423858,-2.738100311),vec2(-24.440129369,9.387783173)),2.));
 mask=max(mask,mod(fraJ062Cross(p,vec2(-1.759689315,-3.129257382),vec2(1.759689315,-4.302728429))+fraJ062Cross(p,vec2(1.759689315,-4.302728429),vec2(-0.977605175,-14.472799997))+fraJ062Cross(p,vec2(-0.977605175,-14.472799997),vec2(-4.301462769,-13.494909344))+fraJ062Cross(p,vec2(-4.301462769,-13.494909344),vec2(-1.759689315,-3.129257382)),2.));
 mask=max(mask,mod(fraJ062Cross(p,vec2(32.065449731,-10.365658045),vec2(45.556401143,-13.886065622))+fraJ062Cross(p,vec2(45.556401143,-13.886065622),vec2(42.232543549,-24.838429897))+fraJ062Cross(p,vec2(42.232543549,-24.838429897),vec2(29.132634207,-21.122451682))+fraJ062Cross(p,vec2(29.132634207,-21.122451682),vec2(32.065449731,-10.365658045)),2.));
 mask=max(mask,mod(fraJ062Cross(p,vec2(-35.780349396,9.192204187),vec2(-26.786381788,6.845256929))+fraJ062Cross(p,vec2(-26.786381788,6.845256929),vec2(-28.155029033,2.346944243))+fraJ062Cross(p,vec2(-28.155029033,2.346944243),vec2(-37.148996640,4.498310706))+fraJ062Cross(p,vec2(-37.148996640,4.498310706),vec2(-35.780349396,9.192204187)),2.));
 mask=max(mask,mod(fraJ062Cross(p,vec2(-41.841501479,-3.520414426),vec2(-35.780349396,-4.889463852))+fraJ062Cross(p,vec2(-35.780349396,-4.889463852),vec2(-37.344517675,-9.778923222))+fraJ062Cross(p,vec2(-37.344517675,-9.778923222),vec2(-43.405669759,-8.214296712))+fraJ062Cross(p,vec2(-43.405669759,-8.214296712),vec2(-41.841501479,-3.520414426)),2.));
 return mask;
}
float fraJ062Service(vec2 p){float mask=0.;
 mask=max(mask,mod(fraJ062Cross(p,vec2(-34.411702151,-8.214296712),vec2(-28.937113172,-9.778923222))+fraJ062Cross(p,vec2(-28.937113172,-9.778923222),vec2(-30.696802487,-15.646268542))+fraJ062Cross(p,vec2(-30.696802487,-15.646268542),vec2(-35.193786291,-14.081643755))+fraJ062Cross(p,vec2(-35.193786291,-14.081643755),vec2(-34.411702151,-8.214296712)),2.));
 mask=max(mask,mod(fraJ062Cross(p,vec2(15.641682796,-23.469385594),vec2(24.831171438,-25.620740767))+fraJ062Cross(p,vec2(24.831171438,-25.620740767),vec2(22.484919019,-32.074801087))+fraJ062Cross(p,vec2(22.484919019,-32.074801087),vec2(13.686472446,-30.119026056))+fraJ062Cross(p,vec2(13.686472446,-30.119026056),vec2(15.641682796,-23.469385594)),2.));
 mask=max(mask,mod(fraJ062Cross(p,vec2(34.607223186,14.277260122),vec2(49.662342877,16.428631398))+fraJ062Cross(p,vec2(49.662342877,16.428631398),vec2(53.377242541,-3.520414426))+fraJ062Cross(p,vec2(53.377242541,-3.520414426),vec2(50.639948052,-9.192188334))+fraJ062Cross(p,vec2(50.639948052,-9.192188334),vec2(40.472854234,-7.431983285))+fraJ062Cross(p,vec2(40.472854234,-7.431983285),vec2(37.540038710,-3.324835909))+fraJ062Cross(p,vec2(37.540038710,-3.324835909),vec2(30.305760417,-0.977893129))+fraJ062Cross(p,vec2(30.305760417,-0.977893129),vec2(34.607223186,14.277260122)),2.));
 return mask;
}
vec3 fraJ062Roof(vec3 base,vec3 normal,vec4 frame,float family){
 if((abs(family-45210.)>.25&&abs(family-45211.)>.25)||normal.y<.9999||
    (abs(frame.y-34.857)>.002&&abs(frame.y-34.370)>.002))return base;
 vec2 q=frame.xz;float planted=fraJ062Plant(q),glazed=fraJ062Glass(q),service=fraJ062Service(q);
 vec3 roof=mix(vec3(.55,.56,.49),vec3(.58,.57,.43),planted);
 roof=mix(roof,vec3(.63,.64,.59),service);
 float grid=1.-(1.-fraJ088Line(q.x*.84+q.y*.54,1.4,.025))*(1.-fraJ088Line(q.x*.54-q.y*.84,2.1,.025));
 vec3 glass=mix(vec3(.37,.47,.49),vec3(.4292,.5452,.5684),grid*.55);
 roof=mix(roof,glass,glazed*(1.-service));
 float edge=max(0.,frame.w-2.),aa=max(fwidth(edge),.025),coping=1.-smoothstep(.12-aa,.36+aa,edge);
 return mix(roof,vec3(.77,.78,.72),coping*.78);
}
vec3 infillFrankfurtJunghof088Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-45210.)<.25||abs(family-45211.)<.25)return fraJ062Roof(base,normal,frame,family);
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
