/** Display policy only: frozen source catalogs, scope membership and geometry
 * keep their original values. Actual kinds, rather than filter scopes, own color. */
const colors:Readonly<Record<string,string>>={
  airport:'#78a6c8',
  attraction:'#b2182b',
  bar:'#e6ab02',
  cafe:'#6f3d22',
  fast_food:'#ef59b7',
  hotel:'#00846b',
  marketplace:'#9b9f00',
  nightclub:'#7131b9',
  park:'#238b3b',
  parking:'#a28ad3',
  restaurant:'#ed5b24',
  shop:'#0aa9d3',
  station:'#2469e8',
  context:'#777f87',
};
const fallback='#64748b';

/** Solid centers retain the category hue and brightness, independently of the
 * .25-alpha range; multiplying every RGB channel hid distinctions.
 * Unknown kinds retain a supplied catalog color, with a neutral missing-color
 * fallback and the same neutral center fallback for legacy non-hex colors. */
export function resolvePoiDisplayStyle(kind:string,catalogColor?:string):{color:string;centerColor:string}{
  const color=Object.hasOwn(colors,kind)?colors[kind]:catalogColor??fallback;
  return{color,centerColor:/^#[0-9a-f]{6}$/i.test(color)?color:fallback};
}
