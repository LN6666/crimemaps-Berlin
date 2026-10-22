/** Photo-bound paint for Alte Nazarethkirche's exact gabled native component. */
export const BERLIN_ALTE_NAZARETH_GLSL = `
vec3 fpAlteNazareth(vec3 base,vec3 p,vec3 normal,vec4 frame){
  vec2 uv=frame.xy;float H=frame.z,W=frame.w;
  // The roof planes have no source-confirmed color in the available exterior photo.
  if(abs(normal.y)>.16||H<.2||W<.2)return base;
  vec3 wall=mix(base,vec3(.54,.23,.15),.84);
  float course=fpRepeatStroke(uv.y,.30,.007);
  float bond=fpRepeatStroke(uv.x+mod(floor(uv.y/.30),2.)*.34,.68,.007);
  wall=fpLayer(wall,max(course,bond),vec3(.27,.105,.07),.22);
  float foot=1.-smoothstep(.0,.72,uv.y);
  wall=fpLayer(wall,foot,vec3(.31,.14,.10),.18);

  // The southwest short face is the photographed Schinkel gable.
  float front=dot(normal.xz,vec2(-.7071,-.7071));
  if(front>.66){
    float eave=H*.60,halfW=W*.5,rise=max(.1,H-eave),slope=rise/max(.1,halfW);
    float yLine=uv.x<halfW?eave+slope*uv.x:eave+slope*(W-uv.x);
    float sloped=fpStroke((uv.y-yLine)/sqrt(1.+slope*slope),.075);
    float eaveLine=fpStroke(uv.y-eave,.085);
    wall=fpLayer(wall,max(sloped,eaveLine),vec3(.70,.35,.21),.82);
    wall=fpLayer(wall,max(fpStroke((uv.y-yLine-.15)/sqrt(1.+slope*slope),.022),fpStroke(uv.y-eave-.16,.024)),vec3(.86,.52,.32),.62);

    // Rose window: recessed dark glass, masonry ring, and a restrained radial lead pattern.
    vec2 roseQ=uv-vec2(halfW,eave-.72);float roseR=min(W*.095,H*.105),roseD=length(roseQ);
    float roseGlass=fpInside(roseD-(roseR-.12));
    float roseRing=fpInside(roseD-(roseR+.13))-fpInside(roseD-(roseR-.04));
    wall=fpLayer(wall,roseGlass,vec3(.16,.19,.20),.96);
    wall=fpLayer(wall,fpStroke(abs(sin(atan(roseQ.y,roseQ.x)*6.)),.035)*roseGlass,vec3(.70,.63,.52),.76);
    wall=fpLayer(wall,fpInside(roseD-.13),vec3(.24,.24,.22),.85);
    wall=fpLayer(wall,roseRing,vec3(.79,.55,.37),.96);

    // Two small arched windows flank the rose and another pair flank the entries.
    for(int i=0;i<4;i++){
      float side=(i==0||i==2)?-1.:1.;float lower=(i>=2)?1.:0.;
      vec2 c=vec2(halfW+side*W*.38,lower>0.?H*.26:eave-.72);
      vec2 q=uv-c;vec2 size=vec2(min(.38,W*.032),lower>0.?min(.62,H*.055):min(.72,H*.06));
      float opening=fpWindowShape(q,size,.38,0.);
      float surround=fpWindowShape(q,size+vec2(.11,.11),.38,0.)-opening;
      wall=fpLayer(wall,opening,vec3(.16,.18,.18),.93);
      wall=fpLayer(wall,fpStroke(q.x,.022)*opening,vec3(.60,.48,.37),.62);
      wall=fpLayer(wall,surround,vec3(.78,.53,.35),.92);
    }

    // Three ground-reaching arched doorways, with dark recesses and wood door leaves.
    for(int i=0;i<3;i++){
      float offset=(float(i)-1.)*W*.165;
      float doorH=H*.30,doorW=W*.074,baseY=.12;
      vec2 c=vec2(halfW+offset,baseY+doorH*.5),q=uv-c;
      vec2 size=vec2(doorW,doorH*.5);
      float door=fpWindowShape(q,size,.40,0.);
      float surround=fpWindowShape(q,size+vec2(.14,.12),.40,0.)-door;
      float recess=fpWindowShape(q,size+vec2(.055,.05),.40,0.);
      wall=fpLayer(wall,recess,vec3(.10,.075,.058),.98);
      wall=fpLayer(wall,door,vec3(.24,.12,.075),.99);
      float leaf=fpStroke(q.x,.018)*door;
      float rail=max(fpStroke(q.y+doorH*.08,.024),fpStroke(q.y-doorH*.22,.020))*door;
      wall=fpLayer(wall,max(leaf,rail),vec3(.09,.055,.038),.70);
      wall=fpLayer(wall,surround,vec3(.82,.56,.38),.96);
      wall=fpLayer(wall,fpStroke(uv.y-baseY,.035)*fpInside(abs(uv.x-c.x)-(doorW+.20)),vec3(.80,.52,.35),.92);
    }

    // Small cross at the gable apex, painted only on the documented front face.
    vec2 crossQ=uv-vec2(halfW,H-.34);
    float cross=max(fpStroke(crossQ.x,.055)*fpInside(abs(crossQ.y)-.34),fpStroke(crossQ.y,.055)*fpInside(abs(crossQ.x)-.17));
    wall=fpLayer(wall,cross,vec3(.88,.78,.62),.96);
    return wall;
  }

  // The long side elevations use only the regular smaller arched opening rhythm in the MD.
  if(abs(front)<.32&&W>8.){
    wall=fpLayer(wall,fpStroke(uv.y-H+.08,.045),vec3(.68,.32,.20),.76);
    for(int i=0;i<6;i++){
      float x=W*(float(i)+.5)/6.;vec2 q=uv-vec2(x,H*.60);
      vec2 size=vec2(min(.43,W*.022),min(.72,H*.10));
      float opening=fpWindowShape(q,size,.38,0.);
      float surround=fpWindowShape(q,size+vec2(.10,.10),.38,0.)-opening;
      wall=fpLayer(wall,opening,vec3(.17,.19,.19),.90);
      wall=fpLayer(wall,surround,vec3(.75,.49,.32),.84);
    }
  }
  return wall;
}
`;
