import type {SourceTextureOptions} from './source-material-texture';
import {createSourceDiffuseTexture} from './source-diffuse-texture';
import {emitFacadeHelper,OPEN_FACADE_DIFFUSE_HELPER} from './facade-helper-source';
/** Deterministic256display derivatives of originalCC0 OSM2World default-style diffuse pixels. */
export const OPEN_FACADE_DIFFUSE_ASSETS={plaster:{path:'/assets/3d-materials/plaster002-5dbf2c4b731a.png',bytes:95359,sha256:'5dbf2c4b731a721bb73ee1a53c397e3feb23ad2a9cc24213ede4dac3ec507ea2'},brick:{path:'/assets/3d-materials/bricks029-da249cffc10c.png',bytes:117467,sha256:'da249cffc10c296e44fd64921039a3b8f1e306a51218cd6e7f9fb43a3c3d68d4'}} as const;
export function createOpenFacadeDiffuse(options:SourceTextureOptions){
 const plaster=createSourceDiffuseTexture({...options,asset:OPEN_FACADE_DIFFUSE_ASSETS.plaster,textureUnit:4,samplerName:'u_source_plaster_diffuse',readyName:'u_source_plaster_ready'}),brick=createSourceDiffuseTexture({...options,asset:OPEN_FACADE_DIFFUSE_ASSETS.brick,textureUnit:5,samplerName:'u_source_brick_diffuse',readyName:'u_source_brick_ready'});let enabled=false,hidden=false,wantPlaster=false,wantBrick=false;
 function isResident(gl:WebGL2RenderingContext){return plaster.isResident(gl)&&brick.isResident(gl);}
 function sync(){plaster.setPageHidden(hidden);brick.setPageHidden(hidden);plaster.setEnabled(enabled&&wantPlaster);brick.setEnabled(enabled&&wantBrick);}
 return {setUploadSize(value:128|256){plaster.setUploadSize(value);brick.setUploadSize(value);},isResident,withResidentTextures<T>(gl:WebGL2RenderingContext,program:WebGLProgram|undefined,draw:()=>T,unavailable:()=>T):T{if(!program||!isResident(gl))return unavailable();return plaster.withResidentTexture(gl,program,()=>brick.withResidentTexture(gl,program,draw,unavailable),unavailable);},setNeededMaterials(values:readonly {material:number;roof:boolean}[]){wantPlaster=values.some(v=>!v.roof&&(v.material===0||v.material===3||v.material===4));wantBrick=values.some(v=>!v.roof&&v.material===1);sync();},setEnabled(value:boolean){enabled=value;sync();},setPageHidden(value:boolean){hidden=value;sync();},attach(gl:WebGL2RenderingContext){plaster.attach(gl);brick.attach(gl);},detach(){plaster.detach();brick.detach();},withTextures<T>(gl:WebGL2RenderingContext,program:WebGLProgram|undefined,draw:()=>T,fallbackDraw:()=>T):T{return plaster.withTexture(gl,program,()=>brick.withTexture(gl,program,draw,fallbackDraw),fallbackDraw);},get stats(){return {plaster:plaster.stats,brick:brick.stats,neededMaterials:{plaster:wantPlaster,brick:wantBrick},residentRevision:`${plaster.stats.residentRevision}:${brick.stats.residentRevision}`,totalTextureObjects:plaster.stats.textureObjects+brick.stats.textureObjects,totalCityBitmapCacheEntries:plaster.stats.cityCacheEntries+brick.stats.cityCacheEntries,logicalGPUTextureRGBABytes:plaster.stats.logicalGPUTextureRGBABytes+brick.stats.logicalGPUTextureRGBABytes,maximumCombinedWithWindowsLogicalGPUMipBytes:((plaster.stats.uploadWidth**2*4*4-4)/3)*3,physicalDiffuseAssetsBytes:95359+117467,sourceMaterialVisibleLazy:true};},destroy(){plaster.destroy();brick.destroy();}};
}
/** Compose before the existing officialwindow helper; roof/source colours and allsource facts stay separate.
 * The template and its exact length descriptor live in facade-helper-source. */
export function openFacadeDiffuseFragment(existing:string){return emitFacadeHelper(OPEN_FACADE_DIFFUSE_HELPER,existing);}

/** Renderer-onlyschematicdefault flag; explicitraw keys,evenunrecognisedtokens, are protected. */
export function neutralSchematicFacadeStyle<T extends {styleId:number}>(raw:Record<string,unknown>|null|undefined,style:T):T{
 const p=raw??{};if(p.building==='roof'||['building:material','building:colour','building:color'].some(key=>Object.hasOwn(p,key)))return style;
 return {...style,styleId:style.styleId+16};
}
