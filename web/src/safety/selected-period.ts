import {displayMonth,empty,type Month,type PoliceEvent,type Link,type FC} from './model';
import {DynamicTranslations} from './dynamic-translations';
import type {Manifest,DataClient} from './data';
import type {Locale} from './i18n';
import {savedPublicationMonths} from './publication-period';
export type PeriodSnapshot={month:string;rows:PoliceEvent[];language:DynamicTranslations};
/** Load the selected saved publication months with two abortable workers. Only
 * this current period is retained by the caller; the existing client LRU stays
 * bounded. A failed/aborted request cannot publish a partial year. */
export async function loadSelectedPeriod(key:string,manifest:Manifest,client:DataClient,locale:Locale,signal:AbortSignal,city=manifest.city.toLowerCase()):Promise<{events:PoliceEvent[];month:Month|undefined;snapshots:PeriodSnapshot[];months:string[]}> {
  signal.throwIfAborted();const months=savedPublicationMonths(key,Object.keys(manifest.months));
  if(!months.length)return{events:[],month:undefined,snapshots:[],months};
  const controller=new AbortController(),abort=()=>controller.abort(signal.reason);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  const own=controller.signal,values=new Array<{links:Link[];references:FC['features'];snapshot:PeriodSnapshot}>(months.length);let next=0;
  // End the raw-payload scope before a worker waits for the next month.
  async function loadMonth(month:string){
      const raw=await client.month(month,own);own.throwIfAborted();if(!raw)throw Error('Missing saved publication month');
      const unique=new Map<string,PoliceEvent>();for(const event of raw.events){if(displayMonth(event)!==month)continue;const previous=unique.get(event.id);if(previous&&JSON.stringify(previous)!==JSON.stringify(event))throw Error('Conflicting announcement in publication month');if(!previous)unique.set(event.id,event);}
      const rows=[...unique.values()],language=new DynamicTranslations();
      try{await language.load(rows,manifest,client,month,locale,own,city);}catch(error){if(own.aborted)throw error;await language.load(rows,{...manifest,translations:undefined},client,month,locale,own,city);}
      // Monthly hex grids are unused here: the map owns a separate annual index.
      // Keep only final-period fields so earlier month grids can leave the LRU.
      own.throwIfAborted();return{links:raw.links,references:raw.source_poi_reference_features?.features??[],snapshot:{month,rows,language}};
  }
  try{
    await Promise.all([0,1].map(async()=>{while(next<months.length){own.throwIfAborted();const index=next++;values[index]=await loadMonth(months[index]);}}));
    own.throwIfAborted();const events:PoliceEvent[]=[],ids=new Set<string>(),links:Link[]=[],references:FC['features']=[];
    for(const {links:monthLinks,references:monthReferences,snapshot}of values){const monthIDs=new Set(snapshot.rows.map(event=>event.id));for(const event of snapshot.rows){if(ids.has(event.id))throw Error('Announcement identity appears in several publication months');ids.add(event.id);events.push(event);}links.push(...monthLinks.filter(link=>monthIDs.has(link.event_id)));references.push(...monthReferences);}
    const month:Month={event_ids:[...ids],links,hex:{overview:empty(),detail:empty()},source_poi_reference_features:{type:'FeatureCollection',features:references}};
    return{events,month,snapshots:values.map(value=>value.snapshot),months};
  }catch(error){controller.abort(error);throw error;}finally{signal.removeEventListener('abort',abort);}
}
