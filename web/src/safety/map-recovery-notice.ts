import {validRecoveryControls,type RecoveryControlState} from './map-recovery-controls';
export type RecoverySelection={type:'hex'|'poi';id:string}|{type:'road'|'scene'|'source_poi'|'report';ids:string[]}|null;
export const RECOVERY_TOGGLES=['highlight','hex-toggle','candidate-roads-toggle','community-toggle','poi-toggle'] as const;
export type MapRecoverySnapshot={camera:{center:[number,number];zoom:number;bearing:number};category:string;toggles:Record<string,boolean>;poiKinds:string[];selection:RecoverySelection;controls?:RecoveryControlState;basemap?:string;vehicles?:boolean;anchor?:string};
const MARKER='#cm-map-retry=';
const COPY={
 de:{waiting:'Die Karte ist unterbrochen. Die Wiederherstellung wird versucht. Meldungen, Filter und Statistiken bleiben nutzbar.',failed:'Die Karte konnte nicht wiederhergestellt werden. Meldungen, Filter und Statistiken bleiben nutzbar. Sie können die Karte einmal neu in 2D laden; Position, Zeitraum, Filter und Auswahl bleiben erhalten.',reports:'Gefilterte Meldungen lesen',retry:'Karte in 2D erneut laden',threeDFallback:'Die 3D-Details konnten nicht vollständig geladen werden. Die 2D-Karte wurde beibehalten. Meldungen, Filter und die aktuelle Position bleiben nutzbar.',retryThreeD:'3D erneut versuchen'},
 en:{waiting:'The map is paused while recovery is attempted. Reports, filters and statistics remain available.',failed:'The map could not be restored. Reports, filters and statistics remain available. You can reload the map once in 2D; position, period, filters and selection are retained.',reports:'Read filtered reports',retry:'Retry map in 2D',threeDFallback:'The 3D detail could not finish loading. The 2D map has been kept. Reports, filters and the current position remain available.',retryThreeD:'Retry 3D'},
 zh:{waiting:'地图已暂停，正在尝试恢复。公告、筛选和统计仍可使用。',failed:'地图未能恢复。公告、筛选和统计仍可使用。可主动重新以2D打开地图，保留位置、时段、筛选和选择。',reports:'阅读当前筛选公告',retry:'以2D重新尝试地图',threeDFallback:'3D细节未能完成加载，当前已保留2D地图。公告、筛选和当前位置仍可使用。',retryThreeD:'重试3D'},
};
function validSnapshot(value:unknown):value is MapRecoverySnapshot {
 if(!value||typeof value!=='object')return false;const s=value as MapRecoverySnapshot,c=s.camera;
 if(!c||!Array.isArray(c.center)||c.center.length!==2||!c.center.every(Number.isFinite)||Math.abs(c.center[0])>180||Math.abs(c.center[1])>85||!Number.isFinite(c.zoom)||c.zoom<0||c.zoom>24||!Number.isFinite(c.bearing)||Math.abs(c.bearing)>3600||typeof s.category!=='string'||s.category.length>100||!s.toggles||typeof s.toggles!=='object'||Array.isArray(s.toggles)||RECOVERY_TOGGLES.some(k=>typeof s.toggles[k]!=='boolean')||!Array.isArray(s.poiKinds)||s.poiKinds.length>200||!s.poiKinds.every(k=>typeof k==='string'&&/^[a-z][a-z0-9_]{0,79}$/.test(k))||s.anchor!==undefined&&(typeof s.anchor!=='string'||s.anchor.length>2048))return false;
 if(s.controls!==undefined&&!validRecoveryControls(s.controls)||s.basemap!==undefined&&!['vector','street','aerial','local'].includes(s.basemap)||s.vehicles!==undefined&&typeof s.vehicles!=='boolean')return false;
 const selection=s.selection;if(selection===null)return true;if(!selection||typeof selection!=='object')return false;
 if(selection.type==='poi'||selection.type==='hex')return typeof selection.id==='string'&&selection.id.length<=200;
 return ['road','scene','source_poi','report'].includes(selection.type)&&'ids'in selection&&Array.isArray(selection.ids)&&selection.ids.length<=10000&&selection.ids.every(id=>typeof id==='string'&&id.length<=200);
}
/** Fragment contains only public control values and source IDs; no report bodies.
 * It is never sent to the server and is consumed once before normal startup. */
