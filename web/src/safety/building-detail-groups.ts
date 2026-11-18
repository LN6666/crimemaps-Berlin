import type {BuildingDetailResource} from './building-detail-demand';
import type {NativeSourceResult} from './shared-native-source';

type Row = Record<string, unknown>;
export type BuildingDetailPackingGroup = Readonly<{
 key: string; componentIndices: readonly number[]; anchor: readonly [number, number];
 unit: 'meter'; publicationConstraintKey: string; authority: Readonly<Row>;
 geometryRole: 'canonical' | 'display-variant'; vertices: number; indices: number; triangles: number;
}>;
export type BuildingDetailGroupConstraint = Readonly<{
 key: string; componentIndices: readonly number[]; objectId: string;
 completeAcrossLeaves: false; closure: 'requires-runtime-cohort'; mayPublishIndependently: false;
 canonicalOnly: boolean;
}>;
export type BuildingDetailGroups = Readonly<{
 key: string; level: BuildingDetailResource['level']; geometrySHA256: string;
 coordinateFrame: Readonly<Row>; packingGroups: readonly BuildingDetailPackingGroup[];
 publicationConstraints: readonly BuildingDetailGroupConstraint[];
}>;
const SHA = /^[a-f0-9]{64}$/;
function row(value: unknown, label: string): Row {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid detail group ' + label);
 return value as Row;
}
function require(condition: unknown, label: string): asserts condition { if (!condition) throw Error('Invalid detail group ' + label); }
function sha(value: unknown): string { require(typeof value === 'string' && SHA.test(value), 'content key'); return value; }
function integer(value: unknown, label: string): number { require(Number.isSafeInteger(value) && (value as number) >= 0, label); return value as number; }
function indices(value: unknown, length: number): number[] {
 require(Array.isArray(value) && value.length > 0 && value.length <= length, 'component membership');
 const result = value.map(v => integer(v, 'component index'));
 require(new Set(result).size === result.length && result.every(v => v < length), 'duplicate/out of bounds membership');
 return result;
}
function authority(value: unknown, resource: BuildingDetailResource) {
 const result = row(value, 'authority');
 require(result.canonicalIndexSHA256 === resource.canonicalIndexSHA256 && result.canonicalLeafSHA256 === resource.canonicalLeafSHA256, 'canonical authority');
 for (const key of ['sourcePBFSHA256', 'boundarySHA256', 'compilerSHA256', 'sourceSnapshot', 'materialSHA256', 'protectionSHA256', 'sourceEquivalenceSHA256'] as const)
  require(result[key] === resource.bindings[key], key + ' authority');
 return result;
}
/** Metadata is already transport-hash verified. Validate the selected source's
 * actual membership and layouts; a packing group never certifies cohort closure. */
