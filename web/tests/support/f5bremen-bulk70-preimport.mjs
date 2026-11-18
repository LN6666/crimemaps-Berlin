// The actual Bremen manager's module-level Bulk70 pre-import row builder
// (src/painted/bremen/safety/three-dimensional-map.ts, bulk70PreimportRows) over
// the actual Frankfurt Bulk70 identity catalogue. Manager fixtures that extract
// only installThreeDimensionalMap bind this as the free name bulk70PreimportRows,
// so visible() runs its real pre-import row selection instead of a stand-in.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import ts from 'typescript';

const web=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const read=relative=>fs.readFileSync(path.join(web,'src',relative),'utf8');

function evaluateModule(source){
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};Function('exports',js)(exports);return exports;
}

// The identity catalogue module has no imports; it is evaluated as written.
const identitiesSource=read('painted/infill/safety/infill-frankfurt-low-office-bulk70-identities.ts');
assert(!/^\s*import\s/m.test(identitiesSource),'the Bulk70 identity catalogue stays import-free');
export const {BULK70_IDENTITY_GROUPS}=evaluateModule(identitiesSource);
assert(Array.isArray(BULK70_IDENTITY_GROUPS)&&BULK70_IDENTITY_GROUPS.length>0,'actual Bulk70 identity catalogue');

// The manager's own top-level declaration, extracted verbatim.
const managerFile='painted/bremen/safety/three-dimensional-map.ts',managerAst=ts.createSourceFile(managerFile,read(managerFile),ts.ScriptTarget.Latest,true);
const declarations=managerAst.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText(managerAst)==='bulk70PreimportRows'));
assert.equal(declarations.length,1,'actual Bremen manager declares bulk70PreimportRows once at module level');
const declarationJS=ts.transpileModule(declarations[0].getText(managerAst),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
export const bulk70PreimportRows=Function('BULK70_IDENTITY_GROUPS',declarationJS+'\nreturn bulk70PreimportRows;')(BULK70_IDENTITY_GROUPS);
export const bulk70PreimportIdentityCount=BULK70_IDENTITY_GROUPS.reduce((sum,group)=>sum+group.identities.length,0);

// True when rows are exactly the pre-import rows of one city (every catalogue
// identity in catalogue order, identity fields only).
export function isBulk70PreimportRows(rows,city){
 const expected=bulk70PreimportRows(city);
 return Array.isArray(rows)&&rows.length===expected.length&&rows.every((row,index)=>Object.keys(row).length===3&&row.city===city&&row.objectId===expected[index].objectId&&row.partId===expected[index].partId);
}
