import {createSourceDiffuseTexture,type DiffuseAsset} from './source-diffuse-texture';
/** Deterministic256display derivatives of originalCC0 OSM2World default-style diffuse pixels. */
export const OPEN_FACADE_DIFFUSE_ASSETS={plaster:{path:'/assets/3d-materials/plaster002-5dbf2c4b731a.png',bytes:95359,sha256:'5dbf2c4b731a721bb73ee1a53c397e3feb23ad2a9cc24213ede4dac3ec507ea2'},brick:{path:'/assets/3d-materials/bricks029-da249cffc10c.png',bytes:117467,sha256:'da249cffc10c296e44fd64921039a3b8f1e306a51218cd6e7f9fb43a3c3d68d4'}} as const;
export function createOpenFacadeDiffuse(options:{readBytes:(asset:DiffuseAsset,signal:AbortSignal)=>Promise<Uint8Array>;requestRepaint:()=>void;decodeBitmap?:(blob:Blob,options:ImageBitmapOptions)=>Promise<ImageBitmap>}){
 const plaster=createSourceDiffuseTexture({...options,asset:OPEN_FACADE_DIFFUSE_ASSETS.plaster,textureUnit:4,samplerName:'u_source_plaster_diffuse',readyName:'u_source_plaster_ready'}),brick=createSourceDiffuseTexture({...options,asset:OPEN_FACADE_DIFFUSE_ASSETS.brick,textureUnit:5,samplerName:'u_source_brick_diffuse',readyName:'u_source_brick_ready'});let enabled=false,hidden=false,wantPlaster=false,wantBrick=false;
 function sync(){plaster.setPageHidden(hidden);brick.setPageHidden(hidden);plaster.setEnabled(enabled&&wantPlaster);brick.setEnabled(enabled&&wantBrick);}
 return {setNeededMaterials(values:readonly {material:number;roof:boolean}[]){wantPlaster=values.some(v=>!v.roof&&(v.material===0||v.material===3||v.material===4));wantBrick=values.some(v=>!v.roof&&v.material===1);sync();},setEnabled(value:boolean){enabled=value;sync();},setPageHidden(value:boolean){hidden=value;sync();},attach(gl:WebGL2RenderingContext){plaster.attach(gl);brick.attach(gl);},detach(){plaster.detach();brick.detach();},withTextures<T>(gl:WebGL2RenderingContext,program:WebGLProgram|undefined,draw:()=>T,fallbackDraw:()=>T):T{return plaster.withTexture(gl,program,()=>brick.withTexture(gl,program,draw,fallbackDraw),fallbackDraw);},get stats(){return {plaster:plaster.stats,brick:brick.stats,totalTextureObjects:plaster.stats.textureObjects+brick.stats.textureObjects,totalCityBitmapCacheEntries:plaster.stats.cityCacheEntries+brick.stats.cityCacheEntries,logicalGPUTextureRGBABytes:plaster.stats.logicalGPUTextureRGBABytes+brick.stats.logicalGPUTextureRGBABytes,maximumCombinedWithWindowsLogicalGPUMipBytes:349524*3,physicalDiffuseAssetsBytes:95359+117467,sourceMaterialVisibleLazy:true};},destroy(){plaster.destroy();brick.destroy();}};
}
/** Compose before the existing officialwindow helper; roof/source colours and allsource facts stay separate. */
export function openFacadeDiffuseFragment(existing:string){if(!existing.includes('vec3 sourceFacade('))throw Error('Expectedsource facade helper');return `uniform sampler2D u_source_plaster_diffuse;uniform sampler2D u_source_brick_diffuse;
uniform float u_source_plaster_ready;uniform float u_source_brick_ready;
`+existing.replace('vec3 sourceFacade(','vec3 sourceFacadeWithoutDiffuse(')+`
vec3 sourceFacade(vec3 base,vec3 p,vec3 normal,float material,float hasWindows){
 float wall=1.-smoothstep(.18,.42,abs(normal.y));
 vec2 metres=vec2(abs(normal.x)>abs(normal.z)?p.z:p.x,p.y);
 float detail=1.-smoothstep(.35,.8,max(length(fwidth(metres)),.0001));
 float roof=step(32.,v_style);float ready=0.;vec3 albedo=vec3(1.);
 if(material>.5&&material<1.5){ready=u_source_brick_ready;albedo=texture(u_source_brick_diffuse,metres/1.4).rgb;}
 else if(material<.5||(material>2.5&&material<4.5)){ready=u_source_plaster_ready;albedo=texture(u_source_plaster_diffuse,metres/2.5).rgb;}
 // Actualpixel luminance controls grain/mortar; incomingnativecolour hue is not overwritten.
 ready*=1.-roof;
 float luminance=dot(albedo,vec3(.2126,.7152,.0722));
 float reference=(material>.5&&material<1.5)?.50:.78;
 vec3 diffuse=base*clamp(luminance/reference,.65,1.30);
 vec3 beforeWindows=mix(base,diffuse,ready*wall*detail);
 return sourceFacadeWithoutDiffuse(beforeWindows,p,normal,ready>.5?0.:material,hasWindows);
}
`;}

/** Renderer-onlyschematicdefault flag; explicitraw keys,evenunrecognisedtokens, are protected. */
export function neutralSchematicFacadeStyle<T extends {styleId:number}>(raw:Record<string,unknown>|null|undefined,style:T):T{
 const p=raw??{};if(p.building==='roof'||['building:material','building:colour','building:color'].some(key=>Object.hasOwn(p,key)))return style;
 return {...style,styleId:style.styleId+16};
}
