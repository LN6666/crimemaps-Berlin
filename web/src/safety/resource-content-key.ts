/** Runtime-only content identity. Serialized parent keys are opaque strings:
 * delimit their UTF16 payload instead of JSON-escaping them at every layer.
 * Arrays retain their order and shape; non-string metadata leaves keep their
 * existing JSON semantics. No digest, global interning or authority is omitted.
 */
export function resourceContentKey(namespace:string,...parts:readonly unknown[]):string{
 const active=new Set<readonly unknown[]>();
 function encode(value:unknown):string{
  if(typeof value==='string')return's'+value.length+':'+value;
  if(Array.isArray(value)){
   if(active.has(value))throw new TypeError('Cyclic resource content identity');
   active.add(value);let key='a'+value.length+':';
   try{for(const part of value)key+=encode(part);return key;}finally{active.delete(value);}
  }
  const json=JSON.stringify(value)??'null';return'j'+json.length+':'+json;
 }
 return'resource-content-key:v1:'+encode([namespace,...parts]);
}
