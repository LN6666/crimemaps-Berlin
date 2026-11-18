/** Compact identity-only projections from the same manifest-bound recipe inputs.
 * The original predicates and data-independent material bodies are retained.
 * Full geometry/source guards remain solely in the original prepared recipes.
 * This entry has no frozen-table loader or geometry dependency. */
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
// infill-silberturm-full051-reconstruction.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: f79b08c9af2ee2f68d27faec7de0c3720fd797ce6f9a03e5afe926eb123f51af@painted/infill/safety/infill-silberturm-full051-reconstruction.ts#0:108286; 75ca031fc03795f03e4ead934e2b1fe932ae9b6fb117477198a7f30d4a913d29@painted/infill/safety/infill-silberturm-full051-reconstruction.ts#0:1991326
export const infillSilberturmFull051ReconstructionMetadata=(()=>{
const IDS=[{"objectId":"osm/way/11527403","partId":"osm/way/11527403/component/fee6c96118bb2d2026ed"},{"objectId":"osm/way/1333665177","partId":"osm/way/1333665177/component/99431b409b420a8d7aaf"},{"objectId":"osm/way/1333665178","partId":"osm/way/1333665178/component/d0bb3638297923b38320"},{"objectId":"osm/way/1333665179","partId":"osm/way/1333665179/component/8d793be1b44c3c28f21f"}];
const infillSilberturmIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
return{infillSilberturmIdentity};
})();

// infill-silberturm-full051-materials.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 44025c321657fc90b9fc058e96da0c760cfe4624b328e02ad76f5acf66a7e98f@painted/infill/safety/infill-silberturm-full051-data.ts#0:1082410
export const infillSilberturmFull051MaterialsMetadata=(()=>{

return{};
})();

// infill-omniturm.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: b2deef6f56e54183b1121b2c143f92fae515fd2def53d2d0b6b9903b0a837483@painted/infill/safety/infill-omniturm-data.ts#0:341676
export const infillOmniturmMetadata=(()=>{
const M={"identity":{"objectId":"osm/way/598133203","partId":"osm/way/598133203/component/d339f7dc1f96a3bab9bf"}};
const infillOmniturmIdentity=(c:Identity&{city?:string})=>c.city==='frankfurt'&&c.objectId===M.identity.objectId&&c.partId===M.identity.partId;
function infillOmniturmBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 let offset=0,objects=0,vertices=0;
 for(const c of components){
  const match=infillOmniturmIdentity(c)&&!!c.displayEstimates?.infillOmniturm050;
  for(const b of c.batches){
   const n=b.positions.length/3;
   if(match){
    const ownedPaint=Array.from((b as any).paint as ArrayLike<number>),ownedFrames=Array.from((b as any).frames as ArrayLike<number>);
    // The sealed payload placed semantic family IDs in the red slot. Bind
    // those families to frame metadata while retaining the display base RGB.
    for(let j=0;j<n;j++){
     ownedPaint[j*4]=b.color[0];ownedPaint[j*4+1]=b.color[1];ownedPaint[j*4+2]=b.color[2];
     ownedFrames[j*5+4]=Math.abs(b.normals[j*3+1])>.4?45051:45050;
    }
    paint.set(ownedPaint,offset*4);frames.set(ownedFrames,offset*5);vertices+=n;objects++;
   }
   offset+=n;
  }
 }
 return{objects,vertices,actualVisualAccepted:false};
}
return{infillOmniturmIdentity,infillOmniturmBaseMaterials};
})();

// marienturm-specific.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: a10e9bc3b793ddfe1a4ec2620d7b2fde576950efd2eff677cc9b71fa47716d05@painted/infill/safety/marienturm-specific-data.ts#0:102338
export const marienturmSpecificMetadata=(()=>{
const M={"identity":{"objectId":"osm/way/400466121","partId":"osm/way/400466121/component/1069a4c328f6fa00fddf"}};
const marienturm050Identity=(c:Identity)=>c.objectId===M.identity.objectId&&c.partId===M.identity.partId;
const SHA="a10e9bc3b793ddfe1a4ec2620d7b2fde576950efd2eff677cc9b71fa47716d05";
function marienturm050BaseMaterials(cs:BuildingComponent[],paint:Float32Array,frames:Float32Array){let at=0,objects=0,vertices=0;for(const c of cs){const own=c.city==='frankfurt'&&marienturm050Identity(c)&&c.displayEstimates?.marienturm050===SHA;if(own)objects++;for(const b of c.batches){const n=b.positions.length/3;if(own){paint.set((b as any).paint,at*4);frames.set((b as any).frames,at*5);vertices+=n;}at+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{marienturm050Identity,marienturm050BaseMaterials};
})();

// infill-c032-original-runtime.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 1ad26874c7a52a4f5a5419e24a60785d90aa87a1bf4787de699a6acba73b177a@painted/infill/safety/c032-original-admissions.ts#0:74860
export const infillC032OriginalRuntimeMetadata=(()=>{
const C032_IDENTITIES=new Set(["osm/way/452269648|osm/way/452269648/component/207ca47e16e67d7b21b8","osm/relation/2181079|osm/relation/2181079/component/1950a3b33c9da1ad5a1f","osm/way/452269645|osm/way/452269645/component/7ba3f2a6b998af517e6f","osm/way/452269646|osm/way/452269646/component/a691a394e02d25d7d2e0","osm/way/452269647|osm/way/452269647/component/1b6e9c1e28687f318a39","osm/way/519940997|osm/way/519940997/component/35bb28cb82d959caeb17","osm/way/519941004|osm/way/519941004/component/87efeda6fa3417185682","osm/way/519941007|osm/way/519941007/component/db6743a0c7d9305b6000","osm/way/519941011|osm/way/519941011/component/db6743a0c7d9305b6000","osm/way/519941015|osm/way/519941015/component/db6743a0c7d9305b6000","osm/way/519941027|osm/way/519941027/component/ff9b703e01e83675d1f8","osm/way/519941040|osm/way/519941040/component/ff9b703e01e83675d1f8","osm/way/519941056|osm/way/519941056/component/ff9b703e01e83675d1f8","osm/way/519941075|osm/way/519941075/component/8b734711c40b89bc4908","osm/way/520260875|osm/way/520260875/component/6cfe9e743eb03a019b07","osm/way/520260886|osm/way/520260886/component/7222012679cf1245b4d8","osm/way/530332851|osm/way/530332851/component/38d52a2bfb2a49f67cb8","osm/way/530332854|osm/way/530332854/component/fc5fec850c731694c37e","osm/way/530332856|osm/way/530332856/component/eb5ba93422d60c140ff2","osm/way/530332859|osm/way/530332859/component/782daed5862c184bf3d0","osm/way/530332860|osm/way/530332860/component/59d93502e234f29ca642","osm/way/530332864|osm/way/530332864/component/165cae64d8d3c42aeb6a","osm/way/530332868|osm/way/530332868/component/32caed8fd7c095b5aa71","osm/way/530332869|osm/way/530332869/component/7a950e887ed43bed7307","osm/way/530332870|osm/way/530332870/component/0d000f24647620c43667","osm/way/530332872|osm/way/530332872/component/e35d7a4a39da71b51898","osm/way/530332875|osm/way/530332875/component/6e33299d4093ce383cf0","osm/way/530332876|osm/way/530332876/component/b9f4de239eeb3bf49f80","osm/way/530332880|osm/way/530332880/component/ea04a4bc447aef539f34","osm/way/530332881|osm/way/530332881/component/ea04a4bc447aef539f34","osm/way/530332886|osm/way/530332886/component/1031f879cc32bf476c00","osm/way/530332888|osm/way/530332888/component/67ec48e1f615fa69898b","osm/way/530332890|osm/way/530332890/component/8c2d37ba01b69f2ff203","osm/way/530332891|osm/way/530332891/component/14899cba546820fd3fed","osm/way/530332892|osm/way/530332892/component/20e1d66348891178c6f7","osm/way/530332894|osm/way/530332894/component/d69808dac50edce2a5ba","osm/way/530332895|osm/way/530332895/component/06cf880290fbe0e04ab0","osm/way/530332901|osm/way/530332901/component/8e7539e48d786c22d69a","osm/way/530332908|osm/way/530332908/component/5198de05943fe11b3c9c","osm/way/530332912|osm/way/530332912/component/49e66372a3979d1d50fd","osm/way/530332916|osm/way/530332916/component/d523c01fe2e8c2c80536","osm/way/530332924|osm/way/530332924/component/06adb56030f9363f93c9","osm/way/530332934|osm/way/530332934/component/f617668f33c85b9c04ba","osm/way/530332938|osm/way/530332938/component/7618e4560fdad18d7b80","osm/way/530332941|osm/way/530332941/component/24304e5149967efe76a2","osm/way/530332946|osm/way/530332946/component/bb257048f59c42eb6a87","osm/way/530471288|osm/way/530471288/component/872a3c27ffa989f8e9b1","osm/way/530471290|osm/way/530471290/component/f14baef1056a3c394d34","osm/way/530471291|osm/way/530471291/component/0986010b05bfa3f2d446","osm/way/1050053118|osm/way/1050053118/component/0e03c510f37d09113b07","osm/way/1050053120|osm/way/1050053120/component/3790c1f5454d1e583ab6","osm/way/1050053121|osm/way/1050053121/component/1f993f965b1226df0ead"]);
const infillC032OriginalIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='essen')&&C032_IDENTITIES.has(c.objectId+'|'+c.partId);
return{infillC032OriginalIdentity};
})();

// infill-c032-official-runtime.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 1ad26874c7a52a4f5a5419e24a60785d90aa87a1bf4787de699a6acba73b177a@painted/infill/safety/c032-original-admissions.ts#0:74860; 5700f80de1ee690e7d942a3da9693d13e4f42d11638f509a7e83035453982406@painted/infill/safety/c032-official-data.ts#0:362883
export const infillC032OfficialRuntimeMetadata=(()=>{
const MAIN="osm/relation/2181079";
const BODIES=new Set(["osm/way/452269645","osm/way/452269646","osm/way/452269647","osm/way/519941075"]);
const LETTERS=new Set(["osm/way/519940997","osm/way/519941004","osm/way/519941007","osm/way/519941011","osm/way/519941015","osm/way/519941027","osm/way/519941040","osm/way/519941056","osm/way/520260875","osm/way/520260886","osm/way/530332851","osm/way/530332854","osm/way/530332856","osm/way/530332859","osm/way/530332860","osm/way/530332864","osm/way/530332868","osm/way/530332869","osm/way/530332870","osm/way/530332872","osm/way/530332875","osm/way/530332876","osm/way/530332880","osm/way/530332881","osm/way/530332886","osm/way/530332888","osm/way/530332890","osm/way/530332891","osm/way/530332892","osm/way/530332894","osm/way/530332895","osm/way/530332901","osm/way/530332908","osm/way/530332912","osm/way/530332916","osm/way/530332924","osm/way/530332934","osm/way/530332938","osm/way/530332941","osm/way/530332946","osm/way/530471288","osm/way/530471290","osm/way/530471291","osm/way/1050053118","osm/way/1050053120","osm/way/1050053121"]);
const infillC032OfficialIdentity=(c:any)=>c.city==='essen'&&(c.objectId===MAIN||BODIES.has(c.objectId)||LETTERS.has(c.objectId));
const INFILL_C032_OFFICIAL_SHA="5700f80de1ee690e7d942a3da9693d13e4f42d11638f509a7e83035453982406";
function infillC032OfficialBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=!!(c.displayEstimates as any)?.infillC032Official;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);for(let vi=0;vi<n;vi++){const family=(b as any).paint[vi*4+3];if(family>=26100&&family<=26103){paint[(offset+vi)*4+3]=2;frames[(offset+vi)*5+4]=family;}}vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillC032OfficialIdentity,infillC032OfficialBaseMaterials,INFILL_C032_OFFICIAL_SHA};
})();

