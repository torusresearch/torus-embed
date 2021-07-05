import { Component } from "@angular/core";
import { AbstractProvider } from "web3-core";
import { AbiType, StateMutabilityType } from "web3-utils";

import web3Obj from "./helper";

const tokenAbi = [
  {
    constant: false,
    inputs: [
      {
        name: "_to",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable" as StateMutabilityType,
    type: "function" as AbiType,
  },
];

type SELECTED_VERIFIER_TYPE = "google" | "reddit" | "discord";
@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  address = "";

  balance = "";

  buildEnvironment: "production" | "binance" | "testing" | "development" | "lrc" | "beta" = "production";

  console: string | Record<string, unknown> = "";

  selectedVerifier: SELECTED_VERIFIER_TYPE = "google";

  placeholder = "Enter google email";

  selectedVerifierId = "";

  buildEnvironments = ["production", "binance", "testing", "development", "lrc", "beta"];

  selectedVerifiers = [
    { label: "Google", value: "google" },
    { label: "Reddit", value: "reddit" },
    { label: "Discord", value: "discord" },
  ];

  ngAfterContentInit() {
    const torusEnv = sessionStorage.getItem("pageUsingTorus");
    if (torusEnv) {
      web3Obj
        .initialize(torusEnv)
        .then(() => {
          return this.setStateInfo();
        })
        .catch(console.error);
    }
  }

  async setStateInfo() {
    this.address = (await web3Obj.web3.eth.getAccounts())[0];
    this.balance = web3Obj.web3.utils.fromWei(await web3Obj.web3.eth.getBalance(this.address), "ether");
  }

  printToConsole() {
    const consoleObj = document.querySelector("#console>p");
    if (consoleObj) consoleObj.innerHTML = typeof this.console === "object" ? JSON.stringify(this.console) : this.console;
  }

  async setBuildEnvironment(e: Event) {
    e.preventDefault();
    try {
      await web3Obj.initialize(this.buildEnvironment);
      this.setStateInfo();
    } catch (error) {
      console.error(error);
    }
  }

  changeProvider = async (_: Event) => {
    await web3Obj.torus.setProvider({ host: "ropsten" });
    this.console = "finished changing provider";
    this.printToConsole();
  };

  async getUserInfo(_: Event) {
    this.console = (await web3Obj.torus.getUserInfo("")) as unknown as Record<string, string>;
    this.printToConsole();
  }

  async logout(_: Event) {
    await web3Obj.torus.cleanUp();
    this.address = "";
    this.balance = "0";
    sessionStorage.setItem("pageUsingTorus", "false");
  }

  signMessage(_: Event) {
    try {
      // hex message
      const message = "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad";
      (web3Obj.web3.currentProvider as AbstractProvider).send(
        {
          method: "eth_sign",
          params: [this.address, message],
          jsonrpc: "2.0",
        },
        (err: Error, result: unknown) => {
          if (err) {
            console.error(err);
            return;
          }
          this.console = `sign message => true \n ${result}`;
          this.printToConsole();
        }
      );
    } catch (error) {
      console.error(error);
    }
  }

  signTypedData_v1(_: Event) {
    const typedData = [
      {
        type: "string",
        name: "message",
        value: "Hi, Alice!",
      },
      {
        type: "uint8",
        name: "value",
        value: 10,
      },
    ];
    const prov = web3Obj.web3.currentProvider;

    (prov as AbstractProvider).send(
      {
        method: "eth_signTypedData",
        params: [typedData, this.address],
        jsonrpc: "2.0",
      },
      (err: Error, result: unknown) => {
        if (err) {
          console.error(err);
          return;
        }
        this.console = `sign typed message v1 => true \n, ${result}`;
        this.printToConsole();
      }
    );
  }

  signTypedData_v3(_: Event) {
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      },
      primaryType: "Mail",
      domain: {
        name: "Ether Mail",
        version: "1",
        chainId: 4,
        verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
      },
      message: {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello, Bob!",
      },
    };
    (web3Obj.web3.currentProvider as AbstractProvider).send(
      {
        method: "eth_signTypedData_v3",
        params: [this.address, JSON.stringify(typedData)],
        jsonrpc: "2.0",
      },
      (err: Error, result: unknown) => {
        if (err) {
          console.error(err);
          return;
        }
        this.console = `sign typed message v3 => true \n, ${result}`;
        this.printToConsole();
      }
    );
  }

  signTypedData_v4(_: Event) {
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        Person: [
          { name: "name", type: "string" },
          { name: "wallets", type: "address[]" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person[]" },
          { name: "contents", type: "string" },
        ],
        Group: [
          { name: "name", type: "string" },
          { name: "members", type: "Person[]" },
        ],
      },
      domain: {
        name: "Ether Mail",
        version: "1",
        chainId: 4,
        verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
      },
      primaryType: "Mail",
      message: {
        from: {
          name: "Cow",
          wallets: ["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826", "0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF"],
        },
        to: [
          {
            name: "Bob",
            wallets: [
              "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
              "0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57",
              "0xB0B0b0b0b0b0B000000000000000000000000000",
            ],
          },
        ],
        contents: "Hello, Bob!",
      },
    };
    (web3Obj.web3.currentProvider as AbstractProvider).send(
      {
        method: "eth_signTypedData_v4",
        params: [this.address, JSON.stringify(typedData)],
        jsonrpc: "2.0",
      },
      (err: Error, result: unknown) => {
        if (err) {
          console.error(err);
          return;
        }
        this.console = `sign typed message v4 => true \n' ${result}`;
        this.printToConsole();
      }
    );
  }

  async sendEth(_: Event) {
    return web3Obj.web3.eth.sendTransaction({ from: this.address, to: this.address, value: web3Obj.web3.utils.toWei("0.01") });
  }

  async sendDai(_: Event) {
    await web3Obj.torus.setProvider({ host: "mainnet" });

    const localWeb3 = web3Obj.web3;
    const instance = new localWeb3.eth.Contract(tokenAbi, "0x6b175474e89094c44da98b954eedeac495271d0f");
    const value = Math.floor(parseFloat("0.01") * 10 ** parseFloat("18")).toString();
    instance.methods.transfer(this.address, value).send(
      {
        from: this.address,
      },
      (err: Error, hash: string) => {
        if (err) this.console = err.message;
        this.console = hash;
      }
    );

    this.printToConsole();
  }

  async createPaymentTx(_: Event) {
    this.console = (
      await web3Obj.torus.initiateTopup("moonpay", {
        selectedCurrency: "USD",
      })
    ).toString();
    this.printToConsole();
  }

  async getPublicAddress(_: Event) {
    this.console = (await web3Obj.torus.getPublicAddress({ verifier: this.selectedVerifier, verifierId: this.selectedVerifierId })) as string;
    this.printToConsole();
  }

  onSelectedVerifierChanged = (event: Event) => {
    const input = event.target as HTMLInputElement;
    switch (input.value) {
      case "google":
        this.placeholder = "Enter google email";
        break;
      case "reddit":
        this.placeholder = "Enter reddit username";
        break;
      case "discord":
        this.placeholder = "Enter discord ID";
        break;
      default:
        this.placeholder = "Enter google email";
        break;
    }
    this.selectedVerifier = input.value as SELECTED_VERIFIER_TYPE;
  };
}
