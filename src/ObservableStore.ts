import { SafeEventEmitter } from "@toruslabs/openlogin-jrpc";

export class ObservableStore<T> extends SafeEventEmitter {
  private _state: T;

  constructor(initState: T) {
    super();
    if (initState === undefined) {
      this._state = {} as unknown as T;
    } else {
      this._state = initState;
    }
  }

  getState(): T {
    return this._getState();
  }

  putState(newState: T): void {
    this._putState(newState);
    this.emit("update", newState);
  }

  updateState(partialState: Partial<T>): void {
    // if non-null object, merge
    if (partialState && typeof partialState === "object") {
      const state = this.getState();
      this.putState({ ...state, ...partialState });
      // if not object, use new value
    } else {
      this.putState(partialState as T);
    }
  }

  subscribe(handler: (state: T) => void): void {
    this.on("update", handler);
  }

  unsubscribe(handler: (state: T) => void): void {
    this.removeListener("update", handler);
  }

  protected _getState(): T {
    return this._state;
  }

  protected _putState(newState: T): void {
    this._state = newState;
  }
}
