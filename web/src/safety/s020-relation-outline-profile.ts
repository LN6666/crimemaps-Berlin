import type {S020RelationOutlineProfile} from './s020-relation-outline-display';
function freeze<T>(value:T):T{if(value&&typeof value==='object'){Object.values(value as Record<string,unknown>).forEach(freeze);Object.freeze(value);}return value;}
export const S020_RELATION_OUTLINE_PROFILES:readonly S020RelationOutlineProfile[]=freeze([
  {
    "city": "berlin",
    "groupIdentity": "osm/relation/8102166",
    "name": "S020 exactsource multipolygon-outline with3originalnativebuildingparts",
    "indexSHA": "e3281c57b1525bd659efe469e4926a212b967ac2abb4e4729e5dd9e34b55cce3",
    "sourcePBF": "190b13a01866247ef5bd7f0af9436f123629f6923768f7a3629a266562eab553",
    "boundarySHA": "86ec3d642cf1455e1d207dfaa6a06d0ab6ce1799c64802b16114d2223a81453c",
    "sourceSnapshot": "2026-09-25T20:24:36Z",
    "outline": {
      "objectId": "osm/relation/8102166",
      "partId": "osm/relation/8102166/component/9ac472ac932a5d280fca",
      "leafSHA": "90ec34417c0af020a13aac91c1144f058b273884b391251f9168fb172e980b90",
      "geometryFingerprint": "9ac472ac932a5d280fca",
      "nativePaintSignature": "e6618b89"
    },
    "parts": [
      {
        "objectId": "osm/way/1245266798",
        "partId": "osm/way/1245266798/component/bd5210760975ef242551",
        "leafSHA": "90ec34417c0af020a13aac91c1144f058b273884b391251f9168fb172e980b90",
        "geometryFingerprint": "bd5210760975ef242551",
        "nativePaintSignature": "0fbc4393"
      },
      {
        "objectId": "osm/way/1245266799",
        "partId": "osm/way/1245266799/component/28616ece47886b0ae0a0",
        "leafSHA": "90ec34417c0af020a13aac91c1144f058b273884b391251f9168fb172e980b90",
        "geometryFingerprint": "28616ece47886b0ae0a0",
        "nativePaintSignature": "1c394fb1"
      },
      {
        "objectId": "osm/way/1245266797",
        "partId": "osm/way/1245266797/component/409488679beaa76dcb38",
        "leafSHA": "ea2b5ef840b2d0040754d79f04d1d6834ad347a8b813b66e741344ff169b2ba9",
        "geometryFingerprint": "409488679beaa76dcb38",
        "nativePaintSignature": "75a45a86"
      }
    ],
    "sourceRowsSHA": "f43cec108c30cf6acadc8b722dd68618fc1483c1cb37c803dfc68efef34f03b9",
    "edgeProofSHA": "b1f1c7fbf51f49d01d31df9153d8f306a6b0698016cfe30d8a925b32d7592ed0",
    "parentEdges": [
      {
        "nodes": [
          492223120,
          11576722080
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          5471329465,
          11576722080
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          5471329464,
          5471329465
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563516,
          5471329464
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563516,
          11576722081
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563517,
          11576722081
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          492223097,
          603563517
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          492223097,
          11576722082
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563518,
          11576722082
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563518,
          603563519
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563519,
          5471329461
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          5471329459,
          5471329461
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          3013438448,
          5471329459
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          3013438448,
          5471329458
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329458,
          8119012595
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329457,
          8119012595
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329456,
          5471329457
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329455,
          5471329456
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329454,
          5471329455
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329453,
          5471329454
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329452,
          5471329453
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329452,
          11576722072
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329451,
          11576722072
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329450,
          5471329451
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329450,
          11576722073
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329449,
          11576722073
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329448,
          5471329449
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329447,
          5471329448
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329446,
          5471329447
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329445,
          5471329446
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329445,
          11576722074
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329444,
          11576722074
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329443,
          5471329444
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329441,
          5471329443
        ],
        "matchedBy": [
          "osm/way/1245266799"
        ]
      },
      {
        "nodes": [
          5471329441,
          11576819355
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329440,
          11576819355
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329439,
          5471329440
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329438,
          5471329439
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329437,
          5471329438
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329436,
          5471329437
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329435,
          5471329436
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329434,
          5471329435
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329433,
          5471329434
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329432,
          5471329433
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329431,
          5471329432
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329430,
          5471329431
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329429,
          5471329430
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329428,
          5471329429
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329427,
          5471329428
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329426,
          5471329427
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329425,
          5471329426
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329424,
          5471329425
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329424,
          11576819357
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          11576819356,
          11576819357
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329423,
          11576819356
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471329423,
          5471329462
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563525,
          5471329462
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563525,
          11576722076
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563526,
          11576722076
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          539249017,
          603563526
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          539249017,
          11576722077
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563528,
          11576722077
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563528,
          11576722078
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563530,
          11576722078
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563530,
          11576722079
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          5471329463,
          11576722079
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          492223120,
          5471329463
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          492223111,
          5471329421
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471328020,
          5471329421
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471328019,
          5471328020
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471328018,
          5471328019
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471328016,
          5471328018
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          5471328015,
          5471328016
        ],
        "matchedBy": [
          "osm/way/1245266798"
        ]
      },
      {
        "nodes": [
          603563520,
          5471328015
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563520,
          11576722093
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563521,
          11576722093
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          603563521,
          11576722094
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      },
      {
        "nodes": [
          492223111,
          11576722094
        ],
        "matchedBy": [
          "osm/way/1245266797"
        ]
      }
    ],
    "sameBuildingVerified": true,
    "formalRelationMembership": false,
    "completenessClaim": false,
    "outlineEvidenceKind": "exact-original-source-boundary-edge-union-relation-outline",
    "entranceSurfaceVerified": true,
    "guardVersion": "s020-exact-three-native-parts-v1"
  }
]);
