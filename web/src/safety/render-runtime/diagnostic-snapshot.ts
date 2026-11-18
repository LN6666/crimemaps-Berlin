type DiagnosticProject=()=>unknown;
let activeSnapshot:Map<DiagnosticProject,unknown>|undefined;

/** Reuse read-only projections during one synchronous diagnostic read. Nested
 * scopes share the outer snapshot; it is released on return or throw. Never
 * wrap production mutations or asynchronous work in a diagnostic scope. */
export function withRenderDiagnosticSnapshot<T>(read:()=>T):T{
 const previous=activeSnapshot;
 activeSnapshot=previous??new Map();
 try{return read();}finally{activeSnapshot=previous;}
}

/** Use a stable per-owner projection function. Outside an explicit diagnostic
 * scope every read computes a fresh value, including later tasks and frames. */
export function readRenderDiagnosticSnapshot<T>(project:()=>T):T{
 const snapshot=activeSnapshot;
 if(!snapshot)return project();
 if(snapshot.has(project))return snapshot.get(project) as T;
 const value=project();snapshot.set(project,value);return value;
}
