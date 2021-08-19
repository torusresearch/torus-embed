import { Duplex } from "readable-stream";
import { BufferEncoding, IObjectMultiplex } from "./interfaces";
import Substream from "./Substream";
interface Chunk {
    name: string;
    data: unknown;
}
declare class ObjectMultiplex extends Duplex implements IObjectMultiplex {
    private _substreams;
    constructor(opts?: Record<string, unknown>);
    createStream(name: string): Substream;
    ignoreStream(name: string): void;
    _read(): void;
    _write(chunk: Chunk, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
    getStream(name: string): Substream;
}
export default ObjectMultiplex;
