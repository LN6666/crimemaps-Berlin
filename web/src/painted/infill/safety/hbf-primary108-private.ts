/** Frankfurt Hbf own-reference primary stone/entrance features.
 * Surface relief and layout are photo approximations on existing surfaces.
 * No geometry, opening count on unknown wings, rooflight or new material family.
 * Only the two existing Hbf private programmes receive this postprocess.
 */
export const HBF_PRIMARY108_GLSL=String.raw`
float h108band(float x,float center,float halfWidth,float softness){return 1.-smoothstep(halfWidth,halfWidth+softness,abs(x-center));}
float h108box(vec2 p,vec2 center,vec2 halfSize){vec2 d=abs(p-center)-halfSize;return 1.-smoothstep(-.025,.025,max(d.x,d.y));}
float h108oval(vec2 p,vec2 center,vec2 radii,float angle){float cs=cos(angle),sn=sin(angle);vec2 d=p-center;vec2 q=vec2(cs*d.x+sn*d.y,-sn*d.x+cs*d.y)/radii;return 1.-smoothstep(.94,1.04,length(q));}
float h108limb(vec2 p,vec2 a,vec2 b,float radius){vec2 q=p-a,d=b-a;float t=clamp(dot(q,d)/dot(d,d),0.,1.);return 1.-smoothstep(radius-.025,radius+.025,length(q-d*t));}
float h108seated(vec2 p,float side){
 // Each side is one seated, draped silhouette, not a repeated window or face.
 float head=h108oval(p,vec2(3.05,13.32),vec2(.31,.39),-.12);
 float body=h108oval(p,vec2(3.25,12.40),vec2(.52,.91),.25);
 float lap=h108oval(p,vec2(4.10,11.64),vec2(1.03,.46),-.12);
 float shin=h108limb(p,vec2(4.79,11.57),vec2(5.34,10.76),.27);
 float foot=h108oval(p,vec2(5.48,10.72),vec2(.48,.17),.06);
 float arm=side<0.?max(h108limb(p,vec2(2.98,12.73),vec2(4.03,12.22),.18),h108limb(p,vec2(4.03,12.22),vec2(4.65,12.72),.16)):max(h108limb(p,vec2(3.55,12.62),vec2(4.04,11.99),.18),h108limb(p,vec2(4.04,11.99),vec2(4.80,11.71),.15));
 return max(max(head,body),max(max(lap,shin),max(foot,arm)));
}
vec3 frankfurtHbfPrimary108(vec3 c,vec3 p,vec3 normal,vec4 frame,float family){
 // Existing082 uniquely registered near-wing wall, with local S/H frame.
 // Only stone jambs and documented cornice receive stronger relief shadows.
 if(abs(family-45422.)<.1&&abs(frame.w-82.)<.1&&dot(normal.xz,vec2(.85657383,.51602449))>.999){
  vec2 q=frame.xy/vec2(14.3778552613,10.395);
  if(q.x>=0.&&q.x<=1.&&q.y>=.26&&q.y<=1.){
   float upperGlass=step(.57,q.y)*(1.-step(1.,pow((q.x-.55)/.31,2.)+pow((q.y-.57)/.22,2.)));
   float lowerGlass=step(.25,q.x)*step(q.x,.85)*step(.26,q.y)*step(q.y,.49);
   float stone=1.-max(upperGlass,lowerGlass);
   float course=1.-smoothstep(.018,.05,abs(mod(frame.y+.275,.55)-.275));
   float bevel=1.-smoothstep(.018,.045,abs(mod(frame.y+.22,.55)-.275));
   float jamb=max(1.-step(.25,q.x),step(.85,q.x));
   c=mix(c,vec3(.34,.29,.22),stone*jamb*course*.72);
   c=mix(c,vec3(.82,.73,.56),stone*jamb*bevel*.55);
   float shelf=max(h108band(q.y,.87,.009,.003),max(h108band(q.y,.91,.008,.003),max(h108band(q.y,.95,.008,.003),h108band(q.y,.985,.007,.003))));
   float under=max(h108band(q.y,.855,.009,.003),max(h108band(q.y,.895,.007,.003),h108band(q.y,.934,.007,.003)));
   c=mix(c,vec3(.35,.29,.215),under*.80);c=mix(c,vec3(.84,.75,.58),shelf*.78);
  }
  return c;
 }

 if(abs(family-6349.)>.25&&abs(family-45420.)>.25)return c;
 float u=frame.x,v=frame.y,y=p.y,role=frame.z;
 // Original station common axes; no image projection onto unrelated walls.
 float front=dot(normal.xz,vec2(.85321609,.52155757));
 if(u> -125.||u< -145.||abs(v)>29.3||y<0.||y>30.4)return c;
 vec3 warm=vec3(.70,.615,.475),light=vec3(.83,.745,.59),shadow=vec3(.345,.285,.205),deep=vec3(.18,.19,.18);
 // The main barrel's broad, stepped stone fascia. Its width/colour relief is
 // photograph-derived; actual thin arch tubes and the original wall stay put.
 float elliptic=sqrt(pow(v/28.,2.)+pow((y-13.)/16.,2.));
 float arch=step(13.,y)*step(abs(v),27.8)*h108band(elliptic,.960,.064,.012);
 if(role<1.5||abs(role-7.)<.1){
  float step1=h108band(elliptic,1.002,.010,.004),step2=h108band(elliptic,.973,.008,.004),step3=h108band(elliptic,.938,.010,.004);
  float inner=h108band(elliptic,.915,.008,.004);
  float theta=atan((y-13.)/16.,v/28.);
  float radial=1.-smoothstep(.035,.085,abs(fract((theta+.004)/.0616)-.5));
  vec3 fascia=warm*(1.+.045*sin(theta*8.));
  fascia=mix(fascia,shadow,step3*.85);fascia=mix(fascia,light,max(step1,step2)*.9);fascia=mix(fascia,shadow,inner*.85);
  float dentilZone=h108band(elliptic,.940,.012,.003);
  fascia=mix(fascia,shadow,dentilZone*radial*.75);
  c=mix(c,fascia,arch*step(.25,front));
 }
 // Wide rusticated piers, recessed panel centres, capitals and heavy stone
 // imposts seen in both own front photographs. No new geometric volume.
 if((role<1.5||abs(role-7.)<.1)&&front>.3){
  float d=min(min(abs(v-8.7),abs(v+8.7)),min(abs(v-26.2),abs(v+26.2)));
  float piers=(1.-smoothstep(.86,1.12,d))*step(.20,y)*(1.-step(22.1,y));
  float course=1.-smoothstep(.018,.058,abs(mod(y+.26,.52)-.26));
  vec3 pc=mix(warm,shadow,course*.60);
  float face=h108band(d,.0,.55,.08);float recessed=face*step(1.2,y)*(1.-step(8.8,y));
  pc=mix(pc,vec3(.60,.515,.385),recessed*.55);
  float panelEdge=max(h108band(d,.61,.035,.025),max(h108band(y,1.25,.065,.04),h108band(y,8.72,.065,.04)));
  pc=mix(pc,light,panelEdge*recessed*.75);
  float belt=max(h108band(y,9.58,.12,.05),max(h108band(y,10.05,.10,.05),h108band(y,10.49,.13,.05)));
  pc=mix(pc,light,belt*.95);pc=mix(pc,shadow,h108band(y,9.36,.07,.04)*.8);
  // Capitals and shaft panels below the glass-wall entablature.
  float capital=max(h108band(y,20.80,.25,.08),h108band(y,21.52,.19,.07));
  pc=mix(pc,light,capital*.85);pc=mix(pc,shadow,h108band(y,21.10,.09,.04)*.85);
  float shaft=step(10.8,y)*(1.-step(20.4,y));
  pc=mix(pc,shadow,shaft*h108band(d,.47,.045,.025)*.65);
  c=mix(c,pc,piers);
 }
 // Two genuine corner pavilions: photograph-visible tiered stone upper drums,
 // framed inset niches, cornice shelves and ribbed caps; only these old assets.
 float corner=abs(abs(v)-27.);
 if((abs(role-7.)<.1||abs(role-2.)<.1)&&corner<1.7&&y>17.3&&front>.3){
  if(y<24.7){
   float course=1.-smoothstep(.025,.075,abs(mod(y+.3,.6)-.3));
   vec3 pc=mix(warm,shadow,course*.40);
   float belt=max(h108band(y,18.05,.14,.06),max(h108band(y,20.03,.17,.06),max(h108band(y,22.65,.20,.07),h108band(y,24.30,.22,.07))));
   pc=mix(pc,light,belt*.95);pc=mix(pc,shadow,max(h108band(y,18.28,.075,.04),h108band(y,23.95,.09,.04))*.85);
   // Same photographed upper niche repeated only on the two symmetric pavilions.
   float niche=h108box(vec2(corner,y),vec2(0.,21.25),vec2(.48,.88));
   float surround=h108box(vec2(corner,y),vec2(0.,21.25),vec2(.67,1.09));
   pc=mix(pc,light,surround*.75);pc=mix(pc,shadow,niche*.90);
   pc=mix(pc,deep,h108box(vec2(corner,y),vec2(0.,21.20),vec2(.31,.69))*.75);
   c=pc;
  }else if(role>1.5&&role<2.5){
   float rib=1.-smoothstep(.035,.11,abs(fract((v-sign(v)*27.)*3.5)-.5));
   c=mix(vec3(.255,.285,.265),vec3(.43,.46,.405),rib*.6);
   c=mix(c,light,h108band(y,24.65,.09,.04)*.8);
  }
 }
 // Clock's existing stone pedestal, seated relief figures and moulded plinth.
 // This enhances the existing rough sculptures; it does not add statues.
 if(abs(role-7.)<.1&&abs(v)<6.2&&y>9.9&&y<16.0){
  float seated=step(2.2,abs(v))*(1.-step(5.8,abs(v)));
  float folds=h108band(y+abs(v)*.32,13.1,.085,.05);
  c=mix(c,warm,.45);c=mix(c,shadow,seated*folds*.85);
  float edge=max(h108band(y,10.48,.12,.045),max(h108band(y,11.1,.09,.04),h108band(y,12.3,.10,.04)));
  c=mix(c,light,edge*.95);c=mix(c,shadow,h108band(y,10.70,.085,.04)*.85);
  float rr=length(vec2(v,y-14.));
  c=mix(c,light,h108band(rr,1.73,.055,.035)*.75);
  c=mix(c,shadow,h108band(rr,1.86,.07,.04)*.7);
 }
 // The own close photograph shows two draped seated figures and a wide
 // stepped clock plinth. Original role7 statues are too thin to carry this
 // silhouette, so use the adjacent existing street-facing glass/stone wall.
 // This is a photo-proportioned 2D relief illustration, not sculpture volume.
 if(role<1.5&&front>.96&&abs(v)<6.3&&y>9.6&&y<14.15){
  vec2 q=vec2(abs(v),y);float side=sign(v);
  float body=h108seated(q,side),castShadow=h108seated(q-vec2(.12,-.11),side);
  float clockClear=smoothstep(1.78,1.94,length(vec2(v,y-14.)));
  c=mix(c,vec3(.20,.205,.18),castShadow*clockClear*.78);
  vec3 relief=vec3(.69,.605,.455)+vec3(.09,.08,.06)*clamp((y-10.4)/3.1,0.,1.);
  float drape1=h108limb(q,vec2(3.25,12.78),vec2(3.67,11.59),.038);
  float drape2=h108limb(q,vec2(3.78,11.95),vec2(4.90,11.46),.042);
  float drape3=h108limb(q,vec2(4.74,11.48),vec2(5.10,10.93),.037);
  relief=mix(relief,vec3(.40,.33,.24),max(drape1,max(drape2,drape3))*.84);
  float collar=h108band(length((q-vec2(3.05,13.32))/vec2(.31,.39)),.92,.075,.03);
  relief=mix(relief,vec3(.84,.75,.58),collar*.55);
  c=mix(c,relief,body*clockClear);
  float base=h108box(vec2(v,y),vec2(0.,10.54),vec2(3.12,.56));
  vec3 pedestal=vec3(.65,.56,.42);
  float steps=max(h108band(y,10.03,.075,.035),max(h108band(y,10.61,.10,.035),h108band(y,11.08,.075,.035)));
  pedestal=mix(pedestal,vec3(.83,.74,.57),steps*.90);
  pedestal=mix(pedestal,vec3(.36,.29,.20),h108band(y,10.34,.065,.035)*.85);
  float center=h108box(vec2(v,y),vec2(0.,10.53),vec2(.77,.34));
  pedestal=mix(pedestal,vec3(.48,.405,.295),center*.50);
  pedestal=mix(pedestal,vec3(.82,.725,.55),max(h108band(abs(v),.78,.045,.025),h108band(y,10.87,.04,.025))*center*.8);
  c=mix(c,pedestal,base);
 }
 // Own central lower doorway only: double leaves, heavy dark metal jambs,
 // separate upper transom and threshold. Door dimensions are photo approximate.
 if(role<1.5&&front>.96&&abs(v)<5.5&&y<4.5){
  float surround=h108box(vec2(v,y),vec2(0.,2.02),vec2(4.10,1.97));
  float glass=h108box(vec2(v,y),vec2(0.,1.72),vec2(3.72,1.56));
  vec3 door=vec3(.105,.17,.19)+vec3(.025,.04,.045)*clamp(y/4.,0.,1.);
  c=mix(c,vec3(.115,.12,.11),surround);c=mix(c,door,glass);
  float divisions=max(h108band(v,0.,.10,.025),max(h108band(v,-3.73,.10,.03),h108band(v,3.73,.10,.03)));
  float rails=max(h108band(y,.21,.10,.03),max(h108band(y,3.34,.11,.03),h108band(y,4.02,.10,.03)));
  c=mix(c,vec3(.39,.43,.40),surround*max(divisions,rails));
  float transom=h108box(vec2(v,y),vec2(0.,3.69),vec2(3.72,.27));
  c=mix(c,vec3(.25,.36,.38),transom);
  c=mix(c,vec3(.12,.15,.14),transom*h108band(v,0.,.075,.025));
  float handles=max(h108box(vec2(v,y),vec2(-.28,1.59),vec2(.038,.36)),h108box(vec2(v,y),vec2(.28,1.59),vec2(.038,.36)));
  c=mix(c,vec3(.69,.70,.64),handles);
  c=mix(c,vec3(.72,.68,.57),surround*h108band(y,.075,.065,.03));
 }
 return c;
}
`;
/** Inverse scope: other named programmes and every city/base are byte identical.
 * Existing genuine Hbf material ownership/frames already certify these families.
 */
export function hbfPrimary108PrivatePartition(source:string,key:string,city:string){
 if(city!=='frankfurt'||(key!=='infill-frankfurt-hbf075'&&key!=='owner6349'))return source;
 const certificate='vec3 paintedFacade(';
 if(source.split(certificate).length!==2||source.includes('frankfurtHbfPrimary108('))throw Error('Hbf108 private entry certificate mismatch');
 if(!source.includes('frankfurtHauptbahnhofWhole137('))throw Error('Hbf108 original dependency missing');
 return source.replace(certificate,'vec3 hbf108OriginalPaintedFacade(')+HBF_PRIMARY108_GLSL+'\nvec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return frankfurtHbfPrimary108(hbf108OriginalPaintedFacade(base,p,normal,frame,family),p,normal,frame,family);}\n';
}
