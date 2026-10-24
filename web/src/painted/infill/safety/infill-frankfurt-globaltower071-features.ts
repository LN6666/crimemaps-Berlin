/** SICORE-owned photographs: real unequal measured shafts, SW ribbon windows,
 * SE opaque metal ends, dark SW mechanical crown. Profiles use actual local
 * datum and independently stated photo estimates, never a stretched54m rule. */
export const GLOBAL_TOWER_OFFICIAL_GLSL071=`
float globalTowerOfficialBand071(float x,float a,float b){float pixel=max(fwidth(x),.025);return smoothstep(a-pixel,a+pixel,x)*(1.-smoothstep(b-pixel,b+pixel,x));}
float globalTowerOfficialLine071(float x,float pitch,float width){float px=max(fwidth(x),.0001);float d=abs(fract(x/pitch+.5)-.5)*pitch;float v=1.-smoothstep(max(0.,width-px*.5),width+px*.5,d);return mix(v,clamp(2.*width/pitch,0.,1.),smoothstep(.2,.7,px/pitch));}
vec3 globalTowerOfficial071(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 float light=.63+.37*max(0.,dot(normalize(normal),normalize(vec3(-.35,.8,.4))));
 if(family==45263.){float joint=max(globalTowerOfficialLine071(f.x,3.6,.012),globalTowerOfficialLine071(f.y,3.6,.012));return base*(1.-joint*.09);}
 if(family==45262.||family==45265.)return base;
 float sw=step(.95,dot(normalize(normal.xz),normalize(vec2(-.86,-.51))))*(1.-step(.1,abs(normal.y)));
 float se=step(.95,dot(normalize(normal.xz),normalize(vec2(.51,-.86))))*(1.-step(.1,abs(normal.y)));
 if(family==45261.){if(se<.5)return base;float seams=max(globalTowerOfficialLine071(f.x,4.5,.018),globalTowerOfficialLine071(f.y,4.,.018));return mix(base,vec3(.46,.47,.43)*light,seams*.40);}
 if(family==45264.){if(sw<.5||f.y<f.w-.005||f.y>f.z+.005)return base;float slit=globalTowerOfficialLine071(f.x,.38,.042);float rail=globalTowerOfficialLine071(f.y,1.25,.018);return mix(vec3(.24,.26,.24),vec3(.10,.14,.14),slit*.77+rail*.12)*light;}
 if(family==45260.){if(sw<.5||f.y>f.w+.005)return base;float win=globalTowerOfficialBand071(mod(f.y,4.),1.42,3.22);float mull=globalTowerOfficialLine071(f.x,1.5,.032);float pane=globalTowerOfficialLine071(f.x,.75,.012);vec3 glass=mix(vec3(.31,.42,.45),vec3(.48,.51,.50),max(mull*.92,pane*.28))*light;float edge=max(globalTowerOfficialLine071(f.y-1.42,4.,.028),globalTowerOfficialLine071(f.y-3.22,4.,.028));vec3 stone=mix(base,vec3(.72,.69,.62)*light,edge*.45);return mix(stone,glass,win);}
 return base;
}
`;
