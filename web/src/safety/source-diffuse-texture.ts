import {createSourceMaterialTexture,type SourceTextureOptions,type SourceTextureAsset} from './source-material-texture';
/** Official CC0 pixels; source geometry, UVs and material formula stay unchanged. */
export type DiffuseAsset=SourceTextureAsset;
export function createSourceDiffuseTexture(options:SourceTextureOptions&{asset:DiffuseAsset;textureUnit:4|5;samplerName:string;readyName:string}){
 return createSourceMaterialTexture({...options,sourceSize:256,label:'Diffuse'});
}
