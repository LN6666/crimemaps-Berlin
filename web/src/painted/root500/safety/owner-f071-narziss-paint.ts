export const F071_NARZISS_GLSL=`
float np071band(float x,float center,float halfSize){float a=max(fwidth(x),.003);return 1.-smoothstep(halfSize-a,halfSize+a,abs(x-center));}
float np071rect(vec2 q,vec2 center,vec2 halfSize){vec2 a=max(fwidth(q),vec2(.003));vec2 m=1.-smoothstep(halfSize-a,halfSize+a,abs(q-center));return m.x*m.y;}
float np071repeat(float x,float period,float halfSize){return np071band(mod(x+period*.5,period)-period*.5,0.,halfSize);}
vec3 nationalmuseumNarziss071(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(abs(family-6390.)>.25)return base;float role=frame.z-1000.;vec2 uv=vec2(frame.x,frame.w);float y=frame.y;float detail=1.-smoothstep(.15,.7,length(fwidth(vec2(uv.x,y))));
 if(role==3.){float ribs=max(np071repeat(uv.x,.62,.022),np071repeat(uv.y,.85,.022));vec3 glass=mix(vec3(.22,.34,.33),vec3(.43,.51,.46),.5+.5*normal.y);return mix(glass,vec3(.13,.22,.20),ribs*.85);}
 if(role==4.)return vec3(.66,.66,.59);
 if(role==5.){float grout=max(np071repeat(uv.x,.75,.012),np071repeat(uv.y,.75,.012));return mix(vec3(.68,.66,.56),vec3(.52,.51,.45),grout*.32*detail);}
 vec3 stone=vec3(.80,.79,.69);float grain=fract(sin(dot(floor(vec2(uv.x+uv.y,y)*20.),vec2(17.33,41.91)))*15261.17);stone*=1.+(grain-.5)*.035*detail;
 float course=np071repeat(y,.48,.009);stone=mix(stone,stone*.86,course*.3*detail);
 stone=mix(stone,vec3(.70,.69,.61),np071band(y,.25,.09));stone=mix(stone,vec3(.87,.85,.75),np071band(y,2.08,.065)*step(.5,role));stone=mix(stone,vec3(.73,.73,.65),np071band(y,4.15,.08));
 if(role==0.){float door=np071rect(vec2(uv.x,y),vec2(6.074,1.27),vec2(.64,1.15))*step(uv.y,-3.3);float grate=max(np071repeat(uv.x,.19,.025),np071repeat(y,.33,.018));vec3 dark=mix(vec3(.035,.055,.055),vec3(.13,.17,.16),grate);stone=mix(stone,dark,door);}
 return stone;}
`;
