/** The owner supplies a key binding one immutable selected detail resource. */
export type BuildingDetailResourceIdentity = {readonly key: string};
import type {ChunkResourceLease,ChunkResourceRole} from './render-runtime/chunk-resource-types';
export type BuildingDetailLease<T> = {readonly value: T; retain?(role?: ChunkResourceRole): BuildingDetailLease<T>; retainResource?(role?: ChunkResourceRole): ChunkResourceLease<unknown>; release(): void};
export type BuildingDetailResidencyStatus = 'idle' | 'loading' | 'ready' | 'suspended' | 'error' | 'destroyed';
export type BuildingDetailPublishContext = {readonly signal: AbortSignal; readonly requestId: number};
export type BuildingDetailPublisher<R, T> = (value: T | undefined, resource: R | undefined, context: BuildingDetailPublishContext) => Promise<void>;

/** Owns only the selected lease and its replacement request, never decoded-data caches.
 * publish resolves only at the consumer's actual drawable publication fence.
 * Rejection/abort means the consumer did not commit or has rolled back to its
 * previous publication. This helper cannot perform a renderer/GL rollback.
 */
export function createBuildingDetailResidency<R extends BuildingDetailResourceIdentity, T>(options: {
  acquire(resource: R, options: {signal: AbortSignal}): Promise<BuildingDetailLease<T>>;
  publish: BuildingDetailPublisher<R, T>;
}) {
  type Resident = {resource: R; value: T; release(): void};
  type Pending = {resource: R | undefined; kind: 'select' | 'clear'; controller: AbortController; promise: Promise<void>};
  let requested: R | undefined, resident: Resident | undefined, pending: Pending | undefined;
  let revision = 0, suspended = false, destroyed = false;
  let status: BuildingDetailResidencyStatus = 'idle';

  function cancelPending() {
    revision++;
    const old = pending; pending = undefined;
    old?.controller.abort();
  }
  function clearResident(nextStatus: BuildingDetailResidencyStatus): Promise<void> {
    if (pending?.kind === 'clear' && status === nextStatus) return pending.promise;
    cancelPending(); status = nextStatus;
    const old = resident;
    if (!old) return Promise.resolve();
    const controller = new AbortController(), requestId = revision;
    const operation = (async () => {
      await options.publish(undefined, undefined, {signal: controller.signal, requestId});
      if (controller.signal.aborted || revision !== requestId) return;
      resident = undefined; old.release(); status = nextStatus;
    })().catch(error => {
      if (controller.signal.aborted || revision !== requestId) return;
      if (!suspended && !destroyed) status = 'error';
      throw error;
    }).finally(() => { if (pending?.controller === controller) pending = undefined; });
    pending = {resource: undefined, kind: 'clear', controller, promise: operation};
    return operation;
  }
  function select(resource: R | undefined, settings: {releaseBeforeAcquire?:boolean} = {}): Promise<void> {
    if (destroyed) return Promise.resolve();
    requested = resource;
    if (suspended) return Promise.resolve();
    if (!resource) return clearResident('idle');
    if (settings.releaseBeforeAcquire && resident && resident.resource.key !== resource.key) {
      // Core-window exits must not retain their fine geometry while the next
      // area's data is acquired. Clear at the actual publication fence first.
      const cleared = clearResident('loading'), ticket = revision;
      return cleared.then(() => {
        if (destroyed || suspended || ticket !== revision || requested?.key !== resource.key) return;
        return select(resource);
      });
    }
    if (pending?.kind === 'select' && pending.resource?.key === resource.key) return pending.promise;
    cancelPending();
    if (resident?.resource.key === resource.key) { status = 'ready'; return Promise.resolve(); }
    status = 'loading';
    const controller = new AbortController(), ticket = revision;
    const operation = (async () => {
      const lease = await options.acquire(resource, {signal: controller.signal});
      let released = false;
      const release = () => { if (!released) { released = true; lease.release(); } };
      if (destroyed || suspended || controller.signal.aborted || ticket !== revision) { release(); return; }
      try { await options.publish(lease.value, resource, {signal: controller.signal, requestId: ticket}); }
      catch (error) { release(); throw error; }
      if (destroyed || suspended || controller.signal.aborted || ticket !== revision) { release(); return; }
      const old = resident;
      resident = {resource, value: lease.value, release};
      status = 'ready';
      old?.release();
    })().catch(error => {
      if (destroyed || suspended || controller.signal.aborted || ticket !== revision) return;
      status = 'error'; throw error;
    }).finally(() => { if (pending?.controller === controller) pending = undefined; });
    pending = {resource, kind: 'select', controller, promise: operation};
    return operation;
  }
  return {
    select,
    suspend(): Promise<void> {
      if (destroyed) return Promise.resolve();
      suspended = true;
      // A consumer that rejects clearing still owns its publication and lease.
      return clearResident('suspended');
    },
    resume(): Promise<void> {
      if (destroyed || !suspended) return Promise.resolve();
      suspended = false;
      return select(requested);
    },
    get state() { return {status, requested, published: resident?.resource}; },
    destroy(): Promise<void> {
      destroyed = true; requested = undefined;
      return clearResident('destroyed');
    },
  };
}
