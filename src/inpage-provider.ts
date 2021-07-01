import { ObservableStore, storeAsStream } from "@metamask/obs-store";
import SafeEventEmitter from "@metamask/safe-event-emitter";
import { EthereumRpcError, ethErrors } from "eth-rpc-errors";
import dequal from "fast-deep-equal";
import { duplex as isDuplex } from "is-stream";
import { createIdRemapMiddleware, JsonRpcEngine, JsonRpcRequest, JsonRpcResponse, JsonRpcSuccess } from "json-rpc-engine";
import { createStreamMiddleware } from "json-rpc-middleware-stream";
import pump from "pump";
import { Duplex } from "readable-stream";

import {
  BaseProviderState,
  JsonRpcConnection,
  Maybe,
  ProviderOptions,
  PublicConfigState,
  RequestArguments,
  SendSyncJsonRpcRequest,
  SentWarningsState,
  UnvalidatedJsonRpcRequest,
} from "./interfaces";
import log from "./loglevel";
import messages from "./messages";
import ObjectMultiplex from "./ObjectMultiplex";
import { createErrorMiddleware, EMITTED_NOTIFICATIONS, logStreamDisconnectWarning, NOOP } from "./utils";

// resolve response.result, reject errors
const getRpcPromiseCallback =
  (resolve, reject, unwrapResult = true) =>
  (error, response) => {
    if (error || response.error) {
      return reject(error || response.error);
    }
    return !unwrapResult || Array.isArray(response) ? resolve(response) : resolve(response.result);
  };

/**
 * @param {Object} connectionStream - A Node.js duplex stream
 * @param {Object} opts - An options bag
 * @param {number} opts.maxEventListeners - The maximum number of event listeners
 * @param {boolean} opts.shouldSendMetadata - Whether the provider should send page metadata
 */
class TorusInpageProvider extends SafeEventEmitter {
  /**
   * The chain ID of the currently connected Ethereum chain.
   * See [chainId.network]{@link https://chainid.network} for more information.
   */
  public chainId: string | null;

  /**
   * The user's currently selected Ethereum address.
   * If null, MetaMask is either locked or the user has not permitted any
   * addresses to be viewed.
   */
  public selectedAddress: string | null;

  protected _state: BaseProviderState;

  _rpcEngine: JsonRpcEngine;

  protected _jsonRpcConnection: JsonRpcConnection;

  public networkVersion: string | null;

  shouldSendMetadata: boolean;

  /**
   * Indicating that this provider is a MetaMask provider.
   */
  public readonly isTorus: true;

  protected _sentWarnings: SentWarningsState = {
    // methods
    enable: false,
    experimentalMethods: false,
    send: false,
    publicConfigStore: false,
    // events
    events: {
      close: false,
      data: false,
      networkChanged: false,
      notification: false,
    },
  };

  protected static _defaultState: BaseProviderState = {
    accounts: null,
    isConnected: false,
    isUnlocked: false,
    initialized: false,
    isPermanentlyDisconnected: false,
    hasEmittedConnection: false,
  };

  _publicConfigStore: ObservableStore<PublicConfigState>;

  tryPreopenHandle: (payload: UnvalidatedJsonRpcRequest | UnvalidatedJsonRpcRequest[], cb: (...args: any[]) => void) => void;

  enable: () => Promise<string[]>;

