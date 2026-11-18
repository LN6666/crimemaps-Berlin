import {familyPaintRecipe} from '../../../safety/family-paint-program';

const SHARED_SOURCE_KEYS=new Set(['bremen-churches70','bremen-oldtown70','bremen-market-cap','bremen-weserburg-stephani70','bremen-boundary70','bremen-stephani-rows','bremen-official-openings','bremen-edgefill70',
 // These additional source partitions are visible in the central zoom-14.5
 // scene. Their individual family attributes and source guards still decide
 // the actual material; sibling draws can use the same conservative program.
 'bremen-karstadt70','bremen-oldtown-repairs','bremen-organisten-final']);
// Only the fixed source whitelist and 32 integral buckets can enter this table:
// at most 11 * 32 canonical strings, never caller keys, geometry or resources.
// Sharing the value avoids allocating/serializing 64 numbers on every draw.
const SHARED_RECIPES=new Map<string,Map<number,string>>();

/** A conservative specialization set for the existing Bremen source partition.
 * Draw attributes and ranges are unchanged. Including at most 64 adjacent integral
 * families lets those draws share one executable; a kept branch still tests the
 * original family attribute. Overrides and ambiguous decoded sets stay exact.
 * The bounded string table changes no quality setting or compiler concurrency. */
export function sharedBremenPaintRecipeKey(key:string):string{
 const recipe=familyPaintRecipe(key),family=recipe.families[0];
 if(!SHARED_SOURCE_KEYS.has(recipe.sourceKey)||recipe.families.length!==1||!Number.isInteger(family)||family<46000||family>=48000)return key;
 const first=Math.floor(family/64)*64;
 let recipes=SHARED_RECIPES.get(recipe.sourceKey);
 const existing=recipes?.get(first);if(existing!==undefined)return existing;
 // This generated range is already unique and ascending, so serialize the
 // canonical recipe directly without allocating a Set and sorting every draw.
 const value=JSON.stringify([recipe.sourceKey,Array.from({length:64},(_,index)=>first+index)]);
 if(!recipes){recipes=new Map();SHARED_RECIPES.set(recipe.sourceKey,recipes);}
 recipes.set(first,value);return value;
}
