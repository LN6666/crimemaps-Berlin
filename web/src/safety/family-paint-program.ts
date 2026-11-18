/** Explicit-family specialization; renderer recipes separately provide conservative family sets.
 * Derived from the 793669526f59adb812e6f0a400c3e56b70d348fe review draft:
 * original module SHA256 3d1ea8146856f4eaa009a28450454e0177a5326c2373df801cffb6911e9cfa41;
 * original patch SHA256 dc7426735b1a53621e1dc9550c3e77e0f485ce8dbf5e28ee4874e3b69f2306bf.
 * Callers must prove the complete highp float32 values passed to paintedFacade for a draw.
 * Unknown/mutating parameters retain the entire body. No GPU, raw decode, base-caster
 * equivalence or shader-cost claim follows from a successful specialization.
 *
 * Per-family programs for root500/infill/bremen, derived from the exact text each key compiles
 * today. Shares the shape of delegated500/current-paint-program.ts: same function ranges and call
 * lists, kept functions keep their original bytes, main is never edited, unreachable functions are
 * dropped. Differences (each only removes code that cannot execute for the given families):
 *  - Forwarding is discovered callers-first over the call DAG: a callee with one definition whose last
 *    parameter is a float receives the union of the values that the REMAINING calls in reachable,
 *    single-definition callers pass, when every such caller never writes its own last parameter and
 *    every such argument is a supported exact expression of that parameter (no '/', no user call).
 *  - Guards are evaluated three-valued and only when pure (no user call, assignment, ++/--, '/', '?:', '[').
 *  - A body that never writes its parameter may also lose later false top-level `if` clauses and
 *    everything after a top-level clause that always returns.
 *  - `families` is a set: a clause is removed only when false for every member.
 * Unsupported function shapes retain their bodies. Unsupported source-level preprocessing/precision
 * is rejected. No table or historical certificate is trusted. */
