export const F018_COMPLETION_GLSL=String.raw`bool cl018Cover0(vec2 q){const vec2 pts[14]=vec2[14](vec2(95.8758002,21.0061321),vec2(159.7771727,27.3847708),vec2(159.8720025,26.2047834),vec2(171.0076668,27.2734560),vec2(182.6716654,28.3977887),vec2(182.5768355,29.7447555),vec2(247.5551974,36.2458463),vec2(246.3562791,47.7896858),vec2(181.4998406,41.1216157),vec2(181.3440491,42.2125475),vec2(158.6459890,39.8525629),vec2(158.7882334,38.8840826),vec2(94.6091466,32.4943118),vec2(94.9478241,29.3550999));bool hit=false;for(int i=0;i<14;i++){int j=i==0?13:i-1;vec2 a=pts[i],b=pts[j],d=b-a;float t=clamp(dot(q-a,d)/max(dot(d,d),.0000001),0.,1.);if(length(q-a-t*d)<.02)return true;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
bool cl018Cover1(vec2 q){const vec2 pts[31]=vec2[31](vec2(-195.4396789,-7.5919904),vec2(-194.9181153,-13.2358927),vec2(-210.1585317,-14.6496578),vec2(-210.1178904,-15.1060680),vec2(-215.5231581,-15.6070084),vec2(-215.4689696,-16.2081341),vec2(-218.5915616,-16.4975663),vec2(-218.6457500,-15.9075726),vec2(-220.2104328,-16.0522887),vec2(-221.9309065,-16.2192688),vec2(-221.8699445,-16.8760542),vec2(-225.0941393,-17.1766185),vec2(-225.1551012,-16.5087010),vec2(-230.5400484,-17.0096414),vec2(-230.5874633,-16.5087033),vec2(-245.7398239,-17.9224684),vec2(-247.5551364,1.6475123),vec2(-232.3621346,3.0612774),vec2(-232.3960024,3.4397639),vec2(-227.1329786,3.9295723),vec2(-227.1871670,4.5418299),vec2(-223.9561987,4.8423942),vec2(-223.9020103,4.2746643),vec2(-220.7794183,4.5640966),vec2(-220.8268332,5.1095625),vec2(-217.6026384,5.4101267),vec2(-217.5552236,4.8869247),vec2(-212.2176910,5.3767331),vec2(-212.1905968,5.1095661),vec2(-196.7537484,6.5455952),vec2(-196.3202410,1.9147010));bool hit=false;for(int i=0;i<31;i++){int j=i==0?30:i-1;vec2 a=pts[i],b=pts[j],d=b-a;float t=clamp(dot(q-a,d)/max(dot(d,d),.0000001),0.,1.);if(length(q-a-t*d)<.02)return true;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
bool cl018Cover2(vec2 q){const vec2 pts[109]=vec2[109](vec2(2.2793103,38.1381752),vec2(2.9295708,32.4942729),vec2(3.6272474,23.8670061),vec2(3.1056865,23.8447420),vec2(3.4579108,21.0840166),vec2(3.7017575,21.1062806),vec2(3.7491723,20.5942106),vec2(5.0361409,20.6832668),vec2(4.9548584,21.1730729),vec2(7.3052693,21.4068450),vec2(7.3255901,20.9170389),vec2(8.5719175,20.9949631),vec2(8.5448231,21.5292971),vec2(11.3219657,21.7964652),vec2(11.3490600,21.2955272),vec2(12.5479728,21.3177916),vec2(12.4870108,21.9077853),vec2(14.9187039,22.1526894),vec2(14.9457983,21.6072235),vec2(16.3275961,21.6406200),vec2(16.2869547,22.2862735),vec2(18.3190102,22.4866496),vec2(18.3393310,21.8743919),vec2(19.0166829,21.8298644),vec2(19.3418129,19.5366812),vec2(18.6373670,19.5032851),vec2(18.7118763,18.3678254),vec2(19.4705104,18.3121660),vec2(19.4772842,17.7444361),vec2(20.1885037,17.6999086),vec2(20.2020509,17.2546303),vec2(21.2925874,17.3102905),vec2(21.2858136,17.9559441),vec2(23.9681269,18.1117926),vec2(24.0019947,17.6331185),vec2(25.0315696,17.6665148),vec2(24.9706076,18.3233002),vec2(27.5174506,18.4123570),vec2(27.5377713,17.9559467),vec2(28.7299106,18.0116070),vec2(28.6960427,18.7017884),vec2(31.3851296,18.8019771),vec2(31.4257709,18.3678308),vec2(32.4485722,18.4123591),vec2(32.4553454,19.0246167),vec2(32.6924186,19.0246168),vec2(32.6246831,19.6814023),vec2(33.3155820,19.6814026),vec2(33.1868845,21.0061055),vec2(32.5298532,20.9949733),vec2(32.3401935,23.3215523),vec2(32.8888485,23.3438165),vec2(32.9091688,23.8892824),vec2(33.7084440,23.9560745),vec2(35.2731267,24.1007906),vec2(35.2799005,23.6555123),vec2(36.6278307,23.7445685),vec2(36.6075099,24.2455066),vec2(39.1137117,24.5126747),vec2(39.1475794,24.1119242),vec2(40.3735863,24.1119247),vec2(40.3397185,24.6907865),vec2(42.9813907,24.9134268),vec2(43.0017114,24.4570165),vec2(44.1803037,24.4458851),vec2(44.1532093,25.0024829),vec2(46.4087910,25.2028591),vec2(46.4697529,24.7019211),vec2(47.5264218,24.7019215),vec2(47.2825733,28.4645231),vec2(46.4765247,28.3532032),vec2(45.7449816,34.7095506),vec2(44.8576468,42.6800319),vec2(44.0448245,42.7022955),vec2(44.1261071,41.9341904),vec2(30.7213142,40.6428777),vec2(30.5181084,41.2328713),vec2(30.1523384,41.1883434),vec2(30.0168675,42.1122958),vec2(29.6240030,43.1475677),vec2(29.2175913,44.3498189),vec2(29.7865666,44.8396253),vec2(29.0279319,45.9862166),vec2(28.4589566,45.5965979),vec2(27.6664544,46.4982861),vec2(27.1177992,46.9769600),vec2(26.1017710,47.7005368),vec2(26.3185234,48.2348709),vec2(25.0586486,48.8026002),vec2(24.8960844,48.2682662),vec2(24.0019799,48.4241132),vec2(23.2094782,48.4352448),vec2(22.1799034,48.2571331),vec2(21.0554995,47.8452502),vec2(20.7371439,48.3127922),vec2(19.6262872,47.5892145),vec2(19.9852839,47.0882766),vec2(19.3079324,46.4092269),vec2(18.8066924,45.5186701),vec2(18.2241704,44.3832101),vec2(17.3842539,44.6392448),vec2(17.0726726,43.4592572),vec2(17.8584009,43.2700142),vec2(17.5739138,41.7449359),vec2(17.4655384,40.0083505),vec2(16.9846186,39.9638224),vec2(16.8491486,39.2179812),vec2(2.9363418,37.7708209),vec2(2.8957005,38.1493074));bool hit=false;for(int i=0;i<109;i++){int j=i==0?108:i-1;vec2 a=pts[i],b=pts[j],d=b-a;float t=clamp(dot(q-a,d)/max(dot(d,d),.0000001),0.,1.);if(length(q-a-t*d)<.02)return true;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
bool cl018Cover3(vec2 q){const vec2 pts[30]=vec2[30](vec2(-20.6015933,-50.2384459),vec2(-17.1741930,-49.9601455),vec2(-17.1538723,-50.1493888),vec2(-15.1014962,-50.0714642),vec2(-7.5490231,-49.3924116),vec2(-7.5083822,-48.9582653),vec2(-4.2029052,-48.6799649),vec2(-5.0428263,-38.8838426),vec2(-5.3476346,-38.9172386),vec2(-7.3593791,-19.4363136),vec2(-6.6684802,-19.4363133),vec2(-7.7861156,-9.3173644),vec2(-8.4431469,-9.3507605),vec2(-10.4684384,10.0745047),vec2(-10.1500830,10.0633728),vec2(-11.0983803,19.7927034),vec2(-11.4370562,19.7927032),vec2(-11.6944512,22.4198451),vec2(3.1056865,23.8447420),vec2(3.6272474,23.8670061),vec2(2.9295708,32.4942729),vec2(-22.4643496,29.8448563),vec2(-22.1595396,26.4718733),vec2(-21.6447495,20.9281586),vec2(-26.7926235,20.4494822),vec2(-26.6503788,18.8798763),vec2(-25.9730227,10.1078940),vec2(-20.6422637,10.5531745),vec2(-15.4401772,-39.5851603),vec2(-21.5092496,-40.2308164));bool hit=false;for(int i=0;i<30;i++){int j=i==0?29:i-1;vec2 a=pts[i],b=pts[j],d=b-a;float t=clamp(dot(q-a,d)/max(dot(d,d),.0000001),0.,1.);if(length(q-a-t*d)<.02)return true;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
bool cl018Cover4(vec2 q){const vec2 pts[45]=vec2[45](vec2(94.9478241,29.3550999),vec2(94.6091466,32.4943118),vec2(92.9699469,49.5150743),vec2(92.5567623,49.4816782),vec2(92.4958003,50.2275193),vec2(91.2697934,50.2386508),vec2(91.3443025,49.3703581),vec2(89.2716059,49.1811140),vec2(89.2445114,49.9046912),vec2(88.3029923,49.8712949),vec2(88.3368603,49.0920579),vec2(86.5892926,48.9250778),vec2(86.6163863,49.6486551),vec2(85.1600798,49.5818627),vec2(85.2752300,48.8137577),vec2(83.6157180,48.6579096),vec2(83.5750765,49.3592229),vec2(82.2474669,49.2145069),vec2(82.4371265,47.1328309),vec2(55.3701470,44.3498300),vec2(55.3091847,45.6745329),vec2(54.9434147,45.6411369),vec2(54.8689057,46.3313182),vec2(53.8935190,46.2422622),vec2(53.9748016,45.5409489),vec2(52.1324046,45.3405729),vec2(52.0646690,46.0864140),vec2(50.9944531,45.9973579),vec2(51.0283211,45.2181209),vec2(49.2401123,45.0288768),vec2(49.1859238,45.7413221),vec2(47.8718612,45.6856617),vec2(47.9260497,44.8952928),vec2(46.1378408,44.7060487),vec2(46.0836524,45.3962301),vec2(44.8915131,45.3294378),vec2(44.9457016,44.5724647),vec2(44.6476668,44.5390687),vec2(44.8576468,42.6800319),vec2(45.7449816,34.7095506),vec2(71.0643933,37.2699116),vec2(82.3490750,38.2940565),vec2(82.9045065,32.1158203),vec2(77.0860542,31.5926158),vec2(77.4653731,27.6741669));bool hit=false;for(int i=0;i<45;i++){int j=i==0?44:i-1;vec2 a=pts[i],b=pts[j],d=b-a;float t=clamp(dot(q-a,d)/max(dot(d,d),.0000001),0.,1.);if(length(q-a-t*d)<.02)return true;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
bool cl018Cover5(vec2 q){const vec2 pts[45]=vec2[45](vec2(-25.9730227,10.1078940),vec2(-25.8240050,9.4288446),vec2(-43.2048532,7.7033838),vec2(-44.1531504,17.2991309),vec2(-46.1107062,35.7336518),vec2(-45.0201698,35.8338399),vec2(-45.0133960,35.3329018),vec2(-43.1709990,35.4887500),vec2(-43.1845463,36.1232716),vec2(-41.8704837,36.1900639),vec2(-41.8908040,35.6112021),vec2(-39.9806718,35.7781823),vec2(-39.9874456,36.4460997),vec2(-38.8156269,36.4572322),vec2(-38.7207974,35.8895024),vec2(-36.8445328,36.0453506),vec2(-36.8445331,36.6910041),vec2(-35.5304705,36.7466645),vec2(-35.3814523,35.1881905),vec2(-8.4296227,37.9823232),vec2(-8.6599228,38.9285395),vec2(-8.3551145,38.9508036),vec2(-8.3347942,39.6743808),vec2(-7.4135957,39.7189090),vec2(-7.3729543,39.0621236),vec2(-5.5102367,39.2624996),vec2(-5.5373312,39.9526810),vec2(-4.4400211,39.9860773),vec2(-4.3926062,39.3849516),vec2(-2.4079653,39.5853277),vec2(-2.4824744,40.3089049),vec2(-1.3716173,40.3311693),vec2(-1.3106554,39.7077797),vec2(0.6875326,39.8302321),vec2(0.6265706,40.6206010),vec2(1.9135391,40.6985253),vec2(1.9338600,40.0194759),vec2(2.1573861,40.0083440),vec2(2.2793103,38.1381752),vec2(2.9295708,32.4942729),vec2(-22.4643496,29.8448563),vec2(-22.1595396,26.4718733),vec2(-31.5476361,25.6035766),vec2(-30.8906014,18.4791240),vec2(-26.6503788,18.8798763));bool hit=false;for(int i=0;i<45;i++){int j=i==0?44:i-1;vec2 a=pts[i],b=pts[j],d=b-a;float t=clamp(dot(q-a,d)/max(dot(d,d),.0000001),0.,1.);if(length(q-a-t*d)<.02)return true;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
bool cl018Cover6(vec2 q){const vec2 pts[43]=vec2[43](vec2(71.0643933,37.2699116),vec2(45.7449816,34.7095506),vec2(46.4765247,28.3532032),vec2(47.2825733,28.4645231),vec2(62.2520490,29.8894200),vec2(62.5500852,27.0619029),vec2(62.1369006,27.0062429),vec2(63.0784243,17.4216278),vec2(63.5119294,17.5218156),vec2(65.4965800,-2.2819361),vec2(64.9682455,-2.3153322),vec2(65.4153000,-6.8905666),vec2(65.9097693,-11.9110793),vec2(66.3703685,-11.8776832),vec2(68.3685660,-31.5701154),vec2(67.8537787,-31.6925671),vec2(68.7885290,-41.4886894),vec2(72.3581731,-41.0545415),vec2(72.3581733,-41.3996322),vec2(82.1255869,-40.5758632),vec2(82.0917190,-40.0749251),vec2(85.4581578,-39.8968124),vec2(85.3159133,-38.7502208),vec2(84.5505016,-30.1563499),vec2(77.3908926,-30.8354023),vec2(75.8939378,-16.0298993),vec2(77.5399029,-16.0298987),vec2(77.0454334,-10.7088231),vec2(77.5263533,-10.6865590),vec2(77.0792987,-5.8886855),vec2(76.6322442,-1.0574161),vec2(76.0226275,-1.0796802),vec2(75.6636286,3.8740407),vec2(73.9228343,3.8517761),vec2(72.5207089,18.4791678),vec2(78.7591193,19.1359559),vec2(78.8471754,18.4235107),vec2(95.9909504,20.2602910),vec2(95.8758002,21.0061321),vec2(94.9478241,29.3550999),vec2(77.4653731,27.6741669),vec2(77.0860542,31.5926158),vec2(71.6198248,31.0916754));bool hit=false;for(int i=0;i<43;i++){int j=i==0?42:i-1;vec2 a=pts[i],b=pts[j],d=b-a;float t=clamp(dot(q-a,d)/max(dot(d,d),.0000001),0.,1.);if(length(q-a-t*d)<.02)return true;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
bool cl018Cover7(vec2 q){const vec2 pts[8]=vec2[8](vec2(18.9557207,23.0321158),vec2(18.4747983,28.3977191),vec2(21.9225173,32.5499408),vec2(27.2871439,33.0286172),vec2(31.4189920,29.5665802),vec2(31.8999144,24.2009768),vec2(28.4521954,20.0598871),vec2(23.0875688,19.5700787));bool hit=false;for(int i=0;i<8;i++){int j=i==0?7:i-1;vec2 a=pts[i],b=pts[j],d=b-a;float t=clamp(dot(q-a,d)/max(dot(d,d),.0000001),0.,1.);if(length(q-a-t*d)<.02)return true;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
bool cl018Covered(vec2 q){return cl018Cover0(q)||cl018Cover1(q)||cl018Cover2(q)||cl018Cover3(q)||cl018Cover4(q)||cl018Cover5(q)||cl018Cover6(q)||cl018Cover7(q);}
bool cl018Legacy_n28OldOverlap0(vec2 q){if(q.x<-130.373297||q.x>-109.219598||q.y<-3.228264||q.y>11.822144)return false;const vec2 r[8]=vec2[8](vec2(-109.287334,0.322827),vec2(-109.219598,-1.235646),vec2(-129.086328,-3.228264),vec2(-129.296307,-1.758848),vec2(-130.237826,8.582740),vec2(-130.373297,9.929709),vec2(-110.601396,11.822144),vec2(-110.465926,10.586495));bool h=false;for(int i=0;i<8;i++){vec2 a=r[i],b=r[(i+1)%8];if((a.y>q.y)!=(b.y>q.y)){float x=a.x+(q.y-a.y)*(b.x-a.x)/(b.y-a.y);if(q.x<x)h=!h;}}return h;}
bool cl018Legacy_n28OldOverlap1(vec2 q){if(q.x<-46.110727||q.x>2.929547||q.y<7.703315||q.y>40.698575)return false;const vec2 r[45]=vec2[45](vec2(-25.973057,10.107820),vec2(-25.824039,9.428770),vec2(-43.204888,7.703315),vec2(-44.153180,17.299079),vec2(-46.110727,35.733687),vec2(-45.020190,35.833875),vec2(-45.013417,35.332934),vec2(-43.171020,35.488782),vec2(-43.184567,36.123308),vec2(-41.870504,36.190100),vec2(-41.890825,35.611235),vec2(-39.980693,35.778215),vec2(-39.987466,36.446137),vec2(-38.815648,36.457269),vec2(-38.720818,35.889536),vec2(-36.844554,36.045384),vec2(-36.844554,36.691042),vec2(-35.530491,36.746702),vec2(-35.381474,35.188218),vec2(-8.429644,37.982358),vec2(-8.659943,38.928581),vec2(-8.355135,38.950845),vec2(-8.334814,39.674427),vec2(-7.413616,39.718956),vec2(-7.372975,39.062165),vec2(-5.510257,39.262542),vec2(-5.537351,39.952728),vec2(-4.440041,39.986125),vec2(-4.392627,39.384994),vec2(-2.407986,39.585371),vec2(-2.482495,40.308954),vec2(-1.371637,40.331218),vec2(-1.310676,39.707824),vec2(0.687512,39.830276),vec2(0.626550,40.620651),vec2(1.913519,40.698575),vec2(1.933840,40.019521),vec2(2.157366,40.008389),vec2(2.279289,38.138206),vec2(2.929547,32.494267),vec2(-22.464374,29.844847),vec2(-22.159566,26.471847),vec2(-31.547662,25.603550),vec2(-30.890631,18.479070),vec2(-26.650408,18.879822));bool h=false;for(int i=0;i<45;i++){vec2 a=r[i],b=r[(i+1)%45];if((a.y>q.y)!=(b.y>q.y)){float x=a.x+(q.y-a.y)*(b.x-a.x)/(b.y-a.y);if(q.x<x)h=!h;}}return h;}
bool cl018Legacy_n28OldOverlap2(vec2 q){if(q.x<44.647647||q.x>94.947795||q.y<27.674104||q.y>50.238744)return false;const vec2 r[45]=vec2[45](vec2(94.947795,29.355038),vec2(94.609119,32.494267),vec2(92.969928,49.515160),vec2(92.556743,49.481764),vec2(92.495781,50.227612),vec2(91.269775,50.238744),vec2(91.344283,49.370443),vec2(89.271587,49.181198),vec2(89.244492,49.904782),vec2(88.302973,49.871386),vec2(88.336841,49.092142),vec2(86.589273,48.925161),vec2(86.616367,49.648745),vec2(85.160061,49.581953),vec2(85.275211,48.813840),vec2(83.615699,48.657991),vec2(83.575058,49.359311),vec2(82.247448,49.214595),vec2(82.437106,47.132900),vec2(55.370127,44.349886),vec2(55.309165,45.674600),vec2(54.943395,45.641204),vec2(54.868886,46.331392),vec2(53.893500,46.242335),vec2(53.974782,45.541016),vec2(52.132385,45.340639),vec2(52.064650,46.086486),vec2(50.994434,45.997430),vec2(51.028301,45.218186),vec2(49.240092,45.028941),vec2(49.185904,45.741393),vec2(47.871842,45.685732),vec2(47.926030,44.895357),vec2(46.137821,44.706112),vec2(46.083633,45.396299),vec2(44.891494,45.329507),vec2(44.945682,44.572527),vec2(44.647647,44.539131),vec2(44.857626,42.680079),vec2(45.744957,34.709540),vec2(71.064369,37.269908),vec2(82.349051,38.294055),vec2(82.904479,32.115779),vec2(77.086027,31.592574),vec2(77.465344,27.674104));bool h=false;for(int i=0;i<45;i++){vec2 a=r[i],b=r[(i+1)%45];if((a.y>q.y)!=(b.y>q.y)){float x=a.x+(q.y-a.y)*(b.x-a.x)/(b.y-a.y);if(q.x<x)h=!h;}}return h;}
bool cl018Legacy_n28Wing0(vec2 q){const vec2 v[6]=vec2[6](vec2(-44.153180,17.299079),vec2(-110.465926,10.586495),vec2(-109.287334,0.322827),vec2(-53.121319,5.911069),vec2(-53.121319,6.634646),vec2(-43.204888,7.703315));bool h=false;for(int i=0;i<6;i++){vec2 a=v[i],b=v[(i+1)%6],d=b-a;if(length(q-(a+clamp(dot(q-a,d)/max(dot(d,d),.0001),0.,1.)*d))<.035)return true;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)h=!h;}return h;}
bool cl018Legacy_n28Wing1(vec2 q){const vec2 v[6]=vec2[6](vec2(-196.320272,1.914696),vec2(-130.237826,8.582740),vec2(-129.296307,-1.758848),vec2(-185.557152,-7.391609),vec2(-185.611340,-6.645769),vec2(-195.439715,-7.591983));bool h=false;for(int i=0;i<6;i++){vec2 a=v[i],b=v[(i+1)%6],d=b-a;if(length(q-(a+clamp(dot(q-a,d)/max(dot(d,d),.0001),0.,1.)*d))<.035)return true;if((a.y>q.y)!=(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)h=!h;}return h;}
float cl018Legacy_n28Rect(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.003));vec2 m=1.-smoothstep(h-a,h+a,abs(p-c));return m.x*m.y;}
vec3 cl018Legacy_ppNorthCoverage28(vec3 base,vec3 p,vec3 normal,vec4 fr,float family){
 if(family==4516.){if(cl018Legacy_n28OldOverlap0(fr.xy)||cl018Legacy_n28OldOverlap1(fr.xy)||cl018Legacy_n28OldOverlap2(fr.xy))discard;if(cl018Legacy_n28Wing0(fr.xy)||cl018Legacy_n28Wing1(fr.xy))return normal.y>.5?vec3(.63,.28,.17):vec3(.80,.72,.53);return vec3(1.);}
 if(family!=4515.||abs(normal.y)>.15)return base;
 vec2 q=vec2(fr.x/max(fr.w,.01),fr.y/max(fr.z,.01));vec3 c=base,trim=vec3(.90,.85,.74),glass=vec3(.16,.23,.21);float bays=clamp(floor(fr.w/5.6+.5),1.,16.);
 for(int i=0;i<16;i++){if(float(i)>=bays)continue;float x=(float(i)+.5)/bays,dx=(q.x-x)*bays/.28;float outer=step(abs(dx),1.)*step(.12,q.y)*step(q.y,.56+.17*sqrt(max(0.,1.-dx*dx)));float di=(q.x-x)*bays/.23;float pane=step(abs(di),1.)*step(.15,q.y)*step(q.y,.55+.145*sqrt(max(0.,1.-di*di)));c=mix(c,trim,outer);c=mix(c,glass,pane);for(int k=0;k<3;k++)c=mix(c,trim,cl018Legacy_n28Rect(q,vec2(x+(float(k)-1.)*.13/bays,.43),vec2(.009/bays,.29))*pane);for(int k=0;k<4;k++)c=mix(c,trim,cl018Legacy_n28Rect(q,vec2(x,.22+float(k)*.12),vec2(.24/bays,.006))*pane);}
 c=mix(c,trim,cl018Legacy_n28Rect(q,vec2(.5,.90),vec2(.5,.018)));c=mix(c,trim*.91,cl018Legacy_n28Rect(q,vec2(.5,.85),vec2(.5,.012)));c=mix(c,trim*.92,cl018Legacy_n28Rect(q,vec2(.5,.08),vec2(.5,.015)));return c;
}
float cl018Legacy_pnb05Rect(vec2 p,vec2 c,vec2 h){vec2 a=max(fwidth(p),vec2(.002));vec2 m=1.-smoothstep(h-a,h+a,abs(p-c));return m.x*m.y;}
float cl018Legacy_pnb05Arch(vec2 p,float x,float hw,float y,float hh){float q=(p.x-x)/hw;return step(abs(q),1.)*step(p.y,y+hh*sqrt(max(0.,1.-q*q)));}
vec3 cl018Legacy_ppNorthBerlinBatch05(vec3 base,vec3 p,vec3 n,vec4 fr,float family){
 if(family<4436.||family>4442.)return base;
 if(family==4441.)return base*(.93+.07*n.y+.04*n.x-.025*n.z);
 if(abs(n.y)>.12)return base;
 vec2 uv=vec2(fr.x/max(fr.w,.01),fr.y/max(fr.z,.01));vec3 c=base;
 if(family==4436.){
  vec3 stone=base,glass=vec3(.21,.28,.23);c=mix(c,vec3(.52,.51,.42),1.-smoothstep(.28,.30,uv.y));
  for(int j=0;j<19;j++){
   float x=(float(j)+.5)/19.;c=mix(c,glass,cl018Legacy_pnb05Rect(uv,vec2(x,.14),vec2(.014,.062)));
   float a=cl018Legacy_pnb05Arch(uv,x,.019,.57,.08)*step(.35,uv.y);c=mix(c,stone*.82,a);c=mix(c,glass,cl018Legacy_pnb05Arch(uv,x,.013,.57,.06)*step(.37,uv.y));
   c=mix(c,glass,cl018Legacy_pnb05Rect(uv,vec2(x,.82),vec2(.014,.046)));
  }
  for(int j=0;j<6;j++)c=mix(c,stone*1.07,cl018Legacy_pnb05Rect(uv,vec2(.35+.06*float(j),.59),vec2(.010,.29)));
  for(int j=0;j<3;j++)c=mix(c,vec3(.13,.18,.14),cl018Legacy_pnb05Rect(uv,vec2(.44+.06*float(j),.10),vec2(.019,.10)));
  return c;
 }
 if(family==4437.||family==4438.){
  vec3 wood=vec3(.35,.21,.12),glass=vec3(.27,.33,.28),grey=vec3(.56,.57,.52);
  if(family==4437.){
   const vec4 openings[5]=vec4[5](vec4(.22,.14,.16,.14),vec4(.40,.44,.20,.13),vec4(.75,.75,.10,.20),vec4(.17,.78,.13,.08),vec4(.89,.16,.06,.16));
   for(int j=0;j<5;j++){vec4 w=openings[j];c=mix(c,wood,cl018Legacy_pnb05Rect(uv,w.xy,w.zw));c=mix(c,glass,cl018Legacy_pnb05Rect(uv,w.xy,w.zw-vec2(.008)));}
  }else{
   const vec4 openings[4]=vec4[4](vec4(.18,.14,.14,.14),vec4(.55,.43,.18,.12),vec4(.82,.75,.075,.24),vec4(.28,.79,.16,.09));
   for(int j=0;j<4;j++){vec4 w=openings[j];c=mix(c,wood,cl018Legacy_pnb05Rect(uv,w.xy,w.zw));c=mix(c,glass,cl018Legacy_pnb05Rect(uv,w.xy,w.zw-vec2(.008)));}
  }
  for(int j=0;j<3;j++)c=mix(c,grey,cl018Legacy_pnb05Rect(uv,vec2(.5,.29+.30*float(j)),vec2(.5,.009)));
  return c;
 }
 if(family==4439.){
  vec3 stone=vec3(.68,.62,.55);c=stone*.91;
  // Solid masonry behind the portico: the side intercolumniations are not doors.
  float bed=1.-smoothstep(.004,.009,min(fract(uv.y/.14),1.-fract(uv.y/.14)));
  c=mix(c,stone*.73,bed*.45);
  float rearJoint=1.-smoothstep(.004,.009,min(fract(uv.x*5.),1.-fract(uv.x*5.)));
  c=mix(c,stone*.76,rearJoint*.25);
  c=mix(c,stone*1.03,cl018Legacy_pnb05Rect(uv,vec2(.5,.26),vec2(.130,.26)));
  c=mix(c,vec3(.19,.23,.18),cl018Legacy_pnb05Rect(uv,vec2(.5,.235),vec2(.101,.235)));
  // Restrained panel expression belongs only to the central entrance leaf.
  for(int k=0;k<3;k++){
   vec2 dc=vec2(.5,.075+.145*float(k));
   c=mix(c,vec3(.30,.33,.27),cl018Legacy_pnb05Rect(uv,dc,vec2(.080,.055)));
   c=mix(c,vec3(.20,.24,.19),cl018Legacy_pnb05Rect(uv,dc,vec2(.064,.041)));
  }
  for(int j=0;j<4;j++){
   float x=.075+.283*float(j),d=(uv.x-x)/.034;
   float shaft=(1.-smoothstep(.93,1.04,abs(d)))*smoothstep(.025,.040,uv.y)*(1.-smoothstep(.635,.653,uv.y));
   float roundLight=.73+.38*sqrt(max(0.,1.-d*d))-.12*d;
   float flute=(.5+.5*cos(d*18.8495559))*.045;
   c=mix(c,stone*(roundLight-flute),shaft);
   c=mix(c,stone*.80,cl018Legacy_pnb05Rect(uv,vec2(x,.650),vec2(.041,.014)));
   c=mix(c,stone*1.10,cl018Legacy_pnb05Rect(uv,vec2(x,.671),vec2(.050,.014)));
   c=mix(c,stone*.91,cl018Legacy_pnb05Rect(uv,vec2(x,.043),vec2(.043,.013)));
   c=mix(c,stone*1.08,cl018Legacy_pnb05Rect(uv,vec2(x,.022),vec2(.049,.010)));
  }
  c=mix(c,stone*.78,cl018Legacy_pnb05Rect(uv,vec2(.5,.710),vec2(.5,.014)));
  c=mix(c,stone*1.05,cl018Legacy_pnb05Rect(uv,vec2(.5,.751),vec2(.5,.029)));
  c=mix(c,stone*.90,cl018Legacy_pnb05Rect(uv,vec2(.5,.801),vec2(.5,.020)));
  // No supported native pediment face: do not draw a false triangle on this flat wall.
  return c;
 }
 if(family==4440.){
  vec3 trim=vec3(.86,.83,.72),glass=vec3(.27,.33,.28);
  for(int j=0;j<3;j++){
   float x=.22+.28*float(j);float a=cl018Legacy_pnb05Arch(uv,x,.09,.38,.13)*step(.02,uv.y);c=mix(c,trim,a);float inner=cl018Legacy_pnb05Arch(uv,x,.066,.38,.105)*step(.035,uv.y);c=mix(c,glass,inner);
   vec2 q=(uv-vec2(x,.76))*vec2(1.,.75);float surround=1.-smoothstep(.056,.067,length(q));float eye=1.-smoothstep(.038,.047,length(q));c=mix(c,trim,surround);c=mix(c,glass,eye);
  }
  for(int j=0;j<4;j++)c=mix(c,trim,cl018Legacy_pnb05Rect(uv,vec2(.08+.28*float(j),.50),vec2(.012,.44)));
  return mix(c,trim,cl018Legacy_pnb05Rect(uv,vec2(.5,.57),vec2(.5,.018)));
 }
 // Singakademie: three doors, four pilasters; upper panels deliberately blind.
 vec3 trim=vec3(.69,.68,.59),cream=vec3(.88,.86,.75);
 for(int j=0;j<3;j++){
  float x=.22+.28*float(j);c=mix(c,trim,cl018Legacy_pnb05Rect(uv,vec2(x,.22),vec2(.09,.22)));c=mix(c,vec3(.36,.20,.13),cl018Legacy_pnb05Rect(uv,vec2(x,.20),vec2(.066,.20)));
  c=mix(c,trim,cl018Legacy_pnb05Rect(uv,vec2(x,.65),vec2(.10,.12)));c=mix(c,cream*.98,cl018Legacy_pnb05Rect(uv,vec2(x,.65),vec2(.09,.105)));
 }
 for(int j=0;j<4;j++)c=mix(c,cream*1.05,cl018Legacy_pnb05Rect(uv,vec2(.08+.28*float(j),.43),vec2(.017,.40)));
 c=mix(c,trim,cl018Legacy_pnb05Rect(uv,vec2(.5,.84),vec2(.5,.027)));
 float ped=step(.88,uv.y)*step(uv.y,.995-.18*abs(uv.x-.5));return mix(c,cream,ped);
}

float cl018Box(vec2 q,vec2 at,vec2 halfsize){vec2 d=abs(q-at)-halfsize;return 1.-smoothstep(-.02,.02,max(d.x,d.y));}
float cl018Arch(vec2 q,float x,float low,float spring,float radius){float stem=cl018Box(q,vec2(x,(low+spring)*.5),vec2(radius,(spring-low)*.5));float top=(1.-smoothstep(radius-.02,radius+.02,length(q-vec2(x,spring))))*step(spring,q.y);return max(stem,top);}
vec3 cl018Window(vec3 c,vec2 q,float x,float y,float w,float h,float head){vec3 trim=vec3(.91,.86,.72),glass=vec3(.12,.20,.19);float surround=cl018Box(q,vec2(x,y),vec2(w*.5+.13,h*.5+.12));c=mix(c,trim,surround);float pane=cl018Box(q,vec2(x,y),vec2(w*.5,h*.5));c=mix(c,glass,pane);float cross=max(cl018Box(q,vec2(x,y),vec2(.025,h*.5)),cl018Box(q,vec2(x,y+.15),vec2(w*.5,.025)));for(int i=0;i<5;i++)cross=max(cross,cl018Box(q,vec2(x,y-h*.4+float(i)*h*.2),vec2(w*.5,.012)));c=mix(c,trim*.86,cross*pane);c=mix(c,trim,cl018Box(q,vec2(x,y-h*.5-.18),vec2(w*.5+.18,.055)));if(head>.5){float dy=q.y-(y+h*.5+.25);float line=1.-smoothstep(.035,.09,abs(dy-.36*(1.-abs(q.x-x)/max(w*.65,.1))));c=mix(c,trim,line*step(abs(q.x-x),w*.65));}return c;}
vec3 cl018Bands(vec3 c,vec2 q,float h){vec3 trim=vec3(.91,.86,.74);c=mix(c,vec3(.69,.65,.55),1.-smoothstep(.38,.48,q.y));for(int i=0;i<3;i++){float y=i==0?6.0:i==1?h-.5:h-.15;c=mix(c,trim,cl018Box(q,vec2(q.x,y),vec2(1000.,i==0?.10:.07)));}float joints=(1.-smoothstep(.014,.033,min(mod(q.y,.48),.48-mod(q.y,.48))))*(1.-step(5.7,q.y));c=mix(c,vec3(.72,.68,.57),joints*.22);return c;}
vec3 charlottenburgCompletion6436(vec3 base,vec3 p,vec3 normal,vec4 f,float family){
 // Parent proxy preserves original first4parameters and literal original family through unique frozen tuple classification.
 if(abs(f.z-100.4769973755)<.01&&abs(f.w-495.1099853516)<.01){if(cl018Covered(f.xy))discard;return cl018Legacy_ppNorthCoverage28(base,p,normal,f,4516.);}
 if((abs(f.z-7.5)<.001||abs(f.z-5.)<.001)&&(abs(f.w-66.5293731689)<.001||abs(f.w-66.6366729736)<.001))return cl018Legacy_ppNorthCoverage28(base,p,normal,f,4515.);
 if(abs(f.z-7.5)<.001&&abs(f.w-19.9100036621)<.001)return cl018Legacy_ppNorthBerlinBatch05(base,p,normal,f,4440.);
 vec2 q=f.xy;float role=f.w;vec3 c=vec3(.88,.82,.66),trim=vec3(.95,.89,.76),shade=vec3(.67,.63,.52),glass=vec3(.12,.19,.18);
 if(role<1.5)return c;
 if(abs(role-20.)<.25){float a=mod(q.x,.44),b=mod(q.y,.32),joint=max(1.-smoothstep(.009,.025,min(a,.44-a)),1.-smoothstep(.009,.025,min(b,.32-b)));return vec3(.56,.22,.13)*(1.-joint*.08);}
 if(abs(role-21.)<.25){float a=mod(q.x,.75);return mix(vec3(.28,.30,.29),vec3(.20,.23,.23),(1.-smoothstep(.012,.032,min(a,.75-a)))*.55);}
 if(role>=9.5&&role<13.){float h=f.z;if(q.y>h-.2)return c;c=cl018Bands(c,q,h);float pitch=4.2;float x=(floor(q.x/pitch)+.5)*pitch;float crown=role>10.5&&role<11.5?1.:0.;
  if(abs(role-12.)<.25){
   // Exact source projection module161.61..184.52; official SPSG route records17 outer bays before the central five-bay risalit.
   if(q.x<161.61)x=97.21+(floor((q.x-97.21)/3.7882353)+.5)*3.7882353;else if(q.x>184.52)x=184.52+(floor((q.x-184.52)/3.8429412)+.5)*3.8429412;else x=161.61+(floor((q.x-161.61)/4.582)+.5)*4.582;
   if(q.x>=161.61&&q.x<=184.52){float outer=cl018Arch(q,x,7.0,10.0,1.15),inner=cl018Arch(q,x,7.15,10.0,.93);c=mix(c,trim,outer);c=mix(c,glass,inner);c=mix(c,trim,cl018Box(q,vec2(x,8.7),vec2(.025,1.8))*inner);float colx=161.61+floor((q.x-161.61)/4.582+.5)*4.582;float shaft=cl018Box(q,vec2(colx,2.9),vec2(.25,2.65));float round=.79+.21*sqrt(max(0.,1.-pow((q.x-colx)/.25,2.)));c=mix(c,trim*round,shaft);c=mix(c,trim,cl018Box(q,vec2(colx,5.6),vec2(.45,.18)));float door=cl018Arch(q,x,.08,3.9,1.2);c=mix(c,glass,door*(1.-shaft));return c;}
  }
  c=cl018Window(c,q,x,3.05,1.4,2.8,0.);c=cl018Window(c,q,x,9.0,1.45,3.05,crown);float pier=cl018Box(q,vec2(floor(q.x/pitch)*pitch,6.2),vec2(.16,5.7));return mix(c,trim*.93,pier*.5);
 }
 // F018 courtyard central projection: three tall arched upper openings over three ground arches.
 // Bounded to the source021 south-facing projected wall; rear and flank programs stay unchanged.
 if(abs(role-32.)<.25&&normal.z<-.85&&q.x>21.0&&q.x<34.5){
  c=vec3(.89,.84,.70);c=cl018Bands(c,q,15.);
  for(int k=0;k<3;k++){
   float x=24.1+3.72*float(k);
   float surround=cl018Arch(q,x,6.75,11.45,1.15);
   float pane=cl018Arch(q,x,6.92,11.45,.94);
   c=mix(c,trim,surround);c=mix(c,glass,pane);
   float bars=cl018Box(q,vec2(x,9.7),vec2(.025,3.1));
   for(int j=0;j<6;j++)bars=max(bars,cl018Box(q,vec2(x,7.45+.85*float(j)),vec2(1.0,.022)));
   c=mix(c,trim*.92,bars*pane);
   float entryOuter=cl018Arch(q,x,.02,3.85,1.28);
   float entry=cl018Arch(q,x,.08,3.85,1.10);
   c=mix(c,trim,entryOuter);c=mix(c,vec3(.12,.15,.13),entry);
   c=mix(c,trim,cl018Box(q,vec2(x,6.35),vec2(1.38,.10)));
  }
  for(int k=0;k<4;k++){
   float x=22.22+3.72*float(k);
   float shaft=cl018Box(q,vec2(x,9.55),vec2(.16,3.05));
   float shadeAcross=.83+.17*clamp((q.x-x+.16)/.32,0.,1.);
   c=mix(c,trim*shadeAcross,shaft);
   c=mix(c,trim,cl018Box(q,vec2(x,12.65),vec2(.31,.16)));
   c=mix(c,trim,cl018Box(q,vec2(x,6.49),vec2(.29,.13)));
  }
  c=mix(c,trim,cl018Box(q,vec2(27.8,13.25),vec2(6.55,.13)));
  float pediment=step(13.47,q.y)*step(q.y,14.94-.235*abs(q.x-27.8));
  c=mix(c,vec3(.94,.89,.76),pediment);
  float slope=1.-smoothstep(.045,.10,abs(q.y-(14.94-.235*abs(q.x-27.8))));
  c=mix(c,trim*.82,slope*step(13.47,q.y));
  return c;
 }
 if(role>=31.5&&role<34.5){if(q.y>15.)return c;c=cl018Bands(c,q,15.);float x=27.51260254+(floor((q.x-27.51260254)/4.05)+.5)*4.05;c=cl018Window(c,q,x,3.2,1.5,2.9,0.);c=cl018Window(c,q,x,8.8,1.5,3.2,1.);c=cl018Window(c,q,x,13.0,1.35,1.25,0.);return c;}
 float face=floor((f.x+5.)/10.);q.x=f.x-face*10.;
 if(abs(role-30.)<.25){c=cl018Bands(c,q,15.);float door=cl018Arch(q,0.,.05,4.3,1.12);c=mix(c,trim,cl018Arch(q,0.,.02,4.3,1.30));c=mix(c,vec3(.10,.14,.12),door);float arch=cl018Arch(q,0.,8.0,12.3,1.0);c=mix(c,trim,cl018Arch(q,0.,7.84,12.3,1.17));c=mix(c,glass,arch);for(int i=0;i<5;i++)c=mix(c,trim,cl018Box(q,vec2(0.,8.6+float(i)*.8),vec2(1.0,.025))*arch);c=mix(c,trim,cl018Box(q,vec2(0.,10.2),vec2(.025,2.2))*arch);float column=cl018Box(q,vec2(1.65,10.1),vec2(.16,3.0))+cl018Box(q,vec2(-1.65,10.1),vec2(.16,3.0));return mix(c,trim,column);}
 if(abs(role-40.)<.25){c=mix(c,trim,cl018Box(q,vec2(0.,17.4),vec2(5.,.16)));float outer=cl018Arch(q,0.,18.3,22.8,1.05),inner=cl018Arch(q,0.,18.5,22.8,.83);c=mix(c,trim,outer);c=mix(c,glass,inner);c=mix(c,trim,cl018Box(q,vec2(0.,21.),vec2(.026,2.5))*inner);if(abs(face-1.0)<.25){vec2 z=q-vec2(0.,25.9);float r=length(z);c=mix(c,trim,1.-smoothstep(.98,1.03,r));c=mix(c,vec3(.13,.20,.20),1.-smoothstep(.85,.90,r));float ticks=step(.93,cos(atan(z.y,z.x)*12.))*step(.66,r)*(1.-step(.82,r));c=mix(c,trim,ticks);c=mix(c,trim,max(cl018Box(z,vec2(.25,.05),vec2(.27,.025)),cl018Box(z,vec2(.02,.23),vec2(.025,.25))));}return c;}
 if(abs(role-41.)<.25){vec3 copper=vec3(.27,.48,.43);float seam=1.-smoothstep(.025,.08,abs(q.x));c=mix(copper,vec3(.18,.34,.31),seam*.35);float nearFace=step(abs(face-1.0),1.1);float hood=cl018Arch(q,0.,28.4,29.6,.45)*nearFace;c=mix(c,trim,cl018Arch(q,0.,28.28,29.6,.58)*nearFace);return mix(c,glass,hood);}
 if(abs(role-42.)<.25){vec3 copper=vec3(.29,.46,.41);float opening=cl018Arch(q,0.,35.9,38.4,.43);return mix(copper,vec3(.055,.10,.09),opening);}
 if(abs(role-43.)<.25)return vec3(.27,.45,.39);
 if(abs(role-44.)<.25)return vec3(.79,.60,.20);
 return c;
}
`;
