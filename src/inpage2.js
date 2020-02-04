const pump = require('pump')
const RpcEngine = require('json-rpc-engine')
const createIdRemapMiddleware = require('json-rpc-engine/src/idRemapMiddleware')
const createJsonRpcStream = require('json-rpc-middleware-stream')
const ObservableStore = require('obs-store')
const asStream = require('obs-store/lib/asStream')
const ObjectMultiplex = require('obj-multiplex')
const SafeEventEmitter = require('safe-event-emitter')
const dequal = require('fast-deep-equal')
const { ethErrors } = require('eth-json-rpc-errors')
const log = require('loglevel')

const messages = require('./messages')
const { sendSiteMetadata } = require('./src/siteMetadata')
const { createErrorMiddleware, logStreamDisconnectWarning } = require('./src/utils')

// resolve response.result, reject errors
const getRpcPromiseCallback = (resolve, reject) => (error, response) => {
  error || response.error ? reject(error || response.error) : Array.isArray(response) ? resolve(response) : resolve(response.result)
}

class MetamaskInpageProvider extends SafeEventEmitter {
  constructor(connectionStream) {
    super()
    this._state = {
      sentWarnings: {
        isConnected: false,
        sendAsync: false,
        sendSync: false
      },
      isConnected: undefined,
      accounts: undefined,
      isUnlocked: undefined
    }
    // public state
    this.selectedAddress = null
    this.networkVersion = undefined
    this.chainId = undefined

    // setup connectionStream multiplexing
    const mux = (this.mux = new ObjectMultiplex())
    pump(connectionStream, mux, connectionStream, this._handleDisconnect.bind(this, 'MetaMask'))

    // subscribe to metamask public config (one-way)
    this._publicConfigStore = new ObservableStore({ storageKey: 'MetaMask-Config' })

    // handle isUnlocked changes, and chainChanged and networkChanged events
    this._publicConfigStore.subscribe(state => {
      if ('isUnlocked' in state && state.isUnlocked !== this._state.isUnlocked) {
        this._state.isUnlocked = state.isUnlocked
        if (!this._state.isUnlocked) {
          // accounts are never exposed when the extension is locked
          this._handleAccountsChanged([])
        } else {
          // this will get the exposed accounts, if any
          try {
            this._sendAsync(
              { method: 'eth_accounts', params: [] },
              () => {},
              true // indicating that eth_accounts _should_ update accounts
            )
          } catch (_) {
            // Swallow error
          }
        }
      }

      // Emit chainChanged event on chain change
      if ('chainId' in state && state.chainId !== this.chainId) {
        this.chainId = state.chainId
        this.emit('chainChanged', this.chainId)
      }

      // Emit networkChanged event on network change
      if ('networkVersion' in state && state.networkVersion !== this.networkVersion) {
        this.networkVersion = state.networkVersion
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

    const jsonRpcConnection = createJsonRpcStream()
    pump(jsonRpcConnection.stream, mux.createStream('provider'), jsonRpcConnection.stream, this._handleDisconnect.bind(this, 'MetaMask RpcProvider'))

    // handle RPC requests via dapp-side rpc engine
    const rpcEngine = new RpcEngine()
    rpcEngine.push(createIdRemapMiddleware())
    rpcEngine.push(createErrorMiddleware())
    rpcEngine.push(jsonRpcConnection.middleware)
    this._rpcEngine = rpcEngine

    // json rpc notification listener
    jsonRpcConnection.events.on('notification', payload => {
      if (payload.method === 'wallet_accountsChanged') {
        this._handleAccountsChanged(payload.result)
      } else if (payload.method === 'eth_subscription') {
        // EIP 1193 subscriptions, per eth-json-rpc-filters/subscriptionManager
        this.emit('notification', payload.params.result)
      }
    })

    // send website metadata
    const domContentLoadedHandler = () => {
      sendSiteMetadata(this._rpcEngine)
      window.removeEventListener('DOMContentLoaded', domContentLoadedHandler)
    }
    window.addEventListener('DOMContentLoaded', domContentLoadedHandler)

    // indicate that we've connected, for EIP-1193 compliance
    setTimeout(() => this.emit('connect'))
  }

  isMetaMask = true

  /**
   * Sends an RPC request to MetaMask. Resolves to the result of the method call.
   * May reject with an error that must be caught by the caller.
   *
   * @param {(string|Object)} methodOrPayload - The method name, or the RPC request object.
   * @param {Array<any>} [params] - If given a method name, the method's parameters.
   * @returns {Promise<any>} - A promise resolving to the result of the method call.
   */
  send(methodOrPayload, params) {
    // preserve original params for later error if necessary
    const _params = params
    let finalParams = params

    // construct payload object
    let payload
    if (typeof methodOrPayload === 'object' && !Array.isArray(methodOrPayload)) {
      payload = methodOrPayload
    } else if (typeof methodOrPayload === 'string' && typeof finalParams !== 'function') {
      // wrap params in array out of kindness
      if (finalParams === undefined) {
        finalParams = []
      } else if (!Array.isArray(finalParams)) {
        finalParams = [finalParams]
      }

      payload = {
        method: methodOrPayload,
        params: finalParams
      }
    }

    // typecheck payload and payload.method
    if (Array.isArray(payload) || typeof finalParams === 'function' || typeof payload !== 'object' || typeof payload.method !== 'string') {
      throw ethErrors.rpc.invalidRequest({
        message: messages.errors.invalidParams(),
        data: [methodOrPayload, _params]
      })
    }

    return new Promise((resolve, reject) => {
      try {
        this._sendAsync(payload, getRpcPromiseCallback(resolve, reject))
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Internal RPC method. Forwards requests to background via the RPC engine.
   * Also remap ids inbound and outbound.
   *
   * @param {Object} payload - The RPC request object.
   * @param {Function} userCallback - The caller's callback.
   * @param {boolean} isInternal - Whether the request is internal.
   */
  _sendAsync(payload, userCallback, isInternal = false) {
    let cb = userCallback

    if (!Array.isArray(payload)) {
      if (!payload.jsonrpc) {
        payload.jsonrpc = '2.0'
      }

      if (payload.method === 'eth_accounts') {
        // handle accounts changing
        cb = (err, res) => {
          this._handleAccountsChanged(res.result || [], payload.method === 'eth_accounts', isInternal)
          userCallback(err, res)
        }
      }
    }

    this._rpcEngine.handle(payload, cb)
  }

  /**
   * Called when connection is lost to critical streams.
   */
  _handleDisconnect(streamName, err) {
    logStreamDisconnectWarning.bind(this)(streamName, err)
    if (this._state.isConnected) {
      this.emit('close', {
        code: 1011,
        reason: 'MetaMask background communication error.'
      })
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

      this.emit('accountsChanged', finalAccounts)
      this._state.accounts = finalAccounts
    }

    // handle selectedAddress
    if (this.selectedAddress !== finalAccounts[0]) {
      this.selectedAddress = finalAccounts[0] || null
    }
  }
}

export default MetamaskInpageProvider
