import tailwindcss from "@tailwindcss/vite";
import { tailwindLintPreset, vueLintPreset } from "@toruslabs/oxlint-config-vue";
import { formatPreset } from "@toruslabs/torus-scripts/fmt";
import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "vite-plus";

const { VITE_APP_INFURA_PROJECT_KEY } = loadEnv("development", process.cwd());

const vueLint = vueLintPreset();
const tailwindLint = tailwindLintPreset({ entryPoint: "src/style.css" });

// TODO: code split and load controllers after login
export default defineConfig({
  build: {
    sourcemap: false,
  },
  define: {
    __SENTRY_DEBUG__: false,
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    "process.env.VITE_APP_INFURA_PROJECT_KEY": JSON.stringify(VITE_APP_INFURA_PROJECT_KEY),
  },
  plugins: [tailwindcss(), vue()],
  fmt: formatPreset(),
  lint: {
    ...vueLint,
    jsPlugins: [...(vueLint.jsPlugins ?? []), ...(tailwindLint.jsPlugins ?? [])],
    // The demo logs RPC results to the console on purpose.
    rules: { ...vueLint.rules, ...tailwindLint.rules, "no-console": "off" },
    settings: { ...vueLint.settings, ...tailwindLint.settings },
    ignorePatterns: ["dist/**"],
  },
});
