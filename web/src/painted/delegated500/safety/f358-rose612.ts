// Repair the actual611 misregistration: small rosettes must sit inside added gables.
export function f358Rose612(source:string,city:string){
 if(city!=='hannover'||!source.includes('// F358604 exact039 frontmost window and two independent photoapprox gables'))return source;
 const old='return mix(vec3(.45,.22,.14),vec3(.66,.63,.53),edge);';
 const calls=['vec2(19.156313,16.300000)','vec2(11.745687,16.300000)'];
 if(source.split(old).length!==2||calls.some(x=>source.split(x).length!==2))return source;
 let out=source.replace(old,'return f358Rose564(mix(vec3(.45,.22,.14),vec3(.66,.63,.53),edge),frame.xy,vec2(0.,20.0),.82);');
 // Original native wall stops at18m: move its old round masks above that face.
 for(const x of calls)out=out.replace(x,x.replace('16.300000','20.000000'));
 return out;
}
