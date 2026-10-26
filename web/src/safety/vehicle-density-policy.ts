/** Display-only fast motion on complete loaded source paths, not traffic observations. */
export const VEHICLE_POLICY={desktopCap:2048,mobileCap:768,desktopReservoir:16384,mobileReservoir:8192,desktopFPS:18,mobileFPS:12,spacingMetres:12,minSpacingMetres:2.5,baselineDensityReference:768,modelScale:.4} as const;
export type VehicleSlot={roadIndex:number;ordinal:number;phase:number;speed:number;seed:number};
type Path={key?:string;points:[number,number][];length:number;visibleLength?:number};
export function stableVehicleSeed(key:string){let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return h>>>0;}
/** View clips weight density only; phases and movement stay on each COMPLETE source path. */
export function allocateVehicleSlots(paths:readonly Path[],reservoirCap:number,visibleFleet=Math.min(reservoirCap,2048)):VehicleSlot[]{
 const cells=new Map<string,number[]>();for(let i=0;i<paths.length;i++){const p=paths[i],a=p.points[Math.floor(p.points.length/2)];if(!a||p.length<=5||(p.visibleLength??p.length)<=0)continue;const k=Math.floor(a[0]/120)+':'+Math.floor(a[1]/120),rows=cells.get(k)??[];rows.push(i);cells.set(k,rows);}
 const buckets=[...cells.entries()].sort((a,b)=>stableVehicleSeed(a[0])-stableVehicleSeed(b[0]));for(const [,rows]of buckets)rows.sort((a,b)=>stableVehicleSeed(paths[a].key??String(a))-stableVehicleSeed(paths[b].key??String(b)));
 const order:number[]=[];for(let depth=0;;depth++){let found=false;for(const [,rows]of buckets)if(depth<rows.length){order.push(rows[depth]);found=true;}if(!found)break;}
 const visibleLength=paths.reduce((n,p)=>n+(p.visibleLength??p.length),0),spacing=Math.max(VEHICLE_POLICY.minSpacingMetres,Math.min(VEHICLE_POLICY.spacingMetres,visibleLength/(visibleFleet*1.4)));
 const desired=paths.map(p=>(p.visibleLength??p.length)>0?Math.max(1,Math.floor(p.length/spacing)):0),base=desired.filter(n=>n>0).length,extras=desired.reduce((n,d)=>n+Math.max(0,d-1),0),ratio=Math.min(1,Math.max(0,reservoirCap-base)/Math.max(1,extras));
 // Scale the full-path population before deriving phases, avoiding a truncated phase cluster.
 const quotas=desired.map(n=>n?1+Math.floor((n-1)*ratio):0),slots:VehicleSlot[]=[];
 for(let ordinal=0;slots.length<reservoirCap;ordinal++){let any=false;for(const roadIndex of order){if(ordinal>=quotas[roadIndex])continue;const path=paths[roadIndex],seed=stableVehicleSeed(path.key??String(roadIndex)),vehicleSeed=stableVehicleSeed((path.key??String(roadIndex))+'/'+ordinal);slots.push({roadIndex,ordinal,phase:((seed/4294967296)+ordinal/quotas[roadIndex])%1,speed:(38+(seed%28))*.09375,seed:vehicleSeed});any=true;if(slots.length===reservoirCap)break;}if(!any)break;}
 return slots;
}
