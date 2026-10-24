import {HC70_GLSL,HC70_DISPATCH,HC70_FAMILIES} from './supplement-hc70';
import {SUPPLEMENT_BATCH1_GLSL,SUPPLEMENT_BATCH1_DISPATCH,SUPPLEMENT_BATCH1_FAMILIES} from './supplement-batch1';
import{F340_PROGRAM_SOURCE_SHA,HANNOVER_FAMILIES822,HANNOVER_PROGRAMS822}from'./f340-program822';
import{f4054Reachable672}from'./f4054-reachable672';
import{chilehausRect608}from'./chilehaus-rect608';
import{maritimePartition586}from'./maritime-partition586';
import{legacyNd169Compile591}from'./legacy-nd169-compile591';
import{sharedPartition577}from'./shared-partition577';
import {F269_RECOVERY_GLSL284} from './f269-recovery-glsl284';
import {F061_RECOVERY_GLSL279} from './f061-recovery-glsl279';
import {F061_COURT_GLSL829} from './f061-court-glsl829';
import {F061_NAVE_GLSL833} from './f061-nave-glsl833';
import {F063_RECOVERY_GLSL272} from './f063-recovery-glsl272';
import {BERLIN_PROGRAM_SOURCE_SHA,BERLIN_PROGRAM_FAMILIES,BERLIN_PROGRAM_GLSL} from './progressive-berlin-programs';
import {PROGRESSIVE_CITY_BASELINE_GLSL,PROGRESSIVE_CITY_EXTRA_GLSL,PROGRESSIVE_CITY_SOURCE_FULL_SHA} from './progressive-feature-cities';
import {PROGRESSIVE_FEATURE_GLSL,PROGRESSIVE_FEATURE_SHA} from './progressive-feature-glsl';
import {FACADE_PAINT_PRIMITIVE_GLSL} from './facade-paint-primitives';
import {HAMBURG_PROGRAM_SOURCE_SHA,HAMBURG_PROGRAM_FAMILIES,HAMBURG_PROGRAM_GLSL} from './progressive-hamburg-programs';
/**
 * Procedural paint-only facade detail for the native building mesh.
 *
 * frame = (u metres along the original wall, y metres above its face bottom,
 *         face height, face width). The snippet expects GLSL ES 3.00 fragment
 * derivatives to be available. It changes fragment colour only; it does not
 * displace or rebuild geometry.
 */
