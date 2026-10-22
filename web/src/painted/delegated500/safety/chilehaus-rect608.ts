/** Exact seven-mask AA support elimination; no LOD, window/layout or geometry changes. */
const OLD="vec3 ch42rect(vec3 c,vec2 q,vec2 at,vec2 h){vec3 trim=vec3(.79,.81,.72),glass=vec3(.28,.36,.34);float pane=ch42box(q,at,h);c=mix(c,vec3(.12,.13,.12),ch42box(q,at,h+vec2(.10,.08)));c=mix(c,trim,ch42box(q,at,h+vec2(.048,.043)));c=mix(c,glass,pane);c=mix(c,trim,ch42box(q,at,vec2(.023,h.y)));for(int j=0;j<3;j++)c=mix(c,trim,ch42box(q,at+vec2(0.,(float(j)-1.)*h.y*.57),vec2(h.x,.019)));return c;}";
const NEW="float ch42boxAA608(vec2 p,vec2 c,vec2 h,vec2 aa){vec2 m=1.-smoothstep(h-aa,h+aa,abs(p-c));return m.x*m.y;}\nvec3 ch42rect(vec3 c,vec2 q,vec2 at,vec2 h){vec2 aa=max(fwidth(q),vec2(.003));if(any(greaterThan(abs(q-at),(h+vec2(.10,.08))+aa)))return c;vec3 trim=vec3(.79,.81,.72),glass=vec3(.28,.36,.34);float pane=ch42boxAA608(q,at,h,aa);c=mix(c,vec3(.12,.13,.12),ch42boxAA608(q,at,h+vec2(.10,.08),aa));c=mix(c,trim,ch42boxAA608(q,at,h+vec2(.048,.043),aa));c=mix(c,glass,pane);c=mix(c,trim,ch42boxAA608(q,at,vec2(.023,h.y),aa));for(int j=0;j<3;j++)c=mix(c,trim,ch42boxAA608(q,at+vec2(0.,(float(j)-1.)*h.y*.57),vec2(h.x,.019),aa));return c;}";
export function chilehausRect608(source:string,key:string):string|undefined{
 if(!['shared577-4980','f4980','f4981','f4982','f4983','f4984'].includes(key))return;
 if(source.split(OLD).length!==2||source.includes('ch42boxAA608'))return;
 return source.replace(OLD,NEW);
}
