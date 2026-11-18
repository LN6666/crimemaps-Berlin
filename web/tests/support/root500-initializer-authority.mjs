import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRuntimeLoader} from './fixtures-managers-a-runtime.mjs';

// Code-owned initializer references retain their reviewed source digests. The
// published authorization table names the verified, portable representations.
export async function root500InitializerAuthority() {
 const directory=new URL('../../src/safety/',import.meta.url);
 const [manifest,dependencies]=await Promise.all(['frozen-paint-table-manifest.json','frozen-paint-table-dependencies.json'].map(async name=>
  JSON.parse(await readFile(new URL(name,directory),'utf8'))));
 const runtime=createRuntimeLoader();
 const {createCityFrozenProfile}=runtime.load(fileURLToPath(new URL('city-frozen-profile.ts',directory)));
 const {resolve}=createCityFrozenProfile(manifest,dependencies,null,'');
 return {initializers:dependencies.initializers.root500,resolve};
}
