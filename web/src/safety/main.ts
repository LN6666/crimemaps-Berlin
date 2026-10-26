import {captureRecoveryControls,restoreRecoveryControls} from './map-recovery-controls';
import {planarReflectionGroup} from './planar-reflection-group';
import {loadSelectedPeriod} from './selected-period';
import {viewportRenderData} from './viewport-render-data';
import {isYearPublicationPeriod,savedPublicationMonths} from './publication-period';
import {installSelectionInspector} from './selection-inspector';
import {installPalaceGarden} from './facade-palace-garden';
import {installFacadePaintControls} from './facade-paint-controls';
import {installLocalLifecycleDiagnostics} from './local-lifecycle-diagnostics';
import {installLongCopyDisclosure} from './long-copy-disclosure';
import './long-copy-disclosure.css';
import {installThreeDimensionalMap} from './three-dimensional-lazy';
import {installThreeDimensionalControls} from './three-dimensional-controls';
import {installSceneControls} from './scene-controls';
import {defaultSceneEnvironment,type SceneEnvironmentState} from './scene-environment-state';
import {installSceneRenderQuality} from './scene-render-quality';
import {createDisplayFrameClock} from './display-frame-clock';
import {installCustomLayerRecovery} from './custom-layer-recovery';
import {mountMapRecoveryNotice,readMapRecoveryURL,mapRecoveryReloadURL,RECOVERY_TOGGLES} from './map-recovery-notice';
import './map-recovery-notice.css';
import {installThreeDimensionalScenery} from './three-dimensional-scenery';
import {installBuilding3dInteraction} from './building-3d-interaction';
import {building3dClickPriority} from './building-3d-selection';
import {installBaseShopLabels,SHOP_LABEL_LAYER} from './base-shop-labels';
import {appendBuildingShopChoices} from './building-shop-choices';
import {installOsmClickInspection} from './osm-click-inspection';
import {installPublicTransitOverlay} from './public-transit-overlay';
import {boundedDataBytes,rawBoundedDataBytes} from './local-data-bytes';
import {setLocalDataTransport} from './local-data-routing';
import {installElectoralOverlay} from './electoral-overlay';
import {verifiedElectoralJSON} from './electoral-assets';
import {electoralPartyPalette} from './electoral-party-palette';
import {installGeographyBase} from "./geography-base";
import {communityReference,type CommunityReference} from "./community-boundaries";
import mapReadingRules from "./map-reading-rules.json";
import {appendNewDataReadingPolicy} from "./reading-policy-new-data";
import reviewedKboReference from "../../../data/safety/berlin_kbo.json";
import {mountAnalytics,markAnalyticsLanguageNavigation} from "./analytics";
import "./analytics.css";
import {catalogSummary,loadCatalogTranslations} from "./catalog-translations";
import {DynamicTranslations} from "./dynamic-translations";
import {reportSummaryPresentation} from "./report-summary";
import {abortPendingReportBodyLoads,loadReportBody,reportBodySourceId,type ReportBodyIdentity,type ReportBodyLocale} from "./report-body-loader";
import {pendingReportBodyLabel,reportBodyPresentation} from "./report-body-presentation";
import {appendPublicEventNotes,appendPublicSceneReferenceNote} from "./public-report-notes";
import {mountAnnouncementMethods} from "./methods";
import {mountUncertaintyPanel} from "./uncertainty-panel";
import {mountGitHubFooter} from "./github-feedback";
import "./github-feedback.css";
import {mountContentTagLauncher} from "./content-tag-launcher";
import {CONTENT_TAG_COPY} from "./content-tag-copy";
import {loadSavedStatistics} from "./statistics-loader";
import {mountDatedTagStatistics, type DatedTagCatalogue, type DatedTagBindings} from "./dated-tag-statistics";
import "./content-tag-launcher.css";
import {installMobileLayout} from "./mobile-layout";
import {t,locale,localeCode,number,date,html,cityName,poiName,sourceContextName,languageURL} from "./i18n";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
maplibregl.setWorkerUrl(workerUrl);
maplibregl.setWorkerCount(2);
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import "./brand.css";
import "./appearance.css";
import "./geography-base.css";
import "./three-dimensional-controls.css";
import "./scene-controls.css";
import "./typography-density.css";
import "./transit-interaction.css";
import './publication-period-controls.css';
import {mountBrand} from "./brand";
import {initializeAppearance,mountAppearance} from "./appearance";
import {compactChoices} from './compact-choices';
import {
  candidateRoadGeometry,
  candidateRoads,
  countableEventIds,
  empty,
  filteredHex,
  locationCoverage,
  monthEvents,
  displayMonth,
  roadBounds,
  safeURL,
  sceneEventIds,
  sceneFeatures,
  type SceneLocation,
  sceneRoleLabel,
  sceneDisplayPrecision,
  SCENE_CLICK_LAYERS,
  styledPois,
  unplacedStages,
  relatedSourceLinks,
  sourcePoiReferences,
  SOURCE_POI_CLICK_LAYERS,
  renderPois,
  poiCenters,
  poiGeometryLabel,
  transitGeometryLabel,
} from "./model";
import type { Bundle, FC, PoliceEvent } from "./model";
import {fetchDataJSON,fetchFreshManifest} from "./security";
import { DataClient } from "./data";
import type { Manifest, YearData } from "./data";
import { Basemaps, basemapLabels } from "./basemaps";
import type { BasemapId } from "./basemaps";
import { cityGroups, requestedMapView } from "./cities";
import { assetPath, cityIds, cityDestination, requestedMonth } from "./deployment";

const mapRetry=readMapRecoveryURL(location.href);
if(mapRetry)history.replaceState(null,'',mapRetry.cleanURL);
const cityView = requestedMapView(window.location.search);
// Versioned display reference: independent of frozen announcement archives.
const kboZones: Bundle["zones"] = cityView.kbo ? reviewedKboReference as Bundle["zones"] : {places:[],features:[],geometry_status:"not_applicable"};
const currentCity = cityView.id;
const localizedCity=cityName(currentCity,cityView.latin);
document.title = t("app.title",{city:localizedCity});

const categoryLabels: Record<string, string> = {
  betrug: t("category.betrug"),
  brand: t("category.brand"),
  diebstahl: t("category.diebstahl"),
  drogen: t("category.drogen"),
  einbruch: t("category.einbruch"),
  gewalt: t("category.gewalt"),
  raub: t("category.raub"),
  sexualdelikte: t("category.sexualdelikte"),
  sonstige: t("category.sonstige"),
  verkehr: t("category.verkehr"),
};
const categoryLabel = (category: string) => categoryLabels[category] ?? category;

const reviewedTagLabels: Record<string, string> = {
  violent_assault: t("tag.violent_assault"),
  robbery: t("tag.robbery"),
  threat: t("tag.threat"),
  sexual_offence: t("tag.sexual_offence"),
  property_offence: t("tag.property_offence"),
  possible_hate_crime: t("tag.possible_hate_crime"),
};
const precisionLabels: Record<string, string> = {
  street: t("precision.street"),
  place: t("precision.place"),
  address: t("precision.address"),
  point: t("precision.point"),
  route: t("precision.route"),
  district: t("precision.district"),
  city: t("precision.city"),
  unknown: t("precision.unknown"),
};
const locationScopeLabels: Record<string, string> = {
  in_city: t("scope.in_city"),
  outside_city: t("scope.outside_city",{city:localizedCity}),
  unresolved_no_upstream_coordinate: t("scope.unresolved_no_upstream_coordinate"),
};
const sourceStatusLabels: Record<string, string> = {
  polizeikarte_complete_365_day_snapshot: t("sourceStatus.polizeikarte_complete_365_day_snapshot"),
  complete_official_archive_source_and_geometry_reviewed: t("sourceStatus.complete_official_archive_source_and_geometry_reviewed"),
  complete_frozen_owner_batch_source_and_geometry_reviewed: t("sourceStatus.complete_frozen_owner_batch_source_and_geometry_reviewed"),
  source_geometry_map_decision_coverage_verified_not_full_acceptance: t("sourceStatus.source_geometry_map_decision_coverage_verified_not_full_acceptance"),
  frozen_owner_batch_decision_coverage_verified_not_full_acceptance: t("sourceStatus.frozen_owner_batch_decision_coverage_verified_not_full_acceptance"),
};
const sceneRelationLabels: Record<string, string> = {
  independent_case: t("relation.independent_case"),
  same_case_phase: t("relation.same_case_phase"),
  search_arrest_operation: t("relation.search_arrest_operation"),
  background_reference: t("relation.background_reference"),
  unresolved_relation: t("relation.unresolved_relation"),
};
const sceneColor: maplibregl.ExpressionSpecification = [
  "match", ["get", "role_group"],
  "incident", "#b43d4b",
  "discovery", "#2874a6",
  "operation", "#986223",
  "#677785",
];

const app = document.querySelector<HTMLDivElement>("#app")!;
const localLifecycleDiagnostics=installLocalLifecycleDiagnostics();
initializeAppearance();
app.innerHTML = `<header><div><span class="brand">${currentCity === "berlin" ? "CRIMEMAPSBERLIN" : "CRIMEMAPS.DE"}</span><span id="review-badge" class="review-badge" hidden>${html(t("app.preview"))}</span><h1>${html(t("app.heading",{city:localizedCity}))}</h1></div><div class="toolbar"><label>${html(t("nav.language"))}<select id="language" aria-label="${html(t("nav.language"))}"><option value="de">Deutsch</option><option value="en">English</option><option value="zh">中文</option></select></label><label class="city-switch">${html(t("nav.city"))}<select id="city-switch" aria-label="${html(t("nav.city"))}"></select></label><label>${html(t("nav.year"))}<select id="year" aria-label="${html(t("nav.year"))}"></select></label><label>${html(t("nav.month"))}<select id="month" aria-label="${html(t("nav.month"))}"></select></label><button id="overview">${html(t("nav.overview"))}</button><button id="sources">${html(t("nav.sources"))}</button></div></header>
<main><aside class="controls"><p class="eyebrow">${html(localizedCity)} / ${html(t("app.publicReports"))}</p><h2>${html(t("app.tagline"))}</h2><p id="coverage">${html(t("map.loadingData"))}</p><nav id="external-maps" class="external-maps" aria-label="${html(t("external.aria"))}"></nav><label class="search-label">${html(t("search.label",{city:localizedCity}))}<input id="search" placeholder="${html(t("search.placeholder",{},cityView.latin))}" autocomplete="off"></label><div id="search-results"></div><label>${html(t("filter.category"))}<select id="category"><option value="all">${html(t("filter.allReports"))}</option></select></label><div class="rule"></div><h3 id="year-hex-title">${html(t("legend.hex"))}</h3><p class="hint">${html(t("legend.yearScope"))}</p><div class="ramp"></div><div class="ends"><span>${html(t("legend.low"))}</span><span>${html(t("legend.high"))}</span></div><p id="resolution"></p><label class="toggle"><input id="hex-toggle" type="checkbox" checked> ${html(t("legend.showHex"))}</label><p id="hex-empty-note" class="hint" hidden>${html(t("legend.emptyHex"))}</p><label class="toggle"><input id="candidate-roads-toggle" type="checkbox" checked> ${html(t("legend.showRoads"))}</label><p class="hint"><span class="road-swatch" aria-hidden="true"></span>${html(t("legend.roadNote"))}</p><div class="scene-legend" aria-label="${html(t("legend.scenesAria"))}"><span><i class="scene-swatch incident" aria-hidden="true"></i><i class="scene-road-swatch incident" aria-hidden="true"></i>${html(t("legend.incident"))}</span><span><i class="scene-swatch discovery" aria-hidden="true"></i><i class="scene-road-swatch discovery" aria-hidden="true"></i>${html(t("legend.discovery"))}</span><span><i class="scene-swatch operation" aria-hidden="true"></i><i class="scene-road-swatch operation" aria-hidden="true"></i>${html(t("legend.operation"))}</span><span><i class="scene-swatch context" aria-hidden="true"></i><i class="scene-road-swatch context" aria-hidden="true"></i>${html(t("legend.context"))}</span><span><i class="route-swatch"></i>${html(t("legend.transit"))}</span></div><p class="hint scene-shape-note">${html(t("legend.sceneShapes"))}</p><p id="scene-availability" class="hint" aria-live="polite"></p><p id="transit-availability" class="hint"></p><button id="map-reading-rules">${html(t("legend.readRules"))}</button><label class="toggle"><input id="community-toggle" type="checkbox" checked> ${html(t("community.toggle"))}</label><p id="community-note" class="hint" aria-live="polite">${html(t("community.loading"))}</p><h3>${html(t("legend.pois"))}</h3><label class="toggle"><input id="poi-toggle" type="checkbox" checked> ${html(({zh:"显示周边场所",en:"Show nearby places",de:"Orte in der Nähe anzeigen"})[locale])}</label><div id="poi-filters"></div><label class="toggle"><input id="highlight" type="checkbox" checked> ${html(t("legend.highlight"))}</label><p id="highlight-note" class="hint">${html(t("legend.highlightNote"))}</p><div class="rule"></div><button id="kbo">${html(t("kbo.button"))}</button><p class="hint">${html(t("kbo.separate"))}</p><p id="freshness" class="hint"></p></aside>
<section class="map-wrap"><div id="map" aria-label="${html(t("map.aria",{city:localizedCity}))}"></div><div class="map-label"><span class="dot"></span><span id="map-status" role="status" aria-live="polite">${html(t("map.preparing"))}</span></div><div class="basemap-picker"><label>${html(t("map.basemap"))}<select id="basemap" aria-label="${html(t("map.basemap"))}" disabled><option value="vector">${html(t("basemap.vector"))}</option><option value="street">${html(t("basemap.street"))}</option><option value="aerial">${html(t("basemap.aerial"))}</option><option value="local">${html(t("basemap.local"))}</option></select></label><div id="basemap-error" role="status" hidden><span></span><button id="basemap-fallback">${html(t("basemap.fallback"))}</button></div></div><div class="map-note">${html(t("map.poiNote"))}</div><p class="hint basemap-language-note">${html(t("basemap.languageNote"))}</p></section>
<aside class="details"><div id="stats"></div><div id="methods-panel"></div><div id="selection"><h2>${html(t("selection.prompt"))}</h2><p>${html(t("selection.intro"))}</p></div><div id="uncertainty-panel"></div><div id="analytics-panel"></div></aside></main>
<dialog id="drawer"><button id="close-dialog" class="close">${html(t("action.close"))}</button><div id="drawer-content"></div></dialog>`;
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
mountBrand(app.querySelector<HTMLElement>(".brand")!);
const cityHeading=app.querySelector<HTMLHeadingElement>('header h1')!;
const headingContainer=cityHeading.parentElement!;
const fitCityHeading=()=>{
  cityHeading.style.removeProperty('font-size');
  const available=headingContainer.clientWidth;
  for(let attempt=0;attempt<3 && available>0 && cityHeading.scrollWidth>available;attempt++){
    const baseSize=parseFloat(getComputedStyle(cityHeading).fontSize);
    cityHeading.style.fontSize=`${Math.floor(baseSize*(available-1)/cityHeading.scrollWidth*10)/10}px`;
  }
};
let headingContainerWidth=-1;
new ResizeObserver(entries=>{
  const width=entries[0]?.contentRect.width;
  if(width!==headingContainerWidth){headingContainerWidth=width??-1;fitCityHeading();}
}).observe(headingContainer);
void document.fonts.ready.then(fitCityHeading);
mountAppearance(app.querySelector<HTMLElement>(".toolbar")!, {label:t("theme.label"),blue:t("theme.blue"),light:t("theme.light")});
el<HTMLSelectElement>("language").value=locale;
el("language").onchange=()=>{markAnalyticsLanguageNavigation(currentCity);const url=new URL(location.href);url.searchParams.set("lang",el<HTMLSelectElement>("language").value);url.searchParams.set("month",monthKey());location.assign(url.href);};
compactChoices(el<HTMLSelectElement>('language'),{de:'DE',en:'EN',zh:'中文'});
compactChoices(el<HTMLSelectElement>('appearance'));
const zoomTierNote=document.createElement('p');zoomTierNote.className='hint';zoomTierNote.id='zoom-tier-note';zoomTierNote.textContent={"zh": "放大后先隐藏分区悬停的蓝色与名称，保留黑色边界；再放大到街道细节时隐藏六边形。缩小时按相反顺序恢复；关闭六边形开关后不会自动恢复。", "en": "Area hover colours and names disappear first as you zoom in; black boundaries remain. Hexagons disappear at street-detail scale and return when zooming out, unless switched off.", "de": "Beim Hineinzoomen verschwinden zuerst die blauen Gebietshervorhebungen und Namen; schwarze Grenzen bleiben. Auf Straßen-Detailebene verschwinden auch die Hexagone. Beim Herauszoomen erscheinen sie wieder, sofern sie nicht ausgeschaltet sind."}[locale];el('hex-empty-note').after(zoomTierNote);
compactChoices(el<HTMLSelectElement>('basemap'),({zh:{vector:'多语街道',street:'街道',aerial:'航拍',local:'简图'},en:{vector:'Multilingual',street:'Streets',aerial:'Aerial',local:'Simple'},de:{vector:'Mehrsprachig',street:'Straßen',aerial:'Luftbild',local:'Einfach'}})[locale]);
const citySelect = el<HTMLSelectElement>("city-switch");
for (const group of cityGroups) {
  const section = document.createElement("optgroup");
  section.label = t("nav.cities");
  for (const city of group.cities) {
    const option = new Option(
      cityName(city.id,city.id) + (city.href ? "" : ` · ${t("nav.preparing")}`),
      city.id,
    );
    option.disabled = !city.href && city.id !== currentCity;
    section.append(option);
  }
  citySelect.append(section);
}
citySelect.value = currentCity;
citySelect.onchange = () => {
  const destination = cityGroups.flatMap((group) => group.cities).find(
    (city) => city.id === citySelect.value,
  );
  if (destination?.href) {
    const query = new URLSearchParams(window.location.search);
    query.set("lang", locale);
    window.location.assign(cityDestination(destination.id, query.toString(), monthKey()));
  }
};
const text = (tag: string, value: string, parent: HTMLElement) => {
  const n = document.createElement(tag);
  n.textContent = value;
  parent.append(n);
  return n;
};
function link(parent: HTMLElement, label: string, url: string) {
  const safe = safeURL(url);
  if (!safe) return;
  const a = text("a", label, parent) as HTMLAnchorElement;
  a.href = safe;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
}
link(el("external-maps"), `POLIZEIKARTE ${localizedCity} ↗`, cityView.externalUrl);
link(el("external-maps"), `${t("external.policeWebsite")} ↗`, cityView.officialPoliceUrl);
if (!cityView.kbo) {
  el("kbo").hidden = true;
  el("kbo").nextElementSibling?.remove();
}
if (!cityView.aerial)
  el<HTMLSelectElement>("basemap").querySelector<HTMLOptionElement>("option[value='aerial']")!.disabled = true;
text("button", t("nav.otherCities"), el("external-maps")).onclick =
  externalMapsDialog;
