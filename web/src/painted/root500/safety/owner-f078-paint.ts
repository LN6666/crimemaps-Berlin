export const OWNER_F078_PAINT_GLSL=`
float hk78box(vec2 q,vec2 c,vec2 h){vec2 aa=max(fwidth(q),vec2(.003));vec2 m=1.-smoothstep(h-aa,h+aa,abs(q-c));return m.x*m.y;}
vec3 hk78Colonnade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){vec2 q=vec2(frame.x,frame.y);vec3 stone=vec3(.72,.70,.64),pale=vec3(.81,.79,.72),joint=vec3(.49,.48,.44);float row=floor(q.y/.48);vec2 cell=vec2(2.25,.48);vec2 ds=abs(fract((q+vec2(mod(row,2.)*1.125,0.))/cell+.5)-.5)*cell;vec2 aa=max(fwidth(q),vec2(.003));float seam=max(1.-smoothstep(.008,.008+aa.x,ds.x),1.-smoothstep(.008,.008+aa.y,ds.y));vec3 c=mix(stone,joint,seam*.22);
// Opaque recessed backplane representation; original native solid stays opaque.
float back=hk78box(q,vec2(0.,3.35),vec2((53.755460328),2.70));c=mix(c,stone*.67,back);
// Two clear central rectangular entrance leaves; other shadowed openings remain unresolved.
for(int k=0;k<2;k++){float x=(k==0?(-.5):.5)*(4.886860030);c=mix(c,pale*.83,hk78box(q,vec2(x,1.88),vec2(.74,1.15)));c=mix(c,vec3(.15,.17,.16),hk78box(q,vec2(x,1.88),vec2(.63,1.08)));c=mix(c,vec3(.40,.39,.34),hk78box(q,vec2(x,1.88),vec2(.025,1.08)));c=mix(c,vec3(.40,.39,.34),hk78box(q,vec2(x,2.03),vec2(.63,.025)));}
// 21 unfluted round columns counted in 2014 panorama, not 21 bays.
for(int i=0;i<21;i++){float x=(float(i)-10.)*(4.886860030);float shaft=hk78box(q,vec2(x,3.52),vec2(.69,2.55));float cy=clamp((q.x-x)/.69,-1.,1.);vec3 col=pale*(.87+.10*sqrt(max(0.,1.-cy*cy)));c=mix(c,col,shaft);c=mix(c,pale,hk78box(q,vec2(x,.82),vec2(.87,.105)));c=mix(c,joint,hk78box(q,vec2(x,.69),vec2(.94,.035)));c=mix(c,pale,hk78box(q,vec2(x,.61),vec2(.99,.065)));c=mix(c,pale,hk78box(q,vec2(x,6.08),vec2(.80,.10)));c=mix(c,pale,hk78box(q,vec2(x,6.23),vec2(.97,.065)));for(int j=0;j<5;j++)c=mix(c,joint,hk78box(q,vec2(x,1.65+float(j)*.84),vec2(.69,.008))*shaft*.24);}
// End square piers and the continuous entablature/plinth; transient exhibition banner excluded.
for(int i=0;i<2;i++){float x=(i==0?(-1.):1.)*((53.755460328)-.86);c=mix(c,stone,hk78box(q,vec2(x,3.53),vec2(.86,2.80)));for(int j=0;j<10;j++)c=mix(c,joint,hk78box(q,vec2(x,.80+float(j)*.56),vec2(.86,.008))*.26);}
c=mix(c,stone,hk78box(q,vec2(0.,6.91),vec2((53.755460328),.57)));c=mix(c,pale,hk78box(q,vec2(0.,6.36),vec2((53.755460328),.065)));c=mix(c,joint,hk78box(q,vec2(0.,6.46),vec2((53.755460328),.022)));c=mix(c,pale,hk78box(q,vec2(0.,7.30),vec2((53.755460328),.045)));c=mix(c,joint,hk78box(q,vec2(0.,7.41),vec2((53.755460328),.018)));c=mix(c,stone,hk78box(q,vec2(0.,.24),vec2((53.755460328),.24)));for(int i=0;i<3;i++)c=mix(c,joint,hk78box(q,vec2(0.,.10+float(i)*.14),vec2((53.755460328),.012))*.55);return c;}

// Whole native component treatment. frame=(global long U, Y or lateral V, lateral V or Y, kind).
vec3 hausDerKunstRecovery148(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float u=frame.x,y=frame.y,v=frame.z,k=frame.w;
 vec3 stone=vec3(.72,.70,.64),joint=vec3(.49,.48,.44);
 if(k<.5){
   // Roof photograph supports parallel long glazing strips, projected onto native cap.
   float lateral=frame.y;vec3 c=vec3(.48,.47,.43);
   for(int i=0;i<4;i++){float t=-21.+float(i)*14.;float band=hk78box(vec2(u,lateral),vec2(0.,t),vec2(64.,4.8));float slope=clamp((lateral-t+4.8)/9.6,0.,1.);vec3 glass=mix(vec3(.42,.50,.49),vec3(.66,.71,.67),smoothstep(0.,1.,slope));float edgeCue=1.-smoothstep(.10,.35,4.8-abs(lateral-t));glass=mix(glass,vec3(.32,.36,.34),edgeCue*.45);float mullion=1.-smoothstep(.025,.06,abs(mod(u+64.,2.4)-1.2));glass=mix(glass,vec3(.36,.39,.37),mullion*.6);c=mix(c,glass,band);}
   return c;
 }
 if(k>.5&&k<2.5)return hk78Colonnade(base,p,normal,frame,family);
 float row=floor(y/.48),vertical=abs(mod(u+mod(row,2.)*1.125,2.25)-1.125),horizontal=abs(mod(y,.48)-.24);
 vec3 c=mix(stone,joint,(1.-smoothstep(.008,.035,min(vertical,horizontal)))*.25);
 // Side entrance/window rhythm confined to long central west/east end walls.
 if(k>2.5&&k<4.5){float t=v;float recess=hk78box(vec2(mod(t+18.,6.)-3.,y),vec2(0.,2.),vec2(.63,1.38));c=mix(c,vec3(.18,.20,.18),recess);float frameLine=hk78box(vec2(mod(t+18.,6.)-3.,y),vec2(0.,3.5),vec2(.85,.10));c=mix(c,joint,frameLine);float bars=(1.-smoothstep(.025,.06,abs(mod(t+18.,.4)-.2)))*recess;c=mix(c,stone*.7,bars*.6);}
 c=mix(c,vec3(.28,.29,.27),1.-smoothstep(.1,.35,y));c=mix(c,joint,(1.-smoothstep(.025,.055,abs(y-6.45)))*.6);return c;
}

`;
