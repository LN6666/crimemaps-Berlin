import {resourceContentKeys} from './support/resource-content-key.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const read=file=>fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
function evaluate(file,dependencies={}){const module={exports:{}};Function('require','module','exports',ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{assert.ok(id in dependencies,'unexpected import '+id+' from '+file);return dependencies[id];},module,module.exports);return module.exports;}
const chunks=evaluate('safety/renderer-chunk-input.ts',{'./resource-content-key':resourceContentKeys}),signature=evaluate('painted/root500/safety/progressive-native-signature.ts').nativePaintSignature;
const metadata=evaluate('painted/bremen/safety/bremen-demand-metadata.ts').BREMEN_DEMAND_METADATA;
const key=row=>row.objectId+'|'+row.partId;
function component(identity,city='bremen'){return{city,...identity,origin:[8,53],componentGeometry:{type:'Polygon',coordinates:[[[8,53],[8.001,53],[8,53.001],[8,53]]]},sourceFeature:{type:'Feature',id:identity.objectId,geometry:null,properties:{}},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.5,.5,.5],paint:Array(12).fill(1),frames:Array(15).fill(2)}]};}
function parent(contentKey){let holds=0;function lease(){holds++;let live=true;return{contentKey,get released(){return!live;},retain(){assert.ok(live);return lease();},release(){if(live){live=false;holds--;}}};}return{lease:lease(),get holds(){return holds;}};}
function scope(values=new Map()){const resources=new Map();return{borrow(ref,read){assert.ok(values.has(ref.canonicalSHA256),'unprepared '+ref.file);return read(values.get(ref.canonicalSHA256));},retainResource(ref){let value=resources.get(ref.canonicalSHA256);if(!value)resources.set(ref.canonicalSHA256,value=parent(JSON.stringify(ref)));return value.lease.retain('dependency');},release(){for(const value of resources.values())value.lease.release();},resources,values};}
function input(rows){return{store:{},groups:rows.map((row,index)=>({contentKey:'native:'+key(row),components:[row],parents:[parent('leaf:'+key(row)).lease],frame:chunks.rendererChunkFrame(row.origin,'frame:'+index),cohortKeys:['publication'],materialAuthority:'original-material',recipeAuthority:'original-recipe',selectedLOD:'canonical'})),cohorts:[{key:'publication',members:rows.map(row=>'native:'+key(row)),authority:'original-publication'}]};}
const refs={old:evaluate('painted/bremen/safety/oldtown70-data.ts'),kunst:evaluate('painted/bremen/safety/kunsthalle70-data.ts'),restore:evaluate('painted/bremen/safety/f260-accepted-restore-data.ts'),market:evaluate('painted/bremen/safety/market-cap-data.ts'),organisten:evaluate('painted/bremen/safety/organisten-data.ts'),kuester:evaluate('painted/bremen/safety/glocke-kuester-data.ts')};
function bremenAdapter(){return evaluate('painted/bremen/safety/bremen-display-derivations.ts',{
 '../../../safety/renderer-chunk-input':chunks,'./bremen-demand-metadata':{BREMEN_DEMAND_METADATA:metadata},'./oldtown70-data':refs.old,'./kunsthalle70-data':refs.kunst,'./f260-accepted-restore-data':refs.restore,'./market-cap-data':refs.market,'./organisten-data':refs.organisten,'./glocke-kuester-data':refs.kuester,
 }).bremenDisplayDerivations;}
