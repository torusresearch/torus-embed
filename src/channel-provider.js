const SafeEventEmitter = require('safe-event-emitter')

class TorusChannelProvider extends SafeEventEmitter {
  constructor(connectionStream) {
    super()
    this.config = {}
    this.promises = {}
    this.connectionStream = connectionStream
    this.isTorusChannelProvider = true

    const self = this
    // super constructor
    SafeEventEmitter.call(self)

    const channelMux = setupMultiplex(this.connectionStream)
    channelMux.setMaxListeners(20)

    this.channelRpcStream = communicationMux.getStream('channel_rpc')

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
    } else if (isJsonRpcSubscription(payload)) {
      if (payload.method && payload.method.indexOf('_subscription') > -1) {
        // Emit subscription result
        this.emit(payload.params.subscription, payload.params.result)
        this.emit(payload.method, payload.params) // Latest EIP-1193
        this.emit('data', payload) // Backwards Compatibility
      }
    }
  }

  enable() {
    return new Promise((resolve, reject) => {
      try {
        this._send('chan_config')
          .then(config => {
            if (Object.keys(config).length > 0) {
              this.config = config
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

  send() {
    // Send can be clobbered, proxy sendPromise for backwards compatibility
    return this._send(...arguments)
  }

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

  subscribe(type, method, params = []) {
    return this._send(type, [method, ...params]).then(id => {
      this.subscriptions.push(id)
      return id
    })
  }

  unsubscribe(type, id) {
    return this._send(type, [id]).then(success => {
      if (success) {
        this.subscriptions = this.subscriptions.filter(_id => _id !== id) // Remove subscription
        this.removeAllListeners(String(id)) // Remove listeners
        return success
      }
    })
  }

  sendAsync(payload, cb) {
    // Backwards Compatibility
    if (!cb || typeof cb !== 'function') {
      return cb(new Error('Invalid or undefined callback provided to sendAsync'))
    }
    if (!payload) {
      return cb(new Error('Invalid Payload'))
    }
    // sendAsync can be called with an array for batch requests used by web3.js 0.x
    // this is not part of EIP-1193's backwards compatibility but we still want to support it
    if (payload instanceof Array) {
      return this.sendAsyncBatch(payload, cb)
    } else if (isJsonRpcRequest(payload)) {
      return this._send(payload.method, payload.params)
        .then(result => {
          cb(null, { id: payload.id, jsonrpc: payload.jsonrpc, result })
        })
        .catch(err => {
          cb(err)
        })
    }
  }

  sendAsyncBatch(requests, cb) {
    return this._sendBatch(requests)
      .then(results => {
        const result = results.map((entry, index) => {
          return {
            id: requests[index].id,
            jsonrpc: requests[index].jsonrpc,
            result: entry
          }
        })
        cb(null, result)
      })
      .catch(err => {
        cb(err)
      })
  }
}

// util

export function isJsonRpcSubscription(object) {
  return typeof object.params === 'object'
}

export function isJsonRpcRequest(object) {
  return typeof object.method !== 'undefined'
}

export function isJsonRpcResponseSuccess(object) {
  return typeof object.result !== 'undefined'
}

export function isJsonRpcResponseError(object) {
  return typeof object.error !== 'undefined'
}

export default TorusChannelProvider
