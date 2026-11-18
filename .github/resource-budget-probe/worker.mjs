import {appendFileSync} from 'node:fs';
import {isMainThread} from 'node:worker_threads';
import {setInterval} from 'node:timers';

if (isMainThread && process.env.NODE_TEST_CONTEXT && process.argv[1]?.endsWith('.test.mjs')) {
  const file = process.env.CRIMEMAPS_PROBE_PROCESS_LOG;
  const started = process.hrtime.bigint();
  function record(phase) {
    const row = {phase, pid: process.pid, utc: new Date().toISOString(),
      elapsedMs: Number((process.hrtime.bigint() - started) / 1000000n),
      cpuMicroseconds: process.cpuUsage(), rssBytes: process.memoryUsage.rss(),
      activeResources: process.getActiveResourcesInfo()};
    appendFileSync(file, JSON.stringify(row) + '\n');
  }
  record('started');
  setInterval(() => record('heartbeat'), 4000).unref();
  process.once('exit', () => record('exit'));
}
