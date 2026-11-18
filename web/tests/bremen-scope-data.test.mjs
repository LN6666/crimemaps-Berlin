import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(web,'package.json')),ts=require('typescript');
// Exact original module/export/resource identities; these are metadata, never model fixtures.
const expected=[
 [
  "utility-detail-data.ts",
  "UTILITY_DETAIL_DATA",
  "40fb41923c0b602e80ea48e3fcbd944f4814c1d23873eadf77283ca84908a934"
 ],
 [
  "edge-coverage-data.ts",
  "EDGE_COVERAGE_DATA",
  "0d2079d4f879271f759332da6b42f502e8c8ba981ab5239d6c7a298203562506"
 ],
 [
  "bremen-held-source-snapshots.ts",
  "BREMEN_REPAIR_SOURCE_SNAPSHOTS",
  "632ad739a017e77124bb28433fb72f756bdb6b24787967ca618a3f26f6c04a57"
 ],
 [
  "progressive-paint-admissions.ts",
  "PROGRESSIVE_ADMISSIONS",
  "d94bfab58ea8a0cecba91b0180cc362dc4f3e963c00b5a03dba0a56326afbe83"
 ],
 [
  "office7a-contour-data.ts",
  "OFFICE7A_CONTOUR_DATA",
  "1a39115e9e9245ab1e27fe841b927cf6bc3c8164894e7069b15ffad0393e5d89"
 ],
 [
  "boundary-data.ts",
  "BOUNDARY70_DATA",
  "638776526482e43de8e820c2a085b64febcda3813e87b9d878d1cd15ecb20918"
 ],
 [
  "glocke-kuester-data.ts",
  "GLOCKE_KUESTER_DATA",
  "d7b87596f02f16d7f485955191074b0a3e4a6b541e937236f35a10ccfbc5291f"
 ],
 [
  "progressive-feature-cities.ts",
  "PROGRESSIVE_CITY_EXTRA_GLSL",
  "48a9a6aa86b1a9caa9d2f98eb8ff949c48ff7a517ff8a0cadb4ecb9d5dc9fff9"
 ],
 [
  "churches-data.ts",
  "BREMEN_OLDTOWN_CHURCHES_DATA",
  "8a1fa75e91344bc55c4e77f2852f626d15d8251d11feb572b5b48ad18e35e203"
 ],
 [
  "euro-gable-data.ts",
  "EURO_GABLE_DATA",
  "851e18fe7e916984621223e0e1afd0f35ab05bd21eed68c44668576bd5eb16ae"
 ],
 [
  "office7a-data.ts",
  "OFFICE7A70_DATA",
  null
 ],
 [
  "official-openings-data.ts",
  "OFFICIAL_OPENINGS_DATA",
  "58c778db0227ea02fc67b656985dafa8eff51185591b50c088de3edfe6699363"
 ],
 [
  "bremen-extra-held-source-snapshots.ts",
  "BREMEN_EXTRA_HELD_SOURCE_SNAPSHOTS",
  "0a8625e86da19b078fed94bc1085ba5888b2a707272c10451a47bd868c5beb96"
 ],
 [
  "extra4-data.ts",
  "BREMEN_OLDTOWN_EXTRA4_DATA",
  "035346d8e2f4bd84bb8bd071514642d6303fe5d45134d4a3b33213a36b69b425"
 ],
 [
  "flemings70-data.ts",
  "FLEMINGS70_DATA",
  "4adf54b7d8947f77628a3a76054f3943ab910a26b5d1cfdf45bfbe44243407b8"
 ],
 [
  "market-cap-data.ts",
  "MARKET_CAP_DATA",
  "2dcf01a1cc61e7b4d5b26aa4f7dfac1bcb58e6ed36011fae2b169f68c4adae43"
 ],
 [
  "repairs-data.ts",
  "BREMEN_OLDTOWN_REPAIRS_DATA",
  "b40c1ec6557093160bf7624960966ed6e4f15810ec28f6598a0de638e56a5a6f"
 ],
 [
  "bremen-db70-data.ts",
  "EDGE70_DATA",
  "90275a03d334b78ef282d2a8bcfc8b2d163c0642e9b54c7054abade1274bcd97"
 ],
 [
  "karstadt-data.ts",
  "KARSTADT70_DATA",
  "0a1ca52b26563b9363eeb622396941f4ebdb3fc0336c7aa204f4381fd2d2f06a"
 ],
 [
  "quartier670-data.ts",
  "QUARTIER670_DATA",
  "bfe66902444e69cb87432c30d092772d28d1e77816ced14eaafee1fcbd0f39c4"
 ],
 [
  "hbf-court-data.ts",
  "HBF_COURT_DATA",
  "2411623fe8c003d280dbea5e4fdac410cdec34fb48a173a8e263d48fca160b14"
 ],
 [
  "school70-data.ts",
  "SCHOOL70_DATA",
  "0d6a49af641b4936275262127bdd1d239a1d108496be8fbd6126e66a60dc05f9"
 ],
 [
  "wasserturm70-data.ts",
  "WASSERTURM70_DATA",
  "76c4a594a5b19df140c3ea21a57d86522ca2029275d324b332dda7b919fe730e"
 ],
 [
  "oldtown70-data.ts",
  "BREMEN_OLDTOWN70_DATA",
  "ef6445aecf74f314b2138f17dd415b507514d177476d3df2c992f4410a40d8ad"
 ],
 [
  "utility-data.ts",
  "UTILITY70_DATA",
  "9bf4e7e1d31589142b099f60054153bc39b65530beccb0bff45fb3e1f6178464"
 ],
 [
  "lloyd-front-data.ts",
  "LLOYD_FRONT_DATA",
  "4a733773715c075aeaa92a6ce9de1e486577be95770bb4a40f147f03bd1a3699"
 ],
 [
  "edgefill70-data.ts",
  "EDGEFILL70_DATA",
  "a0a61f98df7e2f2648275d313bfaeeeaa22ada5503612da2165aade1338e1080"
 ],
 [
  "glocke-detail-data.ts",
  "GLOCKE_DETAIL_DATA",
  "98ad9a1680e113e84b7b9e0d267779f7b9b816f4cf14f3f0e2272a2460f833b9"
 ],
 [
  "bremen-candidate-cohort-constants.ts",
  "BREMEN_CANDIDATE_COHORTS",
  "0d92690767bd5e4b958f74907805b0fd287c1c63b0518e0df0f82e60de07b971"
 ],
 [
  "organisten-data.ts",
  "ORGANISTEN_DATA",
  "87dbcf745ad540985c830f366f32c6bd2458792af5407583fcb9a65d2dea65e1"
 ],
 [
  "bremen-market-held-source-snapshots.ts",
  "BREMEN_MARKET_HELD_SOURCE_SNAPSHOTS",
  "5ed07b348ef4ca342dcbcf8a56f8551e0a546aa803fb9fd9385e6d2072b06c63"
 ],
 [
  "bremen-teerhof-detail-data.ts",
  "TEERHOF_DETAIL_DATA",
  "2a60ccf38ce284436446e15697f3d0ecd4c7248944d8dc5e88349f1867110d2a"
 ],
 [
  "stephani-row-data.ts",
  "STEPHANI_ROW_DATA",
  "0094e759747bb4f00884a096948f56c7f72bb5b10394d94b0744f4ccf015bab4"
 ],
 [
  "europahafenkopf70-data.ts",
  "EUROPAHAFENKOPF70_DATA",
  "9395db16785881813bb5c4b2362375d35fead6ee653a613d18792c07f6c57a51"
 ],
 [
  "ws-back-detail-data.ts",
  "WS_BACK_DETAIL_DATA",
  "73e65f16971ed68a9255b738d56de1f311b664e54ee154aa82f8354c994c74f8"
 ],
 [
  "bremen-additional-held-source-snapshots.ts",
  "BREMEN_ADDITIONAL_HELD_SOURCE_SNAPSHOTS",
  "215acc502b1487366a492bd49009be602ef18e2b2dc478dea54c1ffd54a5a80e"
 ],
 [
  "ws70-data.ts",
  "WS70_DATA",
  "45e7758d7b7369af6703b81bb9814d18548ff88de5f8e2ddaa41b652ebbe579f"
 ],
 [
  "f260-accepted-restore-data.ts",
  "F260_ACCEPTED_RESTORE_DATA",
  "8d40ec6862cdfdf644e66571205506114f4af870a097e51e4ffba18947bea186"
 ],
 [
  "kunsthalle70-data.ts",
  "KUNSTHALLE70_DATA",
  "444673e70bee245d85318b8f980e34f83ec5315a58017c03cfd8468cb9eb7fce"
 ],
 [
  "radstation70-data.ts",
  "RADSTATION70_DATA",
  "7ae3ecb975fc7cbcb35f3500c8ec6255dc804f012ce63c9635c266aae0c3acd4"
 ],
 [
  "f274-cohort-constants.ts",
  "F274_COHORT",
  null
 ],
 [
  "bremen-accepted-cohort-constants.ts",
  "BREMEN_ACCEPTED_COHORT",
  null
 ]
];
const transpile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
// Data modules may import only the pure demand/identity metadata modules (24c2bda); nothing else.
const BREMEN_METADATA=(await import('./support/fixtures3-bremen-metadata.mjs')).bremenMetadataModules();
function evaluate(text,json=JSON){const m={exports:{}};Function('require','module','exports','JSON',transpile(text))(name=>{if(Object.hasOwn(BREMEN_METADATA,name))return BREMEN_METADATA[name];throw Error('Data-only module requested runtime dependency '+name);},m,m.exports,json);return m.exports;}
const scopeSource=await readFile(path.join(web,'src/safety/frozen-data-scope.ts'),'utf8');
const scopeRequire=(await import('./support/fixtures-managers-a-runtime.mjs')).createRuntimeLoader().scopeRequire('scope module');
const {createFrozenDataScope}=(()=>{const m={exports:{}};Function('require','module','exports',transpile(scopeSource))(scopeRequire,m,m.exports);return m.exports;})();
function fakeClient(label){
 const acquisitions=[],releases=[],borrows=[],values=new Map();
 return{acquisitions,releases,borrows,values,async acquire(ref,signal){signal.throwIfAborted();const key=JSON.stringify(ref),value={label,key,rows:[{fixture:label}]};assert(!values.has(key),'fixture scope acquires each exact ref once');values.set(key,value);acquisitions.push({...ref});let live=true;
  return{borrow(read){assert(live,'released lease must not be borrowed');borrows.push(key);return read(value);},release(){if(!live)return;live=false;releases.push(key);}};
 }};
}
async function modules(json){return new Map(await Promise.all(expected.map(async([file,binding,sha])=>{const text=await readFile(path.join(web,'src/painted/bremen/safety',file),'utf8');return[file,{binding,sha,text,api:evaluate(text,json)}];})));}
const refs=expected.filter(([, ,sha])=>sha).map(([file,binding,sha])=>({file,binding,ref:{canonicalSHA256:sha,file:'painted/bremen/safety/'+file,occurrence:0,codec:'json'}}));

