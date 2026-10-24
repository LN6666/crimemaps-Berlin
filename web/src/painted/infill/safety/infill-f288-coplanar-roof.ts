import type { BuildingComponent } from './building-mesh-renderer';
import { nativePaintSignature } from './f288-original-signature';
import { INFILL_F288_COPLANAR_ROOF_DATA as DATA } from './infill-f288-coplanar-roof-data';
type LeafReceipt = (c: BuildingComponent) => string | undefined;
/** Only remove the proven 7.5 m DISPLAY roof intersections of indoor shops/lifts.
 * Run after original F288 derived platform reconstruction, before material preparation.
 * SOURCE objects, footprints, walls and uncovered roof remainders are retained.
 */
export function infillF288ClipCoplanarFacilityRoofs(
  draw: BuildingComponent[], source: readonly BuildingComponent[], leaf?: LeafReceipt,
): BuildingComponent[] {
  const platformPins = [{"objectId":"osm/way/259200330","partId":"osm/way/259200330/component/fb000cce9f32b0888a3b/owner-open-platform729","geometrySignature":"ee148f5e"},{"objectId":"osm/way/259200333","partId":"osm/way/259200333/component/944571d088b205dac6d6/owner-open-platform729","geometrySignature":"06f6736c"},{"objectId":"osm/way/259200339","partId":"osm/way/259200339/component/24554906a91aa55acda0/owner-open-platform729","geometrySignature":"9abec104"},{"objectId":"osm/way/259200344","partId":"osm/way/259200344/component/6c2484dcd819c2401ee5/owner-open-platform729","geometrySignature":"f498bc42"},{"objectId":"osm/way/259226807","partId":"osm/way/259226807/component/44b48ba7aca188606f68/owner-open-platform729","geometrySignature":"dd706ee6"},{"objectId":"osm/way/464799103","partId":"osm/way/464799103/component/60382bc08a12371b5017/owner-open-platform729","geometrySignature":"5340d4c2"}];
  // Require each original derived canopy geometry, not merely an ID-shaped placeholder.
  const complete = platformPins.every(p => { const matches = draw.filter(c => c.city === "essen" && c.objectId === p.objectId && c.partId === p.partId); return matches.length === 1 && nativePaintSignature(matches[0]) === p.geometrySignature; });
  if (!complete) return draw;
  return draw.map(c => {
    if (c.city !== 'essen') return c;
    const pin = DATA.find(p => p.objectId === c.objectId && p.partId === c.partId);
    if (!pin) return c;
    const originals = source.filter(n => n.city === 'essen' && n.objectId === pin.objectId && n.partId === pin.partId);
    if (originals.length !== 1) return c;
    const n = originals[0];
    if (JSON.stringify(n.origin) !== JSON.stringify(pin.origin) || nativePaintSignature(n) !== pin.signature || leaf?.(n) !== pin.leafSHA) return c;
    // Protect later explicit reconstructions: this operation expects the unmodified native DISPLAY.
    if (nativePaintSignature(c) !== pin.signature) return c;
    const batches = c.batches.map((b, bi) => {
      const r = pin.replacements.find(x => x.batch === bi);
      return r ? { ...b, positions: new Float32Array(r.positions), normals: new Float32Array(r.normals), indices: new Uint32Array(r.indices) } : b;
    });
    return { ...c, batches, sourceFeature: n.sourceFeature, displayEstimates: { ...c.displayEstimates, infillF288CoplanarFacilityRoof: { displayOnly: true, removedOnlyProvenCanopyIntersections: true, retainedWallsAndUncoveredRoof: true } } };
  });
}
