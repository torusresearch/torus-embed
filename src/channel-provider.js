import createErrorMiddleware from './createErrorMiddleware'
const createIdRemapMiddleware = require('json-rpc-engine/src/idRemapMiddleware')
const createJsonRpcStream = require('json-rpc-middleware-stream')
const SafeEventEmitter = require('safe-event-emitter')

class TorusChannelProvider extends SafeEventEmitter {
  constructor(connectionStream) {
    super()
    this.config = {}
    this.connectionStream = connectionStream
    const self = this
    self.isTorusChannelProvider = true
    // super constructor
    SafeEventEmitter.call(self)
  }

  init() {
    const self = this

    // setup connectionStream multiplexing
    const mux = setupMultiplex(this.connectionStream)

    // ignore phishing warning message (handled elsewhere)
    mux.ignoreStream('phishing')

    // connect to async provider
    const jsonRpcConnection = createJsonRpcStream()
    pump(
      jsonRpcConnection.stream,
      mux.getStream('channelProvider'),
      jsonRpcConnection.stream,
      logStreamDisconnectWarning.bind(this, 'TorusChannelProvider RpcProvider')
    )

    // handle sendAsync requests via dapp-side rpc engine
    const rpcEngine = new RpcEngine()
    rpcEngine.push(createIdRemapMiddleware()) // TODO: fix metamask's janky way of keeping message ids unique
    rpcEngine.push(createErrorMiddleware())
    rpcEngine.push(jsonRpcConnection.middleware)
    self.rpcEngine = rpcEngine

    // forward json rpc notifications
    jsonRpcConnection.events.on('notification', payload => {
      self.emit('payload', null, payload)
    })
  }

  enable() {
    const self = this

    self.init()

    return new Promise((resolve, reject) => {
      try {
        this._send('chan_config')
          .then(config => {
            if (Object.keys(config).length > 0) {
              this.config = config
              self.emit('connect')
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
}

// util

function logStreamDisconnectWarning(remoteLabel, err) {
  let warningMsg = `TorusChannelProvider - lost connection to ${remoteLabel}`
  if (err) warningMsg += '\n' + err.stack
  log.warn(warningMsg)
  const listeners = this.listenerCount('error')
  if (listeners > 0) {
    this.emit('error', warningMsg)
  }
}

export default TorusChannelProvider
