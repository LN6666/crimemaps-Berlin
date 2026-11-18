// Explicit offline maintenance entry point. There is no runtime loader here.
// Only --extract opens assets; default mode validates the exact metadata plan.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readVerifiedProjectionInput,verifiedProjectionInputSpec} from './bremen-identity-projection-tools.mjs';
import {projectBremenIdentityResource,collectCandidatePairs} from './bremen-identity-resource-projections.mjs';

const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=new Map(process.argv.slice(2).map(value=>{const at=value.indexOf('=');return at<0?[value,true]:[value.slice(0,at),value.slice(at+1)];}));
const hash=value=>createHash('sha256').update(value).digest('hex');
const planFile=args.get('--plan');
if(typeof planFile!=='string'||!path.isAbsolute(planFile))throw Error('Explicit absolute --plan is required');
const planText=fs.readFileSync(planFile,'utf8'),plan=JSON.parse(planText);
const manifest={tables:JSON.parse(fs.readFileSync(path.join(web,'src/safety/frozen-paint-table-manifest.json'),'utf8')),initializers:JSON.parse(fs.readFileSync(path.join(web,'src/safety/frozen-paint-table-dependencies.json'),'utf8')).initializers.bremen};
manifest.aliases=JSON.parse(fs.readFileSync(path.join(web,'src/safety/frozen-paint-source-aliases.json'),'utf8'));
const excluded=new Set(['candidateCohort','extraGLSL','berlinGLSL','hamburgGLSL']);
const selected=Object.entries(plan.resources).filter(([alias])=>!excluded.has(alias));
const maxRawBytes=6326501,totalRawBytes=44407456;
if(selected.length!==41||new Set(selected.map(([,ref])=>ref.canonicalSHA256)).size!==41)throw Error('The authorized projection has exactly 41 unique canonical inputs');
let rawTotal=0;
const inputs=selected.map(([alias,ref])=>{const verified=verifiedProjectionInputSpec(ref,{manifest,maxRawBytes});if((verified.sourceBytes??verified.raw.bytes)!==ref.rawBytes)throw Error('Plan raw size differs from manifest: '+alias);rawTotal+=verified.raw.bytes;return{alias,...verified};});
if(inputs.reduce((sum,input)=>sum+(input.sourceBytes??input.raw.bytes),0)!==totalRawBytes)throw Error('Authorized raw total changed');
if(!args.has('--extract')){
 process.stdout.write(JSON.stringify({mode:'metadata-only',inputs:inputs.length,rawTotal,sourceTotal:totalRawBytes,rawMax:Math.max(...inputs.map(input=>input.raw.bytes)),actualTablesRead:0})+'\n');
}else{
 const assetRoot=args.get('--asset-root'),output=args.get('--output');
 if(typeof assetRoot!=='string'||!path.isAbsolute(assetRoot)||typeof output!=='string'||!path.isAbsolute(output))throw Error('Extraction requires absolute --asset-root and --output');
 const receipt={schema:1,planSHA256:hash(planText),rawTotal,sourceTotal:totalRawBytes,maxRawBytes,inputs:[],values:{}};
 for(const input of inputs){
  // Exactly one verified parsed table lives in this block. Only fresh scalar
  // identity metadata survives it; no original model/array is retained.
  let raw=await readVerifiedProjectionInput(input.ref,{assetRoot,manifest,maxRawBytes});
  const projected=projectBremenIdentityResource(input.alias,raw);raw=undefined;
  const encoded=JSON.stringify(projected);
  if(Buffer.byteLength(encoded)>256000)throw Error('Unexpected identity projection size: '+input.alias);
  const pairs=collectCandidatePairs(projected);
  receipt.values[input.alias]=projected;
  receipt.inputs.push({...input,projectedBytes:Buffer.byteLength(encoded),projectedSHA256:hash(encoded),candidatePairRows:pairs.length,orderedCandidatePairsSHA256:hash(JSON.stringify(pairs))});
  globalThis.gc?.();
  process.stdout.write(input.alias+' '+input.raw.bytes+' -> '+Buffer.byteLength(encoded)+' metadata bytes\n');
 }
 receipt.projectedBytes=Buffer.byteLength(JSON.stringify(receipt.values));
 fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 process.stdout.write(JSON.stringify({mode:'extracted',inputs:receipt.inputs.length,rawTotal,projectedBytes:receipt.projectedBytes,output})+'\n');
}
