export type ProjectedDetailQuality = 'detail' | 'distant';
export type ProjectedDetailViewport = {
  cssWidth: number;
  cssHeight: number;
  drawingBufferWidth: number;
  drawingBufferHeight: number;
};
export type ProjectedDetailThresholds = {
  enterDistantCssPx: number;
  enterDetailCssPx: number;
};
export type ProjectedDetailDecision = {
  quality: ProjectedDetailQuality;
  cssExtentPx: number | null;
  drawingBufferExtentPx: number | null;
  reason: 'size' | 'selected' | 'invalid' | 'near-plane';
};
// Initial visual thresholds, to be calibrated in the real scene. Not a memory limit.
const defaults: Readonly<ProjectedDetailThresholds> = {enterDistantCssPx: 32, enterDetailCssPx: 48};

/** Screen extent only: no geometry removal, frustum culling or occlusion claim.
 * box is the renderer's local [minX,minY,minZ,maxX,maxY,maxZ]; matrix is its
 * current column-major MVP, already including the anchor/model transform.
 * CSS pixels govern visible size; actual framebuffer pixels are reported too.
 * No window.devicePixelRatio assumption: render quality may scale the buffer.
 */
export function classifyProjectedDetail(
  box: ArrayLike<number>,
  matrix: ArrayLike<number> | undefined,
  viewport: ProjectedDetailViewport,
  previous: ProjectedDetailQuality = 'detail',
  selected = false,
  thresholds: Readonly<ProjectedDetailThresholds> = defaults,
): ProjectedDetailDecision {
  const keep = (reason: ProjectedDetailDecision['reason']): ProjectedDetailDecision =>
    ({quality: 'detail', cssExtentPx: null, drawingBufferExtentPx: null, reason});
  if (selected) return keep('selected');
  if (box.length !== 6 || !matrix || matrix.length !== 16) return keep('invalid');
  for (let i = 0; i < 6; i++) if (!Number.isFinite(box[i])) return keep('invalid');
  for (let i = 0; i < 16; i++) if (!Number.isFinite(matrix[i])) return keep('invalid');
  if (box[0] > box[3] || box[1] > box[4] || box[2] > box[5]) return keep('invalid');
  const {cssWidth, cssHeight, drawingBufferWidth, drawingBufferHeight} = viewport;
  if (![cssWidth, cssHeight, drawingBufferWidth, drawingBufferHeight].every(n => Number.isFinite(n) && n > 0) ||
      !Number.isFinite(thresholds.enterDistantCssPx) || !Number.isFinite(thresholds.enterDetailCssPx) ||
      thresholds.enterDistantCssPx < 0 || thresholds.enterDetailCssPx <= thresholds.enterDistantCssPx) return keep('invalid');
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  // Match paintBoxOutsideClip's conservative full birth-animation height sweep.
  for (let corner = 0; corner < 8; corner++) {
    const x = box[(corner & 1) ? 3 : 0];
    const y = (corner & 2) ? Math.max(0, box[4]) : Math.min(0, box[1]);
    const z = box[(corner & 4) ? 5 : 2];
    const a = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    const b = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    const c = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
    if (![a, b, c, w].every(Number.isFinite)) return keep('invalid');
    const epsilon = 1e-5 * Math.max(1, Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(w));
    // WebGL near plane is z = -w. Do not divide ambiguous/behind-camera corners.
    if (w <= epsilon || c + w <= epsilon) return keep('near-plane');
    const nx = a / w, ny = b / w;
    minX = Math.min(minX, nx); maxX = Math.max(maxX, nx);
    minY = Math.min(minY, ny); maxY = Math.max(maxY, ny);
  }
  // Do not clamp to the viewport: a partly offscreen large object stays detailed.
  const width = (maxX - minX) / 2, height = (maxY - minY) / 2;
  const cssExtentPx = Math.max(width * cssWidth, height * cssHeight);
  const drawingBufferExtentPx = Math.max(width * drawingBufferWidth, height * drawingBufferHeight);
  if (!Number.isFinite(cssExtentPx) || !Number.isFinite(drawingBufferExtentPx)) return keep('invalid');
  const quality = previous === 'distant'
    ? (cssExtentPx >= thresholds.enterDetailCssPx ? 'detail' : 'distant')
    : (cssExtentPx <= thresholds.enterDistantCssPx ? 'distant' : 'detail');
  return {quality, cssExtentPx, drawingBufferExtentPx, reason: 'size'};
}
