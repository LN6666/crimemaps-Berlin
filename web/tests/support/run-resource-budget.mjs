import {spawn, spawnSync} from 'node:child_process';
import {appendFileSync, closeSync, fstatSync, mkdirSync, openSync, readSync} from 'node:fs';
import {basename, join, resolve} from 'node:path';
import {parseArgs} from 'node:util';

const {values, positionals: files} = parseArgs({
  allowPositionals: true,
  options: {
    part: {type: 'string', default: '1/1'},
    jobs: {type: 'string', default: '1'},
    timings: {type: 'boolean', default: false},
    'output-dir': {type: 'string'},
    'file-timeout': {type: 'string'},
    'long-file-timeout': {type: 'string'},
    'long-file': {type: 'string', multiple: true, default: []}
  }
});

const match = /^(\d+)\/(\d+)$/.exec(values.part);
const part = Number(match?.[1]), total = Number(match?.[2]);
if (!Number.isSafeInteger(part) || !Number.isSafeInteger(total) || part < 1 || part > total || total > files.length) {
  throw Error('Expected --part=index/total with one or more test files in each part');
}
if (!/^[1-9]\d*$/.test(values.jobs) || !Number.isSafeInteger(Number(values.jobs))) {
  throw Error('Expected a positive integer for --jobs');
}
if (new Set(files).size !== files.length || !files.every(file => file.endsWith('.test.mjs'))) {
  throw Error('Expected distinct test files from the resource-budget npm script');
}

// Node runs declared files in sorted order. Each file still gets its own Node
// test process and --expose-gc, both for complete runs and individual parts.
const ordered = files.toSorted();
const start = Math.floor(ordered.length * (part - 1) / total);
const end = Math.floor(ordered.length * part / total);
const selected = ordered.slice(start, end);
console.log('Resource budget part %s: %d/%d files, %s worker(s)', values.part, selected.length, files.length, values.jobs);
const options = ['--expose-gc', '--test', '--test-concurrency=' + values.jobs];
if (values.timings) options.push('--import', new URL('./resource-budget-timing.mjs', import.meta.url).href);
const longFiles = new Set(values['long-file']);
const timeoutMs = seconds => {
  if (seconds === undefined) return 0;
  const ms = Number(seconds) * 1000;
  if (!/^[1-9]\d*$/.test(seconds) || !Number.isSafeInteger(ms) || ms > 2147483647) {
    throw Error('Expected a positive file timeout in seconds');
  }
  return ms;
};
const normalMs = timeoutMs(values['file-timeout']);
const longMs = timeoutMs(values['long-file-timeout']);
if ([...longFiles].some(file => !files.includes(file)) || (longFiles.size > 0) !== (longMs > 0) ||
    (longMs && longMs < normalMs)) {
  throw Error('Expected registered long files with a matching long-file timeout');
}

if (values['output-dir'] === undefined) {
  if (normalMs || longMs) throw Error('A file timeout requires --output-dir to preserve its evidence');
  // Keep the standard local npm command and any caller-supplied reporters intact.
  const child = spawnSync(process.execPath, [...options, ...selected], {stdio: 'inherit'});
  if (child.error) throw child.error;
  if (child.signal) process.kill(process.pid, child.signal);
  else process.exitCode = child.status;
} else {
  await runLoggedFiles(resolve(values['output-dir']));
}

function summaryOfFailure(path) {
  // A bundled-source stack frame can occupy several MiB on a single line.
  // The artifact keeps it verbatim; GitHub receives at most one short test title.
  const fd = openSync(path, 'r');
  try {
    const size = fstatSync(fd).size;
    const buffer = Buffer.alloc(16 * 1024);
    for (const offset of new Set([0, Math.max(0, size - buffer.length)])) {
      const count = readSync(fd, buffer, 0, buffer.length, offset);
      const line = buffer.toString('utf8', 0, count).match(/^not ok [^\r\n]{1,180}/m)?.[0];
      if (line) return line.replace(/data:[^ ]*|[\x00-\x1f\x7f]/g, '…');
    }
  } finally {
    closeSync(fd);
  }
}