const makeFacadePaintFragment = (progressive:string,dispatchName:string,includeF063=false,includeF061=false,includeF269=false)=>`
${FACADE_PAINT_PRIMITIVE_GLSL}
${SUPPLEMENT_BATCH1_GLSL}
${HC70_GLSL}
vec3 fpSurfaceOnly(vec3 base,vec2 uv,float material);
vec3 fpLayoutFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float layoutId);
















struct FPGrid {
  float bay;
  float story;
  float podium;
  float top;
  float opening;
  float surround;
  float pier;
  float storyLine;
  float verticalPane;
  float horizontalPane;
  float sill;
  float head;
  vec2 q;
  vec2 halfSize;
};

FPGrid fpGrid(float u, float y, float width, float height,
              float bayGoal, float storyGoal, float windowWidthRatio,
              float windowHeightRatio, float archRatio, float pointed) {
  FPGrid g;
  float safeWidth = max(width, 0.5);
  float safeHeight = max(height, 0.5);
  float aspect = safeHeight / safeWidth;
  float tower = smoothstep(1.8, 3.2, aspect) * (1.0 - smoothstep(12.0, 20.0, safeWidth));
  float adaptedStory = mix(storyGoal, max(storyGoal, 7.4), tower);
  float stories = clamp(floor(safeHeight / max(adaptedStory, 0.5)), 1.0, 18.0);
  float bays = clamp(floor(safeWidth / max(bayGoal, 0.5)), 1.0, 40.0);
  g.bay = safeWidth / bays;
  g.story = safeHeight / stories;
  float uInBay = mod(u, g.bay) - 0.5 * g.bay;
  float yInStory = mod(y, g.story) - 0.52 * g.story;
  g.q = vec2(uInBay, yInStory);
  g.halfSize = vec2(min(g.bay * windowWidthRatio, 1.85),
                    min(g.story * windowHeightRatio, 2.05));
  float inner = fpWindowShape(g.q, g.halfSize, archRatio, pointed);
  vec2 outerSize = g.halfSize + vec2(0.15, 0.15);
  float outer = fpWindowShape(g.q, outerSize, archRatio, pointed);
  g.opening = inner;
  g.surround = clamp(outer - inner, 0.0, 1.0);
  g.pier = fpRepeatStroke(u, g.bay, 0.12);
  g.storyLine = fpRepeatStroke(y, g.story, 0.035);
  g.verticalPane = fpStroke(g.q.x, 0.028) * inner;
  g.horizontalPane = fpStroke(g.q.y, 0.030) * inner;
  float withinSpan = 1.0 - smoothstep(g.halfSize.x + 0.12, g.halfSize.x + 0.19, abs(g.q.x));
  g.sill = fpStroke(g.q.y + g.halfSize.y + 0.08, 0.045) * withinSpan;
  g.head = fpStroke(g.q.y - g.halfSize.y - 0.08, 0.045) * withinSpan;
  float yn = clamp(y / safeHeight, 0.0, 1.0);
  g.podium = 1.0 - smoothstep(0.17, 0.25, yn);
  g.top = smoothstep(0.77, 0.86, yn);
  return g;
}

vec3 fpRoofPaint(vec3 base, vec3 p) {
  float seamX = fpRepeatStroke(p.x, 2.8, 0.018);
  float seamZ = fpRepeatStroke(p.z, 1.45, 0.014);
  float row = floor(p.z / 1.45);
  float staggered = fpRepeatStroke(p.x + mod(row, 2.0) * 1.4, 2.8, 0.014);
  float seams = max(seamX, max(seamZ, staggered));
  return mix(base, base * 0.88, seams * 0.11);
}

vec3 fpBrickFacade(vec3 base, float u, float y, float width, float height,
                   float industrial) {
  float bayGoal = mix(4.4, 5.6, industrial);
  FPGrid g = fpGrid(u, y, width, height, bayGoal, 3.7,
                    mix(0.31, 0.37, industrial), mix(0.34, 0.39, industrial),
                    mix(0.68, 0.46, industrial), 0.0);
  vec3 brick = mix(base, vec3(0.48, 0.285, 0.215), mix(0.26, 0.31, industrial));
  vec3 mortar = vec3(0.72, 0.60, 0.49);
  vec3 darkBrick = vec3(0.34, 0.205, 0.16);
  float courseHeight = mix(0.27, 0.31, industrial);
  float row = floor(y / courseHeight);
  float course = fpRepeatStroke(y, courseHeight, 0.014);
  float joint = fpRepeatStroke(u + mod(row, 2.0) * 0.38, 0.82, 0.012);
  float masonry = max(course, joint) * (1.0 - g.opening);
  brick = fpLayer(brick, masonry, mortar, 0.23);
  float podiumBand = fpRepeatStroke(y, 0.62, 0.018) * g.podium * (1.0 - g.opening);
  brick = fpLayer(brick, podiumBand, darkBrick, 0.38);
  float pier = fpRepeatStroke(u, g.bay, mix(0.14, 0.19, industrial));
  brick = fpLayer(brick, pier, darkBrick, 0.28);

  vec3 glass = mix(vec3(0.15, 0.19, 0.21), base * 0.52, 0.22);
  brick = fpLayer(brick, g.opening, glass, 0.92);
  brick = fpLayer(brick, g.surround, vec3(0.69, 0.55, 0.43), 0.76);
  brick = fpLayer(brick, g.verticalPane, vec3(0.65, 0.58, 0.49), 0.82);
  brick = fpLayer(brick, g.horizontalPane, vec3(0.65, 0.58, 0.49), 0.74);
  brick = fpLayer(brick, max(g.sill, g.head), vec3(0.75, 0.63, 0.51), 0.75);
  float stringCourse = max(fpStroke(y - height * 0.21, 0.10),
                           max(fpStroke(y - height * 0.82, 0.08), fpStroke(y - height * 0.965, 0.13)));
  brick = fpLayer(brick, stringCourse, vec3(0.72, 0.59, 0.47), 0.58);
  float parapet = fpStroke(y - height * 0.985, 0.028);
  return fpLayer(brick, parapet, vec3(0.29, 0.19, 0.15), 0.35);
}

vec3 fpRathausMainFacade(vec3 base, float u, float y, float width, float height) {
  float bays = clamp(floor(width / 4.8), 1.0, 48.0);
  float bay = width / bays;
  float story = height * 0.25;
  float qx = mod(u, bay) - 0.5 * bay;
  float storyIndex = floor(y / story);
  float qy = mod(y, story) - 0.5 * story;
  float ground = 1.0 - step(0.5, storyIndex);
  float upperDecor = smoothstep(height * 0.76, height * 0.81, y) *
                     (1.0 - smoothstep(height * 0.93, height * 0.97, y));
  float wideMain = smoothstep(15.0, 22.0, width);

  vec3 stone = mix(base, vec3(0.71, 0.64, 0.53), 0.34);
  vec3 shadowStone = vec3(0.39, 0.345, 0.29);
  vec3 highlightStone = vec3(0.87, 0.79, 0.67);
  vec3 glass = vec3(0.17, 0.19, 0.20);

  vec2 q = vec2(qx, qy);
  float halfWidth = min(bay * 0.30, 1.68);
  float groundHalfHeight = min(story * 0.41, 2.45);
  float upperHalfHeight = min(story * 0.255, 1.58);
  vec2 groundSize = vec2(halfWidth, groundHalfHeight);
  vec2 upperSize = vec2(halfWidth * 0.92, upperHalfHeight);
  float groundWindow = fpWindowShape(q, groundSize, 0.62, 0.0);
  float upperWindow = fpWindowShape(q, upperSize, 0.025, 0.0);
  float groundOuter = fpWindowShape(q, groundSize + vec2(0.16), 0.62, 0.0);
  float upperOuter = fpWindowShape(q, upperSize + vec2(0.14), 0.025, 0.0);
  float opening = mix(upperWindow, groundWindow, ground);
  float surround = mix(clamp(upperOuter - upperWindow, 0.0, 1.0),
                       clamp(groundOuter - groundWindow, 0.0, 1.0), ground);

  float podium = 1.0 - smoothstep(height * 0.19, height * 0.25, y);
  float rustication = max(fpRepeatStroke(y, 0.52, 0.018),
                          fpRepeatStroke(u + mod(floor(y / 0.52), 2.0) * 0.55, 1.1, 0.014));
  stone = fpLayer(stone, rustication * podium * (1.0 - opening), shadowStone, 0.28);
  stone = fpLayer(stone, podium, vec3(0.55, 0.50, 0.43), 0.10);

  // Repeated round shafts with contrasting arrises and shallow painted flutes.
  float shaftOffset = mod(u + 0.5 * bay, bay) - 0.5 * bay;
  float shaftDistance = abs(shaftOffset);
  float shaft = 1.0 - smoothstep(0.17, 0.24, shaftDistance);
  float shaftCore = 1.0 - smoothstep(0.015, 0.105, shaftDistance);
  float shaftShadowEdge = fpStroke(shaftDistance - 0.18, 0.027);
  float flute = fpStroke(abs(shaftOffset) - 0.072, 0.015) * shaft;
  stone = fpLayer(stone, shaft, shadowStone, 0.48);
  stone = fpLayer(stone, shaftCore, highlightStone, 0.74);
  stone = fpLayer(stone, shaftShadowEdge, shadowStone, 0.87);
  stone = fpLayer(stone, flute, vec3(0.96, 0.87, 0.73), 0.68);
  float capital = shaft * fpRepeatStroke(y, story, 0.19);
  stone = fpLayer(stone, capital, highlightStone, 0.94);
  stone = fpLayer(stone, capital * fpRepeatStroke(y - 0.12, story, 0.026), shadowStone, 0.73);

  stone = fpLayer(stone, opening, glass, 0.94);
  stone = fpLayer(stone, surround, highlightStone, 0.94);
  float verticalCasement = fpStroke(qx, 0.035) * opening;
  float groundTransom = fpStroke(qy + groundHalfHeight * 0.02, 0.036) * opening * ground;
  float upperTransom = fpStroke(qy - upperHalfHeight * 0.10, 0.032) * opening * (1.0 - ground);
  stone = fpLayer(stone, max(verticalCasement, max(groundTransom, upperTransom)), shadowStone, 0.82);
  float sillSpan = 1.0 - smoothstep(halfWidth + 0.12, halfWidth + 0.20, abs(qx));
  float sill = fpStroke(qy + mix(upperHalfHeight, groundHalfHeight, ground) + 0.09, 0.052) * sillSpan;
  stone = fpLayer(stone, sill, highlightStone, 0.97);

  // Four major storey belts, plus a stronger podium, attic, and roof cornice.
  float belt = fpRepeatStroke(y, story, 0.085);
  float beltLight = fpRepeatStroke(y - 0.13, story, 0.040);
  float podiumTop = fpStroke(y - height * 0.25, 0.105);
  float atticBelt = fpStroke(y - height * 0.75, 0.11);
  float cornice = max(fpStroke(y - height * 0.945, 0.18), fpStroke(y - height * 0.978, 0.035));
  stone = fpLayer(stone, max(belt, max(podiumTop, atticBelt)), shadowStone, 0.72);
  stone = fpLayer(stone, beltLight, highlightStone, 0.72);
  stone = fpLayer(stone, cornice, highlightStone, 0.91);

  // Restrained painted niches and figure silhouettes in the upper strip only.
  float nicheSpacing = max(2.0 * bay, 3.2);
  float nicheX = mod(u - 0.5 * bay + 0.5 * nicheSpacing, nicheSpacing) - 0.5 * nicheSpacing;
  vec2 nicheQ = vec2(nicheX, y - height * 0.865);
  vec2 nicheSize = vec2(min(nicheSpacing * 0.18, 0.38), 0.67);
  float nicheInside = fpWindowShape(nicheQ, nicheSize, 0.34, 0.0) * upperDecor * wideMain;
  float nicheOuter = fpWindowShape(nicheQ, nicheSize + vec2(0.10), 0.34, 0.0) * upperDecor * wideMain;
  stone = fpLayer(stone, nicheInside, shadowStone, 0.55);
  stone = fpLayer(stone, clamp(nicheOuter - nicheInside, 0.0, 1.0), highlightStone, 0.85);
  float figureHead = fpInside(length(nicheQ - vec2(0.0, 0.35)) - 0.075);
  float figureBody = fpInside(fpBoxSdf(nicheQ - vec2(0.0, 0.06), vec2(0.105, 0.24)));
  float figureShoulders = fpInside(fpBoxSdf(nicheQ - vec2(0.0, -0.13), vec2(0.17, 0.065)));
  float figureLegs = fpInside(fpBoxSdf(nicheQ - vec2(0.0, -0.34), vec2(0.13, 0.12)));
  float figure = max(figureHead, max(figureBody, max(figureShoulders, figureLegs))) * nicheInside;
  stone = fpLayer(stone, figure, vec3(0.29, 0.25, 0.21), 0.86);
  return stone;
}

vec3 fpRathausTowerFacade(vec3 base, float u, float y, float width, float height) {
  float stories = clamp(floor(height / 10.2), 4.0, 10.0);
  float story = height / stories;
  float localX = mod(u, max(width, 0.5)) - 0.5 * max(width, 0.5);
  float localY = mod(y, story) - 0.52 * story;
  float halfWidth = min(width * 0.20, 0.72);
  float halfHeight = min(story * 0.31, 2.25);
  vec2 q = vec2(localX, localY);
  vec2 windowSize = vec2(halfWidth, halfHeight);
  float opening = fpWindowShape(q, windowSize, 0.62, 0.0);
  float surround = clamp(fpWindowShape(q, windowSize + vec2(0.12), 0.62, 0.0) - opening, 0.0, 1.0);
  vec3 stone = mix(base, vec3(0.70, 0.625, 0.51), 0.34);
  vec3 shadow = vec3(0.39, 0.34, 0.28);
  vec3 lightStone = vec3(0.86, 0.77, 0.64);
  stone = fpLayer(stone, fpRepeatStroke(y, story, 0.075), shadow, 0.70);
  stone = fpLayer(stone, fpRepeatStroke(y - 0.12, story, 0.035), lightStone, 0.72);
  float cornerPilaster = fpRepeatStroke(u, max(width, 0.5), 0.09);
  stone = fpLayer(stone, cornerPilaster, lightStone, 0.52);
  stone = fpLayer(stone, opening, vec3(0.16, 0.18, 0.19), 0.94);
  stone = fpLayer(stone, surround, lightStone, 0.91);
  stone = fpLayer(stone, fpStroke(localX, 0.028) * opening, shadow, 0.86);

  // Painted clock face at roughly seven tenths of the tower height.
  float clockRadius = min(width * 0.17, 1.18);
  float clockEnabled = smoothstep(1.6, 2.8, width);
  vec2 clockQ = vec2(u - 0.5 * width, y - height * 0.70);
  float clockDistance = length(clockQ);
  float dial = fpInside(clockDistance - clockRadius) * clockEnabled;
  stone = fpLayer(stone, dial, vec3(0.80, 0.73, 0.59), 0.95);
  float outerRim = fpStroke(clockDistance - (clockRadius + 0.075), 0.035) * clockEnabled;
  float innerRim = fpStroke(clockDistance - (clockRadius - 0.045), 0.025) * clockEnabled;
  stone = fpLayer(stone, outerRim, vec3(0.56, 0.31, 0.18), 0.96);
  stone = fpLayer(stone, innerRim, vec3(0.88, 0.67, 0.36), 0.95);
  for (int i = 0; i < 12; ++i) {
    float angle = 6.2831853 * float(i) / 12.0;
    vec2 direction = vec2(cos(angle), sin(angle));
    float along = dot(clockQ, direction);
    float across = abs(clockQ.x * direction.y - clockQ.y * direction.x);
    float tickRange = smoothstep(clockRadius * 0.70, clockRadius * 0.76, along) *
                      (1.0 - smoothstep(clockRadius * 0.88, clockRadius * 0.94, along));
    float tick = fpStroke(across, 0.018) * tickRange * dial;
    stone = fpLayer(stone, tick, vec3(0.36, 0.25, 0.18), 0.95);
  }
  float minuteAngle = 0.42;
  float hourAngle = -1.08;
  float minuteHand = fpStroke(clockQ.x * sin(minuteAngle) - clockQ.y * cos(minuteAngle), 0.024) *
                     (1.0 - smoothstep(clockRadius * 0.54, clockRadius * 0.60, clockDistance)) * dial;
  float hourHand = fpStroke(clockQ.x * sin(hourAngle) - clockQ.y * cos(hourAngle), 0.032) *
                   (1.0 - smoothstep(clockRadius * 0.40, clockRadius * 0.47, clockDistance)) * dial;
  stone = fpLayer(stone, max(minuteHand, hourHand), vec3(0.56, 0.20, 0.16), 0.92);
  float pin = fpInside(clockDistance - 0.055) * dial;
  stone = fpLayer(stone, pin, vec3(0.52, 0.25, 0.16), 0.95);
  return stone;
}

vec3 fpClassicalFacade(vec3 base, float u, float y, float width, float height, float variant) {
  if (variant > 0.5) {
    if (height > 50.0 && width < 20.0) {
      return fpRathausTowerFacade(base, u, y, width, height);
    }
    if (height >= 12.0 && height <= 45.0 && width >= 8.0) {
      return fpRathausMainFacade(base, u, y, width, height);
    }
  }

  FPGrid g = fpGrid(u, y, width, height, 4.35, 3.9, 0.30, 0.34, 0.70, 0.0);
  vec3 stone = mix(base, vec3(0.70, 0.635, 0.535), 0.30);
  vec3 shadowStone = vec3(0.43, 0.385, 0.33);
  vec3 highlight = vec3(0.82, 0.755, 0.65);
  vec3 glass = vec3(0.18, 0.205, 0.21);

  float course = fpRepeatStroke(y, 0.58, 0.018);
  float blockJoint = fpRepeatStroke(u + mod(floor(y / 0.58), 2.0) * 0.62, 1.28, 0.016);
  float rustication = max(course, blockJoint) * g.podium * (1.0 - g.opening);
  stone = fpLayer(stone, rustication, shadowStone, 0.28);

  float pilaster = fpRepeatStroke(u, g.bay, 0.105);
  float flute = max(fpRepeatStroke(u + 0.055, g.bay, 0.018),
                    fpRepeatStroke(u - 0.055, g.bay, 0.018));
  stone = fpLayer(stone, pilaster, highlight, 0.33);
  stone = fpLayer(stone, pilaster * flute, shadowStone, 0.28);
  float capital = pilaster * fpRepeatStroke(y, g.story, 0.16);
  stone = fpLayer(stone, capital, highlight, 0.82);

  stone = fpLayer(stone, g.opening, glass, 0.93);
  stone = fpLayer(stone, g.surround, highlight, 0.86);
  stone = fpLayer(stone, g.verticalPane, shadowStone, 0.88);
  stone = fpLayer(stone, g.horizontalPane, shadowStone, 0.84);
  stone = fpLayer(stone, max(g.sill, g.head), highlight, 0.91);

  float keystone = fpInside(fpDiamond(g.q - vec2(0.0, g.halfSize.y + 0.18), vec2(0.12, 0.19)));
  stone = fpLayer(stone, keystone, highlight, 0.82);
  float cornice = max(fpStroke(y - height * 0.19, 0.13),
                  max(fpStroke(y - height * 0.78, 0.15),
                  max(fpStroke(y - height * 0.955, 0.20), fpStroke(y - height * 0.985, 0.035))));
  stone = fpLayer(stone, cornice, highlight, 0.73);
  stone = fpLayer(stone, fpStroke(y - height * 0.205, 0.025), shadowStone, 0.48);
  return stone;
}

vec3 fpGothicFacade(vec3 base, float u, float y, float width, float height) {
  FPGrid g = fpGrid(u, y, width, height, 4.0, 4.1, 0.29, 0.36, 0.86, 1.0);
  vec3 stone = mix(base, vec3(0.60, 0.595, 0.56), 0.30);
  vec3 shadowStone = vec3(0.34, 0.35, 0.34);
  vec3 highlight = vec3(0.77, 0.755, 0.70);
  vec3 glass = vec3(0.13, 0.18, 0.22);

  float ashlar = max(fpRepeatStroke(y, 0.72, 0.016),
                     fpRepeatStroke(u + mod(floor(y / 0.72), 2.0) * 0.58, 1.18, 0.014));
  stone = fpLayer(stone, ashlar * (1.0 - g.opening), shadowStone, 0.19);
  float pier = fpRepeatStroke(u, g.bay, 0.17);
  stone = fpLayer(stone, pier, highlight, 0.40);
  stone = fpLayer(stone, pier * fpRepeatStroke(u + 0.075, g.bay, 0.022), shadowStone, 0.36);

  stone = fpLayer(stone, g.opening, glass, 0.96);
  stone = fpLayer(stone, g.surround, highlight, 0.89);
  float t = clamp((g.q.y + g.halfSize.y) / max(2.0 * g.halfSize.y, 0.02), 0.0, 1.0);
  float leftRib = fpStroke(g.q.x + g.halfSize.x * 0.82 * (1.0 - t), 0.027);
  float rightRib = fpStroke(g.q.x - g.halfSize.x * 0.82 * (1.0 - t), 0.027);
  float ribs = max(leftRib, rightRib) * g.opening;
  stone = fpLayer(stone, max(g.verticalPane, ribs), highlight, 0.92);
  stone = fpLayer(stone, g.horizontalPane, highlight, 0.84);
  float rose = fpStroke(length(g.q - vec2(0.0, g.halfSize.y * 0.48)) - min(g.halfSize.x * 0.25, 0.26), 0.025);
  stone = fpLayer(stone, rose * g.opening, highlight, 0.86);
  stone = fpLayer(stone, max(g.sill, g.head), highlight, 0.88);
  float belt = max(fpStroke(y - height * 0.20, 0.09),
                   max(fpStroke(y - height * 0.82, 0.11), fpStroke(y - height * 0.97, 0.16)));
  return fpLayer(stone, belt, highlight, 0.70);
}

vec3 fpBaroqueFacade(vec3 base, float u, float y, float width, float height) {
  FPGrid g = fpGrid(u, y, width, height, 4.05, 3.9, 0.29, 0.34, 0.73, 0.0);
  vec3 plaster = mix(base, vec3(0.77, 0.70, 0.58), 0.34);
  vec3 shade = vec3(0.46, 0.39, 0.31);
  vec3 giltStone = vec3(0.86, 0.77, 0.62);
  vec3 glass = vec3(0.16, 0.19, 0.20);

  float pilaster = fpRepeatStroke(u, g.bay, 0.14);
  float flutes = max(fpRepeatStroke(u + 0.055, g.bay, 0.018), fpRepeatStroke(u - 0.055, g.bay, 0.018));
  plaster = fpLayer(plaster, pilaster, giltStone, 0.43);
  plaster = fpLayer(plaster, pilaster * flutes, shade, 0.26);
  float plasterPanel = max(fpRepeatStroke(y, 0.92, 0.016), fpRepeatStroke(u + 0.47, 1.85, 0.016));
  plaster = fpLayer(plaster, plasterPanel * (1.0 - g.opening), shade, 0.14);

  plaster = fpLayer(plaster, g.opening, glass, 0.94);
  plaster = fpLayer(plaster, g.surround, giltStone, 0.94);
  plaster = fpLayer(plaster, g.verticalPane, shade, 0.90);
  plaster = fpLayer(plaster, g.horizontalPane, shade, 0.86);
  plaster = fpLayer(plaster, max(g.sill, g.head), giltStone, 0.96);

  float scrollLeft = fpStroke(length(vec2(abs(g.q.x) - (g.halfSize.x + 0.17), g.q.y - g.halfSize.y * 0.40)) - 0.09, 0.022);
  float scrollRight = fpStroke(length(vec2(abs(g.q.x) - (g.halfSize.x + 0.31), g.q.y - g.halfSize.y * 0.30)) - 0.075, 0.020);
  plaster = fpLayer(plaster, max(scrollLeft, scrollRight), giltStone, 0.72);
  float keystone = fpInside(fpDiamond(g.q - vec2(0.0, g.halfSize.y + 0.20), vec2(0.14, 0.22)));
  plaster = fpLayer(plaster, keystone, giltStone, 0.95);
  float cornice = max(fpStroke(y - height * 0.18, 0.11),
                  max(fpStroke(y - height * 0.80, 0.16),
                  max(fpStroke(y - height * 0.95, 0.20), fpStroke(y - height * 0.982, 0.035))));
  plaster = fpLayer(plaster, cornice, giltStone, 0.84);
  return fpLayer(plaster, fpStroke(y - height * 0.197, 0.026), shade, 0.47);
}

vec3 fpHalfTimberFacade(vec3 base, float u, float y, float width, float height) {
  FPGrid g = fpGrid(u, y, width, height, 4.8, 3.6, 0.28, 0.30, 0.03, 0.0);
  vec3 plaster = mix(base, vec3(0.78, 0.735, 0.63), 0.34);
  vec3 timber = vec3(0.25, 0.16, 0.12);
  vec3 glass = vec3(0.16, 0.20, 0.21);

  float post = fpRepeatStroke(u, g.bay, 0.075);
  float rail = fpRepeatStroke(y, g.story, 0.070);
  float panel = fpInside(fpBoxSdf(g.q, vec2(g.bay * 0.43, g.story * 0.42)));
  float risingBrace = fpStroke(g.q.x - g.q.y * (g.bay / max(g.story, 0.1)) * 0.78, 0.045);
  float fallingBrace = fpStroke(g.q.x + g.q.y * (g.bay / max(g.story, 0.1)) * 0.78, 0.045);
  float braces = max(risingBrace, fallingBrace) * panel * (1.0 - g.opening);
  plaster = fpLayer(plaster, max(post, rail), timber, 0.92);
  plaster = fpLayer(plaster, braces, timber, 0.88);
  plaster = fpLayer(plaster, g.opening, glass, 0.94);
  plaster = fpLayer(plaster, g.surround, timber, 0.92);
  plaster = fpLayer(plaster, max(g.verticalPane, g.horizontalPane), timber, 0.92);
  float sill = fpStroke(g.q.y + g.halfSize.y + 0.11, 0.055) *
               (1.0 - smoothstep(g.halfSize.x + 0.1, g.halfSize.x + 0.17, abs(g.q.x)));
  return fpLayer(plaster, sill, timber, 0.86);
}

vec3 fpGlassFacade(vec3 base, float u, float y, float width, float height, float glassMix) {
  FPGrid g = fpGrid(u, y, width, height, 2.2, 3.7, 0.46, 0.43, 0.03, 0.0);
  vec3 glass = mix(base, vec3(0.32, 0.48, 0.54), 0.32 * glassMix);
  vec3 mullion = vec3(0.18, 0.24, 0.27);
  vec3 reflection = vec3(0.64, 0.76, 0.78);
  float yn = clamp(y / max(height, 0.1), 0.0, 1.0);
  float phase = u * 0.20 + y * 0.17 + sin((u + y) * 0.045) * 0.7;
  float reflectedSky = smoothstep(0.68, 0.96, 0.5 + 0.5 * sin(phase));
  float diagonalGlint = fpRepeatStroke(u + y * 0.42, 8.4, 0.34);
  glass = fpLayer(glass, reflectedSky * 0.23, reflection, 0.38 * glassMix);
  glass = fpLayer(glass, diagonalGlint, reflection, 0.14 * glassMix);

  float vertical = fpRepeatStroke(u, g.bay, 0.035);
  float horizontal = fpRepeatStroke(y, g.story, 0.040);
  float spandrel = fpRepeatStroke(y, g.story, 0.18);
  float fin = fpRepeatStroke(u + 0.16, g.bay, 0.11);
  glass = fpLayer(glass, spandrel, mullion, 0.68);
  glass = fpLayer(glass, max(vertical, horizontal), mullion, 0.72);
  glass = fpLayer(glass, fin, reflection, 0.30 * glassMix);
  float podium = 1.0 - smoothstep(0.13, 0.20, yn);
  float topCap = smoothstep(0.91, 0.97, yn);
  glass = fpLayer(glass, podium, vec3(0.34, 0.39, 0.39), 0.30);
  glass = fpLayer(glass, topCap, mullion, 0.45);
  float slabShadow = max(fpStroke(y - height * 0.19, 0.06), fpStroke(y - height * 0.965, 0.10));
  return fpLayer(glass, slabShadow, mullion, 0.60);
}

vec3 fpOrdinaryFacade(vec3 base, float u, float y, float width, float height) {
  float aspect = max(height, 0.5) / max(width, 0.5);
  float tower = smoothstep(1.8, 3.2, aspect) * (1.0 - smoothstep(12.0, 20.0, width));
  float bayGoal = mix(6.4, 4.9, tower);
  float storyGoal = mix(4.4, 6.4, tower);
  float windowWidth = mix(0.31, 0.24, tower);
  float windowHeight = mix(0.29, 0.25, tower);
  FPGrid g = fpGrid(u, y, width, height, bayGoal, storyGoal,
                    windowWidth, windowHeight, 0.025, 0.0);
  vec3 plaster = mix(base, vec3(0.69, 0.665, 0.61), 0.25);
  vec3 trim = vec3(0.83, 0.79, 0.71);
  vec3 reveal = vec3(0.37, 0.36, 0.33);
  vec3 glass = vec3(0.19, 0.23, 0.25);
  float yn = clamp(y / max(height, 0.1), 0.0, 1.0);
  float podium = 1.0 - smoothstep(0.16, 0.25, yn);
  float top = smoothstep(0.81, 0.90, yn);
  float floorLine = g.storyLine * (1.0 - g.opening);
  plaster = fpLayer(plaster, podium, vec3(0.58, 0.55, 0.50), 0.20);
  plaster = fpLayer(plaster, floorLine, reveal, 0.23);

  plaster = fpLayer(plaster, g.opening, glass, 0.96);
  plaster = fpLayer(plaster, g.surround, reveal, 0.90);
  plaster = fpLayer(plaster, max(g.verticalPane, g.horizontalPane), trim, 0.87);
  plaster = fpLayer(plaster, max(g.sill, g.head), trim, 0.93);

  float jambShade = fpStroke(abs(g.q.x) - g.halfSize.x + 0.045, 0.025) * g.opening;
  plaster = fpLayer(plaster, jambShade, reveal, 0.50);
  float cornice = max(fpStroke(y - height * 0.20, 0.08),
                      max(fpStroke(y - height * 0.84, 0.07), fpStroke(y - height * 0.965, 0.12)));
  plaster = fpLayer(plaster, cornice, trim, 0.58);
  plaster = fpLayer(plaster, fpStroke(y - height * 0.976, 0.024), reveal, 0.28);
  return fpLayer(plaster, top, trim, 0.08);
}

${legacyNd169Compile591(progressive)}
${includeF063?F063_RECOVERY_GLSL272:''}
${includeF061?F061_NAVE_GLSL833+F061_COURT_GLSL829+F061_RECOVERY_GLSL279:''}
${includeF269?F269_RECOVERY_GLSL284:''}
vec3 paintedFacade(vec3 base, vec3 p, vec3 normal, vec4 frame, float family) {
${SUPPLEMENT_BATCH1_DISPATCH}
${HC70_DISPATCH}
  // New admission family IDs are categorical integers; smooth GPU interpolation can perturb them.
${includeF269?'  if(abs(family-1648.)<.25)return f269Recovery284(base,vec3(frame.x,p.y,frame.y),normal,frame,family);':''}
${includeF061?'  if(abs(family-1647.)<.25){if(frame.w>=8330.&&frame.w<8340.)return f061Nave833(base,vec3(frame.x,p.y,frame.y),normal,frame,family);if(frame.w>8290.)return f061Court829(base,vec3(frame.x,p.y,frame.y),normal,frame.w);return f061Tower279(base,vec3(frame.x,p.y,frame.y),normal,frame,family);}':''}
${includeF063?'  if(abs(family-1646.)<.25)return f063RecoveredDispatch272(base,vec3(frame.x,p.y,frame.y),normal,frame,family);':''}
${progressive.includes('vec3 frozenHannover533(')?'  if(family==364.||family==365.||family==366.||family==367.||family==427.||family==428.)return '+dispatchName+'(base,p,normal,frame,floor(family+.5));':''}
  if (family>=1000.0) return ${dispatchName}(base,p,normal,frame,floor(family+0.5));
  if (family==-98.0 || abs(family)<0.5) return base;
  if (((family>=120.0 && family<=149.0)||(family>=150.0 && family<170.0)||family==171.0||(family>=180.0&&family<=211.0)||(family>=220.0&&family<=233.0)) && frame.z>0.0 && frame.w>0.0) return fpLayoutFacade(base,p,normal,frame,family);
  if (family>=110.0 && family<=112.0 && frame.z>0.0 && frame.w>0.0) return fpLayoutFacade(base,p,normal,frame,family);
  if (abs(normal.y) > 0.35) {
    vec3 roofBase=(family==108.||family==109.)?mix(base,vec3(.42,.61,.53),.90):base;
    return fpRoofPaint(roofBase, p);
  }

  if (frame.z <= 0.0 || frame.w <= 0.0 || abs(family)<0.5) return base;
  float footprint = max(length(fwidth(frame.xy)), 0.0001);
  float detail = 1.0 - smoothstep(0.65, 1.8, footprint);
  if (detail < 0.005) return base;
  if (family<0.0) return mix(base,fpSurfaceOnly(base,frame.xy,-family),detail);
  if (family>=100.0) return mix(base,fpLayoutFacade(base,p,normal,frame,family),detail);
  float width = max(frame.w, 0.5);
  float height = max(frame.z, 0.5);
  float u = mod(frame.x, width);
  float y = clamp(frame.y, 0.0, height);
  float style = floor(family + 0.5);
  vec3 color = base;

  if (style == 1.0) {
    color = fpBrickFacade(base, u, y, width, height, 0.0);
  } else if (style == 2.0) {
    float namedVariant = fract(family) > 0.1 ? 1.0 : 0.0;
    color = fpClassicalFacade(base, u, y, width, height, namedVariant);
  } else if (style == 3.0) {
    color = fpGothicFacade(base, u, y, width, height);
  } else if (style == 4.0) {
    color = fpBaroqueFacade(base, u, y, width, height);
  } else if (style == 5.0) {
    color = fpHalfTimberFacade(base, u, y, width, height);
  } else if (style == 6.0) {
    color = fpBrickFacade(base, u, y, width, height, 1.0);
  } else if (style == 7.0) {
    color = fpGlassFacade(base, u, y, width, height, 1.0);
  } else if (style == 8.0) {
    vec3 brickBase = fpBrickFacade(base, u, y, width, height, 1.0);
    vec3 glassTop = fpGlassFacade(base, u, y, width, height, 0.76);
    float glassRise = smoothstep(0.32, 0.39, y / height);
    color = mix(brickBase, glassTop, glassRise);
    float transition = fpStroke(y - height * 0.355, 0.08);
    color = fpLayer(color, transition, vec3(0.56, 0.53, 0.47), 0.34);
  } else {
    // Family 9 is also the deterministic fallback for unknown architecture.
    color = fpOrdinaryFacade(base, u, y, width, height);
  }

  float orientation = clamp(dot(normal.xz, vec2(-0.38, 0.52)), -1.0, 1.0);
  float wash = sin(dot(p, vec3(0.071, 0.113, 0.089))) *
               sin(dot(p, vec3(0.037, -0.053, 0.061)));
  color *= 0.985 + orientation * 0.025 + wash * 0.008;
  return mix(base, color, detail);
}
`;