el("map-reading-rules").onclick = () => {
  const panel = openDialog(t("legend.readRules"));
  for (const [ruleIndex,rule] of mapReadingRules[locale].entries()) {
    const section = document.createElement("section");
    text("h3", rule.title, section);
    if(ruleIndex===13)appendNewDataReadingPolicy(section,currentCity,locale,rule.body);
    else text("p", rule.body, section);
    panel.append(section);
  }
};
const dynamicText=new DynamicTranslations();
const methodsPanel=mountAnnouncementMethods(el("methods-panel"),{t,locale,categoryLabel,city:currentCity});
const uncertaintyPanel=mountUncertaintyPanel(el("uncertainty-panel"),{locale,city:currentCity,translate:t,sourceUncertaintyNotice:t("report.sourceUncertain"),onSelect:(id, trigger)=>{const p=openDialog(t("report.scenes"), trigger);listReports(p,[id]);}});
const githubFooter=mountGitHubFooter(app,{locale,city:currentCity,translate:t});
const analyticsPanel=mountAnalytics(el("analytics-panel"),{language:locale,city:currentCity,collectionEnabled:import.meta.env.VITE_GOATCOUNTER_ENABLED === "true",snapshotUrl:import.meta.env.BASE_URL+"safety/analytics/visitors-by-country.json"});
// Establish the collapsed mobile layout before measuring the statistics anchor.
let data: Bundle;
let map: maplibregl.Map;
let communities:CommunityReference=communityReference(null,currentCity);
let geographyBase:ReturnType<typeof installGeographyBase>|undefined;
let electoralOverlay:ReturnType<typeof installElectoralOverlay>|undefined;
let publicTransitOverlay:ReturnType<typeof installPublicTransitOverlay>|undefined;
let osmClickInspection:ReturnType<typeof installOsmClickInspection>|undefined;
let mapGPUUnavailable=false;
let threeDimensional:ReturnType<typeof installThreeDimensionalMap>|undefined;
let nativeOutlineGround:ReturnType<typeof import('./native-outline-ground').installNativeOutlineGround>|undefined;
let nativeGroundModule:typeof import('./native-outline-ground')|undefined;
let nativeDisplayModule:typeof import('./native-part-display')|undefined;
let nativeDisplayProfiles:typeof import('./native-part-display-profiles')|undefined;
let nativeOutlineTicket=0,nativeOutlineDisposed=false;
const nativeGroupNotice=document.createElement('p');nativeGroupNotice.className='hint';nativeGroupNotice.setAttribute('role','status');nativeGroupNotice.hidden=true;
const reportNativeGroupFallback=()=>{nativeGroupNotice.textContent=({zh:'部分建筑细节未能核验，当前显示原始来源模型。',en:'Some building details could not be verified. The source model is shown.',de:'Einige Gebäudedetails konnten nicht geprüft werden. Das Quellmodell wird angezeigt.'})[locale];nativeGroupNotice.hidden=false;};
let threeDimensionalControls:ReturnType<typeof installThreeDimensionalControls>|undefined;
let building3dInteraction:ReturnType<typeof installBuilding3dInteraction>|undefined;
let buildingInformation:typeof import('./building-3d-information')|undefined;
let buildingInformationPending:{signal:AbortSignal;promise:Promise<typeof import('./building-3d-information')>}|undefined;
function waitForBuildingInformation(operation:Promise<typeof import('./building-3d-information')>,signal:AbortSignal){
 signal.throwIfAborted();return new Promise<typeof import('./building-3d-information')>((resolve,reject)=>{
  let done=false;const finish=()=>{if(done)return false;done=true;signal.removeEventListener('abort',cancel);return true;};
  const cancel=()=>{if(finish())reject(signal.reason??new DOMException('Aborted','AbortError'));};
  signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
  operation.then(value=>{if(finish())resolve(value);},error=>{if(finish())reject(error);});
 });
}
function ensureBuildingInformation(signal:AbortSignal):Promise<typeof import('./building-3d-information')>{
 signal.throwIfAborted();if(buildingInformation)return Promise.resolve(buildingInformation);
 if(buildingInformationPending&&!buildingInformationPending.signal.aborted)return waitForBuildingInformation(buildingInformationPending.promise,signal);
 const promise=(async()=>{
  const {beginFrozenPaintTableInitialization}=await import('./frozen-paint-tables');signal.throwIfAborted();
  // This metadata phase completes before requestMode creates its renderer session.
  const session=beginFrozenPaintTableInitialization((path,request,max)=>boundedDataBytes(assetPath(path),request,max,'default'),signal,['city']);
  try{const module=await session.wait(import('./building-3d-information'));signal.throwIfAborted();buildingInformation=module;return module;}finally{session.close();}
 })();const pending={signal,promise};buildingInformationPending=pending;
 void promise.finally(()=>{if(buildingInformationPending===pending)buildingInformationPending=undefined;}).catch(()=>{});
 return waitForBuildingInformation(promise,signal);
}
let threeDimensionalClick=0;
let threeDimensionalRecovery:ReturnType<typeof installCustomLayerRecovery>|undefined;
let threeDimensionalScenery:ReturnType<typeof installThreeDimensionalScenery>|undefined;
const threeDimensionalMotion=matchMedia('(prefers-reduced-motion:reduce)');
let sceneEnvironment=defaultSceneEnvironment(matchMedia('(max-width:760px)').matches);
let sceneControls:ReturnType<typeof installSceneControls>|undefined;
let sceneRenderQuality:ReturnType<typeof installSceneRenderQuality>|undefined;
let sceneFrameClock:ReturnType<typeof createDisplayFrameClock>|undefined;
const syncSceneEnvironment=(state:SceneEnvironmentState)=>{sceneEnvironment={...state};if(mapGPUUnavailable)return;sceneRenderQuality?.setQuality(state.quality);threeDimensional?.setSceneEnvironment(state);environmentScene?.setSceneEnvironment(state);dedicatedAppearance?.setSceneEnvironment(state);sceneFrameClock?.wake();};
let localPalaceGarden:ReturnType<typeof installPalaceGarden>|undefined;
let environmentScene:ReturnType<typeof import('./environment-scene-manager').installEnvironmentScene>|undefined;
let environmentWanted=false,environmentDestroyed=false,environmentSuspended=false,environmentLoad:Promise<void>|undefined,environmentRequest=new AbortController(),environmentStatus='idle';
const syncEnvironmentMode=(value:boolean)=>{environmentWanted=value;if(!value){environmentRequest.abort();environmentScene?.setMode(false);return;}if(environmentScene){environmentScene.setMode(true);return;}if(environmentLoad||environmentDestroyed||environmentSuspended||document.hidden)return;
 const request=environmentRequest=new AbortController();environmentStatus='loading';environmentLoad=(async()=>{const [module,registry]=await Promise.all([import('./environment-scene-manager'),import('./environment-city-admission')]);request.signal.throwIfAborted();if(environmentDestroyed||!environmentWanted||environmentSuspended||threeDimensional?.mode!=='3d')return;
 const admission=registry.environmentWaterAdmission(currentCity);if(!admission){environmentStatus='city-source-not-installed';return;}const profile=await threeDimensional!.readAsset(admission,request.signal,1024**2) as Parameters<typeof module.installEnvironmentScene>[0]['waterAdmission'];request.signal.throwIfAborted();if(environmentDestroyed||!environmentWanted||environmentSuspended||threeDimensional?.mode!=='3d')return;
 environmentScene=module.installEnvironmentScene({map,city:currentCity,mobile:matchMedia('(max-width:760px)').matches,read:(asset,signal,max)=>threeDimensional!.readAsset(asset,signal,max),beforeLayer:()=>threeDimensional?.renderer?.layer.id,waterAdmission:profile,frameClock:sceneFrameClock});environmentScene.setReflectionSource(planarReflectionGroup(()=>[dedicatedAppearance,threeDimensional?.renderer]));environmentScene.setSceneEnvironment(sceneEnvironment);environmentScene.setVisible(!document.hidden);environmentScene.setReducedMotion(threeDimensionalMotion.matches);environmentScene.setMode(true);environmentStatus='installed';
 })().catch(()=>{if(!request.signal.aborted)environmentStatus='error';}).finally(()=>{environmentLoad=undefined;if(request.signal.aborted&&environmentWanted&&!environmentDestroyed&&!environmentSuspended&&!document.hidden)syncEnvironmentMode(true);});};

let dedicatedAppearance:ReturnType<typeof import('./dedicated-reichstag-manager').installDedicatedReichstag>|undefined;
let dedicatedWanted=false,dedicatedDestroyed=false,dedicatedInit:Promise<void>|undefined,dedicatedInitRequest=new AbortController();
const dedicatedNote=document.createElement('p');dedicatedNote.className='hint';dedicatedNote.setAttribute('role','status');dedicatedNote.hidden=true;
const appendDedicatedAttribution=(panel?:HTMLElement)=>{if(!dedicatedAppearance?.isVisible)return;const target=panel??app.querySelector<HTMLElement>('.building-3d-information[data-building-object="osm/relation/8990774"][data-building-part="osm/relation/8990774/component/35b9af608ec3d7abc1c1"]');if(!target||target.querySelector('.dedicated-reichstag-attribution'))return;const note=document.createElement('p');note.className='dedicated-reichstag-attribution';note.textContent=({zh:'白色基础体块上叠加了以国会大厦西立面为参照的MIT程序化外观。它是显示近似，不是测绘或照片纹理，也不增加楼层、店铺或原始高度信息。',en:'A MIT procedural appearance based on the Reichstag west facade is added over the white base block. It is a display approximation, not a survey or photo texture, and adds no storey, shop or source-height information.',de:'Über dem weißen Grundkörper liegt eine MIT-basierte prozedurale Darstellung der Reichstag-Westfassade. Sie ist eine Darstellungsnäherung, keine Vermessung oder Fototextur, und ergänzt keine Geschoss-, Geschäfts- oder Quellhöhenangaben.'})[locale];const source=document.createElement('a');source.href='https://github.com/Klotzkette/isometric-berlin/blob/cca429f4e72a1b1b962de4d944ec83fed96869e8/src/app/src/ArchitecturalLandmarks.ts';source.target='_blank';source.rel='noopener noreferrer';source.textContent=({zh:'专属外观来源 · Klotzkette · MIT',en:'Dedicated appearance source · Klotzkette · MIT',de:'Quelle der besonderen Darstellung · Klotzkette · MIT'})[locale];note.append(document.createElement('br'),source);target.append(note);};
const dedicatedStatus=(status:string)=>{if(status==='ready')appendDedicatedAttribution();else app.querySelectorAll('.dedicated-reichstag-attribution').forEach(n=>n.remove());dedicatedNote.hidden=!['partial','error','source-unbound'].includes(status);dedicatedNote.textContent=({zh:'此视野未显示部分专属建筑细节，原始建筑仍可查看。',en:'Some dedicated building detail is not shown in this view. The original building remains available.',de:'Ein Teil der besonderen Gebäudedetails wird in dieser Ansicht nicht gezeigt. Das ursprüngliche Gebäude bleibt verfügbar.'})[locale];if(!dedicatedNote.hidden&&!dedicatedNote.isConnected)app.querySelector('.three-dimensional-notices')?.append(dedicatedNote);};
const syncDedicatedAppearanceMode=(value:boolean)=>{dedicatedWanted=value;if(!value){dedicatedInitRequest.abort();dedicatedAppearance?.sync();dedicatedNote.hidden=true;return;}if(currentCity!=='berlin'||dedicatedDestroyed||document.hidden||mapGPUUnavailable)return;if(dedicatedAppearance){dedicatedAppearance.sync();return;}if(dedicatedInit)return;const own=dedicatedInitRequest=new AbortController();
 dedicatedInit=(async()=>{const module=await import('./dedicated-reichstag-manager');own.signal.throwIfAborted();if(dedicatedDestroyed||!dedicatedWanted||mapGPUUnavailable||document.hidden||threeDimensional?.mode!=='3d')return;
 dedicatedAppearance=module.installDedicatedReichstag({map,snapshot:()=>{const renderer=threeDimensional?.renderer,binding=threeDimensional?.getSourceBinding(module.REICHSTAG_OWNER);return {city:currentCity,mode:threeDimensional?.mode??'2d',generation:renderer?.getRevision().generation??0,nativeVertices:renderer?.stats.vertices??0,vertexLimit:matchMedia('(max-width:760px)').matches?100000:200000,binding:binding?.city==='berlin'?{...binding,city:'berlin' as const}:undefined,display:renderer?.getComponentDisplayState(module.REICHSTAG_OWNER)};},read:(asset,signal,max)=>threeDimensional!.readAsset(asset,signal,max),beforeLayer:()=>map.getStyle().layers?.find(l=>['scene-point-halo','scene-point','source-poi-reference-point','poi-center','poi-association-label','poi-point','kbo-navigation-point','kbo-navigation-label'].includes(l.id))?.id,onStatus:dedicatedStatus});dedicatedAppearance.setSceneEnvironment(sceneEnvironment);dedicatedAppearance.setPageHidden(document.hidden);dedicatedAppearance.sync();
 })().catch(()=>{if(!own.signal.aborted)dedicatedStatus('error');}).finally(()=>{dedicatedInit=undefined;if(own.signal.aborted&&dedicatedWanted&&!dedicatedDestroyed&&!document.hidden&&!mapGPUUnavailable)syncDedicatedAppearanceMode(true);});};
const syncThreeDimensionalVisibility=()=>{threeDimensionalRecovery?.setPageHidden(document.hidden);if(mapGPUUnavailable)return;sceneFrameClock?.setPageHidden(document.hidden||mapGPUUnavailable);sceneControls?.setPageHidden(document.hidden||mapGPUUnavailable);threeDimensional?.setPageHidden(document.hidden||mapGPUUnavailable);threeDimensionalScenery?.setVisible(!document.hidden&&!mapGPUUnavailable);environmentScene?.setVisible(!document.hidden&&!mapGPUUnavailable);localPalaceGarden?.setVisible(!document.hidden&&!mapGPUUnavailable);dedicatedAppearance?.setPageHidden(document.hidden||mapGPUUnavailable);if(document.hidden)dedicatedInitRequest.abort();else if(dedicatedWanted)syncDedicatedAppearanceMode(true);if(document.hidden)environmentRequest.abort();else if(environmentWanted)syncEnvironmentMode(true);};
const syncThreeDimensionalMotion=()=>{sceneControls?.setReducedMotion(threeDimensionalMotion.matches);if(mapGPUUnavailable)return;threeDimensional?.setReducedMotion(threeDimensionalMotion.matches);threeDimensionalControls?.setVehicleReducedMotion(threeDimensionalMotion.matches);threeDimensionalScenery?.setReducedMotion(threeDimensionalMotion.matches);environmentScene?.setReducedMotion(threeDimensionalMotion.matches);};
document.addEventListener('visibilitychange',syncThreeDimensionalVisibility);threeDimensionalMotion.addEventListener('change',syncThreeDimensionalMotion);
let basicOsmPanel:HTMLElement|undefined;
let baseShopLabels:ReturnType<typeof installBaseShopLabels>|undefined;
function communityVisibility() {if(mapGPUUnavailable)return;geographyBase?.visibility(el<HTMLInputElement>("community-toggle").checked);}
function communityDialog(id:string,_relatedKbo?:number) {geographyBase?.showDetails(id);}
const mobileLayout=installMobileLayout(app,{labels:{filters:t("mobile.filters"),showFilters:t("mobile.showFilters"),hideFilters:t("mobile.hideFilters"),map:t("mobile.map"),details:t("mobile.details"),skipToMap:t("mobile.skipToMap")},onLayoutChange:()=>map?.resize()});
const selectionInspector=installSelectionInspector(el('selection'),app.querySelector<HTMLElement>('.map-wrap')!,locale);
const longCopyDisclosure=installLongCopyDisclosure(app,locale);
const statisticsNames = Object.fromEntries(cityIds.map(city => [city, cityName(city, city)]));
statisticsNames.all14 = {zh:"14城合计",en:"14-city total",de:"Gesamt: 14 Städte"}[locale];
const statisticsReportUrls: Record<string, string> = {};
const datedBuildBinding = import.meta.env.VITE_DATED_STATISTICS_BINDING
  ? JSON.parse(import.meta.env.VITE_DATED_STATISTICS_BINDING) as {city:string;generation:string;records:number;source_versions:DatedTagBindings}
  : undefined;
const savedStatisticsEnabled = import.meta.env.VITE_SAVED_STATISTICS === "true";
// Build this UI only into artifacts that actually contain the checked saved-statistics assets.
// Keeping it outside the app avoids adding a row to the map's grid layout.
const statisticsPanel = savedStatisticsEnabled || datedBuildBinding ? mountContentTagLauncher(document.body, {locale, copy:CONTENT_TAG_COPY[locale],
  eagleUrl:new URL("../../../assets/brand/police-eagle.png", import.meta.url).href,
  boundsElement:app.querySelector<HTMLElement>(".map-wrap")!, id:"ai-statistics",
  staticReportUrls:statisticsReportUrls,currentStatisticsOnly:!savedStatisticsEnabled}) : undefined;
let statisticsRequest = new AbortController();
let statisticsReady = false;
async function loadStatistics() {
  if (!savedStatisticsEnabled || statisticsReady || !statisticsPanel) return;
  if (statisticsRequest.signal.aborted) statisticsRequest = new AbortController();
  const signal = statisticsRequest.signal;
  try {
    const snapshot = await loadSavedStatistics(currentCity, manifest.generation,
      Object.values(manifest.months).reduce((sum, month) => sum + month.count, 0), signal);
    if (signal.aborted) return;
    for (const key of Object.keys(statisticsReportUrls)) delete statisticsReportUrls[key];
    if (snapshot.binding.static_reports_checked)
      for (const key of [...cityIds, "all14"])
        statisticsReportUrls[key] = assetPath(`/statistics/static-reports/${key}.html`);
    statisticsPanel.setSummaries(snapshot.ordinary, statisticsNames, currentCity);
    statisticsPanel.setMacroSummaries(snapshot.macro);
    statisticsPanel.setCachedBriefs(snapshot.windows, snapshot.briefs);
    statisticsReady = true;
  } catch {
    if (signal.aborted) return;
    // An absent/stale optional overlay leaves the map usable and shows the existing unavailable copy.
    try { statisticsPanel.setSummaries([], statisticsNames, currentCity); } catch { /* cleared before validation */ }
  }
}

// Count-only dated statistics are bound independently from cached model prose.
const datedStatisticsPanel = datedBuildBinding ? mountDatedTagStatistics(el("methods-panel"), {locale}) : undefined;
const floatingDatedStatisticsPanel = datedBuildBinding && statisticsPanel && !savedStatisticsEnabled
  ? mountDatedTagStatistics(statisticsPanel.currentStatisticsHost, {locale}) : undefined;
