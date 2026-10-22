export const OWNER_F195_PAINT_GLSL = String.raw`
vec3 neuesSchlossRecovery187(vec3 base,vec4 f,vec3 normal){
 float x=f.x,y=f.y,d=f.z,k=f.w;
 vec3 stone=vec3(.79,.70,.58),lightStone=vec3(.88,.82,.71),glass=vec3(.20,.27,.28),shade=vec3(.34,.30,.25);
 if(k>1.5&&k<2.5){float tile=step(.965,fract(x*2.4+y*4.0));return mix(vec3(.22,.24,.25),vec3(.16,.18,.19),tile*.25);}
 if(k>4.5&&k<5.5)return mix(glass,lightStone,1.0-step(.055,abs(fract(x*1.15)-.5)));
 if(k>3.5&&k<4.5)return lightStone;
 if(k>5.5&&k<6.5)return mix(stone,shade,step(.97,fract(y*1.5))*.12);
 float yy=y;if(k>6.5&&k<7.5)yy=y*1.3;
 float pitch=5.15,bay=abs(mod(x+pitch*.5,pitch)-pitch*.5),row=yy<4.1?0.0:yy<9.1?1.0:2.0;
 float cy=row<.5?2.15:row<1.5?6.7:10.8,halfH=row<.5?1.4:row<1.5?1.85:1.05,halfW=row<1.5?.91:1.02;
 bool garden=k>7.5&&k<8.5;
 if(garden){row=yy<5.4?0.0:1.0;cy=row<.5?2.65:8.75;halfH=row<.5?1.7:2.75;halfW=1.0;}
 float top=cy+halfH,bot=cy-halfH;float windowMask=step(bay,halfW)*step(bot,yy)*step(yy,top);
 // Tall principal-floor arches and central portico openings are tied to the palace-local front, never world coordinates.
 bool arch=(row>.5&&row<1.5&&(garden||abs(x)<11.5));
 if(arch&&yy>top-halfW){float ar=length(vec2(bay,yy-(top-halfW)));windowMask*=step(ar,halfW);}
 float outer=step(bay,halfW+.22)*step(bot-.16,yy)*step(yy,top+.20),sill=step(bay,halfW+.38)*step(abs(yy-bot+.12),.11);
 vec3 c=stone;if(yy<4.1){float rust=step(.955,fract(yy*1.55));c=mix(c,shade,rust*.25);}
 c=mix(c,lightStone,max(outer-windowMask,sill));c=mix(c,glass,windowMask);
 float mull=step(bay,.065)+step(abs(yy-cy),.055)+step(abs(yy-(cy+.65)),.038);c=mix(c,lightStone,windowMask*clamp(mull,0.,1.));
 float belt=step(abs(yy-4.18),.16)+step(abs(yy-9.25),.12)+step(abs(yy-12.75),.20);if(garden)belt=step(abs(yy-5.45),.16)+step(abs(yy-12.75),.20);
 float pilaster=step(2.25,bay)*step(4.4,yy)*step(yy,12.6);c=mix(c,lightStone,clamp(belt+pilaster*.65,0.,1.));
 // Ornament is simplified into short, separate lintel/pediment accents; it does not invent sculpture portraits.
 if(row>.5&&row<1.5){float lintel=step(bay,1.25)*step(abs(yy-top-.35),.10);float hood=step(abs(yy-top-.65+bay*.30),.09)*step(bay,1.27);c=mix(c,lightStone,clamp(lintel+hood,0.,1.));}
 return c;
}
`;
