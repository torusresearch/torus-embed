import Through from 'through2'
import ObjectMultiplex from 'obj-multiplex'
import pump from 'pump'

/**
 * Returns a stream transform that parses JSON strings passing through
 * @return {stream.Transform}
 */
const jsonParseStream = () => {
  return Through.obj(function(serialized, _, cb) {
    this.push(JSON.parse(serialized))
    cb()
  })
}

/**
 * Returns a stream transform that calls {@code JSON.stringify}
 * on objects passing through
 * @return {stream.Transform} the stream transform
 */
const jsonStringifyStream = () => {
  return Through.obj(function(obj, _, cb) {
    this.push(JSON.stringify(obj))
    cb()
  })
}

/**
 * Sets up stream multiplexing for the given stream
 * @param {any} connectionStream - the stream to mux
 * @return {stream.Stream} the multiplexed stream
 */
const setupMultiplex = connectionStream => {
  const mux = new ObjectMultiplex()
  // bind helper method to get previously created streams
  mux.getStream = function(name) {
    if (this._substreams[name]) {
      return this._substreams[name]
    } else {
      return this.createStream(name)
    }
  }

  pump(connectionStream, mux, connectionStream, err => {
    if (err) console.error(err)
  })
  return mux
}

export { jsonParseStream, jsonStringifyStream, setupMultiplex }
