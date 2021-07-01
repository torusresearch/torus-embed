import { ObservableStore } from "@metamask/obs-store";
import SafeEventEmitter from "@metamask/safe-event-emitter";
import { JsonRpcEngine, JsonRpcRequest, JsonRpcResponse, JsonRpcSuccess } from "json-rpc-engine";
import { Duplex } from "readable-stream";
import { BaseProviderState, JsonRpcConnection, Maybe, ProviderOptions, PublicConfigState, RequestArguments, SendSyncJsonRpcRequest, SentWarningsState, UnvalidatedJsonRpcRequest } from "./interfaces";
/**
 * @param {Object} connectionStream - A Node.js duplex stream
 * @param {Object} opts - An options bag
 * @param {number} opts.maxEventListeners - The maximum number of event listeners
 * @param {boolean} opts.shouldSendMetadata - Whether the provider should send page metadata
 */
declare class TorusInpageProvider extends SafeEventEmitter {
    /**
     * The chain ID of the currently connected Ethereum chain.
     * See [chainId.network]{@link https://chainid.network} for more information.
     */
    chainId: string | null;
    /**
     * The user's currently selected Ethereum address.
     * If null, MetaMask is either locked or the user has not permitted any
     * addresses to be viewed.
     */
    selectedAddress: string | null;
    protected _state: BaseProviderState;
    _rpcEngine: JsonRpcEngine;
    protected _jsonRpcConnection: JsonRpcConnection;
    networkVersion: string | null;
    shouldSendMetadata: boolean;
    /**
     * Indicating that this provider is a MetaMask provider.
     */
    readonly isTorus: true;
    protected _sentWarnings: SentWarningsState;
    protected static _defaultState: BaseProviderState;
    _publicConfigStore: ObservableStore<PublicConfigState>;
    tryPreopenHandle: (payload: UnvalidatedJsonRpcRequest | UnvalidatedJsonRpcRequest[], cb: (...args: any[]) => void) => void;
    enable: () => Promise<string[]>;
    constructor(connectionStream: Duplex, { maxEventListeners, shouldSendMetadata, jsonRpcStreamName }?: ProviderOptions);
    get publicConfigStore(): ObservableStore<PublicConfigState>;
    /**
     * Returns whether the inpage provider is connected to Torus.
     */
    isConnected(): boolean;
    request<T>(args: RequestArguments): Promise<Maybe<T>>;
    sendAsync(payload: JsonRpcRequest<unknown>, callback: (error: Error | null, result?: JsonRpcResponse<unknown>) => void): void;
    /**
     * We override the following event methods so that we can warn consumers
     * about deprecated events:
     *   addListener, on, once, prependListener, prependOnceListener
     */
    addListener(eventName: string, listener: (...args: unknown[]) => void): this;
    on(eventName: string, listener: (...args: unknown[]) => void): this;
    once(eventName: string, listener: (...args: unknown[]) => void): this;
    prependListener(eventName: string, listener: (...args: unknown[]) => void): this;
    prependOnceListener(eventName: string, listener: (...args: unknown[]) => void): this;
    _rpcRequest(payload: UnvalidatedJsonRpcRequest | UnvalidatedJsonRpcRequest[], callback: (...args: any[]) => void, isInternal?: boolean): void;
    /**
     * When the provider becomes connected, updates internal state and emits
     * required events. Idempotent.
     *
     * @param chainId - The ID of the newly connected chain.
     * @emits MetaMaskInpageProvider#connect
     */
    protected _handleConnect(chainId: string): void;
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
    protected _handleDisconnect(isRecoverable: boolean, errorMessage?: string): void;
    /**
     * Called when connection is lost to critical streams.
     *
     * @emits MetamaskInpageProvider#disconnect
     */
    protected _handleStreamDisconnect(streamName: string, error: Error): void;
    /**
     * Called when accounts may have changed.
     */
    _handleAccountsChanged(accounts: unknown[], isEthAccounts?: boolean, isInternal?: boolean): void;
    /**
     * Warns of deprecation for the given event, if applicable.
     */
    _warnOfDeprecation(eventName: string): void;
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
    /**
     * DEPRECATED.
     * Internal backwards compatibility method, used in send.
     */
    _sendSync(payload: SendSyncJsonRpcRequest): JsonRpcSuccess<unknown>;
}
export default TorusInpageProvider;
