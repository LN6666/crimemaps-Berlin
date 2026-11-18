import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import {build} from 'esbuild';

// Actual three adapters; all dataful callbacks and native landmark helpers are
// bounded virtual dependencies. No recipe table, manifest, GPU or manager loads.
const web=fileURLToPath(new URL('../',import.meta.url));
const stateSource=`export const state={events:[],profiles:[],replacement:undefined,lastFrames:undefined};export function live(scope){if(!scope?.live)throw Error('Tiny prepared scope required');return scope;}`;
const sources=new Map([
 ['scope-adapter-state',stateSource],
 ['./progressive-paint',`import {state,live} from 'scope-adapter-state';export function progressiveAdmission(c,scope){live(scope);state.events.push(['admission',c,scope]);return scope.admissions.get(c);}export function isRejectedProgressivePaint(c,scope){live(scope);state.events.push(['rejected',c,scope]);return scope.rejected.has(c);}export function applyProgressiveFrames(rows,out,scope){live(scope);state.events.push(['frames',rows,scope]);state.lastFrames=out;return state.replacement??out;}`],
 ['./progressive-native-signature',`import {state} from 'scope-adapter-state';export function nativePaintSignature(c){state.events.push(['signature',c]);return c.fixtureSignature;}`],
 ['./s020-relation-outline-profile',`import {state} from 'scope-adapter-state';export const S020_RELATION_OUTLINE_PROFILES=state.profiles;`],
 ['./facade-description-bindings',`import {state} from 'scope-adapter-state';export function isDescribedBuilding(c){state.events.push(['described',c]);return c.described;}`],
]);
for(const [file,idName,paintName,id,extra]of [
 ['facade-reichstag-frame','REICHSTAG_NATIVE_IDS','reichstagNativePaint','reichstag',''],
 ['facade-residenz-frame','RESIDENZ_NATIVE_IDS','residenzNativePaint','residenz',''],
 ['facade-elbphilharmonie-frame','ELB_NATIVE_IDS','elbphilharmonieNativePaint','elb','configureElbRoofPaint'],
 ['facade-michel-frame','MICHEL_NATIVE_IDS','michelNativePaint','michel','configureMichelPaint'],
 ['facade-petri-frame','PETRI_NATIVE_IDS','petriNativePaint','petri','configurePetriPaint'],
])sources.set('./'+file,`import {state} from 'scope-adapter-state';export const ${idName}=new Set([${JSON.stringify(id)}]);export function ${paintName}(c){state.events.push(['${paintName}',c]);return new Float32Array(c.batches.reduce((n,b)=>n+b.positions.length/3,0)*5).fill(.375);}${extra?`export function ${extra}(rows){state.events.push(['${extra}',rows]);}`:''}`);
sources.set('./facade-rathaus-roof-paint',`import {state} from 'scope-adapter-state';export function configureRathausRoofPaint(c){state.events.push(['configureRathausRoofPaint',c]);}`);
sources.set('./facade-munich-frame',`import {state} from 'scope-adapter-state';export const FRAUEN_NATIVE_IDS=new Set(['frauen']),RATHAUS_NATIVE_IDS=new Set(['rathaus']);export function frauenNativePaint(c){return new Float32Array(c.batches[0].positions.length/3*5).fill(.25);}export function rathausNativePaint(c){return new Float32Array(c.batches[0].positions.length/3*5).fill(.5);}export function rathausPaintReference(c){state.events.push(['rathausPaintReference',c]);return c;}export function alignRathausWingPaint(c,data,reference){state.events.push(['alignRathausWingPaint',c,reference]);return data;}`);
const bundle=await build({stdin:{contents:`export * as facade from './src/painted/root500/safety/facade-paint-frame';export * as partial from './src/painted/root500/safety/source-partial-gate-display';export * as s020 from './src/painted/root500/safety/s020-relation-outline-display';export {state} from 'scope-adapter-state';`,resolveDir:web,sourcefile:'local-adapter-fixture.ts',loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022',plugins:[{name:'tiny-scope-callbacks',setup(builder){builder.onResolve({filter:/.*/},args=>sources.has(args.path)?{path:args.path,namespace:'tiny-adapter'}:undefined);builder.onLoad({filter:/.*/,namespace:'tiny-adapter'},args=>({contents:sources.get(args.path),loader:'js'}));}}]});
const {facade,partial,s020,state}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const scope=()=>({live:true,admissions:new Map(),rejected:new Set()});
const reset=()=>{state.events.length=0;state.replacement=undefined;state.lastFrames=undefined;};
function component(id='tiny',city='berlin'){return{city,objectId:'osm/way/'+id,partId:'osm/way/'+id+'/component/tiny',origin:[13,52],fixtureSignature:'signature-'+id,described:true,componentGeometry:{type:'Polygon',coordinates:[[[13,52],[13.01,52],[13,52.01],[13,52]]]},sourceFeature:{type:'Feature',properties:{building:'yes','building:material':'brick'}},batches:[{positions:[0,0,0,2,0,0,0,3,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.2,.3,.4],faceRole:'wall'}]};}
const events=()=>state.events.map(event=>event[0]);

test('facade paint family forwards one incoming scope and preserves progressive/rejection/description precedence',()=>{
 const c=component(),s=scope();reset();s.admissions.set(c,{preserveUnboundNeutral:false});assert.equal(facade.paintFamily(c,s),-98);assert.deepEqual(events(),['admission']);assert.equal(state.events[0][2],s);
 reset();s.admissions.set(c,{preserveUnboundNeutral:true});assert.equal(facade.paintFamily(c,s),0);assert.deepEqual(events(),['admission']);
 reset();s.admissions.delete(c);s.rejected.add(c);assert.equal(facade.paintFamily(c,s),0);assert.deepEqual(events(),['admission','rejected']);assert(state.events.every(event=>event[2]===s));
 reset();s.rejected.clear();c.described=false;assert.equal(facade.paintFamily(c,s),0);assert.deepEqual(events(),['admission','rejected','described']);
 reset();c.described=true;assert.equal(facade.paintFamily(c,s),-1);assert.deepEqual(events(),['admission','rejected','described']);
 const next=scope();next.admissions.set(c,{});assert.equal(facade.paintFamily(c,next),-98);s.live=false;assert.throws(()=>facade.paintFamily(c,s),/prepared scope/);assert.throws(()=>facade.paintFamily(c),/prepared scope/);
});

test('facade frame adapter preserves configuration/native/numeric order and returns the final progressive result',()=>{
 reset();const s=scope(),rows=[component('progressive'),component('neutral'),component('reichstag'),component('generic')],before=structuredClone(rows);s.admissions.set(rows[0],{});s.admissions.set(rows[1],{preserveUnboundNeutral:true});const replacement=new Float32Array([99]);state.replacement=replacement;
 assert.equal(facade.facadePaintData(rows,s),replacement);assert.deepEqual(events().slice(0,5),['configureElbRoofPaint','configurePetriPaint','configureMichelPaint','configureRathausRoofPaint','rathausPaintReference']);for(const event of state.events.slice(0,3))assert.equal(event[1],rows);assert.equal(state.events[3][1],undefined);assert.equal(state.events[4][1],undefined);
 // The original +Z wall plane uses tangent u=-x, shifted by u0=-2.
 assert.deepEqual([...state.lastFrames.subarray(0,15)],Array.from({length:3},()=>[0,0,0,0,-98]).flat());assert(state.lastFrames.subarray(15,30).every(value=>value===0));assert(state.lastFrames.subarray(30,45).every(value=>value===.375));assert.deepEqual([...state.lastFrames.subarray(45)],[2,0,3,2,-1,0,0,3,2,-1,2,3,3,2,-1]);assert.equal(events().at(-1),'frames');assert.equal(state.events.at(-1)[1],rows);assert.equal(state.events.at(-1)[2],s);assert(state.events.filter(event=>['admission','rejected'].includes(event[0])).every(event=>event[2]===s));assert.deepEqual(rows,before);
 reset();const empty=[];assert.equal(facade.facadePaintData(empty,s).length,0);assert.deepEqual(events(),['configureElbRoofPaint','configurePetriPaint','configureMichelPaint','configureRathausRoofPaint','rathausPaintReference','frames']);assert.equal(state.events.at(-1)[1],empty);assert.equal(state.events.at(-1)[2],s);
});

// Read only the existing local cold profile literal to bind two tiny rows. The
// literal is source metadata; this never opens its referenced native files.
const partialSource=await readFile(path.join(web,'src/painted/root500/safety/source-partial-gate-display.ts'),'utf8'),partialAST=ts.createSourceFile('partial.ts',partialSource,99,true);
const profileNode=partialAST.statements.filter(ts.isVariableStatement).flatMap(node=>node.declarationList.declarations).find(node=>node.name.getText(partialAST)==='PROFILE');
const profileLiteral=ts.isAsExpression(profileNode.initializer)?profileNode.initializer.expression:profileNode.initializer,profile=JSON.parse(profileLiteral.getText(partialAST));
function partialRows(s){return[profile.parent,profile.cover].map(member=>{const c=component('tiny',profile.city);Object.assign(c,{objectId:member.objectId,partId:member.partId,fixtureSignature:member.geometrySignature});s.admissions.set(c,{geometrySignature:member.geometrySignature});return c;});}
test('partial gate adapter forwards scope in original parent/cover order and returns the original resident references',()=>{
 reset();const s=scope(),rows=partialRows(s),before=structuredClone(rows),leaf=c=>{state.events.push(['leaf',c]);return c===rows[0]?profile.parent.leafSHA256:profile.cover.leafSHA256;};
 const plan=partial.partialGateDisplayPlan(rows,profile.city,leaf,s);assert.deepEqual(plan,{enabled:true,reason:'exact partial gate overlap',parent:rows[0],cover:rows[1]});assert.equal(plan.parent,rows[0]);assert.equal(plan.cover,rows[1]);assert.deepEqual(events(),['leaf','signature','admission','leaf','signature','admission']);assert.deepEqual(state.events.filter(event=>event[0]==='admission').map(event=>event.slice(1)),rows.map(c=>[c,s]));assert.deepEqual(rows,before);
 reset();s.admissions.delete(rows[1]);const missing=partial.partialGateDisplayPlan(rows,profile.city,leaf,s);assert.equal(missing.enabled,false);assert.match(missing.reason,/cover admission mismatch/);assert.equal(missing.parent,undefined);assert.equal(missing.cover,undefined);
 reset();assert.deepEqual(partial.partialGateDisplayPlan(rows,'berlin',leaf),{enabled:false,reason:'other city'});assert.deepEqual(partial.partialGateDisplayPlan([rows[0]],profile.city,leaf),{enabled:false,reason:'members not uniquely resident'});assert.deepEqual(partial.partialGateDisplayPlan([...rows,rows[0]],profile.city,leaf),{enabled:false,reason:'members not uniquely resident'});assert.deepEqual(events(),[]);assert.throws(()=>partial.partialGateDisplayPlan(rows,profile.city,leaf),/prepared scope/);
});

function relationFixture(){const s=scope(),parts=['1245266797','1245266798','1245266799'].map(id=>component(id)),outline=component('outline');outline.objectId='osm/relation/8102166';outline.partId=outline.objectId+'/component/tiny';const member=c=>({objectId:c.objectId,partId:c.partId,geometryFingerprint:'tiny',leafSHA:'leaf-'+c.objectId,nativePaintSignature:c.fixtureSignature});const p={city:'berlin',groupIdentity:'osm/relation/8102166',name:'tiny exact relation',outline:member(outline),parts:parts.map(member),formalRelationMembership:false,completenessClaim:false,entranceSurfaceVerified:true,guardVersion:'s020-exact-three-native-parts-v1',indexSHA:'index',sourcePBF:'pbf',boundarySHA:'boundary',sourceSnapshot:'snapshot'};
 for(const c of parts)s.admissions.set(c,{city:c.city,objectId:c.objectId,partId:c.partId,origin:c.origin,geometrySignature:c.fixtureSignature,batchColors:{'0':[.2,.3,.4]}});state.profiles.splice(0,state.profiles.length,p);const binding={...p,leafSHA:c=>{state.events.push(['leaf',c]);return'leaf-'+c.objectId;},materialReady:c=>{state.events.push(['material',c]);return true;}};return{s,parts,outline,p,binding,rows:[outline,...parts]};}
test('S020 route readiness resolves omitted/undefined rows in the incoming scope and leaves explicit rows authoritative',()=>{
 reset();const f=relationFixture(),c=f.parts[0],row=f.s.admissions.get(c);assert.equal(s020.s020FullOriginalBatchRouteReady(c,undefined,f.s),true);assert.deepEqual(events(),['admission','signature']);assert.equal(state.events[0][2],f.s);
 reset();assert.equal(s020.s020FullOriginalBatchRouteReady(c,row),true);assert.deepEqual(events(),['signature']);assert.equal(s020.s020FullOriginalBatchRouteReady(c,{...row,geometrySignature:'wrong'},f.s),false);assert.equal(events().includes('admission'),false);
 reset();assert.equal(s020.s020FullOriginalBatchRouteReady(component('unsupported')),false);assert.deepEqual(events(),[]);assert.throws(()=>s020.s020FullOriginalBatchRouteReady(c),/prepared scope/);
});
test('S020 default callback closes over scope and keeps exact original part order and array/reference aliases',()=>{
 reset();const f=relationFixture(),before=structuredClone(f.rows),plan=s020.s020RelationOutlineDisplayPlan(f.rows,[f.p],f.binding,undefined,f.s);assert.deepEqual(plan.errors,[]);assert.equal(plan.hiddenOutlines[0],f.outline);assert.equal(plan.groups[0].outline,f.outline);assert.deepEqual(plan.groups[0].parts,f.parts);for(let i=0;i<3;i++){assert.equal(plan.groups[0].parts[i],f.parts[i]);assert.equal(plan.groups[0].parts[i].batches[0].positions,f.parts[i].batches[0].positions);}assert.equal(plan.groups[0].complete,false);assert.deepEqual(f.rows,before);
 assert.deepEqual(events(),['leaf','signature',...f.parts.flatMap(()=>['leaf','signature','material','admission','signature'])]);assert.deepEqual(state.events.filter(event=>event[0]==='admission').map(event=>event.slice(1)),f.parts.map(c=>[c,f.s]));
});
test('S020 custom readers retain precedence; undefined custom results use the same scoped fallback and failures stop the plan',()=>{
 reset();const f=relationFixture(),custom=c=>{state.events.push(['custom',c]);return f.s.admissions.get(c);};const explicit=s020.s020RelationOutlineDisplayPlan(f.rows,[f.p],f.binding,custom);assert.deepEqual(explicit.errors,[]);assert.equal(events().includes('admission'),false);assert.deepEqual(state.events.filter(event=>event[0]==='custom').map(event=>event[1]),f.parts);
 reset();const fallback=s020.s020RelationOutlineDisplayPlan(f.rows,[f.p],f.binding,c=>{state.events.push(['custom',c]);return undefined;},f.s);assert.deepEqual(fallback.errors,[]);assert.deepEqual(events().filter(name=>['custom','admission'].includes(name)),f.parts.flatMap(()=>['custom','admission']));assert(state.events.filter(event=>event[0]==='admission').every(event=>event[2]===f.s));
 reset();f.binding.materialReady=c=>{state.events.push(['material',c]);return false;};const failed=s020.s020RelationOutlineDisplayPlan(f.rows,[f.p],f.binding,undefined,f.s);assert.equal(failed.hiddenOutlines.length,0);assert.equal(failed.groups.length,0);assert.match(failed.errors[0],/all original batches require exact nonzero rendering routes/);assert.equal(events().includes('admission'),false);assert.deepEqual(events(),['leaf','signature','leaf','signature','material']);
});
test('local adapters advertise original arities so an omitted default cannot consume the appended scope',()=>{
 assert.deepEqual(facade.root500DataFunctionArities,{paintFamily:1,facadePaintData:1});assert.deepEqual(partial.root500DataFunctionArities,{partialGateDisplayPlan:3});assert.deepEqual(s020.root500DataFunctionArities,{s020FullOriginalBatchRouteReady:2,s020RelationOutlineDisplayPlan:4});
});
