import {EDGE70_SHA} from './bremen-ag70-metadata';

/** Complete city-agnostic requiredNativeGroup projection from the verified AG70 input.
 * Identity order is first occurrence; duplicate group membership remains SHA-bound below. */
export const EDGE70_IDENTITY_INPUT=Object.freeze({
 schemaVersion:1,rawSHA256:EDGE70_SHA,rawBytes:431595,
 transportSHA256:'fae9ded5c8d7a7bb0c66deaf4f04450efc9709344106ad9f076ef1a58f711646',transportBytes:71514,
 models:1,requiredNativeGroupRows:3,uniqueIdentities:3,
 orderedIdentitySHA256:'ad532b5cb351305170a524267d86b439d1a6ca40206f94d96a568884d040f1df',
 orderedRequiredNativeGroupSHA256:'ad532b5cb351305170a524267d86b439d1a6ca40206f94d96a568884d040f1df',
});
export const EDGE70_IDENTITIES=Object.freeze([
 Object.freeze({"objectId":"osm/way/250251693","partId":"osm/way/250251693/component/3b0cc0cefe0a3b65c13d"}),
 Object.freeze({"objectId":"osm/way/250251729","partId":"osm/way/250251729/component/eac41e9260d8316f7177"}),
 Object.freeze({"objectId":"osm/way/68969331","partId":"osm/way/68969331/component/e59c98b6b7543172f961"}),
]);
