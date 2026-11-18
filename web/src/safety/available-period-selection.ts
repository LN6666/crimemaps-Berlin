import {savedPublicationMonths} from './publication-period';

export type AvailablePeriodSelection =
  | {available:true;year:string;month:string;key:string;months:string[]}
  | {available:false;year:string;month:undefined;key:undefined;months:[]};

/** Select only saved publication packages. UI months are ascending two-digit
 * suffixes; the latest saved month is the same default used at page startup.
 * Preserve an explicit all-year choice, but never introduce one as a fallback. */
export function selectAvailablePeriod(
  available:Readonly<Record<string,unknown>>,
  year:string,
  preferredMonth:string,
  {allowAll=true}:{allowAll?:boolean}={},
):AvailablePeriodSelection {
  const months=savedPublicationMonths(`${year}-all`,Object.keys(available)).map(key=>key.slice(5));
  if(!months.length)return{available:false,year,month:undefined,key:undefined,months:[]};
  const month=preferredMonth==='all'&&allowAll ? 'all'
    : months.includes(preferredMonth) ? preferredMonth : months[months.length-1]!;
  return{available:true,year,month,key:`${year}-${month}`,months};
}
