export const OWNER_F184_PAINT_GLSL = `
// F184: exact member/face frames. Dimensions are photo proportions, not surveys.
float f184Rect(vec2 p,vec2 c,vec2 h){vec2 d=abs(p-c)-h;return 1.-smoothstep(-.025,.025,max(d.x,d.y));}
vec3 weissenhofsiedlungRecovery180(vec3 base,vec3 position,vec3 normal,vec4 f,float family){float u=f.x,y=f.y,w=f.z,k=f.w;if(k>109.5)return vec3(.62,.62,.57);vec2 p=vec2(u,y);if(k<.5){vec3 roof=vec3(.43,.44,.41);float seam=1.-smoothstep(.015,.045,abs(fract(u*.35)-.5));return mix(roof,roof*.92,seam*.25);}
 float group=floor(k/10.)-1.,face=mod(k,10.);vec3 wall=group==2.?vec3(.79,.81,.84):vec3(.89,.87,.82);float glazing=0.,frame=0.,door=0.,rail=0.;
 if(group==0.){ // Mies: four-story slab, stair/balcony punctuation, sparse end face.
  if(face==1.){for(int row=0;row<4;row++){float yy=1.65+float(row)*2.65;for(int col=0;col<4;col++){float xx=w*(.14+float(col)*.23);glazing=max(glazing,f184Rect(p,vec2(xx,yy),vec2(w*.091,.74)));}float stair=w*.12;door=max(door,f184Rect(p,vec2(stair,yy),vec2(.48,1.02)));rail=max(rail,f184Rect(p,vec2(stair,yy-.65),vec2(.7,.035)));}}
  else{for(int row=0;row<3;row++)glazing=max(glazing,f184Rect(p,vec2(w*.50,3.8+float(row)*2.65),vec2(.40,.70)));glazing=max(glazing,f184Rect(p,vec2(w*.55,1.25),vec2(w*.30,.85)));}
 }else if(group==1.){ // Oud: projecting service courts with high horizontal clerestory, garden windows distinct.
  if(face==1.){glazing=f184Rect(p,vec2(w*.50,3.08),vec2(max(.1,w*.46),.28));if(w>2.5)door=f184Rect(p,vec2(w*.76,1.05),vec2(.38,1.05));}
  else if(face==3.)glazing=f184Rect(p,vec2(w*.5,4.8),vec2(w*.34,.65));else if(face==2.){for(int row=0;row<2;row++)glazing=max(glazing,f184Rect(p,vec2(w*.53,1.5+float(row)*2.8),vec2(w*.30,.70)));}
 }else if(group==2.){ // Stam: continuous upper ribbon, asymmetric ground entry and small window.
  if(face==1.||face==2.){glazing=f184Rect(p,vec2(w*.50,5.15),vec2(w*.46,.56));glazing=max(glazing,f184Rect(p,vec2(w*.30,2.15),vec2(w*.21,.49)));door=f184Rect(p,vec2(w*.70,1.2),vec2(.43,1.2));}
 }else if(group==3.){ // Behrens: sparse two/three-story square windows, low entrance wing remains single story.
  if(face==1.)for(int row=0;row<4;row++){float yy=1.5+float(row)*2.8;if(yy<max(2.,y+1.))for(int col=0;col<3;col++){float xx=w*(.19+float(col)*.31);glazing=max(glazing,f184Rect(p,vec2(xx,yy),vec2(.49,.68)));}}
  if(w>5.)door=f184Rect(p,vec2(w*.45,1.12),vec2(.52,1.12));
 }else if(group==4.){ // Frank: upper discrete paired windows; lower broad living-room glazing.
  if(face==1.){for(int col=0;col<3;col++)glazing=max(glazing,f184Rect(p,vec2(w*(.18+float(col)*.31),5.1),vec2(w*.10,.72)));glazing=max(glazing,f184Rect(p,vec2(w*.50,1.9),vec2(w*.29,1.0)));}
 }else if(group==5.||group==6.){ // Bourgeois/Schneck: finite two-story openings, different widths.
  if(face==1.)for(int row=0;row<2;row++)for(int col=0;col<2;col++)glazing=max(glazing,f184Rect(p,vec2(w*(.25+float(col)*.48),1.7+float(row)*3.05),vec2(w*.16,.74)));
 }else if(group==7.){ // Citrohan: double-height end glazing, warm ground floor, sparse side windows.
  if(y<2.9)wall=vec3(.65,.34,.22);if(face==1.)glazing=f184Rect(p,vec2(w*.53,5.4),vec2(w*.37,2.15));else if(face==2.){glazing=f184Rect(p,vec2(w*.45,1.5),vec2(w*.20,.66));glazing=max(glazing,f184Rect(p,vec2(w*.58,8.9),vec2(w*.18,.70)));}else glazing=f184Rect(p,vec2(w*.5,8.6),vec2(w*.25,.7));
 }else if(group==8.){ // Museum duplex: raised ribbon volume, dark pilotis appearance and roof gallery.
  if(face==1.){if(y<3.1)wall=vec3(.32,.34,.31);glazing=f184Rect(p,vec2(w*.5,5.6),vec2(w*.47,.57));glazing=max(glazing,f184Rect(p,vec2(w*.5,9.0),vec2(w*.46,.48)));if(y<3.1){float col=1.-smoothstep(.06,.11,abs(fract(u/2.7)-.5));wall=mix(wall,vec3(.16,.25,.23),col);}}
  else if(face==2.)for(int row=0;row<2;row++)glazing=max(glazing,f184Rect(p,vec2(w*.5,2.+float(row)*3.5),vec2(w*.34,.62)));else glazing=f184Rect(p,vec2(w*.5,5.6),vec2(w*.28,.59));
 }else{ // Scharoun: broad living room, upper narrow windows and terrace rails.
  if(face==1.){glazing=f184Rect(p,vec2(w*.47,1.55),vec2(w*.38,.90));glazing=max(glazing,f184Rect(p,vec2(w*.52,5.3),vec2(w*.25,.6)));rail=f184Rect(p,vec2(w*.48,3.8),vec2(w*.44,.035));}else if(face==2.)glazing=f184Rect(p,vec2(w*.5,5.1),vec2(w*.35,.36));
 }
 // Bound every feature to this exact native face. Blank narrow/party faces retain plaster.
 float bounds=step(.18,u)*step(u,w-.18);glazing*=bounds;door*=bounds;rail*=bounds;
 vec3 glass=vec3(.20,.27,.28);float bars=1.-smoothstep(.025,.055,abs(fract(u/.70)-.5));glass=mix(glass,vec3(.71,.70,.65),bars);wall=mix(wall,glass,glazing);wall=mix(wall,vec3(.20,.22,.20),door);wall=mix(wall,vec3(.40,.42,.40),rail);return wall;
}
`;
