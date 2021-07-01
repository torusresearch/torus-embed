import eos from "end-of-stream";
import { EventEmitter } from "events";
import once from "once";
import { Duplex } from "readable-stream";

import { BufferEncoding, IObjectMultiplex } from "./interfaces";
import log from "./loglevel";
import Substream from "./Substream";

EventEmitter.defaultMaxListeners = 100;

// util
function anyStreamEnd(stream: ObjectMultiplex, _cb: (error?: Error | null) => void) {
  const cb = once(_cb);
  eos(stream, { readable: false }, cb);
  eos(stream, { writable: false }, cb);
}

const IGNORE_SUBSTREAM = Symbol("IGNORE_SUBSTREAM");

interface Chunk {
  name: string;
  data: unknown;
}

export class ObjectMultiplex extends Duplex implements IObjectMultiplex {
  private _substreams: Record<string, Substream | typeof IGNORE_SUBSTREAM>;

  constructor(opts: Record<string, unknown> = {}) {
    super({
      ...opts,
      objectMode: true,
    });
    this._substreams = {};
  }

  createStream(name: string): Substream {
    // guard stream against destroyed already
    if (this.destroyed) {
      throw new Error(`ObjectMultiplex - parent stream for name "${name}" already destroyed`);
    }

    // guard stream against ended already
    if (this._readableState.ended || this._writableState.ended) {
      throw new Error(`ObjectMultiplex - parent stream for name "${name}" already ended`);
    }

    // validate name
    if (!name) {
      throw new Error("ObjectMultiplex - name must not be empty");
    }

    if (this._substreams[name]) {
      throw new Error(`ObjectMultiplex - Substream for name "${name}" already exists`);
    }

    // create substream
    const substream = new Substream({ parent: this, name });
    this._substreams[name] = substream;

    // listen for parent stream to end
    anyStreamEnd(this, (_error?: Error | null) => {
      return substream.destroy(_error || undefined);
    });

    return substream;
  }

  // ignore streams (dont display orphaned data warning)
  ignoreStream(name: string): void {
    // validate name
    if (!name) {
      throw new Error("ObjectMultiplex - name must not be empty");
    }
    if (this._substreams[name]) {
      throw new Error(`ObjectMultiplex - Substream for name "${name}" already exists`);
    }
    // set
    this._substreams[name] = IGNORE_SUBSTREAM;
  }

  // eslint-disable-next-line class-methods-use-this
  _read(): void {
    return undefined;
  }

  _write(chunk: Chunk, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    const { name, data } = chunk;

    if (!name) {
      log.warn(`ObjectMultiplex - malformed chunk without name "${chunk}"`);
      return callback();
    }

    // get corresponding substream
    const substream = this._substreams[name];
    if (!substream) {
      log.warn(`ObjectMultiplex - orphaned data for stream "${name}"`);
      return callback();
    }

    // push data into substream
    if (substream !== IGNORE_SUBSTREAM) {
      substream.push(data);
    }

    return callback();
  }

  getStream(name: string): Substream {
    if (this._substreams[name]) {
      return this._substreams[name] as Substream;
    }
    return this.createStream(name);
  }
}

export default ObjectMultiplex;
