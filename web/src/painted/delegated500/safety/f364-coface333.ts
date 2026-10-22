// Adds only exact resident outer-member coface8; invoke after existing parent8 paint.
// Both original components remain in source getter/display, no offsets or holds.
export function applyF364Coface331(rows:any[],colors:Float32Array,frames:Float32Array,signature:(c:any)=>string,sourceProofVerified:boolean){
 if(!sourceProofVerified)return{applied:false};const origin='[11.08096505,49.4571088]';
 const parent=rows.filter(c=>c.city==='nuremberg'&&c.objectId==='osm/relation/7471820'&&c.partId==='osm/relation/7471820/component/4e8aef7d8eb02196ac80'&&JSON.stringify(c.origin)===origin&&signature(c)==='5bb06e32');
 const children=rows.filter(c=>c.city==='nuremberg'&&c.objectId==='osm/way/205287846'&&c.partId==='osm/way/205287846/component/6a4482e31c69fc4f332d'&&JSON.stringify(c.origin)===origin&&signature(c)==='2f1b86c6');
 if(parent.length!==1||children.length!==1)return{applied:false};const child=children[0],p=parent[0];
 for(const field of ['positions','normals'])for(const first of [28,32])for(let j=first*3;j<(first+4)*3;j++)if(!Object.is(child.batches[1][field][j],p.batches[1][field][j]))return{applied:false};
 const n=rows.reduce((s,c)=>s+c.batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),0);if(colors.length!==n*4||frames.length!==n*5)return{applied:false};
 let offset=0;for(const c of rows){if(c===child)break;offset+=c.batches.reduce((n:number,b:any)=>n+b.positions.length/3,0)}offset+=child.batches[0].positions.length/3;
 const b=child.batches[1];for(const first of [28,32])for(let i=first;i<first+4;i++){const j=offset+i,x=b.positions[i*3],y=b.positions[i*3+1],z=b.positions[i*3+2];colors.set([.60,.31,.23,2],j*4);frames.set([x*.9996810677107656+z*.025253967226232438+8.903065942784798,y,1,17.660633232831785,1686],j*5)}return{applied:true,cofaceVertices:8,unboundChildVertices:37,sourceArraysChanged:false};
}
