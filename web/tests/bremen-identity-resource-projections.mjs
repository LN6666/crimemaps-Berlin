// Offline identity projections only. This module never reads or decodes assets.
// Positive reconstruction/material/certificate validation still uses full data.

export const BREMEN_IDENTITY_RESOURCE_ALIASES = Object.freeze([
  'f018Source', 'f081Source', 'f122Source', 'f126Source', 'f131Source',
  'galerieSource', 'f288Source', 'f288Derived', 'jubilaeumDisplay',
  'f260', 'kunsthalle', 'oldtown', 'edgefill', 'euroGable', 'boundary',
  'churches', 'db', 'europa', 'karstadt', 'extra4', 'repairs', 'school',
  'teerhof', 'utility', 'ws', 'coverage', 'flemings', 'glocke', 'kuester',
  'hbf', 'lloyd', 'market', 'office', 'stephani', 'openings', 'organisten',
  'quartier', 'radstation', 'utilityDetail', 'wasserturm', 'wsBack',
]);

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Expected identity projection object: ${field}`);
  }
  return value;
}

function array(value, field) {
  if (!Array.isArray(value)) {
    throw new TypeError(`Expected identity projection array: ${field}`);
  }
  return value;
}

function pair(value) {
  object(value, 'identity pair');
  return {objectId: value.objectId, partId: value.partId};
}

const pairs = (value, field) => array(value, field).map(pair);
const lengthOnly = value => ({length: array(value, 'display').length});

function keysOnly(value) {
  object(value, 'frameOverrides');
  return Object.fromEntries(Object.keys(value).map(key => [key, null]));
}

function withSourceCarrier(output, value) {
  output.sourceCarrier = pair(value.sourceCarrier);
  return output;
}

function modelIdentities(value, {display = false, changed = false, sourceStub = false} = {}) {
  return array(value, 'models').map(model => {
    const output = {identity: pair(model.identity)};
    if (display) output.display = lengthOnly(model.display);
    if (changed && own(model, 'changed')) output.changed = model.changed;
    // The three original _scope_models helpers spread source then map batches.
    // An empty batch list preserves that identity-only adapter without decoding.
    if (sourceStub) output.source = {batches: []};
    return output;
  });
}

function groupedIdentities(value, {display = false, groupKey, frameKeys = false, carrier = false} = {}) {
  return array(value, 'groups').map(group => {
    const output = {models: modelIdentities(group.models, {display})};
    if (groupKey) output[groupKey] = group[groupKey];
    if (frameKeys) group.models.forEach((model, index) => {
      output.models[index].frameOverrides = keysOnly(model.frameOverrides);
    });
    if (carrier) group.models.forEach((model, index) => {
      output.models[index].sourceCarrier = pair(model.sourceCarrier);
    });
    return output;
  });
}

/** Keep the original tree needed by identity predicates, never model arrays. */
export function projectBremenIdentityResource(alias, value) {
  switch (alias) {
    case 'f018Source': case 'f081Source': case 'f122Source':
    case 'f126Source': case 'f131Source': case 'f288Source': case 'f288Derived':
      return pairs(value, alias);
    case 'jubilaeumDisplay':
      return pair(value);
    case 'galerieSource':
      // decodePackedBuildingShard preserves these fields verbatim in its output.
      // No geometry/flat-mesh/property table or packed payload needs decoding.
      return {components: pairs(value.components, 'components')};
    case 'boundary': case 'utility': case 'db': case 'karstadt':
      return {models: array(value.models, 'models').map(model => ({
        requiredNativeGroup: pairs(model.requiredNativeGroup, 'requiredNativeGroup'),
      }))};
    case 'churches': case 'repairs': case 'extra4': case 'oldtown':
      return {
        frozenExcluded: [...array(value.frozenExcluded, 'frozenExcluded')],
        models: array(value.models, 'models').map(model => {
          const output = {
            sourceBinding: pair(model.sourceBinding),
            requiredNativeGroup: pairs(model.requiredNativeGroup, 'requiredNativeGroup'),
          };
          if (alias === 'oldtown') {
            if (own(model.sourceBinding, 'nativeParentAbsent')) {
              output.sourceBinding.nativeParentAbsent = model.sourceBinding.nativeParentAbsent;
            }
            output.displays = pairs(model.displays, 'displays');
          }
          return output;
        }),
      };
    case 'school': case 'ws': case 'europa':
      return {groups: groupedIdentities(value.groups)};
    case 'kunsthalle':
      return {derivedIdentity: pair(value.derivedIdentity)};
    case 'edgefill':
      return {groups: groupedIdentities(value.groups, {display: true, groupKey: 'key'})};
    case 'coverage':
      return {groups: groupedIdentities(value.groups, {display: true, carrier: true})};
    case 'euroGable':
      return {groups: groupedIdentities(value.groups, {frameKeys: true, groupKey: 'queueId'})};
    case 'stephani':
      return {groups: groupedIdentities(value.groups, {display: true})};
    case 'flemings': case 'glocke': case 'quartier': case 'radstation': case 'wasserturm':
      return withSourceCarrier({models: modelIdentities(value.models)}, value);
    case 'kuester':
      return {models: modelIdentities(value.models, {display: true, sourceStub: true})};
    case 'lloyd':
      return withSourceCarrier({models: modelIdentities(value.models, {
        display: true, changed: true, sourceStub: true,
      })}, value);
    case 'organisten':
      return withSourceCarrier({models: modelIdentities(value.models, {
        display: true, sourceStub: true,
      })}, value);
    case 'market':
      return {models: modelIdentities(value.models)};
    case 'f260':
      return {
        models: array(value.models, 'models').map(model => ({profile: pair(model.profile)})),
        classification: {
          supersededInvalid710Records: pairs(
            value.classification.supersededInvalid710Records, 'supersededInvalid710Records',
          ),
        },
      };
    case 'hbf': case 'wsBack':
      return {sourceCarrier: pair(value.sourceCarrier)};
    case 'teerhof': case 'office': case 'utilityDetail':
      return {identity: pair(value.identity)};
    case 'openings':
      return {objectOverrides: Object.fromEntries(Object.entries(
        object(value.objectOverrides, 'objectOverrides'),
      ).map(([key, entry]) => [key, entry ? {} : entry]))};
    default:
      throw new RangeError(`Unknown Bremen identity resource alias: ${alias}`);
  }
}

/** Binding for the Galerie identity AST's decoder dependency; never a mesh decoder. */
export function galerieIdentityComponents(projected) {
  return {components: pairs(projected.components, 'projected components')};
}

/** Ordered candidate union; no normalization, string conversion, or key joining. */
export function collectCandidatePairs(projected) {
  const output = [], seen = new WeakSet();
  function visit(value) {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (own(value, 'objectId') && own(value, 'partId')) output.push(pair(value));
    for (const child of Object.values(value)) visit(child);
  }
  visit(projected);
  return output;
}
