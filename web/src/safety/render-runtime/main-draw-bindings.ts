type BindingScalar=string|number|boolean|null|undefined;
type BindingSource={readonly contentKey:string;readonly masks:{readonly residentRevision:string}};

export type MainDrawBindings={
 readonly state:string;
 readonly resources:readonly {readonly contentKey:string;readonly maskRevision:string}[];
};

/** A draw witness borrows immutable identity strings; it must not serialize
 * the complete resource authorities again on every animation frame. Keep only
 * primitive fields, so an old witness cannot retain a chunk or its GPU owner.
 */
export function captureMainDrawBindings(state:readonly BindingScalar[],resources:readonly BindingSource[]):MainDrawBindings{
 return{state:state.join('|'),resources:resources.map(resource=>({contentKey:resource.contentKey,maskRevision:resource.masks.residentRevision}))};
}

export function sameMainDrawBindings(previous:MainDrawBindings,current:MainDrawBindings):boolean{
 if(previous.state!==current.state||previous.resources.length!==current.resources.length)return false;
 for(let i=0;i<previous.resources.length;i++){
  const a=previous.resources[i],b=current.resources[i];
  if(a.contentKey!==b.contentKey||a.maskRevision!==b.maskRevision)return false;
 }
 return true;
}
