import {buildingFocusDensity,buildingFocusRegion,type BuildingFocusRect,type BuildingFocusWindow} from './building-focus-window';
import {modelProjectionAtOrigin,projectNativeModelBox,type ModelViewProjectionSnapshot} from './model-view-projection';
import type {BuildingDetailComponent} from './building-detail-demand';

/** A finite rectangle wholly outside every viewport: classified 'outside'. */
const BEHIND_CAMERA:BuildingFocusRect=Object.freeze({left:-2,top:-2,right:-1,bottom:-1});
/** Faces of a native box as corner indices (bit 0: x, bit 1: height, bit 2: z). */
const BOX_FACES:readonly (readonly number[])[]=[[0,2,6,4],[1,3,7,5],[0,1,5,4],[2,3,7,6],[0,1,3,2],[4,5,7,6]];
type ClipPoint=readonly [number,number,number,number];
/** CSS bounds of the part of a native box (full height sweep) that is inside
 * the view frustum, for a box whose corners cannot all be divided because it
 * crosses or lies behind the camera near plane. Its faces are clipped against
 * the near and the four side planes in clip space, so the result is exact and
 * lies inside the viewport. `null`: none of it is on screen. `undefined`: the
 * projection is unusable.
 *
 * With a pitched camera the near plane meets the ground far behind the view
 * centre; a box crossing it there is behind the lower screen edge, not around
 * the camera. Only a box that really reaches into the frustum is in view. */
function clippedBoxBounds(snapshot:ModelViewProjectionSnapshot,origin:readonly [number,number],box:ArrayLike<number>):BuildingFocusRect|null|undefined{
  const frame=modelProjectionAtOrigin(snapshot,origin);if(!frame||box.length!==6)return;
  const m=frame.matrix,corners:ClipPoint[]=[];let magnitude=1;
  for(let corner=0;corner<8;corner++){
    const x=box[corner&1?3:0],y=corner&2?Math.max(0,box[4]):Math.min(0,box[1]),z=box[corner&4?5:2];
    const point:ClipPoint=[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],m[3]*x+m[7]*y+m[11]*z+m[15]];
    if(!point.every(Number.isFinite))return;
    magnitude=Math.max(magnitude,Math.abs(point[2]),Math.abs(point[3]));corners.push(point);
  }
  // WebGL near plane is z = -w; the same relative tolerance the box projection uses.
  const near=1e-5*magnitude;
  const planes:readonly ((p:ClipPoint)=>number)[]=[p=>p[2]+p[3]-near,p=>p[0]+p[3],p=>p[3]-p[0],p=>p[1]+p[3],p=>p[3]-p[1]];
  const width=frame.viewport.cssWidth,height=frame.viewport.cssHeight;
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity,any=false;
  for(const face of BOX_FACES){
    let polygon:ClipPoint[]=face.map(index=>corners[index]);
    for(const plane of planes){
      if(!polygon.length)break;
      const next:ClipPoint[]=[];
      for(let i=0;i<polygon.length;i++){
        const a=polygon[i],b=polygon[(i+1)%polygon.length],da=plane(a),db=plane(b);
        if(da>=0)next.push(a);
        if((da>=0)!==(db>=0)){const t=da/(da-db);next.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t]);}
      }
      polygon=next;
    }
    for(const point of polygon){
      // In front of the near plane w is positive; anything else is not a usable projection.
      if(!(point[3]>0))return;
      const x=(point[0]/point[3]+1)*width/2,y=(1-point[1]/point[3])*height/2;
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      any=true;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    }
  }
  return any?Object.freeze({left,top,right,bottom}):null;
}
/** Read only producer-bound component metadata, before acquiring a geometry
 * resource. Every dependency member contributes its full animated height.
 * A member that crosses the camera near plane contributes exactly the part of
 * it inside the view frustum: usually nothing (it is behind the lower screen
 * edge of a pitched view), and its real screen extent when the camera stands
 * beside or inside it. A member wholly behind the camera adds nothing visible.
 * A missing or invalid projection makes the whole cohort unknown. */
