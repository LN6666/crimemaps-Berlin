export const infillFrankfurtLowOfficeBatch2OwnerPaintGLSL=/*glsl*/`

float fraLow2Line(float x,float period,float halfWidth){float fw=max(fwidth(x),.0001);float d=abs(fract(x/period+.5)-.5)*period;return mix(1.0-smoothstep(halfWidth-fw*.5,halfWidth+fw*.5,d),clamp(2.0*halfWidth/period,0.0,1.0),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtLowOfficeBatch2PaintBase50(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family<34195.5||family>34199.5)return base;
 p.xz=frame.xz; // own bound common frame, not renderer global style XY
 if(normal.y<-.5)return vec3(.56,.59,.59);
 // Roof longitudinal direction is registered to the DOP; no glass/PV identity claim.
 float along=dot(p.xz,normalize(vec2(.86,.51)));
 float across=dot(p.xz,normalize(vec2(-.51,.86)));
 if(normal.y>.5){
  float fw=max(fwidth(along),.05);
  float center=1.0-smoothstep(25.5-fw,27.0+fw,abs(along));
  float grid=1.0-(1.0-fraLow2Line(along,1.8,.026))*(1.0-fraLow2Line(across,1.6,.026));
  vec3 roof=mix(vec3(.75,.77,.73),vec3(.52,.65,.66),center);
  return mix(roof,roof*.78,grid*.50);
 }
 float u=dot(p.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001)));
 float post=fraLow2Line(u,1.65,.085),floorBand=fraLow2Line(p.y-1.4,3.75,.17);
 float internal=fraLow2Line(p.y-.35,1.25,.022);
 float majorFrame=1.0-(1.0-post)*(1.0-floorBand);
 vec3 glass=mix(vec3(.38,.47,.50),vec3(.54,.60,.61),internal*.30);
 return mix(glass,vec3(.63,.65,.65),majorFrame*.92);
}

float fd701Line(float x,float period,float hw){float fw=max(fwidth(x),.0001),d=abs(fract(x/period+.5)-.5)*period;return mix(1.-smoothstep(hw-fw*.5,hw+fw*.5,d),clamp(2.*hw/period,0.,1.),smoothstep(period*.18,period*.60,fw));}
vec3 infillFrankfurtLowOfficeBatch2Paint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 c=infillFrankfurtLowOfficeBatch2PaintBase50(base,p,normal,frame,family);
 if(abs(normal.y)>.40)return c;
 float u=dot(frame.xz,normalize(vec2(normal.z+.000001,-normal.x+.000001))),y=p.y,w=1.65,h=3.75;
 float pane=step(c.r*1.10,c.b)*step(c.r,.48)*step(.10,c.b);
 float seal=fd701Line(u-.09,w,.018),secondary=fd701Line(u+w*.5,w,.023),transom=fd701Line(y-h*.57,h,.024);
 float reveal=fd701Line(u-.15,w,.045),sill=fd701Line(y-h*.18,h,.036),sillLip=fd701Line(y-h*.18-.055,h,.016);
 c=mix(c,c*.72,reveal*pane*.34);
 c=mix(c,vec3(.55,.60,.59),max(seal,max(secondary,transom))*pane*.63);
 c=mix(c,base*.72,sill*pane*.32);c=mix(c,base*1.04,sillLip*pane*.45);
 return c;
}

`;
