// Pure projection for the explicit demand metadata request. No asset I/O.
import {projectBremenIdentityResource} from './bremen-identity-resource-projections.mjs';

export const BREMEN_DEMAND_RESOURCE_ALIASES=Object.freeze([
  'boundary','repairs','churches','ws','flemings','radstation','glocke','wasserturm',
  'oldtown','edgefill','karstadt','coverage','extra4','f260','kunsthalle','hbf','wsBack','AG70',
  'repairSnapshots','churchSnapshots','marketSnapshots','extraSnapshots',
]);
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const list=(value,name)=>{
  if(!Array.isArray(value))throw new TypeError('Expected demand metadata array: '+name);
  return value;
};
function fields(value,names){
  if(!value||typeof value!=='object')throw new TypeError('Expected demand metadata record');
  return Object.fromEntries(names.filter(name=>own(value,name)).map(name=>[name,value[name]]));
}
const pair=value=>fields(value,['objectId','partId']);
const pin=value=>fields(value,['objectId','partId','sourceLeafSHA256']);
function pinnedRequired(model){return list(model.requiredNativeGroup,'requiredNativeGroup').map(pin);}
function displayPairs(model){return list(model.displays,'displays').map(pair);}
function optionalScalar(output,value,name){
  if(!own(value,name))return;
  const scalar=value[name];
  if(scalar!==null&&typeof scalar==='object')throw new TypeError('Non-scalar demand metadata: '+name);
  output[name]=scalar;
}

/** Retain prior identity fields plus only the newly approved scalar relations. */
export function projectBremenDemandResource(alias,value){
  if(!BREMEN_DEMAND_RESOURCE_ALIASES.includes(alias))throw new RangeError('Unknown Bremen demand alias: '+alias);
  if(alias.endsWith('Snapshots')){
    return list(value,alias).map((row,rowIndex)=>({...pin(row),rowIndex}));
  }
  if(alias==='AG70'){
    return{models:list(value.models,'models').map(model=>({
      ...fields(model,['targetId']),requiredNativeGroup:pinnedRequired(model),displays:displayPairs(model),
    }))};
  }
  const output=projectBremenIdentityResource(alias,value);
  switch(alias){
    case 'boundary':case 'repairs':case 'churches':case 'karstadt':
      value.models.forEach((model,index)=>{
        Object.assign(output.models[index],fields(model,['targetId']),{
          requiredNativeGroup:pinnedRequired(model),displays:displayPairs(model),
        });
        if(alias==='boundary')output.models[index].nativeSourceComponents=list(model.nativeSourceComponents,'nativeSourceComponents').map(pair);
      });
      break;
    case 'ws':
      value.groups.forEach((group,index)=>{
        Object.assign(output.groups[index],fields(group,['id']),{sourceCarrier:pair(group.sourceCarrier)});
        group.models.forEach((model,at)=>{
          Object.assign(output.groups[index].models[at].identity,fields(model.identity,['leafSHA256']));
          output.groups[index].models[at].hasSource=Boolean(model.source);
        });
      });
      break;
    case 'flemings':case 'radstation':case 'glocke':case 'wasserturm':
      value.models.forEach((model,index)=>{
        Object.assign(output.models[index].identity,fields(model.identity,['leafSHA256']));
        output.models[index].hasSource=Boolean(model.source);
      });
      break;
    case 'edgefill':case 'coverage':
      value.groups.forEach((group,index)=>{
        if(alias==='coverage')Object.assign(output.groups[index],fields(group,['key']));
        group.models.forEach((model,at)=>{
          Object.assign(output.groups[index].models[at].identity,fields(model.identity,['leafSHA256']));
          output.groups[index].models[at].hasSource=Boolean(model.source);
        });
      });
      break;
    case 'oldtown':
      optionalScalar(output,value,'sourceAuthoritySHA256');
      value.models.forEach((model,index)=>{
        Object.assign(output.models[index],fields(model,['targetId']));
        optionalScalar(output.models[index],model,'geometryReadyForPreview');
        if(own(model.sourceBinding,'exactNativeComponents')){
          output.models[index].sourceBinding.exactNativeComponents=list(model.sourceBinding.exactNativeComponents,'exactNativeComponents').map(pin);
        }
      });
      break;
    case 'extra4':
      optionalScalar(output,value,'sourceAuthoritySHA256');
      value.models.forEach((model,index)=>Object.assign(output.models[index],fields(model,['targetId'])));
      break;
    case 'hbf':case 'wsBack':
      output.models=list(value.models,'models').map(model=>({identity:pair(model.identity)}));
      break;
    case 'f260':
      value.models.forEach((model,index)=>{output.models[index].sourceCarrier=pair(model.sourceCarrier);});
      break;
    case 'kunsthalle':
      output.requiredNativeGroup=list(value.requiredNativeGroup,'requiredNativeGroup').map(pair);
      output.metadataPatches=list(value.metadataPatches,'metadataPatches').map(pair);
      break;
  }
  return output;
}
