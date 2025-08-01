const path = require("path");

/** @type {import('tailwindcss').Config} */
export default {
  presets: [require("@toruslabs/vue-components/web3auth-base-preset")],
  content: [
    "index.html",
    "src/**/*.{ts,tsx,jsx,js,vue}",
    path.join(path.dirname(require.resolve("@toruslabs/vue-components")), "**/*.{ts,tsx,jsx,js,vue}"),
  ],
  darkMode: "class",
};