// infill-frankfurt-bockenheimer084.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: a6ce1214faf70552dc3976b975de5eab5697234c51774ed7e025a6c8364fb2a8@painted/infill/safety/infill-frankfurt-bockenheimer084-data.ts#0:586712
export const infillFrankfurtBockenheimer084Metadata=(()=>{
const GROUPS=[{"models":[{"identity":{"objectId":"osm/way/174618867","partId":"osm/way/174618867/component/fba36d8bda5b1b9a5510"}}]}];
const infillFrankfurtBockenheimer084Identity=(c:Identity)=>GROUPS.some(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
function infillFrankfurtBockenheimer084BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillFrankfurtBockenheimer084;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtBockenheimer084Identity,infillFrankfurtBockenheimer084BaseMaterials};
})();

// infill-stuttgart-eberhard-historical.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: d4b24f353e6e59ca785ee809cd0bdfb0e1a3f8c6f96f3094c49d87954498a1ff@painted/infill/safety/infill-stuttgart-eberhard-historical.ts#0:241883
export const infillStuttgartEberhardHistoricalMetadata=(()=>{
const IDS=[{"objectId":"osm/way/325279509","partId":"osm/way/325279509/component/8828e7ebe6d13ca863cf"}];
const infillEberhardHistoricalIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
function infillEberhardHistoricalBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillEberhardHistoricalIdentity(c)&&!!c.displayEstimates?.infillEberhardHistorical;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillEberhardHistoricalIdentity,infillEberhardHistoricalBaseMaterials};
})();

// infill-goethe34.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: f37332afb47d4fa7d1023060be8dbecf1cb8059d6e0ff14abb1a88a9823e25d0@painted/infill/safety/infill-goethe34-data.ts#0:627244
export const infillGoethe34Metadata=(()=>{
const GROUPS=[{"models":[{"identity":{"objectId":"osm/way/174618901","partId":"osm/way/174618901/component/30a196682a5541ccbcde"}},{"identity":{"objectId":"osm/way/174618902","partId":"osm/way/174618902/component/b19c78be59d7631f719f"}},{"identity":{"objectId":"osm/way/279950182","partId":"osm/way/279950182/component/debb290f50e76a39aedb"}}]}];
const infillGoethe34Identity=(c:Identity)=>GROUPS.some(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
function infillGoethe34BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillGoethe34;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}
return{infillGoethe34Identity,infillGoethe34BaseMaterials};
})();

// infill-frankfurt-kettenhof065.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: e01998eee12ad0f18b6ee45c77e80b6a88894abe34f1933354d9078fcbc1002e@painted/infill/safety/infill-frankfurt-kettenhof065-data.ts#0:125141
export const infillFrankfurtKettenhof065Metadata=(()=>{
const GROUPS=[{"models":[{"identity":{"objectId":"osm/way/42730590","partId":"osm/way/42730590/component/ae52a0666ec01639b509"}}]}];
const infillFrankfurtKettenhof065Identity=(c:Identity)=>GROUPS.some(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
function infillFrankfurtKettenhof065BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillFrankfurtKettenhof065;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtKettenhof065Identity,infillFrankfurtKettenhof065BaseMaterials};
})();

// infill-frankfurt-vci051.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 024b2add1a236edd82f12e655b4f092ef498b77d8b7c213331b65cfe0fd2638c@painted/infill/safety/infill-frankfurt-vci051-data.ts#0:663778
export const infillFrankfurtVci051Metadata=(()=>{
const GROUPS=[{"models":[{"identity":{"objectId":"osm/way/42367711","partId":"osm/way/42367711/component/f9fd9287da335943f394"}}]}];
const infillFrankfurtVCI051Identity=(c:Identity)=>GROUPS.some(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
function infillFrankfurtVCI051BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillFrankfurtVCI051;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtVCI051Identity,infillFrankfurtVCI051BaseMaterials};
})();

