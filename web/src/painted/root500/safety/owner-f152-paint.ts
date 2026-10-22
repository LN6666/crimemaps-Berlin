export const OWNER_F152_PAINT_GLSL=`
float sn152Box(vec2 q,vec2 c,vec2 h){vec2 d=abs(q-c)-h;return 1.-smoothstep(-.012,.012,max(d.x,d.y));}
float sn152Arch(vec2 q,float w,float bot,float spring){float r=w*.5;return step(bot,q.y)*step(q.y,spring+sqrt(max(0.,r*r-q.x*q.x)))*step(abs(q.x),r);}
vec3 sn152Pane(vec3 c,vec2 q,float x,float bot,float top,float w,float arch){vec2 a=vec2(q.x-x,q.y);float outer=arch>.5?sn152Arch(a,w+.22,bot-.08,top):sn152Box(a,vec2(0.,(bot+top)*.5),vec2(w*.5+.11,(top-bot)*.5+.08));float glass=arch>.5?sn152Arch(a,w,bot,top):sn152Box(a,vec2(0.,(bot+top)*.5),vec2(w*.5,(top-bot)*.5));c=mix(c,vec3(.65,.38,.29),outer);c=mix(c,vec3(.25,.34,.33),glass);c=mix(c,vec3(.88,.88,.79),sn152Box(a,vec2(0.,(bot+top)*.5),vec2(.034,(top-bot)*.55))*glass);for(int j=0;j<2;j++){float yy=bot+(top-bot)*(.35+.35*float(j));c=mix(c,vec3(.89,.88,.80),sn152Box(a,vec2(0.,yy),vec2(w*.5,.026))*glass);}return c;}
vec3 sn152AllWindows(vec4 frame){float x=frame.x,y=frame.y,g=frame.z;vec2 q=vec2(x,y);vec3 c=y<.35?vec3(.29,.29,.26):vec3(.85,.82,.73);
 // The1908museumplans register long lateralranges, westernresearchwing and endfaces.
 // Current spacing is a finite source-plane approximation; no adjacentAltePhysik glassclerestory is copied.
 if(g<2.5){for(int i=0;i<15;i++){float xx=-64.+float(i)*6.15;if(xx>25.)continue;for(int j=0;j<3;j++){float bot=.90+float(j)*3.58;c=sn152Pane(c,q,xx,bot,bot+2.12,1.85,j==0?1.:0.);}}}
 else if(g<3.5){for(int i=0;i<6;i++){float xx=14.8+float(i)*4.0;for(int j=0;j<3;j++){float bot=.90+float(j)*3.58;c=sn152Pane(c,q,xx,bot,bot+2.12,1.65,j==0?1.:0.);}}float door=sn152Box(q,vec2(25.,1.25),vec2(.85,1.23));c=mix(c,vec3(.30,.29,.25),door);}
 else if(g<5.5){for(int i=0;i<11;i++){float xx=18.5+float(i)*4.65;if(xx>66.5)continue;for(int j=0;j<3;j++){float bot=.85+float(j)*3.62;c=sn152Pane(c,q,xx,bot,bot+1.95,1.55,0.);}}}
 else if(g<6.5){for(int i=0;i<4;i++){float xx=-.25+float(i)*4.;for(int j=0;j<3;j++){float bot=.85+float(j)*3.62;c=sn152Pane(c,q,xx,bot,bot+1.95,1.55,0.);}}}
 else if(g<7.5){for(int i=0;i<3;i++){float xx=40.2+float(i)*4.;for(int j=0;j<3;j++){float bot=.85+float(j)*3.62;c=sn152Pane(c,q,xx,bot,bot+1.95,1.55,0.);}}}
 else if(g<8.5){for(int i=0;i<3;i++){float xx=17.+float(i)*4.;for(int j=0;j<3;j++){float bot=.85+float(j)*3.62;c=sn152Pane(c,q,xx,bot,bot+1.95,1.55,0.);}}}
 else if(g<9.5){for(int i=0;i<2;i++){float xx=-30.8+float(i)*5.;for(int j=0;j<3;j++){float bot=.85+float(j)*3.62;c=sn152Pane(c,q,xx,bot,bot+1.95,1.35,1.);}}}
 else if(g<10.5){for(int j=0;j<3;j++){float bot=.85+float(j)*3.62;c=sn152Pane(c,q,-2.15,bot,bot+1.95,.85,1.);}}
 else if(g<11.5){for(int i=0;i<3;i++){float xx=39.3+float(i)*2.5;for(int j=0;j<3;j++){float bot=.85+float(j)*3.62;c=sn152Pane(c,q,xx,bot,bot+1.80,.75,1.);}}}
 else{for(int i=0;i<3;i++){float xx=-3.1+float(i)*3.1;for(int j=0;j<3;j++){float bot=.85+float(j)*3.62;c=sn152Pane(c,q,xx,bot,bot+1.80,.65,1.);}}}
 for(int j=0;j<3;j++){float yy=j==0?3.5:(j==1?7.1:12.2);c=mix(c,vec3(.64,.41,.31),sn152Box(q,vec2(0.,yy),vec2(200.,.07)));}return c;}

vec3 senckenbergRecovery152(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){float x=frame.x,y=frame.y,v=frame.z,k=frame.w;
 if(k>5.5&&k<6.5)return sn152AllWindows(frame);
 if(k>6.5&&k<7.5)return vec3(.78,.72,.61); // Explicit warm neutral plaster for unregistered original wall faces; no invented openings.
 if(k>9.5){vec3 c=vec3(.55,.53,.51);vec2 q=vec2(x-12.4,v+7.9);vec2 cell=mod(q,vec2(4.2,3.8));float pane=sn152Box(cell,vec2(2.1,1.9),vec2(.77,.72));float rim=sn152Box(cell,vec2(2.1,1.9),vec2(.87,.82));return mix(mix(c,vec3(.28,.31,.30),rim),vec3(.47,.58,.59),pane);} // Plan-supported second covered court: finite rooflight field.
 if(k>8.5){vec3 c=vec3(.44,.57,.58);float mullion=max(1.-smoothstep(.035,.075,abs(mod(x-12.3,2.14)-1.07)),1.-smoothstep(.035,.075,abs(mod(v+44.59,1.9)-.95)));return mix(c,vec3(.24,.28,.29),mullion);} // First covered court glazing; low hip geometry is source-bounded.
 if(k>7.5)return vec3(.55,.53,.51); // Explicit neutral native technical cap: painted mode must not fall back to white.
 if(k<.5){vec3 c=vec3(.25,.28,.28);float seam=max(1.-smoothstep(.01,.035,abs(mod(x,.50)-.25)),1.-smoothstep(.01,.035,abs(mod(v,.30)-.15)));return mix(c,vec3(.16,.19,.19),seam*.28);}
 vec3 c=y<3.35?vec3(.64,.43,.32):vec3(.84,.81,.71);
 if(k>2.5){c=vec3(.65,.43,.32);if(k>3.5)return c;for(int i=0;i<3;i++)c=sn152Pane(c,vec2(x,y),20.1+float(i)*5.0,13.0,15.6,2.4,0.);float line=sn152Box(vec2(x,y),vec2(25.1,16.05),vec2(6.3,.08));c=mix(c,vec3(.77,.58,.40),line);for(int i=0;i<4;i++){float xx=18.+float(i)*4.7;c=mix(c,vec3(.76,.55,.37),sn152Box(vec2(x,y),vec2(xx,14.25),vec2(.12,1.65)));}return c;}
 // North-side front bay: visible in Tilman2007 east2021; no rhythm propagated to hidden northern extension.
 if(k<1.5){for(int i=0;i<3;i++){float xx=-63.+float(i)*5.2;c=sn152Pane(c,vec2(x,y),xx,1.2,3.4,2.1,1.);c=sn152Pane(c,vec2(x,y),xx,5.3,7.75,2.1,0.);c=sn152Pane(c,vec2(x,y),xx,9.5,11.55,2.0,0.);}}
 else{// South-wing courtyard: dated2012 photo, modern pale upper storeys, reddish stone lower frames.
 for(int i=0;i<15;i++){float xx=-51.+float(i)*5.1;for(int j=0;j<4;j++){float yy=1.55+float(j)*3.05;c=sn152Pane(c,vec2(x,y),xx,yy-1.0,yy+1.0,1.65,j==1?1.:0.);}}}
 for(int i=0;i<3;i++){float yy=i==0?3.4:(i==1?8.35:12.2);c=mix(c,vec3(.63,.40,.29),sn152Box(vec2(x,y),vec2(0.,yy),vec2(200.,.065)));}return c;}
`;