export function projectBuildingFocusCohort(snapshot:ModelViewProjectionSnapshot|undefined,components:readonly Pick<BuildingDetailComponent,'origin'|'box'>[]):BuildingFocusRect|undefined{
  if(!snapshot||!components.length)return;
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity,visible=0;
  for(const component of components){
    const projection=projectNativeModelBox(snapshot,component.origin,component.box);
    let bounds:BuildingFocusRect|null|undefined=projection.cssBounds;
    if(!bounds){
      if(projection.reason!=='near-plane')return;
      bounds=clippedBoxBounds(snapshot,component.origin,component.box);
      if(bounds===undefined)return;
      if(!bounds)continue;
    }
    visible++;left=Math.min(left,bounds.left);top=Math.min(top,bounds.top);
    right=Math.max(right,bounds.right);bottom=Math.max(bottom,bounds.bottom);
  }
  return visible?Object.freeze({left,top,right,bottom}):BEHIND_CAMERA;
}

/** A unit is an entire dependency cohort, never an arbitrary subset of a
 * building. Costs include the resources the caller will actually acquire. */
export type BuildingFocusUnit=Readonly<{
  key:string;bounds:BuildingFocusRect;
  detail:BuildingFocusCost;
  coarse?:BuildingFocusCost;
  /** The member's real descriptor could not be obtained within its bounds:
   * its whole dependency cohort stays deferred, never partially admitted. */
  unavailable?:boolean;
}>;
export type BuildingFocusCost=Readonly<{resourceKey:string;bytes:number;vertices:number;painted:boolean;
  /** Provider-owned exact representation token (for example a detail level).
   * Present when this cost is not the provider's ordinary demand selection, so
   * the provider can pin that same representation through validation. */
  pin?:string}>;
export type BuildingFocusBudget=Readonly<{bytes:number;vertices:number;units:number;paintedUnits:number}>;
/** Monotonic-clock interval during which a still-visible cohort keeps its
 * previously displayed representation. `since` is the first plan of the hold. */
export type BuildingFocusGrace=Readonly<{since:number;until:number}>;
/** `region` is the region under which the representation was admitted on its
 * own merit; a held cohort keeps it, so release policy follows its origin. */
export type BuildingFocusAdmission=Readonly<{key:string;region:'core'|'peripheral';cost:BuildingFocusCost;grace?:BuildingFocusGrace}>;
export type BuildingFocusPlan=Readonly<{
  admitted:readonly BuildingFocusAdmission[];deferred:readonly string[];
  retired:readonly BuildingFocusAdmission[];
  /** Keys displayed only by their grace hold. */
  held:readonly string[];
  /** Earliest grace expiry among held cohorts; the caller re-plans then. */
  nextGraceDeadline?:number;
}>;
export type BuildingFocusLeafBinding=Readonly<{key:string;id:string;sha256:string}>;
/** Translate already source-validated dependency descriptors to this provider's
 * actual admission keys. IDs alone are insufficient across source revisions.
 * Keep separate provider calls: a leaf name is not a cross-provider identity. */
