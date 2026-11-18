import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/painted/infill/safety/infill-prepared-program-plan.ts',import.meta.url),'utf8');
function fixture(){
 let descriptions=0,held=0,allow=true,disposed=false;
 const scope={get stats(){return{disposed};}};
 const workspace={release(){},clearPreparedSource(){},preparedSourceStats:{sourceCharacters:0}};
 const bound=key=>Object.freeze({sourceCharactersUpperBound:key.length,paintSourceCharactersUpperBound:key.length,assemblyCharactersUpperBound:100,assemblyMetadataBytesUpperBound:0,analysisTemporaryCharactersUpperBound:100,syntaxUpperBound:Object.freeze({functionRanges:1,callSites:1,statementNodes:1,guardTuples:1,identifierCharacters:5,parameterCharacters:5}),authorityTrace:Object.freeze(['test',key]),policy:Object.freeze({id:'test',objectHeaderBytes:32})});
 const budget={tryReserve(cost,options){assert.equal(cost.category,'metadata');assert.equal(options.evict,false);if(!allow)return{ok:false};held+=cost.bytes;let active=true;return{ok:true,reservation:{release(){if(active){active=false;held-=cost.bytes;}}}};}};
 const deps={
 '../../../safety/utf8-byte-length':{utf8ByteLength:s=>s.length},
 '../../../safety/prepared-source':{createPreparedSourceWorkspace:()=>workspace},
 './facade-paint-fragment':{INFILL_FACADE_PROGRAM_SOURCE_AUTHORITY:{},paintProgramPartitionEnabled:()=>true,describeFacadePaintSourceBounds(_city,key){descriptions++;return bound(key);},facadePaintSpecializationForCity(){return{};}},
 };
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,module={exports:{}};
 new Function('require','module','exports',code)(id=>{assert.ok(deps[id],id);return deps[id];},module,module.exports);
 const make=()=>module.exports.createInfillPreparedProgramPlan({id:1,city:'essen',scope,budget});
 return{make,descriptions:()=>descriptions,held:()=>held,deny:()=>{allow=false;},dispose:()=>{disposed=true;}};
}
test('repeated pending families reuse one source bound without retaining more than one key',()=>{
 const f=fixture(),p=f.make(),first=p.describeSourceBounds('base');
 for(let i=0;i<100;i++)assert.deepEqual(p.describeSourceBounds('base'),first);
 assert.equal(f.descriptions(),1,'same immutable scope and source must not be rescanned each frame');
 assert.ok(f.held()>0,'retained descriptor is charged to the page budget');
 p.describeSourceBounds('owner');assert.equal(f.descriptions(),2);
 p.describeSourceBounds('base');assert.equal(f.descriptions(),3,'bounded single-entry cache');
 p.release();assert.equal(f.held(),0);assert.throws(()=>p.describeSourceBounds('base'),{name:'AbortError'});
});
test('declined optional metadata cache preserves the actual bound and retries without retention',()=>{
 const f=fixture();f.deny();const p=f.make();assert.deepEqual(p.describeSourceBounds('base'),p.describeSourceBounds('base'));
 assert.equal(f.descriptions(),2);assert.equal(f.held(),0);p.release();
});
test('bounds do not cross plan ownership and disposed scopes cannot reuse them',()=>{
 const f=fixture(),a=f.make(),b=f.make();a.describeSourceBounds('base');b.describeSourceBounds('base');assert.equal(f.descriptions(),2);
 f.dispose();assert.throws(()=>a.describeSourceBounds('base'),{name:'AbortError'});a.release();b.release();assert.equal(f.held(),0);
});

test('assembly bounds are reused across pending families and invalidated for every assembly input',()=>{
 const f=fixture(),p=f.make();let builds=0;
 const build=raw=>{builds++;return Object.freeze({...raw,assemblyCharactersUpperBound:200});};
 const first=p.describeAssemblyBounds('base','helper',false,build);
 for(let family=0;family<45;family++)assert.strictEqual(p.describeAssemblyBounds('base','helper',false,build),first);
 assert.equal(builds,1,'family selection does not change the source assembly envelope');
 p.describeAssemblyBounds('base','other-helper',false,build);
 p.describeAssemblyBounds('base','other-helper',true,build);
 p.describeAssemblyBounds('owner','other-helper',true,build);
 p.describeAssemblyBounds('base','helper',false,build);
 assert.equal(builds,5,'only the last descriptor is retained, with helper, pruning and source in its key');
 assert.ok(f.held()>0);p.release();assert.equal(f.held(),0);
 assert.throws(()=>p.describeAssemblyBounds('base','helper',false,build),{name:'AbortError'});
});
test('assembly descriptor refusal and failed builds cannot retain stale or unmetered metadata',()=>{
 const f=fixture(),p=f.make();f.deny();let builds=0;
 const build=raw=>{builds++;return raw;};
 p.describeAssemblyBounds('base','helper',false,build);p.describeAssemblyBounds('base','helper',false,build);
 assert.equal(builds,2);assert.equal(f.held(),0);
 assert.throws(()=>p.describeAssemblyBounds('owner','helper',false,()=>{throw Error('failure');}),/failure/);
 p.describeAssemblyBounds('owner','helper',false,build);assert.equal(builds,3);
 f.dispose();assert.throws(()=>p.describeAssemblyBounds('base','helper',false,build),{name:'AbortError'});
 p.release();assert.equal(f.held(),0);
});