function bremenReceipts(rows){return rows.filter(row=>row.displayEstimates).map(row=>{const mark=row.displayEstimates,restore=mark.acceptedF260Restore;return{objectId:row.objectId,partId:row.partId,sourcePartId:restore?.sourceCarrier.partId??row.partId,patchSHA256:restore?.patchSHA256??mark.marketCapStone?.patchSHA256??mark.infillBremenOldtown70?.patchSHA256??mark.bremenKunsthalle70?.patchSHA256,originalAcceptedAssetSHA256:restore?.originalAssetSHA256,sourceCarrier:restore?.sourceCarrier};});}
function oldtown(targets){const source=[],display=[],models=targets.map(target=>{const light=metadata.oldtown.models.find(model=>model.targetId===target),native=light.requiredNativeGroup.map(identity=>component(identity));source.push(...native);const rows=light.displays.map(identity=>component(identity)),model={...structuredClone(light),requiredNativeGroup:native.map(row=>({...row,signature:signature(row)})),sourceBinding:{...light.sourceBinding,sourceRecordSHA256:'a'.repeat(64)},displays:structuredClone(rows)};for(const row of rows){row.displayEstimates={infillBremenOldtown70:{targetId:target,patchSHA256:refs.old.BREMEN_OLDTOWN70_SHA,sourceAuthoritySHA256:metadata.oldtown.sourceAuthoritySHA256}};if(light.sourceBinding.nativeParentAbsent){row.sourceFeature.properties.__not_native_source=true;row.displayEstimates={...row.displayEstimates,sourceNativeMeshAbsent:true,sourceRecordSHA256:model.sourceBinding.sourceRecordSHA256,sourceAuthoritySHA256:metadata.oldtown.sourceAuthoritySHA256};}display.push(row);}return model;});const current=scope(new Map([[refs.old.BREMEN_OLDTOWN70_SHA,{models,sourceAuthoritySHA256:metadata.oldtown.sourceAuthoritySHA256}]]));return{source,display,current};}
const actualBremen=bremenAdapter(),deriveBremen=(rows,source,current)=>actualBremen(rows,source,current,bremenReceipts(rows));

test('Bremen B03A complete five-parent group and B03D zero-native resource survive independent input release',()=>{
 const {source,display,current}=oldtown(['BR-OT-B03A','BR-OT-B03D']),proof=deriveBremen(display,source,current),raw=input(source),bound=chunks.bindRendererChunkDerivations(raw,proof.proofs);
 assert.equal(bound.groups.length,2);assert.equal(bound.groups.find(group=>group.components.some(row=>row===display[0])).parents.length,6);
 const repeated=chunks.bindRendererChunkDerivations(bound,proof.proofs);assert.deepEqual(repeated.groups.map(group=>group.contentKey),bound.groups.map(group=>group.contentKey),'repeated final binding does not nest authority keys');
 proof.release();current.release();bound.release();assert.ok([...current.resources.values()].every(resource=>resource.holds>0),'independent final input keeps frozen resource');
 assert.deepEqual(chunks.rendererDerivedDisplayKeys(source,display,[],proof.proofs),display.map(key));
 const allocations=repeated.groups.map(group=>({source:group,contentKey:'packed:'+group.contentKey}));assert.ok(chunks.rendererChunkPublicationCohorts(repeated,allocations).length);
 repeated.release();assert.ok([...current.resources.values()].every(resource=>resource.holds===0));
 assert.throws(()=>deriveBremen(display,source.slice(1),current),/complete native dependency/);
 assert.throws(()=>deriveBremen(display,[...source,source[0]],current),/complete native dependency/);
 display[0].displayEstimates.infillBremenOldtown70.patchSHA256='wrong';assert.throws(()=>deriveBremen(display,source,current),/marker mismatch/);
});

test('Bremen market cap coalesces the two original displays and retains both recipe resources',()=>{
 const {source,display,current}=oldtown(['BR-OT-B03C','BR-OT-B03D']);for(const row of display)row.displayEstimates.marketCapStone={patchSHA256:refs.market.MARKET_CAP_SHA};
 const proof=deriveBremen(display,source,current),bound=chunks.bindRendererChunkDerivations(input(source),proof.proofs);assert.equal(bound.groups.length,1);assert.equal(bound.groups[0].parents.length,3);
 assert.ok(bound.groups[0].recipeAuthority.includes(refs.market.MARKET_CAP_SHA));assert.ok(bound.groups[0].recipeAuthority.includes(refs.old.BREMEN_OLDTOWN70_SHA));
 const allocated=chunks.rendererChunkGroups(bound,display);assert.equal(allocated.length,1);assert.ok(chunks.rendererChunkPublicationCohorts(bound,[{source:allocated[0],contentKey:'packed-market'}]).length);
 proof.release();bound.release();current.release();
 const malformed={...display[1],displayEstimates:{...display[1].displayEstimates,marketCapStone:{patchSHA256:'wrong'}}};assert.throws(()=>deriveBremen([display[0],malformed],source,scope(current.values)),/Market cap|producer receipt/);
});

