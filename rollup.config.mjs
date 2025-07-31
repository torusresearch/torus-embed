import replace from "@rollup/plugin-replace";
import dotenv from "dotenv";

dotenv.config();

export const baseConfig = {
  plugins: [
    replace({
      "process.env.WEB3AUTH_CLIENT_ID": `"${process.env.WEB3AUTH_CLIENT_ID}"`,
      preventAssignment: true,
    }),
  ],
};
