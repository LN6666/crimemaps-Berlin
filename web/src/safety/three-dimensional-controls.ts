export type ThreeDViewMode = '2d' | '3d';
export type ThreeDViewStatus = 'ready' | 'loading' | 'partial' | 'outside' | 'overview' | 'error';
export type ThreeDControlState = { mode: ThreeDViewMode; status: ThreeDViewStatus };
export type ThreeDControlLocale = 'de' | 'en' | 'zh';
const COPY = {
  en: { label: 'Map view', vehicles: 'Show moving cars', vehicleNote: 'The cars illustrate selected mapped roads. They do not show live traffic or police events.', reducedVehicles: 'Moving cars are hidden because reduced motion is enabled.', overview: 'Zoom in to see the city’s 3D building detail.', loading: 'Preparing the city’s 3D map. The current map remains usable.', partial: 'Only part of the 3D building detail is shown in this view. Zoom in to see more detail.', outside: '3D buildings are shown only within this city. The surrounding area keeps its ordinary basemap.', error: 'The 3D view could not be prepared. The 2D map remains available.', retry: 'Retry 3D view', note: '3D changes how the map looks. Report counts, filters and source details keep the same meaning. Building heights and roof shapes may be incomplete or approximate.', unavailable: '3D is not supported by this browser. You can use every feature in 2D.' },
  de: { label: 'Kartenansicht', vehicles: 'Bewegte Autos anzeigen', vehicleNote: 'Die Autos veranschaulichen ausgewählte Straßen der Karte. Sie zeigen weder den aktuellen Verkehr noch Polizeieinsätze.', reducedVehicles: 'Bewegte Autos sind ausgeblendet, weil reduzierte Bewegung aktiviert ist.', overview: 'Zoomen Sie näher heran, um die 3D-Gebäudedetails der Stadt zu sehen.', loading: 'Die 3D-Karte der Stadt wird vorbereitet. Die aktuelle Karte bleibt nutzbar.', partial: 'In diesem Ausschnitt wird nur ein Teil der 3D-Gebäudedetails angezeigt. Zoomen Sie näher heran, um mehr Details zu sehen.', outside: '3D-Gebäude werden nur innerhalb dieser Stadt gezeigt. Das Umland behält die gewöhnliche Grundkarte.', error: 'Die 3D-Ansicht konnte nicht vorbereitet werden. Die 2D-Karte bleibt verfügbar.', retry: '3D-Ansicht erneut laden', note: '3D verändert die Darstellung. Meldungszahlen, Filter und Quellenangaben behalten ihre Bedeutung. Gebäudehöhen und Dachformen können fehlen oder nur näherungsweise dargestellt sein.', unavailable: 'Dieser Browser unterstützt die 3D-Ansicht nicht. Alle Funktionen bleiben in 2D nutzbar.' },
  zh: { label: '地图视图', vehicles: '显示移动小车', vehicleNote: '小车用于展示部分已保存道路的位置，不表示实时交通或警方事件。', reducedVehicles: '已按减少动态效果设置隐藏移动小车。', overview: '放大到街区，可查看本市3D建筑细节。', loading: '正在准备本市3D地图，当前地图仍可使用。', partial: '当前视野只显示部分3D建筑细节，放大后可查看更多细节。', outside: '3D建筑只显示本市范围，市外区域保留普通底图。', error: '3D视图未能准备完成，仍可使用2D地图。', retry: '重试3D视图', note: '3D改变地图的显示方式，公告数量、筛选和来源说明的含义保持一致。建筑高度和屋顶形状可能缺失或只是近似示意。', unavailable: '此浏览器暂不支持3D视图，2D地图的全部功能仍可使用。' },
};
/** UI only. Root owns actual camera/render readiness and all data/source lifecycle. */
export function installThreeDimensionalControls(options: {
  host: HTMLElement;
  locale: ThreeDControlLocale;
  noticeHost?: HTMLElement;
  /** Visible mobile host outside the collapsible filter content. */
  statusHost?: HTMLElement;
  requestMode: (mode: ThreeDViewMode, signal: AbortSignal) => Promise<ThreeDControlState>;
  initialMode?: ThreeDViewMode;
  onVehiclesChange?: (requested: boolean) => void;
  vehiclesInitiallyRequested?: boolean;
  supported?: boolean;
}) {
  const c = COPY[options.locale], root = document.createElement('section'); root.className = 'three-dimensional-controls';
  const group = document.createElement('div'); group.className = 'three-dimensional-mode-group'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', c.label);
  const flat = document.createElement('button'), three = document.createElement('button'); flat.type = three.type = 'button'; flat.textContent = '2D'; three.textContent = '3D';
  const status = document.createElement('p'); status.className = 'three-dimensional-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const note = document.createElement('p'); note.className = 'three-dimensional-note'; note.textContent = c.note;
  const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = c.retry; retry.hidden = true;
  const notices = document.createElement('div'); notices.className = 'three-dimensional-notices'; notices.append(note);
  const feedback = document.createElement('div'); feedback.className = 'three-dimensional-feedback'; feedback.append(status, retry);
  group.append(flat, three); root.append(group); options.host.append(root); (options.noticeHost ?? root).append(notices);
  const mobileStatus = matchMedia('(max-width: 760px), (max-width: 1000px) and (max-height: 500px)');
  const syncFeedbackHost = () => {
    const host = mobileStatus.matches && options.statusHost ? options.statusHost : options.noticeHost ?? root;
    host.append(feedback);
  };
  syncFeedbackHost(); mobileStatus.addEventListener('change', syncFeedbackHost);
  const vehicleLabel=document.createElement('label'),vehicleInput=document.createElement('input'),vehicleNote=document.createElement('p');vehicleLabel.className='toggle three-dimensional-vehicle-toggle';vehicleInput.type='checkbox';vehicleInput.checked=options.vehiclesInitiallyRequested!==false;vehicleLabel.append(vehicleInput,document.createTextNode(c.vehicles));vehicleNote.className='three-dimensional-vehicle-note';let reducedVehicles=false;if(options.onVehiclesChange)notices.append(vehicleLabel,vehicleNote);vehicleInput.onchange=()=>{if(!destroyed)options.onVehiclesChange?.(vehicleInput.checked);};
  let state: ThreeDControlState = { mode: options.initialMode ?? '2d', status: 'ready' }, supported = options.supported !== false, abort = new AbortController(), revision = 0, destroyed = false, mapAvailable = true;
  function render() {
    flat.setAttribute('aria-pressed', String(state.mode === '2d')); three.setAttribute('aria-pressed', String(state.mode === '3d'));
    group.setAttribute('aria-busy', String(mapAvailable && state.status === 'loading')); three.disabled = !mapAvailable || !supported || state.status === 'loading';flat.disabled = !mapAvailable;
    retry.hidden = !mapAvailable || state.status !== 'error' || !supported;
    status.textContent = !mapAvailable ? '' : !supported ? c.unavailable : state.status === 'ready' ? '' : c[state.status];
    feedback.dataset.noticeVisible = String(Boolean(status.textContent) || !retry.hidden);
    vehicleInput.disabled=reducedVehicles;vehicleNote.textContent=reducedVehicles?c.reducedVehicles:c.vehicleNote;
    root.setAttribute('data-view-mode', state.mode); root.setAttribute('data-view-state', mapAvailable ? state.status : 'paused');
  }
  async function request(mode: ThreeDViewMode) {
    if (destroyed || !mapAvailable || mode === '3d' && !supported) return;
    // 2D remains actionable during preparation and cancels that pending transition.
    abort.abort(); abort = new AbortController(); const signal = abort.signal, ticket = ++revision;
    const previousMode = state.mode; state = { mode: previousMode, status: 'loading' }; render();
    try {
      const result = await options.requestMode(mode, signal);
      if (destroyed || signal.aborted || revision !== ticket) return;
      if (!result || !['2d', '3d'].includes(result.mode) || !['ready', 'partial', 'outside', 'overview', 'error'].includes(result.status)) throw Error('Invalid 3D readiness result');
      state = result; render();
    } catch {
      if (destroyed || signal.aborted || revision !== ticket) return;
      // requestMode must preserve/restore the actual last usable map before rejecting.
      state = { mode: previousMode, status: 'error' }; render();
    }
  }
  flat.onclick = () => { void request('2d'); }; three.onclick = retry.onclick = () => { void request('3d'); }; render();
  return {
    element: root,
    get state(): Readonly<ThreeDControlState> { return { ...state }; },
    setState(next: ThreeDControlState) { if (destroyed) return; abort.abort(); revision++; state = next; render(); },
    // Authoritative root state for its current loader ticket. Do not abort that request.
    reportState(next: ThreeDControlState) { if (destroyed) return; revision++; state = next; render(); },
    setMapAvailable(value:boolean){if(destroyed||mapAvailable===value)return;mapAvailable=value;if(!value){abort.abort();revision++;}render();},
    setVehicleReducedMotion(value:boolean){if(destroyed)return;reducedVehicles=value;render();},
    get vehiclesRequested(){return vehicleInput.checked;},
    setSupported(value: boolean) { if (destroyed) return; supported = value; if (!supported) { abort.abort(); revision++; if (state.status === 'loading') state = { mode: state.mode, status: 'ready' }; } render(); },
    requestMode: request,
    destroy() { if (destroyed) return; destroyed = true; abort.abort(); revision++; flat.onclick = three.onclick = retry.onclick = null; vehicleInput.onchange=null;mobileStatus.removeEventListener('change',syncFeedbackHost);feedback.remove();notices.remove(); root.remove(); },
  };
}