test('Kunsthalle uses all sixteen native dependencies and rejects malformed markers and incomplete evidence',()=>{
 const source=metadata.kunsthalle.requiredNativeGroup.map(identity=>component(identity)),row=component(metadata.kunsthalle.derivedIdentity),carrier={objectId:source[0].objectId,partId:source[0].partId},data={requiredNativeGroup:source.map(value=>({...value,signature:signature(value),leafSHA256:'leaf'})),sourceCarrier:carrier,referenceSourceSHA256:'r'.repeat(64),batch:row.batches[0]};
 row.sourceFeature.properties.__derived_display_only=true;row.displayEstimates={bremenKunsthalle70:{patchSHA256:refs.kunst.KUNSTHALLE70_SHA,sourceAbsent:true,nativeGetterCount:0,sourceCarrier:carrier}};
 const current=scope(new Map([[refs.kunst.KUNSTHALLE70_SHA,data]])),proof=deriveBremen([row],source,current),bound=chunks.bindRendererChunkDerivations(input(source),proof.proofs);
 assert.equal(bound.groups.length,1);assert.equal(bound.groups[0].parents.length,17);assert.deepEqual(chunks.rendererDerivedDisplayKeys([source[10]], [row],[],proof.proofs),[key(row)]);proof.release();bound.release();current.release();
 assert.throws(()=>deriveBremen([row],source.slice(1),scope(current.values)),/complete native dependency/);assert.throws(()=>actualBremen([row],source,scope(current.values),[]),/unique verified producer receipt/);
 row.displayEstimates.bremenKunsthalle70.nativeGetterCount=1;assert.throws(()=>deriveBremen([row],source,scope(current.values)),/marker mismatch/);
});

test('F260 final append binds four complete parents after initial preparation and gets original carrier visibility order',()=>{
 const source=metadata.f260.models.map(model=>component(model.sourceCarrier)),rows=metadata.f260.models.map((model,index)=>({...component(model.profile),displayEstimates:{acceptedF260Restore:{nativeSOURCE:false,acceptedHistoricalDISPLAY:true,patchSHA256:refs.restore.F260_ACCEPTED_RESTORE_SHA,originalAssetSHA256:String(index).repeat(64),sourceCarrier:model.sourceCarrier}}})),current=scope();
 const initial=chunks.bindRendererChunkDerivations(input(source),[]),proof=deriveBremen([...source,...rows],source,current),final=chunks.bindRendererChunkDerivations(initial,proof.proofs);initial.release();proof.release();current.release();
 assert.equal(final.groups.length,1);assert.equal(final.groups[0].parents.length,5);assert.deepEqual(chunks.rendererDerivedDisplayKeys([source[3],source[0]],rows,[],proof.proofs),[key(rows[3]),key(rows[0])]);
 assert.throws(()=>deriveBremen(rows.slice(1),source,scope()),/missing or duplicated/);assert.throws(()=>deriveBremen(rows,source.slice(1),scope()),/complete native dependency/);final.release();
 const renderer=read('painted/bremen/safety/building-mesh-renderer.ts');assert.ok(renderer.indexOf('appendF260AcceptedRestore(components,sourceRows')<renderer.indexOf('bremenDisplayDerivations([...produced.values()]'));
});

