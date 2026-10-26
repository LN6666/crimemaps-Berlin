// Direct esbuild unit tests use the explicit development profile. Publication
// builds still go through Vite's required city-profile activation gate.
export const nullCityDataProfilePlugin={name:'unit-test-city-data-profile',setup(build){
 build.onResolve({filter:/^virtual:crimemaps-city-data$/},()=>({path:'city-profile',namespace:'unit-test-city-profile'}));
 build.onLoad({filter:/.*/,namespace:'unit-test-city-profile'},()=>({contents:'export default null;',loader:'js'}));
}};
