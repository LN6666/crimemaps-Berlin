import type {ReviewedSharedDescriptor} from './reviewed-shared-groups';
export const reviewedSharedDescriptors = {
  "frankfurt": {
    "city": "frankfurt",
    "scopeId": "merged/frankfurt/stadtteile/14+15",
    "nativeLevel": "level2",
    "memberAreaIds": [
      "14",
      "15"
    ],
    "geometrySha256": "89bbf5bb967e6c62866d3264ae51d35b987714855eae4aa12f69c511098c4f99",
    "containerLevel": "merged_scopes",
    "areaNameField": "name",
    "metricsRef": {
      "path": "/safety/geography/reference-merged/frankfurt-ef584bbed38fd5f3a2004da0bda2eff152694ee5a3eaef7c798e5e76652ad6c4-metrics.json",
      "sha256": "ef584bbed38fd5f3a2004da0bda2eff152694ee5a3eaef7c798e5e76652ad6c4",
      "bytes": 17069
    },
    "registryRef": {
      "path": "/safety/geography/reference-merged/frankfurt-99c17f903e826ab9e6c3644f8f2f47c7fcaf00f88f048e65b3c67abf6a0331e5-rules.json",
      "sha256": "99c17f903e826ab9e6c3644f8f2f47c7fcaf00f88f048e65b3c67abf6a0331e5",
      "bytes": 42267
    },
    "membershipEvidenceSha256": "632d3a249354eebfa042140eb12a5ffd1a92ec8b89a839e2eb4f1379652292be",
    "metrics": [
      {
        "metricId": "root-detail-west-frankfurt-unemployment20251215-insgesamt",
        "conceptId": "frankfurt.registered_unemployed.total_sgbii_sgbiii.count",
        "value": 774,
        "unit": "persons",
        "year": 2025,
        "referenceDate": "2025-12-15",
        "sourceSha256": "24b2e940214406fae9d2331347204de2d2a1c32ef9cb53b5f5665b024e1d2306",
        "metricSha256": "f6e76cdea4804fcd422814be9c9682fb832f287e254f50d9eaab09e8e6b4b15d",
        "ruleSha256": "d1611b55f74130375aecd09cd02cb2b75db570150c797418f5d08fa28b47239f"
      },
      {
        "metricId": "root-detail-west-frankfurt-unemployment20251215-aa_974",
        "conceptId": "frankfurt.registered_unemployed.sgbiii.count",
        "value": 405,
        "unit": "persons",
        "year": 2025,
        "referenceDate": "2025-12-15",
        "sourceSha256": "24b2e940214406fae9d2331347204de2d2a1c32ef9cb53b5f5665b024e1d2306",
        "metricSha256": "55ab447b7450a58688c919873c94dd2990adcf13811735462efc2247239be0dd",
        "ruleSha256": "123dd816ed5338e5c6e77cf531c1180eea4ef2eb386375f7704c323b5795e0f5"
      },
      {
        "metricId": "root-detail-west-frankfurt-unemployment20251215-aa_976",
        "conceptId": "frankfurt.registered_unemployed.sgbii.count",
        "value": 369,
        "unit": "persons",
        "year": 2025,
        "referenceDate": "2025-12-15",
        "sourceSha256": "24b2e940214406fae9d2331347204de2d2a1c32ef9cb53b5f5665b024e1d2306",
        "metricSha256": "33d604288c6a7092c2436f6457f9e0cd07fc4c255677ccc76cf4682f72cc8e28",
        "ruleSha256": "0fbd7bc5a7edfcb026d320f13941c5ec4c93caf8f4b21dee92eba81c01363ecd"
      }
    ],
    "badge": {
      "zh": "共同统计值 · 非任一成员分区单独数值",
      "en": "Joint-area observation · not either member area alone",
      "de": "Gemeinsamer Statistikwert · kein Einzelwert eines Mitgliedsgebiets"
    },
    "note": {
      "zh": "此值属于Sachsenhausen-Süd与Flughafen官方共同统计组（14＋15），不是任一成员单独数值；不拆分、不分摊，也不重复计入原生分区统计。",
      "en": "This value belongs to the official joint Sachsenhausen-Süd / Flughafen reporting group (14+15), not either member alone. It is not divided, allocated or duplicated in native-area statistics.",
      "de": "Der Wert gehört zur amtlichen gemeinsamen Statistikgruppe Sachsenhausen-Süd / Flughafen (14+15), nicht zu einem einzelnen Mitglied. Keine Aufteilung, Verteilung oder doppelte Aufnahme in native Teilgebietsstatistik."
    }
  },
  "dusseldorf": {
    "city": "dusseldorf",
    "scopeId": "merged/dusseldorf/032-033",
    "nativeLevel": "level1",
    "memberAreaIds": [
      "osm/relation/92375",
      "osm/relation/92377"
    ],
    "geometrySha256": "f22f53b9c2e21120d17c8ddb550d1d4eb644d9d58f4d146e8424ec46c496f53a",
    "containerLevel": "merged",
    "areaNameField": "scopeName",
    "metricsRef": {
      "path": "/safety/geography/reference-merged/dusseldorf-287119dc75f99c4049cf9e046a395993d4cb43bda9742f4a6be19179d41a76c1-metrics.json",
      "sha256": "287119dc75f99c4049cf9e046a395993d4cb43bda9742f4a6be19179d41a76c1",
      "bytes": 34692
    },
    "registryRef": {
      "path": "/safety/geography/reference-merged/dusseldorf-e9a31e00e56f94e3db166317e4e9085d092827154b4cd792cfad43772f1571ad-rules.json",
      "sha256": "e9a31e00e56f94e3db166317e4e9085d092827154b4cd792cfad43772f1571ad",
      "bytes": 15415
    },
    "membershipEvidenceSha256": "72dfd64765bcb62f28317e9124dd7c4ae52a7fcdb3f0f5ac4164652eb2a7414a",
    "metrics": [
      {
        "metricId": "dusseldorf-merged-Unterbilk-Hafen2025-bg",
        "conceptId": "sgbii_benefit_community_count",
        "value": 570,
        "unit": "",
        "year": 2025,
        "referenceDate": "2025-12-31",
        "sourceSha256": "7c9ac2f2c5eb2328a5e24de6fbcbc4291d8efd61dcce9eeeff206837fc432afe",
        "metricSha256": "0dd5fefb5a961fa97885cf6bbdf25f8d09c646cf3adc155beb8b13985c39def0",
        "ruleSha256": "9e261a3a8c8b7efeb6ba5bbb63c7b671402d7272643ab3abebea154d27dffc7b"
      },
      {
        "metricId": "dusseldorf-merged-Unterbilk-Hafen2025-pers",
        "conceptId": "sgbii_benefit_community_person_count",
        "value": 811,
        "unit": "persons",
        "year": 2025,
        "referenceDate": "2025-12-31",
        "sourceSha256": "7c9ac2f2c5eb2328a5e24de6fbcbc4291d8efd61dcce9eeeff206837fc432afe",
        "metricSha256": "0eac6a27805607e8e13e9372f5c22920936eb4490b88fa905512cc255e07ba0e",
        "ruleSha256": "acbf761224d2379f9b8cfe90045f992312f02a39c37902e6bb9e8c6824e5f60c"
      },
      {
        "metricId": "dusseldorf-merged-Unterbilk-Hafen2025-pers_share",
        "conceptId": "sgbii_benefit_community_person_share_under65_residents",
        "value": 4.9,
        "unit": "%",
        "year": 2025,
        "referenceDate": "2025-12-31",
        "sourceSha256": "7c9ac2f2c5eb2328a5e24de6fbcbc4291d8efd61dcce9eeeff206837fc432afe",
        "metricSha256": "22a874042088a551954fd995464e867b3e5a70906ee3eb29ba645694b11b6051",
        "ruleSha256": "cc4cbcf6733c0ee6cc776fae32d960755c826ca701b67fe0262073178cfb9a35"
      },
      {
        "metricId": "dusseldorf-merged-Unterbilk-Hafen2025-xii",
        "conceptId": "sgbxii_oldage_reducedcapacity_recipient_count",
        "value": 310,
        "unit": "persons",
        "year": 2025,
        "referenceDate": "2025-12-31",
        "sourceSha256": "7c9ac2f2c5eb2328a5e24de6fbcbc4291d8efd61dcce9eeeff206837fc432afe",
        "metricSha256": "c7d4491a757325a9cd8cda74bc435776a19b3e83360719156f123ba130d81b81",
        "ruleSha256": "675c3baab6bc624a2bf4912549da7f22bc8e3b0484e0ecdfaef7dcac8298b6fa"
      },
      {
        "metricId": "dusseldorf-merged-Unterbilk-Hafen2025-wohngeld",
        "conceptId": "housing_allowance_household_count",
        "value": 321,
        "unit": "",
        "year": 2025,
        "referenceDate": "2025-12-31",
        "sourceSha256": "7c9ac2f2c5eb2328a5e24de6fbcbc4291d8efd61dcce9eeeff206837fc432afe",
        "metricSha256": "4cd1fcda0ddac27579a7fbffe2f56c6b379ac02fda3b366e8b2cb45ce8d7287c",
        "ruleSha256": "030dccfd066328ea1314247189215483a6e6f9e4a4eaf20e7e1d5efe5da9eb51"
      },
      {
        "metricId": "dusseldorf-merged-Unterbilk-Hafen2025-wohngeld_share",
        "conceptId": "housing_allowance_share_private_households",
        "value": 2,
        "unit": "%",
        "year": 2025,
        "referenceDate": "2025-12-31",
        "sourceSha256": "7c9ac2f2c5eb2328a5e24de6fbcbc4291d8efd61dcce9eeeff206837fc432afe",
        "metricSha256": "8e81e87b7d280fa1c26f4a7e86358560c29b139dd2a635379f05bfcddcf6d891",
        "ruleSha256": "c4876fc0092759875da0f8636421ce8558a82ac0c4bb66268dc43a7fecb1634d"
      },
      {
        "metricId": "dusseldorf-merged-Unterbilk-Hafen2025-child-under15",
        "conceptId": "sgbii_benefit_community_under15_child_count",
        "value": 107,
        "unit": "persons",
        "year": 2025,
        "referenceDate": "2025-12-31",
        "sourceSha256": "7c9ac2f2c5eb2328a5e24de6fbcbc4291d8efd61dcce9eeeff206837fc432afe",
        "metricSha256": "49b96b383e43c564e0a2c75df890a03837b846104c5768fdb1cd05cf87a0c5c8",
        "ruleSha256": "48148d18a9efc378d9b3852ae1fe59a26efec3f2c356ed48e987acbd3a6bc754"
      },
      {
        "metricId": "dusseldorf-merged-Unterbilk-Hafen2025-rent-median2025",
        "conceptId": "median_advertised_net_cold_multifamily_annual",
        "value": 16.045,
        "unit": "€/m²/month",
        "year": 2025,
        "sourceSha256": "985aa492d900e4eded1be0176a380141d3dc38e049fdf6e80e8fa0ab93442c42",
        "metricSha256": "0399f88fa7b1c2998a6659f89fc259d83d6b26d85e86dc02ff583240881a246b",
        "ruleSha256": "0e39aa687e3ddc0768929eb508d2f2981ebb7cd4f87a2ab934908a9b8a2cda48"
      }
    ],
    "badge": {
      "zh": "共同统计值 · 非任一成员分区单独数值",
      "en": "Joint-area observation · not either member area alone",
      "de": "Gemeinsamer Statistikwert · kein Einzelwert eines Mitgliedsgebiets"
    },
    "note": {
      "zh": "此值属于Unterbilk与Hafen官方共同范围，不是任一成员单独数值；不拆分、不分摊，也不重复计入原生分区统计。",
      "en": "This value belongs to the official joint Unterbilk / Hafen scope, not either member alone. It is not divided, allocated or duplicated in native-area statistics.",
      "de": "Der Wert gehört zum amtlichen gemeinsamen Bereich Unterbilk / Hafen, nicht zu einem einzelnen Mitglied. Keine Aufteilung, Verteilung oder doppelte Aufnahme in native Teilgebietsstatistik."
    }
  }
} satisfies Record<string,ReviewedSharedDescriptor>;
