/** Nine SOURCE-only registered planes. Stations are explicit photo proportions;
 * industrial transom/grille bays, paired bank openings, two-floor shopglass and
 * a glass pavilion have distinct programs. Unknown faces receive base material.
 * Roofs use continuous metric UV on the actual official/photo geometry. */
export const FRANKFURT_GROUPS144146_GLSL073=`
float fg144Rect(vec2 q,vec2 a,vec2 b){vec2 w=max(fwidth(q)*.8,vec2(.012));return smoothstep(a.x-w.x,a.x+w.x,q.x)*(1.-smoothstep(b.x-w.x,b.x+w.x,q.x))*smoothstep(a.y-w.y,a.y+w.y,q.y)*(1.-smoothstep(b.y-w.y,b.y+w.y,q.y));}
float fg144Line(float v,float period,float width){float d=abs(fract(v/period+.5)-.5)*period;return 1.-smoothstep(width,max(width+.012,width+fwidth(v)),d);}
vec3 fg144Glass(vec2 q){return mix(vec3(.22,.29,.28),vec3(.42,.48,.45),clamp(q.y/32.,0.,1.));}
vec3 fg144Window(vec3 wall,vec2 q,vec2 a,vec2 b,float divisions){float outer=fg144Rect(q,a-vec2(.075),b+vec2(.075));float inner=fg144Rect(q,a,b);vec3 c=mix(wall,vec3(.24,.27,.26),outer);float line=fg144Line((q.x-a.x)/max(b.x-a.x,.1),1./divisions,.014);return mix(c,mix(fg144Glass(q),vec3(.19,.22,.21),line),inner);}
vec3 frankfurtGroups144146Official073(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec2 q=frame.xy;
 if(abs(family-45350.)<.25||abs(family-45351.)<.25){
  vec3 c=vec3(.77,.77,.72);bool shortEnd=abs(family-45351.)<.25;float pitch=shortEnd?max(frame.w/6.,.1):2.;float u=mod(q.x,pitch);float side=shortEnd?.44:.28;float width=shortEnd?min(1.38,pitch-.8):1.44;
  for(int j=0;j<5;j++){
   float y=2.3+5.05*float(j);vec2 a=vec2(side,y),b=vec2(side+width,y+3.35);float opening=fg144Rect(vec2(u,q.y),a,b);float upper=fg144Rect(vec2(u,q.y),vec2(side,y+2.45),b);vec3 recess=vec3(.52,.54,.51);float grille=fg144Line(q.y-y,.14,.018);recess-=vec3(grille*.07);float pane=max(fg144Line(u-side,.24,.022),fg144Line(q.y-y-2.45,.25,.022));vec3 transom=mix(vec3(.38,.43,.40),vec3(.18,.21,.20),pane);c=mix(c,recess,opening);c=mix(c,transom,upper);
  }
  float louvre=fg144Rect(vec2(u,q.y),vec2(side,28.),vec2(side+width,32.9));c=mix(c,vec3(.18,.20,.19)-vec3(fg144Line(q.y,.12,.019)*.04),louvre);return c;
 }
 if(abs(family-45352.)<.25)return vec3(.77,.77,.72);
 if(abs(family-45353.)<.25||abs(family-45358.)<.25){vec3 c=abs(family-45353.)<.25?vec3(.51,.52,.49):vec3(.56,.56,.51);return c+vec3(.008*sin(q.x*2.4)*sin(q.y*2.1));}
 if(abs(family-45354.)<.25){vec3 c=vec3(.76,.72,.61);float u=mod(q.x,2.15);for(int j=0;j<4;j++){float y=1.65+7.15*float(j);c=fg144Window(c,vec2(u,q.y),vec2(.56,y),vec2(1.58,y+5.35),2.);float middle=fg144Rect(vec2(u,q.y),vec2(.56,y+2.58),vec2(1.58,y+2.70));c=mix(c,vec3(.22,.24,.23),middle);}return c;}
 if(abs(family-45355.)<.25){vec3 c=vec3(.79,.76,.66);float cols=frame.w<40.?8.:12.;float pitch=frame.w/max(cols,1.);float u=mod(q.x,pitch);for(int j=0;j<5;j++){float y=8.3+4.10*float(j);c=fg144Window(c,vec2(u,q.y),vec2(pitch*.28,y),vec2(pitch*.72,y+2.5),2.);}return c-vec3(fg144Line(q.y,.72,.007)*.018);}
 if(abs(family-45356.)<.25){vec3 c=fg144Glass(q);float line=max(fg144Line(q.x,1.35,.025),fg144Line(q.y-3.6,3.6,.035));c=mix(c,vec3(.19,.23,.22),line);return mix(vec3(.52,.51,.46),c,smoothstep(.25,.4,q.y));}
 if(abs(family-45357.)<.25)return vec3(.79,.76,.66)-vec3(fg144Line(q.y,.72,.006)*.014);
 if(abs(family-45359.)<.25)return mix(vec3(.62,.43,.34),vec3(.88,.85,.76),smoothstep(1.02,1.08,q.y));
 if(abs(family-45360.)<.25)return vec3(.34,.36,.36)-vec3(fg144Line(q.x*.45+q.y,.26,.008)*.02);
 if(abs(family-45361.)<.25){vec3 c=fg144Glass(q);float line=fg144Line(q.x,1.6,.035);c=mix(c,vec3(.19,.22,.21),line);return mix(vec3(.56,.56,.52),c,fg144Rect(q,vec2(-1000.,.4),vec2(1000.,3.8)));}
 if(abs(family-45362.)<.25)return vec3(.29,.31,.31);
 if(abs(family-45363.)<.25){vec3 c=mix(vec3(.26,.34,.34),vec3(.48,.57,.56),clamp(q.y/max(frame.z,.1),0.,1.));float frameLine=fg144Line(q.x,1.55,.025);float upper=smoothstep(frame.z-.95,frame.z-.88,q.y);float louvre=fg144Line(q.y,.105,.015)*upper;return mix(c,vec3(.22,.27,.27),max(frameLine,louvre));}
 if(abs(family-45364.)<.25){return normal.y<-.3?vec3(.24,.28,.28):vec3(.32,.36,.36);}
 if(abs(family-45365.)<.25)return vec3(.79,.77,.69);
 if(abs(family-45368.)<.25)return vec3(.62,.61,.56);
 return base;
}
`;

