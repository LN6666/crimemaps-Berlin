// Explicit bounded offline extraction. Import/read code does not open assets.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {verifiedProjectionInputSpec,readVerifiedProjectionInput} from './bremen-identity-projection-tools.mjs';
import {projectBremenDemandResource} from './bremen-demand-resource-projections.mjs';

const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=new Map(process.argv.slice(2).map(value=>{const at=value.indexOf('=');return at<0?[value,true]:[value.slice(0,at),value.slice(at+1)];}));
const requestFile=args.get('--request');
if(typeof requestFile!=='string'||!path.isAbsolute(requestFile))throw Error('Explicit absolute --request is required');
const text=fs.readFileSync(requestFile,'utf8'),request=JSON.parse(text);
const hash=value=>createHash('sha256').update(value).digest('hex');
const manifest={tables:JSON.parse(fs.readFileSync(path.join(web,'src/safety/frozen-paint-table-manifest.json'),'utf8')),initializers:JSON.parse(fs.readFileSync(path.join(web,'src/safety/frozen-paint-table-dependencies.json'),'utf8')).initializers.bremen};
manifest.aliases=JSON.parse(fs.readFileSync(path.join(web,'src/safety/frozen-paint-source-aliases.json'),'utf8'));
const rawLimit=8*1024*1024,expectedCount=22,expectedTotal=28363025;
if(request.requests.length!==expectedCount||request.summary.rawTotal!==expectedTotal)throw Error('Exact corrected request must contain 22 refs and 28,363,025 raw bytes');
const inputs=request.requests.map(input=>({alias:input.alias,...verifiedProjectionInputSpec(input.ref,{manifest,maxRawBytes:rawLimit})}));
if(new Set(inputs.map(input=>input.ref.canonicalSHA256)).size!==expectedCount||inputs.reduce((n,input)=>n+(input.sourceBytes??input.raw.bytes),0)!==expectedTotal)throw Error('Manifest canonical set/total differs from corrected request');
for(let i=0;i<inputs.length;i++)if((inputs[i].sourceBytes??inputs[i].raw.bytes)!==request.requests[i].rawBytes)throw Error('Request byte size differs from manifest');
const rawTotal=inputs.reduce((sum,input)=>sum+input.raw.bytes,0);
if(!args.has('--extract'))process.stdout.write(JSON.stringify({mode:'metadata-only',inputs:inputs.length,rawTotal,sourceTotal:expectedTotal,actualTablesRead:0})+'\n');
else{
 const assetRoot=args.get('--asset-root'),output=args.get('--output');
 if(typeof assetRoot!=='string'||!path.isAbsolute(assetRoot)||typeof output!=='string'||!path.isAbsolute(output))throw Error('Extraction requires absolute --asset-root and --output');
 const receipt={schema:1,requestSHA256:hash(text),rawTotal,sourceTotal:expectedTotal,maxRawBytes:rawLimit,inputs:[],values:{}};
 for(const input of inputs){
  let raw=await readVerifiedProjectionInput(input.ref,{assetRoot,manifest,maxRawBytes:rawLimit});
  const projected=projectBremenDemandResource(input.alias,raw);raw=undefined;
  const encoded=JSON.stringify(projected);
  if(Buffer.byteLength(encoded)>256000)throw Error('Unexpected scalar/group metadata size: '+input.alias);
  receipt.values[input.alias]=projected;
  receipt.inputs.push({...input,projectedBytes:Buffer.byteLength(encoded),projectedSHA256:hash(encoded)});
  globalThis.gc?.();
  process.stdout.write(input.alias+' '+input.raw.bytes+' -> '+Buffer.byteLength(encoded)+' metadata bytes\n');
 }
 receipt.projectedBytes=Buffer.byteLength(JSON.stringify(receipt.values));
 fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 process.stdout.write(JSON.stringify({mode:'extracted',inputs:receipt.inputs.length,rawTotal,sourceTotal:expectedTotal,projectedBytes:receipt.projectedBytes,output})+'\n');
}
