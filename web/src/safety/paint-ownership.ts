import finalBatch from './final-batch-ownership.json';
import hc70 from '../painted/delegated500/safety/supplement-hc70-ownership.json';
import supplement from '../painted/delegated500/safety/supplement-ownership-batch1.json';
import repairedSupplement from '../painted/tier300/safety/supplement-tier300-ownership.json';
import orangerieSupplement from '../painted/tier300/safety/supplement-orangerie-ownership.json';
import tvBaseSupplement from '../painted/root500/safety/supplement-tv-base-ownership.json';
import registry from './paint-ownership-registry.json';
import {paintFamily} from '../painted/church/safety/facade-paint-frame';
import type {BuildingComponent} from './building-mesh-renderer';

export type PaintProvider = 'root500' | 'delegated500' | 'tier300' | 'city' | 'church' | 'infill' | 'bremen';
const parts = registry.parts as Record<string, {provider: PaintProvider; target: string; origin?: number[]}>;
const objects = registry.objects as Record<string, PaintProvider>;

export function paintIdentityOwner(city: string, objectId: string, partId: string): PaintProvider | undefined {
  const finalOwner=(finalBatch as Record<string,PaintProvider>)[`${city}|${objectId}`];if(finalOwner)return finalOwner;
  const nextCity=(hc70 as Record<string,PaintProvider>)[`${city}|${objectId}`];if(nextCity)return nextCity;
  const tvBase=(tvBaseSupplement as Record<string,PaintProvider>)[`${city}|${objectId}`];if(tvBase)return tvBase;
  const orangerie=(orangerieSupplement as Record<string,PaintProvider>)[`${city}|${objectId}`];if(orangerie)return orangerie;
  const repaired=(repairedSupplement as Record<string,PaintProvider>)[`${city}|${objectId}`];if(repaired)return repaired;
  const added=(supplement as Record<string,PaintProvider>)[`${city}|${objectId}`];if(added)return added;
  return parts[`${city}|${objectId}|${partId}`]?.provider ?? objects[`${city}|${objectId}`];
}

/** Never replace a detailed accepted building with a later simplified copy.
 * Part identity takes priority because a relation and its member ways can share
 * a footprint. Added display parts inherit their proven native object owner.
 */
export function paintOwner(c: BuildingComponent): PaintProvider {
  const exact=paintIdentityOwner(c.city,c.objectId,c.partId);
  if(exact)return exact;
  return paintFamily(c) !== 0 ? 'church' : 'city';
}

export function acceptPaintComponent(provider: PaintProvider, c: BuildingComponent) {
  return paintOwner(c) === provider;
}

export function paintProviderOrigins(provider: PaintProvider, city: string) {
  return Object.entries(parts).filter(([key, row]) => key.startsWith(`${city}|`) && row.provider === provider)
    .map(([, row]) => row.origin).filter((p): p is number[] => !!p && p.length === 2);
}
