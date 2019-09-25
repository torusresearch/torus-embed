import Web3 from 'web3'

export default class Torus {
  constructor(args: TorusCtorArgs);
  web3: Web3
  provider: Provider
  ethereum: Provider
  getPublicAddress(email: string): Promise<string>;
  setProvider(networkParams: NetworkInterface): Promise<void>;
  showWallet(path: 'transfer' | 'topup' | 'home' | 'settings' | 'history'): void
  showTorusButton(): void
  hideTorusButton(): void
  getUserInfo(): Promise<UserInfo>
  init(params: TorusParams): Promise<void>
  login(params: LoginParams): Promise<string[]>
  logout(): Promise<void>
  cleanUp(): Promise<void>
}

declare class Provider {
  send(payload: JsonRPCRequest, callback: Callback<JsonRPCResponse>): any;
}

interface LoginParams {
  verifier?: 'google' | 'facebook'
}

interface TorusCtorArgs {
  buttonPosition?: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left'
}

interface UserInfo {
  email: string;
  name: string;
  profileImage: string;
}

interface TorusParams {
  network?: NetworkInterface;
  buildEnv?: 'production' | 'development' | 'staging' | 'testing';
  enableLogging?: boolean;
  showTorusButton?: boolean;
}

interface NetworkInterface {
  host: 'mainnet' | 'rinkeby' | 'ropsten' | 'kovan' | 'goerli' | 'localhost' | 'matic' | string,
  chainId?: number; 
  networkName?: string;
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