import ObjectMultiplex from "@metamask/object-multiplex";
import { Substream } from "@metamask/object-multiplex/dist/Substream";
declare class ExtendedObjectMultiplex extends ObjectMultiplex {
    private _substreams;
    constructor(opts?: Record<string, unknown>);
    getStream(name: string): Substream;
}
export default ExtendedObjectMultiplex;
