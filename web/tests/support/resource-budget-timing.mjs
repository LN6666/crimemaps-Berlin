import {appendFileSync, writeSync} from 'node:fs';
import {basename} from 'node:path';
import {isMainThread} from 'node:worker_threads';

// The parent also receives --import. Measure the isolated file process only.
if (isMainThread && process.env.NODE_TEST_CONTEXT && process.argv[1]?.endsWith('.test.mjs')) {
  const file = basename(process.argv[1]);
  const started = process.hrtime.bigint();
  const summary = process.env.GITHUB_STEP_SUMMARY;
  function report(phase, result = {}) {
    const row = {file, phase, utc: new Date().toISOString(), ...result};
    const line = JSON.stringify(row);
    writeSync(2, 'RESOURCE_BUDGET_FILE ' + line + '\n');
    if (summary) appendFileSync(summary, '- `' + line + '`\n');
  }
  report('start');
  process.once('exit', exitCode => {
    const elapsedMs = Number((process.hrtime.bigint() - started) / 1000000n);
    const {maxRSS} = process.resourceUsage();
    report('exit', {elapsedMs, peakRssKiB: maxRSS, exitCode});
  });
}