// infill-frankfurt-ml41-signaris.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: fa5f4727a2678164313b3669b341e87af324313f13c1aa0d7a84c31d9500ec25@painted/infill/safety/infill-frankfurt-ml41-signaris-data.ts#0:909754
export const infillFrankfurtMl41SignarisMetadata=(()=>{
const GROUPS=[{"models":[{"identity":{"objectId":"osm/way/230548378","partId":"osm/way/230548378/component/461bcc05ca058eb9e3f7"}},{"identity":{"objectId":"osm/way/174343192","partId":"osm/way/174343192/component/eb1c017d7bcc120dc4a5"}},{"identity":{"objectId":"osm/way/231448098","partId":"osm/way/231448098/component/7e6a92de77250dfdb4b1"}}]}];
const infillFrankfurtML41SignarisIdentity=(c:Identity)=>GROUPS.some(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
function infillFrankfurtML41SignarisBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillFrankfurtML41Signaris;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtML41SignarisIdentity,infillFrankfurtML41SignarisBaseMaterials};
})();

// infill-schneider076.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: c0de20d418f67403d38dce691ee60c0883f739a5851a79da63722aa87a56fb2c@painted/infill/safety/infill-schneider076-data.ts#0:6080338
export const infillSchneider076Metadata=(()=>{
const GROUPS=[{"models":[{"identity":{"objectId":"osm/way/144068944","partId":"osm/way/144068944/component/1af468cc01159a419643"}},{"identity":{"objectId":"osm/way/174618851","partId":"osm/way/174618851/component/9edac6a6b15bb2aa4e22"}},{"identity":{"objectId":"osm/way/144068945","partId":"osm/way/144068945/component/1c176cc8173d62095e19"}},{"identity":{"objectId":"osm/way/174618869","partId":"osm/way/174618869/component/6e12d850f4072081fe65"}},{"identity":{"objectId":"osm/way/144068946","partId":"osm/way/144068946/component/bd98576f5aef3f9d93f8"}},{"identity":{"objectId":"osm/way/144068947","partId":"osm/way/144068947/component/aa4acf81c60e04d4640d"}}]}];
const infillSchneider076Identity=(c:Identity)=>GROUPS.some(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
function infillSchneider076BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillSchneider076;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}
return{infillSchneider076Identity,infillSchneider076BaseMaterials};
})();

// infill-frankfurt-maro74.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: bc85ebe0967b9ae0aea35faa0da24be0ba4b3f1828c38bdc7c240eab633064f2@painted/infill/safety/infill-frankfurt-maro74-data.ts#0:164382
export const infillFrankfurtMaro74Metadata=(()=>{
const GROUPS=[{"models":[{"identity":{"objectId":"osm/way/593473646","partId":"osm/way/593473646/component/81fc6cdb548523c9e648"}}]}];
const infillFrankfurtMaro74Identity=(c:Identity)=>GROUPS.some(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
function infillFrankfurtMaro74BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillFrankfurtMaro74;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtMaro74Identity,infillFrankfurtMaro74BaseMaterials};
})();

// infill-frankfurt-low-office-k26.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 07f4e96f56ecba998e80822b090b434961f6b3644b7f59b60177ddc666666534@painted/infill/safety/infill-frankfurt-low-office-k26-data.ts#0:72090
export const infillFrankfurtLowOfficeK26Metadata=(()=>{
const GROUPS=[{"models":[{"identity":{"objectId":"osm/way/1293494354","partId":"osm/way/1293494354/component/feea20828241d7c0cc16"}}]}];
const infillFrankfurtLowOfficeK26Identity=(c:Identity)=>GROUPS.some(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
function infillFrankfurtLowOfficeK26BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillFrankfurtLowOfficeK26;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtLowOfficeK26Identity,infillFrankfurtLowOfficeK26BaseMaterials};
})();

// infill-frankfurt-low-office-batch2.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: feaa25662d534db22df2f4d8d4908e2b3b19f0ed3981b483caab6abb5be0acbb@painted/infill/safety/infill-frankfurt-low-office-batch2-data.ts#0:2622237
export const infillFrankfurtLowOfficeBatch2Metadata=(()=>{
const GROUPS=[{"models":[{"identity":{"objectId":"osm/way/39217023","partId":"osm/way/39217023/component/591df671f5b07a45b3d7"}}]}];
const infillFrankfurtLowOfficeBatch2Identity=(c:Identity)=>GROUPS.some(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
function infillFrankfurtLowOfficeBatch2BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillFrankfurtLowOfficeBatch2;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtLowOfficeBatch2Identity,infillFrankfurtLowOfficeBatch2BaseMaterials};
})();

// infill-frankfurt-low-office.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 5e99a3a25631ad35b690daed80f7f7ee7aec13d27dd8d2254a81604de9c4e43d@painted/infill/safety/infill-frankfurt-low-office-data.ts#0:17561391
export const infillFrankfurtLowOfficeMetadata=(()=>{
const GROUPS=[{"models":[{"identity":{"objectId":"osm/way/307129964","partId":"osm/way/307129964/component/13a277e5ea1c4e5fed50"}}]},{"models":[{"identity":{"objectId":"osm/way/42730563","partId":"osm/way/42730563/component/39011cccd2f0ee279ffd"}}]},{"models":[{"identity":{"objectId":"osm/way/232466502","partId":"osm/way/232466502/component/5c985ddea03823084be4"}}]},{"models":[{"identity":{"objectId":"osm/way/50563543","partId":"osm/way/50563543/component/bf18cb93887b4efe5d68"}}]}];
const infillFrankfurtLowOfficeIdentity=(c:Identity)=>GROUPS.some(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
function infillFrankfurtLowOfficeBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillFrankfurtLowOffice;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtLowOfficeIdentity,infillFrankfurtLowOfficeBaseMaterials};
})();

// infill-essen-st-johann.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 894d2263734ed5dd991d31ee770706a8e1649092f29f05ca736d2841cc1fe51a@painted/infill/safety/infill-essen-st-johann.ts#0:460442
export const infillEssenStJohannMetadata=(()=>{
const ORIGINAL=[{"objectId":"osm/way/404407214","partId":"osm/way/404407214/component/55ef897133602e7ce478"},{"objectId":"osm/way/404407216","partId":"osm/way/404407216/component/075766b52872a5305aad"},{"objectId":"osm/way/404407217","partId":"osm/way/404407217/component/8849e779adb279734c09"},{"objectId":"osm/way/404407215","partId":"osm/way/404407215/component/075766b52872a5305aad"},{"objectId":"osm/way/53211715","partId":"osm/way/53211715/component/6c0161f5c8ef543ecc76"}];
const infillStJohannIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='essen')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const INFILL_STJOHANN_SHA="894d2263734ed5dd991d31ee770706a8e1649092f29f05ca736d2841cc1fe51a";
function infillStJohannBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='essen'&&!!c.displayEstimates?.infillStJohannExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillStJohannIdentity,infillStJohannBaseMaterials,INFILL_STJOHANN_SHA};
})();

// infill-essen-rabbinerhaus.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 682b5978af7d653c1da52da9f73f5258a2ac2b39638b9a11c19b2c67813f68e7@painted/infill/safety/infill-essen-rabbinerhaus.ts#0:109219
export const infillEssenRabbinerhausMetadata=(()=>{
const ORIGINAL=[{"objectId":"osm/way/439374669","partId":"osm/way/439374669/component/60efc1bf7a065c6c3a62"},{"objectId":"osm/way/439374670","partId":"osm/way/439374670/component/d3e71e7daef6a72c3b56"},{"objectId":"osm/way/439374671","partId":"osm/way/439374671/component/b09c5ecce1d125a4a395"},{"objectId":"osm/way/439374672","partId":"osm/way/439374672/component/eaa03ef48a5150833b8e"},{"objectId":"osm/way/439374678","partId":"osm/way/439374678/component/6353b8374cfb1ddd9309"},{"objectId":"osm/way/74728286","partId":"osm/way/74728286/component/053798ef9938b5bec9b5"}];
const infillRabbiIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='essen')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const INFILL_RABBI_SHA="682b5978af7d653c1da52da9f73f5258a2ac2b39638b9a11c19b2c67813f68e7";
function infillRabbiBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='essen'&&!!c.displayEstimates?.infillRabbiExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillRabbiIdentity,infillRabbiBaseMaterials,INFILL_RABBI_SHA};
})();

