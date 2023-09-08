require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  root: true,
  extends: ["@toruslabs/eslint-config-typescript"],
  parser: "@typescript-eslint/parser",
  ignorePatterns: ["*.config.js", ".eslintrc.js", "*.config.mjs"],
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2022,
    project: "./tsconfig.json",
  },
};
