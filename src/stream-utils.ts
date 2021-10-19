import { ObjectMultiplex } from "@toruslabs/openlogin-jrpc";
import log from "loglevel";
import pump, { Stream } from "pump";

/**
 * Sets up stream multiplexing for the given stream
 * @param {any} connectionStream - the stream to mux
 * @return {stream.Stream} the multiplexed stream
 */
export const setupMultiplex = (connectionStream: Stream): ObjectMultiplex => {
  const mux = new ObjectMultiplex();
  pump(connectionStream, mux, connectionStream, (err) => {
    if (err) log.error(err);
  });
  return mux;
};
