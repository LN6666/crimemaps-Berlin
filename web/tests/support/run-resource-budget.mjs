import {spawnSync} from 'node:child_process';
import {parseArgs} from 'node:util';

const {values, positionals: files} = parseArgs({
  allowPositionals: true,
  options: {
    part: {type: 'string', default: '1/1'},
    jobs: {type: 'string', default: '1'},
    timings: {type: 'boolean', default: false}
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
const child = spawnSync(process.execPath, [...options, ...selected], {stdio: 'inherit'});
if (child.error) throw child.error;
if (child.signal) process.kill(process.pid, child.signal);
else process.exitCode = child.status;
