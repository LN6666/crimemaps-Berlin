import type {BuildingComponent} from './building-mesh-renderer';
import {nativePaintSignature}from'./progressive-native-signature';
const FRAME={"uAxis":[0.8090614308845469,0,0.5878175373064932],"vAxis":[-0.5878175373064932,0,0.8090614308845469],"uOrigin":36.94581669763551,"vOrigin":-358.8975444481837} as const;
/** Exact original native dome found by actual white-pixel ray picks1157/1158. No derived geometry. */
export function applyF003RecoveryPaint287(rows:BuildingComponent[],colors:Float32Array,frames:Float32Array){
 const native=rows.find(c=>c.city==='berlin'&&c.objectId==='osm/way/618992347'&&c.partId==='osm/way/618992347/component/d2fed754c888bae7640f'&&nativePaintSignature(c)==='111bd1ad'&&c.origin[0]===13.39805305&&c.origin[1]===52.5196289&&c.sourceFeature.properties?.['building:part']==='yes'&&c.sourceFeature.properties?.['roof:shape']==='dome');
 let at=0,painted=0;for(const c of rows)for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3,at++)if(c===native){const y=b.positions[j+1];const region=y>=67?[.67,.49,.19]:y>=64?[.10,.14,.16]:[.38,.29,.27];colors.set([...region,2],at*4);const x=b.positions[j],z=b.positions[j+2];frames.set([FRAME.uAxis[0]*x+FRAME.uAxis[2]*z-FRAME.uOrigin,FRAME.vAxis[0]*x+FRAME.vAxis[2]*z-FRAME.vOrigin,70,190,1670],at*5);painted++;}
 return{derived:0,paintedVertices:painted,originalNativeRetained:!!native};
}
