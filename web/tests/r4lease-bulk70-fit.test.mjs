import test from 'node:test';
import assert from 'node:assert/strict';
import {leaseRuntime,MiB,NORMALIZE_EXPANSION,CLONE_HOLD_EXPANSION} from './support/core-frozen-fixtures.mjs';

// Stage 3 round 4 (S1-lease; DECISIONS 2026-11-02 22:19, R3A-1 option (b)).
// Frankfurt infill-frankfurt-low-office-bulk70-data under the 704 MiB desktop
// ledger, from the calibrate-40x measurements (results/calibration.json and
// bulk70-normal-*.log): real raw d 48,529,632 B, real gzip P 4,421,743 B; the
// schema-matched proxy d 48,572,018 B, P 6,262,967 B; the settled value
// estimate E 102,625,806 B (estimateRetainedPayloadBytes of the proxy, the
// figure DECISIONS uses). Pure arithmetic over the lease store's own constants
// and the real ledger default; no table is read. One binding at a time (a
// second live private clone does not fit, see the last case). The margin is thin and is
// verified by the cm-er9 Frankfurt infill z17 reading.
const api=await leaseRuntime();
const E=102625806;
const tables={real:{d:48529632,P:4421743},proxy:{d:48572018,P:6262967}};
/** One acquisition's phases as the lease store admits them (byte transport). */
function phases({d,P}){
 const S=CLONE_HOLD_EXPANSION*d+2*E;
 return{
  read:256+d+NORMALIZE_EXPANSION*d+2*P,
  // Re-read after a refused settle: the read beside the settle headroom.
  retry:256+d+NORMALIZE_EXPANSION*d+2*P+Math.max(0,S-NORMALIZE_EXPANSION*d-d-P),
  settle:256+S,
  clone:2*E+CLONE_HOLD_EXPANSION*d,
  oldClone:2*E+NORMALIZE_EXPANSION*d,
 };
}

test('the constants: normalize stays 13 d through the read, the clone hold keeps 10 d',()=>{
 assert.equal(NORMALIZE_EXPANSION,13);assert.equal(CLONE_HOLD_EXPANSION,10);
});

test('bulk70 fits the historical explicit 704 MiB desktop ledger in its read, settle and clone phases (and a re-read with its settle)',t=>{
 const limit=api.createResourceBudget({limitBytes:704*MiB}).stats.limitBytes;
 assert.equal(limit,704*MiB);
 const real=phases(tables.real);
 // DECISIONS 2026-11-02 22:19: the clone at 10 d is 690,547,932 B; at 13 d it was 836,136,828 B, 97,939,324 B over.
 assert.equal(real.clone,690547932);assert.equal(real.oldClone,836136828);assert.equal(real.oldClone-limit,97939324);
 for(const [name,table]of Object.entries(tables)){
  const p=phases(table);
  for(const phase of ['read','retry','settle','clone'])assert(p[phase]<=limit,`${name} ${phase} ${p[phase]} fits ${limit}`);
  assert(p.oldClone>limit,`${name}: the 13 d clone hold did not fit (R3A-1)`);
 }
 // Recorded for the cm-er9 reading: the largest phase (the proxy's re-read,
 // 697,235,015 B) and its ledger margin (40,962,489 B).
 const worst=Math.max(...Object.values(tables).flatMap(table=>{const p=phases(table);return[p.read,p.retry,p.settle,p.clone];}));
 assert.equal(worst,697235015);
 t.diagnostic('bulk70 largest phase '+worst+' B, ledger margin '+(limit-worst)+' B');
});

test('bulk70: the fit above is for one binding at a time; a second private clone beside a live first one does not fit (R4S1-4)',t=>{
 // A second map binding bulk70 while the first map still holds its private
 // clone needs the shared value, both clones and the held normalize, 3E + 10d.
 // The lease store reports not fitting only when one clone cannot fit an empty
 // page (2E + 10d), so that binding waits on the ledger for the first map's
 // clone to be released (r4lease-clone-fairness: it waits subscribed and
 // completes once released). Whether Frankfurt ever holds two maps' bulk70
 // bindings at once (a city-switch overlap) is the owner's call (report CDR).
 const limit=api.createResourceBudget({limitBytes:704*MiB}).stats.limitBytes;
 for(const [name,{d}]of Object.entries(tables)){
  const one=2*E+CLONE_HOLD_EXPANSION*d,two=3*E+CLONE_HOLD_EXPANSION*d;
  assert(one<=limit,`${name}: one binding's clone ${one} fits`);
  assert(two>limit,`${name}: two live private clones ${two} do not fit ${limit}`);
 }
 assert.equal(3*E+CLONE_HOLD_EXPANSION*tables.real.d,793173738);
 t.diagnostic('bulk70 two live private clones need '+(3*E+CLONE_HOLD_EXPANSION*tables.real.d)+' B, '+(3*E+CLONE_HOLD_EXPANSION*tables.real.d-limit)+' B over the ledger');
});