export function bindBuildingFocusDependencies(leaves:readonly BuildingFocusLeafBinding[],dependencies:readonly (readonly Pick<BuildingFocusLeafBinding,'id'|'sha256'>[])[]):readonly (readonly string[])[]{
  const ids=new Map<string,BuildingFocusLeafBinding>(),keys=new Set<string>();
  for(const leaf of leaves){
    if(!leaf.id||!leaf.key||!/^[a-f0-9]{64}$/.test(leaf.sha256)||ids.has(leaf.id)||keys.has(leaf.key))throw Error('Invalid or ambiguous focus leaf binding');
    ids.set(leaf.id,leaf);keys.add(leaf.key);
  }
  return dependencies.map(group=>{
    if(!group.length)throw Error('Empty focus dependency binding');
    const members=new Set<string>();
    for(const expected of group){
      const leaf=ids.get(expected.id);
      if(!leaf||leaf.sha256!==expected.sha256)throw Error('Focus dependency source mismatch: '+expected.id);
      members.add(leaf.key);
    }
    return Object.freeze([...members].sort());
  });
}
const finiteNonnegative=(v:number)=>Number.isSafeInteger(v)&&v>=0;
function checkBudget(b:BuildingFocusBudget){if(!Object.values(b).every(finiteNonnegative))throw Error('Invalid focus resource budget');}
function checkCost(c:BuildingFocusCost){if(!c.resourceKey||!finiteNonnegative(c.bytes)||!finiteNonnegative(c.vertices)||typeof c.painted!=='boolean'||c.pin!==undefined&&(typeof c.pin!=='string'||!c.pin))throw Error('Invalid focus resource cost');}
function rank(key:string){let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return h>>>0;}
type Spend={bytes:number;vertices:number;units:number;paintedUnits:number};
const sumOf=(costs:readonly BuildingFocusCost[]):Spend=>costs.reduce((n,c)=>({bytes:n.bytes+c.bytes,vertices:n.vertices+c.vertices,units:n.units+1,paintedUnits:n.paintedUnits+Number(c.painted)}),{bytes:0,vertices:0,units:0,paintedUnits:0});
/** Metadata-only plan. No loading callbacks, decoding, source mutations or
 * hidden cache. The caller must retire `retired` before acquiring replacements.
 * Budgets are supplied independently of window dimensions. A broader geographic
 * view reduces them; it can never enlarge them. Unknown projection preserves
 * that cohort's previous demand until a valid projection becomes available.
 * Order of spending: unknown holds, core on merit (nearest first), resident
 * peripheral samples, grace holds of still-visible displayed cohorts, then new
 * peripheral samples. Core never yields its allowance to anything after it. */
