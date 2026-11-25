import { existsSync } from "node:fs";

import { typescriptLintPreset } from "@toruslabs/oxlint-config-typescript";
import { formatPreset } from "@toruslabs/torus-scripts/fmt";
import { libraryPreset } from "@toruslabs/torus-scripts/library";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

if (existsSync(".env")) process.loadEnvFile(".env");

const library = libraryPreset({ entry: "src/index.ts", format: ["esm", "cjs"] });

// ws-embed and its dependencies use BigInt, so ES2020 is the lowest usable browser target.
const target = "es2020";

const define = {
  "process.env.WEB3AUTH_CLIENT_ID": JSON.stringify(String(process.env.WEB3AUTH_CLIENT_ID)),
};

export default defineConfig({
  pack: [
    {
      entry: library.pack.entry,
      dts: library.pack.dts,
      sourcemap: library.pack.sourcemap,
      target,
      define,
      format: {
        esm: { outDir: "dist/lib.esm", platform: "browser" },
        cjs: { outDir: "dist/lib.cjs" },
      },
      outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
    },
    {
      entry: { torus: "src/index.ts" },
      format: "umd",
      globalName: "Torus",
      platform: "browser",
      target,
      outDir: "dist",
      clean: false,
      dts: false,
      minify: true,
      sourcemap: false,
      deps: { alwaysBundle: [/.*/], onlyBundle: false },
      define: {
        ...define,
        "process.env.NODE_ENV": JSON.stringify("production"),
      },
      outputOptions: { exports: "named" },
      outExtensions: () => ({ js: ".min.js" }),
    },
  ],
  define,
  test: {
    include: ["test/**/*.test.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
  fmt: {
    ...formatPreset(),
    ignorePatterns: ["examples/**"],
  },
  lint: {
    ...typescriptLintPreset(),
    ignorePatterns: ["dist/**", "examples/**"],
  },
});
