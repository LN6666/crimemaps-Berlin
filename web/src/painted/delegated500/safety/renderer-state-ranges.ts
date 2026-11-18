/** Dirty ranges belong to the dynamic sidecar, in local vertex units. */
export type RendererStateRange = {first: number; end: number};

export function mergeRendererStateRange(previous: RendererStateRange | undefined, first: number, end: number): RendererStateRange | undefined {
  if (end <= first) return previous;
  return previous ? {first: Math.min(previous.first, first), end: Math.max(previous.end, end)} : {first, end};
}

export function writeRendererSelection(data: Float32Array, selected: {firstVertex: number; lastVertex: number} | undefined): RendererStateRange | undefined {
  let first = data.length, end = 0;
  for (let i = 0; i < data.length; i++) {
    const previous = data[i];
    const next = Math.floor(previous / 4) * 4 + previous % 2 + 2 * Number(!!selected && i >= selected.firstVertex && i < selected.lastVertex);
    if (next === previous) continue;
    data[i] = next;
    first = Math.min(first, i);
    end = i + 1;
  }
  return end > first ? {first, end} : undefined;
}

/** Callers preserve the binding once around their changed chunks. */
export function uploadRendererStateRange(gl: WebGL2RenderingContext, buffer: WebGLBuffer, data: Float32Array, range: RendererStateRange): void {
  if (!Number.isSafeInteger(range.first) || !Number.isSafeInteger(range.end) || range.first < 0 || range.end > data.length || range.end <= range.first) throw Error('Invalid local renderer state range');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, range.first * Float32Array.BYTES_PER_ELEMENT, data.subarray(range.first, range.end));
}
