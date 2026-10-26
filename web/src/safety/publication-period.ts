const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR = /^\d{4}-all$/;
export const isYearPublicationPeriod = (key:string) => YEAR.test(key);
export const isPublicationPeriod = (key:string) => MONTH.test(key)||YEAR.test(key);
/** A publication/display month is required; an occurrence date or isolated year
 * never assigns an announcement to this selection. */
export function publicationPeriodIncludes(key:string,month:unknown):boolean {
  return typeof month==='string'&&MONTH.test(month)&&(month===key||YEAR.test(key)&&month.startsWith(key.slice(0,4)+'-'));
}
export function savedPublicationMonths(key:string,available:readonly string[]):string[] {
  return [...new Set(available)].filter(month=>publicationPeriodIncludes(key,month)).sort();
}
