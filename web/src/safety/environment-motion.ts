/** The existing frame owner may call frame(). This class creates no RAF, timeout
 * or interval and requests no map repaint on its own. Hidden/reduced modes freeze
 * the display phase, so resuming never jumps by time spent in the background. */
export function createEnvironmentMotion() {
  let enabled = false, visible = true, reduced = false, offscreen = false, destroyed = false;
  let elapsed = 0, previous: number | undefined, lastFrame = -Infinity, frames = 0;
  const active = () => enabled && visible && !reduced && !offscreen && !destroyed;
  const reset = () => { previous = undefined; lastFrame = -Infinity; };
  return {
    setEnabled(value: boolean) { if (enabled !== value) { enabled = value; reset(); } },
    setVisible(value: boolean) { if (visible !== value) { visible = value; reset(); } },
    setReducedMotion(value: boolean) { if (reduced !== value) { reduced = value; reset(); } },
    setOffscreen(value: boolean) { if (offscreen !== value) { offscreen = value; reset(); } },
    frame(now: number, fps: number): {seconds: number; changed: boolean; active: boolean} {
      if (!Number.isFinite(now) || !Number.isFinite(fps) || fps <= 0 || !active()) { reset(); return {seconds: elapsed / 1000, changed: false, active: false}; }
      if (previous === undefined) previous = now;
      // Cadence limits repaint frequency, not the passage of active time. Inactive
      // transitions reset previous, so this never includes a hidden/offscreen pause.
      const delta = Math.max(0, now - previous); previous = now;
      elapsed += delta;
      const changed = now - lastFrame >= 1000 / Math.min(30, fps) - .01;
      if (changed) { lastFrame = now; frames++; }
      return {seconds: elapsed / 1000, changed, active: true};
    },
    get stats() { return {active: active(), elapsedSeconds: elapsed / 1000, frames, timers: 0, animationFrames: 0}; },
    destroy() { destroyed = true; enabled = false; reset(); },
  };
}
