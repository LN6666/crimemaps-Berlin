export const F115_EXTERIOR_GLSL=`
float m115eBox(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;float aa=max(.008,max(fwidth(q.x),fwidth(q.y)));return 1.-smoothstep(-aa,aa,max(d.x,d.y));}
vec3 m115eBrick(vec2 q){float row=floor(q.y/.075);vec2 f=fract(vec2(q.x/.25+mod(row,2.)*.5,q.y/.075));vec2 w=max(fwidth(q/vec2(.25,.075)),vec2(.008));float line=max(1.-smoothstep(.035,.035+w.x,min(f.x,1.-f.x)),1.-smoothstep(.065,.065+w.y,min(f.y,1.-f.y)));float fade=1.-smoothstep(.25,.75,max(w.x,w.y));return mix(vec3(.40,.27,.21),vec3(.58,.51,.43),line*.30*fade);}
vec3 m115ePane(vec3 c,vec2 q,vec2 at,vec2 h){float outer=m115eBox(q,at,h+vec2(.065));c=mix(c,vec3(.19,.23,.22),outer);float inner=m115eBox(q,at,h);c=mix(c,vec3(.31,.41,.42),inner);c=mix(c,vec3(.61,.64,.59),m115eBox(q,at+vec2(0.,h.y*.63),vec2(h.x,.025))*inner);return c;}
float m115eLetter(float chr,vec2 q){vec2 cell=floor(q*vec2(5.,7.));if(any(lessThan(q,vec2(0.)))||any(greaterThanEqual(q,vec2(1.))))return 0.;float x=cell.x,y=6.-cell.y;bool on=false;if(chr<.5)on=x==0.||x==4.||(y<3.&&(x==y||x==4.-y));else if(chr<1.5)on=(x==0.||x==4.)&&y<6.||y==6.&&(x>0.&&x<4.);else if(chr<2.5)on=y==0.||y==3.||y==6.||x==0.&&y<3.||x==4.&&y>3.;else on=x==0.||y==0.||y==3.||y==6.;return on?1.:0.;}
vec3 makkExteriorCompletion115(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6403.)>.25)return base;float role=floor(frame.z-1000.+.5);vec2 q=frame.xy;float width=frame.w;vec3 c=m115eBrick(q);
 if(role==3.||role==6.){vec2 f=abs(fract(q/vec2(1.1,1.8))-.5);vec2 aa=max(fwidth(q/vec2(1.1,1.8)),vec2(.005));float line=max(1.-smoothstep(.012,.012+aa.x,.5-f.x),1.-smoothstep(.012,.012+aa.y,.5-f.y));return mix(role==6.?vec3(.32,.43,.43):vec3(.49,.55,.53),vec3(.68,.70,.64),line*.7);}
 if(role==7.)return vec3(.23,.27,.25);
 if(role==5.)return c; // South low connector: no invented window schedule.
 if(role==8.){float lo=0.,hi=0.;if(q.x>=-24.869861342&&q.x<=-15.796567378){lo=-24.869861342;hi=-15.796567378;}else if(q.x>=-15.796567378&&q.x<=-6.715743776){lo=-15.796567378;hi=-6.715743776;}else if(q.x>=-6.715743776&&q.x<=2.236022880){lo=-6.715743776;hi=2.236022880;}else if(q.x>=2.236022880&&q.x<=11.252216519){lo=2.236022880;hi=11.252216519;}else if(q.x>=11.252216519){lo=11.252216519;hi=30.;}else return c;q.x-=lo;width=hi-lo;role=2.;}
 if(role==2.){float pitch=width/3.;for(int i=0;i<3;i++){float u=(float(i)+.5)*pitch;for(int k=0;k<3;k++){float y=k==0?5.2:(k==1?10.1:14.1);float h=k==0?1.65:1.25;float stone=m115eBox(q,vec2(u,y-1.7),vec2(pitch*.32,.40));c=mix(c,vec3(.65,.64,.56),stone);c=m115ePane(c,q,vec2(u,y),vec2(pitch*.29,h));}c=m115ePane(c,q,vec2(u,1.65),vec2(.25,.55));}return c;}
 if(role==1.){float pitch=width/21.;for(int i=0;i<21;i++){float u=(float(i)+.5)*pitch;float stone=m115eBox(q,vec2(u,7.),vec2(pitch*.39,3.8));c=mix(c,vec3(.61,.62,.56),stone);c=m115ePane(c,q,vec2(u,9.6),vec2(pitch*.37,1.8));c=m115ePane(c,q,vec2(u,5.6),vec2(pitch*.37,.48));c=m115ePane(c,q,vec2(u,2.),vec2(pitch*.37,1.5));}
 float mid=width*.5;for(int k=0;k<2;k++){float u=mid+(float(k)-.5)*3.65;c=m115ePane(c,q,vec2(u,1.65),vec2(1.45,1.6));c=mix(c,vec3(.15,.19,.18),m115eBox(q,vec2(u,1.65),vec2(.025,1.6)));}
 // Outward north reading: east is image-left for a viewer facing south.
 vec2 text=vec2((width-q.x-mid+5.4)/1.8,(q.y-4.2)/1.1);float index=floor(text.x);if(index>=0.&&index<6.){float ch=index==0.||index==5.?0.:(index==1.||index==4.?1.:(index==2.?2.:3.));float m=m115eLetter(ch,vec2(fract(text.x)/.78,text.y));c=mix(c,vec3(.84,.10,.10),m);}return c;}
 return c;
}
`;
