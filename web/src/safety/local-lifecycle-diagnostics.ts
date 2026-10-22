type RenderMap = {
  on(type: 'render', listener: () => void): unknown;
  off(type: 'render', listener: () => void): unknown;
};
type Stamp = { sequence: number; utc: string; monotonicMs: number; documentHidden: boolean; renders: number; hiddenRenders: number };
type Segment = { id: number; hidden: boolean; start: Stamp; end?: Stamp; renders: number; firstRenderMs?: number; lastRenderMs?: number };
/** Read-only local QA: native lifecycle events and MapLibre render-event counts, not GPU draw/FPS measurements. */
export function installLocalLifecycleDiagnostics() {
  if (location.hostname !== '127.0.0.1' || !new URLSearchParams(location.search).has('diagnostics')) return undefined;
  const output = document.createElement('output');
  output.id = 'local-lifecycle-proof'; output.hidden = true; document.body.append(output);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let map: RenderMap | undefined, disposed = false, sequence = 0, idleSequence = 0, renders = 0, hiddenRenders = 0, segmentId = 0;
  let droppedEvents = 0, droppedSegments = 0;
  const events: (Stamp & { type: string; trusted: boolean; persisted?: boolean; reducedMotion?: boolean })[] = [];
  const stamp = (): Stamp => ({ sequence: ++sequence, utc: new Date().toISOString(), monotonicMs: performance.now(), documentHidden: document.hidden, renders, hiddenRenders });
  // Installation is an observation boundary, not a synthetic visibility/pageshow event.
  const installed = stamp();
  let segment: Segment = { id: ++segmentId, hidden: document.hidden, start: installed, renders: 0 };
  const segments: Segment[] = [segment];
  let lastIdle: (Stamp & { idleSequence: number }) | undefined;
  function publish() {
    output.textContent = JSON.stringify({ schemaVersion: 1, scope: 'native-page-events-and-maplibre-render-events', installed, disposed, eventLimit: 64, segmentLimit: 32, droppedEvents, droppedSegments, renderCount: renders, hiddenRenderCount: hiddenRenders, currentDocumentHidden: document.hidden, currentReducedMotion: motion.matches, events, visibilitySegments: segments, lastIdle, limitation: 'Render events are not per-layer GPU draw counts; hidden-event logs can include browser transition renders. No synthetic lifecycle/media events or scheduling changes.' });
  }
  function syncSegment(boundary: Stamp) {
    if (segment.hidden === document.hidden) return;
    segment.end = boundary;
    segment = { id: ++segmentId, hidden: document.hidden, start: boundary, renders: 0 };
    segments.push(segment);
    if (segments.length > 32) { segments.shift(); droppedSegments++; }
  }
  function onRender() {
    if (disposed) return;
    renders++;
    if (document.hidden) hiddenRenders++;
    // Event order can differ at a visibility transition; count according to actual document.hidden.
    if (segment.hidden !== document.hidden) syncSegment(stamp());
    segment.renders++;
    const now = performance.now();
    segment.firstRenderMs ??= now; segment.lastRenderMs = now;
    // No per-frame DOM serialization, timers, repaint or SDK mutation.
  }
  function record(event: Event) {
    if (disposed || !event.isTrusted) return;
    const boundary = stamp(); syncSegment(boundary);
    const row: Stamp & { type: string; trusted: boolean; persisted?: boolean; reducedMotion?: boolean } = { ...boundary, type: event.type, trusted: event.isTrusted };
    if (event instanceof PageTransitionEvent) row.persisted = event.persisted;
    if (event instanceof MediaQueryListEvent) { row.type = 'reduced-motion-change'; row.reducedMotion = event.matches; }
    events.push(row);
    if (events.length > 64) { events.shift(); droppedEvents++; }
    publish();
  }
  const onVisibility = (event: Event) => record(event);
  const onMotion = (event: MediaQueryListEvent) => record(event);
  const onShow = (event: PageTransitionEvent) => record(event);
  const onHide = (event: PageTransitionEvent) => {
    record(event);
    if (!event.persisted) dispose();
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    document.removeEventListener('visibilitychange', onVisibility);
    motion.removeEventListener('change', onMotion);
    window.removeEventListener('pageshow', onShow);
    window.removeEventListener('pagehide', onHide);
    map?.off('render', onRender); map = undefined;
    // Keep the final bounded output until the document goes away; BFCache never disposes here.
    publish();
  }
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', onMotion);
  window.addEventListener('pageshow', onShow);
  window.addEventListener('pagehide', onHide);
  publish();
  return {
    attachMap(value: RenderMap) {
      if (disposed || map === value) return;
      map?.off('render', onRender); map = value; map.on('render', onRender);
    },
    recordIdle() {
      if (disposed) return undefined;
      const boundary = stamp(); syncSegment(boundary);
      lastIdle = { ...boundary, idleSequence: ++idleSequence }; publish();
      return lastIdle;
    },
    dispose,
  };
}