test('all forty-two data-only modules cold-import without model reads or inline parsing and retain exact resource identities',async()=>{
 let parses=0;const loaded=await modules({parse(){parses++;throw Error('Cold import parsed a model');}});
 assert.equal(parses,0);assert.equal(refs.length,39);assert.equal(loaded.size,42);
 for(const[file,record]of loaded){const {api,binding,sha}=record;assert.equal(typeof api['get'+binding],'function',file);assert.equal(Object.hasOwn(api,binding),false,'old global data export must be absent: '+file);
  assert.throws(()=>api['get'+binding](),/Frozen data scope required/);
  if(sha)assert.deepEqual(api[binding+'_RESOURCE'],{canonicalSHA256:sha,file:'painted/bremen/safety/'+file,occurrence:0,codec:'json'});
  else assert.equal(Object.hasOwn(api,binding+'_RESOURCE'),false,'inline data must not invent a resource');
 }
 // Semantic fingerprints are deliberately distinct from raw-table hashes.
 assert.equal(loaded.get('progressive-paint-admissions.ts').api.PROGRESSIVE_INPUT_SHA,'978fba4201ed4025234ef48c001a91ff20719951ed62197ab67b435c559becef');
 assert.equal(loaded.get('progressive-feature-cities.ts').api.PROGRESSIVE_CITY_SOURCE_FULL_SHA,'851a98ae3feb9d32f91ee97dff3b92d4a55c9774201bd2f6445bd05f740a130b');
 assert.equal(loaded.get('office7a-data.ts').api.OFFICE7A70_SHA,'561bd4ba1481041655663f4a720f5c6455feea15247ca283139c5e55eb2cdc62');
});