  constructor(
    connectionStream: Duplex,
    { maxEventListeners = 100, shouldSendMetadata = true, jsonRpcStreamName = "provider" }: ProviderOptions = {}
  ) {
    super();
    if (!isDuplex(connectionStream)) {
      throw new Error(messages.errors.invalidDuplexStream());
    }
    this.isTorus = true;
    this.setMaxListeners(maxEventListeners);

    // private state
    this._state = {
      ...TorusInpageProvider._defaultState,
    };

    // public state
    this.selectedAddress = null;
    this.networkVersion = null;
    this.chainId = null;
    this.shouldSendMetadata = shouldSendMetadata;

    // bind functions (to prevent e.g. web3@1.x from making unbound calls)
    this._handleAccountsChanged = this._handleAccountsChanged.bind(this);
    this._handleConnect = this._handleConnect.bind(this);
    this._handleDisconnect = this._handleDisconnect.bind(this);
    this._handleStreamDisconnect = this._handleStreamDisconnect.bind(this);
    this._sendSync = this._sendSync.bind(this);
    this._rpcRequest = this._rpcRequest.bind(this);
    this._warnOfDeprecation = this._warnOfDeprecation.bind(this);

    this.request = this.request.bind(this);
    this.send = this.send.bind(this);
    this.sendAsync = this.sendAsync.bind(this);
    // this.enable = this.enable.bind(this);

    // setup connectionStream multiplexing
    const mux = new ObjectMultiplex();
    pump(connectionStream, mux as unknown as Duplex, connectionStream, this._handleStreamDisconnect.bind(this, "MetaMask"));

    // subscribe to metamask public config (one-way)
    this._publicConfigStore = new ObservableStore({ storageKey: "Metamask-Config" });

    // handle isUnlocked changes, and chainChanged and networkChanged events
    this._publicConfigStore.subscribe((stringifiedState) => {
      // This is because we are using store as string
      const state = JSON.parse(stringifiedState as unknown as string);
      if ("isUnlocked" in state && state.isUnlocked !== this._state.isUnlocked) {
        this._state.isUnlocked = state.isUnlocked;
        if (!this._state.isUnlocked) {
          // accounts are never exposed when the extension is locked
          this._handleAccountsChanged([]);
        } else {
          // this will get the exposed accounts, if any
          try {
            this._rpcRequest(
              { method: "eth_accounts", params: [] },
              NOOP,
              true // indicating that eth_accounts _should_ update accounts
            );
          } catch (_) {
            // Swallow error
          }
        }
      }

      if ("selectedAddress" in state && this.selectedAddress !== state.selectedAddress) {
        try {
          this._rpcRequest(
            { method: "eth_accounts", params: [] },
            NOOP,
            true // indicating that eth_accounts _should_ update accounts
          );
        } catch (_) {
          // Swallow error
        }
      }

      // Emit chainChanged event on chain change
      if ("chainId" in state && state.chainId !== this.chainId) {
        this.chainId = state.chainId || null;
        this.emit("chainChanged", this.chainId);

        // indicate that we've connected, for EIP-1193 compliance
        // we do this here so that iframe can initialize
        if (!this._state.hasEmittedConnection) {
          this._handleConnect(this.chainId);
          this._state.hasEmittedConnection = true;
        }
      }

      // Emit networkChanged event on network change
      if ("networkVersion" in state && state.networkVersion !== this.networkVersion) {
        this.networkVersion = state.networkVersion || null;
        this.emit("networkChanged", this.networkVersion);
      }
    });

    pump(
      mux.createStream("publicConfig") as unknown as Duplex,
      storeAsStream(this._publicConfigStore),
      // RPC requests should still work if only this stream fails
      logStreamDisconnectWarning.bind(this, "MetaMask PublicConfigStore")
    );

    // ignore phishing warning message (handled elsewhere)
    mux.ignoreStream("phishing");

    // setup own event listeners

    // EIP-1193 connect
    this.on("connect", () => {
      this._state.isConnected = true;
    });

    // connect to async provider

    const jsonRpcConnection = createStreamMiddleware();
    pump(
      jsonRpcConnection.stream,
      mux.createStream(jsonRpcStreamName) as unknown as Duplex,
      jsonRpcConnection.stream,
      this._handleStreamDisconnect.bind(this, "MetaMask RpcProvider")
    );

    // handle RPC requests via dapp-side rpc engine
    const rpcEngine = new JsonRpcEngine();
    rpcEngine.push(createIdRemapMiddleware());
    rpcEngine.push(createErrorMiddleware());
    rpcEngine.push(jsonRpcConnection.middleware);
    this._rpcEngine = rpcEngine;

    // json rpc notification listener
    jsonRpcConnection.events.on("notification", (payload) => {
      const { result, method, params } = payload;
      if (method === "wallet_accountsChanged") {
        this._handleAccountsChanged(result);
      } else if (EMITTED_NOTIFICATIONS.includes(payload.method)) {
        // EIP 1193 subscriptions, per eth-json-rpc-filters/subscriptionManager
        this.emit("data", payload); // deprecated
        this.emit("notification", params.result);
        this.emit("message", {
          type: method,
          data: params,
        });
      }

      // Backward compatibility for older non EIP 1193 subscriptions
      // this.emit('data', null, payload)
    });
  }

  get publicConfigStore(): ObservableStore<PublicConfigState> {
    if (!this._sentWarnings.publicConfigStore) {
      log.warn(messages.warnings.publicConfigStore);
      this._sentWarnings.publicConfigStore = true;
    }
    return this._publicConfigStore;
  }

  /**
   * Returns whether the inpage provider is connected to Torus.
   */
  isConnected(): boolean {
    return this._state.isConnected;
  }

