export const BUILD_CONFIG = {
  ["development"]: {
    NODE_ENV: "development",
    VITE_WS_EMBED_BUILD_ENV: "development",
  },
  ["staging"]: {
    NODE_ENV: "production",
    VITE_WS_EMBED_BUILD_ENV: "staging",
  },
  ["production"]: {
    NODE_ENV: "production",
    VITE_WS_EMBED_BUILD_ENV: "production",
  },
  ["testing"]: {
    NODE_ENV: "development",
    VITE_WS_EMBED_BUILD_ENV: "testing",
  },
};
