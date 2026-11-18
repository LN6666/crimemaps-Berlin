/** Selects display copy only; it does not alter location or count data. */
export interface LocationScopePresentation {
  location_scope?: string;
  location_precision: string;
  coordinates: readonly [number, number] | null;
  upstream_provider?: string;
  upstream_public_precision?: string;
  upstream_coordinates?: readonly [number, number] | null;
  incident_basis?: string;
  semantic_basis?: string;
  geocode_method?: string;
  scene_locations?: unknown[];
}

export function locationScopeTranslationKey(event: LocationScopePresentation): string | undefined {
  const scope = event.location_scope;
  if (scope !== "in_city" && scope !== "outside_city" && scope !== "unresolved_no_upstream_coordinate") return undefined;
  if (scope === "unresolved_no_upstream_coordinate") return `scope.${scope}`;

  const point = event.upstream_coordinates;
  const hasRepresentativeCoordinate = Array.isArray(point) && point.length === 2 &&
    Number.isFinite(point[0]) && Math.abs(point[0]) <= 180 &&
    Number.isFinite(point[1]) && Math.abs(point[1]) <= 90;
  const providerReference = event.upstream_provider === "POLIZEIKARTE" &&
    event.incident_basis === "owner_accepted_polizeikarte_upstream" &&
    event.semantic_basis === "owner_accepted_polizeikarte_upstream" &&
    event.geocode_method === "polizeikarte_supplied_nonpoint_location" &&
    (event.location_precision === "city" || event.location_precision === "district") &&
    event.upstream_public_precision === event.location_precision.toUpperCase() &&
    event.coordinates === null && hasRepresentativeCoordinate;
  if (!providerReference) return `scope.${scope}`;
  // A separately listed scene can have its own count point. Keep it visible,
  // but do not infer its counting status from the provider's coarse coordinate.
  if (scope === "outside_city" && event.scene_locations !== undefined &&
      (!Array.isArray(event.scene_locations) || event.scene_locations.length > 0))
    return "scope.provider_reference_outside_city_with_scenes";
  return `scope.provider_reference_${scope}`;
}
