import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const path=new URL('../src/painted/infill/safety/facade-paint-fragment.ts',import.meta.url),text=fs.readFileSync(path,'utf8'),ast=ts.createSourceFile('facade.ts',text,ts.ScriptTarget.Latest,true);
const declaration=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='scopeInfillPaint');
assert(declaration);
const js=ts.transpileModule(declaration.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const current=items=>Function('INDEPENDENT_INFILL_PAINTS',js+';return scopeInfillPaint;')(items);
// Exact previous ordered certificate/removal behavior is the output oracle.
function previous(items,source,city,excludeAll=false){for(const item of items){if(!excludeAll&&item.city===city)continue;if(!source.includes(item.source)&&!source.includes(item.guard))continue;if(source.split(item.source).length!==2||source.split(item.guard).length!==2)throw Error('Infill shader source/guard certificate mismatch '+item.key);source=source.replace(item.source,'').replace(item.guard,'');}return source;}
const outcome=fn=>{try{return{value:fn()};}catch(e){return{error:e.message};}};
test('scope removal keeps ordered bytes and all missing/duplicate certificate failures',()=>{
 const cases=[['abcSOURCEguardxyz','SOURCE','guard'],['guardSOURCEguard','SOURCE','guard'],['SOURCE','SOURCE','guard'],['guard','SOURCE','guard'],['untouched','SOURCE','guard'],['aXXbaab','XX','ab'],['aaaaG','aaa','G'],['SOURCEguard','SOURCEguard','guard'],['ab','','b'],['abc','','b'],['ab','a',''],['','', '']];
 for(const [source,paint,guard] of cases)for(const city of ['essen','frankfurt'])for(const exclude of [false,true]){const items=[{city:'essen',source:paint,guard,key:'certificate'}];assert.deepEqual(outcome(()=>current(items)(source,city,exclude)),outcome(()=>previous(items,source,city,exclude)),JSON.stringify({source,paint,guard,city,exclude}));}
});
test('multiple certificates preserve sequential mutations across deterministic overlapping inputs',()=>{
 let seed=947;const random=n=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)%n,word=n=>Array.from({length:n},()=> 'ab {}\n'[random(6)]).join('');
 for(let i=0;i<2000;i++){const items=Array.from({length:3},(_,j)=>({city:j%2?'essen':'frankfurt',source:word(random(5)),guard:word(random(4)),key:String(j)})),source=word(random(25));for(const exclude of [false,true])assert.deepEqual(outcome(()=>current(items)(source,'essen',exclude)),outcome(()=>previous(items,source,'essen',exclude)));}
});