export function planBuildingFocusAdmission(options:{
  window:BuildingFocusWindow;units:readonly BuildingFocusUnit[];
  core:BuildingFocusBudget;peripheral:BuildingFocusBudget;
  /** Optional shared ceiling: peripheral work only spends what core left. */
  total?:BuildingFocusBudget;
  coverageRatio:number;edgeDensity?:number;previous?:readonly BuildingFocusAdmission[];
  /** Complete leaf keys for each source-validated cross-leaf dependency. */
  dependencies?:readonly (readonly string[])[];
  /** One-way prerequisites: a unit is admitted only with or after every unit
   * it requires (an owner reconstruction requires the native leaf whose part
   * it displaces). The required unit never requires it back and may be
   * admitted alone; without its prerequisites the requiring unit is deferred. */
  requires?:readonly (readonly [string,readonly string[]])[];
  /** Units of owner-protected cohorts. Their cohorts are admitted before every
   * ordinary cohort, bounded by the ORIGINAL (unscaled) byte and unit
   * allowance; ordinary cohorts spend what is left. Their vertices are charged
   * but never refuse them: the provider accepted each protected cohort against
   * its display cap by its MEMBER components, a quantity this plan cannot see
   * (it charges the in-view share of whole leaves), and the provider's display
   * admission still keeps the displayed vertices within that cap, members first. */
  priority?:readonly string[];
  /** Monotonic plan time and display grace. A displayed cohort that is still
   * visible but no longer admitted on merit keeps its previous representation
   * until `since + holdMs`, within the remaining shared budget. 0 disables. */
  now?:number;holdMs?:number;
}):BuildingFocusPlan{
  checkBudget(options.core);checkBudget(options.peripheral);if(options.total)checkBudget(options.total);
  if(!Number.isFinite(options.coverageRatio)||options.coverageRatio<=0)throw Error('Invalid focus geographic coverage');
  const now=options.now??0,holdMs=options.holdMs??0;
  if(!Number.isFinite(now)||!Number.isFinite(holdMs)||holdMs<0||holdMs>20_000)throw Error('Invalid focus grace');
  const scale=Math.min(1,1/options.coverageRatio);
  // The epsilon absorbs floating error only (a scale of exactly one half must
  // keep half of 8 units, not 3.9999999998 -> 3); real fractions still floor.
  const scaled=(value:number)=>Math.floor(value*scale+1e-6);
  const budget=(b:BuildingFocusBudget)=>({bytes:scaled(b.bytes),vertices:scaled(b.vertices),units:scaled(b.units),paintedUnits:scaled(b.paintedUnits)});
  const available={core:budget(options.core),peripheral:budget(options.peripheral)};
  const total=options.total?budget(options.total):undefined;
  const original={core:{...options.core},total:options.total?{...options.total}:undefined};
  const spend=(b:Spend,c:Spend)=>{b.bytes-=c.bytes;b.vertices-=c.vertices;b.units-=c.units;b.paintedUnits-=c.paintedUnits;};
  const fits=(limits:readonly Spend[],sum:Spend,vertices=true)=>limits.every(limit=>sum.bytes<=limit.bytes&&(!vertices||sum.vertices<=limit.vertices)&&sum.units<=limit.units&&sum.paintedUnits<=limit.paintedUnits);
  const previous=new Map((options.previous??[]).map(row=>[row.key,row])),seen=new Set<string>();
  for(const row of previous.values()){checkCost(row.cost);if(row.grace&&!(Number.isFinite(row.grace.since)&&Number.isFinite(row.grace.until)&&row.grace.since<=row.grace.until))throw Error('Invalid focus grace');}
  const admitted:BuildingFocusAdmission[]=[],deferred=new Set<string>(),admittedKeys=new Set<string>();
  const rows=options.units.map(unit=>{
    if(!unit.key||seen.has(unit.key))throw Error('Duplicate or empty focus cohort');seen.add(unit.key);
    checkCost(unit.detail);if(unit.coarse)checkCost(unit.coarse);
    return{unit,region:buildingFocusRegion(options.window,unit.bounds)};
  });
  // Overlapping dependency lists form one atomic cohort, even when a member
  // is offscreen. Missing members must be resolved by the source owner first.
  const byKey=new Map(rows.map(row=>[row.unit.key,row])),parent=new Map(rows.map(row=>[row.unit.key,row.unit.key]));
  const root=(key:string):string=>{let current=key;while(parent.get(current)!==current)current=parent.get(current)!;return current;};
  for(const dependency of options.dependencies??[]){
    if(!dependency.length)throw Error('Empty focus dependency');
    for(const key of dependency)if(!byKey.has(key))throw Error('Missing focus dependency: '+key);
    const first=root(dependency[0]);for(const key of dependency)parent.set(root(key),first);
  }
  const requires=new Map<string,Set<string>>();
  for(const [key,needs] of options.requires??[]){
    if(!byKey.has(key))throw Error('Missing focus requirement unit: '+key);
    const set=requires.get(key)??new Set<string>();requires.set(key,set);
    for(const need of needs){if(!byKey.has(need))throw Error('Missing focus requirement: '+need);if(need!==key)set.add(need);}
  }
  const priority=new Set(options.priority??[]);for(const key of priority)if(!byKey.has(key))throw Error('Missing focus priority unit: '+key);
  const linked=new Map<string,typeof rows>();
  for(const row of rows){const key=root(row.unit.key),group=linked.get(key)??[];group.push(row);linked.set(key,group);}
  const groups=[...linked.values()].map(members=>{
    members.sort((a,b)=>a.unit.key<b.unit.key?-1:1);
    const unknown=members.some(row=>row.region==='unknown'),keys=new Set(members.map(row=>row.unit.key));
    const bounds={left:Math.min(...members.map(row=>row.unit.bounds.left)),top:Math.min(...members.map(row=>row.unit.bounds.top)),right:Math.max(...members.map(row=>row.unit.bounds.right)),bottom:Math.max(...members.map(row=>row.unit.bounds.bottom))};
    // The rectangle between disjoint parts is not itself a building. Classify
    // actual members, while retaining the complete dependency if one is visible.
    const region=unknown?'unknown' as const:members.some(row=>row.region==='core')?'core' as const:members.some(row=>row.region==='peripheral')?'peripheral' as const:'outside' as const;
    const needs=new Set([...keys].flatMap(key=>[...(requires.get(key)??[])]).filter(key=>!keys.has(key)));
    return{members,bounds,region,needs,priority:[...keys].some(key=>priority.has(key)),unavailable:members.some(row=>row.unit.unavailable),key:members.length===1?members[0].unit.key:JSON.stringify(members.map(row=>row.unit.key))};
  });
  type Group=typeof groups[number];
  const done=new Set<Group>();
  const expired=(row:BuildingFocusAdmission)=>!!row.grace&&now>=row.grace.until;
  const ready=(group:Group)=>[...group.needs].every(key=>admittedKeys.has(key));
  const admit=(row:BuildingFocusAdmission)=>{admitted.push(row);admittedKeys.add(row.key);};
  for(const group of groups){
    if(group.unavailable){for(const {unit} of group.members)deferred.add(unit.key);done.add(group);continue;}
    if(group.region!=='unknown')continue;
    // Unknown projection keeps the whole cohort's previous demand, or none of it.
    const olds=group.members.map(({unit})=>{deferred.add(unit.key);return previous.get(unit.key);});
    if(olds.every(old=>old&&!expired(old)))for(const old of olds as BuildingFocusAdmission[]){admit(old);const one=sumOf([old.cost]);spend(available[old.region],one);if(total)spend(total,one);}
    done.add(group);
  }
  const cx=options.window.viewport.width/2,cy=options.window.viewport.height/2;
  const distance=(bounds:BuildingFocusRect)=>Math.hypot((bounds.left+bounds.right)/2-cx,(bounds.top+bounds.bottom)/2-cy);
  groups.sort((a,b)=>Number(b.region==='core')-Number(a.region==='core')||(a.region==='core'?distance(a.bounds)-distance(b.bounds):rank(a.key)-rank(b.key))||(a.key<b.key?-1:1));
  const limitsFor=(region:'core'|'peripheral')=>[available[region],...(total?[total]:[])];
  /** Check `limits`, then charge them and every `also` ledger. */
  const admitAll=(group:Group,region:'core'|'peripheral',costs:readonly BuildingFocusCost[],limits:readonly Spend[],grace?:(key:string)=>BuildingFocusAdmission,also:readonly Spend[]=[],vertices=true)=>{
    const sum=sumOf(costs);if(!fits(limits,sum,vertices))return false;
    group.members.forEach(({unit},i)=>admit(grace?grace(unit.key):{key:unit.key,region,cost:costs[i]}));
    for(const limit of new Set([...limits,...also]))spend(limit,sum);done.add(group);return true;
  };
  /** Groups whose prerequisites are not admitted yet wait; they are retried
   * whenever an attempt in the same phase admitted something. */
  const phase=(order:readonly Group[],attempt:(group:Group)=>boolean)=>{
    let pending=order.filter(group=>!done.has(group));
    for(let progress=true;progress&&pending.length;){
      progress=false;const waiting:Group[]=[];
      for(const group of pending){if(done.has(group))continue;if(!ready(group)){waiting.push(group);continue;}if(attempt(group))progress=true;}
      pending=waiting;
    }
  };
  const sampled=(group:Group)=>rank(group.key)/4294967296<Math.max(...group.members.map(({unit})=>buildingFocusDensity(options.window,unit.bounds,options.edgeDensity)!));
  // Owner-protected cohorts first, nearest first, within the original byte and
  // unit allowance; they also consume the scaled ordinary one, vertices included.
  phase(groups.filter(group=>group.priority&&(group.region==='core'||group.region==='peripheral')).sort((a,b)=>distance(a.bounds)-distance(b.bounds)||(a.key<b.key?-1:1)),group=>{
    const region=group.region as 'core'|'peripheral',costs=group.members.map(({unit})=>region==='core'?unit.detail:unit.coarse??unit.detail);
    return admitAll(group,region,costs,[original.core,...(original.total?[original.total]:[])],undefined,limitsFor(region),false);
  });
  // Core cohorts on their own merit, nearest first, with the full allowance.
  phase(groups.filter(group=>group.region==='core'),group=>admitAll(group,'core',group.members.map(({unit})=>unit.detail),limitsFor('core')));
  // A resident peripheral sample keeps its exact representation before any new sample.
  phase(groups.filter(group=>group.region==='peripheral'&&sampled(group)),group=>{
    const costs=group.members.map(({unit})=>unit.coarse);
    if(costs.some(cost=>!cost)||!group.members.every(({unit},i)=>{const old=previous.get(unit.key);return old&&!expired(old)&&old.cost.resourceKey===costs[i]!.resourceKey;}))return false;
    return admitAll(group,'peripheral',costs as BuildingFocusCost[],limitsFor('peripheral'));
  });
  // A displayed cohort that is still on screen keeps its previous representation
  // for the confirmed grace, within what the shared budget still has left.
  if(holdMs>0)phase([...groups].filter(group=>group.region==='core'||group.region==='peripheral').sort((a,b)=>distance(a.bounds)-distance(b.bounds)||(a.key<b.key?-1:1)),group=>{
    const olds=group.members.map(({unit})=>previous.get(unit.key));
    if(olds.some(old=>!old))return false;
    const since=Math.min(...olds.map(old=>old!.grace?.since??now)),until=Math.min(...olds.map(old=>old!.grace?.until??now+holdMs));
    if(now>=until)return false;
    const grace=Object.freeze({since,until}),byMember=new Map(group.members.map(({unit},i)=>[unit.key,olds[i]!]));
    return admitAll(group,group.region as 'core'|'peripheral',olds.map(old=>old!.cost),total?[total]:[available[group.region as 'core'|'peripheral']],key=>{const old=byMember.get(key)!;return{key,region:old.region,cost:old.cost,grace};});
  });
  phase(groups.filter(group=>group.region==='peripheral'&&sampled(group)),group=>{
    const costs=group.members.map(({unit})=>unit.coarse);
    return !costs.some(cost=>!cost)&&admitAll(group,'peripheral',costs as BuildingFocusCost[],limitsFor('peripheral'));
  });
  // Never publish a requiring unit (for example an owner reconstruction)
  // without everything it requires; drop such cohorts until the set is closed.
  const groupOf=new Map(groups.flatMap(group=>group.members.map(({unit})=>[unit.key,group] as const)));
  for(let changed=true;changed;){
    changed=false;
    for(const group of new Set(admitted.map(row=>groupOf.get(row.key)!)))if(!ready(group)){
      const keys=new Set(group.members.map(({unit})=>unit.key));
      for(let i=admitted.length-1;i>=0;i--)if(keys.has(admitted[i].key)){admittedKeys.delete(admitted[i].key);admitted.splice(i,1);}
      for(const key of keys)deferred.add(key);changed=true;
    }
  }
  for(const group of groups)if(!group.members.some(({unit})=>admittedKeys.has(unit.key)))for(const {unit} of group.members)deferred.add(unit.key);
  const next=new Map(admitted.map(row=>[row.key,row]));
  const retired=(options.previous??[]).filter(row=>next.get(row.key)?.cost.resourceKey!==row.cost.resourceKey);
  // Unknown-projection holds keep their grace too; its expiry also re-plans.
  const graced=admitted.filter(row=>row.grace);
  return{admitted,deferred:[...deferred],retired,held:graced.filter(row=>!deferred.has(row.key)).map(row=>row.key),...(graced.length?{nextGraceDeadline:Math.min(...graced.map(row=>row.grace!.until))}:{})};
}

/** Remaining exit grace for a retired representation: a cohort that already
 * spent part of the confirmed grace on screen never restarts a full period. */
export function remainingBuildingFocusGrace<T extends Readonly<Record<string,number>>>(tiers:T,row:Pick<BuildingFocusAdmission,'grace'>,now:number):T{
  const elapsed=row.grace?Math.max(0,now-row.grace.since):0;
  return Object.freeze(Object.fromEntries(Object.entries(tiers).map(([tier,ms])=>[tier,Math.max(0,Math.min(20_000,ms-elapsed))]))) as unknown as T;
}
