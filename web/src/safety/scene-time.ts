const zone = 'Europe/Berlin';
const formatter = new Intl.DateTimeFormat('en-GB', {timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
function parts(value: number) {
  const p = Object.fromEntries(formatter.formatToParts(value).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return {date:`${p.year}-${p.month}-${p.day}`, time:`${p.hour}:${p.minute}`};
}
/** A map's sun clock uses German civil time, independently of the visitor's zone.
 * Reject missing spring-clock times. An autumn repeated time selects its first
 * occurrence and the UI displays its UTC offset, keeping the choice explicit. */
export function berlinLocalInstant(date: string, time: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return;
  const [y,m,d] = date.split('-').map(Number), [h,min] = time.split(':').map(Number);
  if(y<2000||y>2100||m<1||m>12||d<1||d>31||h>23||min>59)return;
  const local = Date.UTC(y,m-1,d,h,min);
  const check = new Date(local);
  if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d)return;
  for(const offset of [120,60]) {
    const candidate=local-offset*60000,p=parts(candidate);
    if(p.date===date&&p.time===time)return new Date(candidate).toISOString();
  }
}
export function berlinClock(instantISO:string) {
  const value=Date.parse(instantISO);
  if(!Number.isFinite(value))throw Error('Invalid scene date');
  const p=parts(value),[y,m,d]=p.date.split('-').map(Number),[h,min]=p.time.split(':').map(Number);
  return {...p, offsetMinutes:Math.round((Date.UTC(y,m-1,d,h,min)-Math.floor(value/60000)*60000)/60000), zone};
}
export function berlinNoon(now = new Date()) {
  const date=parts(now.getTime()).date;
  return berlinLocalInstant(date,'12:00')!;
}
/** The civil day has 23 or 25 hours at a clock change, otherwise 24. */
export function berlinDayRange(date:string) {
  const start=berlinLocalInstant(date,'00:00');
  if(!start)throw Error('Invalid scene calendar day');
  const startMs=Date.parse(start);
  for(const hours of [23,24,25]){const endMs=startMs+hours*3600000,p=parts(endMs);if(p.date!==date&&p.time==='00:00')return{startMs,endMs,durationMs:endMs-startMs};}
  throw Error('Unable to resolve German civil day');
}
