import Web3Auth from "@web3auth/ws-embed";
import { describe, expect, it } from "vite-plus/test";

import Torus from "../src";

describe("Torus", () => {
  it("extends the ws-embed client", () => {
    const torus = new Torus();

    expect(torus).toBeInstanceOf(Web3Auth);
    expect(typeof torus.init).toBe("function");
    expect(typeof torus.login).toBe("function");
  });

  it("does not support session id login", async () => {
    await expect(new Torus().loginWithSessionId(undefined as never)).rejects.toThrow("Not implemented");
  });
});
