export type SubmittedProgramCompletion = {
  program?: WebGLProgram;
  linked: boolean;
  shaders: readonly WebGLShader[];
};

/** Completion only: failed compilation/linking is complete and is validated by
 * the caller. This neither deletes objects nor establishes physical reclamation. */
export function pollSubmittedProgramCompletion(
  context: WebGL2RenderingContext,
  submission: SubmittedProgramCompletion,
  parallel: {COMPLETION_STATUS_KHR: number} | null | undefined,
  valid?: () => boolean,
): boolean {
  const live = () => !context.isContextLost() && (!valid || valid());
  if (!live()) return true;

  if (submission.linked && submission.program) {
    if (parallel) {
      if (!live()) return true;
      const complete = Boolean(context.getProgramParameter(submission.program, parallel.COMPLETION_STATUS_KHR));
      if (!live()) return true;
      return complete;
    }
    // LINK_STATUS waits for completion; false is a completed link failure.
    if (!live()) return true;
    context.getProgramParameter(submission.program, context.LINK_STATUS);
    if (!live()) return true;
    return true;
  }

  let complete = true;
  for (const shader of submission.shaders) {
    if (!live()) return true;
    const status = context.getShaderParameter(shader, parallel ? parallel.COMPLETION_STATUS_KHR : context.COMPILE_STATUS);
    if (!live()) return true;
    if (parallel && !status) complete = false;
  }
  // Without KHR, each COMPILE_STATUS query has synchronously waited, including
  // shaders whose compilation failed. Empty submissions also have no work left.
  return complete;
}
