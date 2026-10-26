import {readFrozenTableAsync} from '../../../safety/frozen-paint-tables';
import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
type Batch=MeshBatch&{positions:number[];normals:number[];indices:number[];color:number[];frames:number[];paint:number[];triangleProvenance:any[]};
export const F314_IDS=[{"city": "dresden", "objectId": "osm/way/22764481", "partId": "osm/way/22764481/component/baf73c5d62027eb80da9", "signature": "2087eb12"}, {"city": "dresden", "objectId": "osm/way/23070996", "partId": "osm/way/23070996/component/907cfec36a00ec0a04a4", "signature": "81899a00"}, {"city": "dresden", "objectId": "osm/way/23070998", "partId": "osm/way/23070998/component/48edddea845e070d04b7", "signature": "0e8b5af9"}, {"city": "dresden", "objectId": "osm/way/216929633", "partId": "osm/way/216929633/component/8a7cb248f42f5bc74b1b", "signature": "71961ce2"}, {"city": "dresden", "objectId": "osm/way/216929636", "partId": "osm/way/216929636/component/2880bf49c8d96aeaccce", "signature": "57be6e89"}, {"city": "dresden", "objectId": "osm/way/216929637", "partId": "osm/way/216929637/component/bcb33a1de2482c4b354b", "signature": "f2e0729d"}, {"city": "dresden", "objectId": "osm/way/266304461", "partId": "osm/way/266304461/component/da2802211c8a49d76762", "signature": "103200d4"}, {"city": "dresden", "objectId": "osm/way/397092399", "partId": "osm/way/397092399/component/678003f85fef796a783c", "signature": "f2633cd5"}, {"city": "dresden", "objectId": "osm/way/397092401", "partId": "osm/way/397092401/component/1ddafa0c5284db9959dd", "signature": "21e9a800"}, {"city": "dresden", "objectId": "osm/way/442165825", "partId": "osm/way/442165825/component/be68f1cf4b1c9141ead5", "signature": "da884803"}, {"city": "dresden", "objectId": "osm/way/442165827", "partId": "osm/way/442165827/component/5ccdf03e48b664ebfaa2", "signature": "6ee2047f"}, {"city": "dresden", "objectId": "osm/way/1197724716", "partId": "osm/way/1197724716/component/d9415aab473d75720b03", "signature": "2c41570a"}, {"city": "dresden", "objectId": "osm/way/216929638", "partId": "osm/way/216929638/component/7963170c843a0a167e30", "signature": "f02b668f"}, {"city": "dresden", "objectId": "osm/way/377887889", "partId": "osm/way/377887889/component/a7ebb0810fdb5e25fc84", "signature": "0f0932ec"}, {"city": "dresden", "objectId": "osm/way/390291805", "partId": "osm/way/390291805/component/e551952dc3be343ae833", "signature": "256222a6"}, {"city": "dresden", "objectId": "osm/way/397092405", "partId": "osm/way/397092405/component/8068988a9882813bd870", "signature": "ea8e7dc4"}, {"city": "dresden", "objectId": "osm/way/442165826", "partId": "osm/way/442165826/component/1b912d35f9e34cd2f8fe", "signature": "1e409e75"}, {"city": "dresden", "objectId": "osm/way/442165828", "partId": "osm/way/442165828/component/25edfcf72d73581c56ee", "signature": "6aeb2940"}, {"city": "dresden", "objectId": "osm/way/23070992", "partId": "osm/way/23070992/component/cd052bb011855833e1a4", "signature": "fb70b6d0"}, {"city": "dresden", "objectId": "osm/way/23070993", "partId": "osm/way/23070993/component/d2287af1edff9ad896ee", "signature": "267a2a08"}, {"city": "dresden", "objectId": "osm/way/23070999", "partId": "osm/way/23070999/component/7323fc5c85e3983dae4b", "signature": "4a3f080c"}, {"city": "dresden", "objectId": "osm/way/23071000", "partId": "osm/way/23071000/component/63b7b396f7a95aaf1e0f", "signature": "ef62425a"}, {"city": "dresden", "objectId": "osm/way/23071004", "partId": "osm/way/23071004/component/7d40604fe6649ae87353", "signature": "a7365a84"}, {"city": "dresden", "objectId": "osm/way/213213185", "partId": "osm/way/213213185/component/d7f473c8c793989a76f1", "signature": "10316d66"}, {"city": "dresden", "objectId": "osm/way/213213187", "partId": "osm/way/213213187/component/74d47353c41cfa17c3d7", "signature": "d92b8528"}, {"city": "dresden", "objectId": "osm/way/216929635", "partId": "osm/way/216929635/component/8da2b8b48a3c17ffac74", "signature": "ed280d26"}, {"city": "dresden", "objectId": "osm/way/23071001", "partId": "osm/way/23071001/component/dfff7502b7577f679fcf", "signature": "eb6146ee"}, {"city": "dresden", "objectId": "osm/way/23071002", "partId": "osm/way/23071002/component/e58c909c523c984e1dab", "signature": "ecd43bd7"}, {"city": "dresden", "objectId": "osm/way/213213188", "partId": "osm/way/213213188/component/89fdb1468129978fd439", "signature": "f4cdbd95"}, {"city": "dresden", "objectId": "osm/way/216929634", "partId": "osm/way/216929634/component/9b5f8a6a81ab24a92af0", "signature": "9875ab5e"}, {"city": "dresden", "objectId": "osm/way/679289348", "partId": "osm/way/679289348/component/11b03dc1f044d5035b49", "signature": "0300a3f1"}];
const SOURCE:Record<string,any>=(await readFrozenTableAsync("2b649639364c11129046f5aad421227b99e4aa8f592d1dccefd14ebedd7bba17","painted/root500/safety/owner-f314-reconstruction.ts",0));
const DISPLAY:Record<string,Batch[]>=(await readFrozenTableAsync("a514fd43c2ecddc0c93e3e97f7d3de017d55043b27e2248d91cc566bf113d40e","painted/root500/safety/owner-f314-reconstruction.ts",0));
export const F314_RECONSTRUCTION_SHA="9e0149f2a079aa0647ba29740bbf1c9268e66fac99b92b6ca15e54e5861c714f";
export const ownerF314Identity=(c:Identity)=>F314_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
type F314RejectedCarrier={objectId:string;partId:string;reasons:string[];loadedCopies:number};
type F314GuardDiagnostics={expected:31;valid:number;missing:{objectId:string;partId:string}[];rejected:F314RejectedCarrier[];wholeCohortReady:boolean;acceptanceRequiresAll31:true};
type F314Stats=OwnerReconstructionStats&{carrierReadiness:F314GuardDiagnostics};
type F314ComponentRecord=OwnerReconstructionStats['components'][number]&{F314CarrierReadiness?:F314GuardDiagnostics};
const validatedF314Displays=new WeakSet<BuildingComponent>();
export function ownerF314Reconstruction(components:BuildingComponent[]){
 const ready:F314GuardDiagnostics={expected:31,valid:0,missing:[],rejected:[],wholeCohortReady:false,acceptanceRequiresAll31:true};
 const stats:F314Stats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[],carrierReadiness:ready};
 const valid=new Set<BuildingComponent>();
 for(const id of F314_IDS){
  const found=components.filter(c=>c.city===id.city&&c.objectId===id.objectId&&c.partId===id.partId);
  if(found.length===0){ready.missing.push({objectId:id.objectId,partId:id.partId});continue;}
  if(found.length!==1){ready.rejected.push({objectId:id.objectId,partId:id.partId,reasons:['duplicate identity'],loadedCopies:found.length});continue;}
  const c=found[0],e=SOURCE[id.partId],reasons:string[]=[];
  if(nativePaintSignature(c)!==id.signature)reasons.push('native geometry signature');
  if(JSON.stringify(c.origin)!==JSON.stringify(e.origin))reasons.push('origin');
  if(JSON.stringify(c.componentGeometry)!==JSON.stringify(e.componentGeometry))reasons.push('componentGeometry');
  if(JSON.stringify(c.sourceFeature)!==JSON.stringify(e.sourceFeature))reasons.push('sourceFeature');
  if(c.batches.length!==e.batches.length)reasons.push('batch count');
  for(let bi=0;bi<c.batches.length;bi++){
   const b=c.batches[bi],eb=e.batches[bi];if(!eb)continue;
   for(const key of ['positions','normals','indices','color']){
    const actual=(b as any)[key],expected=eb[key];
    if(actual?.length!==expected.length||!Array.from(actual as ArrayLike<number>).every((v,j)=>Object.is(v,expected[j])))reasons.push('batch'+bi+'.'+key);
   }
  }
  if(reasons.length){ready.rejected.push({objectId:id.objectId,partId:id.partId,reasons,loadedCopies:1});continue;}
  valid.add(c);
 }
 ready.valid=valid.size;ready.wholeCohortReady=valid.size===31&&ready.missing.length===0&&ready.rejected.length===0;
 if(ready.rejected.length)stats.error='F314 rejected invalid native carrier(s): '+ready.rejected.map(x=>x.partId+': '+x.reasons.join(', ')).join('; ');
 const output=components.map(c=>{
  if(!valid.has(c))return c;
  const batches=DISPLAY[c.partId].map(b=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],frames:[...b.frames],paint:[...b.paint]}));
  const vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);
  stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
  const record:F314ComponentRecord={objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:F314_RECONSTRUCTION_SHA,vertices,triangles,geometryRole:'owner-authorized-reconstruction'};
  // One explicit typed extension survives the aggregate's normal component spread.
  if(stats.components.length===0)record.F314CarrierReadiness=ready;
  stats.components.push(record);
  const displayed:BuildingComponent={...c,batches,displayEstimates:{...c.displayEstimates,F314Exterior:{sourceRetained:true,patchSHA:F314_RECONSTRUCTION_SHA,originalNativeCanopyRetained:true,lowGlassCanopyDisplayPhotoApproximate:true,localFacadeFrames:true,guardRevision:'F314-per-carrier-strict-v1'}}};
  validatedF314Displays.add(displayed);return displayed;
 });
 return{components:output,stats};
}
export function ownerF314BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='dresden'&&ownerF314Identity(c)&&validatedF314Displays.has(c);if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as Batch).frames,offset*5);paint.set((b as Batch).paint,4*offset);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
