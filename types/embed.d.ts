import Web3 from 'web3'

declare class Torus {
  constructor(args: TorusCtorArgs);
  web3: Web3;
  provider: Provider;
  ethereum: Provider;
  getPublicAddress(verifierArgs: VerifierArgs): Promise<string | TorusPublicKey>;
  setProvider(networkParams: NetworkInterface): Promise<void>;
  showWallet(path: 'transfer' | 'topup' | 'home' | 'settings' | 'history'): void;
  initiateTopup(provider: 'moonpay' | 'wyre' | 'rampnetwork' | 'xanpool', params?: PaymentParams): Promise<boolean>;
  showTorusButton(): void;
  hideTorusButton(): void;
  getUserInfo(message: string): Promise<UserInfo>;
  init(params: TorusParams): Promise<void>;
  login(params: LoginParams): Promise<string[]>;
  logout(): Promise<void>;
  cleanUp(): Promise<void>;
}

export as namespace torus;

export = Torus;


declare class Provider {
  send(payload: JsonRPCRequest, callback: Callback<JsonRPCResponse>): any;
}

interface TorusPublicKey extends TorusNodePub {
  address: String;
}

interface TorusNodePub {
  X: String;
  Y: String;
}

interface PaymentParams {
  selectedAddress?: string;
  selectedCurrency?: string;
  fiatValue?: Number;
  selectedCryptoCurrency?: string;
}

interface VerifierArgs {
  verifier: 'google' | 'reddit' | 'discord';
  verifierId: string;
  isExtended?: Boolean;
}

interface LoginParams {
  verifier?: 'google' | 'facebook' | 'twitch' | 'reddit' | 'discord';
}

interface TorusCtorArgs {
  buttonPosition?: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';
}

interface UserInfo {
  email: string;
  name: string;
  profileImage: string;
  verifier: string;
  verifierId: string;
}

interface TorusParams {
  network?: NetworkInterface;
  buildEnv?: 'production' | 'development' | 'staging' | 'testing';
  enableLogging?: boolean;
  showTorusButton?: boolean;
  enabledVerifiers?: VerifierStatus;
  integrity?: IntegrityParams;
}

interface IntegrityParams {
  check: boolean;
  hash?: string;
  version?: string;
}

interface VerifierStatus {
  google?: boolean;
  facebook?: boolean;
  reddit?: boolean;
  twitch?: boolean;
  discord?: boolean;
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