const roofData=evaluate('painted/infill/safety/infill-f288-coplanar-roof-data.ts'),roofRecipe=evaluate('painted/infill/safety/infill-f288-coplanar-roof.ts',{'./f288-original-signature':{nativePaintSignature:signature},'./infill-f288-coplanar-roof-data':roofData});
const f278Bindings=evaluate('painted/infill/safety/f278-source-bindings.ts').BINDINGS,f278Profiles=evaluate('painted/infill/safety/f278-original-profiles.ts').OWNER_SHAPE_PATCH_PROFILES;
function infillAdapter(f278Source=f278Bindings,f278Display=f278Profiles){return evaluate('painted/infill/safety/infill-display-derivations.ts',{'../../../safety/renderer-chunk-input':chunks,'../../bremen/safety/bremen-demand-metadata':{BREMEN_DEMAND_METADATA:metadata},'./f278-source-bindings':{BINDINGS:f278Source},'./f278-original-profiles':{OWNER_SHAPE_PATCH_PROFILES:f278Display},'./infill-f288-coplanar-roof':roofRecipe});}
function originalRows(source,derived,tag,patch){return[...source.map(row=>({...row,displayEstimates:{[tag]:true,restoredExistingAcceptedGeometry:true}})),...derived.map(row=>({...row,displayEstimates:{[tag]:true,restoredExistingAcceptedGeometry:true,[tag==='infillF278Original'?'F278DerivedOnly':'F288DerivedOnly']:{patchSHA256:patch,sourceAbsent:true,nativeGetterCount:0,displayOnlyId:row.objectId,partId:row.partId}}}))];}
test('Essen F278 retains both original leaves and both asset authorities without inventing a frozen ref',()=>{
 const source=f278Bindings.map(identity=>component(identity,'essen')),derived=f278Profiles.map(identity=>component(identity,'essen')),patch='54141b8bae1865d0bf3e8e34d7cc78614934af932cf23a60d20e632033898abb',api=infillAdapter();
 const rows=originalRows(source,derived,'infillF278Original',patch),receipts=rows.map(row=>({...row,patchSHA256:patch,sourcePartId:source.find(parent=>parent.objectId===row.objectId).partId})),current=scope(),proof=api.infillDisplayDerivations(rows,source,current,receipts),bound=chunks.bindRendererChunkDerivations(input(source),proof.proofs);
 assert.equal(bound.groups.length,1);assert.equal(bound.groups[0].parents.length,2);assert.ok(bound.groups[0].recipeAuthority.includes(f278Profiles[1].sha256));assert.equal(current.resources.size,0);assert.deepEqual(chunks.rendererDerivedDisplayKeys([source[1],source[0]],derived,receipts,proof.proofs),[key(derived[1]),key(derived[0])]);
 assert.throws(()=>api.infillDisplayDerivations(rows,[...source,source[0]],current,receipts),/missing or duplicated/);proof.release();bound.release();
});

test('Essen F288 joins Reception through the source part across object IDs and binds all twenty native members',()=>{
 const api=infillAdapter(),source=metadata.f288Source.map(identity=>component(identity,'essen')),derived=metadata.f288Derived.map(identity=>component(identity,'essen')),patch='6c64dab596398fdd7315311b43467cae8fe8083f9ee1a8ab12707607f735702f',rows=originalRows(source,derived,'infillF288Original',patch);
 const receipts=rows.map(row=>({...row,patchSHA256:patch,sourcePartId:row.partId.includes('/owner-')?row.partId.slice(0,row.partId.indexOf('/owner-')):row.partId})),current=scope(new Map([[api.INFILL_DISPLAY_DERIVATION_REFS.f288[0].canonicalSHA256,source],[api.INFILL_DISPLAY_DERIVATION_REFS.f288[1].canonicalSHA256,derived]])),proof=api.infillDisplayDerivations(rows,source,current,receipts),bound=chunks.bindRendererChunkDerivations(input(source),proof.proofs),reception=rows.find(row=>key(row)===key(derived[0])),parentRow=source.find(row=>row.partId===receipts.find(record=>key(record)===key(reception)).sourcePartId);
 assert.notEqual(parentRow.objectId,reception.objectId);assert.equal(bound.groups.length,1);assert.equal(bound.groups[0].parents.length,22);assert.deepEqual(chunks.rendererDerivedDisplayKeys([parentRow],[reception],receipts,proof.proofs),[key(reception)]);assert.throws(()=>api.infillDisplayDerivations(rows,source.slice(1),current,receipts),/missing or duplicated/);
 proof.release();bound.release();current.release();
});

test('Stuttgart column keeps an admission witness without creating native ancestry',()=>{
 const api=infillAdapter(),row=component(metadata.jubilaeumDisplay,'stuttgart'),anchor=component({objectId:'osm/way/9414673',partId:'osm/way/9414673/component/88392e74fa5b3e45c6cd'},'stuttgart');anchor.origin=[9.17839935,48.7790721];const raw=structuredClone(row),patch='34cba41129ede7299b20018fab91b2b58f91fcf571b6f3f761d589f95a7b9747';row.displayEstimates={infillJubilaeumssaeule:{patchSHA:patch,sourceAbsent:true,nativeGetterCount:0}};
 const current=scope(new Map([[api.INFILL_DISPLAY_DERIVATION_REFS.column[0].canonicalSHA256,raw]])),receipts=[{...row,sourcePartId:'',patchSHA256:patch}],proof=api.infillDisplayDerivations([row],[anchor],current,receipts);assert.equal(proof.proofs[0].sources.length,0);assert.deepEqual(proof.proofs[0].witnesses,[anchor]);
 const bound=chunks.bindRendererChunkDerivations(input([anchor]),proof.proofs);assert.equal(bound.groups[0].parents.length,2);assert.throws(()=>api.infillDisplayDerivations([row],[anchor,anchor],current,receipts),/missing or duplicated/);assert.throws(()=>api.infillDisplayDerivations([row],[anchor,raw],current,receipts),/admission mismatch/);proof.release();bound.release();current.release();
});

