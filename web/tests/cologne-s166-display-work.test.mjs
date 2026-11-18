import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';
const web=fileURLToPath(new URL('../',import.meta.url)),root=path.join(web,'src/painted/tier300/safety'),runtime=createRuntimeLoader(web);
const source=fs.readFileSync(path.join(root,'s166-sportmuseum70.ts'),'utf8'),specText=source.match(/const SPEC=(.*);\ntype Leaf=/)[1],originalSpec=JSON.parse(specText);
const actual=runtime.load(path.join(root,'s166-sportmuseum70.ts'));
const signature=runtime.load(path.join(root,'progressive-native-signature.ts')).nativePaintSignature;

test('unrelated Cologne buildings never scan or hash the sport museum cohort',()=>{
 const raw=new Proxy([],{get(){throw Error('unrelated display touched cohort data');}}),pin=()=>{throw Error('unrelated display requested source proof');};
 for(let i=0;i<2000;i++)assert.equal(actual.s166Display70({city:'cologne',objectId:'osm/way/'+(100000+i),partId:'unrelated/'+i},raw,pin,pin,true,raw),true);
});
function fixture(){
 const spec=structuredClone(originalSpec),members=[...spec.pins,...spec.profiles];
 const rows=members.map((member,index)=>({city:'cologne',objectId:member.objectId,partId:member.partId,origin:[...member.origin],componentGeometry:{type:'Polygon',coordinates:[[[6.9,50.9],[6.91,50.9],[6.9,50.91],[6.9,50.9]]]},sourceFeature:{properties:{owner_shape_patch:{number:member.number,sourcePartId:member.sourcePartId,geometryRole:member.geometryRole}}},batches:[{positions:[index,0,0,index+1,0,0,index,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.5,.5,.5]}]}));
 // Synthetic fixtures use their real calculated signatures. Production source
 // pins, whole-cohort uniqueness, source/owner identity and registry checks run unchanged.
 members.forEach((member,index)=>member.geometrySignature=signature(rows[index]));
 const code=ts.transpileModule(source.replace(specText,JSON.stringify(spec)),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};
 Function('require','exports',code)(name=>runtime.load(path.resolve(root,name+'.ts')),exports);
 let proofs=0;
 const leaf=row=>{proofs++;return spec.pins.find(pin=>pin.partId===row.partId)?.leafSHA256;};
 const owner=row=>spec.profiles.find(pin=>pin.partId===row.partId)?.sha256;
 return {rows,spec,leaf,owner,display:exports.s166Display70,get proofs(){return proofs;}};
}
test('complete exact cohort replaces native body while unrelated rows do not repeat proof work',()=>{
 const f=fixture(),unrelated=Array.from({length:1000},(_,i)=>({city:'cologne',objectId:'osm/way/'+(800000+i),partId:'other/'+i})),raw=[...f.rows,...unrelated];
 assert.deepEqual(raw.map(row=>f.display(row,raw,f.leaf,f.owner,true,f.spec.profiles)),[false,true,true,true,...unrelated.map(()=>true)]);
 assert.equal(f.proofs,4,'the native source proof is evaluated only for its four dependent identities');
});
test('missing, duplicate, tampered or unprepared cohorts keep native body and hide owner replacements',()=>{
 for(const defect of ['missing','duplicate','geometry','registry','program']){
  const f=fixture(),raw=[...f.rows],registry=structuredClone(f.spec.profiles);
  if(defect==='missing')raw.pop();
  if(defect==='duplicate')raw.push(raw[0]);
  if(defect==='geometry')raw[3].batches[0].positions[0]++;
  if(defect==='registry')registry[0].sha256='unverified';
  assert.deepEqual(f.rows.map(row=>f.display(row,raw,f.leaf,f.owner,defect!=='program',registry)),[true,false,false,false],defect);
 }
});
