import {createSharedNativeSourcePool} from './shared-native-source';
import {planarReflectionGroup} from './planar-reflection-group';
import type {installThreeDimensionalMap as CityInstaller} from '../painted/city/safety/three-dimensional-map';
import type {PaintProvider} from './paint-ownership';
import {paintOwner} from './paint-ownership';
import assetRegistry from './paint-asset-registry.json';
import {beginFrozenPaintTableInitialization,frozenPaintTableStats} from './frozen-paint-tables';

type Options = Parameters<typeof CityInstaller>[0];
type Actual = ReturnType<typeof CityInstaller>;
type Engine = NonNullable<Actual['renderer']>;

/** One public lifecycle and camera owner; frozen painting implementations keep
 * their own source verification and shader contexts. Ownership is applied before
 * packing, so each native/display component appears in exactly one GPU layer.
 * Transport is shared and bounded across all implementations.
 */
export function installThreeDimensionalMap(options: Options): Actual {
  const providerOrder: PaintProvider[] = ['root500', 'delegated500', 'tier300', 'church', 'city', ...(['frankfurt','stuttgart','essen'].includes(options.city)?['infill' as const]:[]), ...(options.city==='bremen'?['bremen' as const]:[])];
  const managers = new Map<PaintProvider, Actual>();
  const renderers = new Map<PaintProvider, Engine>();
  let hidden = document.hidden, reduced = false, opacityContext: 'normal' | 'route-selection' = 'normal';
  let destroyed = false, wanted: '2d' | '3d' = '2d', request = new AbortController();
  let initializing: Promise<void> | undefined, initializationSignal:AbortSignal|undefined, lastError: string | undefined;
  let active = 0, peak = 0, reads = 0;
  let transition=0,preparing=0,cachedBytes=0;
  const states=new Map<PaintProvider,{mode:'2d'|'3d';status:'ready'|'loading'|'partial'|'outside'|'overview'|'error'}>();
  const byteCache=new Map<string,Uint8Array>();
  const queue: (() => void)[] = [];
  type Pending={promise:Promise<Uint8Array>;controller:AbortController;subscribers:number;settled:boolean};
  const inflight = new Map<string, Pending>();
  const abort = () => new DOMException('Aborted', 'AbortError');
  const pump=()=>{while(active<2&&queue.length)queue.shift()!();};
  const clearBytes=()=>{byteCache.clear();cachedBytes=0;};
  function aggregateState(){
    const values=[...states.values()],mode=managers.get('city')?.mode??'2d';
    const status=values.some(s=>s.status==='error')?'error':values.some(s=>s.status==='loading')?'loading':values.some(s=>s.status==='partial')?'partial':values.length&&values.every(s=>s.status==='outside')?'outside':values.length&&values.every(s=>s.status==='overview')?'overview':'ready';
    return {mode,status} as {mode:'2d'|'3d';status:'ready'|'loading'|'partial'|'outside'|'overview'|'error'};
  }

  function fetchBytes(path: string, signal: AbortSignal, max: number): Promise<Uint8Array> {
    signal.throwIfAborted();
    const key = `${max}|${path}`;
    const cached=byteCache.get(key);if(cached){byteCache.delete(key);byteCache.set(key,cached);return Promise.resolve(cached);}
    let pending = inflight.get(key);
    if(pending?.controller.signal.aborted)pending=undefined;
    if (!pending) {
      const entry:Pending={promise:undefined as unknown as Promise<Uint8Array>,controller:new AbortController(),subscribers:0,settled:false};
      entry.promise = new Promise<Uint8Array>((resolve, reject) => {
        const run = () => {
          if (destroyed||entry.controller.signal.aborted) { reject(abort()); return; }
          active++; peak = Math.max(peak, active); reads++;
          // A cancellation aborts the bytes only after the last subscriber leaves.
          Promise.resolve().then(()=>options.fetchBytes(path, entry.controller.signal, max)).then(bytes=>{
            if(!entry.controller.signal.aborted&&bytes.byteLength<=1024**2){byteCache.set(key,bytes);cachedBytes+=bytes.byteLength;while(cachedBytes>12*1024**2){const first=byteCache.keys().next().value!;cachedBytes-=byteCache.get(first)!.byteLength;byteCache.delete(first);}}
            resolve(bytes);
          }, reject).finally(() => {
            active--; pump();
          });
        };
        if (active < 2) run(); else queue.push(run);
      });
      pending=entry;inflight.set(key, entry);
      void entry.promise.finally(() => {entry.settled=true;if(inflight.get(key)===entry)inflight.delete(key);}).catch(()=>{});
    }
    const entry=pending;entry.subscribers++;
    return new Promise((resolve, reject) => {
      let done=false;
      const cleanup = () => {if(done)return false;done=true;signal.removeEventListener('abort', canceled);entry.subscribers--;if(!entry.subscribers&&!entry.settled)entry.controller.abort();return true;};
      const canceled = () => {if(cleanup())reject(abort());};
      signal.addEventListener('abort', canceled, {once: true});
      if (signal.aborted) { canceled(); return; }
      entry.promise.then(bytes=>{if(cleanup())resolve(bytes);},error=>{if(cleanup())reject(error);});
    });
  }
  const nativeSources=createSharedNativeSourcePool({read:fetchBytes});
  const lifetime = new AbortController();
  let frozenInitialization:ReturnType<typeof beginFrozenPaintTableInitialization>|undefined;
  const startFrozenInitialization=(signal:AbortSignal)=>frozenInitialization=beginFrozenPaintTableInitialization(fetchBytes,signal,providerOrder,error=>{if(!destroyed&&!signal.aborted&&!(error instanceof DOMException&&error.name==='AbortError')){lastError=String(error);options.onState?.({mode:managers.get('city')?.mode??'2d',status:'error'});}});

  const reflectionGroup=planarReflectionGroup(()=>providerOrder.map(provider=>renderers.get(provider)));
  const renderer = new Proxy({} as Engine, {
    get(_target, property) {
      const engines = providerOrder.map(p => renderers.get(p)).filter((r): r is Engine => !!r);
      if(property==='getPlanarReflectionRevision')return reflectionGroup.getPlanarReflectionRevision;
      if(property==='renderPlanarReflection')return reflectionGroup.renderPlanarReflection;
      if (property === 'layer') return renderers.get('city')?.layer ?? engines[0]?.layer;
      if (property === 'stats') {
        const stats = engines.map(r => r.stats);
        const first = renderers.get('city')?.stats ?? stats[0];
        return {...first, components: stats.reduce((n, s) => n + (s.components ?? 0), 0), vertices: stats.reduce((n, s) => n + (s.vertices ?? 0), 0), paintProviders: Object.fromEntries([...renderers].map(([p,r])=>[p,r.stats]))};
      }
      if (property === 'nativeGroupDisplay') return renderers.get('city')?.nativeGroupDisplay;
      if (property === 'selected') return engines.map(r=>r.selected).find(Boolean);
      if (property === 'isPickReady') return () => (wanted !== '3d' || providerOrder.every(p => managers.get(p)?.wantedMode === '3d' && managers.get(p)?.mode === '3d' && renderers.has(p))) && engines.length > 0 && engines.every(r => r.isPickReady());
      if (property === 'diagnosticScreenSamples') return (...args: unknown[]) => engines.flatMap(r => (r.diagnosticScreenSamples as Function)(...args));
      if (property === 'readPaintGPUDiagnostic') return (identities:unknown[]) => Object.fromEntries([...renderers].map(([provider,r])=>[provider,typeof (r as any).readPaintGPUDiagnostic==='function'?Array.from({length:Math.ceil(identities.length/8)},(_,i)=>(r as any).readPaintGPUDiagnostic(identities.slice(i*8,i*8+8))):undefined]));
      if (property === 'getRevision') return () => ({generation: Math.max(0,...engines.map(r=>r.getRevision().generation)),viewRevision: Math.max(0,...engines.map(r=>r.getRevision().viewRevision))});
      if (property === 'pick') return (...args: unknown[]) => engines.map(r => (r.pick as Function)(...args)).filter(Boolean).sort((a,b)=>(a.distance ?? Infinity)-(b.distance ?? Infinity))[0];
      if (typeof property === 'string' && /^(set|clear|suspend|resume|reset)/.test(property)) return (...args: unknown[]) => { for (const r of engines) {const fn=(r as any)[property];if(typeof fn==='function')fn.apply(r,args);} };
      if (typeof property === 'string' && /^(getComponent|getSourceComponent|getSurfaceComponent|getSolarShadowAdmission|isDerived|readPaintGPU)/.test(property)) return (...args: unknown[]) => {
        const identity=args[0] as Parameters<Engine['getSourceComponent']>[0];
        for (const p of providerOrder) {
          const r=renderers.get(p);if(!r)continue;
          const component=r.getSourceComponent(identity)??r.getSurfaceComponent(identity);
          if(component&&paintOwner(component)===p){const fn=(r as any)[property];return typeof fn==='function'?fn.apply(r,args):undefined;}
        }
        return undefined;
      };
      const value = ((renderers.get('city') as any)?.[property]!==undefined ? renderers.get('city') : engines.find(r=>(r as any)[property]!==undefined)) as any;
      return typeof value?.[property] === 'function' ? value[property].bind(value) : value?.[property];
    }
  });

  function ensure(signal:AbortSignal=lifetime.signal) {
    signal.throwIfAborted();if(managers.size)return Promise.resolve();
    if(initializing&&!initializationSignal?.aborted)return initializing;
    const next=(async () => {
      const tableSession=frozenInitialization?.active?frozenInitialization:startFrozenInitialization(signal);
      let modules;try {signal.throwIfAborted();
      const imports = await tableSession.wait(Promise.allSettled([
        import('../painted/root500/safety/three-dimensional-map'),
        import('../painted/delegated500/safety/three-dimensional-map'),
        import('../painted/tier300/safety/three-dimensional-map'),
        import('../painted/church/safety/three-dimensional-map'),
        import('../painted/city/safety/three-dimensional-map'),
        ...(['frankfurt','stuttgart','essen'].includes(options.city)?[import('../painted/infill/safety/three-dimensional-map')]:[]),
        ...(options.city==='bremen'?[import('../painted/bremen/safety/three-dimensional-map')]:[]),
        // Resolve the corresponding renderer module initializers in the same
        // lease. Their later public dynamic imports reuse these exact modules.
        import('../painted/root500/safety/building-mesh-renderer'),
        import('../painted/delegated500/safety/building-mesh-renderer'),
        import('../painted/tier300/safety/building-mesh-renderer'),
        import('../painted/church/safety/building-mesh-renderer'),
        import('../painted/city/safety/building-mesh-renderer'),
        ...(['frankfurt','stuttgart','essen'].includes(options.city)?[import('../painted/infill/safety/building-mesh-renderer')]:[]),
        ...(options.city==='bremen'?[import('../painted/bremen/safety/building-mesh-renderer')]:[]),
      ]));
      const failed=imports.find((r):r is PromiseRejectedResult=>r.status==='rejected');if(failed)throw failed.reason;
      modules=imports.slice(0,providerOrder.length).map(r=>(r as PromiseFulfilledResult<any>).value);
      } catch(error) {tableSession.close();throw error;}
      if (destroyed||signal.aborted) throw abort();
      modules.forEach((module, index) => {
        const provider = providerOrder[index];
        const assets=(assetRegistry as Record<string,Record<string,string>>)[provider]??{};
        const manager = module.installThreeDimensionalMap({...options, nativeSources:nativeSources.client(options.city,path=>assets[path]??path), fetchBytes:(path:string,signal:AbortSignal,max:number)=>fetchBytes(assets[path]??path,signal,max), manageCamera: provider === 'city',
          awaitPaintInitialization: <T>(operation:Promise<T>)=>{const session=frozenInitialization;if(!session?.active)throw abort();return session.wait(operation);},
          onState: (state: any) => {states.set(provider,state);if(!preparing)options.onState?.(aggregateState());},
          onNativeGroupDisplay: provider === 'city' ? options.onNativeGroupDisplay : undefined,
          onRenderer: (r: any) => {renderers.set(provider,r);r.setPageHidden(hidden);r.setReducedMotion(reduced);r.setOpacityContext(opacityContext);options.onRenderer?.(renderer);},
        } as any) as Actual;
        managers.set(provider,manager);
      });
    })();
    initializing=next;initializationSignal=signal;
    void next.catch(()=>{if(initializing===next)initializing=undefined;});
    return next;
  }

  async function requestMode(next: '2d' | '3d', external: AbortSignal) {
    external.throwIfAborted(); if (destroyed) throw abort();
    wanted=next;request.abort();let own=request=new AbortController();
    const ticket=++transition;preparing=ticket;
    const cancel=()=>own.abort();external.addEventListener('abort',cancel,{once:true});
    try {
      if(next==='3d')startFrozenInitialization(own.signal);else frozenInitialization?.close();
      if (!managers.size && next==='2d') {const state={mode:next,status:'ready' as const};options.onState?.(state);return state;}
      await ensure(own.signal);own.signal.throwIfAborted();
      // Finish the single camera movement before supplemental managers prepare.
      const state=await managers.get('city')!.requestMode(next,own.signal);
      own.signal.throwIfAborted();
      for(const p of providerOrder)if(p!=='city')await managers.get(p)!.requestMode(next,own.signal);
      own.signal.throwIfAborted();lastError=undefined;if(next==='2d')clearBytes();const result=aggregateState();options.onState?.(result);return result;
    } catch(error) {if(location.hostname==='127.0.0.1')console.warn('supplement-3d-transition',String(error),error instanceof Error?error.stack:'');if(!own.signal.aborted){lastError=String(error);own.abort();clearBytes();const rollback=own=request=new AbortController();await Promise.allSettled([...managers.values()].map(m=>m.requestMode('2d',rollback.signal)));if(ticket===transition&&!destroyed&&!rollback.signal.aborted)options.onState?.({mode:'2d',status:'error'});}throw error;}
    finally {external.removeEventListener('abort',cancel);if(preparing===ticket)preparing=0;}
  }
  return {
    requestMode,
    getOwnerReconstructionBinding(identity) {for(const p of providerOrder){const value=managers.get(p)?.getOwnerReconstructionBinding?.(identity);if(value)return value;}},
    getSourceBinding(identity) {for(const p of providerOrder){const m=managers.get(p),component=m?.renderer?.getSourceComponent(identity);if(component&&paintOwner(component)===p){const value=m?.getSourceBinding?.(identity);if(value)return value;}}},
    async readAsset(asset,signal,max){await ensure(signal);return managers.get('city')!.readAsset(asset,signal,max);},
    setPageHidden(value){hidden=value;managers.forEach(m=>m.setPageHidden(value));},
    setReducedMotion(value){reduced=value;managers.forEach(m=>m.setReducedMotion(value));},
    setOpacityContext(value){opacityContext=value;managers.forEach(m=>m.setOpacityContext(value));},
    get mode(){return managers.get('city')?.mode??'2d';},get wantedMode(){return wanted;},
    get renderer(){return renderers.size?renderer:undefined;},get sourceMetadata(){return managers.get('city')?.sourceMetadata;},
    get paintLayers(){return [...renderers.values()].map(r=>r.layer);},
    getRevision:()=>renderer.getRevision(),
    cacheStats:()=>{
      // Collect each provider once: its full diagnostic getter also projects
      // resident screen samples and must not run for every aggregate field.
      const snapshots=new Map([...managers].map(([provider,manager])=>[provider,manager.cacheStats()]));
      const city=snapshots.get('city');
      const stats=providerOrder.flatMap(provider=>{const value=snapshots.get(provider)?.renderer;return value?[value]:[];});
      const first=city?.renderer??stats[0];
      const combined=renderers.size?{...first,components:stats.reduce((n,value)=>n+(value.components??0),0),vertices:stats.reduce((n,value)=>n+(value.vertices??0),0),paintProviders:Object.fromEntries(providerOrder.flatMap(provider=>{const value=snapshots.get(provider)?.renderer;return value?[[provider,value]]:[];}))}:undefined;
      return {...city,modeTransitionPending:preparing!==0,lastError,ownerReconstruction:{notNative:true as const,geometryAdded:[...snapshots.values()].reduce((sum,value)=>sum+(value.ownerReconstruction?.geometryAdded??0),0),components:[...snapshots.values()].flatMap(value=>value.ownerReconstruction?.components??[])},paintProviders:Object.fromEntries(snapshots),frozenTableInputs:frozenPaintTableStats(),sharedNativeSources:nativeSources.stats,sharedTransport:{active,peakConcurrency:peak,reads,queued:queue.length,cachedBytes,cachedAssets:byteCache.size},renderer:combined,rendererScreenSamples:providerOrder.flatMap(provider=>snapshots.get(provider)?.rendererScreenSamples??[]),revision:renderer.getRevision(),selected:renderers.size?renderer.selected:undefined};
    },
    suspend(){request.abort();frozenInitialization?.close();managers.forEach(m=>m.suspend());},
    resume(){if(destroyed)return;const incomplete=wanted==='3d'&&providerOrder.some(p=>managers.get(p)?.wantedMode!=='3d');if(wanted==='3d'&&managers.size){request.abort();request=new AbortController();startFrozenInitialization(request.signal);}managers.forEach(m=>m.resume());if(incomplete)void requestMode('3d',new AbortController().signal).catch(()=>{});},
    destroy(){if(destroyed)return;destroyed=true;request.abort();nativeSources.destroy();frozenInitialization?.close();lifetime.abort();inflight.forEach(p=>p.controller.abort());managers.forEach(m=>m.destroy());inflight.clear();clearBytes();pump();},
  } as Actual;
}
