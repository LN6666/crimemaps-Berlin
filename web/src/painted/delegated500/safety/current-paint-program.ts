/** Finite programs derived from the current, fully assembled shader. Only the
 * categorical dispatch wrappers are narrowed. Kept material functions retain
 * their original bytes; current repair hooks are already present at this point.
 * No generated table certificate or historical shader body is trusted here. */
type FunctionRange={name:string;start:number;open:number;end:number};
const wrappers=new Set(['paintedFacade','progressiveFeatureDispatch','progressiveFeatureDispatchCity','progressiveFeatureDispatchCityLegacy500','progressiveFeatureDispatchCityLegacy159Baseline']);
// Dortmund's f236 hook inserts this forwarder between the city dispatch and Legacy159.
const cityChainWrapper='progressiveFeatureDispatchCityBefore681';
const isWrapper=(name:string,cityChains:boolean)=>wrappers.has(name)||(cityChains&&name===cityChainWrapper);
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
/** Conservative guards for a legacy rounded partition. An unsupported guard
 * remains verbatim. In particular, a fractional material branch may vary inside
 * one partition and must never be replaced by its value at the integer centre. */
function roundedCondition(text:string,family:number):boolean|undefined{
 const radius=.5+Math.abs(family)*2**-22,domain:[number,number]=[family-radius,family+radius];
 const number='(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?';
 const atom=new RegExp('^(family|abs\\(family(?:-('+number+'))?\\))(<|<=|>|>=|==|!=)('+number+')$');
 function one(part:string):boolean|undefined{
  const match=atom.exec(part);if(!match)return undefined;
  let [lo,hi]=domain;const right=Math.fround(Number(match[4]));if(!Number.isFinite(right))return undefined;
  if(match[1]!=='family'){
   const offset=Math.fround(Number(match[2]??0));if(!Number.isFinite(offset))return undefined;
   lo=Math.fround(lo-offset);hi=Math.fround(hi-offset);
   [lo,hi]=[lo<=0&&hi>=0?0:Math.min(Math.abs(lo),Math.abs(hi)),Math.max(Math.abs(lo),Math.abs(hi))];
  }
  switch(match[3]){
   case '<':return hi<right?true:lo>=right?false:undefined;
   case '<=':return hi<=right?true:lo>right?false:undefined;
   case '>':return lo>right?true:hi<=right?false:undefined;
   case '>=':return lo>=right?true:hi<right?false:undefined;
   case '==':return lo===hi&&lo===right?true:hi<right||lo>right?false:undefined;
   case '!=':return lo===hi&&lo===right?false:hi<right||lo>right?true:undefined;
  }
 }
 const compact=text.replace(/\s/g,'');
 if(/[()]/.test(compact.replace(/abs\(family(?:-[0-9.eE+\-]+)?\)/g,'')))return undefined;
 const alternatives=compact.split('||').map(part=>{
  const terms=part.split('&&').map(one);
  return terms.some(v=>v===undefined)?undefined:terms.every(v=>v===true);
 });
 // Unknown expressions could call material helpers with side effects. Never
 // erase them merely because another boolean term settles the final value.
 return alternatives.some(v=>v===undefined)?undefined:alternatives.some(v=>v===true);
}
function terminalBlockReturn(body:string){const text=maskComments(body);let depth=0,start=0,last='';for(let i=0;i<text.length;i++){if(text[i]==='{')depth++;else if(text[i]==='}'){depth--;if(!depth)start=i+1;}else if(text[i]===';'&&!depth){last=text.slice(start,i+1).trim();start=i+1;}}return !text.slice(start).trim()&&/^return\s+[^;{}]+;$/.test(last);}
type PaintFamilyDomain=number|readonly number[];
function commonGuard(text:string,family:PaintFamilyDomain,rounded:boolean){
 const evaluate=rounded?roundedCondition:condition;
 if(typeof family==='number')return evaluate(text,family);
 const first=evaluate(text,family[0]);
 // Keep the original runtime branch whenever any member differs or is unknown.
 if(first===undefined)return;
 for(let i=1;i<family.length;i++)if(evaluate(text,family[i])!==first)return;
 return first;
}
function narrowBody(source:string,range:FunctionRange,family:PaintFamilyDomain,churchLayout=false,roundedPartition=false){
 const body=source.slice(range.open+1,range.end-1),masked=maskComments(body);let at=0;
 for(;;){while(/\s/.test(masked[at]??'')&&at<masked.length)at++;
  if(!masked.startsWith('if',at)||/\w/.test(masked[at+2]??''))return body.slice(at);
  let open=at+2;while(/\s/.test(masked[open]??''))open++;
  if(masked[open]!=='(')return body.slice(at);
  const close=closeAt(masked,open,'(',')'),guard=masked.slice(open+1,close),known=commonGuard(churchLayout&&range.name==='fpLayoutFacade'?guard.replace(/\blayoutId\b/g,'family'):guard,family,roundedPartition);
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
type Prepared={ranges:FunctionRange[];names:Set<string>;byName:Map<string,FunctionRange[]>;calls:Map<FunctionRange,string[]>};
// The admitted source build owns this analysis, rather than a module-global
// cache retaining the last entire assembled material source indefinitely.
function callsIn(body:string,names:Set<string>){return [...new Set([...maskComments(body).matchAll(/\b([A-Za-z_]\w*)\s*\(/g)].map(m=>m[1]).filter(name=>names.has(name)))];}
function prepare(source:string):Prepared{
 const ranges=functions(source),names=new Set(ranges.map(f=>f.name)),byName=new Map<string,FunctionRange[]>(),calls=new Map<FunctionRange,string[]>();
 for(const f of ranges){const group=byName.get(f.name)??[];group.push(f);byName.set(f.name,group);calls.set(f,callsIn(source.slice(f.open+1,f.end-1),names));}
 return {ranges,names,byName,calls};
}
/** The five current dispatchers have one known forwarding chain; church adds
 * its explicit identity layout alias. Verify
 * every incoming call before using its parameter value; a new or transformed
 * call retains that dispatcher rather than guessing its family context.
 * cityChains adds the forwarding shapes other cities assemble (no Legacy159,
 * no Legacy500, or Dortmund's Before681 hop). Every callee still requires all
 * of its incoming calls to come from that one caller, so alternatives exclude
 * each other and an unverified shape keeps its original dispatcher. */
function dispatchContexts(source:string,ranges:FunctionRange[],calls:Map<FunctionRange,string[]>,family:PaintFamilyDomain,churchLayout=false,cityChains=false){
 const values=new Map<string,PaintFamilyDomain>([['paintedFacade',family]]);
 const chain:Array<readonly[string,string,'round'|'same',string]>=[['progressiveFeatureDispatchCity','paintedFacade','round','family'],['progressiveFeatureDispatchCityLegacy159Baseline','progressiveFeatureDispatchCity','same','family'],['progressiveFeatureDispatchCityLegacy500','progressiveFeatureDispatchCityLegacy159Baseline','same','family'],['progressiveFeatureDispatch','progressiveFeatureDispatchCityLegacy500','same','family']];
 if(cityChains){
  chain.splice(3,0,['progressiveFeatureDispatchCityLegacy500','progressiveFeatureDispatchCity','same','family'],[cityChainWrapper,'progressiveFeatureDispatchCity','same','family'],['progressiveFeatureDispatchCityLegacy159Baseline',cityChainWrapper,'same','family']);
  chain.push(['progressiveFeatureDispatch','progressiveFeatureDispatchCityLegacy159Baseline','same','family']);
 }
 if(churchLayout)chain.push(['fpLayoutFacade','paintedFacade','same','layoutId']);
 for(const[callee,caller,kind,parameter]of chain){
  const incoming=ranges.filter(f=>calls.get(f)?.includes(callee)),parent=values.get(caller);
  if(parent===undefined||!incoming.length||incoming.some(f=>f.name!==caller))continue;
  let valid=true;
  for(const f of incoming){const body=maskComments(source.slice(f.open+1,f.end-1)),re=new RegExp('\\b'+callee+'\\s*\\(','g');let m:RegExpExecArray|null;
   while((m=re.exec(body))){const open=re.lastIndex-1,end=closeAt(body,open,'(',')');let depth=0,start=open+1;for(let i=start;i<end;i++){if(body[i]==='(')depth++;else if(body[i]===')')depth--;else if(body[i]===','&&!depth)start=i+1;}const argument=body.slice(start,end).replace(/\s/g,'');if(kind==='same'?argument!=='family':!/^floor\(family\+(?:0?\.5)\)$/.test(argument))valid=false;re.lastIndex=end+1;}
  }
  const definitions=ranges.filter(f=>f.name===callee);if(!definitions.length||definitions.some(f=>!new RegExp(',\\s*float\\s+'+parameter+'\\s*\\)\\s*$').test(maskComments(source.slice(f.start,f.open)))))valid=false;
  if(valid){
   const round=(value:number)=>Math.floor(Math.fround(value+.5));
   values.set(callee,kind==='same'?parent:typeof parent==='number'?round(parent):parent.map(round));
  }
 }
 return values;
}
function narrowed(source:string,family:PaintFamilyDomain,churchLayout:boolean,cityChains:boolean,prepared?:Prepared,roundedPartition=false){
 if(typeof family==='number'){
  if(!Number.isFinite(family=Math.fround(family)))throw Error('Non-finite paint family');
 }else{
  if(!family.length||family.some(value=>!Number.isFinite(Math.fround(value))))throw Error('Invalid paint family group');
  family=family.map(Math.fround);
 }
 const {ranges,names,byName,calls}=prepared??prepare(source),bodies=new Map<FunctionRange,string>(),narrowCalls=new Map<FunctionRange,string[]>();
 const contexts=dispatchContexts(source,ranges,calls,family,churchLayout,cityChains);
 for(const f of ranges.filter(f=>isWrapper(f.name,cityChains)||(churchLayout&&f.name==='fpLayoutFacade'))){const value=contexts.get(f.name);if(value===undefined)continue;const body=narrowBody(source,f,value,churchLayout,roundedPartition&&f.name==='paintedFacade');bodies.set(f,body);narrowCalls.set(f,callsIn(body,names));}
 const reach=(start:string)=>{const reachable=new Set<string>(),pending=[start];
  while(pending.length){const name=pending.pop()!;if(reachable.has(name))continue;reachable.add(name);
   for(const f of byName.get(name)??[])for(const call of narrowCalls.get(f)??calls.get(f)??[])if(!reachable.has(call))pending.push(call);
  }
  return reachable;
 };
 return {ranges,byName,bodies,reach};
}
function specializedFragment(source:string,{ranges,bodies,reach}:ReturnType<typeof narrowed>){
 const reachable=reach('main');
 const chunks:string[]=[];let at=0;
 for(const f of ranges){chunks.push(source.slice(at,f.start));if(reachable.has(f.name))chunks.push(bodies.has(f)?source.slice(f.start,f.open+1)+bodies.get(f)+source.slice(f.end-1,f.end):source.slice(f.start,f.end));at=f.end;}
 chunks.push(source.slice(at));return chunks.join('');
}
function depthEffects(source:string,{byName,bodies,reach}:ReturnType<typeof narrowed>){
 for(const name of reach('paintedFacade'))for(const f of byName.get(name)??[])if(/\bdiscard\b|\bgl_FragDepth\b|\bgl_SampleMask\b/.test(maskComments(bodies.get(f)??source.slice(f.open+1,f.end-1))))return true;
 return false;
}
/** Colour and paint-depth demand from one exact source/family analysis. The
 * caller may retain the small result metadata; the analysis stays in this call. */
export function specializeCurrentPaintProgram(source:string,family:PaintFamilyDomain,churchLayout=false,cityChains=false):Readonly<{fragment:string;depthEffects:boolean}>{
 const analysis=narrowed(source,family,churchLayout,cityChains);
 return {fragment:specializedFragment(source,analysis),depthEffects:depthEffects(source,analysis)};
}
/** The caller proves floor(fround(semanticFamily + .5)) equals family.
 * Preserve all fractional-family guards at the root; only a verified rounded
 * forwarding edge can use the exact family in downstream dispatchers. */
export function specializeRoundedPaintProgram(source:string,family:number):Readonly<{fragment:string;depthEffects:boolean}>{
 if(!Number.isInteger(family)||family<1000||family>=1000000)throw Error('Invalid rounded paint partition');
 const analysis=narrowed(source,family,false,true,undefined,true);
 return {fragment:specializedFragment(source,analysis),depthEffects:depthEffects(source,analysis)};
}
/** Finite exact-output sharing. Analysis and source strings live only in this
 * admitted call; only aliases survive. No hash or assumed family equivalence. */
export function exactCurrentPaintProgramKeys(source:string,families:readonly number[],churchLayout=false,cityChains=false):ReadonlyMap<string,string>{
 const keys=new Map<string,string>();if(!families.length)return keys;
 const prepared=prepare(source),reference=specializedFragment(source,narrowed(source,families[0],churchLayout,cityChains,prepared));
 for(const family of families.slice(1))if(specializedFragment(source,narrowed(source,family,churchLayout,cityChains,prepared))!==reference)return keys;
 const canonical=currentPaintProgramKey(families[0]);for(const family of families)keys.set(currentPaintProgramKey(family),canonical);return keys;
}
export function specializeCurrentPaintFragment(source:string,family:PaintFamilyDomain,churchLayout=false,cityChains=false){
 return specializedFragment(source,narrowed(source,family,churchLayout,cityChains));
}
/** Whether the specialized paintedFacade closure for this family can change
 * coverage or depth. Colour writes are masked on the solar depth target and main
 * runs its own discard/gl_FragDepth before paintedFacade, so a family without
 * such effects casts exactly like family 0. */
export function paintedFacadeDepthEffects(source:string,family:number,cityChains=false){
 return depthEffects(source,narrowed(source,family,false,cityChains));
}
/** Map insertion order is the existing renderer's last-used order. Active paint
 * is protected even when a detailed viewport itself needs more than the target. */
export function trimInactivePaintPrograms<T>(programs:Map<string,T>,visible:ReadonlySet<string>,release:(program:T)=>void,target=64){
 let removed=0;for(const [key,program]of programs){if(programs.size<=target)break;if(visible.has(key))continue;programs.delete(key);release(program);removed++;}return removed;
}
