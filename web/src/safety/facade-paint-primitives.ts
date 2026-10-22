/** Existing paint primitives shared verbatim by native and dedicated appearance layers. */
export const FACADE_PAINT_PRIMITIVE_GLSL=`
float fpAa(float d) {
  return max(fwidth(d), 0.0001);
}
float fpInside(float signedDistance) {
  float aa = fpAa(signedDistance);
  return 1.0 - smoothstep(-aa, aa, signedDistance);
}
float fpStroke(float signedDistance, float halfWidth) {
  float aa = fpAa(signedDistance);
  float w = max(halfWidth, 0.0001);
  return 1.0 - smoothstep(max(0.0, w - aa), w + aa, abs(signedDistance));
}
float fpRepeatStroke(float value, float period, float halfWidth) {
  float p = max(period, 0.05);
  float d = abs(mod(value + 0.5 * p, p) - 0.5 * p);
  return fpStroke(d, halfWidth);
}
float fpBoxSdf(vec2 p, vec2 halfSize) {
  vec2 d = abs(p) - max(halfSize, vec2(0.001));
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float fpWindowShape(vec2 q, vec2 halfSize, float archRatio, float pointed) {
  vec2 h = max(halfSize, vec2(0.02));
  float archH = max(0.015, h.y * clamp(archRatio, 0.02, 0.94));
  float springY = h.y - archH;
  float bottomY = -h.y;
  float lowerHalfY = max(0.01, 0.5 * (springY - bottomY));
  float lowerCenterY = 0.5 * (springY + bottomY);
  float lower = fpInside(fpBoxSdf(q - vec2(0.0, lowerCenterY), vec2(h.x, lowerHalfY)));

  float t = (q.y - springY) / archH;
  float capDistance;
  if (pointed > 0.5) {
    float sides = abs(q.x) - h.x * (1.0 - clamp(t, 0.0, 1.0));
    capDistance = max(sides, max(-t * archH, (t - 1.0) * archH));
  } else {
    vec2 ellipse = vec2(q.x / h.x, t);
    float curve = (length(ellipse) - 1.0) * min(h.x, archH);
    capDistance = max(curve, max(-t * archH, (t - 1.0) * archH));
  }
  return max(lower, fpInside(capDistance));
}
float fpDiamond(vec2 q, vec2 halfSize) {
  vec2 h = max(halfSize, vec2(0.001));
  return abs(q.x) / h.x + abs(q.y) / h.y - 1.0;
}
vec3 fpLayer(vec3 color, float mask, vec3 paint, float opacity) {
  return mix(color, paint, clamp(mask * opacity, 0.0, 1.0));
}
`;
