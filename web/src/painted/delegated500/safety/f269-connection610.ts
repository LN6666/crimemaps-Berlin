import type{BuildingComponent}from'./building-mesh-renderer';
import{nativePaintSignature}from'./progressive-native-signature';
import{f269NeighborsReady605}from'./f269-neighbors605';
const P={
  "objectId": "osm/way/164333539",
  "partId": "osm/way/164333539/component/f09006dacfc0912feb46",
  "origin": [
    8.8062974,
    53.07534065
  ],
  "leafSHA": "d662e675b22032ea2b3f3d3ae33f6611b1fabee1e2811c1ad497cd8796fb3a19",
  "signature": "214426da"
},F=[[[-0.7089999914169312, -2.131999969482422, 299, 100, 1723], [-1.4980000257492065, -0.9520000219345093, 299, 100, 1723], [-2.2939999103546143, 0.21699999272823334, 299, 100, 1723], [0.6549999713897705, 2.131999969482422, 299, 100, 1723], [1.4780000448226929, 1.0959999561309814, 299, 100, 1723], [2.2939999103546143, 0.061000000685453415, 299, 100, 1723]], [[0, 0, 200, 1.4194791053021556, 1723], [1.4194791053021556, 0, 200, 1.4194791053021556, 1723], [1.4194791053021556, 7.5, 200, 1.4194791053021556, 1723], [0, 7.5, 200, 1.4194791053021556, 1723], [0, 0, 201, 1.4142760871107574, 1723], [1.4142760871107574, 0, 201, 1.4142760871107574, 1723], [1.4142760871107574, 7.5, 201, 1.4142760871107574, 1723], [0, 7.5, 201, 1.4142760871107574, 1723], [0, 0, 202, 3.5162231461465776, 1723], [3.5162231461465776, 0, 202, 3.5162231461465776, 1723], [3.5162231461465776, 7.5, 202, 3.5162231461465776, 1723], [0, 7.5, 202, 3.5162231461465776, 1723], [0, 0, 203, 1.3231119183707705, 1723], [1.3231119183707705, 0, 203, 1.3231119183707705, 1723], [1.3231119183707705, 7.5, 203, 1.3231119183707705, 1723], [0, 7.5, 203, 1.3231119183707705, 1723], [0, 0, 204, 1.3179835690631196, 1723], [1.3179835690631196, 0, 204, 1.3179835690631196, 1723], [1.3179835690631196, 7.5, 204, 1.3179835690631196, 1723], [0, 7.5, 204, 1.3179835690631196, 1723], [0, 0, 205, 3.7185020208675716, 1723], [3.7185020208675716, 0, 205, 3.7185020208675716, 1723], [3.7185020208675716, 7.5, 205, 3.7185020208675716, 1723], [0, 7.5, 205, 3.7185020208675716, 1723]]]
;
const key=(c:{objectId:string;partId:string})=>c.objectId+'|'+c.partId;
export function applyF269Connection610(draw:BuildingComponent[],frames:Float32Array,raw:readonly BuildingComponent[],leaf:((c:BuildingComponent)=>string|undefined)|undefined){
 if(!leaf||!f269NeighborsReady605(raw,leaf))return{ready:false,written:0};
 const selected=raw.filter(c=>key(c)===key(P));
 if(selected.length!==1||JSON.stringify(selected[0].origin)!==JSON.stringify(P.origin)||leaf(selected[0])!==P.leafSHA||nativePaintSignature(selected[0])!==P.signature)return{ready:false,written:0};
 const parts=draw.filter(c=>key(c)===key(P));if(parts.length!==1||nativePaintSignature(parts[0])!==P.signature)return{ready:false,written:0};
 let at=0,written=0;for(const c of draw)for(const[bi,b]of c.batches.entries())for(let i=0;i<b.positions.length/3;i++,at++)if(c===parts[0]){frames.set(F[bi][i],at*5);written++;}
 return{ready:true,written};
}
