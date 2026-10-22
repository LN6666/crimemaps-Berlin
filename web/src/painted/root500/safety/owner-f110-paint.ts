export const F110_GLSL=String.raw`// Pixel integral of the original repeating smooth metal/mullion line; its period and width stay unchanged.
float f110halfIntegral(float t,float a,float b){float q=clamp((t-a)/(b-a),0.,1.);return min(t,a)+(b-a)*(q-q*q*q+.5*q*q*q*q);}
float f110jointIntegral(float x,float a,float b){float t=fract(x);return floor(x)*(a+b)+f110halfIntegral(t,a,b)+.5*(a+b)-f110halfIntegral(1.-t,a,b);}
float f110line(float x,float period,float w){float phase=x/period,width=max(fwidth(phase),.00001),center=fract(phase),a=w/period,b=(w+.025)/period;return clamp((f110jointIntegral(center+.5*width,a,b)-f110jointIntegral(center-.5*width,a,b))/width,0.,1.);}
float f110rect(vec2 p,vec2 size){vec2 d=abs(p)-size;return 1.-smoothstep(-.015,.03,max(d.x,d.y));}
vec3 koelnHauptbahnhofWhole110(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-6342.)>.25)return base;
 float u=frame.x,v=frame.y,role=frame.z,y=p.y;
 vec3 glass=vec3(.15,.225,.215),steel=vec3(.53,.59,.565),stone=vec3(.62,.61,.55);
 float nU=dot(normal.xz,vec2(-.54194794,.84041206)),nV=dot(normal.xz,vec2(-.84041206,-.54194794));
 if(role>15.5)return vec3(.39,.49,.41)*(1.-.10*f110line(u,.65,.012));
 if(role>14.5){float axis=abs(nV)>.7?u:v;vec3 c=vec3(.71,.72,.68);for(int j=0;j<2;j++){float yy=10.4+float(j)*4.0;float ww=f110rect(vec2(mod(axis+.9,2.45)-1.225,y-yy),vec2(.88,.95));float cross=max(f110line(axis,.82,.025),f110line(y-yy,1.9,.025));c=mix(c,mix(glass,vec3(.83,.84,.79),cross),ww);}return c;}
 if(role>13.5){if(normal.y>.6)return vec3(.42,.45,.44);return vec3(.63,.66,.64)*(1.-.045*f110line(u+v,.65,.012));}
 if(role>12.5)return steel;
 if(role>11.5)return vec3(.035,.39,.17);
 if(role>10.5)return vec3(.84,.025,.04);
 if(role>9.5)return vec3(.94,.96,.92);
 if(role>8.5){
  float axis=abs(nV)>.7?u:v;float dx=mod(axis+3.5,7.)-3.5;float lower=f110rect(vec2(dx,y-3.15),vec2(1.65,1.65));float arch=(1.-smoothstep(1.62,1.7,length(vec2(dx,y-4.8))))*step(4.8,y);float win=max(lower,arch);float bars=max(f110line(dx,.55,.04),f110line(y,.65,.035));vec3 brick=vec3(.47,.39,.30)*(1.-.08*f110line(y,.24,.014)-.045*f110line(axis+mod(floor(y/.24),2.)*.25,.5,.012));return mix(brick,mix(glass,vec3(.84,.85,.77),bars),win);
 }
 if(role>7.5)return vec3(.43,.46,.44)*(1.-.065*f110line(u+v,1.4,.02));
 if(role>6.5)return vec3(.57,.58,.54)*(1.-.045*f110line(u,2.,.012));
 if(role>5.5){
  float axis=abs(nV)>.6?u:v;float dx=mod(axis+1.1,2.2)-1.1;float row=mod(y-2.8,2.6)-1.3;float window=f110rect(vec2(dx,row),vec2(.76,.88))*step(2.8,y)*step(y,9.6);float frameMask=f110rect(vec2(dx,row),vec2(.9,1.05))*step(2.8,y)*step(y,9.7);vec3 c=mix(stone,vec3(.86,.86,.78),frameMask);float pane=f110line(dx,.76,.024);c=mix(c,mix(glass,steel,pane),window);if(y<2.7){float doors=f110rect(vec2(mod(axis+2.5,5.)-2.5,y-1.3),vec2(2.1,1.12));c=mix(c,mix(glass,vec3(.75,.78,.73),f110line(axis,.9,.035)),doors);}return c;
 }
 if(role>4.5){float grid=max(f110line(u,1.25,.035),f110line(v,1.,.03));float ribs=f110line(u+v,9.,.055);vec3 c=vec3(.27,.39,.40)*(1.+.045*sin(u*.41));return mix(c,steel,max(grid*.8,ribs));}
 if(role>3.5){float grid=max(f110line(v,1.4,.04),f110line(y,1.65,.045));return mix(glass,steel,grid);}
 if(role>2.5){float glazing=step(mod(u+200.,9.),2.0)*step(-100.,u);float grid=max(f110line(v,1.0,.028),f110line(u,1.0,.028));vec3 metal=vec3(.43,.54,.49)*(1.-.08*f110line(v,.62,.012));vec3 pane=mix(vec3(.22,.32,.33),steel,grid*.8);return mix(metal,pane,glazing);}
 if(role>1.5)return vec3(.80,.82,.77)*(1.-.035*f110line(u,2.0,.025));
 // Entrance glazing and its low, separately retainedsource storefrontprojection.
 float grid=max(f110line(u+34.3,3.25,.055),f110line(y,2.85,.05));vec3 c=glass*(1.+.07*sin(u*.43)+.025*cos(y));
 if(y<3.1){float doorgrid=max(f110line(u,1.4,.04),f110line(y-2.4,2.4,.04));c=mix(c,vec3(.69,.72,.68),doorgrid);float lintel=1.-smoothstep(.12,.2,abs(y-2.8));c=mix(c,vec3(.27,.29,.27),lintel);}
 return mix(c,steel,grid);
}
`;
