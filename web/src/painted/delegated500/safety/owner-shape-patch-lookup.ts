import {OWNER_SHAPE_PATCH_PROFILES} from './owner-shape-patch-profiles';
export type OwnerShapePatchProfile=typeof OWNER_SHAPE_PATCH_PROFILES[number];
export const ownerShapePatchProfiles=(city:string)=>OWNER_SHAPE_PATCH_PROFILES.filter(p=>p.city===city&&(!('enabled'in p)||p.enabled!==false));
export const ownerShapePatchProfile=(path:string)=>OWNER_SHAPE_PATCH_PROFILES.find(p=>p.path===path&&(!('enabled'in p)||p.enabled!==false));
