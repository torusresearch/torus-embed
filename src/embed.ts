import Web3Auth, { CtorArgs, WsEmbedParams } from "@web3auth/ws-embed";

class Torus extends Web3Auth {
  constructor(params: Omit<CtorArgs, "web3AuthClientId" | "web3AuthNetwork"> = {}) {
    super({
      web3AuthClientId: process.env.WEB3AUTH_CLIENT_ID,
      web3AuthNetwork: "mainnet",
      ...params,
    });
  }

  async init(
    params: Partial<Omit<WsEmbedParams, "walletUrls" | "confirmationStrategy" | "accountAbstractionConfig" | "enableKeyExport" | "loginMode">> = {}
  ) {
    await super.init({
      chainId: "0x1",
      chains: [],
      confirmationStrategy: "default",
      ...params,
      loginMode: "embed",
    });
  }

  async loginWithSessionId(_: never): Promise<boolean> {
    throw new Error("Not implemented");
  }
}

export default Torus;
