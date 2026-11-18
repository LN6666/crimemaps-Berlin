// Consumes verified lightweight metadata supplied by the caller. No asset I/O.
import {createHash} from 'node:crypto';

const key=x=>x.objectId+'|'+x.partId;
const pair=x=>({objectId:x.objectId,partId:x.partId});
const need=(condition,message)=>{if(!condition)throw Error('Bremen certificate ledger: '+message);};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const moduleNames={wasserturm:'wasserturm70-runtime',repairs:'bremen-oldtown-repairs-runtime',churches:'bremen-churches70-runtime',ws:'bremen-ws70-runtime',flemings:'flemings70-runtime',radstation:'radstation70-runtime',oldtown:'bremen-oldtown70-runtime',edgefill:'edgefill70-runtime',AG70:'bremen-ag70-runtime',karstadt:'bremen-karstadt70-runtime',glocke:'glocke-detail-runtime',coverage:'edge-coverage-runtime',boundary:'bremen-boundary70-runtime'};

/** A test-only count override produces an index production explicitly rejects. */
export function buildBremenCertificateLedger({values,resources,sourceReceiptSHA256,testOnlyExpectedCounts}){
  need(/^[a-f0-9]{64}$/.test(sourceReceiptSHA256),'missing verified source receipt SHA');
  const expected=testOnlyExpectedCounts??{held:132,parents:19};
  const groups=[],held=[],parents=[],snapshotWinners=new Map();
  const snapshotAliases=['repairSnapshots','churchSnapshots','marketSnapshots','extraSnapshots'];
  for(const [priority,alias]of snapshotAliases.entries()){
    need(Array.isArray(values[alias]),'missing '+alias);
    for(const [index,row]of values[alias].entries()){
      need(row.rowIndex===index,'snapshot ordinal mismatch '+alias);
      if(!snapshotWinners.has(key(row)))snapshotWinners.set(key(row),{identity:pair(row),sourceLeafSHA256:row.sourceLeafSHA256,alias,rowIndex:index,priority});
    }
  }
  const resource=alias=>{const value=resources[alias]?.ref??resources[alias];need(value?.canonicalSHA256&&value.file&&value.codec==='json','missing exact ref '+alias);return value;};
  const source=identity=>snapshotWinners.get(key(identity));
  const leafModel=(row,sourceSlot,leaf)=>({identity:pair(row),leafSHA256:leaf,hasSource:!!sourceSlot,sourceSlot});
  function add(alias,index,name,models,carrier,{nativeAbsent=false,replace=false}={}){
    need(carrier&&typeof name==='string','missing group parent/key '+alias+':'+index);
    const parent=models.find(m=>key(m.identity)===key(carrier));
    if(!nativeAbsent)need(parent,'parent is not a group member '+alias+':'+index);
    const children=nativeAbsent?models:models.filter(m=>key(m.identity)!==key(carrier));
    if(!children.length)return;
    const group={key:alias+':'+index,alias,index,modelIndex:typeof index==='number'?index:alias==='coverage'?Number(index.split('/')[0]):undefined,name,moduleKeys:[moduleNames[alias]],kind:'core',candidates:models.map(m=>pair(m.identity)),held:[],parents:[],snapshotSlots:[],resourceAliases:[alias]};
    if(!group.candidates.some(c=>key(c)===key(carrier)))group.candidates.push(pair(carrier));
    const pr={identity:pair(carrier),parentSourceAbsent:nativeAbsent,groupKey:group.key};
    group.parents.push(pr);
    if(replace){const previous=parents.findIndex(r=>key(r.identity)===key(carrier));if(previous<0)parents.push(pr);else parents[previous]=pr;}else parents.push(pr);
    for(const model of children){
      need(model.hasSource&&model.leafSHA256,'missing SOURCE/leaf '+key(model.identity));
      const row={identity:pair(model.identity),parent:pair(carrier),leafSHA256:model.leafSHA256,parentSourceAbsent:nativeAbsent,groupKey:group.key};
      group.held.push(row);
      if(replace){const previous=held.findIndex(r=>key(r.identity)===key(row.identity));if(previous<0)held.push(row);else held[previous]=row;}else held.push(row);
    }
    for(const model of models)if(model.sourceSlot&&!group.snapshotSlots.some(s=>s.alias===model.sourceSlot.alias&&s.rowIndex===model.sourceSlot.rowIndex))group.snapshotSlots.push(model.sourceSlot);
    group.snapshotSlots.sort((a,b)=>a.priority-b.priority||a.rowIndex-b.rowIndex);
    group.resourceAliases.push(...new Set(group.snapshotSlots.map(s=>s.alias)));
    groups.push(group);
  }
  const direct=models=>models.map(m=>({identity:pair(m.identity),leafSHA256:m.identity.leafSHA256,hasSource:m.hasSource}));
  const required=(model,alias)=>model.requiredNativeGroup.map(row=>{
    const slot=source(row),pin=alias==='oldtown'?model.sourceBinding.exactNativeComponents.find(p=>key(p)===key(row))?.sourceLeafSHA256:alias==='churches'?row.sourceLeafSHA256??slot?.sourceLeafSHA256:row.sourceLeafSHA256;
    return leafModel(row,slot,pin);
  });
  const v=alias=>{need(values[alias],'missing '+alias);return values[alias];};
  add('wasserturm','root','bremen-wasserturm70',direct(v('wasserturm').models),v('wasserturm').sourceCarrier);
  for(const alias of ['repairs','churches'])for(const[index,m]of v(alias).models.entries())add(alias,index,m.targetId,required(m,alias),m.displays[0]);
  for(const[index,g]of v('ws').groups.entries())add('ws',index,g.id,direct(g.models),g.sourceCarrier);
  for(const alias of ['flemings','radstation'])add(alias,'root','bremen-'+alias+'70',direct(v(alias).models),v(alias).sourceCarrier);
  for(const[index,m]of v('oldtown').models.entries()){
    if(!m.requiredNativeGroup.some(r=>!m.displays.some(d=>key(r)===key(d))))continue;
    add('oldtown',index,m.targetId,required(m,'oldtown'),m.displays[0],{nativeAbsent:!!m.sourceBinding.nativeParentAbsent});
  }
  for(const[index,g]of v('edgefill').groups.entries())if(g.models.some(m=>!m.display.length))add('edgefill',index,g.key,direct(g.models),g.models.find(m=>m.display.length)?.identity);
  for(const alias of ['AG70','karstadt'])for(const[index,m]of v(alias).models.entries())add(alias,index,m.targetId,required(m,alias),m.displays[0]);
  add('glocke','root','glocke-detail',direct(v('glocke').models),v('glocke').sourceCarrier);
  for(const[index,g]of v('coverage').groups.entries()){
    for(const child of g.models.filter(m=>!m.display.length)){
      const parent=g.models.find(m=>key(m.identity)===key(child.sourceCarrier));need(parent,'coverage parent missing');
      // One group per covered parent keeps independent parents in a raw group separate.
      const existing=groups.find(x=>x.key==='coverage:'+index+'/'+key(parent.identity));
      const children=g.models.filter(m=>!m.display.length&&key(m.sourceCarrier)===key(parent.identity));
      if(!existing)add('coverage',index+'/'+key(parent.identity),g.key,direct([parent,...children]),parent.identity,{replace:true});
    }
  }
  for(const[index,m]of v('boundary').models.entries()){
    const models=m.requiredNativeGroup.map(row=>({identity:pair(row),leafSHA256:row.sourceLeafSHA256,hasSource:m.nativeSourceComponents.some(s=>key(s)===key(row))}));
    add('boundary',index,m.targetId,models,m.displays[0]);
  }
  need(held.length===expected.held&&parents.length===expected.parents,'full graph count mismatch');
  need(new Set(held.map(r=>key(r.identity))).size===held.length,'duplicate held identity');
  need(new Set(parents.map(r=>key(r.identity))).size===parents.length,'duplicate parent identity');
  const owner=new Map([...held,...parents].map(r=>[key(r.identity),r.groupKey]));
  for(const group of groups){
    group.dependencies=[...new Set([...group.held,...group.parents].map(r=>owner.get(key(r.identity))).filter(k=>k&&k!==group.key))];
    group.resources=group.resourceAliases.map(resource);
  }
  for(const[alias,module]of [['lloyd','lloyd-front-runtime'],['market','market-cap-runtime'],['organisten','organisten-runtime'],['kuester','glocke-kuester-runtime']]){
    const candidates=v(alias).models.map(m=>pair(m.identity));
    const aliases=alias==='market'&&!v('oldtown').sourceAuthoritySHA256?[alias,'oldtown']:[alias];
    groups.push({key:'delegate:'+alias,alias,index:'root',name:module,moduleKeys:[module],kind:'delegate',candidates,held:[],parents:[],snapshotSlots:[],resourceAliases:aliases,resources:aliases.map(resource),dependencies:[]});
  }
  function availability(name,alias,moduleKeys,candidates,resourceAliases,index='root'){
    if(!candidates.length)return;
    groups.push({key:'availability:'+name,alias,index,modelIndex:typeof index==='number'?index:undefined,name,moduleKeys,kind:'availability',candidates:candidates.map(pair),held:[],parents:[],snapshotSlots:[],resourceAliases,resources:resourceAliases.map(resource),dependencies:[]});
  }
  function optional(alias){if(!values[alias]){need(!!testOnlyExpectedCounts,'missing '+alias);return;}return values[alias];}
  for(const alias of ['edgefill','coverage'])for(const[index,g]of v(alias).groups.entries())availability(alias+':'+index,alias,[moduleNames[alias]],g.models.map(m=>m.identity),[alias],index);
  const teerhof=optional('teerhof');if(teerhof)availability('teerhof','teerhof',['bremen-teerhof-detail-runtime','teerhofDetailSourceBoundGroupCertificate'],[teerhof.identity],['edgefill','teerhof']);
  const euro=optional('euroGable');if(euro)for(const[index,g]of euro.groups.entries())availability('euroGable:'+index,'euroGable',['euro-gable-runtime','euroGableSourceBoundGroupCertificates'],g.models.map(m=>m.identity),['euroGable'],index);
  const stephani=optional('stephani');if(stephani)for(const[index,g]of stephani.groups.entries())availability('officialOpenings:'+index,'openings',['official-openings-runtime','stephani-row-runtime'],g.models.map(m=>m.identity),['stephani','openings'],index);
  const hbf=optional('hbf');if(hbf)availability('hbf','hbf',['hbf-court-runtime'],[hbf.sourceCarrier,...hbf.models.map(m=>m.identity)],['hbf']);
  const f260=optional('f260');if(f260){availability('f260','f260',['f260-accepted-restore-runtime','bremen-finite-derived-display'],f260.models.flatMap(m=>[m.profile,m.sourceCarrier]),['f260']);}
  const kunsthalle=optional('kunsthalle');if(kunsthalle)availability('kunsthalle','kunsthalle',['bremen-finite-derived-display','kunsthalle70-runtime'],[kunsthalle.derivedIdentity],['kunsthalle']);
  for(const[index,m]of v('oldtown').models.entries())if(m.sourceBinding.nativeParentAbsent)availability('oldtown-derived:'+index,'oldtown',['bremen-finite-derived-display','bremen-oldtown70-runtime'],m.displays,['oldtown'],index);
  return{schemaVersion:1,proof:{productionEligible:!testOnlyExpectedCounts,sourceReceiptSHA256,held:held.length,parents:parents.length,graphSHA256:hash({held,parents})},groups,held,parents,marketAuthoritySHA256:values.oldtown.sourceAuthoritySHA256};
}
