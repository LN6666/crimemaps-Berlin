import {setTimeout as delay} from 'node:timers/promises';

// WebCrypto and transport callbacks can complete after many idle event-loop turns.
// Observe the requested resource state with the same four-second guard as the
// ingress fixtures' operation deadline. A missing event still fails its check.
export async function waitForResourceState(predicate, label, timeoutMs = 4000) {
  const deadline = performance.now() + timeoutMs;
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error('Timed out waiting for ' + label);
    await delay(2);
  }
}
