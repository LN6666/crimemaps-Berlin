export type ElectionType='federal'|'state'|'municipal';
export type ElectionBallot='first'|'second'|'list'|'candidate';
export type ElectionLocaleText=Record<'de'|'en'|'zh',string>;
export type ElectionSource={name:string;url:string;sha256?:string};
export type ElectionAsset={path:string;sha256:string};
export type ElectionEntry={id:string;type:ElectionType;date:string;year:2025|2026;ballot:ElectionBallot;labels:ElectionLocaleText;coverage:ElectionLocaleText;sources:ElectionSource[];status:'candidate'|'verified'|'unavailable';native_mapping_status:'matched'|'different'|'unverified';geometry?:ElectionAsset;results?:ElectionAsset};
export type ElectoralCatalog={schema_version:1;city:string;elections:ElectionEntry[]};
export type ElectionPartyResult={party_id:string;label:string;count?:number;share?:number;aggregate?:boolean};
export type ElectionResultUnit={id:string;spatial:boolean;kind:'district'|'postal'|'nonspatial';basis:'exact_counts'|'rounded_shares';complete:boolean;valid_votes?:number;parties:ElectionPartyResult[];official_winner?:string;winner_source_url?:string};
export type ElectoralDataset={schema_version:1;city:string;election_id:string;ballot:ElectionBallot;date:string;units:ElectionResultUnit[]};
export type ElectionWinner={party_id:string|null;tied_party_ids:string[];basis:'exact_counts'|'official_winner'|'unresolved';reason?:string};
// Public contract: parsers throw on invalid input, winner never uses rounded shares.
const CITIES=new Set(['berlin','hamburg','munich','cologne','frankfurt','stuttgart','dusseldorf','leipzig','dortmund','essen','bremen','dresden','hannover','nuremberg']);
function fail(message:string):never{throw Error('Invalid electoral data: '+message);}
function obj(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))fail('object');return v as Record<string,unknown>;}
function text(v:unknown,max=200):string{if(typeof v!=='string'||!v.trim()||v.length>max)fail('text');return v;}
function id(v:unknown):string{const s=text(v,100);if(!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(s))fail('id');return s;}
function one<T extends string>(v:unknown,values:readonly T[]):T{if(!values.includes(v as T))fail('enum');return v as T;}
function integer(v:unknown):number{if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0)fail('integer');return v;}
function localized(v:unknown):ElectionLocaleText{const d=obj(v);return {de:text(d.de,3000),en:text(d.en,3000),zh:text(d.zh,3000)};}
function date(v:unknown):string{const s=text(v,10);if(!/^(2025|2026)-\d{2}-\d{2}$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)fail('date');return s;}
function url(v:unknown):string{const s=text(v,2000);let u:URL;try{u=new URL(s);}catch{fail('url');}if(u!.protocol!=='https:'||u!.username||u!.password)fail('url');return s;}
function hash(v:unknown):string{const s=text(v,64);if(!/^[a-f0-9]{64}$/.test(s))fail('hash');return s;}
function asset(v:unknown):ElectionAsset{const d=obj(v),p=text(d.path,300);if(!/^\/safety\/elections\/[A-Za-z0-9][A-Za-z0-9_-]*\.(json|geojson)$/.test(p)||p.includes('//')||p.split('/').some(x=>x==='.'||x==='..'))fail('local path');return {path:p,sha256:hash(d.sha256)};}
function bounded(v:unknown,max:number):unknown[]{if(!Array.isArray(v)||v.length>max)fail('array bound');return v;}
function city(v:unknown,expected:string):string{if(v!==expected||!CITIES.has(expected))fail('city');return expected;}
export function parseElectoralCatalog(input:unknown,expectedCity:string):ElectoralCatalog{
 const d=obj(input);if(d.schema_version!==1)fail('schema');const c=city(d.city,expectedCity),seen=new Set<string>();
 const elections=bounded(d.elections,24).map(v=>{const x=obj(v),key=id(x.id);if(seen.has(key))fail('duplicate election');seen.add(key);const when=date(x.date),year=integer(x.year);if(year!==Number(when.slice(0,4)))fail('year/date');
 const entry:ElectionEntry={id:key,type:one(x.type,['federal','state','municipal']),date:when,year:year as 2025|2026,ballot:one(x.ballot,['first','second','list','candidate']),labels:localized(x.labels),coverage:localized(x.coverage),sources:bounded(x.sources,12).map(v=>{const s=obj(v);return {name:text(s.name),url:url(s.url),...(s.sha256!==undefined?{sha256:hash(s.sha256)}:{})};}),status:one(x.status,['candidate','verified','unavailable']),native_mapping_status:one(x.native_mapping_status,['matched','different','unverified'])};
 if(!entry.sources.length)fail('missing provenance');if(x.geometry!==undefined)entry.geometry=asset(x.geometry);if(x.results!==undefined)entry.results=asset(x.results);
 if(entry.status==='verified'&&(!entry.geometry||!entry.results))fail('verified assets missing');return entry;});return {schema_version:1,city:c,elections};
}
export function canRenderElection(entry:ElectionEntry):boolean{return entry.status==='verified'&&!!entry.geometry&&!!entry.results;}
export function defaultElection(catalog:ElectoralCatalog):ElectionEntry|undefined{return catalog.elections.find(e=>e.year===2025&&e.type==='federal'&&e.ballot==='second')??undefined;}
function aggregateParty(p:ElectionPartyResult):boolean{return p.aggregate===true||/^(sonstige|sonstige parteien|others?|other parties|其他|其它)$/i.test(p.label.trim())||/^(sonstige|others?|other-parties)$/i.test(p.party_id);}
export function electionWinner(unit:ElectionResultUnit):ElectionWinner{
 if(unit.official_winner&&unit.winner_source_url)return {party_id:unit.official_winner,tied_party_ids:[],basis:'official_winner'};
 if(unit.basis!=='exact_counts'||!unit.complete||unit.valid_votes===undefined||unit.valid_votes===0||unit.parties.some(p=>p.count===undefined||aggregateParty(p)))return {party_id:null,tied_party_ids:[],basis:'unresolved',reason:'Complete exact party counts or explicit official winner required'};
 const sum=unit.parties.reduce((n,p)=>n+p.count!,0);if(sum!==unit.valid_votes)return {party_id:null,tied_party_ids:[],basis:'unresolved',reason:'Party counts do not sum to valid votes'};
 const max=Math.max(...unit.parties.map(p=>p.count!)),w=unit.parties.filter(p=>p.count===max).map(p=>p.party_id);return {party_id:w.length===1?w[0]:null,tied_party_ids:w.length>1?w:[],basis:'exact_counts'};
}
export function parseElectoralDataset(input:unknown,entry:ElectionEntry,expectedCity:string):ElectoralDataset{
 const d=obj(input);if(d.schema_version!==1)fail('schema');const c=city(d.city,expectedCity);if(d.election_id!==entry.id||d.ballot!==entry.ballot||d.date!==entry.date)fail('election/ballot/date mismatch');const seen=new Set<string>();
 const units=bounded(d.units,20000).map(v=>{const x=obj(v),key=id(x.id);if(seen.has(key))fail('duplicate unit');seen.add(key);const kind=one(x.kind,['district','postal','nonspatial']);if(typeof x.spatial!=='boolean'||typeof x.complete!=='boolean')fail('boolean');if(kind!=='district'&&x.spatial)fail('nonspatial postal allocation');const basis=one(x.basis,['exact_counts','rounded_shares']),partyIds=new Set<string>();
 const parties=bounded(x.parties,100).map(v=>{const p=obj(v),key=id(p.party_id);if(partyIds.has(key))fail('duplicate party');partyIds.add(key);const out:ElectionPartyResult={party_id:key,label:text(p.label)};if(p.aggregate!==undefined){if(typeof p.aggregate!=='boolean')fail('aggregate');out.aggregate=p.aggregate;}
 if(basis==='exact_counts'){out.count=integer(p.count);if(p.share!==undefined)fail('mixed count/share basis');}else{if(typeof p.share!=='number'||!Number.isFinite(p.share)||p.share<0||p.share>100||p.count!==undefined)fail('share');out.share=p.share;}return out;});if(!parties.length)fail('empty party results');
 const unit:ElectionResultUnit={id:key,spatial:x.spatial,kind,basis,complete:x.complete,parties};if(x.valid_votes!==undefined)unit.valid_votes=integer(x.valid_votes);
 if(x.official_winner!==undefined){unit.official_winner=id(x.official_winner);unit.winner_source_url=url(x.winner_source_url);if(!partyIds.has(unit.official_winner)||aggregateParty(parties.find(p=>p.party_id===unit.official_winner)!))fail('official winner party');}else if(x.winner_source_url!==undefined)fail('orphan winner source');
 if(basis==='exact_counts'&&unit.complete){if(unit.valid_votes===undefined)fail('missing valid votes');const sum=parties.reduce((n,p)=>n+p.count!,0);if(!Number.isSafeInteger(sum)||sum!==unit.valid_votes)fail('complete count sum');}
 if(unit.official_winner&&basis==='exact_counts'&&unit.complete&&!parties.some(aggregateParty)){const derived=electionWinner({...unit,official_winner:undefined,winner_source_url:undefined});if(derived.party_id&&derived.party_id!==unit.official_winner)fail('official winner conflicts with exact counts');if(derived.tied_party_ids.length&&!derived.tied_party_ids.includes(unit.official_winner))fail('winner outside tie');}
 return unit;});return {schema_version:1,city:c,election_id:entry.id,ballot:entry.ballot,date:entry.date,units};
}
