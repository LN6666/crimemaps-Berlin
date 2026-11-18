/** Old tokens remain valid inputs only; every renderer uses the sole economy policy. */
export type SceneQuality = 'economy' | 'balanced' | 'detail';
export const SCENE_QUALITY_PROFILES = {
  economy: {pixelRatioCap: .75, maxDrawingPixels: 3_000_000, environmentFPS: 15, windMetres: .035, waterDetail: 0},
} as const;
/** Drawing pixels, not CSS enlargement. Request MSAA only when constructing the
 * existing map context; querying the context later records what the driver gave. */
export function sceneDrawingPixelRatio(width: number, height: number, devicePixelRatio: number, quality: SceneQuality): number {
  const q = SCENE_QUALITY_PROFILES.economy;
  if (![width, height, devicePixelRatio].every(Number.isFinite) || width <= 0 || height <= 0 || devicePixelRatio <= 0) return q.pixelRatioCap;
  // Keep the pixel ceiling authoritative even when a very large window needs a ratio below .5.
  return Math.min(devicePixelRatio, q.pixelRatioCap, Math.sqrt(q.maxDrawingPixels / (width * height)));
}
export function inspectSceneAntialias(gl: WebGL2RenderingContext) {
  const attributes = gl.getContextAttributes();
  return {requestedByContext: attributes?.antialias ?? false, defaultFramebufferSamples: Number(gl.getParameter(gl.SAMPLES)),
    drawingBufferWidth: gl.drawingBufferWidth, drawingBufferHeight: gl.drawingBufferHeight};
}