const ownerDeclaration=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='specializeOwnerCity');assert(ownerDeclaration);
const ownerJS=ts.transpileModule(ownerDeclaration.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function previousOwner(blocks,source,city){if(!city||city==='missing')return source;const names=new Set();for(const block of blocks){if(block.city===city)continue;if(source.includes(block.source)){source=source.replace(block.source,'');for(const m of block.source.matchAll(/\b(?:float|vec[234]|bool|int|void)\s+([A-Za-z_]\w*)\s*\(/g))names.add(m[1]);}}return source.split('\n').filter(line=>!/^\s*if\s*\(/.test(line)||![...names].some(name=>new RegExp('\\b'+name+'\\s*\\(').test(line))).join('\n');}
test('owner city filtering preserves exact bytes without rebuilding matchers for every guard line',()=>{
 const blocks=Array.from({length:24},(_,i)=>({city:i===0?'essen':'foreign',source:'vec3 owner'+i+'(vec3 p){return p;}'}));
 let constructed=0;function CountedRegExp(...args){constructed++;return new RegExp(...args);}
 const filter=Function('OWNER_CITY_BLOCKS','getPROGRESSIVE_CITY_EXTRA_GLSL','RegExp',ownerJS+';return specializeOwnerCity;')(blocks,()=>({essen:'',foreign:''}),CountedRegExp);
 const source=blocks.map(x=>x.source).join('\n')+'\n'+Array.from({length:120},(_,i)=>' if(family=='+i+'.)return owner'+(i%24)+'(p);').join('\n')+'\nif(a)owner99 (p);\n if(a)prefix_owner1(p);\n if(a)owner1Suffix(p);\n// if(a)owner1(p);\n if(a) /* owner1(p) */ keep(p);\n else if(a)owner1(p);';
 for(const city of ['essen','foreign','missing',undefined]){constructed=0;assert.equal(filter(source,city),previousOwner(blocks,source,city));assert(constructed<=blocks.length,'regex construction must be bounded by the removed names, not the number of guard lines');}
});

// A line with no removed call must not run one full scan per foreign function.
test('owner filtering scans call names once per guard rather than every foreign-name pattern',()=>{
 const blocks=Array.from({length:120},(_,i)=>({city:'foreign',source:'vec3 owner'+i+'(vec3 p){return p;}'}));
 const guards=Array.from({length:240},(_,i)=>' if(family=='+i+'.)return kept(p);');
 const source=blocks.map(b=>b.source).join('\n')+'\n'+guards.join('\n');
 let scans=0;
 function CountedRegExp(...args){const re=new RegExp(...args),test=re.test;re.test=function(value){scans++;return test.call(this,value);};return re;}
 const filter=Function('OWNER_CITY_BLOCKS','getPROGRESSIVE_CITY_EXTRA_GLSL','RegExp',ownerJS+';return specializeOwnerCity;')(blocks,()=>({essen:''}),CountedRegExp);
 assert.equal(filter(source,'essen'),previousOwner(blocks,source,'essen'));
 assert(scans<=guards.length*2,'foreign-name regex scans must not scale with names × guard lines; saw '+scans);
});
test('owner call-token matching preserves identifier boundaries, comments, whitespace and ordered removals',()=>{
 const blocks=[{city:'foreign',source:'vec3 owner1(vec3 p){return p;}'},{city:'foreign',source:'vec3 owner2(vec3 p){return p;}'}];
 const filter=Function('OWNER_CITY_BLOCKS','getPROGRESSIVE_CITY_EXTRA_GLSL',ownerJS+';return specializeOwnerCity;')(blocks,()=>({essen:''}));
 const prefixes=['','x','_','1','é','.',':','/*'],suffixes=['','x','_','1','é',' */'],spaces=['',' ','\t',' /* comment */'];
 for(const prefix of prefixes)for(const suffix of suffixes)for(const space of spaces){const source=blocks.map(b=>b.source).join('\n')+'\n if(family>0.) '+prefix+'owner1'+suffix+space+'(p);\n else if(x)owner2(p);\n// if(x)owner1(p);';assert.equal(filter(source,'essen'),previousOwner(blocks,source,'essen'),JSON.stringify({prefix,suffix,space}));}
});

// Root500 shares this dispatch format and previously retained the costly matcher loop.
test('root500 owner filtering matches the legacy bytes with bounded guard scans',()=>{
 const rootText=fs.readFileSync(new URL('../src/painted/root500/safety/facade-paint-fragment.ts',import.meta.url),'utf8');
 const rootAST=ts.createSourceFile('root500.ts',rootText,ts.ScriptTarget.Latest,true);
 const declaration=rootAST.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='specializeOwnerCity');
 const rootJS=ts.transpileModule(declaration.getText(rootAST),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const blocks=Array.from({length:120},(_,i)=>({city:i===0?'essen':'foreign',source:'vec3 owner'+i+'(vec3 p){return p;}'}));
 let constructed=0;function CountedRegExp(...args){constructed++;return new RegExp(...args);}
 const filter=Function('OWNER_CITY_BLOCKS','getCityData','RegExp',rootJS+';return specializeOwnerCity;')(blocks,()=>({PROGRESSIVE_CITY_EXTRA_GLSL:{essen:'',foreign:''}}),CountedRegExp);
 const guards=Array.from({length:240},(_,i)=>' if(family=='+i+'.)return owner'+i+'(p);');
 const source=blocks.map(b=>b.source).join('\n')+'\n'+guards.join('\n')+'\n if(a)prefix_owner1(p);\n if(a)éowner1 (p);\n// if(a)owner1(p);\n else if(a)owner1(p);';
 for(const city of ['essen','foreign','missing',undefined])assert.equal(filter(source,city),previousOwner(blocks,source,city));
 assert.equal(constructed,0,'no dynamically allocated per-name matchers');
});