async function runLoggedFiles(directory) {
  mkdirSync(directory, {recursive: true});
  const journal = join(directory, 'part-' + part + '-of-' + total + '.jsonl');
  const fd = openSync(journal, 'wx');
  closeSync(fd);
  const active = new Set();
  let next = 0, failures = 0, interrupted;
  const handlers = new Map(['SIGINT', 'SIGTERM'].map(signal => [signal, () => {
    interrupted ??= signal;
    for (const stop of active) stop(signal);
  }]));
  const record = event => appendFileSync(journal, JSON.stringify({...event, utc: new Date().toISOString()}) + '\n');
  for (const [signal, handler] of handlers) process.on(signal, handler);

  async function runFile(index) {
    const file = selected[index];
    const stem = String(start + index + 1).padStart(3, '0') + '-' + basename(file, '.test.mjs');
    const log = stem + '.tap', path = join(directory, log);
    const limitMs = longFiles.has(file) ? longMs : normalMs;
    const wall = process.hrtime.bigint();
    record({phase:'start', file, log, limitMs});
    console.log('START %s', file);
    const output = openSync(path, 'wx');
    let child;
    try {
      // A real output file keeps the complete TAP and avoids routing stack
      // payloads through the GitHub runner's stdout pipe.
      child = spawn(process.execPath, [...options, '--test-reporter=tap', file], {
        detached: process.platform !== 'win32', stdio: ['ignore', output, output]
      });
    } finally {
      closeSync(output);
    }
    const signalTree = signal => {
      if (!child.pid) return false;
      try {
        if (process.platform === 'win32') return child.kill(signal);
        return process.kill(-child.pid, signal);
      } catch (error) {
        if (error.code === 'ESRCH') return false;
        throw error;
      }
    };
    let termination, finishGrace, graceTimer, timedOut = false, spawnError;
    function stop(signal) {
      if (termination || !signalTree(signal)) return;
      termination = new Promise(resolveGrace => { finishGrace = resolveGrace; });
      graceTimer = setTimeout(() => { signalTree('SIGKILL'); finishGrace(); }, 2000);
    }
    active.add(stop);
    const watchdog = limitMs ? setTimeout(() => { timedOut = true; stop('SIGTERM'); }, limitMs) : undefined;
    let code, signal;
    try {
      child.once('error', error => { spawnError = error.message; });
      [code, signal] = await new Promise(done => child.once('close', (...args) => done(args)));
      // Closing the immediate Node process need not close its worker/esbuild.
      if (termination && process.platform !== 'win32' && signalTree(0)) await termination;
    } finally {
      clearTimeout(watchdog);
      clearTimeout(graceTimer);
      active.delete(stop);
    }
    const elapsedMs = Number((process.hrtime.bigint() - wall) / 1000000n);
    const passed = !timedOut && !spawnError && !signal && code === 0;
    const outcome = timedOut ? 'timed-out' : passed ? 'passed' : 'failed';
    const title = passed ? undefined : summaryOfFailure(path);
    record({phase:'end', file, log, elapsedMs, outcome, exitCode:code, signal, spawnError, title});
    console.log('%s %s (%d ms%s)%s', outcome.toUpperCase(), file, elapsedMs,
      signal ? ', ' + signal : ', exit ' + code, title ? '  ' + title : '');
    if (!passed) failures++;
  }

  async function worker() {
    while (!interrupted && next < selected.length) {
      const index = next++;
      try {
        await runFile(index);
      } catch (error) {
        failures++;
        console.error('FAILED %s: %s', selected[index], String(error.message).slice(0, 240));
        try {
          record({phase:'infrastructure-error', file:selected[index], message:String(error.message).slice(0, 240)});
        } catch (writeError) {
          console.error('Could not record the file failure: %s', String(writeError.message).slice(0, 240));
        }
      }
    }
  }
  try {
    await Promise.all(Array.from({length: Math.min(Number(values.jobs), selected.length)}, worker));
    record({phase:'summary', part, total, selected:selected.length, started:next, failures, interrupted});
  } finally {
    for (const [signal, handler] of handlers) process.removeListener(signal, handler);
  }
  if (interrupted) process.kill(process.pid, interrupted);
  else if (failures || next !== selected.length) process.exitCode = 1;
}