// infill-stuttgart-graf-courtyard-measured.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 8b1d5d54b426235f2abe01f45c2276a52ec8adb9ca9a9030216c21be7c652c30@painted/infill/safety/infill-stuttgart-graf-courtyard-measured.ts#0:194062
export const infillStuttgartGrafCourtyardMeasuredMetadata=(()=>{
const IDS=[{"objectId":"osm/way/325279534","partId":"osm/way/325279534/component/97beda75fe55f7bfa553"},{"objectId":"osm/way/962686241","partId":"osm/way/962686241/component/e4f918b9bc1c2a0b7b09"},{"objectId":"osm/way/962686242","partId":"osm/way/962686242/component/8522ae7b90b257ca0611"}];
const infillGrafCourtyardMeasuredIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
function infillGrafCourtyardMeasuredBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillGrafCourtyardMeasuredIdentity(c)&&!!c.displayEstimates?.infillGrafCourtyardMeasured;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillGrafCourtyardMeasuredIdentity,infillGrafCourtyardMeasuredBaseMaterials};
})();

// infill-stuttgart-graf-west-measured.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 357a6c50c512f673a521f6bd3614f4c5eac72b6b8c2100b663106fdfebabecf1@painted/infill/safety/infill-stuttgart-graf-west-measured.ts#0:113271; b586427dd0ba89587372214546fd604d2a52592e7992e163d951531a676c763c@painted/infill/safety/infill-stuttgart-graf-west-measured.ts#0:851824
export const infillStuttgartGrafWestMeasuredMetadata=(()=>{
const IDS=[{"objectId":"osm/way/325279516","partId":"osm/way/325279516/component/5dfd3ea562ebbd5bae45"},{"objectId":"osm/way/325279528","partId":"osm/way/325279528/component/150887cf46e18d957966"},{"objectId":"osm/way/108749503","partId":"osm/way/108749503/component/a7a14d3ac956ac2754b7"},{"objectId":"osm/way/108749490","partId":"osm/way/108749490/component/6a932a5e426923dce06d"},{"objectId":"osm/way/108749494","partId":"osm/way/108749494/component/8309bc9656267311219d"},{"objectId":"osm/way/325279520","partId":"osm/way/325279520/component/662f9c4af6b3ce59beba"},{"objectId":"osm/way/325279508","partId":"osm/way/325279508/component/222759b0f33221ced80d"},{"objectId":"osm/way/325279525","partId":"osm/way/325279525/component/b0abc085b6e0749ddb3b"},{"objectId":"osm/way/325279518","partId":"osm/way/325279518/component/f68a945456100da670d0"},{"objectId":"osm/way/325279505","partId":"osm/way/325279505/component/6d23a19ae4652a5ebbcf"},{"objectId":"osm/way/108749489","partId":"osm/way/108749489/component/8fae62f0c492e685b802"},{"objectId":"osm/way/108749493","partId":"osm/way/108749493/component/7d476a274732e258e1a4"}];
const infillGrafWestMeasuredIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
function infillGrafWestMeasuredBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillGrafWestMeasuredIdentity(c)&&!!c.displayEstimates?.infillGrafWestMeasured;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillGrafWestMeasuredIdentity,infillGrafWestMeasuredBaseMaterials};
})();

// infill-frankfurt-skyper.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: a55250880957ed0bf9cf1e62f0f84690d63785bd9ce8427424f35ab3cd8728d7@painted/infill/safety/infill-frankfurt-skyper-data.ts#0:368999
export const infillFrankfurtSkyperMetadata=(()=>{
const MODELS=[{"data":{"identity":{"objectId":"osm/way/60598359","partId":"osm/way/60598359/component/2e89496d691d5f7592b1"}}},{"data":{"identity":{"objectId":"osm/way/174435254","partId":"osm/way/174435254/component/0e987d664368d1e9fe05"}}},{"data":{"identity":{"objectId":"osm/way/174435255","partId":"osm/way/174435255/component/7e67af4168ec658e8aba"}}},{"data":{"identity":{"objectId":"osm/way/174435268","partId":"osm/way/174435268/component/20a45275f3453577277c"}}}];
const infillFrankfurtSkyperIdentity=(c:Identity)=>MODELS.some(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);
function infillFrankfurtSkyperBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&infillFrankfurtSkyperIdentity(c)&&!!c.displayEstimates?.infillFrankfurtSkyperExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtSkyperIdentity,infillFrankfurtSkyperBaseMaterials};
})();

// infill-frankfurt-opernturm.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: c5d4c60e34c637f3a316a0e94af8727c076a1b7e64c558d1a62632f8ce988e83@painted/infill/safety/infill-frankfurt-opernturm.ts#0:79879
export const infillFrankfurtOpernturmMetadata=(()=>{
const ORIGINAL=[{"objectId":"osm/way/117615942","partId":"osm/way/117615942/component/e88791439154757c368d"},{"objectId":"osm/way/317389956","partId":"osm/way/317389956/component/ffa1f85a9bab23c8afb6"}];
const infillOpernturmIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const INFILL_OPERNTURM_SHA="c5d4c60e34c637f3a316a0e94af8727c076a1b7e64c558d1a62632f8ce988e83";
function infillOpernturmBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillOpernturmExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillOpernturmIdentity,infillOpernturmBaseMaterials,INFILL_OPERNTURM_SHA};
})();

// infill-frankfurt-spin.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 24fc58c8902bb69479d6c4654d5f184554c45b1fb8f9880b89a5d48b919d1aba@painted/infill/safety/infill-frankfurt-spin-data.ts#0:166607
export const infillFrankfurtSpinMetadata=(()=>{
const MODELS=[{"data":{"identity":{"objectId":"osm/way/1215964081","partId":"osm/way/1215964081/component/b9fe0137bc98082f9963"}}},{"data":{"identity":{"objectId":"osm/way/1347922252","partId":"osm/way/1347922252/component/2ba1c14934bcb22151ae"}}}];
const infillFrankfurtSpinIdentity=(c:Identity)=>MODELS.some(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);
function infillFrankfurtSpinBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&infillFrankfurtSpinIdentity(c)&&!!c.displayEstimates?.infillFrankfurtSpinExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtSpinIdentity,infillFrankfurtSpinBaseMaterials};
})();

// infill-frankfurt-one.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 7f8dd1671f98e5f66ddb7a4d70c938fee3cb3c37ccd2d9c0989895fa694cfbc3@painted/infill/safety/infill-frankfurt-one.ts#0:209904
export const infillFrankfurtOneMetadata=(()=>{
const ORIGINAL=[{"objectId":"osm/way/611609332","partId":"osm/way/611609332/component/ec51d31e034bebd542b0"}];
const infillOneIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const INFILL_ONE_SHA="7f8dd1671f98e5f66ddb7a4d70c938fee3cb3c37ccd2d9c0989895fa694cfbc3";
function infillOneBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillOneExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillOneIdentity,infillOneBaseMaterials,INFILL_ONE_SHA};
})();

