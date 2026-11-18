// Evaluate the real small owner boundary and its lazy 52-edge source-record leaf.
// No renderer, data bundle or model decoder is initialized here.
import fs from 'node:fs';
import ts from 'typescript';
const read=name=>fs.readFileSync(new URL('../../src/painted/root500/safety/'+name+'.ts',import.meta.url),'utf8');
function evaluate(source,require=()=>{throw Error('Unexpected F154 boundary dependency');}){
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,module={exports:{}};
 new Function('require','module','exports',compiled)(require,module,module.exports);return module.exports;
}
export const f154SourceData=evaluate(read('owner-f154-source-data')),f154Signature=evaluate(read('progressive-native-signature'));
export function loadF154Construction(signature=f154Signature){return evaluate(read('owner-f154-reconstruction'),id=>{if(id==='./owner-f154-source-data')return f154SourceData;if(id==='./progressive-native-signature')return signature;throw Error('Unexpected F154 construction dependency '+id);});}
export const f154Construction=loadF154Construction();
