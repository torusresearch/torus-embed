import SafeEventEmitter from 'safe-event-emitter'

import { setupMultiplex } from './stream-utils'

// util

function isJsonRpcResponseSuccess(object) {
  return typeof object.result !== 'undefined'
}

function isJsonRpcResponseError(object) {
  return typeof object.error !== 'undefined'
}

class TorusChannelRpcConnection extends SafeEventEmitter {
  constructor(connectionStream) {
    super()
    this.promises = {}
    this.connectionStream = connectionStream
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

  async send(payload) {
    const promise = new Promise((resolve, reject) => {
      this.promises[payload.id] = { resolve, reject }
    })
    this.channelRpcStream.write(payload)
    return promise
  }

  open() {
    const channelMux = setupMultiplex(this.connectionStream)
    channelMux.setMaxListeners(20)
    this.channelRpcStream = channelMux.getStream('channel_rpc')
    this.channelRpcStream.on('data', (payload) => this.onPayload(payload))
    return Promise.resolve()
  }

  // eslint-disable-next-line class-methods-use-this
  close() {
    return Promise.resolve()
  }
}

export default TorusChannelRpcConnection
