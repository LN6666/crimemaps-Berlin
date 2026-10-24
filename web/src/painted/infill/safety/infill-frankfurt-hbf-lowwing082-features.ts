/** Only append in the existing Hbf private partition, after unchanged F137 and075. */
export const FRANKFURT_HBF_LOWWING082_GLSL=String.raw`
float hbf082edge(float x,float at,float soft){return 1.-smoothstep(soft,soft*2.,abs(x-at));}
vec3 frankfurtHbfLowwingDetail082(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(abs(family-45422.)>.1||abs(frame.w-82.)>.1)return base;
 if(dot(normal.xz,vec2(.85657383,.51602449))<.999)return base;
 vec2 q=frame.xy/vec2(14.3778552613,10.395);
 if(q.x<0.||q.x>1.||q.y<.26||q.y>1.)return base;
 vec3 c=base;
 // Visible warm-stone jamb courses, not a repeated station-window grid.
 float course=1.-smoothstep(.018,.045,abs(mod(frame.y+.275,.55)-.275));
 c=mix(c,vec3(.39,.35,.29),course*.45);
 float x=q.x-.55,y=q.y-.57;
 float outer=step(0.,y)*(1.-step(1.,pow(x/.35,2.)+pow(y/.27,2.)));
 float inner=step(0.,y)*(1.-step(1.,pow(x/.31,2.)+pow(y/.22,2.)));
 c=mix(c,vec3(.69,.61,.48),outer*.65);
 float radius=sqrt(pow(x/.33,2.)+pow(y/.245,2.));
 float ring=max(hbf082edge(radius,.95,.012),hbf082edge(radius,1.04,.012))*step(0.,y);
 c=mix(c,vec3(.42,.36,.28),ring*.65);
 // One upper arched glass transom, approximately four visible panes.
 vec3 glass=vec3(.25,.40,.43)+vec3(.025,.035,.035)*clamp(q.y,0.,1.);
 c=mix(c,glass,inner);
 float paneX=x/(.31*2.);float mullion=max(hbf082edge(paneX,-.25,.004),max(hbf082edge(paneX,0.,.004),hbf082edge(paneX,.25,.004)));
 c=mix(c,vec3(.11,.18,.20),inner*mullion);
 // Only the visible straight-glass upper region. Lower hidden leaf/threshold
 // geometry or its exact count is not invented by this bounded proposal.
 float rect=step(.25,q.x)*step(q.x,.85)*step(.26,q.y)*step(q.y,.49);
 c=mix(c,glass,rect);c=mix(c,vec3(.12,.19,.21),rect*mullion);
 float transom=step(.23,q.x)*step(q.x,.88)*step(.49,q.y)*step(q.y,.57);
 c=mix(c,vec3(.67,.59,.46),transom*.8);
 float transomLine=max(hbf082edge(q.y,.505,.004),max(hbf082edge(q.y,.54,.004),hbf082edge(q.y,.565,.004)));
 c=mix(c,vec3(.40,.35,.28),transom*transomLine*.65);
 // Existing photo's layered cornice and one far-jamb recessed stone panel.
 float cornice=max(hbf082edge(q.y,.87,.004),max(hbf082edge(q.y,.91,.004),max(hbf082edge(q.y,.95,.004),hbf082edge(q.y,.985,.004))));
 c=mix(c,vec3(.77,.69,.54),cornice*.55);
 float panel=step(.88,q.x)*step(q.x,.965)*step(.67,q.y)*step(q.y,.86);
 c=mix(c,vec3(.61,.53,.42),panel*.5);
 float panelEdge=max(max(hbf082edge(q.x,.88,.003),hbf082edge(q.x,.965,.003)),max(hbf082edge(q.y,.67,.003),hbf082edge(q.y,.86,.003)));
 c=mix(c,vec3(.76,.67,.52),panel*panelEdge*.65);
 return c;
}

vec3 frankfurtHbfWithLowwing082(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 return frankfurtHbfLowwingDetail082(frankfurtHbf075(base,p,normal,frame,family),p,normal,frame,family);
}
`;
