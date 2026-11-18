import type {RegionalAsset} from './environment-regional-source';
import type {RingWireBinding} from './environment-shared-display-wire.mjs';
import {SHARED_DISPLAY_CONTRACT} from './environment-shared-display-contract.mjs';
export type SharedDisplayEntry=Readonly<{city:string;id:string;asset:RegionalAsset;trusted:RingWireBinding}>;
export type SharedDisplayCatalog=Readonly<{entries:readonly SharedDisplayEntry[];inputBundleSHA256:string}>;
const SHA=/^[a-f0-9]{64}$/;
function need(value:unknown,message:string):asserts value{if(!value)throw Error('Shared display catalog: '+message);}
/** The caller must retain the verified metadata borrow for the complete GPU transaction.
 * This validates an independent display supplement; it never changes source partition membership. */
export function inspectSharedDisplayCatalog(value:unknown,expected:{city:string;source_pbf_sha256:string;source_boundary_sha256:string;source_snapshot:string}):SharedDisplayCatalog{
 const v=value as Record<string,any>;
 need(v&&v.schema==='crimemaps-shared-display-supplement-catalog-v1','explicit schema');
 need(v.city===expected.city&&v.source?.city===expected.city&&v.source.sourceSHA256===expected.source_pbf_sha256&&v.source.boundarySHA256===expected.source_boundary_sha256&&v.source.snapshot===expected.source_snapshot,'source generation');
 need(v.sourcePartitionUnchanged===true&&v.sourceHeldPreserved===true&&v.sourceHeldCleared===false,'source restrictions retained');
 need(SHA.test(v.inputPackage?.sha256)&&SHA.test(v.full19IdentityManifestSHA256)&&SHA.test(v.sourceBindingProof?.sha256),'source proof bindings');
 need(Array.isArray(v.entries)&&v.entries.length>0&&v.entries.length<=19,'bounded entries');
 const ids=new Set<string>(),ordinals=new Set<number>(),paths=new Set<string>();
 const entries=v.entries.map((e:any)=>{
  const t=e?.trusted,a=e?.asset;
  need(e?.city===expected.city&&typeof e.id==='string'&&/^osm\/(way|relation)\/[1-9]\d*$/.test(e.id)&&!ids.has(e.id),'unique source identity');
  need(t&&t.city===expected.city&&t.featureId===e.id&&t.boundarySHA256===expected.source_boundary_sha256&&t.inputBundleSHA256===v.inputPackage.sha256,'trusted identity');
  need(e.binding?.city===expected.city&&e.binding.sourceSHA256===expected.source_pbf_sha256&&e.binding.boundarySHA256===expected.source_boundary_sha256&&e.binding.snapshot===expected.source_snapshot,'entry generation');
  need(Number.isSafeInteger(t.manifestOrdinal)&&t.manifestOrdinal>=0&&t.manifestOrdinal<19&&!ordinals.has(t.manifestOrdinal),'unique manifest ordinal');
  need(a&&typeof a.path==='string'&&a.path.startsWith('/safety/environment/'+expected.city+'/')&&!paths.has(a.path)&&a.sha256===t.sha256&&a.bytes===t.bytes&&a.compression===undefined,'exact wire Asset');
  need(SHA.test(t.domainSHA256)&&SHA.test(t.positionsSHA256)&&e.expectedDomain?.contract===SHARED_DISPLAY_CONTRACT,'domain contract');
  ids.add(e.id);ordinals.add(t.manifestOrdinal);paths.add(a.path);return Object.freeze({city:e.city,id:e.id,asset:a as RegionalAsset,trusted:t as RingWireBinding});
 });
 return Object.freeze({entries:Object.freeze(entries),inputBundleSHA256:v.inputPackage.sha256});
}
