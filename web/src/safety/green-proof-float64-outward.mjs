/** Adjacent IEEE754 binary64 values. No geometric tolerance. */
const bytes=new ArrayBuffer(8),bits=new DataView(bytes);
export function nextUp(value){if(Number.isNaN(value)||value===Infinity)return value;if(value===-Infinity)return -Number.MAX_VALUE;if(value===0)return Number.MIN_VALUE;bits.setFloat64(0,value,false);let n=bits.getBigUint64(0,false);n=value>0?n+1n:n-1n;bits.setBigUint64(0,n,false);return bits.getFloat64(0,false);}
export const nextDown=value=>-nextUp(-value);
