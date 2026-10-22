/** Render classification from explicit source tags + existing mesh bounds; never changes native geometry/tags. */
type SourceMesh={sourceFeature:{properties:Record<string,unknown>|null};batches:readonly {positions:ArrayLike<number>}[]};
const cache=new WeakMap<object,boolean>();
function number(v:unknown){if(typeof v==='number'&&Number.isFinite(v))return v;if(typeof v==='string'&&/^\d+(?:\.\d+)?$/.test(v.trim()))return Number(v);return undefined;}
export function isSourceOnlyGlassRoof(c:SourceMesh){const cached=cache.get(c);if(cached!==undefined)return cached;const p=c.sourceFeature.properties??{},height=number(p.height),minimum=number(p.min_height),roof=number(p['roof:height']);let yes=p['building:part']==='yes'&&p['building:material']==='glass'&&p['roof:material']==='glass'&&p['roof:shape']==='dome'&&height!==undefined&&minimum!==undefined&&roof!==undefined&&roof>0&&Math.abs(height-minimum-roof)<1e-6;
 if(yes){let min=Infinity,max=-Infinity;for(const b of c.batches)for(let i=1;i<b.positions.length;i+=3){min=Math.min(min,b.positions[i]);max=Math.max(max,b.positions[i]);}yes=Number.isFinite(min)&&Number.isFinite(max)&&Math.abs(min-minimum!)<=.011&&Math.abs(max-height!)<=.011;}
 cache.set(c,yes);return yes;
}
