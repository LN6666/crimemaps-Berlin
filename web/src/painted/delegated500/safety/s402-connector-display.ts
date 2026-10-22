import {S402_CONNECTOR_EXPECTED as E} from './s402-connector-display-constants';
type Component={city:string;objectId:string;partId:string;origin:readonly number[];componentGeometry:any;sourceFeature?:{properties?:any};batches:readonly {positions:ArrayLike<number>;normals:ArrayLike<number>;indices:ArrayLike<number>}[]};
type Context={city:string;signal?:AbortSignal;leafSHA:(c:Component)=>string|undefined;admissionSignature:(c:Component)=>string|undefined};
export type S402Plan={enabled:boolean;reason:string;parent?:Component;cover?:Component;context?:Context};
function signature(c:Component){let h=2166136261;const add=(b:Uint8Array)=>{for(const x of b)h=Math.imul(h^x,16777619)>>>0};const enc=new TextEncoder();add(enc.encode(JSON.stringify([c.origin,c.componentGeometry])));for(const b of c.batches)for(const k of['positions','normals','indices']as const){add(enc.encode(k));const raw=new Uint8Array(b[k].length*4),v=new DataView(raw.buffer);for(let i=0;i<b[k].length;i++){if(!Number.isFinite(b[k][i]))return'';if(k==='indices')v.setUint32(i*4,b[k][i],true);else v.setFloat32(i*4,b[k][i],true)}add(raw)}return h.toString(16).padStart(8,'0')}
/** No global cache: every resident commit and every apply revalidates exact original members. */
export function s402ConnectorPlan(cs:readonly Component[],ctx:Context):S402Plan{
 const no=(reason:string):S402Plan=>({enabled:false,reason});if(ctx.signal?.aborted)return no('cancelled');if(ctx.city!==E.city)return no('other city');
 const find=(e:typeof E.parent|typeof E.cover)=>cs.filter(c=>c.city===E.city&&c.objectId===e.objectId&&c.partId===e.partId),ps=find(E.parent),gs=find(E.cover);if(ps.length!==1||gs.length!==1)return no('members not uniquely resident');
 for(const[c,e]of[[ps[0],E.parent],[gs[0],E.cover]]as const){if(ctx.leafSHA(c)!==e.sourceLeafSHA256||signature(c)!==e.signature||ctx.admissionSignature(c)!==e.signature||JSON.stringify(c.sourceFeature?.properties)!==JSON.stringify(e.sourceProperties)||c.batches.length!==2||c.batches.some((b,i)=>b.positions.length/3!==e.vertices[i]))return no('strict source/admission mismatch');}
 if(ctx.signal?.aborted)return no('cancelled');return{enabled:true,reason:'exact named open connector precedence',parent:ps[0],cover:gs[0],context:ctx};
}
export function applyS402ConnectorMask(cs:readonly Component[],colors:Float32Array,frames:Float32Array,plan?:S402Plan){
 const no=(reason:string)=>({enabled:false,reason,wallVertices:0,roofVertices:0,wholeParentHidden:false});if(!plan?.enabled||!plan.context)return no(plan?.reason??'no plan');const check=s402ConnectorPlan(cs,plan.context);if(!check.enabled||check.parent!==plan.parent||check.cover!==plan.cover)return no(check.reason);
 const count=cs.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(colors.length!==count*4||frames.length!==count*5)return no('metadata size mismatch');
 const offsets=new Map<Component,number[]>();let at=0;for(const c of cs){let list=[];for(const b of c.batches){list.push(at);at+=b.positions.length/3}offsets.set(c,list)}const po=offsets.get(plan.parent!)!,co=offsets.get(plan.cover!)!,roof=plan.parent!.batches[0];
 for(let v=0;v<plan.cover!.batches[0].positions.length/3;v++){const i=co[0]+v;if(colors[i*4+3]<.5||[.57,.58,.53].some((x,k)=>Math.abs(colors[i*4+k]-x)>.00002))return no('cover cap material not ready');}
 const walls:number[]=[];for(const[bi,first,n]of E.wallRanges)for(let v=first;v<first+n;v++)walls.push(po[bi]+v);for(let v=0;v<plan.cover!.batches[1].positions.length/3;v++)walls.push(co[1]+v);
 for(let v=0;v<roof.positions.length/3;v++){const i=po[0]+v;if(Math.abs(roof.positions[v*3+1]-E.roofHeight)>.001||roof.normals[v*3+1]<.999||Math.abs(frames[i*5]-roof.positions[v*3])>.00002||Math.abs(frames[i*5+1]-roof.positions[v*3+2])>.00002||Math.abs(frames[i*5+4]-3779)>.01)return no('roof exact frame/plane mismatch');}
 const ids=[...walls,...Array.from({length:roof.positions.length/3},(_,v)=>po[0]+v)];if(ids.some(i=>!Number.isFinite(colors[i*4+3])||colors[i*4+3]<.5||colors[i*4+3]>=4))return no('conflicting display role');if(plan.context.signal?.aborted)return no('cancelled');
 // Only derived appearance alpha metadata is changed; positions/normals/indices untouched.
 for(const i of walls)colors[i*4+3]+=16;for(let v=0;v<roof.positions.length/3;v++)colors[(po[0]+v)*4+3]+=20;
 return{enabled:true,reason:plan.reason,wallVertices:walls.length,roofVertices:roof.positions.length/3,wholeParentHidden:false};
}
export function s402RoofContains(q:readonly number[]){let hit=false;const p=E.polygon;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[j],b=p[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/Math.max(dx*dx+dy*dy,.000001)));if(Math.hypot(q[0]-a[0]-t*dx,q[1]-a[1]-t*dy)<E.boundaryInset)return false;if((a[1]>q[1])!==(b[1]>q[1])&&q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
export function s402ConnectorPickDiscard(mode:number,alpha:number,frame:readonly number[]){if(mode<=1.5)return false;const role=Math.floor(alpha/4);return role===4||role===5&&s402RoofContains(frame);}
const gl=(x:number)=>Number.isInteger(x)?x+'.':String(x);
export const S402_CONNECTOR_MASK_GLSL='bool s402ConnectorRoof(vec2 q){bool hit=false;\n'+E.polygon.map((b,i)=>{const a=E.polygon[(i+E.polygon.length-1)%E.polygon.length];return`{vec2 a=vec2(${a.map(gl)}),b=vec2(${b.map(gl)});vec2 d=b-a;float t=clamp(dot(q-a,d)/max(dot(d,d),.000001),0.,1.);if(length(q-a-t*d)<.003)return false;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}`}).join('\n')+'return hit;}';
