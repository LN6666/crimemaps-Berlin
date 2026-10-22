/**
 * Small, complete fragment shader for the admitted Munich non-500 queue.
 *
 * The caller must use this shader only after confirming that every paint family
 * in the draw is one of the families handled below. Other draws keep using the
 * full facade shader.
 */
export const MUNICH_QUEUE_FRAGMENT_GLSL = `#version 300 es
precision highp float;

in vec4 v_paint_frame;
flat in float v_paint_family;
flat in vec3 v_munich_palette;
uniform float u_paint_mode;
uniform float u_paint_override;
in vec3 v_color;
in vec3 v_normal;
in vec3 v_local_position;
in float v_growth;
flat in float v_style;
flat in float v_selected;
uniform float u_opacity;
out vec4 color;

float mqAa(float d) {
  return max(fwidth(d), 0.0001);
}

float mqStroke(float signedDistance, float halfWidth) {
  float aa=mqAa(signedDistance);
  float w=max(halfWidth,0.0001);
  return 1.0-smoothstep(max(0.0,w-aa),w+aa,abs(signedDistance));
}

float mqRepeatStroke(float value, float period, float halfWidth) {
  float p=max(period,0.05);
  float d=abs(mod(value+0.5*p,p)-0.5*p);
  return mqStroke(d,halfWidth);
}

vec3 mqRoofPaint(vec3 base, vec3 p) {
  float seamX=mqRepeatStroke(p.x,2.8,0.018);
  float seamZ=mqRepeatStroke(p.z,1.45,0.014);
  float row=floor(p.z/1.45);
  float staggered=mqRepeatStroke(p.x+mod(row,2.0)*1.4,2.8,0.014);
  float seams=max(seamX,max(seamZ,staggered));
  return mix(base,base*0.88,seams*0.11);
}

vec3 mqPaintedFacade(vec3 base, vec3 p, vec3 normal, vec4 frame, float family) {
  if (family==372.0) {
    if(v_munich_palette.z>=0.0)return vec3(.70,.66,.56);
    vec2 delta=frame.xz-vec2(-1.746254,-11.080026);
    bool southernRoundRoof=dot(delta,delta)<=2.736508*2.736508 && frame.z<=-10.993+.1232245*(frame.x+4.511);
    return mqRoofPaint(southernRoundRoof?vec3(.62,.29,.18):vec3(.23,.22,.21),p);
  }
  if (family==373.0) {
    if(v_munich_palette.z<0.0)return mqRoofPaint(vec3(.56,.27,.17),p);
    bool entrance=dot(normalize(normal.xz),vec2(-.988002,.154443))>=.995 && frame.x<=-30.8 && frame.z>=-5.2 && frame.z<=13.95;
    return entrance?vec3(.43,.43,.40):vec3(.86,.84,.76);
  }
  if (family==374.0) {
    if(v_munich_palette.z>=0.0)return vec3(.62,.62,.59);
    bool northernMainRoof=frame.x>=-12.567218 && frame.z>=4.118840;
    return mqRoofPaint(northernMainRoof?vec3(.54,.54,.52):vec3(.45,.40,.34),p);
  }
  if (family==375.0) {
    if(v_munich_palette.z<0.0)return mqRoofPaint(vec3(.25,.48,.42),p);
    if(abs(normalize(normal).z)<.9)return base;
    return frame.y/max(abs(v_munich_palette.z),.1)<.68?vec3(.22,.35,.40):vec3(.70,.69,.64);
  }
  if (family==376.0) {
    if(v_munich_palette.z<0.0)return mqRoofPaint(vec3(.44,.64,.57),p);
    if(dot(normalize(normal.xz),vec2(-.342853448,-.939388904))<.999)return base;
    float h=frame.y/max(abs(v_munich_palette.z),.1);
    if(h<.18)return vec3(.35,.36,.34);
    if(h<.76)return vec3(.49,.46,.39);
    if(h<.82)return vec3(.18,.20,.19);
    return vec3(.80,.79,.72);
  }
  if (family==365.0 || family==366.0 || family==369.0 || family==370.0) {
    bool roof=v_munich_palette.z<0.0;
    float packed=roof?v_munich_palette.y:v_munich_palette.x;
    vec3 material=vec3(floor(packed/65536.0),mod(floor(packed/256.0),256.0),mod(packed,256.0))/255.0;
    if (!roof && family==366.0 && frame.y>frame.w*.75) material=vec3(.61,.41,.33);
    if (!roof && family==369.0) {
      float relativeHeight=frame.y/max(abs(v_munich_palette.z),.1);
      if(relativeHeight>=.73 && relativeHeight<.91) material=vec3(.10,.14,.15);
      if(relativeHeight>=.94) material=vec3(.19,.21,.21);
    }
    if (!roof && family==370.0) material=frame.y/max(abs(v_munich_palette.z),.1)<.24?vec3(.45,.22,.15):vec3(.88,.88,.84);
    return roof?mqRoofPaint(material,p):material;
  }
  if (family==363.0 || family==364.0) {
    vec3 material=vec3(frame.x,frame.z,frame.w);
    return family==364.0?mqRoofPaint(material,p):material;
  }
  if (family==290.0) {
    if (abs(normal.y)>0.08) return mqRoofPaint(vec3(0.70,0.28,0.16),p);
    if (frame.z<=0.0 || frame.w<=0.0) return vec3(0.54,0.22,0.15);
    float height=max(frame.z,0.5),width=max(frame.w,0.5);
    float y=clamp(frame.y,0.0,height),row=floor(y/0.30);
    float joint=max(mqRepeatStroke(y,0.30,0.015),
                    mqRepeatStroke(frame.x+mod(row,2.0)*0.38,0.76,0.013));
    vec3 wall=mix(vec3(0.54,0.22,0.15),vec3(0.73,0.56,0.46),joint*0.19);
    float belts=max(mqStroke(y-height*0.17,0.12),
                    max(mqStroke(y-height*0.84,0.12),mqStroke(y-height*0.97,0.10)));
    float arris=max(mqStroke(frame.x-0.12,0.075),mqStroke(frame.x-(width-0.12),0.075));
    return mix(wall,vec3(0.67,0.64,0.57),clamp(max(belts*0.52,arris*0.24),0.0,1.0));
  }
  if (family==293.0) {
    if (v_munich_palette.z<0.0) return mqRoofPaint(vec3(0.14,0.15,0.16),p);
    return vec3(0.82,0.81,0.77);
  }
  if (family==295.0) {
    if (abs(normal.y)>0.2) return mqRoofPaint(vec3(0.38,0.075,0.13),p);
    return base;
  }
  if (family==296.0) {
    if (v_munich_palette.z<0.0) return mqRoofPaint(vec3(0.91,0.42,0.22),p);
    return vec3(0.82,0.70,0.43);
  }
  if (family==297.0) {
    if (base.r>0.6 && base.g>0.35 && base.b<0.4) return base;
    if (base.r<0.45 && base.g<0.25) return vec3(0.25,0.08,0.055);
    if (v_munich_palette.z<0.0) return mqRoofPaint(vec3(0.25,0.08,0.055),p);
    return vec3(0.82,0.70,0.43);
  }
  if (family==298.0) {
    if (v_munich_palette.z<0.0) return mqRoofPaint(vec3(0.25,0.08,0.055),p);
    return vec3(0.82,0.70,0.43);
  }
  // Families 0, -99, 286 and 287 deliberately retain the admitted base color.
  return base;
}

void main() {
  if (v_growth<0.005) discard;
  vec3 styled=v_color;
  if (u_paint_mode>1.5) {
    vec3 sourceNormal=normalize(v_normal);
    float paintLight=0.63+0.37*max(0.0,dot(sourceNormal,normalize(vec3(-0.35,0.8,0.4))));
    vec3 plane=cross(dFdx(v_local_position),dFdy(v_local_position));
    bool roofStyle=v_style>=32.0 || abs(plane.y)>0.001*max(length(plane),0.00001);
    vec3 paintNormal=roofStyle?vec3(0.0,1.0,0.0):sourceNormal;
    float semanticFamily=v_paint_family>=1000000.0?floor(v_paint_family/10000.0):v_paint_family;
    float family=abs(u_paint_override)>0.01?u_paint_override:semanticFamily;
    styled=mqPaintedFacade(v_color/max(paintLight,0.01),v_local_position,
                           paintNormal,v_paint_frame,family)*paintLight;
  }
  color=vec4(mix(styled,vec3(0.98,0.78,0.3),v_selected*0.65),u_opacity);
}
`;
