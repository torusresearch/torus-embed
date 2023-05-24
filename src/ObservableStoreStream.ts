import { _IWritable, Duplex as DuplexStream } from "readable-stream";

import { ObservableStore } from "./ObservableStore";

class ObservableStoreStream<T> extends DuplexStream {
  handler: (state: T) => void;

  obsStore: ObservableStore<T>;

  constructor(obsStore: ObservableStore<T>) {
    super({
      // pass values, not serializations
      objectMode: true,
    });
    // dont buffer outgoing updates
    this.resume();
    // save handler so we can unsubscribe later
    this.handler = (state: T) => this.push(state);
    // subscribe to obsStore changes
    this.obsStore = obsStore;
    this.obsStore.subscribe(this.handler);
  }

  // emit current state on new destination
  pipe<U extends _IWritable>(dest: U, options?: { end?: boolean }): U {
    const result = super.pipe(dest, options);
    dest.write(this.obsStore.getState() as any);
    return result;
  }

  // write from incoming stream to state
  _write(chunk: any, _encoding: string, callback: (error?: Error | null) => void): void {
    this.obsStore.putState(chunk);
    callback();
  }

  // noop - outgoing stream is asking us if we have data we arent giving it
  _read(_size: number): void {
    return undefined;
  }

  // unsubscribe from event emitter
  _destroy(err: Error | null, callback: (error: Error | null) => void): void {
    this.obsStore.unsubscribe(this.handler);
    super._destroy(err, callback);
  }
}

export function storeAsStream<T>(obsStore: ObservableStore<T>): ObservableStoreStream<T> {
  return new ObservableStoreStream(obsStore);
}
