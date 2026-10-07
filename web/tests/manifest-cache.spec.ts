import {test,expect} from "@playwright/test";
import {fetchDataJSON,fetchFreshManifest} from "../src/safety/security";
test("bootstrap manifest bypasses a cached generation while ordinary data keeps default caching",async()=>{
  const nativeFetch=globalThis.fetch;
  const requests:Array<{url:string;options:RequestInit|undefined}>=[];
  globalThis.fetch=async(input,options)=>{
    requests.push({url:String(input),options});
    return new Response(JSON.stringify({generation:options?.cache==="no-store"?"current":"cached"}),{status:200});
  };
  try {
    expect(await fetchDataJSON("/crimemaps-Berlin/safety/month.json")).toEqual({generation:"cached"});
    const signal=new AbortController().signal;
    expect(await fetchFreshManifest("/crimemaps-Berlin/safety/manifest.json",signal)).toEqual({generation:"current"});
    expect(requests[1].options).toMatchObject({cache:"no-store",credentials:"omit",redirect:"error",referrerPolicy:"no-referrer",signal});
    expect(requests[0].options?.cache).toBe("default");
    await expect(fetchFreshManifest("//foreign.example/manifest.json")).rejects.toThrow();
    expect(requests).toHaveLength(2);
  } finally {globalThis.fetch=nativeFetch;}
});
test("fresh manifests retain the bounded-download rejection",async()=>{
  const nativeFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response("{}",{headers:{"content-length":String(64*1024*1024+1)}});
  try {await expect(fetchFreshManifest("/safety/manifest.json")).rejects.toThrow("Data response exceeds limit");}
  finally {globalThis.fetch=nativeFetch;}
});
