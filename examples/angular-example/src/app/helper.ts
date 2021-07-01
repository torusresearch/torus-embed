import Torus, { TORUS_BUILD_ENV, TORUS_BUILD_ENV_TYPE, TorusInpageProvider } from "@toruslabs/torus-embed";
import Web3 from "web3";
import { AbstractProvider } from "web3-core";

const web3Obj = {
  web3: new Web3(),
  torus: new Torus({}),
  setWeb3(provider: TorusInpageProvider) {
    const web3Instance = new Web3(provider as AbstractProvider);
    web3Obj.web3 = web3Instance;
  },
  async initialize(env: string) {
    await web3Obj.torus.init({
      showTorusButton: true,
      buildEnv: (env || TORUS_BUILD_ENV.PRODUCTION) as TORUS_BUILD_ENV_TYPE,
      network: { host: "rinkeby" },
    });
    await web3Obj.torus.login({});
    web3Obj.setWeb3(web3Obj.torus.provider);
    sessionStorage.setItem("pageUsingTorus", env);
  },
};

export default web3Obj;
