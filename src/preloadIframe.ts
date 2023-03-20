import { TORUS_BUILD_ENV_TYPE } from "./interfaces";
import { getTorusUrl } from "./utils";

export const preloadIframe = async (buildEnv: TORUS_BUILD_ENV_TYPE, version?: string) => {
  if (typeof document === "undefined") return;

  const { torusUrl } = await getTorusUrl(buildEnv, { version, check: false });
  const url = new URL(torusUrl);

  /**
   * Embedded wallet path
   */
  url.pathname = "popup";

  try {
    const iframe = document.createElement("link");

    iframe.href = url.toString();
    iframe.type = "text/html";
    iframe.rel = "prefetch";

    if (iframe.relList && iframe.relList.supports) {
      if (iframe.relList.supports("prefetch")) {
        document.head.appendChild(iframe);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(error);
  }
};
