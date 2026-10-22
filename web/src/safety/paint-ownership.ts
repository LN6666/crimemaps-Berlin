import registry from './paint-ownership-registry.json';
import {paintFamily} from '../painted/church/safety/facade-paint-frame';
import type {BuildingComponent} from './building-mesh-renderer';

export type PaintProvider = 'root500' | 'delegated500' | 'tier300' | 'city' | 'church';
const parts = registry.parts as Record<string, {provider: PaintProvider; target: string; origin?: number[]}>;
const objects = registry.objects as Record<string, PaintProvider>;

export function paintIdentityOwner(city: string, objectId: string, partId: string): PaintProvider | undefined {
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
