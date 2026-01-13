import Web3Auth, { CtorArgs, LoginWithSessionIdParams, WsEmbedParams } from "@web3auth/ws-embed";

class Torus extends Web3Auth {
  /**
   * @param params - The parameters for the Web3Auth constructor.
   * If no parameters are provided, the constructor will use the default values for the wallet.
   * If using custom authentication, you need to provide the custom clientId and network.
   */
  constructor(params: Partial<CtorArgs> = {}) {
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
      loginMode: "embed",
      ...params,
    });
  }

  async loginWithSessionId(_: LoginWithSessionIdParams): Promise<boolean> {
    throw new Error("Not implemented");
  }
}

export default Torus;
