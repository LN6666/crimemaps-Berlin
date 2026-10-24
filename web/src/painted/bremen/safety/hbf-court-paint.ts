export const HBF_COURT_MATERIAL_GLSL=String.raw`
float hcmLine(float x,float width){return 1.-smoothstep(width,width+max(fwidth(x),.012),abs(x));}
float hcmRect(float x,float y,float hw,float lo,float hi){float d=max(abs(x)-hw,max(lo-y,y-hi));return 1.-smoothstep(-.025,.025+max(fwidth(x),fwidth(y)),d);}
vec3 hbfCourtMaterialPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family==47061.)return vec3(.57,.58,.55);
 if(family==47060.){
  float s=frame.x,y=frame.y,q=mod(s+1.8,3.6)-1.8;vec3 cream=vec3(.76,.755,.69),glass=vec3(.24,.32,.33),trim=vec3(.85,.85,.79);
  if(y>=17.1){float band=hcmRect(q,y,1.79,17.48,19.75),mullion=max(hcmLine(mod(s+.45,.9)-.45,.034),hcmLine(y-18.55,.035));return mix(cream,mix(glass,trim,mullion),band);}
  float aperture=hcmRect(q,y,1.02,14.32,16.48),border=hcmRect(q,y,1.10,14.24,16.56);vec3 c=mix(cream,trim,border);c=mix(c,glass,aperture);float cross=max(hcmLine(q,.035),hcmLine(y-15.72,.034));return mix(c,trim,cross*aperture);
 }
 return base;
}
`;
