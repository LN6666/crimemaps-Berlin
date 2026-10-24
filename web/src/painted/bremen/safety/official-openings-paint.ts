export const OFFICIAL_OPENINGS_GLSL=String.raw`
float sopLine(float x,float w){return 1.-smoothstep(w,w+max(fwidth(x),.010),abs(x));}
float sopRect(vec2 q,vec4 r){float d=max(max(r.x-q.x,q.x-r.y),max(r.z-q.y,q.y-r.w));return 1.-smoothstep(-.018,.018+max(fwidth(q.x),fwidth(q.y)),d);}
vec3 sopBrick(vec2 q){float course=floor(q.y/.09),u=q.x+mod(course,2.)*.13;float mortar=max(sopLine(mod(u,.26)-.13,.005),sopLine(mod(q.y,.09)-.045,.004));return vec3(.51,.345,.265)*(1.-.13*mortar)+vec3(.012,.008,.005)*sin(floor(u/.26)*2.7+course*1.7);}
void sopOpening(inout vec3 c,vec2 q,vec4 r,float kind){
 vec3 trim=vec3(.82,.815,.76);float mask=sopRect(q,r),cx=(r.x+r.y)*.5,cy=(r.z+r.w)*.5;
 if(kind>3.5){vec3 panel=vec3(.83,.825,.78)*(1.-.065*sopLine(mod(q.y,.055)-.0275,.003));c=mix(c,panel,mask);}
 else{vec3 glass=mix(vec3(.18,.245,.25),vec3(.42,.47,.445),clamp((q.y-r.z)/max(.1,r.w-r.z),0.,1.));if(kind>2.5)glass*=.76;c=mix(c,glass,mask);float bars=max(sopLine(q.x-cx,.023),sopLine(q.y-(r.z+(r.w-r.z)*.64),.022));c=mix(c,trim,bars*mask);}
 vec4 inner=r+vec4(.045,-.045,.045,-.045);float border=clamp(sopRect(q,r+vec4(-.045,.045,-.045,.045))-sopRect(q,inner),0.,1.);c=mix(c,trim,border);
 float sill=sopRect(q,vec4(r.x-.07,r.y+.07,r.z-.07,r.z-.015));c=mix(c,trim*.88,sill);
 if(kind>2.5&&kind<3.5){float handle=sopRect(q,vec4(r.y-.16,r.y-.115,r.z+(r.w-r.z)*.44,r.z+(r.w-r.z)*.54));c=mix(c,vec3(.56,.54,.45),handle);}
}
vec3 officialOpeningsPaint(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){
 if(family!=47100.)return base;vec2 q=frame.xy;float selector=frame.z;vec3 c=sopBrick(q);
 if(abs(selector-1.0)<.25){
  sopOpening(c,q,vec4(1.578804,2.986413,3.928220,5.592720),1.0);
  sopOpening(c,q,vec4(4.070652,6.429348,3.928220,5.592720),2.0);
  return c;
 }
 if(abs(selector-2.0)<.25){
  sopOpening(c,q,vec4(0.910114,2.191015,3.999000,5.598600),1.0);
  sopOpening(c,q,vec4(2.662925,3.943826,3.999000,5.598600),1.0);
  sopOpening(c,q,vec4(4.415737,5.696638,3.999000,5.598600),1.0);
  sopOpening(c,q,vec4(0.910114,2.595510,1.532950,2.865950),1.0);
  return c;
 }
 if(abs(selector-3.0)<.25){
  sopOpening(c,q,vec4(1.344191,2.542626,3.651511,5.198761),1.0);
  sopOpening(c,q,vec4(3.465745,5.473934,3.651511,5.198761),2.0);
  sopOpening(c,q,vec4(1.295606,2.461651,0.216615,2.723161),3.0);
  sopOpening(c,q,vec4(3.530525,5.538714,0.959295,2.723161),2.0);
  return c;
 }
 if(abs(selector-4.0)<.25){
  sopOpening(c,q,vec4(0.874265,2.104713,3.703201,5.184481),1.0);
  sopOpening(c,q,vec4(2.558035,3.788483,3.703201,5.184481),1.0);
  sopOpening(c,q,vec4(4.241806,5.472253,3.703201,5.184481),1.0);
  sopOpening(c,q,vec4(0.874265,2.493275,1.419560,2.653961),1.0);
  return c;
 }
 if(abs(selector-5.0)<.25){
  sopOpening(c,q,vec4(1.346559,2.547105,3.663310,5.215560),1.0);
  sopOpening(c,q,vec4(3.471850,5.483576,3.663310,5.215560),2.0);
  sopOpening(c,q,vec4(1.297888,2.465987,0.217315,2.731960),3.0);
  sopOpening(c,q,vec4(3.536744,5.548471,0.962395,2.731960),2.0);
  return c;
 }
 if(abs(selector-6.0)<.25){
  sopOpening(c,q,vec4(0.875557,2.107822,3.726000,5.216400),1.0);
  sopOpening(c,q,vec4(2.561815,3.794080,3.726000,5.216400),1.0);
  sopOpening(c,q,vec4(4.248072,5.480338,3.726000,5.216400),1.0);
  sopOpening(c,q,vec4(0.875557,2.496959,1.428300,2.670300),1.0);
  return c;
 }
 if(abs(selector-7.0)<.25){
  sopOpening(c,q,vec4(1.346737,2.547443,3.677470,5.235720),1.0);
  sopOpening(c,q,vec4(3.472310,5.484303,3.677470,5.235720),2.0);
  sopOpening(c,q,vec4(3.537213,5.549206,0.997280,2.742520),2.0);
  return c;
 }
 if(abs(selector-8.0)<.25){
  sopOpening(c,q,vec4(0.877915,2.113498,3.737400,5.232360),1.0);
  sopOpening(c,q,vec4(2.568714,3.804297,3.737400,5.232360),1.0);
  sopOpening(c,q,vec4(4.259512,5.495096,3.737400,5.232360),1.0);
  sopOpening(c,q,vec4(0.877915,2.503683,1.432670,2.678470),1.0);
  return c;
 }
 if(abs(selector-9.0)<.25){
  sopOpening(c,q,vec4(1.370991,2.593319,3.694580,5.260080),1.0);
  sopOpening(c,q,vec4(3.534843,5.583070,3.694580,5.260080),2.0);
  return c;
 }
 if(abs(selector-10.0)<.25){
  sopOpening(c,q,vec4(0.892547,2.148725,3.762600,5.267640),1.0);
  sopOpening(c,q,vec4(2.611527,3.867705,3.762600,5.267640),1.0);
  sopOpening(c,q,vec4(4.330507,5.586685,3.762600,5.267640),1.0);
  sopOpening(c,q,vec4(0.892547,2.545413,1.442330,2.696530),1.0);
  return c;
 }
 if(abs(selector-11.0)<.25){
  sopOpening(c,q,vec4(1.371574,2.594423,3.848570,5.479320),1.0);
  sopOpening(c,q,vec4(3.536347,5.585445,3.848570,5.479320),2.0);
  sopOpening(c,q,vec4(1.321999,2.511798,0.228305,2.870120),3.0);
  sopOpening(c,q,vec4(3.602447,5.651545,1.011065,2.870120),2.0);
  return c;
 }
 if(abs(selector-12.0)<.25){
  sopOpening(c,q,vec4(0.892988,2.149785,3.906601,5.469241),1.0);
  sopOpening(c,q,vec4(2.612816,3.869614,3.906601,5.469241),1.0);
  sopOpening(c,q,vec4(4.332644,5.589442,3.906601,5.469241),1.0);
  sopOpening(c,q,vec4(0.892988,2.546669,1.497530,2.799730),1.0);
  return c;
 }
 if(abs(selector-13.0)<.25){
  sopOpening(c,q,vec4(1.347872,2.549589,3.742960,5.328960),1.0);
  sopOpening(c,q,vec4(3.475235,5.488923,3.742960,5.328960),2.0);
  sopOpening(c,q,vec4(1.299153,2.468392,0.222040,2.791360),3.0);
  sopOpening(c,q,vec4(3.540193,5.553881,0.983320,2.791360),2.0);
  return c;
 }
 if(abs(selector-14.0)<.25){
  sopOpening(c,q,vec4(0.876727,2.110640,3.798000,5.317200),1.0);
  sopOpening(c,q,vec4(2.565239,3.799152,3.798000,5.317200),1.0);
  sopOpening(c,q,vec4(4.253752,5.487664,3.798000,5.317200),1.0);
  sopOpening(c,q,vec4(0.876727,2.500297,1.455900,2.721900),1.0);
  return c;
 }
 if(abs(selector-15.0)<.25){
  sopOpening(c,q,vec4(1.353021,2.559329,3.964210,5.643960),1.0);
  sopOpening(c,q,vec4(3.488512,5.509892,3.964210,5.643960),2.0);
  return c;
 }
 if(abs(selector-16.0)<.25){
  sopOpening(c,q,vec4(0.880290,2.119216,4.033200,5.646480),1.0);
  sopOpening(c,q,vec4(2.575662,3.814589,4.033200,5.646480),1.0);
  sopOpening(c,q,vec4(4.271035,5.509961,4.033200,5.646480),1.0);
  sopOpening(c,q,vec4(0.880290,2.510456,1.546060,2.890460),1.0);
  return c;
 }
 if(abs(selector-17.0)<.25){
  sopOpening(c,q,vec4(1.352341,2.558042,4.000201,5.695201),1.0);
  sopOpening(c,q,vec4(3.486758,5.507123,4.000201,5.695201),2.0);
  return c;
 }
 if(abs(selector-18.0)<.25){
  sopOpening(c,q,vec4(0.878001,2.113707,4.065000,5.691000),1.0);
  sopOpening(c,q,vec4(2.568967,3.804672,4.065000,5.691000),1.0);
  sopOpening(c,q,vec4(4.259932,5.495638,4.065000,5.691000),1.0);
  sopOpening(c,q,vec4(0.878001,2.503930,1.558250,2.913250),1.0);
  return c;
 }
 if(abs(selector-19.0)<.25){
  sopOpening(c,q,vec4(1.554601,2.940631,3.780130,5.381880),1.0);
  sopOpening(c,q,vec4(4.008249,6.330786,3.780130,5.381880),2.0);
  return c;
 }
 if(abs(selector-20.0)<.25){
  sopOpening(c,q,vec4(0.879520,2.117364,3.859801,5.403721),1.0);
  sopOpening(c,q,vec4(2.573411,3.811255,3.859801,5.403721),1.0);
  sopOpening(c,q,vec4(4.267302,5.505146,3.859801,5.403721),1.0);
  sopOpening(c,q,vec4(0.879520,2.508262,1.479590,2.766190),1.0);
  return c;
 }
 if(abs(selector-21.0)<.25){
  sopOpening(c,q,vec4(1.385795,2.621324,3.735290,5.318040),4.0);
  sopOpening(c,q,vec4(3.573014,5.643359,3.735290,5.318040),2.0);
  return c;
 }
 if(abs(selector-22.0)<.25){
  sopOpening(c,q,vec4(0.900472,2.167802,3.784200,5.297880),1.0);
  sopOpening(c,q,vec4(2.634714,3.902044,3.784200,5.297880),1.0);
  sopOpening(c,q,vec4(4.368955,5.636286,3.784200,5.297880),1.0);
  sopOpening(c,q,vec4(0.900472,2.568012,1.450610,2.712010),1.0);
  return c;
 }
 if(abs(selector-23.0)<.25){
  sopOpening(c,q,vec4(1.341505,2.537546,3.696350,5.262600),1.0);
  sopOpening(c,q,vec4(3.458821,5.462998,3.696350,5.262600),2.0);
  sopOpening(c,q,vec4(1.293017,2.456733,0.219275,2.756600),3.0);
  sopOpening(c,q,vec4(3.523472,5.527649,0.971075,2.756600),2.0);
  return c;
 }
 if(abs(selector-24.0)<.25){
  sopOpening(c,q,vec4(0.874592,2.105500,3.759000,5.262600),1.0);
  sopOpening(c,q,vec4(2.558992,3.789900,3.759000,5.262600),1.0);
  sopOpening(c,q,vec4(4.243392,5.474299,3.759000,5.262600),1.0);
  sopOpening(c,q,vec4(0.874592,2.494207,1.440950,2.693950),1.0);
  return c;
 }
 if(abs(selector-25.0)<.25){
  sopOpening(c,q,vec4(1.356609,2.566116,3.730570,5.311320),1.0);
  sopOpening(c,q,vec4(3.497764,5.524505,3.730570,5.311320),2.0);
  sopOpening(c,q,vec4(1.307575,2.484393,0.221305,2.782120),3.0);
  sopOpening(c,q,vec4(3.563142,5.589884,0.980065,2.782120),2.0);
  return c;
 }
 if(abs(selector-26.0)<.25){
  sopOpening(c,q,vec4(0.878461,2.114814,3.793800,5.311320),1.0);
  sopOpening(c,q,vec4(2.570312,3.806665,3.793800,5.311320),1.0);
  sopOpening(c,q,vec4(4.262163,5.498516,3.793800,5.311320),1.0);
  sopOpening(c,q,vec4(0.878461,2.505241,1.454290,2.718890),1.0);
  return c;
 }
 if(abs(selector-27.0)<.25){
  sopOpening(c,q,vec4(1.397999,2.693706,4.076310,5.803560),1.0);
  return c;
 }
 if(abs(selector-28.0)<.25){
  sopOpening(c,q,vec4(0.918877,2.212111,4.147200,5.806080),1.0);
  sopOpening(c,q,vec4(2.688566,3.981800,4.147200,5.806080),1.0);
  sopOpening(c,q,vec4(4.458255,5.751489,4.147200,5.806080),1.0);
  sopOpening(c,q,vec4(0.918877,2.620501,1.589760,2.972160),1.0);
  return c;
 }
 if(abs(selector-29.0)<.25){
  sopOpening(c,q,vec4(3.532264,4.672995,5.678750,7.153750),1.0);
  sopOpening(c,q,vec4(5.733675,6.874407,5.678750,7.153750),1.0);
  sopOpening(c,q,vec4(7.935086,9.075818,5.678750,7.153750),1.0);
  sopOpening(c,q,vec4(10.536754,11.677485,5.678750,7.153750),1.0);
  sopOpening(c,q,vec4(13.338550,14.479281,5.678750,7.153750),1.0);
  sopOpening(c,q,vec4(3.462219,4.743040,3.171250,4.720000),1.0);
  sopOpening(c,q,vec4(5.663630,6.944451,3.171250,4.720000),1.0);
  sopOpening(c,q,vec4(10.466709,11.747530,3.171250,4.720000),1.0);
  sopOpening(c,q,vec4(13.268505,14.549326,3.171250,4.720000),1.0);
  sopOpening(c,q,vec4(8.355356,9.456061,1.991250,4.720000),3.0);
  return c;
 }
 if(abs(selector-30.0)<.25){
  sopOpening(c,q,vec4(7.440586,8.575591,11.718749,13.281249),1.0);
  sopOpening(c,q,vec4(5.706551,6.904612,8.749999,10.312499),1.0);
  sopOpening(c,q,vec4(7.219891,8.417951,8.749999,10.312499),1.0);
  sopOpening(c,q,vec4(8.733230,9.931291,8.749999,10.312499),1.0);
  return c;
 }
 if(abs(selector-31.0)<.25){
  sopOpening(c,q,vec4(3.976202,5.486152,6.626210,8.260071),1.0);
  sopOpening(c,q,vec4(6.694113,8.204063,6.626210,8.260071),1.0);
  sopOpening(c,q,vec4(12.331260,13.841210,6.626210,8.260071),1.0);
  sopOpening(c,q,vec4(15.149834,16.659784,6.626210,8.260071),1.0);
  sopOpening(c,q,vec4(17.565754,19.075704,6.626210,8.260071),1.0);
  sopOpening(c,q,vec4(9.693880,10.438789,6.353900,8.260071),1.0);
  sopOpening(c,q,vec4(4.026534,5.435821,3.630800,5.173890),1.0);
  sopOpening(c,q,vec4(6.744444,8.153731,3.630800,5.173890),1.0);
  return c;
 }
 if(abs(selector-32.0)<.25){
  sopOpening(c,q,vec4(1.611883,3.223767,6.486841,8.064721),1.0);
  sopOpening(c,q,vec4(4.734907,6.346791,6.486841,8.064721),1.0);
  sopOpening(c,q,vec4(14.003237,15.615120,6.486841,8.064721),1.0);
  sopOpening(c,q,vec4(16.924776,18.536659,6.486841,8.064721),1.0);
  sopOpening(c,q,vec4(7.485184,8.230680,6.574501,7.977061),1.0);
  sopOpening(c,q,vec4(11.917863,12.663359,6.574501,7.977061),1.0);
  sopOpening(c,q,vec4(1.611883,3.223767,3.594061,5.259601),1.0);
  sopOpening(c,q,vec4(4.734907,6.346791,3.594061,5.259601),1.0);
  sopOpening(c,q,vec4(14.003237,15.615120,3.594061,5.259601),1.0);
  sopOpening(c,q,vec4(16.924776,18.536659,3.594061,5.259601),1.0);
  sopOpening(c,q,vec4(7.485184,8.230680,3.681721,4.908961),1.0);
  sopOpening(c,q,vec4(11.917863,12.663359,3.681721,4.908961),1.0);
  sopOpening(c,q,vec4(9.217958,10.930584,5.084281,6.574501),1.0);
  return c;
 }
 if(abs(selector-33.0)<.25){
  sopOpening(c,q,vec4(0.275874,1.329211,6.503040,8.219120),1.0);
  sopOpening(c,q,vec4(2.232071,3.385725,6.503040,8.219120),1.0);
  sopOpening(c,q,vec4(4.163188,7.072403,6.503040,8.219120),2.0);
  sopOpening(c,q,vec4(7.849866,9.003521,6.503040,8.219120),1.0);
  return c;
 }
 if(abs(selector-34.0)<.25){
  sopOpening(c,q,vec4(1.233044,2.616460,6.569999,8.303749),1.0);
  sopOpening(c,q,vec4(3.548762,4.631435,6.569999,8.303749),4.0);
  sopOpening(c,q,vec4(5.684034,7.067449,6.569999,8.303749),1.0);
  sopOpening(c,q,vec4(7.969677,9.353093,6.569999,8.303749),1.0);
  sopOpening(c,q,vec4(10.135023,11.518439,6.569999,8.303749),1.0);
  return c;
 }
 if(abs(selector-35.0)<.25){
  sopOpening(c,q,vec4(1.300989,2.720249,6.549120,8.277360),1.0);
  sopOpening(c,q,vec4(3.429879,4.849140,6.549120,8.277360),1.0);
  sopOpening(c,q,vec4(5.558770,6.978031,6.549120,8.277360),1.0);
  sopOpening(c,q,vec4(7.805932,9.225193,6.549120,8.277360),4.0);
  sopOpening(c,q,vec4(9.934823,11.354084,6.549120,8.277360),1.0);
  return c;
 }
 if(abs(selector-36.0)<.25){
  sopOpening(c,q,vec4(0.953822,2.316425,6.605770,8.234590),1.0);
  sopOpening(c,q,vec4(3.024979,4.387582,6.605770,8.234590),1.0);
  sopOpening(c,q,vec4(4.987128,6.349731,6.605770,8.234590),1.0);
  sopOpening(c,q,vec4(6.949276,8.311879,6.605770,8.234590),1.0);
  sopOpening(c,q,vec4(8.911425,10.274028,6.605770,8.234590),1.0);
  sopOpening(c,q,vec4(0.872066,2.180165,3.981560,5.519890),1.0);
  sopOpening(c,q,vec4(2.943223,4.251322,3.981560,5.519890),1.0);
  sopOpening(c,q,vec4(5.423161,6.131714,4.162540,5.338910),1.0);
  sopOpening(c,q,vec4(7.276301,9.947003,3.891070,5.519890),2.0);
  return c;
 }
 if(abs(selector-37.0)<.25){
  sopOpening(c,q,vec4(0.836665,2.286885,6.602120,8.320480),1.0);
  sopOpening(c,q,vec4(3.402438,4.852658,6.602120,8.320480),1.0);
  sopOpening(c,q,vec4(0.892443,2.231107,3.888920,5.516840),1.0);
  sopOpening(c,q,vec4(3.458216,4.796880,3.888920,5.516840),1.0);
  sopOpening(c,q,vec4(5.912434,7.251098,3.888920,5.516840),1.0);
  return c;
 }
 return base;
}
`;
