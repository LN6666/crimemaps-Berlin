import test from 'node:test';
import assert from 'node:assert/strict';
// City material calibrations (WAVE3-BACKLOG 03:25 stage 3, sweep uncovered[31]):
// the static material wrappers' calibrations are declared constants in
// city-shader-budget.ts, so describing a material recipe for a project city
// runs no wrapper and makes no text outside a reservation. This suite measures
// every declared wrapper and city with the original calibration
// (measureCityMaterialWrapper) and requires the declared rows to equal it, so a
// changed wrapper fails here instead of drifting.
const {runtime}=await import('./support/renderers-cc-runtime.mjs');
const R=runtime;
const wrappers=()=>[...R.CITY_DRESDEN_DISPATCHERS.map((wrapper,index)=>['dresden dispatcher '+index,wrapper]),['c311',R.c311MaterialFragment],['c313',R.c313MaterialFragment],['c312',R.c312MaterialFragment],['c318',R.c318MaterialFragment]];

test('every declared material calibration equals the original measurement, for every project city',()=>{
 assert.deepEqual([...R.DECLARED_CITY_MATERIAL_CITIES].sort(),['berlin','bremen','cologne','dortmund','dresden','dusseldorf','essen','frankfurt','hamburg','hannover','leipzig','munich','nuremberg','stuttgart']);
 const before=R.cityWrapperCalibrationStats();let nonIdentity=0;
 for(const [name,wrapper] of wrappers())for(const city of R.DECLARED_CITY_MATERIAL_CITIES){
  const declared=R.calibrateCityMaterialWrapper(wrapper,city),measured=R.measureCityMaterialWrapper(wrapper,city);
  assert.deepEqual(declared,measured,name+' / '+city);if(!declared.identity)nonIdentity++;
 }
 const after=R.cityWrapperCalibrationStats();
 assert.equal(after.measured,before.measured,'no declared wrapper ran through calibrate');assert.equal(after.declared-before.declared,wrappers().length*R.DECLARED_CITY_MATERIAL_CITIES.length);
 assert.equal(nonIdentity,42,'38 Dresden dispatchers, C311/C312/C318 in Munich and C313 in Leipzig');
});

test('describing Munich and Dresden material recipes runs no wrapper; another city or wrapper is still measured once',()=>{
 const base=R.shaderSourceBounds(R.shaderSourceText('vec3 progressiveFeatureDispatch(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}',['renderers-cc/facade']));
 const before=R.cityWrapperCalibrationStats();
 const munich=R.describeCityMaterialBounds(R.createCityMaterialBuilder('munich',['c311','c313','c312','c318'],()=>''),base),dresden=R.describeCityMaterialBounds(R.createCityMaterialBuilder('dresden',[],()=>''),base);
 assert.equal(R.cityWrapperCalibrationStats().measured,before.measured,'Munich and Dresden recipes are described from declared calibrations');
 assert(munich.sourceCharactersUpperBound>=base.sourceCharactersUpperBound+188075+8469+2760,'Munich bound includes C318, C312 and C311 insertions');assert(dresden.sourceCharactersUpperBound>=base.sourceCharactersUpperBound+152366,'Dresden bound includes the 38 dispatcher insertions');
 const custom=(source,city)=>city==='fixture-city'?source+'//x':source;
 R.calibrateCityMaterialWrapper(R.c318MaterialFragment,'fixture-city');R.calibrateCityMaterialWrapper(custom,'munich');R.calibrateCityMaterialWrapper(custom,'munich');
 assert.equal(R.cityWrapperCalibrationStats().measured,before.measured+2,'an undeclared city or wrapper is measured, once');
});
