import { defineConfig } from "@playwright/test";
import {readFileSync} from "node:fs";
const city = JSON.parse(readFileSync(new URL("../city-config.json", import.meta.url), "utf8"));
if (!/^\/crimemaps-[A-Z][a-z]+\/$/.test(city.base_path)) throw Error("Invalid repository test prefix");
export default defineConfig({
  testDir: "tests",
  // Node unit checks have their own commands; only browser specs belong here.
  testMatch: /\.spec\.[jt]s$/,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-webgl"] },
  },
  projects: [
    {name:"regression-fixtures", testIgnore:"cities.spec.ts"},
    {name:"repository-entry", testMatch:"cities.spec.ts",
      use:{baseURL:`http://127.0.0.1:4174${city.base_path}`}},
  ],
  webServer: [{
    command:
      "node test-fixture-build.mjs && npm exec vite preview -- --outDir dist-fixture --base / --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    // Frozen material dispatches take longer to compile on the CI runner.
    timeout: 180_000,
    reuseExistingServer: false,
  }, {
    command:`npm run build && npm exec vite preview -- --base ${city.base_path} --host 127.0.0.1 --port 4174`,
    url:`http://127.0.0.1:4174${city.base_path}`,
    timeout:180_000,
    reuseExistingServer:false,
  }],
});