test('Essen nave preserves both tower and nearby-only admission paths with frozen DISPLAY authority',()=>{
 const api=infillAdapter(),row=component({objectId:'osm/way/114669129',partId:'osm/way/114669129/surface'},'essen'),raw=structuredClone(row),patch=api.INFILL_DISPLAY_DERIVATION_REFS.nave[0].canonicalSHA256;row.displayEstimates={infillEssenExterior:{patchSHA:patch}};
 const tower=component({objectId:'osm/way/303835932',partId:'osm/way/303835932/component/2832660d4be51576c190'},'essen'),nearby=component({objectId:'nearby-admission-only',partId:'nearby-part'},'essen');nearby.componentGeometry.coordinates=[[[7.0051,51.4446],[7.0052,51.4446],[7.0051,51.4447],[7.0051,51.4446]]];
 for(const witness of [tower,nearby]){const current=scope(new Map([[patch,raw]])),receipts=[{...row,sourcePartId:row.partId,patchSHA256:patch,admissionWitness:{objectId:witness.objectId,partId:witness.partId},admissionKind:witness===tower?'verified-original-tower':'verified-nearby-footprint'}],proof=api.infillDisplayDerivations([row],[witness],current,receipts),bound=chunks.bindRendererChunkDerivations(input([witness]),proof.proofs);assert.equal(proof.proofs[0].sources.length,0);assert.deepEqual(proof.proofs[0].witnesses,[witness]);assert.equal(bound.groups[0].parents.length,2);assert.deepEqual(chunks.rendererDerivedDisplayKeys([witness],[row],receipts,proof.proofs),[key(row)]);assert.throws(()=>api.infillDisplayDerivations([row],[witness,raw],current,receipts),/absence mismatch/);proof.release();bound.release();current.release();}
});

test('visibility rank preserves direct-source priority, final proof overrides and unreachable cycles',()=>{
 const row=id=>component({objectId:id,partId:id+'/part'}),a=row('a'),b=row('b'),fromB=row('from-b'),fromA=row('from-a'),u=row('unreachable-u'),v=row('unreachable-v'),explicit=row('explicit');
 const proof=(child,sources)=>({components:[child],sources}),receipts=[{...fromB,sourceCarrier:a,sourcePartId:a.partId}];
 const proofs=[proof(b,[a]),proof(fromB,[b]),proof(fromA,[a]),proof(u,[v]),proof(v,[u])];
 assert.deepEqual(chunks.rendererDerivedDisplayKeys([a,b],[fromB,b,fromA,u,v,explicit],receipts,proofs,value=>value===explicit,[a,b,u,v]),[fromA,fromB,b,explicit].map(key));
});

test('same-identity reconstruction receipts alter physical recipe authority and incomplete ancestry is still rejected',()=>{
 const row=component({objectId:'native',partId:'part'}),raw=input([row]),first=chunks.rendererChunkGroups(raw,[row],()=>({sources:[row],authority:'recipe-A'})),second=chunks.rendererChunkGroups(raw,[row],()=>({sources:[row],authority:'recipe-B'}));assert.notEqual(first[0].contentKey,second[0].contentKey);assert.deepEqual(first[0].sourceKeys,[raw.groups[0].contentKey]);assert.throws(()=>chunks.rendererChunkGroups(raw,[{...row,partId:'unknown'}]),/no authoritative chunk ancestry/);
});