// infill-frankfurt-boersenplatz-block.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 2cc40524aee81a87c1d98335f90c5de643c6f85595b36ab6d4ffea2dc63920ba@painted/infill/safety/infill-frankfurt-boersenplatz-block.ts#0:1092363
export const infillFrankfurtBoersenplatzBlockMetadata=(()=>{
const ORIGINAL=[{"objectId":"osm/relation/1110393","partId":"osm/relation/1110393/component/9b722addc59a4f0e2bdc"},{"objectId":"osm/way/1283538709","partId":"osm/way/1283538709/component/6d7e6568ae096d6f1a4f"},{"objectId":"osm/way/1283538710","partId":"osm/way/1283538710/component/90b459148c1d554e298e"},{"objectId":"osm/way/1283538711","partId":"osm/way/1283538711/component/6637e615e36b49cb38fe"},{"objectId":"osm/way/174644805","partId":"osm/way/174644805/component/7bee07c212ecc0f14a00"},{"objectId":"osm/way/174644809","partId":"osm/way/174644809/component/79d5749996e5a5e3e251"},{"objectId":"osm/way/174644826","partId":"osm/way/174644826/component/159f0a4a189dbadf7f5a"},{"objectId":"osm/way/174644834","partId":"osm/way/174644834/component/f2349c2953dc0eb8cf78"},{"objectId":"osm/way/174644838","partId":"osm/way/174644838/component/fdba08852d1919cb4924"},{"objectId":"osm/way/174644844","partId":"osm/way/174644844/component/66f637c83dca6a6dcd07"},{"objectId":"osm/way/174644850","partId":"osm/way/174644850/component/7a0e560b8d3fb5b6c275"},{"objectId":"osm/way/174644853","partId":"osm/way/174644853/component/068060d20a6dea38afdd"},{"objectId":"osm/way/174644858","partId":"osm/way/174644858/component/775ec676835e70303db6"}];
const infillBoersenplatzBlockIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const INFILL_BOERSENPLATZ_BLOCK_SHA="2cc40524aee81a87c1d98335f90c5de643c6f85595b36ab6d4ffea2dc63920ba";
function infillBoersenplatzBlockBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillBoersenplatzBlockExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillBoersenplatzBlockIdentity,infillBoersenplatzBlockBaseMaterials,INFILL_BOERSENPLATZ_BLOCK_SHA};
})();

// infill-frankfurt-westendgate.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: c26587aba1ebcf3df23cd7c24da4280698faa80e1f70fdcf081e2f4d8f55f2a1@painted/infill/safety/infill-frankfurt-westendgate-data.ts#0:289273
export const infillFrankfurtWestendgateMetadata=(()=>{
const MODELS=[{"data":{"identity":{"objectId":"osm/way/269604841","partId":"osm/way/269604841/component/8f5ff4603b58c6bb80c9"}}},{"data":{"identity":{"objectId":"osm/way/279728730","partId":"osm/way/279728730/component/19c90d425f6775eaaab8"}}},{"data":{"identity":{"objectId":"osm/way/279729155","partId":"osm/way/279729155/component/9db2c9f6ff195e9c3eaf"}}},{"data":{"identity":{"objectId":"osm/way/279729157","partId":"osm/way/279729157/component/2050cdf6eff32530087f"}}},{"data":{"identity":{"objectId":"osm/way/1128278502","partId":"osm/way/1128278502/component/c94a4092c120d9ec508c"}}},{"data":{"identity":{"objectId":"osm/way/23916228","partId":"osm/way/23916228/component/9503ba2a6e2adc5b9a63"}}}];
const infillFrankfurtWestendgateIdentity=(c:Identity)=>MODELS.some(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);
function infillFrankfurtWestendgateBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&infillFrankfurtWestendgateIdentity(c)&&!!c.displayEstimates?.infillFrankfurtWestendgateExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtWestendgateIdentity,infillFrankfurtWestendgateBaseMaterials};
})();

// infill-frankfurt-myzeil.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 9ffe2718c05d4d1415ee1104f54ba85a450a41e751b2a2f418fd21caf24177c7@painted/infill/safety/infill-frankfurt-myzeil.ts#0:2257226
export const infillFrankfurtMyzeilMetadata=(()=>{
const ORIGINAL=[{"objectId":"osm/way/32318884","partId":"osm/way/32318884/component/9e4414fc97cf809fbaef"},{"objectId":"osm/way/1287202759","partId":"osm/way/1287202759/component/87f3b1d0b07bd4ad79b5"},{"objectId":"osm/way/1287202760","partId":"osm/way/1287202760/component/30941f9700176539e1f1"},{"objectId":"osm/way/1287202761","partId":"osm/way/1287202761/component/6f356288f2e5f223f5c0"},{"objectId":"osm/way/1287202762","partId":"osm/way/1287202762/component/2c41d5519a048dcbebde"},{"objectId":"osm/way/1287202763","partId":"osm/way/1287202763/component/0d99288267d4ea7fc008"}];
const infillMyzeilIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const INFILL_MYZEIL_SHA="9ffe2718c05d4d1415ee1104f54ba85a450a41e751b2a2f418fd21caf24177c7";
function infillMyzeilBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillMyzeilExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillMyzeilIdentity,infillMyzeilBaseMaterials,INFILL_MYZEIL_SHA};
})();

// infill-frankfurt-nextower.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 7c060fabfbf09e8c9863bf9c2b219f72ac30c8b5fdad466f0bfa49d2ab3da94e@painted/infill/safety/infill-frankfurt-nextower-data.ts#0:130299
export const infillFrankfurtNextowerMetadata=(()=>{
const MODELS=[{"data":{"identity":{"objectId":"osm/way/42927746","partId":"osm/way/42927746/component/dd94663131cbb4ca6052"}}}];
const infillFrankfurtNextowerIdentity=(c:Identity)=>MODELS.some(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);
function infillFrankfurtNextowerBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&infillFrankfurtNextowerIdentity(c)&&!!c.displayEstimates?.infillFrankfurtNextowerExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtNextowerIdentity,infillFrankfurtNextowerBaseMaterials};
})();

// infill-frankfurt-deutsche-bank.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: b01705b3b18db9c4c3565e9edbc9a8a9f3df41d2439d1efe9ed519992e559f7e@painted/infill/safety/infill-frankfurt-deutsche-bank-data.ts#0:2172297
export const infillFrankfurtDeutscheBankMetadata=(()=>{
const MODELS=[{"data":{"identity":{"objectId":"osm/way/174461751","partId":"osm/way/174461751/component/72e68a97feeab9a70905"}}},{"data":{"identity":{"objectId":"osm/way/174461752","partId":"osm/way/174461752/component/89c43808797e3c3da7b5"}}},{"data":{"identity":{"objectId":"osm/way/174461753","partId":"osm/way/174461753/component/6d299c87d73e87a70ad2"}}}];
const infillFrankfurtDeutscheBankIdentity=(c:Identity)=>MODELS.some(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);
function infillFrankfurtDeutscheBankBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&infillFrankfurtDeutscheBankIdentity(c)&&!!c.displayEstimates?.infillFrankfurtDeutscheBankExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtDeutscheBankIdentity,infillFrankfurtDeutscheBankBaseMaterials};
})();

// infill-frankfurt-westend1.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: e022d4806497772c05f994008766c58182c3a395645e4ad3053017026d9c445b@painted/infill/safety/infill-frankfurt-westend1.ts#0:185160
export const infillFrankfurtWestend1Metadata=(()=>{
const ORIGINAL=[{"objectId":"osm/way/183069536","partId":"osm/way/183069536/component/0850e3531a4a15133934"},{"objectId":"osm/way/1177171890","partId":"osm/way/1177171890/component/ec449dc38cedfbb5b490"},{"objectId":"osm/way/1177171891","partId":"osm/way/1177171891/component/1dcf21877af9290deaa3"},{"objectId":"osm/way/1177171892","partId":"osm/way/1177171892/component/dce9221b8ac76ae85fc3"},{"objectId":"osm/way/42367719","partId":"osm/way/42367719/component/303f3c4e8ae9bb2738ef"}];
const infillWestend1Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const INFILL_WESTEND1_SHA="e022d4806497772c05f994008766c58182c3a395645e4ad3053017026d9c445b";
function infillWestend1BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillWestend1Exterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillWestend1Identity,infillWestend1BaseMaterials,INFILL_WESTEND1_SHA};
})();