test('resource getters require exact prepared scopes, preserve borrowed aliases, and cannot leak values between map lifetimes',async()=>{
 const loaded=await modules({parse(){throw Error('Resource test decoded inline model');}}),a=fakeClient('map A'),b=fakeClient('map B'),scopeA=createFrozenDataScope(a),scopeB=createFrozenDataScope(b),signal=new AbortController().signal;
 for(const{file,binding}of refs)assert.throws(()=>loaded.get(file).api['get'+binding](scopeA),/was not prepared/);
 assert.equal(a.acquisitions.length,0,'getters must not implicitly acquire');
 await scopeA.prepare(refs.map(x=>x.ref),signal);await scopeB.prepare(refs.map(x=>x.ref),signal);
 assert.deepEqual(a.acquisitions,refs.map(x=>x.ref));assert.deepEqual(b.acquisitions,refs.map(x=>x.ref));
 const pin=scopeA.retain(),saved=[];
 for(const{file,binding,ref}of refs){const get=loaded.get(file).api['get'+binding],key=JSON.stringify(ref),value=get(scopeA);assert.equal(value,a.values.get(key));assert.equal(get(scopeA),value,'no clone/reparse of borrowed data');assert.equal(get(scopeB),b.values.get(key));assert.notEqual(get(scopeB),value);saved.push([get,value]);}
 assert.equal(a.acquisitions.length,39);assert.equal(b.acquisitions.length,39);
 scopeA.release();assert.equal(a.releases.length,0,'resident pin keeps its borrowed arrays alive');
 for(const[get,value]of saved)assert.equal(get(scopeA),value);
 pin();pin();assert.equal(a.releases.length,39,'final release is once per exact ref');
 for(const[get]of saved)assert.throws(()=>get(scopeA),{name:'AbortError'});
 for(const{file,binding,ref}of refs)assert.equal(loaded.get(file).api['get'+binding](scopeB),b.values.get(JSON.stringify(ref)));
 scopeB.release();assert.equal(b.releases.length,39);assert.equal(scopeA.stats.disposed,true);assert.equal(scopeB.stats.disposed,true);
});

