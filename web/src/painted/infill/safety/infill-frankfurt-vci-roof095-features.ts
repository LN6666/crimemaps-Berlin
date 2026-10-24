export const VCI_ROOF095_GLSL=/*glsl*/`
float vci095Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
float vci095Segment(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-clamp(dot(p-a,v)/max(dot(v,v),.000001),0.,1.)*v);}
float vci095Quad(vec2 p,vec2 a,vec2 b,vec2 c,vec2 d){
 vec2 points[4]=vec2[4](a,b,c,d);float distanceToEdge=1.e6;bool positive=true,negative=true;
 for(int i=0;i<4;i++){vec2 x=points[i],y=points[(i+1)%4],v=y-x,q=p-x;float side=v.x*q.y-v.y*q.x;positive=positive&&side>=0.;negative=negative&&side<=0.;distanceToEdge=min(distanceToEdge,vci095Segment(p,x,y));}
 float sd=(positive||negative)?-distanceToEdge:distanceToEdge,aa=max(fwidth(p.x)+fwidth(p.y),.025);
 return 1.-smoothstep(-aa,aa,sd);
}
float vci095Polygon8(vec2 p,vec2 points[8]){
 bool inside=false;float distanceToEdge=1.e6;
 for(int i=0;i<8;i++){vec2 a=points[i],b=points[(i+1)%8];distanceToEdge=min(distanceToEdge,vci095Segment(p,a,b));if((a.y>p.y)!=(b.y>p.y)){float x=a.x+(p.y-a.y)*(b.x-a.x)/(b.y-a.y);if(p.x<x)inside=!inside;}}
 float sd=inside?-distanceToEdge:distanceToEdge,aa=max(fwidth(p.x)+fwidth(p.y),.025);return 1.-smoothstep(-aa,aa,sd);
}
vec3 vci095Roof(vec2 p){
 float pv=vci095Quad(p,vec2(-7.028539278,7.714256007),vec2(0.685711149,12.342814971),vec2(20.399906685,-19.199877601),vec2(12.857084045,-23.828409177));
 float plant=vci095Quad(p,vec2(-12.171372896,18.171376419),vec2(-5.314261405,22.457087434),vec2(-1.199994511,15.428523180),vec2(-8.228533789,10.971389676));
 vec2 servicePoints[8]=vec2[8](vec2(-5.485689193,5.142836097),vec2(-2.571416809,6.857115899),vec2(-0.514283362,3.428556847),vec2(1.199994511,4.457124331),vec2(3.428555745,0.685711193),vec2(1.542850085,-0.342855562),vec2(4.285694682,-4.628548248),vec2(1.199994511,-6.514251937));float service=vci095Polygon8(p,servicePoints);
 vec2 edge[15]=vec2[15](vec2(6.514397280,9.668106541),vec2(8.156382348,7.107754226),vec2(24.933186303,-20.388125755),vec2(19.007761927,-24.061653635),vec2(17.722730135,-24.840886494),vec2(16.651870308,-23.505058662),vec2(11.940087070,-26.399351876),vec2(8.798898244,-21.389997243),vec2(-3.480294438,-1.686490020),vec2(-5.479232781,1.430455648),vec2(-8.834593572,6.885114951),vec2(-13.546376810,14.454855477),vec2(-16.259221705,18.907649040),vec2(-3.980029023,26.588726682),vec2(0.374800939,19.686888299));float e=1.e6;
 for(int i=0;i<15;i++)e=min(e,vci095Segment(p,edge[i],edge[(i+1)%15]));
 float aa=max(fwidth(p.x)+fwidth(p.y),.025),coping=1.-smoothstep(.95-aa,1.45+aa,e);
 // Stable metric UV, independent of old per-triangle RGB or tessellation.
 vec3 colour=vec3(.70,.72,.68);
 float cells=1.-(1.-vci095Line(p.x*.64-p.y*.77,1.15,.025))*(1.-vci095Line(p.x*.77+p.y*.64,2.1,.025));
 vec3 pvColour=mix(vec3(.20,.29,.32),vec3(.46,.50,.51),cells*.60);
 colour=mix(colour,pvColour,pv);
 colour=mix(colour,vec3(.52,.54,.40),plant);
 // The visible upper service pad interrupts the PV strip; no precise fans added.
 colour=mix(colour,vec3(.72,.73,.69),service);
 return mix(colour,vec3(.79,.80,.74),coping);
}
vec3 vciRoof095Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 original=infillFrankfurtVCI051Paint(base,p,normal,frame,family);
 if(family!=34201.||frame.w!=95.||normal.y<.999999||abs(frame.y-36.924)>.0001)return original;
 return vci095Roof(frame.xz);
}
`;
export const VCI_ROOF095_GUARD=" if(family==34201.)return vciRoof095Paint(base,p,normal,frame,family);\n";

export function vciRoof095PartitionSource(source:string,key:string,city:string){
 if(city==='frankfurt'&&key==='infill-frankfurt-vci-roof095')return source;
 const definitions=source.split(VCI_ROOF095_GLSL).length-1,calls=source.split(VCI_ROOF095_GUARD).length-1;
 if(definitions>1||calls>1)throw Error('VCI095 duplicate private source');
 const scoped=source.replace(VCI_ROOF095_GLSL,'').replace(VCI_ROOF095_GUARD,'');
 if(/\bvci(?:095|Roof095)[A-Za-z0-9_]*\s*\(/.test(scoped))throw Error('VCI095 leaked outside own private programme');
 return scoped;
}
