/** Reserve existing appearance vertices once; never raise the combined source/display limit. */
export function reichstagAppearanceVertexReservation(city:string):number{const q=new URLSearchParams(location.search);return city==='berlin'&&['127.0.0.1','localhost','::1'].includes(location.hostname)&&q.get('diagnostics')==='1'&&q.get('sample')==='berlin-reichstag'?29550:0;}
