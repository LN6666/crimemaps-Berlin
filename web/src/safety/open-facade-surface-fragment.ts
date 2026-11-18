import {emitFacadeHelper,OPEN_FACADE_SURFACE_HELPER} from './facade-helper-source';
/** Existing wall/roof/source colours stay intact; official CC0 windows are a display overlay only.
 * The template and its exact length descriptor live in facade-helper-source. */
export function openFacadeSurfaceFragment(existing:string){
 return emitFacadeHelper(OPEN_FACADE_SURFACE_HELPER,existing);
}
