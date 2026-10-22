export function signature(c:unknown):string;
export function project(p:readonly number[],origin:readonly number[],reference:readonly number[]):number[];
export function inverse(e:number,n:number,origin:readonly number[]):number[];
export function metric(q:readonly number[],origin:readonly number[]):number[];
export function tangent(q:readonly number[],origin:readonly number[]):number[];
export function jacobian(p:readonly number[],origin:readonly number[],reference:readonly number[]):number[][];
export function normal(n:readonly number[],j:readonly (readonly number[])[]):number[];
