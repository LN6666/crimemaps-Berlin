declare module 'virtual:crimemaps-city-data' {
 const profile: import('./safety/city-frozen-profile').CityFrozenProfile|null;
 export const profileSHA256:string|null;
 export const buildingDetailCatalog: import('./safety/building-detail-catalog').BuildingDetailCatalog|undefined;
 export const buildingFocusRegistry: import('./safety/building-focus-registry').BuildingFocusRegistry|undefined;
 export default profile;
}
