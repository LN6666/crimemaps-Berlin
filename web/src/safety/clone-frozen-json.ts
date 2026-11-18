/** Clone a verified JSON.parse result into private mutable containers. Scalars
 * are immutable and need no serialization round trip. This is deliberately
 * narrower than structuredClone; do not pass runtime objects or typed buffers.
 * The depth bound matches the payload admission walk preceding this copy. */
export function cloneFrozenJSON(value:unknown):unknown{
 function copy(value:unknown,depth:number):unknown{
  if(depth>40)throw Error('Building payload nesting exceeds bound');
  if(value===null||typeof value==='string'||typeof value==='number'||typeof value==='boolean')return value;
  if(typeof value!=='object'||Object.getPrototypeOf(value)!==(Array.isArray(value)?Array.prototype:Object.prototype))throw TypeError('Frozen clone requires parsed JSON');
  if(Array.isArray(value)){
   if(depth===40&&value.length)throw Error('Building payload nesting exceeds bound');
   // slice keeps packed numeric arrays packed, rather than boxing every number
   // through a polymorphic mapping callback. Only child containers need work.
   const result=value.slice();
   for(let i=0;i<value.length;i++){
    const item=value[i];
    if(item!==null&&typeof item==='object')result[i]=copy(item,depth+1);
    else if(item!==null&&typeof item!=='string'&&typeof item!=='number'&&typeof item!=='boolean')throw TypeError('Frozen clone requires parsed JSON');
   }
   return result;
  }
  const result:Record<string,unknown>={};
  for(const key of Object.keys(value)){
   const item=copy((value as Record<string,unknown>)[key],depth+1);
   if(key==='__proto__')Object.defineProperty(result,key,{value:item,writable:true,enumerable:true,configurable:true});
   else result[key]=item;
  }
  return result;
 }
 return copy(value,0);
}
