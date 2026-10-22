export const F116_COMPLETION_GLSL=`
float rgmcLegacyBox116(vec2 q,vec2 c,vec2 h){vec2 aa=max(fwidth(q),vec2(.003));vec2 m=1.-smoothstep(h-aa,h+aa,abs(q-c));return m.x*m.y;}
float rgmcLegacyGlyph116(vec2 q,vec4 a,vec3 b){vec2 cell=floor(q);if(cell.x<0.||cell.x>=5.||cell.y<0.||cell.y>=7.)return 0.;float r=cell.y<.5?a.x:(cell.y<1.5?a.y:(cell.y<2.5?a.z:(cell.y<3.5?a.w:(cell.y<4.5?b.x:(cell.y<5.5?b.y:b.z)))));float v=mod(floor(r/pow(2.,4.-cell.x)),2.);return v*rgmcLegacyBox116(fract(q),vec2(.5),vec2(.44));}
vec3 rgmcLegacyWest116(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family!=4939.)return base;vec2 q=vec2(frame.x,p.y);float W=frame.w;bool west=W>10.;float module=west?W/30.:2.00748;vec2 cell=vec2(module,.8125);vec2 d=abs(fract((q-vec2(0.,1.75))/cell+.5)-.5)*cell;vec2 aa=max(fwidth(q),vec2(.003));float joint=max(1.-smoothstep(.012,.012+aa.x,d.x),1.-smoothstep(.012,.012+aa.y,d.y));float ci=floor(q.x/module),cj=floor((q.y-1.75)/.8125);float tone=mod(ci*3.+cj*7.,5.)*.005;vec3 c=mix(vec3(.72,.72,.68)+tone,vec3(.51,.52,.49),joint*.55);
if(p.y<1.75){c=vec3(.18,.23,.22);float bar=abs(mod(q.x+.53,1.06)-.53);float mullion=1.-smoothstep(.025,.025+max(fwidth(q.x),.003),bar);c=mix(c,vec3(.32,.35,.31),mullion);c=mix(c,vec3(.32,.35,.31),rgmcLegacyBox116(q,vec2(30.,1.25),vec2(100.,.035)));c=mix(c,vec3(.32,.34,.30),rgmcLegacyBox116(q,vec2(30.,.12),vec2(100.,.08)));}
c=mix(c,vec3(.49,.49,.44),rgmcLegacyBox116(q,vec2(30.,1.77),vec2(100.,.08)));c=mix(c,vec3(.78,.78,.72),rgmcLegacyBox116(q,vec2(30.,4.96),vec2(100.,.035)));if(!west)return c;
// Seven clearlyvisiblepostpositions traced from the originalfullWestimage; notanassumptionofadditionalhiddenposts.
{float x=W*(0.957249071);c=mix(c,vec3(.77,.75,.65),rgmcLegacyBox116(q,vec2(x,.86),vec2(.19,.86)));c=mix(c,vec3(.85,.82,.72),rgmcLegacyBox116(q,vec2(x-.045,.86),vec2(.045,.85)));}
{float x=W*(0.817843866);c=mix(c,vec3(.77,.75,.65),rgmcLegacyBox116(q,vec2(x,.86),vec2(.19,.86)));c=mix(c,vec3(.85,.82,.72),rgmcLegacyBox116(q,vec2(x-.045,.86),vec2(.045,.85)));}
{float x=W*(0.676579926);c=mix(c,vec3(.77,.75,.65),rgmcLegacyBox116(q,vec2(x,.86),vec2(.19,.86)));c=mix(c,vec3(.85,.82,.72),rgmcLegacyBox116(q,vec2(x-.045,.86),vec2(.045,.85)));}
{float x=W*(0.533457249);c=mix(c,vec3(.77,.75,.65),rgmcLegacyBox116(q,vec2(x,.86),vec2(.19,.86)));c=mix(c,vec3(.85,.82,.72),rgmcLegacyBox116(q,vec2(x-.045,.86),vec2(.045,.85)));}
{float x=W*(0.392193309);c=mix(c,vec3(.77,.75,.65),rgmcLegacyBox116(q,vec2(x,.86),vec2(.19,.86)));c=mix(c,vec3(.85,.82,.72),rgmcLegacyBox116(q,vec2(x-.045,.86),vec2(.045,.85)));}
{float x=W*(0.249070632);c=mix(c,vec3(.77,.75,.65),rgmcLegacyBox116(q,vec2(x,.86),vec2(.19,.86)));c=mix(c,vec3(.85,.82,.72),rgmcLegacyBox116(q,vec2(x-.045,.86),vec2(.045,.85)));}
{float x=W*(0.107806691);c=mix(c,vec3(.77,.75,.65),rgmcLegacyBox116(q,vec2(x,.86),vec2(.19,.86)));c=mix(c,vec3(.85,.82,.72),rgmcLegacyBox116(q,vec2(x-.045,.86),vec2(.045,.85)));}
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(0.0),((2.53)-q.y)/.055),vec4(30.,17.,17.,30.),vec3(20.,18.,17.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(6.0),((2.53)-q.y)/.055),vec4(10.,0.,14.,17.),vec3(17.,17.,14.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(12.0),((2.53)-q.y)/.055),vec4(0.,0.,26.,21.),vec3(21.,21.,21.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(18.0),((2.53)-q.y)/.055),vec4(4.,0.,12.,4.),vec3(4.,4.,14.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(24.0),((2.53)-q.y)/.055),vec4(0.,0.,15.,16.),vec3(14.,1.,30.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(30.0),((2.53)-q.y)/.055),vec4(0.,0.,14.,17.),vec3(16.,17.,14.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(36.0),((2.53)-q.y)/.055),vec4(16.,16.,30.,17.),vec3(17.,17.,17.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(42.0),((2.53)-q.y)/.055),vec4(0.,0.,0.,31.),vec3(0.,0.,0.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(48.0),((2.53)-q.y)/.055),vec4(14.,17.,16.,23.),vec3(17.,17.,15.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(54.0),((2.53)-q.y)/.055),vec4(0.,0.,14.,17.),vec3(31.,16.,14.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(60.0),((2.53)-q.y)/.055),vec4(0.,0.,22.,25.),vec3(16.,16.,16.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(66.0),((2.53)-q.y)/.055),vec4(0.,0.,26.,21.),vec3(21.,21.,21.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(72.0),((2.53)-q.y)/.055),vec4(0.,0.,14.,1.),vec3(15.,17.,15.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(78.0),((2.53)-q.y)/.055),vec4(0.,0.,30.,17.),vec3(17.,17.,17.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(84.0),((2.53)-q.y)/.055),vec4(4.,0.,12.,4.),vec3(4.,4.,14.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(90.0),((2.53)-q.y)/.055),vec4(0.,0.,15.,16.),vec3(14.,1.,30.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(96.0),((2.53)-q.y)/.055),vec4(0.,0.,14.,17.),vec3(16.,17.,14.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(102.0),((2.53)-q.y)/.055),vec4(16.,16.,30.,17.),vec3(17.,17.,17.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(108.0),((2.53)-q.y)/.055),vec4(0.,0.,14.,17.),vec3(31.,16.,14.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(114.0),((2.53)-q.y)/.055),vec4(0.,0.,15.,16.),vec3(14.,1.,30.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(126.0),((2.53)-q.y)/.055),vec4(17.,27.,21.,21.),vec3(17.,17.,17.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(132.0),((2.53)-q.y)/.055),vec4(0.,0.,17.,17.),vec3(17.,19.,13.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(138.0),((2.53)-q.y)/.055),vec4(0.,0.,15.,16.),vec3(14.,1.,30.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(144.0),((2.53)-q.y)/.055),vec4(0.,0.,14.,17.),vec3(31.,16.,14.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(150.0),((2.53)-q.y)/.055),vec4(0.,0.,17.,17.),vec3(17.,19.,13.)));
c=mix(c,vec3(.51,.15,.15),rgmcLegacyGlyph116(vec2(((W*(0.455000000))-q.x)/W/(0.0021604938)-(156.0),((2.53)-q.y)/.055),vec4(0.,0.,26.,21.),vec3(21.,21.,21.)));
return c;}

float rgmc116Rect(vec2 p,vec2 c,vec2 h){vec2 aa=max(fwidth(p),vec2(.012));vec2 d=1.-smoothstep(h-aa,h+aa,abs(p-c));return d.x*d.y;}
vec3 roemischGermanischesComplete116(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(abs(family-4939.)<.25){vec3 legacyP=p;legacyP.y=p.y/2.5;return rgmcLegacyWest116(base,legacyP,normal,frame,family);}if(abs(family-6400.)>.25)return base;float role=floor(frame.z-1000.+.5);vec2 q=frame.xy;float y=p.y;
if(role<.5){vec2 seam=abs(fract(q/vec2(1.05,5.2)+.5)-.5)*vec2(1.05,5.2);float line=1.-smoothstep(.012,.045,min(seam.x,seam.y));float tone=.008*sin(q.x*.3)*sin(q.y*.7);return mix(vec3(.20,.21,.20)+tone,vec3(.15,.16,.15),line*.55);}
if(role<3.5){bool south=role>1.5&&role<2.5;bool court=role>2.5;y=p.y/2.5;vec2 wall=vec2(abs(normal.z)>.7?q.x:q.y,y);float module=2.00748;vec2 seam=abs(fract((wall-vec2(0.,1.75))/vec2(module,.8125)+.5)-.5)*vec2(module,.8125);float joint=1.-smoothstep(.01,.04,min(seam.x,seam.y));vec3 col=mix(vec3(.72,.72,.68),vec3(.54,.55,.51),joint*.55);if((south&&y<1.75)||(court&&y<4.7)){col=vec3(.14,.19,.18);float bar=1.-smoothstep(.025,.055,abs(mod(wall.x+.53,1.06)-.53));col=mix(col,vec3(.28,.31,.29),bar);col=mix(col,vec3(.3,.32,.3),rgmc116Rect(wall,vec2(0.,.14),vec2(100.,.09)));}if(!south&&!court&&y<1.75)col=vec3(.45,.46,.43);col=mix(col,vec3(.50,.51,.47),1.-smoothstep(.04,.10,abs(y-1.77)));return col;}
if(role<4.5)return mix(vec3(.82,.86,.84),vec3(.94,.96,.94),smoothstep(.3,.95,normal.y));
if(role<5.5){y=p.y-7.5;vec3 col=vec3(.22,.17,.15);if(normal.x<-.7){float slot=rgmc116Rect(vec2(q.y,y),vec2(16.25,6.35),vec2(9.7,.47));float div=1.-smoothstep(.12,.18,abs(mod(q.y-6.8,3.3)-1.65));col=mix(col,vec3(.09,.12,.12),slot*(1.-div));col=mix(col,vec3(.58,.55,.46),rgmc116Rect(vec2(q.y,y),vec2(16.25,5.88),vec2(9.7,.045)));}return col;}
return base;}
`;
