/** Appearance only: source material/colour remain raw tags; repeating windows/textures are display schematics. */
export type SurfaceStyle={material:0|1|2|3|4|5|6|7;wallColour?:[number,number,number];windows:boolean;materialSource:string|undefined;colourSource:string|undefined;patternStatus:'display-schematic';styleId:number};
const materials:Record<string,SurfaceStyle['material']>={brick:1,stone:2,sandstone:2,limestone:2,granite:2,plaster:3,stucco:3,concrete:4,wood:5,timber:5,metal:6,steel:6,aluminium:6,glass:7};
const namedColours:Record<string,string>={white:'#eeeeea',grey:'#a5a6a6',gray:'#a5a6a6',black:'#35393c',red:'#a95248',brown:'#80634d',beige:'#c7bea8',yellow:'#d2c39c',blue:'#6e8c9b',green:'#819786'};
function colour(value:unknown):[number,number,number]|undefined{if(typeof value!=='string'||value.length>64)return;let c=value.trim().toLowerCase();c=namedColours[c]??c;if(/^#[a-f0-9]{3}$/.test(c))c='#'+[...c.slice(1)].map(x=>x+x).join('');if(!/^#[a-f0-9]{6}$/.test(c))return;return[parseInt(c.slice(1,3),16)/255,parseInt(c.slice(3,5),16)/255,parseInt(c.slice(5,7),16)/255];}
export function sourceSurfaceStyle(properties:Record<string,unknown>|null|undefined):SurfaceStyle{
 const p=properties??{},materialSource=typeof p['building:material']==='string'?p['building:material'].trim().slice(0,64):undefined,colourSource=typeof p['building:colour']==='string'?p['building:colour'].trim().slice(0,64):undefined;
 const material=materialSource?materials[materialSource.toLowerCase()]??0:0,windows=!['roof','carport','shed','garage','garages'].includes(String(p.building));return {material,wallColour:colour(colourSource),windows,materialSource,colourSource,patternStatus:'display-schematic',styleId:material+(windows?0:8)};
}
/** WebGL2 fragment helper. local XYZ are metres, Y-up; RGB only, so picking/depth opacity is unchanged. */
export const BUILDING_SURFACE_FRAGMENT_GLSL=`
float sourceGridLine(float x,float spacing,float width){float q=abs(fract(x/spacing+.5)-.5)*spacing;return 1.-smoothstep(width,width+fwidth(x)*1.5,q);}
vec3 sourceFacade(vec3 base,vec3 p,vec3 normal,float material,float hasWindows){
 float wall=1.-smoothstep(.18,.42,abs(normal.y));
 // Use east/west or north/south wall coordinate; never derive a source floor/tenant from this pattern.
 vec2 uv=vec2(abs(normal.x)>abs(normal.z)?p.z:p.x,p.y);vec3 tint=base;
 if(material>.5&&material<1.5){float row=floor(uv.y/.22);float joint=max(sourceGridLine(uv.x+mod(row,2.)*.18,.36,.009),sourceGridLine(uv.y,.22,.009));tint=mix(base,base*.64,joint*.48);}
 else if(material>1.5&&material<2.5){float row=floor(uv.y/.45);float joint=max(sourceGridLine(uv.x+mod(row,2.)*.35,.7,.018),sourceGridLine(uv.y,.45,.018));tint=mix(base,base*.69,joint*.35);}
 else if(material>2.5&&material<4.5){float plaster=sin(uv.x*37.)*sin(uv.y*29.);tint=base*(.985+plaster*.015);}
 else if(material>4.5&&material<5.5){float board=sourceGridLine(uv.x,.16,.006);tint=base*(1.-board*.11);}
 else if(material>5.5&&material<6.5){float panel=max(sourceGridLine(uv.x,1.25,.018),sourceGridLine(uv.y,1.6,.018));tint=base*(1.-panel*.12);}
 else if(material>6.5){float mullion=max(sourceGridLine(uv.x,1.5,.035),sourceGridLine(uv.y,2.8,.035));tint=mix(base,vec3(.31,.4,.43),.25)*(1.-mullion*.3);}
 float scale=max(length(fwidth(uv)),.0001);float detail=1.-smoothstep(.35,.8,scale);
 vec2 cell=fract((uv-vec2(.4,.65))/vec2(2.8,3.1));
 float windowMask=step(.2,cell.x)*step(cell.x,.62)*step(.18,cell.y)*step(cell.y,.68)*step(1.5,p.y)*hasWindows;
 tint=mix(tint,vec3(.22,.28,.31),windowMask*.58*detail);
 return mix(base,tint,wall*detail);
}
`;

/** Compatible with renderer packed state: growth + selected*2 + styleId*4. Windows suppression is bit8. */
export const BUILDING_SURFACE_STYLE_CALL_GLSL='sourceFacade(v_color, v_local_position, normalize(v_normal), mod(v_style, 8.), 1.-step(8., v_style))';
