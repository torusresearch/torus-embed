const { EnvironmentPlugin } = require("webpack");
const dotenv = require("dotenv");

dotenv.config();

const config = { plugins: [new EnvironmentPlugin({ WEB3AUTH_CLIENT_ID: process.env.WEB3AUTH_CLIENT_ID })] };

exports.baseConfig = config;