  async request<T>(args: RequestArguments): Promise<Maybe<T>> {
    if (!args || typeof args !== "object" || Array.isArray(args)) {
      throw ethErrors.rpc.invalidRequest({
        message: messages.errors.invalidRequestArgs(),
        data: args,
      });
    }

    const { method, params } = args;

    if (typeof method !== "string" || method.length === 0) {
      throw ethErrors.rpc.invalidRequest({
        message: messages.errors.invalidRequestMethod(),
        data: args,
      });
    }

    if (params !== undefined && !Array.isArray(params) && (typeof params !== "object" || params === null)) {
      throw ethErrors.rpc.invalidRequest({
        message: messages.errors.invalidRequestParams(),
        data: args,
      });
    }

    return new Promise((resolve, reject) => {
      this._rpcRequest({ method, params }, getRpcPromiseCallback(resolve, reject));
    });
  }

  sendAsync(payload: JsonRpcRequest<unknown>, callback: (error: Error | null, result?: JsonRpcResponse<unknown>) => void): void {
    this._rpcRequest(payload, callback);
  }

  /**
   * We override the following event methods so that we can warn consumers
   * about deprecated events:
   *   addListener, on, once, prependListener, prependOnceListener
   */

  addListener(eventName: string, listener: (...args: unknown[]) => void): this {
    this._warnOfDeprecation(eventName);
    return super.addListener(eventName, listener);
  }

  on(eventName: string, listener: (...args: unknown[]) => void): this {
    this._warnOfDeprecation(eventName);
    return super.on(eventName, listener);
  }

  once(eventName: string, listener: (...args: unknown[]) => void): this {
    this._warnOfDeprecation(eventName);
    return super.once(eventName, listener);
  }

  prependListener(eventName: string, listener: (...args: unknown[]) => void): this {
    this._warnOfDeprecation(eventName);
    return super.prependListener(eventName, listener);
  }

  prependOnceListener(eventName: string, listener: (...args: unknown[]) => void): this {
    this._warnOfDeprecation(eventName);
    return super.prependOnceListener(eventName, listener);
  }

  _rpcRequest(payload: UnvalidatedJsonRpcRequest | UnvalidatedJsonRpcRequest[], callback: (...args: any[]) => void, isInternal = false): void {
    let cb = callback;
    const _payload = payload;
    if (!Array.isArray(_payload)) {
      if (!_payload.jsonrpc) {
        _payload.jsonrpc = "2.0";
      }

      if (_payload.method === "eth_accounts" || _payload.method === "eth_requestAccounts") {
        // handle accounts changing
        cb = (err: Error, res: JsonRpcSuccess<string[]>) => {
          this._handleAccountsChanged(res.result || [], _payload.method === "eth_accounts", isInternal);
          callback(err, res);
        };
      }
    }
    this.tryPreopenHandle(_payload, cb);
  }

  /**
   * When the provider becomes connected, updates internal state and emits
   * required events. Idempotent.
   *
   * @param chainId - The ID of the newly connected chain.
   * @emits MetaMaskInpageProvider#connect
   */
  protected _handleConnect(chainId: string): void {
    if (!this._state.isConnected) {
      this._state.isConnected = true;
      this.emit("connect", { chainId });
      log.debug(messages.info.connected(chainId));
    }
  }

  /**
   * When the provider becomes disconnected, updates internal state and emits
   * required events. Idempotent with respect to the isRecoverable parameter.
   *
   * Error codes per the CloseEvent status codes as required by EIP-1193:
   * https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes
   *
   * @param isRecoverable - Whether the disconnection is recoverable.
   * @param errorMessage - A custom error message.
   * @emits MetaMaskInpageProvider#disconnect
   */
  protected _handleDisconnect(isRecoverable: boolean, errorMessage?: string): void {
    if (this._state.isConnected || (!this._state.isPermanentlyDisconnected && !isRecoverable)) {
      this._state.isConnected = false;

      let error;
      if (isRecoverable) {
        error = new EthereumRpcError(
          1013, // Try again later
          errorMessage || messages.errors.disconnected()
        );
        log.debug(error);
      } else {
        error = new EthereumRpcError(
          1011, // Internal error
          errorMessage || messages.errors.permanentlyDisconnected()
        );
        log.error(error);
        this.chainId = null;
        this._state.accounts = null;
        this.selectedAddress = null;
        this._state.isUnlocked = false;
        this._state.isPermanentlyDisconnected = true;
      }

      this.emit("disconnect", error);
    }
  }

  /**
   * Called when connection is lost to critical streams.
   *
   * @emits MetamaskInpageProvider#disconnect
   */
  protected _handleStreamDisconnect(streamName: string, error: Error): void {
    logStreamDisconnectWarning(streamName, error, this);
    this._handleDisconnect(false, error ? error.message : undefined);
  }

