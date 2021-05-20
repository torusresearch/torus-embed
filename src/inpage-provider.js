import { ethErrors } from 'eth-rpc-errors'
import dequal from 'fast-deep-equal'
import { duplex as isDuplex } from 'is-stream'
import { createIdRemapMiddleware, JsonRpcEngine as RpcEngine } from 'json-rpc-engine'
import { createStreamMiddleware } from 'json-rpc-middleware-stream'
import ObjectMultiplex from 'obj-multiplex'
import ObservableStore from 'obs-store'
import asStream from 'obs-store/lib/asStream'
import pump from 'pump'
import SafeEventEmitter from 'safe-event-emitter'

import log from './loglevel'
import messages from './messages'
import { createErrorMiddleware, EMITTED_NOTIFICATIONS, logStreamDisconnectWarning, NOOP } from './utils'

// resolve response.result, reject errors
const getRpcPromiseCallback =
  (resolve, reject, unwrapResult = true) =>
  (error, response) => {
    if (error || response.error) {
      return reject(error || response.error)
    }
    return !unwrapResult || Array.isArray(response) ? resolve(response) : resolve(response.result)
  }

/**
 * @param {Object} connectionStream - A Node.js duplex stream
 * @param {Object} opts - An options bag
 * @param {number} opts.maxEventListeners - The maximum number of event listeners
 * @param {boolean} opts.shouldSendMetadata - Whether the provider should send page metadata
 */
class MetamaskInpageProvider extends SafeEventEmitter {
  constructor(connectionStream, { maxEventListeners = 100, shouldSendMetadata = true } = {}) {
    if (!isDuplex(connectionStream)) {
      throw new Error(messages.errors.invalidDuplexStream())
    }

    if (typeof maxEventListeners !== 'number' || typeof shouldSendMetadata !== 'boolean') {
      throw new Error(messages.errors.invalidOptions(maxEventListeners, shouldSendMetadata))
    }
    super()

    this.isTorus = true
    this.setMaxListeners(maxEventListeners)
    this.shouldSendMetadata = shouldSendMetadata

    this._state = {
      sentWarnings: {
        // methods
        enable: false,
        experimentalMethods: false,
        send: false,
        // events
        events: {
          chainIdChanged: false,
          close: false,
          data: false,
          networkChanged: false,
          notification: false,
        },
        publicConfigStore: false,
      },
      isConnected: undefined,
      accounts: undefined,
      isUnlocked: undefined,
      hasEmittedConnection: false,
    }

    // public state
    this.selectedAddress = null
    this.networkVersion = null
    this.chainId = null

    // bind functions (to prevent e.g. web3@1.x from making unbound calls)
    this._handleAccountsChanged = this._handleAccountsChanged.bind(this)
    this._handleDisconnect = this._handleDisconnect.bind(this)
    this._sendSync = this._sendSync.bind(this)
    this._rpcRequest = this._rpcRequest.bind(this)
    this._warnOfDeprecation = this._warnOfDeprecation.bind(this)
    // this.enable = this.enable.bind(this)
    this.request = this.request.bind(this)
    this.send = this.send.bind(this)
    this.sendAsync = this.sendAsync.bind(this)

    // setup connectionStream multiplexing
    const mux = new ObjectMultiplex()
    pump(connectionStream, mux, connectionStream, this._handleDisconnect.bind(this, 'MetaMask'))

    // subscribe to metamask public config (one-way)
    this._publicConfigStore = new ObservableStore({ storageKey: 'Metamask-Config' })

    // handle isUnlocked changes, and chainChanged and networkChanged events
    this._publicConfigStore.subscribe((stringifiedState) => {
      const state = JSON.parse(stringifiedState)
      if ('isUnlocked' in state && state.isUnlocked !== this._state.isUnlocked) {
        this._state.isUnlocked = state.isUnlocked
        if (!this._state.isUnlocked) {
          // accounts are never exposed when the extension is locked
          this._handleAccountsChanged([])
        } else {
          // this will get the exposed accounts, if any
          try {
            this._rpcRequest(
              { method: 'eth_accounts', params: [] },
              NOOP,
              true // indicating that eth_accounts _should_ update accounts
            )
          } catch (_) {
            // Swallow error
          }
        }
      }

      if ('selectedAddress' in state && this.selectedAddress !== state.selectedAddress) {
        try {
          this._sendAsync(
            { method: 'eth_accounts', params: [] },
            NOOP,
            true // indicating that eth_accounts _should_ update accounts
          )
        } catch (_) {
          // Swallow error
        }
      }

      // Emit chainChanged event on chain change
      if ('chainId' in state && state.chainId !== this.chainId) {
        this.chainId = state.chainId || null
        this.emit('chainChanged', this.chainId)
        this.emit('chainIdChanged', this.chainId) // deprecated

        // indicate that we've connected, for EIP-1193 compliance
        // we do this here so that iframe can initialize
        if (!this._state.hasEmittedConnection) {
          this.emit('connect', { chainId: this.chainId })
          this._state.hasEmittedConnection = true
        }
      }

      // Emit networkChanged event on network change
      if ('networkVersion' in state && state.networkVersion !== this.networkVersion) {
        this.networkVersion = state.networkVersion || null
        this.emit('networkChanged', this.networkVersion)
      }
    })

    pump(
      mux.createStream('publicConfig'),
      asStream(this._publicConfigStore),
      // RPC requests should still work if only this stream fails
      logStreamDisconnectWarning.bind(this, 'MetaMask PublicConfigStore')
    )

    // ignore phishing warning message (handled elsewhere)
    mux.ignoreStream('phishing')

    // setup own event listeners

    // EIP-1193 connect
    this.on('connect', () => {
      this._state.isConnected = true
    })

    // connect to async provider

    const jsonRpcConnection = createStreamMiddleware()
    pump(jsonRpcConnection.stream, mux.createStream('provider'), jsonRpcConnection.stream, this._handleDisconnect.bind(this, 'MetaMask RpcProvider'))

    // handle RPC requests via dapp-side rpc engine
    const rpcEngine = new RpcEngine()
    rpcEngine.push(createIdRemapMiddleware())
    rpcEngine.push(createErrorMiddleware())
    rpcEngine.push(jsonRpcConnection.middleware)
    this._rpcEngine = rpcEngine

    // json rpc notification listener
    jsonRpcConnection.events.on('notification', (payload) => {
      const { result, method, params } = payload
      if (method === 'wallet_accountsChanged') {
        this._handleAccountsChanged(result)
      } else if (EMITTED_NOTIFICATIONS.includes(payload.method)) {
        // EIP 1193 subscriptions, per eth-json-rpc-filters/subscriptionManager
        this.emit('data', payload) // deprecated
        this.emit('notification', params.result)
        this.emit('message', {
          type: method,
          data: params,
        })
      }

      // Backward compatibility for older non EIP 1193 subscriptions
      // this.emit('data', null, payload)
    })
  }

