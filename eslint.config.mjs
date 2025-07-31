import toruslabsTypescript from "@toruslabs/eslint-config-typescript";

export default [
  ...toruslabsTypescript,
  {
    files: ["*.config.js", "*.config.mjs"],
    rules: {
      "import/no-extraneous-dependencies": 0,
    },
  },
];
