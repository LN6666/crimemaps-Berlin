/** Finite programs derived from the current, fully assembled shader. Only the
 * categorical dispatch wrappers are narrowed. Kept material functions retain
 * their original bytes; current repair hooks are already present at this point.
 * No generated table certificate or historical shader body is trusted here. */
type FunctionRange={name:string;start:number;open:number;end:number};
const wrappers=new Set(['paintedFacade','progressiveFeatureDispatch','progressiveFeatureDispatchCity','progressiveFeatureDispatchCityLegacy500','progressiveFeatureDispatchCityLegacy159Baseline']);
function maskComments(source:string){return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,s=>s.replace(/[^\n]/g,' '));}
function closeAt(source:string,start:number,open:string,close:string){let depth=1;for(let at=start+1;at<source.length;at++){if(source[at]===open)depth++;else if(source[at]===close&&!--depth)return at;}throw Error('Unbalanced current paint shader');}
function functions(source:string):FunctionRange[]{
 const masked=maskComments(source),ranges:FunctionRange[]=[];
 const signature=/\b([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*\(([^;{}]*?)\)\s*\{/g;
 for(let match:RegExpExecArray|null;(match=signature.exec(masked));){
  if(['if','for','while','switch'].includes(match[2]))continue;
  const open=signature.lastIndex-1,end=closeAt(masked,open,'{','}')+1;
  ranges.push({name:match[2],start:match.index,open,end});signature.lastIndex=end;
 }
 if(!ranges.some(f=>f.name==='main')||!ranges.some(f=>f.name==='paintedFacade'))throw Error('Current paint shader entrypoints missing');
 return ranges;
}
/** Restricted numeric/boolean grammar used by the categorical dispatch guards.
 * Unknown identifiers cause the original remaining wrapper to be retained. */
function condition(text:string,family:number):boolean|undefined{
 const tokens=text.match(/(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_]\w*|\|\||&&|==|!=|<=|>=|[()+\-*/!<>]/g)??[];
 if(tokens.join('')!==text.replace(/\s/g,''))return undefined;
 if(tokens.some(t=>/^[A-Za-z_]/.test(t)&&!['family','abs','floor','true','false'].includes(t)))return undefined;
 let at=0;
 const precedence:Record<string,number>={'||':1,'&&':2,'==':3,'!=':3,'<':4,'<=':4,'>':4,'>=':4,'+':5,'-':5,'*':6,'/':6};
 function atom():number{
  const token=tokens[at++];
  if(token==='!')return Number(!atom());if(token==='-')return -atom();if(token==='+')return atom();
  if(token==='('){const v=expression(0);if(tokens[at++]!==')')throw Error('Invalid paint guard');return v;}
  if(token==='abs'||token==='floor'){if(tokens[at++]!=='(')throw Error('Invalid paint guard');const v=expression(0);if(tokens[at++]!==')')throw Error('Invalid paint guard');return Math.fround(token==='abs'?Math.abs(v):Math.floor(v));}
  if(token==='family')return family;if(token==='true')return 1;if(token==='false')return 0;
  const v=Math.fround(Number(token));if(!Number.isFinite(v))throw Error('Invalid paint guard');return v;
 }
 function expression(minimum:number):number{
  let left=atom();while(at<tokens.length&&(precedence[tokens[at]]??-1)>=minimum){const op=tokens[at++],right=expression(precedence[op]+1);
   switch(op){case'||':left=Number(!!left||!!right);break;case'&&':left=Number(!!left&&!!right);break;case'==':left=Number(left===right);break;case'!=':left=Number(left!==right);break;case'<':left=Number(left<right);break;case'<=':left=Number(left<=right);break;case'>':left=Number(left>right);break;case'>=':left=Number(left>=right);break;case'+':left=Math.fround(left+right);break;case'-':left=Math.fround(left-right);break;case'*':left=Math.fround(left*right);break;case'/':left=Math.fround(left/right);break;}
  }return left;
 }
 try{const result=expression(0);return at===tokens.length?!!result:undefined;}catch{return undefined;}
}
function terminalBlockReturn(body:string){const text=maskComments(body);let depth=0,start=0,last='';for(let i=0;i<text.length;i++){if(text[i]==='{')depth++;else if(text[i]==='}'){depth--;if(!depth)start=i+1;}else if(text[i]===';'&&!depth){last=text.slice(start,i+1).trim();start=i+1;}}return !text.slice(start).trim()&&/^return\s+[^;{}]+;$/.test(last);}
function narrowBody(source:string,range:FunctionRange,family:number,churchLayout=false){
 const body=source.slice(range.open+1,range.end-1),masked=maskComments(body);let at=0;
 for(;;){while(/\s/.test(masked[at]??'')&&at<masked.length)at++;
  if(!masked.startsWith('if',at)||/\w/.test(masked[at+2]??''))return body.slice(at);
  let open=at+2;while(/\s/.test(masked[open]??''))open++;
  if(masked[open]!=='(')return body.slice(at);
  const close=closeAt(masked,open,'(',')'),guard=masked.slice(open+1,close),known=condition(churchLayout&&range.name==='fpLayoutFacade'?guard.replace(/\blayoutId\b/g,'family'):guard,family);
  if(known===undefined)return body.slice(at);
  let begin=close+1;while(/\s/.test(masked[begin]??''))begin++;
  let end:number,statement:string;
  if(masked[begin]==='{'){end=closeAt(masked,begin,'{','}')+1;statement=body.slice(begin+1,end-1);}
  else{end=masked.indexOf(';',begin)+1;if(!end)throw Error('Invalid current paint dispatch');statement=body.slice(begin,end);}
  if(/^\s*else\b/.test(masked.slice(end)))return body.slice(at);
  // Church dispatch has multi-statement material blocks. A false categorical
  // guard cannot execute its body; a selected block with an outer terminal return
  // cannot reach later clauses. Keep that entire chosen material body verbatim.
  if(churchLayout&&!known){at=end;continue;}
  if(churchLayout&&known&&masked[begin]==='{'&&terminalBlockReturn(statement))return statement;
  // The existing delegated path still accepts only terminal single-return clauses.
  if(!/^\s*return\s+[^;{}]+;\s*$/.test(maskComments(statement)))return body.slice(at);
  if(known)return statement;
  at=end;
 }
}
export function currentPaintProgramKey(family:number){if(!Number.isFinite(family))throw Error('Non-finite paint family');return 'current-family:'+String(family);}
export function currentPaintProgramFamily(key:string){if(!key.startsWith('current-family:'))throw Error('Invalid current paint program key');const family=Number(key.slice(15));if(!Number.isFinite(family))throw Error('Invalid current paint program family');return family;}
type Prepared={source:string;ranges:FunctionRange[];names:Set<string>;byName:Map<string,FunctionRange[]>;calls:Map<FunctionRange,string[]>};
// One source only: switching city/helper releases the previous analysis. Compiled
// program strings are not cached here, and material bodies are never duplicated.
let prepared:Prepared|undefined;
function callsIn(body:string,names:Set<string>){return [...new Set([...maskComments(body).matchAll(/\b([A-Za-z_]\w*)\s*\(/g)].map(m=>m[1]).filter(name=>names.has(name)))];}
function prepare(source:string){
 if(prepared?.source===source)return prepared;
 const ranges=functions(source),names=new Set(ranges.map(f=>f.name)),byName=new Map<string,FunctionRange[]>(),calls=new Map<FunctionRange,string[]>();
 for(const f of ranges){const group=byName.get(f.name)??[];group.push(f);byName.set(f.name,group);calls.set(f,callsIn(source.slice(f.open+1,f.end-1),names));}
 return prepared={source,ranges,names,byName,calls};
}
/** The five current dispatchers have one known forwarding chain; church adds
 * its explicit identity layout alias. Verify
 * every incoming call before using its parameter value; a new or transformed
 * call retains that dispatcher rather than guessing its family context. */
function dispatchContexts(source:string,ranges:FunctionRange[],calls:Map<FunctionRange,string[]>,family:number,churchLayout=false){
 const values=new Map<string,number>([['paintedFacade',family]]);
 const chain:Array<readonly[string,string,'round'|'same',string]>=[['progressiveFeatureDispatchCity','paintedFacade','round','family'],['progressiveFeatureDispatchCityLegacy159Baseline','progressiveFeatureDispatchCity','same','family'],['progressiveFeatureDispatchCityLegacy500','progressiveFeatureDispatchCityLegacy159Baseline','same','family'],['progressiveFeatureDispatch','progressiveFeatureDispatchCityLegacy500','same','family']];
 if(churchLayout)chain.push(['fpLayoutFacade','paintedFacade','same','layoutId']);
 for(const[callee,caller,kind,parameter]of chain){
  const incoming=ranges.filter(f=>calls.get(f)?.includes(callee)),parent=values.get(caller);
  if(parent===undefined||!incoming.length||incoming.some(f=>f.name!==caller))continue;
  let valid=true;
  for(const f of incoming){const body=maskComments(source.slice(f.open+1,f.end-1)),re=new RegExp('\\b'+callee+'\\s*\\(','g');let m:RegExpExecArray|null;
   while((m=re.exec(body))){const open=re.lastIndex-1,end=closeAt(body,open,'(',')');let depth=0,start=open+1;for(let i=start;i<end;i++){if(body[i]==='(')depth++;else if(body[i]===')')depth--;else if(body[i]===','&&!depth)start=i+1;}const argument=body.slice(start,end).replace(/\s/g,'');if(kind==='same'?argument!=='family':!/^floor\(family\+(?:0?\.5)\)$/.test(argument))valid=false;re.lastIndex=end+1;}
  }
  const definitions=ranges.filter(f=>f.name===callee);if(!definitions.length||definitions.some(f=>!new RegExp(',\\s*float\\s+'+parameter+'\\s*\\)\\s*$').test(maskComments(source.slice(f.start,f.open)))))valid=false;
  if(valid)values.set(callee,kind==='round'?Math.floor(Math.fround(parent+.5)):parent);
 }
 return values;
}
export function specializeCurrentPaintFragment(source:string,family:number,churchLayout=false){
 if(!Number.isFinite(family)||!Number.isFinite(family=Math.fround(family)))throw Error('Non-finite paint family');
 const {ranges,names,byName,calls}=prepare(source),bodies=new Map<FunctionRange,string>(),narrowCalls=new Map<FunctionRange,string[]>();
 const contexts=dispatchContexts(source,ranges,calls,family,churchLayout);
 for(const f of ranges.filter(f=>wrappers.has(f.name)||(churchLayout&&f.name==='fpLayoutFacade'))){const value=contexts.get(f.name);if(value===undefined)continue;const body=narrowBody(source,f,value,churchLayout);bodies.set(f,body);narrowCalls.set(f,callsIn(body,names));}
 const reachable=new Set<string>(),pending=['main'];
 while(pending.length){const name=pending.pop()!;if(reachable.has(name))continue;reachable.add(name);
  for(const f of byName.get(name)??[])for(const call of narrowCalls.get(f)??calls.get(f)??[])if(!reachable.has(call))pending.push(call);
 }
 const chunks:string[]=[];let at=0;
 for(const f of ranges){chunks.push(source.slice(at,f.start));if(reachable.has(f.name))chunks.push(bodies.has(f)?source.slice(f.start,f.open+1)+bodies.get(f)+source.slice(f.end-1,f.end):source.slice(f.start,f.end));at=f.end;}
 chunks.push(source.slice(at));return chunks.join('');
}
/** Map insertion order is the existing renderer's last-used order. Active paint
 * is protected even when a detailed viewport itself needs more than the target. */
export function trimInactivePaintPrograms<T>(programs:Map<string,T>,visible:ReadonlySet<string>,release:(program:T)=>void,target=64){
 let removed=0;for(const [key,program]of programs){if(programs.size<=target)break;if(visible.has(key))continue;programs.delete(key);release(program);removed++;}return removed;
}
