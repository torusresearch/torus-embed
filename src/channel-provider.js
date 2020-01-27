import { ChannelProvider } from '@connext/channel-provider'
import { setupMultiplex } from './stream-utils'

const SafeEventEmitter = require('safe-event-emitter')

export class TorusChannelRpcConnection extends SafeEventEmitter {
  constructor(connectionStream) {
    super()
    this.promises = {}
    this.connectionStream = connectionStream

    const self = this
    // super constructor
    SafeEventEmitter.call(self)
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
    this.channelRpcStream.on('data', payload => this.onPayload(payload))
    return Promise.resolve()
  }

  close() {
    return Promise.resolve()
  }
}

class TorusChannelProvider extends ChannelProvider {
  constructor(connectionStream) {
    const connection = new TorusChannelRpcConnection(connectionStream)
    super(connection)
    this.isTorus = true
  }
}

// util

function isJsonRpcResponseSuccess(object) {
  return typeof object.result !== 'undefined'
}

function isJsonRpcResponseError(object) {
  return typeof object.error !== 'undefined'
}

export default TorusChannelProvider
