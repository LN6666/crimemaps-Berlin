import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

// Execute the actual nested production function without loading unrelated
// city model tables. Real frozen shader byte equivalence is checked separately.
const source=readFileSync(new URL('../src/painted/bremen/safety/facade-paint-fragment.ts',import.meta.url),'utf8');
const ast=ts.createSourceFile('facade-paint-fragment.ts',source,ts.ScriptTarget.Latest,true);
let declaration;
(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='specializeOwnerCity'){assert.equal(declaration,undefined);declaration=node.getText(ast);}ts.forEachChild(node,visit);})(ast);
assert(declaration);
const js=ts.transpileModule(declaration,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(blocks,extra={bremen:''}){
 const observations=[];
 const prune=Function('OWNER_CITY_BLOCKS','getPROGRESSIVE_CITY_EXTRA_GLSL','observeFacadeSpecialization','PROGRESSIVE_CITY_SOURCE_FULL_SHA','PROGRESSIVE_FEATURE_SHA','scope',js+'\nreturn specializeOwnerCity;')(blocks,()=>extra,(...args)=>observations.push(args),'same','same',{});
 return{prune,observations};
}

test('city pruning removes foreign bodies and their conditional dispatch while preserving native bytes',()=>{
 const native='vec3 home(vec3 base){return base;}',foreign='vec3 away(vec3 base){return base*.5;}';
 const {prune}=fixture([{city:'bremen',source:native},{city:'berlin',source:foreign}]);
 const input=[native,foreign,'if(family==1.)return home(base);','  if (family==2.)return away (base);','void main(){home(base);}',''].join('\n');
 assert.equal(prune(input,'bremen'),[native,'','if(family==1.)return home(base);','void main(){home(base);}',''].join('\n'));
});

test('dispatch matching preserves identifier boundaries, nested calls, whitespace and non-if lines',()=>{
 const foreign='float roof(){return 1.;}\nvec3 _side2(){return vec3(1.);}';
 const {prune}=fixture([{city:'berlin',source:foreign}]);
 const keep=['if(ok)return roofExtra();','if(ok)return my_roof();','if(ok)return roof2();','if(ok)return 2roof();','else if(ok)return roof();','// if(ok)return roof();','return roof();','if(ok)return roof;'];
 const remove=['if(ok)return roof();','\tif (ok) return f(roof \t());','if(ok)return _side2();','if(ok)return f(keep(), _side2 ());'];
 assert.equal(prune([foreign,...keep,...remove].join('\n'),'bremen'),['',...keep].join('\n'));
});

test('only functions in actually removed blocks affect dispatch; missing city specialization is unchanged',()=>{
 const absent='bool notPresent(){return true;}',fragment='if(ok)return notPresent();\n';
 const {prune,observations}=fixture([{city:'berlin',source:absent}]);
 assert.equal(prune(fragment,'bremen'),fragment);
 assert.equal(prune(fragment,'unconfigured'),fragment);
 assert.equal(prune(fragment,undefined),fragment);
 assert.equal(observations.length,2,'no city keeps the existing early return');
});
