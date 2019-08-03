import createErrorMiddleware from './createErrorMiddleware'
import createTransformEthAddressMiddleware from './createTransformEthAddressMiddleware'
import { setupMultiplex } from './stream-utils.js'
import { Duplex as DuplexStream } from 'readable-stream'
import { transformEthAddress } from './embedUtils'
const pump = require('pump')
const RpcEngine = require('json-rpc-engine')
const createIdRemapMiddleware = require('json-rpc-engine/src/idRemapMiddleware')
const createJsonRpcStream = require('json-rpc-middleware-stream')
const SafeEventEmitter = require('safe-event-emitter')
const log = require('loglevel')
const ObservableStore = require('obs-store')

class LocalStorageStream extends DuplexStream {
  constructor(ethereum, web3) {
    super({ objectMode: true })
    this.ethereum = ethereum
    this.web3 = web3
  }

  _read(chunk, enc, cb) {
    log.info('reading from LocalStorageStore')
  }

  _onMessage(event) {
    log.info('LocalStorageStore', event)
  }

  _write(chunk, enc, cb) {
    const data = JSON.parse(chunk)
    log.info('WRITING TO LOCALSTORAGESTREAM, CHUNK:', chunk)
    for (const key in data) {
      if (key === 'selectedAddress') {
        if (data[key] !== '' && data[key] !== null && data[key] !== undefined) {
          var prevSelectedAddress = window.sessionStorage.getItem('selectedAddress')
          var newSelectedAddress = transformEthAddress(data[key])
          this.web3.eth.defaultAccount = newSelectedAddress
          this.ethereum.selectedAddress = newSelectedAddress
          this.ethereum.publicConfigStore.updateState({ selectedAddress: newSelectedAddress })
          window.sessionStorage.setItem('selectedAddress', newSelectedAddress)
          if (prevSelectedAddress !== newSelectedAddress) {
            this.emit('accountsChanged', [newSelectedAddress])
          }
        } else {
          delete this.web3.eth.defaultAccount
          delete this.ethereum.selectedAddress
          window.sessionStorage.removeItem('selectedAddress')
        }
      } else if (key === 'networkVersion') {
        window.sessionStorage.setItem(key, data[key])
        if (this.ethereum.networkVersion !== data[key].toString()) {
          this.ethereum.publicConfigStore.updateState({ networkVersion: data[key].toString() })
          this.ethereum.networkVersion = data[key].toString()
        }
      } else {
        window.sessionStorage.setItem(key, data[key])
      }
    }
    cb()
  }
}

class MetamaskInpageProvider extends SafeEventEmitter {
  constructor(connectionStream) {
    super()
    this.connectionStream = connectionStream
    const self = this
    self.isMetaMask = true
    // super constructor
    SafeEventEmitter.call(self)
  }

  init(opts = {}) {
    const self = this
    // subscribe to metamask public config (one-way)
    // setup connectionStream multiplexing
    const mux = setupMultiplex(this.connectionStream)
    const publicConfigStream = mux.createStream('publicConfig')
    Object.defineProperty(self, 'mux', {
      value: mux,
      writable: true,
      enumerable: false
    })

    if (!opts.skipStatic) {
      self.publicConfigStore = new ObservableStore({})
      self.publicConfigStore.updateState = function(partialState) {
        // if non-null object, merge
        if (partialState && partialState instanceof Object) {
          const state = this.getState()
          const newState = Object.assign({}, state, partialState)
          this.putState(newState)
          // if not object, use new value
        } else {
          this.putState(partialState)
        }
      }
      self.publicConfigStore.subscribe(function(state) {
        opts.web3.eth.defaultAccount = state.selectedAddress
      })
    }

    Object.defineProperty(self, 'lss', {
      value: new LocalStorageStream(opts.ethereum, opts.web3),
      writable: true,
      enumerable: false
    })

    pump(publicConfigStream, self.lss)
    // ignore phishing warning message (handled elsewhere)
    mux.ignoreStream('phishing')

    // connect to async provider
    const jsonRpcConnection = createJsonRpcStream()
    pump(jsonRpcConnection.stream, mux.getStream('provider'), jsonRpcConnection.stream, logStreamDisconnectWarning.bind(this, 'MetaMask RpcProvider'))

    // handle sendAsync requests via dapp-side rpc engine
    const rpcEngine = new RpcEngine()
    rpcEngine.push(createIdRemapMiddleware()) // TODO: fix metamask's janky way of keeping message ids unique
    rpcEngine.push(createErrorMiddleware())
    rpcEngine.push(createTransformEthAddressMiddleware())
    rpcEngine.push(jsonRpcConnection.middleware)
    self.rpcEngine = rpcEngine

    // forward json rpc notifications
    jsonRpcConnection.events.on('notification', payload => {
      self.emit('data', null, payload)
    })

    // Work around for https://github.com/metamask/metamask-extension/issues/5459
    // drizzle accidently breaking the `this` reference
    self.send = self.send.bind(self)
    self.sendAsync = self.sendAsync.bind(self)
  }

  // Web3 1.0 provider uses `send` with a callback for async queries
  send(payload, callback) {
    const self = this

    if (callback) {
      self.sendAsync(payload, callback)
    } else {
      return self._sendSync(payload)
    }
  }

  // handle sendAsync requests via asyncProvider
  // also remap ids inbound and outbound
  sendAsync(payload, cb) {
    log.info('ASYNC REQUEST', payload)
    const self = this
    // fixes bug with web3 1.0 where send was being routed to sendAsync
    // with an empty callback
    if (cb === undefined) {
      self.rpcEngine.handle(payload, noop)
      return self._sendSync(payload)
    } else {
      self.rpcEngine.handle(payload, cb)
    }
  }

  _sendSync(payload) {
    const self = this

    let selectedAddress
    let result = null
    switch (payload.method) {
      case 'eth_accounts':
        // read from localStorage
        selectedAddress = window.sessionStorage.getItem('selectedAddress')
        result = selectedAddress ? [selectedAddress] : []
        break

      case 'eth_coinbase':
        // read from localStorage
        selectedAddress = window.sessionStorage.getItem('selectedAddress')
        result = selectedAddress || null
        break

      case 'eth_uninstallFilter':
        self.sendAsync(payload, noop)
        result = true
        break

      case 'net_version':
        log.info('NET VERSION REQUESTED')
        const networkVersion = window.sessionStorage.getItem('networkVersion')
        result = networkVersion || null
        break

      // throw not-supported Error
      default:
        var link = 'https://github.com/MetaMask/faq/blob/master/DEVELOPERS.md#dizzy-all-async---think-of-metamask-as-a-light-client'
        // eslint-disable-next-line max-len
        var message = `The MetaMask Web3 object does not support synchronous methods like ${payload.method} without a callback parameter. See ${link} for details.`
        throw new Error(message)
    }

    // return the result
    return {
      id: payload.id,
      jsonrpc: payload.jsonrpc,
      result: result
    }
  }

  isConnected() {
    return true
  }
}

// util

function logStreamDisconnectWarning(remoteLabel, err) {
  let warningMsg = `MetamaskInpageProvider - lost connection to ${remoteLabel}`
  if (err) warningMsg += '\n' + err.stack
  log.warn(warningMsg)
  const listeners = this.listenerCount('error')
  if (listeners > 0) {
    this.emit('error', warningMsg)
  }
}

function noop() {}

export default MetamaskInpageProvider
