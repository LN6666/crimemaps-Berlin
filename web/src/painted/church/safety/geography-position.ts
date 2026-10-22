/** Geographic containment only. Never supplies a report coordinate or a statistical count. */
export function containsPosition(geometry:any, point:number[]):boolean {
  const ring=(r:number[][])=>{
    let inside=false;
    for(let i=0,j=r.length-1;i<r.length;j=i++){
      const a=r[j],b=r[i];
      const cross=(point[0]-a[0])*(b[1]-a[1])-(point[1]-a[1])*(b[0]-a[0]);
      if(Math.abs(cross)<1e-12&&point[0]>=Math.min(a[0],b[0])&&point[0]<=Math.max(a[0],b[0])&&point[1]>=Math.min(a[1],b[1])&&point[1]<=Math.max(a[1],b[1]))return true;
      if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }return inside;
  };
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
  return polygons.some((p:number[][][])=>ring(p[0])&&!p.slice(1).some(ring));
}

/** Build once per boundary layer; retain native feature order at shared boundaries. */
export function createAreaLookup<T extends {geometry:any}>(features:readonly T[]) {
 const entries=features.map(feature=>{
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  const scan=(coordinates:any)=>{if(typeof coordinates?.[0]==='number'){
   west=Math.min(west,coordinates[0]);east=Math.max(east,coordinates[0]);south=Math.min(south,coordinates[1]);north=Math.max(north,coordinates[1]);
  }else if(Array.isArray(coordinates))coordinates.forEach(scan);};
  scan(feature.geometry?.coordinates);
  return {feature,west,south,east,north};
 });
 return {find(point:readonly number[]):T|undefined{
  if(!Number.isFinite(point[0])||!Number.isFinite(point[1]))return undefined;
  for(const entry of entries){if(point[0]<entry.west||point[0]>entry.east||point[1]<entry.south||point[1]>entry.north)continue;
   if(containsPosition(entry.feature.geometry,[point[0],point[1]]))return entry.feature;
  }return undefined;
 }};
}

/** At the threshold itself, overview highlighting and names are already hidden. */
export function overviewArea<T>(lookup:{find(point:readonly number[]):T|undefined},point:readonly number[],zoom:number,threshold:number,enabled=true):T|undefined {
 return enabled&&Number.isFinite(zoom)&&Number.isFinite(threshold)&&zoom<threshold?lookup.find(point):undefined;
}
