import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";

import pkg from "./package.json";

export default {
  plugins: [
    json(),
    replace({
      "process.env.TORUS_EMBED_VERSION": `"${pkg.version}"`,
      preventAssignment: true,
    }),
  ],
};
