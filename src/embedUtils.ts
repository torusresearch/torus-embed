import { Stream } from "pump";

export const htmlToElement = <T extends Element>(html: string): T => {
  const template = window.document.createElement("template");
  const trimmedHtml = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = trimmedHtml;
  return template.content.firstChild as T;
};

export const handleEvent = (handle: EventTarget, eventName: string, handler: (...args: unknown[]) => void, ...handlerArgs: unknown[]): void => {
  const handlerWrapper = () => {
    handler(...handlerArgs);
    handle.removeEventListener(eventName, handlerWrapper);
  };
  handle.addEventListener(eventName, handlerWrapper);
};

export const handleStream = (handle: Stream, eventName: string, handler: (chunk: unknown) => void): void => {
  const handlerWrapper = (chunk: unknown) => {
    handler(chunk);
    handle.removeListener(eventName, handlerWrapper);
  };
  handle.on(eventName, handlerWrapper);
};
