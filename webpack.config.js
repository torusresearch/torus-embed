/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const { EnvironmentPlugin } = require("webpack");

const pkg = require("./package.json");

exports.baseConfig = {
  output: {
    libraryExport: "default",
  },
  resolve: {
    alias: {
      "bn.js": path.resolve(__dirname, "node_modules/bn.js"),
      lodash: path.resolve(__dirname, "node_modules/lodash"),
      "js-sha3": path.resolve(__dirname, "node_modules/js-sha3"),
      "web3-providers-ipc": path.resolve(__dirname, "node_modules/empty-module"),
      "web3-providers-ws": path.resolve(__dirname, "node_modules/empty-module"),
    },
  },
  plugins: [new EnvironmentPlugin({ TORUS_EMBED_VERSION: pkg.version })],
};

// module.exports = [cjsConfig]

// V5
// experiments: {
//   outputModule: true
// }

// node: {
//   global: true,
// },
// resolve: {
//   alias: { crypto: 'crypto-browserify', stream: 'stream-browserify', vm: 'vm-browserify' },
//   aliasFields: ['browser'],
// },
