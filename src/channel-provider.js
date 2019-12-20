import { setupMultiplex } from './stream-utils'

const SafeEventEmitter = require('safe-event-emitter')

class TorusChannelProvider extends SafeEventEmitter {
  constructor(connectionStream) {
    super()
    this._config = undefined
    this._multisigAddress = undefined
    this._signerAddress = undefined
    this.promises = {}
    this.connectionStream = connectionStream
    this.isTorusChannelProvider = true

    const self = this
    // super constructor
    SafeEventEmitter.call(self)

    this.setupChannelRpcStream()
  }

  enable() {
    return new Promise((resolve, reject) => {
      try {
        this._send('chan_config')
          .then(config => {
            if (Object.keys(config).length > 0) {
              this._config = config
              this._multisigAddress = config.multisigAddress
              this._signerAddress = config.signerAddress
              this.emit('connect')
              resolve(config)
            } else {
              const err = new Error('Failed to get Channel Config')
              err.code = 4001
              reject(err)
            }
          })
          .catch(reject)
      } catch (e) {
        reject(e)
      }
    })
  }

  async send(method, params = {}) {
    let result
    switch (method) {
      case 'chan_storeSet':
        result = await this.set(params.pairs)
        break
      case 'chan_storeGet':
        result = await this.get(params.path)
        break
      case 'chan_nodeAuth':
        result = await this.signMessage(params.message)
        break
      case 'chan_config':
        result = this.config
        break
      case 'chan_restoreState':
        result = await this.restoreState(params.path)
        break
      default:
        result = await this._send(method, params)
        break
    }
    return result
  }

  setupChannelRpcStream() {
    const channelMux = setupMultiplex(this.connectionStream)
    channelMux.setMaxListeners(20)

    this.channelRpcStream = channelMux.getStream('channel_rpc')

    this.channelRpcStream.on('data', payload => this.onPayload(payload))
  }

  async onPayload(payload) {
    const { id } = payload
    if (typeof id !== 'undefined') {
      if (this.promises[id]) {
        if (isJsonRpcResponseError(payload)) {
          this.promises[id].reject(payload.error)
        } else if (isJsonRpcResponseSuccess(payload)) {
          this.promises[id].resolve(payload.result)
        }
        delete this.promises[id]
      }
    }
  }

  /// ///////////////
  /// // GETTERS / SETTERS
  get isSigner() {
    return false
  }

  get config() {
    return this._config
  }

  get multisigAddress() {
    const multisigAddress = this._multisigAddress || (this._config ? this._config.multisigAddress : undefined)
    return multisigAddress
  }

  set multisigAddress(multisigAddress) {
    if (this._config) {
      this._config.multisigAddress = multisigAddress
    }
    this._multisigAddress = multisigAddress
  }

  get signerAddress() {
    return this._signerAddress
  }

  set signerAddress(signerAddress) {
    this._signerAddress = signerAddress
  }

  /// ////////////////////////////////////////////
  /// // LISTENER METHODS
  on(event, listener) {
    // dumb clients don't require listeners
  }

  once(event, listener) {
    // dumb clients don't require listeners
  }

  /// ////////////////////////////////////////////
  /// // SIGNING METHODS
  async signMessage(message) {
    return this._send('chan_nodeAuth', { message })
  }

  /// ////////////////////////////////////////////
  /// // STORE METHODS
  async get(path) {
    return this._send('chan_storeGet', {
      path
    })
  }

  async set(pairs, allowDelete) {
    return this._send('chan_storeSet', {
      allowDelete,
      pairs
    })
  }

  async restoreState(path) {
    return this._send('chan_restoreState', { path })
  }

  /// ////////////////////////////////////////////
  /// // PRIVATE METHODS

  _send(method, params = {}) {
    if (!method || typeof method !== 'string') {
      throw new Error('Method is not a valid string.')
    }
    if (!(params instanceof Object)) {
      throw new Error('Params is not a valid object.')
    }
    const payload = { jsonrpc: '2.0', id: payloadId(), method, params }
    const promise = new Promise((resolve, reject) => {
      this.promises[payload.id] = { resolve, reject }
    })
    this.channelRpcStream.write(payload)
    return promise
  }
}

// util

function isJsonRpcResponseSuccess(object) {
  return typeof object.result !== 'undefined'
}

function isJsonRpcResponseError(object) {
  return typeof object.error !== 'undefined'
}

function payloadId() {
  const datePart = new Date().getTime() * Math.pow(10, 3)
  const extraPart = Math.floor(Math.random() * Math.pow(10, 3))
  const id = datePart + extraPart
  return id
}

export default TorusChannelProvider