// infill-frankfurt-trianon.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: d3327594651eef7a62f96056a3e30f91be5d590caa188dbbd89b3bcd200a7f47@painted/infill/safety/infill-frankfurt-trianon-data.ts#0:104486
export const infillFrankfurtTrianonMetadata=(()=>{
const MODELS=[{"data":{"identity":{"objectId":"osm/way/174437750","partId":"osm/way/174437750/component/8da12be98a57091a80a2"}}},{"data":{"identity":{"objectId":"osm/way/174437751","partId":"osm/way/174437751/component/0fe5a7728db6883011fa"}}},{"data":{"identity":{"objectId":"osm/way/174437752","partId":"osm/way/174437752/component/c40e96a86388a792f37d"}}},{"data":{"identity":{"objectId":"osm/way/183076912","partId":"osm/way/183076912/component/f74ca366ea974a460de9"}}},{"data":{"identity":{"objectId":"osm/way/11527118","partId":"osm/way/11527118/component/b6472bd7411ec001ba10"}}}];
const infillFrankfurtTrianonIdentity=(c:Identity)=>MODELS.some(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);
function infillFrankfurtTrianonBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&infillFrankfurtTrianonIdentity(c)&&!!c.displayEstimates?.infillFrankfurtTrianonExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtTrianonIdentity,infillFrankfurtTrianonBaseMaterials};
})();

// infill-frankfurt-fbc.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 6ac3a9530ee86a9ccbecbaf642a67371bf1ed44ad774eef36df70a8392874399@painted/infill/safety/infill-frankfurt-fbc-data.ts#0:214034
export const infillFrankfurtFbcMetadata=(()=>{
const MODELS=[{"data":{"identity":{"objectId":"osm/way/174444296","partId":"osm/way/174444296/component/634c9933d4954305e62e"}}},{"data":{"identity":{"objectId":"osm/way/1274898323","partId":"osm/way/1274898323/component/c1ef5687d20b9730b538"}}},{"data":{"identity":{"objectId":"osm/way/11527233","partId":"osm/way/11527233/component/b3c717985b7b2a61a5e8"}}}];
const infillFrankfurtFbcIdentity=(c:Identity)=>MODELS.some(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);
function infillFrankfurtFbcBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&infillFrankfurtFbcIdentity(c)&&!!c.displayEstimates?.infillFrankfurtFbcExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtFbcIdentity,infillFrankfurtFbcBaseMaterials};
})();

// infill-frankfurt-tower185.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: c22de2ff3b4c4468226931b4129393bcef97338f803d62186aff19fb273e6129@painted/infill/safety/infill-frankfurt-tower185.ts#0:189018
export const infillFrankfurtTower185Metadata=(()=>{
const ORIGINAL=[{"objectId":"osm/relation/1462975","partId":"osm/relation/1462975/component/d832c9e58685ef8ba1fa"},{"objectId":"osm/way/86762038","partId":"osm/way/86762038/component/e59519f16aa95ba91f0a"}];
const infillTower185Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const INFILL_TOWER185_SHA="c22de2ff3b4c4468226931b4129393bcef97338f803d62186aff19fb273e6129";
function infillTower185BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillTower185Exterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillTower185Identity,infillTower185BaseMaterials,INFILL_TOWER185_SHA};
})();

// infill-frankfurt-boerse.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 6f6d8006a2d316d2fb6e1d74df76a290c1e86486d5ae7dade9ee26b00c7da7d8@painted/infill/safety/infill-frankfurt-boerse.ts#0:361163
export const infillFrankfurtBoerseMetadata=(()=>{
const ORIGINAL=[{"objectId":"osm/way/15951155","partId":"osm/way/15951155/component/6d8ffc49192159a092b2"}];
const infillBoerseIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const INFILL_BOERSE_SHA="6f6d8006a2d316d2fb6e1d74df76a290c1e86486d5ae7dade9ee26b00c7da7d8";
function infillBoerseBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillBoerseExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillBoerseIdentity,infillBoerseBaseMaterials,INFILL_BOERSE_SHA};
})();

// infill-stuttgart-graf-geiss.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: ed977cf90941507c51df5a1e54d348d13fb474f49651c093a835f87214297c4b@painted/infill/safety/infill-stuttgart-graf-geiss.ts#0:465065
export const infillStuttgartGrafGeissMetadata=(()=>{
const IDS=[{"objectId":"osm/way/108749486","partId":"osm/way/108749486/component/f0136f5b46f6cb997bb4"},{"objectId":"osm/way/108749484","partId":"osm/way/108749484/component/64bdbb3205ac5ada0adf"},{"objectId":"osm/way/325279514","partId":"osm/way/325279514/component/560a1800cde01fe5544c"},{"objectId":"osm/way/108749495","partId":"osm/way/108749495/component/4d700cb34765b5f124cd"},{"objectId":"osm/way/325279507","partId":"osm/way/325279507/component/57ec2e9bae6ab534d3e1"},{"objectId":"osm/way/108749498","partId":"osm/way/108749498/component/25c3ab7535489e6831aa"},{"objectId":"osm/way/962686240","partId":"osm/way/962686240/component/2b8d13060d0b38cb2067"},{"objectId":"osm/way/507955889","partId":"osm/way/507955889/component/4b1c19ae463875c3aaa2"}];
const infillGrafGeissIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
function infillGrafGeissBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillGrafGeissIdentity(c)&&!!c.displayEstimates?.infillGrafGeiss;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillGrafGeissIdentity,infillGrafGeissBaseMaterials};
})();

// infill-stuttgart-graf-rear.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 8ea1605c41f10bbe1be0ceb2135098a5784294623865c8098efdd396430db77f@painted/infill/safety/infill-stuttgart-graf-rear.ts#0:175065
export const infillStuttgartGrafRearMetadata=(()=>{
const IDS=[{"objectId":"osm/way/108749487","partId":"osm/way/108749487/component/b45926ff55214cdfc740"},{"objectId":"osm/way/108749491","partId":"osm/way/108749491/component/518877d8df223467a38d"},{"objectId":"osm/way/325279527","partId":"osm/way/325279527/component/eb6f4a90850de9502f1b"},{"objectId":"osm/way/108749496","partId":"osm/way/108749496/component/952a9ad1a8b2d4801a9e"},{"objectId":"osm/way/108749502","partId":"osm/way/108749502/component/16ecf4bba0dee9fd2fb3"},{"objectId":"osm/way/325279530","partId":"osm/way/325279530/component/2de7600ab21328610bfd"},{"objectId":"osm/way/962686239","partId":"osm/way/962686239/component/f64a4e34c15b95a7475b"}];
const infillGrafRearIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
function infillGrafRearBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillGrafRearIdentity(c)&&!!c.displayEstimates?.infillGrafRear;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillGrafRearIdentity,infillGrafRearBaseMaterials};
})();

// infill-stuttgart-koenigsbau-repair.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: f404174fe8cf49098998e88a339d9e383433043b631f39391e88b0342b8e03d8@painted/infill/safety/infill-stuttgart-koenigsbau-repair.ts#0:4127679
export const infillStuttgartKoenigsbauRepairMetadata=(()=>{
const IDS=[{"objectId":"osm/way/9414673","partId":"osm/way/9414673/component/88392e74fa5b3e45c6cd"}];
const infillKoenigsbauRepairIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
function infillKoenigsbauRepairBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillKoenigsbauRepairIdentity(c)&&!!c.displayEstimates?.infillKoenigsbauRepair;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillKoenigsbauRepairIdentity,infillKoenigsbauRepairBaseMaterials};
})();

// infill-stuttgart-wlb-old.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 79748f5030b671f32c3b4f6033b5b3b88033c58fa8be93b8e2f112f7a79ee145@painted/infill/safety/infill-stuttgart-wlb-old.ts#0:105779
export const infillStuttgartWlbOldMetadata=(()=>{
const IDS=[{"objectId":"osm/way/10075279","partId":"osm/way/10075279/component/e25f446e02e0d4d74972"}];
const infillWlbOldIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
function infillWlbOldBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillWlbOldIdentity(c)&&!!c.displayEstimates?.infillWlbOld;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillWlbOldIdentity,infillWlbOldBaseMaterials};
})();

