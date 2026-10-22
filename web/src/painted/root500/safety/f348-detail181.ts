import type {BuildingComponent} from './building-mesh-renderer';
import {nativePaintSignature} from './progressive-native-signature';
const PINS=[{"objectId":"osm/way/357786647","partId":"osm/way/357786647/component/f122c346eba82ae92695","signature":"004cc790","dx":0,"dz":0},{"objectId":"osm/way/502359684","partId":"osm/way/502359684/component/f6f07beea8fcc4bb2b2a","signature":"e2b9fd65","dx":-1.6650839849280143,"dz":0.356222383218407},{"objectId":"osm/way/253180269","partId":"osm/way/253180269/component/ec5fe7a42ebbd91ae925","signature":"279a2833","dx":107.394518903634,"dz":290.7751082899549},{"objectId":"osm/way/253180278","partId":"osm/way/253180278/component/3fc8053cb6f8667db9fe","signature":"d84880fe","dx":107.394518903634,"dz":290.7751082899549},{"objectId":"osm/way/253180288","partId":"osm/way/253180288/component/f74e855f104632344448","signature":"0279768e","dx":107.394518903634,"dz":290.7751082899549},{"objectId":"osm/way/253180296","partId":"osm/way/253180296/component/d392d603e55ed609c2e5","signature":"4cc4dd70","dx":107.394518903634,"dz":290.7751082899549},{"objectId":"osm/way/262016089","partId":"osm/way/262016089/component/531f86a1d04b4b4ef952","signature":"b7055806","dx":107.394518903634,"dz":290.7751082899549}];
/** F348 only, explicitly reopened by user. Exact geometry guard; paint metadata only. */
export function applyF348Detail181(components:BuildingComponent[],colors:Float32Array,frames:Float32Array){let at=0;
 for(const c of components){const i=c.city==='hannover'?PINS.findIndex(r=>r.objectId===c.objectId&&r.partId===c.partId):-1;
 const pin=i>=0?PINS[i]:null,ok=pin&&(nativePaintSignature(c)===pin.signature||(i===0&&nativePaintSignature(c)==='13d2bc90'));
 for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3,at++)if(ok&&pin){colors.set([.74,.48,.24,2],at*4);frames.set([b.positions[j]+pin.dx,b.positions[j+2]+pin.dz,47,i+1,3295],at*5);}}
}
export const F348_DETAIL_GLSL=`
float c348line(float d,float w){return 1.-smoothstep(w,w+max(fwidth(d),.025),abs(d));}
float c348box(vec2 p,vec2 b){vec2 d=abs(p)-b;return 1.-smoothstep(-.025,max(length(fwidth(p)),.025),max(d.x,d.y));}
float c348arch(vec2 q,float w,float spring,float bottom){float d=q.y>spring?length(vec2(q.x,q.y-spring))-w:abs(q.x)-w;return (1.-smoothstep(-.025,max(length(fwidth(q)),.025),d))*smoothstep(bottom-.03,bottom+.03,q.y);}
vec3 c348window(vec3 c,vec2 q,float w,float spring,float bottom,bool blind){
 float outer=c348arch(q,w+.23,spring,bottom-.16),inner=c348arch(q,w,spring,bottom);
 c=mix(c,vec3(.69,.61,.47),outer);c=mix(c,blind?vec3(.55,.48,.36):vec3(.16,.21,.22),inner);
 if(!blind){float bar=max(c348line(q.x,.035),c348line(mod(q.y-bottom+.65,1.3)-.65,.028));c=mix(c,vec3(.48,.43,.32),inner*bar);}
 return c;
}
vec3 f348Detail181(vec3 base,vec3 p,vec3 n,vec4 f){float u=f.x,v=f.y,y=p.y,k=f.w;vec3 wall=vec3(.78,.49,.22),stone=vec3(.72,.65,.52),green=vec3(.43,.57,.48);vec3 c=wall;
 // Original dome carrier: vertical drum separate from curved copper surfaces.
 if(k>4.5&&k<5.5){
  float angle=atan(v-.6,u+1.98);float bay=mod(angle+3.14159265/8.,6.2831853/16.)-3.14159265/8.;
  if(abs(n.y)>.15||y>=28.){float rib=c348line(bay,.009);float seam=c348line(mod(bay+.06545,.1309)-.06545,.0025);c=green*(.94+.06*cos(angle-1.));c*=1.-rib*.24-seam*.10;return c;}
  c=c348window(wall,vec2(bay*8.15,y),.74,25.55,19.3,false);
  c=mix(c,stone,max(c348line(y-18.35,.24),c348line(y-27.45,.30)));return c;
 }
 // Original lantern: source-backed round arched openings, no cutout or added volume.
 if(k>5.5&&k<6.5){if(n.y>.12||y>44.)return green*(.94+.06*n.x);float a=atan(v-.6,u+1.98);float q=(mod(a+.392699,.785398)-.392699)*2.2;
 c=c348window(green,vec2(q,y),.47,42.5,40.3,false);return mix(c,green*.75,max(c348line(y-40.15,.12),c348line(y-43.8,.15)));}
 // Original two western bell towers; paired round louver openings on each vertical face.
 if(k>2.5&&k<4.5){if(n.y>.15)return green*(.94+.06*n.z);float centerV=k<3.5?11.1:-11.05;float t=abs(n.x)>.7?v-centerV:u+13.;
 for(int j=0;j<2;j++){float x=j==0?-1.9:1.9;vec2 q=vec2(t-x,y);c=c348window(c,q,1.08,21.25,17.1,false);float mask=c348arch(q,1.08,21.25,17.1);c=mix(c,vec3(.29,.31,.27),mask*.7);c*=1.-mask*c348line(mod(y+.16,.32)-.16,.035)*.25;}
 return mix(c,stone,max(c348line(y-16.3,.20),c348line(y-22.65,.24)));}
 if(k>1.5&&k<2.5)return n.y>.2?green:stone;
 if(k>6.5&&n.y>.2)return vec3(.37,.39,.36);
 if(n.y>.2){return vec3(.39,.41,.38)*(1.-.075*c348line(v-.55,.1));}
 // Ashlar plinth, continuous cornices and wall bands from the church reference.
 c=mix(c,stone,1.-smoothstep(1.1,1.25,y));float bands=max(c348line(y-1.5,.12),max(c348line(y-5.25,.12),max(c348line(y-7.05,.13),c348line(y-15.5,.28))));c=mix(c,stone,bands);
 // East main facade, centered on the original doorway projection (not each footprint fragment).
 if(n.x>.88&&u>18.7){float t=v-2.0;
  float pil=max(c348line(abs(t)-4.5,.48),c348line(abs(t)-2.85,.29));c=mix(c,stone,pil);
  c*=1.-pil*c348line(mod(y+.24,.48)-.24,.018)*.10;
  float portal=c348arch(vec2(t,y),1.92,5.9,.15);c=mix(c,stone,c348arch(vec2(t,y),2.32,5.9,.02));c=mix(c,vec3(.18,.19,.16),portal);
  float doorGrid=max(c348line(t,.045),c348line(mod(y+.52,1.04)-.52,.033));c=mix(c,vec3(.42,.36,.24),portal*doorGrid);
  c=c348window(c,vec2(t,y),2.05,13.15,10.4,false);
  c=mix(c,stone,max(c348line(y-9.25,.35),c348line(y-10.05,.15)));
  if(abs(t)>2.9&&abs(t)<4.3){float plaque=c348box(vec2(abs(t)-3.6,y-12.6),vec2(.58,.8));c=mix(c,stone,plaque);}
  return c;
 }
 // North/south nave: one large thermal arched window per supported broad central bay,
 // with local stone quoins at its corners, avoiding a generic whole-wall grid.
 if(abs(n.z)>.88){float t=u+1.75;
  if(u> -8.&&u<6.8)c=c348window(c,vec2(t,y),3.55,11.05,7.5,false);
  float pil=max(c348line(u+8.1,.38),c348line(u-6.5,.38));c=mix(c,stone,pil);
  if(u>10.&&u<17.)c=c348window(c,vec2(u-13.3,y),1.15,9.9,4.2,true);
 }
 return c;
}
`;
