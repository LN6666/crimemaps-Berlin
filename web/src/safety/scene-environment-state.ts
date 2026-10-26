import {sceneSolarLight} from './scene-solar-light';
import type {SceneQuality} from './scene-environment-quality';
export type SceneEnvironmentState = {
  instantISO: string;
  sunlight: boolean;
  shadows: boolean;
  motion: boolean;
  quality: SceneQuality;
};
export function defaultSceneEnvironment(mobile = false): SceneEnvironmentState {
  return {instantISO: sceneBerlinNoonInstant(), sunlight: true, shadows: true, motion: true, quality: mobile ? 'economy' : 'balanced'};
}
/** Europe/Berlin calendar day at 12:00. DST changes happen before noon. */
export function sceneBerlinNoonInstant(now = new Date()): string {
  if(!Number.isFinite(now.getTime()))throw Error('Invalid scene calendar date');
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const field=(name:string)=>Number(parts.find(p=>p.type===name)?.value),year=field('year'),month=field('month'),day=field('day');
  const lastSunday=(m:number)=>{const d=new Date(Date.UTC(year,m,0));return d.getUTCDate()-d.getUTCDay();};
  const summer=month>3&&month<10||month===3&&day>=lastSunday(3)||month===10&&day<lastSunday(10);
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T12:00:00${summer?'+02:00':'+01:00'}`;
}
export const defaultSceneEnvironmentState=defaultSceneEnvironment;
/** Reject the whole update before applying any field. */
export function checkedSceneEnvironment(value: SceneEnvironmentState): SceneEnvironmentState {
  if (!value || !['economy','balanced','detail'].includes(value.quality) ||
      ![value.sunlight,value.shadows,value.motion].every(v => typeof v === 'boolean')) throw Error('Invalid scene environment state');
  const instant = sceneSolarLight(0, 0, value.instantISO).instantISO;
  return {instantISO: instant, sunlight: value.sunlight, shadows: value.shadows, motion: value.motion, quality: value.quality};
}