// infill-stuttgart-wlb-extension.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: bc811b7bc5fcf7eced57a914d31625f4937c5916d6246cdcaaf9b9ff94048a5f@painted/infill/safety/infill-stuttgart-wlb-extension.ts#0:434389
export const infillStuttgartWlbExtensionMetadata=(()=>{
const IDS=[{"objectId":"osm/way/376770500","partId":"osm/way/376770500/component/2879fe511841ff6b4be9"},{"objectId":"osm/way/376770430","partId":"osm/way/376770430/component/a6b4cfb30ee4fba564b1"},{"objectId":"osm/way/376770395","partId":"osm/way/376770395/component/1a59fee55e0493ddf543"}];
const infillWlbExtensionIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
function infillWlbExtensionBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillWlbExtensionIdentity(c)&&!!c.displayEstimates?.infillWlbExtension;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillWlbExtensionIdentity,infillWlbExtensionBaseMaterials};
})();

// infill-frankfurt-ecb.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: af3e13e1cd8e809523025cf8f259ce8cba824c22f5e14bb5d2a6935d51d0977b@painted/infill/safety/infill-frankfurt-ecb.ts#0:905067
export const infillFrankfurtEcbMetadata=(()=>{
const ORIGINAL=[{"objectId":"osm/way/156432555","partId":"osm/way/156432555/component/608807af674bae1b161b"}];
const infillEcbIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const INFILL_ECB_SHA="af3e13e1cd8e809523025cf8f259ce8cba824c22f5e14bb5d2a6935d51d0977b";
function infillEcbBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillEcbExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillEcbIdentity,infillEcbBaseMaterials,INFILL_ECB_SHA};
})();

// infill-frankfurt-towers.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 3855be2a6e9815457edb180d502827d466a2431ff1b683651651376c6e9c2d2e@painted/infill/safety/infill-frankfurt-messeturm-data.ts#0:375974
export const infillFrankfurtTowersMetadata=(()=>{
const MODELS=[{"data":{"identity":{"objectId":"osm/way/23916129","partId":"osm/way/23916129/component/25439782f9aeec041316"}}}];
const infillFrankfurtIdentity=(c:Identity)=>MODELS.some(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);
function infillFrankfurtBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&infillFrankfurtIdentity(c)&&!!c.displayEstimates?.infillFrankfurtExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtIdentity,infillFrankfurtBaseMaterials};
})();

// infill-frankfurt-east.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: c0e71dd8105d4748872ec097b42a2ebb8093b24c8c2d98278b8c9d5d93295341@painted/infill/safety/infill-frankfurt-main-plaza-data.ts#0:497463; 64a2e55ebdba2f5215373744b7570eb4f2526b613c3d4df35a416a26c5f38987@painted/infill/safety/infill-frankfurt-colosseo-data.ts#0:4399682
export const infillFrankfurtEastMetadata=(()=>{
const MODELS=[{"data":{"identity":{"objectId":"osm/way/28269144","partId":"osm/way/28269144/component/6463c3a2861e251b2035"}}},{"data":{"identity":{"objectId":"osm/way/28359490","partId":"osm/way/28359490/component/6bc060b0c533d4739f1c"}}},{"data":{"identity":{"objectId":"osm/way/827425009","partId":"osm/way/827425009/component/c73d84b5e040a5e1b648"}}},{"data":{"identity":{"objectId":"osm/relation/123836","partId":"osm/relation/123836/component/a8e444e1fe911e39ca5a"}}}];
const infillFrankfurtEastIdentity=(c:Identity)=>MODELS.some(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);
function infillFrankfurtEastBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&infillFrankfurtEastIdentity(c)&&!!c.displayEstimates?.infillFrankfurtExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtEastIdentity,infillFrankfurtEastBaseMaterials};
})();

// infill-stuttgart-schauspielhaus.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 27cfa05474a44c35cd9ba9e0219cc74fe315fc10b7d4395faff53d304a4e9572@painted/infill/safety/infill-stuttgart-schauspielhaus.ts#0:255330
export const infillStuttgartSchauspielhausMetadata=(()=>{
const infillSchauspielhausIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='stuttgart')&&INFILL_SCHAUSPIELHAUS_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
const infillSchauspielhausDerivedIdentity=(_c:Identity)=>false;
const INFILL_SCHAUSPIELHAUS_SHA="27cfa05474a44c35cd9ba9e0219cc74fe315fc10b7d4395faff53d304a4e9572";
const INFILL_SCHAUSPIELHAUS_IDS=[{"city":"stuttgart","objectId":"osm/way/452125930","partId":"osm/way/452125930/component/09a9bfd12838ce4d7fda","signature":"07575576"},{"city":"stuttgart","objectId":"osm/way/452125929","partId":"osm/way/452125929/component/dbca4eec2c0eccb3924e","signature":"0e4f7a56"}];
function infillSchauspielhausBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillSchauspielhausIdentity(c)&&!!c.displayEstimates?.infillSchauspielhausExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillSchauspielhausIdentity,infillSchauspielhausDerivedIdentity,infillSchauspielhausBaseMaterials,INFILL_SCHAUSPIELHAUS_SHA,INFILL_SCHAUSPIELHAUS_IDS};
})();

// infill-stuttgart-koenigsbau-passagen.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: e9af1f8aaecd6d9f43102ac5344f3b5d9efb9b0a98d760e2e5cbf3532a1abf4d@painted/infill/safety/infill-stuttgart-koenigsbau-passagen.ts#0:200504
export const infillStuttgartKoenigsbauPassagenMetadata=(()=>{
const IDS=[{"objectId":"osm/way/90843417","partId":"osm/way/90843417/component/d509eade3b4f0de96836"},{"objectId":"osm/way/125911893","partId":"osm/way/125911893/component/6538462852728bd2e379"},{"objectId":"osm/way/903176798","partId":"osm/way/903176798/component/2918c494514bad66c17e"}];
const infillKoenigsbauPassagenIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
function infillKoenigsbauPassagenBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillKoenigsbauPassagenIdentity(c)&&!!c.displayEstimates?.infillKoenigsbauPassagen;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillKoenigsbauPassagenIdentity,infillKoenigsbauPassagenBaseMaterials};
})();

// infill-stuttgart-gustav.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 7871b70bab080e541033278899a939ea388094c8aea0caed50f1af1cdd05e611@painted/infill/safety/infill-stuttgart-gustav.ts#0:230018
export const infillStuttgartGustavMetadata=(()=>{
const IDS=[{"objectId":"osm/way/9895058","partId":"osm/way/9895058/component/050b904c662c42bce590"}];
const infillGustavIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
function infillGustavBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillGustavIdentity(c)&&!!c.displayEstimates?.infillGustav;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillGustavIdentity,infillGustavBaseMaterials};
})();

// infill-stuttgart-hmdk.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 1c52407d411654c9d9057c0be1f6e701d4a2ec0c816ec1a95974bc80051eac55@painted/infill/safety/infill-stuttgart-hmdk.ts#0:2879775
export const infillStuttgartHmdkMetadata=(()=>{
const IDS=[{"objectId":"osm/way/28138694","partId":"osm/way/28138694/component/02c0c3b7218fb30bba78"}];
const infillHmdkIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
function infillHmdkBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillHmdkIdentity(c)&&!!c.displayEstimates?.infillHmdk;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillHmdkIdentity,infillHmdkBaseMaterials};
})();