type FunctionRange={readonly name:string;readonly start:number;readonly open:number;readonly end:number;readonly params:string};
type Statement={readonly kind:'if'|'block'|'loop'|'stmt';readonly start:number;readonly end:number;readonly guard?:readonly[number,number];readonly then?:Statement;readonly else?:Statement};
type Prepared={readonly ranges:readonly FunctionRange[];readonly names:ReadonlySet<string>;readonly byName:ReadonlyMap<string,readonly FunctionRange[]>;readonly calls:ReadonlyMap<FunctionRange,readonly string[]>;readonly param:ReadonlyMap<FunctionRange,string>;readonly readOnly:ReadonlyMap<FunctionRange,boolean>;readonly masked:string;readonly statements:ReadonlyMap<FunctionRange,readonly Statement[]>;readonly order:readonly string[]};
const PURE_BUILTINS=new Set(['abs','floor','ceil','fract','sign','min','max','clamp','mix','step','smoothstep','length','distance','dot','cross','normalize','sqrt','inversesqrt','pow','exp','exp2','log','log2','sin','cos','tan','asin','acos','atan','radians','degrees','mod','round','roundEven','trunc','fwidth','dFdx','dFdy','float','int','uint','bool','vec2','vec3','vec4','ivec2','ivec3','ivec4','bvec2','bvec3','bvec4','any','all','not','lessThan','greaterThan','lessThanEqual','greaterThanEqual','equal','notEqual','isnan','isinf']);
const OUT_BUILTINS=new Set(['modf','frexp','uaddCarry','usubBorrow','umulExtended','imulExtended']);
const TYPES='(?:float|int|uint|bool|[biu]?vec[234]|mat[234](?:x[234])?)';
const UNKNOWN=Symbol('unknown');type Value=number|typeof UNKNOWN;
function maskComments(source:string){return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,s=>s.replace(/[^\n]/g,' '));}
function closeAt(source:string,start:number,open:string,close:string){let depth=1;for(let at=start+1;at<source.length;at++){if(source[at]===open)depth++;else if(source[at]===close&&!--depth)return at;}throw Error('Unbalanced family paint shader');}
function splitTop(text:string){const out:string[]=[];let depth=0,s=0;for(let i=0;i<text.length;i++){const c=text[i];if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(c===','&&!depth){out.push(text.slice(s,i));s=i+1;}}out.push(text.slice(s));return out.map(x=>x.trim());}
function functions(source:string,masked=maskComments(source)):FunctionRange[]{
 const ranges:FunctionRange[]=[];
 const signature=/\b(?:(?:highp|mediump|lowp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*\(([^;{}]*?)\)\s*\{/g;
 for(let match:RegExpExecArray|null;(match=signature.exec(masked));){
  if(['if','for','while','switch'].includes(match[2]))continue;
  const open=signature.lastIndex-1,end=closeAt(masked,open,'{','}')+1;
  ranges.push({name:match[2],start:match.index,open,end,params:match[3]});signature.lastIndex=end;
 }
 if(!ranges.some(f=>f.name==='main')||!ranges.some(f=>f.name==='paintedFacade'))throw Error('Family paint shader entrypoints missing');
 return ranges;
}
const impureText=(text:string)=>/\+\+|--|(?<![=!<>])=(?!=)/.test(text);
// Small dyadic domain: every admitted operand/result is exact in highp float32.
// One arithmetic operator per boolean atom also excludes reassociation/FMA choices.
// Independent &&/|| operands have separate budgets; forwarded numeric arguments do not.
// Inexact literals, integer-suffixed literals and other arithmetic stay UNKNOWN.
const exactSmall=(v:number)=>Number.isFinite(v)&&Math.abs(v)<=1048576&&Number.isInteger(v*4)&&Math.fround(v)===v;
/** Restricted exact evaluator: P is explicitly supplied, other atoms are UNKNOWN. */
function evaluate(text:string,value:number,parameter:string,userNames:ReadonlySet<string>,boolean:boolean):Value|undefined{
 if(impureText(text))return undefined;
 const tokens=text.match(/(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[uU]?|[A-Za-z_]\w*|\|\||&&|==|!=|<=|>=|[()+\-*/!<>,.?:\[\]]/g)??[];
 if(tokens.some(t=>/^0[0-9]+[uU]?$/.test(t)))return undefined; // GLSL integer spelling may be octal; never interpret it as JS decimal.
 if(tokens.join('')!==text.replace(/\s/g,'')||tokens.some(t=>t==='/'||t==='['||(boolean&&t==='?')))return undefined;
 if(!boolean&&tokens.filter(t=>t==='+'||t==='-'||t==='*').length>1)return undefined;
 let at=0;const precedence:Record<string,number>={'||':1,'&&':2,'==':3,'!=':3,'<':4,'<=':4,'>':4,'>=':4,'+':5,'-':5,'*':6};
 type Evaluated={value:Value;arithmetic:number};
 const result=(value:Value,arithmetic=0):Evaluated=>{if(arithmetic>1)throw Error('arithmetic chain');return{value,arithmetic};};
 const postfix=(v:Evaluated):Evaluated=>{while(tokens[at]==='.'){at++;if(!/^[xyzwrgbastpq]{1,4}$/.test(tokens[at++]??''))throw Error('swizzle');v=result(UNKNOWN,v.arithmetic);}return v;};
 function call(name:string):Evaluated{if(tokens[at++]!=='(')throw Error('call');const args:Evaluated[]=[];if(tokens[at]!==')')for(;;){args.push(ternary());if(tokens[at]===','){at++;continue;}break;}if(tokens[at++]!==')')throw Error('call');
  if(userNames.has(name)||!PURE_BUILTINS.has(name))throw Error('impure');
  const arithmetic=args.reduce((sum,v)=>sum+v.arithmetic,0),arg=args[0]?.value;
  if((name==='abs'||name==='floor')&&args.length===1&&arg!==UNKNOWN&&exactSmall(arg))return result(name==='abs'?Math.abs(arg):Math.floor(arg),arithmetic);
  if(name==='float'&&args.length===1)return result(arg,arithmetic);return result(UNKNOWN,arithmetic);}
 function atom():Evaluated{const token=tokens[at++];if(token===undefined)throw Error('end');
  if(token==='!'){const v=atom();return result(v.value===UNKNOWN?UNKNOWN:Number(!v.value),v.arithmetic);}if(token==='-'){const v=atom();return result(v.value===UNKNOWN?UNKNOWN:Math.fround(-v.value),v.arithmetic+1);}if(token==='+'){const v=atom();return result(v.value,v.arithmetic+1);}
  if(token==='('){const v=ternary();if(tokens[at++]!==')')throw Error('paren');return postfix(v);}
  if(token===parameter)return postfix(result(value));if(token==='true')return result(1);if(token==='false')return result(0);
  if(/^[A-Za-z_]/.test(token))return postfix(tokens[at]==='('?call(token):result(UNKNOWN));
  const v=Number(token);return result(!Number.isFinite(v)||!exactSmall(v)?UNKNOWN:v);}
 function expression(minimum:number):Evaluated{let left=atom();
  while(at<tokens.length&&(precedence[tokens[at]]??-1)>=minimum){const op=tokens[at++],right=expression(precedence[op]+1);
   const a=left.value,b=right.value;
   // Parse both operands before combining: even an unreachable call or arithmetic
   // chain must still reject the complete guard, rather than disappear by short circuit.
   if(op==='&&'){left=result(a===0||b===0?0:a===UNKNOWN||b===UNKNOWN?UNKNOWN:Number(!!a&&!!b));continue;}
   if(op==='||'){left=result((a!==UNKNOWN&&a!==0)||(b!==UNKNOWN&&b!==0)?1:a===UNKNOWN||b===UNKNOWN?UNKNOWN:0);continue;}
   const arithmetic=left.arithmetic+right.arithmetic+Number(op==='+'||op==='-'||op==='*');
   if(a===UNKNOWN||b===UNKNOWN){left=result(UNKNOWN,arithmetic);continue;}
   if(op==='+'||op==='-'||op==='*'){const next=op==='+'?a+b:op==='-'?a-b:a*b;left=result(exactSmall(a)&&exactSmall(b)&&exactSmall(next)?next:UNKNOWN,arithmetic);continue;}
   switch(op){case'==':left=result(Number(a===b),arithmetic);break;case'!=':left=result(Number(a!==b),arithmetic);break;case'<':left=result(Number(a<b),arithmetic);break;case'<=':left=result(Number(a<=b),arithmetic);break;case'>':left=result(Number(a>b),arithmetic);break;case'>=':left=result(Number(a>=b),arithmetic);break;}
  }return left;}
 function ternary():Evaluated{const c=expression(0);if(tokens[at]!=='?')return c;at++;const a=ternary();if(tokens[at++]!==':')throw Error('ternary');const b=ternary();return result(c.value===UNKNOWN?UNKNOWN:c.value?a.value:b.value,c.arithmetic+a.arithmetic+b.arithmetic);}
 try{const r=ternary();return at===tokens.length?r.value:undefined;}catch{return undefined;}
}
function guardValue(text:string,families:readonly number[],parameter:string,userNames:ReadonlySet<string>):boolean|undefined{
 let yes=0,no=0;for(const v of families){const r=evaluate(text,v,parameter,userNames,true);if(r===undefined||r===UNKNOWN)return undefined;if(r)yes++;else no++;}
 return yes&&!no?true:no&&!yes?false:undefined;
}
function statements(masked:string):Statement[]{
 const out:Statement[]=[];let at=0;const skip=()=>{while(at<masked.length&&/\s/.test(masked[at]))at++;};
 const one=():Statement|undefined=>{skip();const start=at;if(at>=masked.length)return;
  if(masked.startsWith('if',at)&&!/\w/.test(masked[at+2]??'')){let open=at+2;while(/\s/.test(masked[open]??''))open++;
   if(masked[open]==='('){const close=closeAt(masked,open,'(',')');at=close+1;const then=one();if(!then)throw Error('if');const save=at;skip();let otherwise:Statement|undefined;
    if(masked.startsWith('else',at)&&!/\w/.test(masked[at+4]??'')){at+=4;otherwise=one();if(!otherwise)throw Error('else');}else at=save;
    return {kind:'if',guard:[open+1,close],then,else:otherwise,start,end:at};}}
  if(masked[at]==='{'){at=closeAt(masked,at,'{','}')+1;return {kind:'block',start,end:at};}
  if(/^(?:switch|do|case|default)\b/.test(masked.slice(at,at+8)))throw Error('unsupported statement');
  if(/^(?:for|while)\b/.test(masked.slice(at,at+6))){const open=masked.indexOf('(',at);at=closeAt(masked,open,'(',')')+1;const body=one();if(!body)throw Error('loop');return {kind:'loop',start,end:at};}
  let depth=0;for(;at<masked.length;at++){const c=masked[at];if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(c==='{'&&!depth)at=closeAt(masked,at,'{','}');else if(c===';'&&!depth){at++;return {kind:'stmt',start,end:at};}}
  throw Error('unterminated statement');};
 for(;;){const s=one();if(!s)break;out.push(s);}
 return out;
}
const singleReturn=(text:string)=>/^\s*return\s+[^;{}]+;\s*$/.test(text);
function terminalBlockReturn(body:string){let depth=0,start=0,last='';for(let i=0;i<body.length;i++){if(body[i]==='{')depth++;else if(body[i]==='}'){depth--;if(!depth)start=i+1;}else if(body[i]===';'&&!depth){last=body.slice(start,i+1).trim();start=i+1;}}return !body.slice(start).trim()&&/^return\s+[^;{}]+;$/.test(last);}
/** True only when the (comment-masked) body can never change its parameter `name`. */
function readOnlyParameter(masked:string,name:string,signatures:ReadonlyMap<string,string[]>){
 const n=name.replace(/\W/g,''),re=(text:string)=>new RegExp(text.replaceAll('NAME',n),'g');
 // Parenthesized lvalues remain writable: ((family)) += 1 and bump((family)).
 if(re('\\bNAME(?:\\s*\\))*\\s*(?:[-+*/%&|^]|<<|>>)?=(?!=)').test(masked)||re('(?:\\+\\+|--)(?:\\s*\\()*\\s*NAME\\b|\\bNAME(?:\\s*\\))*\\s*(?:\\+\\+|--)').test(masked))return false;
 if(re('\\bNAME\\s*(?:[-+*/%&|^]|<<|>>)?=(?!=)').test(masked)||re('(?:\\+\\+|--)\\s*NAME\\b|\\bNAME\\s*(?:\\+\\+|--)').test(masked)||re('\\bNAME\\s*[.[]').test(masked))return false;
 for(const m of masked.matchAll(re('\\b([A-Za-z_]\\w*)\\s+NAME\\s*[=;,\\[)]')))if(!['return','else','case','do'].includes(m[1]))return false;
 for(const m of masked.matchAll(new RegExp('(?:^|[;{}(])\\s*(?:const\\s+)?(?:(?:highp|mediump|lowp)\\s+)?'+TYPES+'\\s+','g'))){
  let depth=0,end=m.index+m[0].length;for(;end<masked.length;end++){const c=masked[end];if(c==='('||c==='[')depth++;else if(c===')'||c===']'){if(!depth)break;depth--;}else if((c===';'||c==='{'||c==='}')&&!depth)break;}
  if(splitTop(masked.slice(m.index+m[0].length,end)).some(part=>part.match(/^([A-Za-z_]\w*)/)?.[1]===n))return false;
 }
 for(const m of masked.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)){
  const open=m.index+m[0].length-1;let close:number;try{close=closeAt(masked,open,'(',')');}catch{return false;}
  const args=splitTop(masked.slice(open+1,close));
  if(OUT_BUILTINS.has(m[1])&&args.some(a=>re('\\bNAME\\b').test(a)))return false;
  const known=signatures.get(m[1]);
  if(!known&&!PURE_BUILTINS.has(m[1])&&!['if','for','while','switch'].includes(m[1])&&args.some(a=>re('\\bNAME\\b').test(a)))return false;
  for(const params of known??[]){const ps=splitTop(params);if(args.some((a,i)=>re('\\bNAME\\b').test(a)&&/\b(?:out|inout)\b/.test(ps[i]??'')))return false;}
 }
 return true;
}
function callsIn(body:string,names:ReadonlySet<string>){return [...new Set([...maskComments(body).matchAll(/\b([A-Za-z_]\w*)\s*\(/g)].map(m=>m[1]).filter(name=>names.has(name)))];}
// Analysis is owned by the caller's admitted source working set. There is no
// module cache: releasing that owner drops its source and complete base parse.
function prepare(source:string):Prepared{
 const checked=maskComments(source);
 if(!/^\s*#version\s+300\s+es\b/m.test(checked)||!/^\s*precision\s+highp\s+float\s*;/m.test(checked)||/\bprecision\s+(?:mediump|lowp)\s+float\s*;/.test(checked)||/^\s*#(?!version\b|extension\b)/m.test(checked))throw Error('Unsupported family shader preprocessing/precision');
 const ranges=functions(source,checked),names=new Set(ranges.map(f=>f.name)),byName=new Map<string,FunctionRange[]>(),calls=new Map<FunctionRange,string[]>(),masked=checked;
 for(const f of ranges){(byName.get(f.name)??byName.set(f.name,[]).get(f.name)!).push(f);calls.set(f,callsIn(source.slice(f.open+1,f.end-1),names));}
 const signatures=new Map<string,string[]>();for(const f of ranges)(signatures.get(f.name)??signatures.set(f.name,[]).get(f.name)!).push(f.params);
 let outside='',last=0;for(const f of ranges){outside+=masked.slice(last,f.start)+' '.repeat(f.end-f.start);last=f.end;}outside+=masked.slice(last);
 for(const m of outside.matchAll(/\b[A-Za-z_]\w*\s+([A-Za-z_]\w*)\s*\(([^;{}()]*)\)\s*;/g))(signatures.get(m[1])??signatures.set(m[1],[]).get(m[1])!).push(m[2]);
 const param=new Map<FunctionRange,string>(),readOnly=new Map<FunctionRange,boolean>(),paintedFacadeCalls:FunctionRange[]=[];
 for(const f of ranges){const p=masked.slice(f.start,f.open).match(/,\s*float\s+([A-Za-z_]\w*)\s*\)\s*$/)?.[1];if(p){param.set(f,p);readOnly.set(f,readOnlyParameter(masked.slice(f.open+1,f.end-1),p,signatures));}
  for(const _ of masked.slice(f.open+1,f.end-1).matchAll(/\bpaintedFacade\s*\(/g))paintedFacadeCalls.push(f);}
 // The entry/call-graph checks and body parse do not depend on family values.
 if(byName.get('paintedFacade')!.length!==1||paintedFacadeCalls.length!==1||paintedFacadeCalls[0].name!=='main')throw Error('paintedFacade must be called once, from main');
 const order:string[]=[],state=new Map<string,number>();
 const visit=(n:string)=>{if(state.get(n)===2)return;if(state.get(n)===1)throw Error('Recursive family paint shader');state.set(n,1);const group=byName.get(n)??[];for(const f of group)for(const c of calls.get(f)??[])if(c!==n||group.length===1)visit(c);state.set(n,2);order.push(n);};
 visit('main');order.reverse();
 const parsed=new Map<FunctionRange,readonly Statement[]>();
 const freezeStatement=(s:Statement):Statement=>{if(s.guard)Object.freeze(s.guard);if(s.then)freezeStatement(s.then);if(s.else)freezeStatement(s.else);return Object.freeze(s);};
 for(const f of ranges){
  if(param.has(f)&&readOnly.get(f))try{parsed.set(f,Object.freeze(statements(masked.slice(f.open+1,f.end-1)).map(freezeStatement)));}catch{/* Unsupported bodies remain unchanged. */}
  Object.freeze(f);Object.freeze(calls.get(f));
 }
 for(const group of byName.values())Object.freeze(group);
 return Object.freeze({ranges:Object.freeze(ranges),names,byName,calls,param,readOnly,masked,statements:parsed,order:Object.freeze(order)});
}
function narrowBody(p:Prepared,source:string,range:FunctionRange,families:readonly number[]):string{
 const body=source.slice(range.open+1,range.end-1),masked=p.masked.slice(range.open+1,range.end-1),parameter=p.param.get(range);
 if(!parameter)return body;
 const list=p.statements.get(range);if(!list)return body;
 const guard=(s:Statement)=>guardValue(masked.slice(s.guard![0],s.guard![1]),families,parameter,p.names);
 if(!p.readOnly.get(range))return body;
 const edits:[number,number,string][]=[];let first=true;
 for(const s of list){
  if(s.kind==='if'&&!s.else){const known=guard(s);
   if(known===false){edits.push([s.start,s.end,'']);continue;}
   if(known===true){const t=s.then!,inner=t.kind==='block'?masked.slice(t.start+1,t.end-1):masked.slice(t.start,t.end);
    if(singleReturn(inner)||(t.kind==='block'&&terminalBlockReturn(inner))){
     if(first&&singleReturn(inner))return t.kind==='block'?body.slice(t.start+1,t.end-1):body.slice(t.start,t.end);
     edits.push([s.start,body.length,body.slice(t.start,t.end)]);break;}}
   first=false;continue;}
  first=false;
  if(s.kind==='stmt'&&/^\s*return\b/.test(masked.slice(s.start,s.end))){edits.push([s.end,body.length,'']);break;}
 }
 let out='',at=0;for(const [a,b,t]of edits){out+=body.slice(at,a)+t;at=b;}return out+body.slice(at);
}
function validateFamilies(families:readonly number[]){
 if(!families.length||families.some(f=>!Number.isFinite(f)||Math.fround(f)!==f||(f!==0&&Math.abs(f)<2**-126)))throw Error('Explicit normal float32 paint families required');
}
function narrowed(source:string,families:readonly number[],p:Prepared){
 validateFamilies(families);
 const values=new Map<string,number[]>([['paintedFacade',[...new Set(families.map(v=>Math.fround(v)))]]]),incoming=new Map<string,(number[]|undefined)[]>(),reachable=new Set(['main']),bodies=new Map<FunctionRange,string>(),narrowCalls=new Map<FunctionRange,readonly string[]>();
 for(const name of p.order){
  if(!reachable.has(name))continue;const group=p.byName.get(name)??[];
  if(name!=='paintedFacade'&&name!=='main'&&group.length===1&&p.param.has(group[0])){const list=incoming.get(name)??[];if(list.length&&list.every(x=>x))values.set(name,[...new Set(list.flat() as number[])]);}
  for(const f of group){
   // No known family input means this body cannot be narrowed or forward a
   // known value. Its immutable base call graph already contains exactly the
   // callees needed here; rescanning all of its text for every family only
   // reconstructs the same unknown inputs. One unknown per callee suffices to
   // prevent narrowing, including when another caller supplies known values.
   if(!values.has(name)){
    const called=p.calls.get(f)??[];
    for(const callee of called){reachable.add(callee);(incoming.get(callee)??incoming.set(callee,[]).get(callee)!).push(undefined);}
    narrowCalls.set(f,called);continue;
   }
   const v=values.get(name),body=v?narrowBody(p,source,f,v):source.slice(f.open+1,f.end-1);if(v)bodies.set(f,body);
   const masked=maskComments(body),parameter=p.param.get(f),forward=!!v&&!!parameter&&p.readOnly.get(f)&&group.length===1;const called=new Set<string>();
   for(const m of masked.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)){const callee=m[1];if(!p.names.has(callee))continue;called.add(callee);reachable.add(callee);
    let passed:number[]|undefined;
    if(forward){const open=m.index+m[0].length-1,argument=splitTop(masked.slice(open+1,closeAt(masked,open,'(',')'))).at(-1)!;const r=v!.map(x=>evaluate(argument,x,parameter!,p.names,false));if(r.every(x=>typeof x==='number'&&Number.isFinite(x)))passed=r as number[];}
    (incoming.get(callee)??incoming.set(callee,[]).get(callee)!).push(passed);}
   narrowCalls.set(f,[...called]);
  }
 }
 const reach=(start:string)=>{const seen=new Set<string>(),pending=[start];while(pending.length){const name=pending.pop()!;if(seen.has(name))continue;seen.add(name);for(const f of p.byName.get(name)??[])for(const c of narrowCalls.get(f)??p.calls.get(f)??[])if(!seen.has(c))pending.push(c);}return seen;};
 return {p,bodies,reach};
}
function specializedFragment(source:string,{p,bodies,reach}:ReturnType<typeof narrowed>):string{
 const reachable=reach('main');const chunks:string[]=[];let at=0;
 for(const f of p.ranges){chunks.push(source.slice(at,f.start));if(reachable.has(f.name))chunks.push(bodies.has(f)?source.slice(f.start,f.open+1)+bodies.get(f)+source.slice(f.end-1,f.end):source.slice(f.start,f.end));at=f.end;}
 chunks.push(source.slice(at));return chunks.join('');
}
function depthEffects({p,bodies,reach}:ReturnType<typeof narrowed>):boolean{
 for(const name of reach('paintedFacade'))for(const f of p.byName.get(name)??[])if(/\bdiscard\b|\bgl_FragDepth\b|\bgl_SampleMask\b/.test(bodies.has(f)?maskComments(bodies.get(f)!):p.masked.slice(f.open+1,f.end-1)))return true;
 return false;
}
class FamilyPaintSourceAnalysis{
 readonly #source:string;
 readonly #prepared:Prepared;
 constructor(source:string){this.#source=source;this.#prepared=prepare(source);Object.freeze(this);}
 static specialize(value:FamilyPaintSourceAnalysis,families:readonly number[]):Readonly<{fragment:string;depthEffects:boolean}>{
  const analysis=narrowed(value.#source,families,value.#prepared);
  return{fragment:specializedFragment(value.#source,analysis),depthEffects:depthEffects(analysis)};
 }
 static fragment(value:FamilyPaintSourceAnalysis,families:readonly number[]):string{return specializedFragment(value.#source,narrowed(value.#source,families,value.#prepared));}
 static effects(value:FamilyPaintSourceAnalysis,families:readonly number[]):boolean{return depthEffects(narrowed(value.#source,families,value.#prepared));}
}
/** Opaque, immutable base analysis. Its lifetime belongs to its source owner;
 * it contains no family-specific bodies, reachability closures or result cache. */
export type PreparedFamilyPaintSource=FamilyPaintSourceAnalysis;
export function prepareFamilyPaintSource(source:string):PreparedFamilyPaintSource{return new FamilyPaintSourceAnalysis(source);}
/** Narrow an already parsed complete pre-family fragment for one family set. */
export function specializePreparedFamilyPaintSource(prepared:PreparedFamilyPaintSource,families:readonly number[]):Readonly<{fragment:string;depthEffects:boolean}>{
 return FamilyPaintSourceAnalysis.specialize(prepared,families);
}
/** One admitted build derives colour text and paint-depth effects from the
 * same analysis. These compatibility helpers retain no analysis after return. */
export function specializeFamilyPaintProgram(source:string,families:readonly number[]):Readonly<{fragment:string;depthEffects:boolean}>{
 validateFamilies(families);return specializePreparedFamilyPaintSource(prepareFamilyPaintSource(source),families);
}
/** Program text for draws whose paintedFacade family is always a member of `families`. */
export function specializeFamilyPaintFragment(source:string,families:readonly number[]):string{
 validateFamilies(families);return FamilyPaintSourceAnalysis.fragment(prepareFamilyPaintSource(source),families);
}
/** Whether the specialized paintedFacade closure mentions coverage/depth effects.
 * A false result alone does NOT prove equivalence to another/base/zero-family program:
 * main and its entire non-paint closure, uniforms, clip/masks and geometry must also match. */
export function familyPaintDepthEffects(source:string,families:readonly number[]){
 validateFamilies(families);return FamilyPaintSourceAnalysis.effects(prepareFamilyPaintSource(source),families);
}
/** Map insertion order is the last-used order; active keys are protected (as delegated500). */
export function trimInactivePaintPrograms<T>(programs:Map<string,T>,visible:ReadonlySet<string>,release:(program:T)=>void,target=64){
 let removed=0;for(const [key,program]of programs){if(programs.size<=target)break;if(visible.has(key))continue;programs.delete(key);release(program);removed++;}return removed;
}

/** The root500/infill/Bremen main decodes a flat highp float32 attribute with
 * raw>=1000000 ? floor(raw/10000) : raw, then selects the float32 uniform override.
 * GLSL ES 3.00 §§4.5.1,8.3: division permits 2.5 ULP; floor is the integer <= x.
 * Use four ULP at the NEXT binade (>=8 ULP at q), covering the allowed division
 * error, storage rounding and host-double endpoint error, including binade edges.
 * This is a conservative specification model, not a measured GPU rounding mode.
 * https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf
 * A too-large/nonfinite/subnormal input fails explicitly instead of guessing.
 */
export function decodedPaintFamilies(raw:number,override=0):number[]{
 const normal=(v:number)=>Number.isFinite(v)&&Math.fround(v)===v&&(v===0||Math.abs(v)>=2**-126);
 if(!normal(raw)||!Number.isFinite(override))throw Error('Unsupported paint family input');
 const overrideOnly=selectPaintOverride([],override);if(overrideOnly.only)return overrideOnly.values;
 let families:number[];
 if(raw<1000000)families=[raw];
 else{
  const q=raw/10000;if(q>1048576)throw Error('Encoded paint family exceeds bounded exact domain');
  const error=4*2**(Math.floor(Math.log2(q))+1-23),lo=Math.floor(q-error),hi=Math.floor(q+error);
  families=Array.from({length:hi-lo+1},(_,i)=>lo+i);
 }
 return selectPaintOverride(families,override).values;
}
function selectPaintOverride(families:readonly number[],override:number){
 const u=Math.fround(override);if(!Number.isFinite(u)||(u!==0&&Math.abs(u)<2**-126))throw Error('Unsupported paint override');
 // uniform1f converts the double; allow either side of the inexact .01 literal.
 const threshold=Math.fround(.01),error=2*2**(Math.floor(Math.log2(threshold))-23),abs=Math.abs(u),only=abs>threshold+error;
 return{only,values:[...new Set(only?[u]:abs>=threshold-error?[...families,u]:families)].sort((a,b)=>a-b)};
}
export type FamilyPaintRecipe={sourceKey:string;families:readonly number[]};
export type FamilyPaintRun={key:string;firstIndex:number;indexCount:number};
/** Include the original source partition as well as every admissible family.
 * A neighbouring family never silently moves a draw to a different source recipe. */
export function familyPaintRecipeKey(sourceKey:string,families:readonly number[]):string{
 if(!families.length)throw Error('Missing family paint recipe values');
 return JSON.stringify([sourceKey,[...new Set(families)].sort((a,b)=>a-b)]);
}
export function familyPaintRecipe(key:string):FamilyPaintRecipe{
 const value=JSON.parse(key);if(!Array.isArray(value)||value.length!==2||typeof value[0]!=='string'||!Array.isArray(value[1])||!value[1].length||value[1].some((v:unknown)=>typeof v!=='number'||!Number.isFinite(v)))throw Error('Invalid family paint recipe');
 return{sourceKey:value[0],families:value[1]};
}
/** Preserve all indices, triangle order and the LAST/provoking vertex's family.
 * `sourceKey` retains the existing adapter's CPU partition decision verbatim. */
export function familyPaintRuns(indices:Uint32Array,paint:Float32Array,sourceKey:(raw:number)=>string):FamilyPaintRun[]{
 if(indices.length%3)throw Error('Non-triangle paint index buffer');
 const runs:FamilyPaintRun[]=[],keys=new Map<number,string>();
 for(let i=0;i<indices.length;i+=3){
  const at=indices[i+2]*5+4;if(at>=paint.length)throw Error('Paint family index outside metadata');
  const raw=paint[at];let key=keys.get(raw);if(key===undefined){key=familyPaintRecipeKey(sourceKey(raw),decodedPaintFamilies(raw));keys.set(raw,key);}
  const previous=runs.at(-1);if(previous?.key===key)previous.indexCount+=3;else runs.push({key,firstIndex:i,indexCount:3});
 }
 return runs;
}
/** Overrides affect the family argument, while the adapter keeps ownership of
 * which legacy source partition is selected. An ambiguous threshold keeps both. */
export function overriddenFamilyPaintKey(key:string,override:number,sourceKey:(value:number)=>string):string{
 const recipe=familyPaintRecipe(key),families=selectPaintOverride(recipe.families,override).values;
 return familyPaintRecipeKey(Math.abs(override)>.01?sourceKey(override):recipe.sourceKey,families);
}
