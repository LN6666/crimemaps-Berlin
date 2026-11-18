// Native Node test-runner events. Preserve the last named test even if its callback never completes.
export default async function* report(source) {
  for await (const {type, data} of source) {
    if (!['test:dequeue', 'test:start', 'test:pass', 'test:fail'].includes(type)) continue;
    const error = data.details?.error;
    yield JSON.stringify({utc: new Date().toISOString(), type, file: data.file, name: data.name,
      line: data.line, nesting: data.nesting, durationMs: data.details?.duration_ms,
      error: error && {message: error.message, cause: error.cause?.message, code: error.code}}) + '\n';
  }
}