let datedStatisticsRequest = new AbortController();
let datedStatisticsReady = false;
async function loadDatedStatistics() {
  if (!datedStatisticsPanel || !datedBuildBinding || datedStatisticsReady) return;
  if (datedStatisticsRequest.signal.aborted) datedStatisticsRequest = new AbortController();
  const signal = datedStatisticsRequest.signal;
  try {
    const records = Object.values(manifest.months).reduce((sum, month) => sum + month.count, 0);
    if (datedBuildBinding.city !== currentCity || datedBuildBinding.generation !== manifest.generation || datedBuildBinding.records !== records)
      throw Error("Dated statistics belong to another map snapshot");
    const catalogue = await fetchDataJSON<DatedTagCatalogue>(assetPath("/statistics/dated-tag-statistics.json"), signal);
    if (signal.aborted) return;
    if (!datedStatisticsPanel.setCatalogue(catalogue, datedBuildBinding.source_versions)) return;
    datedStatisticsPanel.setScope(currentCity);
    if (floatingDatedStatisticsPanel) {
      if (!floatingDatedStatisticsPanel.setCatalogue(catalogue, datedBuildBinding.source_versions)) return;
      floatingDatedStatisticsPanel.setScope(currentCity);
    }
    datedStatisticsReady = true;
  } catch {
    if (!signal.aborted) { datedStatisticsPanel.invalidate(); floatingDatedStatisticsPanel?.invalidate(); }
  }
}

let basemaps: Basemaps;
let activeHex: FC = empty();
let activePois: FC = empty();
let activeRoads: FC = empty();
let activeScenes: FC = empty();
let activeSourcePois:FC=empty();
let loaded = false;
let expired = false;
let freshnessTimer: ReturnType<typeof setInterval>;
let selected:
  | { type: "hex" | "poi"; id: string }
  | { type: "road"; ids: string[] }
  | { type: "scene"; ids: string[] }
  | { type: "source_poi"; ids: string[] }
  | { type: "report"; ids: string[] }
  | null = null;
let pendingSearchPoiId: string | null = null;
let client: DataClient;
let manifest: Manifest;
const bootstrapRequest=new AbortController();
let losslessData:Awaited<ReturnType<typeof import('./lossless-bootstrap').prepareLosslessData>>;
let losslessDataStatus='unconfigured';
let monthRequest = new AbortController();
let monthLoading = false;
let yearRequest=new AbortController();
let yearReportRequest=new AbortController();
let annual:YearData|undefined;
let annualLoading:Promise<void>|undefined;
let annualLoadingKey="";
let annualReportCache:{key:string;rows:PoliceEvent[];missing:Map<string,number>}|undefined;
let viewportRequest = new AbortController();
let viewportTimer: ReturnType<typeof setTimeout>;
let currentMode = "";
let searchIndex:
  | { id: string; name: string; kind: string; scope_category?:string; center: [number, number] }[]
  | undefined;