test('32 shared quoted source proofs remain flat and identical across final rebinding',()=>{
 const source=component({objectId:'shared',partId:'native'}),raw=input([source]);raw.groups[0]={...raw.groups[0],contentKey:'native:"quoted"\\leaf',materialAuthority:'material:"quoted"\\texture',recipeAuthority:'recipe:"quoted"\\recipe'};raw.cohorts=[{key:'original',members:[raw.groups[0].contentKey],authority:'original'}];
 const proofs=Array.from({length:32},(_,index)=>{const row=component({objectId:'display-'+index,partId:'derived-'+index}),authority=JSON.stringify(['proof',index,'"quoted"\\resource']);return{authority,components:[row],sources:[source],parents:[],frame:chunks.rendererChunkFrame(row.origin,authority)};}),once=chunks.bindRendererChunkDerivations(raw,proofs);
 let staged=chunks.bindRendererChunkDerivations(raw,[]);for(const proof of proofs){const next=chunks.bindRendererChunkDerivations(staged,[proof]);staged.release();staged=next;}
 const rebound=chunks.bindRendererChunkDerivations(staged,proofs),actual=once.groups[0];
 assert.equal(once.groups.length,1);assert.equal(actual.components.length,33);assert.equal(actual.derivationAuthorities.length,32);assert.equal(actual.derivationBaseAuthorities.length,1);assert.deepEqual(new Set(actual.components.map(key)),new Set([key(source),...proofs.map(proof=>key(proof.components[0]))]));
 for(const field of ['contentKey','materialAuthority','recipeAuthority']){assert.equal(staged.groups[0][field],actual[field]);assert.equal(rebound.groups[0][field],actual[field]);}
 const payload=[raw.groups[0].contentKey,raw.groups[0].materialAuthority,raw.groups[0].recipeAuthority,...proofs.map(proof=>proof.authority)].reduce((n,value)=>n+JSON.stringify(value).length,0),length=['contentKey','materialAuthority','recipeAuthority'].reduce((n,field)=>n+actual[field].length,0);assert.ok(length<4*payload,'serialized authority is linear in the full untruncated input');
 for(const proof of proofs)assert.ok(JSON.parse(actual.contentKey)[2].includes(proof.authority));assert.ok(actual.sourceKeys.includes(raw.groups[0].contentKey));assert.equal(chunks.rendererChunkPublicationCohorts(once,[{source:actual,contentKey:'packed'}]).length,33);
 once.release();staged.release();rebound.release();
});

test('F288 facility clipping binds each admitted facility to the six verified platforms without requiring other facilities',()=>{
 const api=infillAdapter(),source=metadata.f288Source.map(identity=>component(identity,'essen')),derived=metadata.f288Derived.map(identity=>component(identity,'essen')),patch='6c64dab596398fdd7315311b43467cae8fe8083f9ee1a8ab12707607f735702f',rows=originalRows(source,derived,'infillF288Original',patch),pin=roofRecipe.INFILL_F288_COPLANAR_SOURCE_PINS[0],native=component(pin,'essen'),roof={...native,displayEstimates:{infillF288CoplanarFacilityRoof:{recipeSHA256:roofRecipe.INFILL_F288_COPLANAR_ROOF_AUTHORITY,sourceCarrier:pin,displayOnly:true,removedOnlyProvenCanopyIntersections:true,retainedWallsAndUncoveredRoof:true}}};
 const receipts=rows.map(row=>({...row,patchSHA256:patch,sourcePartId:row.partId.includes('/owner-')?row.partId.slice(0,row.partId.indexOf('/owner-')):row.partId})),current=scope(),proof=api.infillDisplayDerivations([...rows,roof],[...source,native],current,receipts),bound=chunks.bindRendererChunkDerivations(input([...source,native]),proof.proofs);
 assert.equal(bound.groups.length,1);assert.equal(bound.groups[0].parents.length,23);assert.ok(bound.groups[0].recipeAuthority.includes(roofRecipe.INFILL_F288_COPLANAR_ROOF_AUTHORITY));assert.equal(proof.proofs.filter(value=>value.authority.includes('f288-coplanar-facility-roof')).length,1);
 assert.throws(()=>api.infillDisplayDerivations([...rows,roof],source,current,receipts),/missing or duplicated/);assert.throws(()=>api.infillDisplayDerivations([...rows,{...roof,displayEstimates:{infillF288CoplanarFacilityRoof:{...roof.displayEstimates.infillF288CoplanarFacilityRoof,recipeSHA256:'wrong'}}}],[...source,native],current,receipts),/recipe marker mismatch/);proof.release();bound.release();current.release();
});
