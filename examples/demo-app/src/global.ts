import { Buffer } from "buffer";
import process from "process";

window.global = globalThis;
globalThis.Buffer = globalThis.Buffer || Buffer;
process.env = { ...process.env, ...(globalThis.process?.env || {}) };
globalThis.process = process;
