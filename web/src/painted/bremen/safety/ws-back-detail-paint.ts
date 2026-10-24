export const WS_BACK_DETAIL_GLSL=String.raw`
float wbdLine(float x,float w){return 1.-smoothstep(w,w+max(fwidth(x),.014),abs(x));}
float wbdBox(vec2 p,vec2 at,vec2 h){vec2 aa=max(fwidth(p),vec2(.022));vec2 a=1.-smoothstep(h-aa,h+aa,abs(p-at));return a.x*a.y;}
vec3 wbdBrick(float u,float y){float row=floor(y/.16),shift=u+mod(row,2.)*.18;float mortar=max(wbdLine(mod(shift,.36)-.18,.008),wbdLine(mod(y,.16)-.08,.007));vec3 c=vec3(.52,.32,.265)+vec3(.016,.010,.009)*sin(floor(shift/.36)*3.2+row*2.1);return mix(c,vec3(.64,.56,.45),mortar*.34);}
void wbdWindow(inout vec3 c,vec2 p,vec2 at,vec2 h){float trim=wbdBox(p,at,h+vec2(.115)),pane=wbdBox(p,at,h);vec3 pale=vec3(.84,.835,.76);c=mix(c,pale,trim);vec3 glass=mix(vec3(.22,.29,.29),vec3(.42,.46,.42),clamp((p.y-at.y+h.y)/(2.*h.y),0.,1.));c=mix(c,glass,pane);float bars=max(wbdLine(p.x-at.x,.038),wbdLine(p.y-at.y,.038));c=mix(c,pale,bars*pane);float sill=wbdBox(p,at-vec2(0.,h.y+.14),vec2(h.x+.17,.055));c=mix(c,vec3(.72,.70,.61),sill);}
vec3 wsBackDetailPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 float u=frame.x,v=frame.y,y=p.y;vec2 q=vec2(u,y);vec3 c=wbdBrick(u,y);if(y<2.7)c=vec3(.66,.65,.58);
 if(family==46922.){float center=u< -34.5?-35.53:-32.86;wbdWindow(c,q,vec2(center,18.1),vec2(.54,.83));return c;}
 if(family==46921.){
  if(y<14.3){for(int j=0;j<3;j++){float x=-35.65+float(j)*4.06;for(int k=0;k<2;k++)wbdWindow(c,q,vec2(x,5.05+float(k)*4.65),vec2(.76,1.08));}float band=max(wbdLine(y-2.8,.075),wbdLine(y-12.2,.085));c=mix(c,vec3(.76,.70,.59),band);}
  return c;
 }
 if(family!=46920.)return base;
 float lo=0.,hi=0.,peak=0.,axes=0.;bool modern=false;
 if(u>=-25.6&&u< -14.44){lo=-25.41;hi=-14.44;peak=-19.59;axes=3.;}
 else if(u>=-14.44&&u< -1.84){lo=-14.44;hi=-1.84;peak=-7.99;axes=3.;}
 else if(u>=-1.84&&u<9.99){lo=-1.84;hi=9.99;peak=4.85;axes=6.;modern=true;}
 else if(u>=9.99&&u<=26.9){lo=9.99;hi=26.67;peak=20.59;axes=6.;modern=true;}
 else return c;
 float width=hi-lo;
 if(!modern){
  for(int j=0;j<3;j++){float x=lo+(float(j)+.5)*width/3.;for(int k=0;k<4;k++)wbdWindow(c,q,vec2(x,5.1+float(k)*4.15),vec2(.83,1.30));float basement=wbdBox(q,vec2(x,1.7),vec2(.66,.57));float bars=wbdLine(mod(u,.24)-.12,.023);c=mix(c,mix(vec3(.17,.19,.175),vec3(.47,.47,.41),bars),basement);}
  for(int j=-1;j<=1;j++)wbdWindow(c,q,vec2(peak+float(j)*width*.245,22.95),vec2(.42,.50));
  for(int j=0;j<2;j++)wbdWindow(c,q,vec2(peak+(float(j)-.5)*width*.24,25.10),vec2(.34,.43));wbdWindow(c,q,vec2(peak,27.10),vec2(.31,.38));
  float line=max(wbdLine(y-3.05,.075),wbdLine(y-21.0,.09));c=mix(c,vec3(.75,.70,.59),line);return c;
 }
 vec3 pale=vec3(.81,.805,.735);c=mix(c,pale,.40);
 for(int j=0;j<6;j++){float x=lo+(float(j)+.5)*width/6.;for(int k=0;k<4;k++){float cy=5.1+float(k)*4.15;float trim=wbdBox(q,vec2(x,cy),vec2(width/12.-.03,1.73)),pane=wbdBox(q,vec2(x,cy),vec2(width/12.-.25,1.40));c=mix(c,pale,trim);c=mix(c,vec3(.29,.35,.35),pane);float bars=max(wbdLine(u-x,.034),wbdLine(y-cy,.036));c=mix(c,pale,bars*pane);}
  float ground=wbdBox(q,vec2(x,1.7),vec2(width/12.-.34,.52));c=mix(c,vec3(.24,.29,.27),ground);
 }
 float structural=max(wbdLine(u-lo-.12,.14),wbdLine(u-hi+.12,.14));for(int k=0;k<5;k++)structural=max(structural,wbdLine(y-3.02-float(k)*4.15,.15));c=mix(c,pale,structural);
 // Separate pale framed attic bays stay within the real gable walls; the triangular roof is never glazed.
 for(int j=-1;j<=1;j++)wbdWindow(c,q,vec2(peak+float(j)*width*.15,23.05),vec2(.43,.71));wbdWindow(c,q,vec2(peak,25.00),vec2(.40,.57));
 return c;
}
`;
