/** Kaiserstrasse18/20 only. Original-author 2022 photograph, four axes per
 * independently registered historic house. No bank facade or unknown rear
 * openings; roof dormer silhouettes are explicitly unsupported by LoD2. */
export const KAISER1820_OFFICIAL_GLSL064=/* glsl */ `
float kh064Band(float p,float lo,float hi,float aa){return smoothstep(lo-aa,lo+aa,p)*(1.0-smoothstep(hi-aa,hi+aa,p));}
float kh064Rect(vec2 p,vec2 lo,vec2 hi,float aa){return kh064Band(p.x,lo.x,hi.x,aa)*kh064Band(p.y,lo.y,hi.y,aa);}
float kh064Arch(vec2 p,float cx,float radius,float bottom,float spring,float aa){return smoothstep(bottom-aa,bottom+aa,p.y)*(1.0-smoothstep(radius-aa,radius+aa,length(vec2(p.x-cx,max(p.y-spring,0.0)))));}
vec3 kh064Opening(vec3 stone,vec2 p,float cx,float radius,float bottom,float spring,bool arch,float aa){
 float outer=arch?kh064Arch(p,cx,radius+0.18,bottom-0.12,spring,aa):kh064Rect(p,vec2(cx-radius-0.18,bottom-0.12),vec2(cx+radius+0.18,spring+0.12),aa);
 float opening=arch?kh064Arch(p,cx,radius,bottom,spring,aa):kh064Rect(p,vec2(cx-radius,bottom),vec2(cx+radius,spring),aa);
 float glass=arch?kh064Arch(p,cx,radius-0.10,bottom+0.10,spring,aa):kh064Rect(p,vec2(cx-radius+0.10,bottom+0.10),vec2(cx+radius-0.10,spring-0.10),aa);
 vec3 c=mix(stone,vec3(0.72,0.635,0.49),outer);
 c=mix(c,vec3(0.17,0.185,0.18),opening);
 c=mix(c,vec3(0.83,0.82,0.755),opening*0.90);
 vec3 glazing=mix(vec3(0.22,0.31,0.365),vec3(0.43,0.53,0.58),clamp((p.y-bottom)/max(spring-bottom,0.4),0.0,1.0)*0.50);
 c=mix(c,glazing,glass);
 float mullion=1.0-smoothstep(0.035-aa,0.060+aa,abs(p.x-cx));
 float transom=1.0-smoothstep(0.035-aa,0.065+aa,abs(p.y-(arch?spring:spring-0.62)));
 c=mix(c,vec3(0.81,0.805,0.75),max(mullion,transom)*glass);
 float sill=kh064Rect(p,vec2(cx-radius-0.27,bottom-0.24),vec2(cx+radius+0.27,bottom-0.11),aa);
 return mix(c,vec3(0.73,0.64,0.49),sill);
}
vec3 kaiser1820Base064(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 bool rear=abs(family-45220.0)<0.25;
 bool roof=abs(family-45221.0)<0.25;
 bool house18=abs(family-45222.0)<0.25;
 bool house20=abs(family-45223.0)<0.25;
 if(!(rear||roof||house18||house20))return base;
 if(rear)return base;
 float aa=clamp(max(fwidth(frame.x),fwidth(frame.y)),0.008,0.13);
 if(roof){
  if(normal.y<0.50||frame.w<12.97||frame.w>13.06||frame.y<20.15||frame.y>26.97)return base;
  // Slate is on the original inclined roof planes; no ordinary facade windows
  // or invented dormer/gable projections are drawn onto those planes.
  vec3 slate=vec3(0.255,0.268,0.275)*(0.98+0.035*normal.x-0.035*normal.z);
  float course=mod(frame.y,0.22),tile=mod(frame.x+mod(floor(frame.y/0.22),2.0)*0.22,0.44);
  float joint=max(1.0-smoothstep(0.007,0.018,min(course,0.22-course)),1.0-smoothstep(0.006,0.014,min(tile,0.44-tile)));
  float detail=1.0-smoothstep(0.025,0.13,max(fwidth(frame.x),fwidth(frame.y)));
  return mix(slate,slate*0.78,joint*detail*0.42);
 }
 float expectedW=house18?12.99408991:13.04023722;
 float expectedH=house18?20.321:20.332;
 if(abs(normal.y)>0.02||normal.x<0.78||normal.x>0.82||normal.z> -0.58||normal.z< -0.63||abs(frame.z-expectedH)>0.02||abs(frame.w-expectedW)>0.02||frame.x< -0.02||frame.x>expectedW+0.02||frame.y< -0.01||frame.y>expectedH+0.02)return base;
 vec2 q=frame.xy;float W=frame.w;
 vec3 stone=vec3(0.66,0.565,0.415);
 // Broad sandstone bossage/courses, limited to the inspected street walls.
 float row=mod(q.y,0.47),block=mod(q.x+mod(floor(q.y/0.47),2.0)*0.55,1.10);
 float joints=max(1.0-smoothstep(0.012,0.032,min(row,0.47-row)),1.0-smoothstep(0.010,0.022,min(block,1.10-block)));
 stone=mix(stone,stone*0.80,joints*0.38);
 float belts=max(max(kh064Band(q.y,3.72,4.02,aa),kh064Band(q.y,7.28,7.60,aa)),max(kh064Band(q.y,11.80,12.02,aa),kh064Band(q.y,16.43,16.64,aa)));
 stone=mix(stone,vec3(0.735,0.638,0.475),belts);
 float underBelts=max(max(kh064Band(q.y,3.62,3.72,aa),kh064Band(q.y,7.17,7.28,aa)),max(kh064Band(q.y,11.70,11.80,aa),kh064Band(q.y,16.32,16.43,aa)));
 stone=mix(stone,stone*0.67,underBelts*0.65);
 vec3 c=stone;
 // Four independently photographed axes each: house18 has the projecting end
 // at high u beside the bank entrance; house20 has its projecting end at low u.
 for(int i=0;i<4;i++){
  float t=house18?(i==0?0.12:i==1?0.35:i==2?0.58:0.84):(i==0?0.16:i==1?0.42:i==2?0.65:0.88);
  float cx=t*W;bool endBay=house18?i==3:i==0;float r=endBay?1.03:0.83;
  c=kh064Opening(c,q,cx,r,8.03,10.50,true,aa);
  c=kh064Opening(c,q,cx,r,12.84,15.02,true,aa);
  c=kh064Opening(c,q,cx,r*0.82,17.45,19.25,false,aa);
  c=kh064Opening(c,q,cx,endBay?r:r*0.90,endBay?4.15:4.55,endBay?6.05:6.80,endBay,aa);
  // Pilaster/recess contrast and solid triangular hood above upper arches.
  float pier=kh064Band(abs(q.x-cx),r+0.22,r+0.35,aa)*kh064Band(q.y,7.65,16.30,aa);
  c=mix(c,vec3(0.755,0.66,0.505),pier*0.60);
  float triHeight=0.55;float ped=kh064Band(q.y,16.05,16.60,aa)*(1.0-smoothstep((r+0.35)*(1.0-(q.y-16.05)/triHeight)-aa,(r+0.35)*(1.0-(q.y-16.05)/triHeight)+aa,abs(q.x-cx)));
  c=mix(c,vec3(0.73,0.63,0.47),ped);
  float balustrade=kh064Band(q.y,7.63,7.88,aa)*kh064Band(abs(q.x-cx),0.0,r+0.10,aa);
  float spindle=1.0-smoothstep(0.022,0.045,abs(mod(q.x-cx+0.10,0.20)-0.10));
  c=mix(c,vec3(0.43,0.365,0.27),balustrade*(1.0-spindle)*0.72);
 }
 // Ground-reaching shop glazing is a separate entrance zone, not a suspended window.
 float shop=kh064Rect(q,vec2(0.23,0.10),vec2(W-0.23,3.46),aa);
 float post=1.0-smoothstep(0.07,0.13,abs(mod(q.x,W/4.0)-W/8.0));
 vec3 shopGlass=vec3(0.17,0.235,0.23);
 c=mix(c,shopGlass,shop);
 c=mix(c,vec3(0.335,0.30,0.22),post*shop);
 float cornice=kh064Band(q.y,19.70,expectedH,aa);
 c=mix(c,vec3(0.73,0.635,0.47),cornice);
 float dentils=kh064Band(q.y,19.72,19.90,aa)*(1.0-smoothstep(0.035,0.07,abs(mod(q.x,0.32)-0.16)));
 return mix(c,vec3(0.42,0.345,0.245),dentils*0.66);
}

// Separate upright photo-derived carriers; these branches never touch the
// original inclined roof45221 or an unknown rear/party wall45220.
vec3 kaiser1820Official064(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 bool dormer=abs(family-45224.0)<0.25;
 bool gable=abs(family-45225.0)<0.25;
 if(!(dormer||gable))return kaiser1820Base064(base,p,normal,frame,family);
 if(abs(normal.y)>0.02||normal.x<0.77||normal.x>0.83||normal.z> -0.57||normal.z< -0.64)return base;
 float aa=clamp(max(fwidth(frame.x),fwidth(frame.y)),0.008,0.10);vec2 q=frame.xy;
 if(dormer){
  if(abs(frame.z-1.44)>0.015||frame.w<1.2||frame.w>2.4||abs(q.x)>0.73||q.y< -0.02||q.y>frame.w+0.02)return base;
  vec3 clad=vec3(0.72,0.73,0.70);float opening=kh064Rect(q,vec2(-0.55,0.13),vec2(0.55,frame.w-0.13),aa);
  float glass=kh064Rect(q,vec2(-0.44,0.23),vec2(0.44,frame.w-0.23),aa);
  vec3 c=mix(clad,vec3(0.85,0.855,0.82),opening);
  c=mix(c,vec3(0.28,0.40,0.47),glass);
  float mullion=1.0-smoothstep(0.025,0.045,abs(q.x));
  c=mix(c,vec3(0.84,0.85,0.82),mullion*glass);
  float sill=kh064Band(q.y,0.04,0.13,aa);return mix(c,vec3(0.55,0.57,0.55),sill);
 }
 if(abs(frame.z-2.9)>0.015||abs(frame.w-5.88)>0.015||abs(q.x)>1.46||q.y< -0.02||q.y>5.90)return base;
 vec3 stone=vec3(0.68,0.58,0.425);
 float pilaster=kh064Band(abs(q.x),0.62,0.85,aa)*kh064Band(q.y,1.3,4.60,aa);
 stone=mix(stone,vec3(0.76,0.66,0.49),pilaster);
 float ledge=max(kh064Band(q.y,0.25,0.48,aa),max(kh064Band(q.y,1.20,1.38,aa),kh064Band(q.y,4.42,4.60,aa)));
 stone=mix(stone,vec3(0.77,0.675,0.51),ledge);
 vec3 c=kh064Opening(stone,q,0.0,0.48,1.70,3.98,false,aa);
 float hood=kh064Band(q.y,4.72,4.88,aa)*kh064Band(abs(q.x),0.0,0.64,aa);
 c=mix(c,vec3(0.77,0.675,0.51),hood);
 float crest=kh064Band(q.y,5.16,5.62,aa)*(1.0-smoothstep(0.035,0.080,abs(q.x)));
 return mix(c,vec3(0.46,0.38,0.265),crest*0.66);
}
`;
