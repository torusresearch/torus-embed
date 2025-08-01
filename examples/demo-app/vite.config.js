import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "vite";

const { VITE_APP_INFURA_PROJECT_KEY } = loadEnv(
  "development",
  process.cwd()
);
// TODO: code split and load controllers after login
// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: false,
    // sourcemap: true,
  },
  define: {
    __SENTRY_DEBUG__: false,
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    "process.env.VITE_APP_INFURA_PROJECT_KEY": JSON.stringify(VITE_APP_INFURA_PROJECT_KEY),
  },
  plugins: [vue()],
});
