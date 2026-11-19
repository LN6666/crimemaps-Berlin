const sha=/^[a-f0-9]{64}$/;
const tablePath=(id,suffix)=>`/safety/buildings3d/painted-tables/${id.slice(0,2)}/${id}.${suffix}`;

// In v5 the paths of partition parts are derived from their content hashes.
// Whole-table route descriptors and historical profiles keep their wire shape.
function mapParts(profile,convert){
 if(profile?.selectorVersion!=='city-data-v5')return profile;
 return{...profile,routes:profile.routes.map(route=>route.partition?{
  ...route,partition:{...route.partition,parts:route.partition.parts.map(part=>({...part,descriptor:convert(part.descriptor)}))},
 }:route)};
}
export function compactCityDataProfile(profile){
 return mapParts(profile,descriptor=>{
  const {sha256,bytes,transport}=descriptor;
  if(descriptor.path!==tablePath(sha256,'json')||transport&&(transport.path!==tablePath(transport.sha256,'json.gz')||transport.encoding!=='gzip'))throw Error('Invalid content-addressed city part path');
  return transport?[sha256,bytes,transport.sha256,transport.bytes]:[sha256,bytes];
 });
}
export function expandCityDataProfile(profile){
 return mapParts(profile,encoded=>{
  if(!Array.isArray(encoded)||![2,4].includes(encoded.length))throw Error('Invalid compact city part descriptor');
  const [sha256,bytes,transportSHA,transportBytes]=encoded;
  const valid=(id,count)=>typeof id==='string'&&sha.test(id)&&Number.isSafeInteger(count)&&count>0;
  if(!valid(sha256,bytes)||encoded.length===4&&!valid(transportSHA,transportBytes))throw Error('Invalid compact city part identity');
  return{path:tablePath(sha256,'json'),sha256,bytes,...(encoded.length===4?{
   transport:{path:tablePath(transportSHA,'json.gz'),sha256:transportSHA,bytes:transportBytes,encoding:'gzip'},
  }:{})};
 });
}
