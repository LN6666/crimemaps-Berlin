import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../src/safety/painted-map.ts',import.meta.url),'utf8');
const ast=ts.createSourceFile('painted-map.ts',source,ts.ScriptTarget.Latest,true);
let proxy,helper='';
(function visit(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='renderer'&&node.initializer&&ts.isNewExpression(node.initializer)&&node.initializer.expression.getText(ast)==='Proxy')proxy=node.initializer.getText(ast);
 if(ts.isFunctionDeclaration(node)&&node.name?.text==='compositorSceneSunlight')helper=node.getText(ast);
 ts.forEachChild(node,visit);
})(ast);
assert(proxy,'exercise the actual compositor renderer proxy');
const compile=code=>ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const solarSource=readFileSync(new URL('../src/safety/scene-solar-light.ts',import.meta.url),'utf8');
function setup(){
 const center={lng:8.8117636,lat:53.09068025},renderers=new Map();
 const environment={instantISO:'2026-11-05T11:00:00Z',quality:'economy',shadows:true};
 const context=vm.createContext({exports:{},renderers,providerOrder:['root500','city','bremen'],options:{map:{getCenter:()=>center}},detailSceneEnvironment:environment,sceneSunlightFallback:undefined});
 vm.runInContext(compile(solarSource),context);context.sceneSolarLight=context.exports.sceneSolarLight;
 vm.runInContext(compile(helper+';globalThis.renderer='+proxy+';'),context);
 const light=(lng,lat)=>({...context.sceneSolarLight(lng,lat,environment.instantISO),quality:'economy',activeSunDirection:[],shadowMode:'solar-projected',dynamicShadowAdmitted:0,dynamicShadowWithheld:0,contactShading:'display-wall-foot'});
 renderers.set('city',{residentVertexCount:0,sceneSunlight:light(0,0)});
 return{center,renderers,environment,renderer:context.renderer,light,solar:context.sceneSolarLight};
}

test('empty far geometry uses the real map centre instead of the renderer initialization origin',()=>{
 const f=setup(),light=f.renderer.sceneSunlight,expected=f.solar(f.center.lng,f.center.lat,f.environment.instantISO);
 assert.equal(light.longitude,f.center.lng);assert.equal(light.latitude,f.center.lat);
 assert.equal(light.altitudeDegrees,expected.altitudeDegrees);assert.deepEqual([...light.activeSunDirection],[...expected.direction]);
 assert.equal(f.renderers.get('city').sceneSunlight.longitude,0,'reading does not mutate source renderers');
});
test('a loaded provider supplies solar geometry while the preferred city provider is empty',()=>{
 const f=setup(),bremen=f.light(8.81,53.07);f.renderers.set('bremen',{residentVertexCount:123,sceneSunlight:bremen});
 assert.equal(f.renderer.sceneSunlight,bremen);
 const city=f.light(8.82,53.08);f.renderers.set('city',{residentVertexCount:42,sceneSunlight:city});
 assert.equal(f.renderer.sceneSunlight,city,'preserve the existing preferred resident provider');
});
test('empty-scene fallback follows camera and requested time without retaining the previous location',()=>{
 const f=setup();assert.equal(f.renderer.sceneSunlight.latitude,f.center.lat);
 f.center.lng=13.4;f.center.lat=52.5;f.environment.instantISO='2026-11-05T18:00:00Z';
 const light=f.renderer.sceneSunlight;assert.equal(light.longitude,13.4);assert.equal(light.latitude,52.5);
 assert.equal(light.instantISO,'2026-11-05T18:00:00.000Z');assert(light.altitudeDegrees<0);
});
test('an invalid camera cannot silently publish the initialization origin',()=>{
 const f=setup();f.center.lat=NaN;assert.equal(f.renderer.sceneSunlight,undefined);
});
