/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const { EnvironmentPlugin } = require("webpack");

const pkg = require("./package.json");

exports.baseConfig = {
  resolve: {
    alias: {
      "bn.js": path.resolve(__dirname, "node_modules/bn.js"),
      lodash: path.resolve(__dirname, "node_modules/lodash-es"),
      "js-sha3": path.resolve(__dirname, "node_modules/js-sha3"),
    },
  },
  plugins: [new EnvironmentPlugin({ TORUS_EMBED_VERSION: pkg.version })],
};