  get publicConfigStore() {
    if (!this._state.sentWarnings.publicConfigStore) {
      log.warn(messages.warnings.publicConfigStore)
      this._state.sentWarnings.publicConfigStore = true
    }
    return this._publicConfigStore
  }

  /**
   * Returns whether the inpage provider is connected to Torus.
   */
  isConnected() {
    return this._state.isConnected
  }

  /**
   * Submits an RPC request to Torus for the given method, with the given params.
   * Resolves with the result of the method call, or rejects on error.
   *
   * @param {Object} args - The RPC request arguments.
   * @param {string} args.method - The RPC method name.
   * @param {unknown[] | Object} [args.params] - The parameters for the RPC method.
   * @returns {Promise<unknown>} A Promise that resolves with the result of the RPC method,
   * or rejects if an error is encountered.
   */
  async request(args) {
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      throw ethErrors.rpc.invalidRequest({
        message: 'Expected a single, non-array, object argument.',
        data: args,
      })
    }

    const { method, params } = args

    if (typeof method !== 'string' || method.length === 0) {
      throw ethErrors.rpc.invalidRequest({
        message: '"args.method" must be a non-empty string.',
        data: args,
      })
    }

    if (params !== undefined && !Array.isArray(params) && (typeof params !== 'object' || params === null)) {
      throw ethErrors.rpc.invalidRequest({
        message: '"args.params" must be an object or array if provided.',
        data: args,
      })
    }

