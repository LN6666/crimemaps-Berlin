import {canPackResidentNormals,packResidentNormals,packedNormalAttribute} from './resident-normal-packing';
import {residentFirstVertexExtension,rotateResidentTriangleIndices,markResidentFirstVertexBuffer,bindResidentIndexConvention,residentIndexConventionKey} from './resident-index-convention';
import {getRenderResourceContextId} from './program-preparation';
import {bindChunkResourceContext,getChunkResourceStoreForContext,getPageChunkResourceStore} from './chunk-resource-store';
import type {ChunkPublication,ChunkReadyBorrowRole,ChunkResourceLease,ChunkResourceRole,ChunkResourceStore,ChunkScene,ChunkSceneReadySnapshot,ChunkSceneRequest,ChunkSceneSnapshot} from './chunk-resource-types';

/** GPU storage for the existing building layouts. Call upload from the existing
 * preparation scheduler; this owner creates no queue and retains no CPU arrays. */
export type ResidentGeometryAttribute = {
  name: string;
  size: 1 | 2 | 3 | 4;
  stride?: number;
  offset?: number;
  required?: boolean;
};

export type ResidentGeometryBuffer = {
  key: string;
  attributes: readonly ResidentGeometryAttribute[];
} & ({data: Float32Array; dynamic?: boolean; buffer?: never} | {buffer: WebGLBuffer; data?: never; dynamic?: never});

export type ResidentGeometryPlan = {
  revision: number;
  /** Exact source/LOD/cohort, packing/layout/frame and material identity. */
  contentKey?: string;
  epoch?: number;
  /** Borrowed GPU buffers require a live geometry parent. CPU parents may also
   * be retained for source/picking/recovery by the same resource store. */
  parents?: readonly ChunkResourceLease<unknown>[];
  current?: () => boolean;
  /** CPU indices remain authoritative for ranges/picking; an optional parent
   * index buffer supplies only the GPU element binding. */
  indexBuffer?: WebGLBuffer;
  indices: Uint32Array;
  buffers: readonly ResidentGeometryBuffer[];
};

export type UploadedResidentGeometry = {
  revision: number;
  vao: WebGLVertexArrayObject;
  indexBuffer: WebGLBuffer;
  buffers: ReadonlyMap<string, WebGLBuffer>;
  packedNormalBuffers?: ReadonlySet<WebGLBuffer>;
};

type OwnedGeometry = UploadedResidentGeometry & {
  context: WebGL2RenderingContext;
  epoch: number;
  ownedBuffers: readonly WebGLBuffer[];
  ownedBufferBytes: number;
  borrowedBuffers: number;
};

export type ResidentGeometryLease=ChunkResourceLease<UploadedResidentGeometry>;
export type ResidentGeometryPublication=Partial<Omit<ChunkSceneRequest,'wanted'>>;

let geometryOwnerSequence=0;
let defaultNormalCompression=false;
const contextNormalCompression=new WeakMap<WebGL2RenderingContext,boolean>();
/** Set once before scene construction; local comparison reloads use the original layout. */
export function configureResidentNormalCompression(value:boolean){defaultNormalCompression=value;}

