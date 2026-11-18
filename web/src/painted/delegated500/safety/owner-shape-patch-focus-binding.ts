import {OWNER_SHAPE_PATCH_FOCUS} from './owner-shape-patch-focus';
/** Identity is checked against the offline measured source revision. No mesh read. */
export function ownerShapePatchFocusComponents(profile:{id:string;city:string;sha256:string;objectId:string;partId:string}){
 const row=OWNER_SHAPE_PATCH_FOCUS.find(row=>row.id===profile.id&&row.city===profile.city&&row.sha256===profile.sha256);
 if(!row||row.components.some(c=>c.objectId!==profile.objectId||c.partId!==profile.partId))throw Error('Owner shape patch focus source mismatch');
 return row.components;
}