export function mapRecoveryReloadURL(current:string,month:string,snapshot:MapRecoverySnapshot):string {
 if(!/^\d{4}-(?:all|0[1-9]|1[0-2])$/.test(month)||!validSnapshot(snapshot))throw Error('Invalid map recovery state');
 const url=new URL(current);url.searchParams.set('month',month);url.searchParams.delete('view');
 url.hash=MARKER+encodeURIComponent(JSON.stringify({...snapshot,anchor:url.hash.startsWith(MARKER)?'':url.hash}));return url.href;
}
export function readMapRecoveryURL(current:string):{snapshot:MapRecoverySnapshot;cleanURL:string}|undefined {
 const url=new URL(current);if(!url.hash.startsWith(MARKER)||url.hash.length>2*1024*1024)return undefined;
 try{const snapshot:unknown=JSON.parse(decodeURIComponent(url.hash.slice(MARKER.length)));if(!validSnapshot(snapshot))return undefined;url.hash=snapshot.anchor??'';url.searchParams.delete('view');return{snapshot,cleanURL:url.href};}catch{return undefined;}
}
/** No timers, automatic navigation, map construction or GPU calls. GPU recovery
 * states take precedence over the 3D fallback, which returns once the map is ready.
 * Retrying 3D stays in this page: it never reloads or rewrites the URL. */
export function mountMapRecoveryNotice(options:{host:HTMLElement;locale:'de'|'en'|'zh';onReports:()=>void;onRetry:()=>void;onRetryThreeD?:()=>void}) {
 const c=COPY[options.locale],root=document.createElement('section'),message=document.createElement('p'),reports=document.createElement('button'),retry=document.createElement('button'),retryThreeD=document.createElement('button');
 root.className='map-recovery-notice';root.hidden=true;message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 reports.type=retry.type=retryThreeD.type='button';reports.textContent=c.reports;retry.textContent=c.retry;retryThreeD.textContent=c.retryThreeD;retryThreeD.hidden=true;root.append(message,reports,retry,retryThreeD);options.host.prepend(root);
 let destroyed=false,retrying=false,recovery:'ready'|'waiting'|'failed'='ready',threeDFallback=false;
 const render=()=>{const shown=recovery!=='ready'?recovery:threeDFallback?'three-d-fallback':'ready';root.hidden=shown==='ready';root.dataset.state=shown;message.textContent=shown==='waiting'?c.waiting:shown==='failed'?c.failed:shown==='three-d-fallback'?c.threeDFallback:'';reports.hidden=shown==='three-d-fallback';retry.hidden=shown!=='failed';retryThreeD.hidden=shown!=='three-d-fallback'||!options.onRetryThreeD;};
 reports.onclick=()=>{if(!destroyed)options.onReports();};retry.onclick=()=>{if(destroyed||retrying)return;retrying=true;retry.disabled=true;options.onRetry();};
 retryThreeD.onclick=()=>{if(destroyed||recovery!=='ready'||!threeDFallback)return;threeDFallback=false;render();options.onRetryThreeD?.();};
 return{update(state:'ready'|'waiting'|'failed'){if(destroyed)return;recovery=state;if(state==='ready'){retrying=false;retry.disabled=false;}render();},
  /** Shown only for the newest rolled-back 3D request; any later mode request clears it. */
  setThreeDFallback(active:boolean){if(destroyed)return;threeDFallback=active;render();},
  destroy(){destroyed=true;reports.onclick=retry.onclick=retryThreeD.onclick=null;root.remove();}};
}