  /**
   * Called when accounts may have changed.
   */
  _handleAccountsChanged(accounts: unknown[], isEthAccounts = false, isInternal = false): void {
    // defensive programming
    let finalAccounts = accounts;
    if (!Array.isArray(finalAccounts)) {
      log.error("MetaMask: Received non-array accounts parameter. Please report this bug.", finalAccounts);
      finalAccounts = [];
    }

    for (const account of accounts) {
      if (typeof account !== "string") {
        log.error("MetaMask: Received non-string account. Please report this bug.", accounts);
        finalAccounts = [];
        break;
      }
    }

    // emit accountsChanged if anything about the accounts array has changed
    if (!dequal(this._state.accounts, finalAccounts)) {
      // we should always have the correct accounts even before eth_accounts
      // returns, except in cases where isInternal is true
      if (isEthAccounts && !isInternal) {
        log.error('MetaMask: "eth_accounts" unexpectedly updated accounts. Please report this bug.', finalAccounts);
      }

      this._state.accounts = finalAccounts as string[];
      this.emit("accountsChanged", finalAccounts);
    }

    // handle selectedAddress
    if (this.selectedAddress !== finalAccounts[0]) {
      this.selectedAddress = (finalAccounts[0] as string) || null;
    }
  }

  /**
   * Warns of deprecation for the given event, if applicable.
   */
  _warnOfDeprecation(eventName: string): void {
    if (this._sentWarnings.events[eventName] === false) {
      log.warn(messages.warnings.events[eventName]);
      this._sentWarnings.events[eventName] = true;
    }
  }

  /**
   * Submits an RPC request for the given method, with the given params.
   *
   * @deprecated Use "request" instead.
   * @param method - The method to request.
   * @param params - Any params for the method.
   * @returns A Promise that resolves with the JSON-RPC response object for the
   * request.
   */
  send<T>(method: string, params?: T[]): Promise<JsonRpcResponse<T>>;

  /**
   * Submits an RPC request per the given JSON-RPC request object.
   *
   * @deprecated Use "request" instead.
   * @param payload - A JSON-RPC request object.
   * @param callback - An error-first callback that will receive the JSON-RPC
   * response object.
   */
  send<T>(payload: JsonRpcRequest<unknown>, callback: (error: Error | null, result?: JsonRpcResponse<T>) => void): void;

  /**
   * Accepts a JSON-RPC request object, and synchronously returns the cached result
   * for the given method. Only supports 4 specific RPC methods.
   *
   * @deprecated Use "request" instead.
   * @param payload - A JSON-RPC request object.
   * @returns A JSON-RPC response object.
   */
  send<T>(payload: SendSyncJsonRpcRequest): JsonRpcResponse<T>;

  send(methodOrPayload: unknown, callbackOrArgs?: unknown): unknown {
    if (!this._sentWarnings.send) {
      log.warn(messages.warnings.sendDeprecation);
      this._sentWarnings.send = true;
    }
    if (typeof methodOrPayload === "string" && (!callbackOrArgs || Array.isArray(callbackOrArgs))) {
      return new Promise((resolve, reject) => {
        try {
          this._rpcRequest({ method: methodOrPayload, params: callbackOrArgs }, getRpcPromiseCallback(resolve, reject, false));
        } catch (error) {
          reject(error);
        }
      });
    }
    if (methodOrPayload && typeof methodOrPayload === "object" && typeof callbackOrArgs === "function") {
      return this._rpcRequest(methodOrPayload as JsonRpcRequest<unknown>, callbackOrArgs as (...args: unknown[]) => void);
    }
    return this._sendSync(methodOrPayload as SendSyncJsonRpcRequest);
  }

  /**
   * DEPRECATED.
   * Internal backwards compatibility method, used in send.
   */
  _sendSync(payload: SendSyncJsonRpcRequest): JsonRpcSuccess<unknown> {
    let result;
    switch (payload.method) {
      case "eth_accounts":
        result = this.selectedAddress ? [this.selectedAddress] : [];
        break;

      case "eth_coinbase":
        result = this.selectedAddress || null;
        break;

      case "eth_uninstallFilter":
        this._rpcRequest(payload, NOOP);
        result = true;
        break;

      case "net_version":
        result = this.networkVersion || null;
        break;

      default:
        throw new Error(messages.errors.unsupportedSync(payload.method));
    }

    return {
      id: payload.id,
      jsonrpc: payload.jsonrpc,
      result,
    };
  }
}

export default TorusInpageProvider;
