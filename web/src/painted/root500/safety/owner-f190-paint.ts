export const OWNER_F190_PAINT_GLSL=`
float lib190line(float x,float w){return 1.-smoothstep(w,w+max(fwidth(x),.01),abs(x));}
float lib190box(vec2 q,vec2 halfsize){vec2 a=1.-smoothstep(halfsize,halfsize+vec2(.02),abs(q));return a.x*a.y;}

float lib190glyph(float code,vec2 q){
 if(q.x<0.||q.x>=5.||q.y<0.||q.y>=7.)return 0.;float row=floor(q.y),bits=0.;
 if(abs(code-65.)<.25){if(abs(row-0.)<.25)bits=14.;if(abs(row-1.)<.25)bits=17.;if(abs(row-2.)<.25)bits=17.;if(abs(row-3.)<.25)bits=31.;if(abs(row-4.)<.25)bits=17.;if(abs(row-5.)<.25)bits=17.;if(abs(row-6.)<.25)bits=17.;}
 if(abs(code-66.)<.25){if(abs(row-0.)<.25)bits=30.;if(abs(row-1.)<.25)bits=17.;if(abs(row-2.)<.25)bits=17.;if(abs(row-3.)<.25)bits=30.;if(abs(row-4.)<.25)bits=17.;if(abs(row-5.)<.25)bits=17.;if(abs(row-6.)<.25)bits=30.;}
 if(abs(code-69.)<.25){if(abs(row-0.)<.25)bits=31.;if(abs(row-1.)<.25)bits=16.;if(abs(row-2.)<.25)bits=16.;if(abs(row-3.)<.25)bits=30.;if(abs(row-4.)<.25)bits=16.;if(abs(row-5.)<.25)bits=16.;if(abs(row-6.)<.25)bits=31.;}
 if(abs(code-72.)<.25){if(abs(row-0.)<.25)bits=17.;if(abs(row-1.)<.25)bits=17.;if(abs(row-2.)<.25)bits=17.;if(abs(row-3.)<.25)bits=31.;if(abs(row-4.)<.25)bits=17.;if(abs(row-5.)<.25)bits=17.;if(abs(row-6.)<.25)bits=17.;}
 if(abs(code-73.)<.25){if(abs(row-0.)<.25)bits=31.;if(abs(row-1.)<.25)bits=4.;if(abs(row-2.)<.25)bits=4.;if(abs(row-3.)<.25)bits=4.;if(abs(row-4.)<.25)bits=4.;if(abs(row-5.)<.25)bits=4.;if(abs(row-6.)<.25)bits=31.;}
 if(abs(code-75.)<.25){if(abs(row-0.)<.25)bits=17.;if(abs(row-1.)<.25)bits=18.;if(abs(row-2.)<.25)bits=20.;if(abs(row-3.)<.25)bits=24.;if(abs(row-4.)<.25)bits=20.;if(abs(row-5.)<.25)bits=18.;if(abs(row-6.)<.25)bits=17.;}
 if(abs(code-76.)<.25){if(abs(row-0.)<.25)bits=16.;if(abs(row-1.)<.25)bits=16.;if(abs(row-2.)<.25)bits=16.;if(abs(row-3.)<.25)bits=16.;if(abs(row-4.)<.25)bits=16.;if(abs(row-5.)<.25)bits=16.;if(abs(row-6.)<.25)bits=31.;}
 if(abs(code-79.)<.25){if(abs(row-0.)<.25)bits=14.;if(abs(row-1.)<.25)bits=17.;if(abs(row-2.)<.25)bits=17.;if(abs(row-3.)<.25)bits=17.;if(abs(row-4.)<.25)bits=17.;if(abs(row-5.)<.25)bits=17.;if(abs(row-6.)<.25)bits=14.;}
 if(abs(code-82.)<.25){if(abs(row-0.)<.25)bits=30.;if(abs(row-1.)<.25)bits=17.;if(abs(row-2.)<.25)bits=17.;if(abs(row-3.)<.25)bits=30.;if(abs(row-4.)<.25)bits=20.;if(abs(row-5.)<.25)bits=18.;if(abs(row-6.)<.25)bits=17.;}
 if(abs(code-84.)<.25){if(abs(row-0.)<.25)bits=31.;if(abs(row-1.)<.25)bits=4.;if(abs(row-2.)<.25)bits=4.;if(abs(row-3.)<.25)bits=4.;if(abs(row-4.)<.25)bits=4.;if(abs(row-5.)<.25)bits=4.;if(abs(row-6.)<.25)bits=4.;}
 if(abs(code-89.)<.25){if(abs(row-0.)<.25)bits=17.;if(abs(row-1.)<.25)bits=17.;if(abs(row-2.)<.25)bits=10.;if(abs(row-3.)<.25)bits=4.;if(abs(row-4.)<.25)bits=4.;if(abs(row-5.)<.25)bits=4.;if(abs(row-6.)<.25)bits=4.;}
 float ink=mod(floor(bits/exp2(4.-floor(q.x))),2.);vec2 f=fract(q);return ink*step(.07,f.x)*step(.07,f.y);
}
const uint LIB190_ARABIC_BITS[128]=uint[128](0u,0u,786432u,0u,0u,0u,1015808u,0u,0u,0u,1044480u,0u,14576u,0u,1048064u,0u,30960u,0u,131040u,0u,14576u,0u,16376u,0u,0u,0u,2046u,0u,0u,0u,127u,0u,0u,1325056u,31u,0u,0u,1865728u,15u,0u,30720u,1865728u,31u,0u,63488u,0u,62u,0u,65408u,0u,124u,0u,65504u,0u,248u,245760u,64504u,0u,496u,2093056u,61692u,0u,992u,4193280u,61502u,245820u,4032u,8388096u,127039u,245820u,8064u,8142336u,127007u,245820u,16128u,16260864u,129055u,245820u,32256u,16256768u,130111u,245820u,130560u,16256896u,262142u,507966u,261632u,16254848u,262142u,516222u,1048448u,16519104u,16762876u,16777215u,16752639u,8388607u,16744672u,16777215u,16715775u,4194303u,16711680u,16777215u,16516095u,2097151u,16515072u,16269249u,12583039u,258175u,0u,0u,0u,0u,0u,0u,0u,0u,0u,62u,0u,0u,0u,60u,0u,0u,0u,60u,0u,0u);
const uint LIB190_KOREAN_BITS[128]=uint[128](0u,0u,14336u,458752u,0u,0u,14336u,458752u,0u,0u,14336u,458752u,16777200u,1835009u,14694400u,462847u,16777200u,1835009u,14694400u,462847u,16777200u,1835009u,14694400u,462847u,48u,786432u,14336u,462336u,112u,786432u,14336u,462336u,112u,786432u,14336u,462336u,112u,786432u,14336u,462350u,112u,917504u,14336u,16715278u,112u,917504u,14336u,16713230u,112u,1966080u,16382u,16713230u,112u,1966080u,16382u,460558u,112u,2031616u,16382u,460558u,16777200u,4128771u,14336u,458766u,16777200u,4128771u,16267264u,491519u,16777200u,7569409u,16267264u,491519u,16384u,7569408u,16267264u,459775u,57344u,14794752u,14336u,458752u,57344u,14794752u,14337u,458753u,57344u,12640256u,8402945u,458755u,57344u,12644352u,8402947u,458755u,57344u,8419328u,8402951u,3u,57344u,15360u,8402959u,3u,57344u,15360u,8402950u,3u,57344u,7168u,8402944u,3u,16777215u,2111u,8402944u,3u,16777215u,63u,8402944u,524287u,16777215u,31u,8402944u,524287u,0u,0u,8402944u,524287u,0u,0u,14336u,0u);
float lib190NonLatin(vec2 uv,float face){
 if(face<2.5||face>4.5)return 0.;
 float width=face<3.5?5.3:6.3;
 vec2 q=vec2((uv.x-1.5)/width*96.,(39.-uv.y)/1.4*32.);
 if(q.x<0.||q.x>=96.||q.y<0.||q.y>=32.)return 0.;
 int x=int(floor(q.x)),row=int(floor(q.y)),index=row*4+x/24;
 uint bits=face<3.5?LIB190_ARABIC_BITS[index]:LIB190_KOREAN_BITS[index];
 return float((bits>>uint(x%24))&1u);
}

float lib190sign(vec2 uv,float face){float ink=0.;vec2 q=vec2((uv.x-1.5)/.20,(39.-uv.y)/.20);
 if(abs(face-1.)<.25){ink=max(ink,lib190glyph(66.,q-vec2(0.,0.)));ink=max(ink,lib190glyph(73.,q-vec2(6.,0.)));ink=max(ink,lib190glyph(66.,q-vec2(12.,0.)));ink=max(ink,lib190glyph(76.,q-vec2(18.,0.)));ink=max(ink,lib190glyph(73.,q-vec2(24.,0.)));ink=max(ink,lib190glyph(79.,q-vec2(30.,0.)));ink=max(ink,lib190glyph(84.,q-vec2(36.,0.)));ink=max(ink,lib190glyph(72.,q-vec2(42.,0.)));ink=max(ink,lib190glyph(69.,q-vec2(48.,0.)));ink=max(ink,lib190glyph(75.,q-vec2(54.,0.)));}
 if(abs(face-2.)<.25){ink=max(ink,lib190glyph(76.,q-vec2(0.,0.)));ink=max(ink,lib190glyph(73.,q-vec2(6.,0.)));ink=max(ink,lib190glyph(66.,q-vec2(12.,0.)));ink=max(ink,lib190glyph(82.,q-vec2(18.,0.)));ink=max(ink,lib190glyph(65.,q-vec2(24.,0.)));ink=max(ink,lib190glyph(82.,q-vec2(30.,0.)));ink=max(ink,lib190glyph(89.,q-vec2(36.,0.)));}
return max(ink,lib190NonLatin(uv,face));}
// family is routed by the integrator; frame=(faceU,height,faceWidth,faceId,family).
// South Arabic and East Korean words confirmed from facade photographs; font/spacing are approximations.
vec3 stadtbibliothekRecovery135(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(frame.w>4.5&&frame.w<5.5){
  float y=frame.y,u=frame.x;
  float bars=max(lib190line(mod(u,.18)-.09,.018),lib190line(mod(u,2.2)-1.1,.035));
  float rails=max(lib190line(y-.92,.035),lib190line(y-.08,.025));
  if(max(bars,rails)<.2)discard;
  return vec3(.57,.60,.59);
 }
 if(frame.w<.5&&normal.y>.8){
  // LGL DOP20 orthophoto: finite registered glazing bounds, north-up in native local metres.
  float u=.998894*frame.x-.047027*frame.y,v=.047027*frame.x+.998894*frame.y;
  vec3 roof=vec3(.43,.46,.45);
  float fine=max(lib190line(mod(u,.18)-.09,.013),lib190line(mod(v,.18)-.09,.013));
  roof=mix(roof,vec3(.32,.35,.34),fine*.16);
  float joints=max(lib190line(mod(u+22.2,2.75)-1.375,.025),lib190line(mod(v+22.2,2.75)-1.375,.025));
  roof=mix(roof,vec3(.61,.63,.60),joints*.38);
  float glass=lib190box(vec2(u+.45,v-.15),vec2(12.75,12.65));
  float border=lib190box(vec2(u+.45,v-.15),vec2(13.00,12.90))-glass;
  roof=mix(roof,vec3(.85,.85,.78),border);
  vec3 pane=vec3(.21,.29,.30);
  float small=max(lib190line(mod(u+.45,1.05)-.525,.018),lib190line(mod(v-.15,1.05)-.525,.018));
  pane=mix(pane,vec3(.34,.40,.40),small*.6);
  float ribs=lib190line(v-.15,.14);
  if(v>=.15){
   if(u<=-.3){for(int j=0;j<3;j++)ribs=max(ribs,lib190line(u-(-9.+float(j)*4.35),.12));}
   else for(int j=0;j<2;j++)ribs=max(ribs,lib190line(v-(4.45+float(j)*4.15),.12));
  }else{
   if(u>=-.3){for(int j=0;j<3;j++)ribs=max(ribs,lib190line(u-(-.3+float(j)*4.15),.12));}
   else for(int j=0;j<2;j++)ribs=max(ribs,lib190line(v-(-4.05-float(j)*4.15),.12));
  }
  pane=mix(pane,vec3(.84,.85,.78),ribs);
  roof=mix(roof,pane,glass);
  // Two observed narrow roof strips, neutral material only; no unverified equipment function or height.
  float strip=lib190box(vec2(u-16.3,v-.2),vec2(1.05,16.0));
  strip=max(strip,lib190box(vec2(u+7.4,v+19.3),vec2(9.0,.65)));
  return mix(roof,vec3(.31,.35,.34),strip*.70*(1.-glass));
 }
 if(frame.w<.5||frame.w>4.5||abs(normal.y)>.05)return base;
 float width=frame.z,x=frame.x,y=frame.y;
 vec3 concrete=vec3(.71,.72,.69),glassblock=vec3(.78,.81,.78),joint=vec3(.55,.57,.54),glaze=vec3(.23,.28,.27),c=concrete;
 if(x<-.03||x>width+.03||y<0.||y>40.)return base;
 if(y<36.){
  float px=width/9.,py=4.;vec2 q=vec2(mod(x,px)-px*.5,mod(y,py)-py*.5);
  float panel=lib190box(q,vec2(px*.407,1.57));
  float rim=lib190box(q,vec2(px*.417,1.62))-panel;c=mix(c,joint,rim*.65);c=mix(c,glassblock,panel);
  vec2 b=mod(q+vec2(px*.417,1.60),vec2(.24))-.12;
  float mortar=max(lib190line(b.x,.012),lib190line(b.y,.012));c=mix(c,concrete,mortar*panel*.7);
  float opening=lib190box(q,vec2(.66,1.03));float surround=lib190box(q,vec2(.73,1.10))-opening;
  c=mix(c,vec3(.49,.51,.47),surround);c=mix(c,glaze,opening);c=mix(c,vec3(.14,.18,.17),opening*smoothstep(.1,.27,q.y)*.62);
  float lower=opening*(1.-smoothstep(-.04,.02,q.y));float bars=max(lib190line(mod(q.x+.66,.12)-.06,.012),lib190line(q.y,.020));
  c=mix(c,vec3(.57,.59,.55),bars*lower);
 }
 // Four equal centre-axis entries are supported by Siedle, the installed-system supplier.
 // Width/depth appearance is a photo approximation, no actual hole or added building volume.
 float ex=x-width*.5;
 if(y<3.8&&abs(ex)<width/18.){
  float side=smoothstep(1.7,2.45,abs(ex));c=mix(vec3(.16,.20,.20),vec3(.47,.49,.47),side);
  if(y>3.3)c=vec3(.32,.35,.33);
  if(y<.13)c=vec3(.55,.56,.52);
  if(abs(ex)<1.55&&y>.15&&y<3.28){c=vec3(.24,.30,.31);float metal=max(lib190line(ex,.035),lib190line(abs(ex)-1.5,.035));c=mix(c,vec3(.65,.68,.66),metal);}
 }
 float seams=max(lib190line(mod(x,width/9.),.012),lib190line(y-36.,.018));c=mix(c,joint,seams*.35);
 c=mix(c,vec3(.86,.87,.85),lib190sign(vec2(x,y),frame.w));
 return c;
}

`;
