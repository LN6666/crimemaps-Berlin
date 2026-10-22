import type{BuildingComponent}from'./building-mesh-renderer';import{nativePaintSignature}from'./progressive-native-signature';
const P=[{"objectId": "osm/way/1535881528", "partId": "osm/way/1535881528/component/603a71e4378ef36fc127", "origin": [13.40975685, 52.51906115], "signature": "22a848e4", "leafSHA256": "e6e600f87f49ffc4e9b1f08f2e2a50bf631945602bc7a145b0af1d3e3cf2018a", "counts": [48, 24]}, {"objectId": "osm/way/1535881529", "partId": "osm/way/1535881529/component/1131b55d14f40e28ae79", "origin": [13.40975685, 52.51906115], "signature": "db179dc0", "leafSHA256": "e6e600f87f49ffc4e9b1f08f2e2a50bf631945602bc7a145b0af1d3e3cf2018a", "counts": [48, 24]}];
export function applyF020Spire653(draw:BuildingComponent[],frames:Float32Array,raw:readonly BuildingComponent[],leaf:((c:BuildingComponent)=>string|undefined)|undefined,shader:boolean){
 if(!shader||!leaf)return 0;
 const valid=P.filter(p=>{const cs=raw.filter(c=>c.city==='berlin'&&c.objectId===p.objectId&&c.partId===p.partId);return cs.length===1&&leaf(cs[0])===p.leafSHA256&&nativePaintSignature(cs[0])===p.signature&&JSON.stringify(cs[0].origin)===JSON.stringify(p.origin)&&JSON.stringify(cs[0].batches.map(b=>b.positions.length/3))===JSON.stringify(p.counts);});
 let at=0,writes=0;for(const c of draw)for(const[bi,b]of c.batches.entries())for(let j=0;j<b.positions.length/3;j++,at++){
 if(!valid.some(p=>c.city==='berlin'&&c.objectId===p.objectId&&c.partId===p.partId))continue;
 frames.set([b.positions[j*3]*1.0000511153052136+151.88568522346745,b.positions[j*3+2]*1.0000511153052136+250.0021356143129,84.4,bi===1?4:2,1679],at*5);writes++;}return writes;
}
