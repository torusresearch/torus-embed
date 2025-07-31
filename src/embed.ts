import Web3Auth, { CtorArgs, LoginWithSessionIdParams, WsEmbedParams } from "@web3auth/ws-embed";

class Torus extends Web3Auth {
  constructor(params: Omit<CtorArgs, "web3AuthClientId" | "web3AuthNetwork">) {
    super({
      ...params,
      web3AuthClientId: process.env.WEB3AUTH_CLIENT_ID,
      web3AuthNetwork: "mainnet",
    });
  }

  async init(params: Partial<Omit<WsEmbedParams, "walletUrls" | "confirmationStrategy" | "accountAbstractionConfig" | "enableKeyExport">>) {
    await super.init({
      chainId: "0x1",
      chains: [],
      confirmationStrategy: "popup",
      ...params,
    });
  }

  async loginWithSessionId(_: LoginWithSessionIdParams): Promise<boolean> {
    throw new Error("Not implemented");
  }
}

export default Torus;
