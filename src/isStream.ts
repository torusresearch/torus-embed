/* eslint-disable @typescript-eslint/no-explicit-any */
export function isStream(stream: any) {
  return stream !== null && typeof stream === "object" && typeof stream.pipe === "function";
}

export function isWritableStream(stream: any) {
  return isStream(stream) && stream.writable !== false && typeof stream._write === "function" && typeof stream._writableState === "object";
}

export function isReadableStream(stream: any) {
  return isStream(stream) && stream.readable !== false && typeof stream._read === "function" && typeof stream._readableState === "object";
}

export function isDuplexStream(stream: any) {
  return isWritableStream(stream) && isReadableStream(stream);
}
