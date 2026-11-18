import {createSourceMaterialTexture,type SourceTextureOptions} from './source-material-texture';
export const OPEN_FACADE_WINDOW_ASSET={path:'/assets/3d-materials/osm2world-windows-7e2f0946.png',bytes:13651,sha256:'7e2f09469e1b4a683bed7e41306d9e7800da1a9aecfd5688e22b77fb4a2d0386',sourceCommit:'81ade9bf9793181774891548ac29448f366efd3c',sourceURL:'https://raw.githubusercontent.com/tordanik/OSM2World-default-style/81ade9bf9793181774891548ac29448f366efd3c/textures/custom/Windows/Windows_Color.png',licence:'CC0-1.0/public-domain',repeatMetres:2.5} as const;
export function createOpenFacadeWindowTexture(options:SourceTextureOptions){
 return createSourceMaterialTexture({...options,asset:OPEN_FACADE_WINDOW_ASSET,sourceSize:1024,textureUnit:3,samplerName:'u_source_window_texture',readyName:'u_source_window_ready',label:'Window'});
}
