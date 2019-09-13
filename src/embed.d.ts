import Web3 from 'web3'

export default class Torus {
  web3: Web3
  provider: Provider
  ethereum: Provider
  getPublicAddress(email: string): Promise<string>;
  setProvider(network: string | { networkUrl: string, chainId: number, networkName: string }, type?: "rpc")
  showWallet(calledFromEmbed: boolean)
  showTorusButton(): void
  hideTorusButton(): void
  getUserInfo(): Promise<UserInfo>;
  init(buildEnv?: 'production' | 'development' | 'staging' | 'testing', enableLogging?: boolean): Promise<void>
  login(): Promise<string[]>
  logout(): Promise<void>
  cleanUp(): Promise<void>
}

declare class Provider {
  send(payload: JsonRPCRequest, callback: Callback<JsonRPCResponse>): any;
}

interface UserInfo {
  email: string;
  name: string;
  profileImage: string;
}

interface JsonRPCResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: string;
}

interface JsonRPCRequest {
  jsonrpc: string;
  method: string;
  params: any[];
  id: number;
}

interface Callback<ResultType> {
  (error: Error): void;
  (error: null, val: ResultType): void;
}