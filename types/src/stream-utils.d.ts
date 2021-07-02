import ExtendedObjectMultiplex from "./ObjectMultiplex";
/**
 * Sets up stream multiplexing for the given stream
 * @param {any} connectionStream - the stream to mux
 * @return {stream.Stream} the multiplexed stream
 */
export declare const setupMultiplex: (connectionStream: any) => ExtendedObjectMultiplex;
