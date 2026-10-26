/** Shared visible-surface/solar-shadow mask. Keep the accepted F384 thresholds
 * unchanged; packed source and owner geometry and provenance remain intact. */
export const F384_VISIBLE_CLIP_GLSL="if(semanticFamily==4282.&&abs(v_paint_frame.w-736.)<.1&&v_local_position.y>=31.99)discard;if(abs(v_paint_frame.w-732.)<.1&&v_paint_frame.x>30.7&&v_paint_frame.x<43.4&&v_paint_frame.y> -28.3&&v_paint_frame.y< -13.0&&v_local_position.y<7.51)discard;";