    return new Promise((resolve, reject) => {
      this._rpcRequest({ method, params }, getRpcPromiseCallback(resolve, reject))
    })
  }

  /**
   * Submit a JSON-RPC request object and a callback to make an RPC method call.
   *
   * @param {Object} payload - The RPC request object.
   * @param {Function} callback - The callback function.
   */
  sendAsync(payload, cb) {
    this._rpcRequest(payload, cb)
  }

  /**
   * We override the following event methods so that we can warn consumers
   * about deprecated events:
   *   addListener, on, once, prependListener, prependOnceListener
   */

  /**
   * @inheritdoc
   */
  addListener(eventName, listener) {
    this._warnOfDeprecation(eventName)
    return super.addListener(eventName, listener)
  }

  /**
   * @inheritdoc
   */
  on(eventName, listener) {
    this._warnOfDeprecation(eventName)
    return super.on(eventName, listener)
  }

  /**
   * @inheritdoc
   */
  once(eventName, listener) {
    this._warnOfDeprecation(eventName)
    return super.once(eventName, listener)
  }

  /**
   * @inheritdoc
   */
  prependListener(eventName, listener) {
    this._warnOfDeprecation(eventName)
    return super.prependListener(eventName, listener)
  }

  /**
   * @inheritdoc
   */
  prependOnceListener(eventName, listener) {
    this._warnOfDeprecation(eventName)
    return super.prependOnceListener(eventName, listener)
  }

  /**
   * Internal RPC method. Forwards requests to background via the RPC engine.
   * Also remap ids inbound and outbound.
   *
   * @param {Object} _payload - The RPC request object.
   * @param {Function} callback - The consumer's callback.
   * @param {boolean} isInternal - Whether the request is internal.
   */
  _rpcRequest(payload, callback, isInternal = false) {
    let cb = callback
    const _payload = payload
    if (!Array.isArray(_payload)) {
      if (!_payload.jsonrpc) {
        _payload.jsonrpc = '2.0'
      }

      if (_payload.method === 'eth_accounts' || _payload.method === 'eth_requestAccounts') {
        // handle accounts changing
        cb = (err, res) => {
          this._handleAccountsChanged(res.result || [], _payload.method === 'eth_accounts', isInternal)
          callback(err, res)
        }
      }
    }
    this.tryPreopenHandle(_payload, cb)
  }

  /**
   * Called when connection is lost to critical streams.
   */
  _handleDisconnect(streamName, err) {
    logStreamDisconnectWarning.bind(this)(streamName, err)
    const disconnectError = {
      code: 1011,
      reason: messages.errors.disconnected(),
    }
    if (this._state.isConnected) {
      this.emit('disconnect', disconnectError)
      this.emit('close', disconnectError) // deprecated
    }
    this._state.isConnected = false
  }

  /**
   * Called when accounts may have changed.
   */
  _handleAccountsChanged(accounts, isEthAccounts = false, isInternal = false) {
    // defensive programming
    let finalAccounts = accounts
    if (!Array.isArray(finalAccounts)) {
      log.error('MetaMask: Received non-array accounts parameter. Please report this bug.', finalAccounts)
      finalAccounts = []
    }

    // emit accountsChanged if anything about the accounts array has changed
    if (!dequal(this._state.accounts, finalAccounts)) {
      // we should always have the correct accounts even before eth_accounts
      // returns, except in cases where isInternal is true
      if (isEthAccounts && !isInternal) {
        log.error('MetaMask: "eth_accounts" unexpectedly updated accounts. Please report this bug.', finalAccounts)
      }

      this._state.accounts = finalAccounts
      this.emit('accountsChanged', finalAccounts)
    }

    // handle selectedAddress
    if (this.selectedAddress !== finalAccounts[0]) {
      this.selectedAddress = finalAccounts[0] || null
    }
  }

  /**
   * Warns of deprecation for the given event, if applicable.
   */
  _warnOfDeprecation(eventName) {
    if (this._state.sentWarnings.events[eventName] === false) {
      log.warn(messages.warnings.events[eventName])
      this._state.sentWarnings.events[eventName] = true
    }
  }

  /**
   * DEPRECATED.
   * Sends an RPC request to MetaMask.
   * Many different return types, which is why this method should not be used.
   *
   * @param {(string | Object)} methodOrPayload - The method name, or the RPC request object.
   * @param {Array<any> | Function} [callbackOrArgs] - If given a method name, the method's parameters.
   * @returns {unknown} - The method result, or a JSON RPC response object.
   */
  send(methodOrPayload, callbackOrArgs) {
    if (!this._state.sentWarnings.send) {
      log.warn(messages.warnings.sendDeprecation)
      this._state.sentWarnings.send = true
    }
    if (typeof methodOrPayload === 'string' && (!callbackOrArgs || Array.isArray(callbackOrArgs))) {
      return new Promise((resolve, reject) => {
        try {
          this._rpcRequest({ method: methodOrPayload, params: callbackOrArgs }, getRpcPromiseCallback(resolve, reject, false))
        } catch (error) {
          reject(error)
        }
      })
    }
    if (typeof methodOrPayload === 'object' && typeof callbackOrArgs === 'function') {
      return this._rpcRequest(methodOrPayload, callbackOrArgs)
    }
    return this._sendSync(methodOrPayload)
  }

  /**
   * DEPRECATED.
   * Internal backwards compatibility method, used in send.
   */
  _sendSync(payload) {
    let result
    switch (payload.method) {
      case 'eth_accounts':
        result = this.selectedAddress ? [this.selectedAddress] : []
        break

      case 'eth_coinbase':
        result = this.selectedAddress || null
        break

      case 'eth_uninstallFilter':
        this._rpcRequest(payload, NOOP)
        result = true
        break

      case 'net_version':
        result = this.networkVersion || null
        break

      default:
        throw new Error(messages.errors.unsupportedSync(payload.method))
    }

    return {
      id: payload.id,
      jsonrpc: payload.jsonrpc,
      result,
    }
  }
}

export default MetamaskInpageProvider