// infill-stuttgart-katharina.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 58ae798da0318682c697550c7686131b523ee429c8cf0c8fb957dea6fa8511bc@painted/infill/safety/infill-stuttgart-katharina.ts#0:72931
export const infillStuttgartKatharinaMetadata=(()=>{
const IDS=[{"objectId":"osm/way/9713208","partId":"osm/way/9713208/component/8792324fbd521629047a"}];
const infillKatharinaIdentity=(c:Identity)=>IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
function infillKatharinaBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='stuttgart'&&infillKatharinaIdentity(c)&&!!c.displayEstimates?.infillKatharina;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillKatharinaIdentity,infillKatharinaBaseMaterials};
})();

// infill-philharmonie-reconstruction.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: acf5ba08fcfd80bed5324c0dc2df3a0225ed8a9f3129c619f1daab132b779cf2@painted/infill/safety/infill-philharmonie-reconstruction.ts#0:107104
export const infillPhilharmonieReconstructionMetadata=(()=>{
const ORIGINAL=[{"objectId":"osm/way/25716223","partId":"osm/way/25716223/component/7e2f0dcda744934c84af"},{"objectId":"osm/way/1214067099","partId":"osm/way/1214067099/component/04b654ee7924da3dc83f"},{"objectId":"osm/way/1214067105","partId":"osm/way/1214067105/component/d4c4fbe45f8290cdf098"},{"objectId":"osm/way/1214067107","partId":"osm/way/1214067107/component/9d3d9677cff462900d67"},{"objectId":"osm/way/1214067106","partId":"osm/way/1214067106/component/4a4d469dddaeab7d7d2d"}];
const infillPhilharmonieIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='essen')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const INFILL_PHILHARMONIE_SHA="acf5ba08fcfd80bed5324c0dc2df3a0225ed8a9f3129c619f1daab132b779cf2";
function infillPhilharmonieBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='essen'&&!!c.displayEstimates?.infillPhilharmonieExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);for(let vertex=0;vertex<count;vertex++){frames[(offset+vertex)*5+2]=b.positions[vertex*3];frames[(offset+vertex)*5+3]=b.positions[vertex*3+2];}paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillPhilharmonieIdentity,infillPhilharmonieBaseMaterials,INFILL_PHILHARMONIE_SHA};
})();

// infill-essen-reconstruction.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: e71eb51d1b047dae0f69defd40dc86cbb4d77cf6b0dfacb165f27553221b1e45@painted/infill/safety/infill-essen-reconstruction.ts#0:155745
export const infillEssenReconstructionMetadata=(()=>{
const DISPLAY={"objectId":"osm/way/114669129","partId":"osm/way/114669129/surface"};
const towerSource={"objectId":"osm/way/303835932","partId":"osm/way/303835932/component/2832660d4be51576c190"};
const infillEssenIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='essen')&&((c.objectId==='osm/way/114669129'&&c.partId===DISPLAY.partId)||(c.objectId===towerSource.objectId&&c.partId===towerSource.partId));
const infillEssenDerivedIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='essen')&&c.objectId===DISPLAY.objectId&&c.partId===DISPLAY.objectId+'/surface';
const INFILL_ESSEN_SHA="e71eb51d1b047dae0f69defd40dc86cbb4d77cf6b0dfacb165f27553221b1e45";
function infillEssenBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='essen'&&!!c.displayEstimates?.infillEssenExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);for(let vertex=0;vertex<count;vertex++){frames[(offset+vertex)*5+2]=b.positions[vertex*3];frames[(offset+vertex)*5+3]=b.positions[vertex*3+2];}paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillEssenIdentity,infillEssenDerivedIdentity,infillEssenBaseMaterials,INFILL_ESSEN_SHA};
})();

// infill-synagoge-reconstruction.ts — identity bodies and data-independent material bodies retained.
// Bound canonical inputs: 884a5230c8385146354e876296f429bc1d5e99da2f7f58a977eaa8a53d362ecc@painted/infill/safety/infill-synagoge-reconstruction.ts#0:845146; 430157f3e3cca56f8100e852ba513f4e492392c2c281f68cd25813ce178542ce@painted/infill/safety/infill-synagoge-reconstruction.ts#0:224593
export const infillSynagogeReconstructionMetadata=(()=>{
const ORIGINAL=[{"objectId":"osm/way/56149749","partId":"osm/way/56149749/component/b65c859fbb86943f0cff"},{"objectId":"osm/way/439374680","partId":"osm/way/439374680/component/c053bc69aff58e9a18c5"},{"objectId":"osm/way/439374681","partId":"osm/way/439374681/component/4592afb023f254356a34"},{"objectId":"osm/way/439374684","partId":"osm/way/439374684/component/0acfa7ab2c74d38845fb"},{"objectId":"osm/way/439690121","partId":"osm/way/439690121/component/f835905aec63b3580a7f"},{"objectId":"osm/way/439374667","partId":"osm/way/439374667/component/fbd9c16b16f88a773d93"},{"objectId":"osm/way/439374673","partId":"osm/way/439374673/component/21f35f1b7c5919dd5d75"},{"objectId":"osm/way/439374675","partId":"osm/way/439374675/component/c8ce2b571d88ede8a218"},{"objectId":"osm/way/439374676","partId":"osm/way/439374676/component/4268595a7aa8f73b18e3"},{"objectId":"osm/way/439374677","partId":"osm/way/439374677/component/c917b8287250fd4e8fef"},{"objectId":"osm/way/439374679","partId":"osm/way/439374679/component/ce68c61e087676dbfd7e"},{"objectId":"osm/way/439374682","partId":"osm/way/439374682/component/fbd7525b9cc6bc03ad3e"},{"objectId":"osm/way/439374683","partId":"osm/way/439374683/component/a1d0b70d7921be804f16"},{"objectId":"osm/way/439374685","partId":"osm/way/439374685/component/13956b89692974763161"},{"objectId":"osm/way/439374686","partId":"osm/way/439374686/component/9b168843cfb12323ad16"},{"objectId":"osm/way/439690118","partId":"osm/way/439690118/component/7b03a06b45505e6d42d9"},{"objectId":"osm/way/439690119","partId":"osm/way/439690119/component/7b1295e14a88be8291c0"},{"objectId":"osm/way/439690120","partId":"osm/way/439690120/component/771fa263a619b353ea37"},{"objectId":"osm/way/439690123","partId":"osm/way/439690123/component/819bd9330f5d8087cfc7"}];
const infillSynagogeIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='essen')&&ORIGINAL.some(s=>s.objectId===c.objectId&&s.partId===c.partId);
const INFILL_SYNAGOGE_SHA="884a5230c8385146354e876296f429bc1d5e99da2f7f58a977eaa8a53d362ecc";
function infillSynagogeBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='essen'&&!!c.displayEstimates?.infillSynagogeExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
return{infillSynagogeIdentity,infillSynagogeBaseMaterials,INFILL_SYNAGOGE_SHA};
})();

// Bremen-local Junghof088: original identity and material bodies retained.
// Bound canonical input: 38117f39c693dd0efb8b4995c9d31448ca5a0a8514ca9287cb0fc493ce8678e2@painted/infill/safety/infill-frankfurt-junghof088-data.ts#0:7614515
export const infillFrankfurtJunghof088Metadata=(()=>{
const GROUPS=[{"models":[{"identity":{"objectId":"osm/way/72897065","partId":"osm/way/72897065/component/9adda723c85fa78c2615"}},{"identity":{"objectId":"osm/way/72897066","partId":"osm/way/72897066/component/78cf11002bbc4836a7fc"}},{"identity":{"objectId":"osm/way/247834199","partId":"osm/way/247834199/component/988a99ce631eaccdaa38"}},{"identity":{"objectId":"osm/way/247834200","partId":"osm/way/247834200/component/5b45b8028071bde616ee"}}]}];
const infillFrankfurtJunghof088Identity=(c:Identity)=>GROUPS.some(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));
function infillFrankfurtJunghof088BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillFrankfurtJunghof088;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}
return{infillFrankfurtJunghof088Identity,infillFrankfurtJunghof088BaseMaterials};
})();
