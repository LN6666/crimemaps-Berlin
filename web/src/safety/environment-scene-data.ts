export type EnvironmentBox=[number,number,number,number];
export type EnvironmentFeature={type:'Feature';id:string;geometry:{type:'Point'|'LineString'|'MultiLineString'|'Polygon'|'MultiPolygon';coordinates:any};properties:{kind:'tree'|'tree_row'|'water'|'water_line'|'green';osmTags:Record<string,string>;sourceGeometry?:unknown;displayClip:boolean;source_snapshot:string;source_pbf_sha256:string;source_boundary_sha256:string;tree_crown_display_5m_guard?:boolean|null}};
export type EnvironmentSource={type:'FeatureCollection';schema_version:1;city:string;features:EnvironmentFeature[]};
/** Display width only; actual source heights and positions stay unchanged. */
export const TREE_DISPLAY_HORIZONTAL_SCALE_METRES=3;
export const ENVIRONMENT_LIMITS={tileRawBytes:1024**2,visibleBytes:4*1024**2,cacheBytes:8*1024**2,maxPointsPerTile:50000,desktopTrees:512,mobileTrees:128,waterVertices:60000,waterIndices:180000,greenVertices:20000,greenIndices:60000,treeRowSpacingMetres:10,treeRowSeparationMetres:7,treeRowCandidateLimit:8192};
export function sourceTreeHeight(raw:Record<string,string>){const value=raw.height?.trim(),m=value?.match(/^([0-9]+(?:\.[0-9]+)?)\s*(m|ft|feet|')?$/i);if(m){const metres=Number(m[1])*(m[2]&&m[2].toLowerCase()!=='m'?.3048:1);if(metres>=.3&&metres<=100)return{metres,status:'source-tag' as const,raw:value};}return{metres:7,status:'display-default' as const,raw:value};}
/** Original point/line/polygon values remain readonly source data; no individual tree scatter. */
export function parseEnvironmentSource(value:unknown,city:string,boundarySHA256:string,sourceSHA256:string,snapshot:string):EnvironmentSource{
 const data=value as EnvironmentSource;if(!data||data.type!=='FeatureCollection'||data.schema_version!==1||data.city!==city||!/^[a-f0-9]{64}$/.test(sourceSHA256)||!/^[a-f0-9]{64}$/.test(boundarySHA256)||typeof snapshot!=='string'||snapshot.length>128||!Array.isArray(data.features)||data.features.length>10000)throw Error('Invalid native environment source');
 let points=0;const ids=new Set<string>();const scan=(a:any):void=>{if(!Array.isArray(a))throw Error('Invalid native environment coordinates');if(typeof a[0]==='number'){if(++points>ENVIRONMENT_LIMITS.maxPointsPerTile||a.length<2||!a.every(Number.isFinite)||Math.abs(a[0])>180||Math.abs(a[1])>85)throw Error('Invalid environment position');}else a.forEach(scan);};
 for(const f of data.features){const p=f?.properties;if(f?.type!=='Feature'||!/^osm\/(?:node|way|relation)\/[1-9]\d*$/.test(f.id)||ids.has(f.id)||!p||!['tree','tree_row','water','water_line','green'].includes(p.kind)||typeof p.osmTags!=='object'||p.source_pbf_sha256!==sourceSHA256||p.source_boundary_sha256!==boundarySHA256||p.source_snapshot!==snapshot||typeof p.displayClip!=='boolean'||!f.geometry||!['Point','LineString','MultiLineString','Polygon','MultiPolygon'].includes(f.geometry.type))throw Error('Invalid native environment feature');ids.add(f.id);if(p.kind==='tree'&&f.geometry.type!=='Point'||['tree_row','water_line'].includes(p.kind)&&!['LineString','MultiLineString'].includes(f.geometry.type)||p.kind==='green'&&!['Polygon','MultiPolygon'].includes(f.geometry.type))throw Error('Environment tree source kind mismatch');scan(f.geometry.coordinates);if(p.displayClip&&p.sourceGeometry==null)throw Error('Clipped environment lost original source geometry');}
 return data;
}
type TreeDisplayMesh={positions:Float32Array;indices:Uint16Array;vertices:number;triangles:number;strideBytes:number;horizontalRadiusMetres:number;role:string;canopy:string};
let cachedTreeDisplayMesh:TreeDisplayMesh|undefined;
/** One cached self-authored mesh shared by all source-point instances. The five
 * overlapping lobes vary the silhouette without scattering additional trees. */
export function lowPolyTreeMesh():TreeDisplayMesh {
 if(cachedTreeDisplayMesh)return cachedTreeDisplayMesh;
 const positions:number[]=[],indices:number[]=[],phi=(1+Math.sqrt(5))/2;
 const raw=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]];
 const sphere=raw.map(p=>{const length=Math.hypot(...p);return p.map(n=>n/length);});
 const faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
 // Keep the same crown vertices and indices. Mixed face/radial normals reveal
 // small leaf clusters without changing the source height or display envelope.
 const canopyNormals=(points:number[][],radial:number[][])=>{
  const a=points[1].map((n,i)=>n-points[0][i]),b=points[2].map((n,i)=>n-points[0][i]);
  const cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=Math.hypot(...cross);
  const flat=cross.map(n=>n/length);
  return radial.map(n=>{const length=Math.hypot(...n);return n.map((value,i)=>.35*value/length+.65*flat[i]);});
 };
 const face=(points:number[][],normals:number[][],role:number)=>{const at=positions.length/7;for(let i=0;i<points.length;i++){const length=Math.hypot(...normals[i]);positions.push(...points[i],...normals[i].map(n=>n/length),role);}for(let i=1;i<points.length-1;i++)indices.push(at,at+i,at+i+1);};
 for(let i=0;i<6;i++){const a=i*Math.PI/3,b=(i+1)*Math.PI/3,m=(a+b)/2,n=[Math.cos(m),0,Math.sin(m)];face([[.055*Math.cos(a),0,.055*Math.sin(a)],[.055*Math.cos(b),0,.055*Math.sin(b)],[.055*Math.cos(b),.48,.055*Math.sin(b)],[.055*Math.cos(a),.48,.055*Math.sin(a)]],[n,n,n,n],0);}
 const lobes=[[0,.68,0,.67,.32,.65],[.36,.58,.08,.52,.28,.52],[-.30,.61,.22,.54,.27,.52],[.02,.55,-.34,.55,.27,.52],[.21,.80,-.16,.45,.20,.44]];
 lobes.forEach(([x,y,z,rx,ry,rz],lobe)=>{for(const ids of faces){const points=ids.map(i=>[x+sphere[i][0]*rx,y+sphere[i][1]*ry,z+sphere[i][2]*rz]),normals=ids.map(i=>[sphere[i][0]/rx,sphere[i][1]/ry,sphere[i][2]/rz]);face(points,canopyNormals(points,normals),1+lobe*.08);}});
 let maxY=0,maxRadius=0;for(let i=0;i<positions.length;i+=7){maxY=Math.max(maxY,positions[i+1]);maxRadius=Math.max(maxRadius,Math.hypot(positions[i],positions[i+2]));}
 for(let i=0;i<positions.length;i+=7){positions[i+1]/=maxY;positions[i+4]*=maxY;const length=Math.hypot(positions[i+3],positions[i+4],positions[i+5]);for(let a=3;a<6;a++)positions[i+a]/=length;}
 return cachedTreeDisplayMesh={positions:new Float32Array(positions),indices:new Uint16Array(indices),vertices:positions.length/7,triangles:indices.length/3,strideBytes:28,horizontalRadiusMetres:maxRadius*TREE_DISPLAY_HORIZONTAL_SCALE_METRES*1.08,role:'source-point-display-schematic',canopy:'five-lobe-cached-display'};
}
