/**
 * Single-opening paint primitives. The caller places each opening in its
 * building-specific facade layout; these functions add colour only.
 * Requires fpInside, fpStroke, fpBoxSdf, fpWindowShape, and fpLayer from the
 * main facade fragment.
 */
export const FACADE_OPENING_GLSL = `
float foRect(vec2 p, vec2 halfSize) {
  return fpInside(fpBoxSdf(p, max(halfSize, vec2(0.01))));
}

float foTriangle(vec2 p, float halfWidth, float halfHeight) {
  float h = max(halfHeight, 0.02);
  float t = (p.y + 0.5 * h) / h;
  float slope = abs(p.x) - halfWidth * (1.0 - clamp(t, 0.0, 1.0));
  float d = max(slope, max(-t * h, (t - 1.0) * h));
  return fpInside(d);
}

float foArchCap(vec2 p, float halfWidth, float halfHeight) {
  float w = max(halfWidth, 0.02);
  float h = max(halfHeight, 0.02);
  float curve = (length(vec2(p.x / w, p.y / h)) - 1.0) * min(w, h);
  return fpInside(max(curve, -p.y));
}

vec3 foRoundedArcade(vec3 wall, vec2 local, vec2 halfSize, float variant) {
  vec2 h = max(halfSize, vec2(0.08));
  float ratio = clamp(h.x / h.y, 0.12, 0.94);
  float shape = fpWindowShape(local, h, ratio, 0.0);
  float outer = fpWindowShape(local, h + vec2(0.13), ratio, 0.0);
  float castShadow = fpWindowShape(local - vec2(0.075, -0.07), h + vec2(0.19), ratio, 0.0);
  vec3 color = fpLayer(wall, castShadow, vec3(0.20, 0.18, 0.16), 0.42);
  color = fpLayer(color, shape, vec3(0.13, 0.16, 0.17), 0.90);
  color = fpLayer(color, clamp(outer - shape, 0.0, 1.0), vec3(0.77, 0.68, 0.55), 0.88);

  float springY = h.y * (1.0 - ratio);
  float archBand = fpStroke(length(local - vec2(0.0, springY)) - h.x - 0.075, 0.04) * step(springY, local.y);
  float impost = fpStroke(local.y - springY, 0.045) *
                 (1.0 - smoothstep(h.x * 0.82, h.x * 0.94, abs(local.x)));
  float keySize = mix(0.13, 0.19, clamp(variant, 0.0, 1.0));
  float keystone = foRect(local - vec2(0.0, h.y * 0.90), vec2(keySize, 0.20));
  color = fpLayer(color, max(archBand, impost), vec3(0.89, 0.80, 0.66), 0.83);
  return fpLayer(color, keystone, vec3(0.85, 0.75, 0.60), 0.91);
}

/** Round hall light: masonry arch, heavy cross divisions and lower rectangular glazing. */
vec3 foHallArch(vec3 wall, vec2 q, vec2 h, float heavy) {
  vec3 c = foRoundedArcade(wall, q, h, 1.0);
  float opening = fpWindowShape(q, h, clamp(h.x / h.y, 0.12, 0.94), 0.0);
  float spring = h.y - min(h.x, h.y * 0.94);
  float mullions = max(fpStroke(q.x, mix(0.028, 0.075, heavy)),
                      fpStroke(abs(q.x) - h.x * 0.48, mix(0.018, 0.045, heavy)));
  float transoms = max(fpStroke(q.y - spring, mix(0.032, 0.08, heavy)),
                      fpStroke(q.y + h.y * 0.30, mix(0.025, 0.064, heavy)));
  c = fpLayer(c, max(mullions, transoms) * opening, vec3(0.68, 0.66, 0.58), 0.96);
  float lowerRail = fpStroke(q.y + h.y * 0.82, 0.035) * opening;
  return fpLayer(c, lowerRail, vec3(0.46, 0.45, 0.40), 0.78);
}

/** Entrance arcade: open passage or recessed doors; no window sill or casement grid.
 * doorLeaf=0 leaves a deep open passage, doorLeaf=1 adds only a recessed double door.
 */
vec3 foEntranceArcade(vec3 wall,vec2 q,vec2 h,float doorLeaf){
 float ratio=clamp(h.x/h.y,.12,.94);
 float opening=fpWindowShape(q,h,ratio,0.);
 float surround=fpWindowShape(q,h+vec2(.22,.12),ratio,0.);
 vec3 c=fpLayer(wall,surround,vec3(.79,.75,.64),.95);
 float depth=clamp((q.y+h.y)/(2.*h.y),0.,1.);
 c=fpLayer(c,opening,mix(vec3(.17,.19,.18),vec3(.055,.075,.078),depth),.99);
 float door=foRect(q-vec2(0.,-h.y*.32),vec2(h.x*.76,h.y*.58))*opening*doorLeaf;
 c=fpLayer(c,door,vec3(.16,.22,.23),.92);
 c=fpLayer(c,fpStroke(q.x,.025)*door,vec3(.44,.46,.42),.8);
 // A ground threshold is distinct from a raised window sill.
 return fpLayer(c,fpStroke(q.y+h.y,.07)*step(abs(q.x),h.x),vec3(.58,.57,.51),.7);
}

/** A free column of one order, deliberately separate from an opening surround. */
vec3 foOrderColumn(vec3 wall, vec2 q, float halfHeight, float radius, float foliate) {
  float shaftHalf = max(0.12, halfHeight * 0.78);
  float shaft = foRect(q, vec2(radius, shaftHalf));
  float shade = clamp(0.45 + 0.55 * sqrt(max(0.0, 1.0 - pow(q.x / radius, 2.0))) - q.x / radius * 0.12, 0.0, 1.0);
  float shadow = foRect(q - vec2(radius * 0.75, -radius * 0.35), vec2(radius * 1.18, shaftHalf));
  vec3 c = fpLayer(wall, shadow, vec3(0.39, 0.36, 0.30), 0.42);
  c = fpLayer(c, shaft, mix(vec3(0.52, 0.49, 0.42), vec3(0.89, 0.84, 0.73), shade), 0.97);
  c = fpLayer(c, fpRepeatStroke(q.x, radius * 0.44, radius * 0.025) * shaft, vec3(0.60, 0.57, 0.48), 0.42);
  float base = foRect(q - vec2(0.0, -shaftHalf - halfHeight * 0.09), vec2(radius * 1.56, halfHeight * 0.07));
  float torus = fpStroke(q.y + shaftHalf, halfHeight * 0.025) * foRect(q, vec2(radius * 1.35, halfHeight));
  float capitalY = shaftHalf + halfHeight * 0.07;
  vec2 capQ = q - vec2(0.0, capitalY);
  float cap = foRect(capQ, vec2(radius * 1.62, halfHeight * 0.11));
  float abacus = foRect(q - vec2(0.0, shaftHalf + halfHeight * 0.19), vec2(radius * 1.80, halfHeight * 0.035));
  c = fpLayer(c, max(base, torus), vec3(0.84, 0.79, 0.67), 0.97);
  c = fpLayer(c, cap, vec3(0.86, 0.80, 0.67), 0.96);
  float leaves = fpRepeatStroke(capQ.x + abs(capQ.y) * 0.65, radius * 0.65, radius * 0.09) * cap;
  c = fpLayer(c, leaves * foliate, vec3(0.48, 0.47, 0.39), 0.75);
  c = fpLayer(c, fpStroke(capQ.y + halfHeight * 0.055, halfHeight * 0.018) * cap, vec3(0.58, 0.54, 0.44), 0.78);
  return fpLayer(c, abacus, vec3(0.93, 0.86, 0.74), 0.98);
}

vec3 foOvalLight(vec3 wall, vec2 q, vec2 h) {
  float d = (length(q / h) - 1.0) * min(h.x, h.y);
  vec3 c = fpLayer(wall, fpInside(d - 0.12), vec3(0.81, 0.74, 0.61), 0.95);
  c = fpLayer(c, fpInside(d), vec3(0.13, 0.17, 0.17), 0.93);
  float bars = max(fpStroke(q.x, 0.045), fpStroke(q.y, 0.045)) * fpInside(d);
  return fpLayer(c, bars, vec3(0.71, 0.69, 0.58), 0.93);
}

/** Bust, scrolls and crown: ornament on masonry, never an extra glazed light. */
vec3 foReliefCrown(vec3 wall, vec2 q, float width, float height) {
  vec2 r = vec2(max(width, 0.12), max(height, 0.12));
  float head = fpInside(length((q - vec2(0.0, r.y * 0.24)) / vec2(r.x * 0.20, r.y * 0.32)) - 1.0);
  float shoulders = foRect(q - vec2(0.0, -r.y * 0.21), vec2(r.x * 0.36, r.y * 0.16));
  float scrolls = max(fpStroke(length((q - vec2(r.x * 0.62, 0.0)) / vec2(r.x * 0.29, r.y * 0.40)) - 1.0, 0.10),
                      fpStroke(length((q + vec2(r.x * 0.62, 0.0)) / vec2(r.x * 0.29, r.y * 0.40)) - 1.0, 0.10));
  float body = max(head, max(shoulders, scrolls));
  vec3 c = fpLayer(wall, body, vec3(0.52, 0.47, 0.39), 0.74);
  return fpLayer(c, fpStroke(q.x + r.x * 0.07, r.x * 0.055) * head, vec3(0.87, 0.79, 0.65), 0.88);
}

vec3 foPortalHeraldry(vec3 wall, vec2 q, float W, float H) {
  vec2 h = vec2(min(W * 0.21, 1.7), min(H * 0.052, 3.1));
  vec3 c = foRoundedArcade(wall, q - vec2(0.0, H * 0.09), h, 1.0);
  float gate = fpWindowShape(q - vec2(0.0, H * 0.09), h, clamp(h.x / h.y, 0.12, 0.94), 0.0);
  float iron = max(fpRepeatStroke(q.x, 0.35, 0.025), fpRepeatStroke(q.y, 0.65, 0.025)) * gate;
  c = fpLayer(c, iron, vec3(0.41, 0.38, 0.30), 0.82);
  vec2 shieldQ = q - vec2(0.0, H * 0.23);
  float shield = fpInside(fpDiamond(shieldQ, vec2(min(W * 0.12, 1.1), H * 0.031)));
  c = fpLayer(c, shield, vec3(0.41, 0.21, 0.17), 0.87);
  c = fpLayer(c, fpStroke(shieldQ.x, 0.085) * shield, vec3(0.74, 0.61, 0.37), 0.85);
  float balcony = foRect(q - vec2(0.0, H * 0.32), vec2(W * 0.32, H * 0.016));
  c = fpLayer(c, balcony, vec3(0.82, 0.75, 0.62), 0.94);
  float rail = fpRepeatStroke(q.x, 0.62, 0.055) * foRect(q - vec2(0.0, H * 0.343), vec2(W * 0.29, H * 0.015));
  return fpLayer(c, rail, vec3(0.52, 0.48, 0.39), 0.87);
}

vec3 foRectCasement(vec3 wall, vec2 local, vec2 halfSize, float variant) {
  vec2 h = max(halfSize, vec2(0.08));
  float opening = foRect(local, h);
  float outer = foRect(local, h + vec2(0.12));
  float shadow = foRect(local - vec2(0.075, -0.07), h + vec2(0.18));
  vec3 color = fpLayer(wall, shadow, vec3(0.19, 0.18, 0.16), 0.40);
  color = fpLayer(color, opening, vec3(0.15, 0.19, 0.21), 0.92);
  color = fpLayer(color, clamp(outer - opening, 0.0, 1.0), vec3(0.80, 0.73, 0.63), 0.92);

  float frame = max(fpStroke(abs(local.x) - h.x + 0.055, 0.027),
                    fpStroke(abs(local.y) - h.y + 0.055, 0.027)) * outer;
  float centerBar = fpStroke(local.x, max(0.025, h.x * mix(0.035, 0.055, clamp(variant, 0.0, 1.0)))) * opening;
  float transom = fpStroke(local.y - h.y * 0.16, 0.026) * opening;
  float sill = fpStroke(local.y + h.y + 0.11, 0.055) *
               (1.0 - smoothstep(h.x + 0.08, h.x + 0.16, abs(local.x)));
  float head = fpStroke(local.y - h.y - 0.09, 0.045) *
               (1.0 - smoothstep(h.x + 0.08, h.x + 0.16, abs(local.x)));
  color = fpLayer(color, frame, vec3(0.91, 0.84, 0.72), 0.78);
  color = fpLayer(color, max(centerBar, transom), vec3(0.61, 0.56, 0.49), 0.92);
  color = fpLayer(color, max(sill, head), vec3(0.89, 0.81, 0.69), 0.94);
  return color;
}

vec3 foRomanAedicule(vec3 wall, vec2 local, vec2 halfSize, float variant) {
  vec2 h = max(halfSize, vec2(0.12));
  float shaftWidth = max(h.x * 0.18, 0.18);
  float gap = max(h.x * 0.075, 0.10);
  float columnX = h.x + gap + shaftWidth;
  float shaftBottom = -h.y - 0.27;
  float shaftTop = h.y + 0.29;
  float shaftCenterY = 0.5 * (shaftBottom + shaftTop);
  float shaftHalfY = 0.5 * (shaftTop - shaftBottom);
  vec2 leftQ = local - vec2(-columnX, shaftCenterY);
  vec2 rightQ = local - vec2(columnX, shaftCenterY);
  vec2 shaftHalf = vec2(shaftWidth, shaftHalfY);
  float leftShadow = foRect(leftQ - vec2(0.085, -0.055), shaftHalf + vec2(0.075, 0.045));
  float rightShadow = foRect(rightQ - vec2(0.085, -0.055), shaftHalf + vec2(0.075, 0.045));
  float leftShaft = foRect(leftQ, shaftHalf);
  float rightShaft = foRect(rightQ, shaftHalf);
  float shafts = max(leftShaft, rightShaft);
  float sideEdges = max(fpStroke(abs(leftQ.x) - shaftWidth * 0.84, 0.035) * leftShaft,
                        fpStroke(abs(rightQ.x) - shaftWidth * 0.84, 0.035) * rightShaft);
  float shaftHighlight = max(fpStroke(leftQ.x, max(0.035, shaftWidth * 0.28)) * leftShaft,
                             fpStroke(rightQ.x, max(0.035, shaftWidth * 0.28)) * rightShaft);
  float fluteSpacing = max(shaftWidth * 0.62, 0.12);
  float flutes = max(fpRepeatStroke(leftQ.x, fluteSpacing, 0.018) * leftShaft,
                     fpRepeatStroke(rightQ.x, fluteSpacing, 0.018) * rightShaft);

  float baseY = shaftBottom - 0.13;
  float baseWidth = shaftWidth * 1.55;
  float leftBase = foRect(local - vec2(-columnX, baseY), vec2(baseWidth, 0.14));
  float rightBase = foRect(local - vec2(columnX, baseY), vec2(baseWidth, 0.14));
  float plinths = max(leftBase, rightBase);
  float baseMould = max(fpStroke(local.y - (baseY - 0.105), 0.025),
                        fpStroke(local.y - (baseY + 0.10), 0.025)) *
                    (1.0 - smoothstep(baseWidth * 0.9, baseWidth * 1.4,
                                      min(abs(local.x - columnX), abs(local.x + columnX))));

  float capitalY = shaftTop + 0.09;
  float capitalHalfY = 0.18;
  float leftCapital = foRect(local - vec2(-columnX, capitalY), vec2(shaftWidth * 1.48, capitalHalfY));
  float rightCapital = foRect(local - vec2(columnX, capitalY), vec2(shaftWidth * 1.48, capitalHalfY));
  float capitals = max(leftCapital, rightCapital);
  float abacusY = capitalY + capitalHalfY * 0.80;
  float abacus = foRect(local - vec2(0.0, abacusY), vec2(columnX + shaftWidth * 1.52, 0.095));
  float echinus = max(fpStroke(local.y - (capitalY - 0.055), 0.035),
                      fpStroke(local.y - (capitalY + 0.075), 0.035)) * capitals;
  float leftVolute = fpStroke(length(local - vec2(-columnX + shaftWidth * 0.54, capitalY)) - shaftWidth * 0.28, 0.026);
  float rightVolute = fpStroke(length(local - vec2(columnX - shaftWidth * 0.54, capitalY)) - shaftWidth * 0.28, 0.026);
  float volutes = max(leftVolute * leftCapital, rightVolute * rightCapital);

  float entablatureY = abacusY + 0.22;
  float entablatureHalfWidth = columnX + shaftWidth * 1.55;
  float entablature = foRect(local - vec2(0.0, entablatureY), vec2(entablatureHalfWidth, 0.17));
  float entablatureShadow = fpStroke(local.y - (entablatureY - 0.17), 0.035) *
                            (1.0 - smoothstep(entablatureHalfWidth - 0.04,
                                              entablatureHalfWidth + 0.04, abs(local.x)));
  float pedimentBase = entablatureY + 0.19;
  float pedimentWidth = entablatureHalfWidth * 0.93;
  float pedimentHeight = max(0.28, min(h.x * 0.32, 0.78));
  vec2 pedimentQ = vec2(local.x, local.y - (pedimentBase + 0.5 * pedimentHeight));
  float triangularPediment = foTriangle(pedimentQ, pedimentWidth, pedimentHeight);
  float archPediment = foArchCap(vec2(local.x, local.y - pedimentBase), pedimentWidth, pedimentHeight);
  float pediment = mix(triangularPediment, archPediment, step(0.5, variant));
  float pedimentOuter = mix(foTriangle(pedimentQ, pedimentWidth + 0.09, pedimentHeight + 0.08),
                            foArchCap(vec2(local.x, local.y - pedimentBase), pedimentWidth + 0.09, pedimentHeight + 0.08),
                            step(0.5, variant));
  float pedimentFrame = clamp(pedimentOuter - pediment, 0.0, 1.0);
  float pedimentRake = fpStroke(local.y - (pedimentBase + pedimentHeight *
                             (1.0 - abs(local.x) / max(pedimentWidth, 0.02))), 0.035) *
                        step(abs(local.x), pedimentWidth);

  float opening = fpWindowShape(local, h, mix(0.22, 0.05, step(0.5, variant)), 0.0);
  float openingOuter = fpWindowShape(local, h + vec2(0.13), mix(0.22, 0.05, step(0.5, variant)), 0.0);
  float openingShadow = fpWindowShape(local - vec2(0.09, -0.07), h + vec2(0.20),
                                      mix(0.22, 0.05, step(0.5, variant)), 0.0);
  float openingFrame = clamp(openingOuter - opening, 0.0, 1.0);
  vec3 color = fpLayer(wall, openingShadow, vec3(0.20, 0.18, 0.15), 0.40);
  color = fpLayer(color, max(leftShadow, rightShadow), vec3(0.19, 0.17, 0.14), 0.52);
  color = fpLayer(color, opening, vec3(0.14, 0.17, 0.18), 0.94);
  color = fpLayer(color, openingFrame, vec3(0.79, 0.70, 0.57), 0.96);

  vec3 columnStone = vec3(0.80, 0.72, 0.60);
  color = fpLayer(color, shafts, columnStone, 0.94);
  color = fpLayer(color, shaftHighlight, vec3(0.96, 0.87, 0.73), 0.96);
  color = fpLayer(color, sideEdges, vec3(0.49, 0.43, 0.35), 0.93);
  color = fpLayer(color, flutes, vec3(0.56, 0.49, 0.40), 0.78);
  color = fpLayer(color, plinths, vec3(0.75, 0.66, 0.54), 0.96);
  color = fpLayer(color, baseMould, vec3(0.96, 0.86, 0.71), 0.90);
  color = fpLayer(color, capitals, vec3(0.84, 0.75, 0.62), 0.97);
  color = fpLayer(color, echinus, vec3(0.53, 0.46, 0.37), 0.85);
  color = fpLayer(color, volutes, vec3(0.94, 0.84, 0.69), 0.96);
  color = fpLayer(color, abacus, vec3(0.90, 0.80, 0.66), 0.98);
  color = fpLayer(color, entablature, vec3(0.78, 0.68, 0.55), 0.97);
  color = fpLayer(color, entablatureShadow, vec3(0.43, 0.37, 0.30), 0.88);
  color = fpLayer(color, pediment, vec3(0.76, 0.66, 0.53), 0.96);
  color = fpLayer(color, pedimentFrame, vec3(0.91, 0.81, 0.67), 0.96);
  color = fpLayer(color, pedimentRake, vec3(0.47, 0.40, 0.32), 0.82);
  float tympanumInset = foRect(local - vec2(0.0, pedimentBase + pedimentHeight * 0.30),
                               vec2(pedimentWidth * 0.26, pedimentHeight * 0.13));
  color = fpLayer(color, tympanumInset * pediment, vec3(0.67, 0.57, 0.45), 0.30);

  float casement = max(fpStroke(local.x, 0.032) * opening,
                       fpStroke(local.y - h.y * 0.10, 0.028) * opening);
  return fpLayer(color, casement, vec3(0.55, 0.49, 0.41), 0.86);
}

vec3 foNicheStatue(vec3 wall, vec2 local, vec2 halfSize, float variant) {
  vec2 h = max(halfSize, vec2(0.10));
  float niche = fpWindowShape(local, h, 0.52, 0.0);
  float outer = fpWindowShape(local, h + vec2(0.13), 0.52, 0.0);
  float shadow = fpWindowShape(local - vec2(0.08, -0.07), h + vec2(0.20), 0.52, 0.0);
  vec3 color = fpLayer(wall, shadow, vec3(0.18, 0.17, 0.15), 0.42);
  color = fpLayer(color, niche, vec3(0.31, 0.29, 0.26), 0.62);
  color = fpLayer(color, clamp(outer - niche, 0.0, 1.0), vec3(0.80, 0.72, 0.60), 0.93);
  float size = mix(1.0, 0.82, clamp(variant, 0.0, 1.0));
  float head = fpInside(length(local - vec2(0.0, h.y * 0.48)) - min(h.x * 0.22, 0.11) * size);
  float torso = foRect(local - vec2(0.0, h.y * 0.10), vec2(h.x * 0.23, h.y * 0.28) * size);
  float shoulders = foRect(local - vec2(0.0, -h.y * 0.13), vec2(h.x * 0.39, h.y * 0.09) * size);
  float legs = foRect(local - vec2(0.0, -h.y * 0.43), vec2(h.x * 0.29, h.y * 0.17) * size);
  float statue = max(head, max(torso, max(shoulders, legs))) * niche;
  color = fpLayer(color, statue, vec3(0.70, 0.63, 0.52), 0.88);
  float pedestal = fpStroke(local.y + h.y * 0.68, 0.045) *
                   (1.0 - smoothstep(h.x * 0.35, h.x * 0.50, abs(local.x)));
  return fpLayer(color, pedestal, vec3(0.91, 0.82, 0.68), 0.90);
}

vec3 foGothicLancet(vec3 wall, vec2 local, vec2 halfSize, float variant) {
  vec2 h = max(halfSize, vec2(0.08));
  float lancet = fpWindowShape(local, h, 0.94, 1.0);
  float outer = fpWindowShape(local, h + vec2(0.12), 0.94, 1.0);
  float shadow = fpWindowShape(local - vec2(0.075, -0.06), h + vec2(0.18), 0.94, 1.0);
  vec3 color = fpLayer(wall, shadow, vec3(0.18, 0.18, 0.17), 0.42);
  color = fpLayer(color, lancet, vec3(0.12, 0.17, 0.21), 0.94);
  color = fpLayer(color, clamp(outer - lancet, 0.0, 1.0), vec3(0.73, 0.72, 0.67), 0.92);
  float t = clamp((local.y + h.y) / max(2.0 * h.y, 0.02), 0.0, 1.0);
  float sideA = fpStroke(local.x - h.x * 0.82 * (1.0 - t), 0.025);
  float sideB = fpStroke(local.x + h.x * 0.82 * (1.0 - t), 0.025);
  float mullion = fpStroke(local.x, mix(0.030, 0.045, clamp(variant, 0.0, 1.0)));
  float transom = fpStroke(local.y, 0.028);
  float tracery = max(max(sideA, sideB), max(mullion, transom)) * lancet;
  float quatrefoil = fpStroke(length(local - vec2(0.0, h.y * 0.48)) - min(h.x * 0.24, 0.22), 0.022) * lancet;
  color = fpLayer(color, tracery, vec3(0.82, 0.79, 0.72), 0.92);
  return fpLayer(color, quatrefoil, vec3(0.86, 0.81, 0.70), 0.86);
}

vec3 foIndustrialPane(vec3 wall, vec2 local, vec2 halfSize, float variant) {
  vec2 h = max(halfSize, vec2(0.08));
  float pane = foRect(local, h);
  float outer = foRect(local, h + vec2(0.12));
  float shadow = foRect(local - vec2(0.07, -0.06), h + vec2(0.18));
  vec3 color = fpLayer(wall, shadow, vec3(0.18, 0.17, 0.15), 0.40);
  color = fpLayer(color, pane, vec3(0.15, 0.19, 0.21), 0.94);
  color = fpLayer(color, clamp(outer - pane, 0.0, 1.0), vec3(0.62, 0.51, 0.42), 0.91);
  float verticalCount = variant > 0.5 ? 3.0 : 2.0;
  float verticalGrid = fpStroke(local.x, 0.028) * pane;
  if (verticalCount > 2.5) {
    verticalGrid = max(verticalGrid,
                       max(fpStroke(local.x - h.x / 3.0, 0.024), fpStroke(local.x + h.x / 3.0, 0.024)) * pane);
  }
  float horizontalGrid = max(fpStroke(local.y, 0.030),
                             max(fpStroke(local.y - h.y * 0.42, 0.024), fpStroke(local.y + h.y * 0.42, 0.024))) * pane;
  color = fpLayer(color, max(verticalGrid, horizontalGrid), vec3(0.58, 0.48, 0.39), 0.95);
  float lintel = fpStroke(local.y - h.y - 0.10, 0.055) *
                 (1.0 - smoothstep(h.x + 0.08, h.x + 0.16, abs(local.x)));
  return fpLayer(color, lintel, vec3(0.74, 0.62, 0.49), 0.88);
}

vec3 facadeOpening(vec3 wall, vec2 local, vec2 halfSize, float kind, float variant) {
  if (kind < 0.5) return wall;
  if (kind < 1.5) return foRoundedArcade(wall, local, halfSize, variant);
  if (kind < 2.5) return foRectCasement(wall, local, halfSize, variant);
  if (kind < 3.5) return foRomanAedicule(wall, local, halfSize, variant);
  if (kind < 4.5) return foNicheStatue(wall, local, halfSize, variant);
  if (kind < 5.5) return foGothicLancet(wall, local, halfSize, variant);
  if (kind < 6.5) return foIndustrialPane(wall, local, halfSize, variant);
  if (kind < 7.5) {vec3 c=foRomanAedicule(wall,local,halfSize,1.0);return foRoundedArcade(c,local,halfSize,1.0);}
  return wall;
}
`;
