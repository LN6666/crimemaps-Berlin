import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {transform} from 'esbuild';
import ts from 'typescript';

const source=await readFile(new URL('../src/safety/main.ts',import.meta.url),'utf8');
const ast=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
function find(node,predicate){return predicate(node)?node:ts.forEachChild(node,child=>find(child,predicate));}
const registration=find(ast,node=>ts.isCallExpression(node)&&node.expression.getText(ast)==='map.on'&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='click');
assert(registration,'use the actual map click handler');
const flow=(await transform(`const click=${registration.arguments[1].getText(ast)};`,{loader:'ts',format:'cjs'})).code;

// Exercise the real early-priority/async-pick wiring. Renderer geometry and the
// station panel are fixtures; this does not certify native GPU hit accuracy.
function fixture(){
  let resolve;const waiting=new Promise(done=>{resolve=done;});
  const state={station:false,buildingShown:0,buildingCleared:0,routeCleared:0};
  const deps={expired:false,selectionInspector:{close(){}},map:{getLayer:()=>true,queryRenderedFeatures:()=>[]},
    publicTransitOverlay:{inspectStopAt:()=>state.station,clearSelection(){state.routeCleared++;}},
    threeDimensional:{mode:'3d'},SHOP_LABEL_LAYER:'shop-labels',building3dClickPriority:()=> 'building-first',
    building3dInteraction:{probe:()=>waiting,clear(){state.buildingCleared++;},show(){state.buildingShown++;return true;}},
    osmClickInspection:{clear(){throw Error('building interaction already owns this inspection cleanup');}},
  };
  const api=new Function('deps',`const {expired,selectionInspector,map,publicTransitOverlay,threeDimensional,SHOP_LABEL_LAYER,building3dClickPriority,building3dInteraction,osmClickInspection}=deps;let threeDimensionalClick=0,selected={type:'poi',id:'old'},pendingSearchPoiId='old',basicOsmPanel={};\n${flow}\nreturn {click,getState:()=>({selected,pendingSearchPoiId,basicOsmPanel})};`)(deps);
  return{...api,state,resolve,event:{point:{x:20,y:30},lngLat:{lng:13,lat:52}}};
}

test('a newer station click clears the old component and invalidates a pending building probe',async()=>{
  const f=fixture();const earlier=f.click(f.event);
  f.state.station=true;await f.click(f.event);
  f.resolve({hit:{}});await earlier;
  assert.equal(f.state.buildingCleared,1);
  assert.equal(f.state.buildingShown,0,'late building hit cannot replace the newer station');
  assert.equal(f.state.routeCleared,0,'keep the newer transit selection');
  assert.deepEqual(f.getState(),{selected:null,pendingSearchPoiId:null,basicOsmPanel:undefined});
});

test('a current building probe still selects its component and clears the previous route',async()=>{
  const f=fixture();const pending=f.click(f.event);
  f.resolve({hit:{}});await pending;
  assert.equal(f.state.buildingShown,1);
  assert.equal(f.state.routeCleared,1);
  assert.equal(f.state.buildingCleared,0);
});
