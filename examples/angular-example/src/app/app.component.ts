/* eslint-disable no-console */
import { Component } from "@angular/core";
import { TORUS_BUILD_ENV_TYPE, VerifierArgs } from "@toruslabs/torus-embed";
import { encrypt, recoverTypedMessage } from "eth-sig-util";
import { ethers } from "ethers";
import { keccak256 } from "ethers/lib/utils";
import { AbstractProvider } from "web3-core";
import { AbiType, StateMutabilityType } from "web3-utils";

import { getV3TypedData, getV4TypedData, whiteLabelData } from "./data";
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

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  publicAddress = "";

  chainId = 4;

  verifierId = "";

  selectedVerifier = "google";

  placeholder = "Enter google email";

  chainIdNetworkMap = {
    1: "mainnet",
    3: "ropsten",
    4: "rinkeby",
    5: "goerli",
    42: "kovan",
    97: "bsc_testnet",
    56: "bsc_mainnet",
  } as Record<string, string>;

  messageToEncrypt = "";

  encryptionKey = "";

  messageEncrypted = "";

  buildEnv = "testing" as TORUS_BUILD_ENV_TYPE;

  buildEnvironments = ["production", "binance", "testing", "development", "lrc", "beta"];

  selectedVerifiers = [
    { label: "Google", value: "google" },
    { label: "Reddit", value: "reddit" },
    { label: "Discord", value: "discord" },
  ];

  ngAfterContentInit(): void {
    const torusEnv = sessionStorage.getItem("pageUsingTorus");
    if (torusEnv) {
      this.login().catch(console.error);
    }
  }

  login = async (): Promise<void> => {
    try {
      const { torus, web3 } = web3Obj;
      const { buildEnv, chainIdNetworkMap, chainId } = this;
      await torus.init({
        buildEnv,
        enabledVerifiers: {
          reddit: false,
        },
        enableLogging: true,
        network: {
          host: chainIdNetworkMap[chainId.toString()], // mandatory
          chainId,
          // chainId: 336,
          // networkName: 'DES Network',
          // host: 'https://quorum.block360.io/https',
          // ticker: 'DES',
          // tickerName: 'DES Coin',
        },
        showTorusButton: true,
        integrity: {
          version: "1.11.0",
          check: false,
          // hash: 'sha384-jwXOV6VJu+PM89ksbCSZyQRjf5FdX8n39nWfE/iQBMh4r5m027ua2tkQ+83FPdp9'
        },
        loginConfig:
          buildEnv === "lrc"
            ? {
                "torus-auth0-email-passwordless": {
                  name: "torus-auth0-email-passwordless",
                  typeOfLogin: "passwordless",
                  showOnModal: false,
                },
              }
            : undefined,
        whiteLabel: whiteLabelData,
        skipTKey: true,
      });
      await torus.login(); // await torus.ethereum.enable()
      sessionStorage.setItem("pageUsingTorus", buildEnv);
      web3Obj.setweb3(torus.provider);
      torus.provider.on("chainChanged", (resp) => {
        console.log(resp, "chainchanged");
        this.chainId = parseInt(resp as string, 10);
      });
      torus.provider.on("accountsChanged", (accounts) => {
        console.log(accounts, "accountsChanged");
        this.publicAddress = (Array.isArray(accounts) && accounts[0]) || "";
      });
      const accounts = await web3.eth.getAccounts();
      console.log("accounts[0]", accounts[0]);

      this.publicAddress = (Array.isArray(accounts) && accounts[0]) || "";

      web3.eth.getBalance(accounts[0]).then(console.log).catch(console.error);
    } catch (error) {
      console.error(error, "caught in vue-app");
    }
  };

  toggleTorusWidget = (_: Event): void => {
    const { torus } = web3Obj;
    if (torus.torusWidgetVisibility) {
      torus.hideTorusButton();
    } else {
      torus.showTorusButton();
    }
  };

  onSelectedVerifierChanged = (e: Event): void => {
    const verifier = (<HTMLSelectElement>e.target).value;
    let placeholder = "Enter google email";
    switch (verifier) {
      case "google":
        placeholder = "Enter google email";
        break;
      case "reddit":
        placeholder = "Enter reddit username";
        break;
      case "discord":
        placeholder = "Enter discord ID";
        break;
      default:
        placeholder = "Enter google email";
        break;
    }
    this.selectedVerifier = verifier;
    this.placeholder = placeholder;
  };

  changeProvider = async (_: Event): Promise<void> => {
    await web3Obj.torus.setProvider({ host: "ropsten" });
    this.console("finished changing provider");
  };

  createPaymentTx = async (_: Event): Promise<void> => {
    try {
      const { torus } = web3Obj;
      const res = await torus.initiateTopup("mercuryo", {
        selectedCurrency: "USD",
      });
      console.log(res);
    } catch (error) {
      console.error(error);
    }
  };

  sendEth = (_: Event): void => {
    const { web3 } = web3Obj;
    const { publicAddress } = this;
    web3.eth
      .sendTransaction({ from: publicAddress, to: publicAddress, value: web3.utils.toWei("0.01") })
      .then((resp) => this.console(resp))
      .catch(console.error);
  };

  signMessageWithoutPopup = (_: Event): void => {
    const { web3 } = web3Obj;
    const { publicAddress } = this;

    // hex message
    const message = "Hello world";
    const customPrefix = `\u0019${window.location.hostname} Signed Message:\n`;
    const prefixWithLength = Buffer.from(`${customPrefix}${message.length.toString()}`, "utf-8");
    const hashedMsg = keccak256(Buffer.concat([prefixWithLength, Buffer.from(message)]));
    (web3.currentProvider as AbstractProvider).send(
      {
        method: "eth_sign",
        params: [publicAddress, hashedMsg, { customPrefix, customMessage: message }],
        jsonrpc: "2.0",
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        const signerAddress = ethers.utils.recoverAddress(hashedMsg, result.result);
        return this.console(
          "sign message => true",
          `message: ${prefixWithLength + message}`,
          `msgHash: ${hashedMsg}`,
          `sig: ${result.result}`,
          `signer: ${signerAddress}`
        );
      }
    );
  };

  signMessage = (_: Event): void => {
    const { web3 } = web3Obj;
    const { publicAddress } = this;
    // hex message
    const message = "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad";
    (web3.currentProvider as AbstractProvider).send(
      {
        method: "eth_sign",
        params: [publicAddress, message],
        jsonrpc: "2.0",
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        return this.console("sign message => true", result);
      }
    );
  };

  signTypedDataV1 = (_: Event): void => {
    const { publicAddress } = this;
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
    const currentProvider = web3Obj.web3.currentProvider as AbstractProvider;
    currentProvider.send(
      {
        method: "eth_signTypedData",
        params: [typedData, publicAddress],
        jsonrpc: "2.0",
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }

        const recovered = recoverTypedMessage(
          {
            data: typedData,
            sig: result.result,
          },
          "V1"
        );

        if (publicAddress && recovered.toLowerCase() === publicAddress?.toLowerCase()) {
          return this.console(`sign typed message v1 => true${result}Recovered signer: ${publicAddress}`);
        }
        return this.console(`Failed to verify signer, got: ${recovered}`);
      }
    );
  };

  signTypedDataV3 = (_: Event): void => {
    const { chainId, publicAddress } = this;
    const typedData = getV3TypedData(chainId);
    const currentProvider = web3Obj.web3.currentProvider as AbstractProvider;
    currentProvider.send(
      {
        method: "eth_signTypedData_v3",
        params: [publicAddress, JSON.stringify(typedData)],
        jsonrpc: "2.0",
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        const recovered = recoverTypedMessage(
          {
            data: typedData as any,
            sig: result.result,
          },
          "V3"
        );

        if (recovered.toLowerCase() === publicAddress?.toLowerCase()) {
          return this.console(`sign typed message v3 => true${result}Recovered signer: ${publicAddress}`);
        }
        return this.console(`Failed to verify signer, got: ${recovered}`);
      }
    );
  };

  signTypedDataV4 = (_: Event): void => {
    const { chainId, publicAddress } = this;
    const { web3 } = web3Obj;
    const typedData = getV4TypedData(chainId);
    (web3.currentProvider as AbstractProvider).send(
      {
        method: "eth_signTypedData_v4",
        params: [publicAddress, JSON.stringify(typedData)],
        jsonrpc: "2.0",
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        const recovered = recoverTypedMessage(
          {
            data: typedData as any,
            sig: result.result,
          },
          "V4"
        );

        if (recovered.toLowerCase() === publicAddress.toLowerCase()) {
          return this.console("sign typed message v4 => true", result, `Recovered signer: ${publicAddress}`);
        }
        return this.console(`Failed to verify signer, got: ${recovered}`);
      }
    );
  };

  console = (...args: any[]): void => {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  };

  sendDai = async (_: Event): Promise<void> => {
    try {
      const { chainId, publicAddress } = this;
      const { torus, web3 } = web3Obj;
      if (chainId !== 1) {
        await torus.setProvider({ host: "mainnet" });
      }
      const instance = new web3.eth.Contract(tokenAbi, "0x6b175474e89094c44da98b954eedeac495271d0f");
      const balance = await instance.methods.balanceOf(publicAddress).call();
      console.log(balance, "dai balance");
      const value = Math.floor(parseFloat("0.01") * 10 ** parseFloat("18")).toString();
      if (Number(balance) < Number(value)) {
        // eslint-disable-next-line no-alert
        window.alert("You do not have enough dai tokens for transfer");
        return;
      }
      instance.methods.transfer(publicAddress, value).send(
        {
          from: publicAddress,
        },
        (err: Error, hash: string) => {
          if (err) this.console(err);
          else this.console(hash);
        }
      );
    } catch (error) {
      console.error(error);
    }
  };

  approveKnc = async (_: Event): Promise<void> => {
    try {
      const { chainId, publicAddress } = this;
      const { torus, web3 } = web3Obj;
      console.log(chainId, "current chain id");
      if (chainId !== 1) {
        await torus.setProvider({ host: "mainnet" });
      }
      const instance = new web3.eth.Contract(tokenAbi, "0xdd974D5C2e2928deA5F71b9825b8b646686BD200");
      let value = Math.floor(parseFloat("0.01") * 10 ** parseFloat("18")).toString();
      const allowance = await instance.methods.allowance(publicAddress, "0x3E2a1F4f6b6b5d281Ee9a9B36Bb33F7FBf0614C3").call();
      console.log(allowance, "current allowance");
      if (Number(allowance) > 0) value = "0";
      instance.methods.approve("0x3E2a1F4f6b6b5d281Ee9a9B36Bb33F7FBf0614C3", value).send(
        {
          from: publicAddress,
        },
        (err: Error, hash: string) => {
          if (err) this.console(err);
          else this.console(hash);
        }
      );
    } catch (error) {
      console.error(error);
    }
  };

  signPersonalMsg = async (_: Event): Promise<void> => {
    try {
      const { web3 } = web3Obj;
      const { publicAddress } = this;
      const message = "Some string";
      const hash = web3.utils.sha3(message) as string;
      const sig = await web3.eth.personal.sign(hash, publicAddress, "");
      const hostnamealAddress = await web3.eth.personal.ecRecover(hash, sig);
      if (publicAddress.toLowerCase() === hostnamealAddress.toLowerCase()) this.console("Success");
      else this.console("Failed");
    } catch (error) {
      console.error(error);
      this.console("failed");
    }
  };

  getUserInfo = (_: Event): void => {
    const { torus } = web3Obj;
    torus.getUserInfo("").then(this.console).catch(this.console);
  };

  getPublicAddress = (_: Event): void => {
    const { torus } = web3Obj;
    const { selectedVerifier, verifierId } = this;
    console.log(selectedVerifier, verifierId);
    torus
      .getPublicAddress({ verifier: selectedVerifier, verifierId } as VerifierArgs)
      .then(this.console)
      .catch(console.error);
  };

  getEncryptionKey = (_: Event): void => {
    const { web3 } = web3Obj;
    const { publicAddress } = this;
    (web3.currentProvider as AbstractProvider).send(
      {
        method: "eth_getEncryptionPublicKey",
        params: [publicAddress],
        jsonrpc: "2.0",
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        this.encryptionKey = result.result;
        return this.console(`encryption public key => ${result.result}`);
      }
    );
  };

  encryptMessage = (_: Event): void => {
    try {
      const { encryptionKey, messageToEncrypt } = this;
      const messageEncrypted = encrypt(encryptionKey, { data: messageToEncrypt }, "x25519-xsalsa20-poly1305");
      const encryptedMessage = this.stringifiableToHex(messageEncrypted);
      this.messageEncrypted = encryptedMessage;
      this.console(`encrypted message => ${encryptedMessage}`);
    } catch (error) {
      console.error(error);
    }
  };

  decryptMessage = (_: Event): void => {
    const { web3 } = web3Obj;
    const { messageEncrypted, publicAddress } = this;
    (web3.currentProvider as AbstractProvider).send(
      {
        method: "eth_decrypt",
        params: [messageEncrypted, publicAddress],
        jsonrpc: "2.0",
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        const decMsg = result.result;
        return this.console(`decrypted message => ${decMsg}`);
      }
    );
  };

  stringifiableToHex = (value: any): string => ethers.utils.hexlify(Buffer.from(JSON.stringify(value)));

  logout = (_: Event): void => {
    web3Obj.torus
      .cleanUp()
      .then(() => {
        this.publicAddress = "";
        return undefined;
      })
      .catch(console.error);
  };
}