export function createResidentGeometryOwner(options:{store?:ChunkResourceStore;owner?:string;compressNormals?:boolean;firstVertexTriangles?:boolean}={}) {
  const compressNormals=options.compressNormals??defaultNormalCompression;
  const legacyOwner=++geometryOwnerSequence,owner=options.owner??'resident-geometry:'+legacyOwner;
  let store=options.store,scene:ChunkScene<UploadedResidentGeometry>|undefined;
  let lastContext:WebGL2RenderingContext|undefined,lastEpoch:number|undefined;
  let contextId: number | null = null,createdBuffers=0,deleteBufferRequests=0,createdVertexArrays=0,deleteVertexArrayRequests=0;

  function resources(gl?:WebGL2RenderingContext) {
    // get...ForContext binds the page default when not already bound. Bind an
    // explicitly supplied store first so it remains the context's sole store.
    if(gl&&store)bindChunkResourceContext(gl,store);
    store??=gl?getChunkResourceStoreForContext(gl):getPageChunkResourceStore();
    scene??=store.createScene<UploadedResidentGeometry>(owner);
    return store;
  }

  function liveValues():readonly UploadedResidentGeometry[] {
    const leases=scene?.leases??[];
    if(leases.some(lease=>!lease.value))return[];
    return leases.map(lease=>lease.value!);
  }

  function deleteVertexArray(gl:WebGL2RenderingContext,vao:WebGLVertexArrayObject) {
    deleteVertexArrayRequests++;gl.deleteVertexArray(vao);
  }
  function deleteBuffer(gl:WebGL2RenderingContext,buffer:WebGLBuffer) {
    deleteBufferRequests++;gl.deleteBuffer(buffer);
  }
  function destroyGeometry(value:OwnedGeometry) {
    const gl=value.context;
    const valid=()=>!gl.isContextLost()&&store?.contextEpoch(gl)===value.epoch;
    if(valid())deleteVertexArray(gl,value.vao);
    for(const buffer of value.ownedBuffers)if(valid())deleteBuffer(gl,buffer);
  }
  // This callback is owner-scoped, not allocation-scoped: a cached allocation's
  // disposal never closes over its construction plan or source typed arrays.
  const disposeGeometry=(value:UploadedResidentGeometry)=>destroyGeometry(value as OwnedGeometry);

  function release() {
    const previous=scene;scene=undefined;previous?.destroy();
  }

  function buildGeometry(gl:WebGL2RenderingContext,program:WebGLProgram,plan:ResidentGeometryPlan,epoch:number,packed:ReadonlySet<string>):OwnedGeometry {
      const current = () => {
        if(gl.isContextLost()||store!.contextEpoch(gl)!==epoch)throw new Error('Geometry upload context lost');
        if (plan.current && !plan.current()) throw new DOMException('Geometry preparation superseded', 'AbortError');
      };
      current();
      const priorError = gl.getError();
      if (gl.isContextLost()) throw new Error('Geometry upload context lost before allocation');
      if (priorError !== gl.NO_ERROR) throw new Error('Geometry upload blocked by pre-existing WebGL error 0x' + priorError.toString(16));
      const previousVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      const previousArray = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
      const allocated: WebGLBuffer[] = [];
      const buffers = new Map<string, WebGLBuffer>();
      const borrowed = new Set<WebGLBuffer>();
      const packedNormalBuffers=new Set<WebGLBuffer>();
      for(const parent of plan.parents??[])for(const buffer of (parent.value as UploadedResidentGeometry|undefined)?.packedNormalBuffers??[])packedNormalBuffers.add(buffer);
      let ownedBufferBytes = plan.indexBuffer?0:plan.indices.byteLength;
      let vao: WebGLVertexArrayObject | undefined;
      let candidate: OwnedGeometry | undefined;
      let failed=false;
      const allocate = () => {
        current();
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error('Geometry buffer allocation failed');
        createdBuffers++;
        allocated.push(buffer);
        return buffer;
      };
      try {
        vao = gl.createVertexArray() ?? undefined;
        if (!vao) throw new Error('Geometry vertex array allocation failed');
        createdVertexArrays++;
        current();
        gl.bindVertexArray(vao);
        const indexBuffer = plan.indexBuffer??allocate();
        if(plan.indexBuffer)borrowed.add(indexBuffer);
        current();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        if(!plan.indexBuffer){
          current();const extension=options.firstVertexTriangles?residentFirstVertexExtension(gl):null;
          if(extension){
            const scratch=store!.budget.reserve({category:'construction',bytes:plan.indices.byteLength,precision:'exact',label:'cyclic triangle index upload scratch'});
            try{const rotated=rotateResidentTriangleIndices(plan.indices);current();gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,rotated,gl.STATIC_DRAW);markResidentFirstVertexBuffer(gl,indexBuffer,extension);}
            finally{scratch.release();}
          }else gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, plan.indices, gl.STATIC_DRAW);
        }
        bindResidentIndexConvention(gl,vao,indexBuffer);
        for (const spec of plan.buffers) {
          current();
          if (buffers.has(spec.key)) throw new Error('Duplicate geometry buffer key: ' + spec.key);
          const buffer = spec.buffer ?? allocate();
          buffers.set(spec.key, buffer);
          current();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          if (spec.data) {
            current();
            if(packed.has(spec.key)){
              const bytes=spec.data.length/9*32;
              const scratch=store!.budget.reserve({category:'construction',bytes,precision:'exact',label:'normal packing upload scratch'});
              try{const compact=packResidentNormals(spec.data);gl.bufferData(gl.ARRAY_BUFFER,compact,gl.STATIC_DRAW);}
              finally{scratch.release();}
              packedNormalBuffers.add(buffer);ownedBufferBytes+=bytes;
            }else{gl.bufferData(gl.ARRAY_BUFFER, spec.data, spec.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);ownedBufferBytes += spec.data.byteLength;}
          } else {
            borrowed.add(buffer);
          }
          for (const attribute of spec.attributes) {
            current();
            const location = gl.getAttribLocation(program, attribute.name);
            if (location < 0) {
              if (attribute.required !== false) throw new Error('Missing geometry attribute: ' + attribute.name);
              continue;
            }
            current();
            gl.enableVertexAttribArray(location);
            current();
            if(packedNormalBuffers.has(buffer)){
              const layout=packedNormalAttribute(attribute);
              gl.vertexAttribPointer(location,attribute.size,layout.short?gl.SHORT:gl.FLOAT,layout.short,layout.stride,layout.offset);
            }else gl.vertexAttribPointer(location, attribute.size, gl.FLOAT, false, attribute.stride ?? 0, attribute.offset ?? 0);
          }
        }
        current();
        const uploadError = gl.getError();
        if (gl.isContextLost()) throw new Error('Geometry upload context lost before publication');
        if (uploadError !== gl.NO_ERROR) throw new Error('Geometry upload failed with WebGL error 0x' + uploadError.toString(16));
        current();
        candidate = {context: gl,epoch,revision: plan.revision, vao, indexBuffer, buffers, packedNormalBuffers:new Set([...packedNormalBuffers].filter(buffer=>[...buffers.values()].includes(buffer))), ownedBuffers: allocated, ownedBufferBytes, borrowedBuffers: borrowed.size};
      } catch(error) {
        failed=true;throw error;
      } finally {
        const valid=()=>!gl.isContextLost()&&store!.contextEpoch(gl)===epoch;
        let cleanupError:unknown;
        const attempt=(work:()=>void)=>{if(valid())try{work();}catch(error){cleanupError??=error===undefined?new Error('Geometry cleanup failed'):error;}};
        attempt(()=>gl.bindVertexArray(previousVao));
        attempt(()=>gl.bindBuffer(gl.ARRAY_BUFFER,previousArray));
        if(!candidate||cleanupError!==undefined){
          candidate=undefined;
          if(vao)attempt(()=>deleteVertexArray(gl,vao!));
          for(const buffer of allocated)attempt(()=>deleteBuffer(gl,buffer));
        }
        if(!failed&&cleanupError!==undefined)throw cleanupError;
      }
      return candidate!;
  }

  function allocate(gl:WebGL2RenderingContext,program:WebGLProgram,plan:ResidentGeometryPlan):ResidentGeometryLease {
    const mode=contextNormalCompression.get(gl);
    if(mode!==undefined&&mode!==compressNormals)throw Error('Geometry compression comparison requires a fresh context');
    contextNormalCompression.set(gl,compressNormals);
    const target=resources(gl),epoch=target.contextEpoch(gl);
    if(gl.isContextLost()||plan.epoch!==undefined&&plan.epoch!==epoch)throw new DOMException('Geometry context epoch is obsolete','AbortError');
    if(plan.current&&!plan.current())throw new DOMException('Geometry preparation superseded','AbortError');
    if(plan.contentKey!==undefined&&!plan.contentKey)throw new Error('Geometry content key is empty');
    const baseContentKey=plan.contentKey??'legacy-geometry:'+legacyOwner+':'+plan.revision;
    const convention=plan.indexBuffer?residentIndexConventionKey(gl,plan.indexBuffer):options.firstVertexTriangles&&residentFirstVertexExtension(gl)?'first-cyclic-v1':'last';
    const contentKey=convention==='last'?baseContentKey:JSON.stringify([baseContentKey,convention]),parents=[...new Set(plan.parents??[])];
    const parentGeometry=(lease:ChunkResourceLease<unknown>)=>{
      if(lease.released||lease.state!=='ready'||lease.context!==gl||lease.epoch!==epoch)return undefined;
      const value=lease.value;if(!value||typeof value!=='object'||!('vao'in value)||!('indexBuffer'in value)||!('buffers'in value))return undefined;
      const geometry=value as UploadedResidentGeometry;
      return typeof geometry.buffers?.values==='function'?geometry:undefined;
    };
    if(plan.indexBuffer&&!parents.some(lease=>parentGeometry(lease)?.indexBuffer===plan.indexBuffer))throw new Error('Borrowed geometry index buffer requires a live parent geometry lease');
    const packed=new Set<string>();
    const keys=new Set<string>();let bytes=plan.indexBuffer?0:plan.indices.byteLength;
    for(const spec of plan.buffers){
      const bufferKey=spec.key;
      if(keys.has(spec.key))throw new Error('Duplicate geometry buffer key: '+spec.key);keys.add(spec.key);
      if(spec.data){if(compressNormals&&canPackResidentNormals(spec.data,spec.attributes,spec.dynamic)){packed.add(spec.key);bytes+=spec.data.length/9*32;}else bytes+=spec.data.byteLength;continue;}
      const borrowedBuffer=spec.buffer;
      if(!borrowedBuffer)throw new Error('Geometry buffer has neither owned data nor a borrowed handle: '+bufferKey);
      const parent=parents.find(lease=>{
        const geometry=parentGeometry(lease);if(!geometry)return false;
        return geometry.indexBuffer===borrowedBuffer||[...geometry.buffers.values()].includes(borrowedBuffer);
      });
      if(!parent)throw new Error('Borrowed geometry buffer requires a live parent geometry lease: '+spec.key);
    }
    contextId=getRenderResourceContextId(gl);lastContext=gl;lastEpoch=epoch;
    const allocationIdentity={};
    const lease=target.acquireGpu<UploadedResidentGeometry>({
      contentKey,context:gl,epoch,role:'candidate',parents,allowRecent:plan.contentKey!==undefined,
      // The GPU entry owns this derived key independently of any parent CPU
      // identity. Its logical text charge follows the same recent/fence life.
      estimate:[{category:'gpu-buffer',bytes,precision:'exact',identity:allocationIdentity,label:owner},
        {category:'metadata',bytes:contentKey.length*2,precision:'estimate',identity:{},label:'resident geometry identity UTF16 logical payload'}],
      create(production){production.signal.throwIfAborted();return buildGeometry(gl,program,plan,epoch,packed);},
      dispose:disposeGeometry,
    });
    try{if(plan.current&&!plan.current())throw new DOMException('Geometry preparation superseded','AbortError');return lease;}
    catch(error){lease.release();throw error;}
  }

  function reconcile(request:ChunkSceneRequest):ChunkPublication<UploadedResidentGeometry> {
    const target=resources(request.context);
    if(request.context&&request.epoch!==undefined&&request.epoch!==target.contextEpoch(request.context))throw new DOMException('Geometry publication epoch is obsolete','AbortError');
    return scene!.reconcile(request);
  }

  function publish(leases:readonly ResidentGeometryLease[],request:ResidentGeometryPublication={}):boolean {
    const context=request.context??leases[0]?.context??lastContext,target=resources(context),epoch=request.epoch??leases[0]?.epoch??(context?target.contextEpoch(context):undefined);
    const wanted=leases.map(lease=>lease.contentKey);
    if(new Set(wanted).size!==wanted.length)throw new Error('Duplicate geometry publication content key');
    if(leases.some(lease=>lease.released||!lease.value||lease.context!==context||lease.epoch!==epoch))return false;
    const transaction=reconcile({...request,generation:request.generation??scene!.generation+1,wanted,context,epoch});
    try{for(const lease of leases)if(!transaction.get(lease.contentKey))transaction.add(lease);const published=transaction.publish();if(!published)transaction.cancel();return published;}
    catch(error){transaction.cancel();throw error;}
  }

  return {
    /** Legacy callers have one allocation; multi-chunk callers use the scene. */
    get current():UploadedResidentGeometry|undefined {const leases=scene?.leases??[];return leases.length===1?leases[0].value:undefined;},
    get currentLease():ResidentGeometryLease|undefined {const leases=scene?.leases??[];return leases.length===1&&leases[0].value?leases[0]:undefined;},
    get currentLeases():readonly ResidentGeometryLease[] {return scene?.leases??[];},
    get currentGeometries():readonly UploadedResidentGeometry[] {return liveValues();},
    get scene():ChunkScene<UploadedResidentGeometry> {resources();return scene!;},
    get store():ChunkResourceStore {return resources();},
    capture(role:Extract<ChunkResourceRole,'main'|'solar'|'reflection'|'picking'|'selected'>):ChunkSceneSnapshot<UploadedResidentGeometry> {resources();return scene!.capture(role);},
    captureReady(role:ChunkReadyBorrowRole):ChunkSceneReadySnapshot<UploadedResidentGeometry> {resources();return scene!.captureReady(role);},
    allocate,reconcile,publish,release,
    contextLost(gl=lastContext,epoch?:number) {
      if(!gl)return;
      const observedEpoch=epoch??(gl===lastContext?lastEpoch:scene?.leases.find(lease=>lease.context===gl)?.epoch);
      if(observedEpoch===undefined)return;
      resources(gl).invalidateContext(gl,observedEpoch);
      if(scene?.leases.some(lease=>lease.context===gl&&lease.epoch===observedEpoch))release();
    },
    // Payload bytes are logical bufferData storage. Deletion/role release does
    // not claim immediate driver or native physical reclamation.
    get stats() {
      const values=liveValues() as readonly OwnedGeometry[],single=values.length===1?values[0]:undefined;
      return {
        revision:single?.revision??null,publishedGeneration:scene?.generation??null,chunks:values.length,
        ownedBufferBytes:values.reduce((sum,value)=>sum+value.ownedBufferBytes,0),
        ownedBuffers:values.reduce((sum,value)=>sum+value.ownedBuffers.length,0),
        packedNormalBuffers:values.reduce((sum,value)=>sum+(value.packedNormalBuffers?.size??0),0),
        borrowedBuffers:values.reduce((sum,value)=>sum+value.borrowedBuffers,0),
        contextId,contextIdScope:'last-upload-context' as const,
        lifetimeScope:'geometry-owner-lifetime-across-contexts' as const,
        createdBuffers,deleteBufferRequests,createdVertexArrays,deleteVertexArrayRequests,
        releaseScope:'logical-role-release-with-store-retirement' as const,
        resourceStore:store?.stats,
        unmeasured:['vertex-array-driver-storage','buffer-driver-overhead','browser-native-overhead'] as const,
      };
    },
    upload(gl:WebGL2RenderingContext,program:WebGLProgram,plan:ResidentGeometryPlan):UploadedResidentGeometry {
      const lease=allocate(gl,program,plan);
      try{
        const value=lease.value;if(!value)throw new Error('Geometry allocation is not ready');
        if(!publish([lease],{generation:plan.revision,current:plan.current,context:gl,epoch:lease.epoch}))throw new DOMException('Geometry publication superseded','AbortError');
        return value;
      }finally{lease.release();}
    },
  };
}