export const FACADE_PAINT_FRAGMENT_GLSL = makeFacadePaintFragment(PROGRESSIVE_FEATURE_GLSL,'progressiveFeatureDispatch',true,true,true);
export function paintProgramPartitionEnabled(city:string){return (city==='hannover'&&String(F340_PROGRAM_SOURCE_SHA)===PROGRESSIVE_FEATURE_SHA)||(city==='hamburg'&&HAMBURG_PROGRAM_SOURCE_SHA===PROGRESSIVE_FEATURE_SHA)||(city==='berlin'&&String(BERLIN_PROGRAM_SOURCE_SHA)===PROGRESSIVE_FEATURE_SHA);}
const shared577Enabled=()=>typeof location!=='undefined'&&location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).get('diagnostics')==='1'&&new URLSearchParams(location.search).get('review303')==='44';
export function paintProgramKey(family:number,city='hamburg'){if(HC70_FAMILIES.has(Math.round(family)))return 'supplement-hc70';if(SUPPLEMENT_BATCH1_FAMILIES.has(Math.round(family)))return 'supplement-batch1';if(city==='hannover')return HANNOVER_FAMILIES822[String(family)]??'base';if(city==='hamburg'&&shared577Enabled()){const shared=sharedPartition577(HAMBURG_PROGRAM_GLSL,family);if(shared)return shared.key;}if(city==='hamburg'&&Math.abs(family-1647)<.25)return 'F061-recovery279';if(city==='hamburg'&&Math.abs(family-1646)<.25)return 'F063-recovery272';return (city==='berlin'?BERLIN_PROGRAM_FAMILIES:HAMBURG_PROGRAM_FAMILIES)[String(family)]??'base';}
const partitionFragments=new Map<string,string>();
export function paintProgramFragment(key:string,city='hamburg'){
 if(key==='supplement-batch1'||key==='supplement-hc70')return makeFacadePaintFragment('vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}','progressiveFeatureDispatchCity');
 const cacheKey=city+':'+key;
 if(city==='hannover'&&String(F340_PROGRAM_SOURCE_SHA)===PROGRESSIVE_FEATURE_SHA){const source=HANNOVER_PROGRAMS822[key];if(source===undefined)throw Error('Unknown finite Hannover partition');let value=partitionFragments.get(cacheKey);if(value===undefined){value=makeFacadePaintFragment(source,'progressiveFeatureDispatchCity');partitionFragments.set(cacheKey,value);}return value;}
 if(city==='hamburg'&&key==='F061-recovery279'){let own=partitionFragments.get(cacheKey);if(own===undefined){own=makeFacadePaintFragment('vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}','progressiveFeatureDispatchCity',false,true);partitionFragments.set(cacheKey,own);}return own;}
 if(city==='hamburg'&&key==='F063-recovery272'){let own=partitionFragments.get(cacheKey);if(own===undefined){own=makeFacadePaintFragment('vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}','progressiveFeatureDispatchCity',true);partitionFragments.set(cacheKey,own);}return own;}
 const shared=city==='hamburg'&&shared577Enabled()&&key.startsWith('shared577-')?sharedPartition577(HAMBURG_PROGRAM_GLSL,Number(key.slice(10))):undefined;
 let source=shared?.source??(city==='berlin'?BERLIN_PROGRAM_GLSL:HAMBURG_PROGRAM_GLSL)[key];if(source===undefined)throw Error('Unknown paint program partition');if(city==='hamburg'&&shared577Enabled()){source=maritimePartition586(source,key)??source;source=chilehausRect608(source,key)??source;source=f4054Reachable672(source,key)??source;}
 let value=partitionFragments.get(cacheKey);if(value===undefined){value=makeFacadePaintFragment(source,'progressiveFeatureDispatchCity');partitionFragments.set(cacheKey,value);}return value;
}
const cityPaintFragments=new Map<string,string>();
export function facadePaintFragmentForCity(city:string):string {
 const extra=PROGRESSIVE_CITY_SOURCE_FULL_SHA===PROGRESSIVE_FEATURE_SHA?PROGRESSIVE_CITY_EXTRA_GLSL[city]:undefined;
 if(extra===undefined)return FACADE_PAINT_FRAGMENT_GLSL;
 let fragment=cityPaintFragments.get(city);
 if(fragment===undefined){fragment=makeFacadePaintFragment(PROGRESSIVE_CITY_BASELINE_GLSL+extra,'progressiveFeatureDispatchCity',city==='hamburg',city==='hamburg',city==='bremen');cityPaintFragments.set(city,fragment);}
 return fragment;
}

export function facadePaintSpecializationForCity(city:string){
 const specialized=PROGRESSIVE_CITY_SOURCE_FULL_SHA===PROGRESSIVE_FEATURE_SHA&&PROGRESSIVE_CITY_EXTRA_GLSL[city]!==undefined;
 return {city,specialized,sourceSHA256:PROGRESSIVE_FEATURE_SHA,generatedSourceSHA256:PROGRESSIVE_CITY_SOURCE_FULL_SHA,fragmentBytes:new TextEncoder().encode(facadePaintFragmentForCity(city)).byteLength,fullFragmentBytes:new TextEncoder().encode(FACADE_PAINT_FRAGMENT_GLSL).byteLength,baselinePreservedVerbatim:specialized};
}
