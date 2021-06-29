import log from "loglevel";
import pump, { Stream } from "pump";
import { Duplex } from "stream";

import ExtendedObjectMultiplex from "./ExtendedObjectMultiplex";

/**
 * Sets up stream multiplexing for the given stream
 * @param {any} connectionStream - the stream to mux
 * @return {stream.Stream} the multiplexed stream
 */
export const setupMultiplex = (connectionStream: Stream): ExtendedObjectMultiplex => {
  const mux = new ExtendedObjectMultiplex();
  pump(connectionStream, mux as unknown as Duplex, connectionStream, (err) => {
    if (err) log.error(err);
  });
  return mux;
};
