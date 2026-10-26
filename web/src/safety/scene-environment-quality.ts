export type SceneQuality = 'economy' | 'balanced' | 'detail';
export const SCENE_QUALITY_PROFILES = {
  economy: {pixelRatioCap: 1, maxDrawingPixels: 3_000_000, environmentFPS: 15, windMetres: .035, waterDetail: 0},
  balanced: {pixelRatioCap: 1.5, maxDrawingPixels: 6_000_000, environmentFPS: 24, windMetres: .055, waterDetail: 1},
  detail: {pixelRatioCap: 2, maxDrawingPixels: 12_000_000, environmentFPS: 30, windMetres: .075, waterDetail: 2},
} as const;
/** Drawing pixels, not CSS enlargement. Request MSAA only when constructing the
 * existing map context; querying the context later records what the driver gave. */
export function sceneDrawingPixelRatio(width: number, height: number, devicePixelRatio: number, quality: SceneQuality): number {
  const q = SCENE_QUALITY_PROFILES[quality];
  if (![width, height, devicePixelRatio].every(Number.isFinite) || width <= 0 || height <= 0 || devicePixelRatio <= 0) return 1;
  return Math.max(.5, Math.min(devicePixelRatio, q.pixelRatioCap, Math.sqrt(q.maxDrawingPixels / (width * height))));
}
export function inspectSceneAntialias(gl: WebGL2RenderingContext) {
  const attributes = gl.getContextAttributes();
  return {requestedByContext: attributes?.antialias ?? false, defaultFramebufferSamples: Number(gl.getParameter(gl.SAMPLES)),
    drawingBufferWidth: gl.drawingBufferWidth, drawingBufferHeight: gl.drawingBufferHeight};
}
