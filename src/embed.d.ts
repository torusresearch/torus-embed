// provider
// ethereum
// getPublicKey
// init
// web3

import Web3 from 'web3'

export class Torus {
  web3: Web3
  provider: Provider
  ethereum: Provider
  getPublicAddress(email: string): Promise<string>;
  init(buildEnv?: 'production' | 'development' | 'staging' | 'testing'): Promise<>
}

class Provider {
  send(payload: JsonRPCRequest, callback: Callback<JsonRPCResponse>): any;
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