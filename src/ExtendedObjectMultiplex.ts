import ObjectMultiplex from "@metamask/object-multiplex";
import { Substream } from "@metamask/object-multiplex/dist/Substream";
import { EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 100;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
class ExtendedObjectMultiplex extends ObjectMultiplex {
  private _substreams: Record<string, Substream>;

  constructor(opts: Record<string, unknown> = {}) {
    super(opts);
    this._substreams = {};
  }

  getStream(name: string): Substream {
    if (this._substreams[name]) {
      return this._substreams[name];
    }
    return this.createStream(name);
  }
}

export default ExtendedObjectMultiplex;