let searchLoading: Promise<void> | undefined;
const searchRequest=new AbortController();
let pendingRecoverySelection=mapRetry?.snapshot.selection??null;
const mapRecoveryNotice=mountMapRecoveryNotice({host:app.querySelector<HTMLElement>('.controls')!,locale,onReports:()=>{
 const ids=events().map(e=>e.id),panel=openDialog(t('report.scenes'));let page=0;
 const render=()=>{panel.replaceChildren();text('h2',t('selection.announcementCount',{count:number(ids.length)}),panel);listReports(panel,ids.slice(page*20,(page+1)*20));
  const nav=document.createElement('nav');panel.append(nav);const previous=text('button','←',nav) as HTMLButtonElement,next=text('button','→',nav) as HTMLButtonElement;
  previous.type=next.type='button';previous.setAttribute('aria-label',t('unknown.previous'));next.setAttribute('aria-label',t('unknown.next'));previous.disabled=page===0;next.disabled=(page+1)*20>=ids.length;
  previous.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};};render();
},onRetry:()=>{
 const center=map.getCenter(),snapshot={camera:{center:[center.lng,center.lat] as [number,number],zoom:map.getZoom(),bearing:map.getBearing()},category:el<HTMLSelectElement>('category').value,
  toggles:Object.fromEntries(RECOVERY_TOGGLES.map(id=>[id,el<HTMLInputElement>(id).checked])),poiKinds:[...document.querySelectorAll<HTMLInputElement>('#poi-filters input:checked')].map(input=>input.value),selection:selected??pendingRecoverySelection,controls:captureRecoveryControls(app),basemap:el<HTMLSelectElement>('basemap').value,vehicles:threeDimensionalControls?.vehiclesRequested};
 history.replaceState(null,'',mapRecoveryReloadURL(location.href,monthKey(),snapshot));location.reload();
}});
function monthKey() {
  return `${el<HTMLSelectElement>("year").value}-${el<HTMLSelectElement>("month").value}`;
}
function periodLabel() {const key=monthKey();return isYearPublicationPeriod(key)?`${key.slice(0,4)} · ${t("filter.yearToDate")}`:key;}
function events() {
  return monthEvents(data, monthKey(), el<HTMLSelectElement>("category").value);
}
function kinds() {
  if (!el<HTMLInputElement>("poi-toggle").checked) return new Set<string>();
  return new Set(
    [
      ...document.querySelectorAll<HTMLInputElement>(
        "#poi-filters input:checked",
      ),
    ].map((x) => x.value),
  );
}
const viewportSources=new Set(['hex','candidate-roads','scenes','source-poi-references']);
const viewportSourceData=new Map<string,FC>();
const viewportRenderInputs:Record<string,{available:number;transferred:number}>={};
const deferredSourceData=new Map<string,FC>();
function setSource(id: string, fc: FC) {
  if(viewportSources.has(id))viewportSourceData.set(id,fc);
  if(mapGPUUnavailable){deferredSourceData.set(id,fc);return;}
  deferredSourceData.delete(id);
  if(viewportSources.has(id)){
    const b=map.getBounds(),visible=viewportRenderData(fc,[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()]);
    viewportRenderInputs[id]={available:fc.features.length,transferred:visible.features.length};
    (map.getSource(id) as maplibregl.GeoJSONSource).setData(visible);
  }else (map.getSource(id) as maplibregl.GeoJSONSource).setData(fc);
}
function focusRoad(event: PoliceEvent) {
  if(mapGPUUnavailable){selected={type:'report',ids:[event.id]};el<HTMLDialogElement>('drawer').close();showSelection();return;}
  const geometry = candidateRoadGeometry(event);
  if (!geometry) return;
  pendingSearchPoiId = null;
  selected = { type: "road", ids: [event.id] };
  el<HTMLInputElement>("candidate-roads-toggle").checked = true;
  setRoadVisibility();
  const [west, south, east, north] = roadBounds(geometry);
  map.fitBounds(
    [
      [west, south],
      [east, north],
    ],
    { padding: 55, maxZoom: 14 },
  );
  el<HTMLDialogElement>("drawer").close();
  showSelection();
}
function focusReviewedScenes(scenes: SceneLocation[]) {
  if(mapGPUUnavailable)return;
  let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
  const visit=(value:unknown):void=>{
    if(!Array.isArray(value))return;
    if(value.length>=2 && typeof value[0]==="number" && typeof value[1]==="number"){
      if(!Number.isFinite(value[0])||!Number.isFinite(value[1])||Math.abs(value[0])>180||Math.abs(value[1])>90)return;
      west=Math.min(west,value[0]);east=Math.max(east,value[0]);south=Math.min(south,value[1]);north=Math.max(north,value[1]);return;
    }
    value.forEach(visit);
  };
  for(const scene of scenes)if(scene.geometry && "coordinates" in scene.geometry)visit(scene.geometry.coordinates);
  if(!Number.isFinite(west))return;
  map.fitBounds([[west,south],[east,north]],{padding:55,maxZoom:scenes.some(s=>s.static_scene_reference===true)?17:14});
  el<HTMLDialogElement>("drawer").close();
}
function appendLazyReportBody(parent:HTMLElement,event:PoliceEvent) {
  const identity:ReportBodyIdentity={
    city:currentCity,
    month:String(displayMonth(event)??""),
    // Native source IDs are distinct from namespaced UI event IDs.
    source_id:reportBodySourceId(event,currentCity),
    source_url:event.source_url,
    source_sha256:String(event.source_sha256??""),
  };
  const language=locale as ReportBodyLocale;
  const copy:Record<ReportBodyLocale,{loading:string;failed:string;retry:string;identity:string}>={
    de:{loading:"Volltext wird geladen …",failed:"Der Volltext ist derzeit nicht verfügbar.",retry:"Erneut versuchen",identity:"Für diese Quellenfassung sind keine vollständigen Quelldaten hinterlegt."},
    en:{loading:"Loading full text …",failed:"The full text is currently unavailable.",retry:"Try again",identity:"No complete source record is available for this revision."},
    zh:{loading:"正在加载正文…",failed:"目前无法加载正文。",retry:"重试",identity:"此来源版本没有可用的完整正文记录。"},
  };
  const disclosure=document.createElement("details");
  disclosure.className="report-body-disclosure";
  disclosure.dataset.reportBody="true";
  disclosure.dataset.sourceId=identity.source_id;
  parent.append(disclosure);
  const summary=text("summary",pendingReportBodyLabel(language),disclosure);
  const content=document.createElement("div");
  content.className="report-body-content";
  disclosure.append(content);
  let loadedLocale="";
  let request:AbortController|undefined;
  const load=async()=>{
    request?.abort();
    const currentRequest=new AbortController();
    request=currentRequest;
    const signal=currentRequest.signal;
    content.replaceChildren();
    content.dataset.state="loading";
    text("small",copy[language].loading,content);
    try{
      if(!identity.source_url||!identity.source_sha256)throw new Error("identity");
      const result=await loadReportBody(identity,language,signal);
      if(signal.aborted||request!==currentRequest||!content.isConnected)return;
      const presentation=reportBodyPresentation(result.contentClass,language,Boolean(result.body));
      summary.textContent=presentation.label;
      content.replaceChildren();
      if(presentation.note)text("small",presentation.note,content);
      if(result.body){
        const paragraph=text("p",result.body,content);
        paragraph.className="report-body-text";
        content.dataset.state="loaded";
      }else{
        content.dataset.state="unavailable";
      }
      loadedLocale=language;
      request=undefined;
    }catch(error){
      if(request!==currentRequest||!content.isConnected)return;
      content.replaceChildren();
      const cancelled=signal.aborted||(error instanceof Error&&error.name==="AbortError");
      request=undefined;
      if(cancelled){
        content.dataset.state="idle";
        return;
      }
      text("small",error instanceof Error&&error.message==="identity"?copy[language].identity:copy[language].failed,content);
      content.dataset.state="failed";
      const retry=text("button",copy[language].retry,content) as HTMLButtonElement;
      retry.type="button";
      retry.className="report-body-retry";
      retry.onclick=()=>void load();
    }
  };
  disclosure.addEventListener("toggle",()=>{
    if(disclosure.open){
      if(loadedLocale!==language&&content.dataset.state!=="loading")void load();
    }else if(request&&!request.signal.aborted){
      request.abort();
      request=undefined;
      content.replaceChildren();
      content.dataset.state="idle";
    }
  });
}
function listReports(parent: HTMLElement, ids: string[], displayOverride?:PoliceEvent[], missingOverride?:Map<string,number>) {
  const wanted = new Set(ids);
  for (const e of (displayOverride ?? dynamicText.displayRows(data.events.filter((e) => wanted.has(e.id)))).filter((e) => wanted.has(e.id))) {
    const card = document.createElement("article");
    card.className = "report";
    card.dataset.sourceId = e.id;
    parent.append(card);
    text(
      "small",
      `${e.event_date ? date(e.event_date) : t("report.publishedMonth",{month:e.month??"—"})} · ${categoryLabel(e.category)} · ${precisionLabels[e.location_precision] ?? t("precision.unknown")}`,
      card,
    );
    if (e.source_status === "uncertain")
      text("small", t("report.sourceUncertain"), card);
    if (e.source_status && ["unavailable","refresh_failed"].includes(e.source_status)) {
      const status = sourceStatusLabels[e.source_status];
      text(
        "small",
        status ?? (e.source_status === "unavailable"
          ? t("report.sourceUnavailable")
          : t("report.sourceRefreshFailed")),
        card,
      );
    }
    if (e.source_scope_verdict === "uncertain")
      text("small", t("report.cityUncertain"), card);
    text("h4", e.title, card);
    const summary=reportSummaryPresentation(e.summary,e.source_summary);
    if(summary?.kind==="provider_summary")text("small",t("report.providerSummary",{provider:e.upstream_provider??t("report.dataProvider")}),card).className="report-summary-source";
    if(summary)text("p",summary.text,card).className="report-summary";
    appendLazyReportBody(card,e);
    if(missingOverride ? missingOverride.get(e.id) : dynamicText.missingFor(e))text("small",t("report.translationMissing"),card);
    const publicFields=new Set(e.public_display_fields??[]);
    if (publicFields.has("map_review_note") && e.map_review_note) text("p", t("source.mapReview",{note:e.map_review_note}), card);
    appendPublicEventNotes(card,e);
    for(const related of relatedSourceLinks(e))link(card,t("sourceRevision.related",{id:related.related_source_id}),related.related_source_url);
    if (e.published_at_source_literal) text("small", t("time.publicationLiteral",{date:e.published_at_source_literal}), card);
    if (e.published_at_timezone_basis === "Europe/Berlin") text("small",t("time.publicationZoneNote"),card);
    for (const attachment of publicFields.has("source_attachments") ? e.source_attachments ?? [] : []) {
      const disclosure = document.createElement("details"); card.append(disclosure);
      text("summary", t("attachment.details",{pages:attachment.page_count}), disclosure);
      text("p",attachment.note,disclosure);
      link(disclosure,t("attachment.reviewed"),attachment.source_url);
    }
    if (publicFields.has("source_supporting_materials") && e.source_supporting_materials?.length) {
      const disclosure = document.createElement("details"); disclosure.className="source-supporting-materials";card.append(disclosure);
      text("summary",t("source.supportingHeading",{count:e.source_supporting_materials.length}),disclosure);
      for(const material of e.source_supporting_materials){text("p",material.note,disclosure);link(disclosure,material.label,material.source_url);}
    }
    for(const claim of publicFields.has("current_claim_overlays") ? e.current_claim_overlays??[] : [])text("p",t("source.claimNote",{note:claim.display_note}),card);
    for(const history of publicFields.has("historical_source_reviews") ? e.historical_source_reviews??[] : []) {
      const disclosure=document.createElement("details");disclosure.className="historical-source-review";card.append(disclosure);
      text("summary",t("source.historyHeading",{count:history.source_incidents.length}),disclosure);
      link(disclosure,history.title,history.source_url);
      text("small",t("time.publicationLiteral",{date:history.published_at_source_literal}),disclosure);
      text("p",history.review_note,disclosure);
      for(const incident of history.source_incidents) {
        const stage=document.createElement("section");disclosure.append(stage);
        text("strong",t("report.originalTime",{times:incident.event_time.display}),stage);text("p",incident.details,stage);
        for(const location of history.formal_locations.filter(location=>incident.formal_location_ids.includes(location.location_id))){
          text("small",`${sceneRoleLabel(location.role)} · ${location.label} · ${precisionLabels[location.precision]??t("precision.unknown")}`,stage);
          text("small",location.poi_review.note,stage);text("small",location.transit_review.note,stage);
        }
      }
    }
    for(const comparison of publicFields.has("source_reference_comparisons") ? e.source_reference_comparisons??[] : [])text("small",t("source.relationNote",{note:comparison.review_note}),card);

    for (const tag of e.reviewed_tags ?? []) {
      const label = reviewedTagLabels[tag.tag];
      if (label)
        text("small", t("report.aiLead",{label,quote:tag.evidence_quote}), card);
    }
    text("p", e.location_label, card);
    if (e.location_scope && locationScopeLabels[e.location_scope])
      text("small", locationScopeLabels[e.location_scope], card);
    if (e.scene_locations?.length) {
      const heading = text("small", t("report.scenes"), card);
      heading.className = "scene-heading";
      const scenes = document.createElement("ul");
      scenes.className = "scene-list";
      card.append(scenes);
      for (const scene of e.scene_locations) {
        const item = document.createElement("li");
        scenes.append(item);
        text("strong", `${sceneRoleLabel(scene.role)} · ${scene.label}`, item);
        text(
          "small",
          `${scene.case_relation ? `${sceneRelationLabels[scene.case_relation]} · ` : ""}${precisionLabels[sceneDisplayPrecision(scene)] ?? t("precision.unknown")} · ${scene.primary_for_count ? t("report.primary") : t("report.displayOnly")}${scene.candidate_road_geometry ? ` · ${t("report.roadPending")}` : ""}`,
          item,
        );
        const eventTimes = [
          scene.event_time?.display,
          ...(scene.incidents ?? []).map((incident) => incident.event_time?.display),
        ].filter((value): value is string => Boolean(value));
        const uniqueTimes = [...new Set(eventTimes)];
        if (uniqueTimes.length)
          text("small", t("report.originalTime",{times:uniqueTimes.join("; ")}), item);
        if (scene.transit_route)
          text(
            "small",
            `${scene.transit_route.mode} ${scene.transit_route.line} · ${transitGeometryLabel(scene)}`,
            item,
          );
        if (scene.geometry_usage === "source_native_platform_points_reference_only")
          text("small",t("geometry.platformReference",{count:scene.native_platform_count??scene.location_object_ids?.length??0}),item);
        if (scene.geometry_usage === "source_station_platform_footprint_reference_only")text("small",t("geometry.stationPlatformReference"),item);
        if (scene.geometry_usage === "official_attachment_horizontal_reference_only")text("small",t("attachment.horizontal"),item);
        if(scene.source_attachment_url)link(item,t("attachment.source"),scene.source_attachment_url);
        if(scene.geometry && (scene.geometry_usage?.endsWith("reference_only") || scene.static_scene_reference)){
          const button=text("button",t("geometry.showReference"),item) as HTMLButtonElement;button.type="button";button.onclick=()=>focusReviewedScenes([scene]);
        }
        if (scene.geometry_usage === "source_native_collection_reference_only")
          text("small", t("geometry.collectionReference"), item);
        if (scene.geometry_usage === "source_footprint_reference_only")
          text("small", scene.geocode_method === "osm_park_footprint_reference"
            ? t("geometry.parkReference")
            : scene.geocode_method === "official_district_footprint_reference"
            ? t("geometry.districtReference")
            : scene.geocode_method === "osm_water_footprint_reference"
            ? t("geometry.waterReference")
            : scene.actual_non_transit_extent_known === false
            ? t("geometry.nonTransitReference")
            : t("geometry.footprintReference"), item);
        if (scene.geometry_usage === "source_road_reference_only" && !scene.transit_route)
          text("small", t("geometry.roadNoPoint",{reference:transitGeometryLabel(scene)}), item);
        if (scene.geometry_usage === "source_junction_reference_only")
          text("small", t("geometry.junctionReference"), item);
        const details = [
          scene.details,
          ...(scene.incidents ?? []).map((incident) => incident.details),
        ].filter((value): value is string => Boolean(value));
        for (const detail of [...new Set(details)]) text("small", detail, item);
        appendPublicSceneReferenceNote(item,scene);

        if (scene.poi_contexts?.length) {
          const kinds = [...new Set(scene.poi_contexts.map((context) =>
            sourceContextName(context.kind)))];
          text(
            "small",
            t("report.poiContext",{types:kinds.join(", ")}),
            item,
          );
        }
      }
      text(
        "small",
        t("report.countPolicy"),
        card,
      );
    }
    const otherStages=unplacedStages(e);
    if(otherStages.length){
      text("small",t("report.otherStages"),card).className="scene-heading";
      const list=document.createElement("ul");list.className="scene-list unplaced-stages";card.append(list);
      for(const stage of otherStages){const item=document.createElement("li");item.dataset.incidentId=stage.incident_id;list.append(item);
       text("strong",t(stage.formal_location_ids?.length?"report.stagePlaceUnmatched":"report.stagePlaceUnknown"),item);
       if(stage.event_time?.display)text("small",t("report.originalTime",{times:stage.event_time.display}),item);
       if(stage.details)text("small",stage.details,item);
      }
    }
    if (e.geocode_method === "multiple_official_scenes")
      text(
        "small",
        e.coordinates
          ? t("report.multiPlacesCount")
          : t("report.multiPlacesNoCount"),
        card,
      );
    if (e.geocode_method === "multi_event_summary")
      text("small", t("report.multiSummary"), card);
    if (e.location_selection === "first_explicit_incident_scene")
      text(
        "small",
        e.coordinates
          ? t("report.incidentFirst")
          : t("report.incidentUnresolved"),
        card,
      );
    const otherScenes = [
      ...new Set(e.other_scene_candidates?.map((s) => s.name) ?? []),
    ];
    if (otherScenes.length)
      text(
        "small",
        t("report.otherScenes",{places:otherScenes.join(", "),countStatus:t(e.coordinates?"report.countedOnce":"report.notCounted")}),
        card,
      );
    const road = candidateRoadGeometry(e);
    if (road) {
      text(
        "small",
        t("report.roadUnresolved",{reason:t(e.geocode_method==="disconnected_street_review"?"report.roadDisconnected":"report.roadAmbiguous")}),
        card,
      ).className = "road-caution";
      if (e.location_scope)
        text("small", t("report.locationScope",{scope:e.location_scope}), card);
      const button = text("button", t("report.showRoad"), card);
      button.className = "road-focus";
      button.onclick = () => focusRoad(e);
    }
    if (e.location_extent_m !== undefined && e.location_extent_m > 75)
      text(
        "small",
        t("report.locationExtent",{metres:number(e.location_extent_m),locationStatus:t(e.coordinates?"report.approximateCount":"report.exactUnresolved")}),
        card,
      );
    link(card, t("report.source"), e.source_url);
    if (e.poi_mentions.length)
      text(
        "small",
        t("report.sourcePlaceTypes",{types:e.poi_mentions.map(sourceContextName).join(", ")}),
        card,
      );
  }
}
function showSelection() {
  abortPendingReportBodyLoads();
  if(!selected&&!basicOsmPanel)selectionInspector.close();
  if(selected&&!mapGPUUnavailable){building3dInteraction?.clear();publicTransitOverlay?.clearSelection();}
  const panel = el("selection");
  yearReportRequest.abort();
  yearReportRequest=new AbortController();
  panel.replaceChildren();
  setSource("reported-sections", empty());
  if (!selected) {
    if(basicOsmPanel){panel.append(basicOsmPanel);return;}
    text("h2", t("selection.prompt"), panel);
    text("p", t("selection.intro"), panel);
    return;
  }
  if(!mapGPUUnavailable)osmClickInspection?.clear();
  if(!mapGPUUnavailable&&selected.type==="poi"){const objectId=selected.id;const object=activePois.features.find(f=>String(f.properties.id)===objectId);if(object)osmClickInspection?.highlight(object);}
  if(selected.type==="report"){
    const ids=selected.ids.filter(id=>data.events.some(e=>e.id===id));
    text("h2",t("selection.announcementCount",{count:number(ids.length)}),panel);
    text("p",t("selection.reportedSection"),panel);
    listReports(panel,ids);return;
  }
  if(selected.type==="source_poi"){
    const available=new Set(sceneEventIds(activeSourcePois.features));selected.ids=selected.ids.filter(id=>available.has(id));
    if(!selected.ids.length){selected=null;text("p",t("selection.objectEmpty"),panel);return;}
    text("h2",t("selection.announcementCount",{count:number(selected.ids.length)}),panel);text("p",t("rules.context_limitation"),panel);listReports(panel,selected.ids);return;
  }
  if (selected.type === "scene") {
    const available = new Set(sceneEventIds(activeScenes.features));
    selected.ids = selected.ids.filter((id) => available.has(id));
    if (!selected.ids.length) {
      selected = null;
      text("p", t("selection.sceneEmpty"), panel);
      return;
    }
    text("p", t("selection.scenes"), panel).className = "eyebrow";
    text("h2", t("selection.announcementCount",{count:number(selected.ids.length)}), panel);
    text("p", t("selection.sceneNote"), panel);
    listReports(panel, selected.ids);
    return;
  }
  if (selected.type === "road") {
    const available = new Set(
      activeRoads.features.map((f) => String(f.properties.id)),
    );
    selected.ids = selected.ids.filter((id) => available.has(id));
    if (!selected.ids.length) {
      selected = null;
      text("p", t("selection.roadEmpty"), panel);
      return;
    }
    text("p", t("selection.road"), panel).className = "eyebrow";
    text("h2", t("selection.roadCount",{count:number(selected.ids.length)}), panel);
    text(
      "p",
      t("selection.roadNote"),
      panel,
    ).className = "road-caution";
    listReports(panel, selected.ids);
    return;
  }
  const selection = selected;
  const f = (selection.type === "hex" ? activeHex : activePois).features.find(
    (f) => f.properties.id === selection.id,
  );
  if (!f) {
    if (selection.type === "poi" && pendingSearchPoiId === selection.id) {
      text("p", t("map.loadingPlace"), panel);
      return;
    }
    selected = null;
    text("p", t("selection.objectEmpty"), panel);
    return;
  }
  pendingSearchPoiId = null;
  const p = f.properties;
  if(selection.type==="hex") {
    text("p",t("legend.yearHex",{year:el<HTMLSelectElement>("year").value}),panel).className="eyebrow";
    text("h2",t("selection.announcementCount",{count:number(p.count)}),panel);
    text("p",t("selection.yearHexSize",{year:el<HTMLSelectElement>("year").value,metres:number(p.edge_m)}),panel);
    text("p",t("selection.outcomeUnknown"),panel).className="hint";
    const ids=[...(p.event_ids??[])].sort((a:string,b:string)=>(annual?.event_months[b]??"").localeCompare(annual?.event_months[a]??"")||a.localeCompare(b));
    const list=text("div","",panel);let page=0;
    const controls=text("nav","",panel),previous=text("button",t("selection.yearPrevious"),controls),label=text("span","",controls),next=text("button",t("selection.yearNext"),controls);
    const render=()=>{yearReportRequest.abort();yearReportRequest=new AbortController();const signal=yearReportRequest.signal;list.replaceChildren();label.textContent=t("selection.yearPage",{page:number(page+1),pages:number(Math.max(1,Math.ceil(ids.length/20)))});(previous as HTMLButtonElement).disabled=page===0;(next as HTMLButtonElement).disabled=(page+1)*20>=ids.length;
      text("p",t("selection.yearLoading"),list);void annualReports(ids.slice(page*20,page*20+20),signal).then(value=>{if(signal.aborted||selected!==selection||!list.isConnected)return;list.replaceChildren();listReports(list,ids,value.rows,value.missing);}).catch(error=>{if(!signal.aborted){console.error(error);list.replaceChildren();text("p",t("map.loadFailed"),list);}});};
    previous.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};render();return;
  }
  setSource("reported-sections", {
    type: "FeatureCollection",
    features: data.events
      .filter(
        (e) =>
          (p.event_ids ?? []).includes(e.id) && e.reported_location_geometry,
      )
      .map((e) => ({
        type: "Feature",
        geometry: e.reported_location_geometry!,
        properties: { id: e.id },
      })),
  });
  if (
    data.events.some(
      (e) => (p.event_ids ?? []).includes(e.id) && e.reported_location_geometry,
    )
  )
    text("p", t("selection.reportedSection"), panel);
  if (selected.type === "hex") {
    text("p", t("selection.hex"), panel).className = "eyebrow";
    text("h2", t("selection.announcementCount",{count:number(p.count)}), panel);
    text("p", t("selection.hexSize",{metres:number(p.edge_m),month:monthKey()}), panel);
    const rows = data.events.filter((e) =>
      (p.event_ids as string[]).includes(e.id),
    );
    const counts: Record<string, number> = {};
    for (const e of rows) counts[e.category] = (counts[e.category] ?? 0) + 1;
    for (const [key, n] of Object.entries(counts))
      text("p", `${categoryLabel(key)}　${n}`, panel);
    text("p", t("selection.outcomeUnknown"), panel).className =
      "hint";
  } else {
    text(
      "p",
      poiName(p.display_kind??p.kind,data.catalog.poi_types[p.display_kind??p.kind]?.label ?? p.kind),
      panel,
    ).className = "eyebrow";
    text("h2", p.name, panel);
    text("p",t("selection.poiAssociationLevel",{count:number(p.association_announcement_count??0),level:p.association_roman||"—"}),panel);
    const levelMethod=text("details","",panel);
    text("summary",t("selection.poiLevelMethod"),levelMethod);
    text("p",t("selection.poiLevelFormula"),levelMethod);
    text(
      "p",
      poiGeometryLabel(p.geometry_mode),
      panel,
    );
    text(
      "p",
      t("selection.poiCounts",{mentions:number(p.count),candidates:number(p.candidate_count),contexts:number(p.context_count??0)}),
      panel,
    );
    text("p", t("selection.poiNote"), panel).className =
      "hint";
    if (p.opening_hours) text("p", t("selection.openingHours",{hours:p.opening_hours}), panel);
    for (const [key,value] of [["selection.address",p.address],["selection.phone",p.phone]])
      if(typeof value==="string" && value.trim()) text("p",t(String(key),{value}),panel);
    if(typeof p.website==="string") link(panel,t("selection.website"),p.website);
    link(panel, t("selection.osm"), p.source_url);
    const sources = data.catalog.sources.filter((s) =>
      Array.isArray(s.poi_types) && s.poi_types.includes(p.kind),
    );
    const details = document.createElement("details");
    panel.append(details);
    text(
      "summary",
      t("selection.poiSources",{count:number(sources.length)}),
      details,
    );
    for (const s of sources) {
      text("p", `${s.country} · ${s.place} · ${s.evidence_type}`, details);
      link(details, s.publisher, s.url);
      text("p", catalogSummary(s), details);
    }
  }
  if (!(p.event_ids ?? []).length) text("p", t("selection.noLinkedReports"), panel).className="hint";
  listReports(panel, p.event_ids ?? []);
}
function paintOverlays() {
  if(mapGPUUnavailable)return;
  const max = Math.max(1, ...activeHex.features.map((f) => f.properties.count));
  const base = basemaps?.rendered ?? "local";
  baseShopLabels?.setBasemapActive(base==="vector");
  map.setPaintProperty("hex-fill", "fill-opacity", [
    "interpolate",
    ["linear"],
    ["get", "count"],
    0,
    base === "street" ? 0.06 : 0.1,
    max,
    base === "local" ? 0.68 : base === "aerial" ? 0.52 : 0.46,
  ]);
  map.setPaintProperty(
    "hex-line",
    "line-color",
    base === "aerial" ? "#ffb4aa" : "#ac3737",
  );
  map.setPaintProperty(
    "hex-line",
    "line-opacity",
    base === "aerial" ? 0.75 : 0.45,
  );
  map.setPaintProperty("poi-circle", "circle-opacity", ["get", "opacity"]);
  map.setPaintProperty("poi-fill", "fill-opacity", ["get", "opacity"]);
}
function setRoadVisibility() {
  if(mapGPUUnavailable)return;
  const visibility = el<HTMLInputElement>("candidate-roads-toggle").checked
    ? "visible"
    : "none";
  for (const layer of ["candidate-roads-line", "candidate-roads-hit"])
    map.setLayoutProperty(layer, "visibility", visibility);
}
function refresh() {
  if (!loaded || expired) return;
  const month = data.months[monthKey()],
    rows = events(),
    ids = new Set(rows.map((e) => e.id)),
    countable = countableEventIds(rows);
  const mode =
    map.getZoom() >= data.metadata.zoom_threshold ? "detail" : "overview";
  const selectedYear=el<HTMLSelectElement>("year").value, category=el<HTMLSelectElement>("category").value;
  const yearIds=new Set(annual?.year===selectedYear ? annual.countable_event_ids.filter(id=>category==="all"||annual!.event_categories[id]?.includes(category)) : []);
  activeHex = annual?.year===selectedYear ? filteredHex(annual.hex[mode],yearIds) : empty();
  el("year-hex-title").textContent=t("legend.yearHex",{year:selectedYear});
  activePois = styledPois(
    data,
    month?.links ?? [],
    ids,
    kinds(),
    el<HTMLInputElement>("highlight").checked,
  );
  const noHighlightedPlaces = el<HTMLInputElement>("highlight").checked && !activePois.features.some(f=>f.properties.association_announcement_count>0);
  el("highlight-note").textContent = (noHighlightedPlaces ? t("legend.highlightNone")+" " : "")+t("legend.highlightNote");
  activeRoads = candidateRoads(rows);
  activeScenes = sceneFeatures(rows);
  const roleLabels: Record<string,string> = {incident:t("legend.incident"),discovery:t("legend.discovery"),operation:t("legend.operation"),context:t("legend.context")};
  const presentRoles = [...new Set(activeScenes.features.map(f => String(f.properties.role_group)))];
  el("scene-availability").textContent = t("legend.available", {types:presentRoles.map(role => roleLabels[role] ?? roleLabels.context).join(" · ") || t("legend.noGeometry")});
  const transitAvailable = activeScenes.features.some(f => ["transit_route","transit_line_reference"].includes(f.properties.geometry_kind));
  el("transit-availability").textContent = transitAvailable ? "" : t("legend.noTransit");
  el("transit-availability").hidden = transitAvailable;

  activeSourcePois=sourcePoiReferences(rows,month?.source_poi_reference_features);
  setSource("hex", activeHex);
  setSource("pois", renderPois(activePois));
  setSource("poi-centers", poiCenters(activePois));
  if(!mapGPUUnavailable){baseShopLabels?.updateExistingPois(poiCenters(activePois));
  map.setLayoutProperty("poi-association-label","visibility",el<HTMLInputElement>("highlight").checked ? "visible" : "none");}
  setSource("candidate-roads", activeRoads);
  setSource("scenes", activeScenes);
  setSource("source-poi-references",activeSourcePois);
  setRoadVisibility();
  if(!mapGPUUnavailable){map.setLayoutProperty(
    "hex-fill",
    "visibility",
    el<HTMLInputElement>("hex-toggle").checked ? "visible" : "none",
  );
  map.setLayoutProperty(
    "hex-line",
    "visibility",
    el<HTMLInputElement>("hex-toggle").checked ? "visible" : "none",
  );
  }
  el("hex-empty-note").hidden = annualLoadingKey===selectedYear || yearIds.size > 0 || !el<HTMLInputElement>("hex-toggle").checked;
  el("hex-empty-note").textContent=t(annual?.year===selectedYear ? "legend.emptyHex" : "legend.yearUnavailable");
  currentMode = mode;
  paintOverlays();
  el("resolution").textContent =
    t("legend.resolution",{metres:number(mode === "detail" ? 275 : 1100)});
  el("map-status").textContent = monthLoading
    ? t("map.loadingMonth")
    : month
      ? t("map.monthCount",{month:periodLabel(),count:number(rows.length)})
      : t("map.monthMissing",{month:periodLabel()});
  el("stats").replaceChildren();
  text("div", month ? number(rows.length) : "—", el("stats")).className = "big";
  text("p", month ? t("coverage.filtered") : t("coverage.noMonth"), el("stats"));
  if (month) {
    const coverage = locationCoverage(rows, activeScenes);
    const noCountIds = new Set(coverage.withoutCountPointIds);
    const unmapped = rows.filter((event) => noCountIds.has(event.id));
    const sceneAware = rows.some((event) => event.scene_locations !== undefined);
    text(
      "p",
      sceneAware
        ? t("coverage.countPoints",{countable:number(coverage.countableAnnouncements),without:number(unmapped.length),references:number(coverage.withoutCountPointWithDisplayGeometry)})
        : t("coverage.located",{located:number(rows.length-unmapped.length),unresolved:number(unmapped.length),roads:number(activeRoads.features.length)}),
      el("stats"),
    );
    const btn = text(
      "button",
      t(sceneAware ? "coverage.noPointList" : "coverage.unresolvedList",{count:number(unmapped.length)}),
      el("stats"),
    );
    btn.onclick = () => {
      const p = openDialog(sceneAware ? t("coverage.noPointTitle") : t("coverage.unresolvedTitle"));
      text(
        "p",
        data.metadata.upstream_provider === "POLIZEIKARTE"
          ? t("coverage.munichUnknown")
          : sceneAware
            ? t("coverage.noPointNote")
            : t("coverage.roadUnknownNote"),
        p,
      );
      listReports(
        p,
        unmapped.map((e) => e.id),
      );
    };
  }
  methodsPanel.update(rows,{month:monthKey(),selectedMonths:savedPublicationMonths(monthKey(),Object.keys(manifest.months)),periodLabel:periodLabel(),city:currentCity,generation:manifest.generation,category:el<HTMLSelectElement>("category").value,metadata:manifest.metadata,countReferenceIds:[...countable]});
  uncertaintyPanel.update(dynamicText.displayRows(rows));
  if(pendingRecoverySelection){const saved=pendingRecoverySelection;
   const available=saved.type==='poi'?activePois.features.some(f=>String(f.properties.id)===saved.id):saved.type==='hex'?activeHex.features.some(f=>String(f.properties.id)===saved.id):!monthLoading&&'ids' in saved&&saved.ids.some(id=>data.events.some(e=>e.id===id));
   if(available){selected=saved;pendingRecoverySelection=null;}
  }
  showSelection();
}
function clearClosedReportDialog() {
  // A queued close event may arrive after the same drawer has reopened.
  if (el<HTMLDialogElement>("drawer").open) return;
  abortPendingReportBodyLoads();
  el("drawer-content").replaceChildren();
}
function openDialog(title: string, returnFocus?: HTMLElement) {
  abortPendingReportBodyLoads();
  const p = el("drawer-content");
  p.replaceChildren();
  text("h2", title, p).id="drawer-title";
  el("drawer").setAttribute("aria-labelledby","drawer-title");
  const drawer = el<HTMLDialogElement>("drawer");
  if (returnFocus) {
    const fallback = returnFocus.closest("section")?.querySelector<HTMLElement>(".uncertainty-filter");
    drawer.addEventListener("close", () => {
      if (!drawer.open) (returnFocus.isConnected ? returnFocus : fallback?.isConnected ? fallback : undefined)?.focus({ preventScroll: true });
    }, { once: true });
  }
  drawer.showModal();
  return p;
}
function externalMapsDialog() {
  const p = openDialog(t("external.title"));
  text(
    "p",
    t("external.note"),
    p,
  );
  const nav = text("nav", "", p);
  nav.className = "city-map-links";
  nav.setAttribute("aria-label", t("external.polizeikarteAria"));
  for (const id of cityIds) {
    const a = text("a", cityName(id, id), nav) as HTMLAnchorElement;
    a.href = cityDestination(id, `?lang=${locale}`, monthKey());
    a.dataset.projectCity = id;
  }
}
function sourcesDialog() {
  const p = openDialog(
    data.metadata.upstream_provider === "POLIZEIKARTE"
      ? t("sources.munichTitle")
      : t("sources.title"),
  );
  if (data.metadata.upstream_provider === "POLIZEIKARTE") {
    text(
      "p",
      t("sources.munichNote"),
      p,
    );
    link(p, t("sources.munichLink"), cityView.policeUrl);
  }
  const n = data.catalog.coverage.filter(
    (c) => c.status === "sources_verified_partial",
  ).length;
  text(
    "p",
    t("sources.coverage",{countries:number(n),materials:number(data.catalog.sources.length)}),
    p,
  );
  text(
    "p",
    t("sources.prevention",{city:localizedCity}),
    p,
  );
  for (const s of data.catalog.sources) {
    const card = document.createElement("article");
    p.append(card);
    text("h3", `${s.country} / ${s.place}`, card);
    text("small", t("sources.verified",{type:s.evidence_type,date:date(s.verified_on)}), card);
    text("p", catalogSummary(s), card);
    link(card, s.publisher + " ↗", s.url);
  }
  text(
    "p",
    t("sources.pendingCountries",{countries:
      data.catalog.coverage
        .filter((c) => c.status === "not_yet_verified")
        .map((c) => c.country)
        .join(", ")}),
    p,
  );
}
function kboDialog(selectedIndex?:number) {
  const p = openDialog(t("kbo.title"));
  text(
    "p",
    t("kbo.note"),
    p,
  );
  for (const [index, zone] of kboZones.places.entries()) {
    if(selectedIndex!==undefined&&index!==selectedIndex)continue;
    const card = document.createElement("article");
    p.append(card);
    text("h3", zone.name, card);
    link(card, t("kbo.boundary"), zone.official_map_url);
    link(card, t("kbo.source"), zone.source_url);
    const image = document.createElement("img");
    image.className = "kbo-official-map";
    image.src = zone.official_map_url;
    image.alt = t("kbo.imageAlt", {place: zone.name});
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    card.append(image);
    const b = text("button", t("kbo.navigate"), card);
    b.onclick = () => {
      if (zone.approximate_geometry?.type === "Polygon") {
        const points = zone.approximate_geometry.coordinates.flat();
        const bounds = new maplibregl.LngLatBounds();
        for (const point of points) bounds.extend([point[0],point[1]]);
        if (!bounds.isEmpty()) map.fitBounds(bounds,{padding:55,maxZoom:15});
        else map.flyTo({ center: zone.navigation_center, zoom: 15 });
      } else map.flyTo({ center: zone.navigation_center, zoom: 15 });
      el<HTMLDialogElement>("drawer").close();
    };
  }
}
async function annualReports(ids:string[],signal:AbortSignal) {
  if(!annual)throw Error("No annual index");const key=manifest.generation+"/"+annual.year+"/"+locale+"/"+ids.join(",");
  if(annualReportCache?.key===key)return annualReportCache;
  const groups=new Map<string,string[]>();for(const id of ids){const month=annual.event_months[id];if(!month)throw Error("Missing report month");groups.set(month,[...(groups.get(month)??[]),id]);}
  const rows:PoliceEvent[]=[],missing=new Map<string,number>();
  for(const[month,wanted]of groups){signal.throwIfAborted();const value=await client.month(month,signal);if(!value)throw Error("Missing referenced month");const selectedRows=value.events.filter(e=>wanted.includes(e.id));const language=new DynamicTranslations();await language.load(selectedRows,manifest,client,month,locale,signal,currentCity);rows.push(...language.displayRows(selectedRows));for(const e of selectedRows)missing.set(e.id,language.missingFor(e));}
  signal.throwIfAborted();if(rows.length!==ids.length)throw Error("Incomplete annual cell reports");const result={key,rows,missing};annualReportCache=new TextEncoder().encode(JSON.stringify(rows)).byteLength<=4*1024*1024?result:undefined;return result;
}
function ensureYear():Promise<void> {
  const year=el<HTMLSelectElement>("year").value;if(!/^\d{4}$/.test(year)){annual=undefined;return Promise.resolve();}if(annual?.year===year)return Promise.resolve();if(annualLoadingKey===year&&annualLoading)return annualLoading;
  yearRequest.abort();yearRequest=new AbortController();const signal=yearRequest.signal;annual=undefined;annualLoadingKey=year;
  annualLoading=(async()=>{try{const value=await client.year(year,signal);if(!signal.aborted&&year===el<HTMLSelectElement>("year").value)annual=value;}catch(error){if(!signal.aborted)console.error(error);}finally{if(!signal.aborted){annualLoadingKey="";annualLoading=undefined;refresh();}}})();return annualLoading;
}
async function loadMonth() {
  selectionInspector.close();basicOsmPanel=undefined;osmClickInspection?.clear();
  abortPendingReportBodyLoads();
  yearReportRequest.abort();void ensureYear();
  monthRequest.abort();
  monthRequest = new AbortController();
  const signal = monthRequest.signal;
  const key = monthKey();
  monthLoading = true;
  data.events = [];
  data.months = {};
  dynamicText.clear();
  refresh();
  el("map-status").textContent = t("map.loadingMonth");
  try {
    const value = await loadSelectedPeriod(key,manifest,client,locale,signal,currentCity);
    if (signal.aborted || key !== monthKey()) return;
    // Publish the complete selection only after each actual month's language snapshot.
    dynamicText.mergeLoadedMonths(value.snapshots);
    data.events = value.events;
    data.months = value.month ? { [key]: value.month } : {};
    monthLoading = false;
    pendingSearchPoiId = null;
    selected = null;
    refresh();
  } catch (error) {
    if (!signal.aborted) {
      monthLoading = false;
      data.events = [];
      data.months = {};
      refresh();
      console.error(error);
      el("map-status").textContent = t("map.loadFailed");
      el("stats").replaceChildren();text("p",t("map.loadFailed"),el("stats"));
    }
  }
}
async function loadViewport() {
  if (!loaded || expired || mapGPUUnavailable) return;
  viewportRequest.abort();
  viewportRequest = new AbortController();
  const signal = viewportRequest.signal;
  const b = map.getBounds(),
    bounds: [number, number, number, number] = [
      b.getWest(),
      b.getSouth(),
      b.getEast(),
      b.getNorth(),
    ];
  const detail = map.getZoom() >= 12.5;
  // Saved announcements can reappear after a pan even if the independent roads
  // or POI request fails. This reuses full current-period geometry in memory.
  for(const [id,full]of viewportSourceData)setSource(id,full);
  // Clear stale places immediately; details are requested only at useful scale.
  data.pois = empty();
  activePois = empty();
  setSource("pois", empty());
  setSource("roads", empty());
  try {
    const [roads, pois] = await Promise.all([
      detail
        ? client.viewport("roads", bounds, signal)
        : client.json<FC>(`${client.base}/roads-overview.json`, signal),
      detail && kinds().size > 0
        ? client.viewport("pois", bounds, signal, [...kinds()])
        : Promise.resolve(empty()),
    ]);
    if (signal.aborted || expired || mapGPUUnavailable) return;
    setSource("roads", roads);
    data.pois = pois;
    refresh();
    if (!detail) el("map-status").textContent += ` · ${t("map.zoomForPlaces")}`;
  } catch (error) {
    if (!signal.aborted) { console.error(error);el("map-status").textContent = t("map.loadFailed"); }
  }
}
async function start() {
  try {
    const manifestRaw=await rawBoundedDataBytes(cityView.manifestPath,bootstrapRequest.signal,1024**2,'no-store');
    manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(manifestRaw)) as Manifest;
    const physicalModule=await import('./lossless-bootstrap');
    bootstrapRequest.signal.throwIfAborted();
    losslessData=await physicalModule.prepareLosslessData({city:currentCity,generation:manifest.generation,manifestRaw,dataRoot:cityView.dataRoot,signal:bootstrapRequest.signal});
    losslessDataStatus=losslessData?'configured':'raw-compatible';
    if (manifest.city !== cityView.manifestCity)
      throw Error(t("error.cityMismatch"));
    if (new URLSearchParams(location.search).has("diagnostics") && (
      manifest.owner_approved === false ||
      manifest.publication_ready === false ||
      manifest.status?.includes("unapproved")
    ))
      el("review-badge").hidden = false;
    client = new DataClient(manifest, cityView.dataRoot);
    void loadStatistics();void loadDatedStatistics();
    data = {
      ...manifest,
      schema_version: 1,
      coverage: "official_archive",
      expires_at: "",
      events: [],
      months: {},
      pois: empty(),
    };
    await loadCatalogTranslations(data.catalog.sources);
    const months = Object.keys(manifest.months).sort();
    const latest = requestedMonth(window.location.search, months, months.at(-1) ?? data.retrieved_at.slice(0, 7));
    const years = [...new Set(months.filter(m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m)).map(m=>m.slice(0,4)))];
    for (const y of years) el<HTMLSelectElement>("year").add(new Option(y, y));
    el<HTMLSelectElement>("month").add(new Option(t("filter.yearToDate"),"all"));
    for (let m = 1; m <= 12; m++)
      el<HTMLSelectElement>("month").add(
        new Option(new Intl.DateTimeFormat(localeCode,{month:"long"}).format(new Date(2026,m-1,1)), String(m).padStart(2, "0")),
      );
    el<HTMLSelectElement>("year").value = latest.slice(0, 4);
    el<HTMLSelectElement>("month").value = latest.slice(5);
    for (const c of manifest.categories)
      el<HTMLSelectElement>("category").add(new Option(categoryLabel(c), c));
    const filters=manifest.poi_scope_groups?Object.fromEntries(Object.entries(manifest.poi_scope_groups).map(([key,value])=>[key,{label:t(value.label_key),color:data.catalog.poi_types[value.kinds[0]]?.color??"#64748b"}])):data.catalog.poi_types;
    for (const [key, value] of Object.entries(filters)) {
      const label = document.createElement("label");
      label.className = "toggle";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = key;
      input.checked = ["bar", "nightclub", "station", "shop"].includes(key);
      input.onchange = () => {refresh();void loadViewport();};
      label.append(input);
      const swatch = document.createElement("i");
      swatch.style.background = value.color;
      label.append(swatch, document.createTextNode(poiName(key,value.label)));
      el("poi-filters").append(label);
    }
    if(mapRetry){const saved=mapRetry.snapshot;
     if([...el<HTMLSelectElement>('category').options].some(o=>o.value===saved.category))el<HTMLSelectElement>('category').value=saved.category;
     for(const id of RECOVERY_TOGGLES)el<HTMLInputElement>(id).checked=saved.toggles[id];
     for(const input of document.querySelectorAll<HTMLInputElement>('#poi-filters input')){input.checked=saved.poiKinds.includes(input.value);input.disabled=!saved.toggles['poi-toggle'];}
    }
    el("poi-toggle").onchange = () => {
      const enabled=el<HTMLInputElement>("poi-toggle").checked;
      for(const input of document.querySelectorAll<HTMLInputElement>("#poi-filters input")) input.disabled=!enabled;
      pendingSearchPoiId=null;
      if(selected?.type==="poi") {selected=null;if(!mapGPUUnavailable)osmClickInspection?.clear();}
      refresh();void loadViewport();
    };
    if(manifest.metadata.candidate_notice)text("p",String(manifest.metadata.candidate_notice),el("coverage").parentElement!);
    for(const [field,key] of [["source_reference_review_url","source.reviewDetails"],["historical112_service_review_url","source.serviceHistory"]]) {
      const path=manifest.metadata[field];
      if(typeof path==="string" && path.startsWith(`${manifest.generation}/`) && /^[a-zA-Z0-9_.\/-]+$/.test(path)
          && !path.split("/").some(part=>part==="."||part==="..")) {
        const a=document.createElement("a");a.textContent=t(key);a.href=`${cityView.dataRoot}/${path}`;a.target="_blank";a.rel="noopener noreferrer";el("coverage").after(a);
      }
    }
    const outside = Number(manifest.metadata.known_outside_municipality ?? 0);
    const cityPoints = Number(manifest.metadata.point_entries_in_city ?? 0);
    el("coverage").textContent = manifest.metadata.upstream_provider === "POLIZEIKARTE"
      ? t("coverage.munich",{fetched:number(manifest.coverage.fetched),points:number(cityPoints),outside:number(outside)})
      : t("coverage.official",{discovered:number(manifest.coverage.discovered),fetched:number(manifest.coverage.fetched),pending:number(manifest.coverage.pending)});
    el("freshness").textContent =
      t("coverage.snapshot",{date:date(data.retrieved_at)});
    map = new maplibregl.Map({
      container: "map",
      center: mapRetry?.snapshot.camera.center??cityView.center,
      zoom: mapRetry?.snapshot.camera.zoom??12.1,
      bearing: mapRetry?.snapshot.camera.bearing??0,
      attributionControl: false,
      locale: {"NavigationControl.ZoomIn":t("aria.zoomIn"),"NavigationControl.ZoomOut":t("aria.zoomOut"),"NavigationControl.ResetBearing":t("aria.resetBearing"),"Map.Title":t("map.aria",{city:localizedCity}),"AttributionControl.ToggleAttribution":t("aria.toggleAttribution")},
      canvasContextAttributes: {antialias:true, powerPreference:"high-performance"},
      maxTileCacheSize: 64,
      cancelPendingTileRequestsWhileZooming: true,
      refreshExpiredTiles: false,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#edf1ed" },
          },
        ],
      },
    });
    sceneFrameClock=createDisplayFrameClock({requestRepaint:()=>map.triggerRepaint()});
    sceneFrameClock.setPageHidden(document.hidden);
    sceneRenderQuality=installSceneRenderQuality(map,sceneEnvironment.quality);
    localLifecycleDiagnostics?.attachMap(map);
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }),
      "bottom-left",
    );
    map.addControl(
      new maplibregl.AttributionControl({
        // MapLibre collapses attribution automatically on narrow maps.
        customAttribution:
          `<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">${html(t("map.attributionPlaces"))}: © OpenStreetMap contributors</a> / <a href="https://www.geofabrik.de/" target="_blank" rel="noopener noreferrer">Geofabrik</a> · <a href="${cityView.policeUrl}" target="_blank" rel="noopener noreferrer">${html(t("report.source"))}: ${cityView.policeName}</a>`,
      }),
      "bottom-left",
    );
    // Reserve a measured vertical stack for attribution, scale, then reading notes.
    const overlayHost=document.querySelector<HTMLElement>(".map-wrap")!;
    const scaleElement=map.getContainer().querySelector<HTMLElement>(".maplibregl-ctrl-scale")!;
    const lowerControls=map.getContainer().querySelector<HTMLElement>(".maplibregl-ctrl-bottom-left")!;
    const updateScaleSpacing=()=>{
      overlayHost.style.setProperty("--map-scale-height",scaleElement.getBoundingClientRect().height+"px");
      overlayHost.style.setProperty("--map-lower-controls-height",lowerControls.getBoundingClientRect().height+"px");
    };
    const scaleSpacingObserver=new ResizeObserver(updateScaleSpacing);
    scaleSpacingObserver.observe(scaleElement);scaleSpacingObserver.observe(lowerControls);updateScaleSpacing();
    map.once("remove",()=>scaleSpacingObserver.disconnect());
    map.once("load", async () => {
      for (const id of [
        "roads",
        "source-poi-references",
        "hex",
        "pois",
        "communities",
        "community-names",
        "poi-centers",
        "kbo",
        "kbo-navigation",
        "kbo-approximate",
        "reported-sections",
        "candidate-roads",
        "scenes",
      ])
        map.addSource(id, { type: "geojson", data: empty() });
      map.addLayer({
        id: "roads-line",
        type: "line",
        source: "roads",
        paint: {
          "line-color": "#bac6c0",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 16, 2],
        },
      });
      // Invisible hit surface only; visible community geometry is an unfilled black outline.
      map.addLayer({id:"community-hit",type:"fill",source:"communities",paint:{"fill-color":"#000000","fill-opacity":0}});
      map.addSource("community-hover",{type:"geojson",data:empty()});
      map.addLayer({id:"community-hover",type:"fill",source:"community-hover",paint:{"fill-color":"#2679c6","fill-opacity":0.42}});
      map.addLayer({id:"community-line",type:"line",source:"communities",paint:{"line-color":"#000000","line-width":0.8,"line-opacity":0.85}});
      map.addLayer({id:"community-label",type:"symbol",source:"community-names",
        layout:{"text-field":["get","name"],"text-size":12,"text-font":["Open Sans Regular","Arial Unicode MS Regular"],"text-allow-overlap":true},
        paint:{"text-color":"#000000","text-halo-color":"#ffffff","text-halo-width":1}});

      map.addLayer({
        id: "hex-fill",
        maxzoom: 16,
        type: "fill",
        source: "hex",
        paint: { "fill-color": "#d54949", "fill-opacity": 0.4 },
      });
      map.addLayer({
        id: "hex-line",
        maxzoom: 16,
        type: "line",
        source: "hex",
        paint: {
          "line-color": "#ac3737",
          "line-width": 0.6,
          "line-opacity": 0.45,
        },
      });
      map.addLayer({
        id: "poi-fill",
        type: "fill",
        source: "pois",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": ["get", "opacity"],
        },
      });
      map.addLayer({
        id: "poi-line",
        type: "line",
        source: "pois",
        filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "LineString"]],
        paint: {
          "line-color": "#000000",
          "line-width": 1,
          "line-opacity": 0.8,
        },
      });
      map.addLayer({
        id: "poi-circle",
        type: "circle",
        source: "pois",
        filter: ["all", ["has", "display_radius_m"], ["==", ["geometry-type"], "Point"]],
        paint: {
          "circle-radius": ["interpolate", ["exponential", 2], ["zoom"],
            0, ["get", "radius_px_z0"], 24, ["*", 16777216, ["get", "radius_px_z0"]]],
          "circle-pitch-alignment": "map",
          "circle-pitch-scale": "map",
          "circle-color": ["get", "color"],
          "circle-opacity": ["get", "opacity"],
          "circle-stroke-color": "#000000",
          "circle-stroke-width": 1,
          "circle-stroke-opacity": 0.8,
        },
      });
      map.addLayer({
        id: "poi-point",
        type: "circle",
        source: "pois",
        filter: ["all", ["==", ["geometry-type"], "Point"], ["!", ["has", "display_radius_m"]]],
        paint: {
          "circle-radius": 4,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#000000",
          "circle-opacity": ["get", "opacity"],
          "circle-stroke-opacity": 0.8,
        },
      });
      map.addLayer({
        id: "kbo-boundary",
        type: "line",
        source: "kbo",
        paint: {
          "line-color": "#171717",
          "line-width": 1.2,
          "line-dasharray": [4, 2],
        },
      });
      map.addLayer({
        id: "reported-sections-line",
        type: "line",
        source: "reported-sections",
        paint: { "line-color": "#7c3aed", "line-width": 5 },
      });
      map.addLayer({
        id: "candidate-roads-line",
        type: "line",
        source: "candidate-roads",
        paint: {
          "line-color": "#e87917",
          "line-width": 4,
          "line-dasharray": [2, 1.5],
        },
      });
      map.addLayer({
        id: "candidate-roads-hit",
        type: "line",
        source: "candidate-roads",
        paint: { "line-width": 14, "line-opacity": 0 },
      });
      map.addLayer({
        id: "scene-area-fill",
        type: "fill",
        source: "scenes",
        // Administrative/background surfaces have no fill, so they cannot intercept interior POI clicks.
        filter: ["all", ["==", ["geometry-type"], "Polygon"], ["!", ["any", ["==", ["get", "role_group"], "context"], ["in", ["get", "location_precision"], ["literal", ["city", "district", "area", "unknown"]]]]]],
        paint: { "fill-color": sceneColor, "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "scene-area-outline",
        type: "line",
        source: "scenes",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "line-color": sceneColor, "line-width": 2 },
      });
      map.addLayer({
        id: "scene-line-casing",
        type: "line",
        source: "scenes",
        filter: [
          "all",
          ["==", ["geometry-type"], "LineString"],
          ["!=", ["get", "geometry_kind"], "candidate_road"],
          ["!=", ["get", "geometry_kind"], "transit_route"],
          ["!=", ["get", "geometry_kind"], "transit_line_reference"],
        ],
        paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 1 },
      });
      map.addLayer({
        id: "scene-line",
        type: "line",
        source: "scenes",
        filter: [
          "all",
          ["==", ["geometry-type"], "LineString"],
          ["!=", ["get", "geometry_kind"], "candidate_road"],
          ["!=", ["get", "geometry_kind"], "transit_route"],
          ["!=", ["get", "geometry_kind"], "transit_line_reference"],
        ],
        paint: { "line-color": sceneColor, "line-width": 4 },
      });
      map.addLayer({
        id: "scene-line-hit", type:"line",source:"scenes",
        filter:["all",["==",["geometry-type"],"LineString"],["!=",["get","geometry_kind"],"candidate_road"],["!=",["get","geometry_kind"],"transit_route"],["!=",["get","geometry_kind"],"transit_line_reference"]],
        paint:{"line-width":14,"line-opacity":0},
      });
      map.addLayer({
        id: "scene-transit-route-casing",
        type: "line",
        source: "scenes",
        filter: ["==", ["get", "geometry_kind"], "transit_route"],
        paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 1 },
      });
      map.addLayer({
        id: "scene-transit-route",
        type: "line",
        source: "scenes",
        filter: ["==", ["get", "geometry_kind"], "transit_route"],
        paint: {
          "line-color": "#6d4bc3",
          "line-width": 5,
          "line-dasharray": [2, 1.2],
        },
      });
      map.addLayer({
        id: "scene-transit-line-reference-casing",
        type: "line",
        source: "scenes",
        filter: ["==", ["get", "geometry_kind"], "transit_line_reference"],
        paint: { "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.55 },
      });
      map.addLayer({
        id: "scene-transit-line-reference",
        type: "line",
        source: "scenes",
        filter: ["==", ["get", "geometry_kind"], "transit_line_reference"],
        paint: {
          "line-color": "#6d4bc3",
          "line-width": 2,
          "line-opacity": 0.45,
          "line-dasharray": [1, 3],
        },
      });
      map.addLayer({
        id: "scene-transit-line-reference-hit",
        type: "line",
        source: "scenes",
        filter: ["==", ["get", "geometry_kind"], "transit_line_reference"],
        paint: { "line-width": 14, "line-opacity": 0 },
      });
      map.addLayer({
        id: "scene-candidate-road-line-casing",
        type: "line",
        source: "scenes",
        filter: ["==", ["get", "geometry_kind"], "candidate_road"],
        paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.85 },
      });
      map.addLayer({
        id: "scene-candidate-road-line",
        type: "line",
        source: "scenes",
        filter: ["==", ["get", "geometry_kind"], "candidate_road"],
        paint: {
          "line-color": sceneColor,
          "line-width": 3,
          "line-dasharray": [2, 1.5],
        },
      });
      map.addLayer({
        id: "scene-candidate-road-hit",
        type: "line",
        source: "scenes",
        filter: ["==", ["get", "geometry_kind"], "candidate_road"],
        paint: { "line-width": 14, "line-opacity": 0 },
      });
      map.addLayer({
        id: "scene-point-halo",
        type: "circle",
        source: "scenes",
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-radius": 7, "circle-color": "#ffffff", "circle-opacity": 0, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
      });
      map.addLayer({
        id: "scene-point",
        type: "circle",
        source: "scenes",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": ["case",["==",["get","geometry_usage"],"source_native_platform_points_reference_only"],"#a16207",sceneColor],
          "circle-opacity": 0.14,
          "circle-stroke-color": ["case",["==",["get","geometry_usage"],"source_native_platform_points_reference_only"],"#a16207",sceneColor],
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({id:"source-poi-reference-fill",type:"fill",source:"source-poi-references",filter:["==",["geometry-type"],"Polygon"],paint:{"fill-color":"#677785","fill-opacity":0.12}});
      map.addLayer({id:"source-poi-reference-line",type:"line",source:"source-poi-references",filter:["!=",["geometry-type"],"Point"],paint:{"line-color":"#677785","line-width":2,"line-opacity":0.7}});
      map.addLayer({id:"source-poi-reference-point",type:"circle",source:"source-poi-references",filter:["==",["geometry-type"],"Point"],paint:{"circle-radius":5,"circle-color":"#677785","circle-opacity":0.5,"circle-stroke-width":1,"circle-stroke-color":"#ffffff"}});
      setSource("kbo", {
        type: "FeatureCollection",
        features: cityView.kbo ? kboZones.features : [],
      });
      const approximateFeatures = cityView.kbo ? kboZones.places.flatMap((zone,index) => {
        const geometry = zone.approximate_geometry;
        if (!geometry || geometry.type !== "Polygon" || !geometry.coordinates.length) return [];
        const valid = geometry.coordinates.every(ring => ring.length >= 4 && ring.every(point =>
          point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
          Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90) &&
          ring[0][0] === ring[ring.length-1][0] && ring[0][1] === ring[ring.length-1][1]);
        if (!valid) return [];
        return [{type:"Feature" as const,geometry,properties:{id:`kbo-approximate:${index}`,zone_index:index,name:zone.name,purpose:"approximate_reference_only_not_legal_boundary_not_counted"}}];
      }) : [];
      setSource("kbo-approximate",{type:"FeatureCollection",features:approximateFeatures});
      map.addLayer({id:"kbo-approximate-fill",type:"fill",source:"kbo-approximate",paint:{"fill-color":"#e53935","fill-opacity":0.25}});
      if(new URLSearchParams(location.search).get("paintQaClearOverlay")==="1")map.setLayoutProperty("kbo-approximate-fill","visibility","none");
      map.addLayer({id:"kbo-approximate-outline",type:"line",source:"kbo-approximate",paint:{"line-color":"#000000","line-width":1.2}});
      const navigationFeatures = cityView.kbo ? kboZones.places.map((zone,index) => ({type:"Feature" as const,geometry:{type:"Point" as const,coordinates:zone.navigation_center},properties:{id:`kbo-navigation:${index}`,zone_index:index,name:zone.name,purpose:"approximate_navigation_only_not_legal_boundary"}})) : [];
      setSource("kbo-navigation",{type:"FeatureCollection",features:navigationFeatures});
      map.addLayer({id:"kbo-navigation-point",type:"circle",source:"kbo-navigation",paint:{"circle-radius":6,"circle-color":"#3c6681","circle-stroke-color":"#fff","circle-stroke-width":2}});
      map.addLayer({id:"kbo-navigation-label",type:"symbol",source:"kbo-navigation",layout:{"text-field":["concat","kbO · ",["get","name"]],"text-size":11,"text-offset":[0,1.2],"text-anchor":"top"},paint:{"text-color":"#244a64","text-halo-color":"#fff","text-halo-width":1.5}});
      map.addLayer({id:"poi-center-halo",type:"circle",source:"poi-centers",paint:{
        "circle-radius":5,"circle-color":"#ffffff","circle-opacity":0.9}});
      map.addLayer({id:"poi-center",type:"circle",source:"poi-centers",paint:{
        "circle-radius":3,"circle-color":["get","center_color"],"circle-opacity":1,
        "circle-stroke-color":"#000000","circle-stroke-width":1,"circle-stroke-opacity":1}});
      map.addLayer({id:"poi-association-label",type:"symbol",source:"poi-centers",
        filter:["!=",["get","association_roman"],""],
        layout:{"text-field":["get","association_roman"],"text-size":10,
          "text-font":["Open Sans Regular","Arial Unicode MS Regular"],
          "text-anchor":"top","text-offset":[0,0.8],"text-allow-overlap":false,"text-ignore-placement":false},
        paint:{"text-color":"#000000","text-halo-color":"#ffffff","text-halo-width":0.5}});
      geographyBase=installGeographyBase({fetchBytes:(path,signal,policy)=>boundedDataBytes(assetPath(path),signal,8*1024*1024,policy??(path==="/safety/geography/official-regional-scope-metrics.json"?"no-store":"default")),map,host:app.querySelector<HTMLElement>(".map-wrap")!,city:currentCity,locale,
        fetchJSON:(path,signal,policy)=>{
          const mutable=policy==='no-store'||path==="/safety/geography/reference-rules/manifest.json"||path==="/safety/geography/index.json"||path==="/safety/geography/metric-coverage.json"||/^\/safety\/geography\/official-(?:municipal-scope|regional-scope|crime-scope|scope)-metrics\.json$/.test(path);
          return mutable?fetchFreshManifest<unknown>(assetPath(path),signal):fetchDataJSON<unknown>(assetPath(path),signal);
        },
        onChange:ref=>{communities=ref;el<HTMLInputElement>("community-toggle").disabled=!ref.available;
          const note=el("community-note");note.textContent=ref.available?String(ref.metadata.division_level??t("community.referenceOnly")):t("community.unavailable");communityVisibility();}});
      void geographyBase.load().then(()=>restoreRecoveryControls(app,mapRetry?.snapshot.controls,'geography'));
      electoralOverlay=installElectoralOverlay({map,canAutoInspect:()=>threeDimensional?.mode!=='3d',onInspect:(_election,_unit,panel)=>{building3dInteraction?.clear();publicTransitOverlay?.clearSelection();if(threeDimensional?.mode==='3d'){selected=null;pendingSearchPoiId=null;basicOsmPanel=panel.cloneNode(true) as HTMLElement;el('selection').replaceChildren(basicOsmPanel);mobileLayout.revealDetails();basicOsmPanel.scrollIntoView({block:'start',inline:'nearest'});}},host:(app.querySelector<HTMLElement>(".mobile-filter-content")??app.querySelector<HTMLElement>(".controls"))!,city:currentCity,locale,fetchJSON:(path,signal)=>path==='/safety/elections/index.json'?fetchFreshManifest<unknown>(assetPath(path),signal):fetchDataJSON<unknown>(assetPath(path),signal),fetchVerifiedJSON:(path,hash,signal)=>verifiedElectoralJSON(assetPath(path),hash,signal),assetURL:path=>assetPath(path),palette:electoralPartyPalette});
      void electoralOverlay.load().then(()=>restoreRecoveryControls(app,mapRetry?.snapshot.controls,'election'));
      publicTransitOverlay=installPublicTransitOverlay({map,onSelectionChange:choice=>threeDimensional?.setOpacityContext(choice?'route-selection':'normal'),host:(app.querySelector<HTMLElement>(".mobile-filter-content")??app.querySelector<HTMLElement>(".controls"))!,city:currentCity,locale,fetchBytes:(path,signal,maxBytes)=>boundedDataBytes(assetPath(path),signal,maxBytes,path==="/safety/transit/index.json"?"no-store":"default")});
      void publicTransitOverlay.load().then(()=>restoreRecoveryControls(app,mapRetry?.snapshot.controls,'transit'));
      baseShopLabels=installBaseShopLabels({map,host:(app.querySelector<HTMLElement>(".mobile-filter-content")??app.querySelector<HTMLElement>(".controls"))!,locale,diagnostics:location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).get('qaShopSource')==='1'});
      restoreRecoveryControls(app,mapRetry?.snapshot.controls,'shops');
      osmClickInspection=installOsmClickInspection(map,locale,panel=>{selected=null;basicOsmPanel=panel;el("selection").replaceChildren(panel);selectionInspector.open();});
      const dimensionHost=app.querySelector<HTMLElement>('.geography-dimensions')!;
      dimensionHost.replaceChildren();
      app.querySelector<HTMLElement>('.controls')?.append(nativeGroupNotice);
      threeDimensional=installThreeDimensionalMap({map,city:currentCity,onNativeGroupDisplay:plan=>{
        const ticket=++nativeOutlineTicket;
        nativeGroupNotice.hidden=!plan.errors.length&&!plan.groups.length;
        if(plan.errors.length)reportNativeGroupFallback();
        else if(plan.groups.length)nativeGroupNotice.textContent=plan.groups.map(g=>({zh:`${g.name}：已载入部件／声明部件 ${g.residentPartCount} / ${g.declaredPartCount}，当前展示不完整。`,en:`${g.name}: loaded parts / declared parts ${g.residentPartCount} / ${g.declaredPartCount}. This display is incomplete.`,de:`${g.name}: geladene Teile / deklarierte Teile ${g.residentPartCount} / ${g.declaredPartCount}. Die Darstellung ist unvollständig.`})[locale]).join(' ');
        if(!plan.groups.length){nativeOutlineGround?.update(plan);for(const notice of app.querySelectorAll('[data-native-group]'))notice.remove();return;}
        void Promise.all([import('./native-outline-ground'),import('./native-part-display'),import('./native-part-display-profiles')]).then(([ground,display,profiles])=>{
          if(nativeOutlineDisposed||ticket!==nativeOutlineTicket||threeDimensional?.wantedMode!=='3d')return;
          nativeGroundModule=ground;nativeDisplayModule=display;nativeDisplayProfiles=profiles;
          nativeOutlineGround??=ground.installNativeOutlineGround({map,locale,canInspect:()=>!nativeOutlineDisposed&&!mapGPUUnavailable&&!document.hidden&&threeDimensional?.mode==='3d'&&threeDimensional?.wantedMode==='3d',inspect:(feature,outline)=>{
            const view=osmClickInspection!.inspect(feature);
            if(view.geometry&&['Polygon','MultiPolygon'].includes(view.geometry.type)){
              const records=[...activePois.features.filter(f=>f.geometry.type==='Point'),...(baseShopLabels?.getLoadedShopRecords()??[])];
              appendBuildingShopChoices(view.panel,view.geometry,records,locale,record=>{
                if(activePois.features.includes(record as any)){selected={type:'poi',id:String(record.properties?.id)};showSelection();}
                else osmClickInspection?.inspect(record);
              });
            }
            buildingInformation!.appendBuildingSourceInformation(view.panel,outline,locale,threeDimensional?.sourceMetadata);
            return view;
          },onSelect:g=>{
            building3dInteraction?.clear();publicTransitOverlay?.clearSelection();selected=null;pendingSearchPoiId=null;
            threeDimensional?.renderer?.setSelection(g.outline);mobileLayout.revealDetails();
          }});
          nativeOutlineGround.update(plan);
          const openedInformation=app.querySelector<HTMLElement>('.building-3d-information');
          if(openedInformation?.dataset.buildingObject&&openedInformation.dataset.buildingPart){
            const group=display.nativeGroupForIdentity(plan,profiles.NATIVE_PART_DISPLAY_PROFILES,{objectId:openedInformation.dataset.buildingObject,partId:openedInformation.dataset.buildingPart});
            if(group&&!openedInformation.parentElement?.querySelector('[data-native-group]'))nativeOutlineGround.appendGroupNotice(openedInformation,group);
          }
        }).catch(()=>{if(!nativeOutlineDisposed&&ticket===nativeOutlineTicket&&threeDimensional?.wantedMode==='3d'){
          nativeGroupNotice.textContent=(plan.groups.some(g=>g.residentPartCount>0)?{zh:'建筑部件仍在显示，展示不完整；地面轮廓信息暂不可用。',en:'Building parts remain visible in an incomplete display; ground-outline information is temporarily unavailable.',de:'Gebäudeteile bleiben unvollständig sichtbar; Informationen zum Grundriss sind vorübergehend nicht verfügbar.'}:{zh:'当前尚无已载入部件；地面轮廓信息暂不可用，原始来源详情仍保留。',en:'No building parts are currently loaded; ground-outline information is temporarily unavailable. Original source details are retained.',de:'Derzeit sind keine Gebäudeteile geladen; Informationen zum Grundriss sind vorübergehend nicht verfügbar. Die ursprünglichen Quellangaben bleiben erhalten.'})[locale];nativeGroupNotice.hidden=false;
        }});
      },onRenderer:renderer=>{renderer.setSceneEnvironment(sceneEnvironment);renderer.setPageHidden(document.hidden);renderer.setOpacity(app.querySelector<HTMLInputElement>('.electoral-controls input[type="checkbox"]')?.checked ? .35 : 1);renderer.setOpacityContext(publicTransitOverlay?.routeSelection?'route-selection':'normal');if(!building3dInteraction)building3dInteraction=installBuilding3dInteraction({provider:renderer,city:currentCity,locale,inspection:osmClickInspection!,loadedShopRecords:()=>[...activePois.features.filter(f=>f.geometry.type==='Point'),...(baseShopLabels?.getLoadedShopRecords()??[])],onChooseShop:record=>{const current=activePois.features.find(f=>String(f.properties?.id)===String(record.properties?.id));if(current){selected={type:'poi',id:String(current.properties.id)};showSelection();}else osmClickInspection?.inspect(record);},onSurfaceLocation:point=>geographyBase?.locateAt(point),onBuildingPanel:(result,panel)=>{const information=buildingInformation!.appendBuilding3dInformation(panel,result,locale,threeDimensional?.sourceMetadata);const nativeGroup=nativeDisplayModule?.nativeGroupForIdentity(threeDimensional?.renderer?.nativeGroupDisplay,nativeDisplayProfiles?.NATIVE_PART_DISPLAY_PROFILES??[],result.component);if(nativeGroup)nativeOutlineGround?.appendGroupNotice(panel,nativeGroup);if(result.component.objectId==='osm/relation/8990774'&&result.component.partId==='osm/relation/8990774/component/35b9af608ec3d7abc1c1')appendDedicatedAttribution(information);mobileLayout.revealDetails();panel.scrollIntoView({block:'start',inline:'nearest'});if(new URLSearchParams(location.search).has('diagnostics')){let proof=app.querySelector<HTMLOutputElement>('#building-3d-pick-proof');if(!proof){proof=document.createElement('output');proof.id='building-3d-pick-proof';proof.hidden=true;app.append(proof);}proof.textContent=JSON.stringify(result.hit);}}});},fetchBytes:(path,signal,max)=>boundedDataBytes(assetPath(path),signal,max,path.endsWith('/index.json')?'no-store':'default'),onState:state=>{sceneControls?.setMode(state.mode);threeDimensionalControls?.reportState(state);threeDimensionalScenery?.setMode(state.mode==='3d');syncEnvironmentMode(state.mode==='3d');localPalaceGarden?.setMode(state.mode==='3d');syncDedicatedAppearanceMode(state.mode==='3d');const url=new URL(location.href);if(state.mode==='3d')url.searchParams.set('view','3d');else url.searchParams.delete('view');history.replaceState(null,'',url);}});
      if(currentCity==='munich'&&new URLSearchParams(location.search).get('sample')==='munich-residenz'){localPalaceGarden=installPalaceGarden({map:map as any,beforeId:()=>threeDimensional?.renderer?.layer.id});localPalaceGarden.setMode(threeDimensional.mode==='3d');}
      threeDimensionalScenery=installThreeDimensionalScenery({map,city:currentCity,locale,host:(app.querySelector<HTMLElement>('.mobile-filter-content')??app.querySelector<HTMLElement>('.controls'))!,read:(asset,signal,max)=>threeDimensional!.readAsset(asset,signal,max),buildingLayer:()=>threeDimensional?.renderer?.layer.id,frameClock:sceneFrameClock,requested:mapRetry?.snapshot.vehicles??!matchMedia('(max-width:760px)').matches,mobile:matchMedia('(max-width:760px)').matches,reducedMotion:threeDimensionalMotion.matches});
      threeDimensionalControls=installThreeDimensionalControls({vehiclesInitiallyRequested:mapRetry?.snapshot.vehicles??!matchMedia('(max-width:760px)').matches,onVehiclesChange:requested=>threeDimensionalScenery?.setRequested(requested),host:dimensionHost,noticeHost:(app.querySelector<HTMLElement>('.mobile-filter-content')??app.querySelector<HTMLElement>('.controls'))!,statusHost:app.querySelector<HTMLElement>('.controls')!,locale,requestMode:async(mode,signal)=>{
        if(mapGPUUnavailable){mapRecoveryNotice.update('failed');throw Error('Map graphics unavailable');}
        threeDimensionalRecovery?.retry();if(mode==='3d'){await ensureBuildingInformation(signal);signal.throwIfAborted();dedicatedAppearance?.retry();}const result=await threeDimensional!.requestMode(mode,signal);

        if(mode==='2d')building3dInteraction?.suspend();else building3dInteraction?.resume();
        return result;
      }});
      sceneControls=installSceneControls({host:app.querySelector<HTMLElement>('.three-dimensional-notices')!,locale,initial:sceneEnvironment,frameClock:sceneFrameClock!,onChange:syncSceneEnvironment});
      restoreRecoveryControls(app,mapRetry?.snapshot.controls,'scene');
      threeDimensional.setSceneEnvironment(sceneEnvironment);
      threeDimensionalRecovery=installCustomLayerRecovery({map:map as any,layers:()=>{const rows:{layer:{id:string};beforeId?:()=>string|undefined}[]=[];if(threeDimensional?.renderer)for(const paintLayer of ((threeDimensional as any).paintLayers??[threeDimensional.renderer.layer]))rows.push({layer:paintLayer,beforeId:()=>map.getStyle().layers?.find(l=>['scene-point-halo','scene-point','source-poi-reference-point','poi-center','poi-association-label','poi-point','kbo-navigation-point','kbo-navigation-label'].includes(l.id))?.id});if(threeDimensionalScenery?.customLayer)rows.push({layer:threeDimensionalScenery.customLayer,beforeId:()=>threeDimensional?.renderer?.layer.id});if(localPalaceGarden?.customLayer)rows.push({layer:localPalaceGarden.customLayer,beforeId:()=>threeDimensional?.renderer?.layer.id});if(environmentScene?.customLayer)rows.push({layer:environmentScene.customLayer,beforeId:()=>threeDimensional?.renderer?.layer.id});if(dedicatedAppearance?.customLayer)rows.push({layer:dedicatedAppearance.customLayer,beforeId:()=>map.getStyle().layers?.find(l=>['scene-point-halo','scene-point','source-poi-reference-point','poi-center','poi-association-label','poi-point','kbo-navigation-point','kbo-navigation-label'].includes(l.id))?.id});return rows;},onLost:()=>{mapGPUUnavailable=true;mapRecoveryNotice.update('waiting');threeDimensionalControls?.setMapAvailable(false);sceneFrameClock?.setPageHidden(true);sceneControls?.setPageHidden(true);dedicatedInitRequest.abort();dedicatedAppearance?.suspend();building3dInteraction?.cancelPending();baseShopLabels?.suspend();viewportRequest.abort();geographyBase?.suspend();publicTransitOverlay?.suspend();electoralOverlay?.suspend();threeDimensional?.suspend();threeDimensionalScenery?.suspend();environmentSuspended=true;environmentRequest.abort();environmentScene?.suspend();localPalaceGarden?.suspend();refresh();},pageHidden:document.hidden,onTimeout:()=>mapRecoveryNotice.update('failed'),onLayersRestored:signal=>{signal.throwIfAborted();mapGPUUnavailable=false;for(const [id,fc]of deferredSourceData)setSource(id,fc);geographyBase?.resume();communityVisibility();syncSceneEnvironment(sceneEnvironment);syncThreeDimensionalMotion();threeDimensional?.renderer?.setOpacity(app.querySelector<HTMLInputElement>('.electoral-controls input[type="checkbox"]')?.checked ? .35 : 1);sceneFrameClock?.setPageHidden(document.hidden);sceneControls?.setPageHidden(document.hidden);dedicatedAppearance?.resume();if(dedicatedWanted)syncDedicatedAppearanceMode(true);publicTransitOverlay?.resume();electoralOverlay?.resume();baseShopLabels?.resume();refresh();void loadViewport();threeDimensional?.resume();threeDimensionalScenery?.resume();environmentSuspended=false;environmentScene?.resume();localPalaceGarden?.resume();if(environmentWanted)syncEnvironmentMode(true);},isReady:()=>threeDimensional?.wantedMode!=='3d'||Boolean(threeDimensional?.mode==='3d'&&threeDimensional.renderer?.isPickReady()),onReady:()=>{mapRecoveryNotice.update('ready');threeDimensionalControls?.setMapAvailable(true);threeDimensionalControls?.reportState({mode:threeDimensional?.mode??'2d',status:'ready'});},onError:()=>{mapRecoveryNotice.update('failed');}});
      syncThreeDimensionalMotion();
      map.on('movestart',()=>{threeDimensionalClick++;building3dInteraction?.cancelPending();});
      const syncBuildingOpacity=()=>{if(mapGPUUnavailable)return;const election=app.querySelector<HTMLInputElement>('.electoral-controls input[type="checkbox"]');threeDimensional?.renderer?.setOpacity(election?.checked ? .35 : 1);};
      app.addEventListener('change',syncBuildingOpacity);
      basemaps = new Basemaps(map, paintOverlays, (id) => {
        const error = el("basemap-error");
        error.querySelector("span")!.textContent =
          t("basemap.failed",{basemap:basemapLabels[id]});
        error.hidden = false;
      });
      const changeBasemap = (id: BasemapId) => {
        if(mapGPUUnavailable)return;
        el("basemap-error").hidden = true;
        el<HTMLSelectElement>("basemap").value = id;
        if(basemaps.rendered!==id)baseShopLabels?.setBasemapActive(false);
        basemaps.select(id);
        document.querySelector(".basemap-language-note")!.textContent=t(id==="vector"?"basemap.vectorLanguageNote":"basemap.languageNote");
      };
      el<HTMLSelectElement>("basemap").disabled = false;
      el("basemap").onchange = () =>
        changeBasemap(el<HTMLSelectElement>("basemap").value as BasemapId);
      el("basemap-fallback").onclick = () => changeBasemap("local");
      changeBasemap((mapRetry?.snapshot.basemap??"vector") as BasemapId);
      loaded = true;
      if(!mapRetry&&location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).has('diagnostics')){const value=new URLSearchParams(location.search).get('qa3dFocus');const coords=value?.split(',').map(Number);if(coords?.length===2&&coords.every(Number.isFinite)&&Math.abs(coords[0])<=180&&Math.abs(coords[1])<=85){const requestedZoom=Number(new URLSearchParams(location.search).get('qa3dZoom')??18);map.jumpTo({center:[coords[0],coords[1]],zoom:Number.isFinite(requestedZoom)&&requestedZoom>=14&&requestedZoom<=19?requestedZoom:18,bearing:-25});}}
      await Promise.all([loadMonth(), loadViewport()]);
      if(new URLSearchParams(location.search).get('view')==='3d')void threeDimensionalControls?.requestMode('3d');
      if(new URLSearchParams(location.search).has("diagnostics")) {
        const output=document.createElement("output"); output.id="vector-label-proof";output.hidden=true;app.append(output);
        const detailProof=document.createElement("output");detailProof.id="map-detail-proof";detailProof.hidden=true;app.append(detailProof);
        if(location.hostname==='127.0.0.1'){
          const sceneProof=document.createElement('output');sceneProof.id='scene-render-proof';sceneProof.hidden=true;app.append(sceneProof);
          let sceneProofLast=-Infinity,sceneProofSequence=0,sceneProofRevision='',sceneProofSamples:{objectId:string;partId:string;screenBox:number[]}[]=[],sceneProofModules:Promise<void>|undefined;
          let sceneFrozenModule:typeof import('./frozen-paint-tables')|undefined,sceneTimingModule:typeof import('./qa-custom-layer-render-timing')|undefined;
          const publishSceneProof=()=>{
            const now=performance.now();if(now-sceneProofLast<250)return;sceneProofLast=now;
            const renderer=threeDimensional?.renderer;
            if(!sceneProofModules&&(renderer||threeDimensional?.wantedMode==='3d'))sceneProofModules=Promise.all([import('./frozen-paint-tables'),import('./qa-custom-layer-render-timing')]).then(([frozen,timing])=>{sceneFrozenModule=frozen;sceneTimingModule=timing;}).catch(()=>{});
            const revision=renderer?.getRevision(),revisionKey=JSON.stringify(revision??null);
            if(revisionKey!==sceneProofRevision){sceneProofRevision=revisionKey;sceneProofSamples=renderer?.diagnosticScreenSamples().slice(0,3).map(({objectId,partId,screenBox})=>({objectId,partId,screenBox}))??[];}
            const solarAdmissions=sceneProofSamples.map(identity=>{const value=renderer?.getSolarShadowAdmission(identity);return{...identity,...(value?{resident:value.resident,admitted:value.admitted,enabled:value.enabled,mode:value.mode,boundarySHA256:value.boundarySHA256,geometryRole:value.geometryRole,packedBounds:value.packedBounds,instantISO:value.instantISO}:{})};});
            sceneProof.textContent=JSON.stringify({sequence:++sceneProofSequence,monotonicMs:now,utc:new Date().toISOString(),documentHidden:document.hidden,gpuUnavailable:mapGPUUnavailable,mode:threeDimensional?.mode??'2d',wantedMode:threeDimensional?.wantedMode??'2d',revision,scene:{settings:sceneEnvironment,playback:sceneControls?.playback,clock:sceneFrameClock?.stats,quality:sceneRenderQuality?.stats,sunlight:renderer?.sceneSunlight,representativeSolarAdmissions:solarAdmissions},frozenTableInputs:sceneFrozenModule?.frozenPaintTableStats(),environment:{installation:environmentStatus,...environmentScene?.stats},scenery:threeDimensionalScenery?.stats,renderCallbacks:sceneTimingModule?.qaCustomLayerRenderTiming(),measurement:'Native render-event snapshot at most 4 Hz; no owned timer/repaint. Heap is measured separately with browser CDP. Solar samples refresh on renderer revision; polygons and report bodies omitted.'});
          };
          map.on('render',publishSceneProof);map.once('remove',()=>{map.off('render',publishSceneProof);sceneProof.dataset.disposed='true';});publishSceneProof();
        }
        if(location.hostname==='127.0.0.1'){const check=document.createElement('button');check.id='qa-context-recovery';check.textContent='Local check: GPU pause and recovery';const gl=map.getCanvas().getContext('webgl2'),extension=gl?.getExtension('WEBGL_lose_context');check.disabled=!extension;check.onclick=()=>{extension?.loseContext();setTimeout(()=>extension?.restoreContext(),1000);};app.querySelector('.three-dimensional-notices')?.append(check);}
        let growthFrames:unknown[]=[];let wasGrowing=false;let frameTimes:number[]=[];let measuredFrames={frames:0,elapsedMs:0,meanFrameMs:0,maxFrameGapMs:0,scope:'map-render-events-during-camera-motion'};map.on('movestart',()=>{frameTimes=[];});map.on('render',()=>{if(map.isMoving()&&frameTimes.length<240)frameTimes.push(performance.now());const growth=threeDimensional?.renderer?.growthSnapshot();if(growth?.enabled&&growth.ready&&!growth.pageHidden&&(growth.activeBirths>0||wasGrowing)){growthFrames.push({timeMs:performance.now(),...growth,evidence:'source-owned growth state after native MapLibre render event'});if(growthFrames.length>120)growthFrames.shift();}wasGrowing=Boolean(growth?.enabled&&growth.ready&&growth.activeBirths>0);});map.on('moveend',()=>{const gaps=frameTimes.slice(1).map((n,i)=>n-frameTimes[i]);measuredFrames={frames:frameTimes.length,elapsedMs:frameTimes.length>1?frameTimes.at(-1)!-frameTimes[0]:0,meanFrameMs:gaps.length?gaps.reduce((a,b)=>a+b,0)/gaps.length:0,maxFrameGapMs:gaps.length?Math.max(...gaps):0,scope:'map-render-events-during-camera-motion'};});
        const transitScreenSamples=()=>{const samples:{id:unknown;point:number[]}[]=[];const rect=map.getCanvas().getBoundingClientRect();for(const group of ['metro','tram','bus','extra']){const layer='public-transit-'+group+'-lines';if(!map.getLayer(layer))continue;for(const feature of map.queryRenderedFeatures({layers:[layer]})){const lines=feature.geometry.type==='LineString'?[feature.geometry.coordinates]:feature.geometry.type==='MultiLineString'?feature.geometry.coordinates:[];for(const line of lines){for(let i=1;i<line.length&&samples.length<12;i++){const a=map.project(line[i-1] as [number,number]),b=map.project(line[i] as [number,number]),x=(a.x+b.x)/2,y=(a.y+b.y)/2;if(x>50&&x<rect.width-50&&y>80&&y<rect.height-50){samples.push({id:feature.properties.id,point:[rect.left+x,rect.top+y]});break;}}if(samples.length>=12)return samples;}}}return samples;};
        let detailProofLast=-Infinity;detailProof.dataset.maximumSnapshotHz="1";
        map.on("idle",()=>{const now=performance.now();if(now-detailProofLast<1000)return;detailProofLast=now;const idleCapture=localLifecycleDiagnostics?.recordIdle();detailProof.textContent=JSON.stringify({...(idleCapture?{idleCapture}:{}),transitScreenSamples:transitScreenSamples(),buildingGrowthFrames:growthFrames,renderFrames:measuredFrames,cache:client.cacheStats,renderInputs:viewportRenderInputs,losslessData:{status:losslessDataStatus,...losslessData?.stats},threeDimensional:threeDimensional?.cacheStats(),nativeGroups:{ground:nativeOutlineGround?.diagnostics,groups:threeDimensional?.renderer?.nativeGroupDisplay?.groups.map(g=>({relationId:g.relationId,name:g.name,outline:{objectId:g.outline.objectId,partId:g.outline.partId,sourceHeight:g.outline.sourceFeature.properties?.height},declaredPartCount:g.declaredPartCount,compiledPartCount:g.compiledPartCount,residentPartCount:g.residentPartCount,missingPartIds:g.missingPartIds,unknownPartIds:g.unknownPartIds,ownershipUnverifiedPartIds:g.ownershipUnverifiedPartIds,viewportMissingPartIds:g.viewportMissingPartIds,complete:g.complete})),errors:threeDimensional?.renderer?.nativeGroupDisplay?.errors},scenery:threeDimensionalScenery?.stats,dedicatedAppearance:dedicatedAppearance?.stats,localPalaceGarden:localPalaceGarden?.stats,environment:{installation:environmentStatus,...environmentScene?.stats},sceneRendering:{settings:sceneEnvironment,quality:sceneRenderQuality?.stats,clock:sceneFrameClock?.stats},recovery:threeDimensionalRecovery?.state,transit:{cache:publicTransitOverlay?.cacheStats(),rendered:Object.fromEntries(["metro","tram","bus","extra"].map(g=>{const id="public-transit-"+g+"-lines";return[g,map.getLayer(id)?map.queryRenderedFeatures({layers:[id]}).length:0];}))},translations:{matched:dynamicText.matched,missing:dynamicText.missing},circles:(map.getLayer("poi-circle")?map.queryRenderedFeatures({layers:["poi-circle"]}):[]).map(f=>({id:f.properties.id,name:f.properties.name,radius:f.properties.display_radius_m})),month:monthKey()});if(map.getLayer("basemap-vector-place-labels"))output.textContent=JSON.stringify(map.queryRenderedFeatures({layers:["basemap-vector-place-labels"]}).map(f=>({name:f.properties.name,localized:f.properties[`name_${locale}`]??null,display:f.properties[`name_${locale}`]??f.properties.name})));});
      }
      map.on("click", async (e) => {
        if (expired) return;
        selectionInspector.close();
        // Real report markers keep priority; selected stations precede ordinary venue points.
        const transitIncidentLayers=["scene-point","scene-point-halo","source-poi-reference-point"].filter(id=>map.getLayer(id));
        const transitIncidentHit=transitIncidentLayers.length&&map.queryRenderedFeatures(e.point,{layers:transitIncidentLayers}).length;
        if(!transitIncidentHit&&publicTransitOverlay?.inspectStopAt(e.point)){
          selected=null;pendingSearchPoiId=null;basicOsmPanel=undefined;osmClickInspection?.clear();return;
        }
        const threeClick=++threeDimensionalClick;
        const annotations=['scene-point','scene-point-halo','source-poi-reference-point','poi-center','poi-association-label','poi-point','kbo-navigation-point','kbo-navigation-label',SHOP_LABEL_LAYER].filter(id=>map.getLayer(id));
        const annotationHit=annotations.length>0&&map.queryRenderedFeatures(e.point,{layers:annotations}).length>0;
        if(threeDimensional?.mode==='3d'&&building3dInteraction&&!annotationHit){
          const hit=await building3dInteraction.probe(e.point);
          if(expired||threeClick!==threeDimensionalClick)return;
          if(!hit&&building3dInteraction.probeStatus!=='none')return;
          const priority=building3dClickPriority('3d',false,hit);
          if(hit&&priority==='building-first'){if(building3dInteraction.show(hit))publicTransitOverlay?.clearSelection();return;}
          if(hit&&priority==='visible-ground-first'){
            if(electoralOverlay?.inspectAt(e.point))return;
            if(publicTransitOverlay?.inspectAt(e.point,{preserveSelectionOnMiss:true})){building3dInteraction.clear();selected=null;pendingSearchPoiId=null;return;}
            if(building3dInteraction.show(hit))publicTransitOverlay?.clearSelection();return;
          }
        }
        building3dInteraction?.clear();if(threeDimensional?.mode==='3d')threeDimensional.setOpacityContext('normal');
        if(threeDimensional?.mode==='3d'&&!annotationHit&&electoralOverlay?.inspectAt(e.point))return;
        // Real report/venue markers keep priority. Broad reference areas do not hide routes.
        const transitPriorityLayers=["scene-point","scene-point-halo","source-poi-reference-point",
          "poi-center","poi-association-label","poi-point","kbo-navigation-point","kbo-navigation-label"].filter(id=>map.getLayer(id));
        const transitPriorityHit=threeDimensional?.mode==='3d'?annotationHit:transitPriorityLayers.length&&map.queryRenderedFeatures(e.point,{layers:transitPriorityLayers}).length;
        if(!transitPriorityHit&&publicTransitOverlay?.inspectAt(e.point)){
          selected=null;pendingSearchPoiId=null;basicOsmPanel=undefined;osmClickInspection?.clear();return;
        }
        publicTransitOverlay?.clearSelection();
        basicOsmPanel=undefined;osmClickInspection?.clear();
        geographyBase?.locateAt([e.lngLat.lng,e.lngLat.lat]);
        const fs = map.queryRenderedFeatures(e.point, {
          layers: [
            ...SCENE_CLICK_LAYERS,
            ...SOURCE_POI_CLICK_LAYERS,
            "roads-line", "reported-sections-line", "candidate-roads-line", "hex-line",
            "community-line", "community-label", "community-hit", "poi-center","poi-association-label", "kbo-boundary", "kbo-navigation-point", "kbo-navigation-label", "kbo-approximate-outline", "kbo-approximate-fill", "candidate-roads-hit", "poi-fill", "poi-line", "poi-point", "poi-circle", "hex-fill",
            ...[SHOP_LABEL_LAYER,"basemap-vector-street-labels","basemap-vector-place-labels","basemap-vector-streets","basemap-vector-buildings","basemap-vector-water","basemap-vector-land"].filter(id=>map.getLayer(id)),
          ],
        });
        if (!fs.length) {if(threeDimensional?.mode==='3d'&&!annotationHit&&nativeOutlineGround?.inspectAt(e.point))return;osmClickInspection?.inspect(undefined,[e.lngLat.lng,e.lngLat.lat]);if(geographyBase?.hasArea())geographyBase.chooseAt([e.lngLat.lng,e.lngLat.lat]);return;}
        pendingSearchPoiId = null;
        // Filled kbO references must not capture a more specific marker below them.
        const kboHit=fs.find(f=>f.layer.id.startsWith("kbo-navigation-")||f.layer.id.startsWith("kbo-approximate-")||f.layer.id==="kbo-boundary");
        const showGeography=()=>{
          const geographicHits=fs.filter(f=>f.layer.id==="roads-line"||f.layer.id.startsWith("basemap-vector-"));
          const panel=openDialog(t("selection.geographicInformation"));
          const named=geographicHits.filter(f=>typeof f.properties[`name_${locale}`]==="string"||typeof f.properties.name==="string");
          const shown=new Set<string>();
          for(const feature of (named.length?named:geographicHits)){
            const p=feature.properties,layer=feature.layer.id;
            const kind=layer.includes("street")||layer==="roads-line"?"road":layer.includes("building")?"building":layer.includes("water")?"water":layer.includes("land")?"land":"place";
            const name=String(p[`name_${locale}`]??p.name??t(`selection.geography.${kind}`));
            if(shown.has(name))continue;shown.add(name);text("h3",name,panel);text("p",t(`selection.geography.${kind}`),panel);
          }
          text("p",t("selection.geographicReference"),panel);
          link(panel,t("selection.geographicSource"),"https://www.openstreetmap.org/copyright");
        };
        const finishSelection=()=>{
          showSelection();
          selectionInspector.open();
          const communityHit=fs.find(f=>["community-line","community-label","community-hit"].includes(f.layer.id));
          if(communityHit){
            const button=text("button",t("community.view",{name:String(communityHit.properties.name)}),el("selection"));
            button.onclick=()=>communityDialog(String(communityHit.properties.id),kboHit?Number(kboHit.properties.zone_index):undefined);
          }
          if(fs.some(f=>f.layer.id==="roads-line"||f.layer.id==="basemap-vector-street-labels"||f.layer.id==="basemap-vector-place-labels")){
            const button=text("button",t("selection.geographicInformation"),el("selection"));button.onclick=showGeography;
          }
          if(kboHit && Number.isInteger(Number(kboHit.properties.zone_index))){
            const button=text("button",t("selection.relatedKbo",{name:String(kboHit.properties.name??"")}),el("selection"));
            button.onclick=()=>kboDialog(Number(kboHit.properties.zone_index));
          }
        };

        const centerHits=fs.filter(f=>["poi-center","poi-association-label"].includes(f.layer.id) && typeof f.properties.id==="string");
        if(centerHits.length){
          const centerIds=[...new Set(centerHits.map(f=>String(f.properties.id)))];
          if(centerIds.length===1){selected={type:"poi",id:centerIds[0]};finishSelection();return;}
          const panel=openDialog(t("selection.multiplePois"));
          text("p",t("selection.multiplePoisNote"),panel);
          for(const id of centerIds){
            const poi=activePois.features.find(f=>f.properties.id===id);
            const button=text("button",String(poi?.properties.name??id),panel);
            button.onclick=()=>{selected={type:"poi",id};el<HTMLDialogElement>("drawer").close();finishSelection();};
          }
          return;
        }
        const scenes = fs.filter((f) => f.layer.id.startsWith("scene-"));
        if (scenes.length) {
          selected = { type: "scene", ids: sceneEventIds(scenes) };
          finishSelection();
          return;
        }
        const sectionIds=[...new Set(fs.filter(f=>f.layer.id==="reported-sections-line").map(f=>String(f.properties.id)))];
        if(sectionIds.length){selected={type:"report",ids:sectionIds};finishSelection();return;}
        const roadIds = [
          ...new Set(
            fs
              .filter((f) => ["candidate-roads-hit","candidate-roads-line"].includes(f.layer.id))
              .map((f) => String(f.properties.id)),
          ),
        ];
        if (roadIds.length) {
          selected = { type: "road", ids: roadIds };
          finishSelection();
          return;
        }
        const references=fs.filter(f=>SOURCE_POI_CLICK_LAYERS.includes(f.layer.id));
        if(references.length){selected={type:"source_poi",ids:sceneEventIds(references)};finishSelection();return;}
        const poiHits=new Map<string,typeof fs[number]>();
        for(const hit of fs)if(hit.layer.id.startsWith("poi-")&&typeof hit.properties.id==="string")poiHits.set(hit.properties.id,hit);
        if(poiHits.size>1){
          const panel=openDialog(t("selection.multiplePois"));
          text("p",t("selection.multiplePoisNote"),panel);
          for(const[id,hit]of [...poiHits].sort((a,b)=>String(a[1].properties.name??a[0]).localeCompare(String(b[1].properties.name??b[0])))){
            const chosen=activePois.features.find(f=>f.properties.id===id);const name=String(chosen?.properties.name??hit.properties.name??id);const button=text("button",name,panel);
            button.onclick=()=>{selected={type:"poi",id};el<HTMLDialogElement>("drawer").close();finishSelection();};
          }
          return;
        }
        const poiHit=[...poiHits.values()][0];
        if(poiHit){selected={type:"poi",id:String(poiHit.properties.id)};finishSelection();return;}
        const shopLabelHit=fs.find(f=>f.layer.id===SHOP_LABEL_LAYER);
        if(shopLabelHit){osmClickInspection?.inspect(shopLabelHit);return;}
        if(threeDimensional?.mode==='3d'&&!annotationHit&&nativeOutlineGround?.inspectAt(e.point))return;
        const buildingHit=fs.find(f=>f.layer.id==="basemap-vector-buildings");
        if(buildingHit){
          const view=osmClickInspection?.inspect(buildingHit,[e.lngLat.lng,e.lngLat.lat]);
          if(view?.geometry&&['Polygon','MultiPolygon'].includes(view.geometry.type)){
            const records=[...activePois.features.filter(f=>f.geometry.type==='Point'),...(baseShopLabels?.getLoadedShopRecords()??[])];
            appendBuildingShopChoices(view.panel,view.geometry,records,locale,record=>{
              if(activePois.features.includes(record as any)){selected={type:'poi',id:String(record.properties?.id)};finishSelection();}
              else osmClickInspection?.inspect(record);
            });
          }return;
        }
        // Navigation labels and borders intentionally open the official-area explanation.
        const kboEdge=fs.find(f=>f.layer.id.startsWith("kbo-navigation-")||f.layer.id==="kbo-approximate-outline"||f.layer.id==="kbo-boundary");
        if(kboEdge && Number.isInteger(Number(kboEdge.properties.zone_index))){kboDialog(Number(kboEdge.properties.zone_index));return;}
        const hexHit=fs.find(f=>f.layer.id==="hex-fill"||f.layer.id==="hex-line");
        if(hexHit){selected={type:"hex",id:String(hexHit.properties.id)};finishSelection();return;}
        const basicOsm=fs.find(f=>f.layer.id.startsWith("basemap-vector-street")||f.layer.id==="roads-line"||f.layer.id==="basemap-vector-place-labels");
        osmClickInspection?.inspect(basicOsm,[e.lngLat.lng,e.lngLat.lat]);
        const communityEdge=fs.find(f=>["community-line","community-label"].includes(f.layer.id));
        if(communityEdge){geographyBase?.chooseAt([e.lngLat.lng,e.lngLat.lat]);return;}
        if(geographyBase?.hasArea()&&geographyBase.isOverview()){geographyBase.chooseAt([e.lngLat.lng,e.lngLat.lat]);return;}
        if(kboHit && Number.isInteger(Number(kboHit.properties.zone_index))){kboDialog(Number(kboHit.properties.zone_index));return;}
        // Keep the native-area details entry accessible at close range; offer
        // basemap information separately instead of opening a covering modal.
        const geographicHits=fs.filter(f=>f.layer.id==="roads-line"||f.layer.id.startsWith("basemap-vector-"));
        if(geographicHits.length){
          if(geographyBase?.hasArea()){
            selected=null;
            const button=text("button",t("selection.geographicInformation"),el("selection"));
            button.onclick=showGeography;
            geographyBase.chooseAt([e.lngLat.lng,e.lngLat.lat]);
            return;
          }
          showGeography();return;
        }
        const communityHit=fs.find(f=>f.layer.id==="community-hit");
        if(communityHit){osmClickInspection?.inspect(undefined,[e.lngLat.lng,e.lngLat.lat]);geographyBase?.chooseAt([e.lngLat.lng,e.lngLat.lat]);return;}
      });
      map.on("movestart", () => viewportRequest.abort());
      map.on("moveend", () => {
        clearTimeout(viewportTimer);
        viewportTimer = setTimeout(() => void loadViewport(), 120);
        if (currentMode !== (map.getZoom() >= 13 ? "detail" : "overview"))
          refresh();
      });
    });
    for (const id of ["category", "highlight", "hex-toggle"])
      el(id).onchange = () => {
        pendingSearchPoiId = null;pendingRecoverySelection=null;
        selected = null;
        refresh();
      };
    el("community-toggle").onchange=()=>{if(!mapGPUUnavailable)communityVisibility();};
    el("candidate-roads-toggle").onchange = () => {
      if (loaded) setRoadVisibility();
    };
    for (const id of ["year", "month"])
      el(id).onchange = () => {const url=new URL(location.href);url.searchParams.set("month",monthKey());history.replaceState(null,"",url.href);pendingRecoverySelection=null;void loadMonth();};
    el("overview").onclick = () => {if(!mapGPUUnavailable)map.flyTo({ center: cityView.center, zoom: 10.5 });};
    el("sources").onclick = sourcesDialog;
    if (cityView.kbo) el("kbo").onclick = () => kboDialog();
    freshnessTimer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(cityView.manifestPath, { cache: "no-store" });
        if (!r.ok) return;
        const latest = (await r.json()) as Manifest;
        if (latest.generation !== manifest.generation) {
          el("freshness").replaceChildren();
          const button = text(
            "button",
            t("error.newData"),
            el("freshness"),
          );
          button.onclick = () => location.reload();
        }
      } catch {
        /* Keep the currently loaded snapshot while offline. */
      }
    }, 300000);
    el<HTMLDialogElement>("drawer").addEventListener("close",clearClosedReportDialog);
    el("close-dialog").onclick = () => el<HTMLDialogElement>("drawer").close();
    let searchTimer: ReturnType<typeof setTimeout>;
    el<HTMLInputElement>("search").oninput = () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(async () => {
        const q = el<HTMLInputElement>("search")
          .value.trim()
          .toLocaleLowerCase();
        const box = el("search-results");
        box.replaceChildren();
        if (q.length < 2) return;
        if (!searchIndex) {
          searchLoading ??= client
            .json<typeof searchIndex>(`${client.base}/search.json`,searchRequest.signal)
            .then((v) => {
              searchIndex = v;
            })
            .catch(() => {
              text("p", t("search.failed"), box);
              searchLoading = undefined;
            });
          await searchLoading;
        }
        if (
          el<HTMLInputElement>("search").value.trim().toLocaleLowerCase() !== q
        )
          return;
        const matches = (searchIndex ?? [])
          .filter((f) => f.name.toLocaleLowerCase().includes(q))
          .slice(0, 8);
        if (!matches.length) text("p", t("search.noResults"), box);
        for (const f of matches) {
          const b = text(
            "button",
            `${f.name} · ${poiName(f.kind,data.catalog.poi_types[f.kind]?.label ?? f.kind)}`,
            box,
          );
          b.onclick = () => {
            el<HTMLInputElement>("poi-toggle").checked=true;
            for (const input of document.querySelectorAll<HTMLInputElement>("#poi-filters input")) {
              input.disabled=false;
              if (input.value === (f.scope_category??f.kind) || (!f.scope_category&&manifest.poi_scope_groups?.[input.value]?.kinds.includes(f.kind))) input.checked = true;
            }
            pendingSearchPoiId = f.id;
            selected = { type: "poi", id: f.id };
            refresh();
            if(!mapGPUUnavailable)map.flyTo({ center: f.center, zoom: 16 });
            box.replaceChildren();
          };
        }
      }, 160);
    };
  } catch (error) {
    console.error(error);
    el("coverage").textContent = t("map.loadFailed");
    el("map-status").textContent = t("map.notReady");
    if(new URLSearchParams(location.search).has("review303")){const diagnostic=document.createElement("pre");diagnostic.id="review303-bootstrap-error";diagnostic.textContent="Map initialization: "+String(error);el("map-status").append(diagnostic);void fetch("/__review303_capture/city-bootstraperror.json",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({capturedAt:new Date().toISOString(),status:"map-bootstrap-error",error:String(error),city:currentCity})}).catch(()=>{});}
  }
}
window.addEventListener("pageshow",(event)=>{el<HTMLSelectElement>("language").value=locale;if(event.persisted&&loaded){threeDimensionalRecovery?.setPageHidden(document.hidden);if(mapGPUUnavailable){refresh();return;}sceneFrameClock?.setPageHidden(document.hidden||mapGPUUnavailable);sceneControls?.setPageHidden(document.hidden||mapGPUUnavailable);map.resize();dedicatedAppearance?.resume();if(dedicatedWanted)syncDedicatedAppearanceMode(true);electoralOverlay?.resume();publicTransitOverlay?.resume();threeDimensional?.resume();threeDimensionalScenery?.resume();environmentSuspended=false;environmentScene?.resume();localPalaceGarden?.resume();if(environmentWanted)syncEnvironmentMode(true);void loadMonth();void loadViewport();void loadStatistics();void loadDatedStatistics();}});
window.addEventListener("pagehide", (event) => {
  abortPendingReportBodyLoads();threeDimensionalRecovery?.setPageHidden(true);
  if(!event.persisted){bootstrapRequest.abort();setLocalDataTransport(undefined);losslessData?.clear();}
  sceneFrameClock?.setPageHidden(true);sceneControls?.setPageHidden(true);statisticsRequest.abort();datedStatisticsRequest.abort();dedicatedInitRequest.abort();dedicatedAppearance?.suspend();electoralOverlay?.suspend();publicTransitOverlay?.suspend();threeDimensional?.suspend();threeDimensionalScenery?.suspend();environmentSuspended=true;environmentRequest.abort();environmentScene?.suspend();localPalaceGarden?.suspend();
  if(event.persisted){monthRequest.abort();yearRequest.abort();yearReportRequest.abort();annualLoadingKey="";annualLoading=undefined;viewportRequest.abort();clearTimeout(viewportTimer);return;}
  nativeOutlineDisposed=true;++nativeOutlineTicket;nativeOutlineGround?.destroy();nativeGroupNotice.remove();
  searchRequest.abort();
  monthRequest.abort();
  yearRequest.abort();yearReportRequest.abort();
  viewportRequest.abort();
  document.removeEventListener('visibilitychange',syncThreeDimensionalVisibility);threeDimensionalMotion.removeEventListener('change',syncThreeDimensionalMotion);dedicatedDestroyed=true;dedicatedWanted=false;dedicatedInitRequest.abort();dedicatedAppearance?.destroy();dedicatedNote.remove();environmentDestroyed=true;environmentWanted=false;environmentRequest.abort();environmentScene?.destroy();localPalaceGarden?.destroy();threeDimensionalRecovery?.destroy();mapRecoveryNotice.destroy();deferredSourceData.clear();viewportSourceData.clear();threeDimensionalScenery?.destroy();threeDimensionalControls?.destroy();sceneControls?.destroy();sceneRenderQuality?.destroy();sceneFrameClock?.destroy();building3dInteraction?.destroy();threeDimensional?.destroy();baseShopLabels?.destroy();osmClickInspection?.destroy();publicTransitOverlay?.destroy();electoralOverlay?.destroy();geographyBase?.destroy();
  clearTimeout(viewportTimer);
  clearInterval(freshnessTimer);
  methodsPanel.destroy();
  uncertaintyPanel.destroy();
  githubFooter.destroy();
  analyticsPanel.destroy();
  statisticsPanel?.destroy();datedStatisticsPanel?.destroy();floatingDatedStatisticsPanel?.destroy();
  longCopyDisclosure.destroy();
  selectionInspector.destroy();
  mobileLayout.destroy();
  basemaps?.dispose();
  map?.remove();
});
void start();

installFacadePaintControls();
if(new URLSearchParams(location.search).has('review303'))void ensureBuildingInformation(new AbortController().signal).then(()=>import('./white-review-export')).then(({installWhiteReviewExport})=>installWhiteReviewExport(()=>map,()=>threeDimensional,lonlat=>environmentScene?.getWaterProbe(lonlat))).catch(error=>console.warn('Review export unavailable',error));
