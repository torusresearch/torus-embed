import ObjectMultiplex from 'obj-multiplex'
import pump from 'pump'

/**
 * Sets up stream multiplexing for the given stream
 * @param {any} connectionStream - the stream to mux
 * @return {stream.Stream} the multiplexed stream
 */
export const setupMultiplex = (connectionStream) => {
  const mux = new ObjectMultiplex()
  // bind helper method to get previously created streams
  mux.getStream = function streamHelper(name) {
    if (this._substreams[name]) {
      return this._substreams[name]
    }
    return this.createStream(name)
  }

  pump(connectionStream, mux, connectionStream, (err) => {
    if (err) console.error(err)
  })
  return mux
}