test('inline office data keeps the exact original expression and memoizes only within its explicit live scope',async()=>{
 const text=await readFile(path.join(web,'src/painted/bremen/safety/office7a-data.ts'),'utf8'),ast=ts.createSourceFile('office7a-data.ts',text,ts.ScriptTarget.Latest,true),calls=[];
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='JSON.parse')calls.push(n);ts.forEachChild(n,visit);}visit(ast);assert.equal(calls.length,1);
 assert.equal(createHash('sha256').update(calls[0].arguments[0].getText(ast)).digest('hex'),'ea4fe2fc862647c6a62d20529e5004e980937078bb80d768e1dcac2646b37ce3');
 let parses=0;const api=evaluate(text,{parse(raw){assert.equal(typeof raw,'string');assert(raw.length>0);return{parse:++parses,fixture:[1,2,3]};}}),client=fakeClient('inline'),a=createFrozenDataScope(client),b=createFrozenDataScope(client),get=api.getOFFICE7A70_DATA;
 assert.equal(parses,0);assert.throws(()=>get(),/Frozen data scope required/);assert.equal(parses,0);
 const first=get(a);assert.equal(get(a),first);assert.equal(parses,1);const second=get(b);assert.notEqual(second,first);assert.equal(get(b),second);assert.equal(parses,2);assert.equal(client.acquisitions.length,0,'inline memo has no fake resource');
 const unpin=a.retain();a.release();assert.equal(get(a),first);unpin();assert.throws(()=>get(a),{name:'AbortError'});assert.equal(get(b),second);b.release();assert.throws(()=>get(b),{name:'AbortError'});assert.equal(parses,2);
});



test('inline cohort literals remain deferred and retain their exact source while using distinct per-scope memo keys',async()=>{
 const expected=[["f274-cohort-constants.ts","F274_COHORT","53ad9bcae4b2dc2d624db887afe826f34195eee2121ceef2f1fb0625f262bfe9"],["bremen-accepted-cohort-constants.ts","BREMEN_ACCEPTED_COHORT","d1fc28bc65bda3850d45e7fc9d643f529ed8a18be82796688ffd11609b0aa421"]];
 const a=createFrozenDataScope(fakeClient('cohort A')),b=createFrozenDataScope(fakeClient('cohort B'));let cells=0;
 const controlled=(scope,label)=>({memo(key,original){assert.equal(typeof original,'function');return scope.memo(key,()=>({label,cell:++cells}));}});
 const aa=controlled(a,'A'),bb=controlled(b,'B'),saved=[];
 for(const[file,binding,sha]of expected){
  const text=await readFile(path.join(web,'src/painted/bremen/safety',file),'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),factories=[];
  function visit(n){if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='memo')factories.push(n.arguments[1]);ts.forEachChild(n,visit);}visit(ast);assert.equal(factories.length,1);
  const body=factories[0].body,original=ts.isParenthesizedExpression(body)?body.expression:body;assert.equal(createHash('sha256').update(original.getText(ast)).digest('hex'),sha,'literal/as-const source is preserved without decoding it');
  const api=evaluate(text),get=api['get'+binding],first=get(aa);assert.equal(get(aa),first);assert.notEqual(get(bb),first);saved.push([get,first]);
 }
 assert.notEqual(saved[0][1],saved[1][1],'different cohort exports cannot share a memo cell');
 assert.equal(cells,4);a.release();for(const[get]of saved)assert.throws(()=>get(aa),{name:'AbortError'});for(const[get]of saved)assert.equal(get(bb).label,'B');b.release();assert.equal(cells,4);
});