export function parseBuildingDetailGroups(value: unknown, resource: BuildingDetailResource, source: NativeSourceResult['raw']): BuildingDetailGroups {
 const raw = row(value, 'document'), count = resource.componentCount;
 require(raw.schema === 'crimemaps-building-detail-groups-v1' && raw.schemaVersion === 1 && raw.city === resource.city, 'schema/city');
 const key = sha(raw.key); authority(raw.authority, resource);
 const frame = row(raw.coordinateFrame, 'coordinate frame'), axes = row(frame.axes, 'axes');
 require(frame.schema === 'source-local-mercator-meters-v1' && frame.unit === 'meter' && axes.x === 'east' && axes.y === 'up' && axes.z === 'north' &&
  frame.anchorPrecision === 'float64' && frame.arithmetic === 'double-source-origin-minus-stable-anchor-before-float32' &&
  frame.earthCircumferenceM === 2 * Math.PI * 6378137, 'coordinate frame authority');
 require(Array.isArray(raw.canonicalComponents) && raw.canonicalComponents.length === count && source.components.length === count, 'canonical member count');
 raw.canonicalComponents.forEach((v, i) => {
  const c = row(v, 'canonical member'), expected = resource.components[i];
  require(c.componentIndex === i && c.city === resource.city && c.objectId === expected.objectId && c.partId === expected.partId &&
   Array.isArray(c.origin) && c.origin.length === 2 && c.origin.every((n, axis) => n === expected.origin[axis]), 'canonical member identity');
 });
 require(Array.isArray(raw.publicationConstraints) && raw.publicationConstraints.length > 0 && raw.publicationConstraints.length <= count, 'publication constraints');
 const constraints = raw.publicationConstraints.map(v => {
  const c = row(v, 'publication constraint'), members = indices(c.observedComponentIndices, count), object = row(c.sourceObject, 'source object');
  require(object.city === resource.city && typeof object.objectId === 'string' && members.every(i => resource.components[i].objectId === object.objectId), 'source object membership');
  require(c.completeAcrossLeaves === false && c.closure === 'requires-runtime-cohort' && c.mayPublishIndependently === false && typeof c.canonicalOnly === 'boolean', 'unproven cohort closure');
  return Object.freeze({key: sha(c.key), componentIndices: Object.freeze(members), objectId: object.objectId,
   completeAcrossLeaves: false as const, closure: 'requires-runtime-cohort' as const, mayPublishIndependently: false as const, canonicalOnly: c.canonicalOnly});
 });
 const constraintMap = new Map(constraints.map(c => [c.key, c]));
 require(constraintMap.size === constraints.length, 'duplicate cohort constraint');
 require(Array.isArray(raw.levels) && raw.levels.length > 0 && raw.levels.length <= 3, 'levels');
 const matches = raw.levels.map(v => row(v, 'level')).filter(v => v.level === resource.level);
 require(matches.length === 1, 'selected level');
 const level = matches[0];
 if (level.asset !== undefined) {
  const asset = row(level.asset, 'selected asset');
  for (const field of ['path', 'sha256', 'bytes', 'compression', 'uncompressed_bytes', 'uncompressed_sha256'] as const) require(asset[field] === resource.descriptor[field], 'selected asset binding');
 }
 require(level.geometrySHA256 === resource.geometrySHA256 && level.sourceEquivalenceSHA256 === resource.bindings.sourceEquivalenceSHA256 &&
  level.componentCount === count && level.vertices === resource.vertices && level.triangles === resource.triangles && level.indices === resource.triangles * 3, 'selected geometry authority');
 require(Array.isArray(level.packingGroups) && level.packingGroups.length > 0 && level.packingGroups.length <= count, 'packing groups');
 const covered = new Set<number>();
 const groups = level.packingGroups.map(v => {
  const group = row(v, 'packing group'), members = indices(group.componentIndices, count), constraintKey = sha(group.publicationConstraintKey), constraint = constraintMap.get(constraintKey);
  require(group.kind === 'physical-packing-group' && group.unit === 'meter' && group.level === resource.level && constraint &&
   constraint.componentIndices.length === members.length && constraint.componentIndices.every((n, i) => n === members[i]), 'packing/cohort relationship');
  require((group.geometryRole === 'canonical' || group.geometryRole === 'display-variant') &&
   (resource.level !== 'near' || group.geometryRole === 'canonical') && (!constraint.canonicalOnly || group.geometryRole === 'canonical'), 'actual geometry role');
  const binding = authority(group.authority, resource); sha(binding.selectedGeometrySHA256);
  require(Array.isArray(group.anchor) && group.anchor.length === 2 && group.anchor.every((n, axis) => n === resource.components[members[0]].origin[axis]), 'stable source anchor');
  require(Array.isArray(group.componentRanges) && group.componentRanges.length === members.length, 'complete component ranges');
  let vertices = 0, elements = 0;
  group.componentRanges.forEach((v, r) => {
   const range = row(v, 'component range'), index = members[r], component = source.components[index];
   require(!covered.has(index), 'overlapping physical groups'); covered.add(index);
   require(range.componentIndex === index && range.objectId === component.objectId && range.partId === component.partId &&
    range.packedVertexOffset === vertices && range.packedIndexOffset === elements, 'component range identity/offset');
   require(Array.isArray(range.batchSpans) && range.batchSpans.length === component.batches.length, 'whole component batches');
   let localVertices = 0, localElements = 0;
   range.batchSpans.forEach((v, b) => {
    const span = row(v, 'batch span'), batch = component.batches[b], batchVertices = batch.positions.length / 3;
    require(span.componentIndex === index && span.batchIndex === b && span.sourceIndexBase === 'batch-local' && span.vertexCount === batchVertices &&
     span.indexCount === batch.indices.length && span.packedVertexOffset === vertices && span.packedIndexOffset === elements, 'actual batch layout');
    sha(span.positionsSHA256); sha(span.normalsSHA256); sha(span.indicesSHA256); sha(span.materialMetadataSHA256);
    vertices += batchVertices; elements += batch.indices.length; localVertices += batchVertices; localElements += batch.indices.length;
   });
   require(range.vertexCount === localVertices && range.indexCount === localElements, 'actual component layout');
  });
  require(group.vertices === vertices && group.indices === elements && group.triangles === elements / 3, 'actual packed allocation');
  return Object.freeze({key: sha(group.key), componentIndices: Object.freeze(members), anchor: Object.freeze([...group.anchor]) as readonly [number, number],
   unit: 'meter' as const, geometryRole: group.geometryRole as 'canonical' | 'display-variant', publicationConstraintKey: constraintKey, authority: Object.freeze({...binding}), vertices, indices: elements, triangles: elements / 3});
 });
 require(covered.size === count && new Set(groups.map(g => g.key)).size === groups.length, 'complete non-overlapping source coverage');
 require(groups.reduce((sum, g) => sum + g.vertices, 0) === resource.vertices && groups.reduce((sum, g) => sum + g.triangles, 0) === resource.triangles, 'level allocation totals');
 return Object.freeze({key, level: resource.level, geometrySHA256: resource.geometrySHA256, coordinateFrame: Object.freeze({...frame}),
  packingGroups: Object.freeze(groups), publicationConstraints: Object.freeze(constraints)});
}
