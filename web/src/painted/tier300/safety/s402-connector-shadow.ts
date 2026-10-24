import {TIER300_ZEUGHAUS_CAP_GLSL} from './tier300-selected-repairs';
import {SOURCE_SHADOW_VERTEX_GLSL,SOURCE_SHADOW_FRAGMENT_GLSL} from './source-shadow';
import {S036_ROOF009_MASK_GLSL,s036Roof009PickDiscard} from './s036-north-coface-display';
import {S402_CONNECTOR_MASK_GLSL,s402ConnectorPickDiscard} from './s402-connector-display';
/** Existing shadow draw, original index/position buffers, original growth and opacity.
 * Roles are produced only by the strict S402 resident guard. No other role is affected. */
export const S402_SHADOW_VERTEX_GLSL=SOURCE_SHADOW_VERTEX_GLSL
 .replace('in vec3 a_position;','in highp vec2 a_s402_frame;in highp float a_s402_alpha;out highp vec2 v_s402_frame;flat out highp float v_s402_role;in vec3 a_position;')
 .replace('void main(){','void main(){v_s402_frame=a_s402_frame;v_s402_role=floor(a_s402_alpha/4.);')
 .replace('in vec3 a_position;','in highp vec3 a_zhc_frame;in highp float a_zhc_family;out highp vec3 v_zhc_frame;flat out highp float v_zhc_family;in vec3 a_position;')
 .replace('void main(){','void main(){v_zhc_frame=a_zhc_frame;v_zhc_family=floor(a_zhc_family+.5);');
// Preserve the original fragment's mediump color/growth path for every other source.
const highpMask=(S402_CONNECTOR_MASK_GLSL+'\n'+S036_ROOF009_MASK_GLSL).replaceAll('vec2 q','highp vec2 q').replaceAll('{vec2 a','{highp vec2 a').replaceAll('vec2 d=','highp vec2 d=').replaceAll('float t=','highp float t=');
const S402_BASE_SHADOW_FRAGMENT_GLSL=SOURCE_SHADOW_FRAGMENT_GLSL
 .replace('void main(){',`in highp vec2 v_s402_frame;flat in highp float v_s402_role;uniform highp float u_s402_paint_mode;\n${highpMask}\nvoid main(){if(u_s402_paint_mode>1.5&&((v_s402_role>3.5&&v_s402_role<4.5)||(v_s402_role>4.5&&v_s402_role<5.5&&s402ConnectorRoof(v_s402_frame))||(v_s402_role>5.5&&v_s402_role<6.5&&s036Roof009(v_s402_frame))))discard;`);
/** Test oracle is the same canonical surface/pick predicate, not another polygon copy. */
export const s402ShadowFragmentDiscard=(mode:number,alpha:number,frame:readonly number[])=>s402ConnectorPickDiscard(mode,alpha,frame)||s036Roof009PickDiscard(mode,alpha,frame);

/** Same bounded source courtyard opening as the color pass; never a whole-parent shadow hold. */
export const S402_SHADOW_FRAGMENT_GLSL=S402_BASE_SHADOW_FRAGMENT_GLSL.replace('void main(){',`in highp vec3 v_zhc_frame;flat in highp float v_zhc_family;\n${TIER300_ZEUGHAUS_CAP_GLSL}\nvoid main(){if(u_s402_paint_mode>1.5&&abs(v_zhc_family-21203.)<.25&&tier300ZeughausCap(v_zhc_frame))discard;`);
