/** Graphic relief registered only to the exact existing six-vertex front panel.
 * Original bulk70 GLSL is a private dependency, never edited or globally replaced. */
export const ML61_ENTRY_GLSL092=String.raw`
float ml61EntryBox092(float x,float lo,float hi){float a=max(fwidth(x),.012);return smoothstep(lo-a,lo+a,x)*(1.-smoothstep(hi-a,hi+a,x));}
float ml61EntryLine092(float x,float period,float width){float a=max(fwidth(x),.008),d=abs(mod(x+period*.5,period)-period*.5);float near=1.-smoothstep(width-a,width+a,d);return mix(near,min(1.,2.*width/period),smoothstep(period*.18,period*.60,a));}
vec3 ml61Entry092(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 vec3 original=infillFrankfurtLowOfficeBulk70Paint(base,p,normal,frame,family);
 if(family!=34192.||frame.w!=-920.||dot(normal.xz,vec2(.523687427778,-.851910487074))<.99999||abs(normal.y)>.001)return original;
 float u=dot(frame.xz,vec2(.851910487074,.523687427778))-.0480698865,y=p.y-.152;
 if(abs(u)>4.8||y<0.||p.y>7.3)return original;
 float outer=ml61EntryBox092(u,-2.8,2.8)*ml61EntryBox092(y,0.,4.45);
 // One photographed black splayed door surround, not a repeating window bay.
 float side=clamp((abs(u)-1.35)/1.45,0.,1.),top=clamp((y-2.45)/2.,0.,1.);
 vec3 portal=mix(vec3(.035,.042,.044),vec3(.085,.095,.097),max(side*.65,top*.45));
 portal*=1.-.24*ml61EntryBox092(abs(u),1.35,1.46);
 float edge=max(1.-smoothstep(.028,.055,abs(abs(u)-2.77)),1.-smoothstep(.025,.055,abs(y-4.41)));
 portal=mix(portal,vec3(.56,.60,.59),edge*.7);
 float door=ml61EntryBox092(u,-1.35,1.35)*ml61EntryBox092(y,0.,2.45);
 float doorFrames=max(1.-smoothstep(.025,.055,abs(u)),max(1.-smoothstep(.025,.055,abs(abs(u)-1.31)),1.-smoothstep(.025,.055,abs(y-2.41))));
 vec3 glass=mix(vec3(.24,.34,.34),vec3(.57,.63,.60),doorFrames);glass=mix(glass,vec3(.63,.66,.64),(1.-smoothstep(.018,.033,abs(abs(u)-.20)))*ml61EntryBox092(y,.90,1.45));
 portal=mix(portal,glass,door);
 // Door-entry access panel on the photographed right reveal: no invented row of doors.
 float access=ml61EntryBox092(u,1.57,2.37)*ml61EntryBox092(y,.75,1.95);
 vec3 panel=mix(vec3(.16,.18,.18),vec3(.62,.64,.61),ml61EntryLine092(y,.13,.012)*.65);portal=mix(portal,panel,access);
 vec3 color=mix(original,portal,outer);
 // Two round columns expressed by one continuous cylindrical highlight each.
 // Their depth and the portal recess remain unbuilt photographic approximations.
 float column=0.;vec3 columnColor=vec3(0.);for(int i=0;i<2;i++){float x=i==0?-3.375:3.375,q=(u-x)/.325;float m=(1.-smoothstep(.96,1.06,abs(q)))*ml61EntryBox092(y,0.,7.148);float roundness=sqrt(max(0.,1.-min(1.,q*q)));vec3 c=vec3(.43,.49,.48)+vec3(.21,.20,.17)*roundness+vec3(.025)*(-q);columnColor+=c*m;column+=m;}
 if(column>0.)color=mix(color,columnColor/max(column,.001),min(column,1.));
 return color;
}
`;
export const ML61_ENTRY_GUARD092=" if(family==34192.)return ml61Entry092(base,p,normal,frame,family);\n";
export function ml61Entry092PartitionSource(source:string,key:string,city:string){
 if(city==='frankfurt'&&key==='infill-ml61-entry092')return source;
 const defs=source.split(ML61_ENTRY_GLSL092).length-1,calls=source.split(ML61_ENTRY_GUARD092).length-1;if(defs>1||calls>1)throw Error('ML61 entry duplicate private source');
 const scoped=source.replace(ML61_ENTRY_GLSL092,'').replace(ML61_ENTRY_GUARD092,'');if(/\bml61Entry(?:Box|Line)?092\s*\(/.test(scoped))throw Error('ML61 entry leaked');return scoped;
}