const KG084_HELPERS_GLSL="// 084 markers are bound only by genuine private073 outputs. Stations below are\n// the two author photographs' own front/return proportions, not surveyed sizes.\nfloat kg084At(float value,float station,float halfWidth){float aa=max(fwidth(value)*.8,.004);return 1.-smoothstep(halfWidth,halfWidth+aa,abs(value-station));}\nvec3 kioskGlazing084(vec3 base,vec3 normal,vec4 f){\n bool front=abs(f.w-84.)<.01&&dot(normal,vec3(-.89756,0.,-.44089))>.995;\n bool north=abs(f.w-85.)<.01&&dot(normal,vec3(-.440,0.,.898))>.995;\n bool south=abs(f.w-86.)<.01&&dot(normal,vec3(.227,0.,-.974))>.995;\n bool fold=abs(f.w-87.)<.01&&dot(normal,vec3(-.185,0.,.983))>.995;\n if(!(front||north||south||fold)||!(f.z>=2.8&&f.z<=3.4&&f.y>=-.02&&f.y<=f.z+.02))return base;\n vec2 q=f.xy;vec3 c=mix(vec3(.25,.34,.33),vec3(.46,.55,.53),clamp(q.y/max(f.z,.1),0.,1.));\n if(fold)return c;\n float line=kg084At(q.y,f.z-.06,.028);float length=front?12.538147114:north?5.461409915:3.158349748;\n if(!(q.x>=-.02&&q.x<=length+.02))return base;\n line=max(line,max(kg084At(q.x,0.,.026),kg084At(q.x,length,.026)));\n if(front||north)line=max(line,kg084At(q.y,1.943928913,.032));\n if(front){\n  line=max(line,max(kg084At(q.x,2.699494307,.027),max(kg084At(q.x,5.644397188,.027),kg084At(q.x,8.990877735,.027))));\n  // Partial lowering on only the first two front bays, as photograph02. The\n  // blinds are retracted in photograph01; rear/returns receive no blind band.\n  float band=fg144Rect(q,vec2(.07,2.075720704),vec2(2.644494307,3.130055030))+fg144Rect(q,vec2(2.754494307,2.075720704),vec2(5.589397188,3.130055030));\n  float slat=fg144Line(q.y-2.075720704,.105,.022);vec3 blind=mix(vec3(.30,.37,.35),vec3(.64,.67,.62),slat);c=mix(c,blind,clamp(band,0.,1.));\n  // The second-bay entry reaches the preserved lower plane. No sill, step or\n  // invented open-leaf geometry is added; two slim handles are photo details.\n  float door=fg144Rect(q,vec2(3.234931195,-.05),vec2(5.220509652,1.943928913));c=mix(c,vec3(.20,.28,.27),door);\n  float jamb=max(kg084At(q.x,3.234931195,.027),kg084At(q.x,5.220509652,.027))*step(q.y,1.943928913);\n  float mid=kg084At(q.x,4.227720424,.018)*step(q.y,1.943928913);line=max(line,max(jamb,mid));\n  float handle=max(kg084At(q.x,4.117720424,.012),kg084At(q.x,4.337720424,.012))*fg144Rect(q,vec2(3.234931195,.82),vec2(5.220509652,1.28));c=mix(c,vec3(.65,.68,.65),handle);\n }\n return mix(c,vec3(.16,.21,.20),line);\n}\n";
const KG084_MARKED_CALL="if(abs(frame.w-84.)<.01||abs(frame.w-85.)<.01||abs(frame.w-86.)<.01||abs(frame.w-87.)<.01)return kioskGlazing084(base,normal,frame);";
export const KIOSK_GLAZING084_GLSL=FRANKFURT_GROUPS144146_GLSL073.replace('vec3 frankfurtGroups144146Official073(',KG084_HELPERS_GLSL+'vec3 frankfurtGroups144146Official073(').replace(" if(abs(family-45363.)<.25){vec3 c="," if(abs(family-45363.)<.25){"+KG084_MARKED_CALL+'vec3 c=');
/** Keep every unrelated private programme byte-identical to its pre084 source,
 * including legacy builders that retain an unused independent source prefix. */
export function kioskGlazing084PartitionSource(source:string,key:string,city:string){
 if(city==='frankfurt'&&key==='infill-frankfurt-groups144146-official073')return source;
 const helpers=source.split(KG084_HELPERS_GLSL).length-1,calls=source.split(KG084_MARKED_CALL).length-1;
 if(helpers>1||calls>1)throw Error('Kiosk084 duplicate private source or marked call');
 const scoped=source.replace(KG084_HELPERS_GLSL,'').replace(KG084_MARKED_CALL,'');
 if(/\b(?:kg084At|kioskGlazing084)\s*\(/.test(scoped))throw Error('Kiosk084 source leaked outside its private partition');
 return scoped;
}
